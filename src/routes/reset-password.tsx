import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nytt lösenord – Årsplan" },
      { name: "description", content: "Välj ett nytt lösenord för ditt Årsplan-konto." },
      { property: "og:title", content: "Nytt lösenord – Årsplan" },
      { property: "og:description", content: "Välj ett nytt lösenord för ditt Årsplan-konto." },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Lösenordet är uppdaterat");
    navigate({ to: "/oversikt", replace: true });
  }
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border bg-card p-8 shadow-sm">
        <h1 className="font-display text-2xl font-semibold">Välj nytt lösenord</h1>
        <input type="password" required minLength={6} placeholder="Nytt lösenord" value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <button disabled={busy} className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">Spara</button>
      </form>
    </div>
  );
}
