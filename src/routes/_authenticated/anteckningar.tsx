import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Plus, Search, Trash2, StickyNote, Target, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { GoalDialog, btnGhost, btnPrimary } from "@/components/Dialogs";
import { usePlanner, type Goal } from "@/lib/planner";

export const Route = createFileRoute("/_authenticated/anteckningar")({
  head: () => ({
    meta: [
      { title: "Anteckningar – Ikoniska" },
      { name: "description", content: "Din privata anteckningsbok som bara du kan se." },
      { property: "og:title", content: "Anteckningar – Ikoniska" },
      { property: "og:description", content: "Din privata anteckningsbok som bara du kan se." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Notes,
});

type Note = { id: string; title: string; body: string; updated_at: string };

function Notes() {
  const { wsId, newId, canEdit } = usePlanner();
  const [notes, setNotes] = useState<Note[]>([]);
  const [active, setActive] = useState("");
  const [q, setQ] = useState("");
  const [goal, setGoal] = useState<Goal | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    supabase.from("notes").select("id,title,body,updated_at").order("updated_at", { ascending: false })
      .then(({ data }) => { const l = (data ?? []) as Note[]; setNotes(l); if (l[0]) setActive(l[0].id); });
  }, []);

  const cur = notes.find((n) => n.id === active);
  const list = notes.filter((n) => (n.title + " " + n.body).toLowerCase().includes(q.toLowerCase()));

  async function add() {
    const { data, error } = await supabase.from("notes").insert({ title: "", body: "" }).select("id,title,body,updated_at").single();
    if (error || !data) { toast.error("Kunde inte skapa anteckning"); return; }
    setNotes((l) => [data as Note, ...l]); setActive(data.id);
  }
  function edit(p: Partial<Note>) {
    if (!cur) return;
    const next = { ...cur, ...p, updated_at: new Date().toISOString() };
    setNotes((l) => l.map((n) => (n.id === cur.id ? next : n)));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      supabase.from("notes").update({ title: next.title, body: next.body, updated_at: next.updated_at }).eq("id", next.id)
        .then(({ error }) => error && toast.error("Kunde inte spara"));
    }, 600);
  }
  async function remove() {
    if (!cur || !confirm("Ta bort anteckningen?")) return;
    await supabase.from("notes").delete().eq("id", cur.id);
    const rest = notes.filter((n) => n.id !== cur.id); setNotes(rest); setActive(rest[0]?.id ?? "");
  }
  async function toWhiteboard() {
    if (!cur) return;
    if (!canEdit) { toast.error("Du har bara läsbehörighet i den aktiva planen"); return; }
    const content = [cur.title, cur.body].filter(Boolean).join("\n").slice(0, 500);
    const { error } = await supabase.from("whiteboard_notes").insert({ content, color: "yellow", pos_x: 60 + Math.random() * 200, pos_y: 60 + Math.random() * 120, workspace_id: wsId });
    error ? toast.error("Kunde inte skicka") : toast.success("Skickad som lapp till Whiteboard");
  }
  function toGoal() {
    if (!cur) return;
    const m = new Date().getMonth();
    setGoal({ id: newId(), title: cur.title || cur.body.split("\n")[0] || "Nytt mål", category: "arbete", status: "ej", start: m, end: Math.min(11, m + 2), milestones: [] });
  }

  return (
    <>
      <PageHeader title="Anteckningar" sub="Privat – bara du kan se det här, även i delade planer.">
        <button className={btnPrimary} onClick={add}><Plus size={16} /> Ny anteckning</button>
      </PageHeader>
      <div className="grid min-h-[60vh] gap-4 md:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border bg-card p-3">
          <label className="mb-3 flex items-center gap-2 rounded-lg border bg-background px-2.5 py-1.5 text-sm">
            <Search size={14} className="text-muted-foreground" />
            <input className="w-full bg-transparent outline-none" placeholder="Sök" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <ul className="space-y-1">
            {list.map((n) => (
              <li key={n.id}>
                <button onClick={() => setActive(n.id)} className={`w-full rounded-lg px-3 py-2 text-left transition ${n.id === active ? "bg-muted" : "hover:bg-muted/60"}`}>
                  <div className="truncate text-sm font-medium">{n.title || "Utan rubrik"}</div>
                  <div className="truncate text-xs text-muted-foreground">{new Date(n.updated_at).toLocaleDateString("sv-SE")} · {n.body.slice(0, 40) || "Tom"}</div>
                </button>
              </li>
            ))}
            {!list.length && <li className="px-3 py-6 text-center text-xs text-muted-foreground">Inga anteckningar</li>}
          </ul>
        </aside>
        <section className="flex flex-col rounded-2xl border bg-card p-6">
          {cur ? (
            <>
              <input className="mb-3 bg-transparent font-display text-2xl font-semibold outline-none" placeholder="Rubrik" value={cur.title} onChange={(e) => edit({ title: e.target.value })} />
              <textarea className="min-h-[40vh] flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none" placeholder="Börja skriva…" value={cur.body} onChange={(e) => edit({ body: e.target.value })} />
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
                <span className="mr-auto flex items-center gap-1 text-xs text-muted-foreground"><Lock size={12} /> Sparas automatiskt</span>
                <button className={btnGhost} onClick={toWhiteboard}><StickyNote size={14} /> Till Whiteboard</button>
                <button className={btnGhost} onClick={toGoal}><Target size={14} /> Gör till mål</button>
                <button className={btnGhost} aria-label="Ta bort" onClick={remove}><Trash2 size={14} /></button>
              </div>
            </>
          ) : (
            <div className="m-auto text-center text-sm text-muted-foreground">Skapa din första anteckning med knappen ovan.</div>
          )}
        </section>
      </div>
      {goal && <GoalDialog goal={goal} onClose={() => setGoal(null)} />}
    </>
  );
}
