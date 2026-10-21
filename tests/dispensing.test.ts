import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import {
  DispensingService,
  MemoryStore,
  ProviderError,
  adapterStatus,
  callProvider,
  csv,
  id,
  localAdapters,
  seed,
  stateSchema,
  type Actor,
  type BiometricVerificationProvider,
  type Command,
  type Scenario,
} from "../src/lib/dispensing/domain.ts";
const actor: Actor = {
  id: "DEMO-ACTOR-0001",
  role: "Admin Demo",
  expiresAt: Date.now() + 3600000,
};
async function setup(scenario: Scenario = "SUCCESS", rxId = "DEMO-RX-0001") {
  const store = new MemoryStore(),
    service = new DispensingService(store);
  const rx = store.state.synthetic_prescriptions.find((r) => r.id === rxId)!;
  const v = await service.verify(actor, rx.memberId, "FACE", scenario);
  const p = store.state.synthetic_product_catalog.find(
    (p) => p.id === rx.productId,
  )!;
  const scan = await service.scan(actor, rxId, p.barcode, "SIMULATION");
  const c: Command = {
    rxId,
    verificationId: v.id,
    scanId: scan.id,
    quantity: 1,
    idempotencyKey: id("REQUEST"),
    confirmed: true,
    mode: "SIMULATION_ONLY",
  };
  return { store, service, c };
}
test("successful demo commits transaction and audit; preserves SIMULATION_ONLY", async () => {
  const { store, service, c } = await setup();
  const t = await service.dispense(actor, c);
  assert.equal(t.status, "COMPLETED");
  assert.equal(t.mode, "SIMULATION_ONLY");
  assert.equal(store.state.synthetic_dispensing_transactions.length, 1);
  for (const action of [
    "VERIFICATION_REQUEST",
    "VERIFICATION_RESULT",
    "BARCODE_SCAN",
    "PRODUCT_MATCH",
    "DISPENSING_CONFIRMED",
    "STATUS_CHANGED",
  ])
    assert.ok(
      store.state.synthetic_audit_logs.some((a) => a.action === action),
    );
});
for (const scenario of [
  "FAILED",
  "PENDING",
  "EXPIRED",
  "REQUIRES_REVIEW",
  "UNAVAILABLE",
  "NOT_CONNECTED",
] as Scenario[])
  test(`${scenario} verification prevents dispensing`, async () => {
    const { store, service, c } = await setup(scenario);
    await assert.rejects(service.dispense(actor, c), /VERIFICATION_INVALID/);
    assert.equal(store.state.synthetic_dispensing_transactions.length, 0);
    assert.ok(
      store.state.synthetic_audit_logs.some(
        (a) => a.action === "TRANSACTION_REJECTED",
      ),
    );
  });
test("unverified member cannot dispense", async () => {
  const { store, service, c } = await setup();
  store.state.synthetic_biometric_verifications = [];
  await assert.rejects(service.dispense(actor, c), /VERIFICATION_INVALID/);
});
test("verified simulation still needs entitlement from authorized demo source", async () => {
  const { service, c } = await setup("SUCCESS", "DEMO-RX-0003");
  await assert.rejects(service.dispense(actor, c), /NO_ELIGIBILITY/);
});
test("account ownership is independent", async () => {
  const { service, c } = await setup("SUCCESS", "DEMO-RX-0005");
  await assert.rejects(service.dispense(actor, c), /ACCOUNT_NOT_OWNED/);
});
test("newer failed verification supersedes earlier success", async () => {
  const { service, c } = await setup();
  await service.verify(actor, "DEMO-MEMBER-0001", "FINGERPRINT", "FAILED");
  await assert.rejects(service.dispense(actor, c), /VERIFICATION_INVALID/);
});
test("unknown and wrong barcodes rejected and audited", async () => {
  const { service, c, store } = await setup();
  for (const barcode of ["DEMO-BC-9999", "DEMO-BC-0002"]) {
    const scan = await service.scan(actor, c.rxId, barcode, "MANUAL");
    await assert.rejects(
      service.dispense(actor, { ...c, scanId: scan.id }),
      /PRODUCT_MISMATCH/,
    );
  }
  assert.equal(store.state.synthetic_barcode_scans.at(-1)?.status, "MISMATCH");
});
test("quantity exceeding entitlement rejected", async () => {
  const { service, c } = await setup();
  await assert.rejects(
    service.dispense(actor, { ...c, quantity: 31 }),
    /QUANTITY_EXCEEDED/,
  );
  for (const quantity of [0, -1, 0.5, NaN])
    await assert.rejects(service.dispense(actor, { ...c, quantity }));
});
test("duplicate and concurrent requests commit only once", async () => {
  const { service, c, store } = await setup();
  const results = await Promise.allSettled([
    service.dispense(actor, c),
    service.dispense(actor, { ...c, idempotencyKey: id("REQUEST") }),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(store.state.synthetic_dispensing_transactions.length, 1);
  assert.ok(
    store.state.synthetic_audit_logs.some(
      (a) => a.action === "DUPLICATE_ATTEMPT",
    ),
  );
});
test("idempotency replay returns same result, conflicting payload rejected", async () => {
  const { service, c, store } = await setup();
  const t = await service.dispense(actor, c);
  assert.equal((await service.dispense(actor, c)).id, t.id);
  await assert.rejects(
    service.dispense(actor, { ...c, quantity: 2 }),
    /IDEMPOTENCY_CONFLICT/,
  );
  assert.equal(store.state.synthetic_dispensing_transactions.length, 1);
});
test("expired and cancelled prescriptions cannot be used", async () => {
  for (const rx of ["DEMO-RX-0007", "DEMO-RX-0008"]) {
    const { service, c } = await setup("SUCCESS", rx);
    await assert.rejects(service.dispense(actor, c), /RX_EXPIRED|RX_CANCELLED/);
  }
});
test("expiry and per-service shelf life rechecked at commit", async () => {
  const { store, service, c } = await setup("SUCCESS", "DEMO-RX-0002");
  store.state.synthetic_product_catalog[1].expiry = "2020-01-01";
  await assert.rejects(
    service.dispense(actor, c),
    /PRODUCT_DATA_CHANGED|PRODUCT_EXPIRED/,
  );
  const scan = await service.scan(actor, c.rxId, "DEMO-BC-0002", "MANUAL");
  assert.equal(scan.status, "EXPIRED");
});
test("provider schema, timeout, correlation and safe retries", async () => {
  let tries = 0;
  const corr = id("CORR");
  await assert.rejects(
    callProvider(
      async () => {
        tries++;
        throw new ProviderError("OFFLINE", true);
      },
      z.object({ ok: z.boolean() }),
      corr,
      { timeoutMs: 10, retries: 1 },
    ),
    /OFFLINE/,
  );
  assert.equal(tries, 2);
  await assert.rejects(
    callProvider(
      () => new Promise(() => {}),
      z.object({ ok: z.boolean() }),
      corr,
      { timeoutMs: 5, retries: 0 },
    ),
    /PROVIDER_TIMEOUT/,
  );
  await assert.rejects(
    callProvider(
      async () => ({
        source: "MOCK",
        at: new Date().toISOString(),
        connection: "SIMULATION_ONLY",
        correlationId: id("CORR"),
        data: { ok: true },
      }),
      z.object({ ok: z.boolean() }),
      corr,
    ),
    /CORRELATION_MISMATCH/,
  );
});
test("provider cannot fabricate VERIFIED identity in simulation", async () => {
  const store = new MemoryStore(),
    service = new DispensingService(store);
  const provider: BiometricVerificationProvider = {
    async verify(input) {
      return {
        source: "MOCK",
        at: new Date().toISOString(),
        connection: "SIMULATION_ONLY",
        correlationId: input.correlationId,
        data: { status: "VERIFIED" },
      };
    },
  };
  const v = await service.verify(
    actor,
    "DEMO-MEMBER-0001",
    "FACE",
    "SUCCESS",
    provider,
  );
  assert.equal(v.status, "PENDING");
  assert.ok(
    store.state.synthetic_audit_logs.some(
      (a) => a.reason === "PRODUCTION_RESULT_REJECTED",
    ),
  );
});
test("failure never invents success and audit has no raw secrets", async () => {
  const { store } = await setup("UNAVAILABLE");
  assert.ok(
    store.state.synthetic_audit_logs.some(
      (a) => a.action === "CONNECTION_FAILURE",
    ),
  );
  assert.equal(
    store.state.synthetic_biometric_verifications[0].status,
    "PENDING",
  );
  assert.doesNotMatch(
    JSON.stringify(store.state.synthetic_audit_logs),
    /password|template|access_token/i,
  );
});
test("synthetic and production cannot mix", () => {
  const s = seed();
  assert.throws(() =>
    stateSchema.parse({
      ...s,
      synthetic_members: [{ ...s.synthetic_members[0], mode: "PRODUCTION" }],
    }),
  );
  assert.throws(() =>
    stateSchema.parse({
      ...s,
      synthetic_members: [{ ...s.synthetic_members[0], id: "REAL-MEMBER-123" }],
    }),
  );
});
test("CSV uses allowlist, excludes unknown fields, rejects production and escapes formulas", () => {
  const m = seed().synthetic_members[0];
  const output = csv("synthetic_members", [{ ...m, password: "secret" }]);
  assert.ok(output.includes("SIMULATION_ONLY"));
  assert.ok(!output.includes("password"));
  assert.ok(!output.includes("secret"));
  assert.throws(() => csv("synthetic_members", [{ ...m, mode: "PRODUCTION" }]));
  const p = seed().synthetic_product_catalog[0];
  assert.ok(
    csv("synthetic_product_catalog", [
      { ...p, name: '=HYPERLINK("bad")' },
    ]).includes("'=HYPERLINK"),
  );
});
test("RBAC is enforced by service and session expires", async () => {
  const { service, c } = await setup();
  await assert.rejects(
    service.dispense({ ...actor, role: "Perawat CAPD" }, c),
    /ROLE_FORBIDDEN/,
  );
  await assert.rejects(
    service.verify(
      { ...actor, expiresAt: 0 },
      "DEMO-MEMBER-0001",
      "FACE",
      "SUCCESS",
    ),
    /SESSION_EXPIRED/,
  );
  await assert.rejects(
    service.configure({ ...actor, role: "Apoteker FKTP" }, seed().rules, 30),
    /ROLE_FORBIDDEN/,
  );
});
test("cancel keeps entitlement consumed and records audit", async () => {
  const { service, c, store } = await setup();
  const t = await service.dispense(actor, c);
  await service.cancel(actor, t.id);
  await assert.rejects(
    service.dispense(actor, { ...c, idempotencyKey: id("REQUEST") }),
    /DUPLICATE/,
  );
  assert.ok(
    store.state.synthetic_audit_logs.some(
      (a) => a.action === "TRANSACTION_CANCELLED",
    ),
  );
});
test("retention removes spent rights so they cannot reopen", async () => {
  const { service, c, store } = await setup();
  const t = await service.dispense(actor, c);
  store.state.synthetic_dispensing_transactions[0].at =
    "2020-01-01T00:00:00.000Z";
  await service.purge(actor);
  assert.ok(!store.state.synthetic_prescriptions.some((r) => r.id === c.rxId));
  assert.ok(
    !store.state.synthetic_dispensing_transactions.some((r) => r.id === t.id),
  );
  assert.ok(
    store.state.synthetic_audit_logs.some(
      (a) => a.action === "RETENTION_PURGE",
    ),
  );
});
test("local lookup adapters validate input and preserve source, time and correlation", async () => {
  const store = new MemoryStore();
  const adapters = localAdapters(store, actor),
    correlationId = id("CORR"),
    signal = new AbortController().signal;
  const rx = await adapters.prescriptions.get(
    { rxId: "DEMO-RX-0001", correlationId },
    signal,
  );
  assert.equal(rx.data.memberId, "DEMO-MEMBER-0001");
  assert.equal(rx.correlationId, correlationId);
  assert.equal(rx.connection, "SIMULATION_ONLY");
  const product = await adapters.products.lookup(
    { barcode: "DEMO-BC-0001", correlationId },
    signal,
  );
  assert.equal(product.data?.id, rx.data.productId);
});
test("all integration statuses reflect configured mode", () => {
  assert.equal(adapterStatus().length, 8);
  assert.ok(adapterStatus().every((a) => a.status === "SIMULATION_ONLY"));
  assert.ok(adapterStatus(true).every((a) => a.status === "NOT_CONNECTED"));
});
test("pending newer verification cannot be superseded by a slow earlier success", async () => {
  const store = new MemoryStore(),
    service = new DispensingService(store);
  let release!: () => void;
  const slow: BiometricVerificationProvider = {
    async verify(input) {
      await new Promise<void>((r) => {
        release = r;
      });
      return {
        source: "MOCK",
        at: new Date().toISOString(),
        connection: "SIMULATION_ONLY",
        correlationId: input.correlationId,
        data: { status: "SIMULATION_ONLY" },
      };
    },
  };
  const pending = service.verify(
    actor,
    "DEMO-MEMBER-0001",
    "FACE",
    "SUCCESS",
    slow,
  );
  while (!release) await new Promise((r) => setTimeout(r, 1));
  const failed = await service.verify(
    actor,
    "DEMO-MEMBER-0001",
    "FACE",
    "FAILED",
  );
  release();
  const old = await pending;
  const scan = await service.scan(
    actor,
    "DEMO-RX-0001",
    "DEMO-BC-0001",
    "SIMULATION",
  );
  for (const verificationId of [old.id, failed.id])
    await assert.rejects(
      service.dispense(actor, {
        rxId: "DEMO-RX-0001",
        verificationId,
        scanId: scan.id,
        quantity: 1,
        idempotencyKey: id("REQUEST"),
        confirmed: true,
        mode: "SIMULATION_ONLY",
      }),
      /VERIFICATION_INVALID/,
    );
});
test("missing batch obeys configured per-service rule and updates are audited", async () => {
  const { store, service, c } = await setup();
  store.state.synthetic_product_catalog[0].batch = "";
  const scan = await service.scan(actor, c.rxId, "DEMO-BC-0001", "MANUAL");
  assert.equal(scan.status, "BATCH_REQUIRED");
  const rules = structuredClone(store.state.rules);
  rules.PRB.requireBatch = false;
  await service.configure(actor, rules, 30);
  const optional = await service.scan(actor, c.rxId, "DEMO-BC-0001", "MANUAL");
  assert.equal(optional.status, "MATCH");
  await service.dispense(actor, { ...c, scanId: optional.id });
  assert.ok(
    store.state.synthetic_audit_logs.some((a) => a.action === "RULES_CHANGED"),
  );
});
test("expired verification and expired scan rejected at commit", async () => {
  const { store, service, c } = await setup();
  store.state.synthetic_biometric_verifications[0].expiresAt =
    "2020-01-01T00:00:00.000Z";
  await assert.rejects(service.dispense(actor, c), /VERIFICATION_INVALID/);
  store.state.synthetic_biometric_verifications[0].expiresAt = new Date(
    Date.now() + 60000,
  ).toISOString();
  store.state.synthetic_barcode_scans[0].at = "2020-01-01T00:00:00.000Z";
  await assert.rejects(service.dispense(actor, c), /SCAN_EXPIRED/);
});
test("failed atomic store mutation does not leave partial transaction or audit", async () => {
  const store = new MemoryStore();
  const before = await store.read();
  await assert.rejects(
    store.mutate((s) => {
      s.synthetic_members = [];
      throw new Error("ROLLBACK");
    }),
    /ROLLBACK/,
  );
  assert.deepEqual(await store.read(), before);
});
test("dispensing adapter retry is idempotent and envelope validates", async () => {
  const { store, c } = await setup();
  const adapter = localAdapters(store, actor).dispensing,
    correlationId = id("CORR");
  const signal = new AbortController().signal;
  const first = await adapter.commit({ ...c, correlationId }, signal),
    again = await adapter.commit({ ...c, correlationId }, signal);
  assert.equal(first.data.id, again.data.id);
  assert.equal(first.connection, "SIMULATION_ONLY");
  assert.equal(store.state.synthetic_dispensing_transactions.length, 1);
});
