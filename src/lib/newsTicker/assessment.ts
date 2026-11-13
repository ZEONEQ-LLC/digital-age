// Einordnung der News-Meldungen (Entscheid Ali 13.11.2026). Reines Modul:
// Rubrik fuer die KI, Parser und Anzeige-Helfer. Die KI schaetzt jede Meldung
// grob ein (Stufen statt Noten, keine Scheingenauigkeit) und nennt in einem
// Satz, warum sie fuer die DACH-Region wichtig ist. Test:
// __tests__/assessment.manual.ts.

export const ASSESSMENT_DIMENSIONS = [
  { key: "wirtschaft", label: "Wirtschaft" },
  { key: "gesellschaft", label: "Gesellschaft" },
  { key: "umwelt", label: "Umwelt" },
  { key: "dringlichkeit", label: "Dringlichkeit" },
] as const;

export type AssessmentKey = (typeof ASSESSMENT_DIMENSIONS)[number]["key"];
export type Level = 0 | 1 | 2 | 3;

export type Assessment = {
  v: 1;
  wirtschaft: Level;
  gesellschaft: Level;
  umwelt: Level;
  dringlichkeit: Level;
  warum: string;
  // Die kritische Seite in einem Satz (Wunsch Ali 13.11.2026, PR 201).
  // Fehlt bei Einordnungen vor PR 201; der Nachtrag holt sie fuer KI-Werte nach.
  kehrseite?: string;
  by: "ai" | "editor";
};

export type Importance = 1 | 2 | 3;

export const LEVEL_LABEL: Record<Level, string> = { 0: "nicht betroffen", 1: "gering", 2: "mittel", 3: "hoch" };
export const IMPORTANCE_LABEL: Record<Importance, string> = { 1: "Randnotiz", 2: "Relevant", 3: "Wichtig" };

export const MAX_WARUM = 220;
export const MAX_KEHRSEITE = 220;

// Rubrik, an jeden Ticker-Prompt angehaengt (der editierbare Prompt-Teil
// bleibt unveraendert) und Kern des Nachtrag-Prompts.
export const ASSESSMENT_RUBRIC = [
  "EINORDNUNG: Schätze die Meldung nüchtern ein, als Redaktorin eines Schweizer Fachmagazins, nicht als Werbetexterin.",
  "Stufen je Feld: 0 = nicht betroffen, 1 = gering, 2 = mittel, 3 = hoch.",
  "  - wirtschaft: Folgen für Unternehmen, Märkte, Arbeitsplätze, Investitionen.",
  "  - gesellschaft: Folgen für Menschen, Bildung, Demokratie, Datenschutz, Sicherheit.",
  "  - umwelt: Energie, Ressourcen, Klima. Meist 0 oder 1, ausser es geht direkt darum.",
  "  - dringlichkeit: Muss man jetzt reagieren (Frist, Sicherheitslücke, Gesetz in Kraft) = 3; Ankündigung, Studie, Trend = 1.",
  "wichtigkeit: 1 = Randnotiz, 2 = relevant für Fachleute, 3 = wichtig für Entscheider in der Schweiz, Deutschland, Österreich. Höchstens jede fünfte Meldung verdient 3.",
  "warum: ein Satz, höchstens 200 Zeichen, warum die Meldung für Leser in der DACH-Region zählt. Konkret, ohne Floskeln, ohne Wiederholung des Titels.",
  "kehrseite: ein Satz, höchstens 200 Zeichen, zur kritischen Seite: ein Risiko, ein Einwand, eine offene Frage oder was die Meldung nicht belegt. Sachlich und fair, ohne Polemik, ohne Vermutungen über Personen, ohne den Satz «Es bleibt abzuwarten».",
  "Gerüchte, Einzelmeinungen und Produktwerbung bekommen tiefe Werte.",
].join("\n");

export const ASSESSMENT_FIELD_INSTRUCTION = [
  ASSESSMENT_RUBRIC,
  "",
  "ZUSÄTZLICH zum Schema oben: Gib im selben JSON-Objekt das Feld",
  '"einordnung": {"wirtschaft": 0-3, "gesellschaft": 0-3, "umwelt": 0-3, "dringlichkeit": 0-3, "wichtigkeit": 1-3, "warum": "…", "kehrseite": "…"} aus.',
  'Bei {"skip": true} entfällt die Einordnung.',
].join("\n");

const LANGUAGE_LINE = "SPRACHE: Deutsch mit Schweizer Rechtschreibung. IMMER 'ss' statt Eszett.";

// Nachtrag fuer Meldungen ohne Einordnung (aeltere Meldungen, oder die KI hat
// das Feld beim Anlegen ausgelassen).
export function buildAssessmentPrompt(item: { title: string; teaser: string; summary: string; sourceName: string | null }): { system: string; prompt: string } {
  return {
    system: [
      LANGUAGE_LINE,
      ASSESSMENT_RUBRIC,
      "",
      'AUSGABE: NUR ein JSON-Objekt, ohne Code-Block: {"wirtschaft": 0-3, "gesellschaft": 0-3, "umwelt": 0-3, "dringlichkeit": 0-3, "wichtigkeit": 1-3, "warum": "…", "kehrseite": "…"}',
    ].join("\n"),
    prompt: [
      `Titel: ${item.title}`,
      `Teaser: ${item.teaser}`,
      `Kurzfassung: ${item.summary}`,
      item.sourceName ? `Quelle: ${item.sourceName}` : null,
    ].filter(Boolean).join("\n"),
  };
}

function level(v: unknown): Level | null {
  const n = typeof v === "number" ? v : typeof v === "string" && /^\d$/.test(v.trim()) ? Number(v) : NaN;
  if (!Number.isInteger(n)) return null;
  return Math.min(3, Math.max(0, n)) as Level;
}

function importance(v: unknown): Importance | null {
  const l = level(v);
  if (l === null) return null;
  return (l === 0 ? 1 : l) as Importance;
}

function clipSentence(s: string, max: number): string {
  const t = s.replace(/ß/g, "ss").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1).replace(/\s+\S*$/, "");
  return `${cut} …`;
}

// Prueft ein Objekt {wirtschaft, gesellschaft, umwelt, dringlichkeit,
// wichtigkeit, warum, kehrseite}. Fehlt ein Feld oder ist es kein Wert 0-3,
// gibt es keine Einordnung (null): lieber nichts zeigen als etwas Halbes.
// Die Kehrseite ist fuer neue KI-Einordnungen Pflicht (requireKehrseite),
// fuer gespeicherte aeltere und fuer die Redaktion freiwillig.
export function parseAssessment(
  raw: unknown,
  by: "ai" | "editor" = "ai",
  opts: { requireKehrseite?: boolean } = {},
): { assessment: Assessment; importance: Importance } | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const w = level(o.wirtschaft), g = level(o.gesellschaft), u = level(o.umwelt), d = level(o.dringlichkeit);
  const imp = importance(o.wichtigkeit);
  const warum = typeof o.warum === "string" ? clipSentence(o.warum, MAX_WARUM) : "";
  const kehr = typeof o.kehrseite === "string" ? clipSentence(o.kehrseite, MAX_KEHRSEITE) : "";
  const requireKehrseite = opts.requireKehrseite ?? by === "ai";
  if (w === null || g === null || u === null || d === null || imp === null || warum.length < 10) return null;
  if (requireKehrseite && kehr.length < 10) return null;
  const assessment: Assessment = { v: 1, wirtschaft: w, gesellschaft: g, umwelt: u, dringlichkeit: d, warum, by };
  if (kehr.length >= 10) assessment.kehrseite = kehr;
  return { assessment, importance: imp };
}

// Antwort des Nachtrag-Aufrufs (JSON, evtl. mit Code-Block).
export function parseAssessmentReply(text: string): { assessment: Assessment; importance: Importance } | null {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try { return parseAssessment(JSON.parse(t.slice(a, b + 1))); } catch { return null; }
}

// Gespeicherte Einordnung (jsonb) fuer die Anzeige lesen; alles Unbekannte = null.
export function readAssessment(raw: unknown): Assessment | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const parsed = parseAssessment({ ...o, wichtigkeit: 1 }, o.by === "editor" ? "editor" : "ai", { requireKehrseite: false });
  return parsed ? parsed.assessment : null;
}

export function readImportance(raw: unknown): Importance | null {
  return raw === 1 || raw === 2 || raw === 3 ? raw : null;
}

// Kurzzeile fuer /news: nur Felder ab «mittel», hoechste zuerst, z. B.
// «Wirtschaft hoch · Dringlichkeit mittel». Leer, wenn nichts ab mittel.
export function assessmentHighlights(a: Assessment): { label: string; level: Level }[] {
  return ASSESSMENT_DIMENSIONS
    .map((d) => ({ label: d.label, level: a[d.key] }))
    .filter((x) => x.level >= 2)
    .sort((x, y) => y.level - x.level);
}
