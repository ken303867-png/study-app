import { useMemo, useState } from 'react';
import type { LearningHistory, Question } from '../types/domain';
import {
  summarizePracticePool,
  type PracticeLimit,
  type PracticeOrder,
  type PracticePreset,
  type PracticeSetOptions
} from '../utils/practiceSets';

const PRESET_LABELS: Record<PracticePreset, string> = {
  all: 'すべて',
  review: '要復習',
  unanswered: '未回答',
  favorite: 'お気に入り',
  incorrect: '直近不正解',
  uncertain: '直近不確実'
};

const LIMITS: PracticeLimit[] = ['all', 10, 20, 50];

export function PracticeSetBuilder({
  questions,
  historyByQuestionId,
  sourceLabel,
  initialPreset = 'all',
  onStart,
  onCancel
}: {
  questions: Question[];
  historyByQuestionId: ReadonlyMap<string, LearningHistory>;
  sourceLabel: string;
  initialPreset?: PracticePreset;
  onStart: (options: PracticeSetOptions) => void;
  onCancel: () => void;
}) {
  const [preset, setPreset] = useState<PracticePreset>(initialPreset);
  const [order, setOrder] = useState<PracticeOrder>('sequential');
  const [limit, setLimit] = useState<PracticeLimit>('all');
  const summary = useMemo(
    () => summarizePracticePool(questions, historyByQuestionId),
    [questions, historyByQuestionId]
  );
  const presetCount = presetCountFromSummary(summary, preset);
  const selectedCount = limit === 'all' ? presetCount : Math.min(presetCount, limit);

  return (
    <section className="stack practice-set-builder" aria-label="演習セット作成">
      <div className="panel practice-set-heading">
        <div>
          <p className="eyebrow">Practice Set</p>
          <h2>演習セットを作成</h2>
          <p className="muted">母集団：{sourceLabel} / {questions.length}問</p>
        </div>
        <div className="practice-set-preview" aria-label="演習予定問題数">
          <strong>{selectedCount}</strong>
          <span>問を出題</span>
        </div>
      </div>

      <div className="panel">
        <fieldset className="practice-set-fieldset">
          <legend>演習する問題</legend>
          <div className="practice-preset-grid">
            {(Object.keys(PRESET_LABELS) as PracticePreset[]).map((value) => (
              <label key={value} className="practice-preset-option">
                <input
                  type="radio"
                  name="practice-preset"
                  value={value}
                  checked={preset === value}
                  onChange={() => setPreset(value)}
                />
                <span>
                  <strong>{PRESET_LABELS[value]}</strong>
                  <small>{presetCountFromSummary(summary, value)}問</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="panel practice-set-options">
        <label>
          <span>出題順</span>
          <select value={order} onChange={(event) => setOrder(event.currentTarget.value as PracticeOrder)}>
            <option value="sequential">元の順番</option>
            <option value="random">ランダム</option>
          </select>
        </label>
        <label>
          <span>出題数</span>
          <select
            value={String(limit)}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setLimit(value === 'all' ? 'all' : (Number(value) as 10 | 20 | 50));
            }}
          >
            {LIMITS.map((value) => (
              <option key={value} value={String(value)}>
                {value === 'all' ? '全件' : `${value}問`}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedCount === 0 && (
        <div className="panel warning-panel" role="status">
          <strong>この条件に一致する問題はありません。</strong>
          <p>別の演習対象を選択してください。</p>
        </div>
      )}

      <div className="panel practice-set-actions">
        <button
          type="button"
          disabled={selectedCount === 0}
          onClick={() => onStart({ preset, order, limit })}
        >
          {selectedCount}問の演習を開始
        </button>
        <button type="button" onClick={onCancel}>問題一覧へ戻る</button>
      </div>
    </section>
  );
}

function presetCountFromSummary(
  summary: ReturnType<typeof summarizePracticePool>,
  preset: PracticePreset
) {
  switch (preset) {
    case 'all':
      return summary.total;
    case 'review':
      return summary.review;
    case 'unanswered':
      return summary.unanswered;
    case 'favorite':
      return summary.favorite;
    case 'incorrect':
      return summary.incorrect;
    case 'uncertain':
      return summary.uncertain;
  }
}
