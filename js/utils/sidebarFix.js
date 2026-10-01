/**
 * Sidebar navigation hardening.
 *
 * The sidebar is dynamically rendered by app.js. Older versions mixed inline
 * onclick handlers with a delegated listener. That made navigation fragile
 * when renderSidebar()/lucide rebuilt the DOM. This version converts each
 * sidebar button to a real data-driven button and installs exactly one native
 * listener per rendered button. A delegated capture listener remains as a
 * fallback for a button created between observer cycles.
 */
(function () {
    'use strict';

    var STYLE_ID = 'aulia-sidebar-stable-style';
    var OBSERVER_ID = '__auliaSidebarObserver';

    function installStableSidebarStyle() {
        if (document.getElementById(STYLE_ID)) return;
        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = [
            '#sidebar-menu .nav-btn, #mobile-sidebar-menu .nav-btn {',
            '  transition: none !important;',
            '  animation: none !important;',
            '  transform: none !important;',
            '  -webkit-tap-highlight-color: transparent !important;',
            '  outline: none !important;',
            '}',
            '#sidebar-menu .nav-btn:hover:not(.bg-primary-50), #mobile-sidebar-menu .nav-btn:hover:not(.bg-primary-50) {',
            '  background-color: transparent !important;',
            '  color: inherit !important;',
            '  box-shadow: none !important;',
            '}',
            '#sidebar-menu .nav-btn.bg-primary-50:hover, #mobile-sidebar-menu .nav-btn.bg-primary-50:hover {',
            '  background-color: #f0f9ff !important;',
            '  color: #0284c7 !important;',
            '  box-shadow: none !important;',
            '}',
            '.dark #sidebar-menu .nav-btn.bg-primary-50:hover, .dark #mobile-sidebar-menu .nav-btn.bg-primary-50:hover {',
            '  background-color: #334155 !important;',
            '  color: #38bdf8 !important;',
            '}',
            '#sidebar-menu .nav-btn:active, #mobile-sidebar-menu .nav-btn:active,',
            '#sidebar-menu .nav-btn:focus, #sidebar-menu .nav-btn:focus-visible,',
            '#mobile-sidebar-menu .nav-btn:focus, #mobile-sidebar-menu .nav-btn:focus-visible {',
            '  outline: none !important;',
            '  box-shadow: none !important;',
            '  transform: none !important;',
            '}',
            '#sidebar-menu .nav-btn > *, #mobile-sidebar-menu .nav-btn > * {',
            '  pointer-events: none !important;',
            '  transition: none !important;',
            '  animation: none !important;',
            '}'
        ].join('\n');
        document.head.appendChild(style);
    }

    function parseNavigation(button) {
        var modulePath = button.getAttribute('data-module') || '';
        var title = button.getAttribute('data-title') || '';

        if (!modulePath) {
            var inline = button.getAttribute('onclick') || '';
            var match = inline.match(/navigateTo\(\s*['"]((?:\\.|[^'"])*)['"]\s*,\s*['"]((?:\\.|[^'"])*)['"]\s*\)/);
            if (match) {
                modulePath = match[1].replace(/\\(['"])/g, '$1');
                title = match[2].replace(/\\(['"])/g, '$1');
            }
        }
        return { modulePath: modulePath, title: title };
    }

    function navigate(button) {
        if (!button || !button.matches('.nav-btn')) return;
        if (!button.closest('#sidebar-menu, #mobile-sidebar-menu')) return;
        if (button.dataset.sidebarNavigating === '1') return;

        var nav = parseNavigation(button);
        if (!nav.modulePath || typeof window.navigateTo !== 'function') return;

        button.dataset.sidebarNavigating = '1';
        window.navigateTo(nav.modulePath, nav.title);

        setTimeout(function () {
            if (button.isConnected) delete button.dataset.sidebarNavigating;
        }, 500);
    }

    function wireButton(button) {
        if (!button || !button.matches('.nav-btn')) return;
        if (!button.closest('#sidebar-menu, #mobile-sidebar-menu')) return;
        if (button.dataset.sidebarWired === '1') return;

        var nav = parseNavigation(button);
        if (!nav.modulePath) return;

        button.setAttribute('data-module', nav.modulePath);
        button.setAttribute('data-title', nav.title);
        button.removeAttribute('onclick');
        button.dataset.sidebarWired = '1';

        button.addEventListener('click', function (evt) {
            evt.preventDefault();
            evt.stopPropagation();
            navigate(button);
        }, false);
    }

    function wireAll() {
        document.querySelectorAll('#sidebar-menu .nav-btn, #mobile-sidebar-menu .nav-btn').forEach(wireButton);
    }

    // Payroll display-only fix: every payroll body row contains a Gross Payroll
    // value immediately after Gaji Pokok. The source table omitted that heading,
    // so JM and every following heading appeared one column to the left.
    // Insert the missing heading by semantic position, without changing any
    // payroll value, calculation, formula, or data.
    function fixPayrollTableHeader() {
        var tables = document.querySelectorAll('#payroll-content table');
        tables.forEach(function (table) {
            var headRow = table.querySelector('thead tr');
            var bodyRow = table.querySelector('tbody tr');
            if (!headRow || !bodyRow) return;

            var alreadyFixed = headRow.querySelector('[data-payroll-gross-header="1"]');
            if (alreadyFixed) return;

            var target = Array.prototype.find.call(headRow.querySelectorAll('th'), function (th) {
                return (th.textContent || '').trim().toLowerCase() === 'gaji pokok';
            });
            if (!target) return;

            // The fifth body cell is Gross Payroll in the actual payroll table.
            // Insert exactly one heading immediately after Gaji Pokok, regardless
            // of whether the header/body cell counts happen to match.
            var th = document.createElement('th');
            th.className = 'px-2 py-3 text-right';
            th.textContent = 'Gross Payroll';
            th.setAttribute('data-payroll-gross-header', '1');
            target.parentNode.insertBefore(th, target.nextSibling);
        });
    }

    function install() {
        installStableSidebarStyle();
        wireAll();
        fixPayrollTableHeader();

        if (!window[OBSERVER_ID]) {
            var observer = new MutationObserver(function () {
                wireAll();
                fixPayrollTableHeader();
            });
            observer.observe(document.body, { childList: true, subtree: true });
            window[OBSERVER_ID] = observer;
        }

        if (!window.__auliaSidebarCaptureInstalled) {
            document.addEventListener('click', function (evt) {
                var target = evt.target;
                var button = target && target.closest ? target.closest('.nav-btn') : null;
                if (!button || !button.closest('#sidebar-menu, #mobile-sidebar-menu')) return;
                if (button.dataset.sidebarWired === '1') return;
                evt.preventDefault();
                evt.stopImmediatePropagation();
                wireButton(button);
                navigate(button);
            }, true);
            window.__auliaSidebarCaptureInstalled = true;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', install, { once: true });
    } else {
        install();
    }
})();