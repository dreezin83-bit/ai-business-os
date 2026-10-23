import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

/**
 * Root layout — minimal shell shared by every route.
 *
 * This deliberately does NOT include ClerkProvider, ThemeProvider, Toaster or
 * the Vercel Analytics/SpeedInsights scripts. Those are provided only to
 * authenticated/auth routes via the `(app)` route-group layout, so the public
 * marketing page (/, /privacy, /terms) does not download the Clerk browser
 * SDK or analytics SDK. This is the core of the landing-page load-perf fix.
 */
const inter = Inter({ subsets: ["latin"] });

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.sagenifyai.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Sagenify AI",
  description: "AI-powered platform for service businesses",
  applicationName: "Sagenify AI",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Sagenify AI — Never miss another customer again.",
    description:
      "AI answers your calls and chats 24/7, qualifies every lead, books appointments, and follows up automatically — so no customer ever slips through the cracks.",
    type: "website",
    siteName: "Sagenify AI",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Sagenify AI — your AI office manager",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sagenify AI — Never miss another customer again.",
    description:
      "AI answers your calls and chats 24/7, qualifies every lead, books appointments, and follows up automatically — so no customer ever slips through the cracks.",
    images: ["/opengraph-image.png"],
  },
};

export const viewport = {
  themeColor: "#050508",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
