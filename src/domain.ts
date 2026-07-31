export type ThemeMode = 'dark' | 'light';
export type WorkArrangement = 'onsite' | 'hybrid' | 'remote';
export type UnknownBehavior = 'neutral' | 'review' | 'slight-penalty' | 'reject';
export type ExtractionMode = 'demo' | 'live';

export interface ParsedResume {
  headline: string;
  summary: string;
  skills: string[];
  experience: Array<{ company: string; title: string; dates: string; highlights: string[] }>;
  education: string[];
  inferredTitles: string[];
  sourceConfidence: 'low' | 'medium' | 'high';
}

export interface ResumeArtifactMeta {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  addedAt: string;
}

export interface CandidateProfile {
  schemaVersion: '2.0';
  id: string;
  createdAt: string;
  updatedAt: string;
  interface: { theme: ThemeMode; accent: string };
  identity: { name: string; email: string; phone: string };
  professionalLinks: { linkedIn: string; github: string; portfolio: string };
  resume: {
    sourceText: string;
    artifacts: ResumeArtifactMeta[];
    parsed: ParsedResume;
    status: 'idle' | 'parsing' | 'complete' | 'error';
    message: string;
  };
  career: {
    primaryRoleFamilies: string[];
    bridgeRoleFamilies: string[];
    excludedRoleFamilies: string[];
    desiredResponsibilities: string[];
    avoidedResponsibilities: string[];
    minimumBaseAnnual: number | null;
  };
  logistics: {
    currentLocation: string;
    acceptableLocations: string[];
    workArrangements: WorkArrangement[];
    latestShiftEnd: string;
    unknownBehavior: UnknownBehavior;
    workAuthorization: string;
  };
  agent: {
    rankingObjective: 'best-fit' | 'interview-probability' | 'compensation' | 'career-trajectory' | 'balanced';
    priorities: { compensation: number; flexibility: number; growth: number; workLifeBalance: number };
    resumeMaxPages: 1 | 2 | 3;
    tone: string;
    claimGuardrails: string[];
    permissions: {
      retrieveJobs: boolean;
      scoreJobs: boolean;
      draftPackages: boolean;
      modifyFiles: boolean;
      contactPeople: boolean;
      submitApplications: boolean;
    };
    notes: string;
  };
  onboarding: { uncertainties: string[]; decisions: string[]; status: 'in-progress' | 'ready-for-review' };
}

export interface ResumeExtractionRequest {
  sampleId?: string;
  typedResume: string;
  consentGiven?: boolean;
  artifacts: Array<ResumeArtifactMeta & { dataBase64?: string; plainText?: string }>;
}

export interface ResumeExtractionResult {
  identity?: Partial<CandidateProfile['identity']>;
  currentLocation?: string;
  parsed: ParsedResume;
  metadata: { mode: ExtractionMode; source: 'sample' | 'pasted-text' | 'uploaded-file'; warnings: string[] };
}

export interface CapabilityResponse {
  resumeExtraction: {
    available: boolean;
    mode: ExtractionMode;
    processorLabel?: string;
    supports: Array<'sample' | 'pasted-text' | 'application/pdf'>;
  };
}

const now = () => new Date().toISOString();
const uid = () => globalThis.crypto?.randomUUID?.() ?? `id_${Math.random().toString(36).slice(2)}`;

export function createCandidate(): CandidateProfile {
  const timestamp = now();
  return {
    schemaVersion: '2.0', id: `candidate_${uid()}`, createdAt: timestamp, updatedAt: timestamp,
    interface: { theme: 'dark', accent: '#2f80ed' },
    identity: { name: '', email: '', phone: '' },
    professionalLinks: { linkedIn: '', github: '', portfolio: '' },
    resume: {
      sourceText: '', artifacts: [], status: 'idle', message: '',
      parsed: { headline: '', summary: '', skills: [], experience: [], education: [], inferredTitles: [], sourceConfidence: 'low' },
    },
    career: {
      primaryRoleFamilies: [], bridgeRoleFamilies: [], excludedRoleFamilies: [], desiredResponsibilities: [], avoidedResponsibilities: [], minimumBaseAnnual: null,
    },
    logistics: {
      currentLocation: '', acceptableLocations: [], workArrangements: ['remote', 'hybrid'], latestShiftEnd: '', unknownBehavior: 'neutral', workAuthorization: '',
    },
    agent: {
      rankingObjective: 'balanced', priorities: { compensation: 70, flexibility: 80, growth: 75, workLifeBalance: 80 },
      resumeMaxPages: 2, tone: 'Direct, specific, and credible', claimGuardrails: [],
      permissions: { retrieveJobs: true, scoreJobs: true, draftPackages: true, modifyFiles: false, contactPeople: false, submitApplications: false }, notes: '',
    },
    onboarding: { uncertainties: [], decisions: [], status: 'in-progress' },
  };
}

export const SAMPLE_RESUME = `Jordan Lee
Chicago, IL | jordan.lee@example.test | 312-555-0142

SUMMARY
Technical support and operations specialist who turns ambiguous customer reports into reproducible evidence, clear escalations, and repeatable workflows.

EXPERIENCE
Senior Product Support Specialist — Northstar Systems — 2022–Present
- Investigates SaaS issues using browser traces, request payloads, logs, and concise reproduction steps.
- Built quality scorecards and troubleshooting guides for a distributed support team.

Customer Operations Analyst — Harbor Analytics — 2019–2022
- Analyzed ticket trends and converted recurring friction into measurable process improvements.
- Created lightweight reporting automations and facilitated weekly operating reviews.

EDUCATION
B.A. Communication — Lakeshore University

SKILLS
SQL, REST APIs, browser developer tools, incident response, technical writing, workflow design, quality assurance, coaching`;

export const SAMPLE_EXTRACTION: ResumeExtractionResult = {
  identity: { name: 'Jordan Lee', email: 'jordan.lee@example.test', phone: '312-555-0142' },
  currentLocation: 'Chicago, IL',
  parsed: {
    headline: 'Technical Support & Operations Specialist',
    summary: 'Technical support and operations specialist who turns ambiguous customer reports into reproducible evidence, clear escalations, and repeatable workflows.',
    skills: ['SQL', 'REST APIs', 'Browser developer tools', 'Incident response', 'Technical writing', 'Workflow design', 'Quality assurance', 'Coaching'],
    experience: [
      { company: 'Northstar Systems', title: 'Senior Product Support Specialist', dates: '2022–Present', highlights: ['Investigates SaaS issues using browser traces, request payloads, logs, and concise reproduction steps.', 'Built quality scorecards and troubleshooting guides for a distributed support team.'] },
      { company: 'Harbor Analytics', title: 'Customer Operations Analyst', dates: '2019–2022', highlights: ['Analyzed ticket trends and converted recurring friction into measurable process improvements.', 'Created lightweight reporting automations and facilitated weekly operating reviews.'] },
    ],
    education: ['B.A. Communication — Lakeshore University'],
    inferredTitles: ['Technical Support Engineer', 'Product Support Specialist', 'Support Operations Analyst'],
    sourceConfidence: 'high',
  },
  metadata: { mode: 'demo', source: 'sample', warnings: ['Fictional sample data for portfolio demonstration.'] },
};

export function buildCandidateExport(candidate: CandidateProfile) {
  return {
    $schema: './candidate.schema.json', schemaVersion: candidate.schemaVersion, id: candidate.id,
    createdAt: candidate.createdAt, updatedAt: candidate.updatedAt,
    identity: candidate.identity, professionalLinks: candidate.professionalLinks,
    canonicalProfile: {
      workHistory: candidate.resume.parsed.experience.map((job, index) => ({
        id: `resume-work-${index + 1}`, ...job,
        provenance: { source: 'resume', confidence: candidate.resume.parsed.sourceConfidence },
        allowedInApplications: true,
      })),
      education: candidate.resume.parsed.education.map((description) => ({ description, provenance: { source: 'resume', confidence: candidate.resume.parsed.sourceConfidence } })),
      skills: candidate.resume.parsed.skills.map((name) => ({ name, provenance: { source: 'resume', confidence: candidate.resume.parsed.sourceConfidence } })),
    },
    positioning: { headlines: [candidate.resume.parsed.headline, ...candidate.career.primaryRoleFamilies].filter(Boolean), summaries: [candidate.resume.parsed.summary].filter(Boolean), strategyNotes: candidate.agent.notes },
    preferences: {
      targetRoleFamilies: candidate.career.primaryRoleFamilies, bridgeRoleFamilies: candidate.career.bridgeRoleFamilies,
      excludedRoleFamilies: candidate.career.excludedRoleFamilies, desiredResponsibilities: candidate.career.desiredResponsibilities,
      avoidedResponsibilities: candidate.career.avoidedResponsibilities, minimumBaseAnnual: candidate.career.minimumBaseAnnual,
      currentLocation: candidate.logistics.currentLocation, acceptableLocations: candidate.logistics.acceptableLocations,
      workArrangements: candidate.logistics.workArrangements, latestShiftEnd: candidate.logistics.latestShiftEnd,
      unknownBehavior: candidate.logistics.unknownBehavior, workAuthorization: candidate.logistics.workAuthorization,
    },
    scoringPolicy: { rankingObjective: candidate.agent.rankingObjective, priorities: candidate.agent.priorities, hardFiltersApplyBeforeScoring: true },
    packagePolicy: { resumeMaxPages: candidate.agent.resumeMaxPages, tone: candidate.agent.tone, claimGuardrails: candidate.agent.claimGuardrails },
    authorizationPolicy: candidate.agent.permissions,
    onboarding: candidate.onboarding,
    artifacts: candidate.resume.artifacts.map((artifact) => ({ ...artifact, sourceRef: `local-upload://${artifact.id}`, embedded: false })),
  };
}

export function parseList(value: string): string[] {
  return [...new Map(value.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean).map((item) => [item.toLowerCase(), item])).values()];
}
