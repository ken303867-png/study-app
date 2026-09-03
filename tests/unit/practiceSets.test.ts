import { describe, expect, it } from 'vitest';
import type { LearningHistory, Question } from '../../src/types/domain';
import { buildPracticeSet, shuffleQuestions, summarizePracticePool } from '../../src/utils/practiceSets';

const explanation = {
  answer: 'answer',
  question_intent: 'intent',
  reasoning: 'reasoning',
  choice_explanations: [],
  key_points: 'key',
  references: 'ref'
};

const questions: Question[] = Array.from({ length: 5 }, (_, index) => makeQuestion(`Q${index + 1}`));

const histories = new Map<string, LearningHistory>([
  ['Q1', history('Q1', { attempts: 2, lastResult: 'incorrect', needsReview: true })],
  ['Q2', history('Q2', { attempts: 1, lastResult: 'correct', favorite: true })],
  ['Q3', history('Q3', { attempts: 1, lastResult: 'uncertain', needsReview: true })],
  ['Q5', history('Q5', { attempts: 3, lastResult: 'correct', favorite: true, needsReview: true })]
]);

describe('practiceSets', () => {
  it('summarizes all supported learning-state pools', () => {
    expect(summarizePracticePool(questions, histories)).toEqual({
      total: 5,
      review: 3,
      unanswered: 1,
      favorite: 2,
      incorrect: 1,
      uncertain: 1
    });
  });

  it('builds review, unanswered, favorite, incorrect and uncertain sets', () => {
    expect(ids(buildPracticeSet(questions, histories, options('review')))).toEqual(['Q1', 'Q3', 'Q5']);
    expect(ids(buildPracticeSet(questions, histories, options('unanswered')))).toEqual(['Q4']);
    expect(ids(buildPracticeSet(questions, histories, options('favorite')))).toEqual(['Q2', 'Q5']);
    expect(ids(buildPracticeSet(questions, histories, options('incorrect')))).toEqual(['Q1']);
    expect(ids(buildPracticeSet(questions, histories, options('uncertain')))).toEqual(['Q3']);
  });

  it('applies the question limit after preset filtering', () => {
    const reviewSet = buildPracticeSet(questions, histories, {
      preset: 'review',
      order: 'sequential',
      limit: 10
    });
    expect(ids(reviewSet)).toEqual(['Q1', 'Q3', 'Q5']);

    const twelveQuestions = Array.from({ length: 12 }, (_, index) => makeQuestion(`L${index + 1}`));
    const limited = buildPracticeSet(twelveQuestions, new Map(), {
      preset: 'all',
      order: 'sequential',
      limit: 10
    });
    expect(limited).toHaveLength(10);
    expect(ids(limited)).toEqual(Array.from({ length: 10 }, (_, index) => `L${index + 1}`));
  });

  it('randomizes a copied queue without mutating the source order', () => {
    const original = ids(questions);
    const shuffled = shuffleQuestions(questions, () => 0);
    expect(ids(questions)).toEqual(original);
    expect(ids(shuffled)).not.toEqual(original);
    expect(ids(shuffled).sort()).toEqual([...original].sort());
  });
});

function makeQuestion(id: string): Question {
  return {
    id,
    subject: '科目',
    unit: '単元',
    topic: `論点${id}`,
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

function options(preset: 'review' | 'unanswered' | 'favorite' | 'incorrect' | 'uncertain') {
  return { preset, order: 'sequential' as const, limit: 'all' as const };
}

function ids(items: Question[]) {
  return items.map((question) => question.id);
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
