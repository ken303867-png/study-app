import { expect, test } from '@playwright/test';

test('selects learning area and switches the visible question kinds', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'データ管理' }).click();
  await page.getByRole('button', { name: 'サンプルを読み込む' }).click();
  await page.getByRole('button', { name: '演習', exact: true }).click();

  await expect(page.getByRole('heading', { name: '演習セットを作成' })).toBeVisible();
  await expect(page.getByText('学習分野', { exact: true })).toBeVisible();
  await expect(page.getByText('問題の種類', { exact: true })).toBeVisible();

  const common = page.getByRole('radio', { name: /共通科目/ });
  await expect(common).toBeChecked();
  await expect(page.getByText('母集団：共通科目 / 1問')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /看護協会Eラーニング/ })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /穴抜き問題/ })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /予想問題/ })).toBeVisible();

  await page.getByRole('radio', { name: /専門科目/ }).check();
  await expect(page.getByText('母集団：専門科目 / 0問')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /過去問/ })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /^予想問題/ })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /予想事例問題/ })).toBeVisible();
  await expect(page.getByText('この条件に一致する問題はありません。')).toBeVisible();
});
