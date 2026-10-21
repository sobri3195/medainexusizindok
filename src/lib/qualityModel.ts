import { z } from "zod";
import rawModel from "../models/quality-model.json" with { type: "json" };
import {
  diagnosisSummarySchema,
  type DiagnosisSummary,
} from "./diagnosisAnalysis.ts";
const vector = z.array(z.number()).length(5);
const probability = z.number().min(0).max(1);
export const modelSchema = z
  .object({
    format: z.literal("jelas-quality-logistic-v1"),
    id: z.literal("SYNTHETIC-QUALITY-20261022"),
    trainingMode: z.literal("SYNTHETIC_ONLY"),
    task: z.literal("SYNTHETIC_DATA_QUALITY_REVIEW"),
    features: z.tuple([
      z.literal("missing_rate"),
      z.literal("invalid_rate"),
      z.literal("suppressed_valid_rate"),
      z.literal("log_rows"),
      z.literal("largest_code_share"),
    ]),
    mean: vector,
    scale: z.array(z.number().positive()).length(5),
    weights: vector,
    intercept: z.number(),
    threshold: probability,
    minimum: vector,
    maximum: vector,
    split: z
      .object({
        train: z.number().int().positive(),
        validation: z.number().int().positive(),
        test: z.number().int().positive(),
        seeds: z.array(z.number().int()).length(3),
      })
      .strict(),
    metrics: z
      .object({
        roc_auc: probability,
        average_precision: probability,
        balanced_accuracy: probability,
        precision: probability,
        recall: probability,
        brier: probability,
        baseline_brier: probability,
        baseline_average_precision: probability,
        confusion_matrix: z
          .array(z.array(z.number().int().nonnegative()).length(2))
          .length(2),
      })
      .strict(),
    sklearnVersion: z.string(),
    parity: z.array(z.object({ features: vector, probability }).strict()),
    limitations: z.array(z.string()),
  })
  .strict();
export const qualityModel = modelSchema.parse(rawModel);
export function scoreVector(features: number[]) {
  const values = vector.parse(features);
  const contributions = values.map((v, i) => ({
    feature: qualityModel.features[i],
    value: v,
    contribution:
      ((v - qualityModel.mean[i]) / qualityModel.scale[i]) *
      qualityModel.weights[i],
  }));
  const logit =
    qualityModel.intercept +
    contributions.reduce((sum, x) => sum + x.contribution, 0);
  const probability = 1 / (1 + Math.exp(-logit));
  return { probability, contributions };
}
export function predictQuality(input: unknown) {
  const data = diagnosisSummarySchema.parse(input);
  if (data.mode !== "SYNTHETIC")
    return {
      status: "ABSTAIN" as const,
      reason:
        "Model hanya dilatih pada data sintetis; inferensi pada agregat pengguna belum diizinkan atau divalidasi.",
    };
  if (data.valid === 0 || data.groups.length === 0)
    return {
      status: "ABSTAIN" as const,
      reason:
        "Tidak cukup diagnosis valid yang dipublikasikan untuk fitur model.",
    };
  const features = [
    data.missing / data.rows,
    data.invalid / data.rows,
    data.suppressed / data.valid,
    Math.log(data.rows),
    Math.max(...data.groups.map((g) => g.count)) / data.valid,
  ];
  if (
    features.some(
      (v, i) => v < qualityModel.minimum[i] || v > qualityModel.maximum[i],
    )
  )
    return {
      status: "ABSTAIN" as const,
      reason:
        "Fitur berada di luar rentang data training sintetis. Model menahan prediksi.",
    };
  const result = scoreVector(features);
  return {
    status: "SCORED" as const,
    modelId: qualityModel.id,
    ...result,
    review: result.probability >= qualityModel.threshold,
  };
}
export function syntheticModelSummary(
  dataset: DiagnosisSummary["dataset"],
): DiagnosisSummary {
  return {
    format: "jelas-diagnoses-aggregate-v1",
    mode: "SYNTHETIC",
    dataset,
    sourceType: "STATA_LOCAL_AGGREGATION",
    minCellCount: 10,
    rows: 2000,
    missing: 300,
    invalid: 300,
    valid: 1400,
    suppressed: 200,
    groups: [
      { code: "E11.9", count: 700 },
      { code: "I10", count: 500 },
    ],
  };
}
