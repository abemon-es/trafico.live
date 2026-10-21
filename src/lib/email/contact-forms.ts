/**
 * The contact form (/sobre/contacto) and the API access form (/api-landing)
 * stay off until trafico.live has its own sender: an SES identity and an IAM
 * user with ses:SendEmail only. Until 2026-10-22 they answered «recibido»,
 * sent nothing and wrote the message to the log. Turn this on in the same
 * change that configures the sender; the pages are static, so a runtime
 * check would freeze at build time.
 */
export const CONTACT_FORMS_ENABLED = false;

export const CONTACT_EMAIL = "hola@trafico.live";
