/**
 * Vapi REST API Client
 *
 * Typed client for the Vapi Phone Numbers, Assistants, and Calls APIs.
 * Docs: https://docs.vapi.ai/api-reference
 *
 * Required env: VAPI_API_KEY
 */

const VAPI_BASE = "https://api.vapi.ai";

export interface VapiPhoneNumber {
  id: string;
  name: string;
  number: string;
  provider: "twilio" | "vonage" | "vapi";
  assistantId?: string;
  serverUrl?: string;
  serverUrlSecret?: string;
  createdAt: string;
}

export interface VapiAvailableNumber {
  number: string;
  provider: string;
  locality?: string;
  region?: string;
  country?: string;
}

export interface VapiAssistant {
  id: string;
  name: string;
  model: {
    provider: string;
    model: string;
    messages: Array<{ role: string; content: string }>;
  };
  firstMessage: string;
  voice?: { provider: string; voiceId: string };
  serverUrl?: string;
  serverUrlSecret?: string;
  recordingEnabled?: boolean;
  endCallPhrases?: string[];
}

export interface VapiCall {
  id: string;
  assistantId?: string;
  phoneNumberId?: string;
  type: "inbound" | "outbound";
  status: "queued" | "ringing" | "in-progress" | "ended";
  startedAt?: string;
  endedAt?: string;
  cost?: number;
  summary?: string;
  recordingUrl?: string;
}

export interface CreatePhoneNumberInput {
  number?: string;
  name?: string;
  serverUrl?: string;
  serverUrlSecret?: string;
}

export interface UpdatePhoneNumberInput {
  name?: string;
  serverUrl?: string;
  serverUrlSecret?: string;
  assistantId?: string;
}

export interface ListAvailableNumbersInput {
  areaCode?: string;
  limit?: number;
}

export interface BuyPhoneNumberInput {
  areaCode?: string;
  number?: string;
  provider?: "twilio" | "vonage" | "vapi";
}

export interface CreateAssistantInput {
  name: string;
  firstMessage: string;
  systemPrompt: string;
  voiceProvider?: string;
  voiceId?: string;
  serverUrl?: string;
  serverUrlSecret?: string;
  modelProvider?: string;
  modelName?: string;
}

// ─── Internal fetch ─────────────────────────────────────────────

async function vapiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = process.env.VAPI_API_KEY;
  if (!apiKey) {
    throw new Error("VAPI_API_KEY is not configured");
  }

  const res = await fetch(`${VAPI_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Vapi API ${res.status} ${path}: ${body.substring(0, 300)}`
    );
  }

  return res.json();
}

// ─── Phone Numbers ──────────────────────────────────────────────

/**
 * Assign a phone number to your account with a specific server URL.
 * The `number` is the full E.164 number you want to use.
 */
export async function createPhoneNumber(
  input: CreatePhoneNumberInput
): Promise<VapiPhoneNumber> {
  console.log("[Vapi] Creating phone number:", input.number || "(auto)");
  return vapiFetch<VapiPhoneNumber>("/phone-number", {
    method: "POST",
    body: JSON.stringify({
      name: input.name || input.number || "Sagenify AI Number",
      number: input.number,
      ...(input.serverUrl ? { serverUrl: input.serverUrl } : {}),
      ...(input.serverUrlSecret
        ? { serverUrlSecret: input.serverUrlSecret }
        : {}),
    }),
  });
}

/** List all phone numbers on your account */
export async function listPhoneNumbers(): Promise<VapiPhoneNumber[]> {
  return vapiFetch<VapiPhoneNumber[]>("/phone-number");
}

/** Update a phone number's name, serverUrl, or assistant assignment */
export async function updatePhoneNumber(
  id: string,
  input: UpdatePhoneNumberInput
): Promise<VapiPhoneNumber> {
  console.log(`[Vapi] Updating phone number ${id}`);
  return vapiFetch<VapiPhoneNumber>(`/phone-number/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** Release/delete a phone number */
export async function deletePhoneNumber(id: string): Promise<void> {
  await vapiFetch(`/phone-number/${id}`, { method: "DELETE" });
  console.log(`[Vapi] Deleted phone number: ${id}`);
}

/** List available numbers for purchase (by areaCode) */
export async function listAvailableNumbers(
  input?: ListAvailableNumbersInput
): Promise<VapiAvailableNumber[]> {
  const params = new URLSearchParams();
  if (input?.areaCode) params.set("areaCode", input.areaCode);
  if (input?.limit) params.set("limit", String(input.limit));
  const qs = params.toString();
  return vapiFetch<VapiAvailableNumber[]>(`/available-numbers${qs ? "?" + qs : ""}`);
}

/** Purchase a phone number from Vapi's pool */
export async function buyPhoneNumber(
  input: BuyPhoneNumberInput = {}
): Promise<VapiPhoneNumber> {
  const body: Record<string, unknown> = {
    provider: input.provider || "twilio",
  };
  if (input.areaCode) body.areaCode = input.areaCode;
  if (input.number) body.number = input.number;

  console.log("[Vapi] Buying phone number:", JSON.stringify(body));
  return vapiFetch<VapiPhoneNumber>("/phone-number/buy", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ─── Assistants ─────────────────────────────────────────────────

/** Create a new Vapi assistant */
export async function createAssistant(
  input: CreateAssistantInput
): Promise<VapiAssistant> {
  const body = {
    name: input.name,
    firstMessage: input.firstMessage,
    model: {
      provider: input.modelProvider || "openai",
      model: input.modelName || "gpt-4o",
      messages: [{ role: "system", content: input.systemPrompt }],
    },
    voice: {
      provider: input.voiceProvider || "11labs",
      voiceId: input.voiceId || "21m00Tcm4TlvDq8ikWAM",
    },
    ...(input.serverUrl ? { serverUrl: input.serverUrl } : {}),
    ...(input.serverUrlSecret
      ? { serverUrlSecret: input.serverUrlSecret }
      : {}),
    recordingEnabled: true,
    endCallPhrases: ["goodbye", "bye bye", "have a great day", "take care"],
  };

  console.log(`[Vapi] Creating assistant: ${input.name}`);
  return vapiFetch<VapiAssistant>("/assistant", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Update an existing assistant */
export async function updateAssistant(
  assistantId: string,
  updates: Partial<CreateAssistantInput>
): Promise<VapiAssistant> {
  const body: Record<string, unknown> = {};
  if (updates.name) body.name = updates.name;
  if (updates.firstMessage) body.firstMessage = updates.firstMessage;
  if (updates.serverUrl) body.serverUrl = updates.serverUrl;
  if (updates.systemPrompt) {
    body.model = {
      provider: updates.modelProvider || "openai",
      model: updates.modelName || "gpt-4o",
      messages: [{ role: "system", content: updates.systemPrompt }],
    };
  }
  if (updates.voiceProvider || updates.voiceId) {
    body.voice = {
      provider: updates.voiceProvider || "11labs",
      voiceId: updates.voiceId || "21m00Tcm4TlvDq8ikWAM",
    };
  }

  return vapiFetch<VapiAssistant>(`/assistant/${assistantId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/** Delete an assistant */
export async function deleteAssistant(id: string): Promise<void> {
  await vapiFetch(`/assistant/${id}`, { method: "DELETE" });
  console.log(`[Vapi] Deleted assistant: ${id}`);
}

/** Get an assistant by ID */
export async function getAssistant(id: string): Promise<VapiAssistant> {
  return vapiFetch<VapiAssistant>(`/assistant/${id}`);
}

// ─── Calls ──────────────────────────────────────────────────────

/** List recent calls */
export async function getCalls(limit = 50): Promise<VapiCall[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  return vapiFetch<VapiCall[]>(`/call?${params.toString()}`);
}
