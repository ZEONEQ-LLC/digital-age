// Reine HTTP-Code → SourceUrlStatus-Abbildung. Bewusst OHNE `server-only`,
// damit unabhaengig (npx tsx) testbar. Genutzt vom server-only urlCheck.ts.

import type { SourceUrlStatus } from "@/types/blocks";

export function categorizeStatus(code: number): SourceUrlStatus {
  if (code >= 200 && code < 300) return "ok";
  if (code >= 300 && code < 400) return "redirect";
  if (code === 404 || code === 410) return "dead";
  if (code === 401 || code === 403 || code === 429) return "blocked";
  return "error"; // sonstige 4xx/5xx
}
