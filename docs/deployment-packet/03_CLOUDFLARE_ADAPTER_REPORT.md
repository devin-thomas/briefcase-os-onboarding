# Cloudflare Adapter Report

## Routes

- `functions/api/health.ts` serves `GET /api/health`.
- `functions/api/capabilities.ts` reports the server-selected provider mode.
- `functions/api/parse-resume.ts` serves `POST /api/parse-resume` and explicitly returns `405` for other methods.
- All three routes call `server/extraction-service.ts`; extraction logic is not duplicated in the adapter.

## Configuration

`wrangler.toml` sets the Pages output directory to `dist`, uses compatibility date `2026-07-31`, and defines safe deterministic defaults. The checked-in configuration contains no secret. `wrangler` is pinned through `package.json`/`package-lock.json` at the installed major version.

The optional runtime values are:

- `EXTRACTION_PROVIDER` and `ENABLE_LIVE_EXTRACTION` for explicit mode selection;
- `GEMINI_MODEL`, `MAX_UPLOAD_BYTES`, and `LIVE_EXTRACTION_TIMEOUT_MS` for server-side operation;
- `GEMINI_API_KEY` is intentionally not declared in the checked-in configuration and must be an encrypted deployment secret if live mode is ever enabled.

## Security behavior

- The Function rejects non-JSON content, oversized bodies, invalid JSON, unsupported methods, invalid MIME types, oversized resume text, and missing live consent.
- The browser-facing `_headers` file sets `nosniff`, no-referrer, restrictive permissions, clickjacking protection, and a same-origin CSP.
- Errors omit stack traces, provider response bodies, prompts, and secrets.
- Deterministic mode requires no Gemini secret and remains the fallback if the secret or kill switch is absent.
- Uploaded data is processed in memory by the existing provider contract; no KV, D1, R2, database, or queue was added.

## Local evidence

Using `npx wrangler pages dev dist --port 8789 --compatibility-date 2026-07-31`:

- `POST /api/parse-resume` with the fictional Jordan Lee sample: `200`.
- `GET /api/parse-resume`: `405 Method Not Allowed`.
- `GET /api/capabilities`: `200`, deterministic demo mode.
- Root page: `200` with CSP and `X-Content-Type-Options: nosniff` headers.

## Known limitations

- No Pages project or preview deployment has been created yet.
- The production custom domain remains attached to an existing Worker-backed placeholder and is intentionally unchanged.
- Public Gemini mode, rate limiting/Turnstile, and production domain cutover require the preview and operational gates.
