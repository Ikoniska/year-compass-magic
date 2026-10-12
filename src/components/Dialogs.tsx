import { useState, type ReactNode } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { CATEGORIES, MONTHS, STATUSES, usePlanner, type Goal, type PlanEvent } from "@/lib/planner";

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-overlay p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border bg-card p-6 shadow-soft sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Stäng"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const field = "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
const label = "mb-1.5 block text-xs font-medium text-muted-foreground";
export const btnPrimary = "inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90";
export const btnGhost = "inline-flex items-center justify-center gap-1.5 rounded-lg border bg-card px-4 py-2 text-sm font-medium transition hover:bg-muted";

export function GoalDialog({ goal, onClose }: { goal?: Goal | undefined; onClose: () => void }) {
  const { saveGoal, deleteGoal, newId } = usePlanner();
  const [g, setG] = useState<Goal>(goal ?? { id: newId(), title: "", category: "arbete", status: "ej", start: new Date().getMonth(), end: Math.min(11, new Date().getMonth() + 2), milestones: [] });
  const [ms, setMs] = useState("");
  const set = (p: Partial<Goal>) => setG((x) => ({ ...x, ...p }));

  return (
    <Modal title={goal ? "Redigera mål" : "Nytt mål"} onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (!g.title.trim()) return; saveGoal({ ...g, end: Math.max(g.start, g.end) }); onClose(); }}>
        <div><label className={label}>Titel</label><input autoFocus className={field} value={g.title} onChange={(e) => set({ title: e.target.value })} placeholder="T.ex. Springa ett maraton" /></div>
        <div>
          <label className={label}>Kategori</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button type="button" key={c.id} onClick={() => set({ category: c.id })}
                className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition ${g.category === c.id ? `${c.cls} ring-current` : "ring-border text-muted-foreground"}`}>{c.label}</button>
            ))}
          </div>
        </div>
        <div>
          <label className={label}>Status</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STATUSES.map((s) => (
              <button type="button" key={s.id} onClick={() => set({ status: s.id })}
                className={`rounded-lg border px-2 py-1.5 text-xs font-medium ${g.status === s.id ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}>{s.label}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={label}>Startmånad</label><select className={field} value={g.start} onChange={(e) => set({ start: +e.target.value })}>{MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}</select></div>
          <div><label className={label}>Deadline</label><select className={field} value={g.end} onChange={(e) => set({ end: +e.target.value })}>{MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}</select></div>
        </div>
        <div>
          <label className={label}>Delmål</label>
          <ul className="mb-2 space-y-1.5">
            {g.milestones.map((m) => (
              <li key={m.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={m.done} className="accent-primary" onChange={() => set({ milestones: g.milestones.map((x) => x.id === m.id ? { ...x, done: !x.done } : x) })} />
                <span className={`flex-1 ${m.done ? "text-muted-foreground line-through" : ""}`}>{m.title}</span>
                <button type="button" onClick={() => set({ milestones: g.milestones.filter((x) => x.id !== m.id) })} className="text-muted-foreground hover:text-destructive"><X size={14} /></button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input className={field} value={ms} onChange={(e) => setMs(e.target.value)} placeholder="Lägg till delmål"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (ms.trim()) { set({ milestones: [...g.milestones, { id: newId(), title: ms.trim(), done: false }] }); setMs(""); } } }} />
            <button type="button" className={btnGhost} onClick={() => { if (ms.trim()) { set({ milestones: [...g.milestones, { id: newId(), title: ms.trim(), done: false }] }); setMs(""); } }}><Plus size={14} /></button>
          </div>
        </div>
        <div className="flex justify-between pt-2">
          {goal ? <button type="button" className={`${btnGhost} text-destructive`} onClick={() => { deleteGoal(goal.id); onClose(); }}><Trash2 size={14} /> Ta bort</button> : <span />}
          <button className={btnPrimary}>Spara mål</button>
        </div>
      </form>
    </Modal>
  );
}

export function EventDialog({ event, onClose }: { event?: PlanEvent | undefined; onClose: () => void }) {
  const { saveEvent, deleteEvent, newId } = usePlanner();
  const [e, setE] = useState<PlanEvent>(event ?? { id: newId(), title: "", month: new Date().getMonth(), day: 1, category: "arbete" });
  const set = (p: Partial<PlanEvent>) => setE((x) => ({ ...x, ...p }));
  return (
    <Modal title={event ? "Redigera händelse" : "Ny händelse"} onClose={onClose}>
      <form className="space-y-4" onSubmit={(ev) => { ev.preventDefault(); if (!e.title.trim()) return; saveEvent(e); onClose(); }}>
        <div><label className={label}>Titel</label><input autoFocus className={field} value={e.title} onChange={(x) => set({ title: x.target.value })} placeholder="T.ex. Deadline rapport" /></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2"><label className={label}>Månad</label><select className={field} value={e.month} onChange={(x) => set({ month: +x.target.value })}>{MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}</select></div>
          <div><label className={label}>Dag</label><input type="number" min={1} max={31} className={field} value={e.day} onChange={(x) => set({ day: +x.target.value })} /></div>
        </div>
        <div><label className={label}>Kategori</label><select className={field} value={e.category} onChange={(x) => set({ category: x.target.value as PlanEvent["category"] })}>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
        <div className="flex justify-between pt-2">
          {event ? <button type="button" className={`${btnGhost} text-destructive`} onClick={() => { deleteEvent(event.id); onClose(); }}><Trash2 size={14} /> Ta bort</button> : <span />}
          <button className={btnPrimary}>Spara händelse</button>
        </div>
      </form>
    </Modal>
  );
}
