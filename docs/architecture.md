# Architecture

BriefcaseOS Onboarding is organized around a provider-neutral candidate domain.

```mermaid
flowchart LR
  UI[React five-step wizard] --> Draft[Browser draft store]
  UI --> Client[Extraction client]
  UI --> Export[Candidate JSON and YAML]
  Client --> API[Generic Node API]
  API --> Router[Provider router]
  Router --> Demo[Deterministic demo provider]
  Router --> Gemini[Optional server-only Gemini adapter]
```

## Boundaries

- The hosted portfolio path uses the deterministic provider and requires no secret.
- Candidate exports contain candidate facts, preferences, scoring policy, and authorization boundaries.
- Provider selection, API keys, model names, endpoints, interface preferences, raw source text, and uploaded bytes are excluded from candidate exports.
- The live adapter is server-only and enabled through local environment variables.
- No hosting-vendor adapter is part of the baseline repository.
