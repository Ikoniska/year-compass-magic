import { Link, useNavigate, useRouteContext } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { LayoutGrid, Target, GanttChart, NotebookPen, Printer, Moon, Sun, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/", label: "Översikt", icon: LayoutGrid },
  { to: "/mal", label: "Mål", icon: Target },
  { to: "/tidslinje", label: "Tidslinje", icon: GanttChart },
  { to: "/reflektion", label: "Reflektion", icon: NotebookPen },
  { to: "/rapport", label: "Exportera", icon: Printer },
] as const;

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(localStorage.getItem("theme") === "dark"); }, []);
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);
  return (
    <button aria-label="Byt tema" onClick={() => { localStorage.setItem("theme", dark ? "light" : "dark"); setDark(!dark); }}
      className="rounded-lg border bg-card p-2 text-muted-foreground transition hover:text-foreground">
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useRouteContext({ from: "/_authenticated" });
  const email = user.email ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar p-4 md:flex md:sticky md:top-0 md:h-screen">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground">Å</div>
          <span className="font-display text-lg font-semibold">Årsplan</span>
        </div>
        <nav className="space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} activeOptions={{ exact: true }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground"
              activeProps={{ className: "bg-sidebar-accent text-foreground font-medium" }}>
              <Icon size={16} /> {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-3 px-2 text-xs text-muted-foreground">
          <div className="truncate" title={email}>{email}</div>
          <div className="flex items-center justify-between">
            <button onClick={signOut} className="flex items-center gap-1.5 hover:text-foreground"><LogOut size={14} /> Logga ut</button>
            <ThemeToggle />
          </div>
        </div>
      </aside>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/85 px-4 py-3 backdrop-blur md:hidden">
        <span className="font-display text-lg font-semibold">Årsplan</span>
        <div className="flex items-center gap-2">
          <button aria-label="Logga ut" onClick={signOut} className="rounded-lg border bg-card p-2 text-muted-foreground hover:text-foreground"><LogOut size={16} /></button>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 md:px-10 md:pb-10 md:pt-10">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-background/95 backdrop-blur md:hidden">
        {NAV.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} activeOptions={{ exact: true }} className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground"
            activeProps={{ className: "text-primary" }}>
            <Icon size={18} />{label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
        {sub && <p className="mt-1.5 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  );
}
