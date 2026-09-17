import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormalExplanationView } from '../../src/components/StudyContentCards';
import type { Question } from '../../src/types/domain';

describe('FormalExplanationView final cloze', () => {
  it('does not render an empty choice-explanation section for cloze questions', () => {
    const question = {
      id: 'B26-CORE-001',
      subject: '臨床病態生理学',
      unit: '病理・遺伝・腫瘍基礎',
      topic: '病理診断の統合',
      sourceType: 'predicted',
      sourceLabel: '最終暗記100項目',
      questionFormat: 'fill-blank',
      importance: 'S',
      prompt: '病理診断では（　）を統合する。',
      acceptedAnswers: ['臨床情報'],
      explanation: {
        answer: '臨床情報',
        question_intent: '即時再生を確認する。',
        reasoning: '病理診断は臨床情報を統合する。',
        choice_explanations: [],
        key_points: '臨床情報を統合する。',
        references: '共通科目正本'
      },
      relatedMaterialIds: [],
      tags: ['supplemental:common-final-2026', 'learning-area:common', 'question-kind:common-cloze'],
      revision: 1
    } as Question;

    render(<FormalExplanationView question={question} media={[]} />);

    expect(screen.getByText('臨床情報')).toBeInTheDocument();
    expect(screen.queryByText('各選択肢解説')).not.toBeInTheDocument();
  });
});
