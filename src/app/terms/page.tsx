import Link from "next/link";

export const metadata = {
  title: "Terms of Service | Sagenify AI",
  description: "Terms of Service for Sagenify AI",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <Link href="/" className="text-xs text-white/40 hover:text-white/70 transition-colors">
          ← Back to home
        </Link>
        <h1 className="text-3xl font-bold tracking-tight mt-6 mb-2">Terms of Service</h1>
        <p className="text-xs text-white/30 mb-10">Last updated: August 2026</p>

        <div className="space-y-8 text-sm text-white/60 leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-white mb-2">1. Agreement</h2>
            <p>
              By creating an account or using Sagenify AI (the &quot;Service&quot;), you agree to these Terms
              of Service. If you are using the Service on behalf of a business, you represent that you have
              authority to bind that business to these terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">2. The Service</h2>
            <p>
              Sagenify AI provides an AI-powered platform for service businesses, including website
              chatbots, phone receptionist features, lead and appointment management, email automation,
              knowledge base tools, and related reporting. We may update, add, or remove features from time
              to time.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">3. Accounts and Responsibilities</h2>
            <p>
              You are responsible for maintaining the confidentiality of your login credentials and for all
              activity that occurs under your account. You agree to provide accurate information and to keep
              it up to date. You are responsible for the content you upload to the Service and for complying
              with all applicable laws in your use of it.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">4. Subscriptions and Payments</h2>
            <p>
              Access to the Service is provided on a subscription basis. Fees are displayed at checkout
              before you subscribe and are processed through our payment provider. Subscriptions renew
              automatically until cancelled. If payment is not received, access to the Service may be
              suspended until the account is brought up to date.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">5. Acceptable Use</h2>
            <p>
              You agree not to misuse the Service — for example, by attempting to disrupt or compromise it,
              scraping data beyond normal use, using it to send unsolicited bulk communications, or using it
              for any unlawful purpose. We reserve the right to suspend or terminate accounts that violate
              these terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">6. Intellectual Property</h2>
            <p>
              The Service, including its software, design, and branding, is owned by Sagenify AI and its
              licensors. You retain ownership of the content you upload. By uploading content, you grant us
              the limited right to process and store it solely to provide the Service to you.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">7. Disclaimers and Limitation of Liability</h2>
            <p>
              The Service is provided &quot;as is&quot; without warranties of any kind. AI-generated content
              and communications may contain errors, and you are responsible for reviewing automated
              messages before they are sent. To the maximum extent permitted by law, Sagenify AI shall not be
              liable for indirect, incidental, or consequential damages arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">8. Termination</h2>
            <p>
              You may cancel your subscription at any time. We may suspend or terminate access for violation
              of these terms. Sections that by their nature should survive termination — including payment
              obligations and limitation of liability — will survive.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">9. Contact</h2>
            <p>
              Questions about these Terms can be sent to{" "}
              <a href="mailto:notifications@sagenifyai.com" className="text-blue-400 hover:text-blue-300 transition-colors">
                notifications@sagenifyai.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
