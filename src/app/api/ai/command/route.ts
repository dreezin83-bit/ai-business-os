import { NextResponse } from "next/server";
import { db } from "@/db";
import { lead, business, aiBrainConfig, appointment, conversation } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { ensureBusiness } from "@/lib/business";
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

    const [biz] = await db.select().from(business).where(eq(business.id, businessId));
    const [config] = await db.select().from(aiBrainConfig).where(eq(aiBrainConfig.businessId, businessId));
    const businessName = biz?.name || "your business";
    const businessEmail = biz?.email || "";

    // Parse services for industry awareness
    let services: string[] = [];
    let industry = "service";
    try { 
      const s = JSON.parse(config?.services || "[]"); 
      if (Array.isArray(s)) services = s;
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
    } catch {}

    // Load leads
    const allLeads = await db.select().from(lead).where(eq(lead.businessId, businessId)).orderBy(desc(lead.createdAt));
    const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0);
    const monthlyLeads = allLeads.filter((l) => new Date(l.createdAt) >= thisMonth);
    const wonLeads = allLeads.filter((l) => l.status === "won");
    const newLeads = allLeads.filter((l) => l.status === "new");
    const contactedLeads = allLeads.filter((l) => l.status === "contacted");
    const lostLeads = allLeads.filter((l) => l.status === "lost");
    const avgJobValue = 2500;
    const estRevenue = wonLeads.length * avgJobValue;
    const winRate = allLeads.length > 0 ? Math.round((wonLeads.length / (wonLeads.length + lostLeads.length || 1)) * 100) : 0;
    const coldLeads = newLeads.filter((l) => {
      const days = (Date.now() - new Date(l.createdAt).getTime()) / 86400000;
      return days > 2;
    });

    const today = new Date().toISOString().split("T")[0];
    const todayAppts = await db.select().from(appointment)
      .where(and(eq(appointment.businessId, businessId), eq(appointment.date, today), eq(appointment.status, "scheduled")));
    const recentConvs = await db.select().from(conversation)
      .where(eq(conversation.businessId, businessId)).orderBy(desc(conversation.createdAt)).limit(5);

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
• Total Leads: ${allLeads.length} | This Month: ${monthlyLeads.length}
• Won/Closed: ${wonLeads.length} ($${estRevenue.toLocaleString()} at $${avgJobValue.toLocaleString()}/job)
• In Progress: ${contactedLeads.length} | New (not contacted): ${newLeads.length}
• ⚠️ Cold (2+ days): ${coldLeads.length} | Lost: ${lostLeads.length}
• Win Rate: ${winRate}% | Today's Appointments: ${todayAppts.length}
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
5. ANALYZE — Win rates, conversion patterns, revenue projections
6. CELEBRATE — Revenue milestones, time saved vs hiring staff

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
