/**
 * js/klinik/dashboardDokter.js
 * Dashboard Dokter
 *
 * FITUR (permintaan dokter):
 * - Jumlah resep (kunjungan yang menghasilkan diagnosa/rekam medis) per tanggal,
 *   dengan filter Hari Ini / 7 Hari Terakhir / Custom (pola sama seperti
 *   laporan/penjualanHarian.js supaya konsisten dengan modul lain).
 * - Filter otomatis ke dokter yang sedang login (lewat window.currentKaryawanId,
 *   yang di-set app.js dari field `karyawanId` di dokumen users). Kalau akun
 *   belum ditautkan ke data Karyawan, fallback menampilkan seluruh resep klinik
 *   (dengan catatan) supaya dokter tetap bisa lihat data alih-alih halaman kosong.
 *
 * FIRESTORE COLLECTIONS (dibaca, tidak ditulis oleh modul ini):
 *   - rekamMedis { tanggal, dokterId, namaDokter, namaPasien, diagnosa, status, ... }
 *
 * CARA PASANG:
 *   1. Menu & role access sudah ditambahkan di app.js
 *      (menuStructure.klinik + roleAccess.dokter).
 */

window.AppKlinikDashboardDokter = {

    data: [],
    mode: 'hari_ini', // 'hari_ini' | '7_hari' | 'custom'

    // ===== RENDER =====
    render: function() {
        var today = Utils.today(); // FIX: pakai tanggal lokal, bukan UTC
        return [
            '<div class="page-enter max-w-5xl">',
            '  <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-1">Dashboard Dokter</h2>',
            '  <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Ringkasan jumlah resep/kunjungan berdasarkan tanggal</p>',

            '  <div class="flex flex-wrap gap-2 mb-4">',
            '    <button onclick="AppKlinikDashboardDokter.setMode(\'hari_ini\')" id="dd-btn-hari_ini" class="dd-mode-btn px-4 py-2 rounded-lg text-sm font-semibold bg-primary-600 text-white transition">Hari Ini</button>',
            '    <button onclick="AppKlinikDashboardDokter.setMode(\'7_hari\')" id="dd-btn-7_hari" class="dd-mode-btn px-4 py-2 rounded-lg text-sm font-semibold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition">7 Hari Terakhir</button>',
            '    <button onclick="AppKlinikDashboardDokter.setMode(\'custom\')" id="dd-btn-custom" class="dd-mode-btn px-4 py-2 rounded-lg text-sm font-semibold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition">Custom</button>',
            '  </div>',

            '  <div id="dd-custom-range" class="hidden flex items-center gap-3 mb-4">',
            '    <input type="date" id="dd-start" value="' + today + '" class="px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm">',
            '    <span class="text-slate-400">s/d</span>',
            '    <input type="date" id="dd-end" value="' + today + '" class="px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm">',
            '    <button onclick="AppKlinikDashboardDokter.init()" class="bg-primary-600 text-white text-sm px-4 py-1.5 rounded-lg font-medium">Tampilkan</button>',
            '  </div>',

            '  <div id="dd-content"><div class="flex justify-center py-20"><div class="spinner"></div></div></div>',
            '</div>'
        ].join('');
    },

    // ===== INIT =====
    init: function() {
        var self = this;
        var dates = this._getDateRange();
        var container = document.getElementById('dd-content');
        if (container) container.innerHTML = '<div class="flex justify-center py-20"><div class="spinner"></div></div>';

        var q = db.collection('rekamMedis')
            .where('tanggal', '>=', dates.start)
            .where('tanggal', '<=', dates.end);

        // Kalau akun dokter ini sudah tertaut ke data Karyawan, batasi hanya resep
        // milik dokter yang login. Kalau belum tertaut, tampilkan semua + beri catatan.
        if (window.currentKaryawanId) {
            q = q.where('dokterId', '==', window.currentKaryawanId);
        }

        q.orderBy('tanggal', 'asc').get().then(function(snap) {
            self.data = [];
            snap.forEach(function(doc) { var d = doc.data(); d.id = doc.id; self.data.push(d); });
            self.renderReport(dates);
        }).catch(function(err) {
            if (container) container.innerHTML = '<p class="text-red-500 text-center py-10">Gagal memuat: ' + Utils.escapeHtml(err.message) + '</p>';
        });
    },

    // ===== SET MODE =====
    setMode: function(mode) {
        this.mode = mode;
        ['hari_ini', '7_hari', 'custom'].forEach(function(m) {
            var btn = document.getElementById('dd-btn-' + m);
            if (!btn) return;
            btn.className = (m === mode)
                ? 'dd-mode-btn px-4 py-2 rounded-lg text-sm font-semibold bg-primary-600 text-white transition'
                : 'dd-mode-btn px-4 py-2 rounded-lg text-sm font-semibold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition';
        });
        var customEl = document.getElementById('dd-custom-range');
        if (customEl) customEl.className = (mode === 'custom') ? 'flex items-center gap-3 mb-4' : 'hidden flex items-center gap-3 mb-4';
        if (mode !== 'custom') this.init();
    },

    // ===== RENDER REPORT =====
    renderReport: function(dates) {
        var container = document.getElementById('dd-content');
        if (!container) return;

        var warning = '';
        if (!window.currentKaryawanId) {
            warning = '<div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm rounded-xl p-3 mb-4">' +
                '<i data-lucide="alert-triangle" class="w-4 h-4 inline mr-1"></i> Akun ini belum ditautkan ke data Karyawan, jadi menampilkan resep dari SEMUA dokter. ' +
                'Minta Admin menautkan akun Anda lewat menu Manajemen &gt; Karyawan agar data hanya menampilkan resep Anda sendiri.</div>';
        }

        if (this.data.length === 0) {
            container.innerHTML = warning + '<div class="text-center py-20 text-slate-400"><i data-lucide="file-text" class="w-12 h-12 mx-auto mb-3"></i><p class="font-semibold">Tidak ada resep/kunjungan di periode ini</p></div>';
            if (window.lucide) lucide.createIcons();
            return;
        }

        // ===== KALKULASI =====
        var harianMap = {};   // tanggal -> jumlah resep
        var pasienMap = {};   // namaPasien -> jumlah kunjungan (pasien lama vs baru)
        this.data.forEach(function(k) {
            var tgl = k.tanggal || '-';
            harianMap[tgl] = (harianMap[tgl] || 0) + 1;
            var nama = k.namaPasien || '-';
            pasienMap[nama] = (pasienMap[nama] || 0) + 1;
        });

        var totalResep = this.data.length;
        var hariKeys = Object.keys(harianMap).sort();
        var avgPerHari = hariKeys.length > 0 ? (totalResep / hariKeys.length) : 0;
        var pasienLama = Object.values(pasienMap).filter(function(c) { return c > 1; }).length;

        var html = warning;

        // 1. Summary cards
        html += '<div class="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">';
        html += this._card('file-text', 'Total Resep/Kunjungan', totalResep + ' resep', 'text-primary-600 dark:text-primary-400');
        html += this._card('calculator', 'Rata-rata/Hari', avgPerHari.toFixed(1) + ' resep', 'text-violet-600 dark:text-violet-400');
        html += this._card('repeat', 'Pasien Kunjungan Ulang', pasienLama + ' pasien', 'text-emerald-600 dark:text-emerald-400');
        html += '</div>';

        // 2. Grafik jumlah resep per tanggal
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6">';
        html += '<h3 class="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><i data-lucide="bar-chart-2" class="w-4 h-4 text-primary-500"></i> Jumlah Resep per Tanggal</h3>';
        var maxVal = Math.max.apply(null, hariKeys.map(function(k) { return harianMap[k]; }));
        html += '<div class="overflow-x-auto"><div class="flex items-end gap-1 min-w-0" style="height:120px">';
        hariKeys.forEach(function(tgl) {
            var val = harianMap[tgl];
            var heightPct = maxVal > 0 ? Math.max(4, Math.round(val / maxVal * 100)) : 4;
            html += '<div class="flex flex-col items-center flex-1 min-w-0" title="' + tgl + ': ' + val + ' resep">';
            html += '  <div class="w-full bg-primary-500 hover:bg-primary-600 rounded-t cursor-pointer transition-colors flex items-start justify-center text-[9px] text-white font-semibold pt-0.5" style="height:' + heightPct + '%;min-height:16px">' + val + '</div>';
            html += '  <p class="text-[9px] text-slate-400 mt-1 truncate w-full text-center">' + tgl.slice(5) + '</p>';
            html += '</div>';
        });
        html += '</div></div></div>';

        // 3. Tabel harian ringkas
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">';
        html += '<div class="px-5 py-4 border-b border-slate-100 dark:border-slate-700"><h3 class="font-semibold text-gray-800 dark:text-white">Rekap per Tanggal</h3></div>';
        html += '<div class="overflow-x-auto"><table class="w-full text-sm">';
        html += '<thead class="bg-slate-50 dark:bg-slate-700 text-xs uppercase text-slate-500 dark:text-slate-400"><tr><th class="px-4 py-3 text-left">Tanggal</th><th class="px-4 py-3 text-right">Jumlah Resep</th></tr></thead><tbody class="divide-y divide-slate-100 dark:divide-slate-700">';
        hariKeys.slice().reverse().forEach(function(tgl) {
            html += '<tr><td class="px-4 py-3 text-slate-600 dark:text-slate-300">' + tgl + '</td><td class="px-4 py-3 text-right font-semibold text-gray-800 dark:text-white">' + harianMap[tgl] + '</td></tr>';
        });
        html += '</tbody></table></div></div>';

        // 4. Daftar kunjungan (detail)
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
        html += '<div class="px-5 py-4 border-b border-slate-100 dark:border-slate-700"><h3 class="font-semibold text-gray-800 dark:text-white">Detail Kunjungan (' + totalResep + ')</h3></div>';
        html += '<div class="overflow-x-auto"><table class="w-full text-sm">';
        html += '<thead class="bg-slate-50 dark:bg-slate-700 text-xs uppercase text-slate-500 dark:text-slate-400"><tr><th class="px-4 py-3 text-left">Tanggal</th><th class="px-4 py-3 text-left">Pasien</th><th class="px-4 py-3 text-left">Diagnosa</th></tr></thead><tbody class="divide-y divide-slate-100 dark:divide-slate-700">';
        this.data.slice().reverse().forEach(function(k) {
            html += '<tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50">';
            html += '<td class="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">' + (k.tanggal || '-') + '</td>';
            html += '<td class="px-4 py-3 text-gray-800 dark:text-white">' + Utils.escapeHtml(k.namaPasien || '-') + '</td>';
            html += '<td class="px-4 py-3 text-slate-600 dark:text-slate-300">' + Utils.escapeHtml(k.diagnosa || '-') + '</td>';
            html += '</tr>';
        });
        html += '</tbody></table></div></div>';

        container.innerHTML = html;
        if (window.lucide) lucide.createIcons();
    },

    // ===== HELPER =====
    _getDateRange: function() {
        var today = new Date();
        today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
        var todayStr = today.toISOString().split('T')[0];

        if (this.mode === 'hari_ini') {
            return { start: todayStr, end: todayStr };
        } else if (this.mode === '7_hari') {
            var d7 = new Date(today);
            d7.setDate(d7.getDate() - 6);
            return { start: d7.toISOString().split('T')[0], end: todayStr };
        } else {
            var s = document.getElementById('dd-start')?.value || todayStr;
            var e = document.getElementById('dd-end')?.value || todayStr;
            return { start: s, end: e };
        }
    },

    _card: function(icon, label, val, valClass) {
        return '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">' +
               '  <div class="flex items-center gap-2 mb-2"><i data-lucide="' + icon + '" class="w-4 h-4 text-slate-400"></i><p class="text-xs text-slate-500 dark:text-slate-400">' + label + '</p></div>' +
               '  <p class="font-bold ' + valClass + ' text-lg leading-tight">' + val + '</p>' +
               '</div>';
    }
};