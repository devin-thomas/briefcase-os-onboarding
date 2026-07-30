import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCandidateExport, createCandidate } from '../src/domain';
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

test('conservative demo extraction does not invent experience', async () => {
  const result = await new DemoResumeProvider().extract({ typedResume: 'Taylor Morgan\ntaylor@example.test\nSQL and technical writing', artifacts: [] });
  assert.equal(result.parsed.sourceConfidence, 'low');
  assert.deepEqual(result.parsed.experience, []);
  assert.ok(result.metadata.warnings.length > 0);
});
