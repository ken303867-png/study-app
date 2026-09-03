import { z } from 'zod';
import type { CanonicalMasterExport } from '../schemas/masterDataSchemas';
import { readXlsxWorkbook, type XlsxCellValue } from './xlsxWorkbookReader';

const FINAL_SHEET = '統合709_学習マスター';
const BASELINE_SHEET = '統合720_IDマスター';
const SUPPORTED_GROUPS = ['既存520', '予想200'] as const;
const CHOICE_KEYS = ['A', 'B', 'C', 'D'] as const;

type SupportedGroup = (typeof SUPPORTED_GROUPS)[number];
type ChoiceKey = (typeof CHOICE_KEYS)[number];
type MasterSource = CanonicalMasterExport['sheets']['SOURCES'][number];

const locatorEntrySchema = z.object({
  source_question_id: z.string().trim().min(1),
  source_question_no: z.number().int().positive(),
  question_page: z.number().int().positive().optional(),
  answer_page: z.number().int().positive().optional(),
  source_answer: z.enum(['A', 'B', 'C', 'D', 'E']).optional(),
  source_location: z.string().trim().min(1).optional(),
  verification_note: z.string().trim().min(1).optional()
});

export const legacySourceLocatorIndexSchema = z.object({
  version: z.literal('1.0'),
  entries: z.array(locatorEntrySchema)
});

export type LegacySourceLocatorIndex = z.infer<typeof legacySourceLocatorIndexSchema>;

export interface LegacyLineageSourceDefinition {
  legacyGroup: SupportedGroup;
  source: MasterSource;
  requirePageLocator: boolean;
}

export interface LegacyLineageChoiceSnapshot {
  key: ChoiceKey;
  sourceText: string;
  canonicalText: string;
  isSourceCorrect: boolean;
  isFinalCorrect: boolean;
  changed: boolean;
}

export interface LegacyLineageQuestion {
  canonicalQuestionId: string;
  integratedId: string;
  sourceQuestionId: string;
  legacyGroup: SupportedGroup;
  sourceId: string;
  sourceQuestionNo: number;
  sourceOccurrenceId: string;
  sourceOccurrenceOrder: number;
  subject: string;
  unit: string;
  topic: string;
  importance: 'S+' | 'S' | 'A' | 'B';
  sourcePrompt: string;
  canonicalPrompt: string;
  sourceAnswer: string;
  finalAnswer: string;
  answerDiscrepancy: 'none' | 'reviewed-different';
  answerSource: 'source-explanation' | 'locator-override' | 'audited-prediction';
  choices: LegacyLineageChoiceSnapshot[];
  sourceReferences: string;
  sourceExplanationRaw?: string;
  currentnessNote?: string;
  sourceQuestionPage?: number;
  sourceAnswerPage?: number;
  sourceLocation?: string;
  sourceVerificationNote?: string;
  sourcePromptChanged: boolean;
  sourceChoicesChanged: boolean;
}

export interface LegacyLineageReconstructionReport {
  finalQuestionCount: number;
  baselineQuestionCount: number;
  matchedQuestionCount: number;
  existingQuestionCount: number;
  predictedQuestionCount: number;
  excludedBaselineQuestionIds: string[];
  answerDiscrepancyCount: number;
  sourcePromptChangedCount: number;
  sourceChoicesChangedCount: number;
  sourceAnswerFromExplanationCount: number;
  sourceAnswerFromLocatorCount: number;
  sourceAnswerFromAuditedPredictionCount: number;
  pageLocatorRequiredCount: number;
  pageLocatorCompleteCount: number;
  sourceTraceabilityReady: boolean;
  issues: string[];
}

export interface LegacyLineageReconstructionResult {
  sources: MasterSource[];
  questions: LegacyLineageQuestion[];
  report: LegacyLineageReconstructionReport;
}

export class LegacyLineageReconstructionError extends Error {
  readonly issues: string[];

  constructor(message: string, issues: string[] = []) {
    super(message);
    this.name = 'LegacyLineageReconstructionError';
    this.issues = issues;
  }
}

export async function reconstructLegacy709SourceLineage(input: {
  finalWorkbook: ArrayBuffer;
  baselineWorkbook: ArrayBuffer;
  sourceDefinitions: LegacyLineageSourceDefinition[];
  locatorIndex?: LegacySourceLocatorIndex;
}): Promise<LegacyLineageReconstructionResult> {
  const sourceDefinitions = validateSourceDefinitions(input.sourceDefinitions);
  const locatorIndex = input.locatorIndex
    ? legacySourceLocatorIndexSchema.parse(input.locatorIndex)
    : { version: '1.0' as const, entries: [] };
  const locators = uniqueMap(
    locatorIndex.entries,
    (entry) => entry.source_question_id,
    'locator source_question_id'
  );

  const finalWorkbook = await readXlsxWorkbook(input.finalWorkbook, new Set([FINAL_SHEET]));
  const baselineWorkbook = await readXlsxWorkbook(input.baselineWorkbook, new Set([BASELINE_SHEET]));
  const finalTable = readTable(FINAL_SHEET, finalWorkbook.get(FINAL_SHEET), [
    '学習ID',
    '統合ID',
    '元ID',
    '区分',
    '17科目',
    '大分野',
    '中心論点',
    '優先度',
    '問題文',
    '選択肢A',
    '選択肢B',
    '選択肢C',
    '選択肢D',
    '正答',
    '根拠資料',
    '元資料解説_原文保持'
  ]);
  const baselineTable = readTable(BASELINE_SHEET, baselineWorkbook.get(BASELINE_SHEET), [
    '統合ID',
    '元ID',
    '区分',
    '元問題No./予想No.',
    '17科目',
    '大分野',
    '中心論点',
    '問題文',
    '選択肢A',
    '選択肢B',
    '選択肢C',
    '選択肢D',
    '正答_A-E',
    '全体解説/元資料解説',
    '根拠資料'
  ]);

  const finalBySourceId = uniqueMap(finalTable.rows, (row) => requiredText(row, '元ID'), 'final 元ID');
  const baselineBySourceId = uniqueMap(
    baselineTable.rows,
    (row) => requiredText(row, '元ID'),
    'baseline 元ID'
  );
  const finalCanonicalIds = new Set<string>();
  const finalIntegratedIds = new Set<string>();
  const issues: string[] = [];
  const questions: LegacyLineageQuestion[] = [];

  for (const finalRow of finalTable.rows) {
    const canonicalQuestionId = requiredText(finalRow, '学習ID');
    const integratedId = requiredText(finalRow, '統合ID');
    const sourceQuestionId = requiredText(finalRow, '元ID');
    ensureUnique(finalCanonicalIds, canonicalQuestionId, '学習ID');
    ensureUnique(finalIntegratedIds, integratedId, '統合ID');

    const baselineRow = baselineBySourceId.get(sourceQuestionId);
    if (!baselineRow) {
      issues.push(`${sourceQuestionId}: baseline ${BASELINE_SHEET}に対応行がありません。`);
      continue;
    }
    if (requiredText(baselineRow, '統合ID') !== integratedId) {
      issues.push(`${sourceQuestionId}: 統合IDがfinalとbaselineで一致しません。`);
      continue;
    }

    const legacyGroup = parseLegacyGroup(requiredText(finalRow, '区分'), sourceQuestionId, issues);
    if (!legacyGroup) continue;
    if (requiredText(baselineRow, '区分') !== legacyGroup) {
      issues.push(`${sourceQuestionId}: 区分がfinalとbaselineで一致しません。`);
      continue;
    }
    const sourceDefinition = sourceDefinitions.get(legacyGroup);
    if (!sourceDefinition) {
      issues.push(`${sourceQuestionId}: ${legacyGroup} のsource definitionがありません。`);
      continue;
    }

    const sourceQuestionNo = positiveInteger(baselineRow, '元問題No./予想No.', sourceQuestionId, issues);
    if (!sourceQuestionNo) continue;
    const locator = locators.get(sourceQuestionId);
    if (locator && locator.source_question_no !== sourceQuestionNo) {
      issues.push(`${sourceQuestionId}: locatorのsource_question_noがbaselineと一致しません。`);
      continue;
    }
    if (sourceDefinition.requirePageLocator && (!locator?.question_page || !locator.answer_page)) {
      issues.push(`${sourceQuestionId}: 問題PDF/解答PDFのpage locatorが不足しています。`);
    }

    const sourceExplanationRaw = optionalText(baselineRow, '全体解説/元資料解説');
    const sourceAnswerResolution = resolveSourceAnswer({
      legacyGroup,
      sourceQuestionId,
      sourceExplanationRaw,
      locatorAnswer: locator?.source_answer,
      auditedPredictionAnswer: optionalText(baselineRow, '正答_A-E')
    });
    if (!sourceAnswerResolution) {
      issues.push(`${sourceQuestionId}: 原資料正答を無推測で確定できません。`);
      continue;
    }
    const finalAnswer = requiredText(finalRow, '正答').toUpperCase();
    if (!/^[A-E]$/.test(finalAnswer)) {
      issues.push(`${sourceQuestionId}: final正答がA-Eではありません。`);
      continue;
    }

    const sourcePrompt = requiredText(baselineRow, '問題文');
    const canonicalPrompt = requiredText(finalRow, '問題文');
    const choices = CHOICE_KEYS.map((key) => {
      const sourceText = requiredText(baselineRow, `選択肢${key}`);
      const canonicalText = requiredText(finalRow, `選択肢${key}`);
      return {
        key,
        sourceText,
        canonicalText,
        isSourceCorrect: sourceAnswerResolution.answer === key,
        isFinalCorrect: finalAnswer === key,
        changed: normalizeComparable(sourceText) !== normalizeComparable(canonicalText)
      } satisfies LegacyLineageChoiceSnapshot;
    });

    const sourceLocation = buildSourceLocation(locator, sourceQuestionId, legacyGroup);
    questions.push({
      canonicalQuestionId,
      integratedId,
      sourceQuestionId,
      legacyGroup,
      sourceId: sourceDefinition.source.source_id,
      sourceQuestionNo,
      sourceOccurrenceId: `${sourceDefinition.source.source_id}-Q${String(sourceQuestionNo).padStart(3, '0')}`,
      sourceOccurrenceOrder: sourceQuestionNo,
      subject: requiredText(finalRow, '17科目'),
      unit: requiredText(finalRow, '大分野'),
      topic: requiredText(finalRow, '中心論点'),
      importance: parseImportance(requiredText(finalRow, '優先度'), sourceQuestionId, issues),
      sourcePrompt,
      canonicalPrompt,
      sourceAnswer: sourceAnswerResolution.answer,
      finalAnswer,
      answerDiscrepancy: sourceAnswerResolution.answer === finalAnswer ? 'none' : 'reviewed-different',
      answerSource: sourceAnswerResolution.provenance,
      choices,
      sourceReferences: requiredText(finalRow, '根拠資料'),
      ...(sourceExplanationRaw ? { sourceExplanationRaw } : {}),
      ...(optionalText(finalRow, '現行性/品質注意')
        ? { currentnessNote: optionalText(finalRow, '現行性/品質注意') }
        : {}),
      ...(locator?.question_page ? { sourceQuestionPage: locator.question_page } : {}),
      ...(locator?.answer_page ? { sourceAnswerPage: locator.answer_page } : {}),
      ...(sourceLocation ? { sourceLocation } : {}),
      ...(locator?.verification_note ? { sourceVerificationNote: locator.verification_note } : {}),
      sourcePromptChanged: normalizeComparable(sourcePrompt) !== normalizeComparable(canonicalPrompt),
      sourceChoicesChanged: choices.some((choice) => choice.changed)
    });
  }

  const excludedBaselineQuestionIds = [...baselineBySourceId.keys()]
    .filter((sourceQuestionId) => !finalBySourceId.has(sourceQuestionId))
    .sort(compareSourceIds);
  const pageLocatorRequiredCount = questions.filter(
    (question) => sourceDefinitions.get(question.legacyGroup)?.requirePageLocator
  ).length;
  const pageLocatorCompleteCount = questions.filter(
    (question) =>
      sourceDefinitions.get(question.legacyGroup)?.requirePageLocator &&
      question.sourceQuestionPage &&
      question.sourceAnswerPage
  ).length;
  const sourceOccurrenceIds = new Set<string>();
  for (const question of questions) {
    if (sourceOccurrenceIds.has(question.sourceOccurrenceId)) {
      issues.push(`${question.sourceOccurrenceId}: source_occurrence_idが重複しています。`);
    }
    sourceOccurrenceIds.add(question.sourceOccurrenceId);
  }

  const report: LegacyLineageReconstructionReport = {
    finalQuestionCount: finalTable.rows.length,
    baselineQuestionCount: baselineTable.rows.length,
    matchedQuestionCount: questions.length,
    existingQuestionCount: questions.filter((question) => question.legacyGroup === '既存520').length,
    predictedQuestionCount: questions.filter((question) => question.legacyGroup === '予想200').length,
    excludedBaselineQuestionIds,
    answerDiscrepancyCount: questions.filter((question) => question.answerDiscrepancy !== 'none').length,
    sourcePromptChangedCount: questions.filter((question) => question.sourcePromptChanged).length,
    sourceChoicesChangedCount: questions.filter((question) => question.sourceChoicesChanged).length,
    sourceAnswerFromExplanationCount: questions.filter(
      (question) => question.answerSource === 'source-explanation'
    ).length,
    sourceAnswerFromLocatorCount: questions.filter(
      (question) => question.answerSource === 'locator-override'
    ).length,
    sourceAnswerFromAuditedPredictionCount: questions.filter(
      (question) => question.answerSource === 'audited-prediction'
    ).length,
    pageLocatorRequiredCount,
    pageLocatorCompleteCount,
    sourceTraceabilityReady:
      issues.length === 0 &&
      questions.length === finalTable.rows.length &&
      pageLocatorCompleteCount === pageLocatorRequiredCount,
    issues
  };

  return {
    sources: [...sourceDefinitions.values()].map((definition) => definition.source),
    questions,
    report
  };
}

function validateSourceDefinitions(definitions: LegacyLineageSourceDefinition[]) {
  const byGroup = new Map<SupportedGroup, LegacyLineageSourceDefinition>();
  const sourceIds = new Set<string>();
  for (const definition of definitions) {
    if (!SUPPORTED_GROUPS.includes(definition.legacyGroup)) {
      throw new LegacyLineageReconstructionError(`未対応のlegacy groupです: ${definition.legacyGroup}`);
    }
    if (byGroup.has(definition.legacyGroup)) {
      throw new LegacyLineageReconstructionError(`${definition.legacyGroup}: source definitionが重複しています。`);
    }
    if (sourceIds.has(definition.source.source_id)) {
      throw new LegacyLineageReconstructionError(`${definition.source.source_id}: source_idが重複しています。`);
    }
    sourceIds.add(definition.source.source_id);
    byGroup.set(definition.legacyGroup, definition);
  }
  return byGroup;
}

function readTable(sheetName: string, rows: XlsxCellValue[][] | undefined, requiredHeaders: string[]) {
  if (!rows) throw new LegacyLineageReconstructionError(`${sheetName} シートがありません。`);
  const headerRowIndex = rows.findIndex((row) => row.some((cell) => !isBlank(cell)));
  if (headerRowIndex < 0) throw new LegacyLineageReconstructionError(`${sheetName} が空です。`);
  const headers = (rows[headerRowIndex] ?? []).map(textValue);
  const duplicateHeaders = headers.filter((header, index) => header && headers.indexOf(header) !== index);
  if (duplicateHeaders.length > 0) {
    throw new LegacyLineageReconstructionError(`${sheetName}: ヘッダーが重複しています。`, [
      ...new Set(duplicateHeaders)
    ]);
  }
  const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new LegacyLineageReconstructionError(`${sheetName}: 必須ヘッダーが不足しています。`, missingHeaders);
  }
  return {
    rows: rows
      .slice(headerRowIndex + 1)
      .filter((row) => row.some((cell) => !isBlank(cell)))
      .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? null])))
  };
}

function resolveSourceAnswer(input: {
  legacyGroup: SupportedGroup;
  sourceQuestionId: string;
  sourceExplanationRaw?: string;
  locatorAnswer?: string;
  auditedPredictionAnswer?: string;
}): { answer: string; provenance: LegacyLineageQuestion['answerSource'] } | null {
  if (input.legacyGroup === '既存520') {
    const explicit = input.sourceExplanationRaw ? parseExplicitSourceAnswer(input.sourceExplanationRaw) : null;
    if (explicit) return { answer: explicit, provenance: 'source-explanation' };
    if (input.locatorAnswer) return { answer: input.locatorAnswer, provenance: 'locator-override' };
    return null;
  }
  const predictionAnswer = input.auditedPredictionAnswer?.trim().toUpperCase();
  if (predictionAnswer && /^[A-E]$/.test(predictionAnswer)) {
    return { answer: predictionAnswer, provenance: 'audited-prediction' };
  }
  return null;
}

export function parseExplicitSourceAnswer(rawExplanation: string): string | null {
  const normalized = rawExplanation
    .trim()
    .replace(/[０-９]/g, (value) => String(value.charCodeAt(0) - '０'.charCodeAt(0)))
    .replace(/[①②③④⑤]/g, (value) => String('①②③④⑤'.indexOf(value) + 1));
  const match = /^(?:【[^】]+】\s*)?([1-5１-５])\s*(?:が|を)?\s*正解/.exec(normalized);
  if (!match?.[1]) return null;
  return 'ABCDE'[Number(match[1]) - 1] ?? null;
}

function buildSourceLocation(
  locator: z.infer<typeof locatorEntrySchema> | undefined,
  sourceQuestionId: string,
  legacyGroup: SupportedGroup
) {
  if (locator?.source_location) return locator.source_location;
  if (locator?.question_page || locator?.answer_page) {
    const parts = [
      locator.question_page ? `問題PDF p.${locator.question_page}` : null,
      locator.answer_page ? `解答PDF p.${locator.answer_page}` : null
    ].filter((part): part is string => Boolean(part));
    return parts.join(' / ');
  }
  if (legacyGroup === '予想200') return `${BASELINE_SHEET} / ${sourceQuestionId}`;
  return undefined;
}

function parseLegacyGroup(value: string, sourceQuestionId: string, issues: string[]): SupportedGroup | null {
  if (SUPPORTED_GROUPS.includes(value as SupportedGroup)) return value as SupportedGroup;
  issues.push(`${sourceQuestionId}: 未対応の区分です: ${value}`);
  return null;
}

function parseImportance(value: string, sourceQuestionId: string, issues: string[]) {
  if (['S+', 'S', 'A', 'B'].includes(value)) return value as LegacyLineageQuestion['importance'];
  issues.push(`${sourceQuestionId}: 優先度がS+/S/A/Bではありません: ${value}`);
  return 'B';
}

function positiveInteger(
  row: Record<string, XlsxCellValue>,
  header: string,
  sourceQuestionId: string,
  issues: string[]
) {
  const value = Number(row[header]);
  if (!Number.isInteger(value) || value <= 0) {
    issues.push(`${sourceQuestionId}: ${header} が正の整数ではありません。`);
    return null;
  }
  return value;
}

function requiredText(row: Record<string, XlsxCellValue>, header: string) {
  const value = textValue(row[header]);
  if (!value) throw new LegacyLineageReconstructionError(`${header} に空欄があります。`);
  return value;
}

function optionalText(row: Record<string, XlsxCellValue>, header: string) {
  const value = textValue(row[header]);
  return value || undefined;
}

function uniqueMap<T>(rows: T[], keyOf: (row: T) => string, label: string) {
  const map = new Map<string, T>();
  for (const row of rows) {
    const key = keyOf(row);
    if (map.has(key)) throw new LegacyLineageReconstructionError(`${label} が重複しています: ${key}`);
    map.set(key, row);
  }
  return map;
}

function ensureUnique(set: Set<string>, value: string, label: string) {
  if (set.has(value)) throw new LegacyLineageReconstructionError(`${label} が重複しています: ${value}`);
  set.add(value);
}

function compareSourceIds(left: string, right: string) {
  return left.localeCompare(right, 'en', { numeric: true });
}

function normalizeComparable(value: string) {
  return value.replace(/[\s　]+/g, '').replace(/[‐‑‒–—―−]/g, '-');
}

function textValue(value: XlsxCellValue | undefined) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function isBlank(value: XlsxCellValue | undefined) {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}
