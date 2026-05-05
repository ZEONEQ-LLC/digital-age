export default function PagePlaceholder({ message = "Inhalte folgen in Kürze." }: { message?: string }) {
  return (
    <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "80px 32px", textAlign: "center" }}>
      <div style={{ display: "inline-block", padding: "48px", backgroundColor: "var(--da-card)", border: "1px solid var(--da-border)", borderRadius: "8px" }}>
        <p style={{ color: "var(--da-green)", fontSize: "14px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "12px" }}>
          Coming Soon
        </p>
        <p style={{ color: "var(--da-muted)", fontSize: "16px", lineHeight: 1.6 }}>{message}</p>
      </div>
    </section>
  );
}
