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
