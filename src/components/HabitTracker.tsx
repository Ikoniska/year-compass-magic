import { useEffect, useState } from "react";
import { Repeat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cat, usePlanner } from "@/lib/planner";

const DAYS = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function weekDays() {
  const now = new Date();
  const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return iso(d); });
}

export function HabitTracker() {
  const { goals } = usePlanner();
  const habits = goals.filter((g) => g.habit && (g.habitTarget ?? 0) > 0 && g.status !== "slutford");
  const days = weekDays();
  const today = iso(new Date());
  const [logs, setLogs] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.from("habit_logs").select("goal_id,day").gte("day", days[0]!).lte("day", days[6]!)
      .then(({ data }) => setLogs(new Set((data ?? []).map((x) => `${x.goal_id}|${x.day}`))));
  }, []);

  const toggle = async (goalId: string, day: string) => {
    const k = `${goalId}|${day}`;
    const on = logs.has(k);
    setLogs((s) => { const n = new Set(s); on ? n.delete(k) : n.add(k); return n; });
    if (on) await supabase.from("habit_logs").delete().eq("goal_id", goalId).eq("day", day);
    else await supabase.from("habit_logs").insert({ goal_id: goalId, day });
  };

  if (!habits.length) return null;
  return (
    <section className="mb-8 rounded-2xl border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <Repeat size={16} className="text-primary" />
        <h2 className="font-display text-lg font-semibold">Mikrovanor denna vecka</h2>
      </div>
      <div className="space-y-4">
        {habits.map((g) => {
          const n = days.filter((d) => logs.has(`${g.id}|${d}`)).length;
          const t = g.habitTarget ?? 0;
          return (
            <div key={g.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{g.habit}</p>
                <p className="truncate text-xs text-muted-foreground"><span className={`mr-1.5 inline-block size-2 rounded-full ${cat(g.category).dot}`} />{g.title} · {n}/{t} dagar {n >= t ? "✓" : ""}</p>
              </div>
              <div className="flex gap-1">
                {days.map((d, i) => {
                  const on = logs.has(`${g.id}|${d}`);
                  return (
                    <button key={d} onClick={() => toggle(g.id, d)} title={d} disabled={d > today}
                      className={`h-8 w-9 rounded-md text-[11px] font-medium transition disabled:opacity-30 ${on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-primary/15"} ${d === today ? "ring-2 ring-primary/40" : ""}`}>
                      {DAYS[i]}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
