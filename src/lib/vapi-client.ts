/**
 * Vapi REST API Client
 *
 * Thin wrapper around Vapi's Phone Numbers and Assistants APIs.
 * Docs: https://docs.vapi.ai/api-reference
 *
 * Required env: VAPI_API_KEY
 */

const VAPI_BASE = "https://api.vapi.ai";

interface VapiPhoneNumber {
  id: string;
  name: string;
  number: string;
  provider: "twilio" | "vonage" | "vapi";
  assistantId?: string;
  createdAt: string;
}

interface VapiAssistant {
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

interface BuyPhoneNumberOptions {
  areaCode?: string;
  provider?: "twilio" | "vonage" | "vapi";
}

interface CreateAssistantOptions {
  name: string;
  firstMessage: string;
  systemPrompt: string;
  voiceProvider?: string;
  voiceId?: string;
  serverUrl: string;
  serverUrlSecret?: string;
  modelProvider?: string;
  modelName?: string;
}

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
      `Vapi API error ${res.status}: ${body.substring(0, 300)}`
    );
  }

  return res.json();
}

/** Purchase a new phone number */
export async function buyPhoneNumber(
  options: BuyPhoneNumberOptions = {}
): Promise<VapiPhoneNumber> {
  const body: Record<string, unknown> = {
    provider: options.provider || "twilio",
  };
  if (options.areaCode) body.areaCode = options.areaCode;

  console.log("[Vapi] Buying phone number:", JSON.stringify(body));
  const result = await vapiFetch<VapiPhoneNumber>("/phone-number", {
    method: "POST",
    body: JSON.stringify(body),
  });
  console.log(`[Vapi] Purchased: ${result.number} (${result.id})`);
  return result;
}

/** List purchased phone numbers */
export async function listPhoneNumbers(): Promise<VapiPhoneNumber[]> {
  return vapiFetch<VapiPhoneNumber[]>("/phone-number");
}

/** Delete a phone number */
export async function deletePhoneNumber(id: string): Promise<void> {
  await vapiFetch(`/phone-number/${id}`, { method: "DELETE" });
  console.log(`[Vapi] Deleted phone number: ${id}`);
}

/** Assign an assistant to a phone number */
export async function assignAssistantToNumber(
  phoneNumberId: string,
  assistantId: string
): Promise<void> {
  await vapiFetch(`/phone-number/${phoneNumberId}`, {
    method: "PATCH",
    body: JSON.stringify({ assistantId }),
  });
  console.log(
    `[Vapi] Assigned assistant ${assistantId} to number ${phoneNumberId}`
  );
}

/** Create a new assistant */
export async function createAssistant(
  options: CreateAssistantOptions
): Promise<VapiAssistant> {
  const body = {
    name: options.name,
    firstMessage: options.firstMessage,
    model: {
      provider: options.modelProvider || "openai",
      model: options.modelName || "gpt-4o",
      messages: [{ role: "system", content: options.systemPrompt }],
    },
    voice: {
      provider: options.voiceProvider || "11labs",
      voiceId: options.voiceId || "21m00Tcm4TlvDq8ikWAM",
    },
    serverUrl: options.serverUrl,
    serverUrlSecret: options.serverUrlSecret || "",
    recordingEnabled: true,
    endCallPhrases: ["goodbye", "bye bye", "have a great day", "take care"],
  };

  console.log(`[Vapi] Creating assistant: ${options.name}`);
  const result = await vapiFetch<VapiAssistant>("/assistant", {
    method: "POST",
    body: JSON.stringify(body),
  });
  console.log(`[Vapi] Created assistant: ${result.id}`);
  return result;
}

/** Update an existing assistant */
export async function updateAssistant(
  assistantId: string,
  updates: Partial<CreateAssistantOptions>
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

  console.log(`[Vapi] Updating assistant: ${assistantId}`);
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
