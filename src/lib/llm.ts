export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmCompletion {
  content: string;
}

/**
 * Create an LLM completion using the configured provider.
 * Supports OpenAI and OpenAI-compatible providers (Groq, Together, OpenRouter, etc.).
 *
 * Returns null if the provider's API key is missing or if any error occurs.
 */
export async function createLlmCompletion(
  messages: LlmMessage[]
): Promise<LlmCompletion | null> {
  const provider = process.env.AI_PROVIDER || "openai";

  try {
    switch (provider) {
      case "openai":
        return await callOpenAI(messages);
      case "openai-compatible":
        return await callOpenAICompatible(messages);
      default:
        console.error(`Unknown AI provider: ${provider}`);
        return null;
    }
  } catch (error) {
    console.error(`LLM error (${provider}):`, error);
    return null;
  }
}

/**
 * Call OpenAI using the OpenAI SDK.
 */
async function callOpenAI(messages: LlmMessage[]): Promise<LlmCompletion | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey });

  const completion = await openai.chat.completions.create({
    model: process.env.AI_MODEL || "gpt-4o-mini",
    messages,
    max_tokens: 500,
    temperature: 0.7,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) return null;

  return { content };
}

/**
 * Call an OpenAI-compatible provider using the OpenAI SDK with a custom base URL.
 * Works with Groq, Together, OpenRouter, and any provider that implements the OpenAI chat completions API.
 */
async function callOpenAICompatible(
  messages: LlmMessage[]
): Promise<LlmCompletion | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL;
  if (!apiKey || !baseURL) return null;

  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey, baseURL });

  const completion = await openai.chat.completions.create({
    model: process.env.AI_MODEL || "gpt-4o-mini",
    messages,
    max_tokens: 500,
    temperature: 0.7,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) return null;

  return { content };
}