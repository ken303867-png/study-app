import { useMemo, useState, type ReactNode } from 'react';
import type { LearningHistory, LearningResult, Question } from '../types/domain';
import {
  canSubmitPracticeAnswer,
  choiceLabel,
  evaluatePracticeAnswer,
  type PracticeAnswer,
  type PracticeEvaluation
} from '../utils/practiceEngine';

interface PracticeResponse {
  answer: PracticeAnswer;
  evaluation: PracticeEvaluation;
}

export function PracticeMode({
  questions,
  historyByQuestionId,
  onRecordResult,
  onToggleFavorite,
  onToggleReview,
  onExit,
  renderExplanation
}: {
  questions: Question[];
  historyByQuestionId: ReadonlyMap<string, LearningHistory>;
  onRecordResult: (questionId: string, result: LearningResult) => Promise<void>;
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

  const currentQuestion = queue[index];
  const wrongQuestions = useMemo(
    () => queue.filter((question) => responses.get(question.id)?.evaluation.correct === false),
    [queue, responses]
  );
  const correctCount = useMemo(
    () => [...responses.values()].filter((response) => response.evaluation.correct).length,
    [responses]
  );

  if (questions.length === 0 || queue.length === 0) {
    return (
      <section className="panel practice-empty">
        <h2>1問ずつ演習</h2>
        <p>演習できる問題がありません。問題一覧で条件を変更してください。</p>
        <button type="button" onClick={onExit}>問題一覧へ戻る</button>
      </section>
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
    if (response || !canSubmitPracticeAnswer(currentQuestion, answer)) return;
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
    <section className="stack practice-mode" aria-label="1問ずつ演習">
      <div className="practice-toolbar panel">
        <div>
          <p className="eyebrow">One Question Practice</p>
          <h2>1問ずつ演習</h2>
        </div>
        <div className="practice-progress-label">
          <strong>{index + 1} / {queue.length}</strong>
          <span>回答済み {responses.size}</span>
        </div>
        <div className="practice-progress-track" aria-label={`進捗 ${index + 1} / ${queue.length}`}>
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

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
          disabled={response !== undefined || submitting}
          onChange={setAnswer}
        />

        {!response && (
          <button
            type="button"
            className="practice-submit"
            disabled={submitting || !canSubmitPracticeAnswer(currentQuestion, answer)}
            onClick={() => void submit()}
          >
            {submitting ? '判定中' : '回答を確定する'}
          </button>
        )}

        {response && (
          <div
            className={`practice-feedback ${response.evaluation.correct ? 'correct' : 'incorrect'}`}
            role="status"
          >
            <strong>{response.evaluation.correct ? '正解' : '不正解'}</strong>
            <p>正答：{response.evaluation.correctAnswerLabel}</p>
          </div>
        )}

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

        {response && (
          <details className="explanation-details" open>
            <summary>正式解答解説</summary>
            {renderExplanation(currentQuestion)}
          </details>
        )}
      </article>

      <div className="panel practice-navigation">
        <button type="button" disabled={index === 0} onClick={() => setIndex((current) => current - 1)}>
          前の問題
        </button>
        <button
          type="button"
          disabled={!response}
          onClick={() => {
            if (index === queue.length - 1) setCompleted(true);
            else setIndex((current) => current + 1);
          }}
        >
          {index === queue.length - 1 ? '結果を見る' : '次の問題'}
        </button>
        <button type="button" onClick={onExit}>演習を終了</button>
      </div>
    </section>
  );

  function restart(nextQueue: Question[]) {
    setQueue(nextQueue);
    setIndex(0);
    setAnswers(new Map());
    setResponses(new Map());
    setCompleted(false);
  }
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
                      ? selected.filter((index) => index !== choiceIndex)
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
