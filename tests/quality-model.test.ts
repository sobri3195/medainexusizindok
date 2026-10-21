import test from "node:test";
import assert from "node:assert/strict";
import {
  modelSchema,
  predictQuality,
  qualityModel,
  scoreVector,
  syntheticModelSummary,
} from "../src/lib/qualityModel.ts";
test("browser logistic inference matches held-out sklearn probabilities", () => {
  for (const point of qualityModel.parity)
    assert.ok(
      Math.abs(scoreVector(point.features).probability - point.probability) <
        1e-12,
    );
});
test("trained synthetic example yields score with exact log-odds explanation", () => {
  const result = predictQuality(syntheticModelSummary("FKRTL"));
  assert.equal(result.status, "SCORED");
  if (result.status !== "SCORED") throw new Error("expected score");
  assert.ok(result.probability >= 0 && result.probability <= 1);
  const logit =
    qualityModel.intercept +
    result.contributions.reduce((n, c) => n + c.contribution, 0);
  assert.ok(Math.abs(1 / (1 + Math.exp(-logit)) - result.probability) < 1e-12);
  assert.equal(result.review, result.probability >= qualityModel.threshold);
});
test("user aggregates are never scored by synthetic-trained model", () => {
  const result = predictQuality({
    ...syntheticModelSummary("FKRTL"),
    mode: "USER_AGGREGATE",
  });
  assert.equal(result.status, "ABSTAIN");
  assert.equal("probability" in result, false);
});
test("out-of-distribution and insufficient published data abstain", () => {
  const s = syntheticModelSummary("FKRTL");
  assert.equal(
    predictQuality({
      ...s,
      rows: 2000000,
      missing: 300000,
      invalid: 300000,
      valid: 1400000,
      suppressed: 200000,
      groups: [
        { code: "E11.9", count: 700000 },
        { code: "I10", count: 500000 },
      ],
    }).status,
    "ABSTAIN",
  );
  assert.equal(
    predictQuality({ ...s, groups: [], suppressed: s.valid }).status,
    "ABSTAIN",
  );
});
test("artifact rejects unsafe/inconsistent model parameter types", () => {
  assert.throws(() =>
    modelSchema.parse({ ...qualityModel, scale: [0, 1, 1, 1, 1] }),
  );
  assert.throws(() =>
    modelSchema.parse({ ...qualityModel, weights: [NaN, 1, 1, 1, 1] }),
  );
  assert.throws(() =>
    modelSchema.parse({ ...qualityModel, trainingMode: "PRODUCTION" }),
  );
});
test("artifact records honest synthetic scope, separate splits and baseline", () => {
  assert.equal(qualityModel.split.train, 4000);
  assert.equal(new Set(qualityModel.split.seeds).size, 3);
  assert.ok(qualityModel.metrics.brier < qualityModel.metrics.baseline_brier);
  assert.ok(qualityModel.limitations.some((x) => x.includes("No DM2024")));
  assert.equal(
    qualityModel.metrics.confusion_matrix.flat().reduce((n, x) => n + x, 0),
    qualityModel.split.test,
  );
});
