// Server-safe color/type helpers für Prompts. KEIN "use client".
// PromptCard.tsx ist eine Client-Component (useState für Copy-Feedback) und
// re-exportiert NICHT — alle Importe gehen direkt hierher. Server-Components
// wie /ai-prompts/[id]/page.tsx dürfen dann diese Helper importieren ohne
// Runtime-Crash ("Attempted to call X from the server but X is on the client").

export type Difficulty = "Anfänger" | "Fortgeschritten" | "Expert";
export type AiTool = "ChatGPT" | "Claude" | "Gemini" | "Mehrere";

export function toolColor(t: AiTool): string {
  return t === "ChatGPT" ? "var(--da-green)"
       : t === "Claude"  ? "var(--da-orange)"
       : t === "Gemini"  ? "var(--da-purple)"
       :                   "var(--da-muted-soft)";
}

export function diffColor(d: Difficulty): string {
  return d === "Anfänger"        ? "var(--da-green)"
       : d === "Fortgeschritten" ? "var(--da-orange)"
       :                           "var(--da-purple)";
}

export function catColor(cat: string): string {
  const map: Record<string, string> = {
    Business:  "var(--da-green)",
    Kreativ:   "var(--da-orange)",
    Code:      "var(--da-purple)",
    Marketing: "var(--da-green)",
    Strategie: "var(--da-purple)",
    Lernen:    "var(--da-orange)",
    Andere:    "var(--da-muted-soft)",
  };
  return map[cat] ?? "var(--da-green)";
}
