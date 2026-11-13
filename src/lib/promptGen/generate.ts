// Prompts der KI-Redaktion (Task prompt_generation, PR 197). Pure: Auswahl der
// Kategorien, Prompt-Bau und Parser, ohne DB. Job: promptGen/job.ts. Test:
// promptGen/__tests__/generate.manual.ts.

import type { Database } from "@/lib/database.types";

type Difficulty = Database["public"]["Enums"]["prompt_difficulty"];

// Kategorien wie PROMPT_CATEGORIES (mappers/promptMappers.ts), ohne «andere».
export const GEN_CATEGORIES = ["business", "kreativ", "code", "marketing", "strategie", "lernen"] as const;
export type GenCategory = (typeof GEN_CATEGORIES)[number];
const CATEGORY_LABEL: Record<GenCategory, string> = {
  business: "Business", kreativ: "Kreativ", code: "Code", marketing: "Marketing", strategie: "Strategie", lernen: "Lernen",
};
const DIFFICULTIES: readonly Difficulty[] = ["beginner", "intermediate", "expert"];

export const PROMPTS_PER_RUN = 3;
export const AI_SUBMITTER_NAME = "KI-Redaktion digital age";

export type GeneratedPrompt = {
  title: string;
  category: GenCategory;
  difficulty: Difficulty;
  context: string;
  prompt_text: string;
  example_values: string;
  example_fill: string;
};

export const PROMPT_GENERATION_STRATEGY = [
  "Du bist Redaktorin der Rubrik «AI Prompts» von digital-age, einem Schweizer Magazin für KI und Future Tech.",
  "Die Leserinnen und Leser sind Fach- und Führungskräfte in KMU, Verwaltung und Agenturen in der Schweiz, Deutschland und Österreich.",
  "",
  "AUFTRAG: Schreibe einen neuen Prompt, den man sofort kopieren und im Arbeitsalltag nutzen will.",
  "  - Der Prompt löst eine konkrete, wiederkehrende Aufgabe (z. B. Offerte prüfen, Workshop planen, Datenschutz-Check eines Tools, Code-Review, Lernplan).",
  "  - Aufbau: Rolle oder Perspektive, Aufgabe, nötiger Kontext, Vorgehen in Schritten, gewünschtes Ausgabeformat, Qualitätskriterien.",
  "  - Variablen in [ECKIGEN KLAMMERN in Grossbuchstaben], höchstens fünf pro Prompt.",
  "  - Bezug zur DACH-Region, wo es passt (Schweizer Recht, DSG/DSGVO, KMU-Realität, Mehrsprachigkeit).",
  "  - Keine Floskeln wie «Du bist ein Weltklasse-Experte», keine Versprechen, keine Emojis.",
  "  - Etwas Überraschendes: ein Kniff, den viele nicht kennen (z. B. Gegenposition einnehmen lassen, Rückfragen erzwingen, Bewertungsraster).",
  "  - Kein Thema doppelt zur bestehenden Sammlung, und keine Methode, die dort schon vorkommt (steht z. B. schon ein Pre-Mortem drin, nimm einen anderen Kniff).",
].join("\n");

const LANGUAGE_LINE =
  "SPRACHE: Deutsch mit Schweizer Rechtschreibung (de-CH). IMMER 'ss' statt Eszett. NIEMALS Eszett verwenden.";

// Ein Prompt pro Aufruf (seit PR 201): Drei Prompts samt ausgefuelltem
// Beispiel in einer Antwort sprengten das Ausgabelimit (13.11.2026: zweimal
// max_tokens, kein gueltiges JSON). Das Beispiel setzt der Code aus
// «beispielwerte» ein.
const OUTPUT_FORMAT = [
  "AUSGABEFORMAT: Antworte ausschliesslich mit einem JSON-Objekt, ohne Code-Block:",
  '{"title": "…", "category": "…", "difficulty": "beginner|intermediate|expert", "context": "…", "prompt_text": "…", "beispielwerte": {"PLATZHALTER": "Wert"}}',
  "  - title: höchstens 70 Zeichen, sagt, was der Prompt erledigt.",
  "  - context: 2 bis 3 Sätze, wofür und wie man ihn nutzt, höchstens 400 Zeichen.",
  "  - prompt_text: der Prompt selbst, 400 bis 1800 Zeichen, Absätze mit \\n, Variablen als [PLATZHALTER].",
  "  - beispielwerte: für jeden Platzhalter im Prompt ein realistischer Beispielwert aus der Schweiz, kurz (höchstens 120 Zeichen je Wert).",
].join("\n");

// Die n am schwaechsten vertretenen Kategorien; bei Gleichstand rotiert der
// Startpunkt mit der Kalenderwoche, damit nicht jede Woche dieselben kommen.
export function pickCategories(counts: Partial<Record<string, number>>, n: number, week: number): GenCategory[] {
  const offset = ((week % GEN_CATEGORIES.length) + GEN_CATEGORIES.length) % GEN_CATEGORIES.length;
  const rotated = [...GEN_CATEGORIES.slice(offset), ...GEN_CATEGORIES.slice(0, offset)];
  return rotated
    .map((c, i) => ({ c, n: counts[c] ?? 0, i }))
    .sort((a, b) => a.n - b.n || a.i - b.i)
    .slice(0, n)
    .map((x) => x.c);
}

export function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

export function buildGenerationPrompt(
  category: GenCategory,
  existingTitles: string[],
  strategy: string = PROMPT_GENERATION_STRATEGY,
  difficulty?: Difficulty,
): { system: string; prompt: string } {
  const system = [LANGUAGE_LINE, strategy.trim(), OUTPUT_FORMAT].join("\n\n");
  const prompt = [
    `Schreibe einen Prompt für die Kategorie ${category} (${CATEGORY_LABEL[category]}).`,
    difficulty ? `Schwierigkeit: ${difficulty}.` : "Wähle die passende Schwierigkeit (beginner, intermediate, expert).",
    existingTitles.length > 0
      ? `Bereits in der Sammlung (nicht wiederholen):\n${existingTitles.slice(0, 200).map((t) => `- ${t}`).join("\n")}`
      : "Die Sammlung ist noch leer.",
  ].join("\n\n");
  return { system, prompt };
}

// Zweiter Aufruf: den ausgefuellten Prompt ausfuehren, Ergebnis = Beispiel-Output.
export function buildExamplePrompt(p: GeneratedPrompt): { system: string; prompt: string } {
  return {
    system: [
      LANGUAGE_LINE,
      "Führe den folgenden Prompt so aus, wie ein Leser ihn in einem Chat einfügen würde.",
      "Antworte direkt mit dem Ergebnis, ohne Vorbemerkung. Höchstens 350 Wörter; kürze Listen lieber, als mitten im Satz abzubrechen.",
      "Kein Markdown mit # oder **; einfache Absätze und Aufzählungen mit «-» sind erlaubt.",
    ].join("\n"),
    prompt: p.example_fill,
  };
}

export const MAX_EXAMPLE_OUTPUT = 2500;

export function formatExampleOutput(values: string, output: string): string | null {
  const clean = output
    .replace(/ß/g, "ss")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .trim();
  if (clean.length < 40) return null;
  const head = values ? `Beispiel mit ${values}\n\n` : "";
  const room = MAX_EXAMPLE_OUTPUT - head.length;
  const body = clean.length > room ? `${clean.slice(0, room - 2).replace(/\s+\S*$/, "")} …` : clean;
  return head + body;
}

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/ß/g, "ss").trim().slice(0, max) : "";
}

function oneLine(v: unknown, max: number): string {
  return str(v, max * 2).replace(/\s+/g, " ").trim().slice(0, max);
}

export function normalizeTitle(t: string): string {
  return t.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function stripCodeFence(raw: string): string {
  const t = raw.trim();
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  return a >= 0 && b > a ? t.slice(a, b + 1) : t;
}

// Setzt die Beispielwerte in die Platzhalter ein ([BRANCHE] → «Treuhand»),
// Gross-/Kleinschreibung und Leerzeichen im Namen egal. Unbekannte
// Platzhalter bleiben stehen; die KI im Beispiel-Aufruf kommt damit zurecht.
export function fillPlaceholders(promptText: string, values: Record<string, string>): string {
  const norm = (k: string) => k.trim().toUpperCase().replace(/[\s_-]+/g, "_");
  const map = new Map(Object.entries(values).map(([k, v]) => [norm(k.replace(/^\[|\]$/g, "")), v]));
  return promptText.replace(/\[([^\[\]\n]{1,60})\]/g, (m, key: string) => map.get(norm(key)) ?? m);
}

function readValues(v: unknown): Record<string, string> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>).slice(0, 8)) {
    const s = oneLine(val, 120);
    if (k.trim() && s) out[k.trim()] = s;
  }
  return out;
}

// «Branche: Treuhand, Ort: Luzern» fuer die Kopfzeile des Beispiel-Outputs.
function valuesLine(values: Record<string, string>): string {
  const label = (k: string) => {
    const t = k.replace(/^\[|\]$/g, "").replace(/[_-]+/g, " ").toLowerCase().trim();
    return t.charAt(0).toUpperCase() + t.slice(1);
  };
  return Object.entries(values).map(([k, v]) => `${label(k)}: ${v}`).join(", ").slice(0, 200);
}

// Validiert die KI-Antwort. Akzeptiert ein einzelnes Prompt-Objekt (seit
// PR 201), {"prompt": {…}} oder {"prompts": […]}. Unpassende Laengen,
// unbekannte Kategorien und Titel, die es schon gibt, fallen weg. null = kein JSON.
// rejected (optional) sammelt, warum ein Vorschlag wegfiel, fuer die
// Fehlerzeile im Admin (vorher nur «Länge, Kategorie oder Dublette»).
export function parseGenerated(raw: string, existingTitles: string[], forceCategory?: GenCategory, rejected?: string[]): GeneratedPrompt[] | null {
  let parsed: unknown;
  try { parsed = JSON.parse(stripCodeFence(raw)); } catch { return null; }
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;
  const list = Array.isArray(o.prompts) ? o.prompts : o.prompt && typeof o.prompt === "object" ? [o.prompt] : typeof o.title === "string" ? [o] : null;
  if (!list) return null;
  const seen = new Set(existingTitles.map(normalizeTitle));
  const out: GeneratedPrompt[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object" || out.length >= PROMPTS_PER_RUN) continue;
    const r = item as Record<string, unknown>;
    const title = oneLine(r.title, 80);
    const context = str(r.context, 600);
    const prompt_text = str(r.prompt_text, 3000);
    const values = readValues(r.beispielwerte);
    // Die Kategorie gibt der Aufruf vor (ein Prompt pro Kategorie); die KI
    // schrieb sie teils als «Lernen» oder «lernen (Lernen)», dann fiel der
    // Prompt weg (13.11.2026: 2 von 3).
    const rawCat = String(r.category ?? "").toLowerCase().trim();
    const category = forceCategory ?? ((GEN_CATEGORIES as readonly string[]).includes(rawCat) ? (rawCat as GenCategory) : null);
    const difficulty = DIFFICULTIES.includes(r.difficulty as Difficulty) ? (r.difficulty as Difficulty) : "intermediate";
    const problems = [
      !title && "Titel fehlt",
      !category && `unbekannte Kategorie «${rawCat || "leer"}»`,
      context.length < 40 && `«Wofür» zu kurz (${context.length} Zeichen, mindestens 40)`,
      prompt_text.length < 120 && `Prompt zu kurz (${prompt_text.length} Zeichen, mindestens 120)`,
    ].filter((x): x is string => typeof x === "string");
    if (problems.length > 0 || !category) {
      rejected?.push(problems.join(", "));
      continue;
    }
    const key = normalizeTitle(title);
    if (!key || seen.has(key)) {
      rejected?.push(`Titel schon vorhanden («${title}»)`);
      continue;
    }
    seen.add(key);
    out.push({ title, category, difficulty, context, prompt_text, example_values: valuesLine(values), example_fill: fillPlaceholders(prompt_text, values) });
  }
  return out;
}
