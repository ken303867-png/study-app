import type { CanonicalMasterExport } from '../../src/schemas/masterDataSchemas';

export type WorkbookCell = string | number | boolean | null | undefined;

export async function buildCanonicalMasterXlsx(master: CanonicalMasterExport): Promise<Uint8Array> {
  const sheets: Array<{ name: string; rows: WorkbookCell[][] }> = [
    {
      name: 'README',
      rows: [
        ['key', 'value'],
        ['masterDataVersion', master.masterDataVersion],
        ['explanationTemplateVersion', master.explanationTemplateVersion],
        ['formalDataSpecVersion', master.formalDataSpecVersion],
        ['deliveryDatasetVersion', master.deliveryDatasetVersion]
      ]
    }
  ];

  for (const sheetName of [
    'QUESTIONS',
    'SOURCE_OCCURRENCES',
    'CHOICES',
    'EXPLANATIONS',
    'CHOICE_EXPLANATIONS',
    'SOURCES',
    'RELATIONS',
    'QA_LEDGER',
    'TAXONOMY',
    'MEDIA',
    'MATERIALS',
    'MATERIAL_BLOCKS'
  ] as const) {
    const records = master.sheets[sheetName] as unknown as Array<Record<string, unknown>>;
    sheets.push({ name: sheetName, rows: recordsToRows(records) });
  }

  return buildWorkbookXlsx(sheets);
}

export async function buildWorkbookXlsx(
  sheets: Array<{ name: string; rows: WorkbookCell[][] }>
): Promise<Uint8Array> {
  const sheetEntries = sheets.map((sheet) => ({ name: sheet.name, xml: worksheetXml(sheet.rows) }));
  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheetEntries
    .map(
      (sheet, index) =>
        `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
    )
    .join('')}</sheets>
</workbook>`;

  const relationshipsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheetEntries
    .map(
      (_, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
    )
    .join('')}
</Relationships>`;

  const entries: Array<{ name: string; data: Uint8Array }> = [
    { name: 'xl/workbook.xml', data: encode(workbookXml) },
    { name: 'xl/_rels/workbook.xml.rels', data: encode(relationshipsXml) },
    ...sheetEntries.map((sheet, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      data: encode(sheet.xml)
    }))
  ];

  return buildZip(entries, true);
}

function recordsToRows(records: Array<Record<string, unknown>>): WorkbookCell[][] {
  if (records.length === 0) return [];
  const headers: string[] = [];
  for (const record of records) {
    for (const key of Object.keys(record)) {
      if (!headers.includes(key)) headers.push(key);
    }
  }
  const rows: WorkbookCell[][] = [headers];
  for (const record of records) {
    rows.push(
      headers.map((header) => {
        const value = record[header];
        if (Array.isArray(value)) return JSON.stringify(value);
        if (value === null || value === undefined) return null;
        if (['string', 'number', 'boolean'].includes(typeof value)) return value as WorkbookCell;
        return JSON.stringify(value);
      })
    );
  }
  return rows;
}

function worksheetXml(rows: WorkbookCell[][]) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${rows
    .map(
      (row, rowIndex) =>
        `<row r="${rowIndex + 1}">${row
          .map((value, columnIndex) => cellXml(value, rowIndex + 1, columnIndex))
          .join('')}</row>`
    )
    .join('')}</sheetData>
</worksheet>`;
}

function cellXml(value: WorkbookCell, row: number, columnIndex: number) {
  if (value === null || value === undefined || value === '') return '';
  const reference = `${columnName(columnIndex)}${row}`;
  if (typeof value === 'boolean') {
    return `<c r="${reference}" t="b"><v>${value ? '1' : '0'}</v></c>`;
  }
  if (typeof value === 'number') {
    return `<c r="${reference}"><v>${value}</v></c>`;
  }
  return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function columnName(index: number) {
  let value = index + 1;
  let name = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function encode(value: string) {
  return new TextEncoder().encode(value);
}

async function buildZip(
  entries: Array<{ name: string; data: Uint8Array }>,
  deflate: boolean
): Promise<Uint8Array> {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const fileName = encode(entry.name);
    const compressed = deflate ? await deflateRaw(entry.data) : entry.data;
    const method = deflate ? 8 : 0;
    const localHeader = new Uint8Array(30 + fileName.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, method, true);
    localView.setUint32(14, 0, true);
    localView.setUint32(18, compressed.length, true);
    localView.setUint32(22, entry.data.length, true);
    localView.setUint16(26, fileName.length, true);
    localHeader.set(fileName, 30);
    localParts.push(localHeader, compressed);

    const centralHeader = new Uint8Array(46 + fileName.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, method, true);
    centralView.setUint32(16, 0, true);
    centralView.setUint32(20, compressed.length, true);
    centralView.setUint32(24, entry.data.length, true);
    centralView.setUint16(28, fileName.length, true);
    centralView.setUint32(42, localOffset, true);
    centralHeader.set(fileName, 46);
    centralParts.push(centralHeader);

    localOffset += localHeader.length + compressed.length;
  }

  const centralDirectory = concat(centralParts);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralDirectory.length, true);
  endView.setUint32(16, localOffset, true);
  return concat([...localParts, centralDirectory, end]);
}

async function deflateRaw(data: Uint8Array) {
  const copy = new Uint8Array(data);
  const stream = new Blob([copy.buffer]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function concat(parts: Uint8Array[]) {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}
