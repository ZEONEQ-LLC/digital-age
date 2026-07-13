// Reine Formatierungs-/Validierungs-Helfer fuer Podcasts. Framework-frei,
// testbar (kein "use server"/"use client").

// Sekunden -> "M:SS" bzw. "H:MM:SS" fuer die Player-Zeitanzeige.
// Negative/NaN/undefined -> "0:00".
export function formatDuration(seconds: number | null | undefined): string {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  if (h > 0) {
    const mm = String(m).padStart(2, "0");
    return `${h}:${mm}:${ss}`;
  }
  return `${m}:${ss}`;
}

// Bytes -> menschenlesbare Groesse (fuer Admin-Anzeige). null -> "".
export function formatFileSize(bytes: number | null | undefined): string {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes <= 0) {
    return "";
  }
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${Math.round(kb)} KB`;
}

export type PodcastSourceType = "external" | "self_hosted";

export type PodcastValidationInput = {
  title: string;
  sourceType: PodcastSourceType;
  audioUrl: string | null;
  // Mindestens einer der externen Plattform-Links (fuer external).
  externalUrls: (string | null | undefined)[];
};

// Weiche Validierung (Formular-Ebene): self_hosted braucht audio_url,
// external braucht mindestens einen Plattform-Link. Liefert Fehlermeldung
// oder null. Titel-Pflicht wird separat geprueft.
export function validatePodcastSource(
  input: PodcastValidationInput,
): string | null {
  if (input.sourceType === "self_hosted") {
    if (!input.audioUrl || input.audioUrl.trim() === "") {
      return "Self-hosted Podcast braucht ein hochgeladenes Audio-File.";
    }
    return null;
  }
  // external
  const hasAny = input.externalUrls.some(
    (u) => typeof u === "string" && u.trim() !== "",
  );
  if (!hasAny) {
    return "Externer Podcast braucht mindestens einen Plattform-Link (Spotify, Apple, YouTube, SoundCloud oder Audible).";
  }
  return null;
}
