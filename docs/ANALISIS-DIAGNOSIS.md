# Pengolahan diagnosis sekunder Stata untuk JELAS

File yang diminta: `DM2024_diagnosissekunder.dta`. File lampiran melebihi batas transfer tool 32 MiB. **File asli belum dapat diunduh, diperiksa skemanya, diproses, atau digunakan melatih model.** Angka contoh aplikasi berasal dari fixture sintetis; tidak ada hasil file asli yang dikarang.

PR #14 sebelumnya sudah tergabung ke main. Perubahan ini dibuat pada branch baru dari main dan menambahkan jalur pengolahan lokal, bukan memasukkan dataset kesehatan mentah ke Git atau database demo.

## Alur yang tersedia

1. Di mesin dengan akses sah terhadap file, periksa nama kolom saja:

```bash
python -m pip install -r tools/requirements-diagnoses.txt
python tools/process_diagnoses.py /path/DM2024_diagnosissekunder.dta --inspect
```

2. Konfirmasi kolom kode diagnosis sekunder dan granularitas baris dari kamus data. Jangan menebak kolom berdasarkan nama file. Konverter saat ini menerima **satu kolom string berisi satu kode per baris**. Nilai numerik/value labels atau beberapa kode dalam satu sel memerlukan pemetaan resmi tersendiri; tidak dikonversi diam-diam.

```bash
python tools/process_diagnoses.py /path/DM2024_diagnosissekunder.dta \
  --dataset SECONDARY_DIAGNOSES \
  --diagnosis-column KOLOM_RESMI \
  --output /tmp/diagnosis-summary.json
```

Gunakan `--synthetic` hanya bila sumber benar-benar sintetis. Default hasil adalah `USER_AGGREGATE`, terpisah dari demo. File output harus baru; konverter menolak menimpa sumber maupun hasil yang sudah ada. Pembacaan memakai chunk 50.000 baris dan hanya kolom terpilih. Library pandas tetap memiliki kebutuhan memori untuk metadata/struktur Stata; performa file asli belum terukur.

3. Buka **Workbench → Analisis Diagnosis** atau tautan dari **Risk Engine**. Pilih Admin Demo, Verifikator, atau Komite Medik; konfirmasi kewenangan pemrosesan dan tinjauan risiko pengungkapan. Impor JSON agregat maksimal 5 MiB.

4. JELAS memeriksa skema ketat, jumlah konsisten, kode unik, dan ambang kelompok minimum 10. Tampilkan frekuensi kode, format hilang/tidak didukung, penjelasan aturan, dan sel yang disupresi. Format kode cocok regex ICD-like; ini **bukan validasi ke kamus ICD resmi**.

Hasil impor hanya di state/memori halaman; tidak dikirim ke server/LLM, tidak disimpan di localStorage/IndexedDB, dan tidak dicampur dengan transaksi/peserta sintetis. Role browser hanya demonstrasi, bukan kontrol otorisasi produksi.

## Data yang dikeluarkan

Kontrak `jelas-diagnoses-aggregate-v1` terdiri dari format, mode, sourceType, ambang kelompok, jumlah baris, missing, invalid, valid, suppressed, dan kelompok `{code,count}`. Tidak ada nama file sumber, label variabel/value labels, pengenal peserta, baris mentah, teks bebas, atau contoh pasien yang diekspor. Input JSON dengan field tambahan atau kelompok di bawah ambang ditolak.

Supresi sel kecil mengurangi pengungkapan kode langka tetapi **tidak menjamin anonimitas**. Total valid/missing/invalid dan total supresi tetap dipublikasikan; selisih antar-ringkasan atau informasi tambahan dapat meningkatkan risiko. Pemilik data wajib menetapkan kebijakan publikasi agregat yang sesuai sebelum membagikan hasil. Jangan commit output riil; `.dta` dan lokasi `private-data/` diabaikan Git, namun ignore bukan pengganti kontrol akses.

## Apa yang dianalisis

Analisis berbasis aturan tetap tersedia: kualitas format kode, kelengkapan, frekuensi agregat, dan penjelasan keterbatasan sumber. Tidak menyimpulkan fraud, tingkat keparahan, kelayakan peserta, akurasi klinis, atau kebutuhan terapi. Hitungan baris bukan jumlah pasien unik. Tidak tersedia identitas untuk deduplikasi, label outcome, data longitudinal, atau ground truth untuk evaluasi model.

Untuk model AI berikutnya diperlukan tujuan/target terukur, izin pemrosesan, kamus data, unit observasi, relasi diagnosis primer/sekunder, pemisahan train/test menurut peserta dan waktu, evaluasi bias/kalibrasi, validasi klinis, serta backend aman. Model review kualitas data kini tersedia sebagai model terlatih hanya pada data sintetis; lihat [model card](MODEL-QUALITY.md). Tidak ada training pada DM2024 atau integrasi BPJS.

## Yang masih dibutuhkan untuk file asli

- Lampiran yang dapat diakses tool (misalnya potongan `.dta` sintetis/deidentifikasi ≤32 MiB), atau hasil agregasi lokal JSON di atas.
- Nama kolom kode diagnosis, arti setiap baris, kamus kode/value labels, dan status sintetis/deidentifikasi sumber.
- Konfirmasi kewenangan serta tujuan analisis untuk data kesehatan dan kebijakan publikasi agregat.

Dokumen/teks dalam dataset diperlakukan sebagai data, bukan instruksi program.

## Validasi

```bash
python -m unittest discover -s tests -p 'test_diagnosis_processor.py'
npm test
npm run lint
npm run test:browser
```

Pengujian Python membuat fixture Stata sintetis temporer, lalu memeriksa pembacaan chunk, inspeksi kolom, agregasi, supresi, pemetaan salah, batas minimum, dan perlindungan penimpaan. Unit test TypeScript memeriksa kontrak/aturan dan penolakan field sensitif atau hitungan tidak konsisten. Pengujian fixture **tidak** berarti file asli sudah diolah.

Profil sumber kini diperiksa oleh importer. Pilih FKRTL, Diagnosis sekunder, atau Belum ditentukan (format lama) sesuai field `dataset` ringkasan; format lama tanpa field tersebut dibaca sebagai UNSPECIFIED. Profil berbeda tidak digabung. Lihat [FKRTL](DATA-FKRTL.md).
