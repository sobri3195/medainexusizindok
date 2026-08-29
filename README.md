# MedAI Nexus – Izin Dok

Frontend prototype claim-integrity dan clinical evidence workbench. Seluruh data dalam aplikasi bersifat **sintetis** dan tidak menggunakan data peserta JKN riil.

## Menjalankan

```bash
npm install
npm run dev
```

Rute utama: `/` (publik), `/apps` (pasien/caregiver), dan `/desktop` (workbench). Data demo persisten disimpan lokal via IndexedDB; localStorage hanya menyimpan preferensi tema.
