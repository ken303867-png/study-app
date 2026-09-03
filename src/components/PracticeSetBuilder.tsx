import { useMemo, useState } from 'react';
import type { LearningHistory, Question } from '../types/domain';
import {
  EXAM_TIMER_MINUTES,
  summarizePracticePool,
  type ExamTimerMinutes,
  type PracticeLimit,
  type PracticeOrder,
  type PracticePreset,
  type PracticeSessionMode,
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
  const [mode, setMode] = useState<PracticeSessionMode>('practice');
  const [timerMinutes, setTimerMinutes] = useState<ExamTimerMinutes>(0);
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
          <legend>実施モード</legend>
          <div className="practice-preset-grid practice-mode-options">
            <label className="practice-preset-option">
              <input
                type="radio"
                name="practice-mode"
                value="practice"
                checked={mode === 'practice'}
                onChange={() => setMode('practice')}
              />
              <span>
                <strong>通常演習</strong>
                <small>回答直後に正誤・解説を表示</small>
              </span>
            </label>
            <label className="practice-preset-option">
              <input
                type="radio"
                name="practice-mode"
                value="exam"
                checked={mode === 'exam'}
                onChange={() => setMode('exam')}
              />
              <span>
                <strong>試験モード</strong>
                <small>終了まで正誤・正答・解説を非表示</small>
              </span>
            </label>
          </div>
        </fieldset>
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
        <label>
          <span>試験タイマー</span>
          <select
            value={String(timerMinutes)}
            disabled={mode !== 'exam'}
            onChange={(event) => setTimerMinutes(Number(event.currentTarget.value) as ExamTimerMinutes)}
          >
            {EXAM_TIMER_MINUTES.map((value) => (
              <option key={value} value={String(value)}>
                {value === 0 ? 'なし' : `${value}分`}
              </option>
            ))}
          </select>
        </label>
      </div>

      {mode === 'exam' && (
        <div className="panel exam-mode-note" role="note">
          <strong>試験モード</strong>
          <p>途中では正誤・正答・解説を表示しません。未回答の問題があっても終了でき、最後に一括採点します。</p>
        </div>
      )}

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
          onClick={() => onStart({ preset, order, limit, mode, timerMinutes })}
        >
          {selectedCount}問の{mode === 'exam' ? '試験' : '演習'}を開始
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
