"use client";

import { useId, useState, type RefObject } from "react";

export type TakeStatus = { msg: string; tone?: "ok" | "warn" | "busy" } | null;

export type TakeView = {
  heroUrl: string;
  ogUrl: string;
  videoUrl: string | null;
  altStatic: string;
  altAnim: string;
};

type Props = {
  animated: boolean;
  animatedDisabled: boolean;
  animatedHint: string | null;
  onAnimated: (v: boolean) => void;
  onTake: () => void;
  takeBusy: boolean;
  takeLabel: string;
  status: TakeStatus;
  progress: number | null;
  whatRows: [string, string][];
  fresh: boolean;
  result: TakeView | null;
  staleText: string | null;
  article: { headline: string; rubrik: string; author: string; date: string };
  reduceMotion: boolean;
  dlHeadRef: RefObject<HTMLParagraphElement | null>;
  onJump: () => void;
  /** Downloads (Stufe D) */
  extra?: React.ReactNode;
  /** Posttexte (Stufe E), unter dem ALT-Text */
  posts?: React.ReactNode;
};

export async function copyText(text: string, btn: HTMLButtonElement): Promise<void> {
  const label = btn.textContent;
  try { await navigator.clipboard.writeText(text); btn.textContent = "Kopiert"; }
  catch { btn.textContent = "Kopieren nicht möglich, Text markieren"; }
  setTimeout(() => { btn.textContent = label; }, 1600);
}

export default function HeroTake({ animated, animatedDisabled, animatedHint, onAnimated, onTake, takeBusy, takeLabel, status, progress, whatRows, fresh, result, staleText, article, reduceMotion, dlHeadRef, onJump, extra, posts }: Props) {
  const hId = useId();
  const altId = useId();
  const [altCopied, setAltCopied] = useState(false);
  const hl = article.headline;
  const explain = animated
    ? "In Listen, Spotlight, Rubrikseite und beim Teilen steht das Bild still. Auf der Beitragsseite läuft die Animation, sie beginnt mit dem fertigen Bild."
    : "Das Hero ist überall ein stehendes Bild: in Listen, im Spotlight, auf der Rubrikseite, beim Teilen und im Beitrag.";
  return (
    <section className="hs-step" aria-labelledby={hId} data-hs="take">
      <div className="hs-step-head">
        <h2 id={hId}><span className="hs-step-no">3</span>Übernehmen und herunterladen</h2>
      </div>
      <div className="hs-take-box">
        <label className="hs-switch">
          <input type="checkbox" checked={animated} disabled={animatedDisabled} onChange={(e) => onAnimated(e.target.checked)} />
          <b>Im Beitrag animiert abspielen</b>
          <span className="hs-note">{animatedHint ?? explain}</span>
        </label>
        <button type="button" className="hs-btn primary" onClick={onTake} disabled={takeBusy && takeLabel !== "Abbrechen"}>{takeLabel}</button>
        {!fresh && (
          <div className="hs-take-what">
            <p className="hs-sub-h">Danach bereit zum Herunterladen</p>
            <ul className="hs-dl-tree">
              {whatRows.map(([k, v]) => <li key={k}><code>{k}</code><span>{v}</span></li>)}
            </ul>
            <p className="hs-hint">Jede Datei einzeln oder alles zusammen als ZIP-Paket.</p>
          </div>
        )}
        {progress != null && (
          <div className="hs-bar"><span style={{ width: `${(Math.min(1, Math.max(0, progress)) * 100).toFixed(1)}%` }} /></div>
        )}
        <div className="hs-take-foot">
          <p className="hs-note" data-tone={status?.tone} role="status" aria-live="polite">{status?.msg ?? ""}</p>
          {fresh && result && <button type="button" className="hs-btn small line" onClick={onJump}>Zu den Downloads</button>}
        </div>
      </div>
      {result && (
        <div className="hs-result" data-stale={!fresh}>
          {!fresh && (
            <p className="hs-stale">
              {staleText ?? "Du hast seither etwas geändert."} Die Dateien unten gehören noch zur vorher übernommenen Variante. Oben nochmals «Übernehmen und Dateien erstellen» klicken, um sie zu aktualisieren.
            </p>
          )}
          <p className="hs-sub-h">So erscheint das Hero</p>
          <div className="hs-ctx-grid">
            <figure className="hs-ctx">
              <figcaption className="hs-ctx-lbl">Startseite · Spotlight <em>statisch</em></figcaption>
              <div className="hs-mock hs-mock-spot">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={result.heroUrl} alt={result.altStatic} />
                <div><span className="rub">{article.rubrik}</span><h4>{hl}</h4><span className="m">{[article.author, article.date].filter(Boolean).join(" · ")}</span></div>
              </div>
            </figure>
            <figure className="hs-ctx">
              <figcaption className="hs-ctx-lbl">Rubrikseite und Listen <em>statisch</em></figcaption>
              <div className="hs-mock hs-mock-list">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <div className="c"><img src={result.heroUrl} alt={result.altStatic} /><h5>{hl}</h5></div>
                <div className="c ghost" aria-hidden="true"><div className="img" /><div className="ln" /><div className="ln s" /></div>
                <div className="c ghost" aria-hidden="true"><div className="img" /><div className="ln" /><div className="ln s" /></div>
              </div>
            </figure>
            <figure className="hs-ctx">
              <figcaption className="hs-ctx-lbl">Beim Teilen (LinkedIn, X, WhatsApp) <em>statisch, mit Logo und Headline</em></figcaption>
              <div className="hs-mock"><div className="hs-mock-share">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={result.ogUrl} alt="Bild zum Teilen mit Logo und Headline" />
                <div className="t"><span>digital-age.ch</span><b>{hl}</b></div>
              </div></div>
            </figure>
            <figure className="hs-ctx">
              <figcaption className="hs-ctx-lbl">Beitragsseite <em>{result.videoUrl ? "Animiert, beginnt mit dem fertigen Bild" : "Statisch"}</em></figcaption>
              <div className="hs-mock hs-mock-article">
                {result.videoUrl ? (
                  <video src={result.videoUrl} muted loop playsInline autoPlay={!reduceMotion} controls={false} aria-label={result.altAnim} poster={result.heroUrl} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={result.heroUrl} alt={result.altStatic} />
                )}
                <h4>{hl}</h4><div className="ln" /><div className="ln" style={{ width: "80%" }} />
              </div>
            </figure>
          </div>
          <p className="hs-sub-h hs-dl-head" ref={dlHeadRef} tabIndex={-1}>Herunterladen</p>
          {extra}
          <div className="hs-out-grid">
            <div className="hs-field">
              <div className="hs-step-head">
                <label className="hs-sub-h" htmlFor={altId}>ALT-Text</label>
                <button
                  type="button" className="hs-btn small ghost"
                  onClick={async (ev) => { await copyText(result.altStatic, ev.currentTarget); setAltCopied(true); setTimeout(() => setAltCopied(false), 1600); }}
                >{altCopied ? "Kopiert" : "Kopieren"}</button>
              </div>
              <textarea id={altId} rows={3} readOnly value={result.altStatic} />
              {posts}
            </div>
            <div className="hs-field">
              <p className="hs-sub-h">Am Beitrag gespeichert</p>
              <p className="hs-hint">Beitragsbild, ALT-Text, Bild zum Teilen{result.videoUrl ? ", Hero-Animation" : ""} und das Rezept liegen am Beitrag. Das Rezept erlaubt, das Hero jederzeit neu zu berechnen, in jedem Format.</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
