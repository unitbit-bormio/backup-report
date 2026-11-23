"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileDown, FilePlus, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Config, emptyConfig, normalize, sampleConfig } from "@/lib/model";
import Editor from "./Editor";
import Report from "./Report";

const KEY = "backup-report-v1";

function load(): Config {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {}
  return sampleConfig();
}

/** Fa scaricare un file creato nel browser. */
function saveFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const onGreen = "text-primary-foreground hover:bg-white/15 hover:text-primary-foreground";

export default function App() {
  const [config, setConfig] = useState<Config>(load);
  const [creatingPdf, setCreatingPdf] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(config));
    } catch {}
  }, [config]);

  const exportJson = () =>
    saveFile(
      new Blob([JSON.stringify(config, null, 2)], { type: "application/json" }),
      `backup-${(config.client || "cliente").replace(/[^\w-]+/g, "_")}.json`,
    );

  // Il PDF è un documento A4 costruito a parte (ReportPdf), non la stampa della pagina.
  // La libreria che lo crea è pesante: si carica solo al primo clic.
  const exportPdf = async () => {
    setCreatingPdf(true);
    try {
      const { renderReportPdf } = await import("./ReportPdf");
      const client = config.client.replace(/[\\/:*?"<>|]+/g, " ").trim();
      saveFile(await renderReportPdf(config), `Report Backup${client ? ` - ${client}` : ""}.pdf`);
    } catch {
      window.alert("Non è stato possibile creare il PDF. Riprova.");
    } finally {
      setCreatingPdf(false);
    }
  };

  const importJson = async (file?: File) => {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const repositories = data.repositories ?? data.destinations;
      const jobs = data.jobs ?? data.plans;
      if (!Array.isArray(data.workloads) || !Array.isArray(repositories) || !Array.isArray(jobs)) throw new Error();
      setConfig(normalize(data));
    } catch {
      window.alert("File non valido: apri un file salvato da questa app.");
    }
  };

  return (
    <div className="min-h-dvh">
      <header className="no-print sticky top-0 z-10 flex h-12 items-center gap-1 bg-primary px-4 text-primary-foreground">
        <p className="mr-auto font-heading text-base font-semibold">Report Backup</p>
        <Button
          variant="ghost"
          className={`${onGreen} max-md:hidden`}
          onClick={() => window.confirm("Svuotare tutti i dati inseriti?") && setConfig(emptyConfig())}
        >
          <FilePlus /> Nuovo cliente
        </Button>
        <Button variant="ghost" className={`${onGreen} max-md:hidden`} onClick={() => fileRef.current?.click()}>
          <FolderOpen /> Apri un file
        </Button>
        <Button variant="ghost" className={onGreen} onClick={exportJson}>
          <Download /> Salva i dati
        </Button>
        <Button variant="secondary" className="ml-1 bg-white hover:bg-white/90" disabled={creatingPdf} onClick={exportPdf}>
          <FileDown /> {creatingPdf ? "Creazione…" : "Scarica PDF"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            importJson(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </header>

      <div className="lg:grid lg:grid-cols-[500px_1fr] print:block">
        <aside className="no-print bg-card lg:sticky lg:top-12 lg:h-[calc(100dvh-48px)] lg:overflow-y-auto lg:border-r">
          <Editor config={config} setConfig={setConfig} />
        </aside>
        <main className="min-w-0 overflow-x-auto p-4 md:p-8 print:p-0">
          <Report config={config} />
        </main>
      </div>
    </div>
  );
}
