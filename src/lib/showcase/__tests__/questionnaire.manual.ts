// Manueller Test-Runner fuer den Showcase-Fragebogen (S3a).
//   npx tsx src/lib/showcase/__tests__/questionnaire.manual.ts
import {
  ANSWER_MIN,
  MEDIA_MAX_BYTES,
  OWN_TEXT_MIN_WORDS,
  checkProfile,
  countWords,
  diffProfile,
  firstName,
  inviteState,
  isHttpUrl,
  looksLikeBot,
  mediaPath,
  mediaPathBelongsTo,
  monthOf,
  profileFromStartup,
  profilePatchFromChanges,
  profileValueLabel,
  sniffImageType,
  validateInvite,
  validateSubmission,
  SHOWCASE_TOKEN_RE,
  type ProfileValues,
  type SubmissionInput,
} from "../questionnaire";

let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (!cond) fails++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${!cond && detail ? `\n      ${detail}` : ""}`);
}
const eq = (label: string, got: unknown, want: unknown) =>
  ok(label, JSON.stringify(got) === JSON.stringify(want), `erhalten ${JSON.stringify(got)}, erwartet ${JSON.stringify(want)}`);

const profile: ProfileValues = {
  name: "Modulos AG",
  tagline: "AI Governance für den EU AI Act",
  city: "Zürich",
  industry: "AI Governance",
  founded_year: 2018,
  employee_range: "r_11_50",
  swiss_status: "swiss_founded",
  funding_stage: "seed",
  last_round_month: "2025-07",
  open_to_investment: false,
};
const long = (n: number) => "Wir helfen Unternehmen. ".repeat(Math.ceil(n / 24)).slice(0, n);
const base: SubmissionInput = {
  contactName: "  Anna   Muster ",
  contactRole: "CEO",
  contactEmail: "Anna@Modulos.ai",
  mode: "questions",
  answers: { problem: long(120), solution: long(120), usecase: long(120), learnings: long(120), trust: long(120), outlook: long(120) },
  quote: "KI braucht Regeln, die man versteht.",
  quoteBy: "Anna Muster, CEO",
  ownText: "",
  links: ["https://www.modulos.ai", ""],
  logoPath: null,
  imagePath: null,
  profile,
  consentData: true,
  consentLabelling: true,
  consentMediaRights: false,
  contactForwarding: false,
  contactForwardingEmail: "",
};

// --- Token
ok("Token: 48 Hex-Zeichen", SHOWCASE_TOKEN_RE.test("a".repeat(48)) && !SHOWCASE_TOKEN_RE.test("a".repeat(47)) && !SHOWCASE_TOKEN_RE.test("g".repeat(48)));

// --- Gueltige Einreichung
{
  const r = validateSubmission(base);
  ok("vollstaendige Antworten sind gueltig", r.ok);
  if (r.ok) {
    eq("Name bereinigt", r.value.contact_name, "Anna Muster");
    eq("E-Mail klein geschrieben", r.value.contact_email, "anna@modulos.ai");
    eq("leerer Link faellt weg", r.value.links, ["https://www.modulos.ai"]);
    eq("Zitat steht bei den Antworten", [r.value.answers.quote, r.value.answers.quote_by], ["KI braucht Regeln, die man versteht.", "Anna Muster, CEO"]);
    eq("kein eigener Text", r.value.own_text, null);
    eq("keine Kontaktweiterleitung", r.value.consent_contact_email, null);
    eq("ohne Dateien keine Rechte-Bestaetigung noetig", r.value.consent_media_rights, false);
  }
}

// --- Pflichtangaben
{
  const r = validateSubmission({ ...base, contactName: "", contactRole: "", contactEmail: "kein-at" });
  ok("Kontaktperson ist Pflicht", !r.ok && Boolean(r.fieldErrors.contactName && r.fieldErrors.contactRole && r.fieldErrors.contactEmail));
}
{
  const r = validateSubmission({ ...base, answers: { ...base.answers, trust: "zu kurz" } });
  ok("kurze Antwort wird abgelehnt", !r.ok && (r.fieldErrors.answer_trust ?? "").includes(String(ANSWER_MIN)));
}
{
  const r = validateSubmission({ ...base, answers: { ...base.answers, outlook: long(2600) } });
  ok("zu lange Antwort wird abgelehnt", !r.ok && Boolean(r.fieldErrors.answer_outlook));
}
{
  const r = validateSubmission({ ...base, quoteBy: "" });
  ok("Zitat ohne Namen wird abgelehnt", !r.ok && Boolean(r.fieldErrors.quoteBy));
}
{
  const r = validateSubmission({ ...base, quote: "", quoteBy: "" });
  ok("ohne Zitat geht es auch", r.ok && r.value.answers.quote === undefined);
}
{
  const r = validateSubmission({ ...base, consentData: false, consentLabelling: false });
  ok("beide Bestaetigungen sind Pflicht", !r.ok && Boolean(r.fieldErrors.consentData && r.fieldErrors.consentLabelling));
}

// --- Eigener Text
{
  const words = (n: number) => Array.from({ length: n }, () => "Wort").join(" ");
  const short = validateSubmission({ ...base, mode: "own_text", ownText: words(OWN_TEXT_MIN_WORDS - 1), answers: {} });
  ok("eigener Text: zu kurz", !short.ok && (short.fieldErrors.ownText ?? "").includes("zu kurz"));
  const fine = validateSubmission({ ...base, mode: "own_text", ownText: words(800), answers: {} });
  ok("eigener Text: 800 Woerter gueltig, Fragen nicht noetig", fine.ok && fine.value.own_text !== null && Object.keys(fine.value.answers).length === 2);
  const tooLong = validateSubmission({ ...base, mode: "own_text", ownText: words(1500), answers: {} });
  ok("eigener Text: zu lang", !tooLong.ok && (tooLong.fieldErrors.ownText ?? "").includes("zu lang"));
  eq("Woerter zaehlen", [countWords(""), countWords("  eins  zwei\ndrei ")], [0, 3]);
}

// --- Links
ok("Link braucht http(s) und eine Domain", isHttpUrl("https://x.ch/a") && !isHttpUrl("x.ch") && !isHttpUrl("javascript:alert(1)") && !isHttpUrl("https://localhost"));
{
  const r = validateSubmission({ ...base, links: ["modulos.ai", "https://ok.ch"] });
  ok("Link ohne Protokoll wird abgelehnt", !r.ok && Boolean(r.fieldErrors.link_0));
  const dup = validateSubmission({ ...base, links: ["https://ok.ch", "https://ok.ch"] });
  ok("doppelter Link nur einmal", dup.ok && dup.value.links.length === 1);
}

// --- Dateien und Rechte
{
  const r = validateSubmission({ ...base, logoPath: "abc/logo-12345678.png" });
  ok("Logo ohne Rechte-Bestaetigung wird abgelehnt", !r.ok && Boolean(r.fieldErrors.consentMediaRights));
  const fine = validateSubmission({ ...base, logoPath: "abc/logo-12345678.png", consentMediaRights: true });
  ok("Logo mit Bestaetigung ist gueltig", fine.ok && fine.value.consent_media_rights === true);
}
eq("PNG erkannt", sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])), "image/png");
eq("WebP erkannt", sniffImageType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50])), "image/webp");
eq("SVG wird nicht angenommen", sniffImageType(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>")), null);
eq("JPEG wird nicht angenommen", sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])), null);
{
  const id = "11111111-2222-3333-4444-555555555555";
  const p = mediaPath(id, "logo", "0a1b2c3d", "image/png");
  eq("Pfad des Logos", p, `${id}/logo-0a1b2c3d.png`);
  ok("Pfad gehoert zum Unternehmen", mediaPathBelongsTo(p, id, "logo"));
  ok("fremder Ordner wird abgelehnt", !mediaPathBelongsTo(`andere/logo-0a1b2c3d.png`, id, "logo"));
  ok("falsche Art wird abgelehnt", !mediaPathBelongsTo(p, id, "bild"));
  ok("Pfad mit ../ wird abgelehnt", !mediaPathBelongsTo(`${id}/../x/logo-0a1b2c3d.png`, id, "logo"));
  ok("kein Pfad ist in Ordnung", mediaPathBelongsTo(null, id, "logo"));
  ok("Dateigrenze unter 1 MB", MEDIA_MAX_BYTES < 1024 * 1024);
}

// --- Kontaktweiterleitung
{
  const r = validateSubmission({ ...base, contactForwarding: true, contactForwardingEmail: " Hello@Modulos.ai " });
  ok("Weiterleitung mit Adresse", r.ok && r.value.consent_contact_email === "hello@modulos.ai");
  const noMail = validateSubmission({ ...base, contactForwarding: true, contactForwardingEmail: "" });
  ok("Weiterleitung ohne Adresse wird abgelehnt", !noMail.ok && Boolean(noMail.fieldErrors.contactForwardingEmail));
  const noCheck = validateSubmission({ ...base, contactForwarding: false, contactForwardingEmail: "hello@modulos.ai" });
  ok("Adresse ohne Haekchen wird abgelehnt", !noCheck.ok && Boolean(noCheck.fieldErrors.contactForwardingEmail));
}

// --- Profil
{
  const c = checkProfile({ ...profile, city: "zurich", founded_year: "2018", funding_stage: "" });
  ok("Profil gueltig, Stadt vereinheitlicht, leere Stage = keine", Object.keys(c.errors).length === 0 && c.values.city === "Zürich" && c.values.founded_year === 2018 && c.values.funding_stage === null);
  const bad = checkProfile({ ...profile, industry: "Krypto", founded_year: 1800, employee_range: "riesig", swiss_status: "x", funding_stage: "ipo", last_round_month: "2025-13", name: "", tagline: "x".repeat(101) });
  eq("ungueltige Profilwerte", Object.keys(bad.errors).sort(), ["employee_range", "founded_year", "funding_stage", "industry", "last_round_month", "name", "swiss_status", "tagline"]);
  eq("keine Aenderung = leerer Vorschlag", diffProfile(profile, { ...profile }), {});
  eq("nur geaenderte Felder", diffProfile(profile, { ...profile, tagline: "Neu", open_to_investment: true }), { tagline: "Neu", open_to_investment: true });
  eq("Monat aus Datum", [monthOf("2025-07-01"), monthOf(null)], ["2025-07", ""]);
  eq(
    "Profil aus DB-Zeile",
    profileFromStartup({ ...profile, last_round_at: "2025-07-01" }).last_round_month,
    "2025-07",
  );
}
{
  const { patch, rejected } = profilePatchFromChanges(profile, { tagline: " Neu ", city: "geneva", last_round_month: "2026-01", open_to_investment: true, status: "featured", founded_year: 1700 });
  eq("Update fuer das Verzeichnis", patch, { tagline: "Neu", city: "Genf", last_round_at: "2026-01-01", open_to_investment: true });
  eq("unbekannte und ungueltige Felder fallen weg", rejected.sort(), ["founded_year", "status"]);
  eq("letzte Runde leeren", profilePatchFromChanges(profile, { last_round_month: "" }).patch, { last_round_at: null });
  eq("kein Objekt = nichts", profilePatchFromChanges(profile, "x").patch, {});
}
eq("Anzeige der Werte", [profileValueLabel("employee_range", "r_11_50"), profileValueLabel("open_to_investment", true), profileValueLabel("last_round_month", "2025-07"), profileValueLabel("funding_stage", null)], ["11–50", "ja", "07.2025", "keine Angabe"]);

// --- Bot-Signale
ok("Honeypot gefuellt = Bot", looksLikeBot({ website: "x", openedAt: 0 }, 10_000_000));
ok("zu schnell = Bot", looksLikeBot({ website: "", openedAt: 1000 }, 5000));
ok("normale Ausfuellzeit = Mensch", !looksLikeBot({ website: "", openedAt: 1000 }, 1000 + 5 * 60 * 1000));

// --- Einladung
{
  const now = Date.parse("2026-12-01T10:00:00Z");
  eq("offen", inviteState({ status: "invited", expires_at: "2027-01-15T00:00:00Z" }, now), "open");
  eq("abgelaufen", inviteState({ status: "invited", expires_at: "2026-11-30T00:00:00Z" }, now), "expired");
  eq("eingereicht", inviteState({ status: "submitted", expires_at: "2026-11-30T00:00:00Z" }, now), "submitted");
  eq("zurueckgezogen", inviteState({ status: "withdrawn", expires_at: "2027-01-15T00:00:00Z" }, now), "withdrawn");
  eq("Vorname", [firstName("Anna Muster"), firstName(""), firstName(null)], ["Anna", "", ""]);
  const today = "2026-12-01";
  ok("Einladung ohne Mail braucht nichts", validateInvite({ name: "", email: "", replyBy: "", sendMail: false }, today).ok);
  ok("Mail braucht Adresse", !validateInvite({ name: "Anna", email: "", replyBy: "2026-12-20", sendMail: true }, today).ok);
  ok("Mail braucht Namen", !validateInvite({ name: "", email: "a@b.ch", replyBy: "2026-12-20", sendMail: true }, today).ok);
  ok("Mail braucht Datum", !validateInvite({ name: "Anna", email: "a@b.ch", replyBy: "", sendMail: true }, today).ok);
  ok("Datum in der Vergangenheit wird abgelehnt", !validateInvite({ name: "Anna", email: "a@b.ch", replyBy: "2026-11-30", sendMail: true }, today).ok);
  const good = validateInvite({ name: " Anna Muster ", email: "Anna@B.ch", replyBy: "2026-12-20", sendMail: true }, today);
  ok("vollstaendige Einladung", good.ok && good.value.invitee_email === "anna@b.ch" && good.value.invitee_name === "Anna Muster");
}

console.log(fails === 0 ? "\nAlle Tests gruen." : `\n${fails} Test(s) fehlgeschlagen.`);
process.exit(fails === 0 ? 0 : 1);
