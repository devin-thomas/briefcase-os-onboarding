import { createCandidate, type CandidateProfile, type ParsedResume, type ResumeArtifactMeta, type ThemeMode, type UnknownBehavior, type WorkArrangement } from './domain';

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord => value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : {};
const asString = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const asStringArray = (value: unknown, fallback: string[] = []) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : fallback;
const asBoolean = (value: unknown, fallback: boolean) => typeof value === 'boolean' ? value : fallback;
const asNumber = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const clamp = (value: unknown, fallback: number) => Math.min(100, Math.max(0, asNumber(value, fallback)));
const enumValue = <T extends string | number>(value: unknown, allowed: readonly T[], fallback: T): T => allowed.includes(value as T) ? value as T : fallback;

function migrateParsedResume(value: unknown, fallback: ParsedResume): ParsedResume {
  const parsed = asRecord(value);
  const experience = Array.isArray(parsed.experience) ? parsed.experience.flatMap((item) => {
    const job = asRecord(item);
    if (![job.company, job.title, job.dates].some((field) => typeof field === 'string')) return [];
    return [{
      company: asString(job.company),
      title: asString(job.title),
      dates: asString(job.dates),
      highlights: asStringArray(job.highlights),
    }];
  }) : fallback.experience;
  return {
    headline: asString(parsed.headline, fallback.headline),
    summary: asString(parsed.summary, fallback.summary),
    skills: asStringArray(parsed.skills, fallback.skills),
    experience,
    education: asStringArray(parsed.education, fallback.education),
    inferredTitles: asStringArray(parsed.inferredTitles, fallback.inferredTitles),
    sourceConfidence: enumValue(parsed.sourceConfidence, ['low', 'medium', 'high'] as const, fallback.sourceConfidence),
  };
}

function migrateArtifacts(value: unknown): ResumeArtifactMeta[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const artifact = asRecord(item);
    if (typeof artifact.id !== 'string' || typeof artifact.fileName !== 'string') return [];
    return [{
      id: artifact.id,
      fileName: artifact.fileName,
      mimeType: asString(artifact.mimeType, 'application/octet-stream'),
      sizeBytes: Math.max(0, asNumber(artifact.sizeBytes, 0)),
      addedAt: asString(artifact.addedAt, new Date(0).toISOString()),
    }];
  });
}

export function migrateCandidateDraft(value: unknown): CandidateProfile {
  const fallback = createCandidate();
  const source = asRecord(value);
  if (!Object.keys(source).length) return fallback;

  const interfaceSettings = asRecord(source.interface);
  const identity = asRecord(source.identity);
  const links = asRecord(source.professionalLinks);
  const resume = asRecord(source.resume);
  const career = asRecord(source.career);
  const logistics = asRecord(source.logistics);
  const agent = asRecord(source.agent);
  const priorities = asRecord(agent.priorities);
  const permissions = asRecord(agent.permissions);
  const onboarding = asRecord(source.onboarding);
  const savedStatus = enumValue(resume.status, ['idle', 'parsing', 'complete', 'error'] as const, fallback.resume.status);

  return {
    schemaVersion: '2.0',
    id: asString(source.id, fallback.id),
    createdAt: asString(source.createdAt, fallback.createdAt),
    updatedAt: asString(source.updatedAt, fallback.updatedAt),
    interface: {
      theme: enumValue<ThemeMode>(interfaceSettings.theme, ['dark', 'light'], fallback.interface.theme),
      accent: /^#[0-9a-f]{6}$/i.test(asString(interfaceSettings.accent)) ? asString(interfaceSettings.accent) : fallback.interface.accent,
    },
    identity: {
      name: asString(identity.name),
      email: asString(identity.email),
      phone: asString(identity.phone),
    },
    professionalLinks: {
      linkedIn: asString(links.linkedIn),
      github: asString(links.github),
      portfolio: asString(links.portfolio),
    },
    resume: {
      sourceText: asString(resume.sourceText),
      artifacts: migrateArtifacts(resume.artifacts),
      parsed: migrateParsedResume(resume.parsed, fallback.resume.parsed),
      status: savedStatus === 'parsing' ? 'idle' : savedStatus,
      message: savedStatus === 'parsing' ? 'Previous extraction was interrupted. Review the resume and try again.' : asString(resume.message),
    },
    career: {
      primaryRoleFamilies: asStringArray(career.primaryRoleFamilies),
      bridgeRoleFamilies: asStringArray(career.bridgeRoleFamilies),
      excludedRoleFamilies: asStringArray(career.excludedRoleFamilies),
      desiredResponsibilities: asStringArray(career.desiredResponsibilities),
      avoidedResponsibilities: asStringArray(career.avoidedResponsibilities),
      minimumBaseAnnual: typeof career.minimumBaseAnnual === 'number' && Number.isFinite(career.minimumBaseAnnual) ? Math.max(0, career.minimumBaseAnnual) : null,
    },
    logistics: {
      currentLocation: asString(logistics.currentLocation),
      acceptableLocations: asStringArray(logistics.acceptableLocations),
      workArrangements: Array.isArray(logistics.workArrangements)
        ? logistics.workArrangements.filter((item): item is WorkArrangement => ['onsite', 'hybrid', 'remote'].includes(String(item)))
        : fallback.logistics.workArrangements,
      latestShiftEnd: /^([01]\d|2[0-3]):[0-5]\d$/.test(asString(logistics.latestShiftEnd)) ? asString(logistics.latestShiftEnd) : '',
      unknownBehavior: enumValue<UnknownBehavior>(logistics.unknownBehavior, ['neutral', 'review', 'slight-penalty', 'reject'], fallback.logistics.unknownBehavior),
      workAuthorization: asString(logistics.workAuthorization),
    },
    agent: {
      rankingObjective: enumValue(agent.rankingObjective, ['best-fit', 'interview-probability', 'compensation', 'career-trajectory', 'balanced'] as const, fallback.agent.rankingObjective),
      priorities: {
        compensation: clamp(priorities.compensation, fallback.agent.priorities.compensation),
        flexibility: clamp(priorities.flexibility, fallback.agent.priorities.flexibility),
        growth: clamp(priorities.growth, fallback.agent.priorities.growth),
        workLifeBalance: clamp(priorities.workLifeBalance, fallback.agent.priorities.workLifeBalance),
      },
      priorityLabels: {
        compensation: asString(asRecord(agent.priorityLabels).compensation, fallback.agent.priorityLabels.compensation).trim() || fallback.agent.priorityLabels.compensation,
        flexibility: asString(asRecord(agent.priorityLabels).flexibility, fallback.agent.priorityLabels.flexibility).trim() || fallback.agent.priorityLabels.flexibility,
        growth: asString(asRecord(agent.priorityLabels).growth, fallback.agent.priorityLabels.growth).trim() || fallback.agent.priorityLabels.growth,
        workLifeBalance: asString(asRecord(agent.priorityLabels).workLifeBalance, fallback.agent.priorityLabels.workLifeBalance).trim() || fallback.agent.priorityLabels.workLifeBalance,
      },
      resumeMaxPages: enumValue(agent.resumeMaxPages, [1, 2, 3] as const, fallback.agent.resumeMaxPages),
      tone: asString(agent.tone, fallback.agent.tone),
      claimGuardrails: asStringArray(agent.claimGuardrails),
      permissions: {
        retrieveJobs: asBoolean(permissions.retrieveJobs, fallback.agent.permissions.retrieveJobs),
        scoreJobs: asBoolean(permissions.scoreJobs, fallback.agent.permissions.scoreJobs),
        draftPackages: asBoolean(permissions.draftPackages, fallback.agent.permissions.draftPackages),
        modifyFiles: asBoolean(permissions.modifyFiles, fallback.agent.permissions.modifyFiles),
        contactPeople: asBoolean(permissions.contactPeople, fallback.agent.permissions.contactPeople),
        submitApplications: asBoolean(permissions.submitApplications, fallback.agent.permissions.submitApplications),
      },
      notes: asString(agent.notes),
    },
    onboarding: {
      uncertainties: asStringArray(onboarding.uncertainties),
      decisions: asStringArray(onboarding.decisions),
      status: enumValue(onboarding.status, ['in-progress', 'ready-for-review'] as const, fallback.onboarding.status),
    },
  };
}
