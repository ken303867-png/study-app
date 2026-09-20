import { expect, test } from '@playwright/test';

test('deployed GitHub Pages serves the 3,551-question production dataset and final-prep category', async ({ page }) => {
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      console.log(`[browser:${message.type()}] ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    console.log(`[browser:pageerror] ${error.message}`);
  });

  await page.goto('./?publicSync=1&admin=0', { waitUntil: 'domcontentloaded' });

  const appHeading = page.getByRole('heading', { name: '学習アプリ v0.20.3' });
  const errorHeading = page.getByRole('heading', { name: '問題データを準備できませんでした' });

  await expect(appHeading.or(errorHeading)).toBeVisible({ timeout: 120_000 });
  if (await errorHeading.isVisible()) {
    const errorText = (await page.locator('main[aria-label="問題データ準備エラー"]').innerText()).trim();
    throw new Error(`Live Pages bootstrap entered the error screen:\n${errorText}`);
  }

  await expect(appHeading).toBeVisible();
  await expect(page.getByText('全3,551問を利用できます。学習履歴はこの端末に保存されます。')).toBeVisible();

  const homeMetrics = page.locator('.hero-card .metric-grid');
  await expect(homeMetrics.getByText('3551', { exact: true }).first()).toBeVisible();
  await expect(homeMetrics.getByText('114', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '演習', exact: true }).click();
  await expect(page.getByRole('heading', { name: '演習セットを作成' })).toBeVisible();

  await expect(page.getByRole('radio', { name: /共通科目\s*3040問/ })).toBeChecked();
  await expect(page.getByRole('radio', { name: /専門科目\s*511問/ })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /看護協会Eラーニング\s*536問/ })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /穴抜き問題\s*2014問/ })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /予想問題\s*190問/ })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /最終対策\s*300問/ })).toBeChecked();
});
