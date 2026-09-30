/**
 * Sidebar navigation hardening.
 * Also normalizes duplicate Etalase menu entries so only one canonical
 * "Etalase" entry remains. This is UI-only; it does not touch Etalase data.
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

    function normalizeEtalaseMenus(root) {
        root = root || document;
        ['#sidebar-menu', '#mobile-sidebar-menu'].forEach(function (selector) {
            var menu = root.querySelector(selector);
            if (!menu) return;
            var buttons = Array.prototype.slice.call(menu.querySelectorAll('.nav-btn'));
            var etalaseButtons = buttons.filter(function (btn) {
                var nav = parseNavigation(btn);
                var text = (btn.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
                return nav.modulePath === 'apotek/etalase' || text === 'etalase' || text === 'etalase haypop';
            });
            if (!etalaseButtons.length) return;

            var canonical = etalaseButtons.find(function (btn) {
                return (btn.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase() === 'etalase';
            }) || etalaseButtons[0];

            var titleNode = canonical.querySelector('.nav-label, [data-nav-label]');
            if (titleNode) titleNode.textContent = 'Etalase';

            etalaseButtons.forEach(function (btn) {
                if (btn !== canonical && btn.parentNode) btn.parentNode.removeChild(btn);
            });
        });
    }

    function wireAll() {
        normalizeEtalaseMenus(document);
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