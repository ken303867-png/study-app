import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/canonical-master-sample.json';
import { parseCanonicalMasterXlsx } from '../../src/adapters/xlsxMasterAdapter';
import { canonicalMasterExportSchema } from '../../src/schemas/masterDataSchemas';
import { buildCanonicalMasterXlsx } from '../helpers/buildCanonicalMasterXlsx';

describe('xlsxMasterAdapter', () => {
  it('parses a deflated .xlsx master into the canonical master schema', async () => {
    const master = canonicalMasterExportSchema.parse(fixture);
    const xlsx = await buildCanonicalMasterXlsx(master);
    const parsed = await parseCanonicalMasterXlsx(
      xlsx.buffer.slice(xlsx.byteOffset, xlsx.byteOffset + xlsx.byteLength),
      'pilot-master.xlsx'
    );

    expect(parsed.masterDataVersion).toBe('fixture-master-0.1');
    expect(parsed.deliveryDatasetVersion).toBe('fixture-delivery-0.1');
    expect(parsed.sheets.QUESTIONS).toHaveLength(2);
    expect(parsed.sheets.QUESTIONS[0]?.tags).toEqual(['fixture']);
    expect(parsed.sheets.CHOICES[1]?.is_final_correct).toBe(true);
    expect(parsed.sheets.SOURCE_OCCURRENCES[0]?.source_question_no).toBe(1);
    expect(parsed.sheets.QA_LEDGER[0]?.final_qa).toBe('pass');
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
    const parsed = await parseCanonicalMasterXlsx(
      xlsx.buffer.slice(xlsx.byteOffset, xlsx.byteOffset + xlsx.byteLength)
    );

    expect(parsed.sheets.RELATIONS).toHaveLength(1);
    expect(parsed.sheets.RELATIONS[0]?.relation_type).toBe('similar');
  });

  it('rejects a non-xlsx buffer', async () => {
    const buffer = new TextEncoder().encode('not an xlsx').buffer;
    await expect(parseCanonicalMasterXlsx(buffer, 'broken.xlsx')).rejects.toThrow(/xlsx|ZIP/i);
  });
});
