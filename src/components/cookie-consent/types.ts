export type ConsentCategory = "necessary" | "analytics" | "affiliates";

export type ConsentState = {
  necessary: true;
  analytics: boolean;
  affiliates: boolean;
  version: string;
  timestamp: string;
};

export type ConsentInput = Partial<Pick<ConsentState, "analytics" | "affiliates">>;

export type ConsentListener = (state: ConsentState) => void;

export const CONSENT_VERSION = "2";
export const CONSENT_KEY = "trafico_cookie_consent";
export const CONSENT_EVENT = "trafico:cookie-consent";
