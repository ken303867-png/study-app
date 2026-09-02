import { beforeEach, describe, expect, it } from 'vitest';
import fixture from '../fixtures/canonical-master-sample.json';
import { sampleDataset } from '../../src/data/sampleDataset';
import { db } from '../../src/db/database';
import { contentRepository } from '../../src/repositories/contentRepository';
import { canonicalMasterExportSchema } from '../../src/schemas/masterDataSchemas';
import {
  DatasetImportError,
  importDatasetFile,
  importDatasetJsonText
} from '../../src/services/datasetImportService';
import { buildCanonicalMasterXlsx } from '../helpers/buildCanonicalMasterXlsx';

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
    expect(result.sourceFormat).toBe('json');
    expect(result.schemaVersion).toBe('0.5');
    expect(result.questionCount).toBe(1);
    expect(questions.map((question) => question.id)).toEqual(['FIX-Q-001']);
  });

  it('imports an already-converted delivery schema 0.5 JSON', async () => {
    const result = await importDatasetJsonText(JSON.stringify(sampleDataset));

    expect(result.kind).toBe('delivery');
    expect(result.sourceFormat).toBe('json');
    expect(result.questionCount).toBe(1);
    expect((await db.meta.get('schemaVersion'))?.value).toBe('0.5');
  });

  it('imports a canonical master .xlsx through the same atomic pipeline', async () => {
    const master = canonicalMasterExportSchema.parse(fixture);
    const bytes = await buildCanonicalMasterXlsx(master);
    const file = fileLike('pilot-master.xlsx', bytes);

    const result = await importDatasetFile(file);

    expect(result.kind).toBe('canonical-master');
    expect(result.sourceFormat).toBe('xlsx');
    expect(result.questionCount).toBe(1);
    expect((await contentRepository.getQuestions())[0]?.id).toBe('FIX-Q-001');
    expect((await db.meta.get('datasetVersion'))?.value).toBe('fixture-delivery-0.1');
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

  it('does not overwrite the current dataset when xlsx parsing fails', async () => {
    await contentRepository.replaceDataset(sampleDataset);
    const file = fileLike('broken.xlsx', new TextEncoder().encode('broken'));

    await expect(importDatasetFile(file)).rejects.toBeInstanceOf(DatasetImportError);

    expect((await contentRepository.getQuestions())[0]?.id).toBe('SAMPLE-Q-001');
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

function fileLike(name: string, bytes: Uint8Array): File {
  const copy = new Uint8Array(bytes);
  return {
    name,
    type: name.endsWith('.xlsx')
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/octet-stream',
    arrayBuffer: async () => copy.buffer,
    text: async () => new TextDecoder().decode(copy)
  } as File;
}
