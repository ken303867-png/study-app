import { expect, test } from '@playwright/test';

const questionPrompt = '正式Deliveryデータを実行時検証するライブラリはどれですか。';

test('filters questions and persists favorite/review learning state across reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'データ管理' }).click();
  await page.getByRole('button', { name: 'サンプルを読み込む' }).click();
  await page.getByRole('button', { name: '問題', exact: true }).click();

  await expect(page.getByText(questionPrompt)).toBeVisible();
  await page.getByRole('button', { name: 'お気に入り ☆' }).click();
  await page.getByRole('button', { name: '不正解', exact: true }).click();
  await expect(page.locator('.learning-status')).toHaveText('直近：不正解');
  await expect(page.getByRole('button', { name: '要復習 ✓' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByLabel('学習状態').selectOption('favorite');
  await expect(page.getByText(questionPrompt)).toBeVisible();
  await expect(page.getByText('表示 1 / 1問')).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: '問題', exact: true }).click();
  await page.getByLabel('学習状態').selectOption('review');
  await expect(page.getByText(questionPrompt)).toBeVisible();
  await expect(page.getByRole('button', { name: 'お気に入り ★' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: '条件をクリア' }).click();
  await page.getByLabel('キーワード・問題ID').fill('sample-q-001');
  await expect(page.getByText(questionPrompt)).toBeVisible();
});

test('filters materials and cross-navigation clears filters so targets stay visible', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'データ管理' }).click();
  await page.getByRole('button', { name: 'サンプルを読み込む' }).click();

  await page.getByRole('button', { name: '資料', exact: true }).click();
  await page.getByLabel('キーワード・資料ID').fill('正式データ処理フロー');
  await expect(page.getByRole('heading', { name: '正式データ処理フロー' })).toBeVisible();
  await page.getByRole('button', { name: '関連問題を開く: SAMPLE-Q-001' }).click();
  await expect(page.getByText(questionPrompt)).toBeVisible();
  await expect(page.getByLabel('キーワード・問題ID')).toHaveValue('');

  await page.getByLabel('キーワード・問題ID').fill('SAMPLE-Q-001');
  await page.getByRole('button', { name: '関連資料を開く: 正式データ処理フロー' }).click();
  await expect(page.getByRole('heading', { name: '正式データ処理フロー' })).toBeVisible();
  await expect(page.getByLabel('キーワード・資料ID')).toHaveValue('');
});
