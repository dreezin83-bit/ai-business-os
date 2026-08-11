const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MESSAGEBIRD_API_KEY = process.env.MESSAGEBIRD_API_KEY;

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

/**
 * Send an SMS using MessageBird.
 */
export async function sendSms(to: string, body: string): Promise<SendResult> {
  if (!MESSAGEBIRD_API_KEY) {
    return { success: false, error: "API key not configured", externalId: null };
  }

  try {
    const messagebird = (await import("messagebird")).default;
    const client = messagebird(MESSAGEBIRD_API_KEY);

    const result = await new Promise<any>((resolve, reject) => {
      client.messages.create(
        {
          originator: "AIOS",
          recipients: [to],
          body,
        },
        (err: any, response: any) => {
          if (err) reject(err);
          else resolve(response);
        }
      );
    });

    return {
      success: true,
      error: null,
      externalId: result?.id || null,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.errors?.[0]?.description || err?.message || "SMS send failed",
      externalId: null,
    };
  }
}

/**
 * Send a WhatsApp message using MessageBird.
 */
export async function sendWhatsApp(to: string, body: string): Promise<SendResult> {
  if (!MESSAGEBIRD_API_KEY) {
    return { success: false, error: "API key not configured", externalId: null };
  }

  try {
    const messagebird = (await import("messagebird")).default;
    const client = messagebird(MESSAGEBIRD_API_KEY);

    const result = await new Promise<any>((resolve, reject) => {
      client.conversations.start(
        {
          channelId: process.env.WHATSAPP_CHANNEL_ID || "",
          to,
          content: { text: body },
        },
        (err: any, response: any) => {
          if (err) reject(err);
          else resolve(response);
        }
      );
    });

    return {
      success: true,
      error: null,
      externalId: result?.id || null,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.errors?.[0]?.description || err?.message || "WhatsApp send failed",
      externalId: null,
    };
  }
}