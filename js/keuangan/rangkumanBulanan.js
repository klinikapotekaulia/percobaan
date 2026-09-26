/**
 * js/keuangan/rangkumanBulanan.js
 * Rangkuman Aktivitas (Periode) — Menu Keuangan
 *
 * ISI (sesuai kebutuhan operasional apotek & klinik):
 * 1. Rangkuman Jumlah Obat Terjual — dipecah per kategori transaksi:
 *    a. Obat Bebas
 *    b. Resep Klinik
 *    c. Resep Luar
 *    (masing-masing: rincian per obat dengan harga beli, harga jual, total, & jumlah total)
 * 2. Rangkuman Jumlah Resep:
 *    a. Resep Klinik per dokter terlink (Pengaturan > Pembagian Hasil), dirinci per nama pasien
 *    b. Resep Luar per dokter (terlink maupun tidak terlink), dirinci per nama pasien
 * 3. Rangkuman Jumlah Tindakan Klinik:
 *    a. Tindakan Klinik — per jenis tindakan, jumlah & nominal
 *    b. Tindakan Apotek — per jenis tindakan, jumlah & nominal
 * 4. Rangkuman Jumlah Obat Racik — jumlah obat yang diracik & nominal jasa racik
 * 5. Rangkuman Pembulatan — jumlah transaksi yang mengandung pembulatan & total nominalnya
 *
 * SUMBER DATA: collection 'transaksi' (satu dokumen = satu transaksi kasir apotek), dengan field
 * tipe ('obat_bebas' | 'resep_klinik' | 'resep_luar'), items[], racikanItems[], tindakanItems[],
 * namaPasien, dokterId, dokterLuar, pembulatan — sesuai struktur yang ditulis apotek/transaksi.js.
 */

window.AppKeuanganRangkumanBulanan = {

    dataTransaksi: [],
    pengaturan: null,
    summary: null,

    // ========== RENDER ==========
    render: function() {
        var d = new Date();
        var awalBulan = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';
        var hariIni = Utils.today();

        var html = '<div class="page-enter max-w-6xl">';
        html += '  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">';
        html += '    <div>';
        html += '      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Rangkuman Aktivitas</h2>';
        html += '      <p class="text-sm text-slate-500 dark:text-slate-400">Rekap penjualan obat, resep, tindakan, racikan & pembulatan per periode</p>';
        html += '    </div>';
        html += '    <div class="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">';
        html += '      <label class="text-xs text-slate-400 pl-2">Dari</label>';
        html += '      <input type="date" id="rb-tgl-mulai" value="' + awalBulan + '" class="px-2 py-1.5 bg-transparent dark:text-white text-sm rounded-md outline-none">';
        html += '      <label class="text-xs text-slate-400">s/d</label>';
        html += '      <input type="date" id="rb-tgl-selesai" value="' + hariIni + '" class="px-2 py-1.5 bg-transparent dark:text-white text-sm rounded-md outline-none">';
        html += '      <button onclick="AppKeuanganRangkumanBulanan.init()" class="bg-primary-600 text-white text-sm px-4 py-1.5 rounded-md font-medium">Tampilkan</button>';
        html += '      <button onclick="AppKeuanganRangkumanBulanan.exportPDF()" class="bg-red-600 text-white text-sm px-3 py-1.5 rounded-md font-medium flex items-center gap-1" title="Export PDF"><i data-lucide="file-text" class="w-4 h-4"></i> PDF</button>';
        html += '      <button onclick="AppKeuanganRangkumanBulanan.exportExcel()" class="bg-emerald-600 text-white text-sm px-3 py-1.5 rounded-md font-medium flex items-center gap-1" title="Export Excel"><i data-lucide="download" class="w-4 h-4"></i></button>';
        html += '    </div>';
        html += '  </div>';

        html += '  <div id="rb-content"><div class="flex justify-center py-20"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    // ========== INIT / QUERY ==========
    init: function() {
        var self = this;
        var mulai = document.getElementById('rb-tgl-mulai').value;
        var selesai = document.getElementById('rb-tgl-selesai').value;

        if (!mulai || !selesai) { Utils.toast('Pilih tanggal mulai & selesai', 'error'); return; }
        if (mulai > selesai) { Utils.toast('Tanggal mulai tidak boleh lebih besar dari tanggal selesai', 'error'); return; }

        Utils.showLoading('rb-content');

        var pTrx = db.collection('transaksi').where('tanggal', '>=', mulai).where('tanggal', '<=', selesai).get();
        var pCfg = db.collection('pengaturanPembagian').doc('global').get();

        Promise.all([pTrx, pCfg]).then(function(results) {
            self.dataTransaksi = [];
            results[0].forEach(function(doc) { var d = doc.data(); d.id = doc.id; self.dataTransaksi.push(d); });

            self.pengaturan = results[1].exists ? results[1].data() : { resepKlinik: [], resepLuar: {} };

            self.hitungRangkuman(mulai, selesai);
        }).catch(function(err) {
            document.getElementById('rb-content').innerHTML =
                '<div class="text-center py-16"><p class="text-red-500 font-semibold">Gagal memuat: ' + Utils.escapeHtml(err.message) + '</p></div>';
        });
    },

    // ========== HELPER: nama dokter klinik dari dokterId (terlink Pengaturan > Pembagian) ==========
    _namaDokterKlinik: function(dokterId) {
        var cfg = this.pengaturan;
        if (!dokterId || !cfg || !Array.isArray(cfg.resepKlinik)) return 'Dokter Tidak Diketahui';
        var found = cfg.resepKlinik.find(function(d) { return d.dokterId === dokterId; });
        return (found && found.namaDokter) ? found.namaDokter : 'Dokter Tidak Diketahui';
    },

    // ========== HELPER: kelompokkan items obat menjadi rincian per obat ==========
    _kelompokObat: function(transaksiTipe) {
        var map = {};
        var totalQty = 0, totalHpp = 0, totalJual = 0;

        this.dataTransaksi.filter(function(t) { return t.tipe === transaksiTipe; }).forEach(function(t) {
            (t.items || []).forEach(function(it) {
                var key = it.obatId || it.namaObat;
                if (!map[key]) map[key] = { namaObat: it.namaObat || '-', jumlah: 0, hargaBeliSatuan: it.hargaBeli || 0, hargaJualSatuan: it.hargaJual || 0, totalHpp: 0, totalJual: 0 };
                var jml = it.jumlah || 0;
                var hpp = it.hargaBeli || 0;
                var jual = it.hargaJual || 0;
                map[key].jumlah += jml;
                map[key].totalHpp += jml * hpp;
                map[key].totalJual += jml * jual;
                totalQty += jml;
                totalHpp += jml * hpp;
                totalJual += jml * jual;
            });
        });

        var list = Object.keys(map).map(function(k) { return map[k]; });
        list.sort(function(a, b) { return b.totalJual - a.totalJual; });

        return { list: list, totalQty: totalQty, totalHpp: totalHpp, totalJual: totalJual };
    },

    // ========== HELPER: kelompokkan resep per dokter, dirinci per pasien ==========
    // tipeResep: 'resep_klinik' atau 'resep_luar'
    _kelompokResepPerDokter: function(tipeResep) {
        var self = this;
        var map = {}; // key dokter -> { namaDokter, totalResep, pasienMap: { namaPasien: jumlah } }

        this.dataTransaksi.filter(function(t) { return t.tipe === tipeResep; }).forEach(function(t) {
            var namaDokter, keyDokter;
            if (tipeResep === 'resep_klinik') {
                namaDokter = self._namaDokterKlinik(t.dokterId);
                keyDokter = t.dokterId || namaDokter;
            } else {
                namaDokter = t.dokterLuar || 'Dokter Tidak Diketahui';
                keyDokter = t.dokterId || namaDokter; // dokterId ada jika dokter terlink dari daftar Pembagian; null jika input manual (tidak terlink)
            }
            var namaPasien = t.namaPasien || 'Tanpa Nama';

            if (!map[keyDokter]) map[keyDokter] = { namaDokter: namaDokter, totalResep: 0, pasienMap: {} };
            map[keyDokter].totalResep += 1;
            map[keyDokter].pasienMap[namaPasien] = (map[keyDokter].pasienMap[namaPasien] || 0) + 1;
        });

        var list = Object.keys(map).map(function(k) {
            var d = map[k];
            var pasienList = Object.keys(d.pasienMap).map(function(p) { return { namaPasien: p, jumlah: d.pasienMap[p] }; });
            pasienList.sort(function(a, b) { return b.jumlah - a.jumlah; });
            return { namaDokter: d.namaDokter, totalResep: d.totalResep, pasienList: pasienList };
        });
        list.sort(function(a, b) { return b.totalResep - a.totalResep; });

        var totalResep = list.reduce(function(s, d) { return s + d.totalResep; }, 0);
        return { list: list, totalResep: totalResep };
    },

    // ========== HELPER: kelompokkan tindakan per jenis (klinik/apotek) ==========
    _kelompokTindakan: function(kategori) {
        var map = {};
        var totalJumlah = 0, totalNominal = 0;

        this.dataTransaksi.forEach(function(t) {
            (t.tindakanItems || []).forEach(function(ti) {
                if (ti.kategori !== kategori) return;
                var key = ti.namaTindakan || '-';
                if (!map[key]) map[key] = { namaTindakan: key, jumlah: 0, nominal: 0 };
                map[key].jumlah += 1;
                map[key].nominal += (ti.hargaJual || 0);
                totalJumlah += 1;
                totalNominal += (ti.hargaJual || 0);
            });
        });

        var list = Object.keys(map).map(function(k) { return map[k]; });
        list.sort(function(a, b) { return b.nominal - a.nominal; });

        return { list: list, totalJumlah: totalJumlah, totalNominal: totalNominal };
    },

    // ========== KALKULASI ==========
    hitungRangkuman: function(mulai, selesai) {
        var self = this;

        // 1. Obat terjual — dipecah per tipe transaksi
        var obatBebas = this._kelompokObat('obat_bebas');
        var obatResepKlinik = this._kelompokObat('resep_klinik');
        var obatResepLuar = this._kelompokObat('resep_luar');

        // 2. Resep per dokter (+ per pasien)
        var resepKlinik = this._kelompokResepPerDokter('resep_klinik');
        var resepLuar = this._kelompokResepPerDokter('resep_luar');

        // 3. Tindakan per jenis
        var tindakanKlinik = this._kelompokTindakan('klinik');
        var tindakanApotek = this._kelompokTindakan('apotek');

        // 4. Obat racik: jumlah item diracik & total nominal jasa racik (dari field totalRacik per transaksi)
        var totalObatRacikQty = 0, totalObatRacikNominal = 0;
        this.dataTransaksi.forEach(function(t) {
            totalObatRacikQty += (t.racikanItems || []).length;
            totalObatRacikNominal += (t.totalRacik || 0);
        });

        // 5. Pembulatan: jumlah transaksi yang punya pembulatan (>0) & total nominalnya
        var jumlahTrxPembulatan = 0, totalPembulatan = 0;
        this.dataTransaksi.forEach(function(t) {
            if ((t.pembulatan || 0) > 0) {
                jumlahTrxPembulatan += 1;
                totalPembulatan += t.pembulatan;
            }
        });

        this.summary = {
            mulai: mulai, selesai: selesai,
            obatBebas: obatBebas, obatResepKlinik: obatResepKlinik, obatResepLuar: obatResepLuar,
            resepKlinik: resepKlinik, resepLuar: resepLuar,
            tindakanKlinik: tindakanKlinik, tindakanApotek: tindakanApotek,
            totalObatRacikQty: totalObatRacikQty, totalObatRacikNominal: totalObatRacikNominal,
            jumlahTrxPembulatan: jumlahTrxPembulatan, totalPembulatan: totalPembulatan
        };

        this.renderReport();
    },

    // ========== SUB-RENDER: 1 tabel rincian obat per kategori ==========
    _renderTabelObat: function(judul, warnaIcon, data) {
        var html = '<div class="mb-6 last:mb-0">';
        html += '  <p class="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-' + warnaIcon + '-500 inline-block"></span>' + judul + '</p>';
        html += '  <div class="overflow-x-auto border border-slate-100 dark:border-slate-700 rounded-lg">';
        html += '    <table class="w-full text-sm">';
        html += '      <thead class="bg-slate-50 dark:bg-slate-900"><tr class="text-xs text-slate-500 uppercase">';
        html += '        <th class="px-3 py-2 text-left">Nama Obat</th><th class="px-3 py-2 text-right">Jumlah</th><th class="px-3 py-2 text-right">Harga Beli</th><th class="px-3 py-2 text-right">Harga Jual</th><th class="px-3 py-2 text-right">Total Beli</th><th class="px-3 py-2 text-right">Total Jual</th>';
        html += '      </tr></thead><tbody>';
        if (data.list.length === 0) {
            html += '<tr><td colspan="6" class="text-center py-4 text-slate-400 text-sm">Tidak ada data pada periode ini.</td></tr>';
        } else {
            data.list.forEach(function(o) {
                html += '<tr class="border-t border-slate-100 dark:border-slate-700">';
                html += '<td class="px-3 py-2 font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(o.namaObat) + '</td>';
                html += '<td class="px-3 py-2 text-right">' + o.jumlah + '</td>';
                html += '<td class="px-3 py-2 text-right text-slate-500">' + Utils.formatRupiah(o.hargaBeliSatuan) + '</td>';
                html += '<td class="px-3 py-2 text-right text-slate-500">' + Utils.formatRupiah(o.hargaJualSatuan) + '</td>';
                html += '<td class="px-3 py-2 text-right text-slate-500">' + Utils.formatRupiah(o.totalHpp) + '</td>';
                html += '<td class="px-3 py-2 text-right font-medium">' + Utils.formatRupiah(o.totalJual) + '</td>';
                html += '</tr>';
            });
        }
        html += '      </tbody>';
        html += '      <tfoot><tr class="border-t-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-bold text-sm">';
        html += '        <td class="px-3 py-2">Jumlah Total</td>';
        html += '        <td class="px-3 py-2 text-right">' + data.totalQty + '</td>';
        html += '        <td class="px-3 py-2"></td><td class="px-3 py-2"></td>';
        html += '        <td class="px-3 py-2 text-right">' + Utils.formatRupiah(data.totalHpp) + '</td>';
        html += '        <td class="px-3 py-2 text-right text-primary-600">' + Utils.formatRupiah(data.totalJual) + '</td>';
        html += '      </tr></tfoot>';
        html += '    </table>';
        html += '  </div>';
        html += '</div>';
        return html;
    },

    // ========== SUB-RENDER: blok resep per dokter + per pasien ==========
    _renderBlokResep: function(data, warna) {
        var html = '';
        if (data.list.length === 0) {
            html += '<p class="text-sm text-slate-400 italic">Tidak ada resep pada periode ini.</p>';
            return html;
        }
        data.list.forEach(function(dok) {
            html += '<div class="mb-3 last:mb-0 border border-slate-100 dark:border-slate-700 rounded-lg overflow-hidden">';
            html += '  <div class="flex justify-between items-center bg-' + warna + '-50 dark:bg-' + warna + '-900/20 px-3 py-2">';
            html += '    <span class="font-semibold text-gray-800 dark:text-white text-sm">' + Utils.escapeHtml(dok.namaDokter) + '</span>';
            html += '    <span class="font-bold text-' + warna + '-600 text-sm">' + dok.totalResep + ' Resep</span>';
            html += '  </div>';
            html += '  <div class="divide-y divide-slate-100 dark:divide-slate-700">';
            dok.pasienList.forEach(function(p) {
                html += '<div class="flex justify-between px-3 py-1.5 text-sm"><span class="text-slate-600 dark:text-slate-300">' + Utils.escapeHtml(p.namaPasien) + '</span><span class="text-slate-500">' + p.jumlah + ' Resep</span></div>';
            });
            html += '  </div>';
            html += '</div>';
        });
        return html;
    },

    // ========== SUB-RENDER: tabel tindakan per jenis ==========
    _renderTabelTindakan: function(data) {
        var html = '<div class="overflow-x-auto border border-slate-100 dark:border-slate-700 rounded-lg">';
        html += '  <table class="w-full text-sm">';
        html += '    <thead class="bg-slate-50 dark:bg-slate-900"><tr class="text-xs text-slate-500 uppercase">';
        html += '      <th class="px-3 py-2 text-left">Jenis Tindakan</th><th class="px-3 py-2 text-right">Jumlah</th><th class="px-3 py-2 text-right">Nominal</th>';
        html += '    </tr></thead><tbody>';
        if (data.list.length === 0) {
            html += '<tr><td colspan="3" class="text-center py-4 text-slate-400 text-sm">Tidak ada tindakan pada periode ini.</td></tr>';
        } else {
            data.list.forEach(function(t) {
                html += '<tr class="border-t border-slate-100 dark:border-slate-700">';
                html += '<td class="px-3 py-2 font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(t.namaTindakan) + '</td>';
                html += '<td class="px-3 py-2 text-right">' + t.jumlah + '</td>';
                html += '<td class="px-3 py-2 text-right font-medium">' + Utils.formatRupiah(t.nominal) + '</td>';
                html += '</tr>';
            });
        }
        html += '    </tbody>';
        html += '    <tfoot><tr class="border-t-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-bold text-sm">';
        html += '      <td class="px-3 py-2">Jumlah Total</td>';
        html += '      <td class="px-3 py-2 text-right">' + data.totalJumlah + '</td>';
        html += '      <td class="px-3 py-2 text-right text-primary-600">' + Utils.formatRupiah(data.totalNominal) + '</td>';
        html += '    </tr></tfoot>';
        html += '  </table>';
        html += '</div>';
        return html;
    },

    // ========== RENDER HASIL ==========
    renderReport: function() {
        var s = this.summary;
        var container = document.getElementById('rb-content');
        var html = '';

        html += '<div class="mb-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">';
        html += '  <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-500"></i>';
        html += '  <span>Periode dari <b class="text-gray-700 dark:text-white">' + s.mulai + '</b> sampai <b class="text-gray-700 dark:text-white">' + s.selesai + '</b></span>';
        html += '</div>';

        // ===== 1. RANGKUMAN OBAT TERJUAL =====
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6">';
        html += '  <h3 class="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><i data-lucide="pill" class="w-5 h-5 text-primary-500"></i> 1. Rangkuman Jumlah Obat Terjual</h3>';
        html += this._renderTabelObat('a. Obat Bebas', 'sky', s.obatBebas);
        html += this._renderTabelObat('b. Resep Klinik', 'blue', s.obatResepKlinik);
        html += this._renderTabelObat('c. Resep Luar', 'green', s.obatResepLuar);
        html += '</div>';

        // ===== 2. RANGKUMAN JUMLAH RESEP =====
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6">';
        html += '  <h3 class="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><i data-lucide="file-text" class="w-5 h-5 text-blue-500"></i> 2. Rangkuman Jumlah Resep</h3>';

        html += '  <div class="mb-5">';
        html += '    <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">a. Resep Klinik (dokter terlink)</p>';
        html += this._renderBlokResep(s.resepKlinik, 'blue');
        html += '    <div class="flex justify-between text-sm mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 font-bold"><span>Total Resep Klinik</span><span class="text-blue-600">' + s.resepKlinik.totalResep + ' Resep</span></div>';
        html += '  </div>';

        html += '  <div>';
        html += '    <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">b. Resep Luar (dokter terlink & tidak terlink)</p>';
        html += this._renderBlokResep(s.resepLuar, 'green');
        html += '    <div class="flex justify-between text-sm mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 font-bold"><span>Total Resep Luar</span><span class="text-green-600">' + s.resepLuar.totalResep + ' Resep</span></div>';
        html += '  </div>';
        html += '</div>';

        // ===== 3. RANGKUMAN JUMLAH TINDAKAN KLINIK =====
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6">';
        html += '  <h3 class="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><i data-lucide="stethoscope" class="w-5 h-5 text-purple-500"></i> 3. Rangkuman Jumlah Tindakan Klinik</h3>';
        html += '  <div class="mb-5">';
        html += '    <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">a. Tindakan Klinik</p>';
        html += this._renderTabelTindakan(s.tindakanKlinik);
        html += '  </div>';
        html += '  <div>';
        html += '    <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">b. Tindakan Apotek</p>';
        html += this._renderTabelTindakan(s.tindakanApotek);
        html += '  </div>';
        html += '</div>';

        // ===== 4. RANGKUMAN JUMLAH OBAT RACIK =====
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6">';
        html += '  <h3 class="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><i data-lucide="flask-conical" class="w-5 h-5 text-amber-500"></i> 4. Rangkuman Jumlah Obat Racik</h3>';
        html += '  <div class="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">';
        html += '    <span class="text-sm text-slate-600 dark:text-slate-300">Jumlah obat yang diracik (resep klinik & resep luar)</span>';
        html += '    <div class="flex items-center gap-4">';
        html += '      <span class="font-bold text-amber-600">' + s.totalObatRacikQty + ' Obat</span>';
        html += '      <span class="font-bold text-amber-600">' + Utils.formatRupiah(s.totalObatRacikNominal) + '</span>';
        html += '    </div>';
        html += '  </div>';
        html += '</div>';

        // ===== 5. RANGKUMAN PEMBULATAN =====
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6">';
        html += '  <h3 class="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><i data-lucide="circle-dollar-sign" class="w-5 h-5 text-slate-500"></i> 5. Rangkuman Pembulatan</h3>';
        html += '  <div class="bg-slate-50 dark:bg-slate-900/40 rounded-lg p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">';
        html += '    <span class="text-sm text-slate-600 dark:text-slate-300">Jumlah transaksi dengan pembulatan</span>';
        html += '    <div class="flex items-center gap-4">';
        html += '      <span class="font-bold text-gray-800 dark:text-white">' + s.jumlahTrxPembulatan + ' Transaksi</span>';
        html += '      <span class="font-bold text-gray-800 dark:text-white">' + Utils.formatRupiah(s.totalPembulatan) + '</span>';
        html += '    </div>';
        html += '  </div>';
        html += '</div>';

        container.innerHTML = html;
        lucide.createIcons();
    },

    // ========== EXPORT PDF ==========
    exportPDF: function() {
        if (!this.summary) { Utils.toast('Tampilkan rangkuman dahulu sebelum export.', 'error'); return; }
        var s = this.summary;
        var { jsPDF } = window.jspdf;
        var doc = new jsPDF();

        var judulTabelObat = function(doc, judul, y) {
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.text(judul, 14, y);
            doc.setFont(undefined, 'normal');
        };

        var bodyObat = function(data) {
            var rows = data.list.map(function(o) {
                return [o.namaObat, String(o.jumlah), Utils.formatRupiah(o.hargaBeliSatuan), Utils.formatRupiah(o.hargaJualSatuan), Utils.formatRupiah(o.totalHpp), Utils.formatRupiah(o.totalJual)];
            });
            rows.push([{ content: 'Jumlah Total', styles: { fontStyle: 'bold' } }, { content: String(data.totalQty), styles: { fontStyle: 'bold' } }, '', '', { content: Utils.formatRupiah(data.totalHpp), styles: { fontStyle: 'bold' } }, { content: Utils.formatRupiah(data.totalJual), styles: { fontStyle: 'bold' } }]);
            return rows;
        };

        // ---------- HALAMAN 1: OBAT TERJUAL ----------
        doc.setFontSize(14);
        doc.text('Rangkuman Aktivitas', 105, 15, { align: 'center' });
        doc.setFontSize(10);
        doc.text('Periode: ' + s.mulai + ' s/d ' + s.selesai, 105, 21, { align: 'center' });

        doc.setFontSize(12);
        doc.text('1. Rangkuman Jumlah Obat Terjual', 14, 30);

        judulTabelObat(doc, 'a. Obat Bebas', 37);
        doc.autoTable({
            startY: 40, head: [['Nama Obat', 'Jumlah', 'Harga Beli', 'Harga Jual', 'Total Beli', 'Total Jual']],
            body: bodyObat(s.obatBebas), theme: 'grid', headStyles: { fillColor: [14, 165, 233] }, styles: { fontSize: 8 }
        });

        judulTabelObat(doc, 'b. Resep Klinik', doc.lastAutoTable.finalY + 8);
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 11, head: [['Nama Obat', 'Jumlah', 'Harga Beli', 'Harga Jual', 'Total Beli', 'Total Jual']],
            body: bodyObat(s.obatResepKlinik), theme: 'grid', headStyles: { fillColor: [37, 99, 235] }, styles: { fontSize: 8 }
        });

        judulTabelObat(doc, 'c. Resep Luar', doc.lastAutoTable.finalY + 8);
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 11, head: [['Nama Obat', 'Jumlah', 'Harga Beli', 'Harga Jual', 'Total Beli', 'Total Jual']],
            body: bodyObat(s.obatResepLuar), theme: 'grid', headStyles: { fillColor: [22, 163, 74] }, styles: { fontSize: 8 }
        });

        // ---------- HALAMAN 2: RESEP PER DOKTER ----------
        doc.addPage();
        doc.setFontSize(12);
        doc.text('2. Rangkuman Jumlah Resep', 14, 15);

        doc.setFontSize(10);
        doc.text('a. Resep Klinik (dokter terlink)', 14, 23);
        var bodyResepKlinik = [];
        s.resepKlinik.list.forEach(function(dok) {
            bodyResepKlinik.push([{ content: dok.namaDokter, styles: { fontStyle: 'bold', fillColor: [219, 234, 254] } }, { content: dok.totalResep + ' Resep', styles: { fontStyle: 'bold', fillColor: [219, 234, 254] } }]);
            dok.pasienList.forEach(function(p) { bodyResepKlinik.push(['   ' + p.namaPasien, p.jumlah + ' Resep']); });
        });
        if (bodyResepKlinik.length === 0) bodyResepKlinik.push(['Tidak ada resep pada periode ini.', '']);
        bodyResepKlinik.push([{ content: 'Total Resep Klinik', styles: { fontStyle: 'bold' } }, { content: s.resepKlinik.totalResep + ' Resep', styles: { fontStyle: 'bold' } }]);
        doc.autoTable({ startY: 27, head: [['Dokter / Pasien', 'Jumlah Resep']], body: bodyResepKlinik, theme: 'grid', headStyles: { fillColor: [37, 99, 235] }, styles: { fontSize: 8 } });

        doc.setFontSize(10);
        doc.text('b. Resep Luar (dokter terlink & tidak terlink)', 14, doc.lastAutoTable.finalY + 10);
        var bodyResepLuar = [];
        s.resepLuar.list.forEach(function(dok) {
            bodyResepLuar.push([{ content: dok.namaDokter, styles: { fontStyle: 'bold', fillColor: [220, 252, 231] } }, { content: dok.totalResep + ' Resep', styles: { fontStyle: 'bold', fillColor: [220, 252, 231] } }]);
            dok.pasienList.forEach(function(p) { bodyResepLuar.push(['   ' + p.namaPasien, p.jumlah + ' Resep']); });
        });
        if (bodyResepLuar.length === 0) bodyResepLuar.push(['Tidak ada resep pada periode ini.', '']);
        bodyResepLuar.push([{ content: 'Total Resep Luar', styles: { fontStyle: 'bold' } }, { content: s.resepLuar.totalResep + ' Resep', styles: { fontStyle: 'bold' } }]);
        doc.autoTable({ startY: doc.lastAutoTable.finalY + 14, head: [['Dokter / Pasien', 'Jumlah Resep']], body: bodyResepLuar, theme: 'grid', headStyles: { fillColor: [22, 163, 74] }, styles: { fontSize: 8 } });

        // ---------- HALAMAN 3: TINDAKAN, RACIK, PEMBULATAN ----------
        doc.addPage();
        doc.setFontSize(12);
        doc.text('3. Rangkuman Jumlah Tindakan Klinik', 14, 15);

        var bodyTindakan = function(data) {
            var rows = data.list.map(function(t) { return [t.namaTindakan, String(t.jumlah), Utils.formatRupiah(t.nominal)]; });
            rows.push([{ content: 'Jumlah Total', styles: { fontStyle: 'bold' } }, { content: String(data.totalJumlah), styles: { fontStyle: 'bold' } }, { content: Utils.formatRupiah(data.totalNominal), styles: { fontStyle: 'bold' } }]);
            return rows;
        };

        doc.setFontSize(10);
        doc.text('a. Tindakan Klinik', 14, 23);
        doc.autoTable({ startY: 27, head: [['Jenis Tindakan', 'Jumlah', 'Nominal']], body: bodyTindakan(s.tindakanKlinik), theme: 'grid', headStyles: { fillColor: [147, 51, 234] }, styles: { fontSize: 8 } });

        doc.text('b. Tindakan Apotek', 14, doc.lastAutoTable.finalY + 10);
        doc.autoTable({ startY: doc.lastAutoTable.finalY + 14, head: [['Jenis Tindakan', 'Jumlah', 'Nominal']], body: bodyTindakan(s.tindakanApotek), theme: 'grid', headStyles: { fillColor: [13, 148, 136] }, styles: { fontSize: 8 } });

        doc.setFontSize(12);
        doc.text('4. Rangkuman Jumlah Obat Racik', 14, doc.lastAutoTable.finalY + 12);
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 16, head: [['Jumlah Obat Diracik', 'Nominal']],
            body: [[s.totalObatRacikQty + ' Obat', Utils.formatRupiah(s.totalObatRacikNominal)]],
            theme: 'grid', headStyles: { fillColor: [217, 119, 6] }, styles: { fontSize: 8 }
        });

        doc.setFontSize(12);
        doc.text('5. Rangkuman Pembulatan', 14, doc.lastAutoTable.finalY + 12);
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 16, head: [['Jumlah Transaksi Pembulatan', 'Total Nominal']],
            body: [[s.jumlahTrxPembulatan + ' Transaksi', Utils.formatRupiah(s.totalPembulatan)]],
            theme: 'grid', headStyles: { fillColor: [71, 85, 105] }, styles: { fontSize: 8 }
        });

        doc.save('Rangkuman_Aktivitas_' + s.mulai + '_sd_' + s.selesai + '.pdf');
        Utils.toast('Rangkuman berhasil diexport ke PDF!', 'success');
    },

    // ========== EXPORT EXCEL ==========
    exportExcel: function() {
        if (!this.summary) { Utils.toast('Tampilkan rangkuman dahulu sebelum export.', 'error'); return; }
        var s = this.summary;
        var wb = XLSX.utils.book_new();

        // Sheet 1: Ringkasan
        var ringkasan = [
            ['RANGKUMAN AKTIVITAS - Aulia Apotek Klinik'],
            ['Periode: ' + s.mulai + ' s/d ' + s.selesai], [],
            ['1. OBAT TERJUAL - OBAT BEBAS', '', '', ''],
            ['Total Qty', s.obatBebas.totalQty], ['Total HPP', s.obatBebas.totalHpp], ['Total Jual', s.obatBebas.totalJual], [],
            ['1. OBAT TERJUAL - RESEP KLINIK', '', '', ''],
            ['Total Qty', s.obatResepKlinik.totalQty], ['Total HPP', s.obatResepKlinik.totalHpp], ['Total Jual', s.obatResepKlinik.totalJual], [],
            ['1. OBAT TERJUAL - RESEP LUAR', '', '', ''],
            ['Total Qty', s.obatResepLuar.totalQty], ['Total HPP', s.obatResepLuar.totalHpp], ['Total Jual', s.obatResepLuar.totalJual], [],
        ];

        ringkasan.push(['2A. RESEP KLINIK PER DOKTER', 'Jumlah Resep']);
        s.resepKlinik.list.forEach(function(dok) {
            ringkasan.push([dok.namaDokter, dok.totalResep]);
            dok.pasienList.forEach(function(p) { ringkasan.push(['   ' + p.namaPasien, p.jumlah]); });
        });
        ringkasan.push(['Total Resep Klinik', s.resepKlinik.totalResep], []);

        ringkasan.push(['2B. RESEP LUAR PER DOKTER', 'Jumlah Resep']);
        s.resepLuar.list.forEach(function(dok) {
            ringkasan.push([dok.namaDokter, dok.totalResep]);
            dok.pasienList.forEach(function(p) { ringkasan.push(['   ' + p.namaPasien, p.jumlah]); });
        });
        ringkasan.push(['Total Resep Luar', s.resepLuar.totalResep], []);

        ringkasan.push(['3A. TINDAKAN KLINIK', 'Jumlah', 'Nominal']);
        s.tindakanKlinik.list.forEach(function(t) { ringkasan.push([t.namaTindakan, t.jumlah, t.nominal]); });
        ringkasan.push(['Total Tindakan Klinik', s.tindakanKlinik.totalJumlah, s.tindakanKlinik.totalNominal], []);

        ringkasan.push(['3B. TINDAKAN APOTEK', 'Jumlah', 'Nominal']);
        s.tindakanApotek.list.forEach(function(t) { ringkasan.push([t.namaTindakan, t.jumlah, t.nominal]); });
        ringkasan.push(['Total Tindakan Apotek', s.tindakanApotek.totalJumlah, s.tindakanApotek.totalNominal], []);

        ringkasan.push(['4. OBAT RACIK', '']);
        ringkasan.push(['Jumlah Obat Diracik', s.totalObatRacikQty]);
        ringkasan.push(['Nominal Jasa Racik', s.totalObatRacikNominal], []);

        ringkasan.push(['5. PEMBULATAN', '']);
        ringkasan.push(['Jumlah Transaksi Pembulatan', s.jumlahTrxPembulatan]);
        ringkasan.push(['Total Nominal Pembulatan', s.totalPembulatan]);

        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ringkasan), 'Ringkasan');

        // Sheet 2-4: Rincian Obat per kategori
        var sheetObat = function(data) {
            var rows = [['Nama Obat', 'Qty Terjual', 'Harga Beli', 'Harga Jual', 'Total HPP', 'Total Jual']];
            data.list.forEach(function(o) { rows.push([o.namaObat, o.jumlah, o.hargaBeliSatuan, o.hargaJualSatuan, o.totalHpp, o.totalJual]); });
            rows.push(['JUMLAH TOTAL', data.totalQty, '', '', data.totalHpp, data.totalJual]);
            return rows;
        };
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheetObat(s.obatBebas)), 'Obat Bebas');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheetObat(s.obatResepKlinik)), 'Obat Resep Klinik');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheetObat(s.obatResepLuar)), 'Obat Resep Luar');

        XLSX.writeFile(wb, 'Rangkuman_Aktivitas_' + s.mulai + '_sd_' + s.selesai + '.xlsx');
        Utils.toast('Rangkuman berhasil diexport ke Excel!', 'success');
    }
};
