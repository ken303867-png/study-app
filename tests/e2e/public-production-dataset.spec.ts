import { expect, test } from '@playwright/test';

test.describe.configure({ retries: 0 });

test('fresh public URL bootstraps the real 3,154-question production dataset', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Full production bootstrap is covered once on desktop Chromium.');
  test.setTimeout(120_000);

  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      console.log(`[browser:${message.type()}] ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    console.log(`[browser:pageerror] ${error.message}`);
  });

  await page.goto('/?publicSync=1&admin=0');

  const appHeading = page.getByRole('heading', { name: '学習アプリ v0.18.0' });
  const errorHeading = page.getByRole('heading', { name: '問題データを準備できませんでした' });

  await expect(appHeading.or(errorHeading)).toBeVisible({ timeout: 120_000 });
  if (await errorHeading.isVisible()) {
    const errorText = (await page.locator('main[aria-label="問題データ準備エラー"]').innerText()).trim();
    throw new Error(`Public dataset bootstrap entered the error screen:\n${errorText}`);
  }

  await expect(appHeading).toBeVisible();
  await expect(page.getByText('全3,154問を利用できます。学習履歴はこの端末に保存されます。')).toBeVisible();
  await expect(page.getByText('PUBLIC DATA / LOCAL HISTORY')).toBeHidden();
  await expect(page.getByText('Delivery Schema 0.5 / Offline PWA')).toBeHidden();
  await expect(page.getByRole('button', { name: 'データ管理', exact: true })).toBeHidden();

  const homeMetrics = page.locator('.hero-card .metric-grid');
  await expect(homeMetrics.getByText('3154', { exact: true }).first()).toBeVisible();
  await expect(homeMetrics.getByText('726', { exact: true })).toBeHidden();
  await expect(homeMetrics.getByText('2428', { exact: true })).toBeHidden();
  await expect(homeMetrics.getByText('114', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '演習', exact: true }).click();
  await expect(page.getByRole('heading', { name: '演習セットを作成' })).toBeVisible();

  await expect(page.getByRole('radio', { name: /共通科目\s*2643問/ })).toBeChecked();
  await expect(page.getByRole('radio', { name: /専門科目\s*511問/ })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /看護協会Eラーニング\s*536問/ })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /穴抜き問題\s*1917問/ })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /予想問題\s*190問/ })).toBeChecked();
  await expect(page.getByLabel('出題数')).toHaveValue('20');

  await page.getByRole('radio', { name: /専門科目\s*511問/ }).check();
  await expect(page.getByRole('checkbox', { name: /過去問\s*126問/ })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /予想問題\s*116問/ })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /予想事例問題\s*269問/ })).toBeChecked();
  await expect(page.getByRole('button', { name: '20問の演習を開始' })).toBeEnabled();

  await page.getByRole('button', { name: '20問の演習を開始' }).click();
  await expect(page.getByRole('heading', { name: '1問ずつ演習' })).toBeVisible();

  let dialogCount = 0;
  page.on('dialog', async (dialog) => {
    dialogCount += 1;
    expect(dialog.message()).toContain('演習を終了しますか');
    if (dialogCount === 1) await dialog.dismiss();
    else await dialog.accept();
  });

  await page.getByRole('button', { name: '演習を終了' }).click();
  await expect(page.getByRole('heading', { name: '1問ずつ演習' })).toBeVisible();

  await page.getByRole('button', { name: '演習を終了' }).click();
  await expect(page.getByRole('heading', { name: '問題' })).toBeVisible();
  expect(dialogCount).toBe(2);
});
