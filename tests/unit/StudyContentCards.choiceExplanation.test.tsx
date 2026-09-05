import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormalExplanationView } from '../../src/components/StudyContentCards';
import type { Question } from '../../src/types/domain';

const question: Question = {
  id: 'TEST-SPECIALTY-001',
  subject: '専門分野：摂食・嚥下障害看護',
  unit: '一般問題',
  topic: '脳神経',
  sourceType: 'predicted',
  sourceLabel: '表示QA',
  questionFormat: 'single-choice',
  importance: 'A',
  prompt: '表示QA用の問題',
  explanation: {
    answer: 'A. 顔面神経',
    question_intent: '表示を確認する。',
    reasoning: '正答理由と誤答理由を分けて表示する。',
    choice_explanations: [
      {
        target_key: 'A',
        display_order: 1,
        judgement: 'correct',
        reason: '正答肢の理由。',
        correction_condition: '正答肢のため修正不要。',
        mapping_provenance: 'source_structured'
      },
      {
        target_key: 'B',
        display_order: 2,
        judgement: 'incorrect',
        reason: 'この選択肢は本問の判断条件と一致しない。',
        correction_condition: 'この選択肢は下記の内容に修正すると成立する。',
        corrected_statement: '三叉神経は舌前2/3の一般体性感覚を担う。',
        mapping_provenance: 'source_structured'
      },
      {
        target_key: 'C',
        display_order: 3,
        judgement: 'incorrect',
        reason: 'この選択肢は別の神経支配を示す。',
        correction_condition: '舌咽神経は舌後1/3の味覚に関与する。',
        mapping_provenance: 'source_structured'
      },
      {
        target_key: 'D',
        display_order: 4,
        judgement: 'incorrect',
        reason: 'この選択肢は本問の所見を説明しない。',
        correction_condition: '迷走神経は咽喉頭の感覚・運動に重要である。',
        mapping_provenance: 'source_structured'
      }
    ],
    key_points: '表示QA',
    references: '表示QA用根拠'
  },
  relatedMaterialIds: [],
  tags: [],
  revision: 1,
  choices: ['顔面神経', '三叉神経', '舌咽神経', '迷走神経'],
  correctChoiceIndexes: [0]
};

describe('FormalExplanationView choice explanation roles', () => {
  it('hides correction UI for the correct choice and separates reason from corrected statement for wrong choices', () => {
    render(<FormalExplanationView question={question} media={[]} />);

    const correctCard = screen.getByText('正答').closest('article');
    expect(correctCard).not.toBeNull();
    expect(within(correctCard!).getByText('正答理由')).toBeInTheDocument();
    expect(within(correctCard!).queryByText('正しく覚えるなら')).not.toBeInTheDocument();
    expect(within(correctCard!).queryByText('正答肢のため修正不要。')).not.toBeInTheDocument();

    const wrongCards = screen.getAllByText('誤答').map((node) => node.closest('article'));
    expect(wrongCards).toHaveLength(3);

    expect(within(wrongCards[0]!).getByText('誤答理由')).toBeInTheDocument();
    expect(within(wrongCards[0]!).getByText('正しく覚えるなら')).toBeInTheDocument();
    expect(
      within(wrongCards[0]!).getByText('三叉神経は舌前2/3の一般体性感覚を担う。')
    ).toBeInTheDocument();
    expect(
      within(wrongCards[0]!).queryByText('この選択肢は下記の内容に修正すると成立する。')
    ).not.toBeInTheDocument();

    expect(
      within(wrongCards[1]!).getByText('舌咽神経は舌後1/3の味覚に関与する。')
    ).toBeInTheDocument();
  });
});
