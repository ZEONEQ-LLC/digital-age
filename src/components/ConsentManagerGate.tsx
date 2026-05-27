"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";

// Bindet Google Funding Choices als reines CMP ein (KEIN AdSense — wir
// schalten keine Ads). Auf /autor/-Subrouten wird kein Banner gerendert,
// damit die Editor-Suite vom Cookie-Prompt unbehelligt bleibt. Pattern
// identisch zu NewsTickerGate.
export default function ConsentManagerGate() {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/autor/") && pathname !== "/autor") return null;

  return (
    <>
      <Script
        async
        src="https://fundingchoicesmessages.google.com/i/pub-9721985590523188?ers=1"
        strategy="afterInteractive"
      />
      <Script id="googlefc-present" strategy="afterInteractive">
        {`(function() {
  function signalGooglefcPresent() {
    if (!window.frames['googlefcPresent']) {
      if (document.body) {
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'width: 0; height: 0; border: none; z-index: -1000; left: -1000px; top: -1000px;';
        iframe.style.display = 'none';
        iframe.name = 'googlefcPresent';
        document.body.appendChild(iframe);
      } else {
        setTimeout(signalGooglefcPresent, 0);
      }
    }
  }
  signalGooglefcPresent();
})();`}
      </Script>
    </>
  );
}
