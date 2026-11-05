import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MONTHS_SHORT, cat, goalProgress, statusLabel, type Goal } from "@/lib/planner";

export const Route = createFileRoute("/delad/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Delad årsplan – Ikoniska" },
      { name: "description", content: "En årsplan som delats med dig via Ikoniska." },
      { property: "og:title", content: "Delad årsplan – Ikoniska" },
      { property: "og:description", content: "En årsplan som delats med dig via Ikoniska." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Shared,
});

type Comment = { author: string; body: string; at: string };
type SGoal = Goal & { comments: Comment[] };
interface Note { id: string; content: string; color: string; x: number; y: number; rotation: number; width: number; height: number; items: { text: string; done: boolean }[]; is_checklist: boolean }
interface Plan {
  locked?: boolean; name: string; goals: SGoal[];
  events: { id: string; title: string; month: number; day: number }[];
  notes: Note[]; quarter_comments: (Comment & { quarter: number })[];
}
type Send = (goal: string | null, quarter: number | null, name: string, body: string) => Promise<boolean>;

const NOTE_BG: Record<string, string> = { yellow: "#fef08a", pink: "#fbcfe8", blue: "#bfdbfe", green: "#bbf7d0", purple: "#e9d5ff", orange: "#fed7aa" };
const input = "rounded-lg border bg-background px-3 py-1.5 text-sm";

function Shared() {
  const { token } = Route.useParams();
  const [plan, setPlan] = useState<Plan | null | undefined>();
  const [pw, setPw] = useState(() => sessionStorage.getItem("sharepw:" + token) ?? "");
  const [tab, setTab] = useState<"mal" | "tid" | "wb">("mal");
  const [bad, setBad] = useState(false);
  const load = (p = pw) => supabase.rpc("get_shared_plan_v2", { _token: token, _pw: p }).then(({ data }) => {
    const d = (data as unknown as Plan) ?? null;
    if (d && !d.locked) sessionStorage.setItem("sharepw:" + token, p);
    setPlan(d); return d;
  });
  useEffect(() => { load(); }, [token]);
  const send: Send = async (goal, quarter, name, body) => {
    if (!body.trim()) return false;
    const { error } = await supabase.rpc("add_shared_comment_v2", { _token: token, _pw: pw, _goal: goal as string, _quarter: quarter as number, _name: name, _body: body });
    if (!error) load();
    return !error;
  };

  if (plan === undefined) return <p className="p-10 text-center text-sm text-muted-foreground">Laddar…</p>;
  if (!plan) return <p className="p-10 text-center text-sm text-muted-foreground">Länken är ogiltig eller har stängts av ägaren.</p>;
  if (plan.locked) return (
    <form className="mx-auto mt-24 max-w-sm space-y-3 rounded-2xl border bg-card p-6 text-center"
      onSubmit={async (e) => { e.preventDefault(); const d = await load(pw); setBad(!!d?.locked); }}>
      <Lock className="mx-auto text-muted-foreground" />
      <h1 className="font-display text-xl font-semibold">Planen är lösenordsskyddad</h1>
      <input type="password" autoFocus className={`${input} w-full`} placeholder="Lösenord" value={pw} onChange={(e) => setPw(e.target.value)} />
      {bad && <p className="text-xs text-destructive">Fel lösenord</p>}
      <button className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Öppna</button>
    </form>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <img src="/ikoniska-logo.webp" alt="Ikoniska" className="logo-img mb-6 h-8 w-auto" />
      <h1 className="font-display text-3xl font-semibold">{plan.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Skrivskyddad vy. Du kan lämna kommentarer på mål och kvartal.</p>
      <div className="mt-6 flex gap-2">
        {([["mal", "Mål"], ["tid", "Tidslinje"], ["wb", "Whiteboard"]] as const).map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} className={`rounded-full px-4 py-1.5 text-sm ring-1 ${tab === id ? "bg-foreground text-background ring-transparent" : "text-muted-foreground ring-border"}`}>{l}</button>
        ))}
      </div>

      {tab === "mal" && (
        <>
          <div className="mt-8 space-y-4">
            {plan.goals.map((g) => <GoalCard key={g.id} g={g} send={send} />)}
            {!plan.goals.length && <p className="text-sm text-muted-foreground">Inga mål ännu.</p>}
          </div>
          {plan.events.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-3 font-display text-xl font-semibold">Händelser</h2>
              <ul className="divide-y rounded-2xl border bg-card">
                {plan.events.map((e) => <li key={e.id} className="flex gap-4 px-4 py-2.5 text-sm"><span className="w-16 text-muted-foreground">{e.day} {MONTHS_SHORT[e.month]}</span>{e.title}</li>)}
              </ul>
            </section>
          )}
        </>
      )}

      {tab === "tid" && (
        <div className="mt-8 space-y-6">
          <div className="overflow-x-auto rounded-2xl border bg-card p-4">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-[180px_repeat(12,1fr)] text-[11px] text-muted-foreground">
                <span />{MONTHS_SHORT.map((m) => <span key={m} className="text-center">{m}</span>)}
              </div>
              {plan.goals.map((g) => (
                <div key={g.id} className="mt-2 grid grid-cols-[180px_repeat(12,1fr)] items-center">
                  <span className="truncate pr-2 text-sm">{g.title}</span>
                  <div className={`h-5 rounded-full ${cat(g.category).dot}`} style={{ gridColumn: `${g.start + 2} / ${g.end + 3}` }} />
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((q) => <QuarterCard key={q} q={q} comments={plan.quarter_comments.filter((c) => c.quarter === q)} send={send} />)}
          </div>
        </div>
      )}

      {tab === "wb" && (
        <div className="relative mt-8 h-[700px] overflow-auto rounded-2xl border bg-muted/30">
          {plan.notes.map((n) => (
            <div key={n.id} className="absolute rounded-md p-3 text-sm text-neutral-900 shadow"
              style={{ left: n.x, top: n.y, width: n.width, minHeight: n.height, transform: `rotate(${n.rotation}deg)`, background: NOTE_BG[n.color] ?? NOTE_BG["yellow"] }}>
              <p className="whitespace-pre-wrap">{n.content}</p>
              {n.is_checklist && <ul className="mt-1">{(n.items ?? []).map((it, i) => <li key={i} className={it.done ? "line-through opacity-60" : ""}>{it.done ? "☑" : "☐"} {it.text}</li>)}</ul>}
            </div>
          ))}
          {!plan.notes.length && <p className="p-6 text-sm text-muted-foreground">Whiteboarden är tom.</p>}
        </div>
      )}
    </div>
  );
}

function CommentBox({ comments, onSend }: { comments: Comment[]; onSend: (name: string, body: string) => Promise<boolean> }) {
  const [name, setName] = useState(""); const [body, setBody] = useState("");
  const go = async () => { if (await onSend(name, body)) setBody(""); };
  return (
    <div className="mt-3 space-y-2 border-t pt-3">
      {comments.map((k, i) => <p key={i} className="text-sm"><b>{k.author || "Anonym"}:</b> {k.body}</p>)}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input className={`${input} sm:w-36`} placeholder="Ditt namn" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={`${input} flex-1`} placeholder="Skriv en kommentar" maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
        <button onClick={go} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">Skicka</button>
      </div>
    </div>
  );
}

function QuarterCard({ q, comments, send }: { q: number; comments: Comment[]; send: Send }) {
  return (
    <article className="rounded-2xl border bg-card p-5">
      <h3 className="font-display text-lg font-semibold">Q{q} <span className="text-sm font-normal text-muted-foreground">{MONTHS_SHORT[(q - 1) * 3]} – {MONTHS_SHORT[(q - 1) * 3 + 2]}</span></h3>
      <CommentBox comments={comments} onSend={(n, b) => send(null, q, n, b)} />
    </article>
  );
}

function GoalCard({ g, send }: { g: SGoal; send: Send }) {
  const c = cat(g.category); const p = goalProgress(g);
  const [open, setOpen] = useState(false);
  return (
    <article className="rounded-2xl border bg-card p-5">
      <span className={`mb-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${c.cls}`}>{c.label}</span>
      <h3 className="font-display text-lg font-semibold">{g.title}</h3>
      <p className="text-xs text-muted-foreground">{MONTHS_SHORT[g.start]} – {MONTHS_SHORT[g.end]} · {statusLabel(g.status)}</p>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className={`h-full ${c.dot}`} style={{ width: `${p}%` }} /></div>
        <span className="text-xs tabular-nums text-muted-foreground">{p}%</span>
      </div>
      {g.milestones.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">{g.milestones.map((m) => <li key={m.id} className={m.done ? "text-muted-foreground line-through" : ""}>{m.done ? "✓" : "○"} {m.title}</li>)}</ul>
      )}
      <button onClick={() => setOpen(!open)} className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <MessageSquare size={13} /> {g.comments.length} kommentarer
      </button>
      {open && <CommentBox comments={g.comments} onSend={(n, b) => send(g.id, null, n, b)} />}
    </article>
  );
}
