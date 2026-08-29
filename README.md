# MedAI Nexus – Izin Dok

Frontend prototype claim-integrity dan clinical evidence workbench. Seluruh data dalam aplikasi bersifat **sintetis** dan tidak menggunakan data peserta JKN riil.

## Menjalankan

```bash
npm install
npm run dev
```

Rute utama: `/` (publik), `/apps` (pasien/caregiver), dan `/desktop` (workbench). Data demo persisten disimpan lokal via IndexedDB; localStorage hanya menyimpan preferensi tema.

## Keamanan dan batasan

- Impor lokal dibatasi pada JSON/CSV maksimal 5 MB. Backup JSON divalidasi dengan Zod, identifier dibatasi ke pola sintetis, dan teks berbahaya ditolak sebelum transaksi IndexedDB.
- Deployment Vercel menggunakan CSP, anti-sniffing, referrer policy, permissions policy, serta proteksi framing. Tidak ada secret atau kredensial produksi di frontend; password demo yang terlihat **bukan autentikasi**.
- Sesi workbench demo kedaluwarsa setelah 30 menit dan seluruh konten yang ditampilkan dirender melalui escaping React tanpa `dangerouslySetInnerHTML`.

Kontrol frontend memperkecil risiko, tetapi **bukan pengganti** autentikasi, otorisasi, validasi, audit, rate limiting, enkripsi, dan kontrol akses di server produksi.
