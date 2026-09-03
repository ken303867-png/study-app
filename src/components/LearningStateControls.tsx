import type { LearningHistory, LearningResult } from '../types/domain';

export function LearningStateControls({
  history,
  onRecord,
  onToggleFavorite,
  onToggleReview,
  onReset
}: {
  history: LearningHistory;
  onRecord: (result: LearningResult) => void;
  onToggleFavorite: () => void;
  onToggleReview: () => void;
  onReset: () => void;
}) {
  return (
    <section className="learning-controls" aria-label="学習状態">
      <div className="learning-summary">
        <div>
          <span className={`learning-status ${history.lastResult ?? 'unanswered'}`}>
            {learningStatusLabel(history)}
          </span>
          <span className="learning-attempts">{history.attempts}回</span>
        </div>
        <small>
          正解 {history.correctCount} / 不正解 {history.incorrectCount} / 不確実 {history.uncertainCount}
        </small>
      </div>
      <div className="learning-actions" aria-label="自己採点">
        <button type="button" onClick={() => onRecord('correct')}>正解</button>
        <button type="button" onClick={() => onRecord('incorrect')}>不正解</button>
        <button type="button" onClick={() => onRecord('uncertain')}>不確実</button>
      </div>
      <div className="learning-toggles">
        <button
          type="button"
          aria-pressed={history.needsReview === true}
          onClick={onToggleReview}
        >
          {history.needsReview ? '要復習 ✓' : '要復習'}
        </button>
        <button type="button" aria-pressed={history.favorite} onClick={onToggleFavorite}>
          {history.favorite ? 'お気に入り ★' : 'お気に入り ☆'}
        </button>
        {history.attempts > 0 && (
          <button type="button" className="learning-reset" onClick={onReset}>履歴をリセット</button>
        )}
      </div>
    </section>
  );
}

function learningStatusLabel(history: LearningHistory): string {
  if (history.attempts === 0 || history.lastResult === null) return '未回答';
  if (history.lastResult === 'correct') return '直近：正解';
  if (history.lastResult === 'incorrect') return '直近：不正解';
  return '直近：不確実';
}
