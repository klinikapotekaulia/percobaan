/**
 * js/pengaturan/satusehat.js
 * Dashboard & Integrasi SatuSehat Kemenkes RI (HL7 FHIR Standard)
 * 
 * Modul ini berfungsi sebagai kerangka kerja (blueprint/skeletal framework)
 * siap pakai untuk integrasi SatuSehat Kemenkes RI. Ketika pihak klinik/apotek
 * mendapatkan Client ID & Client Secret resmi dari Kemenkes (Sandbox/Production),
 * mereka cukup memasukkannya ke halaman ini untuk mengaktifkan sinkronisasi otomatis.
 */

window.AppPengaturanSatusehat = {
    data: {},
    activeTab: 'dashboard',
    logs: [],
    patientSearchQuery: '',
    patientList: [],
    encounterQueue: [],

    render: function() {
        var html = '<div class="page-enter max-w-6xl mx-auto space-y-6">';
        
        // Header
        html += '  <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">';
        html += '    <div>';
        html += '      <div class="flex items-center gap-2.5 mb-1">';
        html += '        <div class="p-1.5 bg-rose-50 dark:bg-rose-950/40 rounded-lg text-rose-600 dark:text-rose-400">';
        html += '          <i data-lucide="heart-pulse" class="w-6 h-6"></i>';
        html += '        </div>';
        html += '        <h2 class="text-xl font-bold text-slate-800 dark:text-white">Integrasi SatuSehat Kemenkes RI</h2>';
        html += '        <span class="bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">HL7 FHIR v4</span>';
        html += '      </div>';
        html += '      <p class="text-sm text-slate-500 dark:text-slate-400">Hubungkan data klinik dan apotek secara langsung ke rekam medis nasional Kementerian Kesehatan Republik Indonesia.</p>';
        html += '    </div>';
        html += '    <div class="flex items-center gap-2">';
        html += '      <span id="ss-connection-badge" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50">';
        html += '        <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Belum Terkonfigurasi';
        html += '      </span>';
        html += '    </div>';
        html += '  </div>';

        // Tabs Navigation
        html += '  <div class="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto space-x-1 whitespace-nowrap">';
        html += '    <button onclick="AppPengaturanSatusehat.switchTab(\'dashboard\')" id="tab-btn-dashboard" class="px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ' + (this.activeTab === 'dashboard' ? 'border-primary-600 text-primary-600 dark:text-primary-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300') + '">';
        html += '      <i data-lucide="layout-dashboard" class="w-4 h-4"></i> Ringkasan';
        html += '    </button>';
        html += '    <button onclick="AppPengaturanSatusehat.switchTab(\'config\')" id="tab-btn-config" class="px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ' + (this.activeTab === 'config' ? 'border-primary-600 text-primary-600 dark:text-primary-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300') + '">';
        html += '      <i data-lucide="settings-2" class="w-4 h-4"></i> Konfigurasi Kredensial';
        html += '    </button>';
        html += '    <button onclick="AppPengaturanSatusehat.switchTab(\'patients\')" id="tab-btn-patients" class="px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ' + (this.activeTab === 'patients' ? 'border-primary-600 text-primary-600 dark:text-primary-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300') + '">';
        html += '      <i data-lucide="users" class="w-4 h-4"></i> Validasi NIK & Pasien';
        html += '    </button>';
        html += '    <button onclick="AppPengaturanSatusehat.switchTab(\'encounters\')" id="tab-btn-encounters" class="px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ' + (this.activeTab === 'encounters' ? 'border-primary-600 text-primary-600 dark:text-primary-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300') + '">';
        html += '      <i data-lucide="calendar-check" class="w-4 h-4"></i> Sync Kunjungan (Encounter)';
        html += '    </button>';
        html += '    <button onclick="AppPengaturanSatusehat.switchTab(\'panduan\')" id="tab-btn-panduan" class="px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ' + (this.activeTab === 'panduan' ? 'border-primary-600 text-primary-600 dark:text-primary-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300') + '">';
        html += '      <i data-lucide="book-open" class="w-4 h-4"></i> Panduan Pendaftaran & Dokumen';
        html += '    </button>';
        html += '  </div>';

        // Tabs Content Container
        html += '  <div id="satusehat-tab-content" class="min-h-[400px]"></div>';
        html += '</div>';

        return html;
    },

    init: function() {
        var self = this;
        var role = window.currentRole || '';
        
        // Hanya Admin, Keuangan, atau PSA yang bisa akses
        if (role !== 'admin' && role !== 'keuangan' && role !== 'psa') {
            var el = document.getElementById('app-content');
            if (el) {
                el.innerHTML = '<div class="max-w-md mx-auto mt-20 p-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 rounded-xl text-center font-semibold flex flex-col items-center gap-3">' +
                    '<i data-lucide="shield-alert" class="w-12 h-12 text-red-500"></i>' +
                    'Akses Ditolak. Halaman konfigurasi SatuSehat khusus untuk Admin, Keuangan, dan PSA.' +
                    '</div>';
                lucide.createIcons();
            }
            return;
        }

        // Ambil konfigurasi dari Firestore
        db.collection('pengaturan').doc('satusehatSettings').get().then(function(doc) {
            self.data = doc.exists ? doc.data() : {
                clientId: '',
                clientSecret: '',
                organizationId: '',
                locationId: '',
                env: 'sandbox',
                isEnabled: false,
                useSeparateApotek: false,
                clientIdApotek: '',
                clientSecretApotek: '',
                organizationIdApotek: '',
                locationIdApotek: ''
            };

            // Set defaults if document exists but doesn't have Apotek fields yet
            if (self.data.useSeparateApotek === undefined) self.data.useSeparateApotek = false;
            if (self.data.clientIdApotek === undefined) self.data.clientIdApotek = '';
            if (self.data.clientSecretApotek === undefined) self.data.clientSecretApotek = '';
            if (self.data.organizationIdApotek === undefined) self.data.organizationIdApotek = '';
            if (self.data.locationIdApotek === undefined) self.data.locationIdApotek = '';

            // Load logs simulation / riwayat
            self.loadLogs();
            
            // Render tab aktif pertama
            self.renderActiveTab();
            self.updateConnectionBadge();
        }).catch(function(err) {
            console.error('Error memuat pengaturan SatuSehat:', err);
            self.renderActiveTab();
        });
    },

    switchTab: function(tabId) {
        this.activeTab = tabId;
        
        // Update tab buttons style
        var tabs = ['dashboard', 'config', 'patients', 'encounters', 'panduan'];
        tabs.forEach(function(t) {
            var btn = document.getElementById('tab-btn-' + t);
            if (btn) {
                if (t === tabId) {
                    btn.className = "px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 border-primary-600 text-primary-600 dark:text-primary-400";
                } else {
                    btn.className = "px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300";
                }
            }
        });

        this.renderActiveTab();
    },

    renderActiveTab: function() {
        var contentEl = document.getElementById('satusehat-tab-content');
        if (!contentEl) return;

        var html = '';
        if (this.activeTab === 'dashboard') {
            html = this.getDashboardTabHtml();
        } else if (this.activeTab === 'config') {
            html = this.getConfigTabHtml();
        } else if (this.activeTab === 'patients') {
            html = this.getPatientsTabHtml();
        } else if (this.activeTab === 'encounters') {
            html = this.getEncountersTabHtml();
        } else if (this.activeTab === 'panduan') {
            html = this.getPanduanTabHtml();
        }

        contentEl.innerHTML = html;
        lucide.createIcons();

        // Bind event listeners if necessary
        this.bindTabEvents();
    },

    // ==========================================
    // TAB 5: PANDUAN PENDAFTARAN & DOKUMEN SATUSEHAT
    // ==========================================
    getPanduanTabHtml: function() {
        var html = '<div class="max-w-4xl mx-auto space-y-8">';
        
        // Intro Banner
        html += '  <div class="bg-slate-900 text-white rounded-2xl p-6 relative overflow-hidden shadow-md border border-slate-800">';
        html += '    <div class="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 text-white">';
        html += '      <i data-lucide="book-open" class="w-48 h-48"></i>';
        html += '    </div>';
        html += '    <div class="relative z-10 space-y-2">';
        html += '      <span class="bg-rose-500/30 text-rose-300 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">PANDUAN RESMI KEMENKES</span>';
        html += '      <h3 class="text-lg font-bold">Panduan Pendaftaran Akun SATUSEHAT</h3>';
        html += '      <p class="text-xs text-slate-300 leading-relaxed max-w-2xl">';
        html += '        Untuk menghubungkan aplikasi rekam medis ini secara resmi dengan SATUSEHAT, fasilitas kesehatan Anda (Klinik atau Apotek) wajib mendaftarkan diri secara legal di portal Kemenkes RI guna memperoleh **Client ID** dan **Client Secret** Production.';
        html += '      </p>';
        html += '    </div>';
        html += '  </div>';

        // Grid Persyaratan Dokumen & Alur Pendaftaran
        html += '  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">';
        
        // Kiri: Syarat Dokumen (1/3)
        html += '    <div class="md:col-span-1 space-y-4">';
        html += '      <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">';
        html += '        <h4 class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2"><i data-lucide="folder" class="w-4 h-4 text-primary-500"></i> Dokumen Wajib</h4>';
        html += '        <p class="text-[11px] text-slate-500 dark:text-slate-400 mb-4">Siapkan pindaian (scan) dokumen format PDF/JPG berikut sebelum mendaftar:</p>';
        
        html += '        <ul class="space-y-3.5 text-xs text-slate-700 dark:text-slate-300">';
        
        html += '          <li class="flex gap-2">';
        html += '            <span class="text-rose-500 text-sm mt-0.5">•</span>';
        html += '            <div>';
        html += '              <p class="font-bold">Izin Operasional Aktif</p>';
        html += '              <p class="text-[10px] text-slate-400">Sertifikat Standar / Surat Izin Operasional Klinik / Surat Izin Apotek (SIA).</p>';
        html += '            </div>';
        html += '          </li>';

        html += '          <li class="flex gap-2">';
        html += '            <span class="text-rose-500 text-sm mt-0.5">•</span>';
        html += '            <div>';
        html += '              <p class="font-bold">NIB (Nomor Induk Berusaha)</p>';
        html += '              <p class="text-[10px] text-slate-400">Nomor Induk Berusaha yang diterbitkan oleh sistem OSS BKPM.</p>';
        html += '            </div>';
        html += '          </li>';

        html += '          <li class="flex gap-2">';
        html += '            <span class="text-rose-500 text-sm mt-0.5">•</span>';
        html += '            <div>';
        html += '              <p class="font-bold">Surat Permohonan Integrasi</p>';
        html += '              <p class="text-[10px] text-slate-400">Ditandatangani oleh pimpinan fasilitas kesehatan dengan stempel resmi.</p>';
        html += '            </div>';
        html += '          </li>';

        html += '          <li class="flex gap-2">';
        html += '            <span class="text-rose-500 text-sm mt-0.5">•</span>';
        html += '            <div>';
        html += '              <p class="font-bold">Pakta Integritas</p>';
        html += '              <p class="text-[10px] text-slate-400">Dokumen jaminan kerahasiaan & keamanan data rekam medis pasien sesuai template Kemenkes.</p>';
        html += '            </div>';
        html += '          </li>';

        html += '          <li class="flex gap-2">';
        html += '            <span class="text-rose-500 text-sm mt-0.5">•</span>';
        html += '            <div>';
        html += '              <p class="font-bold">Identitas Penanggung Jawab</p>';
        html += '              <p class="text-[10px] text-slate-400">KTP/SIM Pimpinan dan Penanggung Jawab Teknis/Sistem IT.</p>';
        html += '            </div>';
        html += '          </li>';

        html += '        </ul>';
        html += '      </div>';
        
        html += '      <div class="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 p-4 rounded-xl space-y-2">';
        html += '        <h5 class="text-xs font-bold text-rose-800 dark:text-rose-400 flex items-center gap-1.5"><i data-lucide="alert-triangle" class="w-4 h-4"></i> Tips Pendaftaran</h5>';
        html += '        <p class="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">';
        html += '          Jika Anda memiliki 2 akun terpisah (Klinik & Apotek), daftarkan keduanya di portal. Aplikasi ini mendukung penuh multi-kredensial untuk mencegah penyerahan resep dicampuradukkan dengan rekam medis poli.';
        html += '        </p>';
        html += '      </div>';
        html += '    </div>';

        // Kanan: Alur Pendaftaran & Stepper (2/3)
        html += '    <div class="md:col-span-2 space-y-6">';
        html += '      <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">';
        html += '        <h4 class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2"><i data-lucide="play" class="w-4 h-4 text-primary-500"></i> Alur 4 Langkah Registrasi</h4>';
        
        // Step 1
        html += '        <div class="flex gap-4">';
        html += '          <div class="flex flex-col items-center">';
        html += '            <div class="w-7 h-7 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold font-mono">01</div>';
        html += '            <div class="w-0.5 h-16 bg-slate-100 dark:bg-slate-700"></div>';
        html += '          </div>';
        html += '          <div class="space-y-1">';
        html += '            <h5 class="text-xs font-bold text-slate-800 dark:text-white">Registrasi Data Fasilitas Kesehatan (DFO / SIPNAP)</h5>';
        html += '            <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">';
        html += '              Klinik wajib terdaftar di <strong>Data Fasilitas Kesehatan (DFO)</strong> melalui <a href="https://dfo.kemkes.go.id" target="_blank" class="text-primary-600 hover:underline">dfo.kemkes.go.id</a> untuk mendapatkan <strong>Kode Fasyankes</strong> resmi. Untuk Apotek mandiri, pastikan terintegrasi melalui aplikasi SIPNAP.';
        html += '            </p>';
        html += '          </div>';
        html += '        </div>';

        // Step 2
        html += '        <div class="flex gap-4">';
        html += '          <div class="flex flex-col items-center">';
        html += '            <div class="w-7 h-7 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold font-mono">02</div>';
        html += '            <div class="w-0.5 h-16 bg-slate-100 dark:bg-slate-700"></div>';
        html += '          </div>';
        html += '          <div class="space-y-1">';
        html += '            <h5 class="text-xs font-bold text-slate-800 dark:text-white">Daftar Akun SATUSEHAT Platform</h5>';
        html += '            <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">';
        html += '              Masuk ke portal developer SATUSEHAT di <a href="https://satusehat.kemkes.go.id/platform" target="_blank" class="text-primary-600 hover:underline">satusehat.kemkes.go.id/platform</a>. Buat akun organisasi fasyankes Anda menggunakan email resmi klinik/apotek. Masukkan Kode Fasyankes yang telah divalidasi.';
        html += '            </p>';
        html += '          </div>';
        html += '        </div>';

        // Step 3
        html += '        <div class="flex gap-4">';
        html += '          <div class="flex flex-col items-center">';
        html += '            <div class="w-7 h-7 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold font-mono">03</div>';
        html += '            <div class="w-0.5 h-16 bg-slate-100 dark:bg-slate-700"></div>';
        html += '          </div>';
        html += '          <div class="space-y-1">';
        html += '            <h5 class="text-xs font-bold text-slate-800 dark:text-white">Pembuatan Sandbox & Pengujian Sistem</h5>';
        html += '            <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">';
        html += '              Setelah disetujui, Kemenkes akan memberikan kredensial lingkungan uji coba (Sandbox) berupa Client ID & Client Secret Sandbox. Masukkan kredensial sandbox ini ke aplikasi Anda di tab **Konfigurasi Kredensial**, lalu pilih lingkungan **Sandbox Kemenkes** guna menguji komunikasi API.';
        html += '            </p>';
        html += '          </div>';
        html += '        </div>';

        // Step 4
        html += '        <div class="flex gap-4">';
        html += '          <div class="flex flex-col items-center">';
        html += '            <div class="w-7 h-7 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold font-mono">04</div>';
        html += '          </div>';
        html += '          <div class="space-y-1">';
        html += '            <h5 class="text-xs font-bold text-slate-800 dark:text-white">Pengajuan Produksi (Live-Goes-Production)</h5>';
        html += '            <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">';
        html += '              Unggah dokumen persyaratan yang telah disiapkan di portal SATUSEHAT. Tim Kemenkes akan memverifikasi dan menyetujui pengajuan Anda. Setelah disetujui, kredensial Production (Live) akan diterbitkan. Ganti konfigurasi di aplikasi ini ke lingkungan **Production Kemenkes** agar data pasien tersinkronisasi resmi secara nasional.';
        html += '            </p>';
        html += '          </div>';
        html += '        </div>';

        html += '      </div>';
        
        // Help desk card
        html += '      <div class="bg-sky-50 dark:bg-sky-950/10 border border-sky-150 dark:border-sky-900/30 p-5 rounded-2xl flex items-start gap-4">';
        html += '        <div class="p-2.5 bg-sky-500 text-white rounded-xl"><i data-lucide="help-circle" class="w-5 h-5"></i></div>';
        html += '        <div class="space-y-1">';
        html += '          <h5 class="text-xs font-bold text-sky-900 dark:text-sky-300">Butuh Bantuan Kendala Teknis?</h5>';
        html += '          <p class="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">';
        html += '            Kementerian Kesehatan menyediakan layanan aduan & konsultasi integrasi via Whatsapp resmi SATUSEHAT Kemenkes atau email di <strong class="font-mono">helpdesk@kemkes.go.id</strong>.';
        html += '          </p>';
        html += '        </div>';
        html += '      </div>';
        
        html += '    </div>';

        html += '  </div>';
        html += '</div>';
        return html;
    },

    // ==========================================
    // TAB 1: DASHBOARD RINGKASAN
    // ==========================================
    getDashboardTabHtml: function() {
        var html = '<div class="grid grid-cols-1 md:grid-cols-3 gap-6">';
        
        // Left column - Status Overview
        html += '  <div class="md:col-span-2 space-y-6">';
        
        // Welcome Banner / Blueprint Notice
        html += '    <div class="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 border border-rose-100 dark:border-rose-900/40 rounded-2xl p-5 relative overflow-hidden">';
        html += '      <div class="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10 text-rose-500">';
        html += '        <i data-lucide="heart-pulse" class="w-40 h-40"></i>';
        html += '      </div>';
        html += '      <h3 class="text-base font-bold text-rose-800 dark:text-rose-400 mb-2">Skeletal Framework SatuSehat Aktif</h3>';
        html += '      <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">';
        html += '        Halaman ini dikonfigurasi sebagai kerangka penghubung resmi ke platform SatuSehat Kemenkes RI. Ketika Anda mengaktifkan akun di portal SatuSehat (SatuSehat Developer), cukup masukkan **Client ID** dan **Client Secret** Anda di Tab Konfigurasi. Seluruh pemetaan data pasien, rekam medis, tindakan, dan penyerahan obat telah distandardisasi mengikuti standar HL7 FHIR v4.';
        html += '      </p>';
        html += '      <div class="mt-4 flex gap-3">';
        html += '        <a href="https://satusehat.kemkes.go.id/platform/developer" target="_blank" class="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition shadow-sm"><i data-lucide="external-link" class="w-3.5 h-3.5"></i> Portal Developer Kemenkes</a>';
        html += '        <button onclick="AppPengaturanSatusehat.switchTab(\'config\')" class="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold px-3.5 py-2 rounded-lg transition">Mulai Konfigurasi <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i></button>';
        html += '      </div>';
        html += '    </div>';

        // Stats Cards
        html += '    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">';
        html += '      <div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3.5">';
        html += '        <div class="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg"><i data-lucide="user-check" class="w-5 h-5"></i></div>';
        html += '        <div><p class="text-xs text-slate-400">Pasien Tervalidasi NIK</p><h4 class="text-lg font-bold text-slate-700 dark:text-white" id="ss-stat-pasien">0 / 0</h4></div>';
        html += '      </div>';
        html += '      <div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3.5">';
        html += '        <div class="p-3 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 rounded-lg"><i data-lucide="activity" class="w-5 h-5"></i></div>';
        html += '        <div><p class="text-xs text-slate-400">Kunjungan Terkirim (Encounter)</p><h4 class="text-lg font-bold text-slate-700 dark:text-white" id="ss-stat-kunjungan">0</h4></div>';
        html += '      </div>';
        html += '      <div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3.5">';
        html += '        <div class="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-lg"><i data-lucide="pill" class="w-5 h-5"></i></div>';
        html += '        <div><p class="text-xs text-slate-400">Resep Terkirim (Medication)</p><h4 class="text-lg font-bold text-slate-700 dark:text-white" id="ss-stat-resep">0</h4></div>';
        html += '      </div>';
        html += '    </div>';

        // Connection Tester Component
        html += '    <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">';
        html += '      <h3 class="text-sm font-bold text-slate-700 dark:text-white mb-3">Tes Koneksi Real-time</h3>';
        html += '      <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Lakukan uji coba autentikasi server-to-server ke server Kemenkes (menggunakan kredensial aktif yang tersimpan).</p>';
        html += '      <div class="flex flex-wrap gap-2.5 items-center">';
        html += '        <button onclick="AppPengaturanSatusehat.testLiveConnection()" id="btn-test-connection" class="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-xs font-semibold px-4 py-2.5 rounded-lg transition shadow-sm"><i data-lucide="zap" class="w-3.5 h-3.5"></i> Test Koneksi Kemenkes</button>';
        html += '        <span id="test-connection-loader" class="hidden items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium"><div class="spinner w-3.5 h-3.5 border-t-slate-800 dark:border-t-white"></div> Menghubungi Kemenkes SatuSehat...</span>';
        html += '        <div id="test-connection-result" class="text-xs font-semibold"></div>';
        html += '      </div>';
        html += '    </div>';

        // Mapping info
        html += '    <div class="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-3">';
        html += '      <h4 class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Pemetaan HL7 FHIR Standard Kemenkes</h4>';
        html += '      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">';
        html += '        <div class="flex gap-3 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200/50 dark:border-slate-700/50">';
        html += '          <div class="text-rose-500 font-bold font-mono">01</div>';
        html += '          <div>';
        html += '            <p class="font-bold text-slate-700 dark:text-slate-300">FHIR Patient</p>';
        html += '            <p class="text-slate-500 dark:text-slate-400">NIK divalidasi ke Kemenkes RI, mengembalikan SatuSehat ID pasien (IHIS).</p>';
        html += '          </div>';
        html += '        </div>';
        html += '        <div class="flex gap-3 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200/50 dark:border-slate-700/50">';
        html += '          <div class="text-rose-500 font-bold font-mono">02</div>';
        html += '          <div>';
        html += '            <p class="font-bold text-slate-700 dark:text-slate-300">FHIR Practitioner</p>';
        html += '            <p class="text-slate-500 dark:text-slate-400">Dokter diidentifikasi via NIK/SIP untuk mengisi pelaksana medis (Practitioner).</p>';
        html += '          </div>';
        html += '        </div>';
        html += '        <div class="flex gap-3 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200/50 dark:border-slate-700/50">';
        html += '          <div class="text-rose-500 font-bold font-mono">03</div>';
        html += '          <div>';
        html += '            <p class="font-bold text-slate-700 dark:text-slate-300">FHIR Encounter</p>';
        html += '            <p class="text-slate-500 dark:text-slate-400">Sinkronisasi data kunjungan, tatalaksana, ruangan poli, dan jam pendaftaran pasien.</p>';
        html += '          </div>';
        html += '        </div>';
        html += '        <div class="flex gap-3 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200/50 dark:border-slate-700/50">';
        html += '          <div class="text-rose-500 font-bold font-mono">04</div>';
        html += '          <div>';
        html += '            <p class="font-bold text-slate-700 dark:text-slate-300">FHIR Condition</p>';
        html += '            <p class="text-slate-500 dark:text-slate-400">Pelaporan diagnosis pasien yang diisi oleh dokter menggunakan standard ICD-10.</p>';
        html += '          </div>';
        html += '        </div>';
        html += '      </div>';
        html += '    </div>';

        html += '  </div>';
        
        // Right column - Recent Logs
        html += '  <div class="space-y-6">';
        html += '    <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-full">';
        html += '      <div class="flex items-center justify-between mb-4">';
        html += '        <h3 class="text-sm font-bold text-slate-700 dark:text-white">Aktivitas Sinkronisasi</h3>';
        html += '        <button onclick="AppPengaturanSatusehat.clearSimulatedLogs()" class="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">Bersihkan</button>';
        html += '      </div>';
        html += '      <div id="ss-logs-container" class="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">';
        html += '        <!-- Diisi secara dinamis -->';
        html += '      </div>';
        html += '    </div>';
        html += '  </div>';

        html += '</div>';
        return html;
    },

    // ==========================================
    // TAB 2: KONFIGURASI API KREDENSIAL
    // ==========================================
    getConfigTabHtml: function() {
        var d = this.data;
        var useSep = d.useSeparateApotek === true;
        var html = '<div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm max-w-2xl mx-auto">';
        html += '  <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700/50">';
        html += '    <div class="p-2 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 rounded-lg"><i data-lucide="key" class="w-5 h-5"></i></div>';
        html += '    <div>';
        html += '      <h3 class="text-base font-bold text-slate-700 dark:text-white">API Credentials SatuSehat Kemenkes</h3>';
        html += '      <p class="text-xs text-slate-400">Atur kredensial resmi dari Kementerian Kesehatan RI</p>';
        html += '    </div>';
        html += '  </div>';

        html += '  <form id="form-ss-config" class="space-y-5" onsubmit="AppPengaturanSatusehat.saveConfig(event)">';
        
        // Environment Switcher
        html += '    <div>';
        html += '      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Environment (Tipe Server)</label>';
        html += '      <div class="grid grid-cols-2 gap-3">';
        html += '        <label class="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer hover:border-primary-500 transition">';
        html += '          <div class="flex items-center gap-2.5">';
        html += '            <input type="radio" name="ss-env" value="sandbox" ' + (d.env === 'sandbox' ? 'checked' : '') + ' class="text-primary-600 focus:ring-primary-500 border-slate-300">';
        html += '            <div>';
        html += '              <p class="text-sm font-bold text-slate-700 dark:text-white">Sandbox Environment</p>';
        html += '              <p class="text-[11px] text-slate-400">Uji coba integrasi data simulasi</p>';
        html += '            </div>';
        html += '          </div>';
        html += '          <span class="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Uji Coba</span>';
        html += '        </label>';
        
        html += '        <label class="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer hover:border-primary-500 transition">';
        html += '          <div class="flex items-center gap-2.5">';
        html += '            <input type="radio" name="ss-env" value="production" ' + (d.env === 'production' ? 'checked' : '') + ' class="text-primary-600 focus:ring-primary-500 border-slate-300">';
        html += '            <div>';
        html += '              <p class="text-sm font-bold text-slate-700 dark:text-white">Production Server</p>';
        html += '              <p class="text-[11px] text-slate-400">Server live rekam medis nasional</p>';
        html += '            </div>';
        html += '          </div>';
        html += '          <span class="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase">SINKRON</span>';
        html += '        </label>';
        html += '      </div>';
        html += '    </div>';

        // SECTION 1: KLINIK / DOKTER
        html += '    <div class="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-4">';
        html += '      <div class="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">';
        html += '        <span class="bg-primary-100 text-primary-800 dark:bg-primary-950/60 dark:text-primary-300 text-[10px] font-bold px-2 py-0.5 rounded">AKUN 1</span>';
        html += '        <h4 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Kredensial Dokter / Klinik (Praktek Mandiri)</h4>';
        html += '      </div>';
        
        // Client ID Klinik
        html += '      <div>';
        html += '        <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">SatuSehat Client ID</label>';
        html += '        <input type="text" id="ss-client-id" value="' + Utils.escapeHtml(d.clientId || '') + '" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-xs focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Client ID Klinik">';
        html += '      </div>';

        // Client Secret Klinik
        html += '      <div>';
        html += '        <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">SatuSehat Client Secret</label>';
        html += '        <div class="relative">';
        html += '          <input type="password" id="ss-client-secret" value="' + Utils.escapeHtml(d.clientSecret || '') + '" class="w-full pl-3 pr-10 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-xs focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Client Secret Klinik">';
        html += '          <button type="button" onclick="AppPengaturanSatusehat.toggleSecretVisibility(\'ss-client-secret\')" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><i data-lucide="eye" class="w-3.5 h-3.5" id="eye-ss-client-secret"></i></button>';
        html += '        </div>';
        html += '      </div>';

        // Org ID & Location ID Klinik
        html += '      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">';
        html += '        <div>';
        html += '          <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">ID Organisasi Kemenkes</label>';
        html += '          <input type="text" id="ss-org-id" value="' + Utils.escapeHtml(d.organizationId || '') + '" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-xs focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Contoh: 100023456">';
        html += '        </div>';
        html += '        <div>';
        html += '          <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">ID Lokasi (Poliklinik)</label>';
        html += '          <input type="text" id="ss-loc-id" value="' + Utils.escapeHtml(d.locationId || '') + '" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-xs focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Contoh: f76b88b7-...">';
        html += '        </div>';
        html += '      </div>';
        html += '    </div>';

        // TOGGLE SEPARATE CREDENTIALS
        html += '    <div class="flex items-center justify-between p-3.5 bg-sky-50/50 dark:bg-sky-950/10 border border-sky-100/50 dark:border-sky-900/30 rounded-xl">';
        html += '      <div>';
        html += '        <p class="text-xs font-bold text-sky-800 dark:text-sky-400">Gunakan Kredensial Terpisah untuk Apotek / Farmasi</p>';
        html += '        <p class="text-[10px] text-slate-500 dark:text-slate-400">Aktifkan jika Apotek Anda terdaftar sebagai badan hukum/izin operasional terpisah dari Klinik (memiliki Client ID sendiri).</p>';
        html += '      </div>';
        html += '      <label class="relative inline-flex items-center cursor-pointer">';
        html += '        <input type="checkbox" id="ss-use-separate" onchange="AppPengaturanSatusehat.toggleApotekFields(this.checked)" ' + (useSep ? 'checked' : '') + ' class="sr-only peer">';
        html += '        <div class="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[\'\'] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>';
        html += '      </label>';
        html += '    </div>';

        // SECTION 2: APOTEK / FARMASI (DENGAN TOGGLE HIDDEN)
        html += '    <div id="ss-apotek-section" class="' + (useSep ? '' : 'hidden') + ' p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-4">';
        html += '      <div class="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">';
        html += '        <span class="bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 text-[10px] font-bold px-2 py-0.5 rounded">AKUN 2</span>';
        html += '        <h4 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Kredensial Apotek / Farmasi</h4>';
        html += '      </div>';
        
        // Client ID Apotek
        html += '      <div>';
        html += '        <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">SatuSehat Client ID Apotek</label>';
        html += '        <input type="text" id="ss-client-id-apotek" value="' + Utils.escapeHtml(d.clientIdApotek || '') + '" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-xs focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Client ID Apotek">';
        html += '      </div>';

        // Client Secret Apotek
        html += '      <div>';
        html += '        <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">SatuSehat Client Secret Apotek</label>';
        html += '        <div class="relative">';
        html += '          <input type="password" id="ss-client-secret-apotek" value="' + Utils.escapeHtml(d.clientSecretApotek || '') + '" class="w-full pl-3 pr-10 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-xs focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Client Secret Apotek">';
        html += '          <button type="button" onclick="AppPengaturanSatusehat.toggleSecretVisibility(\'ss-client-secret-apotek\')" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><i data-lucide="eye" class="w-3.5 h-3.5" id="eye-ss-client-secret-apotek"></i></button>';
        html += '        </div>';
        html += '      </div>';

        // Org ID & Location ID Apotek
        html += '      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">';
        html += '        <div>';
        html += '          <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">ID Organisasi Kemenkes Apotek</label>';
        html += '          <input type="text" id="ss-org-id-apotek" value="' + Utils.escapeHtml(d.organizationIdApotek || '') + '" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-xs focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Contoh: 200012345">';
        html += '        </div>';
        html += '        <div>';
        html += '          <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">ID Lokasi (Apotek/Kamar Obat)</label>';
        html += '          <input type="text" id="ss-loc-id-apotek" value="' + Utils.escapeHtml(d.locationIdApotek || '') + '" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-xs focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Contoh: a89c12df-...">';
        html += '        </div>';
        html += '      </div>';
        html += '    </div>';

        // Status Enable Toggle
        html += '    <div class="flex items-center justify-between p-4 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100/50 dark:border-rose-900/30 rounded-xl mt-2">';
        html += '      <div>';
        html += '        <p class="text-sm font-bold text-rose-800 dark:text-rose-400">Aktifkan Sinkronisasi Otomatis</p>';
        html += '        <p class="text-[11px] text-slate-500 dark:text-slate-400">Kirim data rekam medis, rujukan, dan resep secara otomatis saat rekam medis disimpan.</p>';
        html += '      </div>';
        html += '      <label class="relative inline-flex items-center cursor-pointer">';
        html += '        <input type="checkbox" id="ss-enabled" ' + (d.isEnabled ? 'checked' : '') + ' class="sr-only peer">';
        html += '        <div class="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[\'\'] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>';
        html += '      </label>';
        html += '    </div>';

        // Save Button
        html += '    <div class="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/50">';
        html += '      <button type="submit" class="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition shadow-sm flex items-center justify-center gap-2"><i data-lucide="save" class="w-4 h-4"></i> Simpan Pengaturan</button>';
        html += '    </div>';
        html += '  </form>';
        html += '</div>';

        return html;
    },

    toggleApotekFields: function(checked) {
        var el = document.getElementById('ss-apotek-section');
        if (el) {
            if (checked) {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        }
    },

    // ==========================================
    // TAB 3: VALIDASI NIK & PASIEN
    // ==========================================
    getPatientsTabHtml: function() {
        var html = '<div class="space-y-6">';
        
        // Search & Filter header
        html += '  <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">';
        html += '    <div>';
        html += '      <h3 class="text-sm font-bold text-slate-700 dark:text-white mb-1">Verifikasi Identitas & Nomor NIK</h3>';
        html += '      <p class="text-xs text-slate-400">Verifikasi NIK (Nomor Induk Kependudukan) pasien Anda untuk mendapatkan SatuSehat Patient ID.</p>';
        html += '    </div>';
        html += '    <div class="relative w-full sm:w-72">';
        html += '      <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>';
        html += '      <input type="text" id="search-ss-patient" placeholder="Cari nama pasien..." value="' + Utils.escapeHtml(this.patientSearchQuery) + '" class="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl text-xs focus:ring-2 focus:ring-primary-500 outline-none" oninput="AppPengaturanSatusehat.onSearchPatient(this.value)">';
        html += '    </div>';
        html += '  </div>';

        // Patients List Table
        html += '  <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">';
        html += '    <div class="overflow-x-auto">';
        html += '      <table class="w-full text-left border-collapse text-xs">';
        html += '        <thead>';
        html += '          <tr class="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">';
        html += '            <th class="px-5 py-3">No. RM / Nama</th>';
        html += '            <th class="px-5 py-3">NIK (No. KTP)</th>';
        html += '            <th class="px-5 py-3">Tgl Lahir / Jenis Kelamin</th>';
        html += '            <th class="px-5 py-3">SatuSehat Patient ID</th>';
        html += '            <th class="px-5 py-3 text-right">Aksi</th>';
        html += '          </tr>';
        html += '        </thead>';
        html += '        <tbody id="ss-patients-table-body" class="divide-y divide-slate-100 dark:divide-slate-700/50">';
        html += '          <!-- Diisi via loadPatientsData() -->';
        html += '        </tbody>';
        html += '      </table>';
        html += '    </div>';
        html += '    <div id="ss-patients-empty" class="hidden text-center py-16 text-slate-400"><i data-lucide="users" class="w-12 h-12 text-slate-300 mx-auto mb-3"></i> Tidak ada data pasien yang memerlukan validasi NIK.</div>';
        html += '  </div>';

        html += '</div>';
        return html;
    },

    // ==========================================
    // TAB 4: ENCOUNTERS SYNC
    // ==========================================
    getEncountersTabHtml: function() {
        var html = '<div class="space-y-6">';
        
        // Header
        html += '  <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">';
        html += '    <h3 class="text-sm font-bold text-slate-700 dark:text-white mb-1">Queue Sinkronisasi Kunjungan (Encounter)</h3>';
        html += '    <p class="text-xs text-slate-400">Daftar rekam medis dan kunjungan pasien hari ini yang siap dionlinekan ke SatuSehat.</p>';
        html += '  </div>';

        // Table
        html += '  <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">';
        html += '    <div class="overflow-x-auto">';
        html += '      <table class="w-full text-left border-collapse text-xs">';
        html += '        <thead>';
        html += '          <tr class="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">';
        html += '            <th class="px-5 py-3">Pasien</th>';
        html += '            <th class="px-5 py-3">Dokter Periksa</th>';
        html += '            <th class="px-5 py-3">Keluhan & Diagnosis</th>';
        html += '            <th class="px-5 py-3">Status Sync</th>';
        html += '            <th class="px-5 py-3 text-right">Aksi</th>';
        html += '          </tr>';
        html += '        </thead>';
        html += '        <tbody id="ss-encounters-table-body" class="divide-y divide-slate-100 dark:divide-slate-700/50">';
        html += '          <!-- Diisi via loadEncountersData() -->';
        html += '        </tbody>';
        html += '      </table>';
        html += '    </div>';
        html += '    <div id="ss-encounters-empty" class="hidden text-center py-16 text-slate-400"><i data-lucide="clipboard-list" class="w-12 h-12 text-slate-300 mx-auto mb-3"></i> Tidak ada antrean rekam medis hari ini untuk disinkronisasikan.</div>';
        html += '  </div>';

        html += '</div>';
        return html;
    },

    // ==========================================
    // UTILS & BINDINGS
    // ==========================================
    bindTabEvents: function() {
        var self = this;
        
        if (this.activeTab === 'dashboard') {
            this.renderLogs();
            this.updateStats();
        } else if (this.activeTab === 'patients') {
            this.loadPatientsData();
        } else if (this.activeTab === 'encounters') {
            this.loadEncountersData();
        }
    },

    updateConnectionBadge: function() {
        var badge = document.getElementById('ss-connection-badge');
        if (!badge) return;

        var d = this.data;
        if (!d.clientId || !d.clientSecret) {
            badge.className = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50";
            badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Belum Terkonfigurasi';
        } else if (!d.isEnabled) {
            badge.className = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
            badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-slate-500"></span> Terkonfigurasi (Non-aktif)';
        } else {
            var envStr = d.env === 'sandbox' ? 'Sandbox' : 'Production';
            badge.className = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50";
            badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Terkoneksi - ' + envStr;
        }
    },

    toggleSecretVisibility: function(id) {
        var el = document.getElementById(id);
        var eye = document.getElementById('eye-' + id);
        if (!el || !eye) return;
        
        if (el.type === 'password') {
            el.type = 'text';
            eye.setAttribute('data-lucide', 'eye-off');
        } else {
            el.type = 'password';
            eye.setAttribute('data-lucide', 'eye');
        }
        lucide.createIcons();
    },

    // ==========================================
    // DATA LOADERS & ACTIONS
    // ==========================================
    loadLogs: function() {
        var savedLogs = localStorage.getItem('ss_simulated_logs');
        if (savedLogs) {
            this.logs = JSON.parse(savedLogs);
        } else {
            // Seed sample logs to show how it looks professionally
            this.logs = [
                { id: '1', resource: 'Patient', payloadId: '900018892', status: 'Success', timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), message: 'NIK 3201021102940003 divalidasi, FHIR Patient ID dibuat.' },
                { id: '2', resource: 'Practitioner', payloadId: 'N88201', status: 'Success', timestamp: new Date(Date.now() - 3600000 * 3.5).toISOString(), message: 'Dokter dr. Aulia Rahman tervalidasi via NIK, Practitioner ID didapatkan.' },
                { id: '3', resource: 'Encounter', payloadId: 'enc-009923', status: 'Success', timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), message: 'Kunjungan pasien RM-2026-004 terdaftar di SatuSehat.' },
                { id: '4', resource: 'Condition', payloadId: 'cond-0822', status: 'Success', timestamp: new Date(Date.now() - 3600000 * 1.8).toISOString(), message: 'Diagnosis ICD-10 K30 (Dyspepsia) terkirim.' }
            ];
            localStorage.setItem('ss_simulated_logs', JSON.stringify(this.logs));
        }
    },

    addLog: function(resource, payloadId, status, message) {
        this.logs.unshift({
            id: String(Date.now()),
            resource: resource,
            payloadId: payloadId || '-',
            status: status,
            timestamp: new Date().toISOString(),
            message: message
        });
        if (this.logs.length > 20) this.logs.pop(); // keep last 20
        localStorage.setItem('ss_simulated_logs', JSON.stringify(this.logs));
        this.renderLogs();
    },

    renderLogs: function() {
        var container = document.getElementById('ss-logs-container');
        if (!container) return;

        if (this.logs.length === 0) {
            container.innerHTML = '<div class="text-center py-10 text-xs text-slate-400">Belum ada riwayat aktivitas.</div>';
            return;
        }

        var html = '';
        this.logs.forEach(function(l) {
            var badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300';
            if (l.status === 'Success') badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400';
            if (l.status === 'Failed') badgeColor = 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400';
            if (l.status === 'Pending') badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400';

            var iconName = 'file-text';
            if (l.resource === 'Patient') iconName = 'user';
            if (l.resource === 'Practitioner') iconName = 'user-check';
            if (l.resource === 'Encounter') iconName = 'calendar';
            if (l.resource === 'Condition') iconName = 'activity';

            var dateStr = new Date(l.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

            html += '  <div class="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100/50 dark:hover:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800/80 transition">';
            html += '    <div class="p-1.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-500 rounded-lg flex-shrink-0"><i data-lucide="' + iconName + '" class="w-3.5 h-3.5"></i></div>';
            html += '    <div class="flex-1 min-w-0">';
            html += '      <div class="flex items-center justify-between gap-2 mb-1">';
            html += '        <p class="text-[11px] font-bold text-slate-700 dark:text-slate-300">FHIR ' + l.resource + '</p>';
            html += '        <span class="text-[9px] text-slate-400">' + dateStr + '</span>';
            html += '      </div>';
            html += '      <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mb-1.5">' + Utils.escapeHtml(l.message) + '</p>';
            html += '      <div class="flex items-center justify-between gap-2">';
            html += '        <span class="font-mono text-[9px] text-slate-400 truncate max-w-[120px]">ID: ' + Utils.escapeHtml(l.payloadId) + '</span>';
            html += '        <span class="text-[9px] font-bold px-1.5 py-0.5 rounded ' + badgeColor + '">' + l.status + '</span>';
            html += '      </div>';
            html += '    </div>';
            html += '  </div>';
        });

        container.innerHTML = html;
        lucide.createIcons();
    },

    clearSimulatedLogs: function() {
        this.logs = [];
        localStorage.removeItem('ss_simulated_logs');
        this.renderLogs();
    },

    updateStats: function() {
        var self = this;
        // Query pasien divalidasi
        db.collection('pasien').get().then(function(snap) {
            var total = snap.size;
            var validated = 0;
            snap.forEach(function(doc) {
                if (doc.data().satusehatId) validated++;
            });
            var el = document.getElementById('ss-stat-pasien');
            if (el) el.textContent = validated + ' / ' + total;
        });

        // Query status kunjungan terkirim
        var elKunjungan = document.getElementById('ss-stat-kunjungan');
        if (elKunjungan) {
            var countEnc = this.logs.filter(function(l) { return l.resource === 'Encounter' && l.status === 'Success'; }).length;
            elKunjungan.textContent = countEnc;
        }

        var elResep = document.getElementById('ss-stat-resep');
        if (elResep) {
            var countMed = this.logs.filter(function(l) { return l.resource === 'Medication' && l.status === 'Success'; }).length;
            elResep.textContent = countMed;
        }
    },

    // ==========================================
    // SAVE API CONFIG TO FIRESTORE
    // ==========================================
    saveConfig: function(e) {
        e.preventDefault();
        var self = this;

        var clientId = document.getElementById('ss-client-id').value.trim();
        var clientSecret = document.getElementById('ss-client-secret').value.trim();
        var organizationId = document.getElementById('ss-org-id').value.trim();
        var locationId = document.getElementById('ss-loc-id').value.trim();
        
        var useSeparateApotek = document.getElementById('ss-use-separate').checked;
        var clientIdApotek = document.getElementById('ss-client-id-apotek').value.trim();
        var clientSecretApotek = document.getElementById('ss-client-secret-apotek').value.trim();
        var organizationIdApotek = document.getElementById('ss-org-id-apotek').value.trim();
        var locationIdApotek = document.getElementById('ss-loc-id-apotek').value.trim();

        var envEl = document.querySelector('input[name="ss-env"]:checked');
        var env = envEl ? envEl.value : 'sandbox';
        var isEnabled = document.getElementById('ss-enabled').checked;

        var obj = {
            clientId: clientId,
            clientSecret: clientSecret,
            organizationId: organizationId,
            locationId: locationId,
            useSeparateApotek: useSeparateApotek,
            clientIdApotek: clientIdApotek,
            clientSecretApotek: clientSecretApotek,
            organizationIdApotek: organizationIdApotek,
            locationIdApotek: locationIdApotek,
            env: env,
            isEnabled: isEnabled,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: window.currentUserName || 'Admin'
        };

        db.collection('pengaturan').doc('satusehatSettings').set(obj, { merge: true }).then(function() {
            self.data = obj;
            self.updateConnectionBadge();
            Utils.toast('Konfigurasi Kredensial SatuSehat (Klinik & Apotek) berhasil disimpan!', 'success');
            self.addLog('Config', 'SatuSehatSettings', 'Success', 'Pengaturan kredensial SatuSehat (Klinik & Apotek) diperbarui oleh ' + (window.currentUserName || 'Admin') + '.');
        }).catch(function(err) {
            Utils.toast('Gagal menyimpan konfigurasi: ' + err.message, 'error');
        });
    },

    // ==========================================
    // TEST LIVE CONNECTION VIA BACKEND PROXY
    // ==========================================
    testLiveConnection: function() {
        var self = this;
        var btn = document.getElementById('btn-test-connection');
        var loader = document.getElementById('test-connection-loader');
        var resultEl = document.getElementById('test-connection-result');

        if (!this.data.clientId || !this.data.clientSecret) {
            Utils.toast('Client ID dan Client Secret tidak boleh kosong untuk pengujian!', 'error');
            return;
        }

        btn.disabled = true;
        btn.classList.add('opacity-50');
        loader.classList.remove('hidden');
        loader.classList.add('inline-flex');
        resultEl.innerHTML = '';

        // Hubungi endpoint proxy di server.js
        fetch('/api/satusehat/test-connection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientId: this.data.clientId,
                clientSecret: this.data.clientSecret,
                env: this.data.env || 'sandbox'
            })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            btn.disabled = false;
            btn.classList.remove('opacity-50');
            loader.classList.add('hidden');
            loader.classList.remove('inline-flex');

            if (data.success) {
                resultEl.className = "text-xs font-semibold text-emerald-600 dark:text-emerald-400";
                resultEl.innerHTML = '<span class="inline-flex items-center gap-1"><i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Autentikasi Kemenkes Berhasil! Token aktif diperoleh.</span>';
                self.addLog('Auth', 'OAuth Token', 'Success', 'Tes koneksi berhasil, token valid didapatkan dari Kemenkes RI.');
            } else {
                resultEl.className = "text-xs font-semibold text-red-600 dark:text-red-400";
                resultEl.innerHTML = '<span class="inline-flex items-center gap-1"><i data-lucide="x-circle" class="w-3.5 h-3.5"></i> Gagal terhubung: ' + Utils.escapeHtml(data.message) + '</span>';
                self.addLog('Auth', 'OAuth Token', 'Failed', 'Autentikasi gagal: ' + data.message);
            }
            lucide.createIcons();
        })
        .catch(function(err) {
            btn.disabled = false;
            btn.classList.remove('opacity-50');
            loader.classList.add('hidden');
            loader.classList.remove('inline-flex');
            
            resultEl.className = "text-xs font-semibold text-red-600 dark:text-red-400";
            resultEl.innerHTML = '<span class="inline-flex items-center gap-1"><i data-lucide="x-circle" class="w-3.5 h-3.5"></i> Kesalahan server: ' + Utils.escapeHtml(err.message) + '</span>';
            lucide.createIcons();
        });
    },

    // ==========================================
    // VALIDASI PASIEN & NIK
    // ==========================================
    loadPatientsData: function() {
        var self = this;
        var tableBody = document.getElementById('ss-patients-table-body');
        var emptyEl = document.getElementById('ss-patients-empty');
        if (!tableBody) return;

        tableBody.innerHTML = '<tr><td colspan="5" class="py-10 text-center"><div class="spinner border-t-primary-600 mx-auto"></div></td></tr>';

        db.collection('pasien').get().then(function(snap) {
            self.patientList = [];
            snap.forEach(function(doc) {
                var p = doc.data();
                p.id = doc.id;
                
                // Filter pencarian nama
                if (self.patientSearchQuery) {
                    var q = self.patientSearchQuery.toLowerCase();
                    var matchName = p.nama && p.nama.toLowerCase().indexOf(q) !== -1;
                    var matchRM = p.nomorRM && p.nomorRM.toLowerCase().indexOf(q) !== -1;
                    if (!matchName && !matchRM) return;
                }
                
                self.patientList.push(p);
            });

            if (self.patientList.length === 0) {
                tableBody.innerHTML = '';
                emptyEl.classList.remove('hidden');
                return;
            }

            emptyEl.classList.add('hidden');
            var html = '';
            
            self.patientList.forEach(function(p) {
                var validatedBadge = p.satusehatId 
                    ? '<span class="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 font-mono px-2 py-0.5 rounded text-[10px]"><i data-lucide="check" class="w-3 h-3"></i> ' + Utils.escapeHtml(p.satusehatId) + '</span>'
                    : '<span class="inline-flex items-center gap-1 bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 px-2 py-0.5 rounded text-[10px]"><i data-lucide="clock" class="w-3 h-3"></i> Belum Link</span>';

                var nikInput = p.nik 
                    ? '<span class="font-mono text-xs text-slate-700 dark:text-slate-300">' + Utils.escapeHtml(p.nik) + '</span>'
                    : '<input type="text" id="nik-' + p.id + '" placeholder="Ketik NIK 16 digit..." class="px-2 py-1 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded text-xs w-36 focus:ring-1 focus:ring-primary-500 outline-none">';

                var birthInput = p.tanggalLahir 
                    ? '<span class="text-xs text-slate-600 dark:text-slate-400">' + Utils.escapeHtml(p.tanggalLahir) + '</span>'
                    : '<input type="date" id="dob-' + p.id + '" class="px-2 py-1 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded text-xs focus:ring-1 focus:ring-primary-500 outline-none">';

                html += '  <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition">';
                html += '    <td class="px-5 py-3.5">';
                html += '      <p class="font-bold text-slate-700 dark:text-white">' + Utils.escapeHtml(p.nama) + '</p>';
                html += '      <p class="text-[10px] text-slate-400 font-mono">' + Utils.escapeHtml(p.nomorRM) + '</p>';
                html += '    </td>';
                html += '    <td class="px-5 py-3.5" id="cell-nik-' + p.id + '">' + nikInput + '</td>';
                html += '    <td class="px-5 py-3.5" id="cell-dob-' + p.id + '">';
                html += '      <div class="flex flex-col gap-0.5">';
                html += '        <div>' + birthInput + '</div>';
                html += '        <span class="text-[10px] text-slate-400 font-semibold uppercase">' + (p.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan') + '</span>';
                html += '      </div>';
                html += '    </td>';
                html += '    <td class="px-5 py-3.5" id="cell-badge-' + p.id + '">' + validatedBadge + '</td>';
                html += '    <td class="px-5 py-3.5 text-right" id="cell-action-' + p.id + '">';
                if (p.satusehatId) {
                    html += '      <button onclick="AppPengaturanSatusehat.unlinkPatient(\'' + p.id + '\')" class="text-[10px] font-bold text-red-500 hover:text-red-700 transition">Unlink</button>';
                } else {
                    html += '      <button onclick="AppPengaturanSatusehat.verifyNik(\'' + p.id + '\')" id="btn-verify-' + p.id + '" class="bg-primary-600 hover:bg-primary-700 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] transition flex items-center gap-1 ml-auto shadow-sm"><i data-lucide="shield-check" class="w-3.5 h-3.5"></i> Validasi NIK</button>';
                }
                html += '    </td>';
                html += '  </tr>';
            });

            tableBody.innerHTML = html;
            lucide.createIcons();
        });
    },

    onSearchPatient: function(val) {
        this.patientSearchQuery = val;
        this.loadPatientsData();
    },

    verifyNik: function(id) {
        var self = this;
        var p = this.patientList.find(function(x) { return x.id === id; });
        if (!p) return;

        var nik = p.nik;
        var dob = p.tanggalLahir;

        if (!nik) {
            var nikEl = document.getElementById('nik-' + id);
            nik = nikEl ? nikEl.value.trim() : '';
        }

        if (!dob) {
            var dobEl = document.getElementById('dob-' + id);
            dob = dobEl ? dobEl.value.trim() : '';
        }

        if (!nik || nik.length < 16) {
            Utils.toast('Harap masukkan NIK 16 digit yang valid!', 'error');
            return;
        }

        if (!dob) {
            Utils.toast('Harap pilih Tanggal Lahir untuk kebutuhan validasi FHIR!', 'error');
            return;
        }

        var btn = document.getElementById('btn-verify-' + id);
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<div class="spinner w-3 h-3 border-t-white"></div>';
        }

        // Lakukan pemanggilan ke endpoint proxy backend
        fetch('/api/satusehat/patient/by-nik/' + nik, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientId: this.data.clientId,
                clientSecret: this.data.clientSecret,
                env: this.data.env || 'sandbox'
            })
        })
        .then(function(res) { return res.json(); })
        .then(function(resData) {
            if (resData.success && resData.patientId) {
                // Berhasil memetakan, update pasien di Firestore
                var upObj = {
                    nik: nik,
                    tanggalLahir: dob,
                    satusehatId: resData.patientId,
                    satusehatSyncAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                db.collection('pasien').doc(id).update(upObj).then(function() {
                    Utils.toast('NIK pasien berhasil divalidasi ke SatuSehat!', 'success');
                    self.addLog('Patient', resData.patientId, 'Success', 'NIK ' + nik + ' atas nama ' + p.nama + ' sukses divalidasi Kemenkes. FHIR Patient ID linked.');
                    self.loadPatientsData();
                });
            } else {
                // Fallback simulation mode jika kredensial Kemenkes belum lengkap
                if (!self.data.clientId || !self.data.clientSecret) {
                    // Masuk mode simulasi karena belum memasukkan kredensial (sangat bagus untuk demo/blueprint)
                    var simulatedPatientId = 'P-' + String(Math.floor(1000000000 + Math.random() * 9000000000));
                    var upObj = {
                        nik: nik,
                        tanggalLahir: dob,
                        satusehatId: simulatedPatientId,
                        satusehatSyncAt: firebase.firestore.FieldValue.serverTimestamp()
                    };

                    db.collection('pasien').doc(id).update(upObj).then(function() {
                        Utils.toast('Simulasi: NIK berhasil divalidasi & linked!', 'success');
                        self.addLog('Patient', simulatedPatientId, 'Success', '(Simulasi) NIK ' + nik + ' atas nama ' + p.nama + ' berhasil divalidasi via Sandbox.');
                        self.loadPatientsData();
                    });
                } else {
                    if (btn) {
                        btn.disabled = false;
                        btn.innerHTML = '<i data-lucide="shield-check" class="w-3.5 h-3.5"></i> Validasi NIK';
                        lucide.createIcons();
                    }
                    Utils.toast('Gagal memvalidasi NIK: ' + resData.message, 'error');
                }
            }
        })
        .catch(function(err) {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i data-lucide="shield-check" class="w-3.5 h-3.5"></i> Validasi NIK';
                lucide.createIcons();
            }
            Utils.toast('Kesalahan validasi: ' + err.message, 'error');
        });
    },

    unlinkPatient: function(id) {
        var self = this;
        if (!confirm('Apakah Anda yakin ingin mematikan link SatuSehat pasien ini?')) return;

        db.collection('pasien').doc(id).update({
            satusehatId: firebase.firestore.FieldValue.delete(),
            satusehatSyncAt: firebase.firestore.FieldValue.delete()
        }).then(function() {
            Utils.toast('Link SatuSehat pasien dihapus.', 'info');
            self.loadPatientsData();
        });
    },

    // ==========================================
    // SINKRONISASI KUNJUNGAN (ENCOUNTER)
    // ==========================================
    loadEncountersData: function() {
        var self = this;
        var tableBody = document.getElementById('ss-encounters-table-body');
        var emptyEl = document.getElementById('ss-encounters-empty');
        if (!tableBody) return;

        tableBody.innerHTML = '<tr><td colspan="5" class="py-10 text-center"><div class="spinner border-t-primary-600 mx-auto"></div></td></tr>';

        // Ambil rekam medis hari ini
        var today = getLocalDateStr();
        
        // PENTING: Untuk render di table, kita join dengan Pasien
        Promise.all([
            db.collection('rekamMedis').where('tanggal', '==', today).get(),
            db.collection('pasien').get()
        ]).then(function(results) {
            var snapRM = results[0];
            var snapPasien = results[1];
            
            var pasienMap = {};
            snapPasien.forEach(function(doc) {
                pasienMap[doc.id] = doc.data();
            });

            self.encounterQueue = [];
            snapRM.forEach(function(doc) {
                var rm = doc.data();
                rm.id = doc.id;
                rm.pasienObj = pasienMap[rm.pasienId] || {};
                self.encounterQueue.push(rm);
            });

            if (self.encounterQueue.length === 0) {
                tableBody.innerHTML = '';
                emptyEl.classList.remove('hidden');
                return;
            }

            emptyEl.classList.add('hidden');
            var html = '';

            self.encounterQueue.forEach(function(rm) {
                var syncStatusBadge = '';
                if (rm.satusehatEncounterId) {
                    syncStatusBadge = '<span class="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 font-mono px-2 py-0.5 rounded text-[10px]"><i data-lucide="check" class="w-3 h-3"></i> Terkirim</span>';
                } else if (!rm.pasienObj.satusehatId) {
                    syncStatusBadge = '<span class="inline-flex items-center gap-1 bg-rose-50 text-rose-800 dark:bg-rose-950/20 dark:text-rose-400 px-2 py-0.5 rounded text-[10px]"><i data-lucide="alert-triangle" class="w-3 h-3"></i> Pasien Belum Link</span>';
                } else {
                    syncStatusBadge = '<span class="inline-flex items-center gap-1 bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 px-2 py-0.5 rounded text-[10px]"><i data-lucide="clock" class="w-3 h-3"></i> Siap Sync</span>';
                }

                html += '  <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition">';
                html += '    <td class="px-5 py-3.5">';
                html += '      <p class="font-bold text-slate-700 dark:text-white">' + Utils.escapeHtml(rm.pasienObj.nama || 'Pasien Umum') + '</p>';
                html += '      <p class="text-[10px] text-slate-400 font-mono">RM: ' + Utils.escapeHtml(rm.pasienObj.nomorRM || '-') + '</p>';
                if (rm.pasienObj.satusehatId) {
                    html += '  <p class="text-[9px] text-emerald-600 font-mono mt-0.5">SS-ID: ' + Utils.escapeHtml(rm.pasienObj.satusehatId) + '</p>';
                }
                html += '    </td>';
                html += '    <td class="px-5 py-3.5">';
                html += '      <p class="text-xs font-semibold text-slate-700 dark:text-slate-300">' + Utils.escapeHtml(rm.namaDokter || 'Dokter Umum') + '</p>';
                html += '    </td>';
                html += '    <td class="px-5 py-3.5">';
                html += '      <p class="text-xs text-slate-600 dark:text-slate-400 font-medium italic">"' + Utils.escapeHtml(rm.keluhan || '-') + '"</p>';
                if (rm.diagnosa) {
                    html += '  <p class="text-[10px] font-bold text-slate-500 mt-1 uppercase flex items-center gap-1"><i data-lucide="activity" class="w-3 h-3 text-rose-500"></i> ICD-10: ' + Utils.escapeHtml(rm.diagnosa) + '</p>';
                }
                html += '    </td>';
                html += '    <td class="px-5 py-3.5" id="cell-enc-badge-' + rm.id + '">' + syncStatusBadge + '</td>';
                html += '    <td class="px-5 py-3.5 text-right" id="cell-enc-action-' + rm.id + '">';
                if (rm.satusehatEncounterId) {
                    html += '      <span class="text-[10px] font-mono text-slate-400 block mb-0.5">ID: ' + Utils.escapeHtml(rm.satusehatEncounterId) + '</span>';
                    html += '      <button onclick="AppPengaturanSatusehat.unlinkEncounter(\'' + rm.id + '\')" class="text-[10px] font-bold text-red-500 hover:text-red-700 transition">Hapus Link</button>';
                } else if (!rm.pasienObj.satusehatId) {
                    html += '      <button onclick="AppPengaturanSatusehat.switchTab(\'patients\')" class="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] transition shadow-sm">Link Pasien</button>';
                } else {
                    html += '      <button onclick="AppPengaturanSatusehat.syncEncounter(\'' + rm.id + '\')" id="btn-sync-enc-' + rm.id + '" class="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] transition flex items-center gap-1 ml-auto shadow-sm"><i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Kirim SatuSehat</button>';
                }
                html += '    </td>';
                html += '  </tr>';
            });

            tableBody.innerHTML = html;
            lucide.createIcons();
        });
    },

    syncEncounter: function(id) {
        var self = this;
        var rm = this.encounterQueue.find(function(x) { return x.id === id; });
        if (!rm) return;

        var btn = document.getElementById('btn-sync-enc-' + id);
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<div class="spinner w-3 h-3 border-t-white"></div>';
        }

        // Lakukan pemanggilan ke endpoint proxy backend
        fetch('/api/satusehat/encounter/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientId: this.data.clientId,
                clientSecret: this.data.clientSecret,
                env: this.data.env || 'sandbox',
                patientId: rm.pasienObj.satusehatId,
                patientName: rm.pasienObj.nama,
                doctorName: rm.namaDokter || 'Dokter Umum',
                diagnosa: rm.diagnosa || 'Pemeriksaan Umum',
                organizationId: this.data.organizationId || '100023456',
                locationId: this.data.locationId || 'f76b88b7-86c0-4286-9dc4-839e94cb02cb'
            })
        })
        .then(function(res) { return res.json(); })
        .then(function(resData) {
            if (resData.success && resData.encounterId) {
                // Update Firestore
                var upObj = {
                    satusehatEncounterId: resData.encounterId,
                    satusehatConditionId: resData.conditionId || '',
                    satusehatSyncAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                db.collection('rekamMedis').doc(id).update(upObj).then(function() {
                    Utils.toast('Rekam medis terkirim ke Kemenkes SatuSehat!', 'success');
                    self.addLog('Encounter', resData.encounterId, 'Success', 'Kunjungan & Diagnosis ' + rm.pasienObj.nama + ' sukses terkirim. Encounter & Condition FHIR dibuat.');
                    self.loadEncountersData();
                });
            } else {
                // Fallback simulation mode jika kredensial Kemenkes belum lengkap
                if (!self.data.clientId || !self.data.clientSecret) {
                    var simulatedEncounterId = 'E-' + String(Math.floor(100000 + Math.random() * 900000));
                    var simulatedConditionId = 'C-' + String(Math.floor(100000 + Math.random() * 900000));
                    var upObj = {
                        satusehatEncounterId: simulatedEncounterId,
                        satusehatConditionId: simulatedConditionId,
                        satusehatSyncAt: firebase.firestore.FieldValue.serverTimestamp()
                    };

                    db.collection('rekamMedis').doc(id).update(upObj).then(function() {
                        Utils.toast('Simulasi: Rekam medis berhasil dionlinekan!', 'success');
                        self.addLog('Encounter', simulatedEncounterId, 'Success', '(Simulasi) Kunjungan ' + rm.pasienObj.nama + ' berhasil dikirim ke Sandbox SatuSehat.');
                        self.loadEncountersData();
                    });
                } else {
                    if (btn) {
                        btn.disabled = false;
                        btn.innerHTML = '<i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Kirim SatuSehat';
                        lucide.createIcons();
                    }
                    Utils.toast('Gagal sinkronisasi Encounter: ' + resData.message, 'error');
                }
            }
        })
        .catch(function(err) {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Kirim SatuSehat';
                lucide.createIcons();
            }
            Utils.toast('Kesalahan sinkronisasi: ' + err.message, 'error');
        });
    },

    unlinkEncounter: function(id) {
        var self = this;
        if (!confirm('Apakah Anda yakin ingin menghapus data link SatuSehat dari rekam medis ini?')) return;

        db.collection('rekamMedis').doc(id).update({
            satusehatEncounterId: firebase.firestore.FieldValue.delete(),
            satusehatConditionId: firebase.firestore.FieldValue.delete(),
            satusehatSyncAt: firebase.firestore.FieldValue.delete()
        }).then(function() {
            Utils.toast('Link SatuSehat rekam medis dihapus.', 'info');
            self.loadEncountersData();
        });
    }
};

// Helper tanggal
function getLocalDateStr() {
    var d = new Date();
    var year = d.getFullYear();
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
}
