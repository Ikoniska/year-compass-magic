import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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

const uid = () => crypto.randomUUID();

interface Ctx {
  goals: Goal[]; events: PlanEvent[]; reflections: Reflections; loading: boolean;
  saveGoal: (g: Goal) => void; deleteGoal: (id: string) => void;
  saveEvent: (e: PlanEvent) => void; deleteEvent: (id: string) => void;
  setReflection: (key: string, q: string, v: string) => void;
  newId: () => string;
}
const PlannerCtx = createContext<Ctx | null>(null);

const fail = (error: { message: string } | null) => { if (error) toast.error("Kunde inte spara: " + error.message); };

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [events, setEvents] = useState<PlanEvent[]>([]);
  const [reflections, setRefl] = useState<Reflections>({});
  const [loading, setLoading] = useState(true);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    (async () => {
      const [g, e, r] = await Promise.all([
        supabase.from("goals").select("*").order("created_at"),
        supabase.from("events").select("*").order("created_at"),
        supabase.from("reflections").select("*"),
      ]);
      setGoals((g.data ?? []).map((x) => ({
        id: x.id, title: x.title, category: x.category as Category, status: x.status as Status,
        start: x.start_month, end: x.end_month, milestones: (x.milestones as unknown as Milestone[]) ?? [],
      })));
      setEvents((e.data ?? []).map((x) => ({ id: x.id, title: x.title, month: x.month, day: x.day, category: x.category as Category })));
      setRefl(Object.fromEntries((r.data ?? []).map((x) => [x.period_key, x.answers as Record<string, string>])));
      setLoading(false);
    })();
  }, []);

  const upsert = <T extends { id: string }>(list: T[], item: T) =>
    list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];

  const saveGoal = (g: Goal) => {
    setGoals((l) => upsert(l, g));
    supabase.from("goals").upsert({
      id: g.id, title: g.title, category: g.category, status: g.status,
      start_month: g.start, end_month: g.end, milestones: g.milestones as never,
    }).then(({ error }) => fail(error));
  };
  const deleteGoal = (id: string) => {
    setGoals((l) => l.filter((g) => g.id !== id));
    supabase.from("goals").delete().eq("id", id).then(({ error }) => fail(error));
  };
  const saveEvent = (e: PlanEvent) => {
    setEvents((l) => upsert(l, e));
    supabase.from("events").upsert({ id: e.id, title: e.title, month: e.month, day: e.day, category: e.category })
      .then(({ error }) => fail(error));
  };
  const deleteEvent = (id: string) => {
    setEvents((l) => l.filter((e) => e.id !== id));
    supabase.from("events").delete().eq("id", id).then(({ error }) => fail(error));
  };
  const setReflection = (key: string, q: string, v: string) => {
    setRefl((r) => {
      const answers = { ...r[key], [q]: v };
      clearTimeout(timers.current[key]);
      timers.current[key] = setTimeout(async () => {
        const { data } = await supabase.auth.getUser();
        if (!data.user) return;
        const { error } = await supabase.from("reflections").upsert({
          user_id: data.user.id, period_key: key, answers, updated_at: new Date().toISOString(),
        });
        fail(error);
      }, 600);
      return { ...r, [key]: answers };
    });
  };

  return (
    <PlannerCtx.Provider value={{ goals, events, reflections, loading, newId: uid, saveGoal, deleteGoal, saveEvent, deleteEvent, setReflection }}>
      {children}
    </PlannerCtx.Provider>
  );
}
export const usePlanner = () => useContext(PlannerCtx)!;

export const goalProgress = (g: Goal) => {
  if (g.status === "slutford") return 100;
  if (!g.milestones.length) return STATUSES.find((s) => s.id === g.status)!.pct;
  return Math.round((g.milestones.filter((m) => m.done).length / g.milestones.length) * 100);
};
