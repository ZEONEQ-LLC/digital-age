import Link from "next/link";

export default function AuthorMobileBlock() {
  return (
    <>
      <style>{`
        .a-mblock {
          min-height: 100vh;
          background: var(--da-dark);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 32px 24px;
          text-align: center;
        }
        .a-mblock__icon {
          font-size: 48px;
          margin-bottom: 24px;
        }
        .a-mblock__title {
          color: var(--da-text);
          font-family: var(--da-font-display);
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 16px;
          line-height: 1.25;
        }
        .a-mblock__lead {
          color: var(--da-muted);
          font-size: 15px;
          line-height: 1.6;
          max-width: 360px;
          margin-bottom: 32px;
        }
        .a-mblock__actions {
          display: flex; flex-direction: column; gap: 12px;
          width: 100%; max-width: 280px;
        }
        .a-mblock__btn-primary {
          background: var(--da-green);
          color: var(--da-dark);
          font-size: 15px; font-weight: 700;
          padding: 12px 24px;
          border-radius: var(--r-sm);
          text-decoration: none;
          text-align: center;
          transition: filter var(--t-fast);
        }
        .a-mblock__btn-primary:hover { filter: brightness(1.08); }
        .a-mblock__btn-secondary {
          color: var(--da-muted-soft);
          font-size: 14px;
          padding: 12px 24px;
          text-decoration: none;
          text-align: center;
          border: 1px solid var(--da-border);
          border-radius: var(--r-sm);
          transition: color var(--t-fast), border-color var(--t-fast);
        }
        .a-mblock__btn-secondary:hover {
          color: var(--da-text);
          border-color: var(--da-muted);
        }
      `}</style>
      <div className="a-mblock">
        <div className="a-mblock__icon" aria-hidden>🖥️</div>
        <h1 className="a-mblock__title">
          Autor-Bereich nur auf Tablet oder Desktop
        </h1>
        <p className="a-mblock__lead">
          Die Autor-Suite ist für grössere Bildschirme optimiert.
          Bitte öffne diese Seite auf einem Tablet (Querformat),
          Laptop oder Desktop.
        </p>
        <div className="a-mblock__actions">
          <Link href="/" className="a-mblock__btn-primary">
            Zur Startseite
          </Link>
          <Link href="/login" className="a-mblock__btn-secondary">
            Login auf Desktop fortsetzen
          </Link>
        </div>
      </div>
    </>
  );
}
