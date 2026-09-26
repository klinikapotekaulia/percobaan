/**
 * js/laporan/penjualanHarian.js
 * Laporan Penjualan Harian
 *
 * FITUR:
 * - Rekap omzet per hari dengan grafik mini (bar ASCII / text)
 * - Breakdown per tipe: Obat Bebas, Resep Klinik, Resep Luar
 * - Top 5 obat terlaris hari ini
 * - Breakdown metode pembayaran (Cash, Transfer, QRIS)
 * - Filter rentang tanggal (hari ini / 7 hari / custom)
 * - Ekspor CSV
 *
 * FIRESTORE COLLECTIONS:
 *   - transaksi { tanggal, tipe, totalAkhir, items[], metodeBayar, jasaResep }
 *
 * CARA PASANG:
 *   1. Tambahkan file ini ke daftar cache sw.js
 *   2. Tambahkan menu di app.js → menuStructure.laporan (atau keuangan):
 *        { id: 'penjualanHarian', label: 'Penjualan Harian', icon: 'trending-up', module: 'laporan/penjualanHarian' }
 *   3. Akses: bisa dibuka untuk role apotek, admin, keuangan
 */

window.AppLaporanPenjualanHarian = {

    // ===== STATE =====
    data: [],
    mode: 'hari_ini',   // 'hari_ini' | '7_hari' | 'custom'
    customStart: '',
    customEnd: '',

    // ===== RENDER =====
    render: function() {
        var today = Utils.today(); // FIX: pakai tanggal lokal, bukan UTC
        return [
            '<div class="page-enter max-w-6xl">',
            '  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">',
            '    <div>',
            '      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Laporan Penjualan Harian</h2>',
            '      <p class="text-sm text-slate-500 dark:text-slate-400">Rekap omzet, tipe transaksi, dan obat terlaris</p>',
            '    </div>',
            '    <button onclick="AppLaporanPenjualanHarian.exportCSV()" class="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition">',
            '      <i data-lucide="download" class="w-4 h-4"></i> Ekspor CSV',
            '    </button>',
            '  </div>',

            // Filter mode
            '  <div class="flex flex-wrap gap-2 mb-4">',
            '    <button onclick="AppLaporanPenjualanHarian.setMode(\'hari_ini\')" id="btn-mode-hari_ini" class="mode-btn px-4 py-2 rounded-lg text-sm font-semibold bg-primary-600 text-white transition">Hari Ini</button>',
            '    <button onclick="AppLaporanPenjualanHarian.setMode(\'7_hari\')" id="btn-mode-7_hari" class="mode-btn px-4 py-2 rounded-lg text-sm font-semibold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition">7 Hari Terakhir</button>',
            '    <button onclick="AppLaporanPenjualanHarian.setMode(\'custom\')" id="btn-mode-custom" class="mode-btn px-4 py-2 rounded-lg text-sm font-semibold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition">Custom</button>',
            '  </div>',

            // Custom date range (hidden by default)
            '  <div id="custom-range" class="hidden flex items-center gap-3 mb-4">',
            '    <input type="date" id="ph-start" value="' + today + '" class="px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm">',
            '    <span class="text-slate-400">s/d</span>',
            '    <input type="date" id="ph-end" value="' + today + '" class="px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm">',
            '    <button onclick="AppLaporanPenjualanHarian.init()" class="bg-primary-600 text-white text-sm px-4 py-1.5 rounded-lg font-medium">Tampilkan</button>',
            '  </div>',

            '  <div id="ph-content"><div class="flex justify-center py-20"><div class="spinner"></div></div></div>',
            '</div>'
        ].join('');
    },

    // ===== INIT =====
    init: function() {
        var self = this;
        var dates = this._getDateRange();
        var container = document.getElementById('ph-content');
        if (container) container.innerHTML = '<div class="flex justify-center py-20"><div class="spinner"></div></div>';

        db.collection('transaksi')
            .where('tanggal', '>=', dates.start)
            .where('tanggal', '<=', dates.end)
            .orderBy('tanggal', 'asc')
            .get()
            .then(function(snap) {
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
        // Update button styles
        ['hari_ini', '7_hari', 'custom'].forEach(function(m) {
            var btn = document.getElementById('btn-mode-' + m);
            if (!btn) return;
            if (m === mode) {
                btn.className = 'mode-btn px-4 py-2 rounded-lg text-sm font-semibold bg-primary-600 text-white transition';
            } else {
                btn.className = 'mode-btn px-4 py-2 rounded-lg text-sm font-semibold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition';
            }
        });
        var customEl = document.getElementById('custom-range');
        if (customEl) customEl.className = (mode === 'custom') ? 'flex items-center gap-3 mb-4' : 'hidden flex items-center gap-3 mb-4';
        if (mode !== 'custom') this.init();
    },

    // ===== RENDER REPORT =====
    renderReport: function(dates) {
        var container = document.getElementById('ph-content');
        if (!container) return;

        if (this.data.length === 0) {
            container.innerHTML = '<div class="text-center py-20 text-slate-400"><i data-lucide="bar-chart-2" class="w-12 h-12 mx-auto mb-3"></i><p class="font-semibold">Tidak ada transaksi di periode ini</p></div>';
            if (window.lucide) lucide.createIcons();
            return;
        }

        // ===== KALKULASI =====
        var totalOmzet = 0, totalTrx = this.data.length;
        var tipeCount  = { obat_bebas: 0, resep_klinik: 0, resep_luar: 0 };
        var tipeOmzet  = { obat_bebas: 0, resep_klinik: 0, resep_luar: 0 };
        var metodePay  = { cash: 0, transfer: 0, qris: 0, lainnya: 0 };
        var obatMap    = {};
        var harianMap  = {};  // tanggal → omzet

        this.data.forEach(function(t) {
            // FIX: field yang benar-benar ditulis oleh apotek/transaksi.js adalah
            // `totalAkhir` & `metodeBayar` (bukan `totalBayar`/`metodePembayaran`).
            // Sebelumnya laporan ini selalu baca field yang tidak pernah ada,
            // sehingga omzet selalu tampil Rp 0 dan semua transaksi dianggap cash.
            var omzet = t.totalAkhir || 0;
            totalOmzet += omzet;

            var tipe = t.tipe || 'obat_bebas';
            tipeCount[tipe] = (tipeCount[tipe] || 0) + 1;
            tipeOmzet[tipe] = (tipeOmzet[tipe] || 0) + omzet;

            var met = (t.metodeBayar || 'cash').toLowerCase();
            if (met === 'cash' || met === 'tunai') metodePay.cash += omzet;
            else if (met === 'transfer' || met === 'bca' || met === 'mandiri') metodePay.transfer += omzet;
            else if (met === 'qris') metodePay.qris += omzet;
            else metodePay.lainnya += omzet;

            // Per hari
            var tgl = t.tanggal || '';
            harianMap[tgl] = (harianMap[tgl] || 0) + omzet;

            // Per obat (top 5)
            if (t.items && Array.isArray(t.items)) {
                t.items.forEach(function(item) {
                    var nama = item.namaObat || item.nama || '-';
                    if (!obatMap[nama]) obatMap[nama] = { qty: 0, omzet: 0 };
                    obatMap[nama].qty   += (item.jumlah || 0);
                    obatMap[nama].omzet += (item.jumlah || 0) * (item.hargaJual || 0);
                });
            }
        });

        var avgTrx = totalTrx > 0 ? (totalOmzet / totalTrx) : 0;

        // ===== RENDER =====
        var html = '';

        // 1. Summary cards
        html += '<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">';
        html += this._card('trending-up', 'Total Omzet', Utils.formatRupiah(totalOmzet), 'text-primary-600 dark:text-primary-400');
        html += this._card('shopping-cart', 'Jumlah Transaksi', totalTrx + ' trx', 'text-emerald-600 dark:text-emerald-400');
        html += this._card('calculator', 'Rata-rata/Trx', Utils.formatRupiah(Math.round(avgTrx)), 'text-violet-600 dark:text-violet-400');
        var topHari = Object.entries(harianMap).sort(function(a, b) { return b[1] - a[1]; })[0];
        html += this._card('star', 'Hari Terbaik', topHari ? (topHari[0] + ' (' + Utils.formatRupiah(topHari[1]) + ')') : '-', 'text-amber-600 dark:text-amber-400');
        html += '</div>';

        // 2. Grid: Tipe transaksi + Metode bayar
        html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">';

        // Tipe transaksi
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">';
        html += '<h3 class="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><i data-lucide="pie-chart" class="w-4 h-4 text-primary-500"></i> Breakdown Tipe Transaksi</h3>';
        var tipeLabels = { obat_bebas: 'Obat Bebas', resep_klinik: 'Resep Klinik', resep_luar: 'Resep Luar' };
        var tipeColors = { obat_bebas: 'bg-primary-500', resep_klinik: 'bg-emerald-500', resep_luar: 'bg-violet-500' };
        Object.keys(tipeLabels).forEach(function(k) {
            var pct = totalOmzet > 0 ? Math.round((tipeOmzet[k] || 0) / totalOmzet * 100) : 0;
            html += '<div class="mb-3">';
            html += '  <div class="flex justify-between text-sm mb-1"><span class="text-slate-600 dark:text-slate-300">' + tipeLabels[k] + ' <span class="text-slate-400">(' + (tipeCount[k] || 0) + ' trx)</span></span><span class="font-medium text-gray-800 dark:text-white">' + pct + '%</span></div>';
            html += '  <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2"><div class="' + tipeColors[k] + ' h-2 rounded-full" style="width:' + pct + '%"></div></div>';
            html += '  <p class="text-xs text-slate-400 mt-0.5">' + Utils.formatRupiah(tipeOmzet[k] || 0) + '</p>';
            html += '</div>';
        });
        html += '</div>';

        // Metode pembayaran
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">';
        html += '<h3 class="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><i data-lucide="credit-card" class="w-4 h-4 text-emerald-500"></i> Metode Pembayaran</h3>';
        var metLabels = { cash: 'Cash / Tunai', transfer: 'Transfer Bank', qris: 'QRIS', lainnya: 'Lainnya' };
        var metColors = { cash: 'bg-emerald-500', transfer: 'bg-blue-500', qris: 'bg-violet-500', lainnya: 'bg-slate-400' };
        Object.keys(metLabels).forEach(function(k) {
            if (!metodePay[k]) return;
            var pct = totalOmzet > 0 ? Math.round(metodePay[k] / totalOmzet * 100) : 0;
            html += '<div class="mb-3">';
            html += '  <div class="flex justify-between text-sm mb-1"><span class="text-slate-600 dark:text-slate-300">' + metLabels[k] + '</span><span class="font-medium text-gray-800 dark:text-white">' + pct + '%</span></div>';
            html += '  <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2"><div class="' + metColors[k] + ' h-2 rounded-full" style="width:' + pct + '%"></div></div>';
            html += '  <p class="text-xs text-slate-400 mt-0.5">' + Utils.formatRupiah(metodePay[k]) + '</p>';
            html += '</div>';
        });
        html += '</div>';
        html += '</div>'; // end grid

        // 3. Tren harian (jika > 1 hari)
        var harianKeys = Object.keys(harianMap).sort();
        if (harianKeys.length > 1) {
            var maxVal = Math.max.apply(null, harianKeys.map(function(k) { return harianMap[k]; }));
            html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6">';
            html += '<h3 class="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><i data-lucide="bar-chart-2" class="w-4 h-4 text-primary-500"></i> Tren Omzet Harian</h3>';
            html += '<div class="overflow-x-auto"><div class="flex items-end gap-1 min-w-0" style="height:120px">';
            harianKeys.forEach(function(tgl) {
                var val = harianMap[tgl];
                var heightPct = maxVal > 0 ? Math.max(4, Math.round(val / maxVal * 100)) : 4;
                var shortTgl  = tgl.slice(5); // MM-DD
                html += '<div class="flex flex-col items-center flex-1 min-w-0" title="' + tgl + ': ' + Utils.formatRupiah(val) + '">';
                html += '  <div class="w-full bg-primary-500 hover:bg-primary-600 rounded-t cursor-pointer transition-colors" style="height:' + heightPct + '%;min-height:4px"></div>';
                html += '  <p class="text-[9px] text-slate-400 mt-1 truncate w-full text-center">' + shortTgl + '</p>';
                html += '</div>';
            });
            html += '</div></div></div>';
        }

        // 4. Top 5 obat
        var top5 = Object.entries(obatMap).sort(function(a, b) { return b[1].omzet - a[1].omzet; }).slice(0, 5);
        if (top5.length > 0) {
            html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6">';
            html += '<h3 class="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><i data-lucide="trophy" class="w-4 h-4 text-amber-500"></i> Top 5 Obat Terlaris</h3>';
            html += '<div class="space-y-3">';
            top5.forEach(function(entry, idx) {
                var nama = entry[0], stat = entry[1];
                var pct  = obatMap[top5[0][0]].omzet > 0 ? Math.round(stat.omzet / obatMap[top5[0][0]].omzet * 100) : 0;
                var medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][idx];
                html += '<div class="flex items-center gap-3">';
                html += '  <span class="text-lg w-6 text-center">' + medal + '</span>';
                html += '  <div class="flex-1 min-w-0">';
                html += '    <div class="flex justify-between text-sm mb-1"><span class="font-medium text-gray-800 dark:text-white truncate">' + Utils.escapeHtml(nama) + '</span><span class="text-slate-400 text-xs ml-2 whitespace-nowrap">' + stat.qty + ' pcs · ' + Utils.formatRupiah(stat.omzet) + '</span></div>';
                html += '    <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5"><div class="bg-amber-400 h-1.5 rounded-full" style="width:' + pct + '%"></div></div>';
                html += '  </div>';
                html += '</div>';
            });
            html += '</div></div>';
        }

        // 5. Tabel detail transaksi
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
        html += '<div class="px-5 py-4 border-b border-slate-100 dark:border-slate-700"><h3 class="font-semibold text-gray-800 dark:text-white">Detail Transaksi (' + totalTrx + ')</h3></div>';
        html += '<div class="overflow-x-auto"><table class="w-full text-sm">';
        html += '<thead class="bg-slate-50 dark:bg-slate-700 text-xs uppercase text-slate-500 dark:text-slate-400"><tr>';
        html += '<th class="px-4 py-3 text-left">Tanggal</th><th class="px-4 py-3 text-left">Tipe</th><th class="px-4 py-3 text-left">Pasien / Keterangan</th><th class="px-4 py-3 text-center">Metode</th><th class="px-4 py-3 text-right">Total</th>';
        html += '</tr></thead><tbody class="divide-y divide-slate-100 dark:divide-slate-700">';

        var tipeLabel2 = { obat_bebas: 'Obat Bebas', resep_klinik: 'Resep Klinik', resep_luar: 'Resep Luar' };
        this.data.slice().reverse().forEach(function(t) {
            html += '<tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50">';
            html += '<td class="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">' + (t.tanggal || '-') + '</td>';
            html += '<td class="px-4 py-3"><span class="text-xs bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-400 px-2 py-0.5 rounded-full">' + (tipeLabel2[t.tipe] || t.tipe || '-') + '</span></td>';
            html += '<td class="px-4 py-3 text-gray-800 dark:text-white">' + Utils.escapeHtml(t.namaPasien || t.namaResep || t.keterangan || '-') + '</td>';
            html += '<td class="px-4 py-3 text-center capitalize text-slate-600 dark:text-slate-300">' + Utils.escapeHtml(t.metodeBayar || 'cash') + '</td>';
            html += '<td class="px-4 py-3 text-right font-semibold text-gray-800 dark:text-white">' + Utils.formatRupiah(t.totalAkhir || 0) + '</td>';
            html += '</tr>';
        });

        html += '</tbody></table></div></div>';
        container.innerHTML = html;
        if (window.lucide) lucide.createIcons();
    },

    // ===== EKSPOR CSV =====
    exportCSV: function() {
        if (this.data.length === 0) return Utils.toast('Tidak ada data untuk diekspor', 'error');

        var tipeLabel = { obat_bebas: 'Obat Bebas', resep_klinik: 'Resep Klinik', resep_luar: 'Resep Luar' };
        var rows = [['Tanggal', 'Tipe Transaksi', 'Pasien/Keterangan', 'Metode Pembayaran', 'Total (Rp)']];
        this.data.forEach(function(t) {
            rows.push([
                t.tanggal || '',
                tipeLabel[t.tipe] || t.tipe || '',
                t.namaPasien || t.namaResep || t.keterangan || '',
                t.metodeBayar || 'cash',
                (t.totalAkhir || 0).toString()
            ]);
        });
        // Footer total
        var total = this.data.reduce(function(s, t) { return s + (t.totalAkhir || 0); }, 0);
        rows.push(['', '', '', 'TOTAL', total.toString()]);

        var csv = rows.map(function(r) { return r.map(function(c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
        var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }); // BOM untuk Excel
        var url  = URL.createObjectURL(blob);
        var a    = document.createElement('a');
        var dates = this._getDateRange();
        a.href = url;
        a.download = 'penjualan-' + dates.start + '_sd_' + dates.end + '.csv';
        a.click();
        URL.revokeObjectURL(url);
        Utils.toast('CSV berhasil diunduh!', 'success');
    },

    // ===== HELPER =====
    _getDateRange: function() {
        var today = new Date();
        // FIX: gunakan tanggal lokal (WIB)
        today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
        var todayStr = today.toISOString().split('T')[0];

        if (this.mode === 'hari_ini') {
            return { start: todayStr, end: todayStr };
        } else if (this.mode === '7_hari') {
            var d7 = new Date(today);
            d7.setDate(d7.getDate() - 6);
            return { start: d7.toISOString().split('T')[0], end: todayStr };
        } else {
            var s = document.getElementById('ph-start')?.value || todayStr;
            var e = document.getElementById('ph-end')?.value || todayStr;
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
