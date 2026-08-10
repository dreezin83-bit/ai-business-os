# Production domain verification — sagenifyai.com

Verification performed 2026-08-10. No registrar DNS records were changed.

## Live evidence

- `sagenifyai.com` resolves to `216.198.79.1` plus an additional `208.91.197.27` record; HTTPS returns `308` from Vercel and redirects to `https://www.sagenifyai.com/`.
- `www.sagenifyai.com` resolves via CNAME `1c6479ed97efca31.vercel-dns-017.com`; HTTPS returns `200`, `server: Vercel`, with valid TLS.
- Canonical behavior is correct: apex → www over HTTPS.

## Vercel API access note

The available Vercel token currently returns `forbidden` for the `contractor-ai` scope, so project/domain assignment could not be independently read through the API in this session. The live HTTP response and Vercel DNS targets prove the domain is serving from Vercel, but the project association should be confirmed by an authorized project owner if needed.

## Repository update

Replaced stale `greatnesswebsolutions.com` references in `src/app/api/webhooks/email/route.ts` comments and default outbound sender with `notifications@sagenifyai.com`. Runtime sender remains overrideable via `EMAIL_FROM_ADDRESS`. No deployment was triggered because the domain is already serving the current Vercel deployment and the Vercel API token lacks project-scope authorization.

For Paystack/Vapi callbacks, set `NEXT_PUBLIC_APP_URL=https://www.sagenifyai.com` (or the chosen canonical URL) in the authorized Vercel project environment; do not expose secrets or change registrar DNS as part of this task.
