import {
  CircleAlert,
  CircleCheck,
  Clock,
  Cloud,
  History,
  Lock,
  MapPin,
  RefreshCw,
  Timer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DEST_ICON, Icon, WORKLOAD_ICON } from "@/lib/icons";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  blockUnits,
  Check,
  Config,
  Copy,
  dateText,
  DEST_TYPES,
  frequencyText,
  GLOSSARY,
  Level,
  LEVEL_TEXT,
  Plan,
  protection,
  reach,
  retentionUnits,
  rpoText,
  rtoText,
  storage,
  tiers,
  UsageState,
  WORKLOAD_TYPES,
} from "@/lib/model";


// In stampa le card possono spezzarsi tra una pagina e l'altra, mantenendo il bordo.
const printCard = "print:overflow-visible print:border print:ring-0 print:box-decoration-clone";

// Dal più recente (chiaro) al più lontano (scuro)
const TIER_COLOR: Record<string, string> = { d: "bg-lime", w: "bg-mint", m: "bg-viridis", y: "bg-pine" };

const LEVELS: Record<Level, { bar: string; tone: string }> = {
  none: { bar: "bg-ignis", tone: "text-ignis" },
  risk: { bar: "bg-ignis", tone: "text-ignis" },
  improve: { bar: "bg-suma", tone: "text-suma" },
  good: { bar: "bg-sol", tone: "text-sol-dark" },
  full: { bar: "bg-viridis", tone: "text-pine" },
};

const USAGE: Record<UsageState, { bar: string; tone: string }> = {
  ok: { bar: "bg-viridis", tone: "text-pine" },
  warn: { bar: "bg-suma", tone: "text-suma" },
  full: { bar: "bg-ignis", tone: "text-ignis" },
};

function Stat({
  icon: I,
  label,
  value,
  note,
  term,
}: {
  icon: Icon;
  label: string;
  value: string;
  note: string;
  /** Sigla di settore per i lettori tecnici, con il nome esteso come suggerimento. */
  term?: { abbr: string; full: string };
}) {
  return (
    <div className="rounded-lg bg-muted p-4">
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <I className="size-4" /> {label}
        {term && (
          <abbr
            title={term.full}
            className="ml-auto rounded border border-border px-1.5 py-px text-xs font-medium tracking-wide no-underline"
          >
            {term.abbr}
          </abbr>
        )}
      </p>
      <p className="mt-2 font-heading text-2xl leading-none font-semibold">{value}</p>
      <p className="mt-1.5 text-sm text-muted-foreground">{note}</p>
    </div>
  );
}

function CheckItem({ ok, title, text, className }: Omit<Check, "key"> & { className?: string }) {
  const I = ok ? CircleCheck : CircleAlert;
  return (
    <div className={`flex gap-2.5 rounded-lg bg-muted p-3 ${className ?? ""}`}>
      <I className={`mt-0.5 size-5 shrink-0 ${ok ? "text-pine" : "text-suma"}`} />
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

// Larghezza indicativa della barra a schermo, per scegliere lo spazio tra i blocchi.
const TRACK_PX = 540;

/**
 * Conservazione: una linea del tempo da oggi all'indietro, con un blocco per ogni periodo conservato.
 * La scala è la stessa in tutto il report, così le copie si confrontano a colpo d'occhio.
 */
function Retention({ copy, plan, maxUnits }: { copy: Copy; plan: Plan; maxUnits: number }) {
  const list = tiers(copy, plan);
  if (!list.length) return <p className="text-muted-foreground">Conservazione non indicata</p>;
  return (
    <div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Oggi</span>
        {/* Lo spazio a destra è riservato alla scritta che segue la fine della barra */}
        <div className="flex min-w-0 flex-1 items-center gap-1 pr-28" aria-hidden>
          {list.map((t) => {
            const px = (blockUnits(t) / maxUnits) * TRACK_PX;
            return (
              <div
                key={t.key}
                className={`flex h-3 flex-none overflow-hidden rounded-[3px] ${px < 3 ? TIER_COLOR[t.key] : px < 6 ? "gap-px" : "gap-0.5"}`}
                style={{ width: `${((t.count * blockUnits(t)) / maxUnits) * 100}%` }}
              >
                {px >= 3 &&
                  Array.from({ length: t.count }, (_, i) => (
                    <span key={i} className={`flex-1 rounded-[2px] ${TIER_COLOR[t.key]}`} />
                  ))}
              </div>
            );
          })}
          <span className="ml-1 flex-none whitespace-nowrap">{reach(copy).text} fa</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
        {list.map((t) => (
          <div key={t.key} className="flex gap-1.5">
            <span className={`mt-[3px] size-2.5 flex-none rounded-[3px] ${TIER_COLOR[t.key]}`} aria-hidden />
            <div>
              <p className="font-medium">{t.span}</p>
              <p className="text-muted-foreground">{t.every}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanCard({ plan, config, maxUnits }: { plan: Plan; config: Config; maxUnits: number }) {
  const workloads = config.workloads.filter((w) => plan.workloadIds.includes(w.id));
  const copies = plan.copies.flatMap((c) => {
    const dest = config.repositories.find((d) => d.id === c.repositoryId);
    return dest ? [{ copy: c, dest }] : [];
  });
  const best = copies.reduce((b, x) => (reach(x.copy).days > b.days ? reach(x.copy) : b), { days: 0, text: "—" });

  return (
    <Card className={printCard}>
      <CardHeader className="border-b break-after-avoid">
        <CardTitle className="text-[1.75rem] font-semibold tracking-tight">{plan.name || "Backup job"}</CardTitle>
        <CardAction>
          <Badge variant="secondary" className="h-6 px-2.5">
            <RefreshCw /> {frequencyText(plan)}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="grid gap-5">
        <div className="avoid-break grid grid-cols-3 gap-3">
          <Stat icon={Clock} label="Perdita massima" value={rpoText(plan)} note="di lavoro, nel caso peggiore"
            term={{ abbr: "RPO", full: "Recovery Point Objective" }}
          />
          <Stat icon={Timer} label="Ripartenza" value={rtoText(plan)} note="per tornare operativi"
            term={{ abbr: "RTO", full: "Recovery Time Objective" }}
          />
          <Stat icon={History} label="Storico" value={best.text} note="indietro nel tempo" />
        </div>

        <div>
          <p className="mb-2.5 font-heading text-lg font-semibold">Sistemi protetti</p>
          {workloads.length === 0 && <p className="text-muted-foreground">Nessun workload selezionato</p>}
          {/* Un riquadro per sistema: è il dato che il cliente cerca per primo */}
          <div className="grid grid-cols-3 gap-2.5">
            {workloads.map((w) => {
              const I = WORKLOAD_ICON[w.type];
              return (
                <div key={w.id} className="avoid-break flex items-center gap-3 rounded-lg border p-3">
                  <span className="flex size-9 flex-none items-center justify-center rounded-md bg-lime/40 text-pine">
                    <I className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-base leading-tight font-medium break-words">{w.name || "Senza nome"}</p>
                    <p className="mt-0.5 text-muted-foreground">{w.note || WORKLOAD_TYPES[w.type]}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        <div>
          <p className="mb-2.5 font-heading text-lg font-semibold">Destinazioni</p>
          <div className="grid gap-3">
            {copies.length === 0 && <p className="text-muted-foreground">Nessuna destinazione selezionata</p>}
            {copies.map(({ copy, dest }) => {
              const I = DEST_ICON[dest.type];
              return (
                <div key={copy.id} className="avoid-break rounded-lg border p-4">
                  <div className="mb-5 flex flex-wrap items-center gap-2">
                    <I className="size-4 text-muted-foreground" />
                    <span className="text-base font-medium">{dest.name || DEST_TYPES[dest.type].label}</span>
                    <Badge variant="secondary">
                      {dest.offsite ? <Cloud /> : <MapPin />} {dest.offsite ? "Fuori sede" : "In sede"}
                    </Badge>
                    {dest.immutable && (
                      <Badge>
                        <Lock /> Immutabile
                      </Badge>
                    )}
                  </div>
                  <Retention copy={copy} plan={plan} maxUnits={maxUnits} />
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Spazio occupato dai backup, un repository per riga. Compare solo se il dato è stato inserito. */
function StorageCard({ config }: { config: Config }) {
  const list = storage(config);
  if (!list.length) return null;
  return (
    <Card className={printCard}>
      <CardHeader className="border-b break-after-avoid">
        <CardTitle className="text-[1.75rem] font-semibold tracking-tight">Spazio occupato</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        {list.map(({ repo, used, capacity, percent, state, note, alert }) => {
          const I = DEST_ICON[repo.type];
          return (
            <div key={repo.id} className="avoid-break">
              <div className="flex items-center gap-2 text-base">
                <I className="size-4 text-muted-foreground" />
                <span className="font-medium">{repo.name || DEST_TYPES[repo.type].label}</span>
                <span className="ml-auto font-medium">
                  {used}
                  <span className="font-normal text-muted-foreground"> su {capacity}</span>
                </span>
              </div>
              {/* Senza capacità la barra resta vuota */}
              <div className="mt-2.5 h-3 overflow-hidden rounded-full bg-muted" aria-hidden>
                {percent !== undefined && (
                  <div className={`h-full rounded-full ${USAGE[state].bar}`} style={{ width: `${Math.min(100, percent)}%` }} />
                )}
              </div>
              <p className="mt-2 flex gap-4 text-muted-foreground">
                {note}
                {alert && <span className={`ml-auto font-medium ${USAGE[state].tone}`}>{alert}</span>}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function Report({ config }: { config: Config }) {
  const { checks, score, level: levelKey } = protection(config);
  const maxUnits = retentionUnits(config);
  const level = LEVELS[levelKey];

  return (
    <article className="mx-auto flex w-[760px] flex-col gap-4 text-sm print:block print:w-auto print:space-y-4">
      <header className="mb-2">
        <p className="flex items-center gap-2 text-muted-foreground">
          <span className="size-3 rounded-[3px] bg-viridis" aria-hidden />
          <span className="font-medium text-foreground">UnitBit</span>
          Report Backup
          <span className="ml-auto">{dateText(config.date)}</span>
        </p>
        <h1 className="mt-5 font-heading text-[2.75rem] leading-none font-semibold tracking-tight">{config.client || "Nome del cliente"}</h1>
      </header>

      <Card className={printCard}>
        <CardHeader>
          <CardDescription>Livello di protezione</CardDescription>
          <CardTitle className={`text-[1.75rem] font-semibold tracking-tight ${level.tone}`}>{LEVEL_TEXT[levelKey]}</CardTitle>
          <CardAction className="font-heading text-2xl font-semibold">
            {score}
            <span className="text-muted-foreground"> su {checks.length}</span>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex h-3 gap-1.5" aria-hidden>
            {checks.map((_, i) => (
              <span key={i} className={`flex-1 rounded-full ${i < score ? level.bar : "bg-muted"}`} />
            ))}
          </div>
          <div className="avoid-break grid grid-cols-2 gap-3">
            {checks.map((c, i) => (
              // Il primo controllo (copertura) occupa tutta la riga, gli altri quattro stanno in una griglia 2×2
              <CheckItem key={c.key} ok={c.ok} title={c.title} text={c.text} className={i === 0 ? "col-span-2" : ""} />
            ))}
          </div>
        </CardContent>
      </Card>

      {config.jobs.map((p) => (
        <PlanCard key={p.id} plan={p} config={config} maxUnits={maxUnits} />
      ))}

      <StorageCard config={config} />

      <p className="mt-1 text-muted-foreground">
        {GLOSSARY.map(([term, text]) => (
          <span key={term}>
            <span className="font-medium text-foreground">{term}:</span> {text}.{" "}
          </span>
        ))}
        Backup gestiti con Veeam.
      </p>
    </article>
  );
}
