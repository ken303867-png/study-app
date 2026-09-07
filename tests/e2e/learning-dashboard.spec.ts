import { expect, test, type Page } from '@playwright/test';

const questionPrompt = '正式Deliveryデータを実行時検証するライブラリはどれですか。';

async function loadSample(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'データ管理' }).click();
  await page.getByRole('button', { name: 'サンプルを読み込む' }).click();
  await expect(page.getByRole('status')).toContainText('Schema 0.5対応');
}

async function recordWrongPracticeAttempt(page: Page) {
  await page.getByRole('button', { name: '問題', exact: true }).click();
  await page.getByRole('button', { name: '1問からセットを作成' }).click();
  await expect(page.getByRole('heading', { name: '演習セットを作成' })).toBeVisible();
  await page.getByRole('button', { name: '1問の演習を開始' }).click();
  await page.getByRole('radio', { name: /A\s*Dexie/i }).check();
  await page.getByRole('button', { name: '回答を確定する' }).click();
  await expect(page.getByRole('status')).toContainText('不正解');
}

test('summarizes learning history and launches weakness/review sets from the dashboard', async ({ page }) => {
  await loadSample(page);
  await recordWrongPracticeAttempt(page);

  await page.getByRole('button', { name: '分析' }).click();
  const dashboard = page.getByRole('region', { name: '学習ダッシュボード' });
  await expect(dashboard.getByRole('heading', { name: '学習ダッシュボード' })).toBeVisible();

  await expect(dashboard.locator('.dashboard-metric').filter({ hasText: '学習済み' })).toContainText('1 / 1');
  await expect(dashboard.locator('.dashboard-metric').filter({ hasText: '総回答' })).toContainText('1回');
  await expect(dashboard.locator('.dashboard-metric').filter({ hasText: '正答率' })).toContainText('0%');
  await expect(dashboard.locator('.dashboard-metric').filter({ hasText: '弱点候補' })).toContainText('1問');
  await expect(dashboard.locator('.dashboard-metric').filter({ hasText: '要復習' })).toContainText('1問');

  const weaknessPanel = dashboard
    .locator('.panel')
    .filter({ has: page.getByRole('heading', { name: '弱点優先問題' }) });
  await expect(weaknessPanel).toContainText(questionPrompt);
  await expect(weaknessPanel).toContainText(/弱点 \d+/);

  await weaknessPanel.getByRole('button', { name: '弱点優先セットを作成' }).click();
  await expect(page.getByRole('heading', { name: '演習セットを作成' })).toBeVisible();
  await expect(page.getByRole('radio', { name: /弱点優先/ })).toBeChecked();
  const orderSelect = page.getByLabel('出題順');
  await expect(orderSelect).toHaveValue('sequential');
  await expect(orderSelect.locator('option:checked')).toHaveText('弱点スコア順');
  await expect(page.getByRole('button', { name: '1問の演習を開始' })).toBeEnabled();

  await page.getByRole('button', { name: '問題一覧へ戻る' }).click();
  await page.getByRole('button', { name: '分析' }).click();

  const subjectPriority = dashboard
    .locator('.dashboard-priority-panel')
    .filter({ has: page.getByRole('heading', { name: '復習優先 科目' }) });
  await expect(subjectPriority).toContainText('サンプル科目');
  await expect(subjectPriority).toContainText('正答率 0%');
  await expect(subjectPriority).toContainText('要復習 1問');

  const recentPanel = dashboard
    .locator('.panel')
    .filter({ has: page.getByRole('heading', { name: '直近の要注意問題' }) });
  await expect(recentPanel).toContainText(questionPrompt);
  await expect(recentPanel).toContainText('不正解');

  await subjectPriority.getByRole('button', { name: '復習セット' }).click();
  await expect(page.getByRole('heading', { name: '演習セットを作成' })).toBeVisible();
  await expect(page.getByText('母集団：共通科目 / 1問')).toBeVisible();
  await expect(page.getByRole('radio', { name: /要復習/ })).toBeChecked();
  await expect(page.getByRole('button', { name: '1問の演習を開始' })).toBeEnabled();
});

test('opens a recent incorrect question directly from the dashboard', async ({ page }) => {
  await loadSample(page);
  await recordWrongPracticeAttempt(page);

  await page.getByRole('button', { name: '分析' }).click();
  const dashboard = page.getByRole('region', { name: '学習ダッシュボード' });
  const recentPanel = dashboard
    .locator('.panel')
    .filter({ has: page.getByRole('heading', { name: '直近の要注意問題' }) });
  await recentPanel.locator('.dashboard-attention-item').click();

  await expect(page.getByText(questionPrompt)).toBeVisible();
  await expect(page.locator('.question-card.targeted')).toContainText('SAMPLE-Q-001');
});
