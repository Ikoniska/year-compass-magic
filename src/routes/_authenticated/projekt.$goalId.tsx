import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { MONTHS_SHORT, cat, goalProgress, usePlanner } from "@/lib/planner";

export const Route = createFileRoute("/_authenticated/projekt/$goalId")({
  head: () => ({
    meta: [
      { title: "Projekt – Ikoniska" },
      { name: "description", content: "Kanban, milstolpar och statusrapport för ditt projekt." },
      { property: "og:title", content: "Projekt – Ikoniska" },
      { property: "og:description", content: "Kanban, milstolpar och statusrapport för ditt projekt." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Project,
});

type Col = "todo" | "doing" | "done";
const COLS: { id: Col; label: string }[] = [{ id: "todo", label: "Att göra" }, { id: "doing", label: "Pågår" }, { id: "done", label: "Klart" }];
type Task = { id: string; title: string; col: Col; assignee: string; due: string | null; position: number };
type Health = "green" | "yellow" | "red";
const HEALTH: { id: Health; label: string; cls: string }[] = [
  { id: "green", label: "I fas", cls: "bg-cat-halsa" }, { id: "yellow", label: "Risker", cls: "bg-cat-ekonomi" }, { id: "red", label: "Kräver åtgärd", cls: "bg-destructive" },
];
const field = "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function Project() {
  const { goalId } = Route.useParams();
  const { goals, wsId, canEdit, people, saveGoal } = usePlanner();
  const g = goals.find((x) => x.id === goalId);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [st, setSt] = useState({ health: "green" as Health, progress: "", blockers: "", updated_at: "" });
  const [title, setTitle] = useState("");
  const [drag, setDrag] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pick = (e: string) => people.find((p) => p.email === e);

  useEffect(() => {
    supabase.from("project_tasks").select("id,title,col,assignee,due,position").eq("goal_id", goalId).order("position")
      .then(({ data }) => setTasks((data ?? []) as Task[]));
    supabase.from("project_status").select("*").eq("goal_id", goalId).maybeSingle()
      .then(({ data }) => data && setSt({ health: data.health as Health, progress: data.progress, blockers: data.blockers, updated_at: data.updated_at }));
  }, [goalId]);

  if (!g) return <p className="text-sm text-muted-foreground">Projektet hittades inte i den aktiva planen. <Link to="/mal" className="text-primary underline">Till Mål</Link></p>;
  const c = cat(g.category);

  async function add() {
    const t = title.trim(); if (!t) return;
    if (!canEdit) { toast.error("Du har bara läsbehörighet"); return; }
    const { data, error } = await supabase.from("project_tasks").insert({ title: t, goal_id: goalId, workspace_id: wsId, position: Date.now() }).select("id,title,col,assignee,due,position").single();
    if (error || !data) { toast.error("Kunde inte lägga till"); return; }
    setTasks((l) => [...l, data as Task]); setTitle("");
  }
  function upd(id: string, p: Partial<Task>) {
    if (!canEdit) { toast.error("Du har bara läsbehörighet"); return; }
    setTasks((l) => l.map((t) => (t.id === id ? { ...t, ...p } : t)));
    supabase.from("project_tasks").update(p).eq("id", id).then(({ error }) => error && toast.error("Kunde inte spara"));
  }
  function del(id: string) {
    if (!canEdit) return;
    setTasks((l) => l.filter((t) => t.id !== id));
    supabase.from("project_tasks").delete().eq("id", id);
  }
  function setStatus(p: Partial<typeof st>) {
    if (!canEdit) { toast.error("Du har bara läsbehörighet"); return; }
    const next = { ...st, ...p, updated_at: new Date().toISOString() };
    setSt(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      supabase.from("project_status").upsert({ goal_id: goalId, workspace_id: wsId, health: next.health, progress: next.progress, blockers: next.blockers, updated_at: next.updated_at })
        .then(({ error }) => error && toast.error("Kunde inte spara status"));
    }, 600);
  }
  const done = tasks.filter((t) => t.col === "done").length;

  return (
    <>
      <Link to="/mal" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={14} /> Mål & projekt</Link>
      <PageHeader title={g.title} sub={`${c.label} · ${MONTHS_SHORT[g.start]} – ${MONTHS_SHORT[g.end]} · ${goalProgress(g)}% av delmålen · ${done}/${tasks.length} uppgifter klara`} />

      <section className="mb-8 rounded-2xl border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Statusrapport</h2>
          <div className="inline-flex gap-1 rounded-xl bg-muted/70 p-1">
            {HEALTH.map((h) => (
              <button key={h.id} onClick={() => setStatus({ health: h.id })}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition ${st.health === h.id ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
                <span className={`h-2 w-2 rounded-full ${h.cls}`} />{h.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs font-medium text-muted-foreground">Senaste framsteg
            <textarea rows={3} className={`${field} mt-1.5`} value={st.progress} onChange={(e) => setStatus({ progress: e.target.value })} disabled={!canEdit} />
          </label>
          <label className="text-xs font-medium text-muted-foreground">Blockerare
            <textarea rows={3} className={`${field} mt-1.5`} value={st.blockers} onChange={(e) => setStatus({ blockers: e.target.value })} disabled={!canEdit} />
          </label>
        </div>
        {st.updated_at && <p className="mt-2 text-xs text-muted-foreground">Uppdaterad {new Date(st.updated_at).toLocaleString("sv-SE")}</p>}
      </section>

      {canEdit && (
        <div className="mb-4 flex gap-2">
          <input className={field} placeholder="Ny uppgift…" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          <button onClick={add} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"><Plus size={16} /> Lägg till</button>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {COLS.map((col, ci) => (
          <div key={col.id} className="min-h-[200px] rounded-2xl bg-muted/50 p-3"
            onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag) upd(drag, { col: col.id }); setDrag(""); }}>
            <h3 className="mb-3 flex items-center justify-between px-1 text-sm font-semibold">{col.label}<span className="text-xs text-muted-foreground">{tasks.filter((t) => t.col === col.id).length}</span></h3>
            <ul className="space-y-2">
              {tasks.filter((t) => t.col === col.id).map((t) => (
                <li key={t.id} draggable={canEdit} onDragStart={() => setDrag(t.id)} className="group rounded-xl border bg-card p-3 shadow-sm">
                  <div className="flex items-start gap-2">
                    <span className={`flex-1 text-sm ${t.col === "done" ? "text-muted-foreground line-through" : ""}`}>{t.title}</span>
                    {t.assignee && <Avatar person={pick(t.assignee)} size={20} />}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    {people.length > 1 && (
                      <select className="rounded-md border bg-background px-1 py-0.5" value={t.assignee} onChange={(e) => upd(t.id, { assignee: e.target.value })} aria-label="Ansvarig">
                        <option value="">Ingen</option>
                        {people.map((p) => <option key={p.email} value={p.email}>{p.label}</option>)}
                      </select>
                    )}
                    <input type="date" className="rounded-md border bg-background px-1 py-0.5" value={t.due ?? ""} onChange={(e) => upd(t.id, { due: e.target.value || null })} aria-label="Deadline" />
                    <span className="ml-auto flex gap-1 opacity-60 group-hover:opacity-100">
                      {ci > 0 && <button aria-label="Flytta vänster" onClick={() => upd(t.id, { col: COLS[ci - 1]!.id })}><ChevronLeft size={14} /></button>}
                      {ci < 2 && <button aria-label="Flytta höger" onClick={() => upd(t.id, { col: COLS[ci + 1]!.id })}><ChevronRight size={14} /></button>}
                      {canEdit && <button aria-label="Ta bort" onClick={() => del(t.id)}><Trash2 size={14} /></button>}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {g.milestones.length > 0 && (
        <section className="mt-8 rounded-2xl border bg-card p-5">
          <h2 className="mb-3 font-display text-lg font-semibold">Milstolpar</h2>
          <ul className="space-y-1.5">
            {g.milestones.map((m) => (
              <li key={m.id}><label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="accent-primary" checked={m.done} onChange={() => saveGoal({ ...g, milestones: g.milestones.map((x) => (x.id === m.id ? { ...x, done: !x.done } : x)) })} />
                <span className={m.done ? "text-muted-foreground line-through" : ""}>{m.title}</span>
              </label></li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
