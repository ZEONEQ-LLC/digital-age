// llms.txt — kuratierter Map-Text fuer LLM-Crawler (analog robots.txt fuer
// klassische Bots). Statisch, kein DB-Zugriff. Aenderungen sind redaktionell
// — neuer Inhalt kommt per Code-Edit, nicht zur Laufzeit.

const LLMS_TEXT = `# digital age

> KI & Future Tech für die DACH-Region. digital age ist ein Schweizer
> Magazin für Künstliche Intelligenz, Future Tech und Tools — mit
> Nachrichten, Analysen und Empfehlungen aus Schweizer Perspektive für
> Entscheider und Praktiker. Leitgedanke: Verstehe Technologie, erkenne
> Chancen, sei der Wandel.

digital age publiziert vornehmlich auf Deutsch mit einem wachsenden Anteil
englischsprachiger Fachbeiträge. Der Fokus liegt auf praxisnaher Einordnung
von KI- und Technologiethemen für den DACH-Raum, mit besonderem Augenmerk
auf die Schweizer KI-Landschaft.

## Themen

- [KI & Business](https://digital-age.ch/ki-im-business): KI in Wirtschaft, Banking, Compliance und Unternehmenspraxis — Analysen und Einordnung für Entscheider.
- [Future Tech](https://digital-age.ch/future-tech): Aufkommende Technologien, IoT, Infrastruktur und langfristige Entwicklungen jenseits des Tagesgeschäfts.
- [Swiss AI](https://digital-age.ch/swiss-ai): Die Schweizer KI-Landschaft — Startups, Unternehmen und Initiativen mit Standort Schweiz.
- [KI-Plattformen](https://digital-age.ch/ki-plattformen): Überblick und Einordnung relevanter KI-Plattformen und -Werkzeuge.
- [GenAI Prompts](https://digital-age.ch/ai-prompts): Kuratierte Prompts für generative KI in der Praxis.
- [Podcasts](https://digital-age.ch/podcasts): Gespräche und Audioformate rund um KI und Future Tech.

## Ressourcen

- [Newsletter](https://digital-age.ch/newsletter): "Die Woche in KI" — wöchentlich, rund 5 Minuten Lesezeit.
- [Über digital age](https://digital-age.ch/ueber-uns): Mission und Hintergrund des Magazins.
- [Redaktion](https://digital-age.ch/redaktion): Das Team hinter digital age.
- [KI-Transparenz](https://digital-age.ch/ki-transparenz): Wie digital age KI bei der eigenen Arbeit einsetzt.
- [Beitrag pitchen](https://digital-age.ch/artikel-pitchen): Möglichkeit für Fachautorinnen und -autoren, eigene Beiträge einzubringen.

## Kontakt & Rechtliches

- [Kontakt](https://digital-age.ch/kontakt)
- [Impressum](https://digital-age.ch/impressum)
- [Datenschutzerklärung](https://digital-age.ch/datenschutzerklaerung)
`;

export function GET(): Response {
  return new Response(LLMS_TEXT, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // Statischer Inhalt — darf aggressiv gecacht werden. 1 Tag Freshness,
      // 7 Tage stale-while-revalidate fuer CDN-Edge.
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
