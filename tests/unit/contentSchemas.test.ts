import { describe, expect, it } from 'vitest';
import { sampleDataset } from '../../src/data/sampleDataset';
import { datasetSchema } from '../../src/schemas/contentSchemas';

describe('datasetSchema 0.5', () => {
  it('accepts a valid formal dataset', () => {
    const parsed = datasetSchema.parse(sampleDataset);
    expect(parsed.questions).toHaveLength(1);
    expect(parsed.sourceOccurrences).toHaveLength(1);
    expect(parsed.media).toHaveLength(1);
    expect(parsed.questions[0]?.explanation.key_points).toBeTruthy();
  });

  it('accepts formal source types added for master conversion', () => {
    const valid = structuredClone(sampleDataset);
    const first = valid.questions[0];
    if (first) first.sourceType = 's-que';
    expect(datasetSchema.parse(valid).questions[0]?.sourceType).toBe('s-que');
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

  it('rejects a source occurrence whose source is missing', () => {
    const invalid = structuredClone(sampleDataset);
    const occurrence = invalid.sourceOccurrences[0];
    if (occurrence) occurrence.source_id = 'MISSING-SOURCE';
    expect(() => datasetSchema.parse(invalid)).toThrow();
  });

  it('requires a correction condition for every choice explanation', () => {
    const invalid = structuredClone(sampleDataset);
    const first = invalid.questions[0];
    if (first) first.explanation.choice_explanations[0]!.correction_condition = '';
    expect(() => datasetSchema.parse(invalid)).toThrow();
  });

  it('requires one explanation per choice in choice questions', () => {
    const invalid = structuredClone(sampleDataset);
    const first = invalid.questions[0];
    if (first) first.explanation.choice_explanations.pop();
    expect(() => datasetSchema.parse(invalid)).toThrow();
  });

  it('rejects media placed after an empty optional explanation block', () => {
    const invalid = structuredClone(sampleDataset);
    const media = invalid.media[0];
    if (media) media.placement_after = 'laws_guidelines';
    expect(() => datasetSchema.parse(invalid)).toThrow();
  });
});
