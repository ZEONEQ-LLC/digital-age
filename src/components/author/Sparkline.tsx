type SparklineProps = {
  data: number[];
  color?: string;
  height?: number;
};

export default function Sparkline({ data, color = "var(--da-green)", height = 40 }: SparklineProps) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const w = 200;
  const pad = 2;
  const xStep = (w - pad * 2) / Math.max(1, data.length - 1);
  const points = data
    .map((v, i) => {
      const x = pad + i * xStep;
      const y = pad + (height - pad * 2) * (1 - (v - min) / Math.max(max - min, 1));
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const area = `${pad},${height - pad} ${points} ${w - pad},${height - pad}`;
  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height, display: "block" }}
    >
      <polygon points={area} fill={color} fillOpacity={0.15} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}
