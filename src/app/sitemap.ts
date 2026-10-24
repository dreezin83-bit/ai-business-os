import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/domains";

/**
 * sitemap.xml — public marketing pages only. Auth-gated routes
 * (/sign-in, /sign-up, /dashboard*, /api/*) are deliberately excluded:
 * they are private app pages and must not be crawled or indexed.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const BASE_URL = SITE_URL;
  return [
    {
      url: `${BASE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/docs`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}