import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/canonical-master-sample.json';
import { parseCanonicalMasterXlsx } from '../../src/adapters/xlsxMasterAdapter';
import {
  canonicalMasterExportSchema,
  type CanonicalMasterExport
} from '../../src/schemas/masterDataSchemas';
import { buildCanonicalMasterXlsx } from '../helpers/buildCanonicalMasterXlsx';

describe('xlsxMasterAdapter', () => {
  it('parses a deflated .xlsx master into the canonical master schema', async () => {
    const master = canonicalMasterExportSchema.parse(fixture);
    const xlsx = await buildCanonicalMasterXlsx(master);
    const parsed = await parseCanonicalMasterXlsx(toArrayBuffer(xlsx), 'pilot-master.xlsx');

    expect(parsed.masterDataVersion).toBe('fixture-master-0.1');
    expect(parsed.deliveryDatasetVersion).toBe('fixture-delivery-0.1');
    expect(parsed.sheets.QUESTIONS).toHaveLength(2);
    expect(parsed.sheets.QUESTIONS[0]?.tags).toEqual(['fixture']);
    expect(parsed.sheets.CHOICES[1]?.is_final_correct).toBe(true);
    expect(parsed.sheets.SOURCE_OCCURRENCES[0]?.source_question_no).toBe('1');
    expect(parsed.sheets.QA_LEDGER[0]?.final_qa).toBe('pass');
    expect(parsed.sheets.MATERIALS).toEqual([]);
  });

  it('parses Formal 1.2 MATERIALS and nested table_rows from xlsx', async () => {
    const master = materialMaster();
    const xlsx = await buildCanonicalMasterXlsx(master);
    const parsed = await parseCanonicalMasterXlsx(toArrayBuffer(xlsx), 'material-master.xlsx');

    expect(parsed.formalDataSpecVersion).toBe('1.2');
    expect(parsed.sheets.MATERIALS[0]?.related_question_ids).toEqual(['FIX-Q-001']);
    expect(parsed.sheets.MATERIAL_BLOCKS).toHaveLength(2);
    expect(parsed.sheets.MATERIAL_BLOCKS[1]?.table_rows).toEqual([
      ['項目', '値'],
      ['Schema', '1.2']
    ]);
  });

  it('preserves RELATIONS in the canonical layer even though Delivery does not consume them', async () => {
    const master = canonicalMasterExportSchema.parse({
      ...fixture,
      sheets: {
        ...fixture.sheets,
        RELATIONS: [
          {
            question_id: 'FIX-Q-001',
            related_question_id: 'FIX-Q-EXCLUDED',
            relation_type: 'similar',
            duplicate_class: 'same_topic_distinct',
            rationale: 'Canonical Master保持確認用の非正式relation。'
          }
        ]
      }
    });
    const xlsx = await buildCanonicalMasterXlsx(master);
    const parsed = await parseCanonicalMasterXlsx(toArrayBuffer(xlsx));

    expect(parsed.sheets.RELATIONS).toHaveLength(1);
    expect(parsed.sheets.RELATIONS[0]?.relation_type).toBe('similar');
  });

  it('rejects a non-xlsx buffer', async () => {
    const buffer = new Uint8Array(new TextEncoder().encode('not an xlsx')).buffer;
    await expect(parseCanonicalMasterXlsx(buffer, 'broken.xlsx')).rejects.toThrow(/xlsx|ZIP/i);
  });
});

function materialMaster(): CanonicalMasterExport {
  const base = canonicalMasterExportSchema.parse(fixture);
  return canonicalMasterExportSchema.parse({
    ...base,
    formalDataSpecVersion: '1.2',
    sheets: {
      ...base.sheets,
      QUESTIONS: base.sheets.QUESTIONS.map((question) =>
        question.canonical_question_id === 'FIX-Q-001'
          ? { ...question, related_material_ids: ['FIX-MAT-XLSX'] }
          : question
      ),
      MATERIALS: [
        {
          material_id: 'FIX-MAT-XLSX',
          subject: 'サンプル科目',
          unit: 'Material',
          title: 'XLSX Material',
          importance: 'S',
          revision: 1,
          related_question_ids: ['FIX-Q-001'],
          tags: ['fixture', 'xlsx']
        }
      ],
      MATERIAL_BLOCKS: [
        {
          block_id: 'FIX-MAT-XLSX-01',
          material_id: 'FIX-MAT-XLSX',
          section_key: 'intro',
          section_order: 1,
          section_heading: '概要',
          block_order: 1,
          block_type: 'paragraph',
          text: 'Material XLSX parser test'
        },
        {
          block_id: 'FIX-MAT-XLSX-02',
          material_id: 'FIX-MAT-XLSX',
          section_key: 'table',
          section_order: 2,
          section_heading: '表',
          block_order: 1,
          block_type: 'table',
          table_rows: [
            ['項目', '値'],
            ['Schema', '1.2']
          ]
        }
      ]
    }
  });
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}
