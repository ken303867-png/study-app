import { beforeEach, describe, expect, it } from 'vitest';
import { sampleDataset } from '../../src/data/sampleDataset';
import { db } from '../../src/db/database';
import { contentRepository } from '../../src/repositories/contentRepository';
import { syncPublicDataset } from '../../src/services/publicDatasetSyncService';
import type { Question } from '../../src/types/domain';

const manifest = {
  schemaVersion: 1,
  releaseVersion: 'test-current-release',
  appMinVersion: '0.21.0',
  expected: {
    questionsTotal: 1,
    materials: 1,
    sourceOccurrences: 1,
    kinds: {
      'common-jna': 0,
      'common-cloze': 0,
      'common-predicted': 1,
      'common-final': 0,
      'specialty-past': 0,
      'specialty-predicted': 0,
      'specialty-predicted-case': 0
    }
  },
  bundle: {
    path: 'not-requested.pack.gz',
    compression: 'gzip',
    sha256: '0'.repeat(64)
  },
  datasets: [
    {
      order: 1,
      role: 'base',
      originalSha256: '0'.repeat(64),
      questionCount: 1
    }
  ]
};

const fetchManifest = (payload: object) =>
  (() => Promise.resolve({ ok: true, json: () => Promise.resolve(payload) } as Response)) as typeof fetch;

describe('public auto-sync protects locally imported predicted30', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all([
      db.questions.clear(),
      db.materials.clear(),
      db.sources.clear(),
      db.sourceOccurrences.clear(),
      db.media.clear(),
      db.mediaBlobs.clear(),
      db.learningHistory.clear(),
      db.meta.clear()
    ]);
    await contentRepository.replaceDataset(sampleDataset, {
      explanationTemplateVersion: '1.0',
      formalDataSpecVersion: '1.2'
    });
    const supplementalQuestion: Question = {
      ...sampleDataset.questions[0]!,
      id: 'PRED-PATH-001',
      subject: '臨床病態生理学',
      sourceLabel: 'local predicted30',
      relatedMaterialIds: [],
      tags: [
        'learning-area:common',
        'question-kind:common-predicted30',
        'supplemental:common-predicted30'
      ]
    } as Question;
    await db.questions.put(supplementalQuestion);
    await db.sourceOccurrences.put({
      source_id: sampleDataset.sourceOccurrences[0]!.source_id,
      source_occurrence_id: 'LOCAL-PRED30-OCC-001',
      canonical_question_id: supplementalQuestion.id,
      source_set_id: 'LOCAL-PRED30-SET01',
      source_question_no: 1,
      source_occurrence_order: 2
    });
    await db.meta.put({
      key: 'publicDatasetReleaseVersion',
      value: manifest.releaseVersion
    });
  });

  it('recognizes an unchanged public release with an additional local category', async () => {
    const result = await syncPublicDataset({
      baseUrl: '/',
      fetchImpl: fetchManifest(manifest)
    });
    expect(result.status).toBe('up-to-date');
    expect(await db.questions.count()).toBe(2);
    expect(await db.sourceOccurrences.count()).toBe(2);
  });

  it('defers a newer public release instead of deleting local predicted30 questions', async () => {
    const result = await syncPublicDataset({
      baseUrl: '/',
      fetchImpl: fetchManifest({
        ...manifest,
        releaseVersion: 'test-new-release'
      })
    });
    expect(result.status).toBe('offline-existing');
    expect(result.warning).toContain('予想問題30');
    expect((await db.questions.get('PRED-PATH-001'))?.id).toBe('PRED-PATH-001');
    expect(await db.questions.count()).toBe(2);
    expect(await db.sourceOccurrences.count()).toBe(2);
  });
});
