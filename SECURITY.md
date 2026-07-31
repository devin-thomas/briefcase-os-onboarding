# Security policy

## Supported scope

This repository is a portfolio demonstration and reference implementation. The deterministic fictional-data path is the supported public configuration. The optional live extraction adapter is intended for local or self-hosted evaluation with an operator-supplied server environment.

## Credential handling

- Never commit API keys, tokens, account identifiers, deployment credentials, or populated `.env` files.
- Never expose a server credential through a `VITE_*` variable or browser bundle.
- Store optional live-provider credentials only in the local environment or the deployment platform's secret manager.
- Rotate a credential immediately when exposure is suspected.
- The public demo does not require an API key.
- Production endpoint: `POST https://briefcase.devthomas.site/api/parse-resume`. Deterministic mode is the default; live mode requires explicit consent and server-side controls.

## Data handling

- Use the fictional sample when evaluating the public portfolio flow.
- Candidate drafts are browser-local.
- Raw uploaded file bytes are not written to local storage or candidate exports.
- Live extraction sends submitted content to the configured server and provider only after explicit consent.
- Do not treat this project as a production system for sensitive applicant data without adding authentication, authorization, retention controls, rate limiting, abuse prevention, monitoring, and a formal privacy review.

## Reporting a vulnerability

Open a GitHub issue containing only a minimal, non-sensitive description and a request for a private follow-up channel. Do not post credentials, personal candidate information, exploit payloads containing sensitive data, or private deployment details in a public issue.
