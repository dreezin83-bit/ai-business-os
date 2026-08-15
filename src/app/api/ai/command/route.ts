import { NextResponse } from "next/server";
import { db } from "@/db";
import { lead, business, aiBrainConfig, appointment, conversation } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { ensureBusiness } from "@/lib/business";
import { parseServices } from "@/lib/ai-services";
import { createLlmCompletion } from "@/lib/llm";
import { sendEmail } from "@/lib/notifications";

/** Search the web using DuckDuckGo HTML (no API key needed) */
async function webSearch(query: string): Promise<string> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AIBusinessOS/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    
    // Parse snippets from results
    const snippets: string[] = [];
    const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = snippetRegex.exec(html)) !== null && snippets.length < 5) {
      const text = match[1].replace(/<[^>]+>/g, "").trim();
      if (text) snippets.push(text);
    }
    
    if (snippets.length === 0) return "No results found.";
    return snippets.map((s, i) => `${i + 1}. ${s}`).join("\n");
  } catch (e: any) {
    return `Search unavailable: ${e.message}`;
  }
}

/** Parse [SEND_EMAIL]::to::subject::body from AI response */
function parseSendEmailMarker(text: string): { to: string; subject: string; body: string } | null {
  const match = text.match(/\[SEND_EMAIL\]::([^:]+)::([^:]+)::([\s\S]+?)(?=\[\/SEND_EMAIL\]|$)/);
  if (!match) return null;
  return { to: match[1].trim(), subject: match[2].trim(), body: match[3].trim() };
}

export async function POST(request: Request) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { userMessage, history } = await request.json();
    const msg = userMessage || "";
    if (!msg) return NextResponse.json({ error: "Message required" }, { status: 400 });

    // ─── Parallelize all queries ───
    const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0);
    const today = new Date().toISOString().split("T")[0];
    const coldThreshold = new Date(Date.now() - 2 * 86400000);

    const [
      [biz],
      [config],
      allLeads,
      leadCounts,
      todayAppts,
      recentConvs,
    ] = await Promise.all([
      db.select({ name: business.name, email: business.email }).from(business).where(eq(business.id, businessId)),
      db.select({ services: aiBrainConfig.services }).from(aiBrainConfig).where(eq(aiBrainConfig.businessId, businessId)),

      // Only fetch last 50 leads — enough for the table, not the entire history
      db.select({
        name: lead.name, phone: lead.phone, email: lead.email,
        serviceRequest: lead.serviceRequest, status: lead.status, createdAt: lead.createdAt,
      }).from(lead).where(eq(lead.businessId, businessId)).orderBy(desc(lead.createdAt)).limit(50),

      // Lead counts pushed to DB — no JS filtering
      db.select({ status: lead.status, count: sql<number>`count(*)::int` })
        .from(lead).where(eq(lead.businessId, businessId)).groupBy(lead.status),

      db.select({ count: sql<number>`count(*)::int` }).from(appointment)
        .where(and(eq(appointment.businessId, businessId), eq(appointment.date, today), eq(appointment.status, "scheduled"))),

      db.select({ id: conversation.id, customerName: conversation.customerName, createdAt: conversation.createdAt })
        .from(conversation).where(eq(conversation.businessId, businessId))
        .orderBy(desc(conversation.createdAt)).limit(5),
    ]);

    const businessName = biz?.name || "your business";
    const businessEmail = biz?.email || "";

    // Parse services for industry awareness (JSON array or plain text)
    const services = parseServices(config?.services);
    let industry = "service";
    const svc = services.join(" ").toLowerCase();
    if (svc.includes("hvac") || svc.includes("heating") || svc.includes("cooling") || svc.includes("air condition")) industry = "HVAC";
    else if (svc.includes("plumb")) industry = "plumbing";
    else if (svc.includes("roof")) industry = "roofing";
    else if (svc.includes("electric")) industry = "electrical";
    else if (svc.includes("clean") || svc.includes("maid")) industry = "cleaning";
    else if (svc.includes("landscap") || svc.includes("lawn")) industry = "landscaping";
    else if (svc.includes("pest")) industry = "pest control";
    else if (svc.includes("paint")) industry = "painting";
    else if (svc.includes("dental") || svc.includes("teeth")) industry = "dental";
    else if (svc.includes("law") || svc.includes("legal")) industry = "legal";

    // Compute lead stats from DB-grouped counts — no JS iteration
    const statusMap = new Map(leadCounts.map(r => [r.status, Number(r.count)]));
    const totalLeads = [...statusMap.values()].reduce((a, b) => a + b, 0);
    const wonLeads = statusMap.get("won") || 0;
    const newLeads = statusMap.get("new") || 0;
    const contactedLeads = statusMap.get("contacted") || 0;
    const lostLeads = statusMap.get("lost") || 0;
    const winRate = totalLeads > 0 ? Math.round((wonLeads / (wonLeads + lostLeads || 1)) * 100) : 0;

    // Monthly leads: count from fetched leads (limited to 50, but close enough for overview)
    const monthlyLeads = allLeads.filter((l) => new Date(l.createdAt) >= thisMonth).length;
    const coldLeads = allLeads.filter((l) => l.status === "new" && new Date(l.createdAt) < coldThreshold).length;

    const leadTable = allLeads.slice(0, 20).map((l, i) => {
      const daysOld = Math.round((Date.now() - new Date(l.createdAt).getTime()) / 86400000);
      const urgency = l.status === "new" && daysOld > 2 ? "⚠️ COLD" :
                      l.status === "new" ? "NEW" : l.status === "contacted" ? "IN PROGRESS" :
                      l.status === "won" ? "✅ WON" : "❌ LOST";
      return `${i+1}. ${l.name} | ${l.phone || "no phone"} | ${l.email || "no email"} | "${l.serviceRequest || "no service"}" | ${urgency} | ${daysOld}d`;
    }).join("\n");

    // Check if user is asking for a web search or pricing research
    const searchTriggers = /(?:search|look ?up|find|price|cost|how much|supplier|permit|regulation|market rate|going rate|current price|latest|real-time)/i;
    let searchResults = "";
    if (searchTriggers.test(msg) && msg.length > 10) {
      // Extract search query from the message
      const searchQuery = msg.replace(/^(?:can you |please |help me |i need to |i want to )/i, "").substring(0, 200);
      searchResults = await webSearch(`${industry} ${searchQuery}`);
    }

    const systemPrompt = `You are Vertical AI — a strategic command center for ${businessName}, a ${industry} company. You have access to the internet for real-time pricing, supplier info, and market research. You can also send emails directly to leads.

YOUR VALUE PROPOSITION:
You replace a $50,000/year office assistant at $1,000/month — saving $38,000/year while responding instantly. Contractors who use you land twice as many jobs because they quote in 60 seconds instead of 3 days.

HOW TO SEND EMAILS:
When you need to send an email to a lead or customer, use this exact format:
[SEND_EMAIL]::recipient@email.com::Subject Line Here::Email body goes here. Be professional. Include the business name, the customer's name, the service they asked about, pricing if discussed, and a clear next step. Keep it concise and warm.[/SEND_EMAIL]

The email will be sent FROM ${businessEmail || "your business email"} using the Resend email service.
Always confirm with the user before sending: "I'll draft that email for you now. It'll come from ${businessEmail || "your email"}. Ready to send?"

LIVE BUSINESS DATA:
• Total Leads: ${totalLeads} | This Month: ${monthlyLeads}
• Won/Closed: ${wonLeads}
• In Progress: ${contactedLeads} | New (not contacted): ${newLeads}
• ⚠️ Cold (2+ days): ${coldLeads} | Lost: ${lostLeads}
• Win Rate: ${winRate}% | Today's Appointments: ${todayAppts[0]?.count ?? 0}
• Services: ${services.join(", ") || "not configured"}
• Business Email: ${businessEmail || "not set"}

RECENT LEADS:
${leadTable || "No leads yet."}
${searchResults ? `\nWEB SEARCH RESULTS:\n${searchResults}\n(Use this data to inform your response with real pricing, market rates, or supplier info.)` : ""}

YOUR CAPABILITIES:
1. SEND EMAILS — Draft and send professional emails to leads using [SEND_EMAIL] marker
2. WEB SEARCH — I automatically search the web when you ask about pricing, suppliers, regulations, or market rates
3. PRIORITIZE — Tell them exactly who to call: name, phone, why they're urgent
4. DRAFT QUOTES — Use real market data from web searches + ${industry} industry knowledge
5. ANALYZE — Win rates, conversion patterns, performance trends
6. CELEBRATE — Milestones, time saved vs manual work, lead response speed

RULES:
- Use REAL names, phones, emails from the live data
- When drafting emails, use full names and reference their actual service request
- Include dollar amounts whenever possible
- Always confirm before sending an email
- Every response should include a clear next step
- Be direct and practical — contractors are busy
- Use the web search results whenever available for accurate pricing

Today: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`;

    const historyMessages = (history || []).slice(-6).map((h: any) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    }));

    const { completion, error } = await createLlmCompletion([
      { role: "system", content: systemPrompt },
      ...historyMessages,
      { role: "user", content: msg },
    ]);

    if (!completion) {
      return NextResponse.json({ error: "AI error", detail: error }, { status: 500 });
    }

    let reply = completion.content;
    let emailResult: any = null;

    // Process [SEND_EMAIL] marker
    const emailData = parseSendEmailMarker(reply);
    if (emailData) {
      const result = await sendEmail(emailData.to, emailData.subject, emailData.body);
      emailResult = { to: emailData.to, success: result.success, messageId: result.messageId, error: result.error };
      
      // Clean the marker from the response
      reply = reply.replace(/\[SEND_EMAIL\]::[\s\S]*?\[\/SEND_EMAIL\]/g, "").trim();
      
      // Append send result to reply
      if (result.success) {
        reply += `\n\n✅ Email sent to ${emailData.to}`;
      } else {
        reply += `\n\n❌ Email failed: ${result.error}`;
      }
    }

    return NextResponse.json({ response: reply, emailResult });

  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
