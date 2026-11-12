// Newsletter-Entwurf (Task newsletter_draft, PR 195). Pure: Prompt-Bau und
// Parser, ohne "use server"; genutzt vom Entwurfs-Job (newsletter/draftJob.ts)
// und vom Test. Drei-Teiler wie die anderen editierbaren Tasks: Sprache und
// Ausgabeformat im Code, Strategie editierbar (Admin «Task-Prompts»).

export type NewsletterDraftArticle = {
  id: string;
  title: string;
  category: string;
  abstract: string;
  bodyStart: string;
};

export type NewsletterDraftOutput = {
  subject: string;
  intro: string;
  teasers: Record<string, string>;
};

export const NEWSLETTER_BODY_CHARS = 900;

export const NEWSLETTER_DRAFT_STRATEGY = [
  "Du schreibst den wöchentlichen Newsletter von digital-age, einem Schweizer Magazin für KI und Future Tech.",
  "Die Leserinnen und Leser sind Fach- und Führungskräfte. Sie haben den Newsletter abonniert, um die Woche schnell zu überblicken.",
  "",
  "BETREFF:",
  "  - Höchstens 70 Zeichen.",
  "  - Nennt das stärkste Thema der Woche konkret, gern mit einem zweiten Thema.",
  "  - Kein Clickbait, keine Emojis, keine Ausrufezeichen, nicht das Wort «Newsletter».",
  "",
  "EINLEITUNG:",
  "  - 2 bis 3 Sätze, höchstens 350 Zeichen.",
  "  - Duzt die Leserinnen und Leser. Sachlich und freundlich, ohne Floskeln wie «Willkommen zu einer neuen Ausgabe».",
  "  - Ordnet ein, was diese Woche verbindet, statt die Titel aufzuzählen.",
  "",
  "KURZTEXT PRO ARTIKEL:",
  "  - 1 bis 2 Sätze, höchstens 200 Zeichen.",
  "  - Sagt, was man konkret erfährt oder warum es relevant ist. Wiederholt den Titel nicht.",
  "  - Keine Gedankenstriche zwischen Satzteilen, kein Marketington, keine rhetorischen Fragen.",
  "  - Englische Artikel: Kurztext trotzdem auf Deutsch.",
].join("\n");

const LANGUAGE_LINE =
  "SPRACHE: Deutsch mit Schweizer Rechtschreibung (de-CH). IMMER 'ss' statt Eszett (Beispiele: 'massgeblich', 'gross'). NIEMALS Eszett verwenden.";

const OUTPUT_FORMAT = [
  "AUSGABEFORMAT: Antworte ausschliesslich mit JSON, ohne Text davor oder danach, ohne Code-Block:",
  '{"subject": "…", "intro": "…", "items": [{"id": "<Artikel-ID>", "teaser": "…"}]}',
  "items enthält jeden Artikel genau einmal, mit der ID aus der Liste und in derselben Reihenfolge.",
].join("\n");

export function buildNewsletterDraftPrompt(
  articles: NewsletterDraftArticle[],
  strategy: string = NEWSLETTER_DRAFT_STRATEGY,
): { system: string; prompt: string } {
  const system = [LANGUAGE_LINE, strategy.trim(), OUTPUT_FORMAT].join("\n\n");
  const blocks = articles.map((a, i) =>
    [
      `ARTIKEL ${i + 1}`,
      `ID: ${a.id}`,
      `Rubrik: ${a.category || "—"}`,
      `Titel: ${a.title}`,
      `Abstract: ${a.abstract || "—"}`,
      `Textanfang: ${a.bodyStart.slice(0, NEWSLETTER_BODY_CHARS) || "—"}`,
    ].join("\n"),
  );
  const prompt = [`Neue Artikel dieser Ausgabe (${articles.length}):`, ...blocks].join("\n\n");
  return { system, prompt };
}

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

function clean(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.replace(/ß/g, "ss").replace(/\s+/g, " ").trim().slice(0, max);
}

// Parser: null, wenn kein JSON oder Betreff/Einleitung fehlen. Kurztexte nur
// fuer bekannte IDs; fehlende fuellt der Job aus dem Abstract.
export function parseNewsletterDraft(raw: string, knownIds: readonly string[]): NewsletterDraftOutput | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;
  const subject = clean(o.subject, 120);
  const intro = clean(o.intro, 1200);
  if (!subject || !intro) return null;
  const known = new Set(knownIds);
  const teasers: Record<string, string> = {};
  if (Array.isArray(o.items)) {
    for (const it of o.items) {
      if (!it || typeof it !== "object") continue;
      const r = it as Record<string, unknown>;
      const id = typeof r.id === "string" ? r.id.trim() : "";
      const teaser = clean(r.teaser, 400);
      if (known.has(id) && teaser && !teasers[id]) teasers[id] = teaser;
    }
  }
  return { subject, intro, teasers };
}
