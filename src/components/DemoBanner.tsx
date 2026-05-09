type DemoBannerProps = {
  message: string;
};

export default function DemoBanner({ message }: DemoBannerProps) {
  return (
    <div
      role="note"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
        background: "rgba(255,140,66,0.08)",
        border: "1px solid var(--da-orange)",
        borderRadius: 8,
        padding: "14px 18px",
        marginBottom: 24,
      }}
    >
      <span
        style={{
          color: "var(--da-orange)",
          fontFamily: "var(--da-font-mono)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          flexShrink: 0,
          padding: "3px 8px",
          border: "1px solid var(--da-orange)",
          borderRadius: 3,
        }}
      >
        Demo-Modus
      </span>
      <span style={{ color: "var(--da-text-strong)", fontSize: 13, lineHeight: 1.55 }}>
        {message}
      </span>
    </div>
  );
}
