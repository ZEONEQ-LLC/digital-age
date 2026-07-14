import Link from "next/link";

// Dezente KI-Deklaration als Metadatum (sitzt in der Meta-Zeile neben
// Sprache/Dauer). Gedaempftes Grau mit kleinem Orange-Akzent, normale
// Schreibweise. Transparenz-Link als dezentes ⓘ-Icon; auf der Detailseite
// (showLabel) ausgeschrieben.
type Props = {
  showLabel?: boolean;
};

export default function AiGeneratedBadge({ showLabel = false }: Props) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontFamily: "var(--da-font-mono)",
        fontSize: 12,
        color: "var(--da-muted)",
        whiteSpace: "nowrap",
      }}
    >
      <span aria-hidden style={{ color: "var(--da-orange)", opacity: 0.65, fontSize: 11 }}>✦</span>
      KI-generiert
      <Link
        href="/ki-transparenz"
        aria-label="Zur KI-Transparenz"
        title="Zur KI-Transparenz"
        style={{ color: "var(--da-muted-soft)", textDecoration: "none", display: "inline-flex", alignItems: "center" }}
      >
        {showLabel ? (
          <span style={{ color: "var(--da-orange)", opacity: 0.85 }}>· Transparenz</span>
        ) : (
          <span aria-hidden style={{ fontSize: 13 }}>ⓘ</span>
        )}
      </Link>
    </span>
  );
}
