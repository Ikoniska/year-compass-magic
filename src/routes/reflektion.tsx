import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { MONTHS, usePlanner } from "@/lib/planner";

export const Route = createFileRoute("/reflektion")({
  head: () => ({
    meta: [
      { title: "Reflektion – Årsplan" },
      { name: "description", content: "Reflektera över varje månad och kvartal med färdiga frågor." },
      { property: "og:title", content: "Reflektion – Årsplan" },
      { property: "og:description", content: "Reflektera över varje månad och kvartal med färdiga frågor." },
    ],
  }),
  component: Reflection,
});

const QUESTIONS = [
  { id: "good", q: "Vad gick bra?" },
  { id: "improve", q: "Vad kan förbättras?" },
  { id: "learn", q: "Lärdomar" },
  { id: "next", q: "Fokus framåt" },
];

function Reflection() {
  const { reflections, setReflection } = usePlanner();
  const [mode, setMode] = useState<"m" | "q">("m");
  const [sel, setSel] = useState(new Date().getMonth());
  const items = mode === "m" ? MONTHS : ["Q1", "Q2", "Q3", "Q4"];
  const idx = Math.min(sel, items.length - 1);
  const key = `${mode}-${idx}`;
  const filled = (k: string) => Object.values(reflections[k] ?? {}).some((v) => v.trim());

  return (
    <>
      <PageHeader title="Reflektion" sub="Stanna upp, se tillbaka och justera kursen." />
      <div className="mb-5 inline-flex rounded-lg border bg-card p-1 text-sm">
        {(["m", "q"] as const).map((m) => (
          <button key={m} onClick={() => { setMode(m); setSel(m === "q" ? Math.floor(new Date().getMonth() / 3) : new Date().getMonth()); }}
            className={`rounded-md px-4 py-1.5 font-medium transition ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {m === "m" ? "Månad" : "Kvartal"}
          </button>
        ))}
      </div>
      <div className="mb-8 flex gap-2 overflow-x-auto pb-1">
        {items.map((it, i) => (
          <button key={it} onClick={() => setSel(i)}
            className={`relative whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${idx === i ? "bg-foreground text-background ring-transparent" : "text-muted-foreground ring-border hover:text-foreground"}`}>
            {mode === "m" ? it.slice(0, 3) : it}
            {filled(`${mode}-${i}`) && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary" />}
          </button>
        ))}
      </div>
      <h2 className="mb-4 font-display text-2xl font-semibold">{mode === "m" ? items[idx] : `${items[idx]} · ${MONTHS[idx * 3]} – ${MONTHS[idx * 3 + 2]}`}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {QUESTIONS.map(({ id, q }) => (
          <label key={id} className="block rounded-2xl border bg-card p-5 focus-within:ring-2 focus-within:ring-ring">
            <span className="mb-2 block font-display font-semibold">{q}</span>
            <textarea rows={4} value={reflections[key]?.[id] ?? ""} onChange={(e) => setReflection(key, id, e.target.value)}
              placeholder="Skriv dina tankar…" className="w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground" />
          </label>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Sparas automatiskt.</p>
    </>
  );
}
