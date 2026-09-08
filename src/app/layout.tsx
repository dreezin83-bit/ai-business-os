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

export const metadata: Metadata = {
  title: "Sagenify AI",
  description: "AI-powered platform for service businesses",
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
