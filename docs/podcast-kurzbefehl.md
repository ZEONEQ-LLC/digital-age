# Podcast-Empfehlung per Teilen (iOS-Kurzbefehl)

Eine gehörte Folge oder eine ganze Show aus Apple Podcasts mit zwei Taps als
Empfehlung erfassen. Der Kurzbefehl schickt den Link an
`POST /api/podcasts/ingest`. Der Endpoint legt einen Entwurf an und antwortet
sofort; Titel, Cover, Beschreibung (KI), Kategorie und Sprache werden im
Hintergrund ergänzt. Veröffentlicht wird erst unter
`/autor/admin/freigaben` (eingeloggt, Editor).

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

## Freigabe auf dem iPhone

`https://digital-age.ch/autor/admin/freigaben` als Lesezeichen oder auf den
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
