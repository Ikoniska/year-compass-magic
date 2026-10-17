import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Target, ListChecks, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { GoalDialog } from "@/components/Dialogs";
import { usePlanner, type Goal } from "@/lib/planner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/whiteboard")({
  head: () => ({
    meta: [
      { title: "Whiteboard – Ikoniska" },
      { name: "description", content: "Samla idéer och visioner på post-it-lappar som sparas automatiskt." },
      { property: "og:title", content: "Whiteboard – Ikoniska" },
      { property: "og:description", content: "Samla idéer och visioner på post-it-lappar som sparas automatiskt." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Whiteboard,
});

const COLORS = ["yellow", "green", "pink", "blue", "purple"] as const;
type Item = { id: string; text: string; done: boolean };
type Note = { id: string; content: string; color: string; pos_x: number; pos_y: number; rotation: number; items: Item[]; is_checklist: boolean; width: number; height: number };
const FIELDS = "id,content,color,pos_x,pos_y,rotation,items,is_checklist,width,height";
type Stroke = { id: string; color: string; size: number; points: [number, number][] };
const INKS: Record<string, string> = { ink: "var(--foreground)", red: "var(--destructive)", blue: "var(--cat-arbete)", green: "var(--cat-halsa)", orange: "var(--primary)" };
const pathOf = (p: [number, number][]) => p.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");

const LAYOUTS = {
  fri: { label: "Fri canvas", zones: [] as string[] },
  kvartal: { label: "Kvartal", zones: ["Q1", "Q2", "Q3", "Q4"] },
  omraden: { label: "Livsområden", zones: ["Arbete & karriär", "Hälsa & energi", "Personlig utveckling", "Ekonomi & projekt"] },
  kanban: { label: "Kanban", zones: ["Idébank", "Planeras", "Pågående", "Klart"] },
};
type LayoutKey = keyof typeof LAYOUTS;
const BOARD_W = 1200;

function Whiteboard() {
  const { newId } = usePlanner();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState<LayoutKey>("fri");
  const [goalDraft, setGoalDraft] = useState<Goal | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [draw, setDraw] = useState(false);
  const [ink, setInk] = useState("ink");
  const [pen, setPen] = useState(3);
  const [live, setLive] = useState<[number, number][] | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("wb-layout") as LayoutKey | null;
    if (saved && saved in LAYOUTS) setLayout(saved);
    supabase.from("whiteboard_notes").select(FIELDS).order("created_at")
      .then(({ data, error }) => {
        if (error) toast.error("Kunde inte hämta lappar");
        setNotes((data ?? []).map((n) => ({ ...n, items: (n.items as Item[] | null) ?? [] })));
        setLoading(false);
      });
    supabase.from("whiteboard_strokes").select("id,color,size,points").order("created_at")
      .then(({ data }) => setStrokes((data ?? []).map((s) => ({ ...s, points: s.points as [number, number][] }))));
  }, []);

  function startStroke(e: React.PointerEvent) {
    if (!draw) return;
    e.preventDefault();
    const r = boardRef.current!.getBoundingClientRect();
    const pts: [number, number][] = [[e.clientX - r.left, e.clientY - r.top]];
    setLive([...pts]);
    const move = (ev: PointerEvent) => { pts.push([Math.round(ev.clientX - r.left), Math.round(ev.clientY - r.top)]); setLive([...pts]); };
    const up = async () => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
      setLive(null);
      if (pts.length < 2) return;
      const { data, error } = await supabase.from("whiteboard_strokes").insert({ color: ink, size: pen, points: pts }).select("id").single();
      if (error || !data) { toast.error("Kunde inte spara ritningen"); return; }
      setStrokes((s) => [...s, { id: data.id, color: ink, size: pen, points: pts }]);
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  }
  async function undoStroke() {
    const last = strokes[strokes.length - 1]; if (!last) return;
    setStrokes((s) => s.slice(0, -1));
    await supabase.from("whiteboard_strokes").delete().eq("id", last.id);
  }
  async function clearStrokes() {
    if (!confirm("Rensa alla ritningar?")) return;
    const ids = strokes.map((s) => s.id); setStrokes([]);
    if (ids.length) await supabase.from("whiteboard_strokes").delete().in("id", ids);
  }
  function startResize(e: React.PointerEvent, note: Note) {
    e.preventDefault(); e.stopPropagation();
    const sx = e.clientX, sy = e.clientY, ow = note.width, oh = note.height;
    let s = { width: ow, height: oh };
    const move = (ev: PointerEvent) => {
      s = { width: Math.max(140, Math.min(600, ow + ev.clientX - sx)), height: Math.max(120, Math.min(600, oh + ev.clientY - sy)) };
      setNotes((n) => n.map((x) => (x.id === note.id ? { ...x, ...s } : x)));
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); void save(note.id, s); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  }
  function startRotate(e: React.PointerEvent, note: Note) {
    e.preventDefault(); e.stopPropagation();
    const el = (e.currentTarget as HTMLElement).parentElement!.getBoundingClientRect();
    const cx = el.left + el.width / 2, cy = el.top + el.height / 2;
    let rot = note.rotation;
    const move = (ev: PointerEvent) => {
      rot = Math.round((Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180) / Math.PI + 90);
      if (Math.abs(rot) < 4) rot = 0;
      setNotes((n) => n.map((x) => (x.id === note.id ? { ...x, rotation: rot } : x)));
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); void save(note.id, { rotation: rot }); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  }
  const pickLayout = (k: LayoutKey) => { setLayout(k); localStorage.setItem("wb-layout", k); };

  async function save(id: string, patch: Partial<Note>) {
    const { error } = await supabase.from("whiteboard_notes").update({ ...patch, updated_at: new Date().toISOString() } as never).eq("id", id);
    if (error) toast.error("Kunde inte spara");
  }
  function update(id: string, patch: Partial<Note>, debounce = false) {
    setNotes((n) => n.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    if (!debounce) { void save(id, patch); return; }
    clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(() => save(id, patch), 500);
  }
  async function add(x = 40 + Math.random() * 200, y = 60 + Math.random() * 120) {
    const row = { content: "", color: COLORS[Math.floor(Math.random() * COLORS.length)] ?? "yellow", pos_x: x, pos_y: y, rotation: Math.round((Math.random() * 4 - 2) * 10) / 10 };
    const { data, error } = await supabase.from("whiteboard_notes").insert(row).select(FIELDS).single();
    if (error || !data) { toast.error("Kunde inte skapa lapp"); return; }
    setNotes((n) => [...n, { ...data, items: (data.items as Item[] | null) ?? [] }]);
  }
  async function remove(id: string) {
    setNotes((n) => n.filter((x) => x.id !== id));
    await supabase.from("whiteboard_notes").delete().eq("id", id);
  }
  function toGoal(n: Note) {
    const lines = n.content.split("\n").map((s) => s.trim()).filter(Boolean);
    const m = new Date().getMonth();
    setGoalDraft({
      id: newId(), title: lines[0] ?? "Nytt mål", category: "arbete", status: "ej", start: m, end: Math.min(11, m + 2),
      milestones: n.items.map((i) => ({ id: newId(), title: i.text, done: i.done })).filter((i) => i.title),
    });
  }

  function startDrag(e: React.PointerEvent, note: Note) {
    if ((e.target as HTMLElement).closest("textarea,button,input")) return;
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY, ox = note.pos_x, oy = note.pos_y;
    let pos = { pos_x: ox, pos_y: oy };
    const move = (ev: PointerEvent) => {
      const b = boardRef.current!;
      pos = { pos_x: Math.max(0, Math.min(b.clientWidth - 200, ox + ev.clientX - sx)), pos_y: Math.max(0, Math.min(b.clientHeight - 200, oy + ev.clientY - sy)) };
      setNotes((n) => n.map((x) => (x.id === note.id ? { ...x, ...pos } : x)));
    };
    const up = () => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
      if (pos.pos_x !== ox || pos.pos_y !== oy) save(note.id, pos);
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  }

  const zones = LAYOUTS[layout].zones;
  const setItems = (n: Note, items: Item[], debounce = false) => update(n.id, { items }, debounce);

  return (
    <>
      <PageHeader title="Whiteboard" sub="Din idébank och vision board. Dubbelklicka på tavlan för en ny lapp.">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border p-0.5 text-sm">
            {(Object.keys(LAYOUTS) as LayoutKey[]).map((k) => (
              <button key={k} onClick={() => pickLayout(k)}
                className={`rounded-md px-3 py-1.5 ${layout === k ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {LAYOUTS[k].label}
              </button>
            ))}
          </div>
          <button onClick={() => setDraw((d) => !d)} aria-pressed={draw}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${draw ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <Pencil size={16} /> Rita
          </button>
          <button onClick={() => add()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Plus size={16} /> Ny lapp
          </button>
        </div>
      </PageHeader>
      {draw && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border bg-card px-3 py-2 text-sm">
          <span className="text-muted-foreground">Penna:</span>
          {Object.keys(INKS).map((c) => (
            <button key={c} aria-label={`Färg ${c}`} onClick={() => setInk(c)}
              className={`h-6 w-6 rounded-full border-2 ${ink === c ? "border-foreground" : "border-transparent"}`} style={{ background: INKS[c] }} />
          ))}
          <span className="ml-2 text-muted-foreground">Tjocklek:</span>
          {[2, 4, 8].map((s) => (
            <button key={s} onClick={() => setPen(s)} className={`grid h-7 w-7 place-items-center rounded-md ${pen === s ? "bg-secondary" : ""}`}>
              <span className="rounded-full bg-foreground" style={{ width: s + 2, height: s + 2 }} />
            </button>
          ))}
          <button onClick={undoStroke} className="ml-auto inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><Undo2 size={14} /> Ångra</button>
          <button onClick={clearStrokes} className="inline-flex items-center gap-1 text-muted-foreground hover:text-destructive"><Eraser size={14} /> Rensa</button>
        </div>
      )}
      <div className="overflow-auto rounded-2xl border">
        <div ref={boardRef} className="whiteboard-grid relative h-[900px]" style={{ minWidth: BOARD_W }}
          onDoubleClick={(e) => { if (draw || e.target !== e.currentTarget) return; const r = e.currentTarget.getBoundingClientRect(); add(e.clientX - r.left - 100, e.clientY - r.top - 20); }}>
          {zones.length > 0 && (
            <div className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${zones.length}, 1fr)` }}>
              {zones.map((z, i) => (
                <div key={z} className={`border-r border-dashed border-border/80 last:border-r-0 ${i % 2 ? "bg-muted/30" : ""}`}>
                  <div className="m-3 inline-block rounded-full bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground shadow-sm">{z}</div>
                </div>
              ))}
            </div>
          )}
          {!loading && notes.length === 0 && (
            <p className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted-foreground">Tomt här – klicka "Ny lapp" för att börja.</p>
          )}
          <svg onPointerDown={startStroke} className={`absolute inset-0 z-20 h-full w-full touch-none ${draw ? "cursor-crosshair" : "pointer-events-none"}`}>
            {strokes.map((s) => <path key={s.id} d={pathOf(s.points)} stroke={INKS[s.color] ?? INKS.ink} strokeWidth={s.size} fill="none" strokeLinecap="round" strokeLinejoin="round" />)}
            {live && <path d={pathOf(live)} stroke={INKS[ink]} strokeWidth={pen} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
          </svg>
          {notes.map((n) => (
            <div key={n.id} onPointerDown={(e) => startDrag(e, n)}
              className={`note-${n.color} group absolute flex cursor-grab touch-none flex-col rounded-md p-3 shadow-lg active:cursor-grabbing`}
              style={{ left: n.pos_x, top: n.pos_y, width: n.width, minHeight: n.height, transform: `rotate(${n.rotation}deg)` }}>
              <button aria-label="Vrid lappen" title="Dra för att vrida" onPointerDown={(e) => startRotate(e, n)}
                className="absolute -top-3 left-1/2 grid h-6 w-6 -translate-x-1/2 cursor-grab place-items-center rounded-full border bg-background text-foreground opacity-0 shadow transition group-hover:opacity-100"><RotateCw size={12} /></button>
              <span aria-label="Ändra storlek" title="Dra för att ändra storlek" onPointerDown={(e) => startResize(e, n)}
                className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize opacity-0 transition group-hover:opacity-60" style={{ background: "linear-gradient(135deg, transparent 50%, currentColor 50%)" }} />
              {n.is_checklist ? (
                <div className="flex flex-1 flex-col gap-1 text-sm">
                  <input value={n.content} placeholder="Rubrik…" onChange={(e) => update(n.id, { content: e.target.value }, true)}
                    className="bg-transparent font-semibold outline-none placeholder:opacity-50" />
                  {n.items.map((it) => (
                    <div key={it.id} className="flex items-center gap-1.5">
                      <input type="checkbox" checked={it.done} aria-label="Klar"
                        onChange={() => setItems(n, n.items.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)))} className="h-3.5 w-3.5 shrink-0 accent-current" />
                      <input value={it.text} onChange={(e) => setItems(n, n.items.map((x) => (x.id === it.id ? { ...x, text: e.target.value } : x)), true)}
                        className={`min-w-0 flex-1 bg-transparent outline-none ${it.done ? "line-through opacity-60" : ""}`} />
                      <button aria-label="Ta bort punkt" onClick={() => setItems(n, n.items.filter((x) => x.id !== it.id))} className="opacity-0 group-hover:opacity-60"><X size={12} /></button>
                    </div>
                  ))}
                  <input placeholder="+ Ny punkt (Enter)" className="bg-transparent text-xs outline-none placeholder:opacity-50"
                    onKeyDown={(e) => { const t = e.currentTarget.value.trim(); if (e.key === "Enter" && t) { setItems(n, [...n.items, { id: newId(), text: t, done: false }]); e.currentTarget.value = ""; } }} />
                </div>
              ) : (
                <textarea value={n.content} placeholder="Skriv en idé…" onChange={(e) => update(n.id, { content: e.target.value }, true)}
                  className="min-h-[110px] flex-1 resize-none bg-transparent text-sm leading-snug outline-none placeholder:opacity-50" />
              )}
              <div className="mt-2 flex items-center justify-between opacity-60 transition group-hover:opacity-100">
                <div className="flex gap-1">
                  {COLORS.map((c) => (
                    <button key={c} aria-label={`Färg ${c}`} onClick={() => update(n.id, { color: c })}
                      className={`note-${c} h-4 w-4 rounded-full border border-current/30 ${n.color === c ? "ring-2 ring-current/50" : ""}`} />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button aria-label="Växla checklista" title="Checklista" onClick={() => update(n.id, { is_checklist: !n.is_checklist })} className="hover:opacity-70"><ListChecks size={14} /></button>
                  <button aria-label="Gör till mål" title="Gör till mål" onClick={() => toGoal(n)} className="hover:opacity-70"><Target size={14} /></button>
                  <button aria-label="Ta bort" onClick={() => remove(n.id)} className="hover:opacity-70"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {goalDraft && <GoalDialog goal={goalDraft} onClose={() => setGoalDraft(null)} />}
    </>
  );
}
