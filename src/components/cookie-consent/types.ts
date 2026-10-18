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

/**
 * Inline <head> script: runs before first paint and marks
 * <html data-consent="set"> when a valid choice is already stored, so the
 * server-rendered banner is hidden by CSS without a flash. Must mirror
 * store.ts → safeParse (same key, same version check).
 */
export const CONSENT_PRE_PAINT_SCRIPT =
  `try{var c=JSON.parse(localStorage.getItem(${JSON.stringify(CONSENT_KEY)})||"null");` +
  `if(c&&c.version===${JSON.stringify(CONSENT_VERSION)})document.documentElement.setAttribute("data-consent","set")}catch(e){}`;
