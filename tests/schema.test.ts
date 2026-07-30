import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { buildCandidateExport, createCandidate, SAMPLE_EXTRACTION } from '../src/domain';

test('candidate export exposes exactly the public schema top-level fields', () => {
  const schema = JSON.parse(fs.readFileSync(new URL('../public/candidate.schema.json', import.meta.url), 'utf8'));
  const candidate = createCandidate();
  candidate.identity = {
    name: SAMPLE_EXTRACTION.identity?.name || '',
    email: SAMPLE_EXTRACTION.identity?.email || '',
    phone: SAMPLE_EXTRACTION.identity?.phone || '',
  };
  candidate.resume.parsed = SAMPLE_EXTRACTION.parsed;
  candidate.logistics.currentLocation = SAMPLE_EXTRACTION.currentLocation || '';
  const exported = buildCandidateExport(candidate);

  assert.deepEqual(Object.keys(exported).sort(), [...schema.required].sort());
  assert.equal(exported.schemaVersion, '2.0');
  assert.equal(JSON.stringify(exported).includes('sourceText'), false);
  assert.equal(JSON.stringify(exported).includes('dataBase64'), false);
  assert.equal(schema.properties.artifacts.items.properties.embedded.const, false);
  assert.equal(schema.additionalProperties, false);
});
