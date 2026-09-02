import { z } from 'zod';
import {
  CHOICE_JUDGEMENTS,
  EXPLANATION_PLACEMENTS,
  IMPORTANCE_LEVELS,
  MAPPING_PROVENANCE_VALUES,
  MEDIA_TYPES,
  QUESTION_FORMATS,
  SOURCE_TYPES
} from '../types/domain';

const idSchema = z.string().trim().min(1).max(120);
const textSchema = z.string().trim().min(1);
const optionalTextSchema = textSchema.optional();
const revisionSchema = z.number().int().positive();
const positiveIntegerSchema = z.number().int().positive();

const choiceExplanationSchema = z.object({
  target_key: textSchema,
  display_order: positiveIntegerSchema,
  judgement: z.enum(CHOICE_JUDGEMENTS),
  reason: textSchema,
  correction_condition: textSchema,
  corrected_statement: optionalTextSchema,
  differential_notes: optionalTextSchema,
  clinical_caution: optionalTextSchema,
  mapping_provenance: z.enum(MAPPING_PROVENANCE_VALUES)
});

const formalExplanationSchema = z
  .object({
    answer: textSchema,
    question_intent: textSchema,
    reasoning: textSchema,
    choice_explanations: z.array(choiceExplanationSchema),
    surrounding_knowledge: optionalTextSchema,
    clinical_notes: optionalTextSchema,
    laws_guidelines: optionalTextSchema,
    key_points: textSchema,
    mnemonic: optionalTextSchema,
    references: textSchema,
    source_explanation_raw: optionalTextSchema
  })
  .superRefine((explanation, ctx) => {
    const targetKeys = new Set<string>();
    const displayOrders = new Set<number>();

    explanation.choice_explanations.forEach((choice, index) => {
      if (targetKeys.has(choice.target_key)) {
        ctx.addIssue({
          code: 'custom',
          path: ['choice_explanations', index, 'target_key'],
          message: `選択肢解説target_keyが重複しています: ${choice.target_key}`
        });
      }
      targetKeys.add(choice.target_key);

      if (displayOrders.has(choice.display_order)) {
        ctx.addIssue({
          code: 'custom',
          path: ['choice_explanations', index, 'display_order'],
          message: `選択肢解説display_orderが重複しています: ${choice.display_order}`
        });
      }
      displayOrders.add(choice.display_order);
    });
  });

const baseQuestionSchema = z.object({
  id: idSchema,
  subject: textSchema,
  unit: textSchema,
  topic: textSchema,
  sourceType: z.enum(SOURCE_TYPES),
  sourceLabel: textSchema,
  questionFormat: z.enum(QUESTION_FORMATS),
  importance: z.enum(IMPORTANCE_LEVELS),
  prompt: textSchema,
  explanation: formalExplanationSchema,
  relatedMaterialIds: z.array(idSchema).default([]),
  tags: z.array(textSchema).default([]),
  revision: revisionSchema
});

const choiceQuestionSchema = baseQuestionSchema
  .extend({
    questionFormat: z.enum(['single-choice', 'multiple-choice', 'true-false']),
    choices: z.array(textSchema).min(2),
    correctChoiceIndexes: z.array(z.number().int().nonnegative()).min(1)
  })
  .superRefine((question, ctx) => {
    const uniqueIndexes = new Set(question.correctChoiceIndexes);
    if (uniqueIndexes.size !== question.correctChoiceIndexes.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['correctChoiceIndexes'],
        message: '正答indexが重複しています。'
      });
    }
    if (question.correctChoiceIndexes.some((index) => index >= question.choices.length)) {
      ctx.addIssue({
        code: 'custom',
        path: ['correctChoiceIndexes'],
        message: '正答indexが選択肢数の範囲外です。'
      });
    }
    if (question.questionFormat !== 'multiple-choice' && question.correctChoiceIndexes.length !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['correctChoiceIndexes'],
        message: '単一選択・○×問題は正答を1つだけ指定してください。'
      });
    }
    if (question.explanation.choice_explanations.length !== question.choices.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['explanation', 'choice_explanations'],
        message: '各選択肢に対応する解説を1件ずつ登録してください。'
      });
    }

    const orders = question.explanation.choice_explanations
      .map((choice) => choice.display_order)
      .sort((a, b) => a - b);
    const expected = question.choices.map((_, index) => index + 1);
    if (orders.some((order, index) => order !== expected[index])) {
      ctx.addIssue({
        code: 'custom',
        path: ['explanation', 'choice_explanations'],
        message: '選択肢解説display_orderは1から選択肢数まで連続させてください。'
      });
    }
  });

const recallQuestionSchema = baseQuestionSchema
  .extend({
    questionFormat: z.enum(['fill-blank', 'short-answer']),
    acceptedAnswers: z.array(textSchema).min(1)
  })
  .superRefine((question, ctx) => {
    if (question.explanation.choice_explanations.length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['explanation', 'choice_explanations'],
        message: '穴抜き・一問一答では選択肢解説を登録しません。'
      });
    }
  });

export const questionSchema = z.union([choiceQuestionSchema, recallQuestionSchema]);

export const materialSchema = z.object({
  id: idSchema,
  subject: textSchema,
  unit: textSchema,
  title: textSchema,
  importance: z.enum(IMPORTANCE_LEVELS),
  body: textSchema,
  relatedQuestionIds: z.array(idSchema).default([]),
  tags: z.array(textSchema).default([]),
  revision: revisionSchema
});

export const sourceSchema = z.object({
  source_id: idSchema,
  source_group: textSchema,
  title: textSchema,
  edition_year: optionalTextSchema,
  publisher_org: optionalTextSchema,
  source_location: optionalTextSchema,
  answer_authority: z.enum(['official', 'provided', 'audited', 'reference-only']),
  notes: optionalTextSchema
});

export const sourceOccurrenceSchema = z
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
        message: '原資料上の位置を追跡できる設問番号・設問表記・source_locationのいずれかが必要です。'
      });
    }
    if (
      occurrence.source_page_start !== undefined &&
      occurrence.source_page_end !== undefined &&
      occurrence.source_page_end < occurrence.source_page_start
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['source_page_end'],
        message: 'source_page_endはsource_page_start以上にしてください。'
      });
    }
  });

export const mediaSchema = z.object({
  media_id: idSchema,
  canonical_question_id: idSchema,
  media_type: z.enum(MEDIA_TYPES),
  placement_after: z.enum(EXPLANATION_PLACEMENTS),
  display_order: positiveIntegerSchema,
  file_name_or_blob_ref: textSchema,
  alt_text: textSchema,
  revision: revisionSchema,
  target_key: optionalTextSchema,
  caption: optionalTextSchema,
  source_id: idSchema.optional(),
  source_page: positiveIntegerSchema.optional()
});

export const datasetSchema = z
  .object({
    datasetVersion: textSchema,
    schemaVersion: z.literal('0.4'),
    questions: z.array(questionSchema),
    materials: z.array(materialSchema),
    sources: z.array(sourceSchema),
    sourceOccurrences: z.array(sourceOccurrenceSchema),
    media: z.array(mediaSchema)
  })
  .superRefine((dataset, ctx) => {
    const questionIds = new Set<string>();
    const materialIds = new Set<string>();
    const sourceIds = new Set<string>();
    const occurrenceIds = new Set<string>();
    const occurrenceNaturalKeys = new Set<string>();
    const mediaIds = new Set<string>();
    const occurrenceQuestionIds = new Set<string>();

    dataset.questions.forEach((question, index) => {
      if (questionIds.has(question.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['questions', index, 'id'],
          message: `問題IDが重複しています: ${question.id}`
        });
      }
      questionIds.add(question.id);
    });

    dataset.materials.forEach((material, index) => {
      if (materialIds.has(material.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['materials', index, 'id'],
          message: `資料IDが重複しています: ${material.id}`
        });
      }
      materialIds.add(material.id);
    });

    dataset.sources.forEach((source, index) => {
      if (sourceIds.has(source.source_id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['sources', index, 'source_id'],
          message: `source_idが重複しています: ${source.source_id}`
        });
      }
      sourceIds.add(source.source_id);
    });

    dataset.questions.forEach((question, questionIndex) => {
      question.relatedMaterialIds.forEach((materialId) => {
        if (!materialIds.has(materialId)) {
          ctx.addIssue({
            code: 'custom',
            path: ['questions', questionIndex, 'relatedMaterialIds'],
            message: `関連資料IDが存在しません: ${materialId}`
          });
        }
      });
    });

    dataset.materials.forEach((material, materialIndex) => {
      material.relatedQuestionIds.forEach((questionId) => {
        if (!questionIds.has(questionId)) {
          ctx.addIssue({
            code: 'custom',
            path: ['materials', materialIndex, 'relatedQuestionIds'],
            message: `関連問題IDが存在しません: ${questionId}`
          });
        }
      });
    });

    dataset.sourceOccurrences.forEach((occurrence, index) => {
      if (occurrenceIds.has(occurrence.source_occurrence_id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['sourceOccurrences', index, 'source_occurrence_id'],
          message: `source_occurrence_idが重複しています: ${occurrence.source_occurrence_id}`
        });
      }
      occurrenceIds.add(occurrence.source_occurrence_id);
      occurrenceQuestionIds.add(occurrence.canonical_question_id);

      if (!questionIds.has(occurrence.canonical_question_id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['sourceOccurrences', index, 'canonical_question_id'],
          message: `参照先問題IDが存在しません: ${occurrence.canonical_question_id}`
        });
      }
      if (!sourceIds.has(occurrence.source_id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['sourceOccurrences', index, 'source_id'],
          message: `参照先source_idが存在しません: ${occurrence.source_id}`
        });
      }

      const naturalKey =
        occurrence.source_question_no !== undefined
          ? `${occurrence.source_id}\u0000${occurrence.source_set_id ?? ''}\u0000${String(occurrence.source_question_no)}`
          : `${occurrence.source_id}\u0000ORDER\u0000${occurrence.source_occurrence_order}`;
      if (occurrenceNaturalKeys.has(naturalKey)) {
        ctx.addIssue({
          code: 'custom',
          path: ['sourceOccurrences', index],
          message: '同一原資料位置を示すSource occurrenceが重複しています。'
        });
      }
      occurrenceNaturalKeys.add(naturalKey);
    });

    dataset.questions.forEach((question, index) => {
      if (!occurrenceQuestionIds.has(question.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['questions', index, 'id'],
          message: `Source occurrenceが1件もありません: ${question.id}`
        });
      }
    });

    dataset.media.forEach((media, index) => {
      if (mediaIds.has(media.media_id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['media', index, 'media_id'],
          message: `media_idが重複しています: ${media.media_id}`
        });
      }
      mediaIds.add(media.media_id);

      const question = dataset.questions.find((candidate) => candidate.id === media.canonical_question_id);
      if (!question) {
        ctx.addIssue({
          code: 'custom',
          path: ['media', index, 'canonical_question_id'],
          message: `MEDIA参照先問題IDが存在しません: ${media.canonical_question_id}`
        });
        return;
      }
      if (media.source_id !== undefined && !sourceIds.has(media.source_id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['media', index, 'source_id'],
          message: `MEDIA参照先source_idが存在しません: ${media.source_id}`
        });
      }

      const optionalPlacementValues = {
        surrounding_knowledge: question.explanation.surrounding_knowledge,
        clinical_notes: question.explanation.clinical_notes,
        laws_guidelines: question.explanation.laws_guidelines,
        mnemonic: question.explanation.mnemonic
      } as const;
      if (
        media.placement_after in optionalPlacementValues &&
        optionalPlacementValues[
          media.placement_after as keyof typeof optionalPlacementValues
        ] === undefined
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['media', index, 'placement_after'],
          message: `空欄の任意解説ブロックにはMEDIAを配置できません: ${media.placement_after}`
        });
      }
    });
  });

export type DatasetInput = z.input<typeof datasetSchema>;
export type Dataset = z.output<typeof datasetSchema>;
