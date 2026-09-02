import { ZodError } from 'zod';
import { preflightLegacy709MasterXlsx } from '../adapters/legacy709MasterPreflight';
import { parseCanonicalMasterXlsx, XlsxMasterError } from '../adapters/xlsxMasterAdapter';
import { convertMasterToDelivery, MasterConversionError } from '../converters/masterToDelivery';
import { contentRepository } from '../repositories/contentRepository';
import { datasetSchema, type Dataset } from '../schemas/contentSchemas';
import type { CanonicalMasterExportInput } from '../schemas/masterDataSchemas';

export type ImportKind = 'canonical-master' | 'delivery';
export type ImportSourceFormat = 'json' | 'xlsx';

export interface DatasetImportResult {
  kind: ImportKind;
  sourceFormat: ImportSourceFormat;
  datasetVersion: string;
  schemaVersion: '0.5';
  questionCount: number;
  materialCount: number;
  sourceCount: number;
  sourceOccurrenceCount: number;
  mediaCount: number;
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
      return await persistNormalized(master, 'canonical-master', 'xlsx');
    } catch (error) {
      if (error instanceof XlsxMasterError) {
        const legacy = await preflightLegacy709MasterXlsx(buffer).catch(() => null);
        if (legacy) {
          throw new DatasetImportError(
            '旧v1.47系709問Excel正本を検出しました。正式Canonical v1.1へ損失なく移行するためImportを中止しました。',
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
    const { dataset, kind } = normalizeImport(raw);
    return await persistDataset(dataset, kind, 'json');
  } catch (error) {
    throw normalizeImportError(error);
  }
}

async function persistNormalized(
  raw: unknown,
  kind: ImportKind,
  sourceFormat: ImportSourceFormat
): Promise<DatasetImportResult> {
  const dataset =
    kind === 'canonical-master'
      ? convertMasterToDelivery(raw as CanonicalMasterExportInput)
      : datasetSchema.parse(raw);
  return persistDataset(dataset, kind, sourceFormat);
}

async function persistDataset(
  dataset: Dataset,
  kind: ImportKind,
  sourceFormat: ImportSourceFormat
): Promise<DatasetImportResult> {
  await contentRepository.replaceDataset(dataset);
  return {
    kind,
    sourceFormat,
    datasetVersion: dataset.datasetVersion,
    schemaVersion: dataset.schemaVersion,
    questionCount: dataset.questions.length,
    materialCount: dataset.materials.length,
    sourceCount: dataset.sources.length,
    sourceOccurrenceCount: dataset.sourceOccurrences.length,
    mediaCount: dataset.media.length
  };
}

function normalizeImport(raw: unknown): { dataset: Dataset; kind: ImportKind } {
  if (!isRecord(raw)) {
    throw new DatasetImportError('JSONのルートはobjectである必要があります。');
  }

  if ('masterDataVersion' in raw && 'sheets' in raw) {
    return {
      dataset: convertMasterToDelivery(raw as CanonicalMasterExportInput),
      kind: 'canonical-master'
    };
  }

  if ('datasetVersion' in raw && 'schemaVersion' in raw) {
    return {
      dataset: datasetSchema.parse(raw),
      kind: 'delivery'
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
