/**
 * Shared parsing for a business's `services` AI Brain field.
 *
 * The field is normally stored as a JSON array string (e.g. `["AC repair","furnace"]`),
 * but older flows and partial onboarding can leave plain text (newline- or
 * comma-separated) or `"[]"`. Every consumer of this field must handle all of
 * those shapes consistently — that's what these helpers centralize.
 *
 * Never throws; returns `[]` for anything unusable.
 */

/** Parse a services field into a list of service strings. */
export function parseServices(raw: string | null | undefined): string[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is string => typeof item === "string" && item.trim() !== "",
      );
    }
    return [];
  } catch {
    // Not JSON — treat as plain text (newline- or comma-separated).
    return raw
      .split(/[\n,]+/)
      .map((x) => x.trim())
      .filter(Boolean);
  }
}

/** True when the business has at least one service configured. */
export function isServicesConfigured(raw: string | null | undefined): boolean {
  return parseServices(raw).length > 0;
}
