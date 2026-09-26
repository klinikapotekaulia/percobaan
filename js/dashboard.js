/**
 * js/dashboard.js
 * Dashboard Role-Based (Klinik, Apotek, Admin, Keuangan)
 */

window.AppDashboard = {
    auditLogState: {
        rawEntries: [],
        filteredEntries: [],
        filterDateStart: '',
        filterDateEnd: '',
        limit: 10
    },

    render: function() {
        return [
            '<div class="page-enter">',
            '  <div id="dashboard-content"><div class="flex justify-center py-20"><div class="spinner"></div></div></div>',
            '</div>'
        ].join('');
    },

    init: function() {
        this.auditLogState = {
            rawEntries: [],
            filteredEntries: [],
            filterDateStart: '',
            filterDateEnd: '',
            limit: 10
        };
        var role = window.currentRole || 'apotek';
        if (role === 'klinik') this.renderKlinik();
        // FIX (permintaan user): dashboard khusus akun Dokter belum pernah dibuat,
        // sebelumnya jatuh ke renderDefault() (cuma teks selamat datang polos).
        else if (role === 'dokter') this.renderDokter();
        else if (role === 'apotek') this.renderApotek();
        else if (role === 'admin') this.renderAdmin();
        else if (role === 'keuangan') this.renderKeuangan();
        else if (role === 'psa') this.renderPsa();
        else this.renderDefault();
    },

    // Helper kartu statistik
    card: function(title, value, icon, color, desc) {
        return '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm flex items-center gap-4 min-w-0 flex-1">' +
            '<div class="w-12 h-12 rounded-full bg-' + color + '-100 dark:bg-' + color + '-900/30 flex items-center justify-center flex-shrink-0">' +
            '<i data-lucide="' + icon + '" class="w-6 h-6 text-' + color + '-600 dark:text-' + color + '-400"></i></div>' +
            '<div class="min-w-0 flex-1"><p class="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold truncate">' + title + '</p>' +
            '<h3 class="text-lg sm:text-xl font-bold text-gray-800 dark:text-white truncate" title="' + Utils.escapeHtml(value) + '">' + value + '</h3>' +
            (desc ? '<p class="text-[10px] text-slate-400 mt-1 truncate">' + desc + '</p>' : '') + '</div></div>';
    },

    // ===== DASHBOARD KLINIK =====
    renderKlinik: function() {
        var self = this;
        var today = Utils.today(); // FIX: pakai tanggal lokal, bukan UTC (lihat catatan di Utils.today)
        var pAntrian = db.collection('antrian').where('tanggal', '==', today).get();
        // FIX (READ SPIKE): sebelumnya where('status','==','selesai') tanpa limit() ->
        // tarik SEMUA rekam medis yang pernah selesai (terus bertambah, dibaca ulang
        // tiap Dashboard dibuka/refresh -- halaman paling sering diakses di app ini).
        // Query langsung ke statusResep=='menunggu' jauh lebih murah & hasilnya sama.
        var pResep = db.collection('rekamMedis').where('statusResep', '==', 'menunggu').get();

        Promise.all([pAntrian, pResep]).then(function(results) {
            var menunggu = 0, dilayani = 0;
            results[0].forEach(function(doc) {
                var d = doc.data();
                if (d.status === 'menunggu') menunggu++;
                else if (d.status === 'dilayani') dilayani++;
            });

            var resepMenunggu = results[1].size;

            var html = '<h2 class="text-xl font-bold text-gray-800 dark:text-white mb-4">Dashboard Klinik</h2>';
            html += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">';
            html += self.card('Antrian Menunggu', menunggu + ' Pasien', 'clock', 'amber', 'Segera panggil pasien');
            html += self.card('Sedang Dilayani', dilayani + ' Pasien', 'activity', 'blue', 'Dalam ruang periksa');
            html += self.card('Resep Belum Diproses', resepMenunggu + ' Resep', 'file-text', 'rose', 'Menunggu di apotek');
            html += '</div>';

            html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">';
            html += '<div class="bg-white dark:bg-slate-800 p-5 rounded-xl border"><h3 class="font-bold mb-3 text-gray-800 dark:text-white">Aksi Cepat</h3>';
            html += '<button onclick="navigateTo(\'klinik/antrian\', \'Antrian\')" class="w-full bg-primary-600 text-white p-3 rounded-lg mb-2 flex items-center gap-2"><i data-lucide="list-ordered" class="w-4 h-4"></i> Buka Antrian</button>';
            html += '<button onclick="navigateTo(\'klinik/rekamMedis\', \'Rekam Medis\')" class="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 p-3 rounded-lg mb-2 flex items-center gap-2"><i data-lucide="file-heart" class="w-4 h-4"></i> Input Rekam Medis</button>';
            html += '<button onclick="navigateTo(\'klinik/pasien\', \'Data Pasien\')" class="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 p-3 rounded-lg flex items-center gap-2"><i data-lucide="users" class="w-4 h-4"></i> Data Pasien</button>';
            html += '</div></div>';

            document.getElementById('dashboard-content').innerHTML = html;
            lucide.createIcons();
        }).catch(function(err) {
            document.getElementById('dashboard-content').innerHTML = '<div class="bg-white dark:bg-slate-800 p-6 rounded-xl border text-center text-red-500">Gagal memuat dashboard: ' + (err && err.message ? err.message : err) + '</div>';
        });
    },

    // ===== DASHBOARD DOKTER =====
    // FIX (permintaan user): sebelumnya tidak ada, akun dokter jatuh ke renderDefault()
    // (hanya teks "Selamat datang" tanpa data apapun).
    renderDokter: function() {
        var self = this;
        var today = Utils.today(); // FIX: pakai tanggal lokal, bukan UTC (lihat catatan di Utils.today)
        var pAntrian = db.collection('antrian').where('tanggal', '==', today).get();

        // Resep yang RM-nya sudah dibuat dokter tapi belum kelar diproses di Apotek.
        var pRekam = db.collection('rekamMedis').where('tanggal', '==', today).get();

        Promise.all([pAntrian, pRekam]).then(function(results) {
            var menunggu = 0, dilayani = 0, selesai = 0;
            results[0].forEach(function(doc) {
                var d = doc.data();
                if (d.status === 'menunggu') menunggu++;
                else if (d.status === 'dilayani') dilayani++;
                else if (d.status === 'selesai') selesai++;
            });

            var resepDiproses = 0;
            results[1].forEach(function(doc) {
                var d = doc.data();
                // Filter ke dokter yang login kalau akun sudah tertaut ke data Karyawan.
                if (window.currentKaryawanId && d.dokterId !== window.currentKaryawanId) return;
                if (!d.statusResep || d.statusResep === 'menunggu') resepDiproses++;
            });

            var html = '<h2 class="text-xl font-bold text-gray-800 dark:text-white mb-4">Dashboard Dokter</h2>';
            html += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">';
            html += self.card('Pasien Menunggu', menunggu + ' Pasien', 'clock', 'amber', 'Klik Buka RM untuk memulai');
            html += self.card('Segera Periksa', dilayani + ' Pasien', 'activity', 'blue', 'Belum selesai RM');
            html += self.card('Resep Diproses', resepDiproses + ' Resep', 'package', 'purple', 'Sedang diproses di Apotek');
            html += self.card('Selesai Hari Ini', selesai + ' Pasien', 'check-circle', 'green', 'RM sudah disimpan');
            html += '</div>';

            html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">';
            html += '<div class="bg-white dark:bg-slate-800 p-5 rounded-xl border"><h3 class="font-bold mb-3 text-gray-800 dark:text-white">Aksi Cepat</h3>';
            html += '<button onclick="navigateTo(\'klinik/antrian\', \'Antrian\')" class="w-full bg-primary-600 text-white p-3 rounded-lg mb-2 flex items-center gap-2"><i data-lucide="stethoscope" class="w-4 h-4"></i> Lihat Antrian & Buka RM</button>';
            html += '<button onclick="navigateTo(\'klinik/resep\', \'Resep\')" class="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 p-3 rounded-lg flex items-center gap-2"><i data-lucide="file-text" class="w-4 h-4"></i> Riwayat Resep</button>';
            html += '</div></div>';

            document.getElementById('dashboard-content').innerHTML = html;
            lucide.createIcons();
        }).catch(function(err) {
            document.getElementById('dashboard-content').innerHTML = '<div class="bg-white dark:bg-slate-800 p-6 rounded-xl border text-center text-red-500">Gagal memuat dashboard: ' + (err && err.message ? err.message : err) + '</div>';
        });
    },

    // ===== DASHBOARD APOTEK =====
    renderApotek: function() {
        var self = this;
        var today = Utils.today(); // FIX: pakai tanggal lokal, bukan UTC (lihat catatan di Utils.today)
        var pTrx = db.collection('transaksi').where('tanggal', '==', today).get();
        var pObat = DataCache.getObat();
        // FIX (READ SPIKE): sama seperti di renderKlinik() -- query langsung ke
        // statusResep=='menunggu' menggantikan where('status','==','selesai') tanpa
        // limit() yang sebelumnya menarik seluruh riwayat rekam medis yang selesai.
        var pResep = db.collection('rekamMedis').where('statusResep', '==', 'menunggu').get();

        Promise.all([pTrx, pObat, pResep]).then(function(results) {
            var cash = 0, transfer = 0, qris = 0;
            results[0].forEach(function(doc) {
                var t = doc.data();
                if (t.metodeBayar === 'cash') cash += t.totalAkhir || 0;
                else if (t.metodeBayar === 'transfer') transfer += t.totalAkhir || 0;
                else if (t.metodeBayar === 'qris') qris += t.totalAkhir || 0;
            });

            var stokMenipis = 0;
            results[1].forEach(function(doc) {
                var o = doc.data();
                if ((o.stok || 0) <= (o.stokMinimum || 0)) stokMenipis++;
            });

            var resepMenunggu = results[2].size;

            var html = '<h2 class="text-xl font-bold text-gray-800 dark:text-white mb-4">Dashboard Apotek</h2>';
            html += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">';
            html += self.card('Kas Masuk (Cash)', Utils.formatRupiah(cash), 'banknote', 'green', 'Hari ini');
            html += self.card('Kas Masuk (Transfer)', Utils.formatRupiah(transfer), 'send', 'blue', 'Hari ini');
            html += self.card('Kas Masuk (QRIS)', Utils.formatRupiah(qris), 'qr-code', 'purple', 'Hari ini');
            html += self.card('Peringatan Stok', stokMenipis + ' Obat', 'alert-triangle', 'red', 'Stok menipis/Habis');
            html += '</div>';

            // Chart Ringkasan Penjualan Hari Ini dengan Date Range Picker
            html += '<div class="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 mb-6">';
            // FIX: pakai height tetap (bukan cuma min-h) — Recharts ResponsiveContainer & div
            // "h-full" di dalamnya butuh tinggi parent yang PASTI (bukan auto+min-height) supaya
            // grafik "Tren Penjualan Periode" ikut ter-render, bukan cuma tampilan "Hari Ini".
            html += '  <div id="daily-sales-chart" class="w-full" style="height:440px"></div>';
            html += '</div>';

            html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">';
            html += '<div class="bg-white dark:bg-slate-800 p-5 rounded-xl border"><h3 class="font-bold mb-3 text-gray-800 dark:text-white">Antrian Resep Dokter</h3>';
            html += '<p class="text-3xl font-bold text-rose-600 mb-2">' + resepMenunggu + ' Resep</p><p class="text-sm text-slate-500 mb-4">Pasien menunggu obat diracik.</p>';
            html += '<button onclick="navigateTo(\'apotek/transaksi\', \'Transaksi\')" class="w-full bg-primary-600 text-white p-3 rounded-lg flex items-center justify-center gap-2"><i data-lucide="shopping-cart" class="w-4 h-4"></i> Buka Kasir</button>';
            html += '</div>';

            html += '<div class="bg-white dark:bg-slate-800 p-5 rounded-xl border"><h3 class="font-bold mb-3 text-gray-800 dark:text-white">Aksi Cepat</h3>';
            html += '<button onclick="navigateTo(\'apotek/pembelian\', \'Pembelian\')" class="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 p-3 rounded-lg mb-2 flex items-center gap-2"><i data-lucide="truck" class="w-4 h-4"></i> Input Faktur Pembelian</button>';
            html += '<button onclick="navigateTo(\'apotek/stockOpname\', \'Stock Opname\')" class="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 p-3 rounded-lg flex items-center gap-2"><i data-lucide="clipboard-check" class="w-4 h-4"></i> Ajukan Stock Opname</button>';
            html += '</div></div>';

            document.getElementById('dashboard-content').innerHTML = html;
            lucide.createIcons();
            self.renderDailySalesChart(results[0]);
        }).catch(function(err) {
            document.getElementById('dashboard-content').innerHTML = '<div class="bg-white dark:bg-slate-800 p-6 rounded-xl border text-center text-red-500">Gagal memuat dashboard: ' + (err && err.message ? err.message : err) + '</div>';
        });
    },

    // ===== DASHBOARD ADMIN =====
    renderAdmin: function() {
        var self = this;
        var today = Utils.today(); // FIX: pakai tanggal lokal, bukan UTC (lihat catatan di Utils.today)
        var pAbsen = db.collection('absensi').where('tanggal', '==', today).get();
        var pKary = db.collection('karyawan').where('status', '==', 'aktif').get();
        var pSO = db.collection('stockOpnameRequests').where('status', '==', 'pending').get();
        var pKas = db.collection('kasKeluar').where('status', '==', 'pending').get();
        var pTrx = db.collection('transaksi').where('tanggal', '==', today).get();

        Promise.all([pAbsen, pKary, pSO, pKas, pTrx]).then(function(results) {
            var sudahAbsen = results[0].size;
            var totalKary = results[1].size;
            var belumAbsen = totalKary - sudahAbsen;

            var html = '<h2 class="text-xl font-bold text-gray-800 dark:text-white mb-4">Dashboard Admin (Kepala)</h2>';
            html += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">';
            html += self.card('Absensi Hari Ini', sudahAbsen + ' / ' + totalKary, 'calendar-check', 'blue', belumAbsen + ' karyawan belum absen');
            html += self.card('Pengajuan Stok Opname', results[2].size + ' Pengajuan', 'clipboard-check', 'amber', 'Menunggu approval');
            html += self.card('Pengajuan Kas Keluar', results[3].size + ' Pengajuan', 'wallet', 'purple', 'Menunggu approval');
            html += '</div>';

            // Chart Ringkasan Penjualan Hari Ini dengan Date Range Picker
            html += '<div class="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 mb-6">';
            html += '  <div id="daily-sales-chart" class="w-full" style="height:440px"></div>';
            html += '</div>';

            html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">';
            html += '<div class="bg-white dark:bg-slate-800 p-5 rounded-xl border"><h3 class="font-bold mb-3 text-gray-800 dark:text-white">Approval Center</h3>';
            html += '<button onclick="navigateTo(\'apotek/stockOpname\', \'Stock Opname\')" class="w-full bg-amber-100 text-amber-700 p-3 rounded-lg mb-2 flex items-center gap-2"><i data-lucide="clipboard-check" class="w-4 h-4"></i> Review Stock Opname</button>';
            html += '<button onclick="navigateTo(\'laporan/pengeluaran\', \'Pengeluaran Kas\')" class="w-full bg-purple-100 text-purple-700 p-3 rounded-lg flex items-center gap-2"><i data-lucide="wallet" class="w-4 h-4"></i> Review Pengeluaran Kas</button>';
            html += '</div>';

            html += '<div class="bg-white dark:bg-slate-800 p-5 rounded-xl border"><h3 class="font-bold mb-3 text-gray-800 dark:text-white">Manajemen Operasional</h3>';
            html += '<button onclick="navigateTo(\'manajemen/karyawan\', \'Karyawan\')" class="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 p-3 rounded-lg mb-2 flex items-center gap-2"><i data-lucide="users" class="w-4 h-4"></i> Data Karyawan</button>';
            html += '<button onclick="navigateTo(\'apotek/obat\', \'Obat\')" class="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 p-3 rounded-lg flex items-center gap-2"><i data-lucide="pill" class="w-4 h-4"></i> Master Obat & Stok</button>';
            html += '</div></div>';

            // Container for Audit Logs
            html += '<div id="dashboard-audit-log-container" class="mt-6"></div>';

            document.getElementById('dashboard-content').innerHTML = html;
            lucide.createIcons();
            self.initAuditLogs();
            self.renderDailySalesChart(results[4]);
        }).catch(function(err) {
            document.getElementById('dashboard-content').innerHTML = '<div class="bg-white dark:bg-slate-800 p-6 rounded-xl border text-center text-red-500">Gagal memuat dashboard: ' + (err && err.message ? err.message : err) + '</div>';
        });
    },

    // ===== DASHBOARD KEUANGAN =====
    renderKeuangan: function() {
        var self = this;
        var today = Utils.today(); // FIX: pakai tanggal lokal, bukan UTC (lihat catatan di Utils.today)
        var startMonth = today.slice(0, 8) + '01';

        var pTrx = db.collection('transaksi').where('tanggal', '>=', startMonth).where('tanggal', '<=', today).get();
        var pKasKeluar = db.collection('kasKeluar').where('status', '==', 'approved').where('tanggal', '>=', startMonth).where('tanggal', '<=', today).get();
        var pBeli = db.collection('pembelian').where('metodePembayaran', '==', 'tunai').where('tanggal', '>=', startMonth).where('tanggal', '<=', today).get();
        // FIX: gunakan 'in' alih-alih '!=' agar dokumen lama tanpa field tidak
        //      ikut, tapi semua status non-lunas terhitung; tambahkan .catch global di bawah.
        var pHutangJatuhTempo = db.collection('pembelian').where('statusPelunasan', 'in', ['belum_lunas','sebagian','belum']).get();
        // INTEGRASI: pendapatan non-operasional (modul Pendapatan Lain - sewa, bunga bank, komisi, dll)
        var pPendapatanLain = db.collection('pendapatanLain').where('tanggal', '>=', startMonth).where('tanggal', '<=', today).get();

        Promise.all([pTrx, pKasKeluar, pBeli, pHutangJatuhTempo, pPendapatanLain]).then(function(results) {
            var omzetBulan = 0, hppBulan = 0;
            results[0].forEach(function(doc) {
                var t = doc.data();
                var hpp = t.items ? t.items.reduce(function(s, i) { return s + (i.jumlah * (i.hargaBeli || 0)); }, 0) : 0;
                // FIX (AKURASI LABA KOTOR): sertakan juga "modal" tindakan (biaya bahan/
                // reagen per tindakan klinik & apotek) sebagai bagian dari HPP -- field
                // ini sudah ada & dipakai untuk payroll/bagi hasil, tapi sebelumnya tidak
                // pernah dikurangkan di sini sehingga Laba Kotor & Estimasi Laba Bersih
                // menganggap seluruh harga tindakan adalah laba 100% (digelembungkan).
                var hppTindakan = t.tindakanItems ? t.tindakanItems.reduce(function(s, ti) { return s + (ti.modal || 0); }, 0) : 0;
                // FIX (AKURASI OMZET): sebelumnya omzet dihitung ulang dari komponen mentah
                // (totalObat + totalRacik + totalTindakan + jasaResep) TANPA `pembulatan`
                // (pembulatan ke atas ke kelipatan Rp1.000 yang benar-benar ditagih ke
                // pasien -- lihat apotek/transaksi.js). Akibatnya "Omzet Bulan Ini" &
                // "Kas Masuk" di dashboard ini SELALU lebih kecil dari uang tunai yang
                // sungguh diterima (yaitu totalAkhir), dan tidak sinkron dengan laporan
                // lain (Penjualan Harian, Tren Finansial, Dashboard Keuangan) yang sudah
                // benar memakai totalAkhir. Sekarang pakai totalAkhir langsung supaya
                // selalu sama dengan nominal yang sungguh masuk ke kasir.
                omzetBulan += (t.totalAkhir || 0);
                hppBulan += hpp + hppTindakan;
            });

            var bebanOp = 0;
            results[1].forEach(function(doc) { bebanOp += doc.data().jumlah || 0; });

            var beliTunai = 0;
            results[2].forEach(function(doc) { beliTunai += doc.data().totalHarga || 0; });

            var hutangAktif = results[3].size;

            // INTEGRASI: pendapatan lain (non-operasional) ikut menambah Laba Bersih & Kas Masuk
            var pendapatanLainBulan = 0;
            results[4].forEach(function(doc) { pendapatanLainBulan += doc.data().jumlah || 0; });

            var labaKotor = omzetBulan - hppBulan;
            var labaBersih = labaKotor - bebanOp + pendapatanLainBulan;

            var html = '<h2 class="text-xl font-bold text-gray-800 dark:text-white mb-4">Dashboard Keuangan (PSA)</h2>';
            html += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">';
            html += self.card('Omzet Bulan Ini', Utils.formatRupiah(omzetBulan), 'trending-up', 'blue', 'Penjualan obat & jasa');
            html += self.card('Laba Kotor (MTD)', Utils.formatRupiah(labaKotor), 'coins', 'green', 'Omzet - HPP');
            html += self.card('Estimasi Laba Bersih', Utils.formatRupiah(labaBersih), 'piggy-bank', labaBersih >= 0 ? 'emerald' : 'red', 'Laba Kotor + Pendapatan Lain - Beban Op');
            html += self.card('Hutang Belum Lunas', hutangAktif + ' Faktur', 'file-text', 'amber', 'Perlu penyelesaian');
            html += '</div>';

            // Chart Ringkasan Penjualan Hari Ini dengan Date Range Picker
            html += '<div class="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 mb-6">';
            html += '  <div id="daily-sales-chart" class="w-full" style="height:440px"></div>';
            html += '</div>';

            html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">';
            html += '<div class="bg-white dark:bg-slate-800 p-5 rounded-xl border"><h3 class="font-bold mb-3 text-gray-800 dark:text-white">Arus Kas Bulan Ini</h3>';
            html += '<div class="flex justify-between mb-2 text-sm"><span class="text-slate-500">Kas Masuk (Omzet)</span><span class="font-bold text-green-600">+ ' + Utils.formatRupiah(omzetBulan) + '</span></div>';
            if (pendapatanLainBulan > 0) {
                html += '<div class="flex justify-between mb-2 text-sm"><span class="text-slate-500">Pendapatan Lain (Sewa, Bunga Bank, dll)</span><span class="font-bold text-green-600">+ ' + Utils.formatRupiah(pendapatanLainBulan) + '</span></div>';
            }
            html += '<div class="flex justify-between mb-2 text-sm"><span class="text-slate-500">Beli Obat Tunai</span><span class="font-bold text-red-600">- ' + Utils.formatRupiah(beliTunai) + '</span></div>';
            html += '<div class="flex justify-between mb-2 text-sm"><span class="text-slate-500">Beban Operasional</span><span class="font-bold text-red-600">- ' + Utils.formatRupiah(bebanOp) + '</span></div>';
            html += '<div class="flex justify-between border-t mt-2 pt-2 text-sm font-bold"><span>Net Cash Flow</span><span class="' + ((omzetBulan + pendapatanLainBulan - beliTunai - bebanOp) >= 0 ? 'text-green-600' : 'text-red-600') + '">' + Utils.formatRupiah(omzetBulan + pendapatanLainBulan - beliTunai - bebanOp) + '</span></div>';
            html += '</div>';

            html += '<div class="bg-white dark:bg-slate-800 p-5 rounded-xl border"><h3 class="font-bold mb-3 text-gray-800 dark:text-white">Aksi Keuangan</h3>';
            html += '<button onclick="navigateTo(\'keuangan/payroll\', \'Payroll\')" class="w-full bg-primary-600 text-white p-3 rounded-lg mb-2 flex items-center gap-2"><i data-lucide="calculator" class="w-4 h-4"></i> Proses Payroll</button>';
            html += '<button onclick="navigateTo(\'keuangan/mutasiRekening\', \'Mutasi Rekening\')" class="w-full bg-emerald-600 text-white p-3 rounded-lg mb-2 flex items-center gap-2 font-semibold hover:bg-emerald-700 transition"><i data-lucide="arrow-left-right" class="w-4 h-4"></i> Mutasi Rekening &amp; Kas</button>';
            html += '<button onclick="navigateTo(\'apotek/obatTerlaris\', \'Ringkasan Obat Terlaris\')" class="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 p-3 rounded-lg mb-2 flex items-center gap-2 font-semibold transition"><i data-lucide="trending-up" class="w-4 h-4 text-amber-600"></i> Ringkasan Obat Terlaris</button>';
            html += '<button onclick="navigateTo(\'keuangan/akuntansi\', \'Akuntansi\')" class="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 p-3 rounded-lg mb-2 flex items-center gap-2"><i data-lucide="book-open" class="w-4 h-4"></i> Buku Besar & Neraca</button>';
            html += '<button onclick="navigateTo(\'laporan/hutang\', \'Hutang Usaha\')" class="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 p-3 rounded-lg flex items-center gap-2"><i data-lucide="receipt" class="w-4 h-4"></i> Lunasi Hutang Usaha</button>';
            html += '</div></div>';

            // Container for Audit Logs
            html += '<div id="dashboard-audit-log-container" class="mt-6"></div>';

            document.getElementById('dashboard-content').innerHTML = html;
            lucide.createIcons();
            self.initAuditLogs();

            // Saring transaksi hari ini saja untuk grafik
            var todayTrxs = [];
            results[0].forEach(function(doc) {
                if (doc.data().tanggal === today) {
                    todayTrxs.push(doc);
                }
            });
            self.renderDailySalesChart(todayTrxs);
        }).catch(function(err) {
            document.getElementById('dashboard-content').innerHTML = '<div class="bg-white dark:bg-slate-800 p-6 rounded-xl border text-center text-red-500">Gagal memuat dashboard: ' + (err && err.message ? err.message : err) + '</div>';
        });
    },

    // ===== DASHBOARD PEMILIK SAHAM (PSA) =====
    renderPsa: function() {
        var self = this;
        var today = Utils.today();
        var startMonth = today.slice(0, 8) + '01';

        var pTrx = db.collection('transaksi').where('tanggal', '>=', startMonth).where('tanggal', '<=', today).get().catch(function(e) { console.warn('pTrx err:', e); return []; });
        var pKasKeluar = db.collection('kasKeluar').where('tanggal', '>=', startMonth).where('tanggal', '<=', today).get().catch(function(e) { console.warn('pKasKeluar err:', e); return []; });
        var pBeli = db.collection('pembelian').where('tanggal', '>=', startMonth).where('tanggal', '<=', today).get().catch(function(e) { console.warn('pBeli err:', e); return []; });
        var pHutangJatuhTempo = db.collection('pembelian').get().catch(function(e) { console.warn('pHutang err:', e); return []; });
        var pPiutang = db.collection('piutangKaryawan').get().catch(function(e) { console.warn('pPiutang err:', e); return []; });
        var pObat = db.collection('obat').get().catch(function(e) { console.warn('pObat err:', e); return []; });
        var pPsaConfig = db.collection('pengaturan').doc('psaInvestasi').get().catch(function(e) { console.warn('pPsaConfig err:', e); return null; });
        // INTEGRASI: pendapatan non-operasional (modul Pendapatan Lain - sewa, bunga bank, komisi, dll)
        var pPendapatanLain = db.collection('pendapatanLain').where('tanggal', '>=', startMonth).where('tanggal', '<=', today).get().catch(function(e) { console.warn('pPendapatanLain err:', e); return []; });

        Promise.all([pTrx, pKasKeluar, pBeli, pHutangJatuhTempo, pPiutang, pObat, pPsaConfig, pPendapatanLain]).then(function(results) {
            var safeForEach = function(res, cb) {
                if (res && typeof res.forEach === 'function') {
                    res.forEach(cb);
                }
            };

            var omzetBulan = 0, hppBulan = 0;
            safeForEach(results[0], function(doc) {
                var t = doc.data();
                var hpp = t.items ? t.items.reduce(function(s, i) { return s + (i.jumlah * (i.hargaBeli || 0)); }, 0) : 0;
                // FIX (AKURASI LABA KOTOR): lihat catatan yang sama di renderKeuangan() --
                // modal tindakan ikut jadi HPP supaya laba tidak digelembungkan.
                var hppTindakan = t.tindakanItems ? t.tindakanItems.reduce(function(s, ti) { return s + (ti.modal || 0); }, 0) : 0;
                // FIX (AKURASI OMZET): lihat catatan yang sama di renderKeuangan() di atas --
                // pakai totalAkhir (sudah termasuk pembulatan) supaya "Omzet Bulan Ini" di
                // Dashboard PSA sama dengan kas yang sungguh diterima, bukan angka mentah
                // sebelum dibulatkan.
                omzetBulan += (t.totalAkhir || 0);
                hppBulan += hpp + hppTindakan;
            });

            var bebanOp = 0;
            safeForEach(results[1], function(doc) {
                var k = doc.data();
                if (k.status === 'approved') bebanOp += k.jumlah || 0;
            });

            var beliTunai = 0;
            safeForEach(results[2], function(doc) {
                var b = doc.data();
                if (b.metodePembayaran === 'tunai') beliTunai += b.totalHarga || 0;
            });

            // INTEGRASI: pendapatan lain (non-operasional) ikut menambah Laba Bersih & Arus Kas
            var pendapatanLainBulan = 0;
            safeForEach(results[7], function(doc) { pendapatanLainBulan += doc.data().jumlah || 0; });

            var labaKotor = omzetBulan - hppBulan;
            var labaBersih = labaKotor - bebanOp + pendapatanLainBulan;
            var netCashFlow = omzetBulan + pendapatanLainBulan - beliTunai - bebanOp;

            var hutangAktif = 0;
            safeForEach(results[3], function(doc) {
                var b = doc.data();
                if (['belum_lunas', 'sebagian', 'belum'].indexOf(b.statusPelunasan) !== -1) hutangAktif++;
            });

            var piutangAktif = 0;
            safeForEach(results[4], function(doc) {
                var p = doc.data();
                if (p.status === 'belum_lunas') piutangAktif++;
            });

            var lowStockCount = 0;
            var nilaiInventaris = 0;
            safeForEach(results[5], function(doc) {
                var o = doc.data();
                if ((o.stok || 0) <= (o.stokMinimum || 0)) {
                    lowStockCount++;
                }
                nilaiInventaris += (parseFloat(o.stok) || 0) * (parseFloat(o.hpp) || 0);
            });

            var html = '<div class="flex flex-col gap-1 mb-4">';
            html += '  <h2 class="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><i data-lucide="shield" class="text-primary-600 w-6 h-6"></i> Dashboard Pemilik Saham (PSA)</h2>';
            html += '  <p class="text-sm text-slate-500 dark:text-slate-400">Pengawasan performa finansial apotek, aset, liabilitas, ketersediaan stok, dan audit keamanan secara real-time.</p>';
            html += '</div>';

            // Stat Cards Grid: 2 kolom di layar sedang/komputer (md:) = TEPAT 3 BARIS (6 kartu / 2)
            html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">';
            html += self.card('Omzet Bulan Ini', Utils.formatRupiah(omzetBulan), 'trending-up', 'blue', 'Penjualan obat & jasa');
            html += self.card('Estimasi Laba Bersih', Utils.formatRupiah(labaBersih), 'piggy-bank', labaBersih >= 0 ? 'emerald' : 'red', 'Laba Kotor + Pendapatan Lain - Operasional');
            html += self.card('Arus Kas Bersih', Utils.formatRupiah(netCashFlow), 'wallet', netCashFlow >= 0 ? 'indigo' : 'orange', 'Inflow - Outflow');
            html += self.card('Stok Obat Kritis', lowStockCount + ' Item', 'alert-triangle', lowStockCount > 0 ? 'rose' : 'slate', 'Stok <= stok minimum');
            html += self.card('Hutang Dagang', hutangAktif + ' Faktur', 'file-text', 'amber', 'Pembelian belum lunas');
            html += self.card('Piutang Karyawan', piutangAktif + ' Aktif', 'user-minus', 'purple', 'Piutang belum lunas');
            html += '</div>';

            // Chart Ringkasan Penjualan
            html += '<div class="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 mb-6 shadow-sm">';
            html += '  <div id="daily-sales-chart" class="w-full" style="height:440px"></div>';
            html += '</div>';

            // ===== WIDGET RINGKASAN INVESTASI PSA =====
            // Baca data baseline dari database Firestore pengaturan/psaInvestasi (jika sudah diset user)
            var psaConfigDoc = (results[6] && results[6].exists) ? results[6].data() : {};
            var modalKasAwal = typeof psaConfigDoc.modalKasAwal === 'number' ? psaConfigDoc.modalKasAwal : 150000000;
            var asetPeralatan = typeof psaConfigDoc.asetPeralatan === 'number' ? psaConfigDoc.asetPeralatan : 50000000;
            var asetPerlengkapan = typeof psaConfigDoc.asetPerlengkapan === 'number' ? psaConfigDoc.asetPerlengkapan : 8500000;

            var estimasiKas = modalKasAwal + netCashFlow; // Kas dasar + cash flow berjalan bulan ini
            var totalAset = estimasiKas + nilaiInventaris + asetPeralatan + asetPerlengkapan;

            // Set state untuk interaktivitas dividen dan modal setting
            window.AppDashboardPsaState = {
                labaBersih: labaBersih,
                modalKasAwal: modalKasAwal,
                asetPeralatan: asetPeralatan,
                asetPerlengkapan: asetPerlengkapan,
                changeRatio: function(ratio) {
                    var laba = this.labaBersih;
                    var divVal = laba > 0 ? (laba * ratio) : 0;
                    var retainedVal = laba > 0 ? (laba * (1 - ratio)) : laba;
                    
                    var elDiv = document.getElementById('psa-projected-dividend');
                    var elRetained = document.getElementById('psa-retained-earnings');
                    if (elDiv) elDiv.textContent = Utils.formatRupiah(Math.round(divVal));
                    if (elRetained) elRetained.textContent = Utils.formatRupiah(Math.round(retainedVal));
                    
                    [30, 50, 70].forEach(function(r) {
                        var btn = document.getElementById('ratio-' + r);
                        if (btn) {
                            if (r === Math.round(ratio * 100)) {
                                btn.className = 'px-3 py-1 text-xs bg-primary-600 text-white rounded-md font-semibold shadow-sm transition-all';
                            } else {
                                btn.className = 'px-3 py-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600/80 transition-all';
                            }
                        }
                    });
                },
                openEditModal: function() {
                    var modalHtml = '<div class="p-6 space-y-4">';
                    modalHtml += '  <div class="flex justify-between items-center border-b pb-3 dark:border-slate-700">';
                    modalHtml += '    <h3 class="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2"><i data-lucide="settings-2" class="w-5 h-5 text-primary-500"></i> Pengaturan Modal Baseline PSA</h3>';
                    modalHtml += '    <button onclick="Utils.closeModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><i data-lucide="x" class="w-5 h-5"></i></button>';
                    modalHtml += '  </div>';
                    modalHtml += '  <p class="text-xs text-slate-500 dark:text-slate-400">Silakan atur nilai modal kas awal, aset peralatan, dan perlengkapan riil apotek. Data ini disimpan permanen di database Firestore pengaturan/psaInvestasi.</p>';
                    modalHtml += '  <div class="space-y-3">';
                    modalHtml += '    <div><label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Modal Kas Awal / Kas Dasar (Rp)</label>';
                    modalHtml += '    <input type="number" id="psa-input-kas" value="' + this.modalKasAwal + '" class="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="150000000"></div>';
                    modalHtml += '    <div><label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nilai Aset Peralatan Medis & Apotek (Rp)</label>';
                    modalHtml += '    <input type="number" id="psa-input-peralatan" value="' + this.asetPeralatan + '" class="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="50000000"></div>';
                    modalHtml += '    <div><label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nilai Aset Perlengkapan & ATK (Rp)</label>';
                    modalHtml += '    <input type="number" id="psa-input-perlengkapan" value="' + this.asetPerlengkapan + '" class="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="8500000"></div>';
                    modalHtml += '  </div>';
                    modalHtml += '  <div class="flex justify-end gap-2 pt-3 border-t dark:border-slate-700">';
                    modalHtml += '    <button onclick="Utils.closeModal()" class="px-4 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200">Batal</button>';
                    modalHtml += '    <button onclick="window.AppDashboardPsaState.saveBaselineData()" class="px-4 py-2 text-xs font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-1.5"><i data-lucide="save" class="w-4 h-4"></i> Simpan Permanen</button>';
                    modalHtml += '  </div>';
                    modalHtml += '</div>';
                    Utils.openModal(modalHtml);
                },
                saveBaselineData: function() {
                    var kas = parseFloat(document.getElementById('psa-input-kas')?.value) || 0;
                    var peralatan = parseFloat(document.getElementById('psa-input-peralatan')?.value) || 0;
                    var perlengkapan = parseFloat(document.getElementById('psa-input-perlengkapan')?.value) || 0;

                    db.collection('pengaturan').doc('psaInvestasi').set({
                        modalKasAwal: kas,
                        asetPeralatan: peralatan,
                        asetPerlengkapan: perlengkapan,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true }).then(function() {
                        Utils.closeModal();
                        Utils.toast('Nilai Modal & Baseline Aset PSA berhasil disimpan!', 'success');
                        if (window.AppDashboard) window.AppDashboard.renderPsa();
                    }).catch(function(err) {
                        Utils.toast('Gagal menyimpan data: ' + err.message, 'error');
                    });
                }
            };

            var initialDividend = labaBersih > 0 ? (labaBersih * 0.50) : 0;
            var initialRetained = labaBersih > 0 ? (labaBersih * 0.50) : labaBersih;

            html += '<div class="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 mb-6 shadow-sm">';
            html += '  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 dark:border-slate-700/60 pb-4 mb-5 gap-3">';
            html += '    <div>';
            html += '      <h3 class="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2"><i data-lucide="line-chart" class="w-5 h-5 text-emerald-500"></i> Ringkasan Investasi & Portofolio PSA</h3>';
            html += '      <p class="text-xs text-slate-500 dark:text-slate-400">Ikhtisar aset riil, estimasi pembagian dividen berkala, dan rincian alokasi aset fisik apotek.</p>';
            html += '    </div>';
            html += '    <div class="flex items-center gap-2 flex-wrap">';
            html += '      <button onclick="window.AppDashboardPsaState.openEditModal()" class="px-2.5 py-1.5 text-xs bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/50 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 flex items-center gap-1.5 font-semibold transition-all shadow-xs" title="Atur Modal Kas Awal & Baseline Aset Peralatan/Perlengkapan"><i data-lucide="settings-2" class="w-3.5 h-3.5 text-primary-500"></i> Atur Modal & Aset</button>';
            html += '      <div class="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/40 p-1.5 rounded-lg border border-slate-100 dark:border-slate-700/50">';
            html += '        <span class="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 px-2">Payout Ratio:</span>';
            html += '        <button id="ratio-30" onclick="window.AppDashboardPsaState.changeRatio(0.30)" class="px-3 py-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600/80 transition-all">30%</button>';
            html += '        <button id="ratio-50" onclick="window.AppDashboardPsaState.changeRatio(0.50)" class="px-3 py-1 text-xs bg-primary-600 text-white rounded-md font-semibold shadow-sm transition-all">50%</button>';
            html += '        <button id="ratio-70" onclick="window.AppDashboardPsaState.changeRatio(0.70)" class="px-3 py-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600/80 transition-all">70%</button>';
            html += '      </div>';
            html += '    </div>';
            html += '  </div>';

            html += '  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">';
            
            // Kolom 1: Aset & Kekayaan Riil
            html += '    <div class="space-y-4 md:border-r border-slate-100 dark:border-slate-700/60 pr-0 md:pr-6">';
            html += '      <span class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">1. Total Alokasi Aset</span>';
            html += '      <div class="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-700/50">';
            html += '        <span class="text-xs text-slate-400 dark:text-slate-500">Nilai Aset Konsolidasi</span>';
            html += '        <p class="text-xl font-black text-slate-800 dark:text-white mt-1">' + Utils.formatRupiah(totalAset) + '</p>';
            html += '      </div>';
            html += '      <div class="space-y-2.5 px-1">';
            html += '        <div class="flex justify-between items-center text-xs">';
            html += '          <span class="text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-primary-500"></span>Kas & Bank (Likuid)</span>';
            html += '          <span class="font-semibold text-slate-700 dark:text-slate-300">' + Utils.formatRupiah(estimasiKas) + '</span>';
            html += '        </div>';
            html += '        <div class="flex justify-between items-center text-xs">';
            html += '          <span class="text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>Stok Obat (Aset Lancar)</span>';
            html += '          <span class="font-semibold text-slate-700 dark:text-slate-300">' + Utils.formatRupiah(nilaiInventaris) + '</span>';
            html += '        </div>';
            html += '        <div class="flex justify-between items-center text-xs">';
            html += '          <span class="text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>Aset Peralatan (Tetap)</span>';
            html += '          <span class="font-semibold text-slate-700 dark:text-slate-300">' + Utils.formatRupiah(asetPeralatan) + '</span>';
            html += '        </div>';
            html += '        <div class="flex justify-between items-center text-xs">';
            html += '          <span class="text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>Aset Perlengkapan (Lancar)</span>';
            html += '          <span class="font-semibold text-slate-700 dark:text-slate-300">' + Utils.formatRupiah(asetPerlengkapan) + '</span>';
            html += '        </div>';
            html += '      </div>';
            html += '    </div>';

            // Kolom 2: Proyeksi Dividen Bulanan
            html += '    <div class="space-y-4 md:border-r border-slate-100 dark:border-slate-700/60 pr-0 md:pr-6">';
            html += '      <span class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">2. Proyeksi Dividen Bulanan</span>';
            html += '      <div class="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100/50 dark:border-emerald-900/30">';
            html += '        <span class="text-xs text-emerald-600 dark:text-emerald-400">Estimasi Dividen Diterima</span>';
            html += '        <p id="psa-projected-dividend" class="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1">' + Utils.formatRupiah(Math.round(initialDividend)) + '</p>';
            html += '      </div>';
            html += '      <div class="space-y-2.5 px-1">';
            html += '        <div class="flex justify-between items-center text-xs">';
            html += '          <span class="text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><i data-lucide="percent" class="w-3.5 h-3.5 text-emerald-500"></i> Rasio Distribusi</span>';
            html += '          <span class="font-semibold text-slate-700 dark:text-slate-300">Default 50%</span>';
            html += '        </div>';
            html += '        <div class="flex justify-between items-center text-xs">';
            html += '          <span class="text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><i data-lucide="landmark" class="w-3.5 h-3.5 text-indigo-500"></i> Laba Ditahan (Ekspansi)</span>';
            html += '          <span id="psa-retained-earnings" class="font-semibold text-slate-700 dark:text-slate-300">' + Utils.formatRupiah(Math.round(initialRetained)) + '</span>';
            html += '        </div>';
            html += '      </div>';
            html += '    </div>';

            // Kolom 3: Rincian Nilai Aset Fisik
            html += '    <div class="space-y-4">';
            html += '      <span class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">3. Rincian Nilai Aset Fisik</span>';
            
            var asetObat = nilaiInventaris;
            var totalAsetFisik = asetObat + asetPeralatan + asetPerlengkapan;

            var pctObat = totalAsetFisik > 0 ? Math.round((asetObat / totalAsetFisik) * 100) : 0;
            var pctPeralatan = totalAsetFisik > 0 ? Math.round((asetPeralatan / totalAsetFisik) * 100) : 0;
            var pctPerlengkapan = totalAsetFisik > 0 ? Math.round((asetPerlengkapan / totalAsetFisik) * 100) : 0;

            html += '      <div class="space-y-3">';
            // Aset Obat
            html += '        <div>';
            html += '          <div class="flex justify-between text-xs mb-1">';
            html += '            <span class="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-indigo-500"></span>Total Aset Obat</span>';
            html += '            <span class="font-bold text-slate-800 dark:text-slate-200">' + Utils.formatRupiah(Math.round(asetObat)) + ' (' + pctObat + '%)</span>';
            html += '          </div>';
            html += '          <div class="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">';
            html += '            <div class="bg-indigo-500 h-full rounded-full" style="width: ' + pctObat + '%"></div>';
            html += '          </div>';
            html += '        </div>';

            // Aset Peralatan
            html += '        <div>';
            html += '          <div class="flex justify-between text-xs mb-1">';
            html += '            <span class="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500"></span>Total Aset Peralatan</span>';
            html += '            <span class="font-bold text-slate-800 dark:text-slate-200">' + Utils.formatRupiah(Math.round(asetPeralatan)) + ' (' + pctPeralatan + '%)</span>';
            html += '          </div>';
            html += '          <div class="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">';
            html += '            <div class="bg-emerald-500 h-full rounded-full" style="width: ' + pctPeralatan + '%"></div>';
            html += '          </div>';
            html += '        </div>';

            // Aset Perlengkapan
            html += '        <div>';
            html += '          <div class="flex justify-between text-xs mb-1">';
            html += '            <span class="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-amber-500"></span>Total Aset Perlengkapan</span>';
            html += '            <span class="font-bold text-slate-800 dark:text-slate-200">' + Utils.formatRupiah(Math.round(asetPerlengkapan)) + ' (' + pctPerlengkapan + '%)</span>';
            html += '          </div>';
            html += '          <div class="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">';
            html += '            <div class="bg-amber-500 h-full rounded-full" style="width: ' + pctPerlengkapan + '%"></div>';
            html += '          </div>';
            html += '        </div>';

            html += '      </div>';
            html += '    </div>';

            html += '  </div>';
            html += '</div>';

            html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">';
            // Left Card: Financial breakdown
            html += '  <div class="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">';
            html += '    <h3 class="font-bold mb-4 text-gray-800 dark:text-white flex items-center gap-2"><i data-lucide="activity" class="w-5 h-5 text-indigo-500"></i> Kesehatan Finansial & Aset</h3>';
            html += '    <div class="space-y-3.5">';
            html += '      <div class="flex justify-between text-sm"><span class="text-slate-500 flex items-center gap-1.5"><i data-lucide="plus-circle" class="w-4 h-4 text-green-500"></i> Kas Masuk (Omzet)</span><span class="font-bold text-green-600">+ ' + Utils.formatRupiah(omzetBulan) + '</span></div>';
            html += '      <div class="flex justify-between text-sm border-b pb-2"><span class="text-slate-500 flex items-center gap-1.5"><i data-lucide="minus-circle" class="w-4 h-4 text-red-500"></i> Pembelian Tunai</span><span class="font-bold text-red-600">- ' + Utils.formatRupiah(beliTunai) + '</span></div>';
            html += '      <div class="flex justify-between text-sm border-b pb-2"><span class="text-slate-500 flex items-center gap-1.5"><i data-lucide="minus-circle" class="w-4 h-4 text-orange-500"></i> Beban Operasional</span><span class="font-bold text-red-600">- ' + Utils.formatRupiah(bebanOp) + '</span></div>';
            html += '      <div class="flex justify-between text-sm border-b pb-2"><span class="text-slate-500 flex items-center gap-1.5"><i data-lucide="award" class="w-4 h-4 text-blue-500"></i> Estimasi HPP</span><span class="font-bold text-slate-700 dark:text-slate-300">- ' + Utils.formatRupiah(hppBulan) + '</span></div>';
            html += '      <div class="flex justify-between text-sm border-b pb-2"><span class="text-slate-500 flex items-center gap-1.5"><i data-lucide="coins" class="w-4 h-4 text-yellow-500"></i> Estimasi Laba Kotor</span><span class="font-bold text-yellow-600">' + Utils.formatRupiah(labaKotor) + '</span></div>';
            html += '      <div class="flex justify-between border-t mt-4 pt-3 text-sm font-bold bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg">';
            html += '        <span class="flex items-center gap-1.5"><i data-lucide="badge-dollar-sign" class="w-4 h-4 text-primary-500"></i> Net Profit Margin</span>';
            var marginPct = omzetBulan > 0 ? ((labaBersih / omzetBulan) * 100).toFixed(1) : '0';
            html += '        <span class="' + (labaBersih >= 0 ? 'text-green-600' : 'text-red-600') + '">' + Utils.formatRupiah(labaBersih) + ' (' + marginPct + '%)</span>';
            html += '      </div>';
            html += '    </div>';
            html += '  </div>';

            // Right Card: Strategic actions
            html += '  <div class="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">';
            html += '    <h3 class="font-bold mb-4 text-gray-800 dark:text-white flex items-center gap-2"><i data-lucide="compass" class="w-5 h-5 text-emerald-500"></i> Navigasi & Pengawasan PSA</h3>';
            html += '    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">';
            
            // 1. Laporan Keuangan (fixed path)
            html += '      <button onclick="navigateTo(\'keuangan/laporanKeuangan\', \'Laporan Keuangan\')" class="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl border border-slate-150 dark:border-slate-700/60 transition-all text-left group">';
            html += '        <div class="flex items-center gap-3">';
            html += '          <div class="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg"><i data-lucide="bar-chart-3" class="w-5 h-5"></i></div>';
            html += '          <div><p class="font-semibold text-xs text-slate-800 dark:text-slate-200">Lap. Keuangan</p><p class="text-[10px] text-slate-400">Neraca & Buku Kas</p></div>';
            html += '        </div>';
            html += '        <i data-lucide="arrow-right" class="w-4 h-4 text-slate-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-transform"></i>';
            html += '      </button>';

            // 2. Rangkuman Aktivitas (fixed path)
            html += '      <button onclick="navigateTo(\'keuangan/rangkumanBulanan\', \'Rangkuman Aktivitas\')" class="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl border border-slate-150 dark:border-slate-700/60 transition-all text-left group">';
            html += '        <div class="flex items-center gap-3">';
            html += '          <div class="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg"><i data-lucide="calendar-range" class="w-5 h-5"></i></div>';
            html += '          <div><p class="font-semibold text-xs text-slate-800 dark:text-slate-200">Rangkuman Aktivitas</p><p class="text-[10px] text-slate-400">Analisis Kinerja Bulanan</p></div>';
            html += '        </div>';
            html += '        <i data-lucide="arrow-right" class="w-4 h-4 text-slate-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-transform"></i>';
            html += '      </button>';

            // 3. Jejak Audit
            html += '      <button onclick="navigateTo(\'laporan/auditTrail\', \'Jejak Audit\')" class="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl border border-slate-150 dark:border-slate-700/60 transition-all text-left group">';
            html += '        <div class="flex items-center gap-3">';
            html += '          <div class="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg"><i data-lucide="history" class="w-5 h-5"></i></div>';
            html += '          <div><p class="font-semibold text-xs text-slate-800 dark:text-slate-200">Jejak Audit</p><p class="text-[10px] text-slate-400">Log Aktivitas Keamanan</p></div>';
            html += '        </div>';
            html += '        <i data-lucide="arrow-right" class="w-4 h-4 text-slate-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-transform"></i>';
            html += '      </button>';

            // 4. Rekam Medis (added)
            html += '      <button onclick="navigateTo(\'klinik/rekamMedis\', \'Rekam Medis\')" class="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl border border-slate-150 dark:border-slate-700/60 transition-all text-left group">';
            html += '        <div class="flex items-center gap-3">';
            html += '          <div class="p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg"><i data-lucide="file-heart" class="w-5 h-5"></i></div>';
            html += '          <div><p class="font-semibold text-xs text-slate-800 dark:text-slate-200">Rekam Medis</p><p class="text-[10px] text-slate-400">Catatan Medis Pasien</p></div>';
            html += '        </div>';
            html += '        <i data-lucide="arrow-right" class="w-4 h-4 text-slate-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-transform"></i>';
            html += '      </button>';

            // 5. Data Karyawan (added)
            html += '      <button onclick="navigateTo(\'manajemen/karyawan\', \'Karyawan\')" class="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl border border-slate-150 dark:border-slate-700/60 transition-all text-left group">';
            html += '        <div class="flex items-center gap-3">';
            html += '          <div class="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg"><i data-lucide="user-check" class="w-5 h-5"></i></div>';
            html += '          <div><p class="font-semibold text-xs text-slate-800 dark:text-slate-200">Data Karyawan</p><p class="text-[10px] text-slate-400">Kelola Staf & Kehadiran</p></div>';
            html += '        </div>';
            html += '        <i data-lucide="arrow-right" class="w-4 h-4 text-slate-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-transform"></i>';
            html += '      </button>';

            // 6. Display Antrian (added)
            html += '      <button onclick="navigateTo(\'pengaturan/displayAntrian\', \'Display Antrian\')" class="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl border border-slate-150 dark:border-slate-700/60 transition-all text-left group">';
            html += '        <div class="flex items-center gap-3">';
            html += '          <div class="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg"><i data-lucide="tv" class="w-5 h-5"></i></div>';
            html += '          <div><p class="font-semibold text-xs text-slate-800 dark:text-slate-200">Display Antrian</p><p class="text-[10px] text-slate-400">Pengaturan Layar Antrean</p></div>';
            html += '        </div>';
            html += '        <i data-lucide="arrow-right" class="w-4 h-4 text-slate-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-transform"></i>';
            html += '      </button>';

            // 7. SatuSehat Kemenkes
            html += '      <button onclick="navigateTo(\'pengaturan/satusehat\', \'SatuSehat Kemenkes\')" class="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl border border-slate-150 dark:border-slate-700/60 transition-all text-left group">';
            html += '        <div class="flex items-center gap-3">';
            html += '          <div class="p-2 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-lg"><i data-lucide="heart-pulse" class="w-5 h-5"></i></div>';
            html += '          <div><p class="font-semibold text-xs text-slate-800 dark:text-slate-200">SatuSehat Kemenkes</p><p class="text-[10px] text-slate-400">Integrasi Data Rekam Medis</p></div>';
            html += '        </div>';
            html += '        <i data-lucide="arrow-right" class="w-4 h-4 text-slate-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-transform"></i>';
            html += '      </button>';

            // 8. Ringkasan Obat Terlaris
            html += '      <button onclick="navigateTo(\'apotek/obatTerlaris\', \'Ringkasan Obat Terlaris\')" class="flex items-center justify-between p-3.5 bg-amber-500/10 dark:bg-amber-950/20 hover:bg-amber-500/20 rounded-xl border border-amber-200 dark:border-amber-800 transition-all text-left group">';
            html += '        <div class="flex items-center gap-3">';
            html += '          <div class="p-2 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-lg"><i data-lucide="trending-up" class="w-5 h-5"></i></div>';
            html += '          <div><p class="font-bold text-xs text-slate-800 dark:text-slate-100">Obat Terlaris</p><p class="text-[10px] text-amber-700 dark:text-amber-300 font-medium">Rank Sales Laku - Tidak Laku</p></div>';
            html += '        </div>';
            html += '        <i data-lucide="arrow-right" class="w-4 h-4 text-amber-600 group-hover:translate-x-1 transition-transform"></i>';
            html += '      </button>';
            html += '    </div>';
            html += '  </div>';
            html += '</div>';

            // Container for Audit Logs
            html += '<div id="dashboard-audit-log-container" class="mt-6"></div>';

            document.getElementById('dashboard-content').innerHTML = html;
            lucide.createIcons();
            self.initAuditLogs();

            // Saring transaksi hari ini saja untuk grafik
            var todayTrxs = [];
            results[0].forEach(function(doc) {
                if (doc.data().tanggal === today) {
                    todayTrxs.push(doc);
                }
            });
            self.renderDailySalesChart(todayTrxs);
        }).catch(function(err) {
            document.getElementById('dashboard-content').innerHTML = '<div class="bg-white dark:bg-slate-800 p-6 rounded-xl border text-center text-red-500">Gagal memuat dashboard: ' + (err && err.message ? err.message : err) + '</div>';
        });
    },

    renderDefault: function() {
        document.getElementById('dashboard-content').innerHTML = '<div class="bg-white p-6 rounded-xl border text-center">Selamat datang di Aulia Apotek Klinik</div>';
    },

    // ===== AUDIT LOG INTEGRATION =====
    initAuditLogs: function() {
        var self = this;
        var container = document.getElementById('dashboard-audit-log-container');
        if (!container) return;

        // Keamanan tambahan di client: cek apakah role pengguna memang admin, keuangan, atau psa
        var role = window.currentRole || 'apotek';
        if (role !== 'admin' && role !== 'keuangan' && role !== 'psa') {
            container.innerHTML = '';
            container.classList.add('hidden');
            return;
        }

        container.innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm"><div class="flex justify-center py-6"><div class="spinner"></div></div></div>';

        db.collection('auditLog')
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get()
            .then(function(snap) {
                self.auditLogState.rawEntries = [];
                snap.forEach(function(doc) {
                    var d = doc.data();
                    d.id = doc.id;
                    self.auditLogState.rawEntries.push(d);
                });
                self.applyAuditLogFilter();
            })
            .catch(function(err) {
                console.warn('Dashboard Audit Log fetch status:', err.message || err);
                if (err.code === 'permission-denied' || err.message.indexOf('permissions') !== -1) {
                    container.innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-amber-200 dark:border-amber-950 p-6 text-center text-amber-600 dark:text-amber-400 text-sm">Anda tidak memiliki hak akses untuk melihat riwayat aktivitas di dashboard ini.</div>';
                } else {
                    container.innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-red-200 dark:border-red-900/30 p-6 text-center text-red-500 text-sm">Gagal memuat riwayat aktivitas: ' + Utils.escapeHtml(err.message) + '</div>';
                }
            });
    },

    applyAuditLogFilter: function() {
        var self = this;
        var startInp = document.getElementById('db-log-start');
        var endInp = document.getElementById('db-log-end');

        self.auditLogState.filterDateStart = startInp ? startInp.value : '';
        self.auditLogState.filterDateEnd = endInp ? endInp.value : '';

        self.auditLogState.filteredEntries = self.auditLogState.rawEntries.filter(function(log) {
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

                if (self.auditLogState.filterDateStart) {
                    var startDate = new Date(self.auditLogState.filterDateStart);
                    startDate.setHours(0,0,0,0);
                    if (logDateStripped < startDate) return false;
                }

                if (self.auditLogState.filterDateEnd) {
                    var endDate = new Date(self.auditLogState.filterDateEnd);
                    endDate.setHours(0,0,0,0);
                    if (logDateStripped > endDate) return false;
                }
            } else if (self.auditLogState.filterDateStart || self.auditLogState.filterDateEnd) {
                return false;
            }
            return true;
        });

        self.renderAuditLogTable();
    },

    renderAuditLogTable: function() {
        var self = this;
        var container = document.getElementById('dashboard-audit-log-container');
        if (!container) return;

        var html = '';
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">';
        
        // Header & Date Filter
        html += '  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-700/60 pb-4">';
        html += '    <div>';
        html += '      <h3 class="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-base">';
        html += '        <i data-lucide="history" class="w-5 h-5 text-primary-500"></i> Riwayat Aktivitas Pengguna';
        html += '      </h3>';
        html += '      <p class="text-xs text-slate-400 dark:text-slate-500">Jejak aktivitas keamanan dan transaksi finansial terbaru</p>';
        html += '    </div>';
        
        // Date Filter Inputs
        html += '    <div class="flex flex-wrap items-center gap-2 text-xs">';
        html += '      <div class="flex items-center gap-1.5">';
        html += '        <span class="text-slate-400 dark:text-slate-400">Dari:</span>';
        html += '        <input type="date" id="db-log-start" value="' + self.auditLogState.filterDateStart + '" onchange="AppDashboard.applyAuditLogFilter()" class="px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg outline-none focus:border-primary-500">';
        html += '      </div>';
        html += '      <div class="flex items-center gap-1.5">';
        html += '        <span class="text-slate-400 dark:text-slate-400">Sampai:</span>';
        html += '        <input type="date" id="db-log-end" value="' + self.auditLogState.filterDateEnd + '" onchange="AppDashboard.applyAuditLogFilter()" class="px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg outline-none focus:border-primary-500">';
        html += '      </div>';
        html += '      <button onclick="AppDashboard.resetAuditLogFilters()" title="Reset Filter" class="p-1.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 text-slate-500 hover:text-red-500 rounded-lg flex items-center justify-center transition-colors">';
        html += '        <i data-lucide="rotate-ccw" class="w-4 h-4"></i>';
        html += '      </button>';
        html += '    </div>';
        html += '  </div>';

        if (self.auditLogState.filteredEntries.length === 0) {
            html += '  <div class="py-8 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center gap-2">';
            html += '    <i data-lucide="history" class="w-10 h-10 text-slate-300 dark:text-slate-600"></i>';
            html += '    <p class="font-medium text-sm text-slate-500 dark:text-slate-400">Tidak ada aktivitas ditemukan</p>';
            html += '    <p class="text-xs text-slate-400 dark:text-slate-500">Coba ubah filter rentang tanggal Anda</p>';
            html += '  </div>';
            html += '</div>';
            container.innerHTML = html;
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

        // Table
        html += '  <div class="overflow-x-auto">';
        html += '    <table class="w-full text-xs text-left">';
        html += '      <thead class="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700">';
        html += '        <tr>';
        html += '          <th class="px-4 py-3 font-semibold">Waktu</th>';
        html += '          <th class="px-3 py-3 font-semibold">Aksi</th>';
        html += '          <th class="px-3 py-3 font-semibold">Modul</th>';
        html += '          <th class="px-4 py-3 font-semibold">Deskripsi</th>';
        html += '          <th class="px-3 py-3 font-semibold">Operator</th>';
        html += '          <th class="px-4 py-3 font-semibold text-right">Nominal</th>';
        html += '        </tr>';
        html += '      </thead>';
        html += '      <tbody class="divide-y divide-slate-100 dark:divide-slate-700">';

        var entriesToShow = self.auditLogState.filteredEntries.slice(0, self.auditLogState.limit);

        entriesToShow.forEach(function(log) {
            var waktu = '-';
            if (log.createdAt) {
                var d = new Date();
                if (typeof log.createdAt.toDate === 'function') {
                    d = log.createdAt.toDate();
                } else if (log.createdAt.seconds) {
                    d = new Date(log.createdAt.seconds * 1000);
                }
                waktu = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ', ' +
                        d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            }

            var badgeClass = aksiBadge[log.aksi] || aksiBadge.lainnya;
            var nominalHtml = '-';
            if (typeof log.nominal === 'number' && log.nominal !== null) {
                nominalHtml = '<span class="font-bold text-slate-700 dark:text-slate-200">' + Utils.formatRupiah(log.nominal) + '</span>';
            }

            var labelRole = log.role ? '<span class="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1 py-0.5 rounded ml-1 font-mono uppercase">' + Utils.escapeHtml(log.role) + '</span>' : '';

            html += '    <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">';
            html += '      <td class="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">' + waktu + '</td>';
            html += '      <td class="px-3 py-3 whitespace-nowrap">';
            html += '        <span class="text-[9px] font-bold px-2 py-0.5 rounded-full border ' + badgeClass + '">' + (log.aksi || 'lainnya').toUpperCase() + '</span>';
            html += '      </td>';
            html += '      <td class="px-3 py-3 whitespace-nowrap font-semibold text-slate-600 dark:text-slate-300">' + Utils.escapeHtml(log.modul || '-') + '</td>';
            html += '      <td class="px-4 py-3 text-gray-700 dark:text-slate-200 leading-relaxed max-w-xs truncate font-medium" title="' + Utils.escapeHtml(log.deskripsi || '-') + '">';
            html += '        ' + Utils.escapeHtml(log.deskripsi || '-');
            html += '      </td>';
            html += '      <td class="px-3 py-3 whitespace-nowrap text-gray-700 dark:text-slate-200">';
            html += '        <div class="flex items-center gap-1">';
            html += '          <span class="font-semibold">' + Utils.escapeHtml(log.oleh || '-') + '</span>';
            html += '          ' + labelRole;
            html += '        </div>';
            html += '      </td>';
            html += '      <td class="px-4 py-3 text-right whitespace-nowrap font-semibold text-gray-700 dark:text-slate-200">' + nominalHtml + '</td>';
            html += '    </tr>';
        });

        html += '      </tbody>';
        html += '    </table>';
        html += '  </div>';

        if (self.auditLogState.filteredEntries.length > self.auditLogState.limit) {
            html += '  <div class="flex justify-center pt-2 border-t border-slate-100 dark:border-slate-700/60">';
            html += '    <button onclick="AppDashboard.loadMoreAuditLogs()" class="flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30">';
            html += '      <i data-lucide="chevrons-down" class="w-3.5 h-3.5"></i> Lihat Lebih Banyak (' + (self.auditLogState.filteredEntries.length - self.auditLogState.limit) + ')';
            html += '    </button>';
            html += '  </div>';
        }

        html += '</div>';

        container.innerHTML = html;
        if (window.lucide) lucide.createIcons();
    },

    resetAuditLogFilters: function() {
        var startInp = document.getElementById('db-log-start');
        var endInp = document.getElementById('db-log-end');
        if (startInp) startInp.value = '';
        if (endInp) endInp.value = '';

        this.auditLogState.filterDateStart = '';
        this.auditLogState.filterDateEnd = '';
        this.auditLogState.limit = 10;
        this.applyAuditLogFilter();
    },

    loadMoreAuditLogs: function() {
        this.auditLogState.limit += 15;
        this.renderAuditLogTable();
    },

    renderDailySalesChart: function(snapOrArray) {
        var container = document.getElementById('daily-sales-chart');
        if (!container) return;

        // Check if React, ReactDOM and Recharts are loaded
        if (!window.React || !window.ReactDOM || !window.Recharts) {
            // FIX: sebelumnya retry setTimeout tanpa batas -- kalau CDN (unpkg.com/
            // cdn.jsdelivr.net) benar-benar gagal dimuat (mis. tidak ada koneksi
            // internet, atau domain diblokir firewall), fungsi ini akan retry setiap
            // 300ms SELAMANYA tanpa pernah memberi tahu user apa yang salah -- baterai
            // & CPU device kasir terkuras diam-diam di background.
            this._chartLibRetryCount = (this._chartLibRetryCount || 0) + 1;
            if (this._chartLibRetryCount > 30) { // ~9 detik total
                container.innerHTML = '<div class="flex flex-col items-center justify-center h-full text-slate-400 text-sm py-12 gap-2">' +
                    '<span>Gagal memuat pustaka grafik (Recharts). Periksa koneksi internet Anda.</span>' +
                    '<button onclick="window.AppDashboard._chartLibRetryCount=0; window.AppDashboard.renderDailySalesChart(' + 'window.AppDashboard._lastChartData || null' + ')" class="text-primary-600 dark:text-primary-400 underline">Coba lagi</button>' +
                    '</div>';
                return;
            }
            container.innerHTML = '<div class="flex items-center justify-center h-full text-slate-400 text-sm py-12">Memuat pustaka grafik (Recharts)...</div>';
            setTimeout(function() {
                window.AppDashboard.renderDailySalesChart(snapOrArray);
            }, 300);
            return;
        }
        this._chartLibRetryCount = 0;
        this._lastChartData = snapOrArray;

        // Helper: Format date for display
        function formatDateDisplay(dateStr) {
            try {
                var parts = dateStr.split('-');
                if (parts.length === 3) {
                    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
                    var mIdx = parseInt(parts[1], 10) - 1;
                    return parts[2] + ' ' + (months[mIdx] || parts[1]) + ' ' + parts[0];
                }
            } catch(e) {}
            return dateStr;
        }

        // Helper: Get all date strings in range
        function getDatesInRange(startStr, endStr) {
            var dates = [];
            var current = new Date(startStr);
            var end = new Date(endStr);
            var safetyLimit = 0;
            while (current <= end && safetyLimit < 100) {
                dates.push(current.toISOString().split('T')[0]);
                current.setDate(current.getDate() + 1);
                safetyLimit++;
            }
            return dates;
        }

        // Helper: Process data based on whether start === end
        function processChartData(docs, start, end) {
            if (start === end) {
                // Hourly breakdown from 08:00 to 21:00
                var hourlyMap = {};
                for (var h = 8; h <= 21; h++) {
                    var key = String(h).padStart(2, '0') + ':00';
                    hourlyMap[key] = { label: key, Cash: 0, Transfer: 0, QRIS: 0, Total: 0 };
                }

                docs.forEach(function(t) {
                    if (!t) return;
                    var dateObj = null;
                    if (t.createdAt && typeof t.createdAt.toDate === 'function') {
                        dateObj = t.createdAt.toDate();
                    } else if (t.createdAt && t.createdAt.seconds) {
                        dateObj = new Date(t.createdAt.seconds * 1000);
                    } else {
                        dateObj = new Date();
                    }

                    var hourNum = dateObj.getHours();
                    var hourKey = String(hourNum).padStart(2, '0') + ':00';

                    // Fallback for transactions outside 08:00 - 21:00
                    if (!hourlyMap[hourKey]) {
                        hourlyMap[hourKey] = { label: hourKey, Cash: 0, Transfer: 0, QRIS: 0, Total: 0 };
                    }

                    var total = t.totalAkhir || 0;
                    var method = t.metodeBayar || 'cash';
                    if (method === 'cash') {
                        hourlyMap[hourKey].Cash += total;
                    } else if (method === 'transfer') {
                        hourlyMap[hourKey].Transfer += total;
                    } else if (method === 'qris') {
                        hourlyMap[hourKey].QRIS += total;
                    }
                    hourlyMap[hourKey].Total += total;
                });

                return Object.keys(hourlyMap).sort().map(function(k) {
                    return hourlyMap[k];
                });
            } else {
                // Daily trend
                var dailyMap = {};
                var dateList = getDatesInRange(start, end);
                dateList.forEach(function(d) {
                    var labelParts = d.split('-');
                    var niceLabel = labelParts.length === 3 ? labelParts[2] + '/' + labelParts[1] : d;
                    dailyMap[d] = { label: niceLabel, Cash: 0, Transfer: 0, QRIS: 0, Total: 0 };
                });

                docs.forEach(function(t) {
                    if (!t || !t.tanggal) return;
                    var d = t.tanggal;
                    if (!dailyMap[d]) return;

                    var total = t.totalAkhir || 0;
                    var method = t.metodeBayar || 'cash';
                    if (method === 'cash') {
                        dailyMap[d].Cash += total;
                    } else if (method === 'transfer') {
                        dailyMap[d].Transfer += total;
                    } else if (method === 'qris') {
                        dailyMap[d].QRIS += total;
                    }
                    dailyMap[d].Total += total;
                });

                return Object.keys(dailyMap).sort().map(function(k) {
                    return dailyMap[k];
                });
            }
        }

        // Extract initial documents data
        var initialDocs = [];
        if (snapOrArray && typeof snapOrArray.forEach === 'function') {
            snapOrArray.forEach(function(doc) {
                initialDocs.push(doc.data());
            });
        } else if (Array.isArray(snapOrArray)) {
            snapOrArray.forEach(function(doc) {
                if (doc && typeof doc.data === 'function') {
                    initialDocs.push(doc.data());
                } else if (doc) {
                    initialDocs.push(doc);
                }
            });
        }

        // React implementation
        try {
            var e = React.createElement;
            var _Recharts = window.Recharts;
            var ResponsiveContainer = _Recharts.ResponsiveContainer;
            var BarChart = _Recharts.BarChart;
            var Bar = _Recharts.Bar;
            var XAxis = _Recharts.XAxis;
            var YAxis = _Recharts.YAxis;
            var Tooltip = _Recharts.Tooltip;
            var CartesianGrid = _Recharts.CartesianGrid;

            function DailySalesContainer(props) {
                var initialData = props.initialDocs;
                var todayStr = Utils.today(); // FIX: pakai tanggal lokal, bukan UTC

                var _useState = React.useState(todayStr),
                    startDate = _useState[0],
                    setStartDate = _useState[1];

                var _useState2 = React.useState(todayStr),
                    endDate = _useState2[0],
                    setEndDate = _useState2[1];

                var _useState3 = React.useState(initialData),
                    data = _useState3[0],
                    setData = _useState3[1];

                var _useState4 = React.useState(false),
                    loading = _useState4[0],
                    setLoading = _useState4[1];

                var _useState5 = React.useState(null),
                    error = _useState5[0],
                    setError = _useState5[1];

                var _useState6 = React.useState('today'), // 'today', '7days', 'month', 'custom'
                    preset = _useState6[0],
                    setPreset = _useState6[1];

                // Effect to fetch data when dates change
                React.useEffect(function() {
                    // Skip initial fetch since we already have initialData for today
                    if (startDate === todayStr && endDate === todayStr && data === initialData) {
                        return;
                    }

                    var active = true;
                    setLoading(true);
                    setError(null);

                    db.collection('transaksi')
                        .where('tanggal', '>=', startDate)
                        .where('tanggal', '<=', endDate)
                        .get()
                        .then(function(qs) {
                            if (!active) return;
                            var list = [];
                            qs.forEach(function(doc) {
                                list.push(doc.data());
                            });
                            setData(list);
                            setLoading(false);
                        })
                        .catch(function(err) {
                            if (!active) return;
                            console.error('Error fetching range data:', err);
                            setError(err.message || 'Gagal memuat data transaksi');
                            setLoading(false);
                        });

                    return function() {
                        active = false;
                    };
                }, [startDate, endDate]);

                var selectPreset = function(p) {
                    setPreset(p);
                    var end = todayStr;
                    var start = todayStr;

                    if (p === 'today') {
                        start = todayStr;
                    } else if (p === '7days') {
                        var d = new Date();
                        d.setDate(d.getDate() - 6);
                        // FIX: sebelumnya toISOString() (UTC) bisa menggeser tanggal mundur/maju
                        // satu hari tergantung jam saat itu. Ambil dari komponen tanggal lokal.
                        start = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                    } else if (p === 'month') {
                        start = todayStr.slice(0, 8) + '01';
                    } else {
                        return;
                    }

                    setStartDate(start);
                    setEndDate(end);
                };

                var handleCustomStart = function(ev) {
                    setPreset('custom');
                    setStartDate(ev.target.value);
                };

                var handleCustomEnd = function(ev) {
                    setPreset('custom');
                    setEndDate(ev.target.value);
                };

                var chartData = processChartData(data, startDate, endDate);
                var totalSales = chartData.reduce(function(sum, d) { return sum + d.Total; }, 0);
                var totalCash = chartData.reduce(function(sum, d) { return sum + d.Cash; }, 0);
                var totalTransfer = chartData.reduce(function(sum, d) { return sum + d.Transfer; }, 0);
                var totalQRIS = chartData.reduce(function(sum, d) { return sum + d.QRIS; }, 0);

                var isSingleDay = startDate === endDate;
                var chartTitle = isSingleDay 
                    ? 'Ringkasan Penjualan Hari Ini (Daily Sales Summary)'
                    : 'Tren Penjualan Periode (' + formatDateDisplay(startDate) + ' s/d ' + formatDateDisplay(endDate) + ')';

                return e('div', { className: 'flex flex-col w-full h-full' },
                    // Title Header row
                    e('div', { className: 'flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4' },
                        e('h3', { className: 'font-bold text-gray-800 dark:text-white text-base' }, chartTitle),
                        e('div', { className: 'flex flex-wrap items-center gap-2' },
                            e('div', { className: 'inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-900 shadow-inner' },
                                e('button', {
                                    onClick: function() { selectPreset('today'); },
                                    className: 'px-3 py-1 text-xs font-semibold rounded-md transition-all ' + (preset === 'today' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm border border-slate-200/40 dark:border-slate-700/40' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white')
                                }, 'Hari Ini'),
                                e('button', {
                                    onClick: function() { selectPreset('7days'); },
                                    className: 'px-3 py-1 text-xs font-semibold rounded-md transition-all ' + (preset === '7days' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm border border-slate-200/40 dark:border-slate-700/40' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white')
                                }, '7 Hari'),
                                e('button', {
                                    onClick: function() { selectPreset('month'); },
                                    className: 'px-3 py-1 text-xs font-semibold rounded-md transition-all ' + (preset === 'month' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm border border-slate-200/40 dark:border-slate-700/40' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white')
                                }, 'Bulan Ini')
                            ),
                            e('div', { className: 'flex items-center gap-1.5 text-xs text-slate-400 font-medium' },
                                e('input', {
                                    type: 'date',
                                    value: startDate,
                                    onChange: handleCustomStart,
                                    max: endDate,
                                    className: 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500 shadow-sm'
                                }),
                                e('span', null, 's/d'),
                                e('input', {
                                    type: 'date',
                                    value: endDate,
                                    onChange: handleCustomEnd,
                                    min: startDate,
                                    className: 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500 shadow-sm'
                                })
                            )
                        )
                    ),

                    // Stats summary banner
                    e('div', { className: 'flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-slate-100 dark:border-slate-700/60 pb-4' },
                        e('div', null,
                            e('p', { className: 'text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider' }, isSingleDay ? 'Total Penjualan Hari Ini' : 'Total Penjualan Periode Ini'),
                            e('p', { className: 'text-2xl font-bold text-slate-800 dark:text-white mt-1' }, 'Rp ' + totalSales.toLocaleString('id-ID'))
                        ),
                        e('div', { className: 'flex flex-wrap gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300' },
                            e('div', { className: 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100/50 dark:border-emerald-900/30 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm' },
                                e('span', { className: 'w-2 h-2 rounded-full bg-[#10b981] inline-block shadow-sm shadow-emerald-500/20' }), 
                                'Cash: Rp ' + totalCash.toLocaleString('id-ID')
                            ),
                            e('div', { className: 'bg-blue-50 dark:bg-blue-950/30 border border-blue-100/50 dark:border-blue-900/30 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm' },
                                e('span', { className: 'w-2 h-2 rounded-full bg-[#3b82f6] inline-block shadow-sm shadow-blue-500/20' }), 
                                'Transfer: Rp ' + totalTransfer.toLocaleString('id-ID')
                            ),
                            e('div', { className: 'bg-purple-50 dark:bg-purple-950/30 border border-purple-100/50 dark:border-purple-900/30 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm' },
                                e('span', { className: 'w-2 h-2 rounded-full bg-[#8b5cf6] inline-block shadow-sm shadow-purple-500/20' }), 
                                'QRIS: Rp ' + totalQRIS.toLocaleString('id-ID')
                            )
                        )
                    ),

                    // Main visualization panel
                    e('div', { className: 'flex-1 min-h-[280px] w-full relative' },
                        loading && e('div', { className: 'absolute inset-0 bg-white/70 dark:bg-slate-800/70 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-lg' },
                            e('div', { className: 'flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300' },
                                e('div', { className: 'w-4 h-4 rounded-full border-2 border-primary-600 border-t-transparent animate-spin' }),
                                'Memuat data transaksi...'
                            )
                        ),
                        error ? e('div', { className: 'flex items-center justify-center h-full text-rose-500 text-sm font-medium py-12' }, error)
                        : chartData.length === 0 ? e('div', { className: 'flex items-center justify-center h-full text-slate-400 text-sm py-12' }, 'Tidak ada data transaksi pada rentang waktu ini')
                        : e(ResponsiveContainer, { width: '100%', height: '100%' },
                            e(BarChart, { data: chartData, margin: { top: 10, right: 10, left: -10, bottom: 0 } },
                                e(CartesianGrid, { strokeDasharray: '3 3', className: 'stroke-slate-200 dark:stroke-slate-700/50' }),
                                e(XAxis, { dataKey: 'label', style: { fontSize: '10px', fill: '#94a3b8', fontWeight: '500' } }),
                                e(YAxis, { 
                                    tickFormatter: function(v) { 
                                        if (v >= 1000000) return 'Rp' + (v / 1000000).toFixed(1) + 'jt';
                                        if (v >= 1000) return 'Rp' + (v / 1000).toFixed(0) + 'rb';
                                        return 'Rp' + v;
                                    }, 
                                    style: { fontSize: '10px', fill: '#94a3b8', fontWeight: '500' } 
                                }),
                                e(Tooltip, {
                                    formatter: function(value, name) {
                                        return ['Rp ' + value.toLocaleString('id-ID'), name];
                                    },
                                    contentStyle: { backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }
                                }),
                                e(Bar, { dataKey: 'Cash', fill: '#10b981', stackId: 'a', radius: isSingleDay ? [2, 2, 0, 0] : [1, 1, 0, 0] }),
                                e(Bar, { dataKey: 'Transfer', fill: '#3b82f6', stackId: 'a', radius: isSingleDay ? [2, 2, 0, 0] : [1, 1, 0, 0] }),
                                e(Bar, { dataKey: 'QRIS', fill: '#8b5cf6', stackId: 'a', radius: isSingleDay ? [2, 2, 0, 0] : [1, 1, 0, 0] })
                            )
                        )
                    )
                );
            }

            var root = ReactDOM.createRoot(container);
            root.render(e(DailySalesContainer, { initialDocs: initialDocs }));
        } catch (reactErr) {
            console.error('Error rendering Recharts component:', reactErr);
            container.innerHTML = '<div class="text-center py-10 text-red-500 text-sm">Gagal merender grafik: ' + reactErr.message + '</div>';
        }
    }
};