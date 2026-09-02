import { describe, expect, it } from 'vitest';
import { datasetSchema } from '../../src/schemas/contentSchemas';
import { sampleDataset } from '../../src/data/sampleDataset';

describe('datasetSchema', () => {
  it('accepts a valid dataset', () => {
    expect(datasetSchema.parse(sampleDataset).questions).toHaveLength(1);
  });

  it('rejects an out-of-range answer index', () => {
    const invalid = structuredClone(sampleDataset);
    const first = invalid.questions[0];
    if (first && 'correctChoiceIndexes' in first) first.correctChoiceIndexes = [99];
    expect(() => datasetSchema.parse(invalid)).toThrow();
  });

  it('rejects broken question to material references', () => {
    const invalid = structuredClone(sampleDataset);
    const first = invalid.questions[0];
    if (first) first.relatedMaterialIds = ['MISSING-MATERIAL'];
    expect(() => datasetSchema.parse(invalid)).toThrow();
  });
});
