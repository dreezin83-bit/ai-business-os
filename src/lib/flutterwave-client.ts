/**
 * Flutterwave API Client
 *
 * Typed wrapper for Flutterwave payments, subscriptions, and transaction verification.
 * Docs: https://developer.flutterwave.com/reference
 *
 * Required env vars:
 *   FLUTTERWAVE_SECRET_KEY  — your Flutterwave secret key
 *   FLUTTERWAVE_PUBLIC_KEY  — your Flutterwave public key
 */

const FW_BASE = "https://api.flutterwave.com/v3";

export interface FlutterwavePaymentInput {
  tx_ref: string;           // unique transaction reference
  amount: number;            // amount in the smallest currency unit (e.g., cents)
  currency?: string;         // default: "USD"
  redirect_url?: string;     // where to redirect after payment
  customer: {
    email: string;
    name?: string;
    phone_number?: string;
  };
  meta?: Record<string, unknown>;  // custom metadata (businessId, etc.)
  payment_options?: string;  // "card,ussd,account,mpesa,barter"
}

export interface FlutterwavePaymentResponse {
  status: string;
  message: string;
  data: {
    link: string;  // payment link to redirect user to
  };
}

export interface FlutterwaveVerifyResponse {
  status: string;
  message: string;
  data: {
    id: number;
    tx_ref: string;
    amount: number;
    currency: string;
    status: string;
    customer: {
      email: string;
      name?: string;
      phone_number?: string;
    };
    meta?: Record<string, unknown>;
    created_at: string;
  };
}

export interface CreateSubscriptionInput {
  tx_ref: string;
  amount: number;
  currency?: string;
  payment_type: string;      // e.g., "card"
  customer: string;          // customer email
  plan: number;              // Flutterwave plan ID
  meta?: Record<string, unknown>;
}

export interface CancelSubscriptionInput {
  id: number;                // subscription ID
}

export interface FlutterwaveTransaction {
  id: number;
  tx_ref: string;
  amount: number;
  currency: string;
  status: string;
  customer: {
    email: string;
    name?: string;
  };
  meta?: Record<string, unknown>;
  created_at: string;
}

// ─── Internal fetch ─────────────────────────────────────────────

async function fwFetch<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown
): Promise<T> {
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("FLUTTERWAVE_SECRET_KEY is not configured");
  }

  const res = await fetch(`${FW_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const json = await res.json();

  if (!res.ok || json.status === "error") {
    throw new Error(
      `Flutterwave API ${res.status} ${path}: ${json.message || JSON.stringify(json).substring(0, 300)}`
    );
  }

  return json as T;
}

// ─── Payments ───────────────────────────────────────────────────

/** Initialize a payment and get back a payment link */
export async function initializePayment(
  input: FlutterwavePaymentInput
): Promise<string> {
  const res = await fwFetch<FlutterwavePaymentResponse>(
    "POST",
    "/payments",
    {
      tx_ref: input.tx_ref,
      amount: input.amount,
      currency: input.currency || "USD",
      redirect_url: input.redirect_url || "",
      customer: input.customer,
      meta: input.meta,
      payment_options: input.payment_options || "card",
    }
  );
  return res.data.link;
}

/** Verify the status of a transaction by transaction reference */
export async function verifyTransaction(
  txRef: string
): Promise<FlutterwaveVerifyResponse> {
  return fwFetch<FlutterwaveVerifyResponse>(
    "GET",
    `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`
  );
}

/** Get a single transaction by ID */
export async function getTransaction(
  id: number
): Promise<{ data: FlutterwaveTransaction }> {
  return fwFetch<{ data: FlutterwaveTransaction }>(
    "GET",
    `/transactions/${id}`
  );
}

/** List recent transactions */
export async function listTransactions(
  options?: {
    from?: string;
    to?: string;
    status?: string;
  }
): Promise<{ data: FlutterwaveTransaction[] }> {
  const params = new URLSearchParams();
  if (options?.from) params.set("from", options.from);
  if (options?.to) params.set("to", options.to);
  if (options?.status) params.set("status", options.status);
  const qs = params.toString();
  return fwFetch<{ data: FlutterwaveTransaction[] }>(
    "GET",
    `/transactions${qs ? "?" + qs : ""}`
  );
}

// ─── Subscriptions ──────────────────────────────────────────────

/** Create a recurring subscription for a customer */
export async function createSubscription(
  input: CreateSubscriptionInput
): Promise<{
  status: string;
  data: { id: number; plan: number; customer: { email: string } };
}> {
  return fwFetch("POST", "/subscriptions", input);
}

/** Cancel an existing subscription */
export async function cancelSubscription(
  id: number
): Promise<{ status: string; message: string }> {
  return fwFetch("PUT", `/subscriptions/${id}/cancel`);
}

/** Get all subscriptions */
export async function listSubscriptions(): Promise<{
  status: string;
  data: Array<{ id: number; plan: number; customer: { email: string }; status: string }>;
}> {
  return fwFetch("GET", "/subscriptions");
}

// ─── Plans ──────────────────────────────────────────────────────

/** Create a payment plan for subscriptions */
export async function createPlan(input: {
  name: string;
  amount: number;
  interval: "daily" | "weekly" | "monthly" | "yearly";
  currency?: string;
}): Promise<{ status: string; data: { id: number; name: string } }> {
  return fwFetch("POST", "/payment-plans", {
    ...input,
    currency: input.currency || "USD",
  });
}
