import { useEffect, useState } from "react";
import { Target, Plus, X, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cat, usePlanner } from "@/lib/planner";

type Item = { goalId: string; milestoneId: string };

export function isoWeek(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t.getTime() - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return { year: y, week: w, key: `${y}-W${String(w).padStart(2, "0")}` };
}

export function WeeklyFocus() {
  const { goals, saveGoal } = usePlanner();
  const { week, key } = isoWeek();
  const [items, setItems] = useState<Item[]>([]);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    supabase.from("weekly_focus").select("items").eq("week_key", key).maybeSingle()
      .then(({ data }) => setItems((data?.items as Item[] | undefined) ?? []));
  }, [key]);

  const persist = async (next: Item[]) => {
    setItems(next);
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const { error } = await supabase.from("weekly_focus").upsert({ user_id: data.user.id, week_key: key, items: next as never, updated_at: new Date().toISOString() });
    if (error) toast.error("Kunde inte spara veckans fokus.");
  };

  const resolved = items.map((it) => {
    const g = goals.find((x) => x.id === it.goalId);
    const m = g?.milestones.find((x) => x.id === it.milestoneId);
    return g && m ? { it, g, m } : null;
  }).filter((x): x is NonNullable<typeof x> => !!x);

  const toggle = (gid: string, mid: string) => {
    const g = goals.find((x) => x.id === gid);
    if (g) saveGoal({ ...g, milestones: g.milestones.map((m) => (m.id === mid ? { ...m, done: !m.done } : m)) });
  };

  const options = goals.flatMap((g) => g.milestones.filter((m) => !m.done && !items.some((i) => i.milestoneId === m.id)).map((m) => ({ g, m })));
  const doneCount = resolved.filter((r) => r.m.done).length;

  return (
    <section className="mb-8 rounded-2xl border bg-card p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"><Target size={18} /></span>
          <div>
            <h2 className="font-display text-lg font-semibold">Veckans fokus · v. {week}</h2>
            <p className="text-xs text-muted-foreground">Välj 1–3 delmål som är viktigast just nu. {resolved.length > 0 && `${doneCount}/${resolved.length} klara.`}</p>
          </div>
        </div>
        {resolved.length < 3 && options.length > 0 && (
          <button onClick={() => setPicking((p) => !p)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted">
            <Plus size={14} /> Välj delmål
          </button>
        )}
      </div>

      {resolved.length === 0 && !picking && <p className="text-sm text-muted-foreground">Inget fokus valt ännu för den här veckan.</p>}

      <ul className="space-y-2">
        {resolved.map(({ g, m }) => (
          <li key={m.id} className="flex items-center gap-3 rounded-xl border bg-background px-3 py-2.5">
            <button onClick={() => toggle(g.id, m.id)} aria-label="Bocka av"
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition ${m.done ? "border-primary bg-primary text-primary-foreground" : ""}`}>
              {m.done && <Check size={13} />}
            </button>
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm font-medium ${m.done ? "text-muted-foreground line-through" : ""}`}>{m.title}</p>
              <p className="truncate text-xs text-muted-foreground"><span className={`mr-1 inline-block h-2 w-2 rounded-full ${cat(g.category).dot}`} />{g.title}</p>
            </div>
            <button onClick={() => persist(items.filter((i) => i.milestoneId !== m.id))} className="text-muted-foreground hover:text-destructive" aria-label="Ta bort från fokus"><X size={15} /></button>
          </li>
        ))}
      </ul>

      {picking && (
        <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border p-2">
          {options.map(({ g, m }) => (
            <button key={m.id} onClick={() => { persist([...items, { goalId: g.id, milestoneId: m.id }]); if (resolved.length + 1 >= 3) setPicking(false); }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted">
              <span className={`h-2 w-2 shrink-0 rounded-full ${cat(g.category).dot}`} />
              <span className="flex-1 truncate">{m.title}</span>
              <span className="truncate text-xs text-muted-foreground">{g.title}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
