import { describe, expect, it } from 'vitest';
import type { Question } from '../../src/types/domain';
import {
  canSubmitPracticeAnswer,
  evaluatePracticeAnswer,
  normalizeTextAnswer
} from '../../src/utils/practiceEngine';

const baseExplanation = {
  answer: 'answer',
  question_intent: 'intent',
  reasoning: 'reasoning',
  choice_explanations: [],
  key_points: 'key',
  references: 'ref'
};

const singleChoiceQuestion: Question = {
  id: 'Q1',
  subject: '科目',
  unit: '単元',
  topic: '論点',
  sourceType: 'predicted',
  sourceLabel: 'fixture',
  questionFormat: 'single-choice',
  importance: 'S',
  prompt: '単一選択',
  explanation: baseExplanation,
  relatedMaterialIds: [],
  tags: [],
  revision: 1,
  choices: ['A案', 'B案', 'C案'],
  correctChoiceIndexes: [1]
};

const multipleChoiceQuestion: Question = {
  ...singleChoiceQuestion,
  id: 'Q2',
  questionFormat: 'multiple-choice',
  prompt: '複数選択',
  correctChoiceIndexes: [0, 2]
};

const recallQuestion: Question = {
  id: 'Q3',
  subject: '科目',
  unit: '単元',
  topic: '論点',
  sourceType: 'predicted',
  sourceLabel: 'fixture',
  questionFormat: 'fill-blank',
  importance: 'A',
  prompt: '穴埋め',
  explanation: baseExplanation,
  relatedMaterialIds: [],
  tags: [],
  revision: 1,
  acceptedAnswers: ['Zod', 'zod schema']
};

describe('practiceEngine', () => {
  it('evaluates a single-choice answer exactly', () => {
    expect(evaluatePracticeAnswer(singleChoiceQuestion, { kind: 'choices', indexes: [1] }).correct).toBe(true);
    expect(evaluatePracticeAnswer(singleChoiceQuestion, { kind: 'choices', indexes: [0] }).correct).toBe(false);
  });

  it('evaluates multiple-choice answers as an order-independent exact set', () => {
    expect(evaluatePracticeAnswer(multipleChoiceQuestion, { kind: 'choices', indexes: [2, 0] }).correct).toBe(true);
    expect(evaluatePracticeAnswer(multipleChoiceQuestion, { kind: 'choices', indexes: [0] }).correct).toBe(false);
    expect(evaluatePracticeAnswer(multipleChoiceQuestion, { kind: 'choices', indexes: [0, 1, 2] }).correct).toBe(false);
  });

  it('normalizes recall answers with NFKC, trim, case and whitespace', () => {
    expect(normalizeTextAnswer('  ＺＯＤ  ')).toBe('zod');
    expect(evaluatePracticeAnswer(recallQuestion, { kind: 'text', value: ' ZOD ' }).correct).toBe(true);
    expect(evaluatePracticeAnswer(recallQuestion, { kind: 'text', value: 'zod   schema' }).correct).toBe(true);
  });

  it('requires an actual answer before submission', () => {
    expect(canSubmitPracticeAnswer(singleChoiceQuestion, { kind: 'choices', indexes: [] })).toBe(false);
    expect(canSubmitPracticeAnswer(recallQuestion, { kind: 'text', value: '   ' })).toBe(false);
    expect(canSubmitPracticeAnswer(recallQuestion, { kind: 'text', value: 'Zod' })).toBe(true);
  });
});
