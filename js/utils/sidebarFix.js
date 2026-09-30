/**
 * js/utils/sidebarFix.js
 *
 * Sidebar navigation hardening:
 * - Uses event delegation so rerendering the menu does not create new handlers.
 * - Handles the click in capture phase, preventing the legacy inline onclick
 *   from competing with dynamically rendered DOM/Lucide icons.
 * - Keeps one click = one navigation on desktop and mobile.
 * - Does not touch business modules or financial logic.
 */
(function () {
    'use strict';

    var attached = false;

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
