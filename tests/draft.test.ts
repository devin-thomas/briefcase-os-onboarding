import assert from 'node:assert/strict';
import test from 'node:test';
import { migrateCandidateDraft } from '../src/draft';

test('migrates a partial legacy draft into the current candidate shape', () => {
  const migrated = migrateCandidateDraft({
    schemaVersion: '1.0',
    id: 'candidate-fictional-legacy',
    interface: { theme: 'light', accent: '#18a6b8' },
    identity: { name: 'Taylor Morgan', email: 'taylor@example.test' },
    resume: {
      sourceText: 'Synthetic career history',
      status: 'parsing',
      artifacts: [{ id: 'artifact-1', fileName: 'resume.pdf', mimeType: 'application/pdf', sizeBytes: 2200, addedAt: '2026-01-01T00:00:00.000Z', dataBase64: 'must-not-persist' }],
      parsed: { skills: ['SQL', 'Support'], sourceConfidence: 'medium' },
    },
    logistics: { workArrangements: ['remote', 'invalid'], latestShiftEnd: '22:30' },
    agent: { priorities: { compensation: 140, flexibility: -15 }, permissions: { contactPeople: true } },
    unknownPrivateField: 'ignored',
  });

  assert.equal(migrated.schemaVersion, '2.0');
  assert.equal(migrated.id, 'candidate-fictional-legacy');
  assert.equal(migrated.interface.theme, 'light');
  assert.equal(migrated.identity.name, 'Taylor Morgan');
  assert.equal(migrated.resume.status, 'idle');
  assert.match(migrated.resume.message, /interrupted/i);
  assert.deepEqual(migrated.resume.parsed.skills, ['SQL', 'Support']);
  assert.deepEqual(migrated.logistics.workArrangements, ['remote']);
  assert.equal(migrated.agent.priorities.compensation, 100);
  assert.equal(migrated.agent.priorities.flexibility, 0);
  assert.equal(migrated.agent.permissions.contactPeople, true);
  assert.equal('dataBase64' in migrated.resume.artifacts[0], false);
  assert.equal('unknownPrivateField' in migrated, false);
});

test('invalid drafts fall back to safe defaults', () => {
  const migrated = migrateCandidateDraft({
    interface: { theme: 'system', accent: 'blue' },
    logistics: { latestShiftEnd: '35:99', unknownBehavior: 'guess' },
    agent: { resumeMaxPages: 8, rankingObjective: 'random' },
  });

  assert.equal(migrated.interface.theme, 'dark');
  assert.equal(migrated.interface.accent, '#2f80ed');
  assert.equal(migrated.logistics.latestShiftEnd, '');
  assert.equal(migrated.logistics.unknownBehavior, 'neutral');
  assert.equal(migrated.agent.resumeMaxPages, 2);
  assert.equal(migrated.agent.rankingObjective, 'balanced');
});
