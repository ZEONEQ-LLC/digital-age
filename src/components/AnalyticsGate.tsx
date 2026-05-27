"use client";

import { usePathname } from "next/navigation";
import { GoogleAnalytics } from "@next/third-parties/google";

// Bindet GA4 ein, respektiert den per ConsentInit gesetzten Consent-Mode-v2-
// Default-State ('analytics_storage: denied'). GA4 sendet erst dann
// Tracking-Hits, wenn der User über den Funding-Choices-Banner zustimmt.
// Pathname-Filter identisch zum ConsentManagerGate — kein Tracking in der
// Editor-Suite.
export default function AnalyticsGate() {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/autor/") && pathname !== "/autor") return null;

  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!gaId) return null;

  return <GoogleAnalytics gaId={gaId} />;
}
