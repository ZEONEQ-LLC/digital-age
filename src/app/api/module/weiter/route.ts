import { isbot } from "isbot";
import { sanitizeAds } from "@/lib/newsletter/ads";
import { verifyAdClick } from "@/lib/newsletter/adToken";
import { SITE_URL } from "@/lib/newsletter/mail";
import { checkRateLimit, getRequestContext, logAttempt } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/service";

// Weiterleitung fuer Anzeigen im Newsletter (PR 214): zaehlt den Klick und
// leitet auf das Ziel der Anzeige weiter.
//
//   * Das Ziel steht nicht im Link. Es kommt aus der versendeten Ausgabe
//     (Momentaufnahme in newsletter_issues.sections.ads), der Link nennt nur
//     Ausgabe und Kampagne und ist signiert (adToken.ts). Ohne gueltige
//     Signatur oder ohne passende Anzeige geht es auf die Startseite: kein
//     offener Redirect.
//   * Gezaehlt wird die Summe pro Ausgabe und Kampagne, ohne Kennung der
//     Person. Nicht gezaehlt: bekannte Bots, Vorab-Abrufe (prefetch), HEAD,
//     und alles ueber dem IP-Limit. Weitergeleitet wird trotzdem immer.
//   * Sicherheitspruefungen mancher Mailprogramme rufen Links mit einem
//     Browser-User-Agent ab; die lassen sich nicht sicher erkennen und
//     koennen die Zahl leicht erhoehen.
export const dynamic = "force-dynamic";

// Eigener Zaehler pro IP-Hash (Aktion newsletter_ad_click): Ein Mensch klickt
// eine Anzeige ein paar Mal an, ein Skript mit dem Link aus einer Mail soll
// die Zahl nicht aufblaehen.
const CLICK_LIMIT = { perHour: 20, perDay: 60 };

function redirect(to: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: to,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    },
  });
}

function isPrefetch(request: Request): boolean {
  const purpose = `${request.headers.get("purpose") ?? ""} ${request.headers.get("sec-purpose") ?? ""}`.toLowerCase();
  return purpose.includes("prefetch") || purpose.includes("prerender");
}

export async function GET(request: Request) {
  const home = `${SITE_URL}/`;
  try {
    const payload = verifyAdClick(new URL(request.url).searchParams.get("k"));
    if (!payload) return redirect(home);

    const supabase = createServiceClient();
    const { data: issue } = await supabase
      .from("newsletter_issues")
      .select("status, sections")
      .eq("id", payload.i)
      .maybeSingle();
    if (!issue || (issue.status !== "sending" && issue.status !== "sent")) return redirect(home);
    const ad = sanitizeAds((issue.sections as { ads?: unknown } | null)?.ads).find((a) => a.campaignId === payload.c);
    if (!ad) return redirect(home);

    const countable = request.method === "GET" && !isbot(request.headers.get("user-agent")) && !isPrefetch(request);
    if (countable) {
      const { ipHash } = await getRequestContext();
      const limit = await checkRateLimit(supabase, ipHash, "newsletter_ad_click", CLICK_LIMIT);
      if (limit.allowed) {
        await logAttempt(supabase, ipHash, "newsletter_ad_click");
        const { error } = await supabase.rpc("newsletter_ad_click", { p_issue: payload.i, p_campaign: payload.c });
        if (error) console.error("[module:weiter] Klick nicht gezaehlt:", error.message);
      }
    }
    return redirect(ad.href);
  } catch (err) {
    console.error("[module:weiter] Weiterleitung fehlgeschlagen:", err);
    return redirect(home);
  }
}
