# Baseline Report

## Source and branch

- Repository: `devin-thomas/briefcase-os-onboarding`
- Baseline commit: `ee33fbef5a9df702860a05c8d69bbc58cab54f53`
- Working branch: `cloudflare`
- Baseline source is the public clean-room repository. No private repository was inspected or used.

## Commands

| Command | Result |
|---|---|
| `npm ci` | Pass; 177 packages audited, 0 vulnerabilities |
| `npm run verify` | Pass; typecheck, 13 unit tests, Vite/Node build, public audit |
| `npm run test:e2e` | Pass; 2 tests covering Chromium desktop and mobile |
| `npm run licenses` | Pass; inventory written for 170 installed packages |

The E2E browser was not initially installed; the repository-local Playwright Chromium browser was installed, then the unchanged E2E command passed. No source behavior was changed for this setup step.

## Current API contract

`POST /api/parse-resume` accepts JSON with:

```ts
{
  sampleId?: string;
  typedResume: string;
  artifacts: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    addedAt: string;
    dataBase64?: string;
    plainText?: string;
  }>;
}
```

Success returns the existing `ResumeExtractionResult` contract with optional identity/current location, parsed resume fields, and metadata. Current error mappings are `400 INVALID_REQUEST`, `413 PAYLOAD_TOO_LARGE`, `415 UNSUPPORTED_FILE`, and `502 EXTRACTION_UNAVAILABLE`. `/api/health` and `/api/capabilities` are also exposed by Express.

## Provider and privacy findings

- Demo mode is selected unless `EXTRACTION_PROVIDER=gemini`; it requires no credential and returns the fictional Jordan Lee sample deterministically.
- Gemini is instantiated only in the server process from `GEMINI_API_KEY`; no `VITE_` secret path exists.
- Uploaded bytes are carried in the request object and are not persisted by the current application; browser drafts retain metadata/source text according to the existing product contract.
- Candidate exports omit provider configuration and embedded uploaded bytes.
- The browser calls only the same-origin extraction endpoint and capabilities endpoint.

## Migration risks

- Express currently combines provider construction, JSON parsing, validation, response/error mapping, static hosting, and process startup in `server/app.ts`.
- The Gemini adapter uses Node-compatible `AbortSignal.timeout` and a hardcoded 55-second timeout; the Cloudflare adapter needs an explicit bounded timeout policy.
- There is no Cloudflare configuration or Pages project in the repository/account yet.
- The production hostname already serves a noindex Worker-backed Briefcase placeholder. It has not been changed; preview validation must precede any cutover.

## Baseline evidence

The existing committed UI evidence under `docs/images/` remains the comparison set for desktop entry, profile review, completion workbench, and mobile onboarding. The passing Playwright run exercised the fictional sample path at desktop and iPhone-sized viewports.
