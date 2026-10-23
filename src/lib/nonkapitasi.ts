import { z } from "zod";
import { diagnosisSummarySchema } from "./diagnosisAnalysis.ts";
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const structuralFeatures = [
  "primary_present",
  "primary_format_supported",
  "detail_present",
  "detail_format_supported",
  "prefix_consistent",
  "detail_canonical_representation",
] as const;
export const featureDescriptions: Record<string, string> = {
  primary_present: "Kode utama tersedia",
  primary_format_supported: "Format kode utama didukung",
  detail_present: "Kode rinci tersedia",
  detail_format_supported: "Format kode rinci didukung (termasuk compact)",
  prefix_consistent: "Prefix kode utama dan rinci konsisten",
  detail_canonical_representation:
    "Penulisan kode rinci sudah dalam bentuk kanonik; compact bukan kesalahan klinis",
};
export const nonkapitasiSchema = z
  .object({
    format: z.literal("jelas-nonkapitasi-analysis-v1"),
    dataset: z.literal("NONKAPITASI"),
    mode: z.enum(["SYNTHETIC", "USER_AGGREGATE"]),
    sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
    rows: count.min(100),
    minCellCount: z.literal(10),
    diagnosis: diagnosisSummarySchema,
    quality: z
      .array(
        z
          .object({
            feature: z.enum(structuralFeatures),
            falseCount: count.min(10).nullable(),
          })
          .strict(),
      )
      .length(6),
    model: z
      .object({
        algorithm: z.literal("IsolationForest"),
        trainingSource: z.enum(["UPLOADED_DATA", "SYNTHETIC"]),
        features: z.array(z.enum(structuralFeatures)).length(6),
        trainRows: count.min(20),
        holdoutRows: count.min(10),
        trainGroups: count.positive(),
        holdoutGroups: count.positive(),
        groupOverlap: z.literal(0),
        distinctFeaturePatterns: count.min(2).max(64),
        trees: z.literal(100),
        seed: z.literal(42),
        contamination: z.literal(0.05),
        trainReviewBand: z
          .string()
          .regex(
            /^(?:0-10|10-20|20-30|30-40|40-50|50-60|60-70|70-80|80-90|90-100)%$/,
          ),
        holdoutReviewBand: z
          .string()
          .regex(
            /^(?:0-10|10-20|20-30|30-40|40-50|50-60|60-70|70-80|80-90|90-100)%$/,
          ),
        threshold: z.number().min(0).max(1),
        portableParityMaxError: z.number().min(0).max(1e-10),
        evaluation: z.literal("UNLABELLED_HOLDOUT_NO_ACCURACY_CLAIM"),
      })
      .strict(),
  })
  .strict()
  .superRefine((s, ctx) => {
    if (
      s.model.trainRows + s.model.holdoutRows !== s.rows ||
      s.model.trainGroups > s.model.trainRows ||
      s.model.holdoutGroups > s.model.holdoutRows ||
      s.diagnosis.rows !== s.rows ||
      s.diagnosis.mode !== s.mode ||
      s.diagnosis.dataset !== "NONKAPITASI" ||
      (s.mode === "SYNTHETIC") !== (s.model.trainingSource === "SYNTHETIC") ||
      s.quality.some((q) => q.falseCount !== null && q.falseCount > s.rows) ||
      structuralFeatures.some((f, i) => s.model.features[i] !== f) ||
      new Set(s.quality.map((q) => q.feature)).size !== 6
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Laporan tidak konsisten, sumber tercampur, atau fitur tidak sesuai.",
      });
  });
export type NonkapitasiReport = z.infer<typeof nonkapitasiSchema>;
