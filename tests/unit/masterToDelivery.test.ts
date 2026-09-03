import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/canonical-master-sample.json';
import {
  convertMasterToDelivery,
  MasterConversionError
} from '../../src/converters/masterToDelivery';
import {
  canonicalMasterExportSchema,
  type CanonicalMasterExport
} from '../../src/schemas/masterDataSchemas';

describe('Canonical Master → Delivery conversion', () => {
  it('converts only adopted and final-QA-passed questions', () => {
    const master = canonicalMasterExportSchema.parse(fixture);
    const delivery = convertMasterToDelivery(master);

    expect(delivery.schemaVersion).toBe('0.5');
    expect(delivery.datasetVersion).toBe('fixture-delivery-0.1');
    expect(delivery.questions).toHaveLength(1);
    expect(delivery.questions[0]?.id).toBe('FIX-Q-001');
    expect(delivery.questions.some((question) => question.id === 'FIX-Q-EXCLUDED')).toBe(false);
  });

  it('maps S-QUE source groups without collapsing them into another source type', () => {
    const master = canonicalMasterExportSchema.parse(fixture);
    const delivery = convertMasterToDelivery(master);

    expect(delivery.questions[0]?.sourceType).toBe('s-que');
    expect(delivery.sources[0]?.source_group).toBe('S-QUE');
  });

  it('converts Formal 1.2 materials and preserves paragraph/table block order', () => {
    const delivery = convertMasterToDelivery(materialMaster());

    expect(delivery.materials).toHaveLength(1);
    expect(delivery.materials[0]).toMatchObject({
      id: 'FIX-MAT-001',
      relatedQuestionIds: ['FIX-Q-001']
    });
    expect(delivery.materials[0]?.body).toContain('① 最初に覚えること\nMasterとDeliveryを分離する。');
    expect(delivery.materials[0]?.body).toContain('項目 | 内容\n正本 | Canonical Master');
    expect(delivery.questions[0]?.relatedMaterialIds).toEqual(['FIX-MAT-001']);
  });

  it('blocks asymmetric question-to-material links', () => {
    const invalid = materialMaster();
    invalid.sheets.QUESTIONS[0]!.related_material_ids = [];

    expect(() => convertMasterToDelivery(invalid)).toThrow(MasterConversionError);
    expect(() => convertMasterToDelivery(invalid)).toThrow(/双方向リンクが一致しません/);
  });

  it('blocks a material that references a non-adopted or missing question', () => {
    const invalid = materialMaster();
    invalid.sheets.MATERIALS[0]!.related_question_ids = ['FIX-Q-UNKNOWN'];

    expect(() => convertMasterToDelivery(invalid)).toThrow(/adopted問題に存在しない正式問題ID/);
  });

  it('blocks an adopted question whose final QA is not pass', () => {
    const invalid = structuredClone(fixture);
    invalid.sheets.QA_LEDGER[0]!.final_qa = 'fail';
    const master = canonicalMasterExportSchema.parse(invalid);

    expect(() => convertMasterToDelivery(master)).toThrow(MasterConversionError);
    expect(() => convertMasterToDelivery(master)).toThrow(/final_qa=pass/);
  });

  it('blocks a mismatch between final correct choice and choice explanation judgement', () => {
    const invalid = structuredClone(fixture);
    invalid.sheets.CHOICE_EXPLANATIONS[1]!.final_judgement = 'incorrect';
    const master = canonicalMasterExportSchema.parse(invalid);

    expect(() => convertMasterToDelivery(master)).toThrow(/最終正誤と解説判定が不一致/);
  });

  it('blocks adopted questions that are missing from TAXONOMY', () => {
    const invalid = structuredClone(fixture);
    invalid.sheets.TAXONOMY = [];
    const master = canonicalMasterExportSchema.parse(invalid);

    expect(() => convertMasterToDelivery(master)).toThrow(/TAXONOMY/);
  });
});

function materialMaster(): CanonicalMasterExport {
  const master = canonicalMasterExportSchema.parse(fixture);
  return canonicalMasterExportSchema.parse({
    ...master,
    formalDataSpecVersion: '1.2',
    masterDataVersion: 'fixture-master-material-0.1',
    deliveryDatasetVersion: 'fixture-delivery-material-0.1',
    sheets: {
      ...master.sheets,
      QUESTIONS: master.sheets.QUESTIONS.map((question) =>
        question.canonical_question_id === 'FIX-Q-001'
          ? { ...question, related_material_ids: ['FIX-MAT-001'] }
          : question
      ),
      MATERIALS: [
        {
          material_id: 'FIX-MAT-001',
          subject: 'サンプル科目',
          unit: 'データ管理',
          title: '正本とDelivery',
          importance: 'S',
          revision: 1,
          source_file_name: 'fixture.docx',
          source_file_sha256: 'fixture-sha256',
          source_heading: '単元01 正本とDelivery',
          related_question_ids: ['FIX-Q-001'],
          tags: ['fixture']
        }
      ],
      MATERIAL_BLOCKS: [
        {
          block_id: 'FIX-MAT-001-01-001',
          material_id: 'FIX-MAT-001',
          section_key: 'firstToLearn',
          section_order: 1,
          section_heading: '① 最初に覚えること',
          block_order: 1,
          block_type: 'paragraph',
          text: 'MasterとDeliveryを分離する。'
        },
        {
          block_id: 'FIX-MAT-001-02-001',
          material_id: 'FIX-MAT-001',
          section_key: 'comparison',
          section_order: 2,
          section_heading: '② 比較',
          block_order: 1,
          block_type: 'table',
          table_rows: [
            ['項目', '内容'],
            ['正本', 'Canonical Master']
          ]
        }
      ]
    }
  });
}
