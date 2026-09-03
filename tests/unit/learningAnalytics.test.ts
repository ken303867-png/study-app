import { describe, expect, it } from 'vitest';
import type { LearningHistory, Question } from '../../src/types/domain';
import { buildLearningAnalytics, formatPercent } from '../../src/utils/learningAnalytics';

const explanation = {
  answer: 'answer',
  question_intent: 'intent',
  reasoning: 'reasoning',
  choice_explanations: [],
  key_points: 'key',
  references: 'ref'
};

const questions: Question[] = [
  question('Q1', '科目A', '単元1'),
  question('Q2', '科目A', '単元1'),
  question('Q3', '科目A', '単元2'),
  question('Q4', '科目B', '単元3'),
  question('Q5', '科目B', '単元3'),
  question('Q6', '未学習科目', '単元4')
];

const histories = new Map<string, LearningHistory>([
  [
    'Q1',
    history('Q1', {
      attempts: 3,
      correctCount: 1,
      incorrectCount: 2,
      lastResult: 'incorrect',
      lastAnsweredAt: '2026-09-03T03:00:00.000Z',
      needsReview: true
    })
  ],
  [
    'Q2',
    history('Q2', {
      attempts: 2,
      correctCount: 2,
      lastResult: 'correct',
      lastAnsweredAt: '2026-09-03T02:00:00.000Z'
    })
  ],
  [
    'Q3',
    history('Q3', {
      attempts: 1,
      uncertainCount: 1,
      lastResult: 'uncertain',
      lastAnsweredAt: '2026-09-03T04:00:00.000Z',
      needsReview: true,
      favorite: true
    })
  ],
  [
    'Q4',
    history('Q4', {
      attempts: 4,
      correctCount: 3,
      incorrectCount: 1,
      lastResult: 'correct',
      lastAnsweredAt: '2026-09-02T04:00:00.000Z'
    })
  ]
]);

describe('learningAnalytics', () => {
  it('aggregates coverage, attempts and accuracy without treating unanswered questions as wrong', () => {
    const analytics = buildLearningAnalytics(questions, histories);

    expect(analytics.overall).toMatchObject({
      totalQuestions: 6,
      answeredQuestions: 4,
      unansweredQuestions: 2,
      totalAttempts: 10,
      correctAttempts: 6,
      incorrectAttempts: 3,
      uncertainAttempts: 1,
      needsReviewQuestions: 2,
      favoriteQuestions: 1,
      accuracy: 0.6,
      coverage: 4 / 6,
      nonCorrectRate: 0.4,
      reviewRate: 0.5
    });
  });

  it('builds subject and unit aggregates from the same immutable history evidence', () => {
    const analytics = buildLearningAnalytics(questions, histories);
    const subjectA = analytics.bySubject.find((group) => group.subject === '科目A');
    const subjectB = analytics.bySubject.find((group) => group.subject === '科目B');
    const unit1 = analytics.byUnit.find((group) => group.subject === '科目A' && group.unit === '単元1');

    expect(subjectA).toMatchObject({
      totalQuestions: 3,
      answeredQuestions: 3,
      totalAttempts: 6,
      correctAttempts: 3,
      incorrectAttempts: 2,
      uncertainAttempts: 1,
      needsReviewQuestions: 2,
      accuracy: 0.5
    });
    expect(subjectB).toMatchObject({
      totalQuestions: 2,
      answeredQuestions: 1,
      totalAttempts: 4,
      accuracy: 0.75
    });
    expect(unit1).toMatchObject({ totalQuestions: 2, answeredQuestions: 2, totalAttempts: 5, accuracy: 0.6 });
  });

  it('ranks only learned groups by review rate, non-correct rate, then lower accuracy', () => {
    const analytics = buildLearningAnalytics(questions, histories);

    expect(analytics.reviewPrioritySubjects.map((group) => group.subject)).toEqual(['科目A', '科目B']);
    expect(analytics.reviewPrioritySubjects.some((group) => group.subject === '未学習科目')).toBe(false);
    expect(analytics.reviewPriorityUnits[0]).toMatchObject({ subject: '科目A', unit: '単元2' });
  });

  it('orders recent incorrect and uncertain questions by last answered time', () => {
    const analytics = buildLearningAnalytics(questions, histories);
    expect(analytics.recentAttention.map((item) => item.question.id)).toEqual(['Q3', 'Q1']);
  });

  it('formats percentages and preserves no-data state', () => {
    expect(formatPercent(0.604)).toBe('60%');
    expect(formatPercent(null)).toBe('—');
  });
});

function question(id: string, subject: string, unit: string): Question {
  return {
    id,
    subject,
    unit,
    topic: '論点',
    sourceType: 'predicted',
    sourceLabel: 'fixture',
    questionFormat: 'single-choice',
    importance: 'S',
    prompt: `${id}の問題`,
    explanation,
    relatedMaterialIds: [],
    tags: [],
    revision: 1,
    choices: ['A', 'B'],
    correctChoiceIndexes: [0]
  };
}

function history(
  questionId: string,
  overrides: Partial<LearningHistory>
): LearningHistory {
  return {
    questionId,
    attempts: 0,
    correctCount: 0,
    incorrectCount: 0,
    uncertainCount: 0,
    consecutiveCorrect: 0,
    lastResult: null,
    lastAnsweredAt: null,
    favorite: false,
    needsReview: false,
    ...overrides
  };
}
