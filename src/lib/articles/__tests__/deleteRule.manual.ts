// npx tsx src/lib/articles/__tests__/deleteRule.manual.ts
import assert from "node:assert/strict";

import { canDeleteArticle, deleteBlockedMessage, deleteConfirmText } from "../deleteRule";

// Autorin, Autor: nur der Entwurf.
assert.equal(canDeleteArticle("draft", false), true);
assert.equal(canDeleteArticle("in_review", false), false);
assert.equal(canDeleteArticle("published", false), false);
assert.equal(canDeleteArticle("archived", false), false);

// Redaktion: alles ausser veroeffentlicht.
assert.equal(canDeleteArticle("draft", true), true);
assert.equal(canDeleteArticle("in_review", true), true);
assert.equal(canDeleteArticle("archived", true), true);
assert.equal(canDeleteArticle("published", true), false);

// Meldungen: null genau dann, wenn erlaubt.
for (const status of ["draft", "in_review", "published", "archived"] as const) {
  for (const isEditor of [true, false]) {
    assert.equal(deleteBlockedMessage(status, isEditor) === null, canDeleteArticle(status, isEditor));
  }
}
assert.match(deleteBlockedMessage("published", true)!, /zuerst archivieren/);
assert.match(deleteBlockedMessage("published", false)!, /Redaktion fragen/);
assert.match(deleteBlockedMessage("in_review", false)!, /Nur die Redaktion/);

// Rueckfrage: Art des Beitrags, Name nur beim fremden Beitrag, Warnung immer.
const own = deleteConfirmText("draft", { title: "Mein Text", authorName: "Ali Soy", own: true });
assert.match(own, /^«Mein Text»: den Entwurf endgültig löschen\?/);
assert.doesNotMatch(own, /Ali Soy/);
assert.match(own, /nicht rückgängig/);

const foreign = deleteConfirmText("in_review", { title: " We Digitised Life ", authorName: "Andreas Kamm", own: false });
assert.match(foreign, /^«We Digitised Life»: den eingereichten Beitrag von Andreas Kamm endgültig löschen\?/);

assert.match(deleteConfirmText("archived", { title: "", authorName: null, own: false }), /^«Ohne Titel»: den archivierten Beitrag endgültig löschen\?/);

console.log("deleteRule: alle Tests gruen");
