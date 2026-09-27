/**
 * js/keuangan/laporanKeuangan.js
 * Laporan Keuangan (Laba/Rugi & Arus Kas) - Hanya PSA/Keuangan
 */

window.AppKeuanganLaporanKeuangan = {
    dataTransaksi: [],
    dataPengeluaran: [],
    dataPembelian: [],
    dataPayroll: [],       // FITUR BARU
    dataTransaksiPrev: [], // FITUR BARU
    dataPemasukanLain: [], // FITUR BARU: pemasukan non-penjualan (kasMasuk), mis. selisih retur tukar barang
    dataPendapatanLain: [], // INTEGRASI: pendapatan non-operasional dari modul Pendapatan Lain (sewa, bunga bank, komisi, dll)
    summary: null,         // FITUR BARU: dipakai oleh exportExcel()

    // FITUR BARU (Laporan Bayangan): dipakai utk hitung Payroll Real-Time & Hutang Jatuh Tempo
    dataKaryawan: [],
    configGaji: null,
    configPembagian: null,
    dataHutangBelumLunas: [],
    endDate: null,

    render: function() {
        if (window.currentRole === 'admin') {
            return '<div class="p-6 text-center text-red-500 font-semibold bg-white dark:bg-slate-800 rounded-xl border border-red-200 dark:border-red-900/30">Akses Ditolak: Role Admin tidak memiliki akses ke Laporan Keuangan.</div>';
        }
        var d = new Date();
        var defaultMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');

        var html = '<div class="page-enter max-w-6xl">';
        html += '  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">';
        html += '    <div>';
        html += '      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Laporan Keuangan</h2>';
        html += '      <p class="text-sm text-slate-500 dark:text-slate-400">Rekap arus kas & laba rugi bulanan</p>';
        html += '    </div>';
        html += '    <div class="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">';
        html += '      <input type="month" id="filter-bulan" value="' + defaultMonth + '" class="px-3 py-1.5 bg-transparent dark:text-white text-sm rounded-md outline-none">';
        html += '      <button onclick="AppKeuanganLaporanKeuangan.init()" class="bg-primary-600 text-white text-sm px-4 py-1.5 rounded-md font-medium">Tampilkan</button>';
        html += '    </div>';
        html += '  </div>';
        
        html += '  <div id="laporan-content"><div class="flex justify-center py-20"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        var self = this;
        var monthInput = document.getElementById('filter-bulan');
        if (!monthInput) return;
        
        var bulan = monthInput.value; // Format: YYYY-MM
        var startDate = bulan + '-01';
        var endDate = bulan + '-31';
        this.endDate = endDate; // dipakai lagi di renderReport() utk filter Hutang Jatuh Tempo

        // Helper untuk menangani query error secara mandiri agar tidak menggagalkan seluruh laporan
        function wrapPromise(promise, fallback) {
            return promise.catch(function(err) {
                console.warn('Gagal memuat sebagian data laporan:', err.message || err);
                return fallback || { 
                    forEach: function() {}, 
                    exists: false, 
                    data: function() { return {}; } 
                };
            });
        }

        // Bulan sebelumnya, untuk perbandingan pertumbuhan (FITUR BARU: laporan lebih lengkap)
        var prevParts = bulan.split('-');
        var prevDate = new Date(parseInt(prevParts[0]), parseInt(prevParts[1]) - 1, 1);
        prevDate.setMonth(prevDate.getMonth() - 1);
        var prevBulan = prevDate.getFullYear() + '-' + String(prevDate.getMonth() + 1).padStart(2, '0');

        // Query semua data di bulan tersebut (di-wrap dengan wrapPromise)
        var pTrx = wrapPromise(db.collection('transaksi').where('tanggal', '>=', startDate).where('tanggal', '<=', endDate).get());
        var pKeluar = wrapPromise(db.collection('kasKeluar').where('tanggal', '>=', startDate).where('tanggal', '<=', endDate).get());
        // FITUR BARU: pemasukan non-penjualan (mis. selisih retur tukar barang yang DITERIMA dari
        // supplier) sekarang juga otomatis masuk laporan, bukan cuma tersimpan di database saja.
        var pMasuk = wrapPromise(db.collection('kasMasuk').where('tanggal', '>=', startDate).where('tanggal', '<=', endDate).get());
        // INTEGRASI: pendapatan non-operasional (modul Pendapatan Lain) - sewa, bunga bank, komisi, dll -
        // sekarang ikut dihitung ke laba bersih & arus kas, bukan hanya tersimpan di halamannya sendiri.
        var pPendapatanLain = wrapPromise(db.collection('pendapatanLain').where('tanggal', '>=', startDate).where('tanggal', '<=', endDate).get());
        var pBeli = wrapPromise(db.collection('pembelian').where('tanggal', '>=', startDate).where('tanggal', '<=', endDate).get());
        // FIX/FITUR BARU: sertakan beban payroll (sebelumnya tidak ikut dihitung sama sekali di laporan ini,
        // sehingga "Laba Bersih" terlihat lebih besar dari kondisi riil).
        var pPayroll = wrapPromise(db.collection('payrollHistory').where('bulan', '==', bulan).get());
        var pTrxPrev = wrapPromise(db.collection('transaksi').where('tanggal', '>=', prevBulan + '-01').where('tanggal', '<=', prevBulan + '-31').get());

        // FITUR BARU (Laporan Bayangan): data tambahan utk hitung Payroll REAL-TIME (akrual, pakai
        // formula sama seperti js/keuangan/payroll.js tapi jendelanya dipatok ke bulan kalender
        // berjalan, BUKAN "sejak terakhir dibayar") + daftar hutang usaha yg masih berjalan (utk
        // difilter jatuh tempo <= akhir bulan ini).
        var pKaryawan = wrapPromise(db.collection('karyawan').where('status', '==', 'aktif').get());
        var pCfgGaji = wrapPromise(db.collection('pengaturanGaji').doc('global').get(), { exists: false, data: function() { return { apotek: [], klinik: [] }; } });
        var pCfgBagi = wrapPromise(db.collection('pengaturanPembagian').doc('global').get(), { exists: false, data: function() { return {}; } });
        var pHutang = wrapPromise(db.collection('pembelian').where('statusPelunasan', '!=', 'lunas').get());

        Promise.all([pTrx, pKeluar, pBeli, pPayroll, pTrxPrev, pMasuk, pKaryawan, pCfgGaji, pCfgBagi, pHutang, pPendapatanLain]).then(function(results) {
            self.dataTransaksi = [];
            results[0].forEach(function(doc) { var d = doc.data(); d.id = doc.id; self.dataTransaksi.push(d); });

            self.dataPengeluaran = [];
            results[1].forEach(function(doc) {
                var d = doc.data();
                d.id = doc.id;
                if (d.status === 'approved') {
                    self.dataPengeluaran.push(d);
                }
            });

            self.dataPembelian = [];
            results[2].forEach(function(doc) { var d = doc.data(); d.id = doc.id; self.dataPembelian.push(d); });

            self.dataPayroll = [];
            results[3].forEach(function(doc) { self.dataPayroll.push(doc.data()); });

            self.dataTransaksiPrev = [];
            results[4].forEach(function(doc) { self.dataTransaksiPrev.push(doc.data()); });

            // FITUR BARU: pemasukan non-penjualan (kasMasuk approved), mis. selisih retur tukar barang.
            self.dataPemasukanLain = [];
            results[5].forEach(function(doc) {
                var d = doc.data();
                d.id = doc.id;
                if (d.status === 'approved') {
                    self.dataPemasukanLain.push(d);
                }
            });

            // FITUR BARU (Laporan Bayangan)
            self.dataKaryawan = [];
            results[6].forEach(function(doc) { var d = doc.data(); d.id = doc.id; self.dataKaryawan.push(d); });
            self.configGaji = results[7].exists ? results[7].data() : { apotek: [], klinik: [] };
            self.configPembagian = results[8].exists ? results[8].data() : {};
            self.dataHutangBelumLunas = [];
            results[9].forEach(function(doc) { var d = doc.data(); d.id = doc.id; self.dataHutangBelumLunas.push(d); });

            // INTEGRASI: pendapatan non-operasional dari modul Pendapatan Lain
            self.dataPendapatanLain = [];
            results[10].forEach(function(doc) { var d = doc.data(); d.id = doc.id; self.dataPendapatanLain.push(d); });

            self.renderReport();
        }).catch(function(err) {
            Utils.toast('Gagal memuat laporan: ' + err.message, 'error');
            console.error(err);
        });
    },

    // ================================================================
    // LAPORAN BAYANGAN (Real-Time) — helper functions
    // ================================================================
    // CATATAN PENTING: rumus di bawah ini SENGAJA meniru persis
    // js/keuangan/payroll.js (_hitungRekapPeriode, _hitungPayrollInner,
    // _slotArr, _persenTHR) supaya angka "Payroll Real-Time" di sini
    // konsisten dengan Payroll module. Kalau formula pembagian hasil di
    // payroll.js diubah, bagian ini JUGA HARUS diupdate biar tetap sinkron.
    //
    // Bedanya dengan payroll.js: di sana jendela akumulasi tiap karyawan
    // dimulai dari "terakhir dia dibayarkan" (bisa lintas bulan). Di sini
    // jendelanya dipatok SAMA UNTUK SEMUA KARYAWAN = tanggal 1 s/d akhir
    // bulan yang dipilih di Laporan Keuangan (pakai this.dataTransaksi yg
    // sudah difilter ke bulan itu), karena tujuannya murni melihat beban
    // bulan berjalan, bukan menghitung nominal yang harus dibayarkan.
    // Format tanggal singkat "31 Jul 2026" utk label di kartu Laporan Bayangan.
    _fmtTglSingkat: function(iso) {
        if (!iso) return '-';
        // endDate disimpan sbg 'YYYY-MM-31' (lihat init()) yang bisa saja tanggal tidak valid
        // utk bulan ybs (mis. Februari) — Date akan otomatis "meluber" ke bulan berikutnya,
        // jadi dipotong dulu ke tanggal akhir bulan yg valid.
        var parts = iso.split('-');
        var d = new Date(parseInt(parts[0]), parseInt(parts[1]), 0); // hari terakhir bulan tsb
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
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

    _hitungRekapBulanIniUntukPayroll: function() {
        var cfg = this.configPembagian || {};
        var nilaiRacikConfig = (cfg.racikObat) ? (cfg.racikObat.nilai || 0) : 0;

        var rekapDokter = {};
        var totalLabaObat = 0, totalPembulatan = 0, totalTuslahKlinik = 0, totalTuslahApotek = 0, totalNilaiRacik = 0, jmlResepLuar = 0;

        // this.dataTransaksi sudah difilter ke bulan berjalan (lihat init()), jadi tidak perlu
        // filter tanggal lagi di sini seperti di payroll.js punya (yang jendelanya per-karyawan).
        this.dataTransaksi.forEach(function(t) {
            var omzetObat = t.items ? t.items.reduce(function(s, i) { return s + (i.jumlah * i.hargaJual); }, 0) : 0;
            var hppObat = t.items ? t.items.reduce(function(s, i) { var gross = i.jumlah * (i.hargaBeli || 0); var ppn = i.isPPN ? Math.round(gross - (gross / 1.11)) : 0; return s + (gross - ppn); }, 0) : 0;
            totalLabaObat += (omzetObat - hppObat);
            totalPembulatan += (t.pembulatan || 0);

            if (t.racikanItems && t.racikanItems.length > 0) {
                totalNilaiRacik += (t.racikanItems.length * nilaiRacikConfig);
            }

            if (t.tipe === 'resep_klinik' && t.dokterId) {
                if (!rekapDokter[t.dokterId]) rekapDokter[t.dokterId] = { jmlResepKlinik: 0, jasaResepLuar: 0 };
                rekapDokter[t.dokterId].jmlResepKlinik += 1;
            } else if (t.tipe === 'resep_luar' && t.dokterId) {
                if (!rekapDokter[t.dokterId]) rekapDokter[t.dokterId] = { jmlResepKlinik: 0, jasaResepLuar: 0 };
                rekapDokter[t.dokterId].jasaResepLuar += (t.jasaResep || 0);
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

    // Total beban payroll REAL-TIME (akrual) seluruh karyawan aktif, bulan kalender berjalan
    // s/d hari ini, TERLEPAS dari sudah/belum ditekan tombol "Bayarkan" di modul Payroll.
    // THR sengaja TIDAK diikutkan (sama seperti totalGaji di payroll.js), supaya apple-to-apple
    // dengan "Beban Payroll" versi kas (payrollHistory) di laporan resmi di atas.
    _hitungPayrollRealtime: function() {
        var self = this;
        var cfg = this.configPembagian || {};
        var rekap = this._hitungRekapBulanIniUntukPayroll();
        var rekapDokter = rekap.rekapDokter;
        var totalGajiPokok = 0, totalTunjanganJasa = 0, totalTHRRealtime = 0;

        (this.dataKaryawan || []).forEach(function(k) {
            var depKey = (k.departemen || '').toLowerCase();
            var cfgGajiDep = (self.configGaji && self.configGaji[depKey]) || [];
            var gajiCfg = cfgGajiDep.find(function(g) { return g.karyawanId === k.id; });
            var gajiPokok = gajiCfg ? (gajiCfg.gajiPokok || 0) : 0;

            var jasaMedis = 0, jasaDokter = 0, jasaResepLuar = 0;
            if (rekapDokter[k.id]) {
                jasaResepLuar = rekapDokter[k.id].jasaResepLuar || 0;
                if (cfg.resepKlinik && Array.isArray(cfg.resepKlinik)) {
                    var docConfig = cfg.resepKlinik.find(function(dc) { return dc.dokterId === k.id; });
                    if (docConfig && rekapDokter[k.id].jmlResepKlinik > 0) {
                        jasaMedis = (docConfig.jm || 0) * rekapDokter[k.id].jmlResepKlinik;
                        jasaDokter = (docConfig.jd || 0) * rekapDokter[k.id].jmlResepKlinik;
                    }
                }
            }

            var bagPoolKlinik = 0, bagPoolApotek = 0;
            if (cfg.resepKlinik) {
                cfg.resepKlinik.forEach(function(dc) {
                    var r = rekapDokter[dc.dokterId];
                    if (r && r.jmlResepKlinik > 0) {
                        var slotKlinik = (dc.slotKaryKlinik || []).find(function(s) { return s.karyawanId === k.id; });
                        if (slotKlinik) {
                            var totalPoolK = (dc.poolKaryKlinik || 0) * r.jmlResepKlinik;
                            var hasilThrK = totalPoolK * ((dc.thrPersenKlinik || 0) / 100);
                            var sisaCashK = totalPoolK - hasilThrK;
                            bagPoolKlinik += sisaCashK * (slotKlinik.persen / 100);
                            if (slotKlinik.isTHR) totalTHRRealtime += hasilThrK * (slotKlinik.persen / 100);
                        }
                        var slotApotek = (dc.slotKaryApotek || []).find(function(s) { return s.karyawanId === k.id; });
                        if (slotApotek) {
                            var totalPoolA = (dc.poolKaryApotek || 0) * r.jmlResepKlinik;
                            var hasilThrA = totalPoolA * ((dc.thrPersenApotek || 0) / 100);
                            var sisaCashA = totalPoolA - hasilThrA;
                            bagPoolApotek += sisaCashA * (slotApotek.persen / 100);
                            if (slotApotek.isTHR) totalTHRRealtime += hasilThrA * (slotApotek.persen / 100);
                        }
                    }
                });
            }

            var bagTuslah = 0;
            var slotsTindakanKlinik = self._slotArr(cfg.tindakanKlinik);
            var persenThrTindakanKlinik = self._persenTHR(cfg.tindakanKlinik);
            var mySlotTindakanKlinik = slotsTindakanKlinik.find(function(s) { return s.karyawanId === k.id; });
            if (mySlotTindakanKlinik && mySlotTindakanKlinik.persen > 0) {
                var hasilThrTK = rekap.totalTuslahKlinik * (persenThrTindakanKlinik / 100);
                var sisaCashTK = rekap.totalTuslahKlinik - hasilThrTK;
                bagTuslah += (sisaCashTK * mySlotTindakanKlinik.persen) / 100;
                if (mySlotTindakanKlinik.isTHR) totalTHRRealtime += (hasilThrTK * mySlotTindakanKlinik.persen) / 100;
            }
            var slotsTindakanApotek = self._slotArr(cfg.tindakanApotek);
            var persenThrTindakanApotek = self._persenTHR(cfg.tindakanApotek);
            var mySlotTindakanApotek = slotsTindakanApotek.find(function(s) { return s.karyawanId === k.id; });
            if (mySlotTindakanApotek && mySlotTindakanApotek.persen > 0) {
                var hasilThrTA = rekap.totalTuslahApotek * (persenThrTindakanApotek / 100);
                var sisaCashTA = rekap.totalTuslahApotek - hasilThrTA;
                bagTuslah += (sisaCashTA * mySlotTindakanApotek.persen) / 100;
                if (mySlotTindakanApotek.isTHR) totalTHRRealtime += (hasilThrTA * mySlotTindakanApotek.persen) / 100;
            }

            var bagOmzet = 0;
            if (cfg.tunjanganOmzet && cfg.tunjanganOmzet.persen > 0) {
                var poolOmzet = (rekap.totalLabaObat * cfg.tunjanganOmzet.persen) / 100;
                var mySlotOmzet = self._slotArr(cfg.tunjanganOmzet).find(function(s) { return s.karyawanId === k.id; });
                if (mySlotOmzet) {
                    var hasilThrOmz = poolOmzet * (self._persenTHR(cfg.tunjanganOmzet) / 100);
                    bagOmzet = ((poolOmzet - hasilThrOmz) * mySlotOmzet.persen) / 100;
                    if (mySlotOmzet.isTHR) totalTHRRealtime += (hasilThrOmz * mySlotOmzet.persen) / 100;
                }
            }

            var bagUM = 0;
            if (cfg.uangMakan) {
                var mySlotUM = self._slotArr(cfg.uangMakan).find(function(s) { return s.karyawanId === k.id; });
                if (mySlotUM) {
                    var hasilThrUM = rekap.totalPembulatan * (self._persenTHR(cfg.uangMakan) / 100);
                    bagUM = ((rekap.totalPembulatan - hasilThrUM) * mySlotUM.persen) / 100;
                    if (mySlotUM.isTHR) totalTHRRealtime += (hasilThrUM * mySlotUM.persen) / 100;
                }
            }

            var bagTransport = 0;
            if (cfg.transport) {
                var mySlotTr = self._slotArr(cfg.transport).find(function(s) { return s.karyawanId === k.id; });
                if (mySlotTr) bagTransport = ((cfg.transport.total || 0) * mySlotTr.persen) / 100;
            }

            var bagRacik = 0;
            if (cfg.racikObat) {
                var mySlotRacik = self._slotArr(cfg.racikObat).find(function(s) { return s.karyawanId === k.id; });
                if (mySlotRacik) {
                    var hasilThrRacik = rekap.totalNilaiRacik * (self._persenTHR(cfg.racikObat) / 100);
                    bagRacik = ((rekap.totalNilaiRacik - hasilThrRacik) * mySlotRacik.persen) / 100;
                    if (mySlotRacik.isTHR) totalTHRRealtime += (hasilThrRacik * mySlotRacik.persen) / 100;
                }
            }

            totalGajiPokok += gajiPokok;
            totalTunjanganJasa += jasaMedis + jasaDokter + jasaResepLuar + bagPoolKlinik + bagPoolApotek + bagTuslah + bagOmzet + bagUM + bagTransport + bagRacik;
        });

        return { totalGajiPokok: totalGajiPokok, totalTunjanganJasa: totalTunjanganJasa, totalTHR: totalTHRRealtime, total: totalGajiPokok + totalTunjanganJasa + totalTHRRealtime };
    },

    renderReport: function() {
        var container = document.getElementById('laporan-content');
        var self = this;

        // 1. KALKULASI PENDAPATAN (Dari Transaksi)
        var totalOmzet = 0, totalHPP = 0, totalLabaKotor = 0;
        var totalTindakan = 0, totalRacik = 0, totalJasaResep = 0, totalPembulatan = 0;
        var totalModalTindakan = 0;
        var cashMasuk = 0, transferMasuk = 0, qrisMasuk = 0;
        var totalPPNKeluaran = 0;

        this.dataTransaksi.forEach(function(t) {
            var omzetObat = t.items ? t.items.reduce(function(s, i) { return s + (i.jumlah * i.hargaJual); }, 0) : 0;
            var hppObat = t.items ? t.items.reduce(function(s, i) { var gross = i.jumlah * (i.hargaBeli || 0); var ppn = i.isPPN ? Math.round(gross - (gross / 1.11)) : 0; return s + (gross - ppn); }, 0) : 0;
            // FIX (AKURASI LABA KOTOR): "modal" tindakan (biaya bahan/reagen/strip per
            // tindakan -- field yang sama yang dipakai Master Tindakan untuk hitung
            // "Tuslah" & dipakai payroll.js/_hitungRekapBulanIniUntukPayroll untuk bagi
            // hasil staf) sebelumnya TIDAK PERNAH dikurangkan dari Laba Kotor di sini --
            // seluruh hargaJual tindakan dianggap laba 100%. Sekarang dihitung sebagai
            // biaya tersendiri (terpisah dari "Modal Obat (HPP)" supaya labelnya tetap
            // akurat), sehingga Laba Kotor & Laba Bersih tidak lagi digelembungkan.
            var modalTindakan = t.tindakanItems ? t.tindakanItems.reduce(function(s, ti) { return s + (ti.modal || 0); }, 0) : 0;

            // FIX (AKURASI OMZET): sebelumnya totalOmzet & totalLabaKotor TIDAK menyertakan
            // `pembulatan` (pembulatan ke atas ke kelipatan Rp1.000 saat checkout -- lihat
            // apotek/transaksi.js), padahal `cashMasuk+transferMasuk+qrisMasuk` di bawah
            // sudah memakai totalAkhir (yang SUDAH termasuk pembulatan). Akibatnya "Total
            // Omzet" & "Kas Masuk" pada laporan yang SAMA tidak akan pernah pas satu sama
            // lain -- selisihnya sebesar total pembulatan periode berjalan. Sekarang
            // pembulatan disertakan supaya kedua angka konsisten & sama-sama merefleksikan
            // uang yang sungguh diterima dari pasien/pelanggan.
            totalOmzet += omzetObat + (t.totalRacik || 0) + (t.totalTindakan || 0) + (t.jasaResep || 0) + (t.pembulatan || 0);
            totalHPP += hppObat;
            totalModalTindakan += modalTindakan;
            totalTindakan += (t.totalTindakan || 0);
            totalRacik += (t.totalRacik || 0);
            totalJasaResep += (t.jasaResep || 0);
            totalPembulatan += (t.pembulatan || 0);
            totalLabaKotor += (omzetObat - hppObat) + (t.totalRacik || 0) + (t.totalTindakan || 0) - modalTindakan + (t.jasaResep || 0) + (t.pembulatan || 0);

            // Hitung atau ambil PPN Keluaran
            var ppn = 0;
            if (t.totalPPN !== undefined) {
                ppn = t.totalPPN;
            } else if (t.items) {
                t.items.forEach(function(item) {
                    if (item.isPPN !== false) {
                        var sub = item.jumlah * item.hargaJual;
                        ppn += Math.round(sub - (sub / 1.11));
                    }
                });
            }
            totalPPNKeluaran += ppn;

            if (t.metodeBayar === 'cash') cashMasuk += t.totalAkhir || 0;
            else if (t.metodeBayar === 'transfer') transferMasuk += t.totalAkhir || 0;
            else if (t.metodeBayar === 'qris') qrisMasuk += t.totalAkhir || 0;
        });

        // 2. KALKULASI PENGELUARAN
        // FIX (CACAT LOGIKA KEUANGAN - DOBEL HITUNG): dulu SEMUA dokumen kasKeluar approved
        // (this.dataPengeluaran) langsung dijumlah rata sebagai "Biaya Operasional Lain", termasuk:
        //  - Pelunasan Hutang Usaha -> ini perpindahan Kas->Hutang (neraca), biayanya SUDAH diakui
        //    sbg HPP saat obat terjual. Kalau ikut dijumlah lagi di sini, terpotong DUA KALI.
        //  - Pembayaran Gaji (kategori 'gaji') -> SUDAH dihitung terpisah sbg totalBebanPayroll dari
        //    koleksi payrollHistory. Kalau ikut dijumlah lagi di sini, gaji terpotong DUA KALI.
        //  - THR -> beban riil & TIDAK dobel hitung, tapi dipisah ke baris "Beban THR" sendiri
        //    supaya tidak tersamar generik jadi "Biaya Operasional Lain".
        // Sekarang masing-masing dipisah pakai field `tipeArusKas` (ditulis oleh hutang.js &
        // payroll.js). Untuk data LAMA yang belum punya field ini, fallback ke `kategori` supaya
        // tetap terklasifikasi benar tanpa perlu migrasi data.
        var totalOperasional = 0, totalBeliTunai = 0, totalBeliKredit = 0;
        var totalBayarHutang = 0, totalTHR = 0, totalTHRPembayaran = 0;
        var totalPPNMasukan = 0;

        this.dataPengeluaran.forEach(function(p) {
            var tipe = p.tipeArusKas || (
                p.kategori === 'Hutang Usaha' ? 'pelunasan_hutang' :
                p.kategori === 'gaji' ? 'gaji_payroll' :
                p.kategori === 'Tunjangan Hari Raya (THR)' ? 'thr_payroll' : 'operasional'
            );
            if (tipe === 'pelunasan_hutang') {
                totalBayarHutang += p.jumlah || 0; // arus kas saja, BUKAN beban -> tidak masuk totalOperasional
            } else if (tipe === 'gaji_payroll') {
                // sengaja diabaikan sepenuhnya di sini -- sudah terhitung via totalBebanPayroll
            } else if (tipe === 'thr_payroll') {
                totalTHR += p.jumlah || 0; totalTHRPembayaran += p.jumlah || 0; // arus kas THR; beban ditentukan dari pembentukan THR
            } else {
                totalOperasional += p.jumlah || 0;
            }
        });

        this.dataPembelian.forEach(function(b) {
            var valBeli = b.totalHarga || 0;
            if (b.metodePembayaran === 'tunai') totalBeliTunai += valBeli;
            else totalBeliKredit += valBeli;

            // Hitung atau ambil PPN Masukan
            var ppn = 0;
            if (b.totalPPN !== undefined) {
                ppn = b.totalPPN;
            } else if (b.items) {
                b.items.forEach(function(item) {
                    if (item.isPPN !== false) {
                        var qty = item.qty || item.jumlah || 0;
                        var sub = qty * (item.hargaBeli || 0);
                        ppn += Math.round(sub - (sub / 1.11));
                    }
                });
            }
            totalPPNMasukan += ppn;
        });

        // FITUR BARU: Beban Payroll (Gaji + Tunjangan). Sebelumnya laporan ini SAMA SEKALI tidak
        // memasukkan beban gaji karyawan, sehingga Laba Bersih yang ditampilkan tidak realistis.
        var totalGajiPokok = 0, totalTunjanganJasa = 0, totalTHRTerbentuk = 0;
        this.dataPayroll.forEach(function(g) {
            var gp = g.gajiPokok || 0;
            // payrollHistory baru menyimpan grossPayroll. Data lama direkonstruksi
            // dari net pay + potongan agar histori tetap dapat diaudit tanpa migrasi.
            var gross = g.grossPayroll !== undefined
                ? g.grossPayroll
                : (g.totalGaji || 0) + (g.potKasbon || 0) + (g.potWisata || 0);
            totalGajiPokok += gp;
            totalTunjanganJasa += Math.max(0, gross - gp);
            totalTHRTerbentuk += g.thrBulanIni || 0;
        });
        var totalBebanPayroll = totalGajiPokok + totalTunjanganJasa;

        // FITUR BARU: Pemasukan Lain (Non-Penjualan) — mis. selisih retur tukar barang yang
        // DITERIMA dari supplier, otomatis tercatat di koleksi kasMasuk saat retur dikonfirmasi.
        var totalPemasukanLain = 0;
        this.dataPemasukanLain.forEach(function(m) { totalPemasukanLain += m.jumlah || 0; });

        // INTEGRASI: total pendapatan non-operasional (modul Pendapatan Lain - sewa, bunga bank,
        // komisi, dll). Berbeda dari totalPemasukanLain (selisih retur tukar barang dari kasMasuk),
        // tapi sama-sama menambah Laba Bersih & Total Kas Masuk agar nilai keuangan keseluruhan benar.
        var totalPendapatanLain = 0;
        this.dataPendapatanLain.forEach(function(p) { totalPendapatanLain += p.jumlah || 0; });

        // FIX: totalKasKeluar sekarang menghitung SEMUA kas keluar riil tanpa dobel/kurang hitung --
        // totalBayarHutang ditambahkan eksplisit (dulu tersembunyi di totalOperasional), totalTHR
        // dipisah dari totalOperasional (jumlahnya tetap sama, cuma pindah baris).
        var totalKasKeluar = totalOperasional + totalTHR + totalBeliTunai + totalBebanPayroll + totalBayarHutang;
        // FIX: labaBersih TIDAK LAGI mengurangi totalBayarHutang (bukan beban -- lihat catatan di
        // atas). totalTHR tetap dikurangi (memang beban riil), hanya dipisah biar jelas sumbernya.
        var bebanTHR = totalTHRTerbentuk > 0 ? totalTHRTerbentuk : totalTHRPembayaran;
        var labaBersih = totalLabaKotor - totalOperasional - bebanTHR - totalBebanPayroll + totalPemasukanLain + totalPendapatanLain;

        // FITUR BARU: perbandingan omzet dengan bulan sebelumnya (pertumbuhan)
        var omzetBulanLalu = 0;
        this.dataTransaksiPrev.forEach(function(t) {
            var omzetObat = t.items ? t.items.reduce(function(s, i) { return s + (i.jumlah * i.hargaJual); }, 0) : 0;
            // FIX (AKURASI OMZET): sertakan pembulatan juga di sini supaya perbandingan
            // pertumbuhan omzet (bulan ini vs bulan lalu) memakai basis yang sama persis
            // dengan totalOmzet di atas -- bukan basis yang berbeda.
            omzetBulanLalu += omzetObat + (t.totalRacik || 0) + (t.totalTindakan || 0) + (t.jasaResep || 0) + (t.pembulatan || 0);
        });
        var pertumbuhanOmzet = omzetBulanLalu > 0 ? ((totalOmzet - omzetBulanLalu) / omzetBulanLalu) * 100 : null;

        // FITUR BARU: rasio keuangan dasar
        var marginLabaKotor = totalOmzet > 0 ? (totalLabaKotor / totalOmzet) * 100 : 0;
        var marginLabaBersih = totalOmzet > 0 ? (labaBersih / totalOmzet) * 100 : 0;

        // ============================================================
        // FITUR BARU: LAPORAN KEUANGAN BAYANGAN (Real-Time / Akrual)
        // ============================================================
        // Beda dengan "Laba Bersih" di atas (basis KAS — payroll baru kehitung
        // begitu tombol "Bayarkan" ditekan), laporan ini basis AKRUAL:
        // 1) Payroll dihitung REAL-TIME pakai formula sama seperti modul Payroll,
        //    walau belum pernah dibayarkan sepeser pun bulan ini.
        // 2) Hutang usaha yang jatuh tempo s/d akhir bulan ini ikut dikurangi,
        //    walau belum dibayar.
        // Tujuannya: PSA bisa lihat untung/rugi SESUNGGUHNYA kapan saja di
        // tengah bulan, tanpa nunggu payroll & hutang benar-benar cair.
        var payrollRealtime = this._hitungPayrollRealtime();

        var hutangJatuhTempoBulanIni = 0;
        var daftarHutangJatuhTempo = (this.dataHutangBelumLunas || []).filter(function(h) {
            return h.jatuhTempo && h.jatuhTempo <= self.endDate;
        });
        daftarHutangJatuhTempo.forEach(function(h) { hutangJatuhTempoBulanIni += h.totalHarga || 0; });

        var labaBersihBayangan = totalLabaKotor - totalOperasional - totalTHR - payrollRealtime.total + totalPemasukanLain + totalPendapatanLain;
        var selisihVsResmi = labaBersihBayangan - labaBersih; // kewajiban yg blm cair tapi sudah kehitung di sini

        // Simpan ringkasan supaya bisa dipakai fungsi export tanpa hitung ulang
        this.summary = {
            totalOmzet: totalOmzet, totalHPP: totalHPP, totalLabaKotor: totalLabaKotor,
            totalTindakan: totalTindakan, totalRacik: totalRacik, totalJasaResep: totalJasaResep, totalPembulatan: totalPembulatan,
            totalModalTindakan: totalModalTindakan,
            cashMasuk: cashMasuk, transferMasuk: transferMasuk, qrisMasuk: qrisMasuk,
            totalOperasional: totalOperasional, totalBeliTunai: totalBeliTunai, totalBeliKredit: totalBeliKredit,
            totalBayarHutang: totalBayarHutang, totalTHR: bebanTHR, totalTHRTerbentuk: totalTHRTerbentuk, totalTHRPembayaran: totalTHRPembayaran,
            totalGajiPokok: totalGajiPokok, totalTunjanganJasa: totalTunjanganJasa, totalBebanPayroll: totalBebanPayroll,
            totalPemasukanLain: totalPemasukanLain,
            totalPendapatanLain: totalPendapatanLain,
            totalKasKeluar: totalKasKeluar, labaBersih: labaBersih,
            marginLabaKotor: marginLabaKotor, marginLabaBersih: marginLabaBersih, pertumbuhanOmzet: pertumbuhanOmzet,
            // PPN & Net values
            totalPPNKeluaran: totalPPNKeluaran,
            totalPPNMasukan: totalPPNMasukan,
            nilaiBersihPenjualan: totalOmzet - totalPPNKeluaran,
            nilaiBersihPembelian: (totalBeliTunai + totalBeliKredit) - totalPPNMasukan,
            netTaxToPay: totalPPNKeluaran - totalPPNMasukan,
            // FITUR BARU: Laporan Bayangan
            payrollRealtimeGajiPokok: payrollRealtime.totalGajiPokok,
            payrollRealtimeTunjanganJasa: payrollRealtime.totalTunjanganJasa,
            payrollRealtimeTotal: payrollRealtime.total,
            hutangJatuhTempoBulanIni: hutangJatuhTempoBulanIni,
            daftarHutangJatuhTempo: daftarHutangJatuhTempo,
            labaBersihBayangan: labaBersihBayangan,
            selisihVsResmi: selisihVsResmi
        };

        // 3. RENDER UI
        // FITUR BARU (permintaan user): tombol export hanya untuk akun Keuangan --
        // role lain (admin/psa) yang bisa membuka halaman ini tetap bisa lihat
        // laporan, tapi tidak bisa export filenya.
        var html = '<div class="flex justify-end mb-4">';
        if (window.currentRole === 'keuangan') {
            html += '  <button onclick="AppKeuanganLaporanKeuangan.exportExcel()" class="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2"><i data-lucide="file-spreadsheet" class="w-4 h-4"></i> Export Laporan (Excel)</button>';
        }
        html += '</div>';

        // FITUR BARU: kartu rasio & pertumbuhan
        html += '<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">';
        html += '  <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4"><p class="text-xs text-slate-400 mb-1">Margin Laba Kotor</p><p class="text-xl font-bold text-primary-600">' + marginLabaKotor.toFixed(1) + '%</p></div>';
        html += '  <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4"><p class="text-xs text-slate-400 mb-1">Margin Laba Bersih</p><p class="text-xl font-bold ' + (marginLabaBersih >= 0 ? 'text-emerald-600' : 'text-red-600') + '">' + marginLabaBersih.toFixed(1) + '%</p></div>';
        html += '  <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4"><p class="text-xs text-slate-400 mb-1">Pertumbuhan Omzet vs Bulan Lalu</p><p class="text-xl font-bold ' + (pertumbuhanOmzet === null ? 'text-slate-400' : (pertumbuhanOmzet >= 0 ? 'text-emerald-600' : 'text-red-600')) + '">' + (pertumbuhanOmzet === null ? 'N/A' : (pertumbuhanOmzet >= 0 ? '+' : '') + pertumbuhanOmzet.toFixed(1) + '%') + '</p></div>';
        html += '</div>';

        html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">';
        
        // Kartu 1: Ringkasan Laba/Rugi (Gross vs Net breakdown)
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">';
        html += '  <h3 class="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><i data-lucide="trending-up" class="w-5 h-5 text-emerald-500"></i> Ringkasan Laba/Rugi</h3>';
        html += '  <div class="space-y-3 text-sm">';
        html += '    <div class="flex justify-between"><span class="text-slate-500">Omzet Penjualan (Gross)</span><span class="font-semibold text-gray-800 dark:text-white">' + Utils.formatRupiah(totalOmzet) + '</span></div>';
        html += '    <div class="flex justify-between pl-4 text-xs"><span class="text-slate-400">- PPN Keluaran (11%)</span><span class="text-amber-500">' + Utils.formatRupiah(totalPPNKeluaran) + '</span></div>';
        html += '    <div class="flex justify-between pl-4 text-xs font-semibold text-emerald-600"><span class="text-slate-500"># Penjualan Bersih (Net)</span><span>' + Utils.formatRupiah(totalOmzet - totalPPNKeluaran) + '</span></div>';
        html += '    <div class="flex justify-between pl-4 text-xs"><span class="text-slate-400">- Modal Obat (HPP)</span><span class="text-red-500">' + Utils.formatRupiah(totalHPP) + '</span></div>';
        html += '    <div class="flex justify-between pl-4 text-xs"><span class="text-slate-400">- Modal/Bahan Tindakan</span><span class="text-red-500">' + Utils.formatRupiah(totalModalTindakan) + '</span></div>';
        html += '    <div class="flex justify-between pl-4 text-xs"><span class="text-slate-400">+ Tindakan & Jasa</span><span class="text-emerald-500">' + Utils.formatRupiah(totalTindakan + totalJasaResep) + '</span></div>';
        html += '    <div class="flex justify-between pl-4 text-xs"><span class="text-slate-400">+ Racik & Lainnya</span><span class="text-emerald-500">' + Utils.formatRupiah(totalRacik) + '</span></div>';
        html += '    <div class="flex justify-between border-t border-slate-100 pt-2"><span class="font-semibold text-slate-600 dark:text-slate-300">Laba Kotor</span><span class="font-bold text-primary-600">' + Utils.formatRupiah(totalLabaKotor) + '</span></div>';
        html += '    <div class="flex justify-between pl-4 text-xs"><span class="text-slate-400">- Gaji Pokok Karyawan</span><span class="text-red-500">' + Utils.formatRupiah(totalGajiPokok) + '</span></div>';
        html += '    <div class="flex justify-between pl-4 text-xs"><span class="text-slate-400">- Tunjangan & Jasa Pembagian Hasil</span><span class="text-red-500">' + Utils.formatRupiah(totalTunjanganJasa) + '</span></div>';
        if (totalPemasukanLain > 0) {
            html += '    <div class="flex justify-between pl-4 text-xs"><span class="text-slate-400">+ Pemasukan Lain (Retur Tukar Barang, dll)</span><span class="text-emerald-500">' + Utils.formatRupiah(totalPemasukanLain) + '</span></div>';
        }
        if (totalPendapatanLain > 0) {
            html += '    <div class="flex justify-between pl-4 text-xs"><span class="text-slate-400">+ Pendapatan Lain (Sewa, Bunga Bank, Komisi, dll)</span><span class="text-emerald-500">' + Utils.formatRupiah(totalPendapatanLain) + '</span></div>';
        }
        html += '    <div class="flex justify-between pl-4 text-xs"><span class="text-slate-400">- Biaya Operasional Lain</span><span class="text-red-500">' + Utils.formatRupiah(totalOperasional) + '</span></div>';
        if (totalTHR > 0) {
            html += '    <div class="flex justify-between pl-4 text-xs"><span class="text-slate-400">- Beban THR</span><span class="text-red-500">' + Utils.formatRupiah(totalTHR) + '</span></div>';
        }
        html += '    <div class="flex justify-between border-t-2 border-slate-200 pt-3 mt-2"><span class="font-bold text-gray-800 dark:text-white">LABA BERSIH</span><span class="font-bold text-lg ' + (labaBersih >= 0 ? 'text-emerald-600' : 'text-red-600') + '">' + Utils.formatRupiah(labaBersih) + '</span></div>';
        html += '    <p class="text-[10px] text-slate-400 pt-1">*Pelunasan Hutang Usaha TIDAK dikurangkan di sini -- itu perpindahan Kas ke Hutang (neraca), biayanya sudah termasuk dalam Modal Obat (HPP) saat obat terjual. Lihat kartu Arus Kas untuk nilai kas yang keluar untuk bayar hutang.</p>';
        html += '  </div>';
        html += '</div>';

        // Kartu 2: Arus Kas (Cash Flow)
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">';
        html += '  <h3 class="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><i data-lucide="wallet" class="w-5 h-5 text-sky-500"></i> Arus Kas Bulan Ini</h3>';
        html += '  <div class="space-y-3 text-sm">';
        html += '    <div class="flex justify-between"><span class="text-slate-500">Kas Masuk (Cash)</span><span class="font-semibold text-emerald-500">' + Utils.formatRupiah(cashMasuk) + '</span></div>';
        html += '    <div class="flex justify-between"><span class="text-slate-500">Kas Masuk (Transfer)</span><span class="font-semibold text-emerald-500">' + Utils.formatRupiah(transferMasuk) + '</span></div>';
        html += '    <div class="flex justify-between"><span class="text-slate-500">Kas Masuk (QRIS)</span><span class="font-semibold text-emerald-500">' + Utils.formatRupiah(qrisMasuk) + '</span></div>';
        if (totalPemasukanLain > 0) {
            html += '    <div class="flex justify-between"><span class="text-slate-500">Pemasukan Lain (Retur Tukar Barang, dll)</span><span class="font-semibold text-emerald-500">' + Utils.formatRupiah(totalPemasukanLain) + '</span></div>';
        }
        if (totalPendapatanLain > 0) {
            html += '    <div class="flex justify-between"><span class="text-slate-500">Pendapatan Lain (Sewa, Bunga Bank, Komisi, dll)</span><span class="font-semibold text-emerald-500">' + Utils.formatRupiah(totalPendapatanLain) + '</span></div>';
        }
        html += '    <div class="flex justify-between border-t border-slate-100 pt-2"><span class="font-semibold text-slate-600 dark:text-slate-300">Total Kas Masuk</span><span class="font-bold text-emerald-600">' + Utils.formatRupiah(cashMasuk + transferMasuk + qrisMasuk + totalPemasukanLain + totalPendapatanLain) + '</span></div>';
        html += '    <div class="flex justify-between mt-4"><span class="text-slate-500">Beli Obat Tunai</span><span class="text-red-500">' + Utils.formatRupiah(totalBeliTunai) + '</span></div>';
        html += '    <div class="flex justify-between"><span class="text-slate-500">Pengeluaran Operasional</span><span class="text-red-500">' + Utils.formatRupiah(totalOperasional) + '</span></div>';
        if (totalTHR > 0) {
            html += '    <div class="flex justify-between"><span class="text-slate-500">Pembayaran THR</span><span class="text-red-500">' + Utils.formatRupiah(totalTHR) + '</span></div>';
        }
        html += '    <div class="flex justify-between"><span class="text-slate-500">Pembayaran Payroll (Gaji+Tunjangan)</span><span class="text-red-500">' + Utils.formatRupiah(totalBebanPayroll) + '</span></div>';
        if (totalBayarHutang > 0) {
            // FIX: baris baru -- dulu tersembunyi di dalam "Pengeluaran Operasional", sekarang
            // tampil eksplisit sebagai kas keluar utk pelunasan hutang (BUKAN beban P&L).
            html += '    <div class="flex justify-between"><span class="text-slate-500">Pembayaran Hutang Usaha (Cicilan Faktur)</span><span class="text-red-500">' + Utils.formatRupiah(totalBayarHutang) + '</span></div>';
        }
        html += '    <div class="flex justify-between border-t-2 border-slate-200 pt-3 mt-2"><span class="font-bold text-gray-800 dark:text-white">TOTAL KAS KELUAR</span><span class="font-bold text-lg text-red-600">' + Utils.formatRupiah(totalKasKeluar) + '</span></div>';
        html += '  </div>';
        html += '</div>';
        html += '</div>';

        // Kartu Baru: Rekap Pajak PPN & Nilai Bersih
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6">';
        html += '  <h3 class="font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2"><i data-lucide="percent" class="w-5 h-5 text-indigo-500"></i> Rekapitulasi Pajak (PPN 11%) & Nilai Bersih</h3>';
        html += '  <p class="text-xs text-slate-400 dark:text-slate-500 mb-4">Ringkasan Nilai Bersih (Net) dan PPN otomatis dari setiap transaksi penjualan & pembelian untuk mempermudah SPT Masa PPN bulanan.</p>';
        html += '  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">';
        
        // PPN Penjualan (Keluaran)
        html += '    <div class="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 space-y-2">';
        html += '      <p class="font-semibold text-gray-800 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-1">PPN Keluaran (Penjualan)</p>';
        html += '      <div class="flex justify-between text-xs"><span class="text-slate-500">Omzet Penjualan (Gross)</span><span class="font-medium">' + Utils.formatRupiah(totalOmzet) + '</span></div>';
        html += '      <div class="flex justify-between text-xs text-indigo-600 font-semibold"><span class="text-slate-500">Total PPN Keluaran</span><span>' + Utils.formatRupiah(totalPPNKeluaran) + '</span></div>';
        html += '      <div class="flex justify-between text-xs border-t border-slate-100 dark:border-slate-800 pt-1 font-semibold text-emerald-600"><span class="text-slate-500">Nilai Penjualan Bersih</span><span>' + Utils.formatRupiah(totalOmzet - totalPPNKeluaran) + '</span></div>';
        html += '    </div>';

        // PPN Pembelian (Masukan)
        var totalBeliGross = totalBeliTunai + totalBeliKredit;
        html += '    <div class="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 space-y-2">';
        html += '      <p class="font-semibold text-gray-800 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-1">PPN Masukan (Pembelian)</p>';
        html += '      <div class="flex justify-between text-xs"><span class="text-slate-500">Total Pembelian (Gross)</span><span class="font-medium">' + Utils.formatRupiah(totalBeliGross) + '</span></div>';
        html += '      <div class="flex justify-between text-xs text-indigo-600 font-semibold"><span class="text-slate-500">Total PPN Masukan</span><span>' + Utils.formatRupiah(totalPPNMasukan) + '</span></div>';
        html += '      <div class="flex justify-between text-xs border-t border-slate-100 dark:border-slate-800 pt-1 font-semibold text-emerald-600"><span class="text-slate-500">Nilai Pembelian Bersih</span><span>' + Utils.formatRupiah(totalBeliGross - totalPPNMasukan) + '</span></div>';
        html += '    </div>';

        // Estimasi Kurang / Lebih Bayar
        var netTax = totalPPNKeluaran - totalPPNMasukan;
        var isKurangBayar = netTax >= 0;
        var statusTaxText = isKurangBayar ? 'PPN Kurang Bayar (Wajib Setor)' : 'PPN Lebih Bayar (Kompensasi)';
        var statusColor = isKurangBayar ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400';
        
        html += '    <div class="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 rounded-lg p-4 space-y-2">';
        html += '      <p class="font-semibold text-indigo-800 dark:text-indigo-300 border-b border-indigo-100 dark:border-indigo-900 pb-1">Status SPT Pajak Bulanan</p>';
        html += '      <p class="text-xs font-semibold ' + statusColor + '">' + statusTaxText + '</p>';
        html += '      <div class="flex justify-between text-lg pt-2 border-t border-indigo-100 dark:border-indigo-900 font-bold text-indigo-700 dark:text-indigo-400">';
        html += '        <span>ESTIMASI PAJAK:</span>';
        html += '        <span>' + Utils.formatRupiah(Math.abs(netTax)) + '</span>';
        html += '      </div>';
        html += '    </div>';

        html += '  </div>';
        html += '</div>';

        // Kartu 3: Hutang & Piutang Info
        html += '<div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5 flex items-center gap-4 mb-6">';
        html += '  <i data-lucide="alert-circle" class="w-8 h-8 text-amber-500 flex-shrink-0"></i>';
        html += '  <div class="text-sm text-amber-700 dark:text-amber-400">';
        html += '    <p class="font-semibold">Total Pembelian Kredit Bulan Ini: ' + Utils.formatRupiah(totalBeliKredit) + '</p>';
        html += '    <p class="text-xs mt-1">*Pembelian kredit tidak mempengaruhi Arus Kas bulan ini, tapi akan mempengaruhi saat faktur dilunasi di modul Hutang Usaha.</p>';
        html += '  </div>';
        html += '</div>';

        // ============================================================
        // Kartu 4: LAPORAN KEUANGAN BAYANGAN (Real-Time / Akrual)
        // ============================================================
        if (window.currentRole !== 'psa') {
            var isUntung = labaBersihBayangan >= 0;
            var badgeBayangan = isUntung
                ? '<span class="text-xs font-bold bg-emerald-500 text-white px-3 py-1 rounded-full">SUDAH UNTUNG</span>'
                : '<span class="text-xs font-bold bg-red-500 text-white px-3 py-1 rounded-full animate-pulse">MASIH MINUS</span>';

            html += '<div class="bg-white dark:bg-slate-800 rounded-xl border-2 border-primary-200 dark:border-primary-800 p-5 mb-6">';
            html += '  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">';
            html += '    <h3 class="font-bold text-gray-800 dark:text-white flex items-center gap-2"><i data-lucide="ghost" class="w-5 h-5 text-primary-500"></i> Laporan Keuangan Bayangan (Real-Time)</h3>';
            html += '    ' + badgeBayangan;
            html += '  </div>';
            html += '  <p class="text-xs text-slate-400 dark:text-slate-500 mb-4">Estimasi laba PSA sesungguhnya — payroll dihitung real-time (walau belum ditekan "Bayarkan"). Hutang supplier ditampilkan terpisah karena pembayaran hutang bukan beban laba.</p>';

            html += '  <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">';
            html += '    <div class="space-y-2 text-sm">';
            html += '      <div class="flex justify-between"><span class="text-slate-500">Laba Kotor</span><span class="font-semibold text-gray-800 dark:text-white">' + Utils.formatRupiah(totalLabaKotor) + '</span></div>';
            html += '      <div class="flex justify-between pl-4 text-xs"><span class="text-slate-400">- Gaji Pokok (real-time)</span><span class="text-red-500">' + Utils.formatRupiah(payrollRealtime.totalGajiPokok) + '</span></div>';
            html += '      <div class="flex justify-between pl-4 text-xs"><span class="text-slate-400">- Tunjangan & Jasa (real-time)</span><span class="text-red-500">' + Utils.formatRupiah(payrollRealtime.totalTunjanganJasa) + '</span></div>';
            html += '      <div class="flex justify-between pl-4 text-xs"><span class="text-slate-400">- Biaya Operasional Lain</span><span class="text-red-500">' + Utils.formatRupiah(totalOperasional) + '</span></div>';
            if (totalTHR > 0) {
                html += '      <div class="flex justify-between pl-4 text-xs"><span class="text-slate-400">- Beban THR</span><span class="text-red-500">' + Utils.formatRupiah(totalTHR) + '</span></div>';
            }
            if (totalPemasukanLain > 0) {
                html += '      <div class="flex justify-between pl-4 text-xs"><span class="text-slate-400">+ Pemasukan Lain</span><span class="text-emerald-500">' + Utils.formatRupiah(totalPemasukanLain) + '</span></div>';
            }
            html += '      <div class="flex justify-between pl-4 text-xs"><span class="text-slate-400">Hutang Jatuh Tempo (informasi, bukan beban)</span><span class="text-amber-600">' + Utils.formatRupiah(hutangJatuhTempoBulanIni) + '</span></div>';
            html += '      <div class="flex justify-between border-t-2 border-slate-200 pt-3 mt-2"><span class="font-bold text-gray-800 dark:text-white">LABA BERSIH BAYANGAN</span><span class="font-bold text-lg ' + (isUntung ? 'text-emerald-600' : 'text-red-600') + '">' + Utils.formatRupiah(labaBersihBayangan) + '</span></div>';
            html += '    </div>';

            html += '    <div class="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 text-sm space-y-2">';
            html += '      <div class="flex justify-between"><span class="text-slate-500">Laba Bersih resmi (basis kas)</span><span class="font-semibold text-gray-700 dark:text-slate-300">' + Utils.formatRupiah(labaBersih) + '</span></div>';
            html += '      <div class="flex justify-between"><span class="text-slate-500">Laba Bersih Bayangan (basis akrual)</span><span class="font-semibold ' + (isUntung ? 'text-emerald-600' : 'text-red-600') + '">' + Utils.formatRupiah(labaBersihBayangan) + '</span></div>';
            html += '      <div class="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2"><span class="text-slate-500">Selisih</span><span class="font-bold ' + (selisihVsResmi <= 0 ? 'text-red-500' : 'text-emerald-500') + '">' + (selisihVsResmi > 0 ? '+' : '') + Utils.formatRupiah(selisihVsResmi) + '</span></div>';
            html += '      <p class="text-xs text-slate-400 pt-1">Selisih terutama berasal dari payroll yang sudah menjadi beban tetapi belum dibayarkan; hutang supplier tidak mengurangi laba lagi karena HPP dicatat saat barang terjual.</p>';
            if (daftarHutangJatuhTempo.length > 0) {
                html += '      <p class="text-xs text-amber-600 dark:text-amber-400 pt-1 font-medium">' + daftarHutangJatuhTempo.length + ' faktur hutang jatuh tempo s/d akhir bulan ini, lihat detail di modul Hutang Usaha.</p>';
            }
            html += '    </div>';
            html += '  </div>';
            html += '</div>';
        }

        // Tabel Rincian Transaksi
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
        html += '  <div class="p-4 border-b border-slate-200 dark:border-slate-700"><h3 class="font-semibold text-gray-800 dark:text-white">Rincian Transaksi Penjualan</h3></div>';
        html += '  <div class="overflow-x-auto max-h-96 overflow-y-auto">';
        html += '    <table class="w-full text-sm">';
        html += '      <thead class="bg-slate-50 dark:bg-slate-900 sticky top-0"><tr class="text-xs text-slate-500 uppercase">';
        html += '        <th class="px-4 py-3 text-left">Tanggal</th><th class="px-4 py-3 text-left">Pasien</th><th class="px-4 py-3 text-left">Tipe</th><th class="px-4 py-3 text-left">Bayar</th><th class="px-4 py-3 text-right">Total</th>';
        html += '      </tr></thead><tbody>';
        
        if (this.dataTransaksi.length === 0) {
            html += '<tr><td colspan="5" class="text-center py-6 text-slate-400">Tidak ada transaksi bulan ini.</td></tr>';
        } else {
            this.dataTransaksi.forEach(function(t) {
                html += '<tr class="border-t border-slate-100 dark:border-slate-700">';
                html += '<td class="px-4 py-3 text-xs text-slate-500">' + (t.tanggal || '-') + '</td>';
                html += '<td class="px-4 py-3 font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(t.namaPasien || 'Bebas') + '</td>';
                html += '<td class="px-4 py-3 text-xs"><span class="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">' + Utils.escapeHtml(t.tipe || '-') + '</span></td>';
                html += '<td class="px-4 py-3 text-xs uppercase">' + Utils.escapeHtml(t.metodeBayar || '-') + '</td>';
                html += '<td class="px-4 py-3 text-right font-semibold text-gray-800 dark:text-white">' + Utils.formatRupiah(t.totalAkhir) + '</td>';
                html += '</tr>';
            });
        }
        html += '      </tbody></table>';
        html += '  </div>';
        html += '</div>';

        container.innerHTML = html;
        lucide.createIcons();
    },

    // FITUR BARU: export laporan lengkap ke Excel (multi-sheet: Ringkasan, Rincian Transaksi, Rincian Pengeluaran)
    exportExcel: function() {
        // FITUR BARU (permintaan user): export laporan keuangan khusus akun Keuangan.
        // Tombolnya sudah disembunyikan untuk role lain di render(), ini lapisan
        // kedua supaya fungsi ini tetap aman kalau dipanggil langsung (mis. dari console).
        if (window.currentRole !== 'keuangan') {
            Utils.toast('Export laporan keuangan hanya untuk akun Keuangan.', 'error');
            return;
        }
        if (!this.summary) { Utils.toast('Tampilkan laporan dahulu sebelum export.', 'error'); return; }
        var s = this.summary;
        var bulan = document.getElementById('filter-bulan').value;

        var wb = XLSX.utils.book_new();

        var ringkasan = [
            ['LAPORAN KEUANGAN - Aulia Apotek Klinik'], ['Periode: ' + bulan], [],
            ['RINGKASAN LABA/RUGI', ''],
            ['Omzet Penjualan (Gross)', s.totalOmzet],
            ['PPN Keluaran (11%)', -s.totalPPNKeluaran],
            ['Penjualan Bersih (Net)', s.totalOmzet - s.totalPPNKeluaran],
            ['Modal Obat (HPP Gross)', -s.totalHPP],
            ['Est. PPN Masukan (11%)', s.totalPPNMasukan],
            ['Modal Obat (HPP Net)', -(s.totalHPP - s.totalPPNMasukan)],
            ['Modal/Bahan Tindakan', -s.totalModalTindakan],
            ['Tindakan & Jasa', s.totalTindakan + s.totalJasaResep],
            ['Racik & Lainnya', s.totalRacik],
            ['Laba Kotor', s.totalLabaKotor],
            ['Gaji Pokok Karyawan', -s.totalGajiPokok],
            ['Tunjangan & Jasa Pembagian Hasil', -s.totalTunjanganJasa],
            ['Pemasukan Lain (Retur Tukar Barang, dll)', s.totalPemasukanLain || 0],
            ['Pendapatan Lain (Sewa, Bunga Bank, Komisi, dll)', s.totalPendapatanLain || 0],
            ['Biaya Operasional Lain', -s.totalOperasional],
            ['Beban THR', -(s.totalTHR || 0)],
            ['LABA BERSIH', s.labaBersih], [],
            ['*Catatan: Pelunasan Hutang Usaha TIDAK dikurangkan di atas -- itu perpindahan Kas ke Hutang (neraca), biayanya sudah termasuk dalam Modal Obat (HPP) saat obat terjual. Lihat bagian Arus Kas.'], [],
            ['ARUS KAS', ''],
            ['Kas Masuk (Cash)', s.cashMasuk],
            ['Kas Masuk (Transfer)', s.transferMasuk],
            ['Kas Masuk (QRIS)', s.qrisMasuk],
            ['Pemasukan Lain (Retur Tukar Barang, dll)', s.totalPemasukanLain || 0],
            ['Pendapatan Lain (Sewa, Bunga Bank, Komisi, dll)', s.totalPendapatanLain || 0],
            ['Total Kas Masuk', s.cashMasuk + s.transferMasuk + s.qrisMasuk + (s.totalPemasukanLain || 0) + (s.totalPendapatanLain || 0)],
            ['Beli Obat Tunai', -s.totalBeliTunai],
            ['Pengeluaran Operasional', -s.totalOperasional],
            ['Pembayaran THR', -(s.totalTHR || 0)],
            ['Pembayaran Payroll', -s.totalBebanPayroll],
            ['Pembayaran Hutang Usaha (Cicilan Faktur)', -(s.totalBayarHutang || 0)],
            ['Total Kas Keluar', -s.totalKasKeluar], [],
            ['Pembelian Kredit (belum lunas)', s.totalBeliKredit], [],
            ['REKAPITULASI PAJAK (PPN 11%)', ''],
            ['Total PPN Keluaran', s.totalPPNKeluaran],
            ['Total PPN Masukan', s.totalPPNMasukan],
            ['Pajak Kurang/Lebih Bayar', s.netTaxToPay], [],
            ['RASIO', ''],
            ['Margin Laba Kotor', s.marginLabaKotor.toFixed(1) + '%'],
            ['Margin Laba Bersih', s.marginLabaBersih.toFixed(1) + '%'],
            ['Pertumbuhan Omzet vs Bulan Lalu', s.pertumbuhanOmzet === null ? 'N/A' : s.pertumbuhanOmzet.toFixed(1) + '%']
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ringkasan), 'Ringkasan');

        var trxRows = [['Tanggal', 'Pasien', 'Tipe', 'Metode Bayar', 'Total']];
        this.dataTransaksi.forEach(function(t) {
            trxRows.push([t.tanggal || '-', t.namaPasien || 'Bebas', t.tipe || '-', t.metodeBayar || '-', t.totalAkhir || 0]);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(trxRows), 'Rincian Transaksi');

        var keluarRows = [['Tanggal', 'Keterangan', 'Kategori', 'Jumlah']];
        this.dataPengeluaran.forEach(function(p) {
            keluarRows.push([p.tanggal || '-', p.keterangan || '-', p.kategori || '-', p.jumlah || 0]);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(keluarRows), 'Rincian Pengeluaran');

        if (this.dataPemasukanLain && this.dataPemasukanLain.length > 0) {
            var masukRows = [['Tanggal', 'Keterangan', 'Kategori', 'Jumlah']];
            this.dataPemasukanLain.forEach(function(m) {
                masukRows.push([m.tanggal || '-', m.keterangan || '-', m.kategori || '-', m.jumlah || 0]);
            });
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(masukRows), 'Rincian Pemasukan Lain');
        }

        if (this.dataPendapatanLain && this.dataPendapatanLain.length > 0) {
            var pendLainRows = [['Tanggal', 'Kategori', 'Keterangan', 'Jumlah']];
            this.dataPendapatanLain.forEach(function(p) {
                pendLainRows.push([p.tanggal || '-', p.kategori || '-', p.keterangan || '-', p.jumlah || 0]);
            });
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pendLainRows), 'Rincian Pendapatan Lain');
        }

        if (window.currentRole !== 'psa') {
            // FITUR BARU: sheet Laporan Bayangan (Real-Time / Akrual)
            var bayangan = [
                ['LAPORAN KEUANGAN BAYANGAN (Real-Time / Akrual)'], ['Periode: ' + bulan], [],
                ['Laba Kotor', s.totalLabaKotor],
                ['Gaji Pokok (real-time)', -s.payrollRealtimeGajiPokok],
                ['Tunjangan & Jasa (real-time)', -s.payrollRealtimeTunjanganJasa],
                ['Biaya Operasional Lain', -s.totalOperasional],
                ['Beban THR', -(s.totalTHR || 0)],
                ['Pemasukan Lain', s.totalPemasukanLain || 0],
                ['Pendapatan Lain (Sewa, Bunga Bank, Komisi, dll)', s.totalPendapatanLain || 0],
                ['Hutang Jatuh Tempo Bulan Ini', -s.hutangJatuhTempoBulanIni],
                ['LABA BERSIH BAYANGAN', s.labaBersihBayangan], [],
                ['Laba Bersih resmi (basis kas)', s.labaBersih],
                ['Selisih (kewajiban blm cair)', s.selisihVsResmi]
            ];
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(bayangan), 'Laporan Bayangan');
        }

        if (s.daftarHutangJatuhTempo && s.daftarHutangJatuhTempo.length > 0) {
            var hutangRows = [['No. Faktur', 'Supplier', 'Jatuh Tempo', 'Status', 'Total Hutang']];
            s.daftarHutangJatuhTempo.forEach(function(h) {
                hutangRows.push([h.noFaktur || '-', h.supplier || '-', h.jatuhTempo || '-', h.statusPelunasan || '-', h.totalHarga || 0]);
            });
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(hutangRows), 'Hutang Jatuh Tempo');
        }

        XLSX.writeFile(wb, 'Laporan_Keuangan_' + bulan + '.xlsx');
        Utils.toast('Laporan berhasil diexport ke Excel!', 'success');
    }
}