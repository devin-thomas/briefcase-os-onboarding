# Privacy model

The public demo is sample-first and works without a real resume.

- Draft candidate data is stored only in the current browser.
- **Clear local data** removes the current draft and known legacy keys.
- Raw uploaded file bytes are held in memory only long enough to request extraction.
- Candidate exports retain artifact metadata but omit raw bytes and full source text.
- Demo mode makes no external model request.
- Optional live mode requires explicit consent and a server-side Gemini secret. The production kill switch is off by default.
- When live mode is enabled, submitted resume content is sent to the configured Gemini provider for the requested extraction and is not retained by this application.
- The server logs only a normalized extraction failure message, never the resume body, candidate output, contact details, or provider secret.

This is a portfolio demonstration, not a production multi-tenant service.
