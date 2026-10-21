import { TrainedQualityModel } from "../components/TrainedQualityModel";
import { syntheticModelSummary } from "../lib/qualityModel";
import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Select,
  Table,
} from "../components/ui";
import { useDemoAuth } from "../lib/auth";
import {
  analyzeDiagnoses,
  syntheticDiagnosisSummary,
  type DiagnosisSummary,
} from "../lib/diagnosisAnalysis";

export default function DiagnosisAnalysis() {
  const { session } = useDemoAuth();
  const [data, setData] = useState<DiagnosisSummary | null>(null),
    [profile, setProfile] = useState<DiagnosisSummary["dataset"]>("FKRTL"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [consent, setConsent] = useState(false),
    [success, setSuccess] = useState("");
  const allowed =
    !!session &&
    ["Admin Demo", "Verifikator", "Komite Medik"].includes(session.role);
  const result = data ? analyzeDiagnoses(data) : null;
  const load = async (file: File) => {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      if (!allowed || !consent) throw new Error("ACCESS");
      if (
        !file.name.toLowerCase().endsWith(".json") ||
        file.size > 5 * 1024 * 1024
      )
        throw new Error("FORMAT");
      const parsed = analyzeDiagnoses(JSON.parse(await file.text())).data;
      if (parsed.dataset !== profile) throw new Error("DATASET_MISMATCH");
      setData(parsed);
      setSuccess(
        "Ringkasan dimuat dan dianalisis lokal. Tidak ada data yang dikirim ke server atau disimpan permanen.",
      );
    } catch {
      setError(
        "Impor ditolak. Pilih JSON agregat ≤5 MiB dari konverter JELAS, periksa hak akses, konfirmasi izin, profil sumber, skema, jumlah, dan supresi sel kecil. Data sebelumnya tidak diganti.",
      );
    } finally {
      setBusy(false);
    }
  };
  if (!allowed)
    return (
      <Alert>
        Halaman analisis memerlukan role Admin Demo, Verifikator, atau Komite
        Medik.
      </Alert>
    );
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <p className="text-xs font-bold tracking-widest text-medical-600">
          JELAS · ANALISIS DATA DIAGNOSIS
        </p>
        <h1 className="mt-2 text-2xl font-bold">
          Diagnosis FKRTL / sekunder: kualitas data & pola agregat
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Analisis kualitas data dengan aturan dan model terlatih pada data
          sintetis. Bukan diagnosis klinis, prediksi fraud, atau penentu hak
          layanan.
        </p>
      </header>
      <Alert>
        Belum ada dataset diagnosis eksternal yang disertakan dalam aplikasi.
        Impor ringkasan dari sumber yang berwenang untuk menganalisis data Anda.
        Hasil impor lokal dan contoh sintetis diberi label terpisah.
      </Alert>
      <Card className="space-y-4 p-5">
        <h2 className="font-bold">Impor hasil pengolahan Stata</h2>
        <p className="text-sm text-slate-500">
          Jalankan konverter Python secara lokal pada mesin yang diizinkan.
          Pilih kolom diagnosis sesuai kamus data. Impor hanya ringkasan JSON;
          jangan unggah baris pasien, label bebas, atau pengenal peserta.
          Agregasi dan supresi bukan jaminan anonimitas.
        </p>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={consent}
            disabled={!allowed}
            onChange={(e) => setConsent(e.target.checked)}
          />
          Saya berwenang memproses data ini dan telah meninjau ringkasan serta
          risiko pengungkapan sebelum impor.
        </label>
        <label className="block text-sm font-semibold">
          Profil sumber yang diharapkan
          <Select
            value={profile}
            disabled={busy}
            onChange={(e) => {
              setProfile(e.target.value as DiagnosisSummary["dataset"]);
              setData(null);
              setSuccess("");
              setError("");
            }}
          >
            <option value="FKRTL">FKRTL</option>
            <option value="SECONDARY_DIAGNOSES">Diagnosis sekunder</option>
            <option value="UNSPECIFIED">Belum ditentukan (format lama)</option>
          </Select>
        </label>
        <p className="text-xs text-slate-500">
          Profil ditentukan pemilik data, bukan dideteksi dari nama file. Impor
          mengganti ringkasan aktif, tidak melakukan join pasien atau
          menjumlahkan kedua dataset.
        </p>
        <label className="block text-sm font-semibold">
          Ringkasan JSON agregat
          <Input
            className="mt-2"
            type="file"
            accept=".json,application/json"
            disabled={busy || !allowed || !consent}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void load(file);
            }}
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <Button
            disabled={busy}
            onClick={() => {
              setData(syntheticModelSummary(profile));
              setError("");
              setSuccess(
                "Contoh model sintetis dimuat; bukan hasil data DM2024.",
              );
            }}
          >
            Muat contoh model sintetis
          </Button>
          <Button
            disabled={busy || !allowed}
            onClick={() => {
              setData(syntheticDiagnosisSummary(profile));
              setError("");
              setSuccess("Contoh sintetis dimuat; bukan hasil file DM2024.");
            }}
          >
            Muat contoh sintetis
          </Button>
          <Button
            disabled={busy || !data}
            onClick={() => {
              setData(null);
              setSuccess("Ringkasan dihapus dari memori halaman.");
              setError("");
            }}
          >
            Hapus ringkasan dari memori
          </Button>
        </div>
        {!allowed && (
          <p className="text-sm text-amber-700">
            Analisis tersedia bagi Admin Demo, Verifikator, dan Komite Medik.
            Role lokal bukan otorisasi produksi.
          </p>
        )}
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold">
            Perintah pengolahan lokal
          </summary>
          <pre className="mt-3 overflow-auto rounded-xl bg-slate-100 p-3 text-xs dark:bg-slate-800">
            {
              "python -m pip install -r tools/requirements-diagnoses.txt\npython tools/process_diagnoses.py /path/DM2024_fkrtl.dta --inspect\npython tools/process_diagnoses.py /path/DM2024_fkrtl.dta --dataset FKRTL --diagnosis-column KOLOM_RESMI --output /tmp/fkrtl-diagnosis-summary.json"
            }
          </pre>
        </details>
      </Card>
      {busy && <p role="status">Memvalidasi dan mengolah ringkasan…</p>}
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {success}
        </p>
      )}
      {result ? (
        <>
          <TrainedQualityModel data={data!} />
          <Badge tone={data!.mode === "SYNTHETIC" ? "blue" : "amber"}>
            {data!.mode === "SYNTHETIC"
              ? "DATA SINTETIS"
              : "AGREGAT PENGGUNA · BUKAN DATA DEMO"}
          </Badge>
          <p className="text-sm font-semibold">
            Sumber dataset: {data!.dataset} · Profil tidak membuktikan isi atau
            keaslian data.
          </p>
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              ["Baris sumber", data!.rows],
              ["Format kode valid", `${result.usablePercent}%`],
              ["Kode hilang", data!.missing],
              ["Format tidak didukung", data!.invalid],
            ].map(([name, value]) => (
              <Card key={name} className="p-4">
                <p className="text-xs text-slate-500">{name}</p>
                <b className="text-2xl">{value}</b>
              </Card>
            ))}
          </div>
          <Card className="p-5">
            <h2 className="mb-3 font-bold">Penjelasan analisis</h2>
            {result.signals.map((s) => (
              <div key={s.code} className="mb-3 rounded-xl border p-3">
                <Badge tone={s.severity === "REVIEW" ? "amber" : "blue"}>
                  {s.code}
                </Badge>
                <p className="mt-2 text-sm">{s.reason}</p>
              </div>
            ))}
          </Card>
          <Card>
            {result.ranked.length ? (
              <Table
                headers={[
                  "Kode diagnosis (format)",
                  "Frekuensi baris",
                  "Proporsi seluruh baris sumber",
                ]}
              >
                {result.ranked.map((g) => (
                  <tr className="border-b" key={g.code}>
                    <td className="p-4">{g.code}</td>
                    <td className="p-4">{g.count}</td>
                    <td className="p-4">
                      {((100 * g.count) / data!.rows).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </Table>
            ) : (
              <EmptyState title="Tidak ada kelompok yang memenuhi ambang publikasi" />
            )}
          </Card>
          <p className="text-xs text-slate-500">
            Ambang kelompok: {data!.minCellCount}. Baris kode yang disupresi:{" "}
            {data!.suppressed}. Tidak ada pencampuran dengan database transaksi
            sintetis, pengiriman ke LLM, atau pelatihan model.
          </p>
        </>
      ) : (
        <EmptyState title="Belum ada ringkasan diagnosis yang dimuat" />
      )}
    </div>
  );
}
