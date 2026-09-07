import { ZodError } from 'zod';
import { preflightLegacy709MasterXlsx } from '../adapters/legacy709MasterPreflight';
import { parseCanonicalMasterXlsx, XlsxMasterError } from '../adapters/xlsxMasterAdapter';
import { convertMasterToDelivery, MasterConversionError } from '../converters/masterToDelivery';
import { db } from '../db/database';
import { contentRepository } from '../repositories/contentRepository';
import {
  DatasetPersistenceAuditError,
  type DatasetPersistenceAudit,
  type DatasetPersistenceMetadata
} from '../repositories/datasetPersistenceAudit';
import { datasetSchema, type Dataset } from '../schemas/contentSchemas';
import {
  canonicalMasterExportSchema,
  type CanonicalMasterExportInput
} from '../schemas/masterDataSchemas';
import { validateSpecialtySupplementalImport } from './specialtySupplementalImportPolicy';

export type ImportKind = 'canonical-master' | 'delivery' | 'supplemental-delivery';
export type ImportSourceFormat = 'json' | 'xlsx';

export interface DatasetImportResult {
  kind: ImportKind;
  sourceFormat: ImportSourceFormat;
  datasetVersion: string;
  schemaVersion: '0.5';
  formalDataSpecVersion: string;
  questionCount: number;
  materialCount: number;
  sourceCount: number;
  sourceOccurrenceCount: number;
  mediaCount: number;
  persistenceAudit: DatasetPersistenceAudit;
  supplementalKey?: string;
  supplementalQuestionCount?: number;
  replacedSupplementalQuestionCount?: number;
}

type NormalizedImport = {
  dataset: Dataset;
  kind: ImportKind;
  metadata: DatasetPersistenceMetadata;
  supplementalKey?: string;
};

export class DatasetImportError extends Error {
  readonly issues: string[];

  constructor(message: string, issues: string[] = []) {
    super(message);
    this.name = 'DatasetImportError';
    this.issues = issues;
  }
}

export async function importDatasetFile(file: File): Promise<DatasetImportResult> {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.xlsx')) {
    const buffer = await file.arrayBuffer();
    try {
      const master = await parseCanonicalMasterXlsx(buffer, file.name);
      return await persistCanonicalMaster(master, 'xlsx');
    } catch (error) {
      if (error instanceof XlsxMasterError) {
        const legacy = await preflightLegacy709MasterXlsx(buffer).catch(() => null);
        if (legacy) {
          throw new DatasetImportError(
            '旧v1.47系709問Excel正本を検出しました。正式Canonicalへ損失なく移行するためImportを中止しました。',
            [
              `Preflight: ${legacy.questionCount}問 / A〜D+正答完備 ${legacy.fourChoiceCompleteCount}問 / 解答解説コア完備 ${legacy.coreExplanationCompleteCount}問`,
              `旧独自フィールド: 比較して覚える ${legacy.legacyComparePopulatedCount}問 / 間違いやすいポイント ${legacy.legacyPitfallsPopulatedCount}問`,
              ...legacy.blockers
            ]
          );
        }
      }
      throw normalizeImportError(error);
    }
  }
  if (lowerName.endsWith('.json') || file.type === 'application/json') {
    return importDatasetJsonText(await file.text());
  }
  throw new DatasetImportError('対応ファイルは .xlsx または .json です。');
}

export async function importDatasetJsonText(text: string): Promise<DatasetImportResult> {
  try {
    const normalized = parseJsonImport(text);
    if (normalized.kind === 'supplemental-delivery') {
      const supplementalKey = normalized.supplementalKey;
      if (!supplementalKey) {
        throw new DatasetImportError('追加DeliveryにはsupplementalKeyが必要です。');
      }
      return await persistSupplementalDataset(
        normalized.dataset,
        supplementalKey,
        'json',
        normalized.metadata
      );
    }
    return await persistDataset(
      normalized.dataset,
      normalized.kind,
      'json',
      normalized.metadata
    );
  } catch (error) {
    throw normalizeImportError(error);
  }
}

/**
 * Public release bootstrap path.
 *
 * The caller verifies the gzip and per-dataset SHA-256 values before invoking this function.
 * The Base is fully parsed through the normal schema/conversion path. Supplemental rows are then
 * decoded through a lightweight verified-payload path, checked for release tags and cross-dataset
 * integrity, and persisted in one transaction. Manual file imports continue to use full Zod QA.
 */
export async function importDatasetJsonTextsAsBatch(
  texts: readonly string[]
): Promise<DatasetImportResult> {
  if (texts.length === 0) {
    throw new DatasetImportError('一括ImportするJSONデータがありません。');
  }

  try {
    const base = parseJsonImport(texts[0]);
    if (base.kind === 'supplemental-delivery') {
      throw new DatasetImportError(
        '一括Importの先頭にはCanonical Masterまたは通常DeliveryのBaseが必要です。'
      );
    }

    let merged = base.dataset;
    const seenSupplementalKeys = new Set<string>();

    for (const text of texts.slice(1)) {
      const item = parseVerifiedSupplementalJsonImport(text);
      if (!item.supplementalKey) {
        throw new DatasetImportError('追加DeliveryにはsupplementalKeyが必要です。');
      }
      if (seenSupplementalKeys.has(item.supplementalKey)) {
        throw new DatasetImportError(
          `一括Import内でsupplementalKey「${item.supplementalKey}」が重複しています。`
        );
      }
      seenSupplementalKeys.add(item.supplementalKey);
      validateSupplementalDataset(item.dataset, item.supplementalKey);
      merged = mergeSupplementalDatasetUnchecked(merged, item.dataset, item.supplementalKey);
    }

    validateMergedDatasetIntegrity(merged);
    const persistenceAudit = await contentRepository.replaceValidatedDataset(merged, base.metadata);
    return {
      kind: base.kind,
      sourceFormat: 'json',
      datasetVersion: merged.datasetVersion,
      schemaVersion: merged.schemaVersion,
      formalDataSpecVersion: base.metadata.formalDataSpecVersion,
      questionCount: merged.questions.length,
      materialCount: merged.materials.length,
      sourceCount: merged.sources.length,
      sourceOccurrenceCount: merged.sourceOccurrences.length,
      mediaCount: merged.media.length,
      persistenceAudit
    };
  } catch (error) {
    throw normalizeImportError(error);
  }
}

async function persistCanonicalMaster(
  raw: CanonicalMasterExportInput,
  sourceFormat: ImportSourceFormat
): Promise<DatasetImportResult> {
  const master = canonicalMasterExportSchema.parse(raw);
  const dataset = convertMasterToDelivery(master);
  return persistDataset(dataset, 'canonical-master', sourceFormat, {
    explanationTemplateVersion: master.explanationTemplateVersion,
    formalDataSpecVersion: master.formalDataSpecVersion
  });
}

async function persistDataset(
  dataset: Dataset,
  kind: Exclude<ImportKind, 'supplemental-delivery'>,
  sourceFormat: ImportSourceFormat,
  metadata: DatasetPersistenceMetadata = {
    explanationTemplateVersion: '1.0',
    formalDataSpecVersion: '1.1'
  }
): Promise<DatasetImportResult> {
  const persistenceAudit = await contentRepository.replaceDataset(dataset, metadata);
  return {
    kind,
    sourceFormat,
    datasetVersion: dataset.datasetVersion,
    schemaVersion: dataset.schemaVersion,
    formalDataSpecVersion: metadata.formalDataSpecVersion,
    questionCount: dataset.questions.length,
    materialCount: dataset.materials.length,
    sourceCount: dataset.sources.length,
    sourceOccurrenceCount: dataset.sourceOccurrences.length,
    mediaCount: dataset.media.length,
    persistenceAudit
  };
}

async function persistSupplementalDataset(
  dataset: Dataset,
  supplementalKey: string,
  sourceFormat: ImportSourceFormat,
  metadata: DatasetPersistenceMetadata
): Promise<DatasetImportResult> {
  validateSupplementalDataset(dataset, supplementalKey);

  const [
    currentQuestions,
    currentMaterials,
    currentSources,
    currentOccurrences,
    currentMedia,
    datasetMeta,
    schemaMeta,
    explanationTemplateMeta,
    formalDataSpecMeta
  ] = await Promise.all([
    contentRepository.getQuestions(),
    contentRepository.getMaterials(),
    contentRepository.getSources(),
    contentRepository.getSourceOccurrences(),
    contentRepository.getMedia(),
    db.meta.get('datasetVersion'),
    db.meta.get('schemaVersion'),
    db.meta.get('explanationTemplateVersion'),
    db.meta.get('formalDataSpecVersion')
  ]);

  if (currentQuestions.length > 0 && schemaMeta?.value !== '0.5') {
    throw new DatasetImportError(
      '既存データがSchema 0.5ではないため、追加Importを中止しました。先に正式Schema 0.5データを投入してください。'
    );
  }

  const current = datasetSchema.parse({
    datasetVersion: datasetMeta?.value ?? dataset.datasetVersion,
    schemaVersion: '0.5',
    questions: currentQuestions,
    materials: currentMaterials,
    sources: currentSources,
    sourceOccurrences: currentOccurrences,
    media: currentMedia
  });
  const supplementalTag = `supplemental:${supplementalKey}`;
  const replacedSupplementalQuestionCount = current.questions.filter((question) =>
    question.tags.includes(supplementalTag)
  ).length;
  const merged = mergeSupplementalDataset(current, dataset, supplementalKey);

  const mergedMetadata: DatasetPersistenceMetadata = {
    explanationTemplateVersion:
      explanationTemplateMeta?.value ?? metadata.explanationTemplateVersion,
    formalDataSpecVersion: formalDataSpecMeta?.value ?? metadata.formalDataSpecVersion
  };
  const persistenceAudit = await contentRepository.replaceDataset(merged, mergedMetadata);
  return {
    kind: 'supplemental-delivery',
    sourceFormat,
    datasetVersion: dataset.datasetVersion,
    schemaVersion: dataset.schemaVersion,
    formalDataSpecVersion: mergedMetadata.formalDataSpecVersion,
    questionCount: merged.questions.length,
    materialCount: merged.materials.length,
    sourceCount: merged.sources.length,
    sourceOccurrenceCount: merged.sourceOccurrences.length,
    mediaCount: merged.media.length,
    persistenceAudit,
    supplementalKey,
    supplementalQuestionCount: dataset.questions.length,
    replacedSupplementalQuestionCount
  };
}

function validateSupplementalDataset(dataset: Dataset, supplementalKey: string): void {
  const supplementalTag = `supplemental:${supplementalKey}`;
  if (dataset.questions.length === 0) {
    throw new DatasetImportError('追加データセットに問題がありません。');
  }
  if (dataset.materials.length > 0) {
    throw new DatasetImportError('追加データセットではmaterialsを登録できません。');
  }
  if (dataset.questions.some((question) => !question.tags.includes(supplementalTag))) {
    throw new DatasetImportError(
      `追加問題には識別tag「${supplementalTag}」を付与してください。`
    );
  }
  if (dataset.sources.some((source) => source.source_group !== supplementalTag)) {
    throw new DatasetImportError(
      `追加データのsource_groupは「${supplementalTag}」に統一してください。`
    );
  }

  const specialtyImportIssues = validateSpecialtySupplementalImport(dataset, supplementalKey);
  if (specialtyImportIssues.length > 0) {
    throw new DatasetImportError(
      '専門科目追加データの分類QAでエラーを検出したためImportを中止しました。',
      specialtyImportIssues
    );
  }
}

function mergeSupplementalDataset(
  current: Dataset,
  supplemental: Dataset,
  supplementalKey: string
): Dataset {
  return datasetSchema.parse(
    mergeSupplementalDatasetUnchecked(current, supplemental, supplementalKey)
  );
}

function mergeSupplementalDatasetUnchecked(
  current: Dataset,
  supplemental: Dataset,
  supplementalKey: string
): Dataset {
  const supplementalTag = `supplemental:${supplementalKey}`;
  const replacedQuestionIds = new Set(
    current.questions
      .filter((question) => question.tags.includes(supplementalTag))
      .map((question) => question.id)
  );
  const replacedSourceIds = new Set(
    current.sources
      .filter((source) => source.source_group === supplementalTag)
      .map((source) => source.source_id)
  );

  return {
    datasetVersion: current.datasetVersion,
    schemaVersion: '0.5',
    questions: [
      ...current.questions.filter((question) => !replacedQuestionIds.has(question.id)),
      ...supplemental.questions
    ],
    materials: current.materials,
    sources: [
      ...current.sources.filter((source) => !replacedSourceIds.has(source.source_id)),
      ...supplemental.sources
    ],
    sourceOccurrences: [
      ...current.sourceOccurrences.filter(
        (occurrence) =>
          !replacedQuestionIds.has(occurrence.canonical_question_id) &&
          !replacedSourceIds.has(occurrence.source_id)
      ),
      ...supplemental.sourceOccurrences
    ],
    media: [
      ...current.media.filter((media) => !replacedQuestionIds.has(media.canonical_question_id)),
      ...supplemental.media
    ]
  };
}

function validateMergedDatasetIntegrity(dataset: Dataset): void {
  const issues: string[] = [];
  const questionIds = collectUniqueIds(dataset.questions, (row) => row.id, 'question', issues);
  const materialIds = collectUniqueIds(dataset.materials, (row) => row.id, 'material', issues);
  const sourceIds = collectUniqueIds(dataset.sources, (row) => row.source_id, 'source', issues);
  collectUniqueIds(
    dataset.sourceOccurrences,
    (row) => row.source_occurrence_id,
    'sourceOccurrence',
    issues
  );
  collectUniqueIds(dataset.media, (row) => row.media_id, 'media', issues);

  for (const occurrence of dataset.sourceOccurrences) {
    if (!questionIds.has(occurrence.canonical_question_id)) {
      issues.push(
        `sourceOccurrence ${occurrence.source_occurrence_id}: canonical_question_id=${occurrence.canonical_question_id} が存在しません。`
      );
    }
    if (!sourceIds.has(occurrence.source_id)) {
      issues.push(
        `sourceOccurrence ${occurrence.source_occurrence_id}: source_id=${occurrence.source_id} が存在しません。`
      );
    }
  }

  for (const question of dataset.questions) {
    for (const materialId of question.relatedMaterialIds) {
      if (!materialIds.has(materialId)) {
        issues.push(`question ${question.id}: relatedMaterialId=${materialId} が存在しません。`);
      }
    }
  }

  for (const media of dataset.media) {
    if (!questionIds.has(media.canonical_question_id)) {
      issues.push(`media ${media.media_id}: canonical_question_id=${media.canonical_question_id} が存在しません。`);
    }
  }

  if (issues.length > 0) {
    throw new DatasetImportError(
      '一括Importの統合整合性QAでエラーを検出したためImportを中止しました。',
      issues.slice(0, 100)
    );
  }
}

function collectUniqueIds<T>(
  rows: readonly T[],
  keyOf: (row: T) => string,
  label: string,
  issues: string[]
): Set<string> {
  const ids = new Set<string>();
  for (const row of rows) {
    const id = keyOf(row);
    if (ids.has(id)) issues.push(`${label}: ID重複 ${id}`);
    ids.add(id);
  }
  return ids;
}

function parseVerifiedSupplementalJsonImport(text: string): NormalizedImport {
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    throw new DatasetImportError('JSONとして読み込めません。ファイル形式を確認してください。');
  }
  if (!isRecord(raw)) {
    throw new DatasetImportError('追加Delivery JSONのルートはobjectである必要があります。');
  }
  if (raw.importMode !== 'supplemental-replace' || raw.schemaVersion !== '0.5') {
    throw new DatasetImportError('SHA検証済み追加データをsupplemental-replace / Schema 0.5として識別できません。');
  }

  const supplementalKey = typeof raw.supplementalKey === 'string' ? raw.supplementalKey.trim() : '';
  const datasetVersion = typeof raw.datasetVersion === 'string' ? raw.datasetVersion : '';
  if (!supplementalKey || !datasetVersion) {
    throw new DatasetImportError('SHA検証済み追加データのsupplementalKeyまたはdatasetVersionが不正です。');
  }
  if (
    !Array.isArray(raw.questions) ||
    !Array.isArray(raw.materials) ||
    !Array.isArray(raw.sources) ||
    !Array.isArray(raw.sourceOccurrences) ||
    ('media' in raw && !Array.isArray(raw.media))
  ) {
    throw new DatasetImportError('SHA検証済み追加データの配列構造が不正です。');
  }

  const dataset: Dataset = {
    datasetVersion,
    schemaVersion: '0.5',
    questions: raw.questions as Dataset['questions'],
    materials: raw.materials as Dataset['materials'],
    sources: raw.sources as Dataset['sources'],
    sourceOccurrences: raw.sourceOccurrences as Dataset['sourceOccurrences'],
    media: (raw.media ?? []) as Dataset['media']
  };

  return {
    dataset,
    kind: 'supplemental-delivery',
    supplementalKey,
    metadata: {
      explanationTemplateVersion: '1.0',
      formalDataSpecVersion: '1.1'
    }
  };
}

function parseJsonImport(text: string): NormalizedImport {
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    throw new DatasetImportError('JSONとして読み込めません。ファイル形式を確認してください。');
  }
  return normalizeImport(raw);
}

function normalizeImport(raw: unknown): NormalizedImport {
  if (!isRecord(raw)) {
    throw new DatasetImportError('JSONのルートはobjectである必要があります。');
  }

  if ('masterDataVersion' in raw && 'sheets' in raw) {
    const master = canonicalMasterExportSchema.parse(raw);
    return {
      dataset: convertMasterToDelivery(master),
      kind: 'canonical-master',
      metadata: {
        explanationTemplateVersion: master.explanationTemplateVersion,
        formalDataSpecVersion: master.formalDataSpecVersion
      }
    };
  }

  if ('datasetVersion' in raw && 'schemaVersion' in raw) {
    const dataset = datasetSchema.parse(raw);
    if (raw.importMode === 'supplemental-replace') {
      const supplementalKey =
        typeof raw.supplementalKey === 'string' ? raw.supplementalKey.trim() : '';
      if (!supplementalKey) {
        throw new DatasetImportError('追加DeliveryにはsupplementalKeyが必要です。');
      }
      return {
        dataset,
        kind: 'supplemental-delivery',
        supplementalKey,
        metadata: {
          explanationTemplateVersion: '1.0',
          formalDataSpecVersion: '1.1'
        }
      };
    }
    return {
      dataset,
      kind: 'delivery',
      metadata: {
        explanationTemplateVersion: '1.0',
        formalDataSpecVersion: '1.1'
      }
    };
  }

  throw new DatasetImportError(
    'Canonical Master JSON ExportまたはDelivery Schema 0.5 JSONとして識別できません。'
  );
}

function normalizeImportError(error: unknown): DatasetImportError {
  if (error instanceof DatasetImportError) return error;
  if (error instanceof XlsxMasterError) {
    return new DatasetImportError(error.message, error.issues);
  }
  if (error instanceof MasterConversionError) {
    return new DatasetImportError(
      'Canonical MasterのDelivery変換QAでエラーを検出しました。',
      error.issues
    );
  }
  if (error instanceof DatasetPersistenceAuditError) {
    return new DatasetImportError(
      'IndexedDB保存後read-back監査で不一致を検出したためImportをロールバックしました。',
      error.issues
    );
  }
  if (error instanceof ZodError) {
    return new DatasetImportError(
      'Schema検証でエラーを検出しました。',
      error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    );
  }
  return new DatasetImportError('データImport中に予期しないエラーが発生しました。');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
