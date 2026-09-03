import { expect, test, type Page } from '@playwright/test';
import { sampleDataset } from '../../src/data/sampleDataset';

test('release QA: 726 base + 114 materials + 1917 cloze persist as 2643 questions', async ({
  page
}) => {
  test.setTimeout(180_000);
  const formalBase = buildFormalBaseDataset(726, 114);
  const clozeV1 = buildSupplementalClozeDataset(1917, 'v1');
  const clozeV2 = buildSupplementalClozeDataset(1917, 'v2');
  const clozeV3 = buildSupplementalClozeDataset(1917, 'v3');

  await page.goto('/');
  await page.getByRole('button', { name: 'データ管理' }).click();

  await uploadJson(page, 'synthetic-formal-726.json', formalBase);
  await expect(page.getByRole('status')).toContainText(
    'JSON → Deliveryを読み込みました: 726問 / 726出題出現 / Schema 0.5 / 114資料',
    { timeout: 30_000 }
  );
  await expect(page.getByText(/正式Base: OK/)).toBeVisible();
  await expect(page.getByText(/共通穴抜き: 未完了/)).toBeVisible();

  await seedLearningHistory(page, 'SYN-FORMAL-001');

  await uploadJson(page, 'synthetic-cloze-1917-v1.json', clozeV1);
  await expect(page.getByRole('status')).toContainText(
    '追加1917問 / 置換0問 / 現在2643問 / Schema 0.5',
    { timeout: 30_000 }
  );
  await expect(page.getByText(/正式Base: OK/)).toBeVisible();
  await expect(page.getByText(/共通穴抜き: OK/)).toBeVisible();
  expect(await readCounts(page)).toEqual({
    questions: 2643,
    materials: 114,
    sourceOccurrences: 2643,
    learningHistory: 1
  });

  await uploadJson(page, 'synthetic-cloze-1917-v2.json', clozeV2);
  await expect(page.getByRole('status')).toContainText(
    '追加1917問 / 置換1917問 / 現在2643問 / Schema 0.5',
    { timeout: 30_000 }
  );
  expect(await readCounts(page)).toEqual({
    questions: 2643,
    materials: 114,
    sourceOccurrences: 2643,
    learningHistory: 1
  });

  // Base再Importではsupplementalが外れるが、学習履歴は維持される。
  await uploadJson(page, 'synthetic-formal-726-reimport.json', formalBase);
  await expect(page.getByRole('status')).toContainText(
    'JSON → Deliveryを読み込みました: 726問 / 726出題出現 / Schema 0.5 / 114資料',
    { timeout: 30_000 }
  );
  expect(await readCounts(page)).toEqual({
    questions: 726,
    materials: 114,
    sourceOccurrences: 726,
    learningHistory: 1
  });

  // 正式運用順序どおり、Base更新後にsupplementalを再投入する。
  await uploadJson(page, 'synthetic-cloze-1917-v3.json', clozeV3);
  await expect(page.getByRole('status')).toContainText(
    '追加1917問 / 置換0問 / 現在2643問 / Schema 0.5',
    { timeout: 30_000 }
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
  expect(await readCounts(page)).toEqual({
    questions: 2643,
    materials: 114,
    sourceOccurrences: 2643,
    learningHistory: 1
  });
});

function buildFormalBaseDataset(questionCount: number, materialCount: number) {
  const templateQuestion = sampleDataset.questions[0];
  const templateMaterial = sampleDataset.materials[0];
  const templateOccurrence = sampleDataset.sourceOccurrences[0];
  if (!templateQuestion || !templateMaterial || !templateOccurrence) {
    throw new Error('sampleDataset is incomplete');
  }

  const relatedByMaterial = new Map<string, string[]>();
  for (let index = 1; index <= materialCount; index += 1) {
    relatedByMaterial.set(`SYN-MAT-${String(index).padStart(3, '0')}`, []);
  }

  const questions = Array.from({ length: questionCount }, (_, zeroIndex) => {
    const index = zeroIndex + 1;
    const suffix = String(index).padStart(3, '0');
    const id = `SYN-FORMAL-${suffix}`;
    const materialId = `SYN-MAT-${String(((index - 1) % materialCount) + 1).padStart(3, '0')}`;
    relatedByMaterial.get(materialId)?.push(id);
    return {
      ...templateQuestion,
      id,
      prompt: `非正式release QA問題 ${suffix}`,
      relatedMaterialIds: [materialId],
      tags: ['synthetic-release-qa'],
      revision: 1
    };
  });

  const materials = Array.from({ length: materialCount }, (_, zeroIndex) => {
    const suffix = String(zeroIndex + 1).padStart(3, '0');
    const id = `SYN-MAT-${suffix}`;
    return {
      ...templateMaterial,
      id,
      title: `非正式release QA資料 ${suffix}`,
      relatedQuestionIds: relatedByMaterial.get(id) ?? [],
      tags: ['synthetic-release-qa'],
      revision: 1
    };
  });

  const sourceOccurrences = Array.from({ length: questionCount }, (_, zeroIndex) => {
    const index = zeroIndex + 1;
    const suffix = String(index).padStart(3, '0');
    return {
      ...templateOccurrence,
      source_occurrence_id: `SYN-OCC-${suffix}`,
      canonical_question_id: `SYN-FORMAL-${suffix}`,
      source_question_no: index,
      source_occurrence_order: index,
      source_prompt_snapshot: `非正式release QA問題 ${suffix}`
    };
  });

  return {
    datasetVersion: 'common-726-synthetic-release-v1',
    schemaVersion: '0.5',
    questions,
    materials,
    sources: sampleDataset.sources,
    sourceOccurrences,
    media: []
  };
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
        prompt: `非正式release QA穴抜き (____) ${suffix}`,
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

async function readCounts(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('study-app');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    });
    const transaction = database.transaction(
      ['questions', 'materials', 'sourceOccurrences', 'learningHistory'],
      'readonly'
    );
    const toCount = (request: IDBRequest<number>) =>
      new Promise<number>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB count failed'));
      });
    const [questions, materials, sourceOccurrences, learningHistory] = await Promise.all([
      toCount(transaction.objectStore('questions').count()),
      toCount(transaction.objectStore('materials').count()),
      toCount(transaction.objectStore('sourceOccurrences').count()),
      toCount(transaction.objectStore('learningHistory').count())
    ]);
    database.close();
    return { questions, materials, sourceOccurrences, learningHistory };
  });
}
