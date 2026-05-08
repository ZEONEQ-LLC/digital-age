type PageTitleProps = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
};

export default function PageTitle({ title, subtitle, right }: PageTitleProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginBottom: 28,
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div>
        <h1
          style={{
            color: "var(--da-text)",
            fontFamily: "var(--da-font-display)",
            fontSize: 34,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.01em",
            marginBottom: 6,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ color: "var(--da-muted)", fontSize: 14 }}>{subtitle}</p>
        )}
      </div>
      {right}
    </div>
  );
}
