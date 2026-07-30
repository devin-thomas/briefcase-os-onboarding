import assert from 'node:assert/strict';
import test from 'node:test';
import { GeminiResumeProvider } from '../server/providers';

const request = { typedResume: 'Morgan Rivera\nTechnical support and SQL', artifacts: [] };

async function withFetch(response: Response, run: () => Promise<void>) {
  const original = globalThis.fetch;
  globalThis.fetch = async () => response;
  try { await run(); } finally { globalThis.fetch = original; }
}

test('live provider requires a server-side credential', () => {
  assert.throws(() => new GeminiResumeProvider('', 'fictional-model'), /server-side GEMINI_API_KEY/);
});

test('live provider rejects empty resume input before making a request', async () => {
  const provider = new GeminiResumeProvider('test-key-not-real', 'fictional-model');
  await assert.rejects(() => provider.extract({ typedResume: '', artifacts: [] }), /Add a PDF or paste resume text/);
});

test('live provider normalizes upstream failures without exposing provider detail', async () => {
  await withFetch(new Response(JSON.stringify({ error: { message: 'private upstream detail' } }), { status: 429 }), async () => {
    const provider = new GeminiResumeProvider('test-key-not-real', 'fictional-model');
    await assert.rejects(() => provider.extract(request), (error: Error) => {
      assert.equal(error.message, 'Live resume extraction is unavailable. Your draft is still safe.');
      assert.equal(error.message.includes('private upstream detail'), false);
      return true;
    });
  });
});

test('live provider rejects malformed or incomplete structured output', async () => {
  await withFetch(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'not-json' }] } }] }), { status: 200 }), async () => {
    await assert.rejects(() => new GeminiResumeProvider('test-key-not-real', 'fictional-model').extract(request), /invalid structured data/);
  });
  await withFetch(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"identity":{}}' }] } }] }), { status: 200 }), async () => {
    await assert.rejects(() => new GeminiResumeProvider('test-key-not-real', 'fictional-model').extract(request), /incomplete data/);
  });
});

test('live provider adds review metadata to valid structured output', async () => {
  const output = {
    identity: { name: 'Morgan Rivera', email: '', phone: '' },
    currentLocation: 'Chicago, IL',
    parsed: { headline: 'Support Specialist', summary: 'Synthetic profile.', skills: ['SQL'], experience: [], education: [], inferredTitles: ['Support Specialist'], sourceConfidence: 'medium' },
  };
  await withFetch(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(output) }] } }] }), { status: 200 }), async () => {
    const result = await new GeminiResumeProvider('test-key-not-real', 'fictional-model').extract(request);
    assert.equal(result.metadata.mode, 'live');
    assert.equal(result.metadata.source, 'pasted-text');
    assert.match(result.metadata.warnings[0], /Review/);
  });
});
