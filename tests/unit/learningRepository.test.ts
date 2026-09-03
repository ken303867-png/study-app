import { beforeEach, describe, expect, it } from 'vitest';
import { sampleDataset } from '../../src/data/sampleDataset';
import { db } from '../../src/db/database';
import { contentRepository } from '../../src/repositories/contentRepository';
import { learningRepository } from '../../src/repositories/learningRepository';

describe('learningRepository', () => {
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
      db.materialHistory.clear(),
      db.meta.clear()
    ]);
  });

  it('returns an unanswered default without writing a row', async () => {
    const history = await learningRepository.get('Q-EMPTY');
    expect(history).toMatchObject({
      questionId: 'Q-EMPTY',
      attempts: 0,
      lastResult: null,
      favorite: false,
      needsReview: false
    });
    expect(await db.learningHistory.count()).toBe(0);
  });

  it('records correct, incorrect and uncertain attempts and marks review when needed', async () => {
    await learningRepository.recordResult('Q-001', 'correct');
    await learningRepository.recordResult('Q-001', 'incorrect');
    const history = await learningRepository.recordResult('Q-001', 'uncertain');

    expect(history).toMatchObject({
      attempts: 3,
      correctCount: 1,
      incorrectCount: 1,
      uncertainCount: 1,
      consecutiveCorrect: 0,
      lastResult: 'uncertain',
      needsReview: true
    });
    expect(history.lastAnsweredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('toggles favorite and review independently', async () => {
    expect((await learningRepository.toggleFavorite('Q-002')).favorite).toBe(true);
    expect((await learningRepository.toggleNeedsReview('Q-002')).needsReview).toBe(true);
    const history = await learningRepository.get('Q-002');
    expect(history.favorite).toBe(true);
    expect(history.needsReview).toBe(true);
  });

  it('resets progress while preserving favorite and review flags', async () => {
    await learningRepository.recordResult('Q-003', 'incorrect');
    await learningRepository.toggleFavorite('Q-003');
    const history = await learningRepository.resetProgress('Q-003');

    expect(history).toMatchObject({
      attempts: 0,
      correctCount: 0,
      incorrectCount: 0,
      uncertainCount: 0,
      lastResult: null,
      favorite: true,
      needsReview: true
    });
  });

  it('preserves learning history when the content dataset is replaced', async () => {
    await contentRepository.replaceDataset(sampleDataset);
    await learningRepository.recordResult('SAMPLE-Q-001', 'incorrect');
    await learningRepository.toggleFavorite('SAMPLE-Q-001');

    await contentRepository.replaceDataset({
      ...sampleDataset,
      datasetVersion: 'sample-reimport-preservation'
    });

    const history = await learningRepository.get('SAMPLE-Q-001');
    expect(history).toMatchObject({
      attempts: 1,
      incorrectCount: 1,
      lastResult: 'incorrect',
      favorite: true,
      needsReview: true
    });
  });
});
