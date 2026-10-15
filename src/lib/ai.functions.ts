import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MONTHS = ["januari", "februari", "mars", "april", "maj", "juni", "juli", "augusti", "september", "oktober", "november", "december"];

export const suggestMilestones = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { title: string; category: string; start: number; end: number; existing: string[] }) => {
    if (!d.title?.trim() || d.title.length > 300) throw new Error("Ange en måltitel först.");
    return { ...d, existing: (d.existing ?? []).slice(0, 30) };
  })
  .handler(async ({ data }) => {
    const key = process.env['LOVABLE_API_KEY'];
    if (!key) throw new Error("AI är inte konfigurerat.");
    const prompt = `Mål: "${data.title}" (kategori: ${data.category}). Tidsram: ${MONTHS[data.start]} till ${MONTHS[data.end]}.
${data.existing.length ? `Befintliga delmål (upprepa inte): ${data.existing.join("; ")}` : ""}
Föreslå 3–5 konkreta, mätbara delmål på svenska i kronologisk ordning, fördelade över tidsramen. Varje delmål max 80 tecken och kan börja med månad, t.ex. "Mars: ...".`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        instructions: "Du är en pragmatisk målcoach som bryter ned årsmål i tydliga delmål.",
        input: prompt,
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        text: {
          format: {
            type: "json_schema", name: "milestones", strict: true,
            schema: {
              type: "object", additionalProperties: false, required: ["milestones"],
              properties: { milestones: { type: "array", items: { type: "string" } } },
            },
          },
        },
      }),
    });
    if (!res.ok || !res.body) {
      if (res.status === 429) throw new Error("För många förfrågningar just nu, försök igen om en stund.");
      if (res.status === 402) throw new Error("AI-krediterna är slut för arbetsytan.");
      throw new Error(`AI-tjänsten svarade med fel (${res.status}).`);
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const l of lines) {
        if (!l.startsWith("data:")) continue;
        const p = l.slice(5).trim();
        if (!p || p === "[DONE]") continue;
        try {
          const ev = JSON.parse(p);
          if (ev.type === "response.output_text.delta") text += ev.delta;
          if (ev.type === "error" || ev.type === "response.failed") throw new Error("AI kunde inte skapa förslag.");
        } catch (e) { if (e instanceof Error && e.message.startsWith("AI")) throw e; }
      }
    }
    try {
      const out = JSON.parse(text) as { milestones: string[] };
      return { milestones: out.milestones.map((m) => m.trim()).filter(Boolean).slice(0, 6) };
    } catch {
      throw new Error("AI kunde inte skapa förslag.");
    }
  });

async function streamJson(key: string, instructions: string, input: string, name: string, schema: object): Promise<unknown> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra", instructions, input, stream: true, store: false,
      reasoning: { effort: "medium" },
      text: { format: { type: "json_schema", name, strict: true, schema } },
    }),
  });
  if (!res.ok || !res.body) {
    if (res.status === 429) throw new Error("För många förfrågningar just nu, försök igen om en stund.");
    if (res.status === 402) throw new Error("AI-krediterna är slut för arbetsytan.");
    if (res.status === 403) throw new Error("AI är inte tillgängligt för arbetsytan just nu.");
    throw new Error(`AI-tjänsten svarade med fel (${res.status}).`);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const l of lines) {
      if (!l.startsWith("data:")) continue;
      const p = l.slice(5).trim();
      if (!p || p === "[DONE]") continue;
      let ev: { type?: string; delta?: string };
      try { ev = JSON.parse(p); } catch { continue; }
      if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
      if (ev.type === "error" || ev.type === "response.failed") throw new Error("AI kunde inte skapa analysen.");
    }
  }
  try { return JSON.parse(text); } catch { throw new Error("AI kunde inte skapa analysen."); }
}

export interface YearReview {
  headline: string;
  wins: { title: string; why: string }[];
  patterns: string[];
  recommendations: string[];
}

const strArr = { type: "array", items: { type: "string" } };

export const generateYearReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { year: number }) => ({ year: Math.round(Number(d.year)) || new Date().getFullYear() }))
  .handler(async ({ data, context }) => {
    const key = process.env['LOVABLE_API_KEY'];
    if (!key) throw new Error("AI är inte konfigurerat.");
    const sb = context.supabase;
    const [g, e, r, q] = await Promise.all([
      sb.from("goals").select("title,category,status,start_month,end_month,milestones,habit,habit_target"),
      sb.from("events").select("title,month,day,category"),
      sb.from("reflections").select("period_key,answers"),
      sb.from("quarter_energy").select("quarter,level").eq("year", data.year),
    ]);
    const goals = (g.data ?? []).map((x) => ({
      titel: x.title, kategori: x.category, status: x.status,
      period: `${MONTHS[x.start_month]}–${MONTHS[x.end_month]}`,
      delmal: ((x.milestones as { title: string; done: boolean }[] | null) ?? []).map((m) => `${m.done ? "[klar]" : "[öppen]"} ${m.title}`),
      vana: x.habit ? `${x.habit} (${x.habit_target} dgr/v)` : undefined,
    }));
    const events = (e.data ?? []).map((x) => `${x.day} ${MONTHS[x.month]}: ${x.title}`);
    const refl = (r.data ?? []).filter((x) => x.period_key.startsWith(String(data.year)) || !/^\d{4}/.test(x.period_key))
      .map((x) => ({ period: x.period_key, svar: x.answers }));
    const input = `År: ${data.year}\nMål: ${JSON.stringify(goals).slice(0, 12000)}\nHändelser: ${events.join("; ").slice(0, 3000)}\nReflektioner: ${JSON.stringify(refl).slice(0, 12000)}\nPlanerad energi per kvartal: ${JSON.stringify(q.data ?? [])}
Skriv ett personligt årsbokslut på svenska i du-form:
- headline: en kort, varm rubrik för året (max 60 tecken)
- wins: exakt 3 största framgångar, title (max 60 tecken) och why (1–2 meningar om varför det betydde något)
- patterns: 3–4 mönster och insikter ur reflektionerna (t.ex. när energin var högst, vad som gav bäst utväxling)
- recommendations: 3 konkreta rekommendationer för nästa år
Basera allt på datan; hitta inte på fakta.`;
    const out = await streamJson(key, "Du är en klok, uppmuntrande coach som skriver insiktsfulla årsbokslut.", input, "year_review", {
      type: "object", additionalProperties: false, required: ["headline", "wins", "patterns", "recommendations"],
      properties: {
        headline: { type: "string" },
        wins: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "why"], properties: { title: { type: "string" }, why: { type: "string" } } } },
        patterns: strArr, recommendations: strArr,
      },
    }) as YearReview;
    const review: YearReview = {
      headline: String(out.headline ?? "").slice(0, 120),
      wins: (out.wins ?? []).slice(0, 3), patterns: (out.patterns ?? []).slice(0, 4), recommendations: (out.recommendations ?? []).slice(0, 3),
    };
    const { error } = await sb.from("year_reviews").upsert({ user_id: context.userId, year: data.year, content: review as never, created_at: new Date().toISOString() });
    if (error) throw new Error("Kunde inte spara årsbokslutet.");
    return review;
  });
