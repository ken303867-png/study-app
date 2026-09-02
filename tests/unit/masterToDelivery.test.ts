import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/canonical-master-sample.json';
import {
  convertMasterToDelivery,
  MasterConversionError
} from '../../src/converters/masterToDelivery';
import { canonicalMasterExportSchema } from '../../src/schemas/masterDataSchemas';

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
