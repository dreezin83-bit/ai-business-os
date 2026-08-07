/**
 * Tests for escalation marker parsing + handoff helpers (pure functions).
 * Run: bun test src/lib/__tests__/escalation.test.ts
 */
import { describe, test, expect } from "bun:test";
import {
  parseEscalateMarker,
  cleanEscalateMarker,
  buildConversationSummary,
} from "@/lib/escalation";

describe("parseEscalateMarker", () => {
  test("parses reason only", () => {
    const r = parseEscalateMarker("[ESCALATE]::customer requested human");
    expect(r?.reason).toBe("customer requested human");
  });

  test("parses reason + summary", () => {
    const r = parseEscalateMarker("[ESCALATE]::billing dispute|Customer upset about invoice");
    expect(r?.reason).toBe("billing dispute");
    expect(r?.summary).toBe("Customer upset about invoice");
  });

  test("parses marker embedded in a reply", () => {
    const r = parseEscalateMarker(
      "I've forwarded your request. [ESCALATE]::customer frustrated\nSomeone will help soon.",
    );
    expect(r?.reason).toBe("customer frustrated");
  });

  test("returns null when no marker", () => {
    expect(parseEscalateMarker("just a normal reply")).toBeNull();
  });

  test("returns null for empty reason", () => {
    expect(parseEscalateMarker("[ESCALATE]::")).toBeNull();
  });
});

describe("cleanEscalateMarker", () => {
  test("strips marker from reply", () => {
    expect(cleanEscalateMarker("Hello [ESCALATE]::reason here")).toBe("Hello");
  });
  test("leaves plain text untouched", () => {
    expect(cleanEscalateMarker("How can I help?")).toBe("How can I help?");
  });
});

describe("buildConversationSummary", () => {
  test("joins last messages", () => {
    const history = [
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello!" },
    ];
    const s = buildConversationSummary(history);
    expect(s).toContain("user: hi");
    expect(s).toContain("assistant: hello!");
  });
  test("caps at max messages", () => {
    const history = Array.from({ length: 10 }, (_, i) => ({ role: "user", content: `msg${i}` }));
    const s = buildConversationSummary(history, 3);
    expect(s.split(" | ").length).toBeLessThanOrEqual(3);
  });
});
