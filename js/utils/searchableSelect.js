/**
 * js/utils/searchableSelect.js
 * ============================================================
 * Menambahkan fitur "ketik untuk cari" ke <select> yang isinya banyak
 * (misal daftar obat / pasien ribuan baris), tanpa perlu ubah logic
 * yang sudah ada di masing-masing halaman.
 *
 * Cara kerja:
 * - <select> asli TETAP ADA di DOM (cuma disembunyikan visualnya),
 *   supaya semua kode lama yang baca `.value`, pakai `onchange="..."`,
 *   atau `sel.options[sel.selectedIndex]` tetap berfungsi apa adanya.
 * - Di atasnya dipasang <input type="text"> + daftar dropdown hasil
 *   filter. Begitu user pilih salah satu, nilai <select> asli
 *   di-update lalu event 'change' di-dispatch, jadi handler onchange
 *   yang sudah ada otomatis kepanggil seperti biasa.
 *
 * Cara pakai (panggil SETELAH <select> ada di DOM):
 *   SearchableSelect.attach('trx-obat-0');
 *   SearchableSelect.attach('ant-pasien', { placeholder: 'Cari nama / no. RM...' });
 *
 * Aman dipanggil berkali-kali untuk id yang sama (tidak dobel pasang).
 */
window.SearchableSelect = {

    attach: function (selectId, options) {
        options = options || {};
        var select = document.getElementById(selectId);
        if (!select || select.tagName !== 'SELECT') return;
        if (select.dataset.searchableAttached === '1') {
            // sudah pernah dipasang sebelumnya (mis. re-render) -> cukup refresh opsinya
            this._syncInputFromSelect(select);
            return;
        }
        select.dataset.searchableAttached = '1';

        // Bungkus <select> asli dalam wrapper relative, sembunyikan secara visual
        // (bukan display:none, supaya browser tetap memperlakukannya sebagai
        // elemen form yang valid untuk validasi 'required' dsb).
        var wrapper = document.createElement('div');
        wrapper.className = 'relative searchable-select-wrapper';
        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(select);
        select.style.cssText = 'position:absolute; opacity:0; height:0; width:0; padding:0; border:0; pointer-events:none;';
        select.tabIndex = -1;

        var baseClass = select.getAttribute('data-input-class') ||
            'w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm';

        var input = document.createElement('input');
        input.type = 'text';
        input.autocomplete = 'off';
        input.className = baseClass;
        input.placeholder = options.placeholder || 'Ketik untuk mencari...';
        wrapper.appendChild(input);

        var dropdown = document.createElement('div');
        dropdown.className = 'absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg hidden';
        wrapper.appendChild(dropdown);

        var activeIndex = -1;

        function optionLabel(opt) { return opt.textContent || ''; }

        function renderDropdown(query) {
            var q = (query || '').trim().toLowerCase();
            dropdown.innerHTML = '';
            activeIndex = -1;

            var frag = document.createDocumentFragment();
            var count = 0;
            var maxRender = 200; // jaga performa render kalau hasil filter masih banyak

            Array.prototype.forEach.call(select.options, function (opt) {
                if (!opt.value) return; // lewati placeholder "-- Pilih --"
                var label = optionLabel(opt);
                if (q && label.toLowerCase().indexOf(q) === -1) return;
                if (count >= maxRender) return;
                count++;

                var item = document.createElement('div');
                item.className = 'px-3 py-2 text-sm cursor-pointer text-slate-700 dark:text-slate-200 hover:bg-primary-50 dark:hover:bg-slate-600';
                item.textContent = label;
                item.dataset.value = opt.value;
                item.addEventListener('mousedown', function (e) {
                    e.preventDefault(); // cegah blur duluan sebelum klik terdaftar
                    selectOption(opt);
                });
                frag.appendChild(item);
            });

            if (count === 0) {
                var empty = document.createElement('div');
                empty.className = 'px-3 py-2 text-sm text-slate-400 italic';
                empty.textContent = 'Tidak ditemukan';
                frag.appendChild(empty);
            }

            dropdown.appendChild(frag);
            dropdown.classList.remove('hidden');
        }

        function selectOption(opt) {
            select.value = opt.value;
            input.value = optionLabel(opt);
            dropdown.classList.add('hidden');
            var evt = document.createEvent('HTMLEvents');
            evt.initEvent('change', true, true);
            select.dispatchEvent(evt);
        }

        function highlightActive() {
            var items = dropdown.querySelectorAll('[data-value]');
            items.forEach(function (it, i) {
                if (i === activeIndex) {
                    it.classList.add('bg-primary-50', 'dark:bg-slate-600');
                    it.scrollIntoView({ block: 'nearest' });
                } else {
                    it.classList.remove('bg-primary-50', 'dark:bg-slate-600');
                }
            });
        }

        input.addEventListener('focus', function () {
            input.select();
            renderDropdown('');
        });

        input.addEventListener('input', function () {
            renderDropdown(input.value);
        });

        input.addEventListener('blur', function () {
            // delay supaya event mousedown di item dropdown sempat kepanggil dulu
            setTimeout(function () {
                dropdown.classList.add('hidden');
                SearchableSelect._syncInputFromSelect(select);
            }, 150);
        });

        input.addEventListener('keydown', function (e) {
            var items = dropdown.querySelectorAll('[data-value]');
            if (dropdown.classList.contains('hidden') && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                renderDropdown(input.value);
                return;
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (items.length) { activeIndex = Math.min(activeIndex + 1, items.length - 1); highlightActive(); }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (items.length) { activeIndex = Math.max(activeIndex - 1, 0); highlightActive(); }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (items.length) {
                    var idx = activeIndex >= 0 ? activeIndex : 0;
                    var val = items[idx].dataset.value;
                    var opt = Array.prototype.filter.call(select.options, function (o) { return o.value === val; })[0];
                    if (opt) selectOption(opt);
                }
            } else if (e.key === 'Escape') {
                dropdown.classList.add('hidden');
                input.blur();
            }
        });

        // Kalau value select diubah dari kode lain (mis. reset form), teks input ikut sinkron
        select.addEventListener('change', function () {
            SearchableSelect._syncInputFromSelect(select);
        });

        this._syncInputFromSelect(select);
    },

    _syncInputFromSelect: function (select) {
        var wrapper = select.parentNode;
        if (!wrapper || !wrapper.classList || !wrapper.classList.contains('searchable-select-wrapper')) return;
        var input = wrapper.querySelector('input[type="text"]');
        if (!input) return;
        var opt = select.options[select.selectedIndex];
        input.value = (opt && opt.value) ? opt.textContent : '';
    },

    /**
     * Panggil ulang ini kalau opsi di dalam <select> diganti total via kode
     * (misal innerHTML select diisi ulang) supaya teks & dropdown ikut refresh.
     */
    refresh: function (selectId) {
        var select = document.getElementById(selectId);
        if (!select) return;
        this._syncInputFromSelect(select);
    }
};
