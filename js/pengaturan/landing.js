/**
 * js/pengaturan/landing.js
 * Pengaturan Landing Page (Site Builder / Puzzle Workspace)
 * Allows Keuangan & PSA to build, customize, toggle, reorder and save the landing page like assembling puzzle blocks.
 */

window.AppPengaturanLanding = {
    data: {},
    activeTab: 'home', // 'home' (Beranda), 'schedule' (Jadwal Dokter), 'lab' (Cek Lab), 'services' (Layanan Poli), 'gallery', 'contact', 'global'
    expandedBlockId: null, // Track which block has its editor form expanded
    activeDoctorDay: 'Senin', // Day currently being edited inside doctor schedule block

    render: function() {
        var html = '<div class="page-enter max-w-7xl mx-auto space-y-6">';
        
        // Header
        html += '  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">';
        html += '    <div>';
        html += '      <h2 class="text-xl font-black text-slate-800 dark:text-white mb-1">Landing Page Builder <span class="text-xs px-2.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 font-bold ml-1">Puzzle Style</span></h2>';
        html += '      <p class="text-xs text-slate-500 dark:text-slate-400">Susun seksi/sebagai puzzle, kelola konten, jadwal, cek lab, testimoni, dan media sosial secara interaktif.</p>';
        html += '    </div>';
        html += '    <div class="flex flex-wrap gap-2">';
        html += '      <button onclick="AppPengaturanLanding.resetToDefault()" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 border border-slate-200 dark:border-slate-600"><i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i> Reset Default</button>';
        html += '      <button onclick="AppPengaturanLanding.saveChanges()" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 flex items-center gap-1.5"><i data-lucide="save" class="w-4 h-4"></i> Simpan &amp; Terapkan</button>';
        html += '    </div>';
        html += '  </div>';

        // Layout Grid
        html += '  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">';
        
        // Kiri: Editor Workspace (Col 7)
        html += '    <div class="lg:col-span-7 space-y-6">';
        
        // Tab Navigasi Builder
        html += '      <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 shadow-sm">';
        
        var tabs = [
            { id: 'home', label: 'Beranda', icon: 'home' },
            { id: 'schedule', label: 'Jadwal Dokter', icon: 'calendar' },
            { id: 'lab', label: 'Cek Lab', icon: 'calculator' },
            { id: 'services', label: 'Layanan Poli', icon: 'activity' },
            { id: 'gallery', label: 'Galeri', icon: 'image' },
            { id: 'contact', label: 'Hubungi Kami', icon: 'phone' },
            { id: 'global', label: 'Branding & Medsos', icon: 'settings' }
        ];

        var self = this;
        tabs.forEach(function(t) {
            var isActive = self.activeTab === t.id;
            html += '  <button onclick="AppPengaturanLanding.switchTab(\'' + t.id + '\')" class="flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-1 text-[10px] sm:text-xs font-black rounded-xl transition-all border ' + 
                    (isActive ? 'bg-primary-600 border-primary-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200') + '">';
            html += '    <i data-lucide="' + t.icon + '" class="w-3.5 h-3.5"></i>';
            html += '    <span class="text-center sm:text-left">' + t.label + '</span>';
            html += '  </button>';
        });

        html += '      </div>';

        // Content Area Kiri
        html += '      <div id="builder-editor-container" class="space-y-4"></div>';
        html += '    </div>';

        // Kanan: Real-Time Live Preview Viewport (Col 5)
        html += '    <div class="lg:col-span-5 sticky top-6">';
        html += '      <div class="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-inner space-y-4">';
        html += '        <div class="flex items-center justify-between">';
        html += '          <p class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">';
        html += '            <i data-lucide="eye" class="w-3.5 h-3.5 text-emerald-500"></i> LIVE PREVIEW LANDING PAGE';
        html += '          </p>';
        html += '          <span class="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-extrabold flex items-center gap-1"><span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> Real-Time</span>';
        html += '        </div>';
        
        // Mock Device Viewport (scrollable)
        html += '        <div id="live-preview-viewport" class="w-full max-h-[700px] overflow-y-auto bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-2xl space-y-4 p-4 scrollbar-thin divide-y divide-slate-100 dark:divide-slate-800/60">';
        html += '          <!-- Dynamic high-fidelity mock preview renders here -->';
        html += '        </div>';
        html += '      </div>';
        html += '    </div>';

        html += '  </div>'; // End Grid
        html += '</div>'; // End Page
        
        return html;
    },

    init: function() {
        var self = this;
        var role = window.currentRole || 'apotek';
        if (role !== 'keuangan' && role !== 'psa') {
            document.getElementById('app-content').innerHTML = 
                '<div class="text-center py-20 text-red-500 font-bold">Anda tidak memiliki akses ke halaman pengaturan ini.</div>';
            return;
        }

        db.collection('pengaturan').doc('landing').get().then(function(doc) {
            var cloudConfig = doc.exists ? doc.data() : {};
            
            // Re-read structural default config to merge and prevent missing structures
            var def = (window.AppLanding && window.AppLanding.defaultConfig) ? window.AppLanding.defaultConfig : {
                brandName: "AULIA Apotek dan Praktik Dokter Mandiri",
                brandSub: "Apotek & Praktik Dokter Terpadu",
                logoSvg: '',
                waNumber: "6281234567890",
                phone: "+62 812-3456-7890",
                email: "klinikapotekaulia@gmail.com",
                address: "Jl. Raya Jatinegara No. 45, Jatinegara, Jakarta Timur, DKI Jakarta",
                mapLatitude: -6.215024,
                mapLongitude: 106.870535,
                mapZoom: 15,
                socials: { facebook: "", instagram: "", twitter: "" },
                blocks: []
            };

            // Deep clone fallback
            var finalConfig = JSON.parse(JSON.stringify(def));
            
            // Map keys
            if (cloudConfig.brandName) finalConfig.brandName = cloudConfig.brandName;
            if (cloudConfig.brandSub) finalConfig.brandSub = cloudConfig.brandSub;
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
                cloudConfig.blocks.forEach(function(cloudB) {
                    var defaultB = finalConfig.blocks.find(function(b) { return b.id === cloudB.id || b.type === cloudB.type; });
                    
                    // If image is empty/missing or an unsplash placeholder in cloud, remove the property so Object.assign doesn't overwrite default
                    if (defaultB) {
                        if (cloudB.hasOwnProperty('img')) {
                            var imgStr = String(cloudB.img || '').trim();
                            if (!imgStr || imgStr === '' || imgStr.indexOf('unsplash.com') !== -1) {
                                delete cloudB.img;
                            }
                        }
                    }

                    // Special deep merging for doctor schedules to avoid losing default doctor photos
                    if (cloudB.type === 'doctor-schedule' && cloudB.schedules) {
                        var mergedSchedules = {};
                        var days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
                        days.forEach(function(day) {
                            var defaultDayList = (defaultB && defaultB.schedules) ? defaultB.schedules[day] : null;
                            var cloudDayList = cloudB.schedules[day];
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
                        cloudB.schedules = mergedSchedules;
                    }

                    // Special deep merging for doctor profiles to avoid losing default doctor photos
                    if (cloudB.type === 'doctor-schedule' && cloudB.profiles && Array.isArray(cloudB.profiles)) {
                        var defaultProfs = defaultB ? defaultB.profiles : [];
                        cloudB.profiles = cloudB.profiles.map(function(cloudProf, idx) {
                            var defaultProf = defaultProfs[idx];
                            var mergedProf = Object.assign({}, defaultProf || {}, cloudProf);
                            var profImg = String(mergedProf.img || '').trim();
                            if ((!profImg || profImg === '' || profImg.indexOf('unsplash.com') !== -1) && defaultProf && defaultProf.img) {
                                mergedProf.img = defaultProf.img;
                            }
                            return mergedProf;
                        });
                    } else if (cloudB.type === 'doctor-schedule' && defaultB && defaultB.profiles) {
                        cloudB.profiles = defaultB.profiles;
                    }

                    // Special deep merging for gallery items to avoid losing default gallery photos
                    if (cloudB.type === 'gallery' && cloudB.items && Array.isArray(cloudB.items)) {
                        var defaultItems = defaultB ? defaultB.items : [];
                        cloudB.items = cloudB.items.map(function(cloudItem, idx) {
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
                    if (cloudB.type === 'gallery' && cloudB.orgMembers && Array.isArray(cloudB.orgMembers)) {
                        var defaultOrg = defaultB ? defaultB.orgMembers : [];
                        cloudB.orgMembers = cloudB.orgMembers.map(function(cloudM, idx) {
                            var defaultM = defaultOrg[idx];
                            var mergedM = Object.assign({}, defaultM || {}, cloudM);
                            var mImg = String(mergedM.img || '').trim();
                            if ((!mImg || mImg === '' || mImg.indexOf('unsplash.com') !== -1) && defaultM && defaultM.img) {
                                mergedM.img = defaultM.img;
                            }
                            return mergedM;
                        });
                    } else if (cloudB.type === 'gallery' && defaultB && defaultB.orgMembers) {
                        cloudB.orgMembers = defaultB.orgMembers;
                    }

                    mergedBlocks.push(Object.assign({}, defaultB || {}, cloudB));
                });
                // Then, add any default blocks that are NOT present in cloudConfig
                finalConfig.blocks.forEach(function(defaultB) {
                    var exists = cloudConfig.blocks.some(function(b) { return b.id === defaultB.id || b.type === defaultB.type; });
                    if (!exists) {
                        mergedBlocks.push(defaultB);
                    }
                });
                finalConfig.blocks = mergedBlocks;
            }

            self.data = finalConfig;
            self.renderBuilder();
            self.updatePreview();
        }).catch(function(err) {
            Utils.toast('Gagal memuat pengaturan: ' + err.message, 'error');
        });
    },

    getBlockPage: function(type) {
        if (type === 'hero' || type === 'stats' || type === 'testimonials' || type === 'faq') return 'home';
        if (type === 'doctor-schedule') return 'schedule';
        if (type === 'lab-check') return 'lab';
        if (type === 'services' || type === 'lobby-hero') return 'services';
        if (type === 'gallery') return 'gallery';
        if (type === 'contact') return 'contact';
        return 'home';
    },

    getTabLabel: function(tab) {
        var labels = {
            'home': 'Beranda',
            'schedule': 'Jadwal Dokter',
            'lab': 'Cek Lab',
            'services': 'Layanan Poli',
            'gallery': 'Galeri',
            'contact': 'Hubungi Kami',
            'global': 'Branding & Medsos'
        };
        return labels[tab] || tab;
    },

    switchTab: function(tab) {
        this.activeTab = tab;
        this.renderBuilder();
        this.updatePreview();
    },

    renderBuilder: function() {
        var self = this;
        var container = document.getElementById('builder-editor-container');
        if (!container) return;

        var html = '';
        var d = this.data;

        if (this.activeTab !== 'global') {
            html += '<div class="space-y-4">';
            html += '  <div class="flex justify-between items-center bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">';
            html += '    <h4 class="text-xs font-black uppercase text-slate-500 tracking-wider">Susunan Seksi Halaman ' + this.getTabLabel(this.activeTab) + '</h4>';
            html += '    <div class="flex gap-1.5 items-center">';
            html += '       <select id="select-add-block" class="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs p-1.5 focus:outline-none dark:text-white">';
            
            if (this.activeTab === 'home') {
                html += '         <option value="hero">Hero Banner</option>';
                html += '         <option value="stats">Statistik Angka</option>';
                html += '         <option value="testimonials">Testimoni</option>';
                html += '         <option value="faq">FAQ Accordion</option>';
            } else if (this.activeTab === 'schedule') {
                html += '         <option value="doctor-schedule">Jadwal Dokter</option>';
            } else if (this.activeTab === 'lab') {
                html += '         <option value="lab-check">Cek Lab Mandiri</option>';
            } else if (this.activeTab === 'services') {
                html += '         <option value="services">Layanan Poli</option>';
                html += '         <option value="lobby-hero">Fasilitas Lobby</option>';
            } else if (this.activeTab === 'gallery') {
                html += '         <option value="gallery">Galeri Foto Fasilitas</option>';
            } else if (this.activeTab === 'contact') {
                html += '         <option value="contact">Form &amp; Detail Kontak</option>';
            }
            
            html += '       </select>';
            html += '       <button onclick="AppPengaturanLanding.addBlockFromDropdown()" class="bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"><i data-lucide="plus-circle" class="w-3.5 h-3.5"></i> Tambah</button>';
            html += '    </div>';
            html += '  </div>';

            html += '  <div class="space-y-3" id="puzzle-blocks-list">';
            var tabBlocksCount = 0;
            (d.blocks || []).forEach(function(block, idx) {
                if (self.getBlockPage(block.type) !== self.activeTab) return;
                tabBlocksCount++;

                var isExpanded = self.expandedBlockId === block.id;
                var displayName = self.getBlockName(block.type);

                html += '  <div class="bg-white dark:bg-slate-800 border ' + (isExpanded ? 'border-primary-500 dark:border-primary-500/50 shadow-md ring-2 ring-primary-500/5' : 'border-slate-200/60 dark:border-slate-700/60 hover:shadow-sm') + ' rounded-2xl transition duration-200 overflow-hidden">';
                
                // Block Header Bar
                html += '    <div class="px-4 py-3.5 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700/50">';
                html += '      <div class="flex items-center gap-2.5">';
                
                // Reorder controls
                html += '        <div class="flex flex-col gap-0.5">';
                html += '          <button onclick="AppPengaturanLanding.moveBlock(' + idx + ', -1)" ' + (idx === 0 ? 'disabled' : '') + ' class="p-0.5 text-slate-400 hover:text-slate-800 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="18 15 12 9 6 15"/></svg></button>';
                html += '          <button onclick="AppPengaturanLanding.moveBlock(' + idx + ', 1)" ' + (idx === d.blocks.length - 1 ? 'disabled' : '') + ' class="p-0.5 text-slate-400 hover:text-slate-800 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg></button>';
                html += '        </div>';

                html += '        <div>';
                html += '          <div class="flex items-center gap-2">';
                html += '            <span class="font-black text-xs sm:text-sm text-slate-800 dark:text-white">' + displayName + '</span>';
                html += '            <span class="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 uppercase tracking-widest">' + block.type + '</span>';
                html += '          </div>';
                html += '        </div>';
                html += '      </div>';

                // Status & Actions
                html += '      <div class="flex items-center gap-3">';
                // Enabled/Disabled switch
                html += '        <label class="relative inline-flex items-center cursor-pointer select-none" title="Tampilkan/Sembunyikan">';
                html += '          <input type="checkbox" ' + (block.enabled ? 'checked' : '') + ' onchange="AppPengaturanLanding.toggleBlock(' + idx + ')" class="sr-only peer">';
                html += '          <div class="w-8 h-4 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[\'\'] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500"></div>';
                html += '          <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1.5 sm:inline hidden">' + (block.enabled ? 'Tampil' : 'Sembunyi') + '</span>';
                html += '        </label>';

                // Edit Button
                html += '        <button onclick="AppPengaturanLanding.toggleExpandBlock(\'' + block.id + '\')" class="p-1.5 text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 transition bg-slate-100 dark:bg-slate-700 rounded-lg" title="Edit Konten">';
                html += '          <i data-lucide="' + (isExpanded ? 'chevron-up' : 'edit-2') + '" class="w-3.5 h-3.5"></i>';
                html += '        </button>';

                // Delete Button
                html += '        <button onclick="AppPengaturanLanding.deleteBlock(' + idx + ')" class="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition" title="Hapus Seksi">';
                html += '          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>';
                html += '        </button>';
                html += '      </div>';
                html += '    </div>';

                // Block Form Editor Panel (Expanded)
                if (isExpanded) {
                    html += '    <div class="p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700 space-y-4 animate-enter">';
                    html += self.renderBlockEditorForm(block, idx);
                    html += '    </div>';
                }

                html += '  </div>'; // End Block Item
            });

            if (tabBlocksCount === 0) {
                html += '  <div class="text-center py-12 px-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">';
                html += '    <p class="text-xs text-slate-400 dark:text-slate-500">Tidak ada seksi/puzzle block untuk halaman ini. Silakan gunakan tombol Tambah di atas.</p>';
                html += '  </div>';
            }

            html += '  </div>'; // End Puzzle Blocks list
            html += '</div>';
        } 
        
        else if (this.activeTab === 'global') {
            html += '  <div class="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm space-y-4">';
            html += '    <h3 class="text-xs font-black uppercase text-slate-400 tracking-wider mb-4 flex items-center gap-1.5"><i data-lucide="info" class="w-4 h-4 text-primary-500"></i> Informasi Identitas Brand &amp; Kontak</h3>';

            html += '    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">';
            html += '      <div>';
            html += '        <label class="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Nama Brand Utama</label>';
            html += '        <input type="text" value="' + Utils.escapeHtml(d.brandName) + '" oninput="AppPengaturanLanding.syncGlobalField(\'brandName\', this.value)" class="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-2.5 text-xs outline-none focus:border-primary-500 dark:text-white">';
            html += '      </div>';
            html += '      <div>';
            html += '        <label class="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Sub-judul Brand</label>';
            html += '        <input type="text" value="' + Utils.escapeHtml(d.brandSub) + '" oninput="AppPengaturanLanding.syncGlobalField(\'brandSub\', this.value)" class="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-2.5 text-xs outline-none focus:border-primary-500 dark:text-white">';
            html += '      </div>';
            html += '    </div>';
            
            // New Brand Logo Section
            html += '    <div class="grid grid-cols-1 gap-4 p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl">';
            html += '      <div>';
            html += '        <label class="block text-[11px] font-black text-primary-600 dark:text-primary-400 uppercase mb-1.5">Logo Utama Landing Page &amp; Halaman Login</label>';
            html += '        <div class="flex gap-2">';
            html += '          <input type="text" id="inp-brand-logo" value="' + Utils.escapeHtml(d.logoImg || '') + '" oninput="AppPengaturanLanding.syncGlobalField(\'logoImg\', this.value)" placeholder="Format: URL atau Base64 Gambar" class="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs outline-none dark:text-white">';
            html += '          <input type="file" id="file-brand-logo" accept="image/*" onchange="AppPengaturanLanding.uploadBrandLogo(this)" class="hidden">';
            html += '          <button onclick="document.getElementById(\'file-brand-logo\').click()" class="bg-primary-600 hover:bg-primary-700 text-white text-xs px-4 rounded-xl font-bold transition flex items-center gap-1.5"><i data-lucide="upload" class="w-4 h-4"></i> Unggah Logo</button>';
            html += '        </div>';
            html += '        <div class="mt-2.5 p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl space-y-1.5 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">';
            html += '          <div class="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-black"><i data-lucide="info" class="w-3.5 h-3.5 flex-shrink-0"></i> Rekomendasi Format &amp; Ukuran Logo:</div>';
            html += '          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pl-4">';
            html += '            <div>• <strong>Metode Terbaik:</strong> Gunakan tombol <strong>Unggah Logo</strong> (konversi otomatis)</div>';
            html += '            <div>• <strong>Format File:</strong> PNG (disarankan transparan), SVG, JPG, atau WebP</div>';
            html += '            <div>• <strong>Dimensi Ideal:</strong> Rasio Kotak 1:1 (contoh: 512x512 piksel)</div>';
            html += '            <div>• <strong>Ukuran File:</strong> Maksimal 1 MB (Disarankan &lt; 200 KB agar web loading cepat)</div>';
            html += '          </div>';
            html += '        </div>';
            html += '      </div>';
            var previewLogoSrc = d.logoImg || 'logo-192.png';
            html += '      <div class="flex items-center gap-3 bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800/50 w-fit">';
            html += '        <span class="text-[10px] font-bold text-slate-400">Pratinjau Logo Aktif:</span>';
            html += '        <img src="' + Utils.escapeHtml(previewLogoSrc) + '" class="h-10 w-10 object-contain border border-slate-200 dark:border-slate-800 p-1 bg-slate-50 rounded-lg shadow-sm">';
            if (d.logoImg) {
                html += '        <button onclick="AppPengaturanLanding.clearBrandLogo()" class="text-[10px] font-bold text-red-500 hover:underline">Hapus</button>';
            } else {
                html += '        <span class="text-[10px] font-medium text-slate-400">(Default logo-192.png)</span>';
            }
            html += '      </div>';
            html += '    </div>';

            html += '    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">';
            html += '      <div>';
            html += '        <label class="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">No WhatsApp Integrasi</label>';
            html += '        <input type="text" value="' + Utils.escapeHtml(d.waNumber) + '" oninput="AppPengaturanLanding.syncGlobalField(\'waNumber\', this.value)" placeholder="Format: 6281234567890" class="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-2.5 text-xs outline-none focus:border-primary-500 dark:text-white">';
            html += '        <p class="text-[9px] text-slate-400 mt-1 leading-normal">Gunakan format angka saja dan kode negara (misal 62 untuk Indonesia).</p>';
            html += '      </div>';
            html += '      <div>';
            html += '        <label class="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Nomor Telepon Kantor</label>';
            html += '        <input type="text" value="' + Utils.escapeHtml(d.phone) + '" oninput="AppPengaturanLanding.syncGlobalField(\'phone\', this.value)" class="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-2.5 text-xs outline-none focus:border-primary-500 dark:text-white">';
            html += '      </div>';
            html += '    </div>';

            html += '    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">';
            html += '      <div class="sm:col-span-2">';
            html += '        <label class="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Alamat Email Resmi</label>';
            html += '        <input type="email" value="' + Utils.escapeHtml(d.email) + '" oninput="AppPengaturanLanding.syncGlobalField(\'email\', this.value)" class="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-2.5 text-xs outline-none focus:border-primary-500 dark:text-white">';
            html += '      </div>';
            html += '    </div>';

            html += '    <div>';
            html += '      <label class="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Alamat Fisik Lengkap</label>';
            html += '      <textarea rows="3" oninput="AppPengaturanLanding.syncGlobalField(\'address\', this.value)" class="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-2.5 text-xs outline-none focus:border-primary-500 dark:text-white leading-relaxed">' + Utils.escapeHtml(d.address) + '</textarea>';
            html += '    </div>';

            html += '    <div class="border-t border-slate-100 dark:border-slate-800 pt-5 mt-5 space-y-4">';
            html += '      <h3 class="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5"><i data-lucide="map" class="w-4 h-4 text-emerald-500"></i> Koordinat Peta Interaktif</h3>';
            html += '      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">';
            html += '        <div>';
            html += '          <label class="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Latitude (Lintang)</label>';
            html += '          <input type="number" step="any" value="' + (d.mapLatitude || -6.215024) + '" oninput="AppPengaturanLanding.syncGlobalField(\'mapLatitude\', parseFloat(this.value) || 0)" class="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-2.5 text-xs outline-none focus:border-primary-500 dark:text-white" placeholder="Contoh: -6.215024">';
            html += '        </div>';
            html += '        <div>';
            html += '          <label class="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Longitude (Bujur)</label>';
            html += '          <input type="number" step="any" value="' + (d.mapLongitude || 106.870535) + '" oninput="AppPengaturanLanding.syncGlobalField(\'mapLongitude\', parseFloat(this.value) || 0)" class="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-2.5 text-xs outline-none focus:border-primary-500 dark:text-white" placeholder="Contoh: 106.870535">';
            html += '        </div>';
            html += '        <div>';
            html += '          <label class="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Zoom Level (Kedalaman)</label>';
            html += '          <input type="number" min="1" max="20" value="' + (d.mapZoom || 15) + '" oninput="AppPengaturanLanding.syncGlobalField(\'mapZoom\', parseInt(this.value) || 15)" class="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-2.5 text-xs outline-none focus:border-primary-500 dark:text-white" placeholder="Contoh: 15">';
            html += '        </div>';
            html += '      </div>';
            html += '    </div>';

            html += '    <div class="border-t border-slate-100 dark:border-slate-800 pt-5 mt-5 space-y-4">';
            html += '      <h3 class="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5"><i data-lucide="share-2" class="w-4 h-4 text-emerald-500"></i> Media Sosial Footer</h3>';
            
            var soc = d.socials || {};
            html += '      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">';
            html += '        <div>';
            html += '          <label class="block text-[10px] font-black text-slate-400 uppercase mb-1.5 flex items-center gap-1"><i data-lucide="facebook" class="w-3.5 h-3.5 text-blue-500"></i> Facebook URL</label>';
            html += '          <input type="text" value="' + Utils.escapeHtml(soc.facebook || '') + '" oninput="AppPengaturanLanding.syncSocialField(\'facebook\', this.value)" class="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-2.5 text-xs outline-none focus:border-primary-500 dark:text-white" placeholder="https://facebook.com/your-username">';
            html += '        </div>';
            html += '        <div>';
            html += '          <label class="block text-[10px] font-black text-slate-400 uppercase mb-1.5 flex items-center gap-1"><i data-lucide="instagram" class="w-3.5 h-3.5 text-pink-500"></i> Instagram URL</label>';
            html += '          <input type="text" value="' + Utils.escapeHtml(soc.instagram || '') + '" oninput="AppPengaturanLanding.syncSocialField(\'instagram\', this.value)" class="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-2.5 text-xs outline-none focus:border-primary-500 dark:text-white" placeholder="https://instagram.com/your-username">';
            html += '        </div>';
            html += '        <div>';
            html += '          <label class="block text-[10px] font-black text-slate-400 uppercase mb-1.5 flex items-center gap-1"><svg class="w-3.5 h-3.5 dark:fill-white fill-slate-800" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> Twitter / X URL</label>';
            html += '          <input type="text" value="' + Utils.escapeHtml(soc.twitter || '') + '" oninput="AppPengaturanLanding.syncSocialField(\'twitter\', this.value)" class="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-2.5 text-xs outline-none focus:border-primary-500 dark:text-white" placeholder="https://twitter.com/your-username">';
            html += '        </div>';
            html += '      </div>';
            html += '    </div>';
            html += '  </div>';
        }

        container.innerHTML = html;
        if (window.lucide) lucide.createIcons({ el: container });
    },

    getBlockName: function(type) {
        var names = {
            'hero': 'Banner Utama (Hero)',
            'stats': 'Statistik Pengunjung (Stats)',
            'doctor-schedule': 'Jadwal Praktek Dokter',
            'services': 'Komitmen Layanan Poli',
            'lab-check': 'Kalkulator Cek Lab Mandiri',
            'lobby-hero': 'Promosi Fasilitas Lobby',
            'gallery': 'Galeri Foto Fasilitas',
            'testimonials': 'Testimoni Pasien',
            'faq': 'Pertanyaan Umum (FAQ)',
            'contact': 'Form & Detail Kontak'
        };
        return names[type] || 'Seksi Tambahan';
    },

    toggleExpandBlock: function(blockId) {
        if (this.expandedBlockId === blockId) {
            this.expandedBlockId = null;
        } else {
            this.expandedBlockId = blockId;
        }
        this.renderBuilder();
    },

    // GENERAL RENDERING FOR INDIVIDUAL BLOCK EDITORS
    renderBlockEditorForm: function(block, blockIdx) {
        var self = this;
        var html = '';

        if (block.type === 'hero') {
            html += '  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">';
            html += '    <div>';
            html += '      <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tagline Atas Banner</label>';
            html += '      <input type="text" value="' + Utils.escapeHtml(block.tagline || '') + '" oninput="AppPengaturanLanding.syncBlockField(' + blockIdx + ', \'tagline\', this.value)" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-primary-500 dark:text-white">';
            html += '    </div>';
            html += '    <div>';
            html += '      <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Judul Banner Utama (Hero Title)</label>';
            html += '      <input type="text" value="' + Utils.escapeHtml(block.title || '') + '" oninput="AppPengaturanLanding.syncBlockField(' + blockIdx + ', \'title\', this.value)" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-primary-500 dark:text-white">';
            html += '    </div>';
            html += '  </div>';

            html += '  <div>';
            html += '    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Deskripsi Ringkas</label>';
            html += '    <textarea rows="3" oninput="AppPengaturanLanding.syncBlockField(' + blockIdx + ', \'desc\', this.value)" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-primary-500 dark:text-white leading-relaxed">' + Utils.escapeHtml(block.desc || '') + '</textarea>';
            html += '  </div>';

            html += '  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">';
            html += '    <div>';
            html += '      <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Teks Tombol Konsultasi (CTA)</label>';
            html += '      <input type="text" value="' + Utils.escapeHtml(block.ctaText || '') + '" oninput="AppPengaturanLanding.syncBlockField(' + blockIdx + ', \'ctaText\', this.value)" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-primary-500 dark:text-white">';
            html += '    </div>';
            html += '    <div>';
            html += '      <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Teks Tombol Kalkulator Lab</label>';
            html += '      <input type="text" value="' + Utils.escapeHtml(block.labCtaText || '') + '" oninput="AppPengaturanLanding.syncBlockField(' + blockIdx + ', \'labCtaText\', this.value)" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-primary-500 dark:text-white">';
            html += '    </div>';
            html += '  </div>';

            html += '  <div>';
            html += '    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Gambar Banner Utama (URL / Base64)</label>';
            html += '    <div class="flex gap-2">';
            html += '      <input type="text" id="inp-hero-img-' + blockIdx + '" value="' + Utils.escapeHtml(block.img || '') + '" oninput="AppPengaturanLanding.syncBlockField(' + blockIdx + ', \'img\', this.value)" class="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-primary-500 dark:text-white">';
            html += '      <input type="file" id="file-hero-img-' + blockIdx + '" accept="image/*" onchange="AppPengaturanLanding.uploadBlockImage(' + blockIdx + ', \'img\', this)" class="hidden">';
            html += '      <button onclick="document.getElementById(\'file-hero-img-' + blockIdx + '\').click()" class="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs px-3 rounded-lg font-bold transition flex items-center gap-1"><i data-lucide="upload" class="w-3.5 h-3.5"></i> Unggah</button>';
            html += '    </div>';
            html += '    <div class="mt-2 p-2.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/70 dark:border-emerald-900/30 rounded-xl space-y-1 text-[10px] text-slate-500 dark:text-slate-400 leading-normal">';
            html += '      <div class="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold"><i data-lucide="info" class="w-3.5 h-3.5 flex-shrink-0"></i> Panduan Unggahan Banner Utama:</div>';
            html += '      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 pl-4">';
            html += '        <div>• <strong>Metode Terbaik:</strong> Gunakan tombol <strong>Unggah</strong> di atas</div>';
            html += '        <div>• <strong>Format File:</strong> PNG, JPG, JPEG, atau WebP</div>';
            html += '        <div>• <strong>Dimensi Ideal:</strong> Lanskap Panjang (cth: 1200x675 px / Rasio 16:9)</div>';
            html += '        <div>• <strong>Ukuran Maksimal:</strong> 1 MB (Disarankan &lt; 400 KB agar web ringan)</div>';
            html += '      </div>';
            html += '    </div>';
            html += '  </div>';
        }

        else if (block.type === 'stats') {
            html += '  <div class="space-y-3.5">';
            html += '    <div class="flex items-center justify-between"><span class="text-[10px] font-bold text-slate-400 uppercase">Daftar Angka Statistik</span><button onclick="AppPengaturanLanding.addStatsItem(' + blockIdx + ')" class="text-xs text-primary-600 dark:text-primary-400 font-extrabold flex items-center gap-1 hover:underline"><i data-lucide="plus-circle" class="w-3.5 h-3.5"></i> Tambah Item</button></div>';
            (block.items || []).forEach(function(item, itemIdx) {
                html += '    <div class="flex gap-2 items-center p-2.5 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 rounded-xl">';
                html += '      <div class="flex-1 grid grid-cols-2 gap-2">';
                html += '        <input type="text" value="' + Utils.escapeHtml(item.value) + '" oninput="AppPengaturanLanding.syncStatsItem(' + blockIdx + ',' + itemIdx + ',\'value\', this.value)" placeholder="Contoh: 3.000+" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-1.5 text-xs outline-none dark:text-white font-bold">';
                html += '        <input type="text" value="' + Utils.escapeHtml(item.label) + '" oninput="AppPengaturanLanding.syncStatsItem(' + blockIdx + ',' + itemIdx + ',\'label\', this.value)" placeholder="Label: Jenis Obat" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-1.5 text-xs outline-none dark:text-white">';
                html += '      </div>';
                html += '      <button onclick="AppPengaturanLanding.deleteStatsItem(' + blockIdx + ',' + itemIdx + ')" class="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>';
                html += '    </div>';
            });
            html += '  </div>';
        }

        else if (block.type === 'doctor-schedule') {
            html += '  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">';
            html += '    <div>';
            html += '      <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sub-judul Seksi</label>';
            html += '      <input type="text" value="' + Utils.escapeHtml(block.title || '') + '" oninput="AppPengaturanLanding.syncBlockField(' + blockIdx + ', \'title\', this.value)" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-primary-500 dark:text-white">';
            html += '    </div>';
            html += '    <div class="sm:col-span-2">';
            html += '      <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Judul Utama (Heading)</label>';
            html += '      <input type="text" value="' + Utils.escapeHtml(block.heading || '') + '" oninput="AppPengaturanLanding.syncBlockField(' + blockIdx + ', \'heading\', this.value)" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-primary-500 dark:text-white">';
            html += '    </div>';
            html += '  </div>';

            html += '  <div>';
            html += '    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Deskripsi Seksi</label>';
            html += '    <textarea rows="2" oninput="AppPengaturanLanding.syncBlockField(' + blockIdx + ', \'desc\', this.value)" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-primary-500 dark:text-white leading-relaxed">' + Utils.escapeHtml(block.desc || '') + '</textarea>';
            html += '  </div>';

            // Manage doctor schedule list for a specific day
            html += '  <div class="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">';
            html += '    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">';
            html += '      <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Editor Dokter Per Hari Praktik</span>';
            html += '      <div class="flex flex-wrap gap-1.5">';
            ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].forEach(function(day) {
                var isActive = self.activeDoctorDay === day;
                html += '      <button onclick="AppPengaturanLanding.setActiveDoctorDay(\'' + day + '\')" class="px-2 py-1 text-[10px] font-black rounded-lg transition ' + (isActive ? 'bg-primary-600 text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300') + '">' + day + '</button>';
            });
            html += '      </div>';
            html += '    </div>';

            html += '    <div class="p-3 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 rounded-xl space-y-3.5">';
            html += '      <div class="flex justify-between items-center"><span class="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">Jadwal Hari: ' + self.activeDoctorDay + '</span><button onclick="AppPengaturanLanding.addDoctorItem(' + blockIdx + ')" class="text-xs text-primary-600 dark:text-primary-400 font-bold flex items-center gap-1 hover:underline"><i data-lucide="plus-circle" class="w-3.5 h-3.5"></i> Tambah Dokter</button></div>';
            
            var daySchedules = (block.schedules && block.schedules[self.activeDoctorDay]) ? block.schedules[self.activeDoctorDay] : [];
            if (daySchedules.length === 0) {
                html += '      <p class="text-[11px] text-slate-400 text-center py-4">Belum ada dokter di hari ' + self.activeDoctorDay + '. Klik "Tambah Dokter" di atas.</p>';
            } else {
                daySchedules.forEach(function(doc, docIdx) {
                    html += '    <div class="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 rounded-xl space-y-2.5">';
                    html += '      <div class="flex justify-between items-center">';
                    html += '        <span class="text-[10px] font-bold text-slate-400">Dokter #' + (docIdx + 1) + '</span>';
                    html += '        <button onclick="AppPengaturanLanding.deleteDoctorItem(' + blockIdx + ',' + docIdx + ')" class="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>';
                    html += '      </div>';
                    html += '      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">';
                    html += '        <div><label class="text-[9px] text-slate-400 block">Nama Dokter</label><input type="text" value="' + Utils.escapeHtml(doc.name || '') + '" oninput="AppPengaturanLanding.syncDoctorItem(' + blockIdx + ',' + docIdx + ',\'name\', this.value)" class="w-full rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-1 text-[11px] outline-none dark:text-white font-bold"></div>';
                    html += '        <div><label class="text-[9px] text-slate-400 block">Spesialisasi</label><input type="text" value="' + Utils.escapeHtml(doc.spec || '') + '" oninput="AppPengaturanLanding.syncDoctorItem(' + blockIdx + ',' + docIdx + ',\'spec\', this.value)" class="w-full rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-1 text-[11px] outline-none dark:text-white"></div>';
                    html += '        <div><label class="text-[9px] text-slate-400 block">Jam Praktik</label><input type="text" value="' + Utils.escapeHtml(doc.hours || '') + '" oninput="AppPengaturanLanding.syncDoctorItem(' + blockIdx + ',' + docIdx + ',\'hours\', this.value)" class="w-full rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-1 text-[11px] outline-none dark:text-white"></div>';
                    html += '      </div>';
                    html += '      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">';
                    html += '        <div>';
                    html += '          <label class="text-[9px] text-slate-400 block mb-0.5">Foto Dokter</label>';
                    html += '          <div class="flex gap-1.5">';
                    html += '            <input type="text" id="inp-doc-img-' + blockIdx + '-' + docIdx + '" value="' + Utils.escapeHtml(doc.img || '') + '" oninput="AppPengaturanLanding.syncDoctorItem(' + blockIdx + ',' + docIdx + ',\'img\', this.value)" class="flex-1 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-1 text-[10px] outline-none dark:text-white" placeholder="URL / Base64">';
                    html += '            <input type="file" id="file-doc-img-' + blockIdx + '-' + docIdx + '" accept="image/*" onchange="AppPengaturanLanding.uploadDoctorImage(' + blockIdx + ',' + docIdx + ', this)" class="hidden">';
                    html += '            <button onclick="document.getElementById(\'file-doc-img-\' + ' + blockIdx + ' + \'-\' + ' + docIdx + ').click()" class="bg-slate-200 hover:bg-slate-300 dark:bg-slate-750 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[10px] px-2.5 rounded font-bold transition flex items-center gap-1"><i data-lucide="upload" class="w-3 h-3"></i> Unggah</button>';
                    html += '          </div>';
                    html += '          <p class="text-[8px] text-slate-400 mt-1 leading-normal"><strong>Saran:</strong> PNG/JPG/WebP transparan, Rasio 1:1 Kotak (cth: 300x300 px), Maksimal 500 KB.</p>';
                    html += '        </div>';
                    html += '        <div>';
                    html += '          <label class="text-[9px] text-slate-400 block mb-0.5">Profil Singkat / Riwayat Pendidikan (Bio)</label>';
                    html += '          <input type="text" value="' + Utils.escapeHtml(doc.bio || '') + '" oninput="AppPengaturanLanding.syncDoctorItem(' + blockIdx + ',' + docIdx + ',\'bio\', this.value)" placeholder="Contoh: Lulusan UI, Ahli kesehatan anak" class="w-full rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-1 text-[11px] outline-none dark:text-white">';
                    html += '        </div>';
                    html += '      </div>';
                    if (doc.img) {
                        html += '      <div class="flex items-center gap-2 bg-white dark:bg-slate-950 p-1.5 rounded border border-slate-150 dark:border-slate-850 w-fit">';
                        html += '        <span class="text-[9px] text-slate-400">Pratinjau Foto Dokter:</span>';
                        html += '        <img src="' + Utils.escapeHtml(doc.img) + '" class="h-8 w-8 object-cover rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">';
                        html += '      </div>';
                    }
                    html += '    </div>';
                });
            }

            html += '    </div>';
            html += '  </div>';

            // Manage doctor profile cards
            html += '  <div class="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">';
            html += '    <div class="flex justify-between items-center">';
            html += '      <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Kelola Master Profil &amp; Foto Dokter</span>';
            html += '      <button onclick="AppPengaturanLanding.addDoctorProfile(' + blockIdx + ')" class="text-xs text-primary-600 dark:text-primary-400 font-bold flex items-center gap-1 hover:underline"><i data-lucide="plus-circle" class="w-3.5 h-3.5"></i> Tambah Profil Dokter</button>';
            html += '    </div>';
            html += '    <div class="p-3 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 rounded-xl space-y-3.5">';
            
            var profiles = block.profiles || [];
            if (profiles.length === 0) {
                html += '      <p class="text-[11px] text-slate-400 text-center py-4">Belum ada profil dokter. Klik "Tambah Profil Dokter" di atas.</p>';
            } else {
                profiles.forEach(function(prof, profIdx) {
                    html += '    <div class="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 rounded-xl space-y-2.5">';
                    html += '      <div class="flex justify-between items-center">';
                    html += '        <span class="text-[10px] font-bold text-slate-400">Profil Dokter #' + (profIdx + 1) + '</span>';
                    html += '        <button onclick="AppPengaturanLanding.deleteDoctorProfile(' + blockIdx + ',' + profIdx + ')" class="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>';
                    html += '      </div>';
                    html += '      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">';
                    html += '        <div><label class="text-[9px] text-slate-400 block">Nama Dokter &amp; Gelar</label><input type="text" value="' + Utils.escapeHtml(prof.name || '') + '" oninput="AppPengaturanLanding.syncDoctorProfile(' + blockIdx + ',' + profIdx + ',\'name\', this.value)" class="w-full rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-1 text-[11px] outline-none dark:text-white font-bold"></div>';
                    html += '        <div><label class="text-[9px] text-slate-400 block">Spesialisasi / Poli</label><input type="text" value="' + Utils.escapeHtml(prof.spec || '') + '" oninput="AppPengaturanLanding.syncDoctorProfile(' + blockIdx + ',' + profIdx + ',\'spec\', this.value)" class="w-full rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-1 text-[11px] outline-none dark:text-white"></div>';
                    html += '      </div>';
                    html += '      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">';
                    html += '        <div><label class="text-[9px] text-slate-400 block">Riwayat Pendidikan</label><input type="text" value="' + Utils.escapeHtml(prof.education || '') + '" oninput="AppPengaturanLanding.syncDoctorProfile(' + blockIdx + ',' + profIdx + ',\'education\', this.value)" placeholder="Contoh: S1 Kedokteran UI, Sp.PD UI" class="w-full rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-1 text-[11px] outline-none dark:text-white"></div>';
                    html += '        <div>';
                    html += '          <label class="text-[9px] text-slate-400 block mb-0.5">Foto Profil</label>';
                    html += '          <div class="flex gap-1.5">';
                    html += '            <input type="text" id="inp-prof-img-' + blockIdx + '-' + profIdx + '" value="' + Utils.escapeHtml(prof.img || '') + '" oninput="AppPengaturanLanding.syncDoctorProfile(' + blockIdx + ',' + profIdx + ',\'img\', this.value)" class="flex-1 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-1 text-[10px] outline-none dark:text-white" placeholder="URL / Base64">';
                    html += '            <input type="file" id="file-prof-img-' + blockIdx + '-' + profIdx + '" accept="image/*" onchange="AppPengaturanLanding.uploadDoctorProfileImage(' + blockIdx + ',' + profIdx + ', this)" class="hidden">';
                    html += '            <button onclick="document.getElementById(\'file-prof-img-\' + ' + blockIdx + ' + \'-\' + ' + profIdx + ').click()" class="bg-slate-200 hover:bg-slate-300 dark:bg-slate-750 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[10px] px-2.5 rounded font-bold transition flex items-center gap-1"><i data-lucide="upload" class="w-3 h-3"></i> Unggah</button>';
                    html += '          </div>';
                    html += '        </div>';
                    html += '      </div>';
                    html += '      <div>';
                    html += '        <label class="text-[9px] text-slate-400 block mb-0.5">Profil Singkat / Deskripsi Keahlian (Bio)</label>';
                    html += '        <textarea rows="2" oninput="AppPengaturanLanding.syncDoctorProfile(' + blockIdx + ',' + profIdx + ',\'bio\', this.value)" placeholder="Tuliskan biografi singkat dokter..." class="w-full rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-1 text-[11px] outline-none dark:text-white leading-relaxed">' + Utils.escapeHtml(prof.bio || '') + '</textarea>';
                    html += '      </div>';
                    if (prof.img) {
                        html += '      <div class="flex items-center gap-2 bg-white dark:bg-slate-950 p-1.5 rounded border border-slate-150 dark:border-slate-850 w-fit">';
                        html += '        <span class="text-[9px] text-slate-400">Pratinjau Foto Profil:</span>';
                        html += '        <img src="' + Utils.escapeHtml(prof.img) + '" class="h-10 w-10 object-cover rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">';
                        html += '      </div>';
                    }
                    html += '    </div>';
                });
            }
            html += '    </div>';
            html += '  </div>';
        }

        else if (block.type === 'services') {
            html += '  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">';
            html += '    <div>';
            html += '      <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sub-judul Seksi</label>';
            html += '      <input type="text" value="' + Utils.escapeHtml(block.title || '') + '" oninput="AppPengaturanLanding.syncBlockField(' + blockIdx + ', \'title\', this.value)" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-primary-500 dark:text-white">';
            html += '    </div>';
            html += '    <div class="sm:col-span-2">';
            html += '      <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Judul Komitmen Utama (Heading)</label>';
            html += '      <input type="text" value="' + Utils.escapeHtml(block.heading || '') + '" oninput="AppPengaturanLanding.syncBlockField(' + blockIdx + ', \'heading\', this.value)" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-primary-500 dark:text-white">';
            html += '    </div>';
            html += '  </div>';

            html += '  <div>';
            html += '    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Deskripsi Komitmen</label>';
            html += '    <textarea rows="3" oninput="AppPengaturanLanding.syncBlockField(' + blockIdx + ', \'desc\', this.value)" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-primary-500 dark:text-white leading-relaxed">' + Utils.escapeHtml(block.desc || '') + '</textarea>';
            html += '  </div>';

            html += '  <div>';
            html += '    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Gambar Dokter / Layanan (URL / Base64)</label>';
            html += '    <div class="flex gap-2">';
            html += '      <input type="text" id="inp-services-img-' + blockIdx + '" value="' + Utils.escapeHtml(block.img || '') + '" oninput="AppPengaturanLanding.syncBlockField(' + blockIdx + ', \'img\', this.value)" class="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-primary-500 dark:text-white">';
            html += '      <input type="file" id="file-services-img-' + blockIdx + '" accept="image/*" onchange="AppPengaturanLanding.uploadBlockImage(' + blockIdx + ', \'img\', this)" class="hidden">';
            html += '      <button onclick="document.getElementById(\'file-services-img-' + blockIdx + '\').click()" class="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs px-3 rounded-lg font-bold transition flex items-center gap-1"><i data-lucide="upload" class="w-3.5 h-3.5"></i> Unggah</button>';
            html += '    </div>';
            html += '    <div class="mt-2 p-2.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/70 dark:border-emerald-900/30 rounded-xl space-y-1 text-[10px] text-slate-500 dark:text-slate-400 leading-normal">';
            html += '      <div class="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold"><i data-lucide="info" class="w-3.5 h-3.5 flex-shrink-0"></i> Panduan Unggahan Gambar Layanan:</div>';
            html += '      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 pl-4">';
            html += '        <div>• <strong>Metode Terbaik:</strong> Gunakan tombol <strong>Unggah</strong> di atas</div>';
            html += '        <div>• <strong>Format File:</strong> PNG, JPG, JPEG, atau WebP</div>';
            html += '        <div>• <strong>Dimensi Ideal:</strong> Lanskap (cth: 800x450 px / Rasio 16:9)</div>';
            html += '        <div>• <strong>Ukuran Maksimal:</strong> 1 MB (Disarankan &lt; 400 KB)</div>';
            html += '      </div>';
            html += '    </div>';
            html += '  </div>';

            // Services Cards (Poli List)
            html += '  <div class="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3.5">';
            html += '    <div class="flex items-center justify-between"><span class="text-[10px] font-bold text-slate-400 uppercase">Daftar Layanan Poli</span><button onclick="AppPengaturanLanding.addServiceCard(' + blockIdx + ')" class="text-xs text-primary-600 dark:text-primary-400 font-extrabold flex items-center gap-1 hover:underline"><i data-lucide="plus-circle" class="w-3.5 h-3.5"></i> Tambah Layanan</button></div>';
            (block.items || []).forEach(function(item, itemIdx) {
                html += '    <div class="flex gap-3 items-start p-3 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 rounded-xl">';
                html += '      <div class="flex-shrink-0">';
                html += '        <label class="text-[9px] text-slate-400 block">Ikon</label>';
                html += '        <select onchange="AppPengaturanLanding.syncServiceCard(' + blockIdx + ',' + itemIdx + ',\'icon\', this.value)" class="rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-1 text-[11px] outline-none dark:text-white font-mono">';
                ['heart', 'plus-circle', 'scissors', 'home', 'activity', 'pill', 'shield', 'heart-pulse'].forEach(function(ico) {
                    var isSelected = item.icon === ico;
                    html += '      <option value="' + ico + '" ' + (isSelected ? 'selected' : '') + '>' + ico + '</option>';
                });
                html += '        </select>';
                html += '      </div>';
                html += '      <div class="flex-1 grid grid-cols-1 gap-2">';
                html += '        <div><label class="text-[9px] text-slate-400 block">Nama Poli / Layanan</label><input type="text" value="' + Utils.escapeHtml(item.title) + '" oninput="AppPengaturanLanding.syncServiceCard(' + blockIdx + ',' + itemIdx + ',\'title\', this.value)" class="w-full rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-1 text-[11px] outline-none dark:text-white font-bold"></div>';
                html += '        <div><label class="text-[9px] text-slate-400 block">Deskripsi Singkat</label><textarea rows="2" oninput="AppPengaturanLanding.syncServiceCard(' + blockIdx + ',' + itemIdx + ',\'desc\', this.value)" class="w-full rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-1 text-[11px] outline-none dark:text-white leading-relaxed">' + Utils.escapeHtml(item.desc) + '</textarea></div>';
                html += '      </div>';
                html += '      <button onclick="AppPengaturanLanding.deleteServiceCard(' + blockIdx + ',' + itemIdx + ')" class="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition self-center"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>';
                html += '    </div>';
            });
            html += '  </div>';
        }

        else if (block.type === 'lab-check') {
            html += '  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">';
            html += '    <div>';
            html += '      <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sub-judul Seksi</label>';
            html += '      <input type="text" value="' + Utils.escapeHtml(block.title || '') + '" oninput="AppPengaturanLanding.syncBlockField(' + blockIdx + ', \'title\', this.value)" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-primary-500 dark:text-white">';
            html += '    </div>';
            html += '    <div class="sm:col-span-2">';
            html += '      <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Judul Utama (Heading)</label>';
            html += '      <input type="text" value="' + Utils.escapeHtml(block.heading || '') + '" oninput="AppPengaturanLanding.syncBlockField(' + blockIdx + ', \'heading\', this.value)" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-primary-500 dark:text-white">';
            html += '    </div>';
            html += '  </div>';

            html += '  <div>';
            html += '    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Deskripsi Seksi</label>';
            html += '    <textarea rows="2" oninput="AppPengaturanLanding.syncBlockField(' + blockIdx + ', \'desc\', this.value)" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-primary-500 dark:text-white leading-relaxed">' + Utils.escapeHtml(block.desc || '') + '</textarea>';
            html += '  </div>';

            // Tests list
            html += '  <div class="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3.5">';
            html += '    <div class="flex items-center justify-between"><span class="text-[10px] font-bold text-slate-400 uppercase">Daftar Jenis Tes Lab &amp; Estimasi Harga</span><button onclick="AppPengaturanLanding.addLabTest(' + blockIdx + ')" class="text-xs text-primary-600 dark:text-primary-400 font-extrabold flex items-center gap-1 hover:underline"><i data-lucide="plus-circle" class="w-3.5 h-3.5"></i> Tambah Tes Lab</button></div>';
            (block.tests || []).forEach(function(test, testIdx) {
                html += '    <div class="flex gap-2.5 items-start p-3 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 rounded-xl">';
                html += '      <div class="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">';
                html += '        <div><label class="text-[9px] text-slate-400 block">ID Tes (Unik)</label><input type="text" value="' + Utils.escapeHtml(test.id) + '" oninput="AppPengaturanLanding.syncLabTest(' + blockIdx + ',' + testIdx + ',\'id\', this.value)" placeholder="gds" class="w-full rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-1 text-[11px] outline-none dark:text-white font-mono"></div>';
                html += '        <div><label class="text-[9px] text-slate-400 block">Nama Pemeriksaan</label><input type="text" value="' + Utils.escapeHtml(test.name) + '" oninput="AppPengaturanLanding.syncLabTest(' + blockIdx + ',' + testIdx + ',\'name\', this.value)" class="w-full rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-1 text-[11px] outline-none dark:text-white font-bold"></div>';
                html += '        <div><label class="text-[9px] text-slate-400 block">Biaya (Rupiah)</label><input type="number" value="' + test.price + '" oninput="AppPengaturanLanding.syncLabTest(' + blockIdx + ',' + testIdx + ',\'price\', parseInt(this.value)||0)" class="w-full rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-1 text-[11px] outline-none dark:text-white"></div>';
                html += '        <div class="sm:col-span-3"><label class="text-[9px] text-slate-400 block">Penjelasan Medis Singkat</label><input type="text" value="' + Utils.escapeHtml(test.desc) + '" oninput="AppPengaturanLanding.syncLabTest(' + blockIdx + ',' + testIdx + ',\'desc\', this.value)" class="w-full rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-1 text-[11px] outline-none dark:text-white leading-relaxed"></div>';
                html += '      </div>';
                html += '      <button onclick="AppPengaturanLanding.deleteLabTest(' + blockIdx + ',' + testIdx + ')" class="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition mt-3.5"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>';
                html += '    </div>';
            });
            html += '  </div>';
        }

        else if (block.type === 'lobby-hero') {
            html += '  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">';
            html += '    <div>';
            html += '      <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sub-judul Seksi</label>';
            html += '      <input type="text" value="' + Utils.escapeHtml(block.title || '') + '" oninput="AppPengaturanLanding.syncBlockField(' + blockIdx + ', \'title\', this.value)" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-primary-500 dark:text-white">';
            html += '    </div>';
            html += '    <div>';
            html += '      <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Judul Komitmen Utama (Heading)</label>';
            html += '      <input type="text" value="' + Utils.escapeHtml(block.heading || '') + '" oninput="AppPengaturanLanding.syncBlockField(' + blockIdx + ', \'heading\', this.value)" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-primary-500 dark:text-white">';
            html += '    </div>';
            html += '  </div>';

            html += '  <div>';
            html += '    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Deskripsi Ruangan / Interior</label>';
            html += '    <textarea rows="3" oninput="AppPengaturanLanding.syncBlockField(' + blockIdx + ', \'desc\', this.value)" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-primary-500 dark:text-white leading-relaxed">' + Utils.escapeHtml(block.desc || '') + '</textarea>';
            html += '  </div>';

            html += '  <div>';
            html += '    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Gambar Lobby / Interior (URL / Base64)</label>';
            html += '    <div class="flex gap-2">';
            html += '      <input type="text" id="inp-lobby-img-' + blockIdx + '" value="' + Utils.escapeHtml(block.img || '') + '" oninput="AppPengaturanLanding.syncBlockField(' + blockIdx + ', \'img\', this.value)" class="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-primary-500 dark:text-white">';
            html += '      <input type="file" id="file-lobby-img-' + blockIdx + '" accept="image/*" onchange="AppPengaturanLanding.uploadBlockImage(' + blockIdx + ', \'img\', this)" class="hidden">';
            html += '      <button onclick="document.getElementById(\'file-lobby-img-' + blockIdx + '\').click()" class="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs px-3 rounded-lg font-bold transition flex items-center gap-1"><i data-lucide="upload" class="w-3.5 h-3.5"></i> Unggah</button>';
            html += '    </div>';
            html += '    <div class="mt-2 p-2.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/70 dark:border-emerald-900/30 rounded-xl space-y-1 text-[10px] text-slate-500 dark:text-slate-400 leading-normal">';
            html += '      <div class="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold"><i data-lucide="info" class="w-3.5 h-3.5 flex-shrink-0"></i> Panduan Unggahan Gambar Lobby/Interior:</div>';
            html += '      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 pl-4">';
            html += '        <div>• <strong>Metode Terbaik:</strong> Gunakan tombol <strong>Unggah</strong> di atas</div>';
            html += '        <div>• <strong>Format File:</strong> PNG, JPG, JPEG, atau WebP</div>';
            html += '        <div>• <strong>Dimensi Ideal:</strong> Lanskap (cth: 800x450 px / Rasio 16:9)</div>';
            html += '        <div>• <strong>Ukuran Maksimal:</strong> 1 MB (Disarankan &lt; 400 KB)</div>';
            html += '      </div>';
            html += '    </div>';
            html += '  </div>';

            // Text Badges
            html += '  <div class="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3.5">';
            html += '    <div class="flex items-center justify-between"><span class="text-[10px] font-bold text-slate-400 uppercase">Lencana Fasilitas (Badges)</span><button onclick="AppPengaturanLanding.addLobbyBadge(' + blockIdx + ')" class="text-xs text-primary-600 dark:text-primary-400 font-extrabold flex items-center gap-1 hover:underline"><i data-lucide="plus-circle" class="w-3.5 h-3.5"></i> Tambah Lencana</button></div>';
            (block.badges || []).forEach(function(badge, badgeIdx) {
                html += '    <div class="flex gap-2 items-center p-1.5 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 rounded-xl">';
                html += '      <input type="text" value="' + Utils.escapeHtml(badge) + '" oninput="AppPengaturanLanding.syncLobbyBadge(' + blockIdx + ',' + badgeIdx + ', this.value)" placeholder="Contoh: AC &amp; TV Sejuk" class="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-1.5 text-xs outline-none dark:text-white font-semibold">';
                html += '      <button onclick="AppPengaturanLanding.deleteLobbyBadge(' + blockIdx + ',' + badgeIdx + ')" class="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>';
                html += '    </div>';
            });
            html += '  </div>';
        }

        else if (block.type === 'testimonials') {
            html += '  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">';
            html += '    <div>';
            html += '      <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sub-judul Seksi</label>';
            html += '      <input type="text" value="' + Utils.escapeHtml(block.title || '') + '" oninput="AppPengaturanLanding.syncBlockField(' + blockIdx + ', \'title\', this.value)" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-primary-500 dark:text-white">';
            html += '    </div>';
            html += '    <div>';
            html += '      <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Judul Utama (Heading)</label>';
            html += '      <input type="text" value="' + Utils.escapeHtml(block.heading || '') + '" oninput="AppPengaturanLanding.syncBlockField(' + blockIdx + ', \'heading\', this.value)" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-primary-500 dark:text-white">';
            html += '    </div>';
            html += '  </div>';

            // Testimonials lists
            html += '  <div class="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3.5">';
            html += '    <div class="flex items-center justify-between"><span class="text-[10px] font-bold text-slate-400 uppercase">Ulasan Pasien (Testimoni)</span><button onclick="AppPengaturanLanding.addTestimonialItem(' + blockIdx + ')" class="text-xs text-primary-600 dark:text-primary-400 font-extrabold flex items-center gap-1 hover:underline"><i data-lucide="plus-circle" class="w-3.5 h-3.5"></i> Tambah Testimoni</button></div>';
            (block.items || []).forEach(function(item, itemIdx) {
                html += '    <div class="p-3 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 rounded-xl space-y-2">';
                html += '      <div class="flex justify-between gap-4 items-center">';
                html += '        <div class="flex-1"><label class="text-[9px] text-slate-400">Nama Pasien / Pengulas</label><input type="text" value="' + Utils.escapeHtml(item.name) + '" oninput="AppPengaturanLanding.syncTestimonialItem(' + blockIdx + ',' + itemIdx + ',\'name\', this.value)" class="w-full rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-1 text-[11px] outline-none dark:text-white font-bold"></div>';
                html += '        <div>';
                html += '          <label class="text-[9px] text-slate-400 block">Bintang</label>';
                html += '          <select onchange="AppPengaturanLanding.syncTestimonialItem(' + blockIdx + ',' + itemIdx + ',\'stars\', parseInt(this.value)||5)" class="rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-1 text-[11px] outline-none dark:text-white font-bold">';
                [5, 4, 3, 2, 1].forEach(function(st) {
                    html += '        <option value="' + st + '" ' + (item.stars === st ? 'selected' : '') + '>' + st + ' Bintang</option>';
                });
                html += '          </select>';
                html += '        </div>';
                html += '        <button onclick="AppPengaturanLanding.deleteTestimonialItem(' + blockIdx + ',' + itemIdx + ')" class="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition mt-4"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>';
                html += '      </div>';
                html += '      <div><label class="text-[9px] text-slate-400">Kalimat Testimoni</label><textarea rows="2" oninput="AppPengaturanLanding.syncTestimonialItem(' + blockIdx + ',' + itemIdx + ',\'text\', this.value)" class="w-full rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-1 text-[11px] outline-none dark:text-white leading-relaxed">' + Utils.escapeHtml(item.text) + '</textarea></div>';
                html += '    </div>';
            });
            html += '  </div>';
        }

        else if (block.type === 'faq') {
            html += '  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">';
            html += '    <div>';
            html += '      <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sub-judul Seksi</label>';
            html += '      <input type="text" value="' + Utils.escapeHtml(block.title || '') + '" oninput="AppPengaturanLanding.syncBlockField(' + blockIdx + ', \'title\', this.value)" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-primary-500 dark:text-white">';
            html += '    </div>';
            html += '    <div>';
            html += '      <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Judul Utama (Heading)</label>';
            html += '      <input type="text" value="' + Utils.escapeHtml(block.heading || '') + '" oninput="AppPengaturanLanding.syncBlockField(' + blockIdx + ', \'heading\', this.value)" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-primary-500 dark:text-white">';
            html += '    </div>';
            html += '  </div>';

            // FAQ Items list
            html += '  <div class="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3.5">';
            html += '    <div class="flex items-center justify-between"><span class="text-[10px] font-bold text-slate-400 uppercase">Pertanyaan &amp; Jawaban FAQ</span><button onclick="AppPengaturanLanding.addFaqItem(' + blockIdx + ')" class="text-xs text-primary-600 dark:text-primary-400 font-extrabold flex items-center gap-1 hover:underline"><i data-lucide="plus-circle" class="w-3.5 h-3.5"></i> Tambah Pertanyaan</button></div>';
            (block.items || []).forEach(function(item, itemIdx) {
                html += '    <div class="p-3 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 rounded-xl space-y-2">';
                html += '      <div class="flex justify-between gap-4 items-center">';
                html += '        <div class="flex-1"><label class="text-[9px] text-slate-400">Pertanyaan (Question)</label><input type="text" value="' + Utils.escapeHtml(item.question) + '" oninput="AppPengaturanLanding.syncFaqItem(' + blockIdx + ',' + itemIdx + ',\'question\', this.value)" class="w-full rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-1.5 text-[11px] outline-none dark:text-white font-bold"></div>';
                html += '        <button onclick="AppPengaturanLanding.deleteFaqItem(' + blockIdx + ',' + itemIdx + ')" class="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition mt-4"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>';
                html += '      </div>';
                html += '      <div><label class="text-[9px] text-slate-400">Jawaban (Answer)</label><textarea rows="3" oninput="AppPengaturanLanding.syncFaqItem(' + blockIdx + ',' + itemIdx + ',\'answer\', this.value)" class="w-full rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-1.5 text-[11px] outline-none dark:text-white leading-relaxed">' + Utils.escapeHtml(item.answer) + '</textarea></div>';
                html += '    </div>';
            });
            html += '  </div>';
        }

        else if (block.type === 'contact') {
            html += '  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">';
            html += '    <div>';
            html += '      <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sub-judul Seksi</label>';
            html += '      <input type="text" value="' + Utils.escapeHtml(block.title || '') + '" oninput="AppPengaturanLanding.syncBlockField(' + blockIdx + ', \'title\', this.value)" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-primary-500 dark:text-white">';
            html += '    </div>';
            html += '    <div>';
            html += '      <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Judul Utama (Heading)</label>';
            html += '      <input type="text" value="' + Utils.escapeHtml(block.heading || '') + '" oninput="AppPengaturanLanding.syncBlockField(' + blockIdx + ', \'heading\', this.value)" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-primary-500 dark:text-white">';
            html += '    </div>';
            html += '  </div>';

            html += '  <div>';
            html += '    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Deskripsi Ringkas</label>';
            html += '    <textarea rows="2" oninput="AppPengaturanLanding.syncBlockField(' + blockIdx + ', \'desc\', this.value)" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-primary-500 dark:text-white leading-relaxed">' + Utils.escapeHtml(block.desc || '') + '</textarea>';
            html += '  </div>';
            html += '  <p class="text-[10px] text-slate-400 leading-normal italic bg-slate-100 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-800/50">Seksi ini juga menampilkan form isian surat/pesan WhatsApp dinamis beserta alamat fisik, telepon, dan email resmi yang terkonfigurasi di tab "Branding &amp; Medsos".</p>';
        }

        else if (block.type === 'gallery') {
            html += '  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">';
            html += '    <div>';
            html += '      <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sub-judul Seksi</label>';
            html += '      <input type="text" value="' + Utils.escapeHtml(block.title || '') + '" oninput="AppPengaturanLanding.syncBlockField(' + blockIdx + ', \'title\', this.value)" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-primary-500 dark:text-white">';
            html += '    </div>';
            html += '    <div>';
            html += '      <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Judul Utama (Heading)</label>';
            html += '      <input type="text" value="' + Utils.escapeHtml(block.heading || '') + '" oninput="AppPengaturanLanding.syncBlockField(' + blockIdx + ', \'heading\', this.value)" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-primary-500 dark:text-white">';
            html += '    </div>';
            html += '  </div>';

            html += '  <div>';
            html += '    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Deskripsi Seksi</label>';
            html += '    <textarea rows="2" oninput="AppPengaturanLanding.syncBlockField(' + blockIdx + ', \'desc\', this.value)" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-primary-500 dark:text-white leading-relaxed">' + Utils.escapeHtml(block.desc || '') + '</textarea>';
            html += '  </div>';

            // Organizational Structure Editor Fields
            html += '  <div class="border-t border-slate-150 dark:border-slate-800 pt-4 space-y-3">';
            html += '    <span class="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Kustomisasi Struktur Organisasi AULIA</span>';
            html += '    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">';
            html += '      <div>';
            html += '        <label class="block text-[9px] text-slate-400 mb-1">Sub-judul Struktur (Eyebrow)</label>';
            html += '        <input type="text" value="' + Utils.escapeHtml(block.orgSubtitle || '') + '" oninput="AppPengaturanLanding.syncBlockField(' + blockIdx + ', \'orgSubtitle\', this.value)" placeholder="Contoh: Struktur Organisasi" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-primary-500 dark:text-white">';
            html += '      </div>';
            html += '      <div>';
            html += '        <label class="block text-[9px] text-slate-400 mb-1">Judul Struktur</label>';
            html += '        <input type="text" value="' + Utils.escapeHtml(block.orgTitle || '') + '" oninput="AppPengaturanLanding.syncBlockField(' + blockIdx + ', \'orgTitle\', this.value)" placeholder="Contoh: Struktur Organisasi Aulia" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-primary-500 dark:text-white">';
            html += '      </div>';
            html += '    </div>';
            html += '    <div>';
            html += '      <label class="block text-[9px] text-slate-400 mb-1">Deskripsi Ringkas Struktur</label>';
            html += '      <textarea rows="2" oninput="AppPengaturanLanding.syncBlockField(' + blockIdx + ', \'orgDesc\', this.value)" placeholder="Tuliskan deskripsi struktur organisasi..." class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-primary-500 dark:text-white leading-relaxed">' + Utils.escapeHtml(block.orgDesc || '') + '</textarea>';
            html += '    </div>';

            // Members management
            html += '    <div class="space-y-2.5 mt-2">';
            html += '      <div class="flex items-center justify-between">';
            html += '        <span class="text-[9px] font-bold text-slate-500 uppercase">Daftar Anggota Organisasi</span>';
            html += '        <button onclick="AppPengaturanLanding.addOrgMember(' + blockIdx + ')" class="text-[11px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1 hover:underline"><i data-lucide="plus-circle" class="w-3.5 h-3.5"></i> Tambah Anggota</button>';
            html += '      </div>';
            html += '      <div class="space-y-2.5">';
            
            var orgMembers = block.orgMembers || [];
            if (orgMembers.length === 0) {
                html += '        <p class="text-[10px] text-slate-400 text-center py-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/40">Belum ada anggota organisasi. Klik "+ Tambah Anggota" untuk menambahkan.</p>';
            } else {
                orgMembers.forEach(function(member, memberIdx) {
                    html += '    <div class="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 rounded-xl space-y-2">';
                    html += '      <div class="flex justify-between items-center">';
                    html += '        <span class="text-[10px] font-bold text-slate-400">Anggota #' + (memberIdx + 1) + '</span>';
                    html += '        <button onclick="AppPengaturanLanding.deleteOrgMember(' + blockIdx + ',' + memberIdx + ')" class="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>';
                    html += '      </div>';
                    html += '      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">';
                    html += '        <div>';
                    html += '          <label class="block text-[8px] text-slate-400 mb-0.5">Nama Lengkap &amp; Gelar</label>';
                    html += '          <input type="text" value="' + Utils.escapeHtml(member.name || '') + '" oninput="AppPengaturanLanding.syncOrgMember(' + blockIdx + ',' + memberIdx + ',\'name\', this.value)" class="w-full rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-1 text-xs outline-none dark:text-white font-bold">';
                    html += '        </div>';
                    html += '        <div>';
                    html += '          <label class="block text-[8px] text-slate-400 mb-0.5">Jabatan / Peran</label>';
                    html += '          <input type="text" value="' + Utils.escapeHtml(member.role || '') + '" oninput="AppPengaturanLanding.syncOrgMember(' + blockIdx + ',' + memberIdx + ',\'role\', this.value)" placeholder="Contoh: Direktur Utama" class="w-full rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-1 text-xs outline-none dark:text-white">';
                    html += '        </div>';
                    html += '      </div>';
                    html += '      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">';
                    html += '        <div>';
                    html += '          <label class="block text-[8px] text-slate-400 mb-0.5">Divisi / Departemen</label>';
                    html += '          <input type="text" value="' + Utils.escapeHtml(member.dept || '') + '" oninput="AppPengaturanLanding.syncOrgMember(' + blockIdx + ',' + memberIdx + ',\'dept\', this.value)" placeholder="Contoh: Direksi Utama" class="w-full rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-1 text-xs outline-none dark:text-white">';
                    html += '        </div>';
                    html += '        <div>';
                    html += '          <label class="block text-[8px] text-slate-400 mb-0.5">Foto Anggota</label>';
                    html += '          <div class="flex gap-1.5">';
                    html += '            <input type="text" id="inp-member-img-' + blockIdx + '-' + memberIdx + '" value="' + Utils.escapeHtml(member.img || '') + '" oninput="AppPengaturanLanding.syncOrgMember(' + blockIdx + ',' + memberIdx + ',\'img\', this.value)" class="flex-1 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-1 text-[10px] outline-none dark:text-white" placeholder="URL / Base64">';
                    html += '            <input type="file" id="file-member-img-' + blockIdx + '-' + memberIdx + '" accept="image/*" onchange="AppPengaturanLanding.uploadOrgMemberImage(' + blockIdx + ',' + memberIdx + ', this)" class="hidden">';
                    html += '            <button onclick="document.getElementById(\'file-member-img-\' + ' + blockIdx + ' + \'-\' + ' + memberIdx + ').click()" class="bg-slate-250 hover:bg-slate-350 dark:bg-slate-750 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[10px] px-2 rounded font-bold transition flex items-center gap-1"><i data-lucide="upload" class="w-3 h-3"></i> Unggah</button>';
                    html += '          </div>';
                    html += '        </div>';
                    html += '      </div>';
                    if (member.img) {
                        html += '      <div class="flex items-center gap-2 bg-white dark:bg-slate-950 p-1 rounded border border-slate-150 dark:border-slate-850 w-fit">';
                        html += '        <span class="text-[8px] text-slate-400">Pratinjau:</span>';
                        html += '        <img src="' + Utils.escapeHtml(member.img) + '" class="h-8 w-8 object-cover rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">';
                        html += '      </div>';
                    }
                    html += '    </div>';
                });
            }
            html += '      </div>';
            html += '    </div>';
            html += '  </div>';

            // Photo list inside gallery
            html += '  <div class="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3.5">';
            html += '    <div class="flex items-center justify-between"><span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Daftar Foto Fasilitas</span><button onclick="AppPengaturanLanding.addGalleryItem(' + blockIdx + ')" class="text-xs text-primary-600 dark:text-primary-400 font-extrabold flex items-center gap-1 hover:underline"><i data-lucide="plus-circle" class="w-3.5 h-3.5"></i> Tambah Foto</button></div>';
            (block.items || []).forEach(function(item, itemIdx) {
                html += '    <div class="p-3 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 rounded-xl space-y-3">';
                html += '      <div class="flex justify-between gap-4 items-center">';
                html += '        <span class="text-[10px] font-bold text-slate-500">Foto #' + (itemIdx + 1) + '</span>';
                html += '        <button onclick="AppPengaturanLanding.deleteGalleryItem(' + blockIdx + ',' + itemIdx + ')" class="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>';
                html += '      </div>';
                
                html += '      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">';
                html += '        <div>';
                html += '          <label class="block text-[9px] text-slate-400 mb-1">Keterangan / Caption Foto</label>';
                html += '          <input type="text" value="' + Utils.escapeHtml(item.caption || '') + '" oninput="AppPengaturanLanding.syncGalleryItem(' + blockIdx + ',' + itemIdx + ',\'caption\', this.value)" placeholder="Contoh: Apotek Depan" class="w-full rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2 text-xs outline-none dark:text-white font-semibold">';
                html += '        </div>';
                html += '        <div>';
                html += '          <label class="block text-[9px] text-slate-400 mb-1">Gambar (URL / Base64)</label>';
                html += '          <div class="flex gap-1.5">';
                html += '            <input type="text" id="inp-gallery-img-' + blockIdx + '-' + itemIdx + '" value="' + Utils.escapeHtml(item.img || '') + '" oninput="AppPengaturanLanding.syncGalleryItem(' + blockIdx + ',' + itemIdx + ',\'img\', this.value)" class="flex-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-1.5 text-[11px] outline-none dark:text-white">';
                html += '            <input type="file" id="file-gallery-img-' + blockIdx + '-' + itemIdx + '" accept="image/*" onchange="AppPengaturanLanding.uploadGalleryItemImage(' + blockIdx + ',' + itemIdx + ', this)" class="hidden">';
                html += '            <button onclick="document.getElementById(\'file-gallery-img-\' + ' + blockIdx + ' + \'-\' + ' + itemIdx + ').click()" class="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-[11px] px-2.5 rounded font-bold transition flex items-center gap-1" title="Unggah dari komputer"><i data-lucide="upload" class="w-3.5 h-3.5"></i> Unggah</button>';
                html += '          </div>';
                html += '          <p class="text-[8px] text-slate-400 mt-1 leading-normal"><strong>Saran:</strong> PNG/JPG/WebP, Lanskap (cth: 800x600 px), Maksimal 500 KB.</p>';
                html += '        </div>';
                html += '      </div>';
                
                if (item.img) {
                    html += '      <div class="mt-2 flex items-center gap-3 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800/40">';
                    html += '        <span class="text-[9px] text-slate-400">Pratinjau Foto:</span>';
                    html += '        <img src="' + Utils.escapeHtml(item.img) + '" class="h-12 w-auto object-cover rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">';
                    html += '      </div>';
                }
                
                html += '    </div>';
            });
            html += '  </div>';
        }

        return html;
    },

    // INNER OPERATIONS (REORDERING & MUTATIONS)
    moveBlock: function(index, direction) {
        var blocks = this.data.blocks;
        var targetIdx = index + direction;
        if (targetIdx < 0 || targetIdx >= blocks.length) return;

        // Swap blocks
        var temp = blocks[index];
        blocks[index] = blocks[targetIdx];
        blocks[targetIdx] = temp;

        this.renderBuilder();
        this.updatePreview();
    },

    toggleBlock: function(index) {
        var block = this.data.blocks[index];
        if (block) {
            block.enabled = !block.enabled;
            this.renderBuilder();
            this.updatePreview();
        }
    },

    deleteBlock: function(index) {
        var self = this;
        var modalContent = 
            '<div class="p-6 text-center">' +
            '  <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 mb-4">' +
            '    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>' +
            '  </div>' +
            '  <h3 class="text-lg font-black text-slate-900 dark:text-white mb-2">Hapus Seksi/Puzzle Block</h3>' +
            '  <p class="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">Apakah Anda yakin ingin menghapus seksi/puzzle block ini dari landing page?</p>' +
            '  <div class="flex justify-center gap-3">' +
            '    <button onclick="Utils.closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition">Batal</button>' +
            '    <button id="btn-confirm-delete-block" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition">Ya, Hapus</button>' +
            '  </div>' +
            '</div>';

        Utils.openModal(modalContent);

        var btnConfirm = document.getElementById('btn-confirm-delete-block');
        if (btnConfirm) {
            btnConfirm.onclick = function() {
                Utils.closeModal();
                self.data.blocks.splice(index, 1);
                self.renderBuilder();
                self.updatePreview();
                Utils.toast('Seksi berhasil dihapus.', 'info');
            };
        }
    },

    addBlockFromDropdown: function() {
        var el = document.getElementById('select-add-block');
        if (!el) return;
        this.addBlock(el.value);
    },

    addBlock: function(type) {
        var self = this;
        var id = type + '-' + Date.now();
        var defaultB = null;

        // Retrieve standard template for type from defaultConfig in landing.js
        var landingDef = (window.AppLanding && window.AppLanding.defaultConfig) ? window.AppLanding.defaultConfig : {};
        var match = (landingDef.blocks || []).find(function(b) { return b.type === type; });

        if (match) {
            defaultB = JSON.parse(JSON.stringify(match));
            defaultB.id = id;
            defaultB.enabled = true;
        } else {
            // General empty template
            defaultB = {
                id: id,
                type: type,
                enabled: true,
                title: 'Seksi Baru',
                heading: 'Judul Seksi Baru',
                desc: 'Tulis penjelasan seksi baru Anda di sini.',
                items: []
            };
        }

        this.data.blocks.push(defaultB);
        this.expandedBlockId = id; // auto-expand newly added block
        this.renderBuilder();
        this.updatePreview();
        Utils.toast('Seksi/puzzle baru berhasil ditambahkan! Susun posisinya dengan tombol panah.', 'success');
    },

    syncBlockField: function(blockIdx, field, val) {
        this.data.blocks[blockIdx][field] = val;
        this.updatePreview();
    },

    uploadBlockImage: function(blockIdx, field, inputEl) {
        var self = this;
        var file = inputEl.files ? inputEl.files[0] : null;
        if (!file) return;

        if (file.size > 1.2 * 1024 * 1024) {
            Utils.toast('Gagal: Ukuran file gambar melebihi 1.2 MB.', 'error');
            inputEl.value = '';
            return;
        }

        var reader = new FileReader();
        reader.onload = function(e) {
            var b64 = e.target.result;
            self.data.blocks[blockIdx][field] = b64;
            
            var textInp = document.getElementById('inp-' + self.data.blocks[blockIdx].type + '-img-' + blockIdx);
            if (textInp) textInp.value = b64;

            self.updatePreview();
            Utils.toast('Gambar seksi berhasil diunggah lokal!', 'success');
        };
        reader.readAsDataURL(file);
    },

    // SUB-ITEM EDITORS
    // stats
    addStatsItem: function(blockIdx) {
        if (!this.data.blocks[blockIdx].items) this.data.blocks[blockIdx].items = [];
        this.data.blocks[blockIdx].items.push({ value: '0', label: 'Statistik Baru' });
        this.renderBuilder();
        this.updatePreview();
    },
    deleteStatsItem: function(blockIdx, itemIdx) {
        this.data.blocks[blockIdx].items.splice(itemIdx, 1);
        this.renderBuilder();
        this.updatePreview();
    },
    syncStatsItem: function(blockIdx, itemIdx, field, val) {
        this.data.blocks[blockIdx].items[itemIdx][field] = val;
        this.updatePreview();
    },

    // doctors
    setActiveDoctorDay: function(day) {
        this.activeDoctorDay = day;
        this.renderBuilder();
    },
    addDoctorItem: function(blockIdx) {
        var schedules = this.data.blocks[blockIdx].schedules;
        if (!schedules) schedules = this.data.blocks[blockIdx].schedules = {};
        if (!schedules[this.activeDoctorDay]) schedules[this.activeDoctorDay] = [];

        schedules[this.activeDoctorDay].push({ name: 'dr. Dokter Baru', spec: 'Poli Umum', hours: '08:00 - 12:00' });
        this.renderBuilder();
        this.updatePreview();
    },
    deleteDoctorItem: function(blockIdx, docIdx) {
        this.data.blocks[blockIdx].schedules[this.activeDoctorDay].splice(docIdx, 1);
        this.renderBuilder();
        this.updatePreview();
    },
    syncDoctorItem: function(blockIdx, docIdx, field, val) {
        this.data.blocks[blockIdx].schedules[this.activeDoctorDay][docIdx][field] = val;
        this.updatePreview();
    },

    addDoctorProfile: function(blockIdx) {
        var block = this.data.blocks[blockIdx];
        if (!block.profiles) block.profiles = [];
        block.profiles.push({
            name: "dr. Dokter Baru",
            spec: "Poli Umum",
            bio: "Tulis biografi singkat di sini.",
            img: "",
            education: ""
        });
        this.renderBuilder();
        this.updatePreview();
    },
    deleteDoctorProfile: function(blockIdx, profIdx) {
        this.data.blocks[blockIdx].profiles.splice(profIdx, 1);
        this.renderBuilder();
        this.updatePreview();
    },
    syncDoctorProfile: function(blockIdx, profIdx, field, val) {
        this.data.blocks[blockIdx].profiles[profIdx][field] = val;
        this.updatePreview();
    },
    uploadDoctorProfileImage: function(blockIdx, profIdx, inputEl) {
        var self = this;
        var file = inputEl.files ? inputEl.files[0] : null;
        if (!file) return;

        if (file.size > 1.2 * 1024 * 1024) {
            Utils.toast('Gagal: Ukuran foto profil melebihi 1.2 MB.', 'error');
            inputEl.value = '';
            return;
        }

        var reader = new FileReader();
        reader.onload = function(e) {
            var b64 = e.target.result;
            self.data.blocks[blockIdx].profiles[profIdx].img = b64;
            
            var textInp = document.getElementById('inp-prof-img-' + blockIdx + '-' + profIdx);
            if (textInp) textInp.value = b64;

            self.renderBuilder();
            self.updatePreview();
            Utils.toast('Foto profil berhasil diunggah!', 'success');
        };
        reader.readAsDataURL(file);
    },

    // services
    addServiceCard: function(blockIdx) {
        if (!this.data.blocks[blockIdx].items) this.data.blocks[blockIdx].items = [];
        this.data.blocks[blockIdx].items.push({ title: 'Layanan Poli Baru', desc: 'Penjelasan layanan kesehatan baru.', icon: 'heart' });
        this.renderBuilder();
        this.updatePreview();
    },
    deleteServiceCard: function(blockIdx, itemIdx) {
        this.data.blocks[blockIdx].items.splice(itemIdx, 1);
        this.renderBuilder();
        this.updatePreview();
    },
    syncServiceCard: function(blockIdx, itemIdx, field, val) {
        this.data.blocks[blockIdx].items[itemIdx][field] = val;
        this.updatePreview();
    },

    // lab check tests
    addLabTest: function(blockIdx) {
        if (!this.data.blocks[blockIdx].tests) this.data.blocks[blockIdx].tests = [];
        this.data.blocks[blockIdx].tests.push({ id: 'test-' + Date.now(), name: 'Cek Lab Baru', price: 10000, desc: 'Edukasi tes penunjang baru.' });
        this.renderBuilder();
        this.updatePreview();
    },
    deleteLabTest: function(blockIdx, testIdx) {
        this.data.blocks[blockIdx].tests.splice(testIdx, 1);
        this.renderBuilder();
        this.updatePreview();
    },
    syncLabTest: function(blockIdx, testIdx, field, val) {
        this.data.blocks[blockIdx].tests[testIdx][field] = val;
        this.updatePreview();
    },

    // lobby badges
    addLobbyBadge: function(blockIdx) {
        if (!this.data.blocks[blockIdx].badges) this.data.blocks[blockIdx].badges = [];
        this.data.blocks[blockIdx].badges.push('Lencana Baru');
        this.renderBuilder();
        this.updatePreview();
    },
    deleteLobbyBadge: function(blockIdx, badgeIdx) {
        this.data.blocks[blockIdx].badges.splice(badgeIdx, 1);
        this.renderBuilder();
        this.updatePreview();
    },
    syncLobbyBadge: function(blockIdx, badgeIdx, val) {
        this.data.blocks[blockIdx].badges[badgeIdx] = val;
        this.updatePreview();
    },

    // testimonials
    addTestimonialItem: function(blockIdx) {
        if (!this.data.blocks[blockIdx].items) this.data.blocks[blockIdx].items = [];
        this.data.blocks[blockIdx].items.push({ name: 'Nama Pasien', text: 'Tulis review tulus pasien di sini.', stars: 5 });
        this.renderBuilder();
        this.updatePreview();
    },
    deleteTestimonialItem: function(blockIdx, itemIdx) {
        this.data.blocks[blockIdx].items.splice(itemIdx, 1);
        this.renderBuilder();
        this.updatePreview();
    },
    syncTestimonialItem: function(blockIdx, itemIdx, field, val) {
        this.data.blocks[blockIdx].items[itemIdx][field] = val;
        this.updatePreview();
    },

    // FAQ
    addFaqItem: function(blockIdx) {
        if (!this.data.blocks[blockIdx].items) this.data.blocks[blockIdx].items = [];
        this.data.blocks[blockIdx].items.push({ question: 'Pertanyaan Baru?', answer: 'Tulis jawaban informatif Anda di sini.' });
        this.renderBuilder();
        this.updatePreview();
    },
    deleteFaqItem: function(blockIdx, itemIdx) {
        this.data.blocks[blockIdx].items.splice(itemIdx, 1);
        this.renderBuilder();
        this.updatePreview();
    },
    syncFaqItem: function(blockIdx, itemIdx, field, val) {
        this.data.blocks[blockIdx].items[itemIdx][field] = val;
        this.updatePreview();
    },

    // gallery items
    addGalleryItem: function(blockIdx) {
        if (!this.data.blocks[blockIdx].items) this.data.blocks[blockIdx].items = [];
        this.data.blocks[blockIdx].items.push({ caption: 'Keterangan Foto Baru', img: 'src/assets/images/aulia_clinic_lobby_1784453450466.jpg' });
        this.renderBuilder();
        this.updatePreview();
    },
    deleteGalleryItem: function(blockIdx, itemIdx) {
        this.data.blocks[blockIdx].items.splice(itemIdx, 1);
        this.renderBuilder();
        this.updatePreview();
    },
    syncGalleryItem: function(blockIdx, itemIdx, field, val) {
        this.data.blocks[blockIdx].items[itemIdx][field] = val;
        this.updatePreview();
    },
    uploadGalleryItemImage: function(blockIdx, itemIdx, inputEl) {
        var self = this;
        var file = inputEl.files ? inputEl.files[0] : null;
        if (!file) return;

        if (file.size > 1.2 * 1024 * 1024) {
            Utils.toast('Gagal: Ukuran file gambar melebihi 1.2 MB.', 'error');
            inputEl.value = '';
            return;
        }

        var reader = new FileReader();
        reader.onload = function(e) {
            var b64 = e.target.result;
            self.data.blocks[blockIdx].items[itemIdx].img = b64;
            
            var textInp = document.getElementById('inp-gallery-img-' + blockIdx + '-' + itemIdx);
            if (textInp) textInp.value = b64;

            self.renderBuilder(); // Re-render to show image thumbnail
            self.updatePreview();
            Utils.toast('Gambar galeri berhasil diunggah lokal!', 'success');
        };
        reader.readAsDataURL(file);
    },

    // gallery organizational structure
    addOrgMember: function(blockIdx) {
        var block = this.data.blocks[blockIdx];
        if (!block.orgMembers) block.orgMembers = [];
        block.orgMembers.push({
            name: "Nama Anggota Baru",
            role: "Jabatan / Staff",
            dept: "Divisi / Departemen",
            img: ""
        });
        this.renderBuilder();
        this.updatePreview();
    },
    deleteOrgMember: function(blockIdx, memberIdx) {
        this.data.blocks[blockIdx].orgMembers.splice(memberIdx, 1);
        this.renderBuilder();
        this.updatePreview();
    },
    syncOrgMember: function(blockIdx, memberIdx, field, val) {
        this.data.blocks[blockIdx].orgMembers[memberIdx][field] = val;
        this.updatePreview();
    },
    uploadOrgMemberImage: function(blockIdx, memberIdx, inputEl) {
        var self = this;
        var file = inputEl.files ? inputEl.files[0] : null;
        if (!file) return;

        if (file.size > 1.2 * 1024 * 1024) {
            Utils.toast('Gagal: Ukuran foto melebihi 1.2 MB.', 'error');
            inputEl.value = '';
            return;
        }

        var reader = new FileReader();
        reader.onload = function(e) {
            var b64 = e.target.result;
            self.data.blocks[blockIdx].orgMembers[memberIdx].img = b64;
            
            var textInp = document.getElementById('inp-member-img-' + blockIdx + '-' + memberIdx);
            if (textInp) textInp.value = b64;

            self.renderBuilder();
            self.updatePreview();
            Utils.toast('Foto anggota berhasil diunggah!', 'success');
        };
        reader.readAsDataURL(file);
    },

    // BRAND & SOCIAL MEDIA SYNCERS
    syncGlobalField: function(key, val) {
        this.data[key] = val;
        this.updatePreview();
    },
    syncSocialField: function(key, val) {
        if (!this.data.socials) this.data.socials = {};
        this.data.socials[key] = val;
        this.updatePreview();
    },

    uploadBrandLogo: function(inputEl) {
        var self = this;
        var file = inputEl.files ? inputEl.files[0] : null;
        if (!file) return;

        if (file.size > 1.2 * 1024 * 1024) {
            Utils.toast('Gagal: Ukuran file logo melebihi 1.2 MB.', 'error');
            inputEl.value = '';
            return;
        }

        var reader = new FileReader();
        reader.onload = function(e) {
            var b64 = e.target.result;
            self.data.logoImg = b64;
            
            var textInp = document.getElementById('inp-brand-logo');
            if (textInp) textInp.value = b64;

            self.renderBuilder(); // Re-render tab to show preview
            self.updatePreview();
            Utils.toast('Logo kustom berhasil diunggah!', 'success');
        };
        reader.readAsDataURL(file);
    },

    clearBrandLogo: function() {
        this.data.logoImg = '';
        this.renderBuilder();
        this.updatePreview();
        Utils.toast('Logo dikembalikan ke bawaan SVG sistem.', 'info');
    },

    uploadDoctorImage: function(blockIdx, docIdx, inputEl) {
        var self = this;
        var file = inputEl.files ? inputEl.files[0] : null;
        if (!file) return;

        if (file.size > 1.2 * 1024 * 1024) {
            Utils.toast('Gagal: Ukuran foto dokter melebihi 1.2 MB.', 'error');
            inputEl.value = '';
            return;
        }

        var reader = new FileReader();
        reader.onload = function(e) {
            var b64 = e.target.result;
            self.data.blocks[blockIdx].schedules[self.activeDoctorDay][docIdx].img = b64;
            
            var textInp = document.getElementById('inp-doc-img-' + blockIdx + '-' + docIdx);
            if (textInp) textInp.value = b64;

            self.renderBuilder();
            self.updatePreview();
            Utils.toast('Foto dokter berhasil diunggah!', 'success');
        };
        reader.readAsDataURL(file);
    },

    validateLandingData: function(d) {
        // 1. Brand/Global fields
        if (!d.brandName || d.brandName.trim() === '') {
            return { tab: 'global', error: 'Nama Brand Utama tidak boleh kosong.' };
        }
        if (d.brandName.length > 50) {
            return { tab: 'global', error: 'Nama Brand Utama maksimal 50 karakter.' };
        }
        
        if (!d.brandSub || d.brandSub.trim() === '') {
            return { tab: 'global', error: 'Sub-judul Brand tidak boleh kosong.' };
        }
        if (d.brandSub.length > 100) {
            return { tab: 'global', error: 'Sub-judul Brand maksimal 100 karakter.' };
        }

        if (!d.waNumber || d.waNumber.trim() === '') {
            return { tab: 'global', error: 'No WhatsApp tidak boleh kosong.' };
        }
        var waClean = d.waNumber.replace(/\D/g, '');
        if (waClean.length < 9 || waClean.length > 15) {
            return { tab: 'global', error: 'No WhatsApp tidak valid (harus berupa 9-15 digit angka).' };
        }

        if (!d.phone || d.phone.trim() === '') {
            return { tab: 'global', error: 'Nomor Telepon Kantor tidak boleh kosong.' };
        }
        var phoneRegex = /^[0-9+\s()-\/]{7,25}$/;
        if (!phoneRegex.test(d.phone.trim())) {
            return { tab: 'global', error: 'Format Nomor Telepon Kantor tidak valid.' };
        }

        if (!d.email || d.email.trim() === '') {
            return { tab: 'global', error: 'Alamat Email Resmi tidak boleh kosong.' };
        }
        var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(d.email.trim())) {
            return { tab: 'global', error: 'Alamat Email Resmi tidak valid.' };
        }

        if (!d.address || d.address.trim() === '') {
            return { tab: 'global', error: 'Alamat Fisik Lengkap tidak boleh kosong.' };
        }
        if (d.address.trim().length < 5) {
            return { tab: 'global', error: 'Alamat Fisik Lengkap harus diisi minimal 5 karakter.' };
        }

        // Social links validation
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
        if (fbErr) return { tab: 'global', error: fbErr };
        var igErr = checkUrl(soc.instagram, 'Instagram');
        if (igErr) return { tab: 'global', error: igErr };
        var twErr = checkUrl(soc.twitter, 'Twitter / X');
        if (twErr) return { tab: 'global', error: twErr };

        // 2. Block fields validation (only for enabled blocks)
        var blocks = d.blocks || [];
        for (var i = 0; i < blocks.length; i++) {
            var block = blocks[i];
            if (!block.enabled) continue;

            var bName = this.getBlockName(block.type);

            function checkImage(imgSrc, fieldLabel) {
                if (imgSrc && imgSrc.trim() !== '') {
                    var trimmed = imgSrc.trim();
                    if (trimmed.startsWith('data:image/') || trimmed.startsWith('/') || trimmed.startsWith('.') || trimmed.startsWith('src/')) {
                        return null;
                    }
                    var lower = trimmed.toLowerCase();
                    if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
                        return 'Format URL gambar ' + fieldLabel + ' di seksi "' + bName + '" tidak valid (harus diawali dengan http:// atau https://).';
                    }
                }
                return null;
            }

            if (block.type === 'hero') {
                if (!block.tagline || block.tagline.trim() === '') {
                    return { tab: 'puzzle', blockId: block.id, error: 'Tagline seksi "' + bName + '" tidak boleh kosong.' };
                }
                if (!block.title || block.title.trim() === '') {
                    return { tab: 'puzzle', blockId: block.id, error: 'Judul seksi "' + bName + '" tidak boleh kosong.' };
                }
                if (!block.desc || block.desc.trim() === '') {
                    return { tab: 'puzzle', blockId: block.id, error: 'Deskripsi seksi "' + bName + '" tidak boleh kosong.' };
                }
                var imgErr = checkImage(block.img, 'Hero Banner');
                if (imgErr) return { tab: 'puzzle', blockId: block.id, error: imgErr };
            }

            else if (block.type === 'stats') {
                var items = block.items || [];
                if (items.length === 0) {
                    return { tab: 'puzzle', blockId: block.id, error: 'Seksi "' + bName + '" harus memiliki minimal 1 item statistik.' };
                }
                for (var j = 0; j < items.length; j++) {
                    if (!items[j].value || items[j].value.trim() === '') {
                        return { tab: 'puzzle', blockId: block.id, error: 'Angka statistik ke-' + (j + 1) + ' di seksi "' + bName + '" tidak boleh kosong.' };
                    }
                    if (!items[j].label || items[j].label.trim() === '') {
                        return { tab: 'puzzle', blockId: block.id, error: 'Label statistik ke-' + (j + 1) + ' di seksi "' + bName + '" tidak boleh kosong.' };
                    }
                }
            }

            else if (block.type === 'doctor-schedule') {
                if (!block.title || block.title.trim() === '') {
                    return { tab: 'puzzle', blockId: block.id, error: 'Sub-judul seksi "' + bName + '" tidak boleh kosong.' };
                }
                if (!block.heading || block.heading.trim() === '') {
                    return { tab: 'puzzle', blockId: block.id, error: 'Judul Utama (Heading) seksi "' + bName + '" tidak boleh kosong.' };
                }
                if (block.schedules) {
                    for (var day in block.schedules) {
                        var dayScheds = block.schedules[day] || [];
                        for (var k = 0; k < dayScheds.length; k++) {
                            var doc = dayScheds[k];
                            if (!doc.name || doc.name.trim() === '') {
                                return { tab: 'puzzle', blockId: block.id, error: 'Nama dokter di hari ' + day + ' seksi "' + bName + '" tidak boleh kosong.' };
                            }
                            if (!doc.spec || doc.spec.trim() === '') {
                                return { tab: 'puzzle', blockId: block.id, error: 'Spesialisasi dokter "' + doc.name + '" di hari ' + day + ' seksi "' + bName + '" tidak boleh kosong.' };
                            }
                            if (!doc.hours || doc.hours.trim() === '') {
                                return { tab: 'puzzle', blockId: block.id, error: 'Jam praktik dokter "' + doc.name + '" di hari ' + day + ' seksi "' + bName + '" tidak boleh kosong.' };
                            }
                        }
                    }
                }
            }

            else if (block.type === 'services') {
                if (!block.title || block.title.trim() === '') {
                    return { tab: 'puzzle', blockId: block.id, error: 'Sub-judul seksi "' + bName + '" tidak boleh kosong.' };
                }
                if (!block.heading || block.heading.trim() === '') {
                    return { tab: 'puzzle', blockId: block.id, error: 'Judul Utama (Heading) seksi "' + bName + '" tidak boleh kosong.' };
                }
                if (!block.desc || block.desc.trim() === '') {
                    return { tab: 'puzzle', blockId: block.id, error: 'Deskripsi seksi "' + bName + '" tidak boleh kosong.' };
                }
                var imgErr = checkImage(block.img, 'Dokter / Layanan');
                if (imgErr) return { tab: 'puzzle', blockId: block.id, error: imgErr };

                var sItems = block.items || [];
                for (var j = 0; j < sItems.length; j++) {
                    if (!sItems[j].title || sItems[j].title.trim() === '') {
                        return { tab: 'puzzle', blockId: block.id, error: 'Nama Poli / Layanan ke-' + (j + 1) + ' di seksi "' + bName + '" tidak boleh kosong.' };
                    }
                    if (!sItems[j].desc || sItems[j].desc.trim() === '') {
                        return { tab: 'puzzle', blockId: block.id, error: 'Deskripsi Layanan "' + sItems[j].title + '" di seksi "' + bName + '" tidak boleh kosong.' };
                    }
                }
            }

            else if (block.type === 'lab-check') {
                if (!block.title || block.title.trim() === '') {
                    return { tab: 'puzzle', blockId: block.id, error: 'Sub-judul seksi "' + bName + '" tidak boleh kosong.' };
                }
                if (!block.heading || block.heading.trim() === '') {
                    return { tab: 'puzzle', blockId: block.id, error: 'Judul Utama (Heading) seksi "' + bName + '" tidak boleh kosong.' };
                }
                if (!block.desc || block.desc.trim() === '') {
                    return { tab: 'puzzle', blockId: block.id, error: 'Deskripsi seksi "' + bName + '" tidak boleh kosong.' };
                }

                var tests = block.tests || [];
                for (var j = 0; j < tests.length; j++) {
                    var test = tests[j];
                    if (!test.id || test.id.trim() === '') {
                        return { tab: 'puzzle', blockId: block.id, error: 'ID Tes ke-' + (j + 1) + ' di seksi "' + bName + '" tidak boleh kosong.' };
                    }
                    if (!/^[a-zA-Z0-9_\-]+$/.test(test.id.trim())) {
                        return { tab: 'puzzle', blockId: block.id, error: 'ID Tes "' + test.id + '" di seksi "' + bName + '" hanya boleh berisi huruf, angka, strip (-), atau underscore (_).' };
                    }
                    if (!test.name || test.name.trim() === '') {
                        return { tab: 'puzzle', blockId: block.id, error: 'Nama Pemeriksaan di seksi "' + bName + '" tidak boleh kosong.' };
                    }
                    if (test.price === undefined || isNaN(test.price) || test.price < 0) {
                        return { tab: 'puzzle', blockId: block.id, error: 'Biaya Tes "' + test.name + '" di seksi "' + bName + '" harus berupa angka positif.' };
                    }
                }
            }

            else if (block.type === 'lobby-hero') {
                if (!block.title || block.title.trim() === '') {
                    return { tab: 'puzzle', blockId: block.id, error: 'Sub-judul seksi "' + bName + '" tidak boleh kosong.' };
                }
                if (!block.heading || block.heading.trim() === '') {
                    return { tab: 'puzzle', blockId: block.id, error: 'Judul Utama (Heading) seksi "' + bName + '" tidak boleh kosong.' };
                }
                if (!block.desc || block.desc.trim() === '') {
                    return { tab: 'puzzle', blockId: block.id, error: 'Deskripsi seksi "' + bName + '" tidak boleh kosong.' };
                }
                var imgErr = checkImage(block.img, 'Lobby / Interior');
                if (imgErr) return { tab: 'puzzle', blockId: block.id, error: imgErr };

                var badges = block.badges || [];
                for (var j = 0; j < badges.length; j++) {
                    if (!badges[j] || badges[j].trim() === '') {
                        return { tab: 'puzzle', blockId: block.id, error: 'Lencana Fasilitas ke-' + (j + 1) + ' di seksi "' + bName + '" tidak boleh kosong.' };
                    }
                }
            }

            else if (block.type === 'gallery') {
                if (!block.title || block.title.trim() === '') {
                    return { tab: 'puzzle', blockId: block.id, error: 'Sub-judul seksi "' + bName + '" tidak boleh kosong.' };
                }
                if (!block.heading || block.heading.trim() === '') {
                    return { tab: 'puzzle', blockId: block.id, error: 'Judul Utama (Heading) seksi "' + bName + '" tidak boleh kosong.' };
                }

                var gItems = block.items || [];
                for (var j = 0; j < gItems.length; j++) {
                    var item = gItems[j];
                    if (!item.img || item.img.trim() === '') {
                        return { tab: 'puzzle', blockId: block.id, error: 'URL/Gambar foto ke-' + (j + 1) + ' di seksi "' + bName + '" tidak boleh kosong.' };
                    }
                    var imgErr = checkImage(item.img, 'Foto Ke-' + (j + 1));
                    if (imgErr) return { tab: 'puzzle', blockId: block.id, error: imgErr };
                    if (!item.caption || item.caption.trim() === '') {
                        return { tab: 'puzzle', blockId: block.id, error: 'Keterangan/caption foto ke-' + (j + 1) + ' di seksi "' + bName + '" tidak boleh kosong.' };
                    }
                }
            }

            else if (block.type === 'testimonials') {
                if (!block.title || block.title.trim() === '') {
                    return { tab: 'puzzle', blockId: block.id, error: 'Sub-judul seksi "' + bName + '" tidak boleh kosong.' };
                }
                if (!block.heading || block.heading.trim() === '') {
                    return { tab: 'puzzle', blockId: block.id, error: 'Judul Utama (Heading) seksi "' + bName + '" tidak boleh kosong.' };
                }

                var tItems = block.items || [];
                for (var j = 0; j < tItems.length; j++) {
                    var item = tItems[j];
                    if (!item.name || item.name.trim() === '') {
                        return { tab: 'puzzle', blockId: block.id, error: 'Nama pengulas ke-' + (j + 1) + ' di seksi "' + bName + '" tidak boleh kosong.' };
                    }
                    if (!item.text || item.text.trim() === '') {
                        return { tab: 'puzzle', blockId: block.id, error: 'Kalimat testimoni dari "' + item.name + '" di seksi "' + bName + '" tidak boleh kosong.' };
                    }
                    if (item.stars === undefined || isNaN(item.stars) || item.stars < 1 || item.stars > 5) {
                        return { tab: 'puzzle', blockId: block.id, error: 'Bintang testimoni dari "' + item.name + '" di seksi "' + bName + '" harus bernilai 1-5.' };
                    }
                }
            }

            else if (block.type === 'faq') {
                if (!block.title || block.title.trim() === '') {
                    return { tab: 'puzzle', blockId: block.id, error: 'Sub-judul seksi "' + bName + '" tidak boleh kosong.' };
                }
                if (!block.heading || block.heading.trim() === '') {
                    return { tab: 'puzzle', blockId: block.id, error: 'Judul Utama (Heading) seksi "' + bName + '" tidak boleh kosong.' };
                }

                var fItems = block.items || [];
                for (var j = 0; j < fItems.length; j++) {
                    var item = fItems[j];
                    if (!item.question || item.question.trim() === '') {
                        return { tab: 'puzzle', blockId: block.id, error: 'Pertanyaan FAQ ke-' + (j + 1) + ' di seksi "' + bName + '" tidak boleh kosong.' };
                    }
                    if (!item.answer || item.answer.trim() === '') {
                        return { tab: 'puzzle', blockId: block.id, error: 'Jawaban FAQ ke-' + (j + 1) + ' di seksi "' + bName + '" tidak boleh kosong.' };
                    }
                }
            }
        }

        return null;
    },

    // REAL-TIME HIGH-FIDELITY PREVIEW RENDERING (RIGHT VIEWPORT)
    updatePreview: function() {
        var self = this;
        var viewport = document.getElementById('live-preview-viewport');
        if (!viewport) return;

        var d = this.data;
        var previewHtml = '';

        // Mini Brand Header
        previewHtml += '<div class="pb-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl">';
        previewHtml += '  <div class="flex items-center gap-2">';
        previewHtml += '    <img src="' + Utils.escapeHtml(d.logoImg || 'logo-192.png') + '" class="w-6 h-6 object-contain rounded">';
        previewHtml += '    <div>';
        previewHtml += '      <h5 class="text-xs font-black text-slate-800 dark:text-white line-clamp-1">' + Utils.escapeHtml(d.brandName || 'AULIA') + '</h5>';
        previewHtml += '      <p class="text-[8px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest leading-none mt-0.5">' + Utils.escapeHtml(d.brandSub || 'Apotek') + '</p>';
        previewHtml += '    </div>';
        previewHtml += '  </div>';
        previewHtml += '  <div class="h-6 bg-slate-200 dark:bg-slate-700 px-3 flex items-center rounded-lg text-[8px] font-black text-slate-600 dark:text-slate-300">WA: ' + Utils.escapeHtml(d.waNumber || '') + '</div>';
        previewHtml += '</div>';

        // Loop and render miniature modules
        (d.blocks || []).forEach(function(block) {
            if (!block.enabled) return;
            if (self.activeTab !== 'global' && self.getBlockPage(block.type) !== self.activeTab) return;

            previewHtml += '<div class="py-3.5 space-y-1.5 first:pt-2">';

            if (block.type === 'hero') {
                previewHtml += '  <div class="bg-gradient-to-r from-emerald-500/5 to-primary-500/5 p-3 rounded-xl border border-emerald-500/10">';
                previewHtml += '    <span class="text-[8px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/30">' + Utils.escapeHtml(block.tagline || 'HERO') + '</span>';
                previewHtml += '    <h6 class="font-extrabold text-[11px] text-slate-800 dark:text-white mt-1 leading-snug">' + Utils.escapeHtml(block.title || '') + '</h6>';
                previewHtml += '    <p class="text-[9px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">' + Utils.escapeHtml(block.desc || '') + '</p>';
                if (block.img) {
                    previewHtml += '  <img src="' + Utils.escapeHtml(block.img) + '" class="w-full h-20 object-cover rounded-lg mt-2.5 bg-slate-100 dark:bg-slate-800">';
                }
                previewHtml += '  </div>';
            } 
            
            else if (block.type === 'stats') {
                previewHtml += '  <div class="grid grid-cols-4 gap-1.5 text-center p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">';
                (block.items || []).forEach(function(item) {
                    previewHtml += '  <div>';
                    previewHtml += '    <p class="text-[10px] font-black text-emerald-600 dark:text-emerald-400">' + Utils.escapeHtml(item.value) + '</p>';
                    previewHtml += '    <p class="text-[7px] text-slate-400 uppercase font-bold leading-none scale-90 mt-0.5">' + Utils.escapeHtml(item.label) + '</p>';
                    previewHtml += '  </div>';
                });
                previewHtml += '  </div>';
            } 
            
            else if (block.type === 'doctor-schedule') {
                previewHtml += '  <div class="bg-slate-50/50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">';
                previewHtml += '    <span class="text-[8px] font-bold text-slate-400 uppercase tracking-wider">' + Utils.escapeHtml(block.title || 'Jadwal') + '</span>';
                previewHtml += '    <h6 class="font-bold text-[10px] text-slate-800 dark:text-white mt-0.5">' + Utils.escapeHtml(block.heading || '') + '</h6>';
                previewHtml += '    <div class="flex gap-1 overflow-x-auto py-1.5 select-none scrollbar-none">';
                ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'].forEach(function(day) {
                    var act = self.activeDoctorDay === day;
                    previewHtml += '    <span class="px-2 py-0.5 text-[7px] rounded font-black flex-shrink-0 ' + (act ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400') + '">' + day + '</span>';
                });
                previewHtml += '    </div>';
                
                var doctors = (block.schedules && block.schedules[self.activeDoctorDay]) ? block.schedules[self.activeDoctorDay] : [];
                if (doctors.length === 0) {
                    previewHtml += '  <p class="text-[8px] text-slate-400 text-center">Belum ada jadwal dokter</p>';
                } else {
                    previewHtml += '  <div class="space-y-1.5">';
                    doctors.forEach(function(doc) {
                        previewHtml += '  <div class="flex justify-between items-center p-1.5 bg-white dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800/80 text-[8px]">';
                        previewHtml += '    <div><p class="font-bold text-slate-800 dark:text-white">' + Utils.escapeHtml(doc.name) + '</p><p class="text-slate-400 scale-95 origin-left">' + Utils.escapeHtml(doc.spec) + '</p></div>';
                        previewHtml += '    <span class="text-[7px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/35">' + Utils.escapeHtml(doc.hours) + '</span>';
                        previewHtml += '  </div>';
                    });
                    previewHtml += '  </div>';
                }
                previewHtml += '  </div>';
            } 
            
            else if (block.type === 'services') {
                previewHtml += '  <div class="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">';
                previewHtml += '    <span class="text-[8px] font-bold text-slate-400 uppercase">' + Utils.escapeHtml(block.title || 'Layanan') + '</span>';
                previewHtml += '    <h6 class="font-bold text-[10px] text-slate-800 dark:text-white mt-0.5">' + Utils.escapeHtml(block.heading || '') + '</h6>';
                previewHtml += '    <div class="grid grid-cols-2 gap-1.5 mt-2">';
                (block.items || []).forEach(function(item) {
                    previewHtml += '  <div class="p-1.5 bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800/80 text-[8px] flex gap-1.5">';
                    previewHtml += '    <span class="text-emerald-600 dark:text-emerald-400 text-[10px]"><svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></span>';
                    previewHtml += '    <div><p class="font-bold text-slate-800 dark:text-white">' + Utils.escapeHtml(item.title) + '</p><p class="text-[7px] text-slate-400 line-clamp-1 mt-0.5">' + Utils.escapeHtml(item.desc) + '</p></div>';
                    previewHtml += '  </div>';
                });
                previewHtml += '    </div>';
                previewHtml += '  </div>';
            } 
            
            else if (block.type === 'lab-check') {
                previewHtml += '  <div class="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 text-[8px] space-y-1.5">';
                previewHtml += '    <h6 class="font-black text-slate-800 dark:text-white leading-none">' + Utils.escapeHtml(block.heading || 'Cek Lab') + '</h6>';
                (block.tests || []).forEach(function(test) {
                    previewHtml += '  <div class="flex items-center justify-between bg-white dark:bg-slate-950 p-1 rounded border border-slate-100 dark:border-slate-800/50">';
                    previewHtml += '    <span class="font-bold text-slate-700 dark:text-slate-300">' + Utils.escapeHtml(test.name) + '</span>';
                    previewHtml += '    <span class="font-black text-primary-600 dark:text-primary-400">Rp ' + test.price.toLocaleString('id-ID') + '</span>';
                    previewHtml += '  </div>';
                });
                previewHtml += '  </div>';
            } 
            
            else if (block.type === 'lobby-hero') {
                previewHtml += '  <div class="relative overflow-hidden h-24 rounded-xl flex items-end p-2 text-white bg-slate-900">';
                if (block.img) {
                    previewHtml += '  <img src="' + Utils.escapeHtml(block.img) + '" class="absolute inset-0 w-full h-full object-cover opacity-40">';
                }
                previewHtml += '    <div class="relative z-10 space-y-0.5">';
                previewHtml += '      <span class="text-[7px] uppercase font-bold text-emerald-400 leading-none">' + Utils.escapeHtml(block.title || '') + '</span>';
                previewHtml += '      <h6 class="text-[10px] font-black leading-none">' + Utils.escapeHtml(block.heading || '') + '</h6>';
                previewHtml += '      <p class="text-[7px] text-slate-300 line-clamp-1 leading-none mt-0.5">' + Utils.escapeHtml(block.desc || '') + '</p>';
                previewHtml += '    </div>';
                previewHtml += '  </div>';
            } 

            else if (block.type === 'gallery') {
                previewHtml += '  <div class="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 text-[8px] space-y-1.5">';
                previewHtml += '    <span class="text-[8px] font-bold text-slate-400 uppercase">' + Utils.escapeHtml(block.title || 'Galeri') + '</span>';
                previewHtml += '    <h6 class="font-bold text-[10px] text-slate-800 dark:text-white mt-0.5">' + Utils.escapeHtml(block.heading || '') + '</h6>';
                previewHtml += '    <div class="grid grid-cols-3 gap-1 mt-1.5">';
                (block.items || []).slice(0, 3).forEach(function(item) {
                    previewHtml += '  <div class="relative rounded overflow-hidden aspect-video bg-slate-200 dark:bg-slate-800 border border-slate-100 dark:border-slate-850 shadow-sm">';
                    if (item.img) {
                        previewHtml += '    <img src="' + Utils.escapeHtml(item.img) + '" class="w-full h-full object-cover">';
                    }
                    previewHtml += '    <div class="absolute inset-x-0 bottom-0 bg-slate-950/65 text-white text-[6px] px-1 py-0.5 truncate leading-none">' + Utils.escapeHtml(item.caption || '') + '</div>';
                    previewHtml += '  </div>';
                });
                previewHtml += '    </div>';
                previewHtml += '  </div>';
            }
            
            else if (block.type === 'testimonials') {
                previewHtml += '  <div class="p-2.5 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800/80 text-[8px] space-y-1.5">';
                previewHtml += '    <h6 class="font-black text-slate-800 dark:text-white text-center">' + Utils.escapeHtml(block.heading || '') + '</h6>';
                previewHtml += '    <div class="grid grid-cols-3 gap-1.5">';
                (block.items || []).forEach(function(item) {
                    previewHtml += '  <div class="p-1.5 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded text-[7px] flex flex-col justify-between">';
                    previewHtml += '    <p class="italic line-clamp-2 text-slate-500">"' + Utils.escapeHtml(item.text) + '"</p>';
                    previewHtml += '    <p class="font-black text-slate-800 dark:text-white mt-1 scale-90 origin-left">— ' + Utils.escapeHtml(item.name.split(' ')[1] || item.name) + '</p>';
                    previewHtml += '  </div>';
                });
                previewHtml += '    </div>';
                previewHtml += '  </div>';
            } 
            
            else if (block.type === 'faq') {
                previewHtml += '  <div class="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">';
                previewHtml += '    <h6 class="font-black text-slate-800 dark:text-white text-[9px] mb-1.5">' + Utils.escapeHtml(block.heading || '') + '</h6>';
                (block.items || []).slice(0,2).forEach(function(item) {
                    previewHtml += '  <div class="p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded flex justify-between text-[7.5px] font-bold text-slate-700 dark:text-slate-300">';
                    previewHtml += '    <span>' + Utils.escapeHtml(item.question) + '</span>';
                    previewHtml += '    <span class="text-slate-400">v</span>';
                    previewHtml += '  </div>';
                });
                previewHtml += '  </div>';
            }

            previewHtml += '</div>';
        });

        // Miniature Footer & Contact info representation
        previewHtml += '<div class="pt-3 border-t border-slate-100 dark:border-slate-800 text-[8px] text-slate-400 space-y-1.5 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl mt-3">';
        previewHtml += '  <p class="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1"><svg class="w-2.5 h-2.5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> ' + Utils.escapeHtml(d.address || '') + '</p>';
        previewHtml += '  <p class="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1"><svg class="w-2.5 h-2.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> ' + Utils.escapeHtml(d.phone || '') + '</p>';
        
        // Social icons in footer
        var soc = d.socials || {};
        previewHtml += '  <div class="flex gap-2.5 items-center justify-center pt-2 border-t border-slate-100 dark:border-slate-800/80">';
        if (soc.facebook) {
            previewHtml += '  <span class="text-blue-500 font-extrabold text-[7px] uppercase tracking-wider">Facebook</span>';
        }
        if (soc.instagram) {
            previewHtml += '  <span class="text-pink-500 font-extrabold text-[7px] uppercase tracking-wider">Instagram</span>';
        }
        if (soc.twitter) {
            previewHtml += '  <span class="text-slate-700 dark:text-slate-200 font-extrabold text-[7px] uppercase tracking-wider">Twitter</span>';
        }
        previewHtml += '  </div>';
        
        previewHtml += '  <p class="text-[7px] text-slate-500 text-center mt-1">© 2026 ' + Utils.escapeHtml(d.brandName || 'AULIA') + '</p>';
        previewHtml += '</div>';

        viewport.innerHTML = previewHtml;
    },

    // ACTIONS: SAVE & PERSISTENCE
    saveChanges: function() {
        var self = this;

        // Run client-side validation
        var valError = self.validateLandingData(self.data);
        if (valError) {
            Utils.toast(valError.error, 'error');
            if (valError.tab) {
                self.switchTab(valError.tab);
            }
            if (valError.blockId) {
                self.expandedBlockId = valError.blockId;
                self.renderBuilder();
            }
            return;
        }

        var p = db.collection('pengaturan').doc('landing');

        Utils.showLoading('app-content');

        p.set(self.data, { merge: true }).then(function() {
            // Write action to audit logs
            if (window.AuditLog && typeof window.AuditLog.log === 'function') {
                window.AuditLog.log('update_landing_config', 'Memperbarui susunan puzzle & konten landing page: ' + self.data.brandName);
            }
            Utils.toast('Konfigurasi Puzzle Landing Page berhasil disimpan dan diterapkan!', 'success');
            navigateTo('pengaturan/landing', 'Edit Landing Page');
        }).catch(function(err) {
            Utils.toast('Gagal menyimpan ke cloud: ' + err.message, 'error');
            navigateTo('pengaturan/landing', 'Edit Landing Page');
        });
    },

    resetToDefault: function() {
        var self = this;
        var landingDef = (window.AppLanding && window.AppLanding.defaultConfig) ? window.AppLanding.defaultConfig : null;
        if (!landingDef) {
            Utils.toast('Gagal: Template konfigurasi asal tidak ditemukan.', 'error');
            return;
        }

        var modalContent = 
            '<div class="p-6 text-center">' +
            '  <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 mb-4">' +
            '    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>' +
            '  </div>' +
            '  <h3 class="text-lg font-black text-slate-900 dark:text-white mb-2">Konfirmasi Reset Default</h3>' +
            '  <p class="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">Apakah Anda yakin ingin mengatur ulang susunan dan isi landing page ke setelan pabrik (default)? Semua modifikasi puzzle Anda saat ini akan ditimpa.</p>' +
            '  <div class="flex justify-center gap-3">' +
            '    <button onclick="Utils.closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition">Batal</button>' +
            '    <button id="btn-confirm-reset" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition">Ya, Reset Default</button>' +
            '  </div>' +
            '</div>';

        Utils.openModal(modalContent);

        var btnConfirm = document.getElementById('btn-confirm-reset');
        if (btnConfirm) {
            btnConfirm.onclick = function() {
                Utils.closeModal();
                self.data = JSON.parse(JSON.stringify(landingDef));
                self.renderBuilder();
                self.updatePreview();
                Utils.toast('Isi formulir & preview dikembalikan ke default. Klik "Simpan & Terapkan" untuk menyimpan ke cloud.', 'warning');
            };
        }
    }
};
