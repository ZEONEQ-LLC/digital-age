// Client-sichere Formatierung fuer den Report (Admin + Vorschau).
export function formatCtr(ctr: number | null): string {
  return ctr === null ? "—" : `${ctr.toLocaleString("de-CH", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}

export function formatCount(n: number): string {
  return n.toLocaleString("de-CH");
}

export function formatRuntime(daysElapsed: number, daysTotal: number | null): string {
  return daysTotal === null ? `${daysElapsed} Tage · offen` : `${daysElapsed} / ${daysTotal} Tage`;
}

export const COUNT_RULE_DU = "Gezählt werden sichtbare Einblendungen (mind. 50 % für 1 Sekunde) und Klicks. Bekannte Bots werden ausgeschlossen. Tage nach Zürcher Zeit.";
export const COUNT_RULE_SIE = "Gezählt werden sichtbare Einblendungen (mindestens 50 % für 1 Sekunde) und Klicks. Bekannte Bots werden ausgeschlossen. Tage nach Zürcher Zeit.";
