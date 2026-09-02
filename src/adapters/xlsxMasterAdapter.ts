import { ZodError } from 'zod';
import {
  canonicalMasterExportSchema,
  type CanonicalMasterExport
} from '../schemas/masterDataSchemas';

type CellValue = string | number | boolean | null;
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
    const archive = await ZipArchive.open(buffer);
    const workbookDocument = parseXml(await archive.text('xl/workbook.xml'), 'xl/workbook.xml');
    const relationshipsDocument = parseXml(
      await archive.text('xl/_rels/workbook.xml.rels'),
      'xl/_rels/workbook.xml.rels'
    );
    const sharedStrings = archive.has('xl/sharedStrings.xml')
      ? parseSharedStrings(
          parseXml(await archive.text('xl/sharedStrings.xml'), 'xl/sharedStrings.xml')
        )
      : [];

    const workbookSheets = mapWorkbookSheets(workbookDocument, relationshipsDocument);
    const missingSheets = REQUIRED_SHEETS.filter((sheetName) => !workbookSheets.has(sheetName));
    if (missingSheets.length > 0) {
      throw new XlsxMasterError('Excel正本に必須シートが不足しています。', missingSheets);
    }

    const rowsBySheet = new Map<string, CellValue[][]>();
    for (const [sheetName, target] of workbookSheets) {
      if (![...REQUIRED_SHEETS, 'RELATIONS', 'MEDIA'].includes(sheetName as never)) continue;
      const worksheetDocument = parseXml(await archive.text(target), target);
      rowsBySheet.set(sheetName, parseWorksheet(worksheetDocument, sharedStrings, sheetName));
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
    if (error instanceof ZodError) {
      throw new XlsxMasterError(
        `${fileName} のExcel→Canonical Master変換Schema QAでエラーを検出しました。`,
        error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      );
    }
    throw new XlsxMasterError(`${fileName} を.xlsx正本として読み込めませんでした。`);
  }
}

function parseReadme(rows: CellValue[][]) {
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
      missing
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

function rowsToRecords(sheetName: string, rows: CellValue[][]): RowRecord[] {
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
      const value = row[columnIndex] ?? null;
      if (isBlank(value)) return;
      record[header] = coerceCell(header, value, `${sheetName}!${index + 1}`);
    });
    records.push(record);
  }
  return records;
}

function coerceCell(field: string, value: Exclude<CellValue, null>, location: string): unknown {
  if (ARRAY_FIELDS.has(field)) return parseArrayCell(value, field, location);
  if (BOOLEAN_FIELDS.has(field)) return parseBooleanCell(value, field, location);
  if (INTEGER_FIELDS.has(field)) return parsePositiveInteger(value, field, location);
  if (field === 'audited_at' && typeof value === 'number') return excelSerialToIsoDate(value);
  return typeof value === 'string' ? value.trim() : String(value);
}

function parseArrayCell(value: Exclude<CellValue, null>, field: string, location: string): string[] {
  if (typeof value !== 'string') {
    throw new XlsxMasterError(`${location}: ${field} はJSON配列または | 区切り文字列で入力してください。`);
  }
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) throw new Error();
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

function parseBooleanCell(value: Exclude<CellValue, null>, field: string, location: string): boolean {
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', '○', 'correct'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', '×', 'incorrect'].includes(normalized)) return false;
  throw new XlsxMasterError(`${location}: ${field} はTRUE/FALSEまたは1/0で入力してください。`);
}

function parsePositiveInteger(value: Exclude<CellValue, null>, field: string, location: string): number {
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

function parseWorksheet(document: Document, sharedStrings: string[], sheetName: string): CellValue[][] {
  const rows: CellValue[][] = [];
  for (const rowElement of elementsByLocalName(document, 'row')) {
    const rowIndex = Math.max(0, Number(rowElement.getAttribute('r') ?? rows.length + 1) - 1);
    const row: CellValue[] = rows[rowIndex] ?? [];
    for (const cellElement of childElementsByLocalName(rowElement, 'c')) {
      const reference = cellElement.getAttribute('r') ?? '';
      const columnIndex = columnIndexFromReference(reference);
      if (columnIndex < 0) continue;
      if (firstChildByLocalName(cellElement, 'f')) {
        throw new XlsxMasterError(`${sheetName}!${reference}: 数式セルは正式Masterでは使用できません。値に変換してください。`);
      }
      row[columnIndex] = readCellValue(cellElement, sharedStrings);
    }
    rows[rowIndex] = row;
  }
  return rows;
}

function readCellValue(cell: Element, sharedStrings: string[]): CellValue {
  const type = cell.getAttribute('t');
  if (type === 'inlineStr') {
    return elementsByLocalName(cell, 't')
      .map((element) => element.textContent ?? '')
      .join('');
  }
  const valueText = firstChildByLocalName(cell, 'v')?.textContent ?? '';
  if (type === 's') {
    const index = Number(valueText);
    if (!Number.isInteger(index) || sharedStrings[index] === undefined) {
      throw new XlsxMasterError('sharedStrings参照が不正です。');
    }
    return sharedStrings[index] ?? '';
  }
  if (type === 'b') return valueText === '1';
  if (type === 'e') throw new XlsxMasterError(`Excelセルエラーを検出しました: ${valueText}`);
  if (type === 'str') return valueText;
  if (!valueText) return null;
  const numeric = Number(valueText);
  return Number.isFinite(numeric) ? numeric : valueText;
}

function parseSharedStrings(document: Document) {
  return elementsByLocalName(document, 'si').map((item) =>
    elementsByLocalName(item, 't')
      .map((element) => element.textContent ?? '')
      .join('')
  );
}

function mapWorkbookSheets(workbook: Document, relationships: Document) {
  const relationshipTargets = new Map<string, string>();
  for (const relation of elementsByLocalName(relationships, 'Relationship')) {
    const id = relation.getAttribute('Id');
    const target = relation.getAttribute('Target');
    if (id && target) relationshipTargets.set(id, resolveWorkbookTarget(target));
  }

  const sheets = new Map<string, string>();
  for (const sheet of elementsByLocalName(workbook, 'sheet')) {
    const name = sheet.getAttribute('name');
    const relationshipId =
      sheet.getAttributeNS(
        'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
        'id'
      ) ?? sheet.getAttribute('r:id');
    const target = relationshipId ? relationshipTargets.get(relationshipId) : undefined;
    if (name && target) sheets.set(name, target);
  }
  return sheets;
}

function resolveWorkbookTarget(target: string) {
  const normalizedTarget = target.replace(/\\/g, '/');
  if (normalizedTarget.startsWith('/')) return normalizeZipPath(normalizedTarget.slice(1));
  return normalizeZipPath(`xl/${normalizedTarget}`);
}

function normalizeZipPath(path: string) {
  const parts: string[] = [];
  for (const part of path.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return parts.join('/');
}

function parseXml(xml: string, label: string) {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (elementsByLocalName(document, 'parsererror').length > 0) {
    throw new XlsxMasterError(`${label}: XMLを解析できません。`);
  }
  return document;
}

function elementsByLocalName(root: Document | Element, localName: string): Element[] {
  return Array.from(root.getElementsByTagName('*')).filter((element) => element.localName === localName);
}

function childElementsByLocalName(root: Element, localName: string): Element[] {
  return Array.from(root.children).filter((element) => element.localName === localName);
}

function firstChildByLocalName(root: Element, localName: string): Element | undefined {
  return childElementsByLocalName(root, localName)[0];
}

function columnIndexFromReference(reference: string) {
  const match = /^([A-Z]+)\d+$/i.exec(reference);
  if (!match?.[1]) return -1;
  return [...match[1].toUpperCase()].reduce((value, character) => value * 26 + character.charCodeAt(0) - 64, 0) - 1;
}

function textValue(value: CellValue | undefined) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function isBlank(value: CellValue | undefined) {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

function trimTrailingBlank(row: CellValue[]) {
  const copy = [...row];
  while (copy.length > 0 && isBlank(copy[copy.length - 1])) copy.pop();
  return copy;
}

interface ZipEntry {
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

class ZipArchive {
  private constructor(
    private readonly bytes: Uint8Array,
    private readonly entries: Map<string, ZipEntry>
  ) {}

  static async open(buffer: ArrayBuffer) {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    const eocdOffset = findEndOfCentralDirectory(bytes);
    const entryCount = view.getUint16(eocdOffset + 10, true);
    const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true);
    if (entryCount === 0xffff || centralDirectoryOffset === 0xffffffff) {
      throw new XlsxMasterError('ZIP64形式の.xlsxは現在の正本Adapterでは扱えません。');
    }

    const decoder = new TextDecoder();
    const entries = new Map<string, ZipEntry>();
    let offset = centralDirectoryOffset;
    for (let index = 0; index < entryCount; index += 1) {
      if (view.getUint32(offset, true) !== 0x02014b50) {
        throw new XlsxMasterError('ZIP central directoryが不正です。');
      }
      const flags = view.getUint16(offset + 8, true);
      if ((flags & 0x1) !== 0) throw new XlsxMasterError('暗号化された.xlsxは読み込めません。');
      const method = view.getUint16(offset + 10, true);
      const compressedSize = view.getUint32(offset + 20, true);
      const uncompressedSize = view.getUint32(offset + 24, true);
      const fileNameLength = view.getUint16(offset + 28, true);
      const extraLength = view.getUint16(offset + 30, true);
      const commentLength = view.getUint16(offset + 32, true);
      const localHeaderOffset = view.getUint32(offset + 42, true);
      const fileName = normalizeZipPath(
        decoder.decode(bytes.subarray(offset + 46, offset + 46 + fileNameLength))
      );
      entries.set(fileName, { method, compressedSize, uncompressedSize, localHeaderOffset });
      offset += 46 + fileNameLength + extraLength + commentLength;
    }
    return new ZipArchive(bytes, entries);
  }

  has(path: string) {
    return this.entries.has(normalizeZipPath(path));
  }

  async text(path: string) {
    return new TextDecoder().decode(await this.read(path));
  }

  private async read(path: string) {
    const normalizedPath = normalizeZipPath(path);
    const entry = this.entries.get(normalizedPath);
    if (!entry) throw new XlsxMasterError(`.xlsx内部ファイルが見つかりません: ${normalizedPath}`);
    const sourceBuffer = this.bytes.buffer;
    const view = new DataView(sourceBuffer);
    const offset = entry.localHeaderOffset;
    if (view.getUint32(offset, true) !== 0x04034b50) {
      throw new XlsxMasterError(`ZIP local headerが不正です: ${normalizedPath}`);
    }
    const fileNameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const dataStart = offset + 30 + fileNameLength + extraLength;
    const compressed = this.bytes.subarray(dataStart, dataStart + entry.compressedSize);

    let output: Uint8Array;
    if (entry.method === 0) {
      output = new Uint8Array(compressed);
    } else if (entry.method === 8) {
      if (typeof DecompressionStream === 'undefined') {
        throw new XlsxMasterError('この環境は.xlsxのDeflate展開に対応していません。');
      }
      const compressedCopy = new Uint8Array(compressed);
      const stream = new Blob([compressedCopy.buffer])
        .stream()
        .pipeThrough(new DecompressionStream('deflate-raw'));
      output = new Uint8Array(await new Response(stream).arrayBuffer());
    } else {
      throw new XlsxMasterError(`未対応のZIP圧縮方式です: method=${entry.method}`);
    }

    if (output.byteLength !== entry.uncompressedSize) {
      throw new XlsxMasterError(`.xlsx内部ファイルの展開サイズが一致しません: ${normalizedPath}`);
    }
    return output;
  }
}

function findEndOfCentralDirectory(bytes: Uint8Array) {
  const minimumOffset = Math.max(0, bytes.length - 65557);
  for (let offset = bytes.length - 22; offset >= minimumOffset; offset -= 1) {
    if (
      bytes[offset] === 0x50 &&
      bytes[offset + 1] === 0x4b &&
      bytes[offset + 2] === 0x05 &&
      bytes[offset + 3] === 0x06
    ) {
      return offset;
    }
  }
  throw new XlsxMasterError('有効な.xlsx ZIP終端を検出できません。');
}
