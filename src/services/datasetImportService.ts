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
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    throw new DatasetImportError('JSONとして読み込めません。ファイル形式を確認してください。');
  }

  try {
    const normalized = normalizeImport(raw);
    if (normalized.kind === 'supplemental-delivery') {
      return await persistSupplementalDataset(
        normalized.dataset,
        normalized.supplementalKey!,
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

  const [
    currentQuestions,
    currentMaterials,
    currentSources,
    currentOccurrences,
    currentMedia,
    datasetMeta,
    schemaMeta
  ] = await Promise.all([
    contentRepository.getQuestions(),
    contentRepository.getMaterials(),
    contentRepository.getSources(),
    contentRepository.getSourceOccurrences(),
    contentRepository.getMedia(),
    db.meta.get('datasetVersion'),
    db.meta.get('schemaVersion')
  ]);

  if (currentQuestions.length > 0 && schemaMeta?.value !== '0.5') {
    throw new DatasetImportError(
      '既存データがSchema 0.5ではないため、追加Importを中止しました。先に正式Schema 0.5データを投入してください。'
    );
  }

  const replacedQuestionIds = new Set(
    currentQuestions
      .filter((question) => question.tags.includes(supplementalTag))
      .map((question) => question.id)
  );
  const replacedSourceIds = new Set(
    currentSources
      .filter((source) => source.source_group === supplementalTag)
      .map((source) => source.source_id)
  );

  const merged = datasetSchema.parse({
    datasetVersion: datasetMeta?.value ?? dataset.datasetVersion,
    schemaVersion: '0.5',
    questions: [
      ...currentQuestions.filter((question) => !replacedQuestionIds.has(question.id)),
      ...dataset.questions
    ],
    materials: currentMaterials,
    sources: [
      ...currentSources.filter((source) => !replacedSourceIds.has(source.source_id)),
      ...dataset.sources
    ],
    sourceOccurrences: [
      ...currentOccurrences.filter(
        (occurrence) =>
          !replacedQuestionIds.has(occurrence.canonical_question_id) &&
          !replacedSourceIds.has(occurrence.source_id)
      ),
      ...dataset.sourceOccurrences
    ],
    media: [
      ...currentMedia.filter((media) => !replacedQuestionIds.has(media.canonical_question_id)),
      ...dataset.media
    ]
  });

  const persistenceAudit = await contentRepository.replaceDataset(merged, metadata);
  return {
    kind: 'supplemental-delivery',
    sourceFormat,
    datasetVersion: dataset.datasetVersion,
    schemaVersion: dataset.schemaVersion,
    formalDataSpecVersion: metadata.formalDataSpecVersion,
    questionCount: merged.questions.length,
    materialCount: merged.materials.length,
    sourceCount: merged.sources.length,
    sourceOccurrenceCount: merged.sourceOccurrences.length,
    mediaCount: merged.media.length,
    persistenceAudit,
    supplementalKey,
    supplementalQuestionCount: dataset.questions.length,
    replacedSupplementalQuestionCount: replacedQuestionIds.size
  };
}

function normalizeImport(raw: unknown): {
  dataset: Dataset;
  kind: ImportKind;
  metadata: DatasetPersistenceMetadata;
  supplementalKey?: string;
} {
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
        throw new DatasetImportError(
          '追加DeliveryにはsupplementalKeyが必要です。'
        );
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
