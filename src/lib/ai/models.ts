// Kuratierte Modell-Liste für die Admin-UI /autor/admin/ai-config.
//
// Die Modell-IDs sind die exakten Strings, die der Anthropic-SDK
// erwartet — keine Datums-Suffixe, keine Labels. Der Resolver
// (src/lib/ai/config.ts) und der Provider (src/lib/ai/providers/anthropic.ts)
// reichen den String ungeprüft an `messages.create({ model, … })` weiter.
//
// **Pflege:** neues Modell = eine Zeile hier. Bewusst keine DB-Tabelle —
// Anthropic-Modelle kommen wenige Male im Jahr neu, eine eigene Pflege-
// Tabelle wäre Over-Engineering. Code-Review der einen Zeile ist klarer
// als ein Migration-/Editor-UI-Roundtrip.
//
// Beim Entfernen einer ID: Bestandsdaten in ai_config per Migration auf
// den Nachfolger mappen (Muster: supabase/migrations/*_ai_config_model_ids_*).
//
// Reihenfolge im Array steuert die Dropdown-Reihenfolge: empfohlenes
// Default (Haiku 5.5) zuerst, dann aufsteigend nach Capability.
//
// Stand 2026-10-11 (Claude-5.5-Generation). Vorgänger Haiku 4.5, Sonnet 5,
// Opus 4.8 und Fable 5 sind per API weiterhin erreichbar, aber nicht mehr
// in der Liste.

export type ModelOption = {
  /** API-ID wie sie an die SDK geht. */
  id: string;
  /** Anzeigename in der UI. */
  label: string;
};

export const KNOWN_MODELS: readonly ModelOption[] = [
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5 — schnell, günstig" },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5 — ausgewogen" },
  { id: "claude-opus-5-5", label: "Claude Opus 5.5 — stärkstes Reasoning" },
  { id: "claude-fable-5-1", label: "Claude Fable 5.1 — Frontier, teuer" },
];

export const KNOWN_MODEL_IDS: ReadonlySet<string> = new Set(
  KNOWN_MODELS.map((m) => m.id),
);

export function isKnownModel(id: string): boolean {
  return KNOWN_MODEL_IDS.has(id);
}
