import { describe, expect, test } from "bun:test";
import {
  computeCreditsMilli,
  modelWeights,
  normalizeModelId,
  voiceWeight,
} from "@/lib/credit-weights";

// Regression suite for the P1 calibration defect (QA live evidence 2026-10-19):
// OpenAI's completion.model returns DATE-SUFFIXED ids (e.g. "gpt-4o-mini-2024-07-18")
// while the calibration table keys are family names ("openai:gpt-4o-mini"). The old
// exact-match lookup fell back to fail-closed gpt-4o weights → ~16× over-metering on
// the default model. The spec worked examples (CREDIT-CALIBRATION.md §2.3) all PASS
// in the pre-fix code only because they used unsuffixed idealized names.

describe("normalizeModelId (P1 fix: date-suffixed OpenAI ids)", () => {
  test("strips OpenAI snapshot date suffixes", () => {
    expect(normalizeModelId("gpt-4o-mini-2024-07-18")).toBe("gpt-4o-mini");
    expect(normalizeModelId("gpt-4o-2024-08-06")).toBe("gpt-4o");
    expect(normalizeModelId("gpt-4.1-mini-2025-04-14")).toBe("gpt-4.1-mini");
    expect(normalizeModelId("gpt-4.1-nano-2025-04-14")).toBe("gpt-4.1-nano");
  });
  test("leaves plain family names unchanged", () => {
    expect(normalizeModelId("gpt-4o-mini")).toBe("gpt-4o-mini");
    expect(normalizeModelId("gpt-4o")).toBe("gpt-4o");
  });
  test("reduces fine-tuned ids to the base family", () => {
    expect(normalizeModelId("ft:gpt-4o-mini:org-abc:2025-01-01")).toBe("gpt-4o-mini");
  });
  test("does not mangle unknown ids — they still fail closed downstream", () => {
    expect(normalizeModelId("gpt-5")).toBe("gpt-5");
    expect(normalizeModelId("gpt-4o-mini-high")).toBe("gpt-4o-mini-high"); // not a dated snapshot
    expect(normalizeModelId(null)).toBe("");
    expect(normalizeModelId(undefined)).toBe("");
  });
});

describe("modelWeights lookup (P1 fix)", () => {
  test("dated default-model ids resolve to gpt-4o-mini weights, not the gpt-4o fallback", () => {
    expect(modelWeights("gpt-4o-mini-2024-07-18")).toEqual({ in: 0.03, out: 0.12 });
    expect(modelWeights("gpt-4.1-nano-2025-04-14")).toEqual({ in: 0.02, out: 0.08 });
  });
  test("plain family names keep their calibrated weights", () => {
    expect(modelWeights("gpt-4o-mini")).toEqual({ in: 0.03, out: 0.12 });
    expect(modelWeights("gpt-4o")).toEqual({ in: 0.5, out: 2.0 });
    expect(modelWeights("gpt-4.1-mini")).toEqual({ in: 0.08, out: 0.32 });
    expect(modelWeights("gpt-4.1-nano")).toEqual({ in: 0.02, out: 0.08 });
    expect(modelWeights("gpt-6-luna")).toEqual({ in: 0.02, out: 0.1 });
  });
  test("unknown models still fail closed to gpt-4o (never under-meter)", () => {
    expect(modelWeights("gpt-5")).toEqual({ in: 0.5, out: 2.0 });
    expect(modelWeights("gpt-4o-mini-high")).toEqual({ in: 0.5, out: 2.0 });
    expect(modelWeights(null)).toEqual({ in: 0.5, out: 2.0 });
    expect(modelWeights(undefined)).toEqual({ in: 0.5, out: 2.0 });
  });
  test("env overrides still win for normalized keys (CREDIT_MODEL_WEIGHTS)", () => {
    process.env.CREDIT_MODEL_WEIGHTS = JSON.stringify({
      "openai:gpt-4o-mini": { in: 0.01, out: 0.04 },
    });
    try {
      expect(modelWeights("gpt-4o-mini-2024-07-18")).toEqual({ in: 0.01, out: 0.04 });
    } finally {
      delete process.env.CREDIT_MODEL_WEIGHTS;
    }
  });
});

describe("computeCreditsMilli — spec examples with REAL (dated) model ids (P1)", () => {
  test("chat 3,000/300 gpt-4o-mini → 126 milli (was 920 with the bug)", () => {
    expect(
      computeCreditsMilli({ provider: "openai", model: "gpt-4o-mini-2024-07-18", tokensIn: 3000, tokensOut: 300 }),
    ).toBe(126);
  });
  test("chatbot 2,000/250 → 90 milli", () => {
    expect(
      computeCreditsMilli({ provider: "openai", model: "gpt-4o-mini-2024-07-18", tokensIn: 2000, tokensOut: 250 }),
    ).toBe(90);
  });
  test("commander 4,000/400 → 168 milli", () => {
    expect(
      computeCreditsMilli({ provider: "openai", model: "gpt-4o-mini-2024-07-18", tokensIn: 4000, tokensOut: 400 }),
    ).toBe(168);
  });
  test("email 2,500/350 → 117 milli", () => {
    expect(
      computeCreditsMilli({ provider: "openai", model: "gpt-4o-mini-2024-07-18", tokensIn: 2500, tokensOut: 350 }),
    ).toBe(117);
  });
  test("QA live evidence 1,739/25 dated mini → 56 milli (was 920 in prod ledger)", () => {
    expect(
      computeCreditsMilli({ provider: "openai", model: "gpt-4o-mini-2024-07-18", tokensIn: 1739, tokensOut: 25 }),
    ).toBe(56);
  });
  test("QA live evidence 200/34 dated mini → 11 milli (was 168 in prod ledger)", () => {
    expect(
      computeCreditsMilli({ provider: "openai", model: "gpt-4o-mini-2024-07-18", tokensIn: 200, tokensOut: 34 }),
    ).toBe(11);
  });
  test("genuinely unknown models still fail closed (900/50 → 550 milli)", () => {
    expect(computeCreditsMilli({ provider: "openai", model: null, tokensIn: 900, tokensOut: 50 })).toBe(550);
    expect(computeCreditsMilli({ provider: "openai", model: "gpt-5", tokensIn: 900, tokensOut: 50 })).toBe(550);
  });
  test("zero-token events floor at 1 milli", () => {
    expect(computeCreditsMilli({ provider: "openai", model: "gpt-4o-mini", tokensIn: 0, tokensOut: 0 })).toBe(1);
  });
});

describe("computeCreditsMilli — voice (P1 normalization parity)", () => {
  test("dated gpt-4o-mini 1 min → 19,000 milli (was 26,000 with the bug)", () => {
    expect(computeCreditsMilli({ provider: "vapi", model: "gpt-4o-mini-2024-07-18", minutes: 1 })).toBe(19000);
  });
  test("dated gpt-4o 1 min → 26,000; unknown stack still fails closed → 26,000", () => {
    expect(computeCreditsMilli({ provider: "vapi", model: "gpt-4o-2024-08-06", minutes: 1 })).toBe(26000);
    expect(computeCreditsMilli({ provider: "vapi", model: "unknown-stack-x", minutes: 1 })).toBe(26000);
  });
  test("minutes are ceil'd with a 1-minute floor", () => {
    expect(computeCreditsMilli({ provider: "vapi", model: "gpt-4o", minutes: 2.4 })).toBe(78000);
    expect(computeCreditsMilli({ provider: "vapi", model: "gpt-4o", minutes: 0.2 })).toBe(26000);
  });
});

describe("voiceWeight lookup (P1 normalization parity)", () => {
  test("dated mini resolves to 19, dated gpt-4o to 26, unknown to 26", () => {
    expect(voiceWeight("gpt-4o-mini-2024-07-18")).toBe(19);
    expect(voiceWeight("gpt-4o-2024-08-06")).toBe(26);
    expect(voiceWeight(null)).toBe(26);
    expect(voiceWeight("oops")).toBe(26);
  });
});