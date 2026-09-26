/**
 * js/pengaturan/tindakan.js
 * Master Tindakan Klinik & Apotek (Harga, Modal, Tuslah)
 */

window.AppPengaturanTindakan = {
    data: [],
    filterKategori: 'semua',

    render: function() {
        var html = '<div class="page-enter max-w-3xl">';
        html += '<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">';
        html += '  <div>';
        html += '    <h2 class="text-xl font-bold text-gray-800 dark:text-white">Master Tindakan</h2>';
        html += '    <p class="text-sm text-slate-500 dark:text-slate-400">Daftar tindakan klinik & apotek beserta harga dan modal</p>';
        html += '  </div>';
        html += '  <button onclick="AppPengaturanTindakan.openForm()" class="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-2 self-start"><i data-lucide="plus" class="w-4 h-4"></i> Tambah Tindakan</button>';
        html += '</div>';

        // Tab Filter
        html += '<div class="flex gap-1 mb-4 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">';
        var tabs = [{ id: 'semua', label: 'Semua' }, { id: 'klinik', label: 'Klinik' }, { id: 'apotek', label: 'Apotek' }];
        tabs.forEach(t => {
            var active = (this.filterKategori === t.id) ? ' bg-white dark:bg-slate-700 shadow-sm text-primary-600 dark:text-primary-400 font-semibold' : ' text-slate-500 dark:text-slate-400 hover:text-gray-700';
            html += '<button onclick="AppPengaturanTindakan.setFilter(\'' + t.id + '\')" class="flex-1 py-2 text-sm rounded-md transition' + active + '">' + t.label + '</button>';
        });
        html += '</div>';

        html += '<div id="tindakan-list"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

        init: function() {
        // HAPUS orderBy('kategori') agar tidak butuh Composite Index Firebase
        db.collection('masterTindakan').orderBy('nama').get().then(snap => {
            AppPengaturanTindakan.data = [];
            snap.forEach(doc => { 
                var d = doc.data(); 
                d.id = doc.id; 
                AppPengaturanTindakan.data.push(d); 
            });
            
            // Urutkan Kategori manual pakai JavaScript (Klinik dulu, baru Apotek)
            AppPengaturanTindakan.data.sort((a, b) => {
                if (a.kategori < b.kategori) return -1;
                if (a.kategori > b.kategori) return 1;
                return 0;
            });

            // Jika database benar-benar kosong, seed data awal
            if (AppPengaturanTindakan.data.length === 0) {
                AppPengaturanTindakan.seedDefaultData();
            } else {
                // Langsung paksa render
                AppPengaturanTindakan.renderList();
            }
        }).catch(err => {
            console.error(err);
            Utils.toast('Gagal memuat: ' + err.message, 'error');
        });
    },

            seedDefaultData: function() {
        var defaults = [
            { nama: 'Cek Tensi', kategori: 'klinik', hargaJual: 15000, modal: 13000, aktif: true },
            { nama: 'Cek Gula Darah', kategori: 'klinik', hargaJual: 15000, modal: 13000, aktif: true },
            { nama: 'Cek Asam Urat', kategori: 'klinik', hargaJual: 15000, modal: 13000, aktif: true },
            { nama: 'Cek Kolestrol', kategori: 'klinik', hargaJual: 15000, modal: 13000, aktif: true },
            { nama: 'Tindakan Nebu', kategori: 'klinik', hargaJual: 15000, modal: 13000, aktif: true },
            { nama: 'Cek Tensi', kategori: 'apotek', hargaJual: 15000, modal: 13000, aktif: true },
            { nama: 'Cek Gula Darah', kategori: 'apotek', hargaJual: 15000, modal: 13000, aktif: true },
            { nama: 'Cek Asam Urat', kategori: 'apotek', hargaJual: 15000, modal: 13000, aktif: true },
            { nama: 'Cek Kolestrol', kategori: 'apotek', hargaJual: 15000, modal: 13000, aktif: true },
            { nama: 'Tindakan Nebu', kategori: 'apotek', hargaJual: 15000, modal: 13000, aktif: true }
        ];

        var batch = db.batch();
        var dataUntukTampil = []; // Siapkan wadah untuk tampilan

        defaults.forEach(function(item) {
            var newDocRef = db.collection('masterTindakan').doc();
            batch.set(newDocRef, item);
            
            // Simpan data beserta ID-nya untuk langsung ditampilkan
            var itemDenganId = Object.assign({}, item);
            itemDenganId.id = newDocRef.id;
            dataUntukTampil.push(itemDenganId);
        });
        
        batch.commit().then(function() {
            Utils.toast('Data tindakan awal berhasil dibuat!', 'success');
            
            // LANGSUNG MASUKKAN KE DATA DAN RENDER, TANPA BACA ULANG DARI FIREBASE
            AppPengaturanTindakan.data = dataUntukTampil;
            AppPengaturanTindakan.renderList();
        }).catch(function(err) {
            Utils.toast('Gagal setup data awal: ' + err.message, 'error');
        });
    },
    
    setFilter: function(kat) {
        this.filterKategori = kat;
        this.renderList();
    },

    renderList: function() {
        var container = document.getElementById('tindakan-list');
        if (!container) return;

        var list = this.data;
        if (this.filterKategori !== 'semua') {
            list = list.filter(t => t.kategori === this.filterKategori);
        }

        if (list.length === 0) {
            container.innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center"><p class="text-sm text-slate-400">Belum ada data tindakan.</p></div>';
            return;
        }

        var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
        html += '<div class="overflow-x-auto">';
        html += '<table class="w-full text-sm">';
        html += '<thead><tr class="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 uppercase tracking-wider">';
        html += '<th class="px-4 py-3 text-left">Nama</th>';
        html += '<th class="px-4 py-3 text-left">Kategori</th>';
        html += '<th class="px-4 py-3 text-right">Harga Jual</th>';
        html += '<th class="px-4 py-3 text-right">Modal</th>';
        html += '<th class="px-4 py-3 text-right">Tuslah</th>';
        html += '<th class="px-4 py-3 text-center">Status</th>';
        html += '<th class="px-4 py-3 text-right">Aksi</th>';
        html += '</tr></thead><tbody>';

        list.forEach(t => {
            var tuslah = (t.hargaJual || 0) - (t.modal || 0);
            var safeName = (t.nama || '-').replace(/'/g, "\\'");
            var katBadge = (t.kategori === 'klinik') ? '<span class="text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-600 px-2 py-0.5 rounded-full">Klinik</span>' : '<span class="text-xs bg-teal-50 dark:bg-teal-900/30 text-teal-600 px-2 py-0.5 rounded-full">Apotek</span>';
            var statusBadge = (t.aktif !== false) ? '<span class="text-xs bg-green-50 dark:bg-green-900/30 text-green-600 px-2 py-0.5 rounded-full">Aktif</span>' : '<span class="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-0.5 rounded-full">Nonaktif</span>';

            html += '<tr class="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">';
            html += '<td class="px-4 py-3 font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(t.nama) + '</td>';
            html += '<td class="px-4 py-3">' + katBadge + '</td>';
            html += '<td class="px-4 py-3 text-right text-slate-600 dark:text-slate-300">' + Utils.formatRupiah(t.hargaJual) + '</td>';
            html += '<td class="px-4 py-3 text-right text-slate-600 dark:text-slate-300">' + Utils.formatRupiah(t.modal) + '</td>';
            html += '<td class="px-4 py-3 text-right font-semibold text-green-600 dark:text-green-400">' + Utils.formatRupiah(tuslah) + '</td>';
            html += '<td class="px-4 py-3 text-center">' + statusBadge + '</td>';
            html += '<td class="px-4 py-3 text-right space-x-1">';
            html += '<button onclick="AppPengaturanTindakan.openForm(\'' + t.id + '\')" class="p-1.5 text-slate-400 hover:text-primary-600 rounded"><i data-lucide="pencil" class="w-4 h-4"></i></button>';
            html += '<button onclick="AppPengaturanTindakan.hapus(\'' + t.id + '\', \'' + safeName + '\')" class="p-1.5 text-slate-400 hover:text-red-600 rounded"><i data-lucide="trash-2" class="w-4 h-4"></i></button>';
            html += '</td></tr>';
        });

        html += '</tbody></table></div></div>';
        container.innerHTML = html;
        lucide.createIcons();
    },

    openForm: function(id) {
        var isEdit = !!id;
        var t = isEdit ? this.data.find(x => x.id === id) : {};
        
        var html = '<div class="p-6">';
        html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-semibold text-gray-800 dark:text-white">' + (isEdit ? 'Edit' : 'Tambah') + ' Tindakan</h3><button onclick="Utils.closeModal()" class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><i data-lucide="x" class="w-5 h-5 text-slate-400"></i></button></div>';
        
        html += '<form id="form-tindakan" class="space-y-4">';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Tindakan *</label><input type="text" id="ft-nama" value="' + Utils.escapeHtml(t.nama || '') + '" required class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="Cek Gula Darah"></div>';
        
        html += '<div class="grid grid-cols-2 gap-4">';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kategori *</label><select id="ft-kat" required class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="">-- Pilih --</option><option value="klinik"' + (t.kategori==='klinik'?' selected':'') + '>Klinik</option><option value="apotek"' + (t.kategori==='apotek'?' selected':'') + '>Apotek</option></select></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label><select id="ft-aktif" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="true"' + (t.aktif !== false?' selected':'') + '>Aktif</option><option value="false"' + (t.aktif === false?' selected':'') + '>Nonaktif</option></select></div>';
        html += '</div>';

        html += '<div class="grid grid-cols-2 gap-4">';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Harga Jual (Rp) *</label><input type="number" id="ft-jual" value="' + (t.hargaJual || 0) + '" required min="0" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="15000" oninput="AppPengaturanTindakan.previewTuslah()"></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Modal / Biaya Bahan (Rp) *</label><input type="number" id="ft-modal" value="' + (t.modal || 0) + '" required min="0" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="13000" oninput="AppPengaturanTindakan.previewTuslah()"><p id="ft-tuslah-info" class="text-xs text-green-600 mt-1 font-medium"></p></div>';
        html += '</div>';

        html += '<div class="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">';
        html += '<button type="button" onclick="Utils.closeModal()" class="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Batal</button>';
        html += '<button type="submit" class="px-6 py-2.5 text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg">Simpan</button>';
        html += '</div>';
        
        if (isEdit) html += '<input type="hidden" id="ft-id" value="' + t.id + '">';
        html += '</form></div>';

        Utils.openModal(html);
        
        // Hitung preview tuslah saat form dibuka
        this.previewTuslah();

        setTimeout(() => {
            document.getElementById('form-tindakan').addEventListener('submit', function(e) {
                e.preventDefault();
                AppPengaturanTindakan.simpan();
            });
        }, 100);
    },

    previewTuslah: function() {
        var jual = parseFloat(document.getElementById('ft-jual')?.value) || 0;
        var modal = parseFloat(document.getElementById('ft-modal')?.value) || 0;
        var tuslah = jual - modal;
        var el = document.getElementById('ft-tuslah-info');
        if (el) el.textContent = 'Laba Tuslah: ' + Utils.formatRupiah(tuslah);
    },

    simpan: function() {
        var idField = document.getElementById('ft-id');
        var isEdit = !!idField;
        
        var obj = {
            nama: document.getElementById('ft-nama').value.trim(),
            kategori: document.getElementById('ft-kat').value,
            hargaJual: parseFloat(document.getElementById('ft-jual').value) || 0,
            modal: parseFloat(document.getElementById('ft-modal').value) || 0,
            aktif: document.getElementById('ft-aktif').value === 'true',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (!obj.nama || !obj.kategori) {
            Utils.toast('Nama dan Kategori wajib diisi', 'error');
            return;
        }

        var p;
        if (isEdit) {
            p = db.collection('masterTindakan').doc(idField.value).update(obj);
        } else {
            obj.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            p = db.collection('masterTindakan').add(obj);
        }

        p.then(() => {
            Utils.toast('Tindakan berhasil disimpan!', 'success');
            Utils.closeModal();
            AppPengaturanTindakan.init();
        }).catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    },

    hapus: function(id, nama) {
        if (!confirm('Hapus tindakan "' + nama + '"?')) return;
        db.collection('masterTindakan').doc(id).delete().then(() => {
            Utils.toast('Berhasil dihapus', 'success');
            AppPengaturanTindakan.init();
        }).catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    }
};
