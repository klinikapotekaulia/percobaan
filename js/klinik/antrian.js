/**
 * js/klinik/antrian.js
 * Antrian Harian Klinik
 */

// FIX: sebelumnya kode ini pakai new Date().toISOString().split('T')[0] untuk
// mendapatkan tanggal "hari ini". Masalahnya toISOString() selalu memakai UTC,
// sedangkan WIB = UTC+7. Akibatnya tanggal baru (dan reset antrian) baru
// dianggap berganti jam 07:00 pagi waktu lokal, bukan jam 00:00 (tengah malam),
// karena UTC masih "kemarin" sampai jam 7 pagi WIB. getLocalDateStr() di bawah
// mengambil tanggal dari getFullYear/getMonth/getDate (mengikuti jam lokal
// perangkat/browser), jadi reset benar-benar terjadi tepat tengah malam.
function getLocalDateStr(d) {
    d = d || new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
}

window.AppKlinikAntrian = {
    data: [],
    pasienList: [],
    dokterList: [],
    bahasa: 'id',

    render: function() {
        var html = '<div class="page-enter max-w-4xl">';
        html += '  <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-1">Antrian Klinik</h2>';
        html += '  <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Kelola antrian pasien harian</p>';
        html += '  <div id="antrian-content"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

        init: function() {
        var today = getLocalDateStr(); // YYYY-MM-DD (waktu lokal, bukan UTC)
        
        // HAPUS .orderBy('waktuDaftar') agar tidak butuh Composite Index
        var pAntrian = db.collection('antrian').where('tanggal', '==', today).get();
        var pPasien = DataCache.getPasien();
        // FIX (permintaan user): dokter tujuan hanya karyawan dengan divisi/departemen "Dokter"
        // (bukan lagi "Umum" atau dropdown divisi Klinik).
        var pDokter = db.collection('karyawan').where('departemen', '==', 'Dokter').where('status', '==', 'aktif').get();
        // TAMBAHAN (permintaan user): dipakai khusus tampilan Antrian akun Dokter, untuk tahu
        // antrian mana yang RM-nya sudah selesai diproses resepnya di Apotek (statusResep).
        var pRekam = db.collection('rekamMedis').where('tanggal', '==', today).get();
        var pSettings = db.collection('pengaturan').doc('antrianDisplaySettings').get();

        if ('speechSynthesis' in window) {
            window.speechSynthesis.getVoices();
        }

        Promise.all([pAntrian, pPasien, pDokter, pRekam, pSettings]).then(function(results) {
            // Parse Antrian
            AppKlinikAntrian.data = [];
            results[0].forEach(function(doc) { var d = doc.data(); d.id = doc.id; AppKlinikAntrian.data.push(d); });

            // Simpan bahasa dari pengaturan display antrian
            AppKlinikAntrian.bahasa = 'id';
            if (results[4] && results[4].exists) {
                AppKlinikAntrian.bahasa = results[4].data().bahasa || 'id';
            }

            // URUTKAN MANUAL PAKAI JAVASCRIPT (Berdasarkan waktuDaftar)
            AppKlinikAntrian.data.sort(function(a, b) {
                // Jika waktuDaftar ada, urutkan berdasarkan itu. Jika null (karena baru diadd), taruh paling bawah.
                var timeA = a.waktuDaftar ? a.waktuDaftar.seconds : 0;
                var timeB = b.waktuDaftar ? b.waktuDaftar.seconds : 0;
                return timeA - timeB; 
            });

            // Parse Pasien
            AppKlinikAntrian.pasienList = [];
            results[1].forEach(function(doc) { var d = doc.data(); d.id = doc.id; AppKlinikAntrian.pasienList.push(d); });

            // Parse Dokter
            AppKlinikAntrian.dokterList = [];
            results[2].forEach(function(doc) { var d = doc.data(); d.id = doc.id; AppKlinikAntrian.dokterList.push(d); });

            // Parse Rekam Medis -> map antrianId ke statusResep, dipakai untuk grup
            // "Selesai di Apotek" pada tampilan Antrian akun Dokter.
            AppKlinikAntrian.resepStatusMap = {};
            results[3].forEach(function(doc) {
                var d = doc.data();
                if (d.antrianId) AppKlinikAntrian.resepStatusMap[d.antrianId] = d.statusResep || 'menunggu';
            });

            AppKlinikAntrian.renderForm();
            AppKlinikAntrian.syncNextWaiting();
        }).catch(function(err) { 
            console.error(err);
            Utils.toast('Gagal memuat: ' + err.message, 'error'); 
        });
    },

    // TAMBAHAN: tulis pasien menunggu paling depan (per waktu daftar) ke
    // dokumen bersama 'pengaturan/antrianDisplay', field 'next', supaya
    // display.html bisa menampilkan panel "Antrian Berikutnya". Sengaja
    // HANYA nomor + tujuan dokter (tanpa nama pasien) karena pasien ini
    // belum resmi dipanggil — jaga privasi sampai gilirannya tiba.
    // Dipanggil setiap kali daftar antrian dimuat ulang (init), jadi selalu
    // sinkron begitu ada perubahan (pasien baru masuk, dipanggil, batal, dll).
    syncNextWaiting: function() {
        var menunggu = this.data.filter(function(a) { return a.status === 'menunggu'; });
        menunggu.sort(function(a, b) {
            var ta = a.waktuDaftar ? a.waktuDaftar.seconds : 0;
            var tb = b.waktuDaftar ? b.waktuDaftar.seconds : 0;
            return ta - tb;
        });
        var next = menunggu.length ? { nomorAntrian: menunggu[0].nomorAntrian, namaDokter: menunggu[0].namaDokter } : null;
        // FITUR BARU: sertakan tanggal hari ini supaya display.html bisa mendeteksi data yang
        // sudah "basi" (dari hari sebelum tengah malam) dan otomatis menampilkan tampilan kosong
        // tanpa perlu menunggu Cloud Function/cron — lihat catatan reset tengah malam di display.html.
        db.collection('pengaturan').doc('antrianDisplay').set({ next: next, tanggal: getLocalDateStr() }, { merge: true })
            .catch(function(err) { console.error('Gagal sync antrian berikutnya:', err); });
    },

    renderForm: function() {
        var html = '';

        // FIX (permintaan user): "Tambah ke Antrian" hanya untuk akun Klinik (staf/resepsionis).
        // Akun Dokter tidak boleh menambahkan pasien ke antrian, hanya melihat & memproses.
        var isDokter = (window.currentRole === 'dokter');

        if (!isDokter) {
            // FORM TAMBAH ANTRIAN
            html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6">';
            html += '<div class="flex items-center justify-between mb-4">';
            html += '<h3 class="font-semibold text-gray-800 dark:text-white">Tambah ke Antrian</h3>';
            // TAMBAHAN: tombol untuk mengosongkan layar TV (display.html) secara manual.
            // Dipakai kalau ada nomor yang "nyangkut" di layar (mis. pasien terakhir sudah
            // selesai tapi tidak ada panggilan baru lagi setelahnya, jadi nomor lama terus
            // tertampil). Ini hanya menghapus tampilan di TV, TIDAK mengubah/menghapus data
            // antrian pasien di daftar bawah ini.
            html += '<button onclick="AppKlinikAntrian.resetDisplay()" class="text-xs bg-slate-100 hover:bg-red-50 hover:text-red-600 dark:bg-slate-700 dark:hover:bg-red-900/20 text-slate-500 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition"><i data-lucide="monitor-x" class="w-3.5 h-3.5"></i> Reset Tampilan Display</button>';
            html += '</div>';
            html += '<div class="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">';

            html += '<div>';
            html += '<label class="block text-xs font-medium text-slate-500 mb-1">Pilih Pasien *</label>';
            html += '<select id="ant-pasien" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="">-- Cari Pasien --</option>';
            this.pasienList.forEach(function(p) {
                html += '<option value="' + p.id + '">' + Utils.escapeHtml(p.nomorRM) + ' - ' + Utils.escapeHtml(p.nama) + '</option>';
            });
            html += '</select></div>';

            html += '<div>';
            html += '<label class="block text-xs font-medium text-slate-500 mb-1">Dokter Tujuan *</label>';
            html += '<select id="ant-dokter" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="">-- Pilih Dokter --</option>';
            this.dokterList.forEach(function(d) {
                html += '<option value="' + d.id + '">' + Utils.escapeHtml(d.nama) + '</option>';
            });
            html += '</select></div>';

            html += '<div>';
            html += '<label class="block text-xs font-medium text-slate-500 mb-1">Keluhan Awal</label>';
            html += '<input type="text" id="ant-keluhan" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="Batuk, demam...">';
            html += '</div>';

            html += '<button onclick="AppKlinikAntrian.tambah()" class="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition h-[42px]">Proses Antrian</button>';
            html += '</div></div>';
        }

        // DAFTAR ANTRIAN
        html += '<div id="antrian-list"></div>';

        document.getElementById('antrian-content').innerHTML = html;
        this.renderList();
        if (!isDokter) SearchableSelect.attach('ant-pasien', { placeholder: 'Ketik nama / no. RM pasien...' });
    },

    tambah: function() {
        // FIX (permintaan user): cegah double click cepat yang menyebabkan
        // pasien yang sama terinput dua kali sebelum request pertama selesai.
        if (this._isSubmitting) return;

        var pasienId = document.getElementById('ant-pasien').value;
        var dokterId = document.getElementById('ant-dokter').value;
        var keluhan = document.getElementById('ant-keluhan').value.trim();

        if (!pasienId || !dokterId) {
            Utils.toast('Pasien dan Dokter wajib dipilih', 'error');
            return;
        }

        this._isSubmitting = true;
        var btnTambah = document.querySelector('button[onclick="AppKlinikAntrian.tambah()"]');
        if (btnTambah) {
            btnTambah.disabled = true;
            btnTambah.classList.add('opacity-60', 'cursor-not-allowed');
        }

        // Cari jumlah antrian hari ini untuk dokter tersebut
        var antrianDokter = this.data.filter(function(a) { return a.dokterId === dokterId; });
        var nomorUrut = antrianDokter.length + 1;

        // Cari data pasien & dokter untuk nama
        var pasien = this.pasienList.find(function(p) { return p.id === pasienId; });
        var dokter = this.dokterList.find(function(d) { return d.id === dokterId; });

        var obj = {
            tanggal: getLocalDateStr(),
            nomorAntrian: 'A-' + nomorUrut,
            pasienId: pasienId,
            namaPasien: pasien ? pasien.nama : '-',
            nomorRM: pasien ? pasien.nomorRM : '-',
            dokterId: dokterId,
            namaDokter: dokter ? dokter.nama : '-',
            keluhan: keluhan,
            status: 'menunggu', // menunggu, dilayani, selesai, batal
            waktuDaftar: firebase.firestore.FieldValue.serverTimestamp(),
            waktuMulai: null,
            waktuSelesai: null
        };

        db.collection('antrian').add(obj).then(function() {
            Utils.toast('Pasien masuk antrian!', 'success');
            // FIX: reset semua field supaya pasien tidak masuk 2x karena klik ganda.
            var elPas = document.getElementById('ant-pasien');
            var elDok = document.getElementById('ant-dokter');
            var elKel = document.getElementById('ant-keluhan');
            if (elPas) elPas.value = '';
            if (elDok) elDok.value = '';
            if (elKel) elKel.value = '';
            AppKlinikAntrian._isSubmitting = false;
            AppKlinikAntrian.init(); // Reload untuk update nomor urut (juga akan render ulang tombol dalam keadaan aktif)
        }).catch(function(err) {
            AppKlinikAntrian._isSubmitting = false;
            if (btnTambah) {
                btnTambah.disabled = false;
                btnTambah.classList.remove('opacity-60', 'cursor-not-allowed');
            }
            Utils.toast('Gagal: ' + err.message, 'error');
        });
    },

    renderList: function() {
        var container = document.getElementById('antrian-list');
        if (!container) return;

        if (this.data.length === 0) {
            container.innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-400">Belum ada antrian hari ini.</div>';
            return;
        }

        var html = '<div class="space-y-3">';

        var isDokter = (window.currentRole === 'dokter');
        var resepStatusMap = AppKlinikAntrian.resepStatusMap || {};

        // FIX (permintaan user): tampilan grup status Antrian khusus akun Dokter dibedakan
        // dari akun Klinik. Dokter hanya perlu melihat pasien yang HARUS ia layani, pasien
        // yang sudah selesai ia periksa, dan pasien yang resepnya sudah selesai diproses
        // di Apotek. Grup "Menunggu" (belum dipanggil staf) & "Dibatalkan" tidak relevan
        // untuk Dokter, jadi disembunyikan.
        var statuses = isDokter ? [
            { key: 'dilayani',        label: 'Harus di Layani',   color: 'blue'    },
            { key: 'selesai_dilayani',label: 'Selesai Dilayani',  color: 'emerald' },
            { key: 'selesai_apotek',  label: 'Selesai di Apotek', color: 'green'   }
        ] : [
            { key: 'dilayani', label: 'Sedang Dilayani', color: 'blue' },
            { key: 'menunggu', label: 'Menunggu', color: 'amber' },
            { key: 'selesai', label: 'Selesai', color: 'green' },
            { key: 'batal', label: 'Dibatalkan', color: 'slate' }
        ];

        statuses.forEach(function(stat) {
            var filtered;
            if (stat.key === 'selesai_dilayani') {
                // Sudah selesai diperiksa dokter, tapi resepnya belum kelar diproses Apotek.
                filtered = AppKlinikAntrian.data.filter(function(a) {
                    return a.status === 'selesai' && resepStatusMap[a.id] !== 'selesai';
                });
            } else if (stat.key === 'selesai_apotek') {
                // Sudah selesai diperiksa dokter DAN resepnya sudah selesai diproses Apotek.
                filtered = AppKlinikAntrian.data.filter(function(a) {
                    return a.status === 'selesai' && resepStatusMap[a.id] === 'selesai';
                });
            } else {
                filtered = AppKlinikAntrian.data.filter(function(a) { return a.status === stat.key; });
            }
            if (filtered.length === 0) return;

            html += '<div class="mb-2">';
            html += '<h4 class="text-sm font-bold text-' + stat.color + '-700 dark:text-' + stat.color + '-400 flex items-center gap-2 mb-3">';
            html += '<span class="w-2 h-2 rounded-full bg-' + stat.color + '-500"></span>' + stat.label + ' <span class="text-slate-400 font-normal">(' + filtered.length + ')</span>';
            html += '</h4>';

            var isAdmin = (window.currentRole === 'admin' || window.currentRole === 'keuangan' || window.currentRole === 'psa');

            if (isDokter) {
                // TAMBAHAN (permintaan user): tampilan "etalase" — grid kartu yang lebih
                // menarik dibanding daftar/list biasa, khusus untuk akun Dokter.
                html += '<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">';

                filtered.forEach(function(a) {
                    var sudahSelesai = (stat.key === 'selesai_dilayani' || stat.key === 'selesai_apotek');

                    html += '<div class="relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">';
                    html += '  <div class="h-1.5 bg-' + stat.color + '-500"></div>';
                    html += '  <div class="p-5">';
                    html += '    <div class="flex items-start justify-between mb-3">';
                    html += '      <div class="w-14 h-14 rounded-xl bg-' + stat.color + '-50 dark:bg-' + stat.color + '-900/30 flex items-center justify-center text-xl font-bold text-' + stat.color + '-600 dark:text-' + stat.color + '-400">' + a.nomorAntrian + '</div>';
                    if (stat.key === 'selesai_apotek') {
                        html += '      <span class="text-[10px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full flex items-center gap-1"><i data-lucide="check-check" class="w-3 h-3"></i> Obat Siap</span>';
                    } else if (stat.key === 'selesai_dilayani') {
                        html += '      <span class="text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded-full flex items-center gap-1"><i data-lucide="loader" class="w-3 h-3"></i> Di Apotek</span>';
                    }
                    html += '    </div>';
                    html += '    <h5 class="font-semibold text-gray-800 dark:text-white text-base leading-tight">' + Utils.escapeHtml(a.namaPasien) + '</h5>';
                    html += '    <p class="text-xs text-slate-400 mb-2">No. RM ' + Utils.escapeHtml(a.nomorRM) + '</p>';
                    if (a.keluhan) {
                        html += '    <p class="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-lg px-2.5 py-1.5 mb-3 flex items-center gap-1.5"><i data-lucide="message-circle" class="w-3.5 h-3.5 flex-shrink-0"></i> ' + Utils.escapeHtml(a.keluhan) + '</p>';
                    }
                    if (!sudahSelesai) {
                        html += '    <button onclick="AppKlinikAntrian.bukaRM(\'' + a.id + '\')" class="w-full text-sm bg-primary-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-primary-700 flex items-center justify-center gap-1.5"><i data-lucide="stethoscope" class="w-4 h-4"></i> Buka RM</button>';
                    }
                    html += '  </div>';
                    html += '</div>';
                });

                html += '</div>';
            } else {
            html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
            html += '<div class="divide-y divide-slate-100 dark:divide-slate-700">';

            // FIX (permintaan user): perilaku tombol antrian dibedakan per role akun.
            // - Akun Dokter: langsung dapat tombol "Buka RM" (baik saat menunggu maupun sedang dilayani),
            //   membuka RM otomatis akan memindahkan status ke "dilayani" (lihat js/klinik/rekamMedis.js).
            // - Akun Klinik (staf/resepsionis) & role lain: hanya tombol "Panggil" untuk memanggil pasien
            //   masuk ke status "Sedang Dilayani", menunggu ditangani dokter. Tidak ada tombol "Buka RM".
            // - Tombol "Selesai" dihapus total: status "selesai" hanya berubah otomatis saat dokter
            //   menyimpan Rekam Medis pasien tersebut.
            var isDokter = (window.currentRole === 'dokter');
            var isAdmin  = (window.currentRole === 'admin' || window.currentRole === 'keuangan' || window.currentRole === 'psa');

            filtered.forEach(function(a) {
                var dimClass = (a.status !== 'menunggu' && a.status !== 'dilayani') ? 'opacity-80 bg-slate-50/50 dark:bg-slate-800/50' : '';
                html += '<div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ' + dimClass + '">';
                html += '  <div class="flex items-center gap-4">';
                html += '    <div class="text-2xl font-bold text-' + stat.color + '-600 dark:text-' + stat.color + '-400 w-16 text-center">' + a.nomorAntrian + '</div>';
                html += '    <div>';
                html += '      <p class="font-semibold text-gray-800 dark:text-white">' + Utils.escapeHtml(a.namaPasien) + ' <span class="text-xs font-normal text-slate-400">(' + Utils.escapeHtml(a.nomorRM) + ')</span></p>';
                html += '      <p class="text-xs text-slate-500">Dokter: ' + Utils.escapeHtml(a.namaDokter) + (a.keluhan ? ' • Keluhan: ' + Utils.escapeHtml(a.keluhan) : '') + '</p>';
                html += '    </div>';
                html += '  </div>';
                
                html += '  <div class="flex items-center gap-2 ml-16 sm:ml-0 flex-wrap">';

                var btnBukaRM = '<button onclick="AppKlinikAntrian.bukaRM(\'' + a.id + '\')" class="text-xs bg-primary-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-primary-700 flex items-center gap-1"><i data-lucide="stethoscope" class="w-3 h-3"></i> Buka RM</button>';

                if (a.status === 'menunggu') {
                    if (isDokter) {
                        // Akun Dokter: langsung Buka RM, tanpa perlu menunggu dipanggil staf.
                        html += '    ' + btnBukaRM;
                    } else {
                        html += '    <button onclick="AppKlinikAntrian.panggil(\'' + a.id + '\')" class="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 px-3 py-1.5 rounded-lg font-medium hover:bg-blue-200 flex items-center gap-1"><i data-lucide="volume-2" class="w-3.5 h-3.5"></i> Panggil</button>';
                        // Batal hanya untuk Admin/Keuangan (kontrol penuh); staf Klinik hanya Panggil.
                        if (isAdmin) {
                            html += '    <button onclick="AppKlinikAntrian.batal(\'' + a.id + '\')" class="text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1.5 rounded-lg">Batal</button>';
                        }
                    }
                }
                
                if (a.status === 'dilayani') {
                    if (isDokter) {
                        html += '    ' + btnBukaRM;
                    } else {
                        html += '    <button onclick="AppKlinikAntrian.panggilSuara(\'' + a.id + '\')" class="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 mr-2"><i data-lucide="volume-2" class="w-3.5 h-3.5"></i> Panggil Ulang</button>';
                        html += '    <span class="text-xs text-slate-400 italic">Menunggu dokter</span>';
                    }
                }

                if (isAdmin) {
                    html += '    <button onclick="AppKlinikAntrian.editAntrian(\'' + a.id + '\')" class="text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1" title="Edit Data Antrian"><i data-lucide="edit" class="w-3.5 h-3.5"></i> Edit</button>';
                    html += '    <button onclick="AppKlinikAntrian.hapusAntrian(\'' + a.id + '\')" class="text-xs bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1" title="Hapus Data Antrian"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Hapus</button>';
                }
                
                html += '  </div>';
                html += '</div>';
            });

            html += '</div></div>';
            } // tutup else (tampilan list untuk non-Dokter)

            html += '</div>'; // tutup wrapper mb-2 per grup status
        });

        html += '</div>';
        container.innerHTML = html;
        lucide.createIcons();
    },

    // TAMBAHAN: kosongkan tampilan layar TV (display.html) secara manual.
    // Dipakai staf saat ada nomor yang "nyangkut" di layar — misalnya pasien
    // terakhir hari itu sudah selesai dilayani, tidak ada panggilan baru lagi
    // setelahnya, jadi nomor lama terus tertampil sampai lewat tengah malam.
    // Hanya menghapus field current/next/riwayat di dokumen bersama Firestore;
    // TIDAK menyentuh data antrian pasien (status, riwayat kunjungan, dst).
    resetDisplay: function() {
        if (!confirm('Kosongkan tampilan di layar display sekarang?\n\nIni hanya menghapus nomor yang tampil di layar TV, data antrian pasien tidak akan berubah.')) return;
        db.collection('pengaturan').doc('antrianDisplay').set({
            current: null,
            next: null,
            riwayat: [],
            tanggal: getLocalDateStr(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function() {
            Utils.toast('Tampilan display berhasil dikosongkan.', 'success');
        }).catch(function(err) {
            Utils.toast('Gagal reset display: ' + err.message, 'error');
        });
    },

    panggil: function(id) {
        db.collection('antrian').doc(id).get().then(function(doc) {
            if (!doc.exists) return;
            var data = doc.data();
            
            db.collection('antrian').doc(id).update({
                status: 'dilayani',
                waktuMulai: firebase.firestore.FieldValue.serverTimestamp()
            }).then(function() {
                Utils.toast('Pasien dipanggil!', 'success');
                AppKlinikAntrian.suaraPanggil(data.nomorAntrian, data.namaPasien, data.namaDokter);
                AppKlinikAntrian.updateDisplay(data.nomorAntrian, data.namaPasien, data.namaDokter);
                AppKlinikAntrian.init();
            }).catch(function(err) { Utils.toast('Gagal: ' + err.message, 'error'); });
        }).catch(function(err) { Utils.toast('Gagal memuat data antrian: ' + err.message, 'error'); });
    },

    panggilSuara: function(id) {
        db.collection('antrian').doc(id).get().then(function(doc) {
            if (!doc.exists) return;
            var data = doc.data();
            Utils.toast('Memanggil ulang nomor ' + data.nomorAntrian + '...', 'info');
            AppKlinikAntrian.suaraPanggil(data.nomorAntrian, data.namaPasien, data.namaDokter);
            AppKlinikAntrian.updateDisplay(data.nomorAntrian, data.namaPasien, data.namaDokter);
        }).catch(function(err) { Utils.toast('Gagal memanggil suara: ' + err.message, 'error'); });
    },

    // TAMBAHAN: tulis nomor yang baru dipanggil ke dokumen bersama
    // 'pengaturan/antrianDisplay', supaya layar TV (display.html) yang
    // sedang listen real-time (onSnapshot) langsung menampilkannya.
    // Nomor yang sebelumnya jadi 'current' otomatis masuk ke 'riwayat'
    // (maks. 5 nomor terakhir), kecuali kalau ini cuma "Panggil Ulang"
    // untuk nomor yang sama (tidak dianggap nomor baru).
    updateDisplay: function(nomorAntrian, namaPasien, namaDokter) {
        var ref = db.collection('pengaturan').doc('antrianDisplay');
        ref.get().then(function(doc) {
            var prev = doc.exists ? (doc.data().current || null) : null;
            var riwayat = doc.exists ? (doc.data().riwayat || []) : [];

            if (prev && prev.nomorAntrian !== nomorAntrian) {
                riwayat.unshift(prev);
                riwayat = riwayat.slice(0, 5);
            }

            ref.set({
                current: { nomorAntrian: nomorAntrian, namaPasien: namaPasien, namaDokter: namaDokter, waktu: Date.now() },
                riwayat: riwayat,
                tanggal: getLocalDateStr(), // FITUR BARU: lihat catatan di syncNextWaiting()
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }).catch(function(err) { console.error('Gagal update display antrian:', err); });
        }).catch(function(err) { console.error('Gagal baca display antrian:', err); });
    },

    suaraPanggil: function(nomorAntrian, namaPasien, namaDokter) {
        if (!('speechSynthesis' in window)) {
            Utils.toast('Browser ini tidak mendukung Panggilan Suara (TTS).', 'error');
            return;
        }

        // Hentikan suara yang sedang aktif agar tidak tumpang tindih
        window.speechSynthesis.cancel();

        var lang = AppKlinikAntrian.bahasa || 'id';

        // Bersihkan penyebutan gelar agar pelafalan natural
        var dokterLafal = namaDokter.replace(/dr\.\s*/gi, 'Dokter ').trim();
        
        var teks = "";
        if (lang === 'en') {
            teks = "Queue number " + nomorAntrian + ", for " + namaPasien + ", please proceed to room " + dokterLafal;
        } else if (lang === 'su') {
            teks = "Nomer antrean " + nomorAntrian + ", asmana " + namaPasien + ", mangga ka rohang " + dokterLafal;
        } else {
            teks = "Nomor antrian " + nomorAntrian + ", atas nama " + namaPasien + ", silakan menuju ke ruang " + dokterLafal;
        }

        var utterance = new SpeechSynthesisUtterance(teks);
        
        if (lang === 'en') {
            utterance.lang = 'en-US';
        } else {
            utterance.lang = 'id-ID'; // su dan id menggunakan suara Indonesia agar pelafalan natural
        }
        utterance.rate = 0.85; // Sedikit diperlambat agar jelas terdengar di speaker klinik
        utterance.pitch = 1.0;

        // Cari suara yang sesuai
        var voices = window.speechSynthesis.getVoices();
        var selectedVoice = null;
        if (lang === 'en') {
            selectedVoice = voices.find(function(v) { return v.lang.toLowerCase().indexOf('en') !== -1; });
        } else {
            selectedVoice = voices.find(function(v) { return v.lang.toLowerCase().indexOf('id') !== -1; });
        }

        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        window.speechSynthesis.speak(utterance);
    },

    // FIX (permintaan user): tombol "Selesai" dihapus. Status "selesai" sekarang HANYA
    // berubah otomatis saat dokter menyimpan Rekam Medis (lihat js/klinik/rekamMedis.js).
    // bukaRM menggantikan alur lama: khusus akun Dokter, langsung buka form Rekam Medis.
    // Jika antrian masih berstatus "menunggu", rekamMedis.js otomatis mengubahnya
    // menjadi "dilayani" begitu form dibuka.
    //
    // FIX (KLIK DOBEL): guard sederhana supaya klik cepat berkali-kali pada tombol
    // yang sama tidak memicu navigateTo() berkali-kali beruntun (yang di beberapa
    // kondisi race bisa bikin dua proses init() rekamMedis.js jalan bersamaan).
    // Ini pertahanan LAPIS KEDUA saja -- pertahanan UTAMA terhadap data rekam medis
    // dobel ada di rekamMedis.js init() (cek apakah antrian ini sudah punya rekam
    // medis SEBELUM form kosong ditampilkan), karena itu tetap efektif walau
    // dobel-nya bukan dari klik cepat (mis. tombol kembali browser, tab baru, dsb).
    _bukaRMLock: false,
    bukaRM: function(id) {
        if (this._bukaRMLock) return;
        this._bukaRMLock = true;
        setTimeout(function() { AppKlinikAntrian._bukaRMLock = false; }, 1500);

        window.TEMP_ANTRIAN_ID = id;
        navigateTo('klinik/rekamMedis', 'Rekam Medis');
    },

    batal: function(id) {
        if (!confirm('Batalkan antrian ini?')) return;
        db.collection('antrian').doc(id).update({ status: 'batal' }).then(function() {
            AppKlinikAntrian.init();
        }).catch(function(err) { Utils.toast('Gagal: ' + err.message, 'error'); });
    },

    editAntrian: function(id) {
        var item = this.data.find(function(x) { return x.id === id; });
        if (!item) { Utils.toast('Data antrian tidak ditemukan', 'error'); return; }

        var pasienOpts = '<option value="">-- Pilih Pasien --</option>';
        this.pasienList.forEach(function(p) {
            var sel = (p.id === item.pasienId || p.nama === item.namaPasien) ? 'selected' : '';
            pasienOpts += '<option value="' + p.id + '" ' + sel + '>' + Utils.escapeHtml(p.nama) + ' (' + Utils.escapeHtml(p.nomorRM || '-') + ')</option>';
        });

        var dokterOpts = '<option value="">-- Pilih Dokter --</option>';
        this.dokterList.forEach(function(d) {
            var sel = (d.id === item.dokterId || d.nama === item.namaDokter) ? 'selected' : '';
            dokterOpts += '<option value="' + d.id + '" ' + sel + '>' + Utils.escapeHtml(d.nama) + '</option>';
        });

        var statusList = [
            { id: 'menunggu', label: 'Menunggu' },
            { id: 'dilayani', label: 'Sedang Dilayani' },
            { id: 'selesai', label: 'Selesai' },
            { id: 'batal', label: 'Dibatalkan' }
        ];

        var statusOpts = '';
        statusList.forEach(function(s) {
            var sel = (s.id === item.status) ? 'selected' : '';
            statusOpts += '<option value="' + s.id + '" ' + sel + '>' + s.label + '</option>';
        });

        var html = '<div class="p-5">';
        html += '<h3 class="text-lg font-bold text-gray-800 dark:text-white mb-4">Edit Data Antrian (No: ' + Utils.escapeHtml(item.nomorAntrian || '-') + ')</h3>';
        html += '<form id="form-edit-antrian" onsubmit="event.preventDefault(); AppKlinikAntrian.simpanEditAntrian(\'' + id + '\');" class="space-y-4">';

        html += '<div>';
        html += '<label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Pasien *</label>';
        html += '<select id="edit-ant-pasien" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" required>' + pasienOpts + '</select>';
        html += '</div>';

        html += '<div>';
        html += '<label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Dokter Tujuan *</label>';
        html += '<select id="edit-ant-dokter" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" required>' + dokterOpts + '</select>';
        html += '</div>';

        html += '<div>';
        html += '<label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Status Antrian *</label>';
        html += '<select id="edit-ant-status" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" required>' + statusOpts + '</select>';
        html += '</div>';

        html += '<div>';
        html += '<label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Keluhan Awal</label>';
        html += '<input type="text" id="edit-ant-keluhan" value="' + Utils.escapeHtml(item.keluhan || '') + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="Keluhan awal pasien">';
        html += '</div>';

        html += '<div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">';
        html += '<button type="button" onclick="Utils.closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-lg">Batal</button>';
        html += '<button type="submit" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg flex items-center gap-1.5"><i data-lucide="save" class="w-4 h-4"></i> Simpan Perubahan</button>';
        html += '</div>';

        html += '</form></div>';

        Utils.openModal(html);
    },

    simpanEditAntrian: function(id) {
        var item = this.data.find(function(x) { return x.id === id; });
        if (!item) return;

        var pasienId = document.getElementById('edit-ant-pasien').value;
        var dokterId = document.getElementById('edit-ant-dokter').value;
        var status = document.getElementById('edit-ant-status').value;
        var keluhan = document.getElementById('edit-ant-keluhan').value.trim();

        if (!pasienId || !dokterId) {
            Utils.toast('Pasien dan Dokter wajib dipilih', 'error');
            return;
        }

        var pasienObj = this.pasienList.find(function(p) { return p.id === pasienId; });
        var dokterObj = this.dokterList.find(function(d) { return d.id === dokterId; });

        var namaPasien = pasienObj ? pasienObj.nama : item.namaPasien;
        var nomorRM = pasienObj ? pasienObj.nomorRM : item.nomorRM;
        var namaDokter = dokterObj ? dokterObj.nama : item.namaDokter;

        var updateObj = {
            pasienId: pasienId,
            namaPasien: namaPasien,
            nomorRM: nomorRM,
            dokterId: dokterId,
            namaDokter: namaDokter,
            status: status,
            keluhan: keluhan,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        db.collection('antrian').doc(id).update(updateObj).then(function() {
            // INTEGRASI TERKAIT: Update rekamMedis & transaksi jika ada reference ke antrianId ini
            db.collection('rekamMedis').where('antrianId', '==', id).get().then(function(snap) {
                snap.forEach(function(docRM) {
                    docRM.ref.update({
                        pasienId: pasienId,
                        namaPasien: namaPasien,
                        nomorRM: nomorRM,
                        dokterId: dokterId,
                        namaDokter: namaDokter,
                        keluhan: keluhan
                    }).catch(function(errRM) { console.error('Gagal update RM terkait antrian:', errRM); });
                });
            }).catch(function(e) { console.error('Gagal query RM terkait antrian:', e); });

            db.collection('transaksi').where('antrianId', '==', id).get().then(function(snapTrx) {
                snapTrx.forEach(function(docTrx) {
                    docTrx.ref.update({
                        pasienId: pasienId,
                        namaPasien: namaPasien,
                        nomorRM: nomorRM,
                        dokterId: dokterId,
                        namaDokter: namaDokter
                    }).catch(function(errTrx) { console.error('Gagal update transaksi terkait antrian:', errTrx); });
                });
            }).catch(function(e) { console.error('Gagal query transaksi terkait antrian:', e); });

            Utils.toast('Data antrian berhasil diperbarui!', 'success');
            Utils.closeModal();
            AppKlinikAntrian.init();
        }).catch(function(err) {
            Utils.toast('Gagal memperbarui antrian: ' + err.message, 'error');
        });
    },

    hapusAntrian: function(id) {
        var item = this.data.find(function(x) { return x.id === id; });
        if (!item) return;

        if (!confirm('Apakah Anda yakin ingin menghapus data antrian No. ' + (item.nomorAntrian || '') + ' (' + (item.namaPasien || '') + ')?')) return;

        db.collection('antrian').doc(id).delete().then(function() {
            // INTEGRASI TERKAIT: Unlink antrianId pada rekamMedis terkait jika ada
            db.collection('rekamMedis').where('antrianId', '==', id).get().then(function(snap) {
                snap.forEach(function(docRM) {
                    docRM.ref.update({ antrianId: firebase.firestore.FieldValue.delete() }).catch(function(){});
                });
            }).catch(function(){});

            Utils.toast('Data antrian berhasil dihapus!', 'success');
            AppKlinikAntrian.init();
        }).catch(function(err) {
            Utils.toast('Gagal menghapus antrian: ' + err.message, 'error');
        });
    }
};
