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

// Haypop Etalase integration is loaded globally because transaction.js is dynamically loaded.
(function () {
    var s = document.createElement('script');
    s.src = 'js/utils/etalaseHook.js';
    s.onload = function () { console.info('[Haypop Etalase] integration hook loaded'); };
    s.onerror = function () { console.warn('[Haypop Etalase] integration hook failed to load'); };
    document.head.appendChild(s);
})();

// Disable the legacy second Etalase menu and prevent its renderSidebar patch.
(function () {
    var s = document.createElement('script');
    s.src = 'js/utils/etalaseMenuGuard.js';
    s.onload = function () { console.info('[Etalase] duplicate menu guard loaded'); };
    s.onerror = function () { console.warn('[Etalase] duplicate menu guard failed to load'); };
    document.head.appendChild(s);
})();

// Keep exactly one Etalase entry in each rendered sidebar as a safety net.
(function () {
    function normalizeEtalaseMenu() {
        ['sidebar-menu', 'mobile-sidebar-menu'].forEach(function (id) {
            var root = document.getElementById(id);
            if (!root) return;
            var matches = Array.prototype.slice.call(root.querySelectorAll('button')).filter(function (btn) {
                var page = String(btn.getAttribute('data-page') || '').toLowerCase();
                var text = String(btn.textContent || '').trim().toLowerCase();
                return page === 'etalase' || text === 'etalase' || text === 'etalase haypop';
            });
            if (matches.length <= 1) return;
            matches.slice(1).forEach(function (btn) {
                var item = btn.closest('li') || btn.parentElement;
                if (item) item.remove();
            });
        });
    }
    window.normalizeEtalaseMenu = normalizeEtalaseMenu;
    setInterval(normalizeEtalaseMenu, 250);
    setTimeout(normalizeEtalaseMenu, 0);
})();

// Sidebar navigation hardening is loaded globally because the sidebar is rendered dynamically.
(function () {
    var s = document.createElement('script');
    s.src = 'js/utils/sidebarFix.js';
    s.onload = function () { console.info('[Sidebar] single-click navigation guard loaded'); };
    s.onerror = function () { console.warn('[Sidebar] navigation guard failed to load'); };
    document.head.appendChild(s);
})();
