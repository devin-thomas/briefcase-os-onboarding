import { json, safeError, serviceFor, type PagesContext } from './_shared';

export const onRequestPost = async ({ request, env }: PagesContext) => {
  try {
    const service = serviceFor(env);
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > service.maxUploadBytes + 512 * 1024) return json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'The resume request exceeds the configured size limit.' } }, { status: 413 });
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return json({ error: { code: 'UNSUPPORTED_CONTENT_TYPE', message: 'Send the resume request as JSON.' } }, { status: 415 });
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > service.maxUploadBytes + 512 * 1024) return json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'The resume request exceeds the configured size limit.' } }, { status: 413 });
    let payload: unknown;
    try { payload = JSON.parse(body); } catch { return json({ error: { code: 'INVALID_REQUEST', message: 'The resume request is not valid JSON.' } }, { status: 400 }); }
    return json(await service.parseResume(payload as Parameters<typeof service.parseResume>[0]));
  } catch (error) {
    return safeError(error);
  }
};

export const onRequest = async (context: PagesContext) => context.request.method === 'POST'
  ? onRequestPost(context)
  : json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST for resume extraction.' } }, { status: 405, headers: { Allow: 'POST' } });
