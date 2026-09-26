/**
 * js/laporan/auditTrail.js
 * Halaman untuk melihat jejak audit transaksi keuangan penting
 * (dicatat otomatis oleh js/utils/auditLog.js).
 *
 * Hanya untuk role admin & keuangan (lihat roleAccess di js/app.js —
 * mereka satu-satunya role dengan akses penuh ke section 'laporan',
 * dan firestore.rules membatasi read koleksi 'auditLog' hanya untuk
 * kedua role tersebut).
 */

/**
 * js/laporan/auditTrail.js
 * Halaman untuk melihat jejak audit / activity logs transaksi keuangan penting
 * (dicatat otomatis oleh js/utils/auditLog.js).
 *
 * Diperbarui dengan fitur dashboard premium:
 * - Filter Aksi, Modul (dinamis), Periode Tanggal, dan Pencarian teks langsung (oleh & deskripsi)
 * - Statistik aktivitas ringkas
 * - Ekspor ke Excel (SheetJS) dan PDF (jsPDF + AutoTable)
 * - Load More pagination tanpa merusak filter
 */

window.AppLaporanAuditTrail = {
    rawEntries: [],       // Semua logs yang dimuat dari Firestore
    filteredEntries: [],  // Logs setelah difilter oleh kriteria pencarian
    
    // Status filter
    filterAksi: '',
    filterModul: '',
    filterDateStart: '',
    filterDateEnd: '',
    filterSearch: '',
    
    // Pagination & Loading
    currentLimit: 500,
    isLoading: false,

    render: function() {
        var html = '<div class="page-enter max-w-6xl space-y-6">';
        
        // HEADER BAR
        html += '  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">';
        html += '    <div>';
        html += '      <h2 class="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">';
        html += '        <i data-lucide="history" class="w-6 h-6 text-primary-500"></i> Audit Trail & Aktivitas';
        html += '      </h2>';
        html += '      <p class="text-sm text-slate-500 dark:text-slate-400">Jejak aktivitas keamanan dan transaksi finansial penting: siapa melakukan apa & kapan</p>';
        html += '    </div>';
        html += '    <div class="flex flex-wrap items-center gap-2">';
        html += '      <button onclick="AppLaporanAuditTrail.exportExcel()" class="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2 shadow-sm">';
        html += '        <i data-lucide="file-spreadsheet" class="w-4 h-4"></i> Ekspor Excel';
        html += '      </button>';
        html += '      <button onclick="AppLaporanAuditTrail.exportPDF()" class="bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2 shadow-sm">';
        html += '        <i data-lucide="file-text" class="w-4 h-4"></i> Ekspor PDF';
        html += '      </button>';
        html += '    </div>';
        html += '  </div>';

        // STATS CARDS
        html += '  <div class="grid grid-cols-2 md:grid-cols-4 gap-4" id="at-stats-container">';
        html += '    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm animate-pulse">';
        html += '      <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2"></div>';
        html += '      <div class="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>';
        html += '    </div>';
        html += '    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm animate-pulse">';
        html += '      <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2"></div>';
        html += '      <div class="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>';
        html += '    </div>';
        html += '    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm animate-pulse">';
        html += '      <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2"></div>';
        html += '      <div class="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>';
        html += '    </div>';
        html += '    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm animate-pulse">';
        html += '      <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2"></div>';
        html += '      <div class="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>';
        html += '    </div>';
        html += '  </div>';

        // FILTER CARD
        html += '  <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">';
        html += '    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">';
        
        // Search Input
        html += '      <div class="flex flex-col">';
        html += '        <label class="text-xs font-semibold text-slate-500 mb-1">Pencarian</label>';
        html += '        <div class="relative">';
        html += '          <input type="text" id="at-search" oninput="AppLaporanAuditTrail.handleFilterChange()" class="w-full pl-8 pr-3 py-2 border border-slate-300 dark:bg-slate-700 dark:border-slate-600 dark:text-white rounded-lg text-sm outline-none focus:border-primary-500" placeholder="Operator / deskripsi...">';
        html += '          <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-2.5 top-3"></i>';
        html += '        </div>';
        html += '      </div>';

        // Aksi Filter
        html += '      <div class="flex flex-col">';
        html += '        <label class="text-xs font-semibold text-slate-500 mb-1">Aksi</label>';
        html += '        <select id="at-filter-aksi" onchange="AppLaporanAuditTrail.handleFilterChange()" class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:border-slate-600 dark:text-white rounded-lg text-sm outline-none focus:border-primary-500">';
        html += '          <option value="">Semua Aksi</option>';
        ['tambah', 'ubah', 'hapus', 'approve', 'tolak', 'bayar', 'lainnya'].forEach(function(a) {
            html += '      <option value="' + a + '">' + a.toUpperCase() + '</option>';
        });
        html += '        </select>';
        html += '      </div>';

        // Modul Filter (Akan diisi dinamis di init/renderList)
        html += '      <div class="flex flex-col">';
        html += '        <label class="text-xs font-semibold text-slate-500 mb-1">Modul</label>';
        html += '        <select id="at-filter-modul" onchange="AppLaporanAuditTrail.handleFilterChange()" class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:border-slate-600 dark:text-white rounded-lg text-sm outline-none focus:border-primary-500">';
        html += '          <option value="">Semua Modul</option>';
        html += '        </select>';
        html += '      </div>';

        // Start Date
        html += '      <div class="flex flex-col">';
        html += '        <label class="text-xs font-semibold text-slate-500 mb-1">Dari Tanggal</label>';
        html += '        <input type="date" id="at-start-date" onchange="AppLaporanAuditTrail.handleFilterChange()" class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:border-slate-600 dark:text-white rounded-lg text-sm outline-none focus:border-primary-500">';
        html += '      </div>';

        // End Date
        html += '      <div class="flex flex-col">';
        html += '        <label class="text-xs font-semibold text-slate-500 mb-1">Sampai Tanggal</label>';
        html += '        <div class="flex gap-2">';
        html += '          <input type="date" id="at-end-date" onchange="AppLaporanAuditTrail.handleFilterChange()" class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:border-slate-600 dark:text-white rounded-lg text-sm outline-none flex-1 focus:border-primary-500">';
        html += '          <button onclick="AppLaporanAuditTrail.resetFilters()" title="Reset Filter" class="p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 text-slate-500 hover:text-red-500 rounded-lg flex items-center justify-center transition-colors">';
        html += '            <i data-lucide="rotate-ccw" class="w-4 h-4"></i>';
        html += '          </button>';
        html += '        </div>';
        html += '      </div>';

        html += '    </div>';
        html += '  </div>';

        // TABLE / CONTENT CONTAINER
        html += '  <div id="audit-trail-content">';
        html += '    <div class="flex justify-center py-20"><div class="spinner"></div></div>';
        html += '  </div>';
        
        html += '</div>';
        return html;
    },

    init: function() {
        // Keamanan tambahan: Cek role
        var role = window.currentRole || 'apotek';
        if (role !== 'keuangan' && role !== 'psa') {
            var container = document.getElementById('audit-trail-content');
            if (container) {
                container.innerHTML = '<div class="bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 p-4 rounded-lg">Akses Ditolak. Halaman ini khusus Keuangan/PSA.</div>';
            }
            return;
        }
        this.resetState();
        this.fetchData();
    },

    resetState: function() {
        this.rawEntries = [];
        this.filteredEntries = [];
        this.filterAksi = '';
        this.filterModul = '';
        this.filterDateStart = '';
        this.filterDateEnd = '';
        this.filterSearch = '';
        this.currentLimit = 500;
    },

    fetchData: function() {
        var self = this;
        self.isLoading = true;
        
        var contentDiv = document.getElementById('audit-trail-content');
        if (contentDiv && self.rawEntries.length === 0) {
            contentDiv.innerHTML = '<div class="flex justify-center py-20"><div class="spinner"></div></div>';
        }

        db.collection('auditLog')
            .orderBy('createdAt', 'desc')
            .limit(self.currentLimit)
            .get()
            .then(function(snap) {
                self.rawEntries = [];
                snap.forEach(function(doc) {
                    var d = doc.data();
                    d.id = doc.id;
                    self.rawEntries.push(d);
                });
                
                self.isLoading = false;
                self.populateModulDropdown();
                self.applyFilter();
            })
            .catch(function(err) {
                self.isLoading = false;
                console.warn('Gagal mengambil auditLog:', err.message || err);
                var container = document.getElementById('audit-trail-content');
                if (container) {
                    container.innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-red-200 dark:border-red-900/30 p-8 text-center text-red-500 text-sm flex flex-col items-center gap-3">' +
                        '<i data-lucide="alert-triangle" class="w-10 h-10"></i>' +
                        '<span>Gagal memuat jejak audit: ' + Utils.escapeHtml(err.message) + '</span>' +
                        '</div>';
                    if (window.lucide) lucide.createIcons();
                }
            });
    },

    loadMore: function() {
        if (this.isLoading) return;
        this.currentLimit += 500;
        this.fetchData();
    },

    populateModulDropdown: function() {
        var select = document.getElementById('at-filter-modul');
        if (!select) return;

        // Ambil list modul unik dari raw entries
        var moduls = {};
        this.rawEntries.forEach(function(entry) {
            if (entry.modul) {
                moduls[entry.modul] = true;
            }
        });

        var sortedModuls = Object.keys(moduls).sort();
        
        // Simpan nilai lama sebelum reset dropdown
        var oldValue = select.value;

        // Reset dropdown tapi sisakan opsi "Semua Modul"
        select.innerHTML = '<option value="">Semua Modul</option>';
        sortedModuls.forEach(function(mod) {
            select.innerHTML += '<option value="' + Utils.escapeHtml(mod) + '">' + Utils.escapeHtml(mod) + '</option>';
        });

        // Kembalikan nilai lama jika masih ada dalam daftar
        if (moduls[oldValue]) {
            select.value = oldValue;
        }
    },

    resetFilters: function() {
        var sInp = document.getElementById('at-search');
        var aSel = document.getElementById('at-filter-aksi');
        var mSel = document.getElementById('at-filter-modul');
        var sdInp = document.getElementById('at-start-date');
        var edInp = document.getElementById('at-end-date');

        if (sInp) sInp.value = '';
        if (aSel) aSel.value = '';
        if (mSel) mSel.value = '';
        if (sdInp) sdInp.value = '';
        if (edInp) edInp.value = '';

        this.filterSearch = '';
        this.filterAksi = '';
        this.filterModul = '';
        this.filterDateStart = '';
        this.filterDateEnd = '';

        this.applyFilter();
    },

    handleFilterChange: function() {
        var sInp = document.getElementById('at-search');
        var aSel = document.getElementById('at-filter-aksi');
        var mSel = document.getElementById('at-filter-modul');
        var sdInp = document.getElementById('at-start-date');
        var edInp = document.getElementById('at-end-date');

        this.filterSearch = sInp ? sInp.value.toLowerCase().trim() : '';
        this.filterAksi = aSel ? aSel.value : '';
        this.filterModul = mSel ? mSel.value : '';
        this.filterDateStart = sdInp ? sdInp.value : '';
        this.filterDateEnd = edInp ? edInp.value : '';

        this.applyFilter();
    },

    applyFilter: function() {
        var self = this;
        
        // Filter di client-side agar instan tanpa query index firebase yang rumit
        this.filteredEntries = this.rawEntries.filter(function(log) {
            // Filter Aksi
            if (self.filterAksi && log.aksi !== self.filterAksi) {
                return false;
            }

            // Filter Modul
            if (self.filterModul && log.modul !== self.filterModul) {
                return false;
            }

            // Dapatkan tanggal objek log
            var logDate = null;
            if (log.createdAt) {
                if (typeof log.createdAt.toDate === 'function') {
                    logDate = log.createdAt.toDate();
                } else if (log.createdAt.seconds) {
                    logDate = new Date(log.createdAt.seconds * 1000);
                }
            }

            // Filter Rentang Tanggal
            if (logDate) {
                // Set hours to 0 untuk perbandingan tanggal yang akurat
                var logDateStripped = new Date(logDate);
                logDateStripped.setHours(0,0,0,0);

                if (self.filterDateStart) {
                    var startDate = new Date(self.filterDateStart);
                    startDate.setHours(0,0,0,0);
                    if (logDateStripped < startDate) return false;
                }

                if (self.filterDateEnd) {
                    var endDate = new Date(self.filterDateEnd);
                    endDate.setHours(0,0,0,0);
                    if (logDateStripped > endDate) return false;
                }
            } else if (self.filterDateStart || self.filterDateEnd) {
                // Jika log tidak punya tanggal (sedang diproses server) tapi filter tanggal diisi, abaikan log ini
                return false;
            }

            // Filter Pencarian Teks (Oleh, Deskripsi, ID Target)
            if (self.filterSearch) {
                var oleh = (log.oleh || '').toLowerCase();
                var deskripsi = (log.deskripsi || '').toLowerCase();
                var targetId = (log.targetId || '').toLowerCase();
                var role = (log.role || '').toLowerCase();
                
                if (oleh.indexOf(self.filterSearch) === -1 &&
                    deskripsi.indexOf(self.filterSearch) === -1 &&
                    targetId.indexOf(self.filterSearch) === -1 &&
                    role.indexOf(self.filterSearch) === -1) {
                    return false;
                }
            }

            return true;
        });

        this.renderStats();
        this.renderList();
    },

    renderStats: function() {
        var statsContainer = document.getElementById('at-stats-container');
        if (!statsContainer) return;

        // Hitung statistik berdasarkan data yang saat ini terlihat
        var totalLoaded = this.rawEntries.length;
        var totalFiltered = this.filteredEntries.length;
        
        // Total nominal finansial yang terdampak
        var totalNominal = 0;
        var operatorUnik = {};
        var aksiCounts = {};

        this.filteredEntries.forEach(function(log) {
            if (typeof log.nominal === 'number' && log.nominal !== null) {
                totalNominal += log.nominal;
            }
            if (log.oleh) {
                operatorUnik[log.oleh] = true;
            }
            if (log.aksi) {
                aksiCounts[log.aksi] = (aksiCounts[log.aksi] || 0) + 1;
            }
        });

        var activeOperators = Object.keys(operatorUnik).length;
        var topAksi = Object.entries(aksiCounts).sort(function(a, b) { return b[1] - a[1]; })[0];
        var topAksiStr = topAksi ? topAksi[0].toUpperCase() + ' (' + topAksi[1] + 'x)' : '-';

        var html = '';
        
        // Card 1: Total Aktivitas
        html += '    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm flex items-center gap-3">';
        html += '      <div class="p-2 rounded-lg bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400">';
        html += '        <i data-lucide="activity" class="w-5 h-5"></i>';
        html += '      </div>';
        html += '      <div>';
        html += '        <p class="text-xs text-slate-400 font-medium">Aktivitas Terfilter</p>';
        html += '        <p class="text-lg font-bold text-gray-800 dark:text-white">' + totalFiltered + ' <span class="text-xs text-slate-400 font-normal">dari ' + totalLoaded + '</span></p>';
        html += '      </div>';
        html += '    </div>';

        // Card 2: Total Nominal Finansial
        html += '    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm flex items-center gap-3">';
        html += '      <div class="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">';
        html += '        <i data-lucide="dollar-sign" class="w-5 h-5"></i>';
        html += '      </div>';
        html += '      <div>';
        html += '        <p class="text-xs text-slate-400 font-medium">Perputaran Dana</p>';
        html += '        <p class="text-lg font-bold text-emerald-600 dark:text-emerald-400">' + Utils.formatRupiah(totalNominal) + '</p>';
        html += '      </div>';
        html += '    </div>';

        // Card 3: Operator Aktif
        html += '    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm flex items-center gap-3">';
        html += '      <div class="p-2 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400">';
        html += '        <i data-lucide="user" class="w-5 h-5"></i>';
        html += '      </div>';
        html += '      <div>';
        html += '        <p class="text-xs text-slate-400 font-medium">Operator Aktif</p>';
        html += '        <p class="text-lg font-bold text-gray-800 dark:text-white">' + activeOperators + ' <span class="text-xs text-slate-400 font-normal">user</span></p>';
        html += '      </div>';
        html += '    </div>';

        // Card 4: Aksi Terbanyak
        html += '    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm flex items-center gap-3">';
        html += '      <div class="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">';
        html += '        <i data-lucide="shield-alert" class="w-5 h-5"></i>';
        html += '      </div>';
        html += '      <div>';
        html += '        <p class="text-xs text-slate-400 font-medium">Aksi Dominan</p>';
        html += '        <p class="text-sm font-bold text-gray-800 dark:text-white truncate" title="' + topAksiStr + '">' + topAksiStr + '</p>';
        html += '      </div>';
        html += '    </div>';

        statsContainer.innerHTML = html;
        if (window.lucide) lucide.createIcons();
    },

    renderList: function() {
        var container = document.getElementById('audit-trail-content');
        if (!container) return;

        if (this.filteredEntries.length === 0) {
            container.innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">' +
                '<i data-lucide="history" class="w-12 h-12 text-slate-300 dark:text-slate-600"></i>' +
                '<p class="font-semibold text-slate-500">Tidak ada aktivitas ditemukan</p>' +
                '<p class="text-xs text-slate-400">Coba ubah filter atau pencarian Anda</p>' +
                '</div>';
            if (window.lucide) lucide.createIcons();
            return;
        }

        var aksiBadge = {
            tambah:  'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-blue-100 dark:border-blue-800/40',
            ubah:    'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 border-amber-100 dark:border-amber-800/40',
            hapus:   'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 border-red-100 dark:border-red-800/40',
            approve: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 border-green-100 dark:border-green-800/40',
            tolak:   'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400 border-slate-200 dark:border-slate-700/50',
            bayar:   'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 border-purple-100 dark:border-purple-800/40',
            lainnya: 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400 border-sky-100 dark:border-sky-800/40'
        };

        // TABLE VIEW (DESKTOP) & CARD VIEW (MOBILE) COMBINED
        var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">';
        
        // Responsive Table Wrapper
        html += '  <div class="hidden md:block overflow-x-auto">';
        html += '    <table class="w-full text-sm text-left">';
        html += '      <thead class="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700">';
        html += '        <tr>';
        html += '          <th class="px-5 py-3.5 font-semibold">Waktu & Tanggal</th>';
        html += '          <th class="px-4 py-3.5 font-semibold">Aksi</th>';
        html += '          <th class="px-4 py-3.5 font-semibold">Modul</th>';
        html += '          <th class="px-5 py-3.5 font-semibold">Deskripsi Aktivitas</th>';
        html += '          <th class="px-4 py-3.5 font-semibold">Operator</th>';
        html += '          <th class="px-5 py-3.5 font-semibold text-right">Nominal</th>';
        html += '        </tr>';
        html += '      </thead>';
        html += '      <tbody class="divide-y divide-slate-100 dark:divide-slate-700">';

        this.filteredEntries.forEach(function(log) {
            var waktu = '-';
            if (log.createdAt) {
                var d = new Date();
                if (typeof log.createdAt.toDate === 'function') {
                    d = log.createdAt.toDate();
                } else if (log.createdAt.seconds) {
                    d = new Date(log.createdAt.seconds * 1000);
                }
                waktu = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' +
                        d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            }
            
            var badgeClass = aksiBadge[log.aksi] || aksiBadge.lainnya;
            var nominalHtml = '-';
            if (typeof log.nominal === 'number' && log.nominal !== null) {
                nominalHtml = '<span class="font-bold text-slate-700 dark:text-slate-200">' + Utils.formatRupiah(log.nominal) + '</span>';
            }

            var labelRole = log.role ? '<span class="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded ml-1 font-mono uppercase">' + Utils.escapeHtml(log.role) + '</span>' : '';

            html += '    <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">';
            html += '      <td class="px-5 py-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">' + waktu + '</td>';
            html += '      <td class="px-4 py-4 whitespace-nowrap">';
            html += '        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border ' + badgeClass + '">' + (log.aksi || 'lainnya').toUpperCase() + '</span>';
            html += '      </td>';
            html += '      <td class="px-4 py-4 whitespace-nowrap text-xs font-semibold text-slate-600 dark:text-slate-300">' + Utils.escapeHtml(log.modul || '-') + '</td>';
            html += '      <td class="px-5 py-4 text-gray-700 dark:text-slate-200 text-xs leading-relaxed">';
            html += '        <p class="font-medium">' + Utils.escapeHtml(log.deskripsi || '-') + '</p>';
            if (log.targetId) {
                html += '    <span class="text-[10px] text-slate-400 dark:text-slate-500 font-mono">ID: ' + Utils.escapeHtml(log.targetId) + '</span>';
            }
            html += '      </td>';
            html += '      <td class="px-4 py-4 whitespace-nowrap text-xs text-gray-700 dark:text-slate-200">';
            html += '        <div class="flex items-center gap-1.5">';
            html += '          <span class="font-semibold">' + Utils.escapeHtml(log.oleh || '-') + '</span>';
            html += '          ' + labelRole;
            html += '        </div>';
            html += '      </td>';
            html += '      <td class="px-5 py-4 text-right whitespace-nowrap text-xs font-semibold">' + nominalHtml + '</td>';
            html += '    </tr>';
        });

        html += '      </tbody>';
        html += '    </table>';
        html += '  </div>';

        // MOBILE CARD LIST VIEW
        html += '  <div class="block md:hidden divide-y divide-slate-100 dark:divide-slate-700">';
        this.filteredEntries.forEach(function(log) {
            var waktu = '-';
            if (log.createdAt) {
                var d = new Date();
                if (typeof log.createdAt.toDate === 'function') {
                    d = log.createdAt.toDate();
                } else if (log.createdAt.seconds) {
                    d = new Date(log.createdAt.seconds * 1000);
                }
                waktu = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            }

            var badgeClass = aksiBadge[log.aksi] || aksiBadge.lainnya;
            var labelRole = log.role ? '<span class="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1 py-0.5 rounded ml-1 font-mono uppercase">' + Utils.escapeHtml(log.role) + '</span>' : '';

            html += '  <div class="p-4 space-y-2 text-xs">';
            html += '    <div class="flex items-center justify-between gap-2">';
            html += '      <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full border ' + badgeClass + '">' + (log.aksi || 'lainnya').toUpperCase() + '</span>';
            html += '      <span class="text-[10px] text-slate-400">' + waktu + '</span>';
            html += '    </div>';
            html += '    <div class="flex justify-between items-start gap-3">';
            html += '      <div class="space-y-1 flex-1 min-w-0">';
            html += '        <p class="font-bold text-slate-800 dark:text-white leading-tight">' + Utils.escapeHtml(log.deskripsi || '-') + '</p>';
            html += '        <p class="text-slate-400 text-[10px] font-medium">Modul: ' + Utils.escapeHtml(log.modul || '-') + (log.targetId ? ' • ID: ' + Utils.escapeHtml(log.targetId) : '') + '</p>';
            html += '      </div>';
            if (typeof log.nominal === 'number' && log.nominal !== null) {
                html += '    <span class="font-bold text-emerald-600 shrink-0 text-sm">' + Utils.formatRupiah(log.nominal) + '</span>';
            }
            html += '    </div>';
            html += '    <div class="flex items-center text-slate-500 dark:text-slate-400 mt-1 pt-1.5 border-t border-slate-50 dark:border-slate-700/40 justify-between">';
            html += '      <span>Oleh: <strong class="text-slate-700 dark:text-slate-300 font-semibold">' + Utils.escapeHtml(log.oleh || '-') + '</strong>' + labelRole + '</span>';
            html += '    </div>';
            html += '  </div>';
        });
        html += '  </div>'; // End mobile cards view

        html += '</div>'; // End container card

        // PAGINATION / LOAD MORE CONTAINER
        if (this.rawEntries.length === this.currentLimit && !this.isLoading) {
            html += '<div class="flex justify-center pt-4">';
            html += '  <button onclick="AppLaporanAuditTrail.loadMore()" class="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-colors">';
            html += '    <i data-lucide="chevrons-down" class="w-4 h-4"></i> Muat 500 Aktivitas Lagi...';
            html += '  </button>';
            html += '</div>';
        } else if (this.isLoading) {
            html += '<div class="flex justify-center pt-4">';
            html += '  <div class="spinner"></div>';
            html += '</div>';
        }

        container.innerHTML = html;
        if (window.lucide) lucide.createIcons();
    },

    exportExcel: function() {
        if (this.filteredEntries.length === 0) {
            Utils.toast('Tidak ada data untuk diekspor', 'error');
            return;
        }

        try {
            if (typeof XLSX === 'undefined') {
                Utils.toast('Pustaka SheetJS (XLSX) tidak terdeteksi.', 'error');
                return;
            }

            var wb = XLSX.utils.book_new();
            var rows = [['No', 'Waktu & Tanggal', 'Aksi', 'Modul', 'Deskripsi Aktivitas', 'Operator', 'Role Operator', 'Nominal (Rp)', 'ID Target', 'Koleksi Firestore']];
            
            this.filteredEntries.forEach(function(log, idx) {
                var waktu = '-';
                if (log.createdAt) {
                    var d = new Date();
                    if (typeof log.createdAt.toDate === 'function') {
                        d = log.createdAt.toDate();
                    } else if (log.createdAt.seconds) {
                        d = new Date(log.createdAt.seconds * 1000);
                    }
                    waktu = d.toLocaleString('id-ID');
                }

                rows.push([
                    idx + 1,
                    waktu,
                    (log.aksi || 'lainnya').toUpperCase(),
                    log.modul || '-',
                    log.deskripsi || '-',
                    log.oleh || '-',
                    log.role || '-',
                    log.nominal !== null ? log.nominal : '',
                    log.targetId || '-',
                    log.koleksi || '-'
                ]);
            });

            var ws = XLSX.utils.aoa_to_sheet(rows);
            
            // Atur lebar kolom otomatis
            var wscols = [
                {wch: 5},   // No
                {wch: 22},  // Waktu
                {wch: 10},  // Aksi
                {wch: 20},  // Modul
                {wch: 45},  // Deskripsi
                {wch: 18},  // Operator
                {wch: 12},  // Role
                {wch: 15},  // Nominal
                {wch: 22},  // ID Target
                {wch: 18}   // Koleksi
            ];
            ws['!cols'] = wscols;

            XLSX.utils.book_append_sheet(wb, ws, 'Log Aktivitas');
            XLSX.writeFile(wb, 'Audit_Trail_' + Utils.today() + '.xlsx');
            Utils.toast('Excel berhasil diekspor!', 'success');
        } catch (e) {
            console.error('Gagal export Excel:', e);
            Utils.toast('Gagal export Excel: ' + e.message, 'error');
        }
    },

    exportPDF: function() {
        if (this.filteredEntries.length === 0) {
            Utils.toast('Tidak ada data untuk diekspor', 'error');
            return;
        }

        try {
            if (typeof window.jspdf === 'undefined') {
                Utils.toast('Pustaka jsPDF tidak terdeteksi.', 'error');
                return;
            }

            var { jsPDF } = window.jspdf;
            var doc = new jsPDF('p', 'mm', 'a4');

            // Header Instansi
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.setTextColor(14, 165, 233); // Primary color Sky 500
            doc.text('AULIA APOTEK & KLINIK', 14, 20);
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139); // Slate 500
            doc.text('LAPORAN AUDIT TRAIL & LOG AKTIVITAS SISTEM', 14, 25);
            doc.text('Diekspor oleh: ' + (window.currentUserName || 'Sistem') + ' | Tanggal: ' + new Date().toLocaleString('id-ID'), 14, 30);
            
            // Tulis info filter jika aktif
            var filters = [];
            if (this.filterAksi) filters.push('Aksi: ' + this.filterAksi.toUpperCase());
            if (this.filterModul) filters.push('Modul: ' + this.filterModul);
            if (this.filterSearch) filters.push('Cari: "' + this.filterSearch + '"');
            if (this.filterDateStart || this.filterDateEnd) {
                filters.push('Periode: ' + (this.filterDateStart || '*') + ' s/d ' + (this.filterDateEnd || '*'));
            }
            
            var yStartTable = 34;
            if (filters.length > 0) {
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(8);
                doc.text('Kriteria Filter: ' + filters.join(' | '), 14, 35);
                yStartTable = 38;
            }

            var head = [['No', 'Tanggal & Waktu', 'Aksi', 'Modul', 'Deskripsi', 'Operator', 'Nominal']];
            var body = [];
            
            this.filteredEntries.forEach(function(log, idx) {
                var waktu = '-';
                if (log.createdAt) {
                    var d = new Date();
                    if (typeof log.createdAt.toDate === 'function') {
                        d = log.createdAt.toDate();
                    } else if (log.createdAt.seconds) {
                        d = new Date(log.createdAt.seconds * 1000);
                    }
                    waktu = d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
                            d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                }
                
                var nominalFormatted = '-';
                if (typeof log.nominal === 'number' && log.nominal !== null) {
                    nominalFormatted = 'Rp ' + log.nominal.toLocaleString('id-ID');
                }

                body.push([
                    idx + 1,
                    waktu,
                    (log.aksi || 'lainnya').toUpperCase(),
                    log.modul || '-',
                    log.deskripsi || '-',
                    (log.oleh || '-') + (log.role ? ' (' + log.role + ')' : ''),
                    nominalFormatted
                ]);
            });

            doc.autoTable({
                head: head,
                body: body,
                startY: yStartTable,
                theme: 'striped',
                headStyles: { fillColor: [14, 165, 233], fontSize: 8 }, // Primary sky blue
                styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
                columnStyles: {
                    0: { cellWidth: 8 },
                    1: { cellWidth: 26 },
                    2: { cellWidth: 15 },
                    3: { cellWidth: 22 },
                    4: { cellWidth: 'auto' },
                    5: { cellWidth: 32 },
                    6: { cellWidth: 22 }
                }
            });

            doc.save('Audit_Trail_' + Utils.today() + '.pdf');
            Utils.toast('PDF berhasil diunduh!', 'success');
        } catch (e) {
            console.error('Gagal export PDF:', e);
            Utils.toast('Gagal export PDF: ' + e.message, 'error');
        }
    }
};