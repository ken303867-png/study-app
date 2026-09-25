import type { Question } from '../types/domain';

export const LEARNING_AREAS = ['common', 'specialty'] as const;
export type LearningArea = (typeof LEARNING_AREAS)[number];

export const QUESTION_KINDS = [
  'common-jna',
  'common-cloze',
  'common-predicted',
  'common-predicted-30',
  'common-final',
  'specialty-past',
  'specialty-predicted',
  'specialty-predicted-case'
] as const;
export type QuestionKind = (typeof QUESTION_KINDS)[number];

export const LEARNING_AREA_LABELS: Record<LearningArea, string> = {
  common: '共通科目',
  specialty: '専門科目'
};

export const COMMON_CURRICULUM_SUBJECTS = [
  '臨床病態生理学',
  '臨床推論',
  'フィジカルアセスメント：基礎',
  'フィジカルアセスメント：応用',
  '臨床推論：医療面接',
  '疾病・臨床病態概論',
  '疾病・臨床病態概論：状況別',
  '臨床薬理学：薬理作用',
  '臨床薬理学：薬物動態',
  '臨床薬理学：薬物治療・管理',
  '医療安全学：医療安全管理',
  '医療安全学：医療倫理',
  'チーム医療論（特定行為実践）',
  '特定行為実践',
  '看護管理',
  '指導',
  '相談'
] as const;
export type CommonCurriculumSubject = (typeof COMMON_CURRICULUM_SUBJECTS)[number];

export const QUESTION_KIND_LABELS: Record<QuestionKind, string> = {
  'common-jna': '看護協会Eラーニング',
  'common-cloze': '穴抜き問題',
  'common-predicted': '予想問題',
  'common-predicted-30': '予想問題30',
  'common-final': '最終対策',
  'specialty-past': '過去問',
  'specialty-predicted': '予想問題',
  'specialty-predicted-case': '予想事例問題'
};

export const QUESTION_KINDS_BY_AREA: Record<LearningArea, readonly QuestionKind[]> = {
  common: ['common-jna', 'common-cloze', 'common-predicted', 'common-predicted-30', 'common-final'],
  specialty: ['specialty-past', 'specialty-predicted', 'specialty-predicted-case']
};

const COMMON_CLOZE_TAG = 'supplemental:common-cloze';
const COMMON_FINAL_TAG = 'supplemental:common-final-2026';
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
  const kind = displayQuestionKind(question);
  if (!kind) return null;
  return kind.startsWith('common-') ? 'common' : 'specialty';
}

export function matchesQuestionCategory(
  question: Question,
  area: LearningArea | 'all',
  kind: QuestionKind | 'all' = 'all'
): boolean {
  const displayKind = displayQuestionKind(question);
  if (!displayKind) return area === 'all' && kind === 'all';
  if (area !== 'all' && questionLearningArea(question) !== area) return false;
  if (kind !== 'all' && displayKind !== kind) return false;
  return true;
}

export function filterQuestionsByKinds(
  questions: readonly Question[],
  kinds: readonly QuestionKind[] | undefined
): Question[] {
  if (!kinds || kinds.length === 0) return kinds ? [] : [...questions];
  const selected = new Set(kinds);
  return questions.filter((question) => {
    const kind = displayQuestionKind(question);
    return kind !== null && selected.has(kind);
  });
}

export function filterQuestionsBySubjects(
  questions: readonly Question[],
  subjects: readonly string[] | undefined
): Question[] {
  if (!subjects) return [...questions];
  if (subjects.length === 0) return [];
  const selected = new Set(subjects);
  return questions.filter((question) => selected.has(question.subject));
}

export function countCommonSubjectQuestions(
  questions: readonly Question[]
): Record<CommonCurriculumSubject, number> {
  const counts = Object.fromEntries(
    COMMON_CURRICULUM_SUBJECTS.map((subject) => [subject, 0])
  ) as Record<CommonCurriculumSubject, number>;
  for (const question of questions) {
    if (isCommonCurriculumSubject(question.subject)) counts[question.subject] += 1;
  }
  return counts;
}

export function countQuestionKinds(questions: readonly Question[]): Record<QuestionKind, number> {
  const counts = Object.fromEntries(QUESTION_KINDS.map((kind) => [kind, 0])) as Record<
    QuestionKind,
    number
  >;
  for (const question of questions) {
    const kind = displayQuestionKind(question);
    if (kind) counts[kind] += 1;
  }
  return counts;
}

function displayQuestionKind(question: Question): QuestionKind | null {
  if (question.tags.includes(COMMON_FINAL_TAG)) return 'common-final';
  return classifyQuestion(question);
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

function isCommonCurriculumSubject(subject: string): subject is CommonCurriculumSubject {
  return (COMMON_CURRICULUM_SUBJECTS as readonly string[]).includes(subject);
}
