import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarPlus } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { EventDialog, GoalDialog, btnGhost } from "@/components/Dialogs";
import { MONTHS_SHORT, cat, goalProgress, usePlanner, type Goal, type PlanEvent } from "@/lib/planner";

export const Route = createFileRoute("/tidslinje")({
  head: () => ({
    meta: [
      { title: "Tidslinje – Årsplan" },
      { name: "description", content: "Gantt-vy över årets projekt och deadlines. Dra för att boka om." },
      { property: "og:title", content: "Tidslinje – Årsplan" },
      { property: "og:description", content: "Gantt-vy över årets projekt och deadlines. Dra för att boka om." },
    ],
  }),
  component: Timeline,
});

type Drag = { kind: "goal"; id: string; offset: number } | { kind: "event"; id: string };

function Timeline() {
  const { goals, events, saveGoal, saveEvent } = usePlanner();
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [editG, setEditG] = useState<Goal | null>(null);
  const [editE, setEditE] = useState<PlanEvent | "new" | null>(null);
  const now = new Date().getMonth();

  const shift = (g: Goal, d: number) => {
    const len = g.end - g.start;
    const start = Math.max(0, Math.min(11 - len, g.start + d));
    saveGoal({ ...g, start, end: start + len });
  };
  const drop = (m: number) => {
    if (!drag) return;
    if (drag.kind === "goal") {
      const g = goals.find((x) => x.id === drag.id)!;
      shift(g, m - drag.offset - g.start);
    } else {
      const e = events.find((x) => x.id === drag.id)!;
      saveEvent({ ...e, month: m });
    }
    setDrag(null); setHover(null);
  };
  const sorted = [...goals].sort((a, b) => a.start - b.start || a.end - b.end);

  return (
    <>
      <PageHeader title="Tidslinje" sub="Dra staplar eller händelser till en ny månad – eller använd pilarna.">
        <button className={btnGhost} onClick={() => setEditE("new")}><CalendarPlus size={15} /> Händelse</button>
      </PageHeader>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[200px_repeat(12,1fr)] border-b text-xs font-medium text-muted-foreground">
            <div className="p-3">Mål</div>
            {MONTHS_SHORT.map((m, i) => (
              <div key={m} className={`p-3 text-center ${i % 3 === 0 ? "border-l" : ""} ${i === now ? "text-primary" : ""}`}>{m}</div>
            ))}
          </div>
          {sorted.map((g) => {
            const c = cat(g.category);
            return (
              <div key={g.id} className="grid grid-cols-[200px_repeat(12,1fr)] items-center border-b last:border-b-0">
                <button onClick={() => setEditG(g)} className="truncate p-3 text-left text-sm hover:text-primary">{g.title}</button>
                <div className="relative col-span-12 grid h-12 grid-cols-12">
                  {Array.from({ length: 12 }).map((_, m) => (
                    <div key={m} onDragOver={(e) => { e.preventDefault(); setHover(m); }} onDrop={() => drop(m)}
                      className={`h-full ${m % 3 === 0 ? "border-l" : ""} ${m === now ? "bg-primary/5" : ""} ${drag && hover === m ? "bg-primary/10" : ""}`} />
                  ))}
                  <div draggable
                    onDragStart={(e) => {
                      const r = e.currentTarget.getBoundingClientRect();
                      const off = Math.floor(((e.clientX - r.left) / r.width) * (g.end - g.start + 1));
                      setDrag({ kind: "goal", id: g.id, offset: off });
                    }}
                    onDragEnd={() => { setDrag(null); setHover(null); }}
                    className={`group absolute inset-y-2 flex cursor-grab items-center justify-between gap-1 overflow-hidden rounded-lg px-1 text-xs font-medium ${c.cls} ring-1 ring-current/20 active:cursor-grabbing ${drag?.kind === "goal" && drag.id === g.id ? "opacity-50" : ""}`}
                    style={{ left: `calc(${(g.start / 12) * 100}% + 3px)`, width: `calc(${((g.end - g.start + 1) / 12) * 100}% - 6px)`, pointerEvents: drag ? "none" : "auto" }}>
                    <button onClick={() => shift(g, -1)} className="rounded p-0.5 opacity-60 hover:opacity-100" aria-label="Flytta bakåt"><ChevronLeft size={14} /></button>
                    <span className="truncate">{goalProgress(g)}%</span>
                    <button onClick={() => shift(g, 1)} className="rounded p-0.5 opacity-60 hover:opacity-100" aria-label="Flytta framåt"><ChevronRight size={14} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <h2 className="mb-3 mt-10 font-display text-xl font-semibold">Händelser & deadlines</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {MONTHS_SHORT.map((m, i) => (
          <div key={m} onDragOver={(e) => { e.preventDefault(); setHover(i); }} onDrop={() => drop(i)}
            className={`min-h-28 rounded-xl border bg-card p-3 transition ${drag?.kind === "event" && hover === i ? "border-primary bg-primary/5" : ""}`}>
            <p className={`mb-2 text-xs font-semibold ${i === now ? "text-primary" : "text-muted-foreground"}`}>{m}</p>
            <div className="space-y-1.5">
              {events.filter((e) => e.month === i).sort((a, b) => a.day - b.day).map((e) => (
                <button key={e.id} draggable onDragStart={() => setDrag({ kind: "event", id: e.id })} onDragEnd={() => { setDrag(null); setHover(null); }}
                  onClick={() => setEditE(e)}
                  className={`block w-full cursor-grab truncate rounded-md px-2 py-1 text-left text-xs font-medium ${cat(e.category).cls}`}>
                  {e.day} · {e.title}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {editG && <GoalDialog goal={editG} onClose={() => setEditG(null)} />}
      {editE && <EventDialog event={editE === "new" ? undefined : editE} onClose={() => setEditE(null)} />}
    </>
  );
}
