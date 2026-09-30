/**
 * js/utils/etalaseMenuGuard.js
 *
 * Etalase must have exactly one native sidebar entry.
 * The legacy Haypop integration used to inject a second "Etalase Haypop"
 * button and patch renderSidebar repeatedly. This guard disables that legacy
 * menu injection before the integration hook can add it.
 */
(function () {
    'use strict';

    function disableLegacyEtalaseMenu() {
        // etalaseHook.js used this method to inject a second sidebar item.
        if (window.HaypopEtalase) {
            window.HaypopEtalase.injectMenu = function () {};
        }

        // etalase.js used this marker before wrapping renderSidebar. Mark the
        // native renderer as already protected so it does not install another
        // wrapper that rebuilds the sidebar during navigation.
        if (typeof window.renderSidebar === 'function' && !window.renderSidebar.__etalasePatched) {
            window.renderSidebar.__etalasePatched = true;
        }

        // Remove a legacy duplicate if it was inserted before this guard ran.
        document.querySelectorAll('[data-page="etalase"]').forEach(function (el) {
            var label = (el.textContent || '').trim();
            if (/^Etalase Haypop$/i.test(label)) {
                var li = el.closest('li');
                if (li) li.remove();
            }
        });
    }

    disableLegacyEtalaseMenu();
    setInterval(disableLegacyEtalaseMenu, 250);
})();