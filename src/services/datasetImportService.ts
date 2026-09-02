import { ZodError } from 'zod';
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
    try {
      const master = await parseCanonicalMasterXlsx(await file.arrayBuffer(), file.name);
      return await persistNormalized(master, 'canonical-master', 'xlsx');
    } catch (error) {
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
  const dataset = kind === 'canonical-master'
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
    return new DatasetImportError('Canonical MasterのDelivery変換QAでエラーを検出しました。', error.issues);
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
