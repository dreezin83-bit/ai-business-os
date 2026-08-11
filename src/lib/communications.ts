const RESEND_API_KEY = process.env.RESEND_API_KEY;
export interface SendResult {
  success: boolean;
  error: string | null;
  externalId: string | null;
}
/**
 * Send an email using Resend.
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<SendResult> {
  if (!RESEND_API_KEY) {
    return { success: false, error: "API key not configured", externalId: null };
  }
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: "Sagenify AI <onboarding@resend.dev>",
      to: [to],
      subject,
      html: body.replace(/\n/g, "<br/>"),
    });
    if (error) {
      return { success: false, error: error.message, externalId: null };
    }
    return { success: true, error: null, externalId: data?.id || null };
  } catch (err: any) {
    return { success: false, error: err?.message || "Email send failed", externalId: null };
  }
}
