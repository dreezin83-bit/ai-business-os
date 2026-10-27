import { describe, expect, test, beforeAll } from "bun:test";

/**
 * Pure-rule tests for the free-trial / paid entitlement.
 * Same pattern as the other lib tests: the module imports the shared drizzle
 * client, which needs a DATABASE_URL to construct; no query ever runs here.
 */
process.env.DATABASE_URL ??= "postgresql://trial:trial@localhost:5432/trial";

type Trial = typeof import("@/lib/trial");
let trial: Trial;

beforeAll(async () => {
  trial = await import("@/lib/trial");
});

const FREE = { hasBusiness: true, paidVerified: false, messagesUsed: 0 };
const PAID = { hasBusiness: true, paidVerified: true, messagesUsed: 0 };

describe("describeTrialState — free trial = 50 chat messages", () => {
  test("the owner-ratified trial limit is 50 messages", () => {
    const { describeTrialState, TRIAL_MESSAGE_LIMIT } = trial;
    expect(TRIAL_MESSAGE_LIMIT).toBe(50);
    expect(describeTrialState(FREE).trialMessageLimit).toBe(50);
  });

  test("a fresh trial workspace may chat, with voice locked", () => {
    const s = trial.describeTrialState(FREE);
    expect(s.tier).toBe("trial");
    expect(s.chatBlocked).toBe(false);
    expect(s.voiceLocked).toBe(true);
    expect(s.trialMessagesRemaining).toBe(50);
    expect(s.reason).toBe("ok");
  });

  test("the 50th message still gets through (limit is inclusive)", () => {
    const s = trial.describeTrialState({ ...FREE, messagesUsed: 49 });
    expect(s.chatBlocked).toBe(false);
    expect(s.trialMessagesRemaining).toBe(1);
  });

  test("the 51st message is refused", () => {
    const s = trial.describeTrialState({ ...FREE, messagesUsed: 50 });
    expect(s.chatBlocked).toBe(true);
    expect(s.trialMessagesRemaining).toBe(0);
    expect(s.reason).toBe("trial_exhausted");
  });

  test("remaining never goes negative even if the ledger over-counts", () => {
    const s = trial.describeTrialState({ ...FREE, messagesUsed: 999 });
    expect(s.trialMessagesRemaining).toBe(0);
    expect(s.chatBlocked).toBe(true);
  });

  test("a negative/NaN-free used count floors at zero", () => {
    const s = trial.describeTrialState({ ...FREE, messagesUsed: -5 });
    expect(s.trialMessagesUsed).toBe(0);
    expect(s.trialMessagesRemaining).toBe(50);
  });

  test("a missing business is blocked and never paid", () => {
    const s = trial.describeTrialState({ hasBusiness: false, paidVerified: true, messagesUsed: 0 });
    expect(s.chatBlocked).toBe(true);
    expect(s.paidVerified).toBe(false);
    expect(s.reason).toBe("no_business");
  });
});

describe("describeTrialState — paid = 4,000 credits, voice unlocked", () => {
  test("a paid workspace is never capped by the trial", () => {
    const s = trial.describeTrialState({ ...PAID, messagesUsed: 5_000 });
    expect(s.tier).toBe("paid");
    expect(s.voiceLocked).toBe(false);
    expect(s.chatBlocked).toBe(false);
    expect(s.reason).toBe("ok");
  });
});

describe("isPaidVerified — a subscription row alone is not payment", () => {
  test("active subscription with a Flutterwave id is paid", () => {
    expect(
      trial.isPaidVerified({
        subscriptionExists: true,
        status: "active",
        flutterwaveSubId: "flw_123",
        paystackSubId: null,
      })
    ).toBe(true);
  });

  test("legacy Paystack rows still count as verified", () => {
    expect(
      trial.isPaidVerified({
        subscriptionExists: true,
        status: "active",
        flutterwaveSubId: null,
        paystackSubId: "pln_123",
      })
    ).toBe(true);
  });

  test("pending status is not paid", () => {
    expect(
      trial.isPaidVerified({
        subscriptionExists: true,
        status: "pending_subscription",
        flutterwaveSubId: "flw_123",
        paystackSubId: null,
      })
    ).toBe(false);
  });

  test("active status with no payment identifier is not paid", () => {
    expect(
      trial.isPaidVerified({
        subscriptionExists: true,
        status: "active",
        flutterwaveSubId: null,
        paystackSubId: null,
      })
    ).toBe(false);
  });

  test("no subscription row is not paid", () => {
    expect(trial.isPaidVerified(null)).toBe(false);
    expect(
      trial.isPaidVerified({
        subscriptionExists: false,
        status: "active",
        flutterwaveSubId: "flw_123",
        paystackSubId: null,
      })
    ).toBe(false);
  });
});

describe("trialExhaustedError — the copy promises exactly what the plan promises", () => {
  test("returns 402-shaped body with the exact allowance and the paid allowance", () => {
    const s = trial.describeTrialState({ ...FREE, messagesUsed: 50 });
    const body = trial.trialExhaustedError(s);
    expect(body.error).toBe("AI_TRIAL_EXHAUSTED");
    expect(body.used).toBe(50);
    expect(body.limit).toBe(50);
    expect(body.message).toContain("50 free AI messages");
    expect(body.message).toContain("4,000 AI credits");
  });
});
