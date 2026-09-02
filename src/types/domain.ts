export const SOURCE_TYPES = [
  'japan-nursing-association',
  'gakken',
  'past-exam',
  'predicted'
] as const;

export const QUESTION_FORMATS = [
  'single-choice',
  'multiple-choice',
  'true-false',
  'fill-blank',
  'short-answer'
] as const;

export const IMPORTANCE_LEVELS = ['S+', 'S', 'A', 'B'] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];
export type QuestionFormat = (typeof QUESTION_FORMATS)[number];
export type ImportanceLevel = (typeof IMPORTANCE_LEVELS)[number];

export interface BaseQuestion {
  id: string;
  subject: string;
  unit: string;
  topic: string;
  sourceType: SourceType;
  sourceLabel: string;
  questionFormat: QuestionFormat;
  importance: ImportanceLevel;
  prompt: string;
  explanation: string;
  relatedMaterialIds: string[];
  tags: string[];
  revision: number;
}

export interface ChoiceQuestion extends BaseQuestion {
  questionFormat: 'single-choice' | 'multiple-choice' | 'true-false';
  choices: string[];
  correctChoiceIndexes: number[];
}

export interface RecallQuestion extends BaseQuestion {
  questionFormat: 'fill-blank' | 'short-answer';
  acceptedAnswers: string[];
}

export type Question = ChoiceQuestion | RecallQuestion;

export interface Material {
  id: string;
  subject: string;
  unit: string;
  title: string;
  importance: ImportanceLevel;
  body: string;
  relatedQuestionIds: string[];
  tags: string[];
  revision: number;
}

export type LearningResult = 'correct' | 'incorrect' | 'uncertain';

export interface LearningHistory {
  questionId: string;
  attempts: number;
  correctCount: number;
  incorrectCount: number;
  uncertainCount: number;
  consecutiveCorrect: number;
  lastResult: LearningResult | null;
  lastAnsweredAt: string | null;
  favorite: boolean;
}

export interface MaterialHistory {
  materialId: string;
  favorite: boolean;
  viewed: boolean;
  lastViewedAt: string | null;
  scrollPosition: number;
}

export interface AppMeta {
  key: string;
  value: string;
}
