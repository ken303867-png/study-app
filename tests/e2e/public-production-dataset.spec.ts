import { expect, test } from '@playwright/test';

test('fresh public URL bootstraps the real 3,154-question production dataset', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Full production bootstrap is covered once on desktop Chromium.');
  test.setTimeout(120_000);

  await page.goto('/?publicSync=1');

  await expect(page.getByRole('heading', { name: '学習アプリ v0.17.0' })).toBeVisible({
    timeout: 120_000
  });
  await expect(page.getByText('PUBLIC DATA / LOCAL HISTORY')).toBeVisible();

  const homeMetrics = page.locator('.hero-card .metric-grid');
  await expect(homeMetrics.getByText('3154', { exact: true }).first()).toBeVisible();
  await expect(homeMetrics.getByText('726', { exact: true })).toBeVisible();
  await expect(homeMetrics.getByText('2428', { exact: true })).toBeVisible();
  await expect(homeMetrics.getByText('114', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '演習', exact: true }).click();
  await expect(page.getByRole('heading', { name: '演習セットを作成' })).toBeVisible();

  await expect(page.getByRole('radio', { name: /共通科目\s*2643問/ })).toBeChecked();
  await expect(page.getByRole('radio', { name: /専門科目\s*511問/ })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /看護協会Eラーニング\s*536問/ })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /穴抜き問題\s*1917問/ })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /予想問題\s*190問/ })).toBeChecked();

  await page.getByRole('radio', { name: /専門科目\s*511問/ }).check();
  await expect(page.getByRole('checkbox', { name: /過去問\s*126問/ })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /予想問題\s*116問/ })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /予想事例問題\s*269問/ })).toBeChecked();

  await page.getByRole('button', { name: 'データ管理', exact: true }).click();
  await expect(page.getByRole('heading', { name: '公開問題データはURLから自動取得します' })).toBeVisible();
  await expect(page.getByText('3154', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('114', { exact: true }).last()).toBeVisible();
});
