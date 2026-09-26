/**
 * js/apotek/obat.js
 * Master Data Obat, Stock, & Import Excel
 */

window.AppApotekObat = {
    data: [],
    searchQuery: '',
    importData: [],

    render: function() {
        var html = '<div class="page-enter max-w-5xl">';
        html += '<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">';
        html += '  <div>';
        html += '    <h2 class="text-xl font-bold text-gray-800 dark:text-white">Obat & Stock</h2>';
        html += '    <p class="text-sm text-slate-500 dark:text-slate-400">Master data obat, HPP, harga jual, dan stok</p>';
        html += '  </div>';
        html += '  <div class="flex flex-wrap gap-2">';
        html += '    <button onclick="AppApotekObat.exportExcel()" class="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-2"><i data-lucide="file-spreadsheet" class="w-4 h-4"></i> Export Data Obat</button>';
        html += '    <button onclick="AppApotekObat.downloadTemplate()" class="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-2"><i data-lucide="download" class="w-4 h-4"></i> Template Excel</button>';
        html += '    <label class="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-2 cursor-pointer"><i data-lucide="upload" class="w-4 h-4"></i> Import Excel <input type="file" accept=".xlsx,.xls" class="hidden" onchange="AppApotekObat.handleFileUpload(event)"></label>';
        html += '    <button onclick="AppApotekObat.openForm()" class="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-2"><i data-lucide="plus" class="w-4 h-4"></i> Tambah Manual</button>';
        html += '  </div>';
        html += '</div>';

        html += '<div class="mb-4 relative">';
        html += '  <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>';
        html += '  <input type="text" id="search-obat" placeholder="Cari nama obat atau kode..." class="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" oninput="AppApotekObat.onSearch(this.value)">';
        html += '</div>';

        html += '<div id="import-preview-area" class="hidden mb-4"></div>';
        html += '<div id="obat-list"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        DataCache.getObat().then(snap => {
            AppApotekObat.data = [];
            snap.forEach(doc => { var d = doc.data(); d.id = doc.id; AppApotekObat.data.push(d); });
            AppApotekObat.data.sort((a, b) => (a.namaObat || '').localeCompare(b.namaObat || ''));
            AppApotekObat.renderList();
        }).catch(err => Utils.toast('Gagal memuat: ' + err.message, 'error'));
    },

    onSearch: function(val) {
        this.searchQuery = val.toLowerCase().trim();
        this.renderList();
    },

    renderList: function() {
        var container = document.getElementById('obat-list');
        if (!container) return;

        var list = this.data;
        if (this.searchQuery) {
            list = list.filter(o => 
                (o.namaObat && o.namaObat.toLowerCase().includes(this.searchQuery)) || 
                (o.kodeObat && o.kodeObat.toLowerCase().includes(this.searchQuery))
            );
        }

        if (list.length === 0) {
            container.innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center"><p class="text-slate-400">Tidak ada data obat ditemukan.</p></div>';
            return;
        }

        var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
        html += '<div class="overflow-x-auto">';
        html += '<table class="w-full text-sm">';
        html += '<thead><tr class="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 uppercase tracking-wider">';
        html += '<th class="px-3 py-3 text-left w-12"></th>';
        html += '<th class="px-3 py-3 text-left">Nama / Kode</th>';
        html += '<th class="px-3 py-3 text-left hidden md:table-cell">Kategori</th>';
        html += '<th class="px-3 py-3 text-right">HPP</th>';
        html += '<th class="px-3 py-3 text-right">Harga Jual</th>';
        html += '<th class="px-3 py-3 text-center">Stok</th>';
        html += '<th class="px-3 py-3 text-left hidden lg:table-cell">Exp Date</th>';
        html += '<th class="px-3 py-3 text-right">Aksi</th>';
        html += '</tr></thead><tbody>';

        list.forEach(o => {
            var safeName = (o.namaObat || '-').replace(/'/g, "\\'");
            var stokClass = (o.stok <= (o.stokMinimum || 0)) ? 'text-red-600 font-bold' : 'text-slate-800 dark:text-white font-medium';
            var expClass = o.expDate && new Date(o.expDate) < new Date() ? 'text-red-500' : 'text-slate-500 dark:text-slate-400';
            var ppnBadge = o.isPPN !== false ? 
                '<span class="text-[10px] bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 px-1.5 py-0.5 rounded font-bold ml-1">PPN</span>' : 
                '<span class="text-[10px] bg-slate-100 dark:bg-slate-850 text-slate-500 px-1.5 py-0.5 rounded font-bold ml-1">NON-PPN</span>';
            var thumb = o.gambarObat ?
                '<img src="' + o.gambarObat + '" class="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-slate-600">' :
                '<div class="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center"><i data-lucide="package" class="w-4 h-4 text-slate-300"></i></div>';

            html += '<tr class="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">';
            html += '<td class="px-3 py-3">' + thumb + '</td>';
            html += '<td class="px-3 py-3"><p class="font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(o.namaObat) + '</p><p class="text-xs text-slate-400 font-mono flex items-center gap-1"><span>' + Utils.escapeHtml(o.kodeObat || '-') + '</span>' + ppnBadge + '</p></td>';
            html += '<td class="px-3 py-3 text-slate-500 dark:text-slate-400 hidden md:table-cell text-xs">' + Utils.escapeHtml(o.kategori || '-') + '</td>';
            html += '<td class="px-3 py-3 text-right text-slate-500 text-xs">' + Utils.formatRupiah(o.hpp) + '</td>';
            html += '<td class="px-3 py-3 text-right text-slate-800 dark:text-slate-200 text-xs">' + Utils.formatRupiah(o.hargaJual) + '</td>';
            html += '<td class="px-3 py-3 text-center ' + stokClass + '">' + (o.stok || 0) + ' ' + Utils.escapeHtml(o.satuan || '') + '</td>';
            html += '<td class="px-3 py-3 text-xs hidden lg:table-cell ' + expClass + '">' + Utils.escapeHtml(o.expDate || '-') + '</td>';
            html += '<td class="px-3 py-3 text-right space-x-1">';
            html += '<button onclick="AppApotekObat.openForm(\'' + o.id + '\')" class="p-1.5 text-slate-400 hover:text-primary-600 rounded" title="Edit"><i data-lucide="pencil" class="w-4 h-4"></i></button>';
            html += '<button onclick="AppApotekObat.hapus(\'' + o.id + '\', \'' + safeName + '\')" class="p-1.5 text-slate-400 hover:text-red-600 rounded" title="Hapus"><i data-lucide="trash-2" class="w-4 h-4"></i></button>';
            html += '</td></tr>';
        });

        html += '</tbody></table></div></div>';
        html += '<p class="text-xs text-slate-400 mt-2 text-right">Total: ' + list.length + ' item obat</p>';
        
        container.innerHTML = html;
        lucide.createIcons();
    },

    openForm: function(id) {
        var isEdit = !!id;
        var o = isEdit ? this.data.find(x => x.id === id) : {};
        
        var html = '<div class="p-6 max-h-[90vh] overflow-y-auto">';
        html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-semibold text-gray-800 dark:text-white">' + (isEdit ? 'Edit' : 'Tambah') + ' Obat</h3><button onclick="Utils.closeModal()" class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><i data-lucide="x" class="w-5 h-5 text-slate-400"></i></button></div>';
        
        html += '<form id="form-obat" class="space-y-4">';

        // FITUR BARU (permintaan user): foto produk 1:1, diambil dari kamera HP
        // (Android/iPhone) atau galeri, dikompres otomatis via ImageUploader
        // sebelum disimpan sebagai base64 -- dipakai di tampilan katalog kasir.
        html += '<div class="flex flex-col items-center gap-1 pb-2">';
        html += '  <div class="relative">';
        html += '    <div id="fo-foto-preview" class="w-28 h-28 rounded-xl overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center bg-slate-50 dark:bg-slate-900">';
        html += o.gambarObat ? '<img src="' + o.gambarObat + '" class="w-full h-full object-cover">' : '<i data-lucide="image" class="w-8 h-8 text-slate-300"></i>';
        html += '    </div>';
        html += '    <label class="absolute -bottom-1.5 -right-1.5 bg-primary-600 hover:bg-primary-700 text-white p-2 rounded-full cursor-pointer shadow-lg" title="Ambil / Upload Foto Produk">';
        html += '      <i data-lucide="camera" class="w-4 h-4"></i>';
        html += '      <input type="file" accept="image/*" capture="environment" class="hidden" onchange="AppApotekObat.onPilihFoto(event)">';
        html += '    </label>';
        html += '  </div>';
        html += '  <p id="fo-foto-info" class="text-[11px] text-slate-400 text-center mt-1">' + (o.gambarObat ? 'Foto tersimpan' : 'Foto produk (opsional) -- persegi 1:1, otomatis dikompres') + '</p>';
        html += '  <button type="button" id="fo-hapus-foto-btn" onclick="AppApotekObat.hapusFoto()" class="text-[11px] text-red-500 hover:underline ' + (o.gambarObat ? '' : 'hidden') + '">Hapus Foto</button>';
        html += '  <input type="hidden" id="fo-gambar" value="' + Utils.escapeHtml(o.gambarObat || '') + '">';
        html += '</div>';

        html += '<div class="grid grid-cols-3 gap-4">';
        html += '<div class="col-span-2"><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Obat *</label><input type="text" id="fo-nama" value="' + Utils.escapeHtml(o.namaObat || '') + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" required placeholder="Paracetamol 500mg"></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kode Obat</label><input type="text" id="fo-kode" value="' + Utils.escapeHtml(o.kodeObat || '') + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="OB-001"></div>';
        html += '</div>';

        html += '<div class="grid grid-cols-4 gap-4">';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kategori</label><input type="text" id="fo-kat" value="' + Utils.escapeHtml(o.kategori || '') + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="Tablet, Sirup"></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Satuan</label><input type="text" id="fo-satuan" value="' + Utils.escapeHtml(o.satuan || '') + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="Strip, Botol"></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Exp Date</label><input type="date" id="fo-exp" value="' + (o.expDate || '') + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Pajak PPN *</label>';
        html += '<select id="fo-isppn" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm">';
        html += '<option value="true" ' + (o.isPPN !== false ? 'selected' : '') + '>Kena PPN (11%)</option>';
        html += '<option value="false" ' + (o.isPPN === false ? 'selected' : '') + '>Non-PPN (Bebas)</option>';
        html += '</select></div>';
        html += '</div>';

        html += '<div class="grid grid-cols-3 gap-4">';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">HPP / Harga Beli *</label><input type="number" id="fo-hpp" value="' + (o.hpp || 0) + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" min="0" step="any" required></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Harga Jual (Bebas) *</label><input type="number" id="fo-jual" value="' + (o.hargaJual || 0) + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" min="0" step="any" required></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Stok Minimum</label><input type="number" id="fo-min" value="' + (o.stokMinimum || 0) + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" min="0" step="any" required></div>';
        html += '</div>';

        html += '<div class="grid grid-cols-2 gap-4">';
        // FIX: logika readonly sebelumnya terbalik — field ini malah TERKUNCI saat "Tambah Manual"
        // (obat baru) sehingga stok awal tidak bisa diisi, dan malah TERBUKA saat edit padahal
        // perubahan stok saat edit tidak pernah tersimpan (lihat simpan(), field stok tidak
        // diikutkan pada mode edit). Sekarang: editable saat tambah baru, terkunci saat edit.
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Stok Awal</label><input type="number" id="fo-stok" value="' + (isEdit ? (o.stok || 0) : 0) + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm ' + (isEdit ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' : '') + '" min="0" step="any" ' + (isEdit ? 'readonly' : 'required') + '></div>';
        html += '<div class="flex items-end"><p class="text-xs text-slate-400 pb-2">' + (isEdit ? '*Stok tidak bisa diubah langsung di sini. Gunakan menu <strong>Pembelian Obat</strong> atau <strong>Retur Obat</strong> untuk mengubah stok.' : '*Isi stok awal saat pertama kali menambahkan obat. Setelah tersimpan, gunakan menu <strong>Pembelian Obat</strong> untuk menambah stok.') + '</p></div>';
        html += '</div>';

        html += '<div class="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">';
        html += '<button type="button" onclick="Utils.closeModal()" class="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Batal</button>';
        html += '<button type="submit" class="px-6 py-2.5 text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg">Simpan</button>';
        html += '</div>';
        
        if (isEdit) html += '<input type="hidden" id="fo-id" value="' + o.id + '">';
        html += '</form></div>';

        Utils.openModal(html);
        setTimeout(() => {
            document.getElementById('form-obat').addEventListener('submit', function(e) {
                e.preventDefault();
                AppApotekObat.simpan();
            });
        }, 100);
    },

    // FITUR BARU: proses foto produk (kamera HP / galeri) -> crop 1:1 -> kompres,
    // pakai utilitas bersama ImageUploader (js/utils/imageUploader.js).
    onPilihFoto: function(event) {
        var file = event.target.files && event.target.files[0];
        event.target.value = ''; // reset input, supaya file yg sama bisa dipilih ulang kalau perlu
        if (!file) return;

        var previewEl = document.getElementById('fo-foto-preview');
        var infoEl = document.getElementById('fo-foto-info');
        if (infoEl) infoEl.textContent = 'Memproses foto...';

        ImageUploader.pickSquareBase64(file, { maxDim: 640, maxSizeKB: 180 }).then(function(result) {
            var hidden = document.getElementById('fo-gambar');
            if (hidden) hidden.value = result.base64;
            if (previewEl) previewEl.innerHTML = '<img src="' + result.base64 + '" class="w-full h-full object-cover">';
            if (infoEl) infoEl.textContent = '~' + result.sizeKB + ' KB, sudah dipotong 1:1 & dikompres';
            var hapusBtn = document.getElementById('fo-hapus-foto-btn');
            if (hapusBtn) hapusBtn.classList.remove('hidden');
        }).catch(function(err) {
            Utils.toast('Gagal memproses foto: ' + err.message, 'error');
            if (infoEl) infoEl.textContent = 'Foto produk (opsional) -- persegi 1:1, otomatis dikompres';
        });
    },

    hapusFoto: function() {
        var hidden = document.getElementById('fo-gambar');
        if (hidden) hidden.value = '';
        var previewEl = document.getElementById('fo-foto-preview');
        if (previewEl) previewEl.innerHTML = '<i data-lucide="image" class="w-8 h-8 text-slate-300"></i>';
        var infoEl = document.getElementById('fo-foto-info');
        if (infoEl) infoEl.textContent = 'Foto produk (opsional) -- persegi 1:1, otomatis dikompres';
        var hapusBtn = document.getElementById('fo-hapus-foto-btn');
        if (hapusBtn) hapusBtn.classList.add('hidden');
        if (window.lucide) lucide.createIcons();
    },

    simpan: function() {
        // PERBAIKAN AUDIT (temuan #10): penjaga klik-ganda. Tanpa ini, dua kali
        // Enter pada form obat baru menghasilkan dua dokumen master obat kembar
        // dengan nama & kode sama — yang kemudian memecah stok jadi dua baris
        // berbeda dan membuat laporan stok tidak pernah cocok.
        var release = SubmitGuard.lock('obat:simpan',
                                       '#form-obat button[type="submit"]');
        if (!release) return;

        var idField = document.getElementById('fo-id');
        var isEdit = !!idField;
        
        var obj = {
            namaObat: document.getElementById('fo-nama').value.trim(),
            kodeObat: document.getElementById('fo-kode').value.trim(),
            kategori: document.getElementById('fo-kat').value.trim(),
            satuan: document.getElementById('fo-satuan').value.trim(),
            expDate: document.getElementById('fo-exp').value,
            isPPN: document.getElementById('fo-isppn').value === 'true',
            hpp: parseFloat(document.getElementById('fo-hpp').value) || 0,
            hargaJual: parseFloat(document.getElementById('fo-jual').value) || 0,
            stokMinimum: parseFloat(document.getElementById('fo-min').value) || 0,
            gambarObat: (document.getElementById('fo-gambar') || {}).value || '',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (!obj.namaObat || obj.hpp <= 0 || obj.hargaJual <= 0) {
            Utils.toast('Nama, HPP, dan Harga Jual wajib diisi', 'error');
            release(); return;
        }
        if (obj.hpp < 0 || obj.hargaJual < 0 || obj.stokMinimum < 0) {
            Utils.toast('HPP, Harga Jual, dan Stok Minimum tidak boleh negatif', 'error');
            release(); return;
        }

        var p;
        if (isEdit) {
            p = db.collection('obat').doc(idField.value).update(obj);
        } else {
            obj.stok = parseFloat(document.getElementById('fo-stok').value) || 0;
            if (obj.stok < 0) {
                Utils.toast('Stok awal tidak boleh negatif', 'error');
                release(); return;
            }
            obj.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            p = db.collection('obat').add(obj);
        }

        p.then(() => {
            Utils.toast('Data obat berhasil disimpan!', 'success');
            Utils.closeModal();
            release();
            AppApotekObat.init();
        }).catch(err => { Utils.toast('Gagal: ' + err.message, 'error'); release(); });
    },

    hapus: function(id, nama) {
        if (!confirm('Hapus obat "' + nama + '"?')) return;
        db.collection('obat').doc(id).delete().then(() => {
            Utils.toast('Berhasil dihapus', 'success');
            AppApotekObat.init();
        }).catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    },

    // ==========================================
    // FITUR EXCEL IMPORT & EXPORT OBAT
    // ==========================================
    
    exportExcel: function() {
        if (!this.data || this.data.length === 0) {
            Utils.toast('Tidak ada data obat untuk di-export.', 'error');
            return;
        }

        var rows = [['Kode Obat', 'Nama Obat', 'Kategori', 'Satuan', 'HPP (Rp)', 'Harga Jual (Rp)', 'Stok Saat Ini', 'Stok Minimum', 'Exp Date (YYYY-MM-DD)', 'Kena PPN (Ya/Tidak)']];
        this.data.forEach(function(o) {
            rows.push([
                o.kodeObat || '',
                o.namaObat || '',
                o.kategori || '',
                o.satuan || '',
                o.hpp || 0,
                o.hargaJual || 0,
                o.stok || 0,
                o.stokMinimum || 0,
                o.expDate || '',
                o.isPPN !== false ? 'Ya' : 'Tidak'
            ]);
        });

        var ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{wch: 12}, {wch: 30}, {wch: 15}, {wch: 10}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 20}];
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Data Obat & Stock');

        var tanggal = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, 'Data_Obat_dan_Stock_Aulia_' + tanggal + '.xlsx');
        Utils.toast('Data obat & stock berhasil diexport!', 'success');
    },

    downloadTemplate: function() {
        var ws_data = [
            ['Kode Obat', 'Nama Obat', 'Kategori', 'Satuan', 'HPP (Rp)', 'Harga Jual (Rp)', 'Stok Awal', 'Stok Minimum', 'Exp Date (YYYY-MM-DD)', 'Kena PPN (Ya/Tidak)'],
            ['OB-001', 'Paracetamol 500mg', 'Tablet', 'Strip', 5000, 8000, 100, 10, '2026-12-31', 'Ya'],
            ['OB-002', 'Amoxicillin 500mg (Bebas PPN)', 'Kapsul', 'Strip', 12000, 18000, 150, 15, '2026-06-30', 'Tidak'],
            ['OB-003', 'Minyak Kayu Putih 120ml', 'Cair', 'Botol', 32000, 42000, 50, 5, '2027-01-15', 'Ya'],
            ['OB-004', 'Vitamin C 1000mg', 'Tablet Effervescent', 'Tube', 25000, 35000, 30, 5, '2026-09-20', 'Tidak']
        ];
        var ws = XLSX.utils.aoa_to_sheet(ws_data);
        
        // Auto-fit column widths
        ws['!cols'] = [
            {wch: 15}, // Kode Obat
            {wch: 35}, // Nama Obat
            {wch: 15}, // Kategori
            {wch: 12}, // Satuan
            {wch: 15}, // HPP (Rp)
            {wch: 15}, // Harga Jual (Rp)
            {wch: 12}, // Stok Awal
            {wch: 15}, // Stok Minimum
            {wch: 25}, // Exp Date (YYYY-MM-DD)
            {wch: 22}  // Kena PPN (Ya/Tidak)
        ];
        
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Master Obat & Stock");
        XLSX.writeFile(wb, "Template_Import_Obat_Aulia.xlsx");
        Utils.toast('Template Excel berhasil diunduh!', 'success');
    },

    handleFileUpload: function(event) {
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

                // Helper helper-function for smart/fuzzy header matching
                var getVal = function(row, keys) {
                    for (var i = 0; i < keys.length; i++) {
                        var k = keys[i];
                        if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") {
                            return row[k];
                        }
                    }
                    return "";
                };

                AppApotekObat.importData = jsonData.map(function(row) {
                    var kode = String(getVal(row, ['Kode Obat', 'Kode', 'KodeObat', 'SKU']) || '').trim();
                    var nama = String(getVal(row, ['Nama Obat', 'Nama', 'NamaObat', 'Deskripsi']) || '').trim();
                    var kat = String(getVal(row, ['Kategori', 'Golongan', 'Jenis', 'Kategori Obat']) || '').trim();
                    var sat = String(getVal(row, ['Satuan', 'Unit', 'Satuan Obat']) || '').trim();
                    
                    var hppVal = parseFloat(getVal(row, ['HPP (Rp)', 'HPP', 'Harga Beli (Rp)', 'Harga Beli', 'Harga Pokok Pembelian', 'HargaBeli'])) || 0;
                    var jualVal = parseFloat(getVal(row, ['Harga Jual (Rp)', 'Harga Jual', 'HargaJual', 'Jual'])) || 0;
                    var stokVal = parseInt(getVal(row, ['Stok Awal', 'Stok Saat Ini', 'Stok', 'StokAwal', 'Jumlah Stok', 'Qty'])) || 0;
                    var stokMinVal = parseInt(getVal(row, ['Stok Minimum', 'Stok Min', 'Minimal Stok', 'Min Stok', 'StokMin'])) || 0;
                    var exp = String(getVal(row, ['Exp Date (YYYY-MM-DD)', 'Exp Date', 'Tanggal Kadaluarsa', 'Expired Date', 'Expired', 'Exp', 'Kadaluarsa']) || '').trim();
                    
                    var ppnVal = getVal(row, ['Kena PPN (Ya/Tidak)', 'Kena PPN', 'PPN (Ya/Tidak)', 'PPN', 'Pajak PPN', 'IsPPN', 'Tax']);
                    var isPPN = true; // Default to true if not specified
                    if (ppnVal !== undefined && ppnVal !== null && ppnVal !== "") {
                        var pStr = String(ppnVal).toLowerCase().trim();
                        if (pStr === 'tidak' || pStr === 'no' || pStr === 't' || pStr === 'n' || pStr === 'false' || pStr === '0') {
                            isPPN = false;
                        }
                    }

                    return {
                        kodeObat: kode,
                        namaObat: nama,
                        kategori: kat,
                        satuan: sat,
                        hpp: hppVal,
                        hargaJual: jualVal,
                        stok: stokVal,
                        stokMinimum: stokMinVal,
                        expDate: exp,
                        isPPN: isPPN
                    };
                }).filter(row => row.namaObat !== '' && row.hpp > 0);

                if (AppApotekObat.importData.length === 0) {
                    Utils.toast('Tidak ada data obat valid yang terbaca. Pastikan ada kolom "Nama Obat" dan "HPP (Rp)" bernilai > 0.', 'error');
                    return;
                }

                AppApotekObat.renderImportPreview();
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
        html += '<h3 class="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2"><i data-lucide="package" class="w-5 h-5"></i> Preview Import Obat (' + data.length + ' Item)</h3>';
        html += '<button onclick="document.getElementById(\'import-preview-area\').classList.add(\'hidden\')" class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400"><i data-lucide="x" class="w-5 h-5"></i></button>';
        html += '</div>';
        
        html += '<div class="overflow-x-auto max-h-64 rounded-lg border border-slate-200 dark:border-slate-700 mb-4">';
        html += '<table class="w-full text-xs">';
        html += '<thead class="bg-slate-50 dark:bg-slate-900 sticky top-0"><tr><th class="px-2 py-2 text-left">Kode</th><th class="px-2 py-2 text-left">Nama Obat</th><th class="px-2 py-2 text-right">HPP</th><th class="px-2 py-2 text-right">Jual</th><th class="px-2 py-2 text-center">Stok</th></tr></thead><tbody>';
        
        var previewCount = Math.min(data.length, 50);
        for (var i = 0; i < previewCount; i++) {
            var o = data[i];
            html += '<tr class="border-t border-slate-100 dark:border-slate-700">';
            html += '<td class="px-2 py-1 font-mono">' + Utils.escapeHtml(o.kodeObat) + '</td>';
            html += '<td class="px-2 py-1 font-medium">' + Utils.escapeHtml(o.namaObat) + '</td>';
            html += '<td class="px-2 py-1 text-right">' + Utils.formatRupiah(o.hpp) + '</td>';
            html += '<td class="px-2 py-1 text-right">' + Utils.formatRupiah(o.hargaJual) + '</td>';
            html += '<td class="px-2 py-1 text-center">' + o.stok + ' ' + Utils.escapeHtml(o.satuan) + '</td>';
            html += '</tr>';
        }
        
        if (data.length > 50) {
            html += '<tr><td colspan="5" class="px-2 py-2 text-center text-slate-400 italic">... dan ' + (data.length - 50) + ' item lainnya</td></tr>';
        }
        html += '</tbody></table></div>';

        html += '<div class="flex justify-end gap-2">';
        html += '<button onclick="document.getElementById(\'import-preview-area\').classList.add(\'hidden\')" class="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Batal</button>';
        html += '<button onclick="AppApotekObat.executeImport()" class="px-6 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center gap-2"><i data-lucide="upload" class="w-4 h-4"></i> Konfirmasi Import Obat</button>';
        html += '</div></div>';

        area.innerHTML = html;
        area.classList.remove('hidden');
        lucide.createIcons();
    },

    executeImport: function() {
        if (!confirm('Import ' + this.importData.length + ' data obat ke database?')) return;

        var dataToImport = this.importData;
        var batchSize = 400;
        var batches = [];
        
        for (var i = 0; i < dataToImport.length; i += batchSize) {
            var chunk = dataToImport.slice(i, i + batchSize);
            var batch = db.batch();
            chunk.forEach(function(obat, chunkIdx) {
                // Gunakan Kode Obat sebagai ID Dokumen (biar tidak duplikat).
                // Fallback ID memakai counter unik (i + chunkIdx) agar tidak bentrok dalam ms yang sama.
                var docId = obat.kodeObat ? obat.kodeObat.replace(/\s+/g, '_') : ('OB-' + Date.now() + '-' + i + '-' + chunkIdx);
                var docRef = db.collection('obat').doc(docId);
                batch.set(docRef, {
                    kodeObat: obat.kodeObat,
                    namaObat: obat.namaObat,
                    kategori: obat.kategori,
                    satuan: obat.satuan,
                    hpp: obat.hpp,
                    hargaJual: obat.hargaJual,
                    stok: obat.stok,
                    stokMinimum: obat.stokMinimum,
                    expDate: obat.expDate,
                    isPPN: obat.isPPN !== false,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true }); 
            });
            batches.push(batch.commit());
        }

        Utils.toast('Sedang memproses...', 'info');
        Promise.all(batches).then(() => {
            Utils.toast('Berhasil mengimport ' + dataToImport.length + ' data obat!', 'success');
            document.getElementById('import-preview-area').classList.add('hidden');
            DataCache.invalidate('obat'); // pastikan cache langsung fresh, tidak nunggu event snapshot
            AppApotekObat.init();
        }).catch(err => {
            Utils.toast('Gagal mengimport: ' + err.message, 'error');
        });
    }
};
