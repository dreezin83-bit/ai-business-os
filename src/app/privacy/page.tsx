import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { DISCORD_INVITE_URL } from "@/components/landing/site-links";

export const metadata = {
  title: "Privacy Policy | Sagenify AI",
  description:
    "The Privacy Policy describing how Sagenify AI collects and uses your information.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-slate-50 overflow-x-hidden">
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
          Privacy Policy
        </h1>
        <p className="text-xs text-slate-500 mb-10">Last updated: October 2026</p>

        <div className="space-y-8 text-sm text-slate-400 leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-white mb-2">1. Information We Collect</h2>
            <p>
              When you use Sagenify AI, we collect information you provide directly — such as your
              business details, contact information, and content you upload (for example, knowledge
              base documents) — as well as information generated through the platform, including AI
              conversations, leads, appointments, and call history associated with your account.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">2. How We Use Information</h2>
            <p>
              We use the information we collect to operate and improve the platform: providing the AI
              chatbot, phone receptionist, lead management, appointment booking, email automation,
              and reporting features; processing payments; sending service notifications; and
              providing support.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">3. Sharing of Information</h2>
            <p>
              We do not sell your personal information. We share data only with trusted service
              providers who help us run the platform — such as hosting, authentication, payment
              processing, email delivery, and AI model providers — and only to the extent needed to
              provide the service. We may also disclose information where required by law.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">4. Data Security</h2>
            <p>
              We use industry-standard safeguards to protect your data, including encrypted
              transmission and restricted access controls. No method of transmission or storage is
              completely secure, but we work to protect the information we hold.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">5. Data Retention</h2>
            <p>
              We retain account and usage data for as long as your account is active or as needed to
              provide the service, comply with legal obligations, resolve disputes, and enforce our
              agreements. You may request deletion of your data as described below.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">6. Your Rights</h2>
            <p>
              You can access, correct, or request deletion of your personal information at any time
              by contacting us at{" "}
              <a
                href="mailto:notifications@sagenifyai.com"
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                notifications@sagenifyai.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">7. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will post any changes on this
              page and update the &quot;Last updated&quot; date above.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">8. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, contact us at{" "}
              <a
                href="mailto:notifications@sagenifyai.com"
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                notifications@sagenifyai.com
              </a>
              , or reach the community on{" "}
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
