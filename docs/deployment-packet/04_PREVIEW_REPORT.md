# Preview Report

## Cloudflare resources

- Pages project: `briefcase-os-onboarding`
- Production branch setting: `main`
- Preview branch: `cloudflare`
- Preview deployment: `7cd0b289-4355-4e5d-bc65-c594332049b0`
- Preview aliases reported by Cloudflare: `https://7cd0b289.briefcase-os-onboarding.pages.dev` and `https://cloudflare.briefcase-os-onboarding.pages.dev`
- Deployment source commit: `067bb33ae6e2b2b41b847dbf1623fc04eef6c1bd`
- Functions included: yes, according to the Pages deployment record
- Gemini state: disabled; preview environment has deterministic variables only and no key

## Configuration

- Static output: `dist`
- Compatibility date: `2026-07-31`
- Compatibility flags: none
- Usage model: bundled
- No KV, D1, R2, Queue, Durable Object, database, or analytics binding was created.

## Local Workers-compatible validation

Using `npx wrangler pages dev dist --port 8789 --compatibility-date 2026-07-31`:

- root page: `200`
- `GET /api/health`: `200`
- `GET /api/capabilities`: `200`, demo mode
- fictional Jordan Lee `POST /api/parse-resume`: `200`
- `GET /api/parse-resume`: `405`
- invalid content type: `415`
- security headers: CSP, `nosniff`, no-referrer, and frame protection present

## Preview status

Cloudflare control-plane deployment logs report `Success: Your site was deployed!` and `uses_functions: true`. However, direct HTTPS requests from this workstation to both preview aliases currently fail with a TLS handshake error (`SEC_E_ILLEGAL_MESSAGE` / TLS alert handshake failure); the project apex also returned `522` during the same check. Because the browser workflow, API, certificate, and network behavior cannot be inspected through that edge endpoint, preview acceptance is not claimed.

The production hostname `briefcase.devthomas.site` remains on its existing Worker-backed placeholder and was not modified. No custom domain was attached to Pages.

## Gate

Stage 04 is blocked pending successful HTTPS access to the Pages preview aliases. Required follow-up is to retry the preview edge checks from this environment or another current browser/network, then run desktop/mobile workflow, console/network, refresh, download, accessibility, and rollback checks before production cutover.
