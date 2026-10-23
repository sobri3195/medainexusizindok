# Pengolahan nyata DM2024_nonkapitasi.dta

File yang dilampirkan berhasil diakses (927.232 byte) dan dibaca: **3.890 baris, 24 kolom**. Berbeda dari kedua file DM2024 sebelumnya yang melebihi batas transfer, file nonkapitasi ini benar-benar digunakan untuk agregasi dan fitting model struktur lokal.

## Pemetaan berdasarkan metadata Stata

- `PNK13A`: kode diagnosis ICD-10 tiga digit.
- `PNK14`: kode diagnosis rinci (3–5 digit).
- `PSTV01`: nomor peserta, **hanya digunakan lokal untuk memisahkan kelompok train/holdout**, tidak menjadi fitur, tidak diekspor, tidak masuk Git.
- `PNK02`: ID kunjungan, tidak dibutuhkan dalam model dan tidak dibaca pipeline analisis.
- Nama diagnosis, tindakan, data lab, serta pengenal lainnya tidak diekspor atau menjadi fitur.

Metadata/isi dataset adalah data, bukan instruksi aplikasi. Pipeline tidak menjalankan teks dari sumber.

## Hasil pengolahan sumber ini

Agregasi `PNK13A`: 3.890 baris memiliki format kode yang didukung. Diterbitkan 21 kelompok kode dengan hitungan ≥10; 209 baris dari kode langka disupresi tanpa mengeluarkan kodenya. Ini hitungan baris, bukan pasien unik. Validasi regex bukan validasi kamus ICD resmi.

Kode rinci memiliki representasi compact dan bertitik. Kode compact dinormalisasi dengan menambahkan titik sesudah karakter ketiga bila sintaks sesuai. Setelah normalisasi, pemeriksaan kelengkapan, format, dan prefix konsisten. Ada 2.248 baris yang representasi awalnya bukan bentuk kanonik bertitik; **ini bukan bukti diagnosis salah atau masalah klinis**.

Hanya **dua pola fitur struktur** ditemukan. Model karena itu memiliki keragaman sangat terbatas dan tidak dapat dianggap sebagai penilai kualitas klinis yang informatif. Perbedaan representasi yang sah tidak otomatis merupakan cacat. Jangan mengarang fitur klinis atau label agar model menghasilkan deteksi lebih banyak.

## Model yang benar-benar fit pada data pengguna

Isolation Forest: 100 pohon, seed 42, max_samples min(256, trainRows), contamination 0,05. Contamination adalah parameter algoritma, bukan prevalensi error atau fraud sebenarnya.

Train: **3.170 baris / 722 kelompok peserta**. Holdout: **720 baris / 181 kelompok peserta**. **Irisan kelompok peserta: 0**. Pemisahan dengan GroupShuffleSplit dilakukan sebelum fitting untuk menghindari peserta yang sama di kedua bagian. Tidak ada klaim bahwa dataset nonkapitasi dan sumber lain saling independen; tidak ada join antar-file.

Enam fitur numerik biner berasal dari bentuk data saja:

1. Kode utama tersedia.
2. Format kode utama didukung.
3. Kode rinci tersedia.
4. Format kode rinci didukung setelah normalisasi compact.
5. Prefix kode utama/rinci konsisten bila keduanya valid.
6. Representasi rinci sudah kanonik tanpa normalisasi.

Tidak ada ID, nama, nilai biaya, diagnosis sebagai kategori penyakit, atau hasil lab yang menjadi fitur. Ketiadaan lab tidak diasumsikan salah karena pemeriksaan tidak wajib untuk setiap layanan.

Model belajar distribusi fitur tanpa label. Tersedia laporan proporsi skor di atas threshold sebagai rentang 10%, tanpa skor individu. Train dan holdout sumber ini sama-sama berada pada rentang 0–10%; ini tidak menyatakan bahwa ada minimal satu kasus bermasalah. Tanpa label reviewer tidak dihitung akurasi, ROC-AUC, precision, recall, sensitivitas, atau bukti efektivitas. Threshold tidak dipilih menggunakan holdout.

Forest diekspor sebagai JSON portabel berisi struktur pohon, bukan pickle. Scorer JSON diuji terhadap `-model.score_samples` sklearn pada semua vektor sumber; selisih maksimum sumber ini 0. Model tidak dimuat dari file tidak tepercaya; UI hanya menerima laporan agregat dengan schema ketat, bukan mengeksekusi model atau teks dalam laporan.

Model sintetis regresi logistik yang lebih dulu tersedia tidak diganti atau dinyatakan telah dilatih ulang pada DM2024. Model nonkapitasi adalah eksperimen unsupervised terpisah, belum merupakan model produksi/klinis.

## Lokasi privat dan pemakaian aplikasi

Data mentah dan hasil dari data pengguna tidak disertakan dalam commit, PR, `public/`, atau bundle aplikasi. Pada lingkungan kerja ini hasil tersedia di `/workspace/private-data/nonkapitasi-v1/`:

- `nonkapitasi-analysis.json`: laporan yang dapat diimpor ke UI.
- `nonkapitasi-model.json`: forest terlatih portabel; tetap privat.
- `nonkapitasi-diagnosis-summary.json`: agregat diagnosis yang kompatibel dengan Analisis Diagnosis, profil NONKAPITASI.

Buka **Workbench → Analisis Nonkapitasi** dengan Admin Demo, Verifikator, atau Komite Medik. Konfirmasi kewenangan, pilih laporan JSON, dan lihat ringkasan sumber, training/holdout, kualitas struktur, serta frekuensi kode agregat. Laporan hanya berada di memori halaman, dapat dihapus, tidak masuk database sintetis atau dikirim ke LLM/server. Role browser tetap demonstrasi dan bukan otorisasi produksi.

Mode laporan mengikuti sumber (`USER_AGGREGATE`), tidak pernah dilabeli data sintetis. Metadata laporan adalah deklarasi pipeline, bukan signature/attestation yang diverifikasi browser. Supresi sel kecil dan band tidak menjamin anonimitas; pemilik data harus meninjau risiko pengungkapan sebelum membagikan hasil. Jumlah kelompok dan sum total dapat memungkinkan inferensi tambahan. `falseCount=null` berarti 0 atau kurang dari 10; tidak boleh ditafsirkan pasti nol.

## Mengulang pipeline

```bash
python -m pip install -r tools/requirements-diagnoses.txt -r tools/requirements-training.txt
python tools/process_nonkapitasi.py /path/DM2024_nonkapitasi.dta \
  --primary-column PNK13A --detail-column PNK14 --member-column PSTV01 \
  --output-dir /path/private-data/nonkapitasi-baru
```

Direktori output harus baru; file yang sudah ada tidak ditimpa. Folder dibuat privat (0700) dan output 0600 pada sistem yang mendukung permission tersebut. Pipeline membutuhkan ≥100 baris, ≥20 kelompok peserta tanpa missing, pemetaan kolom berbeda, dan variasi fitur training; tidak membuat model palsu bila fitur konstan. Data dibaca lokal, hanya tiga kolom yang diperlukan. Input besar tetap membutuhkan kapasitas memori yang sesuai; pipeline ini diuji pada file yang dilampirkan.

```bash
python -m unittest discover -s tests -p 'test_nonkapitasi_processor.py'
npm test
npm run lint
JELAS_NONKAPITASI_REPORT=/path/private-data/nonkapitasi-analysis.json npm run test:browser
```

Suite Python menggunakan fixture sintetis untuk menguji fitting nyata, split kelompok, normalisasi, export parity, reproducibility, dan penolakan input yang tidak layak. Opsi browser mengimpor laporan privat ke context browser terisolasi, memeriksa tampilan, penolakan field tambahan, hapus memori, dan RBAC. Tidak menyalin data ke repository.

Tahap berikutnya untuk model review yang tervalidasi: label reviewer berwenang, definisi cacat data, data multi-periode/fasilitas yang berizin, pemetaan kamus resmi, evaluasi temporal dan subkelompok, serta persetujuan pemilik layanan. Model ini tidak mengubah keputusan klinis atau hak pengambilan obat/cairan.
