export {};

declare global {
  interface Window {
    googlefc?: {
      callbackQueue?: Array<{
        CONSENT_API_READY?: () => void;
        CONSENT_DATA_READY?: () => void;
      }>;
      showRevocationMessage?: () => void;
      getConsentStatus?: () => unknown;
    };
    dataLayer?: unknown[];
  }
}
