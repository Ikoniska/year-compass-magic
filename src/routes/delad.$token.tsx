import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
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

type SGoal = Goal & { comments: { author: string; body: string; at: string }[] };
interface Plan { name: string; goals: SGoal[]; events: { id: string; title: string; month: number; day: number }[] }

function Shared() {
  const { token } = Route.useParams();
  const [plan, setPlan] = useState<Plan | null | undefined>();
  const load = () => supabase.rpc("get_shared_plan", { _token: token }).then(({ data }) => setPlan((data as unknown as Plan) ?? null));
  useEffect(() => { load(); }, [token]);

  if (plan === undefined) return <p className="p-10 text-center text-sm text-muted-foreground">Laddar…</p>;
  if (!plan) return <p className="p-10 text-center text-sm text-muted-foreground">Länken är ogiltig eller har stängts av ägaren.</p>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <img src="/ikoniska-logo.webp" alt="Ikoniska" className="logo-img mb-6 h-8 w-auto" />
      <h1 className="font-display text-3xl font-semibold">{plan.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Skrivskyddad vy. Du kan lämna kommentarer på målen.</p>
      <div className="mt-8 space-y-4">
        {plan.goals.map((g) => <GoalCard key={g.id} g={g} token={token} onSaved={load} />)}
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
    </div>
  );
}

function GoalCard({ g, token, onSaved }: { g: SGoal; token: string; onSaved: () => void }) {
  const c = cat(g.category); const p = goalProgress(g);
  const [name, setName] = useState(""); const [body, setBody] = useState(""); const [open, setOpen] = useState(false);
  const send = async () => {
    if (!body.trim()) return;
    const { error } = await supabase.rpc("add_shared_comment", { _token: token, _goal: g.id, _name: name, _body: body });
    if (!error) { setBody(""); onSaved(); }
  };
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
      {open && (
        <div className="mt-3 space-y-2 border-t pt-3">
          {g.comments.map((k, i) => <p key={i} className="text-sm"><b>{k.author || "Anonym"}:</b> {k.body}</p>)}
          <div className="flex flex-col gap-2 sm:flex-row">
            <input className="rounded-lg border bg-background px-3 py-1.5 text-sm sm:w-36" placeholder="Ditt namn" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="flex-1 rounded-lg border bg-background px-3 py-1.5 text-sm" placeholder="Skriv en kommentar" maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
            <button onClick={send} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">Skicka</button>
          </div>
        </div>
      )}
    </article>
  );
}
