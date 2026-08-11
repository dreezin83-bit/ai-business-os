import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Sagenify AI",
  description: "Privacy Policy for Sagenify AI",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <Link href="/" className="text-xs text-white/40 hover:text-white/70 transition-colors">
          ← Back to home
        </Link>
        <h1 className="text-3xl font-bold tracking-tight mt-6 mb-2">Privacy Policy</h1>
        <p className="text-xs text-white/30 mb-10">Last updated: August 2026</p>

        <div className="space-y-8 text-sm text-white/60 leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-white mb-2">1. Information We Collect</h2>
            <p>
              When you use Sagenify AI, we collect information you provide directly — such as your business
              details, contact information, and content you upload (for example, knowledge base documents) —
              as well as information generated through the platform, including AI conversations, leads,
              appointments, and call history associated with your account.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">2. How We Use Information</h2>
            <p>
              We use the information we collect to operate and improve the platform: providing the AI
              chatbot, phone receptionist, lead management, appointment booking, email automation, and
              reporting features; processing payments; sending service notifications; and providing support.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">3. Sharing of Information</h2>
            <p>
              We do not sell your personal information. We share data only with trusted service providers
              who help us run the platform — such as hosting, authentication, payment processing, email
              delivery, and AI model providers — and only to the extent needed to provide the service. We
              may also disclose information where required by law.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">4. Data Security</h2>
            <p>
              We use industry-standard safeguards to protect your data, including encrypted transmission and
              restricted access controls. No method of transmission or storage is completely secure, but we
              work to protect the information we hold.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">5. Data Retention</h2>
            <p>
              We retain account and usage data for as long as your account is active or as needed to provide
              the service, comply with legal obligations, resolve disputes, and enforce our agreements. You
              may request deletion of your data as described below.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">6. Your Rights</h2>
            <p>
              You can access, correct, or request deletion of your personal information at any time by
              contacting us at{" "}
              <a href="mailto:notifications@sagenifyai.com" className="text-blue-400 hover:text-blue-300 transition-colors">
                notifications@sagenifyai.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">7. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will post any changes on this page and
              update the &quot;Last updated&quot; date above.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">8. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, contact us at{" "}
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
