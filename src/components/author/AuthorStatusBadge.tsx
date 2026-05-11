import type { Database } from "@/lib/database.types";

type ArticleStatus = Database["public"]["Enums"]["article_status"];

type Cfg = { label: string; color: string; bg: string };

const STATUS: Record<ArticleStatus, Cfg> = {
  draft:      { label: "Entwurf",        color: "var(--da-muted-soft)", bg: "rgba(136,136,136,0.12)" },
  in_review:  { label: "In Review",      color: "var(--da-orange)",     bg: "rgba(255,140,66,0.12)" },
  published:  { label: "Veröffentlicht", color: "var(--da-green)",      bg: "rgba(50,255,126,0.12)" },
  archived:   { label: "Archiviert",     color: "var(--da-faint)",      bg: "rgba(85,85,85,0.16)" },
};

type AuthorStatusBadgeProps = {
  status: ArticleStatus;
  size?: "sm" | "md";
};

export default function AuthorStatusBadge({ status, size = "md" }: AuthorStatusBadgeProps) {
  const s = STATUS[status];
  const sz = size === "sm"
    ? { padding: "3px 8px", fontSize: 10, dot: 5 }
    : { padding: "4px 10px", fontSize: 11, dot: 6 };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: s.bg,
        color: s.color,
        padding: sz.padding,
        borderRadius: 999,
        fontSize: sz.fontSize,
        fontWeight: 700,
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: sz.dot,
          height: sz.dot,
          borderRadius: "50%",
          background: s.color,
          display: "inline-block",
        }}
      />
      {s.label}
    </span>
  );
}
