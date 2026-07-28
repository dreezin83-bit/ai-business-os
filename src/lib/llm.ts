export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmCompletion {
  content: string;
}

export interface LlmResult {
  completion: LlmCompletion | null;
  error: string | null;
}

/**
 * Create an LLM completion using OpenAI.
 *
 * Returns { completion: null, error: "reason" } if the API key is missing or any error occurs.
 */
export async function createLlmCompletion(
  messages: LlmMessage[]
): Promise<LlmResult> {
  const provider = process.env.AI_PROVIDER || "openai";
  const model = process.env.AI_MODEL || "gpt-4o-mini";
  const hasKey = !!process.env.OPENAI_API_KEY;

  console.log(`[LLM] Provider: ${provider} | Model: ${model} | API Key set: ${hasKey}`);

  try {
    if (provider !== "openai") {
      console.error("[LLM] Unknown provider:", provider);
      return { completion: null, error: `Unknown AI provider: "${provider}". Only "openai" is supported.` };
    }

    console.log("[LLM] Routing to OpenAI");
    return await callOpenAI(messages);
  } catch (error: any) {
    const status = error?.status || error?.statusCode;
    const message = error?.message || error?.toString() || "Unknown LLM error";
    const responseData = error?.response?.data || error?.response?.body;
    console.error(`[LLM] Error from ${provider}: status=${status || "?"} message=${message} responseBody=${JSON.stringify(responseData || "").substring(0, 300)}`);
    return { completion: null, error: `AI provider error (${provider}/${model}): ${message}` };
  }
}

/**
 * Call OpenAI using the OpenAI SDK.
 */
async function callOpenAI(messages: LlmMessage[]): Promise<LlmResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { completion: null, error: "OPENAI_API_KEY is not configured in environment variables." };
  }

  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey });

  const completion = await openai.chat.completions.create({
    model: process.env.AI_MODEL || "gpt-4o-mini",
    messages,
    max_tokens: 500,
    temperature: 0.7,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    return { completion: null, error: "AI returned an empty response." };
  }

  return { completion: { content }, error: null };
}
