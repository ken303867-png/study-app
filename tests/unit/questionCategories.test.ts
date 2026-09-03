import { describe, expect, it } from 'vitest';
import type { Question } from '../../src/types/domain';
import {
  classifyQuestion,
  countQuestionKinds,
  filterQuestionsByKinds,
  questionLearningArea
} from '../../src/utils/questionCategories';

const explanation = {
  answer: 'answer',
  question_intent: 'intent',
  reasoning: 'reasoning',
  choice_explanations: [],
  key_points: 'key',
  references: 'ref'
};

const questions: Question[] = [
  makeQuestion('JNA-1', 'japan-nursing-association', []),
  makeQuestion('CLOZE-1', 'other', ['supplemental:common-cloze']),
  makeQuestion('PRED-COM-1', 'predicted', []),
  makeQuestion('PAST-SPEC-1', 'past-exam', ['learning-area:specialty']),
  makeQuestion('PRED-SPEC-1', 'predicted', ['learning-area:specialty']),
  makeQuestion('PRED-SPEC-CASE-1', 'predicted', ['question-kind:specialty-predicted-case'])
];

describe('questionCategories', () => {
  it('classifies the six supported question kinds', () => {
    expect(questions.map(classifyQuestion)).toEqual([
      'common-jna',
      'common-cloze',
      'common-predicted',
      'specialty-past',
      'specialty-predicted',
      'specialty-predicted-case'
    ]);
  });

  it('derives common and specialty learning areas', () => {
    expect(questions.slice(0, 3).map(questionLearningArea)).toEqual([
      'common',
      'common',
      'common'
    ]);
    expect(questions.slice(3).map(questionLearningArea)).toEqual([
      'specialty',
      'specialty',
      'specialty'
    ]);
  });

  it('filters multiple selected kinds and reports counts', () => {
    expect(
      filterQuestionsByKinds(questions, ['specialty-past', 'specialty-predicted-case']).map(
        (question) => question.id
      )
    ).toEqual(['PAST-SPEC-1', 'PRED-SPEC-CASE-1']);

    expect(countQuestionKinds(questions)).toEqual({
      'common-jna': 1,
      'common-cloze': 1,
      'common-predicted': 1,
      'specialty-past': 1,
      'specialty-predicted': 1,
      'specialty-predicted-case': 1
    });
  });
});

function makeQuestion(
  id: string,
  sourceType: Question['sourceType'],
  tags: string[]
): Question {
  return {
    id,
    subject: '科目',
    unit: '単元',
    topic: id,
    sourceType,
    sourceLabel: 'fixture',
    questionFormat: 'single-choice',
    importance: 'S',
    prompt: id,
    explanation,
    relatedMaterialIds: [],
    tags,
    revision: 1,
    choices: ['A', 'B'],
    correctChoiceIndexes: [0]
  };
}
