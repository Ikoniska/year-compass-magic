import type { Person } from "@/lib/planner";

export function Avatar({ person, size = 22 }: { person?: Person | undefined; size?: number }) {
  if (!person) return null;
  return (
    <span title={person.label} style={{ width: size, height: size, fontSize: size * 0.42 }}
      className={`inline-grid shrink-0 place-items-center rounded-full font-semibold ${person.color}`}>
      {person.initials}
    </span>
  );
}

export function PersonFilter({ people, value, onChange }: { people: Person[]; value: string; onChange: (v: string) => void }) {
  if (people.length < 2) return null;
  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-muted/70 p-1">
      <button onClick={() => onChange("")}
        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${value === "" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Alla</button>
      {people.map((p) => (
        <button key={p.email} onClick={() => onChange(p.email)} title={p.label}
          className={`rounded-lg p-1 transition ${value === p.email ? "bg-card shadow-sm" : "opacity-70 hover:opacity-100"}`}>
          <Avatar person={p} />
        </button>
      ))}
    </div>
  );
}
