export default function Hero() {
  return (
    <>
      <style>{`
        .hero { position: relative; width: 100%; height: 88vh; min-height: 580px; overflow: hidden; }
        .hero-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center center; }
        .hero-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(28,28,30,0.1) 0%, rgba(28,28,30,0.3) 40%, rgba(28,28,30,0.85) 75%, rgba(28,28,30,1) 100%); }
        .hero-content { position: absolute; bottom: 72px; left: 0; right: 0; max-width: 800px; margin: 0 auto; padding: 0 32px; }
        .hero-label { color: var(--da-green); font-size: 12px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 16px; }
        .hero-title { color: var(--da-text); font-size: clamp(32px, 4.5vw, 60px); font-weight: 700; line-height: 1.15; margin-bottom: 20px; }
        .hero-title span { color: var(--da-green); }
        .hero-sub { color: var(--da-muted); font-size: 17px; line-height: 1.65; max-width: 560px; margin-bottom: 32px; }
        .hero-btns { display: flex; gap: 16px; flex-wrap: wrap; }
        .hero-btn-primary { background: var(--da-green); color: var(--da-dark); font-size: 16px; font-weight: 700; padding: 14px 28px; border-radius: 4px; text-decoration: none; }
        .hero-btn-secondary { background: transparent; color: var(--da-orange); font-size: 16px; font-weight: 600; padding: 12px 28px; border: 2px solid var(--da-orange); text-decoration: none; }
        @media (max-width: 768px) {
          .hero { height: 85svh; min-height: 620px; }
          .hero-img { object-position: 15% top; }
          .hero-content { bottom: 40px; padding: 0 20px; }
          .hero-title { font-size: clamp(26px, 7vw, 36px) !important; }
          .hero-sub { display: none; }
          .hero-btns { flex-direction: column; }
          .hero-btn-primary, .hero-btn-secondary { text-align: center; width: 100%; box-sizing: border-box; }
        }
      `}</style>
      <section className="hero">
        <img className="hero-img" src="/images/Hero-Bild-2.0.jpg" alt="digital age hero" />
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="hero-label">Künstliche Intelligenz & Future Tech</p>
          <h1 className="hero-title">KI verändert die Zukunft.<br /><span>Verstehe sie jetzt.</span></h1>
          <p className="hero-sub">digital age zeigt dir, wie KI & Future Tech Unternehmen transformieren. Erkenne Chancen, sei der Wandel.</p>
          <div className="hero-btns">
            <a href="/ki-im-business" className="hero-btn-primary">Jetzt lesen</a>
            <a href="/kontakt" className="hero-btn-secondary">Publizieren</a>
          </div>
        </div>
      </section>
    </>
  );
}
