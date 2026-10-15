import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
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
type Note = { id: string; content: string; color: string; pos_x: number; pos_y: number; rotation: number };

function Whiteboard() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const boardRef = useRef<HTMLDivElement>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    supabase.from("whiteboard_notes").select("id,content,color,pos_x,pos_y,rotation").order("created_at")
      .then(({ data, error }) => { if (error) toast.error("Kunde inte hämta lappar"); setNotes(data ?? []); setLoading(false); });
  }, []);

  async function save(id: string, patch: Partial<Note>) {
    const { error } = await supabase.from("whiteboard_notes").update({ ...(patch as Record<string, string | number>), updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error("Kunde inte spara");
  }
  function update(id: string, patch: Partial<Note>, debounce = false) {
    setNotes((n) => n.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    if (!debounce) return save(id, patch);
    clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(() => save(id, patch), 500);
  }
  async function add(x = 40 + Math.random() * 200, y = 40 + Math.random() * 120) {
    const row = { content: "", color: COLORS[Math.floor(Math.random() * COLORS.length)] ?? "yellow", pos_x: x, pos_y: y, rotation: Math.round((Math.random() * 4 - 2) * 10) / 10 };
    const { data, error } = await supabase.from("whiteboard_notes").insert(row).select("id,content,color,pos_x,pos_y,rotation").single();
    if (error || !data) return toast.error("Kunde inte skapa lapp");
    setNotes((n) => [...n, data]);
  }
  async function remove(id: string) {
    setNotes((n) => n.filter((x) => x.id !== id));
    await supabase.from("whiteboard_notes").delete().eq("id", id);
  }

  function startDrag(e: React.PointerEvent, note: Note) {
    if ((e.target as HTMLElement).closest("textarea,button")) return;
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY, ox = note.pos_x, oy = note.pos_y;
    let pos = { pos_x: ox, pos_y: oy };
    const move = (ev: PointerEvent) => {
      const b = boardRef.current!;
      pos = { pos_x: Math.max(0, Math.min(b.clientWidth - 200, ox + ev.clientX - sx)), pos_y: Math.max(0, Math.min(b.clientHeight - 180, oy + ev.clientY - sy)) };
      setNotes((n) => n.map((x) => (x.id === note.id ? { ...x, ...pos } : x)));
    };
    const up = () => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
      if (pos.pos_x !== ox || pos.pos_y !== oy) save(note.id, pos);
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  }

  return (
    <>
      <PageHeader title="Whiteboard" sub="Din idébank och vision board. Dubbelklicka på tavlan för en ny lapp.">
        <button onClick={() => add()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Plus size={16} /> Ny lapp
        </button>
      </PageHeader>
      <div className="overflow-auto rounded-2xl border">
        <div ref={boardRef} className="whiteboard-grid relative h-[900px] min-w-[900px]"
          onDoubleClick={(e) => { if (e.target !== e.currentTarget) return; const r = e.currentTarget.getBoundingClientRect(); add(e.clientX - r.left - 100, e.clientY - r.top - 20); }}>
          {!loading && notes.length === 0 && (
            <p className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted-foreground">Tomt här – klicka "Ny lapp" för att börja.</p>
          )}
          {notes.map((n) => (
            <div key={n.id} onPointerDown={(e) => startDrag(e, n)}
              className={`note-${n.color} group absolute flex h-[180px] w-[200px] cursor-grab touch-none flex-col rounded-md p-3 shadow-lg active:cursor-grabbing`}
              style={{ left: n.pos_x, top: n.pos_y, transform: `rotate(${n.rotation}deg)` }}>
              <textarea value={n.content} placeholder="Skriv en idé…" onChange={(e) => update(n.id, { content: e.target.value }, true)}
                className="flex-1 resize-none bg-transparent text-sm leading-snug outline-none placeholder:opacity-50" />
              <div className="mt-2 flex items-center justify-between opacity-60 transition group-hover:opacity-100">
                <div className="flex gap-1">
                  {COLORS.map((c) => (
                    <button key={c} aria-label={`Färg ${c}`} onClick={() => update(n.id, { color: c })}
                      className={`note-${c} h-4 w-4 rounded-full border border-current/30 ${n.color === c ? "ring-2 ring-current/50" : ""}`} />
                  ))}
                </div>
                <button aria-label="Ta bort" onClick={() => remove(n.id)} className="hover:opacity-70"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
