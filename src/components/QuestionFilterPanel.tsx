import { IMPORTANCE_LEVELS } from '../types/domain';
import {
  LEARNING_AREA_LABELS,
  QUESTION_KIND_LABELS,
  QUESTION_KINDS,
  QUESTION_KINDS_BY_AREA,
  type LearningArea,
  type QuestionKind
} from '../utils/questionCategories';
import type { QuestionFilterState } from '../utils/contentFilters';

export function QuestionFilterPanel({
  filters,
  subjects,
  units,
  resultCount,
  totalCount,
  onChange,
  onReset
}: {
  filters: QuestionFilterState;
  subjects: string[];
  units: string[];
  resultCount: number;
  totalCount: number;
  onChange: (next: QuestionFilterState) => void;
  onReset: () => void;
}) {
  const visibleKinds =
    filters.learningArea === 'all'
      ? QUESTION_KINDS
      : QUESTION_KINDS_BY_AREA[filters.learningArea];

  return (
    <section className="filter-panel" aria-label="問題の検索と絞り込み">
      <div className="filter-panel-heading">
        <div>
          <h3>検索・絞り込み</h3>
          <p className="muted">表示 {resultCount} / {totalCount}問</p>
        </div>
        <button type="button" onClick={onReset}>条件をクリア</button>
      </div>
      <div className="filter-grid">
        <label className="filter-field filter-field-wide">
          <span>キーワード・問題ID</span>
          <input
            type="search"
            value={filters.query}
            placeholder="問題文、論点、IDなど"
            onChange={(event) => onChange({ ...filters, query: event.currentTarget.value })}
          />
        </label>
        <label className="filter-field">
          <span>学習分野</span>
          <select
            value={filters.learningArea}
            onChange={(event) =>
              onChange({
                ...filters,
                learningArea: event.currentTarget.value as 'all' | LearningArea,
                questionKind: 'all'
              })
            }
          >
            <option value="all">すべて</option>
            <option value="common">{LEARNING_AREA_LABELS.common}</option>
            <option value="specialty">{LEARNING_AREA_LABELS.specialty}</option>
          </select>
        </label>
        <label className="filter-field">
          <span>問題の種類</span>
          <select
            value={filters.questionKind}
            onChange={(event) =>
              onChange({
                ...filters,
                questionKind: event.currentTarget.value as 'all' | QuestionKind
              })
            }
          >
            <option value="all">すべて</option>
            {visibleKinds.map((kind) => (
              <option key={kind} value={kind}>
                {filters.learningArea === 'all'
                  ? `${kind.startsWith('common-') ? '共通' : '専門'}：${QUESTION_KIND_LABELS[kind]}`
                  : QUESTION_KIND_LABELS[kind]}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>科目</span>
          <select
            value={filters.subject}
            onChange={(event) =>
              onChange({ ...filters, subject: event.currentTarget.value, unit: '' })
            }
          >
            <option value="">すべて</option>
            {subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
          </select>
        </label>
        <label className="filter-field">
          <span>単元</span>
          <select
            value={filters.unit}
            onChange={(event) => onChange({ ...filters, unit: event.currentTarget.value })}
          >
            <option value="">すべて</option>
            {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
          </select>
        </label>
        <label className="filter-field">
          <span>重要度</span>
          <select
            value={filters.importance}
            onChange={(event) =>
              onChange({
                ...filters,
                importance: event.currentTarget.value as QuestionFilterState['importance']
              })
            }
          >
            <option value="all">すべて</option>
            {IMPORTANCE_LEVELS.map((importance) => (
              <option key={importance} value={importance}>{importance}</option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>学習状態</span>
          <select
            value={filters.learningState}
            onChange={(event) =>
              onChange({
                ...filters,
                learningState: event.currentTarget.value as QuestionFilterState['learningState']
              })
            }
          >
            <option value="all">すべて</option>
            <option value="unanswered">未回答</option>
            <option value="correct">直近：正解</option>
            <option value="incorrect">直近：不正解</option>
            <option value="uncertain">直近：不確実</option>
            <option value="review">要復習</option>
            <option value="favorite">お気に入り</option>
            <option value="completed">学習済み</option>
          </select>
        </label>
      </div>
    </section>
  );
}
