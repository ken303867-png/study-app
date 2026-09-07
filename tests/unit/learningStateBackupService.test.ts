import { beforeEach, describe, expect, it } from 'vitest';
import { sampleDataset } from '../../src/data/sampleDataset';
import { db } from '../../src/db/database';
import { contentRepository } from '../../src/repositories/contentRepository';
import {
  createLearningStateBackup,
  LearningStateBackupError,
  parseLearningStateBackup,
  restoreLearningStateBackup
} from '../../src/services/learningStateBackupService';
import type { ExamSession, LearningHistory, MaterialHistory } from '../../src/types/domain';

const learnedHistory: LearningHistory = {
  questionId: 'SAMPLE-Q-001',
  attempts: 2,
  correctCount: 1,
  incorrectCount: 1,
  uncertainCount: 0,
  consecutiveCorrect: 1,
  lastResult: 'correct',
  lastAnsweredAt: '2026-09-07T07:00:00.000Z',
  favorite: true,
  needsReview: true
};

const materialHistory: MaterialHistory = {
  materialId: 'SAMPLE-M-001',
  favorite: true,
  viewed: true,
  lastViewedAt: '2026-09-07T07:01:00.000Z',
  scrollPosition: 240
};

const examSession: ExamSession = {
  id: 'EXAM-001',
  startedAt: '2026-09-07T06:50:00.000Z',
  completedAt: '2026-09-07T06:55:00.000Z',
  timerMinutes: 10,
  elapsedSeconds: 300,
  questionIds: ['SAMPLE-Q-001'],
  totalQuestions: 1,
  answeredCount: 1,
  correctCount: 1,
  incorrectCount: 0,
  unansweredCount: 0,
  accuracy: 100,
  subjectResults: [
    {
      subject: 'サンプル科目',
      totalQuestions: 1,
      answeredCount: 1,
      correctCount: 1,
      incorrectCount: 0,
      unansweredCount: 0,
      accuracy: 100
    }
  ],
  incorrectQuestionIds: [],
  unansweredQuestionIds: [],
  completionReason: 'submitted'
};

describe('learningStateBackupService', () => {
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
      db.examSessions.clear(),
      db.meta.clear()
    ]);
    await contentRepository.replaceDataset(sampleDataset);
    await db.meta.put({ key: 'publicDatasetReleaseVersion', value: 'test-release-1' });
  });

  it('exports only local learning state and excludes formal content', async () => {
    await db.learningHistory.put(learnedHistory);
    await db.materialHistory.put(materialHistory);
    await db.examSessions.put(examSession);

    const result = await createLearningStateBackup();
    const parsed = parseLearningStateBackup(result.json);

    expect(parsed.counts).toEqual({ learningHistory: 1, materialHistory: 1, examSessions: 1 });
    expect(parsed.source).toMatchObject({
      deliverySchemaVersion: '0.5',
      publicDatasetReleaseVersion: 'test-release-1',
      questionCount: 1,
      materialCount: 1
    });
    expect(parsed.learningHistory[0]).toEqual(learnedHistory);
    expect(parsed.materialHistory[0]).toEqual(materialHistory);
    expect(parsed.examSessions[0]).toEqual(examSession);
    expect(result.json).not.toContain('正式Deliveryデータを実行時検証するライブラリ');
    expect(result.json).not.toContain('Zodは外部データを実行時に検証');
  });

  it('restores matching IDs, skips stale IDs, and replaces current learning state atomically', async () => {
    await db.learningHistory.put(learnedHistory);
    await db.materialHistory.put(materialHistory);
    await db.examSessions.put(examSession);
    const exported = JSON.parse((await createLearningStateBackup()).json) as Record<string, unknown> & {
      counts: { learningHistory: number; materialHistory: number; examSessions: number };
      learningHistory: LearningHistory[];
      materialHistory: MaterialHistory[];
      examSessions: ExamSession[];
    };

    exported.learningHistory.push({
      questionId: 'OLD-Q-001',
      attempts: 0,
      correctCount: 0,
      incorrectCount: 0,
      uncertainCount: 0,
      consecutiveCorrect: 0,
      lastResult: null,
      lastAnsweredAt: null,
      favorite: true,
      needsReview: true
    });
    exported.materialHistory.push({
      materialId: 'OLD-M-001',
      favorite: true,
      viewed: true,
      lastViewedAt: '2026-09-01T00:00:00.000Z',
      scrollPosition: 10
    });
    exported.examSessions.push({ ...examSession, id: 'OLD-EXAM-001', questionIds: ['OLD-Q-001'] });
    exported.counts = { learningHistory: 2, materialHistory: 2, examSessions: 2 };

    await db.learningHistory.put({
      ...learnedHistory,
      attempts: 1,
      correctCount: 0,
      incorrectCount: 1,
      consecutiveCorrect: 0,
      lastResult: 'incorrect',
      favorite: false
    });
    await db.examSessions.put({ ...examSession, id: 'CURRENT-ONLY-EXAM' });

    const result = await restoreLearningStateBackup(JSON.stringify(exported));

    expect(result.restored).toEqual({ learningHistory: 1, materialHistory: 1, examSessions: 1 });
    expect(result.skipped).toEqual({ learningHistory: 1, materialHistory: 1, examSessions: 1 });
    expect(await db.learningHistory.toArray()).toEqual([learnedHistory]);
    expect(await db.materialHistory.toArray()).toEqual([materialHistory]);
    expect(await db.examSessions.toArray()).toEqual([examSession]);
  });

  it('rejects an invalid backup before writing and preserves the current state', async () => {
    await db.learningHistory.put(learnedHistory);
    const before = await db.learningHistory.toArray();
    const invalid = JSON.parse((await createLearningStateBackup()).json) as {
      learningHistory: LearningHistory[];
    };
    const firstHistory = invalid.learningHistory[0];
    if (!firstHistory) throw new Error('Expected one learning-history fixture row');
    firstHistory.attempts = 99;

    await expect(restoreLearningStateBackup(JSON.stringify(invalid))).rejects.toBeInstanceOf(
      LearningStateBackupError
    );
    expect(await db.learningHistory.toArray()).toEqual(before);
  });
});
