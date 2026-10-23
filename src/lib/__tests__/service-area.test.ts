import { describe, test, expect } from "bun:test";
import {
  buildAreaStrings,
  serviceAreaSummary,
  splitLegacyServiceArea,
  normalizeServiceAreaValue,
  formatServiceAreas,
  SERVICE_AREA_REGIONS,
  SERVICE_AREA_COUNTRIES,
} from "@/lib/service-area";

describe("SERVICE_AREA_COUNTRIES", () => {
  test("has the five primary options in owner order", () => {
    expect(SERVICE_AREA_COUNTRIES.map((c) => c.value)).toEqual([
      "US", "GB", "CA", "AU", "global",
    ]);
  });
});

describe("SERVICE_AREA_REGIONS", () => {
  test("US has 51 entries (50 states + DC)", () => {
    expect(SERVICE_AREA_REGIONS.US).toHaveLength(51);
    expect(SERVICE_AREA_REGIONS.US).toContain("Texas");
    expect(SERVICE_AREA_REGIONS.US).toContain("District of Columbia");
  });
  test("UK / CA / AU populated", () => {
    expect(SERVICE_AREA_REGIONS.GB).toEqual(["England", "Scotland", "Wales", "Northern Ireland"]);
    expect(SERVICE_AREA_REGIONS.CA).toContain("Ontario");
    expect(SERVICE_AREA_REGIONS.AU).toContain("Victoria");
  });
});

describe("buildAreaStrings / serviceAreaSummary", () => {
  test("structured selection → readable area strings with region", () => {
    const sel = { country: "US", region: "Texas", cities: ["Austin", "Round Rock"], otherNote: "" };
    const areas = buildAreaStrings(sel);
    expect(areas).toEqual(["Austin, Texas", "Round Rock, Texas"]);
    expect(serviceAreaSummary(sel)).toBe("Austin, Texas; Round Rock, Texas");
  });
  test("no region → raw city chips", () => {
    const sel = { country: "US", region: "", cities: ["ZIP 85001", "Phoenix"], otherNote: "" };
    expect(buildAreaStrings(sel)).toEqual(["ZIP 85001", "Phoenix"]);
  });
  test("global with note → note wins", () => {
    const sel = { country: "global", region: "", cities: [], otherNote: "Nationwide remote support" };
    expect(buildAreaStrings(sel)).toEqual(["Nationwide remote support"]);
  });
  test("global with only chips → chips used", () => {
    const sel = { country: "global", region: "", cities: ["Remote (all timezones)"], otherNote: "" };
    expect(buildAreaStrings(sel)).toEqual(["Remote (all timezones)"]);
  });
  test("empty selection → empty arrays", () => {
    const sel = { country: "US", region: "", cities: [], otherNote: "" };
    expect(buildAreaStrings(sel)).toEqual([]);
    expect(serviceAreaSummary(sel)).toBe("");
  });
});

describe("normalizeServiceAreaValue", () => {
  test("structured object → JSON array + summary", () => {
    const out = normalizeServiceAreaValue(
      { country: "CA", region: "Ontario", cities: ["Toronto", "Mississauga"], otherNote: "" },
      "[]"
    );
    expect(out.areasJson).toBe(JSON.stringify(["Toronto, Ontario", "Mississauga, Ontario"]));
    expect(out.summary).toBe("Toronto, Ontario; Mississauga, Ontario");
  });
  test("legacy plain string → normalized JSON array", () => {
    const out = normalizeServiceAreaValue("Phoenix, AZ; Scottsdale, AZ", undefined);
    expect(out.areasJson).toBe(JSON.stringify(["Phoenix, AZ", "Scottsdale, AZ"]));
    expect(out.summary).toBe("Phoenix, AZ; Scottsdale, AZ");
  });
  test("plain string without delimiters → single-item array", () => {
    const out = normalizeServiceAreaValue("Greater Phoenix metro", undefined);
    expect(out.areasJson).toBe(JSON.stringify(["Greater Phoenix metro"]));
  });
  test("array input → JSON array", () => {
    const out = normalizeServiceAreaValue(["Austin", "Dallas"], undefined);
    expect(out.areasJson).toBe(JSON.stringify(["Austin", "Dallas"]));
  });
  test("blank/undefined keeps fallback (existing value)", () => {
    const out = normalizeServiceAreaValue(undefined, JSON.stringify(["Dallas, Texas"]));
    expect(out.areasJson).toBe(JSON.stringify(["Dallas, Texas"]));
    expect(out.summary).toBe("Dallas, Texas");
  });
  test("blank fallback → empty JSON array", () => {
    const out = normalizeServiceAreaValue(undefined, undefined);
    expect(out.areasJson).toBe("[]");
    expect(out.summary).toBe("");
  });
  test("JSON-array string input re-normalized without duplication", () => {
    const out = normalizeServiceAreaValue(JSON.stringify(["A, Texas"]), undefined);
    expect(out.areasJson).toBe(JSON.stringify(["A, Texas"]));
  });
  test("legacy fallback plain string handled", () => {
    const out = normalizeServiceAreaValue(undefined, "Miami; Fort Lauderdale");
    expect(out.areasJson).toBe(JSON.stringify(["Miami", "Fort Lauderdale"]));
  });
});

describe("splitLegacyServiceArea (prefill)", () => {
  test("US codes → country US + region Texas + cities", () => {
    const sel = splitLegacyServiceArea("Austin, TX; Round Rock, TX; San Antonio");
    expect(sel.country).toBe("US");
    expect(sel.region).toBe("Texas");
    expect(sel.cities).toEqual(["Austin", "Round Rock", "San Antonio"]);
  });
  test("CA code → country CA + region Ontario", () => {
    const sel = splitLegacyServiceArea("Toronto, ON; Mississauga, ON");
    expect(sel.country).toBe("CA");
    expect(sel.region).toBe("Ontario");
    expect(sel.cities).toEqual(["Toronto", "Mississauga"]);
  });
  test("UK names → country GB", () => {
    const sel = splitLegacyServiceArea("London, England; Manchester, England");
    expect(sel.country).toBe("GB");
    expect(sel.region).toBe("England");
    expect(sel.cities).toEqual(["London", "Manchester"]);
  });
  test("unrecognized parts become chips, default country US", () => {
    const sel = splitLegacyServiceArea("Remote nation-wide");
    expect(sel.country).toBe("US");
    expect(sel.region).toBe("");
    expect(sel.cities).toEqual(["Remote nation-wide"]);
  });
  test("JSON-array input pre-fills correctly", () => {
    const sel = splitLegacyServiceArea(JSON.stringify(["Victoria, BC"]));
    expect(sel.country).toBe("CA");
    expect(sel.region).toBe("British Columbia");
    expect(sel.cities).toEqual(["Victoria"]);
  });
  test("null/empty → empty selection", () => {
    const sel = splitLegacyServiceArea(null);
    expect(sel.country).toBe("US");
    expect(sel.region).toBe("");
    expect(sel.cities).toEqual([]);
  });
});

describe("formatServiceAreas (card display)", () => {
  test("JSON array → readable list", () => {
    expect(formatServiceAreas(JSON.stringify(["Austin, Texas", "Round Rock, Texas"])))
      .toBe("Austin, Texas; Round Rock, Texas");
  });
  test("empty array → empty string", () => {
    expect(formatServiceAreas("[]")).toBe("");
  });
  test("legacy plain string → as-is", () => {
    expect(formatServiceAreas("Phoenix, AZ")).toBe("Phoenix, AZ");
  });
  test("null/empty → empty string", () => {
    expect(formatServiceAreas(null)).toBe("");
    expect(formatServiceAreas("")).toBe("");
  });
});