// Welche Beitraege sich loeschen lassen. Eine Regel fuer den Knopf im Editor
// und fuer die Server-Action (deleteArticle), damit beide nie auseinanderlaufen.
//
// - Autorin, Autor: nur den eigenen Entwurf (entspricht der RLS-Policy
//   articles_author_delete_own_draft).
// - Redaktion: Entwurf, eingereichten Beitrag (In Review) und archivierten
//   Beitrag. Ein veroeffentlichter Beitrag wird zuerst archiviert: Loeschen
//   nimmt die Adresse ohne Umweg vom Netz und laesst sich nicht zuruecknehmen.
//
// Bis zum 15.11.2026 gab es den Knopf nur beim Entwurf. Ein eingereichter Beitrag liess
// sich weder loeschen noch zuruecknehmen, obwohl die Datenbank es der Redaktion
// erlaubt (Policy articles_editor_all).

export type DeletableStatus = "draft" | "in_review" | "published" | "archived";

export function canDeleteArticle(status: DeletableStatus, isEditor: boolean): boolean {
  if (status === "draft") return true;
  if (!isEditor) return false;
  return status === "in_review" || status === "archived";
}

// Meldung, wenn Loeschen nicht erlaubt ist; null = erlaubt.
export function deleteBlockedMessage(status: DeletableStatus, isEditor: boolean): string | null {
  if (canDeleteArticle(status, isEditor)) return null;
  if (status === "published") {
    return isEditor
      ? "Ein veröffentlichter Beitrag lässt sich nicht direkt löschen. Bitte zuerst archivieren."
      : "Ein veröffentlichter Beitrag lässt sich nicht löschen. Bitte die Redaktion fragen.";
  }
  return "Nur die Redaktion kann diesen Beitrag löschen. Eigene Entwürfe kannst du selbst löschen.";
}

// Rueckfrage vor dem Loeschen. Bei einem fremden Beitrag steht der Name dabei:
// Wer loescht, soll sehen, wessen Arbeit verloren geht.
export function deleteConfirmText(
  status: DeletableStatus,
  opts: { title: string; authorName?: string | null; own: boolean },
): string {
  const title = opts.title.trim() || "Ohne Titel";
  const what =
    status === "in_review"
      ? "den eingereichten Beitrag"
      : status === "archived"
        ? "den archivierten Beitrag"
        : "den Entwurf";
  const whose = !opts.own && opts.authorName?.trim() ? ` von ${opts.authorName.trim()}` : "";
  return `«${title}»: ${what}${whose} endgültig löschen?\n\nText, Bilder und frühere Fassungen gehen verloren. Das lässt sich nicht rückgängig machen.`;
}
