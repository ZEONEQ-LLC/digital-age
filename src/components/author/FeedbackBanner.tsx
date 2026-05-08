type FeedbackBannerProps = {
  feedback: string;
  reviewerName?: string;
};

export default function FeedbackBanner({ feedback, reviewerName }: FeedbackBannerProps) {
  return (
    <div
      style={{
        background: "rgba(255,92,92,0.08)",
        border: "1px solid var(--da-red)",
        borderRadius: 8,
        padding: 18,
        marginBottom: 24,
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span style={{ color: "var(--da-red)", fontSize: 18, marginTop: -2 }}>⚠</span>
        <div>
          <p
            style={{
              color: "var(--da-red)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 6,
              fontFamily: "var(--da-font-mono)",
            }}
          >
            Redaktion: Änderungen angefordert
          </p>
          <p style={{ color: "var(--da-text)", fontSize: 14, lineHeight: 1.6 }}>{feedback}</p>
          {reviewerName && (
            <p style={{ color: "var(--da-muted)", fontSize: 12, marginTop: 8 }}>— {reviewerName}</p>
          )}
        </div>
      </div>
    </div>
  );
}
