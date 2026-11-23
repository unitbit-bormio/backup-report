import { createElement, ElementType, ReactNode } from "react";
import { Circle, Document, Ellipse, Font, Line, Page, Path, pdf, Rect, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import {
  blockUnits,
  Check,
  Config,
  Copy,
  dateText,
  DEST_TYPES,
  DestType,
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
  WorkloadType,
} from "@/lib/model";
import { IconNode, PDF_ICONS } from "@/lib/pdf-icons";

/*
 * Il report come documento PDF in formato A4, disegnato direttamente in punti tipografici:
 * non è la stampa della pagina web, quindi non dipende dal browser né dalle impostazioni di stampa.
 * Contenuti e calcoli sono gli stessi del report a schermo (components/Report.tsx).
 */

// Colori Veeam, gli stessi di app/globals.css
const C = {
  text: "#101312",
  muted: "#5a625f",
  surface: "#f3f5f4",
  secondary: "#eef1ef",
  border: "#e1e5e3",
  white: "#ffffff",
  viridis: "#00d15f",
  mint: "#32f26f",
  lime: "#9cffa3",
  pine: "#007f49",
  sol: "#ffd839",
  solDark: "#b89000",
  suma: "#ff6900",
  ignis: "#ed2b3d",
  // Verde lime al 40% sul bianco, lo sfondo delle icone dei sistemi
  tint: "#d7ffda",
};

// Dal più recente (chiaro) al più lontano (scuro)
const TIER_COLOR: Record<string, string> = { d: C.lime, w: C.mint, m: C.viridis, y: C.pine };

const LEVELS: Record<Level, { bar: string; tone: string }> = {
  none: { bar: C.ignis, tone: C.ignis },
  risk: { bar: C.ignis, tone: C.ignis },
  improve: { bar: C.suma, tone: C.suma },
  good: { bar: C.sol, tone: C.solDark },
  full: { bar: C.viridis, tone: C.pine },
};

const USAGE_COLOR: Record<UsageState, { bar: string; tone: string }> = {
  ok: { bar: C.viridis, tone: C.pine },
  warn: { bar: C.suma, tone: C.suma },
  full: { bar: C.ignis, tone: C.ignis },
};

const WORKLOAD_ICON: Record<WorkloadType, IconNode> = {
  vm: PDF_ICONS.box,
  server: PDF_ICONS.server,
  pc: PDF_ICONS.monitor,
  nas: PDF_ICONS.folder,
};
const DEST_ICON: Record<DestType, IconNode> = {
  das: PDF_ICONS.usb,
  nas: PDF_ICONS.hardDrive,
  object: PDF_ICONS.database,
  vault: PDF_ICONS.cloud,
};

const FONT = "ES Build";
const MARGIN = 40;
const PAGE_HEIGHT = 841.89; // A4 in punti
// Lunghezza della barra di conservazione più lunga: il foglio ha una larghezza fissa, quindi si può stabilire in punti
const TRACK = 350;
// Riquadri dei sistemi protetti: quanti per riga e lo spazio tra uno e l'altro
const TILE_COLUMNS = 3;
const TILE_GAP = 6;

let fontsReady = false;
/** I PDF non accettano il font variabile del sito: servono i tre pesi in file separati (public/fonts). */
export function registerFonts(base = "/fonts") {
  if (fontsReady) return;
  fontsReady = true;
  Font.register({
    family: FONT,
    fonts: [
      { src: `${base}/ES-Build-Regular.ttf`, fontWeight: 400 },
      { src: `${base}/ES-Build-Medium.ttf`, fontWeight: 500 },
      { src: `${base}/ES-Build-SemiBold.ttf`, fontWeight: 600 },
    ],
  });
  // Niente sillabazione automatica: è pensata per l'inglese
  Font.registerHyphenationCallback((word) => [word]);
}

const s = StyleSheet.create({
  page: {
    paddingTop: 38,
    paddingBottom: 56,
    paddingHorizontal: MARGIN,
    fontFamily: FONT,
    fontSize: 9.5,
    lineHeight: 1.4,
    color: C.text,
  },
  row: { flexDirection: "row", alignItems: "center" },
  muted: { color: C.muted },
  medium: { fontWeight: 500 },
  small: { fontSize: 8.25 },
  h1: { marginTop: 13, fontSize: 30, fontWeight: 600, lineHeight: 1.05, letterSpacing: -0.6 },
  card: { marginTop: 12, paddingVertical: 13, borderWidth: 0.75, borderColor: C.border, borderRadius: 8 },
  inset: { paddingHorizontal: 13 },
  cardTitle: { fontSize: 19, fontWeight: 600, lineHeight: 1.2, letterSpacing: -0.4 },
  heading: { marginBottom: 7, fontSize: 12.5, fontWeight: 600, lineHeight: 1.2 },
  box: { padding: 9, borderRadius: 6, backgroundColor: C.surface },
  badge: { flexDirection: "row", alignItems: "center", gap: 3, height: 14, paddingHorizontal: 6, borderRadius: 7 },
  tile: {
    // Base zero: la larghezza dipende solo dalla riga, non dal testo contenuto
    flexGrow: 1,
    flexBasis: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    padding: 8,
    borderWidth: 0.75,
    borderColor: C.border,
    borderRadius: 6,
  },
  tileIcon: { width: 23, height: 23, alignItems: "center", justifyContent: "center", borderRadius: 5, backgroundColor: C.tint },
  footer: {
    position: "absolute",
    left: MARGIN,
    right: MARGIN,
    // Posizione dall'alto: con "bottom" react-pdf non disegna il piè di pagina
    top: PAGE_HEIGHT - 44,
    paddingTop: 7,
    borderTopWidth: 0.75,
    borderTopColor: C.border,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: C.muted,
  },
});

const SHAPES: Record<string, ElementType> = { path: Path, circle: Circle, rect: Rect, line: Line, ellipse: Ellipse };

function Ico({ node, size = 9.5, color = C.muted }: { node: IconNode; size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {node.map(([tag, attrs], i) =>
        createElement(SHAPES[tag], {
          key: i,
          ...attrs,
          fill: "none",
          stroke: color,
          strokeWidth: 2,
          strokeLinecap: "round",
          strokeLinejoin: "round",
        }),
      )}
    </Svg>
  );
}

function Badge({ icon, children, primary }: { icon: IconNode; children: ReactNode; primary?: boolean }) {
  const color = primary ? C.white : C.text;
  return (
    <View style={[s.badge, { backgroundColor: primary ? C.pine : C.secondary }]}>
      <Ico node={icon} size={8.25} color={color} />
      <Text style={[s.small, s.medium, { color }]}>{children}</Text>
    </View>
  );
}

function Stat({ icon, label, value, note, abbr }: { icon: IconNode; label: string; value: string; note: string; abbr?: string }) {
  return (
    <View style={[s.box, { flex: 1, padding: 11 }]}>
      <View style={[s.row, { gap: 4, minHeight: 14 }]}>
        <Ico node={icon} size={11} />
        <Text style={s.muted}>{label}</Text>
        {abbr && (
          <View style={{ marginLeft: "auto", paddingHorizontal: 4, borderWidth: 0.75, borderColor: C.border, borderRadius: 3 }}>
            <Text style={[s.small, s.medium, s.muted, { letterSpacing: 0.2 }]}>{abbr}</Text>
          </View>
        )}
      </View>
      <Text style={{ marginTop: 6, fontSize: 16.5, fontWeight: 600, lineHeight: 1.1 }}>{value}</Text>
      <Text style={[s.muted, { marginTop: 3 }]}>{note}</Text>
    </View>
  );
}

function CheckItem({ ok, title, text }: Omit<Check, "key">) {
  return (
    <View style={[s.box, { flex: 1, flexDirection: "row", gap: 7 }]}>
      <View style={{ marginTop: 0.5 }}>
        <Ico node={ok ? PDF_ICONS.circleCheck : PDF_ICONS.circleAlert} size={13} color={ok ? C.pine : C.suma} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.medium}>{title}</Text>
        <Text style={s.muted}>{text}</Text>
      </View>
    </View>
  );
}

/** Conservazione: una linea del tempo da oggi all'indietro, con un blocco per ogni periodo conservato. */
function Retention({ copy, plan, maxUnits }: { copy: Copy; plan: Plan; maxUnits: number }) {
  const list = tiers(copy, plan);
  if (!list.length) return <Text style={s.muted}>Conservazione non indicata</Text>;
  return (
    <View>
      <View style={[s.row, { gap: 6 }]}>
        <Text style={[s.small, s.muted]}>Oggi</Text>
        <View style={[s.row, { gap: 3 }]}>
          {list.map((t) => {
            const width = (blockUnits(t) / maxUnits) * TRACK;
            const color = TIER_COLOR[t.key];
            // Sotto i 2 punti i singoli blocchi non si distinguono più: resta una barra piena
            const solid = width < 2;
            const gap = width < 4 ? 0.5 : 1.5;
            return (
              <View
                key={t.key}
                style={{ flexDirection: "row", height: 8, width: t.count * width, gap: solid ? 0 : gap, borderRadius: 2, backgroundColor: solid ? color : undefined }}
              >
                {!solid &&
                  Array.from({ length: t.count }, (_, i) => (
                    <View key={i} style={{ flex: 1, borderRadius: Math.min(1.5, (width - gap) / 2), backgroundColor: color }} />
                  ))}
              </View>
            );
          })}
          <Text style={[s.small, s.muted, { marginLeft: 3 }]}>{reach(copy).text} fa</Text>
        </View>
      </View>

      <View style={{ marginTop: 11, flexDirection: "row", flexWrap: "wrap", columnGap: 14, rowGap: 4 }}>
        {list.map((t) => (
          <View key={t.key} style={{ flexDirection: "row", gap: 4 }}>
            <View style={{ marginTop: 2.25, width: 7, height: 7, borderRadius: 2, backgroundColor: TIER_COLOR[t.key] }} />
            <View>
              <Text style={[s.small, s.medium]}>{t.span}</Text>
              <Text style={[s.small, s.muted]}>{t.every}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function PlanCard({ plan, config, maxUnits }: { plan: Plan; config: Config; maxUnits: number }) {
  const workloads = config.workloads.filter((w) => plan.workloadIds.includes(w.id));
  const copies = plan.copies.flatMap((c) => {
    const dest = config.repositories.find((d) => d.id === c.repositoryId);
    return dest ? [{ copy: c, dest }] : [];
  });
  const best = copies.reduce((b, x) => (reach(x.copy).days > b.days ? reach(x.copy) : b), { days: 0, text: "—" });

  const destHeading = (
    <>
      <View style={{ height: 0.75, backgroundColor: C.border }} />
      <Text style={[s.heading, { marginTop: 14 }]}>Destinazioni</Text>
    </>
  );

  return (
    <View style={s.card}>
      {/* Titolo e numeri principali restano sulla stessa pagina, insieme all'inizio dei sistemi protetti */}
      <View wrap={false} minPresenceAhead={70}>
        <View style={[s.row, s.inset, { gap: 8, paddingBottom: 12, borderBottomWidth: 0.75, borderBottomColor: C.border }]}>
          <Text style={[s.cardTitle, { flex: 1 }]}>{plan.name || "Backup job"}</Text>
          <Badge icon={PDF_ICONS.refreshCw}>{frequencyText(plan)}</Badge>
        </View>
        <View style={[s.inset, { marginTop: 13, flexDirection: "row", gap: 8 }]}>
          <Stat icon={PDF_ICONS.clock} label="Perdita massima" value={rpoText(plan)} note="di lavoro, nel caso peggiore" abbr="RPO" />
          <Stat icon={PDF_ICONS.timer} label="Ripartenza" value={rtoText(plan)} note="per tornare operativi" abbr="RTO" />
          <Stat icon={PDF_ICONS.history} label="Storico" value={best.text} note="indietro nel tempo" />
        </View>
      </View>

      <View style={[s.inset, { marginTop: 14 }]}>
        <Text style={s.heading} minPresenceAhead={50}>
          Sistemi protetti
        </Text>
        {workloads.length === 0 && <Text style={s.muted}>Nessun workload selezionato</Text>}
        {/* Un riquadro per sistema: ogni riga resta intera sulla stessa pagina */}
        <View style={{ gap: TILE_GAP }}>
          {Array.from({ length: Math.ceil(workloads.length / TILE_COLUMNS) }, (_, r) => (
            <View key={r} wrap={false} style={{ flexDirection: "row", gap: TILE_GAP }}>
              {Array.from({ length: TILE_COLUMNS }, (_, i) => workloads[r * TILE_COLUMNS + i]).map((w, i) =>
                // L'ultima riga si completa con riquadri invisibili, così hanno tutti la stessa larghezza
                !w ? (
                  <View key={i} style={[s.tile, { borderColor: C.white }]} />
                ) : (
                  <View key={w.id} style={s.tile}>
                    <View style={s.tileIcon}>
                      <Ico node={WORKLOAD_ICON[w.type]} size={12.5} color={C.pine} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.medium, { fontSize: 11, lineHeight: 1.2 }]}>{w.name || "Senza nome"}</Text>
                      <Text style={[s.muted, { marginTop: 1 }]}>{w.note || WORKLOAD_TYPES[w.type]}</Text>
                    </View>
                  </View>
                ),
              )}
            </View>
          ))}
        </View>
      </View>

      <View style={[s.inset, { marginTop: 14 }]}>
        {copies.length === 0 && (
          <View wrap={false}>
            {destHeading}
            <Text style={s.muted}>Nessuna destinazione selezionata</Text>
          </View>
        )}
        {copies.map(({ copy, dest }, i) => (
          // Ogni destinazione resta intera: se non entra nella pagina passa alla successiva.
          // La prima porta con sé il titolo della sezione, che così non resta mai da solo a fine pagina.
          <View key={copy.id} wrap={false} style={{ marginTop: i ? 8 : 0 }}>
            {i === 0 && destHeading}
            <View style={{ padding: 11, borderWidth: 0.75, borderColor: C.border, borderRadius: 6 }}>
              <View style={[s.row, { gap: 6, marginBottom: 12 }]}>
                <Ico node={DEST_ICON[dest.type]} size={11} />
                <Text style={[s.medium, { fontSize: 11, lineHeight: 1.2 }]}>{dest.name || DEST_TYPES[dest.type].label}</Text>
                <Badge icon={dest.offsite ? PDF_ICONS.cloud : PDF_ICONS.mapPin}>{dest.offsite ? "Fuori sede" : "In sede"}</Badge>
                {dest.immutable && (
                  <Badge icon={PDF_ICONS.lock} primary>
                    Immutabile
                  </Badge>
                )}
              </View>
              <Retention copy={copy} plan={plan} maxUnits={maxUnits} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Spazio occupato dai backup, un repository per riga. Compare solo se il dato è stato inserito. */
function StorageCard({ config }: { config: Config }) {
  const list = storage(config);
  if (!list.length) return null;
  return (
    // La card resta intera sulla stessa pagina; solo con moltissimi repository si divide, una riga alla volta
    <View style={s.card} wrap={list.length > 10}>
      {list.map(({ repo, used, capacity, percent, state, note, alert }, i) => (
        // La prima riga porta con sé il titolo, che così non resta da solo a fine pagina
        <View key={repo.id} wrap={false}>
          {i === 0 && (
            <View style={[s.inset, { paddingBottom: 12, borderBottomWidth: 0.75, borderBottomColor: C.border }]}>
              <Text style={s.cardTitle}>Spazio occupato</Text>
            </View>
          )}
          <View style={[s.inset, { marginTop: i ? 16 : 13 }]}>
            <View style={[s.row, { gap: 6 }]}>
              <Ico node={DEST_ICON[repo.type]} size={11} />
              <Text style={[s.medium, { flex: 1, fontSize: 11, lineHeight: 1.2 }]}>{repo.name || DEST_TYPES[repo.type].label}</Text>
              <Text style={[s.medium, { fontSize: 11, lineHeight: 1.2 }]}>
                {used}
                <Text style={[s.muted, { fontWeight: 400 }]}> su {capacity}</Text>
              </Text>
            </View>
            {/* Senza capacità la barra resta vuota */}
            <View style={{ marginTop: 7, height: 8, borderRadius: 4, backgroundColor: C.surface }}>
              {percent !== undefined && (
                <View
                  style={{
                    width: `${Math.max(2, Math.min(100, percent))}%`,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: USAGE_COLOR[state].bar,
                  }}
                />
              )}
            </View>
            <View style={[s.row, { marginTop: 5, gap: 10 }]}>
              <Text style={[s.muted, { flex: 1 }]}>{note}</Text>
              {!!alert && <Text style={[s.medium, { color: USAGE_COLOR[state].tone }]}>{alert}</Text>}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export function ReportPdf({ config }: { config: Config }) {
  const { checks, score, level: levelKey } = protection(config);
  const level = LEVELS[levelKey];
  const maxUnits = retentionUnits(config);
  const date = dateText(config.date);
  const client = config.client || "Nome del cliente";

  return (
    <Document
      title={`Report Backup: ${client}`}
      author="UnitBit"
      subject="Report Backup"
      creator="UnitBit"
      producer="UnitBit"
      language="it"
    >
      <Page size="A4" style={s.page}>
        <View style={[s.row, { gap: 5 }]}>
          <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: C.viridis }} />
          <Text style={s.medium}>UnitBit</Text>
          <Text style={s.muted}>Report Backup</Text>
          <Text style={[s.muted, { marginLeft: "auto" }]}>{date}</Text>
        </View>
        <Text style={s.h1}>{client}</Text>

        <View style={[s.card, s.inset, { marginTop: 18 }]} wrap={false}>
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Text style={s.muted}>Livello di protezione</Text>
              <Text style={[s.cardTitle, { marginTop: 2, color: level.tone }]}>{LEVEL_TEXT[levelKey]}</Text>
            </View>
            <Text style={{ fontSize: 16.5, fontWeight: 600, lineHeight: 1.2 }}>
              {score}
              <Text style={s.muted}> su {checks.length}</Text>
            </Text>
          </View>
          <View style={{ marginTop: 12, flexDirection: "row", gap: 4 }}>
            {checks.map((c, i) => (
              <View key={c.key} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: i < score ? level.bar : C.surface }} />
            ))}
          </View>
          {/* Il primo controllo (copertura) occupa tutta la riga, gli altri quattro stanno in una griglia 2×2 */}
          <View style={{ marginTop: 12, gap: 8 }}>
            <View style={{ flexDirection: "row" }}>
              <CheckItem ok={checks[0].ok} title={checks[0].title} text={checks[0].text} />
            </View>
            {[checks.slice(1, 3), checks.slice(3, 5)].map((pair) => (
              <View key={pair[0].key} style={{ flexDirection: "row", gap: 8 }}>
                {pair.map((c) => (
                  <CheckItem key={c.key} ok={c.ok} title={c.title} text={c.text} />
                ))}
              </View>
            ))}
          </View>
        </View>

        {config.jobs.map((p) => (
          <PlanCard key={p.id} plan={p} config={config} maxUnits={maxUnits} />
        ))}

        <StorageCard config={config} />

        <Text style={[s.muted, { marginTop: 14 }]} wrap={false}>
          {GLOSSARY.map(([term, text]) => (
            <Text key={term}>
              <Text style={[s.medium, { color: C.text }]}>{term}:</Text> {text}.{" "}
            </Text>
          ))}
          Backup gestiti con Veeam.
        </Text>

        {/* Piè di pagina ripetuto su ogni foglio */}
        <View style={s.footer} fixed>
          <Text>UnitBit  ·  Report Backup</Text>
          <Text render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} di ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

/** Crea il file PDF del report. */
export function renderReportPdf(config: Config): Promise<Blob> {
  registerFonts();
  return pdf(<ReportPdf config={config} />).toBlob();
}
