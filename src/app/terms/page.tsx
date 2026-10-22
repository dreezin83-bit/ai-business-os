import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { DISCORD_INVITE_URL } from "@/components/landing/site-links";

export const metadata = {
  title: "Terms of Service | Sagenify AI",
  description:
    "The Terms of Service that govern your use of the Sagenify AI platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-slate-50 overflow-x-hidden">
      {/* Fixed header — same nav pattern as the landing site */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/85 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-purple-500 flex items-center justify-center text-[10px] font-bold text-white shadow-lg shadow-purple-500/30">
              AI
            </div>
            <span className="font-semibold text-[15px] tracking-tight">
              Sagenify AI
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-[13px] text-slate-400">
            <a href="/#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="/docs" className="hover:text-white transition-colors">
              Docs
            </a>
          </nav>
          <Link
            href="/sign-up"
            className="bg-purple-500 hover:bg-purple-400 text-white font-semibold text-xs h-9 px-5 rounded-full inline-flex items-center justify-center transition-colors"
          >
            Get Started
          </Link>
        </div>
      </header>

      <main className="relative pt-32 pb-20 max-w-3xl mx-auto px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-white transition-colors mb-8"
        >
          ← Back to home
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
          Terms of Service
        </h1>
        <p className="text-xs text-slate-500 mb-10">Last updated: October 2026</p>

        <div className="space-y-8 text-sm text-slate-400 leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-white mb-2">1. Agreement</h2>
            <p>
              By creating an account or using Sagenify AI (the &quot;Service&quot;), you agree to
              these Terms of Service. If you are using the Service on behalf of a business, you
              represent that you have authority to bind that business to these terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">2. The Service</h2>
            <p>
              Sagenify AI provides an AI-powered platform for service businesses, including website
              chatbots, phone receptionist features, lead and appointment management, email
              automation, knowledge base tools, and related reporting. We may update, add, or remove
              features from time to time.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">3. Accounts and Responsibilities</h2>
            <p>
              You are responsible for maintaining the confidentiality of your login credentials and
              for all activity that occurs under your account. You agree to provide accurate
              information and to keep it up to date. You are responsible for the content you upload
              to the Service and for complying with all applicable laws in your use of it.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">4. Subscriptions and Payments</h2>
            <p>
              Access to the Service is provided on a subscription basis. Fees are displayed at
              checkout before you subscribe and are processed through our payment provider.
              Subscriptions renew automatically until cancelled. If payment is not received, access
              to the Service may be suspended until the account is brought up to date.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">5. Acceptable Use</h2>
            <p>
              You agree not to misuse the Service — for example, by attempting to disrupt or
              compromise it, scraping data beyond normal use, using it to send unsolicited bulk
              communications, or using it for any unlawful purpose. We reserve the right to suspend
              or terminate accounts that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">6. Intellectual Property</h2>
            <p>
              The Service, including its software, design, and branding, is owned by Sagenify AI and
              its licensors. You retain ownership of the content you upload. By uploading content,
              you grant us the limited right to process and store it solely to provide the Service
              to you.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">7. Disclaimers and Limitation of Liability</h2>
            <p>
              The Service is provided &quot;as is&quot; without warranties of any kind. AI-generated
              content and communications may contain errors, and you are responsible for reviewing
              automated messages before they are sent. To the maximum extent permitted by law,
              Sagenify AI shall not be liable for indirect, incidental, or consequential damages
              arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">8. Termination</h2>
            <p>
              You may cancel your subscription at any time. We may suspend or terminate access for
              violation of these terms. Sections that by their nature should survive termination —
              including payment obligations and limitation of liability — will survive.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">9. Contact</h2>
            <p>
              Questions about these Terms can be sent to{" "}
              <a
                href="mailto:notifications@sagenifyai.com"
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                notifications@sagenifyai.com
              </a>
              , or join our community for support on{" "}
              <a
                href={DISCORD_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
              >
                <MessagesSquare className="h-3 w-3" /> Discord
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-white/[0.04] py-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-600">
          <span>© 2026 Sagenify AI</span>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
            <Link href="/docs" className="hover:text-white transition-colors">
              Docs
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}