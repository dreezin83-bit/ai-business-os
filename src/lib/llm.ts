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
 * Create an LLM completion using the configured provider.
 * Supports OpenAI, OpenAI-compatible providers (Groq, Together, OpenRouter, etc.).
 *
 * Returns { completion: null, error: "reason" } if the API key is missing or any error occurs.
 */
export async function createLlmCompletion(
  messages: LlmMessage[]
): Promise<LlmResult> {
  const provider = process.env.AI_PROVIDER || "openai";
  const model = process.env.AI_MODEL || "gpt-4o-mini";
  const baseURL = process.env.OPENAI_BASE_URL || "(default)";
  const hasKey = !!process.env.OPENAI_API_KEY;

  // Runtime diagnostics — log provider config without exposing the API key
  console.log(`[LLM] Provider: ${provider} | Model: ${model} | Base URL: ${baseURL} | API Key set: ${hasKey}`);

  try {
    switch (provider) {
      case "openai":
        console.log("[LLM] Routing to OpenAI");
        return await callOpenAI(messages);
      case "openai-compatible":
        console.log("[LLM] Routing to OpenAI-compatible provider");
        return await callOpenAICompatible(messages);
      default:
        console.error("[LLM] Unknown provider:", provider);
        return { completion: null, error: `Unknown AI provider: "${provider}". Use "openai" or "openai-compatible".` };
    }
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

/**
 * Call an OpenAI-compatible provider using the OpenAI SDK with a custom base URL.
 * Works with Groq, Together, OpenRouter, and any provider that implements the OpenAI chat completions API.
 */
async function callOpenAICompatible(
  messages: LlmMessage[]
): Promise<LlmResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL;

  if (!apiKey) {
    return { completion: null, error: "OPENAI_API_KEY is not configured. Required for OpenAI-compatible providers (Groq, etc.)." };
  }
  if (!baseURL) {
    return { completion: null, error: "OPENAI_BASE_URL is not configured. Required for OpenAI-compatible providers (Groq, etc.). Set it to the provider's API endpoint (e.g. https://api.groq.com/openai/v1)." };
  }

  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey, baseURL });

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