/**
 * js/utils/sidebarFix.js
 *
 * Sidebar navigation hardening:
 * - Uses event delegation so rerendering the menu does not create new handlers.
 * - Handles the click in capture phase, preventing the legacy inline onclick
 *   from competing with dynamically rendered DOM/Lucide icons.
 * - Keeps one click = one navigation on desktop and mobile.
 * - Removes hover/focus transition effects that caused the blue flash.
 * - Does not touch business modules or financial logic.
 */
(function () {
    'use strict';

    var attached = false;

    function installStableSidebarStyle() {
        if (document.getElementById('aulia-sidebar-stable-style')) return;
        var style = document.createElement('style');
        style.id = 'aulia-sidebar-stable-style';
        style.textContent =
            '#sidebar-menu .nav-btn, #mobile-sidebar-menu .nav-btn {' +
            'transition: none !important; animation: none !important; transform: none !important;' +
            '-webkit-tap-highlight-color: transparent !important; outline: none !important;' +
            '}' +
            '#sidebar-menu .nav-btn:hover, #mobile-sidebar-menu .nav-btn:hover {' +
            'background-color: transparent !important; color: inherit !important; box-shadow: none !important;' +
            '}' +
            '#sidebar-menu .nav-btn:active, #mobile-sidebar-menu .nav-btn:active {' +
            'background-color: transparent !important; color: inherit !important; box-shadow: none !important; transform: none !important;' +
            '}' +
            '#sidebar-menu .nav-btn:focus, #sidebar-menu .nav-btn:focus-visible,' +
            '#mobile-sidebar-menu .nav-btn:focus, #mobile-sidebar-menu .nav-btn:focus-visible {' +
            'outline: none !important; box-shadow: none !important;' +
            '}' +
            '#sidebar-menu .nav-btn > *, #mobile-sidebar-menu .nav-btn > * {' +
            'pointer-events: none !important; transition: none !important; animation: none !important;' +
            '}';
        document.head.appendChild(style);
    }

    function getNavigation(button) {
        var modulePath = button.getAttribute('data-module');
        var title = button.getAttribute('data-title') || '';

        // Current sidebar markup still contains an inline navigateTo(...).
        // Read it only as a compatibility bridge; the actual click is handled
        // here so there is exactly one navigation call.
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
        if (!button) return;

        var sidebar = button.closest('#sidebar-menu, #mobile-sidebar-menu');
        if (!sidebar) return;

        var nav = getNavigation(button);
        if (!nav.modulePath || typeof window.navigateTo !== 'function') return;

        // Capture-phase handling prevents the legacy inline onclick from firing.
        evt.preventDefault();
        evt.stopPropagation();
        window.navigateTo(nav.modulePath, nav.title);
    }

    function attach() {
        if (attached) return;
        var desktop = document.getElementById('sidebar-menu');
        var mobile = document.getElementById('mobile-sidebar-menu');
        if (!desktop && !mobile) return;

        installStableSidebarStyle();

        // Delegation survives renderSidebar() replacing menu innerHTML.
        document.addEventListener('click', handleSidebarClick, true);
        attached = true;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attach, { once: true });
    } else {
        attach();
    }

    var attempts = 0;
    var timer = setInterval(function () {
        if (attached || attempts++ >= 20) {
            clearInterval(timer);
            return;
        }
        attach();
    }, 250);
})();
