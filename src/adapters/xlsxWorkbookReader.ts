export type XlsxCellValue = string | number | boolean | null;

export class XlsxWorkbookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'XlsxWorkbookError';
  }
}

export async function readXlsxWorkbook(buffer: ArrayBuffer): Promise<Map<string, XlsxCellValue[][]>> {
  const archive = ZipArchive.open(buffer);
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
  const result = new Map<string, XlsxCellValue[][]>();
  for (const [sheetName, target] of workbookSheets) {
    const worksheetDocument = parseXml(await archive.text(target), target);
    result.set(sheetName, parseWorksheet(worksheetDocument, sharedStrings, sheetName));
  }
  return result;
}

function parseWorksheet(
  document: Document,
  sharedStrings: string[],
  sheetName: string
): XlsxCellValue[][] {
  const rows: XlsxCellValue[][] = [];
  for (const rowElement of elementsByLocalName(document, 'row')) {
    const rowIndex = Math.max(0, Number(rowElement.getAttribute('r') ?? rows.length + 1) - 1);
    const row: XlsxCellValue[] = rows[rowIndex] ?? [];
    for (const cellElement of childElementsByLocalName(rowElement, 'c')) {
      const reference = cellElement.getAttribute('r') ?? '';
      const columnIndex = columnIndexFromReference(reference);
      if (columnIndex < 0) continue;
      if (firstChildByLocalName(cellElement, 'f')) {
        throw new XlsxWorkbookError(
          `${sheetName}!${reference}: 数式セルは正式Masterでは使用できません。値に変換してください。`
        );
      }
      row[columnIndex] = readCellValue(cellElement, sharedStrings);
    }
    rows[rowIndex] = row;
  }
  return rows;
}

function readCellValue(cell: Element, sharedStrings: string[]): XlsxCellValue {
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
      throw new XlsxWorkbookError('sharedStrings参照が不正です。');
    }
    return sharedStrings[index] ?? '';
  }
  if (type === 'b') return valueText === '1';
  if (type === 'e') throw new XlsxWorkbookError(`Excelセルエラーを検出しました: ${valueText}`);
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
    throw new XlsxWorkbookError(`${label}: XMLを解析できません。`);
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
  return (
    [...match[1].toUpperCase()].reduce(
      (value, character) => value * 26 + character.charCodeAt(0) - 64,
      0
    ) - 1
  );
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

  static open(buffer: ArrayBuffer) {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    const eocdOffset = findEndOfCentralDirectory(bytes);
    const entryCount = view.getUint16(eocdOffset + 10, true);
    const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true);
    if (entryCount === 0xffff || centralDirectoryOffset === 0xffffffff) {
      throw new XlsxWorkbookError('ZIP64形式の.xlsxは現在の正本Adapterでは扱えません。');
    }

    const decoder = new TextDecoder();
    const entries = new Map<string, ZipEntry>();
    let offset = centralDirectoryOffset;
    for (let index = 0; index < entryCount; index += 1) {
      if (view.getUint32(offset, true) !== 0x02014b50) {
        throw new XlsxWorkbookError('ZIP central directoryが不正です。');
      }
      const flags = view.getUint16(offset + 8, true);
      if ((flags & 0x1) !== 0) throw new XlsxWorkbookError('暗号化された.xlsxは読み込めません。');
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
    if (!entry) throw new XlsxWorkbookError(`.xlsx内部ファイルが見つかりません: ${normalizedPath}`);
    const view = new DataView(this.bytes.buffer as ArrayBuffer);
    const offset = entry.localHeaderOffset;
    if (view.getUint32(offset, true) !== 0x04034b50) {
      throw new XlsxWorkbookError(`ZIP local headerが不正です: ${normalizedPath}`);
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
        throw new XlsxWorkbookError('この環境は.xlsxのDeflate展開に対応していません。');
      }
      const compressedCopy = new Uint8Array(compressed);
      const stream = new Blob([compressedCopy.buffer])
        .stream()
        .pipeThrough(new DecompressionStream('deflate-raw'));
      output = new Uint8Array(await new Response(stream).arrayBuffer());
    } else {
      throw new XlsxWorkbookError(`未対応のZIP圧縮方式です: method=${entry.method}`);
    }

    if (output.byteLength !== entry.uncompressedSize) {
      throw new XlsxWorkbookError(`.xlsx内部ファイルの展開サイズが一致しません: ${normalizedPath}`);
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
  throw new XlsxWorkbookError('有効な.xlsx ZIP終端を検出できません。');
}
