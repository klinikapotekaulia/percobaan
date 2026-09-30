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
// HAYPOP ETALASE — UI menu khusus role Keuangan
//
// Tidak mengganti buildSidebarHtml. renderSidebar() menulis ulang
// isi sidebar secara langsung, sehingga hook terhadap buildSidebarHtml
// dapat kehilangan perubahan. Sebagai gantinya, observer menambahkan
// item menu setelah sidebar selesai dirender dan setiap kali dirender ulang.
// ============================================================
(function initHaypopEtalaseMenu() {
    function addMenuTo(container) {
        if (!container || window.currentRole !== 'keuangan') return;
        if (container.querySelector('[data-page="etalase"]')) return;

        var paragraphs = container.querySelectorAll('p');
        var section = null;
        for (var i = 0; i < paragraphs.length; i++) {
            var text = (paragraphs[i].textContent || '').trim();
            if (text === 'Operasional Apotek' || text === 'Pharmacy Operations' || text === 'Operasional Apoték') {
                section = paragraphs[i].parentElement;
                break;
            }
        }
        if (!section) return;

        var list = section.querySelector('ul');
        if (!list) return;

        var li = document.createElement('li');
        li.innerHTML =
            '<button type="button" onclick="navigateTo(\'apotek/etalase\', \'Etalase Haypop\')" ' +
            'class="nav-btn w-full text-left px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300 ' +
            'hover:bg-primary-50 dark:hover:bg-slate-700 hover:text-primary-600 dark:hover:text-primary-400 ' +
            'transition-colors flex items-center gap-3" data-page="etalase">' +
            '<i data-lucide="store" class="w-4 h-4 flex-shrink-0"></i>' +
            '<span>Etalase Haypop</span>' +
            '</button>';
        list.appendChild(li);

        if (window.lucide && lucide.createIcons) lucide.createIcons({ el: li });
    }

    function refresh() {
        if (window.currentRole !== 'keuangan') return;
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

        // renderSidebar dipanggil setelah auth state selesai. Polling singkat
        // memastikan menu muncul walaupun sidebar dirender beberapa saat kemudian.
        var attempts = 0;
        var timer = setInterval(function () {
            refresh();
            attempts++;
            if (attempts >= 60) clearInterval(timer);
        }, 250);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
