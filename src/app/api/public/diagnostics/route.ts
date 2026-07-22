import { NextResponse } from "next/server";
import { db } from "@/db";
import { business } from "@/db/schema";
import { buildAiContext } from "@/lib/ai-context";
import { createLlmCompletion } from "@/lib/llm";

/**
 * Public diagnostics: find businesses and test the full AI flow.
 * No auth required — for debugging only. Remove in production.
 */
export async function GET() {
  const results: Record<string, unknown> = {};

  // Step 1: Find businesses in the database
  try {
    const businesses = await db.select().from(business).limit(5);
    results.businesses = businesses.map((b) => ({
      id: b.id,
      name: b.name,
      ownerId: b.ownerId,
    }));
  } catch (e: any) {
    results.bizError = e?.message || String(e);
    return NextResponse.json(results, { status: 500 });
  }

  if (!results.businesses || (Array.isArray(results.businesses) && (results.businesses as any[]).length === 0)) {
    results.bizError = "No businesses found in database";
    return NextResponse.json(results);
  }

  const biz = (results.businesses as any[])[0];

  // Step 2: Build AI context
  try {
    const ctx = await buildAiContext(biz.id);
    results.aiContext = {
      businessName: ctx.businessName,
      greetingMessage: ctx.greetingMessage,
      systemPromptLength: ctx.systemPrompt.length,
      systemPromptPreview: ctx.systemPrompt.substring(0, 500),
    };
  } catch (e: any) {
    results.contextError = `${e?.message || String(e)}`;
    results.contextStack = e?.stack?.substring(0, 400) || "";
    return NextResponse.json(results);
  }

  // Step 3: Call Groq via the same LLM function
  try {
    const ctx = await buildAiContext(biz.id);
    const { completion, error } = await createLlmCompletion([
      { role: "system", content: ctx.systemPrompt },
      { role: "user", content: "What services do you offer? Answer in one sentence." },
    ]);
    if (error) {
      results.llmError = error;
    } else {
      results.llmResponse = completion?.content?.substring(0, 300);
    }
  } catch (e: any) {
    results.llmError = `${e?.message || String(e)}`;
    results.llmStack = e?.stack?.substring(0, 400) || "";
  }

  return NextResponse.json(results);
}