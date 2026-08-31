import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/toaster";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

/**
 * App-facing layout for authenticated + auth routes (dashboard, sign-in,
 * sign-up, onboarding). This deliberately lives in its own route group
 * `(app)` so the Clerk browser SDK, ThemeProvider, Toaster and Vercel
 * analytics do NOT load on the public marketing pages (/, /privacy, /terms).
 *
 * The public landing page is served under the bare root layout only, which
 * keeps Clerk + analytics JS out of the marketing bundle — see the task
 * "Fix landing-page load performance (client-side JS weight)".
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        <Toaster>{children}</Toaster>
        <Analytics />
        <SpeedInsights />
      </ThemeProvider>
    </ClerkProvider>
  );
}
