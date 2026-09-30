/**
 * js/utils/auditLog.js
 * Audit Trail sederhana untuk transaksi keuangan penting.
 *
 * KENAPA FILE INI ADA:
 * Sebelumnya tidak ada jejak siapa-melakukan-apa untuk aksi keuangan
 * (approve pengeluaran, lunasi hutang, jurnal manual, payroll, dst).
 * Kalau ada kejanggalan angka, tidak ada cara melacak siapa yang
 * mengubah/menyetujui data tersebut dan kapan.
 *
 * CARA PAKAI (dari module manapun, setelah operasi Firestore berhasil):
 *   AuditLog.catat({
 *       aksi: 'approve',
 *       modul: 'Pengeluaran Kas',
 *       koleksi: 'kasKeluar',
 *       targetId: id,
 *       deskripsi: 'Approve pengeluaran: Beli ATK',
 *       nominal: 50000
 *   });
 *
 * PENTING: pencatatan ini "fire and forget" — dipanggil SETELAH operasi
 * utama sukses, dan kegagalannya TIDAK BOLEH menggagalkan/menghentikan
 * alur utama.
 */

window.AuditLog = {
    catat: function (opts) {
        opts = opts || {};
        try {
            var user = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
            var entry = {
                aksi:      opts.aksi      || 'lainnya',
                modul:     opts.modul     || '-',
                koleksi:   opts.koleksi   || null,
                targetId:  opts.targetId  || null,
                deskripsi: opts.deskripsi || '',
                nominal:   (typeof opts.nominal === 'number') ? opts.nominal : null,
                oleh:      window.currentUserName || (user && user.email) || 'Sistem',
                olehUid:   user ? user.uid : null,
                role:      window.currentRole || null,
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
// HAYPOP ETALASE — integrasi menu global
// Modul etalase memang berada di js/apotek/etalase.js, tetapi menu
// sebelumnya belum terdaftar di struktur sidebar sehingga tidak terlihat.
// File ini sudah dimuat global oleh index.html, jadi integrasi dilakukan
// di sini tanpa mengubah router utama.
// ============================================================
(function registerHaypopEtalase() {
    function install() {
        if (typeof buildSidebarHtml !== 'function' || typeof App === 'undefined') return false;
        if (window.__haypopEtalaseInstalled) return true;

        App.translations.id.menu_etalase = 'Etalase Haypop';
        App.translations.en.menu_etalase = 'Haypop Display';
        App.translations.su.menu_etalase = 'Etalase Haypop';

        var originalBuildSidebarHtml = buildSidebarHtml;
        window.buildSidebarHtml = buildSidebarHtml = function (role) {
            var html = originalBuildSidebarHtml(role);
            if (role !== 'keuangan') return html;

            var holder = document.createElement('div');
            holder.innerHTML = html;
            var sections = holder.querySelectorAll('p');
            var apotekSection = null;
            for (var i = 0; i < sections.length; i++) {
                if (sections[i].textContent.trim() === App.translate('sec_apotek')) {
                    apotekSection = sections[i].parentElement;
                    break;
                }
            }
            if (!apotekSection) return html;
            var list = apotekSection.querySelector('ul');
            if (!list || list.querySelector('[data-page="etalase"]')) return holder.innerHTML;

            var label = App.translate('menu_etalase', 'Etalase Haypop');
            var li = document.createElement('li');
            li.innerHTML = '<button onclick="navigateTo(\'apotek/etalase\', \'Etalase Haypop\')" class="nav-btn w-full text-left px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-slate-700 hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-3" data-page="etalase"><i data-lucide="store" class="w-4 h-4 flex-shrink-0"></i><span>' + Utils.escapeHtml(label) + '</span></button></li>';
            list.appendChild(li);
            return holder.innerHTML;
        };

        var originalNavigateTo = window.navigateTo;
        window.navigateTo = function (modulePath, title) {
            if (modulePath === 'apotek/etalase' && window.currentRole !== 'keuangan') {
                Utils.toast('Akses Ditolak: Etalase Haypop hanya untuk role Keuangan.', 'error');
                return;
            }
            return originalNavigateTo.apply(this, arguments);
        };

        window.__haypopEtalaseInstalled = true;
        return true;
    }

    if (!install()) {
        var attempts = 0;
        var timer = setInterval(function () {
            attempts++;
            if (install() || attempts > 50) clearInterval(timer);
        }, 100);
    }
})();
