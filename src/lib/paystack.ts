/**
 * Paystack utilities — Plan management, subscription creation, verification.
 *
 * CURRENCY: All amounts in USD CENTS (Paystack convention for USD).
 *   $499 setup = 49_900 cents.  $199/month = 19_900 cents.
 *
 * Required env: PAYSTACK_SECRET_KEY
 */
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;
const PAYSTACK_API = "https://api.paystack.co";

// ─── Constants ──────────────────────────────────────────────

/** One-time setup fee: $499.00 USD in cents */
export const SETUP_FEE_CENTS = 49_900;

/** Recurring monthly fee: $199.00 USD in cents */
export const RECURRING_CENTS = 19_900;

export const CURRENCY = "USD" as const;

// ─── Types ──────────────────────────────────────────────────

export interface PaystackPlanConfig {
  planCode: string;
  name: string;
  amount: number;
  interval: "monthly";
  currency: "USD";
}

export interface SignupMetadata {
  signupEmail: string;
  signupName: string;
  signupCompany: string;
  plan: "starter" | "professional";
  planCode: string;
}

// ─── Plan definitions ───────────────────────────────────────

const PLAN_DEFS: Record<string, Omit<PaystackPlanConfig, "planCode">> = {
  starter: {
    name: "Sagenify AI Starter — Monthly",
    amount: RECURRING_CENTS,
    interval: "monthly",
    currency: "USD",
  },
  professional: {
    name: "Sagenify AI Professional — Monthly",
    amount: RECURRING_CENTS,
    interval: "monthly",
    currency: "USD",
  },
};

// ─── Ensure plan exists (idempotent) ────────────────────────

/**
 * Fetches or creates the Paystack Plan for $199/month recurring.
 * Idempotent — if a plan with the same name+interval already exists,
 * returns its code instead of creating a duplicate.
 */
export async function ensurePaystackPlan(
  planType: "starter" | "professional",
): Promise<PaystackPlanConfig> {
  const cfg = PLAN_DEFS[planType] || PLAN_DEFS.starter;

  // Look up existing plan by name + interval
  const listRes = await fetch(`${PAYSTACK_API}/plan?perPage=100`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
  });
  const listData = (await listRes.json()) as any;
  if (listData.status && Array.isArray(listData.data)) {
    const existing = (listData.data as any[]).find(
      (p: any) => p.name === cfg.name && p.interval === cfg.interval,
    );
    if (existing) {
      console.log(`[paystack] Plan found: ${existing.plan_code}`);
      return { planCode: existing.plan_code, ...cfg };
    }
  }

  // Create new plan
  const createRes = await fetch(`${PAYSTACK_API}/plan`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: cfg.name,
      interval: cfg.interval,
      amount: cfg.amount,
      currency: cfg.currency,
      description: `$199/month recurring — Sagenify AI`,
    }),
  });
  const createData = (await createRes.json()) as any;
  if (!createData.status) {
    throw new Error(`Paystack plan creation failed: ${createData.message}`);
  }
  console.log(`[paystack] Plan created: ${createData.data.plan_code}`);
  return { planCode: createData.data.plan_code, ...cfg };
}

// ─── Create subscription from authorization ─────────────────

/**
 * Creates a Paystack Subscription that auto-charges $199/month.
 * Requires the authorization_code from a successful $499 setup transaction.
 */
export async function createPaystackSubscription(
  customerEmail: string,
  planCode: string,
  authorizationCode: string,
): Promise<{ subscriptionCode: string; emailToken: string }> {
  const res = await fetch(`${PAYSTACK_API}/subscription`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customer: customerEmail,
      plan: planCode,
      authorization: authorizationCode,
    }),
  });
  const data = (await res.json()) as any;
  if (!data.status) {
    throw new Error(`Paystack subscription creation failed: ${data.message}`);
  }
  console.log(
    `[paystack] Subscription created: ${data.data.subscription_code} for ${customerEmail}`,
  );
  return {
    subscriptionCode: data.data.subscription_code,
    emailToken: data.data.email_token,
  };
}

// ─── Verify transaction server-side ─────────────────────────

/**
 * Server-side verification of a Paystack transaction.
 * Returns the full transaction data on success, null otherwise.
 */
export async function verifyPaystackTransaction(
  reference: string,
): Promise<any | null> {
  const res = await fetch(
    `${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    },
  );
  const data = (await res.json()) as any;
  if (!data.status || data.data?.status !== "success") return null;
  return data.data;
}

// ─── HMAC-SHA512 signature verification ─────────────────────

/**
 * Verify a Paystack webhook signature (HMAC-SHA512).
 * Must be awaited — returns Promise<boolean>.
 * Fails closed: if crypto.subtle is unavailable, returns false.
 */
export async function verifyPaystackSignature(
  body: string,
  header: string | null,
  secret: string,
): Promise<boolean> {
  if (!header || !secret) return false;
  try {
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode(secret);
    const msgBytes = encoder.encode(body);

    // crypto.subtle is required — fail closed if unavailable
    if (!crypto.subtle) {
      console.error("[paystack] crypto.subtle unavailable — rejecting");
      return false;
    }

    const key = await crypto.subtle.importKey(
      "raw", keyBytes, { name: "HMAC", hash: "SHA-512" }, false, ["verify"],
    );
    const sigBytes = Uint8Array.from(atob(header), (c) => c.charCodeAt(0));
    return crypto.subtle.verify("HMAC", key, sigBytes, msgBytes);
  } catch {
    return false;
  }
}
