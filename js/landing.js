/**
 * js/landing.js
 * Landing Page Apotek & Klinik Aulia - Modern, Elegan, dan Interaktif
 * Architecture: Block-driven rendering (Puzzle blocks) allowing full drag-and-drop/custom layout configuration
 */

window.AppLanding = {
    isActive: false,
    selectedDay: 'Senin',
    doctorSearchQuery: '',
    selectedLabTests: {
        gds: false,
        kolesterol: false,
        asamurat: false,
        tensi: true
    },
    currentConfig: null,

    medicineDatabase: [
        { name: "Paracetamol 500mg", type: "Obat Bebas (Hijau)", price: "Rp 8.500 / strip", desc: "Meredakan demam dan sakit kepala ringan.", stock: "Sangat Banyak", category: "Analgesik & Antipiretik" },
        { name: "Amoxicillin 500mg", type: "Obat Keras (Resep Dokter)", price: "Rp 12.000 / strip", desc: "Antibiotik untuk mengobati infeksi bakteri.", stock: "Tersedia", category: "Antibiotik" },
        { name: "Cetirizine 10mg", type: "Obat Bebas Terbatas (Biru)", price: "Rp 15.000 / strip", desc: "Mengatasi gejala alergi seperti gatal dan bersin.", stock: "Tersedia", category: "Antihistamin" },
        { name: "Ibuprofen 400mg", type: "Obat Bebas Terbatas (Biru)", price: "Rp 9.000 / strip", desc: "Meredakan nyeri sedang hingga berat dan peradangan.", stock: "Tersedia", category: "Antiinflamasi" },
        { name: "Vitamin C 500mg", type: "Suplemen Bebas", price: "Rp 20.000 / botol", desc: "Meningkatkan daya tahan tubuh dan antioksidan.", stock: "Banyak", category: "Vitamin & Suplemen" },
        { name: "Antimo Anak Sachet", type: "Obat Bebas (Hijau)", price: "Rp 7.000 / kotak", desc: "Mencegah mabuk perjalanan pada anak-anak.", stock: "Tersedia", category: "Mabuk Perjalanan" },
        { name: "OBH Combi Batuk Berdahak", type: "Obat Bebas Terbatas (Biru)", price: "Rp 18.500 / botol", desc: "Meredakan batuk disertai dahak membandel.", stock: "Tersedia", category: "Obat Batuk" },
        { name: "Diapet Kapsul", type: "Obat Herbal Terstandar", price: "Rp 6.500 / strip", desc: "Membantu meredakan diare dan memadatkan feses.", stock: "Banyak", category: "Diare / Pencernaan" }
    ],

    defaultConfig: {
        brandName: "AULIA Apotek dan Praktik Dokter Mandiri",
        brandSub: "Apotek & Praktik Dokter Terpadu",
        logoImg: "logo-192.png",
        logoSvg: '<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>',
        waNumber: "6281234567890",
        phone: "+62 812-3456-7890",
        email: "klinikapotekaulia@gmail.com",
        address: "Jl. Raya Jatinegara No. 45, Jatinegara, Jakarta Timur, DKI Jakarta",
        mapLatitude: -6.215024,
        mapLongitude: 106.870535,
        mapZoom: 15,
        socials: {
            facebook: "https://facebook.com/auliaapotek",
            instagram: "https://instagram.com/auliaapotek",
            twitter: "https://twitter.com/auliaapotek"
        },
        blocks: [
            {
                id: "hero",
                type: "hero",
                enabled: true,
                title: "Pelayanan Farmasi & Klinik Medis Profesional",
                tagline: "100% Asli - Terintegrasi SatuSehat Kemenkes",
                desc: "Selamat datang di AULIA Apotek dan Praktik Dokter Mandiri. Nikmati tebus resep obat resmi dengan jaminan suhu simpan ketat, layanan konsultasi dokter yang bersahabat, serta rekam medis elektronik yang terpantau aman.",
                img: "src/assets/images/aulia_pharmacy_hero_1784452733559.jpg",
                ctaText: "Lihat Jadwal Dokter & Konsultasi",
                labCtaText: "Kalkulator Cek Lab"
            },
            {
                id: "stats",
                type: "stats",
                enabled: true,
                items: [
                    { value: "3.000+", label: "Jenis Obat BPOM" },
                    { value: "100%", label: "SatuSehat Valid" },
                    { value: "10+", label: "Dokter & Bidan" },
                    { value: "< 10 Menit", label: "Antrean Tebus" }
                ]
            },
            {
                id: "doctor-schedule",
                type: "doctor-schedule",
                enabled: true,
                title: "Jadwal Praktik Mingguan",
                heading: "Konsultasi Medis Dengan Dokter Spesialis & Umum",
                desc: "Pilih hari untuk melihat dokter yang bertugas dan langsung booking antrian via WhatsApp.",
                schedules: {
                    "Senin": [
                        { name: "dr. Hendra Wijaya, Sp.PD", spec: "Spesialis Penyakit Dalam", hours: "08:00 - 12:00 & 16:00 - 20:00", img: "src/assets/images/dokter1.png" },
                        { name: "dr. Aulia Rahma, M.Gizi", spec: "Poli Umum & Konsultan Gizi", hours: "09:00 - 15:00", img: "src/assets/images/dokter2.png" },
                        { name: "drg. Shinta Clarissa", spec: "Poli Gigi & Mulut", hours: "13:00 - 17:00", img: "src/assets/images/dokter3.png" }
                    ],
                    "Selasa": [
                        { name: "dr. Hendra Wijaya, Sp.PD", spec: "Spesialis Penyakit Dalam", hours: "16:00 - 20:00", img: "src/assets/images/dokter1.png" },
                        { name: "dr. Aulia Rahma, M.Gizi", spec: "Poli Umum & Gizi", hours: "09:00 - 15:00", img: "src/assets/images/dokter2.png" },
                        { name: "dr. Faisal Akbar, Sp.A", spec: "Spesialis Kesehatan Anak", hours: "08:00 - 12:00", img: "src/assets/images/dokter1.png" }
                    ],
                    "Rabu": [
                        { name: "dr. Hendra Wijaya, Sp.PD", spec: "Spesialis Penyakit Dalam", hours: "08:00 - 12:00", img: "src/assets/images/dokter1.png" },
                        { name: "drg. Shinta Clarissa", spec: "Poli Gigi & Mulut", hours: "13:00 - 17:00", img: "src/assets/images/dokter3.png" },
                        { name: "Bidan Ningsih, S.Tr.Keb", spec: "Poli KIA / Kebidanan", hours: "08:00 - 14:00", img: "src/assets/images/dokter2.png" }
                    ],
                    "Kamis": [
                        { name: "dr. Aulia Rahma, M.Gizi", spec: "Poli Umum", hours: "09:00 - 15:00", img: "src/assets/images/dokter2.png" },
                        { name: "dr. Faisal Akbar, Sp.A", spec: "Spesialis Kesehatan Anak", hours: "15:00 - 19:00", img: "src/assets/images/dokter1.png" },
                        { name: "drg. Shinta Clarissa", spec: "Poli Gigi & Mulut", hours: "09:00 - 12:00", img: "src/assets/images/dokter3.png" }
                    ],
                    "Jumat": [
                        { name: "dr. Hendra Wijaya, Sp.PD", spec: "Spesialis Penyakit Dalam", hours: "16:00 - 20:00", img: "src/assets/images/dokter1.png" },
                        { name: "dr. Aulia Rahma, M.Gizi", spec: "Poli Umum", hours: "09:00 - 15:00", img: "src/assets/images/dokter2.png" },
                        { name: "Bidan Ningsih, S.Tr.Keb", spec: "Poli KIA", hours: "08:00 - 14:00", img: "src/assets/images/dokter2.png" }
                    ],
                    "Sabtu": [
                        { name: "dr. Faisal Akbar, Sp.A", spec: "Spesialis Kesehatan Anak", hours: "08:00 - 12:00", img: "src/assets/images/dokter1.png" },
                        { name: "drg. Shinta Clarissa", spec: "Poli Gigi & Mulut", hours: "09:00 - 13:00", img: "src/assets/images/dokter3.png" },
                        { name: "dr. Aulia Rahma, M.Gizi", spec: "Poli Umum", hours: "13:00 - 17:00", img: "src/assets/images/dokter2.png" }
                    ]
                },
                profiles: [
                    { name: "dr. Hendra Wijaya, Sp.PD", spec: "Spesialis Penyakit Dalam", bio: "Dokter Spesialis Penyakit Dalam lulusan Universitas Indonesia. Berpengalaman menangani penyakit kronis seperti diabetes, hipertensi, gangguan lambung, ginjal, dan jantung secara holistik.", img: "src/assets/images/dokter1.png", education: "S1 Kedokteran UI, Sp.PD Spesialis Penyakit Dalam UI" },
                    { name: "dr. Aulia Rahma, M.Gizi", spec: "Poli Umum & Konsultan Gizi", bio: "Dokter Gizi Klinik lulusan Universitas Gadjah Mada. Membantu konsultasi gizi, diet penurunan berat badan sehat, pemulihan pasca sakit, serta nutrisi ibu hamil.", img: "src/assets/images/dokter2.png", education: "S1 Kedokteran UGM, Magister Gizi Klinis UGM" },
                    { name: "drg. Shinta Clarissa", spec: "Poli Gigi & Mulut", bio: "Dokter Gigi lulusan Universitas Padjadjaran. Ahli dalam merawat kesehatan gigi, scaling karang gigi, penambalan estetik, serta pencabutan gigi anak tanpa nyeri.", img: "src/assets/images/dokter3.png", education: "S1 Pendidikan Dokter Gigi UNPAD" },
                    { name: "dr. Faisal Akbar, Sp.A", spec: "Spesialis Kesehatan Anak", bio: "Dokter Spesialis Anak lulusan Universitas Airlangga. Melayani imunisasi lengkap, pemantauan tumbuh kembang anak, penanganan demam, asma, serta alergi pediatrik.", img: "src/assets/images/dokter1.png", education: "S1 Kedokteran UNAIR, Sp.A Spesialis Anak UNAIR" }
                ]
            },
            {
                id: "services",
                type: "services",
                enabled: true,
                title: "Komitmen Layanan",
                heading: "Kenyamanan Ruang & Kepedulian Medis yang Tulus",
                desc: "Setiap fasilitas ruang tunggu, apotek pelayanan resep, dan ruang periksa dokter di AULIA Apotek dan Praktik Dokter Mandiri didesain dengan konsep modern, sejuk, dan higienis demi memberikan rasa tenang bagi seluruh pasien saat melakukan kunjungan pengobatan.",
                img: "src/assets/images/aulia_clinic_doctor_1784453434618.jpg",
                items: [
                    { title: "Poli Umum & Gizi", desc: "Konsultasi keluhan umum, resep obat, dan edukasi pola hidup gizi seimbang oleh dokter berpengalaman.", icon: "heart" },
                    { title: "Kebidanan / KIA", desc: "Pemeriksaan kehamilan rutin oleh bidan terdaftar, suntik KB, imunisasi balita, dan konsultasi laktasi ibu.", icon: "plus-circle" },
                    { title: "Poli Gigi & Mulut", desc: "Penambalan gigi estetis, pencabutan tanpa sakit, pembersihan karang gigi (scaling), dan konsultasi ortho.", icon: "scissors" },
                    { title: "Homecare & Layanan Resep", desc: "Layanan rawat medis sederhana di rumah pasien serta layanan antar-resep tebus obat bagi pasien sekitar.", icon: "home" }
                ]
            },
            {
                id: "lab-check",
                type: "lab-check",
                enabled: true,
                title: "Fasilitas Penunjang Medis",
                heading: "Kalkulator Cek Lab Mandiri & Skrining Cepat",
                desc: "Pilih jenis pemeriksaan penunjang instan di bawah ini untuk estimasi biaya transparan.",
                tests: [
                    { id: "gds", name: "Gula Darah Sewaktu (GDS)", price: 15000, desc: "Mengukur kadar glukosa dalam darah secara instan." },
                    { id: "kolesterol", name: "Kolesterol Total", price: 25000, desc: "Skrining risiko penyakit kardiovaskular." },
                    { id: "asamurat", name: "Asam Urat (Uric Acid)", price: 20000, desc: "Skrining gejala pegal linu dan radang sendi gout." }
                ]
            },
            {
                id: "lobby-hero",
                type: "lobby-hero",
                enabled: true,
                title: "Kenyamanan Fasilitas",
                heading: "Ruang Tunggu Modern, Sejuk & Ramah Anak",
                desc: "Kami percaya kesembuhan dimulai sejak Anda melangkah masuk. Seluruh area dilengkapi sirkulasi udara bersih, penyejuk ruangan, air minum gratis, serta area ramah anak.",
                img: "src/assets/images/aulia_clinic_lobby_1784453450466.jpg",
                badges: ["Ramah & Responsif", "Ruangan Sejuk & Nyaman", "Apoteker Bersertifikat Resmi"]
            },
            {
                id: "gallery",
                type: "gallery",
                enabled: true,
                title: "Galeri Foto Fasilitas",
                heading: "Dokumentasi Kenyamanan & Pelayanan Kami",
                desc: "Lihat suasana fisik, ruang tunggu, apotek, dan sarana medis modern yang kami sediakan untuk kenyamanan pengobatan Anda.",
                items: [
                    { img: "src/assets/images/aulia_clinic_lobby_1784453450466.jpg", caption: "Lobi & Ruang Tunggu Utama" },
                    { img: "src/assets/images/aulia_pharmacy_hero_1784452733559.jpg", caption: "Pelayanan Apotek & Resep Cepat" },
                    { img: "src/assets/images/aulia_clinic_doctor_1784453434618.jpg", caption: "Ruang Periksa & Konsultasi Medis" }
                ],
                orgTitle: "Struktur Organisasi Aulia",
                orgSubtitle: "Bagan Manajemen & Kepemimpinan Operasional",
                orgDesc: "Sinergi profesional medis, apoteker, dan staf administrasi untuk menghadirkan pelayanan kesehatan prima di Klinik & Apotek Aulia.",
                orgMembers: [
                    { name: "H. Aulia Rahman, S.Farm., Apt.", role: "Direktur / Pemilik", dept: "Direksi Utama", img: "src/assets/images/dokter1.png" },
                    { name: "dr. Hendra Wijaya, Sp.PD", role: "Dokter Penanggung Jawab Klinik", dept: "Pelayanan Medis", img: "src/assets/images/dokter1.png" },
                    { name: "Rina Kartika, S.Farm., Apt.", role: "Kepala Apoteker", dept: "Divisi Farmasi & Obat", img: "src/assets/images/dokter2.png" },
                    { name: "Siti Rahma, A.Md.Keb", role: "Kepala Keperawatan", dept: "Pelayanan Keperawatan", img: "src/assets/images/dokter3.png" },
                    { name: "Budi Santoso, S.Kom", role: "Kepala Administrasi & TI", dept: "Keuangan & Operasional", img: "src/assets/images/dokter1.png" }
                ]
            },
            {
                id: "testimonials",
                type: "testimonials",
                enabled: true,
                title: "Testimoni Pasien Lokal",
                heading: "Ulasan Jujur Dari Warga Sekitar",
                items: [
                    { name: "Ibu Rina Setyowati", text: "Obat di Apotek Aulia sangat lengkap! Resep dokter spesialis saya dari rumah sakit selalu bisa ditebus di sini tanpa perlu inden. Penjelasan apotekernya sangat profesional.", stars: 5 },
                    { name: "Bapak Ahmad Hidayat", text: "Sangat terbantu dengan kalkulator cek lab mandiri dan layanannya yang murah meriah. Gula darah, kolesterol, asam urat langsung diperiksa dalam hitungan menit!", stars: 5 },
                    { name: "Sdr. Dimas Pratama", text: "Kliniknya sangat modern dan rekam medisnya terintegrasi aman. Saya bisa berobat dengan tenang karena seluruh riwayat obat saya tercatat rapi di sistem.", stars: 5 }
                ]
            },
            {
                id: "faq",
                type: "faq",
                enabled: true,
                title: "Pertanyaan Umum (FAQ)",
                heading: "Menjawab Kebutuhan Informasi Anda",
                items: [
                    { question: "Apakah Apotek & Klinik Aulia menerima resep obat dari luar / rumah sakit lain?", answer: "Ya, kami menerima tebus resep obat resmi dari dokter rumah sakit luar, puskesmas, maupun klinik swasta. Tim apoteker kami akan memverifikasi ketersediaan obat dan membimbing aturan minum obat yang tepat." },
                    { question: "Bagaimana keaslian dan keamanan obat yang dijual di Apotek Aulia terjamin?", answer: "Kami berkolaborasi secara eksklusif dengan Pedagang Besar Farmasi (PBF) yang berizin resmi BPOM dan Kemenkes. Seluruh rantai dingin (cold chain) obat-obatan penting disimpan sesuai regulasi standar farmasi internasional." },
                    { question: "Apakah rekam medis kunjungan pasien terkirim otomatis ke aplikasi SatuSehat?", answer: "Ya, sistem kami telah terintegrasi penuh ke SatuSehat Kemenkes RI melalui arsitektur HL7 FHIR. Setiap resep obat dan riwayat pemeriksaan medis Anda akan tersimpan aman dan terakses dari aplikasi seluler SatuSehat Anda." }
                ]
            },
            {
                id: "contact",
                type: "contact",
                enabled: true,
                title: "Kontak & Lokasi",
                heading: "Hubungi Kami Langsung",
                desc: "Jangan ragu menghubungi kami atau kunjungi klinik fisik kami untuk pengobatan medis dan farmasi langsung."
            }
        ]
    },

    scrollToSection: function (id) {
        var container = document.getElementById('landing-overlay');
        var target = document.getElementById(id);
        if (container && target) {
            container.scrollTo({
                top: target.offsetTop - 80,
                behavior: 'smooth'
            });
            var mobileMenu = document.getElementById('landing-mobile-menu');
            if (mobileMenu) {
                mobileMenu.classList.add('hidden');
            }
        }
    },

    toggleMobileMenu: function () {
        var menu = document.getElementById('landing-mobile-menu');
        if (menu) {
            menu.classList.toggle('hidden');
        }
    },

    showLogin: function () {
        if (window.AppAuth && typeof window.AppAuth.renderLogin === 'function') {
            window.AppAuth.renderLogin();
        }
    },

    hideLoginAndShowLanding: function () {
        var loginOverlay = document.getElementById('login-overlay');
        if (loginOverlay) {
            loginOverlay.remove();
        }
    },

    searchMedicine: function () {
        var input = document.getElementById('medicine-search-input');
        var resultsContainer = document.getElementById('medicine-search-results');
        if (!input || !resultsContainer) return;

        var query = input.value.trim().toLowerCase();
        if (query.length === 0) {
            resultsContainer.innerHTML = '';
            resultsContainer.classList.add('hidden');
            return;
        }

        var matches = this.medicineDatabase.filter(function (med) {
            return med.name.toLowerCase().includes(query) || med.category.toLowerCase().includes(query);
        });

        resultsContainer.classList.remove('hidden');

        if (matches.length === 0) {
            resultsContainer.innerHTML = [
                '<div class="p-4 text-center text-slate-500 dark:text-slate-400">',
                    '<p class="font-semibold text-sm">Obat tidak ditemukan di pencarian cepat</p>',
                    '<p class="text-xs mt-1">Kami memiliki 3,000+ stok obat. Tekan tombol di bawah untuk bertanya langsung via WhatsApp.</p>',
                    '<a href="https://wa.me/' + (this.currentConfig ? this.currentConfig.waNumber : '6281234567890') + '?text=Halo%20Apotek%20Aulia,%20apakah%20obat%20' + encodeURIComponent(input.value) + '%20tersedia?" target="_blank"',
                        ' class="mt-3 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-md">',
                        '<svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.859-4.42 9.863-9.864.002-2.634-1.02-5.11-2.881-6.974C16.592 1.9 14.116.88 11.48.878c-5.437 0-9.858 4.42-9.862 9.864-.001 1.773.465 3.5 1.348 5.014l-.991 3.616 3.712-.975zm13.114-7.587c-.31-.154-1.836-.906-2.12-.11-.284.28-.11.11.284.444.11.077.155.11.11.19-.077.11-.426.685-.905 1.12-.41.37-.775.41-.93.31-.155-.077-.655-.24-1.248-.77-.46-.41-.77-.916-.86-1.07-.09-.153-.01-.235.067-.312.07-.07.155-.18.23-.27.078-.09.103-.153.155-.258.05-.103.025-.19-.012-.27-.038-.077-.342-.826-.47-1.127-.123-.3-.263-.258-.363-.263h-.31c-.103 0-.27.038-.413.193-.143.155-.543.53-.543 1.293s.556 1.5.633 1.603c.078.11 1.094 1.67 2.65 2.343.37.16.658.256.884.328.372.12.71.103.978.063.3-.044.906-.37 1.034-.727.127-.354.127-.658.09-.727-.038-.07-.154-.11-.464-.263z"/></svg>',
                        '<span>Tanya Stok Lewat WhatsApp</span>',
                    '</a>',
                '</div>'
            ].join('');
            return;
        }

        var html = '<div class="space-y-3">';
        matches.forEach(function (med) {
            html += [
                '<div class="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/50 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all duration-200">',
                    '<div>',
                        '<div class="flex items-center gap-2">',
                            '<h5 class="font-bold text-slate-800 dark:text-white text-sm">' + med.name + '</h5>',
                            '<span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400">' + med.category + '</span>',
                        '</div>',
                        '<p class="text-xs text-slate-500 dark:text-slate-400 mt-1">' + med.desc + '</p>',
                        '<p class="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Klasifikasi: ' + med.type + ' | Stok: <span class="font-bold text-emerald-600 dark:text-emerald-400">' + med.stock + '</span></p>',
                    '</div>',
                    '<div class="mt-3 sm:mt-0 flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">',
                        '<p class="font-black text-emerald-600 dark:text-emerald-400 text-sm">' + med.price + '</p>',
                        '<a href="https://wa.me/' + (AppLanding.currentConfig ? AppLanding.currentConfig.waNumber : '6281234567890') + '?text=Halo%20Apotek%20Aulia,%20saya%20ingin%20memesan%20obat%20' + encodeURIComponent(med.name) + '" target="_blank"',
                            ' class="bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs px-3 py-2 rounded-xl shadow-sm hover:shadow-primary-500/20 transition flex items-center gap-1.5">',
                            '<i data-lucide="shopping-cart" class="w-3.5 h-3.5"></i>',
                            '<span>Pesan</span>',
                        '</a>',
                    '</div>',
                '</div>'
            ].join('');
        });
        html += '</div>';

        resultsContainer.innerHTML = html;
        if (window.lucide) {
            lucide.createIcons({ el: resultsContainer });
        }
    },

    handleDoctorSearch: function(query) {
        this.doctorSearchQuery = query || '';
        this.selectDoctorDay(this.selectedDay || 'Senin');
    },

    selectDoctorDay: function (day) {
        this.selectedDay = day;
        
        // Update styling tombol tab
        var tabs = document.querySelectorAll('.doctor-day-tab');
        tabs.forEach(function (tab) {
            if (tab.getAttribute('data-day') === day) {
                tab.className = "doctor-day-tab px-4 py-2 bg-gradient-to-r from-primary-600 to-emerald-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all duration-200";
            } else {
                tab.className = "doctor-day-tab px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 font-semibold text-xs sm:text-sm rounded-xl transition-all duration-200";
            }
        });

        // Find doctor block
        if (!this.currentConfig || !this.currentConfig.blocks) {
            console.warn('Config belum siap.');
            return;
        }

        var scheduleBlock = this.currentConfig.blocks.find(function(b) { return b.type === 'doctor-schedule'; });
        var scheduleContainer = document.getElementById('doctor-schedule-list');
        if (!scheduleContainer) return;

        var query = (this.doctorSearchQuery || '').trim().toLowerCase();
        var html = '';

        if (query) {
            // Search mode: search across ALL days
            var allSchedules = [];
            var days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
            
            days.forEach(function(d) {
                var daySchedules = (scheduleBlock && scheduleBlock.schedules && scheduleBlock.schedules[d]) ? scheduleBlock.schedules[d] : [];
                daySchedules.forEach(function(doc) {
                    var docName = (doc.name || '').toLowerCase();
                    var docSpec = (doc.spec || '').toLowerCase();
                    if (docName.indexOf(query) !== -1 || docSpec.indexOf(query) !== -1) {
                        allSchedules.push({
                            doc: doc,
                            day: d
                        });
                    }
                });
            });

            if (allSchedules.length === 0) {
                scheduleContainer.innerHTML = '<div class="col-span-2 text-center py-10 text-slate-400 text-xs bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-850">Tidak menemukan jadwal dokter dengan pencarian "' + Utils.escapeHtml(this.doctorSearchQuery) + '".</div>';
                return;
            }

            allSchedules.forEach(function (item, idx) {
                var doc = item.doc;
                var d = item.day;
                var docName = doc.name || "Dokter";
                var avatarText = "DR";
                if (typeof docName === 'string' && docName.trim().length > 0) {
                    var parts = docName.split(' ');
                    var sliceStart = parts[0].toLowerCase().startsWith('dr') ? 1 : 0;
                    avatarText = parts.slice(sliceStart, sliceStart + 2).map(function(n){ return n ? n[0] : ''; }).join('').toUpperCase() || "DR";
                }

                var avatarHtml = '';
                if (doc.img) {
                    avatarHtml = '<img src="' + Utils.escapeHtml(doc.img) + '" class="w-11 h-11 rounded-full object-cover border border-emerald-500/20 shadow-sm" alt="' + Utils.escapeHtml(docName) + '">';
                } else {
                    avatarHtml = '<div class="w-11 h-11 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm tracking-wider">' + avatarText + '</div>';
                }

                var bioHtml = '';
                if (doc.bio) {
                    bioHtml = '<p class="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 italic leading-snug line-clamp-2 max-w-xs">' + Utils.escapeHtml(doc.bio) + '</p>';
                }

                html += [
                    '<div class="doctor-schedule-card animate-fade-in-up flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 border border-slate-150/80 dark:border-slate-800/80 rounded-2xl shadow-sm hover:shadow-md transition duration-300" style="animation-delay: ' + (idx * 50) + 'ms;">',
                        '<div class="flex items-center gap-4">',
                            avatarHtml,
                            '<div>',
                                '<div class="flex flex-wrap items-center gap-1.5">',
                                    '<h5 class="font-black text-slate-800 dark:text-white text-xs sm:text-sm leading-tight">' + Utils.escapeHtml(docName) + '</h5>',
                                    '<span class="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded text-[9px] font-black uppercase tracking-wider">' + d + '</span>',
                                '</div>',
                                '<p class="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">' + Utils.escapeHtml(doc.spec || "Poli Umum") + '</p>',
                                bioHtml,
                                '<p class="text-[10px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">',
                                    '<svg class="w-3 h-3 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
                                    '<span>Jam Praktik: ' + Utils.escapeHtml(doc.hours || "-") + '</span>',
                                '</p>',
                            '</div>',
                        '</div>',
                        '<a href="https://wa.me/' + (AppLanding.currentConfig ? AppLanding.currentConfig.waNumber : '6281234567890') + '?text=Halo%20Apotek%20Klinik%20Aulia,%20saya%20ingin%2520konsultasi%20dengan%2520' + encodeURIComponent(docName) + '%20pada%20hari%20' + d + '" target="_blank"',
                            ' class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] sm:text-xs px-3.5 py-2 rounded-xl shadow-sm hover:shadow-emerald-500/20 transition flex items-center gap-1 shrink-0">',
                            '<span>Daftar</span>',
                        '</a>',
                    '</div>'
                ].join('');
            });

        } else {
            // Standard day selection mode
            var schedules = (scheduleBlock && scheduleBlock.schedules && scheduleBlock.schedules[day]) ? scheduleBlock.schedules[day] : [];

            if (schedules.length === 0) {
                scheduleContainer.innerHTML = '<div class="col-span-2 text-center py-8 text-slate-400 text-xs bg-slate-50 dark:bg-slate-900 rounded-xl">Tidak ada jadwal praktek hari ini.</div>';
                return;
            }

            schedules.forEach(function (doc, idx) {
                var docName = doc.name || "Dokter";
                var avatarText = "DR";
                if (typeof docName === 'string' && docName.trim().length > 0) {
                    var parts = docName.split(' ');
                    var sliceStart = parts[0].toLowerCase().startsWith('dr') ? 1 : 0;
                    avatarText = parts.slice(sliceStart, sliceStart + 2).map(function(n){ return n ? n[0] : ''; }).join('').toUpperCase() || "DR";
                }

                var avatarHtml = '';
                if (doc.img) {
                    avatarHtml = '<img src="' + Utils.escapeHtml(doc.img) + '" class="w-11 h-11 rounded-full object-cover border border-emerald-500/20 shadow-sm" alt="' + Utils.escapeHtml(docName) + '">';
                } else {
                    avatarHtml = '<div class="w-11 h-11 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm tracking-wider">' + avatarText + '</div>';
                }

                var bioHtml = '';
                if (doc.bio) {
                    bioHtml = '<p class="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 italic leading-snug line-clamp-2 max-w-xs">' + Utils.escapeHtml(doc.bio) + '</p>';
                }

                html += [
                    '<div class="doctor-schedule-card animate-fade-in-up flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 border border-slate-150/80 dark:border-slate-800/80 rounded-2xl shadow-sm hover:shadow-md transition duration-300" style="animation-delay: ' + (idx * 50) + 'ms;">',
                        '<div class="flex items-center gap-4">',
                            avatarHtml,
                            '<div>',
                                '<h5 class="font-black text-slate-800 dark:text-white text-xs sm:text-sm leading-tight">' + Utils.escapeHtml(docName) + '</h5>',
                                '<p class="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">' + Utils.escapeHtml(doc.spec || "Poli Umum") + '</p>',
                                bioHtml,
                                '<p class="text-[10px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">',
                                    '<svg class="w-3 h-3 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
                                    '<span>Jam Praktik: ' + Utils.escapeHtml(doc.hours || "-") + '</span>',
                                '</p>',
                            '</div>',
                        '</div>',
                        '<a href="https://wa.me/' + (AppLanding.currentConfig ? AppLanding.currentConfig.waNumber : '6281234567890') + '?text=Halo%20Apotek%20Klinik%20Aulia,%20saya%20ingin%2520konsultasi%20dengan%2520' + encodeURIComponent(docName) + '%20pada%20hari%20' + day + '" target="_blank"',
                            ' class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] sm:text-xs px-3.5 py-2 rounded-xl shadow-sm hover:shadow-emerald-500/20 transition flex items-center gap-1 shrink-0">',
                            '<span>Daftar</span>',
                        '</a>',
                    '</div>'
                ].join('');
            });
        }

        scheduleContainer.innerHTML = html;
        if (window.lucide) {
            lucide.createIcons({ el: scheduleContainer });
        }
    },

    toggleLabTest: function (testId) {
        this.selectedLabTests[testId] = !this.selectedLabTests[testId];
        this.calculateLabCosts();
    },

    calculateLabCosts: function () {
        var sum = 0;
        var itemsSelected = [];
        var self = this;

        // Find lab block tests
        var labBlock = this.currentConfig ? this.currentConfig.blocks.find(function(b) { return b.type === 'lab-check'; }) : null;
        var tests = labBlock ? labBlock.tests : [
            { id: "gds", name: "Gula Darah Sewaktu (GDS)", price: 15000 },
            { id: "kolesterol", name: "Kolesterol Total", price: 25000 },
            { id: "asamurat", name: "Asam Urat (Uric Acid)", price: 20000 }
        ];

        tests.forEach(function(test) {
            if (self.selectedLabTests[test.id]) {
                sum += test.price;
                itemsSelected.push(test.name + " (Rp " + test.price.toLocaleString('id-ID') + ")");
            }
        });

        if (this.selectedLabTests.tensi) {
            itemsSelected.push("Tensi Darah (Gratis)");
        }

        var totalFormatted = sum === 0 ? "Gratis" : "Rp " + sum.toLocaleString('id-ID');
        
        var totalEl = document.getElementById('lab-total-price');
        var summaryEl = document.getElementById('lab-summary-text');
        var bookBtn = document.getElementById('lab-book-btn');

        if (totalEl) totalEl.innerText = totalFormatted;
        if (summaryEl) {
            summaryEl.innerHTML = itemsSelected.length > 0 
                ? "Pilihan Anda: " + itemsSelected.join(', ')
                : "Silakan pilih salah satu jenis tes laboratorium sederhana di samping.";
        }

        if (bookBtn) {
            var msg = "Halo Apotek & Klinik Aulia, saya ingin mendaftar Cek Lab Mandiri: " + itemsSelected.join(', ') + " dengan total estimasi: " + totalFormatted;
            bookBtn.href = "https://wa.me/" + (this.currentConfig ? this.currentConfig.waNumber : "6281234567890") + "?text=" + encodeURIComponent(msg);
        }
    },

    toggleFaq: function (index) {
        var content = document.getElementById('faq-content-' + index);
        var chevron = document.getElementById('faq-chevron-' + index);
        if (content && chevron) {
            var isOpen = !content.classList.contains('hidden');
            if (isOpen) {
                content.classList.add('hidden');
                chevron.style.transform = 'rotate(0deg)';
            } else {
                content.classList.remove('hidden');
                chevron.style.transform = 'rotate(180deg)';
            }
        }
    },

    mapInstance: null,

    initMap: function() {
        var self = this;
        var mapEl = document.getElementById('landing-map');
        if (!mapEl) return;

        var loader = document.getElementById('landing-map-loader');

        var lat = (self.currentConfig && self.currentConfig.mapLatitude) ? Number(self.currentConfig.mapLatitude) : -6.215024;
        var lng = (self.currentConfig && self.currentConfig.mapLongitude) ? Number(self.currentConfig.mapLongitude) : 106.870535;
        var zoom = (self.currentConfig && self.currentConfig.mapZoom) ? Number(self.currentConfig.mapZoom) : 15;

        if (self.mapInstance) {
            try {
                self.mapInstance.remove();
            } catch (e) {
                console.error("Error removing old map instance", e);
            }
            self.mapInstance = null;
        }

        if (typeof L === 'undefined') {
            console.warn("Leaflet library not loaded yet.");
            if (loader) {
                loader.innerHTML = '<span class="text-xs text-rose-500 font-bold">Peta tidak dapat dimuat (gagal mengunduh pustaka Leaflet)</span>';
            }
            return;
        }

        try {
            self.mapInstance = L.map('landing-map', {
                scrollWheelZoom: false,
                zoomControl: true
            }).setView([lat, lng], zoom);

            var isDark = document.documentElement.classList.contains('dark');
            var tileUrl = isDark 
                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
                : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
                
            var attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

            L.tileLayer(tileUrl, {
                attribution: attribution,
                maxZoom: 20
            }).addTo(self.mapInstance);

            var marker = L.marker([lat, lng]).addTo(self.mapInstance);
            
            var brandName = (self.currentConfig && self.currentConfig.brandName) ? self.currentConfig.brandName : "Apotek & Klinik Aulia";
            var addressText = (self.currentConfig && self.currentConfig.address) ? self.currentConfig.address : "";
            
            marker.bindPopup('<div class="p-2 font-sans text-xs space-y-1" style="min-width: 150px;"><h6 class="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">' + Utils.escapeHtml(brandName) + '</h6><p class="text-slate-600 dark:text-slate-400 font-medium leading-normal">' + Utils.escapeHtml(addressText) + '</p><div class="pt-1.5"><a href="https://www.google.com/maps/search/?api=1&query=' + lat + ',' + lng + '" target="_blank" class="text-white bg-emerald-600 px-2.5 py-1.5 rounded font-bold hover:bg-emerald-700 transition block text-center text-[10px]">Petunjuk Arah</a></div></div>').openPopup();

            if (loader) {
                loader.style.opacity = '0';
                setTimeout(function() {
                    loader.remove();
                }, 300);
            }

            setTimeout(function() {
                if (self.mapInstance) {
                    self.mapInstance.invalidateSize();
                }
            }, 250);

        } catch (error) {
            console.error("Failed to initialize Leaflet map:", error);
            if (loader) {
                loader.innerHTML = '<span class="text-xs text-rose-500 font-bold">Gagal memuat peta interaktif.</span>';
            }
        }
    },

    render: function () {
        var self = this;
        self.isActive = true;

        var existing = document.getElementById('landing-overlay');
        if (existing) return;

        db.collection('pengaturan').doc('landing').get().then(function (doc) {
            var cloudConfig = doc.exists ? doc.data() : {};
            
            // To prevent missing values from newly added blocks/parameters, we merge carefully
            var finalConfig = JSON.parse(JSON.stringify(self.defaultConfig));
            
            // Override general properties
            if (cloudConfig.brandName) finalConfig.brandName = cloudConfig.brandName;
            if (cloudConfig.brandSub) finalConfig.brandSub = cloudConfig.brandSub;
            if (cloudConfig.logoImg !== undefined) finalConfig.logoImg = cloudConfig.logoImg;
            if (cloudConfig.logoSvg) finalConfig.logoSvg = cloudConfig.logoSvg;
            if (cloudConfig.waNumber) finalConfig.waNumber = cloudConfig.waNumber;
            if (cloudConfig.phone) finalConfig.phone = cloudConfig.phone;
            if (cloudConfig.email) finalConfig.email = cloudConfig.email;
            if (cloudConfig.address) finalConfig.address = cloudConfig.address;
            if (cloudConfig.mapLatitude !== undefined) finalConfig.mapLatitude = cloudConfig.mapLatitude;
            if (cloudConfig.mapLongitude !== undefined) finalConfig.mapLongitude = cloudConfig.mapLongitude;
            if (cloudConfig.mapZoom !== undefined) finalConfig.mapZoom = cloudConfig.mapZoom;
            
            if (cloudConfig.socials && typeof cloudConfig.socials === 'object') {
                finalConfig.socials = Object.assign({}, finalConfig.socials, cloudConfig.socials);
            }
            if (!finalConfig.socials || typeof finalConfig.socials !== 'object') {
                finalConfig.socials = { facebook: "", instagram: "", twitter: "" };
            } else {
                if (typeof finalConfig.socials.facebook !== 'string') finalConfig.socials.facebook = "";
                if (typeof finalConfig.socials.instagram !== 'string') finalConfig.socials.instagram = "";
                if (typeof finalConfig.socials.twitter !== 'string') finalConfig.socials.twitter = "";
            }
            
            if (cloudConfig.blocks && Array.isArray(cloudConfig.blocks)) {
                var mergedBlocks = [];
                // First, add all blocks from cloudConfig, merged with defaults
                cloudConfig.blocks.forEach(function(cloudBlock) {
                    var defaultBlock = finalConfig.blocks.find(function(b) { return b.id === cloudBlock.id || b.type === cloudBlock.type; });
                    
                    // If image is empty/missing or an unsplash placeholder in cloud, remove the property so Object.assign doesn't overwrite default
                    if (defaultBlock) {
                        if (cloudBlock.hasOwnProperty('img')) {
                            var imgStr = String(cloudBlock.img || '').trim();
                            if (!imgStr || imgStr === '' || imgStr.indexOf('unsplash.com') !== -1) {
                                delete cloudBlock.img;
                            }
                        }
                    }

                    // Special deep merging for doctor schedules to avoid losing default doctor photos
                    if (cloudBlock.type === 'doctor-schedule' && cloudBlock.schedules) {
                        var mergedSchedules = {};
                        var days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
                        days.forEach(function(day) {
                            var defaultDayList = (defaultBlock && defaultBlock.schedules) ? defaultBlock.schedules[day] : null;
                            var cloudDayList = cloudBlock.schedules[day];
                            if (cloudDayList && Array.isArray(cloudDayList)) {
                                mergedSchedules[day] = cloudDayList.map(function(cloudDoc) {
                                    var defaultDoc = defaultDayList ? defaultDayList.find(function(d) { return d.name === cloudDoc.name; }) : null;
                                    var mergedDoc = Object.assign({}, defaultDoc || {}, cloudDoc);
                                    var docImg = String(mergedDoc.img || '').trim();
                                    if ((!docImg || docImg === '' || docImg.indexOf('unsplash.com') !== -1) && defaultDoc && defaultDoc.img) {
                                        mergedDoc.img = defaultDoc.img;
                                    }
                                    return mergedDoc;
                                });
                            } else if (defaultDayList) {
                                mergedSchedules[day] = defaultDayList;
                            }
                        });
                        cloudBlock.schedules = mergedSchedules;
                    }

                    // Special deep merging for doctor profiles to avoid losing default doctor photos
                    if (cloudBlock.type === 'doctor-schedule' && cloudBlock.profiles && Array.isArray(cloudBlock.profiles)) {
                        var defaultProfs = defaultBlock ? defaultBlock.profiles : [];
                        cloudBlock.profiles = cloudBlock.profiles.map(function(cloudProf, idx) {
                            var defaultProf = defaultProfs[idx];
                            var mergedProf = Object.assign({}, defaultProf || {}, cloudProf);
                            var profImg = String(mergedProf.img || '').trim();
                            if ((!profImg || profImg === '' || profImg.indexOf('unsplash.com') !== -1) && defaultProf && defaultProf.img) {
                                mergedProf.img = defaultProf.img;
                            }
                            return mergedProf;
                        });
                    } else if (cloudBlock.type === 'doctor-schedule' && defaultBlock && defaultBlock.profiles) {
                        cloudBlock.profiles = defaultBlock.profiles;
                    }

                    // Special deep merging for gallery items to avoid losing default gallery photos
                    if (cloudBlock.type === 'gallery' && cloudBlock.items && Array.isArray(cloudBlock.items)) {
                        var defaultItems = defaultBlock ? defaultBlock.items : [];
                        cloudBlock.items = cloudBlock.items.map(function(cloudItem, idx) {
                            var defaultItem = defaultItems[idx];
                            var mergedItem = Object.assign({}, defaultItem || {}, cloudItem);
                            var itemImg = String(mergedItem.img || '').trim();
                            if ((!itemImg || itemImg === '' || itemImg.indexOf('unsplash.com') !== -1) && defaultItem && defaultItem.img) {
                                mergedItem.img = defaultItem.img;
                            }
                            return mergedItem;
                        });
                    }

                    // Special deep merging for gallery orgMembers to avoid losing default member photos
                    if (cloudBlock.type === 'gallery' && cloudBlock.orgMembers && Array.isArray(cloudBlock.orgMembers)) {
                        var defaultOrg = defaultBlock ? defaultBlock.orgMembers : [];
                        cloudBlock.orgMembers = cloudBlock.orgMembers.map(function(cloudM, idx) {
                            var defaultM = defaultOrg[idx];
                            var mergedM = Object.assign({}, defaultM || {}, cloudM);
                            var mImg = String(mergedM.img || '').trim();
                            if ((!mImg || mImg === '' || mImg.indexOf('unsplash.com') !== -1) && defaultM && defaultM.img) {
                                mergedM.img = defaultM.img;
                            }
                            return mergedM;
                        });
                    } else if (cloudBlock.type === 'gallery' && defaultBlock && defaultBlock.orgMembers) {
                        cloudBlock.orgMembers = defaultBlock.orgMembers;
                    }

                    mergedBlocks.push(Object.assign({}, defaultBlock || {}, cloudBlock));
                });
                // Then, add any default blocks that are NOT present in cloudConfig
                finalConfig.blocks.forEach(function(defaultBlock) {
                    var exists = cloudConfig.blocks.some(function(b) { return b.id === defaultBlock.id || b.type === defaultBlock.type; });
                    if (!exists) {
                        mergedBlocks.push(defaultBlock);
                    }
                });
                finalConfig.blocks = mergedBlocks;
            }

            self.currentConfig = finalConfig;
            self.executeRender(finalConfig);
        }).catch(function (err) {
            console.warn('Gagal memuat kustomisasi landing page, menggunakan default:', err);
            self.currentConfig = self.defaultConfig;
            self.executeRender(self.defaultConfig);
        });
    },

    // BLOCK RENDERERS
    renderHeroBlock: function(block, config) {
        return [
            '<section id="landing-hero" class="relative overflow-hidden py-16 lg:py-24 px-4 sm:px-6 bg-gradient-to-br from-slate-50 via-emerald-50/10 to-slate-50 dark:from-slate-950 dark:via-emerald-950/10 dark:to-slate-950">',
                '<div class="absolute top-20 right-10 w-96 h-96 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none"></div>',
                '<div class="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-primary-400/5 blur-3xl pointer-events-none"></div>',
                '<div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">',
                    '<div class="lg:col-span-7 space-y-6 lg:pr-6">',
                        block.tagline ? [
                            '<div class="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-200 dark:border-emerald-900/40">',
                                '<i data-lucide="shield-check" class="w-4 h-4 text-emerald-600"></i>',
                                '<span>' + Utils.escapeHtml(block.tagline) + '</span>',
                            '</div>'
                        ].join('') : '',
                        '<h2 class="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-800 dark:text-white leading-tight">',
                            Utils.escapeHtml(block.title),
                        '</h2>',
                        '<p class="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl">',
                            Utils.escapeHtml(block.desc),
                        '</p>',
                        // INTERACTIVE QUICK SEARCH BAR
                        '<div class="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-xl space-y-2.5">',
                            '<div class="flex items-center gap-2 text-[11px] font-black uppercase text-emerald-600 dark:text-emerald-400">',
                                '<i data-lucide="search" class="w-3.5 h-3.5"></i>',
                                '<span>Cek Ketersediaan &amp; Harga Obat Cepat</span>',
                            '</div>',
                            '<div class="relative">',
                                '<input type="text" id="medicine-search-input" oninput="AppLanding.searchMedicine()" ',
                                    'class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20" ',
                                    'placeholder="Ketik nama obat... (Contoh: Paracetamol, Amoxicillin, Vitamin C)">',
                            '</div>',
                            '<div id="medicine-search-results" class="hidden max-h-60 overflow-y-auto border-t border-slate-100 dark:border-slate-800 pt-2"></div>',
                        '</div>',
                        '<div class="flex flex-col sm:flex-row gap-3.5 pt-2">',
                            '<button onclick="AppLanding.scrollToSection(\'landing-doctor-schedule\')" class="bg-gradient-to-r from-emerald-600 to-primary-600 hover:from-emerald-700 hover:to-primary-700 text-white font-bold text-xs px-6 py-3.5 rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all duration-200 flex items-center justify-center gap-2">',
                                '<i data-lucide="calendar" class="w-4 h-4"></i>',
                                '<span>' + Utils.escapeHtml(block.ctaText || "Lihat Jadwal") + '</span>',
                            '</button>',
                            '<button onclick="AppLanding.scrollToSection(\'landing-lab-check\')" class="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs px-6 py-3.5 rounded-xl shadow-sm transition flex items-center justify-center gap-2">',
                                '<i data-lucide="calculator" class="w-4 h-4"></i>',
                                '<span>' + Utils.escapeHtml(block.labCtaText || "Kalkulator Cek Lab") + '</span>',
                            '</button>',
                        '</div>',
                    '</div>',
                    // Image Column
                    '<div class="lg:col-span-5 relative flex items-center justify-center">',
                        '<div class="relative w-full max-w-md lg:max-w-none group">',
                            '<div class="absolute -inset-1.5 bg-gradient-to-r from-emerald-500 to-primary-500 rounded-2xl blur opacity-30 group-hover:opacity-40 transition duration-1000"></div>',
                            '<div class="relative bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-2xl overflow-hidden">',
                                '<img src="' + Utils.escapeHtml(block.img) + '" alt="Hero interior image"',
                                    ' class="hero-banner-img w-full h-auto rounded-xl object-cover aspect-[4/3] shadow-inner transform hover:scale-[1.01] transition-transform duration-500">',
                            '</div>',
                            '<div class="absolute -bottom-6 -left-6 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xl flex items-center gap-3 max-w-[200px]">',
                                '<div class="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">',
                                    '<i data-lucide="badge-check" class="w-5 h-5"></i>',
                                '</div>',
                                '<div>',
                                    '<p class="text-xs font-bold leading-none text-slate-800 dark:text-white">' + Utils.escapeHtml(config.brandName) + '</p>',
                                    '<p class="text-[9px] text-slate-400 mt-1">Stok diperbarui secara realtime.</p>',
                                '</div>',
                            '</div>',
                            '<div class="absolute -top-6 -right-6 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xl flex items-center gap-3 max-w-[180px]">',
                                '<div class="p-2.5 bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-lg">',
                                    '<i data-lucide="clock" class="w-5 h-5"></i>',
                                '</div>',
                                '<div>',
                                    '<p class="text-xs font-bold leading-none text-slate-800 dark:text-white">Jam Siaga</p>',
                                    '<p class="text-[9px] text-slate-400 mt-1">Setiap hari 07.00 - 22.00</p>',
                                '</div>',
                            '</div>',
                        '</div>',
                    '</div>',
                '</div>',
            '</section>'
        ].join('');
    },

    renderStatsBlock: function(block) {
        var itemsHtml = '';
        (block.items || []).forEach(function(item) {
            itemsHtml += [
                '<div>',
                    '<p class="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">' + Utils.escapeHtml(item.value) + '</p>',
                    '<p class="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-1">' + Utils.escapeHtml(item.label) + '</p>',
                '</div>'
            ].join('');
        });
        return [
            '<section class="py-10 bg-slate-100/50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800">',
                '<div class="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">',
                    itemsHtml,
                '</div>',
            '</section>'
        ].join('');
    },

    renderDoctorScheduleBlock: function(block) {
        var profilesHtml = '';
        var profiles = block.profiles || [];
        if (profiles.length > 0) {
            profilesHtml += [
                '<div class="border-t border-slate-100 dark:border-slate-900 pt-16 mt-16 space-y-10">',
                    '<div class="text-center space-y-2">',
                        '<span class="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Profil Dokter Spesialis &amp; Umum</span>',
                        '<h4 class="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">Kenali Dokter Ahli Kami</h4>',
                        '<p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">Tim tenaga medis profesional yang siap memberikan pelayanan kesehatan terbaik, ramah, dan berpengalaman untuk kesembuhan Anda.</p>',
                    '</div>',
                    '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">',
                        profiles.map(function(prof, idx) {
                            var profName = prof.name || "Dokter";
                            var avatarText = "DR";
                            if (typeof profName === 'string' && profName.trim().length > 0) {
                                var parts = profName.split(' ');
                                var sliceStart = parts[0].toLowerCase().startsWith('dr') ? 1 : 0;
                                avatarText = parts.slice(sliceStart, sliceStart + 2).map(function(n){ return n ? n[0] : ''; }).join('').toUpperCase() || "DR";
                            }

                            var avatarHtml = '';
                            if (prof.img) {
                                avatarHtml = '<img src="' + Utils.escapeHtml(prof.img) + '" class="w-full h-48 object-cover rounded-t-2xl transition-transform duration-500 group-hover:scale-105" alt="' + Utils.escapeHtml(profName) + '">';
                            } else {
                                avatarHtml = '<div class="w-full h-48 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-3xl tracking-wider rounded-t-2xl transition-transform duration-500 group-hover:scale-105">' + avatarText + '</div>';
                            }

                            var bioHtml = '';
                            if (prof.bio) {
                                bioHtml = '<p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-4 leading-relaxed mt-1">' + Utils.escapeHtml(prof.bio) + '</p>';
                            }

                            var eduHtml = '';
                            if (prof.education) {
                                eduHtml = '<p class="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5"><svg class="w-3.5 h-3.5 text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg><span class="truncate">Pendidikan: ' + Utils.escapeHtml(prof.education) + '</span></p>';
                            }

                            return [
                                '<div class="doctor-profile-card animate-fade-in-up bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col group" style="animation-delay: ' + (idx * 100) + 'ms;">',
                                    '<div class="overflow-hidden relative">',
                                        avatarHtml,
                                    '</div>',
                                    '<div class="p-4 flex-1 flex flex-col justify-between space-y-3">',
                                        '<div class="space-y-2">',
                                            '<div>',
                                                '<h5 class="font-black text-slate-800 dark:text-white text-sm sm:text-base leading-tight">' + Utils.escapeHtml(profName) + '</h5>',
                                                '<p class="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">' + Utils.escapeHtml(prof.spec || "Poli Umum") + '</p>',
                                            '</div>',
                                            eduHtml,
                                            bioHtml,
                                        '</div>',
                                        '<a href="https://wa.me/' + (AppLanding.currentConfig ? AppLanding.currentConfig.waNumber : '6281234567890') + '?text=Halo%20Apotek%20Klinik%20Aulia,%20saya%20ingin%20berkonsultasi%20dengan%20' + encodeURIComponent(profName) + '" target="_blank"',
                                            ' class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl text-center shadow-sm hover:shadow-emerald-500/20 transition-all block mt-2">',
                                            'Hubungi Dokter',
                                        '</a>',
                                    '</div>',
                                '</div>'
                            ].join('');
                        }).join(''),
                    '</div>',
                '</div>'
            ].join('');
        }

        return [
            '<section id="landing-doctor-schedule" class="py-16 px-4 sm:px-6 bg-white dark:bg-slate-950">',
                '<div class="max-w-5xl mx-auto space-y-10">',
                    '<div class="text-center space-y-2">',
                        '<span class="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">' + Utils.escapeHtml(block.title || "Jadwal Praktik") + '</span>',
                        '<h3 class="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white">' + Utils.escapeHtml(block.heading || "Dokter Siaga") + '</h3>',
                        '<p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400">' + Utils.escapeHtml(block.desc || "") + '</p>',
                    '</div>',
                    
                    // QUICK SEARCH BAR FOR DOCTOR / SPECIALTY
                    '<div class="max-w-md mx-auto relative group">',
                        '<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">',
                            '<svg class="w-4 h-4 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
                        '</div>',
                        '<input type="text" id="doctor-search-input" oninput="AppLanding.handleDoctorSearch(this.value)" placeholder="Cari nama dokter atau spesialisasi (contoh: gigi, anak, umum...)" ',
                            'class="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl text-xs sm:text-sm outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/20 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all shadow-inner">',
                    '</div>',

                    // Tabs
                    '<div class="flex flex-wrap justify-center gap-2" id="doctor-day-tabs-container">',
                        ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"].map(function(day) {
                            return '<button onclick="AppLanding.selectDoctorDay(\''+day+'\')" data-day="'+day+'" class="doctor-day-tab px-4 py-2 font-semibold text-xs sm:text-sm rounded-xl transition-all duration-200">'+day+'</button>';
                        }).join(""),
                    '</div>',
                    // Card listing
                    '<div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto" id="doctor-schedule-list"></div>',
                    // Doctor Profiles Grid
                    profilesHtml,
                '</div>',
            '</section>'
        ].join('');
    },

    renderServicesBlock: function(block) {
        var itemsHtml = '';
        (block.items || []).forEach(function(item) {
            var iconName = item.icon || 'heart';
            itemsHtml += [
                '<div class="group p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/40 dark:border-slate-700/40 shadow-sm flex gap-3 hover:shadow-md hover:border-emerald-500/20 dark:hover:border-emerald-500/30 transition-all duration-300 hover:-translate-y-0.5">',
                    '<div class="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl h-fit transition-all duration-300 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white shadow-sm shadow-emerald-500/5">',
                        '<i data-lucide="' + Utils.escapeHtml(iconName) + '" class="w-5 h-5 transition-transform duration-300 group-hover:rotate-12"></i>',
                    '</div>',
                    '<div>',
                        '<h5 class="font-black text-slate-800 dark:text-white text-xs sm:text-sm">' + Utils.escapeHtml(item.title) + '</h5>',
                        '<p class="text-[11px] text-slate-400 mt-1">' + Utils.escapeHtml(item.desc) + '</p>',
                    '</div>',
                '</div>'
            ].join('');
        });
        return [
            '<section id="landing-clinic-services" class="py-16 px-4 sm:px-6 bg-slate-50 dark:bg-slate-900 border-y border-slate-200/50 dark:border-slate-800/50">',
                '<div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">',
                    '<div class="lg:col-span-5 relative flex items-center justify-center">',
                        '<div class="relative w-full max-w-md lg:max-w-none">',
                            '<div class="absolute -inset-1.5 bg-gradient-to-r from-emerald-500 to-primary-500 rounded-2xl blur opacity-25"></div>',
                            '<div class="relative bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">',
                                '<img src="' + Utils.escapeHtml(block.img) + '" alt="Services Clinic Image"',
                                    ' class="services-section-img w-full h-auto rounded-xl object-cover aspect-[4/3] shadow-inner">',
                            '</div>',
                        '</div>',
                    '</div>',
                    '<div class="lg:col-span-7 space-y-6">',
                        '<span class="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">' + Utils.escapeHtml(block.title) + '</span>',
                        '<h3 class="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white">' + Utils.escapeHtml(block.heading) + '</h3>',
                        '<p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400">' + Utils.escapeHtml(block.desc) + '</p>',
                        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">',
                            itemsHtml,
                        '</div>',
                    '</div>',
                '</div>',
            '</section>'
        ].join('');
    },

    renderLabCheckBlock: function(block, config) {
        var checkOptionsHtml = '';
        (block.tests || []).forEach(function(test) {
            checkOptionsHtml += [
                '<label class="flex items-center gap-3 p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200/50 dark:border-slate-800/50 cursor-pointer hover:border-primary-500/50 transition">',
                    '<input type="checkbox" id="lab-' + test.id + '" onchange="AppLanding.toggleLabTest(\'' + test.id + '\')" class="rounded text-primary-600 focus:ring-primary-500 w-4 h-4">',
                    '<div>',
                        '<p class="text-xs font-bold text-slate-800 dark:text-white">' + Utils.escapeHtml(test.name) + '</p>',
                        '<p class="text-[10px] text-slate-400">' + Utils.escapeHtml(test.desc) + ' (Rp ' + test.price.toLocaleString('id-ID') + ')</p>',
                    '</div>',
                '</label>'
            ].join('');
        });

        return [
            '<section id="landing-lab-check" class="py-16 px-4 sm:px-6 bg-white dark:bg-slate-950">',
                '<div class="max-w-5xl mx-auto space-y-10">',
                    '<div class="text-center space-y-2">',
                        '<span class="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">' + Utils.escapeHtml(block.title) + '</span>',
                        '<h3 class="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white">' + Utils.escapeHtml(block.heading) + '</h3>',
                        '<p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400">' + Utils.escapeHtml(block.desc) + '</p>',
                    '</div>',
                    '<div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start max-w-4xl mx-auto">',
                        '<div class="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-4">',
                            '<h4 class="font-black text-slate-800 dark:text-white text-sm">Pilih Jenis Pemeriksaan Lab Sederhana</h4>',
                            '<div class="space-y-2.5">',
                                checkOptionsHtml,
                                '<label class="flex items-center gap-3 p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200/50 dark:border-slate-800/50 cursor-pointer hover:border-primary-500/50 transition">',
                                    '<input type="checkbox" id="lab-tensi" checked disabled class="rounded text-primary-600 w-4 h-4 bg-slate-100">',
                                    '<div>',
                                        '<p class="text-xs font-bold text-slate-800 dark:text-white">Tekanan Darah (Tensi)</p>',
                                        '<p class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Gratis untuk setiap kunjungan / konsultasi.</p>',
                                    '</div>',
                                '</label>',
                            '</div>',
                        '</div>',
                        // Cost Summary Card
                        '<div class="bg-gradient-to-br from-emerald-950 to-slate-900 text-white p-6 rounded-2xl border border-emerald-800/50 shadow-xl space-y-6 flex flex-col justify-between h-full min-h-[300px]">',
                            '<div class="space-y-4">',
                                '<div class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-bold uppercase tracking-wider">',
                                    '<i data-lucide="calculator" class="w-3.5 h-3.5"></i>',
                                    '<span>Ringkasan Estimasi Biaya</span>',
                                '</div>',
                                '<div>',
                                    '<p class="text-[10px] text-slate-400 uppercase tracking-widest font-black">Total Biaya Cek Lab</p>',
                                    '<h4 class="text-3xl sm:text-4xl font-black text-emerald-400 mt-1" id="lab-total-price">Rp 0</h4>',
                                '</div>',
                                '<p class="text-xs text-slate-300 leading-relaxed" id="lab-summary-text">',
                                    'Silakan pilih salah satu jenis tes laboratorium sederhana di samping.',
                                '</p>',
                            '</div>',
                            '<div class="space-y-2 border-t border-emerald-900/50 pt-4">',
                                '<p class="text-[10px] text-slate-400 leading-relaxed">Hasil pemeriksaan laboratorium instan langsung keluar dalam waktu &lt; 5 menit beserta konsultasi interpretasi hasil pemeriksaan.</p>',
                                '<a id="lab-book-btn" href="https://wa.me/' + Utils.escapeHtml(config.waNumber) + '" target="_blank"',
                                    ' class="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 rounded-xl shadow-md transition flex items-center justify-center gap-2">',
                                    '<i data-lucide="check-circle" class="w-4 h-4"></i>',
                                    '<span>Ambil Antrean Cek Lab Sekarang</span>',
                                '</a>',
                            '</div>',
                        '</div>',
                    '</div>',
                '</div>',
            '</section>'
        ].join('');
    },

    renderLobbyHeroBlock: function(block) {
        var badgesHtml = '';
        (block.badges || []).forEach(function(badge) {
            badgesHtml += [
                '<div class="flex items-center gap-2 text-xs text-slate-300">',
                    '<i data-lucide="check-circle" class="w-4 h-4 text-emerald-400"></i>',
                    '<span>' + Utils.escapeHtml(badge) + '</span>',
                '</div>'
            ].join('');
        });
        return [
            '<section class="relative overflow-hidden py-24 bg-slate-950 text-white flex items-center">',
                '<div class="absolute inset-0 bg-cover bg-center opacity-30" style="background-image: url(\'' + Utils.escapeHtml(block.img) + '\')"></div>',
                '<div class="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-transparent"></div>',
                '<div class="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 space-y-6 max-w-2xl">',
                    '<span class="text-xs font-bold uppercase tracking-wider text-emerald-400">' + Utils.escapeHtml(block.title) + '</span>',
                    '<h3 class="text-3xl sm:text-4xl font-black tracking-tight leading-tight">',
                        Utils.escapeHtml(block.heading),
                    '</h3>',
                    '<p class="text-slate-300 text-xs sm:text-sm leading-relaxed">',
                        Utils.escapeHtml(block.desc),
                    '</p>',
                    '<div class="flex flex-wrap gap-4 pt-2">',
                        badgesHtml,
                    '</div>',
                '</div>',
            '</section>'
        ].join('');
    },

    renderTestimonialsBlock: function(block) {
        var cardsHtml = '';
        (block.items || []).forEach(function(item) {
            var starsHtml = '';
            for (var i = 0; i < (item.stars || 5); i++) {
                starsHtml += '<i data-lucide="star" class="w-4 h-4 fill-current"></i>';
            }
            cardsHtml += [
                '<div class="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl space-y-3">',
                    '<div class="flex gap-1 text-amber-500">' + starsHtml + '</div>',
                    '<p class="text-xs text-slate-600 dark:text-slate-400 italic">"' + Utils.escapeHtml(item.text) + '"</p>',
                    '<p class="text-xs font-black text-slate-800 dark:text-white mt-4">— ' + Utils.escapeHtml(item.name) + '</p>',
                '</div>'
            ].join('');
        });
        return [
            '<section class="py-16 px-4 sm:px-6 bg-white dark:bg-slate-950 border-t border-slate-200/50 dark:border-slate-800/50">',
                '<div class="max-w-5xl mx-auto space-y-10">',
                    '<div class="text-center space-y-2">',
                        '<span class="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">' + Utils.escapeHtml(block.title) + '</span>',
                        '<h3 class="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white">' + Utils.escapeHtml(block.heading) + '</h3>',
                    '</div>',
                    '<div class="grid grid-cols-1 md:grid-cols-3 gap-6">',
                        cardsHtml,
                    '</div>',
                '</div>',
            '</section>'
        ].join('');
    },

    renderFaqBlock: function(block) {
        var faqItemsHtml = '';
        (block.items || []).forEach(function(item, idx) {
            var trueIndex = idx + 1;
            faqItemsHtml += [
                '<div class="bg-white dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl overflow-hidden shadow-sm">',
                    '<button onclick="AppLanding.toggleFaq(' + trueIndex + ')" class="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-xs sm:text-sm text-slate-800 dark:text-white focus:outline-none">',
                        '<span>' + Utils.escapeHtml(item.question) + '</span>',
                        '<svg id="faq-chevron-' + trueIndex + '" class="w-4 h-4 transition-transform duration-200" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>',
                    '</button>',
                    '<div id="faq-content-' + trueIndex + '" class="hidden px-5 pb-4 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3 leading-relaxed">',
                        Utils.escapeHtml(item.answer),
                    '</div>',
                '</div>'
            ].join('');
        });
        return [
            '<section class="py-16 px-4 sm:px-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200/50 dark:border-slate-800/50">',
                '<div class="max-w-4xl mx-auto space-y-8">',
                    '<div class="text-center space-y-2">',
                        '<span class="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">' + Utils.escapeHtml(block.title) + '</span>',
                        '<h3 class="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white">' + Utils.escapeHtml(block.heading) + '</h3>',
                    '</div>',
                    '<div class="space-y-3">',
                        faqItemsHtml,
                    '</div>',
                '</div>',
            '</section>'
        ].join('');
    },

    renderContactBlock: function(block, config) {
        return [
            '<section id="landing-contact" class="py-16 px-4 sm:px-6 bg-slate-100/60 dark:bg-slate-900 border-t border-slate-200/50 dark:border-slate-800/50">',
                '<div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">',
                    '<div class="lg:col-span-5 space-y-6">',
                        '<span class="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">' + Utils.escapeHtml(block.title) + '</span>',
                        '<h3 class="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white">' + Utils.escapeHtml(block.heading) + '</h3>',
                        '<p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400">' + Utils.escapeHtml(block.desc) + '</p>',
                        '<div class="space-y-3.5 pt-2">',
                            '<div class="flex gap-4 p-4 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">',
                                '<div class="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg h-11 w-11 flex items-center justify-center flex-shrink-0">',
                                    '<i data-lucide="map-pin" class="w-5 h-5"></i>',
                                '</div>',
                                '<div>',
                                    '<p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Alamat Fisik</p>',
                                    '<p class="text-xs sm:text-sm font-semibold text-slate-800 dark:text-white mt-1">' + Utils.escapeHtml(config.address) + '</p>',
                                '</div>',
                            '</div>',
                            '<div class="flex gap-4 p-4 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">',
                                '<div class="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg h-11 w-11 flex items-center justify-center flex-shrink-0">',
                                    '<i data-lucide="phone" class="w-5 h-5"></i>',
                                '</div>',
                                '<div>',
                                    '<p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Telepon &amp; WhatsApp</p>',
                                    '<p class="text-xs sm:text-sm font-semibold text-slate-800 dark:text-white mt-1">' + Utils.escapeHtml(config.phone) + '</p>',
                                '</div>',
                            '</div>',
                            '<div class="flex gap-4 p-4 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">',
                                '<div class="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg h-11 w-11 flex items-center justify-center flex-shrink-0">',
                                    '<i data-lucide="mail" class="w-5 h-5"></i>',
                                '</div>',
                                '<div>',
                                    '<p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Resmi</p>',
                                    '<p class="text-xs sm:text-sm font-semibold text-slate-800 dark:text-white mt-1">' + Utils.escapeHtml(config.email) + '</p>',
                                '</div>',
                            '</div>',
                        '</div>',
                    '</div>',
                    // Message Form
                    '<div class="lg:col-span-7 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-6 sm:p-8 shadow-sm space-y-6">',
                        '<h4 class="text-base sm:text-lg font-black text-slate-800 dark:text-white">Kirim Pesan Layanan Pelanggan</h4>',
                        '<form onsubmit="event.preventDefault(); window.Utils.toast(\'Pesan Anda berhasil diteruskan ke WhatsApp CS.\', \'success\'); var name = this.elements[0].value; var text = this.elements[1].value; window.open(\'https://wa.me/' + Utils.escapeHtml(config.waNumber) + '?text=Halo%20' + encodeURIComponent(config.brandName) + ',%20nama%20saya%20\'+encodeURIComponent(name)+\'.%20Pesan%20saya:%20\'+encodeURIComponent(text)); this.reset();" class="space-y-4">',
                            '<div class="space-y-1.5">',
                                '<label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Lengkap</label>',
                                '<input type="text" required class="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded-xl text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20" placeholder="Contoh: Budi Santoso">',
                            '</div>',
                            '<div class="space-y-1.5">',
                                '<label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Pesan atau Pertanyaan Anda</label>',
                                '<textarea required rows="4" class="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded-xl text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20" placeholder="Ketik pesan Anda di sini..."></textarea>',
                            '</div>',
                            '<button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3.5 rounded-xl shadow-md transition flex items-center justify-center gap-2">',
                                '<i data-lucide="send" class="w-4 h-4"></i>',
                                '<span>Kirim Pesan Ke Customer Support</span>',
                            '</button>',
                        '</form>',
                    '</div>',
                    
                    // LOKASI KAMI MODULE
                    '<div class="lg:col-span-12 mt-12 pt-10 border-t border-slate-200/60 dark:border-slate-800/60 space-y-6">',
                        '<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">',
                            '<div class="space-y-1">',
                                '<span class="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">PETA NAVIGASI PASIEN</span>',
                                '<h4 class="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">Lokasi Kami</h4>',
                                '<p class="text-xs text-slate-500 dark:text-slate-400">Klinik & Apotek Aulia sangat strategis dan dapat dengan mudah ditemukan di pinggir jalan raya Jatinegara.</p>',
                            '</div>',
                            '<div class="flex flex-wrap gap-2.5 shrink-0">',
                                '<a href="https://www.google.com/maps/search/?api=1&query=' + (config.mapLatitude || -6.215024) + ',' + (config.mapLongitude || 106.870535) + '" target="_blank" class="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:shadow-emerald-500/5 dark:hover:shadow-emerald-400/5 transition duration-300 flex items-center gap-2">',
                                    '<svg class="w-4 h-4 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>',
                                    '<span>Buka di Google Maps</span>',
                                '</a>',
                                '<a href="https://maps.apple.com/?q=' + (config.mapLatitude || -6.215024) + ',' + (config.mapLongitude || 106.870535) + '" target="_blank" class="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:shadow-emerald-500/5 dark:hover:shadow-emerald-400/5 transition duration-300 flex items-center gap-2">',
                                    '<svg class="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>',
                                    '<span>Apple Maps</span>',
                                '</a>',
                            '</div>',
                        '</div>',
                        
                        '<div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">',
                            '<!-- Peta Interaktif (Leaflet) -->',
                            '<div class="lg:col-span-8 relative rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm overflow-hidden bg-slate-100 dark:bg-slate-950 h-[380px] sm:h-[440px]" id="landing-map-container">',
                                '<div id="landing-map" class="absolute inset-0 w-full h-full z-10"></div>',
                                '<!-- Loader -->',
                                '<div id="landing-map-loader" class="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 z-20 text-slate-400 dark:text-slate-600 transition-opacity duration-300 pointer-events-none">',
                                    '<svg class="w-8 h-8 animate-spin text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>',
                                    '<span class="text-xs font-semibold mt-3 text-slate-500 dark:text-slate-400">Menyiapkan peta interaktif...</span>',
                                '</div>',
                            '</div>',
                            
                            '<!-- Petunjuk Navigasi & Informasi Tambahan -->',
                            '<div class="lg:col-span-4 flex flex-col justify-between gap-6 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-6 shadow-sm">',
                                '<div class="space-y-5">',
                                    '<h5 class="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">',
                                        '<svg class="w-4 h-4 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
                                        '<span>PETUNJUK JALAN</span>',
                                    '</h5>',
                                    
                                    '<div class="space-y-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">',
                                        '<div class="flex gap-3">',
                                            '<div class="p-1 h-5 w-5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded flex items-center justify-center flex-shrink-0 font-extrabold text-[10px]">1</div>',
                                            '<p><strong class="text-slate-800 dark:text-white font-bold">Transportasi Umum:</strong> Naik angkot/elf jurusan Majalengka - Talaga - Cikijing, lalu turun di sekitar Pasar Talaga atau pertigaan Talagakulon. Dari titik turun, lanjutkan berjalan kaki sekitar 5-10 menit menuju Jl. Raya Cikijing - Talaga No.17.</p>',
                                        '</div>',
                                        '<div class="flex gap-3">',
                                            '<div class="p-1 h-5 w-5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded flex items-center justify-center flex-shrink-0 font-extrabold text-[10px]">2</div>',
                                            '<p><strong class="text-slate-800 dark:text-white font-bold">Kendaraan Pribadi:</strong> Lokasi berada di sisi Jl. Raya Cikijing - Talaga (jalur utama Majalengka menuju Cikijing), dengan papan nama <span class="text-emerald-600 dark:text-emerald-400 font-bold">Apotek dan Klinik Mandiri</span>. Tersedia area parkir untuk roda dua di depan lokasi.</p>',
                                        '</div>',
                                        '<div class="flex gap-3">',
                                            '<div class="p-1 h-5 w-5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded flex items-center justify-center flex-shrink-0 font-extrabold text-[10px]">3</div>',
                                            '<p><strong class="text-slate-800 dark:text-white font-bold">Patokan Terdekat:</strong> Berada di wilayah Talagawetan, Kecamatan Talaga, tak jauh dari kawasan Pasar Talaga dan Toko Sepeda Hay Bike yang berada di jalan yang sama.</p>',
                                        '</div>',
                                    '</div>',
                                '</div>',
                                
                                '<div class="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2.5">',
                                    '<div class="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">',
                                        '<svg class="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
                                        '<span>Jam Operasional Fisik</span>',
                                    '</div>',
                                    '<p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">',
                                        'Apotek & Farmasi: <span class="font-extrabold text-slate-800 dark:text-white text-[11px]">Buka Setiap Hari (24 Jam)</span><br>',
                                        'Poliklinik Dokter: <span class="font-extrabold text-slate-800 dark:text-white text-[11px]">Senin - Sabtu (08:00 - 21:00)</span>',
                                    '</p>',
                                '</div>',
                            '</div>',
                        '</div>',
                    '</div>',
                '</div>',
            '</section>'
        ].join('');
    },

    renderGalleryBlock: function(block) {
        var itemsHtml = '';
        (block.items || []).forEach(function(item) {
            itemsHtml += [
                '<div class="group relative overflow-hidden rounded-2xl border border-slate-200/50 dark:border-slate-800/50 bg-slate-100 dark:bg-slate-900 aspect-video shadow-sm">',
                    '<img src="' + Utils.escapeHtml(item.img) + '" alt="' + Utils.escapeHtml(item.caption || "Fasilitas") + '" class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500">',
                    '<div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex items-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">',
                        '<p class="text-xs font-bold text-white tracking-wide">' + Utils.escapeHtml(item.caption || "") + '</p>',
                    '</div>',
                    '<div class="absolute bottom-2 left-2 bg-slate-950/50 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] text-white font-semibold group-hover:opacity-0 transition-opacity duration-300">',
                        Utils.escapeHtml(item.caption || "Fasilitas"),
                    '</div>',
                '</div>'
            ].join('');
        });

        var orgHtml = '';
        var orgMembers = block.orgMembers || [];
        if (orgMembers.length > 0) {
            var tier1 = [];
            var tier2 = [];
            var tier3 = [];

            orgMembers.forEach(function(m) {
                var roleLower = (m.role || '').toLowerCase();
                if (roleLower.indexOf('direktur') !== -1 || roleLower.indexOf('pemilik') !== -1 || roleLower.indexOf('pimpinan') !== -1 || roleLower.indexOf('owner') !== -1) {
                    tier1.push(m);
                } else if (roleLower.indexOf('kepala') !== -1 || roleLower.indexOf('penanggung jawab') !== -1 || roleLower.indexOf('koordinator') !== -1 || roleLower.indexOf('pj') !== -1 || roleLower.indexOf('spesialis') !== -1) {
                    tier2.push(m);
                } else {
                    tier3.push(m);
                }
            });

            if (tier1.length === 0 && tier2.length === 0) {
                tier1 = orgMembers;
            }

            var renderMemberCard = function(m, highlight) {
                var bgClass = highlight ? 'bg-gradient-to-br from-emerald-600 to-primary-700 text-white shadow-md border-transparent' : 'bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/60 text-slate-800 dark:text-slate-200 shadow-sm';
                var nameClass = highlight ? 'text-white' : 'text-slate-800 dark:text-white';
                var roleClass = highlight ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-400';
                var deptClass = highlight ? 'bg-white/10 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400';

                var avatarHtml = '';
                if (m.img) {
                    avatarHtml = '<img src="' + Utils.escapeHtml(m.img) + '" class="w-16 h-16 rounded-full object-cover mb-3 border-2 ' + (highlight ? 'border-white/30' : 'border-emerald-500/20') + ' shadow-sm" alt="' + Utils.escapeHtml(m.name || '') + '">';
                } else {
                    avatarHtml = '<div class="w-16 h-16 rounded-full flex items-center justify-center font-black text-lg mb-3 border-2 ' + (highlight ? 'bg-white/20 text-white border-white/30' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/10') + '">' +
                        ((m.name || 'S').split(' ').filter(function(n) { return n && !n.toLowerCase().startsWith('dr') && !n.toLowerCase().startsWith('apt') && n.indexOf('.') === -1; }).slice(0, 2).map(function(n){ return n[0]; }).join('').toUpperCase() || 'ST') +
                    '</div>';
                }

                return [
                    '<div class="flex flex-col items-center p-5 rounded-2xl border text-center transition-all duration-300 hover:shadow-md ' + bgClass + ' w-full max-w-sm mx-auto relative group">',
                        avatarHtml,
                        '<h5 class="text-sm font-black tracking-tight ' + nameClass + '">' + Utils.escapeHtml(m.name || '') + '</h5>',
                        '<p class="text-[11px] font-bold mt-1 uppercase tracking-wider ' + roleClass + '">' + Utils.escapeHtml(m.role || '') + '</p>',
                        m.dept ? '<span class="text-[9px] px-2 py-0.5 rounded-full mt-2 font-semibold tracking-wide uppercase ' + deptClass + '">' + Utils.escapeHtml(m.dept || '') + '</span>' : '',
                    '</div>'
                ].join('');
            };

            orgHtml += [
                '<div class="space-y-10 border-b border-slate-200/50 dark:border-slate-800/50 pb-16 mb-16">',
                    '<div class="text-center space-y-2">',
                        '<span class="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">' + Utils.escapeHtml(block.orgSubtitle || "Struktur Organisasi") + '</span>',
                        '<h4 class="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white">' + Utils.escapeHtml(block.orgTitle || "Struktur Organisasi Aulia") + '</h4>',
                        '<p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">' + Utils.escapeHtml(block.orgDesc || "") + '</p>',
                    '</div>',
                    
                    '<div class="space-y-8 max-w-5xl mx-auto relative">',
                        // Tier 1 (Leaders)
                        tier1.length > 0 ? [
                            '<div class="flex flex-col items-center">',
                                '<div class="grid grid-cols-1 gap-4 w-full">',
                                    tier1.map(function(m) { return renderMemberCard(m, true); }).join(''),
                                '</div>',
                            '</div>'
                        ].join('') : '',

                        // Connector line 1 to 2
                        tier1.length > 0 && tier2.length > 0 ? '<div class="hidden md:block w-0.5 h-6 bg-slate-200 dark:bg-slate-800 mx-auto -my-4"></div>' : '',

                        // Tier 2 (Heads)
                        tier2.length > 0 ? [
                            '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-' + Math.min(tier2.length, 3) + ' gap-6 justify-center items-stretch">',
                                tier2.map(function(m) { return renderMemberCard(m, false); }).join(''),
                            '</div>'
                        ].join('') : '',

                        // Connector line 2 to 3
                        tier2.length > 0 && tier3.length > 0 ? '<div class="hidden md:block w-0.5 h-6 bg-slate-200 dark:bg-slate-800 mx-auto -my-4"></div>' : '',

                        // Tier 3 (Staff)
                        tier3.length > 0 ? [
                            '<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 justify-center items-stretch">',
                                tier3.map(function(m) { return renderMemberCard(m, false); }).join(''),
                            '</div>'
                        ].join('') : '',
                    '</div>',
                '</div>'
            ].join('');
        }

        return [
            '<section id="landing-gallery" class="py-16 px-4 sm:px-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200/50 dark:border-slate-800/50">',
                '<div class="max-w-6xl mx-auto">',
                    orgHtml,
                    '<div class="space-y-10 pt-4">',
                        '<div class="text-center space-y-2">',
                            '<span class="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">' + Utils.escapeHtml(block.title || "Galeri Fasilitas") + '</span>',
                            '<h3 class="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white">' + Utils.escapeHtml(block.heading || "Dokumentasi Kenyamanan & Pelayanan Kami") + '</h3>',
                            '<p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">' + Utils.escapeHtml(block.desc || "") + '</p>',
                        '</div>',
                        '<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">',
                            itemsHtml,
                        '</div>',
                    '</div>',
                '</div>',
            '</section>'
        ].join('');
    },    getBlockPage: function(type) {
        if (type === 'hero' || type === 'stats' || type === 'testimonials' || type === 'faq') return 'home';
        if (type === 'doctor-schedule') return 'schedule';
        if (type === 'lab-check') return 'lab';
        if (type === 'services' || type === 'lobby-hero') return 'services';
        if (type === 'gallery') return 'gallery';
        if (type === 'contact') return 'contact';
        return 'home';
    },

    switchPage: function(pageId) {
        var self = this;
        self.activePage = pageId;

        // Scroll landing-overlay back to top
        var overlay = document.getElementById('landing-overlay');
        if (overlay) {
            overlay.scrollTop = 0;
        }

        // Close mobile menu if open
        var mobileMenu = document.getElementById('landing-mobile-menu');
        if (mobileMenu) {
            mobileMenu.classList.add('hidden');
        }

        // Re-render content area
        self.renderContentArea();

        // Update active classes on navigation bars
        self.updateNavbarActiveStates();
    },

    updateNavbarActiveStates: function() {
        var self = this;
        var pageId = self.activePage || 'home';

        // 1. Desktop Nav Links
        var desktopNav = document.getElementById('landing-desktop-nav');
        if (desktopNav) {
            var buttons = desktopNav.querySelectorAll('button');
            var pages = ['home', 'schedule', 'lab', 'services', 'gallery', 'contact'];
            buttons.forEach(function(btn, idx) {
                var btnPage = pages[idx];
                if (btnPage === pageId) {
                    btn.className = "text-emerald-600 dark:text-emerald-400 font-extrabold transition-colors border-b-2 border-emerald-500 pb-1";
                } else {
                    btn.className = "text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 font-semibold transition-colors border-b-2 border-transparent pb-1";
                }
            });
        }

        // 2. Mobile Nav Links
        var mobileMenu = document.getElementById('landing-mobile-menu');
        if (mobileMenu) {
            var buttons = mobileMenu.querySelectorAll('button');
            var pages = ['home', 'schedule', 'lab', 'services', 'gallery', 'contact'];
            buttons.forEach(function(btn, idx) {
                if (idx < pages.length) {
                    var btnPage = pages[idx];
                    if (btnPage === pageId) {
                        btn.className = "block w-full text-left px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-extrabold rounded-xl border-l-4 border-emerald-500 transition-colors";
                    } else {
                        btn.className = "block w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold rounded-lg transition-colors";
                    }
                }
            });
        }

        // 3. Footer Links
        var footerLinks = document.getElementById('landing-footer-links');
        if (footerLinks) {
            var buttons = footerLinks.querySelectorAll('button');
            var pages = ['home', 'schedule', 'gallery', 'lab'];
            buttons.forEach(function(btn, idx) {
                if (idx < pages.length) {
                    var btnPage = pages[idx];
                    if (btnPage === pageId) {
                        btn.className = "text-emerald-500 dark:text-emerald-400 font-extrabold transition";
                    } else {
                        btn.className = "text-slate-500 hover:text-white transition";
                    }
                }
            });
        }
    },

    renderContentArea: function() {
        var self = this;
        var config = self.currentConfig;
        var container = document.getElementById('landing-content-area');
        if (!container || !config) return;

        var pageId = self.activePage || 'home';
        var blocksHtml = '';

        // Added clean transition wrapper for entering views
        blocksHtml += '<div class="transition-all duration-300 ease-out opacity-0 translate-y-3" id="landing-page-wrapper">';

        (config.blocks || []).forEach(function(block) {
            if (!block.enabled) return;
            var bPage = self.getBlockPage(block.type);
            if (bPage === pageId) {
                if (block.type === 'hero') {
                    blocksHtml += self.renderHeroBlock(block, config);
                } else if (block.type === 'stats') {
                    blocksHtml += self.renderStatsBlock(block);
                } else if (block.type === 'doctor-schedule') {
                    blocksHtml += self.renderDoctorScheduleBlock(block);
                } else if (block.type === 'services') {
                    blocksHtml += self.renderServicesBlock(block);
                } else if (block.type === 'lab-check') {
                    blocksHtml += self.renderLabCheckBlock(block, config);
                } else if (block.type === 'lobby-hero') {
                    blocksHtml += self.renderLobbyHeroBlock(block);
                } else if (block.type === 'gallery') {
                    blocksHtml += self.renderGalleryBlock(block);
                } else if (block.type === 'testimonials') {
                    blocksHtml += self.renderTestimonialsBlock(block);
                } else if (block.type === 'faq') {
                    blocksHtml += self.renderFaqBlock(block);
                } else if (block.type === 'contact') {
                    blocksHtml += self.renderContactBlock(block, config);
                }
            }
        });

        // Dynamic, high-quality decorative illustrations and micro-animations suitable for each page
        if (pageId === 'schedule') {
            blocksHtml += [
                '<div class="max-w-5xl mx-auto px-4 sm:px-6 pb-16">',
                    '<div class="bg-gradient-to-br from-emerald-500/10 to-primary-500/10 border border-emerald-500/20 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">',
                        '<div class="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none"></div>',
                        '<div class="flex-shrink-0 p-4 bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">',
                            '<svg class="w-12 h-12 stroke-current fill-none animate-pulse" stroke-width="1.5" viewBox="0 0 24 24">',
                                '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
                            '</svg>',
                        '</div>',
                        '<div class="space-y-2 text-center md:text-left flex-1">',
                            '<h4 class="font-black text-slate-800 dark:text-white text-sm sm:text-base">Konsultasi Medis Profesional Tanpa Ribet</h4>',
                            '<p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Seluruh dokter spesialis dan dokter umum di Aulia Apotek &amp; Klinik memiliki Surat Izin Praktik (SIP) yang aktif dan tervalidasi di SatuSehat Kemenkes RI. Rekam medis Anda tercatat secara aman, rapi, dan rahasia.</p>',
                            '<div class="flex flex-wrap justify-center md:justify-start gap-2.5 pt-2 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">',
                                '<span class="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/50 rounded-lg border border-emerald-200/50">✓ SIP Terverifikasi KKI</span>',
                                '<span class="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/50 rounded-lg border border-emerald-200/50">✓ Privasi Rekam Medis Dijamin</span>',
                                '<span class="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/50 rounded-lg border border-emerald-200/50">✓ Terkoneksi SatuSehat HL7 FHIR</span>',
                            '</div>',
                        '</div>',
                    '</div>',
                '</div>'
            ].join('');
        } else if (pageId === 'lab') {
            blocksHtml += [
                '<div class="max-w-5xl mx-auto px-4 sm:px-6 pb-16">',
                    '<div class="bg-gradient-to-br from-primary-500/10 to-emerald-500/10 border border-primary-500/20 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">',
                        '<div class="absolute -left-10 -top-10 w-40 h-40 bg-primary-400/10 rounded-full blur-2xl pointer-events-none"></div>',
                        '<div class="flex-shrink-0 p-4 bg-primary-600/10 text-primary-600 dark:text-primary-400 rounded-2xl">',
                            '<svg class="w-12 h-12 stroke-current fill-none animate-bounce" stroke-width="1.5" viewBox="0 0 24 24">',
                                '<path d="M4.5 3h15M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3M12 3v18M8 11h8"/>',
                            '</svg>',
                        '</div>',
                        '<div class="space-y-2 text-center md:text-left flex-1">',
                            '<h4 class="font-black text-slate-800 dark:text-white text-sm sm:text-base">Laboratorium Handal, Hasil Cepat di Bawah 5 Menit</h4>',
                            '<p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Pengukuran parameter kimia darah penting seperti glukosa, kolesterol total, dan asam urat dilakukan secara instan menggunakan strip uji tervalidasi klinis dan steril dengan asuhan tenaga medis profesional.</p>',
                            '<div class="flex flex-wrap justify-center md:justify-start gap-2.5 pt-2 text-[10px] font-bold text-primary-700 dark:text-primary-400">',
                                '<span class="px-2.5 py-1 bg-primary-100 dark:bg-primary-950/50 rounded-lg border border-primary-200/50">✓ Jarum Steril Sekali Pakai</span>',
                                '<span class="px-2.5 py-1 bg-primary-100 dark:bg-primary-950/50 rounded-lg border border-primary-200/50">✓ Kalibrasi Alat Terjadwal</span>',
                                '<span class="px-2.5 py-1 bg-primary-100 dark:bg-primary-950/50 rounded-lg border border-primary-200/50">✓ Penjelasan Hasil Medis Gratis</span>',
                            '</div>',
                        '</div>',
                    '</div>',
                '</div>'
            ].join('');
        }

        blocksHtml += '</div>';

        container.innerHTML = blocksHtml;

        if (window.lucide) {
            lucide.createIcons({ el: container });
        }

        // Trigger page transition fade-in effect smoothly
        setTimeout(function() {
            var wrapper = document.getElementById('landing-page-wrapper');
            if (wrapper) {
                wrapper.classList.remove('opacity-0', 'translate-y-3');
                wrapper.classList.add('opacity-100', 'translate-y-0');
            }
        }, 50);

        // Run component-specific initializers
        if (pageId === 'schedule') {
            self.selectDoctorDay(self.selectedDay || 'Senin');
        } else if (pageId === 'lab') {
            self.calculateLabCosts();
        } else if (pageId === 'contact') {
            self.initMap();
        }

        // Apply scroll reveals to page segments
        self.setupScrollReveal(container);
    },

    executeRender: function (config) {
        var self = this;
        self.isActive = true;

        if (!self.activePage) {
            self.activePage = 'home';
        }

        var existing = document.getElementById('landing-overlay');
        if (existing) {
            existing.remove();
        }

        var overlay = document.createElement('div');
        overlay.id = 'landing-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:9998;';
        overlay.className = 'bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-y-auto flex flex-col font-sans scroll-smooth transition-colors duration-300';

        var navbarHtml = [
            '<nav class="sticky top-0 z-50 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 py-4 transition-colors duration-300">',
                '<div class="max-w-7xl mx-auto flex items-center justify-between">',
                    '<div class="flex items-center gap-3 cursor-pointer" onclick="AppLanding.switchPage(\'home\')">',
                        '<div class="p-1.5 bg-white/10 dark:bg-slate-900/40 rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-center">',
                            '<img src="' + Utils.escapeHtml(config.logoImg || 'logo-192.png') + '" class="w-7 h-7 object-contain" alt="Logo">',
                        '</div>',
                        '<div>',
                            '<h1 class="text-base sm:text-lg font-black tracking-tight leading-none text-slate-800 dark:text-white">' + Utils.escapeHtml(config.brandName) + '</h1>',
                            '<p class="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold tracking-widest mt-0.5">' + Utils.escapeHtml(config.brandSub) + '</p>',
                        '</div>',
                    '</div>',
                    '<div id="landing-desktop-nav" class="hidden md:flex items-center gap-8 font-semibold text-sm text-slate-600 dark:text-slate-300">',
                        '<button onclick="AppLanding.switchPage(\'home\')" class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors pb-1 border-b-2 border-transparent">Beranda</button>',
                        '<button onclick="AppLanding.switchPage(\'schedule\')" class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors pb-1 border-b-2 border-transparent">Jadwal Dokter</button>',
                        '<button onclick="AppLanding.switchPage(\'lab\')" class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors pb-1 border-b-2 border-transparent">Cek Lab</button>',
                        '<button onclick="AppLanding.switchPage(\'services\')" class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors pb-1 border-b-2 border-transparent">Layanan Poli</button>',
                        '<button onclick="AppLanding.switchPage(\'gallery\')" class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors pb-1 border-b-2 border-transparent">Galeri</button>',
                        '<button onclick="AppLanding.switchPage(\'contact\')" class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors pb-1 border-b-2 border-transparent">Hubungi Kami</button>',
                    '</div>',
                    '<div class="hidden md:flex items-center gap-4">',
                        '<button onclick="AppLanding.showLogin()" class="bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg hover:shadow-primary-500/20 transition-all duration-200 flex items-center gap-2">',
                            '<i data-lucide="log-in" class="w-4 h-4"></i>',
                            '<span>Portal Staf / Login</span>',
                        '</button>',
                    '</div>',
                    '<button onclick="AppLanding.toggleMobileMenu()" class="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition">',
                        '<i data-lucide="menu" class="w-6 h-6"></i>',
                    '</button>',
                '</div>',
                '<div id="landing-mobile-menu" class="hidden md:hidden mt-4 border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2.5 font-semibold text-sm text-slate-600 dark:text-slate-300 transition-all duration-300">',
                    '<button onclick="AppLanding.switchPage(\'home\')" class="block w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Beranda</button>',
                    '<button onclick="AppLanding.switchPage(\'schedule\')" class="block w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Jadwal Dokter</button>',
                    '<button onclick="AppLanding.switchPage(\'lab\')" class="block w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cek Lab Mandiri</button>',
                    '<button onclick="AppLanding.switchPage(\'services\')" class="block w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Layanan Poli</button>',
                    '<button onclick="AppLanding.switchPage(\'gallery\')" class="block w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Galeri Fasilitas</button>',
                    '<button onclick="AppLanding.switchPage(\'contact\')" class="block w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Hubungi Kami</button>',
                    '<div class="pt-2 border-t border-slate-200 dark:border-slate-800">',
                        '<button onclick="AppLanding.showLogin()" class="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm px-4 py-3 rounded-xl shadow-md transition flex items-center justify-center gap-2">',
                            '<i data-lucide="log-in" class="w-4 h-4"></i>',
                            '<span>Portal Staf / Login</span>',
                        '</button>',
                    '</div>',
                '</div>',
            '</nav>'
        ].join('');

        var contentAreaHtml = '<div id="landing-content-area" class="flex-1 min-h-[60vh]"></div>';

        var socials = config.socials || {};
        var footerHtml = [
            '<footer class="bg-slate-950 text-slate-400 text-xs py-12 px-4 sm:px-6 mt-auto border-t border-slate-900">',
                '<div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">',
                    '<div class="flex items-center gap-3">',
                        '<div class="p-1.5 bg-slate-900 rounded-xl flex items-center justify-center">',
                            '<img src="' + Utils.escapeHtml(config.logoImg || 'logo-192.png') + '" class="w-6 h-6 object-contain" alt="Logo">',
                        '</div>',
                        '<div>',
                            '<h5 class="text-sm font-black text-white leading-none tracking-tight">' + Utils.escapeHtml(config.brandName) + '</h5>',
                            '<p class="text-[9px] text-emerald-400 uppercase font-bold tracking-wider mt-0.5">' + Utils.escapeHtml(config.brandSub) + '</p>',
                        '</div>',
                    '</div>',
                    
                    '<div class="flex items-center gap-5 my-2">',
                        socials.facebook ? '<a href="' + Utils.escapeHtml(socials.facebook) + '" target="_blank" class="text-slate-400 hover:text-white transition duration-200" title="Facebook"><svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M9 8H7v3h2v9h4v-9h3.625L17 8h-4V6.5c0-.853.174-1.25 1.125-1.25H17V2h-3.625C10.625 2 9 3.625 9 6.5V8z"/></svg></a>' : '',
                        socials.instagram ? '<a href="' + Utils.escapeHtml(socials.instagram) + '" target="_blank" class="text-slate-400 hover:text-white transition duration-200" title="Instagram"><svg class="w-5 h-5 stroke-current fill-none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg></a>' : '',
                        socials.twitter ? '<a href="' + Utils.escapeHtml(socials.twitter) + '" target="_blank" class="text-slate-400 hover:text-white transition duration-200" title="Twitter / X"><svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>' : '',
                    '</div>',

                    '<div id="landing-footer-links" class="flex gap-4 text-[11px] text-slate-500 font-bold uppercase tracking-wider">',
                        '<button onclick="AppLanding.switchPage(\'home\')" class="hover:text-white transition">Beranda</button>',
                        '<button onclick="AppLanding.switchPage(\'schedule\')" class="hover:text-white transition">Dokter</button>',
                        '<button onclick="AppLanding.switchPage(\'gallery\')" class="hover:text-white transition">Galeri</button>',
                        '<button onclick="AppLanding.switchPage(\'lab\')" class="hover:text-white transition">Cek Lab</button>',
                        '<button onclick="AppLanding.showLogin()" class="hover:text-white transition">Login</button>',
                    '</div>',
                '</div>',
                '<div class="max-w-7xl mx-auto border-t border-slate-900 mt-6 pt-6 text-center text-[10px] text-slate-500 flex flex-col sm:flex-row justify-between gap-4">',
                    '<p>&copy; 2026 Apotek &amp; Klinik Aulia. Hak Cipta Dilindungi Undang-Undang.</p>',
                    '<p>Mendukung Integrasi Data Rekam Medis Digital Nasional HL7 FHIR</p>',
                '</div>',
            '</footer>'
        ].join('');

        var waNumber = config.waNumber || '6281234567890';
        var waFloatingHtml = [
            '<a href="https://wa.me/' + Utils.escapeHtml(waNumber) + '?text=' + encodeURIComponent('Halo Apotek & Klinik Aulia, saya ingin bertanya mengenai layanan...') + '" target="_blank" ',
               'class="fixed bottom-6 right-6 z-[9999] group flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold p-3.5 rounded-full shadow-2xl hover:shadow-emerald-500/30 transition-all duration-300 hover:-translate-y-1 scale-100 active:scale-95" ',
               'title="Hubungi kami via WhatsApp">',
                '<span class="max-w-0 overflow-hidden group-hover:max-w-[150px] transition-all duration-500 ease-in-out whitespace-nowrap text-xs sm:text-sm pl-0 group-hover:pl-2 font-semibold">Tanya Admin</span>',
                '<svg class="w-6 h-6 fill-current" viewBox="0 0 24 24">',
                    '<path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.731 2.012 14.26 1.002 11.993 1.002c-5.44 0-9.866 4.372-9.87 9.802 0 1.814.504 3.517 1.457 5.032L2.571 20.3l4.076-1.146z"/>',
                    '<path d="M16.814 13.91c-.266-.134-1.579-.78-1.824-.87-.243-.09-.422-.134-.6.135-.178.27-.69.87-.846 1.05-.156.18-.312.202-.578.068a8.74 8.74 0 0 1-3.238-2.003 9.645 9.645 0 0 1-2.24-2.798c-.156-.266-.017-.41-.15-.544-.121-.12-.267-.315-.4-.472-.134-.157-.179-.27-.268-.45a.5.5 0 0 1 .045-.427c.045-.09.423-.99.598-1.32.174-.332.348-.27.472-.27.12 0 .24-.01.356-.01s.312.044.473.214c.16.17.618 1.505.674 1.616.056.112.09.24.01.405-.078.163-.167.26-.312.428-.145.168-.31.378-.44.5l-.225.213a.478.478 0 0 0 .144.757c.54.43 1.94 1.156 2.766 1.895.215.193.342.25.474.068.13-.183.56-.653.71-.877.152-.224.3-.186.565-.086s1.69.796 1.98.937c.292.14.488.21.558.332.07.12.07.696-.196.962z"/>',
                '</svg>',
            '</a>'
        ].join('');

        overlay.innerHTML = navbarHtml + contentAreaHtml + footerHtml + waFloatingHtml;
        document.body.appendChild(overlay);

        if (window.lucide) {
            lucide.createIcons({ el: overlay });
        }

        // Render current active page & active state on nav
        self.renderContentArea();
        self.updateNavbarActiveStates();
    },

    setupScrollReveal: function(container) {
        var sections = container.querySelectorAll('section');
        if ('IntersectionObserver' in window) {
            var observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('reveal-visible');
                    }
                });
            }, {
                threshold: 0.05,
                rootMargin: '0px 0px -50px 0px'
            });

            sections.forEach(function(sec) {
                sec.classList.add('scroll-reveal');
                observer.observe(sec);
            });
        } else {
            // Fallback for browsers without IntersectionObserver
            sections.forEach(function(sec) {
                sec.classList.add('reveal-visible');
            });
        }
    }
};
