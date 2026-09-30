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
// Sidebar aplikasi dibangun dari menuStructure + roleAccess. Item Etalase
// hanya didaftarkan ke menuStructure saat role yang sedang aktif adalah
// Keuangan. Dengan begitu role Admin/PSA/Apotek/Klinik/Dokter tidak mendapat
// menu ini walaupun mereka memiliki akses ke section Operasional Apotek.
(function registerHaypopEtalaseNativeMenu() {
    var attempts = 0;
    var lastRole = null;

    function sync() {
        if (typeof window.menuStructure === 'undefined' || typeof window.roleAccess === 'undefined') return false;
        if (!Array.isArray(window.menuStructure.apotek)) return false;

        var role = String(window.currentRole || '').toLowerCase();
        var list = window.menuStructure.apotek;
        var index = -1;
        for (var i = 0; i < list.length; i++) {
            if (list[i] && (list[i].id === 'etalase' || list[i].module === 'apotek/etalase')) {
                index = i;
                break;
            }
        }

        if (role === 'keuangan') {
            if (index === -1) {
                list.push({
                    id: 'etalase',
                    label: 'Etalase Haypop',
                    icon: 'store',
                    module: 'apotek/etalase'
                });
            }
        } else if (index !== -1) {
            list.splice(index, 1);
        }

        if (role !== lastRole && role) {
            lastRole = role;
            if (typeof window.renderSidebar === 'function') window.renderSidebar(role);
        }
        return true;
    }

    function start() {
        sync();
        var timer = setInterval(function () {
            attempts++;
            sync();
            if (attempts >= 120) clearInterval(timer);
        }, 250);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
