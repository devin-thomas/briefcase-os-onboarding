import assert from 'node:assert/strict';
import test from 'node:test';
import { createExtractionService } from '../server/extraction-service';

const request = { typedResume: 'Taylor Morgan\nSQL and technical writing', artifacts: [] };

test('service keeps deterministic mode available without Gemini configuration', async () => {
  const service = createExtractionService({});
  assert.equal(service.provider.mode, 'demo');
  const result = await service.parseResume({ sampleId: 'jordan-lee', ...request });
  assert.equal(result.metadata.mode, 'demo');
});

test('service requires explicit consent before live extraction', async () => {
  const service = createExtractionService({ EXTRACTION_PROVIDER: 'gemini', ENABLE_LIVE_EXTRACTION: 'true', GEMINI_API_KEY: 'test-key-not-real' });
  assert.equal(service.provider.mode, 'live');
  await assert.rejects(() => service.parseResume(request), /privacy notice/);
});

test('service disables live mode safely when the kill switch is off', async () => {
  const service = createExtractionService({ EXTRACTION_PROVIDER: 'gemini', ENABLE_LIVE_EXTRACTION: 'false', GEMINI_API_KEY: 'test-key-not-real' });
  assert.equal(service.provider.mode, 'demo');
});

test('service maps file validation errors consistently', async () => {
  const service = createExtractionService({});
  await assert.rejects(() => service.parseResume({ ...request, artifacts: [{ id: 'x', fileName: 'x.exe', mimeType: 'application/octet-stream', sizeBytes: 1, addedAt: '2026-07-31' }] }), (error: Error & { code?: string; status?: number }) => {
    assert.equal(error.code, 'UNSUPPORTED_FILE');
    assert.equal(error.status, 415);
    return true;
  });
});
