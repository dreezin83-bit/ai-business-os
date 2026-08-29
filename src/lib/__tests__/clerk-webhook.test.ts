/**
 * Tests for the pure Clerk webhook field-mapping helpers.
 *
 * Imports the production helpers from @/lib/clerk-webhook (dependency-free).
 * Run: bun test src/lib/__tests__/clerk-webhook.test.ts
 */
import { describe, test, expect } from "bun:test";
import { userFields, businessName } from "@/lib/clerk-webhook";

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
