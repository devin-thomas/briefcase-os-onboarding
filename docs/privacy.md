# Privacy model

The public demo is sample-first and works without a real resume.

- Draft candidate data is stored only in the current browser.
- **Clear local data** removes the current draft and known legacy keys.
- Raw uploaded file bytes are held in memory only long enough to request extraction.
- Candidate exports retain artifact metadata but omit raw bytes and full source text.
- Demo mode makes no external model request.
- Optional live mode requires explicit consent and a user-supplied server-side Gemini key.
- The server logs only a normalized extraction failure message, never the resume body or contact details.

This is a portfolio demonstration, not a production multi-tenant service.
