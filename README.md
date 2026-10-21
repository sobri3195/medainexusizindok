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

Prasyarat: Node.js 24 (disarankan), minimum 22.18 untuk seluruh pengujian, dan npm.

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

## Validasi identitas, obat PRB, dan cairan dialisis

Modul tambahan berada di **Workbench → Validasi Penyerahan** (`/desktop/dispensing`). Stack dan fitur lama dipertahankan. Mode selalu **DEMO / SIMULATION_ONLY**, seluruh data sintetis; integrasi produksi **NOT_CONNECTED**.

Gunakan Node.js 24 (disarankan; pengujian TypeScript native memerlukan Node ≥22.18) dan npm:

```bash
npm install --package-lock=false
npm run dev
npm test
npm run lint
npm run test:browser
```

Repository belum memiliki lockfile. `--package-lock=false` mempertahankan kebijakan tersebut; resolusi baru dapat berbeda. Browser test memakai `/usr/bin/chromium` jika tersedia, `CHROMIUM_PATH` jika disetel, atau Chromium Playwright yang dipasang dengan `npx playwright install chromium`.

Demonstrasi:

1. Login sebagai **Admin Demo** (password demo di halaman login).
2. Buka **Validasi Penyerahan → Verifikasi Peserta**. Pilih peserta 1, metode FACE/FINGERPRINT, dan SUCCESS. Hasil tetap SIMULATION_ONLY.
3. Buka **Obat PRB**, pilih RX-0001, klik simulasi `DEMO-BC-0001`, isi jumlah ≤30, lalu tinjau dan konfirmasi.
4. Untuk dialisis gunakan RX-0002 dan `DEMO-BC-0002`. RX-0009 menyediakan produk kedaluwarsa. Barcode 9999 tidak dikenal; produk 0002 tidak cocok dengan resep PRB 0001.
5. Riwayat menyediakan pembatalan dan uji duplikat. Periksa Dashboard, Data Explorer, Evaluasi Data, Audit Trail, Status Integrasi, dan Pengaturan & Role.
6. Coba peserta 2 (tanpa hak), peserta 3 (kepemilikan akun gagal), serta skenario FAILED/PENDING/EXPIRED/REQUIRES_REVIEW/UNAVAILABLE/NOT_CONNECTED.

Satu hak demo hanya digunakan sekali, termasuk penyerahan sebagian. Pembatalan tidak membuka hak lagi. Tidak ada biometrik mentah, foto, NIK, atau rahasia yang disimpan. Role dan audit browser adalah demonstrasi, bukan kontrol keamanan produksi.

Lihat [audit, diagram, skema, kontrak adapter, penggantian dataset, evaluasi field, dan pertanyaan untuk pemilik layanan](docs/VALIDASI-PENYERAHAN.md).

Untuk demo offline, gunakan build produksi dan preview, buka sekali online sampai service worker aktif. Semua chunk aplikasi diprecache. Ini tidak menyediakan integrasi/sinkronisasi BPJS atau membuktikan konsumsi produk.

Generator dataset skenario (tujuh tabel JSON/CSV terpisah, snapshot, dan manifest skenario):

```bash
npm run data:synthetic
# Default: /tmp/jelas-synthetic; direktori lain dapat ditentukan:
npm run data:synthetic -- /tmp/jelas-evaluasi
```

File generator tidak diimpor otomatis ke database browser; fixture pengujian dan data demonstrasi pengguna tetap terpisah.

## Analisis diagnosis sekunder dari Stata

Tersedia **Workbench → Analisis Diagnosis**, dengan jalur konversi `.dta` lokal menjadi JSON agregat lalu analisis kualitas/frekuensi berbasis aturan. File mentah tidak dimasukkan ke Git, database demo, atau layanan AI eksternal. Contoh sintetis dan agregat pengguna diberi label terpisah.

File `DM2024_diagnosissekunder.dta` yang dilampirkan belum diproses karena melebihi batas transfer 32 MiB. Panduan konversi, batas privasi, kebutuhan pemetaan kolom, dan langkah lanjutan ada di [Analisis Diagnosis](docs/ANALISIS-DIAGNOSIS.md).

### Dataset FKRTL

Profil **FKRTL** kini tersedia pada Analisis Diagnosis. Konversi menggunakan `--dataset FKRTL` dan kolom diagnosis yang dikonfirmasi dari kamus data; importer memeriksa profil sebelum menerima ringkasan. Profil FKRTL dan diagnosis sekunder tidak digabung otomatis. Format lama tetap didukung sebagai `UNSPECIFIED`.

Lampiran `DM2024_fkrtl.dta` belum terbaca karena melebihi batas transfer 32 MiB. Tidak ada data asli atau hasil analisisnya yang disertakan. Lihat [langkah pengolahan FKRTL dan kebutuhan file lanjutan](docs/DATA-FKRTL.md).

## Model terlatih untuk review kualitas data

JELAS kini menyertakan regresi logistik **yang benar-benar dilatih pada data sintetis**: 4.000 contoh training, 1.000 validasi, 1.000 test. Target: prioritas review kualitas data diagnosis, bukan fraud/penyakit atau hak layanan. ROC-AUC test sintetis 0,756; Brier 0,198 dibanding baseline 0,248.

Buka **Analisis Diagnosis → Muat contoh model sintetis** untuk melihat skor dan kontribusi fitur. Model menahan prediksi pada agregat pengguna dan fitur di luar rentang training. Kedua file DM2024 tidak digunakan untuk training karena belum dapat diakses.

Training ulang: pasang `tools/requirements-training.txt`, lalu `npm run model:train`. Detail data, label, split, metrik, keterbatasan, dan kebutuhan label nyata ada pada [model card](docs/MODEL-QUALITY.md).

## Data nonkapitasi dan model struktur terlatih

Lampiran `DM2024_nonkapitasi.dta` berhasil diolah: 3.890 baris dan 24 kolom. Pipeline baru melatih Isolation Forest pada fitur struktur (3.170 baris training, 720 holdout; peserta antar-split tidak beririsan). Hanya dua pola fitur ditemukan, sehingga kemampuan model terbatas. Tidak ada label reviewer atau klaim akurasi klinis/fraud.

**Workbench → Analisis Nonkapitasi** menerima laporan JSON privat hasil pipeline; raw data dan model pengguna tidak disertakan dalam Git/bundle. Ringkasan diagnosis dapat diimpor melalui profil **Nonkapitasi**. Lihat [hasil, batasan, lokasi privat, dan cara menjalankan](docs/NONKAPITASI.md).
