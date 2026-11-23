export type WorkloadType = "vm" | "server" | "pc" | "nas";
export type DestType = "das" | "nas" | "object" | "vault";
export type TimeUnit = "minuti" | "ore" | "giorni";
export type SizeUnit = "GB" | "TB";

export type Workload = { id: string; name: string; type: WorkloadType; note: string };

export type Destination = {
  id: string;
  name: string;
  type: DestType;
  offsite: boolean;
  immutable: boolean;
  /** Spazio occupato dai backup. Zero: non indicato, il repository non compare nella sezione dello spazio. */
  usedValue: number;
  usedUnit: SizeUnit;
  /** Capacità totale, facoltativa. Zero: non indicata, nel report compare come N/A con la barra vuota. */
  capacityValue: number;
  capacityUnit: SizeUnit;
};

/** Spazio non indicato: i valori di partenza di un nuovo repository e dei dati salvati prima che esistesse il campo. */
export const NO_SIZE = { usedValue: 0, usedUnit: "TB", capacityValue: 0, capacityUnit: "TB" } as const;

/** Una copia dei dati su una destinazione, con la sua conservazione (breve termine + GFS). */
export type Copy = {
  id: string;
  repositoryId: string;
  days: number; // breve termine: una copia per ogni backup degli ultimi N giorni
  weekly: number; // GFS: settimane
  monthly: number; // GFS: mesi
  yearly: number; // GFS: anni
};

export type Plan = {
  id: string;
  name: string;
  workloadIds: string[];
  /** RPO: ogni quanto parte il backup, quindi quanti dati si possono perdere al massimo. */
  rpoValue: number;
  rpoUnit: TimeUnit;
  rtoValue: number;
  rtoUnit: TimeUnit;
  copies: Copy[];
};

export type Config = {
  client: string;
  date: string;
  workloads: Workload[];
  repositories: Destination[];
  jobs: Plan[];
};

export const WORKLOAD_TYPES: Record<WorkloadType, string> = {
  pc: "Workstation",
  server: "Server fisico",
  vm: "Macchina virtuale",
  nas: "Cartelle condivise",
};

/** Tipi di repository. Se è in sede o fuori sede lo dice il flag "offsite", non il tipo. */
export const DEST_TYPES: Record<DestType, { label: string; offsite: boolean; immutable: boolean }> = {
  das: { label: "Direct attached storage", offsite: false, immutable: false },
  nas: { label: "Network attached storage", offsite: false, immutable: false },
  object: { label: "Object storage", offsite: true, immutable: false },
  vault: { label: "Veeam Data Cloud Vault", offsite: true, immutable: true },
};

/** Tipi delle versioni precedenti: sede principale/secondaria diventano NAS, disco esterno DAS, altro cloud object storage. */
const LEGACY_DEST_TYPES: Record<string, DestType> = { local: "nas", site: "nas", usb: "das", cloud: "object" };

export const TIME_UNITS: Record<TimeUnit, string> = { minuti: "minuti", ore: "ore", giorni: "giorni" };
export const SIZE_UNITS: Record<SizeUnit, string> = { GB: "GB", TB: "TB" };

/** Vecchio campo "frequenza", convertito in RPO quando si aprono dati salvati in precedenza. */
const LEGACY_FREQUENCIES: Record<string, [number, TimeUnit]> = {
  "1h": [1, "ore"],
  "4h": [4, "ore"],
  "12h": [12, "ore"],
  "24h": [24, "ore"],
  "7d": [7, "giorni"],
};

export const uid = () => crypto.randomUUID();

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const UNIT_FORMS: Record<TimeUnit, [string, string]> = {
  minuti: ["minuto", "minuti"],
  ore: ["ora", "ore"],
  giorni: ["giorno", "giorni"],
};

export const durationText = (value: number, unit: TimeUnit) => plural(value, ...UNIT_FORMS[unit]);
export const rtoText = (p: Plan) => durationText(p.rtoValue, p.rtoUnit);
export const rpoText = (p: Plan) => durationText(p.rpoValue, p.rpoUnit);

/** Frequenza del backup in parole semplici, ricavata dall'RPO. */
export function frequencyText(p: Plan) {
  const { rpoValue: v, rpoUnit: u } = p;
  if (u === "giorni" && v === 7) return "Ogni settimana";
  if (u === "ore" && v === 24) return "Ogni giorno";
  if (v === 1) return { minuti: "Ogni minuto", ore: "Ogni ora", giorni: "Ogni giorno" }[u];
  return `Ogni ${durationText(v, u)}`;
}

type LegacyPlan = Omit<Plan, "copies"> & { frequency?: string; copies: (Copy & { destinationId?: string })[] };
type LegacyConfig = Partial<Config> & { destinations?: Destination[]; plans?: LegacyPlan[] };
type LegacyDestination = Destination & { sizeUnit?: SizeUnit };

/** Per un breve periodo i due valori dello spazio hanno avuto un'unità in comune: vale per entrambi. */
function ownUnits({ sizeUnit, ...r }: LegacyDestination): Destination {
  return sizeUnit ? { ...r, usedUnit: sizeUnit, capacityUnit: sizeUnit } : r;
}

/** Completa i dati salvati con versioni precedenti dell'app (destinations/plans/destinationId, frequenza). */
export function normalize(raw: LegacyConfig): Config {
  const { destinations, plans, ...c } = raw;
  const jobs = (c.jobs ?? plans ?? []) as LegacyPlan[];
  return {
    ...emptyConfig(),
    ...c,
    // Microsoft 365 non è più un tipo di workload: diventa macchina virtuale, da correggere a mano
    workloads: (c.workloads ?? []).map((w) => (w.type in WORKLOAD_TYPES ? w : { ...w, type: "vm" })),
    repositories: (c.repositories ?? destinations ?? []).map((r) => ({
      ...NO_SIZE,
      ...ownUnits(r),
      type: r.type in DEST_TYPES ? r.type : (LEGACY_DEST_TYPES[r.type] ?? "nas"),
    })),
    jobs: jobs.map(({ frequency, ...p }) => {
      const copies = p.copies.map(({ destinationId, ...x }) => ({ ...x, repositoryId: x.repositoryId ?? destinationId ?? "" }));
      if (typeof p.rpoValue === "number" && p.rpoUnit) return { ...p, copies };
      const [rpoValue, rpoUnit] = LEGACY_FREQUENCIES[frequency ?? ""] ?? [24, "ore"];
      return { ...p, copies, rpoValue, rpoUnit };
    }),
  };
}

/** Cadenza del backup in parole semplici ("uno al giorno"), ricavata dall'RPO. */
function cadenceText(p: Plan) {
  const { rpoValue: v, rpoUnit: u } = p;
  if (u === "giorni" && v === 7) return "uno a settimana";
  if (u === "ore" && v === 24) return "uno al giorno";
  if (v === 1) return { minuti: "uno al minuto", ore: "uno all'ora", giorni: "uno al giorno" }[u];
  return `uno ogni ${durationText(v, u)}`;
}

export type Tier = {
  key: string;
  /** Quanto indietro arriva il livello, in parole ("2 settimane"). */
  span: string;
  /** Ogni quanto viene tenuto un backup ("uno a settimana"). */
  every: string;
  /** Blocchi del grafico: uno per ogni giorno, settimana, mese o anno conservato. */
  count: number;
  /** Giorni coperti da un singolo blocco. */
  period: number;
  days: number;
};

const levels = (c: Copy) =>
  [
    { key: "d", span: plural(c.days, "giorno", "giorni"), count: c.days, period: 1 },
    { key: "w", span: plural(c.weekly, "settimana", "settimane"), count: c.weekly, period: 7 },
    { key: "m", span: plural(c.monthly, "mese", "mesi"), count: c.monthly, period: 30 },
    { key: "y", span: plural(c.yearly, "anno", "anni"), count: c.yearly, period: 365 },
  ]
    .filter((l) => l.count > 0)
    .map((l) => ({ ...l, days: l.count * l.period }));

/** Livelli di conservazione di una copia, dal più recente al più lontano. */
export function tiers(c: Copy, p: Plan): Tier[] {
  const every: Record<string, string> = { w: "uno a settimana", m: "uno al mese", y: "uno all'anno" };
  // Nel breve termine si tengono tutti i backup, quindi la cadenza è quella del job
  return levels(c).map((l) => ({ ...l, every: l.key === "d" ? cadenceText(p) : every[l.key] }));
}

/** Quanto indietro nel tempo si può tornare con questa copia. */
export function reach(c: Copy): { days: number; text: string } {
  return levels(c).reduce((best, l) => (l.days > best.days ? { days: l.days, text: l.span } : best), {
    days: 0,
    text: "—",
  });
}

/**
 * Grafico della conservazione: larghezza di un blocco, che cresce con il periodo coperto (giorno < settimana < mese < anno).
 * In scala reale un anno sarebbe 365 volte un giorno, quindi si usa la radice quadrata.
 */
export const blockUnits = (t: Tier) => Math.sqrt(t.period);
const copyUnits = (c: Copy, p: Plan) => tiers(c, p).reduce((sum, t) => sum + t.count * blockUnits(t), 0);

/** Un blocco giornaliero non supera mai 1/30 della barra, anche nei report con poca conservazione. */
const MIN_UNITS = 30;

/** Scala comune delle barre di conservazione: la copia più lunga del report occupa tutta la larghezza. */
export const retentionUnits = (c: Config) =>
  Math.max(MIN_UNITS, ...c.jobs.flatMap((p) => p.copies.map((x) => copyUnits(x, p))));

const GB_PER_UNIT: Record<SizeUnit, number> = { GB: 1, TB: 1024 };
const decimal = (n: number, digits: number) => n.toLocaleString("it-IT", { maximumFractionDigits: digits });
const sizeText = (value: number, unit: SizeUnit) => `${decimal(value, 2)} ${unit}`;
/** Una quantità in GB scritta con l'unità più leggibile. */
const gbText = (gb: number) => (gb >= 1024 ? `${decimal(gb / 1024, 1)} TB` : `${Math.round(gb)} GB`);

/** Oltre queste percentuali lo spazio si sta riempiendo, o è quasi finito. */
const USAGE_WARN = 80;
const USAGE_FULL = 90;

export type UsageState = "ok" | "warn" | "full";
export type Usage = {
  repo: Destination;
  /** Spazio occupato, come è stato inserito ("3,2 TB"). */
  used: string;
  /** Capacità totale ("8 TB"), oppure "N/A" se non è indicata. */
  capacity: string;
  /** Quanto è pieno il repository. Manca se la capacità non è indicata: la barra resta vuota. */
  percent?: number;
  state: UsageState;
  note: string;
  alert?: string;
};

/** Spazio occupato dai backup, per i repository in cui è stato indicato. */
export function storage(c: Config): Usage[] {
  return c.repositories
    .filter((r) => r.usedValue > 0)
    .map((repo) => {
      const used = sizeText(repo.usedValue, repo.usedUnit);
      if (!(repo.capacityValue > 0)) return { repo, used, capacity: "N/A", state: "ok", note: "Capacità non indicata" };
      const usedGb = repo.usedValue * GB_PER_UNIT[repo.usedUnit];
      const totalGb = repo.capacityValue * GB_PER_UNIT[repo.capacityUnit];
      const percent = Math.round((usedGb / totalGb) * 100);
      const state: UsageState = percent >= USAGE_FULL ? "full" : percent >= USAGE_WARN ? "warn" : "ok";
      return {
        repo,
        used,
        capacity: sizeText(repo.capacityValue, repo.capacityUnit),
        percent,
        state,
        note: usedGb >= totalGb ? "Spazio esaurito" : `Occupato al ${percent}%, restano ${gbText(totalGb - usedGb)} liberi`,
        alert: { ok: undefined, warn: "Si sta riempiendo", full: "Quasi pieno" }[state],
      };
    });
}

/** Storico minimo consigliato: un attacco o un errore spesso si scopre dopo settimane. */
export const MIN_HISTORY_DAYS = 30;

export type Check = { key: string; ok: boolean; title: string; text: string };
export type Level = "none" | "risk" | "improve" | "good" | "full";

export const LEVEL_TEXT: Record<Level, string> = {
  none: "Nessuna protezione",
  risk: "Protezione a rischio",
  improve: "Protezione da migliorare",
  good: "Protezione buona",
  full: "Protezione completa",
};

/** Data del report per esteso ("23 novembre 2026"). */
export const dateText = (iso: string) =>
  iso ? new Date(iso + "T00:00").toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" }) : "";

/** Parole spiegate in fondo al report. */
export const GLOSSARY: [term: string, text: string][] = [
  ["Fuori sede", "lontano dall'ufficio, al sicuro da furti e incendi"],
  ["Immutabile", "nessuno può alterare o cancellare la copia, nemmeno un ransomware"],
];

const names = (ws: Workload[]) => ws.map((w) => w.name || "Senza nome").join(", ");

/**
 * Livello di protezione, ispirato alla regola 3-2-1-1 di Veeam.
 * Ogni controllo vale per ciascun workload: basta un workload scoperto perché il controllo non sia superato.
 */
export function protection(c: Config): { checks: Check[]; score: number; level: Level } {
  const repos = new Map(c.repositories.map((r) => [r.id, r]));
  const status = c.workloads.map((w) => {
    const copies = c.jobs
      .filter((j) => j.workloadIds.includes(w.id))
      .flatMap((j) => j.copies)
      .filter((x) => repos.has(x.repositoryId));
    return {
      w,
      repos: [...new Set(copies.map((x) => x.repositoryId))].map((id) => repos.get(id)!),
      history: Math.max(0, ...copies.map((x) => reach(x).days)),
    };
  });
  const covered = status.filter((s) => s.repos.length > 0);
  const uncovered = status.filter((s) => s.repos.length === 0).map((s) => s.w);
  const total = c.workloads.length;

  // I workload senza backup compaiono solo nel primo controllo; gli altri valutano quelli coperti.
  // Le descrizioni dicono cosa tutela il requisito, o cosa si rischia senza, senza elencare i sistemi.
  const rule = (key: string, title: string, test: (s: (typeof status)[number]) => boolean, ok: string, ko: string): Check => {
    if (!covered.length) return { key, ok: false, title, text: "Nessun backup configurato" };
    const passed = covered.every(test);
    return { key, ok: passed, title, text: passed ? ok : ko };
  };

  const checks: Check[] = [
    {
      key: "coverage",
      ok: total > 0 && uncovered.length === 0,
      title: uncovered.length ? "Sistemi senza backup" : "Tutti i sistemi coperti",
      text: uncovered.length
        ? names(uncovered)
        : total
          ? `${total === 1 ? "Il sistema ha" : `Tutti i ${total} sistemi hanno`} un backup`
          : "Nessun sistema inserito",
    },
    // 3-2-1: tre copie dei dati, originale compreso, quindi almeno due backup in repository diversi
    rule("copies", "Tre copie dei dati", (s) => s.repos.length >= 2,
      "Se una copia si guasta ce n'è un'altra",
      "Se una copia si guasta i dati possono andare persi"),
    rule("offsite", "Copia fuori sede", (s) => s.repos.some((r) => r.offsite),
      "Una copia è al sicuro in un altro luogo",
      "Tutte le copie sono nello stesso luogo"),
    rule("immutable", "Copia immutabile", (s) => s.repos.some((r) => r.immutable),
      "Nessuno può alterare o cancellare i backup",
      "I backup possono essere alterati o cancellati"),
    rule("history", "Almeno un mese di storico", (s) => s.history >= MIN_HISTORY_DAYS,
      "Un file perso si può ancora recuperare",
      "Un file perso da settimane non si recupera più"),
  ];

  const score = checks.filter((x) => x.ok).length;
  const level: Level = !covered.length
    ? "none"
    : !checks[0].ok || score <= 2
      ? "risk" // un sistema senza backup non può valere più di "a rischio"
      : score === 3
        ? "improve"
        : score === 4
          ? "good"
          : "full";
  return { checks, score, level };
}

export const emptyConfig = (): Config => ({
  client: "",
  date: new Date().toISOString().slice(0, 10),
  workloads: [],
  repositories: [],
  jobs: [],
});

export function sampleConfig(): Config {
  const w = [
    { id: uid(), name: "SRV-GESTIONALE", type: "vm" as const, note: "Gestionale e contabilità" },
    { id: uid(), name: "SRV-FILE", type: "vm" as const, note: "Documenti aziendali" },
    { id: uid(), name: "SRV-DC", type: "vm" as const, note: "Utenti e accessi" },
    { id: uid(), name: "PC Direzione", type: "pc" as const, note: "" },
  ];
  const d = [
    { id: uid(), name: "NAS in ufficio", type: "nas" as const, offsite: false, immutable: false, ...NO_SIZE, usedValue: 2.6, capacityValue: 4 },
    { id: uid(), name: "Veeam Data Cloud Vault", type: "vault" as const, offsite: true, immutable: true, ...NO_SIZE, usedValue: 850, usedUnit: "GB" as const, capacityValue: 2 },
  ];
  return {
    client: "Azienda Esempio S.r.l.",
    date: new Date().toISOString().slice(0, 10),
    workloads: w,
    repositories: d,
    jobs: [
      {
        id: uid(),
        name: "Server aziendali",
        workloadIds: w.slice(0, 3).map((x) => x.id),
        rpoValue: 24,
        rpoUnit: "ore",
        rtoValue: 4,
        rtoUnit: "ore",
        copies: [
          { id: uid(), repositoryId: d[0].id, days: 14, weekly: 4, monthly: 0, yearly: 0 },
          { id: uid(), repositoryId: d[1].id, days: 30, weekly: 4, monthly: 12, yearly: 3 },
        ],
      },
      {
        id: uid(),
        name: "Postazioni",
        workloadIds: [w[3].id],
        rpoValue: 24,
        rpoUnit: "ore",
        rtoValue: 1,
        rtoUnit: "giorni",
        copies: [{ id: uid(), repositoryId: d[0].id, days: 7, weekly: 0, monthly: 0, yearly: 0 }],
      },
    ],
  };
}
