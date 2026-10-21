import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeDiagnoses,
  syntheticDiagnosisSummary,
} from "../src/lib/diagnosisAnalysis.ts";
test("synthetic example has deterministic explained aggregate analysis", () => {
  const r = analyzeDiagnoses(syntheticDiagnosisSummary());
  assert.equal(r.usablePercent, 90);
  assert.equal(r.ranked[0].code, "E11.9");
  assert.ok(r.signals.some((s) => s.code === "INVALID_CODE_FORMAT"));
  assert.equal(r.data.mode, "SYNTHETIC");
});
test("import separates user aggregates from synthetic records", () => {
  const r = analyzeDiagnoses({
    ...syntheticDiagnosisSummary(),
    mode: "USER_AGGREGATE",
  });
  assert.equal(r.data.mode, "USER_AGGREGATE");
  assert.equal("members" in r.data, false);
});
test("rejects inconsistent totals, duplicate groups and unsuppressed small cells", () => {
  const s = syntheticDiagnosisSummary();
  for (const bad of [
    { ...s, rows: 101 },
    { ...s, groups: [{ code: "E11.9", count: 5 }] },
    { ...s, minCellCount: 1 },
    {
      ...s,
      groups: [
        { code: "E11.9", count: 50 },
        { code: "E11.9", count: 35 },
      ],
    },
  ])
    assert.throws(() => analyzeDiagnoses(bad));
});
test("rejects raw rows, extra sensitive fields, unsafe codes and invalid numeric counts", () => {
  const s = syntheticDiagnosisSummary();
  for (const bad of [
    { ...s, patientId: "not-allowed" },
    { ...s, groups: [{ code: "NAMA PASIEN", count: 85 }] },
    { ...s, groups: [{ code: "E11.9", count: NaN }] },
    [{ diagnosis: "E11.9" }],
  ])
    assert.throws(() => analyzeDiagnoses(bad));
});
test("FKRTL and secondary profiles are explicit and legacy imports remain unspecified", () => {
  assert.equal(
    analyzeDiagnoses(syntheticDiagnosisSummary("FKRTL")).data.dataset,
    "FKRTL",
  );
  assert.equal(
    analyzeDiagnoses(syntheticDiagnosisSummary("SECONDARY_DIAGNOSES")).data
      .dataset,
    "SECONDARY_DIAGNOSES",
  );
  const { dataset: _, ...old } = syntheticDiagnosisSummary();
  void _;
  assert.equal(analyzeDiagnoses(old).data.dataset, "UNSPECIFIED");
  assert.throws(() =>
    analyzeDiagnoses({ ...old, dataset: "INVENTED_PROFILE" }),
  );
});
