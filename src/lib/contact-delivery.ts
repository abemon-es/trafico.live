/**
 * How an accepted contact request reaches someone.
 *
 * - With the site's own sender (SES): the usual emails; the copy to BMC One
 *   goes after the response and never changes it.
 * - If the site's email fails and forwarding is configured, the copy to
 *   BMC One becomes the delivery.
 * - Without a sender but with forwarding configured: the copy to BMC One IS
 *   the delivery. The visitor waits for it (two attempts, ~11 s at most) and
 *   is only told «received» if the platform stored it; the lead book is
 *   where it gets answered.
 * - With neither: no channel, the route says where to write instead.
 *
 * Pure: every side effect comes in through `deps`, so the matrix is testable.
 */
import type { ForwardOutcome } from "./bmc-forms-forward";

export interface DeliveryDeps {
  sesConfigured: boolean;
  forwardConfigured: boolean;
  /** The site's own emails. Throws if the one that reaches the team failed. */
  sendEmails: () => Promise<void>;
  /** Awaited copy to BMC One, used when it is the delivery. */
  forwardNow: () => Promise<ForwardOutcome>;
  /** Copy to BMC One after the response, used when email already delivered. */
  forwardLater: () => void;
}

export type DeliveryResult =
  | { kind: "emailed" }
  | { kind: "forwarded"; ref?: string }
  | { kind: "email-failed"; error: unknown }
  | { kind: "forward-failed"; code: string }
  | { kind: "no-channel" };

export async function deliverContact(deps: DeliveryDeps): Promise<DeliveryResult> {
  let emailError: unknown = null;

  if (deps.sesConfigured) {
    try {
      await deps.sendEmails();
      deps.forwardLater();
      return { kind: "emailed" };
    } catch (error) {
      if (!deps.forwardConfigured) return { kind: "email-failed", error };
      emailError = error;
    }
  }

  if (deps.forwardConfigured) {
    const out = await deps.forwardNow();
    if (out.status === "sent") return { kind: "forwarded", ref: out.ref };
    if (emailError !== null) return { kind: "email-failed", error: emailError };
    return { kind: "forward-failed", code: out.status === "failed" ? String(out.code) : out.reason };
  }

  return { kind: "no-channel" };
}
