/**
 * js/manajemen/voidlog.js
 * Detektor Void & Koreksi — Pemantauan audit pembatalan transaksi, retur obat, dan koreksi stok.
 * Hanya dapat diakses oleh akun PSA dan Keuangan.
 */

window.AppManajemenVoidlog = {
    rawEntries: [],
    filteredEntries: [],
    filterDateStart: '',
    filterDateEnd: '',
    filterSearch: '',

    render: function() {
        var html = '<div class="page-enter max-w-5xl space-y-6">';
        
        // Header
        html += '<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-5">';
        html += '  <div>';
        html += '    <h2 class="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">';
        html += '      <i data-lucide="shield-alert" class="w-6 h-6 text-red-500 animate-pulse"></i> Detektor Void & Koreksi';
        html += '    </h2>';
        html += '    <p class="text-sm text-slate-500 dark:text-slate-400">Pengawasan real-time terhadap pembatalan transaksi (void), retur obat refund, dan pengurangan stok manual</p>';
        html += '  </div>';
        html += '</div>';

        // Stats Cards Grid
        html += '<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6" id="void-stats-container">';
        html += '  <div class="bg-white dark:bg-slate-800 border rounded-xl p-4 shadow-sm animate-pulse h-20"></div>';
        html += '  <div class="bg-white dark:bg-slate-800 border rounded-xl p-4 shadow-sm animate-pulse h-20"></div>';
        html += '  <div class="bg-white dark:bg-slate-800 border rounded-xl p-4 shadow-sm animate-pulse h-20"></div>';
        html += '</div>';

        // Filter Bar Card
        html += '<div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">';
        html += '  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">';
        
        // Search
        html += '    <div class="flex flex-col">';
        html += '      <label class="text-xs font-semibold text-slate-500 mb-1">Cari Operator / Deskripsi</label>';
        html += '      <div class="relative">';
        html += '        <input type="text" id="vl-search" oninput="AppManajemenVoidlog.handleFilterChange()" class="w-full pl-8 pr-3 py-2 border border-slate-300 dark:bg-slate-700 dark:border-slate-600 dark:text-white rounded-lg text-sm outline-none focus:border-primary-500" placeholder="Ketik nama / deskripsi...">';
        html += '        <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-2.5 top-3"></i>';
        html += '      </div>';
        html += '    </div>';

        // Start Date
        html += '    <div class="flex flex-col">';
        html += '      <label class="text-xs font-semibold text-slate-500 mb-1">Dari Tanggal</label>';
        html += '      <input type="date" id="vl-start-date" onchange="AppManajemenVoidlog.handleFilterChange()" class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:border-slate-600 dark:text-white rounded-lg text-sm outline-none focus:border-primary-500">';
        html += '    </div>';

        // End Date
        html += '    <div class="flex flex-col">';
        html += '      <label class="text-xs font-semibold text-slate-500 mb-1">Sampai Tanggal</label>';
        html += '      <div class="flex gap-2">';
        html += '        <input type="date" id="vl-end-date" onchange="AppManajemenVoidlog.handleFilterChange()" class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:border-slate-600 dark:text-white rounded-lg text-sm outline-none flex-1 focus:border-primary-500">';
        html += '        <button onclick="AppManajemenVoidlog.resetFilters()" title="Reset Filter" class="p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 text-slate-500 hover:text-red-500 rounded-lg flex items-center justify-center transition-colors">';
        html += '          <i data-lucide="rotate-ccw" class="w-4 h-4"></i>';
        html += '        </button>';
        html += '      </div>';
        html += '    </div>';

        html += '  </div>';
        html += '</div>';

        // List Area
        html += '<div id="void-list-content"><div class="flex justify-center py-20"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        var self = this;
        var role = window.currentRole || '';
        
        // Memastikan hanya PSA dan Keuangan yang memiliki akses
        if (role !== 'psa' && role !== 'keuangan') {
            var el = document.getElementById('void-list-content');
            if (el) el.innerHTML = '<div class="bg-red-50 text-red-600 p-4 rounded-lg">Akses Ditolak. Halaman ini hanya untuk PSA dan Keuangan.</div>';
            return;
        }

        self.fetchVoidAndCorrectionLogs();
    },

    fetchVoidAndCorrectionLogs: function() {
        var self = this;
        
        // Memuat 500 logs dari auditLog terbaru untuk di-filter di sisi client
        db.collection('auditLog')
            .orderBy('createdAt', 'desc')
            .limit(500)
            .get()
            .then(function(snap) {
                var logs = [];
                snap.forEach(function(doc) {
                    var d = doc.data();
                    d.id = doc.id;
                    
                    var aksi = (d.aksi || '').toLowerCase();
                    var desc = (d.deskripsi || '').toLowerCase();
                    var modul = (d.modul || '').toLowerCase();
                    
                    // Filter untuk mencari entri yang berkaitan dengan Void, Penghapusan, Retur, atau Koreksi Finansial
                    var isVoidOrCorrection = 
                        aksi === 'hapus' || 
                        aksi === 'tolak' ||
                        modul.indexOf('retur') !== -1 ||
                        desc.indexOf('batal') !== -1 ||
                        desc.indexOf('void') !== -1 ||
                        desc.indexOf('hapus') !== -1 ||
                        desc.indexOf('koreksi') !== -1 ||
                        desc.indexOf('selisih') !== -1 ||
                        desc.indexOf('kurang') !== -1 ||
                        desc.indexOf('refund') !== -1;

                    if (isVoidOrCorrection) {
                        logs.push(d);
                    }
                });
                
                self.rawEntries = logs;
                self.applyFilter();
            })
            .catch(function(err) {
                console.error('[Void Detector] Error:', err);
                var el = document.getElementById('void-list-content');
                if (el) el.innerHTML = '<div class="bg-red-50 text-red-600 p-4 rounded-lg">Gagal memuat log audit: ' + Utils.escapeHtml(err.message) + '</div>';
            });
    },

    resetFilters: function() {
        var sInp = document.getElementById('vl-search');
        var sdInp = document.getElementById('vl-start-date');
        var edInp = document.getElementById('vl-end-date');

        if (sInp) sInp.value = '';
        if (sdInp) sdInp.value = '';
        if (edInp) edInp.value = '';

        this.filterSearch = '';
        this.filterDateStart = '';
        this.filterDateEnd = '';

        this.applyFilter();
    },

    handleFilterChange: function() {
        var sInp = document.getElementById('vl-search');
        var sdInp = document.getElementById('vl-start-date');
        var edInp = document.getElementById('vl-end-date');

        this.filterSearch = sInp ? sInp.value.toLowerCase().trim() : '';
        this.filterDateStart = sdInp ? sdInp.value : '';
        this.filterDateEnd = edInp ? edInp.value : '';

        this.applyFilter();
    },

    applyFilter: function() {
        var self = this;
        
        self.filteredEntries = self.rawEntries.filter(function(log) {
            // Rentang Tanggal
            var logDate = null;
            if (log.createdAt) {
                if (typeof log.createdAt.toDate === 'function') {
                    logDate = log.createdAt.toDate();
                } else if (log.createdAt.seconds) {
                    logDate = new Date(log.createdAt.seconds * 1000);
                }
            }

            if (logDate) {
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
                return false;
            }

            // Pencarian Teks
            if (self.filterSearch) {
                var oleh = (log.oleh || '').toLowerCase();
                var deskripsi = (log.deskripsi || '').toLowerCase();
                var modul = (log.modul || '').toLowerCase();
                var role = (log.role || '').toLowerCase();

                if (oleh.indexOf(self.filterSearch) === -1 &&
                    deskripsi.indexOf(self.filterSearch) === -1 &&
                    modul.indexOf(self.filterSearch) === -1 &&
                    role.indexOf(self.filterSearch) === -1) {
                    return false;
                }
            }

            return true;
        });

        self.renderStats();
        self.renderList();
    },

    renderStats: function() {
        var statsContainer = document.getElementById('void-stats-container');
        if (!statsContainer) return;

        var totalEvents = this.filteredEntries.length;
        var totalNominalDiscrepancy = 0;
        var operatorCounts = {};

        this.filteredEntries.forEach(function(log) {
            if (typeof log.nominal === 'number' && log.nominal !== null) {
                totalNominalDiscrepancy += log.nominal;
            }
            if (log.oleh) {
                operatorCounts[log.oleh] = (operatorCounts[log.oleh] || 0) + 1;
            }
        });

        var topOperator = Object.entries(operatorCounts).sort(function(a, b) { return b[1] - a[1]; })[0];
        var topOperatorStr = topOperator ? topOperator[0] + ' (' + topOperator[1] + 'x)' : '-';

        var html = '';

        // Card 1: Total Peristiwa Void/Koreksi
        html += '<div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm flex items-center gap-3">';
        html += '  <div class="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"><i data-lucide="shield-alert" class="w-5 h-5"></i></div>';
        html += '  <div>';
        html += '    <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Koreksi/Void Terdeteksi</span>';
        html += '    <span class="text-xl font-bold text-slate-800 dark:text-white">' + totalEvents + ' Insiden</span>';
        html += '  </div>';
        html += '</div>';

        // Card 2: Potensi Nominal / Refund / Kerugian
        html += '<div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm flex items-center gap-3">';
        html += '  <div class="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"><i data-lucide="coins" class="w-5 h-5"></i></div>';
        html += '  <div>';
        html += '    <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Discrepancy / Nilai Terkoreksi</span>';
        html += '    <span class="text-xl font-bold text-amber-600 dark:text-amber-400">' + Utils.formatRupiah(totalNominalDiscrepancy) + '</span>';
        html += '  </div>';
        html += '</div>';

        // Card 3: Operator Paling Sering melakukan Koreksi
        html += '<div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm flex items-center gap-3">';
        html += '  <div class="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"><i data-lucide="user-minus" class="w-5 h-5"></i></div>';
        html += '  <div>';
        html += '    <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Operator Teraktif</span>';
        html += '    <span class="text-xl font-bold text-slate-800 dark:text-white truncate max-w-[180px] inline-block" title="' + topOperatorStr + '">' + topOperatorStr + '</span>';
        html += '  </div>';
        html += '</div>';

        statsContainer.innerHTML = html;
        if (window.lucide) lucide.createIcons({ el: statsContainer });
    },

    renderList: function() {
        var container = document.getElementById('void-list-content');
        if (!container) return;

        if (this.filteredEntries.length === 0) {
            container.innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">' +
                '<i data-lucide="shield-check" class="w-12 h-12 text-emerald-500"></i>' +
                '<p class="font-semibold text-slate-500">Aman. Tidak ada peristiwa void/koreksi mencurigakan</p>' +
                '</div>';
            if (window.lucide) lucide.createIcons();
            return;
        }

        var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">';
        html += '  <div class="overflow-x-auto">';
        html += '    <table class="w-full text-sm">';
        html += '      <thead>';
        html += '        <tr class="bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">';
        html += '          <th class="px-6 py-4 text-left">Waktu & Tanggal</th>';
        html += '          <th class="px-6 py-4 text-left">Aksi</th>';
        html += '          <th class="px-6 py-4 text-left">Modul</th>';
        html += '          <th class="px-6 py-4 text-left">Deskripsi Kejadian</th>';
        html += '          <th class="px-6 py-4 text-left">Pelaksana</th>';
        html += '          <th class="px-6 py-4 text-right">Nilai Terkoreksi</th>';
        html += '        </tr>';
        html += '      </thead>';
        html += '      <tbody class="divide-y divide-slate-200 dark:divide-slate-700">';

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

            var badgeColor = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/30';
            if (log.aksi === 'tolak') {
                badgeColor = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/30';
            }

            var nominalHtml = '-';
            if (typeof log.nominal === 'number' && log.nominal !== null) {
                nominalHtml = '<span class="font-bold text-red-600 dark:text-red-400">' + Utils.formatRupiah(log.nominal) + '</span>';
            }

            html += '        <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">';
            html += '          <td class="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">' + waktu + '</td>';
            html += '          <td class="px-6 py-4 whitespace-nowrap">';
            html += '            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ' + badgeColor + '">' + (log.aksi || 'lainnya').toUpperCase() + '</span>';
            html += '          </td>';
            html += '          <td class="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-700 dark:text-slate-300">' + Utils.escapeHtml(log.modul || '-') + '</td>';
            html += '          <td class="px-6 py-4 text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">';
            html += '            <p>' + Utils.escapeHtml(log.deskripsi || '-') + '</p>';
            if (log.targetId) {
                html += '            <span class="text-[10px] text-slate-400 font-mono">ID Dokumen: ' + Utils.escapeHtml(log.targetId) + '</span>';
            }
            html += '          </td>';
            html += '          <td class="px-6 py-4 whitespace-nowrap text-xs">';
            html += '            <span class="font-semibold text-slate-800 dark:text-slate-200">' + Utils.escapeHtml(log.oleh || '-') + '</span>';
            if (log.role) {
                html += '            <span class="text-[9px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 px-1.5 py-0.5 rounded ml-1 uppercase">' + Utils.escapeHtml(log.role) + '</span>';
            }
            html += '          </td>';
            html += '          <td class="px-6 py-4 text-right whitespace-nowrap text-xs font-bold">' + nominalHtml + '</td>';
            html += '        </tr>';
        });

        html += '      </tbody>';
        html += '    </table>';
        html += '  </div>';
        html += '</div>';

        container.innerHTML = html;
        if (window.lucide) lucide.createIcons({ el: container });
    },

    destroy: function() {
        // No snapshot unsubscribe needed
    }
};
