"use client";

import { Dispatch, ReactNode, SetStateAction, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Field as FieldRoot, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberField } from "@/components/ui/number-field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Config,
  Copy,
  DEST_TYPES,
  DestType,
  Destination,
  NO_SIZE,
  Plan,
  SIZE_UNITS,
  SizeUnit,
  TIME_UNITS,
  TimeUnit,
  WORKLOAD_TYPES,
  Workload,
  WorkloadType,
  uid,
} from "@/lib/model";
import { DEST_ICON, Icon, WORKLOAD_ICON } from "@/lib/icons";

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="px-5 py-5">
      <h2 className="font-heading text-[1.75rem] leading-snug font-semibold tracking-tight">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <FieldRoot className="min-w-0 gap-1.5">
    <FieldLabel className="text-muted-foreground">{label}</FieldLabel>
    {children}
  </FieldRoot>
);

/** Select di shadcn con le opzioni passate come coppie valore → etichetta. */
function Pick<T extends string>({
  value,
  onChange,
  options,
  icons,
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Record<string, string>;
  /** Icona mostrata accanto a ogni voce, per valore. */
  icons?: Record<string, Icon>;
  label?: string;
  className?: string;
}) {
  const items = Object.entries(options).map(([value, text]) => {
    const I = icons?.[value];
    const label = I ? (
      <span className="flex min-w-0 items-center gap-1.5">
        <I className="text-muted-foreground" />
        <span className="truncate">{text}</span>
      </span>
    ) : (
      text
    );
    return { value, label };
  });
  return (
    <Select items={items} value={value} onValueChange={(v) => v && onChange(v as T)}>
      <SelectTrigger aria-label={label} className={`w-full min-w-0 bg-card ${className ?? ""}`}>
        <SelectValue />
      </SelectTrigger>
      {/* L'elenco si apre sotto il campo e si allarga se le voci sono più lunghe */}
      <SelectContent alignItemWithTrigger={false} align="start" className="w-auto min-w-(--anchor-width)">
        <SelectGroup>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

const labels = <T extends { label: string }>(map: Record<string, T>) => Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v.label]));

const Add = ({ onClick, children }: { onClick: () => void; children: ReactNode }) => (
  <Button variant="outline" size="sm" className="mt-3" onClick={onClick}>
    <Plus /> {children}
  </Button>
);

const Remove = ({ onClick, title }: { onClick: () => void; title: string }) => (
  <Button variant="ghost" size="icon" title={title} aria-label={title} onClick={onClick} className="text-muted-foreground hover:text-destructive">
    <X />
  </Button>
);

function Num({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <Field label={label}>
      <NumberField aria-label={label} value={value} onValueChange={onChange} />
    </Field>
  );
}

const parseSize = (text: string) => {
  const n = parseFloat(text.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Dimensione facoltativa: un numero, anche con i decimali (virgola o punto), unito alla sua unità di misura.
 * Il campo vuoto vale zero, cioè "non indicato".
 */
function Size({
  label,
  value,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  unit: SizeUnit;
  onChange: (value: number, unit: SizeUnit) => void;
}) {
  const [text, setText] = useState("");
  // Mentre si scrive resta il testo digitato ("3," prima di "3,2"); se il valore cambia da fuori si mostra quello
  const shown = parseSize(text) === value ? text : value ? String(value).replace(".", ",") : "";
  return (
    <Field label={label}>
      <ButtonGroup className="w-full">
        <Input
          aria-label={label}
          inputMode="decimal"
          className="min-w-0 tabular-nums"
          value={shown}
          onChange={(e) => {
            const typed = e.target.value.replace(/[^\d.,]/g, "");
            setText(typed);
            onChange(parseSize(typed), unit);
          }}
        />
        <Pick label={`${label}: unità di misura`} className="flex-none basis-[72px]" value={unit} options={SIZE_UNITS} onChange={(u: SizeUnit) => onChange(value, u)} />
      </ButtonGroup>
    </Field>
  );
}

export default function Editor({ config, setConfig }: { config: Config; setConfig: Dispatch<SetStateAction<Config>> }) {
  const set = (patch: Partial<Config>) => setConfig((c) => ({ ...c, ...patch }));
  const patchIn = <T extends { id: string }>(list: T[], id: string, patch: Partial<T>) => list.map((x) => (x.id === id ? { ...x, ...patch } : x));

  const setWorkload = (id: string, p: Partial<Workload>) => set({ workloads: patchIn(config.workloads, id, p) });
  const setDest = (id: string, p: Partial<Destination>) => set({ repositories: patchIn(config.repositories, id, p) });
  const setPlan = (id: string, p: Partial<Plan>) => set({ jobs: patchIn(config.jobs, id, p) });
  const setCopy = (plan: Plan, id: string, p: Partial<Copy>) => setPlan(plan.id, { copies: patchIn(plan.copies, id, p) });

  const removeWorkload = (id: string) =>
    set({
      workloads: config.workloads.filter((w) => w.id !== id),
      jobs: config.jobs.map((p) => ({ ...p, workloadIds: p.workloadIds.filter((x) => x !== id) })),
    });
  const removeDest = (id: string) =>
    set({
      repositories: config.repositories.filter((d) => d.id !== id),
      jobs: config.jobs.map((p) => ({ ...p, copies: p.copies.filter((c) => c.repositoryId !== id) })),
    });

  const workloadCols = "grid grid-cols-[1fr_150px_1fr_32px] gap-2";
  const head = "text-sm font-medium text-muted-foreground";

  return (
    <div>
      <Section title="Cliente">
        <div className="grid grid-cols-[1fr_150px] gap-2">
          <Field label="Nome">
            <Input value={config.client} onChange={(e) => set({ client: e.target.value })} />
          </Field>
          <Field label="Data">
            <DatePicker aria-label="Data" value={config.date} onValueChange={(date) => set({ date })} />
          </Field>
        </div>
      </Section>
      <Separator />

      <Section title="Inventory" hint="Server, macchine virtuali e PC che contengono dati.">
        {config.workloads.length > 0 && (
          <div className={`${workloadCols} mb-1.5 ${head}`}>
            <span>Nome</span>
            <span>Tipo</span>
            <span>Descrizione</span>
          </div>
        )}
        <div className="grid gap-2">
          {config.workloads.map((w) => (
            <div key={w.id} className={workloadCols}>
              <Input aria-label="Nome del workload" value={w.name} onChange={(e) => setWorkload(w.id, { name: e.target.value })} />
              <Pick label="Tipo di workload" value={w.type} options={WORKLOAD_TYPES} icons={WORKLOAD_ICON} onChange={(type: WorkloadType) => setWorkload(w.id, { type })} />
              <Input aria-label="Descrizione" value={w.note} onChange={(e) => setWorkload(w.id, { note: e.target.value })} />
              <Remove title="Rimuovi il workload" onClick={() => removeWorkload(w.id)} />
            </div>
          ))}
        </div>
        <Add onClick={() => set({ workloads: [...config.workloads, { id: uid(), name: "", type: "vm", note: "" }] })}>Aggiungi workload</Add>
      </Section>
      <Separator />

      <Section title="Backup Repositories" hint="I luoghi in cui vengono salvate le copie. Lo spazio è facoltativo.">
        <div className="grid gap-3">
          {config.repositories.map((d) => (
            // Una scheda per repository, come per i job: prima cos'è, poi com'è protetto, poi quanto è pieno
            <Card key={d.id} size="sm">
              <CardContent className="grid gap-3">
                <div className="grid grid-cols-[1fr_180px_32px] items-end gap-2">
                  <Field label="Nome">
                    <Input className="font-medium" value={d.name} onChange={(e) => setDest(d.id, { name: e.target.value })} />
                  </Field>
                  <Field label="Tipo">
                    <Pick
                      label="Tipo di repository"
                      value={d.type}
                      options={labels(DEST_TYPES)}
                      icons={DEST_ICON}
                      onChange={(type: DestType) => {
                        // I flag scelti a mano restano: il tipo li può solo attivare (es. il Vault è sempre fuori sede e immutabile)
                        const def = DEST_TYPES[type];
                        setDest(d.id, { type, offsite: d.offsite || def.offsite, immutable: d.immutable || def.immutable });
                      }}
                    />
                  </Field>
                  <Remove title="Rimuovi il repository" onClick={() => removeDest(d.id)} />
                </div>
                <div className="flex gap-5">
                  <Label>
                    <Checkbox checked={d.offsite} onCheckedChange={(v) => setDest(d.id, { offsite: v === true })} />
                    Fuori sede
                  </Label>
                  <Label>
                    <Checkbox checked={d.immutable} onCheckedChange={(v) => setDest(d.id, { immutable: v === true })} />
                    Immutabile
                  </Label>
                </div>
                {/* Ogni valore ha la sua unità; la colonna a destra resta libera come nella prima riga */}
                <div className="grid grid-cols-2 gap-2 pr-10">
                  <Size
                    label="Spazio occupato"
                    value={d.usedValue}
                    unit={d.usedUnit}
                    onChange={(usedValue, usedUnit) => setDest(d.id, { usedValue, usedUnit })}
                  />
                  <Size
                    label="Capacità"
                    value={d.capacityValue}
                    unit={d.capacityUnit}
                    onChange={(capacityValue, capacityUnit) => setDest(d.id, { capacityValue, capacityUnit })}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Add
          onClick={() =>
            set({
              repositories: [...config.repositories, { id: uid(), name: "", type: "nas", offsite: false, immutable: false, ...NO_SIZE }],
            })
          }
        >
          Aggiungi repository
        </Add>
      </Section>
      <Separator />

      <Section title="Backup Jobs" hint="Un job è un gruppo di workload salvati con le stesse regole.">
        <div className="grid gap-3">
          {config.jobs.map((p) => (
            <Card key={p.id} size="sm">
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-[1fr_32px] items-end gap-2">
                  <Field label="Nome">
                    <Input className="font-medium" value={p.name} onChange={(e) => setPlan(p.id, { name: e.target.value })} />
                  </Field>
                  <Remove title="Rimuovi il job" onClick={() => set({ jobs: config.jobs.filter((x) => x.id !== p.id) })} />
                </div>

                <Field label="Workloads">
                  {config.workloads.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aggiungi prima un workload</p>
                  ) : (
                    <ToggleGroup multiple variant="outline" size="sm" className="flex-wrap" value={p.workloadIds} onValueChange={(ids) => setPlan(p.id, { workloadIds: ids as string[] })}>
                      {config.workloads.map((w) => (
                        <ToggleGroupItem key={w.id} value={w.id} className="aria-pressed:border-primary/40 aria-pressed:bg-accent aria-pressed:text-primary">
                          {w.name || "Senza nome"}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  )}
                </Field>

                <div className="grid grid-cols-2 gap-2">
                  <Field label="RPO (frequenza)">
                    <div className="grid grid-cols-[112px_1fr] gap-2">
                      <NumberField min={1} aria-label="RPO" value={p.rpoValue} onValueChange={(rpoValue) => setPlan(p.id, { rpoValue })} />
                      <Pick label="Unità di tempo dell'RPO" value={p.rpoUnit} options={TIME_UNITS} onChange={(rpoUnit: TimeUnit) => setPlan(p.id, { rpoUnit })} />
                    </div>
                  </Field>
                  <Field label="RTO (tempo di ripartenza)">
                    <div className="grid grid-cols-[112px_1fr] gap-2">
                      <NumberField min={1} aria-label="RTO" value={p.rtoValue} onValueChange={(rtoValue) => setPlan(p.id, { rtoValue })} />
                      <Pick label="Unità di tempo dell'RTO" value={p.rtoUnit} options={TIME_UNITS} onChange={(rtoUnit: TimeUnit) => setPlan(p.id, { rtoUnit })} />
                    </div>
                  </Field>
                </div>

                <div>
                  <p className={head}>Storage</p>
                  {p.copies.map((c) => (
                    <div key={c.id} className="mt-2 grid gap-2 rounded-lg bg-muted p-3">
                      <div className="grid grid-cols-[1fr_32px] gap-2">
                        <Pick
                          label="Repository associato"
                          value={c.repositoryId}
                          options={Object.fromEntries(config.repositories.map((d) => [d.id, d.name || "Senza nome"]))}
                          onChange={(repositoryId) => setCopy(p, c.id, { repositoryId })}
                        />
                        <Remove title="Rimuovi il repository dal job" onClick={() => setPlan(p.id, { copies: p.copies.filter((x) => x.id !== c.id) })} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Num label="Giorni" value={c.days} onChange={(days) => setCopy(p, c.id, { days })} />
                        <Num label="Settimane" value={c.weekly} onChange={(weekly) => setCopy(p, c.id, { weekly })} />
                        <Num label="Mesi" value={c.monthly} onChange={(monthly) => setCopy(p, c.id, { monthly })} />
                        <Num label="Anni" value={c.yearly} onChange={(yearly) => setCopy(p, c.id, { yearly })} />
                      </div>
                    </div>
                  ))}
                  {config.repositories.length > 0 ? (
                    <Add
                      onClick={() =>
                        setPlan(p.id, {
                          copies: [
                            ...p.copies,
                            {
                              id: uid(),
                              repositoryId: config.repositories.find((d) => !p.copies.some((c) => c.repositoryId === d.id))?.id ?? config.repositories[0].id,
                              days: 7,
                              weekly: 0,
                              monthly: 0,
                              yearly: 0,
                            },
                          ],
                        })
                      }
                    >
                      Associa repository
                    </Add>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">Aggiungi prima un repository</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Add
          onClick={() =>
            set({
              jobs: [...config.jobs, { id: uid(), name: "", workloadIds: [], rpoValue: 24, rpoUnit: "ore", rtoValue: 4, rtoUnit: "ore", copies: [] }],
            })
          }
        >
          Aggiungi job
        </Add>
      </Section>
    </div>
  );
}
