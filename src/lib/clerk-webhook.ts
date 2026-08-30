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

/**
 * Resolve the desired business display name for an owner.
 * Precedence: unsafeMetadata.businessName → safeMetadata.businessName →
 * the user's name. This lets onboarding write a real business name into
 * metadata before the first page render; otherwise we fall back to the
 * user's name.
 */
export function resolveBusinessName(data: any): string {
  const unsafe = data?.unsafeMetadata?.businessName;
  const safe = data?.safeMetadata?.businessName;
  const candidate = unsafe || safe;
  if (candidate && typeof candidate === "string" && candidate.trim()) {
    return candidate.trim();
  }
  return userFields(data).name;
}

/** Derive the display name used for a new business (name + "'s Business"). */
export function businessName(ownerName: string): string {
  return `${ownerName}'s Business`;
}

/** True if a business name is still a placeholder/default the webhook may overwrite. */
export function isDefaultName(name: string | null | undefined): boolean {
  const n = (name || "").trim();
  return n === "" || n === "My Business" || /'s Business$/.test(n);
}
