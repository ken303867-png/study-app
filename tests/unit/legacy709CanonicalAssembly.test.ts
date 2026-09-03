import { describe, expect, it } from 'vitest';
import {
  assembleLegacy709CanonicalMaster,
  LegacyCanonicalAssemblyError
} from '../../src/adapters/legacy709CanonicalAssembly';
import {
  reconstructLegacy709SourceLineage,
  type LegacyLineageSourceDefinition,
  type LegacySourceLocatorIndex
} from '../../src/adapters/legacy709LineageReconstruction';
import { convertMasterToDelivery } from '../../src/converters/masterToDelivery';
import { buildWorkbookXlsx, type WorkbookCell } from '../helpers/buildCanonicalMasterXlsx';

const finalHeaders = [
  '学習ID',
  '統合ID',
  '元ID',
  '区分',
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

const baselineHeaders = [
  '統合ID',
  '元ID',
  '区分',
  '元問題No./予想No.',
  '17科目',
  '大分野',
  '中心論点',
  '問題文',
  '選択肢A',
  '選択肢B',
  '選択肢C',
  '選択肢D',
  '正答_A-E',
  '全体解説/元資料解説',
  '根拠資料'
];

const sourceDefinitions: LegacyLineageSourceDefinition[] = [
  {
    legacyGroup: '既存520',
    requirePageLocator: true,
    source: {
      source_id: 'FIX-EXISTING',
      source_group: '日本看護協会 eラーニング fixture',
      title: '非正式既存問題source fixture',
      answer_authority: 'provided'
    }
  },
  {
    legacyGroup: '予想200',
    requirePageLocator: false,
    source: {
      source_id: 'FIX-PREDICTED',
      source_group: '予想問題 fixture',
      title: '非正式予想問題source fixture',
      answer_authority: 'audited'
    }
  }
];

const locatorIndex: LegacySourceLocatorIndex = {
  version: '1.0',
  entries: [1, 2, 3].map((number) => ({
    source_question_id: `FIX-SRC-00${number}`,
    source_question_no: number,
    question_page: number,
    answer_page: number + 10
  }))
};

describe('legacy709CanonicalAssembly', () => {
  it('assembles a Formal v1.1 Canonical Master and Delivery from legacy explanation patterns', async () => {
    const finalWorkbook = await buildFinalWorkbook();
    const baselineWorkbook = await buildBaselineWorkbook();
    const lineage = await reconstructLegacy709SourceLineage({
      finalWorkbook: toArrayBuffer(finalWorkbook),
      baselineWorkbook: toArrayBuffer(baselineWorkbook),
      sourceDefinitions,
      locatorIndex
    });

    const result = await assembleLegacy709CanonicalMaster({
      finalWorkbook: toArrayBuffer(finalWorkbook),
      lineage,
      masterDataVersion: 'fixture-master-1',
      deliveryDatasetVersion: 'fixture-delivery-1',
      auditedAt: '2026-09-03'
    });

    expect(result.report).toMatchObject({
      questionCount: 4,
      choiceCount: 16,
      explanationCount: 4,
      choiceExplanationCount: 16,
      sourceOccurrenceCount: 4,
      finalPublicationQaPassed: true,
      sourceTraceabilityReady: true,
      issues: []
    });
    expect(result.report.complementRepairQuestionIds).toEqual(['FIX-Q-003']);
    expect(result.report.sourceSupportedInferenceQuestionIds).toEqual(
      expect.arrayContaining(['FIX-Q-002', 'FIX-Q-003', 'FIX-Q-004'])
    );

    const direct = result.master.sheets.CHOICE_EXPLANATIONS.filter(
      (row) => row.canonical_question_id === 'FIX-Q-001'
    );
    expect(direct).toHaveLength(4);
    expect(direct.find((row) => row.choice_key === 'B')).toMatchObject({
      final_judgement: 'correct',
      correction_condition: '正答肢のため修正不要。'
    });

    const subitem = result.master.sheets.CHOICE_EXPLANATIONS.filter(
      (row) => row.canonical_question_id === 'FIX-Q-002'
    );
    expect(subitem.find((row) => row.choice_key === 'D')?.reason).toContain('c：正しい');
    expect(subitem.find((row) => row.choice_key === 'A')?.correction_condition).toContain('a：');

    const repaired = result.master.sheets.CHOICE_EXPLANATIONS.filter(
      (row) => row.canonical_question_id === 'FIX-Q-003'
    );
    expect(repaired.find((row) => row.choice_key === 'A')?.mapping_provenance).toBe(
      'source_supported_inference'
    );

    const notes = result.master.sheets.QUESTIONS[0]?.notes ?? '';
    expect(notes).toContain('legacy_compare:');
    expect(notes).toContain('legacy_pitfalls:');

    const delivery = convertMasterToDelivery(result.master);
    expect(delivery.schemaVersion).toBe('0.5');
    expect(delivery.questions).toHaveLength(4);
    expect(delivery.sourceOccurrences).toHaveLength(4);
  });

  it('stops assembly when final publication QA evidence is absent', async () => {
    const finalWorkbook = await buildFinalWorkbook(false);
    const baselineWorkbook = await buildBaselineWorkbook();
    const lineage = await reconstructLegacy709SourceLineage({
      finalWorkbook: toArrayBuffer(finalWorkbook),
      baselineWorkbook: toArrayBuffer(baselineWorkbook),
      sourceDefinitions,
      locatorIndex
    });

    let caught: unknown;
    try {
      await assembleLegacy709CanonicalMaster({
        finalWorkbook: toArrayBuffer(finalWorkbook),
        lineage,
        masterDataVersion: 'fixture-master-1',
        deliveryDatasetVersion: 'fixture-delivery-1'
      });
    } catch (error: unknown) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(LegacyCanonicalAssemblyError);
    if (!(caught instanceof LegacyCanonicalAssemblyError)) {
      throw new Error('LegacyCanonicalAssemblyErrorが送出されませんでした。');
    }
    expect(caught.issues.some((issue) => /final publication QA|最終出版QA/i.test(issue))).toBe(true);
  });
});

async function buildFinalWorkbook(includeQa = true) {
  const sheets: Array<{ name: string; rows: WorkbookCell[][] }> = [
    {
      name: '統合709_学習マスター',
      rows: [
        finalHeaders,
        finalRow({
          id: 'FIX-Q-001',
          integrated: 'FIX-INT-001',
          source: 'FIX-SRC-001',
          group: '既存520',
          prompt: '正しいものを1つ選べ。',
          answer: 'B',
          choices: ['誤りA', '正しいB', '誤りC', '誤りD'],
          choiceExplanation: 'A：誤り。理由A。\nB：正しい。理由B。\nC：誤り。理由C。\nD：誤り。理由D。',
          correction: 'A：Aを直せば正しい。\nC：Cを直せば正しい。\nD：Dを直せば正しい。',
          raw: '２が正解です。原資料解説。'
        }),
        finalRow({
          id: 'FIX-Q-002',
          integrated: 'FIX-INT-002',
          source: 'FIX-SRC-002',
          group: '既存520',
          prompt: '正しい組み合わせはどれか。aとb等から選べ。',
          answer: 'D',
          choices: ['aとb', 'aとc', 'bとd', 'cとd'],
          choiceExplanation: 'a：誤り。a理由。\nb：誤り。b理由。\nc：正しい。\nd：正しい。',
          correction: 'aは「a修正」なら正しい。bは「b修正」なら正しい。',
          raw: '４が正解です。原資料解説。'
        }),
        finalRow({
          id: 'FIX-Q-003',
          integrated: 'FIX-INT-003',
          source: 'FIX-SRC-003',
          group: '既存520',
          prompt: '最も適切なものを1つ選べ。',
          answer: 'D',
          choices: ['不適切A', '不適切B', '不適切C', '適切D'],
          choiceExplanation: 'D：正しい。\nB〜A：誤り。患者安全を優先する。',
          correction: 'B〜A：患者安全を優先するなら正しい。',
          raw: '４が正解です。原資料解説。'
        }),
        finalRow({
          id: 'FIX-Q-004',
          integrated: 'FIX-INT-004',
          source: 'FIX-PRED-001',
          group: '予想200',
          prompt: '正しい組み合わせはどれか。a〜dから選べ。',
          answer: 'D',
          choices: ['aとb', 'cとd', 'bとcとd', 'すべて'],
          choiceExplanation: 'A〜Dの小項目はいずれも正しいためDが正答である。',
          correction: 'a〜dはいずれも正しい。',
          raw: '予想問題解説。'
        })
      ]
    }
  ];
  if (includeQa) {
    sheets.push({
      name: '709最終出版QA_v1.47',
      rows: [
        ['監査項目', '結果', '判定'],
        ['完全重複', '0件', '合格'],
        ['現行性監査未完了', '0件', '合格'],
        ['総合判定', '最終出版QA合格', '合格']
      ]
    });
  }
  return buildWorkbookXlsx(sheets);
}

async function buildBaselineWorkbook() {
  return buildWorkbookXlsx([
    {
      name: '統合720_IDマスター',
      rows: [
        baselineHeaders,
        baselineRow('FIX-INT-001', 'FIX-SRC-001', '既存520', 1, '２が正解です。原資料解説。'),
        baselineRow('FIX-INT-002', 'FIX-SRC-002', '既存520', 2, '４が正解です。原資料解説。'),
        baselineRow('FIX-INT-003', 'FIX-SRC-003', '既存520', 3, '４が正解です。原資料解説。'),
        baselineRow('FIX-INT-004', 'FIX-PRED-001', '予想200', 1, '予想問題解説。')
      ]
    }
  ]);
}

function finalRow(input: {
  id: string;
  integrated: string;
  source: string;
  group: '既存520' | '予想200';
  prompt: string;
  choices: [string, string, string, string];
  answer: string;
  choiceExplanation: string;
  correction: string;
  raw: string;
}): WorkbookCell[] {
  return [
    input.id,
    input.integrated,
    input.source,
    input.group,
    1,
    '非正式科目',
    '非正式分野',
    `非正式論点-${input.id}`,
    'S',
    '応用',
    '評価・判定',
    input.prompt,
    ...input.choices,
    input.answer,
    `全体解説-${input.id}`,
    input.choiceExplanation,
    `周辺知識-${input.id}`,
    `問われていること-${input.id}`,
    `考え方-${input.id}`,
    `比較-${input.id}`,
    `間違いやすい-${input.id}`,
    input.correction,
    `要点-${input.id}`,
    `一言-${input.id}`,
    '非正式根拠fixture',
    input.raw,
    '現行性確認済fixture',
    '正式仕様標準化済fixture',
    'QA完了fixture'
  ];
}

function baselineRow(
  integrated: string,
  source: string,
  group: '既存520' | '予想200',
  sourceNo: number,
  raw: string
): WorkbookCell[] {
  const isPredicted = group === '予想200';
  return [
    integrated,
    source,
    group,
    sourceNo,
    '非正式科目',
    '非正式分野',
    `非正式論点-${integrated.replace('FIX-INT-', 'FIX-Q-')}`,
    `原問題-${source}`,
    '原A',
    '原B',
    '原C',
    '原D',
    isPredicted ? 'D' : raw.startsWith('２') ? 'B' : 'D',
    raw,
    '非正式source fixture'
  ];
}

function toArrayBuffer(bytes: Uint8Array) {
  return new Uint8Array(bytes).buffer;
}
