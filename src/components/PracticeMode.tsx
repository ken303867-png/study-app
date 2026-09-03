import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import type {
  ExamSession,
  LearningHistory,
  LearningResult,
  Question
} from '../types/domain';
import {
  canSubmitPracticeAnswer,
  choiceLabel,
  evaluatePracticeAnswer,
  type PracticeAnswer,
  type PracticeEvaluation
} from '../utils/practiceEngine';
import {
  formatExamTime,
  summarizeExamResult,
  type ExamResultSummary
} from '../utils/examSession';
import type { ExamTimerMinutes, PracticeSessionMode } from '../utils/practiceSets';

interface PracticeResponse {
  answer: PracticeAnswer;
  evaluation: PracticeEvaluation;
}

export function PracticeMode({
  questions,
  historyByQuestionId,
  sessionMode = 'practice',
  timerMinutes = 0,
  onRecordResult,
  onSaveExamSession,
  onToggleFavorite,
  onToggleReview,
  onExit,
  renderExplanation
}: {
  questions: Question[];
  historyByQuestionId: ReadonlyMap<string, LearningHistory>;
  sessionMode?: PracticeSessionMode;
  timerMinutes?: ExamTimerMinutes;
  onRecordResult: (questionId: string, result: LearningResult) => Promise<void>;
  onSaveExamSession?: (session: ExamSession) => Promise<void>;
  onToggleFavorite: (questionId: string) => Promise<void>;
  onToggleReview: (questionId: string) => Promise<void>;
  onExit: () => void;
  renderExplanation: (question: Question) => ReactNode;
}) {
  const [queue, setQueue] = useState(questions);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, PracticeAnswer>>(() => new Map());
  const [responses, setResponses] = useState<Map<string, PracticeResponse>>(() => new Map());
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [examSummary, setExamSummary] = useState<ExamResultSummary | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(timerMinutes * 60);
  const startedAtRef = useRef(new Date().toISOString());
  const finishingExamRef = useRef(false);

  const currentQuestion = queue[index];
  const isExam = sessionMode === 'exam';
  const wrongQuestions = useMemo(
    () => queue.filter((question) => responses.get(question.id)?.evaluation.correct === false),
    [queue, responses]
  );
  const correctCount = useMemo(
    () => [...responses.values()].filter((response) => response.evaluation.correct).length,
    [responses]
  );
  const examAnsweredCount = useMemo(
    () =>
      queue.filter((question) => {
        const answer = answers.get(question.id);
        return answer ? canSubmitPracticeAnswer(question, answer) : false;
      }).length,
    [queue, answers]
  );

  const finishExam = useCallback(
    async (completionReason: ExamSession['completionReason']) => {
      if (!isExam || finishingExamRef.current) return;
      finishingExamRef.current = true;
      const summary = summarizeExamResult(queue, answers);
      setSubmitting(true);
      try {
        for (const outcome of summary.outcomes) {
          if (outcome.status === 'unanswered') continue;
          await onRecordResult(
            outcome.question.id,
            outcome.status === 'correct' ? 'correct' : 'incorrect'
          );
        }

        const completedAt = new Date().toISOString();
        const elapsedSeconds = Math.max(
          0,
          Math.round((Date.parse(completedAt) - Date.parse(startedAtRef.current)) / 1000)
        );
        const session: ExamSession = {
          id: crypto.randomUUID(),
          startedAt: startedAtRef.current,
          completedAt,
          timerMinutes: timerMinutes === 0 ? null : timerMinutes,
          elapsedSeconds,
          questionIds: queue.map((question) => question.id),
          totalQuestions: summary.totalQuestions,
          answeredCount: summary.answeredCount,
          correctCount: summary.correctCount,
          incorrectCount: summary.incorrectCount,
          unansweredCount: summary.unansweredCount,
          accuracy: summary.accuracy,
          subjectResults: summary.subjectResults,
          incorrectQuestionIds: summary.incorrectQuestionIds,
          unansweredQuestionIds: summary.unansweredQuestionIds,
          completionReason
        };
        await onSaveExamSession?.(session);
        setExamSummary(summary);
        setCompleted(true);
      } finally {
        setSubmitting(false);
      }
    },
    [answers, isExam, onRecordResult, onSaveExamSession, queue, timerMinutes]
  );

  useEffect(() => {
    if (!isExam || timerMinutes === 0 || completed) return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [completed, isExam, timerMinutes]);

  useEffect(() => {
    if (!isExam || timerMinutes === 0 || completed || remainingSeconds > 0) return;
    void finishExam('timeout');
  }, [completed, finishExam, isExam, remainingSeconds, timerMinutes]);

  if (questions.length === 0 || queue.length === 0) {
    return (
      <section className="panel practice-empty">
        <h2>{isExam ? '試験モード' : '1問ずつ演習'}</h2>
        <p>演習できる問題がありません。問題一覧で条件を変更してください。</p>
        <button type="button" onClick={onExit}>問題一覧へ戻る</button>
      </section>
    );
  }

  if (completed && isExam && examSummary) {
    return (
      <ExamSummaryView
        summary={examSummary}
        completionReason={remainingSeconds === 0 && timerMinutes > 0 ? 'timeout' : 'submitted'}
        elapsedSeconds={Math.max(
          0,
          Math.round((Date.now() - Date.parse(startedAtRef.current)) / 1000)
        )}
        onRestart={() => restart(questions)}
        onExit={onExit}
      />
    );
  }

  if (completed) {
    const answeredCount = responses.size;
    const accuracy = answeredCount === 0 ? 0 : Math.round((correctCount / answeredCount) * 100);
    return (
      <section className="stack practice-summary" aria-label="演習結果">
        <div className="panel">
          <p className="eyebrow">Practice Complete</p>
          <h2>演習結果</h2>
          <div className="practice-result-grid">
            <div><strong>{answeredCount}</strong><span>回答</span></div>
            <div><strong>{correctCount}</strong><span>正解</span></div>
            <div><strong>{answeredCount - correctCount}</strong><span>不正解</span></div>
            <div><strong>{accuracy}%</strong><span>正答率</span></div>
          </div>
        </div>
        <div className="panel practice-summary-actions">
          {wrongQuestions.length > 0 && (
            <button type="button" onClick={() => restart(wrongQuestions)}>
              間違えた{wrongQuestions.length}問を再挑戦
            </button>
          )}
          <button type="button" onClick={() => restart(questions)}>同じ条件でもう一度</button>
          <button type="button" onClick={onExit}>問題一覧へ戻る</button>
        </div>
      </section>
    );
  }

  if (!currentQuestion) return null;

  const response = responses.get(currentQuestion.id);
  const answer = answers.get(currentQuestion.id) ?? emptyAnswer(currentQuestion);
  const history = historyByQuestionId.get(currentQuestion.id);
  const progress = ((index + 1) / queue.length) * 100;

  const setAnswer = (next: PracticeAnswer) => {
    setAnswers((current) => {
      const updated = new Map(current);
      updated.set(currentQuestion.id, next);
      return updated;
    });
  };

  const submit = async () => {
    if (isExam || response || !canSubmitPracticeAnswer(currentQuestion, answer)) return;
    const evaluation = evaluatePracticeAnswer(currentQuestion, answer);
    setSubmitting(true);
    try {
      await onRecordResult(currentQuestion.id, evaluation.correct ? 'correct' : 'incorrect');
      setResponses((current) => {
        const updated = new Map(current);
        updated.set(currentQuestion.id, { answer, evaluation });
        return updated;
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      className={`stack practice-mode${isExam ? ' exam-mode' : ''}`}
      aria-label={isExam ? '試験モード' : '1問ずつ演習'}
    >
      <div className="practice-toolbar panel">
        <div>
          <p className="eyebrow">{isExam ? 'Exam Mode' : 'One Question Practice'}</p>
          <h2>{isExam ? '試験モード' : '1問ずつ演習'}</h2>
        </div>
        <div className="practice-progress-label">
          <strong>{index + 1} / {queue.length}</strong>
          <span>回答済み {isExam ? examAnsweredCount : responses.size}</span>
        </div>
        {isExam && timerMinutes > 0 && (
          <div
            className={`exam-timer${remainingSeconds <= 300 ? ' urgent' : ''}`}
            role="timer"
            aria-label={`残り時間 ${formatExamTime(remainingSeconds)}`}
          >
            <span>残り時間</span>
            <strong>{formatExamTime(remainingSeconds)}</strong>
          </div>
        )}
        <div className="practice-progress-track" aria-label={`進捗 ${index + 1} / ${queue.length}`}>
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      {isExam && (
        <div className="panel exam-security-note" role="note">
          試験終了まで正誤・正答・正式解説は表示されません。未回答のまま次の問題へ移動できます。
        </div>
      )}

      <article className="panel practice-question-card">
        <div className="meta-row">
          <span>{currentQuestion.subject} / {currentQuestion.unit}</span>
          <span>{currentQuestion.importance}</span>
        </div>
        <p className="material-id">{currentQuestion.id}</p>
        <h3>{currentQuestion.prompt}</h3>

        <PracticeAnswerInput
          question={currentQuestion}
          answer={answer}
          disabled={!isExam && (response !== undefined || submitting)}
          onChange={setAnswer}
        />

        {!isExam && !response && (
          <button
            type="button"
            className="practice-submit"
            disabled={submitting || !canSubmitPracticeAnswer(currentQuestion, answer)}
            onClick={() => void submit()}
          >
            {submitting ? '判定中' : '回答を確定する'}
          </button>
        )}

        {!isExam && response && (
          <div
            className={`practice-feedback ${response.evaluation.correct ? 'correct' : 'incorrect'}`}
            role="status"
          >
            <strong>{response.evaluation.correct ? '正解' : '不正解'}</strong>
            <p>正答：{response.evaluation.correctAnswerLabel}</p>
          </div>
        )}

        {!isExam && (
          <div className="practice-local-state" aria-label="問題のローカル学習状態">
            <span>累計 {history?.attempts ?? 0}回</span>
            <button
              type="button"
              aria-pressed={history?.needsReview === true}
              onClick={() => void onToggleReview(currentQuestion.id)}
            >
              {history?.needsReview ? '要復習 ✓' : '要復習'}
            </button>
            <button
              type="button"
              aria-pressed={history?.favorite === true}
              onClick={() => void onToggleFavorite(currentQuestion.id)}
            >
              {history?.favorite ? 'お気に入り ★' : 'お気に入り ☆'}
            </button>
          </div>
        )}

        {!isExam && response && (
          <details className="explanation-details" open>
            <summary>正式解答解説</summary>
            {renderExplanation(currentQuestion)}
          </details>
        )}
      </article>

      <div className="panel practice-navigation">
        <button type="button" disabled={index === 0 || submitting} onClick={() => setIndex((current) => current - 1)}>
          前の問題
        </button>
        <button
          type="button"
          disabled={submitting || (!isExam && !response)}
          onClick={() => {
            if (index === queue.length - 1) {
              if (isExam) void finishExam('submitted');
              else setCompleted(true);
            } else {
              setIndex((current) => current + 1);
            }
          }}
        >
          {index === queue.length - 1
            ? isExam
              ? '試験を終了して採点'
              : '結果を見る'
            : '次の問題'}
        </button>
        <button type="button" disabled={submitting} onClick={onExit}>
          {isExam ? '試験を中断' : '演習を終了'}
        </button>
      </div>
    </section>
  );

  function restart(nextQueue: Question[]) {
    setQueue(nextQueue);
    setIndex(0);
    setAnswers(new Map());
    setResponses(new Map());
    setExamSummary(null);
    setCompleted(false);
    setRemainingSeconds(timerMinutes * 60);
    startedAtRef.current = new Date().toISOString();
    finishingExamRef.current = false;
  }
}

function ExamSummaryView({
  summary,
  completionReason,
  elapsedSeconds,
  onRestart,
  onExit
}: {
  summary: ExamResultSummary;
  completionReason: ExamSession['completionReason'];
  elapsedSeconds: number;
  onRestart: () => void;
  onExit: () => void;
}) {
  const attentionOutcomes = summary.outcomes.filter((outcome) => outcome.status !== 'correct');
  return (
    <section className="stack practice-summary exam-summary" aria-label="試験結果">
      <div className="panel">
        <p className="eyebrow">Exam Complete</p>
        <h2>試験結果</h2>
        {completionReason === 'timeout' && <p className="exam-timeout-note">制限時間終了により自動採点しました。</p>}
        <div className="practice-result-grid exam-result-grid">
          <div><strong>{summary.totalQuestions}</strong><span>出題</span></div>
          <div><strong>{summary.correctCount}</strong><span>正解</span></div>
          <div><strong>{summary.incorrectCount}</strong><span>不正解</span></div>
          <div><strong>{summary.unansweredCount}</strong><span>未回答</span></div>
          <div><strong>{summary.accuracy}%</strong><span>正答率</span></div>
          <div><strong>{formatExamTime(elapsedSeconds)}</strong><span>所要時間</span></div>
        </div>
      </div>

      <div className="panel">
        <h3>科目別正答率</h3>
        <div className="dashboard-table-scroll">
          <table className="dashboard-table exam-subject-table">
            <thead>
              <tr><th>科目</th><th>正答率</th><th>正解</th><th>不正解</th><th>未回答</th></tr>
            </thead>
            <tbody>
              {summary.subjectResults.map((result) => (
                <tr key={result.subject}>
                  <th scope="row">{result.subject}</th>
                  <td>{result.accuracy}%</td>
                  <td>{result.correctCount} / {result.totalQuestions}</td>
                  <td>{result.incorrectCount}</td>
                  <td>{result.unansweredCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <h3>誤答・未回答</h3>
        {attentionOutcomes.length === 0 ? (
          <p className="muted">全問正解です。</p>
        ) : (
          <ul className="exam-attention-list">
            {attentionOutcomes.map((outcome) => (
              <li key={outcome.question.id}>
                <span className={`dashboard-result ${outcome.status === 'incorrect' ? 'incorrect' : 'uncertain'}`}>
                  {outcome.status === 'incorrect' ? '不正解' : '未回答'}
                </span>
                <div>
                  <strong>{outcome.question.id}</strong>
                  <p>{outcome.question.prompt}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="panel practice-summary-actions">
        <button type="button" onClick={onRestart}>同じ条件でもう一度試験</button>
        <button type="button" onClick={onExit}>問題一覧へ戻る</button>
      </div>
    </section>
  );
}

function PracticeAnswerInput({
  question,
  answer,
  disabled,
  onChange
}: {
  question: Question;
  answer: PracticeAnswer;
  disabled: boolean;
  onChange: (answer: PracticeAnswer) => void;
}) {
  if ('choices' in question) {
    const selected = answer.kind === 'choices' ? answer.indexes : [];
    const multiple = question.questionFormat === 'multiple-choice';
    return (
      <fieldset className="practice-choice-fieldset" disabled={disabled}>
        <legend>{multiple ? '該当する選択肢をすべて選択' : '選択肢を1つ選択'}</legend>
        {question.choices.map((choice, choiceIndex) => {
          const checked = selected.includes(choiceIndex);
          return (
            <label key={`${question.id}-${choiceIndex}`} className="practice-choice">
              <input
                type={multiple ? 'checkbox' : 'radio'}
                name={`practice-${question.id}`}
                checked={checked}
                onChange={() => {
                  const indexes = multiple
                    ? checked
                      ? selected.filter((selectedIndex) => selectedIndex !== choiceIndex)
                      : [...selected, choiceIndex]
                    : [choiceIndex];
                  onChange({ kind: 'choices', indexes });
                }}
              />
              <strong>{choiceLabel(choiceIndex)}</strong>
              <span>{choice}</span>
            </label>
          );
        })}
      </fieldset>
    );
  }

  return (
    <label className="practice-text-answer">
      <span>回答を入力</span>
      <input
        type="text"
        value={answer.kind === 'text' ? answer.value : ''}
        disabled={disabled}
        onChange={(event) => onChange({ kind: 'text', value: event.currentTarget.value })}
      />
    </label>
  );
}

function emptyAnswer(question: Question): PracticeAnswer {
  return 'choices' in question ? { kind: 'choices', indexes: [] } : { kind: 'text', value: '' };
}
