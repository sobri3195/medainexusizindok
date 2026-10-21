import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  Select,
  Skeleton,
  Table,
} from "../components/ui";
import { useDemoAuth, roles } from "../lib/auth";
import {
  DispensingService,
  adapterStatus,
  authorize,
  latestVerification,
  csv,
  datasets,
  id,
  scenarios,
  statuses,
  type Actor,
  type Dataset,
  type Kind,
  type Scenario,
  type State,
} from "../lib/dispensing/domain";
import { syntheticStore } from "../lib/dispensing/storage";
import {
  dataEvaluation,
  excludedFields,
  fields,
  relationshipNotes,
} from "../lib/dispensing/dictionary";
const service = new DispensingService(syntheticStore);
type Context = {
  state: State;
  actor: Actor;
  run: (op: () => Promise<unknown>, message?: string) => Promise<void>;
  busy: boolean;
};
const C = createContext<Context | null>(null);
const useWorkspace = () => {
  const c = useContext(C);
  if (!c) throw new Error("Workspace missing");
  return c;
};
const messages: Record<string, string> = {
  SESSION_EXPIRED: "Sesi berakhir. Masuk kembali.",
  ROLE_FORBIDDEN: "Role tidak berwenang.",
  DUPLICATE: "Hak sudah digunakan. Transaksi ganda dicegah.",
  RX_CANCELLED: "Hak dibatalkan.",
  RX_EXPIRED: "Hak kedaluwarsa.",
  VERIFICATION_INVALID: "Verifikasi terbaru belum valid atau kedaluwarsa.",
  ACCOUNT_NOT_OWNED: "Kepemilikan akun belum terpenuhi.",
  NO_ELIGIBILITY: "Peserta tidak memiliki hak layanan.",
  QUANTITY_EXCEEDED: "Jumlah melebihi hak.",
  PRODUCT_MISMATCH: "Produk tidak cocok atau belum dipindai.",
  PRODUCT_EXPIRED: "Produk kedaluwarsa / masa simpan kurang.",
  SCAN_EXPIRED: "Pindai ulang: hasil scan kedaluwarsa.",
};
const errorText = (e: unknown) =>
  e instanceof Error
    ? (messages[e.message] ??
      (e.name === "ZodError"
        ? "Input tidak valid. Gunakan kode sintetis dan jumlah bulat positif."
        : e.message))
    : "Penyimpanan lokal gagal.";
const stamp = (s: string) => new Date(s).toLocaleString("id-ID");
function can(
  a: Actor,
  action: "verify" | "PRB" | "DIALYSIS" | "admin" | "read",
) {
  try {
    authorize(a, action);
    return true;
  } catch {
    return false;
  }
}
function Status({ value }: { value: string }) {
  return (
    <Badge
      tone={
        ["COMPLETED", "MATCH"].includes(value)
          ? "green"
          : ["FAILED", "EXPIRED", "MISMATCH", "UNKNOWN", "CANCELLED"].includes(
                value,
              )
            ? "red"
            : "amber"
      }
    >
      {value}
    </Badge>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-2 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}
function Title({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}
function download(dataset: Dataset, rows: unknown[]) {
  const url = URL.createObjectURL(
    new Blob([csv(dataset, rows)], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = dataset + ".csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const tabs = [
  ["Dashboard", ""],
  ["Verifikasi Peserta", "verify"],
  ["Obat PRB", "prb"],
  ["Cairan Dialisis", "dialysis"],
  ["Scan Barcode", "scan"],
  ["Riwayat", "history"],
  ["Data Explorer", "data"],
  ["Evaluasi Data", "evaluation"],
  ["Audit Trail", "audit"],
  ["Status Integrasi", "integration"],
  ["Pengaturan & Role", "settings"],
];
export default function DispensingLayout() {
  const { session } = useDemoAuth();
  const [state, setState] = useState<State | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const lock = useRef(false);
  const refresh = useCallback(
    async () => setState(await syntheticStore.read()),
    [],
  );
  useEffect(() => {
    void refresh().catch((e) => setError(errorText(e)));
    const update = () => void refresh().catch((e) => setError(errorText(e)));
    addEventListener("focus", update);
    return () => removeEventListener("focus", update);
  }, [refresh]);
  const actor: Actor = {
    id: `DEMO-ACTOR-${String(roles.indexOf(session!.role) + 1).padStart(4, "0")}`,
    role: session!.role,
    expiresAt: session!.expiresAt,
  };
  const run = async (
    op: () => Promise<unknown>,
    message = "Diperbarui dan dicatat dalam audit sintetis.",
  ) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await op();
      setNotice(message);
    } catch (e) {
      setError(errorText(e));
    } finally {
      try {
        await refresh();
      } catch (e) {
        setError(errorText(e));
      }
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="rounded-2xl bg-navy-950 p-6 text-white">
        <p className="text-xs font-bold tracking-widest text-cyan-400">
          JELAS · VALIDASI PENYERAHAN
        </p>
        <h1 className="my-3 text-2xl font-bold">
          Identitas, hak, dan produk dalam satu jejak.
        </h1>
        <Badge tone="amber">DEMO · SIMULATION_ONLY · DATA SINTETIS</Badge>
        <p className="mt-4 max-w-3xl text-sm text-slate-300">
          Tidak terhubung BPJS. Tidak mengambil wajah atau sidik jari. Passkey
          perangkat bukan bukti identitas JKN. Demo administrasi tidak boleh
          menghambat pelayanan emergensi.
        </p>
      </div>
      <nav
        aria-label="Modul validasi penyerahan"
        className="flex flex-wrap gap-2"
      >
        {tabs.map(([label, path]) => (
          <NavLink
            end
            key={path}
            to={"/desktop/dispensing" + (path ? "/" + path : "")}
            className={({ isActive }) =>
              `rounded-xl border px-3 py-2 text-xs font-semibold ${isActive ? "bg-medical-600 text-white" : "bg-white dark:bg-slate-900"}`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      {busy && <p role="status">Memproses data sintetis…</p>}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
          <button
            className="ml-4 underline"
            onClick={() => void run(refresh, "Dimuat ulang.")}
          >
            Coba muat ulang
          </button>
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {notice}
        </div>
      )}
      {state ? (
        <C.Provider value={{ state, actor, run, busy }}>
          <Outlet key={actor.role} />
        </C.Provider>
      ) : (
        <Skeleton />
      )}
    </div>
  );
}

type Filters = {
  from: string;
  to: string;
  kind: string;
  status: string;
  product: string;
};
const initial: Filters = {
  from: "",
  to: "",
  kind: "",
  status: "",
  product: "",
};
function FilterBar({ f, set }: { f: Filters; set: (f: Filters) => void }) {
  const { state } = useWorkspace();
  const change = (k: keyof Filters, v: string) => set({ ...f, [k]: v });
  return (
    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Field label="Dari tanggal">
        <Input
          type="date"
          value={f.from}
          onChange={(e) => change("from", e.target.value)}
        />
      </Field>
      <Field label="Sampai tanggal">
        <Input
          type="date"
          value={f.to}
          onChange={(e) => change("to", e.target.value)}
        />
      </Field>
      <Field label="Jenis layanan">
        <Select value={f.kind} onChange={(e) => change("kind", e.target.value)}>
          <option value="">Semua</option>
          <option>PRB</option>
          <option>DIALYSIS</option>
        </Select>
      </Field>
      <Field label="Status">
        <Select
          value={f.status}
          onChange={(e) => change("status", e.target.value)}
        >
          <option value="">Semua</option>
          {[
            ...statuses,
            "COMPLETED",
            "CANCELLED",
            "MATCH",
            "UNKNOWN",
            "MISMATCH",
          ].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
      </Field>
      <Field label="Produk">
        <Select
          value={f.product}
          onChange={(e) => change("product", e.target.value)}
        >
          <option value="">Semua</option>
          {state.synthetic_product_catalog.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
function dates(at: string, f: Filters) {
  const d = new Date(at).toLocaleDateString("sv-SE");
  return (!f.from || d >= f.from) && (!f.to || d <= f.to);
}
function filtered(s: State, f: Filters) {
  return s.synthetic_dispensing_transactions.filter(
    (t) =>
      dates(t.at, f) &&
      (!f.kind || t.kind === f.kind) &&
      (!f.product || t.productId === f.product) &&
      (!f.status ||
        t.status === f.status ||
        s.synthetic_biometric_verifications.find(
          (v) => v.id === t.verificationId,
        )?.status === f.status),
  );
}
export function DispensingDashboard() {
  const { state: s } = useWorkspace();
  const [f, set] = useState(initial);
  const ts = filtered(s, f),
    rx = s.synthetic_prescriptions.filter(
      (r) =>
        (!f.kind || r.kind === f.kind) &&
        (!f.product || r.productId === f.product),
    );
  const vs = s.synthetic_biometric_verifications.filter(
    (v) =>
      dates(v.at, f) &&
      rx.some((r) => r.memberId === v.memberId) &&
      (!f.status || v.status === f.status),
  );
  const scans = s.synthetic_barcode_scans.filter(
    (b) =>
      dates(b.at, f) &&
      rx.some((r) => r.id === b.rxId) &&
      (!f.status || b.status === f.status),
  );
  const audits = s.synthetic_audit_logs.filter(
    (a) =>
      dates(a.at, f) &&
      (!f.status || a.status === f.status) &&
      ((!f.kind && !f.product) ||
        rx.some((r) => r.id === a.entityId) ||
        ts.some((t) => t.id === a.entityId)),
  );
  const values = datasets
    .flatMap((k) => s[k] as unknown as Record<string, unknown>[])
    .flatMap(Object.values);
  const complete = values.length
    ? Math.round(
        (values.filter((v) => v !== null && v !== undefined && v !== "")
          .length /
          values.length) *
          100,
      )
    : 0;
  const cards = [
    ["Verifikasi peserta", vs.length],
    ["Transaksi PRB", ts.filter((t) => t.kind === "PRB").length],
    ["Penyerahan dialisis", ts.filter((t) => t.kind === "DIALYSIS").length],
    ["Barcode cocok", scans.filter((b) => b.status === "MATCH").length],
    [
      "Percobaan transaksi gagal",
      audits.filter((a) => a.action === "TRANSACTION_REJECTED").length,
    ],
    [
      "Verifikasi perlu review",
      vs.filter((v) => v.status === "REQUIRES_REVIEW").length,
    ],
    [
      "Duplikat dicegah",
      audits.filter((a) => a.action === "DUPLICATE_ATTEMPT").length,
    ],
    ["Kelengkapan seluruh dataset", complete + "%"],
  ];
  return (
    <>
      <Title
        title="Dashboard validasi"
        description="DATA SINTETIS · Filter berlaku untuk kejadian. Kelengkapan seluruh dataset mengukur field terisi; bukan akurasi klinis atau biometrik."
      />
      <FilterBar f={f} set={set} />
      {f.from && f.to && f.from > f.to && (
        <Alert>Rentang tanggal tidak valid.</Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([name, value]) => (
          <Card key={name} className="p-5">
            <p className="text-xs text-slate-500">{name}</p>
            <p className="my-3 text-3xl font-bold">{value}</p>
            <p className="text-[10px] font-bold text-medical-600">
              DATA SINTETIS
            </p>
          </Card>
        ))}
      </div>
      <Card className="mt-5 p-5">
        <h3 className="font-bold">Tiga pemeriksaan independen</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            "1 · Identitas & akun simulasi",
            "2 · Hak resep sintetis yang aktif",
            "3 · Produk, batch, expiry & jumlah",
          ].map((x) => (
            <p
              key={x}
              className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800"
            >
              {x}
            </p>
          ))}
        </div>
        <p className="mt-4 text-xs">
          Adapter demo: SIMULATION_ONLY. Seluruh adapter produksi:
          NOT_CONNECTED. Scan tidak membuktikan konsumsi produk.
        </p>
      </Card>
      {!ts.length && <EmptyState title="Belum ada transaksi sesuai filter" />}
    </>
  );
}
export function ParticipantVerification() {
  const { state: s, actor, run, busy } = useWorkspace();
  const [member, setMember] = useState(s.synthetic_members[0]?.id ?? ""),
    [method, setMethod] = useState<"FACE" | "FINGERPRINT">("FACE"),
    [scenario, setScenario] = useState<Scenario>("SUCCESS");
  const v = latestVerification(s, member);
  return (
    <>
      <Title
        title="Verifikasi peserta"
        description="SUCCESS menghasilkan SIMULATION_ONLY, bukan VERIFIED. Tidak mengaktifkan sensor biometrik atau merekam gambar."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-4 p-5">
          <Field label="Peserta sintetis">
            <Select value={member} onChange={(e) => setMember(e.target.value)}>
              {s.synthetic_members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.alias} · {m.id}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Metode simulasi">
            <Select
              value={method}
              onChange={(e) => setMethod(e.target.value as typeof method)}
            >
              <option value="FACE">Face recognition · simulasi</option>
              <option value="FINGERPRINT">Fingerprint · simulasi</option>
            </Select>
          </Field>
          <Field label="Skenario provider">
            <Select
              value={scenario}
              onChange={(e) => setScenario(e.target.value as Scenario)}
            >
              {scenarios.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </Select>
          </Field>
          <Button
            disabled={busy || !can(actor, "verify")}
            onClick={() =>
              void run(
                () => service.verify(actor, member, method, scenario),
                "Hasil simulasi dicatat. Periksa status akun dan kepesertaan secara terpisah.",
              )
            }
          >
            Jalankan simulasi verifikasi
          </Button>
          <p className="text-xs text-slate-500">
            Peserta 1: memenuhi simulasi. Peserta 2: tidak memiliki hak layanan.
            Peserta 3: akun belum terbukti. Peserta 4: referensi kedaluwarsa /
            dibatalkan.
          </p>
          {!can(actor, "verify") && (
            <Alert>Role ini hanya dapat membaca hasil.</Alert>
          )}
        </Card>
        <Card className="p-5">
          {v ? (
            <div className="space-y-3 text-sm">
              <Status value={v.status} />
              <p>Waktu: {stamp(v.at)}</p>
              <p>Berlaku hingga: {stamp(v.expiresAt)}</p>
              <p>Sumber: {v.source}</p>
              {s.synthetic_audit_logs
                .filter(
                  (a) =>
                    a.correlationId === v.correlationId &&
                    a.action === "CONNECTION_FAILURE",
                )
                .map((a) => (
                  <p key={a.id} role="alert" className="text-red-700">
                    Provider: {a.reason}. Tidak ada hasil sukses yang dibuat.
                  </p>
                ))}
              <p>
                Akun: {v.accountOwned ? "Memenuhi simulasi" : "Belum memenuhi"}
              </p>
              <p>
                Kepesertaan:{" "}
                {v.eligible
                  ? "Memenuhi simulasi"
                  : "Tidak memiliki hak sintetis"}
              </p>
              <p className="break-all">Correlation: {v.correlationId}</p>
              <Alert>
                Hasil simulasi berlaku 15 menit; bukan pembuktian identitas JKN.
              </Alert>
            </div>
          ) : (
            <EmptyState title="Peserta belum diverifikasi" />
          )}
        </Card>
      </div>
    </>
  );
}
function useSelection(kind?: Kind) {
  const { state } = useWorkspace();
  const choices = state.synthetic_prescriptions.filter(
    (r) => !kind || r.kind === kind,
  );
  const [selected, setSelected] = useState(choices[0]?.id ?? "");
  const rx = choices.find((r) => r.id === selected) ?? choices[0];
  return { choices, rx, selected: rx?.id ?? "", setSelected };
}
function RxSelect({
  choices,
  selected,
  set,
}: {
  choices: State["synthetic_prescriptions"];
  selected: string;
  set: (s: string) => void;
}) {
  return (
    <Field label="Referensi hak pengambilan">
      <Select value={selected} onChange={(e) => set(e.target.value)}>
        {choices.map((r) => (
          <option key={r.id} value={r.id}>
            {r.id} · {r.memberId} · {r.kind}
          </option>
        ))}
      </Select>
    </Field>
  );
}
function RxSummary({ rxId }: { rxId: string }) {
  const { state: s } = useWorkspace();
  const r = s.synthetic_prescriptions.find((r) => r.id === rxId);
  if (!r) return <EmptyState title="Tidak ada hak" />;
  const p = s.synthetic_product_catalog.find((p) => p.id === r.productId),
    v = latestVerification(s, r.memberId);
  return (
    <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800 sm:grid-cols-2">
      <div>
        <b>{s.synthetic_members.find((m) => m.id === r.memberId)?.alias}</b>
        <p className="text-xs">{r.memberId}</p>
      </div>
      <div>
        Verifikasi <Status value={v?.status ?? "PENDING"} />
      </div>
      <div>
        {p?.name}
        <p className="text-xs">
          {p?.code} · {p?.size}
        </p>
      </div>
      <div>
        Hak: <b>{r.allowed} unit</b>
        <p>
          {r.state} · {stamp(r.validUntil)}
        </p>
      </div>
      <p className="text-xs">{r.source}</p>
      <p>{r.facility}</p>
    </div>
  );
}
type Detector = {
  detect: (video: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
};
type DetectorClass = {
  new (options: { formats: string[] }): Detector;
  getSupportedFormats: () => Promise<string[]>;
};
function BarcodeCapture({
  onCode,
  disabled,
}: {
  onCode: (code: string, method: "MANUAL" | "CAMERA" | "SIMULATION") => void;
  disabled: boolean;
}) {
  const [code, setCode] = useState(""),
    [camera, setCamera] = useState(false),
    [error, setError] = useState(""),
    [starting, setStarting] = useState(false);
  const video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    active = useRef(false),
    callback = useRef(onCode);
  callback.current = onCode;
  const stop = useCallback(() => {
    active.current = false;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (timer.current) clearTimeout(timer.current);
    setCamera(false);
    setStarting(false);
  }, []);
  useEffect(
    () => () => {
      active.current = false;
      stream.current?.getTracks().forEach((t) => t.stop());
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const start = async () => {
    setError("");
    setStarting(true);
    active.current = true;
    try {
      const D = (window as unknown as { BarcodeDetector?: DetectorClass })
        .BarcodeDetector;
      if (!D || !navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "Kamera / BarcodeDetector tidak didukung. Gunakan input manual.",
        );
      const formats = (await D.getSupportedFormats()).filter((f) =>
        [
          "code_128",
          "code_39",
          "ean_13",
          "ean_8",
          "upc_a",
          "upc_e",
          "data_matrix",
          "qr_code",
        ].includes(f),
      );
      if (!formats.length) throw new Error("Format barcode tidak didukung.");
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      if (!active.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      setCamera(true);
      setStarting(false);
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      if (!video.current) {
        stop();
        return;
      }
      video.current.srcObject = media;
      await video.current.play();
      const detector = new D({ formats });
      const tick = async () => {
        if (!active.current || !video.current) return;
        try {
          const found = await detector.detect(video.current);
          if (found[0]) {
            const raw = found[0].rawValue;
            stop();
            if (!/^DEMO-BC-\d{4}$/.test(raw)) {
              setError(
                "Mode demo hanya menerima kode DEMO-BC-0001 dan kode sintetis serupa. Kode lain tidak disimpan.",
              );
              return;
            }
            setCode(raw);
            callback.current(raw, "CAMERA");
            return;
          }
        } catch {
          setError("Scan kamera gagal. Gunakan input manual.");
          stop();
          return;
        }
        if (active.current) timer.current = setTimeout(() => void tick(), 350);
      };
      void tick();
    } catch (e) {
      stop();
      setError(errorText(e));
    }
  };
  return (
    <div className="space-y-3">
      <Field label="Barcode sintetis">
        <Input
          value={code}
          maxLength={32}
          placeholder="DEMO-BC-0001"
          onChange={(e) => setCode(e.target.value.trim())}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={disabled || !/^DEMO-BC-\d{4}$/.test(code)}
          onClick={() => onCode(code, "MANUAL")}
        >
          Cocokkan kode manual
        </Button>
        <Button
          disabled={disabled || starting}
          onClick={() => (camera ? stop() : void start())}
        >
          {camera
            ? "Hentikan kamera"
            : starting
              ? "Meminta kamera…"
              : "Scan kamera"}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {["DEMO-BC-0001", "DEMO-BC-0002", "DEMO-BC-0003", "DEMO-BC-9999"].map(
          (c) => (
            <button
              key={c}
              disabled={disabled}
              className="rounded-lg border px-2 py-1 text-xs disabled:opacity-40"
              onClick={() => {
                setCode(c);
                onCode(c, "SIMULATION");
              }}
            >
              Simulasi {c}
            </button>
          ),
        )}
      </div>
      {camera && (
        <video
          ref={video}
          muted
          playsInline
          className="max-h-64 w-full rounded-xl bg-black"
          aria-label="Pratinjau barcode"
        />
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <p className="text-xs text-slate-500">
        Kamera label produk; gambar tidak disimpan. Format sesuai dukungan
        perangkat: Code 128/39, EAN/UPC, Data Matrix, QR. Parser demo hanya
        menerima kode sintetis; GS1 dan lot fisik memerlukan spesifikasi resmi.
      </p>
    </div>
  );
}
export function DispensingForm({ kind }: { kind: Kind }) {
  const { state: s, actor, run, busy } = useWorkspace();
  const { choices, rx, selected, setSelected } = useSelection(kind);
  const [quantity, setQuantity] = useState("1"),
    [confirm, setConfirm] = useState(false),
    [key, setKey] = useState(() => id("REQUEST"));
  const v = latestVerification(s, rx?.memberId ?? ""),
    scan = s.synthetic_barcode_scans.filter((b) => b.rxId === selected).at(-1),
    p = s.synthetic_product_catalog.find((p) => p.id === scan?.productId);
  const ready =
    v?.status === "SIMULATION_ONLY" &&
    v.accountOwned &&
    v.eligible &&
    Date.parse(v.expiresAt) > Date.now() &&
    scan?.status === "MATCH" &&
    rx?.state === "ACTIVE" &&
    Date.parse(rx.validUntil) > Date.now() &&
    !s.synthetic_dispensing_transactions.some((t) => t.rxId === selected) &&
    Number.isInteger(Number(quantity)) &&
    Number(quantity) > 0 &&
    Number(quantity) <= rx.allowed;
  const history = s.synthetic_dispensing_transactions.filter(
    (t) => t.memberId === rx?.memberId && t.kind === kind,
  );
  return (
    <>
      <Title
        title={
          kind === "PRB" ? "Pengambilan obat PRB" : "Penyerahan cairan dialisis"
        }
        description="Verifikasi → hak → scan produk → jumlah → konfirmasi. Satu hak hanya dipakai sekali, termasuk penyerahan sebagian."
      />
      {!can(actor, kind) && (
        <Alert>
          Role ini hanya dapat membaca. Penyerahan PRB: Apoteker FKTP. Dialisis:
          Perawat CAPD. Admin Demo: keduanya.
        </Alert>
      )}
      <div className="mt-4 grid gap-5 xl:grid-cols-2">
        <Card className="space-y-4 p-5">
          <RxSelect
            choices={choices}
            selected={selected}
            set={(value) => {
              setSelected(value);
              setKey(id("REQUEST"));
              setConfirm(false);
            }}
          />
          <RxSummary rxId={selected} />
          <NavLink
            to="/desktop/dispensing/verify"
            className="block text-sm font-bold text-medical-600"
          >
            Buka verifikasi peserta →
          </NavLink>
          <BarcodeCapture
            key={selected}
            disabled={busy || !can(actor, kind) || !rx}
            onCode={(code, method) =>
              void run(
                () => service.scan(actor, selected, code, method),
                "Scan dicatat. Periksa kecocokan produk.",
              )
            }
          />
        </Card>
        <Card className="space-y-4 p-5">
          <h3 className="font-bold">Hasil pencocokan produk</h3>
          {scan ? (
            <div className="space-y-2 text-sm">
              <Status value={scan.status} />
              <p>Barcode: {scan.barcode}</p>
              <p>
                {p?.name ?? "Produk tidak dikenal"} · {p?.code ?? "—"}
              </p>
              <p>{p?.size}</p>
              <p>
                Batch katalog: {scan.batch || "—"} · expiry:{" "}
                {scan.expiry || "—"}
              </p>
              <p>Scan: {stamp(scan.at)}</p>
            </div>
          ) : (
            <EmptyState title="Belum ada scan" />
          )}
          <Field label={`Jumlah diserahkan (hak ${rx?.allowed ?? 0} unit)`}>
            <Input
              type="number"
              min="1"
              max={rx?.allowed ?? 0}
              step="1"
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                setKey(id("REQUEST"));
              }}
            />
          </Field>
          <p className="text-xs text-slate-500">
            Aturan {kind}: batch{" "}
            {s.rules[kind].requireBatch ? "wajib" : "opsional"}, masa simpan
            minimum {s.rules[kind].minShelfDays} hari. Batch/expiry dari katalog
            demo, bukan pembacaan lot fisik.
          </p>
          <Button
            disabled={busy || !can(actor, kind) || !ready}
            onClick={() => setConfirm(true)}
          >
            Tinjau & konfirmasi penyerahan
          </Button>
          {!ready && (
            <p role="status" className="text-sm text-amber-700">
              Lengkapi verifikasi terbaru, hak aktif yang belum digunakan, scan
              cocok, dan jumlah valid.
            </p>
          )}
        </Card>
      </div>
      <Card className="mt-5 p-5">
        <h3 className="font-bold">Riwayat penyerahan peserta · {kind}</h3>
        {history.length ? (
          history.map((t) => (
            <p key={t.id} className="mt-3 text-sm">
              {t.id} · {t.quantity} unit · {stamp(t.at)} · {t.status}
            </p>
          ))
        ) : (
          <EmptyState title="Belum ada riwayat penyerahan" />
        )}
      </Card>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Konfirmasi penyerahan demo"
      >
        <p className="mb-4 text-sm">
          Konfirmasi {quantity} unit untuk {selected} oleh {actor.id} di{" "}
          {rx?.facility}. Penyerahan sebagian menutup hak dalam demo. Ini bukan
          bukti konsumsi.
        </p>
        <Button
          disabled={busy || !ready}
          onClick={() => {
            setConfirm(false);
            void run(
              () =>
                service.dispense(actor, {
                  rxId: selected,
                  verificationId: v!.id,
                  scanId: scan!.id,
                  quantity: Number(quantity),
                  idempotencyKey: key,
                  confirmed: true,
                  mode: "SIMULATION_ONLY",
                }),
              "Penyerahan sintetis selesai; transaksi dan audit tersimpan atomik.",
            );
          }}
        >
          Simpan penyerahan sintetis
        </Button>
      </Modal>
    </>
  );
}
export function PRBDispensing() {
  return <DispensingForm kind="PRB" />;
}
export function DialysisDispensing() {
  return <DispensingForm kind="DIALYSIS" />;
}
export function ProductScanner() {
  const { state: s, actor, run, busy } = useWorkspace();
  const { choices, selected, setSelected, rx } = useSelection();
  const scan = s.synthetic_barcode_scans
    .filter((b) => b.rxId === selected)
    .at(-1);
  return (
    <>
      <Title
        title="Scan barcode produk"
        description="Pencocokan terhadap referensi hak; bukan verifikasi identitas atau bukti konsumsi."
      />
      <Card className="max-w-3xl space-y-5 p-5">
        <RxSelect choices={choices} selected={selected} set={setSelected} />
        <RxSummary rxId={selected} />
        <BarcodeCapture
          key={selected}
          disabled={busy || !rx || !can(actor, rx.kind)}
          onCode={(code, method) =>
            void run(() => service.scan(actor, selected, code, method))
          }
        />
        {scan ? (
          <div className="text-sm">
            <Status value={scan.status} />
            <p>
              {scan.barcode} ·{" "}
              {s.synthetic_product_catalog.find((p) => p.id === scan.productId)
                ?.name ?? "Tidak dikenal"}
            </p>
            <p>
              Batch {scan.batch || "—"} · expiry {scan.expiry || "—"} · hak{" "}
              {rx?.allowed} unit
            </p>
          </div>
        ) : (
          <EmptyState title="Belum ada hasil scan" />
        )}
      </Card>
    </>
  );
}
export function TransactionHistory() {
  const { state: s, actor, run, busy } = useWorkspace();
  const [f, set] = useState(initial),
    [cancel, setCancel] = useState("");
  const rows = filtered(s, f);
  return (
    <>
      <Title
        title="Riwayat transaksi"
        description="Pembatalan mempertahankan audit dan tidak membuka hak otomatis."
      />
      <FilterBar f={f} set={set} />
      <Button
        onClick={() =>
          void run(
            async () => download("synthetic_dispensing_transactions", rows),
            "CSV sintetis diekspor.",
          )
        }
      >
        Ekspor CSV hasil filter
      </Button>
      <Card className="mt-4">
        {rows.length ? (
          <Table
            headers={[
              "ID / Waktu",
              "Peserta / Resep",
              "Produk / Batch / Expiry",
              "Jumlah / Fasilitas",
              "Petugas / Status",
              "Tindakan",
            ]}
          >
            {rows.map((t) => {
              const p = s.synthetic_product_catalog.find(
                (p) => p.id === t.productId,
              );
              return (
                <tr key={t.id} className="border-b">
                  <td className="p-3 text-xs">
                    {t.id}
                    <p>{stamp(t.at)}</p>
                  </td>
                  <td className="p-3 text-xs">
                    {t.memberId}
                    <p>{t.rxId}</p>
                    <Status
                      value={
                        s.synthetic_biometric_verifications.find(
                          (v) => v.id === t.verificationId,
                        )?.status ?? "EXPIRED"
                      }
                    />
                  </td>
                  <td className="p-3 text-xs">
                    {p?.name}
                    <p>
                      {p?.code} · {p?.batch}
                    </p>
                    <p>{p?.expiry}</p>
                  </td>
                  <td className="p-3 text-xs">
                    {t.quantity} unit<p>{t.facility}</p>
                  </td>
                  <td className="p-3 text-xs">
                    {t.actorId}
                    <Status value={t.status} />
                  </td>
                  <td className="space-y-2 p-3">
                    <Button
                      disabled={busy || !can(actor, t.kind)}
                      onClick={() =>
                        void run(() =>
                          service.dispense(actor, {
                            rxId: t.rxId,
                            verificationId: t.verificationId,
                            scanId: t.scanId,
                            quantity: t.quantity,
                            idempotencyKey: id("REQUEST"),
                            confirmed: true,
                            mode: "SIMULATION_ONLY",
                          }),
                        )
                      }
                    >
                      Uji duplikat
                    </Button>
                    <Button
                      disabled={
                        busy || t.status !== "COMPLETED" || !can(actor, t.kind)
                      }
                      onClick={() => setCancel(t.id)}
                    >
                      Batalkan
                    </Button>
                  </td>
                </tr>
              );
            })}
          </Table>
        ) : (
          <EmptyState title="Belum ada transaksi sesuai filter" />
        )}
      </Card>
      <Modal
        open={!!cancel}
        onClose={() => setCancel("")}
        title="Batalkan transaksi sintetis?"
      >
        <p className="mb-4 text-sm">
          Hak tetap terkunci. Audit pembatalan dicatat. Ini bukan penarikan
          produk fisik.
        </p>
        <Button
          disabled={busy}
          onClick={() => {
            const value = cancel;
            setCancel("");
            void run(() => service.cancel(actor, value));
          }}
        >
          Konfirmasi pembatalan
        </Button>
      </Modal>
    </>
  );
}
export function DataExplorer() {
  const { state: s, run } = useWorkspace();
  const [dataset, set] = useState<Dataset>("synthetic_members");
  return (
    <>
      <Title
        title="Data Explorer"
        description="Tujuh dataset sintetis terpisah, tanpa impor produksi atau identitas nyata."
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Field label="Tabel">
          <Select
            value={dataset}
            onChange={(e) => set(e.target.value as Dataset)}
          >
            {datasets.map((k) => (
              <option key={k} value={k}>
                {k} ({s[k].length})
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex items-end">
          <Button
            onClick={() =>
              void run(
                async () => download(dataset, s[dataset]),
                "CSV sintetis diekspor.",
              )
            }
          >
            Ekspor tabel sintetis
          </Button>
        </div>
      </div>
      <Card className="mb-5 p-5">
        <h3 className="font-bold">Relasi antartabel</h3>
        {relationshipNotes.map((n) => (
          <p key={n} className="mt-2 break-words font-mono text-xs">
            {n}
          </p>
        ))}
      </Card>
      <Card>
        <Table headers={["Kolom", "Definisi", "Manfaat", "Jika hilang"]}>
          {fields(dataset).map((f) => (
            <tr key={f.name} className="border-b">
              <td className="p-3 font-mono text-xs">{f.name}</td>
              <td className="p-3 text-xs">{f.definition}</td>
              <td className="p-3 text-xs">
                {f.category} · {f.reason}
              </td>
              <td className="p-3 text-xs">{f.missing}</td>
            </tr>
          ))}
        </Table>
      </Card>
      <Card className="mt-5 p-5">
        <h3 className="font-bold">
          Contoh · {s[dataset].length} record · maksimum 5 ditampilkan
        </h3>
        {s[dataset].length ? (
          <pre className="mt-3 max-h-96 overflow-auto rounded-xl bg-slate-50 p-4 text-xs dark:bg-slate-800">
            {JSON.stringify(s[dataset].slice(0, 5), null, 2)}
          </pre>
        ) : (
          <EmptyState title="Belum ada kejadian pada tabel ini" />
        )}
      </Card>
    </>
  );
}
export function DataEvaluation() {
  const [category, set] = useState("");
  return (
    <>
      <Title
        title="Evaluasi manfaat data"
        description="A: esensial · B: analisis/audit · C: konfirmasi pemilik data · D: tidak diperlukan. Data sintetis tidak membuktikan akurasi atau efektivitas operasional."
      />
      <Card className="mb-5 p-5">
        <h3 className="font-bold">Sensitivitas & klarifikasi</h3>
        {excludedFields.map((f) => (
          <p key={f.name} className="mt-3 text-sm">
            <Badge tone="amber">{f.category}</Badge> {f.name} — {f.reason}
          </p>
        ))}
      </Card>
      <Field label="Kategori">
        <Select value={category} onChange={(e) => set(e.target.value)}>
          <option value="">Semua A–C</option>
          {["A", "B", "C"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
      </Field>
      <Card className="mt-4">
        <Table
          headers={[
            "Tabel / Field",
            "Kategori / Alasan",
            "Ketergantungan",
            "Konsekuensi",
          ]}
        >
          {dataEvaluation
            .filter((f) => !category || f.category === category)
            .map((f) => (
              <tr key={f.dataset + f.name} className="border-b">
                <td className="p-3 text-xs">
                  {f.dataset}
                  <p className="font-mono font-bold">{f.name}</p>
                </td>
                <td className="p-3 text-xs">
                  {f.category} · {f.reason}
                </td>
                <td className="p-3 text-xs">{f.dependency}</td>
                <td className="p-3 text-xs">{f.missing}</td>
              </tr>
            ))}
        </Table>
      </Card>
    </>
  );
}
export function DispensingAudit() {
  const { state: s, run } = useWorkspace();
  const [search, set] = useState("");
  const rows = s.synthetic_audit_logs
    .filter((a) =>
      [a.action, a.status, a.entityId, a.correlationId, a.reason].some((v) =>
        v.toLowerCase().includes(search.toLowerCase()),
      ),
    )
    .slice()
    .reverse();
  return (
    <>
      <Title
        title="Audit trail"
        description="Append-only melalui alur aplikasi. Petugas biasa tidak memiliki kontrol edit/hapus. Browser bukan penyimpanan audit tahan manipulasi produksi."
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          className="max-w-md"
          aria-label="Cari audit"
          placeholder="Tindakan, alasan, correlation ID…"
          value={search}
          onChange={(e) => set(e.target.value)}
        />
        <Button
          onClick={() =>
            void run(
              async () => download("synthetic_audit_logs", rows),
              "CSV audit diekspor.",
            )
          }
        >
          Ekspor CSV audit
        </Button>
      </div>
      <Card>
        {rows.length ? (
          <Table
            headers={[
              "Waktu / Event",
              "Actor",
              "Tindakan / Status",
              "Entity / Correlation",
              "Alasan",
            ]}
          >
            {rows.map((a) => (
              <tr key={a.id} className="border-b">
                <td className="p-3 text-xs">
                  {stamp(a.at)}
                  <p>{a.id}</p>
                </td>
                <td className="p-3 text-xs">{a.actorId}</td>
                <td className="p-3 text-xs">
                  {a.action}
                  <p>{a.status}</p>
                </td>
                <td className="p-3 text-xs">
                  {a.entityId}
                  <p>{a.correlationId}</p>
                </td>
                <td className="p-3 text-xs">{a.reason || "—"}</td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState title="Belum ada audit sesuai pencarian" />
        )}
      </Card>
    </>
  );
}
export function IntegrationStatus() {
  const [view, set] = useState("demo");
  return (
    <>
      <Title
        title="Status integrasi"
        description="DEMO: antarmuka. SIMULATION_ONLY: hasil lokal. INTEGRASI PRODUKSI belum tersedia dan tidak dapat diaktifkan."
      />
      <Field label="Konfigurasi adapter">
        <Select value={view} onChange={(e) => set(e.target.value)}>
          <option value="demo">DEMO / SIMULASI</option>
          <option value="production">Rencana PRODUKSI (tidak aktif)</option>
        </Select>
      </Field>
      <Card className="my-5">
        <Table headers={["Adapter", "Status", "Sumber"]}>
          {adapterStatus(view === "production").map((a) => (
            <tr key={a.name} className="border-b">
              <td className="p-3 font-mono text-xs">{a.name}</td>
              <td className="p-3">
                <Status value={a.status} />
              </td>
              <td className="p-3 text-sm">{a.source}</td>
            </tr>
          ))}
        </Table>
      </Card>
      <Alert>
        Tidak ada endpoint atau kredensial BPJS. Diperlukan backend tepercaya,
        izin, dokumentasi API, kebijakan biometrik, dan pemetaan produk. Rahasia
        produksi tidak boleh berada dalam VITE_* atau browser.
      </Alert>
    </>
  );
}
export function DispensingSettings() {
  const { state: s, actor, run, busy } = useWorkspace();
  const [rules, setRules] = useState(s.rules),
    [days, setDays] = useState(String(s.retentionDays)),
    [confirm, setConfirm] = useState<"save" | "purge" | "">("");
  const enabled = can(actor, "admin");
  return (
    <>
      <Title
        title="Pengaturan & manajemen role"
        description="Persona dapat diganti dari header untuk demo. Pembatasan tindakan bukan autentikasi produksi."
      />
      <Card className="mb-5">
        <Table
          headers={["Role", "Verifikasi", "Penyerahan", "Aturan / Retensi"]}
        >
          {roles.map((role) => (
            <tr key={role} className="border-b">
              <td className="p-3 text-sm">{role}</td>
              <td className="p-3 text-sm">
                {can({ ...actor, role }, "verify") ? "Ya" : "Baca"}
              </td>
              <td className="p-3 text-sm">
                {(["PRB", "DIALYSIS"] as Kind[])
                  .filter((k) => can({ ...actor, role }, k))
                  .join(", ") || "Baca"}
              </td>
              <td className="p-3 text-sm">
                {role === "Admin Demo" ? "Ya" : "Tidak"}
              </td>
            </tr>
          ))}
        </Table>
      </Card>
      <Card className="space-y-4 p-5">
        <h3 className="font-bold">Parameter layanan sintetis</h3>
        {(["PRB", "DIALYSIS"] as const).map((k) => (
          <div
            key={k}
            className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2"
          >
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                disabled={!enabled}
                checked={rules[k].requireBatch}
                onChange={(e) =>
                  setRules({
                    ...rules,
                    [k]: { ...rules[k], requireBatch: e.target.checked },
                  })
                }
              />
              {k}: batch wajib
            </label>
            <Field label={`${k}: masa simpan minimum (hari)`}>
              <Input
                type="number"
                min="0"
                max="365"
                disabled={!enabled}
                value={rules[k].minShelfDays}
                onChange={(e) =>
                  setRules({
                    ...rules,
                    [k]: { ...rules[k], minShelfDays: Number(e.target.value) },
                  })
                }
              />
            </Field>
          </div>
        ))}
        <Field label="Retensi kejadian (1–365 hari)">
          <Input
            type="number"
            min="1"
            max="365"
            disabled={!enabled}
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
        </Field>
        <p className="text-xs text-slate-500">
          Retensi manual: menghapus kejadian lama bersama referensi hak yang
          sudah digunakan agar hak tidak terbuka kembali. Katalog dan peserta
          sintetis dipertahankan. Parameter demo belum menjadi aturan layanan
          yang disetujui.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            disabled={busy || !enabled}
            onClick={() => setConfirm("save")}
          >
            Simpan aturan demo
          </Button>
          <Button
            disabled={busy || !enabled}
            onClick={() => setConfirm("purge")}
          >
            Hapus kejadian melewati retensi
          </Button>
        </div>
        {!enabled && (
          <Alert>
            Hanya Admin Demo dapat mengubah aturan dan menjalankan retensi.
          </Alert>
        )}
      </Card>
      <Modal
        open={!!confirm}
        onClose={() => setConfirm("")}
        title={
          confirm === "save" ? "Simpan aturan demo?" : "Hapus kejadian lama?"
        }
      >
        <p className="mb-4 text-sm">
          {confirm === "save"
            ? "Aturan akan diperiksa ulang saat konfirmasi transaksi."
            : "Penghapusan lokal tidak dapat dibatalkan; peristiwa retensi akan diaudit."}
        </p>
        <Button
          disabled={busy}
          onClick={() => {
            const action = confirm;
            setConfirm("");
            void run(() =>
              action === "save"
                ? service.configure(actor, rules, Number(days))
                : service.purge(actor),
            );
          }}
        >
          Konfirmasi
        </Button>
      </Modal>
    </>
  );
}
