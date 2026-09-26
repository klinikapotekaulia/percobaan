/**
 * js/klinik/pasien.js
 * Master Data Pasien + Fitur Import Excel
 */

window.AppKlinikPasien = {
    data: [],
    searchQuery: '',
    importData: [],

    render: function() {
        var html = '<div class="page-enter max-w-4xl">';
        html += '<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">';
        html += '  <div>';
        html += '    <h2 class="text-xl font-bold text-gray-800 dark:text-white">Data Pasien</h2>';
        html += '    <p class="text-sm text-slate-500 dark:text-slate-400">Master data pasien klinik & apotek</p>';
        html += '  </div>';
        html += '  <div class="flex flex-wrap gap-2">';
        // Export/Template/Import data pasien: HANYA untuk role admin, keuangan, & psa (data pasien sensitif)
        if (window.currentRole === 'admin' || window.currentRole === 'keuangan' || window.currentRole === 'psa') {
            html += '    <button onclick="AppKlinikPasien.exportExcel()" class="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-2"><i data-lucide="file-spreadsheet" class="w-4 h-4"></i> Export Data Pasien</button>';
            html += '    <button onclick="AppKlinikPasien.downloadTemplate()" class="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-2"><i data-lucide="download" class="w-4 h-4"></i> Template Excel</button>';
            html += '    <label class="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-2 cursor-pointer"><i data-lucide="upload" class="w-4 h-4"></i> Import Excel <input type="file" accept=".xlsx,.xls" class="hidden" onchange="AppKlinikPasien.handleFileUpload(event)"></label>';
        }
        html += '    <button onclick="AppKlinikPasien.openForm()" class="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-2"><i data-lucide="user-plus" class="w-4 h-4"></i> Tambah Manual</button>';
        html += '  </div>';
        html += '</div>';
        
        html += '<div class="mb-4 relative">';
        html += '  <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>';
        html += '  <input type="text" id="search-pasien" placeholder="Cari nama atau No. RM..." class="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" oninput="AppKlinikPasien.onSearch(this.value)">';
        html += '</div>';

        html += '<div id="import-preview-area" class="hidden mb-4"></div>';
        html += '<div id="pasien-list"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        DataCache.getPasien().then(snap => {
            AppKlinikPasien.data = [];
            snap.forEach(doc => { var d = doc.data(); d.id = doc.id; AppKlinikPasien.data.push(d); });
            AppKlinikPasien.renderList();
        }).catch(err => Utils.toast('Gagal memuat: ' + err.message, 'error'));
    },

    onSearch: function(val) {
        this.searchQuery = val.toLowerCase().trim();
        this.renderList();
    },

    renderList: function() {
        var container = document.getElementById('pasien-list');
        if (!container) return;

        var list = this.data;
        if (this.searchQuery) {
            list = list.filter(p => 
                (p.nama && p.nama.toLowerCase().includes(this.searchQuery)) || 
                (p.nomorRM && p.nomorRM.toLowerCase().includes(this.searchQuery))
            );
        }

        if (list.length === 0) {
            container.innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center"><p class="text-slate-400">Tidak ada data pasien ditemukan.</p></div>';
            return;
        }

        var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
        html += '<div class="overflow-x-auto">';
        html += '<table class="w-full text-sm">';
        html += '<thead><tr class="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 uppercase tracking-wider">';
        html += '<th class="px-4 py-3 text-left">No. RM</th>';
        html += '<th class="px-4 py-3 text-left">Nama Pasien</th>';
        html += '<th class="px-4 py-3 text-left hidden md:table-cell">L/P</th>';
        html += '<th class="px-4 py-3 text-left hidden md:table-cell">Usia</th>';
        html += '<th class="px-4 py-3 text-left hidden lg:table-cell">No. Telepon</th>';
        html += '<th class="px-4 py-3 text-left hidden lg:table-cell">Alergi Obat</th>';
        html += '<th class="px-4 py-3 text-right">Aksi</th>';
        html += '</tr></thead><tbody>';

        list.forEach(p => {
            // FIX: escape penuh (kutip ganda, backslash, dsb) supaya tidak bisa breakout onclick.
            var safeName = JSON.stringify(p.nama || '-').slice(1, -1).replace(/'/g, "\\'");
            var alergi = p.alergiObat ? '<span class="text-xs bg-red-50 dark:bg-red-900/30 text-red-600 px-2 py-0.5 rounded-full">' + Utils.escapeHtml(p.alergiObat) + '</span>' : '<span class="text-xs text-slate-400">-</span>';

            html += '<tr class="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">';
            html += '<td class="px-4 py-3 font-mono text-xs text-primary-600 dark:text-primary-400 font-semibold">' + Utils.escapeHtml(p.nomorRM || '-') + '</td>';
            html += '<td class="px-4 py-3 font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(p.nama) + '</td>';
            html += '<td class="px-4 py-3 text-slate-600 dark:text-slate-300 hidden md:table-cell">' + Utils.escapeHtml(p.jenisKelamin || '-') + '</td>';
            html += '<td class="px-4 py-3 text-slate-600 dark:text-slate-300 hidden md:table-cell">' + (p.usia != null && p.usia !== '' ? p.usia + ' th' : '-') + '</td>';
            html += '<td class="px-4 py-3 text-slate-600 dark:text-slate-300 hidden lg:table-cell">' + Utils.escapeHtml(p.noTelepon || '-') + '</td>';
            html += '<td class="px-4 py-3 hidden lg:table-cell">' + alergi + '</td>';
            html += '<td class="px-4 py-3 text-right space-x-1">';
            html += '<button onclick="AppKlinikPasien.openForm(\'' + p.id + '\')" class="p-1.5 text-slate-400 hover:text-primary-600 rounded" title="Edit"><i data-lucide="pencil" class="w-4 h-4"></i></button>';
            html += '<button onclick="AppKlinikPasien.hapus(\'' + p.id + '\', \'' + safeName + '\')" class="p-1.5 text-slate-400 hover:text-red-600 rounded" title="Hapus"><i data-lucide="trash-2" class="w-4 h-4"></i></button>';
            html += '</td></tr>';
        });

        html += '</tbody></table></div></div>';
        html += '<p class="text-xs text-slate-400 mt-2 text-right">Total: ' + list.length + ' pasien</p>';
        
        container.innerHTML = html;
        lucide.createIcons();
    },

    openForm: function(id) {
        var isEdit = !!id;
        var p = isEdit ? this.data.find(x => x.id === id) : {};
        
        var nextRM = '';
        if (!isEdit) {
            var year = new Date().getFullYear();
            var count = this.data.length + 1;
            nextRM = 'RM-' + year + '-' + String(count).padStart(3, '0');
        }

        var html = '<div class="p-6">';
        html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-semibold text-gray-800 dark:text-white">' + (isEdit ? 'Edit' : 'Tambah') + ' Pasien</h3><button onclick="Utils.closeModal()" class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><i data-lucide="x" class="w-5 h-5 text-slate-400"></i></button></div>';
        
        html += '<form id="form-pasien" class="space-y-4">';
        html += '<div class="grid grid-cols-3 gap-4">';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">No. RM</label><input type="text" id="fp-rm" value="' + Utils.escapeHtml(isEdit ? (p.nomorRM || '') : nextRM) + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" required></div>';
        html += '<div class="col-span-2"><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap *</label><input type="text" id="fp-nama" value="' + Utils.escapeHtml(p.nama || '') + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" required></div>';
        html += '</div>';

        html += '<div class="grid grid-cols-2 gap-4">';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">NIK (No. KTP)</label><input type="text" id="fp-nik" value="' + Utils.escapeHtml(p.nik || '') + '" maxlength="16" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="16 digit NIK"></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tanggal Lahir</label><input type="date" id="fp-dob" value="' + Utils.escapeHtml(p.tanggalLahir || '') + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"></div>';
        html += '</div>';

        html += '<div class="grid grid-cols-2 gap-4">';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Jenis Kelamin</label><select id="fp-jk" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="L"' + (p.jenisKelamin==='L'?' selected':'') + '>Laki-laki (L)</option><option value="P"' + (p.jenisKelamin==='P'?' selected':'') + '>Perempuan (P)</option></select></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Usia (tahun)</label><input type="number" id="fp-usia" min="0" max="150" value="' + (p.usia != null ? p.usia : '') + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="Contoh: 35"></div>';
        html += '</div>';

        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">No. Telepon</label><input type="text" id="fp-telp" value="' + Utils.escapeHtml(p.noTelepon || '') + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="08xxxxxxxxxx"></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Alamat</label><textarea id="fp-alamat" rows="2" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm">' + Utils.escapeHtml(p.alamat || '') + '</textarea></div>';

        html += '<div class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">';
        html += '<label class="block text-sm font-medium text-red-700 dark:text-red-400 mb-1">⚠️ Alergi Obat (Jika ada)</label>';
        html += '<input type="text" id="fp-alergi" value="' + Utils.escapeHtml(p.alergiObat || '') + '" class="w-full px-3 py-2 border border-red-300 dark:border-red-800 dark:bg-red-900/50 dark:text-white rounded-lg text-sm" placeholder="Contoh: Penisilin, Aspirin">';
        html += '</div>';

        html += '<div class="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">';
        html += '<button type="button" onclick="Utils.closeModal()" class="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Batal</button>';
        html += '<button type="submit" class="px-6 py-2.5 text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg">Simpan</button>';
        html += '</div>';
        
        if (isEdit) html += '<input type="hidden" id="fp-id" value="' + p.id + '">';
        html += '</form></div>';

        Utils.openModal(html);

        setTimeout(() => {
            document.getElementById('form-pasien').addEventListener('submit', function(e) {
                e.preventDefault();
                AppKlinikPasien.simpan();
            });
        }, 100);
    },

    simpan: function() {
        // PERBAIKAN AUDIT (temuan #10): penjaga klik-ganda. Pasien kembar
        // memecah riwayat rekam medis satu orang ke dua nomor RM berbeda.
        var release = SubmitGuard.lock('pasien:simpan',
                                       '#form-pasien button[type="submit"]');
        if (!release) return;

        var idField = document.getElementById('fp-id');
        var isEdit = !!idField;
        
        var usiaVal = document.getElementById('fp-usia').value;
        var obj = {
            nomorRM: document.getElementById('fp-rm').value.trim(),
            nama: document.getElementById('fp-nama').value.trim(),
            nik: document.getElementById('fp-nik').value.trim(),
            tanggalLahir: document.getElementById('fp-dob').value,
            jenisKelamin: document.getElementById('fp-jk').value,
            usia: usiaVal !== '' ? parseInt(usiaVal, 10) : null,
            noTelepon: document.getElementById('fp-telp').value.trim(),
            alamat: document.getElementById('fp-alamat').value.trim(),
            alergiObat: document.getElementById('fp-alergi').value.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (!obj.nama || !obj.nomorRM) {
            Utils.toast('Nama dan No. RM wajib diisi', 'error');
            release(); return;
        }

        var p;
        if (isEdit) {
            p = db.collection('pasien').doc(idField.value).update(obj);
        } else {
            obj.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            p = db.collection('pasien').add(obj);
        }

        p.then(() => {
            Utils.toast('Data pasien berhasil disimpan!', 'success');
            Utils.closeModal();
            release();
            AppKlinikPasien.init();
        }).catch(err => { Utils.toast('Gagal: ' + err.message, 'error'); release(); });
    },

    hapus: function(id, nama) {
        if (!confirm('Hapus data pasien "' + nama + '"?')) return;
        db.collection('pasien').doc(id).delete().then(() => {
            Utils.toast('Berhasil dihapus', 'success');
            AppKlinikPasien.init();
        }).catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    },

    // ==========================================
    // FITUR EXCEL IMPORT
    // ==========================================

    exportExcel: function() {
        // Guard di level fungsi juga (bukan cuma sembunyikan tombol), agar tidak bisa
        // dipanggil manual lewat console oleh role selain admin/keuangan/psa.
        if (window.currentRole !== 'admin' && window.currentRole !== 'keuangan' && window.currentRole !== 'psa') {
            Utils.toast('Anda tidak memiliki akses untuk export data pasien.', 'error');
            return;
        }
        if (!this.data || this.data.length === 0) {
            Utils.toast('Tidak ada data pasien untuk di-export.', 'error');
            return;
        }

        var rows = [['No. RM', 'Nama Lengkap', 'L/P', 'Umur', 'No. Telepon', 'Alamat', 'Alergi Obat']];
        this.data.forEach(function(p) {
            rows.push([
                p.nomorRM || '', p.nama || '', p.jenisKelamin || '',
                (p.usia != null && p.usia !== '') ? (p.usia + ' tahun') : '', p.noTelepon || '', p.alamat || '', p.alergiObat || ''
            ]);
        });

        var ws = XLSX.utils.aoa_to_sheet(rows);
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Data Pasien');

        var tanggal = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, 'Data_Pasien_Aulia_' + tanggal + '.xlsx');
    },

    downloadTemplate: function() {
        if (window.currentRole !== 'admin' && window.currentRole !== 'keuangan' && window.currentRole !== 'psa') {
            Utils.toast('Anda tidak memiliki akses untuk fitur ini.', 'error');
            return;
        }
        var ws_data = [
            ['No. RM', 'Nama Lengkap', 'L/P', 'Usia', 'No. Telepon', 'Alamat', 'Alergi Obat'],
            ['RM-2011-001', 'Contoh Nama Pasien', 'L', '39', '081234567890', 'Jl. Contoh No. 1', 'Tidak ada'],
        ];
        var ws = XLSX.utils.aoa_to_sheet(ws_data);
        ws['!cols'] = [{wch: 15}, {wch: 30}, {wch: 5}, {wch: 25}, {wch: 18}, {wch: 30}, {wch: 20}];
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data Pasien");
        XLSX.writeFile(wb, "Template_Import_Pasien_Aulia.xlsx");
    },

    handleFileUpload: function(event) {
        if (window.currentRole !== 'admin' && window.currentRole !== 'keuangan' && window.currentRole !== 'psa') {
            Utils.toast('Anda tidak memiliki akses untuk import data pasien.', 'error');
            event.target.value = '';
            return;
        }
        var file = event.target.files[0];
        if (!file) return;

        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                var data = new Uint8Array(e.target.result);
                var workbook = XLSX.read(data, { type: 'array' });
                var firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                var jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

                if (jsonData.length === 0) {
                    Utils.toast('File Excel kosong.', 'error');
                    return;
                }

                AppKlinikPasien.importData = jsonData.map(row => ({
                    nomorRM: String(row['No. RM'] || '').trim(),
                    nama: String(row['Nama Lengkap'] || '').trim(),
                    jenisKelamin: String(row['L/P'] || 'L').trim().toUpperCase().substring(0,1),
                    usia: (function() { var v = parseInt(row['Usia'], 10); return isNaN(v) ? null : v; })(),
                    noTelepon: String(row['No. Telepon'] || '').trim(),
                    alamat: String(row['Alamat'] || '').trim(),
                    alergiObat: String(row['Alergi Obat'] || '').trim()
                })).filter(row => row.nomorRM !== '' && row.nama !== '');

                AppKlinikPasien.renderImportPreview();
            } catch (err) {
                console.error(err);
                Utils.toast('Gagal membaca file Excel. Pastikan format sesuai template.', 'error');
            }
        };
        reader.readAsArrayBuffer(file);
        event.target.value = '';
    },

    renderImportPreview: function() {
        var data = this.importData;
        var area = document.getElementById('import-preview-area');
        if(!area) return;

        var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 p-5">';
        html += '<div class="flex justify-between items-center mb-4">';
        html += '<h3 class="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2"><i data-lucide="file-check" class="w-5 h-5"></i> Preview Data Import (' + data.length + ' Pasien)</h3>';
        html += '<button onclick="document.getElementById(\'import-preview-area\').classList.add(\'hidden\')" class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400"><i data-lucide="x" class="w-5 h-5"></i></button>';
        html += '</div>';
        
        html += '<div class="overflow-x-auto max-h-64 rounded-lg border border-slate-200 dark:border-slate-700 mb-4">';
        html += '<table class="w-full text-xs">';
        html += '<thead class="bg-slate-50 dark:bg-slate-900 sticky top-0"><tr><th class="px-2 py-2 text-left">No. RM</th><th class="px-2 py-2 text-left">Nama</th><th class="px-2 py-2 text-left">L/P</th><th class="px-2 py-2 text-left">Usia</th><th class="px-2 py-2 text-left">Telp</th><th class="px-2 py-2 text-left">Alergi</th></tr></thead><tbody>';
        
        var previewCount = Math.min(data.length, 50);
        for (var i = 0; i < previewCount; i++) {
            var p = data[i];
            html += '<tr class="border-t border-slate-100 dark:border-slate-700">';
            html += '<td class="px-2 py-1 font-mono">' + Utils.escapeHtml(p.nomorRM) + '</td>';
            html += '<td class="px-2 py-1 font-medium">' + Utils.escapeHtml(p.nama) + '</td>';
            html += '<td class="px-2 py-1">' + Utils.escapeHtml(p.jenisKelamin) + '</td>';
            html += '<td class="px-2 py-1">' + (p.usia != null ? p.usia : '-') + '</td>';
            html += '<td class="px-2 py-1">' + Utils.escapeHtml(p.noTelepon) + '</td>';
            html += '<td class="px-2 py-1 text-red-500">' + Utils.escapeHtml(p.alergiObat || '-') + '</td>';
            html += '</tr>';
        }
        
        if (data.length > 50) {
            html += '<tr><td colspan="6" class="px-2 py-2 text-center text-slate-400 italic">... dan ' + (data.length - 50) + ' data lainnya</td></tr>';
        }
        html += '</tbody></table></div>';

        html += '<div class="flex justify-end gap-2">';
        html += '<button onclick="document.getElementById(\'import-preview-area\').classList.add(\'hidden\')" class="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Batal</button>';
        html += '<button onclick="AppKlinikPasien.executeImport()" class="px-6 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center gap-2"><i data-lucide="upload" class="w-4 h-4"></i> Konfirmasi Import</button>';
        html += '</div></div>';

        area.innerHTML = html;
        area.classList.remove('hidden');
        lucide.createIcons();
    },

    executeImport: function() {
        if (!confirm('Import ' + this.importData.length + ' data pasien ke database?')) return;

        var dataToImport = this.importData;
        var batchSize = 400;
        var batches = [];
        
        for (var i = 0; i < dataToImport.length; i += batchSize) {
            var chunk = dataToImport.slice(i, i + batchSize);
            var batch = db.batch();
            chunk.forEach(pasien => {
                // FIX: pakai auto-ID untuk dokumen pasien supaya karakter aneh ('/', '.', dst)
                //      di nomorRM tidak membuat path Firestore invalid. nomorRM tetap disimpan sbg field.
                var safeRM = (pasien.nomorRM || '').replace(/[\/\.#\$\[\]]/g, '_');
                var docRef = safeRM ? db.collection('pasien').doc(safeRM) : db.collection('pasien').doc();
                batch.set(docRef, {
                    nomorRM: pasien.nomorRM,
                    nama: pasien.nama,
                    jenisKelamin: pasien.jenisKelamin,
                    usia: pasien.usia,
                    noTelepon: pasien.noTelepon,
                    alamat: pasien.alamat,
                    alergiObat: pasien.alergiObat,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true }); 
            });
            batches.push(batch.commit());
        }

        Utils.toast('Sedang memproses...', 'info');
        Promise.all(batches).then(() => {
            Utils.toast('Berhasil mengimport ' + dataToImport.length + ' data pasien!', 'success');
            document.getElementById('import-preview-area').classList.add('hidden');
            DataCache.invalidate('pasien'); // pastikan cache langsung fresh, tidak nunggu event snapshot
            AppKlinikPasien.init();
        }).catch(err => {
            Utils.toast('Gagal mengimport: ' + err.message, 'error');
        });
    }
};