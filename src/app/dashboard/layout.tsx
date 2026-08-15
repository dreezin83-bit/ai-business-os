"use client";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CurrentBusiness {
  servicesConfigured?: boolean;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [setupIncomplete, setSetupIncomplete] = useState(false);
  const [setupBannerDismissed, setSetupBannerDismissed] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  // Check whether the business still needs setup (no services yet). This is
  // the same gate the chat route uses (isConfigured): once services exist,
  // the AI can qualify leads — before that, point the owner at /onboarding.
  useEffect(() => {
    let cancelled = false;
    if (!isSignedIn) return;
    fetch("/api/business/current")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: CurrentBusiness | null) => {
        if (!cancelled && d && d.servicesConfigured === false) {
          setSetupIncomplete(true);
        }
      })
      .catch(() => {
        // Non-blocking: banner is a nicety, never block the dashboard on it.
      });
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  // Hold the shell until Clerk has loaded auth state. This prevents the
  // signed-out "app shell + error boundary" flash: unauthenticated visitors
  // are redirected to /sign-in instead of rendering the dashboard chrome
  // (which would then 401 on /api/dashboard/stats).
  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px]" />
      </div>
      <Sidebar />
      <main className="md:pl-64 min-h-screen relative">
        <div className="p-4 md:p-8 max-w-7xl mx-auto pt-16 md:pt-8">
          {setupIncomplete && !setupBannerDismissed && (
            <div className="relative mb-6 overflow-hidden rounded-2xl border border-blue-500/25 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 p-4 md:p-5">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(99,102,241,0.15),transparent_60%)]" />
              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/15">
                    <Sparkles className="h-5 w-5 text-blue-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Complete your setup
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Add your services so your AI can qualify leads and book
                      appointments for you.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:ml-auto shrink-0">
                  <Link href="/onboarding">
                    <Button
                      size="sm"
                      className="h-8 rounded-full bg-white px-4 text-xs font-semibold text-black hover:bg-white/90"
                    >
                      Go to setup <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                  <button
                    onClick={() => setSetupBannerDismissed(true)}
                    aria-label="Dismiss setup reminder"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
