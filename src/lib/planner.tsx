import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Category = "arbete" | "halsa" | "ekonomi" | "utveckling" | "relationer";
export type Status = "ej" | "inledd" | "halvvags" | "slutford";

export const CATEGORIES: { id: Category; label: string; cls: string; dot: string }[] = [
  { id: "arbete", label: "Arbete", cls: "bg-cat-arbete/15 text-cat-arbete", dot: "bg-cat-arbete" },
  { id: "halsa", label: "Hälsa", cls: "bg-cat-halsa/15 text-cat-halsa", dot: "bg-cat-halsa" },
  { id: "ekonomi", label: "Ekonomi", cls: "bg-cat-ekonomi/15 text-cat-ekonomi", dot: "bg-cat-ekonomi" },
  { id: "utveckling", label: "Personlig utveckling", cls: "bg-cat-utveckling/15 text-cat-utveckling", dot: "bg-cat-utveckling" },
  { id: "relationer", label: "Relationer", cls: "bg-cat-relationer/15 text-cat-relationer", dot: "bg-cat-relationer" },
];
export const cat = (id: Category) => CATEGORIES.find((c) => c.id === id)!;

export const STATUSES: { id: Status; label: string; pct: number }[] = [
  { id: "ej", label: "Ej påbörjad", pct: 0 },
  { id: "inledd", label: "Inledd", pct: 25 },
  { id: "halvvags", label: "Halvvägs", pct: 50 },
  { id: "slutford", label: "Slutförd", pct: 100 },
];
export const statusLabel = (s: Status) => STATUSES.find((x) => x.id === s)!.label;

export const MONTHS = ["Januari", "Februari", "Mars", "April", "Maj", "Juni", "Juli", "Augusti", "September", "Oktober", "November", "December"];
export const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));

export interface Milestone { id: string; title: string; done: boolean }
export interface Goal {
  id: string; title: string; category: Category; status: Status;
  start: number; end: number; milestones: Milestone[];
}
export interface PlanEvent { id: string; title: string; month: number; day: number; category: Category }
export type Reflections = Record<string, Record<string, string>>;

const uid = () => Math.random().toString(36).slice(2, 9);
const ms = (...t: [string, boolean][]) => t.map(([title, done]) => ({ id: uid(), title, done }));

const MOCK_GOALS: Goal[] = [
  { id: uid(), title: "Lansera ny produktversion", category: "arbete", status: "halvvags", start: 1, end: 5, milestones: ms(["Kravspec klar", true], ["Beta till kunder", true], ["Lansering", false]) },
  { id: uid(), title: "Springa ett halvmaraton", category: "halsa", status: "slutford", start: 0, end: 4, milestones: ms(["Springa 5 km", true], ["Springa 15 km", true], ["Göteborgsvarvet", true]) },
  { id: uid(), title: "Spara 60 000 kr buffert", category: "ekonomi", status: "inledd", start: 0, end: 11, milestones: ms(["Budget i ordning", true], ["30 000 kr", false], ["60 000 kr", false]) },
  { id: uid(), title: "Läsa 24 böcker", category: "utveckling", status: "halvvags", start: 0, end: 11, milestones: ms(["6 böcker", true], ["12 böcker", true], ["18 böcker", false], ["24 böcker", false]) },
  { id: uid(), title: "Lära mig spanska (A2)", category: "utveckling", status: "ej", start: 8, end: 11, milestones: ms(["Välj kurs", false], ["Klara A1", false]) },
  { id: uid(), title: "Familjeresa till Japan", category: "relationer", status: "inledd", start: 5, end: 9, milestones: ms(["Boka flyg", true], ["Planera rutt", false]) },
  { id: uid(), title: "Ledarskapsutbildning", category: "arbete", status: "slutford", start: 2, end: 3, milestones: ms(["Modul 1", true], ["Modul 2", true]) },
  { id: uid(), title: "Styrketräna 3 ggr/vecka", category: "halsa", status: "inledd", start: 6, end: 11, milestones: ms(["Skaffa gymkort", true], ["Träningsschema", false]) },
];
const MOCK_EVENTS: PlanEvent[] = [
  { id: uid(), title: "Kvartalsplanering", month: 0, day: 8, category: "arbete" },
  { id: uid(), title: "Göteborgsvarvet", month: 4, day: 23, category: "halsa" },
  { id: uid(), title: "Mammas 60-årsdag", month: 6, day: 14, category: "relationer" },
  { id: uid(), title: "Deklaration", month: 3, day: 30, category: "ekonomi" },
  { id: uid(), title: "Konferens i Berlin", month: 9, day: 5, category: "arbete" },
  { id: uid(), title: "Avresa Tokyo", month: 8, day: 2, category: "relationer" },
  { id: uid(), title: "Årsbokslut privatekonomi", month: 11, day: 28, category: "ekonomi" },
];
const MOCK_REFL: Reflections = {
  "m-0": { good: "Kom igång med löpningen och höll budgeten.", improve: "Mer fokus på djuparbete på jobbet.", learn: "Små dagliga vanor slår stora ryck." },
  "q-0": { good: "Kravspecen blev klar före plan.", improve: "Sömnen har varit ojämn.", learn: "Planera veckan på söndagar." },
};

interface Ctx {
  goals: Goal[]; events: PlanEvent[]; reflections: Reflections;
  saveGoal: (g: Goal) => void; deleteGoal: (id: string) => void;
  saveEvent: (e: PlanEvent) => void; deleteEvent: (id: string) => void;
  setReflection: (key: string, q: string, v: string) => void;
  newId: () => string;
}
const PlannerCtx = createContext<Ctx | null>(null);
const KEY = "arsplan-v1";

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [goals, setGoals] = useState<Goal[]>(MOCK_GOALS);
  const [events, setEvents] = useState<PlanEvent[]>(MOCK_EVENTS);
  const [reflections, setRefl] = useState<Reflections>(MOCK_REFL);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const d = JSON.parse(raw); setGoals(d.goals); setEvents(d.events); setRefl(d.reflections); }
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify({ goals, events, reflections }));
  }, [goals, events, reflections, loaded]);

  const upsert = <T extends { id: string }>(list: T[], item: T) =>
    list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];

  return (
    <PlannerCtx.Provider value={{
      goals, events, reflections, newId: uid,
      saveGoal: (g) => setGoals((l) => upsert(l, g)),
      deleteGoal: (id) => setGoals((l) => l.filter((g) => g.id !== id)),
      saveEvent: (e) => setEvents((l) => upsert(l, e)),
      deleteEvent: (id) => setEvents((l) => l.filter((e) => e.id !== id)),
      setReflection: (key, q, v) => setRefl((r) => ({ ...r, [key]: { ...r[key], [q]: v } })),
    }}>{children}</PlannerCtx.Provider>
  );
}
export const usePlanner = () => useContext(PlannerCtx)!;

export const goalProgress = (g: Goal) => {
  if (g.status === "slutford") return 100;
  if (!g.milestones.length) return STATUSES.find((s) => s.id === g.status)!.pct;
  return Math.round((g.milestones.filter((m) => m.done).length / g.milestones.length) * 100);
};
