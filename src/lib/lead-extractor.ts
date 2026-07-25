import { createLlmCompletion } from "@/lib/llm";

interface ExtractedLead {
  name: string | null;
  phone: string | null;
  email: string | null;
  preferredMethod: string | null;
  serviceRequest: string | null;
}

/** Values that are clearly not real customer data */
const PLACEHOLDER_PATTERNS = [
  /^not provided$/i,
  /^n\/a$/i,
  /^none$/i,
  /^null$/i,
  /^customer name$/i,
  /^customer$/i,
  /^sms\/email$/i,
  /^sms\/email\/whatsapp$/i,
  /^unknown$/i,
  /^test$/i,
  /^hello$/i,
  /^hi$/i,
];

function isPlaceholder(value: string | null): boolean {
  if (!value || value.trim().length === 0) return true;
  const trimmed = value.trim();
  if (trimmed.length < 2) return true; // single character is not a real name/email
  return PLACEHOLDER_PATTERNS.some((p) => p.test(trimmed));
}

function isValidEmail(value: string | null): boolean {
  if (!value || isPlaceholder(value)) return false;
  // Basic email validation
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidPhone(value: string | null): boolean {
  if (!value || isPlaceholder(value)) return false;
  // Must contain at least some digits
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7;
}

function isValidPreferredMethod(value: string | null): boolean {
  if (!value || isPlaceholder(value)) return false;
  const v = value.trim().toLowerCase();
  return v === "email" || v === "phone";
}

/**
 * Validate that the extracted lead has all required fields with real data.
 * Requires: name, email AND phone, preferred method, and service request.
 */
export function isValidLead(lead: ExtractedLead): boolean {
  // Name must be real
  if (isPlaceholder(lead.name)) {
    console.log("[lead-extractor] Validation failed: name is placeholder or empty:", lead.name);
    return false;
  }

  // BOTH email AND phone required
  if (!isValidEmail(lead.email)) {
    console.log("[lead-extractor] Validation failed: email is invalid or missing:", lead.email);
    return false;
  }
  if (!isValidPhone(lead.phone)) {
    console.log("[lead-extractor] Validation failed: phone is invalid or missing:", lead.phone);
    return false;
  }

  // Must have a valid preferred method
  if (!isValidPreferredMethod(lead.preferredMethod)) {
    console.log("[lead-extractor] Validation failed: invalid preferred method:", lead.preferredMethod);
    return false;
  }

  // Must have a service request
  if (isPlaceholder(lead.serviceRequest)) {
    console.log("[lead-extractor] Validation failed: service request is placeholder or empty:", lead.serviceRequest);
    return false;
  }

  return true;
}

/**
 * Use an LLM call to extract lead information from a conversation.
 * Returns null if insufficient or placeholder data is found.
 */
export async function extractLeadFromConversation(
  history: Array<{ role: "user" | "assistant" | "system"; content: string }>
): Promise<ExtractedLead | null> {
  const recentHistory = history.slice(-6);

  const extractionPrompt = `Analyze this conversation between a customer and a business assistant.
Extract the customer's information if available. Return ONLY valid JSON, no other text.

{
  "name": "customer's full name or null",
  "phone": "phone number or null",
  "email": "email address or null",
  "preferredMethod": "email or phone — or null if not determined",
  "serviceRequest": "what service the customer needs or null"
}

IMPORTANT: Only extract real, specific data. Use null for anything unknown, vague, or generic.
Never use "not provided", "customer name", "N/A", or placeholder text.

Conversation:
${recentHistory.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}`;

  try {
    const { completion, error } = await createLlmCompletion([
      { role: "system", content: "You are a data extraction tool. Only return valid JSON with null for unknown fields. Never use placeholder text." },
      { role: "user", content: extractionPrompt },
    ]);

    if (error || !completion) {
      console.log("[lead-extractor] LLM call failed:", error);
      return null;
    }

    const text = completion.content.trim();
    const jsonStr = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    const extracted = JSON.parse(jsonStr) as ExtractedLead;

    // Full validation before returning
    if (!isValidLead(extracted)) {
      return null;
    }

    console.log("[lead-extractor] Valid lead extracted:", JSON.stringify(extracted));
    return extracted;
  } catch (err: any) {
    console.log("[lead-extractor] Extraction failed:", err?.message || String(err));
    return null;
  }
}