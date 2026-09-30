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
// HAYPOP ETALASE — registrasi menu native khusus role Keuangan
// ============================================================
// Jangan memanipulasi DOM sidebar secara langsung. Aplikasi utama
// membangun sidebar dari menuStructure + roleAccess. Kita tunggu kedua
// struktur tersedia, lalu mendaftarkan item ke menuStructure.apotek dan
// renderSidebar ulang dengan role yang sedang login.
(function registerHaypopEtalaseNativeMenu() {
    var registered = false;
    var attempts = 0;

    function register() {
        if (registered) return true;
        if (typeof window.menuStructure === 'undefined' || typeof window.roleAccess === 'undefined') return false;
        if (!Array.isArray(window.menuStructure.apotek)) return false;

        var exists = window.menuStructure.apotek.some(function (item) {
            return item && (item.id === 'etalase' || item.module === 'apotek/etalase');
        });

        if (!exists) {
            window.menuStructure.apotek.push({
                id: 'etalase',
                label: 'Etalase Haypop',
                icon: 'store',
                module: 'apotek/etalase'
            });
        }

        registered = true;

        // Re-render sidebar memakai mekanisme resmi aplikasi. Role Keuangan
        // sudah memiliki akses ke section 'apotek', sedangkan role lain tidak
        // memiliki section tersebut atau item ini tidak akan ditambahkan ke
        // roleAccess mereka.
        if (typeof window.renderSidebar === 'function') {
            var role = window.currentRole || '';
            if (role) window.renderSidebar(role);
        }
        return true;
    }

    function start() {
        if (register()) return;
        var timer = setInterval(function () {
            attempts++;
            if (register() || attempts >= 120) clearInterval(timer);
        }, 250);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
