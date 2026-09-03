import { useMemo } from 'react';
import type { LearningHistory, Question } from '../types/domain';
import {
  buildLearningAnalytics,
  formatPercent,
  type LearningGroupStats
} from '../utils/learningAnalytics';
import type { PracticePreset } from '../utils/practiceSets';

export function LearningDashboard({
  questions,
  historyByQuestionId,
  onPractice,
  onOpenQuestion
}: {
  questions: Question[];
  historyByQuestionId: ReadonlyMap<string, LearningHistory>;
  onPractice: (pool: Question[], label: string, initialPreset?: PracticePreset) => void;
  onOpenQuestion: (questionId: string) => void;
}) {
  const analytics = useMemo(
    () => buildLearningAnalytics(questions, historyByQuestionId),
    [questions, historyByQuestionId]
  );
  const { overall } = analytics;

  if (questions.length === 0) {
    return (
      <section className="panel dashboard-empty" aria-label="学習ダッシュボード">
        <p className="eyebrow">Learning Analytics</p>
        <h2>学習ダッシュボード</h2>
        <p>問題データを読み込むと、学習履歴から成績と復習優先範囲を集計します。</p>
      </section>
    );
  }

  return (
    <section className="stack learning-dashboard" aria-label="学習ダッシュボード">
      <div className="panel dashboard-heading">
        <div>
          <p className="eyebrow">Learning Analytics</p>
          <h2>学習ダッシュボード</h2>
          <p className="muted">IndexedDBの学習履歴から再計算。正式問題・正答・解説は変更しません。</p>
        </div>
        <button
          type="button"
          disabled={overall.needsReviewQuestions === 0}
          onClick={() => onPractice(questions, '全問題', 'review')}
        >
          要復習 {overall.needsReviewQuestions}問を演習
        </button>
      </div>

      <div className="dashboard-metrics" aria-label="全体学習指標">
        <Metric label="学習済み" value={`${overall.answeredQuestions} / ${overall.totalQuestions}`} detail={formatPercent(overall.coverage)} />
        <Metric label="総回答" value={`${overall.totalAttempts}回`} detail={`正解 ${overall.correctAttempts}回`} />
        <Metric label="正答率" value={formatPercent(overall.accuracy)} detail="累計attempt基準" />
        <Metric label="要復習" value={`${overall.needsReviewQuestions}問`} detail={`率 ${formatPercent(overall.reviewRate)}`} />
        <Metric label="誤答" value={`${overall.incorrectAttempts}回`} detail={`不確実 ${overall.uncertainAttempts}回`} />
        <Metric label="未回答" value={`${overall.unansweredQuestions}問`} detail={`お気に入り ${overall.favoriteQuestions}問`} />
      </div>

      <div className="panel dashboard-definition">
        <strong>復習優先順位の定義</strong>
        <p>
          回答履歴がある範囲だけを対象に、要復習率が高い順 → 誤答・不確実率が高い順 → 正答率が低い順で並べます。
          未回答問題は弱点とは判定せず、未回答として別集計します。
        </p>
      </div>

      <div className="grid-two dashboard-priority-grid">
        <PriorityPanel
          title="復習優先 科目"
          groups={analytics.reviewPrioritySubjects.slice(0, 8)}
          questions={questions}
          onPractice={onPractice}
        />
        <PriorityPanel
          title="復習優先 単元"
          groups={analytics.reviewPriorityUnits.slice(0, 8)}
          questions={questions}
          onPractice={onPractice}
          showUnit
        />
      </div>

      <div className="panel">
        <div className="dashboard-section-heading">
          <div>
            <h3>科目別成績</h3>
            <p className="muted">全科目を同じ指標で比較します。</p>
          </div>
        </div>
        <div className="dashboard-table-scroll">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>科目</th>
                <th>学習済み</th>
                <th>回答</th>
                <th>正答率</th>
                <th>誤答/不確実</th>
                <th>要復習</th>
                <th>演習</th>
              </tr>
            </thead>
            <tbody>
              {analytics.bySubject.map((group) => {
                const pool = questions.filter((question) => question.subject === group.subject);
                return (
                  <tr key={group.key}>
                    <th scope="row">{group.subject}</th>
                    <td>{group.answeredQuestions}/{group.totalQuestions}</td>
                    <td>{group.totalAttempts}回</td>
                    <td>{formatPercent(group.accuracy)}</td>
                    <td>{group.incorrectAttempts}/{group.uncertainAttempts}</td>
                    <td>{group.needsReviewQuestions}問</td>
                    <td>
                      <button type="button" onClick={() => onPractice(pool, group.subject)}>
                        セット作成
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="dashboard-section-heading">
          <div>
            <h3>直近の要注意問題</h3>
            <p className="muted">直近結果が不正解または不確実の問題を新しい順に表示します。</p>
          </div>
        </div>
        {analytics.recentAttention.length === 0 ? (
          <p className="dashboard-empty-note">現在、直近不正解・不確実の問題はありません。</p>
        ) : (
          <div className="dashboard-attention-list">
            {analytics.recentAttention.slice(0, 8).map(({ question, history }) => (
              <button
                key={question.id}
                type="button"
                className="dashboard-attention-item"
                onClick={() => onOpenQuestion(question.id)}
              >
                <span>
                  <strong>{question.subject} / {question.unit}</strong>
                  <small>{question.id}</small>
                </span>
                <span className={`dashboard-result ${history.lastResult ?? ''}`}>
                  {history.lastResult === 'incorrect' ? '不正解' : '不確実'}
                </span>
                <span className="dashboard-attention-prompt">{question.prompt}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="dashboard-metric panel">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function PriorityPanel({
  title,
  groups,
  questions,
  onPractice,
  showUnit = false
}: {
  title: string;
  groups: LearningGroupStats[];
  questions: Question[];
  onPractice: (pool: Question[], label: string, initialPreset?: PracticePreset) => void;
  showUnit?: boolean;
}) {
  return (
    <article className="panel dashboard-priority-panel">
      <h3>{title}</h3>
      {groups.length === 0 ? (
        <p className="dashboard-empty-note">回答履歴がまだありません。</p>
      ) : (
        <ol className="dashboard-priority-list">
          {groups.map((group) => {
            const pool = questions.filter((question) =>
              showUnit
                ? question.subject === group.subject && question.unit === group.unit
                : question.subject === group.subject
            );
            const label = showUnit ? `${group.subject} / ${group.unit ?? ''}` : group.subject;
            const preset: PracticePreset = group.needsReviewQuestions > 0 ? 'review' : 'all';
            return (
              <li key={group.key}>
                <div>
                  <strong>{label}</strong>
                  <small>
                    正答率 {formatPercent(group.accuracy)} / 要復習 {group.needsReviewQuestions}問 / 回答 {group.totalAttempts}回
                  </small>
                </div>
                <button type="button" onClick={() => onPractice(pool, label, preset)}>
                  復習セット
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </article>
  );
}
