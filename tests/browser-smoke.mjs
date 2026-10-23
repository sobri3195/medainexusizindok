import { chromium } from "playwright";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
const port = 4175,
  base = `http://127.0.0.1:${port}`;
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--strictPort",
  ],
  { stdio: "pipe" },
);
let output = "";
server.stdout.on("data", (b) => {
  output += b;
});
server.stderr.on("data", (b) => {
  output += b;
});
let browser;
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(output);
    try {
      if ((await fetch(base)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await delay(100);
  }
  assert.ok(ready, "preview must start");
  const executablePath =
    process.env.CHROMIUM_PATH ||
    (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
  browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--disable-dev-shm-usage", "--no-proxy-server"],
  });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/desktop/login");
  await page.getByRole("button", { name: "Admin Demo", exact: false }).click();
  await page.getByRole("button", { name: "Masuk sebagai Admin Demo" }).click();
  await page
    .getByRole("link", { name: "Validasi Penyerahan", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Dashboard validasi", exact: true })
    .waitFor();
  const nav = page.getByRole("navigation", {
    name: "Modul validasi penyerahan",
  });
  const route = async (name) => {
    console.log("Browser:", name);
    await nav.getByRole("link", { name, exact: true }).click();
  };
  await route("Verifikasi Peserta");
  await page.getByLabel("Skenario provider").selectOption("FAILED");
  await page
    .getByRole("button", { name: "Jalankan simulasi verifikasi" })
    .click();
  await page.getByText("Hasil simulasi dicatat.", { exact: false }).waitFor();
  await route("Obat PRB");
  await page
    .getByRole("button", { name: "Simulasi DEMO-BC-0001", exact: true })
    .click();
  await page.getByText("Scan dicatat.", { exact: false }).waitFor();
  assert.ok(
    await page
      .getByRole("button", { name: "Tinjau & konfirmasi penyerahan" })
      .isDisabled(),
  );
  await route("Verifikasi Peserta");
  await page
    .getByRole("button", { name: "Jalankan simulasi verifikasi" })
    .click();
  await page.getByText("Hasil simulasi dicatat.", { exact: false }).waitFor();
  await route("Obat PRB");
  await page
    .getByRole("button", { name: "Simulasi DEMO-BC-9999", exact: true })
    .click();
  await page.getByText("UNKNOWN", { exact: true }).waitFor();
  assert.ok(
    await page
      .getByRole("button", { name: "Tinjau & konfirmasi penyerahan" })
      .isDisabled(),
  );
  await page
    .getByRole("button", { name: "Simulasi DEMO-BC-0002", exact: true })
    .click();
  await page.getByText("MISMATCH", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Simulasi DEMO-BC-0001", exact: true })
    .click();
  await page.getByText("MATCH", { exact: true }).waitFor();
  await page.getByLabel("Jumlah diserahkan", { exact: false }).fill("31");
  assert.ok(
    await page
      .getByRole("button", { name: "Tinjau & konfirmasi penyerahan" })
      .isDisabled(),
  );
  await page.getByLabel("Jumlah diserahkan", { exact: false }).fill("30");
  await page
    .getByRole("button", { name: "Tinjau & konfirmasi penyerahan" })
    .click();
  // Separate tabs have independent UI locks; the database must still commit once.
  const racer = await context.newPage();
  racer.on("pageerror", (e) => errors.push(e.message));
  await racer.goto(base + "/desktop/dispensing/prb");
  await racer
    .getByRole("button", { name: "Tinjau & konfirmasi penyerahan" })
    .click();
  await Promise.all(
    [page, racer].map((tab) =>
      tab.getByRole("button", { name: "Simpan penyerahan sintetis" }).click(),
    ),
  );
  await Promise.all(
    [page, racer].map((tab) =>
      tab
        .getByRole("status")
        .filter({ hasText: /Penyerahan sintetis selesai/ })
        .or(
          tab.getByRole("alert").filter({ hasText: "Transaksi ganda dicegah" }),
        )
        .waitFor(),
    ),
  );
  const successCount =
    (await page
      .getByText("Penyerahan sintetis selesai;", { exact: false })
      .count()) +
    (await racer
      .getByText("Penyerahan sintetis selesai;", { exact: false })
      .count());
  assert.equal(successCount, 1, "exactly one tab may commit");
  await racer.close();
  await route("Riwayat");
  await page.getByRole("button", { name: "Uji duplikat" }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Transaksi ganda dicegah" })
    .waitFor();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Ekspor CSV hasil filter" }).click();
  const file = await downloading;
  assert.equal(
    file.suggestedFilename(),
    "synthetic_dispensing_transactions.csv",
  );
  await page.reload();
  await page
    .getByRole("table")
    .getByText("COMPLETED", { exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Batalkan", exact: true }).click();
  await page.getByRole("button", { name: "Konfirmasi pembatalan" }).click();
  await page
    .getByRole("table")
    .getByText("CANCELLED", { exact: true })
    .waitFor();
  // Check all pages, including narrow mobile layout.
  for (const [name, title] of [
    ["Data Explorer", "Data Explorer"],
    ["Evaluasi Data", "Evaluasi manfaat data"],
    ["Audit Trail", "Audit trail"],
    ["Status Integrasi", "Status integrasi"],
    ["Pengaturan & Role", "Pengaturan & manajemen role"],
    ["Scan Barcode", "Scan barcode produk"],
  ]) {
    await route(name);
    await page.getByRole("heading", { name: title, exact: true }).waitFor();
  }
  await page.evaluate(() =>
    Object.defineProperty(window, "BarcodeDetector", {
      value: undefined,
      configurable: true,
    }),
  );
  await page.getByRole("button", { name: "Scan kamera", exact: true }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: "BarcodeDetector tidak didukung" })
    .waitFor();
  await route("Status Integrasi");
  await page.getByLabel("Konfigurasi adapter").selectOption("production");
  assert.equal(
    await page.getByText("NOT_CONNECTED", { exact: true }).count(),
    8,
  );
  await page.getByLabel("Ganti role").selectOption("DPJP");
  await route("Obat PRB");
  assert.ok(
    await page
      .getByRole("button", { name: "Simulasi DEMO-BC-0001", exact: true })
      .isDisabled(),
  );
  await page.getByLabel("Ganti role").selectOption("Admin Demo");
  await page.setViewportSize({ width: 390, height: 844 });
  await route("Dashboard");
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "mobile should not overflow",
  );
  mkdirSync("/tmp/medai-artifacts", { recursive: true });
  await page.screenshot({
    path: "/tmp/medai-artifacts/dispensing-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  // Diagnosis import is aggregate-only and never enters the synthetic transaction store.
  await page.goto(base + "/desktop/diagnosis-analysis");
  await page.getByRole("button", { name: "Muat contoh sintetis" }).click();
  await page.getByText("DATA SINTETIS", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Muat contoh model sintetis", exact: true })
    .click();
  await page
    .getByRole("heading", {
      name: "Model AI terlatih · review kualitas data",
      exact: true,
    })
    .waitFor();
  await page
    .getByText("Skor probabilitas label sintetis", { exact: false })
    .waitFor();
  await page.getByRole("checkbox").check();
  const summary = {
    format: "jelas-diagnoses-aggregate-v1",
    dataset: "FKRTL",
    mode: "USER_AGGREGATE",
    sourceType: "STATA_LOCAL_AGGREGATION",
    minCellCount: 10,
    rows: 20,
    missing: 0,
    invalid: 0,
    valid: 20,
    suppressed: 0,
    groups: [{ code: "E11.9", count: 20 }],
  };
  await page.getByLabel("Ringkasan JSON agregat").setInputFiles({
    name: "summary.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(summary)),
  });
  await page
    .getByText("AGREGAT PENGGUNA · BUKAN DATA DEMO", { exact: true })
    .waitFor();
  await page.getByText("PREDIKSI DITAHAN", { exact: false }).waitFor();
  await page.getByLabel("Ringkasan JSON agregat").setInputFiles({
    name: "wrong-profile.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({ ...summary, dataset: "SECONDARY_DIAGNOSES" }),
    ),
  });
  await page.getByRole("alert").filter({ hasText: "Impor ditolak" }).waitFor();
  await page.getByText("Sumber dataset: FKRTL", { exact: false }).waitFor();
  await page.getByLabel("Ringkasan JSON agregat").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ ...summary, patientId: "forbidden" })),
  });
  await page.getByRole("alert").filter({ hasText: "Impor ditolak" }).waitFor();
  await page
    .getByRole("button", { name: "Hapus ringkasan dari memori" })
    .click();
  await page
    .getByText("Belum ada ringkasan diagnosis yang dimuat", { exact: true })
    .waitFor();
  await page.getByLabel("Ganti role").selectOption("DPJP");
  await page
    .getByText("Halaman analisis memerlukan role", { exact: false })
    .waitFor();
  await page.getByLabel("Ganti role").selectOption("Admin Demo");
  await page.goto(base + "/desktop/dispensing");
  // Optional private report is imported only into this isolated browser context.
  // No raw file or report is copied into the repository or served as a web asset.
  if (process.env.JELAS_NONKAPITASI_REPORT) {
    const bytes = readFileSync(process.env.JELAS_NONKAPITASI_REPORT);
    const expected = JSON.parse(bytes.toString());
    await page.goto(base + "/desktop/nonkapitasi");
    await page.getByRole("checkbox").check();
    await page
      .getByLabel("Laporan nonkapitasi JSON")
      .setInputFiles({
        name: "nonkapitasi-analysis.json",
        mimeType: "application/json",
        buffer: bytes,
      });
    await page.getByText("Laporan berhasil dimuat.", { exact: true }).waitFor();
    await page
      .getByRole("heading", {
        name:
          expected.mode === "SYNTHETIC"
            ? "Model dilatih pada fixture sintetis"
            : "Model dilatih pada data pengguna",
        exact: true,
      })
      .waitFor();
    await page.getByText(String(expected.rows), { exact: true }).waitFor();
    await page
      .getByLabel("Laporan nonkapitasi JSON")
      .setInputFiles({
        name: "bad-report.json",
        mimeType: "application/json",
        buffer: Buffer.from(
          JSON.stringify({ ...expected, patientId: "FORBIDDEN" }),
        ),
      });
    await page
      .getByRole("alert")
      .filter({ hasText: "Laporan ditolak" })
      .waitFor();
    await page
      .getByRole("button", { name: "Hapus laporan dari memori", exact: true })
      .click();
    await page
      .getByText("Belum ada laporan nonkapitasi yang dimuat", { exact: true })
      .waitFor();
    await page.getByLabel("Ganti role").selectOption("DPJP");
    await page
      .getByText("Analisis Nonkapitasi memerlukan", { exact: false })
      .waitFor();
    await page.getByLabel("Ganti role").selectOption("Admin Demo");
    await page.goto(base + "/desktop/dispensing");
    console.log(
      "Private nonkapitasi aggregate report import, validation and RBAC passed.",
    );
  }
  // All generated JS/CSS must be precached; test routes and a new transaction offline.
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) throw new Error("service worker inactive");
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.goto(base + "/desktop/dispensing/verify");
  await page
    .getByRole("button", { name: "Jalankan simulasi verifikasi" })
    .click();
  await page.getByText("Hasil simulasi dicatat.", { exact: false }).waitFor();
  await route("Cairan Dialisis");
  await page
    .getByRole("button", { name: "Simulasi DEMO-BC-0002", exact: true })
    .click();
  await page.getByText("MATCH", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Tinjau & konfirmasi penyerahan" })
    .click();
  await page
    .getByRole("button", { name: "Simpan penyerahan sintetis" })
    .click();
  await page
    .getByText("Penyerahan sintetis selesai;", { exact: false })
    .waitFor();
  for (const path of [
    "",
    "verify",
    "prb",
    "dialysis",
    "scan",
    "history",
    "data",
    "evaluation",
    "audit",
    "integration",
    "settings",
  ]) {
    await page.goto(base + "/desktop/dispensing" + (path ? "/" + path : ""));
    await page
      .getByRole("heading", {
        name: "Identitas, hak, dan produk dalam satu jejak.",
      })
      .waitFor();
    await page.locator("h2").first().waitFor();
  }
  await page.goto(base + "/desktop/dispensing");
  await page.screenshot({
    path: "/tmp/medai-artifacts/dispensing-desktop.png",
    fullPage: true,
  });
  assert.deepEqual(errors, [], "no uncaught browser errors");
  console.log(
    "Browser checks passed: verification failure/success, PRB, barcode errors, quantity, duplicate across concurrent tabs, camera fallback, CSV, persistence, cancellation, RBAC, 11 routes, responsive layout, offline dialysis transaction and offline navigation.",
  );
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
