import { describe, expect, it } from 'vitest';
import {
  parseExplicitSourceAnswer,
  reconstructLegacy709SourceLineage,
  type LegacyLineageSourceDefinition,
  type LegacySourceLocatorIndex
} from '../../src/adapters/legacy709LineageReconstruction';
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
  '問題文',
  '選択肢A',
  '選択肢B',
  '選択肢C',
  '選択肢D',
  '正答',
  '根拠資料',
  '元資料解説_原文保持',
  '現行性/品質注意'
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
      source_group: 'fixture-existing',
      title: '非正式既存問題source fixture',
      answer_authority: 'provided'
    }
  },
  {
    legacyGroup: '予想200',
    requirePageLocator: false,
    source: {
      source_id: 'FIX-PREDICTED',
      source_group: 'fixture-predicted',
      title: '非正式予想問題source fixture',
      answer_authority: 'audited'
    }
  }
];

const locatorIndex: LegacySourceLocatorIndex = {
  version: '1.0',
  entries: [
    {
      source_question_id: 'FIX-SRC-001',
      source_question_no: 1,
      question_page: 1,
      answer_page: 2
    },
    {
      source_question_id: 'FIX-SRC-002',
      source_question_no: 2,
      question_page: 3,
      answer_page: 4,
      source_answer: 'C',
      verification_note: '原資料再照合済みfixture'
    }
  ]
};

describe('legacy709LineageReconstruction', () => {
  it('separates source snapshots from final canonical revisions without guessing', async () => {
    const finalWorkbook = await buildFinalWorkbook();
    const baselineWorkbook = await buildBaselineWorkbook();

    const result = await reconstructLegacy709SourceLineage({
      finalWorkbook: toArrayBuffer(finalWorkbook),
      baselineWorkbook: toArrayBuffer(baselineWorkbook),
      sourceDefinitions,
      locatorIndex
    });

    expect(result.report).toMatchObject({
      finalQuestionCount: 3,
      baselineQuestionCount: 4,
      matchedQuestionCount: 3,
      existingQuestionCount: 2,
      predictedQuestionCount: 1,
      answerDiscrepancyCount: 1,
      sourceAnswerFromExplanationCount: 1,
      sourceAnswerFromLocatorCount: 1,
      sourceAnswerFromAuditedPredictionCount: 1,
      pageLocatorRequiredCount: 2,
      pageLocatorCompleteCount: 2,
      sourceTraceabilityReady: true,
      issues: []
    });
    expect(result.report.excludedBaselineQuestionIds).toEqual(['FIX-SRC-EXCLUDED']);

    const first = result.questions[0]!;
    expect(first.sourceQuestionId).toBe('FIX-SRC-001');
    expect(first.sourceAnswer).toBe('D');
    expect(first.finalAnswer).toBe('B');
    expect(first.answerDiscrepancy).toBe('reviewed-different');
    expect(first.answerSource).toBe('source-explanation');
    expect(first.sourcePrompt).toBe('原問題文1');
    expect(first.canonicalPrompt).toBe('最終問題文1');
    expect(first.sourcePromptChanged).toBe(true);
    expect(first.sourceChoicesChanged).toBe(true);
    expect(first.sourceQuestionPage).toBe(1);
    expect(first.sourceAnswerPage).toBe(2);
    expect(first.sourceLocation).toBe('問題PDF p.1 / 解答PDF p.2');
    expect(first.choices.find((choice) => choice.key === 'D')).toMatchObject({
      isSourceCorrect: true,
      isFinalCorrect: false
    });
    expect(first.choices.find((choice) => choice.key === 'B')).toMatchObject({
      isSourceCorrect: false,
      isFinalCorrect: true
    });

    const second = result.questions[1]!;
    expect(second.sourceAnswer).toBe('C');
    expect(second.answerSource).toBe('locator-override');
    expect(second.sourceVerificationNote).toContain('再照合');

    const predicted = result.questions[2]!;
    expect(predicted.sourceQuestionId).toBe('FIX-PRED-001');
    expect(predicted.answerSource).toBe('audited-prediction');
    expect(predicted.sourceLocation).toBe('統合720_IDマスター / FIX-PRED-001');
  });

  it('does not promote traceability when a required original-PDF locator is missing', async () => {
    const finalWorkbook = await buildFinalWorkbook();
    const baselineWorkbook = await buildBaselineWorkbook();
    const incompleteLocator: LegacySourceLocatorIndex = {
      version: '1.0',
      entries: [locatorIndex.entries[0]!]
    };

    const result = await reconstructLegacy709SourceLineage({
      finalWorkbook: toArrayBuffer(finalWorkbook),
      baselineWorkbook: toArrayBuffer(baselineWorkbook),
      sourceDefinitions,
      locatorIndex: incompleteLocator
    });

    expect(result.report.sourceTraceabilityReady).toBe(false);
    expect(result.report.pageLocatorRequiredCount).toBe(2);
    expect(result.report.pageLocatorCompleteCount).toBe(1);
    expect(result.report.issues).toEqual(
      expect.arrayContaining([expect.stringMatching(/FIX-SRC-002.*page locator/)])
    );
  });

  it('parses only explicit source-answer declarations at the start of the raw explanation', () => {
    expect(parseExplicitSourceAnswer('４が正解です。解説本文')).toBe('D');
    expect(parseExplicitSourceAnswer('④が正解。解説本文')).toBe('D');
    expect(parseExplicitSourceAnswer('【監査注】 2 が正解です。')).toBe('B');
    expect(parseExplicitSourceAnswer('本文中で4が正解と述べる')).toBeNull();
    expect(parseExplicitSourceAnswer('【元資料解説欠落】確認が必要')).toBeNull();
  });
});

async function buildFinalWorkbook() {
  return buildWorkbookXlsx([
    {
      name: '統合709_学習マスター',
      rows: [
        finalHeaders,
        finalRow({
          learnId: 'FIX-Q-001',
          integratedId: 'FIX-INT-001',
          sourceId: 'FIX-SRC-001',
          group: '既存520',
          prompt: '最終問題文1',
          choices: ['最終A1', '最終B1', '最終C1', '最終D1'],
          answer: 'B',
          rawExplanation: '４が正解です。原資料の説明。'
        }),
        finalRow({
          learnId: 'FIX-Q-002',
          integratedId: 'FIX-INT-002',
          sourceId: 'FIX-SRC-002',
          group: '既存520',
          prompt: '問題文2',
          choices: ['A2', 'B2', 'C2', 'D2'],
          answer: 'C',
          rawExplanation: '【元資料解説欠落】再照合対象'
        }),
        finalRow({
          learnId: 'FIX-Q-003',
          integratedId: 'FIX-INT-003',
          sourceId: 'FIX-PRED-001',
          group: '予想200',
          prompt: '予想問題文・最終',
          choices: ['PA', 'PB', 'PC', 'PD'],
          answer: 'A',
          rawExplanation: '予想問題の解説'
        })
      ]
    }
  ]);
}

async function buildBaselineWorkbook() {
  return buildWorkbookXlsx([
    {
      name: '統合720_IDマスター',
      rows: [
        baselineHeaders,
        baselineRow({
          integratedId: 'FIX-INT-001',
          sourceId: 'FIX-SRC-001',
          group: '既存520',
          sourceNo: 1,
          prompt: '原問題文1',
          choices: ['原A1', '原B1', '原C1', '原D1'],
          structuredAnswer: 'A',
          rawExplanation: '４が正解です。原資料の説明。'
        }),
        baselineRow({
          integratedId: 'FIX-INT-002',
          sourceId: 'FIX-SRC-002',
          group: '既存520',
          sourceNo: 2,
          prompt: '問題文2',
          choices: ['A2', 'B2', 'C2', 'D2'],
          structuredAnswer: 'D',
          rawExplanation: '【元資料解説欠落】再照合対象'
        }),
        baselineRow({
          integratedId: 'FIX-INT-003',
          sourceId: 'FIX-PRED-001',
          group: '予想200',
          sourceNo: 1,
          prompt: '予想問題文・初版',
          choices: ['PA', 'PB', 'PC', 'PD'],
          structuredAnswer: 'A',
          rawExplanation: '予想問題の解説'
        }),
        baselineRow({
          integratedId: 'FIX-INT-X',
          sourceId: 'FIX-SRC-EXCLUDED',
          group: '既存520',
          sourceNo: 99,
          prompt: '除外された原問題',
          choices: ['XA', 'XB', 'XC', 'XD'],
          structuredAnswer: 'A',
          rawExplanation: '１が正解です。'
        })
      ]
    }
  ]);
}

function finalRow(input: {
  learnId: string;
  integratedId: string;
  sourceId: string;
  group: '既存520' | '予想200';
  prompt: string;
  choices: [string, string, string, string];
  answer: string;
  rawExplanation: string;
}): WorkbookCell[] {
  return [
    input.learnId,
    input.integratedId,
    input.sourceId,
    input.group,
    '非正式科目',
    '非正式大分野',
    '非正式論点',
    'S',
    input.prompt,
    ...input.choices,
    input.answer,
    '非正式根拠fixture',
    input.rawExplanation,
    '非正式currentness note'
  ];
}

function baselineRow(input: {
  integratedId: string;
  sourceId: string;
  group: '既存520' | '予想200';
  sourceNo: number;
  prompt: string;
  choices: [string, string, string, string];
  structuredAnswer: string;
  rawExplanation: string;
}): WorkbookCell[] {
  return [
    input.integratedId,
    input.sourceId,
    input.group,
    input.sourceNo,
    '非正式科目',
    '非正式大分野',
    '非正式論点',
    input.prompt,
    ...input.choices,
    input.structuredAnswer,
    input.rawExplanation,
    '非正式source fixture'
  ];
}

function toArrayBuffer(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes);
  return copy.buffer;
}
