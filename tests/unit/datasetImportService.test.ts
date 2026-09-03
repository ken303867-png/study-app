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
import {
  buildCanonicalMasterXlsx,
  buildWorkbookXlsx
} from '../helpers/buildCanonicalMasterXlsx';

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

  it('merges and replaces a supplemental cloze dataset without removing the base dataset', async () => {
    await contentRepository.replaceDataset(sampleDataset, {
      explanationTemplateVersion: '1.0',
      formalDataSpecVersion: '1.2'
    });
    const supplemental = buildSupplementalCloze('初回の正答');

    const first = await importDatasetJsonText(JSON.stringify(supplemental));
    expect(first.kind).toBe('supplemental-delivery');
    expect(first.supplementalQuestionCount).toBe(1);
    expect(first.replacedSupplementalQuestionCount).toBe(0);
    expect(first.questionCount).toBe(2);
    expect(first.formalDataSpecVersion).toBe('1.2');
    expect((await contentRepository.getQuestions()).map((question) => question.id).sort()).toEqual([
      'CLOZE-COM-01-001-01',
      'SAMPLE-Q-001'
    ]);
    expect((await db.meta.get('datasetVersion'))?.value).toBe(sampleDataset.datasetVersion);
    expect((await db.meta.get('formalDataSpecVersion'))?.value).toBe('1.2');

    const second = await importDatasetJsonText(
      JSON.stringify(buildSupplementalCloze('更新後の正答'))
    );
    const questions = await contentRepository.getQuestions();
    const cloze = questions.find((question) => question.id === 'CLOZE-COM-01-001-01');

    expect(second.replacedSupplementalQuestionCount).toBe(1);
    expect(second.questionCount).toBe(2);
    expect(second.formalDataSpecVersion).toBe('1.2');
    expect(cloze && 'acceptedAnswers' in cloze ? cloze.acceptedAnswers : []).toEqual([
      '更新後の正答'
    ]);
    expect(questions.some((question) => question.id === 'SAMPLE-Q-001')).toBe(true);
    expect((await db.meta.get('formalDataSpecVersion'))?.value).toBe('1.2');
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

  it('detects legacy 709 xlsx, reports migration blockers, and keeps current data', async () => {
    await contentRepository.replaceDataset(sampleDataset);
    const bytes = await buildWorkbookXlsx([
      {
        name: '統合709_学習マスター',
        rows: [
          ['学習ID', '問題文', '選択肢A', '選択肢B', '選択肢C', '選択肢D', '正答'],
          ['LEGACY-001', '非正式旧正本QA問題', 'A', 'B', 'C', 'D', 'B']
        ]
      }
    ]);

    let caught: unknown;
    try {
      await importDatasetFile(fileLike('legacy-v1.47.xlsx', bytes));
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(DatasetImportError);
    if (!(caught instanceof DatasetImportError)) throw new Error('DatasetImportError expected');
    expect(caught.message).toMatch(/旧v1\.47系709問Excel正本/);
    expect(caught.issues.join('\n')).toMatch(/SOURCE_OCCURRENCES/);

    expect((await contentRepository.getQuestions())[0]?.id).toBe('SAMPLE-Q-001');
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

function buildSupplementalCloze(answer: string) {
  return {
    importMode: 'supplemental-replace',
    supplementalKey: 'common-cloze',
    datasetVersion: 'common-cloze-test-v1',
    schemaVersion: '0.5',
    questions: [
      {
        id: 'CLOZE-COM-01-001-01',
        subject: '臨床病態生理学',
        unit: '共通穴抜き問題',
        topic: '穴抜き問題 001-01',
        sourceType: 'other',
        sourceLabel: '共通穴抜き問題',
        questionFormat: 'fill-blank',
        importance: 'B',
        prompt: 'テスト用の（　　　）です。',
        explanation: {
          answer,
          question_intent: '穴抜き問題',
          reasoning: '解説なし',
          choice_explanations: [],
          key_points: answer,
          references: 'unit test'
        },
        relatedMaterialIds: [],
        tags: [
          '穴抜き問題',
          'answer-only',
          'supplemental:common-cloze',
          'importance:source-unassigned'
        ],
        revision: 1,
        acceptedAnswers: [answer]
      }
    ],
    materials: [],
    sources: [
      {
        source_id: 'SRC-CLOZE-COM-TEST',
        source_group: 'supplemental:common-cloze',
        title: '共通穴抜き問題 test',
        answer_authority: 'provided'
      }
    ],
    sourceOccurrences: [
      {
        source_occurrence_id: 'OCC-CLOZE-COM-01-001-01',
        canonical_question_id: 'CLOZE-COM-01-001-01',
        source_id: 'SRC-CLOZE-COM-TEST',
        source_set_id: 'CLOZE-COM-01',
        source_set_label: '臨床病態生理学',
        source_set_order: 1,
        source_question_no: '1-1',
        source_occurrence_order: 1,
        source_location: 'unit test',
        source_answer: answer
      }
    ],
    media: []
  };
}

function fileLike(name: string, bytes: Uint8Array): File {
  const copy = new Uint8Array(bytes);
  return {
    name,
    type: name.endsWith('.xlsx')
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/octet-stream',
    arrayBuffer: () => Promise.resolve(copy.buffer),
    text: () => Promise.resolve(new TextDecoder().decode(copy))
  } as File;
}
