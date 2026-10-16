import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Award, Download, Loader2, Sparkles, Copy, Lightbulb, Compass } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { btnGhost, btnPrimary } from "@/components/Dialogs";
import { supabase } from "@/integrations/supabase/client";
import { generateYearReview, type YearReview } from "@/lib/ai.functions";
import { CATEGORIES, usePlanner } from "@/lib/planner";

export const Route = createFileRoute("/_authenticated/arsbokslut")({
  head: () => ({
    meta: [
      { title: "Årsbokslut – Ikoniska" },
      { name: "description", content: "AI-genererat årsbokslut med framgångar, insikter och delbara kort." },
      { property: "og:title", content: "Årsbokslut – Ikoniska" },
      { property: "og:description", content: "AI-genererat årsbokslut med framgångar, insikter och delbara kort." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: YearInReview,
});

function YearInReview() {
  const { goals, events, reflections } = usePlanner();
  const year = new Date().getFullYear();
  const [review, setReview] = useState<YearReview | null>(null);
  const [busy, setBusy] = useState(false);
  const gen = useServerFn(generateYearReview);

  useEffect(() => {
    supabase.from("year_reviews").select("content").eq("year", year).maybeSingle()
      .then(({ data }) => { if (data?.content && (data.content as unknown as YearReview).wins) setReview(data.content as unknown as YearReview); });
  }, [year]);

  const stats = useMemo(() => {
    const ms = goals.flatMap((g) => g.milestones);
    const done = goals.filter((g) => g.status === "slutford").length;
    const byCat = CATEGORIES.map((c) => ({ c, n: goals.filter((g) => g.category === c.id).length })).sort((a, b) => b.n - a.n);
    const qDone = [0, 1, 2, 3].map((q) => goals.filter((g) => g.status === "slutford" && Math.floor(g.end / 3) === q).length);
    const bestQ = qDone.indexOf(Math.max(...qDone));
    return {
      goals: goals.length, done, milestones: ms.filter((m) => m.done).length, events: events.length,
      reflections: Object.values(reflections).filter((r) => Object.values(r).some((v) => v?.trim())).length,
      rate: goals.length ? Math.round((done / goals.length) * 100) : 0,
      topCat: byCat[0]?.n ? byCat[0].c.label : "–", bestQ: Math.max(...qDone) ? `Q${bestQ + 1}` : "–",
    };
  }, [goals, events, reflections]);

  const run = async () => {
    setBusy(true);
    try { setReview(await gen({ data: { year } })); toast.success("Ditt årsbokslut är klart!"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Kunde inte skapa årsbokslut."); }
    finally { setBusy(false); }
  };

  const copyText = () => {
    const t = `Mitt ${year} i siffror 🎯\n✅ ${stats.done} av ${stats.goals} mål slutförda\n🏁 ${stats.milestones} delmål avbockade\n📅 ${stats.events} händelser\n${review ? "\nStörsta framgångar:\n" + review.wins.map((w) => `• ${w.title}`).join("\n") : ""}\n\nPlanerat med Ikoniska`;
    navigator.clipboard.writeText(t).then(() => toast.success("Text kopierad – klistra in på LinkedIn!"));
  };

  return (
    <>
      <PageHeader title={`Årsbokslut ${year}`} sub="Låt AI läsa dina mål, händelser och reflektioner och sammanfatta året.">
        <button className={btnPrimary} onClick={run} disabled={busy}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} {busy ? "Analyserar…" : review ? "Generera om" : "Skapa årsbokslut"}
        </button>
      </PageHeader>

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Mål slutförda", `${stats.done}/${stats.goals}`], ["Delmål avbockade", stats.milestones], ["Slutförandegrad", `${stats.rate}%`], ["Starkaste kvartal", stats.bestQ]].map(([l, v]) => (
          <div key={l} className="rounded-2xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="mt-1 font-display text-2xl font-semibold">{v}</p>
          </div>
        ))}
      </div>

      {!review && !busy && (
        <div className="mb-8 rounded-2xl border border-dashed bg-card p-10 text-center">
          <Award className="mx-auto mb-3 text-primary" />
          <p className="font-medium">Inget årsbokslut ännu</p>
          <p className="mt-1 text-sm text-muted-foreground">Klicka på "Skapa årsbokslut" – det tar oftast en halv minut.</p>
        </div>
      )}

      {review && (
        <div className="mb-10 space-y-8">
          <h2 className="font-display text-3xl font-semibold tracking-tight">{review.headline}</h2>
          <section>
            <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold"><Award size={18} className="text-primary" /> Dina 3 största framgångar {year}</h3>
            <div className="grid gap-3 md:grid-cols-3">
              {review.wins.map((w, i) => (
                <div key={i} className="rounded-2xl border bg-card p-5">
                  <p className="font-display text-3xl font-semibold text-primary">{i + 1}</p>
                  <p className="mt-2 font-medium">{w.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{w.why}</p>
                </div>
              ))}
            </div>
          </section>
          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-2xl border bg-card p-5">
              <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold"><Lightbulb size={18} className="text-primary" /> Mönster & insikter</h3>
              <ul className="space-y-2 text-sm">{review.patterns.map((p, i) => <li key={i} className="flex gap-2"><span className="text-primary">•</span>{p}</li>)}</ul>
            </section>
            <section className="rounded-2xl border bg-card p-5">
              <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold"><Compass size={18} className="text-primary" /> Rekommendationer för {year + 1}</h3>
              <ol className="space-y-2 text-sm">{review.recommendations.map((p, i) => <li key={i} className="flex gap-2"><span className="font-semibold text-primary">{i + 1}.</span>{p}</li>)}</ol>
            </section>
          </div>
        </div>
      )}

      <section>
        <h3 className="mb-1 font-display text-lg font-semibold">Delbara kort</h3>
        <p className="mb-4 text-sm text-muted-foreground">Ladda ner "Mitt {year} i siffror" för Instagram Stories eller LinkedIn.</p>
        <div className="flex flex-wrap gap-3">
          <button className={btnGhost} onClick={() => downloadCard("story", year, stats, review)}><Download size={15} /> Story (9:16)</button>
          <button className={btnGhost} onClick={() => downloadCard("square", year, stats, review)}><Download size={15} /> LinkedIn (1:1)</button>
          <button className={btnGhost} onClick={copyText}><Copy size={15} /> Kopiera text</button>
        </div>
      </section>
    </>
  );
}

type Stats = { goals: number; done: number; milestones: number; events: number; rate: number; topCat: string; bestQ: string };

// Kort ritas på canvas så de blir delbara bilder; färgerna är kortets egna varumärkesfärger.
function downloadCard(kind: "story" | "square", year: number, s: Stats, review: YearReview | null) {
  const W = 1080, H = kind === "story" ? 1920 : 1080;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d")!;
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#1a1410"); g.addColorStop(1, "#2b1608");
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = "rgba(255,122,26,0.18)"; x.beginPath(); x.arc(W * 0.9, H * 0.1, 380, 0, Math.PI * 2); x.fill();
  const font = (w: number, sz: number) => `${w} ${sz}px "Bricolage Grotesque", Figtree, sans-serif`;
  const story = kind === "story";
  let y = story ? 220 : 130;
  x.fillStyle = "#ff7a1a"; x.font = font(600, 40); x.fillText("IKONISKA", 90, y);
  y += story ? 140 : 100;
  x.fillStyle = "#fff"; x.font = font(700, story ? 120 : 92); x.fillText(`Mitt ${year}`, 90, y);
  y += story ? 110 : 90; x.fillStyle = "rgba(255,255,255,0.6)"; x.font = font(500, story ? 70 : 56); x.fillText("i siffror", 90, y);
  const items: [string, string][] = [[`${s.done}/${s.goals}`, "mål slutförda"], [String(s.milestones), "delmål avbockade"], [`${s.rate}%`, "slutförandegrad"], [s.bestQ, "starkaste kvartal"]];
  y += story ? 140 : 80;
  const colW = (W - 180) / 2, rowH = story ? 260 : 200;
  items.forEach(([v, l], i) => {
    const cx = 90 + (i % 2) * colW, cy = y + Math.floor(i / 2) * rowH;
    x.fillStyle = "#ff7a1a"; x.font = font(700, story ? 120 : 96); x.fillText(v, cx, cy + (story ? 110 : 90));
    x.fillStyle = "rgba(255,255,255,0.75)"; x.font = font(500, 36); x.fillText(l, cx, cy + (story ? 165 : 140));
  });
  if (story && review) {
    let wy = y + rowH * 2 + 80;
    x.fillStyle = "#fff"; x.font = font(600, 44); x.fillText("Största framgångar", 90, wy);
    x.font = font(500, 38); x.fillStyle = "rgba(255,255,255,0.85)";
    review.wins.forEach((w) => { wy += 70; const t = w.title.length > 40 ? w.title.slice(0, 39) + "…" : w.title; x.fillText(`✦  ${t}`, 90, wy); });
  }
  x.fillStyle = "rgba(255,255,255,0.5)"; x.font = font(500, 32); x.fillText("Planerat med Ikoniska", 90, H - 90);
  const a = document.createElement("a");
  a.download = `ikoniska-${year}-${kind}.png`; a.href = c.toDataURL("image/png"); a.click();
}
