// Gemeinsame Formular-/Tabellen-Styles der Werbung-Masken.
// Muster: src/components/author/PodcastForm.tsx (Label ueber Feld, Grid gap 16).
export const labelStyle: React.CSSProperties = {
  display: "block",
  color: "var(--da-faint)",
  fontSize: 10,
  fontWeight: 700,
  fontFamily: "var(--da-font-mono)",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  marginBottom: 6,
};

export const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--da-dark)",
  border: "1px solid var(--da-border)",
  borderRadius: 4,
  color: "var(--da-text)",
  padding: "9px 12px",
  fontSize: 13,
  fontFamily: "inherit",
  boxSizing: "border-box",
};

export const card: React.CSSProperties = {
  background: "var(--da-card)",
  border: "1px solid var(--da-border)",
  borderRadius: 8,
  padding: 16,
};

export const btnPrimary: React.CSSProperties = {
  padding: "8px 14px", background: "var(--da-green)", color: "var(--da-dark)",
  border: 0, borderRadius: 6, fontWeight: 700, cursor: "pointer",
};

export const btnGhost: React.CSSProperties = {
  padding: "7px 12px", background: "transparent", color: "var(--da-muted)",
  border: "1px solid var(--da-border)", borderRadius: 6, cursor: "pointer",
};

export const btnSmall: React.CSSProperties = { ...btnGhost, padding: "3px 8px", fontSize: 12 };

export const sectionTitle: React.CSSProperties = {
  color: "var(--da-text)", fontFamily: "var(--da-font-display)", fontSize: 18, fontWeight: 700,
};

export const help: React.CSSProperties = { color: "var(--da-muted)", fontSize: 12, lineHeight: 1.4, margin: "6px 0 0" };
export const errStyle: React.CSSProperties = { color: "#ff6b6b", fontSize: 13, margin: 0 };

// Tabellen: Kopf im Label-Stil, Zeilen mit border-bottom, kein Card-Rahmen pro Zeile.
export const th: React.CSSProperties = {
  padding: "10px 12px", textAlign: "left", color: "var(--da-muted)",
  fontFamily: "var(--da-font-mono)", fontSize: 10, fontWeight: 700,
  letterSpacing: "0.12em", textTransform: "uppercase", borderBottom: "1px solid var(--da-border)",
};
export const td: React.CSSProperties = {
  padding: "10px 12px", borderBottom: "1px solid var(--da-border)", verticalAlign: "middle",
  color: "var(--da-text-strong)", fontSize: 14,
};

export const WEIGHTS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
