// Manueller Test-Runner fuer den Abgleich Autorenprofile -> Newsletter
// (src/lib/newsletter/authorSync.ts).
//
//   npx tsx src/lib/newsletter/__tests__/authorSync.manual.ts
//
// Exit-Code 0 bei allem gruen, 1 bei mindestens einem Fail.
import { isEmptyPlan, normalizeEmail, planAuthorSync, type SyncAuthor, type SyncSubscriber } from "../authorSync";

let fails = 0;
function eq(label: string, actual: unknown, expected: unknown): void {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `\n      erwartet ${JSON.stringify(expected)}\n      erhalten ${JSON.stringify(actual)}`}`);
}

const author = (id: string, email: string | null, hasLogin = true): SyncAuthor => ({ id, email, hasLogin });
const sub = (id: string, email: string, status: string, authorId: string | null = null): SyncSubscriber => ({ id, email, status, authorId });
const EMPTY = { insert: [], link: [], updateEmail: [] };

console.log("=== Adresse ===");
eq("klein und ohne Leerraum", normalizeEmail("  Anna@Beispiel.CH "), "anna@beispiel.ch");
eq("kaputt", [normalizeEmail("kein-at"), normalizeEmail(null), normalizeEmail("a b@c.ch")], ["", "", ""]);

console.log("=== Neu eintragen ===");
eq("Autorin mit Konto, nicht in der Liste", planAuthorSync([author("a1", "Anna@Beispiel.ch")], []), { ...EMPTY, insert: [{ authorId: "a1", email: "anna@beispiel.ch" }] });
eq("Profil ohne Konto bleibt aussen vor", planAuthorSync([author("a1", "gast@beispiel.ch", false)], []), EMPTY);
eq("Profil ohne gueltige Adresse", planAuthorSync([author("a1", "kaputt"), author("a2", null)], []), EMPTY);
eq("zwei Profile, dieselbe Adresse: nur eines", planAuthorSync([author("a1", "x@y.ch"), author("a2", "X@Y.ch")], []).insert, [{ authorId: "a1", email: "x@y.ch" }]);

console.log("=== Schon in der Liste ===");
eq("bestaetigt: nur verknuepfen", planAuthorSync([author("a1", "anna@beispiel.ch")], [sub("s1", "anna@beispiel.ch", "confirmed")]), { ...EMPTY, link: [{ subscriberId: "s1", authorId: "a1", confirm: false }] });
eq("unbestaetigt: verknuepfen und bestaetigen", planAuthorSync([author("a1", "anna@beispiel.ch")], [sub("s1", "Anna@Beispiel.ch", "pending")]).link, [{ subscriberId: "s1", authorId: "a1", confirm: true }]);
eq("abgemeldet: verknuepfen, aber nicht bestaetigen", planAuthorSync([author("a1", "anna@beispiel.ch")], [sub("s1", "anna@beispiel.ch", "unsubscribed")]), { ...EMPTY, link: [{ subscriberId: "s1", authorId: "a1", confirm: false }] });
eq("Zeile gehoert einem anderen Profil", planAuthorSync([author("a2", "anna@beispiel.ch")], [sub("s1", "anna@beispiel.ch", "confirmed", "a1")]), EMPTY);

console.log("=== Schon verknuepft ===");
eq("bestaetigt und unveraendert: nichts", planAuthorSync([author("a1", "anna@beispiel.ch")], [sub("s1", "anna@beispiel.ch", "confirmed", "a1")]), EMPTY);
eq("abgemeldet bleibt abgemeldet", planAuthorSync([author("a1", "anna@beispiel.ch")], [sub("s1", "anna@beispiel.ch", "unsubscribed", "a1")]), EMPTY);
eq("abgemeldet, neue Adresse im Profil: kein neuer Eintrag", planAuthorSync([author("a1", "neu@beispiel.ch")], [sub("s1", "alt@beispiel.ch", "unsubscribed", "a1")]), EMPTY);
eq("bestaetigt, neue Adresse im Profil: Adresse zieht mit", planAuthorSync([author("a1", "Neu@Beispiel.ch")], [sub("s1", "alt@beispiel.ch", "confirmed", "a1")]), { ...EMPTY, updateEmail: [{ subscriberId: "s1", email: "neu@beispiel.ch" }] });
eq("neue Adresse ist schon vergeben: nichts", planAuthorSync([author("a1", "neu@beispiel.ch")], [sub("s1", "alt@beispiel.ch", "confirmed", "a1"), sub("s2", "neu@beispiel.ch", "confirmed")]), EMPTY);

console.log("=== Gemischt ===");
{
  const plan = planAuthorSync(
    [author("a1", "eins@x.ch"), author("a2", "zwei@x.ch"), author("a3", "drei@x.ch"), author("a4", "vier@x.ch", false), author("a5", "fuenf@x.ch")],
    [sub("s1", "eins@x.ch", "confirmed", "a1"), sub("s2", "zwei@x.ch", "pending"), sub("s3", "leser@x.ch", "confirmed"), sub("s5", "fuenf@x.ch", "unsubscribed", "a5")],
  );
  eq("ein neuer Eintrag", plan.insert, [{ authorId: "a3", email: "drei@x.ch" }]);
  eq("eine Verknuepfung mit Bestaetigung", plan.link, [{ subscriberId: "s2", authorId: "a2", confirm: true }]);
  eq("keine Adresse nachzufuehren", plan.updateEmail, []);
  eq("Plan ist nicht leer", isEmptyPlan(plan), false);
  eq("zweiter Lauf nach dem ersten ist leer", isEmptyPlan(planAuthorSync(
    [author("a1", "eins@x.ch"), author("a2", "zwei@x.ch"), author("a3", "drei@x.ch"), author("a4", "vier@x.ch", false), author("a5", "fuenf@x.ch")],
    [sub("s1", "eins@x.ch", "confirmed", "a1"), sub("s2", "zwei@x.ch", "confirmed", "a2"), sub("s3", "leser@x.ch", "confirmed"), sub("s5", "fuenf@x.ch", "unsubscribed", "a5"), sub("s6", "drei@x.ch", "confirmed", "a3")],
  )), true);
}

console.log(fails === 0 ? "\nAlle Tests gruen." : `\n${fails} Test(s) fehlgeschlagen.`);
process.exit(fails === 0 ? 0 : 1);
