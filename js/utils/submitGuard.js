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