/**
 * Pure helpers for the Clerk webhook handler.
 *
 * Kept dependency-free (no DB, no Clerk imports) so the field-mapping logic
 * can be unit-tested with `bun test` in CI without needing node_modules.
 */

/** Map a Clerk `user` event payload into the column shape the business row stores. */
export function userFields(data: any): { name: string; email: string; phone: string } {
  const name =
    [data?.first_name, data?.last_name].filter(Boolean).join(" ") ||
    data?.email_addresses?.[0]?.email_address ||
    "Business Owner";
  return {
    name,
    email: data?.email_addresses?.[0]?.email_address || "",
    phone: data?.phone_numbers?.[0]?.phone_number || "",
  };
}

/** Derive the display name used for a new business (name + "'s Business"). */
export function businessName(ownerName: string): string {
  return `${ownerName}'s Business`;
}
