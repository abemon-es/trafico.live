// Thin re-export alias. Implementation lives in @/components/cookie-consent
// (owned by agent 2.8 — 3-category TCF-lite banner with getConsent/setConsent/
// useConsent helpers). This alias preserves existing import paths used by
// src/app/layout.tsx and any pages linking to "Gestionar cookies".
export {
  CookieConsent,
  CookieSettingsButton,
  getConsent,
  setConsent,
  hasConsent,
  onConsentChange,
  useConsent,
  useHasConsent,
} from "@/components/cookie-consent";
export type { ConsentCategory, ConsentState } from "@/components/cookie-consent";
