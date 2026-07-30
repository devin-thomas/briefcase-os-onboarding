import dotenv from 'dotenv';
import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import type { ResumeExtractionRequest } from '../src/domain';
import { DemoResumeProvider, GeminiResumeProvider, type ResumeExtractionProvider } from './providers';

dotenv.config();
const root = process.cwd();
const providerName = process.env.EXTRACTION_PROVIDER === 'gemini' ? 'gemini' : 'demo';
const provider: ResumeExtractionProvider = providerName === 'gemini'
  ? new GeminiResumeProvider(process.env.GEMINI_API_KEY || '', process.env.GEMINI_MODEL || 'gemini-2.5-flash')
  : new DemoResumeProvider();

const jsonError = (response: express.Response, status: number, code: string, message: string) => response.status(status).json({ error: { code, message } });

async function start() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '9mb' }));

  app.get('/api/health', (_request, response) => response.json({ ok: true }));
  app.get('/api/capabilities', (_request, response) => response.json({
    resumeExtraction: {
      available: true,
      mode: provider.mode,
      processorLabel: provider.mode === 'live' ? 'Google Gemini' : undefined,
      supports: provider.mode === 'live' ? ['sample', 'pasted-text', 'application/pdf'] : ['sample', 'pasted-text'],
    },
  }));

  app.post('/api/parse-resume', async (request, response) => {
    try {
      const payload = request.body as ResumeExtractionRequest;
      if (!payload || !Array.isArray(payload.artifacts) || typeof payload.typedResume !== 'string') {
        return jsonError(response, 400, 'INVALID_REQUEST', 'The resume request is incomplete.');
      }
      if (payload.artifacts.some((item) => item.sizeBytes > 8 * 1024 * 1024)) {
        return jsonError(response, 413, 'PAYLOAD_TOO_LARGE', 'Each uploaded file must be 8 MB or smaller.');
      }
      if (payload.artifacts.some((item) => !['application/pdf', 'text/plain', 'text/markdown'].includes(item.mimeType))) {
        return jsonError(response, 415, 'UNSUPPORTED_FILE', 'Use PDF, plain text, or Markdown.');
      }
      return response.json(await provider.extract(payload));
    } catch (error) {
      console.error('resume-extraction-failed', { message: error instanceof Error ? error.message : 'unknown' });
      return jsonError(response, 502, 'EXTRACTION_UNAVAILABLE', error instanceof Error ? error.message : 'Resume extraction is unavailable.');
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const dist = path.join(root, 'dist');
    app.use(express.static(dist, { index: false }));
    app.get('*', (_request, response) => response.sendFile(path.join(dist, 'index.html')));
  } else {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }

  app.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('BriefcaseOS onboarding is ready.'));
}

void start();
