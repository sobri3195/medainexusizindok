import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  DispensingService,
  MemoryStore,
  csv,
  datasets,
  id,
  stateSchema,
} from "../src/lib/dispensing/domain.ts";
const output = resolve(process.argv[2] || "/tmp/jelas-synthetic");
const actor = {
  id: "DEMO-ACTOR-0001",
  role: "Admin Demo",
  expiresAt: Date.now() + 3600000,
};
const store = new MemoryStore(),
  service = new DispensingService(store),
  manifest = [];
const rxId = "DEMO-RX-0001",
  memberId = "DEMO-MEMBER-0001";
for (const scenario of [
  "FAILED",
  "PENDING",
  "EXPIRED",
  "REQUIRES_REVIEW",
  "UNAVAILABLE",
  "NOT_CONNECTED",
  "SUCCESS",
]) {
  const verification = await service.verify(actor, memberId, "FACE", scenario);
  manifest.push({
    scenario,
    status: verification.status,
    source: verification.source,
  });
}
const verification = store.state.synthetic_biometric_verifications.at(-1);
let matched;
for (const barcode of ["DEMO-BC-9999", "DEMO-BC-0002", "DEMO-BC-0001"]) {
  const scan = await service.scan(actor, rxId, barcode, "SIMULATION");
  manifest.push({ scenario: "BARCODE", barcode, status: scan.status });
  if (scan.status === "MATCH") matched = scan;
}
const command = {
  rxId,
  verificationId: verification.id,
  scanId: matched.id,
  quantity: 30,
  idempotencyKey: id("REQUEST"),
  confirmed: true,
  mode: "SIMULATION_ONLY",
};
try {
  await service.dispense(actor, { ...command, quantity: 31 });
} catch (error) {
  manifest.push({ scenario: "EXCESS_QUANTITY", result: error.message });
}
const transaction = await service.dispense(actor, command);
manifest.push({ scenario: "SUCCESSFUL_TRANSACTION", id: transaction.id });
try {
  await service.dispense(actor, { ...command, idempotencyKey: id("REQUEST") });
} catch (error) {
  manifest.push({ scenario: "DUPLICATE", result: error.message });
}
const expired = await service.scan(
  actor,
  "DEMO-RX-0009",
  "DEMO-BC-0003",
  "SIMULATION",
);
manifest.push({ scenario: "EXPIRED_BATCH", result: expired.status });
const state = stateSchema.parse(await store.read());
await mkdir(output, { recursive: true });
for (const name of datasets) {
  await writeFile(
    resolve(output, name + ".json"),
    JSON.stringify(state[name], null, 2) + "\n",
  );
  await writeFile(resolve(output, name + ".csv"), csv(name, state[name]));
}
await writeFile(
  resolve(output, "snapshot.json"),
  JSON.stringify(state, null, 2) + "\n",
);
await writeFile(
  resolve(output, "scenarios.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  `Synthetic-only fixtures: ${output}. Seven tables, CSV allowlists, snapshot, scenario manifest. No clinical/biometric accuracy claim.`,
);
