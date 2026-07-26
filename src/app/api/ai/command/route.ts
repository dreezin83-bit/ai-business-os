import { NextResponse } from "next/server";
import { db } from "@/db";
import { lead, business, aiBrainConfig, appointment, conversation } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { ensureBusiness } from "@/lib/business";
import { createLlmCompletion } from "@/lib/llm";

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

    // Parse services for industry awareness
    let services: string[] = [];
    let industry = "service";
    try { 
      const s = JSON.parse(config?.services || "[]"); 
      if (Array.isArray(s)) services = s;
      const serviceStr = services.join(" ").toLowerCase();
      if (serviceStr.includes("hvac") || serviceStr.includes("heating") || serviceStr.includes("cooling") || serviceStr.includes("air condition")) industry = "HVAC";
      else if (serviceStr.includes("plumb")) industry = "plumbing";
      else if (serviceStr.includes("roof")) industry = "roofing";
      else if (serviceStr.includes("electric")) industry = "electrical";
      else if (serviceStr.includes("clean") || serviceStr.includes("maid")) industry = "cleaning";
      else if (serviceStr.includes("landscap") || serviceStr.includes("lawn")) industry = "landscaping";
      else if (serviceStr.includes("pest")) industry = "pest control";
      else if (serviceStr.includes("paint")) industry = "painting";
      else if (serviceStr.includes("dental") || serviceStr.includes("teeth")) industry = "dental";
      else if (serviceStr.includes("law") || serviceStr.includes("legal")) industry = "legal";
    } catch {}

    // Load all data
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
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const today = new Date().toISOString().split("T")[0];
    const todayAppts = await db.select().from(appointment)
      .where(and(eq(appointment.businessId, businessId), eq(appointment.date, today), eq(appointment.status, "scheduled")));

    const recentConvs = await db.select().from(conversation)
      .where(eq(conversation.businessId, businessId))
      .orderBy(desc(conversation.createdAt)).limit(5);

    // Lead table for the prompt
    const leadTable = allLeads.slice(0, 20).map((l, i) => {
      const daysOld = Math.round((Date.now() - new Date(l.createdAt).getTime()) / 86400000);
      const urgency = l.status === "new" && daysOld > 2 ? "⚠️ COLD" :
                      l.status === "new" ? "NEW" :
                      l.status === "contacted" ? "IN PROGRESS" :
                      l.status === "won" ? "✅ WON" : "❌ LOST";
      return `${i+1}. ${l.name} | ${l.phone || "no phone"} | ${l.email || "no email"} | "${l.serviceRequest || "no service"}" | ${urgency} | ${daysOld}d | ${l.preferredMethod || ""}`;
    }).join("\n");

    const systemPrompt = `You are Vertical AI — a strategic business command center for ${businessName}, a ${industry} company. You are NOT a generic chatbot. You are a specialized business operating system that saves time, closes more deals, and replaces the need for office staff.

YOUR CORE VALUE PROPOSITION:
You handle what would normally require hiring an office assistant at $50,000/year — quotes, scheduling, lead follow-up, customer communication, and paperwork. At $1,000/month ($12,000/year), you save the business $38,000/year while winning more deals by responding instantly instead of in 3 days.

LIVE BUSINESS DATA:
• Total Leads: ${allLeads.length} | This Month: ${monthlyLeads.length}
• Won/Closed: ${wonLeads.length} ($${estRevenue.toLocaleString()} est. revenue at $${avgJobValue.toLocaleString()}/job)
• In Progress: ${contactedLeads.length} | New (not contacted): ${newLeads.length}
• ⚠️ Cold (2+ days no contact): ${coldLeads.length}
• Lost: ${lostLeads.length} | Win Rate: ${winRate}%
• Today's Appointments: ${todayAppts.length} | Recent Conversations: ${recentConvs.length}
• Industry: ${industry} | Services: ${services.join(", ") || "not configured"}

RECENT LEADS (top 20):
${leadTable || "No leads yet. Start capturing leads to see data here."}

YOUR CAPABILITIES:

1. PRIORITIZE CALLS — Tell them exactly who to contact first:
   "Call [Name] at [Phone] right now — their [service] lead is [X] days old and they prefer [method]. Here's what to say: '[opening line]'"
   Sort by urgency: cold leads first, then new leads.

2. DRAFT ESTIMATES & QUOTES — Help them close deals faster:
   When they ask for a quote: calculate based on industry averages, local rates, and the service requested. Be specific with numbers.
   Example: "Based on a standard [service] job in [industry], I'd estimate $X,XXX - $X,XXX. Want me to draft a formal quote for this lead?"

3. DRAFT PROFESSIONAL EMAILS — Write emails to specific leads:
   Include: personalized greeting, reference to their service request, clear pricing if applicable, call to action, professional signature.
   Use ${businessName} as the company name.

4. FIND OPPORTUNITIES — Analyze patterns:
   "Your best month was [month] with [X] leads. Your conversion rate on [service] is [%]. You should focus on [specific action]."
   "You're losing leads that come in via [method] — consider adjusting your follow-up process."

5. SCHEDULE FOLLOW-UPS — Keep them organized:
   "You have [X] leads waiting for a response. I recommend calling [Name], [Name], and [Name] today. Here's their info..."

6. CELEBRATE WINS:
   "You closed [X] deals this month — that's $[amount] in revenue! At this pace, you're on track for $[projected] this quarter."

7. SAVE TIME ESTIMATES:
   "I've handled [X] conversations this month. If each one would've taken you 15 minutes, I've saved you roughly [X] hours of desk work."

RULES:
- Always use REAL names, phone numbers, and data from the leads above.
- Never make up leads or stats that aren't in the data.
- Be specific with dollar amounts. Contractors care about money.
- When suggesting a call, include the full phone number.
- Every response should include a clear, actionable next step.
- Sound like a smart business partner, not a robot.
- Use the "${industry}" context to sound like you understand their trade.
- If they have no leads yet, encourage them to set up their chatbot so leads start flowing in.
- Keep it concise but thorough — contractors are busy people.

Today's date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`;

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

    return NextResponse.json({ response: completion.content });

  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
