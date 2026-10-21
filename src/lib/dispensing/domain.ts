import { z } from "zod";

export const statuses = [
  "VERIFIED",
  "FAILED",
  "PENDING",
  "EXPIRED",
  "REQUIRES_REVIEW",
  "SIMULATION_ONLY",
] as const;
export type ValidationStatus = (typeof statuses)[number];
export const scenarios = [
  "SUCCESS",
  "FAILED",
  "PENDING",
  "EXPIRED",
  "REQUIRES_REVIEW",
  "UNAVAILABLE",
  "NOT_CONNECTED",
] as const;
export type Scenario = (typeof scenarios)[number];
export type Kind = "PRB" | "DIALYSIS";
export type Role =
  | "DPJP"
  | "Perawat CAPD"
  | "Apoteker FKTP"
  | "Verifikator"
  | "Komite Medik"
  | "Admin Demo";
export type Actor = { id: string; role: Role; expiresAt: number };
export const syntheticId = z.string().regex(/^DEMO-[A-Z]+-\d{4,}$/);
const mode = z.literal("SIMULATION_ONLY");
export const memberSchema = z.object({
  id: syntheticId,
  alias: z.string().regex(/^Peserta sintetis \d+$/),
  accountOwned: z.boolean(),
  eligible: z.boolean(),
  mode,
});
export const productSchema = z.object({
  id: syntheticId,
  code: z.string(),
  barcode: z.string().regex(/^DEMO-BC-\d{4}$/),
  name: z.string(),
  kind: z.enum(["PRB", "DIALYSIS"]),
  size: z.string(),
  batch: z.union([z.string().regex(/^DEMO-BATCH-\d+$/), z.literal("")]),
  expiry: z.string().date(),
  mode,
});
export const prescriptionSchema = z.object({
  id: syntheticId,
  memberId: syntheticId,
  productId: syntheticId,
  kind: z.enum(["PRB", "DIALYSIS"]),
  allowed: z.number().int().positive(),
  validUntil: z.string().datetime(),
  state: z.enum(["ACTIVE", "CANCELLED"]),
  facility: z.literal("Fasilitas sintetis 01"),
  source: z.literal("SYNTHETIC_PRESCRIPTION"),
  mode,
});
export const verificationSchema = z.object({
  id: syntheticId,
  memberId: syntheticId,
  method: z.enum(["FACE", "FINGERPRINT"]),
  status: z.enum(statuses),
  accountOwned: z.boolean(),
  eligible: z.boolean(),
  source: z.string(),
  at: z.string().datetime(),
  expiresAt: z.string().datetime(),
  correlationId: syntheticId,
  mode,
});
export const scanSchema = z.object({
  id: syntheticId,
  rxId: syntheticId,
  productId: syntheticId.nullable(),
  barcode: z.string().regex(/^DEMO-BC-\d{4}$/),
  method: z.enum(["MANUAL", "CAMERA", "SIMULATION"]),
  at: z.string().datetime(),
  status: z.enum(["MATCH", "UNKNOWN", "MISMATCH", "EXPIRED", "BATCH_REQUIRED"]),
  batch: z.string(),
  expiry: z.string(),
  actorId: syntheticId,
  correlationId: syntheticId,
  mode,
});
export const transactionSchema = z.object({
  id: syntheticId,
  rxId: syntheticId,
  memberId: syntheticId,
  productId: syntheticId,
  verificationId: syntheticId,
  scanId: syntheticId,
  kind: z.enum(["PRB", "DIALYSIS"]),
  quantity: z.number().int().positive(),
  at: z.string().datetime(),
  actorId: syntheticId,
  facility: z.string(),
  status: z.enum(["COMPLETED", "CANCELLED"]),
  idempotencyKey: syntheticId,
  mode,
});
export const auditSchema = z.object({
  id: syntheticId,
  at: z.string().datetime(),
  actorId: syntheticId,
  action: z.string(),
  status: z.string(),
  correlationId: syntheticId,
  reason: z.string(),
  entityId: syntheticId,
  mode,
});
export type Member = z.infer<typeof memberSchema>;
export type Product = z.infer<typeof productSchema>;
export type Prescription = z.infer<typeof prescriptionSchema>;
export type Verification = z.infer<typeof verificationSchema>;
export type Scan = z.infer<typeof scanSchema>;
export type DispensingTransaction = z.infer<typeof transactionSchema>;
export type Audit = z.infer<typeof auditSchema>;
export const stateSchema = z.object({
  version: z.literal(1),
  synthetic_members: z.array(memberSchema),
  synthetic_biometric_verifications: z.array(verificationSchema),
  synthetic_prescriptions: z.array(prescriptionSchema),
  synthetic_product_catalog: z.array(productSchema),
  synthetic_dispensing_transactions: z.array(transactionSchema),
  synthetic_barcode_scans: z.array(scanSchema),
  synthetic_audit_logs: z.array(auditSchema),
  rules: z.object({
    PRB: z.object({
      requireBatch: z.boolean(),
      minShelfDays: z.number().int().min(0).max(365),
    }),
    DIALYSIS: z.object({
      requireBatch: z.boolean(),
      minShelfDays: z.number().int().min(0).max(365),
    }),
  }),
  retentionDays: z.number().int().min(1).max(365),
});
export type State = z.infer<typeof stateSchema>;
export type Dataset = Exclude<
  keyof State,
  "version" | "rules" | "retentionDays"
>;
export const datasets: Dataset[] = [
  "synthetic_members",
  "synthetic_biometric_verifications",
  "synthetic_prescriptions",
  "synthetic_product_catalog",
  "synthetic_dispensing_transactions",
  "synthetic_barcode_scans",
  "synthetic_audit_logs",
];
export const now = () => new Date().toISOString();
export function id(prefix: string) {
  return `DEMO-${prefix}-${String(Date.now()).padStart(13, "0")}${String(Math.floor(Math.random() * 100000)).padStart(5, "0")}`;
}
export function seed(at = now()): State {
  const future = new Date(Date.parse(at) + 30 * 86400000).toISOString(),
    expiry = new Date(Date.parse(at) + 365 * 86400000)
      .toISOString()
      .slice(0, 10);
  return stateSchema.parse({
    version: 1,
    synthetic_members: Array.from({ length: 4 }, (_, i) => ({
      id: `DEMO-MEMBER-000${i + 1}`,
      alias: `Peserta sintetis ${i + 1}`,
      accountOwned: i !== 2,
      eligible: i !== 1,
      mode: "SIMULATION_ONLY",
    })),
    synthetic_product_catalog: [
      {
        id: "DEMO-PRODUCT-0001",
        code: "DEMO-PRB-A",
        barcode: "DEMO-BC-0001",
        name: "Produk PRB sintetis A",
        kind: "PRB",
        size: "Kemasan demo 30 unit",
        batch: "DEMO-BATCH-01",
        expiry,
        mode: "SIMULATION_ONLY",
      },
      {
        id: "DEMO-PRODUCT-0002",
        code: "DEMO-DIAL-A",
        barcode: "DEMO-BC-0002",
        name: "Cairan dialisis sintetis A",
        kind: "DIALYSIS",
        size: "2.000 mL · spesifikasi simulasi",
        batch: "DEMO-BATCH-02",
        expiry,
        mode: "SIMULATION_ONLY",
      },
      {
        id: "DEMO-PRODUCT-0003",
        code: "DEMO-DIAL-B",
        barcode: "DEMO-BC-0003",
        name: "Cairan dialisis sintetis B",
        kind: "DIALYSIS",
        size: "1.500 mL · spesifikasi simulasi",
        batch: "DEMO-BATCH-03",
        expiry: "2020-01-01",
        mode: "SIMULATION_ONLY",
      },
    ],
    synthetic_prescriptions: Array.from({ length: 9 }, (_, i) => ({
      id: `DEMO-RX-000${i + 1}`,
      memberId: `DEMO-MEMBER-000${i === 8 ? 1 : Math.floor(i / 2) + 1}`,
      productId:
        i === 8
          ? "DEMO-PRODUCT-0003"
          : i % 2
            ? "DEMO-PRODUCT-0002"
            : "DEMO-PRODUCT-0001",
      kind: i % 2 || i === 8 ? "DIALYSIS" : "PRB",
      allowed: i % 2 || i === 8 ? 10 : 30,
      validUntil: i === 6 ? "2020-01-01T00:00:00.000Z" : future,
      state: i === 7 ? "CANCELLED" : "ACTIVE",
      facility: "Fasilitas sintetis 01",
      source: "SYNTHETIC_PRESCRIPTION",
      mode: "SIMULATION_ONLY",
    })),
    synthetic_biometric_verifications: [],
    synthetic_dispensing_transactions: [],
    synthetic_barcode_scans: [],
    synthetic_audit_logs: [],
    rules: {
      PRB: { requireBatch: true, minShelfDays: 0 },
      DIALYSIS: { requireBatch: true, minShelfDays: 7 },
    },
    retentionDays: 30,
  });
}

// All provider calls use one envelope and runtime validation. No production endpoint exists here.
export const responseSchema = z.object({
  source: z.string().min(1),
  at: z.string().datetime(),
  connection: z.enum(["SIMULATION_ONLY", "NOT_CONNECTED"]),
  correlationId: syntheticId,
});
export type Envelope<T> = z.infer<typeof responseSchema> & { data: T };
export type Request = {
  memberId: string;
  correlationId: string;
  scenario: Scenario;
};
export interface BiometricVerificationProvider {
  verify(
    input: Request & { method: "FACE" | "FINGERPRINT" },
    signal: AbortSignal,
  ): Promise<Envelope<{ status: ValidationStatus }>>;
}
export interface FaceVerificationProvider extends BiometricVerificationProvider {
  readonly method: "FACE";
}
export interface FingerprintVerificationProvider extends BiometricVerificationProvider {
  readonly method: "FINGERPRINT";
}
export interface JKNMemberVerificationProvider {
  check(
    input: Request,
    signal: AbortSignal,
  ): Promise<Envelope<{ owned: boolean }>>;
}
export interface JKNEligibilityProvider {
  check(
    input: Request,
    signal: AbortSignal,
  ): Promise<Envelope<{ eligible: boolean }>>;
}
export interface PrescriptionProvider {
  get(
    input: { rxId: string; correlationId: string },
    signal: AbortSignal,
  ): Promise<Envelope<Prescription>>;
}
export interface ProductCatalogProvider {
  lookup(
    input: { barcode: string; correlationId: string },
    signal: AbortSignal,
  ): Promise<Envelope<Product | null>>;
}
export interface DispensingTransactionProvider {
  commit(
    input: Command & { correlationId: string },
    signal: AbortSignal,
  ): Promise<Envelope<DispensingTransaction>>;
}
export interface AuditLogProvider {
  append(
    input: Audit,
    signal: AbortSignal,
  ): Promise<Envelope<{ eventId: string }>>;
}
export class ProviderError extends Error {
  retryable: boolean;
  constructor(message: string, retryable = false) {
    super(message);
    this.retryable = retryable;
  }
}
export async function callProvider<T>(
  operation: (signal: AbortSignal) => Promise<Envelope<T>>,
  dataSchema: z.ZodType<T>,
  correlationId: string,
  options = { timeoutMs: 2000, retries: 1 },
): Promise<Envelope<T>> {
  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        operation(controller.signal),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new ProviderError("PROVIDER_TIMEOUT", true));
          }, options.timeoutMs);
        }),
      ]);
      const meta = responseSchema.parse(result);
      if (meta.correlationId !== correlationId)
        throw new ProviderError("CORRELATION_MISMATCH");
      if (meta.connection !== "SIMULATION_ONLY")
        throw new ProviderError("NOT_CONNECTED");
      return { ...meta, data: dataSchema.parse(result.data) };
    } catch (error) {
      if (
        !(error instanceof ProviderError) ||
        !error.retryable ||
        attempt >= options.retries
      )
        throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}
const requestSchema = z.object({
  memberId: syntheticId,
  correlationId: syntheticId,
  scenario: z.enum(scenarios),
});
function demoResponse<T>(input: Request, data: T): Envelope<T> {
  requestSchema.parse(input);
  if (input.scenario === "UNAVAILABLE")
    throw new ProviderError("PROVIDER_UNAVAILABLE", true);
  if (input.scenario === "NOT_CONNECTED")
    throw new ProviderError("NOT_CONNECTED");
  return {
    data,
    source: "LOCAL_SYNTHETIC_PROVIDER",
    at: now(),
    connection: "SIMULATION_ONLY",
    correlationId: input.correlationId,
  };
}
export const biometricProvider: BiometricVerificationProvider = {
  async verify(input, signal) {
    if (signal.aborted) throw new ProviderError("ABORTED");
    return demoResponse(input, {
      status:
        input.scenario === "SUCCESS"
          ? "SIMULATION_ONLY"
          : (input.scenario as ValidationStatus),
    });
  },
};
export const faceProvider: FaceVerificationProvider = {
  ...biometricProvider,
  method: "FACE",
};
export const fingerprintProvider: FingerprintVerificationProvider = {
  ...biometricProvider,
  method: "FINGERPRINT",
};
export function memberProvider(member: Member): JKNMemberVerificationProvider {
  return {
    async check(input) {
      return demoResponse(input, { owned: member.accountOwned });
    },
  };
}
export function eligibilityProvider(member: Member): JKNEligibilityProvider {
  return {
    async check(input) {
      return demoResponse(input, { eligible: member.eligible });
    },
  };
}
export const adapterNames = [
  "JKNMemberVerificationProvider",
  "JKNEligibilityProvider",
  "FaceVerificationProvider",
  "FingerprintVerificationProvider",
  "PrescriptionProvider",
  "DispensingTransactionProvider",
  "ProductCatalogProvider",
  "AuditLogProvider",
];
export function adapterStatus(production = false) {
  return adapterNames.map((name) => ({
    name,
    status: production ? "NOT_CONNECTED" : "SIMULATION_ONLY",
    source: production
      ? "Belum dikonfigurasi"
      : "IndexedDB / data sintetis lokal",
  }));
}

export interface Store {
  read(): Promise<State>;
  mutate<T>(fn: (state: State) => T): Promise<T>;
}
export class MemoryStore implements Store {
  state: State;
  private queue: Promise<unknown> = Promise.resolve();
  constructor(state = seed()) {
    this.state = stateSchema.parse(state);
  }
  async read() {
    return structuredClone(this.state);
  }
  mutate<T>(fn: (state: State) => T): Promise<T> {
    const task = this.queue.then(() => {
      const copy = structuredClone(this.state);
      const result = fn(copy);
      this.state = stateSchema.parse(copy);
      return result;
    });
    this.queue = task.catch(() => undefined);
    return task;
  }
}
export function authorize(
  actor: Actor,
  action: "verify" | "PRB" | "DIALYSIS" | "admin" | "read",
) {
  if (
    !syntheticId.safeParse(actor.id).success ||
    !Number.isFinite(actor.expiresAt) ||
    actor.expiresAt <= Date.now()
  )
    throw new Error("SESSION_EXPIRED");
  const allowed: Record<string, Role[]> = {
    verify: ["Admin Demo", "Verifikator", "Apoteker FKTP", "Perawat CAPD"],
    PRB: ["Admin Demo", "Apoteker FKTP"],
    DIALYSIS: ["Admin Demo", "Perawat CAPD"],
    admin: ["Admin Demo"],
    read: [
      "Admin Demo",
      "Verifikator",
      "Apoteker FKTP",
      "Perawat CAPD",
      "Komite Medik",
      "DPJP",
    ],
  };
  if (!allowed[action].includes(actor.role)) throw new Error("ROLE_FORBIDDEN");
}
function audit(
  s: State,
  actor: Actor,
  action: string,
  status: string,
  entityId: string,
  correlationId: string,
  reason = "",
) {
  s.synthetic_audit_logs.push(
    auditSchema.parse({
      id: id("EVENT"),
      at: now(),
      actorId: actor.id,
      action,
      status,
      entityId,
      correlationId,
      reason,
      mode: "SIMULATION_ONLY",
    }),
  );
}
const commandSchema = z.object({
  rxId: syntheticId,
  verificationId: syntheticId,
  scanId: syntheticId,
  quantity: z.number().int().positive().max(10000),
  idempotencyKey: syntheticId,
  confirmed: z.literal(true),
  mode,
});
export type Command = z.infer<typeof commandSchema>;
export class DispensingService {
  store: Store;
  constructor(store: Store) {
    this.store = store;
  }
  async verify(
    actor: Actor,
    memberId: string,
    method: "FACE" | "FINGERPRINT",
    scenario: Scenario,
    provider: BiometricVerificationProvider = method === "FACE"
      ? faceProvider
      : fingerprintProvider,
  ) {
    authorize(actor, "verify");
    syntheticId.parse(memberId);
    z.enum(["FACE", "FINGERPRINT"]).parse(method);
    z.enum(scenarios).parse(scenario);
    const correlationId = id("CORR"),
      verificationId = id("VERIFY"),
      at = now();
    const member = await this.store.mutate((s) => {
      const m = s.synthetic_members.find((x) => x.id === memberId);
      if (!m) throw new Error("MEMBER_NOT_FOUND");
      audit(
        s,
        actor,
        "VERIFICATION_REQUEST",
        "PENDING",
        memberId,
        correlationId,
      );
      return m;
    });
    let status: ValidationStatus = "PENDING",
      owned = false,
      eligible = false,
      source = "NO_RESPONSE",
      failure = "";
    try {
      const input = { memberId, correlationId, scenario };
      const bio = await callProvider(
        (signal) => provider.verify({ ...input, method }, signal),
        z.object({ status: z.enum(statuses) }),
        correlationId,
      );
      // A provider claiming VERIFIED is never accepted as JKN identity in this demo.
      if (bio.data.status === "VERIFIED")
        throw new ProviderError("PRODUCTION_RESULT_REJECTED");
      const account = await callProvider(
        (signal) => memberProvider(member).check(input, signal),
        z.object({ owned: z.boolean() }),
        correlationId,
      );
      const rights = await callProvider(
        (signal) => eligibilityProvider(member).check(input, signal),
        z.object({ eligible: z.boolean() }),
        correlationId,
      );
      status = bio.data.status;
      owned = account.data.owned;
      eligible = rights.data.eligible;
      source = bio.source;
    } catch (error) {
      failure =
        error instanceof ProviderError
          ? error.message
          : "INVALID_PROVIDER_RESPONSE";
      status = "PENDING";
    }
    const result = verificationSchema.parse({
      id: verificationId,
      memberId,
      method,
      status,
      accountOwned: owned,
      eligible,
      source,
      at,
      expiresAt: new Date(
        Date.parse(at) + (status === "EXPIRED" ? -1 : 15 * 60 * 1000),
      ).toISOString(),
      correlationId,
      mode: "SIMULATION_ONLY",
    });
    await this.store.mutate((s) => {
      authorize(actor, "verify");
      s.synthetic_biometric_verifications.push(result);
      audit(
        s,
        actor,
        failure ? "CONNECTION_FAILURE" : "VERIFICATION_RESULT",
        failure || status,
        result.id,
        correlationId,
        failure,
      );
    });
    return result;
  }
  async scan(
    actor: Actor,
    rxId: string,
    barcode: string,
    method: Scan["method"],
  ) {
    authorize(actor, "verify");
    syntheticId.parse(rxId);
    z.string()
      .regex(/^DEMO-BC-\d{4}$/)
      .parse(barcode);
    z.enum(["MANUAL", "CAMERA", "SIMULATION"]).parse(method);
    return this.store.mutate((s) => {
      const rx = s.synthetic_prescriptions.find((x) => x.id === rxId);
      if (!rx) throw new Error("RX_NOT_FOUND");
      authorize(actor, rx.kind);
      const p = s.synthetic_product_catalog.find((x) => x.barcode === barcode),
        rule = s.rules[rx.kind];
      const status: Scan["status"] = !p
        ? "UNKNOWN"
        : p.id !== rx.productId
          ? "MISMATCH"
          : Date.parse(`${p.expiry}T23:59:59.999Z`) <
              Date.now() + rule.minShelfDays * 86400000
            ? "EXPIRED"
            : rule.requireBatch && !p.batch
              ? "BATCH_REQUIRED"
              : "MATCH";
      const result = scanSchema.parse({
        id: id("SCAN"),
        rxId,
        barcode,
        method,
        productId: p?.id || null,
        batch: p?.batch || "",
        expiry: p?.expiry || "",
        at: now(),
        status,
        actorId: actor.id,
        correlationId: id("CORR"),
        mode: "SIMULATION_ONLY",
      });
      s.synthetic_barcode_scans.push(result);
      audit(s, actor, "BARCODE_SCAN", status, result.id, result.correlationId);
      audit(s, actor, "PRODUCT_MATCH", status, rxId, result.correlationId);
      return result;
    });
  }
  async dispense(actor: Actor, input: Command) {
    const c = commandSchema.parse(input);
    const correlationId = id("CORR");
    const outcome = await this.store.mutate((s) => {
      const rx = s.synthetic_prescriptions.find((x) => x.id === c.rxId);
      if (!rx) throw new Error("RX_NOT_FOUND");
      authorize(actor, rx.kind);
      const reject = (reason: string) => {
        audit(
          s,
          actor,
          reason === "DUPLICATE" ? "DUPLICATE_ATTEMPT" : "TRANSACTION_REJECTED",
          "FAILED",
          rx.id,
          correlationId,
          reason,
        );
        return { error: reason } as const;
      };
      const existing = s.synthetic_dispensing_transactions.find(
        (x) => x.idempotencyKey === c.idempotencyKey,
      );
      if (existing) {
        if (
          existing.rxId === c.rxId &&
          existing.quantity === c.quantity &&
          existing.verificationId === c.verificationId &&
          existing.scanId === c.scanId
        ) {
          audit(
            s,
            actor,
            "IDEMPOTENT_REPLAY",
            existing.status,
            existing.id,
            correlationId,
          );
          return { transaction: existing } as const;
        }
        return reject("IDEMPOTENCY_CONFLICT");
      }
      if (s.synthetic_dispensing_transactions.some((x) => x.rxId === rx.id))
        return reject("DUPLICATE");
      if (rx.state !== "ACTIVE") return reject("RX_CANCELLED");
      if (Date.parse(rx.validUntil) <= Date.now()) return reject("RX_EXPIRED");
      const member = s.synthetic_members.find((x) => x.id === rx.memberId),
        verification = s.synthetic_biometric_verifications.find(
          (x) => x.id === c.verificationId,
        );
      const latest = latestVerification(s, rx.memberId);
      if (
        !verification ||
        verification.id !== latest?.id ||
        verification.memberId !== rx.memberId ||
        verification.status !== "SIMULATION_ONLY" ||
        Date.parse(verification.expiresAt) <= Date.now()
      )
        return reject("VERIFICATION_INVALID");
      if (!member?.accountOwned || !verification.accountOwned)
        return reject("ACCOUNT_NOT_OWNED");
      if (!member.eligible || !verification.eligible)
        return reject("NO_ELIGIBILITY");
      if (c.quantity > rx.allowed) return reject("QUANTITY_EXCEEDED");
      const scan = s.synthetic_barcode_scans.find((x) => x.id === c.scanId),
        product = s.synthetic_product_catalog.find(
          (x) => x.id === rx.productId,
        ),
        rule = s.rules[rx.kind];
      if (
        !scan ||
        scan.rxId !== rx.id ||
        scan.status !== "MATCH" ||
        scan.productId !== rx.productId ||
        !product ||
        scan.barcode !== product.barcode
      )
        return reject("PRODUCT_MISMATCH");
      if (
        scan.batch !== product.batch ||
        scan.expiry !== product.expiry ||
        product.kind !== rx.kind
      )
        return reject("PRODUCT_DATA_CHANGED");
      if (
        Date.parse(`${product.expiry}T23:59:59.999Z`) <
        Date.now() + rule.minShelfDays * 86400000
      )
        return reject("PRODUCT_EXPIRED");
      if (rule.requireBatch && !product.batch) return reject("BATCH_REQUIRED");
      if (Date.parse(scan.at) + 15 * 60 * 1000 <= Date.now())
        return reject("SCAN_EXPIRED");
      const txn = transactionSchema.parse({
        id: id("TXN"),
        rxId: rx.id,
        memberId: rx.memberId,
        productId: product.id,
        verificationId: verification.id,
        scanId: scan.id,
        kind: rx.kind,
        quantity: c.quantity,
        at: now(),
        actorId: actor.id,
        facility: rx.facility,
        status: "COMPLETED",
        idempotencyKey: c.idempotencyKey,
        mode: "SIMULATION_ONLY",
      });
      s.synthetic_dispensing_transactions.push(txn);
      audit(
        s,
        actor,
        "DISPENSING_CONFIRMED",
        "COMPLETED",
        txn.id,
        correlationId,
        c.quantity < rx.allowed ? "PARTIAL_FINAL_NO_REMAINDER" : "",
      );
      audit(s, actor, "STATUS_CHANGED", "COMPLETED", txn.id, correlationId);
      return { transaction: txn } as const;
    });
    if ("error" in outcome) throw new Error(outcome.error);
    return outcome.transaction;
  }
  async cancel(actor: Actor, transactionId: string) {
    syntheticId.parse(transactionId);
    return this.store.mutate((s) => {
      const t = s.synthetic_dispensing_transactions.find(
        (x) => x.id === transactionId,
      );
      if (!t) throw new Error("TRANSACTION_NOT_FOUND");
      authorize(actor, t.kind);
      if (t.status !== "COMPLETED") throw new Error("ALREADY_CANCELLED");
      t.status = "CANCELLED";
      audit(
        s,
        actor,
        "TRANSACTION_CANCELLED",
        "CANCELLED",
        t.id,
        id("CORR"),
        "ENTITLEMENT_NOT_REOPENED",
      );
    });
  }
  async configure(actor: Actor, rules: State["rules"], retentionDays: number) {
    authorize(actor, "admin");
    const settings = stateSchema
      .pick({ rules: true, retentionDays: true })
      .parse({ rules, retentionDays });
    await this.store.mutate((s) => {
      s.rules = settings.rules;
      s.retentionDays = settings.retentionDays;
      audit(
        s,
        actor,
        "RULES_CHANGED",
        "SIMULATION_ONLY",
        "DEMO-CONFIG-0001",
        id("CORR"),
      );
    });
  }
  async purge(actor: Actor) {
    authorize(actor, "admin");
    return this.store.mutate((s) => {
      const cutoff = Date.now() - s.retentionDays * 86400000;
      const before = datasets.reduce((n, k) => n + s[k].length, 0);
      const oldTx = s.synthetic_dispensing_transactions.filter(
        (t) => Date.parse(t.at) < cutoff,
      );
      const oldRx = new Set(oldTx.map((t) => t.rxId));
      s.synthetic_prescriptions = s.synthetic_prescriptions.filter(
        (r) => !oldRx.has(r.id),
      );
      s.synthetic_dispensing_transactions =
        s.synthetic_dispensing_transactions.filter((t) => !oldRx.has(t.rxId));
      const retainedScans = new Set(
        s.synthetic_dispensing_transactions.map((t) => t.scanId),
      );
      const retainedVerifications = new Set(
        s.synthetic_dispensing_transactions.map((t) => t.verificationId),
      );
      s.synthetic_barcode_scans = s.synthetic_barcode_scans.filter(
        (t) =>
          !oldRx.has(t.rxId) &&
          (Date.parse(t.at) >= cutoff || retainedScans.has(t.id)),
      );
      s.synthetic_biometric_verifications =
        s.synthetic_biometric_verifications.filter(
          (v) => Date.parse(v.at) >= cutoff || retainedVerifications.has(v.id),
        );
      s.synthetic_audit_logs = s.synthetic_audit_logs.filter(
        (a) => Date.parse(a.at) >= cutoff,
      );
      audit(
        s,
        actor,
        "RETENTION_PURGE",
        "SIMULATION_ONLY",
        "DEMO-CONFIG-0001",
        id("CORR"),
      );
      return before - datasets.reduce((n, k) => n + s[k].length, 0) + 1;
    });
  }
}

export const exportFields: Record<Dataset, string[]> = {
  synthetic_members: ["id", "alias", "accountOwned", "eligible", "mode"],
  synthetic_biometric_verifications: [
    "id",
    "memberId",
    "method",
    "status",
    "source",
    "at",
    "expiresAt",
    "mode",
  ],
  synthetic_prescriptions: [
    "id",
    "memberId",
    "productId",
    "kind",
    "allowed",
    "validUntil",
    "state",
    "source",
    "mode",
  ],
  synthetic_product_catalog: [
    "id",
    "code",
    "barcode",
    "name",
    "kind",
    "size",
    "batch",
    "expiry",
    "mode",
  ],
  synthetic_dispensing_transactions: [
    "id",
    "rxId",
    "memberId",
    "productId",
    "kind",
    "quantity",
    "at",
    "actorId",
    "facility",
    "status",
    "mode",
  ],
  synthetic_barcode_scans: [
    "id",
    "rxId",
    "productId",
    "barcode",
    "method",
    "at",
    "status",
    "mode",
  ],
  synthetic_audit_logs: [
    "id",
    "at",
    "actorId",
    "action",
    "status",
    "correlationId",
    "reason",
    "entityId",
    "mode",
  ],
};
export function csv(dataset: Dataset, records: unknown[]) {
  if (!datasets.includes(dataset)) throw new Error("DATASET_FORBIDDEN");
  const schema = {
    synthetic_members: memberSchema,
    synthetic_biometric_verifications: verificationSchema,
    synthetic_prescriptions: prescriptionSchema,
    synthetic_product_catalog: productSchema,
    synthetic_dispensing_transactions: transactionSchema,
    synthetic_barcode_scans: scanSchema,
    synthetic_audit_logs: auditSchema,
  }[dataset];
  const rows = records.map((x) => schema.parse(x));
  const fields = exportFields[dataset];
  const escape = (v: unknown) => {
    let text = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return (
    "\uFEFF" +
    [
      fields.map(escape).join(","),
      ...rows.map((row) =>
        fields
          .map((k) => escape((row as Record<string, unknown>)[k]))
          .join(","),
      ),
    ].join("\r\n")
  );
}

export function localAdapters(store: Store, actor: Actor) {
  const envelope = <T>(correlationId: string, data: T): Envelope<T> => ({
    ...responseSchema.parse({
      source: "LOCAL_SYNTHETIC_STORE",
      at: now(),
      connection: "SIMULATION_ONLY",
      correlationId,
    }),
    data,
  });
  const prescriptions: PrescriptionProvider = {
    async get(input, signal) {
      authorize(actor, "read");
      if (signal.aborted) throw new ProviderError("ABORTED");
      syntheticId.parse(input.rxId);
      const state = await store.read();
      const rx = state.synthetic_prescriptions.find((x) => x.id === input.rxId);
      if (!rx) throw new ProviderError("RX_NOT_FOUND");
      return envelope(input.correlationId, prescriptionSchema.parse(rx));
    },
  };
  const products: ProductCatalogProvider = {
    async lookup(input, signal) {
      authorize(actor, "read");
      if (signal.aborted) throw new ProviderError("ABORTED");
      z.string()
        .regex(/^DEMO-BC-\d{4}$/)
        .parse(input.barcode);
      const state = await store.read();
      return envelope(
        input.correlationId,
        state.synthetic_product_catalog.find(
          (x) => x.barcode === input.barcode,
        ) ?? null,
      );
    },
  };
  const auditLogs: AuditLogProvider = {
    async append(input, signal) {
      authorize(actor, "admin");
      if (signal.aborted) throw new ProviderError("ABORTED");
      const event = auditSchema.parse(input);
      if (event.actorId !== actor.id) throw new ProviderError("ACTOR_MISMATCH");
      await store.mutate((s) => {
        if (!s.synthetic_audit_logs.some((a) => a.id === event.id))
          s.synthetic_audit_logs.push(event);
      });
      return envelope(event.correlationId, { eventId: event.id });
    },
  };
  const dispensing: DispensingTransactionProvider = {
    async commit(input, signal) {
      if (signal.aborted) throw new ProviderError("ABORTED");
      syntheticId.parse(input.correlationId);
      const transaction = await new DispensingService(store).dispense(
        actor,
        input,
      );
      return envelope(input.correlationId, transaction);
    },
  };
  return { prescriptions, products, auditLogs, dispensing };
}

export function latestVerification(state: State, memberId: string) {
  const request = state.synthetic_audit_logs
    .filter(
      (a) => a.action === "VERIFICATION_REQUEST" && a.entityId === memberId,
    )
    .at(-1);
  return request
    ? state.synthetic_biometric_verifications.find(
        (v) => v.correlationId === request.correlationId,
      )
    : undefined;
}
