import { NextResponse } from "next/server";

export async function GET() {
  const diagnostics = {
    aiProvider: process.env.AI_PROVIDER || "(not set)",
    aiModel: process.env.AI_MODEL || "(not set)",
    openaiBaseUrl: process.env.OPENAI_BASE_URL || "(not set)",
    openaiApiKeySet: Boolean(process.env.OPENAI_API_KEY),
    openaiApiKeyLength: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0,
    openaiApiKeyPrefix: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 8) + "..." : "MISSING",
    databaseUrlSet: Boolean(process.env.DATABASE_URL),
    clerkSecretKeySet: Boolean(process.env.CLERK_SECRET_KEY),
    clerkPublishableKeySet: Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
    nodeEnv: process.env.NODE_ENV || "(not set)",
  };

  return NextResponse.json(diagnostics);
}