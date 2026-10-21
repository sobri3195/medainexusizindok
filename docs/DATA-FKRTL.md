# Memproses DM2024_fkrtl.dta di JELAS

## Status sumber

Lampiran `DM2024_fkrtl.dta` melebihi batas transfer tool 32 MiB. File asli belum dapat diunduh, kolomnya belum diketahui, dan belum ada hasil analisis atau pelatihan AI dari file tersebut. Jangan menganggap fixture sintetis di aplikasi sebagai isi FKRTL.

PR #15 untuk pengolahan Stata sebelumnya sudah masuk ke main. Perubahan ini memperluas jalur tersebut dengan profil sumber eksplisit: `FKRTL`, `SECONDARY_DIAGNOSES`, dan `UNSPECIFIED`. Profil merupakan deklarasi pemilik data, bukan deteksi otomatis, bukti asal, atau bukti validitas data.

## Langkah di mesin yang memiliki file dan kewenangan akses

```bash
python -m pip install -r tools/requirements-diagnoses.txt
python tools/process_diagnoses.py /path/DM2024_fkrtl.dta --inspect
```

Inspeksi menampilkan nama kolom saja, tanpa nilai atau label. Konfirmasi kolom kode diagnosis dan unit setiap baris menggunakan kamus data resmi. Nama kolom FKRTL **tidak ditebak**. Jika terdapat kolom string diagnosis dengan satu kode per baris:

```bash
python tools/process_diagnoses.py /path/DM2024_fkrtl.dta \
  --dataset FKRTL \
  --diagnosis-column KOLOM_DIAGNOSIS_RESMI \
  --output /tmp/fkrtl-diagnosis-summary.json
```

Bila diagnosis berbentuk angka dengan value labels, kode gabungan, atau struktur lain, hentikan dan buat pemetaan berdasarkan kamus resmi sebelum mengolah. Konverter saat ini hanya merangkum satu kolom kode diagnosis; belum mengolah tarif, lama rawat, severity, INA-CBG, outcome, atau relasi pasien/kunjungan karena skema sumber belum diketahui.

Buka **Workbench → Analisis Diagnosis**, pilih **FKRTL** pada profil sumber, lalu impor JSON hasil konverter. Importer menolak profil yang berbeda. Ringkasan format lama tanpa `dataset` tetap dapat dibaca sebagai `UNSPECIFIED`; pilih **Belum ditentukan (format lama)**. Untuk diagnosis sekunder jalankan konverter dengan `--dataset SECONDARY_DIAGNOSES` dan pilih profil yang sesuai.

Penggantian profil mengosongkan ringkasan aktif. Impor mengganti ringkasan di memori, tidak menggabungkan baris, melakukan join identitas, menghitung peserta unik, atau menjumlahkan dua sumber yang mungkin tumpang tindih. Contoh sintetis mengikuti profil pilihan dan tetap berlabel SYNTHETIC.

## Batas analisis dan perlindungan data

Analisis yang tersedia adalah frekuensi kode, kelengkapan, kesesuaian format kode, dan penjelasan kualitas berbasis aturan. Model terlatih review kualitas data sintetis tersedia terpisah, namun menahan inferensi pada agregat pengguna. Ini bukan keputusan klinis, temuan fraud, atau validasi kepesertaan BPJS. Regex kode bukan kamus ICD resmi.

Hanya agregat kode dengan hitungan minimal 10 yang dikeluarkan; tidak ada ID pasien atau baris mentah yang dimasukkan ke Git atau database demo. Supresi bukan jaminan anonimitas dan tetap memerlukan tinjauan pengungkapan oleh pemilik data. Ringkasan pengguna tidak dikirim ke LLM/server atau disimpan permanen oleh halaman.

Untuk menuntaskan pengolahan file yang dilampirkan, masih diperlukan salah satu:

- File terkompresi yang dapat ditransfer (≤32 MiB), disertai kamus data/pemetaan kolom; atau
- JSON agregat hasil perintah di atas yang telah ditinjau, serta konfirmasi granularitas dan arti kolom.

Jika dikirim potongan dataset, hasilnya hanya berlaku untuk potongan tersebut dan tidak dapat dinyatakan sebagai analisis seluruh DM2024.

Lihat [panduan pengolahan dan privasi](ANALISIS-DIAGNOSIS.md) untuk kontrak ringkasan, pengujian, dan prasyarat model berikutnya. Instruksi atau teks di dalam dataset diperlakukan sebagai data, bukan perintah aplikasi.
