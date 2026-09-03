import type { Question } from '../types/domain';

export type PracticeAnswer =
  | { kind: 'choices'; indexes: number[] }
  | { kind: 'text'; value: string };

export interface PracticeEvaluation {
  correct: boolean;
  correctAnswerLabel: string;
}

export function evaluatePracticeAnswer(
  question: Question,
  answer: PracticeAnswer
): PracticeEvaluation {
  if ('choices' in question) {
    const submitted = answer.kind === 'choices' ? normalizeIndexes(answer.indexes) : [];
    const expected = normalizeIndexes(question.correctChoiceIndexes);
    return {
      correct: arraysEqual(submitted, expected),
      correctAnswerLabel: formatCorrectAnswer(question)
    };
  }

  const submitted = answer.kind === 'text' ? normalizeTextAnswer(answer.value) : '';
  const accepted = question.acceptedAnswers.map(normalizeTextAnswer);
  return {
    correct: submitted.length > 0 && accepted.includes(submitted),
    correctAnswerLabel: formatCorrectAnswer(question)
  };
}

export function canSubmitPracticeAnswer(question: Question, answer: PracticeAnswer): boolean {
  if ('choices' in question) {
    return answer.kind === 'choices' && answer.indexes.length > 0;
  }
  return answer.kind === 'text' && normalizeTextAnswer(answer.value).length > 0;
}

export function formatCorrectAnswer(question: Question): string {
  if ('choices' in question) {
    return normalizeIndexes(question.correctChoiceIndexes)
      .map((index) => `${choiceLabel(index)}. ${question.choices[index] ?? ''}`.trim())
      .join(' / ');
  }
  return question.acceptedAnswers.join(' / ');
}

export function choiceLabel(index: number): string {
  return String.fromCharCode(65 + index);
}

export function normalizeTextAnswer(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

function normalizeIndexes(indexes: number[]): number[] {
  return [...new Set(indexes)].sort((a, b) => a - b);
}

function arraysEqual(left: number[], right: number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
