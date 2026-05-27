// Consent-Mode v2 Default-State. Wird als plain inline-Script im <head>
// synchron ausgeführt — vor Funding Choices, vor Hydration, vor allem
// anderen. Setzt alle Consent-Kategorien auf 'denied' (Ausnahme:
// functionality_storage + security_storage = granted für techn. notw.
// Cookies wie Auth). Das CMP-Banner kann den State später per
// gtag('consent', 'update', …) ändern; wait_for_update gibt ihm 500 ms
// dafür Zeit.

const CONSENT_DEFAULT_SCRIPT = `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  'ad_storage': 'denied',
  'ad_user_data': 'denied',
  'ad_personalization': 'denied',
  'analytics_storage': 'denied',
  'functionality_storage': 'granted',
  'security_storage': 'granted',
  'wait_for_update': 500
});`;

export default function ConsentInit() {
  return (
    <script
      id="consent-default"
      dangerouslySetInnerHTML={{ __html: CONSENT_DEFAULT_SCRIPT }}
    />
  );
}
