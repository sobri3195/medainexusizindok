# Model card — review kualitas data diagnosis

## Target dan batas penggunaan

Target dipilih pengguna: **review kualitas data diagnosis**. Baseline ini benar-benar dilatih memakai `StandardScaler` dan `LogisticRegression` scikit-learn; bobot bukan konstanta aturan yang ditampilkan sebagai hasil training. Aturan pemeriksaan data yang sudah ada tetap dipertahankan sebagai jalur terpisah.

Model memprediksi **label review kualitas sintetis** untuk satu ringkasan diagnosis. Bukan label penyakit, fraud, akurasi kode klinis, severity, atau hak layanan. Tidak ada tindakan penyerahan atau keputusan layanan yang bergantung pada skor ini.

Kedua lampiran DM2024 belum dapat ditransfer karena >32 MiB, sehingga **tidak digunakan saat training atau evaluasi**. Model belum divalidasi pada agregat FKRTL/diagnosis sekunder nyata. `USER_AGGREGATE` selalu menghasilkan ABSTAIN tanpa probabilitas. Pernyataan mode sintetis berasal dari input, bukan bukti anonimitas/keaslian sumber.

## Data dan pelatihan

`tools/train_quality_model.py` membuat 6.000 contoh agregat sintetis independen dengan lima fitur:

| Fitur | Definisi |
| --- | --- |
| missing_rate | missing / rows |
| invalid_rate | invalid / rows |
| suppressed_valid_rate | suppressed / valid |
| log_rows | log natural jumlah baris |
| largest_code_share | frekuensi kode terbesar yang dipublikasikan / valid |

Tidak ada ID, nama peserta, teks diagnosis, atau kode individu yang menjadi fitur. Kode contoh hanya mendukung struktur ringkasan. Label dibuat secara probabilistik dari mekanisme sintetis terdokumentasi dalam generator; **bukan anotasi reviewer atau ground truth klinis**. Ini mendemonstrasikan pipeline supervised learning, belum membuktikan prioritas review yang bermanfaat pada operasi nyata.

Pemisahan sebelum fitting:

- Train: 4.000 contoh; seed 20261022. Scaler dan regresi hanya fit pada train.
- Validasi: 1.000 contoh; seed 20261023. Threshold dipilih dengan balanced accuracy pada grid 0,10–0,90.
- Test: 1.000 contoh; seed 20261024. Tidak digunakan untuk fitting atau pemilihan threshold.

Tes memeriksa bahwa vektor fitur tidak tumpang tindih antar-split. Generator, target sintetis, dan distribusi antar-split sengaja sama; hasil ini mengukur generalisasi **dalam simulasi**, tidak merepresentasikan domain shift ke FKRTL nyata. Tidak ada klaim evaluasi antar-pasien karena tidak ada pasien dalam fixture. Untuk data nyata diperlukan split berdasarkan peserta/fasilitas/waktu sesuai unit analisis dan kebocoran agregasi.

## Evaluasi pada test sintetis

| Metrik | Nilai |
| --- | --- |
| ROC-AUC | 0,7556 |
| Average precision | 0,7394 |
| Balanced accuracy | 0,6830 |
| Precision | 0,7064 |
| Recall | 0,5604 |
| Brier score | 0,1982 |
| Brier baseline prevalensi train konstan | 0,2480 |
| Baseline average precision / prevalensi test | 0,4550 |

Confusion matrix (baris aktual, kolom prediksi; urutan 0,1): `[[439,106],[200,255]]`. Brier lebih rendah lebih baik; baseline mengeluarkan prevalensi train pada semua sampel. Nilai mentah lengkap, threshold terpilih, parameter scaler/bobot, versi library, feature ranges, split, dan lima vektor parity test disimpan pada `src/models/quality-model.json`.

Tidak ada klaim akurasi klinis, kalibrasi pada data nyata, confidence interval, manfaat operasional, atau performa subkelompok. Skor 70% berarti probabilitas label dari simulasi model ini, bukan probabilitas penyakit/fraud.

## Inferensi dan abstention

Browser memvalidasi artifact JSON (tanpa pickle atau kode dari file model), membentuk fitur, menstandarkan dengan parameter train, menghitung `sigmoid(intercept + Σ weight × standardized_feature)`, dan menampilkan kontribusi log-odds per fitur. Tes memastikan hasil browser sama dengan `predict_proba` Python hingga toleransi 1e-12. Kontribusi menjelaskan perhitungan, bukan kausalitas.

Inferensi ditahan bila mode bukan SYNTHETIC, tidak ada diagnosis valid/kelompok terpublikasi, atau fitur keluar dari min/max training. Min/max ini adalah pemeriksaan rentang sederhana, **bukan detektor OOD statistik yang lengkap**. Contoh sintetis lama yang jumlah barisnya di bawah rentang juga dapat ditahan; gunakan **Muat contoh model sintetis** untuk mencoba inferensi dalam rentang.

## Menjalankan ulang

Gunakan Python 3.12 seperti lingkungan pengujian:

```bash
python -m pip install -r tools/requirements-training.txt
npm run model:train
npm run test:model
npm test
npm run lint
npm run test:browser
```

Training menulis ulang artifact model yang diketahui di `src/models/quality-model.json`. Output hanya parameter dan metrik sintetis, tanpa baris data sumber. Dependencies tervalidasi: scikit-learn 1.8.0, numpy 2.3.5. Hasil floating point dapat berbeda sedikit antar-platform; pengujian menggunakan toleransi.

Pada UI: **Workbench → Analisis Diagnosis → Muat contoh model sintetis**. Panel model, metrik sintetis, skor, threshold, dan penjelasan fitur muncul; alur ini berfungsi offline setelah precache aplikasi produksi. Contoh maupun hasil inferensi tidak disimpan permanen atau dikirim ke LLM.

## Syarat training pada data pengguna

Diperlukan file yang dapat diakses atau agregat yang berizin, definisi unit analisis, kamus data, serta **label review kualitas dari reviewer berwenang** (misalnya perlu klarifikasi/tidak perlu, dengan panduan anotasi dan alasan). Dataset kode diagnosis saja tidak menyediakan target supervised learning yang sah untuk tugas ini.

Sebelum mengganti model sintetis: evaluasi kelengkapan label, persetujuan pemrosesan, linkage yang aman untuk menghindari leakage, validation/test terpisah dari training secara temporal/kelompok, perbandingan baseline, ketidakpastian, kalibrasi, bias per fasilitas/kelompok relevan, ambang berbasis kapasitas review, validasi pemilik layanan, pemantauan drift, dan peninjauan manusia. Jangan membuka inferensi USER_AGGREGATE hanya dengan mengganti label trainingMode. Antarmuka produksi perlu kontrak dan evaluasi model tersendiri.
