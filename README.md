# BriefcaseOS Onboarding

A resume-first candidate intake that turns career evidence, constraints, scoring preferences, and agent guardrails into portable JSON and YAML.

> This public repository was rebuilt with fresh history. Private infrastructure, credentials, personal fixtures, and internal deployment material are intentionally excluded.

## What the demo shows

- A polished five-step React and TypeScript onboarding flow.
- A provenance-aware candidate decision model.
- Hard filters separated from ranking preferences.
- Candidate-controlled authorization boundaries.
- Deterministic sample extraction with no API key or real resume.
- An optional server-only Gemini adapter for local evaluation.
- Sanitized `candidate.json` and `candidate.yaml` exports.
- Dark and light themes, configurable accent color, responsive layout, and a document workbench.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The default `demo` provider works immediately.

### Optional live extraction

```bash
cp .env.example .env
# Set EXTRACTION_PROVIDER=gemini and provide your own server-side GEMINI_API_KEY.
npm run dev
```

The key is read only by the Node server. Do not prefix it with `VITE_` or place it in browser code.

## Verify

```bash
npm run typecheck
npm test
npm run build
```

## Privacy and limitations

The hosted portfolio path is intended to use deterministic fictional data. Drafts live in browser storage, raw uploaded bytes are not exported, and no server database is included. Live extraction is optional and requires explicit consent. This is not a production multi-tenant service and does not retrieve jobs, contact people, or submit applications.

See [architecture](docs/architecture.md), [privacy](docs/privacy.md), and the [clean-room note](docs/clean-room-note.md).
