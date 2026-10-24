import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/domains";

/**
 * robots.txt — allow all crawlers and point them at the sitemap.
 * Base URL resolved exactly as in src/app/layout.tsx.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}