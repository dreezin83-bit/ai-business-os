# Final release gate — main 0350b99
Date: 2026-08-06
Target: https://ai-business-os-six.vercel.app

## Live route evidence (no transactions)
- `/` → 200
- `/sign-up` → 200
- `/dashboard/settings` → 200
- `/api/paystack/checkout` GET → 405 (POST route deployed)
- `/api/subscription` GET → 401 (auth gate)
- `/api/webhooks/paystack` GET → 405 (POST route deployed)
- `/api/webhooks/flutterwave` GET → 405
- `/api/business/test/phone` GET → 401 (auth gate)

## Main commit evidence
Fetched `origin/main` at exact `0350b9908362ce9854101533282c343d44453445`:
`fix: add Clerk auth + tenant ownership check to /api/business/[id]/phone`.
The main tree contains Paystack routes/client, secured phone endpoint, and AI Voice Settings code.

## Gate failure: live content is stale/mismatched
Live `/sign-up` HTML explicitly contains `Start your free trial` (verified by curl response body). This violates the no-Free-Trial release requirement.

Main 0350b99 source also still contains Free Trial copy in landing page (`src/app/page.tsx`: `Free Trial`, `14-Day Free Trial`) and sign-up. It contains Settings pricing copy `$199/mo + $399 setup`, while live Settings bundle was not proven to expose current exact copy from unauthenticated HTML. The deployed live homepage is therefore not compliant with the no-trial gate even though route deployment is healthy.

## Recommendation
FAIL final release gate. Remove all Free Trial/14-Day Free Trial/sign-up trial copy from main, deploy the corrected commit, then repeat live-body verification. No payment or Vapi transactions were triggered.