import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["openai", "pdf-parse", "mammoth", "cheerio"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
