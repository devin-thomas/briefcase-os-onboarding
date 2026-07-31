import dotenv from 'dotenv';
import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { ExtractionRequestError, createExtractionService } from './extraction-service';

dotenv.config();
const root = process.cwd();
const service = createExtractionService(process.env);

const jsonError = (response: express.Response, status: number, code: string, message: string) => response.status(status).json({ error: { code, message } });

export function registerApiRoutes(app: express.Express) {
  app.get('/api/health', (_request, response) => response.json({ ok: true }));
  app.get('/api/capabilities', (_request, response) => response.json(service.capabilities));
  app.post('/api/parse-resume', async (request, response) => {
    try {
      return response.json(await service.parseResume(request.body));
    } catch (error) {
      if (error instanceof ExtractionRequestError) return jsonError(response, error.status, error.code, error.message);
      console.error('resume-extraction-failed', { message: error instanceof Error ? error.message : 'unknown' });
      return jsonError(response, 502, 'EXTRACTION_UNAVAILABLE', error instanceof Error ? error.message : 'Resume extraction is unavailable.');
    }
  });
}

async function start() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '9mb' }));
  registerApiRoutes(app);

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
