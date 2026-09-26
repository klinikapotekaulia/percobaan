/**
 * js/pengaturan/displayAntrian.js
 * Pengaturan Halaman Display Antrian (display.html) — TV/monitor ruang tunggu.
 *
 * Menyimpan pengaturan yang dibaca SECARA PUBLIK (tanpa login) oleh display.html:
 *   - Logo TV (base64, dipakai menggantikan logostruk.png)
 *   - Label & isi Running Text (ticker berjalan di bagian bawah layar)
 *   - Link video YouTube (ditampilkan sebagai panel tambahan di display)
 *   - Tema default (Malam / Terang) saat TV pertama kali dibuka
 *
 * Firestore: pengaturan/antrianDisplaySettings
 *   { logoBase64, runningLabel, runningText, youtubeLink, tampilkanVideo,
 *     defaultTema, updatedAt, updatedBy }
 */

window.AppPengaturanDisplayAntrian = {
    data: {},

    render: function() {
        var html = '<div class="page-enter max-w-4xl">';
        html += '  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">';
        html += '    <div>';
        html += '      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Pengaturan Display Antrian</h2>';
        html += '      <p class="text-sm text-slate-500 dark:text-slate-400">Atur logo, running text, video YouTube & tema untuk layar TV ruang tunggu</p>';
        html += '    </div>';
        html += '    <button onclick="window.open(\'display.html\', \'_blank\')" class="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold px-4 py-2.5 rounded-lg transition"><i data-lucide="external-link" class="w-4 h-4"></i> Buka Halaman Display</button>';
        html += '  </div>';
        html += '  <div id="display-antrian-content"><div class="flex justify-center py-20"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        var self = this;
        var role = window.currentRole || '';
        if (role !== 'admin' && role !== 'keuangan' && role !== 'psa') {
            var el = document.getElementById('display-antrian-content');
            if (el) el.innerHTML = '<div class="bg-red-50 text-red-600 p-4 rounded-lg text-center font-semibold">Akses Ditolak. Halaman ini khusus Admin/Keuangan/PSA.</div>';
            return;
        }

        db.collection('pengaturan').doc('antrianDisplaySettings').get().then(function(doc) {
            self.data = doc.exists ? doc.data() : {};
            if (self.data.runningLabel === undefined) self.data.runningLabel = 'INFO';
            if (self.data.runningText === undefined) self.data.runningText = 'Selamat datang di Aulia Apotek & Klinik. Mohon tunggu nomor antrian Anda dipanggil.';
            if (self.data.youtubeLink === undefined) self.data.youtubeLink = '';
            if (self.data.tampilkanVideo === undefined) self.data.tampilkanVideo = false;
            if (self.data.defaultTema === undefined) self.data.defaultTema = 'night';
            if (self.data.logoBase64 === undefined) self.data.logoBase64 = '';
            if (self.data.bahasa === undefined) self.data.bahasa = 'id';
            self.renderForm();
        }).catch(function(err) {
            Utils.toast('Gagal memuat pengaturan: ' + err.message, 'error');
        });
    },

    renderForm: function() {
        var d = this.data;
        var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-6">';

        // Logo
        html += '  <div>';
        html += '    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Logo Display TV</label>';
        html += '    <div class="flex items-center gap-4">';
        html += '      <div id="dp-logo-preview" class="w-20 h-20 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center p-1.5 overflow-hidden shadow-sm">';
        html += d.logoBase64 ? '<img src="' + d.logoBase64 + '" class="max-w-full max-h-full object-contain">' : '<span class="text-[10px] text-slate-400 text-center font-semibold">Logo Default</span>';
        html += '      </div>';
        html += '      <div>';
        html += '        <input type="file" id="dp-logo-file" accept="image/png, image/jpeg, image/jpg" class="hidden" onchange="AppPengaturanDisplayAntrian.handleLogoUpload(event)">';
        html += '        <button type="button" onclick="document.getElementById(\'dp-logo-file\').click()" class="text-xs bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-3 py-1.5 rounded-lg font-medium hover:bg-primary-100">Upload Logo</button>';
        if (d.logoBase64) html += '        <button type="button" onclick="AppPengaturanDisplayAntrian.removeLogo()" class="text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg ml-1">Hapus</button>';
        html += '        <p class="text-[11px] text-slate-400 mt-1.5">Format PNG/JPG, maksimal 300 KB. Kosongkan untuk pakai logo default.</p>';
        html += '      </div>';
        html += '    </div>';
        html += '  </div>';

        // Running Text
        html += '  <div class="border-t border-slate-100 dark:border-slate-700 pt-5">';
        html += '    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Label Ticker (kolom ikonik di depan running text)</label>';
        html += '    <input type="text" id="dp-running-label" value="' + Utils.escapeHtml(d.runningLabel) + '" maxlength="20" placeholder="INFO" class="w-full sm:w-48 px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm mb-4">';

        html += '    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Isi Running Text</label>';
        html += '    <textarea id="dp-running-text" rows="3" placeholder="Tulis pengumuman yang akan berjalan di bagian bawah layar..." class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm">' + Utils.escapeHtml(d.runningText) + '</textarea>';
        html += '    <p class="text-[11px] text-slate-400 mt-1">Tampil berjalan seperti berita di bagian paling bawah layar TV.</p>';
        html += '  </div>';

        // YouTube
        html += '  <div class="border-t border-slate-100 dark:border-slate-700 pt-5">';
        html += '    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Link Video YouTube</label>';
        html += '    <input type="text" id="dp-youtube-link" value="' + Utils.escapeHtml(d.youtubeLink) + '" placeholder="https://www.youtube.com/watch?v=..." class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm mb-2">';
        html += '    <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">';
        html += '      <input type="checkbox" id="dp-tampilkan-video" ' + (d.tampilkanVideo ? 'checked' : '') + ' class="rounded border-slate-300"> Tampilkan panel video di layar TV';
        html += '    </label>';
        html += '    <p class="text-[11px] text-slate-400 mt-1">Terima link biasa (watch?v=...), youtu.be, atau link embed — otomatis disesuaikan.</p>';
        html += '  </div>';

        // Tema Default
        html += '  <div class="border-t border-slate-100 dark:border-slate-700 pt-5">';
        html += '    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tema Default Saat TV Dibuka</label>';
        html += '    <div class="flex gap-4">';
        html += '      <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><input type="radio" name="dp-tema" value="night" ' + (d.defaultTema === 'night' ? 'checked' : '') + '> Hijau Gelap (Emerald Night)</label>';
        html += '      <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><input type="radio" name="dp-tema" value="light" ' + (d.defaultTema === 'light' ? 'checked' : '') + '> Hijau Terang (Clean Pharmacy)</label>';
        html += '    </div>';
        html += '    <p class="text-[11px] text-slate-400 mt-1">Pengguna tetap bisa ganti tema langsung dari tombol di layar TV; ini hanya tema awal saat halaman pertama dibuka.</p>';
        html += '  </div>';
        
        // Bahasa Display & Pengeras Suara
        html += '  <div class="border-t border-slate-100 dark:border-slate-700 pt-5">';
        html += '    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Bahasa Tampilan & Pengeras Suara TV</label>';
        html += '    <div class="flex flex-col sm:flex-row gap-4">';
        html += '      <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><input type="radio" name="dp-bahasa" value="id" ' + (d.bahasa === 'id' || !d.bahasa ? 'checked' : '') + '> Bahasa Indonesia</label>';
        html += '      <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><input type="radio" name="dp-bahasa" value="en" ' + (d.bahasa === 'en' ? 'checked' : '') + '> Bahasa Inggris (English)</label>';
        html += '      <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><input type="radio" name="dp-bahasa" value="su" ' + (d.bahasa === 'su' ? 'checked' : '') + '> Bahasa Sunda</label>';
        html += '    </div>';
        html += '    <p class="text-[11px] text-slate-400 mt-1">Pilih bahasa untuk tulisan display TV dan pengumuman suara pengeras suara antrian.</p>';
        html += '  </div>';

        html += '  <div class="border-t border-slate-100 dark:border-slate-700 pt-5 flex justify-end">';
        html += '    <button onclick="AppPengaturanDisplayAntrian.simpan()" class="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm">Simpan Pengaturan</button>';
        html += '  </div>';

        html += '</div>';

        document.getElementById('display-antrian-content').innerHTML = html;
        lucide.createIcons();
    },

    handleLogoUpload: function(event) {
        var self = this;
        var file = event.target.files[0];
        if (!file) return;

        // Validasi ukuran < 300KB agar aman disimpan dalam dokumen Firestore
        // (konsisten dengan batas yang sama di js/pengaturan/profil.js)
        if (file.size > 300000) {
            Utils.toast('Ukuran file logo terlalu besar. Maksimal 300 KB.', 'warning');
            event.target.value = '';
            return;
        }

        var reader = new FileReader();
        reader.onload = function(e) {
            self.data.logoBase64 = e.target.result;
            var previewBox = document.getElementById('dp-logo-preview');
            if (previewBox) previewBox.innerHTML = '<img src="' + e.target.result + '" class="max-w-full max-h-full object-contain">';
            self.renderForm();
            Utils.toast('Logo terpilih. Klik "Simpan Pengaturan" untuk menerapkannya ke TV.', 'success');
        };
        reader.readAsDataURL(file);
    },

    removeLogo: function() {
        this.data.logoBase64 = '';
        this.renderForm();
    },

    simpan: function() {
        var self = this;
        this.data.runningLabel = document.getElementById('dp-running-label').value.trim() || 'INFO';
        this.data.runningText = document.getElementById('dp-running-text').value.trim();
        this.data.youtubeLink = document.getElementById('dp-youtube-link').value.trim();
        this.data.tampilkanVideo = document.getElementById('dp-tampilkan-video').checked;
        var temaEl = document.querySelector('input[name="dp-tema"]:checked');
        this.data.defaultTema = temaEl ? temaEl.value : 'night';

        var bahasaEl = document.querySelector('input[name="dp-bahasa"]:checked');
        this.data.bahasa = bahasaEl ? bahasaEl.value : 'id';

        db.collection('pengaturan').doc('antrianDisplaySettings').set({
            logoBase64: this.data.logoBase64 || '',
            runningLabel: this.data.runningLabel,
            runningText: this.data.runningText,
            youtubeLink: this.data.youtubeLink,
            tampilkanVideo: this.data.tampilkanVideo,
            defaultTema: this.data.defaultTema,
            bahasa: this.data.bahasa,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: window.currentUserName || 'Admin'
        }, { merge: true }).then(function() {
            if (window.AppKlinikAntrian) {
                window.AppKlinikAntrian.bahasa = self.data.bahasa;
            }
            Utils.toast('Pengaturan display berhasil disimpan! Perubahan langsung tampil di TV.', 'success');
        }).catch(function(err) {
            Utils.toast('Gagal menyimpan: ' + err.message, 'error');
        });
    }
};
