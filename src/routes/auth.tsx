import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
const logo = { url: "/ikoniska-logo.webp" };

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Logga in – Ikoniska" },
      { name: "description", content: "Logga in eller skapa ett konto för att planera ditt år med Ikoniska." },
      { property: "og:title", content: "Logga in – Ikoniska" },
      { property: "og:description", content: "Logga in eller skapa ett konto för att planera ditt år." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const input = "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (active && !error && data.session) navigate({ to: "/oversikt", replace: true });
    }).catch(() => {
      // Stay on the sign-in form if the stored session cannot be read.
    });
    return () => { active = false; };
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "up") {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        toast.success("Kolla din e-post för att bekräfta kontot.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        toast.success("Vi har skickat en länk för att återställa lösenordet.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Något gick fel");
    } finally { setBusy(false); }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Kunde inte logga in med Google");
  }

  const title = mode === "in" ? "Logga in" : mode === "up" ? "Skapa konto" : "Återställ lösenord";

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <img src={logo.url} alt="Ikoniska" className="logo-img h-9 w-auto" />
        </div>
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        {mode !== "forgot" && (
          <>
            <button onClick={google} className="mt-6 w-full rounded-lg border bg-background px-3 py-2 text-sm font-medium transition hover:bg-accent">
              Fortsätt med Google
            </button>
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />eller<div className="h-px flex-1 bg-border" /></div>
          </>
        )}
        <form onSubmit={submit} className={`space-y-3 ${mode === "forgot" ? "mt-6" : ""}`}>
          <input className={input} type="email" required placeholder="E-post" value={email} onChange={(e) => setEmail(e.target.value)} />
          {mode !== "forgot" && (
            <input className={input} type="password" required minLength={6} placeholder="Lösenord" value={password} onChange={(e) => setPassword(e.target.value)} />
          )}
          <button disabled={busy} className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60">
            {mode === "in" ? "Logga in" : mode === "up" ? "Skapa konto" : "Skicka länk"}
          </button>
        </form>
        <div className="mt-5 space-y-1 text-center text-sm text-muted-foreground">
          {mode === "in" && <>
            <button className="block w-full hover:text-foreground" onClick={() => setMode("forgot")}>Glömt lösenord?</button>
            <button className="block w-full hover:text-foreground" onClick={() => setMode("up")}>Inget konto? Skapa ett</button>
          </>}
          {mode !== "in" && <button className="hover:text-foreground" onClick={() => setMode("in")}>Tillbaka till inloggning</button>}
        </div>
      </div>
    </div>
  );
}
