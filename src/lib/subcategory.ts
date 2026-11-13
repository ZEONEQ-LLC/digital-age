// Unterrubriken sind freie Labels (articles.subcategory). Dieselbe Rubrik in
// anderer Schreibweise («AI in Banking» / «AI in banking») soll im Filter
// nicht doppelt erscheinen: Gross-/Kleinschreibung und Leerraum werden
// zusammengelegt, angezeigt wird die haeufigste Schreibweise.
export function canonicalSubcategories<T extends { subcategory: string | null }>(rows: T[]): T[] {
  const key = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
  const counts = new Map<string, Map<string, number>>();
  for (const r of rows) {
    if (!r.subcategory?.trim()) continue;
    const label = r.subcategory.trim().replace(/\s+/g, " ");
    const k = key(label);
    const m = counts.get(k) ?? new Map<string, number>();
    m.set(label, (m.get(label) ?? 0) + 1);
    counts.set(k, m);
  }
  const best = new Map<string, string>();
  for (const [k, m] of counts) {
    best.set(k, [...m.entries()].sort((a, b) => b[1] - a[1])[0][0]);
  }
  return rows.map((r) => (r.subcategory?.trim() ? { ...r, subcategory: best.get(key(r.subcategory)) ?? r.subcategory } : r));
}
