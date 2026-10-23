import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Table,
} from "../components/ui";
import { useDemoAuth } from "../lib/auth";
import {
  featureDescriptions,
  nonkapitasiSchema,
  type NonkapitasiReport,
} from "../lib/nonkapitasi";
export default function Nonkapitasi() {
  const { session } = useDemoAuth();
  const [report, setReport] = useState<NonkapitasiReport | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [consent, setConsent] = useState(false);
  const allowed =
    !!session &&
    ["Admin Demo", "Verifikator", "Komite Medik"].includes(session.role);
  const load = async (file: File) => {
    setBusy(true);
    setError("");
    try {
      if (
        !allowed ||
        !consent ||
        file.size > 5 * 1024 * 1024 ||
        !file.name.endsWith(".json")
      )
        throw new Error("INPUT");
      setReport(nonkapitasiSchema.parse(JSON.parse(await file.text())));
    } catch {
      setError(
        "Laporan ditolak. Gunakan JSON keluaran pipeline nonkapitasi, periksa izin, ukuran ≤5 MiB, fitur, split, dan kesesuaian sumber. Data sebelumnya dipertahankan.",
      );
    } finally {
      setBusy(false);
    }
  };
  if (!allowed)
    return (
      <Alert>
        Analisis Nonkapitasi memerlukan Admin Demo, Verifikator, atau Komite
        Medik.
      </Alert>
    );
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold">
          Analisis Nonkapitasi · model kualitas struktur
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Laporan dari pengolahan Stata lokal dan Isolation Forest yang dilatih
          pada sumber pengguna. Tidak ada label reviewer; skor anomali bukan
          probabilitas kesalahan, penyakit, atau fraud.
        </p>
      </header>
      <Card className="space-y-4 p-5">
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          Saya berwenang memuat laporan agregat ini dan telah meninjau risiko
          pengungkapan.
        </label>
        <label className="block text-sm font-semibold">
          Laporan nonkapitasi JSON
          <Input
            type="file"
            accept=".json"
            disabled={busy || !consent}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void load(file);
            }}
          />
        </label>
        <Button
          disabled={!report || busy}
          onClick={() => {
            setReport(null);
            setError("");
          }}
        >
          Hapus laporan dari memori
        </Button>
        <p className="text-xs text-slate-500">
          Laporan tetap di memori halaman, tidak disimpan permanen atau dikirim
          ke server/LLM. Model dan data mentah tidak diimpor ke browser.
          Metadata laporan bukan bukti signature atau validasi model produksi.
        </p>
      </Card>
      {busy && <p role="status">Memvalidasi laporan…</p>}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {report ? (
        <>
          <div role="status">
            <Badge tone="amber">
              {report.mode === "SYNTHETIC"
                ? "DATA SINTETIS"
                : "AGREGAT NONKAPITASI PENGGUNA"}{" "}
              · Isolation Forest
            </Badge>
            <span className="ml-3 text-sm">Laporan berhasil dimuat.</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Baris diolah", report.rows],
              ["Baris training", report.model.trainRows],
              ["Baris holdout", report.model.holdoutRows],
            ].map(([name, value]) => (
              <Card className="p-4" key={name}>
                <p className="text-xs">{name}</p>
                <b className="text-2xl">{value}</b>
              </Card>
            ))}
          </div>
          <Card className="space-y-3 p-5">
            <h2 className="font-bold">
              Model dilatih pada{" "}
              {report.model.trainingSource === "UPLOADED_DATA"
                ? "data pengguna"
                : "fixture sintetis"}
            </h2>
            <p className="text-sm">
              {report.model.trees} pohon · seed {report.model.seed} · parameter
              contamination {report.model.contamination}. Peserta training{" "}
              {report.model.trainGroups}, holdout {report.model.holdoutGroups},
              irisan peserta {report.model.groupOverlap}. Parameter
              contamination bukan prevalensi kesalahan nyata.
            </p>
            <p className="text-sm">
              Proporsi skor melewati threshold: training{" "}
              {report.model.trainReviewBand}, holdout{" "}
              {report.model.holdoutReviewBand}. Ditampilkan sebagai rentang,
              tanpa skor peserta individual. Threshold{" "}
              {report.model.threshold.toFixed(4)}; selisih maksimum model
              JSON/Python {report.model.portableParityMaxError.toExponential(2)}
              .
            </p>
            <Alert>
              Tidak tersedia label benar/salah dari reviewer: akurasi,
              precision, recall, dan ROC-AUC tidak dihitung. Terdapat{" "}
              {report.model.distinctFeaturePatterns} pola fitur training;
              keragaman terbatas dapat membuat model kurang informatif. Pola
              format yang berbeda bisa sah secara klinis.
            </Alert>
          </Card>
          <Card>
            <Table
              headers={[
                "Pemeriksaan struktur",
                "Baris tidak memenuhi / belum dipublikasikan",
              ]}
            >
              {report.quality.map((q) => (
                <tr className="border-b" key={q.feature}>
                  <td className="p-3 text-sm">
                    {featureDescriptions[q.feature]}
                  </td>
                  <td className="p-3 text-sm">
                    {q.falseCount ?? "0 atau <10 (disupresi)"}
                  </td>
                </tr>
              ))}
            </Table>
          </Card>
          <Card>
            <Table
              headers={["Kode diagnosis 3 digit", "Frekuensi baris (≥10)"]}
            >
              {report.diagnosis.groups.map((g) => (
                <tr className="border-b" key={g.code}>
                  <td className="p-3">{g.code}</td>
                  <td className="p-3">{g.count}</td>
                </tr>
              ))}
            </Table>
          </Card>
          <p className="text-xs text-slate-500">
            Baris diagnosis disupresi: {report.diagnosis.suppressed}. Validasi
            format bukan validasi kamus ICD resmi; supresi bukan jaminan
            anonimitas. Pemeriksaan GDP tidak masuk fitur karena pemeriksaan
            tersebut tidak otomatis diwajibkan untuk semua layanan. Tidak ada
            keputusan layanan otomatis.
          </p>
        </>
      ) : (
        <EmptyState title="Belum ada laporan nonkapitasi yang dimuat" />
      )}
    </div>
  );
}
