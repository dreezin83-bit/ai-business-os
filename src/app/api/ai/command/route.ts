import { NextResponse } from "next/server";
import { db } from "@/db";
import { lead, business, aiBrainConfig, communicationLog, appointment, conversation, message } from "@/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { ensureBusiness } from "@/lib/business";
import { createLlmCompletion } from "@/lib/llm";
import { notifyContractorOfNewLead, sendCustomerConfirmation } from "@/lib/notifications";

export async function POST(request: Request) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { userMessage, history } = await request.json();
    const message = userMessage || "";
    if (!message) return NextResponse.json({ error: "Message required" }, { status: 400 });

    const [biz] = await db.select().from(business).where(eq(business.id, businessId));
    const [config] = await db.select().from(aiBrainConfig).where(eq(aiBrainConfig.businessId, businessId));

    // Get all leads with full context
    const allLeads = await db.select().from(lead).where(eq(lead.businessId, businessId)).orderBy(desc(lead.createdAt));
    
    // Stats
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    const monthlyLeads = allLeads.filter((l) => new Date(l.createdAt) >= thisMonth);
    const wonLeads = allLeads.filter((l) => l.status === "won");
    const newLeads = allLeads.filter((l) => l.status === "new");
    const contactedLeads = allLeads.filter((l) => l.status === "contacted");
    const lostLeads = allLeads.filter((l) => l.status === "lost");
    const coldNewLeads = newLeads.filter((l) => {
      const days = (Date.now() - new Date(l.createdAt).getTime()) / 86400000;
      return days > 2;
    });

    // Appointments
    const today = new Date().toISOString().split("T")[0];
    const todayAppts = await db.select().from(appointment)
      .where(and(eq(appointment.businessId, businessId), eq(appointment.date, today), eq(appointment.status, "scheduled")));

    // Recent conversations
    const recentConvs = await db.select().from(conversation)
      .where(eq(conversation.businessId, businessId))
      .orderBy(desc(conversation.createdAt))
      .limit(5);

    // Build comprehensive lead table
    const leadTable = allLeads.slice(0, 30).map((l, i) => {
      const daysOld = Math.round((Date.now() - new Date(l.createdAt).getTime()) / 86400000);
      const urgency = l.status === "new" && daysOld > 3 ? "⚠️ URGENT - Not contacted!" :
                      l.status === "new" ? "NEW" :
                      l.status === "contacted" ? "In Progress" :
                      l.status === "won" ? "✅ Closed" : "❌ Lost";
      return `${i+1}. ${l.name} | ${l.phone} | ${l.email} | "${l.serviceRequest || "No service specified"}" | ${urgency} | ${daysOld}d old`;
    }).join("\n");

    const statsTable = [
      `TOTAL LEADS: ${allLeads.length}`,
      `THIS MONTH: ${monthlyLeads.length} new`,
      `WON/CLOSED: ${wonLeads.length} (${(wonLeads.length * 2500).toLocaleString()} est. revenue at $2,500 avg)`,
      `IN PROGRESS: ${contactedLeads.length}`,
      `NEW - NOT CONTACTED: ${newLeads.length}`,
      `⚠️ COLD LEADS (2+ days, no contact): ${coldNewLeads.length}`,
      `LOST: ${lostLeads.length}`,
      `WIN RATE: ${allLeads.length > 0 ? Math.round((wonLeads.length / (wonLeads.length + lostLeads.length || 1)) * 100) : 0}%`,
      `TODAY'S APPOINTMENTS: ${todayAppts.length}`,
      `RECENT CONVERSATIONS: ${recentConvs.length}`,
    ].join("\n");

    const businessName = biz?.name || "the business";

    const systemPrompt = `You are an AI Command Center for ${businessName}. You are a strategic business assistant with access to real-time lead data, appointments, and communication history.

YOUR ROLE:
You help the contractor run their business smarter. You analyze data, find opportunities, flag problems, and suggest concrete actions.

BUSINESS DATA (LIVE):
${statsTable}

ALL LEADS:
${leadTable || "No leads yet."}

CAPABILITIES:
1. ANALYZE: Find patterns — which services sell most? Which leads are going cold? What's converting?
2. PRIORITIZE: Tell them exactly who to call first and why — "Call John at 555-1234, his AC repair lead is 5 days old"
3. DRAFT: Write professional emails to specific leads — "Here's an email to Sarah about her roofing estimate"
4. ADVISE: Based on real data — "Your win rate is low. Try following up within 24 hours. Leads contacted same-day have higher conversion."
5. CELEBRATE: When they hit milestones — "You closed 5 deals this month, that's $12,500!"

RULES:
- Always use REAL names, phone numbers, and email addresses from the data — never make up leads
- When suggesting a call, include the phone number so they can tap to dial
- Keep responses actionable. Every message should end with a clear next step
- If they ask to send an email, draft it and say "I'll send this now" 
- Be encouraging but honest. If something's not working, say so
- Format numbers clearly: use bullet points, bold for names, include $ amounts`; 

    // Build conversation history
    const historyMessages = (history || []).slice(-6).map((h: any) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    }));

    const { completion, error } = await createLlmCompletion([
      { role: "system", content: systemPrompt },
      ...historyMessages,
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