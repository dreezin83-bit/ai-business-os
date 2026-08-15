import { describe, expect, test } from "bun:test";
import { parseServices, isServicesConfigured } from "@/lib/ai-services";

describe("parseServices", () => {
  test("parses a non-empty JSON array", () => {
    expect(parseServices('["AC repair","furnace"]')).toEqual(["AC repair", "furnace"]);
  });

  test("filters empty items from a JSON array", () => {
    expect(parseServices('["AC repair",""]')).toEqual(["AC repair"]);
  });

  test("returns [] for an empty JSON array", () => {
    expect(parseServices("[]")).toEqual([]);
  });

  test("returns [] for empty/whitespace strings", () => {
    expect(parseServices("")).toEqual([]);
    expect(parseServices("   ")).toEqual([]);
  });

  test("returns [] for null/undefined", () => {
    expect(parseServices(null)).toEqual([]);
    expect(parseServices(undefined)).toEqual([]);
  });

  test("returns [] for non-array JSON", () => {
    expect(parseServices('{"foo":"bar"}')).toEqual([]);
    expect(parseServices("null")).toEqual([]);
  });

  test("falls back to newline-separated plain text", () => {
    expect(parseServices("AC repair\nfurnace installation")).toEqual([
      "AC repair",
      "furnace installation",
    ]);
  });

  test("falls back to comma-separated plain text", () => {
    expect(parseServices("AC repair, furnace installation, duct cleaning")).toEqual([
      "AC repair",
      "furnace installation",
      "duct cleaning",
    ]);
  });

  test("handles partially-malformed JSON as plain text", () => {
    // Not valid JSON — the plain-text path still returns the services.
    expect(parseServices('["AC repair", furnace]')).toEqual(['["AC repair"', "furnace]"]);
  });
});

describe("isServicesConfigured", () => {
  test("true for a non-empty JSON array", () => {
    expect(isServicesConfigured('["AC repair"]')).toBe(true);
  });

  test("true for non-empty plain text", () => {
    expect(isServicesConfigured("AC repair\nfurnace")).toBe(true);
    expect(isServicesConfigured("AC repair, furnace")).toBe(true);
  });

  test("false for empty/array-only/whitespace values", () => {
    expect(isServicesConfigured("")).toBe(false);
    expect(isServicesConfigured("[]")).toBe(false);
    expect(isServicesConfigured('[""]')).toBe(false);
    expect(isServicesConfigured(null)).toBe(false);
  });
});
