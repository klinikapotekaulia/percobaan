/**
 * js/laporan/piutang.js
 * Catatan Piutang / Kasbon Karyawan (Manual)
 */

window.AppLaporanPiutang = {
    data: [],
    karyawanList: [],

    render: function() {
        var role = window.currentRole || 'apotek';
        var canInput = (role === 'apotek' || role === 'admin' || role === 'keuangan');

        var html = '<div class="page-enter max-w-5xl">';
        html += '  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">';
        html += '    <div>';
        html += '      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Piutang Karyawan</h2>';
        html += '      <p class="text-sm text-slate-500 dark:text-slate-400">Catatan kasbon & pelunasan manual</p>';
        html += '    </div>';
        if (canInput) {
            html += '  <button onclick="AppLaporanPiutang.openForm()" class="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-2 self-start"><i data-lucide="plus" class="w-4 h-4"></i> Catat Kasbon</button>';
        }
        html += '  </div>';
        html += '  <div id="piutang-content"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        var self = this;
        // Load karyawan & piutang
        var pKary = db.collection('karyawan').where('status', '==', 'aktif').get();
        var pPiutang = db.collection('piutangKaryawan').orderBy('createdAt', 'desc').limit(50).get();

        Promise.all([pKary, pPiutang]).then(function(results) {
            self.karyawanList = [];
            results[0].forEach(function(doc) { var d = doc.data(); d.id = doc.id; self.karyawanList.push(d); });
            
            self.data = [];
            results[1].forEach(function(doc) { var d = doc.data(); d.id = doc.id; self.data.push(d); });
            
            self.renderList();
        }).catch(err => Utils.toast('Gagal memuat: ' + err.message, 'error'));
    },

    renderList: function() {
        var container = document.getElementById('piutang-content');
        var role = window.currentRole || 'apotek';
        var canLunasi = (role === 'admin' || role === 'keuangan');

        if (this.data.length === 0) {
            container.innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl border p-8 text-center text-slate-400">Tidak ada catatan piutang.</div>';
            return;
        }

        var html = '<div class="space-y-3">';
        this.data.forEach(function(p) {
            var tgl = p.tanggal ? new Date(p.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
            var badge = p.status === 'belum_lunas' ? 
                '<span class="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">Belum Lunas</span>' : 
                '<span class="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">Lunas</span>';

            html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col sm:flex-row justify-between gap-3">';
            html += '<div class="flex-1">';
            html += '<div class="flex items-center gap-2 mb-1">' + badge + '</div>';
            html += '<h3 class="font-bold text-gray-800 dark:text-white">' + Utils.escapeHtml(p.namaKaryawan || '-') + '</h3>';
            html += '<p class="text-sm text-slate-500 mt-1">Keperluan: ' + Utils.escapeHtml(p.keterangan || '-') + '</p>';
            html += '<p class="text-xs text-slate-400 mt-1">' + tgl + '</p>';
            html += '</div>';
            
            html += '<div class="flex flex-col items-end justify-center gap-2">';
            html += '<p class="text-lg font-bold text-amber-600 dark:text-amber-400">' + Utils.formatRupiah(p.jumlah) + '</p>';
            
            if (p.status === 'belum_lunas' && canLunasi) {
                html += '<button onclick="AppLaporanPiutang.lunasi(\'' + p.id + '\')" class="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium">Tandai Lunas</button>';
            }
            html += '</div>';
            html += '</div>';
        });
        html += '</div>'; // FIX: tutup wrapper space-y-3
        container.innerHTML = html;
        lucide.createIcons();
    },

    openForm: function() {
        var html = '<div class="p-6">';
        html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-semibold text-gray-800 dark:text-white">Catat Kasbon</h3><button onclick="Utils.closeModal()" class="p-1.5 hover:bg-slate-100 rounded-lg"><i data-lucide="x" class="w-5 h-5 text-slate-400"></i></button></div>';
        html += '<form id="form-piutang" class="space-y-4">';
        
        html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Karyawan *</label><select id="pi-kary" required class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="">-- Pilih --</option>';
        this.karyawanList.forEach(k => {
            html += '<option value="' + k.id + '" data-nama="' + Utils.escapeHtml(k.nama) + '">' + Utils.escapeHtml(k.nama) + '</option>';
        });
        html += '</select></div>';

        html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Jumlah Pinjam (Rp) *</label><input type="number" id="pi-jumlah" required min="0" class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="500000"></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Keperluan / Keterangan</label><input type="text" id="pi-ket" class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="Darurat, Bayar Kontrakan, dll"></div>';
        
        html += '<div class="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">';
        html += '<button type="button" onclick="Utils.closeModal()" class="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Batal</button>';
        html += '<button type="submit" class="px-6 py-2.5 text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg">Simpan</button>';
        html += '</div></form></div>';

        Utils.openModal(html);
        setTimeout(() => {
            document.getElementById('form-piutang').addEventListener('submit', function(e) {
                e.preventDefault();
                AppLaporanPiutang.simpan();
            });
        }, 100);
    },

    simpan: function() {
        // PERBAIKAN AUDIT (temuan #10): penjaga klik-ganda.
        var release = SubmitGuard.lock('piutang:simpan',
                                       '#form-piutang button[type="submit"]');
        if (!release) return;

        var select = document.getElementById('pi-kary');
        var karyId = select.value;
        var namaKary = select.options[select.selectedIndex].getAttribute('data-nama');

        var obj = {
            tanggal: Utils.today(), // FIX: pakai tanggal lokal, bukan UTC
            karyawanId: karyId,
            namaKaryawan: namaKary,
            jumlah: parseFloat(document.getElementById('pi-jumlah').value) || 0,
            keterangan: document.getElementById('pi-ket').value.trim(),
            status: 'belum_lunas',
            inputOleh: window.currentUserName || 'User',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (!obj.karyawanId || obj.jumlah <= 0) { Utils.toast('Lengkapi data', 'error'); release(); return; }

        db.collection('piutangKaryawan').add(obj).then((ref) => {
            Utils.toast('Kasbon tercatat!', 'success');
            Utils.closeModal();
            AuditLog.catat({
                aksi: 'tambah', modul: 'Piutang Karyawan', koleksi: 'piutangKaryawan', targetId: ref.id,
                deskripsi: 'Kasbon baru: ' + obj.namaKaryawan + ' - ' + obj.keterangan, nominal: obj.jumlah
            });
            release();
            AppLaporanPiutang.init();
        }).catch(err => { Utils.toast('Gagal: ' + err.message, 'error'); release(); });
    },

    lunasi: function(id) {
        if (!confirm('Tandai piutang ini sudah lunas?')) return;
        var item = this.data ? this.data.find(p => p.id === id) : null;
        db.collection('piutangKaryawan').doc(id).update({
            status: 'lunas',
            tanggalLunas: Utils.today(), // FIX: pakai tanggal lokal, bukan UTC
            lunasiOleh: window.currentUserName || 'Keuangan'
        }).then(() => {
            Utils.toast('Piutang dilunasi!', 'success');
            AuditLog.catat({
                aksi: 'bayar', modul: 'Piutang Karyawan', koleksi: 'piutangKaryawan', targetId: id,
                deskripsi: 'Lunasi kasbon: ' + (item ? item.namaKaryawan : id), nominal: item ? item.jumlah : null
            });
            AppLaporanPiutang.init();
        }).catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    }
};