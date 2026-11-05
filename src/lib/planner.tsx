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

export interface Milestone { id: string; title: string; done: boolean; assignee?: string }
export interface Goal {
  id: string; title: string; category: Category; status: Status;
  start: number; end: number; milestones: Milestone[];
  habit?: string; habitTarget?: number; assignee?: string;
}
export interface PlanEvent { id: string; title: string; month: number; day: number; category: Category }
export type Reflections = Record<string, Record<string, string>>;

const uid = () => crypto.randomUUID();

export type Role = "owner" | "editor" | "viewer";
export interface Workspace { id: string; name: string; owner_id: string; owner_email: string; share_token: string | null; share_enabled: boolean; share_has_password?: boolean }
export interface Member { id: string; email: string; name: string; role: "viewer" | "editor" }
export interface Person { email: string; label: string; initials: string; color: string }
const PALETTE = ["var(--cat-arbete)", "var(--cat-halsa)", "var(--cat-ekonomi)", "var(--cat-utveckling)", "var(--cat-relationer)", "var(--primary)"];
export const initials = (s: string) => (s.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((x) => x[0]!.toUpperCase()).join("") || "?");

interface Ctx {
  wsId: string; workspaces: Workspace[]; workspace: Workspace | undefined; role: Role; canEdit: boolean;
  members: Member[]; people: Person[]; me: string;
  switchWorkspace: (id: string) => void; reloadMembers: () => void; updateWorkspace: (p: Partial<Workspace>) => Promise<void>;
  createWorkspace: (name: string) => Promise<void>; deleteWorkspace: () => Promise<void>;
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
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [wsId, setWsId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [me, setMe] = useState("");
  const [uidSelf, setUid] = useState("");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setMe(u.user.email ?? ""); setUid(u.user.id);
      let { data: ws } = await supabase.from("workspaces").select("*").order("created_at");
      if (!ws?.some((w) => w.owner_id === u.user!.id)) {
        await supabase.from("workspaces").insert({ owner_id: u.user.id, owner_email: u.user.email ?? "" });
        ({ data: ws } = await supabase.from("workspaces").select("*").order("created_at"));
      }
      const list = (ws ?? []) as Workspace[];
      setWorkspaces(list);
      const saved = localStorage.getItem("ws");
      const own = list.find((w) => w.owner_id === u.user!.id);
      setWsId(list.some((w) => w.id === saved) ? saved! : own?.id ?? list[0]?.id ?? "");
    })();
  }, []);

  const reloadMembers = () => {
    if (!wsId) return;
    supabase.from("workspace_members").select("id,email,name,role").eq("workspace_id", wsId).order("created_at")
      .then(({ data }) => setMembers((data ?? []) as Member[]));
  };

  useEffect(() => {
    if (!wsId) return;
    reloadMembers();
    setLoading(true);
    (async () => {
      const [g, e, r] = await Promise.all([
        supabase.from("goals").select("*").eq("workspace_id", wsId).order("created_at"),
        supabase.from("events").select("*").eq("workspace_id", wsId).order("created_at"),
        supabase.from("reflections").select("*"),
      ]);
      setGoals((g.data ?? []).map((x) => ({
        id: x.id, title: x.title, category: x.category as Category, status: x.status as Status,
        start: x.start_month, end: x.end_month, milestones: (x.milestones as unknown as Milestone[]) ?? [],
        habit: x.habit ?? "", habitTarget: x.habit_target ?? 0, assignee: x.assignee ?? "",
      })));
      setEvents((e.data ?? []).map((x) => ({ id: x.id, title: x.title, month: x.month, day: x.day, category: x.category as Category })));
      setRefl(Object.fromEntries((r.data ?? []).map((x) => [x.period_key, x.answers as Record<string, string>])));
      setLoading(false);
    })();
  }, [wsId]);

  const workspace = workspaces.find((w) => w.id === wsId);
  const myMember = members.find((m) => m.email.toLowerCase() === me.toLowerCase());
  const role: Role = workspace?.owner_id === uidSelf ? "owner" : myMember?.role ?? "viewer";
  const canEdit = role !== "viewer";
  const people: Person[] = [
    ...(workspace ? [{ email: workspace.owner_email, label: workspace.owner_email }] : []),
    ...members.map((m) => ({ email: m.email, label: m.name || m.email })),
  ].map((p, i) => ({ ...p, initials: initials(p.label), color: PALETTE[i % PALETTE.length]! }));
  const switchWorkspace = (id: string) => { localStorage.setItem("ws", id); setWsId(id); };
  const createWorkspace = async (name: string) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Du behöver logga in igen"); return; }
    const { data, error } = await supabase.from("workspaces")
      .insert({ owner_id: u.user.id, owner_email: u.user.email ?? me, name }).select("*").single();
    fail(error);
    if (data) { setWorkspaces((l) => [...l, data as Workspace]); switchWorkspace(data.id); toast.success(`Planen "${name}" skapades`); }
  };
  const updateWorkspace = async (p: Partial<Workspace>) => {
    const { error } = await supabase.from("workspaces").update(p).eq("id", wsId);
    fail(error);
    if (!error) setWorkspaces((l) => l.map((w) => (w.id === wsId ? { ...w, ...p } : w)));
  };
  const deleteWorkspace = async () => {
    const rest = workspaces.filter((w) => w.id !== wsId);
    if (!rest.length) { toast.error("Du kan inte ta bort din sista plan"); return; }
    const { error } = await supabase.from("workspaces").delete().eq("id", wsId);
    fail(error);
    if (!error) { setWorkspaces(rest); switchWorkspace(rest[0]!.id); toast.success("Planen togs bort"); }
  };
  const own = (list: { id: string }[], id: string) => list.some((x) => x.id === id);

  const upsert = <T extends { id: string }>(list: T[], item: T) =>
    list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];

  const saveGoal = (g: Goal) => {
    if (!canEdit) { toast.error("Du har bara läsbehörighet i den här planen"); return; }
    const exists = own(goals, g.id);
    setGoals((l) => upsert(l, g));
    const row = {
      title: g.title, category: g.category, status: g.status,
      start_month: g.start, end_month: g.end, milestones: g.milestones as never,
      habit: g.habit ?? "", habit_target: g.habitTarget ?? 0, assignee: g.assignee ?? "",
    };
    (exists ? supabase.from("goals").update(row).eq("id", g.id) : supabase.from("goals").insert({ ...row, id: g.id, workspace_id: wsId }))
      .then(({ error }) => fail(error));
  };
  const deleteGoal = (id: string) => {
    if (role !== "owner") { toast.error("Bara planens ägare kan ta bort mål"); return; }
    setGoals((l) => l.filter((g) => g.id !== id));
    supabase.from("goals").delete().eq("id", id).then(({ error }) => fail(error));
  };
  const saveEvent = (e: PlanEvent) => {
    if (role !== "owner") { toast.error("Bara planens ägare kan ändra händelser"); return; }
    setEvents((l) => upsert(l, e));
    supabase.from("events").upsert({ id: e.id, title: e.title, month: e.month, day: e.day, category: e.category, workspace_id: wsId })
      .then(({ error }) => fail(error));
  };
  const deleteEvent = (id: string) => {
    if (role !== "owner") { toast.error("Bara planens ägare kan ta bort händelser"); return; }
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
    <PlannerCtx.Provider value={{ wsId, workspaces, workspace, role, canEdit, members, people, me, switchWorkspace, reloadMembers, updateWorkspace, createWorkspace, deleteWorkspace, goals, events, reflections, loading, newId: uid, saveGoal, deleteGoal, saveEvent, deleteEvent, setReflection }}>
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
