/**
 * js/klinik/riwayatPasien.js
 * Riwayat Pasien — Halaman Terpisah
 *
 * FITUR (permintaan dokter):
 * - Cari pasien (nama / No. RM) lalu tampilkan SELURUH riwayat kunjungan
 *   sebelumnya: keluhan, anamnesis, pemeriksaan fisik, diagnosa, tindakan.
 * - Untuk setiap kunjungan yang menghasilkan resep klinik, tampilkan juga
 *   obat yang benar-benar diracik/diserahkan apotek pada kunjungan itu
 *   (dicocokkan lewat rekamMedis.id <-> transaksi.resepId).
 *
 * FIRESTORE COLLECTIONS (dibaca, tidak ditulis oleh modul ini):
 *   - pasien     { nama, nomorRM, ... }               (lewat DataCache)
 *   - rekamMedis { pasienId, tanggal, namaDokter, diagnosa, tindakanItems[], ... }
 *   - transaksi  { resepId, items[], tipe: 'resep_klinik', ... }
 *
 * CARA PASANG:
 *   1. Tambahkan menu: { id: 'riwayat-pasien', label: 'Riwayat Pasien',
 *      icon: 'history', module: 'klinik/riwayatPasien' } di app.js (sudah ditambahkan)
 */

window.AppKlinikRiwayatPasien = {

    pasienList: [],
    selectedPasienId: '',

    // ===== RENDER =====
    render: function() {
        return [
            '<div class="page-enter max-w-4xl">',
            '  <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-1">Riwayat Pasien</h2>',
            '  <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Cari pasien untuk melihat seluruh riwayat pemeriksaan &amp; obat yang pernah dipakai</p>',

            '  <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-6">',
            '    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cari Pasien (Nama / No. RM)</label>',
            '    <select id="rwp-pasien" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" data-input-class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" onchange="AppKlinikRiwayatPasien.onPilihPasien()">',
            '      <option value="">-- Ketik nama atau No. RM --</option>',
            '    </select>',
            '  </div>',

            '  <div id="rwp-content"></div>',
            '</div>'
        ].join('');
    },

    // ===== INIT =====
    init: function() {
        var self = this;
        DataCache.getPasien().then(function(snap) {
            self.pasienList = [];
            snap.forEach(function(doc) {
                var d = doc.data(); d.id = doc.id; self.pasienList.push(d);
            });

            var sel = document.getElementById('rwp-pasien');
            if (!sel) return;
            self.pasienList.forEach(function(p) {
                var opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = (p.nama || '-') + (p.nomorRM ? ' — No. RM ' + p.nomorRM : '');
                sel.appendChild(opt);
            });

            if (window.SearchableSelect) {
                SearchableSelect.attach('rwp-pasien', { placeholder: 'Ketik nama atau No. RM pasien...' });
            }
        }).catch(function(err) {
            Utils.toast('Gagal memuat data pasien: ' + err.message, 'error');
        });
    },

    // ===== SAAT PASIEN DIPILIH =====
    onPilihPasien: function() {
        var pasienId = document.getElementById('rwp-pasien').value;
        this.selectedPasienId = pasienId;
        var container = document.getElementById('rwp-content');
        if (!container) return;

        if (!pasienId) { container.innerHTML = ''; return; }

        container.innerHTML = '<div class="flex justify-center py-16"><div class="spinner"></div></div>';

        var self = this;
        db.collection('rekamMedis')
            .where('pasienId', '==', pasienId)
            .orderBy('tanggal', 'desc')
            .get()
            .then(function(snap) {
                var kunjungan = [];
                snap.forEach(function(doc) { var d = doc.data(); d.id = doc.id; kunjungan.push(d); });

                if (kunjungan.length === 0) {
                    container.innerHTML = '<div class="text-center py-16 text-slate-400"><i data-lucide="file-search" class="w-10 h-10 mx-auto mb-3"></i><p class="font-semibold">Belum ada riwayat kunjungan untuk pasien ini</p></div>';
                    if (window.lucide) lucide.createIcons();
                    return;
                }

                // Ambil transaksi (obat yang diserahkan) untuk tiap kunjungan yang statusResep = selesai,
                // dicocokkan lewat resepId == id dokumen rekamMedis.
                var resepIds = kunjungan.map(function(k) { return k.id; });
                return self._fetchObatPerResep(resepIds).then(function(obatMap) {
                    self._renderTimeline(kunjungan, obatMap);
                });
            }).catch(function(err) {
                container.innerHTML = '<p class="text-red-500 text-center py-10">Gagal memuat riwayat: ' + Utils.escapeHtml(err.message) + '</p>';
            });
    },

    // Firestore 'in' query dibatasi 30 item per query -> pecah jadi beberapa batch agar aman.
    _fetchObatPerResep: function(resepIds) {
        if (resepIds.length === 0) return Promise.resolve({});
        var batches = [];
        for (var i = 0; i < resepIds.length; i += 30) batches.push(resepIds.slice(i, i + 30));

        return Promise.all(batches.map(function(batch) {
            return db.collection('transaksi').where('resepId', 'in', batch).get();
        })).then(function(snaps) {
            var map = {};
            snaps.forEach(function(snap) {
                snap.forEach(function(doc) {
                    var t = doc.data();
                    if (t.resepId) map[t.resepId] = t;
                });
            });
            return map;
        });
    },

    // ===== RENDER TIMELINE =====
    _renderTimeline: function(kunjungan, obatMap) {
        var container = document.getElementById('rwp-content');
        if (!container) return;

        var pasien = this.pasienList.find(function(p) { return p.id === this.selectedPasienId; }.bind(this));

        var html = '';
        if (pasien) {
            html += '<div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-5 flex flex-wrap gap-x-6 gap-y-1 text-sm">';
            html += '<span class="font-semibold text-gray-800 dark:text-white">' + Utils.escapeHtml(pasien.nama || '-') + '</span>';
            if (pasien.nomorRM) html += '<span class="text-slate-500 dark:text-slate-400">No. RM: ' + Utils.escapeHtml(pasien.nomorRM) + '</span>';
            html += '<span class="text-slate-500 dark:text-slate-400">' + kunjungan.length + ' kali kunjungan tercatat</span>';
            html += '</div>';
        }

        kunjungan.forEach(function(k) {
            var trx = obatMap[k.id];
            html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">';
            html += '  <div class="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100 dark:border-slate-700">';
            html += '    <div class="flex items-center gap-2"><i data-lucide="calendar" class="w-4 h-4 text-primary-500"></i><span class="font-semibold text-gray-800 dark:text-white">' + (k.tanggal || '-') + '</span></div>';
            html += '    <span class="text-xs text-slate-500 dark:text-slate-400">Dokter: ' + Utils.escapeHtml(k.namaDokter || '-') + '</span>';
            html += '  </div>';

            if (k.keluhan) html += '  <p class="text-sm mb-1"><span class="font-medium text-slate-600 dark:text-slate-300">Keluhan:</span> ' + Utils.escapeHtml(k.keluhan) + '</p>';
            if (k.anamnesis) html += '  <p class="text-sm mb-1"><span class="font-medium text-slate-600 dark:text-slate-300">Anamnesis:</span> ' + Utils.escapeHtml(k.anamnesis) + '</p>';
            if (k.pemeriksaanFisik) html += '  <p class="text-sm mb-1"><span class="font-medium text-slate-600 dark:text-slate-300">Pemeriksaan Fisik:</span> ' + Utils.escapeHtml(k.pemeriksaanFisik) + '</p>';
            if (k.diagnosa) html += '  <p class="text-sm mb-2"><span class="font-medium text-slate-600 dark:text-slate-300">Diagnosa:</span> <span class="font-semibold text-primary-600 dark:text-primary-400">' + Utils.escapeHtml(k.diagnosa) + '</span></p>';

            if (k.tindakanItems && k.tindakanItems.length > 0) {
                html += '  <div class="mt-2"><p class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Tindakan</p><ul class="text-sm list-disc list-inside text-slate-600 dark:text-slate-300">';
                k.tindakanItems.forEach(function(t) { html += '<li>' + Utils.escapeHtml(t.namaTindakan || '-') + '</li>'; });
                html += '</ul></div>';
            }

            if (trx && trx.items && trx.items.length > 0) {
                html += '  <div class="mt-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">';
                html += '    <p class="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase mb-1.5 flex items-center gap-1"><i data-lucide="pill" class="w-3.5 h-3.5"></i> Obat yang diserahkan apotek</p>';
                html += '    <ul class="text-sm text-slate-700 dark:text-slate-300 space-y-0.5">';
                trx.items.forEach(function(item) {
                    html += '<li>' + Utils.escapeHtml(item.namaObat || '-') + ' <span class="text-slate-400">x' + (item.jumlah || 0) + '</span></li>';
                });
                html += '    </ul></div>';
            } else if (k.diagnosa) {
                html += '  <p class="text-xs text-amber-600 dark:text-amber-400 mt-2 italic">Resep belum/tidak diproses di apotek.</p>';
            }

            if (k.catatan) html += '  <p class="text-xs text-slate-400 mt-3 italic">Catatan: ' + Utils.escapeHtml(k.catatan) + '</p>';
            html += '</div>';
        });

        container.innerHTML = html;
        if (window.lucide) lucide.createIcons();
    }
};
