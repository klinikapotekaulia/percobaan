/**
 * js/apotek/transaksi.js
 * Transaksi Penjualan: Obat Bebas | Resep Klinik | Resep Luar
 * - Integrasi Tindakan Apotek & Klinik
 * - Jasa resep & Harga obat auto dari pengaturan
 * - Cetak Struk Anti-Popup Blocker
 */

window.AppApotekTransaksi = {

    // ========== STATE ==========
    tipe: 'obat_bebas',
    masterObat: [],
    masterTindakan: [], 
    pengaturan: null,
    resepList: [],
    antrianList: [],
    activeMainTab: 'input',
    riwayatData: [],
    // FIX (BUG LATEN idx keranjang): counter yang cuma naik terus untuk id baris
    // keranjang -- lihat catatan lengkap di addItem(). Direset tiap kali keranjang
    // dikosongkan (init() & setTipe()).
    _cartRowSeq: 0,
    // FITUR BARU: query & state untuk "Pilih dari Katalog" (grid produk ala marketplace)
    katalogSearch: '',
    riwayatFilterBulan: (window.Utils && Utils.today) ? Utils.today().slice(0, 7) : new Date().toISOString().slice(0, 7),
    riwayatFilterTipe: 'semua',
    riwayatFilterSearch: '',

    // ========== RENDER ==========
    render: function() {
        return [
            '<div class="page-enter max-w-5xl space-y-4">',
            '  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">',
            '    <div>',
            '      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Transaksi Penjualan</h2>',
            '      <p class="text-sm text-slate-500 dark:text-slate-400">Input penjualan obat bebas, resep dokter, dan riwayat transaksi</p>',
            '    </div>',
            '    <div class="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">',
            '      <button onclick="AppApotekTransaksi.switchMainTab(\'input\')" id="tab-trx-input" class="px-4 py-2 text-xs font-bold rounded-lg transition-all bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm">',
            '        <i data-lucide="plus-circle" class="w-4 h-4 inline mr-1"></i> Input Transaksi',
            '      </button>',
            '      <button onclick="AppApotekTransaksi.switchMainTab(\'riwayat\')" id="tab-trx-riwayat" class="px-4 py-2 text-xs font-bold rounded-lg transition-all text-slate-600 dark:text-slate-300 hover:text-primary-600">',
            '        <i data-lucide="history" class="w-4 h-4 inline mr-1"></i> Riwayat Transaksi',
            '      </button>',
            '    </div>',
            '  </div>',
            '  <div id="trx-content">',
            '    <div class="flex justify-center py-20"><div class="spinner"></div></div>',
            '  </div>',
            '</div>'
        ].join('');
    },

    switchMainTab: function(tab) {
        this.activeMainTab = tab;
        var btnInput = document.getElementById('tab-trx-input');
        var btnRiwayat = document.getElementById('tab-trx-riwayat');

        if (btnInput && btnRiwayat) {
            if (tab === 'input') {
                if (this._riwayatUnsub) {
                    this._riwayatUnsub();
                    this._riwayatUnsub = null;
                }
                btnInput.className = "px-4 py-2 text-xs font-bold rounded-lg transition-all bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm";
                btnRiwayat.className = "px-4 py-2 text-xs font-bold rounded-lg transition-all text-slate-600 dark:text-slate-300 hover:text-primary-600";
                this.renderForm();
            } else {
                btnRiwayat.className = "px-4 py-2 text-xs font-bold rounded-lg transition-all bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm";
                btnInput.className = "px-4 py-2 text-xs font-bold rounded-lg transition-all text-slate-600 dark:text-slate-300 hover:text-primary-600";
                this.loadRiwayat();
            }
            if (window.lucide) lucide.createIcons();
        }
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

    applyRiwayatFilter: function() {
        var bulanInput = document.getElementById('trx-filter-bulan');
        var tipeInput = document.getElementById('trx-filter-tipe');
        var searchInput = document.getElementById('trx-filter-search');

        var oldBulan = this.riwayatFilterBulan;
        if (bulanInput) this.riwayatFilterBulan = bulanInput.value || this.riwayatFilterBulan;
        if (tipeInput) this.riwayatFilterTipe = tipeInput.value;
        if (searchInput) this.riwayatFilterSearch = (searchInput.value || '').trim().toLowerCase();

        if (this.riwayatFilterBulan !== oldBulan) {
            this.loadRiwayat();
        } else {
            this.renderRiwayatView();
        }
    },

    loadRiwayat: function() {
        var self = this;
        var container = document.getElementById('trx-content');

        if (this._riwayatUnsub) {
            this._riwayatUnsub();
            this._riwayatUnsub = null;
        }

        var bulanInput = document.getElementById('trx-filter-bulan');
        var tipeInput = document.getElementById('trx-filter-tipe');
        var searchInput = document.getElementById('trx-filter-search');

        if (bulanInput) this.riwayatFilterBulan = bulanInput.value || this.riwayatFilterBulan;
        if (tipeInput) this.riwayatFilterTipe = tipeInput.value;
        if (searchInput) this.riwayatFilterSearch = (searchInput.value || '').trim().toLowerCase();

        var bulan = this.riwayatFilterBulan || (window.Utils && Utils.today ? Utils.today().slice(0, 7) : '');
        var startDate = bulan + '-01';
        var parts = bulan.split('-');
        var y = parseInt(parts[0], 10);
        var m = parseInt(parts[1], 10);
        var lastDay = new Date(y, m, 0).getDate();
        var endDate = parts[0] + '-' + parts[1] + '-' + String(lastDay).padStart(2, '0');

        if (container && !document.getElementById('trx-table-riwayat-body')) {
            container.innerHTML = '<div class="flex justify-center py-20"><div class="spinner"></div></div>';
        }

        this._riwayatUnsub = db.collection('transaksi')
            .where('tanggal', '>=', startDate)
            .where('tanggal', '<=', endDate)
            .orderBy('tanggal', 'desc')
            .onSnapshot(function(snap) {
                self.riwayatData = [];
                snap.forEach(function(doc) {
                    var d = doc.data();
                    d.id = doc.id;
                    self.riwayatData.push(d);
                });
                self.riwayatData.sort(function(a, b) {
                    var ta = (a.createdAt && a.createdAt.toMillis) ? a.createdAt.toMillis() : (a.tanggal ? new Date(a.tanggal).getTime() : 0);
                    var tb = (b.createdAt && b.createdAt.toMillis) ? b.createdAt.toMillis() : (b.tanggal ? new Date(b.tanggal).getTime() : 0);
                    return tb - ta;
                });
                self.renderRiwayatView();
            }, function(err) {
                if (container) container.innerHTML = '<div class="p-6 text-center text-red-500 bg-white dark:bg-slate-800 rounded-xl border">Gagal memuat riwayat transaksi realtime: ' + Utils.escapeHtml(err.message) + '</div>';
            });
    },

    renderRiwayatView: function() {
        var self = this;
        var role = window.currentRole || 'apotek';
        var canEditDelete = (role === 'keuangan' || role === 'admin' || role === 'psa');

        var filtered = this.riwayatData.filter(function(t) {
            if (self.riwayatFilterTipe !== 'semua' && t.tipe !== self.riwayatFilterTipe) return false;
            if (self.riwayatFilterSearch) {
                var nama = (t.namaPasien || '').toLowerCase();
                var dokter = (t.dokterLuar || t.namaDokter || '').toLowerCase();
                if (nama.indexOf(self.riwayatFilterSearch) === -1 && dokter.indexOf(self.riwayatFilterSearch) === -1) return false;
            }
            return true;
        });

        // Metrics
        var totalOmzet = 0, countObatBebas = 0, countResepKlinik = 0, countResepLuar = 0;
        filtered.forEach(function(t) {
            totalOmzet += (t.totalAkhir || 0);
            if (t.tipe === 'resep_klinik') countResepKlinik++;
            else if (t.tipe === 'resep_luar') countResepLuar++;
            else countObatBebas++;
        });

        var html = '<div class="space-y-4 animate-fade-in">';

        // Filter Bar
        html += '  <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">';
        html += '    <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">';
        html += '      <div>';
        html += '        <label class="block text-xs font-semibold text-slate-500 mb-1">Periode (Bulan)</label>';
        html += '        <input type="month" id="trx-filter-bulan" onchange="AppApotekTransaksi.applyRiwayatFilter()" value="' + this.riwayatFilterBulan + '" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg text-sm outline-none">';
        html += '      </div>';
        html += '      <div>';
        html += '        <label class="block text-xs font-semibold text-slate-500 mb-1">Tipe Transaksi</label>';
        html += '        <select id="trx-filter-tipe" onchange="AppApotekTransaksi.applyRiwayatFilter()" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg text-sm outline-none">';
        html += '          <option value="semua" ' + (this.riwayatFilterTipe === 'semua' ? 'selected' : '') + '>Semua Tipe</option>';
        html += '          <option value="obat_bebas" ' + (this.riwayatFilterTipe === 'obat_bebas' ? 'selected' : '') + '>Obat Bebas</option>';
        html += '          <option value="resep_klinik" ' + (this.riwayatFilterTipe === 'resep_klinik' ? 'selected' : '') + '>Resep Klinik</option>';
        html += '          <option value="resep_luar" ' + (this.riwayatFilterTipe === 'resep_luar' ? 'selected' : '') + '>Resep Luar</option>';
        html += '        </select>';
        html += '      </div>';
        html += '      <div>';
        html += '        <label class="block text-xs font-semibold text-slate-500 mb-1">Cari Pasien / Dokter</label>';
        html += '        <input type="text" id="trx-filter-search" oninput="AppApotekTransaksi.applyRiwayatFilter()" value="' + Utils.escapeHtml(this.riwayatFilterSearch) + '" placeholder="Ketik nama..." class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg text-sm outline-none">';
        html += '      </div>';
        html += '      <div>';
        html += '        <button onclick="AppApotekTransaksi.loadRiwayat()" class="w-full bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center justify-center gap-2"><i data-lucide="refresh-cw" class="w-4 h-4"></i> Sync Realtime</button>';
        html += '      </div>';
        html += '    </div>';
        html += '  </div>';

        // Summary Cards
        html += '  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">';
        html += '    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4"><p class="text-xs text-slate-400 mb-1">Total Transaksi</p><p class="text-lg font-bold text-gray-800 dark:text-white">' + filtered.length + ' transaksi</p></div>';
        html += '    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4"><p class="text-xs text-slate-400 mb-1">Total Omzet</p><p class="text-lg font-bold text-emerald-600">' + Utils.formatRupiah(totalOmzet) + '</p></div>';
        html += '    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4"><p class="text-xs text-slate-400 mb-1">Obat Bebas / Resep Klinik</p><p class="text-lg font-bold text-gray-800 dark:text-white">' + countObatBebas + ' / ' + countResepKlinik + '</p></div>';
        html += '    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4"><p class="text-xs text-slate-400 mb-1">Resep Luar</p><p class="text-lg font-bold text-gray-800 dark:text-white">' + countResepLuar + ' transaksi</p></div>';
        html += '  </div>';

        // Table
        html += '  <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto shadow-sm">';
        if (filtered.length === 0) {
            html += '    <div class="p-10 text-center text-slate-400 text-sm">Tidak ada riwayat transaksi pada periode/filter ini.</div>';
        } else {
            html += '    <table class="w-full text-sm">';
            html += '      <thead><tr class="border-b border-slate-100 dark:border-slate-700 text-left text-xs text-slate-400 uppercase bg-slate-50 dark:bg-slate-900/40">';
            html += '        <th class="px-4 py-3">Tanggal & Waktu</th><th class="px-4 py-3">Tipe</th><th class="px-4 py-3">Pasien</th>';
            html += '        <th class="px-4 py-3">Dokter / Sumber</th><th class="px-4 py-3">Item</th><th class="px-4 py-3">Metode</th>';
            html += '        <th class="px-4 py-3 text-right">Total</th><th class="px-4 py-3 text-center">Aksi</th>';
            html += '      </tr></thead><tbody id="trx-table-riwayat-body">';

            filtered.forEach(function(t) {
                var jumlahItem = (t.items ? t.items.length : 0);
                var sumberLabel = '-';
                if (t.tipe === 'resep_klinik') sumberLabel = 'Resep Klinik';
                else if (t.tipe === 'resep_luar') sumberLabel = t.dokterLuar || 'Dokter Luar';

                var waktuStr = self._fmtWaktu(t.createdAt);

                html += '      <tr class="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">';
                html += '        <td class="px-4 py-3 whitespace-nowrap">';
                html += '          <div class="font-bold text-slate-700 dark:text-slate-200">' + Utils.escapeHtml(t.tanggal || '-') + '</div>';
                html += '          <div class="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-0.5"><i data-lucide="clock" class="w-3 h-3 text-primary-500"></i> ' + (waktuStr || '00:00 WIB') + '</div>';
                html += '        </td>';
                html += '        <td class="px-4 py-3">' + self._badgeTipeRiwayat(t.tipe) + '</td>';
                html += '        <td class="px-4 py-3 font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(t.namaPasien || 'Umum/Bebas') + '</td>';
                html += '        <td class="px-4 py-3 text-slate-500">' + Utils.escapeHtml(sumberLabel) + '</td>';
                html += '        <td class="px-4 py-3 text-slate-500">' + jumlahItem + ' item</td>';
                html += '        <td class="px-4 py-3"><span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded font-mono text-xs">' + (t.metodeBayar || 'cash').toUpperCase() + '</span></td>';
                html += '        <td class="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">' + Utils.formatRupiah(t.totalAkhir || 0) + '</td>';
                html += '        <td class="px-4 py-3 text-center whitespace-nowrap">';
                html += '          <button onclick="AppApotekTransaksi.bukaDetailRiwayat(\'' + t.id + '\')" class="text-primary-600 hover:underline text-xs font-semibold mr-2">Detail</button>';
                if (canEditDelete) {
                    html += '          <button onclick="AppApotekTransaksi.bukaEditRiwayat(\'' + t.id + '\')" class="text-amber-600 hover:underline text-xs font-semibold mr-2">Edit</button>';
                    html += '          <button onclick="AppApotekTransaksi.hapusRiwayat(\'' + t.id + '\')" class="text-rose-600 hover:underline text-xs font-semibold">Hapus</button>';
                }
                html += '        </td>';
                html += '      </tr>';
            });

            html += '      </tbody></table>';
        }
        html += '  </div>';

        html += '  <div id="modal-trx-riwayat-container"></div>';
        html += '</div>';

        var container = document.getElementById('trx-content');
        if (container) container.innerHTML = html;
        if (window.lucide) lucide.createIcons();
    },

    _badgeTipeRiwayat: function(tipe) {
        var map = {
            obat_bebas:   'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
            resep_klinik: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
            resep_luar:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
        };
        var label = (tipe === 'resep_klinik' ? 'Resep Klinik' : (tipe === 'resep_luar' ? 'Resep Luar' : 'Obat Bebas'));
        return '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold ' + (map[tipe] || map.obat_bebas) + '">' + label + '</span>';
    },

    bukaDetailRiwayat: function(id) {
        var t = this.riwayatData.find(function(x) { return x.id === id; });
        if (!t) return;
        var role = window.currentRole || 'apotek';
        var canEditDelete = (role === 'keuangan' || role === 'admin' || role === 'psa');

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
        html += '        <p class="text-xs text-slate-400">' + Utils.escapeHtml(t.tanggal || '-') + ' &middot; ' + (t.tipe || 'obat_bebas') + '</p>';
        html += '      </div>';
        html += '      <button onclick="AppApotekTransaksi.tutupModalRiwayat()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"><i data-lucide="x" class="w-5 h-5"></i></button>';
        html += '    </div>';

        html += '    <div class="text-xs space-y-1">';
        html += '      <div class="flex justify-between"><span class="text-slate-400">Pasien</span><strong class="text-slate-800 dark:text-white">' + Utils.escapeHtml(t.namaPasien || 'Umum/Bebas') + '</strong></div>';
        if (t.tipe === 'resep_luar') {
            html += '      <div class="flex justify-between"><span class="text-slate-400">Dokter Luar</span><strong class="text-slate-800 dark:text-white">' + Utils.escapeHtml(t.dokterLuar || '-') + '</strong></div>';
        }
        html += '      <div class="flex justify-between"><span class="text-slate-400">Metode Bayar</span><strong class="text-slate-800 dark:text-white">' + (t.metodeBayar || 'cash').toUpperCase() + '</strong></div>';
        html += '    </div>';

        if (itemsHtml) html += '    <div><p class="text-xs font-bold text-slate-500 mb-1">Obat / Item</p>' + itemsHtml + '</div>';
        if (tindakanHtml) html += '    <div><p class="text-xs font-bold text-slate-500 mb-1">Tindakan</p>' + tindakanHtml + '</div>';

        html += '    <div class="space-y-1 text-xs pt-2 border-t border-slate-100 dark:border-slate-700">';
        if (t.totalRacik) html += '      <div class="flex justify-between"><span class="text-slate-400">Jasa Racik</span><span>' + Utils.formatRupiah(t.totalRacik) + '</span></div>';
        if (t.jasaResep) html += '      <div class="flex justify-between"><span class="text-slate-400">Jasa Resep</span><span>' + Utils.formatRupiah(t.jasaResep) + '</span></div>';
        if (t.pembulatan) html += '      <div class="flex justify-between"><span class="text-slate-400">Pembulatan</span><span>' + Utils.formatRupiah(t.pembulatan) + '</span></div>';
        html += '      <div class="flex justify-between text-sm font-bold pt-1"><span>Total Akhir</span><span class="text-emerald-600">' + Utils.formatRupiah(t.totalAkhir || 0) + '</span></div>';
        html += '    </div>';

        html += '    <div class="flex items-center justify-end gap-2 pt-2">';
        html += '      <button onclick="AppApotekTransaksi.tutupModalRiwayat()" class="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">Tutup</button>';
        if (canEditDelete) {
            html += '      <button onclick="AppApotekTransaksi.bukaEditRiwayat(\'' + t.id + '\')" class="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white">Edit Transaksi</button>';
            html += '      <button onclick="AppApotekTransaksi.hapusRiwayat(\'' + t.id + '\')" class="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white">Hapus Transaksi</button>';
        }
        html += '    </div>';

        html += '  </div></div>';

        document.getElementById('modal-trx-riwayat-container').innerHTML = html;
        if (window.lucide) lucide.createIcons();
    },

    tutupModalRiwayat: function() {
        var c = document.getElementById('modal-trx-riwayat-container');
        if (c) c.innerHTML = '';
    },

    bukaEditRiwayat: function(id) {
        var t = this.riwayatData.find(function(x) { return x.id === id; });
        if (!t) return;

        var html = '<div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">';
        html += '  <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-lg w-full p-6 space-y-4">';
        html += '    <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">';
        html += '      <div>';
        html += '        <h3 class="text-base font-black text-slate-800 dark:text-white">Edit Transaksi</h3>';
        html += '        <p class="text-xs text-slate-400">Koreksi metadata transaksi (Tanggal, Pasien, Metode Bayar)</p>';
        html += '      </div>';
        html += '      <button onclick="AppApotekTransaksi.tutupModalRiwayat()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"><i data-lucide="x" class="w-5 h-5"></i></button>';
        html += '    </div>';

        html += '    <div class="space-y-3 text-xs">';
        html += '      <div>';
        html += '        <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Tanggal Transaksi</label>';
        html += '        <input type="date" id="edit-trx-tanggal" value="' + Utils.escapeHtml(t.tanggal || '') + '" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:border-amber-500">';
        html += '      </div>';
        html += '      <div>';
        html += '        <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Nama Pasien</label>';
        html += '        <input type="text" id="edit-trx-pasien" value="' + Utils.escapeHtml(t.namaPasien || '') + '" placeholder="Umum/Bebas" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:border-amber-500">';
        html += '      </div>';
        if (t.tipe === 'resep_luar') {
            html += '      <div>';
            html += '        <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Dokter Luar</label>';
            html += '        <input type="text" id="edit-trx-dokterluar" value="' + Utils.escapeHtml(t.dokterLuar || '') + '" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:border-amber-500">';
            html += '      </div>';
        }
        html += '      <div>';
        html += '        <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Metode Bayar</label>';
        html += '        <select id="edit-trx-metode" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:border-amber-500">';
        ['cash', 'transfer', 'qris'].forEach(function(m) {
            html += '<option value="' + m + '" ' + (t.metodeBayar === m ? 'selected' : '') + '>' + (m === 'cash' ? 'Cash' : (m === 'transfer' ? 'Transfer' : 'QRIS')) + '</option>';
        });
        html += '        </select>';
        html += '      </div>';
        html += '    </div>';

        html += '    <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">';
        html += '      <button onclick="AppApotekTransaksi.tutupModalRiwayat()" class="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">Batal</button>';
        html += '      <button onclick="AppApotekTransaksi.simpanEditRiwayat(\'' + id + '\')" class="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow flex items-center gap-1.5"><i data-lucide="save" class="w-4 h-4"></i> Simpan Koreksi</button>';
        html += '    </div>';

        html += '  </div></div>';

        document.getElementById('modal-trx-riwayat-container').innerHTML = html;
        if (window.lucide) lucide.createIcons();
    },

    simpanEditRiwayat: function(id) {
        var t = this.riwayatData.find(function(x) { return x.id === id; });
        if (!t) return;

        var tanggalBaru = document.getElementById('edit-trx-tanggal').value;
        var pasienBaru = document.getElementById('edit-trx-pasien').value.trim();
        var metodeBaru = document.getElementById('edit-trx-metode').value;
        var dokterLuarEl = document.getElementById('edit-trx-dokterluar');
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
                    modul: 'Transaksi',
                    koleksi: 'transaksi',
                    targetId: id,
                    deskripsi: 'Koreksi data transaksi tanggal ' + (t.tanggal || '-') + ' -> ' + tanggalBaru + ', pasien "' + (t.namaPasien || '-') + '" -> "' + pasienBaru + '"',
                    nominal: t.totalAkhir || 0
                });
            }
            self.tutupModalRiwayat();
            self.loadRiwayat();
        }).catch(function(err) {
            Utils.toast('Gagal menyimpan koreksi: ' + err.message, 'error');
        });
    },

    hapusRiwayat: function(id) {
        var t = this.riwayatData.find(function(x) { return x.id === id; });
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
                    modul: 'Transaksi',
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

            Utils.toast('Transaksi berhasil dihapus & stok obat dikembalikan! Keuangan & Payroll disinkronkan.', 'success');
            self.tutupModalRiwayat();
            self.loadRiwayat();
        }).catch(function(err) {
            Utils.toast('Gagal menghapus transaksi: ' + err.message, 'error');
        });
    },

    // ========== INIT ==========
    init: function() {
        var self = this;
        var today = Utils.today(); // FIX: pakai tanggal lokal, bukan UTC

        Promise.all([
            DataCache.getObat(),
            db.collection('pengaturanPembagian').doc('global').get(),
            // FIX (READ SPIKE): sebelumnya where('status','==','selesai') tanpa limit()
            // -> menarik SEMUA rekam medis yang pernah selesai (terus bertambah seiring
            // waktu, bisa ribuan dokumen), lalu baru difilter statusResep di client.
            // Field statusResep SELALU diisi 'menunggu' saat rekam medis dibuat (lihat
            // js/klinik/rekamMedis.js), jadi aman & jauh lebih murah untuk query
            // langsung ke statusResep=='menunggu' di server -- hasilnya cuma resep
            // yang benar-benar masih perlu diproses, bukan seluruh riwayat.
            db.collection('rekamMedis').where('statusResep', '==', 'menunggu').get(),
            db.collection('antrian').where('tanggal', '==', today).get(),
            db.collection('masterTindakan').where('aktif', '==', true).get()
        ]).then(function(results) {

            // Master Obat
            self.masterObat = [];
            results[0].forEach(function(doc) {
                var d = doc.data(); d.id = doc.id; self.masterObat.push(d);
            });
            self.masterObat.sort(function(a, b) { return (a.namaObat || '').localeCompare(b.namaObat || ''); });

            // Master Tindakan
            self.masterTindakan = [];
            results[4].forEach(function(doc) {
                var d = doc.data(); d.id = doc.id; self.masterTindakan.push(d);
            });

            // Pengaturan Pembagian
            if (results[1].exists) {
                self.pengaturan = results[1].data();
            } else {
                self.pengaturan = { marginResep: 0, racikObat: { nilai: 0 } };
            }

            // Antrian hari ini
            self.antrianList = [];
            results[3].forEach(function(doc) { var d = doc.data(); d.id = doc.id; self.antrianList.push(d); });

            // Resep klinik menunggu (sudah difilter di query, tidak perlu filter lagi di sini)
            self.resepList = [];
            results[2].forEach(function(doc) {
                var d = doc.data(); d.id = doc.id;
                self.resepList.push(d);
            });

            self._cartRowSeq = 0;
            self.renderForm();
        }).catch(function(err) {
            document.getElementById('trx-content').innerHTML =
                '<div class="text-center py-16"><p class="text-red-500 font-semibold">Gagal memuat: ' + Utils.escapeHtml(err.message) + '</p></div>';
        });
    },

    // ========== RENDER FORM UTAMA ==========
    renderForm: function() {
        var html = '';

        // Tombol pilih tipe
        html += '<div class="grid grid-cols-3 gap-2 mb-4">';
        html += this._btnTipe('obat_bebas', 'pill', 'Obat Bebas', true);
        html += this._btnTipe('resep_klinik', 'file-text', 'Resep Klinik', false);
        html += this._btnTipe('resep_luar', 'file-plus', 'Resep Luar', false);
        html += '</div>';

        // Header dinamis
        html += '<div id="trx-header-dynamic" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4"></div>';

        // Keranjang obat
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">';
        html += '  <div class="flex justify-between items-center mb-3">';
        html += '    <h3 class="font-semibold text-gray-800 dark:text-white">Daftar Item Obat</h3>';
        html += '    <div class="flex gap-2">';
        html += '      <button type="button" onclick="AppApotekTransaksi.bukaKatalog()" class="text-sm bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 px-3 py-1.5 rounded-lg font-medium hover:bg-emerald-100 flex items-center gap-1.5"><i data-lucide="layout-grid" class="w-4 h-4"></i> Pilih dari Katalog</button>';
        html += '      <button type="button" onclick="AppApotekTransaksi.addItem()" class="text-sm bg-primary-50 dark:bg-primary-900/30 text-primary-600 px-3 py-1.5 rounded-lg font-medium hover:bg-primary-100">+ Tambah Obat</button>';
        html += '    </div>';
        html += '  </div>';
        html += '  <div id="trx-cart-container" class="space-y-2"><p class="text-sm text-slate-400 italic p-2">Tambahkan obat ke keranjang.</p></div>';
        html += '</div>';

        // Area Tindakan & Jasa Medis
        html += '<div id="trx-tindakan-container" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4"></div>';

        // Ringkasan total & Pembayaran
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6">';
        html += '  <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">';
        
        // Detail Total
        html += '    <div class="space-y-1 text-sm w-full lg:w-auto">';
        html += '      <div class="flex justify-between gap-8"><span class="text-slate-500">Total Obat (Gross):</span><span id="trx-total-obat" class="font-medium text-gray-800 dark:text-white">Rp 0</span></div>';
        html += '      <div class="flex justify-between gap-8 text-xs pl-4"><span class="text-slate-400">- Est. PPN Keluaran (11%):</span><span id="trx-ppn-keluaran" class="font-medium text-slate-500">Rp 0</span></div>';
        html += '      <div class="flex justify-between gap-8 text-xs pl-4"><span class="text-slate-400"># Nilai Bersih Obat:</span><span id="trx-nilai-bersih" class="font-medium text-slate-500">Rp 0</span></div>';
        html += '      <div class="flex justify-between gap-8"><span class="text-slate-500">Total Racik:</span><span id="trx-total-racik" class="font-medium text-teal-600">Rp 0</span></div>';
        html += '      <div class="flex justify-between gap-8"><span class="text-slate-500">Tindakan & Jasa:</span><span id="trx-total-tindakan" class="font-medium text-purple-600">Rp 0</span></div>';
        html += '      <div class="flex justify-between gap-8"><span class="text-slate-500">Jasa Resep:</span><span id="trx-jasa-resep" class="font-medium text-gray-800 dark:text-white">-</span></div>';
        html += '      <div class="flex justify-between gap-8"><span class="text-slate-500">Pembulatan:</span><span id="trx-pembulatan" class="font-medium text-amber-600">-</span></div>';
        html += '      <div class="flex justify-between gap-8 text-lg pt-2 border-t border-slate-100 dark:border-slate-700"><span class="font-semibold text-gray-700 dark:text-gray-200">TOTAL BAYAR:</span><span id="trx-grand-total" class="font-bold text-primary-600">Rp 0</span></div>';
        html += '    </div>';
        
        // Metode Bayar & Tombol Proses
        html += '    <div class="flex flex-col gap-3 w-full lg:w-auto">';
        html += '      <div>';
        html += '        <label class="block text-xs font-medium text-slate-500 mb-1">Metode Pembayaran</label>';
        html += '        <select id="trx-metode-bayar" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm">';
        html += '          <option value="cash">Cash</option><option value="transfer">Transfer</option><option value="qris">QRIS</option>';
        html += '        </select>';
        html += '      </div>';
        html += '      <button onclick="AppApotekTransaksi.simpan()" class="bg-primary-600 hover:bg-primary-700 text-white font-bold px-8 py-3 rounded-xl shadow-lg transition-all text-sm flex items-center gap-2 justify-center">';
        html += '        <i data-lucide="check-circle" class="w-5 h-5"></i> Proses & Simpan';
        html += '      </button>';
        html += '    </div>';
        
        html += '  </div>';
        html += '</div>';

        document.getElementById('trx-content').innerHTML = html;
        lucide.createIcons();

        this.tipe = 'obat_bebas';
        this._renderHeader('obat_bebas');
        this.renderTindakanArea(); 
    },

    _btnTipe: function(tipe, icon, label, isActive) {
        var activeClass = isActive ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-600';
        var textClass = isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-600 dark:text-slate-300';
        return '<button onclick="AppApotekTransaksi.setTipe(\'' + tipe + '\')" id="btn-' + tipe + '" class="border-2 ' + activeClass + ' p-3 rounded-xl text-center transition hover:border-primary-500">' +
            '<i data-lucide="' + icon + '" class="w-5 h-5 mx-auto mb-1 ' + textClass + '"></i>' +
            '<p class="text-sm font-semibold ' + textClass + '">' + label + '</p></button>';
    },

    setTipe: function(tipe) {
        this.tipe = tipe;
        var tipes = ['obat_bebas', 'resep_klinik', 'resep_luar'];
        tipes.forEach(function(t) {
            var btn = document.getElementById('btn-' + t);
            if (!btn) return;
            if (t === tipe) {
                btn.className = btn.className.replace(/border-slate-200 dark:border-slate-600/g, '').replace(/text-slate-600 dark:text-slate-300/g, '');
                if (btn.className.indexOf('border-primary-500') === -1) btn.className += ' border-primary-500 bg-primary-50 dark:bg-primary-900/20';
                btn.querySelectorAll('i, p').forEach(function(el) { el.className = el.className.replace(/text-slate-600 dark:text-slate-300/g, 'text-primary-600 dark:text-primary-400'); });
            } else {
                btn.className = btn.className.replace(/border-primary-500/g, '').replace(/bg-primary-50/g, '').replace(/dark:bg-primary-900\/20/g, '');
                if (btn.className.indexOf('border-slate-200') === -1) btn.className += ' border-slate-200 dark:border-slate-600';
                btn.querySelectorAll('i, p').forEach(function(el) { el.className = el.className.replace(/text-primary-600 dark:text-primary-400/g, 'text-slate-600 dark:text-slate-300'); });
            }
        });

        this._renderHeader(tipe);
        document.getElementById('trx-cart-container').innerHTML = '<p class="text-sm text-slate-400 italic p-2">Tambahkan obat ke keranjang.</p>';
        this._cartRowSeq = 0;
        this.renderTindakanArea();
        this.hitungTotal();
    },

    _renderHeader: function(tipe) {
        var html = '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';
        if (tipe === 'resep_klinik') {
            html += '<div><label class="block text-xs font-medium text-blue-600 mb-1">Pilih Resep Klinik</label>';
            html += '<select id="trx-resep-id" onchange="AppApotekTransaksi.onSelectResep()" class="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-700 dark:text-white rounded-lg text-sm">';
            html += '<option value="">-- Pilih Resep Menunggu (' + this.resepList.length + ') --</option>';
            this.resepList.forEach(function(r) {
                html += '<option value="' + r.id + '">' + Utils.escapeHtml(r.namaPasien || '-') + ' (' + Utils.escapeHtml(r.nomorRM || '-') + ') — ' + Utils.escapeHtml(r.namaDokter || '-') + '</option>';
            });
            html += '</select></div>';
        } else if (tipe === 'resep_luar') {
            html += '<div><label class="block text-xs font-medium text-green-600 mb-1">Dokter Pemberi Resep *</label>';
            html += '<select id="trx-dokter-luar-id" onchange="AppApotekTransaksi.onChangeDokterLuar()" class="w-full px-3 py-2 border border-green-300 dark:border-green-700 bg-white dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="">-- Pilih Dokter --</option>';
            if (this.pengaturan && Array.isArray(this.pengaturan.resepKlinik)) {
                this.pengaturan.resepKlinik.forEach(function(doc) {
                    html += '<option value="' + doc.dokterId + '" data-nama="' + Utils.escapeHtml(doc.namaDokter || '') + '">' + Utils.escapeHtml(doc.namaDokter || 'Dokter') + '</option>';
                });
            }
            // FIX (permintaan user): tambahkan opsi dokter lain di luar daftar Pengaturan
            // Dokter/Pembagian, untuk resep dari puskesmas / dokter luar yang belum terdaftar.
            html += '<option value="__LAINNYA__" data-nama="">-- Dokter Lain / Luar (input manual) --</option>';
            html += '</select>';
            html += '<input type="text" id="trx-dokter-luar-manual" class="hidden mt-2 w-full px-3 py-2 border border-green-300 dark:border-green-700 bg-white dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="Ketik nama dokter / asal puskesmas" oninput="AppApotekTransaksi.hitungTotal()">';
            html += '</div>';
        }
        html += '<div><label class="block text-xs font-medium text-slate-500 mb-1">Nama Pasien (Opsional)</label>';
        html += '<input type="text" id="trx-pasien" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="Nama Pasien"></div>';
        html += '</div>';
        document.getElementById('trx-header-dynamic').innerHTML = html;
    },

    // FIX (permintaan user): tampilkan/sembunyikan input manual saat "Dokter Lain / Luar" dipilih.
    onChangeDokterLuar: function() {
        var sel = document.getElementById('trx-dokter-luar-id');
        var manualInput = document.getElementById('trx-dokter-luar-manual');
        if (sel && manualInput) {
            if (sel.value === '__LAINNYA__') {
                manualInput.classList.remove('hidden');
                manualInput.focus();
            } else {
                manualInput.classList.add('hidden');
                manualInput.value = '';
            }
        }
        this.hitungTotal();
    },

    // ========== AREA TINDAKAN ==========
    renderTindakanArea: function() {
        var container = document.getElementById('trx-tindakan-container');
        if (!container) return;
        var self = this;
        var html = '<div class="flex justify-between items-center mb-3">';
        html += '<h3 class="font-semibold text-gray-800 dark:text-white">Tindakan & Jasa Medis</h3>';

        if (this.tipe !== 'resep_klinik') {
            // FITUR BARU (permintaan user): "Tindakan Klinik" sekarang juga bisa
            // ditambahkan langsung di sini (Obat Bebas / Resep Luar), berdampingan
            // dengan "Tindakan Apotek" — dipakai untuk tindakan klinik yang terjadi
            // TANPA resep dokter/rekam medis (mis. cek tensi, ganti perban, suntik
            // langsung di kasir). Kalau tindakannya berasal dari resep dokter yang
            // sudah tercatat di Rekam Medis, tetap pakai alur "Resep Klinik" seperti
            // biasa (otomatis, lihat onSelectResep()).
            html += '<div class="flex gap-2">';
            html += '<button type="button" onclick="AppApotekTransaksi.addTindakan(\'klinik\')" class="text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-600 px-3 py-1.5 rounded-lg font-medium hover:bg-blue-100">+ Tindakan Klinik</button>';
            html += '<button type="button" onclick="AppApotekTransaksi.addTindakan(\'apotek\')" class="text-sm bg-teal-50 dark:bg-teal-900/30 text-teal-600 px-3 py-1.5 rounded-lg font-medium hover:bg-teal-100">+ Tindakan Apotek</button>';
            html += '</div>';
        } else {
            html += '<span class="text-xs text-blue-600">Otomatis dari Rekam Medis</span>';
        }
        html += '</div>';
        
        html += '<div id="trx-tindakan-list" class="space-y-2"><p class="text-sm text-slate-400 italic p-2">Tidak ada tindakan.</p></div>';
        container.innerHTML = html;
    },

    // FIX: sebelumnya hanya ada addTindakanApotek() (khusus kategori 'apotek').
    // Digeneralisasi jadi addTindakan(kategori) supaya bisa dipakai untuk
    // 'klinik' maupun 'apotek', dropdown-nya otomatis difilter sesuai kategori
    // yang dipilih dari master data Tindakan (js/pengaturan/tindakan.js).
    addTindakan: function(kategori) {
        var container = document.getElementById('trx-tindakan-list');
        if (container.querySelector('p.italic')) container.innerHTML = '';
        var idx = container.children.length + '-' + Date.now(); // FIX: id unik walau ada baris klinik & apotek campur

        var isKlinik = (kategori === 'klinik');
        var warna = isKlinik ? 'blue' : 'teal';
        var labelKategori = isKlinik ? 'Klinik' : 'Apotek';

        var html = '<div id="trx-tindakan-row-' + idx + '" class="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/30 p-2 rounded-lg border border-slate-100 dark:border-slate-700">';
        html += '<span class="text-[10px] font-semibold px-1.5 py-1 rounded bg-' + warna + '-100 dark:bg-' + warna + '-900/30 text-' + warna + '-600 flex-shrink-0">' + labelKategori + '</span>';
        html += '<select id="trx-tindakan-select-' + idx + '" onchange="AppApotekTransaksi.onSelectTindakan(\'' + idx + '\')" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm">';
        html += '<option value="">-- Pilih Tindakan ' + labelKategori + ' --</option>';
        this.masterTindakan.forEach(function(t) {
            if (t.kategori === kategori) {
                html += '<option value="' + t.id + '" data-harga="' + (t.hargaJual || 0) + '">' + Utils.escapeHtml(t.nama) + ' (' + Utils.formatRupiah(t.hargaJual) + ')</option>';
            }
        });
        html += '</select>';
        html += '<div class="flex items-center gap-2 w-1/3"><input type="number" id="trx-tindakan-harga-' + idx + '" value="0" readonly class="w-full px-2 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm text-right font-bold text-' + warna + '-600"></div>';
        html += '<button type="button" onclick="AppApotekTransaksi.removeTindakan(\'' + idx + '\')" class="p-2 text-red-400 hover:text-red-600"><i data-lucide="x" class="w-5 h-5"></i></button>';
        html += '</div>';
        
        container.insertAdjacentHTML('beforeend', html);
        lucide.createIcons({ nodes: [container] });
    },

    onSelectTindakan: function(idx) {
        var select = document.getElementById('trx-tindakan-select-' + idx);
        var selectedOption = select.options[select.selectedIndex];
        var harga = selectedOption.getAttribute('data-harga') || 0;
        document.getElementById('trx-tindakan-harga-' + idx).value = harga;
        this.hitungTotal();
    },

    removeTindakan: function(idx) {
        var row = document.getElementById('trx-tindakan-row-' + idx);
        if (row) row.remove();
        if (!document.getElementById('trx-tindakan-list').querySelector('[id^="trx-tindakan-row-"]')) {
            document.getElementById('trx-tindakan-list').innerHTML = '<p class="text-sm text-slate-400 italic p-2">Tidak ada tindakan.</p>';
        }
        this.hitungTotal();
    },

    onSelectResep: function() {
        var id = document.getElementById('trx-resep-id').value;
        var listContainer = document.getElementById('trx-tindakan-list');
        if(listContainer) listContainer.innerHTML = '<p class="text-sm text-slate-400 italic p-2">Tidak ada tindakan.</p>';
        
        if (!id) { this.hitungTotal(); return; }
        
        var resep = this.resepList.find(function(r) { return r.id === id; });
        if (resep) {
            document.getElementById('trx-pasien').value = resep.namaPasien || '';
            
            if (resep.tindakanItems && resep.tindakanItems.length > 0) {
                var html = '';
                resep.tindakanItems.forEach(function(t, i) {
                    html += '<div class="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg border border-blue-100 dark:border-blue-800">';
                    html += '<div class="flex items-center gap-2"><i data-lucide="stethoscope" class="w-4 h-4 text-blue-500"></i><span class="text-sm text-gray-800 dark:text-white">' + Utils.escapeHtml(t.namaTindakan) + '</span></div>';
                    html += '<span class="text-sm font-bold text-blue-600">' + Utils.formatRupiah(t.hargaJual) + '</span>';
                    html += '<input type="hidden" id="trx-tindakan-klinik-' + i + '" value="' + t.hargaJual + '">';
                    html += '</div>';
                });
                if(listContainer) listContainer.innerHTML = html;
                lucide.createIcons();
            }
        }
        this.hitungTotal();
    },

    // ========== KERANJANG OBAT ==========
    // presetObatId (opsional): dipakai oleh katalog kasir (bukaKatalog/pilihDariKatalog)
    // untuk langsung membuat baris + memilih obatnya sekaligus, tanpa user harus
    // ketik manual di dropdown.
    addItem: function(presetObatId) {
        var self = this;
        var container = document.getElementById('trx-cart-container');
        if (container.querySelector('p.italic')) container.innerHTML = '';

        // FIX (BUG LATEN): idx sebelumnya = container.children.length, yang TIDAK
        // aman begitu ada baris yang dihapus di tengah proses (removeItem) --
        // children.length bisa "mundur", lalu baris baru dapat idx yang BENTROK
        // dengan id="trx-row-N" milik baris lama yang masih ada (dua elemen DOM
        // ber-ID sama -> getElementById() cuma nemu yang pertama -> baris salah
        // satunya jadi tidak berfungsi/datanya bisa salah baca). Sekarang pakai
        // counter yang cuma naik terus, tidak pernah dipakai ulang dalam 1 transaksi.
        var idx = this._cartRowSeq++;
        var isResep = (this.tipe === 'resep_klinik' || this.tipe === 'resep_luar');

        var html = '<div id="trx-row-' + idx + '" class="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-900/30">';
        html += '<div class="grid grid-cols-2 md:grid-cols-6 gap-3 items-start">';

        html += '<div class="col-span-2"><label class="block text-xs text-slate-500 mb-1">Pilih Obat</label>';
        html += '<select id="trx-obat-' + idx + '" onchange="AppApotekTransaksi.onSelectObat(' + idx + ')" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="">-- Pilih Obat --</option>';
        this.masterObat.forEach(function(o) {
            var stokLabel = (o.stok || 0) > 0 ? o.stok + ' ' + (o.satuan || 'pcs') : 'HABIS';
            html += '<option value="' + o.id + '">' + Utils.escapeHtml(o.namaObat || '-') + ' [' + stokLabel + ']</option>';
        });
        html += '</select></div>';

        html += '<div><label class="block text-xs text-slate-500 mb-1">Qty</label>';
        html += '<input type="number" id="trx-qty-' + idx + '" value="1" min="1" oninput="AppApotekTransaksi.hitungTotal()" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm text-center"></div>';

        html += '<div><label class="block text-xs text-slate-500 mb-1">Harga Jual</label>';
        html += '<input type="number" id="trx-harga-' + idx + '" value="0" min="0" oninput="AppApotekTransaksi.hitungTotal()" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm text-right">';
        html += '<p id="trx-hint-' + idx + '" class="text-[10px] text-slate-400 mt-1"></p></div>';

        html += '<div><label class="block text-xs text-slate-500 mb-1">Subtotal</label>';
        html += '<div id="trx-sub-' + idx + '" class="px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm text-right font-medium">Rp 0</div></div>';

        html += '<div class="col-span-2 flex items-end justify-between gap-2">';
        if (isResep) {
            var nilaiRacik = (self.pengaturan && self.pengaturan.racikObat) ? self.pengaturan.racikObat.nilai : 0;
            html += '<label class="flex items-center gap-2 text-sm text-teal-600 dark:text-teal-400 cursor-pointer bg-teal-50 dark:bg-teal-900/20 px-3 py-2 rounded-lg border border-teal-200 dark:border-teal-700">';
            html += '<input type="checkbox" id="trx-racik-' + idx + '" onchange="AppApotekTransaksi.hitungTotal()" class="w-4 h-4 rounded border-teal-300 text-teal-600"> Racik (+' + Utils.formatRupiah(nilaiRacik) + ')';
            html += '</label>';
        } else {
            html += '<div></div>';
        }
        html += '<button type="button" onclick="AppApotekTransaksi.removeItem(' + idx + ')" class="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><i data-lucide="x" class="w-5 h-5"></i></button>';
        html += '</div>';

        html += '</div></div>';
        container.insertAdjacentHTML('beforeend', html);
        lucide.createIcons({ nodes: [container] });
        SearchableSelect.attach('trx-obat-' + idx, { placeholder: 'Ketik nama obat...' });

        if (presetObatId) {
            var sel = document.getElementById('trx-obat-' + idx);
            sel.value = presetObatId;
            // Beritahu SearchableSelect supaya teks yang tampil di kotak "ketik untuk
            // cari" ikut ter-update sesuai <select> asli yang baru diubah lewat kode
            // (bukan lewat klik dropdown-nya), sebelum kita hitung harga/total.
            if (window.SearchableSelect && SearchableSelect._syncInputFromSelect) {
                SearchableSelect._syncInputFromSelect(sel);
            }
            this.onSelectObat(idx);
        }
        return idx;
    },

    // ========================================================================
    // FITUR BARU: "Pilih dari Katalog" -- tampilan grid produk kotak-kotak ala
    // marketplace (Tokopedia/Shopee-style), pakai foto produk dari Master Data
    // Obat (field `gambarObat`). Tap kartu = langsung masuk keranjang (nambah
    // baris baru, atau qty +1 kalau produk itu sudah ada di keranjang).
    // ========================================================================
    bukaKatalog: function() {
        this.katalogSearch = '';
        var html = '<div class="p-5 max-h-[85vh] flex flex-col">';
        html += '  <div class="flex items-center justify-between mb-4">';
        html += '    <h3 class="text-lg font-semibold text-gray-800 dark:text-white">Pilih dari Katalog</h3>';
        html += '    <button onclick="Utils.closeModal()" class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><i data-lucide="x" class="w-5 h-5 text-slate-400"></i></button>';
        html += '  </div>';
        html += '  <div class="relative mb-4">';
        html += '    <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>';
        html += '    <input type="text" id="katalog-search" placeholder="Cari nama obat atau kode..." class="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" oninput="AppApotekTransaksi.onKatalogSearch(this.value)" autofocus>';
        html += '  </div>';
        html += '  <div id="katalog-grid" class="overflow-y-auto flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-2"></div>';
        html += '  <div class="pt-4 mt-2 border-t border-slate-200 dark:border-slate-700 flex justify-end">';
        html += '    <button type="button" onclick="Utils.closeModal()" class="px-5 py-2.5 text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg">Selesai</button>';
        html += '  </div>';
        html += '</div>';

        // Modal katalog perlu lebih lebar dari modal standar (max-w-lg) supaya
        // grid produknya tidak sempit -- override lewat kelas pada wrapper modal
        // langsung (Utils.openModal membungkus dengan max-w-lg secara default).
        Utils.openModal(html);
        var modal = document.getElementById('global-modal');
        if (modal && modal.firstElementChild) {
            modal.firstElementChild.className = modal.firstElementChild.className.replace('max-w-lg', 'max-w-4xl');
        }

        this.renderKatalogGrid();
    },

    onKatalogSearch: function(val) {
        this.katalogSearch = (val || '').toLowerCase().trim();
        this.renderKatalogGrid();
    },

    // Hitung total qty produk tertentu yang SUDAH ada di keranjang saat ini --
    // dipakai untuk badge "X di keranjang" di tiap kartu katalog.
    _qtyDiKeranjang: function(obatId) {
        var total = 0;
        document.querySelectorAll('[id^="trx-obat-"]').forEach(function(sel) {
            if (sel.value === obatId) {
                var idx = sel.id.replace('trx-obat-', '');
                var qtyEl = document.getElementById('trx-qty-' + idx);
                total += qtyEl ? (parseFloat(qtyEl.value) || 0) : 0;
            }
        });
        return total;
    },

    renderKatalogGrid: function() {
        var grid = document.getElementById('katalog-grid');
        if (!grid) return;
        var self = this;

        var list = this.masterObat;
        if (this.katalogSearch) {
            list = list.filter(function(o) {
                return (o.namaObat && o.namaObat.toLowerCase().indexOf(self.katalogSearch) !== -1) ||
                       (o.kodeObat && o.kodeObat.toLowerCase().indexOf(self.katalogSearch) !== -1);
            });
        }

        if (list.length === 0) {
            grid.innerHTML = '<div class="col-span-full text-center py-16 text-slate-400"><i data-lucide="package-x" class="w-10 h-10 mx-auto mb-2"></i><p class="text-sm">Produk tidak ditemukan</p></div>';
            if (window.lucide) lucide.createIcons({ nodes: [grid] });
            return;
        }

        var html = '';
        list.forEach(function(o) {
            var habis = (o.stok || 0) <= 0;
            var qtyKeranjang = self._qtyDiKeranjang(o.id);
            var gambar = o.gambarObat ?
                '<img src="' + o.gambarObat + '" class="w-full h-full object-cover">' :
                '<div class="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900"><i data-lucide="image" class="w-7 h-7 text-slate-300"></i></div>';

            html += '<button type="button" onclick="AppApotekTransaksi.pilihDariKatalog(\'' + o.id + '\')" class="text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden hover:border-primary-400 hover:shadow-md transition relative group">';
            if (qtyKeranjang > 0) {
                html += '  <span class="absolute top-1.5 right-1.5 z-10 bg-primary-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow">' + qtyKeranjang + ' di keranjang</span>';
            }
            html += '  <div class="aspect-square w-full relative">' + gambar;
            if (habis) html += '    <div class="absolute inset-0 bg-black/40 flex items-center justify-center"><span class="text-white text-[10px] font-bold bg-red-600 px-2 py-0.5 rounded">STOK HABIS</span></div>';
            html += '  </div>';
            html += '  <div class="p-2">';
            html += '    <p class="text-xs font-medium text-gray-800 dark:text-white line-clamp-2 leading-tight mb-1" title="' + Utils.escapeHtml(o.namaObat || '') + '">' + Utils.escapeHtml(o.namaObat || '-') + '</p>';
            html += '    <p class="text-xs font-bold text-primary-600">' + Utils.formatRupiah(o.hargaJual) + '</p>';
            html += '    <p class="text-[10px] text-slate-400">Stok: ' + (o.stok || 0) + ' ' + Utils.escapeHtml(o.satuan || '') + '</p>';
            html += '  </div>';
            html += '</button>';
        });

        grid.innerHTML = html;
        if (window.lucide) lucide.createIcons({ nodes: [grid] });
    },

    pilihDariKatalog: function(obatId) {
        var container = document.getElementById('trx-cart-container');
        var selects = container ? container.querySelectorAll('[id^="trx-obat-"]') : [];
        var existingIdx = null;
        for (var i = 0; i < selects.length; i++) {
            if (selects[i].value === obatId) { existingIdx = selects[i].id.replace('trx-obat-', ''); break; }
        }

        var obat = this.masterObat.find(function(o) { return o.id === obatId; });

        if (existingIdx !== null) {
            var qtyEl = document.getElementById('trx-qty-' + existingIdx);
            qtyEl.value = (parseFloat(qtyEl.value) || 0) + 1;
            this.hitungTotal();
        } else {
            this.addItem(obatId);
        }

        Utils.toast((obat ? obat.namaObat : 'Produk') + ' ditambahkan ke keranjang', 'success');
        // Refresh badge "X di keranjang" di grid supaya kasir langsung lihat
        // efeknya tanpa harus tutup-buka modal lagi (marketplace-style rapid add).
        this.renderKatalogGrid();
    },

    onSelectObat: function(idx) {
        var obatId = document.getElementById('trx-obat-' + idx).value;
        var hargaEl = document.getElementById('trx-harga-' + idx);
        var hintEl = document.getElementById('trx-hint-' + idx);
        if (!obatId) { hargaEl.value = 0; if (hintEl) hintEl.textContent = ''; this.hitungTotal(); return; }

        var obat = this.masterObat.find(function(o) { return o.id === obatId; });
        if (!obat) return;

        var isResep = (this.tipe === 'resep_klinik' || this.tipe === 'resep_luar');
        var cfg = this.pengaturan;
        var marginPersen = (cfg && cfg.marginResep) ? parseFloat(cfg.marginResep) : 0;

        if (isResep && marginPersen > 0 && obat.hpp > 0) {
            var hargaAuto = Math.ceil(obat.hpp * (1 + marginPersen / 100));
            hargaEl.value = hargaAuto;
            if (hintEl) { hintEl.textContent = 'AUTO: HPP + ' + marginPersen + '%'; hintEl.className = 'text-[10px] text-emerald-600 mt-1 font-semibold'; }
        } else {
            hargaEl.value = obat.hargaJual || 0;
            if (hintEl) { hintEl.textContent = isResep ? 'Harga Manual (Margin 0%)' : 'Harga Jual Bebas'; hintEl.className = 'text-[10px] text-slate-400 mt-1'; }
        }
        this.hitungTotal();
    },

    removeItem: function(idx) {
        var row = document.getElementById('trx-row-' + idx);
        if (row) row.remove();
        if (!document.getElementById('trx-cart-container').querySelector('[id^="trx-row-"]')) {
            document.getElementById('trx-cart-container').innerHTML = '<p class="text-sm text-slate-400 italic p-2">Tambahkan obat ke keranjang.</p>';
        }
        this.hitungTotal();
    },

    // ========== HITUNG TOTAL ==========
    hitungTotal: function() {
        var self = this;
        var container = document.getElementById('trx-cart-container');
        if (!container) return;

        var rows = container.querySelectorAll('[id^="trx-row-"]');
        var totalObat = 0;
        var totalRacik = 0;
        var totalPPNKeluaran = 0;
        var cfg = this.pengaturan;
        var nilaiRacikConfig = (cfg && cfg.racikObat && cfg.racikObat.nilai) ? cfg.racikObat.nilai : 0;

        rows.forEach(function(row) {
            var idx = row.id.split('-').pop();
            var obatId = document.getElementById('trx-obat-' + idx)?.value;
            var qty = parseInt(document.getElementById('trx-qty-' + idx)?.value) || 0;
            var harga = parseInt(document.getElementById('trx-harga-' + idx)?.value) || 0;
            var sub = qty * harga;
            var subEl = document.getElementById('trx-sub-' + idx);
            if (subEl) subEl.textContent = Utils.formatRupiah(sub);
            totalObat += sub;

            var obat = self.masterObat.find(function(o) { return o.id === obatId; });
            var isPPN = obat ? (obat.isPPN !== false) : true;
            if (isPPN) {
                totalPPNKeluaran += Math.round(sub - (sub / 1.11));
            }

            if (self.tipe === 'resep_klinik' || self.tipe === 'resep_luar') {
                var racikEl = document.getElementById('trx-racik-' + idx);
                if (racikEl && racikEl.checked) totalRacik += nilaiRacikConfig;
            }
        });

        // Hitung Total Tindakan (Klinik & Apotek)
        var totalTindakan = 0;
        // 1. Dari Klinik (hidden input)
        document.querySelectorAll('[id^="trx-tindakan-klinik-"]').forEach(function(input) {
            totalTindakan += parseFloat(input.value) || 0;
        });
        // 2. Dari Apotek Manual (input readonly)
        document.querySelectorAll('[id^="trx-tindakan-harga-"]').forEach(function(input) {
            totalTindakan += parseFloat(input.value) || 0;
        });

        // Hitung jasa resep
        var jasaResep = 0;
        if (this.tipe === 'resep_klinik' && cfg && Array.isArray(cfg.resepKlinik)) {
            var resepIdEl = document.getElementById('trx-resep-id');
            var selectedResepId = resepIdEl ? resepIdEl.value : '';
            if (selectedResepId) {
                var resepData = this.resepList.find(function(r) { return r.id === selectedResepId; });
                if (resepData) {
                    var skemaDokter = cfg.resepKlinik.find(function(d) { return d.dokterId === resepData.dokterId; });
                    if (!skemaDokter && resepData.namaDokter) {
                        skemaDokter = cfg.resepKlinik.find(function(d) { return d.namaDokter === resepData.namaDokter; });
                    }
                    if (skemaDokter && skemaDokter.nilaiResep > 0) jasaResep = skemaDokter.nilaiResep;
                }
            }
        } else if (this.tipe === 'resep_luar' && cfg && cfg.resepLuar) {
            var dokterLuarEl = document.getElementById('trx-dokter-luar-id');
            if (dokterLuarEl && dokterLuarEl.value && cfg.resepLuar.nilaiResep > 0) jasaResep = cfg.resepLuar.nilaiResep;
        }

        var totalRaw = totalObat + totalRacik + totalTindakan + jasaResep;
        var totalRounded = Math.ceil(totalRaw / 1000) * 1000;
        var pembulatan = totalRounded - totalRaw;

        document.getElementById('trx-total-obat').textContent = Utils.formatRupiah(totalObat);
        document.getElementById('trx-ppn-keluaran').textContent = Utils.formatRupiah(totalPPNKeluaran);
        document.getElementById('trx-nilai-bersih').textContent = Utils.formatRupiah(totalObat - totalPPNKeluaran);
        document.getElementById('trx-total-racik').textContent = totalRacik > 0 ? Utils.formatRupiah(totalRacik) : '-';
        document.getElementById('trx-total-tindakan').textContent = totalTindakan > 0 ? Utils.formatRupiah(totalTindakan) : '-';
        document.getElementById('trx-jasa-resep').textContent = jasaResep > 0 ? Utils.formatRupiah(jasaResep) : '-';
        document.getElementById('trx-pembulatan').textContent = pembulatan > 0 ? Utils.formatRupiah(pembulatan) : '-';
        document.getElementById('trx-grand-total').textContent = Utils.formatRupiah(totalRounded);
    },

    // ========== SIMPAN & CETAK ==========
    simpan: function() {
        var self = this;

        // FIX (BUG KLIK DOBEL): sebelumnya tombol "Proses & Simpan" tidak pernah
        // di-disable dan tidak ada flag guard, jadi kalau kasir klik 2x dengan cepat
        // (koneksi lambat / tap ganda di HP-tablet), dua transaksi terpisah bisa
        // tersimpan untuk 1 kali penjualan -- stok berkurang dobel & pendapatan
        // tercatat dobel. Pola guard ini sudah dipakai di js/keuangan/payroll.js
        // ("cegah klik dobel"), sekarang diterapkan juga di sini.
        if (this._isSaving) return;
        this._isSaving = true;
        var btnSimpan = document.querySelector('#trx-content button[onclick="AppApotekTransaksi.simpan()"]');
        if (btnSimpan) { btnSimpan.disabled = true; btnSimpan.classList.add('opacity-50', 'cursor-not-allowed'); }
        var _resetGuard = function() {
            self._isSaving = false;
            if (btnSimpan) { btnSimpan.disabled = false; btnSimpan.classList.remove('opacity-50', 'cursor-not-allowed'); }
        };

        if (this.tipe === 'resep_luar') {
            var dokterLuarVal = document.getElementById('trx-dokter-luar-id').value.trim();
            if (!dokterLuarVal) {
                Utils.toast('Nama dokter pemberi resep wajib diisi', 'error'); _resetGuard(); return;
            }
            if (dokterLuarVal === '__LAINNYA__' && !document.getElementById('trx-dokter-luar-manual').value.trim()) {
                Utils.toast('Nama dokter/puskesmas wajib diisi', 'error'); _resetGuard(); return;
            }
        }
        if (this.tipe === 'resep_klinik' && !document.getElementById('trx-resep-id').value) {
            Utils.toast('Pilih resep klinik yang akan diproses', 'error'); _resetGuard(); return;
        }

        var items = [];
        var racikanItems = [];
        var rows = document.querySelectorAll('[id^="trx-row-"]');

        rows.forEach(function(row) {
            var idx = row.id.split('-').pop();
            var obatId = document.getElementById('trx-obat-' + idx).value;
            if (!obatId) return;

            var obat = self.masterObat.find(function(o) { return o.id === obatId; });
            if (!obat) return;

            var jumlah = parseInt(document.getElementById('trx-qty-' + idx).value) || 0;
            var hargaJual = parseInt(document.getElementById('trx-harga-' + idx).value) || 0;
            if (jumlah <= 0) return;

            items.push({
                obatId: obatId, namaObat: obat.namaObat || '-', kodeObat: obat.kodeObat || '-',
                satuan: obat.satuan || '-', hargaJual: hargaJual, hargaBeli: obat.hpp || 0, jumlah: jumlah,
                isPPN: obat.isPPN !== false
            });

            if (self.tipe === 'resep_klinik' || self.tipe === 'resep_luar') {
                var racikEl = document.getElementById('trx-racik-' + idx);
                if (racikEl && racikEl.checked) {
                    racikanItems.push({ namaObat: obat.namaObat || '-', kodeObat: obat.kodeObat || '-' });
                }
            }
        });

        if (items.length === 0) { Utils.toast('Tambahkan minimal 1 obat', 'error'); _resetGuard(); return; }

        // Kumpulkan Tindakan (SERTAKAN MODAL NYA!)
        var tindakanItemsFinal = [];
        if (this.tipe === 'resep_klinik') {
            var resepIdFinal = document.getElementById('trx-resep-id').value;
            var resepData = this.resepList.find(function(r) { return r.id === resepIdFinal; });
            if (resepData && resepData.tindakanItems) {
                tindakanItemsFinal = resepData.tindakanItems.map(function(t) {
                    return { namaTindakan: t.namaTindakan, hargaJual: t.hargaJual, modal: t.modal, kategori: 'klinik' };
                });
            }
        } else {
            // FIX: sebelumnya kategori di-hardcode 'apotek' untuk SEMUA baris tindakan
            // manual, padahal sekarang baris bisa berasal dari dropdown "Tindakan
            // Klinik" ATAU "Tindakan Apotek" (lihat addTindakan()). Ambil kategori
            // dari master data tindakan itu sendiri (tData.kategori) supaya tindakan
            // klinik tanpa resep tetap tercatat kategori 'klinik' — ini yang membuatnya
            // ikut terhitung ke pool "Tindakan Klinik (Tuslah)" di payroll, bukan
            // ke pool Apotek.
            document.querySelectorAll('[id^="trx-tindakan-row-"]').forEach(function(row) {
                var idx = row.id.replace('trx-tindakan-row-', '');
                var selectEl = document.getElementById('trx-tindakan-select-' + idx);
                var tindId = selectEl.value;
                if(tindId) {
                    var tData = self.masterTindakan.find(function(t){ return t.id === tindId; });
                    if(tData) tindakanItemsFinal.push({ namaTindakan: tData.nama, hargaJual: tData.hargaJual, modal: tData.modal, kategori: tData.kategori || 'apotek' });
                }
            });
        }

        var cfg = this.pengaturan;
        var totalObat = items.reduce(function(sum, i) { return sum + (i.jumlah * i.hargaJual); }, 0);
        var nilaiRacikConfig = (cfg && cfg.racikObat && cfg.racikObat.nilai) ? cfg.racikObat.nilai : 0;
        var totalRacik = racikanItems.length * nilaiRacikConfig;
        var totalTindakan = tindakanItemsFinal.reduce(function(sum, t) { return sum + (t.hargaJual || 0); }, 0);
        
        var jasaResepFinal = 0;
        var resepIdFinal = null, dokterIdFinal = null, dokterLuarFinal = null;

        if (this.tipe === 'resep_klinik') {
            resepIdFinal = document.getElementById('trx-resep-id').value;
            var resepData2 = this.resepList.find(function(r) { return r.id === resepIdFinal; });
            if (resepData2) {
                dokterIdFinal = resepData2.dokterId || null;
                if (cfg && Array.isArray(cfg.resepKlinik)) {
                    var skemaDokter = cfg.resepKlinik.find(function(d) { return d.dokterId === dokterIdFinal; });
                    if (!skemaDokter && resepData2.namaDokter) {
                        skemaDokter = cfg.resepKlinik.find(function(d) { return d.namaDokter === resepData2.namaDokter; });
                    }
                    if (skemaDokter) jasaResepFinal = skemaDokter.nilaiResep || 0;
                }
            }
        } else if (this.tipe === 'resep_luar') {
            var dokterLuarSelect = document.getElementById('trx-dokter-luar-id');
            if (dokterLuarSelect.value === '__LAINNYA__') {
                // FIX (permintaan user): dokter di luar daftar Pengaturan/Pembagian (puskesmas/dokter jauh)
                dokterIdFinal = null;
                dokterLuarFinal = document.getElementById('trx-dokter-luar-manual').value.trim();
            } else {
                dokterIdFinal = dokterLuarSelect.value || null;
                dokterLuarFinal = dokterLuarSelect.options[dokterLuarSelect.selectedIndex].getAttribute('data-nama');
            }
            if (cfg && cfg.resepLuar) jasaResepFinal = cfg.resepLuar.nilaiResep || 0;
        }

        var totalRaw = totalObat + totalRacik + totalTindakan + jasaResepFinal;
        var totalRounded = Math.ceil(totalRaw / 1000) * 1000;
        var pembulatan = totalRounded - totalRaw;
        var metodeBayar = document.getElementById('trx-metode-bayar').value;

        var totalPPNKeluaran = 0;
        items.forEach(function(item) {
            if (item.isPPN !== false) {
                var sub = item.jumlah * item.hargaJual;
                totalPPNKeluaran += Math.round(sub - (sub / 1.11));
            }
        });

        var obj = {
            tipe: this.tipe,
            tanggal: Utils.today(), // FIX KRITIS: sebelumnya pakai UTC, transaksi dini hari (00:00-07:00 WIB) tersimpan dengan tanggal KEMARIN sehingga tidak muncul di laporan/dashboard "hari ini"
            namaPasien: document.getElementById('trx-pasien').value.trim(),
            dokterId: dokterIdFinal,
            dokterLuar: dokterLuarFinal,
            resepId: resepIdFinal,
            items: items,
            racikanItems: racikanItems,
            tindakanItems: tindakanItemsFinal,
            totalObat: totalObat,
            totalRacik: totalRacik,
            totalTindakan: totalTindakan,
            jasaResep: jasaResepFinal,
            pembulatan: pembulatan,
            totalAkhir: totalRounded,
            metodeBayar: metodeBayar,
            totalPPN: totalPPNKeluaran,
            nilaiBersih: totalRounded - totalPPNKeluaran,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // FIX 2: Buka jendela print duluan biar gak kena blokir Popup Blocker browser
        var printWindow = window.open('', '', 'width=400,height=600');

        Utils.toast('Memproses transaksi...', 'info');

        // FIX (KEAMANAN STOK): sebelumnya pakai batch.update() + FieldValue.increment()
        // yang TIDAK membaca stok terkini dan TIDAK memvalidasi hasil akhir -- kalau ada
        // 2 transaksi bersamaan untuk obat yang sama, stok bisa jadi MINUS (oversell).
        // Sekarang pakai runTransaction(): baca stok semua obat dulu di dalam transaksi,
        // validasi cukup, baru tulis. Firestore otomatis retry transaksi ini kalau ada
        // transaksi lain yang menyentuh dokumen obat yang sama di waktu bersamaan,
        // sehingga pengecekan stok selalu berdasarkan data terbaru (tidak stale).
        var trxRef = db.collection('transaksi').doc();

        // FIX (BUG STOK GANDA): sebelumnya setiap baris item ditangani satu-per-satu,
        // sehingga kalau obat yang SAMA muncul di lebih dari satu baris (mis. kasir
        // menambahkan Paracetamol di baris 1 & baris 3), kedua baris tsb membaca stok
        // AWAL yang sama lalu masing-masing menghitung "stokBaru" dari angka awal itu
        // -- padahal keduanya menulis ke dokumen obat yang sama, jadi tx.update() kedua
        // menimpa hasil tx.update() pertama (bukan terakumulasi). Akibatnya stok yang
        // tersimpan hanya terpotong utk SALAH SATU baris, bukan total gabungan
        // keduanya (data stok jadi lebih besar dari yang seharusnya / bisa oversell).
        // Perbaikan: gabungkan (sum) jumlah per obatId dulu -- sama seperti pola yang
        // sudah dipakai di js/apotek/retur.js (deltaMap) -- baru divalidasi & ditulis
        // sekali per obatId.
        var qtyPerObat = {};
        items.forEach(function(item) {
            qtyPerObat[item.obatId] = (qtyPerObat[item.obatId] || 0) + item.jumlah;
        });
        var obatIdsUnik = Object.keys(qtyPerObat);

        // FIX (BUG RESEP DOBEL): sebelumnya statusResep rekamMedis langsung ditulis
        // 'selesai' TANPA dibaca/divalidasi dulu di dalam transaksi (beda dengan stok
        // obat yang sudah divalidasi dengan benar di atas). Kalau simpan() ini
        // ke-trigger dua kali untuk resep yang sama (klik dobel sebelum ada guard,
        // atau dua tab/sesi kasir yang masih menampilkan resep yang sama karena
        // resepList tidak real-time), resep bisa tertagih & "terhabiskan" dua kali.
        // Sekarang statusResep ikut dibaca & divalidasi di dalam transaksi yang sama.
        var resepRef = (self.tipe === 'resep_klinik' && obj.resepId) ? db.collection('rekamMedis').doc(obj.resepId) : null;

        db.runTransaction(function(tx) {
            // 1) BACA semua dokumen obat yang terlibat TERLEBIH DAHULU (wajib di Firestore:
            //    semua read harus selesai sebelum write pertama dalam satu transaksi).
            var obatRefs = obatIdsUnik.map(function(obatId) {
                return db.collection('obat').doc(obatId);
            });
            var reads = obatRefs.map(function(ref) { return tx.get(ref); });
            if (resepRef) reads.push(tx.get(resepRef));

            return Promise.all(reads)
                .then(function(allSnaps) {
                    var snaps = allSnaps.slice(0, obatRefs.length);
                    if (resepRef) {
                        var resepSnap = allSnaps[obatRefs.length];
                        if (!resepSnap.exists) {
                            throw new Error('Resep klinik terkait tidak ditemukan (mungkin sudah dihapus).');
                        }
                        var statusResepSaatIni = resepSnap.data().statusResep;
                        if (statusResepSaatIni && statusResepSaatIni !== 'menunggu') {
                            throw new Error('Resep ini sudah diproses/ditagih sebelumnya oleh transaksi lain.');
                        }
                    }
                    // 2) VALIDASI: pastikan setiap obat masih ada & stok TOTAL (gabungan semua
                    //    baris obat yang sama) cukup. Jika tidak, batalkan seluruh transaksi
                    //    (throw) -- tidak ada perubahan sebagian (all-or-nothing).
                    var updates = [];
                    for (var i = 0; i < obatIdsUnik.length; i++) {
                        var obatId = obatIdsUnik[i];
                        var snap = snaps[i];
                        var totalJumlah = qtyPerObat[obatId];
                        // Nama obat untuk pesan error (ambil dari baris item pertama yang cocok)
                        var namaObatRef = items.find(function(it) { return it.obatId === obatId; });
                        var namaObat = namaObatRef ? namaObatRef.namaObat : obatId;

                        if (!snap.exists) {
                            throw new Error('Obat "' + namaObat + '" tidak ditemukan (mungkin sudah dihapus).');
                        }

                        var stokSaatIni = snap.data().stok || 0;
                        if (stokSaatIni < totalJumlah) {
                            throw new Error('Stok "' + namaObat + '" tidak cukup. Tersisa ' +
                                stokSaatIni + ', dibutuhkan ' + totalJumlah + '.');
                        }

                        // Ambil HPP rata-rata TERKINI di dalam transaction, bukan dari
                        // cache form kasir. Ini membuat HPP penjualan konsisten bila ada
                        // pembelian yang mengubah HPP bersamaan dengan transaksi.
                        items.forEach(function(item) {
                            if (item.obatId === obatId) {
                                item.hargaBeli = parseFloat(snap.data().hpp) || 0;
                            }
                        });

                        updates.push({ ref: obatRefs[i], stokBaru: stokSaatIni - totalJumlah });
                    }

                    // 3) TULIS: simpan transaksi + kurangi stok obat, semua atomik.
                    // hargaBeli pada item sekarang merupakan HPP moving-average yang
                    // benar-benar berlaku saat penjualan terjadi.
                    obj.items = items;
                    tx.set(trxRef, obj);
                    updates.forEach(function(u) {
                        // Tulis nilai absolut hasil validasi (bukan increment lagi),
                        // supaya nilai yang tersimpan konsisten dengan yang divalidasi
                        // di atas & selalu >= 0.
                        tx.update(u.ref, { stok: u.stokBaru });
                    });

                    if (resepRef) {
                        tx.update(resepRef, { statusResep: 'selesai' });
                    }
                });
        }).then(function() {
            obj.id = trxRef.id;
            Utils.toast('Transaksi berhasil! Stok obat dikurangi.', 'success');
            self.cetakStruk(obj, printWindow); // KIRIM WINDOW YANG SUDAH DIBUKA KE FUNGSI CETAK
            _resetGuard();
            AppApotekTransaksi.init();
        }).catch(function(err) {
            Utils.toast('Gagal menyimpan: ' + err.message, 'error');
            if (printWindow) printWindow.close(); // Tutup window kalau transaksinya gagal
            _resetGuard();
        });
    },

    // ========== CETAK STRUK ==========
    cetakStruk: function(data, w) {
        if(!w) {
            Utils.toast('Popup struk diblokir browser. Izinkan pop-up untuk situs ini.', 'error');
            return;
        }

        // Tampilkan loading di window cetak selagi mengambil data dari Firestore
        w.document.write('<html><head><title>Struk Transaksi</title></head><body style="font-family:monospace;padding:20px;text-align:center;">Memuat data struk...</body></html>');
        w.document.close();
        
        db.collection('pengaturan').doc('profil').get().then(function(doc) {
            var p = doc.exists ? doc.data() : {};
            
            // JIKA printer termal Bluetooth terhubung, cetak langsung via Bluetooth!
            if (window.ThermalPrinter && window.ThermalPrinter.isConnected()) {
                window.ThermalPrinter.printReceipt(data, p);
                
                // Jika otomatis cetak aktif, tutup window browser standard dan tidak perlu dialog print browser
                if (window.ThermalPrinter.isAutoPrint) {
                    if (w) {
                        w.close();
                        return;
                    }
                }
            }
            
            // Fallback values bila record belum ada atau kosong
            var namaInstansi = p.nama || 'Aulia Apotek Klinik';
            var tampilkanLogo = p.tampilkanLogo !== false;
            var logoStrukB64 = p.logoStrukB64 || '';
            var logoUkuran = p.logoUkuran || 100;
            var logoPosisi = p.logoPosisi || 'center';
            
            var h1 = p.strukHeader1 || namaInstansi;
            var h2 = p.strukHeader2 || '';
            var h3 = p.strukHeader3 || p.alamat || '';
            var h4 = p.strukHeader4 || (p.telp ? 'Telp: ' + p.telp : '');
            var hSelesai = p.strukHeaderSelesai || '';
            
            var showPasien = p.showPasien !== false;
            var showDokter = p.showDokter !== false;
            var showMetodeBayar = p.showMetodeBayar !== false;
            
            var f1 = p.strukFooter1 || 'Terima Kasih';
            var f2 = p.strukFooter2 || 'Semoga Lekas Sembuh';
            var fRetur = p.footerStruk || '';
            
            var strukLebar = p.strukLebar || '80mm';
            var strukUkuranFont = p.strukUkuranFont || '12px';

            var tgl = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
            
            var html = '<html><head><title>Struk Transaksi</title>';
            html += '<style>';
            html += '@media print { .no-print { display: none !important; } }';
            html += 'body { font-family: "Courier New", monospace; font-size: ' + strukUkuranFont + '; width: ' + strukLebar + '; margin: 0; padding: 10px; color: #000; }';
            html += 'h2, h3, p { margin: 0; padding: 0; text-align: center; }';
            html += 'hr { border-top: 1px dashed #000; margin: 8px 0; }';
            html += 'table { width: 100%; border-collapse: collapse; }';
            html += 'td { vertical-align: top; padding: 2px 0; }';
            html += '.right { text-align: right; }';
            html += '.bold { font-weight: bold; }';
            html += '.center { text-align: center; }';
            html += '.flex-logo { display: flex; }';
            html += '.flex-logo.center { justify-content: center; }';
            html += '.flex-logo.left { justify-content: flex-start; }';
            html += '.flex-logo.right { justify-content: flex-end; }';
            html += '</style></head><body>';
            
            // JIKA printer termal Bluetooth terhubung, tampilkan tombol aksi manual di popup
            if (window.ThermalPrinter && window.ThermalPrinter.isConnected()) {
                html += '<div class="no-print" style="background:#eff6ff; border: 1px solid #bfdbfe; padding:8px; margin-bottom:12px; border-radius:6px; display:flex; gap:6px; justify-content:center; align-items:center;">';
                html += '  <button onclick="window.opener.ThermalPrinter.printReceipt(' + JSON.stringify(data).replace(/"/g, '&quot;') + ', ' + JSON.stringify(p).replace(/"/g, '&quot;') + ');" style="background:#2563eb; color:white; border:none; padding:6px 12px; border-radius:4px; font-family:sans-serif; font-size:11px; font-weight:bold; cursor:pointer; display:flex; align-items:center; gap:4px;">🔌 Cetak Bluetooth</button>';
                html += '  <button onclick="window.print()" style="background:#475569; color:white; border:none; padding:6px 12px; border-radius:4px; font-family:sans-serif; font-size:11px; font-weight:bold; cursor:pointer;">📄 Cetak Biasa</button>';
                html += '</div>';
            }
            
            // 1. Logo
            if (tampilkanLogo) {
                var alignClass = logoPosisi; // left, center, right
                if (logoStrukB64) {
                    html += '<div class="flex-logo ' + alignClass + '" style="margin-bottom: 8px;">';
                    html += '  <img src="' + logoStrukB64 + '" style="width: ' + logoUkuran + 'px; height: auto;">';
                    html += '</div>';
                } else {
                    // Default circle logo if no base64 logo uploaded but toggle is true
                    html += '<div class="flex-logo ' + alignClass + '" style="margin-bottom: 8px;">';
                    html += '  <div style="border: 1.5px solid #000; border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px;">';
                    html += '    ' + h1.charAt(0);
                    html += '  </div>';
                    html += '</div>';
                }
            }

            // 2. Headers
            if (h1) html += '<h2 class="bold">' + Utils.escapeHtml(h1) + '</h2>';
            if (h2) html += '<p>' + Utils.escapeHtml(h2) + '</p>';
            if (h3) html += '<p>' + Utils.escapeHtml(h3) + '</p>';
            if (h4) html += '<p>' + Utils.escapeHtml(h4) + '</p>';
            if (hSelesai) html += '<p style="font-style: italic; margin-top: 2px;">' + Utils.escapeHtml(hSelesai) + '</p>';
            
            html += '<hr>';
            
            // 3. Metadata
            html += '<table>';
            html += '<tr><td style="width: 25%;">No</td><td>: ' + data.id.substring(0, 8).toUpperCase() + '</td></tr>';
            html += '<tr><td>Tgl</td><td>: ' + tgl + '</td></tr>';
            if (showPasien) {
                html += '<tr><td>Pasien</td><td>: ' + Utils.escapeHtml(data.namaPasien || '-') + '</td></tr>';
            }
            if (showDokter && (data.tipe === 'resep_klinik' || data.tipe === 'resep_luar')) {
                html += '<tr><td>Dokter</td><td>: ' + Utils.escapeHtml(data.dokterLuar || 'Klinik') + '</td></tr>';
            }
            if (showMetodeBayar) {
                html += '<tr><td>Bayar</td><td>: ' + ((data.metodeBayar || '-') + '').toUpperCase() + '</td></tr>';
            }
            html += '</table><hr>';
            
            // 4. Items Table
            html += '<table>';
            data.items.forEach(function(item) {
                html += '<tr><td colspan="2">' + Utils.escapeHtml(item.namaObat || '') + '</td></tr>';
                html += '<tr><td>' + item.jumlah + ' x ' + Utils.formatRupiah(item.hargaJual) + '</td><td class="right">' + Utils.formatRupiah(item.jumlah * item.hargaJual) + '</td></tr>';
            });
            html += '</table><hr>';
            
            if (data.tindakanItems && data.tindakanItems.length > 0) {
                html += '<table>';
                data.tindakanItems.forEach(function(t) {
                    html += '<tr><td>' + Utils.escapeHtml(t.namaTindakan || '') + '</td><td class="right">' + Utils.formatRupiah(t.hargaJual) + '</td></tr>';
                });
                html += '</table><hr>';
            }
            
            // 5. Totals
            html += '<table>';
            html += '<tr><td>Total Obat</td><td class="right">' + Utils.formatRupiah(data.totalObat) + '</td></tr>';
            if (data.totalRacik > 0) html += '<tr><td>Racik (' + data.racikanItems.length + ' item)</td><td class="right">' + Utils.formatRupiah(data.totalRacik) + '</td></tr>';
            if (data.totalTindakan > 0) html += '<tr><td>Total Tindakan</td><td class="right">' + Utils.formatRupiah(data.totalTindakan) + '</td></tr>';
            if (data.jasaResep > 0) html += '<tr><td>Jasa Resep</td><td class="right">' + Utils.formatRupiah(data.jasaResep) + '</td></tr>';
            if (data.pembulatan > 0) html += '<tr><td>Pembulatan</td><td class="right">' + Utils.formatRupiah(data.pembulatan) + '</td></tr>';
            html += '<tr class="bold"><td>TOTAL</td><td class="right">' + Utils.formatRupiah(data.totalAkhir) + '</td></tr>';
            // Etalase Haypop: ditampilkan terpisah, TIDAK termasuk totalAkhir yang tersimpan/keuangan.
            if (data.etalaseItems && data.etalaseItems.length) {
                html += '<tr><td colspan="2"><hr></td></tr><tr><td colspan="2" class="bold">Etalase Haypop</td></tr>';
                data.etalaseItems.forEach(function(e) {
                    html += '<tr><td>' + Utils.escapeHtml(e.namaProduk || '-') + ' x' + e.qty + '</td><td class="right">' + Utils.formatRupiah(e.subtotal) + '</td></tr>';
                });
                html += '<tr class="bold"><td>TOTAL BAYAR</td><td class="right">' + Utils.formatRupiah(data.totalBayarKonsumen || ((data.totalAkhir || 0) + (data.etalaseTotal || 0))) + '</td></tr>';
            }
            html += '</table><hr>';
            
            // 6. Footers
            if (f1) html += '<p>' + Utils.escapeHtml(f1) + '</p>';
            if (f2) html += '<p>' + Utils.escapeHtml(f2) + '</p>';
            if (fRetur) html += '<p style="font-style: italic; margin-top: 4px;">* ' + Utils.escapeHtml(fRetur) + ' *</p>';
            
            if (window.ThermalPrinter && window.ThermalPrinter.isConnected()) {
                // Jangan panggil window.print() otomatis, agar user bisa memilih "Cetak Bluetooth" atau "Cetak Biasa" di tombol atas.
            } else {
                html += '<script>window.onload = function() { window.print(); }<\/script>';
            }
            html += '</body></html>';
            
            // Re-open/clear the document and write the real content
            w.document.open();
            w.document.write(html);
            w.document.close();
        }).catch(function(err) {
            console.error('Gagal mengambil profil struk:', err);
            // Fallback rendering in case of database load failure
            var tgl = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
            var html = '<html><head><title>Struk Transaksi</title>';
            html += '<style>body { font-family: "Courier New", monospace; font-size: 12px; width: 80mm; margin: 0; padding: 10px; color: #000; } h2, p { text-align: center; margin: 0; } hr { border-top: 1px dashed #000; margin: 8px 0; } table { width:100%; } .right { text-align:right; } .bold { font-weight:bold; }</style></head><body>';
            html += '<h2 class="bold">AULIA APOTEK KLINIK</h2>';
            html += '<p>Jl. Contoh Alamat No. 123, Kota</p><hr>';
            html += '<table><tr><td>No</td><td>: ' + data.id.substring(0, 8).toUpperCase() + '</td></tr>';
            html += '<tr><td>Tgl</td><td>: ' + tgl + '</td></tr></table><hr>';
            html += '<table>';
            data.items.forEach(function(item) {
                html += '<tr><td colspan="2">' + Utils.escapeHtml(item.namaObat || '') + '</td></tr>';
                html += '<tr><td>' + item.jumlah + ' x ' + Utils.formatRupiah(item.hargaJual) + '</td><td class="right">' + Utils.formatRupiah(item.jumlah * item.hargaJual) + '</td></tr>';
            });
            html += '</table><hr>';
            html += '<table><tr class="bold"><td>TOTAL</td><td class="right">' + Utils.formatRupiah(data.totalAkhir) + '</td></tr></table><hr>';
            html += '<p>Terima Kasih</p><p>Semoga Lekas Sembuh</p>';
            if (window.ThermalPrinter && window.ThermalPrinter.isConnected()) {
                html += '</body></html>';
            } else {
                html += '<script>window.onload = function() { window.print(); }<\/script></body></html>';
            }
            
            w.document.open();
            w.document.write(html);
            w.document.close();
        });
    }
};