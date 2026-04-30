# digital-age-v2

News-Magazin für Künstliche Intelligenz und Future Tech in der DACH-Region.

**Live:** [digital-age-v2-eight.vercel.app](https://digital-age-v2-eight.vercel.app)

## Stack

- **Next.js 16** (App Router, TypeScript)
- **React 19**
- **Tailwind CSS v4**
- **Supabase** — Postgres, Auth, Storage (in Vorbereitung)
- **Vercel** — Hosting & Preview-Deploys
- **GitHub** — Versionskontrolle, Auto-Deploy

## Setup

```bash
# Dependencies installieren
npm install

# Dev-Server starten
npm run dev
```

Dev-Server läuft auf [http://localhost:3000](http://localhost:3000).

Im OrbStack-Container (`claude-box`): [http://claude-box.orb.local:3000](http://claude-box.orb.local:3000).

Der `--hostname 0.0.0.0`-Flag ist im `dev`-Script bereits verdrahtet —
notwendig, damit der Container-Server vom Mac-Browser erreichbar ist.

## Befehle

```bash
npm run dev      # Dev-Server (mit --hostname 0.0.0.0 im Script verdrahtet)
npm run build    # Production-Build
npm run start    # Production-Server lokal
npm run lint     # ESLint
```

## Struktur

```
src/
├── app/              # App Router (Routes, Layouts, globale Styles)
├── components/       # React-Komponenten
public/
└── images/           # Logos, Hero-Bilder, Assets
```

## Deployment

- Push auf `main` → automatisches Production-Deploy via Vercel
- Pull Request → automatischer Preview-Deploy
- Branch Protection auf `main`: Merges nur via PR

## Konventionen

Siehe [`CLAUDE.md`](./CLAUDE.md) für Code-Stil, Workflow und Konventionen
(wird auch von Claude Code automatisch gelesen).

Siehe [`AGENTS.md`](./AGENTS.md) für Agent-spezifische Hinweise zur
Next.js-16-Eigenheiten.

## Domain

`digital-age.ch` ist registriert und läuft aktuell noch auf WordPress
(Hostpoint). Migration zu Vercel erfolgt, sobald digital-age-v2
produktionsreif ist.
