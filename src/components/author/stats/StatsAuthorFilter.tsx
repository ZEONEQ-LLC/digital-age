"use client";

import { useRouter } from "next/navigation";

// Filter der Redaktion: alle Beitraege oder die einer Person. Wechselt die
// Adresse (?autor=…), der Zeitraum bleibt.
export default function StatsAuthorFilter({
  authors,
  value,
  hrefs,
}: {
  authors: { id: string; name: string }[];
  value: string | null;
  // Fertige Adressen pro Auswahl ("" = alle), vom Server gebaut.
  hrefs: Record<string, string>;
}) {
  const router = useRouter();
  return (
    <label className="st-filter">
      <span>Beiträge von</span>
      <select
        value={value ?? ""}
        onChange={(e) => {
          const href = hrefs[e.target.value];
          if (href) router.push(href);
        }}
      >
        <option value="">allen</option>
        {authors.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
    </label>
  );
}
