import { expect, test } from '@playwright/test';

test('loads schema 0.4 sample and renders formal explanation order', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '学習アプリ v0.7.1' })).toBeVisible();
  await page.getByRole('button', { name: 'データ管理' }).click();
  await page.getByRole('button', { name: 'サンプルを読み込む' }).click();
  await expect(page.getByRole('status')).toContainText('Schema 0.4対応');
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
