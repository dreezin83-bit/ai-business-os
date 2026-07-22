import { createLlmCompletion } from "@/lib/llm";

interface ExtractedLead {
  name: string | null;
  phone: string | null;
  email: string | null;
  preferredMethod: string | null;
  serviceRequest: string | null;
}

/**
 * Use an LLM call to extract lead information from a conversation.
 * This is more reliable than relying on the primary AI to output special markers.
 */
export async function extractLeadFromConversation(
  history: Array<{ role: "user" | "assistant" | "system"; content: string }>
): Promise<ExtractedLead | null> {
  // Only consider the last N messages for extraction
  const recentHistory = history.slice(-6);

  const extractionPrompt = `Analyze this conversation between a customer and a business assistant.
Extract the customer's information if available. Return ONLY valid JSON, no other text.

{
  "name": "customer's full name or null if not mentioned",
  "phone": "phone number or null",
  "email": "email address or null",
  "preferredMethod": "sms, email, or whatsapp based on what customer prefers, or null",
  "serviceRequest": "what service the customer needs or null"
}

Conversation:
${recentHistory.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}`;

  try {
    const { completion, error } = await createLlmCompletion([
      { role: "system", content: "You are a data extraction tool. Only return valid JSON. Never add explanations." },
      { role: "user", content: extractionPrompt },
    ]);

    if (error || !completion) {
      console.log("[lead-extractor] LLM call failed:", error);
      return null;
    }

    // Parse the JSON response
    const text = completion.content.trim();
    // Handle cases where the LLM wraps JSON in markdown code blocks
    const jsonStr = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    const extracted = JSON.parse(jsonStr) as ExtractedLead;

    // Require at least a name AND (phone or email) to consider it a valid lead
    if (!extracted.name || (!extracted.phone && !extracted.email)) {
      console.log("[lead-extractor] Insufficient data: name=", extracted.name, "phone=", extracted.phone, "email=", extracted.email);
      return null;
    }

    console.log("[lead-extractor] Extracted lead:", JSON.stringify(extracted));
    return extracted;
  } catch (err: any) {
    console.log("[lead-extractor] Extraction failed:", err?.message || String(err));
    return null;
  }
}