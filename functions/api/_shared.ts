import { createExtractionService, ExtractionRequestError, withTimeout } from '../../server/extraction-service';

export type CloudflareEnv = Record<string, string | undefined>;
export type PagesContext = { request: Request; env: CloudflareEnv };

export const serviceFor = (env: CloudflareEnv) => createExtractionService(env);

export function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function safeError(error: unknown) {
  if (error instanceof ExtractionRequestError) return json({ error: { code: error.code, message: error.message } }, { status: error.status });
  return json({ error: { code: 'EXTRACTION_UNAVAILABLE', message: error instanceof Error ? error.message : 'Resume extraction is unavailable.' } }, { status: 502 });
}

export { withTimeout };
