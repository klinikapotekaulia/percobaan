/**
 * js/utils/submitGuard.js
 * ============================================================
 * Shared submit guard for finance/transaction forms.
 */
window.SubmitGuard = {
    AUTO_RELEASE_MS: 30000,
    _busy: {},
    lock: function (key, buttonSelector) {
        if (this._busy[key]) return null;
        this._busy[key] = true;
        var self = this;
        var btn = buttonSelector ? document.querySelector(buttonSelector) : null;
        if (btn) {
            btn.disabled = true;
            btn.classList.add('opacity-50', 'cursor-not-allowed');
        }
        var released = false;
        var release = function () {
            if (released) return;
            released = true;
            clearTimeout(timer);
            delete self._busy[key];
            if (btn && btn.isConnected) {
                btn.disabled = false;
                btn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        };
        var timer = setTimeout(function () {
            if (!released) {
                console.warn('[SubmitGuard] release() tidak dipanggil untuk "' + key + '" — kunci dilepas otomatis.');
                release();
            }
        }, this.AUTO_RELEASE_MS);
        return release;
    },
    isBusy: function (key) { return !!this._busy[key]; },
    releaseAll: function () { this._busy = {}; }
};

/*
 * Payroll display-only alignment fix.
 *
 * payroll.js already renders a value immediately after "Gaji Pokok"
 * (grossPayroll/Total Bayar), but its table header historically omitted the
 * corresponding label. That caused "JM" and every following heading to sit
 * above the wrong value. This observer adds only the missing visual heading;
 * it never changes payroll data, calculations, formulas, or amounts.
 */
(function () {
    'use strict';

    function fixPayrollTotalBayarHeader() {
        var tables = document.querySelectorAll('#payroll-content table');
        tables.forEach(function (table) {
            var headRow = table.querySelector('thead tr');
            if (!headRow) return;

            var headers = Array.prototype.slice.call(headRow.querySelectorAll('th'));
            var gajiPokok = headers.find(function (th) {
                return (th.textContent || '').trim().toLowerCase() === 'gaji pokok';
            });
            if (!gajiPokok) return;

            var next = gajiPokok.nextElementSibling;
            if (next && (next.textContent || '').trim().toLowerCase() === 'total bayar') return;

            var th = document.createElement('th');
            th.className = 'px-2 py-3 text-right';
            th.textContent = 'Total Bayar';
            th.setAttribute('data-payroll-total-bayar-header', '1');
            gajiPokok.parentNode.insertBefore(th, gajiPokok.nextSibling);
        });
    }

    function installPayrollHeaderFix() {
        fixPayrollTotalBayarHeader();
        if (window.__auliaPayrollHeaderObserver) return;

        var observer = new MutationObserver(function () {
            fixPayrollTotalBayarHeader();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        window.__auliaPayrollHeaderObserver = observer;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', installPayrollHeaderFix, { once: true });
    } else {
        installPayrollHeaderFix();
    }
})();

/*
 * Keep the last visited page when the SPA is refreshed.
 *
 * The application is a single-page app, so a browser refresh rebuilds index.html
 * and normally starts from Dashboard. Store the module/title when the user
 * navigates, then restore that module after Firebase Auth has identified the
 * signed-in user. This is navigation-only: it does not touch Firestore data,
 * payroll values, permissions, or any business logic.
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'aulia_last_route_v1';
    var restored = false;

    function getRouteFromButton(button) {
        if (!button) return null;
        var modulePath = button.getAttribute('data-module') || '';
        var title = button.getAttribute('data-title') || '';
        if (!modulePath) {
            var onclick = button.getAttribute('onclick') || '';
            var match = onclick.match(/navigateTo\(\s*['"]((?:\\.|[^'"])*)['"]\s*,\s*['"]((?:\\.|[^'"])*)['"]\s*\)/);
            if (match) {
                modulePath = match[1].replace(/\\(['"])/g, '$1');
                title = match[2].replace(/\\(['"])/g, '$1');
            }
        }
        return modulePath ? { modulePath: modulePath, title: title } : null;
    }

    function saveRoute(route) {
        if (!route || !route.modulePath) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(route));
        } catch (e) {
            console.warn('[RoutePersistence] Gagal menyimpan halaman terakhir:', e);
        }
    }

    function readRoute() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            var route = JSON.parse(raw);
            return route && route.modulePath ? route : null;
        } catch (e) {
            return null;
        }
    }

    function saveActiveSidebarRoute() {
        var active = document.querySelector('#sidebar-menu .nav-btn.bg-primary-50, #mobile-sidebar-menu .nav-btn.bg-primary-50');
        if (!active) {
            active = document.querySelector('#sidebar-menu .nav-btn.text-primary-600, #mobile-sidebar-menu .nav-btn.text-primary-600');
        }
        var route = getRouteFromButton(active);
        if (route) saveRoute(route);
    }

    function restoreLastRoute() {
        if (restored) return;
        var route = readRoute();
        if (!route || !route.modulePath || typeof window.navigateTo !== 'function') return;

        restored = true;
        // Beri waktu singkat agar auth.js selesai menetapkan role dan sidebar.
        setTimeout(function () {
            try {
                window.navigateTo(route.modulePath, route.title || '');
            } catch (e) {
                console.warn('[RoutePersistence] Gagal memulihkan halaman:', e);
                restored = false;
            }
        }, 250);
    }

    function install() {
        // Simpan tujuan sebelum handler navigasi aplikasi dijalankan.
        document.addEventListener('click', function (evt) {
            var button = evt.target && evt.target.closest ? evt.target.closest('.nav-btn') : null;
            if (!button) return;
            var route = getRouteFromButton(button);
            if (route) saveRoute(route);
        }, true);

        // Juga simpan halaman aktif jika user menekan F5/Ctrl+R atau menutup tab.
        window.addEventListener('beforeunload', saveActiveSidebarRoute);

        // Restore setelah user terautentikasi. Jika auth.js sudah lebih dulu
        // selesai, currentUser langsung tersedia dan pemulihan dapat dijalankan.
        if (window.auth && typeof window.auth.onAuthStateChanged === 'function') {
            window.auth.onAuthStateChanged(function (user) {
                if (user) restoreLastRoute();
            });
        } else {
            setTimeout(restoreLastRoute, 1000);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', install, { once: true });
    } else {
        install();
    }
})();