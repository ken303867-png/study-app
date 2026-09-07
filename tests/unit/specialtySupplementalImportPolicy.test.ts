import { beforeEach, describe, expect, it } from 'vitest';
import { sampleDataset } from '../../src/data/sampleDataset';
import { db } from '../../src/db/database';
import { contentRepository } from '../../src/repositories/contentRepository';
import { datasetSchema } from '../../src/schemas/contentSchemas';
import {
  DatasetImportError,
  importDatasetJsonText
} from '../../src/services/datasetImportService';
import { validateSpecialtySupplementalImport } from '../../src/services/specialtySupplementalImportPolicy';

describe('specialtySupplementalImportPolicy', () => {
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

  it.each([
    ['specialty-past', 'past-exam'],
    ['specialty-predicted', 'predicted'],
    ['specialty-predicted-case', 'predicted']
  ] as const)('accepts a valid %s supplemental dataset', (key, sourceType) => {
    const dataset = datasetSchema.parse(makeSpecialtyDelivery(key, sourceType));

    expect(validateSpecialtySupplementalImport(dataset, key)).toEqual([]);
  });

  it('rejects missing specialty area and conflicting common area tags', () => {
    const raw = makeSpecialtyDelivery('specialty-predicted', 'predicted');
    raw.questions[0]!.tags = [
      'supplemental:specialty-predicted',
      'learning-area:common',
      'question-kind:specialty-predicted'
    ];
    const dataset = datasetSchema.parse(raw);

    expect(validateSpecialtySupplementalImport(dataset, 'specialty-predicted')).toEqual([
      'TEST-specialty-predicted-001: tag「learning-area:specialty」が必要です。',
      'TEST-specialty-predicted-001: 専門科目データにtag「learning-area:common」は指定できません。'
    ]);
  });

  it('rejects missing, wrong, or duplicate question-kind tags', () => {
    const wrong = makeSpecialtyDelivery('specialty-predicted-case', 'predicted');
    wrong.questions[0]!.tags = [
      'supplemental:specialty-predicted-case',
      'learning-area:specialty',
      'question-kind:specialty-predicted',
      'question-kind:specialty-predicted-case'
    ];
    const dataset = datasetSchema.parse(wrong);

    expect(validateSpecialtySupplementalImport(dataset, 'specialty-predicted-case')).toEqual([
      'TEST-specialty-predicted-case-001: 問題種類tagは「question-kind:specialty-predicted-case」を1つだけ指定してください（現在: question-kind:specialty-predicted, question-kind:specialty-predicted-case）。'
    ]);
  });

  it('rejects sourceType that does not match the specialty supplemental key', () => {
    const dataset = datasetSchema.parse(
      makeSpecialtyDelivery('specialty-past', 'predicted')
    );

    expect(validateSpecialtySupplementalImport(dataset, 'specialty-past')).toEqual([
      'TEST-specialty-past-001: sourceTypeは「past-exam」である必要があります（現在: predicted）。'
    ]);
  });

  it('blocks an invalid specialty import before storage is replaced', async () => {
    await contentRepository.replaceDataset(sampleDataset, {
      explanationTemplateVersion: '1.0',
      formalDataSpecVersion: '1.2'
    });
    const invalid = makeSpecialtyDelivery('specialty-predicted', 'predicted');
    invalid.questions[0]!.tags = [
      'supplemental:specialty-predicted',
      'learning-area:specialty',
      'question-kind:specialty-predicted-case'
    ];

    let caught: unknown;
    try {
      await importDatasetJsonText(
        JSON.stringify({
          ...invalid,
          importMode: 'supplemental-replace',
          supplementalKey: 'specialty-predicted'
        })
      );
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(DatasetImportError);
    if (!(caught instanceof DatasetImportError)) throw new Error('DatasetImportError expected');
    expect(caught.message).toMatch(/専門科目追加データの分類QA/);
    expect(caught.issues.join('\n')).toMatch(/question-kind:specialty-predicted/);
    expect((await contentRepository.getQuestions()).map((question) => question.id)).toEqual([
      'SAMPLE-Q-001'
    ]);
    expect((await db.meta.get('datasetVersion'))?.value).toBe(sampleDataset.datasetVersion);
  });
});

type SpecialtyKey = 'specialty-past' | 'specialty-predicted' | 'specialty-predicted-case';

type SpecialtySourceType = 'past-exam' | 'predicted';

function makeSpecialtyDelivery(key: SpecialtyKey, sourceType: SpecialtySourceType) {
  const supplementalTag = `supplemental:${key}`;
  const questionId = `TEST-${key}-001`;
  const sourceId = `SRC-${key}-TEST`;

  return {
    datasetVersion: `qa-${key}-1.0`,
    schemaVersion: '0.5' as const,
    questions: [
      {
        id: questionId,
        subject: '専門分野：摂食・嚥下障害看護',
        unit: key === 'specialty-predicted-case' ? '状況設定・事例' : '専門知識',
        topic: `${key} import QA`,
        sourceType,
        sourceLabel: `${key} QA fixture`,
        questionFormat: 'single-choice' as const,
        importance: 'B' as const,
        prompt: '専門科目Import hard QA確認用の非正式問題です。',
        explanation: {
          answer: 'A. 選択肢A',
          question_intent: '専門科目Import hard QAを確認する。',
          reasoning: 'QA fixtureの正答indexはAである。',
          choice_explanations: [
            {
              target_key: 'A',
              display_order: 1,
              judgement: 'correct' as const,
              reason: 'QA fixtureでは選択肢Aを正答として設定している。',
              correction_condition: 'N/A',
              mapping_provenance: 'source_structured' as const
            },
            {
              target_key: 'B',
              display_order: 2,
              judgement: 'incorrect' as const,
              reason: 'QA fixtureでは選択肢Bを誤答として設定している。',
              correction_condition: '選択肢Aなら正答となる。',
              mapping_provenance: 'source_structured' as const
            },
            {
              target_key: 'C',
              display_order: 3,
              judgement: 'incorrect' as const,
              reason: 'QA fixtureでは選択肢Cを誤答として設定している。',
              correction_condition: '選択肢Aなら正答となる。',
              mapping_provenance: 'source_structured' as const
            },
            {
              target_key: 'D',
              display_order: 4,
              judgement: 'incorrect' as const,
              reason: 'QA fixtureでは選択肢Dを誤答として設定している。',
              correction_condition: '選択肢Aなら正答となる。',
              mapping_provenance: 'source_structured' as const
            }
          ],
          key_points: '正式問題本文ではないQA fixture。',
          references: 'Study App specialty import QA fixture'
        },
        relatedMaterialIds: [],
        tags: [supplementalTag, 'learning-area:specialty', `question-kind:${key}`],
        revision: 1,
        choices: ['選択肢A', '選択肢B', '選択肢C', '選択肢D'],
        correctChoiceIndexes: [0]
      }
    ],
    materials: [],
    sources: [
      {
        source_id: sourceId,
        source_group: supplementalTag,
        title: `${key} QA fixture`,
        answer_authority: 'provided' as const
      }
    ],
    sourceOccurrences: [
      {
        source_occurrence_id: `${sourceId}-Q01`,
        canonical_question_id: questionId,
        source_id: sourceId,
        source_set_id: `${sourceId}-SET01`,
        source_question_no: 1,
        source_occurrence_order: 1,
        section_type: 'specialty-import-qa',
        source_answer: '1',
        source_prompt_snapshot: '専門科目Import hard QA確認用の非正式問題です。'
      }
    ],
    media: []
  };
}
