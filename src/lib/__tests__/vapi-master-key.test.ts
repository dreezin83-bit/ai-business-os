import { describe, expect, test, beforeAll } from "bun:test";

/**
 * Pure-rule tests for the Vapi master-key controller.
 *
 * The module imports the shared drizzle client at load time, which needs a
 * DATABASE_URL to construct. These tests never touch the database — they only
 * exercise the decision tables — so a placeholder URL is enough (neon-http
 * creates the client lazily; no connection is opened).
 */
process.env.DATABASE_URL ??= "postgresql://controller:controller@localhost:5432/controller";

type Controller = typeof import("@/lib/vapi-master-key");
let controller: Controller;

beforeAll(async () => {
  controller = await import("@/lib/vapi-master-key");
});

describe("resolveVapiKey — master credential precedence", () => {
  test("prefers VAPI_PRIVATE_KEY over the legacy VAPI_API_KEY", async () => {
    const { resolveVapiKey } = controller;
    expect(
      resolveVapiKey({ VAPI_PRIVATE_KEY: "primary", VAPI_API_KEY: "legacy" })
    ).toBe("primary");
  });

  test("falls back to VAPI_API_KEY when the owner-saved name is absent", async () => {
    const { resolveVapiKey } = controller;
    expect(resolveVapiKey({ VAPI_API_KEY: "legacy" })).toBe("legacy");
  });

  test("treats a blank env var as unset (fails closed, never sends an empty bearer)", async () => {
    const { resolveVapiKey } = controller;
    expect(resolveVapiKey({ VAPI_PRIVATE_KEY: "   ", VAPI_API_KEY: "legacy" })).toBe(
      "legacy"
    );
  });

  test("returns null when no key is configured", async () => {
    const { resolveVapiKey } = controller;
    expect(resolveVapiKey({})).toBeNull();
  });
});

describe("workspaceOwnsResources — per-workspace isolation", () => {
  const own = {
    businessId: "biz_a",
    assistantId: "asst_a",
    phoneNumberId: "pn_a",
    phoneNumber: "+15550000001",
    webhookToken: "tok_a",
    webhookUrl: "https://app.example.com/api/voice/vapi/tok_a",
    voiceSetupReady: true,
    provisionState: "completed",
    provisionError: null,
  };

  test("accepts the workspace's own phone number and assistant", () => {
    const { workspaceOwnsResources } = controller;
    expect(
      workspaceOwnsResources(own, { phoneNumberId: "pn_a", assistantId: "asst_a" })
    ).toBe(true);
  });

  test("rejects another workspace's phone number", () => {
    const { workspaceOwnsResources } = controller;
    expect(workspaceOwnsResources(own, { phoneNumberId: "pn_other" })).toBe(false);
  });

  test("rejects another workspace's assistant", () => {
    const { workspaceOwnsResources } = controller;
    expect(workspaceOwnsResources(own, { assistantId: "asst_other" })).toBe(false);
  });

  test("rejects a claim on a workspace that owns nothing yet", () => {
    const { workspaceOwnsResources } = controller;
    const empty = { ...own, assistantId: null, phoneNumberId: null };
    expect(workspaceOwnsResources(empty, { phoneNumberId: "pn_a" })).toBe(false);
  });

  test("rejects any claim when the workspace does not exist", () => {
    const { workspaceOwnsResources } = controller;
    expect(workspaceOwnsResources(null, { phoneNumberId: "pn_a" })).toBe(false);
  });

  test("an empty claim (nothing asserted) is allowed", () => {
    const { workspaceOwnsResources } = controller;
    expect(workspaceOwnsResources(own, {})).toBe(true);
  });
});

describe("describeVoiceAccess — voice is paid-only", () => {
  test("allows a paid, verified, onboarded workspace with credits", () => {
    const { describeVoiceAccess } = controller;
    expect(
      describeVoiceAccess(
        {
          onboardingComplete: true,
          hasSubscription: true,
          subscriptionActive: true,
          verifiedPayment: true,
        },
        true
      )
    ).toEqual({ allowed: true, reason: "ok" });
  });

  test("blocks the free trial (no subscription row)", () => {
    const { describeVoiceAccess } = controller;
    expect(
      describeVoiceAccess(
        {
          onboardingComplete: true,
          hasSubscription: false,
          subscriptionActive: false,
          verifiedPayment: false,
        },
        true
      )
    ).toEqual({ allowed: false, reason: "no_subscription" });
  });

  test("blocks an unpaid status even when a row exists", () => {
    const { describeVoiceAccess } = controller;
    expect(
      describeVoiceAccess(
        {
          onboardingComplete: true,
          hasSubscription: true,
          subscriptionActive: false,
          verifiedPayment: true,
        },
        true
      )
    ).toEqual({ allowed: false, reason: "subscription_inactive" });
  });

  test("blocks an active row with no verified payment identifier", () => {
    const { describeVoiceAccess } = controller;
    expect(
      describeVoiceAccess(
        {
          onboardingComplete: true,
          hasSubscription: true,
          subscriptionActive: true,
          verifiedPayment: false,
        },
        true
      )
    ).toEqual({ allowed: false, reason: "no_verified_payment" });
  });

  test("blocks onboarding-incomplete workspaces", () => {
    const { describeVoiceAccess } = controller;
    expect(
      describeVoiceAccess(
        {
          onboardingComplete: false,
          hasSubscription: true,
          subscriptionActive: true,
          verifiedPayment: true,
        },
        true
      )
    ).toEqual({ allowed: false, reason: "onboarding_incomplete" });
  });

  test("blocks a new call when the allowance is hard-stopped", () => {
    const { describeVoiceAccess } = controller;
    expect(
      describeVoiceAccess(
        {
          onboardingComplete: true,
          hasSubscription: true,
          subscriptionActive: true,
          verifiedPayment: true,
        },
        false
      )
    ).toEqual({ allowed: false, reason: "credits_exhausted" });
  });
});

describe("buildWorkspaceWebhookUrl", () => {
  test("scopes the webhook path to the workspace token", () => {
    const url = controller.buildWorkspaceWebhookUrl("tok_a");
    expect(url.endsWith("/api/voice/vapi/tok_a")).toBe(true);
  });
});
