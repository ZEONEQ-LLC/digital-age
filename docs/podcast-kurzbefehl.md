# Podcast-Empfehlung per Teilen (iOS-Kurzbefehl)

Eine gehörte Folge oder eine ganze Show aus Apple Podcasts mit zwei Taps als
Empfehlung erfassen. Der Kurzbefehl schickt den Link an
`POST /api/podcasts/ingest`. Der Endpoint legt einen Entwurf an und antwortet
sofort; Titel, Cover, Beschreibung (KI), Kategorie und Sprache werden im
Hintergrund ergänzt. Veröffentlicht wird erst unter
`/autor/freigaben` (eingeloggt, Editor).

## Voraussetzungen (einmalig)

1. In Vercel die Env-Variable `PODCAST_INGEST_TOKEN` setzen (Sensitive):
   ```bash
   openssl rand -hex 32
   ```
   Optional `PODCAST_INGEST_AUTHOR_ID` = `authors.id` des Empfehlers; leer =
   erster Editor. Danach Redeploy (Env greift erst beim nächsten Build).
2. Lokal denselben Wert in `.env.local` eintragen, falls der Endpoint im
   Container getestet werden soll.

## Kurzbefehl «An digital-age» bauen (Kurzbefehle-App)

1. Neuer Kurzbefehl, Name «An digital-age». In den Details:
   **Im Share-Sheet anzeigen** aktivieren, Eingabetypen **URLs** und **Text**.
   «Falls keine Eingabe: Zwischenablage».
2. Aktion **URLs aus Eingabe abrufen** (Apple Podcasts schickt Titel + Link
   als Text; so bleibt nur der Link).
3. Aktion **Inhalte von URL abrufen**:
   - URL: `https://digital-age.ch/api/podcasts/ingest`
   - Methode: **POST**
   - Header: `Authorization` = `Bearer <TOKEN>`
   - Anfragetext: **JSON**, Feld `url` = die URLs aus Schritt 2
4. Aktion **Wörterbuchwert abrufen**: Schlüssel `message` aus «Inhalte der URL».
5. Aktion **Mitteilung anzeigen** mit dem Wörterbuchwert.

Der Kurzbefehl synchronisiert über iCloud auch auf iPad und Mac.

## Antworten des Endpoints

| Fall | HTTP | `message` |
| --- | --- | --- |
| Neu angelegt | 200 | `Erhalten: <Titel>` |
| Schon vorhanden | 200 | `Schon vorhanden: <Titel>` |
| Kein Apple-Link | 200 | `Kein Apple-Podcasts-Link erkannt …` |
| Token falsch | 401 | `Fehler: Token ungültig.` |
| Zu viele Anfragen | 429 | `Fehler: zu viele Anfragen …` (30 pro Stunde, 100 pro Tag je IP) |
| Env fehlt | 503 | `Fehler: Endpoint nicht konfiguriert …` |

## Test ohne iPhone

```bash
curl -s -X POST https://digital-age.ch/api/podcasts/ingest \
  -H "Authorization: Bearer $PODCAST_INGEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://podcasts.apple.com/ch/podcast/x/id1291423644?i=1000790301141"}'
```

## YouTube-Link

Die Anreicherung sucht parallel zur KI das YouTube-Video der Folge (YouTube
Data API, Env `YOUTUBE_API_KEY`). Gesetzt wird nur ein Treffer, dessen Titel
klar zur Apple-Folge passt und der beim Kanal der Show liegt; sonst bleibt das
Feld leer und die Freigaben-Karte zeigt «YouTube fehlt». Dieselbe Suche gibt
es im Podcast-Formular als Button «Suchen» neben dem YouTube-Feld, auch für
bereits veröffentlichte Einträge (bearbeiten, Suchen, speichern). Mit
Apple-Link im Formular wird der Kanal geprüft, ohne Apple-Link zählt nur der
Titel mit strengerer Schwelle.

Spotify wird nicht automatisch gesucht: Spotify verlangt seit Februar 2026 ein
Premium-Konto des App-Besitzers, sonst antwortet die API mit 403. Spotify- und
Audible-Links bleiben manuell.

## Mail nach der Anreicherung

Sobald Cover, Beschreibung und Kategorie ergänzt sind, geht eine Mail an die
`authors.email` des Empfehlers (Resend, Absender `NEWSLETTER_FROM_EMAIL`):
Betreff «Zur Freigabe: <Titel>», mit Cover, KI-Beschreibung, Kategorie,
Sprache, Dauer, vorhandenen Plattform-Links und Button «Prüfen und freigeben»
auf `/autor/freigaben`.
Scheitert die Anreicherung, kommt stattdessen «Empfehlung braucht Hilfe:
<Titel>» mit dem Grund. «Erneut versuchen» auf der Freigaben-Seite
verschickt keine Mail. Fehlt der Resend-Key, bleibt der Entwurf trotzdem
auf der Freigaben-Seite liegen.

## Freigabe auf dem iPhone

`https://digital-age.ch/autor/freigaben` als Lesezeichen oder auf den
Home-Bildschirm legen (Safari, Teilen, «Zum Home-Bildschirm»). Pro Eintrag:
Cover, Titel, Beschreibung, Kategorie, Sprache, dann **Veröffentlichen** oder
**Verwerfen**. Solange die Pille «KI ergänzt …» zeigt, ist Veröffentlichen
gesperrt; nach ein paar Sekunden neu laden. Bei «Fehlgeschlagen» steht der
Grund darunter, **Erneut versuchen** wiederholt die Anreicherung.

## Token wechseln

Neuen Wert erzeugen, in Vercel ersetzen, Redeploy, im Kurzbefehl den Header
anpassen. Der alte Token ist danach sofort ungültig.

## Dubletten

Folgen werden über die Apple-Folgen-ID erkannt, Shows über die Show-ID
(Unique-Indizes auf `podcasts.apple_episode_id` / `apple_show_id`). Derselbe
Link ein zweites Mal ergibt «Schon vorhanden», egal mit welchem Länderpräfix.
