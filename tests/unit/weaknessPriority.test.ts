import { describe, expect, it } from 'vitest';
import type { LearningHistory, Question } from '../../src/types/domain';
import {
  WEAKNESS_PRIORITY_MIN_SCORE,
  buildWeaknessPriorityItems,
  calculateWeaknessPriorityScore,
  isWeaknessPriorityCandidate,
  rankQuestionsByWeakness
} from '../../src/utils/weaknessPriority';

const explanation = {
  answer: 'answer',
  question_intent: 'intent',
  reasoning: 'reasoning',
  choice_explanations: [],
  key_points: 'key',
  references: 'ref'
};

const questions = ['Q1', 'Q2', 'Q3', 'Q4'].map(makeQuestion);

describe('weaknessPriority', () => {
  it('does not classify unanswered questions as weaknesses', () => {
    expect(calculateWeaknessPriorityScore(undefined)).toBe(0);
    expect(calculateWeaknessPriorityScore(history('Q1', {}))).toBe(0);
    expect(isWeaknessPriorityCandidate(history('Q1', {}))).toBe(false);
  });

  it('prioritizes review flags, recent incorrect results and cumulative non-correct evidence', () => {
    const severe = history('Q1', {
      attempts: 4,
      correctCount: 1,
      incorrectCount: 3,
      lastResult: 'incorrect',
      needsReview: true,
      consecutiveCorrect: 0
    });
    const uncertain = history('Q2', {
      attempts: 4,
      correctCount: 3,
      uncertainCount: 1,
      lastResult: 'uncertain',
      needsReview: false,
      consecutiveCorrect: 0
    });

    expect(calculateWeaknessPriorityScore(severe)).toBeGreaterThan(
      calculateWeaknessPriorityScore(uncertain)
    );
    expect(calculateWeaknessPriorityScore(severe)).toBeGreaterThanOrEqual(
      WEAKNESS_PRIORITY_MIN_SCORE
    );
    expect(isWeaknessPriorityCandidate(severe)).toBe(true);
  });

  it('allows recovered questions to fall below the weakness threshold', () => {
    const recovered = history('Q1', {
      attempts: 10,
      correctCount: 9,
      incorrectCount: 1,
      lastResult: 'correct',
      needsReview: false,
      consecutiveCorrect: 4
    });

    expect(calculateWeaknessPriorityScore(recovered)).toBe(3);
    expect(isWeaknessPriorityCandidate(recovered)).toBe(false);
  });

  it('ranks weakness candidates by score and excludes recovered or unanswered questions', () => {
    const histories = new Map<string, LearningHistory>([
      [
        'Q1',
        history('Q1', {
          attempts: 3,
          correctCount: 1,
          incorrectCount: 2,
          lastResult: 'incorrect',
          needsReview: true,
          lastAnsweredAt: '2026-09-07T10:00:00.000Z'
        })
      ],
      [
        'Q2',
        history('Q2', {
          attempts: 2,
          correctCount: 1,
          uncertainCount: 1,
          lastResult: 'uncertain',
          needsReview: true,
          lastAnsweredAt: '2026-09-07T11:00:00.000Z'
        })
      ],
      [
        'Q3',
        history('Q3', {
          attempts: 10,
          correctCount: 9,
          incorrectCount: 1,
          lastResult: 'correct',
          consecutiveCorrect: 4
        })
      ]
    ]);

    expect(rankQuestionsByWeakness(questions, histories).map((question) => question.id)).toEqual([
      'Q1',
      'Q2'
    ]);
    expect(buildWeaknessPriorityItems(questions, histories).map((item) => item.question.id)).toEqual([
      'Q1',
      'Q2'
    ]);
  });
});

function makeQuestion(id: string): Question {
  return {
    id,
    subject: '科目',
    unit: '単元',
    topic: id,
    sourceType: 'predicted',
    sourceLabel: 'fixture',
    questionFormat: 'single-choice',
    importance: 'S',
    prompt: `問題${id}`,
    explanation,
    relatedMaterialIds: [],
    tags: [],
    revision: 1,
    choices: ['A', 'B'],
    correctChoiceIndexes: [0]
  };
}

function history(questionId: string, overrides: Partial<LearningHistory>): LearningHistory {
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
