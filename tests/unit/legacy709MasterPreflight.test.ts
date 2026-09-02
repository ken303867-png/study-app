import { describe, expect, it } from 'vitest';
import { preflightLegacy709MasterXlsx } from '../../src/adapters/legacy709MasterPreflight';
import { buildWorkbookXlsx } from '../helpers/buildCanonicalMasterXlsx';

const headers = [
  '学習ID',
  '統合ID',
  '元ID',
  '区分',
  '科目No.',
  '17科目',
  '大分野',
  '中心論点',
  '優先度',
  '段階',
  '設問形式',
  '問題文',
  '選択肢A',
  '選択肢B',
  '選択肢C',
  '選択肢D',
  '選択肢E',
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
];

function legacyRow(id: string) {
  return [
    id,
    `INT-${id}`,
    `SRC-${id}`,
    '既存',
    1,
    '非正式科目',
    '非正式単元',
    '非正式論点',
    'S',
    '基礎',
    '4択',
    '非正式QA問題文',
    'A選択肢',
    'B選択肢',
    'C選択肢',
    'D選択肢',
    null,
    'B',
    '全体解説',
    'A:誤り\nB:正しい\nC:誤り\nD:誤り',
    '周辺知識',
    '問われていること',
    '考え方',
    '比較内容',
    '間違いやすい点',
    'A:条件\nC:条件\nD:条件',
    '要点',
    '覚え方',
    '非正式根拠',
    '非正式元資料解説',
    'QA fixture',
    '完了',
    'pass'
  ];
}

describe('legacy709MasterPreflight', () => {
  it('detects a legacy integrated master and reports lineage blockers without conversion', async () => {
    const xlsx = await buildWorkbookXlsx([
      { name: '統合709_学習マスター', rows: [headers, legacyRow('LEGACY-001'), legacyRow('LEGACY-002')] }
    ]);
    const report = await preflightLegacy709MasterXlsx(toArrayBuffer(xlsx));

    expect(report?.detected).toBe(true);
    expect(report?.questionCount).toBe(2);
    expect(report?.fourChoiceCompleteCount).toBe(2);
    expect(report?.choiceEPopulatedCount).toBe(0);
    expect(report?.coreExplanationCompleteCount).toBe(2);
    expect(report?.legacyComparePopulatedCount).toBe(2);
    expect(report?.legacyPitfallsPopulatedCount).toBe(2);
    expect(report?.canConvertLosslessly).toBe(false);
    expect(report?.blockers.join('\n')).toMatch(/SOURCE_OCCURRENCES/);
    expect(report?.blockers.join('\n')).toMatch(/source_answer/);
  });

  it('returns null for a workbook that is not the legacy 709 architecture', async () => {
    const xlsx = await buildWorkbookXlsx([{ name: 'OTHER', rows: [['a'], ['b']] }]);
    await expect(preflightLegacy709MasterXlsx(toArrayBuffer(xlsx))).resolves.toBeNull();
  });
});

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}
