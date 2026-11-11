// Footer-Zeile mit Version, Commit und Zeitpunkt des Deploys. Die Werte setzt
// next.config.ts beim Build (env), lokal fehlt der Commit.

const DEPLOY_FORMAT = new Intl.DateTimeFormat("de-CH", {
  timeZone: "Europe/Zurich",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

// Einzelteile, damit der Footer nur zwischen ihnen umbricht (nie im Datum).
export function buildInfoParts(
  version: string | undefined,
  commit: string | undefined,
  builtAt: string | undefined,
): string[] {
  const parts: string[] = [];
  if (version) parts.push(`Version ${version}`);
  parts.push(commit ? `Build ${commit}` : "Build lokal");
  const at = builtAt ? new Date(builtAt) : null;
  if (at && !Number.isNaN(at.getTime())) parts.push(`Deploy ${DEPLOY_FORMAT.format(at)}`);
  return parts;
}

export function buildInfoText(
  version: string | undefined,
  commit: string | undefined,
  builtAt: string | undefined,
): string {
  return buildInfoParts(version, commit, builtAt).join(" · ");
}
