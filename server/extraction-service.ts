import type { CapabilityResponse, ResumeExtractionRequest, ResumeExtractionResult } from '../src/domain';
import { DemoResumeProvider, GeminiResumeProvider, type ResumeExtractionProvider } from './providers';

export type ExtractionEnvironment = {
  EXTRACTION_PROVIDER?: string;
  ENABLE_LIVE_EXTRACTION?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  MAX_UPLOAD_BYTES?: string;
  LIVE_EXTRACTION_TIMEOUT_MS?: string;
};

export type ExtractionService = {
  provider: ResumeExtractionProvider;
  capabilities: CapabilityResponse;
  maxUploadBytes: number;
  timeoutMs: number;
  parseResume(request: ResumeExtractionRequest): Promise<ResumeExtractionResult>;
};

const allowedMimeTypes = new Set(['application/pdf', 'text/plain', 'text/markdown']);
const truthy = (value: string | undefined) => ['1', 'true', 'yes', 'on'].includes((value || '').toLowerCase());
const boundedNumber = (value: string | undefined, fallback: number, minimum: number, maximum: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
};

export function createExtractionService(environment: ExtractionEnvironment): ExtractionService {
  const liveRequested = environment.EXTRACTION_PROVIDER === 'gemini' && truthy(environment.ENABLE_LIVE_EXTRACTION);
  const maxUploadBytes = boundedNumber(environment.MAX_UPLOAD_BYTES, 8 * 1024 * 1024, 64 * 1024, 8 * 1024 * 1024);
  const timeoutMs = boundedNumber(environment.LIVE_EXTRACTION_TIMEOUT_MS, 25_000, 1_000, 55_000);
  const provider: ResumeExtractionProvider = liveRequested && environment.GEMINI_API_KEY
    ? new GeminiResumeProvider(environment.GEMINI_API_KEY, environment.GEMINI_MODEL || 'gemini-2.5-flash', timeoutMs)
    : new DemoResumeProvider();

  return {
    provider,
    maxUploadBytes,
    timeoutMs,
    capabilities: {
      resumeExtraction: {
        available: true,
        mode: provider.mode,
        processorLabel: provider.mode === 'live' ? 'Google Gemini' : undefined,
        supports: provider.mode === 'live' ? ['sample', 'pasted-text', 'application/pdf'] : ['sample', 'pasted-text'],
      },
    },
    async parseResume(request) {
      if (!request || !Array.isArray(request.artifacts) || typeof request.typedResume !== 'string') {
        throw new ExtractionRequestError(400, 'INVALID_REQUEST', 'The resume request is incomplete.');
      }
      if (request.artifacts.some((item) => item.sizeBytes > maxUploadBytes)) {
        throw new ExtractionRequestError(413, 'PAYLOAD_TOO_LARGE', 'Each uploaded file exceeds the configured size limit.');
      }
      if (request.artifacts.some((item) => !allowedMimeTypes.has(item.mimeType))) {
        throw new ExtractionRequestError(415, 'UNSUPPORTED_FILE', 'Use PDF, plain text, or Markdown.');
      }
      if (new TextEncoder().encode(request.typedResume).byteLength > maxUploadBytes) {
        throw new ExtractionRequestError(413, 'PAYLOAD_TOO_LARGE', 'The resume text exceeds the configured size limit.');
      }
      if (provider.mode === 'live' && request.sampleId !== 'jordan-lee' && request.consentGiven !== true) {
        throw new ExtractionRequestError(400, 'CONSENT_REQUIRED', 'Confirm the live extraction privacy notice before submitting resume content.');
      }
      return withTimeout(provider.extract(request), provider.mode === 'live' ? timeoutMs : 10_000);
    },
  };
}

export class ExtractionRequestError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = 'ExtractionRequestError';
  }
}

export async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('Resume extraction timed out.')), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
