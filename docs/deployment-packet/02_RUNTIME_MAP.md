# Runtime Map

## Before

`server/app.ts` owned environment loading, provider construction, JSON parsing, request validation, consent gating in the browser only, provider invocation, error mapping, static hosting, SPA fallback, health/capabilities responses, and process startup.

## After

- `server/extraction-service.ts` owns provider selection, deterministic fallback, optional live configuration, request validation, consent enforcement, bounded limits, and timeout policy without Express types.
- `server/providers.ts` remains the provider implementation layer and now accepts the configured live timeout.
- `server/app.ts` is a local Node adapter that registers the existing API routes and retains Vite/Express development hosting.
- `functions/api/` is the Cloudflare Pages adapter for health, capabilities, and `POST /api/parse-resume`.
- Vite output is static Pages content; no Node process or persistent service is required for production.

## Responsibility classification

| Responsibility | Owner | Classification |
|---|---|---|
| Environment/provider selection | `server/extraction-service.ts` | Shared domain service |
| Demo/Gemini extraction | `server/providers.ts` | Shared provider logic |
| MIME, size, JSON-shape, and consent validation | `server/extraction-service.ts` plus thin body checks in Function | Shared validation plus HTTP adapter limits |
| Timeout and safe provider failure | Shared service/provider; adapter maps errors | Shared behavior |
| Express request/response objects | `server/app.ts` | Node adapter only |
| `app.listen`, dotenv, Vite middleware | `server/app.ts` | Node process/development only |
| Static files and SPA refreshes | Cloudflare Pages | Hosting layer |
| Health and capability responses | Both adapters using shared service config | Adapter endpoints |

## Compatibility assumptions

- The shared service uses Web Platform `TextEncoder`, promises, and `fetch`-compatible provider code.
- The Pages Function imports the existing TypeScript provider modules; no filesystem or Node process API is used by the Function.
- `wrangler` is a development dependency only; production requires Pages/Functions runtime support, not a Node server.
- Deterministic mode is selected when Gemini is absent, disabled, or not explicitly requested.

## Results

- `npm run typecheck`: pass.
- `npm test`: pass, 17 tests.
- `npm run build`: pass.
- Local Wrangler Pages runtime served the new Function routes; deterministic sample returned `200`, GET on parse route returned `405`, and capabilities reported demo mode.

## Deferred risks

- Preview deployment and Pages project creation remain pending.
- The existing production hostname is Worker-backed and has not been cut over.
- Live Gemini has only contract-level tests; public Gemini enablement remains deliberately deferred.
