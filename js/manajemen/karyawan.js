/**
 * js/manajemen/karyawan.js
 * CRUD Data Karyawan (Dokter, Apoteker, Perawat, dll)
 * FIX: Integrasi dengan Akun Login (users) & Role Access Matrix
 */

window.AppManajemenKaryawan = {
    data: [],
    usersList: [], // Untuk menyimpan daftar akun yang belum terhubung ke karyawan

    render: function() {
        var role = window.currentRole || 'apotek';
        var canEdit = (role === 'keuangan');
        var canQr = (role === 'admin' || role === 'keuangan' || role === 'psa'); // FIX: sesuai permintaan, Admin view-only, Keuangan yang CRUD karyawan

        var html = '<div class="page-enter max-w-4xl">';
        html += '<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">';
        html += '  <div>';
        html += '    <h2 class="text-xl font-bold text-gray-800 dark:text-white">Data Karyawan</h2>';
        html += '    <p class="text-sm text-slate-500 dark:text-slate-400">Master data karyawan klinik & apotek</p>';
        html += '  </div>';
        if (canEdit) {
            html += '  <button onclick="AppManajemenKaryawan.openForm()" class="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-2 self-start"><i data-lucide="user-plus" class="w-4 h-4"></i> Tambah Karyawan</button>';
        }
        html += '</div>';
        html += '<div id="karyawan-list"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        var self = this;
        var pKaryawan = db.collection('karyawan').orderBy('nama').get();
        var pUsers = db.collection('users').get();

        Promise.all([pKaryawan, pUsers]).then(function(results) {
            self.data = [];
            results[0].forEach(function(doc) { var d = doc.data(); d.id = doc.id; self.data.push(d); });

            self.usersList = [];
            results[1].forEach(function(doc) { var d = doc.data(); d.id = doc.id; self.usersList.push(d); });

            self.renderList();
        }).catch(err => Utils.toast('Gagal memuat: ' + err.message, 'error'));
    },

    renderList: function() {
        var container = document.getElementById('karyawan-list');
        if (!container) return;
        
        var role = window.currentRole || 'apotek';
        var canEdit = (role === 'keuangan');
        var canQr = (role === 'admin' || role === 'keuangan' || role === 'psa');

        if (this.data.length === 0) {
            container.innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center"><p class="text-slate-400">Belum ada data karyawan.</p></div>';
            return;
        }

        var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
        html += '<div class="overflow-x-auto">';
        html += '<table class="w-full text-sm">';
        html += '<thead><tr class="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 uppercase tracking-wider">';
        html += '<th class="px-4 py-3 text-left">Nama</th>';
        html += '<th class="px-4 py-3 text-left">Departemen</th>';
        html += '<th class="px-4 py-3 text-left hidden md:table-cell">Jabatan</th>';
        html += '<th class="px-4 py-3 text-left hidden lg:table-cell">Akun Login</th>';
        html += '<th class="px-4 py-3 text-center">Status</th>';
        if (canEdit || canQr) html += '<th class="px-4 py-3 text-right">Aksi</th>';
        html += '</tr></thead><tbody>';

        this.data.forEach(k => {
            var deptColor = k.departemen === 'Klinik' ? 'purple' : (k.departemen === 'Apotek' ? 'teal' : (k.departemen === 'Dokter' ? 'indigo' : 'slate'));
            var statusBadge = k.status === 'aktif' ? 
                '<span class="text-xs bg-green-50 dark:bg-green-900/30 text-green-600 px-2 py-0.5 rounded-full">Aktif</span>' : 
                '<span class="text-xs bg-red-50 dark:bg-red-900/30 text-red-500 px-2 py-0.5 rounded-full">Nonaktif</span>';
            
            var safeName = (k.nama || '-').replace(/'/g, "\\'");
            var akunInfo = k.email ? '<span class="text-xs text-blue-600">' + Utils.escapeHtml(k.email) + '</span>' : '<span class="text-xs text-slate-400 italic">Belum ada akun</span>';

            html += '<tr class="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">';
            html += '<td class="px-4 py-3 font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(k.nama) + '</td>';
            html += '<td class="px-4 py-3"><span class="text-xs bg-' + deptColor + '-50 dark:bg-' + deptColor + '-900/30 text-' + deptColor + '-600 px-2 py-0.5 rounded-full">' + Utils.escapeHtml(k.departemen || '-') + '</span></td>';
            html += '<td class="px-4 py-3 text-slate-600 dark:text-slate-300 hidden md:table-cell">' + Utils.escapeHtml(k.jabatan || '-') + '</td>';
            html += '<td class="px-4 py-3 hidden lg:table-cell">' + akunInfo + '</td>';
            html += '<td class="px-4 py-3 text-center">' + statusBadge + '</td>';
            
            if (canEdit || canQr) {
                html += '<td class="px-4 py-3 text-right space-x-1">';
                if (canQr) html += '<button onclick="AppManajemenKaryawan.tampilkanQr(\'' + k.id + '\')" title="QR Absensi" class="p-1.5 text-slate-400 hover:text-primary-600 rounded"><i data-lucide="qr-code" class="w-4 h-4"></i></button>';
                if (canEdit) {
                    html += '<button onclick="AppManajemenKaryawan.openForm(\'' + k.id + '\')" class="p-1.5 text-slate-400 hover:text-primary-600 rounded"><i data-lucide="pencil" class="w-4 h-4"></i></button>';
                    html += '<button onclick="AppManajemenKaryawan.hapus(\'' + k.id + '\', \'' + safeName + '\')" class="p-1.5 text-slate-400 hover:text-red-600 rounded"><i data-lucide="trash-2" class="w-4 h-4"></i></button>';
                }
                html += '</td>';
            }
            html += '</tr>';
        });

        html += '</tbody></table></div></div>';
        container.innerHTML = html;
        lucide.createIcons();
    },

    tampilkanQr: function(id) {
        var k = this.data.find(function(x) { return x.id === id; });
        if (!k) return;

        if (typeof QRCode === 'undefined') {
            Utils.toast('Library QR belum berhasil dimuat. Coba refresh halaman.', 'error');
            return;
        }

        var namaFile = (k.nama || 'karyawan').replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '') || 'karyawan';
        var payload = 'AULIA-EMPLOYEE|' + k.id;

        var html = '<div class="p-6 text-center">';
        html += '<div class="flex items-center justify-between mb-4"><h3 class="text-lg font-bold text-gray-800 dark:text-white">QR Absensi Karyawan</h3><button onclick="Utils.closeModal()" class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><i data-lucide="x" class="w-5 h-5 text-slate-400"></i></button></div>';
        html += '<p class="font-semibold text-gray-800 dark:text-white">' + Utils.escapeHtml(k.nama || '-') + '</p>';
        html += '<p class="text-xs text-slate-400 mb-4">' + Utils.escapeHtml(k.departemen || '-') + ' • QR khusus absensi</p>';
        html += '<div id="employee-qrcode" class="mx-auto w-[320px] h-[320px] flex items-center justify-center bg-white p-3 rounded-xl border border-slate-200"></div>';
        html += '<p class="text-[11px] text-slate-400 mt-3">Simpan/cetak gambar QR ini untuk dipindai Admin saat absensi.</p>';
        html += '<div class="flex justify-center gap-2 mt-4">';
        html += '<button onclick="AppManajemenKaryawan.downloadQr(\'' + id + '\', \'' + namaFile + '\')" class="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2"><i data-lucide="download" class="w-4 h-4"></i> Download PNG</button>';
        html += '<button onclick="Utils.closeModal()" class="px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-semibold">Tutup</button>';
        html += '</div></div>';

        Utils.openModal(html);
        setTimeout(function() {
            var target = document.getElementById('employee-qrcode');
            if (target) {
                new QRCode(target, {
                    text: payload,
                    width: 300,
                    height: 300,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.H
                });
            }
        }, 50);
    },

    downloadQr: function(id, namaFile) {
        var box = document.getElementById('employee-qrcode');
        if (!box) return;
        var img = box.querySelector('img');
        var canvas = box.querySelector('canvas');
        var dataUrl = img && img.src ? img.src : (canvas ? canvas.toDataURL('image/png') : null);
        if (!dataUrl) {
            Utils.toast('QR belum selesai dibuat. Coba lagi.', 'warning');
            return;
        }

        var a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'QR-Absensi-' + (namaFile || id) + '.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        Utils.toast('QR berhasil diunduh sebagai PNG.', 'success');
    },

    openForm: function(id) {
        var isEdit = !!id;
        var k = isEdit ? this.data.find(x => x.id === id) : {};
        
        // Cari akun user yang BELUM punya karyawanId, ditambah akun user dari karyawan ini (jika edit)
        var availableUsers = this.usersList.filter(function(u) {
            return !u.karyawanId || u.karyawanId === id;
        });

        var html = '<div class="p-6">';
        html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-semibold text-gray-800 dark:text-white">' + (isEdit ? 'Edit' : 'Tambah') + ' Karyawan</h3><button onclick="Utils.closeModal()" class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><i data-lucide="x" class="w-5 h-5 text-slate-400"></i></button></div>';
        html += '<form id="form-karyawan" class="space-y-4">';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap *</label><input type="text" id="fk-nama" value="' + Utils.escapeHtml(k.nama || '') + '" required class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"></div>';
        
        html += '<div class="grid grid-cols-2 gap-4">';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Departemen *</label><select id="fk-dept" required class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="">-- Pilih --</option><option value="Klinik"' + (k.departemen==='Klinik'?' selected':'') + '>Klinik</option><option value="Apotek"' + (k.departemen==='Apotek'?' selected':'') + '>Apotek</option><option value="Umum"' + (k.departemen==='Umum'?' selected':'') + '>Umum</option><option value="Dokter"' + (k.departemen==='Dokter'?' selected':'') + '>Dokter</option></select></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Jabatan</label><input type="text" id="fk-jabatan" value="' + Utils.escapeHtml(k.jabatan || '') + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="Dokter, Apoteker, Kasir..."></div>';
        html += '</div>';

        // TAMBAHAN: Link ke Akun Login
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Akun Login (Opsional)</label><select id="fk-userid" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="">-- Tidak Pakai Akun --</option>';
        availableUsers.forEach(u => {
            var sel = (u.id === k.userId) ? ' selected' : '';
            html += '<option value="' + u.id + '" data-email="' + Utils.escapeHtml(u.email) + '"' + sel + '>' + Utils.escapeHtml(u.email) + ' (' + Utils.escapeHtml(u.role) + ')</option>';
        });
        html += '</select><p class="text-xs text-slate-400 mt-1">Hubungkan karyawan dengan akun login mereka agar bisa Check-In mandiri.</p></div>';

        html += '<div class="grid grid-cols-2 gap-4">';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">NIP / ID</label><input type="text" id="fk-nip" value="' + Utils.escapeHtml(k.nip || '') + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label><select id="fk-status" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="aktif"' + (k.status!=='nonaktif'?' selected':'') + '>Aktif</option><option value="nonaktif"' + (k.status==='nonaktif'?' selected':'') + '>Nonaktif</option></select></div>';
        html += '</div>';

        html += '<div class="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">';
        html += '<button type="button" onclick="Utils.closeModal()" class="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Batal</button>';
        html += '<button type="submit" class="px-6 py-2.5 text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg">Simpan</button>';
        html += '</div>';
        
        if (isEdit) html += '<input type="hidden" id="fk-id" value="' + k.id + '">';
        html += '</form></div>';

        Utils.openModal(html);
        
        setTimeout(() => {
            document.getElementById('form-karyawan').addEventListener('submit', function(e) {
                e.preventDefault();
                AppManajemenKaryawan.simpan();
            });
        }, 100);
    },

    simpan: function() {
        // PERBAIKAN AUDIT (temuan #10): penjaga klik-ganda. Karyawan kembar
        // sangat merusak di payroll, karena kalkulasi berjalan PER dokumen
        // karyawan — satu orang yang terdaftar dua kali akan digaji dua kali.
        var release = SubmitGuard.lock('karyawan:simpan',
                                       '#form-karyawan button[type="submit"]');
        if (!release) return;

        var idField = document.getElementById('fk-id');
        var isEdit = !!idField;
        
        var userSelect = document.getElementById('fk-userid');
        var userId = userSelect.value;
        var email = userSelect.value ? userSelect.options[userSelect.selectedIndex].getAttribute('data-email') : '';

        var obj = {
            nama: document.getElementById('fk-nama').value.trim(),
            departemen: document.getElementById('fk-dept').value,
            jabatan: document.getElementById('fk-jabatan').value.trim(),
            nip: document.getElementById('fk-nip').value.trim(),
            status: document.getElementById('fk-status').value,
            userId: userId || null,
            email: email || null,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (!obj.nama || !obj.departemen) {
            Utils.toast('Nama dan Departemen wajib diisi', 'error');
            release(); return;
        }

        var oldUserId = null;
        if (isEdit) {
            var oldK = AppManajemenKaryawan.data.find(x => x.id === idField.value);
            if (oldK) oldUserId = oldK.userId;
        }

        Utils.toast('Menyimpan...', 'info');
        var p;
        if (isEdit) {
            p = db.collection('karyawan').doc(idField.value).update(obj);
        } else {
            obj.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            p = db.collection('karyawan').add(obj);
        }

        p.then((docRef) => {
            var karyawanIdFinal = isEdit ? idField.value : (docRef && docRef.id ? docRef.id : null);
            var batch = db.batch();
            
            // Unlink akun lama jika ada perubahan link
            if (oldUserId && oldUserId !== userId) {
                batch.update(db.collection('users').doc(oldUserId), { karyawanId: null });
            }
            // Link akun baru jika dipilih
            if (userId) {
                batch.update(db.collection('users').doc(userId), { karyawanId: karyawanIdFinal, nama: obj.nama });
            }
            
            batch.commit().then(() => {
                Utils.toast('Karyawan berhasil disimpan & disinkronkan!', 'success');
                Utils.closeModal();
                release();
                AppManajemenKaryawan.init();
            }).catch(err => {
                console.error('Batch sync error:', err);
                Utils.toast('Karyawan disimpan, sinkronisasi akun dilewati', 'warning');
                Utils.closeModal();
                release();
                AppManajemenKaryawan.init();
            });
        }).catch(err => { Utils.toast('Gagal: ' + err.message, 'error'); release(); });
    },

    hapus: function(id, nama) {
        if (!confirm('Hapus karyawan "' + nama + '"?')) return;
        db.collection('karyawan').doc(id).delete().then(() => {
            Utils.toast('Berhasil dihapus', 'success');
            AppManajemenKaryawan.init();
        }).catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    }
};
