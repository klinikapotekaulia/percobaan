/**
 * js/app.js
 * Core: Firebase init, Utils, Theme, Routing, Auth state listener
 *
 * PERBAIKAN UTAMA:
 * - File ini harus di-load SEBELUM auth.js
 * - Utils.toast pakai Snackbar (bukan alert) agar tidak blokir UI
 * - renderSidebar mengisi KEDUA sidebar (desktop + mobile)
 * - Tidak ada duplikat definisi fungsi
 */

// ============================================================
// 1. FIREBASE CONFIG
//    Ganti nilai di bawah dengan konfigurasi project Firebase Anda.
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyDXuiTRwHttekv5iy6rk8RJA_pVL25v-U4",
  authDomain: "klinikapotekaulia-61641.firebaseapp.com",
  projectId: "klinikapotekaulia-61641",
  storageBucket: "klinikapotekaulia-61641.firebasestorage.app",
  messagingSenderId: "857781555251",
  appId: "1:857781555251:web:33dbb41f292026f9ef9346"
};

firebase.initializeApp(firebaseConfig);
var db   = firebase.firestore();
var auth = firebase.auth();

// Konfigurasi cache size menjadi tidak terbatas (unlimited)
// agar transaksi farmasi dan data obat/pasien tersimpan secara lokal tanpa batas ukuran
// dan disinkronkan secara otomatis ketika koneksi pulih.
try {
  db.settings({
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
  });
} catch (e) {
  console.warn('Gagal mengatur cacheSizeBytes:', e.message);
}

// PENTING: aktifkan cache lokal (IndexedDB) Firestore.
// Tanpa ini, SETIAP kali halaman di-refresh / dibuka ulang, semua listener
// (termasuk DataCache) akan mengunduh ulang SELURUH koleksi dari server -
// inilah penyebab utama reads Firestore cepat menembus kuota harian saat
// datanya sudah ribuan dokumen. Dengan persistence aktif, data yang sudah
// pernah diambil disimpan di disk browser; saat dibuka lagi, Firestore SDK
// membaca dari cache lokal dulu dan hanya menarik dari server dokumen yang
// benar-benar berubah sejak terakhir kali dibuka.
db.enablePersistence({ synchronizeTabs: true }).catch(function (err) {
    if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence: hanya bisa aktif di satu tab pada satu waktu.');
    } else if (err.code === 'unimplemented') {
        console.warn('Firestore persistence: browser ini tidak mendukung fitur cache offline.');
    }
});

// Buat juga tersedia sebagai window.db / window.auth
window.db   = db;
window.auth = auth;

// ============================================================
// 2. UTILS
// ============================================================
window.Utils = {

    formatRupiah: function (num) {
        return 'Rp\u00a0' + (Number(num) || 0).toLocaleString('id-ID');
    },

    formatAngka: function (num) {
        return (Number(num) || 0).toLocaleString('id-ID');
    },

    formatNumber: function (num) {
        return (Number(num) || 0).toLocaleString('id-ID');
    },

    escapeHtml: function (text) {
        if (text === null || text === undefined) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(String(text)));
        return div.innerHTML;
    },

    thisMonth: function () {
        var d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    },

    // FIX: sebelumnya pakai new Date().toISOString().split('T')[0], yang selalu
    // memakai zona UTC. Untuk WIB (UTC+7), itu membuat "hari ini" baru dianggap
    // berganti jam 07:00 pagi waktu lokal (bukan jam 00:00), sehingga data yang
    // difilter/berdasarkan "hari ini" (dashboard, penjualan harian, rangkuman
    // aktivitas, dst) telat update setiap paginya sampai jam 7. Sekarang ambil
    // dari getFullYear/getMonth/getDate (mengikuti jam lokal perangkat/browser).
    //
    // dateStr() adalah versi UMUM: berlaku untuk Date object APA SAJA (bukan
    // cuma "sekarang"), dipakai di banyak modul lain (transaksi, retur, hutang,
    // piutang, payroll, dst) yang sebelumnya masing-masing salah pakai
    // toISOString() sendiri untuk memformat tanggal transaksi/jatuh tempo/dsb.
    dateStr: function (d) {
        d = (d instanceof Date) ? d : new Date(d);
        var y = d.getFullYear();
        var m = String(d.getMonth() + 1).padStart(2, '0');
        var day = String(d.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + day;
    },

    today: function () {
        return this.dateStr(new Date());
    },

    now: function () {
        var d = new Date();
        return this.dateStr(d) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    },

    timeStr: function (d) {
        if (!d) return '';
        if (typeof d === 'object' && typeof d.toDate === 'function') {
            d = d.toDate();
        } else if (!(d instanceof Date)) {
            d = new Date(d);
        }
        if (isNaN(d.getTime())) return '';
        return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    },

    // Snackbar non-blocking (tidak pakai alert)
    toast: function (msg, type) {
        type = type || 'info';

        // Hapus toast lama jika ada
        var old = document.getElementById('app-toast');
        if (old) old.remove();

        var colors = {
            success: 'bg-green-600',
            error:   'bg-red-600',
            warning: 'bg-amber-500',
            info:    'bg-slate-700'
        };
        var icons = {
            success: 'check-circle',
            error:   'x-circle',
            warning: 'alert-triangle',
            info:    'info'
        };

        var el = document.createElement('div');
        el.id = 'app-toast';
        el.className = 'fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium max-w-sm w-auto ' + (colors[type] || colors.info);
        el.innerHTML = '<i data-lucide="' + (icons[type] || 'info') + '" class="w-4 h-4 flex-shrink-0"></i><span>' + Utils.escapeHtml(msg) + '</span>';
        document.body.appendChild(el);
        if (window.lucide) lucide.createIcons({ el: el });

        setTimeout(function () { if (el.parentNode) el.remove(); }, 4000);
    },

    showLoading: function (containerId) {
        var el = document.getElementById(containerId);
        if (el) el.innerHTML = '<div class="flex justify-center py-10"><div class="spinner"></div></div>';
    },

    openModal: function (htmlContent) {
        var existing = document.getElementById('global-modal');
        if (existing) existing.remove();

        var modal = document.createElement('div');
        modal.id = 'global-modal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50';
        modal.innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">' + htmlContent + '</div>';
        document.body.appendChild(modal);
        if (window.lucide) lucide.createIcons();
    },

    closeModal: function () {
        var modal = document.getElementById('global-modal');
        if (modal) modal.remove();
    }
};

// ============================================================
// 3. APP — Theme & Logout
// ============================================================
window.App = {

    currentLang: localStorage.getItem('app_language') || 'id',

    translations: {
        id: {
            // Sections
            sec_utama: 'Menu Utama',
            sec_klinik: 'Operasional Klinik',
            sec_apotek: 'Operasional Apotek',
            sec_laporan: 'Laporan',
            sec_manajemen: 'Manajemen',
            sec_keuangan: 'Keuangan',
            sec_pengaturan: 'Pengaturan',

            // Menus
            menu_dashboard: 'Dashboard',
            menu_chat: 'Diskusi & Chat',
            menu_antrian: 'Antrian',
            menu_rekam_medis: 'Rekam Medis',
            menu_resep: 'Resep',
            menu_pasien: 'Pasien',
            menu_transaksi: 'Transaksi',
            menu_penjualan: 'Penjualan',
            menu_obat: 'Obat & Stok',
            menu_pembelian: 'Pembelian',
            menu_stockOpname: 'Stok Opname',
            menu_notifikasi: 'Notifikasi',
            menu_retur: 'Retur Obat',
            menu_obat_terlaris: 'Ringkasan Obat Terlaris',
            menu_hutang: 'Hutang Usaha',
            menu_pengeluaran: 'Pengeluaran',
            menu_pendapatan_lain: 'Pendapatan Lain',
            menu_piutang: 'Piutang Karyawan',
            menu_penjualanHarian: 'Penjualan Harian',
            menu_auditTrail: 'Audit Trail',
            menu_karyawan: 'Karyawan',
            menu_absensi: 'Absensi',
            menu_dashboard_keuangan: 'Dashboard Keuangan',
            menu_payroll: 'Payroll',
            menu_laporan_keuangan: 'Lap. Keuangan',
            menu_rangkuman_bulanan: 'Rangkuman Aktivitas',
            menu_akuntansi: 'Akuntansi',
            menu_profil: 'Profil Instansi',
            menu_pembagian: 'Pembagian Hasil',
            menu_tindakan: 'Master Tindakan',
            menu_gaji: 'Pengaturan Gaji',
            menu_users: 'Kelola Users',
            menu_display_antrian: 'Display Antrian',
            menu_satusehat: 'SatuSehat Kemenkes',
            menu_landing: 'Edit Landing Page',
            menu_rekap_tindakan: 'Tindakan & Besaran',
            menu_riwayat_pasien: 'Riwayat Pasien',
            menu_dashboard_dokter: 'Dashboard Dokter',
            menu_online: 'User Online',
            menu_voidlog: 'Void & Koreksi',
            menu_tren_finansial: 'Tren Finansial YoY & MoM',
            menu_stok_mati: 'Pengawasan Stok Mati',

            // General
            online: 'Online',
            offline: 'Offline',
            memuat: 'Memuat...',
            statusKoneksi: 'Status Koneksi & Service Worker',
            konfirmasiLogout: 'Konfirmasi Logout',
            yakinLogout: 'Apakah Anda yakin ingin keluar dari sistem?',
            batal: 'Batal',
            yaKeluar: 'Ya, Keluar',
            halamanBelumTersedia: 'Halaman Belum Tersedia',
            gagalMemuat: 'Gagal memuat file:',
            logoutSukses: 'Berhasil logout.',
            logoutGagal: 'Gagal logout:',
            networkKembali: 'Koneksi internet kembali pulih. Sinkronisasi otomatis aktif.',
            koneksiTerputus: 'Koneksi internet terputus. Bekerja Offline.'
        },
        en: {
            // Sections
            sec_utama: 'Main Menu',
            sec_klinik: 'Clinical Operations',
            sec_apotek: 'Pharmacy Operations',
            sec_laporan: 'Reports',
            sec_manajemen: 'Management',
            sec_keuangan: 'Finance',
            sec_pengaturan: 'Settings',

            // Menus
            menu_dashboard: 'Dashboard',
            menu_chat: 'Discussion & Chat',
            menu_antrian: 'Queue',
            menu_rekam_medis: 'Medical Records',
            menu_resep: 'Prescriptions',
            menu_pasien: 'Patients',
            menu_transaksi: 'Transactions',
            menu_penjualan: 'Sales History',
            menu_obat: 'Medicine & Stock',
            menu_pembelian: 'Purchasing',
            menu_stockOpname: 'Stock Take',
            menu_notifikasi: 'Notifications',
            menu_retur: 'Medicine Returns',
            menu_obat_terlaris: 'Top Selling Medicines',
            menu_hutang: 'Accounts Payable',
            menu_pengeluaran: 'Expenses',
            menu_pendapatan_lain: 'Other Income',
            menu_piutang: 'Employee Receivables',
            menu_penjualanHarian: 'Daily Sales',
            menu_auditTrail: 'Audit Trail',
            menu_karyawan: 'Employees',
            menu_absensi: 'Attendance',
            menu_dashboard_keuangan: 'Financial Dashboard',
            menu_payroll: 'Payroll',
            menu_laporan_keuangan: 'Financial Reports',
            menu_rangkuman_bulanan: 'Activity Summary',
            menu_akuntansi: 'Accounting',
            menu_profil: 'Clinic Profile',
            menu_pembagian: 'Profit Sharing',
            menu_tindakan: 'Action Master',
            menu_gaji: 'Salary Settings',
            menu_users: 'Manage Users',
            menu_display_antrian: 'Queue Display',
            menu_satusehat: 'SatuSehat Kemenkes',
            menu_landing: 'Edit Landing Page',
            menu_rekap_tindakan: 'Actions & Amounts',
            menu_riwayat_pasien: 'Patient History',
            menu_dashboard_dokter: 'Doctor Dashboard',
            menu_online: 'Online Users',
            menu_voidlog: 'Voids & Corrections',
            menu_tren_finansial: 'Financial Growth Trends',
            menu_stok_mati: 'Dead Stock & Efficiency',

            // General
            online: 'Online',
            offline: 'Offline',
            memuat: 'Loading...',
            statusKoneksi: 'Connection Status & Service Worker',
            konfirmasiLogout: 'Confirm Logout',
            yakinLogout: 'Are you sure you want to log out of the system?',
            batal: 'Cancel',
            yaKeluar: 'Yes, Log Out',
            halamanBelumTersedia: 'Page Not Available',
            gagalMemuat: 'Failed to load file:',
            logoutSukses: 'Logged out successfully.',
            logoutGagal: 'Failed to log out:',
            networkKembali: 'Internet connection restored. Autosync is active.',
            koneksiTerputus: 'Internet connection lost. Working Offline.'
        },
        su: {
            // Sections
            sec_utama: 'Menu Utama',
            sec_klinik: 'Operasional Klinik',
            sec_apotek: 'Operasional Apoték',
            sec_laporan: 'Laporan',
            sec_manajemen: 'Manajemen',
            sec_keuangan: 'Keuangan',
            sec_pengaturan: 'Pangaturan',

            // Menus
            menu_dashboard: 'Dashboard',
            menu_chat: 'Obrolan & Diskusi',
            menu_antrian: 'Antrean',
            menu_rekam_medis: 'Rékam Medis',
            menu_resep: 'Resép',
            menu_pasien: 'Pasien',
            menu_transaksi: 'Transaksi',
            menu_penjualan: 'Payuan',
            menu_obat: 'Ubar & Stok',
            menu_pembelian: 'Pameulian',
            menu_stockOpname: 'Stok Opname',
            menu_notifikasi: 'Wara-wara',
            menu_retur: 'Kunjangan Ubar',
            menu_hutang: 'Hutang Usaha',
            menu_pengeluaran: 'Pangaluaran',
            menu_pendapatan_lain: 'Pendapatan Séjén',
            menu_piutang: 'Piutang Karyawan',
            menu_penjualanHarian: 'Payuan Sapopoé',
            menu_auditTrail: 'Lacak Audit',
            menu_karyawan: 'Pagawe',
            menu_absensi: 'Absénsi',
            menu_dashboard_keuangan: 'Dashboard Keuangan',
            menu_payroll: 'Gajihan',
            menu_laporan_keuangan: 'Lap. Keuangan',
            menu_rangkuman_bulanan: 'Ringkesan Aktivitas',
            menu_akuntansi: 'Akuntansi',
            menu_profil: 'Profil Instansi',
            menu_pembagian: 'Bagi Hasil',
            menu_tindakan: 'Tindakan Medis',
            menu_gaji: 'Aturan Gaji',
            menu_users: 'Atur Pamaké',
            menu_display_antrian: 'Pintonan Antrean',
            menu_satusehat: 'SatuSehat Kemenkes',
            menu_landing: 'Edit Landing Page',
            menu_rekap_tindakan: 'Tindakan & Besaran',
            menu_riwayat_pasien: 'Riwayat Pasién',
            menu_dashboard_dokter: 'Dashboard Dokter',
            menu_online: 'User Online',
            menu_voidlog: 'Void & Koréksi',
            menu_tren_finansial: 'Trén Finansial YoY & MoM',
            menu_stok_mati: 'Pangawasan Stok Mati',

            // General
            online: 'Nyambung',
            offline: 'Pegat',
            memuat: 'Nuju ngamuat...',
            statusKoneksi: 'Status Sambungan & Service Worker',
            konfirmasiLogout: 'Konfirmasi Kaluar',
            yakinLogout: 'Naha anjeun yakin hoyong kaluar tina sistem?',
            batal: 'Batal',
            yaKeluar: 'Muhun, Kaluar',
            halamanBelumTersedia: 'Kaca Teu Acan Sayogi',
            gagalMemuat: 'Gagal ngamuat file:',
            logoutSukses: 'Berhasil kaluar.',
            logoutGagal: 'Gagal kaluar:',
            networkKembali: 'Sambungan internet parantos pulih deui. Sinkronisasi otomatis aktip.',
            koneksiTerputus: 'Sambungan internet pegat. Gawé Offline.'
        }
    },

    translate: function(key, defaultVal) {
        var lang = this.currentLang || 'id';
        var t = this.translations[lang] || this.translations.id;
        return t[key] || this.translations.id[key] || defaultVal || key;
    },

    changeLanguage: function(lang) {
        this.currentLang = lang;
        localStorage.setItem('app_language', lang);
        document.documentElement.setAttribute('lang', lang);

        // Update select element value
        var select = document.getElementById('lang-select');
        if (select) select.value = lang;

        // Re-render sidebar to reflect translations
        if (window.currentRole) {
            renderSidebar(window.currentRole);
        }

        // Update current page title
        var activeBtn = document.querySelector('.nav-btn.text-primary-600, .nav-btn.text-primary-600\\/90');
        if (!activeBtn) activeBtn = document.querySelector('.nav-btn[class*="text-primary-600"]');
        if (activeBtn) {
            var pageId = activeBtn.getAttribute('data-page');
            var translatedTitle = this.translate('menu_' + pageId.replace(/-/g, '_'));
            var pageTitleEl = document.getElementById('page-title');
            if (pageTitleEl) pageTitleEl.textContent = translatedTitle;
        }

        // Update network status display labels
        var text = document.getElementById('network-text');
        if (text) {
            var isOnline = navigator.onLine;
            text.textContent = isOnline ? this.translate('online') : this.translate('offline');
        }
        var btn = document.getElementById('btn-network-status');
        if (btn) {
            btn.setAttribute('title', this.translate('statusKoneksi'));
            btn.setAttribute('aria-label', this.translate('statusKoneksi'));
        }
        
        var toastMsgs = {
            id: 'Bahasa diubah ke Bahasa Indonesia.',
            en: 'Language changed to English.',
            su: 'Basa dirobah ka Bahasa Sunda.'
        };
        Utils.toast(toastMsgs[lang] || toastMsgs.id, 'success');
    },

    initLanguage: function() {
        var saved = localStorage.getItem('app_language') || 'id';
        this.currentLang = saved;
        document.documentElement.setAttribute('lang', saved);
        var select = document.getElementById('lang-select');
        if (select) select.value = saved;
    },

    toggleTheme: function () {
        document.documentElement.classList.toggle('dark');
        var isDark = document.documentElement.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    },

    // FITUR VAPORWAVE CYBERPUNK 2099 (ULTRA HUD & SYNTHWAVE)
    toggleVaporwaveTheme: function () {
        var body = document.body;
        body.classList.toggle('theme-win98');
        var isVaporwave = body.classList.contains('theme-win98');
        localStorage.setItem('user_tema', isVaporwave ? 'win98' : 'default');
        
        if (isVaporwave) {
            Utils.toast('⚡ Mode Vaporwave Cyberpunk 2099 Aktif!', 'success');
            App.playCyberSound(880, 0.2);
        } else {
            Utils.toast('Mode Tampilan Standar Aktif', 'info');
        }
        App.updateCyberHud();
    },

    updateCyberHud: function () {
        var isVaporwave = document.body.classList.contains('theme-win98');
        var container = document.getElementById('cyber-hud-container');
        if (!container) return;

        if (!isVaporwave) {
            container.classList.add('hidden');
            container.innerHTML = '';
            document.body.classList.remove('has-scanlines');
            return;
        }

        container.classList.remove('hidden');

        var hasScanlines = localStorage.getItem('cyber_scanlines') !== 'false';
        var hasAudio = localStorage.getItem('cyber_audio') === 'true';

        if (hasScanlines) {
            document.body.classList.add('has-scanlines');
        } else {
            document.body.classList.remove('has-scanlines');
        }

        var html = '';
        html += '<div class="cyber-hud-bar flex items-center justify-between flex-wrap gap-2 py-1.5 px-4 bg-slate-900/90 text-xs border-b border-pink-500/40 text-pink-400 font-mono z-20">';
        html += '  <div class="flex items-center gap-3">';
        html += '    <span class="cyber-hud-badge border-pink-500/50 text-pink-300"><span class="cyber-hud-dot"></span> CYBERPUNK 2099 ULTRA HUD</span>';
        html += '    <span class="hidden md:inline text-[11px] text-cyan-400">CORE: <span class="text-emerald-400 font-bold">ONLINE</span> | LATENCY: <span id="cyber-ping" class="text-pink-300 font-bold">12ms</span> | SYNTH MATRIX: <span class="text-amber-300 font-bold">ACTIVE</span></span>';
        html += '  </div>';
        html += '  <div class="flex items-center gap-2 text-[11px]">';
        html += '    <button onclick="App.toggleCyberScanlines()" class="px-2.5 py-1 rounded border ' + (hasScanlines ? 'border-cyan-400 text-cyan-300 bg-cyan-950/50 shadow-[0_0_8px_rgba(0,243,255,0.4)]' : 'border-slate-600 text-slate-400') + ' transition hover:scale-105 font-bold">';
        html += '      CRT Scanlines: ' + (hasScanlines ? 'ON ⚡' : 'OFF');
        html += '    </button>';
        html += '    <button onclick="App.toggleCyberAudio()" class="px-2.5 py-1 rounded border ' + (hasAudio ? 'border-pink-400 text-pink-300 bg-pink-950/50 shadow-[0_0_8px_rgba(236,72,153,0.4)]' : 'border-slate-600 text-slate-400') + ' transition hover:scale-105 font-bold">';
        html += '      Synth Audio: ' + (hasAudio ? 'ON 🔊' : 'OFF 🔇');
        html += '    </button>';
        html += '  </div>';
        html += '</div>';

        container.innerHTML = html;
        if (window.lucide && lucide.createIcons) lucide.createIcons();
    },

    toggleCyberScanlines: function () {
        var current = localStorage.getItem('cyber_scanlines') !== 'false';
        localStorage.setItem('cyber_scanlines', (!current).toString());
        App.updateCyberHud();
        Utils.toast('Efek CRT Scanlines ' + (!current ? 'diaktifkan' : 'dinonaktifkan'), 'info');
        if (!current) App.playCyberSound(950, 0.1);
    },

    toggleCyberAudio: function () {
        var current = localStorage.getItem('cyber_audio') === 'true';
        var next = !current;
        localStorage.setItem('cyber_audio', next.toString());
        App.updateCyberHud();
        if (next) App.playCyberSound(880, 0.15);
        Utils.toast('Efek Suara Synth Cyberpunk ' + (next ? 'diaktifkan 🔊' : 'dinonaktifkan 🔇'), 'info');
    },

    playCyberSound: function (freq, duration) {
        if (localStorage.getItem('cyber_audio') !== 'true') return;
        try {
            var AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            var ctx = new AudioCtx();
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq || 600, ctx.currentTime);
            gain.gain.setValueAtTime(0.03, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (duration || 0.1));
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + (duration || 0.1));
        } catch (e) { }
    },

    logout: function () {
        var modalContent = 
            '<div class="p-6 text-center">' +
            '  <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 mb-4">' +
            '    <i data-lucide="log-out" class="w-6 h-6"></i>' +
            '  </div>' +
            '  <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-2">' + App.translate('konfirmasiLogout') + '</h3>' +
            '  <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">' + App.translate('yakinLogout') + '</p>' +
            '  <div class="flex justify-center gap-3">' +
            '    <button onclick="Utils.closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-lg transition">' +
            '      ' + App.translate('batal') +
            '    </button>' +
            '    <button onclick="App.confirmLogout()" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition">' +
            '      ' + App.translate('yaKeluar') +
            '    </button>' +
            '  </div>' +
            '</div>';
        Utils.openModal(modalContent);
    },

    confirmLogout: function () {
        Utils.closeModal();
        firebase.auth().signOut()
            .then(function ()  { Utils.toast(App.translate('logoutSukses'), 'success'); })
            .catch(function (e){ Utils.toast(App.translate('logoutGagal') + ' ' + e.message, 'error'); });
    },

    initNetworkStatus: function () {
        var self = this;
        var btn = document.getElementById('btn-network-status');
        var dot = document.getElementById('network-dot');
        var text = document.getElementById('network-text');
        var icon = document.getElementById('network-icon');

        function updateUI() {
            var isOnline = navigator.onLine;
            if (!btn || !dot || !text || !icon) return;

            // Atur ulang class nama style
            dot.className = 'w-2 h-2 rounded-full';
            btn.className = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-700/50';

            if (isOnline) {
                dot.classList.add('bg-green-500', 'animate-pulse');
                text.textContent = App.translate('online');
                text.className = 'hidden sm:inline-block text-green-600 dark:text-green-400';
                btn.classList.add('border-green-200', 'dark:border-green-900/30', 'bg-green-50/50', 'dark:bg-green-950/10');
                icon.setAttribute('data-lucide', 'wifi');
                icon.className = 'w-4 h-4 text-green-500 dark:text-green-400';
            } else {
                dot.classList.add('bg-amber-500');
                text.textContent = App.translate('offline');
                text.className = 'hidden sm:inline-block text-amber-600 dark:text-amber-400 font-bold';
                btn.classList.add('border-amber-200', 'dark:border-amber-900/30', 'bg-amber-50/50', 'dark:bg-amber-950/10', 'animate-pulse');
                icon.setAttribute('data-lucide', 'wifi-off');
                icon.className = 'w-4 h-4 text-amber-500 dark:text-amber-400';
                Utils.toast(App.translate('koneksiTerputus'), 'warning');
            }

            btn.setAttribute('title', App.translate('statusKoneksi'));
            btn.setAttribute('aria-label', App.translate('statusKoneksi'));

            if (window.lucide) {
                lucide.createIcons({ el: btn });
            }
        }

        window.addEventListener('online', function () {
            updateUI();
            Utils.toast(App.translate('networkKembali'), 'success');
        });
        window.addEventListener('offline', updateUI);

        // Jalankan pengecekan awal
        updateUI();

        // Cek status service worker
        this.swStatus = 'Checking...';
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(function (registration) {
                self.swStatus = 'Aktif (Scope: ' + registration.scope + ')';
            }).catch(function (err) {
                self.swStatus = 'Gagal memuat: ' + err.message;
            });
        } else {
            this.swStatus = 'Tidak didukung oleh browser ini';
        }
    },

    showPwaDetails: function () {
        var isOnline = navigator.onLine;
        var swInfo = this.swStatus || 'Tidak aktif atau belum terdaftar';

        var connectionTitle = isOnline ? 'Tersambung (Online)' : 'Terputus (Offline)';
        var connectionColor = isOnline ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400';
        var connectionBg = isOnline ? 'bg-green-50 dark:bg-green-950/20' : 'bg-amber-50 dark:bg-amber-950/20';
        var connectionIcon = isOnline ? 'wifi' : 'wifi-off';

        var statusDesc = isOnline 
            ? 'Aplikasi terhubung penuh ke Cloud Server. Semua data obat, transaksi, laporan keuangan, dan audit log akan langsung disimpan dan disinkronkan secara realtime.'
            : 'Koneksi internet Anda sedang terganggu atau tidak ada. Berkat <b>Service Worker (PWA)</b> dan <b>Firestore Offline Cache</b>, Anda masih dapat membuka aplikasi, melihat data, dan melakukan input transaksi tertentu secara offline. Transaksi baru Anda akan disimpan sementara di memori browser dan disinkronkan secara otomatis begitu internet terhubung kembali.';

        var html = 
            '<div class="p-6">' +
                '<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">' +
                    '<div class="flex items-center gap-2">' +
                        '<i data-lucide="zap" class="w-5 h-5 text-primary-500"></i>' +
                        '<h3 class="text-lg font-bold">Status Koneksi & PWA</h3>' +
                    '</div>' +
                    '<button onclick="Utils.closeModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">' +
                        '<i data-lucide="x" class="w-5 h-5"></i>' +
                    '</button>' +
                '</div>' +

                '<div class="space-y-4">' +
                    '<!-- Status Koneksi -->' +
                    '<div class="p-4 rounded-xl ' + connectionBg + ' flex gap-3">' +
                        '<div class="p-2 rounded-lg bg-white dark:bg-slate-800 shadow-sm flex-shrink-0 h-9 w-9 flex items-center justify-center">' +
                            '<i data-lucide="' + connectionIcon + '" class="w-5 h-5 ' + connectionColor + '"></i>' +
                        '</div>' +
                        '<div>' +
                            '<p class="text-sm font-semibold ' + connectionColor + '">' + connectionTitle + '</p>' +
                            '<p class="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">' + statusDesc + '</p>' +
                        '</div>' +
                    '</div>' +

                    '<!-- Service Worker Info -->' +
                    '<div class="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">' +
                        '<div class="flex items-center gap-2 text-sm font-semibold">' +
                            '<i data-lucide="cpu" class="w-4 h-4 text-indigo-500"></i>' +
                            '<span>Service Worker (PWA Engine)</span>' +
                        '</div>' +
                        '<div class="grid grid-cols-3 gap-2 text-xs">' +
                            '<span class="text-slate-400">Status Registrasi:</span>' +
                            '<span class="col-span-2 font-medium text-slate-700 dark:text-slate-300">' + swInfo + '</span>' +

                            '<span class="text-slate-400">Penyimpanan Cache:</span>' +
                            '<span class="col-span-2 font-medium text-slate-700 dark:text-slate-300">Aktif (Shell Cache: aulia-v6)</span>' +

                            '<span class="text-slate-400">Mode Kerja:</span>' +
                            '<span class="col-span-2 font-medium text-slate-700 dark:text-slate-300">Hybrid (Network-First & Offline Fallback)</span>' +
                        '</div>' +
                        '<p class="text-[11px] text-slate-400 leading-relaxed pt-1 border-t border-slate-100 dark:border-slate-800">' +
                            'Service Worker menyimpan aset statis aplikasi di browser Anda sehingga aplikasi memuat lebih cepat dan tetap dapat dibuka walau offline.' +
                        '</p>' +
                    '</div>' +

                    '<!-- Firestore Cache Info -->' +
                    '<div class="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">' +
                        '<div class="flex items-center gap-2 text-sm font-semibold">' +
                            '<i data-lucide="database" class="w-4 h-4 text-emerald-500"></i>' +
                            '<span>Firestore Offline Persistence</span>' +
                        '</div>' +
                        '<div class="grid grid-cols-3 gap-2 text-xs">' +
                            '<span class="text-slate-400">Status Cache:</span>' +
                            '<span class="col-span-2 font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">' +
                                '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Aktif (IndexedDB)' +
                            '</span>' +

                            '<span class="text-slate-400">Tab Sync:</span>' +
                            '<span class="col-span-2 font-medium text-slate-700 dark:text-slate-300">Diaktifkan (Multi-Tab)</span>' +
                        '</div>' +
                        '<p class="text-[11px] text-slate-400 leading-relaxed pt-1 border-t border-slate-100 dark:border-slate-800">' +
                            'Penyimpanan database lokal Firestore aktif. Transaksi harian akan tersimpan aman di disk lokal saat offline dan disinkronkan kembali saat online.' +
                        '</p>' +
                    '</div>' +
                '</div>' +

                '<div class="flex justify-end mt-6">' +
                    '<button onclick="Utils.closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition">' +
                        'Tutup' +
                    '</button>' +
                '</div>' +
            '</div>';

        Utils.openModal(html);
    }
};

// ============================================================
// 4. MENU STRUCTURE & ROLE ACCESS
// ============================================================
var menuStructure = {
    utama: [
        { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', module: 'dashboard' },
        { id: 'chat',      label: 'Diskusi & Chat', icon: 'message-square', module: 'chat' }
    ],
    klinik: [
        { id: 'antrian',        label: 'Antrian',           icon: 'list-ordered', module: 'klinik/antrian'        },
        { id: 'rekam-medis',    label: 'Rekam Medis',       icon: 'file-heart',   module: 'klinik/rekamMedis'     },
        { id: 'resep',          label: 'Resep',             icon: 'file-text',    module: 'klinik/resep'          },
        { id: 'pasien',         label: 'Pasien',            icon: 'users',        module: 'klinik/pasien'         },
        // FIX (INTEGRASI): kedua menu di bawah ini file modulnya sudah lengkap (dibuat
        // atas "permintaan dokter", lihat komentar header di masing-masing file), tapi
        // TIDAK PERNAH terdaftar di sini walau komentarnya sendiri mengklaim "sudah
        // ditambahkan di app.js" -- akibatnya kedua modul jadi dead code, tidak bisa
        // diakses dari UI manapun. Didaftarkan sekarang supaya benar-benar terintegrasi.
        { id: 'riwayat-pasien', label: 'Riwayat Pasien',    icon: 'history',      module: 'klinik/riwayatPasien'  },
        { id: 'dashboard-dokter', label: 'Dashboard Dokter', icon: 'layout-dashboard', module: 'klinik/dashboardDokter' },
        { id: 'rekap-tindakan', label: 'Tindakan & Besaran', icon: 'stethoscope', module: 'klinik/rekapTindakan' }
    ],
    apotek: [
        { id: 'transaksi',   label: 'Transaksi',    icon: 'shopping-cart',   module: 'apotek/transaksi'    },
        { id: 'penjualan',   label: 'Penjualan',    icon: 'list-checks',     module: 'apotek/penjualan'    },
        { id: 'obat',        label: 'Obat & Stok',  icon: 'pill',            module: 'apotek/obat'         },
        { id: 'obat-terlaris', label: 'Ringkasan Obat Terlaris', icon: 'trending-up', module: 'apotek/obatTerlaris' },
        { id: 'pembelian',   label: 'Pembelian',    icon: 'truck',           module: 'apotek/pembelian'    },
        { id: 'stockOpname', label: 'Stok Opname',  icon: 'clipboard-check', module: 'apotek/stockOpname'  },
        { id: 'notifikasi',  label: 'Notifikasi',   icon: 'bell',            module: 'apotek/notifikasi'   },
        { id: 'retur',       label: 'Retur Obat',   icon: 'undo-2',          module: 'apotek/retur'        }
    ],
    laporan: [
        { id: 'hutang',          label: 'Hutang Usaha',      icon: 'file-text',     module: 'laporan/hutang'         },
        { id: 'pengeluaran',     label: 'Pengeluaran',       icon: 'receipt',       module: 'laporan/pengeluaran'    },
        { id: 'pendapatan-lain', label: 'Pendapatan Lain', icon: 'circle-dollar-sign', module: 'laporan/pendapatanLain' },
        { id: 'piutang',         label: 'Piutang Karyawan',  icon: 'wallet',        module: 'laporan/piutang'        },
        { id: 'penjualanHarian', label: 'Penjualan Harian',  icon: 'bar-chart-2',   module: 'laporan/penjualanHarian'},
        { id: 'auditTrail',      label: 'Audit Trail',       icon: 'history',       module: 'laporan/auditTrail'     }
    ],
    manajemen: [
        { id: 'karyawan', label: 'Karyawan', icon: 'user-check',    module: 'manajemen/karyawan' },
        { id: 'absensi',  label: 'Absensi',  icon: 'calendar-check', module: 'manajemen/absensi' },
        { id: 'online',   label: 'User Online', icon: 'wifi',       module: 'manajemen/online' },
        { id: 'voidlog',  label: 'Void & Koreksi', icon: 'shield-alert', module: 'manajemen/voidlog' },
        { id: 'tren-finansial', label: 'Tren Finansial', icon: 'line-chart', module: 'manajemen/trenFinansial' },
        { id: 'stok-mati', label: 'Pengawasan Stok', icon: 'package-x', module: 'manajemen/stokMati' }
    ],
    keuangan: [
        { id: 'dashboard-keuangan', label: 'Dashboard Keuangan', icon: 'layout-dashboard', module: 'keuangan/dashboardKeuangan' },
        { id: 'payroll',           label: 'Payroll',             icon: 'calculator',     module: 'keuangan/payroll'          },
        { id: 'mutasi-rekening',   label: 'Mutasi Rekening',     icon: 'arrow-left-right', module: 'keuangan/mutasiRekening' },
        { id: 'laporan-keuangan',  label: 'Lap. Keuangan',       icon: 'bar-chart-3',    module: 'keuangan/laporanKeuangan'  },
        { id: 'rangkuman-bulanan', label: 'Rangkuman Aktivitas', icon: 'calendar-range', module: 'keuangan/rangkumanBulanan' },
        { id: 'akuntansi',         label: 'Akuntansi',           icon: 'book-open',      module: 'keuangan/akuntansi'        }
    ],
    pengaturan: [
        { id: 'profil',    label: 'Profil Instansi',  icon: 'building-2',  module: 'pengaturan/profil'    },
        { id: 'pembagian', label: 'Pembagian Hasil',  icon: 'pie-chart',   module: 'pengaturan/pembagian' },
        { id: 'tindakan',  label: 'Master Tindakan',  icon: 'stethoscope', module: 'pengaturan/tindakan'  },
        { id: 'gaji',      label: 'Pengaturan Gaji',  icon: 'wallet',      module: 'pengaturan/gaji'      },
        { id: 'users',     label: 'Kelola Users',     icon: 'user-cog',    module: 'pengaturan/users'     },
        // BARU: pengaturan logo, running text, video YouTube & tema untuk display.html (TV ruang tunggu)
        { id: 'display-antrian', label: 'Display Antrian', icon: 'tv', module: 'pengaturan/displayAntrian' },
        // SKELATAL FRAMEWORK: SatuSehat Kemenkes Integration
        { id: 'satusehat', label: 'SatuSehat Kemenkes', icon: 'heart-pulse', module: 'pengaturan/satusehat' },
        { id: 'landing', label: 'Edit Landing Page', icon: 'layout', module: 'pengaturan/landing' }
    ]
};

var roleAccess = {
    klinik:   ['utama', 'klinik', 'manajemen.absensi'],
    // Role khusus Dokter: Akses sama dengan klinik minus laporan.hutang
    dokter:   ['utama', 'klinik', 'manajemen.absensi'],
    apotek:   ['utama', 'apotek', 'laporan.hutang', 'laporan.pengeluaran', 'laporan.pendapatan-lain', 'laporan.penjualanHarian', 'manajemen.absensi'],
    // Admin: Tidak termasuk laporan.auditTrail, keuangan.payroll, keuangan.laporan-keuangan, dan keuangan.akuntansi
    admin:    [
        'utama', 'klinik', 'apotek',
        'laporan.hutang', 'laporan.pengeluaran', 'laporan.pendapatan-lain', 'laporan.piutang', 'laporan.penjualanHarian',
        'manajemen',
        'keuangan.rangkuman-bulanan',
        'pengaturan.profil', 'pengaturan.tindakan', 'pengaturan.display-antrian', 'pengaturan.satusehat', 'pengaturan.landing'
    ],
    // FITUR BARU: akun PSA (Pemilik Sarana Apotek/Klinik). Akses lengkap kecuali: kelola user, pembagian hasil, akuntansi.
    // Dashboard Keuangan (keuangan.dashboard-keuangan) dikhususkan untuk role Keuangan saja.
    psa:      [
        'utama', 'klinik', 'apotek', 'laporan', 'manajemen',
        'keuangan.payroll', 'keuangan.mutasi-rekening', 'keuangan.laporan-keuangan', 'keuangan.rangkuman-bulanan',
        'pengaturan.profil', 'pengaturan.tindakan', 'pengaturan.gaji', 'pengaturan.display-antrian', 'pengaturan.satusehat', 'pengaturan.landing'
    ],
    keuangan: ['utama', 'klinik', 'apotek', 'laporan', 'manajemen', 'keuangan', 'pengaturan']
};

// ============================================================
// 5. RENDER SIDEBAR
// ============================================================
function buildSidebarHtml(role) {
    var allowed = roleAccess[role] || [];

    var sections = [
        { key: 'utama',     title: 'Menu Utama',          icon: 'home'          },
        { key: 'klinik',    title: 'Operasional Klinik',  icon: 'activity'      },
        { key: 'apotek',    title: 'Operasional Apotek',  icon: 'cross'         },
        { key: 'laporan',   title: 'Laporan',             icon: 'file-bar-chart' },
        { key: 'manajemen', title: 'Manajemen',           icon: 'users'         },
        { key: 'keuangan',  title: 'Keuangan',            icon: 'landmark'      },
        { key: 'pengaturan',title: 'Pengaturan',          icon: 'settings'      }
    ];

    var html = '';

    sections.forEach(function (section) {
        var hasSection = allowed.indexOf(section.key) !== -1 ||
            allowed.some(function (a) { return a.indexOf(section.key + '.') === 0; });
        if (!hasSection) return;

        var items = '';
        menuStructure[section.key].forEach(function (menu) {
            var fullKey    = section.key + '.' + menu.id;
            var hasItem    = allowed.indexOf(section.key) !== -1 || allowed.indexOf(fullKey) !== -1;
            if (!hasItem) return;

            // Memastikan menu_online dan voidlog hanya bisa diakses oleh psa dan keuangan
            if ((menu.id === 'online' || menu.id === 'voidlog') && role !== 'psa' && role !== 'keuangan') return;

            // FITUR BARU: menu Penjualan (daftar seluruh transaksi tersimpan) hanya untuk
            // Admin, PSA, dan Keuangan -- role apotek/klinik/dokter tidak boleh melihatnya
            // meskipun section 'apotek' terbuka untuk mereka.
            if (menu.id === 'penjualan' && role !== 'admin' && role !== 'psa' && role !== 'keuangan') return;

            // FITUR BARU: menu Tindakan & Besaran Klinik (jumlah & besaran tindakan) hanya untuk role Keuangan
            if (menu.id === 'rekap-tindakan' && role !== 'keuangan') return;

            // FITUR BARU: titik merah berkedip khusus menu Chat, menandakan ada
            // pesan diskusi baru yang belum dibuka akun ini. Lihat startChatNotifWatcher().
            var unreadBadge = (menu.id === 'chat')
                ? '<span class="chat-unread-badge hidden ml-auto w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0"></span>'
                : '';

            var translatedLabel = App.translate('menu_' + menu.id.replace(/-/g, '_'), menu.label);

            items += '<li>' +
                '<button onclick="navigateTo(\'' + menu.module + '\', \'' + translatedLabel.replace(/'/g, "\\'") + '\')" ' +
                'class="nav-btn w-full text-left px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300 ' +
                'hover:bg-primary-50 dark:hover:bg-slate-700 hover:text-primary-600 dark:hover:text-primary-400 ' +
                'transition-colors flex items-center gap-3" data-page="' + menu.id + '">' +
                '<i data-lucide="' + menu.icon + '" class="w-4 h-4 flex-shrink-0"></i>' +
                '<span>' + translatedLabel + '</span>' +
                unreadBadge +
                '</button></li>';
        });

        if (!items) return; // bagian ini tidak ada item yang bisa diakses

        var translatedSectionTitle = App.translate('sec_' + section.key);

        html += '<div>' +
            '<p class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">' +
            '<i data-lucide="' + section.icon + '" class="w-3.5 h-3.5"></i>' + translatedSectionTitle + '</p>' +
            '<ul class="space-y-0.5">' + items + '</ul></div>';
    });

    return html;
}

function renderSidebar(role) {
    var html = buildSidebarHtml(role);

    var desktopMenu = document.getElementById('sidebar-menu');
    var mobileMenu  = document.getElementById('mobile-sidebar-menu');

    if (desktopMenu) desktopMenu.innerHTML = html;
    if (mobileMenu)  mobileMenu.innerHTML  = html;

    if (window.lucide) lucide.createIcons();
}

// ============================================================
// 6. DYNAMIC SCRIPT LOADER
// ============================================================
var _currentModule  = null;
var _loadedScripts  = {};

function loadScript(url) {
    return new Promise(function (resolve, reject) {
        if (_loadedScripts[url]) { resolve(); return; }
        var script    = document.createElement('script');
        script.src    = url;
        script.onload = function () { _loadedScripts[url] = true; resolve(); };
        script.onerror = function () {
            reject(new Error('Gagal memuat file: ' + url));
        };
        document.head.appendChild(script);
    });
}

window.navigateTo = function (modulePath, title) {
    // Validasi Izin Akses Modul
    var userRole = window.currentRole || 'apotek';
    var allowed  = roleAccess[userRole] || [];
    var parts    = (modulePath || '').split('/');
    if (parts.length === 2) {
        var secKey  = parts[0];
        var itemKey = parts[1];
        var fullKey = secKey + '.' + itemKey;
        var hyphenatedKey = secKey + '.' + itemKey.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
        var hasSection = allowed.indexOf(secKey) !== -1;
        var hasFullKey = allowed.indexOf(fullKey) !== -1 || allowed.indexOf(hyphenatedKey) !== -1;
        if (!hasSection && !hasFullKey && secKey !== 'dashboard' && modulePath !== 'dashboard' && modulePath !== 'chat') {
            Utils.toast('Akses Ditolak: Akun ' + userRole.toUpperCase() + ' tidak memiliki akses ke modul ini.', 'error');
            return;
        }
        if (modulePath === 'klinik/rekapTindakan' && userRole !== 'keuangan') {
            Utils.toast('Akses Ditolak: Modul Tindakan & Besaran Klinik khusus untuk role Keuangan.', 'error');
            return;
        }
    }

    if (_currentModule && typeof _currentModule.destroy === 'function') {
        try {
            _currentModule.destroy();
        } catch (e) {
            console.error('Error destroying module:', e);
        }
    }
    _currentModule = null;

    document.getElementById('page-title').textContent = title || '';
    document.getElementById('app-content').innerHTML  =
        '<div class="flex justify-center py-20"><div class="spinner"></div></div>';

    // Highlight menu aktif di KEDUA sidebar
    document.querySelectorAll('.nav-btn').forEach(function (btn) {
        btn.classList.remove('bg-primary-50', 'text-primary-600', 'font-semibold',
                             'dark:bg-slate-700', 'dark:text-primary-400');
    });
    var pageId  = modulePath.split('/').pop();
    var actives = document.querySelectorAll('[data-page="' + pageId + '"]');
    actives.forEach(function (btn) {
        btn.classList.add('bg-primary-50', 'text-primary-600', 'font-semibold',
                          'dark:bg-slate-700', 'dark:text-primary-400');
    });

    // Tutup sidebar mobile otomatis
    if (window.innerWidth < 1024) {
        var mobileSidebar = document.getElementById('mobile-sidebar');
        var overlay       = document.getElementById('sidebar-overlay');
        if (mobileSidebar && !mobileSidebar.classList.contains('-translate-x-full')) {
            mobileSidebar.classList.add('-translate-x-full');
            if (overlay) overlay.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    var scriptUrl = 'js/' + modulePath + '.js';
    loadScript(scriptUrl).then(function () {
        // Nama objek modul: "js/apotek/obat" → "AppApotekObat"
        var moduleName = 'App' + modulePath.split('/')
            .map(function (s) { return s.charAt(0).toUpperCase() + s.slice(1); })
            .join('');

        var Module = window[moduleName];
        if (!Module || typeof Module.render !== 'function') {
            throw new Error('Objek window.' + moduleName + ' tidak ditemukan atau tidak memiliki fungsi render().');
        }

        _currentModule = Module;
        var content    = document.getElementById('app-content');
        content.innerHTML = Module.render();
        content.classList.add('page-enter');
        setTimeout(function () { content.classList.remove('page-enter'); }, 300);

        if (window.lucide) lucide.createIcons();
        if (typeof Module.init === 'function') Module.init();

    }).catch(function (err) {
        console.error('Gagal load module [' + modulePath + ']:', err);
        document.getElementById('app-content').innerHTML =
            '<div class="text-center py-20">' +
            '<i data-lucide="file-x" class="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4"></i>' +
            '<h3 class="text-lg font-bold text-slate-500 dark:text-slate-400">Halaman Belum Tersedia</h3>' +
            '<p class="text-sm text-slate-400 dark:text-slate-500 mt-2">' + Utils.escapeHtml(err.message) + '</p>' +
            '<p class="text-xs text-slate-300 dark:text-slate-600 mt-1">Path: js/' + modulePath + '.js</p>' +
            '</div>';
        if (window.lucide) lucide.createIcons();
    });
};

// ============================================================
// 6b. NOTIFIKASI CHAT (titik merah berkedip di sidebar + suara)
//     - Memantau pesan TERAKHIR di 'groupChat' secara ringan (limit 1),
//       dibandingkan dengan waktu terakhir akun ybs "membaca" chat
//       (disimpan per-akun di 'chatReadStatus/{uid}').
//     - Titik merah muncul kalau ada pesan baru dari ORANG LAIN yang
//       datang SETELAH waktu baca terakhir, dan hilang begitu akun
//       membuka halaman Diskusi & Chat (lihat js/chat.js -> init()).
//     - Suara notifikasi dibuat langsung via Web Audio API (tidak perlu
//       file audio terpisah), dan HANYA dibunyikan untuk pesan baru yang
//       benar-benar masuk selama sesi ini berjalan (bukan riwayat lama
//       saat pertama kali buka aplikasi / refresh).
// ============================================================
var _chatUnreadListener  = null;
var _chatLastReadMillis  = null;
var _chatFirstSnapshot   = true;
window._chatPageActive   = false; // di-toggle oleh js/chat.js saat halaman Chat dibuka/ditutup

// FIX: sebelumnya kode ini bikin `new AudioContext()` BARU setiap kali ada
// notifikasi. Browser modern (Chrome/Safari) memblokir AudioContext yang
// dibuat/dipakai tanpa "izin" dari interaksi user terbaru (autoplay policy) —
// context baru sering start dalam status "suspended" (bisu total, tanpa
// error). Sekarang pakai SATU context yang dibuat sekali & di-resume tiap
// mau bunyi, dan di-"unlock" lebih awal lewat interaksi pertama user
// (klik/ketik apa saja di halaman) supaya saat notifikasi pertama datang,
// context sudah siap jalan.
var _chatAudioCtx = null;
function getChatAudioCtx() {
    if (!_chatAudioCtx) {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        try { _chatAudioCtx = new Ctx(); } catch (e) { return null; }
    }
    return _chatAudioCtx;
}
// Unlock sedini mungkin: begitu user klik/sentuh/ketik apa saja di halaman
// (termasuk saat login), context langsung dibuat & di-resume.
['click', 'keydown', 'touchstart'].forEach(function (evt) {
    document.addEventListener(evt, function unlockChatAudio() {
        var ctx = getChatAudioCtx();
        if (ctx && ctx.state === 'suspended') ctx.resume().catch(function () {});
    }, { once: true, passive: true });
});

function playChatNotifSound() {
    try {
        var ctx = getChatAudioCtx();
        if (!ctx) return;
        var afterResume = function () {
            var now = ctx.currentTime;
            // Nada dua-ketuk pendek ("ting-ting") khas notifikasi chat
            [{ t: 0, f: 880 }, { t: 0.12, f: 1175 }].forEach(function (n) {
                var osc  = ctx.createOscillator();
                var gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = n.f;
                gain.gain.setValueAtTime(0.0001, now + n.t);
                gain.gain.exponentialRampToValueAtTime(0.18, now + n.t + 0.015);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + 0.25);
                osc.connect(gain).connect(ctx.destination);
                osc.start(now + n.t);
                osc.stop(now + n.t + 0.3);
            });
        };
        if (ctx.state === 'suspended') {
            // Masih terkunci (belum ada interaksi user sama sekali sejak halaman
            // dibuka) -> coba resume dulu; kalau gagal, browser memang belum
            // mengizinkan audio sampai user berinteraksi (badge merah tetap muncul).
            ctx.resume().then(afterResume).catch(function (e) {
                console.warn('Audio notifikasi masih terkunci browser (belum ada interaksi user):', e);
            });
        } else {
            afterResume();
        }
    } catch (e) {
        console.warn('Tidak dapat memutar suara notifikasi chat:', e);
    }
}

function setChatUnreadBadge(show) {
    document.querySelectorAll('.chat-unread-badge').forEach(function (el) {
        el.classList.toggle('hidden', !show);
    });
}

// Dipanggil saat akun membuka halaman Chat (js/chat.js) supaya titik merah
// langsung hilang, dan disimpan ke Firestore supaya status "sudah dibaca"
// ini juga berlaku kalau akun tsb login dari perangkat lain.
window.markChatAsRead = function () {
    _chatLastReadMillis = Date.now();
    setChatUnreadBadge(false);
    var uid = window.currentUid || (firebase.auth().currentUser ? firebase.auth().currentUser.uid : null);
    if (!uid) return;
    
    // Simpan di local storage sebagai cadangan
    try {
        localStorage.setItem('chatLastRead_' + uid, _chatLastReadMillis.toString());
    } catch (e) {}

    db.collection('chatReadStatus').doc(uid).set({
        lastRead: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(function (err) {
        console.warn('Gagal menyimpan status baca chat ke cloud (menggunakan penyimpanan lokal):', err.message);
    });
};

function startChatNotifWatcher() {
    var uid = window.currentUid || (firebase.auth().currentUser ? firebase.auth().currentUser.uid : null);
    if (!uid) return;

    stopChatNotifWatcher();
    _chatFirstSnapshot = true;

    // Load dari local storage dulu sebagai fallback cepat/aman
    try {
        var localLastRead = localStorage.getItem('chatLastRead_' + uid);
        if (localLastRead) {
            _chatLastReadMillis = parseInt(localLastRead, 10);
        }
    } catch (e) {}

    function setupGroupChatListener(uidNow) {
        _chatUnreadListener = db.collection('groupChat')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .onSnapshot(function (snapshot) {
                if (snapshot.empty) { _chatFirstSnapshot = false; return; }

                var msg = snapshot.docs[0].data();
                var currentUidNow = window.currentUid || (firebase.auth().currentUser ? firebase.auth().currentUser.uid : null);

                // Sedang membuka halaman Chat -> selalu dianggap terbaca, tanpa badge/suara.
                if (window._chatPageActive) {
                    window.markChatAsRead();
                    _chatFirstSnapshot = false;
                    return;
                }

                if (!msg.createdAt) { _chatFirstSnapshot = false; return; } // penulisan lokal, timestamp belum jadi

                var msgMillis    = msg.createdAt.toMillis();
                var isFromOther  = msg.senderId !== currentUidNow;
                var isUnread     = isFromOther && (_chatLastReadMillis === null || msgMillis > _chatLastReadMillis);

                setChatUnreadBadge(isUnread);

                // Suara HANYA untuk pesan baru yang masuk selama sesi ini berjalan,
                // bukan saat pertama kali watcher ini menyala (baca riwayat lama).
                if (isUnread && !_chatFirstSnapshot) {
                    playChatNotifSound();
                }

                _chatFirstSnapshot = false;
            }, function (err) {
                console.warn('Gagal memantau notifikasi chat:', err.message);
            });
    }

    db.collection('chatReadStatus').doc(uid).get().then(function (doc) {
        if (doc.exists && doc.data().lastRead) {
            _chatLastReadMillis = doc.data().lastRead.toMillis();
            try {
                localStorage.setItem('chatLastRead_' + uid, _chatLastReadMillis.toString());
            } catch (e) {}
        } else {
            // Belum pernah ada catatan baca untuk akun ini -> anggap semua pesan yang sudah ada sekarang sudah
            // dibaca, supaya tidak muncul badge palsu untuk riwayat lama.
            if (!_chatLastReadMillis) {
                _chatLastReadMillis = Date.now();
                try {
                    localStorage.setItem('chatLastRead_' + uid, _chatLastReadMillis.toString());
                } catch (e) {}
            }
            db.collection('chatReadStatus').doc(uid).set({
                lastRead: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }).catch(function () {});
        }

        setupGroupChatListener(uid);
    }).catch(function (err) {
        console.warn('Gagal memuat status baca chat dari cloud (menggunakan penyimpanan lokal):', err.message);
        if (!_chatLastReadMillis) {
            _chatLastReadMillis = Date.now();
            try {
                localStorage.setItem('chatLastRead_' + uid, _chatLastReadMillis.toString());
            } catch (e) {}
        }
        setupGroupChatListener(uid);
    });
}

function stopChatNotifWatcher() {
    if (_chatUnreadListener) {
        _chatUnreadListener();
        _chatUnreadListener = null;
    }
    setChatUnreadBadge(false);
}

function startUserHeartbeat() {
    var uid = window.currentUid || (firebase.auth().currentUser ? firebase.auth().currentUser.uid : null);
    if (!uid) return;

    stopUserHeartbeat();

    function updateHeartbeat() {
        var uidNow = window.currentUid || (firebase.auth().currentUser ? firebase.auth().currentUser.uid : null);
        if (!uidNow) return;
        
        db.collection('users').doc(uidNow).update({
            lastActive: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(function(err) {
            console.warn('[Heartbeat] Gagal memperbarui status aktif:', err.message);
        });
    }

    updateHeartbeat();
    // Update setiap 20 detik
    window.userHeartbeatInterval = setInterval(updateHeartbeat, 20000);
}

function stopUserHeartbeat() {
    if (window.userHeartbeatInterval) {
        clearInterval(window.userHeartbeatInterval);
        window.userHeartbeatInterval = null;
    }
}

// ============================================================
// AUTO-LOGOUT MECHANISM (IDLE TRACKER - 15 MINUTES)
// ============================================================
var _idleTimer = null;
// FIX (READ SPIKE): sebelumnya 15 menit. Setiap kali autoLogout() memanggil
// signOut(), listener onSnapshot milik DataCache (obat & pasien) langsung
// ditolak rules (isSignedIn() == false) -> DataCache._ready dihapus paksa ->
// begitu user login lagi, DataCache membuat listener BARU yang otomatis
// menagih FULL READ ulang seluruh koleksi obat & pasien (bukan cuma sekali
// per sesi seperti niat awal DataCache, tapi sekali per SIKLUS logout-login).
// Dinaikkan ke 8 jam (kurang lebih 1 shift kerja) atas permintaan langsung,
// supaya siklus logout-login praktis cuma terjadi 1x/hari per staf. Catatan:
// makin panjang timeout, makin lama juga sesi tetap terbuka di perangkat yang
// ditinggal tanpa logout manual -- pastikan perangkat kasir tetap fisik aman
// (tidak diakses sembarang orang) karena proteksi sesi-otomatis ini melemah.
var _idleTimeoutMs = 8 * 60 * 60 * 1000; // 8 jam
var _lastActivityTime = 0;

function handleUserActivity() {
    var now = Date.now();
    // Hanya perbarui timer setiap 5 detik untuk menghemat CPU (terutama untuk mousemove/scroll)
    if (now - _lastActivityTime > 5000) {
        _lastActivityTime = now;
        resetIdleTimer();
    }
}

function resetIdleTimer() {
    if (_idleTimer) {
        clearTimeout(_idleTimer);
    }
    _idleTimer = setTimeout(autoLogout, _idleTimeoutMs);
}

function autoLogout() {
    Utils.toast('Sesi Anda telah berakhir karena tidak ada aktivitas selama 15 menit.', 'warning');
    firebase.auth().signOut()
        .then(function() {
            console.log('[Idle Tracker] Auto-logout berhasil karena tidak aktif.');
        })
        .catch(function(err) {
            console.error('[Idle Tracker] Gagal melakukan auto-logout:', err);
        });
}

function startIdleTracker() {
    stopIdleTracker();
    _lastActivityTime = Date.now();
    resetIdleTimer();

    var activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(function(evt) {
        window.addEventListener(evt, handleUserActivity, { passive: true });
    });
}

function stopIdleTracker() {
    if (_idleTimer) {
        clearTimeout(_idleTimer);
        _idleTimer = null;
    }
    var activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(function(evt) {
        window.removeEventListener(evt, handleUserActivity);
    });
}

// ============================================================
// 7. BOOT APP (dipanggil setelah user terautentikasi)
// ============================================================
function startApp(userRole, userName, userTema) {
    App.initLanguage();
    window.currentRole     = userRole;
    window.currentUserName = userName;
    var user = firebase.auth().currentUser;
    if (user) {
        window.currentUid = user.uid;
        window.currentUserEmail = user.email;
    }

    var nameSafe = (userName || 'User').toString().trim() || 'User';
    var roleSafe = (userRole  || 'user').toString().trim() || 'user';

    var elName   = document.getElementById('user-name');
    var elRole   = document.getElementById('user-role');
    var elAvatar = document.getElementById('user-avatar');

    if (elName)   elName.textContent   = nameSafe;
    if (elRole) {
        var displayRole = roleSafe.charAt(0).toUpperCase() + roleSafe.slice(1);
        if (roleSafe === 'psa') displayRole = 'PSA';
        elRole.textContent = displayRole;
    }
    if (elAvatar) elAvatar.textContent = (nameSafe.charAt(0) || '?').toUpperCase();

    // FITUR BARU: tema tampilan per-akun (mis. "win98" / Vaporwave Cyberpunk 2099).
    document.body.classList.remove('theme-win98');
    var savedTema = localStorage.getItem('user_tema');
    if (userTema === 'win98' || savedTema === 'win98') {
        document.body.classList.add('theme-win98');
    }
    App.updateCyberHud();

    renderSidebar(userRole);
    navigateTo('dashboard', App.translate('menu_dashboard'));
    startChatNotifWatcher();
    startUserHeartbeat();
    startIdleTracker();
}

// ============================================================
// 8. AUTH STATE LISTENER
//    Ini adalah "permission gate" utama aplikasi.
//    - Jika user login → panggil startApp()
//    - Jika tidak → tampilkan form login via auth.js
// ============================================================
firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
        // Hapus overlay login & landing jika masih ada
        var overlay = document.getElementById('login-overlay');
        if (overlay) overlay.remove();
        var landingOverlay = document.getElementById('landing-overlay');
        if (landingOverlay) landingOverlay.remove();
        if (window.AppLanding) window.AppLanding.isActive = false;

        // Ambil profil dari Firestore
        db.collection('users').doc(user.uid).get()
            .then(function (doc) {
                if (!doc.exists) {
                    // Cek apakah database benar-benar kosong (tidak ada user sama sekali).
                    // Jika kosong, daftarkan user ini otomatis sebagai Admin pertama (bootstrap).
                    return db.collection('users').limit(1).get()
                        .then(function (snap) {
                            if (snap.empty) {
                                var bootstrapData = {
                                    nama: (user.displayName || user.email || 'Keuangan Aulia').split('@')[0],
                                    email: user.email,
                                    role: 'keuangan',
                                    status: 'aktif',
                                    tema: 'default',
                                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                                };
                                return db.collection('users').doc(user.uid).set(bootstrapData)
                                    .then(function () {
                                        Utils.toast('Database kosong terdeteksi. Akun Anda berhasil di-bootstrap sebagai Keuangan (Owner)!', 'success');
                                        startApp('keuangan', bootstrapData.nama, 'default');
                                    });
                            } else {
                                Utils.toast('Profil akun tidak ditemukan. Hubungi Admin.', 'error');
                                firebase.auth().signOut();
                            }
                        })
                        .catch(function (err) {
                            console.error('[AUTH] Bootstrap check error:', err);
                            Utils.toast('Profil akun tidak ditemukan. Hubungi Admin.', 'error');
                            firebase.auth().signOut();
                        });
                }
                var data = doc.data();
                if (data.status === 'nonaktif') {
                    Utils.toast('Akun Anda dinonaktifkan. Hubungi Admin.', 'error');
                    firebase.auth().signOut();
                    return;
                }
                startApp(data.role || 'apotek', data.nama || user.email || 'User', data.tema || 'default');
            })
            .catch(function (err) {
                Utils.toast('Gagal memuat profil: ' + err.message, 'error');
                firebase.auth().signOut();
            });

    } else {
        // User belum login — tampilkan landing page terlebih dahulu
        stopChatNotifWatcher(); // FITUR BARU: hentikan pemantau notifikasi chat saat logout
        stopUserHeartbeat();    // Hentikan heartbeat saat logout
        stopIdleTracker();      // Hentikan pelacak keaktifan saat logout
        document.body.classList.remove('theme-win98'); // FITUR BARU: reset tema saat logout
        
        // Bersihkan overlay login jika tersisa
        var loginOverlay = document.getElementById('login-overlay');
        if (loginOverlay) loginOverlay.remove();

        if (window.AppLanding && typeof window.AppLanding.render === 'function') {
            window.AppLanding.render();
        } else if (window.AppAuth && typeof window.AppAuth.renderLogin === 'function') {
            window.AppAuth.renderLogin();
        }
        // Reset UI navbar
        var elName   = document.getElementById('user-name');
        var elRole   = document.getElementById('user-role');
        var elAvatar = document.getElementById('user-avatar');
        if (elName)   elName.textContent   = 'Tamu';
        if (elRole)   elRole.textContent   = '-';
        if (elAvatar) elAvatar.textContent = '?';
    }
});

// Initialize network status monitoring once DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (window.App && typeof window.App.initNetworkStatus === 'function') {
            window.App.initNetworkStatus();
        }
    });
} else {
    if (window.App && typeof window.App.initNetworkStatus === 'function') {
        window.App.initNetworkStatus();
    }
}