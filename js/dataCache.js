/**
 * DataCache
 * ============================================================
 * Kenapa file ini ada:
 * Sebelumnya hampir setiap halaman (dashboard, transaksi, pembelian,
 * retur, notifikasi, stock opname, antrian, master obat, master pasien)
 * melakukan db.collection('obat').get() / db.collection('pasien').get()
 * SENDIRI-SENDIRI setiap kali halaman dibuka.
 *
 * Kalau koleksi 'obat'/'pasien' berisi ribuan dokumen, itu artinya
 * ribuan Firestore reads TIAP KALI buka halaman apapun yang butuh
 * data itu -> kuota Firestore cepat habis & aplikasi jadi lambat/error.
 *
 * DataCache menggantikan pola itu dengan SATU listener realtime
 * (onSnapshot) per koleksi yang dipakai bersama oleh semua halaman:
 *   - Read penuh koleksi hanya terjadi SEKALI per sesi (saat pertama
 *     kali ada halaman yang butuh datanya).
 *   - Setelah itu, setiap perubahan data (tambah/edit/hapus/import)
 *     hanya mengirim update untuk dokumen yang berubah saja (murah).
 *   - Semua halaman lain otomatis dapat data terbaru dari cache di
 *     memori, tanpa fetch ulang ke server.
 *
 * Cara pakai di file page (module) lain, GANTI:
 *   db.collection('obat').get().then(snap => { snap.forEach(doc => {...}) })
 * MENJADI:
 *   DataCache.getObat().then(snap => { snap.forEach(doc => {...}) })
 *
 * `snap` yang dikembalikan punya bentuk yang sama seperti QuerySnapshot
 * asli Firestore (.forEach, .docs, .size, .empty) supaya kode lama tidak
 * perlu diubah banyak.
 */
var DataCache = {
    _cache: {},      // { collectionName: [ {id, data()} , ... ] }
    _ready: {},      // { collectionName: Promise }
    _unsub: {},      // { collectionName: unsubscribeFn }

    // Field pengurutan default per koleksi (biar perilaku sama seperti
    // orderBy() yang dipakai sebelumnya di masing-masing halaman)
    _sortField: {
        pasien: 'nama',
        obat: 'namaObat'
    },

    _wrapDoc: function (doc) {
        return {
            id: doc.id,
            data: function () { return doc.data(); }
        };
    },

    _toSnapshot: function (docsArray) {
        return {
            docs: docsArray,
            size: docsArray.length,
            empty: docsArray.length === 0,
            forEach: function (cb) { docsArray.forEach(cb); }
        };
    },

    _subscribe: function (collectionName) {
        var self = this;
        if (self._ready[collectionName]) return self._ready[collectionName];

        self._ready[collectionName] = new Promise(function (resolve, reject) {
            var firstLoad = true;
            var unsub = db.collection(collectionName).onSnapshot(function (snap) {
                var arr = snap.docs.map(function (d) { return self._wrapDoc(d); });
                var sortField = self._sortField[collectionName];
                if (sortField) {
                    arr.sort(function (a, b) {
                        var av = (a.data()[sortField] || '').toString();
                        var bv = (b.data()[sortField] || '').toString();
                        return av.localeCompare(bv);
                    });
                }
                self._cache[collectionName] = arr;
                if (firstLoad) { firstLoad = false; resolve(); }
            }, function (err) {
                // PERBAIKAN AUDIT (temuan #14) — JANGAN GAGAL DALAM DIAM.
                //
                // SEBELUMNYA: error di-resolve() dengan array KOSONG dan pesannya
                // hanya masuk ke console.warn. Yang dilihat pengguna: daftar obat
                // atau pasien kosong, tanpa satu pun indikasi bahwa ada yang salah.
                // Bukan error, bukan spinner macet — hanya halaman yang tampak
                // baik-baik saja dengan nol data.
                //
                // Di kasir dampaknya paling parah: transaksi.js membuang setiap
                // baris obat yang tidak ditemukan di cache TANPA pesan apa pun
                // (`if (!obat) return;`). Kasir memasukkan lima obat, menekan
                // simpan, dan mendapat pesan "Tambahkan minimal 1 obat".
                //
                // SEKARANG: reject() supaya pemanggil tahu, plus toast yang jelas.
                console.error('DataCache snapshot error (' + collectionName + '):', err);
                delete self._ready[collectionName];
                if (firstLoad) {
                    firstLoad = false;
                    if (window.Utils && Utils.toast) {
                        Utils.toast('Gagal memuat data "' + collectionName + '": ' +
                                    (err.message || err) +
                                    '. Jangan lanjutkan transaksi sebelum data tampil.', 'error');
                    }
                    reject(err);
                }
            });
            self._unsub[collectionName] = unsub;
        });

        return self._ready[collectionName];
    },

    /**
     * Ambil snapshot koleksi (dari cache kalau sudah pernah dimuat,
     * kalau belum akan melakukan 1x read penuh lalu menyimpannya).
     */
    get: function (collectionName) {
        var self = this;
        return self._subscribe(collectionName).then(function () {
            return self._toSnapshot(self._cache[collectionName] || []);
        }, function (err) {
            // Bersihkan state supaya percobaan berikutnya benar-benar berlangganan
            // ulang, bukan memakai promise gagal yang sudah tersimpan.
            self.invalidate(collectionName);
            throw err;
        });
    },

    getObat: function () { return this.get('obat'); },
    getPasien: function () { return this.get('pasien'); },

    /**
     * Panggil ini kalau butuh paksa ambil data fresh dari server lagi
     * (jarang diperlukan karena listener sudah realtime, tapi berguna
     * misalnya langsung setelah proses import besar supaya tidak
     * menunggu event snapshot).
     */
    invalidate: function (collectionName) {
        if (this._unsub[collectionName]) {
            this._unsub[collectionName]();
            delete this._unsub[collectionName];
        }
        delete this._ready[collectionName];
        delete this._cache[collectionName];
    }
};
