# Production Release Report

- Production URL: `https://briefcase.devthomas.site`
- Pages project: `briefcase-os-onboarding`
- Production deployment: `129eaefe-99f1-4e2c-9105-d36635874e13`
- Production artifact commit: `191d736d06b58e628d2af4f5849e9bfdbfd5210f`
- Custom-domain status: active
- Certificate status: active; Pages validation reports active
- DNS: proxied CNAME `briefcase.devthomas.site` -> `briefcase-os-onboarding.pages.dev`
- Deterministic provider: enabled and verified with the fictional Jordan Lee request
- Gemini provider: implemented, disabled in production, and not required for the public path

## Production verification

- Root HTML: `200`
- `/api/health`: `200` with `{"ok":true}`
- `/api/capabilities`: `200`, demo mode
- `/api/parse-resume` fictional sample: `200`
- Unsupported method: `405`
- Unsupported content type: `415`
- Candidate schema: `200`
- Referenced JavaScript/CSS assets: `200`
- Security headers: CSP, `nosniff`, `DENY` framing, and no-referrer present
- Desktop Playwright journey: passed
- Mobile Playwright journey: passed
- Accessibility: no serious or critical violations in the journey
- Browser console: clean in both production viewport runs

## Deliberately deferred

- Gemini is not enabled because the deterministic public path is the required default and no production live-usage decision has been recorded.
- Portfolio card integration, operations rehearsal, and final acceptance documentation remain separate packet stages.

## Rollback

The last known-good Pages deployment is `129eaefe`. Use the Pages deployment rollback action for `briefcase-os-onboarding`, then verify the custom domain and deterministic API before considering Gemini enablement.
