import type { LearningHistory, Question } from '../types/domain';

export interface LearningAggregate {
  totalQuestions: number;
  answeredQuestions: number;
  unansweredQuestions: number;
  totalAttempts: number;
  correctAttempts: number;
  incorrectAttempts: number;
  uncertainAttempts: number;
  needsReviewQuestions: number;
  favoriteQuestions: number;
  accuracy: number | null;
  coverage: number;
  nonCorrectRate: number;
  reviewRate: number;
}

export interface LearningGroupStats extends LearningAggregate {
  key: string;
  subject: string;
  unit?: string;
}

export interface RecentAttentionItem {
  question: Question;
  history: LearningHistory;
}

export interface LearningAnalytics {
  overall: LearningAggregate;
  bySubject: LearningGroupStats[];
  byUnit: LearningGroupStats[];
  reviewPrioritySubjects: LearningGroupStats[];
  reviewPriorityUnits: LearningGroupStats[];
  recentAttention: RecentAttentionItem[];
}

export function buildLearningAnalytics(
  questions: readonly Question[],
  historyByQuestionId: ReadonlyMap<string, LearningHistory>
): LearningAnalytics {
  const overall = aggregateQuestions(questions, historyByQuestionId);
  const bySubject = groupQuestions(
    questions,
    (question) => question.subject,
    (subject) => ({ key: subject, subject }),
    historyByQuestionId
  ).sort((left, right) => left.subject.localeCompare(right.subject, 'ja-JP'));

  const byUnit = groupQuestions(
    questions,
    (question) => `${question.subject}\u0000${question.unit}`,
    (key) => {
      const [subject = '', unit = ''] = key.split('\u0000');
      return { key, subject, unit };
    },
    historyByQuestionId
  ).sort((left, right) => {
    const bySubjectName = left.subject.localeCompare(right.subject, 'ja-JP');
    return bySubjectName !== 0
      ? bySubjectName
      : (left.unit ?? '').localeCompare(right.unit ?? '', 'ja-JP');
  });

  return {
    overall,
    bySubject,
    byUnit,
    reviewPrioritySubjects: bySubject.filter(hasLearningEvidence).sort(compareReviewPriority),
    reviewPriorityUnits: byUnit.filter(hasLearningEvidence).sort(compareReviewPriority),
    recentAttention: buildRecentAttention(questions, historyByQuestionId)
  };
}

export function formatPercent(value: number | null): string {
  return value === null ? '—' : `${Math.round(value * 100)}%`;
}

function aggregateQuestions(
  questions: readonly Question[],
  historyByQuestionId: ReadonlyMap<string, LearningHistory>
): LearningAggregate {
  let answeredQuestions = 0;
  let totalAttempts = 0;
  let correctAttempts = 0;
  let incorrectAttempts = 0;
  let uncertainAttempts = 0;
  let needsReviewQuestions = 0;
  let favoriteQuestions = 0;

  for (const question of questions) {
    const history = historyByQuestionId.get(question.id);
    if (!history) continue;
    if (history.attempts > 0) answeredQuestions += 1;
    totalAttempts += history.attempts;
    correctAttempts += history.correctCount;
    incorrectAttempts += history.incorrectCount;
    uncertainAttempts += history.uncertainCount;
    if (history.needsReview) needsReviewQuestions += 1;
    if (history.favorite) favoriteQuestions += 1;
  }

  const totalQuestions = questions.length;
  const unansweredQuestions = totalQuestions - answeredQuestions;
  return {
    totalQuestions,
    answeredQuestions,
    unansweredQuestions,
    totalAttempts,
    correctAttempts,
    incorrectAttempts,
    uncertainAttempts,
    needsReviewQuestions,
    favoriteQuestions,
    accuracy: totalAttempts === 0 ? null : correctAttempts / totalAttempts,
    coverage: totalQuestions === 0 ? 0 : answeredQuestions / totalQuestions,
    nonCorrectRate:
      totalAttempts === 0 ? 0 : (incorrectAttempts + uncertainAttempts) / totalAttempts,
    reviewRate: answeredQuestions === 0 ? 0 : needsReviewQuestions / answeredQuestions
  };
}

function groupQuestions(
  questions: readonly Question[],
  getKey: (question: Question) => string,
  getIdentity: (key: string) => Pick<LearningGroupStats, 'key' | 'subject' | 'unit'>,
  historyByQuestionId: ReadonlyMap<string, LearningHistory>
): LearningGroupStats[] {
  const grouped = new Map<string, Question[]>();
  for (const question of questions) {
    const key = getKey(question);
    const group = grouped.get(key) ?? [];
    group.push(question);
    grouped.set(key, group);
  }

  return [...grouped.entries()].map(([key, group]) => ({
    ...getIdentity(key),
    ...aggregateQuestions(group, historyByQuestionId)
  }));
}

function hasLearningEvidence(group: LearningGroupStats): boolean {
  return group.totalAttempts > 0;
}

function compareReviewPriority(left: LearningGroupStats, right: LearningGroupStats): number {
  if (left.reviewRate !== right.reviewRate) return right.reviewRate - left.reviewRate;
  if (left.nonCorrectRate !== right.nonCorrectRate) return right.nonCorrectRate - left.nonCorrectRate;

  const leftAccuracy = left.accuracy ?? 1;
  const rightAccuracy = right.accuracy ?? 1;
  if (leftAccuracy !== rightAccuracy) return leftAccuracy - rightAccuracy;
  if (left.totalAttempts !== right.totalAttempts) return right.totalAttempts - left.totalAttempts;
  return left.key.localeCompare(right.key, 'ja-JP');
}

function buildRecentAttention(
  questions: readonly Question[],
  historyByQuestionId: ReadonlyMap<string, LearningHistory>
): RecentAttentionItem[] {
  return questions
    .flatMap((question) => {
      const history = historyByQuestionId.get(question.id);
      if (
        !history ||
        !history.lastAnsweredAt ||
        (history.lastResult !== 'incorrect' && history.lastResult !== 'uncertain')
      ) {
        return [];
      }
      return [{ question, history }];
    })
    .sort((left, right) =>
      (right.history.lastAnsweredAt ?? '').localeCompare(left.history.lastAnsweredAt ?? '')
    );
}
