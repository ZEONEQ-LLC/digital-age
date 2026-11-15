"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  DECISION_NAME_MAX,
  DECISION_NOTE_MAX,
  formatDecisionTime,
  type PreviewDecision,
  type PreviewDecisionStatus,
} from "@/lib/articles/preview";
import { respondToPreview } from "@/lib/articles/previewActions";

// Rueckmeldung am Ende der Vorschau (/vorschau/artikel/<token>): freigeben
// oder Aenderungen wuenschen. Kein Login, der Link ist die Berechtigung. Die
// Redaktion bekommt eine Mail und veroeffentlicht selbst.
//
// Gestaltung: keine Karte. Eine Linie trennt den Abschnitt vom Beitrag, der
// Stand steht wie die Interessenbindung an einer farbigen Linie links.
type Props = {
  token: string;
  status: PreviewDecisionStatus;
  // false = Beitrag ist bereits erschienen (dann nur der Hinweis).
  canRespond: boolean;
  liveUrl: string | null;
  defaultName: string;
  expiresLabel: string;
};

const ANCHOR = "freigabe";

export default function PreviewResponse({ token, status, canRespond, liveUrl, defaultName, expiresLabel }: Props) {
  const router = useRouter();
  const [name, setName] = useState(status.kind === "none" ? defaultName : status.by || defaultName);
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState<PreviewDecision | null>(null);
  const [pending, startTransition] = useTransition();
  // Nach einer gueltigen Rueckmeldung steht das Formular hinter einem Knopf.
  const answered = status.kind !== "none" && !status.stale;
  const [reopened, setReopened] = useState(false);
  const showForm = canRespond && (!answered || reopened);

  function send(decision: PreviewDecision) {
    setError(null);
    if (name.trim().length < 2) {
      setError("Bitte deinen Namen angeben.");
      return;
    }
    if (decision === "changes" && note.trim().length < 3) {
      setError("Bitte schreib kurz, was geändert werden soll.");
      return;
    }
    setSending(decision);
    startTransition(async () => {
      const res = await respondToPreview(token, { decision, name, note, website });
      setSending(null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setNote("");
      setReopened(false);
      router.refresh();
    });
  }

  const barText = !canRespond
    ? "dieser Beitrag ist veröffentlicht"
    : answered && status.kind === "approved"
      ? "von dir freigegeben"
      : answered
        ? "Änderungen gewünscht"
        : "noch nicht veröffentlicht";

  return (
    <>
      <style>{`
        body { padding-bottom: 48px; }
        .pvr { border-top: 1px solid var(--da-border); margin-top: var(--sp-16); scroll-margin-top: calc(var(--nav-h) + var(--ticker-h)); }
        .pvr__in { max-width: 1200px; margin: 0 auto; padding: var(--sp-12) var(--gutter) var(--sp-4); }
        .pvr__col { max-width: 680px; }
        .pvr__kicker { color: var(--da-orange); font-size: 14px; font-weight: 700; margin: 0 0 var(--sp-2); }
        .pvr__title { color: var(--da-text); font-family: var(--da-font-display); font-size: 30px; font-weight: 700; line-height: 1.2; letter-spacing: -0.01em; margin: 0 0 var(--sp-3); }
        .pvr__lead { color: var(--da-muted); font-size: 17px; line-height: 1.6; margin: 0 0 var(--sp-8); }
        .pvr__state { margin: 0 0 var(--sp-8); padding: 2px 0 2px 16px; border-left: 2px solid var(--da-green); }
        .pvr__state--warn { border-left-color: var(--da-orange); }
        .pvr__state p { color: var(--da-text-strong); font-size: 16px; line-height: 1.6; margin: 0; }
        .pvr__state p + p { margin-top: var(--sp-2); }
        .pvr__state strong { color: var(--da-text); font-weight: 600; }
        .pvr__quote { white-space: pre-wrap; color: var(--da-muted) !important; }
        .pvr__field { margin: 0 0 var(--sp-5); }
        .pvr__label { display: block; color: var(--da-text-strong); font-size: 14px; font-weight: 600; margin: 0 0 6px; }
        .pvr__hint { color: var(--da-muted-soft); font-weight: 400; }
        .pvr__input { width: 100%; box-sizing: border-box; background: var(--da-darker); border: 1px solid var(--da-border); border-radius: 4px; color: var(--da-text); padding: 11px 12px; font: inherit; font-size: 16px; line-height: 1.5; }
        .pvr__input:focus { outline: 2px solid var(--da-green); outline-offset: 1px; border-color: transparent; }
        textarea.pvr__input { min-height: 132px; resize: vertical; }
        .pvr__hp { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
        .pvr__actions { display: flex; flex-wrap: wrap; gap: var(--sp-3); align-items: center; }
        .pvr__actions .da-btn { font-size: 15px; padding: 13px 22px; }
        .pvr__actions .da-btn:disabled { opacity: 0.55; cursor: default; filter: none; }
        .pvr__error { color: var(--da-red); font-size: 15px; margin: 0 0 var(--sp-4); }
        .pvr__foot { color: var(--da-muted-soft); font-size: 14px; line-height: 1.55; margin: var(--sp-6) 0 0; }
        .pvr__link { background: none; border: 0; padding: 0; color: var(--da-green); font: inherit; font-size: 16px; font-weight: 600; cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }
        .pvb { position: fixed; left: 0; right: 0; bottom: 0; z-index: 150; background: var(--da-darker); border-top: 1px solid var(--da-border); }
        .pvb__in { max-width: 1200px; margin: 0 auto; padding: 0 var(--gutter); min-height: 48px; display: flex; align-items: center; justify-content: space-between; gap: var(--sp-4); }
        .pvb__text { color: var(--da-text-strong); font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pvb__text b { color: var(--da-orange); font-weight: 700; }
        .pvb__go { color: var(--da-green); font-size: 14px; font-weight: 700; text-decoration: none; white-space: nowrap; }
        .pvb__go:hover { text-decoration: underline; }
        @media (max-width: 640px) {
          .pvr__title { font-size: 25px; }
          .pvr__actions .da-btn { flex: 1 1 100%; justify-content: center; }
          .pvb__text { font-size: 13px; }
        }
      `}</style>

      <section id={ANCHOR} className="pvr" aria-labelledby="pvr-title">
        <div className="pvr__in">
          <div className="pvr__col">
            <p className="pvr__kicker">Vorschau</p>
            {!canRespond ? (
              <>
                <h2 id="pvr-title" className="pvr__title">Dieser Beitrag ist veröffentlicht</h2>
                <p className="pvr__lead">
                  Die Vorschau zeigt den aktuellen Stand.{" "}
                  {liveUrl && <a href={liveUrl} style={{ color: "var(--da-green)", fontWeight: 600 }}>Zur veröffentlichten Seite</a>}
                </p>
              </>
            ) : (
              <>
                <h2 id="pvr-title" className="pvr__title">Darf der Beitrag so erscheinen?</h2>
                <p className="pvr__lead">
                  Du siehst den Beitrag so, wie er auf digital age erscheinen wird. Er ist noch nicht veröffentlicht.
                  Stimmt alles, gib ihn frei. Sonst schreib uns, was wir ändern sollen.
                </p>
              </>
            )}

            {status.kind !== "none" && canRespond && (
              <div className={`pvr__state${status.kind === "changes" || status.stale ? " pvr__state--warn" : ""}`} role="status">
                {status.stale ? (
                  <p>
                    <strong>Der Beitrag wurde überarbeitet.</strong>{" "}
                    {status.kind === "approved"
                      ? `Deine Freigabe vom ${formatDecisionTime(status.at)} gilt für die frühere Fassung. Bitte schau ihn nochmals an.`
                      : `Deine Rückmeldung vom ${formatDecisionTime(status.at)} gilt für die frühere Fassung. Bitte schau ihn nochmals an.`}
                  </p>
                ) : status.kind === "approved" ? (
                  <p>
                    <strong>Freigegeben am {formatDecisionTime(status.at)} von {status.by}.</strong>{" "}
                    Danke. Die Redaktion veröffentlicht den Beitrag.
                  </p>
                ) : (
                  <p>
                    <strong>Änderungen gewünscht am {formatDecisionTime(status.at)} von {status.by}.</strong>{" "}
                    Die Redaktion überarbeitet den Beitrag. Über denselben Link siehst du danach den neuen Stand.
                  </p>
                )}
                {status.note && <p className="pvr__quote">{status.note}</p>}
              </div>
            )}

            {canRespond && answered && !reopened && (
              <button type="button" className="pvr__link" onClick={() => setReopened(true)}>
                {status.kind === "approved" ? "Doch noch etwas ändern" : "Neue Rückmeldung geben"}
              </button>
            )}

            {showForm && (
              <form onSubmit={(e) => e.preventDefault()} noValidate>
                <div className="pvr__field">
                  <label className="pvr__label" htmlFor="pvr-name">Dein Name</label>
                  <input
                    id="pvr-name"
                    className="pvr__input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={DECISION_NAME_MAX}
                    autoComplete="name"
                  />
                </div>
                <div className="pvr__field">
                  <label className="pvr__label" htmlFor="pvr-note">
                    Bemerkung <span className="pvr__hint">(nötig, wenn du Änderungen wünschst)</span>
                  </label>
                  <textarea
                    id="pvr-note"
                    className="pvr__input"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={DECISION_NOTE_MAX}
                    placeholder="Zum Beispiel: Im zweiten Absatz stimmt die Jahreszahl nicht."
                  />
                </div>
                <div className="pvr__hp" aria-hidden="true">
                  <label htmlFor="pvr-website">Website</label>
                  <input id="pvr-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </div>
                {error && <p className="pvr__error" role="alert">{error}</p>}
                <div className="pvr__actions">
                  <button type="button" className="da-btn da-btn--primary" disabled={pending} onClick={() => send("approved")}>
                    {sending === "approved" ? "Wird gespeichert …" : "Freigeben"}
                  </button>
                  <button type="button" className="da-btn da-btn--secondary" disabled={pending} onClick={() => send("changes")}>
                    {sending === "changes" ? "Wird gespeichert …" : "Änderungen wünschen"}
                  </button>
                </div>
              </form>
            )}

            <p className="pvr__foot">
              Veröffentlicht wird der Beitrag erst durch die Redaktion. Diese Seite ist nur über den Link erreichbar,
              nicht öffentlich gelistet und bis {expiresLabel} gültig.
            </p>
          </div>
        </div>
      </section>

      <div className="pvb" role="note">
        <div className="pvb__in">
          <span className="pvb__text"><b>Vorschau</b> · {barText}</span>
          {canRespond && (
            <a className="pvb__go" href={`#${ANCHOR}`}>
              {answered ? "Deine Rückmeldung ↓" : "Zur Freigabe ↓"}
            </a>
          )}
        </div>
      </div>
    </>
  );
}
