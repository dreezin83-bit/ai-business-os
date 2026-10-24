/**
 * Domain architecture — marketing site vs app portal.
 *
 * Owner decision (2026-10-23): once the split ships, the marketing site lives
 * on the root domain (sagenifyai.com / www.sagenifyai.com) and the app portal
 * (dashboard, onboarding, sign-in/up, API, webhooks) lives on
 * `app.sagenifyai.com`.
 *
 * Activation model: the split is DORMANT until `NEXT_PUBLIC_APP_URL` is
 * explicitly set to the app subdomain by DevOps (alongside DNS + Clerk origin
 * work). Until then `APP_URL` falls back to `SITE_URL`, so every absolute app
 * URL behaves exactly as it does today (single host) and no redirect policy
 * fires. This keeps the deploy a no-op until the infrastructure is ready.
 *
 * NEXT_PUBLIC_* values are inlined at build time, so flipping the env var and
 * redeploying is what activates the split (expected DevOps flow).
 */
const DEFAULT_SITE_URL = "https://www.sagenifyai.com";

/** Marketing canonical — root domain (apex redirects to www via Vercel). */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL;

/** App portal canonical — app subdomain once activated by DevOps. */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || SITE_URL;

/** Hostnames (no scheme / port / trailing slash). */
export const SITE_HOST = new URL(SITE_URL).hostname;
export const APP_HOST = new URL(APP_URL).hostname;

/** Bare apex host (e.g. sagenifyai.com) — treated as a site host. */
export const APEX_HOST = SITE_HOST.replace(/^www\./, "");

/**
 * True once the app subdomain is a different host than the site — i.e. the
 * split is effectively configured. Gateway for every routing decision.
 */
export const SPLIT_ACTIVE = APP_HOST !== SITE_HOST;

/** Normalize a request Host header for comparison. */
export function normalizeHost(host: string | undefined | null): string {
  if (!host) return "";
  // Strip port (e.g. "localhost:3000") and lowercase.
  return host.split(":")[0].toLowerCase().replace(/^www\./, "");
}

/**
 * True when a request Host header belongs to the marketing site.
 * Comparison is in the same normalized space as normalizeHost, so www and
 * apex are equivalent. While the split is inactive (APP_URL falls back to
 * SITE_URL) the single host also counts as the site host — pre-split the
 * same deployment serves everything.
 */
export function isSiteHost(host: string | undefined | null): boolean {
  const h = normalizeHost(host);
  if (!h) return false;
  return h === normalizeHost(SITE_HOST) || h === normalizeHost(APP_HOST);
}

/**
 * True when a request Host header belongs to the app portal subdomain.
 * While the split is inactive this is the same single host — the app portal
 * and marketing site are served from one deployment.
 */
export function isAppHost(host: string | undefined | null): boolean {
  const h = normalizeHost(host);
  if (!h) return false;
  return h === normalizeHost(APP_HOST);
}

/**
 * Decide whether this request must be redirected to the canonical host for
 * its route class. Pure function — unit-testable without the Next runtime.
 *
 * Policy (only enforced while SPLIT_ACTIVE):
 * - Marketing-only paths (/, /privacy, /terms, /docs) on the APP host → 307
 *   to SITE_URL + path (keeps marketing SEO/content on the root domain).
 * - App-only paths (/dashboard*, /onboarding*, /sign-in*, /sign-up*) on a
 *   SITE host → 307 to APP_URL + path (clean routing into the portal).
 * - `/api/*`, `/_next/*` and static assets are NEVER redirected: webhooks
 *   and the chatbot widget (embeds on customer sites) must keep working from
 *   both hosts during the transition.
 * - Unknown hosts (localhost, Vercel previews) are never redirected.
 *
 * @returns the absolute redirect URL, or null when no redirect applies.
 */
export function resolveSubdomainRedirect(opts: {
  host: string | undefined | null;
  pathname: string;
  search?: string;
  siteUrl?: string;
  appUrl?: string;
}): string | null {
  const { host, pathname, search = "" } = opts;
  const siteUrl = opts.siteUrl ?? SITE_URL;
  const appUrl = opts.appUrl ?? APP_URL;
  // normalizeHost strips ports + lowercase + leading "www.", so both
  // canonical hosts are compared in the same normalized space.
  const siteHost = normalizeHost(new URL(siteUrl).hostname);
  const appHost = normalizeHost(new URL(appUrl).hostname || "");
  const splitActive = siteHost !== "" && appHost !== "" && appHost !== siteHost;

  if (!host || !splitActive) return null;

  const h = normalizeHost(host);
  // Unknown hosts (localhost, previews) — no canonical enforcement.
  if (h !== siteHost && h !== appHost) return null;

  // Never redirect API/asset paths — both hosts serve them during transition.
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/")) return null;
  // Static files (favicons, images, manifests) stay where they are.
  if (pathname.includes(".")) return null;

  const isMarketingPath =
    pathname === "/" ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/docs");
  const isAppPath =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up");

  // Marketing page requested on the app subdomain → site host.
  if (isMarketingPath && h === appHost) {
    return `${siteUrl}${pathname === "/" ? "" : pathname}${search}`;
  }
  // App page requested on the site host → app subdomain.
  if (isAppPath && h === siteHost) {
    return `${appUrl}${pathname}${search}`;
  }
  return null;
}