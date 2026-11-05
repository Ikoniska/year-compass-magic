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
    <div className="flex flex-wrap items-center gap-1.5">
      <button onClick={() => onChange("")}
        className={`rounded-full px-2.5 py-1 text-xs ring-1 ${value === "" ? "bg-foreground text-background ring-transparent" : "text-muted-foreground ring-border"}`}>Alla</button>
      {people.map((p) => (
        <button key={p.email} onClick={() => onChange(p.email)} title={p.label}
          className={`rounded-full p-0.5 ring-2 ${value === p.email ? "ring-primary" : "ring-transparent"}`}>
          <Avatar person={p} />
        </button>
      ))}
    </div>
  );
}
