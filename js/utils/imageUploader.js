/**
 * js/utils/imageUploader.js
 * Utilitas bersama: ambil foto (kamera HP / galeri) -> potong jadi persegi 1:1 ->
 * kompres ke ukuran file yang wajar -> hasil akhir base64 (data URL) siap disimpan
 * langsung ke Firestore (dipakai a.l. oleh Master Data Obat untuk foto produk).
 *
 * CATATAN PENTING SOAL PENDEKATAN:
 * - Disimpan sebagai base64 di field dokumen Firestore (POLA YANG SAMA seperti
 *   `logoStrukB64` di pengaturan/profil.js), BUKAN diupload ke Firebase Storage --
 *   karena app ini belum pakai Storage di manapun. Konsekuensinya: batasi ukuran
 *   file HABIS-HABISAN (target di bawah ~150-200 KB per gambar) supaya tidak
 *   mendekati batas 1 MB per dokumen Firestore & tidak bikin query 'obat' (yang
 *   di-load utuh ke memory oleh DataCache/POS) jadi berat kalau produk ada ratusan.
 * - <input capture="environment"> di HTML yang memanggil util ini akan membuka
 *   kamera BELAKANG secara langsung di HP Android/iPhone (browser modern), atau
 *   file picker biasa di desktop -- tidak perlu kode tambahan untuk itu.
 */
window.ImageUploader = {

    /**
     * @param {File} file - dari <input type="file">
     * @param {Object} opts
     *   maxDim     : sisi maksimum hasil akhir dalam pixel (default 640)
     *   maxSizeKB  : target ukuran file maksimum setelah kompres (default 180 KB)
     *   minQuality : kualitas JPEG minimum saat kompres iteratif (default 0.5)
     *   startQuality: kualitas JPEG awal sebelum diturunkan bertahap (default 0.85)
     * @returns Promise<{ base64, sizeKB, dim, quality }>
     */
    pickSquareBase64: function(file, opts) {
        opts = opts || {};
        var maxDim = opts.maxDim || 640;
        var maxSizeKB = opts.maxSizeKB || 180;
        var minQuality = opts.minQuality || 0.5;
        var startQuality = opts.startQuality || 0.85;

        return new Promise(function(resolve, reject) {
            if (!file) { reject(new Error('Tidak ada file dipilih.')); return; }
            if (!file.type || file.type.indexOf('image/') !== 0) {
                reject(new Error('File yang dipilih bukan gambar. Pilih foto (JPG/PNG).'));
                return;
            }
            // Batas wajar untuk file SUMBER (sebelum dikompres) -- di luar ini,
            // proses crop+encode di HP low-end bisa lag/nge-freeze cukup lama.
            if (file.size > 15 * 1024 * 1024) {
                reject(new Error('Ukuran foto asli terlalu besar (maks 15 MB sebelum diproses).'));
                return;
            }

            var reader = new FileReader();
            reader.onload = function(e) {
                var img = new Image();
                img.onload = function() {
                    try {
                        // 1) Potong tengah jadi persegi (1:1) -- sisi = sisi terpendek gambar asli
                        var side = Math.min(img.width, img.height);
                        var sx = (img.width - side) / 2;
                        var sy = (img.height - side) / 2;

                        // 2) Perkecil ke maxDim (jangan diperbesar kalau aslinya lebih kecil dari maxDim)
                        var outSide = Math.min(side, maxDim);

                        var canvas = document.createElement('canvas');
                        canvas.width = outSide;
                        canvas.height = outSide;
                        var ctx = canvas.getContext('2d');
                        // Latar putih dulu -- jaga-jaga kalau sumbernya PNG transparan,
                        // supaya tidak jadi hitam saat dikonversi ke JPEG (JPEG tidak
                        // mendukung transparansi).
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, outSide, outSide);
                        ctx.drawImage(img, sx, sy, side, side, 0, 0, outSide, outSide);

                        // 3) Kompres JPEG, turunkan kualitas bertahap sampai muat di
                        // target ukuran atau mentok di kualitas minimum.
                        var quality = startQuality;
                        var dataUrl = canvas.toDataURL('image/jpeg', quality);
                        var sizeKB = ImageUploader._estimateKB(dataUrl);

                        while (sizeKB > maxSizeKB && quality > minQuality) {
                            quality = Math.round((quality - 0.1) * 100) / 100;
                            dataUrl = canvas.toDataURL('image/jpeg', quality);
                            sizeKB = ImageUploader._estimateKB(dataUrl);
                        }

                        resolve({
                            base64: dataUrl,
                            sizeKB: sizeKB,
                            dim: outSide,
                            quality: Math.round(quality * 100)
                        });
                    } catch (err) {
                        reject(err);
                    }
                };
                img.onerror = function() {
                    reject(new Error('Gagal memuat gambar (format tidak didukung atau file rusak).'));
                };
                img.src = e.target.result;
            };
            reader.onerror = function() { reject(new Error('Gagal membaca file dari perangkat.')); };
            reader.readAsDataURL(file);
        });
    },

    // Estimasi ukuran byte dari string base64 (data URL): tiap 4 karakter base64
    // mewakili 3 byte data biner asli -> faktor ~0.75.
    _estimateKB: function(dataUrl) {
        var base64Part = dataUrl.substring(dataUrl.indexOf(',') + 1);
        return Math.round((base64Part.length * 0.75) / 1024);
    }
};
