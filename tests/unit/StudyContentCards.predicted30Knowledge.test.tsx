import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormalExplanationView } from '../../src/components/StudyContentCards';
import type { Question } from '../../src/types/domain';
import { splitPredicted30Knowledge } from '../../src/utils/splitPredicted30Knowledge';

const composite = [
  'surroundingKnowledge: 複数職種による協働の定義。',
  'comparisonText: 職種が集まるだけの場合と共同実践の違い。',
  'commonMistakes: 同じ場所にいるだけでは協働とは限らない。',
  'correctionConditions: 施設の手順に合わせて役割を調整する。'
].join('\n');

const predicted30: Question = {
  id: 'PRED-TEAM-020',
  subject: 'チーム医療論（特定行為実践）',
  unit: '協働',
  topic: 'IPW',
  sourceType: 'predicted',
  sourceLabel: '予想問題30',
  questionFormat: 'single-choice',
  importance: 'A',
  prompt: 'IPWの目的を選択する。',
  explanation: {
    answer: 'D. 協働する。',
    question_intent: '協働の目的',
    reasoning: '情報共有と共同実践を考える。',
    source_explanation_raw: 'IPWは単なる多職種の同居ではなく共同意思決定を含む。',
    choice_explanations: [
      { target_key: 'A', display_order: 1, judgement: 'incorrect', reason: '誤答A', correction_condition: '該当しない', mapping_provenance: 'source_structured' },
      { target_key: 'B', display_order: 2, judgement: 'incorrect', reason: '誤答B', correction_condition: '該当しない', mapping_provenance: 'source_structured' },
      { target_key: 'C', display_order: 3, judgement: 'incorrect', reason: '誤答C', correction_condition: '該当しない', mapping_provenance: 'source_structured' },
      { target_key: 'D', display_order: 4, judgement: 'correct', reason: '正答D', correction_condition: '正答肢のため修正不要', mapping_provenance: 'source_structured' }
    ],
    surrounding_knowledge: composite,
    key_points: '協働する。',
    references: '合成テスト'
  },
  relatedMaterialIds: [],
  tags: ['learning-area:common', 'question-kind:common-predicted30', 'supplemental:common-predicted30'],
  revision: 1,
  choices: ['A','B','C','D'],
  correctChoiceIndexes: [3]
};

describe('Predicted30 explanation layout', () => {
  it('splits all four source fields and leaves no internal property names visible', () => {
    const result = splitPredicted30Knowledge(composite);
    expect(result?.map((part) => part.key)).toEqual([
      'surroundingKnowledge',
      'comparisonText',
      'commonMistakes',
      'correctionConditions'
    ]);
    render(<FormalExplanationView question={predicted30} media={[]} />);

    for (const heading of [
      '元資料の全体解説',
      '関連する周辺知識',
      '比較・鑑別',
      '試験で間違いやすいポイント',
      '正しくなる条件・適用条件'
    ]) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    }

    expect(screen.getByText('複数職種による協働の定義。')).toBeInTheDocument();
    expect(screen.getByText('職種が集まるだけの場合と共同実践の違い。')).toBeInTheDocument();
    expect(screen.getByText('同じ場所にいるだけでは協働とは限らない。')).toBeInTheDocument();
    expect(screen.getByText('施設の手順に合わせて役割を調整する。')).toBeInTheDocument();
    expect(screen.getByText('IPWは単なる多職種の同居ではなく共同意思決定を含む。')).toBeInTheDocument();
    expect(screen.queryByText(/surroundingKnowledge:|comparisonText:|commonMistakes:|correctionConditions:/)).not.toBeInTheDocument();
    expect(screen.getByText('D. 協働する。')).toBeInTheDocument();
  });

  it('does not rewrite unrelated free-form explanatory text', () => {
    expect(splitPredicted30Knowledge('一般的な解説テキスト。')).toBeNull();
    expect(splitPredicted30Knowledge(undefined)).toBeNull();
    expect(splitPredicted30Knowledge('surroundingKnowledge: 部分的な旧データ。')).toBeNull();
  });
});
