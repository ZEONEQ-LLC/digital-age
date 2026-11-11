// Server Actions: erwartete Fehler zurueckgeben statt werfen.
//
// Next.js ersetzt in Production die Meldung jedes Fehlers, den eine Server
// Action wirft, durch einen generischen Text. Actions, deren Fehlertext der
// Nutzer lesen soll, geben deshalb ein ActionResult zurueck. Muster:
//
//   Server:  throw new FormError("Titel fehlt.")    eigene Meldung
//            return runAction("saveArticle", () => inner(...), knownError)
//   Client:  const row = unwrapAction(await saveArticle(id, patch))
//
// unwrapAction wirft im Browser ein normales Error mit der Meldung, damit
// bestehende try/catch-Pfade unveraendert bleiben. Alles, was weder FormError
// noch ein bekannter DB-Fehler ist, wird geloggt und als GENERIC_ACTION_ERROR
// gemeldet. Kein "use server": Server-Module und Client importieren hier.

export class FormError extends Error {}

export type ActionResult<T> = { ok: true; value: T } | { ok: false; error: string };

export const GENERIC_ACTION_ERROR = "Das hat nicht geklappt. Bitte nochmals versuchen.";

// Bekannte Fehler (etwa Unique-Konflikte) auf eine Meldung abbilden, sonst null.
export type KnownErrorMap = (e: unknown) => string | null;

export function actionFailure(
  e: unknown,
  context: string,
  known?: KnownErrorMap,
): { ok: false; error: string } {
  if (e instanceof FormError) return { ok: false, error: e.message };
  const mapped = known?.(e);
  if (mapped) return { ok: false, error: mapped };
  console.error(`[${context}] unexpected failure:`, e);
  return { ok: false, error: GENERIC_ACTION_ERROR };
}

export async function runAction<T>(
  context: string,
  fn: () => Promise<T>,
  known?: KnownErrorMap,
): Promise<ActionResult<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (e) {
    return actionFailure(e, context, known);
  }
}

// Fuer Actions mit eigenem Ergebnis-Typ ({ ok: false, message }): Guard wie
// requireEditor ausfuehren und die Meldung zurueckgeben statt zu werfen.
export async function guardMessage(guard: () => Promise<unknown>): Promise<string | null> {
  try {
    await guard();
    return null;
  } catch (e) {
    return actionFailure(e, "guard").error;
  }
}

export function unwrapAction<T>(res: ActionResult<T>): T {
  if (res.ok) return res.value;
  throw new Error(res.error);
}

// Unique-Verletzung (23505) auf einem bestimmten Constraint oder Index.
export function isUniqueViolation(e: unknown, constraint: string): boolean {
  if (!e || typeof e !== "object") return false;
  const err = e as { code?: unknown; message?: unknown };
  return err.code === "23505" && typeof err.message === "string" && err.message.includes(constraint);
}
