import { Badge, Card, Table } from "./ui";
import { predictQuality, qualityModel } from "../lib/qualityModel";
import type { DiagnosisSummary } from "../lib/diagnosisAnalysis";
export function TrainedQualityModel({ data }: { data: DiagnosisSummary }) {
  const result = predictQuality(data),
    model = qualityModel;
  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold">Model AI terlatih · review kualitas data</h2>
        <Badge tone="amber">TRAINED · SYNTHETIC ONLY</Badge>
      </div>
      <p className="text-sm text-slate-500">
        Regresi logistik: bobot dipelajari dari{" "}
        {model.split.train.toLocaleString("id-ID")} contoh sintetis. Threshold
        dipilih pada {model.split.validation} contoh validasi; evaluasi terpisah
        pada {model.split.test} contoh uji. Label sintetis bukan ground truth
        reviewer atau klinis. Data DM2024 tidak digunakan.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["ROC-AUC sintetis", model.metrics.roc_auc.toFixed(3)],
          ["Brier sintetis", model.metrics.brier.toFixed(3)],
          ["Brier baseline", model.metrics.baseline_brier.toFixed(3)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"
          >
            <p className="text-xs">{label}</p>
            <b>{value}</b>
          </div>
        ))}
      </div>
      {result.status === "ABSTAIN" ? (
        <p
          role="status"
          className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800"
        >
          PREDIKSI DITAHAN · {result.reason}
        </p>
      ) : (
        <>
          <p role="status" className="text-sm">
            <b>
              {result.review
                ? "Prioritas review kualitas data sintetis"
                : "Di bawah threshold review sintetis"}
            </b>{" "}
            · Skor probabilitas label sintetis{" "}
            {(result.probability * 100).toFixed(1)}% · Threshold{" "}
            {(model.threshold * 100).toFixed(0)}%. Bukan probabilitas fraud atau
            penyakit.
          </p>
          <Table headers={["Fitur", "Nilai", "Kontribusi log-odds"]}>
            {result.contributions.map((c) => (
              <tr key={c.feature} className="border-b">
                <td className="p-3 text-xs">{c.feature}</td>
                <td className="p-3 text-xs">{c.value.toFixed(4)}</td>
                <td className="p-3 text-xs">
                  {c.contribution > 0 ? "+" : ""}
                  {c.contribution.toFixed(4)}
                </td>
              </tr>
            ))}
          </Table>
          <p className="text-xs text-slate-500">
            Intercept: {model.intercept.toFixed(4)}. Probabilitas =
            sigmoid(intercept + jumlah kontribusi). Kontribusi menjelaskan
            model, bukan hubungan sebab-akibat.
          </p>
        </>
      )}
      <p className="text-xs text-slate-500">
        ID: {model.id}. Tidak mengubah transaksi, hak layanan, atau keputusan
        petugas. Agregat pengguna dan data di luar rentang training ditahan.
      </p>
    </Card>
  );
}
