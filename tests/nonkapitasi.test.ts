import test from "node:test";
import assert from "node:assert/strict";
import {
  nonkapitasiSchema,
  structuralFeatures,
} from "../src/lib/nonkapitasi.ts";
import { syntheticModelSummary } from "../src/lib/qualityModel.ts";
function fixture() {
  return {
    format: "jelas-nonkapitasi-analysis-v1",
    dataset: "NONKAPITASI",
    mode: "SYNTHETIC",
    sourceSha256: "a".repeat(64),
    rows: 2000,
    minCellCount: 10,
    diagnosis: syntheticModelSummary("NONKAPITASI"),
    quality: structuralFeatures.map((feature) => ({
      feature,
      falseCount: null,
    })),
    model: {
      algorithm: "IsolationForest",
      trainingSource: "SYNTHETIC",
      features: [...structuralFeatures],
      trainRows: 1600,
      holdoutRows: 400,
      trainGroups: 80,
      holdoutGroups: 20,
      groupOverlap: 0,
      distinctFeaturePatterns: 2,
      trees: 100,
      seed: 42,
      contamination: 0.05,
      trainReviewBand: "0-10%",
      holdoutReviewBand: "0-10%",
      threshold: 0.5,
      portableParityMaxError: 0,
      evaluation: "UNLABELLED_HOLDOUT_NO_ACCURACY_CLAIM",
    },
  };
}
test("accepts structural nonkapitasi report with separated groups and synthetic provenance", () => {
  const r = nonkapitasiSchema.parse(fixture());
  assert.equal(r.rows, 2000);
  assert.equal(r.model.groupOverlap, 0);
});
test("rejects raw data, patient fields, group leakage and mixed source mode", () => {
  const r = fixture();
  for (const bad of [
    { ...r, patientIds: ["not-allowed"] },
    { ...r, model: { ...r.model, groupOverlap: 1 } },
    { ...r, mode: "USER_AGGREGATE" },
    { ...r, rows: 2001 },
    { ...r, model: { ...r.model, features: [] } },
  ])
    assert.throws(() => nonkapitasiSchema.parse(bad));
});
test("rejects small cell exposure and false metric claims", () => {
  const r = fixture();
  assert.throws(() =>
    nonkapitasiSchema.parse({
      ...r,
      quality: r.quality.map((q) => ({ ...q, falseCount: 1 })),
    }),
  );
  assert.throws(() =>
    nonkapitasiSchema.parse({ ...r, model: { ...r.model, accuracy: 0.99 } }),
  );
});
