import { beforeEach, describe, expect, it } from 'vitest';
import fixture from '../fixtures/canonical-master-sample.json';
import { sampleDataset } from '../../src/data/sampleDataset';
import { db } from '../../src/db/database';
import { contentRepository } from '../../src/repositories/contentRepository';
import {
  DatasetImportError,
  importDatasetJsonText
} from '../../src/services/datasetImportService';

describe('datasetImportService', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all([
      db.questions.clear(),
      db.materials.clear(),
      db.sources.clear(),
      db.sourceOccurrences.clear(),
      db.media.clear(),
      db.mediaBlobs.clear(),
      db.meta.clear()
    ]);
  });

  it('imports canonical master JSON after conversion and schema validation', async () => {
    const result = await importDatasetJsonText(JSON.stringify(fixture));
    const questions = await contentRepository.getQuestions();

    expect(result.kind).toBe('canonical-master');
    expect(result.schemaVersion).toBe('0.5');
    expect(result.questionCount).toBe(1);
    expect(questions.map((question) => question.id)).toEqual(['FIX-Q-001']);
  });

  it('imports an already-converted delivery schema 0.5 JSON', async () => {
    const result = await importDatasetJsonText(JSON.stringify(sampleDataset));

    expect(result.kind).toBe('delivery');
    expect(result.questionCount).toBe(1);
    expect((await db.meta.get('schemaVersion'))?.value).toBe('0.5');
  });

  it('does not overwrite the current dataset when master conversion QA fails', async () => {
    await contentRepository.replaceDataset(sampleDataset);
    const invalid = structuredClone(fixture);
    invalid.sheets.QA_LEDGER[0]!.final_qa = 'fail';

    await expect(importDatasetJsonText(JSON.stringify(invalid))).rejects.toBeInstanceOf(
      DatasetImportError
    );

    const questions = await contentRepository.getQuestions();
    expect(questions.map((question) => question.id)).toEqual(['SAMPLE-Q-001']);
    expect((await db.meta.get('datasetVersion'))?.value).toBe(sampleDataset.datasetVersion);
  });

  it('rejects unrecognized JSON without touching storage', async () => {
    await contentRepository.replaceDataset(sampleDataset);

    await expect(importDatasetJsonText('{"hello":"world"}')).rejects.toBeInstanceOf(
      DatasetImportError
    );

    expect((await contentRepository.getQuestions())[0]?.id).toBe('SAMPLE-Q-001');
  });
});
