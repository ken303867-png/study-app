import { ZodError } from 'zod';
import { convertMasterToDelivery, MasterConversionError } from '../converters/masterToDelivery';
import { contentRepository } from '../repositories/contentRepository';
import { datasetSchema, type Dataset } from '../schemas/contentSchemas';

export type ImportKind = 'canonical-master' | 'delivery';

export interface DatasetImportResult {
  kind: ImportKind;
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

export async function importDatasetJsonText(text: string): Promise<DatasetImportResult> {
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    throw new DatasetImportError('JSONとして読み込めません。ファイル形式を確認してください。');
  }

  try {
    const { dataset, kind } = normalizeImport(raw);
    await contentRepository.replaceDataset(dataset);
    return {
      kind,
      datasetVersion: dataset.datasetVersion,
      schemaVersion: dataset.schemaVersion,
      questionCount: dataset.questions.length,
      materialCount: dataset.materials.length,
      sourceCount: dataset.sources.length,
      sourceOccurrenceCount: dataset.sourceOccurrences.length,
      mediaCount: dataset.media.length
    };
  } catch (error) {
    if (error instanceof DatasetImportError) throw error;
    if (error instanceof MasterConversionError) {
      throw new DatasetImportError('Canonical MasterのDelivery変換QAでエラーを検出しました。', error.issues);
    }
    if (error instanceof ZodError) {
      throw new DatasetImportError(
        'Schema検証でエラーを検出しました。',
        error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      );
    }
    throw error;
  }
}

function normalizeImport(raw: unknown): { dataset: Dataset; kind: ImportKind } {
  if (!isRecord(raw)) {
    throw new DatasetImportError('JSONのルートはobjectである必要があります。');
  }

  if ('masterDataVersion' in raw && 'sheets' in raw) {
    return {
      dataset: convertMasterToDelivery(raw),
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
