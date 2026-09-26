import { describe, expect, it } from 'vitest';
import type { Question } from '../../src/types/domain';
import {
  COMMON_CURRICULUM_SUBJECTS,
  classifyQuestion,
  countCommonSubjectQuestions,
  countQuestionKinds,
  filterQuestionsByKinds,
  filterQuestionsBySubjects,
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
  makeQuestion('FINAL-CHOICE-1', 'predicted', [
    'learning-area:common',
    'supplemental:common-final-2026',
    'question-kind:common-final'
  ]),
  makeQuestion('FINAL-CLOZE-1', 'predicted', [
    'learning-area:common',
    'supplemental:common-final-2026',
    'question-kind:common-cloze'
  ]),
  makeQuestion('PAST-SPEC-1', 'past-exam', ['learning-area:specialty']),
  makeQuestion('PRED-SPEC-1', 'predicted', ['learning-area:specialty']),
  makeQuestion('PRED-SPEC-CASE-1', 'predicted', ['question-kind:specialty-predicted-case'])
];

describe('questionCategories', () => {
  it('keeps the cloze subtype for final-prep self-assessment', () => {
    expect(questions.map(classifyQuestion)).toEqual([
      'common-jna',
      'common-cloze',
      'common-predicted',
      'common-final',
      'common-cloze',
      'specialty-past',
      'specialty-predicted',
      'specialty-predicted-case'
    ]);
  });

  it('derives common and specialty learning areas', () => {
    expect(questions.slice(0, 5).map(questionLearningArea)).toEqual([
      'common',
      'common',
      'common',
      'common',
      'common'
    ]);
    expect(questions.slice(5).map(questionLearningArea)).toEqual([
      'specialty',
      'specialty',
      'specialty'
    ]);
  });

  it('groups all final-prep rows under the final-prep display category', () => {
    expect(filterQuestionsByKinds(questions, ['common-final']).map((question) => question.id)).toEqual([
      'FINAL-CHOICE-1',
      'FINAL-CLOZE-1'
    ]);

    expect(countQuestionKinds(questions)).toEqual({
      'common-jna': 1,
      'common-cloze': 1,
      'common-predicted': 1,
      'common-predicted30': 0,
      'common-final': 2,
      'specialty-past': 1,
      'specialty-predicted': 1,
      'specialty-predicted-case': 1
    });
  });

  it('keeps supplemental predicted30 distinct from existing common predicted questions', () => {
    const imported = makeQuestion('PRED-PATH-001', 'predicted', [
      'learning-area:common',
      'question-kind:common-predicted30',
      'supplemental:common-predicted30'
    ]);
    expect(classifyQuestion(imported)).toBe('common-predicted30');
    expect(questionLearningArea(imported)).toBe('common');
    expect(filterQuestionsByKinds([...questions, imported], ['common-predicted30'])).toEqual([
      imported
    ]);
    expect(countQuestionKinds([...questions, imported])['common-predicted30']).toBe(1);
  });

  it('defines the 17 common curriculum subjects and filters/counts them exactly', () => {
    expect(COMMON_CURRICULUM_SUBJECTS).toHaveLength(17);

    const subjectQuestions: Question[] = [
      {
        ...makeQuestion('PATHO-1', 'japan-nursing-association', []),
        subject: '臨床病態生理学'
      },
      {
        ...makeQuestion('PATHO-2', 'other', ['supplemental:common-cloze']),
        subject: '臨床病態生理学'
      },
      { ...makeQuestion('REASONING-1', 'predicted', []), subject: '臨床推論' },
      { ...makeQuestion('UNKNOWN-1', 'predicted', []), subject: 'サンプル科目' }
    ];

    expect(
      filterQuestionsBySubjects(subjectQuestions, ['臨床推論']).map((question) => question.id)
    ).toEqual(['REASONING-1']);
    expect(filterQuestionsBySubjects(subjectQuestions, [])).toEqual([]);
    expect(filterQuestionsBySubjects(subjectQuestions, undefined)).toHaveLength(4);

    const counts = countCommonSubjectQuestions(subjectQuestions);
    expect(counts['臨床病態生理学']).toBe(2);
    expect(counts['臨床推論']).toBe(1);
    expect(Object.keys(counts)).toHaveLength(17);
  });

  it('filters multiple selected specialty kinds', () => {
    expect(
      filterQuestionsByKinds(questions, ['specialty-past', 'specialty-predicted-case']).map(
        (question) => question.id
      )
    ).toEqual(['PAST-SPEC-1', 'PRED-SPEC-CASE-1']);
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
