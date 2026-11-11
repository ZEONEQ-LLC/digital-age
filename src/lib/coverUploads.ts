// Beitragsbild aus dem Uploader: welche Dateien darf der Editor loeschen?
//
// Regel (PR 188): Ein neues Bild ersetzt das alte nur im Editor-State. Ein
// einmal gespeichertes Bild bleibt im Storage, denn Revisionen verweisen auf
// cover_image_url und ein Restore braucht die Datei. Geloescht werden nur
// Uploads, die nie gespeichert wurden: sobald sie ersetzt oder entfernt
// werden, nach dem naechsten erfolgreichen Save und beim bestaetigten
// Verlassen des Editors. Hero-Studio-Dateien sind ausgenommen: gespeicherte
// bleiben aus demselben Grund liegen (seit PR 190), nie gespeicherte loescht
// das Studio selbst.
//
// Bewusst ohne Imports: Editor und manueller Test nutzen dieselbe Funktion.

const PUBLIC_ARTICLES = /\/storage\/v1\/object\/public\/articles\/([^?#]+)/;
const HERO_STUDIO_FILE = /^(hero|og)-[0-9a-f]{8}\.(png|mp4)$/;

// Dateiname eines Uploader-Bilds im Ordner des Artikels, sonst null:
// leere oder externe URL, fremder Artikel, Unterordner, Hero-Studio-Datei.
export function coverUploadFilename(articleId: string, url: string | null | undefined): string | null {
  if (!articleId || !url) return null;
  const m = url.match(PUBLIC_ARTICLES);
  if (!m) return null;
  let path: string;
  try {
    path = decodeURIComponent(m[1]);
  } catch {
    return null;
  }
  const prefix = `${articleId}/`;
  if (!path.startsWith(prefix)) return null;
  const name = path.slice(prefix.length);
  if (!name || name.includes("/") || name.includes("..")) return null;
  if (HERO_STUDIO_FILE.test(name)) return null;
  return name;
}

// Ungespeicherte Uploads, die weg duerfen: alle ausser denen in `keep`
// (aktuelles Cover). Rueckgabe: Dateinamen fuer deleteArticleImage.
export function discardableCoverUploads(
  articleId: string,
  unsaved: Iterable<string>,
  keep: Iterable<string>,
): string[] {
  const kept = new Set([...keep].filter(Boolean));
  const names = new Set<string>();
  for (const url of unsaved) {
    if (kept.has(url)) continue;
    const name = coverUploadFilename(articleId, url);
    if (name) names.add(name);
  }
  return [...names];
}
