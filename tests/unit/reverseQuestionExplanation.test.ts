import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FormalExplanationView } from '../../src/components/StudyContentCards';
import { sampleDataset } from '../../src/data/sampleDataset';
import type { Question } from '../../src/types/domain';

const inverseQuestion = {
  ...sampleDataset.questions[0]!,
  id: 'PRED-INTERVIEW-023',
  prompt: '進行がんの病状説明前の準備として最も不適切なのはどれか。',
  choices: [
    '伝える内容と質問を整理する。',
    '患者の同席者の希望を確認する。',
    '面談時間を確保する。',
    '廊下で家族の希望だけに基づいて説明する。'
  ],
  correctChoiceIndexes: [3],
  explanation: {
    ...sampleDataset.questions[0]!.explanation,
    answer: 'D. 廊下で家族の希望だけに基づいて説明する。',
    choice_explanations: ['A', 'B', 'C', 'D'].map((letter, index) => ({
      target_key: letter,
      display_order: index + 1,
      judgement: index === 3 ? 'correct' : 'incorrect',
      reason: index === 3 ? '不適切。本人の意思とプライバシーを損なう。' : '適切な準備である。',
      correction_condition: index === 3 ? '正答選択肢のため修正不要。' : '原資料に当該選択肢の個別修正条件の記載なし。',
      mapping_provenance: 'source_answer_rationale'
    }))
  }
} as Question;

describe('negatively worded single-choice explanation', () => {
  it('separates scoring correctness from the appropriateness of the statement', () => {
    const html = renderToStaticMarkup(
      createElement(FormalExplanationView, { question: inverseQuestion, media: [] })
    );
    expect(html).toContain('逆向き設問');
    expect(html).toContain('設問の正答（記述は不適切）');
    expect(html).toContain('設問では非正答（記述は適切）');
    expect(html).toContain('記述の適否と選択理由');
    expect(html).toContain('不適切。本人の意思とプライバシーを損なう。');
    expect(html).not.toContain('原資料に当該選択肢の個別修正条件の記載なし');
  });

  it('preserves normal labels for positively worded questions', () => {
    const html = renderToStaticMarkup(
      createElement(FormalExplanationView, { question: sampleDataset.questions[0]!, media: [] })
    );
    expect(html).not.toContain('逆向き設問');
    expect(html).toContain('正答理由');
    expect(html).toContain('誤答理由');
  });
});
