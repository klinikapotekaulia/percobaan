/**
 * js/pengaturan/profil.js
 * Pengaturan Profil Instansi & Pengaturan Struk Kasir (Edit Logo & Konten)
 */

window.AppPengaturanProfil = {
    data: {},
    activeTab: 'profil', // 'profil' atau 'struk'

    render: function() {
        var html = '<div class="page-enter max-w-7xl mx-auto">';
        
        // Header
        html += '  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">';
        html += '    <div>';
        html += '      <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-1">Profil & Pengaturan Struk</h2>';
        html += '      <p class="text-sm text-slate-500 dark:text-slate-400">Kelola identitas instansi dan desain struk cetak kasir Anda</p>';
        html += '    </div>';
        html += '  </div>';

        // Grid Layout: Form Kiri, Live Preview Kanan
        html += '  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">';
        
        // Kiri: Form & Tabs (Col 7)
        html += '    <div class="lg:col-span-7 space-y-6">';
        
        // Tab Navigasi
        html += '      <div class="border-b border-slate-200 dark:border-slate-700 flex gap-4">';
        html += '        <button id="tab-btn-profil" onclick="AppPengaturanProfil.switchTab(\'profil\')" class="pb-3 text-sm font-semibold border-b-2 transition-all px-1 ' + (this.activeTab === 'profil' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white') + '">Profil Instansi</button>';
        html += '        <button id="tab-btn-struk" onclick="AppPengaturanProfil.switchTab(\'struk\')" class="pb-3 text-sm font-semibold border-b-2 transition-all px-1 ' + (this.activeTab === 'struk' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white') + '">Pengaturan Struk</button>';
        html += '        <button id="tab-btn-backup" onclick="AppPengaturanProfil.switchTab(\'backup\')" class="pb-3 text-sm font-semibold border-b-2 transition-all px-1 ' + (this.activeTab === 'backup' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white') + '">Backup Data</button>';
        html += '        <button id="tab-btn-printer_thermal" onclick="AppPengaturanProfil.switchTab(\'printer_thermal\')" class="pb-3 text-sm font-semibold border-b-2 transition-all px-1 ' + (this.activeTab === 'printer_thermal' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white') + '">Printer Termal</button>';
        html += '      </div>';

        // Container Form (dinamis di-render)
        html += '      <div id="form-container"></div>';
        
        html += '    </div>';

        // Kanan: Live Receipt Preview (Col 5)
        html += '    <div class="lg:col-span-5">';
        html += '      <div class="sticky top-6">';
        html += '        <p class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">';
        html += '          <i data-lucide="eye" class="w-3.5 h-3.5"></i> Live Preview Struk';
        html += '        </p>';
        
        // The thermal receipt paper container
        html += '        <div class="bg-slate-100 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-center shadow-inner">';
        html += '          <div id="receipt-preview-paper" class="w-full max-w-[310px] bg-[#fdfdfd] text-slate-900 border border-slate-300 shadow-md p-4 font-mono text-xs rounded-sm select-none relative overflow-hidden" style="color:#000000 !important; font-family:\'Courier New\', Courier, monospace !important;">';
        
        // Decorative torn paper effect top & bottom
        html += '            <div class="absolute top-0 left-0 right-0 h-1 bg-[radial-gradient(circle,transparent_20%,#f0f0f0_21%,#f0f0f0_34%,transparent_35%,transparent)] bg-[length:8px_8px] bg-repeat-x"></div>';
        
        // Preview content rendered here
        html += '            <div id="receipt-preview-content" class="py-2"></div>';
        
        html += '            <div class="absolute bottom-0 left-0 right-0 h-1 bg-[radial-gradient(circle,transparent_20%,#f0f0f0_21%,#f0f0f0_34%,transparent_35%,transparent)] bg-[length:8px_8px] bg-repeat-x"></div>';
        html += '          </div>';
        html += '        </div>';
        
        html += '      </div>';
        html += '    </div>';

        html += '  </div>'; // End Grid
        html += '</div>'; // End Page
        
        return html;
    },

    init: function() {
        var self = this;
        db.collection('pengaturan').doc('profil').get().then(function(doc) {
            if (doc.exists) {
                self.data = doc.data();
            } else {
                // Default fallback values
                self.data = {
                    nama: 'Aulia Apotek Klinik',
                    alamat: 'Jl. Ahmad Yani No. 45, Kota Sehat',
                    telp: '0812-3456-7890',
                    email: 'info@aulia-apotek.com',
                    
                    // Struk defaults
                    tampilkanLogo: true,
                    logoStrukB64: '', // Kosong = pakai inisial / default logo
                    logoUkuran: 100, // lebar px
                    logoPosisi: 'center', // left, center, right
                    
                    strukHeader1: 'AULIA APOTEK KLINIK',
                    strukHeader2: 'Apotek & Klinik Terpadu 24 Jam',
                    strukHeader3: 'Jl. Ahmad Yani No. 45, Kota Sehat',
                    strukHeader4: 'Telp: 0812-3456-7890',
                    strukHeaderSelesai: '',
                    
                    showPasien: true,
                    showDokter: true,
                    showMetodeBayar: true,
                    
                    strukFooter1: 'Terima Kasih',
                    strukFooter2: 'Semoga Lekas Sembuh',
                    footerStruk: 'Barang yang sudah dibeli tidak dapat ditukar',
                    
                    strukLebar: '80mm',
                    strukUkuranFont: '12px'
                };
            }
            self.ensureDefaultKeys();
            self.renderActiveForm();
            self.updatePreview();
        }).catch(function(err) {
            Utils.toast('Gagal memuat profil: ' + err.message, 'error');
        });
    },

    ensureDefaultKeys: function() {
        var d = this.data;
        if (d.tampilkanLogo === undefined) d.tampilkanLogo = true;
        if (d.logoUkuran === undefined) d.logoUkuran = 100;
        if (d.logoPosisi === undefined) d.logoPosisi = 'center';
        
        if (d.strukHeader1 === undefined) d.strukHeader1 = d.nama || 'AULIA APOTEK KLINIK';
        if (d.strukHeader2 === undefined) d.strukHeader2 = 'Apotek & Klinik Terpadu 24 Jam';
        if (d.strukHeader3 === undefined) d.strukHeader3 = d.alamat || '';
        if (d.strukHeader4 === undefined) d.strukHeader4 = d.telp ? 'Telp: ' + d.telp : '';
        if (d.strukHeaderSelesai === undefined) d.strukHeaderSelesai = '';
        
        if (d.showPasien === undefined) d.showPasien = true;
        if (d.showDokter === undefined) d.showDokter = true;
        if (d.showMetodeBayar === undefined) d.showMetodeBayar = true;
        
        if (d.strukFooter1 === undefined) d.strukFooter1 = 'Terima Kasih';
        if (d.strukFooter2 === undefined) d.strukFooter2 = 'Semoga Lekas Sembuh';
        if (d.footerStruk === undefined) d.footerStruk = d.footerStruk || '';
        
        if (d.strukLebar === undefined) d.strukLebar = '80mm';
        if (d.strukUkuranFont === undefined) d.strukUkuranFont = '12px';
        if (!d.socials || typeof d.socials !== 'object') {
            d.socials = { facebook: "", instagram: "", twitter: "" };
        } else {
            if (typeof d.socials.facebook !== 'string') d.socials.facebook = "";
            if (typeof d.socials.instagram !== 'string') d.socials.instagram = "";
            if (typeof d.socials.twitter !== 'string') d.socials.twitter = "";
        }
    },

    switchTab: function(tab) {
        this.activeTab = tab;
        
        var tabs = ['profil', 'struk', 'backup', 'printer_thermal'];
        tabs.forEach(function(t) {
            var btn = document.getElementById('tab-btn-' + t);
            if (btn) {
                if (t === tab) {
                    btn.className = 'pb-3 text-sm font-semibold border-b-2 transition-all px-1 border-primary-600 text-primary-600';
                } else {
                    btn.className = 'pb-3 text-sm font-semibold border-b-2 transition-all px-1 border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white';
                }
            }
        });
        
        this.renderActiveForm();
    },

    renderActiveForm: function() {
        var self = this;
        var container = document.getElementById('form-container');
        if (!container) return;

        var d = this.data;
        var role = window.currentRole || 'apotek';
        var canEdit = (role === 'admin' || role === 'keuangan' || role === 'psa');
        
        if (this.activeTab === 'backup') {
            var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">';
            
            html += '  <div class="border-b border-slate-100 dark:border-slate-700 pb-4">';
            html += '    <h3 class="text-base font-bold text-gray-800 dark:text-white mb-1.5 flex items-center gap-2"><i data-lucide="database" class="w-5 h-5 text-primary-500"></i> Backup Seluruh Data Aplikasi</h3>';
            html += '    <p class="text-xs text-slate-500 dark:text-slate-400">Unduh salinan cadangan dari seluruh koleksi data Anda di Firestore dalam format berkas JSON tunggal. Simpan berkas ini dengan aman sebagai cadangan offline instansi Anda.</p>';
            html += '  </div>';

            html += '  <div class="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 p-4 rounded-xl flex items-start gap-3">';
            html += '    <i data-lucide="shield-check" class="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"></i>';
            html += '    <div>';
            html += '      <h4 class="text-xs font-bold text-blue-800 dark:text-blue-300 mb-1">Keamanan & Hak Akses</h4>';
            html += '      <p class="text-[11px] text-blue-700 dark:text-blue-400 leading-relaxed">Proses ini mengambil data langsung dari server Firebase secara real-time. Data yang diunduh dibatasi berdasarkan hak akses akun Anda saat ini (<strong>' + role.toUpperCase() + '</strong>). Data sensitif yang tidak dapat diakses oleh peran Anda akan diabaikan secara otomatis tanpa menghentikan seluruh proses pencadangan.</p>';
            html += '    </div>';
            html += '  </div>';

            // Progress Panel
            html += '  <div id="backup-progress-panel" class="hidden border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50 dark:bg-slate-900/40 space-y-3">';
            html += '    <div class="flex items-center justify-between text-xs font-semibold">';
            html += '      <span id="backup-status-text" class="text-slate-700 dark:text-slate-300">Menyiapkan pencadangan...</span>';
            html += '      <span id="backup-percentage" class="text-primary-600 dark:text-primary-400">0%</span>';
            html += '    </div>';
            html += '    <div class="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">';
            html += '      <div id="backup-progress-bar" class="bg-primary-600 h-full rounded-full transition-all duration-300" style="width: 0%"></div>';
            html += '    </div>';
            html += '    <div id="backup-log-container" class="max-h-40 overflow-y-auto bg-slate-900 dark:bg-black/40 text-slate-300 text-[10px] font-mono p-3 rounded-lg border border-slate-800 dark:border-slate-900 space-y-1">';
            html += '    </div>';
            html += '  </div>';

            // Action
            if (canEdit) {
                html += '  <div class="flex justify-start">';
                html += '    <button type="button" id="btn-start-backup" onclick="AppPengaturanProfil.startBackup()" class="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-2.5 rounded-lg text-xs flex items-center gap-2 shadow-sm shadow-primary-500/10">';
                html += '      <i data-lucide="download-cloud" class="w-4 h-4"></i> Mulai Unduh Backup (JSON)';
                html += '    </button>';
                html += '  </div>';
            } else {
                html += '  <div class="text-center text-xs text-slate-400 pt-4 border-t border-slate-200 dark:border-slate-700">Hanya Admin, Keuangan, atau PSA yang dapat melakukan backup data.</div>';
            }

            html += '</div>';
            container.innerHTML = html;
            if (window.lucide) lucide.createIcons({ el: container });
            return;
        }

        if (this.activeTab === 'printer_thermal') {
            var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">';
            
            html += '  <div class="border-b border-slate-100 dark:border-slate-700 pb-4">';
            html += '    <h3 class="text-base font-bold text-gray-800 dark:text-white mb-1.5 flex items-center gap-2"><i data-lucide="printer" class="w-5 h-5 text-primary-500"></i> Koneksi Printer Termal</h3>';
            html += '    <p class="text-xs text-slate-500 dark:text-slate-400">Hubungkan browser langsung dengan printer kasir termal (Bluetooth/ESC-POS) Anda secara nirkabel tanpa dialog cetak sistem.</p>';
            html += '  </div>';

            var btSupported = !!navigator.bluetooth;
            if (!btSupported) {
                html += '  <div class="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-4 rounded-xl flex items-start gap-3">';
                html += '    <i data-lucide="alert-triangle" class="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5"></i>';
                html += '    <div>';
                html += '      <h4 class="text-xs font-bold text-rose-800 dark:text-rose-300 mb-1">Web Bluetooth Tidak Didukung</h4>';
                html += '      <p class="text-[11px] text-rose-700 dark:text-rose-400 leading-relaxed">Browser Anda tidak mendukung Web Bluetooth API. Fitur koneksi langsung ini membutuhkan browser berbasis Chromium (seperti <strong>Google Chrome, Microsoft Edge, atau Opera</strong>) di Desktop maupun Android. Safari dan Firefox tidak mendukung fitur ini.</p>';
                html += '    </div>';
                html += '  </div>';
            } else {
                var isIframe = window.self !== window.top;
                if (isIframe) {
                    html += '  <div class="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-4 rounded-xl flex items-start gap-3">';
                    html += '    <i data-lucide="info" class="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"></i>';
                    html += '    <div class="flex-1">';
                    html += '      <h4 class="text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">Akses Bluetooth Terbuka di Tab Baru</h4>';
                    html += '      <p class="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed mb-2.5">Sistem keamanan browser membatasi Web Bluetooth jika dijalankan di dalam bingkai (iframe) pratinjau AI Studio ini. Silakan buka aplikasi di <strong>Tab Baru</strong> agar printer termal Bluetooth Anda dapat dideteksi dan dihubungkan secara langsung.</p>';
                    html += '      <a href="#" onclick="window.open(window.location.href, \'_blank\'); return false;" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold rounded-lg transition shadow-sm">';
                    html += '        <i data-lucide="external-link" class="w-3.5 h-3.5"></i> Buka Aplikasi di Tab Baru';
                    html += '      </a>';
                    html += '    </div>';
                    html += '  </div>';
                }

                var isConnected = window.ThermalPrinter.isConnected();
                var statusColor = isConnected ? 'text-emerald-500' : 'text-slate-400';
                var statusBg = isConnected ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/20' : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700';
                
                html += '  <div class="p-4 rounded-xl border flex items-center justify-between ' + statusBg + '">';
                html += '    <div class="flex items-center gap-3">';
                html += '      <div class="w-10 h-10 rounded-full flex items-center justify-center ' + (isConnected ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400') + '">';
                html += '        <i data-lucide="printer" class="w-5 h-5"></i>';
                html += '      </div>';
                html += '      <div>';
                html += '        <div class="flex items-center gap-2">';
                html += '          <span class="text-xs font-bold text-slate-800 dark:text-white">Status Printer:</span>';
                html += '          <span class="inline-flex items-center gap-1 text-[11px] font-semibold ' + statusColor + '">';
                html += '            <span class="w-2 h-2 rounded-full ' + (isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400') + '"></span>';
                html += '            ' + (isConnected ? 'Terhubung' : 'Terputus');
                html += '          </span>';
                html += '        </div>';
                html += '        <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">' + (isConnected ? 'Perangkat: ' + window.ThermalPrinter.printerName : 'Silakan klik hubungkan di sebelah kanan') + '</p>';
                html += '      </div>';
                html += '    </div>';
                
                if (isConnected) {
                    html += '    <button type="button" onclick="AppPengaturanProfil.disconnectPrinter()" class="bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 font-semibold px-4 py-2 rounded-lg text-xs border border-rose-100 dark:border-rose-900/30 flex items-center gap-1.5 transition">';
                    html += '      <i data-lucide="log-out" class="w-3.5 h-3.5"></i> Putuskan';
                    html += '    </button>';
                } else {
                    html += '    <button type="button" onclick="AppPengaturanProfil.connectPrinter()" class="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-sm shadow-primary-500/10 transition">';
                    html += '      <i data-lucide="link" class="w-3.5 h-3.5"></i> Hubungkan';
                    html += '    </button>';
                }
                html += '  </div>';

                html += '  <div class="space-y-4 border-t border-slate-100 dark:border-slate-700 pt-4">';
                html += '    <h4 class="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Pengaturan Printer Termal</h4>';

                var paperW = window.ThermalPrinter.paperWidth;
                html += '    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">';
                html += '      <div>';
                html += '        <label class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Ukuran Lebar Kertas Bluetooth</label>';
                html += '        <select onchange="AppPengaturanProfil.changePrinterPaperWidth(this.value)" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary-500">';
                html += '          <option value="58mm" ' + (paperW === '58mm' ? 'selected' : '') + '>Kertas Kecil (58mm - 32 Karakter)</option>';
                html += '          <option value="80mm" ' + (paperW === '80mm' ? 'selected' : '') + '>Kertas Standar (80mm - 48 Karakter)</option>';
                html += '        </select>';
                html += '      </div>';

                var isAuto = window.ThermalPrinter.isAutoPrint;
                html += '      <div>';
                html += '        <label class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Otomatis Cetak Struk</label>';
                html += '        <select onchange="AppPengaturanProfil.changePrinterAutoPrint(this.value === \'true\')" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary-500">';
                html += '          <option value="false" ' + (!isAuto ? 'selected' : '') + '>Manual (Klik cetak baru keluar)</option>';
                html += '          <option value="true" ' + (isAuto ? 'selected' : '') + '>Otomatis cetak setelah simpan transaksi</option>';
                html += '        </select>';
                html += '      </div>';
                html += '    </div>';

                if (isConnected) {
                    html += '    <div class="flex justify-start border-t border-slate-100 dark:border-slate-700 pt-4">';
                    html += '      <button type="button" onclick="AppPengaturanProfil.testPrint()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-sm shadow-indigo-500/10 transition">';
                    html += '        <i data-lucide="file-text" class="w-4 h-4"></i> Cetak Halaman Uji Coba (Test Print)';
                    html += '      </button>';
                    html += '    </div>';
                }
                html += '  </div>';
            }

            html += '</div>';
            container.innerHTML = html;
            if (window.lucide) lucide.createIcons({ el: container });
            return;
        }

        var html = '<form id="form-profil-instansi" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">';
        
        if (this.activeTab === 'profil') {
            // === TAB PROFIL INSTANSI ===
            html += '<div class="flex flex-col sm:flex-row items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">';
            html += '  <div class="w-16 h-16 bg-gradient-to-tr from-primary-600 to-pink-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">' + (d.nama || 'A').charAt(0) + '</div>';
            html += '  <div class="text-center sm:text-left">';
            html += '    <h3 class="font-bold text-base text-gray-800 dark:text-white">' + Utils.escapeHtml(d.nama || 'Aulia Apotek Klinik') + '</h3>';
            html += '    <p class="text-xs text-slate-400">Silakan lengkapi profil dasar instansi Anda di bawah ini</p>';
            html += '  </div>';
            html += '</div>';

            // Nama Instansi
            html += '<div>';
            html += '  <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Nama Instansi *</label>';
            html += '  <input type="text" id="pr-nama" value="' + Utils.escapeHtml(d.nama || '') + '" required ' + (canEdit ? '' : 'readonly') + ' class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm ' + (canEdit ? '' : 'bg-slate-100 cursor-not-allowed') + '" oninput="AppPengaturanProfil.handleInputChange(\'nama\', this.value)">';
            html += '</div>';

            // Alamat
            html += '<div>';
            html += '  <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Alamat Lengkap</label>';
            html += '  <textarea id="pr-alamat" rows="2" ' + (canEdit ? '' : 'readonly') + ' class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm ' + (canEdit ? '' : 'bg-slate-100 cursor-not-allowed') + '" oninput="AppPengaturanProfil.handleInputChange(\'alamat\', this.value)">' + Utils.escapeHtml(d.alamat || '') + '</textarea>';
            html += '</div>';

            // Telp & Email
            html += '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">';
            html += '  <div>';
            html += '    <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">No. Telepon / WA</label>';
            html += '    <input type="text" id="pr-telp" value="' + Utils.escapeHtml(d.telp || '') + '" ' + (canEdit ? '' : 'readonly') + ' class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm ' + (canEdit ? '' : 'bg-slate-100 cursor-not-allowed') + '" placeholder="0812xxxxxxx" oninput="AppPengaturanProfil.handleInputChange(\'telp\', this.value)">';
            html += '  </div>';
            html += '  <div>';
            html += '    <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Email (Opsional)</label>';
            html += '    <input type="email" id="pr-email" value="' + Utils.escapeHtml(d.email || '') + '" ' + (canEdit ? '' : 'readonly') + ' class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm ' + (canEdit ? '' : 'bg-slate-100 cursor-not-allowed') + '" placeholder="info@aulia.com" oninput="AppPengaturanProfil.handleInputChange(\'email\', this.value)">';
            html += '  </div>';
            html += '</div>';

            // Media Sosial
            html += '<div class="border-t border-slate-100 dark:border-slate-700 pt-4 mt-4 space-y-4">';
            html += '  <h4 class="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5"><i data-lucide="share-2" class="w-4 h-4 text-emerald-500"></i> Media Sosial (Footer Landing Page)</h4>';
            html += '  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">';
            html += '    <div>';
            html += '      <label class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><i data-lucide="facebook" class="w-3.5 h-3.5 text-blue-500"></i> Facebook</label>';
            html += '      <input type="text" id="pr-fb" value="' + Utils.escapeHtml(d.socials.facebook || '') + '" ' + (canEdit ? '' : 'readonly') + ' class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-xs ' + (canEdit ? '' : 'bg-slate-100 cursor-not-allowed') + '" placeholder="https://facebook.com/username" oninput="AppPengaturanProfil.handleSocialChange(\'facebook\', this.value)">';
            html += '    </div>';
            html += '    <div>';
            html += '      <label class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><i data-lucide="instagram" class="w-3.5 h-3.5 text-pink-500"></i> Instagram</label>';
            html += '      <input type="text" id="pr-ig" value="' + Utils.escapeHtml(d.socials.instagram || '') + '" ' + (canEdit ? '' : 'readonly') + ' class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-xs ' + (canEdit ? '' : 'bg-slate-100 cursor-not-allowed') + '" placeholder="https://instagram.com/username" oninput="AppPengaturanProfil.handleSocialChange(\'instagram\', this.value)">';
            html += '    </div>';
            html += '    <div>';
            html += '      <label class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><svg class="w-3.5 h-3.5 dark:fill-white fill-slate-800 inline-block align-text-bottom" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> Twitter / X</label>';
            html += '      <input type="text" id="pr-tw" value="' + Utils.escapeHtml(d.socials.twitter || '') + '" ' + (canEdit ? '' : 'readonly') + ' class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-xs ' + (canEdit ? '' : 'bg-slate-100 cursor-not-allowed') + '" placeholder="https://twitter.com/username" oninput="AppPengaturanProfil.handleSocialChange(\'twitter\', this.value)">';
            html += '    </div>';
            html += '  </div>';
            html += '</div>';
            
        } else {
            // === TAB PENGATURAN STRUK ===
            html += '<div class="space-y-6">';

            // Bagian Logo
            html += '  <div class="border-b border-slate-100 dark:border-slate-700/60 pb-5">';
            html += '    <h3 class="text-sm font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2"><i data-lucide="image" class="w-4 h-4 text-primary-500"></i> Logo Struk</h3>';
            
            html += '    <div class="flex flex-col sm:flex-row items-center gap-5">';
            // Preview Logo Uploaded
            html += '      <div id="logo-uploader-preview" class="w-20 h-20 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center p-1.5 overflow-hidden shadow-sm">';
            if (d.logoStrukB64) {
                html += '        <img src="' + d.logoStrukB64 + '" class="max-w-full max-h-full object-contain">';
            } else {
                html += '        <span class="text-[10px] text-slate-400 text-center font-semibold font-sans">No Logo</span>';
            }
            html += '      </div>';
            
            // Upload Controls
            html += '      <div class="flex-1 space-y-2 text-center sm:text-left">';
            html += '        <div class="flex flex-wrap items-center gap-2 justify-center sm:justify-start">';
            html += '          <label class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white text-xs font-semibold rounded-lg cursor-pointer border border-slate-200 dark:border-slate-600 transition flex items-center gap-1.5 ' + (canEdit ? '' : 'opacity-50 cursor-not-allowed') + '">';
            html += '            <i data-lucide="upload" class="w-3.5 h-3.5"></i> Pilih File';
            html += '            <input type="file" id="logo-file-picker" accept="image/png, image/jpeg, image/jpg" class="hidden" ' + (canEdit ? '' : 'disabled') + ' onchange="AppPengaturanProfil.handleLogoUpload(event)">';
            html += '          </label>';
            if (d.logoStrukB64) {
                html += '          <button type="button" onclick="AppPengaturanProfil.removeLogo()" class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-xs font-semibold rounded-lg border border-rose-100 dark:border-rose-900/30 transition flex items-center gap-1.5">Hapus Logo</button>';
            }
            html += '        </div>';
            html += '        <p class="text-[10px] text-slate-400 dark:text-slate-500">Mendukung format PNG/JPG. File dikompresi & disimpan langsung di database.</p>';
            html += '      </div>';
            html += '    </div>';

            // Logo layout options
            html += '    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">';
            // Tampilkan Logo Toggle
            html += '      <div>';
            html += '        <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Tampilkan Logo</label>';
            html += '        <select id="st-show-logo" onchange="AppPengaturanProfil.handleInputChange(\'tampilkanLogo\', this.value === \'true\')" class="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500">';
            html += '          <option value="true" ' + (d.tampilkanLogo ? 'selected' : '') + '>Ya, Tampilkan</option>';
            html += '          <option value="false" ' + (!d.tampilkanLogo ? 'selected' : '') + '>Tidak</option>';
            html += '        </select>';
            html += '      </div>';
            // Logo Posisi
            html += '      <div>';
            html += '        <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Posisi Logo</label>';
            html += '        <select id="st-logo-pos" onchange="AppPengaturanProfil.handleInputChange(\'logoPosisi\', this.value)" class="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500">';
            html += '          <option value="left" ' + (d.logoPosisi === 'left' ? 'selected' : '') + '>Kiri</option>';
            html += '          <option value="center" ' + (d.logoPosisi === 'center' ? 'selected' : '') + '>Tengah</option>';
            html += '          <option value="right" ' + (d.logoPosisi === 'right' ? 'selected' : '') + '>Kanan</option>';
            html += '        </select>';
            html += '      </div>';
            // Logo Ukuran
            html += '      <div>';
            html += '        <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Lebar Logo (px)</label>';
            html += '        <input type="number" id="st-logo-size" value="' + d.logoUkuran + '" min="40" max="200" step="10" oninput="AppPengaturanProfil.handleInputChange(\'logoUkuran\', parseInt(this.value, 10))" class="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500">';
            html += '      </div>';
            html += '    </div>';
            html += '  </div>';

            // Bagian Header Konten
            html += '  <div class="border-b border-slate-100 dark:border-slate-700/60 pb-5">';
            html += '    <h3 class="text-sm font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2"><i data-lucide="align-center" class="w-4 h-4 text-primary-500"></i> Konten Header Struk</h3>';
            html += '    <div class="space-y-3">';
            
            // Header 1
            html += '      <div>';
            html += '        <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Baris 1 (Nama Toko / Utama)</label>';
            html += '        <input type="text" id="st-h1" value="' + Utils.escapeHtml(d.strukHeader1) + '" oninput="AppPengaturanProfil.handleInputChange(\'strukHeader1\', this.value)" class="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-xs" placeholder="NAMA APOTEK / KLINIK">';
            html += '      </div>';
            // Header 2
            html += '      <div>';
            html += '        <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Baris 2 (Slogan / Sub-header)</label>';
            html += '        <input type="text" id="st-h2" value="' + Utils.escapeHtml(d.strukHeader2) + '" oninput="AppPengaturanProfil.handleInputChange(\'strukHeader2\', this.value)" class="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-xs" placeholder="Klinik Pratama & Apotek 24 Jam">';
            html += '      </div>';
            // Header 3
            html += '      <div>';
            html += '        <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Baris 3 (Alamat)</label>';
            html += '        <input type="text" id="st-h3" value="' + Utils.escapeHtml(d.strukHeader3) + '" oninput="AppPengaturanProfil.handleInputChange(\'strukHeader3\', this.value)" class="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-xs" placeholder="Jl. Raya No. 12">';
            html += '      </div>';
            // Header 4
            html += '      <div>';
            html += '        <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Baris 4 (Telepon / Kontak)</label>';
            html += '        <input type="text" id="st-h4" value="' + Utils.escapeHtml(d.strukHeader4) + '" oninput="AppPengaturanProfil.handleInputChange(\'strukHeader4\', this.value)" class="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-xs" placeholder="Telp: 0812xxxxxx">';
            html += '      </div>';
            // Header Selesai / Tambahan Akhir
            html += '      <div>';
            html += '        <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Teks Tambahan Akhir Header (Opsional)</label>';
            html += '        <input type="text" id="st-h-selesai" value="' + Utils.escapeHtml(d.strukHeaderSelesai) + '" oninput="AppPengaturanProfil.handleInputChange(\'strukHeaderSelesai\', this.value)" class="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-xs" placeholder="SIP: 123/DU/2026 atau notes lainnya">';
            html += '      </div>';

            html += '    </div>';
            html += '  </div>';

            // Bagian Detail Transaksi & Body
            html += '  <div class="border-b border-slate-100 dark:border-slate-700/60 pb-5">';
            html += '    <h3 class="text-sm font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2"><i data-lucide="check-square" class="w-4 h-4 text-primary-500"></i> Detail Informasi Body</h3>';
            html += '    <div class="space-y-2.5 bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">';
            
            // Show Pasien
            html += '      <div class="flex items-center justify-between">';
            html += '        <label for="st-show-pasien" class="text-xs text-slate-600 dark:text-slate-300 font-medium">Tampilkan Nama Pasien</label>';
            html += '        <input type="checkbox" id="st-show-pasien" ' + (d.showPasien ? 'checked' : '') + ' onchange="AppPengaturanProfil.handleInputChange(\'showPasien\', this.checked)" class="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500">';
            html += '      </div>';
            // Show Dokter
            html += '      <div class="flex items-center justify-between">';
            html += '        <label for="st-show-dokter" class="text-xs text-slate-600 dark:text-slate-300 font-medium">Tampilkan Nama Dokter (bila ada)</label>';
            html += '        <input type="checkbox" id="st-show-dokter" ' + (d.showDokter ? 'checked' : '') + ' onchange="AppPengaturanProfil.handleInputChange(\'showDokter\', this.checked)" class="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500">';
            html += '      </div>';
            // Show Metode Pembayaran
            html += '      <div class="flex items-center justify-between">';
            html += '        <label for="st-show-bayar" class="text-xs text-slate-600 dark:text-slate-300 font-medium">Tampilkan Metode Pembayaran (Cash/Transfer/QRIS)</label>';
            html += '        <input type="checkbox" id="st-show-bayar" ' + (d.showMetodeBayar ? 'checked' : '') + ' onchange="AppPengaturanProfil.handleInputChange(\'showMetodeBayar\', this.checked)" class="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500">';
            html += '      </div>';

            html += '    </div>';
            html += '  </div>';

            // Bagian Footer Konten
            html += '  <div class="border-b border-slate-100 dark:border-slate-700/60 pb-5">';
            html += '    <h3 class="text-sm font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2"><i data-lucide="message-square" class="w-4 h-4 text-primary-500"></i> Konten Footer Struk</h3>';
            html += '    <div class="space-y-3">';
            
            // Footer 1
            html += '      <div>';
            html += '        <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Pesan Salam Utama</label>';
            html += '        <input type="text" id="st-f1" value="' + Utils.escapeHtml(d.strukFooter1) + '" oninput="AppPengaturanProfil.handleInputChange(\'strukFooter1\', this.value)" class="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-xs" placeholder="Terima Kasih">';
            html += '      </div>';
            // Footer 2
            html += '      <div>';
            html += '        <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Pesan Salam Tambahan</label>';
            html += '        <input type="text" id="st-f2" value="' + Utils.escapeHtml(d.strukFooter2) + '" oninput="AppPengaturanProfil.handleInputChange(\'strukFooter2\', this.value)" class="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-xs" placeholder="Semoga Lekas Sembuh">';
            html += '      </div>';
            // Teks Footer Struk Lama
            html += '      <div>';
            html += '        <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Keterangan / Aturan Retur Struk</label>';
            html += '        <input type="text" id="st-f-retur" value="' + Utils.escapeHtml(d.footerStruk) + '" oninput="AppPengaturanProfil.handleInputChange(\'footerStruk\', this.value)" class="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-xs" placeholder="Barang yang sudah dibeli tidak dapat ditukar">';
            html += '      </div>';

            html += '    </div>';
            html += '  </div>';

            // Kertas & Font
            html += '  <div>';
            html += '    <h3 class="text-sm font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2"><i data-lucide="printer" class="w-4 h-4 text-primary-500"></i> Dimensi & Format Cetak</h3>';
            html += '    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">';
            // Lebar Kertas
            html += '      <div>';
            html += '        <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Lebar Kertas Cetak</label>';
            html += '        <select id="st-width" onchange="AppPengaturanProfil.handleInputChange(\'strukLebar\', this.value)" class="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none"> ';
            html += '          <option value="58mm" ' + (d.strukLebar === '58mm' ? 'selected' : '') + '>Kertas Kasir Kecil (58mm)</option>';
            html += '          <option value="80mm" ' + (d.strukLebar === '80mm' ? 'selected' : '') + '>Kertas Standar Thermal (80mm)</option>';
            html += '        </select>';
            html += '      </div>';
            // Ukuran Font
            html += '      <div>';
            html += '        <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Ukuran Font Struk</label>';
            html += '        <select id="st-font" onchange="AppPengaturanProfil.handleInputChange(\'strukUkuranFont\', this.value)" class="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none"> ';
            html += '          <option value="10px" ' + (d.strukUkuranFont === '10px' ? 'selected' : '') + '>Sangat Kecil (10px)</option>';
            html += '          <option value="11px" ' + (d.strukUkuranFont === '11px' ? 'selected' : '') + '>Kecil (11px)</option>';
            html += '          <option value="12px" ' + (d.strukUkuranFont === '12px' ? 'selected' : '') + '>Normal (12px)</option>';
            html += '          <option value="13px" ' + (d.strukUkuranFont === '13px' ? 'selected' : '') + '>Sedang (13px)</option>';
            html += '          <option value="14px" ' + (d.strukUkuranFont === '14px' ? 'selected' : '') + '>Besar (14px)</option>';
            html += '        </select>';
            html += '      </div>';
            html += '    </div>';
            html += '  </div>';

            html += '</div>';
        }

        // Simpan Button Bar
        if (canEdit) {
            html += '<div class="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">';
            html += '  <button type="submit" class="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-sm shadow-primary-500/10"><i data-lucide="save" class="w-4 h-4"></i> Simpan Perubahan</button>';
            html += '</div>';
        } else {
            html += '<div class="text-center text-xs text-slate-400 pt-4 border-t border-slate-200 dark:border-slate-700">Hanya Admin/Keuangan yang dapat mengubah data ini.</div>';
        }

        html += '</form>';
        container.innerHTML = html;
        lucide.createIcons();

        // Event handler form submit
        if (canEdit) {
            document.getElementById('form-profil-instansi').addEventListener('submit', function(e) {
                e.preventDefault();
                self.simpan();
            });
        }
    },

    handleInputChange: function(key, value) {
        this.data[key] = value;
        // Jika form utama diubah, update otomatis baris-baris struk yang belum dikustomisasi
        if (this.activeTab === 'profil') {
            if (key === 'nama') {
                this.data.strukHeader1 = value.toUpperCase();
            } else if (key === 'alamat') {
                this.data.strukHeader3 = value;
            } else if (key === 'telp') {
                this.data.strukHeader4 = value ? 'Telp: ' + value : '';
            }
        }
        this.updatePreview();
    },

    handleSocialChange: function(key, value) {
        if (!this.data.socials) this.data.socials = {};
        this.data.socials[key] = value;
    },

    handleLogoUpload: function(event) {
        var self = this;
        var file = event.target.files[0];
        if (!file) return;

        // Validasi ukuran < 300KB agar aman disimpan dalam dokumen Firestore
        if (file.size > 300000) {
            Utils.toast('Ukuran file logo terlalu besar. Maksimal 300 KB.', 'warning');
            event.target.value = '';
            return;
        }

        var reader = new FileReader();
        reader.onload = function(e) {
            var b64Data = e.target.result;
            self.data.logoStrukB64 = b64Data;
            
            // Update preview file upload secara lokal
            var previewBox = document.getElementById('logo-uploader-preview');
            if (previewBox) {
                previewBox.innerHTML = '<img src="' + b64Data + '" class="max-w-full max-h-full object-contain">';
            }
            
            // Re-render logo actions
            self.renderActiveForm();
            self.updatePreview();
            Utils.toast('Logo terpilih dan ditambahkan ke preview!', 'success');
        };
        reader.readAsDataURL(file);
    },

    removeLogo: function() {
        this.data.logoStrukB64 = '';
        var previewBox = document.getElementById('logo-uploader-preview');
        if (previewBox) {
            previewBox.innerHTML = '<span class="text-[10px] text-slate-400 text-center font-semibold font-sans">No Logo</span>';
        }
        this.renderActiveForm();
        this.updatePreview();
        Utils.toast('Logo struk dihapus', 'info');
    },

    updatePreview: function() {
        var previewContainer = document.getElementById('receipt-preview-content');
        if (!previewContainer) return;

        var d = this.data;
        var html = '';

        // Apply Font Size on paper
        var paperEl = document.getElementById('receipt-preview-paper');
        if (paperEl) {
            paperEl.style.fontSize = d.strukUkuranFont || '12px';
            // Simulasikan lebar kertas
            if (d.strukLebar === '58mm') {
                paperEl.style.maxWidth = '230px';
            } else {
                paperEl.style.maxWidth = '310px';
            }
        }

        // 1. Logo
        if (d.tampilkanLogo) {
            var alignStyle = 'justify-center';
            if (d.logoPosisi === 'left') alignStyle = 'justify-start';
            if (d.logoPosisi === 'right') alignStyle = 'justify-end';
            
            html += '<div class="flex ' + alignStyle + ' mb-2">';
            if (d.logoStrukB64) {
                html += '  <img src="' + d.logoStrukB64 + '" style="width: ' + (d.logoUkuran || 100) + 'px; height: auto;" class="opacity-90">';
            } else {
                // Mock default icon / initial logo
                html += '  <div class="border border-black rounded-full flex items-center justify-center font-bold text-center" style="width: 44px; height: 44px; border-width: 1.5px; font-size: 18px;">';
                html += '    ' + (d.strukHeader1 || d.nama || 'A').charAt(0);
                html += '  </div>';
            }
            html += '</div>';
        }

        // 2. Header Texts
        if (d.strukHeader1) html += '<h3 class="font-bold text-center uppercase tracking-tight" style="font-size: 1.1em; line-height: 1.3;">' + Utils.escapeHtml(d.strukHeader1) + '</h3>';
        if (d.strukHeader2) html += '<p class="text-center" style="font-size: 0.9em; margin-top: 1px;">' + Utils.escapeHtml(d.strukHeader2) + '</p>';
        if (d.strukHeader3) html += '<p class="text-center" style="font-size: 0.85em; margin-top: 1px;">' + Utils.escapeHtml(d.strukHeader3) + '</p>';
        if (d.strukHeader4) html += '<p class="text-center" style="font-size: 0.85em; margin-top: 1px;">' + Utils.escapeHtml(d.strukHeader4) + '</p>';
        if (d.strukHeaderSelesai) html += '<p class="text-center" style="font-size: 0.8em; margin-top: 2px; font-style: italic;">' + Utils.escapeHtml(d.strukHeaderSelesai) + '</p>';
        
        // Divider
        html += '<div class="text-center my-1 select-none font-bold" style="letter-spacing: -1px; color: #000;">--------------------------------</div>';

        // 3. Metadata Body
        html += '<table class="w-full text-[0.9em]" style="color: #000 !important; border: none !important;">';
        html += '  <tr style="background:transparent!important;"><td class="p-0 border-none" style="width:30%;">No Struk</td><td class="p-0 border-none">: TX-089A12B</td></tr>';
        html += '  <tr style="background:transparent!important;"><td class="p-0 border-none">Tanggal</td><td class="p-0 border-none">: ' + new Date().toLocaleDateString('id-ID') + ' 10:45</td></tr>';
        
        if (d.showPasien) {
            html += '  <tr style="background:transparent!important;"><td class="p-0 border-none">Pasien</td><td class="p-0 border-none">: Budi Santoso</td></tr>';
        }
        if (d.showDokter) {
            html += '  <tr style="background:transparent!important;"><td class="p-0 border-none">Dokter</td><td class="p-0 border-none">: dr. Amanda Safitri</td></tr>';
        }
        if (d.showMetodeBayar) {
            html += '  <tr style="background:transparent!important;"><td class="p-0 border-none">Metode</td><td class="p-0 border-none">: TUNAI (CASH)</td></tr>';
        }
        html += '</table>';
        
        // Divider
        html += '<div class="text-center my-1 select-none font-bold" style="letter-spacing: -1px; color: #000;">--------------------------------</div>';

        // 4. Mock Items
        html += '<table class="w-full text-[0.9em]" style="color: #000 !important; border: none !important;">';
        html += '  <tr style="background:transparent!important;"><td colspan="2" class="p-0 border-none">Paracetamol 500mg Tablet (10 Tab)</td></tr>';
        html += '  <tr style="background:transparent!important;"><td class="p-0 border-none">1 Strip x Rp 15.000</td><td class="text-right p-0 border-none">Rp 15.000</td></tr>';
        html += '  <tr style="background:transparent!important;"><td colspan="2" class="p-0 border-none pt-1">Amoxicillin 500mg Kapsul</td></tr>';
        html += '  <tr style="background:transparent!important;"><td class="p-0 border-none">10 Pcs x Rp 2.500</td><td class="text-right p-0 border-none">Rp 25.000</td></tr>';
        html += '</table>';

        // Divider
        html += '<div class="text-center my-1 select-none font-bold" style="letter-spacing: -1px; color: #000;">--------------------------------</div>';

        // 5. Totals
        html += '<table class="w-full text-[0.9em]" style="color: #000 !important; border: none !important;">';
        html += '  <tr style="background:transparent!important;"><td class="p-0 border-none">Total Obat</td><td class="text-right p-0 border-none">Rp 40.000</td></tr>';
        html += '  <tr style="background:transparent!important;"><td class="p-0 border-none">Jasa Resep</td><td class="text-right p-0 border-none">Rp 5.000</td></tr>';
        html += '  <tr class="font-bold border-none" style="background:transparent!important;"><td class="p-0 border-none">TOTAL AKHIR</td><td class="text-right p-0 border-none">Rp 45.000</td></tr>';
        html += '</table>';

        // Divider
        html += '<div class="text-center my-1 select-none font-bold" style="letter-spacing: -1px; color: #000;">--------------------------------</div>';

        // 6. Footer Messages
        if (d.strukFooter1) html += '<p class="text-center text-[0.9em] font-semibold">' + Utils.escapeHtml(d.strukFooter1) + '</p>';
        if (d.strukFooter2) html += '<p class="text-center text-[0.9em] font-semibold mt-0.5">' + Utils.escapeHtml(d.strukFooter2) + '</p>';
        if (d.footerStruk) html += '<p class="text-center text-[0.8em] mt-1 text-slate-700 italic" style="color: #334155 !important;">* ' + Utils.escapeHtml(d.footerStruk) + ' *</p>';

        previewContainer.innerHTML = html;
    },

    validateProfilData: function(d) {
        if (!d.nama || d.nama.trim() === '') {
            return 'Nama Instansi tidak boleh kosong.';
        }
        if (d.nama.length > 50) {
            return 'Nama Instansi maksimal 50 karakter.';
        }

        if (!d.telp || d.telp.trim() === '') {
            return 'No. Telepon / WA tidak boleh kosong.';
        }
        var phoneRegex = /^[0-9+\s()-\/]{7,25}$/;
        if (!phoneRegex.test(d.telp.trim())) {
            return 'No. Telepon / WA tidak valid.';
        }

        if (!d.email || d.email.trim() === '') {
            return 'Alamat Email Resmi tidak boleh kosong.';
        }
        var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(d.email.trim())) {
            return 'Alamat Email Resmi tidak valid.';
        }

        if (!d.alamat || d.alamat.trim() === '') {
            return 'Alamat Lengkap tidak boleh kosong.';
        }
        if (d.alamat.trim().length < 5) {
            return 'Alamat Lengkap harus diisi minimal 5 karakter.';
        }

        // Validate socials
        var urlRegex = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/;
        function checkUrl(url, fieldName) {
            if (url && url.trim() !== '') {
                if (!urlRegex.test(url.trim())) {
                    return 'Format URL ' + fieldName + ' tidak valid (contoh: https://facebook.com/username).';
                }
            }
            return null;
        }

        var soc = d.socials || {};
        var fbErr = checkUrl(soc.facebook, 'Facebook');
        if (fbErr) return fbErr;
        var igErr = checkUrl(soc.instagram, 'Instagram');
        if (igErr) return igErr;
        var twErr = checkUrl(soc.twitter, 'Twitter / X');
        if (twErr) return twErr;

        return null;
    },

    simpan: function() {
        var self = this;

        // Run validation if we are on the 'profil' tab
        if (self.activeTab === 'profil') {
            var valError = self.validateProfilData(self.data);
            if (valError) {
                Utils.toast(valError, 'error');
                return;
            }
        }

        Utils.toast('Menyimpan...', 'info');
        
        // Simpan langsung seluruh data objek profil
        var dataToSave = Object.assign({}, this.data, {
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        db.collection('pengaturan').doc('profil').set(dataToSave, { merge: true })
            .then(function() {
                // ALSO sync to landing document to keep it perfectly integrated!
                var landingUpdate = {};
                if (dataToSave.nama) landingUpdate.brandName = dataToSave.nama;
                if (dataToSave.telp) landingUpdate.phone = dataToSave.telp;
                if (dataToSave.email) landingUpdate.email = dataToSave.email;
                if (dataToSave.alamat) landingUpdate.address = dataToSave.alamat;
                if (dataToSave.socials) landingUpdate.socials = dataToSave.socials;

                return db.collection('pengaturan').doc('landing').set(landingUpdate, { merge: true });
            })
            .then(function() {
                Utils.toast('Semua perubahan berhasil disimpan!', 'success');
                self.init();
            })
            .catch(function(err) {
                Utils.toast('Gagal menyimpan: ' + err.message, 'error');
            });
    },

    startBackup: function() {
        var self = this;
        var btn = document.getElementById('btn-start-backup');
        var progressPanel = document.getElementById('backup-progress-panel');
        var progressBar = document.getElementById('backup-progress-bar');
        var percentageText = document.getElementById('backup-percentage');
        var statusText = document.getElementById('backup-status-text');
        var logContainer = document.getElementById('backup-log-container');

        if (!progressPanel || !btn) return;

        // Disabling the button to prevent double backup
        btn.disabled = true;
        btn.classList.add('opacity-50', 'cursor-not-allowed');
        progressPanel.classList.remove('hidden');

        logContainer.innerHTML = '';
        progressBar.style.width = '0%';
        percentageText.innerText = '0%';
        statusText.innerText = 'Menghubungkan ke database...';

        function log(message, type) {
            var colorClass = 'text-slate-300';
            if (type === 'success') colorClass = 'text-emerald-400';
            if (type === 'warning') colorClass = 'text-amber-400';
            if (type === 'error') colorClass = 'text-rose-400';
            
            var div = document.createElement('div');
            div.className = colorClass + ' py-0.5 border-b border-slate-800/40 last:border-0';
            div.innerText = '[' + new Date().toLocaleTimeString('id-ID') + '] ' + message;
            logContainer.appendChild(div);
            logContainer.scrollTop = logContainer.scrollHeight;
        }

        log('Pencadangan dimulai...', 'info');

        var collections = [
            'users',
            'obat',
            'transaksi',
            'pembelian',
            'retur',
            'stockOpnameRequests',
            'stockOpnameHistory',
            'pasien',
            'rekamMedis',
            'antrian',
            'karyawan',
            'absensi',
            'jurnalManual',
            'kasKeluar',
            'kasMasuk',
            'mutasiRekening',
            'saldoAwal',
            'payrollHistory',
            'payrollPeriode',
            'piutangKaryawan',
            'thrTabungan',
            'thrPembayaranHistory',
            'groupChat',
            'chatReadStatus',
            'auditLog',
            'pengaturan',
            'pengaturanGaji',
            'pengaturanPembagian',
            'pengaturanPembagianHistory',
            'masterTindakan'
        ];

        var backupResult = {
            metadata: {
                appName: 'Aulia Apotek Klinik',
                backupDate: new Date().toISOString(),
                backupBy: firebase.auth().currentUser ? firebase.auth().currentUser.email : 'Unknown',
                role: window.currentRole || 'Unknown',
                version: '1.0.0'
            },
            data: {}
        };

        var completedCount = 0;
        var totalCollections = collections.length;

        function processNextCollection(index) {
            if (index >= totalCollections) {
                // Done!
                statusText.innerText = 'Pencadangan selesai!';
                progressBar.style.width = '100%';
                percentageText.innerText = '100%';
                log('Semua koleksi selesai diproses. Menyiapkan berkas unduhan...', 'success');

                try {
                    var jsonString = JSON.stringify(backupResult, null, 2);
                    var blob = new Blob([jsonString], { type: 'application/json' });
                    var url = URL.createObjectURL(blob);
                    
                    var a = document.createElement('a');
                    var dateStr = new Date().toISOString().slice(0, 10);
                    a.href = url;
                    a.download = 'backup_aulia_apotek_klinik_' + dateStr + '_' + Date.now() + '.json';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    
                    Utils.toast('Cadangan data berhasil diunduh!', 'success');
                    log('Berkas cadangan berhasil diunduh ke komputer Anda.', 'success');
                } catch (err) {
                    log('Gagal mengunduh berkas: ' + err.message, 'error');
                    Utils.toast('Gagal mengunduh cadangan: ' + err.message, 'error');
                }

                // Restore button
                btn.disabled = false;
                btn.classList.remove('opacity-50', 'cursor-not-allowed');
                return;
            }

            var colName = collections[index];
            statusText.innerText = 'Mengunduh koleksi "' + colName + '"...';
            log('Memproses koleksi: "' + colName + '"...', 'info');

            db.collection(colName).get().then(function(snapshot) {
                var docsList = [];
                snapshot.forEach(function(doc) {
                    docsList.push({
                        id: doc.id,
                        data: doc.data()
                    });
                });

                backupResult.data[colName] = docsList;
                log('Sukses mengambil "' + colName + '". Jumlah dokumen: ' + docsList.length, 'success');
                
                updateProgress(index + 1);
            }).catch(function(err) {
                backupResult.data[colName] = {
                    error: err.message || 'Error fetching collection data'
                };
                log('Koleksi "' + colName + '" dilewati: ' + (err.code === 'permission-denied' ? 'Akses Ditolak (Hak Akses Tidak Cukup)' : err.message), 'warning');
                
                updateProgress(index + 1);
            });
        }

        function updateProgress(doneCount) {
            completedCount = doneCount;
            var pct = Math.round((completedCount / totalCollections) * 100);
            progressBar.style.width = pct + '%';
            percentageText.innerText = pct + '%';
            
            setTimeout(function() {
                processNextCollection(completedCount);
            }, 100);
        }

        processNextCollection(0);
    },

    connectPrinter: function() {
        var self = this;
        window.ThermalPrinter.connect()
            .then(function() {
                self.renderActiveForm();
            })
            .catch(function(err) {
                var msg = err.message || '';
                if (msg.includes('permissions policy') || msg.includes('disallowed') || msg.includes('SecurityError') || msg.includes('Attribute')) {
                    alert('Sistem keamanan browser memblokir akses Bluetooth di dalam bingkai (iframe) pratinjau AI Studio ini.\n\nSilakan klik tombol "Buka Aplikasi di Tab Baru" berwarna kuning yang ada di halaman ini, atau gunakan mode "Open in New Tab" di pojok kanan atas browser agar printer termal Bluetooth Anda dapat dideteksi dengan lancar.');
                } else {
                    Utils.toast('Gagal menyambungkan: ' + err.message, 'error');
                }
            });
    },

    disconnectPrinter: function() {
        window.ThermalPrinter.disconnect();
        this.renderActiveForm();
    },

    changePrinterPaperWidth: function(width) {
        window.ThermalPrinter.setPaperWidth(width);
        Utils.toast('Lebar kertas diatur ke ' + width, 'success');
    },

    changePrinterAutoPrint: function(auto) {
        window.ThermalPrinter.setAutoPrint(auto);
        Utils.toast('Cetak otomatis diatur ke ' + (auto ? 'Aktif' : 'Nonaktif'), 'success');
    },

    testPrint: function() {
        var self = this;
        window.ThermalPrinter.printTestPage(this.data)
            .then(function() {
                Utils.toast('Halaman uji coba berhasil dikirim ke printer!', 'success');
            })
            .catch(function(err) {
                Utils.toast('Gagal uji coba: ' + err.message, 'error');
            });
    }
};
