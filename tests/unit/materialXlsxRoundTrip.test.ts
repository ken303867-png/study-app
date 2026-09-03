import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/canonical-master-sample.json';
import { parseCanonicalMasterXlsx } from '../../src/adapters/xlsxMasterAdapter';
import { convertMasterToDelivery } from '../../src/converters/masterToDelivery';
import { integratePhase3Materials } from '../../src/migrations/phase3MaterialMasterIntegration';
import { canonicalMasterExportSchema } from '../../src/schemas/masterDataSchemas';
import { parseMaterialBody } from '../../src/utils/materialBodyParser';
import { buildCanonicalMasterXlsx } from '../helpers/buildCanonicalMasterXlsx';

describe('Formal 1.2 material xlsx round trip', () => {
  it('preserves a table through Phase3 → XLSX → Canonical → Delivery → UI parser', async () => {
    const base = canonicalMasterExportSchema.parse(fixture);
    const integrated = integratePhase3Materials(base, phase3Fixture, {
      masterDataVersion: 'fixture-roundtrip-master',
      deliveryDatasetVersion: 'fixture-roundtrip-delivery'
    });
    const xlsx = await buildCanonicalMasterXlsx(integrated.master);
    const reparsed = await parseCanonicalMasterXlsx(new Uint8Array(xlsx).buffer, 'roundtrip.xlsx');
    const delivery = convertMasterToDelivery(reparsed);
    const body = delivery.materials[0]?.body ?? '';
    const sections = parseMaterialBody(body);

    expect(reparsed.sheets.MATERIAL_BLOCKS[1]?.table_rows).toEqual([
      ['項目', '正式内容'],
      ['Delivery Schema', '0.5'],
      ['Formal Data Spec', '1.2']
    ]);
    expect(body).toContain('項目 | 正式内容');
    expect(sections[1]?.chunks).toEqual([
      {
        type: 'table',
        rows: [
          ['項目', '正式内容'],
          ['Delivery Schema', '0.5'],
          ['Formal Data Spec', '1.2']
        ]
      }
    ]);
  });
});

const phase3Fixture = {
  schemaVersion: '1.0',
  subjectCount: 1,
  unitCount: 1,
  subjects: [
    {
      subjectId: '01',
      subjectOrder: 1,
      subject: 'サンプル科目',
      source: {
        fileName: 'roundtrip.docx',
        fileSha256: 'nonformal-roundtrip-sha',
        format: 'docx',
        role: '非正式roundtrip fixture'
      },
      unitCount: 1,
      units: [
        {
          unitId: 'SCORE-ROUNDTRIP-01',
          unitNumber: 1,
          subjectId: '01',
          subject: 'サンプル科目',
          title: 'Material round trip',
          importance: 'S',
          sourceHeading: 'Material round trip S',
          sourceRelatedProblemRaw: 'FIX-Q-001',
          relatedOfficialProblemIds: ['FIX-Q-001'],
          sections: [
            {
              key: 'firstToLearn',
              heading: '① 最初に覚えること',
              blocks: [{ type: 'paragraph', text: '正本を先に確定する。' }]
            },
            {
              key: 'comparison',
              heading: '② 比較表',
              blocks: [
                {
                  type: 'table',
                  rows: [
                    ['項目', '正式内容'],
                    ['Delivery Schema', '0.5'],
                    ['Formal Data Spec', '1.2']
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};
