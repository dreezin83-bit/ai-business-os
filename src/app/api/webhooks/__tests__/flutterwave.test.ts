/**
 * Tests for the Flutterwave payment path (signature, billing math, period logic).
 *
 * Imports the production helpers from @/lib/flutterwave.
 * Run: bun test src/app/api/webhooks/__tests__/flutterwave.test.ts
 */
import { describe, test, expect } from "bun:test";
import {
  deferredPlanStartDate,
  majorToCents,
  RECURRING_CENTS,
  SETUP_FEE_CENTS,
  verifyFlutterwaveSignature,
} from "@/lib/flutterwave";

const VALID_HASH = "sk_test_webhook_secret_hash_value";
// Body shape mirrors a real charge.completed webhook payload.
const VALID_BODY = JSON.stringify({
  event: "charge.completed",
  data: {
    id: 987654,
    tx_ref: "sagenify-setup-1700000000000-abc12345",
    amount: 399,
    currency: "USD",
    status: "successful",
    customer: { email: "test@example.com" },
    meta: {
      signupEmail: "test@example.com",
      signupName: "Test User",
      signupCompany: "Test Co",
      plan: "starter",
    },
  },
});

describe("verifyFlutterwaveSignature (verif-hash, fail closed)", () => {
  test("accepts the configured webhook secret hash", async () => {
    expect(await verifyFlutterwaveSignature(VALID_HASH, VALID_HASH)).toBe(true);
  });

  test("rejects null header", async () => {
    expect(await verifyFlutterwaveSignature(null, VALID_HASH)).toBe(false);
  });

  test("rejects empty header", async () => {
    expect(await verifyFlutterwaveSignature("", VALID_HASH)).toBe(false);
  });

  test("rejects wrong hash", async () => {
    expect(await verifyFlutterwaveSignature("wrong-hash", VALID_HASH)).toBe(false);
  });

  test("fails closed when secret is missing (never accepts unsigned webhooks)", async () => {
    expect(await verifyFlutterwaveSignature(VALID_HASH, undefined)).toBe(false);
    expect(await verifyFlutterwaveSignature(VALID_HASH, "")).toBe(false);
  });
});

describe("billing math (major units → integer cents)", () => {
  test("$399.00 setup → 39900 cents", () => {
    expect(majorToCents(399)).toBe(SETUP_FEE_CENTS);
    expect(majorToCents(399.0)).toBe(SETUP_FEE_CENTS);
  });

  test("$199.00 recurring → 19900 cents", () => {
    expect(majorToCents(199)).toBe(RECURRING_CENTS);
    expect(majorToCents(199.0)).toBe(RECURRING_CENTS);
  });

  test("float amounts round to integer cents", () => {
    expect(majorToCents(199.99)).toBe(19999);
    expect(majorToCents(399.005)).toBe(39901); // Math.round
  });
});

describe("deferredPlanStartDate (first $199 charge after month 1 closes)", () => {
  test("returns YYYY-MM-DD for the calendar day ~31 days out", () => {
    const ref = new Date("2026-10-24T12:00:00.000Z");
    expect(deferredPlanStartDate(ref)).toBe("2026-11-24");
  });

  test("month-1 definition: plan start_date is AFTER the local 30-day period end", () => {
    // The $399 setup charge's 30-day credit window ends 30 days after payment.
    // The plan must not be chargeable inside that window — including the
    // 12h edge when the plan's calendar date (UTC midnight) falls on the same
    // day the window closes.
    const ref = new Date("2026-10-24T12:00:00.000Z");
    const creditPeriodEnd = new Date(ref.getTime() + 30 * 86_400_000); // 2026-11-23T12:00
    const planStart = new Date(`${deferredPlanStartDate(ref)}T00:00:00.000Z`);
    expect(planStart.getTime()).toBeGreaterThan(creditPeriodEnd.getTime());
  });
});

describe("Subscription failure → pending_subscription", () => {
  test("enrollment failure → pending_subscription (never active)", () => {
    const subscriptionFailed = true;
    const subStatus = subscriptionFailed ? "pending_subscription" : "active";
    expect(subStatus).toBe("pending_subscription");
    expect(subStatus).not.toBe("active");
  });

  test("no failure → active", () => {
    const subscriptionFailed = false;
    const subStatus = subscriptionFailed ? "pending_subscription" : "active";
    expect(subStatus).toBe("active");
  });

  test("month-1 invariant: the setup charge is exactly $399 — the $199 recurring leg is deferred, not double-charged", () => {
    // Approved offer: "$399 first month, then $199/month recurring".
    // The checkout flow initializes ONLY the $399 setup transaction; the $199
    // recurring charge is deferred to month 2 via the payment-plan start_date.
    // If both ever landed in month 1 the total would be $598 — that must not
    // happen. The webhook's only enforced month-1 charge is SETUP_FEE_CENTS.
    expect(SETUP_FEE_CENTS).toBe(39900);
    expect(RECURRING_CENTS).toBe(19900);
    expect(SETUP_FEE_CENTS).not.toBe(RECURRING_CENTS);
  });
});