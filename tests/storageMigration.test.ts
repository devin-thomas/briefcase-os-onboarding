import assert from 'node:assert/strict';
import test from 'node:test';
import { CURRENT_DRAFT_KEY, LEGACY_DRAFT_KEYS, migrateStoredCandidateDraft } from '../src/storageMigration';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

test('moves a legacy browser draft to the current sanitized key', () => {
  const storage = new MemoryStorage();
  storage.setItem(LEGACY_DRAFT_KEYS[1], JSON.stringify({
    schemaVersion: '1.0',
    identity: { name: 'Morgan Rivera' },
    resume: { status: 'parsing', artifacts: [{ id: 'a', fileName: 'resume.pdf', dataBase64: 'discard' }] },
  }));

  const sourceKey = migrateStoredCandidateDraft(storage);
  const migrated = JSON.parse(storage.getItem(CURRENT_DRAFT_KEY) || '{}');

  assert.equal(sourceKey, LEGACY_DRAFT_KEYS[1]);
  assert.equal(migrated.schemaVersion, '2.0');
  assert.equal(migrated.identity.name, 'Morgan Rivera');
  assert.equal(migrated.resume.status, 'idle');
  assert.equal(storage.getItem(LEGACY_DRAFT_KEYS[1]), null);
  assert.equal(JSON.stringify(migrated).includes('dataBase64'), false);
});

test('deletes corrupt stored JSON instead of blocking startup', () => {
  const storage = new MemoryStorage();
  storage.setItem(CURRENT_DRAFT_KEY, '{not-json');

  assert.equal(migrateStoredCandidateDraft(storage), null);
  assert.equal(storage.getItem(CURRENT_DRAFT_KEY), null);
});
