/**
 * Service Area helpers — shared by the onboarding wizard (cascading
 * country → state/region → cities/zips selector) and any consumer that
 * reads the stored value.
 *
 * Storage contract (backward compatible):
 * - `aiBrainConfig.service_areas` (text, default "[]") stores a JSON ARRAY of
 *   readable area strings, e.g. `["Austin, Texas", "Round Rock, Texas"]` or
 *   `["United States (nationwide)"]`. Legacy rows may hold a plain string
 *   ("Phoenix, AZ; Scottsdale, AZ") — every consumer is expected to tolerate
 *   that (see formatServiceAreas), and this module normalizes it on write.
 * - `business.address` stores the same areas as a human-readable summary
 *   string ("Austin, Texas; Round Rock, Texas") so legacy consumers that
 *   read the address column keep working.
 *
 * Pure + dependency-free: unit-testable without node_modules.
 */

export interface ServiceAreaSelection {
  /** "US" | "GB" | "CA" | "AU" | "global" */
  country: string;
  /** State/province/region full name (empty for "global") */
  region: string;
  /** City / zip / area chips the user added */
  cities: string[];
  /** Free-text note for Global/Other */
  otherNote: string;
}

export const SERVICE_AREA_COUNTRIES: { value: string; label: string }[] = [
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "global", label: "Global / Other" },
];

export const SERVICE_AREA_REGIONS: Record<string, string[]> = {
  US: [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
    "Connecticut", "Delaware", "District of Columbia", "Florida", "Georgia",
    "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
    "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
    "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota",
    "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
    "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia",
    "Washington", "West Virginia", "Wisconsin", "Wyoming",
  ],
  GB: ["England", "Scotland", "Wales", "Northern Ireland"],
  CA: [
    "Alberta", "British Columbia", "Manitoba", "New Brunswick",
    "Newfoundland and Labrador", "Nova Scotia", "Ontario", "Prince Edward Island",
    "Quebec", "Saskatchewan", "Northwest Territories", "Nunavut", "Yukon",
  ],
  AU: [
    "New South Wales", "Queensland", "South Australia", "Tasmania", "Victoria",
    "Western Australia", "Australian Capital Territory", "Northern Territory",
  ],
};

/** Common abbreviations → region full name (used for legacy-string prefill). */
const REGION_ALIASES: Record<string, string> = {
  // US state / DC codes
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
  PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  // Canadian province/territory codes
  AB: "Alberta", BC: "British Columbia", MB: "Manitoba", NB: "New Brunswick",
  NL: "Newfoundland and Labrador", NS: "Nova Scotia", ON: "Ontario",
  PE: "Prince Edward Island", QC: "Quebec", SK: "Saskatchewan",
  NT: "Northwest Territories", NU: "Nunavut", YT: "Yukon",
  // Australian states/territories — only codes that cannot collide with the
  // US set above (no shared WA/SA/NT); full names still match via includes().
  "N. Ireland": "Northern Ireland",
  ACT: "Australian Capital Territory", NSW: "New South Wales",
  QLD: "Queensland", TAS: "Tasmania", VIC: "Victoria",
};

export const isEmptySelection = (sel: ServiceAreaSelection): boolean =>
  !sel.cities.some((c) => c.trim()) && !sel.otherNote.trim();

/**
 * Build the readable area strings for a selection.
 * e.g. ["Austin, Texas", "Round Rock, Texas"] or ["United States (nationwide)"].
 */
export function buildAreaStrings(sel: ServiceAreaSelection): string[] {
  const cities = sel.cities.map((c) => c.trim()).filter(Boolean);
  if (sel.country === "global") {
    const note = sel.otherNote.trim();
    // Free-text note wins; city chips still allowed as a fallback/further detail.
    if (note) return [note];
    return cities;
  }
  if (sel.region) return cities.map((c) => `${c}, ${sel.region}`);
  return cities;
}

/** Human-readable summary for the business.address column. */
export function serviceAreaSummary(sel: ServiceAreaSelection): string {
  return buildAreaStrings(sel).join("; ");
}

/** Split a legacy freeform string ("Phoenix, AZ; Scottsdale") into areas. */
function splitLegacyParts(value: string): string[] {
  return value
    .split(/[;\n]+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Best-effort parse of a legacy service-area value (plain string or JSON
 * array) into a structured selection, for pre-filling the onboarding wizard.
 */
export function splitLegacyServiceArea(
  value: string | null | undefined
): ServiceAreaSelection {
  if (!value) return { country: "US", region: "", cities: [], otherNote: "" };
  let parts: string[] = [];
  if (value.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) parts = parsed.map((p) => String(p));
    } catch {
      parts = splitLegacyParts(value);
    }
  } else {
    parts = splitLegacyParts(value);
  }
  let region = "";
  let country = "US";
  const cities: string[] = [];
  for (const part of parts) {
    const match = part.match(/^(?<city>.+?),\s*(?<st>[A-Za-z .-]{2,})$/);
    if (match?.groups?.city && match.groups.st) {
      const st = match.groups.st.trim();
      const resolved =
        REGION_ALIASES[st.toUpperCase()] ??
        REGION_ALIASES[st] ??
        (SERVICE_AREA_REGIONS.US.includes(st) ? st : undefined) ??
        (SERVICE_AREA_REGIONS.CA.includes(st) ? st : undefined) ??
        (SERVICE_AREA_REGIONS.GB.includes(st) ? st : undefined) ??
        (SERVICE_AREA_REGIONS.AU.includes(st) ? st : undefined);
      if (resolved) {
        if (!region) region = resolved;
        // Keep the city, drop the state suffix — the region is stored separately.
        cities.push(match.groups.city.trim());
        continue;
      }
    }
    cities.push(part);
  }
  if (region) {
    if (SERVICE_AREA_REGIONS.CA.includes(region)) country = "CA";
    else if (SERVICE_AREA_REGIONS.GB.includes(region)) country = "GB";
    else if (SERVICE_AREA_REGIONS.AU.includes(region)) country = "AU";
  }
  return {
    country,
    region,
    cities: [...new Set(cities)],
    otherNote: "",
  };
}

export interface NormalizedServiceArea {
  /** Always a JSON array string (may be "[]"). */
  areasJson: string;
  /** Human-readable summary for business.address. */
  summary: string;
}

/**
 * Normalize whatever the client sent (structured selection object, legacy
 * string, array, or nothing) into the storage contract: JSON array string
 * for aiBrainConfig.service_areas + readable summary for business.address.
 */
export function normalizeServiceAreaValue(
  input: unknown,
  fallback?: string | null
): NormalizedServiceArea {
  const isSelection =
    !!input &&
    typeof input === "object" &&
    !Array.isArray(input) &&
    (("country" in input && "cities" in input) || "otherNote" in input);
  if (isSelection) {
    const sel = input as ServiceAreaSelection;
    const areas = buildAreaStrings(sel);
    return {
      areasJson: JSON.stringify(areas),
      summary: areas.join("; "),
    };
  }
  if (Array.isArray(input)) {
    const areas = input.map((p) => String(p)).filter(Boolean);
    return { areasJson: JSON.stringify(areas), summary: areas.join("; ") };
  }
  if (typeof input === "string" && input.trim()) {
    // Legacy freeform (or JSON array string) — normalize both to an array.
    const trimmed = input.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const areas = parsed.map((p) => String(p)).filter(Boolean);
          return { areasJson: JSON.stringify(areas), summary: areas.join("; ") };
        }
      } catch {
        /* fall through to delimiter split */
      }
    }
    const areas = splitLegacyParts(trimmed);
    return { areasJson: JSON.stringify(areas), summary: areas.join("; ") };
  }
  // Nothing provided — keep the fallback (existing value if any).
  const fallbackVal = typeof fallback === "string" && fallback.trim() ? fallback : "[]";
  if (fallbackVal.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(fallbackVal);
      if (Array.isArray(parsed)) {
        const areas = parsed.map((p) => String(p)).filter(Boolean);
        return { areasJson: JSON.stringify(areas), summary: areas.join("; ") };
      }
    } catch {
      /* fall through */
    }
  }
  const areas = splitLegacyParts(fallbackVal);
  return { areasJson: JSON.stringify(areas), summary: areas.join("; ") };
}

/**
 * Display helper for the "What Your AI Knows" card: renders a JSON array of
 * areas as a readable list, tolerates legacy plain strings, returns "" when
 * empty/"[]".
 */
export function formatServiceAreas(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed === "[]") return "";
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const parts = parsed.map((p) => String(p)).filter(Boolean);
        if (parts.length > 0) return parts.join("; ");
        return "";
      }
    } catch {
      /* fall through to raw display */
    }
  }
  return trimmed;
}