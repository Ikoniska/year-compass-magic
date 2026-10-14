import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { GoalDialog, btnPrimary } from "@/components/Dialogs";
import { CATEGORIES, MONTHS_SHORT, STATUSES, cat, goalProgress, statusLabel, usePlanner, type Category, type Goal } from "@/lib/planner";

export const Route = createFileRoute("/_authenticated/mal")({
  head: () => ({
    meta: [
      { title: "Mål – Ikoniska" },
      { name: "description", content: "Skapa mål per kategori, sätt status och bocka av delmål." },
      { property: "og:title", content: "Mål – Ikoniska" },
      { property: "og:description", content: "Skapa mål per kategori, sätt status och bocka av delmål." },
    ],
  }),
  component: Goals,
});

function Goals() {
  const { goals, saveGoal } = usePlanner();
  const [filter, setFilter] = useState<Category | "alla">("alla");
  const [edit, setEdit] = useState<Goal | "new" | null>(null);
  const list = goals.filter((g) => filter === "alla" || g.category === filter);

  return (
    <>
      <PageHeader title="Mål" sub="Färgkodade efter kategori. Klicka på ett mål för att redigera.">
        <button className={btnPrimary} onClick={() => setEdit("new")}><Plus size={15} /> Nytt mål</button>
      </PageHeader>
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {[{ id: "alla" as const, label: "Alla", cls: "bg-foreground text-background" }, ...CATEGORIES].map((c) => (
          <button key={c.id} onClick={() => setFilter(c.id)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${filter === c.id ? `${c.cls} ring-transparent` : "text-muted-foreground ring-border hover:text-foreground"}`}>
            {c.label} <span className="opacity-60">{c.id === "alla" ? goals.length : goals.filter((g) => g.category === c.id).length}</span>
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {list.map((g) => {
          const c = cat(g.category); const p = goalProgress(g);
          return (
            <article key={g.id} className="group rounded-2xl border bg-card p-5 transition hover:shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <button onClick={() => setEdit(g)} className="text-left">
                  <span className={`mb-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${c.cls}`}>{c.label}</span>
                  <h3 className="font-display text-lg font-semibold leading-snug group-hover:text-primary">{g.title}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{MONTHS_SHORT[g.start]} – {MONTHS_SHORT[g.end]}</p>
                </button>
                <select value={g.status} onChange={(e) => saveGoal({ ...g, status: e.target.value as Goal["status"] })}
                  className={`rounded-md border px-2 py-1 text-xs font-medium status-${g.status}`} aria-label="Status">
                  {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className={`h-full ${c.dot} transition-all`} style={{ width: `${p}%` }} /></div>
                <span className="text-xs tabular-nums text-muted-foreground">{p}%</span>
              </div>
              {g.milestones.length > 0 && (
                <ul className="mt-4 space-y-1.5 border-t pt-3">
                  {g.milestones.map((m) => (
                    <li key={m.id}>
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <input type="checkbox" checked={m.done} className="accent-primary"
                          onChange={() => saveGoal({ ...g, milestones: g.milestones.map((x) => x.id === m.id ? { ...x, done: !x.done } : x) })} />
                        <span className={m.done ? "text-muted-foreground line-through" : ""}>{m.title}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              <p className="sr-only">{statusLabel(g.status)}</p>
            </article>
          );
        })}
        {!list.length && <p className="text-sm text-muted-foreground">Inga mål i denna kategori ännu.</p>}
      </div>
      {edit && <GoalDialog goal={edit === "new" ? undefined : edit} onClose={() => setEdit(null)} />}
    </>
  );
}
