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

// Sidebar navigation does not need a second event system. The native navigation
// buttons rendered by app.js use their own single onclick handler. Keeping a
// second global click/capture layer here caused competing handlers and made the
// first click unreliable.
