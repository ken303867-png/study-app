import { expect, test } from '@playwright/test';

const questionPrompt = '正式Deliveryデータを実行時検証するライブラリはどれですか。';

async function loadSampleAndStartPractice(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'データ管理' }).click();
  await page.getByRole('button', { name: 'サンプルを読み込む' }).click();
  await expect(page.getByRole('status')).toContainText('Schema 0.5対応');
  await page.getByRole('button', { name: '問題', exact: true }).click();
  await expect(page.getByText(questionPrompt)).toBeVisible();
  await page.getByRole('button', { name: '1問の演習を開始' }).click();
  await expect(page.getByRole('heading', { name: '1問ずつ演習' })).toBeVisible();
}

test('answers one question correctly, reveals formal explanation, and records history', async ({ page }) => {
  await loadSampleAndStartPractice(page);

  await page.getByRole('radio', { name: /B\s*Zod/i }).check();
  await page.getByRole('button', { name: '回答を確定する' }).click();

  const feedback = page.getByRole('status');
  await expect(feedback).toContainText('正解');
  await expect(feedback).toContainText('正答：B. Zod');
  await expect(page.locator('.practice-local-state')).toContainText('累計 1回');

  const practice = page.getByRole('region', { name: '1問ずつ演習' });
  await expect(practice.getByRole('heading', { name: '正解に至る考え方' })).toBeVisible();
  await expect(practice.getByRole('heading', { name: '各選択肢解説' })).toBeVisible();

  await page.getByRole('button', { name: '結果を見る' }).click();
  const result = page.getByRole('region', { name: '演習結果' });
  await expect(result.getByText('100%', { exact: true })).toBeVisible();
  await expect(result.getByText('1', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: '問題一覧へ戻る' }).click();
  await page.getByLabel('学習状態').selectOption('correct');
  await expect(page.getByText(questionPrompt)).toBeVisible();
});

test('marks a wrong answer for review and retries only the missed question without duplicate attempts', async ({ page }) => {
  await loadSampleAndStartPractice(page);

  await page.getByRole('radio', { name: /A\s*Dexie/i }).check();
  await page.getByRole('button', { name: '回答を確定する' }).click();

  const firstFeedback = page.getByRole('status');
  await expect(firstFeedback).toContainText('不正解');
  await expect(firstFeedback).toContainText('正答：B. Zod');
  await expect(page.locator('.practice-local-state')).toContainText('累計 1回');
  await expect(page.getByRole('button', { name: '要復習 ✓' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: '結果を見る' }).click();
  await expect(page.getByRole('button', { name: '間違えた1問を再挑戦' })).toBeVisible();
  await page.getByRole('button', { name: '間違えた1問を再挑戦' }).click();

  await expect(page.getByText(questionPrompt)).toBeVisible();
  await page.getByRole('radio', { name: /B\s*Zod/i }).check();
  await page.getByRole('button', { name: '回答を確定する' }).click();
  await expect(page.getByRole('status')).toContainText('正解');
  await expect(page.locator('.practice-local-state')).toContainText('累計 2回');
  await expect(page.getByRole('button', { name: '要復習 ✓' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: '結果を見る' }).click();
  await expect(page.getByRole('region', { name: '演習結果' }).getByText('100%', { exact: true })).toBeVisible();
});
