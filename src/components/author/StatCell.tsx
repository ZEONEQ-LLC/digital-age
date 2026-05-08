import AuthorCard from "./AuthorCard";

type StatCellProps = {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
};

export default function StatCell({ label, value, sub, accent }: StatCellProps) {
  return (
    <AuthorCard>
      <p
        style={{
          color: "var(--da-faint)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontFamily: "var(--da-font-mono)",
          marginBottom: 10,
        }}
      >
        {label}
      </p>
      <div
        style={{
          color: accent ?? "var(--da-text)",
          fontSize: 30,
          fontWeight: 700,
          fontFamily: "var(--da-font-display)",
          lineHeight: 1,
          marginBottom: 6,
        }}
      >
        {value}
      </div>
      {sub && <p style={{ color: "var(--da-muted)", fontSize: 12 }}>{sub}</p>}
    </AuthorCard>
  );
}
