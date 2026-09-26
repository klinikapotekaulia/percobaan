/**
 * js/laporan/pengeluaran.js
 * Pengeluaran Kas Harian & Bulanan dengan Approval
 */

window.AppLaporanPengeluaran = {
    data: [],

    render: function() {
        var role = window.currentRole || 'apotek';
        var canInput = (role === 'apotek' || role === 'keuangan');

        var html = '<div class="page-enter max-w-5xl">';
        html += '  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">';
        html += '    <div>';
        html += '      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Pengeluaran Kas</h2>';
        html += '      <p class="text-sm text-slate-500 dark:text-slate-400">Catat pengeluaran operasional harian & bulanan</p>';
        html += '    </div>';
        if (canInput) {
            html += '  <button onclick="AppLaporanPengeluaran.openForm()" class="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-2 self-start"><i data-lucide="plus" class="w-4 h-4"></i> Ajukan Pengeluaran</button>';
        }
        html += '  </div>';
        html += '  <div id="pengeluaran-content"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        var self = this;
        // Ambil 50 pengeluaran terbaru
        db.collection('kasKeluar').orderBy('createdAt', 'desc').limit(50).get().then(snap => {
            self.data = [];
            snap.forEach(doc => { var d = doc.data(); d.id = doc.id; self.data.push(d); });
            self.renderList();
        }).catch(err => Utils.toast('Gagal memuat: ' + err.message, 'error'));
    },

    renderList: function() {
        var container = document.getElementById('pengeluaran-content');
        var role = window.currentRole || 'apotek';
        var isApprover = (role === 'admin' || role === 'keuangan' || role === 'psa');
        var canEdit = (role === 'admin' || role === 'keuangan' || role === 'psa');

        if (this.data.length === 0) {
            container.innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl border p-8 text-center text-slate-400">Belum ada pengeluaran tercatat.</div>';
            return;
        }

        var html = '<div class="space-y-3">';
        this.data.forEach(function(p) {
            var tgl = p.tanggal ? new Date(p.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
            var badge = '';
            if (p.status === 'pending') badge = '<span class="text-xs bg-amber-100 text-amber-600 px-2 py-1 rounded-full">Pending</span>';
            else if (p.status === 'approved') badge = '<span class="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">Disetujui</span>';
            else if (p.status === 'rejected') badge = '<span class="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">Ditolak</span>';

            html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col sm:flex-row justify-between gap-3">';
            html += '<div class="flex-1">';
            html += '<div class="flex items-center gap-2 mb-1">' + badge;
            html += '<span class="text-xs text-slate-400">' + Utils.escapeHtml(p.kategori || 'Operasional') + '</span></div>';
            html += '<h3 class="font-bold text-gray-800 dark:text-white">' + Utils.escapeHtml(p.keterangan || '-') + '</h3>';
            html += '<p class="text-xs text-slate-400 mt-1">' + tgl + ' • Diajukan oleh: ' + Utils.escapeHtml(p.inputOleh || '-') + '</p>';
            html += '</div>';
            
            if (p.edited) {
                html += '<p class="text-[10px] text-slate-400 italic mt-1">Diedit oleh ' + Utils.escapeHtml(p.editedBy || '-') + '</p>';
            }
            html += '</div>';

            html += '<div class="flex flex-col items-end justify-center gap-2">';
            html += '<p class="text-lg font-bold text-red-600 dark:text-red-400">' + Utils.formatRupiah(p.jumlah) + '</p>';

            html += '<div class="flex gap-1 flex-wrap justify-end">';
            if (p.status === 'pending' && isApprover) {
                html += '<button onclick="AppLaporanPengeluaran.approve(\'' + p.id + '\')" class="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium">Approve</button>';
                html += '<button onclick="AppLaporanPengeluaran.reject(\'' + p.id + '\')" class="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg font-medium">Tolak</button>';
            }
            if (canEdit) {
                html += '<button onclick="AppLaporanPengeluaran.openEditForm(\'' + p.id + '\')" class="text-xs bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1"><i data-lucide="pencil" class="w-3 h-3"></i>Edit</button>';
                html += '<button onclick="AppLaporanPengeluaran.hapus(\'' + p.id + '\')" class="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1"><i data-lucide="trash-2" class="w-3 h-3"></i>Hapus</button>';
            }
            html += '</div>';
            html += '</div>';
            html += '</div>';
        });
        html += '</div>'; // FIX: tutup wrapper space-y-3
        container.innerHTML = html;
        lucide.createIcons();
    },

    openForm: function() {
        var html = '<div class="p-6">';
        html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-semibold text-gray-800 dark:text-white">Ajukan Pengeluaran</h3><button onclick="Utils.closeModal()" class="p-1.5 hover:bg-slate-100 rounded-lg"><i data-lucide="x" class="w-5 h-5 text-slate-400"></i></button></div>';
        html += '<form id="form-pengeluaran" class="space-y-4">';
        
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kategori / Akun Pengeluaran *</label>';
        html += '<select id="pe-kategori" class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm">';
        html += '  <option value="5-2300" data-label="Beban Operasional">Beban Operasional (Listrik, Air, Wifi, ATK, Kebersihan)</option>';
        html += '  <option value="1-1500" data-label="Perlengkapan & ATK">Perlengkapan & ATK (Aset - Pembelian Stock Plastik, Kertas Struk, dll)</option>';
        html += '  <option value="1-2100" data-label="Peralatan Medis">Peralatan Medis (Aset Tetap - Tensi, Stetoskop, Tabung Oksigen, dll)</option>';
        html += '  <option value="1-2200" data-label="Peralatan Apotek & Furniture">Peralatan Apotek & Furniture (Aset Tetap - Meja, Kursi, Lemari Kaca, AC, dll)</option>';
        html += '  <option value="5-3000" data-label="Beban Lain-lain">Beban Lain-lain (Beban Non-Operasional)</option>';
        html += '</select></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Keterangan *</label><input type="text" id="pe-ket" required class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="Contoh: Beli kertas A4 2 rim"></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Jumlah (Rp) *</label><input type="number" id="pe-jumlah" required min="0" class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="50000"></div>';
        
        html += '<div class="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">';
        html += '<button type="button" onclick="Utils.closeModal()" class="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Batal</button>';
        html += '<button type="submit" class="px-6 py-2.5 text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg">Ajukan</button>';
        html += '</div></form></div>';
 
        Utils.openModal(html);
        setTimeout(() => {
            document.getElementById('form-pengeluaran').addEventListener('submit', function(e) {
                e.preventDefault();
                AppLaporanPengeluaran.simpan();
            });
        }, 100);
    },
 
    simpan: function() {
        // PERBAIKAN AUDIT (temuan #10): sebelumnya tidak ada penjaga klik-ganda
        // sama sekali di sini. Tombol bertipe submit, jadi menekan Enter dua kali
        // atau double-tap di tablet menghasilkan DUA dokumen kasKeluar identik
        // dengan ID acak berbeda — dua-duanya nanti ikut di-approve dan dihitung
        // sebagai beban di Laporan Keuangan.
        var release = SubmitGuard.lock('pengeluaran:simpan',
                                       '#form-pengeluaran button[type="submit"]');
        if (!release) return;

        var catSelect = document.getElementById('pe-kategori');
        var selectedOpt = catSelect.options[catSelect.selectedIndex];
        var label = selectedOpt.getAttribute('data-label') || 'Operasional';
        var akunDebit = catSelect.value;

        var obj = {
            tanggal: Utils.today(), // FIX: pakai tanggal lokal, bukan UTC
            kategori: label,
            akunDebit: akunDebit,
            keterangan: document.getElementById('pe-ket').value.trim(),
            jumlah: parseFloat(document.getElementById('pe-jumlah').value) || 0,
            status: 'pending',
            inputOleh: window.currentUserName || 'User',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (obj.jumlah <= 0) { Utils.toast('Jumlah harus lebih dari 0', 'error'); release(); return; }

        db.collection('kasKeluar').add(obj).then((ref) => {
            Utils.toast('Pengajuan berhasil dikirim!', 'success');
            Utils.closeModal();
            AuditLog.catat({
                aksi: 'tambah', modul: 'Pengeluaran Kas', koleksi: 'kasKeluar', targetId: ref.id,
                deskripsi: 'Ajukan pengeluaran: ' + obj.keterangan, nominal: obj.jumlah
            });
            release();
            AppLaporanPengeluaran.init();
        }).catch(err => { Utils.toast('Gagal: ' + err.message, 'error'); release(); });
    },

    KATEGORI_OPTIONS: [
        { value: '5-2300', label: 'Beban Operasional', desc: 'Listrik, Air, Wifi, ATK, Kebersihan' },
        { value: '1-1500', label: 'Perlengkapan & ATK', desc: 'Aset - Pembelian Stock Plastik, Kertas Struk, dll' },
        { value: '1-2100', label: 'Peralatan Medis', desc: 'Aset Tetap - Tensi, Stetoskop, Tabung Oksigen, dll' },
        { value: '1-2200', label: 'Peralatan Apotek & Furniture', desc: 'Aset Tetap - Meja, Kursi, Lemari Kaca, AC, dll' },
        { value: '5-3000', label: 'Beban Lain-lain', desc: 'Beban Non-Operasional' }
    ],

    openEditForm: function(id) {
        var item = this.data.find(p => p.id === id);
        if (!item) { Utils.toast('Data tidak ditemukan', 'error'); return; }

        var html = '<div class="p-6">';
        html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-semibold text-gray-800 dark:text-white">Edit Pengeluaran</h3><button onclick="Utils.closeModal()" class="p-1.5 hover:bg-slate-100 rounded-lg"><i data-lucide="x" class="w-5 h-5 text-slate-400"></i></button></div>';
        html += '<form id="form-edit-pengeluaran" class="space-y-4">';

        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kategori / Akun Pengeluaran *</label>';
        html += '<select id="pe-edit-kategori" class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm">';
        this.KATEGORI_OPTIONS.forEach(function(opt) {
            var selected = (opt.value === item.akunDebit) ? ' selected' : '';
            html += '  <option value="' + opt.value + '" data-label="' + Utils.escapeHtml(opt.label) + '"' + selected + '>' + Utils.escapeHtml(opt.label) + ' (' + Utils.escapeHtml(opt.desc) + ')</option>';
        });
        html += '</select></div>';

        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tanggal *</label><input type="date" id="pe-edit-tanggal" required value="' + (item.tanggal || Utils.today()) + '" class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm"></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Keterangan *</label><input type="text" id="pe-edit-ket" required value="' + Utils.escapeHtml(item.keterangan || '') + '" class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm"></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Jumlah (Rp) *</label><input type="number" id="pe-edit-jumlah" required min="0" value="' + (item.jumlah || 0) + '" class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm"></div>';

        if (item.status === 'approved') {
            html += '<div class="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-lg p-2.5">Catatan: pengeluaran ini sudah <b>disetujui</b>. Mengedit akan tetap mengubah data laporan, pastikan perubahan sudah benar.</div>';
        }

        html += '<div class="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">';
        html += '<button type="button" onclick="Utils.closeModal()" class="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Batal</button>';
        html += '<button type="submit" class="px-6 py-2.5 text-sm bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg">Simpan Perubahan</button>';
        html += '</div></form></div>';

        Utils.openModal(html);
        setTimeout(() => {
            document.getElementById('form-edit-pengeluaran').addEventListener('submit', function(e) {
                e.preventDefault();
                AppLaporanPengeluaran.simpanEdit(id);
            });
        }, 100);
    },

    simpanEdit: function(id) {
        var item = this.data.find(p => p.id === id);
        var catSelect = document.getElementById('pe-edit-kategori');
        var selectedOpt = catSelect.options[catSelect.selectedIndex];
        var label = selectedOpt.getAttribute('data-label') || 'Operasional';
        var akunDebit = catSelect.value;

        var jumlahBaru = parseFloat(document.getElementById('pe-edit-jumlah').value) || 0;
        if (jumlahBaru <= 0) { Utils.toast('Jumlah harus lebih dari 0', 'error'); return; }

        var update = {
            tanggal: document.getElementById('pe-edit-tanggal').value || Utils.today(),
            kategori: label,
            akunDebit: akunDebit,
            keterangan: document.getElementById('pe-edit-ket').value.trim(),
            jumlah: jumlahBaru,
            edited: true,
            editedBy: window.currentUserName || 'User',
            editedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        db.collection('kasKeluar').doc(id).update(update).then(() => {
            Utils.toast('Perubahan berhasil disimpan!', 'success');
            Utils.closeModal();
            AuditLog.catat({
                aksi: 'edit', modul: 'Pengeluaran Kas', koleksi: 'kasKeluar', targetId: id,
                deskripsi: 'Edit pengeluaran: ' + (item ? item.keterangan : id) + ' -> ' + update.keterangan,
                nominal: update.jumlah
            });
            AppLaporanPengeluaran.init();
        }).catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    },

    hapus: function(id) {
        var item = this.data.find(p => p.id === id);
        if (!confirm('Hapus catatan pengeluaran ini? Tindakan ini tidak dapat dibatalkan.')) return;
        db.collection('kasKeluar').doc(id).delete().then(() => {
            Utils.toast('Pengeluaran dihapus.', 'info');
            AuditLog.catat({
                aksi: 'hapus', modul: 'Pengeluaran Kas', koleksi: 'kasKeluar', targetId: id,
                deskripsi: 'Hapus pengeluaran: ' + (item ? item.keterangan : id), nominal: item ? item.jumlah : null
            });
            AppLaporanPengeluaran.init();
        }).catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    },

    approve: function(id) {
        if (!confirm('Setujui pengeluaran ini? Kas akan keluar.')) return;
        var item = this.data.find(p => p.id === id);
        db.collection('kasKeluar').doc(id).update({
            status: 'approved',
            approvedBy: window.currentUserName || 'Admin',
            approvedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            Utils.toast('Pengeluaran disetujui!', 'success');
            AuditLog.catat({
                aksi: 'approve', modul: 'Pengeluaran Kas', koleksi: 'kasKeluar', targetId: id,
                deskripsi: 'Approve pengeluaran: ' + (item ? item.keterangan : id), nominal: item ? item.jumlah : null
            });
            AppLaporanPengeluaran.init();
        }).catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    },

    reject: function(id) {
        if (!confirm('Tolak pengajuan ini?')) return;
        var item = this.data.find(p => p.id === id);
        db.collection('kasKeluar').doc(id).update({ status: 'rejected' }).then(() => {
            Utils.toast('Pengajuan ditolak.', 'info');
            AuditLog.catat({
                aksi: 'tolak', modul: 'Pengeluaran Kas', koleksi: 'kasKeluar', targetId: id,
                deskripsi: 'Tolak pengeluaran: ' + (item ? item.keterangan : id), nominal: item ? item.jumlah : null
            });
            AppLaporanPengeluaran.init();
        }).catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    }
};