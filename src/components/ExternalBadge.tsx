type ExternalBadgeProps = {
  size?: "xs" | "sm";
  label?: string;
  variant?: "subtle" | "outline";
};

export default function ExternalBadge({
  size = "xs",
  label = "Gastautor",
  variant = "outline",
}: ExternalBadgeProps) {
  const px = size === "sm" ? "3px 8px" : "2px 7px";
  const fontSize = size === "sm" ? 10 : 9;
  return (
    <span
      title="Externer Gastautor"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontFamily: "var(--da-font-mono)",
        fontSize,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        padding: px,
        borderRadius: 999,
        whiteSpace: "nowrap",
        ...(variant === "outline"
          ? {
              background: "transparent",
              color: "var(--da-orange)",
              border: "1px solid var(--da-orange)",
            }
          : {
              background: "rgba(255,140,66,0.12)",
              color: "var(--da-orange)",
            }),
      }}
    >
      {label}
    </span>
  );
}
