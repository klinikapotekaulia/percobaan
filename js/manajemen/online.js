/**
 * js/manajemen/online.js
 * Aktivitas User Online — Pemantauan pengguna aktif secara real-time.
 * Hanya dapat diakses oleh akun PSA dan Keuangan.
 * - PSA tidak dapat melihat akun Keuangan.
 * - Keuangan dapat melihat seluruh akun yang sedang online.
 */

window.AppManajemenOnline = {
    unsubscribe: null,
    data: [],

    render: function() {
        var html = '<div class="page-enter max-w-4xl">';
        html += '<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">';
        html += '  <div>';
        html += '    <h2 class="text-xl font-bold text-gray-800 dark:text-white">Aktivitas User Online</h2>';
        html += '    <p class="text-sm text-slate-500 dark:text-slate-400">Daftar akun pengguna yang saat ini sedang aktif membuka aplikasi</p>';
        html += '  </div>';
        html += '</div>';
        html += '<div id="online-users-list"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        var self = this;
        var role = window.currentRole || '';
        
        // Memastikan hanya PSA dan Keuangan yang memiliki akses
        if (role !== 'psa' && role !== 'keuangan') {
            var el = document.getElementById('online-users-list');
            if (el) el.innerHTML = '<div class="bg-red-50 text-red-600 p-4 rounded-lg">Akses Ditolak. Halaman ini hanya untuk PSA dan Keuangan.</div>';
            return;
        }

        // Jalankan listener Firestore real-time
        self.unsubscribe = db.collection('users').onSnapshot(function(snapshot) {
            var users = [];
            snapshot.forEach(function(doc) {
                var d = doc.data();
                d.uid = doc.id;
                users.push(d);
            });
            self.data = users;
            self.renderList();
        }, function(error) {
            console.error('[Online Users] Error snapshot:', error);
            var el = document.getElementById('online-users-list');
            if (el) el.innerHTML = '<div class="bg-red-50 text-red-600 p-4 rounded-lg">Gagal memuat data pengguna online: ' + Utils.escapeHtml(error.message) + '</div>';
        });
    },

    renderList: function() {
        var container = document.getElementById('online-users-list');
        if (!container) return;

        var myRole = window.currentRole || '';
        var now = new Date();

        // Olah status online & lakukan filter sesuai aturan hak akses
        var filteredUsers = this.data.map(function(u) {
            var lastActiveDate = u.lastActive ? u.lastActive.toDate() : null;
            // Dianggap online jika detak jantung (heartbeat) aktif dalam 60 detik terakhir
            var isOnline = lastActiveDate && (now.getTime() - lastActiveDate.getTime() < 60000);
            return {
                uid: u.uid,
                nama: u.nama || u.email || 'User Tanpa Nama',
                email: u.email || '-',
                role: u.role || 'user',
                status: u.status || 'aktif',
                lastActiveDate: lastActiveDate,
                isOnline: isOnline
            };
        }).filter(function(u) {
            // Aturan: PSA tidak bisa melihat akun Keuangan
            if (myRole === 'psa' && u.role === 'keuangan') {
                return false;
            }
            return true;
        });

        // Urutkan: Online di atas, sisanya diurutkan berdasarkan abjad Nama
        filteredUsers.sort(function(a, b) {
            if (a.isOnline && !b.isOnline) return -1;
            if (!a.isOnline && b.isOnline) return 1;
            return a.nama.localeCompare(b.nama);
        });

        var onlineCount = filteredUsers.filter(function(u) { return u.isOnline; }).length;

        var html = '';
        
        // Banner ringkasan
        html += '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">';
        html += '  <div class="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-4 flex items-center gap-4">';
        html += '    <div class="w-12 h-12 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center flex-shrink-0 animate-pulse">';
        html += '      <i data-lucide="wifi" class="w-6 h-6"></i>';
        html += '    </div>';
        html += '    <div>';
        html += '      <span class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Total User Online</span>';
        html += '      <span class="text-2xl font-bold text-slate-800 dark:text-slate-100">' + onlineCount + ' Akun</span>';
        html += '    </div>';
        html += '  </div>';
        html += '  <div class="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4">';
        html += '    <div class="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg flex items-center justify-center flex-shrink-0">';
        html += '      <i data-lucide="users" class="w-6 h-6"></i>';
        html += '    </div>';
        html += '    <div>';
        html += '      <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Total Terdaftar (Terpantau)</span>';
        html += '      <span class="text-2xl font-bold text-slate-800 dark:text-slate-100">' + filteredUsers.length + ' Akun</span>';
        html += '    </div>';
        html += '  </div>';
        html += '</div>';

        if (filteredUsers.length === 0) {
            html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center"><p class="text-slate-400">Tidak ada data pengguna.</p></div>';
            container.innerHTML = html;
            if (window.lucide) lucide.createIcons({ el: container });
            return;
        }

        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">';
        html += '  <div class="overflow-x-auto">';
        html += '    <table class="w-full text-sm">';
        html += '      <thead>';
        html += '        <tr class="bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">';
        html += '          <th class="px-6 py-4 text-left">Nama / Email</th>';
        html += '          <th class="px-6 py-4 text-left">Role</th>';
        html += '          <th class="px-6 py-4 text-left">Status Koneksi</th>';
        html += '          <th class="px-6 py-4 text-left">Aktivitas Terakhir</th>';
        html += '        </tr>';
        html += '      </thead>';
        html += '      <tbody class="divide-y divide-slate-200 dark:divide-slate-700">';

        filteredUsers.forEach(function(u) {
            var displayRole = u.role.charAt(0).toUpperCase() + u.role.slice(1);
            if (u.role === 'psa') displayRole = 'PSA';

            var statusBadge = '';
            if (u.isOnline) {
                statusBadge = '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30"><span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>Online</span>';
            } else {
                statusBadge = '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-500 dark:bg-slate-900/60 dark:text-slate-400 border border-slate-200 dark:border-slate-800">Offline</span>';
            }

            var timeStr = 'Belum pernah login / No Activity';
            if (u.lastActiveDate) {
                timeStr = u.lastActiveDate.toLocaleString('id-ID');
            }

            html += '        <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">';
            html += '          <td class="px-6 py-4">';
            html += '            <div class="flex items-center gap-3">';
            html += '              <div class="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 font-bold flex items-center justify-center text-sm">' + (u.nama.charAt(0) || '?').toUpperCase() + '</div>';
            html += '              <div>';
            html += '                <span class="font-semibold text-slate-800 dark:text-slate-200 block">' + Utils.escapeHtml(u.nama) + '</span>';
            html += '                <span class="text-xs text-slate-400 dark:text-slate-500 block">' + Utils.escapeHtml(u.email) + '</span>';
            html += '              </div>';
            html += '            </div>';
            html += '          </td>';
            html += '          <td class="px-6 py-4">';
            html += '            <span class="text-slate-600 dark:text-slate-300 font-medium">' + displayRole + '</span>';
            html += '          </td>';
            html += '          <td class="px-6 py-4">' + statusBadge + '</td>';
            html += '          <td class="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">' + timeStr + '</td>';
            html += '        </tr>';
        });

        html += '      </tbody>';
        html += '    </table>';
        html += '  </div>';
        html += '</div>';

        container.innerHTML = html;
        if (window.lucide) lucide.createIcons({ el: container });
    },

    destroy: function() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }
};
