# Build Tailwind CSS (Production)

Sebelumnya aplikasi ini memuat Tailwind lewat CDN (`cdn.tailwindcss.com`), yang menurut
dokumentasi resmi Tailwind **tidak disarankan untuk produksi** (JIT compile di browser,
ukuran lebih besar, tidak boleh dipakai untuk custom plugin/preset, dsb).

Sekarang project sudah pakai Tailwind CLI + PostCSS. File `css/tailwind.css` yang sudah
ter-build dan siap pakai sudah disertakan, jadi aplikasi **langsung bisa jalan tanpa
langkah tambahan**. Ikuti langkah di bawah ini hanya kalau kamu mengubah class Tailwind
dan perlu build ulang.

## Struktur baru
- `tailwind.config.js` – konfigurasi tema (warna `primary` & `accent`, `darkMode: 'class'`) dan `content` path (`index.html` + semua `js/**/*.js`, karena semua modul generate HTML lewat template string).
- `postcss.config.js` – plugin `tailwindcss` + `autoprefixer`.
- `src/tailwind-input.css` – file sumber berisi `@tailwind base/components/utilities`.
- `css/tailwind.css` – **hasil build** (sudah di-minify), yang di-link di `index.html` menggantikan `<script src="https://cdn.tailwindcss.com">`.
- `package.json` – berisi script build.

## Cara build ulang setelah edit class Tailwind

```bash
npm install        # sekali saja, install tailwindcss/postcss/autoprefixer
npm run build:css  # build sekali, hasil ke css/tailwind.css (minified)
# atau selama development:
npm run watch:css  # auto rebuild tiap ada perubahan file
```

## Kenapa content path meng-cover semua file JS?
Karena hampir semua UI (modal, tabel, dashboard, dsb) dibuat lewat template string
JavaScript di folder `js/` (mis. `js/app.js`, `js/apotek/*.js`, `js/klinik/*.js`, dst),
bukan langsung di `index.html`. Kalau path ini tidak disertakan, Tailwind akan
membuang (purge) class yang sebenarnya dipakai dan tampilan jadi rusak.

## Catatan deploy
Setiap kali ada penambahan/perubahan class Tailwind di file JS atau HTML, jalankan
ulang `npm run build:css` sebelum deploy, lalu commit file `css/tailwind.css` yang baru
(atau jalankan build tersebut sebagai bagian dari CI/CD sebelum publish).
