/**
 * js/pengaturan/users.js
 * Manajemen User (CRUD & Role) - Hanya untuk Admin/Keuangan
 */

window.AppPengaturanUsers = {
    data: [],
    karyawanList: [],

    render: function() {
        var html = '<div class="page-enter max-w-4xl">';
        html += '<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">';
        html += '  <div>';
        html += '    <h2 class="text-xl font-bold text-gray-800 dark:text-white">Manajemen User</h2>';
        html += '    <p class="text-sm text-slate-500 dark:text-slate-400">Kelola akun login & hak akses karyawan</p>';
        html += '  </div>';
        html += '  <button onclick="AppPengaturanUsers.openForm()" class="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-2 self-start"><i data-lucide="user-plus" class="w-4 h-4"></i> Tambah User</button>';
        html += '</div>';
        html += '<div id="user-list"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        // Keamanan tambahan: Cek role
        if (window.currentRole !== 'keuangan') {
            document.getElementById('user-list').innerHTML = '<div class="bg-red-50 text-red-600 p-4 rounded-lg">Akses Ditolak. Halaman ini khusus Keuangan (Owner).</div>';
            return;
        }

        var pUsers = db.collection('users').orderBy('nama').get();
        var pKaryawan = db.collection('karyawan').orderBy('nama').get();

        Promise.all([pUsers, pKaryawan]).then(results => {
            AppPengaturanUsers.data = [];
            results[0].forEach(doc => { var d = doc.data(); d.id = doc.id; AppPengaturanUsers.data.push(d); });

            AppPengaturanUsers.karyawanList = [];
            results[1].forEach(doc => { var d = doc.data(); d.id = doc.id; AppPengaturanUsers.karyawanList.push(d); });

            AppPengaturanUsers.renderList();
        }).catch(err => Utils.toast('Gagal memuat: ' + err.message, 'error'));
    },

    renderList: function() {
        var container = document.getElementById('user-list');
        if (!container) return;
        
        var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
        html += '<table class="w-full text-sm">';
        html += '<thead><tr class="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 uppercase tracking-wider">';
        html += '<th class="px-4 py-3 text-left">Nama</th>';
        html += '<th class="px-4 py-3 text-left">Email</th>';
        html += '<th class="px-4 py-3 text-left">Role</th>';
        html += '<th class="px-4 py-3 text-center">Status</th>';
        html += '<th class="px-4 py-3 text-right">Aksi</th>';
        html += '</tr></thead><tbody>';

        this.data.forEach(u => {
            var roleBadge = '';
            if(u.role === 'admin') roleBadge = '<span class="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">Admin</span>';
            else if(u.role === 'keuangan') roleBadge = '<span class="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">Keuangan</span>';
            else if(u.role === 'psa') roleBadge = '<span class="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">PSA</span>';
            else if(u.role === 'klinik') roleBadge = '<span class="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Klinik</span>';
            // FIX (permintaan user): role baru khusus akun Dokter (beda dari staf Klinik biasa).
            else if(u.role === 'dokter') roleBadge = '<span class="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">Dokter</span>';
            else roleBadge = '<span class="text-xs bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full">Apotek</span>';

            var statusBadge = u.status === 'aktif' ? 
                '<span class="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">Aktif</span>' : 
                '<span class="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full">Nonaktif</span>';
            
            var safeName = (u.nama || '-').replace(/'/g, "\\'");

            html += '<tr class="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">';
            html += '<td class="px-4 py-3 font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(u.nama) + '</td>';
            html += '<td class="px-4 py-3 text-slate-500 text-xs">' + Utils.escapeHtml(u.email) + '</td>';
            html += '<td class="px-4 py-3">' + roleBadge + '</td>';
            html += '<td class="px-4 py-3 text-center">' + statusBadge + '</td>';
            html += '<td class="px-4 py-3 text-right space-x-1">';
            html += '<button onclick="AppPengaturanUsers.openForm(\'' + u.id + '\')" class="p-1.5 text-slate-400 hover:text-primary-600 rounded"><i data-lucide="pencil" class="w-4 h-4"></i></button>';
            if (firebase.auth().currentUser && u.id !== firebase.auth().currentUser.uid) { // FIX: null-safe
                html += '<button onclick="AppPengaturanUsers.toggleStatus(\'' + u.id + '\', \'' + u.status + '\')" class="p-1.5 text-slate-400 hover:text-amber-600 rounded"><i data-lucide="power" class="w-4 h-4"></i></button>';
            }
            html += '</td></tr>';
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
        lucide.createIcons();
    },

    openForm: function(id) {
        var isEdit = !!id;
        var u = isEdit ? this.data.find(x => x.id === id) : {};
        
        var availableKaryawan = this.karyawanList.filter(function(k) {
            return !k.userId || k.userId === id;
        });

        var html = '<div class="p-6">';
        html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-semibold text-gray-800 dark:text-white">' + (isEdit ? 'Edit' : 'Tambah') + ' User</h3><button onclick="Utils.closeModal()" class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><i data-lucide="x" class="w-5 h-5 text-slate-400"></i></button></div>';
        html += '<form id="form-user" class="space-y-4">';
        
        html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap *</label><input type="text" id="fu-nama" value="' + Utils.escapeHtml(u.nama || '') + '" required class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm"></div>';
        
        html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Email *</label><input type="email" id="fu-email" value="' + Utils.escapeHtml(u.email || '') + '" required ' + (isEdit ? 'readonly' : '') + ' class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm ' + (isEdit ? 'bg-slate-100 cursor-not-allowed' : '') + '"></div>';
        
        if (!isEdit) {
            html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Password *</label><input type="password" id="fu-pass" required class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="Min 6 karakter"></div>';
        }
        
        html += '<div class="grid grid-cols-2 gap-4">';
        html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Role *</label><select id="fu-role" required class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm">';
        html += '<option value="apotek"' + (u.role==='apotek'?' selected':'') + '>Apotek</option>';
        html += '<option value="klinik"' + (u.role==='klinik'?' selected':'') + '>Klinik</option>';
        html += '<option value="dokter"' + (u.role==='dokter'?' selected':'') + '>Dokter</option>';
        html += '<option value="admin"' + (u.role==='admin'?' selected':'') + '>Admin (Kepala)</option>';
        html += '<option value="psa"' + (u.role==='psa'?' selected':'') + '>PSA (Pemilik)</option>';
        html += '<option value="keuangan"' + (u.role==='keuangan'?' selected':'') + '>Keuangan (Master)</option>';
        html += '</select></div>';
        
        html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Status</label><select id="fu-status" class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="aktif"' + (u.status!=='nonaktif'?' selected':'') + '>Aktif</option><option value="nonaktif"' + (u.status==='nonaktif'?' selected':'') + '>Nonaktif</option></select></div>';
        html += '</div>';

        // FITUR BARU: Tema tampilan per-akun (mis. Vaporwave khusus akun tertentu)
        html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Tema Tampilan</label><select id="fu-tema" class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm">';
        html += '<option value="default"' + ((!u.tema || u.tema==='default')?' selected':'') + '>Default (Modern)</option>';
        html += '<option value="win98"' + (u.tema==='win98'?' selected':'') + '>⚡ Vaporwave Cyberpunk 2099 (Ultra HUD & Synthwave)</option>';
        html += '</select><p class="text-xs text-slate-400 mt-1">Tampilan khusus untuk akun ini saja, tidak memengaruhi akun lain.</p></div>';

        // SINKRONISASI KARYAWAN
        html += '<div class="border-t border-slate-200 dark:border-slate-700 pt-4 mt-2">';
        html += '<label class="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Sinkronisasi Data Karyawan</label>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hubungkan ke Karyawan *</label>';
        html += '<select id="fu-karyawan-mode" onchange="AppPengaturanUsers.toggleKaryawanMode(this.value)" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm">';
        if (!isEdit) {
            html += '<option value="auto">Hubungkan Baru (Buat Profil Karyawan Otomatis)</option>';
        }
        html += '<option value="link"' + (u.karyawanId ? ' selected' : '') + '>Hubungkan ke Karyawan yang Sudah Ada</option>';
        html += '<option value="none"' + (!u.karyawanId && isEdit ? ' selected' : '') + '>Jangan Hubungkan</option>';
        html += '</select></div>';

        html += '<div id="fu-karyawan-select-container" class="mt-3 ' + (u.karyawanId || (isEdit && !u.karyawanId) ? '' : 'hidden') + '">';
        html += '<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Pilih Karyawan *</label>';
        html += '<select id="fu-karyawan-id" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm">';
        html += '<option value="">-- Pilih Karyawan --</option>';
        availableKaryawan.forEach(k => {
            var sel = (k.id === u.karyawanId) ? ' selected' : '';
            html += '<option value="' + k.id + '"' + sel + '>' + Utils.escapeHtml(k.nama) + ' (' + Utils.escapeHtml(k.departemen || '-') + ')</option>';
        });
        html += '</select></div>';
        html += '</div>';

        html += '<div class="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">';
        html += '<button type="button" onclick="Utils.closeModal()" class="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Batal</button>';
        html += '<button type="submit" class="px-6 py-2.5 text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg">Simpan</button>';
        html += '</div>';
        
        if (isEdit) html += '<input type="hidden" id="fu-id" value="' + u.id + '">';
        html += '</form></div>';

        Utils.openModal(html);
        
        setTimeout(() => {
            document.getElementById('form-user').addEventListener('submit', function(e) {
                e.preventDefault();
                AppPengaturanUsers.simpan();
            });
        }, 100);
    },

    toggleKaryawanMode: function(val) {
        var container = document.getElementById('fu-karyawan-select-container');
        if (!container) return;
        if (val === 'link') {
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
        }
    },

    simpan: function() {
        var idField = document.getElementById('fu-id');
        var isEdit = !!idField;
        
        var nama = document.getElementById('fu-nama').value.trim();
        var email = document.getElementById('fu-email').value.trim();
        var role = document.getElementById('fu-role').value;
        var status = document.getElementById('fu-status').value;
        var tema = document.getElementById('fu-tema').value; 

        var karyawanMode = document.getElementById('fu-karyawan-mode').value;
        var selectedKaryawanId = document.getElementById('fu-karyawan-id').value;

        if (isEdit) {
            var userId = idField.value;
            var oldUser = AppPengaturanUsers.data.find(x => x.id === userId);
            var oldKaryawanId = oldUser ? oldUser.karyawanId : null;

            Utils.toast('Menyimpan...', 'info');

            var finalKaryawanId = null;
            if (karyawanMode === 'link') {
                if (!selectedKaryawanId) {
                    Utils.toast('Pilih karyawan terlebih dahulu', 'error');
                    return;
                }
                finalKaryawanId = selectedKaryawanId;
            }

            db.collection('users').doc(userId).update({
                nama: nama, role: role, status: status, tema: tema, karyawanId: finalKaryawanId, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                var batch = db.batch();
                
                // Jika karyawan berubah
                if (oldKaryawanId && oldKaryawanId !== finalKaryawanId) {
                    batch.update(db.collection('karyawan').doc(oldKaryawanId), { userId: null, email: null });
                }
                if (finalKaryawanId) {
                    batch.update(db.collection('karyawan').doc(finalKaryawanId), { userId: userId, email: email, nama: nama, status: status });
                }
                
                return batch.commit();
            }).then(() => {
                Utils.toast('Data user & karyawan berhasil disinkronkan!', 'success');
                Utils.closeModal();
                AppPengaturanUsers.init();
            }).catch(err => {
                console.error('Edit user sync error:', err);
                Utils.toast('User disimpan, tapi sinkronisasi data karyawan gagal: ' + err.message, 'warning');
                Utils.closeModal();
                AppPengaturanUsers.init();
            });
        } else {
            var pass = document.getElementById('fu-pass').value;
            if (karyawanMode === 'link' && !selectedKaryawanId) {
                Utils.toast('Pilih karyawan terlebih dahulu', 'error');
                return;
            }

            Utils.toast('Menyimpan...', 'info');

            // FIX: hapus dulu Secondary app yg mungkin masih hidup (race condition double-click).
            var existing = firebase.apps.find(function(a) { return a.name === 'Secondary'; });
            var ready = existing ? existing.delete() : Promise.resolve();

            ready.then(function() {
                var secondaryApp = firebase.initializeApp(firebaseConfig, "Secondary");
                var createdUser = null;
                var finalUid = null;

                secondaryApp.auth().createUserWithEmailAndPassword(email, pass)
                    .then(function(userCredential) {
                        createdUser = userCredential.user;
                        finalUid = userCredential.user.uid;

                        // Jika "auto" mode, kita buat profil karyawan baru otomatis
                        if (karyawanMode === 'auto') {
                            var dept = 'Umum';
                            var jab = 'Staf';
                            if (role === 'dokter') { dept = 'Dokter'; jab = 'Dokter'; }
                            else if (role === 'klinik') { dept = 'Klinik'; jab = 'Staf Klinik'; }
                            else if (role === 'apotek') { dept = 'Apotek'; jab = 'Staf Apotek'; }
                            else if (role === 'admin') { dept = 'Umum'; jab = 'Admin'; }
                            else if (role === 'psa') { dept = 'Umum'; jab = 'PSA'; }
                            else if (role === 'keuangan') { dept = 'Umum'; jab = 'Keuangan'; }

                            var newKarObj = {
                                nama: nama,
                                departemen: dept,
                                jabatan: jab,
                                nip: '',
                                status: status,
                                userId: finalUid,
                                email: email,
                                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                            };

                            return db.collection('karyawan').add(newKarObj).then(function(karDocRef) {
                                return db.collection('users').doc(finalUid).set({
                                    nama: nama, email: email, role: role, status: status, tema: tema,
                                    karyawanId: karDocRef.id,
                                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                                });
                            });
                        } else if (karyawanMode === 'link') {
                            // Link existing karyawan
                            var batch = db.batch();
                            batch.set(db.collection('users').doc(finalUid), {
                                nama: nama, email: email, role: role, status: status, tema: tema,
                                karyawanId: selectedKaryawanId,
                                createdAt: firebase.firestore.FieldValue.serverTimestamp()
                            });
                            batch.update(db.collection('karyawan').doc(selectedKaryawanId), {
                                userId: finalUid, email: email, status: status
                            });
                            return batch.commit();
                        } else {
                            // Jangan hubungkan (karyawanMode === 'none')
                            return db.collection('users').doc(finalUid).set({
                                nama: nama, email: email, role: role, status: status, tema: tema,
                                karyawanId: null,
                                createdAt: firebase.firestore.FieldValue.serverTimestamp()
                            });
                        }
                    })
                    .then(function() {
                        Utils.toast('User baru berhasil ditambahkan & disinkronkan!', 'success');
                        Utils.closeModal();
                        AppPengaturanUsers.init();
                    })
                    .catch(function(err) {
                        Utils.toast('Gagal buat user: ' + err.message, 'error');
                        // FIX: rollback auth user agar tidak ada orphan account.
                        if (createdUser && createdUser.delete) {
                            createdUser.delete().catch(function() {});
                        }
                    })
                    .finally(function() {
                        secondaryApp.delete();
                    });
            });
        }
    },

    toggleStatus: function(id, currentStatus) {
        var newStatus = currentStatus === 'aktif' ? 'nonaktif' : 'aktif';
        var user = this.data.find(x => x.id === id);
        var kId = user ? user.karyawanId : null;

        var batch = db.batch();
        batch.update(db.collection('users').doc(id), { status: newStatus });
        if (kId) {
            batch.update(db.collection('karyawan').doc(kId), { status: newStatus });
        }

        batch.commit()
            .then(() => {
                Utils.toast('Status user & karyawan diubah menjadi ' + newStatus, 'success');
                AppPengaturanUsers.init();
            })
            .catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    }
};