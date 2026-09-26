/**
 * js/apotek/notifikasi.js
 * Notifikasi Stok Menipis & Obat Mendekati Kadaluarsa
 *
 * FITUR:
 * - Tampilkan daftar obat di bawah stok minimum
 * - Tampilkan obat yang kadaluarsa dalam 30/60/90 hari ke depan
 * - Ekspor laporan sebagai teks untuk dikirim ke supplier
 * - Badge jumlah alert di sidebar (dipanggil dari app.js)
 *
 * FIRESTORE COLLECTIONS YANG DIPAKAI:
 *   - obat  { namaObat, kodeObat, stok, stokMinimum, satuan, tanggalKadaluarsa, hpp }
 *
 * CARA PASANG:
 *   1. Tambahkan file ini ke daftar cache sw.js (urlsToCache)
 *   2. Tambahkan menu di app.js → menuStructure.apotek:
 *        { id: 'notifikasi', label: 'Alert Stok', icon: 'bell', module: 'apotek/notifikasi' }
 *   3. Tambahkan akses role di auth.js sesuai kebutuhan
 *   4. (Opsional) Panggil AppApotekNotifikasi.loadBadge() di app.js setelah login
 *      untuk menampilkan badge merah di sidebar.
 */

window.AppApotekNotifikasi = {

    // ===== STATE =====
    allObat: [],
    filterHari: 30,   // default: tampilkan kadaluarsa dalam 30 hari
    tab: 'stok',      // 'stok' | 'kadaluarsa'

    // ===== RENDER =====
    render: function() {
        return [
            '<div class="page-enter max-w-5xl">',
            '  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">',
            '    <div>',
            '      <h2 class="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">',
            '        <i data-lucide="bell" class="w-5 h-5 text-amber-500"></i> Alert Stok & Kadaluarsa',
            '      </h2>',
            '      <p class="text-sm text-slate-500 dark:text-slate-400">Monitor stok menipis dan obat mendekati kadaluarsa</p>',
            '    </div>',
            '    <button onclick="AppApotekNotifikasi.exportLaporan()" class="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition">',
            '      <i data-lucide="download" class="w-4 h-4"></i> Ekspor Laporan',
            '    </button>',
            '  </div>',

            // Tab pilih
            '  <div class="flex gap-2 mb-5">',
            '    <button id="tab-stok" onclick="AppApotekNotifikasi.setTab(\'stok\')"',
            '      class="tab-btn px-4 py-2 rounded-lg text-sm font-semibold transition bg-amber-500 text-white">',
            '      <i data-lucide="package-x" class="w-4 h-4 inline mr-1"></i> Stok Menipis',
            '    </button>',
            '    <button id="tab-kadaluarsa" onclick="AppApotekNotifikasi.setTab(\'kadaluarsa\')"',
            '      class="tab-btn px-4 py-2 rounded-lg text-sm font-semibold transition bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">',
            '      <i data-lucide="calendar-x" class="w-4 h-4 inline mr-1"></i> Mendekati Kadaluarsa',
            '    </button>',
            '  </div>',

            // Filter hari (hanya tampil saat tab kadaluarsa)
            '  <div id="filter-hari-wrap" class="hidden mb-4 flex items-center gap-3">',
            '    <span class="text-sm text-slate-500 dark:text-slate-400">Tampilkan kadaluarsa dalam:</span>',
            '    <select onchange="AppApotekNotifikasi.setFilterHari(this.value)" class="px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm">',
            '      <option value="30">30 hari</option>',
            '      <option value="60">60 hari</option>',
            '      <option value="90">90 hari</option>',
            '    </select>',
            '  </div>',

            '  <div id="notif-content"><div class="flex justify-center py-20"><div class="spinner"></div></div></div>',
            '</div>'
        ].join('');
    },

    // ===== INIT =====
    init: function() {
        var self = this;
        DataCache.getObat().then(function(snap) {
            self.allObat = [];
            snap.forEach(function(doc) {
                var d = doc.data(); d.id = doc.id;
                self.allObat.push(d);
            });
            self.renderContent();
        }).catch(function(err) {
            document.getElementById('notif-content').innerHTML =
                '<p class="text-red-500 text-center py-10">Gagal memuat data: ' + Utils.escapeHtml(err.message) + '</p>';
        });
    },

    // ===== TAB =====
    setTab: function(tab) {
        this.tab = tab;
        // Update style tombol
        ['stok', 'kadaluarsa'].forEach(function(t) {
            var btn = document.getElementById('tab-' + t);
            if (!btn) return;
            if (t === tab) {
                btn.className = 'tab-btn px-4 py-2 rounded-lg text-sm font-semibold transition bg-amber-500 text-white';
            } else {
                btn.className = 'tab-btn px-4 py-2 rounded-lg text-sm font-semibold transition bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
            }
        });
        var filterWrap = document.getElementById('filter-hari-wrap');
        if (filterWrap) filterWrap.className = (tab === 'kadaluarsa') ? 'mb-4 flex items-center gap-3' : 'hidden mb-4 flex items-center gap-3';
        this.renderContent();
    },

    setFilterHari: function(val) {
        this.filterHari = parseInt(val);
        this.renderContent();
    },

    // ===== RENDER CONTENT =====
    renderContent: function() {
        if (this.tab === 'stok') {
            this.renderStokMenipis();
        } else {
            this.renderKadaluarsa();
        }
        if (window.lucide) lucide.createIcons();
    },

    renderStokMenipis: function() {
        var container = document.getElementById('notif-content');
        if (!container) return;

        // Filter obat yang stok <= stokMinimum
        var list = this.allObat.filter(function(o) {
            return (o.stok || 0) <= (o.stokMinimum || 0);
        }).sort(function(a, b) {
            // Urutkan: stok 0 dulu, lalu yang paling sedikit
            return (a.stok || 0) - (b.stok || 0);
        });

        if (list.length === 0) {
            container.innerHTML = this._emptyState('package-check', 'Semua stok aman!', 'Tidak ada obat di bawah stok minimum saat ini.');
            return;
        }

        var html = '<div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-4 flex items-start gap-3">';
        html += '  <i data-lucide="triangle-alert" class="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0"></i>';
        html += '  <p class="text-sm text-amber-800 dark:text-amber-300"><strong>' + list.length + ' obat</strong> di bawah atau sama dengan stok minimum. Segera lakukan pemesanan ke supplier.</p>';
        html += '</div>';

        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
        html += '<table class="w-full text-sm">';
        html += '<thead class="bg-slate-50 dark:bg-slate-700 text-xs uppercase text-slate-500 dark:text-slate-400">';
        html += '<tr><th class="px-4 py-3 text-left">Nama Obat</th><th class="px-4 py-3 text-center">Stok Saat Ini</th><th class="px-4 py-3 text-center">Stok Minimum</th><th class="px-4 py-3 text-center">Kekurangan</th><th class="px-4 py-3 text-center">Status</th></tr>';
        html += '</thead><tbody class="divide-y divide-slate-100 dark:divide-slate-700">';

        list.forEach(function(o) {
            var stok = o.stok || 0;
            var min  = o.stokMinimum || 0;
            var kekurangan = Math.max(0, min - stok);
            var isCosong = stok === 0;

            html += '<tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50">';
            html += '<td class="px-4 py-3"><p class="font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(o.namaObat || '-') + '</p><p class="text-xs text-slate-400 font-mono">' + Utils.escapeHtml(o.kodeObat || '-') + '</p></td>';
            html += '<td class="px-4 py-3 text-center font-bold ' + (isCosong ? 'text-red-600' : 'text-amber-600') + '">' + stok + ' ' + Utils.escapeHtml(o.satuan || '') + '</td>';
            html += '<td class="px-4 py-3 text-center text-slate-600 dark:text-slate-300">' + min + ' ' + Utils.escapeHtml(o.satuan || '') + '</td>';
            html += '<td class="px-4 py-3 text-center text-slate-600 dark:text-slate-300">' + kekurangan + '</td>';
            html += '<td class="px-4 py-3 text-center">';
            if (isCosong) {
                html += '<span class="text-xs bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 font-semibold px-2 py-1 rounded-full">Habis</span>';
            } else {
                html += '<span class="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 font-semibold px-2 py-1 rounded-full">Menipis</span>';
            }
            html += '</td></tr>';
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
    },

    renderKadaluarsa: function() {
        var container = document.getElementById('notif-content');
        if (!container) return;

        var hariTarget = this.filterHari;
        var now = new Date();
        var batas = new Date();
        batas.setDate(batas.getDate() + hariTarget);
        var batasStr = Utils.dateStr(batas); // FIX: pakai tanggal lokal, bukan UTC
        var nowStr   = Utils.dateStr(now); // FIX: pakai tanggal lokal, bukan UTC

        // Filter obat yang punya tanggalKadaluarsa dan <= batas, stok > 0
        var list = this.allObat.filter(function(o) {
            return o.tanggalKadaluarsa && o.tanggalKadaluarsa <= batasStr && (o.stok || 0) > 0;
        }).sort(function(a, b) {
            return (a.tanggalKadaluarsa || '').localeCompare(b.tanggalKadaluarsa || '');
        });

        // Juga ambil yang sudah kadaluarsa
        var sudahExp = this.allObat.filter(function(o) {
            return o.tanggalKadaluarsa && o.tanggalKadaluarsa < nowStr && (o.stok || 0) > 0;
        });

        if (list.length === 0 && sudahExp.length === 0) {
            container.innerHTML = this._emptyState('calendar-check', 'Tidak ada obat mendekati kadaluarsa', 'Semua obat masih aman dalam ' + hariTarget + ' hari ke depan.');
            return;
        }

        var html = '';

        // Panel sudah kadaluarsa
        if (sudahExp.length > 0) {
            html += '<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4 flex items-start gap-3">';
            html += '  <i data-lucide="circle-x" class="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0"></i>';
            html += '  <p class="text-sm text-red-800 dark:text-red-300"><strong>' + sudahExp.length + ' obat sudah kadaluarsa</strong> dan masih ada di stok. Segera pisahkan dan lakukan pemusnahan sesuai SOP.</p>';
            html += '</div>';
        }

        if (list.length > 0) {
            html += '<div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-4 flex items-start gap-3">';
            html += '  <i data-lucide="triangle-alert" class="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0"></i>';
            html += '  <p class="text-sm text-amber-800 dark:text-amber-300"><strong>' + list.length + ' obat</strong> akan kadaluarsa dalam <strong>' + hariTarget + ' hari</strong> ke depan.</p>';
            html += '</div>';
        }

        // Gabungkan semua untuk tabel
        var allList = sudahExp.concat(list.filter(function(o) {
            return !sudahExp.find(function(e) { return e.id === o.id; });
        }));

        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
        html += '<table class="w-full text-sm">';
        html += '<thead class="bg-slate-50 dark:bg-slate-700 text-xs uppercase text-slate-500 dark:text-slate-400">';
        html += '<tr><th class="px-4 py-3 text-left">Nama Obat</th><th class="px-4 py-3 text-center">Stok</th><th class="px-4 py-3 text-center">Tgl Kadaluarsa</th><th class="px-4 py-3 text-center">Sisa Hari</th><th class="px-4 py-3 text-center">Status</th></tr>';
        html += '</thead><tbody class="divide-y divide-slate-100 dark:divide-slate-700">';

        allList.forEach(function(o) {
            var tgl = o.tanggalKadaluarsa;
            var selisih = Math.ceil((new Date(tgl) - now) / (1000 * 60 * 60 * 24));
            var sudah   = selisih < 0;
            var kritis  = selisih >= 0 && selisih <= 14;

            html += '<tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50">';
            html += '<td class="px-4 py-3"><p class="font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(o.namaObat || '-') + '</p><p class="text-xs text-slate-400 font-mono">' + Utils.escapeHtml(o.kodeObat || '-') + '</p></td>';
            html += '<td class="px-4 py-3 text-center">' + (o.stok || 0) + ' ' + Utils.escapeHtml(o.satuan || '') + '</td>';
            html += '<td class="px-4 py-3 text-center font-mono ' + (sudah ? 'text-red-600 font-bold' : '') + '">' + tgl + '</td>';
            html += '<td class="px-4 py-3 text-center ' + (sudah ? 'text-red-600 font-bold' : kritis ? 'text-amber-600 font-bold' : 'text-slate-600 dark:text-slate-300') + '">';
            html += sudah ? 'SUDAH LEWAT' : (selisih + ' hari');
            html += '</td>';
            html += '<td class="px-4 py-3 text-center">';
            if (sudah) {
                html += '<span class="text-xs bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 font-semibold px-2 py-1 rounded-full">Kadaluarsa</span>';
            } else if (kritis) {
                html += '<span class="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 font-semibold px-2 py-1 rounded-full">Kritis ≤14hr</span>';
            } else {
                html += '<span class="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 font-semibold px-2 py-1 rounded-full">Perhatian</span>';
            }
            html += '</td></tr>';
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
    },

    // ===== EKSPOR =====
    exportLaporan: function() {
        var now = new Date();
        var tglStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
        var lines = [];
        lines.push('=== LAPORAN ALERT STOK & KADALUARSA ===');
        lines.push('Tanggal: ' + tglStr);
        lines.push('');

        // Stok menipis
        var stokMenipis = this.allObat.filter(function(o) { return (o.stok || 0) <= (o.stokMinimum || 0); });
        lines.push('--- STOK MENIPIS / HABIS (' + stokMenipis.length + ' item) ---');
        if (stokMenipis.length === 0) {
            lines.push('  (tidak ada)');
        } else {
            stokMenipis.forEach(function(o) {
                lines.push('  [' + (o.kodeObat || '-') + '] ' + o.namaObat + ' — Stok: ' + (o.stok || 0) + ' ' + (o.satuan || '') + ' (min: ' + (o.stokMinimum || 0) + ')');
            });
        }
        lines.push('');

        // Kadaluarsa 60 hari
        var batas60 = new Date(); batas60.setDate(batas60.getDate() + 60);
        var batas60Str = Utils.dateStr(batas60); // FIX: pakai tanggal lokal, bukan UTC
        var nowStr = Utils.dateStr(now); // FIX: pakai tanggal lokal, bukan UTC
        var expList = this.allObat.filter(function(o) { return o.tanggalKadaluarsa && o.tanggalKadaluarsa <= batas60Str && (o.stok || 0) > 0; });
        lines.push('--- KADALUARSA DALAM 60 HARI (' + expList.length + ' item) ---');
        if (expList.length === 0) {
            lines.push('  (tidak ada)');
        } else {
            expList.forEach(function(o) {
                var selisih = Math.ceil((new Date(o.tanggalKadaluarsa) - now) / (1000 * 60 * 60 * 24));
                lines.push('  [' + (o.kodeObat || '-') + '] ' + o.namaObat + ' — Exp: ' + o.tanggalKadaluarsa + ' (' + (selisih < 0 ? 'SUDAH LEWAT' : selisih + ' hari lagi') + ') Stok: ' + (o.stok || 0) + ' ' + (o.satuan || ''));
            });
        }

        var blob = new Blob([lines.join('\n')], { type: 'text/plain' });
        var url  = URL.createObjectURL(blob);
        var a    = document.createElement('a');
        a.href   = url;
        a.download = 'alert-stok-' + Utils.dateStr(now) + '.txt'; // FIX: pakai tanggal lokal, bukan UTC
        a.click();
        URL.revokeObjectURL(url);
        Utils.toast('Laporan berhasil diunduh!', 'success');
    },

    // ===== BADGE (dipanggil dari app.js setelah login) =====
    // Mengembalikan jumlah total alert untuk ditampilkan di sidebar
    loadBadge: function(callback) {
        DataCache.getObat().then(function(snap) {
            var now = new Date();
            var batas30Str = Utils.dateStr(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)); // FIX: pakai tanggal lokal, bukan UTC
            var count = 0;
            snap.forEach(function(doc) {
                var d = doc.data();
                var stokAlert  = (d.stok || 0) <= (d.stokMinimum || 0);
                var expAlert   = d.tanggalKadaluarsa && d.tanggalKadaluarsa <= batas30Str && (d.stok || 0) > 0;
                if (stokAlert || expAlert) count++;
            });
            if (typeof callback === 'function') callback(count);
        }).catch(function() {});
    },

    // ===== HELPER =====
    _emptyState: function(icon, title, sub) {
        return '<div class="text-center py-20 text-slate-400">' +
               '<i data-lucide="' + icon + '" class="w-12 h-12 mx-auto mb-3 text-emerald-400"></i>' +
               '<p class="font-semibold text-slate-600 dark:text-slate-300">' + title + '</p>' +
               '<p class="text-sm mt-1">' + sub + '</p></div>';
    }
};