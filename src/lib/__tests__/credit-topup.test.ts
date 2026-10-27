import { describe, expect, test, beforeAll } from "bun:test";

/**
 * Pure-rule tests for Flutterwave credit top-ups: the money boundaries and the
 * routing that decides whether a charge is a top-up at all.
 * No database work here — the module's DB paths are exercised by the webhook,
 * not by unit tests.
 */
process.env.DATABASE_URL ??= "postgresql://topup:topup@localhost:5432/topup";

type Topup = typeof import("@/lib/credit-topup");
let topup: Topup;

beforeAll(async () => {
  topup = await import("@/lib/credit-topup");
});

describe("creditsForAmount — $0.005 per credit", () => {
  test("the owner's $10 minimum buys 2,000 credits", () => {
    expect(topup.creditsForAmount(10)).toBe(2000);
  });

  test("the $20 monthly allowance is exactly 4,000 credits", () => {
    expect(topup.creditsForAmount(20)).toBe(4000);
  });

  test("fractional cents floor rather than round up (never over-grant)", () => {
    expect(topup.creditsForAmount(10.004)).toBe(2000);
  });

  test("zero, negative and non-finite amounts buy nothing", () => {
    expect(topup.creditsForAmount(0)).toBe(0);
    expect(topup.creditsForAmount(-10)).toBe(0);
    expect(topup.creditsForAmount(Number.NaN)).toBe(0);
    expect(topup.creditsForAmount(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("validateTopupAmount — minimum $10", () => {
  test("$10 is allowed and yields 2,000 credits", () => {
    expect(topup.validateTopupAmount(10)).toEqual({
      ok: true,
      amountUsd: 10,
      credits: 2000,
    });
  });

  test("$10.00 as a string is allowed (form input)", () => {
    expect(topup.validateTopupAmount("10.00")).toEqual({
      ok: true,
      amountUsd: 10,
      credits: 2000,
    });
  });

  test("$9.99 is below the minimum", () => {
    expect(topup.validateTopupAmount(9.99)).toEqual({
      ok: false,
      error: "BELOW_MINIMUM",
    });
  });

  test("sub-cent fractions are rounded to cents, not silently accepted", () => {
    // 9.996 rounds to 10.00 → allowed at exactly the minimum.
    expect(topup.validateTopupAmount(9.996)).toEqual({
      ok: true,
      amountUsd: 10,
      credits: 2000,
    });
  });

  test("zero, negatives, NaN and junk are invalid amounts", () => {
    for (const bad of [0, -10, Number.NaN, "abc", null, undefined, {}, []]) {
      const result = topup.validateTopupAmount(bad);
      expect(result.ok).toBe(false);
    }
  });

  test("an absurd amount is rejected rather than sent to the provider", () => {
    expect(topup.validateTopupAmount(1_000_000)).toEqual({
      ok: false,
      error: "ABOVE_MAXIMUM",
    });
  });
});

describe("isTopupCharge — routing a webhook charge", () => {
  test("purpose metadata marks a top-up", () => {
    expect(topup.isTopupCharge("anything", { purpose: "credit_topup" })).toBe(true);
  });

  test("the tx_ref prefix marks a top-up even without metadata", () => {
    expect(topup.isTopupCharge("topup-biz_1-1700000000-abcd1234", null)).toBe(true);
  });

  test("a subscription charge is never mistaken for a top-up", () => {
    expect(topup.isTopupCharge("sub-monthly-1700000000-abcd", { purpose: "signup" })).toBe(false);
    expect(topup.isTopupCharge("pe-monthly-1700000000", {})).toBe(false);
    expect(topup.isTopupCharge(null, null)).toBe(false);
    expect(topup.isTopupCharge(undefined, undefined)).toBe(false);
  });
});

describe("topupIdempotencyRef — retries cannot double-credit", () => {
  test("the same tx_ref always produces the same grant reference", () => {
    expect(topup.topupIdempotencyRef("topup-x-1")).toBe("topup:topup-x-1");
    expect(topup.topupIdempotencyRef("topup-x-1")).toBe(
      topup.topupIdempotencyRef("topup-x-1")
    );
  });

  test("different charges produce different references", () => {
    expect(topup.topupIdempotencyRef("topup-x-1")).not.toBe(
      topup.topupIdempotencyRef("topup-x-2")
    );
  });
});
