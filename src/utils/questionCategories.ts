import type { Question } from '../types/domain';

export const LEARNING_AREAS = ['common', 'specialty'] as const;
export type LearningArea = (typeof LEARNING_AREAS)[number];

export const QUESTION_KINDS = [
  'common-jna',
  'common-cloze',
  'common-predicted',
  'specialty-past',
  'specialty-predicted',
  'specialty-predicted-case'
] as const;
export type QuestionKind = (typeof QUESTION_KINDS)[number];

export const LEARNING_AREA_LABELS: Record<LearningArea, string> = {
  common: '共通科目',
  specialty: '専門科目'
};

export const QUESTION_KIND_LABELS: Record<QuestionKind, string> = {
  'common-jna': '看護協会Eラーニング',
  'common-cloze': '穴抜き問題',
  'common-predicted': '予想問題',
  'specialty-past': '過去問',
  'specialty-predicted': '予想問題',
  'specialty-predicted-case': '予想事例問題'
};

export const QUESTION_KINDS_BY_AREA: Record<LearningArea, readonly QuestionKind[]> = {
  common: ['common-jna', 'common-cloze', 'common-predicted'],
  specialty: ['specialty-past', 'specialty-predicted', 'specialty-predicted-case']
};

const COMMON_CLOZE_TAG = 'supplemental:common-cloze';
const AREA_COMMON_TAG = 'learning-area:common';
const AREA_SPECIALTY_TAG = 'learning-area:specialty';
const KIND_TAG_PREFIX = 'question-kind:';

export function classifyQuestion(question: Question): QuestionKind | null {
  const explicitKind = explicitQuestionKind(question.tags);
  if (explicitKind) return explicitKind;

  if (question.tags.includes(COMMON_CLOZE_TAG)) return 'common-cloze';
  if (question.sourceType === 'japan-nursing-association') return 'common-jna';
  if (question.sourceType === 'past-exam') return 'specialty-past';

  if (question.sourceType === 'predicted') {
    if (isSpecialtyCaseQuestion(question)) return 'specialty-predicted-case';
    if (isSpecialtyQuestion(question)) return 'specialty-predicted';
    return 'common-predicted';
  }

  if (question.tags.includes(AREA_SPECIALTY_TAG)) return null;
  if (question.tags.includes(AREA_COMMON_TAG)) return null;
  return null;
}

export function questionLearningArea(question: Question): LearningArea | null {
  const kind = classifyQuestion(question);
  if (!kind) return null;
  return kind.startsWith('common-') ? 'common' : 'specialty';
}

export function matchesQuestionCategory(
  question: Question,
  area: LearningArea | 'all',
  kind: QuestionKind | 'all' = 'all'
): boolean {
  const classifiedKind = classifyQuestion(question);
  if (!classifiedKind) return area === 'all' && kind === 'all';
  if (area !== 'all' && questionLearningArea(question) !== area) return false;
  if (kind !== 'all' && classifiedKind !== kind) return false;
  return true;
}

export function filterQuestionsByKinds(
  questions: readonly Question[],
  kinds: readonly QuestionKind[] | undefined
): Question[] {
  if (!kinds || kinds.length === 0) return kinds ? [] : [...questions];
  const selected = new Set(kinds);
  return questions.filter((question) => {
    const kind = classifyQuestion(question);
    return kind !== null && selected.has(kind);
  });
}

export function countQuestionKinds(questions: readonly Question[]): Record<QuestionKind, number> {
  const counts = Object.fromEntries(QUESTION_KINDS.map((kind) => [kind, 0])) as Record<
    QuestionKind,
    number
  >;
  for (const question of questions) {
    const kind = classifyQuestion(question);
    if (kind) counts[kind] += 1;
  }
  return counts;
}

function explicitQuestionKind(tags: readonly string[]): QuestionKind | null {
  for (const tag of tags) {
    if (!tag.startsWith(KIND_TAG_PREFIX)) continue;
    const value = tag.slice(KIND_TAG_PREFIX.length) as QuestionKind;
    if ((QUESTION_KINDS as readonly string[]).includes(value)) return value;
  }
  return null;
}

function isSpecialtyQuestion(question: Question): boolean {
  return (
    question.tags.includes(AREA_SPECIALTY_TAG) ||
    question.tags.includes('specialty') ||
    question.id.includes('-SPEC-') ||
    question.id.startsWith('PRED-SPEC-')
  );
}

function isSpecialtyCaseQuestion(question: Question): boolean {
  return (
    question.tags.includes('question-kind:specialty-predicted-case') ||
    question.tags.includes('predicted-case') ||
    question.tags.includes('case-question') ||
    question.tags.includes('事例問題') ||
    question.id.startsWith('PRED-CASE-') ||
    question.id.startsWith('PRED-SPEC-CASE-')
  );
}
