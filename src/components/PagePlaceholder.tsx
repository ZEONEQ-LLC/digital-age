export default function PagePlaceholder({ message = "Inhalte folgen in Kürze." }: { message?: string }) {
  return (
    <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "80px 32px", textAlign: "center" }}>
      <div style={{ display: "inline-block", padding: "48px", backgroundColor: "#2a2a2e", border: "1px solid #3a3a3e", borderRadius: "8px" }}>
        <p style={{ color: "#32ff7e", fontSize: "14px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "12px" }}>
          Coming Soon
        </p>
        <p style={{ color: "#b0b0b0", fontSize: "16px", lineHeight: 1.6 }}>{message}</p>
      </div>
    </section>
  );
}
