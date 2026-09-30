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
// HAYPOP ETALASE — menu khusus role Keuangan
// ============================================================
// Menu ini sengaja dipasang pada hasil render sidebar agar tidak bergantung
// pada timing inisialisasi currentRole/menuStructure. Akses halaman tetap
// mengikuti roleAccess: section apotek hanya terbuka untuk role yang memang
// sudah memiliki akses tersebut.
(function registerHaypopEtalaseMenu() {
    var observerStarted = false;

    function normalizedRole() {
        var role = String(window.currentRole || '').trim().toLowerCase();
        if (role === 'finance' || role === 'keuangan') return 'keuangan';

        var roleEl = document.getElementById('user-role');
        var label = roleEl ? String(roleEl.textContent || '').trim().toLowerCase() : '';
        if (label === 'keuangan' || label.indexOf('keuangan') !== -1 || label.indexOf('finance') !== -1) {
            return 'keuangan';
        }
        return role;
    }

    function makeButton() {
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
        return li;
    }

    function syncMenu(container) {
        if (!container) return;

        var finance = normalizedRole() === 'keuangan';
        var old = container.querySelector('[data-haypop-etalase="true"]');
        if (!finance) {
            if (old) old.remove();
            return;
        }
        if (old) return;

        var buttons = Array.prototype.slice.call(container.querySelectorAll('button.nav-btn'));
        var transaksi = buttons.find(function (btn) { return btn.getAttribute('data-page') === 'transaksi'; });
        if (!transaksi || !transaksi.parentElement || !transaksi.parentElement.parentElement) return;

        var list = transaksi.parentElement.parentElement;
        list.appendChild(makeButton());
        if (window.lucide && lucide.createIcons) lucide.createIcons({ el: list });
    }

    function syncAll() {
        syncMenu(document.getElementById('sidebar-menu'));
        syncMenu(document.getElementById('mobile-sidebar-menu'));
    }

    function start() {
        if (observerStarted) return;
        observerStarted = true;
        syncAll();

        var targets = [
            document.getElementById('sidebar-menu'),
            document.getElementById('mobile-sidebar-menu'),
            document.getElementById('user-role')
        ].filter(Boolean);

        if (typeof MutationObserver !== 'undefined') {
            var observer = new MutationObserver(function () {
                syncAll();
            });
            targets.forEach(function (target) {
                observer.observe(target, { childList: true, subtree: true, characterData: true });
            });
            window._haypopEtalaseMenuObserver = observer;
        }

        // Fallback untuk perubahan role yang tidak memicu observer pada target awal.
        var tries = 0;
        var timer = setInterval(function () {
            syncAll();
            tries++;
            if (tries >= 240) clearInterval(timer);
        }, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
