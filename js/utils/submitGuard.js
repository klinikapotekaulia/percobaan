/**
 * js/utils/submitGuard.js
 * ============================================================
 * PERBAIKAN AUDIT (Juli 2026) — TEMUAN #10: klik ganda pada form keuangan.
 *
 * Latar belakang:
 * Pola penjaga klik-ganda (`_isSaving` + `btn.disabled` + `_resetGuard()`)
 * sudah ditulis dengan benar di lima modul — transaksi, retur, pembelian,
 * rekamMedis, antrian — tapi disalin manual satu per satu, sehingga delapan
 * modul lain (justru yang menyangkut uang: pengeluaran, pendapatan lain,
 * piutang, jurnal manual, absensi manual, master obat/pasien/karyawan)
 * tidak pernah kebagian. Akibatnya menekan Enter dua kali atau double-tap
 * di tablet menghasilkan DUA dokumen identik dengan ID berbeda.
 *
 * File ini menjadikan pola tersebut satu utilitas bersama, supaya modul
 * baru tinggal memakainya dan tidak perlu menyalin ulang logikanya.
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

// Sidebar navigation hardening is loaded globally because the sidebar is
// rendered dynamically by app.js after authentication.
(function () {
    var s = document.createElement('script');
    s.src = 'js/utils/sidebarFix.js';
    s.onload = function () { console.info('[Sidebar] single-click navigation guard loaded'); };
    s.onerror = function () { console.warn('[Sidebar] navigation guard failed to load'); };
    document.head.appendChild(s);
})();
