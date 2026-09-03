import { expect, test, type Page } from '@playwright/test';

const questionPrompt = '正式Deliveryデータを実行時検証するライブラリはどれですか。';

async function loadSample(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'データ管理' }).click();
  await page.getByRole('button', { name: 'サンプルを読み込む' }).click();
  await expect(page.getByRole('status')).toContainText('Schema 0.5対応');
}

test('runs the Phase 8 cross-feature learning flow without losing local history', async ({ page }) => {
  await loadSample(page);

  // Question → material → question round trip.
  await page.getByRole('button', { name: '問題', exact: true }).click();
  await expect(page.getByText(questionPrompt)).toBeVisible();
  await page.getByRole('button', { name: '関連資料を開く: 正式データ処理フロー' }).click();
  await expect(page.locator('#material-SAMPLE-M-001')).toHaveClass(/targeted/);
  await expect(page.getByRole('heading', { name: '正式データ処理フロー' })).toBeVisible();
  await page.getByRole('button', { name: '関連問題を開く: SAMPLE-Q-001' }).click();
  await expect(page.locator('#question-SAMPLE-Q-001')).toHaveClass(/targeted/);

  // Record a wrong answer and verify analytics/review routing.
  await page.getByRole('button', { name: '1問からセットを作成' }).click();
  await page.getByRole('button', { name: '1問の演習を開始' }).click();
  await page.getByRole('radio', { name: /A\s*Dexie/i }).check();
  await page.getByRole('button', { name: '回答を確定する' }).click();
  await expect(page.getByRole('status')).toContainText('不正解');
  await page.getByRole('button', { name: '演習を終了' }).click();

  await page.getByRole('button', { name: '分析' }).click();
  const dashboard = page.getByRole('region', { name: '学習ダッシュボード' });
  await expect(dashboard.locator('.dashboard-metric').filter({ hasText: '総回答' })).toContainText('1回');
  await expect(dashboard.locator('.dashboard-metric').filter({ hasText: '要復習' })).toContainText('1問');
  await expect(dashboard.locator('.dashboard-attention-list')).toContainText('不正解');

  const subjectPriority = dashboard
    .locator('.dashboard-priority-panel')
    .filter({ has: page.getByRole('heading', { name: '復習優先 科目' }) });
  await subjectPriority.getByRole('button', { name: '復習セット' }).click();
  await expect(page.getByRole('radio', { name: /要復習/ })).toBeChecked();
  await page.getByRole('button', { name: '1問の演習を開始' }).click();
  await page.getByRole('radio', { name: /B\s*Zod/i }).check();
  await page.getByRole('button', { name: '回答を確定する' }).click();
  await expect(page.getByRole('status')).toContainText('正解');
  await expect(page.locator('.practice-local-state')).toContainText('累計 2回');
  await page.getByRole('button', { name: '演習を終了' }).click();

  // Re-import content and verify learning history remains independent.
  await page.getByRole('button', { name: 'データ管理' }).click();
  await page.getByRole('button', { name: 'サンプルを読み込む' }).click();
  await expect(page.getByRole('status')).toContainText('Schema 0.5対応');
  await page.getByRole('button', { name: '問題', exact: true }).click();
  await page.getByLabel('学習状態').selectOption('correct');
  await expect(page.getByText(questionPrompt)).toBeVisible();

  // Finish with exam mode to confirm the same persisted content remains usable.
  await page.getByRole('button', { name: '演習', exact: true }).click();
  await page.getByRole('radio', { name: /試験モード/ }).check();
  await page.getByRole('button', { name: '1問の試験を開始' }).click();
  await expect(page.getByRole('heading', { name: '試験モード' })).toBeVisible();
  await expect(page.getByText('正式解答解説')).toHaveCount(0);
  await page.getByRole('button', { name: '試験を終了して採点' }).click();
  const examResult = page.getByRole('region', { name: '試験結果' });
  await expect(examResult).toContainText('未回答');
});
