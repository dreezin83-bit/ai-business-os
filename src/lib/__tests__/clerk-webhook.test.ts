/**
 * Tests for the pure Clerk webhook field-mapping helpers.
 *
 * Imports the production helpers from @/lib/clerk-webhook (dependency-free).
 * Run: bun test src/lib/__tests__/clerk-webhook.test.ts
 */
import { describe, test, expect } from "bun:test";
import {
  userFields,
  businessName,
  resolveBusinessName,
  isDefaultName,
} from "@/lib/clerk-webhook";

describe("userFields (Clerk user event → business columns)", () => {
  test("combines first + last name", () => {
    const f = userFields({
      first_name: "Jane",
      last_name: "Cooper",
      email_addresses: [{ email_address: "jane@example.com" }],
      phone_numbers: [{ phone_number: "+15551234567" }],
    });
    expect(f.name).toBe("Jane Cooper");
    expect(f.email).toBe("jane@example.com");
    expect(f.phone).toBe("+15551234567");
  });

  test("falls back to email when no name parts", () => {
    const f = userFields({
      email_addresses: [{ email_address: "jane@example.com" }],
    });
    expect(f.name).toBe("jane@example.com");
  });

  test("falls back to 'Business Owner' when nothing provided", () => {
    const f = userFields({});
    expect(f.name).toBe("Business Owner");
    expect(f.email).toBe("");
    expect(f.phone).toBe("");
  });

  test("handles only first name or only last name", () => {
    expect(userFields({ first_name: "Jane" }).name).toBe("Jane");
    expect(userFields({ last_name: "Cooper" }).name).toBe("Cooper");
  });
});

describe("businessName", () => {
  test("appends 's Business'", () => {
    expect(businessName("Jane Cooper")).toBe("Jane Cooper's Business");
  });
});

describe("resolveBusinessName", () => {
  test("prefers unsafeMetadata.businessName", () => {
    expect(
      resolveBusinessName({
        first_name: "Jane",
        unsafeMetadata: { businessName: "Cooper HVAC" },
      })
    ).toBe("Cooper HVAC");
  });

  test("falls back to safeMetadata.businessName", () => {
    expect(
      resolveBusinessName({
        first_name: "Jane",
        safeMetadata: { businessName: "Safe Plumbing" },
      })
    ).toBe("Safe Plumbing");
  });

  test("ignores blank metadata and falls back to user name", () => {
    expect(
      resolveBusinessName({
        first_name: "Jane",
        last_name: "Cooper",
        unsafeMetadata: { businessName: "   " },
      })
    ).toBe("Jane Cooper");
  });

  test("falls back to user's name when no metadata", () => {
    expect(resolveBusinessName({ first_name: "Jane" })).toBe("Jane");
  });
});

describe("isDefaultName", () => {
  test("true for empty / My Business / auto 's Business placeholder", () => {
    expect(isDefaultName("")).toBe(true);
    expect(isDefaultName("My Business")).toBe(true);
    expect(isDefaultName("Jane's Business")).toBe(true);
    expect(isDefaultName(null)).toBe(true);
  });
  test("false for a real business name", () => {
    expect(isDefaultName("Cooper HVAC Inc")).toBe(false);
  });
});
