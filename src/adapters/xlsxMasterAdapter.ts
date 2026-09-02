import { ZodError } from 'zod';
import {
  canonicalMasterExportSchema,
  type CanonicalMasterExport
} from '../schemas/masterDataSchemas';
import {
  readXlsxWorkbook,
  XlsxWorkbookError,
  type XlsxCellValue
} from './xlsxWorkbookReader';

type RowRecord = Record<string, unknown>;

const REQUIRED_SHEETS = [
  'README',
  'QUESTIONS',
  'SOURCE_OCCURRENCES',
  'CHOICES',
  'EXPLANATIONS',
  'CHOICE_EXPLANATIONS',
  'SOURCES',
  'QA_LEDGER',
  'TAXONOMY'
] as const;
const SUPPORTED_SHEETS = new Set<string>([...REQUIRED_SHEETS, 'RELATIONS', 'MEDIA']);
const ARRAY_FIELDS = new Set(['tags', 'accepted_answers', 'related_material_ids']);
const BOOLEAN_FIELDS = new Set(['is_source_correct', 'is_final_correct']);
const INTEGER_FIELDS = new Set([
  'revision',
  'choice_order',
  'explanation_revision',
  'display_order',
  'source_set_order',
  'source_occurrence_order',
  'source_year',
  'source_page_start',
  'source_page_end',
  'source_page'
]);

export class XlsxMasterError extends Error {
  readonly issues: string[];

  constructor(message: string, issues: string[] = []) {
    super(message);
    this.name = 'XlsxMasterError';
    this.issues = issues;
  }
}

export async function parseCanonicalMasterXlsx(
  buffer: ArrayBuffer,
  fileName = 'master.xlsx'
): Promise<CanonicalMasterExport> {
  try {
    const workbook = await readXlsxWorkbook(buffer);
    const missingSheets = REQUIRED_SHEETS.filter((sheetName) => !workbook.has(sheetName));
    if (missingSheets.length > 0) {
      throw new XlsxMasterError('Excel正本に必須シートが不足しています。', [...missingSheets]);
    }

    const rowsBySheet = new Map<string, XlsxCellValue[][]>();
    for (const [sheetName, rows] of workbook) {
      if (SUPPORTED_SHEETS.has(sheetName)) rowsBySheet.set(sheetName, rows);
    }

    const metadata = parseReadme(rowsBySheet.get('README') ?? []);
    const rawMaster = {
      ...metadata,
      sheets: {
        QUESTIONS: rowsToRecords('QUESTIONS', rowsBySheet.get('QUESTIONS') ?? []),
        SOURCE_OCCURRENCES: rowsToRecords(
          'SOURCE_OCCURRENCES',
          rowsBySheet.get('SOURCE_OCCURRENCES') ?? []
        ),
        CHOICES: rowsToRecords('CHOICES', rowsBySheet.get('CHOICES') ?? []),
        EXPLANATIONS: rowsToRecords('EXPLANATIONS', rowsBySheet.get('EXPLANATIONS') ?? []),
        CHOICE_EXPLANATIONS: rowsToRecords(
          'CHOICE_EXPLANATIONS',
          rowsBySheet.get('CHOICE_EXPLANATIONS') ?? []
        ),
        SOURCES: rowsToRecords('SOURCES', rowsBySheet.get('SOURCES') ?? []),
        RELATIONS: rowsToRecords('RELATIONS', rowsBySheet.get('RELATIONS') ?? []),
        QA_LEDGER: rowsToRecords('QA_LEDGER', rowsBySheet.get('QA_LEDGER') ?? []),
        TAXONOMY: rowsToRecords('TAXONOMY', rowsBySheet.get('TAXONOMY') ?? []),
        MEDIA: rowsToRecords('MEDIA', rowsBySheet.get('MEDIA') ?? [])
      }
    };

    return canonicalMasterExportSchema.parse(rawMaster);
  } catch (error) {
    if (error instanceof XlsxMasterError) throw error;
    if (error instanceof XlsxWorkbookError) {
      throw new XlsxMasterError(`${fileName} の.xlsx構造解析でエラーを検出しました。`, [
        error.message
      ]);
    }
    if (error instanceof ZodError) {
      throw new XlsxMasterError(
        `${fileName} のExcel→Canonical Master変換Schema QAでエラーを検出しました。`,
        error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      );
    }
    throw new XlsxMasterError(`${fileName} を.xlsx正本として読み込めませんでした。`);
  }
}

function parseReadme(rows: XlsxCellValue[][]) {
  const entries = new Map<string, string>();
  for (const row of rows) {
    const key = textValue(row[0]);
    const value = textValue(row[1]);
    if (!key || !value) continue;
    const normalizedKey = normalizeMetadataKey(key);
    if (normalizedKey === 'key' && value.toLowerCase() === 'value') continue;
    entries.set(normalizedKey, value);
  }

  const required = [
    'masterDataVersion',
    'explanationTemplateVersion',
    'formalDataSpecVersion',
    'deliveryDatasetVersion'
  ] as const;
  const missing = required.filter((key) => !entries.has(key));
  if (missing.length > 0) {
    throw new XlsxMasterError(
      'READMEシートの機械可読Version情報が不足しています。A列=key / B列=value で登録してください。',
      [...missing]
    );
  }

  return {
    masterDataVersion: entries.get('masterDataVersion')!,
    explanationTemplateVersion: entries.get('explanationTemplateVersion')!,
    formalDataSpecVersion: entries.get('formalDataSpecVersion')!,
    deliveryDatasetVersion: entries.get('deliveryDatasetVersion')!
  };
}

function normalizeMetadataKey(value: string) {
  const compact = value.trim().replace(/[\s_-]/g, '').toLowerCase();
  const aliases: Record<string, string> = {
    key: 'key',
    masterdataversion: 'masterDataVersion',
    explanationtemplateversion: 'explanationTemplateVersion',
    formaldataspecversion: 'formalDataSpecVersion',
    deliverydatasetversion: 'deliveryDatasetVersion'
  };
  return aliases[compact] ?? value.trim();
}

function rowsToRecords(sheetName: string, rows: XlsxCellValue[][]): RowRecord[] {
  const firstRowIndex = rows.findIndex((row) => row.some((cell) => !isBlank(cell)));
  if (firstRowIndex < 0) return [];

  const headerRow = trimTrailingBlank(rows[firstRowIndex] ?? []);
  const headers = headerRow.map((cell) => textValue(cell));
  if (headers.some((header) => !header)) {
    throw new XlsxMasterError(`${sheetName}: ヘッダー行に空欄列があります。`);
  }
  const duplicateHeaders = headers.filter((header, index) => headers.indexOf(header) !== index);
  if (duplicateHeaders.length > 0) {
    throw new XlsxMasterError(`${sheetName}: ヘッダー名が重複しています。`, [
      ...new Set(duplicateHeaders)
    ]);
  }

  const records: RowRecord[] = [];
  for (let index = firstRowIndex + 1; index < rows.length; index += 1) {
    const row = rows[index] ?? [];
    if (row.every(isBlank)) continue;
    const record: RowRecord = {};
    headers.forEach((header, columnIndex) => {
      const value = row[columnIndex];
      if (value === null || value === undefined || isBlank(value)) return;
      record[header] = coerceCell(header, value, `${sheetName}!${index + 1}`);
    });
    records.push(record);
  }
  return records;
}

function coerceCell(
  field: string,
  value: Exclude<XlsxCellValue, null>,
  location: string
): unknown {
  if (ARRAY_FIELDS.has(field)) return parseArrayCell(value, field, location);
  if (BOOLEAN_FIELDS.has(field)) return parseBooleanCell(value, field, location);
  if (INTEGER_FIELDS.has(field)) return parsePositiveInteger(value, field, location);
  if (field === 'audited_at' && typeof value === 'number') return excelSerialToIsoDate(value);
  return typeof value === 'string' ? value.trim() : String(value);
}

function parseArrayCell(
  value: Exclude<XlsxCellValue, null>,
  field: string,
  location: string
): string[] {
  if (typeof value !== 'string') {
    throw new XlsxMasterError(
      `${location}: ${field} はJSON配列または | 区切り文字列で入力してください。`
    );
  }
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (!isStringArray(parsed)) throw new Error('not a string array');
      return parsed.map((item) => item.trim()).filter(Boolean);
    } catch {
      throw new XlsxMasterError(`${location}: ${field} のJSON配列が不正です。`);
    }
  }
  return trimmed
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item: unknown) => typeof item === 'string');
}

function parseBooleanCell(
  value: Exclude<XlsxCellValue, null>,
  field: string,
  location: string
): boolean {
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', '○', 'correct'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', '×', 'incorrect'].includes(normalized)) return false;
  throw new XlsxMasterError(`${location}: ${field} はTRUE/FALSEまたは1/0で入力してください。`);
}

function parsePositiveInteger(
  value: Exclude<XlsxCellValue, null>,
  field: string,
  location: string
): number {
  const numberValue = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new XlsxMasterError(`${location}: ${field} は正の整数で入力してください。`);
  }
  return numberValue;
}

function excelSerialToIsoDate(serial: number) {
  const milliseconds = Math.round((serial - 25569) * 86400 * 1000);
  const date = new Date(milliseconds);
  if (Number.isNaN(date.getTime())) return String(serial);
  return date.toISOString().slice(0, 10);
}

function textValue(value: XlsxCellValue | undefined) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function isBlank(value: XlsxCellValue | undefined) {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

function trimTrailingBlank(row: XlsxCellValue[]) {
  const copy = [...row];
  while (copy.length > 0 && isBlank(copy[copy.length - 1])) copy.pop();
  return copy;
}
