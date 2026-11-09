/**
 * Whether the weekly digest can be signed up for from the site.
 *
 * trafico.live has no email sender (decision of 09-11-2026: no SES for now).
 * /api/digest/subscribe already answers 503 without a sender and stores
 * nothing, but a visible form or checkbox still promises a summary that never
 * arrives. While this is false, the sign-up is not shown anywhere:
 *   - /informes: the «Resumen semanal» form;
 *   - /api-landing: the «Suscribirme al newsletter semanal» checkbox of the
 *     access request form (and its call to /api/digest/subscribe).
 *
 * The pages are static, so this is a build-time switch: turning it on means a
 * deploy, and only once a sender exists and has been tested end to end.
 * The footer newsletter (NewsletterCTA) is already not rendered for the same
 * reason (see src/components/layout/Footer.tsx).
 */
export const DIGEST_SIGNUP_ENABLED = false;
