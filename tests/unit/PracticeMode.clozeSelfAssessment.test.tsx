import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PracticeMode } from '../../src/components/PracticeMode';
import { PracticeSetBuilder } from '../../src/components/PracticeSetBuilder';
import type { LearningHistory, Question } from '../../src/types/domain';

const clozeQuestion: Question = {
  id: 'CLOZE-TEST-001',
  subject: '共通科目',
  unit: '穴抜き',
  topic: '自己採点',
  sourceType: 'other',
  sourceLabel: 'non-formal test fixture',
  questionFormat: 'fill-blank',
  importance: 'A',
  prompt: 'インスリンは（　　　）から分泌される。',
  acceptedAnswers: ['膵β細胞', '膵臓のβ細胞'],
  explanation: {
    answer: '膵β細胞',
    question_intent: 'test fixture',
    reasoning: 'test fixture',
    choice_explanations: [],
    key_points: 'test fixture',
    references: 'test fixture'
  },
  relatedMaterialIds: [],
  tags: ['supplemental:common-cloze'],
  revision: 1
};

const history = new Map<string, LearningHistory>();

function renderPractice(onRecordResult = vi.fn().mockResolvedValue(undefined)) {
  render(
    <PracticeMode
      questions={[clozeQuestion]}
      historyByQuestionId={history}
      onRecordResult={onRecordResult}
      onToggleFavorite={vi.fn().mockResolvedValue(undefined)}
      onToggleReview={vi.fn().mockResolvedValue(undefined)}
      onExit={vi.fn()}
      renderExplanation={() => null}
    />
  );
  return onRecordResult;
}

describe('common cloze self assessment', () => {
  it('reveals the answer without a text input and records review self-assessment', async () => {
    const onRecordResult = renderPractice();

    expect(screen.queryByText('回答を入力')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '答えを見る' }));

    const revealed = screen.getByRole('status');
    expect(revealed).toHaveTextContent('正答');
    expect(revealed).toHaveTextContent('膵β細胞');
    expect(screen.getByRole('button', { name: '正解', exact: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '不正解', exact: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '要復習', exact: true })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '要復習', exact: true }));

    await waitFor(() =>
      expect(onRecordResult).toHaveBeenCalledWith('CLOZE-TEST-001', 'uncertain')
    );
    const feedback = screen.getByRole('status');
    expect(feedback).toHaveTextContent('要復習');
    expect(feedback).toHaveTextContent('正答：膵β細胞 / 膵臓のβ細胞');
  });

  it('disables exam mode while a cloze category is selected', () => {
    render(
      <PracticeSetBuilder
        questions={[clozeQuestion]}
        historyByQuestionId={history}
        sourceLabel="test"
        onStart={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole('radio', { name: /試験モード/ })).toBeDisabled();
    expect(screen.getByRole('note')).toHaveTextContent('穴抜き問題は自己採点方式です');
  });
});
