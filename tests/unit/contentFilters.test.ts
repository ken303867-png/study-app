import { describe, expect, it } from 'vitest';
import { sampleDataset } from '../../src/data/sampleDataset';
import type { LearningHistory, Material, Question } from '../../src/types/domain';
import {
  DEFAULT_MATERIAL_FILTERS,
  DEFAULT_QUESTION_FILTERS,
  filterMaterials,
  filterQuestions
} from '../../src/utils/contentFilters';

const baseQuestion = sampleDataset.questions[0] as Question;
const sourceQuestion: Question = {
  ...baseQuestion,
  id: 'LEARN-COM-002',
  subject: '臨床推論',
  unit: '医療面接',
  topic: 'SOAP',
  sourceType: 's-que',
  sourceLabel: 'S-QUE',
  importance: 'S+',
  prompt: 'ＳＯＡＰで患者の主観的情報を表すのはどれか。',
  tags: ['面接', 'SOAP']
};
const predictedQuestion: Question = {
  ...baseQuestion,
  id: 'PRED-COM-001',
  subject: '薬理学',
  unit: '糖尿病治療薬',
  topic: 'SGLT2阻害薬',
  sourceType: 'predicted',
  sourceLabel: '予想問題',
  importance: 'A',
  prompt: 'SGLT2阻害薬について正しいものはどれか。',
  tags: ['予想', '糖尿病']
};

function history(
  questionId: string,
  values: Partial<LearningHistory>
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
    ...values
  };
}

describe('filterQuestions', () => {
  const questions = [sourceQuestion, predictedQuestion];

  it('normalizes NFKC/case and searches question content', () => {
    expect(
      filterQuestions(questions, new Map(), {
        ...DEFAULT_QUESTION_FILTERS,
        query: 'soap'
      }).map((question) => question.id)
    ).toEqual(['LEARN-COM-002']);
  });

  it('filters subject, unit and importance', () => {
    expect(
      filterQuestions(questions, new Map(), {
        ...DEFAULT_QUESTION_FILTERS,
        subject: '臨床推論',
        unit: '医療面接',
        importance: 'S+'
      }).map((question) => question.id)
    ).toEqual(['LEARN-COM-002']);
  });

  it('separates predicted from source-backed questions', () => {
    expect(
      filterQuestions(questions, new Map(), {
        ...DEFAULT_QUESTION_FILTERS,
        origin: 'predicted'
      }).map((question) => question.id)
    ).toEqual(['PRED-COM-001']);
    expect(
      filterQuestions(questions, new Map(), {
        ...DEFAULT_QUESTION_FILTERS,
        origin: 'source'
      }).map((question) => question.id)
    ).toEqual(['LEARN-COM-002']);
  });

  it('filters every learning-state category without inventing history', () => {
    const histories = new Map<string, LearningHistory>([
      [
        'LEARN-COM-002',
        history('LEARN-COM-002', {
          attempts: 2,
          correctCount: 1,
          incorrectCount: 1,
          lastResult: 'incorrect',
          favorite: true,
          needsReview: true
        })
      ]
    ]);

    const ids = (learningState: typeof DEFAULT_QUESTION_FILTERS.learningState) =>
      filterQuestions(questions, histories, {
        ...DEFAULT_QUESTION_FILTERS,
        learningState
      }).map((question) => question.id);

    expect(ids('unanswered')).toEqual(['PRED-COM-001']);
    expect(ids('incorrect')).toEqual(['LEARN-COM-002']);
    expect(ids('review')).toEqual(['LEARN-COM-002']);
    expect(ids('favorite')).toEqual(['LEARN-COM-002']);
    expect(ids('completed')).toEqual(['LEARN-COM-002']);
    expect(ids('correct')).toEqual([]);
    expect(ids('uncertain')).toEqual([]);
  });
});

describe('filterMaterials', () => {
  const materials: Material[] = [
    {
      id: 'MAT-001',
      subject: '臨床推論',
      unit: '医療面接',
      title: 'SOAPの要点',
      importance: 'S+',
      body: 'SOAPは診療録の基本構造。',
      relatedQuestionIds: ['Q1'],
      tags: ['SOAP'],
      revision: 1
    },
    {
      id: 'MAT-002',
      subject: '薬理学',
      unit: '糖尿病治療薬',
      title: '糖尿病薬まとめ',
      importance: 'A',
      body: 'SGLT2阻害薬などを比較する。',
      relatedQuestionIds: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'],
      tags: ['糖尿病'],
      revision: 1
    },
    {
      id: 'MAT-003',
      subject: 'その他',
      unit: '未リンク',
      title: 'リンクなし',
      importance: 'B',
      body: '補助資料。',
      relatedQuestionIds: [],
      tags: [],
      revision: 1
    }
  ];

  it('filters by keyword and importance', () => {
    expect(
      filterMaterials(materials, {
        ...DEFAULT_MATERIAL_FILTERS,
        query: 'sglt2',
        importance: 'A'
      }).map((material) => material.id)
    ).toEqual(['MAT-002']);
  });

  it('filters by related-question count', () => {
    expect(
      filterMaterials(materials, {
        ...DEFAULT_MATERIAL_FILTERS,
        relatedCount: 'none'
      }).map((material) => material.id)
    ).toEqual(['MAT-003']);
    expect(
      filterMaterials(materials, {
        ...DEFAULT_MATERIAL_FILTERS,
        relatedCount: '1-4'
      }).map((material) => material.id)
    ).toEqual(['MAT-001']);
    expect(
      filterMaterials(materials, {
        ...DEFAULT_MATERIAL_FILTERS,
        relatedCount: '5-plus'
      }).map((material) => material.id)
    ).toEqual(['MAT-002']);
  });
});
