import { pgTable, text, timestamp, uuid, varchar, boolean, jsonb, integer, decimal, foreignKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================
// BUSINESS (Tenant)
// ============================================================
export const businesses = pgTable("businesses", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  logo: text("logo"),
  website: text("website"),
  industry: varchar("industry", { length: 100 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  timezone: varchar("timezone", { length: 100 }).default("UTC"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status", { length: 50 }).default("inactive"),
  subscriptionTier: varchar("subscription_tier", { length: 50 }).default("starter"),
  settings: jsonb("settings").$type<Record<string, unknown>>().default({}),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// USERS (Platform-wide, linked to Clerk)
// ============================================================
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: varchar("clerk_id", { length: 255 }).notNull().unique(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  avatarUrl: text("avatar_url"),
  role: varchar("role", { length: 50 }).notNull().default("staff"), // super_admin, client_owner, staff
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// CUSTOMERS
// ============================================================
export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  notes: text("notes"),
  tags: text("tags").array(),
  source: varchar("source", { length: 100 }),
  customFields: jsonb("custom_fields").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// LEADS
// ============================================================
export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  source: varchar("source", { length: 100 }),
  status: varchar("status", { length: 50 }).notNull().default("new"), // new, contacted, qualified, converted, lost
  notes: text("notes"),
  score: integer("score").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// APPOINTMENTS
// ============================================================
export const appointments = pgTable("appointments", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("scheduled"), // scheduled, confirmed, completed, cancelled, no_show
  location: text("location"),
  type: varchar("type", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// CONVERSATIONS
// ============================================================
export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
  channel: varchar("channel", { length: 50 }).notNull(), // web_chat, sms, email, phone
  status: varchar("status", { length: 50 }).notNull().default("active"), // active, resolved, archived
  subject: varchar("subject", { length: 255 }),
  aiHandled: boolean("ai_handled").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// MESSAGES
// ============================================================
export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 50 }).notNull(), // user, assistant, system, agent
  content: text("content").notNull(),
  channel: varchar("channel", { length: 50 }), // web_chat, sms, email
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================
// KNOWLEDGE BASE
// ============================================================
export const knowledgeBase = pgTable("knowledge_base", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 100 }),
  tags: text("tags").array(),
  embedding: text("embedding"), // Store vector as text for now
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// DOCUMENTS (Uploads)
// ============================================================
export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  url: text("url").notNull(),
  fileType: varchar("file_type", { length: 50 }),
  fileSize: integer("file_size"),
  category: varchar("category", { length: 100 }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// AI SETTINGS
// ============================================================
export const aiSettings = pgTable("ai_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().unique().references(() => businesses.id, { onDelete: "cascade" }),
  model: varchar("model", { length: 100 }).default("gpt-4o"),
  temperature: decimal("temperature", { precision: 3, scale: 2 }).default("0.7"),
  maxTokens: integer("max_tokens").default(2048),
  systemPrompt: text("system_prompt").default("You are a helpful AI assistant for a service business."),
  fallbackToHuman: boolean("fallback_to_human").default(true),
  enabledChannels: text("enabled_channels").array().default(["web_chat"]),
  greetingMessage: text("greeting_message").default("Hello! How can I help you today?"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// CHATBOT SETTINGS
// ============================================================
export const chatbotSettings = pgTable("chatbot_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().unique().references(() => businesses.id, { onDelete: "cascade" }),
  isEnabled: boolean("is_enabled").default(false),
  widgetColor: varchar("widget_color", { length: 50 }).default("#3B82F6"),
  widgetPosition: varchar("widget_position", { length: 20 }).default("right"),
  widgetTitle: varchar("widget_title", { length: 100 }).default("Chat with us"),
  widgetSubtitle: varchar("widget_subtitle", { length: 200 }).default("We typically reply within minutes"),
  showBranding: boolean("show_branding").default(true),
  embedCode: text("embed_code"),
  domains: text("domains").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// EMAIL CAMPAIGNS
// ============================================================
export const emailCampaigns = pgTable("email_campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  content: text("content").notNull(),
  status: varchar("status", { length: 50 }).default("draft"), // draft, scheduled, sending, sent, paused
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  stats: jsonb("stats").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// SMS CAMPAIGNS
// ============================================================
export const smsCampaigns = pgTable("sms_campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  content: text("content").notNull(),
  status: varchar("status", { length: 50 }).default("draft"),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  stats: jsonb("stats").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// SUBSCRIPTIONS
// ============================================================
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePriceId: text("stripe_price_id"),
  tier: varchar("tier", { length: 50 }).notNull().default("starter"),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  seats: integer("seats").default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// AUDIT LOGS
// ============================================================
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }).notNull(),
  entityId: varchar("entity_id", { length: 255 }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  ipAddress: varchar("ip_address", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================
// INTEGRATIONS
// ============================================================
export const integrations = pgTable("integrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 100 }).notNull(), // stripe, google_calendar, zapier, etc.
  isEnabled: boolean("is_enabled").default(false),
  config: jsonb("config").$type<Record<string, unknown>>().default({}),
  credentials: jsonb("credentials").$type<Record<string, unknown>>().default({}),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// NOTIFICATIONS
// ============================================================
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  link: text("link"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================
// REPORTS
// ============================================================
export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(), // leads, appointments, revenue, etc.
  config: jsonb("config").$type<Record<string, unknown>>().default({}),
  data: jsonb("data").$type<Record<string, unknown>>().default({}),
  period: varchar("period", { length: 50 }), // daily, weekly, monthly, custom
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// RELATIONS
// ============================================================
export const businessesRelations = relations(businesses, ({ many }) => ({
  users: many(users),
  customers: many(customers),
  leads: many(leads),
  appointments: many(appointments),
  conversations: many(conversations),
  messages: many(messages),
  knowledgeBase: many(knowledgeBase),
  documents: many(documents),
  aiSettings: many(aiSettings),
  chatbotSettings: many(chatbotSettings),
  emailCampaigns: many(emailCampaigns),
  smsCampaigns: many(smsCampaigns),
  subscriptions: many(subscriptions),
  auditLogs: many(auditLogs),
  integrations: many(integrations),
  notifications: many(notifications),
  reports: many(reports),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  business: one(businesses, { fields: [users.businessId], references: [businesses.id] }),
  notifications: many(notifications),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  business: one(businesses, { fields: [customers.businessId], references: [businesses.id] }),
  leads: many(leads),
  appointments: many(appointments),
  conversations: many(conversations),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  business: one(businesses, { fields: [leads.businessId], references: [businesses.id] }),
  customer: one(customers, { fields: [leads.customerId], references: [customers.id] }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  business: one(businesses, { fields: [appointments.businessId], references: [businesses.id] }),
  customer: one(customers, { fields: [appointments.customerId], references: [customers.id] }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  business: one(businesses, { fields: [conversations.businessId], references: [businesses.id] }),
  customer: one(customers, { fields: [conversations.customerId], references: [customers.id] }),
  lead: one(leads, { fields: [conversations.leadId], references: [leads.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  business: one(businesses, { fields: [messages.businessId], references: [businesses.id] }),
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
}));