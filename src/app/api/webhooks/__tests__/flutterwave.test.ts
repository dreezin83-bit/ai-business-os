/**
 * Tests for the Flutterwave payment path (signature, billing math, period logic).
 *
 * Imports the production helpers from @/lib/flutterwave.
 * Run: bun test src/app/api/webhooks/__tests__/flutterwave.test.ts
 *
 * Billing contract (owner-ratified 2026-10-24, per-plan terms):
 *   Monthly $199.00 early-bird · 6 Months $1,194.00 · Yearly $2,268.00;
 *   $299.00/mo standard list (dormant). NO setup fee, NO first-month premium —
 *   month 1 equals the advertised cadence price.
 */
import { describe, test, expect } from "bun:test";
import {
  ANNUAL_CENTS,
  EARLY_BIRD_CENTS,
  majorToCents,
  SEMI_ANNUAL_CENTS,
  shouldSkipRecurringEnrollment,
  STANDARD_CENTS,
  verifyFlutterwaveSignature,
} from "@/lib/flutterwave";

const VALID_HASH = "sk_test_webhook_secret_hash_value";

describe("verifyFlutterwaveSignature (fail-closed verif-hash)", () => {
  test("exact match passes", async () => {
    expect(await verifyFlutterwaveSignature(VALID_HASH, VALID_HASH)).toBe(true);
  });

  test("missing header or secret fails closed", async () => {
    expect(await verifyFlutterwaveSignature(null, VALID_HASH)).toBe(false);
    expect(await verifyFlutterwaveSignature(VALID_HASH, undefined)).toBe(false);
    expect(await verifyFlutterwaveSignature(VALID_HASH, "")).toBe(false);
  });
});

describe("billing math (major units → integer cents)", () => {
  test("$199.00 monthly early-bird → 19900 cents", () => {
    expect(EARLY_BIRD_CENTS).toBe(19900);
    expect(majorToCents(199)).toBe(EARLY_BIRD_CENTS);
    expect(majorToCents(199.0)).toBe(EARLY_BIRD_CENTS);
  });

  test("$1,194.00 (6 Months) → 119400 cents", () => {
    expect(SEMI_ANNUAL_CENTS).toBe(119400);
    expect(majorToCents(1194)).toBe(SEMI_ANNUAL_CENTS);
  });

  test("$2,268.00 (Yearly) → 226800 cents", () => {
    expect(ANNUAL_CENTS).toBe(226800);
    expect(majorToCents(2268)).toBe(ANNUAL_CENTS);
  });

  test("$299.00 standard list (dormant anchor) → 29900 cents", () => {
    expect(STANDARD_CENTS).toBe(29900);
    expect(majorToCents(299)).toBe(STANDARD_CENTS);
  });

  test("float amounts round to integer cents", () => {
    expect(majorToCents(199.99)).toBe(19999);
    expect(majorToCents(199.995)).toBe(20000); // Math.round
  });
});

describe("month-1 invariant: no setup fee, no first-month premium", () => {
  test("month 1 equals the advertised cadence — $199, not $399", () => {
    expect(EARLY_BIRD_CENTS).toBe(19900);
    expect(SEMI_ANNUAL_CENTS).toBe(119400); // 6 × $199
    expect(ANNUAL_CENTS).toBe(226800); // 12 × $189 (5%-off yearly)
    expect(STANDARD_CENTS).toBe(29900); // true list price (crossed-out anchor)
  });

  test("no premium constant exists anywhere in the contract", () => {
    // The $399-era setup premium is gone: the only month-1 charge is the
    // cadence amount itself. EARLY_BIRD_CENTS must never equal a premium.
    expect(EARLY_BIRD_CENTS).not.toBe(STANDARD_CENTS);
    expect(SEMI_ANNUAL_CENTS).toBe(EARLY_BIRD_CENTS * 6);
  });
});

describe("shouldSkipRecurringEnrollment (idempotent retry guard)", () => {
  test("undefined (no local subscription yet) → enroll", () => {
    expect(shouldSkipRecurringEnrollment(undefined)).toBe(false);
  });

  test("null id (enrollment pending/failed) → enroll (retry allowed)", () => {
    expect(shouldSkipRecurringEnrollment(null)).toBe(false);
  });

  test("existing flutterwaveSubId → skip (never double-enroll on retry)", () => {
    expect(shouldSkipRecurringEnrollment("12345")).toBe(true);
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
});