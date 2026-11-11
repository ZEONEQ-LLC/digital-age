// Bilder mit browser-lokaler Adresse (blob:, data:) duerfen nicht gespeichert
// werden: blob: gilt nur im Tab, in dem das Bild eingefuegt wurde, data:
// blaeht body_blocks auf. Entstehen koennen sie durch Einfuegen eines Bilds aus
// einer anderen Seite oder Speichern waehrend eines Uploads. Ein Fall ist live
// (Backlog-Karte «9 Artikel mit kaputten Bildern», blob: in einem Artikel).

import type { BlockDocument } from "@/types/blocks";

const LOCAL_URL = /^\s*(blob:|data:)/i;

export function isLocalImageUrl(url: string | null | undefined): boolean {
  return !!url && LOCAL_URL.test(url);
}

// Anzahl der Bildbloecke mit lokaler Adresse.
export function countLocalImages(doc: BlockDocument | null | undefined): number {
  let n = 0;
  for (const b of doc?.blocks ?? []) {
    if (b.type === "image" && isLocalImageUrl(b.url)) n++;
  }
  return n;
}

export function localImageMessage(count: number): string {
  return count === 1
    ? "Ein Bild im Text ist nicht hochgeladen (lokale blob:- oder data:-Adresse). Bitte das Bild entfernen und neu hochladen, dann speichern."
    : `${count} Bilder im Text sind nicht hochgeladen (lokale blob:- oder data:-Adressen). Bitte entfernen und neu hochladen, dann speichern.`;
}
