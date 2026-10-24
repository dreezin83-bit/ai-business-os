import { describe, expect, test } from "bun:test";
import {
  APP_URL,
  normalizeHost,
  resolveSubdomainRedirect,
  SITE_URL,
  SPLIT_ACTIVE,
} from "@/lib/domains";

describe("normalizeHost", () => {
  test("strips scheme-less host ports and lowercases", () => {
    expect(normalizeHost("WWW.Sagenifyai.com")).toBe("sagenifyai.com");
    expect(normalizeHost("app.sagenifyai.com:443")).toBe("app.sagenifyai.com");
    expect(normalizeHost("localhost:3000")).toBe("localhost");
    expect(normalizeHost(undefined)).toBe("");
  });
});

describe("resolveSubdomainRedirect (split inactive — default env)", () => {
  // Without NEXT_PUBLIC_APP_URL the app URL falls back to the site URL, so
  // the split is dormant and nothing redirects — this is the deploy-safe
  // default (changes nothing until DevOps activates the subdomain).
  test("APP_URL and SITE_URL agree pre-activation", () => {
    expect(SPLIT_ACTIVE).toBe(false);
    expect(APP_URL).toBe(SITE_URL);
  });
  test("no redirect when hosts are identical", () => {
    const url = resolveSubdomainRedirect({
      host: "www.sagenifyai.com",
      pathname: "/dashboard",
    });
    expect(url).toBeNull();
  });
});

describe("resolveSubdomainRedirect (split active)", () => {
  const site = "https://www.sagenifyai.com";
  const app = "https://app.sagenifyai.com";

  test("marketing path on app host → site host", () => {
    expect(
      resolveSubdomainRedirect({ host: "app.sagenifyai.com", pathname: "/", siteUrl: site, appUrl: app }),
    ).toBe(`${site}`);
    expect(
      resolveSubdomainRedirect({ host: "app.sagenifyai.com", pathname: "/privacy", siteUrl: site, appUrl: app }),
    ).toBe(`${site}/privacy`);
    expect(
      resolveSubdomainRedirect({ host: "app.sagenifyai.com", pathname: "/docs", siteUrl: site, appUrl: app }),
    ).toBe(`${site}/docs`);
  });

  test("app path on site host → app host, preserving path + search", () => {
    expect(
      resolveSubdomainRedirect({ host: "www.sagenifyai.com", pathname: "/dashboard", siteUrl: site, appUrl: app }),
    ).toBe(`${app}/dashboard`);
    expect(
      resolveSubdomainRedirect({ host: "sagenifyai.com", pathname: "/dashboard/leads?status=new", siteUrl: site, appUrl: app }),
    ).toBe(`${app}/dashboard/leads?status=new`);
    expect(
      resolveSubdomainRedirect({ host: "www.sagenifyai.com", pathname: "/onboarding", siteUrl: site, appUrl: app }),
    ).toBe(`${app}/onboarding`);
    expect(
      resolveSubdomainRedirect({ host: "www.sagenifyai.com", pathname: "/sign-in", siteUrl: site, appUrl: app }),
    ).toBe(`${app}/sign-in`);
  });

  test("never redirects API, webhook or asset paths from either host", () => {
    for (const p of [
      "/api/webhooks/flutterwave",
      "/api/public/chatbot/widget",
      "/api/voice/vapi/token",
      "/_next/static/chunks/x.js",
    ]) {
      expect(
        resolveSubdomainRedirect({ host: "app.sagenifyai.com", pathname: p, siteUrl: site, appUrl: app }),
      ).toBeNull();
      expect(
        resolveSubdomainRedirect({ host: "www.sagenifyai.com", pathname: p, siteUrl: site, appUrl: app }),
      ).toBeNull();
    }
  });

  test("unknown hosts (localhost / previews) are never redirected", () => {
    for (const host of ["localhost:3000", "preview-abc.vercel.app", "b9790a1f.ctonew.app"]) {
      expect(
        resolveSubdomainRedirect({ host, pathname: "/dashboard", siteUrl: site, appUrl: app }),
      ).toBeNull();
      expect(
        resolveSubdomainRedirect({ host, pathname: "/", siteUrl: site, appUrl: app }),
      ).toBeNull();
    }
  });

  test("marketing path on site host and app path on app host stay put", () => {
    expect(
      resolveSubdomainRedirect({ host: "www.sagenifyai.com", pathname: "/", siteUrl: site, appUrl: app }),
    ).toBeNull();
    expect(
      resolveSubdomainRedirect({ host: "app.sagenifyai.com", pathname: "/dashboard", siteUrl: site, appUrl: app }),
    ).toBeNull();
  });
});