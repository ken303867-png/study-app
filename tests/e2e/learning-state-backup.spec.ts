import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

test('backs up and restores browser-local learning state without formal problem content', async ({ page }) => {
  await page.goto('/?publicSync=0');
  await page.getByRole('button', { name: 'データ管理', exact: true }).click();
  await page.getByRole('button', { name: 'サンプルを読み込む' }).click();
  await expect(page.getByRole('status')).toContainText('Schema 0.5対応');

  await putLearningHistory(page, {
    questionId: 'SAMPLE-Q-001',
    attempts: 1,
    correctCount: 0,
    incorrectCount: 1,
    uncertainCount: 0,
    consecutiveCorrect: 0,
    lastResult: 'incorrect',
    lastAnsweredAt: '2026-09-07T07:20:00.000Z',
    favorite: true,
    needsReview: true
  });

  await page.getByRole('button', { name: '学習データ', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'バックアップを保存', exact: true }).click();
  const download = await downloadPromise;
  const backupPath = await download.path();
  if (!backupPath) throw new Error('Learning-state backup download path is unavailable');
  expect(download.suggestedFilename()).toMatch(/^study-app-learning-state-\d{8}\.json$/);

  const backupText = await readFile(backupPath, 'utf8');
  expect(backupText).toContain('SAMPLE-Q-001');
  expect(backupText).not.toContain('正式Deliveryデータを実行時検証するライブラリ');
  expect(backupText).not.toContain('correctChoiceIndexes');
  expect(backupText).not.toContain('choice_explanations');

  await clearLearningHistory(page);
  expect(await getLearningHistoryCount(page)).toBe(0);

  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('現在の学習履歴・資料履歴・試験履歴');
    await dialog.accept();
  });
  await page.getByLabel('学習データバックアップJSONファイル').setInputFiles(backupPath);

  await expect(page.getByRole('status')).toContainText('学習データを復元しました');
  await expect(page.getByRole('status')).toContainText('問題履歴 1件');
  expect(await getLearningHistoryCount(page)).toBe(1);

  const restored = await getLearningHistory(page, 'SAMPLE-Q-001');
  expect(restored).toMatchObject({
    attempts: 1,
    incorrectCount: 1,
    favorite: true,
    needsReview: true
  });
});

test('rejects an invalid restore file and keeps current history unchanged', async ({ page }) => {
  await page.goto('/?publicSync=0');
  await page.getByRole('button', { name: 'データ管理', exact: true }).click();
  await page.getByRole('button', { name: 'サンプルを読み込む' }).click();
  await putLearningHistory(page, {
    questionId: 'SAMPLE-Q-001',
    attempts: 1,
    correctCount: 1,
    incorrectCount: 0,
    uncertainCount: 0,
    consecutiveCorrect: 1,
    lastResult: 'correct',
    lastAnsweredAt: '2026-09-07T07:21:00.000Z',
    favorite: false,
    needsReview: false
  });

  await page.getByRole('button', { name: '学習データ', exact: true }).click();
  page.once('dialog', async (dialog) => dialog.accept());
  await page.getByLabel('学習データバックアップJSONファイル').setInputFiles({
    name: 'invalid-learning-state.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"format":"not-study-app"}', 'utf8')
  });

  await expect(page.getByRole('alert')).toContainText(
    'Study Appの学習データバックアップとして検証できませんでした。'
  );
  expect(await getLearningHistoryCount(page)).toBe(1);
  const preserved = await getLearningHistory(page, 'SAMPLE-Q-001');
  expect(preserved).toMatchObject({ attempts: 1, correctCount: 1, lastResult: 'correct' });
});

test('shows learning-data backup controls to an ordinary public learner', async ({ page }) => {
  await page.goto('/?publicSync=0&admin=0');
  await expect(page.getByRole('button', { name: '学習データ', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'データ管理', exact: true })).toBeHidden();
  await page.getByRole('button', { name: '学習データ', exact: true }).click();
  await expect(page.getByRole('heading', { name: '学習履歴のバックアップ／復元' })).toBeVisible();
  await expect(page.getByText(/問題文・選択肢・正答・解説・教材本文はバックアップに含みません/)).toBeVisible();
});

async function openStudyDb(page: Page) {
  return page.evaluate(async () => {
    const request = indexedDB.open('study-app');
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    });
    database.close();
  });
}

async function putLearningHistory(page: Page, value: Record<string, unknown>) {
  await openStudyDb(page);
  await page.evaluate(async (history) => {
    const request = indexedDB.open('study-app');
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('learningHistory', 'readwrite');
      transaction.objectStore('learningHistory').put(history);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB write failed'));
    });
    database.close();
  }, value);
}

async function clearLearningHistory(page: Page) {
  await page.evaluate(async () => {
    const request = indexedDB.open('study-app');
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('learningHistory', 'readwrite');
      transaction.objectStore('learningHistory').clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB clear failed'));
    });
    database.close();
  });
}

async function getLearningHistoryCount(page: Page) {
  return page.evaluate(async () => {
    const request = indexedDB.open('study-app');
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    });
    const count = await new Promise<number>((resolve, reject) => {
      const transaction = database.transaction('learningHistory', 'readonly');
      const countRequest = transaction.objectStore('learningHistory').count();
      countRequest.onsuccess = () => resolve(countRequest.result);
      countRequest.onerror = () => reject(countRequest.error ?? new Error('IndexedDB count failed'));
    });
    database.close();
    return count;
  });
}

async function getLearningHistory(page: Page, questionId: string) {
  return page.evaluate(async (id) => {
    const request = indexedDB.open('study-app');
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    });
    const row = await new Promise<Record<string, unknown> | undefined>((resolve, reject) => {
      const transaction = database.transaction('learningHistory', 'readonly');
      const getRequest = transaction.objectStore('learningHistory').get(id);
      getRequest.onsuccess = () => resolve(getRequest.result as Record<string, unknown> | undefined);
      getRequest.onerror = () => reject(getRequest.error ?? new Error('IndexedDB read failed'));
    });
    database.close();
    return row;
  }, questionId);
}
