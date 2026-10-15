import { useEffect, useState } from "react";
import { AlertTriangle, BatteryCharging } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MONTHS, usePlanner } from "@/lib/planner";

export const LEVELS = [
  { id: "expansion", label: "Hög expansion", icon: "🚀", limit: 6, cls: "bg-primary/15 text-primary" },
  { id: "konsolidering", label: "Konsolidering", icon: "⚖️", limit: 4, cls: "bg-muted text-foreground" },
  { id: "aterhamtning", label: "Återhämtning", icon: "🌿", limit: 2, cls: "bg-cat-halsa/15 text-cat-halsa" },
] as const;
type Level = (typeof LEVELS)[number]["id"];
const lvl = (id: string) => LEVELS.find((l) => l.id === id) ?? LEVELS[1];

export function EnergyPlanner() {
  const { goals, events } = usePlanner();
  const year = new Date().getFullYear();
  const [energy, setEnergy] = useState<Record<number, Level>>({});

  useEffect(() => {
    supabase.from("quarter_energy").select("quarter,level").eq("year", year)
      .then(({ data }) => setEnergy(Object.fromEntries((data ?? []).map((x) => [x.quarter, x.level as Level]))));
  }, [year]);

  const set = async (q: number, level: Level) => {
    setEnergy((e) => ({ ...e, [q]: level }));
    const { data } = await supabase.auth.getUser();
    if (data.user) await supabase.from("quarter_energy").upsert({ user_id: data.user.id, year, quarter: q, level });
  };

  // Belastning: aktiva mål (vanor väger extra) + händelser per månad
  const load = MONTHS.map((_, m) =>
    goals.filter((g) => g.status !== "slutford" && g.start <= m && g.end >= m).reduce((s, g) => s + 1 + (g.habit ? 0.5 : 0), 0)
    + events.filter((e) => e.month === m).length * 0.5);
  const warnings = load.map((v, m) => ({ m, v, l: lvl(energy[Math.floor(m / 3)] ?? "konsolidering") })).filter((x) => x.v > x.l.limit);

  return (
    <section className="mb-6 rounded-2xl border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <BatteryCharging size={16} className="text-primary" />
        <h2 className="font-display text-lg font-semibold">Energi & kapacitet {year}</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((q) => {
          const cur = lvl(energy[q] ?? "konsolidering");
          return (
            <div key={q} className="rounded-xl border p-3">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Q{q + 1}</p>
              <div className="flex flex-col gap-1">
                {LEVELS.map((l) => (
                  <button key={l.id} onClick={() => set(q, l.id)}
                    className={`rounded-md px-2 py-1 text-left text-xs font-medium transition ${cur.id === l.id ? l.cls + " ring-1 ring-current/30" : "text-muted-foreground hover:bg-muted"}`}>
                    {l.icon} {l.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-1">
                {[0, 1, 2].map((i) => {
                  const m = q * 3 + i, pct = Math.min(100, (load[m]! / cur.limit) * 100);
                  return (
                    <div key={m} className="flex-1" title={`${MONTHS[m]}: belastning ${load[m]}`}>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className={`h-full rounded-full ${pct >= 100 ? "bg-destructive" : pct > 75 ? "bg-cat-ekonomi" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground">{MONTHS[m]!.slice(0, 3)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {warnings.length > 0 && (
        <div className="mt-4 space-y-2">
          {warnings.map((w) => (
            <p key={w.m} className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              Hög planerad belastning i {MONTHS[w.m]!.toLowerCase()} under en period med {w.l.label.toLowerCase()}. Överväg att sprida ut deadlines för att orka hela vägen.
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
