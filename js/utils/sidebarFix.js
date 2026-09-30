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

        // Release after the route/render cycle. This prevents duplicate
        // activation without disabling the button visually.
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

        // Store route explicitly and remove the fragile inline handler.
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

    function install() {
        installStableSidebarStyle();
        wireAll();

        if (!window[OBSERVER_ID]) {
            var observer = new MutationObserver(function () {
                wireAll();
            });
            observer.observe(document.body, { childList: true, subtree: true });
            window[OBSERVER_ID] = observer;
        }

        // Safety fallback for a button that is clicked before the observer
        // callback runs. This is capture phase, but only handles unwired buttons.
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