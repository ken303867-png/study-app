import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import {
  canonicalMasterExportSchema,
  type CanonicalMasterExport
} from '../../src/schemas/masterDataSchemas';
import {
  buildCanonicalMasterXlsx,
  buildWorkbookXlsx
} from '../helpers/buildCanonicalMasterXlsx';

test('loads schema 0.5 sample and renders formal explanation order', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '学習アプリ v0.7.1' })).toBeVisible();
  await page.getByRole('button', { name: 'データ管理' }).click();
  await page.getByRole('button', { name: 'サンプルを読み込む' }).click();
  await expect(page.getByRole('status')).toContainText('Schema 0.5対応');
  await page.getByRole('button', { name: '問題' }).click();
  await expect(page.getByText('正式Deliveryデータを実行時検証するライブラリはどれですか。')).toBeVisible();

  await page.getByText('解答解説を表示').click();
  const explanation = page.locator('.explanation-stack');
  await expect(explanation.getByRole('heading', { name: '解答' })).toBeVisible();
  await expect(explanation.getByRole('heading', { name: 'この問題で問われていること' })).toBeVisible();
  await expect(explanation.getByRole('heading', { name: '正解に至る考え方' })).toBeVisible();
  await expect(explanation.getByRole('heading', { name: '各選択肢解説' })).toBeVisible();
  await expect(explanation.getByRole('heading', { name: '試験で覚える要点' })).toBeVisible();
  await expect(explanation.getByRole('heading', { name: '参考文献・根拠' })).toBeVisible();
  await expect(explanation.getByText('MEDIA placement確認用の非正式プレースホルダー')).toBeVisible();
});

test('imports canonical master JSON, converts it, and stores delivery data', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'データ管理' }).click();

  await page
    .getByLabel('正式データExcelまたはJSONファイル')
    .setInputFiles('tests/fixtures/canonical-master-sample.json');

  await expect(page.getByRole('status')).toContainText('JSON → Canonical Masterを読み込みました');
  await expect(page.getByRole('status')).toContainText('1問 / 1出題出現 / Schema 0.5');

  await page.getByRole('button', { name: '問題' }).click();
  await expect(
    page.getByText('Canonical MasterからDeliveryへ変換する工程はどれですか。')
  ).toBeVisible();
  await expect(page.getByText('非正式S-QUE形式QA fixture')).toBeVisible();
  await expect(page.getByText('除外問題です。')).toHaveCount(0);
});

test('imports a deflated canonical master xlsx end-to-end in Chromium', async ({ page }) => {
  const master = await loadCanonicalFixture();
  const xlsx = await buildCanonicalMasterXlsx(master);

  await page.goto('/');
  await page.getByRole('button', { name: 'データ管理' }).click();
  await page.getByLabel('正式データExcelまたはJSONファイル').setInputFiles({
    name: 'pilot-master.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(xlsx)
  });

  await expect(page.getByRole('status')).toContainText('Excel正本 → Canonical Masterを読み込みました');
  await expect(page.getByRole('status')).toContainText('1問 / 1出題出現 / Schema 0.5');

  await page.getByRole('button', { name: '問題' }).click();
  await expect(
    page.getByText('Canonical MasterからDeliveryへ変換する工程はどれですか。')
  ).toBeVisible();
  await expect(page.getByText('非正式S-QUE形式QA fixture')).toBeVisible();
  await expect(page.getByText('除外問題です。')).toHaveCount(0);
});

test('imports and read-back verifies a 709-question canonical master xlsx in Chromium', async ({ page }) => {
  const master = scaleCanonicalFixture(await loadCanonicalFixture(), 709);
  const xlsx = await buildCanonicalMasterXlsx(master);

  await page.goto('/');
  await page.getByRole('button', { name: 'データ管理' }).click();
  await page.getByLabel('正式データExcelまたはJSONファイル').setInputFiles({
    name: 'synthetic-709-pilot.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(xlsx)
  });

  await expect(page.getByRole('status')).toContainText('Excel正本 → Canonical Masterを読み込みました');
  await expect(page.getByRole('status')).toContainText('709問 / 709出題出現 / Schema 0.5');

  await page.getByRole('button', { name: 'ホーム' }).click();
  await expect(page.locator('.metric-grid').getByText('709', { exact: true }).first()).toBeVisible();

  const indexedDbCounts = await page.evaluate(async () => {
    const request = indexedDB.open('study-app-db');
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    });

    const transaction = database.transaction(['questions', 'sourceOccurrences'], 'readonly');
    const questionRequest = transaction.objectStore('questions').count();
    const occurrenceRequest = transaction.objectStore('sourceOccurrences').count();
    const count = (requestToCount: IDBRequest<number>) =>
      new Promise<number>((resolve, reject) => {
        requestToCount.onsuccess = () => resolve(requestToCount.result);
        requestToCount.onerror = () =>
          reject(requestToCount.error ?? new Error('IndexedDB count failed'));
      });
    const [questions, sourceOccurrences] = await Promise.all([
      count(questionRequest),
      count(occurrenceRequest)
    ]);
    database.close();
    return { questions, sourceOccurrences };
  });

  expect(indexedDbCounts).toEqual({ questions: 709, sourceOccurrences: 709 });
});

test('legacy 709 xlsx preflight blocks lossy conversion and keeps prior data', async ({ page }) => {
  const legacyXlsx = await buildWorkbookXlsx([
    {
      name: '統合709_学習マスター',
      rows: [
        ['学習ID', '問題文', '選択肢A', '選択肢B', '選択肢C', '選択肢D', '正答'],
        ['LEGACY-001', '非正式旧正本QA問題', 'A', 'B', 'C', 'D', 'B']
      ]
    }
  ]);

  await page.goto('/');
  await page.getByRole('button', { name: 'データ管理' }).click();
  await page.getByRole('button', { name: 'サンプルを読み込む' }).click();
  await expect(page.getByRole('status')).toContainText('Schema 0.5対応');

  await page.getByLabel('正式データExcelまたはJSONファイル').setInputFiles({
    name: 'legacy-v1.47.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(legacyXlsx)
  });

  const alert = page.getByRole('alert');
  await expect(alert).toContainText('旧v1.47系709問Excel正本');
  await expect(alert).toContainText('SOURCE_OCCURRENCES');
  await expect(alert).toContainText('source_answer');

  await page.getByRole('button', { name: '問題' }).click();
  await expect(page.getByText('正式Deliveryデータを実行時検証するライブラリはどれですか。')).toBeVisible();
  await expect(page.getByText('非正式旧正本QA問題')).toHaveCount(0);
});

async function loadCanonicalFixture() {
  const text = await readFile(
    new URL('../fixtures/canonical-master-sample.json', import.meta.url),
    'utf8'
  );
  const parsed: unknown = JSON.parse(text);
  return canonicalMasterExportSchema.parse(parsed);
}

function scaleCanonicalFixture(base: CanonicalMasterExport, count: number): CanonicalMasterExport {
  const question = base.sheets.QUESTIONS.find((row) => row.record_status === 'adopted');
  if (!question) throw new Error('canonical fixture requires one adopted question');

  const explanation = base.sheets.EXPLANATIONS.find(
    (row) => row.canonical_question_id === question.canonical_question_id
  );
  const qa = base.sheets.QA_LEDGER.find(
    (row) => row.canonical_question_id === question.canonical_question_id
  );
  const occurrence = base.sheets.SOURCE_OCCURRENCES.find(
    (row) => row.canonical_question_id === question.canonical_question_id
  );
  if (!explanation || !qa || !occurrence) {
    throw new Error('canonical fixture requires one complete adopted question');
  }

  const baseChoices = base.sheets.CHOICES.filter(
    (choice) => choice.canonical_question_id === question.canonical_question_id
  );
  const baseChoiceExplanations = base.sheets.CHOICE_EXPLANATIONS.filter(
    (choice) => choice.canonical_question_id === question.canonical_question_id
  );
  if (baseChoices.length < 2 || baseChoices.length !== baseChoiceExplanations.length) {
    throw new Error('canonical fixture requires matching choice and choice-explanation rows');
  }

  const questions: CanonicalMasterExport['sheets']['QUESTIONS'] = [];
  const choices: CanonicalMasterExport['sheets']['CHOICES'] = [];
  const explanations: CanonicalMasterExport['sheets']['EXPLANATIONS'] = [];
  const choiceExplanations: CanonicalMasterExport['sheets']['CHOICE_EXPLANATIONS'] = [];
  const sourceOccurrences: CanonicalMasterExport['sheets']['SOURCE_OCCURRENCES'] = [];
  const qaLedger: CanonicalMasterExport['sheets']['QA_LEDGER'] = [];

  for (let index = 1; index <= count; index += 1) {
    const suffix = String(index).padStart(3, '0');
    const questionId = `SYN-Q-${suffix}`;
    const prompt = `非正式709件負荷試験問題 ${suffix}`;
    questions.push({
      ...question,
      canonical_question_id: questionId,
      source_question_id: `SYN-SRC-Q-${suffix}`,
      canonical_prompt: prompt,
      source_prompt: prompt,
      notes: `synthetic 709 import pilot ${suffix}`
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
      key_points: `${explanation.key_points} ${suffix}`
    });
    choiceExplanations.push(
      ...baseChoiceExplanations.map((choice) => ({
        ...choice,
        canonical_question_id: questionId,
        reason: `${choice.reason} ${suffix}`
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
    qaLedger.push({ ...qa, canonical_question_id: questionId });
  }

  return canonicalMasterExportSchema.parse({
    ...base,
    masterDataVersion: 'synthetic-709-pilot-master',
    deliveryDatasetVersion: 'synthetic-709-pilot-delivery',
    sheets: {
      ...base.sheets,
      QUESTIONS: questions,
      SOURCE_OCCURRENCES: sourceOccurrences,
      CHOICES: choices,
      EXPLANATIONS: explanations,
      CHOICE_EXPLANATIONS: choiceExplanations,
      RELATIONS: [],
      QA_LEDGER: qaLedger,
      MEDIA: []
    }
  });
}
