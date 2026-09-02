import { readXlsxWorkbook, type XlsxCellValue } from './xlsxWorkbookReader';

const LEGACY_SHEET = '統合709_学習マスター';
const LEGACY_SHEETS = new Set<string>([LEGACY_SHEET]);

const REQUIRED_LEGACY_HEADERS = [
  '学習ID',
  '統合ID',
  '元ID',
  '区分',
  '17科目',
  '大分野',
  '中心論点',
  '優先度',
  '設問形式',
  '問題文',
  '選択肢A',
  '選択肢B',
  '選択肢C',
  '選択肢D',
  '正答',
  '全体解説',
  '選択肢別解説',
  '周辺知識',
  'この問題で問われていること',
  '正解に至る考え方',
  '比較して覚える',
  '試験で間違いやすいポイント',
  '誤答肢の正しくなる条件',
  '覚えるべきポイント',
  '一言で覚える',
  '根拠資料',
  '元資料解説_原文保持',
  '現行性/品質注意',
  '標準化状態',
  '標準化QA'
] as const;

export interface Legacy709PreflightReport {
  detected: true;
  sheetName: typeof LEGACY_SHEET;
  questionCount: number;
  requiredHeaderCount: number;
  missingHeaders: string[];
  fourChoiceCompleteCount: number;
  choiceEPopulatedCount: number;
  coreExplanationCompleteCount: number;
  legacyComparePopulatedCount: number;
  legacyPitfallsPopulatedCount: number;
  sourceIdNormalized: false;
  sourceOccurrencesNormalized: false;
  sourceAnswerSeparated: false;
  canConvertLosslessly: false;
  blockers: string[];
}

export async function preflightLegacy709MasterXlsx(
  buffer: ArrayBuffer
): Promise<Legacy709PreflightReport | null> {
  const workbook = await readXlsxWorkbook(buffer, LEGACY_SHEETS);
  const rows = workbook.get(LEGACY_SHEET);
  if (!rows) return null;
  const headerRowIndex = rows.findIndex((row) => row.some((cell) => !isBlank(cell)));
  if (headerRowIndex < 0) {
    return reportForEmptySheet();
  }

  const headers = (rows[headerRowIndex] ?? []).map(textValue);
  const columnIndex = new Map(headers.map((header, index) => [header, index]));
  const missingHeaders = REQUIRED_LEGACY_HEADERS.filter((header) => !columnIndex.has(header));
  const dataRows = rows
    .slice(headerRowIndex + 1)
    .filter((row) => row.some((cell) => !isBlank(cell)));

  const countComplete = (required: string[]) =>
    dataRows.filter((row) => required.every((header) => hasValue(row, columnIndex.get(header)))).length;
  const countPopulated = (header: string) =>
    dataRows.filter((row) => hasValue(row, columnIndex.get(header))).length;

  const blockers = [
    '旧正本にはSOURCES正規化シートがなく、source_idを推測で生成すると出典lineageを損なうため自動確定できません。',
    '旧正本にはSOURCE_OCCURRENCES正規化シートがなく、再出題・講義セット・出現位置を正式v1.1形式へ自動確定できません。',
    '旧正本の「正答」は最終採用正答であり、元資料正答とfinal_answerを常に分離できる保証がありません。source_answerを推測でfinal_answerへ複製しません。',
    '旧正本独自の「比較して覚える」「試験で間違いやすいポイント」をDelivery都合で削除・統合せず、Canonical移行時の監査情報として保持する設計が必要です。'
  ];
  if (missingHeaders.length > 0) {
    blockers.unshift(`旧正本必須ヘッダーが不足しています: ${missingHeaders.join(', ')}`);
  }

  return {
    detected: true,
    sheetName: LEGACY_SHEET,
    questionCount: dataRows.length,
    requiredHeaderCount: REQUIRED_LEGACY_HEADERS.length,
    missingHeaders: [...missingHeaders],
    fourChoiceCompleteCount: countComplete(['選択肢A', '選択肢B', '選択肢C', '選択肢D', '正答']),
    choiceEPopulatedCount: countPopulated('選択肢E'),
    coreExplanationCompleteCount: countComplete([
      '全体解説',
      '選択肢別解説',
      '周辺知識',
      'この問題で問われていること',
      '正解に至る考え方',
      '覚えるべきポイント',
      '根拠資料',
      '元資料解説_原文保持'
    ]),
    legacyComparePopulatedCount: countPopulated('比較して覚える'),
    legacyPitfallsPopulatedCount: countPopulated('試験で間違いやすいポイント'),
    sourceIdNormalized: false,
    sourceOccurrencesNormalized: false,
    sourceAnswerSeparated: false,
    canConvertLosslessly: false,
    blockers
  };
}

function reportForEmptySheet(): Legacy709PreflightReport {
  return {
    detected: true,
    sheetName: LEGACY_SHEET,
    questionCount: 0,
    requiredHeaderCount: REQUIRED_LEGACY_HEADERS.length,
    missingHeaders: [...REQUIRED_LEGACY_HEADERS],
    fourChoiceCompleteCount: 0,
    choiceEPopulatedCount: 0,
    coreExplanationCompleteCount: 0,
    legacyComparePopulatedCount: 0,
    legacyPitfallsPopulatedCount: 0,
    sourceIdNormalized: false,
    sourceOccurrencesNormalized: false,
    sourceAnswerSeparated: false,
    canConvertLosslessly: false,
    blockers: ['統合709_学習マスターにデータ行がありません。']
  };
}

function hasValue(row: XlsxCellValue[], index: number | undefined) {
  return index !== undefined && !isBlank(row[index]);
}

function textValue(value: XlsxCellValue | undefined) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function isBlank(value: XlsxCellValue | undefined) {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}
