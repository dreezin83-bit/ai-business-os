import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL || "https://api.groq.com/openai/v1";
  const model = process.env.AI_MODEL || "llama-3.1-8b-instant";

  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not set" }, { status: 500 });
  }

  const start = Date.now();

  try {
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Say 'Hello, the AI is working!' and nothing else." }],
        max_tokens: 50,
        temperature: 0.7,
      }),
    });

    const data = await response.text();
    const elapsed = Date.now() - start;

    return NextResponse.json({
      status: response.status,
      ok: response.ok,
      elapsed_ms: elapsed,
      model,
      baseURL,
      responseLength: data.length,
      response: data.substring(0, 500),
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error?.message || String(error),
      elapsed_ms: Date.now() - start,
    }, { status: 500 });
  }
}