"use client";

const items = [
  { label: "KI & Business", text: "OpenAI lanciert GPT-5 mit multimodalen Fähigkeiten – Unternehmen reagieren mit neuen Strategien" },
  { label: "Future Tech", text: "EU AI Act tritt in Kraft: Was Schweizer Unternehmen jetzt wissen müssen" },
  { label: "Tools", text: "Anthropic veröffentlicht Claude 3.5 – neue Massstäbe bei Reasoning und Code" },
  { label: "KI & Business", text: "Data-Driven Banking: Warum KI allein das eigentliche Problem nicht löst" },
  { label: "Future Tech", text: "IoT trifft AI: Wie intelligente Geräte die Industrie 4.0 neu definieren" },
];

export default function NewsTicker() {
  const repeated = [...items, ...items, ...items];
  return (
    <>
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        .ticker-scroll {
          animation: scroll 40s linear infinite;
          display: inline-flex;
          gap: 64px;
          white-space: nowrap;
          will-change: transform;
        }
        .ticker-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div style={{ backgroundColor: "var(--da-card)", borderBottom: "1px solid var(--da-border)", display: "flex", alignItems: "center", height: "40px", overflow: "hidden", position: "relative", zIndex: 10 }}>
        <div style={{ flexShrink: 0, backgroundColor: "var(--da-green)", color: "var(--da-dark)", fontWeight: 700, fontSize: "11px", letterSpacing: "0.1em", padding: "0 16px", height: "100%", display: "flex", alignItems: "center", gap: "6px", textTransform: "uppercase", zIndex: 10 }}>
          <span style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "var(--da-dark)", display: "inline-block" }} />
          Live
        </div>
        <div style={{ overflow: "hidden", flex: 1, height: "100%", display: "flex", alignItems: "center" }}>
          <div className="ticker-scroll">
            {repeated.map((item, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "10px", fontSize: "13px", cursor: "pointer", color: "var(--da-text-strong)" }}>
                <span style={{ color: "var(--da-green)", fontWeight: 600, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase" }}>{item.label}</span>
                <span style={{ color: "var(--da-faint)" }}>—</span>
                {item.text}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
