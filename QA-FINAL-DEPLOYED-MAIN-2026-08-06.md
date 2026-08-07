# Final deployed-main release verification
Date: 2026-08-06
Target: https://ai-business-os-six.vercel.app

## Deployment route evidence
- `/api/paystack/checkout` GET → 405 (route exists; POST-only)
- `/api/subscription` GET → 401 (route exists; auth gate)
- `/api/webhooks/paystack` GET → 405 (route exists; POST-only)
- `/api/webhooks/flutterwave` GET → 405 (disabled POST-only handler)
- `/api/webhooks/twilio` GET → 405 (POST-only)
- `/api/business/test/phone` GET → 401 (secured phone endpoint)
- `/dashboard/settings` GET → 200

## Source/deployment evidence
Local checkout is `cc4751c` on `feature/subscribe-cta-paystack`; it contains Paystack checkout, subscription API, Paystack webhook, and Paystack client. `git fetch` in this checkout exposes only `origin/feature/subscribe-cta-paystack`; no origin/main ref is available, so the exact Vercel commit cannot be independently resolved from this shallow checkout. Route behavior above proves Paystack routes are deployed.

Verified source requirements:
- Paystack checkout documents $399 one-time setup + $199/month recurring, amounts 39,900/19,900 cents.
- Settings CTA says “Subscribe Now — $399 first month” and modal shows “then $199/month”.
- Flutterwave handler is disabled with “Flutterwave is no longer supported — use Paystack”.
- `/api/business/[id]/phone` uses Clerk `auth()`, `ensureBusiness()`, ownership comparison, and returns 401/403 as appropriate.
- Settings AI Voice card and status states are present.

## Pricing copy regression
`src/app/sign-up/page.tsx` still contains “Start your free trial”. This conflicts with the no-Free-Trial requirement, even though landing page Free Trial CTAs were removed. Must remove/reword before release.

## Recommendation
Payment routes, pricing, disabled Flutterwave handler, secured phone endpoint, and AI Voice card are deployed and route-accessible. Release has one remaining copy blocker: remove “Start your free trial” from sign-up. Exact Vercel deployment SHA needs dashboard/provider confirmation because local repository is shallow and lacks origin/main.