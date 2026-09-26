/**
 * js/klinik/rekapTindakan.js
 * Tindakan & Besaran — Rekap Jumlah & Nominal Tindakan Klinik/Apotek per Periode
 *
 * LATAR BELAKANG PERBAIKAN:
 * Menu ini SUDAH terdaftar di app.js (menuStructure.klinik, id: 'rekap-tindakan',
 * khusus role 'keuangan') sejak lama, tetapi file modulnya sendiri tidak pernah
 * dibuat -- akibatnya navigateTo('klinik/rekapTindakan', ...) selalu gagal load
 * script (404) dan menampilkan "Halaman Belum Tersedia". File ini melengkapi
 * modul yang hilang tsb.
 *
 * FITUR:
 * - Filter rentang tanggal (default: bulan berjalan)
 * - Rekap per JENIS tindakan (nama), dipecah kategori Klinik & Apotek:
 *   jumlah dilakukan, total nominal (harga jual), total modal, total tuslah (laba)
 * - Kartu ringkasan total keseluruhan
 * - Ekspor CSV
 *
 * SUMBER DATA: collection 'transaksi', field tindakanItems[] = [{ namaTindakan,
 * hargaJual, modal, kategori }], sesuai struktur yang ditulis apotek/transaksi.js
 * & klinik/rekamMedis.js. Pola pengelompokan meniru _kelompokTindakan() di
 * js/keuangan/rangkumanBulanan.js supaya angkanya konsisten dengan laporan lain.
 *
 * AKSES: khusus role 'keuangan' (dicek dua lapis: app.js navigateTo() + init() di sini).
 */

window.AppKlinikRekapTindakan = {

    dataTransaksi: [],
    summary: null,

    // ========== RENDER ==========
    render: function() {
        var d = new Date();
        var awalBulan = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';
        var hariIni = Utils.today();

        var html = '<div class="page-enter max-w-6xl">';
        html += '  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">';
        html += '    <div>';
        html += '      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Tindakan &amp; Besaran</h2>';
        html += '      <p class="text-sm text-slate-500 dark:text-slate-400">Rekap jumlah & nominal tindakan klinik dan apotek per periode</p>';
        html += '    </div>';
        html += '    <div class="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">';
        html += '      <label class="text-xs text-slate-400 pl-2">Dari</label>';
        html += '      <input type="date" id="rt-tgl-mulai" value="' + awalBulan + '" class="px-2 py-1.5 bg-transparent dark:text-white text-sm rounded-md outline-none">';
        html += '      <label class="text-xs text-slate-400">s/d</label>';
        html += '      <input type="date" id="rt-tgl-selesai" value="' + hariIni + '" class="px-2 py-1.5 bg-transparent dark:text-white text-sm rounded-md outline-none">';
        html += '      <button onclick="AppKlinikRekapTindakan.init()" class="bg-primary-600 text-white text-sm px-4 py-1.5 rounded-md font-medium">Tampilkan</button>';
        html += '      <button onclick="AppKlinikRekapTindakan.exportCSV()" class="bg-emerald-600 text-white text-sm px-3 py-1.5 rounded-md font-medium flex items-center gap-1" title="Export CSV"><i data-lucide="download" class="w-4 h-4"></i></button>';
        html += '    </div>';
        html += '  </div>';

        html += '  <div id="rt-content"><div class="flex justify-center py-20"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    // ========== INIT / QUERY ==========
    init: function() {
        var role = window.currentRole || '';
        var container = document.getElementById('rt-content');
        if (role !== 'keuangan') {
            if (container) container.innerHTML = '<div class="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg text-sm">Akses Ditolak. Halaman ini hanya untuk role Keuangan.</div>';
            return;
        }

        var self = this;
        var mulai = document.getElementById('rt-tgl-mulai') ? document.getElementById('rt-tgl-mulai').value : '';
        var selesai = document.getElementById('rt-tgl-selesai') ? document.getElementById('rt-tgl-selesai').value : '';

        if (!mulai || !selesai) { Utils.toast('Pilih tanggal mulai & selesai', 'error'); return; }
        if (mulai > selesai) { Utils.toast('Tanggal mulai tidak boleh lebih besar dari tanggal selesai', 'error'); return; }

        if (container) container.innerHTML = '<div class="flex justify-center py-20"><div class="spinner"></div></div>';

        db.collection('transaksi')
            .where('tanggal', '>=', mulai)
            .where('tanggal', '<=', selesai)
            .get()
            .then(function(snap) {
                self.dataTransaksi = [];
                snap.forEach(function(doc) { var d = doc.data(); d.id = doc.id; self.dataTransaksi.push(d); });
                self.hitungRangkuman(mulai, selesai);
            }).catch(function(err) {
                if (container) container.innerHTML = '<div class="text-center py-16"><p class="text-red-500 font-semibold">Gagal memuat: ' + Utils.escapeHtml(err.message) + '</p></div>';
            });
    },

    // ========== HELPER: kelompokkan tindakan per jenis, sertakan modal & tuslah ==========
    // (pola sama seperti _kelompokTindakan() di keuangan/rangkumanBulanan.js, ditambah modal & tuslah)
    _kelompokTindakan: function(kategori) {
        var map = {};
        var totalJumlah = 0, totalNominal = 0, totalModal = 0;

        this.dataTransaksi.forEach(function(t) {
            (t.tindakanItems || []).forEach(function(ti) {
                if ((ti.kategori || 'apotek') !== kategori) return;
                var key = ti.namaTindakan || '-';
                if (!map[key]) map[key] = { namaTindakan: key, jumlah: 0, nominal: 0, modal: 0 };
                map[key].jumlah += 1;
                map[key].nominal += (ti.hargaJual || 0);
                map[key].modal += (ti.modal || 0);
                totalJumlah += 1;
                totalNominal += (ti.hargaJual || 0);
                totalModal += (ti.modal || 0);
            });
        });

        var list = Object.keys(map).map(function(k) {
            var m = map[k];
            m.tuslah = m.nominal - m.modal;
            return m;
        });
        list.sort(function(a, b) { return b.nominal - a.nominal; });

        return { list: list, totalJumlah: totalJumlah, totalNominal: totalNominal, totalModal: totalModal, totalTuslah: totalNominal - totalModal };
    },

    // ========== KALKULASI ==========
    hitungRangkuman: function(mulai, selesai) {
        var tindakanKlinik = this._kelompokTindakan('klinik');
        var tindakanApotek = this._kelompokTindakan('apotek');

        this.summary = {
            periode: { mulai: mulai, selesai: selesai },
            tindakanKlinik: tindakanKlinik,
            tindakanApotek: tindakanApotek,
            totalJumlah: tindakanKlinik.totalJumlah + tindakanApotek.totalJumlah,
            totalNominal: tindakanKlinik.totalNominal + tindakanApotek.totalNominal,
            totalModal: tindakanKlinik.totalModal + tindakanApotek.totalModal,
            totalTuslah: tindakanKlinik.totalTuslah + tindakanApotek.totalTuslah
        };

        this.renderReport();
    },

    // ========== RENDER LAPORAN ==========
    renderReport: function() {
        var container = document.getElementById('rt-content');
        if (!container) return;
        var s = this.summary;

        var html = '';

        // Kartu ringkasan
        html += '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">';
        html += this._card('list-checks', 'Total Tindakan', s.totalJumlah + 'x', 'blue');
        html += this._card('banknote', 'Total Nominal', Utils.formatRupiah(s.totalNominal), 'emerald');
        html += this._card('package', 'Total Modal', Utils.formatRupiah(s.totalModal), 'slate');
        html += this._card('trending-up', 'Total Tuslah (Laba)', Utils.formatRupiah(s.totalTuslah), 'green');
        html += '</div>';

        if (s.totalJumlah === 0) {
            html += '<div class="text-center py-16 text-slate-400"><i data-lucide="stethoscope" class="w-12 h-12 mx-auto mb-3"></i><p class="font-semibold">Tidak ada tindakan tercatat di periode ini</p></div>';
            container.innerHTML = html;
            if (window.lucide) lucide.createIcons();
            return;
        }

        html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">';
        html += '  <div>';
        html += '    <h3 class="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2"><i data-lucide="stethoscope" class="w-4 h-4 text-purple-500"></i> Tindakan Klinik</h3>';
        html += this._renderTabel(s.tindakanKlinik);
        html += '  </div>';
        html += '  <div>';
        html += '    <h3 class="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2"><i data-lucide="stethoscope" class="w-4 h-4 text-teal-500"></i> Tindakan Apotek</h3>';
        html += this._renderTabel(s.tindakanApotek);
        html += '  </div>';
        html += '</div>';

        container.innerHTML = html;
        if (window.lucide) lucide.createIcons();
    },

    _renderTabel: function(data) {
        if (!data.list.length) {
            return '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 text-center text-sm text-slate-400">Tidak ada data</div>';
        }
        var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
        html += '<div class="overflow-x-auto"><table class="w-full text-sm">';
        html += '<thead><tr class="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 uppercase tracking-wider">';
        html += '<th class="px-3 py-2 text-left">Jenis Tindakan</th><th class="px-3 py-2 text-right">Jumlah</th><th class="px-3 py-2 text-right">Nominal</th><th class="px-3 py-2 text-right">Modal</th><th class="px-3 py-2 text-right">Tuslah</th>';
        html += '</tr></thead><tbody>';
        data.list.forEach(function(t) {
            html += '<tr class="border-t border-slate-100 dark:border-slate-700">';
            html += '<td class="px-3 py-2 font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(t.namaTindakan) + '</td>';
            html += '<td class="px-3 py-2 text-right text-slate-600 dark:text-slate-300">' + t.jumlah + 'x</td>';
            html += '<td class="px-3 py-2 text-right text-slate-600 dark:text-slate-300">' + Utils.formatRupiah(t.nominal) + '</td>';
            html += '<td class="px-3 py-2 text-right text-slate-400">' + Utils.formatRupiah(t.modal) + '</td>';
            html += '<td class="px-3 py-2 text-right font-semibold text-green-600 dark:text-green-400">' + Utils.formatRupiah(t.tuslah) + '</td>';
            html += '</tr>';
        });
        html += '<tr class="border-t-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-bold">';
        html += '<td class="px-3 py-2">Total</td>';
        html += '<td class="px-3 py-2 text-right">' + data.totalJumlah + 'x</td>';
        html += '<td class="px-3 py-2 text-right">' + Utils.formatRupiah(data.totalNominal) + '</td>';
        html += '<td class="px-3 py-2 text-right text-slate-500">' + Utils.formatRupiah(data.totalModal) + '</td>';
        html += '<td class="px-3 py-2 text-right text-green-600 dark:text-green-400">' + Utils.formatRupiah(data.totalTuslah) + '</td>';
        html += '</tr>';
        html += '</tbody></table></div></div>';
        return html;
    },

    _card: function(icon, label, val, color) {
        return '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">' +
               '  <div class="flex items-center gap-2 mb-2"><i data-lucide="' + icon + '" class="w-4 h-4 text-' + color + '-500"></i><p class="text-xs text-slate-500 dark:text-slate-400">' + label + '</p></div>' +
               '  <p class="font-bold text-gray-800 dark:text-white text-lg leading-tight">' + val + '</p>' +
               '</div>';
    },

    // ========== EKSPOR CSV ==========
    exportCSV: function() {
        if (!this.summary || this.summary.totalJumlah === 0) return Utils.toast('Tidak ada data untuk diekspor', 'error');
        var s = this.summary;

        var rows = [['Kategori', 'Jenis Tindakan', 'Jumlah', 'Nominal (Rp)', 'Modal (Rp)', 'Tuslah (Rp)']];
        s.tindakanKlinik.list.forEach(function(t) { rows.push(['Klinik', t.namaTindakan, t.jumlah, t.nominal, t.modal, t.tuslah]); });
        rows.push(['Klinik', 'TOTAL', s.tindakanKlinik.totalJumlah, s.tindakanKlinik.totalNominal, s.tindakanKlinik.totalModal, s.tindakanKlinik.totalTuslah]);
        rows.push([]);
        s.tindakanApotek.list.forEach(function(t) { rows.push(['Apotek', t.namaTindakan, t.jumlah, t.nominal, t.modal, t.tuslah]); });
        rows.push(['Apotek', 'TOTAL', s.tindakanApotek.totalJumlah, s.tindakanApotek.totalNominal, s.tindakanApotek.totalModal, s.tindakanApotek.totalTuslah]);
        rows.push([]);
        rows.push(['', 'GRAND TOTAL', s.totalJumlah, s.totalNominal, s.totalModal, s.totalTuslah]);

        var csv = rows.map(function(r) { return r.map(function(c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
        var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'tindakan-besaran-' + s.periode.mulai + '_sd_' + s.periode.selesai + '.csv';
        a.click();
        URL.revokeObjectURL(url);
        Utils.toast('CSV berhasil diunduh!', 'success');
    }
};
