import Link from "next/link";

export default function MobileEditorWarning() {
  return (
    <>
      <style>{`
        .a-mobile-warn {
          display: none;
          padding: 64px 24px;
          text-align: center;
          color: var(--da-text);
          font-family: var(--da-font-body);
        }
        @media (max-width: 1023px) {
          .a-mobile-warn { display: block; }
          .a-mobile-warn ~ .a-editor-root { display: none; }
        }
        .a-mobile-warn__icon {
          font-size: 36px; margin-bottom: 14px; color: var(--da-orange);
        }
        .a-mobile-warn h2 {
          font-family: var(--da-font-display); font-size: 24px; font-weight: 700;
          margin-bottom: 12px;
        }
        .a-mobile-warn p { color: var(--da-muted); font-size: 14px; line-height: 1.6; max-width: 420px; margin: 0 auto 20px; }
        .a-mobile-warn__btn {
          display: inline-block;
          background: var(--da-green); color: var(--da-dark);
          padding: 11px 20px; border-radius: 4px;
          font-size: 13px; font-weight: 700; text-decoration: none;
        }
      `}</style>
      <div className="a-mobile-warn">
        <p className="a-mobile-warn__icon">▢</p>
        <h2>Editor ist auf grösseren Bildschirmen besser</h2>
        <p>
          Der Visual Block Editor braucht etwas Platz. Öffne die Seite am Desktop oder Tablet im Querformat.
        </p>
        <Link href="/autor/artikel" className="a-mobile-warn__btn">
          Zurück zur Artikelliste
        </Link>
      </div>
    </>
  );
}
