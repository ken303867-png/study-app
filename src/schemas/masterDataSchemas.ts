import { z } from 'zod';
import {
  EXPLANATION_PLACEMENTS,
  IMPORTANCE_LEVELS,
  MAPPING_PROVENANCE_VALUES,
  MEDIA_TYPES,
  QUESTION_FORMATS
} from '../types/domain';

const idSchema = z.string().trim().min(1).max(160);
const textSchema = z.string().trim().min(1);
const optionalTextSchema = textSchema.optional();
const positiveIntegerSchema = z.number().int().positive();
const qaStatusSchema = z.enum(['pending', 'pass', 'fail', 'not-applicable']);

const masterQuestionSchema = z.object({
  canonical_question_id: idSchema,
  source_question_id: textSchema,
  legacy_id: optionalTextSchema,
  case_id: optionalTextSchema,
  subject: textSchema,
  unit: textSchema,
  topic: textSchema,
  source_group: textSchema,
  source_id: idSchema,
  question_format: z.enum(QUESTION_FORMATS),
  importance: z.enum(IMPORTANCE_LEVELS),
  source_prompt: textSchema,
  canonical_prompt: textSchema,
  source_answer: textSchema,
  final_answer: textSchema,
  answer_discrepancy: z.enum(['none', 'reviewed-different']),
  revision: positiveIntegerSchema,
  record_status: z.enum(['candidate', 'adopted', 'hold', 'excluded', 'retired']),
  exclusion_reason: optionalTextSchema,
  tags: z.array(textSchema).default([]),
  notes: optionalTextSchema,
  accepted_answers: z.array(textSchema).optional(),
  related_material_ids: z.array(idSchema).default([])
});

const masterChoiceSchema = z.object({
  canonical_question_id: idSchema,
  choice_key: textSchema,
  choice_order: positiveIntegerSchema,
  source_choice_text: textSchema,
  canonical_choice_text: textSchema,
  is_source_correct: z.boolean(),
  is_final_correct: z.boolean()
});

const masterExplanationSchema = z.object({
  canonical_question_id: idSchema,
  answer_summary: textSchema,
  question_intent: textSchema,
  reasoning: textSchema,
  surrounding_knowledge: optionalTextSchema,
  clinical_notes: optionalTextSchema,
  laws_guidelines: optionalTextSchema,
  key_points: textSchema,
  mnemonic: optionalTextSchema,
  references: textSchema,
  explanation_revision: positiveIntegerSchema,
  source_explanation_raw: optionalTextSchema
});

const masterChoiceExplanationSchema = z.object({
  canonical_question_id: idSchema,
  choice_key: textSchema,
  display_order: positiveIntegerSchema,
  final_judgement: z.enum(['correct', 'incorrect']),
  reason: textSchema,
  correction_condition: textSchema,
  corrected_statement: optionalTextSchema,
  differential_notes: optionalTextSchema,
  clinical_caution: optionalTextSchema,
  mapping_provenance: z.enum(MAPPING_PROVENANCE_VALUES)
});

const masterSourceSchema = z.object({
  source_id: idSchema,
  source_group: textSchema,
  title: textSchema,
  edition_year: optionalTextSchema,
  publisher_org: optionalTextSchema,
  source_location: optionalTextSchema,
  answer_authority: z.enum(['official', 'provided', 'audited', 'reference-only']),
  notes: optionalTextSchema
});

const masterSourceOccurrenceSchema = z
  .object({
    source_occurrence_id: idSchema,
    canonical_question_id: idSchema,
    source_id: idSchema,
    source_set_id: idSchema.optional(),
    source_set_label: optionalTextSchema,
    source_set_order: positiveIntegerSchema.optional(),
    source_question_no: z.union([textSchema, positiveIntegerSchema]).optional(),
    source_question_label: optionalTextSchema,
    source_occurrence_order: positiveIntegerSchema,
    section_type: optionalTextSchema,
    exam_label: optionalTextSchema,
    source_year: positiveIntegerSchema.optional(),
    source_page_start: positiveIntegerSchema.optional(),
    source_page_end: positiveIntegerSchema.optional(),
    source_location: optionalTextSchema,
    source_answer: optionalTextSchema,
    source_prompt_snapshot: optionalTextSchema,
    notes: optionalTextSchema
  })
  .superRefine((occurrence, ctx) => {
    if (
      occurrence.source_question_no === undefined &&
      occurrence.source_question_label === undefined &&
      occurrence.source_location === undefined
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['source_location'],
        message: '原資料位置を追跡する設問番号・設問表記・source_locationのいずれかが必要です。'
      });
    }
  });

const masterQaLedgerSchema = z
  .object({
    canonical_question_id: idSchema,
    structure_qa: qaStatusSchema,
    answer_qa: qaStatusSchema,
    explanation_qa: qaStatusSchema,
    choice_explanation_qa: qaStatusSchema,
    currentness_qa: qaStatusSchema,
    duplicate_qa: qaStatusSchema,
    source_traceability_qa: qaStatusSchema,
    final_qa: qaStatusSchema,
    audited_at: optionalTextSchema,
    notes: optionalTextSchema
  })
  .superRefine((ledger, ctx) => {
    if (ledger.final_qa !== 'pass') return;
    const requiredPassFields = [
      'structure_qa',
      'answer_qa',
      'explanation_qa',
      'choice_explanation_qa',
      'duplicate_qa',
      'source_traceability_qa'
    ] as const;
    requiredPassFields.forEach((field) => {
      if (ledger[field] !== 'pass') {
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message: `final_qa=passの場合、${field}=passが必要です。`
        });
      }
    });
    if (!['pass', 'not-applicable'].includes(ledger.currentness_qa)) {
      ctx.addIssue({
        code: 'custom',
        path: ['currentness_qa'],
        message: 'final_qa=passの場合、currentness_qaはpassまたはnot-applicableが必要です。'
      });
    }
  });

const masterTaxonomySchema = z.object({
  subject: textSchema,
  unit: textSchema,
  topic: textSchema
});

const masterMediaSchema = z.object({
  media_id: idSchema,
  canonical_question_id: idSchema,
  media_type: z.enum(MEDIA_TYPES),
  placement_after: z.enum(EXPLANATION_PLACEMENTS),
  display_order: positiveIntegerSchema,
  file_name_or_blob_ref: textSchema,
  alt_text: textSchema,
  revision: positiveIntegerSchema,
  target_key: optionalTextSchema,
  caption: optionalTextSchema,
  source_id: idSchema.optional(),
  source_page: positiveIntegerSchema.optional()
});

export const canonicalMasterExportSchema = z.object({
  masterDataVersion: textSchema,
  explanationTemplateVersion: z.literal('1.0'),
  formalDataSpecVersion: z.literal('1.1'),
  deliveryDatasetVersion: textSchema,
  sheets: z.object({
    QUESTIONS: z.array(masterQuestionSchema),
    SOURCE_OCCURRENCES: z.array(masterSourceOccurrenceSchema),
    CHOICES: z.array(masterChoiceSchema),
    EXPLANATIONS: z.array(masterExplanationSchema),
    CHOICE_EXPLANATIONS: z.array(masterChoiceExplanationSchema),
    SOURCES: z.array(masterSourceSchema),
    QA_LEDGER: z.array(masterQaLedgerSchema),
    TAXONOMY: z.array(masterTaxonomySchema),
    MEDIA: z.array(masterMediaSchema).default([])
  })
});

export type CanonicalMasterExportInput = z.input<typeof canonicalMasterExportSchema>;
export type CanonicalMasterExport = z.output<typeof canonicalMasterExportSchema>;
