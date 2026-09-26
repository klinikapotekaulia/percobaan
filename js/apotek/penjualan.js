/**
 * js/apotek/penjualan.js
 * Data Penjualan — Daftar seluruh transaksi yang sudah dijalankan (Obat Bebas,
 * Resep Klinik, Resep Luar), terpisah dari halaman "Transaksi" (input penjualan baru).
 *
 * AKSES: Admin, PSA, Keuangan (lihat pengecualian menu.id === 'penjualan' di app.js
 * dan pengecekan role di init() ini sebagai lapisan kedua).
 * KHUSUS KEUANGAN: bisa mengedit data koreksi (tanggal, nama pasien, dokter luar,
 * metode bayar). Item obat/racikan/tindakan & nominal TIDAK bisa diedit dari sini
 * karena sudah memotong stok & sudah dijurnal otomatis ke Akuntansi — mengubahnya
 * lewat sini berisiko membuat stok & laporan keuangan tidak sinkron. Kalau ada
 * transaksi yang benar-benar salah nominal/itemnya, batalkan/retur lewat modul
 * terkait (Retur Obat), lalu buat transaksi baru yang benar.
 */

window.AppApotekPenjualan = {

    data: [],
    filterBulan: (window.Utils && Utils.today) ? Utils.today().slice(0, 7) : new Date().toISOString().slice(0, 7),
    filterTipe: 'semua',
    filterSearch: '',

    render: function() {
        var html = '<div class="page-enter max-w-6xl space-y-5">';

        html += '  <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">';
        html += '    <div>';
        html += '      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Penjualan</h2>';
        html += '      <p class="text-sm text-slate-500 dark:text-slate-400">Daftar seluruh transaksi yang sudah tersimpan: Obat Bebas, Resep Klinik & Resep Luar</p>';
        html += '    </div>';
        html += '  </div>';

        // Filter bar
        html += '  <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">';
        html += '    <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">';
        html += '      <div>';
        html += '        <label class="block text-xs font-semibold text-slate-500 mb-1">Periode (Bulan)</label>';
        html += '        <input type="month" id="pj-filter-bulan" onchange="AppApotekPenjualan.applyFilter()" value="' + this.filterBulan + '" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg text-sm outline-none">';
        html += '      </div>';
        html += '      <div>';
        html += '        <label class="block text-xs font-semibold text-slate-500 mb-1">Tipe Transaksi</label>';
        html += '        <select id="pj-filter-tipe" onchange="AppApotekPenjualan.applyFilter()" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg text-sm outline-none">';
        html += '          <option value="semua">Semua Tipe</option>';
        html += '          <option value="obat_bebas">Obat Bebas</option>';
        html += '          <option value="resep_klinik">Resep Klinik</option>';
        html += '          <option value="resep_luar">Resep Luar</option>';
        html += '        </select>';
        html += '      </div>';
        html += '      <div>';
        html += '        <label class="block text-xs font-semibold text-slate-500 mb-1">Cari Pasien / Dokter</label>';
        html += '        <input type="text" id="pj-filter-search" oninput="AppApotekPenjualan.applyFilter()" placeholder="Ketik nama..." class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg text-sm outline-none">';
        html += '      </div>';
        html += '      <div>';
        html += '        <button onclick="AppApotekPenjualan.init()" class="w-full bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center justify-center gap-2"><i data-lucide="refresh-cw" class="w-4 h-4"></i> Sync Realtime</button>';
        html += '      </div>';
        html += '    </div>';
        html += '  </div>';

        html += '  <div id="pj-summary-container"></div>';
        html += '  <div id="pj-table-container"><div class="flex justify-center py-16"><div class="spinner"></div></div></div>';
        html += '  <div id="modal-penjualan-container"></div>';
        html += '</div>';

        return html;
    },

    _fmtWaktu: function(ts) {
        if (!ts) return '';
        var d;
        if (ts.toDate) d = ts.toDate();
        else if (ts.seconds) d = new Date(ts.seconds * 1000);
        else d = new Date(ts);

        if (isNaN(d.getTime())) return '';
        var hh = String(d.getHours()).padStart(2, '0');
        var mm = String(d.getMinutes()).padStart(2, '0');
        var ss = String(d.getSeconds()).padStart(2, '0');
        return hh + ':' + mm + ':' + ss + ' WIB';
    },

    applyFilter: function() {
        var bulanInput = document.getElementById('pj-filter-bulan');
        var tipeInput = document.getElementById('pj-filter-tipe');
        var searchInput = document.getElementById('pj-filter-search');

        var oldBulan = this.filterBulan;
        if (bulanInput) this.filterBulan = bulanInput.value || this.filterBulan;
        if (tipeInput) this.filterTipe = tipeInput.value;
        if (searchInput) this.filterSearch = (searchInput.value || '').trim().toLowerCase();

        if (this.filterBulan !== oldBulan) {
            this.init();
        } else {
            this.renderList();
        }
    },

    init: function() {
        var self = this;
        var role = window.currentRole || 'apotek';

        if (this._unsub) {
            this._unsub();
            this._unsub = null;
        }

        if (role !== 'admin' && role !== 'psa' && role !== 'keuangan') {
            var el = document.getElementById('pj-table-container') || document.getElementById('app-content');
            if (el) el.innerHTML = '<div class="p-8 text-center text-red-500 font-bold bg-white dark:bg-slate-800 rounded-xl border">Akses Ditolak: Halaman Penjualan khusus Admin/PSA/Keuangan.</div>';
            return;
        }

        var bulanInput = document.getElementById('pj-filter-bulan');
        var tipeInput = document.getElementById('pj-filter-tipe');
        var searchInput = document.getElementById('pj-filter-search');
        if (bulanInput) this.filterBulan = bulanInput.value || this.filterBulan;
        if (tipeInput) this.filterTipe = tipeInput.value;
        if (searchInput) this.filterSearch = (searchInput.value || '').trim().toLowerCase();

        var bulan = this.filterBulan || (window.Utils && Utils.today ? Utils.today().slice(0, 7) : '');
        var startDate = bulan + '-01';
        var parts = bulan.split('-');
        var y = parseInt(parts[0], 10);
        var m = parseInt(parts[1], 10);
        var lastDay = new Date(y, m, 0).getDate();
        var endDate = parts[0] + '-' + parts[1] + '-' + String(lastDay).padStart(2, '0');

        var container = document.getElementById('pj-table-container');
        if (container && !document.getElementById('pj-table-body')) {
            container.innerHTML = '<div class="flex justify-center py-16"><div class="spinner"></div></div>';
        }

        this._unsub = db.collection('transaksi')
            .where('tanggal', '>=', startDate)
            .where('tanggal', '<=', endDate)
            .orderBy('tanggal', 'desc')
            .onSnapshot(function(snap) {
                self.data = [];
                snap.forEach(function(doc) {
                    var d = doc.data();
                    d.id = doc.id;
                    self.data.push(d);
                });
                self.data.sort(function(a, b) {
                    var ta = (a.createdAt && a.createdAt.toMillis) ? a.createdAt.toMillis() : (a.tanggal ? new Date(a.tanggal).getTime() : 0);
                    var tb = (b.createdAt && b.createdAt.toMillis) ? b.createdAt.toMillis() : (b.tanggal ? new Date(b.tanggal).getTime() : 0);
                    return tb - ta;
                });
                self.renderList();
            }, function(err) {
                if (container) container.innerHTML = '<div class="p-6 text-center text-red-500 bg-white dark:bg-slate-800 rounded-xl border">Gagal memuat data penjualan: ' + Utils.escapeHtml(err.message) + '</div>';
            });
    },

    _tipeLabel: function(tipe) {
        if (tipe === 'resep_klinik') return 'Resep Klinik';
        if (tipe === 'resep_luar') return 'Resep Luar';
        return 'Obat Bebas';
    },

    _tipeBadge: function(tipe) {
        var map = {
            obat_bebas:   'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
            resep_klinik: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
            resep_luar:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
        };
        var cls = map[tipe] || map.obat_bebas;
        return '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold ' + cls + '">' + this._tipeLabel(tipe) + '</span>';
    },

    _metodeLabel: function(m) {
        if (m === 'transfer') return 'Transfer';
        if (m === 'qris') return 'QRIS';
        return 'Cash';
    },

    _filtered: function() {
        var self = this;
        return this.data.filter(function(t) {
            if (self.filterTipe !== 'semua' && t.tipe !== self.filterTipe) return false;
            if (self.filterSearch) {
                var nama = (t.namaPasien || '').toLowerCase();
                var dokter = (t.dokterLuar || t.namaDokter || '').toLowerCase();
                if (nama.indexOf(self.filterSearch) === -1 && dokter.indexOf(self.filterSearch) === -1) return false;
            }
            return true;
        });
    },

    renderList: function() {
        var list = this._filtered();
        var self = this;

        // ===== Ringkasan =====
        var totalOmzet = 0, countObatBebas = 0, countResepKlinik = 0, countResepLuar = 0;
        list.forEach(function(t) {
            totalOmzet += t.totalAkhir || 0;
            if (t.tipe === 'resep_klinik') countResepKlinik++;
            else if (t.tipe === 'resep_luar') countResepLuar++;
            else countObatBebas++;
        });

        var sHtml = '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">';
        sHtml += '  <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4"><p class="text-xs text-slate-400 mb-1">Total Transaksi</p><p class="text-lg font-bold text-gray-800 dark:text-white">' + list.length + ' transaksi</p></div>';
        sHtml += '  <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4"><p class="text-xs text-slate-400 mb-1">Total Omzet</p><p class="text-lg font-bold text-emerald-600">' + Utils.formatRupiah(totalOmzet) + '</p></div>';
        sHtml += '  <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4"><p class="text-xs text-slate-400 mb-1">Obat Bebas / Resep Klinik</p><p class="text-lg font-bold text-gray-800 dark:text-white">' + countObatBebas + ' / ' + countResepKlinik + '</p></div>';
        sHtml += '  <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4"><p class="text-xs text-slate-400 mb-1">Resep Luar</p><p class="text-lg font-bold text-gray-800 dark:text-white">' + countResepLuar + ' transaksi</p></div>';
        sHtml += '</div>';
        var summaryEl = document.getElementById('pj-summary-container');
        if (summaryEl) summaryEl.innerHTML = sHtml;

        // ===== Tabel =====
        var role = window.currentRole || 'apotek';
        var canEdit = (role === 'keuangan');

        var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto shadow-sm">';
        if (list.length === 0) {
            html += '<div class="p-10 text-center text-slate-400 text-sm">Tidak ada data penjualan pada periode/filter ini.</div>';
        } else {
            html += '<table class="w-full text-sm">';
            html += '  <thead><tr class="border-b border-slate-100 dark:border-slate-700 text-left text-xs text-slate-400 uppercase bg-slate-50 dark:bg-slate-900/40">';
            html += '    <th class="px-4 py-3">Tanggal & Waktu</th><th class="px-4 py-3">Tipe</th><th class="px-4 py-3">Pasien</th>';
            html += '    <th class="px-4 py-3">Dokter / Sumber</th><th class="px-4 py-3">Item</th><th class="px-4 py-3">Metode</th>';
            html += '    <th class="px-4 py-3 text-right">Total</th><th class="px-4 py-3 text-center">Aksi</th>';
            html += '  </tr></thead><tbody id="pj-table-body">';

            list.forEach(function(t) {
                var jumlahItem = (t.items ? t.items.length : 0);
                var sumberLabel = '-';
                if (t.tipe === 'resep_klinik') sumberLabel = 'Resep Klinik';
                else if (t.tipe === 'resep_luar') sumberLabel = t.dokterLuar || 'Dokter Luar';

                var waktuStr = self._fmtWaktu(t.createdAt);

                html += '<tr class="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">';
                html += '  <td class="px-4 py-3 whitespace-nowrap">';
                html += '    <div class="font-bold text-slate-700 dark:text-slate-200">' + Utils.escapeHtml(t.tanggal || '-') + '</div>';
                html += '    <div class="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-0.5"><i data-lucide="clock" class="w-3 h-3 text-primary-500"></i> ' + (waktuStr || '00:00 WIB') + '</div>';
                html += '  </td>';
                html += '  <td class="px-4 py-3">' + self._tipeBadge(t.tipe) + '</td>';
                html += '  <td class="px-4 py-3 font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(t.namaPasien || 'Umum/Bebas') + '</td>';
                html += '  <td class="px-4 py-3 text-slate-500">' + Utils.escapeHtml(sumberLabel) + '</td>';
                html += '  <td class="px-4 py-3 text-slate-500">' + jumlahItem + ' item</td>';
                html += '  <td class="px-4 py-3"><span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded font-mono text-xs">' + self._metodeLabel(t.metodeBayar) + '</span></td>';
                html += '  <td class="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">' + Utils.formatRupiah(t.totalAkhir || 0) + '</td>';
                html += '  <td class="px-4 py-3 text-center whitespace-nowrap">';
                html += '    <button onclick="AppApotekPenjualan.bukaDetail(\'' + t.id + '\')" class="text-primary-600 hover:underline text-xs font-semibold mr-2">Detail</button>';
                if (canEdit) {
                    html += '    <button onclick="AppApotekPenjualan.bukaEdit(\'' + t.id + '\')" class="text-amber-600 hover:underline text-xs font-semibold mr-2">Edit</button>';
                    html += '    <button onclick="AppApotekPenjualan.hapus(\'' + t.id + '\')" class="text-rose-600 hover:underline text-xs font-semibold">Hapus</button>';
                }
                html += '  </td>';
                html += '</tr>';
            });

            html += '</tbody></table>';
        }
        html += '</div>';

        var container = document.getElementById('pj-table-container');
        if (container) container.innerHTML = html;
        if (window.lucide) lucide.createIcons();
    },

    _cari: function(id) {
        return this.data.find(function(x) { return x.id === id; });
    },

    tutupModal: function() {
        var c = document.getElementById('modal-penjualan-container');
        if (c) c.innerHTML = '';
    },

    // ===== MODAL DETAIL (read-only, semua role yang bisa buka halaman ini) =====
    bukaDetail: function(id) {
        var t = this._cari(id);
        if (!t) return;
        var self = this;
        var role = window.currentRole || 'apotek';
        var canEdit = (role === 'keuangan');

        var itemsHtml = '';
        (t.items || []).forEach(function(it) {
            itemsHtml += '<div class="flex justify-between text-xs py-1 border-b border-slate-50 dark:border-slate-700/50">';
            itemsHtml += '  <span class="text-slate-600 dark:text-slate-300">' + Utils.escapeHtml(it.namaObat || '-') + ' <span class="text-slate-400">x' + (it.jumlah || 0) + '</span></span>';
            itemsHtml += '  <span class="font-semibold text-slate-700 dark:text-slate-200">' + Utils.formatRupiah((it.jumlah || 0) * (it.hargaJual || 0)) + '</span>';
            itemsHtml += '</div>';
        });

        var tindakanHtml = '';
        (t.tindakanItems || []).forEach(function(td) {
            tindakanHtml += '<div class="flex justify-between text-xs py-1 border-b border-slate-50 dark:border-slate-700/50">';
            tindakanHtml += '  <span class="text-slate-600 dark:text-slate-300">' + Utils.escapeHtml(td.namaTindakan || '-') + '</span>';
            tindakanHtml += '  <span class="font-semibold text-slate-700 dark:text-slate-200">' + Utils.formatRupiah(td.hargaJual || 0) + '</span>';
            tindakanHtml += '</div>';
        });

        var html = '<div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">';
        html += '  <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-lg w-full p-6 space-y-4">';
        html += '    <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">';
        html += '      <div>';
        html += '        <h3 class="text-base font-black text-slate-800 dark:text-white">Detail Transaksi</h3>';
        html += '        <p class="text-xs text-slate-400">' + Utils.escapeHtml(t.tanggal || '-') + ' &middot; ' + self._tipeLabel(t.tipe) + '</p>';
        html += '      </div>';
        html += '      <button onclick="AppApotekPenjualan.tutupModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"><i data-lucide="x" class="w-5 h-5"></i></button>';
        html += '    </div>';

        html += '    <div class="text-xs space-y-1">';
        html += '      <div class="flex justify-between"><span class="text-slate-400">Pasien</span><strong class="text-slate-800 dark:text-white">' + Utils.escapeHtml(t.namaPasien || 'Umum/Bebas') + '</strong></div>';
        if (t.tipe === 'resep_luar') {
            html += '      <div class="flex justify-between"><span class="text-slate-400">Dokter Luar</span><strong class="text-slate-800 dark:text-white">' + Utils.escapeHtml(t.dokterLuar || '-') + '</strong></div>';
        }
        html += '      <div class="flex justify-between"><span class="text-slate-400">Metode Bayar</span><strong class="text-slate-800 dark:text-white">' + self._metodeLabel(t.metodeBayar) + '</strong></div>';
        html += '    </div>';

        if (itemsHtml) {
            html += '    <div><p class="text-xs font-bold text-slate-500 mb-1">Obat / Item</p>' + itemsHtml + '</div>';
        }
        if (tindakanHtml) {
            html += '    <div><p class="text-xs font-bold text-slate-500 mb-1">Tindakan</p>' + tindakanHtml + '</div>';
        }

        html += '    <div class="space-y-1 text-xs pt-2 border-t border-slate-100 dark:border-slate-700">';
        if (t.totalRacik) html += '      <div class="flex justify-between"><span class="text-slate-400">Jasa Racik</span><span>' + Utils.formatRupiah(t.totalRacik) + '</span></div>';
        if (t.jasaResep) html += '      <div class="flex justify-between"><span class="text-slate-400">Jasa Resep</span><span>' + Utils.formatRupiah(t.jasaResep) + '</span></div>';
        if (t.pembulatan) html += '      <div class="flex justify-between"><span class="text-slate-400">Pembulatan</span><span>' + Utils.formatRupiah(t.pembulatan) + '</span></div>';
        html += '      <div class="flex justify-between text-sm font-bold pt-1"><span>Total Akhir</span><span class="text-emerald-600">' + Utils.formatRupiah(t.totalAkhir || 0) + '</span></div>';
        html += '    </div>';

        html += '    <div class="flex items-center justify-end gap-2 pt-2">';
        html += '      <button onclick="AppApotekPenjualan.tutupModal()" class="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">Tutup</button>';
        if (canEdit) {
            html += '      <button onclick="AppApotekPenjualan.bukaEdit(\'' + t.id + '\')" class="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white">Edit Transaksi</button>';
        }
        html += '    </div>';

        html += '  </div></div>';

        document.getElementById('modal-penjualan-container').innerHTML = html;
        lucide.createIcons();
    },

    // ===== MODAL EDIT (khusus Keuangan) =====
    // CATATAN: sengaja hanya field metadata (tanggal, nama pasien, dokter luar,
    // metode bayar) yang bisa diedit. Item obat, jumlah, harga & total TIDAK
    // disediakan form editnya di sini karena sudah memotong stok obat dan sudah
    // dijurnal otomatis ke Akuntansi saat transaksi dibuat -- mengubahnya di sini
    // tanpa menyesuaikan stok & jurnal akan membuat data lain jadi tidak sinkron.
    bukaEdit: function(id) {
        var role = window.currentRole || 'apotek';
        if (role !== 'keuangan') {
            Utils.toast('Hanya akun Keuangan yang bisa mengedit transaksi.', 'error');
            return;
        }
        var t = this._cari(id);
        if (!t) return;

        var html = '<div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">';
        html += '  <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-lg w-full p-6 space-y-4">';
        html += '    <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">';
        html += '      <div>';
        html += '        <h3 class="text-base font-black text-slate-800 dark:text-white">Edit Transaksi</h3>';
        html += '        <p class="text-xs text-slate-400">Koreksi data non-nominal. Item & total tidak bisa diubah di sini.</p>';
        html += '      </div>';
        html += '      <button onclick="AppApotekPenjualan.tutupModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"><i data-lucide="x" class="w-5 h-5"></i></button>';
        html += '    </div>';

        html += '    <div class="space-y-3 text-xs">';
        html += '      <div>';
        html += '        <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Tanggal Transaksi</label>';
        html += '        <input type="date" id="edit-pj-tanggal" value="' + Utils.escapeHtml(t.tanggal || '') + '" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:border-amber-500">';
        html += '      </div>';
        html += '      <div>';
        html += '        <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Nama Pasien</label>';
        html += '        <input type="text" id="edit-pj-pasien" value="' + Utils.escapeHtml(t.namaPasien || '') + '" placeholder="Umum/Bebas" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:border-amber-500">';
        html += '      </div>';
        if (t.tipe === 'resep_luar') {
            html += '      <div>';
            html += '        <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Dokter Luar</label>';
            html += '        <input type="text" id="edit-pj-dokterluar" value="' + Utils.escapeHtml(t.dokterLuar || '') + '" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:border-amber-500">';
            html += '      </div>';
        }
        html += '      <div>';
        html += '        <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Metode Bayar</label>';
        html += '        <select id="edit-pj-metode" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:border-amber-500">';
        ['cash', 'transfer', 'qris'].forEach(function(m) {
            html += '<option value="' + m + '" ' + (t.metodeBayar === m ? 'selected' : '') + '>' + (m === 'cash' ? 'Cash' : (m === 'transfer' ? 'Transfer' : 'QRIS')) + '</option>';
        });
        html += '        </select>';
        html += '      </div>';
        html += '      <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900 rounded-xl p-3 text-[11px] text-amber-700 dark:text-amber-300">';
        html += '        Total transaksi (' + Utils.formatRupiah(t.totalAkhir || 0) + ') & rincian item tidak bisa diubah dari sini karena sudah terhitung ke stok obat & jurnal akuntansi.';
        html += '      </div>';
        html += '    </div>';

        html += '    <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">';
        html += '      <button onclick="AppApotekPenjualan.tutupModal()" class="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">Batal</button>';
        html += '      <button onclick="AppApotekPenjualan.simpanEdit(\'' + id + '\')" class="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow flex items-center gap-1.5"><i data-lucide="save" class="w-4 h-4"></i> Simpan Koreksi</button>';
        html += '    </div>';

        html += '  </div></div>';

        document.getElementById('modal-penjualan-container').innerHTML = html;
        lucide.createIcons();
    },

    simpanEdit: function(id) {
        var role = window.currentRole || 'apotek';
        if (role !== 'keuangan') {
            Utils.toast('Hanya akun Keuangan yang bisa mengedit transaksi.', 'error');
            return;
        }
        var t = this._cari(id);
        if (!t) return;

        var tanggalBaru = document.getElementById('edit-pj-tanggal').value;
        var pasienBaru = document.getElementById('edit-pj-pasien').value.trim();
        var metodeBaru = document.getElementById('edit-pj-metode').value;
        var dokterLuarEl = document.getElementById('edit-pj-dokterluar');
        var dokterLuarBaru = dokterLuarEl ? dokterLuarEl.value.trim() : t.dokterLuar;

        if (!tanggalBaru) { Utils.toast('Tanggal tidak boleh kosong', 'error'); return; }

        var update = {
            tanggal: tanggalBaru,
            namaPasien: pasienBaru,
            metodeBayar: metodeBaru
        };
        if (t.tipe === 'resep_luar') update.dokterLuar = dokterLuarBaru;

        var self = this;
        Utils.toast('Menyimpan koreksi...', 'info');
        db.collection('transaksi').doc(id).update(update).then(function() {
            Utils.toast('Transaksi berhasil dikoreksi.', 'success');
            if (window.AuditLog) {
                AuditLog.catat({
                    aksi: 'ubah',
                    modul: 'Penjualan',
                    koleksi: 'transaksi',
                    targetId: id,
                    deskripsi: 'Koreksi data transaksi penjualan (' + self._tipeLabel(t.tipe) + ') tanggal ' +
                        (t.tanggal || '-') + ' -> ' + tanggalBaru + ', pasien "' + (t.namaPasien || '-') + '" -> "' + pasienBaru + '"',
                    nominal: t.totalAkhir || 0
                });
            }
            self.tutupModal();
            self.init();
        }).catch(function(err) {
            Utils.toast('Gagal menyimpan koreksi: ' + err.message, 'error');
        });
    },

    hapus: function(id) {
        var role = window.currentRole || 'apotek';
        if (role !== 'keuangan' && role !== 'admin' && role !== 'psa') {
            Utils.toast('Hanya akun Keuangan / Admin yang bisa menghapus transaksi.', 'error');
            return;
        }
        var t = this._cari(id);
        if (!t) return;

        if (!confirm('Apakah Anda yakin ingin menghapus transaksi ini (' + Utils.formatRupiah(t.totalAkhir || 0) + ')?\n\n- Stok obat akan dikembalikan otomatis ke persediaan.\n- Data Keuangan, Akuntansi & Payroll akan disinkronkan.')) {
            return;
        }

        var self = this;
        Utils.toast('Menghapus transaksi & mengembalikan stok...', 'info');

        var stockPromises = [];

        if (Array.isArray(t.items)) {
            t.items.forEach(function(it) {
                var obatId = it.id || it.obatId;
                var qty = Number(it.jumlah) || 0;
                if (obatId && qty > 0) {
                    var obatRef = db.collection('obat').doc(obatId);
                    stockPromises.push(
                        obatRef.update({
                            stok: firebase.firestore.FieldValue.increment(qty)
                        }).catch(function(e) {
                            console.error('Gagal kembalikan stok obat ' + obatId + ':', e);
                        })
                    );
                }
            });
        }

        if (t.resepId) {
            stockPromises.push(
                db.collection('rekamMedis').doc(t.resepId).update({
                    statusResep: 'menunggu'
                }).catch(function(e) {
                    console.error('Gagal reset status resep:', e);
                })
            );
        }

        Promise.all(stockPromises).then(function() {
            return db.collection('transaksi').doc(id).delete();
        }).then(function() {
            if (window.AuditLog) {
                AuditLog.catat({
                    aksi: 'hapus',
                    modul: 'Penjualan',
                    koleksi: 'transaksi',
                    targetId: id,
                    deskripsi: 'Menghapus transaksi ' + (t.tipe || 'obat_bebas') + ' pasien ' + (t.namaPasien || '-') + ' senilai ' + Utils.formatRupiah(t.totalAkhir || 0) + '. Stok obat telah dikembalikan.',
                    nominal: t.totalAkhir || 0
                });
            }

            db.collection('voidLog').add({
                transaksiId: id,
                tipe: t.tipe || 'obat_bebas',
                namaPasien: t.namaPasien || '-',
                total: t.totalAkhir || 0,
                alasan: 'Dihapus oleh Role Keuangan / Administrator',
                user: (window.currentUserEmail || 'Keuangan'),
                tanggal: Utils.today(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(function(){});

            Utils.toast('Transaksi berhasil dihapus & stok obat dikembalikan!', 'success');
            self.tutupModal();
            self.init();
        }).catch(function(err) {
            Utils.toast('Gagal menghapus transaksi: ' + err.message, 'error');
        });
    }
};