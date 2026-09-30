/**
 * Sidebar navigation hardening.
 *
 * The sidebar is dynamically rendered by app.js. Navigation is handled here
 * with one delegated capture-phase listener so a rerender never creates extra
 * click handlers. Visual hover/focus effects are neutralized here as well.
 */
(function () {
    'use strict';

    var attached = false;

    function installStableSidebarStyle() {
        if (document.getElementById('aulia-sidebar-stable-style')) return;
        var style = document.createElement('style');
        style.id = 'aulia-sidebar-stable-style';
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

    function getNavigation(button) {
        var modulePath = button.getAttribute('data-module');
        var title = button.getAttribute('data-title') || '';

        // Current build stores the route in inline onclick. Read it once as a
        // compatibility bridge; the inline handler itself is blocked below.
        if (!modulePath) {
            var inline = button.getAttribute('onclick') || '';
            var match = inline.match(/navigateTo\(\s*'((?:\\'|[^'])*)'\s*,\s*'((?:\\'|[^'])*)'\s*\)/);
            if (match) {
                modulePath = match[1].replace(/\\'/g, "'");
                title = match[2].replace(/\\'/g, "'");
            }
        }
        return { modulePath: modulePath, title: title };
    }

    function handleSidebarClick(evt) {
        var target = evt.target;
        if (!target || !target.closest) return;

        var button = target.closest('.nav-btn');
        if (!button || !button.closest('#sidebar-menu, #mobile-sidebar-menu')) return;

        var nav = getNavigation(button);
        if (!nav.modulePath || typeof window.navigateTo !== 'function') return;

        // Capture phase + stopImmediatePropagation means the legacy inline
        // onclick cannot execute a second time.
        evt.preventDefault();
        evt.stopImmediatePropagation();
        window.navigateTo(nav.modulePath, nav.title);
    }

    function attach() {
        if (attached) return;
        installStableSidebarStyle();
        document.addEventListener('click', handleSidebarClick, true);
        attached = true;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attach, { once: true });
    } else {
        attach();
    }
})();
