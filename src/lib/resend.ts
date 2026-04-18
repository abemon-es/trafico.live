/**
 * Resend SDK wrapper for trafico.live
 *
 * Provides transactional email, newsletter batch sends, and audience management.
 * Never throws — all errors are returned as structured { error, code } objects.
 */

import { Resend } from "resend";
import type { ReactElement } from "react";

// Lazy singleton — only instantiated on first use
let _client: Resend | null = null;

function getClient(): Resend {
  if (!_client) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("[Resend] RESEND_API_KEY not set — email sending disabled");
    }
    _client = new Resend(apiKey ?? "re_placeholder");
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface EmailTag {
  name: string;
  value: string;
}

export interface SendResult {
  id?: string;
  error?: string;
  code?: string;
}

// ---------------------------------------------------------------------------
// Transactional email
// ---------------------------------------------------------------------------

export interface TransactionalEmailOptions {
  to: string | string[];
  subject: string;
  react: ReactElement;
  tags?: EmailTag[];
  replyTo?: string;
}

/**
 * Send a transactional email (welcome, confirmation, password reset, etc.)
 * Returns { id } on success, { error, code } on failure.
 */
export async function sendTransactional(options: TransactionalEmailOptions): Promise<SendResult> {
  const from =
    process.env.NEWSLETTER_FROM ?? "trafico.live <hola@trafico.live>";

  try {
    const { data, error } = await getClient().emails.send({
      from,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      react: options.react,
      ...(options.replyTo && { reply_to: options.replyTo }),
      ...(options.tags && { tags: options.tags }),
    });

    if (error) {
      console.warn("[Resend] transactional send error:", error);
      return { error: error.message, code: error.name };
    }

    return { id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Resend] unexpected error in sendTransactional:", message);
    return { error: message, code: "UNKNOWN_ERROR" };
  }
}

// ---------------------------------------------------------------------------
// Newsletter batch send
// ---------------------------------------------------------------------------

export interface NewsletterEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  tags?: EmailTag[];
}

/**
 * Send a newsletter email (batch-friendly — plain HTML for max compatibility).
 * Returns { id } on success, { error, code } on failure.
 */
export async function sendNewsletter(options: NewsletterEmailOptions): Promise<SendResult> {
  const from =
    process.env.NEWSLETTER_FROM ?? "trafico.live <hola@trafico.live>";

  try {
    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    const { data, error } = await getClient().emails.send({
      from,
      to: recipients,
      subject: options.subject,
      html: options.html,
      ...(options.tags && { tags: options.tags }),
    });

    if (error) {
      console.warn("[Resend] newsletter send error:", error);
      return { error: error.message, code: error.name };
    }

    return { id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Resend] unexpected error in sendNewsletter:", message);
    return { error: message, code: "UNKNOWN_ERROR" };
  }
}

// ---------------------------------------------------------------------------
// Audience management
// ---------------------------------------------------------------------------

export interface AddToAudienceResult {
  contactId?: string;
  error?: string;
  code?: string;
}

/**
 * Add or update a contact in a Resend Audience.
 * Returns { contactId } on success, { error, code } on failure.
 */
export async function addToAudience(
  email: string,
  audienceId: string,
  options?: { firstName?: string; lastName?: string; unsubscribed?: boolean }
): Promise<AddToAudienceResult> {
  if (!audienceId) {
    console.warn("[Resend] addToAudience called without audienceId — skipped");
    return { error: "No audience ID configured", code: "MISSING_AUDIENCE_ID" };
  }

  try {
    const { data, error } = await getClient().contacts.create({
      audienceId,
      email,
      ...(options?.firstName && { firstName: options.firstName }),
      ...(options?.lastName && { lastName: options.lastName }),
      unsubscribed: options?.unsubscribed ?? false,
    });

    if (error) {
      console.warn("[Resend] addToAudience error:", error);
      return { error: error.message, code: error.name };
    }

    return { contactId: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Resend] unexpected error in addToAudience:", message);
    return { error: message, code: "UNKNOWN_ERROR" };
  }
}

/**
 * Mark a contact as unsubscribed in a Resend Audience.
 */
export async function removeFromAudience(
  email: string,
  audienceId: string
): Promise<AddToAudienceResult> {
  return addToAudience(email, audienceId, { unsubscribed: true });
}
