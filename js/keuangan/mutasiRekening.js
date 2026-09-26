/**
 * js/keuangan/mutasiRekening.js
 * Modul Mutasi Rekening & Kas
 * Khusus Role: PSA & Keuangan
 *
 * Memungkinkan pemindahan dana antar rekening bank dan kas tunai (dan sebaliknya),
 * dilengkapi dengan informasi saldo real-time, pengaturan waktu & filter periode,
 * serta fitur edit tanggal dan waktu transaksi.
 */

window.AppKeuanganMutasiRekening = {
    _unsubs: [],
    dataMutasi: [],
    dataSaldoAwal: { kasUtama: 0, rekeningBank: 0, kasKecil: 0 },
    saldoReal: {
        kasUtama: 0,
        rekeningBank: 0,
        kasKecil: 0,
        total: 0,
        byAccount: {}
    },
    filterBulan: '',
    filterTglMulai: '',
    filterTglSelesai: '',
    filterKategori: 'semua',
    filterAkun: 'semua',
    searchQuery: '',
    editingId: null,

    // Daftar Akun Standar
    AKUN_LIST: [
        'Kas Utama (Tunai)',
        'Rekening Bank (BCA)',
        'Rekening Bank (Mandiri)',
        'Rekening Bank (BRI)',
        'Rekening Bank (Transfer / QRIS)',
        'Kas Kecil'
    ],

    render: function() {
        var userRole = window.currentRole || '';
        if (userRole !== 'psa' && userRole !== 'keuangan') {
            return '<div class="p-8 text-center text-rose-600 font-semibold bg-white dark:bg-slate-800 rounded-xl border border-rose-200 dark:border-rose-900/30 max-w-2xl mx-auto my-12">' +
                '<i data-lucide="shield-alert" class="w-12 h-12 mx-auto mb-3 text-rose-500"></i>' +
                '<h3 class="text-lg font-bold">Akses Ditolak</h3>' +
                '<p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Modul Mutasi Rekening &amp; Kas hanya dapat diakses oleh akun <b>PSA (Owner)</b> dan <b>Keuangan</b>.</p>' +
                '</div>';
        }

        var d = new Date();
        var defaultMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        if (!this.filterBulan) this.filterBulan = defaultMonth;

        var html = '<div class="page-enter max-w-7xl mx-auto space-y-6 pb-12">';
        
        // --- HEADER ---
        html += '<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm">';
        html += '  <div class="flex items-center gap-3.5">';
        html += '    <div class="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">';
        html += '      <i data-lucide="arrow-left-right" class="w-6 h-6"></i>';
        html += '    </div>';
        html += '    <div>';
        html += '      <h2 class="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">Mutasi Rekening &amp; Kas</h2>';
        html += '      <p class="text-xs text-slate-500 dark:text-slate-400">Pencatatan perpindahan dana antar rekening bank dan kas tunai</p>';
        html += '    </div>';
        html += '  </div>';
        html += '  <div class="flex items-center gap-2 flex-wrap">';
        html += '    <button onclick="AppKeuanganMutasiRekening.bukaModalSaldoAwal()" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 border border-slate-200 dark:border-slate-600">';
        html += '      <i data-lucide="settings-2" class="w-4 h-4"></i> Saldo Awal';
        html += '    </button>';
        html += '    <button onclick="AppKeuanganMutasiRekening.bukaModalMutasi()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-emerald-600/20 flex items-center gap-2">';
        html += '      <i data-lucide="plus-circle" class="w-4.5 h-4.5"></i> + Tambah Mutasi Dana';
        html += '    </button>';
        html += '  </div>';
        html += '</div>';

        // --- CARDS SALDO REAL ---
        html += '<div id="mutasi-saldo-container">';
        html += '  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">';
        html += '    <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm flex flex-col justify-between">';
        html += '      <div class="flex items-center justify-between">';
        html += '        <span class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><i data-lucide="wallet" class="w-4 h-4 text-emerald-500"></i> Kas Utama (Tunai)</span>';
        html += '        <span class="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-800">Kas Fisik</span>';
        html += '      </div>';
        html += '      <div class="mt-3"><h3 class="text-2xl font-black text-emerald-600 dark:text-emerald-400" id="card-kas-utama">Rp 0</h3><p class="text-[11px] text-slate-400 mt-1">Estimasi saldo tunai riil</p></div>';
        html += '    </div>';

        html += '    <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm flex flex-col justify-between">';
        html += '      <div class="flex items-center justify-between">';
        html += '        <span class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><i data-lucide="building-2" class="w-4 h-4 text-blue-500"></i> Rekening Bank &amp; QRIS</span>';
        html += '        <span class="px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full border border-blue-200 dark:border-blue-800">Non-Tunai</span>';
        html += '      </div>';
        html += '      <div class="mt-3"><h3 class="text-2xl font-black text-blue-600 dark:text-blue-400" id="card-rekening-bank">Rp 0</h3><p class="text-[11px] text-slate-400 mt-1">Estimasi saldo di rekening bank</p></div>';
        html += '    </div>';

        html += '    <div class="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-md flex flex-col justify-between border border-slate-700">';
        html += '      <div class="flex items-center justify-between">';
        html += '        <span class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5"><i data-lucide="coins" class="w-4 h-4 text-amber-400"></i> Total Likuiditas Real</span>';
        html += '        <span class="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">Realtime Sync</span>';
        html += '      </div>';
        html += '      <div class="mt-3"><h3 class="text-2xl font-black text-emerald-400" id="card-total-saldo">Rp 0</h3><p class="text-[11px] text-slate-400 mt-1">Total akumulasi kas &amp; bank</p></div>';
        html += '    </div>';
        html += '  </div>';
        html += '</div>';

        // --- FILTER & PENGATURAN WAKTU ---
        html += '<div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm space-y-3">';
        html += '  <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">';
        
        // Baris 1: Filter Tanggal & Periode
        html += '    <div class="flex items-center gap-2 flex-wrap">';
        html += '      <div class="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600">';
        html += '        <i data-lucide="calendar" class="w-4 h-4 text-emerald-500"></i>';
        html += '        <span class="text-xs text-slate-500 dark:text-slate-300 font-semibold">Bulan:</span>';
        html += '        <input type="month" id="filter-bulan-mutasi" value="' + this.filterBulan + '" onchange="AppKeuanganMutasiRekening.ubahFilter()" class="bg-transparent text-xs font-bold text-slate-700 dark:text-white outline-none cursor-pointer">';
        html += '      </div>';

        html += '      <div class="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600">';
        html += '        <i data-lucide="calendar-range" class="w-4 h-4 text-slate-400"></i>';
        html += '        <span class="text-xs text-slate-500 dark:text-slate-300 font-semibold">Tgl:</span>';
        html += '        <input type="date" id="filter-tgl-mulai-mutasi" value="' + this.filterTglMulai + '" onchange="AppKeuanganMutasiRekening.ubahFilter()" title="Tanggal Mulai" class="bg-transparent text-xs font-semibold text-slate-700 dark:text-white outline-none cursor-pointer">';
        html += '        <span class="text-xs text-slate-400 font-bold">s/d</span>';
        html += '        <input type="date" id="filter-tgl-selesai-mutasi" value="' + this.filterTglSelesai + '" onchange="AppKeuanganMutasiRekening.ubahFilter()" title="Tanggal Selesai" class="bg-transparent text-xs font-semibold text-slate-700 dark:text-white outline-none cursor-pointer">';
        html += '      </div>';
        html += '    </div>';

        // Baris 1 Kanan: Search & Reset
        html += '    <div class="flex items-center gap-2 flex-wrap">';
        html += '      <div class="relative flex-1 sm:w-64">';
        html += '        <i data-lucide="search" class="w-4 h-4 absolute left-3 top-2.5 text-slate-400"></i>';
        html += '        <input type="text" id="search-mutasi" value="' + Utils.escapeHtml(this.searchQuery) + '" onkeyup="AppKeuanganMutasiRekening.ubahFilter()" placeholder="Cari ket / nominal / petugas..." class="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 text-xs text-slate-700 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-emerald-500">';
        html += '      </div>';
        html += '      <button onclick="AppKeuanganMutasiRekening.resetFilter()" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl transition flex items-center gap-1 border border-slate-200 dark:border-slate-600" title="Reset Filter">';
        html += '        <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i> Reset';
        html += '      </button>';
        html += '    </div>';
        html += '  </div>';

        // Baris 2: Filter Kategori & Filter Akun
        html += '  <div class="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-700/60">';
        html += '    <span class="text-xs text-slate-400 font-bold flex items-center gap-1"><i data-lucide="filter" class="w-3.5 h-3.5 text-slate-400"></i> Filter Kategori:</span>';

        html += '    <select id="filter-kategori-mutasi" onchange="AppKeuanganMutasiRekening.ubahFilter()" class="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-xl border border-emerald-200 dark:border-emerald-800 outline-none cursor-pointer">';
        html += '      <option value="semua" ' + (this.filterKategori === 'semua' ? 'selected' : '') + '>Semua Jenis Kategori (Kas &amp; Bank)</option>';
        html += '      <option value="kas_saja" ' + (this.filterKategori === 'kas_saja' ? 'selected' : '') + '>💵 Transaksi Kas Tunai</option>';
        html += '      <option value="bank_saja" ' + (this.filterKategori === 'bank_saja' ? 'selected' : '') + '>🏦 Transaksi Rekening Bank / Non-Tunai</option>';
        html += '      <option value="kas_ke_bank" ' + (this.filterKategori === 'kas_ke_bank' ? 'selected' : '') + '>📥 Setor Tunai (Kas ➔ Rekening)</option>';
        html += '      <option value="bank_ke_kas" ' + (this.filterKategori === 'bank_ke_kas' ? 'selected' : '') + '>📤 Tarik Tunai (Rekening ➔ Kas)</option>';
        html += '      <option value="bank_ke_bank" ' + (this.filterKategori === 'bank_ke_bank' ? 'selected' : '') + '>🔄 Transfer Bank (Rekening ➔ Rekening)</option>';
        html += '    </select>';

        html += '    <select id="filter-akun-mutasi" onchange="AppKeuanganMutasiRekening.ubahFilter()" class="px-3 py-1.5 bg-slate-100 dark:bg-slate-700/60 text-xs font-semibold text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-600 outline-none cursor-pointer">';
        html += '      <option value="semua" ' + (this.filterAkun === 'semua' ? 'selected' : '') + '>Semua Nama Akun</option>';
        this.AKUN_LIST.forEach(function(ak) {
            var sel = self.filterAkun === ak ? 'selected' : '';
            html += '    <option value="' + Utils.escapeHtml(ak) + '" ' + sel + '>' + Utils.escapeHtml(ak) + '</option>';
        });
        html += '    </select>';
        html += '  </div>';
        html += '</div>';

        // --- TABEL RIWAYAT MUTASI ---
        html += '<div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">';
        html += '  <div class="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">';
        html += '    <h3 class="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2"><i data-lucide="history" class="w-4 h-4 text-emerald-500"></i> Riwayat Mutasi Dana</h3>';
        html += '    <span id="mutasi-count" class="text-xs font-semibold text-slate-500 dark:text-slate-400">0 transaksi</span>';
        html += '  </div>';

        html += '  <div class="overflow-x-auto">';
        html += '    <table class="w-full text-left text-xs border-collapse">';
        html += '      <thead>';
        html += '        <tr class="bg-slate-100/70 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">';
        html += '          <th class="p-3 text-center w-12">No</th>';
        html += '          <th class="p-3">Tanggal &amp; Jam</th>';
        html += '          <th class="p-3">Dari Akun (Sumber)</th>';
        html += '          <th class="p-3">Ke Akun (Tujuan)</th>';
        html += '          <th class="p-3 text-right">Nominal (Rp)</th>';
        html += '          <th class="p-3">Keterangan</th>';
        html += '          <th class="p-3">Petugas</th>';
        html += '          <th class="p-3 text-center w-24">Aksi</th>';
        html += '        </tr>';
        html += '      </thead>';
        html += '      <tbody id="tbody-mutasi" class="divide-y divide-slate-100 dark:divide-slate-700/60">';
        html += '        <tr><td colspan="8" class="p-8 text-center text-slate-400"><div class="spinner mx-auto mb-2"></div>Memuat data mutasi...</td></tr>';
        html += '      </tbody>';
        html += '    </table>';
        html += '  </div>';
        html += '</div>';

        // MODAL INPUT / EDIT MUTASI
        html += '<div id="modal-mutasi" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">';
        html += '  <div class="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-scaleIn">';
        html += '    <div class="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700">';
        html += '      <h3 id="modal-mutasi-title" class="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2"><i data-lucide="arrow-left-right" class="w-5 h-5 text-emerald-500"></i> Tambah Mutasi Rekening</h3>';
        html += '      <button onclick="AppKeuanganMutasiRekening.tutupModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"><i data-lucide="x" class="w-5 h-5"></i></button>';
        html += '    </div>';

        html += '    <form onsubmit="AppKeuanganMutasiRekening.simpanMutasi(event)" class="space-y-4">';
        html += '      <input type="hidden" id="mutasi-id" value="">';

        // Pengaturan Tanggal & Jam (editable)
        html += '      <div class="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80">';
        html += '        <div>';
        html += '          <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Tanggal Mutasi <span class="text-rose-500">*</span></label>';
        html += '          <input type="date" id="mutasi-tanggal" required class="w-full px-3 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 dark:text-white outline-none focus:border-emerald-500">';
        html += '        </div>';
        html += '        <div>';
        html += '          <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Waktu / Jam <span class="text-rose-500">*</span></label>';
        html += '          <input type="time" id="mutasi-waktu" required class="w-full px-3 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 dark:text-white outline-none focus:border-emerald-500">';
        html += '        </div>';
        html += '      </div>';

        // Dari Akun (Sumber) & Ke Akun (Tujuan)
        html += '      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">';
        html += '        <div>';
        html += '          <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Dari Akun (Sumber) <span class="text-rose-500">*</span></label>';
        html += '          <select id="mutasi-dari" required class="w-full px-3 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 dark:text-white outline-none focus:border-emerald-500">';
        this.AKUN_LIST.forEach(function(ak) {
            html += '        <option value="' + Utils.escapeHtml(ak) + '">' + Utils.escapeHtml(ak) + '</option>';
        });
        html += '          </select>';
        html += '        </div>';

        html += '        <div>';
        html += '          <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Ke Akun (Tujuan) <span class="text-rose-500">*</span></label>';
        html += '          <select id="mutasi-ke" required class="w-full px-3 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 dark:text-white outline-none focus:border-emerald-500">';
        this.AKUN_LIST.forEach(function(ak, idx) {
            var selected = idx === 1 ? 'selected' : '';
            html += '        <option value="' + Utils.escapeHtml(ak) + '" ' + selected + '>' + Utils.escapeHtml(ak) + '</option>';
        });
        html += '          </select>';
        html += '        </div>';
        html += '      </div>';

        // Nominal
        html += '      <div>';
        html += '        <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Jumlah Nominal (Rp) <span class="text-rose-500">*</span></label>';
        html += '        <input type="number" id="mutasi-jumlah" required min="1" step="1000" placeholder="Contoh: 1000000" class="w-full px-3 me-2 py-2 text-sm font-bold text-emerald-600 dark:text-emerald-400 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 outline-none focus:border-emerald-500">';
        html += '      </div>';

        // Keterangan
        html += '      <div>';
        html += '        <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Keterangan / Catatan <span class="text-rose-500">*</span></label>';
        html += '        <textarea id="mutasi-keterangan" required rows="2" placeholder="Contoh: Setor tunai hasil penjualan apotek ke rekening BCA" class="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 dark:text-white outline-none focus:border-emerald-500"></textarea>';
        html += '      </div>';

        html += '      <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">';
        html += '        <button type="button" onclick="AppKeuanganMutasiRekening.tutupModal()" class="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-200 transition">Batal</button>';
        html += '        <button type="submit" id="btn-simpan-mutasi" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5"><i data-lucide="check" class="w-4 h-4"></i> Simpan Mutasi</button>';
        html += '      </div>';
        html += '    </form>';
        html += '  </div>';
        html += '</div>';

        // MODAL SALDO AWAL
        html += '<div id="modal-saldo-awal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">';
        html += '  <div class="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-scaleIn">';
        html += '    <div class="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700">';
        html += '      <h3 class="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2"><i data-lucide="settings-2" class="w-5 h-5 text-indigo-500"></i> Pengaturan Saldo Awal</h3>';
        html += '      <button onclick="AppKeuanganMutasiRekening.tutupModalSaldoAwal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"><i data-lucide="x" class="w-5 h-5"></i></button>';
        html += '    </div>';

        html += '    <form onsubmit="AppKeuanganMutasiRekening.simpanSaldoAwal(event)" class="space-y-4">';
        html += '      <div>';
        html += '        <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Saldo Awal Kas Utama (Tunai)</label>';
        html += '        <input type="number" id="sa-kas-utama" min="0" placeholder="0" class="w-full px-3 py-2 text-xs font-bold text-slate-800 dark:text-white rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 outline-none focus:border-indigo-500">';
        html += '      </div>';
        html += '      <div>';
        html += '        <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Saldo Awal Rekening Bank &amp; Non-Tunai</label>';
        html += '        <input type="number" id="sa-rekening-bank" min="0" placeholder="0" class="w-full px-3 py-2 text-xs font-bold text-slate-800 dark:text-white rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 outline-none focus:border-indigo-500">';
        html += '      </div>';
        html += '      <p class="text-[11px] text-slate-400 italic">Nilai ini digunakan sebagai modal pembuka perhitungan saldo real-time.</p>';

        html += '      <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">';
        html += '        <button type="button" onclick="AppKeuanganMutasiRekening.tutupModalSaldoAwal()" class="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-200 transition">Batal</button>';
        html += '        <button type="submit" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition">Simpan Saldo Awal</button>';
        html += '      </div>';
        html += '    </form>';
        html += '  </div>';
        html += '</div>';

        html += '</div>';
        return html;
    },

    init: function() {
        var userRole = window.currentRole || '';
        if (userRole !== 'psa' && userRole !== 'keuangan') return;

        this.destroy();
        this.muatDataRealtime();
    },

    destroy: function() {
        if (this._unsubs && this._unsubs.length > 0) {
            this._unsubs.forEach(function(unsub) { if (typeof unsub === 'function') unsub(); });
        }
        this._unsubs = [];
    },

    muatDataRealtime: function() {
        var self = this;

        // 1. Snapshot Listener Mutasi Rekening
        var uMutasi = db.collection('mutasiRekening').orderBy('tanggal', 'desc').onSnapshot(function(snap) {
            self.dataMutasi = [];
            snap.forEach(function(doc) {
                var d = doc.data();
                d.id = doc.id;
                self.dataMutasi.push(d);
            });
            self.hitungSaldoDanRenderTable();
        }, function(err) {
            console.warn('Handling mutasiRekening listener notice:', err);
            self.dataMutasi = [];
            self.hitungSaldoDanRenderTable();
            var tbody = document.getElementById('tbody-mutasi');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-slate-500 dark:text-slate-400 font-medium"><i data-lucide="info" class="w-8 h-8 mx-auto mb-2 text-amber-500 opacity-80"></i>Tidak dapat memuat mutasi rekening secara otomatis atau belum ada izin data.</td></tr>';
                if (window.lucide) lucide.createIcons();
            }
        });
        this._unsubs.push(uMutasi);

        // 2. Load Saldo Awal Config
        db.collection('saldoAwal').doc('global').get().then(function(doc) {
            if (doc.exists) {
                var d = doc.data();
                self.dataSaldoAwal.kasUtama = d.kasUtama || 0;
                self.dataSaldoAwal.rekeningBank = d.rekeningBank || 0;
                self.dataSaldoAwal.kasKecil = d.kasKecil || 0;
            }
            self.hitungSaldoDanRenderTable();
        }).catch(function(e) {
            console.warn('Gagal muat saldoAwal global:', e);
        });

        // Load data keuangan pendukung untuk perhitungan saldo real-time
        this.hitungSaldoDanRenderTable();
    },

    hitungSaldoDanRenderTable: function() {
        var self = this;

        // Fetch pendukung untuk live balance computation across all collections
        Promise.all([
            db.collection('transaksi').get().catch(function() { return []; }),
            db.collection('kasMasuk').get().catch(function() { return []; }),
            db.collection('pendapatanLain').get().catch(function() { return []; }),
            db.collection('kasKeluar').where('status', '==', 'approved').get().catch(function() { return []; }),
            db.collection('pembelian').get().catch(function() { return []; }),
            db.collection('payrollHistory').get().catch(function() { return []; }),
            db.collection('thrPembayaranHistory').get().catch(function() { return []; })
        ]).then(function(results) {
            var kasUtama = self.dataSaldoAwal.kasUtama || 0;
            var rekeningBank = self.dataSaldoAwal.rekeningBank || 0;

            // 1. Transaksi Penjualan (Inflow)
            if (results[0] && results[0].forEach) {
                results[0].forEach(function(doc) {
                    var t = doc.data();
                    var total = t.totalAkhir || 0;
                    if (t.metodeBayar === 'cash') {
                        kasUtama += total;
                    } else {
                        rekeningBank += total;
                    }
                });
            }

            // 2. Kas Masuk (Inflow)
            if (results[1] && results[1].forEach) {
                results[1].forEach(function(doc) {
                    var km = doc.data();
                    var jm = km.jumlah || 0;
                    var ak = (km.akunKas || '').toLowerCase();
                    if (ak.indexOf('bank') !== -1 || ak.indexOf('transfer') !== -1 || ak.indexOf('qris') !== -1) {
                        rekeningBank += jm;
                    } else {
                        kasUtama += jm;
                    }
                });
            }

            // 3. Pendapatan Lain (Inflow)
            if (results[2] && results[2].forEach) {
                results[2].forEach(function(doc) {
                    var pl = doc.data();
                    var jm = pl.jumlah || 0;
                    var ak = (pl.akunKas || '').toLowerCase();
                    if (ak.indexOf('kas') !== -1 && ak.indexOf('bank') === -1) {
                        kasUtama += jm;
                    } else {
                        rekeningBank += jm;
                    }
                });
            }

            // 4. Kas Keluar Approved (Outflow)
            if (results[3] && results[3].forEach) {
                results[3].forEach(function(doc) {
                    var kk = doc.data();
                    var jm = kk.jumlah || 0;
                    var ak = (kk.akunKas || '').toLowerCase();
                    if (ak.indexOf('bank') !== -1 || ak.indexOf('transfer') !== -1) {
                        rekeningBank -= jm;
                    } else {
                        kasUtama -= jm;
                    }
                });
            }

            // 5. Pembelian Supplier (Outflow)
            if (results[4] && results[4].forEach) {
                results[4].forEach(function(doc) {
                    var pb = doc.data();
                    var jm = pb.totalHarga || pb.totalAkhir || 0;
                    if (pb.metodePembayaran === 'tunai' || pb.metodeBayar === 'cash') {
                        kasUtama -= jm;
                    } else if (pb.metodePembayaran !== 'kredit') {
                        rekeningBank -= jm;
                    }
                });
            }

            // 6. Payroll (Outflow)
            if (results[5] && results[5].forEach) {
                results[5].forEach(function(doc) {
                    var pr = doc.data();
                    var jm = pr.totalGaji || 0;
                    var ak = (pr.akunKas || '').toLowerCase();
                    if (ak.indexOf('kas') !== -1 && ak.indexOf('bank') === -1) {
                        kasUtama -= jm;
                    } else {
                        rekeningBank -= jm;
                    }
                });
            }

            // 7. THR (Outflow)
            if (results[6] && results[6].forEach) {
                results[6].forEach(function(doc) {
                    var thr = doc.data();
                    var jm = thr.jumlah || 0;
                    rekeningBank -= jm;
                });
            }

            // 8. Mutasi Rekening Antar Akun (Transfer Internal)
            self.dataMutasi.forEach(function(m) {
                var nominal = m.jumlah || 0;
                var dari = (m.dariAkun || '').toLowerCase();
                var ke = (m.keAkun || '').toLowerCase();

                // Outflow dari sumber
                if (dari.indexOf('kas') !== -1 && dari.indexOf('bank') === -1) {
                    kasUtama -= nominal;
                } else {
                    rekeningBank -= nominal;
                }

                // Inflow ke tujuan
                if (ke.indexOf('kas') !== -1 && ke.indexOf('bank') === -1) {
                    kasUtama += nominal;
                } else {
                    rekeningBank += nominal;
                }
            });

            self.saldoReal.kasUtama = kasUtama;
            self.saldoReal.rekeningBank = rekeningBank;
            self.saldoReal.total = kasUtama + rekeningBank;

            // Render ke UI
            var elKas = document.getElementById('card-kas-utama');
            var elBank = document.getElementById('card-rekening-bank');
            var elTotal = document.getElementById('card-total-saldo');

            if (elKas) elKas.textContent = Utils.formatRupiah(kasUtama);
            if (elBank) elBank.textContent = Utils.formatRupiah(rekeningBank);
            if (elTotal) elTotal.textContent = Utils.formatRupiah(self.saldoReal.total);

            self.renderTable();
        });
    },

    ubahFilter: function() {
        var elBulan = document.getElementById('filter-bulan-mutasi');
        var elTglMulai = document.getElementById('filter-tgl-mulai-mutasi');
        var elTglSelesai = document.getElementById('filter-tgl-selesai-mutasi');
        var elKategori = document.getElementById('filter-kategori-mutasi');
        var elAkun = document.getElementById('filter-akun-mutasi');
        var elSearch = document.getElementById('search-mutasi');

        if (elBulan) this.filterBulan = elBulan.value;
        if (elTglMulai) this.filterTglMulai = elTglMulai.value;
        if (elTglSelesai) this.filterTglSelesai = elTglSelesai.value;
        if (elKategori) this.filterKategori = elKategori.value;
        if (elAkun) this.filterAkun = elAkun.value;
        if (elSearch) this.searchQuery = elSearch.value.toLowerCase().trim();

        this.renderTable();
    },

    resetFilter: function() {
        var d = new Date();
        var defaultMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        this.filterBulan = defaultMonth;
        this.filterTglMulai = '';
        this.filterTglSelesai = '';
        this.filterKategori = 'semua';
        this.filterAkun = 'semua';
        this.searchQuery = '';

        var elBulan = document.getElementById('filter-bulan-mutasi');
        var elTglMulai = document.getElementById('filter-tgl-mulai-mutasi');
        var elTglSelesai = document.getElementById('filter-tgl-selesai-mutasi');
        var elKategori = document.getElementById('filter-kategori-mutasi');
        var elAkun = document.getElementById('filter-akun-mutasi');
        var elSearch = document.getElementById('search-mutasi');

        if (elBulan) elBulan.value = defaultMonth;
        if (elTglMulai) elTglMulai.value = '';
        if (elTglSelesai) elTglSelesai.value = '';
        if (elKategori) elKategori.value = 'semua';
        if (elAkun) elAkun.value = 'semua';
        if (elSearch) elSearch.value = '';

        this.renderTable();
    },

    renderTable: function() {
        var self = this;
        var tbody = document.getElementById('tbody-mutasi');
        var countEl = document.getElementById('mutasi-count');
        if (!tbody) return;

        function checkIsKas(ak) {
            var lower = (ak || '').toLowerCase();
            return lower.indexOf('kas') !== -1 && lower.indexOf('bank') === -1;
        }
        function checkIsBank(ak) {
            return !checkIsKas(ak);
        }

        var list = this.dataMutasi.filter(function(item) {
            // 1. Filter Tanggal & Periode
            if (self.filterTglMulai || self.filterTglSelesai) {
                if (self.filterTglMulai && item.tanggal < self.filterTglMulai) return false;
                if (self.filterTglSelesai && item.tanggal > self.filterTglSelesai) return false;
            } else if (self.filterBulan) {
                if (!item.tanggal || item.tanggal.substring(0, 7) !== self.filterBulan) {
                    return false;
                }
            }

            // 2. Filter Kategori (Kas vs Rekening)
            if (self.filterKategori !== 'semua') {
                var dariKas = checkIsKas(item.dariAkun);
                var keKas = checkIsKas(item.keAkun);
                var dariBank = checkIsBank(item.dariAkun);
                var keBank = checkIsBank(item.keAkun);

                if (self.filterKategori === 'kas_saja') {
                    if (!dariKas && !keKas) return false;
                } else if (self.filterKategori === 'bank_saja') {
                    if (!dariBank && !keBank) return false;
                } else if (self.filterKategori === 'kas_ke_bank') {
                    if (!(dariKas && keBank)) return false;
                } else if (self.filterKategori === 'bank_ke_kas') {
                    if (!(dariBank && keKas)) return false;
                } else if (self.filterKategori === 'bank_ke_bank') {
                    if (!(dariBank && keBank)) return false;
                }
            }

            // 3. Filter Akun Spesifik
            if (self.filterAkun !== 'semua') {
                if (item.dariAkun !== self.filterAkun && item.keAkun !== self.filterAkun) {
                    return false;
                }
            }

            // 4. Search Query
            if (self.searchQuery) {
                var q = self.searchQuery;
                var matchKet = (item.keterangan || '').toLowerCase().indexOf(q) !== -1;
                var matchUser = (item.diprosesOleh || '').toLowerCase().indexOf(q) !== -1;
                var matchDari = (item.dariAkun || '').toLowerCase().indexOf(q) !== -1;
                var matchKe = (item.keAkun || '').toLowerCase().indexOf(q) !== -1;
                var matchJml = (item.jumlah || '').toString().indexOf(q) !== -1;
                if (!matchKet && !matchUser && !matchDari && !matchKe && !matchJml) return false;
            }

            return true;
        });

        if (countEl) countEl.textContent = list.length + ' transaksi';

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-slate-400 font-medium"><i data-lucide="inbox" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>Belum ada data mutasi rekening pada periode ini.</td></tr>';
            if (window.lucide) lucide.createIcons();
            return;
        }

        var html = '';
        list.forEach(function(item, idx) {
            var jam = item.waktu || '00:00';
            html += '<tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors">';
            html += '  <td class="p-3 text-center text-slate-400 font-medium">' + (idx + 1) + '</td>';
            html += '  <td class="p-3 font-semibold text-slate-700 dark:text-slate-200">' +
                        '<div>' + (item.tanggal || '-') + '</div>' +
                        '<div class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold"><i data-lucide="clock" class="w-3 h-3 inline me-0.5"></i>' + jam + ' WIB</div>' +
                    '</td>';

            html += '  <td class="p-3"><span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50"><i data-lucide="arrow-up-right" class="w-3.5 h-3.5 text-rose-500"></i> ' + Utils.escapeHtml(item.dariAkun) + '</span></td>';
            html += '  <td class="p-3"><span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50"><i data-lucide="arrow-down-left" class="w-3.5 h-3.5 text-emerald-500"></i> ' + Utils.escapeHtml(item.keAkun) + '</span></td>';

            html += '  <td class="p-3 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm">' + Utils.formatRupiah(item.jumlah) + '</td>';
            html += '  <td class="p-3 text-slate-600 dark:text-slate-300 font-medium max-w-xs truncate" title="' + Utils.escapeHtml(item.keterangan) + '">' + Utils.escapeHtml(item.keterangan) + '</td>';
            html += '  <td class="p-3 text-slate-500 dark:text-slate-400 font-medium"><i data-lucide="user" class="w-3 h-3 inline me-1"></i>' + Utils.escapeHtml(item.diprosesOleh || '-') + '</td>';

            html += '  <td class="p-3 text-center">';
            html += '    <div class="flex items-center justify-center gap-1">';
            html += '      <button onclick="AppKeuanganMutasiRekening.bukaModalMutasi(\'' + item.id + '\')" class="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-700 rounded-lg transition" title="Edit Mutasi"><i data-lucide="edit-3" class="w-4 h-4"></i></button>';
            html += '      <button onclick="AppKeuanganMutasiRekening.hapusMutasi(\'' + item.id + '\')" class="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-lg transition" title="Hapus Mutasi"><i data-lucide="trash-2" class="w-4 h-4"></i></button>';
            html += '    </div>';
            html += '  </td>';
            html += '</tr>';
        });

        tbody.innerHTML = html;
        if (window.lucide) lucide.createIcons();
    },

    bukaModalMutasi: function(id) {
        this.editingId = id || null;
        var modal = document.getElementById('modal-mutasi');
        var title = document.getElementById('modal-mutasi-title');
        var inpId = document.getElementById('mutasi-id');
        var inpTgl = document.getElementById('mutasi-tanggal');
        var inpWaktu = document.getElementById('mutasi-waktu');
        var inpDari = document.getElementById('mutasi-dari');
        var inpKe = document.getElementById('mutasi-ke');
        var inpJml = document.getElementById('mutasi-jumlah');
        var inpKet = document.getElementById('mutasi-keterangan');

        if (!modal) return;

        var dNow = new Date();
        var jamNow = String(dNow.getHours()).padStart(2, '0') + ':' + String(dNow.getMinutes()).padStart(2, '0');

        if (id) {
            title.innerHTML = '<i data-lucide="edit-3" class="w-5 h-5 text-emerald-500"></i> Edit Mutasi Rekening';
            var item = this.dataMutasi.find(function(m) { return m.id === id; });
            if (item) {
                inpId.value = item.id;
                inpTgl.value = item.tanggal || Utils.today();
                inpWaktu.value = item.waktu || jamNow;
                inpDari.value = item.dariAkun || this.AKUN_LIST[0];
                inpKe.value = item.keAkun || this.AKUN_LIST[1];
                inpJml.value = item.jumlah || '';
                inpKet.value = item.keterangan || '';
            }
        } else {
            title.innerHTML = '<i data-lucide="arrow-left-right" class="w-5 h-5 text-emerald-500"></i> Tambah Mutasi Rekening';
            inpId.value = '';
            inpTgl.value = Utils.today();
            inpWaktu.value = jamNow;
            inpDari.value = this.AKUN_LIST[0];
            inpKe.value = this.AKUN_LIST[1];
            inpJml.value = '';
            inpKet.value = '';
        }

        modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    },

    tutupModal: function() {
        var modal = document.getElementById('modal-mutasi');
        if (modal) modal.classList.add('hidden');
        this.editingId = null;
    },

    simpanMutasi: function(e) {
        if (e) e.preventDefault();

        var id = document.getElementById('mutasi-id').value;
        var tanggal = document.getElementById('mutasi-tanggal').value;
        var waktu = document.getElementById('mutasi-waktu').value;
        var dariAkun = document.getElementById('mutasi-dari').value;
        var keAkun = document.getElementById('mutasi-ke').value;
        var jumlah = parseFloat(document.getElementById('mutasi-jumlah').value) || 0;
        var keterangan = document.getElementById('mutasi-keterangan').value.trim();

        if (dariAkun === keAkun) {
            Utils.toast('Akun Sumber dan Akun Tujuan tidak boleh sama.', 'error');
            return;
        }

        if (jumlah <= 0) {
            Utils.toast('Nominal mutasi harus lebih dari Rp 0.', 'error');
            return;
        }

        if (!keterangan) {
            Utils.toast('Keterangan mutasi wajib diisi.', 'error');
            return;
        }

        var btn = document.getElementById('btn-simpan-mutasi');
        if (btn) btn.disabled = true;

        var payload = {
            tanggal: tanggal,
            waktu: waktu,
            dariAkun: dariAkun,
            keAkun: keAkun,
            jumlah: jumlah,
            keterangan: keterangan,
            diprosesOleh: window.currentUserName || 'Keuangan',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        var self = this;
        var promise;

        if (id) {
            promise = db.collection('mutasiRekening').doc(id).update(payload);
        } else {
            payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            promise = db.collection('mutasiRekening').add(payload);
        }

        promise.then(function(ref) {
            var targetId = id || (ref ? ref.id : 'baru');
            Utils.toast(id ? 'Mutasi rekening berhasil diperbarui.' : 'Mutasi rekening berhasil disimpan.', 'success');
            
            AuditLog.catat({
                aksi: id ? 'edit' : 'tambah',
                modul: 'Mutasi Rekening',
                koleksi: 'mutasiRekening',
                targetId: targetId,
                deskripsi: (id ? 'Edit' : 'Tambah') + ' mutasi ' + Utils.formatRupiah(jumlah) + ' dari ' + dariAkun + ' ke ' + keAkun,
                nominal: jumlah
            });

            self.tutupModal();
            if (btn) btn.disabled = false;
        }).catch(function(err) {
            console.error('Error simpan mutasi:', err);
            Utils.toast('Gagal menyimpan mutasi: ' + err.message, 'error');
            if (btn) btn.disabled = false;
        });
    },

    hapusMutasi: function(id) {
        var item = this.dataMutasi.find(function(m) { return m.id === id; });
        if (!item) return;

        if (!confirm('Hapus mutasi sebesar ' + Utils.formatRupiah(item.jumlah) + ' dari ' + item.dariAkun + ' ke ' + item.keAkun + '?')) return;

        var self = this;
        db.collection('mutasiRekening').doc(id).delete().then(function() {
            Utils.toast('Mutasi rekening berhasil dihapus.', 'success');
            AuditLog.catat({
                aksi: 'hapus',
                modul: 'Mutasi Rekening',
                koleksi: 'mutasiRekening',
                targetId: id,
                deskripsi: 'Hapus mutasi ' + Utils.formatRupiah(item.jumlah) + ' dari ' + item.dariAkun + ' ke ' + item.keAkun,
                nominal: item.jumlah
            });
        }).catch(function(err) {
            console.error('Error hapus mutasi:', err);
            Utils.toast('Gagal menghapus mutasi: ' + err.message, 'error');
        });
    },

    bukaModalSaldoAwal: function() {
        var modal = document.getElementById('modal-saldo-awal');
        var inpKas = document.getElementById('sa-kas-utama');
        var inpBank = document.getElementById('sa-rekening-bank');

        if (!modal) return;
        if (inpKas) inpKas.value = this.dataSaldoAwal.kasUtama || 0;
        if (inpBank) inpBank.value = this.dataSaldoAwal.rekeningBank || 0;

        modal.classList.remove('hidden');
    },

    tutupModalSaldoAwal: function() {
        var modal = document.getElementById('modal-saldo-awal');
        if (modal) modal.classList.add('hidden');
    },

    simpanSaldoAwal: function(e) {
        if (e) e.preventDefault();

        var kas = parseFloat(document.getElementById('sa-kas-utama').value) || 0;
        var bank = parseFloat(document.getElementById('sa-rekening-bank').value) || 0;

        var self = this;
        db.collection('saldoAwal').doc('global').set({
            kasUtama: kas,
            rekeningBank: bank,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: window.currentUserName || 'Keuangan'
        }, { merge: true }).then(function() {
            self.dataSaldoAwal.kasUtama = kas;
            self.dataSaldoAwal.rekeningBank = bank;
            Utils.toast('Saldo awal berhasil diperbarui.', 'success');
            self.tutupModalSaldoAwal();
            self.hitungSaldoDanRenderTable();
        }).catch(function(err) {
            console.error('Error simpan saldo awal:', err);
            Utils.toast('Gagal menyimpan saldo awal: ' + err.message, 'error');
        });
    }
};
