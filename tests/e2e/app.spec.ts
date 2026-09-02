import { expect, test } from '@playwright/test';

test('loads sample dataset and navigates to questions', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '学習アプリ v0.7.0' })).toBeVisible();
  await page.getByRole('button', { name: 'データ管理' }).click();
  await page.getByRole('button', { name: 'サンプルを読み込む' }).click();
  await expect(page.getByRole('status')).toContainText('サンプルを読み込みました');
  await page.getByRole('button', { name: '問題' }).click();
  await expect(page.getByText('v0.7で正式採用したデータ検証ライブラリはどれですか。')).toBeVisible();
});
