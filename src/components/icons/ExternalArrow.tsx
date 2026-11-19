// Pfeil fuer Links, die auf eine fremde Seite fuehren. Als SVG statt als
// Zeichen «↗»: iOS zeigt das Zeichen sonst als buntes Emoji (Ali 19.11.).
export default function ExternalArrow({ size = "0.75em" }: { size?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ display: "inline-block", verticalAlign: "baseline", marginLeft: "0.3em", flexShrink: 0 }}
    >
      <path d="M3.5 8.5 8.5 3.5M4.5 3.5h4v4" />
    </svg>
  );
}
