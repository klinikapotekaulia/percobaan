/**
 * js/manajemen/trenFinansial.js
 * Analisis Tren Pertumbuhan Finansial Multi-Periode (YoY & MoM)
 * Hanya dapat diakses oleh Admin, PSA, dan Keuangan.
 */

window.AppManajemenTrenFinansial = {
    selectedYear: null,
    dataTransaksi: [],
    dataKasKeluar: [],
    dataPendapatanLain: [], // INTEGRASI: pendapatan non-operasional dari modul Pendapatan Lain
    processedData: {}, // Year -> Month (1-12) -> { omzet, hpp, beban, laba }
    chartContainerId: 'tren-financial-chart',

    render: function() {
        var defaultYear = new Date().getFullYear();
        this.selectedYear = this.selectedYear || defaultYear;

        var html = '<div class="page-enter max-w-6xl space-y-6">';
        
        // Header
        html += '<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">';
        html += '  <div>';
        html += '    <h2 class="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">';
        html += '      <i data-lucide="line-chart" class="w-6 h-6 text-primary-500"></i> Analisis Tren Pertumbuhan Finansial';
        html += '    </h2>';
        html += '    <p class="text-sm text-slate-500 dark:text-slate-400">Analisis perbandingan Year-over-Year (YoY) dan Month-over-Month (MoM) omzet, beban, dan margin bersih apotek & klinik</p>';
        html += '  </div>';
        
        // Filter Tahun & Ekspor
        html += '  <div class="flex flex-wrap items-center gap-2">';
        html += '    <div class="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 shadow-sm">';
        html += '      <label class="text-xs font-semibold text-slate-400 dark:text-slate-500 px-1 uppercase">Tahun:</label>';
        html += '      <select id="tf-year-select" onchange="AppManajemenTrenFinansial.handleYearChange(this.value)" class="text-sm font-semibold text-slate-700 dark:text-slate-200 bg-transparent outline-none cursor-pointer pr-1">';
        
        var currentYear = new Date().getFullYear();
        for (var y = currentYear; y >= currentYear - 3; y--) {
            var selectedAttr = (y === this.selectedYear) ? 'selected' : '';
            html += '        <option value="' + y + '" ' + selectedAttr + '>' + y + '</option>';
        }
        
        html += '      </select>';
        html += '    </div>';
        
        html += '    <button onclick="AppManajemenTrenFinansial.exportToExcel()" class="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-all shadow-sm flex items-center gap-2">';
        html += '      <i data-lucide="file-spreadsheet" class="w-4 h-4"></i> Ekspor Laporan';
        html += '    </button>';
        html += '  </div>';
        html += '</div>';

        // Main content area
        html += '<div id="tren-main-content">';
        html += '  <div class="flex justify-center py-20"><div class="spinner"></div></div>';
        html += '</div>';

        html += '</div>';
        return html;
    },

    init: function() {
        var self = this;
        var role = window.currentRole || '';
        
        // Hanya boleh diakses oleh admin, psa, dan keuangan
        if (role !== 'admin' && role !== 'psa' && role !== 'keuangan') {
            var el = document.getElementById('tren-main-content');
            if (el) el.innerHTML = '<div class="bg-red-50 text-red-600 p-4 rounded-lg">Akses Ditolak. Halaman ini hanya untuk Admin, PSA, dan Keuangan.</div>';
            return;
        }

        self.fetchData();
    },

    handleYearChange: function(year) {
        this.selectedYear = parseInt(year, 10);
        this.fetchData();
    },

    fetchData: function() {
        var self = this;
        var targetYear = self.selectedYear;
        var prevYear = targetYear - 1;

        // Load data dari targetYear dan prevYear
        var startDate = prevYear + '-01-01';
        var endDate = targetYear + '-12-31';

        var pTrx = db.collection('transaksi').where('tanggal', '>=', startDate).where('tanggal', '<=', endDate).get();
        var pKasKeluar = db.collection('kasKeluar').where('tanggal', '>=', startDate).where('tanggal', '<=', endDate).get();
        // INTEGRASI: pendapatan non-operasional (modul Pendapatan Lain - sewa, bunga bank, komisi, dll)
        var pPendapatanLain = db.collection('pendapatanLain').where('tanggal', '>=', startDate).where('tanggal', '<=', endDate).get();

        Promise.all([pTrx, pKasKeluar, pPendapatanLain]).then(function(results) {
            self.dataTransaksi = [];
            results[0].forEach(function(doc) {
                var d = doc.data();
                d.id = doc.id;
                self.dataTransaksi.push(d);
            });

            self.dataKasKeluar = [];
            results[1].forEach(function(doc) {
                var d = doc.data();
                d.id = doc.id;
                if (d.status === 'approved') {
                    self.dataKasKeluar.push(d);
                }
            });

            // INTEGRASI: pendapatan non-operasional per bulan
            self.dataPendapatanLain = [];
            results[2].forEach(function(doc) {
                var d = doc.data();
                d.id = doc.id;
                self.dataPendapatanLain.push(d);
            });

            self.processFinancialData();
            self.renderDashboard();
        }).catch(function(err) {
            console.error('[Financial Trend] Error loading data:', err);
            var el = document.getElementById('tren-main-content');
            if (el) el.innerHTML = '<div class="bg-red-50 text-red-600 p-4 rounded-lg">Gagal memuat analisis tren finansial: ' + Utils.escapeHtml(err.message) + '</div>';
        });
    },

    processFinancialData: function() {
        var self = this;
        var targetYear = self.selectedYear;
        var prevYear = targetYear - 1;

        self.processedData = {};
        self.processedData[targetYear] = self.initYearMonths();
        self.processedData[prevYear] = self.initYearMonths();

        // 1. Process Transaksi (Omzet & HPP)
        self.dataTransaksi.forEach(function(t) {
            var tgl = t.tanggal || '';
            var yr = parseInt(tgl.substring(0, 4), 10);
            var mt = parseInt(tgl.substring(5, 7), 10);

            if (self.processedData[yr] && self.processedData[yr][mt]) {
                var omzet = t.totalAkhir || 0;
                var hpp = t.items ? t.items.reduce(function(sum, i) {
                    return sum + ((i.jumlah || 0) * (i.hargaBeli || i.hpp || 0));
                }, 0) : 0;

                self.processedData[yr][mt].omzet += omzet;
                self.processedData[yr][mt].hpp += hpp;
            }
        });

        // 2. Process Kas Keluar (Operational Expenses)
        self.dataKasKeluar.forEach(function(k) {
            var tgl = k.tanggal || '';
            var yr = parseInt(tgl.substring(0, 4), 10);
            var mt = parseInt(tgl.substring(5, 7), 10);

            if (self.processedData[yr] && self.processedData[yr][mt]) {
                self.processedData[yr][mt].beban += (k.jumlah || 0);
            }
        });

        // 3. INTEGRASI: Process Pendapatan Lain (Non-Operasional - sewa, bunga bank, komisi, dll)
        self.dataPendapatanLain.forEach(function(p) {
            var tgl = p.tanggal || '';
            var yr = parseInt(tgl.substring(0, 4), 10);
            var mt = parseInt(tgl.substring(5, 7), 10);

            if (self.processedData[yr] && self.processedData[yr][mt]) {
                self.processedData[yr][mt].pendapatanLain += (p.jumlah || 0);
            }
        });

        // 4. Hitung Laba Bersih untuk setiap bulan
        [prevYear, targetYear].forEach(function(yr) {
            for (var m = 1; m <= 12; m++) {
                var item = self.processedData[yr][m];
                item.laba = item.omzet + item.pendapatanLain - item.hpp - item.beban;
            }
        });
    },

    initYearMonths: function() {
        var months = {};
        for (var m = 1; m <= 12; m++) {
            months[m] = { omzet: 0, hpp: 0, beban: 0, pendapatanLain: 0, laba: 0 };
        }
        return months;
    },

    calcPercentageChange: function(curr, prev) {
        if (!prev || prev <= 0) {
            return curr > 0 ? 100 : 0;
        }
        return ((curr - prev) / prev) * 100;
    },

    renderDashboard: function() {
        var container = document.getElementById('tren-main-content');
        if (!container) return;

        var targetYear = this.selectedYear;
        var prevYear = targetYear - 1;

        // Hitung akumulasi tahunan
        var totalOmzetTY = 0, totalOmzetLY = 0;
        var totalBebanTY = 0, totalBebanLY = 0;
        var totalLabaTY = 0, totalLabaLY = 0;

        for (var m = 1; m <= 12; m++) {
            totalOmzetTY += this.processedData[targetYear][m].omzet;
            totalOmzetLY += this.processedData[prevYear][m].omzet;

            totalBebanTY += this.processedData[targetYear][m].beban;
            totalBebanLY += this.processedData[prevYear][m].beban;

            totalLabaTY += this.processedData[targetYear][m].laba;
            totalLabaLY += this.processedData[prevYear][m].laba;
        }

        var yoyOmzetPct = this.calcPercentageChange(totalOmzetTY, totalOmzetLY);
        var yoyBebanPct = this.calcPercentageChange(totalBebanTY, totalBebanLY);
        var yoyLabaPct = this.calcPercentageChange(totalLabaTY, totalLabaLY);

        var marginTY = totalOmzetTY > 0 ? ((totalLabaTY / totalOmzetTY) * 100).toFixed(1) : '0';
        var marginLY = totalOmzetLY > 0 ? ((totalLabaLY / totalOmzetLY) * 100).toFixed(1) : '0';
        var marginDiff = (parseFloat(marginTY) - parseFloat(marginLY)).toFixed(1);

        var html = '';

        // KPI Summary Bento Cards
        html += '<div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">';
        
        // Card 1: Omzet Tahunan
        html += '  <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">';
        html += '    <div class="flex items-start justify-between mb-3">';
        html += '      <div>';
        html += '        <span class="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total Omzet (' + targetYear + ')</span>';
        html += '        <span class="text-2xl font-black text-slate-800 dark:text-white mt-1 block">' + Utils.formatRupiah(totalOmzetTY) + '</span>';
        html += '      </div>';
        html += '      <div class="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"><i data-lucide="trending-up" class="w-5 h-5"></i></div>';
        html += '    </div>';
        html += '    <div class="flex items-center gap-1.5 border-t border-slate-50 dark:border-slate-700/50 pt-3 mt-1 text-xs">';
        if (yoyOmzetPct >= 0) {
            html += '      <span class="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded">';
            html += '        <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i> +' + yoyOmzetPct.toFixed(1) + '%';
            html += '      </span>';
        } else {
            html += '      <span class="inline-flex items-center gap-0.5 text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded">';
            html += '        <i data-lucide="arrow-down-right" class="w-3.5 h-3.5"></i> ' + yoyOmzetPct.toFixed(1) + '%';
            html += '      </span>';
        }
        html += '      <span class="text-slate-400">vs tahun lalu (' + Utils.formatRupiah(totalOmzetLY) + ')</span>';
        html += '    </div>';
        html += '  </div>';

        // Card 2: Laba Bersih Tahunan
        html += '  <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">';
        html += '    <div class="flex items-start justify-between mb-3">';
        html += '      <div>';
        html += '        <span class="text-xs text-slate-400 font-bold uppercase tracking-wider block">Laba Bersih (' + targetYear + ')</span>';
        html += '        <span class="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">' + Utils.formatRupiah(totalLabaTY) + '</span>';
        html += '      </div>';
        html += '      <div class="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"><i data-lucide="award" class="w-5 h-5"></i></div>';
        html += '    </div>';
        html += '    <div class="flex items-center gap-1.5 border-t border-slate-50 dark:border-slate-700/50 pt-3 mt-1 text-xs">';
        if (yoyLabaPct >= 0) {
            html += '      <span class="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded">';
            html += '        <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i> +' + yoyLabaPct.toFixed(1) + '%';
            html += '      </span>';
        } else {
            html += '      <span class="inline-flex items-center gap-0.5 text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded">';
            html += '        <i data-lucide="arrow-down-right" class="w-3.5 h-3.5"></i> ' + yoyLabaPct.toFixed(1) + '%';
            html += '      </span>';
        }
        html += '      <span class="text-slate-400">vs tahun lalu (' + Utils.formatRupiah(totalLabaLY) + ')</span>';
        html += '    </div>';
        html += '  </div>';

        // Card 3: Rata-Rata Margin Bersih
        html += '  <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">';
        html += '    <div class="flex items-start justify-between mb-3">';
        html += '      <div>';
        html += '        <span class="text-xs text-slate-400 font-bold uppercase tracking-wider block">NPM / Margin Bersih</span>';
        html += '        <span class="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 block">' + marginTY + '%</span>';
        html += '      </div>';
        html += '      <div class="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"><i data-lucide="gauge" class="w-5 h-5"></i></div>';
        html += '    </div>';
        html += '    <div class="flex items-center gap-1.5 border-t border-slate-50 dark:border-slate-700/50 pt-3 mt-1 text-xs">';
        if (parseFloat(marginDiff) >= 0) {
            html += '      <span class="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded">';
            html += '        <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i> +' + marginDiff + ' pp';
            html += '      </span>';
        } else {
            html += '      <span class="inline-flex items-center gap-0.5 text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded">';
            html += '        <i data-lucide="arrow-down-right" class="w-3.5 h-3.5"></i> ' + marginDiff + ' pp';
            html += '      </span>';
        }
        html += '      <span class="text-slate-400">vs tahun lalu (' + marginLY + '%)</span>';
        html += '    </div>';
        html += '  </div>';
        html += '</div>';

        // Chart Card Section
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm mb-6">';
        html += '  <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3 mb-4">';
        html += '    <div>';
        html += '      <h3 class="font-bold text-slate-800 dark:text-white flex items-center gap-2"><i data-lucide="bar-chart-3" class="w-5 h-5 text-primary-500"></i> Grafik Pertumbuhan Omzet Bulanan (YoY)</h3>';
        html += '      <p class="text-xs text-slate-500 dark:text-slate-400">Membandingkan kinerja omzet bulan demi bulan antara tahun ' + targetYear + ' dan tahun ' + prevYear + '</p>';
        html += '    </div>';
        html += '  </div>';
        html += '  <div id="' + this.chartContainerId + '" class="w-full h-80 relative flex items-center justify-center">';
        html += '    <div class="spinner"></div>';
        html += '  </div>';
        html += '</div>';

        // Performance Details Grid Table
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">';
        html += '  <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/10">';
        html += '    <h3 class="font-bold text-slate-800 dark:text-white flex items-center gap-2"><i data-lucide="table" class="w-5 h-5 text-primary-500"></i> Tabel Detil Pertumbuhan MoM & YoY</h3>';
        html += '    <p class="text-xs text-slate-500 dark:text-slate-400">Analisis lengkap pertumbuhan penjualan bulanan, rasio biaya operasional, dan profitabilitas netto</p>';
        html += '  </div>';
        html += '  <div class="overflow-x-auto">';
        html += '    <table class="w-full text-sm border-collapse">';
        html += '      <thead>';
        html += '        <tr class="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">';
        html += '          <th class="px-4 py-3 text-left">Bulan</th>';
        html += '          <th class="px-4 py-3 text-right">Omzet (' + targetYear + ')</th>';
        html += '          <th class="px-4 py-3 text-center">Pertumbuhan MoM</th>';
        html += '          <th class="px-4 py-3 text-center">Pertumbuhan YoY</th>';
        html += '          <th class="px-4 py-3 text-right">Beban Operasional</th>';
        html += '          <th class="px-4 py-3 text-right">Laba Bersih</th>';
        html += '          <th class="px-4 py-3 text-center">Margin Bersih</th>';
        html += '        </tr>';
        html += '      </thead>';
        html += '      <tbody class="divide-y divide-slate-200 dark:divide-slate-700">';

        var monthsNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        for (var m = 1; m <= 12; m++) {
            var currMonthData = this.processedData[targetYear][m];
            var prevYearMonthData = this.processedData[prevYear][m];
            
            // Hitung MoM
            var prevMonthVal = 0;
            if (m === 1) {
                // Preceding month of Jan TY is Dec LY
                prevMonthVal = this.processedData[prevYear][12].omzet;
            } else {
                prevMonthVal = this.processedData[targetYear][m - 1].omzet;
            }

            var momPct = this.calcPercentageChange(currMonthData.omzet, prevMonthVal);
            var yoyPct = this.calcPercentageChange(currMonthData.omzet, prevYearMonthData.omzet);
            var marginPct = currMonthData.omzet > 0 ? ((currMonthData.laba / currMonthData.omzet) * 100).toFixed(1) : '0.0';

            html += '        <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">';
            html += '          <td class="px-4 py-3.5 font-semibold text-slate-800 dark:text-slate-200">' + monthsNames[m - 1] + '</td>';
            html += '          <td class="px-4 py-3.5 text-right font-bold text-slate-800 dark:text-slate-100">' + Utils.formatRupiah(currMonthData.omzet) + '</td>';
            
            // MoM Badge
            html += '          <td class="px-4 py-3.5 text-center">';
            if (currMonthData.omzet === 0 && prevMonthVal === 0) {
                html += '            <span class="text-xs text-slate-400 font-medium">-</span>';
            } else if (momPct >= 0) {
                html += '            <span class="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full"><i data-lucide="arrow-up-right" class="w-3 h-3"></i> +' + momPct.toFixed(1) + '%</span>';
            } else {
                html += '            <span class="inline-flex items-center gap-0.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded-full"><i data-lucide="arrow-down-right" class="w-3 h-3"></i> ' + momPct.toFixed(1) + '%</span>';
            }
            html += '          </td>';

            // YoY Badge
            html += '          <td class="px-4 py-3.5 text-center">';
            if (currMonthData.omzet === 0 && prevYearMonthData.omzet === 0) {
                html += '            <span class="text-xs text-slate-400 font-medium">-</span>';
            } else if (yoyPct >= 0) {
                html += '            <span class="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full"><i data-lucide="arrow-up-right" class="w-3 h-3"></i> +' + yoyPct.toFixed(1) + '%</span>';
            } else {
                html += '            <span class="inline-flex items-center gap-0.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded-full"><i data-lucide="arrow-down-right" class="w-3 h-3"></i> ' + yoyPct.toFixed(1) + '%</span>';
            }
            html += '          </td>';

            html += '          <td class="px-4 py-3.5 text-right text-slate-500 font-medium">' + Utils.formatRupiah(currMonthData.beban) + '</td>';
            
            var profitColor = currMonthData.laba >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
            html += '          <td class="px-4 py-3.5 text-right font-bold ' + profitColor + '">' + Utils.formatRupiah(currMonthData.laba) + '</td>';
            html += '          <td class="px-4 py-3.5 text-center font-bold text-indigo-600 dark:text-indigo-400">' + marginPct + '%</td>';
            html += '        </tr>';
        }

        html += '      </tbody>';
        html += '    </table>';
        html += '  </div>';
        html += '</div>';

        container.innerHTML = html;
        if (window.lucide) lucide.createIcons({ el: container });

        // Render the chart
        this.renderGrowthChart();
    },

    renderGrowthChart: function() {
        var self = this;
        var container = document.getElementById(self.chartContainerId);
        if (!container) return;

        if (!window.React || !window.ReactDOM || !window.Recharts) {
            container.innerHTML = '<div class="text-slate-400 text-sm">Memuat pustaka grafik...</div>';
            setTimeout(function() { self.renderGrowthChart(); }, 300);
            return;
        }

        try {
            var e = React.createElement;
            var _Recharts = window.Recharts;
            var ResponsiveContainer = _Recharts.ResponsiveContainer;
            var BarChart = _Recharts.BarChart;
            var Bar = _Recharts.Bar;
            var XAxis = _Recharts.XAxis;
            var YAxis = _Recharts.YAxis;
            var Tooltip = _Recharts.Tooltip;
            var Legend = _Recharts.Legend;
            var CartesianGrid = _Recharts.CartesianGrid;

            // Buat array data untuk Recharts
            var monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            var chartData = [];
            
            var targetYear = self.selectedYear;
            var prevYear = targetYear - 1;

            for (var m = 1; m <= 12; m++) {
                chartData.push({
                    name: monthsShort[m - 1],
                    'Tahun Lalu': self.processedData[prevYear][m].omzet,
                    'Tahun Ini': self.processedData[targetYear][m].omzet
                });
            }

            function TrendChartComponent() {
                return e(ResponsiveContainer, { width: '100%', height: '100%' },
                    e(BarChart, { data: chartData, margin: { top: 10, right: 10, left: -5, bottom: 0 } },
                        e(CartesianGrid, { strokeDasharray: '3 3', className: 'stroke-slate-200 dark:stroke-slate-700/50' }),
                        e(XAxis, { dataKey: 'name', style: { fontSize: '11px', fill: '#94a3b8', fontWeight: '500' } }),
                        e(YAxis, {
                            tickFormatter: function(v) {
                                if (v >= 1000000) return 'Rp' + (v / 1000000).toFixed(1) + 'jt';
                                if (v >= 1000) return 'Rp' + (v / 1000).toFixed(0) + 'rb';
                                return 'Rp' + v;
                            },
                            style: { fontSize: '11px', fill: '#94a3b8', fontWeight: '500' }
                        }),
                        e(Tooltip, {
                            formatter: function(value, name) {
                                return ['Rp ' + value.toLocaleString('id-ID'), name];
                            },
                            contentStyle: { backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }
                        }),
                        e(Legend, { wrapperStyle: { fontSize: '11px', fontWeight: '600', paddingTop: '10px' } }),
                        e(Bar, { dataKey: 'Tahun Lalu', name: 'Omzet ' + prevYear, fill: '#94a3b8', radius: [4, 4, 0, 0] }),
                        e(Bar, { dataKey: 'Tahun Ini', name: 'Omzet ' + targetYear, fill: '#3b82f6', radius: [4, 4, 0, 0] })
                    )
                );
            }

            var root = ReactDOM.createRoot(container);
            root.render(e(TrendChartComponent));
        } catch (err) {
            console.error('[Financial Trend] Chart render error:', err);
            container.innerHTML = '<div class="text-rose-500 text-sm">Gagal memuat grafik: ' + err.message + '</div>';
        }
    },

    exportToExcel: function() {
        var targetYear = this.selectedYear;
        var prevYear = targetYear - 1;
        var monthsNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

        var rows = [];
        // Header
        rows.push(['LAPORAN ANALISIS TREN PERTUMBUHAN FINANSIAL MULTI-PERIODE']);
        rows.push(['Tahun Analisis:', targetYear, 'Tahun Pembanding:', prevYear]);
        rows.push([]);
        rows.push(['Bulan', 'Omzet (' + targetYear + ')', 'Omzet (' + prevYear + ')', 'Pertumbuhan YoY (%)', 'HPP (' + targetYear + ')', 'Beban Operasional (' + targetYear + ')', 'Pendapatan Lain (' + targetYear + ')', 'Laba Bersih (' + targetYear + ')', 'NPM (%)']);

        for (var m = 1; m <= 12; m++) {
            var curr = this.processedData[targetYear][m];
            var prev = this.processedData[prevYear][m];

            var yoy = this.calcPercentageChange(curr.omzet, prev.omzet);
            var npm = curr.omzet > 0 ? (curr.laba / curr.omzet) * 100 : 0;

            rows.push([
                monthsNames[m - 1],
                curr.omzet,
                prev.omzet,
                yoy.toFixed(2) + '%',
                curr.hpp,
                curr.beban,
                curr.pendapatanLain || 0,
                curr.laba,
                npm.toFixed(2) + '%'
            ]);
        }

        // Create workbook
        var ws = XLSX.utils.aoa_to_sheet(rows);
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Tren Finansial');

        // Export
        XLSX.writeFile(wb, 'Laporan_Tren_Finansial_' + targetYear + '.xlsx');
        Utils.toast('Laporan tren finansial berhasil diekspor!', 'success');
    },

    destroy: function() {
        // No snapshot unsubscribe needed
    }
};