import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, CalendarPlus, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { EventDialog, GoalDialog, btnGhost, btnPrimary } from "@/components/Dialogs";
import { MONTHS, cat, goalProgress, usePlanner } from "@/lib/planner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Översikt – Årsplan" },
      { name: "description", content: "Se hela ditt år, kvartal för kvartal, och följ dina mål." },
      { property: "og:title", content: "Översikt – Årsplan" },
      { property: "og:description", content: "Se hela ditt år, kvartal för kvartal, och följ dina mål." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { goals, events } = usePlanner();
  const [dlg, setDlg] = useState<"goal" | "event" | null>(null);
  const done = goals.filter((g) => g.status === "slutford").length;
  const pct = goals.length ? Math.round((done / goals.length) * 100) : 0;
  const avg = goals.length ? Math.round(goals.reduce((s, g) => s + goalProgress(g), 0) / goals.length) : 0;
  const now = new Date().getMonth();
  const yearPct = Math.round(((now + new Date().getDate() / 31) / 12) * 100);

  return (
    <>
      <PageHeader title={`Ditt år ${new Date().getFullYear()}`} sub="Allt du vill uppnå, på ett ställe.">
        <button className={btnGhost} onClick={() => setDlg("event")}><CalendarPlus size={15} /> Händelse</button>
        <button className={btnPrimary} onClick={() => setDlg("goal")}><Plus size={15} /> Nytt mål</button>
      </PageHeader>

      <section className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-card p-6 md:col-span-2">
          <div className="flex items-baseline justify-between">
            <p className="text-sm text-muted-foreground">Avklarade mål</p>
            <p className="font-display text-3xl font-semibold">{done}<span className="text-lg text-muted-foreground">/{goals.length}</span></p>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-gradient-primary transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-3 flex justify-between text-xs text-muted-foreground">
            <span>{pct}% slutförda · {avg}% snittframsteg</span><span>{yearPct}% av året har gått</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Stat label="Pågående" value={goals.filter((g) => g.status === "inledd" || g.status === "halvvags").length} />
          <Stat label="Händelser" value={events.length} />
        </div>
      </section>

      <div className="space-y-8">
        {[0, 1, 2, 3].map((q) => (
          <section key={q}>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <span className="rounded-md bg-muted px-2 py-0.5 font-display text-foreground">Q{q + 1}</span>
              {MONTHS[q * 3]} – {MONTHS[q * 3 + 2]}
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((i) => {
                const m = q * 3 + i;
                const mg = goals.filter((g) => g.end === m);
                const me = events.filter((e) => e.month === m).sort((a, b) => a.day - b.day);
                const active = goals.filter((g) => g.start <= m && g.end >= m).length;
                return (
                  <div key={m} className={`min-h-36 rounded-xl border bg-card p-4 transition hover:shadow-soft ${m === now ? "ring-2 ring-primary/60" : ""}`}>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-display font-semibold">{MONTHS[m]}</h3>
                      <span className="text-xs text-muted-foreground">{active} aktiva</span>
                    </div>
                    <ul className="space-y-1.5 text-sm">
                      {mg.map((g) => (
                        <li key={g.id} className="flex items-center gap-2">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${cat(g.category).dot}`} />
                          <span className={`truncate ${g.status === "slutford" ? "text-muted-foreground line-through" : ""}`}>{g.title}</span>
                        </li>
                      ))}
                      {me.map((e) => (
                        <li key={e.id} className="flex items-center gap-2 text-muted-foreground">
                          <span className="w-5 shrink-0 text-xs tabular-nums">{e.day}</span><span className="truncate">{e.title}</span>
                        </li>
                      ))}
                      {!mg.length && !me.length && <li className="text-xs text-muted-foreground">Inget planerat</li>}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <Link to="/tidslinje" className="mt-8 inline-flex items-center gap-1 text-sm font-medium text-primary">Öppna tidslinjen <ArrowRight size={14} /></Link>
      {dlg === "goal" && <GoalDialog onClose={() => setDlg(null)} />}
      {dlg === "event" && <EventDialog onClose={() => setDlg(null)} />}
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
    </div>
  );
}
