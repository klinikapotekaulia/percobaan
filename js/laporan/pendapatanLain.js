/**
 * js/laporan/pendapatanLain.js
 * Pendapatan Lain (Non-Operasional) — Sewa, Jasa Lain, Bunga Bank, dll.
 * Input: apotek, admin, psa, keuangan. Edit/Hapus: khusus keuangan.
 */

window.AppLaporanPendapatanLain = {
    data: [],

    KATEGORI_OPTIONS: [
        { value: 'sewa', label: 'Pendapatan Sewa' },
        { value: 'jasa_lain', label: 'Pendapatan Jasa Lain' },
        { value: 'bunga_bank', label: 'Bunga Bank' },
        { value: 'jual_aset', label: 'Penjualan Aset Bekas' },
        { value: 'komisi', label: 'Komisi / Kerjasama' },
        { value: 'lain', label: 'Lain-lain' }
    ],

    render: function() {
        var role = window.currentRole || 'apotek';
        var canInput = (role === 'apotek' || role === 'admin' || role === 'psa' || role === 'keuangan');

        var html = '<div class="page-enter max-w-5xl">';
        html += '  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">';
        html += '    <div>';
        html += '      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Pendapatan Lain</h2>';
        html += '      <p class="text-sm text-slate-500 dark:text-slate-400">Catat pendapatan di luar penjualan obat & jasa medis (sewa, bunga bank, komisi, dll)</p>';
        html += '    </div>';
        if (canInput) {
            html += '  <button onclick="AppLaporanPendapatanLain.openForm()" class="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-2 self-start"><i data-lucide="plus" class="w-4 h-4"></i> Catat Pendapatan</button>';
        }
        html += '  </div>';
        html += '  <div id="pendapatan-lain-summary" class="mb-4"></div>';
        html += '  <div id="pendapatan-lain-content"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        var role = window.currentRole || 'apotek';
        var allowed = (role === 'apotek' || role === 'admin' || role === 'psa' || role === 'keuangan');
        if (!allowed) {
            var c = document.getElementById('pendapatan-lain-content') || document.getElementById('app-content');
            if (c) c.innerHTML = '<div class="p-8 text-center text-red-500 font-bold bg-white dark:bg-slate-800 rounded-xl border">Akses Ditolak: Halaman ini khusus akun Apotek, Admin, PSA & Keuangan.</div>';
            return;
        }

        var self = this;
        db.collection('pendapatanLain').orderBy('createdAt', 'desc').limit(50).get().then(snap => {
            self.data = [];
            snap.forEach(doc => { var d = doc.data(); d.id = doc.id; self.data.push(d); });
            self.renderSummary();
            self.renderList();
        }).catch(err => Utils.toast('Gagal memuat: ' + err.message, 'error'));
    },

    renderSummary: function() {
        var el = document.getElementById('pendapatan-lain-summary');
        if (!el) return;
        var total = this.data.reduce(function(sum, p) { return sum + (p.jumlah || 0); }, 0);
        var thisMonth = Utils.thisMonth();
        var totalBulanIni = this.data.reduce(function(sum, p) {
            return (p.tanggal || '').slice(0, 7) === thisMonth ? sum + (p.jumlah || 0) : sum;
        }, 0);

        var html = '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">';
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3">';
        html += '<div class="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0"><i data-lucide="calendar-check" class="w-5 h-5"></i></div>';
        html += '<div><p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Bulan Ini</p><h3 class="text-lg font-black text-slate-800 dark:text-white">' + Utils.formatRupiah(totalBulanIni) + '</h3></div></div>';

        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3">';
        html += '<div class="w-11 h-11 rounded-xl bg-primary-500/10 text-primary-600 flex items-center justify-center flex-shrink-0"><i data-lucide="wallet" class="w-5 h-5"></i></div>';
        html += '<div><p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total (50 terbaru)</p><h3 class="text-lg font-black text-slate-800 dark:text-white">' + Utils.formatRupiah(total) + '</h3></div></div>';
        html += '</div>';
        el.innerHTML = html;
        if (window.lucide) lucide.createIcons();
    },

    renderList: function() {
        var container = document.getElementById('pendapatan-lain-content');
        var role = window.currentRole || 'apotek';
        var canEdit = (role === 'keuangan'); // Khusus akun Keuangan yang bisa edit/hapus data sudah diinput

        if (this.data.length === 0) {
            container.innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl border p-8 text-center text-slate-400">Belum ada pendapatan lain tercatat.</div>';
            return;
        }

        var self = this;
        var html = '<div class="space-y-3">';
        this.data.forEach(function(p) {
            var tgl = p.tanggal ? new Date(p.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
            var katLabel = self.katLabel(p.kategori);

            html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col sm:flex-row justify-between gap-3">';
            html += '<div class="flex-1">';
            html += '<div class="flex items-center gap-2 mb-1"><span class="text-xs bg-emerald-100 text-emerald-600 px-2 py-1 rounded-full">' + Utils.escapeHtml(katLabel) + '</span></div>';
            html += '<h3 class="font-bold text-gray-800 dark:text-white">' + Utils.escapeHtml(p.keterangan || '-') + '</h3>';
            html += '<p class="text-xs text-slate-400 mt-1">' + tgl + ' • Dicatat oleh: ' + Utils.escapeHtml(p.inputOleh || '-') + '</p>';
            if (p.edited) {
                html += '<p class="text-[10px] text-slate-400 italic mt-1">Diedit oleh ' + Utils.escapeHtml(p.editedBy || '-') + '</p>';
            }
            html += '</div>';

            html += '<div class="flex flex-col items-end justify-center gap-2">';
            html += '<p class="text-lg font-bold text-emerald-600 dark:text-emerald-400">+' + Utils.formatRupiah(p.jumlah) + '</p>';
            if (canEdit) {
                html += '<div class="flex gap-1 flex-wrap justify-end">';
                html += '<button onclick="AppLaporanPendapatanLain.openEditForm(\'' + p.id + '\')" class="text-xs bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1"><i data-lucide="pencil" class="w-3 h-3"></i>Edit</button>';
                html += '<button onclick="AppLaporanPendapatanLain.hapus(\'' + p.id + '\')" class="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1"><i data-lucide="trash-2" class="w-3 h-3"></i>Hapus</button>';
                html += '</div>';
            }
            html += '</div>';
            html += '</div>';
        });
        html += '</div>';
        container.innerHTML = html;
        if (window.lucide) lucide.createIcons();
    },

    katLabel: function(value) {
        var found = this.KATEGORI_OPTIONS.find(function(o) { return o.value === value; });
        return found ? found.label : 'Lain-lain';
    },

    openForm: function() {
        var html = '<div class="p-6">';
        html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-semibold text-gray-800 dark:text-white">Catat Pendapatan Lain</h3><button onclick="Utils.closeModal()" class="p-1.5 hover:bg-slate-100 rounded-lg"><i data-lucide="x" class="w-5 h-5 text-slate-400"></i></button></div>';
        html += '<form id="form-pendapatan-lain" class="space-y-4">';

        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kategori *</label>';
        html += '<select id="pl-kategori" class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm">';
        this.KATEGORI_OPTIONS.forEach(function(opt) {
            html += '  <option value="' + opt.value + '">' + Utils.escapeHtml(opt.label) + '</option>';
        });
        html += '</select></div>';

        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tanggal *</label><input type="date" id="pl-tanggal" required value="' + Utils.today() + '" class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm"></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Keterangan *</label><input type="text" id="pl-ket" required class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="Contoh: Sewa ruang tunggu untuk bazar"></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Jumlah (Rp) *</label><input type="number" id="pl-jumlah" required min="0" class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="500000"></div>';

        html += '<div class="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">';
        html += '<button type="button" onclick="Utils.closeModal()" class="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Batal</button>';
        html += '<button type="submit" class="px-6 py-2.5 text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg">Simpan</button>';
        html += '</div></form></div>';

        Utils.openModal(html);
        setTimeout(() => {
            document.getElementById('form-pendapatan-lain').addEventListener('submit', function(e) {
                e.preventDefault();
                AppLaporanPendapatanLain.simpan();
            });
        }, 100);
    },

    simpan: function() {
        // PERBAIKAN AUDIT (temuan #10): penjaga klik-ganda.
        var release = SubmitGuard.lock('pendapatanLain:simpan',
                                       '#form-pendapatan-lain button[type="submit"]');
        if (!release) return;

        var obj = {
            tanggal: document.getElementById('pl-tanggal').value || Utils.today(),
            kategori: document.getElementById('pl-kategori').value,
            keterangan: document.getElementById('pl-ket').value.trim(),
            jumlah: parseFloat(document.getElementById('pl-jumlah').value) || 0,
            inputOleh: window.currentUserName || 'User',
            inputRole: window.currentRole || '-',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (obj.jumlah <= 0) { Utils.toast('Jumlah harus lebih dari 0', 'error'); release(); return; }
        if (!obj.keterangan) { Utils.toast('Keterangan wajib diisi', 'error'); release(); return; }

        db.collection('pendapatanLain').add(obj).then((ref) => {
            Utils.toast('Pendapatan berhasil dicatat!', 'success');
            Utils.closeModal();
            AuditLog.catat({
                aksi: 'tambah', modul: 'Pendapatan Lain', koleksi: 'pendapatanLain', targetId: ref.id,
                deskripsi: 'Catat pendapatan lain: ' + obj.keterangan, nominal: obj.jumlah
            });
            release();
            AppLaporanPendapatanLain.init();
        }).catch(err => { Utils.toast('Gagal: ' + err.message, 'error'); release(); });
    },

    openEditForm: function(id) {
        var role = window.currentRole || 'apotek';
        if (role !== 'keuangan') { Utils.toast('Hanya akun Keuangan yang bisa mengedit data ini.', 'error'); return; }

        var item = this.data.find(p => p.id === id);
        if (!item) { Utils.toast('Data tidak ditemukan', 'error'); return; }

        var html = '<div class="p-6">';
        html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-semibold text-gray-800 dark:text-white">Edit Pendapatan Lain</h3><button onclick="Utils.closeModal()" class="p-1.5 hover:bg-slate-100 rounded-lg"><i data-lucide="x" class="w-5 h-5 text-slate-400"></i></button></div>';
        html += '<form id="form-edit-pendapatan-lain" class="space-y-4">';

        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kategori *</label>';
        html += '<select id="pl-edit-kategori" class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm">';
        this.KATEGORI_OPTIONS.forEach(function(opt) {
            var selected = (opt.value === item.kategori) ? ' selected' : '';
            html += '  <option value="' + opt.value + '"' + selected + '>' + Utils.escapeHtml(opt.label) + '</option>';
        });
        html += '</select></div>';

        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tanggal *</label><input type="date" id="pl-edit-tanggal" required value="' + (item.tanggal || Utils.today()) + '" class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm"></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Keterangan *</label><input type="text" id="pl-edit-ket" required value="' + Utils.escapeHtml(item.keterangan || '') + '" class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm"></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Jumlah (Rp) *</label><input type="number" id="pl-edit-jumlah" required min="0" value="' + (item.jumlah || 0) + '" class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm"></div>';

        html += '<div class="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">';
        html += '<button type="button" onclick="Utils.closeModal()" class="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Batal</button>';
        html += '<button type="submit" class="px-6 py-2.5 text-sm bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg">Simpan Perubahan</button>';
        html += '</div></form></div>';

        Utils.openModal(html);
        setTimeout(() => {
            document.getElementById('form-edit-pendapatan-lain').addEventListener('submit', function(e) {
                e.preventDefault();
                AppLaporanPendapatanLain.simpanEdit(id);
            });
        }, 100);
    },

    simpanEdit: function(id) {
        var role = window.currentRole || 'apotek';
        if (role !== 'keuangan') { Utils.toast('Hanya akun Keuangan yang bisa mengedit data ini.', 'error'); return; }

        var item = this.data.find(p => p.id === id);
        var jumlahBaru = parseFloat(document.getElementById('pl-edit-jumlah').value) || 0;
        var ketBaru = document.getElementById('pl-edit-ket').value.trim();
        if (jumlahBaru <= 0) { Utils.toast('Jumlah harus lebih dari 0', 'error'); return; }
        if (!ketBaru) { Utils.toast('Keterangan wajib diisi', 'error'); return; }

        var update = {
            tanggal: document.getElementById('pl-edit-tanggal').value || Utils.today(),
            kategori: document.getElementById('pl-edit-kategori').value,
            keterangan: ketBaru,
            jumlah: jumlahBaru,
            edited: true,
            editedBy: window.currentUserName || 'Keuangan',
            editedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        db.collection('pendapatanLain').doc(id).update(update).then(() => {
            Utils.toast('Perubahan berhasil disimpan!', 'success');
            Utils.closeModal();
            AuditLog.catat({
                aksi: 'edit', modul: 'Pendapatan Lain', koleksi: 'pendapatanLain', targetId: id,
                deskripsi: 'Edit pendapatan lain: ' + (item ? item.keterangan : id) + ' -> ' + update.keterangan,
                nominal: update.jumlah
            });
            AppLaporanPendapatanLain.init();
        }).catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    },

    hapus: function(id) {
        var role = window.currentRole || 'apotek';
        if (role !== 'keuangan') { Utils.toast('Hanya akun Keuangan yang bisa menghapus data ini.', 'error'); return; }

        var item = this.data.find(p => p.id === id);
        if (!confirm('Hapus catatan pendapatan ini? Tindakan ini tidak dapat dibatalkan.')) return;
        db.collection('pendapatanLain').doc(id).delete().then(() => {
            Utils.toast('Pendapatan dihapus.', 'info');
            AuditLog.catat({
                aksi: 'hapus', modul: 'Pendapatan Lain', koleksi: 'pendapatanLain', targetId: id,
                deskripsi: 'Hapus pendapatan lain: ' + (item ? item.keterangan : id), nominal: item ? item.jumlah : null
            });
            AppLaporanPendapatanLain.init();
        }).catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    }
};