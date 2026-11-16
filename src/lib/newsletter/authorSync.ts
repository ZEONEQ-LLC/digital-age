// Newsletter fuer Autorinnen und Autoren (Wunsch Ali 16.11.2026, PR 214).
// Rein, ohne DB: Aus den Autorenprofilen und der Empfaengerliste entsteht ein
// Plan, was einzutragen, zu verknuepfen oder nachzufuehren ist. Server-Teil:
// authorSubscribers.ts. Test: __tests__/authorSync.manual.ts.
//
// Regeln:
//   * Dabei ist, wer ein Autorenprofil mit Konto hat (jede Rolle). Profile
//     ohne Konto (Gast aus einem Pitch, Kontaktperson eines Unternehmens)
//     haben nie zugestimmt, fuer digital age zu arbeiten, und bleiben aussen vor.
//   * Wer sich abgemeldet hat, bleibt abgemeldet. Das gilt fuer das Profil
//     (author_id) und fuer die Adresse: Eine abgemeldete Zeile wird nie
//     wieder aktiv, auch nicht nach einer neuen Adresse im Profil.
//   * Steht die Adresse schon in der Liste, wird die Zeile mit dem Profil
//     verknuepft; eine unbestaetigte Anmeldung gilt dann als bestaetigt.
//   * Aendert jemand die Adresse im Profil, zieht die bestaetigte Zeile mit,
//     sofern die neue Adresse frei ist.

export const AUTHOR_SOURCE = "author";

// Steht als Nachweis in consent_text: wie die Adresse auf die Liste kam.
export const AUTHOR_CONSENT_TEXT =
  "Automatisch eingetragen als Autorin oder Autor von digital age (Konto in der Autoren-Suite). Abmeldung jederzeit über den Link im Newsletter.";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SyncAuthor = { id: string; email: string | null; hasLogin: boolean };
export type SyncSubscriber = { id: string; email: string; status: string; authorId: string | null };

export type AuthorSyncPlan = {
  // Neu eintragen (bestaetigt, Quelle author).
  insert: { authorId: string; email: string }[];
  // Bestehende Zeile mit dem Profil verknuepfen; confirm = unbestaetigte
  // Anmeldung gilt jetzt als bestaetigt.
  link: { subscriberId: string; authorId: string; confirm: boolean }[];
  // Adresse der verknuepften, bestaetigten Zeile nachfuehren.
  updateEmail: { subscriberId: string; email: string }[];
};

export function normalizeEmail(email: string | null | undefined): string {
  const e = (email ?? "").trim().toLowerCase();
  return e.length <= 320 && EMAIL_RE.test(e) ? e : "";
}

export function planAuthorSync(authors: readonly SyncAuthor[], subscribers: readonly SyncSubscriber[]): AuthorSyncPlan {
  const plan: AuthorSyncPlan = { insert: [], link: [], updateEmail: [] };
  const byAuthor = new Map<string, SyncSubscriber>();
  const byEmail = new Map<string, SyncSubscriber>();
  for (const s of subscribers) {
    if (s.authorId) byAuthor.set(s.authorId, s);
    byEmail.set(s.email.trim().toLowerCase(), s);
  }
  // Adressen, die dieser Lauf schon vergibt (zwei Profile mit derselben Adresse).
  const taken = new Set<string>();

  for (const a of authors) {
    if (!a.hasLogin) continue;
    const email = normalizeEmail(a.email);
    if (!email) continue;

    const linked = byAuthor.get(a.id);
    if (linked) {
      // Schon dabei oder abgemeldet. Nur die Adresse einer bestaetigten Zeile
      // zieht mit, und nur auf eine freie Adresse.
      if (linked.status === "confirmed" && linked.email.trim().toLowerCase() !== email && !byEmail.has(email) && !taken.has(email)) {
        plan.updateEmail.push({ subscriberId: linked.id, email });
        taken.add(email);
      }
      continue;
    }

    const same = byEmail.get(email);
    if (same) {
      // Zeile gehoert schon einem anderen Profil: nichts tun.
      if (same.authorId) continue;
      // Abgemeldet bleibt abgemeldet, wird aber verknuepft, damit eine neue
      // Adresse im Profil die Abmeldung nicht aushebelt.
      plan.link.push({ subscriberId: same.id, authorId: a.id, confirm: same.status === "pending" });
      byAuthor.set(a.id, same);
      continue;
    }

    if (taken.has(email)) continue;
    plan.insert.push({ authorId: a.id, email });
    taken.add(email);
  }
  return plan;
}

export function isEmptyPlan(plan: AuthorSyncPlan): boolean {
  return plan.insert.length === 0 && plan.link.length === 0 && plan.updateEmail.length === 0;
}
