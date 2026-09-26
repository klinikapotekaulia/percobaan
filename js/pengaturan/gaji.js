/**
 * js/pengaturan/gaji.js
 * Pengaturan Gaji Pokok per Karyawan (Apotek & Klinik)
 */

window.AppPengaturanGaji = {

    data: { apotek: [], klinik: [] },
    karyawanList: [],

    render: function() {
        var html = '<div class="page-enter max-w-3xl">';
        html += '  <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-1">Pengaturan Gaji Pokok</h2>';
        html += '  <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Hubungkan karyawan dengan nominal gaji pokok bulanan</p>';
        html += '  <div id="gaji-content"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        var pKaryawan = db.collection('karyawan').where('status', '==', 'aktif').get();
        var pConfig = db.collection('pengaturanGaji').doc('global').get();

        Promise.all([pKaryawan, pConfig]).then(function(results) {
            AppPengaturanGaji.karyawanList = [];
            results[0].forEach(function(doc) { var d = doc.data(); d.id = doc.id; AppPengaturanGaji.karyawanList.push(d); });

            if (results[1].exists) {
                var rawData = results[1].data();
                AppPengaturanGaji.data = {
                    apotek: Array.isArray(rawData.apotek) ? rawData.apotek : [],
                    klinik: Array.isArray(rawData.klinik) ? rawData.klinik : []
                };
            } else {
                db.collection('pengaturanGaji').doc('global').set(AppPengaturanGaji.data);
            }
            AppPengaturanGaji.renderForm();
        }).catch(function(err) { Utils.toast('Gagal memuat: ' + err.message, 'error'); });
    },

    renderForm: function() {
        var d = this.data;
        var html = '';

        // 1. GAJI APOTEK
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">';
        html += '<div class="flex justify-between items-center mb-4"><h3 class="font-semibold text-teal-600 dark:text-teal-400 flex items-center gap-2 text-lg"><i data-lucide="cross" class="w-5 h-5"></i> 1. Gaji Karyawan Apotek</h3><button onclick="AppPengaturanGaji.addRow(\'apotek\')" class="text-sm bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 px-3 py-1.5 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/50 font-medium">+ Tambah Karyawan</button></div>';
        html += '<div id="gaji-list-apotek" class="space-y-2">';
        if(d.apotek.length === 0) html += '<p class="text-sm text-slate-400 italic p-2">Belum ada data.</p>';
        else d.apotek.forEach((item, i) => html += AppPengaturanGaji.renderRow('apotek', i, item));
        html += '</div></div>';

        // 2. GAJI KLINIK
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6">';
        html += '<div class="flex justify-between items-center mb-4"><h3 class="font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-2 text-lg"><i data-lucide="stethoscope" class="w-5 h-5"></i> 2. Gaji Karyawan Klinik</h3><button onclick="AppPengaturanGaji.addRow(\'klinik\')" class="text-sm bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-3 py-1.5 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 font-medium">+ Tambah Karyawan</button></div>';
        html += '<div id="gaji-list-klinik" class="space-y-2">';
        if(d.klinik.length === 0) html += '<p class="text-sm text-slate-400 italic p-2">Belum ada data.</p>';
        else d.klinik.forEach((item, i) => html += AppPengaturanGaji.renderRow('klinik', i, item));
        html += '</div></div>';

        // TOMBOL SIMPAN
        html += '<div class="flex justify-end sticky bottom-6 z-10"><button onclick="AppPengaturanGaji.simpan()" class="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg transition-all text-sm flex items-center gap-2"><i data-lucide="save" class="w-4 h-4"></i> Simpan Pengaturan Gaji</button></div>';

        document.getElementById('gaji-content').innerHTML = html;
        lucide.createIcons();
    },

    renderRow: function(tipe, index, item) {
        var html = '<div id="row-gaji-' + tipe + '-' + index + '" class="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">';
        
        // Dropdown Karyawan (Di-filter berdasarkan tipe)
        html += '<div class="w-full sm:w-1/2">';
        html += '<select id="gaji-id-' + tipe + '-' + index + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm">';
        html += '<option value="">-- Pilih Karyawan --</option>';
        this.karyawanList.forEach(k => {
            // Hanya tampilkan karyawan sesuai departemen
            if (k.departemen === tipe.charAt(0).toUpperCase() + tipe.slice(1)) {
                var sel = (k.id === item.karyawanId) ? ' selected' : '';
                html += '<option value="' + k.id + '"' + sel + '>' + Utils.escapeHtml(k.nama) + ' (' + Utils.escapeHtml(k.jabatan || '-') + ')</option>';
            }
        });
        html += '</select></div>';

        // Input Gaji
        html += '<div class="flex items-center gap-2 w-full sm:w-1/3">';
        html += '<input type="number" id="gaji-nominal-' + tipe + '-' + index + '" value="' + (item.gajiPokok || 0) + '" placeholder="0" min="0" step="any" required class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm text-right pr-8 focus:ring-2 focus:ring-primary-500 outline-none">';
        html += '<span class="absolute right-14 text-xs text-slate-400">Rp</span>'; // Fix posisi nanti kalau perlu
        html += '</div>';

        // Tombol Hapus
        html += '<button onclick="AppPengaturanGaji.removeRow(\'' + tipe + '\',' + index + ')" class="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><i data-lucide="trash-2" class="w-4 h-4"></i></button>';
        
        html += '</div>';
        return html;
    },

    addRow: function(tipe) {
        this.data[tipe].push({ karyawanId: '', gajiPokok: 0 });
        this.renderForm();
    },

    removeRow: function(tipe, index) {
        this.data[tipe].splice(index, 1);
        this.renderForm();
    },

    simpan: function() {
        var dataToSave = { apotek: [], klinik: [] };
        var invalid = false;

        // Kumpulkan Apotek
        var apotekRows = document.querySelectorAll('[id^="row-gaji-apotek-"]');
        apotekRows.forEach((row, i) => {
            var karyId = document.getElementById('gaji-id-apotek-' + i)?.value;
            var nominalEl = document.getElementById('gaji-nominal-apotek-' + i);
            var nominalRaw = nominalEl?.value;
            if (karyId) {
                if (nominalRaw === '' || nominalRaw === undefined || isNaN(nominalRaw) || parseFloat(nominalRaw) < 0) {
                    invalid = true;
                }
                dataToSave.apotek.push({
                    karyawanId: karyId,
                    gajiPokok: parseFloat(nominalRaw) || 0
                });
            }
        });

        // Kumpulkan Klinik
        var klinikRows = document.querySelectorAll('[id^="row-gaji-klinik-"]');
        klinikRows.forEach((row, i) => {
            var karyId = document.getElementById('gaji-id-klinik-' + i)?.value;
            var nominalEl = document.getElementById('gaji-nominal-klinik-' + i);
            var nominalRaw = nominalEl?.value;
            if (karyId) {
                if (nominalRaw === '' || nominalRaw === undefined || isNaN(nominalRaw) || parseFloat(nominalRaw) < 0) {
                    invalid = true;
                }
                dataToSave.klinik.push({
                    karyawanId: karyId,
                    gajiPokok: parseFloat(nominalRaw) || 0
                });
            }
        });

        if (invalid) {
            Utils.toast('Nominal gaji wajib diisi dan tidak boleh negatif', 'error');
            return;
        }

        Utils.toast('Menyimpan...', 'info');
        db.collection('pengaturanGaji').doc('global').set(dataToSave, { merge: true })
            .then(() => Utils.toast('Pengaturan Gaji berhasil disimpan!', 'success'))
            .catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    }
};
