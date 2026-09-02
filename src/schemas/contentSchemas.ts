import { z } from 'zod';
import { IMPORTANCE_LEVELS, QUESTION_FORMATS, SOURCE_TYPES } from '../types/domain';

const idSchema = z.string().trim().min(1).max(120);
const textSchema = z.string().trim().min(1);
const revisionSchema = z.number().int().positive();

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
  explanation: textSchema,
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
      ctx.addIssue({ code: 'custom', path: ['correctChoiceIndexes'], message: '正答indexが重複しています。' });
    }
    if (question.correctChoiceIndexes.some((index) => index >= question.choices.length)) {
      ctx.addIssue({ code: 'custom', path: ['correctChoiceIndexes'], message: '正答indexが選択肢数の範囲外です。' });
    }
    if (question.questionFormat !== 'multiple-choice' && question.correctChoiceIndexes.length !== 1) {
      ctx.addIssue({ code: 'custom', path: ['correctChoiceIndexes'], message: '単一選択・○×問題は正答を1つだけ指定してください。' });
    }
  });

const recallQuestionSchema = baseQuestionSchema.extend({
  questionFormat: z.enum(['fill-blank', 'short-answer']),
  acceptedAnswers: z.array(textSchema).min(1)
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

export const datasetSchema = z
  .object({
    datasetVersion: textSchema,
    schemaVersion: z.literal('0.3'),
    questions: z.array(questionSchema),
    materials: z.array(materialSchema)
  })
  .superRefine((dataset, ctx) => {
    const questionIds = new Set<string>();
    const materialIds = new Set<string>();

    dataset.questions.forEach((question, index) => {
      if (questionIds.has(question.id)) {
        ctx.addIssue({ code: 'custom', path: ['questions', index, 'id'], message: `問題IDが重複しています: ${question.id}` });
      }
      questionIds.add(question.id);
    });

    dataset.materials.forEach((material, index) => {
      if (materialIds.has(material.id)) {
        ctx.addIssue({ code: 'custom', path: ['materials', index, 'id'], message: `資料IDが重複しています: ${material.id}` });
      }
      materialIds.add(material.id);
    });

    dataset.questions.forEach((question, questionIndex) => {
      question.relatedMaterialIds.forEach((materialId) => {
        if (!materialIds.has(materialId)) {
          ctx.addIssue({ code: 'custom', path: ['questions', questionIndex, 'relatedMaterialIds'], message: `関連資料IDが存在しません: ${materialId}` });
        }
      });
    });

    dataset.materials.forEach((material, materialIndex) => {
      material.relatedQuestionIds.forEach((questionId) => {
        if (!questionIds.has(questionId)) {
          ctx.addIssue({ code: 'custom', path: ['materials', materialIndex, 'relatedQuestionIds'], message: `関連問題IDが存在しません: ${questionId}` });
        }
      });
    });
  });

export type DatasetInput = z.input<typeof datasetSchema>;
export type Dataset = z.output<typeof datasetSchema>;
