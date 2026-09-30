/**
 * js/keuangan/mutasiRekening.js
 *
 * Business name: Mutasi Saldo.
 *
 * Prinsip penting:
 * 1. Kas BUKAN saldo manual. Nilainya dihitung dari arus kas yang sudah ada di aplikasi
 *    sampai saat data dibaca, lalu ditambah/dikurangi mutasi internal.
 * 2. Rekening bank memiliki saldo awal sendiri. Saldo berjalan dihitung dari saldo awal
 *    + mutasi internal, bukan dari omzet.
 * 3. Mutasi antar akun hanya perpindahan aset kas/bank. Tidak pernah menjadi pendapatan,
 *    biaya, omzet, HPP, stok, payroll, atau laba/rugi.
 * 4. Mutasi tidak diedit/dihapus. Koreksi dilakukan dengan mutasi pembalik.
 */
window.AppKeuanganMutasiRekening = {
    _unsubs: [],
    accounts: [],
    mutations: [],
    filterBulan: '',
    searchQuery: '',
    cashBase: 0,
    cashBreakdown: null,

    render: function () {
        var role = window.currentRole || '';
        if (role !== 'psa' && role !== 'keuangan') {
            return '<div class="p-8 text-center text-rose-600 font-semibold bg-white dark:bg-slate-800 rounded-xl border border-rose-200 max-w-2xl mx-auto my-12">' +
                '<i data-lucide="shield-alert" class="w-12 h-12 mx-auto mb-3"></i>' +
                '<h3 class="text-lg font-bold">Akses Ditolak</h3>' +
                '<p class="text-sm text-slate-500 mt-1">Mutasi Saldo hanya dapat diakses oleh akun PSA dan Keuangan.</p></div>';
        }
        var now = new Date();
        if (!this.filterBulan) this.filterBulan = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        var canEdit = role === 'keuangan';
        var html = '<div class="page-enter max-w-7xl mx-auto space-y-6 pb-12">';
        html += '<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm">';
        html += '<div class="flex items-center gap-3.5"><div class="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl border border-emerald-500/20"><i data-lucide="wallet-cards" class="w-6 h-6"></i></div><div><h2 class="text-xl font-bold text-slate-800 dark:text-white">Mutasi Saldo</h2><p class="text-xs text-slate-500 dark:text-slate-400">Saldo kas aktual, rekening, dan perpindahan dana antar akun</p></div></div>';
        if (canEdit) {
            html += '<div class="flex items-center gap-2 flex-wrap"><button onclick="AppKeuanganMutasiRekening.bukaModalRekening()" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-600 flex items-center gap-1.5"><i data-lucide="building-2" class="w-4 h-4"></i> + Tambah Rekening</button>';
            html += '<button onclick="AppKeuanganMutasiRekening.bukaModalMutasi()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2"><i data-lucide="arrow-left-right" class="w-4 h-4"></i> + Tambah Mutasi Saldo</button></div>';
        }
        html += '</div>';
        html += '<div id="mutasi-saldo-cards" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"><div class="col-span-full flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '<div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm"><div class="flex flex-col md:flex-row md:items-center justify-between gap-3">';
        html += '<div><h3 class="font-bold text-slate-800 dark:text-white flex items-center gap-2"><i data-lucide="history" class="w-4 h-4 text-emerald-500"></i> Riwayat Mutasi Saldo</h3><p class="text-[11px] text-slate-400 mt-1">Perpindahan antar akun tidak dihitung sebagai pendapatan atau biaya.</p></div>';
        html += '<div class="flex items-center gap-2 flex-wrap"><input type="month" id="filter-bulan-mutasi-saldo" value="' + this.filterBulan + '" onchange="AppKeuanganMutasiRekening.ubahFilter()" class="px-3 py-2 bg-slate-50 dark:bg-slate-900 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700"><input type="text" id="search-mutasi-saldo" value="" oninput="AppKeuanganMutasiRekening.ubahFilter()" placeholder="Cari akun / keterangan..." class="px-3 py-2 bg-slate-50 dark:bg-slate-900 text-xs rounded-xl border border-slate-200 dark:border-slate-700 w-56"></div></div>';
        html += '<div id="mutasi-saldo-table" class="mt-4"><div class="flex justify-center py-8"><div class="spinner"></div></div></div></div></div>';
        return html;
    },

    init: function () {
        this._renameLegacyMenu();
        this._listenAccounts();
        this._listenMutations();
        this._recalculateCash();
    },

    destroy: function () {
        this._unsubs.forEach(function (fn) { try { fn(); } catch (e) {} });
        this._unsubs = [];
    },

    _renameLegacyMenu: function () {
        var apply = function () {
            document.querySelectorAll('[data-page="mutasi-rekening"]').forEach(function (btn) {
                var span = btn.querySelector('span');
                if (span) span.textContent = 'Mutasi Saldo';
            });
            var title = document.getElementById('page-title');
            if (title) title.textContent = 'Mutasi Saldo';
        };
        apply(); setTimeout(apply, 0);
    },

    _listenAccounts: function () {
        var self = this;
        var unsub = db.collection('rekeningSaldo').onSnapshot(function (snap) {
            self.accounts = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); })
                .filter(function (a) { return a.id !== 'kas'; });
            self.accounts.sort(function (a, b) { return String(a.nama || '').localeCompare(String(b.nama || ''), 'id'); });
            self.renderAccounts();
            self.renderMutations();
        }, function (err) {
            console.error('Listener rekeningSaldo:', err);
            if (window.Utils && Utils.toast) Utils.toast('Gagal memuat rekening: ' + err.message, 'error');
        });
        this._unsubs.push(unsub);
    },

    _listenMutations: function () {
        var self = this;
        var unsub = db.collection('mutasiSaldo').onSnapshot(function (snap) {
            self.mutations = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
            self.mutations.sort(function (a, b) { return self._time(b.tanggal || b.dibuatPada) - self._time(a.tanggal || a.dibuatPada); });
            self._recalculateCash();
            self.renderAccounts();
            self.renderMutations();
        }, function (err) {
            console.error('Listener mutasiSaldo:', err);
            if (window.Utils && Utils.toast) Utils.toast('Gagal memuat mutasi saldo: ' + err.message, 'error');
        });
        this._unsubs.push(unsub);
    },

    _recalculateCash: function () {
        var self = this;
        Promise.all([
            db.collection('transaksi').get(),
            db.collection('kasKeluar').where('status', '==', 'approved').get(),
            db.collection('pendapatanLain').get().catch(function () { return []; }),
            db.collection('saldoAwal').get().catch(function () { return []; })
        ]).then(function (r) {
            var cashIn = 0, cashOut = 0, cashOpening = 0;
            r[0].forEach(function (doc) {
                var t = doc.data() || {};
                if ((t.metodeBayar || 'cash') === 'cash') cashIn += Number(t.totalAkhir) || 0;
            });
            r[1].forEach(function (doc) {
                var k = doc.data() || {};
                var sumber = String(k.sumberDana || k.metodeBayar || k.metode || k.akunKredit || '').toLowerCase();
                if (!sumber || sumber === 'cash' || sumber === 'kas' || sumber.indexOf('tunai') >= 0 || sumber === '1-1100') cashOut += Number(k.jumlah) || 0;
            });
            r[2].forEach(function (doc) {
                var p = doc.data() || {};
                var metode = String(p.metodeBayar || p.metodePembayaran || p.sumberDana || '').toLowerCase();
                if (metode === 'cash' || metode === 'kas' || metode.indexOf('tunai') >= 0) cashIn += Number(p.jumlah) || 0;
            });
            r[3].forEach(function (doc) {
                var s = doc.data() || {};
                var akun = String(s.kodeAkun || s.akun || s.accountCode || '').toLowerCase();
                var nama = String(s.namaAkun || s.nama || '').toLowerCase();
                if (akun === '1-1100' || nama === 'kas') cashOpening += Number(s.saldo) || Number(s.nilai) || Number(s.jumlah) || 0;
            });
            self.cashBase = cashOpening + cashIn - cashOut;
            self.cashBreakdown = { opening: cashOpening, in: cashIn, out: cashOut };
            self.renderAccounts();
        }).catch(function (err) {
            console.warn('Gagal menghitung saldo Kas aktual:', err);
            self.cashBase = 0;
        });
    },

    _time: function (value) {
        if (!value) return 0;
        if (value && typeof value.toDate === 'function') return value.toDate().getTime();
        var d = new Date(value);
        return isNaN(d.getTime()) ? 0 : d.getTime();
    },

    _account: function (id) { return this.accounts.find(function (a) { return a.id === id; }) || null; },

    _netMutation: function (accountId) {
        var self = this;
        return this.mutations.reduce(function (sum, m) {
            var nominal = Math.abs(Number(m.nominal) || 0);
            if (m.keId === accountId) sum += nominal;
            if (m.dariId === accountId) sum -= nominal;
            return sum;
        }, 0);
    },

    _kasBalance: function () {
        var net = this.mutations.reduce(function (sum, m) {
            var nominal = Math.abs(Number(m.nominal) || 0);
            if (m.keId === 'kas') sum += nominal;
            if (m.dariId === 'kas') sum -= nominal;
            return sum;
        }, 0);
        return this.cashBase + net;
    },

    _bankBalance: function (a) {
        var opening = Number(a.saldoAwal);
        if (!isFinite(opening)) opening = Number(a.saldo) || 0;
        return opening + this._netMutation(a.id);
    },

    renderAccounts: function () {
        var el = document.getElementById('mutasi-saldo-cards');
        if (!el) return;
        var self = this;
        var kasSaldo = this._kasBalance();
        var bankAccounts = this.accounts.filter(function (a) { return a.aktif !== false; });
        var total = kasSaldo + bankAccounts.reduce(function (sum, a) { return sum + self._bankBalance(a); }, 0);
        var html = '';
        html += '<div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 shadow-sm"><div class="flex items-center justify-between"><span class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><i data-lucide="wallet" class="w-4 h-4 text-emerald-500"></i> Kas</span><span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Aktual</span></div><div class="mt-3 text-2xl font-black text-emerald-600">' + Utils.formatRupiah(kasSaldo) + '</div><div class="text-[11px] text-slate-400 mt-1">Dihitung dari seluruh arus kas aplikasi sampai saat ini</div></div>';
        bankAccounts.forEach(function (a) {
            var saldo = self._bankBalance(a);
            html += '<div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm"><div class="flex items-center justify-between gap-2"><span class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><i data-lucide="building-2" class="w-4 h-4 text-blue-500"></i> ' + Utils.escapeHtml(a.nama) + '</span><span class="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">' + Utils.escapeHtml(a.bank || 'Bank') + '</span></div><div class="mt-3 text-2xl font-black text-slate-800 dark:text-white">' + Utils.formatRupiah(saldo) + '</div><div class="text-[11px] text-slate-400 mt-1">' + Utils.escapeHtml(a.nomorRekening || 'Nomor rekening tidak diisi') + '</div></div>';
        });
        html += '<div class="bg-slate-900 text-white p-5 rounded-2xl shadow-md border border-slate-700"><div class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2"><i data-lucide="coins" class="w-4 h-4 text-amber-400"></i> Total Seluruh Saldo</div><div class="mt-3 text-2xl font-black text-emerald-400">' + Utils.formatRupiah(total) + '</div><div class="text-[11px] text-slate-400 mt-1">Kas aktual + seluruh rekening aktif</div></div>';
        if (!bankAccounts.length) html += '<div class="md:col-span-2 xl:col-span-3 p-5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-sm text-slate-400 text-center">Belum ada rekening bank. Gunakan <b>+ Tambah Rekening</b> untuk menambahkan BCA, Mandiri, BRI, atau bank lainnya.</div>';
        el.innerHTML = html;
        if (window.lucide) lucide.createIcons();
    },

    ubahFilter: function () {
        var month = document.getElementById('filter-bulan-mutasi-saldo');
        var search = document.getElementById('search-mutasi-saldo');
        if (month) this.filterBulan = month.value;
        if (search) this.searchQuery = search.value || '';
        this.renderMutations();
    },

    renderMutations: function () {
        var el = document.getElementById('mutasi-saldo-table');
        if (!el) return;
        var month = this.filterBulan || '', q = String(this.searchQuery || '').toLowerCase().trim(), self = this;
        var rows = this.mutations.filter(function (m) {
            var date = m.tanggal && typeof m.tanggal.toDate === 'function' ? m.tanggal.toDate() : new Date(m.tanggal || m.dibuatPada || 0);
            var ym = isNaN(date.getTime()) ? '' : date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
            if (month && ym !== month) return false;
            if (!q) return true;
            return [m.dariNama, m.keNama, m.keterangan, m.nominal, m.dibuatOlehNama].join(' ').toLowerCase().indexOf(q) !== -1;
        });
        if (!rows.length) { el.innerHTML = '<div class="py-10 text-center text-sm text-slate-400">Belum ada mutasi saldo pada periode ini.</div>'; return; }
        var html = '<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-700"><th class="px-3 py-3">Tanggal</th><th class="px-3 py-3">Dari</th><th class="px-3 py-3">Ke</th><th class="px-3 py-3 text-right">Nominal</th><th class="px-3 py-3">Keterangan</th></tr></thead><tbody>';
        rows.forEach(function (m) {
            var d = m.tanggal && typeof m.tanggal.toDate === 'function' ? m.tanggal.toDate() : new Date(m.tanggal || m.dibuatPada || 0);
            html += '<tr class="border-b border-slate-100 dark:border-slate-700/60"><td class="px-3 py-3 text-xs text-slate-500">' + (isNaN(d.getTime()) ? '-' : d.toLocaleDateString('id-ID')) + '</td><td class="px-3 py-3 font-semibold text-slate-700 dark:text-slate-200">' + Utils.escapeHtml(m.dariNama || '-') + '</td><td class="px-3 py-3 font-semibold text-emerald-700">' + Utils.escapeHtml(m.keNama || '-') + '</td><td class="px-3 py-3 text-right font-bold">' + Utils.formatRupiah(m.nominal) + '</td><td class="px-3 py-3 text-xs text-slate-500">' + Utils.escapeHtml(m.keterangan || '-') + '</td></tr>';
        });
        html += '</tbody></table></div>';
        el.innerHTML = html;
    },

    bukaModalRekening: function () {
        if ((window.currentRole || '') !== 'keuangan') return Utils.toast('Hanya Keuangan yang dapat menambah rekening.', 'error');
        var self = this;
        var body = '<div class="space-y-4"><div><label class="text-xs font-semibold">Nama Rekening</label><input id="ms-nama" class="w-full mt-1 p-2.5 rounded-xl border" placeholder="BCA / Mandiri / BRI"></div><div><label class="text-xs font-semibold">Nama Bank</label><input id="ms-bank" class="w-full mt-1 p-2.5 rounded-xl border" placeholder="BCA"></div><div><label class="text-xs font-semibold">Nomor Rekening</label><input id="ms-norek" class="w-full mt-1 p-2.5 rounded-xl border"></div><div><label class="text-xs font-semibold">Nama Pemilik</label><input id="ms-pemilik" class="w-full mt-1 p-2.5 rounded-xl border"></div><div><label class="text-xs font-semibold">Saldo Awal</label><input id="ms-saldo" type="number" min="0" class="w-full mt-1 p-2.5 rounded-xl border" value="0"></div></div>';
        this._showModal('Tambah Rekening', body, 'Simpan Rekening', function () {
            var nama = document.getElementById('ms-nama').value.trim();
            var bank = document.getElementById('ms-bank').value.trim();
            var nomor = document.getElementById('ms-norek').value.trim();
            var pemilik = document.getElementById('ms-pemilik').value.trim();
            var saldo = Math.max(0, Number(document.getElementById('ms-saldo').value) || 0);
            if (!nama) return Utils.toast('Nama rekening wajib diisi.', 'error');
            return db.collection('rekeningSaldo').add({ nama: nama, tipe: 'bank', bank: bank || nama, nomorRekening: nomor, namaPemilik: pemilik, saldoAwal: saldo, aktif: true, dibuatOlehUid: window.currentUid || '', dibuatOlehNama: window.currentUserName || 'Keuangan', dibuatPada: firebase.firestore.FieldValue.serverTimestamp() }).then(function () { Utils.toast('Rekening berhasil ditambahkan.', 'success'); });
        });
    },

    bukaModalMutasi: function () {
        if ((window.currentRole || '') !== 'keuangan') return Utils.toast('Hanya Keuangan yang dapat membuat mutasi saldo.', 'error');
        var self = this;
        var opts = '<option value="kas">Kas (saldo aktual: ' + Utils.formatRupiah(this._kasBalance()) + ')</option>';
        this.accounts.filter(function (a) { return a.aktif !== false; }).forEach(function (a) { opts += '<option value="' + Utils.escapeHtml(a.id) + '">' + Utils.escapeHtml(a.nama) + ' (' + Utils.formatRupiah(self._bankBalance(a)) + ')</option>'; });
        var body = '<div class="space-y-4"><div><label class="text-xs font-semibold">Dari</label><select id="ms-dari" class="w-full mt-1 p-2.5 rounded-xl border">' + opts + '</select></div><div><label class="text-xs font-semibold">Ke</label><select id="ms-ke" class="w-full mt-1 p-2.5 rounded-xl border">' + opts + '</select></div><div><label class="text-xs font-semibold">Nominal</label><input id="ms-nominal" type="number" min="1" class="w-full mt-1 p-2.5 rounded-xl border"></div><div><label class="text-xs font-semibold">Tanggal</label><input id="ms-tanggal" type="date" value="' + Utils.today() + '" class="w-full mt-1 p-2.5 rounded-xl border"></div><div><label class="text-xs font-semibold">Keterangan</label><textarea id="ms-keterangan" class="w-full mt-1 p-2.5 rounded-xl border" rows="2" placeholder="Contoh: Setoran kas ke BCA"></textarea></div></div>';
        this._showModal('Tambah Mutasi Saldo', body, 'Simpan Mutasi', function () {
            var dariId = document.getElementById('ms-dari').value;
            var keId = document.getElementById('ms-ke').value;
            var nominal = Math.abs(Number(document.getElementById('ms-nominal').value) || 0);
            var tanggal = document.getElementById('ms-tanggal').value;
            var keterangan = document.getElementById('ms-keterangan').value.trim();
            if (dariId === keId) return Utils.toast('Sumber dan tujuan tidak boleh sama.', 'error');
            if (!nominal) return Utils.toast('Nominal harus lebih dari 0.', 'error');
            var dariSaldo = dariId === 'kas' ? self._kasBalance() : self._bankBalance(self._account(dariId));
            if (nominal > dariSaldo) return Utils.toast('Saldo sumber tidak mencukupi.', 'error');
            var dariNama = dariId === 'kas' ? 'Kas' : (self._account(dariId) || {}).nama || '-';
            var keNama = keId === 'kas' ? 'Kas' : (self._account(keId) || {}).nama || '-';
            return db.collection('mutasiSaldo').add({ dariId: dariId, dariNama: dariNama, keId: keId, keNama: keNama, nominal: nominal, tanggal: tanggal, keterangan: keterangan || ('Mutasi ' + dariNama + ' ke ' + keNama), dibuatOlehUid: window.currentUid || '', dibuatOlehNama: window.currentUserName || 'Keuangan', dibuatPada: firebase.firestore.FieldValue.serverTimestamp(), tipe: 'transfer_internal' }).then(function () { Utils.toast('Mutasi saldo berhasil dicatat.', 'success'); });
        });
    },

    _showModal: function (title, body, submitText, onSubmit) {
        var existing = document.getElementById('modal-mutasi-saldo');
        if (existing) existing.remove();
        var html = '<div id="modal-mutasi-saldo" class="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"><div class="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700"><div class="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between"><h3 class="font-bold text-lg text-slate-800 dark:text-white">' + Utils.escapeHtml(title) + '</h3><button onclick="document.getElementById(\'modal-mutasi-saldo\').remove()" class="text-slate-400 hover:text-slate-700"><i data-lucide="x"></i></button></div><div class="p-5">' + body + '</div><div class="p-5 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2"><button onclick="document.getElementById(\'modal-mutasi-saldo\').remove()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700">Batal</button><button id="modal-mutasi-saldo-submit" class="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold">' + Utils.escapeHtml(submitText) + '</button></div></div></div>';
        document.body.insertAdjacentHTML('beforeend', html);
        if (window.lucide) lucide.createIcons();
        document.getElementById('modal-mutasi-saldo-submit').onclick = function () {
            var btn = this; btn.disabled = true;
            Promise.resolve(onSubmit()).then(function () { document.getElementById('modal-mutasi-saldo').remove(); }).catch(function (err) { btn.disabled = false; Utils.toast(err.message || String(err), 'error'); });
        };
    },

    // Kompatibilitas nama fungsi lama agar router/HTML lama tidak rusak.
    bukaModalSaldoKas: function () { Utils.toast('Saldo Kas dihitung otomatis dari arus kas aplikasi dan tidak dapat diisi manual.', 'info'); }
};
