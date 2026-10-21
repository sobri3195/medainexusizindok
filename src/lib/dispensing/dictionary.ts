import { datasets, exportFields, type Dataset } from "./domain";
export type FieldInfo = {
  name: string;
  definition: string;
  category: "A" | "B" | "C" | "D";
  reason: string;
  dependency: string;
  missing: string;
};
const definitions: Record<string, string> = {
  id: "Kunci unik sintetis",
  alias: "Nama tampilan pseudonim",
  accountOwned: "Hasil simulasi kepemilikan akun",
  eligible: "Hasil simulasi kepesertaan",
  mode: "Pemisah tegas data simulasi",
  memberId: "Relasi ke synthetic_members.id",
  method: "Metode simulasi atau asal pemindaian",
  status: "Hasil validasi atau status transaksi",
  source: "Asal respons / hak pengambilan",
  at: "Waktu kejadian UTC",
  expiresAt: "Batas berlaku hasil verifikasi",
  rxId: "Relasi ke synthetic_prescriptions.id",
  productId: "Relasi ke synthetic_product_catalog.id",
  kind: "Jenis layanan PRB atau DIALYSIS",
  allowed: "Hak jumlah per referensi sintetis",
  validUntil: "Batas berlaku hak pengambilan",
  state: "Status aktif / dibatalkan",
  code: "Kode internal produk sintetis",
  barcode: "Kode demo yang dipindai; bukan hak pengambilan",
  name: "Nama produk sintetis",
  size: "Ukuran dan volume; bukan rekomendasi terapi",
  batch: "Lot produk dari katalog sintetis; belum verifikasi label fisik",
  expiry: "Kedaluwarsa dari katalog sintetis",
  quantity: "Jumlah yang dikonfirmasi diserahkan",
  actorId: "Petugas pseudonim",
  facility: "Fasilitas sintetis",
  correlationId: "Penghubung kejadian lintas adapter",
  reason: "Kode alasan tanpa data sensitif",
  entityId: "ID objek yang diaudit",
  action: "Jenis peristiwa",
  verificationId: "Relasi ke hasil verifikasi",
  scanId: "Relasi ke hasil pemindaian",
  idempotencyKey: "Kunci permintaan stabil untuk retry",
  accountOwnedResult: "Hasil kepemilikan akun",
};
export function fields(dataset: Dataset): FieldInfo[] {
  const extras: Partial<Record<Dataset, string[]>> = {
    synthetic_biometric_verifications: [
      "accountOwned",
      "eligible",
      "correlationId",
    ],
    synthetic_prescriptions: ["facility"],
    synthetic_barcode_scans: ["batch", "expiry", "actorId", "correlationId"],
    synthetic_dispensing_transactions: [
      "verificationId",
      "scanId",
      "idempotencyKey",
    ],
  };
  return [
    ...new Set([...exportFields[dataset], ...(extras[dataset] ?? [])]),
  ].map((name) => {
    const category = [
      "batch",
      "expiry",
      "size",
      "allowed",
      "validUntil",
    ].includes(name)
      ? "C"
      : [
            "source",
            "at",
            "actorId",
            "correlationId",
            "reason",
            "action",
            "entityId",
            "facility",
          ].includes(name)
        ? "B"
        : "A";
    return {
      name,
      definition: definitions[name] ?? name,
      category,
      reason:
        category === "C"
          ? "Aturan dan semantik perlu disahkan pemilik data; nilai demo hanya ilustrasi."
          : category === "B"
            ? "Diperlukan untuk penelusuran dan analisis kejadian."
            : "Menopang validasi atau relasi transaksi.",
      dependency:
        category === "C"
          ? "Katalog / resep resmi dan kebijakan layanan"
          : "Adapter terkait dan ID sintetis yang konsisten",
      missing:
        category === "C"
          ? "Tahan konfirmasi jika field diwajibkan; minta review petugas."
          : "Alur atau penelusuran tidak lengkap; jangan mengarang nilai.",
    };
  });
}
export const relationshipNotes = [
  "members.id → verifications.memberId, prescriptions.memberId, transactions.memberId",
  "products.id → prescriptions.productId, scans.productId, transactions.productId",
  "prescriptions.id → scans.rxId, transactions.rxId",
  "verifications.id → transactions.verificationId; scans.id → transactions.scanId",
  "audit.entityId → objek terkait; correlationId → rangkaian peristiwa",
];
export const dataEvaluation = datasets.flatMap((dataset) =>
  fields(dataset).map((field) => ({ dataset, ...field })),
);
export const excludedFields = [
  {
    name: "NIK / nomor kartu JKN asli",
    category: "D",
    reason: "Tidak diperlukan untuk demo; hanya token sintetis digunakan.",
  },
  {
    name: "Foto wajah / template sidik jari",
    category: "D",
    reason:
      "Tidak dikumpulkan. Provider resmi harus mengelola biometrik sesuai dasar hukum.",
  },
  {
    name: "Password, token, rahasia integrasi",
    category: "D",
    reason:
      "Tidak masuk dataset atau log. Secret produksi berada di backend dengan environment variables.",
  },
  {
    name: "Dosis / substitusi / jadwal terapi resmi",
    category: "C",
    reason: "Memerlukan konfirmasi tim klinis dan sumber hak berwenang.",
  },
];
