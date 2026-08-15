import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["openai", "pdf-parse", "mammoth", "cheerio"],
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      // Content-hashed build assets: cache in browser + CDN for a year.
      // Every deployment generates new hashes, so long max-age is safe and
      // eliminates revalidation round-trips on repeat visits.
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // Genuinely static marketing/legal routes (landing, privacy, terms).
      // They are prerendered at build time with no user-specific content, so
      // a CDN cache with stale-while-revalidate gives instant repeat loads.
      // Do NOT extend this to /dashboard, /api/*, auth routes, or anything
      // user-specific — those must never be cached publicly.
      {
        source: "/:path((privacy|terms)?)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=31536000, stale-while-revalidate=31536000",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
