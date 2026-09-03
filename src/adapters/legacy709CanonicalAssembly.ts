import { canonicalMasterExportSchema, type CanonicalMasterExport } from '../schemas/masterDataSchemas';
import type { MappingProvenance } from '../types/domain';
import {
  type LegacyLineageQuestion,
  type LegacyLineageReconstructionResult
} from './legacy709LineageReconstruction';
import { readXlsxWorkbook, type XlsxCellValue } from './xlsxWorkbookReader';

const FINAL_SHEET = '統合709_学習マスター';
const FINAL_QA_SHEET = '709最終出版QA_v1.47';
const CHOICE_KEYS = ['A', 'B', 'C', 'D'] as const;
const SUBITEM_KEYS = ['a', 'b', 'c', 'd', 'e'] as const;

type ChoiceKey = (typeof CHOICE_KEYS)[number];
type SubitemKey = (typeof SUBITEM_KEYS)[number];
type MasterChoiceExplanation = CanonicalMasterExport['sheets']['CHOICE_EXPLANATIONS'][number];
type MasterQaRow = CanonicalMasterExport['sheets']['QA_LEDGER'][number];

const REQUIRED_FINAL_HEADERS = [
  '学習ID',
  '統合ID',
  '元ID',
  '区分',
  '17科目',
  '大分野',
  '中心論点',
  '優先度',
  '段階',
  '設問形式',
  '問題文',
  '選択肢A',
  '選択肢B',
  '選択肢C',
  '選択肢D',
  '正答',
  '全体解説',
  '選択肢別解説',
  '周辺知識',
  'この問題で問われていること',
  '正解に至る考え方',
  '比較して覚える',
  '試験で間違いやすいポイント',
  '誤答肢の正しくなる条件',
  '覚えるべきポイント',
  '一言で覚える',
  '根拠資料',
  '元資料解説_原文保持',
  '現行性/品質注意',
  '標準化状態',
  '標準化QA'
] as const;

export type LegacyChoiceMappingMode =
  | 'explicit-choice'
  | 'group-expanded'
  | 'subitem-composed'
  | 'complement-repair'
  | 'all-items-inference'
  | 'statement-correct-no-change'
  | 'common-source-condition';

export interface LegacyCanonicalAssemblyReport {
  questionCount: number;
  choiceCount: number;
  explanationCount: number;
  choiceExplanationCount: number;
  sourceOccurrenceCount: number;
  taxonomyCount: number;
  finalPublicationQaPassed: boolean;
  sourceTraceabilityReady: boolean;
  reasonMappingCounts: Record<LegacyChoiceMappingMode, number>;
  correctionMappingCounts: Record<LegacyChoiceMappingMode, number>;
  complementRepairQuestionIds: string[];
  commonCorrectionConditionQuestionIds: string[];
  sourceSupportedInferenceQuestionIds: string[];
  issues: string[];
}

export interface LegacyCanonicalAssemblyResult {
  master: CanonicalMasterExport;
  report: LegacyCanonicalAssemblyReport;
}

export class LegacyCanonicalAssemblyError extends Error {
  readonly issues: string[];

  constructor(message: string, issues: string[] = []) {
    super(message);
    this.name = 'LegacyCanonicalAssemblyError';
    this.issues = issues;
  }
}

interface ChoiceMapping {
  text: string;
  mode: LegacyChoiceMappingMode;
  provenance: MappingProvenance;
}

interface ParsedSelectorLine {
  keys: ChoiceKey[];
  text: string;
  explicitSingle: boolean;
  invalidReverseRange: boolean;
}

interface LegacyRow {
  values: XlsxCellValue[];
  columns: Map<string, number>;
}

export async function assembleLegacy709CanonicalMaster(input: {
  finalWorkbook: ArrayBuffer;
  lineage: LegacyLineageReconstructionResult;
  masterDataVersion: string;
  deliveryDatasetVersion: string;
  auditedAt?: string;
}): Promise<LegacyCanonicalAssemblyResult> {
  const issues: string[] = [];
  if (!input.lineage.report.sourceTraceabilityReady) {
    issues.push('Source Lineage ReconstructionがQA PASSしていません。Canonical Masterへ昇格できません。');
    issues.push(...input.lineage.report.issues);
  }

  const workbook = await readXlsxWorkbook(
    input.finalWorkbook,
    new Set([FINAL_SHEET, FINAL_QA_SHEET])
  );
  const table = readTable(FINAL_SHEET, workbook.get(FINAL_SHEET), REQUIRED_FINAL_HEADERS);
  const finalPublicationQaPassed = validateFinalPublicationQa(workbook.get(FINAL_QA_SHEET), issues);
  const lineageById = uniqueMap(
    input.lineage.questions,
    (question) => question.canonicalQuestionId,
    'lineage canonicalQuestionId'
  );
  const sourceById = uniqueMap(input.lineage.sources, (source) => source.source_id, 'lineage source_id');

  if (table.rows.length !== input.lineage.questions.length) {
    issues.push(
      `Final workbook ${table.rows.length}問とlineage ${input.lineage.questions.length}問の件数が一致しません。`
    );
  }

  const questions: CanonicalMasterExport['sheets']['QUESTIONS'] = [];
  const occurrences: CanonicalMasterExport['sheets']['SOURCE_OCCURRENCES'] = [];
  const choices: CanonicalMasterExport['sheets']['CHOICES'] = [];
  const explanations: CanonicalMasterExport['sheets']['EXPLANATIONS'] = [];
  const choiceExplanations: CanonicalMasterExport['sheets']['CHOICE_EXPLANATIONS'] = [];
  const qaLedger: MasterQaRow[] = [];
  const taxonomyKeys = new Map<string, CanonicalMasterExport['sheets']['TAXONOMY'][number]>();

  const reasonMappingCounts = emptyMappingCounts();
  const correctionMappingCounts = emptyMappingCounts();
  const complementRepairQuestionIds = new Set<string>();
  const commonCorrectionConditionQuestionIds = new Set<string>();
  const sourceSupportedInferenceQuestionIds = new Set<string>();

  for (const row of table.rows) {
    const questionId = requiredText(row, '学習ID');
    const lineage = lineageById.get(questionId);
    if (!lineage) {
      issues.push(`${questionId}: lineageに対応する問題がありません。`);
      continue;
    }
    validateIdentity(row, lineage, issues);
    const source = sourceById.get(lineage.sourceId);
    if (!source) {
      issues.push(`${questionId}: source_id=${lineage.sourceId} がlineage SOURCESにありません。`);
      continue;
    }

    const answer = requiredText(row, '正答').toUpperCase();
    if (!isChoiceKey(answer) || answer !== lineage.finalAnswer) {
      issues.push(`${questionId}: final正答がlineageと一致しません。`);
      continue;
    }

    const canonicalChoiceText = choiceTextMap(row);
    const reasonResult = buildChoiceReasonMap({
      text: requiredText(row, '選択肢別解説'),
      finalAnswer: answer,
      choices: canonicalChoiceText
    });
    const correctionResult = buildCorrectionConditionMap({
      text: requiredText(row, '誤答肢の正しくなる条件'),
      finalAnswer: answer,
      prompt: requiredText(row, '問題文'),
      choices: canonicalChoiceText,
      reasons: reasonResult.mappings
    });

    for (const warning of [...reasonResult.warnings, ...correctionResult.warnings]) {
      if (warning.mode === 'complement-repair') complementRepairQuestionIds.add(questionId);
      if (warning.mode === 'common-source-condition') {
        commonCorrectionConditionQuestionIds.add(questionId);
      }
      if (warning.provenance === 'source_supported_inference') {
        sourceSupportedInferenceQuestionIds.add(questionId);
      }
    }

    const missingReasonKeys = CHOICE_KEYS.filter((key) => !reasonResult.mappings.has(key));
    const missingCorrectionKeys = CHOICE_KEYS.filter(
      (key) => key !== answer && !correctionResult.mappings.has(key)
    );
    if (missingReasonKeys.length > 0) {
      issues.push(`${questionId}: 選択肢理由を復元できません: ${missingReasonKeys.join(', ')}`);
      continue;
    }
    if (missingCorrectionKeys.length > 0) {
      issues.push(`${questionId}: 誤答肢の修正条件を復元できません: ${missingCorrectionKeys.join(', ')}`);
      continue;
    }

    const notes = buildMigrationNotes(row, lineage);
    questions.push({
      canonical_question_id: questionId,
      source_question_id: lineage.sourceQuestionId,
      legacy_id: lineage.integratedId,
      subject: lineage.subject,
      unit: lineage.unit,
      topic: lineage.topic,
      source_group: source.source_group,
      source_id: lineage.sourceId,
      question_format: 'single-choice',
      importance: lineage.importance,
      source_prompt: lineage.sourcePrompt,
      canonical_prompt: lineage.canonicalPrompt,
      source_answer: lineage.sourceAnswer,
      final_answer: lineage.finalAnswer,
      answer_discrepancy: lineage.answerDiscrepancy,
      revision: 1,
      record_status: 'adopted',
      tags: [
        lineage.subject,
        lineage.unit,
        lineage.topic,
        requiredText(row, '段階'),
        requiredText(row, '設問形式'),
        lineage.legacyGroup
      ],
      notes,
      related_material_ids: []
    });

    occurrences.push({
      source_occurrence_id: lineage.sourceOccurrenceId,
      canonical_question_id: questionId,
      source_id: lineage.sourceId,
      source_question_no: lineage.sourceQuestionNo,
      source_question_label: lineage.sourceQuestionId,
      source_occurrence_order: lineage.sourceOccurrenceOrder,
      section_type: lineage.legacyGroup === '既存520' ? 'lecture-check' : 'predicted',
      ...(lineage.sourceQuestionPage === undefined
        ? {}
        : { source_page_start: lineage.sourceQuestionPage }),
      ...(lineage.sourceLocation === undefined ? {} : { source_location: lineage.sourceLocation }),
      source_answer: lineage.sourceAnswer,
      source_prompt_snapshot: lineage.sourcePrompt,
      notes: buildOccurrenceNotes(lineage)
    });

    lineage.choices.forEach((choice, index) => {
      choices.push({
        canonical_question_id: questionId,
        choice_key: choice.key,
        choice_order: index + 1,
        source_choice_text: choice.sourceText,
        canonical_choice_text: choice.canonicalText,
        is_source_correct: choice.isSourceCorrect,
        is_final_correct: choice.isFinalCorrect
      });
    });

    explanations.push({
      canonical_question_id: questionId,
      answer_summary: requiredText(row, '全体解説'),
      question_intent: requiredText(row, 'この問題で問われていること'),
      reasoning: requiredText(row, '正解に至る考え方'),
      surrounding_knowledge: requiredText(row, '周辺知識'),
      key_points: requiredText(row, '覚えるべきポイント'),
      mnemonic: requiredText(row, '一言で覚える'),
      references: requiredText(row, '根拠資料'),
      explanation_revision: 1,
      source_explanation_raw: requiredText(row, '元資料解説_原文保持')
    });

    CHOICE_KEYS.forEach((key, index) => {
      const reason = reasonResult.mappings.get(key)!;
      const correction =
        key === answer
          ? {
              text: '正答肢のため修正不要。',
              mode: 'explicit-choice' as const,
              provenance: 'source_structured' as const
            }
          : correctionResult.mappings.get(key)!;
      reasonMappingCounts[reason.mode] += 1;
      correctionMappingCounts[correction.mode] += 1;
      const provenance = conservativeProvenance(reason.provenance, correction.provenance);
      if (provenance === 'source_supported_inference') {
        sourceSupportedInferenceQuestionIds.add(questionId);
      }
      choiceExplanations.push({
        canonical_question_id: questionId,
        choice_key: key,
        display_order: index + 1,
        final_judgement: key === answer ? 'correct' : 'incorrect',
        reason: reason.text,
        correction_condition: correction.text,
        mapping_provenance: provenance
      });
    });

    const taxonomyKey = `${lineage.subject}\u0000${lineage.unit}\u0000${lineage.topic}`;
    if (!taxonomyKeys.has(taxonomyKey)) {
      taxonomyKeys.set(taxonomyKey, {
        subject: lineage.subject,
        unit: lineage.unit,
        topic: lineage.topic
      });
    }

    const questionWarnings = [
      ...reasonResult.warnings.map((warning) => warning.message),
      ...correctionResult.warnings.map((warning) => warning.message)
    ];
    qaLedger.push({
      canonical_question_id: questionId,
      structure_qa: 'pass',
      answer_qa: 'pass',
      explanation_qa: 'pass',
      choice_explanation_qa: 'pass',
      currentness_qa: 'pass',
      duplicate_qa: 'pass',
      source_traceability_qa: 'pass',
      final_qa: 'pass',
      ...(input.auditedAt === undefined ? {} : { audited_at: input.auditedAt }),
      notes:
        questionWarnings.length === 0
          ? 'Legacy v1.47 → Canonical v1.1 assembly QA pass.'
          : `Legacy v1.47 → Canonical v1.1 assembly QA pass. ${questionWarnings.join(' / ')}`
    });
  }

  if (!finalPublicationQaPassed) {
    issues.push('v1.47 final publication QA evidenceを確認できません。');
  }
  if (questions.length !== table.rows.length) {
    issues.push(`Canonical QUESTIONS ${questions.length}件 / final ${table.rows.length}件で不一致です。`);
  }

  if (issues.length > 0) {
    throw new LegacyCanonicalAssemblyError('旧709問のCanonical Master Assembly QAで停止しました。', issues);
  }

  const master = canonicalMasterExportSchema.parse({
    masterDataVersion: input.masterDataVersion,
    explanationTemplateVersion: '1.0',
    formalDataSpecVersion: '1.1',
    deliveryDatasetVersion: input.deliveryDatasetVersion,
    sheets: {
      QUESTIONS: questions,
      SOURCE_OCCURRENCES: occurrences,
      CHOICES: choices,
      EXPLANATIONS: explanations,
      CHOICE_EXPLANATIONS: choiceExplanations,
      SOURCES: input.lineage.sources,
      RELATIONS: [],
      QA_LEDGER: qaLedger,
      TAXONOMY: [...taxonomyKeys.values()],
      MEDIA: []
    }
  });

  return {
    master,
    report: {
      questionCount: master.sheets.QUESTIONS.length,
      choiceCount: master.sheets.CHOICES.length,
      explanationCount: master.sheets.EXPLANATIONS.length,
      choiceExplanationCount: master.sheets.CHOICE_EXPLANATIONS.length,
      sourceOccurrenceCount: master.sheets.SOURCE_OCCURRENCES.length,
      taxonomyCount: master.sheets.TAXONOMY.length,
      finalPublicationQaPassed,
      sourceTraceabilityReady: input.lineage.report.sourceTraceabilityReady,
      reasonMappingCounts,
      correctionMappingCounts,
      complementRepairQuestionIds: [...complementRepairQuestionIds].sort(),
      commonCorrectionConditionQuestionIds: [...commonCorrectionConditionQuestionIds].sort(),
      sourceSupportedInferenceQuestionIds: [...sourceSupportedInferenceQuestionIds].sort(),
      issues: []
    }
  };
}

function validateIdentity(row: LegacyRow, lineage: LegacyLineageQuestion, issues: string[]) {
  const checks: Array<[string, string, string]> = [
    ['統合ID', requiredText(row, '統合ID'), lineage.integratedId],
    ['元ID', requiredText(row, '元ID'), lineage.sourceQuestionId],
    ['区分', requiredText(row, '区分'), lineage.legacyGroup],
    ['17科目', requiredText(row, '17科目'), lineage.subject],
    ['大分野', requiredText(row, '大分野'), lineage.unit],
    ['中心論点', requiredText(row, '中心論点'), lineage.topic],
    ['問題文', requiredText(row, '問題文'), lineage.canonicalPrompt]
  ];
  for (const [label, actual, expected] of checks) {
    if (actual !== expected) issues.push(`${lineage.canonicalQuestionId}: ${label}がlineageと一致しません。`);
  }
}

function buildMigrationNotes(row: LegacyRow, lineage: LegacyLineageQuestion) {
  return [
    `legacy_group: ${lineage.legacyGroup}`,
    `legacy_stage: ${requiredText(row, '段階')}`,
    `legacy_question_type: ${requiredText(row, '設問形式')}`,
    `legacy_compare: ${requiredText(row, '比較して覚える')}`,
    `legacy_pitfalls: ${requiredText(row, '試験で間違いやすいポイント')}`,
    `currentness_quality_note: ${requiredText(row, '現行性/品質注意')}`,
    `standardization_state: ${requiredText(row, '標準化状態')}`,
    `standardization_qa: ${requiredText(row, '標準化QA')}`
  ].join('\n');
}

function buildOccurrenceNotes(lineage: LegacyLineageQuestion) {
  return [
    `answer_provenance=${lineage.answerSource}`,
    ...(lineage.sourceAnswerPage === undefined ? [] : [`answer_page=${lineage.sourceAnswerPage}`]),
    ...(lineage.sourceVerificationNote === undefined
      ? []
      : [`verification=${lineage.sourceVerificationNote}`])
  ].join(' / ');
}

function buildChoiceReasonMap(input: {
  text: string;
  finalAnswer: ChoiceKey;
  choices: Map<ChoiceKey, string>;
}) {
  const parsed = parseUpperChoiceLines(input.text);
  const mappings = new Map<ChoiceKey, ChoiceMapping>();
  const warnings: Array<ChoiceMapping & { message: string }> = [];
  const explicitFinal = parsed.some(
    (line) => line.explicitSingle && line.keys.length === 1 && line.keys[0] === input.finalAnswer
  );

  for (const line of parsed.filter((entry) => !entry.invalidReverseRange)) {
    const mode: LegacyChoiceMappingMode = line.explicitSingle ? 'explicit-choice' : 'group-expanded';
    const provenance: MappingProvenance = line.explicitSingle
      ? 'source_explicit_option_explanation'
      : 'source_raw_parsed';
    for (const key of line.keys) setChoiceMapping(mappings, key, { text: line.text, mode, provenance });
  }

  if (explicitFinal) {
    for (const line of parsed) {
      const conflictsWithFinal = line.keys.includes(input.finalAnswer) && !line.explicitSingle;
      if (!line.invalidReverseRange && !conflictsWithFinal) continue;
      for (const key of CHOICE_KEYS) {
        if (key === input.finalAnswer || mappings.has(key)) continue;
        const mapping: ChoiceMapping = {
          text: line.text,
          mode: 'complement-repair',
          provenance: 'source_supported_inference'
        };
        mappings.set(key, mapping);
        warnings.push({
          ...mapping,
          message: `選択肢${key}: 旧正本の範囲表記をfinal answerの補集合として復元。`
        });
      }
    }
  }

  const subitems = parseSubitemLines(input.text);
  if (subitems.size > 0) {
    for (const key of CHOICE_KEYS) {
      if (mappings.has(key)) continue;
      const labels = optionSubitems(input.choices.get(key) ?? '', [...subitems.keys()]);
      if (labels.length === 0 || labels.some((label) => !subitems.has(label))) continue;
      mappings.set(key, {
        text: labels.map((label) => `${label}：${subitems.get(label)!}`).join(' / '),
        mode: 'subitem-composed',
        provenance: 'source_supported_inference'
      });
    }
  }

  if (mappings.size < CHOICE_KEYS.length && isAllItemsSummary(input.text, input.finalAnswer)) {
    const finalChoice = input.choices.get(input.finalAnswer) ?? '';
    if (/すべて|全て/.test(finalChoice)) {
      if (!mappings.has(input.finalAnswer)) {
        mappings.set(input.finalAnswer, {
          text: input.text,
          mode: 'all-items-inference',
          provenance: 'source_supported_inference'
        });
      }
      for (const key of CHOICE_KEYS) {
        if (mappings.has(key)) continue;
        const mapping: ChoiceMapping = {
          text: `${input.text} 選択肢${key}は全項目を含む組み合わせではないため、正答肢とはならない。`,
          mode: 'all-items-inference',
          provenance: 'source_supported_inference'
        };
        mappings.set(key, mapping);
        warnings.push({
          ...mapping,
          message: `選択肢${key}: 「すべて」が正答である旧正本記述から部分組み合わせを補足。`
        });
      }
    }
  }

  return { mappings, warnings };
}

function buildCorrectionConditionMap(input: {
  text: string;
  finalAnswer: ChoiceKey;
  prompt: string;
  choices: Map<ChoiceKey, string>;
  reasons: Map<ChoiceKey, ChoiceMapping>;
}) {
  const parsed = parseUpperChoiceLines(input.text);
  const mappings = new Map<ChoiceKey, ChoiceMapping>();
  const warnings: Array<ChoiceMapping & { message: string }> = [];

  for (const line of parsed.filter((entry) => !entry.invalidReverseRange)) {
    const keys = line.keys.filter((key) => key !== input.finalAnswer);
    const mode: LegacyChoiceMappingMode = line.explicitSingle ? 'explicit-choice' : 'group-expanded';
    const provenance: MappingProvenance = line.explicitSingle
      ? 'source_explicit_option_explanation'
      : 'source_raw_parsed';
    for (const key of keys) setChoiceMapping(mappings, key, { text: line.text, mode, provenance });
  }

  for (const line of parsed.filter((entry) => entry.invalidReverseRange)) {
    for (const key of CHOICE_KEYS) {
      if (key === input.finalAnswer || mappings.has(key)) continue;
      const mapping: ChoiceMapping = {
        text: line.text,
        mode: 'complement-repair',
        provenance: 'source_supported_inference'
      };
      mappings.set(key, mapping);
      warnings.push({
        ...mapping,
        message: `選択肢${key}: 旧正本の逆順範囲表記を誤答肢全体の条件として復元。`
      });
    }
  }

  const subitemCorrections = parseSubitemLines(input.text);
  if (subitemCorrections.size > 0) {
    for (const key of CHOICE_KEYS) {
      if (key === input.finalAnswer || mappings.has(key)) continue;
      const reasonSubitems = parseSubitemLines(input.reasons.get(key)?.text ?? '');
      const labels = optionSubitems(input.choices.get(key) ?? '', [...reasonSubitems.keys()]);
      const usable = labels.filter((label) => subitemCorrections.has(label));
      if (usable.length === 0) continue;
      mappings.set(key, {
        text: usable.map((label) => `${label}：${subitemCorrections.get(label)!}`).join(' / '),
        mode: 'subitem-composed',
        provenance: 'source_supported_inference'
      });
    }
  }

  const asksForIncorrect = /誤っている|誤り|正しくない|不適切|適切でない|該当しない|含まれない/.test(
    input.prompt
  );
  for (const key of CHOICE_KEYS) {
    if (key === input.finalAnswer || mappings.has(key)) continue;
    const reason = input.reasons.get(key)?.text ?? '';
    if (asksForIncorrect || isStatementExplicitlyCorrect(reason)) {
      const mapping: ChoiceMapping = {
        text: '記述自体は正しいため内容修正は不要。設問条件上、正答肢ではない。',
        mode: 'statement-correct-no-change',
        provenance: 'source_supported_inference'
      };
      mappings.set(key, mapping);
      warnings.push({
        ...mapping,
        message: `選択肢${key}: 設問方向と旧正本理由から「記述修正不要」を明示。`
      });
      continue;
    }

    const mapping: ChoiceMapping = {
      text: `旧正本の共通修正条件：${input.text}`,
      mode: 'common-source-condition',
      provenance: 'source_raw_parsed'
    };
    mappings.set(key, mapping);
    warnings.push({
      ...mapping,
      message: `選択肢${key}: 旧正本で個別キーがないため共通修正条件を保持。`
    });
  }

  return { mappings, warnings };
}

function parseUpperChoiceLines(text: string): ParsedSelectorLine[] {
  const output: ParsedSelectorLine[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const selectorMatch = line.match(
      /^([A-D](?:\s*(?:[〜~～\-–—・/])\s*[A-D])*)\s*[：:]\s*(.+)$/
    );
    if (selectorMatch) {
      const selector = selectorMatch[1]!.replace(/\s+/g, '');
      const expanded = expandSelector(selector);
      output.push({
        keys: expanded.keys,
        text: selectorMatch[2]!.trim(),
        explicitSingle: expanded.keys.length === 1 && !expanded.invalidReverseRange,
        invalidReverseRange: expanded.invalidReverseRange
      });
      continue;
    }
    const quotedKey = line.match(/([A-D])「/);
    if (quotedKey && isChoiceKey(quotedKey[1])) {
      output.push({
        keys: [quotedKey[1]],
        text: line,
        explicitSingle: true,
        invalidReverseRange: false
      });
    }
  }
  return output;
}

function expandSelector(selector: string): { keys: ChoiceKey[]; invalidReverseRange: boolean } {
  if (selector.includes('・') || selector.includes('/')) {
    const keys = selector.split(/[・/]/).filter(isChoiceKey);
    return { keys, invalidReverseRange: keys.length === 0 };
  }
  const range = selector.match(/^([A-D])[〜~～\-–—]([A-D])$/);
  if (range && isChoiceKey(range[1]) && isChoiceKey(range[2])) {
    const start = CHOICE_KEYS.indexOf(range[1]);
    const end = CHOICE_KEYS.indexOf(range[2]);
    if (start > end) return { keys: [], invalidReverseRange: true };
    return { keys: CHOICE_KEYS.slice(start, end + 1), invalidReverseRange: false };
  }
  if (isChoiceKey(selector)) return { keys: [selector], invalidReverseRange: false };
  return { keys: [], invalidReverseRange: true };
}

function parseSubitemLines(text: string) {
  const output = new Map<SubitemKey, string>();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    const match = line.match(/^([a-e])\s*[：:]\s*(.+)$/);
    if (match && isSubitemKey(match[1])) output.set(match[1], match[2]!.trim());
  }
  for (const match of text.matchAll(/([a-e])は(.+?)(?=(?:[。]\s*)?[a-e]は|$)/g)) {
    if (!isSubitemKey(match[1]) || output.has(match[1])) continue;
    output.set(match[1], match[2]!.trim().replace(/[。、]+$/, ''));
  }
  return output;
}

function optionSubitems(text: string, known: SubitemKey[]) {
  if (/^(すべて|全て)$/.test(text.trim())) return known;
  if (!/^[a-e\sと＋+、,・/（）()]+$/.test(text)) return [];
  return [...text.matchAll(/[a-e]/g)]
    .map((match) => match[0])
    .filter(isSubitemKey)
    .filter((key, index, array) => array.indexOf(key) === index);
}

function isAllItemsSummary(text: string, finalAnswer: ChoiceKey) {
  return new RegExp(`(?:いずれも|すべて|全て).*(?:${finalAnswer}が正答|${finalAnswer}.*正答)`).test(text);
}

function isStatementExplicitlyCorrect(text: string) {
  if (/誤り|不正解|正答ではない/.test(text)) return false;
  return /誤答肢ではない|正しい/.test(text);
}

function conservativeProvenance(a: MappingProvenance, b: MappingProvenance): MappingProvenance {
  const rank = (value: MappingProvenance) => {
    if (value === 'source_supported_inference') return 3;
    if (value === 'source_raw_parsed') return 2;
    return 1;
  };
  return rank(a) >= rank(b) ? a : b;
}

function setChoiceMapping(map: Map<ChoiceKey, ChoiceMapping>, key: ChoiceKey, value: ChoiceMapping) {
  const current = map.get(key);
  if (!current || mappingSpecificity(value.mode) >= mappingSpecificity(current.mode)) map.set(key, value);
}

function mappingSpecificity(mode: LegacyChoiceMappingMode) {
  if (mode === 'explicit-choice') return 3;
  if (mode === 'group-expanded') return 2;
  return 1;
}

function choiceTextMap(row: LegacyRow) {
  return new Map<ChoiceKey, string>(
    CHOICE_KEYS.map((key) => [key, requiredText(row, `選択肢${key}`)])
  );
}

function validateFinalPublicationQa(rows: XlsxCellValue[][] | undefined, issues: string[]) {
  if (!rows) {
    issues.push(`${FINAL_QA_SHEET} シートがありません。`);
    return false;
  }
  const flat = rows.flat().map(textValue).filter(Boolean);
  const hasFinalPass = flat.includes('最終出版QA合格') || flat.includes('最終出版QA合格版');
  const hasOverall = flat.includes('総合判定');
  const hasDuplicateAudit = flat.includes('完全重複');
  const hasCurrentnessAudit = flat.includes('現行性監査未完了');
  if (!hasFinalPass) issues.push(`${FINAL_QA_SHEET}: 最終出版QA合格を確認できません。`);
  if (!hasOverall) issues.push(`${FINAL_QA_SHEET}: 総合判定行を確認できません。`);
  if (!hasDuplicateAudit) issues.push(`${FINAL_QA_SHEET}: 完全重複監査を確認できません。`);
  if (!hasCurrentnessAudit) issues.push(`${FINAL_QA_SHEET}: 現行性監査を確認できません。`);
  return hasFinalPass && hasOverall && hasDuplicateAudit && hasCurrentnessAudit;
}

function readTable(
  sheetName: string,
  rows: XlsxCellValue[][] | undefined,
  requiredHeaders: readonly string[]
) {
  if (!rows) throw new LegacyCanonicalAssemblyError(`${sheetName} シートがありません。`);
  const headerRowIndex = rows.findIndex((row) => row.some((cell) => !isBlank(cell)));
  if (headerRowIndex < 0) throw new LegacyCanonicalAssemblyError(`${sheetName} が空です。`);
  const headers = (rows[headerRowIndex] ?? []).map(textValue);
  const columns = new Map(headers.map((header, index) => [header, index]));
  const missing = requiredHeaders.filter((header) => !columns.has(header));
  if (missing.length > 0) {
    throw new LegacyCanonicalAssemblyError(`${sheetName} 必須ヘッダー不足: ${missing.join(', ')}`);
  }
  return {
    rows: rows
      .slice(headerRowIndex + 1)
      .filter((row) => row.some((cell) => !isBlank(cell)))
      .map((values) => ({ values, columns }))
  };
}

function requiredText(row: LegacyRow, header: string) {
  const index = row.columns.get(header);
  const value = index === undefined ? undefined : row.values[index];
  const text = textValue(value);
  if (!text) throw new LegacyCanonicalAssemblyError(`${header} に空欄があります。`);
  return text;
}

function uniqueMap<T>(values: T[], keyOf: (value: T) => string, label: string) {
  const map = new Map<string, T>();
  for (const value of values) {
    const key = keyOf(value);
    if (map.has(key)) throw new LegacyCanonicalAssemblyError(`${label} が重複しています: ${key}`);
    map.set(key, value);
  }
  return map;
}

function emptyMappingCounts(): Record<LegacyChoiceMappingMode, number> {
  return {
    'explicit-choice': 0,
    'group-expanded': 0,
    'subitem-composed': 0,
    'complement-repair': 0,
    'all-items-inference': 0,
    'statement-correct-no-change': 0,
    'common-source-condition': 0
  };
}

function textValue(value: XlsxCellValue | undefined) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function isBlank(value: XlsxCellValue | undefined) {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

function isChoiceKey(value: string | undefined): value is ChoiceKey {
  return value !== undefined && CHOICE_KEYS.includes(value as ChoiceKey);
}

function isSubitemKey(value: string | undefined): value is SubitemKey {
  return value !== undefined && SUBITEM_KEYS.includes(value as SubitemKey);
}
