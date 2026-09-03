import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/canonical-master-sample.json';
import { convertMasterToDelivery } from '../../src/converters/masterToDelivery';
import {
  integratePhase3Materials,
  Phase3MaterialIntegrationError
} from '../../src/migrations/phase3MaterialMasterIntegration';
import { canonicalMasterExportSchema } from '../../src/schemas/masterDataSchemas';

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
        fileName: '01_fixture.docx',
        fileSha256: 'fixture-sha',
        format: 'docx',
        role: '非正式QA fixture'
      },
      unitCount: 1,
      units: [
        {
          unitId: 'SCORE-01-01',
          unitNumber: 1,
          subjectId: '01',
          subject: 'サンプル科目',
          title: 'データ管理',
          importance: 'S',
          sourceHeading: '単元 01 データ管理 S',
          sourceRelatedProblemRaw: 'FIX-Q-001',
          relatedOfficialProblemIds: ['FIX-Q-001'],
          sections: [
            {
              key: 'firstToLearn',
              heading: '① 最初に覚えること',
              blocks: [
                { type: 'paragraph', text: '正本を先に確定する。' },
                {
                  type: 'table',
                  rows: [
                    ['項目', '役割'],
                    ['Master', '正本']
                  ]
                }
              ]
            }
          ],
          relatedQuestionIds: ['COM240-001', 'PRED-IGNORED-001']
        }
      ]
    }
  ]
};

describe('Phase3 114-unit Material Master integration', () => {
  it('uses only relatedOfficialProblemIds and builds Formal 1.2 bidirectional links', () => {
    const base = canonicalMasterExportSchema.parse(fixture);
    const result = integratePhase3Materials(base, phase3Fixture, {
      masterDataVersion: 'fixture-material-master-1.0',
      deliveryDatasetVersion: 'fixture-material-delivery-1.0'
    });

    expect(result.master.formalDataSpecVersion).toBe('1.2');
    expect(result.master.sheets.MATERIALS).toHaveLength(1);
    expect(result.master.sheets.MATERIAL_BLOCKS).toHaveLength(2);
    expect(result.master.sheets.MATERIALS[0]?.related_question_ids).toEqual(['FIX-Q-001']);
    expect(result.master.sheets.QUESTIONS[0]?.related_material_ids).toEqual(['SCORE-01-01']);
    expect(result.audit).toMatchObject({
      subjectCount: 1,
      materialCount: 1,
      materialBlockCount: 2,
      linkCount: 1,
      linkedQuestionCount: 1,
      unlinkedAdoptedQuestionCount: 0,
      ignoredPhase3AuxiliaryQuestionLinks: true
    });

    const delivery = convertMasterToDelivery(result.master);
    expect(delivery.materials[0]?.relatedQuestionIds).toEqual(['FIX-Q-001']);
    expect(delivery.questions[0]?.relatedMaterialIds).toEqual(['SCORE-01-01']);
  });

  it('blocks official material links that do not resolve to adopted canonical questions', () => {
    const invalid = structuredClone(phase3Fixture);
    invalid.subjects[0]!.units[0]!.relatedOfficialProblemIds = ['UNKNOWN-Q'];
    const base = canonicalMasterExportSchema.parse(fixture);

    expect(() =>
      integratePhase3Materials(base, invalid, {
        masterDataVersion: 'fixture-material-master-1.0',
        deliveryDatasetVersion: 'fixture-material-delivery-1.0'
      })
    ).toThrow(Phase3MaterialIntegrationError);
  });
});
