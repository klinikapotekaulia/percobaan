/**
 * js/utils/thermalPrinter.js
 * Utilitas untuk mengkoneksikan dan mencetak struk secara langsung ke printer termal via browser (Web Bluetooth ESC/POS).
 */

window.ThermalPrinter = {
    device: null,
    characteristic: null,
    paperWidth: localStorage.getItem('thermal_printer_paper_width') || '58mm',
    isAutoPrint: localStorage.getItem('thermal_printer_auto') === 'true',
    printerName: localStorage.getItem('thermal_printer_name') || '',

    // ESC/POS Command Constants
    CMD: {
        INIT: new Uint8Array([0x1B, 0x40]),
        ALIGN_LEFT: new Uint8Array([0x1B, 0x61, 0x00]),
        ALIGN_CENTER: new Uint8Array([0x1B, 0x61, 0x01]),
        ALIGN_RIGHT: new Uint8Array([0x1B, 0x61, 0x02]),
        FONT_NORMAL: new Uint8Array([0x1B, 0x21, 0x00]),
        FONT_BOLD: new Uint8Array([0x1B, 0x21, 0x08]),
        FONT_LARGE: new Uint8Array([0x1B, 0x21, 0x30]),
        LINE_FEED: new Uint8Array([0x0A]),
        PAPER_CUT: new Uint8Array([0x1D, 0x56, 0x00]),
    },

    setPaperWidth: function(width) {
        this.paperWidth = width;
        localStorage.setItem('thermal_printer_paper_width', width);
    },

    setAutoPrint: function(auto) {
        this.isAutoPrint = auto;
        localStorage.setItem('thermal_printer_auto', auto ? 'true' : 'false');
    },

    isConnected: function() {
        return !!(this.device && this.device.gatt && this.device.gatt.connected && this.characteristic);
    },

    // Connect to Bluetooth printer
    connect: function() {
        var self = this;
        if (!navigator.bluetooth) {
            return Promise.reject(new Error('Browser Anda tidak mendukung Web Bluetooth. Silakan gunakan Chrome, Edge, atau browser modern lainnya.'));
        }

        return navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [
                '00001101-0000-1000-8000-00805f9b34fb', // SPP (Serial Port Profile)
                '0000ffe0-0000-1000-8000-00805f9b34fb', // Common BLE Serial ffe0
                '0000ffe1-0000-1000-8000-00805f9b34fb', // BLE Characteristic ffe1
                '000018f0-0000-1000-8000-00805f9b34fb'  // Generic printer service
            ]
        })
        .then(function(device) {
            self.device = device;
            self.printerName = device.name || 'Printer Thermal';
            localStorage.setItem('thermal_printer_name', self.printerName);
            
            device.addEventListener('gattserverdisconnected', function() {
                console.log('Printer terputus');
                self.characteristic = null;
                Utils.toast('Koneksi printer termal terputus', 'warning');
                if (typeof AppPengaturanProfil !== 'undefined' && AppPengaturanProfil.activeTab === 'printer_thermal') {
                    AppPengaturanProfil.renderActiveForm();
                }
            });

            return device.gatt.connect();
        })
        .then(function(server) {
            return server.getPrimaryServices();
        })
        .then(function(services) {
            var findCharacteristic = function(serviceIndex) {
                if (serviceIndex >= services.length) {
                    throw new Error('Tidak menemukan karakteristik tulis (write) pada printer ini.');
                }
                var s = services[serviceIndex];
                return s.getCharacteristics()
                    .then(function(characteristics) {
                        for (var i = 0; i < characteristics.length; i++) {
                            var char = characteristics[i];
                            if (char.properties.write || char.properties.writeWithoutResponse) {
                                self.characteristic = char;
                                return s;
                            }
                        }
                        return findCharacteristic(serviceIndex + 1);
                    });
            };

            return findCharacteristic(0);
        })
        .then(function() {
            Utils.toast('Berhasil terhubung ke ' + self.printerName, 'success');
            return true;
        })
        .catch(function(err) {
            console.error('Koneksi bluetooth gagal:', err);
            self.device = null;
            self.characteristic = null;
            throw err;
        });
    },

    disconnect: function() {
        if (this.device && this.device.gatt && this.device.gatt.connected) {
            this.device.gatt.disconnect();
        }
        this.device = null;
        this.characteristic = null;
        Utils.toast('Printer termal diputuskan', 'info');
    },

    // Send raw ESC/POS bytes to printer
    writeRaw: function(bytes) {
        var self = this;
        if (!this.isConnected()) {
            return Promise.reject(new Error('Printer tidak terhubung.'));
        }

        // Standard bluetooth MTU is around 20 bytes. Split data to chunks for safety.
        var chunkSize = 20;
        var writeChunks = function(offset) {
            if (offset >= bytes.length) {
                return Promise.resolve();
            }
            var chunk = bytes.slice(offset, offset + chunkSize);
            return self.characteristic.writeValue(chunk)
                .then(function() {
                    return writeChunks(offset + chunkSize);
                });
        };

        return writeChunks(0);
    },

    stringToBytes: function(str) {
        var encoder = new TextEncoder();
        return encoder.encode(str);
    },

    // ============================================================
    // FIX (LOGO STRUK TIDAK MUNCUL DI CETAK BLUETOOTH): sebelumnya function ini
    // hanya mengirim byte TEKS (INIT/ALIGN/FONT/newline) ke printer -- tidak ada
    // satupun perintah ESC/POS untuk gambar (mis. "GS v 0" / raster image), dan
    // `logoStrukB64` (logo yang diupload di Pengaturan > Struk) tidak pernah
    // dibaca di file ini sama sekali. Akibatnya logo SELALU muncul di jalur
    // "Cetak Biasa" (window.print(), karena itu HTML <img> biasa), tapi SELALU
    // HILANG di jalur "Cetak Bluetooth" (ESC/POS mentah). Fungsi di bawah ini
    // mengonversi logo (base64 PNG/JPG) menjadi bitmap 1-bit hitam-putih lalu
    // membungkusnya sebagai perintah raster image ESC/POS standar "GS v 0".
    // ============================================================
    imageToRasterBytes: function(base64DataUrl, targetWidthDots) {
        return new Promise(function(resolve, reject) {
            var img = new Image();
            img.onload = function() {
                try {
                    var w = img.width, h = img.height;
                    if (w > targetWidthDots) {
                        h = Math.max(1, Math.round(h * (targetWidthDots / w)));
                        w = targetWidthDots;
                    }
                    // Lebar bitmap ESC/POS wajib kelipatan 8 (1 byte horizontal = 8 dot)
                    w = w - (w % 8);
                    if (w <= 0) w = 8;

                    var canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    var ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, w, h);
                    ctx.drawImage(img, 0, 0, w, h);
                    var px = ctx.getImageData(0, 0, w, h).data;

                    var bytesPerRow = w / 8;
                    var raster = new Uint8Array(bytesPerRow * h);

                    for (var y = 0; y < h; y++) {
                        for (var xByte = 0; xByte < bytesPerRow; xByte++) {
                            var byte = 0;
                            for (var bit = 0; bit < 8; bit++) {
                                var x = xByte * 8 + bit;
                                var idx = (y * w + x) * 4;
                                var r = px[idx], g = px[idx + 1], b = px[idx + 2], a = px[idx + 3];
                                var lum = r * 0.299 + g * 0.587 + b * 0.114;
                                // Threshold sederhana: piksel gelap & tidak transparan -> dot dicetak.
                                // Bukan dithering (mis. Floyd-Steinberg) -- untuk logo garis/teks
                                // tegas ini cukup, tapi untuk foto/gradasi halus hasilnya akan
                                // terlihat kasar/patah-patah, sesuai keterbatasan resolusi printer termal.
                                if (a > 100 && lum < 180) byte |= (0x80 >> bit);
                            }
                            raster[y * bytesPerRow + xByte] = byte;
                        }
                    }

                    var xL = bytesPerRow & 0xFF, xH = (bytesPerRow >> 8) & 0xFF;
                    var yL = h & 0xFF, yH = (h >> 8) & 0xFF;
                    var header = new Uint8Array([0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH]);

                    var out = new Uint8Array(header.length + raster.length);
                    out.set(header, 0);
                    out.set(raster, header.length);
                    resolve(out);
                } catch (e) { reject(e); }
            };
            img.onerror = function() { reject(new Error('Gagal memuat gambar logo (format tidak didukung / rusak)')); };
            img.src = base64DataUrl;
        });
    },

    // Master print function
    printReceipt: function(data, settings) {
        var self = this;
        if (!this.isConnected()) {
            return Promise.reject(new Error('Hubungkan printer termal terlebih dahulu.'));
        }

        return this.generateReceiptBytes(data, settings)
            .then(function(bytes) {
                return self.writeRaw(bytes);
            })
            .then(function() {
                Utils.toast('Berhasil mencetak ke printer termal!', 'success');
            })
            .catch(function(err) {
                console.error('Cetak gagal:', err);
                Utils.toast('Gagal mencetak: ' + err.message, 'error');
            });
    },

    generateReceiptBytes: function(data, settings) {
        var self = this;
        var s = settings || {};
        var width = this.paperWidth;
        var lineLength = width === '58mm' ? 32 : 48;
        // Resolusi umum printer termal ESC/POS: ~8 dot/mm. 58mm kertas -> ±384 dot
        // area cetak; 80mm -> ±576 dot. Dipakai sebagai batas lebar logo.
        var dotsWidth = width === '58mm' ? 384 : 576;

        var bytesList = [];

        var addCmd = function(cmd) {
            bytesList.push(cmd);
        };
        var addText = function(text, align, isBold, isLarge) {
            addCmd(self.CMD.INIT);
            
            if (align === 'center') addCmd(self.CMD.ALIGN_CENTER);
            else if (align === 'right') addCmd(self.CMD.ALIGN_RIGHT);
            else addCmd(self.CMD.ALIGN_LEFT);

            if (isLarge) addCmd(self.CMD.FONT_LARGE);
            else if (isBold) addCmd(self.CMD.FONT_BOLD);
            else addCmd(self.CMD.FONT_NORMAL);

            bytesList.push(self.stringToBytes(text + '\n'));
        };

        var addDivider = function() {
            var char = '-';
            var line = char.repeat(lineLength);
            addText(line, 'center', false, false);
        };

        var addTwoColumns = function(left, right, isBold) {
            var spaces = lineLength - left.length - right.length;
            if (spaces < 1) {
                addText(left, 'left', isBold, false);
                spaces = lineLength - right.length;
                var spaceStr = ' '.repeat(spaces > 0 ? spaces : 1);
                addText(spaceStr + right, 'left', isBold, false);
            } else {
                var spaceStr = ' '.repeat(spaces);
                addText(left + spaceStr + right, 'left', isBold, false);
            }
        };

        // FIX (LOGO STRUK): cetak logo (kalau toggle "Tampilkan Logo" aktif & ada
        // file logo yang diupload) sebagai bitmap ESC/POS SEBELUM header teks --
        // urutan ini menyamai jalur "Cetak Biasa" (logo di paling atas struk).
        // `logoUkuran` adalah lebar CSS-px punya jalur HTML (default 100px @ ~96dpi);
        // dikonversi kasar ke dot printer (~203dpi) pakai faktor ~2x, lalu dibatasi
        // supaya tidak melebihi lebar kertas. ~2x adalah pendekatan, bukan hasil
        // pengukuran presisi -- kalau ukuran logo hasil cetak terasa kurang pas,
        // sesuaikan lewat field "Ukuran Logo" di Pengaturan > Struk.
        var tampilkanLogo = s.tampilkanLogo !== false;
        var logoPromise = Promise.resolve();
        if (tampilkanLogo && s.logoStrukB64) {
            var targetDots = Math.min(dotsWidth, Math.round((s.logoUkuran || 100) * 2));
            logoPromise = this.imageToRasterBytes(s.logoStrukB64, targetDots).then(function(imgBytes) {
                addCmd(self.CMD.INIT);
                var pos = s.logoPosisi || 'center';
                addCmd(pos === 'left' ? self.CMD.ALIGN_LEFT : (pos === 'right' ? self.CMD.ALIGN_RIGHT : self.CMD.ALIGN_CENTER));
                addCmd(imgBytes);
                bytesList.push(self.stringToBytes('\n'));
            }).catch(function(err) {
                // Kalau logo gagal dikonversi (mis. format tidak didukung), struk tetap
                // lanjut dicetak TANPA logo -- jangan sampai satu logo rusak membatalkan
                // seluruh transaksi yang sudah selesai dibayar.
                console.warn('[ThermalPrinter] Logo gagal dicetak, struk lanjut tanpa logo:', err.message);
                Utils.toast('Logo gagal dicetak ke printer termal (struk tetap dicetak)', 'warning');
            });
        }

        return logoPromise.then(function() {
            var namaInstansi = s.nama || 'Aulia Apotek Klinik';
            var header1 = s.strukHeader1 || namaInstansi;
            var header2 = s.strukHeader2 || '';
            var header3 = s.strukHeader3 || s.alamat || '';
            var header4 = s.strukHeader4 || (s.telp ? 'Telp: ' + s.telp : '');
            var headerSelesai = s.strukHeaderSelesai || '';

            addText(header1, 'center', true, true);
            if (header2) addText(header2, 'center', false, false);
            if (header3) addText(header3, 'center', false, false);
            if (header4) addText(header4, 'center', false, false);
            if (headerSelesai) addText(headerSelesai, 'center', false, false);

            addDivider();

            var tgl = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
            addText('No   : ' + data.id.substring(0, 8).toUpperCase(), 'left', false, false);
            addText('Tgl  : ' + tgl, 'left', false, false);
            if (s.showPasien !== false) {
                addText('Pasn : ' + (data.namaPasien || '-'), 'left', false, false);
            }
            if (s.showDokter !== false && (data.tipe === 'resep_klinik' || data.tipe === 'resep_luar')) {
                addText('Dokt : ' + (data.dokterLuar || 'Klinik'), 'left', false, false);
            }
            if (s.showMetodeBayar !== false) {
                addText('Bayar: ' + ((data.metodeBayar || 'CASH') + '').toUpperCase(), 'left', false, false);
            }

            addDivider();

            addText('Daftar Obat/Tindakan:', 'left', true, false);

            data.items.forEach(function(item) {
                addText(item.namaObat || '', 'left', false, false);
                var leftPart = ' ' + item.jumlah + ' x ' + Utils.formatRupiah(item.hargaJual);
                var rightPart = Utils.formatRupiah(item.jumlah * item.hargaJual);
                addTwoColumns(leftPart, rightPart, false);
            });

            if (data.tindakanItems && data.tindakanItems.length > 0) {
                data.tindakanItems.forEach(function(t) {
                    addTwoColumns(t.namaTindakan || '', Utils.formatRupiah(t.hargaJual), false);
                });
            }

            addDivider();

            addTwoColumns('Total Obat:', Utils.formatRupiah(data.totalObat), false);
            if (data.totalRacik > 0) {
                addTwoColumns('Total Racik:', Utils.formatRupiah(data.totalRacik), false);
            }
            if (data.totalTindakan > 0) {
                addTwoColumns('Total Tindakan:', Utils.formatRupiah(data.totalTindakan), false);
            }
            if (data.jasaResep > 0) {
                addTwoColumns('Jasa Resep:', Utils.formatRupiah(data.jasaResep), false);
            }
            if (data.pembulatan > 0) {
                addTwoColumns('Pembulatan:', Utils.formatRupiah(data.pembulatan), false);
            }
            addTwoColumns('TOTAL AKHIR:', Utils.formatRupiah(data.totalAkhir), true);

            addDivider();

            var footer1 = s.strukFooter1 || 'Terima Kasih';
            var footer2 = s.strukFooter2 || 'Semoga Lekas Sembuh';
            var footerRetur = s.footerStruk || '';

            addText(footer1, 'center', false, false);
            addText(footer2, 'center', false, false);
            if (footerRetur) {
                addText('* ' + footerRetur + ' *', 'center', false, false);
            }

            addCmd(self.CMD.LINE_FEED);
            addCmd(self.CMD.LINE_FEED);
            addCmd(self.CMD.LINE_FEED);
            addCmd(self.CMD.PAPER_CUT);

            var totalLength = 0;
            bytesList.forEach(function(arr) { totalLength += arr.length; });

            var merged = new Uint8Array(totalLength);
            var curOffset = 0;
            bytesList.forEach(function(arr) {
                merged.set(arr, curOffset);
                curOffset += arr.length;
            });

            return merged;
        });
    },

    printTestPage: function(settings) {
        var self = this;
        if (!this.isConnected()) {
            return Promise.reject(new Error('Printer tidak terhubung.'));
        }

        var s = settings || {};
        var testData = {
            id: 'TESTPRINTER123456',
            namaPasien: 'PASIEN TEST PRINTER',
            dokterLuar: 'dr. Test Koneksi',
            tipe: 'resep_klinik',
            metodeBayar: 'CASH',
            items: [
                { namaObat: 'Paracetamol 500mg Tab (Test)', jumlah: 2, hargaJual: 1500 },
                { namaObat: 'Amoxicillin 500mg (Test)', jumlah: 1, hargaJual: 3000 }
            ],
            totalObat: 6000,
            totalRacik: 0,
            totalTindakan: 0,
            jasaResep: 500,
            pembulatan: 0,
            totalAkhir: 6500
        };

        return this.printReceipt(testData, s);
    }
};
