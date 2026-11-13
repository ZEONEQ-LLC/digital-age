// Newsletter-Entwurf (Task newsletter_draft, PR 195). Pure: Prompt-Bau und
// Parser, ohne "use server"; genutzt vom Entwurfs-Job (newsletter/draftJob.ts)
// und vom Test. Drei-Teiler wie die anderen editierbaren Tasks: Sprache und
// Ausgabeformat im Code, Strategie editierbar (Admin «Task-Prompts»).
//
// Seit PR 203 (Wunsch Ali 13.11.2026) waehlt derselbe Aufruf auch die
// Rubriken: die wichtigsten News, einen Hype-Check, den Prompt der Woche und
// einen Podcast-Tipp. News, Prompts und Podcasts bekommen kurze IDs (n1, p1,
// c1), das spart Tokens und vermeidet abgeschriebene UUIDs.

export type NewsletterDraftArticle = {
  id: string;
  title: string;
  category: string;
  abstract: string;
  bodyStart: string;
};

export type NewsletterDraftNews = {
  id: string;            // n1, n2, …
  title: string;
  teaser: string;
  source: string;
  importance: 1 | 2 | 3 | null;
  levels: string;        // «Wirtschaft 3, Gesellschaft 1, Umwelt 0, Dringlichkeit 2»
  warum: string;
  kehrseite: string;
};

export type NewsletterDraftPick = {
  id: string;            // p1 … (Prompts), c1 … (Podcasts)
  title: string;
  label: string;
  text: string;          // Prompt: wofuer; Podcast: Beschreibung
};

export type NewsletterDraftInput = {
  articles: NewsletterDraftArticle[];
  news: NewsletterDraftNews[];
  prompts: NewsletterDraftPick[];
  podcasts: NewsletterDraftPick[];
};

export type NewsletterDraftOutput = {
  subject: string;
  intro: string;
  teasers: Record<string, string>;
  news: string[];
  hype: { id: string; text: string } | null;
  prompt: { id: string; teaser: string } | null;
  podcast: { id: string; teaser: string } | null;
};

export const DRAFT_MAX_NEWS = 5;
export const NEWS_INPUT_MAX = 40;
const PICK_TEXT_CHARS = 400;

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
  "  - Gibt es wenige oder keine neuen Artikel, tragen die News der Woche Betreff und Einleitung.",
  "  - Keine Vorbehalte zu einzelnen Meldungen (z. B. «nur einseitig belegt»); die gehören zu den News, nicht in die Einleitung.",
  "",
  "KURZTEXT PRO ARTIKEL:",
  "  - 1 bis 2 Sätze, höchstens 200 Zeichen.",
  "  - Sagt, was man konkret erfährt oder warum es relevant ist. Wiederholt den Titel nicht.",
  "  - Keine Gedankenstriche zwischen Satzteilen, kein Marketington, keine rhetorischen Fragen.",
  "  - Englische Artikel: Kurztext trotzdem auf Deutsch.",
  "",
  "DIE WICHTIGSTEN NEWS DER WOCHE:",
  "  - Bis zu 5 Meldungen aus der News-Liste mit der grössten Tragweite für Fach- und Führungskräfte in der DACH-Region, die wichtigste zuerst.",
  "  - Die Einordnung (Wichtigkeit, Stufen) ist ein Anhaltspunkt, kein Automat.",
  "  - Jedes Thema nur einmal: Berichten mehrere Meldungen über dasselbe Ereignis, nimm die aussagekräftigste.",
  "",
  "HYPE-CHECK:",
  "  - Eine Meldung, um die viel Lärm gemacht wird, deren Substanz aber dünn ist: Ankündigung ohne Produkt, Gerücht, Studie mit kleiner Basis, Personalie mit viel Echo und wenig Folgen.",
  "  - Hinweise darauf: mehrere Meldungen zum selben Thema, grosse Worte im Titel, tiefe Einordnung, eine Kehrseite, die die Meldung relativiert.",
  "  - 2 bis 3 Sätze, höchstens 400 Zeichen: Worum geht die Aufregung, und was bleibt nüchtern betrachtet davon?",
  "  - Fair und sachlich, ohne Häme und Ironie. Keine Fakten, die nicht in der Liste stehen.",
  "  - Schreibe über die Sache, nicht über die Quelle der Liste: nicht «die Kurzfassung», «die Meldung nennt», «laut Einordnung».",
  "  - Nicht dieselbe Meldung wie bei den wichtigsten News. Passt keine, dann null.",
  "",
  "PROMPT DER WOCHE:",
  "  - Aus der Prompt-Liste der, der für die meisten Leserinnen und Leser sofort nützlich ist.",
  "  - Kurztext 1 bis 2 Sätze, höchstens 200 Zeichen: wofür man ihn braucht und was er einem abnimmt.",
  "",
  "PODCAST-TIPP:",
  "  - Aus der Podcast-Liste die Folge, die am besten zur Woche passt oder am meisten Erkenntnis verspricht.",
  "  - Kurztext 1 bis 2 Sätze, höchstens 200 Zeichen: worum es geht und für wen sich das Zuhören lohnt.",
].join("\n");

// Anrede im Code, nicht in der editierbaren Strategie: Der erste echte Entwurf
// (13.11.2026, Haiku 5.5) siezte trotz «duzt» in der Strategie.
const ADDRESS_LINE = [
  "ANREDE: Duze die Leserinnen und Leser durchgehend (du, dich, dir, dein, euch). Nie «Sie», «Ihnen», «Ihr Unternehmen» als Anrede.",
  "Die Leser sehen nur den Newsletter, nicht die Listen unten: keine Verweise auf «die Liste», «die Kurzfassung», «die Einordnung» oder «die Meldung nennt».",
].join("\n");

const LANGUAGE_LINE =
  "SPRACHE: Deutsch mit Schweizer Rechtschreibung (de-CH). IMMER 'ss' statt Eszett (Beispiele: 'massgeblich', 'gross'). NIEMALS Eszett verwenden.";

const OUTPUT_FORMAT = [
  "AUSGABEFORMAT: Antworte ausschliesslich mit JSON, ohne Text davor oder danach, ohne Code-Block:",
  '{"subject": "…", "intro": "…", "items": [{"id": "<Artikel-ID>", "teaser": "…"}], "news": ["n3", "n1"], "hype": {"id": "n7", "text": "…"}, "prompt": {"id": "p2", "teaser": "…"}, "podcast": {"id": "c1", "teaser": "…"}}',
  "items enthält jeden Artikel genau einmal, mit der ID aus der Liste und in derselben Reihenfolge (leer, wenn es keine neuen Artikel gibt).",
  `news: bis zu ${DRAFT_MAX_NEWS} IDs aus der News-Liste, die wichtigste zuerst.`,
  "hype, prompt, podcast: je eine ID aus der passenden Liste mit Text, oder null, wenn die Liste leer ist oder nichts passt.",
].join("\n");

function compact(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export function buildNewsletterDraftPrompt(
  input: NewsletterDraftInput,
  strategy: string = NEWSLETTER_DRAFT_STRATEGY,
): { system: string; prompt: string } {
  const system = [LANGUAGE_LINE, ADDRESS_LINE, strategy.trim(), OUTPUT_FORMAT].join("\n\n");
  const { articles, news, prompts, podcasts } = input;
  const parts: string[] = [];

  if (articles.length === 0) {
    parts.push("NEUE ARTIKEL: keine in diesem Zeitraum.");
  } else {
    parts.push(`NEUE ARTIKEL DIESER AUSGABE (${articles.length}):`);
    for (const [i, a] of articles.entries()) {
      parts.push(
        [
          `ARTIKEL ${i + 1}`,
          `ID: ${a.id}`,
          `Rubrik: ${a.category || "—"}`,
          `Titel: ${a.title}`,
          `Abstract: ${a.abstract || "—"}`,
          `Textanfang: ${a.bodyStart.slice(0, NEWSLETTER_BODY_CHARS) || "—"}`,
        ].join("\n"),
      );
    }
  }

  const shownNews = news.slice(0, NEWS_INPUT_MAX);
  if (shownNews.length === 0) {
    parts.push("NEWS-LISTE: leer.");
  } else {
    parts.push(
      [
        `NEWS-LISTE (${shownNews.length} Meldungen aus dem Ticker, eingeordnet von der KI des Tickers; Stufen 0 = nicht betroffen bis 3 = hoch, Wichtigkeit 1 bis 3):`,
        ...shownNews.map((n) =>
          [
            `${n.id} | ${n.title} | Quelle: ${n.source || "—"} | Wichtigkeit ${n.importance ?? "—"} | ${n.levels || "ohne Stufen"}`,
            `   Kurz: ${compact(n.teaser, 260) || "—"}`,
            `   Warum wichtig: ${n.warum || "—"}`,
            `   Kehrseite: ${n.kehrseite || "—"}`,
          ].join("\n"),
        ),
      ].join("\n"),
    );
  }

  const pickList = (head: string, list: NewsletterDraftPick[]) =>
    list.length === 0
      ? `${head}: leer.`
      : [`${head} (${list.length}):`, ...list.map((p) => `${p.id} | ${p.title} | ${p.label || "—"}\n   ${compact(p.text, PICK_TEXT_CHARS) || "—"}`)].join("\n");
  parts.push(pickList("PROMPT-LISTE (neu in der Sammlung)", prompts));
  parts.push(pickList("PODCAST-LISTE (neu empfohlen)", podcasts));

  return { system, prompt: parts.join("\n\n") };
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

export type KnownDraftIds = {
  articles: readonly string[];
  news?: readonly string[];
  prompts?: readonly string[];
  podcasts?: readonly string[];
};

function idOf(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (v && typeof v === "object" && typeof (v as Record<string, unknown>).id === "string") return ((v as Record<string, unknown>).id as string).trim();
  return "";
}

function pickReply(v: unknown, known: ReadonlySet<string>, textKey: "teaser" | "text", max: number): { id: string; text: string } | null {
  if (!v || typeof v !== "object") return null;
  const id = idOf(v);
  if (!known.has(id)) return null;
  return { id, text: clean((v as Record<string, unknown>)[textKey], max) };
}

// Parser: null, wenn kein JSON oder Betreff/Einleitung fehlen. Kurztexte nur
// fuer bekannte IDs; fehlende fuellt der Job aus dem Abstract. Rubriken nur
// mit bekannten IDs; der Hype-Check braucht Text und darf keine der
// wichtigsten News sein.
export function parseNewsletterDraft(raw: string, ids: KnownDraftIds): NewsletterDraftOutput | null {
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
  const known = new Set(ids.articles);
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
  const knownNews = new Set(ids.news ?? []);
  const news: string[] = [];
  if (Array.isArray(o.news)) {
    for (const v of o.news) {
      const id = idOf(v);
      if (knownNews.has(id) && !news.includes(id)) news.push(id);
      if (news.length >= DRAFT_MAX_NEWS) break;
    }
  }
  const h = pickReply(o.hype, knownNews, "text", 500);
  const hype = h && h.text && !news.includes(h.id) ? { id: h.id, text: h.text } : null;
  const p = pickReply(o.prompt, new Set(ids.prompts ?? []), "teaser", 300);
  const c = pickReply(o.podcast, new Set(ids.podcasts ?? []), "teaser", 300);
  return {
    subject,
    intro,
    teasers,
    news,
    hype,
    prompt: p ? { id: p.id, teaser: p.text } : null,
    podcast: c ? { id: c.id, teaser: c.text } : null,
  };
}

// Sie-Form erkennen (Hinweis im Entwurf, PR 205). «Sie», «Ihnen», «Ihr…» gross
// mitten im Satz sind Anrede; am Satzanfang ist «Sie» oft «sie» (Mehrzahl),
// darum zaehlt das erste Wort eines Satzes nicht.
const FORMAL = /\b(Sie|Ihnen|Ihr|Ihre|Ihren|Ihrem|Ihrer|Ihres)\b/;

export function usesFormalAddress(text: string): boolean {
  return text
    .split(/(?<=[.!?:;])\s+|\n+/)
    .some((sentence) => FORMAL.test(sentence.trim().replace(/^\S+\s*/, "")));
}

// Welche Felder siezen? Fuer den Hinweis im Entwurf, z. B. ["Einleitung", "Hype-Check"].
export function formalAddressFields(fields: Record<string, string | null | undefined>): string[] {
  return Object.entries(fields).filter(([, v]) => !!v && usesFormalAddress(v)).map(([k]) => k);
}
