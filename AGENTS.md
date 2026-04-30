<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Stack-Versionen (Stand: April 2026)

- **Next.js 16.2.3** — App Router, src-dir, TypeScript
- **React 19.2.4**
- **Tailwind CSS v4** — Theme via `@theme` in `src/app/globals.css`, NICHT in `tailwind.config.ts`
- **ESLint 9** — Befehl ist `eslint` direkt, NICHT `next lint`

Bei Unsicherheit über aktuelle Patterns: erst Doku lesen (lokal in `node_modules` oder online), dann Code schreiben.
<!-- END:nextjs-agent-rules -->
