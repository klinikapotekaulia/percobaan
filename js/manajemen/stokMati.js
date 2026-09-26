/**
 * js/manajemen/stokMati.js
 * Pengawasan Stok Mati (Dead Stock) & Efisiensi Obat
 * Hanya dapat diakses oleh Admin, PSA, dan Keuangan.
 */

window.AppManajemenStokMati = {
    analysisDays: 90, // Default 90 hari terakhir
    dataObat: [],
    dataTransaksi: [],
    processedObat: [], // List obat dengan hitungan penjualan, status, modal tertahan, dll
    filteredObat: [],
    filterSearch: '',
    filterStatus: 'all', // 'all', 'dead', 'slow', 'overstock', 'expired_risk'
    filterCategory: '',
    chartContainerId: 'stok-efficiency-chart',

    render: function() {
        var html = '<div class="page-enter max-w-6xl space-y-6">';

        // Header
        html += '<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">';
        html += '  <div>';
        html += '    <h2 class="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">';
        html += '      <i data-lucide="package-x" class="w-6 h-6 text-amber-500"></i> Pengawasan Stok Mati & Efisiensi Obat';
        html += '    </h2>';
        html += '    <p class="text-sm text-slate-500 dark:text-slate-400">Identifikasi obat tidak laku (slow-moving/dead stock), modal tertahan, dan optimalisasi perputaran inventaris apotek</p>';
        html += '  </div>';

        // Filter Rentang Analisis & Ekspor
        html += '  <div class="flex flex-wrap items-center gap-2">';
        html += '    <div class="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 shadow-sm">';
        html += '      <label class="text-xs font-semibold text-slate-400 dark:text-slate-500 px-1 uppercase">Rentang Deteksi:</label>';
        html += '      <select id="sm-days-select" onchange="AppManajemenStokMati.handleDaysChange(this.value)" class="text-sm font-semibold text-slate-700 dark:text-slate-200 bg-transparent outline-none cursor-pointer pr-1">';
        html += '        <option value="30">30 Hari Terakhir</option>';
        html += '        <option value="60">60 Hari Terakhir</option>';
        html += '        <option value="90" selected>90 Hari Terakhir</option>';
        html += '        <option value="180">180 Hari Terakhir</option>';
        html += '      </select>';
        html += '    </div>';

        html += '    <button onclick="AppManajemenStokMati.exportToExcel()" class="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-all shadow-sm flex items-center gap-2">';
        html += '      <i data-lucide="file-spreadsheet" class="w-4 h-4"></i> Ekspor Audit';
        html += '    </button>';
        html += '  </div>';
        html += '</div>';

        // Stats Cards Grid
        html += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="stok-stats-container">';
        html += '  <div class="bg-white dark:bg-slate-800 border rounded-xl p-4 shadow-sm animate-pulse h-20"></div>';
        html += '  <div class="bg-white dark:bg-slate-800 border rounded-xl p-4 shadow-sm animate-pulse h-20"></div>';
        html += '  <div class="bg-white dark:bg-slate-800 border rounded-xl p-4 shadow-sm animate-pulse h-20"></div>';
        html += '  <div class="bg-white dark:bg-slate-800 border rounded-xl p-4 shadow-sm animate-pulse h-20"></div>';
        html += '</div>';

        // Filter Bar & Chart Bento Grid
        html += '<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">';
        
        // Left Area: Interactive Filters
        html += '  <div class="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm space-y-4">';
        html += '    <h3 class="font-bold text-slate-800 dark:text-white flex items-center gap-2"><i data-lucide="sliders-horizontal" class="w-5 h-5 text-indigo-500"></i> Saring & Cari Obat</h3>';
        
        html += '    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">';
        // Search Input
        html += '      <div class="flex flex-col">';
        html += '        <label class="text-xs font-semibold text-slate-400 mb-1">Cari Nama / Kode</label>';
        html += '        <div class="relative">';
        html += '          <input type="text" id="sm-search" oninput="AppManajemenStokMati.handleFilterChange()" class="w-full pl-8 pr-3 py-2 border border-slate-300 dark:bg-slate-700 dark:border-slate-600 dark:text-white rounded-lg text-sm outline-none focus:border-primary-500" placeholder="Ketik nama obat...">';
        html += '          <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-2.5 top-3"></i>';
        html += '        </div>';
        html += '      </div>';

        // Category Filter
        html += '      <div class="flex flex-col">';
        html += '        <label class="text-xs font-semibold text-slate-400 mb-1">Kategori</label>';
        html += '        <select id="sm-category-filter" onchange="AppManajemenStokMati.handleFilterChange()" class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:border-slate-600 dark:text-white rounded-lg text-sm outline-none focus:border-primary-500">';
        html += '          <option value="">Semua Kategori</option>';
        html += '        </select>';
        html += '      </div>';

        // Status Filter
        html += '      <div class="flex flex-col">';
        html += '        <label class="text-xs font-semibold text-slate-400 mb-1">Status Efisiensi</label>';
        html += '        <select id="sm-status-filter" onchange="AppManajemenStokMati.handleFilterChange()" class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:border-slate-600 dark:text-white rounded-lg text-sm outline-none focus:border-primary-500">';
        html += '          <option value="all">Semua Status</option>';
        html += '          <option value="dead">Stok Mati (Dead Stock)</option>';
        html += '          <option value="slow">Perputaran Lambat (Slow Moving)</option>';
        html += '          <option value="overstock">Kelebihan Stok (Overstock)</option>';
        html += '          <option value="expired_risk">Resiko Kedaluwarsa (ED Risk)</option>';
        html += '          <option value="active">Fast Moving / Aktif</option>';
        html += '        </select>';
        html += '      </div>';
        html += '    </div>';

        html += '    <div class="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">';
        html += '      <span>Rekomendasi Cepat:</span>';
        html += '      <button onclick="AppManajemenStokMati.quickFilter(\'dead\')" class="px-2.5 py-1 rounded bg-red-50 text-red-700 border border-red-100 hover:bg-red-100 transition-colors">Lihat Stok Mati</button>';
        html += '      <button onclick="AppManajemenStokMati.quickFilter(\'overstock\')" class="px-2.5 py-1 rounded bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100 transition-colors">Lihat Overstock</button>';
        html += '      <button onclick="AppManajemenStokMati.quickFilter(\'expired_risk\')" class="px-2.5 py-1 rounded bg-orange-50 text-orange-700 border border-orange-100 hover:bg-orange-100 transition-colors">Mendekati ED</button>';
        html += '      <button onclick="AppManajemenStokMati.quickFilter(\'all\')" class="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">Reset</button>';
        html += '    </div>';
        html += '  </div>';

        // Right Area: Chart / Ratio Pie
        html += '  <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm flex flex-col">';
        html += '    <h3 class="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-2"><i data-lucide="pie-chart" class="w-5 h-5 text-indigo-500"></i> Komposisi Kesehatan Inventaris</h3>';
        html += '    <div id="' + this.chartContainerId + '" class="w-full h-40 relative flex items-center justify-center flex-1">';
        html += '      <div class="spinner"></div>';
        html += '    </div>';
        html += '  </div>';

        html += '</div>';

        // List Area
        html += '<div id="stok-list-content"><div class="flex justify-center py-20"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        var self = this;
        var role = window.currentRole || '';

        // Hanya boleh diakses oleh admin, psa, dan keuangan
        if (role !== 'admin' && role !== 'psa' && role !== 'keuangan') {
            var el = document.getElementById('stok-list-content');
            if (el) el.innerHTML = '<div class="bg-red-50 text-red-600 p-4 rounded-lg">Akses Ditolak. Halaman ini hanya untuk Admin, PSA, dan Keuangan.</div>';
            return;
        }

        self.fetchData();
    },

    handleDaysChange: function(days) {
        this.analysisDays = parseInt(days, 10);
        this.fetchData();
    },

    fetchData: function() {
        var self = this;
        var numDays = self.analysisDays;

        var today = new Date();
        var pastDate = new Date();
        pastDate.setDate(today.getDate() - numDays);
        var startStr = pastDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD

        // Query seluruh master obat dan transaksi dalam range hari terpilih
        var pObat = db.collection('obat').get();
        var pTrx = db.collection('transaksi').where('tanggal', '>=', startStr).get();

        Promise.all([pObat, pTrx]).then(function(results) {
            self.dataObat = [];
            results[0].forEach(function(doc) {
                var d = doc.data();
                d.id = doc.id;
                self.dataObat.push(d);
            });

            self.dataTransaksi = [];
            results[1].forEach(function(doc) {
                var d = doc.data();
                d.id = doc.id;
                self.dataTransaksi.push(d);
            });

            self.processInventoryEfficiency();
            self.populateCategoryFilter();
            self.applyFilter();
        }).catch(function(err) {
            console.error('[Stok Mati] Error fetching data:', err);
            var el = document.getElementById('stok-list-content');
            if (el) el.innerHTML = '<div class="bg-red-50 text-red-600 p-4 rounded-lg">Gagal memuat audit stok: ' + Utils.escapeHtml(err.message) + '</div>';
        });
    },

    processInventoryEfficiency: function() {
        var self = this;
        var salesQtyMap = {}; // Match by either ID, Name or Code

        // 1. Akumulasi penjualan obat dari transaksi
        self.dataTransaksi.forEach(function(t) {
            if (t.items && Array.isArray(t.items)) {
                t.items.forEach(function(item) {
                    var nama = (item.namaObat || item.nama || '').toLowerCase().trim();
                    var qty = parseFloat(item.jumlah) || 0;

                    salesQtyMap[nama] = (salesQtyMap[nama] || 0) + qty;
                });
            }
        });

        var today = new Date();

        // 2. Analisis efisiensi obat
        self.processedObat = self.dataObat.map(function(o) {
            var oNameLower = (o.namaObat || '').toLowerCase().trim();
            var soldQty = salesQtyMap[oNameLower] || 0;
            var currentStock = parseFloat(o.stok) || 0;
            var hpp = parseFloat(o.hpp) || 0;

            var assetValue = currentStock * hpp;

            // Klasifikasi Status Kesehatan Inventaris
            var status = 'active'; // default
            var recommendation = 'Kinerja stok stabil, pertahankan pengadaan regular.';

            // Periksa kedaluwarsa (ED Risk)
            var isEdRisk = false;
            if (o.expDate) {
                var expDateObj = new Date(o.expDate);
                var diffTime = expDateObj - today;
                var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays <= 180 && diffDays > 0) {
                    isEdRisk = true;
                }
            }

            if (currentStock === 0) {
                status = 'out_of_stock';
                recommendation = 'Stok habis. Evaluasi kebutuhan sebelum reorder.';
            } else if (soldQty === 0) {
                status = 'dead';
                if (isEdRisk) {
                    status = 'expired_risk';
                    recommendation = 'KRITIS: Stok Mati & Hampir ED! Tukar ke distributor atau buat diskon khusus.';
                } else {
                    recommendation = 'STOK MATI! Tawarkan program bundling resep atau bundling produk bebas.';
                }
            } else if (soldQty <= 5 && currentStock > 10) {
                status = 'slow';
                recommendation = 'Perputaran Lambat. Kurangi jumlah order baru berikutnya.';
            } else if (currentStock > (soldQty * 3)) {
                // Kelebihan stok (Overstock): Stok saat ini > 3x total penjualan selama periode analisis
                status = 'overstock';
                recommendation = 'OVERSTOCK! Stok melimpah dibanding penjualan. Tunda pemesanan baru.';
            }

            return {
                id: o.id,
                namaObat: o.namaObat || '-',
                kodeObat: o.kodeObat || '-',
                kategori: o.kategori || '-',
                satuan: o.satuan || 'Pcs',
                stok: currentStock,
                hpp: hpp,
                assetValue: assetValue,
                soldQty: soldQty,
                expDate: o.expDate || '',
                isEdRisk: isEdRisk,
                status: status,
                recommendation: recommendation
            };
        });
    },

    populateCategoryFilter: function() {
        var select = document.getElementById('sm-category-filter');
        if (!select) return;

        // Ambil kategori unik
        var categories = {};
        this.processedObat.forEach(function(o) {
            if (o.kategori && o.kategori !== '-') {
                categories[o.kategori] = true;
            }
        });

        // Simpan value lama
        var oldVal = select.value;

        // Render options
        var html = '<option value="">Semua Kategori</option>';
        Object.keys(categories).sort().forEach(function(cat) {
            html += '<option value="' + cat + '">' + cat + '</option>';
        });
        select.innerHTML = html;
        select.value = oldVal;
    },

    quickFilter: function(status) {
        var statusFilter = document.getElementById('sm-status-filter');
        if (statusFilter) {
            statusFilter.value = status;
            this.handleFilterChange();
        }
    },

    handleFilterChange: function() {
        var searchInput = document.getElementById('sm-search');
        var catFilter = document.getElementById('sm-category-filter');
        var statusFilter = document.getElementById('sm-status-filter');

        this.filterSearch = searchInput ? searchInput.value.toLowerCase().trim() : '';
        this.filterCategory = catFilter ? catFilter.value : '';
        this.filterStatus = statusFilter ? statusFilter.value : 'all';

        this.applyFilter();
    },

    applyFilter: function() {
        var self = this;

        self.filteredObat = self.processedObat.filter(function(o) {
            // Search filter
            if (self.filterSearch) {
                var name = o.namaObat.toLowerCase();
                var code = o.kodeObat.toLowerCase();
                if (name.indexOf(self.filterSearch) === -1 && code.indexOf(self.filterSearch) === -1) {
                    return false;
                }
            }

            // Category filter
            if (self.filterCategory && o.kategori !== self.filterCategory) {
                return false;
            }

            // Status filter
            if (self.filterStatus !== 'all') {
                if (self.filterStatus === 'dead' && o.status !== 'dead') return false;
                if (self.filterStatus === 'slow' && o.status !== 'slow') return false;
                if (self.filterStatus === 'overstock' && o.status !== 'overstock') return false;
                if (self.filterStatus === 'expired_risk' && o.status !== 'expired_risk') return false;
                if (self.filterStatus === 'active' && o.status !== 'active') return false;
            }

            return true;
        });

        self.renderStats();
        self.renderList();
        self.renderEfficiencyChart();
    },

    renderStats: function() {
        var statsContainer = document.getElementById('stok-stats-container');
        if (!statsContainer) return;

        var deadStockCount = 0;
        var deadStockCapital = 0;
        var overstockCount = 0;
        var edRiskCount = 0;

        this.processedObat.forEach(function(o) {
            if (o.status === 'dead') {
                deadStockCount++;
                deadStockCapital += o.assetValue;
            } else if (o.status === 'overstock') {
                overstockCount++;
            } else if (o.status === 'expired_risk') {
                edRiskCount++;
                deadStockCapital += o.assetValue; // ED Risk juga modal tertahan
            }
        });

        var html = '';

        // Card 1: Modal Tertahan / Capital
        html += '<div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm flex items-center gap-3">';
        html += '  <div class="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"><i data-lucide="coins" class="w-5 h-5"></i></div>';
        html += '  <div>';
        html += '    <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Modal Mati / Tertahan</span>';
        html += '    <span class="text-xl font-bold text-red-600 dark:text-red-400">' + Utils.formatRupiah(deadStockCapital) + '</span>';
        html += '  </div>';
        html += '</div>';

        // Card 2: Jumlah Obat Mati (Dead Stock)
        html += '<div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm flex items-center gap-3">';
        html += '  <div class="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"><i data-lucide="package-x" class="w-5 h-5"></i></div>';
        html += '  <div>';
        html += '    <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Item Stok Mati</span>';
        html += '    <span class="text-xl font-bold text-slate-800 dark:text-white">' + deadStockCount + ' Obat</span>';
        html += '  </div>';
        html += '</div>';

        // Card 3: Overstocked Items
        html += '<div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm flex items-center gap-3">';
        html += '  <div class="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"><i data-lucide="scale" class="w-5 h-5"></i></div>';
        html += '  <div>';
        html += '    <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Item Overstock</span>';
        html += '    <span class="text-xl font-bold text-slate-800 dark:text-white">' + overstockCount + ' Obat</span>';
        html += '  </div>';
        html += '</div>';

        // Card 4: Expiring Risks
        html += '<div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm flex items-center gap-3">';
        html += '  <div class="p-2.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400"><i data-lucide="bell" class="w-5 h-5 animate-bounce"></i></div>';
        html += '  <div>';
        html += '    <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Resiko ED (Slowing & < 180 Hari)</span>';
        html += '    <span class="text-xl font-bold text-orange-600 dark:text-orange-400">' + edRiskCount + ' Obat</span>';
        html += '  </div>';
        html += '</div>';

        statsContainer.innerHTML = html;
        if (window.lucide) lucide.createIcons({ el: statsContainer });
    },

    renderList: function() {
        var container = document.getElementById('stok-list-content');
        if (!container) return;

        if (this.filteredObat.length === 0) {
            container.innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">' +
                '<i data-lucide="package-check" class="w-12 h-12 text-emerald-500"></i>' +
                '<p class="font-semibold text-slate-500">Hasil penyaringan kosong. Tidak ada obat dengan status tersebut.</p>' +
                '</div>';
            if (window.lucide) lucide.createIcons();
            return;
        }

        var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm mt-6">';
        html += '  <div class="overflow-x-auto">';
        html += '    <table class="w-full text-sm">';
        html += '      <thead>';
        html += '        <tr class="bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">';
        html += '          <th class="px-5 py-3 text-left">Detail Obat</th>';
        html += '          <th class="px-5 py-3 text-center">Stok Saat Ini</th>';
        html += '          <th class="px-5 py-3 text-right">Modal Tertahan</th>';
        html += '          <th class="px-5 py-3 text-center">Terjual (' + this.analysisDays + ' hari)</th>';
        html += '          <th class="px-5 py-3 text-center">Status Efisiensi</th>';
        html += '          <th class="px-5 py-3 text-left">Rekomendasi Tindakan</th>';
        html += '        </tr>';
        html += '      </thead>';
        html += '      <tbody class="divide-y divide-slate-200 dark:divide-slate-700">';

        this.filteredObat.forEach(function(o) {
            var statusBadge = '';
            var badgeClass = '';

            switch(o.status) {
                case 'dead':
                    statusBadge = 'STOK MATI';
                    badgeClass = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/30';
                    break;
                case 'slow':
                    statusBadge = 'SLOW MOVING';
                    badgeClass = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
                    break;
                case 'overstock':
                    statusBadge = 'OVERSTOCK';
                    badgeClass = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/30';
                    break;
                case 'expired_risk':
                    statusBadge = 'STOK MATI + RESIKO ED';
                    badgeClass = 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900/30 animate-pulse';
                    break;
                case 'out_of_stock':
                    statusBadge = 'HABIS';
                    badgeClass = 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700';
                    break;
                default:
                    statusBadge = 'AKTIF / NORMAL';
                    badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/30';
            }

            var expInfo = o.expDate ? '<p class="text-[10px] text-slate-400 mt-0.5">ED: ' + o.expDate + '</p>' : '';

            html += '        <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors text-xs">';
            html += '          <td class="px-5 py-3.5">';
            html += '            <p class="font-bold text-slate-800 dark:text-slate-200">' + Utils.escapeHtml(o.namaObat) + '</p>';
            html += '            <p class="text-[10px] text-slate-400 font-mono mt-0.5">Kode: ' + Utils.escapeHtml(o.kodeObat) + ' | ' + Utils.escapeHtml(o.kategori) + '</p>';
            html += '          </td>';
            html += '          <td class="px-5 py-3.5 text-center font-semibold text-slate-700 dark:text-slate-300">' + o.stok + ' ' + Utils.escapeHtml(o.satuan) + '</td>';
            html += '          <td class="px-5 py-3.5 text-right font-bold text-slate-800 dark:text-slate-100">' + Utils.formatRupiah(o.assetValue) + '</td>';
            html += '          <td class="px-5 py-3.5 text-center font-bold text-slate-600 dark:text-slate-400">' + o.soldQty + '</td>';
            html += '          <td class="px-5 py-3.5 text-center">';
            html += '            <span class="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border ' + badgeClass + '">' + statusBadge + '</span>';
            html += '            ' + expInfo;
            html += '          </td>';
            html += '          <td class="px-5 py-3.5 text-slate-600 dark:text-slate-300 max-w-xs leading-relaxed font-medium">' + Utils.escapeHtml(o.recommendation) + '</td>';
            html += '        </tr>';
        });

        html += '      </tbody>';
        html += '    </table>';
        html += '  </div>';
        html += '</div>';

        container.innerHTML = html;
        if (window.lucide) lucide.createIcons({ el: container });
    },

    renderEfficiencyChart: function() {
        var self = this;
        var container = document.getElementById(self.chartContainerId);
        if (!container) return;

        if (!window.React || !window.ReactDOM || !window.Recharts) {
            container.innerHTML = '<div class="text-slate-400 text-sm py-10">Memuat pustaka...</div>';
            setTimeout(function() { self.renderEfficiencyChart(); }, 300);
            return;
        }

        try {
            var e = React.createElement;
            var _Recharts = window.Recharts;
            var ResponsiveContainer = _Recharts.ResponsiveContainer;
            var PieChart = _Recharts.PieChart;
            var Pie = _Recharts.Pie;
            var Cell = _Recharts.Cell;
            var Tooltip = _Recharts.Tooltip;

            var counts = { dead: 0, slow: 0, overstock: 0, expired_risk: 0, active: 0, out_of_stock: 0 };
            self.processedObat.forEach(function(o) {
                counts[o.status] = (counts[o.status] || 0) + 1;
            });

            var chartData = [
                { name: 'Dead Stock', value: counts.dead + counts.expired_risk, color: '#f43f5e' },
                { name: 'Slow Moving', value: counts.slow, color: '#94a3b8' },
                { name: 'Overstock', value: counts.overstock, color: '#f59e0b' },
                { name: 'Fast Moving', value: counts.active, color: '#10b981' }
            ].filter(function(d) { return d.value > 0; });

            if (chartData.length === 0) {
                container.innerHTML = '<div class="text-xs text-slate-400 py-10 text-center">Tidak cukup data kesehatan stok</div>';
                return;
            }

            function EfficiencyChartComponent() {
                return e(ResponsiveContainer, { width: '100%', height: '100%' },
                    e(PieChart, {},
                        e(Pie, {
                            data: chartData,
                            cx: '50%',
                            cy: '50%',
                            innerRadius: 35,
                            outerRadius: 55,
                            paddingAngle: 3,
                            dataKey: 'value'
                        },
                            chartData.map(function(entry, index) {
                                return e(Cell, { key: 'cell-' + index, fill: entry.color });
                            })
                        ),
                        e(Tooltip, {
                            contentStyle: { backgroundColor: '#1e293b', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '10px' }
                        })
                    )
                );
            }

            var root = ReactDOM.createRoot(container);
            root.render(e(EfficiencyChartComponent));
        } catch (err) {
            console.error('[Inventory Chart] Error:', err);
            container.innerHTML = '<div class="text-rose-500 text-[10px]">Error: ' + err.message + '</div>';
        }
    },

    exportToExcel: function() {
        var days = this.analysisDays;
        var rows = [];
        
        // Headers
        rows.push(['LAPORAN AUDIT PENGAWASAN STOK MATI (DEAD STOCK) & EFISIENSI INVENTARIS OBAT']);
        rows.push(['Rentang Deteksi:', days + ' Hari Terakhir', 'Tanggal Laporan:', new Date().toLocaleDateString('id-ID')]);
        rows.push([]);
        rows.push(['Kode Obat', 'Nama Obat', 'Kategori', 'Stok Saat Ini', 'Satuan', 'HPP (Harga Beli)', 'Nilai Modal Tertahan', 'Jumlah Terjual (' + days + ' hari)', 'Status Efisiensi', 'Rekomendasi']);

        this.processedObat.forEach(function(o) {
            var statusStr = o.status.toUpperCase().replace('_', ' ');
            rows.push([
                o.kodeObat,
                o.namaObat,
                o.kategori,
                o.stok,
                o.satuan,
                o.hpp,
                o.assetValue,
                o.soldQty,
                statusStr,
                o.recommendation
            ]);
        });

        var ws = XLSX.utils.aoa_to_sheet(rows);
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Audit Efisiensi Stok');

        XLSX.writeFile(wb, 'Audit_Stok_Mati_Efisiensi_' + days + 'Hari.xlsx');
        Utils.toast('Laporan audit stok mati berhasil diekspor!', 'success');
    },

    destroy: function() {
        // No snapshot unsubscribe needed
    }
};
