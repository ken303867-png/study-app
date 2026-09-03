import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import {
  canonicalMasterExportSchema,
  type CanonicalMasterExport
} from '../../src/schemas/masterDataSchemas';

test('release QA: formal 726 + 114 materials + cloze 1917 persist as 2643 questions', async ({
  page
}) => {
  const baseMaster = await loadCanonicalFixture();
  const formalMaster = buildFormalReleaseMaster(baseMaster, 726, 114);
  const clozeV1 = buildSupplementalClozeDataset(1917, 'v1');
  const clozeV2 = buildSupplementalClozeDataset(1917, 'v2');
  const clozeV3 = buildSupplementalClozeDataset(1917, 'v3');

  await page.goto('/');
  await page.getByRole('button', { name: 'データ管理' }).click();

  await uploadJson(page, 'synthetic-formal-726.json', formalMaster);
  await expect(page.getByRole('status')).toContainText(
    'JSON → Canonical Masterを読み込みました: 726問 / 726出題出現 / Schema 0.5 / 114資料'
  );
  await expect(page.getByText(/正式Base: OK/)).toBeVisible();
  await expect(page.getByText(/共通穴抜き: 未完了/)).toBeVisible();

  await seedLearningHistory(page, 'SYN-FORMAL-001');

  await uploadJson(page, 'synthetic-cloze-1917-v1.json', clozeV1);
  await expect(page.getByRole('status')).toContainText(
    '追加1917問 / 置換0問 / 現在2643問 / Schema 0.5'
  );
  await expect(page.getByText(/正式Base: OK/)).toBeVisible();
  await expect(page.getByText(/共通穴抜き: OK/)).toBeVisible();

  let persisted = await readReleaseState(page);
  expect(persisted).toMatchObject({
    questions: 2643,
    materials: 114,
    sourceOccurrences: 2643,
    datasetVersion: 'common-726-synthetic-release-v1',
    schemaVersion: '0.5',
    formalDataSpecVersion: '1.2',
    historyAttempts: 1
  });

  await uploadJson(page, 'synthetic-cloze-1917-v2.json', clozeV2);
  await expect(page.getByRole('status')).toContainText(
    '追加1917問 / 置換1917問 / 現在2643問 / Schema 0.5'
  );
  persisted = await readReleaseState(page);
  expect(persisted).toMatchObject({
    questions: 2643,
    materials: 114,
    sourceOccurrences: 2643,
    datasetVersion: 'common-726-synthetic-release-v1',
    formalDataSpecVersion: '1.2',
    historyAttempts: 1,
    firstClozeAnswer: '答v2-1'
  });

  await uploadJson(page, 'synthetic-formal-726-reimport.json', formalMaster);
  await expect(page.getByRole('status')).toContainText(
    'JSON → Canonical Masterを読み込みました: 726問 / 726出題出現 / Schema 0.5 / 114資料'
  );
  persisted = await readReleaseState(page);
  expect(persisted).toMatchObject({
    questions: 726,
    materials: 114,
    sourceOccurrences: 726,
    datasetVersion: 'common-726-synthetic-release-v1',
    formalDataSpecVersion: '1.2',
    historyAttempts: 1,
    firstClozeAnswer: null
  });

  await uploadJson(page, 'synthetic-cloze-1917-v3.json', clozeV3);
  await expect(page.getByRole('status')).toContainText(
    '追加1917問 / 置換0問 / 現在2643問 / Schema 0.5'
  );
  await expect(page.getByText(/正式Base: OK/)).toBeVisible();
  await expect(page.getByText(/共通穴抜き: OK/)).toBeVisible();

  await page.reload();
  await expect(
    page.locator('.metric-grid div').filter({ hasText: '全問題' }).locator('strong')
  ).toHaveText('2643');
  await expect(
    page.locator('.metric-grid div').filter({ hasText: '正式Base' }).locator('strong')
  ).toHaveText('726');
  await expect(
    page.locator('.metric-grid div').filter({ hasText: '追加問題' }).locator('strong')
  ).toHaveText('1917');
  await expect(
    page.locator('.metric-grid div').filter({ hasText: '資料' }).locator('strong')
  ).toHaveText('114');

  persisted = await readReleaseState(page);
  expect(persisted).toMatchObject({
    questions: 2643,
    materials: 114,
    sourceOccurrences: 2643,
    datasetVersion: 'common-726-synthetic-release-v1',
    schemaVersion: '0.5',
    formalDataSpecVersion: '1.2',
    historyAttempts: 1,
    firstClozeAnswer: '答v3-1'
  });
});

async function loadCanonicalFixture(): Promise<CanonicalMasterExport> {
  const text = await readFile(
    new URL('../fixtures/canonical-master-sample.json', import.meta.url),
    'utf8'
  );
  return canonicalMasterExportSchema.parse(JSON.parse(text) as unknown);
}

function buildFormalReleaseMaster(
  base: CanonicalMasterExport,
  questionCount: number,
  materialCount: number
): CanonicalMasterExport {
  const adopted = base.sheets.QUESTIONS.find((row) => row.record_status === 'adopted');
  if (!adopted) throw new Error('fixture requires one adopted question');
  const explanation = base.sheets.EXPLANATIONS.find(
    (row) => row.canonical_question_id === adopted.canonical_question_id
  );
  const qa = base.sheets.QA_LEDGER.find(
    (row) => row.canonical_question_id === adopted.canonical_question_id
  );
  const occurrence = base.sheets.SOURCE_OCCURRENCES.find(
    (row) => row.canonical_question_id === adopted.canonical_question_id
  );
  if (!explanation || !qa || !occurrence) throw new Error('fixture is incomplete');

  const baseChoices = base.sheets.CHOICES.filter(
    (row) => row.canonical_question_id === adopted.canonical_question_id
  );
  const baseChoiceExplanations = base.sheets.CHOICE_EXPLANATIONS.filter(
    (row) => row.canonical_question_id === adopted.canonical_question_id
  );
  if (baseChoices.length < 2 || baseChoices.length !== baseChoiceExplanations.length) {
    throw new Error('fixture choices are incomplete');
  }

  const questions: CanonicalMasterExport['sheets']['QUESTIONS'] = [];
  const choices: CanonicalMasterExport['sheets']['CHOICES'] = [];
  const explanations: CanonicalMasterExport['sheets']['EXPLANATIONS'] = [];
  const choiceExplanations: CanonicalMasterExport['sheets']['CHOICE_EXPLANATIONS'] = [];
  const sourceOccurrences: CanonicalMasterExport['sheets']['SOURCE_OCCURRENCES'] = [];
  const qaLedger: CanonicalMasterExport['sheets']['QA_LEDGER'] = [];
  const relatedByMaterial = new Map<string, string[]>();

  for (let index = 1; index <= materialCount; index += 1) {
    relatedByMaterial.set(`SYN-MAT-${String(index).padStart(3, '0')}`, []);
  }

  for (let index = 1; index <= questionCount; index += 1) {
    const suffix = String(index).padStart(3, '0');
    const questionId = `SYN-FORMAL-${suffix}`;
    const materialId = `SYN-MAT-${String(((index - 1) % materialCount) + 1).padStart(3, '0')}`;
    relatedByMaterial.get(materialId)?.push(questionId);
    const prompt = `非正式release QA問題 ${suffix}`;

    questions.push({
      ...adopted,
      canonical_question_id: questionId,
      source_question_id: `SYN-SRC-Q-${suffix}`,
      source_prompt: prompt,
      canonical_prompt: prompt,
      tags: ['synthetic-release-qa'],
      related_material_ids: [materialId],
      notes: `synthetic formal 726 release QA ${suffix}`
    });
    choices.push(
      ...baseChoices.map((choice) => ({
        ...choice,
        canonical_question_id: questionId,
        source_choice_text: `${choice.source_choice_text} ${suffix}`,
        canonical_choice_text: `${choice.canonical_choice_text} ${suffix}`
      }))
    );
    explanations.push({
      ...explanation,
      canonical_question_id: questionId,
      answer_summary: `${explanation.answer_summary} ${suffix}`,
      question_intent: `${explanation.question_intent} ${suffix}`,
      reasoning: `${explanation.reasoning} ${suffix}`,
      key_points: `${explanation.key_points} ${suffix}`,
      references: `${explanation.references} / synthetic release QA`
    });
    choiceExplanations.push(
      ...baseChoiceExplanations.map((row) => ({
        ...row,
        canonical_question_id: questionId,
        reason: `${row.reason} ${suffix}`,
        correction_condition: `${row.correction_condition} ${suffix}`
      }))
    );
    sourceOccurrences.push({
      ...occurrence,
      source_occurrence_id: `SYN-OCC-${suffix}`,
      canonical_question_id: questionId,
      source_question_no: index,
      source_occurrence_order: index,
      source_prompt_snapshot: prompt
    });
    qaLedger.push({
      ...qa,
      canonical_question_id: questionId,
      notes: 'synthetic release QA'
    });
  }

  const materials: CanonicalMasterExport['sheets']['MATERIALS'] = [];
  const materialBlocks: CanonicalMasterExport['sheets']['MATERIAL_BLOCKS'] = [];
  for (let index = 1; index <= materialCount; index += 1) {
    const suffix = String(index).padStart(3, '0');
    const materialId = `SYN-MAT-${suffix}`;
    materials.push({
      material_id: materialId,
      subject: adopted.subject,
      unit: adopted.unit,
      title: `非正式release QA資料 ${suffix}`,
      importance: 'B',
      revision: 1,
      related_question_ids: relatedByMaterial.get(materialId) ?? [],
      tags: ['synthetic-release-qa']
    });
    materialBlocks.push({
      block_id: `${materialId}-01-001`,
      material_id: materialId,
      section_key: 'releaseQa',
      section_order: 1,
      section_heading: '非正式release QA',
      block_order: 1,
      block_type: 'paragraph',
      text: `正式本文ではないrelease QA資料 ${suffix}`
    });
  }

  return canonicalMasterExportSchema.parse({
    ...base,
    masterDataVersion: 'common-726-synthetic-master-v1',
    formalDataSpecVersion: '1.2',
    deliveryDatasetVersion: 'common-726-synthetic-release-v1',
    sheets: {
      ...base.sheets,
      QUESTIONS: questions,
      CHOICES: choices,
      EXPLANATIONS: explanations,
      CHOICE_EXPLANATIONS: choiceExplanations,
      SOURCE_OCCURRENCES: sourceOccurrences,
      QA_LEDGER: qaLedger,
      MATERIALS: materials,
      MATERIAL_BLOCKS: materialBlocks,
      RELATIONS: [],
      MEDIA: []
    }
  });
}

function buildSupplementalClozeDataset(count: number, version: string) {
  return {
    importMode: 'supplemental-replace',
    supplementalKey: 'common-cloze',
    datasetVersion: `common-cloze-synthetic-${version}`,
    schemaVersion: '0.5',
    questions: Array.from({ length: count }, (_, zeroIndex) => {
      const index = zeroIndex + 1;
      const suffix = String(index).padStart(4, '0');
      const answer = `答${version}-${index}`;
      return {
        id: `SYN-CLOZE-${suffix}`,
        subject: 'サンプル科目',
        unit: '共通穴抜き問題',
        topic: `穴抜き問題 ${suffix}`,
        sourceType: 'other',
        sourceLabel: '共通穴抜き問題 synthetic release QA',
        questionFormat: 'fill-blank',
        importance: 'B',
        prompt: `非正式release QA穴抜き（　　　）${suffix}`,
        explanation: {
          answer,
          question_intent: '非正式穴抜きrelease QA',
          reasoning: '解説なし',
          choice_explanations: [],
          key_points: answer,
          references: 'synthetic release QA'
        },
        relatedMaterialIds: [],
        tags: [
          '穴抜き問題',
          'answer-only',
          'supplemental:common-cloze',
          'synthetic-release-qa'
        ],
        revision: 1,
        acceptedAnswers: [answer]
      };
    }),
    materials: [],
    sources: [
      {
        source_id: 'SYN-CLOZE-SOURCE',
        source_group: 'supplemental:common-cloze',
        title: '共通穴抜き問題 synthetic release QA',
        answer_authority: 'provided'
      }
    ],
    sourceOccurrences: Array.from({ length: count }, (_, zeroIndex) => {
      const index = zeroIndex + 1;
      const suffix = String(index).padStart(4, '0');
      return {
        source_occurrence_id: `SYN-CLOZE-OCC-${suffix}`,
        canonical_question_id: `SYN-CLOZE-${suffix}`,
        source_id: 'SYN-CLOZE-SOURCE',
        source_set_id: 'SYN-CLOZE-SET',
        source_set_label: '共通穴抜き問題 synthetic release QA',
        source_set_order: 1,
        source_question_no: index,
        source_occurrence_order: index,
        source_location: 'synthetic release QA',
        source_answer: `答${version}-${index}`
      };
    }),
    media: []
  };
}

async function uploadJson(page: Page, name: string, value: unknown) {
  await page.getByLabel('正式データExcelまたはJSONファイル').setInputFiles({
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(value), 'utf8')
  });
}

async function seedLearningHistory(page: Page, questionId: string) {
  await page.evaluate(async (id) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('study-app');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    });
    const transaction = database.transaction('learningHistory', 'readwrite');
    transaction.objectStore('learningHistory').put({
      questionId: id,
      attempts: 1,
      correctCount: 1,
      incorrectCount: 0,
      uncertainCount: 0,
      consecutiveCorrect: 1,
      lastResult: 'correct',
      lastAnsweredAt: '2026-09-03T12:00:00.000Z',
      favorite: true,
      needsReview: false
    });
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error('IndexedDB transaction failed'));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
    });
    database.close();
  }, questionId);
}

async function readReleaseState(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('study-app');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    });
    const transaction = database.transaction(
      ['questions', 'materials', 'sourceOccurrences', 'learningHistory', 'meta'],
      'readonly'
    );
    const requestValue = <T,>(request: IDBRequest<T>) =>
      new Promise<T>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
      });

    const questions = await requestValue(transaction.objectStore('questions').count());
    const materials = await requestValue(transaction.objectStore('materials').count());
    const sourceOccurrences = await requestValue(
      transaction.objectStore('sourceOccurrences').count()
    );
    const history = await requestValue(
      transaction.objectStore('learningHistory').get('SYN-FORMAL-001')
    );
    const firstCloze = await requestValue(
      transaction.objectStore('questions').get('SYN-CLOZE-0001')
    );
    const datasetVersion = await requestValue(transaction.objectStore('meta').get('datasetVersion'));
    const schemaVersion = await requestValue(transaction.objectStore('meta').get('schemaVersion'));
    const formalDataSpecVersion = await requestValue(
      transaction.objectStore('meta').get('formalDataSpecVersion')
    );
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error('IndexedDB transaction failed'));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
    });
    database.close();

    const clozeRecord = firstCloze as { acceptedAnswers?: string[] } | undefined;
    const historyRecord = history as { attempts?: number } | undefined;
    return {
      questions,
      materials,
      sourceOccurrences,
      datasetVersion: (datasetVersion as { value?: string } | undefined)?.value ?? null,
      schemaVersion: (schemaVersion as { value?: string } | undefined)?.value ?? null,
      formalDataSpecVersion:
        (formalDataSpecVersion as { value?: string } | undefined)?.value ?? null,
      historyAttempts: historyRecord?.attempts ?? 0,
      firstClozeAnswer: clozeRecord?.acceptedAnswers?.[0] ?? null
    };
  });
}
