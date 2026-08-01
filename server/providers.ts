import type { ResumeExtractionRequest, ResumeExtractionResult } from '../src/domain';
import { SAMPLE_EXTRACTION } from '../src/domain';

export interface ResumeExtractionProvider {
  readonly id: string;
  readonly mode: 'demo' | 'live';
  extract(request: ResumeExtractionRequest): Promise<ResumeExtractionResult>;
}

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

export class DemoResumeProvider implements ResumeExtractionProvider {
  readonly id = 'demo';
  readonly mode = 'demo' as const;

  async extract(request: ResumeExtractionRequest): Promise<ResumeExtractionResult> {
    if (request.sampleId === 'jordan-lee') return clone(SAMPLE_EXTRACTION);
    const text = request.typedResume.trim() || request.artifacts.map((item) => item.plainText || '').join('\n').trim();
    if (!text) throw new Error('Add the fictional sample or paste resume text first.');
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
    const phone = text.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/)?.[0] || '';
    const candidateName = lines[0] && lines[0].length <= 70 && !lines[0].includes('@') ? lines[0] : '';
    const knownSkills = ['SQL', 'Python', 'JavaScript', 'TypeScript', 'React', 'REST APIs', 'Technical writing', 'Customer support', 'Quality assurance', 'Data analysis'];
    const skills = knownSkills.filter((skill) => text.toLowerCase().includes(skill.toLowerCase()));
    return {
      identity: { name: candidateName, email, phone },
      parsed: {
        headline: 'Candidate profile requiring review',
        summary: lines.slice(0, 3).join(' ').slice(0, 280),
        skills,
        experience: [], education: [], inferredTitles: [], sourceConfidence: 'low',
      },
      metadata: {
        mode: 'demo', source: request.artifacts.length ? 'uploaded-file' : 'pasted-text',
        warnings: ['Local demo extraction is intentionally conservative. Review and complete all fields manually.'],
      },
    };
  }
}

interface GeminiBody { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>; error?: { message?: string } }

const resumeExtractionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    identity: {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: { type: 'string', description: 'Candidate name, or an empty string when absent.' },
        email: { type: 'string', description: 'Candidate email, or an empty string when absent.' },
        phone: { type: 'string', description: 'Candidate phone, or an empty string when absent.' },
      },
      required: ['name', 'email', 'phone'],
    },
    currentLocation: { type: 'string', description: 'Candidate location, or an empty string when absent.' },
    parsed: {
      type: 'object',
      additionalProperties: false,
      properties: {
        headline: { type: 'string' },
        summary: { type: 'string' },
        skills: { type: 'array', items: { type: 'string' } },
        experience: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              company: { type: 'string' },
              title: { type: 'string' },
              dates: { type: 'string' },
              highlights: { type: 'array', items: { type: 'string' } },
            },
            required: ['company', 'title', 'dates', 'highlights'],
          },
        },
        education: { type: 'array', items: { type: 'string' } },
        inferredTitles: { type: 'array', items: { type: 'string' } },
        sourceConfidence: { type: 'string', enum: ['low', 'medium', 'high'] },
      },
      required: ['headline', 'summary', 'skills', 'experience', 'education', 'inferredTitles', 'sourceConfidence'],
    },
  },
  required: ['identity', 'currentLocation', 'parsed'],
} as const;

const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string');

function isResumeExtraction(value: unknown): value is Omit<ResumeExtractionResult, 'metadata'> {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  const identity = candidate.identity as Record<string, unknown> | undefined;
  const parsed = candidate.parsed as Record<string, unknown> | undefined;
  return Boolean(identity && parsed
    && typeof identity.name === 'string' && typeof identity.email === 'string' && typeof identity.phone === 'string'
    && typeof candidate.currentLocation === 'string'
    && typeof parsed.headline === 'string' && typeof parsed.summary === 'string'
    && isStringArray(parsed.skills) && isStringArray(parsed.education) && isStringArray(parsed.inferredTitles)
    && ['low', 'medium', 'high'].includes(String(parsed.sourceConfidence))
    && Array.isArray(parsed.experience) && parsed.experience.every((item) => {
      if (!item || typeof item !== 'object') return false;
      const role = item as Record<string, unknown>;
      return typeof role.company === 'string' && typeof role.title === 'string' && typeof role.dates === 'string' && isStringArray(role.highlights);
    }));
}

export class GeminiResumeProvider implements ResumeExtractionProvider {
  readonly id = 'gemini';
  readonly mode = 'live' as const;
  constructor(private readonly apiKey: string, private readonly model: string, private readonly timeoutMs = 55_000) {
    if (!apiKey) throw new Error('Live extraction requires a server-side GEMINI_API_KEY.');
  }

  async extract(request: ResumeExtractionRequest): Promise<ResumeExtractionResult> {
    const text = request.typedResume.trim() || request.artifacts.map((item) => item.plainText || '').join('\n').trim();
    const inline = request.artifacts.filter((item) => item.mimeType === 'application/pdf' && item.dataBase64).map((item) => ({ inlineData: { mimeType: item.mimeType, data: item.dataBase64! } }));
    if (!text && !inline.length) throw new Error('Add a PDF or paste resume text first.');
    const prompt = `Extract a compact candidate profile using only the supplied resume. Never invent facts. Use empty strings or arrays when facts are absent. Keep summaries and highlights concise.\n\n${text}`;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }, ...inline] }], generationConfig: { responseMimeType: 'application/json', responseJsonSchema: resumeExtractionSchema, maxOutputTokens: 2400 } }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    const body = await response.json() as GeminiBody;
    if (!response.ok) throw new Error('Live resume extraction is unavailable. Your draft is still safe.');
    const output = body.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('');
    if (!output) throw new Error('Live resume extraction returned no structured result.');
    let parsed: unknown;
    try { parsed = JSON.parse(output) as unknown; }
    catch { throw new Error('Live resume extraction returned invalid structured data.'); }
    if (!isResumeExtraction(parsed)) throw new Error('Live resume extraction returned incomplete data.');
    return { ...parsed, metadata: { mode: 'live', source: inline.length ? 'uploaded-file' : 'pasted-text', warnings: ['Review all extracted facts before using them.'] } };
  }
}
