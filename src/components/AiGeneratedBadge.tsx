import Link from "next/link";

// KI-Deklaration im Stil des Artikel-Transparenz-Hinweises (Orange-Akzent),
// Link auf dieselbe Transparenz-Seite. Zwei Groessen: "sm" fuer Cards,
// "md" fuer die Detailseite.
type Props = {
  size?: "sm" | "md";
};

export default function AiGeneratedBadge({ size = "sm" }: Props) {
  const sm = size === "sm";
  return (
    <Link
      href="/ki-transparenz"
      aria-label="KI-generiert — mehr zur KI-Transparenz"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: sm ? 5 : 7,
        padding: sm ? "3px 8px" : "5px 11px",
        borderRadius: "var(--r-xs)",
        border: "1px solid var(--da-orange)",
        background: "rgba(255,140,66,0.06)",
        color: "var(--da-orange)",
        fontFamily: "var(--da-font-mono)",
        fontSize: sm ? 10 : 12,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        textDecoration: "none",
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      <span aria-hidden style={{ fontSize: sm ? 11 : 13 }}>✦</span>
      KI-generiert
      <span aria-hidden style={{ opacity: 0.7 }}>· Transparenz →</span>
    </Link>
  );
}
