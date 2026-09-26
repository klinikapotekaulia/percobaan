/**
 * js/klinik/resep.js
 * Pelacakan Status Resep & Edit/Hapus Resep Klinik (Rekam Medis -> Apotek)
 */

window.AppKlinikResep = {

    // ===== STATE =====
    data: [],
    pasienList: [],
    dokterList: [],
    filterBulan: '',
    filterStatus: 'semua',
    filterPasien: 'semua',
    filterDokter: 'semua',

    // ===== RENDER =====
    render: function() {
        var d = new Date();
        var defaultMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        return [
            '<div class="page-enter max-w-5xl">',
            '  <div class="mb-6">',
            '    <h2 class="text-xl font-bold text-gray-800 dark:text-white">Resep Klinik</h2>',
            '    <p class="text-sm text-slate-500 dark:text-slate-400">Status resep dari rekam medis menuju apotek</p>',
            '  </div>',

            '  <div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-5 shadow-sm">',
            '    <div class="flex flex-wrap items-center gap-3">',
            '      <div>',
            '        <label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Bulan:</label>',
            '        <input type="month" id="resep-filter-bulan" value="' + defaultMonth + '" class="px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg text-sm outline-none">',
            '      </div>',
            '      <div>',
            '        <label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Status:</label>',
            '        <select id="resep-filter-status" class="px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg text-sm outline-none">',
            '          <option value="semua">Semua Status</option>',
            '          <option value="menunggu">Menunggu Diproses</option>',
            '          <option value="selesai">Selesai di Apotek</option>',
            '        </select>',
            '      </div>',
            '      <div>',
            '        <label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Pasien:</label>',
            '        <select id="resep-filter-pasien" class="px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg text-sm outline-none min-w-[150px]">',
            '          <option value="semua">Semua Pasien</option>',
            '        </select>',
            '      </div>',
            '      <div>',
            '        <label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Dokter:</label>',
            '        <select id="resep-filter-dokter" class="px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg text-sm outline-none min-w-[150px]">',
            '          <option value="semua">Semua Dokter</option>',
            '        </select>',
            '      </div>',
            '      <div class="self-end">',
            '        <button onclick="AppKlinikResep.init()" class="bg-primary-600 hover:bg-primary-700 text-white text-sm px-4 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5"><i data-lucide="filter" class="w-4 h-4"></i> Filter</button>',
            '      </div>',
            '    </div>',
            '  </div>',

            '  <div id="resep-list"><div class="flex justify-center py-20"><div class="spinner"></div></div></div>',
            '</div>'
        ].join('');
    },

    // ===== INIT =====
    init: function() {
        var self = this;
        var bulanEl  = document.getElementById('resep-filter-bulan');
        var statusEl = document.getElementById('resep-filter-status');
        var pasienEl = document.getElementById('resep-filter-pasien');
        var dokterEl = document.getElementById('resep-filter-dokter');

        var bulan    = bulanEl ? bulanEl.value : new Date().toISOString().slice(0, 7);
        this.filterStatus = statusEl ? statusEl.value : 'semua';
        this.filterPasien = pasienEl ? pasienEl.value : 'semua';
        this.filterDokter = dokterEl ? dokterEl.value : 'semua';

        var start = bulan + '-01';
        var end   = bulan + '-31';

        var pRekam = db.collection('rekamMedis')
          .where('status', '==', 'selesai')
          .where('tanggal', '>=', start).where('tanggal', '<=', end)
          .orderBy('tanggal', 'desc').get();

        var pPasien = DataCache.getPasien();
        var pDokter = db.collection('karyawan').where('departemen', '==', 'Dokter').where('status', '==', 'aktif').get();

        Promise.all([pRekam, pPasien, pDokter]).then(function(results) {
            // 1. Rekam Medis
            self.data = [];
            results[0].forEach(function(doc) { var d = doc.data(); d.id = doc.id; self.data.push(d); });

            // 2. Pasien List
            self.pasienList = [];
            results[1].forEach(function(doc) { var d = doc.data(); d.id = doc.id; self.pasienList.push(d); });

            // 3. Dokter List
            self.dokterList = [];
            results[2].forEach(function(doc) { var d = doc.data(); d.id = doc.id; self.dokterList.push(d); });

            self.populateFilterDropdowns();
            self.renderList();
        }).catch(function(err) {
            var el = document.getElementById('resep-list');
            if (el) el.innerHTML =
                '<p class="text-red-500 text-center py-10">Gagal memuat: ' + Utils.escapeHtml(err.message) + '</p>';
        });
    },

    populateFilterDropdowns: function() {
        var pasienEl = document.getElementById('resep-filter-pasien');
        var dokterEl = document.getElementById('resep-filter-dokter');

        if (pasienEl) {
            var selectedPas = this.filterPasien;
            var htmlP = '<option value="semua">Semua Pasien</option>';
            this.pasienList.forEach(function(p) {
                var sel = (selectedPas === p.id || selectedPas === p.nama) ? ' selected' : '';
                htmlP += '<option value="' + p.id + '"' + sel + '>' + Utils.escapeHtml(p.nama) + ' (' + Utils.escapeHtml(p.nomorRM || '-') + ')</option>';
            });
            pasienEl.innerHTML = htmlP;
        }

        if (dokterEl) {
            var selectedDok = this.filterDokter;
            var htmlD = '<option value="semua">Semua Dokter</option>';
            this.dokterList.forEach(function(d) {
                var sel = (selectedDok === d.id || selectedDok === d.nama) ? ' selected' : '';
                htmlD += '<option value="' + d.id + '"' + sel + '>' + Utils.escapeHtml(d.nama) + '</option>';
            });
            dokterEl.innerHTML = htmlD;
        }
    },

    // ===== RENDER LIST =====
    renderList: function() {
        var container = document.getElementById('resep-list');
        if (!container) return;

        var filtered = this.data.filter(function(r) {
            if (AppKlinikResep.filterStatus === 'menunggu') {
                if (r.statusResep && r.statusResep !== 'menunggu') return false;
            }
            if (AppKlinikResep.filterStatus === 'selesai') {
                if (r.statusResep !== 'selesai') return false;
            }

            if (AppKlinikResep.filterPasien !== 'semua') {
                var targetP = AppKlinikResep.filterPasien;
                if (r.pasienId !== targetP && r.namaPasien !== targetP) return false;
            }

            if (AppKlinikResep.filterDokter !== 'semua') {
                var targetD = AppKlinikResep.filterDokter;
                if (r.dokterId !== targetD && r.namaDokter !== targetD) return false;
            }

            return true;
        });

        if (filtered.length === 0) {
            container.innerHTML = '<div class="text-center py-16 text-slate-400"><i data-lucide="file-text" class="w-10 h-10 mx-auto mb-3"></i><p>Belum ada resep pada periode/filter ini</p></div>';
            if (window.lucide) lucide.createIcons();
            return;
        }

        // Summary
        var totalMenunggu = filtered.filter(function(r) { return !r.statusResep || r.statusResep === 'menunggu'; }).length;
        var totalSelesai  = filtered.filter(function(r) { return r.statusResep === 'selesai'; }).length;

        var html = '<div class="grid grid-cols-2 gap-3 mb-5">';
        html += '<div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">';
        html += '  <p class="text-xs text-slate-500 dark:text-slate-400 mb-1">Menunggu Diproses</p>';
        html += '  <p class="text-xl font-bold text-rose-600 dark:text-rose-400">' + totalMenunggu + ' Resep</p>';
        html += '</div>';
        html += '<div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">';
        html += '  <p class="text-xs text-slate-500 dark:text-slate-400 mb-1">Selesai di Apotek</p>';
        html += '  <p class="text-xl font-bold text-emerald-600 dark:text-emerald-400">' + totalSelesai + ' Resep</p>';
        html += '</div></div>';

        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
        html += '<table class="w-full text-sm">';
        html += '<thead class="bg-slate-50 dark:bg-slate-700 text-xs uppercase text-slate-500 dark:text-slate-400">';
        html += '<tr><th class="px-4 py-3 text-left">Tanggal</th><th class="px-4 py-3 text-left">Pasien</th><th class="px-4 py-3 text-left">Dokter</th><th class="px-4 py-3 text-left">Diagnosa</th><th class="px-4 py-3 text-center">Tindakan</th><th class="px-4 py-3 text-center">Status</th><th class="px-4 py-3 text-center">Aksi</th></tr>';
        html += '</thead><tbody class="divide-y divide-slate-100 dark:divide-slate-700">';

        var canEdit = (window.currentRole === 'keuangan' || window.currentRole === 'admin' || window.currentRole === 'psa');

        filtered.forEach(function(r) {
            var belumProses = !r.statusResep || r.statusResep === 'menunggu';
            var jmlTindakan = Array.isArray(r.tindakanItems) ? r.tindakanItems.length : 0;

            html += '<tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50">';
            html += '<td class="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">' + (r.tanggal || '-') + '</td>';
            html += '<td class="px-4 py-3"><p class="font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(r.namaPasien || '-') + '</p>';
            html += '<p class="text-xs text-slate-400 font-mono">' + Utils.escapeHtml(r.nomorRM || '-') + '</p></td>';
            html += '<td class="px-4 py-3 text-slate-600 dark:text-slate-300">' + Utils.escapeHtml(r.namaDokter || '-') + '</td>';
            html += '<td class="px-4 py-3 text-slate-600 dark:text-slate-300">' + Utils.escapeHtml(r.diagnosa || '-') + '</td>';
            html += '<td class="px-4 py-3 text-center">' + jmlTindakan + '</td>';
            html += '<td class="px-4 py-3 text-center">' + AppKlinikResep._badgeStatus(belumProses ? 'menunggu' : 'selesai') + '</td>';
            html += '<td class="px-4 py-3 text-center whitespace-nowrap">';
            
            if (belumProses) {
                html += '<button onclick="AppKlinikResep.prosesDiApotek()" class="text-xs bg-primary-100 hover:bg-primary-200 text-primary-700 dark:bg-primary-900/40 dark:text-primary-400 px-2 py-1 rounded font-semibold mr-1" title="Proses Kasir">Proses di Apotek</button>';
            }

            if (canEdit) {
                html += '<button onclick="AppKlinikResep.editResep(\'' + r.id + '\')" class="text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-1 rounded font-semibold mr-1" title="Edit Data Resep"><i data-lucide="edit" class="w-3 h-3 inline mr-0.5"></i> Edit</button>';
                html += '<button onclick="AppKlinikResep.hapusResep(\'' + r.id + '\')" class="text-xs bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 px-2 py-1 rounded font-semibold" title="Hapus Data Resep"><i data-lucide="trash-2" class="w-3 h-3 inline mr-0.5"></i> Hapus</button>';
            } else if (!belumProses) {
                html += '<span class="text-xs text-slate-400">-</span>';
            }

            html += '</td></tr>';
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
        if (window.lucide) lucide.createIcons();
    },

    // ===== AKSI: edit & hapus =====
    editResep: function(id) {
        var item = this.data.find(function(x) { return x.id === id; });
        if (!item) { Utils.toast('Data resep tidak ditemukan', 'error'); return; }

        var pasienOpts = '<option value="">-- Pilih Pasien --</option>';
        this.pasienList.forEach(function(p) {
            var sel = (p.id === item.pasienId || p.nama === item.namaPasien) ? 'selected' : '';
            pasienOpts += '<option value="' + p.id + '" ' + sel + '>' + Utils.escapeHtml(p.nama) + ' (' + Utils.escapeHtml(p.nomorRM || '-') + ')</option>';
        });

        var dokterOpts = '<option value="">-- Pilih Dokter --</option>';
        this.dokterList.forEach(function(d) {
            var sel = (d.id === item.dokterId || d.nama === item.namaDokter) ? 'selected' : '';
            dokterOpts += '<option value="' + d.id + '" ' + sel + '>' + Utils.escapeHtml(d.nama) + '</option>';
        });

        var html = '<div class="p-5">';
        html += '<h3 class="text-lg font-bold text-gray-800 dark:text-white mb-4">Edit Data Resep Klinik</h3>';
        html += '<form id="form-edit-resep" onsubmit="event.preventDefault(); AppKlinikResep.simpanEditResep(\'' + id + '\');" class="space-y-4">';
        
        html += '<div>';
        html += '<label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Pasien *</label>';
        html += '<select id="edit-resep-pasien" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" required>' + pasienOpts + '</select>';
        html += '</div>';

        html += '<div>';
        html += '<label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Dokter *</label>';
        html += '<select id="edit-resep-dokter" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" required>' + dokterOpts + '</select>';
        html += '</div>';

        html += '<div>';
        html += '<label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Diagnosa</label>';
        html += '<input type="text" id="edit-resep-diagnosa" value="' + Utils.escapeHtml(item.diagnosa || '') + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="Diagnosa dokter">';
        html += '</div>';

        html += '<div>';
        html += '<label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Keluhan Utama</label>';
        html += '<textarea id="edit-resep-keluhan" rows="2" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm">' + Utils.escapeHtml(item.keluhan || '') + '</textarea>';
        html += '</div>';

        html += '<div>';
        html += '<label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Catatan / Resep Obat</label>';
        html += '<textarea id="edit-resep-catatan" rows="2" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm">' + Utils.escapeHtml(item.catatan || '') + '</textarea>';
        html += '</div>';

        // Tindakan List Editor
        html += '<div>';
        html += '<div class="flex justify-between items-center mb-1"><label class="block text-xs font-semibold text-slate-600 dark:text-slate-300">Tindakan Klinik</label><button type="button" onclick="AppKlinikResep.addEditTindakanRow()" class="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 px-2 py-1 rounded font-medium">+ Tambah Tindakan</button></div>';
        html += '<div id="edit-resep-tindakan-container" class="space-y-2 max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/30">';
        var tindakanItems = Array.isArray(item.tindakanItems) ? item.tindakanItems : [];
        if (tindakanItems.length === 0) {
            html += '<p class="text-xs text-slate-400 italic text-center py-2" id="empty-tindakan-msg">Belum ada tindakan</p>';
        } else {
            tindakanItems.forEach(function(t, idx) {
                html += AppKlinikResep._renderTindakanRow(idx, t.nama || '', t.harga || t.hargaJual || 0);
            });
        }
        html += '</div></div>';

        html += '<div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">';
        html += '<button type="button" onclick="Utils.closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-lg">Batal</button>';
        html += '<button type="submit" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg flex items-center gap-1.5"><i data-lucide="save" class="w-4 h-4"></i> Simpan Perubahan</button>';
        html += '</div>';

        html += '</form></div>';

        Utils.openModal(html);
    },

    _renderTindakanRow: function(idx, nama, harga) {
        var h = '<div class="flex items-center gap-2 t-row">';
        h += '<input type="text" class="t-nama w-2/3 px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded" placeholder="Nama Tindakan" value="' + Utils.escapeHtml(nama) + '">';
        h += '<input type="number" class="t-harga w-1/3 px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded" placeholder="Harga" value="' + (harga || 0) + '">';
        h += '<button type="button" onclick="this.parentElement.remove()" class="text-rose-500 hover:text-rose-700 p-1" title="Hapus tindakan"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>';
        h += '</div>';
        return h;
    },

    addEditTindakanRow: function() {
        var container = document.getElementById('edit-resep-tindakan-container');
        if (!container) return;
        var emptyMsg = document.getElementById('empty-tindakan-msg');
        if (emptyMsg) emptyMsg.remove();
        var idx = container.querySelectorAll('.t-row').length;
        var div = document.createElement('div');
        div.innerHTML = this._renderTindakanRow(idx, '', 0);
        container.appendChild(div.firstElementChild);
        if (window.lucide) lucide.createIcons();
    },

    simpanEditResep: function(id) {
        var item = this.data.find(function(x) { return x.id === id; });
        if (!item) return;

        var pasienId = document.getElementById('edit-resep-pasien').value;
        var dokterId = document.getElementById('edit-resep-dokter').value;
        var diagnosa = document.getElementById('edit-resep-diagnosa').value.trim();
        var keluhan = document.getElementById('edit-resep-keluhan').value.trim();
        var catatan = document.getElementById('edit-resep-catatan').value.trim();

        if (!pasienId || !dokterId) {
            Utils.toast('Pasien dan Dokter wajib dipilih', 'error');
            return;
        }

        var pasienObj = this.pasienList.find(function(p) { return p.id === pasienId; });
        var dokterObj = this.dokterList.find(function(d) { return d.id === dokterId; });

        var namaPasien = pasienObj ? pasienObj.nama : item.namaPasien;
        var nomorRM = pasienObj ? pasienObj.nomorRM : item.nomorRM;
        var namaDokter = dokterObj ? dokterObj.nama : item.namaDokter;

        var tindakanItems = [];
        var rows = document.querySelectorAll('#edit-resep-tindakan-container .t-row');
        rows.forEach(function(r) {
            var n = r.querySelector('.t-nama') ? r.querySelector('.t-nama').value.trim() : '';
            var h = r.querySelector('.t-harga') ? parseFloat(r.querySelector('.t-harga').value) || 0 : 0;
            if (n) {
                tindakanItems.push({ nama: n, harga: h, hargaJual: h });
            }
        });

        var updateObj = {
            pasienId: pasienId,
            namaPasien: namaPasien,
            nomorRM: nomorRM,
            dokterId: dokterId,
            namaDokter: namaDokter,
            diagnosa: diagnosa,
            keluhan: keluhan,
            catatan: catatan,
            tindakanItems: tindakanItems,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        db.collection('rekamMedis').doc(id).update(updateObj).then(function() {
            // INTEGRASI: Update antrian terkait jika ada
            if (item.antrianId) {
                db.collection('antrian').doc(item.antrianId).update({
                    pasienId: pasienId,
                    namaPasien: namaPasien,
                    nomorRM: nomorRM,
                    dokterId: dokterId,
                    namaDokter: namaDokter,
                    keluhan: keluhan
                }).catch(function(e) { console.error('Gagal update antrian terkait:', e); });
            }

            // INTEGRASI: Update transaksi terkait jika ada
            db.collection('transaksi').where('resepId', '==', id).get().then(function(snapTrx) {
                snapTrx.forEach(function(docTrx) {
                    docTrx.ref.update({
                        pasienId: pasienId,
                        namaPasien: namaPasien,
                        nomorRM: nomorRM,
                        dokterId: dokterId,
                        namaDokter: namaDokter
                    }).catch(function(eTrx) { console.error('Gagal update transaksi terkait resep:', eTrx); });
                });
            }).catch(function(e) { console.error('Gagal query transaksi terkait resep:', e); });

            Object.assign(item, updateObj);
            Utils.toast('Data resep & rekam medis berhasil diperbarui!', 'success');
            Utils.closeModal();
            AppKlinikResep.renderList();
        }).catch(function(err) {
            Utils.toast('Gagal memperbarui: ' + err.message, 'error');
        });
    },

    hapusResep: function(id) {
        var item = this.data.find(function(x) { return x.id === id; });
        if (!item) return;

        if (!confirm('Apakah Anda yakin ingin menghapus data resep ini? Data rekam medis ' + (item.namaPasien || '') + ' akan dihapus.')) return;

        var self = this;
        db.collection('rekamMedis').doc(id).delete().then(function() {
            self.data = self.data.filter(function(x) { return x.id !== id; });
            Utils.toast('Data resep berhasil dihapus!', 'success');
            self.renderList();
        }).catch(function(err) {
            Utils.toast('Gagal menghapus: ' + err.message, 'error');
        });
    },

    prosesDiApotek: function() {
        Utils.toast('Pilih pasien resep pada form Transaksi > Resep Klinik', 'info');
        navigateTo('apotek/transaksi', 'Transaksi');
    },

    _badgeStatus: function(status) {
        var map = {
            menunggu: ['bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400', 'Menunggu'],
            selesai:  ['bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400', 'Selesai']
        };
        var s = map[status] || ['bg-slate-100 text-slate-500', status || '-'];
        return '<span class="text-xs ' + s[0] + ' font-semibold px-2 py-1 rounded-full">' + s[1] + '</span>';
    }
};
