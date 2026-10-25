/**
 * Flutterwave payment domain helpers — THE live payment path (owner decision
 * 2026-10-23; Paystack fully removed).
 *
 * Checkout flow (subscribe-first, per-plan terms ratified 2026-10-24):
 *   1. POST /api/flutterwave/checkout — resolves the chosen cadence
 *      (monthly / semiannual / annual), ensures that cadence's payment plan
 *      exists (idempotent; monthly + annual only), and initializes ONE charge
 *      for the cadence's full amount: $199 (Monthly), $1,194 (6 Months),
 *      $2,268 (Yearly). No setup fee and no first-month premium — month 1 is
 *      exactly the advertised price.
 *   2. Monthly and Annual attach the cadence's plan (payment_plan), so the
 *      checkout charge IS the plan's first payment — the plan is active
 *      immediately and bills its own interval from the next cycle. 6 Months
 *      (no native Flutterwave interval) stands alone and grants a 180-day
 *      access window; its next period is a fresh checkout.
 *   3. Flutterwave webhook (charge.completed, status "successful") — verifies
 *      verif-hash, server-verifies the transaction, creates the business from
 *      signup metadata, records the local subscription at the SAME amount for
 *      the next cycle (the plan's own recurrence), stamps the per-tenant
 *      early-bird price-lock, opens the credit period (periodDays by cadence),
 *      and provisions Vapi voice once onboarding completes.
 *
 * Required env: FLUTTERWAVE_SECRET_KEY, FLUTTERWAVE_WEBHOOK_SECRET
 */
import {
  createPlan,
  createSubscription,
  getPaymentPlans,
  verifyTransaction,
} from "@/lib/flutterwave-client";

// ─── Pricing constants (USD) — owner decision 2026-10-24 (plan rev 13) ──────
// The offer is now REAL early-bird terms, billed from month 1:
//   - early-bird monthly  $199/mo  (the price-lock source; NEVER raised)
//   - semi-annual         $1,194 / 6 months (6 × $199)
//   - annual              $2,268 / year (12 × $189 = the 5%-off yearly)
//   - standard monthly    $299/mo  (the true LIST price; backs the crossed-out
//     anchor on the landing; charged only after the 10k cap fills — inactive
//     until the cap logic ships)
// Month 1 is exactly $199 (no $399 setup anywhere). Enrollments for monthly
// and annual attach the payment to the Flutterwave payment plan
// (POST /payments `payment_plan`) so the checkout charge IS the plan's first
// payment: one charge, plan active immediately, no deferral, no double-charge.
// Semi-annual has NO native Flutterwave interval (FW supports daily/weekly/
// monthly/quarterly/yearly only) — it bills as a $1,194 charge per 180-day
// access window (renewal re-initializes), which is literally "$1,194 per period".
export const CURRENCY = "USD";

/** $199.00/month early-bird — the locked price. Also month-1's charge. */
export const EARLY_BIRD_CENTS = 19_900;
/** $1,194.00 per 6-month period (6 × $199). */
export const SEMI_ANNUAL_CENTS = 119_400;
/** $2,268.00 per year (12 × $189 — the 5%-off yearly). */
export const ANNUAL_CENTS = 226_800;
/** $299.00/month standard list price (anchor backing; post-cap only). */
export const STANDARD_CENTS = 29_900;

/** Major-unit amounts Flutterwave expects in API bodies (v3 uses major units). */
export const EARLY_BIRD_MAJOR = EARLY_BIRD_CENTS / 100; // 199
export const SEMI_ANNUAL_MAJOR = SEMI_ANNUAL_CENTS / 100; // 1194
export const ANNUAL_MAJOR = ANNUAL_CENTS / 100; // 2268
export const STANDARD_MAJOR = STANDARD_CENTS / 100; // 299

/** Early-bird offer cap (owner: "first 10,000 users — Ending Soon"). */
export const EARLY_BIRD_CAP = 10_000;

/** Billing cadence offered at the landing checkout. */
export type BillingCadence = "monthly" | "semiannual" | "annual";

/** Rules of one billing cadence. `fwPlan` = null means no native FW plan. */
export interface BillingOptionDef {
  key: BillingCadence;
  label: string;
  amountCents: number;
  major: number;
  /** Local cadence recorded on the subscription row. */
  interval: string;
  /** Local access-window length granted per charge (days). */
  periodDays: number;
  /** Flutterwave plan: null for semi-annual (no native FW interval). */
  fwPlan: { name: string; interval: "monthly" | "yearly"; amount: number } | null;
  /** True when the checkout charge should attach to the FW plan. */
  planAttached: boolean;
}

export const BILLING_OPTIONS: Record<BillingCadence, BillingOptionDef> = {
  monthly: {
    key: "monthly",
    label: "Monthly",
    amountCents: EARLY_BIRD_CENTS,
    major: EARLY_BIRD_MAJOR,
    interval: "month",
    periodDays: 30,
    fwPlan: {
      name: "Sagenify AI — Early Bird Monthly ($199)",
      interval: "monthly",
      amount: EARLY_BIRD_MAJOR,
    },
    planAttached: true,
  },
  semiannual: {
    key: "semiannual",
    label: "6 Months",
    amountCents: SEMI_ANNUAL_CENTS,
    major: SEMI_ANNUAL_MAJOR,
    interval: "6months",
    periodDays: 180,
    fwPlan: null, // Flutterwave has no 6-month interval — period product
    planAttached: false,
  },
  annual: {
    key: "annual",
    label: "Yearly",
    amountCents: ANNUAL_CENTS,
    major: ANNUAL_MAJOR,
    interval: "year",
    periodDays: 365,
    fwPlan: {
      name: "Sagenify AI — Annual ($2,268)",
      interval: "yearly",
      amount: ANNUAL_MAJOR,
    },
    planAttached: true,
  },
};

/** Parse a caller-supplied cadence; default monthly, unknown → monthly. */
export function resolveBillingCadence(value: unknown): BillingCadence {
  return value === "semiannual" || value === "annual" ? value : "monthly";
}

/** Short tx_ref prefix per cadence (audit/ledger readability). */
export function billingRefPrefix(cadence: BillingCadence): string {
  return cadence === "monthly"
    ? "sagenify-eb-m"
    : cadence === "semiannual"
      ? "sagenify-eb-s6"
      : "sagenify-eb-y";
}

/** Flutterwave reports amounts in major units; our DB stores integer cents. */
export function majorToCents(amount: number): number {
  return Math.round(amount * 100);
}

// ─── Signup metadata (subscribe-first) ───────────────────────────
export interface SignupMetadata {
  signupEmail: string;
  signupName: string;
  signupCompany: string;
  plan: "starter" | "professional";
  /** Billing cadence chosen at checkout ("monthly" | "semiannual" | "annual"). */
  cadence?: BillingCadence;
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
 * Ensure the payment plan for a cadence exists exactly once (idempotent).
 * Cadences without a native FW plan (semi-annual) return null — the charge is
 * a per-period payment, not a plan subscription. Standard ($299) is NOT
 * created here: it stays dormant until the cap logic ships.
 */
export async function ensurePaymentPlan(
  cadence: BillingCadence = "monthly",
): Promise<{ id: number } | null> {
  const option = BILLING_OPTIONS[resolveBillingCadence(cadence)];
  if (!option.fwPlan) return null;
  const existing = await findPaymentPlan(option);
  if (existing?.id) return { id: existing.id };
  const created = await createPlan({
    name: option.fwPlan.name,
    amount: option.fwPlan.amount,
    interval: option.fwPlan.interval,
    currency: CURRENCY,
  });
  if (!created?.data?.id) {
    throw new Error("Flutterwave payment-plan creation did not return a plan id");
  }
  console.log(`[flutterwave] Payment plan created (${cadence}): id=${created.data.id}`);
  return { id: created.data.id };
}

/** Find a cadence's plan among existing plans (by name, then amount+interval). */
async function findPaymentPlan(
  option: BillingOptionDef,
): Promise<FlutterwavePlan | null> {
  try {
    const res = await getPaymentPlans();
    const plans: FlutterwavePlan[] = res?.data ?? [];
    return (
      plans.find((p) => p.name === option.fwPlan?.name) ??
      plans.find(
        (p) =>
          Math.round((p.amount ?? 0) * 100) === option.amountCents &&
          p.interval === option.fwPlan?.interval,
      ) ??
      null
    );
  } catch (err: any) {
    console.warn(`[flutterwave] getPaymentPlans failed (falling back to create): ${err?.message}`);
    return null;
  }
}

// ─── Recurring enrollment (plan-attached; webhook resolves, never duplicates) ─
/**
 * Idempotency guard for the checkout webhook: once a business holds a
 * Flutterwave enrollment id, a retried webhook (lost 200/202 ack) must NOT
 * enroll again — the plan already bills on interval. Returns true when the
 * business already has a flutterwave subscription id.
 */
export function shouldSkipRecurringEnrollment(
  existingFlutterwaveSubId: string | null | undefined,
): boolean {
  return !!existingFlutterwaveSubId;
}

/**
 * Enroll the customer into a payment plan (used for cadences where the
 * checkout charge is NOT plan-attached, e.g. legacy/semi-annual falls back).
 * For monthly/annual the checkout attaches `payment_plan` itself, so the
 * webhook only resolves the provider-side subscription id — calling this for
 * those cadences would double-enroll. amount defaults to the cadence price.
 */
export async function createFlutterwaveSubscription(
  customerEmail: string,
  planId: number,
  externalRef: string,
  amountMajor: number = EARLY_BIRD_MAJOR,
): Promise<{ id: number }> {
  const res = await createSubscription({
    tx_ref: externalRef,
    amount: amountMajor,
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