/**
 * js/utils/sidebarFix.js
 *
 * Sidebar navigation hardening:
 * - Uses event delegation so rerendering the menu does not create new handlers.
 * - Handles the click in capture phase, preventing the inline onclick handler
 *   from competing with dynamically rendered DOM/Lucide icons.
 * - Keeps one click = one navigation on desktop and mobile.
 * - Does not touch business modules or financial logic.
 */
(function () {
    'use strict';

    var attached = false;

    function handleSidebarClick(evt) {
        var target = evt.target;
        if (!target || !target.closest) return;

        var button = target.closest('.nav-btn');
        if (!button) return;

        // Only handle buttons belonging to one of the two sidebar containers.
        var sidebar = button.closest('#sidebar-menu, #mobile-sidebar-menu');
        if (!sidebar) return;

        var modulePath = button.getAttribute('data-module');
        var title = button.getAttribute('data-title') || button.getAttribute('aria-label') || '';
        if (!modulePath || typeof window.navigateTo !== 'function') return;

        // Stop the old inline onclick from firing as a second navigation.
        evt.preventDefault();
        evt.stopPropagation();

        window.navigateTo(modulePath, title);
    }

    function attach() {
        if (attached) return;
        var desktop = document.getElementById('sidebar-menu');
        var mobile = document.getElementById('mobile-sidebar-menu');
        if (!desktop && !mobile) return;

        // Delegation is attached to document so it survives renderSidebar()
        // replacing the contents of both menu containers with innerHTML.
        document.addEventListener('click', handleSidebarClick, true);
        attached = true;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attach, { once: true });
    } else {
        attach();
    }

    // app.js is loaded before auth.js and renders the sidebar after login.
    // Retry briefly in case the containers do not exist at initial DOM ready.
    var attempts = 0;
    var timer = setInterval(function () {
        if (attached || attempts++ >= 20) {
            clearInterval(timer);
            return;
        }
        attach();
    }, 250);
})();
