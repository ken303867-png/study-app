import type { LearningHistory, Question } from '../types/domain';

export const WEAKNESS_PRIORITY_MIN_SCORE = 15;

export interface WeaknessPriorityItem {
  question: Question;
  history: LearningHistory;
  score: number;
}

export function calculateWeaknessPriorityScore(history: LearningHistory | undefined): number {
  if (!history || history.attempts <= 0) return 0;

  const reviewScore = history.needsReview === true ? 35 : 0;
  const recentResultScore =
    history.lastResult === 'incorrect' ? 25 : history.lastResult === 'uncertain' ? 15 : 0;
  const weightedNonCorrect = history.incorrectCount + history.uncertainCount * 0.6;
  const nonCorrectRate = Math.min(1, weightedNonCorrect / Math.max(1, history.attempts));
  const nonCorrectScore = nonCorrectRate * 30;
  const recoveryScore = history.consecutiveCorrect === 0 ? 10 : history.consecutiveCorrect === 1 ? 5 : 0;

  return Math.round(Math.min(100, reviewScore + recentResultScore + nonCorrectScore + recoveryScore));
}

export function isWeaknessPriorityCandidate(history: LearningHistory | undefined): boolean {
  return calculateWeaknessPriorityScore(history) >= WEAKNESS_PRIORITY_MIN_SCORE;
}

export function rankQuestionsByWeakness(
  questions: readonly Question[],
  historyByQuestionId: ReadonlyMap<string, LearningHistory>
): Question[] {
  return questions
    .map((question) => ({
      question,
      history: historyByQuestionId.get(question.id),
      score: calculateWeaknessPriorityScore(historyByQuestionId.get(question.id))
    }))
    .filter(
      (item): item is { question: Question; history: LearningHistory; score: number } =>
        item.history !== undefined && item.score >= WEAKNESS_PRIORITY_MIN_SCORE
    )
    .sort((left, right) => {
      if (left.score !== right.score) return right.score - left.score;
      const byRecent = (right.history.lastAnsweredAt ?? '').localeCompare(
        left.history.lastAnsweredAt ?? ''
      );
      if (byRecent !== 0) return byRecent;
      return left.question.id.localeCompare(right.question.id, 'ja-JP');
    })
    .map((item) => item.question);
}

export function buildWeaknessPriorityItems(
  questions: readonly Question[],
  historyByQuestionId: ReadonlyMap<string, LearningHistory>
): WeaknessPriorityItem[] {
  const questionById = new Map(questions.map((question) => [question.id, question]));
  return rankQuestionsByWeakness(questions, historyByQuestionId).flatMap((question) => {
    const canonicalQuestion = questionById.get(question.id);
    const history = historyByQuestionId.get(question.id);
    if (!canonicalQuestion || !history) return [];
    return [
      {
        question: canonicalQuestion,
        history,
        score: calculateWeaknessPriorityScore(history)
      }
    ];
  });
}
