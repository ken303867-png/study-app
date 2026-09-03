export const SOURCE_TYPES = [
  'japan-nursing-association',
  's-que',
  'gakken',
  'past-exam',
  'predicted',
  'textbook',
  'guideline',
  'other'
] as const;

export const QUESTION_FORMATS = [
  'single-choice',
  'multiple-choice',
  'true-false',
  'fill-blank',
  'short-answer'
] as const;

export const IMPORTANCE_LEVELS = ['S+', 'S', 'A', 'B'] as const;
export const CHOICE_JUDGEMENTS = ['correct', 'incorrect'] as const;
export const MAPPING_PROVENANCE_VALUES = [
  'source_explicit_option_explanation',
  'source_answer_rationale',
  'source_answer_by_elimination',
  'source_supported_inference',
  'source_structured',
  'source_raw_parsed'
] as const;
export const MEDIA_TYPES = ['image', 'diagram', 'table'] as const;
export const EXPLANATION_PLACEMENTS = [
  'answer',
  'question_intent',
  'reasoning',
  'choice_explanations',
  'surrounding_knowledge',
  'clinical_notes',
  'laws_guidelines',
  'key_points',
  'mnemonic',
  'references'
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];
export type QuestionFormat = (typeof QUESTION_FORMATS)[number];
export type ImportanceLevel = (typeof IMPORTANCE_LEVELS)[number];
export type ChoiceJudgement = (typeof CHOICE_JUDGEMENTS)[number];
export type MappingProvenance = (typeof MAPPING_PROVENANCE_VALUES)[number];
export type MediaType = (typeof MEDIA_TYPES)[number];
export type ExplanationPlacement = (typeof EXPLANATION_PLACEMENTS)[number];

export interface ChoiceExplanation {
  target_key: string;
  display_order: number;
  judgement: ChoiceJudgement;
  reason: string;
  correction_condition: string;
  corrected_statement?: string;
  differential_notes?: string;
  clinical_caution?: string;
  mapping_provenance: MappingProvenance;
}

export interface FormalExplanation {
  answer: string;
  question_intent: string;
  reasoning: string;
  choice_explanations: ChoiceExplanation[];
  surrounding_knowledge?: string;
  clinical_notes?: string;
  laws_guidelines?: string;
  key_points: string;
  mnemonic?: string;
  references: string;
  source_explanation_raw?: string;
}

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
  explanation: FormalExplanation;
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

export interface SourceRecord {
  source_id: string;
  source_group: string;
  title: string;
  edition_year?: string;
  publisher_org?: string;
  source_location?: string;
  answer_authority: 'official' | 'provided' | 'audited' | 'reference-only';
  notes?: string;
}

export interface SourceOccurrence {
  source_occurrence_id: string;
  canonical_question_id: string;
  source_id: string;
  source_set_id?: string;
  source_set_label?: string;
  source_set_order?: number;
  source_question_no?: string | number;
  source_question_label?: string;
  source_occurrence_order: number;
  section_type?: string;
  exam_label?: string;
  source_year?: number;
  source_page_start?: number;
  source_page_end?: number;
  source_location?: string;
  source_answer?: string;
  source_prompt_snapshot?: string;
  notes?: string;
}

export interface MediaRecord {
  media_id: string;
  canonical_question_id: string;
  media_type: MediaType;
  placement_after: ExplanationPlacement;
  display_order: number;
  file_name_or_blob_ref: string;
  alt_text: string;
  revision: number;
  target_key?: string;
  caption?: string;
  source_id?: string;
  source_page?: number;
}

export interface MediaBlobRecord {
  media_id: string;
  blob: Blob;
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
  needsReview?: boolean;
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
