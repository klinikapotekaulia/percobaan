/**
 * js/apotek/pembelian.js
 * Pembelian Obat (Cash & Kredit)
 */

window.AppApotekPembelian = {
    obatList: [],

    render: function() {
        var html = '<div class="page-enter max-w-5xl">';
        html += '  <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-1">Pembelian Obat</h2>';
        html += '  <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Catat pembelian Cash/Tunai & Kredit/Tempo</p>';
        html += '  <div id="pembelian-content"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        DataCache.getObat().then(snap => {
            AppApotekPembelian.obatList = [];
            snap.forEach(doc => { var d = doc.data(); d.id = doc.id; AppApotekPembelian.obatList.push(d); });
            AppApotekPembelian.obatList.sort((a, b) => (a.namaObat || '').localeCompare(b.namaObat || ''));
            AppApotekPembelian.renderForm();
        }).catch(err => Utils.toast('Gagal memuat: ' + err.message, 'error'));
    },

    renderForm: function() {
        var today = Utils.today(); // FIX: pakai tanggal lokal, bukan UTC
        var html = '';

        // INFO HEADER
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">';
        html += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">';
        html += '<div><label class="block text-xs font-medium text-slate-500 mb-1">No. Faktur *</label><input type="text" id="beli-nofaktur" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="FAK-001" required></div>';
        html += '<div><label class="block text-xs font-medium text-slate-500 mb-1">Tanggal *</label><input type="date" id="beli-tgl" value="' + today + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" required></div>';
        html += '<div><label class="block text-xs font-medium text-slate-500 mb-1">Supplier *</label><input type="text" id="beli-supplier" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="PT. Kimia Farma" required></div>';
        
        // TAMBAHAN: METODE PEMBAYARAN
        html += '<div><label class="block text-xs font-medium text-slate-500 mb-1">Metode Bayar *</label>';
        html += '<select id="beli-metode" onchange="AppApotekPembelian.toggleKredit()" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" required>';
        html += '<option value="tunai">Tunai (Cash)</option>';
        html += '<option value="kredit">Kredit (Tempo)</option>';
        html += '</select></div>';
        html += '</div>';

        // TAMBAHAN: FIELD JATUH TEMPO (Hanya muncul kalau kredit)
        html += '<div id="beli-kredit-wrapper" class="hidden mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">';
        html += '<div><label class="block text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Jatuh Tempo *</label><input type="date" id="beli-jatuh-tempo" class="w-full px-3 py-2 border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg text-sm"></div>';
        html += '<div class="flex items-end"><p class="text-xs text-amber-600 dark:text-amber-400 pb-2">⚠️ Pembelian ini akan masuk ke daftar <strong>Hutang Usaha</strong> dan harus dilunasi sebelum tanggal jatuh tempo.</p></div>';
        html += '</div>';

        html += '</div>';

        // KERANJANG INPUT OBAT
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">';
        html += '<div class="flex justify-between items-center mb-3"><h3 class="font-semibold text-gray-800 dark:text-white">Daftar Obat</h3><button type="button" onclick="AppApotekPembelian.addItem()" class="text-sm bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-3 py-1.5 rounded-lg font-medium hover:bg-primary-100">+ Tambah Obat</button></div>';
        html += '<div id="beli-items-container" class="space-y-2">';
        html += '<p class="text-sm text-slate-400 italic p-2">Klik tambah obat untuk mulai input.</p>';
        html += '</div></div>';

        // TOTAL & SIMPAN
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6">';
        html += '<div class="flex justify-between items-center">';
        html += '<div>';
        html += '  <p class="text-sm text-slate-500">Total Item: <span id="beli-total-item" class="font-semibold text-gray-800 dark:text-white">0</span></p>';
        html += '  <p class="text-sm text-slate-500">Total Harga (Gross): <span id="beli-total-harga" class="font-semibold text-gray-800 dark:text-white">Rp 0</span></p>';
        html += '  <p class="text-xs text-slate-400">- Est. PPN Masukan (11%): <span id="beli-total-ppn" class="font-medium text-slate-500">Rp 0</span></p>';
        html += '  <p class="text-xs text-slate-400"># Nilai Bersih Pembelian: <span id="beli-nilai-bersih" class="font-medium text-slate-500">Rp 0</span></p>';
        html += '</div>';
        html += '<button onclick="AppApotekPembelian.simpan()" class="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg transition-all text-sm flex items-center gap-2"><i data-lucide="save" class="w-4 h-4"></i> Simpan Pembelian</button>';
        html += '</div></div>';

        // RIWAYAT PEMBELIAN
        html += '<div id="beli-riwayat"></div>';

        document.getElementById('pembelian-content').innerHTML = html;
        lucide.createIcons();
        this.loadRiwayat();
    },

    // FUNGSI BARU: Toggle tampilan field kredit
    toggleKredit: function() {
        var metode = document.getElementById('beli-metode').value;
        var wrapper = document.getElementById('beli-kredit-wrapper');
        if (metode === 'kredit') {
            wrapper.classList.remove('hidden');
        } else {
            wrapper.classList.add('hidden');
        }
    },

    addItem: function() {
        var container = document.getElementById('beli-items-container');
        if (container.querySelector('p.italic')) container.innerHTML = '';

        var idx = container.children.length;
        var html = '<div id="beli-row-' + idx + '" class="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-900/30">';
        html += '<div class="flex flex-col md:flex-row gap-3 items-start md:items-end">';
        
        html += '<div class="w-full md:w-2/5"><label class="block text-xs text-slate-500 mb-1">Pilih Obat</label>';
        html += '<select id="beli-obat-' + idx + '" onchange="AppApotekPembelian.onSelectObat(' + idx + ')" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="">-- Pilih --</option>';
        this.obatList.forEach(function(o) {
            html += '<option value="' + o.id + '">' + Utils.escapeHtml(o.namaObat) + ' (Stok: ' + (o.stok || 0) + ')</option>';
        });
        html += '</select></div>';

        html += '<div class="w-full md:w-1/6"><label class="block text-xs text-slate-500 mb-1">Qty</label><input type="number" id="beli-qty-' + idx + '" value="1" min="1" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm text-center" oninput="AppApotekPembelian.hitungTotal()"></div>';
        html += '<div class="w-full md:w-1/6"><label class="block text-xs text-slate-500 mb-1">Harga Beli</label><input type="number" id="beli-harga-' + idx + '" value="0" min="0" step="any" required class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm text-right" oninput="AppApotekPembelian.hitungTotal()"></div>';
        html += '<div class="w-full md:w-1/6"><label class="block text-xs text-slate-500 mb-1">Subtotal</label><div id="beli-sub-' + idx + '" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm text-right font-medium text-slate-600">Rp 0</div></div>';
        
        html += '<button type="button" onclick="AppApotekPembelian.removeItem(' + idx + ')" class="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg self-end md:self-center"><i data-lucide="trash-2" class="w-4 h-4"></i></button>';
        html += '</div></div>';

        container.insertAdjacentHTML('beforeend', html);
        lucide.createIcons({ nodes: [container] });
        SearchableSelect.attach('beli-obat-' + idx, { placeholder: 'Ketik nama obat...' });
    },

    onSelectObat: function(idx) {
        var obatId = document.getElementById('beli-obat-' + idx).value;
        if (obatId) {
            var obat = this.obatList.find(o => o.id === obatId);
            if (obat) {
                document.getElementById('beli-harga-' + idx).value = obat.hpp || 0;
                this.hitungTotal();
            }
        }
    },

    removeItem: function(idx) {
        var row = document.getElementById('beli-row-' + idx);
        if (row) row.remove();
        var container = document.getElementById('beli-items-container');
        if (container.children.length === 0) {
            container.innerHTML = '<p class="text-sm text-slate-400 italic p-2">Klik tambah obat untuk mulai input.</p>';
        }
        this.hitungTotal();
    },

    hitungTotal: function() {
        var container = document.getElementById('beli-items-container');
        var rows = container.querySelectorAll('[id^="beli-row-"]');
        var totalItem = 0, totalHarga = 0, totalPPN = 0;
        rows.forEach(row => {
            var idx = row.id.split('-').pop();
            var obatId = document.getElementById('beli-obat-' + idx)?.value;
            var qty = parseInt(document.getElementById('beli-qty-' + idx)?.value) || 0;
            var harga = parseInt(document.getElementById('beli-harga-' + idx)?.value) || 0;
            var sub = qty * harga;
            document.getElementById('beli-sub-' + idx).textContent = Utils.formatRupiah(sub);
            totalItem += qty;
            totalHarga += sub;

            var obat = this.obatList.find(o => o.id === obatId);
            var isPPN = obat ? (obat.isPPN !== false) : true;
            if (isPPN) {
                totalPPN += Math.round(sub - (sub / 1.11));
            }
        });
        var nilaiBersih = totalHarga - totalPPN;
        document.getElementById('beli-total-item').textContent = totalItem;
        document.getElementById('beli-total-harga').textContent = Utils.formatRupiah(totalHarga);
        document.getElementById('beli-total-ppn').textContent = Utils.formatRupiah(totalPPN);
        document.getElementById('beli-nilai-bersih').textContent = Utils.formatRupiah(nilaiBersih);
    },

    simpan: function() {
        // FIX (BUG KLIK DOBEL): sama seperti js/apotek/transaksi.js -- sebelumnya
        // tombol "Simpan Pembelian" tidak di-disable & tidak ada flag guard, jadi
        // klik dobel bisa membuat pembelian (dan penambahan stok) tersimpan dua kali.
        if (this._isSaving) return;
        this._isSaving = true;
        var btnSimpan = document.querySelector('#pembelian-content button[onclick="AppApotekPembelian.simpan()"]');
        if (btnSimpan) { btnSimpan.disabled = true; btnSimpan.classList.add('opacity-50', 'cursor-not-allowed'); }
        var self = this;
        var _resetGuard = function() {
            self._isSaving = false;
            if (btnSimpan) { btnSimpan.disabled = false; btnSimpan.classList.remove('opacity-50', 'cursor-not-allowed'); }
        };

        var noFaktur = document.getElementById('beli-nofaktur').value.trim();
        var tgl = document.getElementById('beli-tgl').value;
        var supplier = document.getElementById('beli-supplier').value.trim();
        var metode = document.getElementById('beli-metode').value;
        var jatuhTempo = document.getElementById('beli-jatuh-tempo').value;

        if (!noFaktur || !tgl || !supplier || !metode) {
            Utils.toast('Lengkapi semua data header', 'error');
            _resetGuard(); return;
        }
        if (metode === 'kredit' && !jatuhTempo) {
            Utils.toast('Jatuh tempo wajib diisi untuk pembelian kredit', 'error');
            _resetGuard(); return;
        }

        var items = [];
        var itemInvalid = false;
        var rows = document.querySelectorAll('[id^="beli-row-"]');
        rows.forEach(row => {
            var idx = row.id.split('-').pop();
            var obatId = document.getElementById('beli-obat-' + idx)?.value;
            if (obatId) {
                var obat = this.obatList.find(o => o.id === obatId);
                var qty = parseInt(document.getElementById('beli-qty-' + idx).value);
                var hargaBeli = parseInt(document.getElementById('beli-harga-' + idx).value);
                if (isNaN(qty) || qty < 1 || isNaN(hargaBeli) || hargaBeli < 0) {
                    itemInvalid = true;
                }
                items.push({
                    obatId: obatId,
                    namaObat: obat ? obat.namaObat : '-',
                    kodeObat: obat ? obat.kodeObat : '-',
                    qty: qty || 0,
                    hargaBeli: hargaBeli || 0,
                    isPPN: obat ? (obat.isPPN !== false) : true
                });
            }
        });

        if (itemInvalid) {
            Utils.toast('Qty minimal 1 dan Harga Beli tidak boleh negatif', 'error');
            _resetGuard(); return;
        }

        if (items.length === 0) {
            Utils.toast('Tambahkan minimal 1 obat', 'error');
            _resetGuard(); return;
        }

        Utils.toast('Menyimpan & mengupdate stok...', 'info');
        var totalHarga = items.reduce((sum, item) => sum + (item.qty * item.hargaBeli), 0);
        var totalPPN = items.reduce((sum, item) => {
            if (item.isPPN) {
                var sub = item.qty * item.hargaBeli;
                return sum + Math.round(sub - (sub / 1.11));
            }
            return sum;
        }, 0);

        // FIX: simpan pembelian & update stok dalam satu batch atomik.
        var batch = db.batch();
        var pRef = db.collection('pembelian').doc();
        batch.set(pRef, {
            noFaktur: noFaktur,
            tanggal: tgl,
            supplier: supplier,
            metodePembayaran: metode,
            jatuhTempo: metode === 'kredit' ? jatuhTempo : null,
            statusPelunasan: metode === 'kredit' ? 'belum_lunas' : 'lunas',
            items: items,
            totalHarga: totalHarga,
            totalPPN: totalPPN,
            nilaiBersih: totalHarga - totalPPN,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        // FIX (KONSISTENSI STOK GANDA): gabungkan (sum) qty per obatId dulu -- sama
        // seperti pola yang sudah dipakai di js/apotek/transaksi.js & js/apotek/retur.js
        // -- untuk jaga-jaga kalau obat yang sama tidak sengaja ditambahkan di lebih
        // dari satu baris pada satu faktur pembelian.
        var qtyPerObat = {};
        items.forEach(function(item) {
            if (item.qty > 0) qtyPerObat[item.obatId] = (qtyPerObat[item.obatId] || 0) + item.qty;
        });
        Object.keys(qtyPerObat).forEach(function(obatId) {
            var obatRef = db.collection('obat').doc(obatId);
            batch.update(obatRef, { stok: firebase.firestore.FieldValue.increment(qtyPerObat[obatId]) });
        });
        batch.commit().then(() => {
            Utils.toast('Pembelian berhasil disimpan! Stok obat sudah bertambah.', 'success');
            AuditLog.catat({
                aksi: 'tambah', modul: 'Pembelian Stok', koleksi: 'pembelian', targetId: pRef.id,
                deskripsi: 'Pembelian dari ' + supplier + ' (Faktur ' + noFaktur + ', ' + metode + ')',
                nominal: totalHarga
            });
            _resetGuard();
            AppApotekPembelian.init();
        }).catch(err => {
            Utils.toast('Gagal menyimpan: ' + err.message, 'error');
            _resetGuard();
        });
    },

    loadRiwayat: function() {
        var container = document.getElementById('beli-riwayat');
        if(!container) return;

        db.collection('pembelian').orderBy('createdAt', 'desc').limit(10).get().then(snap => {
            var riwayat = [];
            snap.forEach(doc => { var d = doc.data(); d.id = doc.id; riwayat.push(d); });

            if (riwayat.length === 0) { container.innerHTML = ''; return; }

            var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden mt-6">';
            html += '<div class="bg-slate-50 dark:bg-slate-900 px-4 py-2 border-b border-slate-200 dark:border-slate-700"><h4 class="text-sm font-semibold text-slate-600 dark:text-slate-400">Riwayat Pembelian Terakhir</h4></div>';
            html += '<table class="w-full text-xs">';
            html += '<thead><tr class="text-slate-500 uppercase"><th class="px-3 py-2 text-left">Tanggal</th><th class="px-3 py-2 text-left">No. Faktur</th><th class="px-3 py-2 text-left">Metode</th><th class="px-3 py-2 text-left">Status</th><th class="px-3 py-2 text-right">Total</th></tr></thead><tbody>';
            
            riwayat.forEach(function(r) {
                var tgl = r.tanggal ? new Date(r.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
                
                // Badge Metode
                var metodeBadge = (r.metodePembayaran === 'kredit') ? 
                    '<span class="text-xs bg-amber-50 dark:bg-amber-900/30 text-amber-600 px-2 py-0.5 rounded-full">KREDIT</span>' : 
                    '<span class="text-xs bg-green-50 dark:bg-green-900/30 text-green-600 px-2 py-0.5 rounded-full">TUNAI</span>';

                // Badge Status Pelunasan
                var statusBadge = (r.statusPelunasan === 'belum_lunas') ? 
                    '<span class="text-xs bg-red-50 dark:bg-red-900/30 text-red-600 px-2 py-0.5 rounded-full ml-1">Belum Lunas</span>' : 
                    '<span class="text-xs bg-green-50 dark:bg-green-900/30 text-green-600 px-2 py-0.5 rounded-full ml-1">Lunas</span>';

                html += '<tr class="border-t border-slate-100 dark:border-slate-700">';
                html += '<td class="px-3 py-2">' + tgl + '</td>';
                html += '<td class="px-3 py-2 font-mono">' + Utils.escapeHtml(r.noFaktur) + '</td>';
                html += '<td class="px-3 py-2">' + metodeBadge + '</td>';
                html += '<td class="px-3 py-2">' + statusBadge + '</td>';
                html += '<td class="px-3 py-2 text-right font-semibold text-primary-600">' + Utils.formatRupiah(r.totalHarga) + '</td>';
                html += '</tr>';
            });

            html += '</tbody></table></div>';
            container.innerHTML = html;
        }).catch(err => console.error("Gagal load riwayat:", err));
    }
};