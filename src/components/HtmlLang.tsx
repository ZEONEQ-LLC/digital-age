"use client";

import { useEffect } from "react";

// Setzt <html lang> fuer eine Seite in anderer Sprache als dem Root-Layout
// (Artikel mit locale "en"). Das Root-Layout kann die Sprache nicht pro
// Route kennen; das Attribut wirkt fuer Screenreader und Rechtschreibhilfen.
// Beim Verlassen zurueck auf den Root-Wert.
export default function HtmlLang({ lang }: { lang: string }) {
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.lang;
    root.lang = lang;
    return () => { root.lang = previous; };
  }, [lang]);
  return null;
}
