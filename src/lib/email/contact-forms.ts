/**
 * The contact form (/sobre/contacto) and the API access form (/api-landing)
 * are shown only while a request can reach someone. Delivery is decided per
 * request in src/lib/contact-delivery.ts: the site's own sender (SES) or the
 * copy to BMC One's lead book (BMC_FORMS_FORWARD_URL/SECRET). If neither is
 * configured the routes answer 503 and say where to write; nothing is ever
 * answered «recibido» without having been delivered.
 *
 * Off from 2026-10-22 until the copy to BMC One was in place and checked
 * server to server. The pages are static, so this is a build-time switch:
 * turning it off again means a deploy.
 */
export const CONTACT_FORMS_ENABLED = true;

export const CONTACT_EMAIL = "hola@trafico.live";
