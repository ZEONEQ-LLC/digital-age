type PageHeroProps = {
  category?: string;
  title: string;
  description?: string;
};

export default function PageHero({ category, title, description }: PageHeroProps) {
  return (
    <section style={{ backgroundColor: "#1c1c1e", borderBottom: "1px solid #2a2a2e", padding: "64px 32px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {category && (
          <p style={{ color: "#32ff7e", fontSize: "13px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "16px" }}>
            {category}
          </p>
        )}
        <h1 style={{ color: "#ffffff", fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 700, lineHeight: 1.2, marginBottom: description ? "20px" : 0, fontFamily: "Space Grotesk, sans-serif" }}>
          {title}
        </h1>
        {description && (
          <p style={{ color: "#b0b0b0", fontSize: "17px", lineHeight: 1.65, maxWidth: "720px" }}>
            {description}
          </p>
        )}
      </div>
    </section>
  );
}
