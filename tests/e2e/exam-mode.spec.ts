import { expect, test, type Page } from '@playwright/test';

async function loadSample(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'データ管理' }).click();
  await page.getByRole('button', { name: 'サンプルを読み込む' }).click();
  await expect(page.getByRole('status')).toContainText('Schema 0.5対応');
}

async function openExam(page: Page, timer = false) {
  await page.getByRole('button', { name: '演習' }).click();
  await page.getByRole('radio', { name: /試験モード/ }).check();
  if (timer) await page.getByLabel('試験タイマー').selectOption('30');
  await page.getByRole('button', { name: '1問の試験を開始' }).click();
  await expect(page.getByRole('heading', { name: '試験モード' })).toBeVisible();
}

test('keeps scoring hidden during exam and records the final wrong answer', async ({ page }) => {
  await loadSample(page);
  await openExam(page, true);

  await expect(page.getByRole('timer')).toContainText('残り時間');
  await expect(page.getByRole('button', { name: '回答を確定する' })).toHaveCount(0);
  await expect(page.getByText('正式解答解説')).toHaveCount(0);

  await page.getByRole('radio', { name: /A\s*Dexie/i }).check();
  await expect(page.getByText('不正解', { exact: true })).toHaveCount(0);
  await expect(page.getByText('正答：')).toHaveCount(0);

  await page.getByRole('button', { name: '試験を終了して採点' }).click();
  const result = page.getByRole('region', { name: '試験結果' });
  await expect(result.getByRole('heading', { name: '試験結果' })).toBeVisible();
  await expect(result.locator('.exam-result-grid')).toContainText('0%');
  await expect(result.locator('.exam-attention-list')).toContainText('不正解');
  await expect(result.locator('.exam-attention-list')).toContainText('SAMPLE-Q-001');

  await result.getByRole('button', { name: '問題一覧へ戻る' }).click();
  await page.getByRole('button', { name: '分析' }).click();
  const dashboard = page.getByRole('region', { name: '学習ダッシュボード' });
  await expect(dashboard.locator('.dashboard-metric').filter({ hasText: '総回答' })).toContainText('1回');
  await expect(dashboard.locator('.dashboard-attention-list')).toContainText('不正解');
});

test('keeps an unanswered exam question out of learning attempts', async ({ page }) => {
  await loadSample(page);
  await openExam(page);

  await page.getByRole('button', { name: '試験を終了して採点' }).click();
  const result = page.getByRole('region', { name: '試験結果' });
  await expect(result.locator('.exam-result-grid')).toContainText('未回答');
  await expect(result.locator('.exam-attention-list')).toContainText('未回答');

  await result.getByRole('button', { name: '問題一覧へ戻る' }).click();
  await page.getByRole('button', { name: '分析' }).click();
  const dashboard = page.getByRole('region', { name: '学習ダッシュボード' });
  await expect(dashboard.locator('.dashboard-metric').filter({ hasText: '総回答' })).toContainText('0回');
  await expect(dashboard.locator('.dashboard-metric').filter({ hasText: '未回答' })).toContainText('1問');
});
