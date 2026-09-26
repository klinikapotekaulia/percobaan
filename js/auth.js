/**
 * js/auth.js
 * Halaman Login Profesional dengan Validasi Real-time & Split-Screen Layout
 *
 * FITUR UTAMA:
 * - Desain split-screen yang mewah dan modern (Brand Panel + Form Panel).
 * - Validasi email & password secara real-time dan interaktif saat mengetik.
 * - Password strength meter dinamis (Red/Orange/Amber/Green).
 * - Toggle password visibility dengan transisi mulus.
 * - Fitur "Ingat Saya" (Remember Me) menggunakan localStorage.
 * - Loading state dan disables tombol login saat memproses autentikasi.
 * - Penanganan error Firebase Auth yang diterjemahkan dengan bahasa Indonesia yang ramah.
 */

window.AppAuth = {

    // Terjemahan pesan error Firebase Auth ke Bahasa Indonesia yang jelas
    _translateError: function (code) {
        var messages = {
            'auth/invalid-email':           'Format alamat email yang Anda masukkan tidak valid.',
            'auth/user-disabled':           'Akun ini telah dinonaktifkan oleh administrator.',
            'auth/user-not-found':          'Alamat email tidak terdaftar di sistem.',
            'auth/wrong-password':          'Kata sandi yang Anda masukkan salah.',
            'auth/invalid-credential':      'Email atau kata sandi tidak cocok. Silakan periksa kembali.',
            'auth/too-many-requests':       'Terlalu banyak percobaan masuk yang gagal. Silakan coba beberapa saat lagi.',
            'auth/network-request-failed':  'Koneksi internet bermasalah. Periksa jaringan Anda dan coba lagi.',
            'auth/operation-not-allowed':   'Metode masuk ini belum diaktifkan di server.',
            'auth/email-already-in-use':    'Alamat email sudah terdaftar di akun lain.',
            'auth/weak-password':           'Kata sandi terlalu lemah (minimal 6 karakter).'
        };
        return messages[code] || 'Terjadi kesalahan sistem saat mencoba masuk. Silakan coba lagi.';
    },

    renderLogin: function () {
        var self = this;

        // Hapus overlay lama jika masih tersisa di DOM
        var existing = document.getElementById('login-overlay');
        if (existing) existing.remove();

        var overlay = document.createElement('div');
        overlay.id = 'login-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:9999;';
        overlay.className = 'bg-slate-50 dark:bg-slate-900 overflow-y-auto lg:overflow-hidden flex flex-col justify-between lg:block';

        // Icon Inline SVGs untuk menghindari ketergantungan render eksternal dan layout shift
        var SVGIcons = {
            mail: '<svg class="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
            lock: '<svg class="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
            error: '<svg class="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>',
            success: '<svg class="w-4 h-4 text-green-500 animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>',
            check: '<svg class="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
            logo: '<svg class="w-12 h-12 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>'
        };

        var savedEmail = localStorage.getItem('aulia_remember_email') || '';
        var isRemembered = savedEmail ? 'checked' : '';

        // Dynamic branding setup from landing configuration
        var brandConf = (window.AppLanding && window.AppLanding.currentConfig) ? window.AppLanding.currentConfig : {};
        var brandName = brandConf.brandName || 'AULIA';
        var brandSub = brandConf.brandSub || 'Sistem Integrasi Medis';
        var brandLogoImg = brandConf.logoImg || 'logo-192.png';

        var dynamicLogoHtml = '<img src="' + Utils.escapeHtml(brandLogoImg) + '" class="w-12 h-12 object-contain" alt="Logo">';

        // Template HTML split-screen mewah
        overlay.innerHTML = [
            '<div class="grid grid-cols-1 lg:grid-cols-12 min-h-screen w-full">',
                
                // === PANEL KIRI: Brand & Showcase (Desktop Only) ===
                '<div class="hidden lg:flex lg:col-span-5 xl:col-span-4 bg-gradient-to-br from-primary-700 via-primary-800 to-primary-950 text-white flex-col justify-between p-10 relative overflow-hidden">',
                    // Dynamic Glowing Ambient Orbs
                    '<div class="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary-600/30 blur-3xl pointer-events-none"></div>',
                    '<div class="absolute -bottom-40 -right-45 w-96 h-96 rounded-full bg-emerald-600/20 blur-3xl pointer-events-none"></div>',
                    
                    // Brand Logo & Header
                    '<div class="relative z-10 flex items-center gap-3">',
                        '<div class="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-md">',
                            dynamicLogoHtml,
                        '</div>',
                        '<div>',
                            '<h1 class="text-xl font-black tracking-tight leading-none">' + Utils.escapeHtml(brandName) + '</h1>',
                            '<p class="text-[10px] text-primary-200 uppercase font-semibold tracking-widest mt-1">' + Utils.escapeHtml(brandSub) + '</p>',
                        '</div>',
                    '</div>',

                    // Core Features Showcase Cards
                    '<div class="relative z-10 my-auto space-y-6 max-w-sm">',
                        '<div class="space-y-2">',
                            '<span class="bg-primary-600/40 text-primary-200 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border border-primary-500/30">EDISI PROFESIONAL</span>',
                            '<h2 class="text-2xl font-bold leading-tight">Solusi Operasional Apotek &amp; Klinik Terpadu</h2>',
                            '<p class="text-xs text-primary-100/80 leading-relaxed">Kelola rekam medis pasien, antrian real-time, inventori obat cerdas, hingga integrasi SatuSehat Kemenkes dalam satu dasbor terpusat.</p>',
                        '</div>',

                        '<div class="space-y-3.5 pt-4 border-t border-white/10">',
                            // Feature 1
                            '<div class="flex gap-3 items-start">',
                                '<div class="p-1 bg-white/15 rounded-lg text-emerald-300 mt-0.5">' + SVGIcons.check + '</div>',
                                '<div>',
                                    '<p class="text-xs font-bold">RME &amp; ICD-10 Terstandardisasi</p>',
                                    '<p class="text-[10px] text-primary-200/80">Dokumentasi rekam medis elektronik yang lengkap dan aman.</p>',
                                '</div>',
                            '</div>',
                            // Feature 2
                            '<div class="flex gap-3 items-start">',
                                '<div class="p-1 bg-white/15 rounded-lg text-emerald-300 mt-0.5">' + SVGIcons.check + '</div>',
                                '<div>',
                                    '<p class="text-xs font-bold">Integrasi SatuSehat HL7 FHIR</p>',
                                    '<p class="text-[10px] text-primary-200/80">Kepatuhan otomatis rekam medis ke database Kemenkes RI.</p>',
                                '</div>',
                            '</div>',
                            // Feature 3
                            '<div class="flex gap-3 items-start">',
                                '<div class="p-1 bg-white/15 rounded-lg text-emerald-300 mt-0.5">' + SVGIcons.check + '</div>',
                                '<div>',
                                    '<p class="text-xs font-bold">Manajemen Inventori &amp; Transaksi</p>',
                                    '<p class="text-[10px] text-primary-200/80">Pantau stok obat secara real-time dan rekap kasir otomatis.</p>',
                                '</div>',
                            '</div>',
                        '</div>',
                    '</div>',

                    // Footer instansi
                    '<div class="relative z-10 text-xs text-primary-300/80">',
                        '<p>&copy; 2026 Apotek &amp; Klinik Aulia. Hak Cipta Dilindungi.</p>',
                        '<p class="text-[10px] text-primary-400 mt-0.5">Mendukung Keamanan Rekam Medis Enkripsi End-to-End.</p>',
                    '</div>',
                '</div>',

                // === PANEL KANAN: Form Login ===
                '<div class="col-span-12 lg:col-span-7 xl:col-span-8 flex items-center justify-center p-6 sm:p-12 md:p-16 min-h-screen">',
                    '<div class="w-full max-w-md space-y-8">',
                        
                        // Mobile Header (Shows only on mobile/tablet)
                        '<div class="lg:hidden text-center space-y-3">',
                            '<div class="inline-flex p-3 bg-primary-600 rounded-2xl shadow-lg shadow-primary-500/20 text-white mb-2 items-center justify-center">',
                                dynamicLogoHtml,
                            '</div>',
                            '<h2 class="text-2xl font-black tracking-tight text-slate-800 dark:text-white leading-none">' + Utils.escapeHtml(brandName) + '</h2>',
                            '<p class="text-xs text-slate-500 dark:text-slate-400">' + Utils.escapeHtml(brandSub) + '</p>',
                        '</div>',

                        // Desktop Header
                        '<div class="hidden lg:block space-y-2">',
                            '<h2 class="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Selamat Datang Kembali</h2>',
                            '<p class="text-sm text-slate-500 dark:text-slate-400">Silakan masukkan kredensial terdaftar untuk masuk ke aplikasi.</p>',
                        '</div>',

                        // Card Form
                        '<div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-6 sm:p-8 shadow-xl shadow-slate-100 dark:shadow-none space-y-6 transition-all duration-300">',
                            
                            // Alert error global
                            '<div id="login-error"',
                                ' class="hidden p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-700 dark:text-red-400 flex items-start gap-2.5 animate-pulse">',
                                '<span class="flex-shrink-0 mt-0.5">' + SVGIcons.error + '</span>',
                                '<span id="login-error-msg" class="leading-relaxed"></span>',
                            '</div>',

                            '<form id="form-login-core" class="space-y-5" onsubmit="return false;">',
                                
                                // FIELD: Email
                                '<div class="space-y-1.5 relative">',
                                    '<div class="flex justify-between items-center">',
                                        '<label for="login-email" class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Alamat Email</label>',
                                        '<span id="email-validation-badge" class="hidden text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"></span>',
                                    '</div>',
                                    '<div class="relative">',
                                        '<div class="absolute inset-y-0 left-3 flex items-center pointer-events-none" id="email-left-icon">',
                                            SVGIcons.mail,
                                        '</div>',
                                        '<input type="email" id="login-email" autocomplete="email" required',
                                            ' class="w-full pl-10 pr-10 py-3 border border-slate-200 dark:border-slate-600',
                                            ' dark:bg-slate-700 dark:text-white rounded-xl text-sm transition-all duration-200 outline-none',
                                            ' focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"',
                                            ' placeholder="nama@aulia.com" value="' + savedEmail + '">',
                                        '<div class="absolute inset-y-0 right-3 flex items-center pointer-events-none hidden" id="email-status-icon">',
                                        '</div>',
                                    '</div>',
                                    '<p id="email-error-text" class="hidden text-[11px] text-red-600 dark:text-red-400 font-semibold leading-tight mt-1 pl-1"></p>',
                                '</div>',

                                // FIELD: Password
                                '<div class="space-y-1.5 relative">',
                                    '<div class="flex justify-between items-center">',
                                        '<label for="login-pass" class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kata Sandi</label>',
                                        '<span id="pass-validation-badge" class="hidden text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"></span>',
                                    '</div>',
                                    '<div class="relative">',
                                        '<div class="absolute inset-y-0 left-3 flex items-center pointer-events-none" id="pass-left-icon">',
                                            SVGIcons.lock,
                                        '</div>',
                                        '<input type="password" id="login-pass" autocomplete="current-password" required',
                                            ' class="w-full pl-10 pr-20 py-3 border border-slate-200 dark:border-slate-600',
                                            ' dark:bg-slate-700 dark:text-white rounded-xl text-sm transition-all duration-200 outline-none',
                                            ' focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"',
                                            ' placeholder="Minimal 6 karakter">',
                                        
                                        // Password Strength Meter Label Overlay
                                        '<div class="absolute inset-y-0 right-10 flex items-center pointer-events-none text-[10px] font-bold uppercase tracking-wider px-1.5 hidden" id="pass-strength-label">',
                                        '</div>',

                                        '<button type="button" id="toggle-pass" tabindex="-1"',
                                            ' class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none transition-colors p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700">',
                                            '<i data-lucide="eye" class="w-4 h-4" id="pass-icon"></i>',
                                        '</button>',
                                    '</div>',
                                    
                                    // Password Strength progress bars
                                    '<div class="hidden grid grid-cols-4 gap-1.5 pt-1.5" id="pass-strength-meter">',
                                        '<div class="h-1 rounded-full bg-slate-200 dark:bg-slate-700 transition-all duration-300" id="bar-1"></div>',
                                        '<div class="h-1 rounded-full bg-slate-200 dark:bg-slate-700 transition-all duration-300" id="bar-2"></div>',
                                        '<div class="h-1 rounded-full bg-slate-200 dark:bg-slate-700 transition-all duration-300" id="bar-3"></div>',
                                        '<div class="h-1 rounded-full bg-slate-200 dark:bg-slate-700 transition-all duration-300" id="bar-4"></div>',
                                    '</div>',

                                    '<p id="pass-error-text" class="hidden text-[11px] text-red-600 dark:text-red-400 font-semibold leading-tight mt-1 pl-1"></p>',
                                '</div>',

                                // REMEMBER ME & RESET LINK
                                '<div class="flex items-center justify-between pt-1">',
                                    '<label class="flex items-center gap-2 cursor-pointer group">',
                                        '<input type="checkbox" id="login-remember" ' + isRemembered + ' class="sr-only peer">',
                                        '<div class="w-9 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[\'\'] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600 relative"></div>',
                                        '<span class="text-xs font-semibold text-slate-600 dark:text-slate-300 group-hover:text-slate-800 dark:group-hover:text-white transition-colors">Ingat Saya</span>',
                                    '</label>',
                                    '<a href="https://t.me/AuliaSystemHelpdesk" target="_blank" class="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline">Butuh Bantuan?</a>',
                                '</div>',

                                // BUTTON SUBMIT
                                '<button type="submit" id="btn-login"',
                                    ' class="w-full bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-primary-500/15 flex items-center justify-center gap-2.5 shadow-md">',
                                    '<i data-lucide="log-in" class="w-4 h-4" id="btn-login-icon"></i>',
                                    '<span id="btn-login-text">Masuk</span>',
                                '</button>',

                                // BUTTON KEMBALI KE BERANDA (LANDING PAGE)
                                '<button type="button" onclick="AppLanding.hideLoginAndShowLanding()"',
                                    ' class="w-full mt-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 dark:active:bg-slate-500 text-slate-700 dark:text-slate-200 font-bold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2.5 shadow-sm">',
                                    '<i data-lucide="arrow-left" class="w-4 h-4"></i>',
                                    '<span>Kembali ke Beranda</span>',
                                '</button>',

                            '</form>',
                        '</div>',

                        // Footer text on mobile
                        '<p class="lg:hidden text-center text-[10px] text-slate-400 dark:text-slate-500 mt-5">&copy; 2026 Aulia System. All rights reserved.</p>',

                    '</div>',
                '</div>',

            '</div>'
        ].join('');

        document.body.appendChild(overlay);
        if (window.lucide) lucide.createIcons();

        // DOM Elements
        var emailInput = overlay.querySelector('#login-email');
        var emailError = overlay.querySelector('#email-error-text');
        var emailBadge = overlay.querySelector('#email-validation-badge');
        var emailStatusIcon = overlay.querySelector('#email-status-icon');
        var emailLeftIcon = overlay.querySelector('#email-left-icon');

        var passInput  = overlay.querySelector('#login-pass');
        var passError  = overlay.querySelector('#pass-error-text');
        var passBadge  = overlay.querySelector('#pass-validation-badge');
        var passLeftIcon  = overlay.querySelector('#pass-left-icon');
        var passStrengthMeter = overlay.querySelector('#pass-strength-meter');
        var passStrengthLabel = overlay.querySelector('#pass-strength-label');
        var toggleBtn  = overlay.querySelector('#toggle-pass');
        var passIcon   = overlay.querySelector('#pass-icon');

        var rememberCheck = overlay.querySelector('#login-remember');
        var btnLogin   = overlay.querySelector('#btn-login');
        var btnText    = overlay.querySelector('#btn-login-text');
        var btnIcon    = overlay.querySelector('#btn-login-icon');
        var errorBox   = overlay.querySelector('#login-error');
        var errorMsg   = overlay.querySelector('#login-error-msg');
        var formCore   = overlay.querySelector('#form-login-core');

        // State validation flags
        var isEmailValid = false;
        var isPassValid = false;

        // ── Helper 1: Validasi Email Real-time ──
        function validateEmailCore() {
            var val = (emailInput.value || '').trim();
            if (!val) {
                isEmailValid = false;
                emailInput.className = emailInput.className.replace(/border-(red-500|green-500|slate-200|slate-600)/g, '').trim() + ' border-red-500';
                emailError.textContent = 'Alamat email wajib diisi.';
                emailError.classList.remove('hidden');
                emailBadge.textContent = 'Kosong';
                emailBadge.className = 'text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400';
                emailBadge.classList.remove('hidden');
                emailStatusIcon.innerHTML = SVGIcons.error;
                emailStatusIcon.classList.remove('hidden');
                return;
            }

            var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(val)) {
                isEmailValid = false;
                emailInput.className = emailInput.className.replace(/border-(red-500|green-500|slate-200|slate-600)/g, '').trim() + ' border-red-500';
                emailError.textContent = 'Format email tidak valid (Contoh: dokter@aulia.com).';
                emailError.classList.remove('hidden');
                emailBadge.textContent = 'Format Salah';
                emailBadge.className = 'text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400';
                emailBadge.classList.remove('hidden');
                emailStatusIcon.innerHTML = SVGIcons.error;
                emailStatusIcon.classList.remove('hidden');
                return;
            }

            // Valid State
            isEmailValid = true;
            emailInput.className = emailInput.className.replace(/border-(red-500|green-500|slate-200|slate-600)/g, '').trim() + ' border-green-500';
            emailError.classList.add('hidden');
            emailBadge.textContent = 'Benar';
            emailBadge.className = 'text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-400';
            emailBadge.classList.remove('hidden');
            emailStatusIcon.innerHTML = SVGIcons.success;
            emailStatusIcon.classList.remove('hidden');
        }

        // ── Helper 2: Validasi Password & Strength Meter Real-time ──
        function validatePasswordCore() {
            var val = passInput.value || '';
            
            if (!val) {
                isPassValid = false;
                passInput.className = passInput.className.replace(/border-(red-500|green-500|slate-200|slate-600)/g, '').trim() + ' border-red-500';
                passError.textContent = 'Kata sandi wajib diisi.';
                passError.classList.remove('hidden');
                passBadge.textContent = 'Kosong';
                passBadge.className = 'text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400';
                passBadge.classList.remove('hidden');
                passStrengthMeter.classList.add('hidden');
                passStrengthLabel.classList.add('hidden');
                return;
            }

            if (val.length < 6) {
                isPassValid = false;
                passInput.className = passInput.className.replace(/border-(red-500|green-500|slate-200|slate-600)/g, '').trim() + ' border-red-500';
                passError.textContent = 'Kata sandi minimal terdiri dari 6 karakter.';
                passError.classList.remove('hidden');
                passBadge.textContent = 'Terlalu Pendek';
                passBadge.className = 'text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400';
                passBadge.classList.remove('hidden');
                passStrengthMeter.classList.add('hidden');
                passStrengthLabel.classList.add('hidden');
                return;
            }

            // Valid Length -> calculate strength
            isPassValid = true;
            passInput.className = passInput.className.replace(/border-(red-500|green-500|slate-200|slate-600)/g, '').trim() + ' border-green-500';
            passError.classList.add('hidden');
            passBadge.textContent = 'Benar';
            passBadge.className = 'text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-400';
            passBadge.classList.remove('hidden');

            // Hitung skor kekuatan (0 s.d 4)
            var score = 0;
            if (val.length >= 6) score++; // length check
            if (/[a-z]/.test(val) && /[A-Z]/.test(val)) score++; // mixed case check
            if (/\d/.test(val)) score++; // digit check
            if (/[^A-Za-z0-9]/.test(val)) score++; // special char check

            passStrengthMeter.classList.remove('hidden');
            var bars = [
                passStrengthMeter.querySelector('#bar-1'),
                passStrengthMeter.querySelector('#bar-2'),
                passStrengthMeter.querySelector('#bar-3'),
                passStrengthMeter.querySelector('#bar-4')
            ];

            // Reset bars
            bars.forEach(function (bar) {
                bar.className = 'h-1 rounded-full bg-slate-200 dark:bg-slate-700 transition-all duration-300';
            });

            passStrengthLabel.classList.remove('hidden');

            if (score === 1) {
                bars[0].className = 'h-1 rounded-full bg-red-500';
                passStrengthLabel.textContent = 'Lemah';
                passStrengthLabel.className = 'absolute inset-y-0 right-10 flex items-center pointer-events-none text-[9px] font-bold uppercase tracking-wider text-red-500';
            } else if (score === 2) {
                bars[0].className = 'h-1 rounded-full bg-orange-500';
                bars[1].className = 'h-1 rounded-full bg-orange-500';
                passStrengthLabel.textContent = 'Sedang';
                passStrengthLabel.className = 'absolute inset-y-0 right-10 flex items-center pointer-events-none text-[9px] font-bold uppercase tracking-wider text-orange-500';
            } else if (score === 3) {
                bars[0].className = 'h-1 rounded-full bg-amber-500';
                bars[1].className = 'h-1 rounded-full bg-amber-500';
                bars[2].className = 'h-1 rounded-full bg-amber-500';
                passStrengthLabel.textContent = 'Kuat';
                passStrengthLabel.className = 'absolute inset-y-0 right-10 flex items-center pointer-events-none text-[9px] font-bold uppercase tracking-wider text-amber-500';
            } else if (score === 4) {
                bars[0].className = 'h-1 rounded-full bg-green-500';
                bars[1].className = 'h-1 rounded-full bg-green-500';
                bars[2].className = 'h-1 rounded-full bg-green-500';
                bars[3].className = 'h-1 rounded-full bg-green-500';
                passStrengthLabel.textContent = 'Sangat Kuat';
                passStrengthLabel.className = 'absolute inset-y-0 right-10 flex items-center pointer-events-none text-[9px] font-bold uppercase tracking-wider text-green-500';
            }
        }

        // Attach Real-time input listeners
        if (emailInput) {
            emailInput.addEventListener('input', validateEmailCore);
            emailInput.addEventListener('blur', validateEmailCore);
        }
        if (passInput) {
            passInput.addEventListener('input', validatePasswordCore);
            passInput.addEventListener('blur', validatePasswordCore);
        }

        // ── Event: Toggle Password Visibility ──
        if (toggleBtn && passInput) {
            toggleBtn.addEventListener('click', function () {
                var isHidden = passInput.type === 'password';
                passInput.type = isHidden ? 'text' : 'password';
                passIcon.setAttribute('data-lucide', isHidden ? 'eye-off' : 'eye');
                if (window.lucide) lucide.createIcons({ el: toggleBtn });
            });
        }

        // ── Helper 3: Alert Global Error Handler ──
        function showError(msg) {
            if (errorBox && errorMsg) {
                errorMsg.textContent = msg;
                errorBox.classList.remove('hidden');
                // Scroll to top of card so error is visible
                errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }

        function hideError() {
            if (errorBox) errorBox.classList.add('hidden');
        }

        // ── Helper 4: Loading State UI ──
        function setLoading(loading) {
            if (!btnLogin) return;
            btnLogin.disabled = loading;
            if (emailInput) emailInput.disabled = loading;
            if (passInput) passInput.disabled = loading;
            if (rememberCheck) rememberCheck.disabled = loading;

            if (loading) {
                btnText.textContent = 'Memverifikasi...';
                btnIcon.setAttribute('data-lucide', 'loader');
                btnLogin.classList.add('opacity-75', 'cursor-not-allowed');
                btnLogin.classList.remove('hover:shadow-lg');
            } else {
                btnText.textContent = 'Masuk';
                btnIcon.setAttribute('data-lucide', 'log-in');
                btnLogin.classList.remove('opacity-75', 'cursor-not-allowed');
                btnLogin.classList.add('hover:shadow-lg');
            }
            if (window.lucide) lucide.createIcons({ el: btnLogin });
        }

        // ── Core Function: Login Submission ──
        function doLogin() {
            hideError();

            // Jalankan validasi sekali lagi secara komprehensif
            validateEmailCore();
            validatePasswordCore();

            if (!isEmailValid || !isPassValid) {
                showError('Mohon isi formulir masuk dengan benar sebelum melanjutkan.');
                if (!isEmailValid && emailInput) emailInput.focus();
                else if (!isPassValid && passInput) passInput.focus();
                return;
            }

            var email = (emailInput.value || '').trim();
            var pass  = passInput.value || '';

            setLoading(true);

            firebase.auth().signInWithEmailAndPassword(email, pass)
                .then(function () {
                    // Berhasil masuk
                    // Simpan email ke localStorage jika checkbox Ingat Saya aktif
                    if (rememberCheck && rememberCheck.checked) {
                        localStorage.setItem('aulia_remember_email', email);
                    } else {
                        localStorage.removeItem('aulia_remember_email');
                    }
                    
                    setLoading(false);
                })
                .catch(function (err) {
                    setLoading(false);
                    var msg = self._translateError(err.code);
                    showError(msg);
                    console.error('[AUTH] Login error:', err.code, err.message);
                });
        }

        // Submit listener
        if (formCore) {
            formCore.addEventListener('submit', function (e) {
                e.preventDefault();
                doLogin();
            });
        }

        // Trigger focus email input on mount
        setTimeout(function () { 
            if (emailInput) {
                emailInput.focus();
                if (savedEmail) {
                    validateEmailCore(); // pre-validate if auto-filled
                }
            } 
        }, 200);
    },

    logout: function () {
        App.logout();
    }
};
