import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCandidateExport, createCandidate, fillSampleCandidate } from '../src/domain';
import { DemoResumeProvider } from '../server/providers';

test('deterministic sample extraction is stable and fictional', async () => {
  const provider = new DemoResumeProvider();
  const first = await provider.extract({ sampleId: 'jordan-lee', typedResume: '', artifacts: [] });
  const second = await provider.extract({ sampleId: 'jordan-lee', typedResume: '', artifacts: [] });
  assert.deepEqual(first, second);
  assert.equal(first.identity?.email, 'jordan.lee@example.test');
  assert.equal(first.metadata.mode, 'demo');
});

test('candidate export strips source text and provider configuration', () => {
  const candidate = createCandidate();
  candidate.resume.sourceText = 'sensitive source text';
  candidate.resume.artifacts.push({ id: 'resume-1', fileName: 'resume.pdf', mimeType: 'application/pdf', sizeBytes: 42, addedAt: '2026-07-30T00:00:00.000Z' });
  const exported = buildCandidateExport(candidate) as Record<string, unknown>;
  const serialized = JSON.stringify(exported);
  const retiredProviderName = ['cloud', 'flare'].join('');
  assert.ok(!serialized.includes('sensitive source text'));
  assert.ok(!serialized.includes('GEMINI'));
  assert.ok(!serialized.includes(retiredProviderName));
  assert.ok(!('interface' in exported));
});

test('fictional sample fills every onboarding section without granting consequential permissions', () => {
  const candidate = fillSampleCandidate(createCandidate());
  assert.equal(candidate.identity.name, 'Jordan Lee');
  assert.ok(candidate.professionalLinks.portfolio);
  assert.equal(candidate.resume.status, 'complete');
  assert.ok(candidate.career.primaryRoleFamilies.length >= 3);
  assert.ok(candidate.career.desiredResponsibilities.length >= 3);
  assert.ok(candidate.logistics.acceptableLocations.length >= 2);
  assert.ok(candidate.agent.claimGuardrails.length >= 2);
  assert.ok(candidate.onboarding.decisions.length >= 2);
  assert.equal(candidate.agent.permissions.contactPeople, false);
  assert.equal(candidate.agent.permissions.submitApplications, false);
});

test('conservative demo extraction does not invent experience', async () => {
  const result = await new DemoResumeProvider().extract({ typedResume: 'Taylor Morgan\ntaylor@example.test\nSQL and technical writing', artifacts: [] });
  assert.equal(result.parsed.sourceConfidence, 'low');
  assert.deepEqual(result.parsed.experience, []);
  assert.ok(result.metadata.warnings.length > 0);
});
