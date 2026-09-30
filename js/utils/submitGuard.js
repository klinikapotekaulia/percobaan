/**
 * js/utils/submitGuard.js
 * ============================================================
 * PERBAIKAN AUDIT (Juli 2026) — TEMUAN #10: klik ganda pada form keuangan.
 *
 * Latar belakang:
 * Pola penjaga klik-ganda (`_isSaving` + `btn.disabled` + `_resetGuard()`)
 * sudah ditulis dengan benar di lima modul — transaksi, retur, pembelian,
 * rekamMedis, antrian — tapi disalin manual satu per satu, sehingga delapan
 * modul lain (justru yang menyangkut uang: pengeluaran, pendapatan lain,
 * piutang, jurnal manual, absensi manual, master obat/pasien/karyawan)
 * tidak pernah kebagian. Akibatnya menekan Enter dua kali atau double-tap
 * di tablet menghasilkan DUA dokumen identik dengan ID berbeda.
 *
 * File ini menjadikan pola tersebut satu utilitas bersama, supaya modul
 * baru tinggal memakainya dan tidak perlu menyalin ulang logikanya.
 *
 * BATASAN YANG HARUS DIPAHAMI:
 * Penjaga ini hidup di MEMORI SATU TAB BROWSER. Ia mencegah satu orang
 * mengklik dua kali; ia TIDAK mencegah dua orang di dua perangkat menyimpan
 * hal yang sama secara bersamaan. Untuk itu diperlukan kunci di sisi server
 * (ID dokumen deterministik atau runTransaction) — lihat laporan audit
 * bagian Batch 2. Jangan perlakukan file ini sebagai pengganti hal tersebut.
 *
 * CARA PAKAI:
 *   simpan: function () {
 *       var release = SubmitGuard.lock('pengeluaran:simpan',
 *                                      '#form-pengeluaran button[type="submit"]');
 *       if (!release) return;              // klik ganda -> abaikan
 *
 *       if (tidakValid) { Utils.toast('...', 'error'); release(); return; }
 *
 *       db.collection('x').add(obj)
 *         .then(function () { ...; release(); })
 *         .catch(function (err) { Utils.toast('Gagal: ' + err.message, 'error'); release(); });
 *   }
 *
 * `release()` WAJIB dipanggil di SEMUA jalur keluar — termasuk jalur
 * validasi yang membatalkan lebih awal. Kalau terlewat, ada jaring pengaman
 * berupa auto-release setelah AUTO_RELEASE_MS supaya form tidak terkunci
 * selamanya (lebih baik berisiko dobel daripada kasir tidak bisa bekerja).
 */
window.SubmitGuard = {
    AUTO_RELEASE_MS: 30000,
    _busy: {},
    lock: function (key, buttonSelector) {
        if (this._busy[key]) return null;
        this._busy[key] = true;
        var self = this;
        var btn = buttonSelector ? document.querySelector(buttonSelector) : null;
        if (btn) {
            btn.disabled = true;
            btn.classList.add('opacity-50', 'cursor-not-allowed');
        }
        var released = false;
        var release = function () {
            if (released) return;
            released = true;
            clearTimeout(timer);
            delete self._busy[key];
            if (btn && btn.isConnected) {
                btn.disabled = false;
                btn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        };
        var timer = setTimeout(function () {
            if (!released) {
                console.warn('[SubmitGuard] release() tidak dipanggil untuk "' + key + '" — kunci dilepas otomatis.');
                release();
            }
        }, this.AUTO_RELEASE_MS);
        return release;
    },
    isBusy: function (key) { return !!this._busy[key]; },
    releaseAll: function () { this._busy = {}; }
};

// Haypop Etalase integration is loaded globally because transaction.js is dynamically loaded.
(function () {
    var s = document.createElement('script');
    s.src = 'js/utils/etalaseHook.js';
    s.onload = function () { console.info('[Haypop Etalase] integration hook loaded'); };
    s.onerror = function () { console.warn('[Haypop Etalase] integration hook failed to load'); };
    document.head.appendChild(s);
})();
