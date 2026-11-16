// Manueller Test-Runner fuer src/lib/textClip.ts.
//
//   npx tsx src/lib/__tests__/textClip.manual.ts
//
// Exit-Code 0 bei allem gruen, 1 bei mindestens einem Fail.
import { clipAtSentence, endsCutOff } from "../textClip";

let fails = 0;
function eq(label: string, actual: unknown, expected: unknown): void {
  const ok = actual === expected;
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `\n      erwartet: ${String(expected)}\n      erhalten: ${String(actual)}`}`);
}
function ok(label: string, cond: boolean, detail = ""): void {
  if (!cond) fails++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${!cond && detail ? `\n      ${detail}` : ""}`);
}

console.log("=== clipAtSentence ===");
eq("kurzer Text bleibt", clipAtSentence("Ein Satz.", 50), "Ein Satz.");
eq("Leerraum wird geglaettet", clipAtSentence("  Ein\n Satz.  ", 50), "Ein Satz.");
eq("endet am letzten ganzen Satz", clipAtSentence("Der erste Satz ist lang genug. Der zweite Satz passt nicht mehr hinein.", 45), "Der erste Satz ist lang genug.");
eq("zwei Saetze passen, der dritte nicht", clipAtSentence("Satz eins ist da. Satz zwei auch. Satz drei wird zu lang fuer die Grenze.", 40), "Satz eins ist da. Satz zwei auch.");
eq("Frage- und Ausrufezeichen zaehlen", clipAtSentence("Lohnt sich das wirklich? Wir haben nachgerechnet und sind unsicher.", 30), "Lohnt sich das wirklich?");
eq("schliessendes Anfuehrungszeichen gehoert zum Satz", clipAtSentence("Sie sagt: «Das reicht.» Danach folgt noch viel mehr Text ohne Ende", 30), "Sie sagt: «Das reicht.»");

const podcast = "Die Folge stellt das Schweizer Unternehmen Giotto vor, das eigene KI-Infrastruktur für Europa aufbauen will. Im Gespräch mit CEO Aldo Podestà geht es um die Abhängigkeit des Kontinents von amerikanischen Anbietern und um die Frage, was Souveränität kostet.";
eq("Podcast-Beschrieb vom 16.11.: ein ganzer Satz statt « …»", clipAtSentence(podcast, 200), "Die Folge stellt das Schweizer Unternehmen Giotto vor, das eigene KI-Infrastruktur für Europa aufbauen will.");
ok("mit mehr Platz bleibt der ganze Text", clipAtSentence(podcast, 300) === podcast);

console.log("=== Abkuerzungen und Zahlen ===");
eq("«z. B.» beendet keinen Satz", clipAtSentence("Viele Firmen, z. B. Banken, prüfen das. Der Rest ist zu lang für diese Grenze hier.", 45), "Viele Firmen, z. B. Banken, prüfen das.");
eq("«Mio.» beendet keinen Satz", clipAtSentence("Die Runde bringt 12 Mio. Franken ein. Danach folgt ein langer zweiter Satz.", 45), "Die Runde bringt 12 Mio. Franken ein.");
eq("Datum beendet keinen Satz", clipAtSentence("Am 16. November lief der Versand an. Mehr dazu steht weiter unten im Text.", 45), "Am 16. November lief der Versand an.");
eq("Dezimalzahl beendet keinen Satz", clipAtSentence("Version 3.5 ist da und kann mehr. Der zweite Satz ist zu lang dafür.", 40), "Version 3.5 ist da und kann mehr.");

console.log("=== Ohne Satzgrenze ===");
const one = "Ein einziger sehr langer Satz ohne Punkt der immer weiter und weiter läuft und nicht aufhört";
const clipped = clipAtSentence(one, 40);
ok("Wortgrenze mit Auslassung", clipped.endsWith(" …") && clipped.length <= 40 && !clipped.includes("  "), clipped);
ok("kein halbes Wort", one.startsWith(clipped.slice(0, -2)) && one[clipped.length - 2] === " ", clipped);
const early = clipAtSentence("Ja. Danach kommt ein sehr langer Satz, der die Grenze deutlich sprengt und nie endet", 50);
ok("ein sehr frueher Satz allein reicht nicht", early.endsWith(" …") && early.length > 20, early);
eq("Komma am Ende faellt weg", clipAtSentence("Erstens dies, zweitens das, drittens jenes und noch viel mehr", 28), "Erstens dies, zweitens …");
ok("nie laenger als die Grenze", [20, 33, 47, 80, 120].every((n) => clipAtSentence(podcast, n).length <= n));

console.log("=== endsCutOff ===");
eq("Auslassungszeichen", endsCutOff("Der Text wirkt auf …"), true);
eq("drei Punkte", endsCutOff("Der Text wirkt auf..."), true);
eq("ganzer Satz", endsCutOff("Der Text ist fertig."), false);
eq("Auslassung mitten im Text", endsCutOff("Er sagte … und ging."), false);
eq("leer", endsCutOff(""), false);
eq("null", endsCutOff(null), false);

console.log(fails === 0 ? "\nAlle Tests gruen." : `\n${fails} Test(s) fehlgeschlagen.`);
process.exit(fails === 0 ? 0 : 1);
