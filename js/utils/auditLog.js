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
(function initHaypopEtalaseMenu() {
    function isFinanceRole() {
        if (String(window.currentRole || '').toLowerCase() === 'keuangan') return true;

        var roleEl = document.getElementById('user-role');
        var roleText = roleEl ? String(roleEl.textContent || '').trim().toLowerCase() : '';
        if (roleText === 'keuangan' || roleText.indexOf('keuangan') !== -1) return true;

        return false;
    }

    function makeMenuItem() {
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

    function addMenuTo(container) {
        if (!container || !isFinanceRole()) return;
        if (container.querySelector('[data-page="etalase"]')) return;

        // Cari bagian Operasional Apotek berdasarkan menu Transaksi, sehingga
        // tidak tergantung bahasa yang sedang aktif.
        var transaksiBtn = container.querySelector('[data-page="transaksi"]');
        var list = transaksiBtn ? transaksiBtn.closest('ul') : null;

        // Fallback: cari heading section Operasional Apotek.
        if (!list) {
            var paragraphs = container.querySelectorAll('p');
            for (var i = 0; i < paragraphs.length; i++) {
                var text = (paragraphs[i].textContent || '').trim();
                if (text === 'Operasional Apotek' || text === 'Pharmacy Operations' || text === 'Operasional Apoték') {
                    var section = paragraphs[i].parentElement;
                    list = section ? section.querySelector('ul') : null;
                    if (list) break;
                }
            }
        }

        if (!list) return;
        list.appendChild(makeMenuItem());
        if (window.lucide && lucide.createIcons) lucide.createIcons();
    }

    function refresh() {
        addMenuTo(document.getElementById('sidebar-menu'));
        addMenuTo(document.getElementById('mobile-sidebar-menu'));
    }

    function start() {
        refresh();

        var targets = [
            document.getElementById('sidebar-menu'),
            document.getElementById('mobile-sidebar-menu')
        ];

        targets.forEach(function (target) {
            if (!target || typeof MutationObserver === 'undefined') return;
            new MutationObserver(function () {
                refresh();
            }).observe(target, { childList: true, subtree: true });
        });

        // Auth dan renderSidebar dapat selesai setelah script ini dimuat.
        // Polling singkat memastikan menu muncul setelah role tersedia.
        var attempts = 0;
        var timer = setInterval(function () {
            refresh();
            attempts++;
            if (attempts >= 120) clearInterval(timer);
        }, 250);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
