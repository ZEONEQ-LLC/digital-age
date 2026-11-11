// Manueller Test-Runner fuer src/lib/startupContact/validate.ts.
//   npx tsx src/lib/startupContact/__tests__/validate.manual.ts

import { looksLikeBot, purposeLabel, validateContact, validateContactConsent, type StartupContactInput } from "../validate";

let passes = 0;
let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (cond) { passes++; process.stdout.write(`  PASS  ${label}\n`); }
  else { fails++; process.stdout.write(`  FAIL  ${label}${detail ? "\n        " + detail : ""}\n`); }
}
function section(l: string): void { process.stdout.write(`\n=== ${l} ===\n`); }

const base: StartupContactInput = {
  startupSlug: "logicstar", name: "Anna Muster", email: " Anna@Example.CH ", organization: "  ",
  purpose: "investment", message: "Wir interessieren uns für eine Beteiligung an eurer nächsten Runde.", consent: true,
};

section("Kontaktformular");
{
  const r = validateContact(base);
  ok("gueltig", r.ok);
  if (r.ok) {
    ok("E-Mail normalisiert", r.value.email === "anna@example.ch");
    ok("leere Organisation → null", r.value.organization === null);
  }
  const bad = validateContact({ ...base, name: "A", email: "kein-mail", purpose: "spam", message: "kurz", consent: false, startupSlug: "../x" });
  ok("alle Fehler gemeldet", !bad.ok && ["name", "email", "purpose", "message", "consent", "startupSlug"].every((k) => k in bad.fieldErrors), JSON.stringify(bad));
  const long = validateContact({ ...base, message: "x".repeat(2001) });
  ok("Nachricht max 2000", !long.ok && long.fieldErrors.message.includes("2000"));
  ok("Label", purposeLabel("customer") === "Kunde / Auftrag");
}

section("Bot-Signale");
{
  const now = 1_000_000;
  ok("Honeypot gefuellt", looksLikeBot({ website: "http://spam" }, now));
  ok("zu schnell", looksLikeBot({ openedAt: now - 1500 }, now));
  ok("normal", !looksLikeBot({ website: "", openedAt: now - 20_000 }, now));
  ok("ohne Zeitstempel kein Bot-Verdacht", !looksLikeBot({}, now));
}

section("Einverstaendnis zur Weiterleitung");
{
  ok("leer ohne Haekchen ok", validateContactConsent("", false).error === null && validateContactConsent("", false).email === null);
  ok("leer mit Haekchen → Fehler", validateContactConsent("", true).error !== null);
  ok("Adresse ohne Haekchen → Fehler", validateContactConsent("hi@x.ch", false).error !== null);
  ok("Adresse mit Haekchen → ok", validateContactConsent(" Hi@X.ch ", true).email === "hi@x.ch");
  ok("ungueltige Adresse", validateContactConsent("hi@", true).error !== null);
}

process.stdout.write(`\n${passes} passed, ${fails} failed\n`);
if (fails > 0) process.exit(1);
