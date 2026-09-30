/**
 * js/keuangan/mutasiRekening.js
 * UI legacy path: kept for router compatibility.
 * New business name: Mutasi Saldo.
 *
 * Prinsip:
 * - Kas adalah akun bawaan.
 * - Rekening bank ditambahkan sebagai akun baru.
 * - Saldo disimpan pada akun dan berubah hanya melalui saldo awal atau mutasi internal.
 * - Mutasi antar akun bukan pendapatan/biaya dan tidak mengubah omzet, HPP,
 *   stok, payroll, atau laporan laba-rugi.
 * - Mutasi yang sudah tersimpan tidak diedit/dihapus; koreksi dilakukan
 *   dengan mutasi pembalik agar jejak saldo tetap utuh.
 */
window.AppKeuanganMutasiRekening = {
    _unsubs: [],
    accounts: [],
    mutations: [],
    filterBulan: '',
    searchQuery: '',

    render: function () {
        var role = window.currentRole || '';
        if (role !== 'psa' && role !== 'keuangan') {
            return '<div class="p-8 text-center text-rose-600 font-semibold bg-white dark:bg-slate-800 rounded-xl border border-rose-200 max-w-2xl mx-auto my-12">' +
                '<i data-lucide="shield-alert" class="w-12 h-12 mx-auto mb-3"></i>' +
                '<h3 class="text-lg font-bold">Akses Ditolak</h3>' +
                '<p class="text-sm text-slate-500 mt-1">Mutasi Saldo hanya dapat diakses oleh akun PSA dan Keuangan.</p>' +
                '</div>';
        }

        var now = new Date();
        if (!this.filterBulan) this.filterBulan = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');

        var html = '<div class="page-enter max-w-7xl mx-auto space-y-6 pb-12">';
        html += '<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm">';
        html += '<div class="flex items-center gap-3.5"><div class="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl border border-emerald-500/20"><i data-lucide="wallet-cards" class="w-6 h-6"></i></div>';
        html += '<div><h2 class="text-xl font-bold text-slate-800 dark:text-white">Mutasi Saldo</h2><p class="text-xs text-slate-500 dark:text-slate-400">Saldo kas dan rekening serta perpindahan dana antar akun</p></div></div>';
        html += '<div class="flex items-center gap-2 flex-wrap"><button onclick="AppKeuanganMutasiRekening.bukaModalRekening()" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-600 flex items-center gap-1.5"><i data-lucide="building-2" class="w-4 h-4"></i> + Tambah Rekening</button>';
        html += '<button onclick="AppKeuanganMutasiRekening.bukaModalMutasi()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2"><i data-lucide="arrow-left-right" class="w-4 h-4"></i> + Tambah Mutasi Saldo</button></div></div>';

        html += '<div id="mutasi-saldo-cards" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"><div class="col-span-full flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '<div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm"><div class="flex flex-col md:flex-row md:items-center justify-between gap-3">';
        html += '<div><h3 class="font-bold text-slate-800 dark:text-white flex items-center gap-2"><i data-lucide="history" class="w-4 h-4 text-emerald-500"></i> Riwayat Mutasi Saldo</h3><p class="text-[11px] text-slate-400 mt-1">Mutasi antar akun hanya memindahkan dana, bukan pendapatan atau biaya.</p></div>';
        html += '<div class="flex items-center gap-2 flex-wrap"><input type="month" id="filter-bulan-mutasi-saldo" value="' + this.filterBulan + '" onchange="AppKeuanganMutasiRekening.ubahFilter()" class="px-3 py-2 bg-slate-50 dark:bg-slate-900 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700">';
        html += '<input type="text" id="search-mutasi-saldo" value="" oninput="AppKeuanganMutasiRekening.ubahFilter()" placeholder="Cari akun / keterangan..." class="px-3 py-2 bg-slate-50 dark:bg-slate-900 text-xs rounded-xl border border-slate-200 dark:border-slate-700 w-56"></div></div>';
        html += '<div id="mutasi-saldo-table" class="mt-4"><div class="flex justify-center py-8"><div class="spinner"></div></div></div></div></div>';
        return html;
    },

    init: function () {
        this._renameLegacyMenu();
        this._ensureKas();
        this._listenAccounts();
        this._listenMutations();
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
        apply();
        setTimeout(apply, 0);
    },

    _ensureKas: function () {
        var ref = db.collection('rekeningSaldo').doc('kas');
        ref.get().then(function (snap) {
            if (!snap.exists) {
                return ref.set({
                    nama: 'Kas', tipe: 'kas', bank: '', nomorRekening: '', namaPemilik: '',
                    saldoAwal: 0, saldo: 0, aktif: true, system: true,
                    dibuatOlehUid: window.currentUid || '',
                    dibuatPada: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }).catch(function (err) { console.warn('Gagal memastikan akun Kas:', err); });
    },

    _listenAccounts: function () {
        var self = this;
        var unsub = db.collection('rekeningSaldo').onSnapshot(function (snap) {
            self.accounts = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
            self.accounts.sort(function (a, b) {
                if (a.id === 'kas') return -1;
                if (b.id === 'kas') return 1;
                return String(a.nama || '').localeCompare(String(b.nama || ''), 'id');
            });
            self.renderAccounts();
            self.renderMutations();
        }, function (err) {
            console.error('Listener rekeningSaldo:', err);
            Utils.toast('Gagal memuat saldo: ' + err.message, 'error');
        });
        this._unsubs.push(unsub);
    },

    _listenMutations: function () {
        var self = this;
        var unsub = db.collection('mutasiSaldo').onSnapshot(function (snap) {
            self.mutations = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
            self.mutations.sort(function (a, b) { return self._time(b.tanggal || b.dibuatPada) - self._time(a.tanggal || a.dibuatPada); });
            self.renderMutations();
        }, function (err) {
            console.error('Listener mutasiSaldo:', err);
            Utils.toast('Gagal memuat mutasi saldo: ' + err.message, 'error');
        });
        this._unsubs.push(unsub);
    },

    _time: function (value) {
        if (!value) return 0;
        if (value && typeof value.toDate === 'function') return value.toDate().getTime();
        var d = new Date(value);
        return isNaN(d.getTime()) ? 0 : d.getTime();
    },

    _account: function (id) { return this.accounts.find(function (a) { return a.id === id; }) || null; },

    renderAccounts: function () {
        var el = document.getElementById('mutasi-saldo-cards');
        if (!el) return;
        var total = this.accounts.reduce(function (sum, a) { return sum + (Number(a.saldo) || 0); }, 0);
        var kas = this._account('kas');
        var bankAccounts = this.accounts.filter(function (a) { return a.tipe === 'bank' && a.aktif !== false; });
        var bankTotal = bankAccounts.reduce(function (sum, a) { return sum + (Number(a.saldo) || 0); }, 0);
        var html = '';

        html += '<div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 shadow-sm">';
        html += '<div class="flex items-center justify-between"><span class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><i data-lucide="wallet" class="w-4 h-4 text-emerald-500"></i> Kas</span><span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Tunai</span></div>';
        html += '<div class="mt-3 text-2xl font-black text-emerald-600">' + Utils.formatRupiah(kas ? kas.saldo : 0) + '</div><div class="text-[11px] text-slate-400 mt-1">Saldo kas saat ini</div>';
        html += '<button onclick="AppKeuanganMutasiRekening.bukaModalSaldoKas()" class="mt-4 text-xs font-semibold text-emerald-600 hover:underline">Atur saldo awal Kas</button></div>';

        bankAccounts.forEach(function (a) {
            html += '<div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm">';
            html += '<div class="flex items-center justify-between gap-2"><span class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><i data-lucide="building-2" class="w-4 h-4 text-blue-500"></i> ' + Utils.escapeHtml(a.nama) + '</span><span class="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">' + Utils.escapeHtml(a.bank || 'Bank') + '</span></div>';
            html += '<div class="mt-3 text-2xl font-black text-slate-800 dark:text-white">' + Utils.formatRupiah(a.saldo) + '</div><div class="text-[11px] text-slate-400 mt-1">' + Utils.escapeHtml(a.nomorRekening || 'Nomor rekening tidak diisi') + '</div></div>';
        });

        html += '<div class="bg-slate-900 text-white p-5 rounded-2xl shadow-md border border-slate-700"><div class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2"><i data-lucide="coins" class="w-4 h-4 text-amber-400"></i> Total Seluruh Saldo</div>';
        html += '<div class="mt-3 text-2xl font-black text-emerald-400">' + Utils.formatRupiah(total) + '</div><div class="text-[11px] text-slate-400 mt-1">Kas + seluruh rekening aktif</div><div class="text-[11px] text-slate-400 mt-2">Saldo bank: ' + Utils.formatRupiah(bankTotal) + '</div></div>';

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
        var month = this.filterBulan || '', q = String(this.searchQuery || '').toLowerCase().trim();
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
            html += '<tr class="border-b border-slate-100 dark:border-slate-700/60"><td class="px-3 py-3 text-xs text-slate-500">' + (isNaN(d.getTime()) ? '-' : d.toLocaleDateString('id-ID')) + '</td><td class="px-3 py-3 font-semibold text-slate-700 dark:text-slate-200">' + Utils.escapeHtml(m.dariNama) + '</td><td class="px-3 py-3 font-semibold text-emerald-700">' + Utils.escapeHtml(m.keNama) + '</td><td class="px-3 py-3 text-right font-bold">' + Utils.formatRupiah(m.nominal) + '</td><td class="px-3 py-3 text-xs text-slate-500">' + Utils.escapeHtml(m.keterangan || '-') + '</td></tr>';
        });
        html += '</tbody></table></div>'; el.innerHTML = html;
    },

    bukaModalRekening: function () {
        var html = '<div class="p-6"><div class="flex items-center justify-between mb-5"><h3 class="text-lg font-bold">Tambah Rekening</h3><button onclick="Utils.closeModal()" class="text-slate-400"><i data-lucide="x" class="w-5 h-5"></i></button></div><div class="space-y-4">';
        html += '<label class="block"><span class="text-xs font-semibold text-slate-500">Nama rekening *</span><input id="rekening-nama" class="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900" placeholder="BCA Operasional"></label>';
        html += '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3"><label class="block"><span class="text-xs font-semibold text-slate-500">Bank *</span><input id="rekening-bank" class="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900" placeholder="BCA"></label><label class="block"><span class="text-xs font-semibold text-slate-500">Nomor rekening</span><input id="rekening-nomor" class="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900" inputmode="numeric"></label></div>';
        html += '<label class="block"><span class="text-xs font-semibold text-slate-500">Nama pemilik</span><input id="rekening-pemilik" class="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"></label>';
        html += '<label class="block"><span class="text-xs font-semibold text-slate-500">Saldo awal *</span><input id="rekening-saldo-awal" type="number" min="0" step="1" value="0" class="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"></label></div>';
        html += '<p class="text-[11px] text-slate-400 mt-4">Saldo awal adalah posisi uang yang memang sudah ada saat rekening dicatat. Setelah rekening memiliki mutasi, koreksi dilakukan dengan mutasi pembalik.</p>';
        html += '<div class="flex justify-end gap-2 mt-6"><button onclick="Utils.closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-sm font-semibold">Batal</button><button onclick="AppKeuanganMutasiRekening.simpanRekening()" class="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold">Simpan Rekening</button></div></div>';
        Utils.openModal(html);
    },

    simpanRekening: function () {
        var nama = ((document.getElementById('rekening-nama') || {}).value || '').trim();
        var bank = ((document.getElementById('rekening-bank') || {}).value || '').trim();
        var nomor = ((document.getElementById('rekening-nomor') || {}).value || '').trim();
        var pemilik = ((document.getElementById('rekening-pemilik') || {}).value || '').trim();
        var saldo = Number((document.getElementById('rekening-saldo-awal') || {}).value || 0);
        if (!nama || !bank) return Utils.toast('Nama rekening dan bank wajib diisi.', 'warning');
        if (!Number.isFinite(saldo) || saldo < 0) return Utils.toast('Saldo awal tidak valid.', 'warning');
        var id = 'bank_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        db.collection('rekeningSaldo').doc(id).set({
            nama: nama, tipe: 'bank', bank: bank, nomorRekening: nomor, namaPemilik: pemilik,
            saldoAwal: saldo, saldo: saldo, aktif: true, system: false,
            dibuatOlehUid: window.currentUid || '', dibuatOlehNama: window.currentUserName || '',
            dibuatPada: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function () { Utils.closeModal(); Utils.toast('Rekening ' + nama + ' berhasil ditambahkan.', 'success'); })
          .catch(function (err) { Utils.toast('Gagal menambah rekening: ' + err.message, 'error'); });
    },

    bukaModalSaldoKas: function () {
        var kas = this._account('kas');
        var hasKasMutation = this.mutations.some(function (m) { return m.dariId === 'kas' || m.keId === 'kas'; });
        var html = '<div class="p-6"><h3 class="text-lg font-bold">Saldo Awal Kas</h3><p class="text-xs text-slate-500 mt-1">Atur posisi kas saat mulai menggunakan modul. Setelah ada mutasi, saldo awal tidak dapat diubah.</p>';
        html += '<input id="kas-saldo-awal" type="number" min="0" step="1" value="' + (kas ? Number(kas.saldoAwal || 0) : 0) + '" ' + (hasKasMutation ? 'disabled' : '') + ' class="mt-4 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900">';
        html += '<div class="flex justify-end gap-2 mt-5"><button onclick="Utils.closeModal()" class="px-4 py-2 rounded-xl bg-slate-100">Tutup</button>';
        if (!hasKasMutation) html += '<button onclick="AppKeuanganMutasiRekening.simpanSaldoKas()" class="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold">Simpan</button>';
        html += '</div></div>'; Utils.openModal(html);
    },

    simpanSaldoKas: function () {
        var kas = this._account('kas');
        var input = document.getElementById('kas-saldo-awal');
        var saldoAwal = Number(input ? input.value : 0);
        if (!kas) return Utils.toast('Akun Kas belum tersedia.', 'error');
        if (!Number.isFinite(saldoAwal) || saldoAwal < 0) return Utils.toast('Saldo awal tidak valid.', 'warning');
        if (this.mutations.some(function (m) { return m.dariId === 'kas' || m.keId === 'kas'; })) return Utils.toast('Saldo awal Kas tidak dapat diubah setelah ada mutasi.', 'warning');
        db.collection('rekeningSaldo').doc('kas').update({ saldoAwal: saldoAwal, saldo: saldoAwal }).then(function () { Utils.closeModal(); Utils.toast('Saldo awal Kas disimpan.', 'success'); }).catch(function (err) { Utils.toast('Gagal menyimpan saldo Kas: ' + err.message, 'error'); });
    },

    bukaModalMutasi: function () {
        var accounts = this.accounts.filter(function (a) { return a.aktif !== false; });
        if (accounts.length < 2) return Utils.toast('Tambahkan minimal satu rekening bank terlebih dahulu.', 'warning');
        var options = accounts.map(function (a) { return '<option value="' + Utils.escapeHtml(a.id) + '">' + Utils.escapeHtml(a.nama) + ' — ' + Utils.formatRupiah(a.saldo) + '</option>'; }).join('');
        var html = '<div class="p-6"><div class="flex items-center justify-between mb-5"><h3 class="text-lg font-bold">Tambah Mutasi Saldo</h3><button onclick="Utils.closeModal()" class="text-slate-400"><i data-lucide="x" class="w-5 h-5"></i></button></div>';
        html += '<div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 mb-4">Mutasi hanya memindahkan uang antar akun. Tidak menjadi pendapatan, biaya, omzet, HPP, stok, atau payroll.</div>';
        html += '<div class="space-y-4"><label class="block"><span class="text-xs font-semibold text-slate-500">Dari akun *</span><select id="mutasi-dari" class="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900">' + options + '</select></label>';
        html += '<label class="block"><span class="text-xs font-semibold text-slate-500">Ke akun *</span><select id="mutasi-ke" class="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900">' + options + '</select></label>';
        html += '<label class="block"><span class="text-xs font-semibold text-slate-500">Nominal *</span><input id="mutasi-nominal" type="number" min="1" step="1" class="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900" placeholder="0"></label>';
        html += '<label class="block"><span class="text-xs font-semibold text-slate-500">Tanggal *</span><input id="mutasi-tanggal" type="date" value="' + Utils.today() + '" class="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"></label>';
        html += '<label class="block"><span class="text-xs font-semibold text-slate-500">Keterangan</span><textarea id="mutasi-keterangan" rows="3" class="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900" placeholder="Contoh: setor kas ke BCA"></textarea></label></div>';
        html += '<div class="flex justify-end gap-2 mt-6"><button onclick="Utils.closeModal()" class="px-4 py-2 rounded-xl bg-slate-100">Batal</button><button onclick="AppKeuanganMutasiRekening.simpanMutasi()" class="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold">Simpan Mutasi</button></div></div>';
        Utils.openModal(html);
    },

    simpanMutasi: function () {
        var dariId = (document.getElementById('mutasi-dari') || {}).value || '';
        var keId = (document.getElementById('mutasi-ke') || {}).value || '';
        var nominal = Number((document.getElementById('mutasi-nominal') || {}).value || 0);
        var tanggal = (document.getElementById('mutasi-tanggal') || {}).value || '';
        var keterangan = ((document.getElementById('mutasi-keterangan') || {}).value || '').trim();
        if (!dariId || !keId || dariId === keId) return Utils.toast('Pilih dua akun yang berbeda.', 'warning');
        if (!Number.isFinite(nominal) || nominal <= 0) return Utils.toast('Nominal mutasi harus lebih dari 0.', 'warning');
        if (!tanggal) return Utils.toast('Tanggal mutasi wajib diisi.', 'warning');

        var dariRef = db.collection('rekeningSaldo').doc(dariId);
        var keRef = db.collection('rekeningSaldo').doc(keId);
        var mutasiRef = db.collection('mutasiSaldo').doc();
        var userName = window.currentUserName || (window.auth && auth.currentUser ? (auth.currentUser.displayName || auth.currentUser.email || '') : '');

        db.runTransaction(function (tx) {
            return tx.get(dariRef).then(function (dariSnap) {
                return tx.get(keRef).then(function (keSnap) {
                    if (!dariSnap.exists || !keSnap.exists) throw new Error('Akun sumber atau tujuan tidak ditemukan.');
                    var dari = dariSnap.data(), ke = keSnap.data();
                    var saldoDari = Number(dari.saldo || 0);
                    if (saldoDari < nominal) throw new Error('Saldo ' + (dari.nama || 'akun sumber') + ' tidak mencukupi.');
                    tx.update(dariRef, { saldo: saldoDari - nominal });
                    tx.update(keRef, { saldo: Number(ke.saldo || 0) + nominal });
                    tx.set(mutasiRef, {
                        tipe: 'transfer_internal', dariId: dariId, dariNama: dari.nama || '', keId: keId, keNama: ke.nama || '',
                        nominal: nominal, tanggal: tanggal, keterangan: keterangan,
                        dibuatOlehUid: window.currentUid || '', dibuatOlehNama: userName,
                        dibuatPada: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });
            });
        }).then(function () {
            Utils.closeModal(); Utils.toast('Mutasi saldo berhasil disimpan.', 'success');
        }).catch(function (err) {
            console.error('Gagal menyimpan mutasi saldo:', err);
            Utils.toast('Gagal menyimpan mutasi saldo: ' + err.message, 'error');
        });
    }
};
