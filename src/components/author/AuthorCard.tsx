type AuthorCardProps = {
  children: React.ReactNode;
  accent?: string;
  padding?: number;
  style?: React.CSSProperties;
};

export default function AuthorCard({ children, accent, padding = 22, style }: AuthorCardProps) {
  return (
    <div
      style={{
        background: "var(--da-card)",
        border: `1px solid ${accent ?? "var(--da-border)"}`,
        borderRadius: 8,
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
