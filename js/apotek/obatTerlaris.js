/**
 * js/apotek/obatTerlaris.js
 * Ringkasan Obat Terlaris & Analisis Pergerakan Stok (Laku s/d Tidak Laku)
 * Memungkinkan Keuangan, PSA, Admin, dan Apotek menganalisis obat mana yang paling laku,
 * sedang, lambat, hingga tidak laku (0 penjualan) berdasarkan rentang waktu yang dipilih.
 */

window.AppApotekObatTerlaris = {
    dataMaster: [],
    transactions: [],
    processedList: [],
    categorySummary: [],
    
    // Filters & States
    modeDate: 'bulan_ini', // 'hari_ini', '7_hari', '30_hari', 'bulan_ini', 'tahun_ini', 'custom'
    startDate: '',
    endDate: '',
    selectedCategory: 'semua',
    selectedStatus: 'semua', // 'semua', 'paling_laku', 'laku', 'tidak_laku'
    sortBy: 'qty_desc', // 'qty_desc', 'qty_asc', 'omset_desc', 'stok_asc'
    searchQuery: '',

    render: function() {
        var html = '<div class="page-enter max-w-6xl space-y-6">';
        
        // 1. Header & Quick Actions
        html += '  <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">';
        html += '    <div>';
        html += '      <div class="flex items-center gap-2 mb-1">';
        html += '        <h2 class="text-2xl font-black text-slate-800 dark:text-white">Ringkasan Obat Terlaris</h2>';
        html += '        <span class="bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1"><i data-lucide="trending-up" class="w-3 h-3"></i> Analisis Pergerakan</span>';
        html += '      </div>';
        html += '      <p class="text-xs text-slate-500 dark:text-slate-400">Peta tingkat penjualan obat dari paling laku hingga tidak laku (0 terjual) untuk optimasi persediaan</p>';
        html += '    </div>';

        var role = window.currentRole || 'apotek';
        var canExport = (role !== 'apotek' && role !== 'admin');

        html += '    <div class="flex flex-wrap items-center gap-2.5 self-start md:self-auto">';
        if (canExport) {
            html += '      <button onclick="AppApotekObatTerlaris.exportExcel()" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition flex items-center gap-2">';
            html += '        <i data-lucide="file-spreadsheet" class="w-4 h-4"></i>';
            html += '        <span>Export Excel</span>';
            html += '      </button>';
            html += '      <button onclick="AppApotekObatTerlaris.cetakLaporan()" class="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2 dark:bg-slate-700 dark:hover:bg-slate-600">';
            html += '        <i data-lucide="printer" class="w-4 h-4"></i>';
            html += '        <span>Cetak</span>';
            html += '      </button>';
        }
        html += '      <button onclick="AppApotekObatTerlaris.init()" class="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 transition flex items-center gap-2">';
        html += '        <i data-lucide="refresh-cw" class="w-4 h-4"></i>';
        html += '        <span>Refresh</span>';
        html += '      </button>';
        html += '    </div>';
        html += '  </div>';

        // 2. Filter Waktu & Date Picker Bar
        html += '  <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-3">';
        html += '    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">';
        html += '      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">';
        html += '        <span class="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1"><i data-lucide="calendar" class="w-3.5 h-3.5"></i> Periode:</span>';
        html += '        <button onclick="AppApotekObatTerlaris.setModeDate(\'hari_ini\')" id="btn-mode-hari_ini" class="mode-btn px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">Hari Ini</button>';
        html += '        <button onclick="AppApotekObatTerlaris.setModeDate(\'7_hari\')" id="btn-mode-7_hari" class="mode-btn px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">7 Hari</button>';
        html += '        <button onclick="AppApotekObatTerlaris.setModeDate(\'30_hari\')" id="btn-mode-30_hari" class="mode-btn px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">30 Hari</button>';
        html += '        <button onclick="AppApotekObatTerlaris.setModeDate(\'bulan_ini\')" id="btn-mode-bulan_ini" class="mode-btn px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap bg-primary-600 text-white shadow-sm">Bulan Ini</button>';
        html += '        <button onclick="AppApotekObatTerlaris.setModeDate(\'tahun_ini\')" id="btn-mode-tahun_ini" class="mode-btn px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">Tahun Ini</button>';
        html += '        <button onclick="AppApotekObatTerlaris.setModeDate(\'custom\')" id="btn-mode-custom" class="mode-btn px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">Custom</button>';
        html += '      </div>';

        html += '      <div id="custom-date-container" class="hidden flex items-center gap-2">';
        html += '        <input type="date" id="input-start-date" class="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none focus:border-primary-500" onchange="AppApotekObatTerlaris.onCustomDateChange()">';
        html += '        <span class="text-xs text-slate-400">s/d</span>';
        html += '        <input type="date" id="input-end-date" class="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none focus:border-primary-500" onchange="AppApotekObatTerlaris.onCustomDateChange()">';
        html += '      </div>';
        html += '    </div>';

        // Secondary Filters: Category, Status, Sort, Search
        html += '    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">';
        
        // Filter Kategori
        html += '      <div>';
        html += '        <label class="block text-[11px] font-bold text-slate-400 mb-1">Jenis / Kategori Obat</label>';
        html += '        <select id="select-kategori" onchange="AppApotekObatTerlaris.onCategoryChange(this.value)" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none focus:border-primary-500">';
        html += '          <option value="semua">Semua Kategori</option>';
        html += '        </select>';
        html += '      </div>';

        // Filter Status Pergerakan
        html += '      <div>';
        html += '        <label class="block text-[11px] font-bold text-slate-400 mb-1">Status Pergerakan</label>';
        html += '        <select id="select-status" onchange="AppApotekObatTerlaris.onStatusChange(this.value)" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none focus:border-primary-500">';
        html += '          <option value="semua">Semua Status (Laku & Tidak Laku)</option>';
        html += '          <option value="paling_laku">🔥 Paling Laku (Top Selling)</option>';
        html += '          <option value="laku">🟢 Laku / Terjual (>0 Unit)</option>';
        html += '          <option value="tidak_laku">🔴 Tidak Laku (0 Terjual Periode Ini)</option>';
        html += '        </select>';
        html += '      </div>';

        // Sort By
        html += '      <div>';
        html += '        <label class="block text-[11px] font-bold text-slate-400 mb-1">Urutan Ranking</label>';
        html += '        <select id="select-sort" onchange="AppApotekObatTerlaris.onSortChange(this.value)" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none focus:border-primary-500">';
        html += '          <option value="qty_desc">Terbanyak Terjual (Paling Laku)</option>';
        html += '          <option value="qty_asc">Terkecil Terjual (Paling Tidak Laku)</option>';
        html += '          <option value="omset_desc">Nominal Omset Tertinggi (Rp)</option>';
        html += '          <option value="stok_asc">Sisa Stok Paling Sedikit</option>';
        html += '        </select>';
        html += '      </div>';

        // Search Input
        html += '      <div>';
        html += '        <label class="block text-[11px] font-bold text-slate-400 mb-1">Cari Nama / Kode Obat</label>';
        html += '        <div class="relative">';
        html += '          <i data-lucide="search" class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>';
        html += '          <input type="text" id="input-search" oninput="AppApotekObatTerlaris.onSearchInput(this.value)" placeholder="Ketik nama obat..." class="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none focus:border-primary-500">';
        html += '        </div>';
        html += '      </div>';

        html += '    </div>';
        html += '  </div>';

        // 3. Summary Cards KPI
        html += '  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-cards-area">';
        
        html += '    <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center gap-4">';
        html += '      <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0"><i data-lucide="package-check" class="w-6 h-6"></i></div>';
        html += '      <div>';
        html += '        <p class="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Unit Terjual</p>';
        html += '        <h3 class="text-xl font-black text-slate-800 dark:text-white" id="stat-total-qty">0 Unit</h3>';
        html += '        <p class="text-[11px] text-slate-500 dark:text-slate-400" id="stat-total-items">0 jenis obat aktif</p>';
        html += '      </div>';
        html += '    </div>';

        html += '    <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center gap-4">';
        html += '      <div class="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0"><i data-lucide="coins" class="w-6 h-6"></i></div>';
        html += '      <div>';
        html += '        <p class="text-[10px] font-black uppercase tracking-wider text-slate-400">Omset Penjualan Obat</p>';
        html += '        <h3 class="text-xl font-black text-blue-600 dark:text-blue-400" id="stat-total-omset">Rp 0</h3>';
        html += '        <p class="text-[11px] text-slate-500 dark:text-slate-400" id="stat-trx-count">Dari 0 transaksi</p>';
        html += '      </div>';
        html += '    </div>';

        html += '    <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center gap-4 relative overflow-hidden">';
        html += '      <div class="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0"><i data-lucide="award" class="w-6 h-6"></i></div>';
        html += '      <div class="min-w-0 flex-1">';
        html += '        <p class="text-[10px] font-black uppercase tracking-wider text-slate-400">Top #1 Best Seller</p>';
        html += '        <h3 class="text-sm font-black text-slate-800 dark:text-white truncate" id="stat-top-seller">-</h3>';
        html += '        <p class="text-[11px] text-amber-600 dark:text-amber-400 font-bold" id="stat-top-seller-qty">0 Unit</p>';
        html += '      </div>';
        html += '    </div>';

        html += '    <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center gap-4">';
        html += '      <div class="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0"><i data-lucide="package-x" class="w-6 h-6"></i></div>';
        html += '      <div>';
        html += '        <p class="text-[10px] font-black uppercase tracking-wider text-slate-400">Obat Tidak Laku (0 Sold)</p>';
        html += '        <h3 class="text-xl font-black text-rose-600 dark:text-rose-400" id="stat-unsold-count">0 Jenis</h3>';
        html += '        <p class="text-[11px] text-slate-500 dark:text-slate-400" id="stat-unsold-percent">0% dari total obat</p>';
        html += '      </div>';
        html += '    </div>';

        html += '  </div>';

        // 4. Highlight Top 3 & Visual Kategori
        html += '  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">';
        
        // Top 3 Best Sellers Podiums
        html += '    <div class="lg:col-span-2 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">';
        html += '      <div class="flex items-center justify-between">';
        html += '        <h3 class="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2"><i data-lucide="flame" class="w-4 h-4 text-amber-500"></i> Top 3 Obat Terlaris Periode Ini</h3>';
        html += '        <span class="text-[11px] font-semibold text-slate-400" id="period-label-top3">Bulan Ini</span>';
        html += '      </div>';
        html += '      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3" id="top3-container">';
        html += '        <div class="text-center p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-700/60"><p class="text-xs text-slate-400">Memuat...</p></div>';
        html += '      </div>';
        html += '    </div>';

        // Category Breakdown
        html += '    <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-3">';
        html += '      <h3 class="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2"><i data-lucide="pie-chart" class="w-4 h-4 text-primary-500"></i> Penjualan per Kategori</h3>';
        html += '      <div id="category-breakdown-list" class="space-y-2.5 max-h-[160px] overflow-y-auto pr-1 text-xs">';
        html += '        <p class="text-slate-400 text-center py-4">Memuat data kategori...</p>';
        html += '      </div>';
        html += '    </div>';

        html += '  </div>';

        // 5. Main Table Container
        html += '  <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">';
        html += '    <div class="p-4 border-b border-slate-100 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">';
        html += '      <div>';
        html += '        <h3 class="text-sm font-black text-slate-800 dark:text-white">Daftar Lengkap Ranking Obat (Terlaris s/d Tidak Laku)</h3>';
        html += '        <p class="text-[11px] text-slate-400" id="table-summary-info">Menampilkan seluruh item master obat dan status pergerakannya</p>';
        html += '      </div>';
        html += '      <div class="text-xs text-slate-500 font-mono bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700" id="filter-active-label">';
        html += '        Semua Kategori';
        html += '      </div>';
        html += '    </div>';

        html += '    <div id="table-container" class="overflow-x-auto"><div class="flex justify-center py-16"><div class="spinner"></div></div></div>';
        html += '  </div>';

        html += '</div>';
        return html;
    },

    init: function() {
        var self = this;
        this.updateDateRangeByMode();

        var container = document.getElementById('table-container');
        if (container) {
            container.innerHTML = '<div class="flex justify-center py-16"><div class="spinner"></div></div>';
        }

        // 1. Load Master Obat
        DataCache.getObat().then(function(snapObat) {
            self.dataMaster = [];
            snapObat.forEach(function(doc) {
                var d = doc.data();
                d.id = doc.id;
                self.dataMaster.push(d);
            });

            // Populate Kategori dropdown
            self.populateCategoryDropdown();

            // 2. Load Transactions in date range
            return db.collection('transaksi')
                .where('tanggal', '>=', self.startDate)
                .where('tanggal', '<=', self.endDate)
                .get();
        }).then(function(snapTrx) {
            self.transactions = [];
            snapTrx.forEach(function(doc) {
                var t = doc.data();
                if (t.status !== 'void' && t.status !== 'batal') {
                    t.id = doc.id;
                    self.transactions.push(t);
                }
            });

            self.processSalesData();
            self.renderAll();
        }).catch(function(err) {
            console.error("Error init obatTerlaris:", err);
            Utils.toast('Gagal memuat data penjualan: ' + err.message, 'error');
        });
    },

    updateDateRangeByMode: function() {
        var today = Utils.today();
        var d = new Date();

        if (this.modeDate === 'hari_ini') {
            this.startDate = today;
            this.endDate = today;
        } else if (this.modeDate === '7_hari') {
            var t7 = new Date();
            t7.setDate(t7.getDate() - 6);
            this.startDate = t7.toISOString().split('T')[0];
            this.endDate = today;
        } else if (this.modeDate === '30_hari') {
            var t30 = new Date();
            t30.setDate(t30.getDate() - 29);
            this.startDate = t30.toISOString().split('T')[0];
            this.endDate = today;
        } else if (this.modeDate === 'bulan_ini') {
            var y = d.getFullYear();
            var m = String(d.getMonth() + 1).padStart(2, '0');
            var lastDay = new Date(y, d.getMonth() + 1, 0).getDate();
            this.startDate = y + '-' + m + '-01';
            this.endDate = y + '-' + m + '-' + String(lastDay).padStart(2, '0');
        } else if (this.modeDate === 'tahun_ini') {
            var y = d.getFullYear();
            this.startDate = y + '-01-01';
            this.endDate = y + '-12-31';
        } else if (this.modeDate === 'custom') {
            var inputStart = document.getElementById('input-start-date');
            var inputEnd = document.getElementById('input-end-date');
            if (inputStart && inputStart.value) this.startDate = inputStart.value;
            if (inputEnd && inputEnd.value) this.endDate = inputEnd.value;
            if (!this.startDate) this.startDate = today;
            if (!this.endDate) this.endDate = today;
        }

        // Update active date mode buttons UI
        ['hari_ini', '7_hari', '30_hari', 'bulan_ini', 'tahun_ini', 'custom'].forEach(m => {
            var btn = document.getElementById('btn-mode-' + m);
            if (!btn) return;
            if (m === this.modeDate) {
                btn.className = 'mode-btn px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap bg-primary-600 text-white shadow-sm';
            } else {
                btn.className = 'mode-btn px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
            }
        });

        var customContainer = document.getElementById('custom-date-container');
        if (customContainer) {
            if (this.modeDate === 'custom') {
                customContainer.classList.remove('hidden');
                var inputStart = document.getElementById('input-start-date');
                var inputEnd = document.getElementById('input-end-date');
                if (inputStart && !inputStart.value) inputStart.value = this.startDate;
                if (inputEnd && !inputEnd.value) inputEnd.value = this.endDate;
            } else {
                customContainer.classList.add('hidden');
            }
        }
    },

    setModeDate: function(mode) {
        this.modeDate = mode;
        this.init();
    },

    onCustomDateChange: function() {
        this.startDate = document.getElementById('input-start-date').value || Utils.today();
        this.endDate = document.getElementById('input-end-date').value || Utils.today();
        this.init();
    },

    populateCategoryDropdown: function() {
        var select = document.getElementById('select-kategori');
        if (!select) return;

        var categories = new Set();
        this.dataMaster.forEach(function(o) {
            if (o.kategori) categories.add(o.kategori);
            if (o.jenis) categories.add(o.jenis);
        });

        var currentVal = this.selectedCategory;
        var html = '<option value="semua">Semua Kategori (' + categories.size + ' jenis)</option>';
        Array.from(categories).sort().forEach(function(cat) {
            var selected = (cat === currentVal) ? 'selected' : '';
            html += '<option value="' + Utils.escapeHtml(cat) + '" ' + selected + '>' + Utils.escapeHtml(cat) + '</option>';
        });
        select.innerHTML = html;
    },

    onCategoryChange: function(val) {
        this.selectedCategory = val;
        this.renderAll();
    },

    onStatusChange: function(val) {
        this.selectedStatus = val;
        this.renderAll();
    },

    onSortChange: function(val) {
        this.sortBy = val;
        this.renderAll();
    },

    onSearchInput: function(val) {
        this.searchQuery = (val || '').toLowerCase().trim();
        this.renderTableOnly();
    },

    processSalesData: function() {
        var salesMap = {}; // key: obatId or namaObat lowercase

        var totalOmsetKeseluruhan = 0;
        var totalQtyKeseluruhan = 0;

        // Map sales from transactions
        this.transactions.forEach(function(trx) {
            var items = trx.items || [];
            items.forEach(function(item) {
                var key = item.obatId || (item.namaObat ? item.namaObat.toLowerCase().trim() : '');
                if (!key) return;

                var qty = Number(item.jumlah || 0);
                var subtotal = Number(item.subtotal || (qty * (item.hargaJual || 0)));

                if (!salesMap[key]) {
                    salesMap[key] = {
                        qtySold: 0,
                        totalOmset: 0,
                        trxCount: 0,
                        namaObat: item.namaObat || '',
                        kodeObat: item.kodeObat || '',
                        kategori: item.kategori || item.jenis || ''
                    };
                }

                salesMap[key].qtySold += qty;
                salesMap[key].totalOmset += subtotal;
                salesMap[key].trxCount += 1;

                totalOmsetKeseluruhan += subtotal;
                totalQtyKeseluruhan += qty;
            });
        });

        // Combine with Master Data Obat
        var processed = [];
        var masterKeysSeen = new Set();

        this.dataMaster.forEach(function(o) {
            var keyDoc = o.id;
            var keyName = (o.namaObat || '').toLowerCase().trim();

            var sales = salesMap[keyDoc] || salesMap[keyName] || { qtySold: 0, totalOmset: 0, trxCount: 0 };
            
            masterKeysSeen.add(keyDoc);
            masterKeysSeen.add(keyName);

            var pctOmset = totalOmsetKeseluruhan > 0 ? ((sales.totalOmset / totalOmsetKeseluruhan) * 100) : 0;

            processed.push({
                id: o.id,
                kodeObat: o.kodeObat || '-',
                namaObat: o.namaObat || 'Obat Tanpa Nama',
                kategori: o.kategori || o.jenis || 'Lainnya',
                satuan: o.satuan || 'Pcs',
                hargaBeli: Number(o.hargaBeli || 0),
                hargaJual: Number(o.hargaJual || 0),
                stok: Number(o.stok || 0),
                minStok: Number(o.minStok || 5),
                qtySold: sales.qtySold,
                totalOmset: sales.totalOmset,
                trxCount: sales.trxCount,
                pctOmset: pctOmset
            });
        });

        // Also include items sold that might have been deleted from master data
        Object.keys(salesMap).forEach(function(k) {
            if (!masterKeysSeen.has(k)) {
                var s = salesMap[k];
                var pctOmset = totalOmsetKeseluruhan > 0 ? ((s.totalOmset / totalOmsetKeseluruhan) * 100) : 0;
                processed.push({
                    id: 'temp-' + k,
                    kodeObat: s.kodeObat || '-',
                    namaObat: s.namaObat || k,
                    kategori: s.kategori || 'Lainnya',
                    satuan: 'Pcs',
                    hargaBeli: 0,
                    hargaJual: s.qtySold > 0 ? (s.totalOmset / s.qtySold) : 0,
                    stok: 0,
                    minStok: 0,
                    qtySold: s.qtySold,
                    totalOmset: s.totalOmset,
                    trxCount: s.trxCount,
                    pctOmset: pctOmset
                });
            }
        });

        this.processedList = processed;
        this.totalOmsetKeseluruhan = totalOmsetKeseluruhan;
        this.totalQtyKeseluruhan = totalQtyKeseluruhan;

        // Process Category Summaries
        var catMap = {};
        this.processedList.forEach(function(item) {
            var cat = item.kategori || 'Lainnya';
            if (!catMap[cat]) {
                catMap[cat] = { category: cat, totalQty: 0, totalOmset: 0, itemTypesCount: 0 };
            }
            catMap[cat].totalQty += item.qtySold;
            catMap[cat].totalOmset += item.totalOmset;
            catMap[cat].itemTypesCount += 1;
        });

        var catList = Object.values(catMap);
        catList.sort((a, b) => b.totalQty - a.totalQty);
        this.categorySummary = catList;
    },

    renderAll: function() {
        this.renderKPICards();
        this.renderTop3Podiums();
        this.renderCategoryBreakdown();
        this.renderTableOnly();
    },

    renderKPICards: function() {
        var elQty = document.getElementById('stat-total-qty');
        var elItems = document.getElementById('stat-total-items');
        var elOmset = document.getElementById('stat-total-omset');
        var elTrx = document.getElementById('stat-trx-count');
        var elTopSeller = document.getElementById('stat-top-seller');
        var elTopSellerQty = document.getElementById('stat-top-seller-qty');
        var elUnsold = document.getElementById('stat-unsold-count');
        var elUnsoldPct = document.getElementById('stat-unsold-percent');

        // Sorted by qtySold descending to get top seller
        var sortedByQty = [...this.processedList].sort((a, b) => b.qtySold - a.qtySold);
        var top1 = sortedByQty[0];

        var unsoldItems = this.processedList.filter(x => x.qtySold === 0);
        var unsoldPct = this.processedList.length > 0 ? ((unsoldItems.length / this.processedList.length) * 100).toFixed(1) : 0;

        if (elQty) elQty.textContent = Utils.formatAngka(this.totalQtyKeseluruhan) + ' Unit';
        if (elItems) elItems.textContent = this.processedList.length + ' varian obat master';
        if (elOmset) elOmset.textContent = Utils.formatRupiah(this.totalOmsetKeseluruhan);
        if (elTrx) elTrx.textContent = 'Dari ' + this.transactions.length + ' transaksi kassa';

        if (elTopSeller) {
            elTopSeller.textContent = (top1 && top1.qtySold > 0) ? top1.namaObat : 'Belum Ada Penjualan';
        }
        if (elTopSellerQty) {
            elTopSellerQty.textContent = (top1 && top1.qtySold > 0) ? (Utils.formatAngka(top1.qtySold) + ' Unit terjual (' + Utils.formatRupiah(top1.totalOmset) + ')') : '0 Unit';
        }

        if (elUnsold) elUnsold.textContent = unsoldItems.length + ' Varian';
        if (elUnsoldPct) elUnsoldPct.textContent = unsoldPct + '% dari total master obat';

        var filterLabel = document.getElementById('filter-active-label');
        if (filterLabel) {
            var tglLabel = this.startDate === this.endDate ? this.startDate : (this.startDate + ' s/d ' + this.endDate);
            var katText = this.selectedCategory === 'semua' ? 'Semua Kategori' : ('Kategori: ' + this.selectedCategory);
            filterLabel.textContent = katText + ' | Periode: ' + tglLabel;
        }

        var periodTop3 = document.getElementById('period-label-top3');
        if (periodTop3) {
            periodTop3.textContent = this.startDate === this.endDate ? this.startDate : (this.startDate + ' s/d ' + this.endDate);
        }
    },

    renderTop3Podiums: function() {
        var container = document.getElementById('top3-container');
        if (!container) return;

        var sortedByQty = [...this.processedList].sort((a, b) => b.qtySold - a.qtySold);
        var top3 = sortedByQty.filter(x => x.qtySold > 0).slice(0, 3);

        if (top3.length === 0) {
            container.innerHTML = '<div class="col-span-3 py-6 text-center text-slate-400 text-xs">Belum ada data obat terjual pada periode tanggal ini.</div>';
            return;
        }

        var medals = [
            { bg: 'bg-amber-500/10 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700', text: 'text-amber-600 dark:text-amber-400', rank: '🥇 Top #1', badge: 'bg-amber-500 text-white' },
            { bg: 'bg-slate-100 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600', text: 'text-slate-700 dark:text-slate-300', rank: '🥈 Top #2', badge: 'bg-slate-500 text-white' },
            { bg: 'bg-amber-800/10 dark:bg-amber-900/30 border-amber-600/40 dark:border-amber-800', text: 'text-amber-800 dark:text-amber-300', rank: '🥉 Top #3', badge: 'bg-amber-800 text-white' }
        ];

        var html = '';
        top3.forEach(function(item, idx) {
            var m = medals[idx] || medals[1];
            html += '<div class="p-3.5 rounded-2xl border ' + m.bg + ' space-y-2 flex flex-col justify-between text-left shadow-xs transition hover:scale-[1.02]">';
            html += '  <div class="flex items-center justify-between">';
            html += '    <span class="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ' + m.badge + '">' + m.rank + '</span>';
            html += '    <span class="text-[10px] font-bold text-slate-400">' + Utils.escapeHtml(item.kategori) + '</span>';
            html += '  </div>';
            
            html += '  <div>';
            html += '    <h4 class="text-xs font-black text-slate-800 dark:text-white line-clamp-2" title="' + Utils.escapeHtml(item.namaObat) + '">' + Utils.escapeHtml(item.namaObat) + '</h4>';
            html += '    <p class="text-[10px] text-slate-400 font-mono">Kode: ' + Utils.escapeHtml(item.kodeObat) + '</p>';
            html += '  </div>';

            html += '  <div class="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">';
            html += '    <div><p class="text-[9px] text-slate-400 uppercase font-bold">Terjual</p><p class="font-black ' + m.text + '">' + Utils.formatAngka(item.qtySold) + ' <span class="text-[10px] font-normal">' + item.satuan + '</span></p></div>';
            html += '    <div class="text-right"><p class="text-[9px] text-slate-400 uppercase font-bold">Omset</p><p class="font-black text-slate-700 dark:text-slate-200">' + Utils.formatRupiah(item.totalOmset) + '</p></div>';
            html += '  </div>';

            html += '</div>';
        });

        container.innerHTML = html;
        if (window.lucide) lucide.createIcons();
    },

    renderCategoryBreakdown: function() {
        var container = document.getElementById('category-breakdown-list');
        if (!container) return;

        if (this.categorySummary.length === 0) {
            container.innerHTML = '<p class="text-slate-400 text-center py-4 text-xs">Belum ada data kategori.</p>';
            return;
        }

        var maxQty = this.categorySummary[0] ? this.categorySummary[0].totalQty : 1;
        if (maxQty === 0) maxQty = 1;

        var html = '';
        this.categorySummary.slice(0, 6).forEach(function(cat) {
            var pctBar = Math.min(100, Math.round((cat.totalQty / maxQty) * 100));
            html += '<div class="space-y-1">';
            html += '  <div class="flex justify-between items-center text-[11px] font-bold">';
            html += '    <span class="text-slate-700 dark:text-slate-200 truncate pr-2">' + Utils.escapeHtml(cat.category) + '</span>';
            html += '    <span class="text-slate-800 dark:text-slate-100 font-mono">' + Utils.formatAngka(cat.totalQty) + ' <span class="text-[9px] font-normal text-slate-400">unit</span></span>';
            html += '  </div>';
            html += '  <div class="w-full h-1.5 bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden">';
            html += '    <div class="h-full bg-primary-600 rounded-full transition-all duration-500" style="width: ' + pctBar + '%"></div>';
            html += '  </div>';
            html += '</div>';
        });

        container.innerHTML = html;
    },

    renderTableOnly: function() {
        var container = document.getElementById('table-container');
        if (!container) return;

        var self = this;

        // 1. Filter Data
        var filtered = this.processedList.filter(function(item) {
            // Filter Kategori
            if (self.selectedCategory !== 'semua') {
                if (item.kategori !== self.selectedCategory) return false;
            }

            // Filter Status Pergerakan
            if (self.selectedStatus === 'paling_laku') {
                if (item.qtySold < 10) return false;
            } else if (self.selectedStatus === 'laku') {
                if (item.qtySold <= 0) return false;
            } else if (self.selectedStatus === 'tidak_laku') {
                if (item.qtySold > 0) return false;
            }

            // Search Query
            if (self.searchQuery) {
                var nama = (item.namaObat || '').toLowerCase();
                var kode = (item.kodeObat || '').toLowerCase();
                var kat = (item.kategori || '').toLowerCase();
                if (nama.indexOf(self.searchQuery) === -1 &&
                    kode.indexOf(self.searchQuery) === -1 &&
                    kat.indexOf(self.searchQuery) === -1) {
                    return false;
                }
            }

            return true;
        });

        // 2. Sort Data
        filtered.sort(function(a, b) {
            if (self.sortBy === 'qty_desc') return b.qtySold - a.qtySold;
            if (self.sortBy === 'qty_asc') return a.qtySold - b.qtySold;
            if (self.sortBy === 'omset_desc') return b.totalOmset - a.totalOmset;
            if (self.sortBy === 'stok_asc') return a.stok - b.stok;
            return b.qtySold - a.qtySold;
        });

        var summaryInfo = document.getElementById('table-summary-info');
        if (summaryInfo) {
            summaryInfo.textContent = 'Menampilkan ' + filtered.length + ' dari ' + this.processedList.length + ' varian obat master';
        }

        if (filtered.length === 0) {
            container.innerHTML = '<div class="p-12 text-center text-slate-400 space-y-3">' +
                '<i data-lucide="package-search" class="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600"></i>' +
                '<p class="text-sm font-semibold text-slate-600 dark:text-slate-300">Tidak ada obat yang memenuhi kriteria filter ini.</p>' +
                '</div>';
            if (window.lucide) lucide.createIcons();
            return;
        }

        var html = '<table class="w-full text-left border-collapse text-xs">';
        html += '  <thead>';
        html += '    <tr class="bg-slate-50 dark:bg-slate-900/60 text-slate-400 uppercase tracking-wider text-[10px] font-black border-b border-slate-200 dark:border-slate-700">';
        html += '      <th class="py-3.5 px-4 w-12 text-center">Rank</th>';
        html += '      <th class="py-3.5 px-4">Nama & Kode Obat</th>';
        html += '      <th class="py-3.5 px-4">Jenis / Kategori</th>';
        html += '      <th class="py-3.5 px-4 text-center">Qty Terjual</th>';
        html += '      <th class="py-3.5 px-4 text-right">Omset (Rp)</th>';
        html += '      <th class="py-3.5 px-4 text-right">% Omset</th>';
        html += '      <th class="py-3.5 px-4 text-center">Sisa Stok</th>';
        html += '      <th class="py-3.5 px-4 text-center">Status Pergerakan</th>';
        html += '    </tr>';
        html += '  </thead>';
        html += '  <tbody class="divide-y divide-slate-100 dark:divide-slate-700/60">';

        filtered.forEach(function(item, index) {
            var rank = index + 1;
            
            // Rank badge style
            var rankBadge = '<span class="font-mono font-bold text-slate-500">#' + rank + '</span>';
            if (rank === 1 && item.qtySold > 0) rankBadge = '<span class="w-6 h-6 rounded-full bg-amber-500 text-white font-black inline-flex items-center justify-center text-[10px] shadow-xs">1</span>';
            else if (rank === 2 && item.qtySold > 0) rankBadge = '<span class="w-6 h-6 rounded-full bg-slate-400 text-white font-black inline-flex items-center justify-center text-[10px] shadow-xs">2</span>';
            else if (rank === 3 && item.qtySold > 0) rankBadge = '<span class="w-6 h-6 rounded-full bg-amber-800 text-white font-black inline-flex items-center justify-center text-[10px] shadow-xs">3</span>';

            // Status Pergerakan Badge
            var statusBadge = '';
            if (item.qtySold >= 50) {
                statusBadge = '<span class="bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 px-2.5 py-1 rounded-full text-[10px] font-black border border-amber-200/80 dark:border-amber-800 inline-flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>Sangat Laku</span>';
            } else if (item.qtySold >= 10) {
                statusBadge = '<span class="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 px-2.5 py-1 rounded-full text-[10px] font-bold border border-emerald-200/80 dark:border-emerald-800">🟢 Laku / Lariss</span>';
            } else if (item.qtySold > 0) {
                statusBadge = '<span class="bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 px-2.5 py-1 rounded-full text-[10px] font-medium border border-blue-200/80 dark:border-blue-800">🔵 Sedang</span>';
            } else {
                statusBadge = '<span class="bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 px-2.5 py-1 rounded-full text-[10px] font-bold border border-rose-200/80 dark:border-rose-800">🔴 Tidak Laku (0 Sold)</span>';
            }

            // Stok alert styling
            var stokClass = 'text-slate-700 dark:text-slate-300';
            if (item.stok <= 0) stokClass = 'text-rose-600 dark:text-rose-400 font-black';
            else if (item.stok <= item.minStok) stokClass = 'text-amber-600 dark:text-amber-400 font-bold';

            html += '<tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition">';
            html += '  <td class="py-3 px-4 text-center">' + rankBadge + '</td>';
            
            html += '  <td class="py-3 px-4">';
            html += '    <p class="font-bold text-slate-800 dark:text-white line-clamp-1">' + Utils.escapeHtml(item.namaObat) + '</p>';
            html += '    <p class="text-[10px] text-slate-400 font-mono">Kode: ' + Utils.escapeHtml(item.kodeObat) + ' | Harga: ' + Utils.formatRupiah(item.hargaJual) + '</p>';
            html += '  </td>';

            html += '  <td class="py-3 px-4">';
            html += '    <span class="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md text-[10px] font-semibold">' + Utils.escapeHtml(item.kategori) + '</span>';
            html += '  </td>';

            html += '  <td class="py-3 px-4 text-center font-mono font-bold text-slate-800 dark:text-white">';
            html += '    ' + (item.qtySold > 0 ? ('<span class="text-emerald-600 dark:text-emerald-400">' + Utils.formatAngka(item.qtySold) + '</span>') : '<span class="text-slate-300 dark:text-slate-600">0</span>') + ' <span class="text-[10px] font-normal text-slate-400">' + item.satuan + '</span>';
            html += '  </td>';

            html += '  <td class="py-3 px-4 text-right font-mono font-bold text-slate-800 dark:text-white">';
            html += '    ' + Utils.formatRupiah(item.totalOmset);
            html += '  </td>';

            html += '  <td class="py-3 px-4 text-right font-mono text-slate-500 dark:text-slate-400">';
            html += '    ' + item.pctOmset.toFixed(1) + '%';
            html += '  </td>';

            html += '  <td class="py-3 px-4 text-center font-mono ' + stokClass + '">';
            html += '    ' + Utils.formatAngka(item.stok) + ' <span class="text-[10px] font-normal text-slate-400">' + item.satuan + '</span>';
            if (item.stok <= item.minStok && item.stok > 0) {
                html += '    <span class="block text-[9px] text-amber-500 font-bold">Stok Menipis</span>';
            } else if (item.stok <= 0) {
                html += '    <span class="block text-[9px] text-rose-500 font-bold">Habis</span>';
            }
            html += '  </td>';

            html += '  <td class="py-3 px-4 text-center">';
            html += '    ' + statusBadge;
            html += '  </td>';

            html += '</tr>';
        });

        html += '  </tbody>';
        html += '</table>';

        container.innerHTML = html;
        if (window.lucide) lucide.createIcons();
    },

    exportExcel: function() {
        var role = window.currentRole || 'apotek';
        if (role === 'apotek' || role === 'admin') {
            Utils.toast('Akses Ditolak: Fitur export Excel tidak tersedia untuk akun ' + role.toUpperCase(), 'error');
            return;
        }

        if (!window.XLSX) {
            Utils.toast('Library SheetJS belum siap!', 'error');
            return;
        }

        Utils.toast('Menyiapkan file Excel...', 'info');

        // Sheet 1: Detail Ranking Obat
        var rows1 = [
            ['LAPORAN RINGKASAN OBAT TERLARIS & PERGERAKAN STOK'],
            ['Periode Tanggal:', this.startDate + ' s/d ' + this.endDate],
            ['Kategori Filter:', this.selectedCategory],
            ['Dicetak Pada:', Utils.now()],
            [],
            ['Rank', 'Kode Obat', 'Nama Obat', 'Kategori/Jenis', 'Satuan', 'Harga Beli (Rp)', 'Harga Jual (Rp)', 'Qty Terjual', 'Total Omset (Rp)', '% Omset', 'Sisa Stok', 'Status Pergerakan']
        ];

        var self = this;
        var sorted = [...this.processedList].sort((a, b) => b.qtySold - a.qtySold);

        sorted.forEach(function(item, idx) {
            var status = item.qtySold >= 50 ? 'Sangat Laku' : (item.qtySold >= 10 ? 'Laku' : (item.qtySold > 0 ? 'Sedang' : 'Tidak Laku (0 Terjual)'));
            rows1.push([
                idx + 1,
                item.kodeObat,
                item.namaObat,
                item.kategori,
                item.satuan,
                item.hargaBeli,
                item.hargaJual,
                item.qtySold,
                item.totalOmset,
                Number(item.pctOmset.toFixed(2)),
                item.stok,
                status
            ]);
        });

        // Sheet 2: Ringkasan Kategori
        var rows2 = [
            ['RINGKASAN PENJUALAN PER KATEGORI OBAT'],
            ['Periode:', this.startDate + ' s/d ' + this.endDate],
            [],
            ['No', 'Nama Kategori / Jenis', 'Total Qty Terjual', 'Total Omset (Rp)', 'Jumlah Varian Obat']
        ];

        this.categorySummary.forEach(function(cat, idx) {
            rows2.push([
                idx + 1,
                cat.category,
                cat.totalQty,
                cat.totalOmset,
                cat.itemTypesCount
            ]);
        });

        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows1), 'Detail Obat Terlaris');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows2), 'Ringkasan Kategori');

        var fileName = 'Obat_Terlaris_' + this.startDate + '_sd_' + this.endDate + '.xlsx';
        XLSX.writeFile(wb, fileName);
        Utils.toast('Berhasil mendownload Excel: ' + fileName, 'success');
    },

    cetakLaporan: function() {
        var role = window.currentRole || 'apotek';
        if (role === 'apotek' || role === 'admin') {
            Utils.toast('Akses Ditolak: Fitur cetak tidak tersedia untuk akun ' + role.toUpperCase(), 'error');
            return;
        }

        var printWin = window.open('', '_blank');
        if (!printWin) {
            Utils.toast('Popup blocker aktif! Harap izinkan popup.', 'error');
            return;
        }

        var tglLabel = this.startDate === this.endDate ? this.startDate : (this.startDate + ' s/d ' + this.endDate);
        var sorted = [...this.processedList].sort((a, b) => b.qtySold - a.qtySold);

        var html = '<!DOCTYPE html><html><head><title>Cetak Ringkasan Obat Terlaris</title>';
        html += '<style>';
        html += 'body { font-family: sans-serif; font-size: 11px; margin: 20px; color: #1e293b; }';
        html += 'h1 { font-size: 16px; margin-bottom: 4px; }';
        html += 'p { margin: 2px 0; color: #64748b; }';
        html += 'table { width: 100%; border-collapse: collapse; margin-top: 15px; }';
        html += 'th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }';
        html += 'th { background: #f1f5f9; font-weight: bold; font-size: 10px; uppercase; }';
        html += '.text-right { text-align: right; }';
        html += '.text-center { text-align: center; font-weight: bold; }';
        html += '</style></head><body>';

        html += '<h1>AULIA APOTEK DAN KLINIK - RINGKASAN OBAT TERLARIS</h1>';
        html += '<p>Periode Tanggal: ' + tglLabel + '</p>';
        html += '<p>Dicetak pada: ' + Utils.now() + '</p>';

        html += '<table>';
        html += '<thead><tr><th>Rank</th><th>Kode</th><th>Nama Obat</th><th>Kategori</th><th class="text-center">Qty Terjual</th><th class="text-right">Omset (Rp)</th><th class="text-center">Sisa Stok</th><th class="text-center">Status</th></tr></thead>';
        html += '<tbody>';

        sorted.forEach(function(item, idx) {
            var status = item.qtySold >= 50 ? 'Sangat Laku' : (item.qtySold >= 10 ? 'Laku' : (item.qtySold > 0 ? 'Sedang' : 'Tidak Laku'));
            html += '<tr>';
            html += '<td class="text-center">#' + (idx + 1) + '</td>';
            html += '<td>' + Utils.escapeHtml(item.kodeObat) + '</td>';
            html += '<td><strong>' + Utils.escapeHtml(item.namaObat) + '</strong></td>';
            html += '<td>' + Utils.escapeHtml(item.kategori) + '</td>';
            html += '<td class="text-center">' + item.qtySold + ' ' + item.satuan + '</td>';
            html += '<td class="text-right">' + Utils.formatRupiah(item.totalOmset) + '</td>';
            html += '<td class="text-center">' + item.stok + ' ' + item.satuan + '</td>';
            html += '<td class="text-center">' + status + '</td>';
            html += '</tr>';
        });

        html += '</tbody></table>';
        html += '<script>window.onload = function() { window.print(); };</script>';
        html += '</body></html>';

        printWin.document.write(html);
        printWin.document.close();
    }
};
