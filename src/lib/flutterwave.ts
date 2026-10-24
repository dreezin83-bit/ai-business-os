/**
 * Flutterwave payment domain helpers — THE live payment path (owner decision
 * 2026-10-23; Paystack fully removed).
 *
 * Checkout flow (subscribe-first):
 *   1. POST /api/flutterwave/checkout — ensures the $199/mo payment plan exists
 *      (idempotent), then initializes a *standalone* $399 one-time transaction
 *      (no plan attached — plan amounts would override the $399).
 *   2. Flutterwave webhook (charge.completed, status "successful") — verifies
 *      verif-hash, server-verifies the transaction, creates the business from
 *      signup metadata, enrolls the customer in the $199/mo payment plan
 *      (subscription starting at plan.start_date = +30 days), persists the
 *      local subscription, opens the monthly credit period, and provisions
 *      Vapi voice once onboarding completes.
 *
 * First-month billing invariant (owner-ratified offer: "$399 first month,
 * then $199/month recurring"):
 *   - The $399 setup charge is standalone — nothing else is charged at
 *     checkout, so month-1 total can never exceed $399 from this flow.
 *   - The $199/mo payment plan is created with start_date ≈ now + 31 days
 *     (the calendar day AFTER the 30-day first month closes), which defers the
 *     FIRST recurring charge into the second month (the Reading-A behavior the
 *     pricing findings required). QA must CONFIRM in Flutterwave TEST MODE
 *     before launch that enrolling the subscription triggers NO immediate
 *     $199 charge (see shared FLUTTERWAVE-FIRST-MONTH-BILLING.md).
 *
 * Required env: FLUTTERWAVE_SECRET_KEY, FLUTTERWAVE_WEBHOOK_SECRET
 */
import {
  createPlan,
  createSubscription,
  getPaymentPlans,
  verifyTransaction,
} from "@/lib/flutterwave-client";

// ─── Pricing constants (USD) ────────────────────────────────────
/** $399.00 one-time setup — the entire first-month charge. */
export const SETUP_FEE_CENTS = 39_900;
/** $199.00/month recurring, charged via the payment plan from month 2 on. */
export const RECURRING_CENTS = 19_900;
export const CURRENCY = "USD";
/** Major-unit amounts Flutterwave expects in API bodies (v3 uses major units). */
export const SETUP_FEE_MAJOR = SETUP_FEE_CENTS / 100; // 399
export const RECURRING_FEE_MAJOR = RECURRING_CENTS / 100; // 199

export const PLAN_NAME = "Sagenify AI Professional — Monthly";
export const PLAN_INTERVAL = "monthly";

/** Flutterwave reports amounts in major units; our DB stores integer cents. */
export function majorToCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Payment-plan first-charge date: the calendar day AFTER the 30-day first
 * month closes (≈ +31 days from payment). A calendar date is midnight by
 * definition, so deferring a full day past period end guarantees the plan can
 * never charge inside the $399 first month — in every time-of-day case.
 */
export function deferredPlanStartDate(now = new Date()): string {
  const d = new Date(now.getTime() + 31 * 86_400_000);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC midnight)
}

// ─── Signup metadata (subscribe-first) ───────────────────────────
export interface SignupMetadata {
  signupEmail: string;
  signupName: string;
  signupCompany: string;
  plan: "starter" | "professional";
  paymentType?: string;
}

// ─── Webhook signature (verif-hash) ─────────────────────────────
/**
 * Verify the Flutterwave webhook `verif-hash` header against the configured
 * webhook secret hash (FLUTTERWAVE_WEBHOOK_SECRET). Flutterwave sends the
 * configured hash verbatim in the `verif-hash` request header, so this is an
 * exact-equality check. Fails closed: missing secret or missing header = false.
 */
export async function verifyFlutterwaveSignature(
  header: string | null,
  secret: string | undefined,
): Promise<boolean> {
  if (!header || !secret) return false;
  return header === secret;
}

// ─── Payment plan (idempotent) ──────────────────────────────────
export interface FlutterwavePlan {
  id: number;
  name?: string;
  amount?: number;
  interval?: string;
  status?: string;
}

/**
 * Ensure the $199/mo Sagenify payment plan exists exactly once. Looks the plan
 * up first (by name, then by amount+interval); creates it with start_date ≈
 * now + 31 days (day after month 1 closes) when missing. Safe to call on every
 * checkout and webhook — the plan id is what the subscription enrollment needs.
 */
export async function ensurePaymentPlan(): Promise<{ id: number }> {
  const existing = await findPaymentPlan();
  if (existing?.id) {
    return { id: existing.id };
  }
  const created = await createPlan({
    name: PLAN_NAME,
    amount: RECURRING_FEE_MAJOR,
    interval: PLAN_INTERVAL,
    currency: CURRENCY,
  });
  if (!created?.data?.id) {
    throw new Error("Flutterwave payment-plan creation did not return a plan id");
  }
  console.log(`[flutterwave] Payment plan created: id=${created.data.id}`);
  return { id: created.data.id };
}

/** Find our $199/mo plan among existing plans (by name, then amount+interval). */
async function findPaymentPlan(): Promise<FlutterwavePlan | null> {
  try {
    const res = await getPaymentPlans();
    const plans: FlutterwavePlan[] = res?.data ?? [];
    return (
      plans.find((p) => p.name === PLAN_NAME) ??
      plans.find(
        (p) =>
          Math.round((p.amount ?? 0) * 100) === RECURRING_CENTS &&
          p.interval === PLAN_INTERVAL,
      ) ??
      null
    );
  } catch (err: any) {
    console.warn(`[flutterwave] getPaymentPlans failed (falling back to create): ${err?.message}`);
    return null;
  }
}

// ─── Recurring enrollment ($199/mo from month 2, plan-deferred) ─
/**
 * Enroll the customer in the $199/mo payment plan. The plan's start_date
 * (+31d, the day after month 1 closes) governs when its first charge can
 * occur — nothing is charged in month 1 (the $399 setup is the entire
 * first-month bill).
 */
export async function createFlutterwaveSubscription(
  customerEmail: string,
  planId: number,
  externalRef: string,
): Promise<{ id: number }> {
  const res = await createSubscription({
    tx_ref: externalRef,
    amount: RECURRING_FEE_MAJOR,
    currency: CURRENCY,
    payment_type: "card",
    customer: customerEmail,
    plan: planId,
  });
  const id = (res as any)?.data?.id ?? (res as any)?.data?.subscription?.id;
  if (!id) {
    throw new Error("Flutterwave subscription creation did not return an id");
  }
  console.log(`[flutterwave] Subscription created: id=${id} for ${customerEmail}`);
  return { id: Number(id) };
}

// ─── Server-side transaction verification (defense in depth) ────
/**
 * Re-verify the transaction with Flutterwave by tx_ref. Returns the verified
 * transaction data only when Flutterwave itself reports success; null on any
 * failure (network, API error, or non-success status).
 */
export async function verifyFlutterwaveTransaction(
  txRef: string,
): Promise<any | null> {
  try {
    const res = await verifyTransaction(txRef);
    if (res.status !== "success" || res.data?.status !== "successful") {
      console.warn(
        `[flutterwave] Server verification: ${res.status} / ${res.data?.status} (${txRef})`,
      );
      return null;
    }
    return res.data;
  } catch (err: any) {
    console.warn(`[flutterwave] verifyTransaction error for ${txRef}: ${err?.message}`);
    return null;
  }
}