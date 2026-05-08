import ExternalBadge from "./ExternalBadge";

type AuthorLineProps = {
  name: string;
  external?: boolean;
  date?: string;
  className?: string;
  separator?: string;
  badgeSize?: "xs" | "sm";
};

export default function AuthorLine({
  name,
  external = false,
  date,
  className,
  separator = "•",
  badgeSize = "xs",
}: AuthorLineProps) {
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
      }}
    >
      <span>{name}</span>
      {external && <ExternalBadge size={badgeSize} />}
      {date && (
        <>
          <span style={{ color: "var(--da-border)" }}>{separator}</span>
          <span>{date}</span>
        </>
      )}
    </span>
  );
}
