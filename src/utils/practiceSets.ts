import type { LearningHistory, Question } from '../types/domain';

export const PRACTICE_PRESETS = [
  'all',
  'review',
  'unanswered',
  'favorite',
  'incorrect',
  'uncertain'
] as const;

export const PRACTICE_ORDERS = ['sequential', 'random'] as const;

export type PracticePreset = (typeof PRACTICE_PRESETS)[number];
export type PracticeOrder = (typeof PRACTICE_ORDERS)[number];
export type PracticeLimit = 'all' | 10 | 20 | 50;

export interface PracticeSetOptions {
  preset: PracticePreset;
  order: PracticeOrder;
  limit: PracticeLimit;
}

export interface PracticeSetSummary {
  total: number;
  review: number;
  unanswered: number;
  favorite: number;
  incorrect: number;
  uncertain: number;
}

export function summarizePracticePool(
  questions: readonly Question[],
  historyByQuestionId: ReadonlyMap<string, LearningHistory>
): PracticeSetSummary {
  return {
    total: questions.length,
    review: questions.filter((question) => historyByQuestionId.get(question.id)?.needsReview === true).length,
    unanswered: questions.filter((question) => (historyByQuestionId.get(question.id)?.attempts ?? 0) === 0).length,
    favorite: questions.filter((question) => historyByQuestionId.get(question.id)?.favorite === true).length,
    incorrect: questions.filter((question) => historyByQuestionId.get(question.id)?.lastResult === 'incorrect').length,
    uncertain: questions.filter((question) => historyByQuestionId.get(question.id)?.lastResult === 'uncertain').length
  };
}

export function buildPracticeSet(
  questions: readonly Question[],
  historyByQuestionId: ReadonlyMap<string, LearningHistory>,
  options: PracticeSetOptions,
  random: () => number = Math.random
): Question[] {
  const filtered = questions.filter((question) => matchesPreset(question, historyByQuestionId, options.preset));
  const ordered = options.order === 'random' ? shuffleQuestions(filtered, random) : [...filtered];
  return options.limit === 'all' ? ordered : ordered.slice(0, options.limit);
}

export function shuffleQuestions(questions: readonly Question[], random: () => number = Math.random): Question[] {
  const shuffled = [...questions];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = shuffled[index];
    const other = shuffled[swapIndex];
    if (!current || !other) continue;
    shuffled[index] = other;
    shuffled[swapIndex] = current;
  }
  return shuffled;
}

function matchesPreset(
  question: Question,
  historyByQuestionId: ReadonlyMap<string, LearningHistory>,
  preset: PracticePreset
) {
  const history = historyByQuestionId.get(question.id);
  switch (preset) {
    case 'all':
      return true;
    case 'review':
      return history?.needsReview === true;
    case 'unanswered':
      return (history?.attempts ?? 0) === 0;
    case 'favorite':
      return history?.favorite === true;
    case 'incorrect':
      return history?.lastResult === 'incorrect';
    case 'uncertain':
      return history?.lastResult === 'uncertain';
  }
}
