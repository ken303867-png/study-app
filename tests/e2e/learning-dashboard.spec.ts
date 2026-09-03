import { expect, test, type Locator, type Page } from '@playwright/test';

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

async function logMobileHitTest(page: Page, locator: Locator, label: string) {
  if ((page.viewportSize()?.width ?? 9999) > 760) return;
  await locator.scrollIntoViewIfNeeded();
  const diagnostic = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const style = window.getComputedStyle(element);
    const nav = document.querySelector('.top-nav');
    const navStyle = nav ? window.getComputedStyle(nav) : null;
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight, scrollY: window.scrollY },
      target: {
        tag: element.tagName,
        className: element.className,
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        display: style.display,
        position: style.position,
        zIndex: style.zIndex
      },
      nav: navStyle ? { position: navStyle.position, zIndex: navStyle.zIndex } : null,
      point: { x, y },
      stack: document.elementsFromPoint(x, y).slice(0, 8).map((node) => ({
        tag: node.tagName,
        className: (node as HTMLElement).className,
        text: node.textContent?.trim().slice(0, 60) ?? ''
      }))
    };
  });
  console.log(`[dashboard-hit-test:${label}] ${JSON.stringify(diagnostic)}`);
}

test('summarizes learning history and launches a review set from the weakest subject', async ({ page }) => {
  await loadSample(page);
  await recordWrongPracticeAttempt(page);

  await page.getByRole('button', { name: '分析' }).click();
  const dashboard = page.getByRole('region', { name: '学習ダッシュボード' });
  await expect(dashboard.getByRole('heading', { name: '学習ダッシュボード' })).toBeVisible();

  await expect(dashboard.locator('.dashboard-metric').filter({ hasText: '学習済み' })).toContainText('1 / 1');
  await expect(dashboard.locator('.dashboard-metric').filter({ hasText: '総回答' })).toContainText('1回');
  await expect(dashboard.locator('.dashboard-metric').filter({ hasText: '正答率' })).toContainText('0%');
  await expect(dashboard.locator('.dashboard-metric').filter({ hasText: '要復習' })).toContainText('1問');

  const subjectPriority = dashboard
    .locator('.dashboard-priority-panel')
    .filter({ has: page.getByRole('heading', { name: '復習優先 科目' }) });
  await expect(subjectPriority).toContainText('サンプル科目');
  await expect(subjectPriority).toContainText('正答率 0%');
  await expect(subjectPriority).toContainText('要復習 1問');

  const recentAttention = dashboard.locator('.dashboard-attention-list');
  await expect(recentAttention).toContainText(questionPrompt);
  await expect(recentAttention).toContainText('不正解');

  const reviewButton = subjectPriority.getByRole('button', { name: '復習セット' });
  await logMobileHitTest(page, reviewButton, 'review-button');
  await reviewButton.click();
  await expect(page.getByRole('heading', { name: '演習セットを作成' })).toBeVisible();
  await expect(page.getByText('母集団：サンプル科目 / 1問')).toBeVisible();
  await expect(page.getByRole('radio', { name: /要復習/ })).toBeChecked();
  await expect(page.getByRole('button', { name: '1問の演習を開始' })).toBeEnabled();
});

test('opens a recent incorrect question directly from the dashboard', async ({ page }) => {
  await loadSample(page);
  await recordWrongPracticeAttempt(page);

  await page.getByRole('button', { name: '分析' }).click();
  const dashboard = page.getByRole('region', { name: '学習ダッシュボード' });
  const attentionItem = dashboard.locator('.dashboard-attention-item');
  await logMobileHitTest(page, attentionItem, 'attention-item');
  await attentionItem.click();

  await expect(page.getByText(questionPrompt)).toBeVisible();
  await expect(page.locator('.question-card.targeted')).toContainText('SAMPLE-Q-001');
});
