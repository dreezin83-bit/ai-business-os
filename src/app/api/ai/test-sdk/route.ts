import { NextResponse } from "next/server";
import { createLlmCompletion } from "@/lib/llm";

export async function GET() {
  const start = Date.now();

  try {
    const { completion, error } = await createLlmCompletion([
      { role: "user", content: "Say 'Hello, the AI SDK path works!' and nothing else." },
    ]);

    const elapsed = Date.now() - start;

    return NextResponse.json({
      status: "completed",
      elapsed_ms: elapsed,
      success: !error && !!completion,
      completion: completion?.content?.substring(0, 200) || null,
      error: error || null,
    });
  } catch (error: any) {
    return NextResponse.json({
      status: "exception",
      elapsed_ms: Date.now() - start,
      error: error?.message || String(error),
      stack: error?.stack?.substring(0, 400) || "",
    }, { status: 500 });
  }
}