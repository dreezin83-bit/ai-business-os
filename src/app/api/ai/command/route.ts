import { NextResponse } from "next/server";
import { db } from "@/db";
import { lead, business, aiBrainConfig, communicationLog } from "@/db/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { ensureBusiness } from "@/lib/business";
import { createLlmCompletion } from "@/lib/llm";

export async function POST(request: Request) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { message } = await request.json();
    if (!message) return NextResponse.json({ error: "Message required" }, { status: 400 });

    const [biz] = await db.select().from(business).where(eq(business.id, businessId));
    const [config] = await db.select().from(aiBrainConfig).where(eq(aiBrainConfig.businessId, businessId));

    // Get lead stats
    const allLeads = await db.select().from(lead).where(eq(lead.businessId, businessId)).orderBy(desc(lead.createdAt));
    
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    const monthlyLeads = allLeads.filter((l) => new Date(l.createdAt) >= thisMonth);
    const wonLeads = allLeads.filter((l) => l.status === "won");
    const newLeads = allLeads.filter((l) => l.status === "new");

    // Build comprehensive context for the AI
    const leadSummary = allLeads.slice(0, 20).map((l) => 
      `- ${l.name}: ${l.serviceRequest || "No description"} | Status: ${l.status} | ${l.phone} | ${l.email} | Created: ${l.createdAt}`
    ).join("\n");

    const statsSummary = [
      `Total Leads: ${allLeads.length}`,
      `This Month: ${monthlyLeads.length}`,
      `Won/Closed: ${wonLeads.length}`,
      `New (uncontacted): ${newLeads.length}`,
      `Win Rate: ${allLeads.length > 0 ? Math.round((wonLeads.length / allLeads.length) * 100) : 0}%`,
    ].join("\n");

    const systemPrompt = `You are an AI business assistant for ${biz?.name || "the business"}. You help the contractor manage their business.

You have access to:
- Lead database (names, phones, emails, statuses, services)
- Communication history
- The ability to give business advice based on real data

YOUR CAPABILITIES:
1. Answer questions about leads: "How many leads this month?" "Who hasn't been contacted?"
2. Business insights: analyze lead data and suggest improvements
3. Draft emails: when the contractor asks you to send an email to a customer, compose it and explain what you'll send
4. Revenue estimates: based on leads closed and average job values

CURRENT BUSINESS DATA:
${statsSummary}

RECENT LEADS:
${leadSummary || "No leads yet."}

INSTRUCTIONS:
- Be direct and helpful. The contractor is busy.
- When they ask to email someone, compose the email draft and offer to send it.
- Suggest specific actions: "You should call John — his lead is 3 days old and he needs AC repair"
- Use numbers from the actual data. Don't make up stats.
- Keep responses concise.`;

    const { completion, error } = await createLlmCompletion([
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ]);

    if (!completion) {
      return NextResponse.json({ error: "AI error", detail: error }, { status: 500 });
    }

    return NextResponse.json({ response: completion.content });

  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}