import type { Dataset } from '../schemas/contentSchemas';

export interface DatasetPersistenceSnapshot {
  questions: Dataset['questions'];
  materials: Dataset['materials'];
  sources: Dataset['sources'];
  sourceOccurrences: Dataset['sourceOccurrences'];
  media: Dataset['media'];
  meta: {
    datasetVersion?: string;
    schemaVersion?: string;
    explanationTemplateVersion?: string;
    formalDataSpecVersion?: string;
  };
}

export interface DatasetPersistenceAudit {
  status: 'pass';
  questionCount: number;
  materialCount: number;
  sourceCount: number;
  sourceOccurrenceCount: number;
  mediaCount: number;
  verifiedQuestionCount: number;
  verifiedChoiceAnswerCount: number;
  verifiedExplanationCount: number;
  verifiedSourceOccurrenceCount: number;
}

export class DatasetPersistenceAuditError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`IndexedDB保存後read-back監査に失敗しました。\n${issues.join('\n')}`);
    this.name = 'DatasetPersistenceAuditError';
    this.issues = issues;
  }
}

export function auditDatasetPersistence(
  expected: Dataset,
  actual: DatasetPersistenceSnapshot
): DatasetPersistenceAudit {
  const issues: string[] = [];

  compareTable('questions', expected.questions, actual.questions, (row) => row.id, issues);
  compareTable('materials', expected.materials, actual.materials, (row) => row.id, issues);
  compareTable('sources', expected.sources, actual.sources, (row) => row.source_id, issues);
  compareTable(
    'sourceOccurrences',
    expected.sourceOccurrences,
    actual.sourceOccurrences,
    (row) => row.source_occurrence_id,
    issues
  );
  compareTable('media', expected.media, actual.media, (row) => row.media_id, issues);

  compareMeta('datasetVersion', expected.datasetVersion, actual.meta.datasetVersion, issues);
  compareMeta('schemaVersion', expected.schemaVersion, actual.meta.schemaVersion, issues);
  compareMeta('explanationTemplateVersion', '1.0', actual.meta.explanationTemplateVersion, issues);
  compareMeta('formalDataSpecVersion', '1.1', actual.meta.formalDataSpecVersion, issues);

  if (issues.length > 0) throw new DatasetPersistenceAuditError(issues);

  return {
    status: 'pass',
    questionCount: actual.questions.length,
    materialCount: actual.materials.length,
    sourceCount: actual.sources.length,
    sourceOccurrenceCount: actual.sourceOccurrences.length,
    mediaCount: actual.media.length,
    verifiedQuestionCount: actual.questions.length,
    verifiedChoiceAnswerCount: actual.questions.filter((question) => 'correctChoiceIndexes' in question)
      .length,
    verifiedExplanationCount: actual.questions.filter(
      (question) =>
        Boolean(question.explanation.answer) &&
        Boolean(question.explanation.question_intent) &&
        Boolean(question.explanation.reasoning) &&
        Boolean(question.explanation.key_points) &&
        Boolean(question.explanation.references)
    ).length,
    verifiedSourceOccurrenceCount: actual.sourceOccurrences.length
  };
}

function compareTable<T>(
  label: string,
  expectedRows: T[],
  actualRows: T[],
  keyOf: (row: T) => string,
  issues: string[]
) {
  if (expectedRows.length !== actualRows.length) {
    issues.push(`${label}: 件数不一致 expected=${expectedRows.length} actual=${actualRows.length}`);
  }

  const expectedMap = uniqueMap(expectedRows, keyOf, `${label}.expected`, issues);
  const actualMap = uniqueMap(actualRows, keyOf, `${label}.actual`, issues);

  for (const [key, expectedRow] of expectedMap) {
    const actualRow = actualMap.get(key);
    if (!actualRow) {
      issues.push(`${label}: 保存後にID=${key}が見つかりません。`);
      continue;
    }
    if (stableSerialize(expectedRow) !== stableSerialize(actualRow)) {
      issues.push(`${label}: ID=${key}の保存前後データが一致しません。`);
    }
  }

  for (const key of actualMap.keys()) {
    if (!expectedMap.has(key)) issues.push(`${label}: 保存後に想定外ID=${key}があります。`);
  }
}

function uniqueMap<T>(rows: T[], keyOf: (row: T) => string, label: string, issues: string[]) {
  const result = new Map<string, T>();
  for (const row of rows) {
    const key = keyOf(row);
    if (result.has(key)) issues.push(`${label}: ID重複 ${key}`);
    result.set(key, row);
  }
  return result;
}

function compareMeta(label: string, expected: string, actual: string | undefined, issues: string[]) {
  if (actual !== expected) issues.push(`meta.${label}: expected=${expected} actual=${actual ?? 'missing'}`);
}

function stableSerialize(value: unknown): string {
  return JSON.stringify(sortObjectKeys(value));
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObjectKeys);
  if (value === null || typeof value !== 'object') return value;

  const record = value as Record<string, unknown>;
  return Object.keys(record)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = sortObjectKeys(record[key]);
      return result;
    }, {});
}
