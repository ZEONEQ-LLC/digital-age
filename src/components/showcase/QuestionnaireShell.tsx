import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

// Rahmen und Gestaltung der Fragebogen-Seite (/showcase/mitmachen/<token>).
// Die Seite ist chromefrei (kein Navbar, kein Consent-Banner, keine Anzeigen):
// oben nur das Logo, unten Impressum und Datenschutz. Eine Spalte, Abschnitte
// mit Nummer und Linie, keine Karten.
export default function QuestionnaireShell({ children }: { children: ReactNode }) {
  return (
    <main className="sq-page">
      <style>{`
        .sq-page { background: var(--da-dark); min-height: 100vh; padding: 28px var(--gutter) 72px; }
        .sq-wrap { max-width: 720px; margin: 0 auto; }
        .sq-brand { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-bottom: 20px; border-bottom: 1px solid var(--da-border); margin-bottom: 48px; }
        .sq-brand img { height: 34px; width: auto; display: block; }
        .sq-brand span { color: var(--da-muted); font-size: 14px; }

        .sq-title { color: var(--da-text); font-family: var(--da-font-display); font-size: 40px; font-weight: 700; line-height: 1.12; letter-spacing: -0.015em; margin: 0 0 18px; }
        .sq-lead { color: var(--da-text-strong); font-size: 18px; line-height: 1.6; margin: 0 0 14px; }
        .sq-meta { color: var(--da-muted); font-size: 14px; line-height: 1.6; margin: 0; }
        .sq-meta a, .sq-check a, .sq-foot a { color: var(--da-text-strong); text-decoration: underline; text-underline-offset: 3px; text-decoration-color: var(--da-border); }
        .sq-meta a:hover, .sq-check a:hover, .sq-foot a:hover { text-decoration-color: var(--da-green); color: var(--da-text); }

        .sq-sec { border-top: 1px solid var(--da-border); margin-top: 48px; padding-top: 32px; }
        .sq-h2 { color: var(--da-text); font-family: var(--da-font-display); font-size: 24px; font-weight: 700; letter-spacing: -0.005em; margin: 0 0 20px; display: flex; gap: 14px; align-items: baseline; }
        .sq-h2 span { color: var(--da-muted-soft); font-weight: 500; min-width: 0.9em; }
        .sq-intro { color: var(--da-muted); font-size: 15px; line-height: 1.6; margin: -6px 0 22px; max-width: 62ch; }

        .sq-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px 24px; }
        .sq-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
        .sq-field--wide { grid-column: 1 / -1; }
        .sq-field--q { margin-bottom: 26px; }
        .sq-field--indent { margin: 4px 0 0 30px; max-width: 420px; }
        .sq-label { color: var(--da-text); font-size: 15px; font-weight: 600; line-height: 1.4; }
        .sq-label em { color: var(--da-orange); font-style: normal; font-weight: 500; font-size: 13px; margin-left: 8px; }
        .sq-hint { color: var(--da-muted); font-size: 13.5px; line-height: 1.5; }
        .sq .da-input { font-size: 16px; line-height: 1.5; min-height: 48px; }
        .sq select.da-input { appearance: auto; }
        .sq-area { resize: vertical; min-height: 96px; font-family: var(--da-font-body); }
        .sq-count { color: var(--da-muted-soft); font-size: 12.5px; align-self: flex-end; font-variant-numeric: tabular-nums; }
        .sq-count--over { color: var(--da-red); }
        .sq-err { color: #ff8e8e; font-size: 13.5px; line-height: 1.45; margin: 2px 0 0; }
        .sq [data-error="true"].da-input { border-color: #ff8e8e; }
        .sq-hp { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }

        .sq-mode { border: 0; padding: 0; margin: 0 0 30px; display: grid; gap: 10px; }
        .sq-mode legend { margin-bottom: 10px; padding: 0; }
        .sq-mode label, .sq-check { display: flex; gap: 12px; align-items: flex-start; color: var(--da-text-strong); font-size: 15.5px; line-height: 1.5; cursor: pointer; }
        .sq-mode input, .sq-check input { width: 18px; height: 18px; margin: 3px 0 0; accent-color: var(--da-green); flex: none; }
        .sq-mode strong { color: var(--da-text); font-weight: 600; }
        .sq-consent { margin-bottom: 18px; }
        .sq-consent .sq-err { margin: 6px 0 0 30px; }
        .sq-check[data-error="true"] input { outline: 1px solid #ff8e8e; outline-offset: 2px; }
        .sq-check small { display: block; color: var(--da-muted); font-size: 13.5px; line-height: 1.5; margin-top: 4px; }
        .sq-check em { color: var(--da-orange); font-style: normal; font-size: 13px; margin-left: 8px; }

        .sq-file { display: inline-flex; width: fit-content; }
        .sq-file input { position: absolute; width: 1px; height: 1px; opacity: 0; }
        .sq-file span { border: 1px solid var(--da-border); color: var(--da-text); font-size: 14px; font-weight: 600; padding: 10px 16px; border-radius: var(--r-sm); cursor: pointer; }
        .sq-file:hover span, .sq-file input:focus-visible + span { border-color: var(--da-green); }
        .sq-media { display: flex; align-items: center; gap: 16px; }
        .sq-media__thumb { position: relative; width: 160px; height: 100px; background: var(--da-darker); border: 1px solid var(--da-border); overflow: hidden; }
        .sq-media__thumb--logo { width: 100px; background: #fff; }
        .sq-link { background: none; border: 0; padding: 0; color: var(--da-muted); font-size: 14px; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
        .sq-link:hover { color: var(--da-text); }

        .sq-send { border-top: 1px solid var(--da-border); margin-top: 44px; padding-top: 28px; display: grid; gap: 16px; justify-items: start; }
        .sq-submit { padding: 14px 24px; font-size: 16px; }
        .sq-submit:disabled { opacity: 0.6; cursor: default; }
        .sq-alert { color: #ff8e8e; font-size: 15px; margin: 0; }
        .sq-done { padding: 24px 0 120px; }

        .sq-foot { max-width: 720px; margin: 72px auto 0; padding-top: 20px; border-top: 1px solid var(--da-border); color: var(--da-muted-soft); font-size: 13px; display: flex; gap: 20px; flex-wrap: wrap; }

        @media (max-width: 640px) {
          .sq-page { padding-top: 20px; }
          .sq-brand { margin-bottom: 32px; }
          .sq-title { font-size: 30px; }
          .sq-lead { font-size: 17px; }
          .sq-grid { grid-template-columns: minmax(0, 1fr); }
          .sq-h2 { font-size: 21px; }
          .sq-field--indent { margin-left: 0; }
        }
      `}</style>
      <div className="sq-wrap">
        <div className="sq-brand">
          <Link href="/" aria-label="digital age, zur Startseite">
            <Image src="/images/digital age Logo green dark bg.png" alt="digital age" width={420} height={260} priority />
          </Link>
          <span>Showcase</span>
        </div>
        {children}
      </div>
      <footer className="sq-foot">
        <span>digital age, das Magazin für KI und Future Tech</span>
        <Link href="/impressum">Impressum</Link>
        <Link href="/datenschutzerklaerung">Datenschutz</Link>
        <Link href="/swiss-ai/regeln#showcase">Regeln des Showcase</Link>
      </footer>
    </main>
  );
}

// Zustaende ohne Formular: abgelaufen, schon abgeschickt.
export function QuestionnaireNotice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="sq-done">
      <h1 className="sq-title">{title}</h1>
      <p className="sq-lead">{children}</p>
    </div>
  );
}
