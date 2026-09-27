/**
 * js/laporan/hutang.js
 * Laporan Hutang Usaha & Pengajuan Pembayaran
 * Memungkinkan Klinik, Apotek, dan Staff mengajukan pembayaran hutang/tagihan,
 * serta Admin, PSA, dan Keuangan menyetujui (approve & lunasi) atau menolak pengajuan.
 */

window.AppLaporanHutang = {
    data: [],
    filterTab: 'semua', // 'semua', 'belum_lunas', 'menunggu_approve', 'lunas'
    searchTerm: '',

    render: function() {
        var html = '<div class="page-enter max-w-6xl space-y-6">';
        
        // Header & Actions
        html += '  <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">';
        html += '    <div>';
        html += '      <div class="flex items-center gap-2 mb-1">';
        html += '        <h2 class="text-2xl font-black text-slate-800 dark:text-white">Laporan Hutang Usaha & Pengajuan Bayar</h2>';
        html += '        <span class="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">Fitur Terintegrasi</span>';
        html += '      </div>';
        html += '      <p class="text-xs text-slate-500 dark:text-slate-400">Pengajuan pelunasan tagihan oleh Klinik/Apotek & persetujuan oleh Admin, PSA, atau Keuangan</p>';
        html += '    </div>';
        html += '    <div class="flex flex-wrap items-center gap-2.5 self-start md:self-auto">';
        html += '      <button onclick="AppLaporanHutang.bukaModalTambahHutang()" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition flex items-center gap-2">';
        html += '        <i data-lucide="plus-circle" class="w-4 h-4"></i>';
        html += '        <span>+ Input Tagihan / Hutang Baru</span>';
        html += '      </button>';
        html += '      <button onclick="AppLaporanHutang.init()" class="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 transition flex items-center gap-2">';
        html += '        <i data-lucide="refresh-cw" class="w-4 h-4"></i>';
        html += '        <span>Refresh</span>';
        html += '      </button>';
        html += '    </div>';
        html += '  </div>';

        // Summary Cards Grid
        html += '  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4" id="hutang-summary-cards">';
        html += '    <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center gap-4">';
        html += '      <div class="w-12 h-12 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0"><i data-lucide="alert-circle" class="w-6 h-6"></i></div>';
        html += '      <div>';
        html += '        <p class="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Belum Lunas</p>';
        html += '        <h3 class="text-lg font-black text-slate-800 dark:text-white" id="stat-belum-lunas">Rp 0</h3>';
        html += '        <p class="text-[11px] text-slate-500 dark:text-slate-400" id="count-belum-lunas">0 faktur / tagihan</p>';
        html += '      </div>';
        html += '    </div>';

        html += '    <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center gap-4 relative overflow-hidden">';
        html += '      <div class="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0"><i data-lucide="clock" class="w-6 h-6 animate-pulse"></i></div>';
        html += '      <div>';
        html += '        <p class="text-[10px] font-black uppercase tracking-wider text-slate-400">Menunggu Approval</p>';
        html += '        <h3 class="text-lg font-black text-amber-600 dark:text-amber-400" id="stat-menunggu">Rp 0</h3>';
        html += '        <p class="text-[11px] text-slate-500 dark:text-slate-400" id="count-menunggu">0 pengajuan bayar</p>';
        html += '      </div>';
        html += '    </div>';

        html += '    <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center gap-4">';
        html += '      <div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0"><i data-lucide="check-circle-2" class="w-6 h-6"></i></div>';
        html += '      <div>';
        html += '        <p class="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Pelunasan</p>';
        html += '        <h3 class="text-lg font-black text-emerald-600 dark:text-emerald-400" id="stat-lunas">Rp 0</h3>';
        html += '        <p class="text-[11px] text-slate-500 dark:text-slate-400" id="count-lunas">0 faktur telah disetujui</p>';
        html += '      </div>';
        html += '    </div>';
        html += '  </div>';

        // Filter Tabs & Search Bar
        html += '  <div class="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">';
        html += '    <div class="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">';
        html += '      <button onclick="AppLaporanHutang.setTab(\'semua\')" id="tab-semua" class="tab-btn px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap bg-emerald-600 text-white">Semua</button>';
        html += '      <button onclick="AppLaporanHutang.setTab(\'belum_lunas\')" id="tab-belum_lunas" class="tab-btn px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700/50 dark:text-slate-300">Belum Lunas</button>';
        html += '      <button onclick="AppLaporanHutang.setTab(\'menunggu_approve\')" id="tab-menunggu_approve" class="tab-btn px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700/50 dark:text-slate-300 flex items-center gap-1.5">';
        html += '        <span>Menunggu Approval</span>';
        html += '        <span id="badge-tab-menunggu" class="hidden bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black">0</span>';
        html += '      </button>';
        html += '      <button onclick="AppLaporanHutang.setTab(\'lunas\')" id="tab-lunas" class="tab-btn px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700/50 dark:text-slate-300">Sudah Lunas</button>';
        html += '    </div>';

        html += '    <div class="relative min-w-[240px] md:w-72">';
        html += '      <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>';
        html += '      <input type="text" id="input-search-hutang" oninput="AppLaporanHutang.onSearch(this.value)" placeholder="Cari supplier, no. faktur, catatan..." class="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none focus:border-emerald-500 transition">';
        html += '    </div>';
        html += '  </div>';

        // Content List Container
        html += '  <div id="hutang-content"><div class="flex justify-center py-12"><div class="spinner"></div></div></div>';
        
        // Modal Container Placeholder
        html += '  <div id="modal-hutang-container"></div>';

        html += '</div>';
        return html;
    },

    init: function() {
        var self = this;
        var container = document.getElementById('hutang-content');
        if (container) {
            container.innerHTML = '<div class="flex justify-center py-12"><div class="spinner"></div></div>';
        }

        db.collection('pembelian').get().then(snap => {
            self.data = [];
            snap.forEach(doc => { 
                var d = doc.data(); 
                d.id = doc.id; 
                // Jika metode pembayaran kredit atau belum lunas/menunggu/lunas
                if (d.metodePembayaran === 'kredit' || d.statusPelunasan) {
                    self.data.push(d); 
                }
            });
            
            // Urutkan berdasarkan tanggal jatuh tempo / tanggal terbaru
            self.data.sort(function(a, b) {
                var tA = a.jatuhTempo ? new Date(a.jatuhTempo).getTime() : (a.tanggal ? new Date(a.tanggal).getTime() : 0);
                var tB = b.jatuhTempo ? new Date(b.jatuhTempo).getTime() : (b.tanggal ? new Date(b.tanggal).getTime() : 0);
                return tA - tB;
            });

            self.updateSummaryStats();
            self.renderList();
        }).catch(err => {
            console.error("Error init hutang:", err);
            Utils.toast('Gagal memuat data hutang: ' + err.message, 'error');
        });
    },

    updateSummaryStats: function() {
        var totalBelum = 0, countBelum = 0;
        var totalMenunggu = 0, countMenunggu = 0;
        var totalLunas = 0, countLunas = 0;

        this.data.forEach(function(h) {
            var val = Number(h.totalHarga || h.nominal || 0);
            if (h.statusPelunasan === 'menunggu_approve') {
                totalMenunggu += val;
                countMenunggu++;
            } else if (h.statusPelunasan === 'lunas') {
                totalLunas += val;
                countLunas++;
            } else {
                totalBelum += val;
                countBelum++;
            }
        });

        var elBelum = document.getElementById('stat-belum-lunas');
        var elCountBelum = document.getElementById('count-belum-lunas');
        var elMenunggu = document.getElementById('stat-menunggu');
        var elCountMenunggu = document.getElementById('count-menunggu');
        var elLunas = document.getElementById('stat-lunas');
        var elCountLunas = document.getElementById('count-lunas');
        var badgeTabMenunggu = document.getElementById('badge-tab-menunggu');

        if (elBelum) elBelum.textContent = Utils.formatRupiah(totalBelum);
        if (elCountBelum) elCountBelum.textContent = countBelum + ' tagihan aktif';
        if (elMenunggu) elMenunggu.textContent = Utils.formatRupiah(totalMenunggu);
        if (elCountMenunggu) elCountMenunggu.textContent = countMenunggu + ' pengajuan bayar';
        if (elLunas) elLunas.textContent = Utils.formatRupiah(totalLunas);
        if (elCountLunas) elCountLunas.textContent = countLunas + ' faktur dilunasi';

        if (badgeTabMenunggu) {
            if (countMenunggu > 0) {
                badgeTabMenunggu.textContent = countMenunggu;
                badgeTabMenunggu.classList.remove('hidden');
            } else {
                badgeTabMenunggu.classList.add('hidden');
            }
        }
    },

    setTab: function(tab) {
        this.filterTab = tab;
        var btns = document.querySelectorAll('.tab-btn');
        btns.forEach(function(b) {
            b.className = 'tab-btn px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700/50 dark:text-slate-300';
        });
        var activeBtn = document.getElementById('tab-' + tab);
        if (activeBtn) {
            activeBtn.className = 'tab-btn px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap bg-emerald-600 text-white shadow-sm';
        }
        this.renderList();
    },

    onSearch: function(val) {
        this.searchTerm = (val || '').toLowerCase().trim();
        this.renderList();
    },

    renderList: function() {
        var container = document.getElementById('hutang-content');
        if (!container) return;

        var role = window.currentRole || 'klinik';
        // Admin, PSA, dan Keuangan bisa approve & lunasi hutang
        var isApprover = (role === 'admin' || role === 'keuangan' || role === 'psa');

        var self = this;
        var list = this.data.filter(function(h) {
            // Filter Berdasarkan Tab
            if (self.filterTab === 'belum_lunas') {
                if (h.statusPelunasan === 'lunas' || h.statusPelunasan === 'menunggu_approve') return false;
            } else if (self.filterTab === 'menunggu_approve') {
                if (h.statusPelunasan !== 'menunggu_approve') return false;
            } else if (self.filterTab === 'lunas') {
                if (h.statusPelunasan !== 'lunas') return false;
            }

            // Filter Berdasarkan Keyword Search
            if (self.searchTerm) {
                var supp = (h.supplier || '').toLowerCase();
                var noFak = (h.noFaktur || '').toLowerCase();
                var cat = (h.catatan || h.catatanPengajuan || '').toLowerCase();
                var kat = (h.kategori || '').toLowerCase();
                if (supp.indexOf(self.searchTerm) === -1 &&
                    noFak.indexOf(self.searchTerm) === -1 &&
                    cat.indexOf(self.searchTerm) === -1 &&
                    kat.indexOf(self.searchTerm) === -1) {
                    return false;
                }
            }
            return true;
        });

        if (list.length === 0) {
            container.innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-10 text-center text-slate-400 space-y-3">' +
                '<i data-lucide="receipt" class="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600"></i>' +
                '<p class="text-sm font-semibold text-slate-600 dark:text-slate-300">Tidak ada data hutang / tagihan dalam kategori ini.</p>' +
                '</div>';
            lucide.createIcons();
            return;
        }

        var html = '<div class="space-y-4">';

        list.forEach(function(h) {
            var tglBeli = h.tanggal ? new Date(h.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
            var tglJatuhTempo = h.jatuhTempo ? new Date(h.jatuhTempo).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
            
            // Overdue indicator
            var isOverdue = h.jatuhTempo && (new Date(h.jatuhTempo) < new Date()) && h.statusPelunasan !== 'lunas';
            var tempoClass = isOverdue ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-slate-600 dark:text-slate-300 font-medium';

            // Badge status pelunasan
            var statusBadge = '';
            if (h.statusPelunasan === 'menunggu_approve') {
                statusBadge = '<span class="text-[11px] font-extrabold bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 px-3 py-1 rounded-full border border-amber-200/80 dark:border-amber-800 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>Menunggu Approval PSA & Keuangan</span>';
            } else if (h.statusPelunasan === 'lunas') {
                statusBadge = '<span class="text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 px-3 py-1 rounded-full border border-emerald-200/80 dark:border-emerald-800">Lunas / Disetujui</span>';
            } else if (h.statusPelunasan === 'ditolak') {
                statusBadge = '<span class="text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 px-3 py-1 rounded-full border border-rose-200/80 dark:border-rose-800">Pengajuan Ditolak</span>';
            } else {
                statusBadge = '<span class="text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">Belum Lunas</span>';
            }

            var categoryBadge = h.kategori ? '<span class="text-[10px] uppercase font-bold bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md">' + Utils.escapeHtml(h.kategori) + '</span>' : '';

            html += '<div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-sm hover:shadow transition duration-200 flex flex-col md:flex-row justify-between gap-5">';
            
            // Left Column: Main Info
            html += '<div class="flex-1 space-y-2.5">';
            html += '  <div class="flex flex-wrap items-center gap-2">';
            html += '    <h3 class="text-base font-black text-slate-800 dark:text-white">' + Utils.escapeHtml(h.supplier || 'Vendor / Supplier') + '</h3>';
            html += '    ' + categoryBadge;
            html += '    ' + statusBadge;
            if (isOverdue) {
                html += '    <span class="text-[10px] font-extrabold bg-rose-600 text-white px-2.5 py-0.5 rounded-full animate-pulse">Jatuh Tempo!</span>';
            }
            html += '  </div>';

            html += '  <div class="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-mono">';
            html += '    <span>No. Faktur: <strong class="text-slate-700 dark:text-slate-200">' + Utils.escapeHtml(h.noFaktur || '-') + '</strong></span>';
            html += '    <span>Tanggal: ' + tglBeli + '</span>';
            html += '    <span class="' + tempoClass + '">Jatuh Tempo: ' + tglJatuhTempo + '</span>';
            html += '  </div>';

            // Additional details for pengajuan
            if (h.statusPelunasan === 'menunggu_approve') {
                html += '  <div class="mt-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200/60 dark:border-amber-900/40 text-xs space-y-1 text-amber-900 dark:text-amber-200">';
                html += '    <div class="flex items-center gap-1.5 font-bold"><i data-lucide="send" class="w-3.5 h-3.5 text-amber-600"></i> Informasi Pengajuan Pembayaran:</div>';
                html += '    <p>Diajukan oleh: <strong>' + Utils.escapeHtml(h.diajukanOleh || 'Staff') + '</strong> (' + Utils.escapeHtml(h.diajukanRole || 'Klinik') + ')</p>';
                if (h.rekeningTujuan) html += '    <p>Rekening Tujuan: <strong>' + Utils.escapeHtml(h.rekeningTujuan) + '</strong></p>';
                if (h.catatanPengajuan) html += '    <p>Catatan: <em class="text-slate-600 dark:text-slate-300">"' + Utils.escapeHtml(h.catatanPengajuan) + '"</em></p>';
                html += '  </div>';
            } else if (h.statusPelunasan === 'lunas') {
                html += '  <div class="mt-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 text-xs space-y-1 text-emerald-900 dark:text-emerald-200">';
                html += '    <p><i data-lucide="check" class="w-3.5 h-3.5 inline text-emerald-600 mr-1"></i> Dilunasi oleh: <strong>' + Utils.escapeHtml(h.dilunasiOleh || 'Keuangan') + '</strong></p>';
                if (h.sumberKas) html += '    <p>Sumber Uang Kas: <strong>' + Utils.escapeHtml(h.sumberKas) + '</strong></p>';
                html += '  </div>';
            } else if (h.statusPelunasan === 'ditolak' && h.alasanPenolakan) {
                html += '  <div class="mt-2 p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200/60 dark:border-rose-900/40 text-xs text-rose-800 dark:text-rose-200">';
                html += '    <p><strong>Alasan Penolakan:</strong> "' + Utils.escapeHtml(h.alasanPenolakan) + '" (oleh ' + Utils.escapeHtml(h.ditolakOleh || 'Admin') + ')</p>';
                html += '  </div>';
            }

            html += '</div>';

            // Right Column: Price & Action Buttons
            html += '<div class="flex flex-col md:items-end justify-between gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-700/60">';
            html += '  <div class="md:text-right">';
            html += '    <p class="text-[10px] font-black uppercase text-slate-400">Total Nominal Tagihan</p>';
            html += '    <p class="text-xl font-black text-rose-600 dark:text-rose-400">' + Utils.formatRupiah(h.totalHarga || h.nominal || 0) + '</p>';
            html += '  </div>';

            html += '  <div class="flex flex-wrap items-center gap-2 md:justify-end">';
            
            if (h.statusPelunasan === 'belum_lunas' || h.statusPelunasan === 'ditolak') {
                // Klinik, Apotek, Dokter, dan semua role bisa mengajukan bayar
                html += '    <button onclick="AppLaporanHutang.bukaModalAjukanBayar(\'' + h.id + '\')" class="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm hover:shadow transition flex items-center gap-1.5">';
                html += '      <i data-lucide="send" class="w-3.5 h-3.5"></i>';
                html += '      <span>Ajukan Pembayaran</span>';
                html += '    </button>';
            } else if (h.statusPelunasan === 'menunggu_approve') {
                if (isApprover) {
                    // Admin, PSA, dan Keuangan dapat melakukan Approve & Bayar atau Tolak
                    html += '    <button onclick="AppLaporanHutang.bukaModalApprove(\'' + h.id + '\')" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm hover:shadow transition flex items-center gap-1.5">';
                    html += '      <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>';
                    html += '      <span>Approve & Bayar</span>';
                    html += '    </button>';
                    html += '    <button onclick="AppLaporanHutang.bukaModalTolak(\'' + h.id + '\')" class="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold px-3 py-2 rounded-xl transition">';
                    html += '      <span>Tolak</span>';
                    html += '    </button>';
                } else {
                    html += '    <span class="text-xs text-amber-600 dark:text-amber-400 font-semibold italic bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800">Menunggu Approve Admin/PSA/Keuangan</span>';
                }
            } else if (h.statusPelunasan === 'lunas') {
                html += '    <span class="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800"><i data-lucide="check-check" class="w-3.5 h-3.5"></i> Lunas</span>';
            }

            html += '  </div>';
            html += '</div>';

            html += '</div>';
        });

        html += '</div>';
        container.innerHTML = html;
        lucide.createIcons();
    },

    // ===== MODAL 1: AJUKAN PEMBAYARAN =====
    bukaModalAjukanBayar: function(id) {
        var item = this.data.find(x => x.id === id);
        if (!item) return;

        var defaultNominal = item.totalHarga || item.nominal || 0;

        var html = '<div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">';
        html += '  <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-lg w-full p-6 space-y-5 transform transition-all">';
        html += '    <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">';
        html += '      <div class="flex items-center gap-2.5">';
        html += '        <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center"><i data-lucide="send" class="w-5 h-5"></i></div>';
        html += '        <div>';
        html += '          <h3 class="text-base font-black text-slate-800 dark:text-white">Pengajuan Pembayaran Hutang</h3>';
        html += '          <p class="text-xs text-slate-400">Kirimkan draf pengajuan ke Admin, PSA, & Keuangan</p>';
        html += '        </div>';
        html += '      </div>';
        html += '      <button onclick="AppLaporanHutang.tutupModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"><i data-lucide="x" class="w-5 h-5"></i></button>';
        html += '    </div>';

        html += '    <div class="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-1.5 text-xs">';
        html += '      <div class="flex justify-between"><span class="text-slate-400">Supplier / Vendor:</span> <strong class="text-slate-800 dark:text-white">' + Utils.escapeHtml(item.supplier || '-') + '</strong></div>';
        html += '      <div class="flex justify-between"><span class="text-slate-400">No. Faktur:</span> <strong class="font-mono text-slate-800 dark:text-white">' + Utils.escapeHtml(item.noFaktur || '-') + '</strong></div>';
        html += '      <div class="flex justify-between"><span class="text-slate-400">Total Nominal Tagihan:</span> <strong class="text-rose-600 dark:text-rose-400 font-bold">' + Utils.formatRupiah(defaultNominal) + '</strong></div>';
        html += '    </div>';

        html += '    <div class="space-y-4 text-xs">';
        html += '      <div>';
        html += '        <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Bank / Rekening / Alamat Transfer Tujuan</label>';
        html += '        <input type="text" id="input-rek-tujuan" placeholder="Contoh: Bank BCA 12345678 a.n. PT Farmasi Aulia" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition">';
        html += '      </div>';

        html += '      <div>';
        html += '        <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Catatan / Alasan Pengajuan</label>';
        html += '        <textarea id="input-catatan-pengajuan" rows="3" placeholder="Contoh: Jatuh tempo tgl 25, mohon ditransfer agar kiriman obat selanjutnya tidak terkendala" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition"></textarea>';
        html += '      </div>';
        html += '    </div>';

        html += '    <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">';
        html += '      <button onclick="AppLaporanHutang.tutupModal()" class="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition">Batal</button>';
        html += '      <button onclick="AppLaporanHutang.prosesAjukanBayar(\'' + id + '\')" class="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow transition flex items-center gap-1.5">';
        html += '        <i data-lucide="send" class="w-4 h-4"></i>';
        html += '        <span>Kirim Pengajuan</span>';
        html += '      </button>';
        html += '    </div>';

        html += '  </div>';
        html += '</div>';

        document.getElementById('modal-hutang-container').innerHTML = html;
        lucide.createIcons();
    },

    prosesAjukanBayar: function(id) {
        var rek = (document.getElementById('input-rek-tujuan').value || '').trim();
        var cat = (document.getElementById('input-catatan-pengajuan').value || '').trim();

        Utils.toast('Mengirim pengajuan pembayaran...', 'info');
        var role = window.currentRole || 'klinik';
        var nama = window.currentUserName || 'Staff Klinik';

        db.collection('pembelian').doc(id).update({
            statusPelunasan: 'menunggu_approve',
            diajukanOleh: nama,
            diajukanRole: role,
            tanggalPengajuan: Utils.now(),
            rekeningTujuan: rek,
            catatanPengajuan: cat
        }).then(function() {
            Utils.toast('Pengajuan pembayaran berhasil dikirim!', 'success');
            if (window.AuditLog) {
                AuditLog.catat({
                    aksi: 'pengajuan_bayar', modul: 'Hutang Usaha', koleksi: 'pembelian', targetId: id,
                    deskripsi: 'Mengajukan pembayaran hutang ke Admin/PSA/Keuangan'
                });
            }
            AppLaporanHutang.tutupModal();
            AppLaporanHutang.init();
        }).catch(err => {
            Utils.toast('Gagal mengirim pengajuan: ' + err.message, 'error');
        });
    },

    // ===== MODAL 2: INPUT TAGIHAN / HUTANG BARU =====
    bukaModalTambahHutang: function() {
        var html = '<div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">';
        html += '  <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-lg w-full p-6 space-y-5 transform transition-all">';
        html += '    <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">';
        html += '      <div class="flex items-center gap-2.5">';
        html += '        <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"><i data-lucide="file-plus" class="w-5 h-5"></i></div>';
        html += '        <div>';
        html += '          <h3 class="text-base font-black text-slate-800 dark:text-white">Input Tagihan / Hutang Baru</h3>';
        html += '          <p class="text-xs text-slate-400">Catat hutang operasional klinik atau pembelian kredit</p>';
        html += '        </div>';
        html += '      </div>';
        html += '      <button onclick="AppLaporanHutang.tutupModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"><i data-lucide="x" class="w-5 h-5"></i></button>';
        html += '    </div>';

        html += '    <div class="space-y-3.5 text-xs">';
        html += '      <div>';
        html += '        <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Supplier / Vendor / Pihak Ketiga *</label>';
        html += '        <input type="text" id="new-supplier" placeholder="Contoh: PT Kimia Farma / Vendor Alkes" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:border-emerald-500 transition">';
        html += '      </div>';

        html += '      <div class="grid grid-cols-2 gap-3">';
        html += '        <div>';
        html += '          <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">No. Faktur / Referensi</label>';
        html += '          <input type="text" id="new-no-faktur" placeholder="Contoh: INV-2026-089" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:border-emerald-500 transition">';
        html += '        </div>';
        html += '        <div>';
        html += '          <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Kategori Tagihan</label>';
        html += '          <select id="new-kategori" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:border-emerald-500 transition">';
        html += '            <option value="Hutang Obat & Alkes">Hutang Obat & Alkes</option>';
        html += '            <option value="Operasional Klinik">Operasional Klinik</option>';
        html += '            <option value="Tagihan Laboratorium">Tagihan Laboratorium</option>';
        html += '            <option value="Sewa & Maintenance">Sewa & Maintenance</option>';
        html += '            <option value="Lain-Lain">Lain-Lain</option>';
        html += '          </select>';
        html += '        </div>';
        html += '      </div>';

        html += '      <div class="grid grid-cols-2 gap-3">';
        html += '        <div>';
        html += '          <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tanggal Tagihan *</label>';
        html += '          <input type="date" id="new-tanggal" value="' + Utils.today() + '" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:border-emerald-500 transition">';
        html += '        </div>';
        html += '        <div>';
        html += '          <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tanggal Jatuh Tempo *</label>';
        html += '          <input type="date" id="new-jatuh-tempo" value="' + Utils.today() + '" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:border-emerald-500 transition">';
        html += '        </div>';
        html += '      </div>';

        html += '      <div>';
        html += '        <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Total Nominal Tagihan (Rp) *</label>';
        html += '        <input type="number" id="new-total" placeholder="0" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:border-emerald-500 transition font-mono font-bold">';
        html += '      </div>';

        html += '      <div>';
        html += '        <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Keterangan / Catatan Tambahan</label>';
        html += '        <textarea id="new-catatan" rows="2" placeholder="Catatan rincian tagihan..." class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:border-emerald-500 transition"></textarea>';
        html += '      </div>';

        html += '      <div class="flex items-center gap-2 pt-1">';
        html += '        <input type="checkbox" id="new-auto-ajukan" class="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4">';
        html += '        <label for="new-auto-ajukan" class="text-xs text-slate-600 dark:text-slate-300 font-medium">Langsung ajukan pembayaran ke Admin / PSA / Keuangan</label>';
        html += '      </div>';
        html += '    </div>';

        html += '    <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">';
        html += '      <button onclick="AppLaporanHutang.tutupModal()" class="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition">Batal</button>';
        html += '      <button onclick="AppLaporanHutang.simpanHutangBaru()" class="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow transition flex items-center gap-1.5">';
        html += '        <i data-lucide="check" class="w-4 h-4"></i>';
        html += '        <span>Simpan Data Hutang</span>';
        html += '      </button>';
        html += '    </div>';

        html += '  </div>';
        html += '</div>';

        document.getElementById('modal-hutang-container').innerHTML = html;
        lucide.createIcons();
    },

    simpanHutangBaru: function() {
        var supplier = (document.getElementById('new-supplier').value || '').trim();
        var noFaktur = (document.getElementById('new-no-faktur').value || '').trim();
        var kategori = document.getElementById('new-kategori').value;
        var tanggal = document.getElementById('new-tanggal').value;
        var jatuhTempo = document.getElementById('new-jatuh-tempo').value;
        var totalHarga = parseFloat(document.getElementById('new-total').value) || 0;
        var catatan = (document.getElementById('new-catatan').value || '').trim();
        var autoAjukan = document.getElementById('new-auto-ajukan').checked;

        if (!supplier) {
            Utils.toast('Nama Supplier / Vendor wajib diisi!', 'error');
            return;
        }
        if (totalHarga <= 0) {
            Utils.toast('Total nominal tagihan harus lebih dari 0!', 'error');
            return;
        }

        Utils.toast('Menyimpan data hutang...', 'info');

        var role = window.currentRole || 'klinik';
        var nama = window.currentUserName || 'Staff Klinik';

        var payload = {
            supplier: supplier,
            noFaktur: noFaktur || ('HTG-' + Date.now().toString().substring(5)),
            kategori: kategori,
            metodePembayaran: 'kredit',
            statusPelunasan: autoAjukan ? 'menunggu_approve' : 'belum_lunas',
            tanggal: tanggal,
            jatuhTempo: jatuhTempo,
            totalHarga: totalHarga,
            catatan: catatan,
            sumberHutang: 'manual',
            // Tagihan manual tidak menambah stok; akun lawannya adalah beban operasional
            // kecuali nanti diubah secara eksplisit oleh modul yang membuat tagihan.
            akunDebitHutang: '5-2300',
            inputOleh: nama,
            inputRole: role,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (autoAjukan) {
            payload.diajukanOleh = nama;
            payload.diajukanRole = role;
            payload.tanggalPengajuan = Utils.now();
            payload.catatanPengajuan = catatan || 'Pengajuan otomatis saat input tagihan';
        }

        db.collection('pembelian').add(payload).then(function() {
            Utils.toast('Tagihan hutang berhasil disimpan!', 'success');
            if (window.AuditLog) {
                AuditLog.catat({
                    aksi: 'input_hutang', modul: 'Hutang Usaha', koleksi: 'pembelian',
                    deskripsi: 'Input tagihan/hutang baru (' + supplier + ') nominal ' + Utils.formatRupiah(totalHarga)
                });
            }
            AppLaporanHutang.tutupModal();
            AppLaporanHutang.init();
        }).catch(err => {
            Utils.toast('Gagal menyimpan: ' + err.message, 'error');
        });
    },

    // ===== MODAL 3: APPROVE & BAYAR (OLEH ADMIN, PSA, KEUANGAN) =====
    bukaModalApprove: function(id) {
        var item = this.data.find(x => x.id === id);
        if (!item) return;

        var total = item.totalHarga || item.nominal || 0;

        var html = '<div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">';
        html += '  <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-lg w-full p-6 space-y-5 transform transition-all">';
        html += '    <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">';
        html += '      <div class="flex items-center gap-2.5">';
        html += '        <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"><i data-lucide="check-circle" class="w-5 h-5"></i></div>';
        html += '        <div>';
        html += '          <h3 class="text-base font-black text-slate-800 dark:text-white">Persetujuan & Pelunasan Hutang</h3>';
        html += '          <p class="text-xs text-slate-400">Konfirmasi persetujuan oleh Admin, PSA, atau Keuangan</p>';
        html += '        </div>';
        html += '      </div>';
        html += '      <button onclick="AppLaporanHutang.tutupModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"><i data-lucide="x" class="w-5 h-5"></i></button>';
        html += '    </div>';

        html += '    <div class="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200/80 dark:border-emerald-800 space-y-2 text-xs text-emerald-950 dark:text-emerald-200">';
        html += '      <div class="flex justify-between"><span>Supplier / Vendor:</span> <strong class="font-bold">' + Utils.escapeHtml(item.supplier || '-') + '</strong></div>';
        html += '      <div class="flex justify-between"><span>No. Faktur:</span> <strong class="font-mono">' + Utils.escapeHtml(item.noFaktur || '-') + '</strong></div>';
        if (item.diajukanOleh) html += '      <div class="flex justify-between"><span>Diajukan Oleh:</span> <strong>' + Utils.escapeHtml(item.diajukanOleh) + ' (' + Utils.escapeHtml(item.diajukanRole || '-') + ')</strong></div>';
        if (item.rekeningTujuan) html += '      <div class="flex justify-between"><span>Rekening Tujuan:</span> <strong>' + Utils.escapeHtml(item.rekeningTujuan) + '</strong></div>';
        html += '      <div class="flex justify-between text-sm pt-2 border-t border-emerald-200/60 dark:border-emerald-800 font-extrabold"><span class="text-emerald-800 dark:text-emerald-300">Total Nominal Cair:</span> <span class="text-rose-600 dark:text-rose-400">' + Utils.formatRupiah(total) + '</span></div>';
        html += '    </div>';

        html += '    <div class="space-y-3 text-xs">';
        html += '      <div>';
        html += '        <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Sumber Kas Pembayaran *</label>';
        html += '        <select id="approve-sumber-kas" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:border-emerald-500 transition">';
        html += '          <option value="Kas Utama Klinik & Apotek">Kas Utama Klinik & Apotek</option>';
        html += '          <option value="Kasir Apotek">Kasir Apotek (Kas Kecil)</option>';
        html += '          <option value="Bank Operasional BCA">Bank Operasional BCA</option>';
        html += '          <option value="Bank Operasional Mandiri">Bank Operasional Mandiri</option>';
        html += '        </select>';
        html += '      </div>';

        html += '      <div>';
        html += '        <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Catatan Persetujuan (Opsional)</label>';
        html += '        <input type="text" id="approve-catatan" placeholder="Contoh: Sudah ditransfer via BCA m-Banking" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:border-emerald-500 transition">';
        html += '      </div>';
        html += '    </div>';

        html += '    <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">';
        html += '      <button onclick="AppLaporanHutang.tutupModal()" class="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition">Batal</button>';
        html += '      <button onclick="AppLaporanHutang.prosesApprove(\'' + id + '\')" class="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow transition flex items-center gap-1.5">';
        html += '        <i data-lucide="check-check" class="w-4 h-4"></i>';
        html += '        <span>Setujui & Potong Kas</span>';
        html += '      </button>';
        html += '    </div>';

        html += '  </div>';
        html += '</div>';

        document.getElementById('modal-hutang-container').innerHTML = html;
        lucide.createIcons();
    },

    prosesApprove: function(id) {
        var sumberKas = document.getElementById('approve-sumber-kas').value;
        var catatanApprove = (document.getElementById('approve-catatan').value || '').trim();

        Utils.toast('Memproses pelunasan...', 'info');

        var role = window.currentRole || 'keuangan';
        var nama = window.currentUserName || 'Keuangan';

        var batch = db.batch();
        var fakturRef = db.collection('pembelian').doc(id);

        fakturRef.get().then(function(doc) {
            if (!doc.exists) {
                Utils.toast('Dokumen tidak ditemukan!', 'error');
                return;
            }

            var d = doc.data();
            var total = d.totalHarga || d.nominal || 0;

            // Update status faktur menjadi lunas
            batch.update(fakturRef, {
                statusPelunasan: 'lunas',
                sumberKas: sumberKas,
                catatanPersetujuan: catatanApprove,
                tanggalLunas: Utils.today(),
                dilunasiOleh: nama,
                approvalRole: role,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Catat pengeluaran kas
            // FIX (CACAT LOGIKA KEUANGAN): sebelumnya dokumen ini tidak punya penanda khusus, sehingga
            // ikut terjumlah sebagai "Biaya Operasional Lain" di Laporan Keuangan & Dashboard Keuangan.
            // Padahal pelunasan hutang usaha adalah PERPINDAHAN KAS -> mengurangi HUTANG (item neraca),
            // BUKAN beban baru -- biaya obatnya sudah diakui sebagai HPP saat obat itu TERJUAL (lihat
            // js/keuangan/laporanKeuangan.js). Kalau ikut dihitung lagi di sini, biaya yang sama
            // terpotong DUA KALI dari Laba Bersih. Field `tipeArusKas` di bawah dipakai oleh
            // laporanKeuangan.js & dashboardKeuangan.js untuk MENGECUALIKAN dokumen ini dari
            // "Biaya Operasional", sambil tetap menghitungnya sebagai kas keluar riil (baris
            // "Pembayaran Hutang Usaha" tersendiri).
            var akunKas = '1-1100';
            if (sumberKas.indexOf('Bank') === 0) akunKas = '1-1200';

            var kasRef = db.collection('kasKeluar').doc();
            batch.set(kasRef, {
                tanggal: Utils.today(),
                keterangan: 'Pelunasan Hutang: ' + (d.supplier || 'Vendor') + ' (Faktur ' + (d.noFaktur || id.substring(0,6)) + ')',
                kategori: 'Hutang Usaha',
                tipeArusKas: 'pelunasan_hutang',
                jumlah: total,
                status: 'approved',
                sumberKas: sumberKas,
                akunKas: akunKas,
                referenceId: id,
                inputOleh: nama,
                role: role,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            return batch.commit().then(function() {
                Utils.toast('Hutang berhasil disetujui & dilunasi!', 'success');
                if (window.AuditLog) {
                    AuditLog.catat({
                        aksi: 'approve_bayar_hutang', modul: 'Hutang Usaha', koleksi: 'pembelian', targetId: id,
                        deskripsi: 'Menyetujui & melunasi hutang ' + (d.supplier || '-') + ' sebesar ' + Utils.formatRupiah(total),
                        nominal: total
                    });
                }
                AppLaporanHutang.tutupModal();
                AppLaporanHutang.init();
            });
        }).catch(err => {
            Utils.toast('Gagal memproses persetujuan: ' + err.message, 'error');
        });
    },

    // ===== MODAL 4: TOLAK PENGAJUAN =====
    bukaModalTolak: function(id) {
        var item = this.data.find(x => x.id === id);
        if (!item) return;

        var html = '<div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">';
        html += '  <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-md w-full p-6 space-y-4 transform transition-all">';
        html += '    <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">';
        html += '      <h3 class="text-base font-black text-rose-600 dark:text-rose-400">Tolak Pengajuan Pembayaran</h3>';
        html += '      <button onclick="AppLaporanHutang.tutupModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"><i data-lucide="x" class="w-5 h-5"></i></button>';
        html += '    </div>';

        html += '    <p class="text-xs text-slate-600 dark:text-slate-300">Pengajuan akan dikembalikan ke status <strong>Belum Lunas</strong>. Harap cantumkan alasan penolakan untuk pihak pengaju.</p>';

        html += '    <div>';
        html += '      <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Alasan Penolakan *</label>';
        html += '      <textarea id="input-alasan-tolak" rows="3" placeholder="Contoh: Dokumen fisik faktur belum lengkap / belum dikonfirmasi vendor" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-white outline-none focus:border-rose-500 transition"></textarea>';
        html += '    </div>';

        html += '    <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">';
        html += '      <button onclick="AppLaporanHutang.tutupModal()" class="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition">Batal</button>';
        html += '      <button onclick="AppLaporanHutang.prosesTolak(\'' + id + '\')" class="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow transition">';
        html += '        <span>Konfirmasi Tolak</span>';
        html += '      </button>';
        html += '    </div>';

        html += '  </div>';
        html += '</div>';

        document.getElementById('modal-hutang-container').innerHTML = html;
        lucide.createIcons();
    },

    prosesTolak: function(id) {
        var alasan = (document.getElementById('input-alasan-tolak').value || '').trim();
        if (!alasan) {
            Utils.toast('Alasan penolakan wajib diisi!', 'error');
            return;
        }

        Utils.toast('Menolak pengajuan...', 'info');
        var nama = window.currentUserName || 'Admin';

        db.collection('pembelian').doc(id).update({
            statusPelunasan: 'ditolak',
            alasanPenolakan: alasan,
            ditolakOleh: nama,
            tanggalDitolak: Utils.now()
        }).then(function() {
            Utils.toast('Pengajuan telah ditolak.', 'info');
            if (window.AuditLog) {
                AuditLog.catat({
                    aksi: 'tolak_pengajuan_hutang', modul: 'Hutang Usaha', koleksi: 'pembelian', targetId: id,
                    deskripsi: 'Menolak pengajuan pembayaran hutang. Alasan: ' + alasan
                });
            }
            AppLaporanHutang.tutupModal();
            AppLaporanHutang.init();
        }).catch(err => {
            Utils.toast('Gagal menolak: ' + err.message, 'error');
        });
    },

    tutupModal: function() {
        var container = document.getElementById('modal-hutang-container');
        if (container) container.innerHTML = '';
    }
};