import crypto from "crypto";

/**
 * Verify Twilio webhook signature per:
 * https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
export async function verifyTwilioSignature(
  request: Request,
  rawBody: string
): Promise<boolean> {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.error("[twilio-verify] TWILIO_AUTH_TOKEN not set");
    return false;
  }

  const twilioSig = request.headers.get("X-Twilio-Signature");
  if (!twilioSig) return false;

  // Build full URL as Twilio would have used (we need the x-forwarded-proto/origin)
  const url = new URL(request.url);
  // Sort form params alphabetically
  const params = new URLSearchParams(rawBody);
  const sortedParams = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));

  // Construct the signed data: full URL + sorted params
  const data = sortedParams.reduce(
    (acc, [k, v]) => `${acc}${k}${v}`,
    url.toString()
  );

  const computed = crypto
    .createHmac("sha1", authToken)
    .update(data)
    .digest("base64");

  const match = crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(twilioSig)
  );

  if (!match) console.error("[twilio-verify] Signature mismatch");
  return match;
}
