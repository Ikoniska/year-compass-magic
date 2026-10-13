import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Printer } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { btnPrimary } from "@/components/Dialogs";
import { CATEGORIES, MONTHS, cat, goalProgress, statusLabel, usePlanner } from "@/lib/planner";

export const Route = createFileRoute("/_authenticated/rapport")({
  head: () => ({
    meta: [
      { title: "Exportera årsplan – Årsplan" },
      { name: "description", content: "Skriv ut eller spara din årsplan som PDF." },
      { property: "og:title", content: "Exportera årsplan – Årsplan" },
      { property: "og:description", content: "Skriv ut eller spara din årsplan som PDF." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Report,
});

const QUESTIONS: Record<string, string> = { good: "Vad gick bra?", improve: "Vad kan förbättras?", learn: "Lärdomar", next: "Fokus framåt" };

function Report() {
  const { goals, events, reflections } = usePlanner();
  const [opt, setOpt] = useState({ goals: true, events: true, refl: true });
  const year = new Date().getFullYear();
  const done = goals.filter((g) => g.status === "slutford").length;
  const avg = goals.length ? Math.round(goals.reduce((s, g) => s + goalProgress(g), 0) / goals.length) : 0;
  const reflKeys = [
    ...[0, 1, 2, 3].map((i) => ({ key: `q-${i}`, label: `Q${i + 1}` })),
    ...MONTHS.map((m, i) => ({ key: `m-${i}`, label: m })),
  ].filter(({ key }) => Object.values(reflections[key] ?? {}).some((v) => v?.trim()));
  const toggle = (k: keyof typeof opt, label: string) => (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={opt[k]} onChange={() => setOpt({ ...opt, [k]: !opt[k] })} className="accent-primary" /> {label}
    </label>
  );

  return (
    <>
      <div className="print:hidden">
        <PageHeader title="Exportera" sub="Välj innehåll och spara som PDF via utskriftsdialogen.">
          <button className={btnPrimary} onClick={() => { const d = document.documentElement; const was = d.classList.contains("dark"); d.classList.remove("dark"); window.print(); if (was) d.classList.add("dark"); }}><Printer size={16} /> Skriv ut / Spara som PDF</button>
        </PageHeader>
        <div className="mb-6 flex flex-wrap gap-5 rounded-xl border bg-card p-4">
          {toggle("goals", "Mål & delmål")}{toggle("events", "Händelser")}{toggle("refl", "Reflektioner")}
        </div>
        <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">Förhandsgranskning</p>
      </div>

      <article id="print-report" className="rounded-xl border bg-card p-6 md:p-10 print:rounded-none print:border-0 print:p-0">
        <header className="mb-8 border-b pb-6">
          <h1 className="font-display text-3xl font-semibold">Årsplan {year}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Exporterad {new Date().toLocaleDateString("sv-SE")}</p>
          <div className="mt-4 flex flex-wrap gap-6 text-sm">
            <span><b>{goals.length}</b> mål</span><span><b>{done}</b> slutförda</span><span><b>{avg}%</b> snittframsteg</span><span><b>{events.length}</b> händelser</span>
          </div>
        </header>

        {opt.goals && (
          <section className="mb-8">
            <h2 className="mb-4 font-display text-xl font-semibold">Mål per kvartal</h2>
            {[0, 1, 2, 3].map((q) => {
              const list = goals.filter((g) => Math.floor(g.start / 3) === q);
              if (!list.length) return null;
              return (
                <div key={q} className="mb-6 break-inside-avoid">
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Q{q + 1}</h3>
                  <div className="space-y-3">
                    {list.map((g) => (
                      <div key={g.id} className="break-inside-avoid rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 font-medium">
                            <span className={`h-2.5 w-2.5 rounded-full ${cat(g.category).dot}`} />{g.title}
                          </div>
                          <span className="text-xs text-muted-foreground">{statusLabel(g.status)} · {goalProgress(g)}%</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{cat(g.category).label} · {MONTHS[g.start]}–{MONTHS[g.end]}</p>
                        {g.milestones.length > 0 && (
                          <ul className="mt-2 space-y-0.5 text-sm">
                            {g.milestones.map((m) => <li key={m.id}>{m.done ? "☑" : "☐"} {m.title}</li>)}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              {CATEGORIES.map((c) => <span key={c.id} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${c.dot}`} />{c.label}</span>)}
            </div>
          </section>
        )}

        {opt.events && events.length > 0 && (
          <section className="mb-8 break-inside-avoid">
            <h2 className="mb-4 font-display text-xl font-semibold">Händelser & milstolpar</h2>
            <ul className="divide-y text-sm">
              {[...events].sort((a, b) => a.month - b.month || a.day - b.day).map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-2">
                  <span className="w-24 shrink-0 text-muted-foreground">{e.day} {MONTHS[e.month].toLowerCase()}</span>
                  <span className={`h-2 w-2 rounded-full ${cat(e.category).dot}`} />{e.title}
                </li>
              ))}
            </ul>
          </section>
        )}

        {opt.refl && reflKeys.length > 0 && (
          <section>
            <h2 className="mb-4 font-display text-xl font-semibold">Reflektioner</h2>
            <div className="space-y-5">
              {reflKeys.map(({ key, label }) => (
                <div key={key} className="break-inside-avoid">
                  <h3 className="mb-1 font-semibold">{label}</h3>
                  {Object.entries(reflections[key]).filter(([, v]) => v?.trim()).map(([q, v]) => (
                    <p key={q} className="text-sm"><span className="text-muted-foreground">{QUESTIONS[q] ?? q}: </span>{v}</p>
                  ))}
                </div>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}
