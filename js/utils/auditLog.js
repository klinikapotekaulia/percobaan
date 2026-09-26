/**
 * js/utils/auditLog.js
 * Audit Trail sederhana untuk transaksi keuangan penting.
 *
 * KENAPA FILE INI ADA:
 * Sebelumnya tidak ada jejak siapa-melakukan-apa untuk aksi keuangan
 * (approve pengeluaran, lunasi hutang, jurnal manual, payroll, dst).
 * Kalau ada kejanggalan angka, tidak ada cara melacak siapa yang
 * mengubah/menyetujui data tersebut dan kapan.
 *
 * CARA PAKAI (dari module manapun, setelah operasi Firestore berhasil):
 *   AuditLog.catat({
 *       aksi: 'approve',              // tambah | ubah | hapus | approve | tolak | bayar
 *       modul: 'Pengeluaran Kas',     // nama modul/koleksi yang mudah dibaca manusia
 *       koleksi: 'kasKeluar',         // nama koleksi Firestore terkait
 *       targetId: id,                 // id dokumen terkait (jika ada)
 *       deskripsi: 'Approve pengeluaran: Beli ATK',
 *       nominal: 50000                // opsional, jika transaksi punya nilai uang
 *   });
 *
 * PENTING: pencatatan ini "fire and forget" — dipanggil SETELAH operasi
 * utama sukses, dan kegagalannya TIDAK BOLEH menggagalkan/menghentikan
 * alur utama (hanya di-log ke console). Audit trail hanya jejak
 * tambahan, bukan bagian dari transaksi bisnis itu sendiri.
 *
 * Dokumen bersifat write-once (create only): lihat firestore.rules,
 * koleksi 'auditLog' tidak boleh diubah atau dihapus siapapun, termasuk
 * admin, supaya jejaknya tetap bisa dipercaya.
 */

window.AuditLog = {

    catat: function (opts) {
        opts = opts || {};
        try {
            var user = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;

            var entry = {
                aksi:      opts.aksi      || 'lainnya',
                modul:     opts.modul     || '-',
                koleksi:   opts.koleksi   || null,
                targetId:  opts.targetId  || null,
                deskripsi: opts.deskripsi || '',
                nominal:   (typeof opts.nominal === 'number') ? opts.nominal : null,
                oleh:      window.currentUserName || (user && user.email) || 'Sistem',
                olehUid:   user ? user.uid : null,
                role:      window.currentRole || null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            return db.collection('auditLog').add(entry).catch(function (err) {
                // Sengaja tidak ditampilkan ke user (toast) — kegagalan logging
                // tidak boleh terlihat seperti kegagalan transaksi utama.
                console.error('AuditLog: gagal mencatat jejak audit:', err);
            });
        } catch (err) {
            console.error('AuditLog: error tak terduga:', err);
            return Promise.resolve();
        }
    }
};
