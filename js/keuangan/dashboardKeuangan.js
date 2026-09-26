/**
 * js/keuangan/dashboardKeuangan.js
 * Dashboard Keuangan Terpadu — Ringkasan Kas, Pendapatan, Beban, Aset, Hutang & Piutang.
 * Menggabungkan data dari beberapa modul (transaksi, kasKeluar, pembelian, payrollHistory,
 * piutangKaryawan) menjadi satu tampilan ringkas untuk pemilik/keuangan.
 */

window.AppKeuanganDashboardKeuangan = {

    currentMonth: new Date().toISOString().slice(0, 7),
    raw: null,      // hasil query mentah
    activeTab: 'ringkasan',

    // Kategori kode akun aset (dipakai modul Akuntansi & form Pengeluaran)
    ASSET_CODES: {
        '1-1500': 'Perlengkapan & ATK',
        '1-2100': 'Peralatan Medis',
        '1-2200': 'Peralatan Apotek & Furniture'
    },

    render: function() {
        var html = '<div class="page-enter max-w-7xl space-y-5">';

        html += '  <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">';
        html += '    <div>';
        html += '      <h2 class="text-2xl font-black text-slate-800 dark:text-white">Dashboard Keuangan</h2>';
        html += '      <p class="text-sm text-slate-500 dark:text-slate-400">Ringkasan lengkap kas, pendapatan, beban, aset, hutang & piutang</p>';
        html += '    </div>';
        html += '    <div class="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1 self-start">';
        html += '      <input type="month" id="dk-filter-bulan" value="' + this.currentMonth + '" class="px-3 py-1.5 bg-transparent dark:text-white text-sm rounded-md outline-none">';
        html += '      <button onclick="AppKeuanganDashboardKeuangan.init()" class="bg-primary-600 hover:bg-primary-700 text-white text-sm px-4 py-1.5 rounded-md font-medium flex items-center gap-1.5"><i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>Tampilkan</button>';
        html += '    </div>';
        html += '  </div>';

        html += '  <div class="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 overflow-x-auto" id="dk-tabs">';
        var tabs = [
            { id: 'ringkasan', label: 'Ringkasan', icon: 'layout-dashboard' },
            { id: 'tren', label: 'Tren Kas', icon: 'line-chart' },
            { id: 'beban', label: 'Rincian Beban', icon: 'receipt' },
            { id: 'aset', label: 'Aset', icon: 'package' },
            { id: 'hutangPiutang', label: 'Hutang & Piutang', icon: 'scale' }
        ];
        tabs.forEach(function(t) {
            html += '<button onclick="AppKeuanganDashboardKeuangan.switchTab(\'' + t.id + '\')" id="dk-tab-' + t.id + '" class="dk-tab-btn flex-1 min-w-max py-2 px-4 text-sm rounded-md text-slate-500 font-medium hover:text-primary-600 flex items-center justify-center gap-1.5"><i data-lucide="' + t.icon + '" class="w-3.5 h-3.5"></i>' + t.label + '</button>';
        });
        html += '  </div>';

        html += '  <div id="dk-content"><div class="flex justify-center py-20"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        var self = this;
        var role = window.currentRole || 'apotek';
        if (role !== 'keuangan') {
            var c = document.getElementById('dk-content') || document.getElementById('app-content');
            if (c) c.innerHTML = '<div class="p-8 text-center text-red-500 font-bold bg-white dark:bg-slate-800 rounded-xl border">Akses Ditolak: Halaman Dashboard Keuangan khusus akun Keuangan.</div>';
            return;
        }

        var monthInput = document.getElementById('dk-filter-bulan');
        if (monthInput) this.currentMonth = monthInput.value;
        var bulan = this.currentMonth;
        var startDate = bulan + '-01';
        var parts = bulan.split('-');
        var y = parseInt(parts[0], 10);
        var m = parseInt(parts[1], 10);
        var lastDay = new Date(y, m, 0).getDate();
        var endDate = parts[0] + '-' + parts[1] + '-' + String(lastDay).padStart(2, '0');

        var container = document.getElementById('dk-content');
        if (container) container.innerHTML = '<div class="flex justify-center py-20"><div class="spinner"></div></div>';

        var pTrx = db.collection('transaksi').where('tanggal', '>=', startDate).where('tanggal', '<=', endDate).get();
        var pKasKeluarBulan = db.collection('kasKeluar').where('status', '==', 'approved').where('tanggal', '>=', startDate).where('tanggal', '<=', endDate).get();
        var pKasKeluarSemua = db.collection('kasKeluar').where('status', '==', 'approved').orderBy('tanggal', 'desc').limit(500).get();
        var pKasKeluarPending = db.collection('kasKeluar').where('status', '==', 'pending').get();
        var pBeliStok = db.collection('pembelian').where('tanggal', '>=', startDate).where('tanggal', '<=', endDate).get();
        var pBeliSemua = db.collection('pembelian').get();
        var pGaji = db.collection('payrollHistory').where('bulan', '==', bulan).get();
        var pPiutang = db.collection('piutangKaryawan').get();
        // INTEGRASI: pendapatan non-operasional (modul Pendapatan Lain - sewa, bunga bank, komisi, dll)
        var pPendapatanLain = db.collection('pendapatanLain').where('tanggal', '>=', startDate).where('tanggal', '<=', endDate).get();

        Promise.all([pTrx, pKasKeluarBulan, pKasKeluarSemua, pKasKeluarPending, pBeliStok, pBeliSemua, pGaji, pPiutang, pPendapatanLain])
            .then(function(results) {
                self.raw = {
                    trx: self._toArr(results[0]),
                    kasKeluarBulan: self._toArr(results[1]),
                    kasKeluarSemua: self._toArr(results[2]),
                    kasKeluarPending: self._toArr(results[3]),
                    beliBulan: self._toArr(results[4]),
                    beliSemua: self._toArr(results[5]),
                    gaji: self._toArr(results[6]),
                    piutang: self._toArr(results[7]),
                    pendapatanLain: self._toArr(results[8]),
                    startDate: startDate,
                    endDate: endDate,
                    bulan: bulan
                };
                self.compute();
                self.switchTab(self.activeTab);
            }).catch(function(err) {
                var c = document.getElementById('dk-content');
                if (c) c.innerHTML = '<div class="p-6 text-center text-red-500 bg-white dark:bg-slate-800 rounded-xl border">Gagal memuat data: ' + Utils.escapeHtml(err.message) + '</div>';
            });
    },

    _toArr: function(snap) {
        var arr = [];
        snap.forEach(function(doc) { var d = doc.data(); d.id = doc.id; arr.push(d); });
        return arr;
    },

    // Hitung seluruh angka ringkasan dari data mentah
    compute: function() {
        var r = this.raw;
        var self = this;

        // FIX (CACAT LOGIKA AKUNTANSI): sebelumnya "Total Beban" di dashboard ini memakai nilai
        // PEMBELIAN STOK OBAT mentah (seluruh nominal beli bulan ini), padahal membeli stok itu
        // menukar Kas dengan Persediaan (ASET) -- bukan beban. Beban baru terjadi saat obat itu
        // TERJUAL, sebesar HARGA POKOK-nya (HPP/COGS), persis seperti yang sudah benar dihitung
        // di js/keuangan/laporanKeuangan.js dan js/keuangan/akuntansi.js. Sekarang HPP bulan ini
        // dihitung dari item yang benar-benar terjual (sama seperti Laporan Keuangan resmi),
        // supaya "Laba Rugi" di sini tidak lagi naik-turun mengikuti kapan/berapa banyak apotek
        // belanja stok, melainkan mengikuti margin penjualan yang sesungguhnya.
        var pendapatan = 0, cashIn = 0, transferIn = 0, qrisIn = 0, hppBulan = 0;
        r.trx.forEach(function(t) {
            var total = t.totalAkhir || 0;
            pendapatan += total;
            var m = t.metodeBayar || 'cash';
            if (m === 'cash') cashIn += total;
            else if (m === 'transfer') transferIn += total;
            else if (m === 'qris') qrisIn += total;

            var hppTrx = t.items ? t.items.reduce(function(s, i) { return s + (i.jumlah * (i.hargaBeli || 0)); }, 0) : 0;
            hppBulan += hppTrx;
        });

        // INTEGRASI: pendapatan non-operasional (modul Pendapatan Lain - sewa, bunga bank, komisi, dll)
        // ikut ditambahkan ke Pendapatan Bulan Ini & Laba Bersih agar nilai keuangan keseluruhan benar.
        var pendapatanLainBulan = 0;
        (r.pendapatanLain || []).forEach(function(p) { pendapatanLainBulan += p.jumlah || 0; });
        pendapatan += pendapatanLainBulan;

        // FIX (CACAT LOGIKA KEUANGAN - DOBEL HITUNG): dulu SEMUA dokumen kasKeluar (selain akun
        // aset) langsung dijumlah rata sebagai "Beban Operasional", termasuk:
        //  - Pelunasan Hutang Usaha -> perpindahan Kas->Hutang (neraca), biayanya sudah termasuk di
        //    HPP saat obat terjual. Kalau dijumlah lagi di sini, terpotong DUA KALI.
        //  - Pembayaran Gaji (kategori 'gaji') -> SUDAH dihitung terpisah lewat `gajiBulan` (dari
        //    payrollHistory, lihat bawah). Kalau ikut masuk sini juga, gaji terpotong DUA KALI.
        //  - THR -> beban riil (tidak dobel hitung), tapi dipisah ke variabel sendiri supaya jelas
        //    sumbernya, tidak tersamar generik jadi "Beban Operasional".
        // Sama seperti fix di js/keuangan/laporanKeuangan.js: pakai field `tipeArusKas` (ditulis
        // hutang.js & payroll.js), dengan fallback ke `kategori` utk data lama yg belum punya field.
        var bebanOperasional = 0;
        var bayarHutangBulan = 0, thrBulan = 0;
        var bebanPerKategori = {};
        var asetDibeliBulanIni = 0;
        r.kasKeluarBulan.forEach(function(k) {
            var jml = k.jumlah || 0;
            var isAset = self.ASSET_CODES.hasOwnProperty(k.akunDebit);
            var tipe = k.tipeArusKas || (
                k.kategori === 'Hutang Usaha' ? 'pelunasan_hutang' :
                k.kategori === 'gaji' ? 'gaji_payroll' :
                k.kategori === 'Tunjangan Hari Raya (THR)' ? 'thr_payroll' : 'operasional'
            );

            if (isAset) {
                asetDibeliBulanIni += jml;
                return;
            }
            if (tipe === 'pelunasan_hutang') {
                bayarHutangBulan += jml; // arus kas saja, BUKAN beban -> tidak masuk bebanOperasional
                return;
            }
            if (tipe === 'gaji_payroll') {
                return; // sudah terhitung via gajiBulan (payrollHistory) -- sengaja diabaikan di sini
            }
            if (tipe === 'thr_payroll') {
                thrBulan += jml; // beban riil, dipisah dari "Beban Operasional"
                return;
            }

            bebanOperasional += jml;
            var kat = k.kategori || 'Operasional';
            bebanPerKategori[kat] = (bebanPerKategori[kat] || 0) + jml;
        });

        // Nilai pembelian stok obat bulan ini (KAS KELUAR / arus kas, BUKAN beban P&L). Tetap
        // dihitung & ditampilkan terpisah karena tetap berguna untuk memantau arus kas & hutang,
        // tapi TIDAK BOLEH dijumlahkan ke "Total Beban" yang menentukan Laba Rugi.
        var pembelianStok = 0;
        r.beliBulan.forEach(function(b) { pembelianStok += (b.totalHarga || b.nominal || 0); });

        var gajiBulan = 0;
        r.gaji.forEach(function(g) { gajiBulan += (g.totalGaji || g.totalTerima || g.gajiBersih || g.total || 0); });

        // FIX: pakai hppBulan (modal obat yang TERJUAL), bukan pembelianStok (nilai BELI), sebagai
        // komponen beban dalam perhitungan Laba Rugi. Beban THR ditambahkan eksplisit (dulu
        // tersembunyi & tercampur di dalam bebanOperasional). Pelunasan hutang TIDAK ditambahkan
        // di sini karena bukan beban.
        var totalBebanBulan = bebanOperasional + hppBulan + gajiBulan + thrBulan;
        var labaRugi = pendapatan - totalBebanBulan;

        var kasKeluarPendingTotal = 0;
        r.kasKeluarPending.forEach(function(k) { kasKeluarPendingTotal += (k.jumlah || 0); });

        // Hutang usaha (dari pembelian, belum lunas)
        var hutangBelumLunas = 0, hutangMenunggu = 0, hutangCount = 0;
        r.beliSemua.forEach(function(b) {
            var val = b.totalHarga || b.nominal || 0;
            if (b.statusPelunasan === 'menunggu_approve') hutangMenunggu += val;
            else if (b.statusPelunasan !== 'lunas' && b.statusPelunasan !== 'ditolak') { hutangBelumLunas += val; hutangCount++; }
        });

        // Piutang karyawan
        var piutangBelumLunas = 0, piutangCount = 0;
        r.piutang.forEach(function(p) {
            if (p.status !== 'lunas') { piutangBelumLunas += (p.jumlah || 0); piutangCount++; }
        });

        // Aset kumulatif (semua waktu, dari kasKeluar approved dgn akun aset)
        var asetPerKategori = {};
        var asetItems = [];
        var asetTotal = 0;
        r.kasKeluarSemua.forEach(function(k) {
            if (self.ASSET_CODES.hasOwnProperty(k.akunDebit)) {
                var kat = self.ASSET_CODES[k.akunDebit];
                asetPerKategori[kat] = (asetPerKategori[kat] || 0) + (k.jumlah || 0);
                asetTotal += (k.jumlah || 0);
                asetItems.push(k);
            }
        });
        // FIX (LABEL MENYESATKAN): angka ini adalah AKUMULASI SELURUH PEMBELIAN sepanjang waktu,
        // TANPA dikurangi obat yang sudah terjual -- jadi akan terus membesar selamanya dan TIDAK
        // pernah mencerminkan sisa stok yang sebenarnya (bukan "persediaan", tapi "total belanja
        // kotor sepanjang waktu"). Menghitung persediaan riil dari selisih beli-vs-terjual di sini
        // butuh scan SELURUH histori transaksi (mahal & rawan meleset kalau ada retur/opname manual).
        // Sumber yang benar untuk nilai stok riil adalah modul Stock Opname (js/apotek/stockOpname.js).
        // Variabel & label di bawah diubah agar tidak lagi diklaim sebagai "estimasi persediaan".
        var akumulasiBelanjaStokKotor = 0;
        r.beliSemua.forEach(function(b) {
            if (b.statusPelunasan !== 'ditolak') akumulasiBelanjaStokKotor += (b.totalHarga || b.nominal || 0);
        });

        // Kas masuk vs keluar harian (untuk tren)
        var dailyMap = {};
        var d0 = new Date(r.startDate);
        var d1 = new Date(r.endDate);
        var cursor = new Date(d0);
        while (cursor <= d1) {
            var key = Utils.dateStr(cursor);
            dailyMap[key] = { label: String(cursor.getDate()).padStart(2, '0') + '/' + String(cursor.getMonth() + 1).padStart(2, '0'), Pendapatan: 0, Beban: 0 };
            cursor.setDate(cursor.getDate() + 1);
        }
        r.trx.forEach(function(t) {
            if (dailyMap[t.tanggal]) dailyMap[t.tanggal].Pendapatan += (t.totalAkhir || 0);
        });
        (r.pendapatanLain || []).forEach(function(p) {
            if (dailyMap[p.tanggal]) dailyMap[p.tanggal].Pendapatan += (p.jumlah || 0);
        });
        r.kasKeluarBulan.forEach(function(k) {
            if (dailyMap[k.tanggal]) dailyMap[k.tanggal].Beban += (k.jumlah || 0);
        });
        var trend = Object.keys(dailyMap).sort().map(function(k) { return dailyMap[k]; });

        this.summary = {
            pendapatan: pendapatan, pendapatanLainBulan: pendapatanLainBulan, cashIn: cashIn, transferIn: transferIn, qrisIn: qrisIn,
            bebanOperasional: bebanOperasional, hppBulan: hppBulan, pembelianStok: pembelianStok, gajiBulan: gajiBulan,
            bayarHutangBulan: bayarHutangBulan, thrBulan: thrBulan,
            totalBebanBulan: totalBebanBulan, labaRugi: labaRugi,
            asetDibeliBulanIni: asetDibeliBulanIni, kasKeluarPendingTotal: kasKeluarPendingTotal,
            hutangBelumLunas: hutangBelumLunas, hutangMenunggu: hutangMenunggu, hutangCount: hutangCount,
            piutangBelumLunas: piutangBelumLunas, piutangCount: piutangCount,
            bebanPerKategori: bebanPerKategori,
            asetPerKategori: asetPerKategori, asetTotal: asetTotal, asetItems: asetItems,
            akumulasiBelanjaStokKotor: akumulasiBelanjaStokKotor,
            trend: trend
        };
    },

    switchTab: function(id) {
        this.activeTab = id;
        document.querySelectorAll('.dk-tab-btn').forEach(function(b) {
            b.classList.remove('bg-white', 'dark:bg-slate-900', 'text-primary-600', 'shadow-sm', 'font-semibold');
        });
        var activeBtn = document.getElementById('dk-tab-' + id);
        if (activeBtn) activeBtn.classList.add('bg-white', 'dark:bg-slate-900', 'text-primary-600', 'shadow-sm', 'font-semibold');

        if (!this.summary) return;

        var renderers = {
            ringkasan: this.renderRingkasan,
            tren: this.renderTren,
            beban: this.renderBeban,
            aset: this.renderAset,
            hutangPiutang: this.renderHutangPiutang
        };
        var fn = renderers[id] || this.renderRingkasan;
        var container = document.getElementById('dk-content');
        if (container) container.innerHTML = fn.call(this);
        if (window.lucide) lucide.createIcons();
        if (id === 'tren') this.renderTrenChart();
    },

    _kpiCard: function(icon, label, value, colorClass, sub) {
        return '<div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-4 flex items-start gap-3 shadow-sm">' +
            '<div class="w-11 h-11 rounded-xl ' + colorClass + ' flex items-center justify-center flex-shrink-0"><i data-lucide="' + icon + '" class="w-5 h-5"></i></div>' +
            '<div class="min-w-0"><p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">' + label + '</p>' +
            '<h3 class="text-lg font-black text-slate-800 dark:text-white truncate">' + value + '</h3>' +
            (sub ? '<p class="text-[11px] text-slate-400 mt-0.5">' + sub + '</p>' : '') +
            '</div></div>';
    },

    renderRingkasan: function() {
        var s = this.summary;
        var bulanLabel = new Date(this.raw.startDate).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        var html = '<div class="space-y-5">';

        html += '<p class="text-xs text-slate-400 -mt-1">Periode: <span class="font-semibold text-slate-600 dark:text-slate-300">' + bulanLabel + '</span></p>';

        html += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">';
        html += this._kpiCard('trending-up', 'Pendapatan Bulan Ini', Utils.formatRupiah(s.pendapatan), 'bg-emerald-500/10 text-emerald-600', 'Cash ' + Utils.formatRupiah(s.cashIn) + ' • Non-tunai ' + Utils.formatRupiah(s.transferIn + s.qrisIn) + (s.pendapatanLainBulan > 0 ? ' • Pendapatan Lain ' + Utils.formatRupiah(s.pendapatanLainBulan) : ''));
        html += this._kpiCard('trending-down', 'Total Beban Bulan Ini', Utils.formatRupiah(s.totalBebanBulan), 'bg-rose-500/10 text-rose-600', 'Ops ' + Utils.formatRupiah(s.bebanOperasional) + ' • HPP Obat Terjual ' + Utils.formatRupiah(s.hppBulan) + ' • Gaji ' + Utils.formatRupiah(s.gajiBulan) + (s.thrBulan > 0 ? ' • THR ' + Utils.formatRupiah(s.thrBulan) : ''));
        html += this._kpiCard('scale', s.labaRugi >= 0 ? 'Laba Bersih Estimasi' : 'Rugi Bersih Estimasi', Utils.formatRupiah(Math.abs(s.labaRugi)), s.labaRugi >= 0 ? 'bg-primary-500/10 text-primary-600' : 'bg-amber-500/10 text-amber-600', 'Pendapatan − Total Beban (HPP obat terjual, bukan nilai beli)');
        html += this._kpiCard('clock', 'Pengeluaran Menunggu Approve', Utils.formatRupiah(s.kasKeluarPendingTotal), 'bg-amber-500/10 text-amber-600', 'Perlu ditinjau oleh Keuangan');
        html += '</div>';

        html += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">';
        html += this._kpiCard('landmark', 'Total Aset (Kumulatif)', Utils.formatRupiah(s.asetTotal), 'bg-indigo-500/10 text-indigo-600', 'Peralatan, ATK & Furniture');
        // FIX: dulu berlabel "Estimasi Persediaan Obat" padahal cuma akumulasi belanja kotor
        // (tidak dikurangi obat yang sudah terjual). Label & sumber angka diluruskan; untuk nilai
        // stok riil arahkan pengguna ke modul Stock Opname.
        html += this._kpiCard('boxes', 'Akumulasi Belanja Stok (Kotor)', Utils.formatRupiah(s.akumulasiBelanjaStokKotor), 'bg-sky-500/10 text-sky-600', 'Bukan sisa stok riil — cek Stock Opname untuk nilai persediaan aktual');
        html += this._kpiCard('file-text', 'Hutang Usaha Belum Lunas', Utils.formatRupiah(s.hutangBelumLunas), 'bg-red-500/10 text-red-600', s.hutangCount + ' faktur tertunda');
        html += this._kpiCard('wallet', 'Piutang Karyawan', Utils.formatRupiah(s.piutangBelumLunas), 'bg-purple-500/10 text-purple-600', s.piutangCount + ' catatan belum lunas');
        html += '</div>';

        html += '<div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-sm">';
        html += '<h3 class="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><i data-lucide="pie-chart" class="w-4 h-4 text-primary-600"></i>Komposisi Beban Bulan Ini</h3>';
        // FIX: dulu memakai s.pembelianStok (nilai BELI stok, bukan beban) sebagai salah satu slice
        // "beban" — sekarang pakai s.hppBulan (HPP/modal obat yang TERJUAL bulan ini). THR
        // ditambahkan sbg slice tersendiri (dulu tersembunyi & tercampur di s.bebanOperasional).
        var totalB = s.bebanOperasional + s.hppBulan + s.gajiBulan + s.thrBulan;
        var rows = [
            { label: 'Beban Operasional', val: s.bebanOperasional, color: 'bg-rose-500' },
            { label: 'HPP Obat Terjual (Modal)', val: s.hppBulan, color: 'bg-amber-500' },
            { label: 'Gaji Karyawan', val: s.gajiBulan, color: 'bg-sky-500' },
            { label: 'THR', val: s.thrBulan, color: 'bg-violet-500' }
        ];
        html += '<div class="space-y-3">';
        rows.forEach(function(row) {
            var pct = totalB > 0 ? Math.round((row.val / totalB) * 100) : 0;
            html += '<div>';
            html += '<div class="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1"><span>' + row.label + '</span><span>' + Utils.formatRupiah(row.val) + ' (' + pct + '%)</span></div>';
            html += '<div class="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"><div class="h-full ' + row.color + ' rounded-full" style="width:' + pct + '%"></div></div>';
            html += '</div>';
        });
        html += '</div>';
        // INFO TERPISAH (bukan bagian dari Total Beban / Laba Rugi): nilai kas yang keluar untuk
        // beli stok obat bulan ini. Ditampilkan agar tetap terlihat untuk pemantauan arus kas,
        // tapi diberi label jelas supaya tidak disalahartikan sebagai beban P&L.
        html += '<div class="mt-4 pt-3 border-t border-dashed border-slate-200 dark:border-slate-700 space-y-1.5">';
        html += '<div class="flex justify-between text-xs"><span class="text-slate-400">Kas keluar utk beli stok obat bulan ini (arus kas, bukan beban P&L)</span><span class="font-semibold text-slate-500 dark:text-slate-400">' + Utils.formatRupiah(s.pembelianStok) + '</span></div>';
        // FIX: baris baru -- dulu tersembunyi di dalam "Beban Operasional", sekarang tampil
        // eksplisit sebagai arus kas pelunasan hutang (BUKAN beban P&L, biaya obatnya sudah
        // termasuk di HPP Obat Terjual di atas).
        if (s.bayarHutangBulan > 0) {
            html += '<div class="flex justify-between text-xs"><span class="text-slate-400">Kas keluar utk pelunasan hutang usaha bulan ini (arus kas, bukan beban P&L)</span><span class="font-semibold text-slate-500 dark:text-slate-400">' + Utils.formatRupiah(s.bayarHutangBulan) + '</span></div>';
        }
        html += '</div>';
        html += '</div>';

        html += '</div>';
        return html;
    },

    renderTren: function() {
        var html = '<div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-sm">';
        html += '<h3 class="font-bold text-slate-800 dark:text-white mb-1">Tren Pendapatan vs Beban Harian</h3>';
        html += '<p class="text-xs text-slate-400 mb-4">Perbandingan arus kas masuk (penjualan) dan keluar (pengeluaran disetujui) per hari dalam periode terpilih</p>';
        html += '<div id="dk-trend-chart" style="height:340px" class="w-full"></div>';
        html += '</div>';
        return html;
    },

    renderTrenChart: function() {
        var container = document.getElementById('dk-trend-chart');
        if (!container || !this.summary) return;

        if (!window.React || !window.ReactDOM || !window.Recharts) {
            this._retry = (this._retry || 0) + 1;
            if (this._retry > 30) {
                container.innerHTML = '<div class="flex items-center justify-center h-full text-slate-400 text-sm">Gagal memuat pustaka grafik.</div>';
                return;
            }
            container.innerHTML = '<div class="flex items-center justify-center h-full text-slate-400 text-sm">Memuat pustaka grafik...</div>';
            var self = this;
            setTimeout(function() { self.renderTrenChart(); }, 300);
            return;
        }
        this._retry = 0;

        try {
            var e = React.createElement;
            var Rc = window.Recharts;
            var data = this.summary.trend;

            var chart = e(Rc.ResponsiveContainer, { width: '100%', height: '100%' },
                e(Rc.LineChart, { data: data, margin: { top: 10, right: 20, left: -10, bottom: 0 } },
                    e(Rc.CartesianGrid, { strokeDasharray: '3 3', className: 'stroke-slate-200 dark:stroke-slate-700/50' }),
                    e(Rc.XAxis, { dataKey: 'label', style: { fontSize: '10px', fill: '#94a3b8' } }),
                    e(Rc.YAxis, {
                        tickFormatter: function(v) { if (v >= 1000000) return 'Rp' + (v / 1000000).toFixed(1) + 'jt'; if (v >= 1000) return 'Rp' + (v / 1000).toFixed(0) + 'rb'; return 'Rp' + v; },
                        style: { fontSize: '10px', fill: '#94a3b8' }
                    }),
                    e(Rc.Tooltip, { formatter: function(v, n) { return ['Rp ' + v.toLocaleString('id-ID'), n]; }, contentStyle: { backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' } }),
                    e(Rc.Legend, { wrapperStyle: { fontSize: '11px' } }),
                    e(Rc.Line, { type: 'monotone', dataKey: 'Pendapatan', stroke: '#10b981', strokeWidth: 2, dot: false }),
                    e(Rc.Line, { type: 'monotone', dataKey: 'Beban', stroke: '#f43f5e', strokeWidth: 2, dot: false })
                )
            );
            var root = ReactDOM.createRoot(container);
            root.render(chart);
        } catch (err) {
            container.innerHTML = '<div class="text-center py-10 text-red-500 text-sm">Gagal merender grafik: ' + err.message + '</div>';
        }
    },

    renderBeban: function() {
        var s = this.summary;
        var html = '<div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-sm">';
        html += '<div class="flex items-center justify-between mb-4"><h3 class="font-bold text-slate-800 dark:text-white">Rincian Beban per Kategori</h3>';
        html += '<button onclick="navigateTo(\'laporan/pengeluaran\',\'Pengeluaran\')" class="text-xs font-semibold text-primary-600 flex items-center gap-1">Kelola Pengeluaran <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i></button></div>';

        var kats = Object.keys(s.bebanPerKategori);
        if (kats.length === 0) {
            html += '<p class="text-sm text-slate-400 text-center py-8">Belum ada pengeluaran disetujui pada periode ini.</p>';
        } else {
            var total = kats.reduce(function(sum, k) { return sum + s.bebanPerKategori[k]; }, 0);
            kats.sort(function(a, b) { return s.bebanPerKategori[b] - s.bebanPerKategori[a]; });
            html += '<div class="space-y-3">';
            kats.forEach(function(k) {
                var val = s.bebanPerKategori[k];
                var pct = total > 0 ? Math.round((val / total) * 100) : 0;
                html += '<div><div class="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1"><span>' + Utils.escapeHtml(k) + '</span><span>' + Utils.formatRupiah(val) + ' (' + pct + '%)</span></div>';
                html += '<div class="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"><div class="h-full bg-primary-500 rounded-full" style="width:' + pct + '%"></div></div></div>';
            });
            html += '</div>';
        }
        html += '</div>';
        return html;
    },

    renderAset: function() {
        var s = this.summary;
        var html = '<div class="space-y-5">';

        html += '<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">';
        Object.keys(this.ASSET_CODES).forEach(function(code) {
            var kat = window.AppKeuanganDashboardKeuangan.ASSET_CODES[code];
            var val = s.asetPerKategori[kat] || 0;
            html += '<div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-4"><p class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">' + kat + '</p><h3 class="text-lg font-black text-slate-800 dark:text-white">' + Utils.formatRupiah(val) + '</h3></div>';
        });
        html += '</div>';

        html += '<div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-sm">';
        html += '<h3 class="font-bold text-slate-800 dark:text-white mb-1">Register Aset (dari Pengeluaran Disetujui)</h3>';
        html += '<p class="text-xs text-slate-400 mb-4">Total Nilai Aset Kumulatif: <span class="font-bold text-slate-700 dark:text-slate-200">' + Utils.formatRupiah(s.asetTotal) + '</span></p>';

        if (s.asetItems.length === 0) {
            html += '<p class="text-sm text-slate-400 text-center py-8">Belum ada pembelian aset tercatat.</p>';
        } else {
            html += '<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700"><th class="py-2 pr-3">Tanggal</th><th class="py-2 pr-3">Kategori</th><th class="py-2 pr-3">Keterangan</th><th class="py-2 pr-3 text-right">Nilai</th></tr></thead><tbody>';
            s.asetItems.slice(0, 50).forEach(function(item) {
                var tgl = item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
                html += '<tr class="border-b border-slate-50 dark:border-slate-700/50"><td class="py-2 pr-3 text-slate-500 whitespace-nowrap">' + tgl + '</td><td class="py-2 pr-3 text-slate-600 dark:text-slate-300">' + Utils.escapeHtml(item.kategori || '-') + '</td><td class="py-2 pr-3 text-slate-800 dark:text-white font-medium">' + Utils.escapeHtml(item.keterangan || '-') + '</td><td class="py-2 pr-3 text-right font-bold text-slate-700 dark:text-slate-200">' + Utils.formatRupiah(item.jumlah) + '</td></tr>';
            });
            html += '</tbody></table></div>';
        }
        html += '</div></div>';
        return html;
    },

    renderHutangPiutang: function() {
        var s = this.summary;
        var html = '<div class="grid grid-cols-1 lg:grid-cols-2 gap-5">';

        html += '<div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-sm">';
        html += '<div class="flex items-center justify-between mb-3"><h3 class="font-bold text-slate-800 dark:text-white">Hutang Usaha</h3><button onclick="navigateTo(\'laporan/hutang\',\'Hutang Usaha\')" class="text-xs font-semibold text-primary-600 flex items-center gap-1">Detail <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i></button></div>';
        html += '<div class="space-y-2 text-sm">';
        html += '<div class="flex justify-between"><span class="text-slate-500">Belum Lunas (' + s.hutangCount + ' faktur)</span><span class="font-bold text-red-600">' + Utils.formatRupiah(s.hutangBelumLunas) + '</span></div>';
        html += '<div class="flex justify-between"><span class="text-slate-500">Menunggu Approval</span><span class="font-bold text-amber-600">' + Utils.formatRupiah(s.hutangMenunggu) + '</span></div>';
        html += '</div></div>';

        html += '<div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-sm">';
        html += '<div class="flex items-center justify-between mb-3"><h3 class="font-bold text-slate-800 dark:text-white">Piutang Karyawan</h3><button onclick="navigateTo(\'laporan/piutang\',\'Piutang Karyawan\')" class="text-xs font-semibold text-primary-600 flex items-center gap-1">Detail <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i></button></div>';
        html += '<div class="space-y-2 text-sm">';
        html += '<div class="flex justify-between"><span class="text-slate-500">Belum Lunas (' + s.piutangCount + ' catatan)</span><span class="font-bold text-purple-600">' + Utils.formatRupiah(s.piutangBelumLunas) + '</span></div>';
        html += '</div></div>';

        html += '</div>';
        return html;
    }
};