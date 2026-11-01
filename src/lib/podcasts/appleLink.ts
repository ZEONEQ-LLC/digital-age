// Apple-Podcasts-Link lesen. Rein und client-sicher (kein Server-Import).
//
//   Show:  https://podcasts.apple.com/ch/podcast/<slug>/id1291423644
//   Folge: https://podcasts.apple.com/ch/podcast/<slug>/id1291423644?i=1000790301141&l=en-GB
//
// Die Show-ID steht im Pfad (/id<ziffern>), die Folgen-ID im Parameter i.
// Laenderpraefix und Anhaengsel wie l=en-GB sind egal.
export type AppleLink = {
  showId: string;
  episodeId: string | null;
  /** Bereinigter Link ohne Tracking-Parameter. */
  url: string;
};

const HOSTS = new Set(["podcasts.apple.com", "itunes.apple.com", "music.apple.com"]);

export function parseAppleLink(raw: string): AppleLink | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || !HOSTS.has(u.hostname.toLowerCase())) return null;
  const m = u.pathname.match(/\/id(\d+)(?:\/|$)/);
  if (!m) return null;
  const episode = u.searchParams.get("i");
  const episodeId = episode && /^\d+$/.test(episode) ? episode : null;
  const clean = new URL(`https://podcasts.apple.com${u.pathname}`);
  if (episodeId) clean.searchParams.set("i", episodeId);
  return { showId: m[1], episodeId, url: clean.toString() };
}

// Erste Textzeile eines geteilten Inhalts kann Titel + Link sein; den Link herausziehen.
export function extractAppleUrl(text: string): string | null {
  const m = text.match(/https?:\/\/(?:podcasts|itunes|music)\.apple\.com\/\S+/i);
  return m ? m[0].replace(/[),.;]+$/, "") : null;
}
