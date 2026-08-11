import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  json,
} from "drizzle-orm/pg-core";

export const business = pgTable("business", {
  id: text("id").primaryKey(),
  name: text("name").notNull().default(""),
  ownerId: text("owner_id").notNull(),
  phone: text("phone").default(""),
  email: text("email").default(""),
  website: text("website").default(""),
  address: text("address").default(""),
  vapiWebhookToken: text("vapi_webhook_token").unique(),
  vapiAssistantId: text("vapi_assistant_id"),
  voiceSetupReady: boolean("voice_setup_ready").default(false),
  voiceProvisionState: text("voice_provision_state").default("idle"), // idle | provisioning | completed | failed
  voiceProvisionError: text("voice_provision_error"),
  voiceProvisionedAt: timestamp("voice_provisioned_at"),
  category: text("category").default(""),
  onboardingComplete: boolean("onboarding_complete").default(false),
  status: text("status").default("active"), // active | suspended
  suspendedAt: timestamp("suspended_at"),
  lastCallAt: timestamp("last_call_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const aiBrainConfig = pgTable("ai_brain_config", {
  id: text("id").primaryKey(),
  businessId: text("business_id")
    .notNull()
    .references(() => business.id, { onDelete: "cascade" }),
  systemPrompt: text("system_prompt").default(""),
  businessInfo: text("business_info").default(""),
  services: text("services").default("[]"),
  faqs: text("faqs").default("[]"),
  pricingGuidance: text("pricing_guidance").default(""),
  companyPolicies: text("company_policies").default(""),
  serviceAreas: text("service_areas").default("[]"),
  businessHours: text("business_hours").default("{}"),
  greetingMessage: text("greeting_message").default("Hello! How can I help you today?"),
  leadCollectionRules: text("lead_collection_rules").default(""),
  appointmentBookingRules: text("appointment_booking_rules").default(""),
  responseStyle: text("response_style").default(""),
  escalationRules: text("escalation_rules").default(""),
  replyTemplates: text("reply_templates").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const knowledgeDocument = pgTable("knowledge_document", {
  id: text("id").primaryKey(),
  businessId: text("business_id")
    .notNull()
    .references(() => business.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: text("type").notNull().default("txt"),
  content: text("content").default(""),
  fileUrl: text("file_url").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const lead = pgTable("lead", {
  id: text("id").primaryKey(),
  businessId: text("business_id")
    .notNull()
    .references(() => business.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone").default(""),
  email: text("email").default(""),
  serviceRequest: text("service_request").default(""),
  source: text("source").default("manual"),
  status: text("status").notNull().default("new"),
  notes: text("notes").default(""),
  preferredMethod: text("preferred_method").default(""),
  contactValue: text("contact_value").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const communicationSettings = pgTable("communication_settings", {
  id: text("id").primaryKey(),
  businessId: text("business_id")
    .notNull()
    .references(() => business.id, { onDelete: "cascade" }),
  emailEnabled: boolean("email_enabled").notNull().default(true),
  whatsappEnabled: boolean("whatsapp_enabled").notNull().default(false),
  smsEnabled: boolean("sms_enabled").notNull().default(true),
  primaryMethod: text("primary_method").notNull().default("email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const conversation = pgTable("conversation", {
  id: text("id").primaryKey(),
  businessId: text("business_id")
    .notNull()
    .references(() => business.id, { onDelete: "cascade" }),
  leadId: text("lead_id").references(() => lead.id, { onDelete: "set null" }),
  customerName: text("customer_name").default(""),
  customerPhone: text("customer_phone").default(""),
  customerEmail: text("customer_email").default(""),
  source: text("source").default("chatbot"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const message = pgTable("message", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversation.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const appointment = pgTable("appointment", {
  id: text("id").primaryKey(),
  businessId: text("business_id")
    .notNull()
    .references(() => business.id, { onDelete: "cascade" }),
  leadId: text("lead_id").references(() => lead.id, { onDelete: "set null" }),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").default(""),
  customerEmail: text("customer_email").default(""),
  service: text("service").notNull(),
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  status: text("status").notNull().default("scheduled"),
  googleEventId: text("google_event_id").default(""),
  notes: text("notes").default(""),
  cancelReason: text("cancel_reason").default(""),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const automationRule = pgTable("automation_rule", {
  id: text("id").primaryKey(),
  businessId: text("business_id")
    .notNull()
    .references(() => business.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  delayMinutes: integer("delay_minutes").notNull().default(0),
  messageTemplate: text("message_template").notNull(),
  channel: text("channel").notNull().default("sms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const missedCall = pgTable("missed_call", {
  id: text("id").primaryKey(),
  businessId: text("business_id")
    .notNull()
    .references(() => business.id, { onDelete: "cascade" }),
  callerNumber: text("caller_number").notNull(),
  callerName: text("caller_name").default(""),
  calledAt: timestamp("called_at").defaultNow().notNull(),
  handled: boolean("handled").notNull().default(false),
  leadId: text("lead_id").references(() => lead.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const communicationLog = pgTable("communication_log", {
  id: text("id").primaryKey(),
  businessId: text("business_id")
    .notNull()
    .references(() => business.id, { onDelete: "cascade" }),
  leadId: text("lead_id").references(() => lead.id, { onDelete: "set null" }),
  type: text("type").notNull(), // email, sms, whatsapp
  toAddress: text("to_address").notNull(),
  subject: text("subject").default(""),
  body: text("body").notNull(),
  status: text("status").notNull().default("sent"), // sent, delivered, failed, bounced
  errorMessage: text("error_message").default(""),
  externalId: text("external_id").default(""),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const phoneNumber = pgTable("phone_number", {
  id: text("id").primaryKey(),
  businessId: text("business_id")
    .notNull()
    .references(() => business.id, { onDelete: "cascade" }),
  vapiPhoneNumberId: text("vapi_phone_number_id").notNull(),
  number: text("number").notNull(),
  serverUrl: text("server_url"),
  provider: text("provider").default("vapi"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Subscription ────────────────────────────────────────
export const subscription = pgTable("subscription", {
  id: text("id").primaryKey(),
  businessId: text("business_id")
    .notNull()
    .references(() => business.id, { onDelete: "cascade" }),
  plan: text("plan").default("starter"),
  status: text("status").default("active"),
  amount: integer("amount").default(0),
  currency: text("currency").default("usd"),
  interval: text("interval").default("month"),
  flutterwaveSubId: text("flutterwave_sub_id"),
  paystackSubId: text("paystack_sub_id"),
  paymentProvider: text("payment_provider").default("paystack"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  canceledAt: timestamp("canceled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Usage tracking ──────────────────────────────────────
export const usageAiCall = pgTable("usage_ai_call", {
  id: text("id").primaryKey(),
  businessId: text("business_id")
    .notNull()
    .references(() => business.id, { onDelete: "cascade" }),
  tokensIn: integer("tokens_in").default(0),
  tokensOut: integer("tokens_out").default(0),
  model: text("model").default("gpt-4o-mini"),
  source: text("source").default("chat"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Billing / provisioning status timeline ──────────────
export const statusTimeline = pgTable("status_timeline", {
  id: text("id").primaryKey(),
  businessId: text("business_id")
    .notNull()
    .references(() => business.id, { onDelete: "cascade" }),
  scope: text("scope").notNull().default("billing"), // billing | provisioning
  event: text("event").notNull(),
  detail: text("detail").default(""),
  status: text("status").notNull().default("info"), // success | pending | failed | info
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── AI voice call history ───────────────────────────────
export const aiCall = pgTable("ai_call", {
  id: text("id").primaryKey(),
  businessId: text("business_id")
    .notNull()
    .references(() => business.id, { onDelete: "cascade" }),
  callId: text("call_id").notNull().unique(),
  customerPhone: text("customer_phone").default(""),
  customerName: text("customer_name").default(""),
  status: text("status").notNull().default("ended"), // queued | ringing | in-progress | ended
  endedReason: text("ended_reason").default(""),
  summary: text("summary").default(""),
  outcome: text("outcome").notNull().default("unknown"), // lead_created | appointment_booked | no_action | unknown
  recordingUrl: text("recording_url").default(""),
  durationSeconds: integer("duration_seconds").default(0),
  messageCount: integer("message_count").default(0),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Human handoff / escalation inbox ────────────────────
export const handoff = pgTable("handoff", {
  id: text("id").primaryKey(),
  businessId: text("business_id")
    .notNull()
    .references(() => business.id, { onDelete: "cascade" }),
  leadId: text("lead_id").references(() => lead.id, { onDelete: "set null" }),
  conversationId: text("conversation_id").references(() => conversation.id, { onDelete: "set null" }),
  customerName: text("customer_name").default(""),
  customerPhone: text("customer_phone").default(""),
  customerEmail: text("customer_email").default(""),
  reason: text("reason").default(""),
  summary: text("summary").default(""),
  assignedTo: text("assigned_to").default(""),
  status: text("status").notNull().default("pending"), // pending | assigned | resolved
  priority: text("priority").notNull().default("normal"), // normal | high
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});