import { z } from 'zod';
import {
  canonicalMasterExportSchema,
  type CanonicalMasterExport,
  type CanonicalMasterExportInput
} from '../schemas/masterDataSchemas';

const importanceSchema = z.enum(['S+', 'S', 'A', 'B']);
const paragraphBlockSchema = z.object({
  type: z.literal('paragraph'),
  text: z.string().min(1)
});
const tableBlockSchema = z.object({
  type: z.literal('table'),
  rows: z.array(z.array(z.string()).min(1)).min(1)
});
const sourceBlockSchema = z.union([paragraphBlockSchema, tableBlockSchema]);
const sectionSchema = z.object({
  key: z.string().min(1),
  heading: z.string().min(1),
  blocks: z.array(sourceBlockSchema)
});
const unitSchema = z.object({
  unitId: z.string().min(1),
  unitNumber: z.number().int().positive(),
  subjectId: z.string().min(1),
  subject: z.string().min(1),
  title: z.string().min(1),
  importance: importanceSchema,
  sourceHeading: z.string().min(1),
  sourceRelatedProblemRaw: z.string().optional(),
  relatedOfficialProblemIds: z.array(z.string().min(1)),
  sections: z.array(sectionSchema).min(1)
});
const subjectSchema = z.object({
  subjectId: z.string().min(1),
  subjectOrder: z.number().int().positive(),
  subject: z.string().min(1),
  source: z.object({
    fileName: z.string().min(1),
    fileSha256: z.string().min(1),
    format: z.string().min(1),
    role: z.string().min(1)
  }),
  unitCount: z.number().int().nonnegative(),
  units: z.array(unitSchema)
});
const phase3Schema = z.object({
  schemaVersion: z.literal('1.0'),
  subjectCount: z.number().int().positive(),
  unitCount: z.number().int().positive(),
  subjects: z.array(subjectSchema)
});

export interface Phase3MaterialIntegrationOptions {
  masterDataVersion: string;
  deliveryDatasetVersion: string;
}

export interface Phase3MaterialIntegrationAudit {
  subjectCount: number;
  materialCount: number;
  materialBlockCount: number;
  linkCount: number;
  linkedQuestionCount: number;
  unlinkedAdoptedQuestionCount: number;
  ignoredPhase3AuxiliaryQuestionLinks: true;
}

export interface Phase3MaterialIntegrationResult {
  master: CanonicalMasterExport;
  audit: Phase3MaterialIntegrationAudit;
}

export class Phase3MaterialIntegrationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Phase3 Material Master統合に失敗しました。\n${issues.join('\n')}`);
    this.name = 'Phase3MaterialIntegrationError';
    this.issues = issues;
  }
}

export function integratePhase3Materials(
  masterInput: CanonicalMasterExportInput,
  phase3Input: unknown,
  options: Phase3MaterialIntegrationOptions
): Phase3MaterialIntegrationResult {
  const master = canonicalMasterExportSchema.parse(masterInput);
  const phase3 = phase3Schema.parse(phase3Input);
  const issues: string[] = [];

  const actualUnitCount = phase3.subjects.reduce((sum, subject) => sum + subject.units.length, 0);
  if (phase3.subjectCount !== phase3.subjects.length) {
    issues.push(
      `Phase3 subjectCount不一致 expected=${phase3.subjectCount} actual=${phase3.subjects.length}`
    );
  }
  if (phase3.unitCount !== actualUnitCount) {
    issues.push(`Phase3 unitCount不一致 expected=${phase3.unitCount} actual=${actualUnitCount}`);
  }
  phase3.subjects.forEach((subject) => {
    if (subject.unitCount !== subject.units.length) {
      issues.push(
        `${subject.subjectId}: unitCount不一致 expected=${subject.unitCount} actual=${subject.units.length}`
      );
    }
  });

  const adoptedQuestions = master.sheets.QUESTIONS.filter((row) => row.record_status === 'adopted');
  const adoptedIds = new Set(adoptedQuestions.map((row) => row.canonical_question_id));
  const reverseLinks = new Map<string, string[]>();
  const materials: CanonicalMasterExport['sheets']['MATERIALS'] = [];
  const materialBlocks: CanonicalMasterExport['sheets']['MATERIAL_BLOCKS'] = [];
  const seenMaterialIds = new Set<string>();
  const seenBlockIds = new Set<string>();

  for (const subject of phase3.subjects) {
    for (const unit of subject.units) {
      if (seenMaterialIds.has(unit.unitId)) {
        issues.push(`material_id重複: ${unit.unitId}`);
        continue;
      }
      seenMaterialIds.add(unit.unitId);

      const relatedQuestionIds = unique(unit.relatedOfficialProblemIds);
      if (relatedQuestionIds.length !== unit.relatedOfficialProblemIds.length) {
        issues.push(`${unit.unitId}: relatedOfficialProblemIdsに重複があります。`);
      }
      for (const questionId of relatedQuestionIds) {
        if (!adoptedIds.has(questionId)) {
          issues.push(`${unit.unitId}: adopted問題に存在しない正式問題IDです: ${questionId}`);
          continue;
        }
        const materialIds = reverseLinks.get(questionId) ?? [];
        materialIds.push(unit.unitId);
        reverseLinks.set(questionId, materialIds);
      }

      materials.push({
        material_id: unit.unitId,
        subject: unit.subject,
        unit: unit.title,
        title: unit.title,
        importance: unit.importance,
        revision: 1,
        source_file_name: subject.source.fileName,
        source_file_sha256: subject.source.fileSha256,
        source_heading: unit.sourceHeading,
        ...(unit.sourceRelatedProblemRaw === undefined
          ? {}
          : { source_related_problem_raw: unit.sourceRelatedProblemRaw }),
        related_question_ids: relatedQuestionIds,
        tags: ['得点特化要点まとめ集', `subject:${subject.subjectId}`]
      });

      unit.sections.forEach((section, sectionIndex) => {
        section.blocks.forEach((block, blockIndex) => {
          const blockId = `${unit.unitId}-${String(sectionIndex + 1).padStart(2, '0')}-${String(
            blockIndex + 1
          ).padStart(3, '0')}`;
          if (seenBlockIds.has(blockId)) {
            issues.push(`block_id重複: ${blockId}`);
            return;
          }
          seenBlockIds.add(blockId);
          materialBlocks.push({
            block_id: blockId,
            material_id: unit.unitId,
            section_key: section.key,
            section_order: sectionIndex + 1,
            section_heading: section.heading,
            block_order: blockIndex + 1,
            block_type: block.type,
            ...(block.type === 'paragraph' ? { text: block.text } : { table_rows: block.rows })
          });
        });
      });
    }
  }

  const questions = master.sheets.QUESTIONS.map((question) => {
    if (question.record_status !== 'adopted') return question;
    const materialIds = reverseLinks.get(question.canonical_question_id) ?? [];
    if (
      question.related_material_ids.length > 0 &&
      !sameStringSet(question.related_material_ids, materialIds)
    ) {
      issues.push(
        `${question.canonical_question_id}: 既存related_material_idsとPhase3正式リンクが一致しません。`
      );
    }
    return { ...question, related_material_ids: materialIds };
  });

  if (issues.length > 0) throw new Phase3MaterialIntegrationError(issues);

  const integrated = canonicalMasterExportSchema.parse({
    ...master,
    masterDataVersion: options.masterDataVersion,
    formalDataSpecVersion: '1.2',
    deliveryDatasetVersion: options.deliveryDatasetVersion,
    sheets: {
      ...master.sheets,
      QUESTIONS: questions,
      MATERIALS: materials,
      MATERIAL_BLOCKS: materialBlocks
    }
  });

  const linkCount = materials.reduce((sum, material) => sum + material.related_question_ids.length, 0);
  return {
    master: integrated,
    audit: {
      subjectCount: phase3.subjects.length,
      materialCount: materials.length,
      materialBlockCount: materialBlocks.length,
      linkCount,
      linkedQuestionCount: reverseLinks.size,
      unlinkedAdoptedQuestionCount: adoptedQuestions.length - reverseLinks.size,
      ignoredPhase3AuxiliaryQuestionLinks: true
    }
  };
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function sameStringSet(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((value) => rightSet.has(value));
}
