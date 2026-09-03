import { beforeEach, describe, expect, it } from 'vitest';
import { sampleDataset } from '../../src/data/sampleDataset';
import { db } from '../../src/db/database';
import { contentRepository } from '../../src/repositories/contentRepository';
import { examSessionRepository } from '../../src/repositories/examSessionRepository';
import type { ExamSession, Question } from '../../src/types/domain';
import { formatExamTime, summarizeExamResult } from '../../src/utils/examSession';
import type { PracticeAnswer } from '../../src/utils/practiceEngine';

const sampleQuestion = sampleDataset.questions[0] as Question;
const secondQuestion: Question = {
  ...sampleQuestion,
  id: 'SAMPLE-Q-002',
  subject: '別科目',
  prompt: '2問目の非正式QA問題です。'
};

describe('examSession', () => {
  beforeEach(async () => {
    await db.open();
    await db.examSessions.clear();
  });

  it('scores answered questions, keeps unanswered separate and calculates subject accuracy', () => {
    const answers = new Map<string, PracticeAnswer>([
      [sampleQuestion.id, { kind: 'choices', indexes: [1] }]
    ]);

    const summary = summarizeExamResult([sampleQuestion, secondQuestion], answers);

    expect(summary).toMatchObject({
      totalQuestions: 2,
      answeredCount: 1,
      correctCount: 1,
      incorrectCount: 0,
      unansweredCount: 1,
      accuracy: 50,
      incorrectQuestionIds: [],
      unansweredQuestionIds: ['SAMPLE-Q-002']
    });
    expect(summary.subjectResults).toEqual([
      expect.objectContaining({ subject: 'サンプル科目', accuracy: 100, correctCount: 1 }),
      expect.objectContaining({ subject: '別科目', accuracy: 0, unansweredCount: 1 })
    ]);
  });

  it('classifies a submitted wrong answer as incorrect', () => {
    const answers = new Map<string, PracticeAnswer>([
      [sampleQuestion.id, { kind: 'choices', indexes: [0] }]
    ]);
    const summary = summarizeExamResult([sampleQuestion], answers);
    expect(summary).toMatchObject({
      answeredCount: 1,
      correctCount: 0,
      incorrectCount: 1,
      unansweredCount: 0,
      accuracy: 0,
      incorrectQuestionIds: ['SAMPLE-Q-001']
    });
  });

  it('formats countdown time without negative values', () => {
    expect(formatExamTime(3599)).toBe('59:59');
    expect(formatExamTime(0)).toBe('00:00');
    expect(formatExamTime(-3)).toBe('00:00');
  });

  it('persists exam sessions independently from content replacement', async () => {
    const session: ExamSession = {
      id: 'EXAM-SESSION-001',
      startedAt: '2026-09-03T00:00:00.000Z',
      completedAt: '2026-09-03T00:10:00.000Z',
      timerMinutes: 30,
      elapsedSeconds: 600,
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

    await examSessionRepository.save(session);
    await contentRepository.replaceDataset(sampleDataset);

    const sessions = await examSessionRepository.getAll();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toEqual(session);
  });
});
