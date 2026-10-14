import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarRange, LayoutGrid, Sparkles } from "lucide-react";
import preview from "@/assets/app-preview.jpg";
import { btnGhost, btnPrimary } from "@/components/Dialogs";
import logo from "@/assets/ikoniska-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ikoniska – hela årets planer i en tydlig överblick" },
      { name: "description", content: "Sätt mål, planera kvartal för kvartal och reflektera över ditt år – samlat på ett ställe." },
      { property: "og:title", content: "Ikoniska – hela årets planer i en tydlig överblick" },
      { property: "og:description", content: "Sätt mål, planera kvartal för kvartal och reflektera över ditt år – samlat på ett ställe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const benefits = [
  { icon: LayoutGrid, title: "Hela året på en skärm", text: "Se alla tolv månader, uppdelade i kvartal, och vet direkt vad som väntar." },
  { icon: CalendarRange, title: "Mål som blir av", text: "Bryt ner stora mål i delmål, följ status och se framstegen växa." },
  { icon: Sparkles, title: "Lär dig av ditt år", text: "Korta reflektionsfrågor varje månad och kvartal hjälper dig justera kursen." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link to="/" aria-label="Ikoniska – startsida">
          <img src={logo.url} alt="Ikoniska" className="logo-img h-10 w-auto" />
        </Link>
        <nav className="flex items-center gap-2">
          <Link to="/auth" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">Logga in</Link>
          <Link to="/auth" className={btnPrimary}>Kom igång</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-4xl px-5 pb-12 pt-12 text-center sm:pt-20">
        <p className="mb-4 inline-block rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">Din årsplanering, enklare</p>
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
          Hela årets planer, samlade i en tydlig överblick.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Sätt mål, planera händelser och följ dina framsteg kvartal för kvartal – utan krångel.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/auth" className={`${btnPrimary} px-6 py-3 text-base`}>Kom igång <ArrowRight size={16} /></Link>
          <a href="#exempel" className={`${btnGhost} px-6 py-3 text-base`}>Se exempel</a>
        </div>
      </section>

      <section id="exempel" className="mx-auto max-w-6xl scroll-mt-8 px-5">
        <div className="overflow-hidden rounded-2xl border bg-card p-2 shadow-soft">
          <img src={preview} alt="Ikoniska visar årets tolv månader indelade i kvartal med färgkodade mål" className="w-full rounded-xl" width={1600} height={1000} />
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-20 md:grid-cols-3">
        {benefits.map((b) => (
          <div key={b.title} className="rounded-2xl border bg-card p-6">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><b.icon size={20} /></span>
            <h2 className="mt-4 font-display text-lg font-semibold">{b.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{b.text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-4xl px-5 pb-20 text-center">
        <h2 className="font-display text-3xl font-semibold">Redo att planera ditt år?</h2>
        <p className="mt-3 text-muted-foreground">Skapa ett konto gratis – du får en exempelplan att utgå från.</p>
        <Link to="/auth" className={`${btnPrimary} mt-6 px-6 py-3 text-base`}>Kom igång <ArrowRight size={16} /></Link>
      </section>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} Ikoniska</footer>
    </div>
  );
}
