import { migrateCandidateDraft } from './draft';

export const CURRENT_DRAFT_KEY = 'briefcaseos.demo.candidate-draft.v1';
export const LEGACY_DRAFT_KEYS = ['briefcaseos.candidate-draft.v3', 'briefcaseos.candidate-draft.v2'] as const;

export function migrateStoredCandidateDraft(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>): string | null {
  for (const key of [CURRENT_DRAFT_KEY, ...LEGACY_DRAFT_KEYS]) {
    const raw = storage.getItem(key);
    if (!raw) continue;
    try {
      const migrated = migrateCandidateDraft(JSON.parse(raw));
      storage.setItem(CURRENT_DRAFT_KEY, JSON.stringify(migrated));
      for (const legacyKey of LEGACY_DRAFT_KEYS) storage.removeItem(legacyKey);
      return key;
    } catch {
      storage.removeItem(key);
    }
  }
  return null;
}
