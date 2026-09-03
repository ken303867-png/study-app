import { IMPORTANCE_LEVELS } from '../types/domain';
import type { MaterialFilterState } from '../utils/contentFilters';

export function MaterialFilterPanel({
  filters,
  subjects,
  resultCount,
  totalCount,
  onChange,
  onReset
}: {
  filters: MaterialFilterState;
  subjects: string[];
  resultCount: number;
  totalCount: number;
  onChange: (next: MaterialFilterState) => void;
  onReset: () => void;
}) {
  return (
    <section className="filter-panel" aria-label="資料の検索と絞り込み">
      <div className="filter-panel-heading">
        <div>
          <h3>検索・絞り込み</h3>
          <p className="muted">表示 {resultCount} / {totalCount}資料</p>
        </div>
        <button type="button" onClick={onReset}>条件をクリア</button>
      </div>
      <div className="filter-grid">
        <label className="filter-field filter-field-wide">
          <span>キーワード・資料ID</span>
          <input
            type="search"
            value={filters.query}
            placeholder="単元、本文、IDなど"
            onChange={(event) => onChange({ ...filters, query: event.currentTarget.value })}
          />
        </label>
        <label className="filter-field">
          <span>科目</span>
          <select
            value={filters.subject}
            onChange={(event) => onChange({ ...filters, subject: event.currentTarget.value })}
          >
            <option value="">すべて</option>
            {subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
          </select>
        </label>
        <label className="filter-field">
          <span>重要度</span>
          <select
            value={filters.importance}
            onChange={(event) =>
              onChange({
                ...filters,
                importance: event.currentTarget.value as MaterialFilterState['importance']
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
          <span>関連問題数</span>
          <select
            value={filters.relatedCount}
            onChange={(event) =>
              onChange({
                ...filters,
                relatedCount: event.currentTarget.value as MaterialFilterState['relatedCount']
              })
            }
          >
            <option value="all">すべて</option>
            <option value="none">0件</option>
            <option value="1-4">1〜4件</option>
            <option value="5-plus">5件以上</option>
          </select>
        </label>
      </div>
    </section>
  );
}
