import Sparkline from "@/components/author/Sparkline";

// 30-Tage-Verlauf der Impressionen: Sparkline mit Nullbasis und drei
// Datumsmarken (vor 30 Tagen, vor 15 Tagen, heute). Reine Praesentation.
function label(day: string): string {
  const [y, m, d] = day.split("-");
  return `${d}.${m}.${y}`;
}

export default function StatsSeries({ series, color }: { series: { day: string; impressions: number }[]; color?: string }) {
  if (series.length === 0) return null;
  const mid = series[Math.floor(series.length / 2)];
  return (
    <div>
      <Sparkline data={series.map((s) => s.impressions)} height={56} baseline="zero" color={color} />
      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--da-muted)", fontSize: 12, fontFamily: "var(--da-font-mono)", marginTop: 6 }}>
        <span>{label(series[0].day)}</span>
        <span>{label(mid.day)}</span>
        <span>{label(series[series.length - 1].day)}</span>
      </div>
    </div>
  );
}
