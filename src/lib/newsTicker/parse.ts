// Antwort-Parser des News-Ticker-Generators. Reines Modul ohne "server-only",
// damit der Test (__tests__/parse.manual.ts) es laden kann.

import type { AiErrorKind } from "@/lib/ai/types";

export type GeneratedItem = {
  title: string;
  teaser: string;
  summary: string;
  category: string | null;
};

// Ergebnis pro RSS-Item. "skip" heisst: Das Modell hat das Item als
// unpassend aussortiert ({"skip": true}). "error" heisst: Es kam kein
// brauchbares Ergebnis (KI-Fehler oder Antwort im falschen Format). Bis
// PR 191 zaehlte beides als «uebersprungen», darum fiel nicht auf, dass der
// Cron nie einen Eintrag erzeugt hat (alle Eintraege bis dahin stammen aus
// zwei Handlaeufen im Admin, 22.05. und 07.07.2026).
export type GenerateOutcome =
  | { kind: "item"; item: GeneratedItem }
  | { kind: "skip" }
  | { kind: "error"; message: string };

const RAW_LOG_MAX = 2000;

function truncateForLog(s: string): string {
  return s.length > RAW_LOG_MAX ? `${s.slice(0, RAW_LOG_MAX)}…[truncated]` : s;
}

function stripCodeFence(raw: string): string {
  const t = raw.trim();
  if (!t.startsWith("```")) return t;
  return t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

// Schema-Validierung: Skip- oder Voll-Item. Bei jeder Drift → error + Log.
export function parseGenerated(raw: string): GenerateOutcome {
  const text = stripCodeFence(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    console.error(
      "[news-generator] JSON.parse failed:",
      err instanceof Error ? err.message : String(err),
      "| raw:",
      truncateForLog(raw),
    );
    return { kind: "error", message: "Antwort der KI ist kein gültiges JSON." };
  }
  if (!parsed || typeof parsed !== "object") {
    console.error(
      "[news-generator] Schema validation failed: top-level not an object | raw:",
      truncateForLog(raw),
    );
    return { kind: "error", message: "Antwort der KI hat das falsche Format." };
  }
  const p = parsed as Record<string, unknown>;

  // Skip-Signal hat absoluten Vorrang. {"skip": true} → skip ohne Error-Log.
  if (p.skip === true) return { kind: "skip" };

  const title = typeof p.title === "string" ? p.title.trim() : null;
  const teaser = typeof p.teaser === "string" ? p.teaser.trim() : null;
  const summary = typeof p.summary === "string" ? p.summary.trim() : null;
  const categoryRaw = p.category;
  const category =
    typeof categoryRaw === "string" && categoryRaw.trim() !== ""
      ? categoryRaw.trim()
      : null;

  if (!title || !teaser || !summary) {
    console.error(
      "[news-generator] Schema validation failed:",
      JSON.stringify({
        title: typeof p.title,
        teaser: typeof p.teaser,
        summary: typeof p.summary,
        category: typeof p.category,
      }),
      "| raw:",
      truncateForLog(raw),
    );
    return { kind: "error", message: "Antwort der KI ist unvollständig (Titel, Teaser oder Zusammenfassung fehlt)." };
  }

  return { kind: "item", item: { title, teaser, summary, category } };
}

// Lesbare Meldung fuer die Fehlerliste im Admin (keine Provider-Details).
export function describeLlmError(kind: AiErrorKind, message: string): string {
  switch (kind) {
    case "config":
      return "KI ist nicht konfiguriert (API-Schlüssel oder Modell fehlt).";
    case "auth":
      return "Der KI-Anbieter hat den API-Schlüssel abgelehnt.";
    case "rate_limit":
      return "Rate-Limit des KI-Anbieters erreicht.";
    case "timeout":
      return "Zeitüberschreitung beim KI-Aufruf.";
    default:
      return `KI-Aufruf fehlgeschlagen (${kind}${message ? `: ${message}` : ""}).`;
  }
}
