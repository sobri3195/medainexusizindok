# MedAI Nexus – JELAS

JELAS (Jejak Evaluasi Layanan dan Analisis Sinyal) adalah **prototype frontend-only** untuk pendamping perawatan dan workbench integritas klaim yang explainable. Aplikasi membantu petugas FKTP dan FKRTL mengelola bukti sintetis, menelusuri *reason code*, serta memprioritaskan kasus yang **perlu review**. Hasil mesin risiko hanyalah indikasi; keputusan akhir selalu dilakukan manusia dan tidak boleh memblokir pelayanan pasien. Kondisi emergensi harus langsung diarahkan ke pelayanan tanpa blokir administratif.

> **Status integrasi:** prototype ini tidak terintegrasi dengan BPJS, SATUSEHAT, SIMRS, OTP, maupun TTE. Model/risk engine demo belum divalidasi klinis atau operasional.

## Stack

- React 19, TypeScript, React Router, dan Vite
- Tailwind CSS 4 dan Lucide React
- Recharts untuk visualisasi yang dimuat per rute
- Dexie/IndexedDB untuk penyimpanan lokal dan Zod untuk validasi impor
- PWA/service worker dengan pembaruan cache versi dan strategi network-first untuk navigasi
- Tanpa backend dan tanpa environment variable wajib

## Struktur route

| Route | Fungsi |
| --- | --- |
| `/` | Landing page publik |
| `/apps` | Beranda aplikasi pasien/caregiver sintetis |
| `/apps/activity`, `/apps/therapy`, `/apps/referral`, `/apps/account` | Aktivitas, terapi, rujukan, dan pengaturan akun demo |
| `/desktop/login` | Pemilih akun/persona demo |
| `/desktop` | Ringkasan workbench |
| `/desktop/queue`, `/desktop/permit/:claimId`, `/desktop/comparison` | Antrian berpaginasi, detail, dan perbandingan kasus |
| `/desktop/capd`, `/desktop/pharmacy`, `/desktop/dpjp` | Modul simulasi CAPD, PRB FKTP, dan indikasi konflik DPJP |
| `/desktop/risk-engine`, `/desktop/reports`, `/desktop/metrics` | Risk engine, laporan, dan kamus metrik simulasi |
| `/desktop/settings` | Reset, ekspor, impor, dan pemeriksaan data lokal |

Seluruh halaman dimuat secara lazy berdasarkan route. Modul chart ikut terpisah dari bundle awal, dan tabel antrian menggunakan pagination 10 baris agar seed 10.000 kasus tidak merender ribuan DOM node sekaligus.

## Install dan menjalankan lokal

Prasyarat: Node.js 20+ dan npm.

```bash
npm install
npm run dev
```

Buka URL yang ditampilkan Vite. Aplikasi tidak bergantung pada `localhost`; URL tersebut hanya alamat development server lokal.

## Pemeriksaan dan production build

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run preview
```

Hasil build berada di `dist/`. Refresh langsung pada `/apps`, `/apps/*`, `/desktop`, dan `/desktop/*` didukung oleh SPA rewrite.

## Deploy ke Vercel

1. Import repository ke Vercel.
2. Framework preset dapat menggunakan **Vite**.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Tidak perlu menambahkan environment variable.
6. Deploy. `vercel.json` sudah mengatur rewrite SPA, cache aset ber-hash, service worker tanpa cache permanen, dan security headers yang kompatibel.

## Akun demo

Masuk melalui `/desktop/login`, pilih persona mana pun, lalu gunakan:

- **Password:** `demo123`
- Persona: DPJP, Perawat CAPD, Apoteker FKTP, Verifikator, Komite Medik, atau Admin Demo

Autentikasi ini hanya simulasi lokal dan tidak layak digunakan sebagai autentikasi produksi.

## Reset data

1. Masuk sebagai **Admin Demo**.
2. Buka **Pengaturan Demo** (`/desktop/settings`).
3. Pilih jumlah seed dan skenario, lalu klik **Jalankan simulasi**; atau ketik `HAPUS` dan gunakan **Reset data awal**.
4. Untuk mengulang onboarding aplikasi mobile, hapus data lokal melalui menu **Akun** atau hapus site data dari browser.

## Export dan import

- Pada **Pengaturan Demo**, pilih **Backup JSON** untuk backup lengkap atau **Export CSV** untuk laporan tabular.
- Pilih file `.json` pada kontrol impor. Struktur dan duplikasi diperiksa sebelum restore transaksional.
- CSV hanya dipreview; restore penuh menggunakan backup JSON.
- Seluruh file ekspor berisi data sintetis. Periksa kembali sebelum membagikannya.

## Keterbatasan prototype

- Tidak ada backend, sinkronisasi lintas perangkat, API eksternal, atau autentikasi produksi.
- Risk engine dan metrik merupakan simulasi deterministik, belum divalidasi sebagai model AI/klinis, dan bukan bukti pelanggaran.
- Label “perlu review”, indikasi, dan *reason code* tidak menghasilkan keputusan otomatis atau penolakan pelayanan.
- Dataset tersimpan pada IndexedDB browser; mode privat, kebijakan browser, atau penghapusan site data dapat menghilangkannya.
- Fitur kamera, notifikasi, dokumen, appointment, dan alur offline adalah demonstrasi UI, bukan proses layanan nyata.
- Nama fasilitas, tenaga kesehatan, peserta, token, nomor rujukan, dan dokumen seluruhnya sintetis/simulasi. Tidak ada NIK, nomor peserta nyata, foto pasien nyata, atau identitas riil.

## Disclaimer privasi dan klinis

Gunakan aplikasi hanya dengan data sintetis. Jangan memasukkan NIK, nomor peserta, foto, dokumen, atau identitas pasien nyata. JELAS bukan alat diagnosis, bukan pengganti penilaian klinis, dan bukan sistem penentu eligibilitas. Reviewer manusia tetap bertanggung jawab atas keputusan akhir. Pelayanan emergensi harus diberikan tanpa diblokir oleh status, skor, kelengkapan bukti, atau keluaran prototype ini.
