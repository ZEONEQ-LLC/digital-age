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
// Reihenfolge im Array steuert die Dropdown-Reihenfolge: empfohlenes
// Default (Haiku 4.5) zuerst, dann aufsteigend nach Capability.

export type ModelOption = {
  /** API-ID wie sie an die SDK geht. */
  id: string;
  /** Anzeigename in der UI. */
  label: string;
};

export const KNOWN_MODELS: readonly ModelOption[] = [
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5 — schnell, günstig" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 — ausgewogen" },
  { id: "claude-opus-4-6", label: "Claude Opus 4.6 — stark" },
  { id: "claude-opus-4-7", label: "Claude Opus 4.7 — stärkstes Reasoning" },
];

export const KNOWN_MODEL_IDS: ReadonlySet<string> = new Set(
  KNOWN_MODELS.map((m) => m.id),
);

export function isKnownModel(id: string): boolean {
  return KNOWN_MODEL_IDS.has(id);
}
