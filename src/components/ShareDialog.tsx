import { useState } from "react";
import { Copy, RefreshCw, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Modal, btnGhost, btnPrimary } from "@/components/Dialogs";
import { usePlanner } from "@/lib/planner";

const field = "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
const newToken = () => crypto.randomUUID().replace(/-/g, "");

export function ShareDialog({ onClose }: { onClose: () => void }) {
  const { workspace, role, members, reloadMembers, updateWorkspace } = usePlanner();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [r, setR] = useState<"viewer" | "editor">("viewer");
  const owner = role === "owner";
  const [pw, setPw] = useState("");
  const savePw = async (v: string) => {
    if (!workspace) return;
    const { error } = await supabase.rpc("set_share_password", { _ws: workspace.id, _pw: v });
    if (error) { toast.error("Kunde inte spara lösenord"); return; }
    setPw(""); await updateWorkspace({ share_has_password: !!v.trim() }); toast.success(v ? "Lösenord satt" : "Lösenord borttaget");
  };
  if (!workspace) return null;
  const link = workspace.share_token ? `${window.location.origin}/delad/${workspace.share_token}` : "";

  const toggle = () => updateWorkspace({ share_enabled: !workspace.share_enabled, share_token: workspace.share_token ?? newToken() });
  const invite = async () => {
    const e = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(e)) { toast.error("Ange en giltig e-postadress"); return; }
    const { error } = await supabase.from("workspace_members").insert({ workspace_id: workspace.id, email: e, name: name.trim(), role: r });
    if (error) { toast.error(error.code === "23505" ? "Personen är redan inbjuden" : "Kunde inte bjuda in: " + error.message); return; }
    setEmail(""); setName(""); reloadMembers();
    toast.success("Inbjuden! Personen loggar in med sin e-post och väljer planen i menyn.");
  };
  const setRole = async (id: string, role: string) => { await supabase.from("workspace_members").update({ role }).eq("id", id); reloadMembers(); };
  const remove = async (id: string) => { await supabase.from("workspace_members").delete().eq("id", id); reloadMembers(); };

  return (
    <Modal title={`Dela "${workspace.name}"`} onClose={onClose}>
      {!owner ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Du är {role === "editor" ? "medredaktör" : "tittare"} i den här planen. Bara ägaren kan ändra delning.</p>
          <h3 className="text-sm font-semibold">Personer i planen ({members.length + 1})</h3>
          <ul className="divide-y rounded-lg border">
            <li className="flex items-center gap-2 px-3 py-2 text-sm"><Who name={workspace.owner_name} email={workspace.owner_email} /><span className="text-xs text-muted-foreground">Ägare</span></li>
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-2 px-3 py-2 text-sm"><Who name={m.name} email={m.email} /><span className="text-xs text-muted-foreground">{m.role === "editor" ? "Medredaktör" : "Tittare"}</span></li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="space-y-6">
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Hemlig tittarlänk</h3>
              <button onClick={toggle} role="switch" aria-checked={workspace.share_enabled}
                className={`relative h-6 w-11 rounded-full transition ${workspace.share_enabled ? "bg-primary" : "bg-muted"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition ${workspace.share_enabled ? "left-5" : "left-0.5"}`} />
              </button>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">Alla med länken kan se mål och tidslinje och lämna kommentarer, utan att logga in.</p>
            {workspace.share_enabled && (
              <div className="flex gap-2">
                <input readOnly className={field} value={link} onFocus={(e) => e.target.select()} />
                <button className={btnGhost} aria-label="Kopiera länk" onClick={() => { navigator.clipboard.writeText(link); toast.success("Länken kopierad"); }}><Copy size={14} /></button>
                <button className={btnGhost} aria-label="Byt länk" title="Byt länk (gamla slutar fungera)" onClick={() => updateWorkspace({ share_token: newToken() })}><RefreshCw size={14} /></button>
              </div>
            )}
            {workspace.share_enabled && (
              <div className="mt-3 flex gap-2">
                <input type="password" className={field} placeholder={workspace.share_has_password ? "Lösenord satt – skriv nytt för att byta" : "Lösenord (valfritt)"} value={pw} onChange={(e) => setPw(e.target.value)} />
                <button className={btnGhost} onClick={() => savePw(pw)}>Spara</button>
                {workspace.share_has_password && <button className={btnGhost} onClick={() => savePw("")}>Ta bort</button>}
              </div>
            )}
          </section>
          <section>
            <h3 className="mb-2 text-sm font-semibold">Bjud in personer</h3>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input className={field} placeholder="E-post" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input className={field} placeholder="Namn (valfritt)" value={name} onChange={(e) => setName(e.target.value)} />
              <select className={field} value={r} onChange={(e) => setR(e.target.value as "viewer" | "editor")}>
                <option value="viewer">Tittare</option><option value="editor">Medredaktör</option>
              </select>
            </div>
            <button className={`${btnPrimary} mt-2 w-full`} onClick={invite}><UserPlus size={14} /> Bjud in</button>
            <h3 className="mt-5 text-sm font-semibold">Personer i planen ({members.length + 1})</h3>
            <ul className="mt-2 divide-y rounded-lg border">
              <li className="flex items-center gap-2 px-3 py-2 text-sm"><Who name={workspace.owner_name} email={workspace.owner_email} /><span className="text-xs text-muted-foreground">Ägare</span></li>
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <Who name={m.name} email={m.email} />
                  <select className="rounded-md border bg-background px-1 py-0.5 text-xs" value={m.role} onChange={(e) => setRole(m.id, e.target.value)}>
                    <option value="viewer">Tittare</option><option value="editor">Medredaktör</option>
                  </select>
                  <button aria-label="Ta bort" onClick={() => remove(m.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </Modal>
  );
}

function Who({ name, email }: { name?: string; email: string }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate font-medium">{name || email}</span>
      {name && <span className="block truncate text-xs text-muted-foreground">{email}</span>}
    </span>
  );
}
