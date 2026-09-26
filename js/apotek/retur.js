/**
 * js/apotek/retur.js
 * Retur Obat ke Supplier
 *
 * FITUR:
 * - Retur Uang/Kredit: pengembalian obat ke supplier (kadaluarsa, rusak, salah kirim)
 *   dengan kompensasi berupa potongan tagihan / nilai retur biasa.
 * - Retur Tukar Barang (BARU): pengembalian obat ke supplier yang dikompensasi dengan
 *   barang pengganti (obat sama atau berbeda, qty bebas, misal 2 barang ditukar 3 barang
 *   jenis lain dengan harga berbeda). Bila nilai barang keluar & masuk tidak sama, selisih
 *   bayarnya bisa diselesaikan tunai (masuk pengajuan kas keluar) atau ditambahkan/dipotongkan
 *   ke faktur hutang supplier yang sudah ada.
 * - Pilih dari master obat, isi qty & alasan retur
 * - Update stok otomatis (dikurangi utk barang keluar, ditambah utk barang masuk pengganti)
 *   via Firestore transaction (atomik, tahan race condition)
 * - Riwayat retur dengan filter bulan
 * - Status retur: menunggu_konfirmasi → dikonfirmasi → selesai / ditolak
 *
 * FIRESTORE COLLECTIONS:
 *   - retur      { jenisRetur: 'uang' | 'barang', tanggal, supplier, alasan, status,
 *                  // jenisRetur === 'uang' (skema lama):
 *                  obatId, namaObat, kodeObat, qty, satuan, hargaBeli, totalNilai,
 *                  // jenisRetur === 'barang' (skema baru):
 *                  barangKeluar: [{obatId,namaObat,kodeObat,satuan,qty,harga,subtotal}],
 *                  barangMasuk:  [{obatId,namaObat,kodeObat,satuan,qty,harga,subtotal}],
 *                  totalNilaiKeluar, totalNilaiMasuk, selisih (masuk - keluar),
 *                  caraSelisih: 'tunai' | 'hutang_baru' | 'potong_hutang' | 'catat' | null,
 *                  fakturHutangId, statusSelisih: 'belum_diselesaikan' | 'selesai' | null,
 *                  catatanAdmin, createdAt, inputOleh }
 *   - obat        (stok dikurangi/ditambah saat retur dikonfirmasi oleh admin)
 *   - pembelian   (retur tukar barang dgn selisih bisa membuat faktur hutang baru bertanda
 *                  sumber: 'retur_tukar_barang', atau menyesuaikan totalHarga faktur existing)
 *   - kasKeluar   (retur tukar barang dgn selisih "tunai" membuat pengajuan kas keluar,
 *                  mengikuti alur approval yang sama seperti laporan/pengeluaran.js)
 *
 * CARA PASANG:
 *   1. Tambahkan file ini ke daftar cache sw.js
 *   2. Tambahkan menu di app.js → menuStructure.apotek:
 *        { id: 'retur', label: 'Retur Supplier', icon: 'package-open', module: 'apotek/retur' }
 *   3. Akses: kasir apotek bisa buat pengajuan, admin/keuangan bisa konfirmasi/tolak
 */

window.AppApotekRetur = {

    // ===== STATE =====
    masterObat: [],
    data: [],
    filterBulan: '',
    hutangList: [],   // faktur pembelian yg masih ada hutang, dipakai utk penyelesaian selisih
    jenisAktif: 'uang', // jenis retur yg sedang aktif di form modal ('uang' | 'barang')

    // ===== RENDER =====
    render: function() {
        var d = new Date();
        var defaultMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        return [
            '<div class="page-enter max-w-5xl">',
            '  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">',
            '    <div>',
            '      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Retur Obat ke Supplier</h2>',
            '      <p class="text-sm text-slate-500 dark:text-slate-400">Pengembalian obat kadaluarsa, rusak, salah kirim — tunai/kredit maupun tukar barang</p>',
            '    </div>',
            '    <button onclick="AppApotekRetur.openForm()" class="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition">',
            '      <i data-lucide="plus" class="w-4 h-4"></i> Buat Retur Baru',
            '    </button>',
            '  </div>',

            '  <div class="flex items-center gap-3 mb-5">',
            '    <label class="text-sm text-slate-500 dark:text-slate-400">Filter Bulan:</label>',
            '    <input type="month" id="retur-filter-bulan" value="' + defaultMonth + '" class="px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm outline-none">',
            '    <button onclick="AppApotekRetur.init()" class="bg-primary-600 text-white text-sm px-4 py-1.5 rounded-lg font-medium">Tampilkan</button>',
            '  </div>',

            '  <div id="retur-list"><div class="flex justify-center py-20"><div class="spinner"></div></div></div>',
            '</div>'
        ].join('');
    },

    // ===== INIT =====
    init: function() {
        var self = this;
        var bulanEl = document.getElementById('retur-filter-bulan');
        var bulan   = bulanEl ? bulanEl.value : new Date().toISOString().slice(0, 7);
        var start   = bulan + '-01';
        var end     = bulan + '-31';

        Promise.all([
            DataCache.getObat(),
            db.collection('retur').where('tanggal', '>=', start).where('tanggal', '<=', end)
              .orderBy('tanggal', 'desc').get(),
            // TAMBAHAN: daftar faktur hutang aktif, dipakai utk opsi "potong/tambah ke faktur
            // hutang existing" saat menyelesaikan selisih pada retur tukar barang.
            db.collection('pembelian').where('statusPelunasan', '!=', 'lunas').get()
        ]).then(function(results) {
            self.masterObat = [];
            results[0].forEach(function(doc) { var d = doc.data(); d.id = doc.id; self.masterObat.push(d); });

            self.data = [];
            results[1].forEach(function(doc) { var d = doc.data(); d.id = doc.id; self.data.push(d); });

            self.hutangList = [];
            results[2].forEach(function(doc) { var d = doc.data(); d.id = doc.id; self.hutangList.push(d); });

            self.renderList();
        }).catch(function(err) {
            document.getElementById('retur-list').innerHTML =
                '<p class="text-red-500 text-center py-10">Gagal memuat: ' + Utils.escapeHtml(err.message) + '</p>';
        });
    },

    // ===== RENDER LIST =====
    renderList: function() {
        var container = document.getElementById('retur-list');
        if (!container) return;
        var role = window.currentRole || '';

        if (this.data.length === 0) {
            container.innerHTML = '<div class="text-center py-16 text-slate-400"><i data-lucide="package-open" class="w-10 h-10 mx-auto mb-3"></i><p>Belum ada retur bulan ini</p></div>';
            if (window.lucide) lucide.createIcons();
            return;
        }

        // Summary (nilai retur uang + nilai keluar retur barang dihitung sbg "nilai retur")
        var totalNilai = this.data.reduce(function(s, r) {
            if (r.jenisRetur === 'barang') return s + (r.totalNilaiKeluar || 0);
            return s + (r.totalNilai || 0);
        }, 0);
        var jumlahBarang = this.data.filter(function(r) { return r.jenisRetur === 'barang'; }).length;

        var html = '<div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">';
        html += '<div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">';
        html += '  <p class="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Retur Bulan Ini</p>';
        html += '  <p class="text-xl font-bold text-gray-800 dark:text-white">' + this.data.length + ' Transaksi</p>';
        html += '</div>';
        html += '<div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">';
        html += '  <p class="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Nilai Retur</p>';
        html += '  <p class="text-xl font-bold text-primary-600 dark:text-primary-400">' + Utils.formatRupiah(totalNilai) + '</p>';
        html += '</div>';
        html += '<div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 col-span-2 sm:col-span-1">';
        html += '  <p class="text-xs text-slate-500 dark:text-slate-400 mb-1">Retur Tukar Barang</p>';
        html += '  <p class="text-xl font-bold text-amber-600 dark:text-amber-400">' + jumlahBarang + ' Transaksi</p>';
        html += '</div></div>';

        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
        html += '<table class="w-full text-sm">';
        html += '<thead class="bg-slate-50 dark:bg-slate-700 text-xs uppercase text-slate-500 dark:text-slate-400">';
        html += '<tr><th class="px-4 py-3 text-left">Tanggal</th><th class="px-4 py-3 text-left">Jenis</th><th class="px-4 py-3 text-left">Obat / Barang</th><th class="px-4 py-3 text-left">Supplier</th><th class="px-4 py-3 text-right">Nilai</th><th class="px-4 py-3 text-center">Status</th><th class="px-4 py-3 text-center">Aksi</th></tr>';
        html += '</thead><tbody class="divide-y divide-slate-100 dark:divide-slate-700">';

        var isAdmin = (role === 'admin' || role === 'keuangan');
        this.data.forEach(function(r) {
            if (r.jenisRetur === 'barang') {
                html += AppApotekRetur._renderRowBarang(r, isAdmin);
            } else {
                html += AppApotekRetur._renderRowUang(r, isAdmin);
            }
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
        if (window.lucide) lucide.createIcons();
    },

    _renderRowUang: function(r, isAdmin) {
        var html = '<tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50">';
        html += '<td class="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">' + (r.tanggal || '-') + '</td>';
        html += '<td class="px-4 py-3"><span class="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-full font-medium">Uang/Kredit</span></td>';
        html += '<td class="px-4 py-3"><p class="font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(r.namaObat || '-') + '</p>';
        html += '<p class="text-xs text-slate-400">' + (r.qty || 0) + ' ' + Utils.escapeHtml(r.satuan || '') + ' &middot; ' + Utils.escapeHtml(r.alasan || '-') + '</p></td>';
        html += '<td class="px-4 py-3 text-slate-600 dark:text-slate-300">' + Utils.escapeHtml(r.supplier || '-') + '</td>';
        html += '<td class="px-4 py-3 text-right font-medium">' + Utils.formatRupiah(r.totalNilai || 0) + '</td>';
        html += '<td class="px-4 py-3 text-center">' + AppApotekRetur._badgeStatus(r.status) + '</td>';
        html += '<td class="px-4 py-3 text-center">';
        if (isAdmin && r.status === 'menunggu_konfirmasi') {
            html += '<button onclick="AppApotekRetur.konfirmasi(\'' + r.id + '\')" class="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-2 py-1 rounded font-semibold mr-1">Konfirmasi</button>';
            html += '<button onclick="AppApotekRetur.tolak(\'' + r.id + '\')" class="text-xs bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/40 dark:text-red-400 px-2 py-1 rounded font-semibold">Tolak</button>';
        } else {
            html += '<span class="text-xs text-slate-400">-</span>';
        }
        html += '</td></tr>';
        return html;
    },

    _renderRowBarang: function(r, isAdmin) {
        var jmlKeluar = (r.barangKeluar || []).length;
        var jmlMasuk  = (r.barangMasuk || []).length;
        var selisih   = r.selisih || 0;
        var selisihHtml;
        if (selisih > 0) {
            selisihHtml = '<span class="text-red-500">+' + Utils.formatRupiah(selisih) + ' (apotek bayar)</span>';
        } else if (selisih < 0) {
            selisihHtml = '<span class="text-emerald-500">-' + Utils.formatRupiah(Math.abs(selisih)) + ' (apotek dpt potongan)</span>';
        } else {
            selisihHtml = '<span class="text-slate-400">Rp 0 (seimbang)</span>';
        }

        var html = '<tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50">';
        html += '<td class="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">' + (r.tanggal || '-') + '</td>';
        html += '<td class="px-4 py-3"><span class="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full font-medium">Tukar Barang</span></td>';
        html += '<td class="px-4 py-3">';
        html += '<button type="button" onclick="AppApotekRetur.lihatDetailBarang(\'' + r.id + '\')" class="font-medium text-primary-600 dark:text-primary-400 hover:underline text-left">' + jmlKeluar + ' item keluar &rarr; ' + jmlMasuk + ' item masuk</button>';
        html += '<p class="text-xs text-slate-400">Selisih: ' + selisihHtml + '</p></td>';
        html += '<td class="px-4 py-3 text-slate-600 dark:text-slate-300">' + Utils.escapeHtml(r.supplier || '-') + '</td>';
        html += '<td class="px-4 py-3 text-right font-medium">' + Utils.formatRupiah(r.totalNilaiKeluar || 0) + '</td>';
        html += '<td class="px-4 py-3 text-center">' + AppApotekRetur._badgeStatus(r.status) + '</td>';
        html += '<td class="px-4 py-3 text-center">';
        if (isAdmin && r.status === 'menunggu_konfirmasi') {
            html += '<button onclick="AppApotekRetur.konfirmasi(\'' + r.id + '\')" class="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-2 py-1 rounded font-semibold mr-1">Konfirmasi</button>';
            html += '<button onclick="AppApotekRetur.tolak(\'' + r.id + '\')" class="text-xs bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/40 dark:text-red-400 px-2 py-1 rounded font-semibold">Tolak</button>';
        } else {
            html += '<span class="text-xs text-slate-400">-</span>';
        }
        html += '</td></tr>';
        return html;
    },

    // ===== DETAIL RETUR TUKAR BARANG =====
    lihatDetailBarang: function(id) {
        var r = this.data.find(function(x) { return x.id === id; });
        if (!r) return;

        var html = '<div class="p-6 max-h-[90vh] overflow-y-auto">';
        html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-semibold text-gray-800 dark:text-white">Detail Retur Tukar Barang</h3><button type="button" onclick="Utils.closeModal()" class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><i data-lucide="x" class="w-5 h-5 text-slate-400"></i></button></div>';

        html += '<div class="grid grid-cols-2 gap-3 text-sm mb-4">';
        html += '<div><p class="text-slate-400 text-xs">Tanggal</p><p class="font-medium text-gray-800 dark:text-white">' + (r.tanggal || '-') + '</p></div>';
        html += '<div><p class="text-slate-400 text-xs">Supplier</p><p class="font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(r.supplier || '-') + '</p></div>';
        html += '<div class="col-span-2"><p class="text-slate-400 text-xs">Alasan</p><p class="font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(r.alasan || '-') + '</p></div>';
        html += '</div>';

        html += '<p class="text-xs font-semibold uppercase text-slate-400 mb-2">Barang Diretur (Keluar &mdash; stok berkurang)</p>';
        html += '<div class="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden mb-4"><table class="w-full text-sm">';
        html += '<thead class="bg-slate-50 dark:bg-slate-700 text-xs text-slate-500"><tr><th class="px-3 py-2 text-left">Obat</th><th class="px-3 py-2 text-center">Qty</th><th class="px-3 py-2 text-right">Harga</th><th class="px-3 py-2 text-right">Subtotal</th></tr></thead><tbody class="divide-y divide-slate-100 dark:divide-slate-700">';
        (r.barangKeluar || []).forEach(function(i) {
            html += '<tr><td class="px-3 py-2">' + Utils.escapeHtml(i.namaObat) + '</td><td class="px-3 py-2 text-center">' + i.qty + ' ' + Utils.escapeHtml(i.satuan || '') + '</td><td class="px-3 py-2 text-right">' + Utils.formatRupiah(i.harga) + '</td><td class="px-3 py-2 text-right font-medium">' + Utils.formatRupiah(i.subtotal) + '</td></tr>';
        });
        html += '</tbody></table></div>';

        html += '<p class="text-xs font-semibold uppercase text-slate-400 mb-2">Barang Pengganti (Masuk &mdash; stok bertambah)</p>';
        html += '<div class="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden mb-4"><table class="w-full text-sm">';
        html += '<thead class="bg-slate-50 dark:bg-slate-700 text-xs text-slate-500"><tr><th class="px-3 py-2 text-left">Obat</th><th class="px-3 py-2 text-center">Qty</th><th class="px-3 py-2 text-right">Harga</th><th class="px-3 py-2 text-right">Subtotal</th></tr></thead><tbody class="divide-y divide-slate-100 dark:divide-slate-700">';
        (r.barangMasuk || []).forEach(function(i) {
            html += '<tr><td class="px-3 py-2">' + Utils.escapeHtml(i.namaObat) + '</td><td class="px-3 py-2 text-center">' + i.qty + ' ' + Utils.escapeHtml(i.satuan || '') + '</td><td class="px-3 py-2 text-right">' + Utils.formatRupiah(i.harga) + '</td><td class="px-3 py-2 text-right font-medium">' + Utils.formatRupiah(i.subtotal) + '</td></tr>';
        });
        html += '</tbody></table></div>';

        var selisih = r.selisih || 0;
        html += '<div class="bg-slate-50 dark:bg-slate-900/40 rounded-lg p-4 space-y-1 text-sm mb-4">';
        html += '<div class="flex justify-between"><span class="text-slate-500">Total Nilai Keluar</span><span class="font-medium">' + Utils.formatRupiah(r.totalNilaiKeluar || 0) + '</span></div>';
        html += '<div class="flex justify-between"><span class="text-slate-500">Total Nilai Masuk</span><span class="font-medium">' + Utils.formatRupiah(r.totalNilaiMasuk || 0) + '</span></div>';
        html += '<div class="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1 mt-1"><span class="font-semibold">Selisih</span><span class="font-bold ' + (selisih > 0 ? 'text-red-500' : (selisih < 0 ? 'text-emerald-500' : 'text-slate-500')) + '">' + (selisih > 0 ? '+' : (selisih < 0 ? '-' : '')) + Utils.formatRupiah(Math.abs(selisih)) + '</span></div>';
        if (selisih !== 0) {
            html += '<div class="flex justify-between text-xs pt-1"><span class="text-slate-400">Cara Penyelesaian</span><span class="text-slate-500">' + AppApotekRetur._labelCaraSelisih(r.caraSelisih) + '</span></div>';
            html += '<div class="flex justify-between text-xs"><span class="text-slate-400">Status Selisih</span><span class="' + (r.statusSelisih === 'selesai' ? 'text-emerald-500' : 'text-amber-500') + '">' + (r.statusSelisih === 'selesai' ? 'Selesai' : 'Belum Diselesaikan') + '</span></div>';
        }
        html += '</div>';

        html += '<div class="flex justify-end"><button type="button" onclick="Utils.closeModal()" class="px-4 py-2.5 text-sm bg-slate-100 dark:bg-slate-700 dark:text-white hover:bg-slate-200 rounded-lg">Tutup</button></div>';
        html += '</div>';

        Utils.openModal(html);
        if (window.lucide) lucide.createIcons();
    },

    _labelCaraSelisih: function(cara) {
        var map = {
            tunai: 'Tunai (pengajuan kas keluar)',
            hutang_baru: 'Ditambahkan sbg hutang baru ke supplier',
            potong_hutang: 'Disesuaikan ke faktur hutang existing',
            catat: 'Dicatat manual (belum diselesaikan otomatis)'
        };
        return map[cara] || '-';
    },

    // ===== FORM RETUR BARU =====
    openForm: function() {
        this.jenisAktif = 'uang';
        this.masterObat.sort(function(a, b) { return (a.namaObat || '').localeCompare(b.namaObat || ''); });

        var obatOptions = '<option value="">-- Pilih Obat --</option>';
        this.masterObat.forEach(function(o) {
            obatOptions += '<option value="' + o.id + '" data-hpp="' + (o.hpp || 0) + '" data-stok="' + (o.stok || 0) + '" data-satuan="' + Utils.escapeHtml(o.satuan || '') + '">' + Utils.escapeHtml(o.namaObat) + ' (Stok: ' + (o.stok || 0) + ')</option>';
        });

        var today = Utils.today(); // FIX: pakai tanggal lokal, bukan UTC

        // FIX: Utils.openModal hanya menerima 1 parameter (htmlContent), bukan (judul, html, callback).
        // Pemanggilan 3-parameter sebelumnya membuat parameter "judul" ('Buat Retur Baru') dianggap
        // SEBAGAI ISI modal, sehingga modal yang muncul kosong tanpa form sama sekali (form yang sudah
        // dibangun di variabel html tidak pernah ter-render, dan tombol simpan tidak pernah terpasang).
        // Sekarang mengikuti pola modal yang sama seperti modul lain (obat.js, pasien.js, dll): judul +
        // tombol close dibuat manual di dalam html, submit form ditangkap lewat addEventListener.
        var html = '<div class="p-6 max-h-[90vh] overflow-y-auto">';
        html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-semibold text-gray-800 dark:text-white">Buat Retur Baru</h3><button type="button" onclick="Utils.closeModal()" class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><i data-lucide="x" class="w-5 h-5 text-slate-400"></i></button></div>';

        html += '<form id="form-retur" class="space-y-4">';

        // TAMBAHAN: pemilihan jenis retur — Uang/Kredit (skema lama, nilai tunggal) vs
        // Tukar Barang (skema baru, barang keluar & barang pengganti bisa banyak & beda jenis).
        html += '<div class="grid grid-cols-2 gap-3">';
        html += '<button type="button" id="btn-jenis-uang" onclick="AppApotekRetur.setJenisRetur(\'uang\')" class="border-2 border-primary-500 bg-primary-50 dark:bg-primary-900/20 p-3 rounded-xl text-center transition"><i data-lucide="banknote" class="w-5 h-5 mx-auto mb-1 text-primary-600"></i><p class="text-sm font-semibold text-gray-800 dark:text-white">Retur Uang/Kredit</p><p class="text-xs text-slate-400">Nilai retur dikompensasi tunai/potong hutang</p></button>';
        html += '<button type="button" id="btn-jenis-barang" onclick="AppApotekRetur.setJenisRetur(\'barang\')" class="border-2 border-slate-200 dark:border-slate-700 p-3 rounded-xl text-center transition hover:border-primary-400"><i data-lucide="repeat" class="w-5 h-5 mx-auto mb-1 text-slate-500"></i><p class="text-sm font-semibold text-gray-800 dark:text-white">Retur Tukar Barang</p><p class="text-xs text-slate-400">Ditukar barang pengganti, bisa ada selisih bayar</p></button>';
        html += '</div>';

        html += '<div class="grid grid-cols-2 gap-4">';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tanggal Retur *</label><input type="date" id="retur-tgl" value="' + today + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" required></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Supplier *</label><input type="text" id="retur-supplier" placeholder="Nama supplier / PBF" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" required></div>';
        html += '</div>';

        // ===== BODY: JENIS UANG/KREDIT (skema lama) =====
        html += '<div id="retur-body-uang">';
        html += '<div class="grid grid-cols-2 gap-4">';
        html += '<div class="col-span-2"><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Obat *</label><select id="retur-obat" onchange="AppApotekRetur.onObatChange(this)" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm">' + obatOptions + '</select>';
        // TAMBAHAN: indikator stok tersedia untuk obat yang dipilih, real-time & langsung terintegrasi
        // dengan data stok master obat — sebelumnya field ini lepas total dari stok sampai baru
        // divalidasi (dan ditolak) setelah tombol Simpan diklik.
        html += '<p id="retur-stok-info" class="text-xs text-slate-400 mt-1">Pilih obat untuk melihat stok tersedia</p></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Qty Retur *</label><input type="number" id="retur-qty" min="1" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" oninput="AppApotekRetur.hitungNilai()"></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Harga Beli/Unit (Rp)</label><input type="number" id="retur-harga" min="0" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" oninput="AppApotekRetur.hitungNilai()"></div>';
        html += '<div class="col-span-2"><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Total Nilai Retur</label>';
        html += '<p id="retur-total" class="text-xl font-bold text-primary-600 dark:text-primary-400">Rp 0</p></div>';
        html += '</div>';
        html += '</div>';

        // ===== BODY: JENIS TUKAR BARANG (skema baru) =====
        html += '<div id="retur-body-barang" class="hidden space-y-4">';

        html += '<div class="border border-slate-200 dark:border-slate-700 rounded-lg p-3">';
        html += '<div class="flex justify-between items-center mb-2"><p class="text-sm font-semibold text-gray-800 dark:text-white">Barang Diretur (Keluar) *</p><button type="button" onclick="AppApotekRetur.addBarangRow(\'keluar\')" class="text-xs bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-2 py-1 rounded-lg font-medium hover:bg-primary-100">+ Tambah Obat</button></div>';
        html += '<div id="rb-keluar-container" class="space-y-2"><p class="text-sm text-slate-400 italic p-2">Klik tambah obat untuk mulai input barang yang diretur.</p></div>';
        html += '</div>';

        html += '<div class="border border-slate-200 dark:border-slate-700 rounded-lg p-3">';
        html += '<div class="flex justify-between items-center mb-2"><p class="text-sm font-semibold text-gray-800 dark:text-white">Barang Pengganti dari Supplier (Masuk) *</p><button type="button" onclick="AppApotekRetur.addBarangRow(\'masuk\')" class="text-xs bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-2 py-1 rounded-lg font-medium hover:bg-primary-100">+ Tambah Obat</button></div>';
        html += '<div id="rb-masuk-container" class="space-y-2"><p class="text-sm text-slate-400 italic p-2">Klik tambah obat untuk mulai input barang pengganti.</p></div>';
        html += '</div>';

        html += '<div class="bg-slate-50 dark:bg-slate-900/40 rounded-lg p-4 space-y-1 text-sm">';
        html += '<div class="flex justify-between"><span class="text-slate-500">Total Nilai Keluar</span><span id="rb-total-keluar" class="font-medium">Rp 0</span></div>';
        html += '<div class="flex justify-between"><span class="text-slate-500">Total Nilai Masuk</span><span id="rb-total-masuk" class="font-medium">Rp 0</span></div>';
        html += '<div class="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1 mt-1"><span class="font-semibold">Selisih</span><span id="rb-selisih" class="font-bold text-slate-500">Rp 0 (seimbang)</span></div>';
        html += '</div>';

        html += '<div id="rb-selisih-wrapper" class="hidden">';
        html += '<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cara Penyelesaian Selisih *</label>';
        html += '<select id="rb-cara-selisih" onchange="AppApotekRetur.onCaraSelisihChange()" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"></select>';
        html += '<div id="rb-faktur-wrapper" class="hidden mt-2">';
        html += '<label class="block text-xs font-medium text-slate-500 mb-1">Pilih Faktur Hutang Supplier</label>';
        html += '<select id="rb-faktur-hutang" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"></select>';
        html += '</div>';
        html += '</div>';

        html += '</div>'; // end retur-body-barang

        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Alasan Retur *</label>';
        html += '<select id="retur-alasan" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm">';
        html += '<option value="Mendekati kadaluarsa">Mendekati kadaluarsa</option>';
        html += '<option value="Sudah kadaluarsa">Sudah kadaluarsa</option>';
        html += '<option value="Obat rusak / kemasan cacat">Obat rusak / kemasan cacat</option>';
        html += '<option value="Salah kirim dari supplier">Salah kirim dari supplier</option>';
        html += '<option value="Tidak laku / slow moving">Tidak laku / slow moving</option>';
        html += '</select></div>';

        html += '<div class="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">';
        html += '<button type="button" onclick="Utils.closeModal()" class="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Batal</button>';
        html += '<button type="submit" class="px-6 py-2.5 text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg">Simpan Retur</button>';
        html += '</div>';
        html += '</form></div>';

        Utils.openModal(html);
        setTimeout(function() {
            var form = document.getElementById('form-retur');
            if (form) {
                form.addEventListener('submit', function(e) {
                    e.preventDefault();
                    if (AppApotekRetur.jenisAktif === 'barang') {
                        AppApotekRetur.simpanReturBarang();
                    } else {
                        AppApotekRetur.simpanReturUang();
                    }
                });
            }
            SearchableSelect.attach('retur-obat', { placeholder: 'Ketik nama obat...' });
            if (window.lucide) lucide.createIcons();
        }, 100);
    },

    // ===== TOGGLE JENIS RETUR =====
    setJenisRetur: function(jenis) {
        this.jenisAktif = jenis;
        var btnUang   = document.getElementById('btn-jenis-uang');
        var btnBarang = document.getElementById('btn-jenis-barang');
        var bodyUang  = document.getElementById('retur-body-uang');
        var bodyBarang = document.getElementById('retur-body-barang');
        var activeClass   = 'border-2 border-primary-500 bg-primary-50 dark:bg-primary-900/20 p-3 rounded-xl text-center transition';
        var inactiveClass = 'border-2 border-slate-200 dark:border-slate-700 p-3 rounded-xl text-center transition hover:border-primary-400';

        if (jenis === 'barang') {
            if (btnUang) btnUang.className = inactiveClass;
            if (btnBarang) btnBarang.className = activeClass;
            if (bodyUang) bodyUang.classList.add('hidden');
            if (bodyBarang) bodyBarang.classList.remove('hidden');
        } else {
            if (btnUang) btnUang.className = activeClass;
            if (btnBarang) btnBarang.className = inactiveClass;
            if (bodyUang) bodyUang.classList.remove('hidden');
            if (bodyBarang) bodyBarang.classList.add('hidden');
        }
    },

    // ===== SKEMA UANG/KREDIT: HANDLER FORM =====
    onObatChange: function(sel) {
        var opt    = sel.options[sel.selectedIndex];
        var hpp    = parseFloat(opt.getAttribute('data-hpp')) || 0;
        var stok   = parseFloat(opt.getAttribute('data-stok')) || 0;
        var satuan = opt.getAttribute('data-satuan') || '';
        var hargaEl = document.getElementById('retur-harga');
        var qtyEl   = document.getElementById('retur-qty');

        if (hargaEl) hargaEl.value = hpp;
        // TAMBAHAN: qty langsung dibatasi (max) sesuai stok obat yang dipilih — integrasi langsung
        // ke master data obat, bukan cuma divalidasi belakangan saat submit.
        if (qtyEl) qtyEl.max = stok;
        this.hitungNilai();
    },

    hitungNilai: function() {
        var obatSel = document.getElementById('retur-obat');
        var opt     = obatSel ? obatSel.options[obatSel.selectedIndex] : null;
        var stok    = (opt && opt.value) ? (parseFloat(opt.getAttribute('data-stok')) || 0) : null;
        var satuan  = opt ? (opt.getAttribute('data-satuan') || '') : '';
        var qty     = parseFloat(document.getElementById('retur-qty')?.value) || 0;
        var harga   = parseFloat(document.getElementById('retur-harga')?.value) || 0;
        var el      = document.getElementById('retur-total');
        var infoEl  = document.getElementById('retur-stok-info');

        if (el) el.textContent = Utils.formatRupiah(qty * harga);

        // TAMBAHAN: peringatan real-time kalau qty melebihi stok, bukan menunggu toast error saat submit.
        if (infoEl) {
            if (stok === null) {
                infoEl.textContent = 'Pilih obat untuk melihat stok tersedia';
                infoEl.className = 'text-xs text-slate-400 mt-1';
            } else if (qty > stok) {
                infoEl.textContent = 'Qty melebihi stok tersedia (' + stok + ' ' + satuan + ')!';
                infoEl.className = 'text-xs text-red-500 font-medium mt-1';
            } else {
                infoEl.textContent = 'Stok tersedia: ' + stok + ' ' + satuan;
                infoEl.className = 'text-xs text-slate-500 dark:text-slate-400 mt-1';
            }
        }
    },

    simpanReturUang: function() {
        // FIX (BUG KLIK DOBEL): sama seperti js/apotek/transaksi.js & pembelian.js --
        // sebelumnya tidak ada guard, jadi klik dobel bisa membuat dua pengajuan retur
        // identik tersimpan, yang keduanya berpotensi disetujui admin (stok terpotong dobel).
        if (this._isSaving) return;
        this._isSaving = true;
        var btnSimpan = document.querySelector('#modal-container button[onclick="AppApotekRetur.simpanReturUang()"]');
        if (btnSimpan) { btnSimpan.disabled = true; btnSimpan.classList.add('opacity-50', 'cursor-not-allowed'); }
        var self = this;
        var _resetGuard = function() {
            self._isSaving = false;
            if (btnSimpan) { btnSimpan.disabled = false; btnSimpan.classList.remove('opacity-50', 'cursor-not-allowed'); }
        };

        var tgl      = document.getElementById('retur-tgl')?.value;
        var supplier = document.getElementById('retur-supplier')?.value.trim();
        var obatSel  = document.getElementById('retur-obat');
        var obatId   = obatSel?.value;
        var qty      = parseFloat(document.getElementById('retur-qty')?.value) || 0;
        var harga    = parseFloat(document.getElementById('retur-harga')?.value) || 0;
        var alasan   = document.getElementById('retur-alasan')?.value;

        if (!tgl || !supplier || !obatId || qty <= 0) {
            _resetGuard();
            return Utils.toast('Lengkapi semua field yang wajib!', 'error');
        }

        var obat = this.masterObat.find(function(o) { return o.id === obatId; });
        if (!obat) { _resetGuard(); return Utils.toast('Obat tidak ditemukan', 'error'); }

        if (qty > (obat.stok || 0)) {
            _resetGuard();
            return Utils.toast('Qty retur (' + qty + ') melebihi stok tersedia (' + (obat.stok || 0) + ')!', 'error');
        }

        var obj = {
            jenisRetur: 'uang',
            tanggal:    tgl,
            supplier:   supplier,
            obatId:     obatId,
            namaObat:   obat.namaObat,
            kodeObat:   obat.kodeObat || '',
            satuan:     obat.satuan || '',
            qty:        qty,
            hargaBeli:  harga,
            totalNilai: qty * harga,
            alasan:     alasan,
            status:     'menunggu_konfirmasi',
            inputOleh:  window.currentUserName || 'Kasir',
            createdAt:  firebase.firestore.FieldValue.serverTimestamp()
        };

        db.collection('retur').add(obj).then(function() {
            Utils.toast('Pengajuan retur berhasil dibuat! Menunggu konfirmasi admin.', 'success');
            _resetGuard();
            Utils.closeModal();
            AppApotekRetur.init();
        }).catch(function(err) {
            Utils.toast('Gagal: ' + err.message, 'error');
            _resetGuard();
        });
        // CATATAN: stok baru dikurangi saat admin konfirmasi, bukan saat pengajuan dibuat.
    },

    // ===== SKEMA TUKAR BARANG: HANDLER FORM =====
    addBarangRow: function(sisi) {
        var container = document.getElementById('rb-' + sisi + '-container');
        if (!container) return;
        if (container.querySelector('p.italic')) container.innerHTML = '';

        var idx = container.children.length;
        var rowId = 'rb-' + sisi + '-row-' + idx;
        var obatOptions = '<option value="">-- Pilih --</option>';
        this.masterObat.forEach(function(o) {
            obatOptions += '<option value="' + o.id + '" data-hpp="' + (o.hpp || 0) + '" data-stok="' + (o.stok || 0) + '" data-satuan="' + Utils.escapeHtml(o.satuan || '') + '">' + Utils.escapeHtml(o.namaObat) + ' (Stok: ' + (o.stok || 0) + ')</option>';
        });

        var html = '<div id="' + rowId + '" class="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-900/30">';
        html += '<div class="flex flex-col md:flex-row gap-3 items-start md:items-end">';
        html += '<div class="w-full md:w-2/5"><label class="block text-xs text-slate-500 mb-1">Pilih Obat</label>';
        html += '<select id="rb-' + sisi + '-obat-' + idx + '" onchange="AppApotekRetur.onBarangObatChange(\'' + sisi + '\',' + idx + ')" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm">' + obatOptions + '</select>';
        if (sisi === 'keluar') {
            html += '<p id="rb-keluar-stok-' + idx + '" class="text-xs text-slate-400 mt-1">&nbsp;</p>';
        }
        html += '</div>';
        html += '<div class="w-full md:w-1/6"><label class="block text-xs text-slate-500 mb-1">Qty</label><input type="number" id="rb-' + sisi + '-qty-' + idx + '" value="1" min="1" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm text-center" oninput="AppApotekRetur.hitungTotalBarang()"></div>';
        html += '<div class="w-full md:w-1/6"><label class="block text-xs text-slate-500 mb-1">Harga/Unit</label><input type="number" id="rb-' + sisi + '-harga-' + idx + '" value="0" min="0" step="any" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm text-right" oninput="AppApotekRetur.hitungTotalBarang()"></div>';
        html += '<div class="w-full md:w-1/6"><label class="block text-xs text-slate-500 mb-1">Subtotal</label><div id="rb-' + sisi + '-sub-' + idx + '" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm text-right font-medium text-slate-600">Rp 0</div></div>';
        html += '<button type="button" onclick="AppApotekRetur.removeBarangRow(\'' + sisi + '\',' + idx + ')" class="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg self-end md:self-center"><i data-lucide="trash-2" class="w-4 h-4"></i></button>';
        html += '</div></div>';

        container.insertAdjacentHTML('beforeend', html);
        if (window.lucide) lucide.createIcons({ nodes: [container] });
        SearchableSelect.attach('rb-' + sisi + '-obat-' + idx, { placeholder: 'Ketik nama obat...' });
    },

    onBarangObatChange: function(sisi, idx) {
        var sel = document.getElementById('rb-' + sisi + '-obat-' + idx);
        if (!sel) return;
        var opt = sel.options[sel.selectedIndex];
        var hpp = parseFloat(opt.getAttribute('data-hpp')) || 0;
        var hargaEl = document.getElementById('rb-' + sisi + '-harga-' + idx);
        if (hargaEl) hargaEl.value = hpp;

        if (sisi === 'keluar') {
            var stok = parseFloat(opt.getAttribute('data-stok')) || 0;
            var satuan = opt.getAttribute('data-satuan') || '';
            var qtyEl = document.getElementById('rb-keluar-qty-' + idx);
            if (qtyEl) qtyEl.max = stok;
            var infoEl = document.getElementById('rb-keluar-stok-' + idx);
            if (infoEl) {
                infoEl.textContent = opt.value ? ('Stok tersedia: ' + stok + ' ' + satuan) : '\u00A0';
                infoEl.className = 'text-xs text-slate-400 mt-1';
            }
        }
        this.hitungTotalBarang();
    },

    removeBarangRow: function(sisi, idx) {
        var row = document.getElementById('rb-' + sisi + '-row-' + idx);
        if (row) row.remove();
        var container = document.getElementById('rb-' + sisi + '-container');
        if (container && container.children.length === 0) {
            container.innerHTML = '<p class="text-sm text-slate-400 italic p-2">Klik tambah obat untuk mulai input.</p>';
        }
        this.hitungTotalBarang();
    },

    _kumpulkanBarang: function(sisi) {
        var self = this;
        var container = document.getElementById('rb-' + sisi + '-container');
        var items = [];
        if (!container) return items;
        var rows = container.querySelectorAll('[id^="rb-' + sisi + '-row-"]');
        rows.forEach(function(row) {
            var idx = row.id.split('-').pop();
            var obatId = document.getElementById('rb-' + sisi + '-obat-' + idx)?.value;
            if (!obatId) return;
            var obat = self.masterObat.find(function(o) { return o.id === obatId; });
            var qty = parseFloat(document.getElementById('rb-' + sisi + '-qty-' + idx)?.value) || 0;
            var harga = parseFloat(document.getElementById('rb-' + sisi + '-harga-' + idx)?.value) || 0;
            items.push({
                obatId: obatId,
                namaObat: obat ? obat.namaObat : '-',
                kodeObat: obat ? (obat.kodeObat || '') : '',
                satuan: obat ? (obat.satuan || '') : '',
                qty: qty,
                harga: harga,
                subtotal: qty * harga
            });
        });
        return items;
    },

    hitungTotalBarang: function() {
        var container;
        ['keluar', 'masuk'].forEach(function(sisi) {
            container = document.getElementById('rb-' + sisi + '-container');
            if (!container) return;
            var rows = container.querySelectorAll('[id^="rb-' + sisi + '-row-"]');
            rows.forEach(function(row) {
                var idx = row.id.split('-').pop();
                var qty = parseFloat(document.getElementById('rb-' + sisi + '-qty-' + idx)?.value) || 0;
                var harga = parseFloat(document.getElementById('rb-' + sisi + '-harga-' + idx)?.value) || 0;
                var subEl = document.getElementById('rb-' + sisi + '-sub-' + idx);
                if (subEl) subEl.textContent = Utils.formatRupiah(qty * harga);
            });
        });

        var totalKeluar = this._kumpulkanBarang('keluar').reduce(function(s, i) { return s + i.subtotal; }, 0);
        var totalMasuk  = this._kumpulkanBarang('masuk').reduce(function(s, i) { return s + i.subtotal; }, 0);
        var selisih = totalMasuk - totalKeluar;

        var elKeluar = document.getElementById('rb-total-keluar');
        var elMasuk  = document.getElementById('rb-total-masuk');
        var elSelisih = document.getElementById('rb-selisih');
        if (elKeluar) elKeluar.textContent = Utils.formatRupiah(totalKeluar);
        if (elMasuk) elMasuk.textContent = Utils.formatRupiah(totalMasuk);

        if (elSelisih) {
            if (selisih > 0) {
                elSelisih.textContent = '+' + Utils.formatRupiah(selisih) + ' (apotek harus bayar tambahan)';
                elSelisih.className = 'font-bold text-red-500';
            } else if (selisih < 0) {
                elSelisih.textContent = '-' + Utils.formatRupiah(Math.abs(selisih)) + ' (apotek dapat potongan/kembalian)';
                elSelisih.className = 'font-bold text-emerald-500';
            } else {
                elSelisih.textContent = 'Rp 0 (nilai barang seimbang)';
                elSelisih.className = 'font-bold text-slate-500';
            }
        }

        this._toggleSelisihWrapper(selisih);
    },

    _toggleSelisihWrapper: function(selisih) {
        var wrapper = document.getElementById('rb-selisih-wrapper');
        var caraSel = document.getElementById('rb-cara-selisih');
        if (!wrapper || !caraSel) return;

        if (selisih === 0) {
            wrapper.classList.add('hidden');
            return;
        }
        wrapper.classList.remove('hidden');

        var opts = '';
        if (selisih > 0) {
            opts += '<option value="tunai">Bayar Tunai Sekarang (pengajuan kas keluar)</option>';
            opts += '<option value="hutang_baru">Tambahkan sebagai Hutang Baru ke Supplier</option>';
            opts += '<option value="potong_hutang">Tambahkan ke Faktur Hutang Existing</option>';
        } else {
            opts += '<option value="tunai">Terima Tunai Sekarang (uang masuk ke kas)</option>';
            opts += '<option value="potong_hutang">Potongkan ke Faktur Hutang Existing</option>';
            opts += '<option value="catat">Catat Saja (diselesaikan manual nanti)</option>';
        }
        // Isi ulang hanya kalau opsinya berubah, biar pilihan user tidak ke-reset tiap ketik qty/harga.
        var currentOpts = Array.prototype.map.call(caraSel.options, function(o) { return o.value; }).join(',');
        var newOpts = opts.replace(/<option value="([^"]+)">[^<]*<\/option>/g, '$1,').slice(0, -1);
        if (currentOpts !== newOpts) {
            caraSel.innerHTML = opts;
        }
        this.onCaraSelisihChange();
    },

    onCaraSelisihChange: function() {
        var cara = document.getElementById('rb-cara-selisih')?.value;
        var fakturWrapper = document.getElementById('rb-faktur-wrapper');
        var fakturSel = document.getElementById('rb-faktur-hutang');
        if (!fakturWrapper || !fakturSel) return;

        if (cara !== 'potong_hutang') {
            fakturWrapper.classList.add('hidden');
            return;
        }
        fakturWrapper.classList.remove('hidden');

        var supplier = (document.getElementById('retur-supplier')?.value || '').trim().toLowerCase();
        var list = this.hutangList.filter(function(h) {
            return supplier && (h.supplier || '').toLowerCase().indexOf(supplier) !== -1;
        });
        var note = '';
        if (list.length === 0) {
            list = this.hutangList; // fallback: tampilkan semua faktur hutang aktif
            note = '<p class="text-xs text-amber-500 mt-1">Tidak ditemukan faktur dari supplier "' + Utils.escapeHtml(document.getElementById('retur-supplier')?.value || '') + '" — menampilkan semua faktur hutang aktif.</p>';
        }

        if (list.length === 0) {
            fakturSel.innerHTML = '<option value="">-- Tidak ada faktur hutang aktif --</option>';
        } else {
            var opts = '';
            list.forEach(function(h) {
                opts += '<option value="' + h.id + '">' + Utils.escapeHtml(h.supplier || '-') + ' &middot; ' + Utils.escapeHtml(h.noFaktur || h.id.substring(0, 8)) + ' &middot; Sisa ' + Utils.formatRupiah(h.totalHarga || 0) + '</option>';
            });
            fakturSel.innerHTML = opts;
        }

        var oldNote = fakturWrapper.querySelector('p.text-amber-500');
        if (oldNote) oldNote.remove();
        if (note) fakturWrapper.insertAdjacentHTML('beforeend', note);
    },

    simpanReturBarang: function() {
        // FIX (BUG KLIK DOBEL): sama seperti simpanReturUang() di atas & pola yang
        // sudah dipakai di js/apotek/transaksi.js dan pembelian.js.
        if (this._isSaving) return;
        this._isSaving = true;
        var btnSimpan = document.querySelector('#modal-container button[onclick="AppApotekRetur.simpanReturBarang()"]');
        if (btnSimpan) { btnSimpan.disabled = true; btnSimpan.classList.add('opacity-50', 'cursor-not-allowed'); }
        var self = this;
        var _resetGuard = function() {
            self._isSaving = false;
            if (btnSimpan) { btnSimpan.disabled = false; btnSimpan.classList.remove('opacity-50', 'cursor-not-allowed'); }
        };

        var tgl      = document.getElementById('retur-tgl')?.value;
        var supplier = document.getElementById('retur-supplier')?.value.trim();
        var alasan   = document.getElementById('retur-alasan')?.value;
        var barangKeluar = this._kumpulkanBarang('keluar');
        var barangMasuk  = this._kumpulkanBarang('masuk');

        if (!tgl || !supplier) {
            _resetGuard();
            return Utils.toast('Lengkapi tanggal & supplier!', 'error');
        }
        if (barangKeluar.length === 0) {
            _resetGuard();
            return Utils.toast('Tambahkan minimal 1 barang yang diretur (keluar)!', 'error');
        }
        if (barangMasuk.length === 0) {
            _resetGuard();
            return Utils.toast('Tambahkan minimal 1 barang pengganti (masuk)!', 'error');
        }
        var invalid = barangKeluar.concat(barangMasuk).some(function(i) { return !i.obatId || i.qty <= 0; });
        if (invalid) {
            _resetGuard();
            return Utils.toast('Pastikan setiap baris sudah memilih obat & qty minimal 1!', 'error');
        }

        // Validasi stok tersedia utk tiap barang keluar (per obat, digabung dulu kalau ada duplikat baris)
        var stokTerpakai = {};
        var stokKurang = null;
        barangKeluar.forEach(function(i) {
            stokTerpakai[i.obatId] = (stokTerpakai[i.obatId] || 0) + i.qty;
        });
        Object.keys(stokTerpakai).forEach(function(obatId) {
            var obat = self.masterObat.find(function(o) { return o.id === obatId; });
            if (obat && stokTerpakai[obatId] > (obat.stok || 0)) {
                stokKurang = obat.namaObat + ' (butuh ' + stokTerpakai[obatId] + ', stok ' + (obat.stok || 0) + ')';
            }
        });
        if (stokKurang) {
            _resetGuard();
            return Utils.toast('Qty melebihi stok tersedia: ' + stokKurang, 'error');
        }

        var totalNilaiKeluar = barangKeluar.reduce(function(s, i) { return s + i.subtotal; }, 0);
        var totalNilaiMasuk  = barangMasuk.reduce(function(s, i) { return s + i.subtotal; }, 0);
        var selisih = totalNilaiMasuk - totalNilaiKeluar;

        var caraSelisih = null, fakturHutangId = null, statusSelisih = null;
        if (selisih !== 0) {
            caraSelisih = document.getElementById('rb-cara-selisih')?.value || null;
            if (!caraSelisih) { _resetGuard(); return Utils.toast('Pilih cara penyelesaian selisih!', 'error'); }
            if (caraSelisih === 'potong_hutang') {
                fakturHutangId = document.getElementById('rb-faktur-hutang')?.value || null;
                if (!fakturHutangId) { _resetGuard(); return Utils.toast('Pilih faktur hutang yang akan disesuaikan!', 'error'); }
            }
            statusSelisih = 'belum_diselesaikan';
        }

        var obj = {
            jenisRetur: 'barang',
            tanggal: tgl,
            supplier: supplier,
            alasan: alasan,
            barangKeluar: barangKeluar,
            barangMasuk: barangMasuk,
            totalNilaiKeluar: totalNilaiKeluar,
            totalNilaiMasuk: totalNilaiMasuk,
            selisih: selisih,
            caraSelisih: caraSelisih,
            fakturHutangId: fakturHutangId,
            statusSelisih: statusSelisih,
            status: 'menunggu_konfirmasi',
            inputOleh: window.currentUserName || 'Kasir',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        db.collection('retur').add(obj).then(function() {
            Utils.toast('Pengajuan retur tukar barang berhasil dibuat! Menunggu konfirmasi admin.', 'success');
            _resetGuard();
            Utils.closeModal();
            AppApotekRetur.init();
        }).catch(function(err) {
            Utils.toast('Gagal: ' + err.message, 'error');
            _resetGuard();
        });
        // CATATAN: stok & penyesuaian keuangan (hutang/kas) baru diproses saat admin konfirmasi.
    },

    // ===== KONFIRMASI (Admin) — dispatcher =====
    konfirmasi: function(id) {
        var retur = this.data.find(function(r) { return r.id === id; });
        if (!retur) return;
        if (retur.jenisRetur === 'barang') {
            this.konfirmasiBarang(id);
        } else {
            this.konfirmasiUang(id);
        }
    },

    // ===== KONFIRMASI SKEMA UANG/KREDIT (Admin) =====
    konfirmasiUang: function(id) {
        if (!confirm('Konfirmasi retur ini? Stok obat akan langsung dikurangi.')) return;

        var retur = this.data.find(function(r) { return r.id === id; });
        if (!retur) return;

        var returRef = db.collection('retur').doc(id);
        var obatRef  = db.collection('obat').doc(retur.obatId);
        var qty      = retur.qty || 0;

        // FIX (KEAMANAN STOK): increment negatif via batch tidak membaca & memvalidasi
        // stok terkini, jadi stok bisa jadi minus kalau ada retur/transaksi lain yang
        // berjalan bersamaan. Ganti ke runTransaction(): baca stok & status retur
        // terbaru dulu, validasi, baru tulis -- atomik dan tahan race condition.
        db.runTransaction(function(tx) {
            return Promise.all([tx.get(returRef), tx.get(obatRef)]).then(function(res) {
                var returSnap = res[0];
                var obatSnap  = res[1];

                if (!returSnap.exists) throw new Error('Data retur tidak ditemukan.');
                if (returSnap.data().status !== 'menunggu_konfirmasi') {
                    throw new Error('Retur ini sudah diproses sebelumnya.');
                }
                if (!obatSnap.exists) throw new Error('Obat terkait tidak ditemukan.');

                var stokSaatIni = obatSnap.data().stok || 0;
                if (stokSaatIni < qty) {
                    throw new Error('Stok obat tidak cukup untuk retur ini. Tersisa ' +
                        stokSaatIni + ', dibutuhkan ' + qty + '.');
                }

                tx.update(returRef, {
                    status: 'dikonfirmasi',
                    dikonfirmasiOleh: window.currentUserName || 'Admin',
                    dikonfirmasiAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                tx.update(obatRef, {
                    stok: stokSaatIni - qty,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
        }).then(function() {
            Utils.toast('Retur dikonfirmasi. Stok telah dikurangi ' + qty + ' ' + (retur.satuan || '') + '.', 'success');
            AuditLog.catat({
                aksi: 'approve', modul: 'Retur Obat', koleksi: 'retur', targetId: id,
                deskripsi: 'Konfirmasi retur: ' + retur.namaObat + ' (' + retur.supplier + ')',
                nominal: retur.totalNilai
            });
            AppApotekRetur.init();
        }).catch(function(err) {
            Utils.toast('Gagal konfirmasi: ' + err.message, 'error');
        });
    },

    // ===== KONFIRMASI SKEMA TUKAR BARANG (Admin) =====
    // Transaksi ini: (1) menyesuaikan stok utk semua barang keluar & masuk sekaligus (net delta
    // per obat, jadi aman walau obat yg sama muncul di kedua sisi), (2) kalau ada selisih nilai,
    // menyelesaikannya sesuai pilihan yang diajukan kasir: tunai (kas keluar), hutang baru, atau
    // penyesuaian faktur hutang existing.
    konfirmasiBarang: function(id) {
        if (!confirm('Konfirmasi retur tukar barang ini? Stok obat akan langsung disesuaikan & penyelesaian selisih (jika ada) akan diproses.')) return;

        var retur = this.data.find(function(r) { return r.id === id; });
        if (!retur) return;

        var returRef = db.collection('retur').doc(id);

        // Hitung net delta stok per obatId: keluar mengurangi, masuk menambah.
        var deltaMap = {};
        (retur.barangKeluar || []).forEach(function(i) { deltaMap[i.obatId] = (deltaMap[i.obatId] || 0) - i.qty; });
        (retur.barangMasuk  || []).forEach(function(i) { deltaMap[i.obatId] = (deltaMap[i.obatId] || 0) + i.qty; });
        var obatIds = Object.keys(deltaMap);
        var obatRefs = obatIds.map(function(oid) { return db.collection('obat').doc(oid); });

        var selisih = retur.selisih || 0;
        var perluFaktur = (selisih !== 0 && retur.caraSelisih === 'potong_hutang' && retur.fakturHutangId);
        var fakturRef = perluFaktur ? db.collection('pembelian').doc(retur.fakturHutangId) : null;

        // Ref baru disiapkan di luar transaction (Firestore transaction butuh semua read selesai
        // sebelum write, tapi doc ref baru boleh dibuat kapan saja).
        var kasKeluarRef = (selisih > 0 && retur.caraSelisih === 'tunai') ? db.collection('kasKeluar').doc() : null;
        var hutangBaruRef = (selisih > 0 && retur.caraSelisih === 'hutang_baru') ? db.collection('pembelian').doc() : null;
        // BARU: selisih<0 = apotek DAPAT kembalian/uang dari supplier -> langsung tercatat
        // sbg pemasukan (kasMasuk) begitu retur dikonfirmasi, tanpa alur approval terpisah
        // (berbeda dgn kasKeluar) karena yg mengonfirmasi retur sudah admin/keuangan sendiri.
        var kasMasukRef = (selisih < 0 && retur.caraSelisih === 'tunai') ? db.collection('kasMasuk').doc() : null;

        db.runTransaction(function(tx) {
            var reads = [tx.get(returRef)].concat(obatRefs.map(function(r) { return tx.get(r); }));
            if (fakturRef) reads.push(tx.get(fakturRef));

            return Promise.all(reads).then(function(res) {
                var returSnap = res[0];
                var obatSnaps = res.slice(1, 1 + obatRefs.length);
                var fakturSnap = fakturRef ? res[1 + obatRefs.length] : null;

                if (!returSnap.exists) throw new Error('Data retur tidak ditemukan.');
                if (returSnap.data().status !== 'menunggu_konfirmasi') {
                    throw new Error('Retur ini sudah diproses sebelumnya.');
                }

                // Validasi & tulis stok per obat
                obatSnaps.forEach(function(snap, idx) {
                    var oid = obatIds[idx];
                    if (!snap.exists) throw new Error('Salah satu obat terkait tidak ditemukan.');
                    var stokSaatIni = snap.data().stok || 0;
                    var stokBaru = stokSaatIni + deltaMap[oid];
                    if (stokBaru < 0) {
                        throw new Error('Stok "' + (snap.data().namaObat || oid) + '" tidak cukup untuk retur ini (tersisa ' + stokSaatIni + ').');
                    }
                    tx.update(obatRefs[idx], {
                        stok: stokBaru,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });

                var returUpdate = {
                    status: 'dikonfirmasi',
                    dikonfirmasiOleh: window.currentUserName || 'Admin',
                    dikonfirmasiAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                // Penyelesaian selisih nilai (jika ada)
                if (selisih !== 0 && retur.caraSelisih) {
                    if (retur.caraSelisih === 'tunai' && kasKeluarRef) {
                        // Selisih positif → apotek bayar tambahan ke supplier, diajukan sbg kas keluar
                        // & mengikuti alur approval yg sama seperti laporan/pengeluaran.js.
                        tx.set(kasKeluarRef, {
                            tanggal: Utils.today(), // FIX: pakai tanggal lokal, bukan UTC
                            kategori: 'Retur Tukar Barang',
                            keterangan: 'Selisih bayar retur tukar barang ke ' + retur.supplier,
                            jumlah: selisih,
                            status: 'pending',
                            referenceId: id,
                            inputOleh: window.currentUserName || 'Admin',
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        returUpdate.statusSelisih = 'belum_diselesaikan';
                        returUpdate.kasKeluarId = kasKeluarRef.id;

                    } else if (retur.caraSelisih === 'hutang_baru' && hutangBaruRef) {
                        // Selisih positif → dicatat sbg faktur hutang baru ke supplier (tempo 30 hari),
                        // otomatis muncul di Hutang Usaha karena statusPelunasan != 'lunas'.
                        var jatuhTempo = new Date();
                        jatuhTempo.setDate(jatuhTempo.getDate() + 30);
                        tx.set(hutangBaruRef, {
                            noFaktur: 'RETUR-' + id.substring(0, 6).toUpperCase(),
                            tanggal: Utils.today(), // FIX: pakai tanggal lokal, bukan UTC
                            supplier: retur.supplier,
                            metodePembayaran: 'kredit',
                            jatuhTempo: Utils.dateStr(jatuhTempo), // FIX: pakai tanggal lokal, bukan UTC

                            statusPelunasan: 'belum_lunas',
                            items: retur.barangMasuk.map(function(i) {
                                return { obatId: i.obatId, namaObat: i.namaObat, kodeObat: i.kodeObat, qty: i.qty, hargaBeli: i.harga };
                            }),
                            totalHarga: selisih,
                            sumber: 'retur_tukar_barang',
                            returId: id,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        returUpdate.statusSelisih = 'selesai';
                        returUpdate.fakturHutangBaruId = hutangBaruRef.id;

                    } else if (retur.caraSelisih === 'potong_hutang' && fakturRef) {
                        if (!fakturSnap || !fakturSnap.exists) {
                            throw new Error('Faktur hutang yang dipilih tidak ditemukan.');
                        }
                        var totalLama = fakturSnap.data().totalHarga || 0;
                        var totalBaru = totalLama + selisih; // selisih>0 nambah hutang, <0 mengurangi
                        if (totalBaru < 0) {
                            throw new Error('Selisih lebih besar dari sisa hutang faktur yang dipilih. Pilih faktur lain atau cara penyelesaian lain.');
                        }
                        tx.update(fakturRef, {
                            totalHarga: totalBaru,
                            statusPelunasan: totalBaru === 0 ? 'lunas' : (fakturSnap.data().statusPelunasan || 'belum_lunas'),
                            riwayatPenyesuaian: firebase.firestore.FieldValue.arrayUnion({
                                sumber: 'retur_tukar_barang',
                                returId: id,
                                selisih: selisih,
                                tanggal: Utils.today() // FIX: pakai tanggal lokal, bukan UTC
                            })
                        });
                        returUpdate.statusSelisih = 'selesai';

                    } else if (retur.caraSelisih === 'tunai' && kasMasukRef && selisih < 0) {
                        // Selisih negatif + terima tunai sekarang -> langsung masuk sbg pemasukan lain,
                        // otomatis ikut dihitung di Laporan Keuangan (Arus Kas & Laba/Rugi).
                        tx.set(kasMasukRef, {
                            tanggal: Utils.today(), // pakai tanggal lokal, bukan UTC
                            kategori: 'Retur Tukar Barang',
                            keterangan: 'Selisih diterima dari ' + retur.supplier + ' (retur tukar barang)',
                            jumlah: Math.abs(selisih),
                            status: 'approved',
                            referenceId: id,
                            inputOleh: window.currentUserName || 'Admin',
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        returUpdate.statusSelisih = 'selesai';
                        returUpdate.kasMasukId = kasMasukRef.id;

                    } else if (retur.caraSelisih === 'catat') {
                        // Selisih negatif tanpa penyesuaian otomatis (mis. supplier akan kirim tunai
                        // belakangan). Tetap tercatat di dokumen retur agar bisa ditindaklanjuti manual.
                        returUpdate.statusSelisih = 'belum_diselesaikan';
                    }
                }

                tx.update(returRef, returUpdate);
            });
        }).then(function() {
            var msg = 'Retur tukar barang dikonfirmasi. Stok telah disesuaikan.';
            if (selisih > 0 && retur.caraSelisih === 'tunai') msg += ' Pengajuan kas keluar sebesar ' + Utils.formatRupiah(selisih) + ' menunggu approval.';
            if (selisih > 0 && retur.caraSelisih === 'hutang_baru') msg += ' Hutang baru ke supplier sebesar ' + Utils.formatRupiah(selisih) + ' telah dicatat.';
            if (selisih < 0 && retur.caraSelisih === 'tunai') msg += ' Kas masuk sebesar ' + Utils.formatRupiah(Math.abs(selisih)) + ' telah tercatat.';
            if (retur.caraSelisih === 'potong_hutang') msg += ' Faktur hutang terkait telah disesuaikan.';
            Utils.toast(msg, 'success');
            AuditLog.catat({
                aksi: 'approve', modul: 'Retur Obat (Tukar Barang)', koleksi: 'retur', targetId: id,
                deskripsi: 'Konfirmasi retur tukar barang: ' + (retur.barangKeluar || []).length + ' item keluar, ' +
                    (retur.barangMasuk || []).length + ' item masuk (' + retur.supplier + ')',
                nominal: retur.totalNilaiKeluar
            });
            AppApotekRetur.init();
        }).catch(function(err) {
            Utils.toast('Gagal konfirmasi: ' + err.message, 'error');
        });
    },

    // ===== TOLAK (Admin) =====
    tolak: function(id) {
        var catatan = prompt('Masukkan alasan penolakan:');
        if (catatan === null) return; // user batal
        db.collection('retur').doc(id).update({
            status: 'ditolak',
            catatanAdmin: catatan || '-',
            ditolakOleh: window.currentUserName || 'Admin',
            ditolakAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function() {
            Utils.toast('Pengajuan retur ditolak.', 'success');
            AppApotekRetur.init();
        }).catch(function(err) {
            Utils.toast('Gagal: ' + err.message, 'error');
        });
    },

    // ===== HELPER =====
    _badgeStatus: function(status) {
        var map = {
            menunggu_konfirmasi: ['bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400', 'Menunggu'],
            dikonfirmasi:        ['bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400', 'Dikonfirmasi'],
            ditolak:             ['bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400', 'Ditolak'],
            selesai:             ['bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300', 'Selesai']
        };
        var s = map[status] || ['bg-slate-100 text-slate-500', status || '-'];
        return '<span class="text-xs ' + s[0] + ' font-semibold px-2 py-1 rounded-full">' + s[1] + '</span>';
    }
};