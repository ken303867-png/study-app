import type {
  ImportanceLevel,
  LearningHistory,
  Material,
  Question
} from '../types/domain';

export type QuestionOriginFilter = 'all' | 'source' | 'predicted';
export type LearningStateFilter =
  | 'all'
  | 'unanswered'
  | 'correct'
  | 'incorrect'
  | 'uncertain'
  | 'review'
  | 'favorite'
  | 'completed';

export interface QuestionFilterState {
  query: string;
  subject: string;
  unit: string;
  importance: 'all' | ImportanceLevel;
  origin: QuestionOriginFilter;
  learningState: LearningStateFilter;
}

export type RelatedCountFilter = 'all' | 'none' | '1-4' | '5-plus';

export interface MaterialFilterState {
  query: string;
  subject: string;
  importance: 'all' | ImportanceLevel;
  relatedCount: RelatedCountFilter;
}

export const DEFAULT_QUESTION_FILTERS: QuestionFilterState = {
  query: '',
  subject: '',
  unit: '',
  importance: 'all',
  origin: 'all',
  learningState: 'all'
};

export const DEFAULT_MATERIAL_FILTERS: MaterialFilterState = {
  query: '',
  subject: '',
  importance: 'all',
  relatedCount: 'all'
};

export function filterQuestions(
  questions: Question[],
  historyByQuestionId: ReadonlyMap<string, LearningHistory>,
  filters: QuestionFilterState
): Question[] {
  const query = normalizeSearchText(filters.query);
  return questions.filter((question) => {
    if (filters.subject && question.subject !== filters.subject) return false;
    if (filters.unit && question.unit !== filters.unit) return false;
    if (filters.importance !== 'all' && question.importance !== filters.importance) return false;
    if (filters.origin === 'predicted' && question.sourceType !== 'predicted') return false;
    if (filters.origin === 'source' && question.sourceType === 'predicted') return false;

    const history = historyByQuestionId.get(question.id);
    if (!matchesLearningState(history, filters.learningState)) return false;

    if (!query) return true;
    return questionSearchText(question).includes(query);
  });
}

export function filterMaterials(
  materials: Material[],
  filters: MaterialFilterState
): Material[] {
  const query = normalizeSearchText(filters.query);
  return materials.filter((material) => {
    if (filters.subject && material.subject !== filters.subject) return false;
    if (filters.importance !== 'all' && material.importance !== filters.importance) return false;
    if (!matchesRelatedCount(material.relatedQuestionIds.length, filters.relatedCount)) return false;
    if (!query) return true;
    return materialSearchText(material).includes(query);
  });
}

export function normalizeSearchText(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('ja-JP');
}

function matchesLearningState(
  history: LearningHistory | undefined,
  filter: LearningStateFilter
): boolean {
  if (filter === 'all') return true;
  const attempts = history?.attempts ?? 0;
  if (filter === 'unanswered') return attempts === 0;
  if (filter === 'completed') return attempts > 0;
  if (filter === 'favorite') return history?.favorite === true;
  if (filter === 'review') return history?.needsReview === true;
  return attempts > 0 && history?.lastResult === filter;
}

function matchesRelatedCount(count: number, filter: RelatedCountFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'none') return count === 0;
  if (filter === '1-4') return count >= 1 && count <= 4;
  return count >= 5;
}

function questionSearchText(question: Question): string {
  const answerText =
    'choices' in question ? question.choices : question.acceptedAnswers;
  const values = [
    question.id,
    question.subject,
    question.unit,
    question.topic,
    question.sourceLabel,
    question.prompt,
    ...question.tags,
    ...answerText,
    question.explanation.key_points,
    question.explanation.mnemonic ?? ''
  ];
  return normalizeSearchText(values.join('\n'));
}

function materialSearchText(material: Material): string {
  return normalizeSearchText(
    [material.id, material.subject, material.unit, material.title, material.body, ...material.tags].join(
      '\n'
    )
  );
}
