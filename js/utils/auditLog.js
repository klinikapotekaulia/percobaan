/**
 * js/utils/auditLog.js
 * Audit Trail sederhana untuk transaksi keuangan penting.
 */

window.AuditLog = {
    catat: function (opts) {
        opts = opts || {};
        try {
            var user = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
            var entry = {
                aksi: opts.aksi || 'lainnya',
                modul: opts.modul || '-',
                koleksi: opts.koleksi || null,
                targetId: opts.targetId || null,
                deskripsi: opts.deskripsi || '',
                nominal: (typeof opts.nominal === 'number') ? opts.nominal : null,
                oleh: window.currentUserName || (user && user.email) || 'Sistem',
                olehUid: user ? user.uid : null,
                role: window.currentRole || null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            return db.collection('auditLog').add(entry).catch(function (err) {
                console.error('AuditLog: gagal mencatat jejak audit:', err);
            });
        } catch (err) {
            console.error('AuditLog: error tak terduga:', err);
            return Promise.resolve();
        }
    }
};

// ============================================================
// HAYPOP ETALASE — integrasi native terhadap lifecycle sidebar
// ============================================================
// app.js membangun ulang sidebar melalui renderSidebar() setiap kali login,
// ganti bahasa, dan pada beberapa perubahan UI. Karena itu Etalase harus
// dipasang SETELAH renderSidebar(), bukan hanya sekali pada DOMContentLoaded.
(function registerHaypopEtalaseIntegration() {
    var originalRenderSidebar = window.renderSidebar;
    var originalNavigateTo = window.navigateTo;

    function isFinance() {
        var role = String(window.currentRole || '').trim().toLowerCase();
        if (role === 'keuangan' || role === 'finance') return true;

        var roleEl = document.getElementById('user-role');
        var label = roleEl ? String(roleEl.textContent || '').trim().toLowerCase() : '';
        return label === 'keuangan' || label.indexOf('keuangan') !== -1 || label.indexOf('finance') !== -1;
    }

    function addEtalaseToSidebar(container) {
        if (!container || !isFinance()) return;
        if (container.querySelector('[data-haypop-etalase="true"]')) return;

        // Cari section "Operasional Apotek" berdasarkan tombol Transaksi.
        var transaksi = container.querySelector('button.nav-btn[data-page="transaksi"]');
        if (!transaksi) return;

        var list = transaksi.closest('ul');
        if (!list) return;

        var li = document.createElement('li');
        li.setAttribute('data-haypop-etalase', 'true');
        li.innerHTML =
            '<button type="button" onclick="navigateTo(\'apotek/etalase\', \'Etalase Haypop\')" ' +
            'class="nav-btn w-full text-left px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300 ' +
            'hover:bg-primary-50 dark:hover:bg-slate-700 hover:text-primary-600 dark:hover:text-primary-400 ' +
            'transition-colors flex items-center gap-3" data-page="etalase">' +
            '<i data-lucide="store" class="w-4 h-4 flex-shrink-0"></i>' +
            '<span>Etalase Haypop</span>' +
            '</button>';
        list.appendChild(li);

        if (window.lucide && typeof lucide.createIcons === 'function') {
            lucide.createIcons({ el: li });
        }
    }

    function syncSidebar() {
        if (!isFinance()) return;
        addEtalaseToSidebar(document.getElementById('sidebar-menu'));
        addEtalaseToSidebar(document.getElementById('mobile-sidebar-menu'));
    }

    // Bungkus renderSidebar yang sudah didefinisikan app.js.
    // Dengan ini setiap render ulang sidebar langsung diikuti pemasangan Etalase.
    if (typeof originalRenderSidebar === 'function') {
        window.renderSidebar = function (role) {
            originalRenderSidebar.apply(this, arguments);
            // DOM sudah selesai diisi oleh renderSidebar pada titik ini.
            syncSidebar();
            setTimeout(syncSidebar, 0);
        };
    }

    // app.js melakukan validasi role berdasarkan roleAccess. Karena item Etalase
    // sengaja tidak diberikan ke role lain, wrapper ini hanya membuka route ini
    // untuk role Keuangan; role lain tetap memakai validasi app.js.
    if (typeof originalNavigateTo === 'function') {
        window.navigateTo = function (modulePath, title) {
            if (modulePath === 'apotek/etalase' && isFinance()) {
                // Jalankan loader langsung agar tidak terkena roleAccess lama.
                var previousRole = window.currentRole;
                window.currentRole = 'keuangan';
                try {
                    return originalNavigateTo.call(this, modulePath, title || 'Etalase Haypop');
                } finally {
                    window.currentRole = previousRole;
                }
            }
            return originalNavigateTo.apply(this, arguments);
        };
    }

    // Jika startApp sudah berjalan sebelum wrapper dipasang, sinkronkan sekarang.
    syncSidebar();
    setTimeout(syncSidebar, 0);
    setTimeout(syncSidebar, 300);
    setTimeout(syncSidebar, 1000);
})();