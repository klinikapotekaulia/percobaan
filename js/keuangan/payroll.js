/**
 * js/keuangan/payroll.js
 * Proses Payroll (Gaji & Pembagian Hasil)
 * Logic akurat: Pecahan Jasa Resep, Jasa Resep Luar, Tuslah, Omzet, Uang Makan, Transport, Racik.
 *
 * SINKRONISASI LAPORAN & PENGGAJIAN BULAN SEBELUMNYA:
 * - Mendorong pemilihan Bulan Payroll (mis. Juli 2026) & Batas Cut-off Tanggal.
 * - Jika eksekusi penggajian dilakukan pada tanggal 1 atau 2 bulan berikutnya (mis. 2 Agustus 2026 untuk Gaji Juli),
 *   beban gaji & kas keluar tetap disinkronkan ke Bulan Laporan Keuangan terkait (Juli 2026).
 * - Menulis ke payrollHistory & kasKeluar secara otomatis sehingga Laporan Keuangan, Laba Rugi,
 *   Pengeluaran Kas, dan Jurnal Akuntansi tersinkronisasi 100%.
 * - Dilengkapi Tab Riwayat Pembayaran Payroll untuk melihat & mencetak slip gaji dari periode sebelumnya.
 */

window.AppKeuanganPayroll = {
    _unsubs: [],
    _dataUnsubs: [],
    dataKaryawan: [],
    dataTransaksi: [],
    dataAbsensi: [],
    configGaji: null,
    configPembagian: null,
    kalkulasiGaji: [],
    dataTHR: {}, // saldo tabungan THR { karyawanId: { saldo, updatedAt } }
    psaReal: null,

    // State Periode & Navigasi Tab
    activeTab: 'proses', // 'proses' | 'riwayat'
    selectedTargetBulan: null, // 'YYYY-MM'
    selectedCutoffDate: null,  // 'YYYY-MM-DD'
    periodeMap: {},
    defaultAwalBulan: null,
    periodeSampaiGlobal: null,

    // State Riwayat
    riwayatBulan: null,
    dataRiwayat: [],
    _pendingExec: null,

    _getLastDayOfMonth: function(yyyyMM) {
        if (!yyyyMM) return Utils.today();
        var parts = yyyyMM.split('-');
        var yr = parseInt(parts[0], 10);
        var mo = parseInt(parts[1], 10);
        var d = new Date(yr, mo, 0);
        return Utils.dateStr(d);
    },

    render: function() {
        var html = '<div class="page-enter max-w-7xl">';
        html += '  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">';
        html += '    <div>';
        html += '      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Payroll Karyawan</h2>';
        html += '      <p class="text-sm text-slate-500 dark:text-slate-400">Gaji &amp; pembagian hasil dihitung otomatis per karyawan, tersinkronisasi dengan laporan bulanan</p>';
        html += '    </div>';
        html += '    <div class="flex items-center gap-2">';
        html += '      <button onclick="AppKeuanganPayroll.init()" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700"><i data-lucide="refresh-cw" class="w-4 h-4"></i> Muat Ulang</button>';
        html += '    </div>';
        html += '  </div>';

        // Navigasi Tab
        html += '<div class="flex border-b border-slate-200 dark:border-slate-700 mb-6 gap-2 text-sm font-semibold">';
        html += '  <button onclick="AppKeuanganPayroll.switchTab(\'proses\')" id="tab-btn-proses" class="' + (this.activeTab === 'proses' ? 'border-b-2 border-primary-600 text-primary-600 dark:text-primary-400 pb-2.5 px-3 flex items-center gap-2' : 'text-slate-500 pb-2.5 px-3 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-2') + '"><i data-lucide="calculator" class="w-4 h-4"></i> Proses Payroll</button>';
        html += '  <button onclick="AppKeuanganPayroll.switchTab(\'riwayat\')" id="tab-btn-riwayat" class="' + (this.activeTab === 'riwayat' ? 'border-b-2 border-primary-600 text-primary-600 dark:text-primary-400 pb-2.5 px-3 flex items-center gap-2' : 'text-slate-500 pb-2.5 px-3 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-2') + '"><i data-lucide="history" class="w-4 h-4"></i> Riwayat &amp; Laporan Payroll</button>';
        html += '</div>';

        html += '  <div id="payroll-content"><div class="flex justify-center py-20"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    switchTab: function(tab) {
        this.activeTab = tab;
        var btnProses = document.getElementById('tab-btn-proses');
        var btnRiwayat = document.getElementById('tab-btn-riwayat');
        if (btnProses && btnRiwayat) {
            if (tab === 'proses') {
                btnProses.className = 'border-b-2 border-primary-600 text-primary-600 dark:text-primary-400 pb-2.5 px-3 flex items-center gap-2';
                btnRiwayat.className = 'text-slate-500 pb-2.5 px-3 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-2';
                this.renderTable();
            } else {
                btnRiwayat.className = 'border-b-2 border-primary-600 text-primary-600 dark:text-primary-400 pb-2.5 px-3 flex items-center gap-2';
                btnProses.className = 'text-slate-500 pb-2.5 px-3 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-2';
                this.loadRiwayat();
            }
        } else {
            this.init();
        }
    },

    destroy: function() {
        if (this._unsubs && this._unsubs.length) {
            this._unsubs.forEach(function(u) { try { u(); } catch(e){} });
        }
        this._unsubs = [];
        if (this._dataUnsubs && this._dataUnsubs.length) {
            this._dataUnsubs.forEach(function(u) { try { u(); } catch(e){} });
        }
        this._dataUnsubs = [];
        if (this._calcTimer) {
            clearTimeout(this._calcTimer);
            this._calcTimer = null;
        }
    },

    init: function() {
        var self = this;
        var role = window.currentRole || 'apotek';

        if (role !== 'keuangan' && role !== 'psa') {
            var el = document.getElementById('payroll-content');
            if (el) el.innerHTML = '<div class="bg-red-50 text-red-600 p-4 rounded-lg text-center font-semibold">Akses Ditolak. Halaman ini khusus Keuangan/PSA.</div>';
            return;
        }

        this.destroy();

        var container = document.getElementById('payroll-content');
        if (container && !document.getElementById('payroll-table-body')) {
            container.innerHTML = '<div class="flex justify-center py-20"><div class="spinner"></div></div>';
        }

        var today = Utils.today();
        var currentMonth = today.slice(0, 7);
        if (!this.selectedTargetBulan) {
            this.selectedTargetBulan = currentMonth;
        }
        if (!this.selectedCutoffDate) {
            this.selectedCutoffDate = (this.selectedTargetBulan === currentMonth) ? today : this._getLastDayOfMonth(this.selectedTargetBulan);
        }
        if (!this.riwayatBulan) {
            this.riwayatBulan = this.selectedTargetBulan;
        }

        var defaultAwal = this.selectedTargetBulan + '-01';
        self.defaultAwalBulan = defaultAwal;
        self.periodeSampaiGlobal = this.selectedCutoffDate;

        var scheduleCalculate = function() {
            if (self._calcTimer) clearTimeout(self._calcTimer);
            self._calcTimer = setTimeout(function() {
                if (self.activeTab === 'proses') {
                    self.hitungPayroll();
                } else {
                    self.loadRiwayat();
                }
            }, 120);
        };

        // Realtime Listener 1: payrollPeriode
        var uPeriode = db.collection('payrollPeriode').onSnapshot(function(periodeSnap) {
            self.periodeMap = {};
            var earliestMulai = defaultAwal;
            periodeSnap.forEach(function(doc) {
                var d = doc.data();
                var mulai = d.mulai || defaultAwal;
                self.periodeMap[doc.id] = {
                    mulai: mulai,
                    terakhirDibayar: d.terakhirDibayar || null,
                    terakhirDibayarOleh: d.terakhirDibayarOleh || '-',
                    terakhirJumlah: d.terakhirJumlah || 0
                };
                if (mulai < earliestMulai) earliestMulai = mulai;
            });

            if (self._earliestMulai !== earliestMulai) {
                self._earliestMulai = earliestMulai;
                self._setupDataListeners(earliestMulai, scheduleCalculate);
            } else {
                scheduleCalculate();
            }
        }, function(err) {
            console.error('Error listening to payrollPeriode:', err);
        });
        this._unsubs.push(uPeriode);

        // Realtime Listener 2: Karyawan Aktif
        var uKary = db.collection('karyawan').where('status', '==', 'aktif').onSnapshot(function(snap) {
            self.dataKaryawan = [];
            snap.forEach(function(doc) {
                var d = doc.data();
                d.id = doc.id;
                self.dataKaryawan.push(d);
            });
            scheduleCalculate();
        }, function(err) {
            console.error('Error listening to karyawan:', err);
        });
        this._unsubs.push(uKary);

        // Realtime Listener 3: Pengaturan Gaji
        var uCfgGaji = db.collection('pengaturanGaji').doc('global').onSnapshot(function(doc) {
            self.configGaji = doc.exists ? doc.data() : { apotek: [], klinik: [] };
            scheduleCalculate();
        }, function(err) {
            console.error('Error listening to pengaturanGaji:', err);
        });
        this._unsubs.push(uCfgGaji);

        // Realtime Listener 4: Pengaturan Pembagian
        var uCfgBagi = db.collection('pengaturanPembagian').doc('global').onSnapshot(function(doc) {
            self.configPembagian = doc.exists ? doc.data() : {};
            scheduleCalculate();
        }, function(err) {
            console.error('Error listening to pengaturanPembagian:', err);
        });
        this._unsubs.push(uCfgBagi);

        // Realtime Listener 5: Tabungan THR
        var uTHR = db.collection('thrTabungan').onSnapshot(function(snap) {
            self.dataTHR = {};
            snap.forEach(function(doc) {
                self.dataTHR[doc.id] = doc.data();
            });
            scheduleCalculate();
        }, function(err) {
            console.error('Error listening to thrTabungan:', err);
        });
        this._unsubs.push(uTHR);
    },

    _setupDataListeners: function(earliestMulai, scheduleCalculate) {
        var self = this;
        if (this._dataUnsubs && this._dataUnsubs.length) {
            this._dataUnsubs.forEach(function(u) { try { u(); } catch(e){} });
        }
        this._dataUnsubs = [];

        // Realtime Listener 6: Transaksi (Penjualan / Resep / Tindakan)
        var uTrx = db.collection('transaksi').where('tanggal', '>=', earliestMulai).onSnapshot(function(snap) {
            self.dataTransaksi = [];
            snap.forEach(function(doc) {
                var d = doc.data();
                d.id = doc.id;
                self.dataTransaksi.push(d);
            });
            scheduleCalculate();
        }, function(err) {
            console.error('Error listening to transaksi:', err);
        });
        this._dataUnsubs.push(uTrx);

        // Realtime Listener 7: Absensi Karyawan
        var uAbsen = db.collection('absensi').where('tanggal', '>=', earliestMulai).onSnapshot(function(snap) {
            self.dataAbsensi = [];
            snap.forEach(function(doc) {
                self.dataAbsensi.push(doc.data());
            });
            scheduleCalculate();
        }, function(err) {
            console.error('Error listening to absensi:', err);
        });
        this._dataUnsubs.push(uAbsen);
    },

    setTargetBulan: function(yyyyMM) {
        if (!yyyyMM) return;
        this.selectedTargetBulan = yyyyMM;
        var today = Utils.today();
        var currentMonth = today.slice(0, 7);
        if (yyyyMM === currentMonth) {
            this.selectedCutoffDate = today;
        } else {
            this.selectedCutoffDate = this._getLastDayOfMonth(yyyyMM);
        }
        this.defaultAwalBulan = yyyyMM + '-01';
        this.periodeSampaiGlobal = this.selectedCutoffDate;
        this.hitungPayroll();
    },

    setCutoffDate: function(dateStr) {
        if (!dateStr) return;
        this.selectedCutoffDate = dateStr;
        this.periodeSampaiGlobal = dateStr;
        this.hitungPayroll();
    },

    hitungPayroll: function() {
        if (this.activeTab !== 'proses') return;
        try {
            this._hitungPayrollInner();
        } catch (err) {
            console.error(err);
            Utils.toast('Gagal menghitung payroll: ' + err.message, 'error');
            var container = document.getElementById('payroll-content');
            if (container) {
                container.innerHTML = '<div class="bg-red-50 text-red-600 p-4 rounded-lg text-center font-semibold">Gagal menghitung payroll: ' + Utils.escapeHtml(err.message) + '</div>';
            }
        }
    },

    _slotArr: function(section) {
        if (!section) return [];
        if (Array.isArray(section)) return section;
        return Array.isArray(section.slot) ? section.slot : [];
    },
    _persenTHR: function(section) {
        if (!section || Array.isArray(section)) return 0;
        return section.persenTHR || 0;
    },
    _fmtTgl: function(iso) {
        if (!iso) return '-';
        return new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    },

    _matchDokterId: function(rawId, rawName) {
        if (!rawId && !rawName) return null;

        if (this.dataKaryawan && this.dataKaryawan.length > 0) {
            for (var i = 0; i < this.dataKaryawan.length; i++) {
                var k = this.dataKaryawan[i];
                if (rawId && (k.id === rawId || k.userId === rawId)) {
                    return k.id;
                }
            }

            if (rawName) {
                var cleanName = rawName.toLowerCase()
                    .replace(/^(dr\.|dokter)\s*/i, '')
                    .replace(/\s+/g, ' ')
                    .trim();

                // Utamakan nama yang benar-benar sama agar dokter dengan nama mirip
                // tidak tertukar. Fallback ke kecocokan sebagian hanya jika hasilnya unik.
                var partialMatches = [];
                for (var j = 0; j < this.dataKaryawan.length; j++) {
                    var k2 = this.dataKaryawan[j];
                    var kCleanName = (k2.nama || '').toLowerCase()
                        .replace(/^(dr\.|dokter)\s*/i, '')
                        .replace(/\s+/g, ' ')
                        .trim();
                    if (!kCleanName || !cleanName) continue;
                    if (kCleanName === cleanName) return k2.id;
                    if (cleanName.indexOf(kCleanName) !== -1 || kCleanName.indexOf(cleanName) !== -1) {
                        partialMatches.push(k2);
                    }
                }
                if (partialMatches.length === 1) return partialMatches[0].id;
            }
        }

        return rawId || null;
    },

    _getSkemaDokter: function(karyawanId) {
        var self = this;
        var list = (this.configPembagian && Array.isArray(this.configPembagian.resepKlinik))
            ? this.configPembagian.resepKlinik
            : [];
        return list.find(function(dc) {
            var dokId = self._matchDokterId(dc.dokterId, dc.namaDokter);
            return dokId === karyawanId || dc.dokterId === karyawanId;
        }) || null;
    },

    _mulaiKaryawan: function(karyawanId) {
        var p = this.periodeMap[karyawanId];
        return (p && p.mulai) ? p.mulai : this.defaultAwalBulan;
    },

    _karyawanHadirTanggal: function(karyawan, tanggal) {
        if (!karyawan || !tanggal) return true;

        var isKlinik = (karyawan.departemen || '').toLowerCase() === 'klinik';
        if (!isKlinik) return true;

        return this.dataAbsensi.some(function(a) {
            var aDate = a.tanggal || a.tgl;
            if (aDate !== tanggal) return false;

            return (a.karyawanId && a.karyawanId === karyawan.id) ||
                (a.userId && (a.userId === karyawan.userId || a.userId === karyawan.id)) ||
                (a.namaKaryawan && a.namaKaryawan.toLowerCase().trim() === (karyawan.nama || '').toLowerCase().trim()) ||
                (a.nama && a.nama.toLowerCase().trim() === (karyawan.nama || '').toLowerCase().trim());
        });
    },

    // Rekap yang dipengaruhi absensi hanya untuk Pool Klinik dan Tuslah Klinik.
    // Komponen payroll lain tetap menggunakan rekap transaksi penuh.
    _hitungRekapKlinikHadir: function(mulaiTgl, sampaiTgl, karyawan) {
        var self = this;
        var cfg = this.configPembagian || {};
        var rekapDokter = {};
        var totalTuslahKlinik = 0;

        if (!karyawan || (karyawan.departemen || '').toLowerCase() !== 'klinik') {
            return { rekapDokter: rekapDokter, totalTuslahKlinik: totalTuslahKlinik };
        }

        this.dataTransaksi.forEach(function(t) {
            if (!t.tanggal || t.tanggal < mulaiTgl || t.tanggal > sampaiTgl) return;
            if (!self._karyawanHadirTanggal(karyawan, t.tanggal)) return;

            if (t.tipe === 'resep_klinik' && (t.dokterId || t.namaDokter)) {
                var dokId = self._matchDokterId(t.dokterId, t.namaDokter);
                if (dokId) {
                    if (!rekapDokter[dokId]) {
                        rekapDokter[dokId] = { jmlResepKlinik: 0, jasaResepLuar: 0, jmlResepLuar: 0 };
                    }
                    rekapDokter[dokId].jmlResepKlinik += 1;
                }
            }

            if (t.tindakanItems && t.tindakanItems.length > 0) {
                t.tindakanItems.forEach(function(tin) {
                    if (tin.kategori === 'klinik') {
                        totalTuslahKlinik += (tin.hargaJual || 0) - (tin.modal || 0);
                    }
                });
            }
        });

        return {
            rekapDokter: rekapDokter,
            totalTuslahKlinik: totalTuslahKlinik
        };
    },

    _hitungRekapPeriode: function(mulaiTgl, sampaiTgl, karyawan) {
        var self = this;
        sampaiTgl = sampaiTgl || self.periodeSampaiGlobal || Utils.today();
        var cfg = this.configPembagian || {};
        var nilaiRacikConfig = (cfg.racikObat) ? (cfg.racikObat.nilai || 0) : 0;

        var rekapDokter = {};
        var totalLabaObat = 0, totalPembulatan = 0, totalTuslahKlinik = 0, totalTuslahApotek = 0, totalNilaiRacik = 0, jmlResepLuar = 0;

        this.dataTransaksi.forEach(function(t) {
            if (!t.tanggal || t.tanggal < mulaiTgl || t.tanggal > sampaiTgl) return;

            var omzetObat = t.items ? t.items.reduce(function(s, i) { return s + ((i.jumlah || 0) * (i.hargaJual || 0)); }, 0) : 0;
            var hppObat = t.items ? t.items.reduce(function(s, i) { return s + ((i.jumlah || 0) * (i.hargaBeli || 0)); }, 0) : 0;
            totalLabaObat += (omzetObat - hppObat);
            totalPembulatan += (t.pembulatan || 0);

            if (t.racikanItems && t.racikanItems.length > 0) {
                totalNilaiRacik += (t.racikanItems.length * nilaiRacikConfig);
            }

            if (t.tipe === 'resep_klinik' && (t.dokterId || t.namaDokter)) {
                var dokId = self._matchDokterId(t.dokterId, t.namaDokter);
                if (dokId) {
                    if (!rekapDokter[dokId]) rekapDokter[dokId] = { jmlResepKlinik: 0, jasaResepLuar: 0, jmlResepLuar: 0 };
                    rekapDokter[dokId].jmlResepKlinik += 1;
                }
            } else if (t.tipe === 'resep_luar' && (t.dokterId || t.dokterLuar || t.namaDokter)) {
                var dokIdL = self._matchDokterId(t.dokterId, t.dokterLuar || t.namaDokter);
                if (dokIdL) {
                    if (!rekapDokter[dokIdL]) rekapDokter[dokIdL] = { jmlResepKlinik: 0, jasaResepLuar: 0, jmlResepLuar: 0 };
                    rekapDokter[dokIdL].jasaResepLuar += (t.jasaResep || 0);
                    rekapDokter[dokIdL].jmlResepLuar += 1;
                }
            }
            if (t.tipe === 'resep_luar') jmlResepLuar++;

            if (t.tindakanItems && t.tindakanItems.length > 0) {
                t.tindakanItems.forEach(function(tin) {
                    var labaTindakan = (tin.hargaJual || 0) - (tin.modal || 0);
                    if (tin.kategori === 'klinik') totalTuslahKlinik += labaTindakan;
                    else if (tin.kategori === 'apotek') totalTuslahApotek += labaTindakan;
                });
            }
        });

        return {
            rekapDokter: rekapDokter, totalLabaObat: totalLabaObat, totalPembulatan: totalPembulatan,
            totalTuslahKlinik: totalTuslahKlinik, totalTuslahApotek: totalTuslahApotek,
            totalNilaiRacik: totalNilaiRacik, jmlResepLuar: jmlResepLuar
        };
    },

    _hitungPSAdariRekap: function(rekap, cfg) {
        var self = this;
        var sumPersenSlots = function(slots) {
            var t = 0;
            (slots || []).forEach(function(s) { t += (s.persen || 0); });
            return t;
        };

        var psaResepKlinik = 0;
        if (cfg.resepKlinik && Array.isArray(cfg.resepKlinik)) {
            cfg.resepKlinik.forEach(function(dc) {
                var dokId = self._matchDokterId(dc.dokterId, dc.namaDokter);
                var r = dokId ? rekap.rekapDokter[dokId] : rekap.rekapDokter[dc.dokterId];
                var jml = r ? r.jmlResepKlinik : 0;
                var sisaPerResep = (dc.nilaiResep || 0) - (dc.jm || 0) - (dc.jd || 0) - (dc.poolKaryKlinik || 0) - (dc.poolKaryApotek || 0);
                psaResepKlinik += sisaPerResep * jml;
            });
        }
        var sisaResepLuarPerUnit = cfg.resepLuar ? ((cfg.resepLuar.nilaiResep || 0) - (cfg.resepLuar.potonganDokter || 0)) : 0;
        var psaResepLuar = sisaResepLuarPerUnit * rekap.jmlResepLuar;

        var psaTindakanKlinik = rekap.totalTuslahKlinik * (100 - sumPersenSlots(self._slotArr(cfg.tindakanKlinik))) / 100;
        var psaTindakanApotek = rekap.totalTuslahApotek * (100 - sumPersenSlots(self._slotArr(cfg.tindakanApotek))) / 100;

        var poolOmzetTotal = cfg.tunjanganOmzet ? (rekap.totalLabaObat * (cfg.tunjanganOmzet.persen || 0)) / 100 : 0;
        var sisaPoolOmzet = poolOmzetTotal * (100 - sumPersenSlots(self._slotArr(cfg.tunjanganOmzet))) / 100;
        var psaOmzet = (rekap.totalLabaObat - poolOmzetTotal) + sisaPoolOmzet;

        var psaUM = rekap.totalPembulatan * (100 - sumPersenSlots(self._slotArr(cfg.uangMakan))) / 100;
        var psaRacik = rekap.totalNilaiRacik * (100 - sumPersenSlots(self._slotArr(cfg.racikObat))) / 100;

        return {
            resepKlinik: psaResepKlinik, resepLuar: psaResepLuar,
            tindakanKlinik: psaTindakanKlinik, tindakanApotek: psaTindakanApotek,
            omzet: psaOmzet, uangMakan: psaUM, racikObat: psaRacik,
            total: psaResepKlinik + psaResepLuar + psaTindakanKlinik + psaTindakanApotek + psaOmzet + psaUM + psaRacik
        };
    },

    _hitungPayrollInner: function() {
        var self = this;
        var existingManualInputs = {};
        if (this.kalkulasiGaji && this.kalkulasiGaji.length > 0) {
            this.kalkulasiGaji.forEach(function(item, idx) {
                var tunjEl = document.getElementById('tunjangan-' + idx);
                var kasbEl = document.getElementById('kasbon-' + idx);
                var wisEl = document.getElementById('wisata-' + idx);
                existingManualInputs[item.karyawanId] = {
                    tunjanganLain: tunjEl ? (parseFloat(tunjEl.value) || 0) : (item.tunjanganLain || 0),
                    potKasbon: kasbEl ? (parseFloat(kasbEl.value) || 0) : (item.potKasbon || 0),
                    potWisata: wisEl ? (parseFloat(wisEl.value) || 0) : (item.potWisata || 0)
                };
            });
        }

        this.kalkulasiGaji = [];
        var cfg = this.configPembagian || {};

        var rekapBulanIni = this._hitungRekapPeriode(this.defaultAwalBulan, this.periodeSampaiGlobal);
        this.psaReal = this._hitungPSAdariRekap(rekapBulanIni, cfg);

        this.dataKaryawan.forEach(function(k) {
            var mulaiK = self._mulaiKaryawan(k.id);
            var rekap = self._hitungRekapPeriode(mulaiK, self.periodeSampaiGlobal, k);
            var rekapAbsensiKlinik = self._hitungRekapKlinikHadir(mulaiK, self.periodeSampaiGlobal, k);
            var rekapDokter = rekap.rekapDokter;
            var depKey = (k.departemen || '').toLowerCase();

            // Gaji Pokok
            var gajiPokok = 0;
            var cfgGajiDep = self.configGaji[depKey] || [];
            var gajiCfg = cfgGajiDep.find(function(g) { return g.karyawanId === k.id; });
            if (gajiCfg) gajiPokok = gajiCfg.gajiPokok || 0;

            // Hari Kerja (hanya dalam window periode karyawan ybs.)
            var hadirDates = {};
            self.dataAbsensi.forEach(function(a) {
                var aDate = a.tanggal || a.tgl;
                var matchesUser = (a.userId && (a.userId === k.userId || a.userId === k.id)) ||
                                  (a.karyawanId && a.karyawanId === k.id) ||
                                  (a.namaKaryawan && a.namaKaryawan.toLowerCase().trim() === (k.nama || '').toLowerCase().trim()) ||
                                  (a.nama && a.nama.toLowerCase().trim() === (k.nama || '').toLowerCase().trim());
                if (matchesUser && aDate >= mulaiK && aDate <= self.periodeSampaiGlobal) {
                    hadirDates[aDate] = true;
                }
            });
            var hadir = Object.keys(hadirDates).length;

            // Bagian dokter harus bersumber dari SATU skema dokter di Pembagian Hasil.
            // JM/JD mengikuti tarif pada skema dokter tersebut.
            // Jasa Resep Luar mengikuti "Potongan Dokter" pada Pembagian Hasil,
            // bukan nilai jasa yang tersimpan di transaksi.
            var jasaMedis = 0, jasaDokter = 0, jasaResepLuar = 0;
            var skemaDokter = depKey === 'dokter' ? self._getSkemaDokter(k.id) : null;
            if (depKey === 'dokter' && skemaDokter) {
                var rekapDokterK = rekapDokter[k.id] || { jmlResepKlinik: 0, jasaResepLuar: 0, jmlResepLuar: 0 };
                jasaMedis = (skemaDokter.jm || 0) * (rekapDokterK.jmlResepKlinik || 0);
                jasaDokter = (skemaDokter.jd || 0) * (rekapDokterK.jmlResepKlinik || 0);
                var potonganDokter = cfg.resepLuar ? (cfg.resepLuar.potonganDokter || 0) : 0;
                jasaResepLuar = potonganDokter * (rekapDokterK.jmlResepLuar || 0);
            } else if (rekapDokter[k.id]) {
                // Dipertahankan untuk kompatibilitas data lama non-dokter.
                jasaResepLuar = rekapDokter[k.id].jasaResepLuar || 0;
            }

            // Bagian Pool Resep (Klinik & Apotek)
            var bagPoolKlinik = 0, bagPoolApotek = 0, thrPoolKlinik = 0, thrPoolApotek = 0;
            if (cfg.resepKlinik && Array.isArray(cfg.resepKlinik)) {
                cfg.resepKlinik.forEach(function(dc) {
                    var dokId = self._matchDokterId(dc.dokterId, dc.namaDokter);
                    var rPoolKlinik = dokId ? rekapAbsensiKlinik.rekapDokter[dokId] : rekapAbsensiKlinik.rekapDokter[dc.dokterId];
                    var rPoolApotek = dokId ? rekapDokter[dokId] : rekapDokter[dc.dokterId];
                    var jmlResepKlinik = rPoolKlinik ? rPoolKlinik.jmlResepKlinik : 0;
                    var jmlResepApotek = rPoolApotek ? rPoolApotek.jmlResepKlinik : 0;
                    if (jmlResepKlinik > 0 || jmlResepApotek > 0) {
                        var slotsKli = dc.slotKaryKlinik || dc.poolKlinik || [];
                        // Pool Klinik hanya untuk karyawan departemen Klinik.
                        // Dokter tidak boleh ikut meskipun ID-nya masih tersimpan di slot lama.
                        var slotKli = (depKey === 'klinik') ? slotsKli.find(function(s) { return s.karyawanId === k.id; }) : null;
                        if (slotKli) {
                            var totalPoolK = (dc.poolKaryKlinik || 0) * jmlResepKlinik;
                            var hasilThrK = totalPoolK * ((dc.thrPersenKlinik || 0) / 100);
                            var sisaCashK = totalPoolK - hasilThrK;
                            if ((slotKli.persen || 0) > 0) {
                                bagPoolKlinik += sisaCashK * (slotKli.persen / 100);
                                if (slotKli.isTHR) thrPoolKlinik += hasilThrK * (slotKli.persen / 100);
                            } else if (slotKli.nominal) {
                                bagPoolKlinik += (slotKli.nominal || 0) * jmlResepKlinik;
                            }
                        }

                        var slotsApo = dc.slotKaryApotek || dc.poolApotek || [];
                        // Pool Apotek hanya untuk karyawan departemen Apotek.
                        // Dokter tidak boleh menerima pool karyawan meskipun ID-nya
                        // masih tersimpan pada konfigurasi lama.
                        var slotApo = (depKey === 'apotek') ? slotsApo.find(function(s) { return s.karyawanId === k.id; }) : null;
                        if (slotApo) {
                            var totalPoolA = (dc.poolKaryApotek || 0) * jmlResepApotek;
                            var hasilThrA = totalPoolA * ((dc.thrPersenApotek || 0) / 100);
                            var sisaCashA = totalPoolA - hasilThrA;
                            if ((slotApo.persen || 0) > 0) {
                                bagPoolApotek += sisaCashA * (slotApo.persen / 100);
                                if (slotApo.isTHR) thrPoolApotek += hasilThrA * (slotApo.persen / 100);
                            } else if (slotApo.nominal) {
                                bagPoolApotek += (slotApo.nominal || 0) * jmlResepApotek;
                            }
                        }
                    }
                });
            }

            // Bagian Tuslah/Tindakan
            var bagTuslah = 0, thrTuslah = 0;
            var slotsTindakanKlinik = self._slotArr(cfg.tindakanKlinik);
            var thrPctKlinik        = self._persenTHR(cfg.tindakanKlinik);
            // Tuslah Klinik dapat diterima karyawan Klinik dan Dokter.
            // Untuk Klinik, hanya hari hadir yang dihitung. Dokter tidak memakai
            // skema absensi Klinik sehingga memakai rekap transaksi penuh.
            var slotTK = (depKey === 'klinik' || depKey === 'dokter') ? slotsTindakanKlinik.find(function(s) { return s.karyawanId === k.id; }) : null;
            var rekapTuslahTK = depKey === 'klinik' ? rekapAbsensiKlinik : rekap;
            if (slotTK && (slotTK.persen || 0) > 0 && rekapTuslahTK.totalTuslahKlinik > 0) {
                var hasilThrTK = rekapTuslahTK.totalTuslahKlinik * (thrPctKlinik / 100);
                var sisaCashTK = rekapTuslahTK.totalTuslahKlinik - hasilThrTK;
                bagTuslah += (sisaCashTK * (slotTK.persen || 0)) / 100;
                if (slotTK.isTHR) thrTuslah += (hasilThrTK * (slotTK.persen || 0)) / 100;
            }

            var slotsTindakanApotek = self._slotArr(cfg.tindakanApotek);
            var thrPctApotek        = self._persenTHR(cfg.tindakanApotek);
            var slotTA = slotsTindakanApotek.find(function(s) { return s.karyawanId === k.id; });
            if (slotTA && (slotTA.persen || 0) > 0 && rekap.totalTuslahApotek > 0) {
                var hasilThrTA = rekap.totalTuslahApotek * (thrPctApotek / 100);
                var sisaCashTA = rekap.totalTuslahApotek - hasilThrTA;
                bagTuslah += (sisaCashTA * (slotTA.persen || 0)) / 100;
                if (slotTA.isTHR) thrTuslah += (hasilThrTA * (slotTA.persen || 0)) / 100;
            }

            // Tunjangan Omzet
            var bagOmzet = 0, thrOmzet = 0;
            if (cfg.tunjanganOmzet && (cfg.tunjanganOmzet.persen || 0) > 0) {
                var poolOmzetTotal = (rekap.totalLabaObat * (cfg.tunjanganOmzet.persen || 0)) / 100;
                var slotsOmzet = self._slotArr(cfg.tunjanganOmzet);
                var thrPctOmz = self._persenTHR(cfg.tunjanganOmzet);
                var slotOmz = slotsOmzet.find(function(s) { return s.karyawanId === k.id; });
                if (slotOmz && (slotOmz.persen || 0) > 0 && poolOmzetTotal > 0) {
                    var hasilThrOmz = poolOmzetTotal * (thrPctOmz / 100);
                    var sisaCashOmz = poolOmzetTotal - hasilThrOmz;
                    bagOmzet = (sisaCashOmz * (slotOmz.persen || 0)) / 100;
                    if (slotOmz.isTHR) thrOmzet += (hasilThrOmz * (slotOmz.persen || 0)) / 100;
                }
            }

            // Uang Makan
            var bagUM = 0, thrUM = 0;
            if (cfg.uangMakan) {
                var slotsUM = self._slotArr(cfg.uangMakan);
                var thrPctUM = self._persenTHR(cfg.uangMakan);
                var slotUM = slotsUM.find(function(s) { return s.karyawanId === k.id; });
                if (slotUM && (slotUM.persen || 0) > 0 && rekap.totalPembulatan > 0) {
                    var hasilThrUM = rekap.totalPembulatan * (thrPctUM / 100);
                    var sisaCashUM = rekap.totalPembulatan - hasilThrUM;
                    bagUM = (sisaCashUM * (slotUM.persen || 0)) / 100;
                    if (slotUM.isTHR) thrUM += (hasilThrUM * (slotUM.persen || 0)) / 100;
                }
            }

            // Transport
            var bagTransport = 0;
            if (cfg.transport && Array.isArray(cfg.transport)) {
                var tr = cfg.transport.find(function(t) { return t.karyawanId === k.id; });
                if (tr) bagTransport = tr.nominalPerHari || 0;
            } else if (cfg.transport) {
                var slotsTr = self._slotArr(cfg.transport);
                var slotTr = slotsTr.find(function(s) { return s.karyawanId === k.id; });
                if (slotTr && (slotTr.persen || 0) > 0 && (cfg.transport.total || 0) > 0) {
                    bagTransport = ((cfg.transport.total || 0) * (slotTr.persen || 0)) / 100;
                }
            }

            // Racik Obat
            var bagRacik = 0, thrRacik = 0;
            if (cfg.racikObat) {
                var slotsRacik = self._slotArr(cfg.racikObat);
                var thrPctRacik = self._persenTHR(cfg.racikObat);
                var slotRacik = slotsRacik.find(function(s) { return s.karyawanId === k.id; });
                if (slotRacik && (slotRacik.persen || 0) > 0 && rekap.totalNilaiRacik > 0) {
                    var hasilThrRacik = rekap.totalNilaiRacik * (thrPctRacik / 100);
                    var sisaCashRacik = rekap.totalNilaiRacik - hasilThrRacik;
                    bagRacik = (sisaCashRacik * (slotRacik.persen || 0)) / 100;
                    if (slotRacik.isTHR) thrRacik += (hasilThrRacik * (slotRacik.persen || 0)) / 100;
                }
            }

            var totalPendapatan = gajiPokok + jasaMedis + jasaDokter + jasaResepLuar + bagPoolKlinik + bagPoolApotek + bagTuslah + bagOmzet + bagUM + bagTransport + bagRacik;

            var thrBulanIni = thrPoolKlinik + thrPoolApotek + thrTuslah + thrOmzet + thrUM + thrRacik;
            var thrTersimpan = self.dataTHR[k.id] || {};
            var thrSaldoSebelum = thrTersimpan.saldo || 0;

            var mInput = existingManualInputs[k.id] || { tunjanganLain: 0, potKasbon: 0, potWisata: 0 };
            var tunjanganLain = mInput.tunjanganLain;
            var potKasbon = mInput.potKasbon;
            var potWisata = mInput.potWisata;
            var grossPayroll = totalPendapatan + tunjanganLain;
            var totalPotongan = potKasbon + potWisata;
            var totalGaji = grossPayroll - totalPotongan;

            self.kalkulasiGaji.push({
                karyawanId: k.id, nama: k.nama, departemen: k.departemen, jabatan: k.jabatan,
                periodeMulai: mulaiK, periodeSampai: self.periodeSampaiGlobal,
                hariKerja: hadir, gajiPokok: gajiPokok,
                jasaMedis: jasaMedis, jasaDokter: jasaDokter, jasaResepLuar: jasaResepLuar,
                bagPoolKlinik: bagPoolKlinik, bagPoolApotek: bagPoolApotek, bagTuslah: bagTuslah,
                bagOmzet: bagOmzet, bagUM: bagUM, bagTransport: bagTransport, bagRacik: bagRacik,
                thrBulanIni: thrBulanIni, thrSaldoSebelum: thrSaldoSebelum,
                thrSaldoProyeksi: thrSaldoSebelum + thrBulanIni, thrSudahDibayarkan: false,
                tunjanganLain: tunjanganLain, potKasbon: potKasbon, potWisata: potWisata,
                totalPendapatan: totalPendapatan, grossPayroll: grossPayroll,
                totalPotongan: totalPotongan, netPay: totalGaji, totalGaji: totalGaji
            });
        });

        self.renderTable();
    },

    renderTable: function() {
        var container = document.getElementById('payroll-content');
        if (!container) return;
        var html = '';

        var todayStr = Utils.today();
        var prevMonth = (function() {
            var parts = todayStr.split('-');
            var y = parseInt(parts[0], 10);
            var m = parseInt(parts[1], 10) - 1;
            if (m === 0) { m = 12; y--; }
            return y + '-' + (m < 10 ? '0' + m : m);
        })();
        var currMonth = todayStr.slice(0, 7);

        // Card Filter Periode & Bulan Payroll
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-4 shadow-sm space-y-3">';
        html += '  <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">';
        html += '    <div>';
        html += '      <h3 class="font-bold text-slate-800 dark:text-white flex items-center gap-2"><i data-lucide="calendar" class="w-5 h-5 text-primary-600"></i> Target Periode &amp; Cut-Off Payroll</h3>';
        html += '      <p class="text-xs text-slate-500 dark:text-slate-400">Pilih bulan laporan &amp; tanggal cut-off. Jika penggajian dilakukan tgl 1 atau 2 bulan berikutnya, beban tetap disinkronkan ke bulan laporan terkait.</p>';
        html += '    </div>';
        html += '    <div class="flex flex-wrap items-center gap-2 text-xs">';
        html += '      <button onclick="AppKeuanganPayroll.setTargetBulan(\'' + prevMonth + '\')" class="px-3 py-1.5 rounded-lg border font-medium ' + (this.selectedTargetBulan === prevMonth ? 'bg-primary-50 border-primary-300 text-primary-700 font-bold dark:bg-primary-900/30 dark:text-primary-300' : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 hover:bg-slate-100') + '">📅 Bulan Lalu (' + prevMonth + ')</button>';
        html += '      <button onclick="AppKeuanganPayroll.setTargetBulan(\'' + currMonth + '\')" class="px-3 py-1.5 rounded-lg border font-medium ' + (this.selectedTargetBulan === currMonth ? 'bg-primary-50 border-primary-300 text-primary-700 font-bold dark:bg-primary-900/30 dark:text-primary-300' : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 hover:bg-slate-100') + '">📅 Bulan Ini (' + currMonth + ')</button>';
        html += '    </div>';
        html += '  </div>';

        html += '  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">';
        html += '    <div>';
        html += '      <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Bulan Laporan Keuangan:</label>';
        html += '      <input type="month" value="' + this.selectedTargetBulan + '" onchange="AppKeuanganPayroll.setTargetBulan(this.value)" class="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white font-medium">';
        html += '    </div>';
        html += '    <div>';
        html += '      <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Batas Tanggal Cut-Off Perhitungan:</label>';
        html += '      <input type="date" value="' + this.selectedCutoffDate + '" onchange="AppKeuanganPayroll.setCutoffDate(this.value)" class="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white font-medium">';
        html += '    </div>';
        html += '    <div class="sm:col-span-2 md:col-span-1 flex items-center bg-primary-50/70 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-2.5 text-primary-800 dark:text-primary-300">';
        html += '      <i data-lucide="info" class="w-5 h-5 mr-2 shrink-0 text-primary-600"></i>';
        html += '      <span>Akumulasi dihitung s/d <b>' + this._fmtTgl(this.selectedCutoffDate) + '</b>. Hasil akan dicatat pada laporan bulan <b>' + this.selectedTargetBulan + '</b>.</span>';
        html += '    </div>';
        html += '  </div>';
        html += '</div>';

        // Kartu Ringkasan Sisa Pembagian PSA Riil
        var psa = this.psaReal || {};
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4 shadow-sm">';
        html += '  <h3 class="font-bold text-gray-800 dark:text-white mb-1 flex items-center gap-2"><i data-lucide="landmark" class="w-5 h-5 text-slate-500"></i> Sisa Pembagian PSA Riil Periode ' + this.selectedTargetBulan + '</h3>';
        html += '  <p class="text-xs text-slate-400 mb-4">Angka informasi pembagian hasil periode terpilih s/d cut-off (' + this._fmtTgl(this.selectedCutoffDate) + ').</p>';
        html += '  <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">';
        html += '    <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><span class="text-xs text-blue-600">Resep Klinik</span><p class="font-bold text-blue-800 dark:text-blue-300">' + Utils.formatRupiah(psa.resepKlinik) + '</p></div>';
        html += '    <div class="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"><span class="text-xs text-green-600">Resep Luar</span><p class="font-bold text-green-800 dark:text-green-300">' + Utils.formatRupiah(psa.resepLuar) + '</p></div>';
        html += '    <div class="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg"><span class="text-xs text-purple-600">Tindakan Klinik</span><p class="font-bold text-purple-800 dark:text-purple-300">' + Utils.formatRupiah(psa.tindakanKlinik) + '</p></div>';
        html += '    <div class="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg"><span class="text-xs text-teal-600">Tindakan Apotek</span><p class="font-bold text-teal-800 dark:text-teal-300">' + Utils.formatRupiah(psa.tindakanApotek) + '</p></div>';
        html += '    <div class="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg"><span class="text-xs text-emerald-600">Tunjangan Omzet</span><p class="font-bold text-emerald-800 dark:text-emerald-300">' + Utils.formatRupiah(psa.omzet) + '</p></div>';
        html += '    <div class="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg"><span class="text-xs text-orange-600">Uang Makan</span><p class="font-bold text-orange-800 dark:text-orange-300">' + Utils.formatRupiah(psa.uangMakan) + '</p></div>';
        html += '    <div class="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg"><span class="text-xs text-indigo-600">Racik Obat</span><p class="font-bold text-indigo-800 dark:text-indigo-300">' + Utils.formatRupiah(psa.racikObat) + '</p></div>';
        html += '    <div class="p-3 bg-slate-800 dark:bg-slate-900 rounded-lg"><span class="text-xs text-slate-300">TOTAL PSA</span><p class="font-bold text-white">' + Utils.formatRupiah(psa.total) + '</p></div>';
        html += '  </div>';
        html += '</div>';

        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">';
        html += '<div class="overflow-x-auto">';
        html += '<table class="w-full text-xs whitespace-nowrap">';
        html += '<thead><tr class="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase">';
        html += '<th class="px-3 py-3 text-left sticky left-0 z-10 bg-slate-50 dark:bg-slate-900">Karyawan</th>';
        html += '<th class="px-2 py-3 text-left">Periode</th>';
        html += '<th class="px-2 py-3 text-center">Hadir</th>';
        html += '<th class="px-2 py-3 text-right">Gaji Pokok</th>';
        html += '<th class="px-2 py-3 text-right">JM</th>';
        html += '<th class="px-2 py-3 text-right">JD</th>';
        html += '<th class="px-2 py-3 text-right">Jasa Resep Luar</th>';
        html += '<th class="px-2 py-3 text-right">Pool Klinik</th>';
        html += '<th class="px-2 py-3 text-right">Pool Apotek</th>';
        html += '<th class="px-2 py-3 text-right">Tuslah</th>';
        html += '<th class="px-2 py-3 text-right">Omzet</th>';
        html += '<th class="px-2 py-3 text-right">Uang Makan</th>';
        html += '<th class="px-2 py-3 text-right">Transport</th>';
        html += '<th class="px-2 py-3 text-right">Racik</th>';
        html += '<th class="px-2 py-3 text-right bg-amber-50 dark:bg-amber-900/20 text-amber-600">Sisa THR</th>';
        html += '<th class="px-2 py-3 text-center bg-amber-50 dark:bg-amber-900/20 text-amber-600">Bayar THR</th>';
        html += '<th class="px-2 py-3 text-right">Tunjangan Lain</th>';
        html += '<th class="px-2 py-3 text-right">Pot. Kasbon</th>';
        html += '<th class="px-2 py-3 text-right">Pot. Wisata</th>';
        html += '<th class="px-3 py-3 text-right text-emerald-600">Net Dibayarkan</th>';
        html += '<th class="px-2 py-3 text-center">Aksi</th>';
        html += '</tr></thead><tbody>';

        if (this.kalkulasiGaji.length === 0) {
            html += '<tr><td colspan="22" class="text-center py-6 text-slate-400">Tidak ada karyawan aktif.</td></tr>';
        } else {
            this.kalkulasiGaji.forEach(function(k, idx) {
                html += '<tr class="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">';
                html += '<td class="px-3 py-2 sticky left-0 z-10 bg-white dark:bg-slate-800"><p class="font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(k.nama) + '</p><p class="text-[10px] text-slate-400">' + Utils.escapeHtml(k.departemen || '-') + '</p></td>';
                html += '<td class="px-2 py-2 text-left text-slate-500 dark:text-slate-400"><span class="text-[10px]">sejak</span><br>' + AppKeuanganPayroll._fmtTgl(k.periodeMulai) + '<br><span class="text-[10px] text-primary-600">s/d ' + AppKeuanganPayroll._fmtTgl(k.periodeSampai) + '</span></td>';
                html += '<td class="px-2 py-2 text-center font-medium">' + k.hariKerja + ' H</td>';
                html += '<td class="px-2 py-2 text-right text-slate-600 dark:text-slate-300">' + Utils.formatRupiah(k.gajiPokok) + '</td>';
                html += '<td class="px-2 py-2 text-right font-semibold text-slate-700 dark:text-slate-200">' + Utils.formatRupiah(k.grossPayroll) + '</td>';
                html += '<td class="px-2 py-2 text-right text-blue-600">' + Utils.formatRupiah(k.jasaMedis) + '</td>';
                html += '<td class="px-2 py-2 text-right text-blue-600">' + Utils.formatRupiah(k.jasaDokter) + '</td>';
                html += '<td class="px-2 py-2 text-right text-blue-600">' + Utils.formatRupiah(k.jasaResepLuar) + '</td>';
                html += '<td class="px-2 py-2 text-right text-purple-600">' + Utils.formatRupiah(k.bagPoolKlinik) + '</td>';
                html += '<td class="px-2 py-2 text-right text-teal-600">' + Utils.formatRupiah(k.bagPoolApotek) + '</td>';
                html += '<td class="px-2 py-2 text-right text-purple-600">' + Utils.formatRupiah(k.bagTuslah) + '</td>';
                html += '<td class="px-2 py-2 text-right text-emerald-600">' + Utils.formatRupiah(k.bagOmzet) + '</td>';
                html += '<td class="px-2 py-2 text-right text-orange-600">' + Utils.formatRupiah(k.bagUM) + '</td>';
                html += '<td class="px-2 py-2 text-right text-sky-600">' + Utils.formatRupiah(k.bagTransport) + '</td>';
                html += '<td class="px-2 py-2 text-right text-indigo-600">' + Utils.formatRupiah(k.bagRacik) + '</td>';

                html += '<td class="px-2 py-2 text-right bg-amber-50/50 dark:bg-amber-900/10">';
                html += '<div class="font-bold text-amber-700 dark:text-amber-400" title="Total Akumulasi THR">' + Utils.formatRupiah(thrYangDibayar) + '</div>';
                html += '<div class="text-[10px] text-slate-500 flex flex-col items-end mt-0.5">';
                html += '<span>Akumulasi: ' + Utils.formatRupiah(k.thrSaldoSebelum) + '</span>';
                if (k.thrBulanIni > 0) html += '<span class="text-emerald-600 font-semibold">+' + Utils.formatRupiah(k.thrBulanIni) + ' bulan ini</span>';
                html += '</div></td>';
                html += '<td class="px-2 py-2 text-center bg-amber-50/50 dark:bg-amber-900/10">';
                if (k.thrSaldoSebelum > 0) {
                    html += '<button onclick="AppKeuanganPayroll.bayarTHR(' + idx + ')" class="text-[10px] bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1.5 rounded-lg font-bold shadow-sm transition">Bayarkan THR Tersimpan</button>';
                } else {
                    html += '<span class="text-[10px] text-slate-400 font-medium">Belum terbentuk</span>';
                }
                html += '</td>';

                // Manual Inputs
                html += '<td class="px-1 py-1 text-right"><input type="number" id="tunjangan-' + idx + '" value="' + (k.tunjanganLain || 0) + '" min="0" oninput="AppKeuanganPayroll.updateTotal(' + idx + ')" class="w-20 px-1 py-1 border border-slate-300 dark:bg-slate-700 dark:text-white rounded text-xs text-right"></td>';
                html += '<td class="px-1 py-1 text-right"><input type="number" id="kasbon-' + idx + '" value="' + (k.potKasbon || 0) + '" min="0" oninput="AppKeuanganPayroll.updateTotal(' + idx + ')" class="w-20 px-1 py-1 border border-red-300 dark:bg-slate-700 dark:text-white rounded text-xs text-right"></td>';
                html += '<td class="px-1 py-1 text-right"><input type="number" id="wisata-' + idx + '" value="' + (k.potWisata || 0) + '" min="0" oninput="AppKeuanganPayroll.updateTotal(' + idx + ')" class="w-20 px-1 py-1 border border-red-300 dark:bg-slate-700 dark:text-white rounded text-xs text-right"></td>';

                html += '<td class="px-3 py-2 text-right font-bold text-emerald-600" id="total-' + idx + '">' + Utils.formatRupiah(k.totalGaji) + '</td>';
                html += '<td class="px-2 py-2 text-center flex items-center justify-center gap-1">';
                html += '<button onclick="AppKeuanganPayroll.cetakSlip(' + idx + ')" class="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded flex items-center gap-1"><i data-lucide="printer" class="w-3 h-3"></i> Cetak</button>';
                if (k.totalGaji > 0) {
                    html += '<button onclick="AppKeuanganPayroll.openEksekusiModal(true, ' + idx + ')" class="text-[10px] bg-primary-600 hover:bg-primary-700 text-white px-2 py-1 rounded font-semibold flex items-center gap-1"><i data-lucide="check" class="w-3 h-3"></i> Bayarkan</button>';
                } else {
                    html += '<span class="text-[10px] text-slate-400">Rp 0</span>';
                }
                html += '</td>';
                html += '</tr>';
            });
        }

        html += '</tbody></table></div></div>';

        var totalSemua = this.kalkulasiGaji.reduce(function(sum, k) { return sum + (k.totalGaji || 0); }, 0);
        html += '<div class="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 mt-4">';
        html += '  <p class="text-sm text-slate-500 dark:text-slate-400 sm:mr-auto">Total akan dibayarkan (semua karyawan): <span class="font-bold text-emerald-600 text-base">' + Utils.formatRupiah(totalSemua) + '</span></p>';
        html += '  <button onclick="AppKeuanganPayroll.openEksekusiModal(false)" class="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm flex items-center gap-2 shadow"><i data-lucide="banknote" class="w-4 h-4"></i> Bayarkan Semua (' + this.kalkulasiGaji.length + ' Karyawan)</button>';
        html += '</div>';

        container.innerHTML = html;
        lucide.createIcons();
    },

    updateTotal: function(idx) {
        var tunjanganEl = document.getElementById('tunjangan-' + idx);
        var kasbonEl = document.getElementById('kasbon-' + idx);
        var wisataEl = document.getElementById('wisata-' + idx);
        if (parseFloat(tunjanganEl.value) < 0) tunjanganEl.value = 0;
        if (parseFloat(kasbonEl.value) < 0) kasbonEl.value = 0;
        if (parseFloat(wisataEl.value) < 0) wisataEl.value = 0;
        var tunjangan = parseFloat(tunjanganEl.value) || 0;
        var kasbon = parseFloat(kasbonEl.value) || 0;
        var wisata = parseFloat(wisataEl.value) || 0;

        var k = this.kalkulasiGaji[idx];
        k.tunjanganLain = tunjangan;
        k.potKasbon = kasbon;
        k.potWisata = wisata;

        var grossPayroll = k.totalPendapatan + tunjangan;
        var totalPotongan = kasbon + wisata;
        var totalAkhir = grossPayroll - totalPotongan;
        document.getElementById('total-' + idx).textContent = Utils.formatRupiah(totalAkhir);
        k.grossPayroll = grossPayroll;
        k.totalPotongan = totalPotongan;
        k.netPay = totalAkhir;
        k.totalGaji = totalAkhir;
    },

    cetakSlip: function(idx) {
        var k = this.kalkulasiGaji[idx];
        if (!k) return;
        this._printSlipDocument(k);
    },

    _printSlipDocument: function(h) {
        var namaKary = h.namaKaryawan || h.nama || '-';
        var bulanStr = h.bulan || this.selectedTargetBulan || '-';
        var tglBayarStr = h.tanggalBayar || h.tanggal || Utils.today();
        var periodeStr = this._fmtTgl(h.periodeMulai) + ' - ' + this._fmtTgl(h.periodeSampai);
        var w = window.open('', '', 'width=400,height=600');

        var html = '<html><head><title>Slip Gaji ' + namaKary + '</title>';
        html += '<style>body{font-family:monospace;font-size:12px;width:80mm;margin:0;padding:10px;color:#000;} h2,p{text-align:center;margin:0;} table{width:100%;} .right{text-align:right;} .bold{font-weight:bold;} hr{border-top:1px dashed #000;margin:8px 0;}</style></head><body>';

        html += '<h2 class="bold">SLIP GAJI KARYAWAN</h2>';
        html += '<p>Aulia Apotek Klinik</p><hr>';
        html += '<table>';
        html += '<tr><td>Bulan Laporan</td><td>: ' + bulanStr + '</td></tr>';
        html += '<tr><td>Periode</td><td>: ' + periodeStr + '</td></tr>';
        html += '<tr><td>Tgl Bayar/Transfer</td><td>: ' + this._fmtTgl(tglBayarStr) + '</td></tr>';
        html += '<tr><td>Nama</td><td>: ' + namaKary + '</td></tr>';
        html += '<tr><td>Jabatan/Dep.</td><td>: ' + (h.jabatan || h.departemen || '-') + '</td></tr>';
        html += '<tr><td>Hadir</td><td>: ' + (h.hariKerja || 0) + ' Hari</td></tr>';
        html += '</table><hr>';

        html += '<table>';
        html += '<tr><td colspan="2" class="bold">PENDAPATAN:</td></tr>';
        html += '<tr><td>Gaji Pokok</td><td class="right">' + Utils.formatRupiah(h.gajiPokok || 0) + '</td></tr>';
        if((h.jasaMedis || 0) > 0) html += '<tr><td>Jasa Medis (JM)</td><td class="right">' + Utils.formatRupiah(h.jasaMedis) + '</td></tr>';
        if((h.jasaDokter || 0) > 0) html += '<tr><td>Jasa Dokter (JD)</td><td class="right">' + Utils.formatRupiah(h.jasaDokter) + '</td></tr>';
        if((h.jasaResepLuar || 0) > 0) html += '<tr><td>Jasa Resep Luar</td><td class="right">' + Utils.formatRupiah(h.jasaResepLuar) + '</td></tr>';
        if((h.bagPoolKlinik || 0) > 0) html += '<tr><td>Pool Resep Klinik</td><td class="right">' + Utils.formatRupiah(h.bagPoolKlinik) + '</td></tr>';
        if((h.bagPoolApotek || 0) > 0) html += '<tr><td>Pool Resep Apotek</td><td class="right">' + Utils.formatRupiah(h.bagPoolApotek) + '</td></tr>';
        if((h.bagTuslah || 0) > 0) html += '<tr><td>Tuslah/Tindakan</td><td class="right">' + Utils.formatRupiah(h.bagTuslah) + '</td></tr>';
        if((h.bagOmzet || 0) > 0) html += '<tr><td>Tunjangan Omzet</td><td class="right">' + Utils.formatRupiah(h.bagOmzet) + '</td></tr>';
        if((h.bagUM || 0) > 0) html += '<tr><td>Uang Makan</td><td class="right">' + Utils.formatRupiah(h.bagUM) + '</td></tr>';
        if((h.bagTransport || 0) > 0) html += '<tr><td>Transport</td><td class="right">' + Utils.formatRupiah(h.bagTransport) + '</td></tr>';
        if((h.bagRacik || 0) > 0) html += '<tr><td>Racik Obat</td><td class="right">' + Utils.formatRupiah(h.bagRacik) + '</td></tr>';
        if((h.tunjanganLain || 0) > 0) html += '<tr><td>Tunjangan Lain</td><td class="right">' + Utils.formatRupiah(h.tunjanganLain) + '</td></tr>';
        html += '</table><hr>';

        var subTotal = (h.gajiPokok || 0) + (h.jasaMedis || 0) + (h.jasaDokter || 0) + (h.jasaResepLuar || 0) + (h.bagPoolKlinik || 0) + (h.bagPoolApotek || 0) + (h.bagTuslah || 0) + (h.bagOmzet || 0) + (h.bagUM || 0) + (h.bagTransport || 0) + (h.bagRacik || 0) + (h.tunjanganLain || 0);
        html += '<table>';
        html += '<tr class="bold"><td>TOTAL PENDAPATAN</td><td class="right">' + Utils.formatRupiah(subTotal) + '</td></tr>';
        html += '</table><hr>';

        if((h.potKasbon || 0) > 0 || (h.potWisata || 0) > 0) {
            html += '<table>';
            html += '<tr><td colspan="2" class="bold">POTONGAN:</td></tr>';
            if((h.potKasbon || 0) > 0) html += '<tr><td>Kasbon</td><td class="right">(-) ' + Utils.formatRupiah(h.potKasbon) + '</td></tr>';
            if((h.potWisata || 0) > 0) html += '<tr><td>Wisata</td><td class="right">(-) ' + Utils.formatRupiah(h.potWisata) + '</td></tr>';
            html += '</table><hr>';
        }

        html += '<table>';
        html += '<tr class="bold"><td>TOTAL DITERIMA</td><td class="right">' + Utils.formatRupiah(h.totalGaji || 0) + '</td></tr>';
        html += '</table><hr>';

        html += '<p>Penerima,</p><br><br><br>';
        html += '<p class="bold">( ' + namaKary + ' )</p>';

        html += '<script>window.onload = function() { window.print(); }<\/script>';
        html += '</body></html>';

        w.document.write(html);
        w.document.close();
    },

    // Modal Konfirmasi Pembayaran
    openEksekusiModal: function(isSingle, idx) {
        var list = isSingle ? [this.kalkulasiGaji[idx]] : this.kalkulasiGaji.filter(function(k) { return (k.totalGaji || 0) > 0; });
        if (!list || list.length === 0) {
            Utils.toast('Tidak ada gaji untuk dibayarkan.', 'info');
            return;
        }

        var totalNominal = list.reduce(function(sum, item) { return sum + (item.totalGaji || 0); }, 0);
        var targetNama = isSingle ? list[0].nama : 'Semua Karyawan (' + list.length + ' orang)';
        var periodeDescr = isSingle ? ('Periode: ' + this._fmtTgl(list[0].periodeMulai) + ' s/d ' + this._fmtTgl(list[0].periodeSampai)) : ('Cut-off per masing-masing karyawan s/d ' + this._fmtTgl(this.selectedCutoffDate));

        this._pendingExec = {
            isSingle: isSingle,
            list: list,
            totalNominal: totalNominal
        };

        var today = Utils.today();
        var targetBulan = this.selectedTargetBulan || today.slice(0, 7);
        var targetTglCatatan = this.selectedCutoffDate || today;

        var existingModal = document.getElementById('payroll-confirm-modal');
        if (existingModal) existingModal.remove();

        var modalHtml = '<div id="payroll-confirm-modal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">';
        modalHtml += '  <div class="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 font-sans text-slate-800 dark:text-white">';
        modalHtml += '    <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">';
        modalHtml += '      <h3 class="font-bold text-lg flex items-center gap-2"><i data-lucide="banknote" class="w-5 h-5 text-emerald-600"></i> Konfirmasi Pembayaran Payroll</h3>';
        modalHtml += '      <button onclick="AppKeuanganPayroll.closeModal()" class="text-slate-400 hover:text-slate-600 text-lg">✕</button>';
        modalHtml += '    </div>';

        modalHtml += '    <div class="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3.5 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">';
        modalHtml += '      <p class="font-bold text-sm">Penerima: ' + Utils.escapeHtml(targetNama) + '</p>';
        modalHtml += '      <p class="text-xs">Total Pembayaran: <span class="font-extrabold text-base text-emerald-600 dark:text-emerald-400">' + Utils.formatRupiah(totalNominal) + '</span></p>';
        modalHtml += '      <p class="text-[11px] text-emerald-700 dark:text-emerald-400">' + periodeDescr + '</p>';
        modalHtml += '    </div>';

        modalHtml += '    <div class="space-y-3 text-xs">';
        modalHtml += '      <div>';
        modalHtml += '        <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">1. Bulan Laporan Keuangan (Sinkronisasi Laporan):</label>';
        modalHtml += '        <input type="month" id="exec-bulan-laporan" value="' + targetBulan + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white font-medium">';
        modalHtml += '        <p class="text-[11px] text-slate-400 mt-1">Beban gaji akan terakumulasi ke Laporan Laba Rugi, Jurnal Akuntansi, dan Rangkuman Bulanan pada bulan ini.</p>';
        modalHtml += '      </div>';

        modalHtml += '      <div>';
        modalHtml += '        <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">2. Tanggal Catatan Tanggungan Laporan (Cut-Off):</label>';
        modalHtml += '        <input type="date" id="exec-tgl-laporan" value="' + targetTglCatatan + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white font-medium">';
        modalHtml += '        <p class="text-[11px] text-slate-400 mt-1">Tanggal pembukuan catatan beban pada Pengeluaran Kas.</p>';
        modalHtml += '      </div>';

        modalHtml += '      <div>';
        modalHtml += '        <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">3. Tanggal Real Transfer / Eksekusi:</label>';
        modalHtml += '        <input type="date" id="exec-tgl-transfer" value="' + today + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white font-medium">';
        modalHtml += '        <p class="text-[11px] text-slate-400 mt-1">Tanggal real transaksi transfer dilakukan (mis. Tanggal 1 atau 2 bulan berikutnya).</p>';
        modalHtml += '      </div>';
        modalHtml += '    </div>';

        modalHtml += '    <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">';
        modalHtml += '      <button onclick="AppKeuanganPayroll.closeModal()" class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg">Batal</button>';
        modalHtml += '      <button onclick="AppKeuanganPayroll.prosesEksekusiBayar()" class="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 shadow"><i data-lucide="check-circle" class="w-4 h-4"></i> Konfirmasi &amp; Eksekusi</button>';
        modalHtml += '    </div>';

        modalHtml += '  </div>';
        modalHtml += '</div>';

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        lucide.createIcons();
    },

    closeModal: function() {
        var el = document.getElementById('payroll-confirm-modal');
        if (el) el.remove();
        this._pendingExec = null;
    },

    prosesEksekusiBayar: function() {
        var self = this;
        if (!this._pendingExec) return;
        var list = this._pendingExec.list;
        if (!list || list.length === 0) return;

        var inputBulan = document.getElementById('exec-bulan-laporan').value || this.selectedTargetBulan;
        var inputTglCatatan = document.getElementById('exec-tgl-laporan').value || this.selectedCutoffDate;
        var inputTglTransfer = document.getElementById('exec-tgl-transfer').value || Utils.today();

        this.closeModal();
        Utils.toast('Memproses pembayaran payroll ' + list.length + ' karyawan...', 'info');

        var batch = db.batch();

        list.forEach(function(k) {
            var besok = new Date(k.periodeSampai + 'T00:00:00');
            besok.setDate(besok.getDate() + 1);
            var besokStr = Utils.dateStr(besok);

            var histRef = db.collection('payrollHistory').doc();
            batch.set(histRef, {
                bulan: inputBulan,
                tanggal: inputTglCatatan,
                tanggalBayar: inputTglTransfer,
                periodeMulai: k.periodeMulai,
                periodeSampai: k.periodeSampai,
                karyawanId: k.karyawanId,
                namaKaryawan: k.nama,
                departemen: k.departemen,
                jabatan: k.jabatan,
                hariKerja: k.hariKerja,
                gajiPokok: k.gajiPokok,
                jasaMedis: k.jasaMedis,
                jasaDokter: k.jasaDokter,
                jasaResepLuar: k.jasaResepLuar,
                bagPoolKlinik: k.bagPoolKlinik,
                bagPoolApotek: k.bagPoolApotek,
                bagTuslah: k.bagTuslah,
                bagOmzet: k.bagOmzet,
                bagUM: k.bagUM,
                bagTransport: k.bagTransport,
                bagRacik: k.bagRacik,
                thrBulanIni: k.thrBulanIni || 0,
                tunjanganLain: k.tunjanganLain,
                potKasbon: k.potKasbon,
                potWisata: k.potWisata,
                grossPayroll: k.grossPayroll || (k.totalGaji + (k.potKasbon || 0) + (k.potWisata || 0)),
                totalPotongan: k.totalPotongan || ((k.potKasbon || 0) + (k.potWisata || 0)),
                netPay: k.netPay !== undefined ? k.netPay : k.totalGaji,
                totalGaji: k.totalGaji,
                status: 'paid',
                diprosesOleh: window.currentUserName || 'Keuangan',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Catat ke Pengeluaran Kas (kasKeluar)
            // FIX (CACAT LOGIKA KEUANGAN - DOBEL HITUNG): dokumen ini sebelumnya ikut terjumlah sebagai
            // "Biaya Operasional Lain" di Laporan Keuangan & Dashboard Keuangan. Padahal gaji karyawan
            // SUDAH dihitung sbg beban lewat koleksi `payrollHistory` (dipakai sbg "Beban Payroll" /
            // gajiBulan). Dokumen kasKeluar ini cuma catatan ARUS KAS-nya, bukan beban baru -- kalau
            // ikut dijumlahkan lagi ke Biaya Operasional, gaji karyawan terpotong DUA KALI dari Laba
            // Bersih. Field `tipeArusKas` dipakai laporanKeuangan.js & dashboardKeuangan.js untuk
            // MENGECUALIKAN dokumen ini dari "Biaya Operasional" (tetap dihitung sbg kas keluar lewat
            // totalBebanPayroll/gajiBulan yang sudah ada).
            var kasRef = db.collection('kasKeluar').doc();
            batch.set(kasRef, {
                kategori: 'gaji',
                tipeArusKas: 'gaji_payroll', // FIX: penanda supaya tidak dobel hitung sbg Biaya Operasional
                keterangan: 'Pembayaran Gaji Karyawan - ' + k.nama + ' (Periode ' + self._fmtTgl(k.periodeMulai) + ' s/d ' + self._fmtTgl(k.periodeSampai) + ')',
                jumlah: k.totalGaji,
                grossPayroll: k.grossPayroll || (k.totalGaji + (k.potKasbon || 0) + (k.potWisata || 0)),
                totalPotongan: k.totalPotongan || ((k.potKasbon || 0) + (k.potWisata || 0)),
                netPay: k.netPay !== undefined ? k.netPay : k.totalGaji,
                tanggal: inputTglCatatan,
                tanggalBayar: inputTglTransfer,
                bulan: inputBulan,
                status: 'approved',
                karyawanId: k.karyawanId,
                payrollHistoryId: histRef.id,
                diprosesOleh: window.currentUserName || 'Keuangan',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            if (k.thrBulanIni > 0) {
                var thrRef = db.collection('thrTabungan').doc(k.karyawanId);
                batch.set(thrRef, {
                    karyawanId: k.karyawanId,
                    namaKaryawan: k.nama,
                    saldo: firebase.firestore.FieldValue.increment(k.thrBulanIni),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }

            var periodeRef = db.collection('payrollPeriode').doc(k.karyawanId);
            batch.set(periodeRef, {
                mulai: besokStr,
                terakhirDibayar: firebase.firestore.FieldValue.serverTimestamp(),
                terakhirDibayarOleh: window.currentUserName || 'Keuangan',
                terakhirJumlah: k.totalGaji,
                terakhirPeriodeMulai: k.periodeMulai,
                terakhirPeriodeSampai: k.periodeSampai,
                terakhirBulanLaporan: inputBulan
            }, { merge: true });
        });

        batch.commit().then(function() {
            Utils.toast('Payroll berhasil dibayarkan! Beban tersimpan pada laporan bulan ' + inputBulan + '.', 'success');
            AuditLog.catat({
                aksi: 'bayar', modul: 'Payroll', koleksi: 'payrollHistory', targetId: inputBulan,
                deskripsi: 'Bayarkan payroll (' + list.length + ' karyawan) untuk bulan laporan ' + inputBulan + ' pada tanggal ' + inputTglTransfer,
                nominal: list.reduce(function(s, x) { return s + x.totalGaji; }, 0)
            });
            self.init();
        }).catch(function(err) {
            Utils.toast('Gagal membayarkan payroll: ' + err.message, 'error');
        });
    },

    bayarTHR: function(idx) {
        var self = this;
        var k = this.kalkulasiGaji[idx];
        if (!k || k.thrSaldoSebelum <= 0) return;

        // Hanya saldo THR yang SUDAH terbentuk di thrTabungan yang boleh dibayarkan.
        // thrSaldoProyeksi juga memuat THR bulan berjalan yang belum diposting sampai
        // payroll benar-benar dibayarkan, sehingga membayar proyeksi akan membayar
        // kewajiban yang belum pernah terbentuk.
        var thrYangDibayar = k.thrSaldoSebelum;
        var bulan = this.selectedTargetBulan || Utils.today().slice(0, 7);
        if (!confirm('Bayarkan THR tersimpan ' + k.nama + ' sebesar ' + Utils.formatRupiah(thrYangDibayar) + ' dan reset tabungan menjadi Rp 0?')) return;

        Utils.toast('Memproses pembayaran THR...', 'info');
        var batch = db.batch();

        var thrRef = db.collection('thrTabungan').doc(k.karyawanId);
        batch.set(thrRef, {
            karyawanId: k.karyawanId,
            namaKaryawan: k.nama,
            saldo: 0,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        var historyRef = db.collection('thrPembayaranHistory').doc();
        batch.set(historyRef, {
            karyawanId: k.karyawanId,
            namaKaryawan: k.nama,
            jumlah: thrYangDibayar,
            bulanDibayarkan: bulan,
            dibayarkanOleh: window.currentUserName || 'Keuangan',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Catat pengeluaran kas THR
        // FIX (LABEL MENYESATKAN): dulu tercampur generik jadi "Biaya Operasional Lain". THR tetap
        // beban riil (dan TIDAK dobel hitung, karena tidak masuk payrollHistory) -- tapi ditandai
        // `tipeArusKas` di bawah supaya laporanKeuangan.js & dashboardKeuangan.js bisa menampilkannya
        // sbg baris "Beban THR" tersendiri, bukan tersembunyi di "Biaya Operasional Lain".
        var kasRef = db.collection('kasKeluar').doc();
        batch.set(kasRef, {
            tanggal: Utils.today(),
            bulan: bulan,
            kategori: 'Tunjangan Hari Raya (THR)',
            kategoriId: 'thr',
            tipeArusKas: 'thr_payroll',
            akunKas: 'Kas Utama / Bank',
            jumlah: thrYangDibayar,
            penerima: k.nama,
            keterangan: 'Pembayaran THR & Tabungan THR untuk ' + k.nama,
            status: 'approved',
            sumber: 'payroll_thr',
            diprosesOleh: window.currentUserName || 'Keuangan',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        batch.commit().then(function() {
            Utils.toast('THR ' + k.nama + ' berhasil dibayarkan &amp; direset.', 'success');
            AuditLog.catat({
                aksi: 'bayar', modul: 'Payroll - THR', koleksi: 'thrPembayaranHistory', targetId: k.karyawanId,
                deskripsi: 'Bayar THR: ' + k.nama, nominal: thrYangDibayar
            });
            self.init();
        }).catch(function(err) {
            Utils.toast('Gagal memproses THR: ' + err.message, 'error');
        });
    },

    // Tab Riwayat & Laporan Payroll
    loadRiwayat: function() {
        var self = this;
        var container = document.getElementById('payroll-content');
        if (!container) return;

        container.innerHTML = '<div class="flex justify-center py-20"><div class="spinner"></div></div>';

        var reqBulan = this.riwayatBulan || this.selectedTargetBulan || Utils.today().slice(0, 7);

        db.collection('payrollHistory').where('bulan', '==', reqBulan).get().then(function(snap) {
            self.dataRiwayat = [];
            snap.forEach(function(doc) {
                var d = doc.data();
                d.id = doc.id;
                self.dataRiwayat.push(d);
            });
            self.renderRiwayatTable();
        }).catch(function(err) {
            Utils.toast('Gagal memuat riwayat: ' + err.message, 'error');
        });
    },

    setRiwayatBulan: function(yyyyMM) {
        if (!yyyyMM) return;
        this.riwayatBulan = yyyyMM;
        this.loadRiwayat();
    },

    renderRiwayatTable: function() {
        var container = document.getElementById('payroll-content');
        if (!container) return;

        var self = this;
        var reqBulan = this.riwayatBulan || Utils.today().slice(0, 7);

        var totalNominal = this.dataRiwayat.reduce(function(sum, r) { return sum + (r.totalGaji || 0); }, 0);
        var totalGajiPokok = this.dataRiwayat.reduce(function(sum, r) { return sum + (r.gajiPokok || 0); }, 0);
        var totalGross = this.dataRiwayat.reduce(function(sum, r) {
            return sum + (r.grossPayroll !== undefined ? r.grossPayroll : (r.totalGaji || 0) + (r.potKasbon || 0) + (r.potWisata || 0));
        }, 0);
        var totalPotongan = this.dataRiwayat.reduce(function(sum, r) {
            return sum + (r.totalPotongan !== undefined ? r.totalPotongan : (r.potKasbon || 0) + (r.potWisata || 0));
        }, 0);
        var totalJasaTunjangan = totalGross - totalGajiPokok;

        var html = '';

        // Filter Header Riwayat
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">';
        html += '  <div>';
        html += '    <h3 class="font-bold text-slate-800 dark:text-white flex items-center gap-2"><i data-lucide="history" class="w-5 h-5 text-primary-600"></i> Laporan Riwayat Pembayaran Gaji</h3>';
        html += '    <p class="text-xs text-slate-500 dark:text-slate-400">Daftar penggajian yang sudah dibayarkan pada bulan laporan terkait.</p>';
        html += '  </div>';
        html += '  <div class="flex items-center gap-2 text-xs">';
        html += '    <label class="font-semibold text-slate-700 dark:text-slate-300">Pilih Bulan Laporan:</label>';
        html += '    <input type="month" value="' + reqBulan + '" onchange="AppKeuanganPayroll.setRiwayatBulan(this.value)" class="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white font-medium">';
        html += '  </div>';
        html += '</div>';

        // Summary KPI Riwayat
        html += '<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">';
        html += '  <div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">';
        html += '    <span class="text-xs text-slate-400">Total Dibayarkan (' + reqBulan + ')</span>';
        html += '    <p class="text-lg font-bold text-emerald-600 mt-1">' + Utils.formatRupiah(totalNominal) + '</p>';
        html += '    <p class="text-[10px] text-slate-400">Net yang benar-benar dibayarkan</p>';
        html += '  </div>';
        html += '  <div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">';
        html += '    <span class="text-xs text-slate-400">Total Karyawan Dibayar</span>';
        html += '    <p class="text-lg font-bold text-slate-800 dark:text-white mt-1">' + this.dataRiwayat.length + ' Orang</p>';
        html += '  </div>';
        html += '  <div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">';
        html += '    <span class="text-xs text-slate-400">Rincian Pokok / Jasa</span>';
        html += '    <p class="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">Gross: ' + Utils.formatRupiah(totalGross) + '</p>';
        html += '    <p class="text-xs text-slate-500">Pokok: ' + Utils.formatRupiah(totalGajiPokok) + ' · Jasa/Tunjangan: ' + Utils.formatRupiah(totalJasaTunjangan) + '</p>';
        html += '    <p class="text-xs text-red-500">Potongan: ' + Utils.formatRupiah(totalPotongan) + '</p>';
        html += '  </div>';
        html += '</div>';

        // Table Riwayat
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">';
        html += '<div class="overflow-x-auto">';
        html += '<table class="w-full text-xs whitespace-nowrap">';
        html += '<thead><tr class="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase">';
        html += '<th class="px-3 py-3 text-left">No</th>';
        html += '<th class="px-3 py-3 text-left">Tanggal Transfer</th>';
        html += '<th class="px-3 py-3 text-left">Karyawan</th>';
        html += '<th class="px-3 py-3 text-left">Periode Gaji</th>';
        html += '<th class="px-3 py-3 text-right">Gaji Pokok</th>';
        html += '<th class="px-3 py-3 text-right">Tunjangan &amp; Jasa</th>';
        html += '<th class="px-3 py-3 text-right text-emerald-600">Total Diterima</th>';
        html += '<th class="px-3 py-3 text-left">Diproses Oleh</th>';
        html += '<th class="px-3 py-3 text-center">Slip</th>';
        html += '</tr></thead><tbody>';

        if (this.dataRiwayat.length === 0) {
            html += '<tr><td colspan="10" class="text-center py-8 text-slate-400">Belum ada riwayat penggajian pada bulan ' + reqBulan + '.</td></tr>';
        } else {
            this.dataRiwayat.forEach(function(r, idx) {
                var tglTrf = r.tanggalBayar || r.tanggal || '-';
                var grossR = r.grossPayroll !== undefined ? r.grossPayroll : (r.totalGaji || 0) + (r.potKasbon || 0) + (r.potWisata || 0);
                var potR = r.totalPotongan !== undefined ? r.totalPotongan : (r.potKasbon || 0) + (r.potWisata || 0);
                var subJasa = grossR - (r.gajiPokok || 0);

                html += '<tr class="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">';
                html += '<td class="px-3 py-2.5 text-slate-400">' + (idx + 1) + '</td>';
                html += '<td class="px-3 py-2.5 font-medium text-slate-700 dark:text-slate-300">' + self._fmtTgl(tglTrf) + '</td>';
                html += '<td class="px-3 py-2.5"><p class="font-bold text-slate-800 dark:text-white">' + Utils.escapeHtml(r.namaKaryawan || '-') + '</p><p class="text-[10px] text-slate-400">' + Utils.escapeHtml(r.departemen || '-') + '</p></td>';
                html += '<td class="px-3 py-2.5 text-slate-500">' + self._fmtTgl(r.periodeMulai) + ' - ' + self._fmtTgl(r.periodeSampai) + '</td>';
                html += '<td class="px-3 py-2.5 text-right text-slate-600 dark:text-slate-300">' + Utils.formatRupiah(r.gajiPokok || 0) + '</td>';
                html += '<td class="px-3 py-2.5 text-right text-blue-600">' + Utils.formatRupiah(subJasa) + '</td>';
                html += '<td class="px-3 py-2.5 text-right text-red-600">' + Utils.formatRupiah(potR) + '</td>';
                html += '<td class="px-3 py-2.5 text-right font-bold text-emerald-600">' + Utils.formatRupiah(r.netPay !== undefined ? r.netPay : r.totalGaji || 0) + '</td>';
                html += '<td class="px-3 py-2.5 text-slate-500">' + Utils.escapeHtml(r.diprosesOleh || '-') + '</td>';
                html += '<td class="px-3 py-2.5 text-center">';
                html += '<button onclick="AppKeuanganPayroll._printSlipFromHistoryIdx(' + idx + ')" class="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded flex items-center gap-1 mx-auto"><i data-lucide="printer" class="w-3 h-3"></i> Cetak Slip</button>';
                html += '</td>';
                html += '</tr>';
            });
        }

        html += '</tbody></table></div></div>';

        container.innerHTML = html;
        lucide.createIcons();
    },

    _printSlipFromHistoryIdx: function(idx) {
        var r = this.dataRiwayat[idx];
        if (!r) return;
        this._printSlipDocument(r);
    }
};