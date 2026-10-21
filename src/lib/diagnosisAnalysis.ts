import { z } from "zod";
const count = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const diagnosisSummarySchema = z
  .object({
    format: z.literal("jelas-diagnoses-aggregate-v1"),
    mode: z.enum(["SYNTHETIC", "USER_AGGREGATE"]),
    sourceType: z.literal("STATA_LOCAL_AGGREGATION"),
    minCellCount: count.min(10),
    rows: count.min(10),
    missing: count,
    invalid: count,
    valid: count,
    suppressed: count,
    groups: z
      .array(
        z
          .object({
            code: z.string().regex(/^[A-Z][0-9]{2}(?:\.[A-Z0-9]{1,4})?$/),
            count: count,
          })
          .strict(),
      )
      .max(100000),
  })
  .strict()
  .superRefine((s, ctx) => {
    const total = s.groups.reduce((n, g) => n + g.count, 0);
    if (
      s.rows !== s.valid + s.invalid + s.missing ||
      s.valid !== total + s.suppressed ||
      s.minCellCount > s.rows ||
      s.groups.some((g) => g.count < s.minCellCount) ||
      new Set(s.groups.map((g) => g.code)).size !== s.groups.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Ringkasan tidak konsisten atau sel kecil tidak disupresi.",
      });
  });
export type DiagnosisSummary = z.infer<typeof diagnosisSummarySchema>;
export function analyzeDiagnoses(input: unknown) {
  const data = diagnosisSummarySchema.parse(input);
  const signals = [
    {
      code: "SOURCE_LIMITATION",
      severity: "INFO",
      reason:
        "Hitungan baris diagnosis, bukan jumlah pasien unik. Tidak ada deduplikasi peserta atau validasi klinis.",
    },
  ];
  if (data.invalid > 0)
    signals.push({
      code: "INVALID_CODE_FORMAT",
      severity: "REVIEW",
      reason: `${data.invalid} baris bukan format kode yang didukung; konfirmasi kolom dan kamus data. Validasi format bukan validasi kamus ICD resmi.`,
    });
  if (data.missing > 0)
    signals.push({
      code: "MISSING_DIAGNOSIS",
      severity: "REVIEW",
      reason: `${data.missing} baris tidak memiliki kode diagnosis.`,
    });
  if (data.suppressed > 0)
    signals.push({
      code: "SMALL_CELLS_SUPPRESSED",
      severity: "INFO",
      reason:
        "Kode dengan hitungan di bawah ambang tidak ditampilkan. Agregasi bukan jaminan anonimitas.",
    });
  return {
    data,
    signals,
    ranked: [...data.groups].sort(
      (a, b) => b.count - a.count || a.code.localeCompare(b.code),
    ),
    usablePercent: Number(((data.valid / data.rows) * 100).toFixed(1)),
  };
}
export function syntheticDiagnosisSummary(): DiagnosisSummary {
  return {
    format: "jelas-diagnoses-aggregate-v1",
    mode: "SYNTHETIC",
    sourceType: "STATA_LOCAL_AGGREGATION",
    minCellCount: 10,
    rows: 100,
    missing: 5,
    invalid: 5,
    valid: 90,
    suppressed: 5,
    groups: [
      { code: "E11.9", count: 50 },
      { code: "I10", count: 35 },
    ],
  };
}
