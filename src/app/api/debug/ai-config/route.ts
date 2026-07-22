import { NextResponse } from "next/server";

/**
 * Debug endpoint: tests the Groq API configuration in production.
 * Returns what provider/model/base-url are configured, whether the API key is set,
 * and the result of a real call to the LLM provider.
 */
export async function GET() {
  const provider = process.env.AI_PROVIDER || "openai";
  const model = process.env.AI_MODEL || "gpt-4o-mini";
  const baseURL = process.env.OPENAI_BASE_URL || "(default)";
  const hasKey = !!process.env.OPENAI_API_KEY;

  const config = {
    provider,
    model,
    baseURL,
    apiKeySet: hasKey,
    nodeEnv: process.env.NODE_ENV || "unknown",
  };

  // Attempt a real API call
  let apiResult: { success: boolean; response?: string; error?: string; latencyMs?: number } = {
    success: false,
    error: "Not attempted",
  };

  if (!hasKey) {
    apiResult = { success: false, error: "OPENAI_API_KEY is not set" };
  } else {
    const start = Date.now();
    try {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY!,
        baseURL: process.env.OPENAI_BASE_URL || undefined,
      });

      const completion = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: "Say hello in exactly one word." }],
        max_tokens: 10,
      });

      const content = completion.choices[0]?.message?.content || "(empty)";
      apiResult = {
        success: true,
        response: content,
        latencyMs: Date.now() - start,
      };
    } catch (error: any) {
      const status = error?.status || error?.statusCode;
      const msg = error?.message || error?.toString();
      const body = error?.response?.data || error?.response?.body || "";
      apiResult = {
        success: false,
        error: `HTTP ${status || "?"}: ${msg}. Body: ${JSON.stringify(body).substring(0, 400)}`,
        latencyMs: Date.now() - start,
      };
    }
  }

  return NextResponse.json({ config, apiResult });
}
