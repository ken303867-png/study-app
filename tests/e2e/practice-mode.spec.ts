import { expect, test, type Page } from '@playwright/test';

const questionPrompt = '正式Deliveryデータを実行時検証するライブラリはどれですか。';

async function loadSample(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'データ管理' }).click();
  await page.getByRole('button', { name: 'サンプルを読み込む' }).click();
  await expect(page.getByRole('status')).toContainText('Schema 0.5対応');
}

async function openSetBuilderFromQuestions(page: Page) {
  await page.getByRole('button', { name: '問題', exact: true }).click();
  await expect(page.getByText(questionPrompt)).toBeVisible();
  await page.getByRole('button', { name: '1問からセットを作成' }).click();
  await expect(page.getByRole('region', { name: '演習セット作成' })).toBeVisible();
}

async function startDefaultPractice(page: Page) {
  await loadSample(page);
  await openSetBuilderFromQuestions(page);
  await page.getByRole('button', { name: '1問の演習を開始' }).click();
  await expect(page.getByRole('heading', { name: '1問ずつ演習' })).toBeVisible();
}

test('builds a practice set and records a correct answer with formal explanation', async ({ page }) => {
  await startDefaultPractice(page);

  await page.getByRole('radio', { name: /B\s*Zod/i }).check();
  await page.getByRole('button', { name: '回答を確定する' }).click();

  const feedback = page.getByRole('status');
  await expect(feedback).toContainText('正解');
  await expect(feedback).toContainText('正答：B. Zod');
  await expect(page.locator('.practice-local-state')).toContainText('累計 1回');

  const practice = page.getByRole('region', { name: '1問ずつ演習' });
  await expect(practice.getByRole('heading', { name: '正解に至る考え方' })).toBeVisible();
  await expect(practice.getByRole('heading', { name: '各選択肢解説' })).toBeVisible();

  await page.getByRole('button', { name: '結果を見る' }).click();
  const result = page.getByRole('region', { name: '演習結果' });
  await expect(result.getByText('100%', { exact: true })).toBeVisible();
  await expect(result.getByText('1', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: '問題一覧へ戻る' }).click();
  await page.getByLabel('学習状態').selectOption('correct');
  await expect(page.getByText(questionPrompt)).toBeVisible();
});

test('marks a wrong answer for review and creates a review-only practice set', async ({ page }) => {
  await startDefaultPractice(page);

  await page.getByRole('radio', { name: /A\s*Dexie/i }).check();
  await page.getByRole('button', { name: '回答を確定する' }).click();

  await expect(page.getByRole('status')).toContainText('不正解');
  await expect(page.locator('.practice-local-state')).toContainText('累計 1回');
  await expect(page.getByRole('button', { name: '要復習 ✓' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: '演習を終了' }).click();
  await page.getByRole('button', { name: 'ホーム' }).click();
  await expect(page.getByRole('button', { name: '要復習 1問から作成' })).toBeEnabled();
  await page.getByRole('button', { name: '要復習 1問から作成' }).click();

  const builder = page.getByRole('region', { name: '演習セット作成' });
  await expect(builder.getByRole('radio', { name: /要復習\s*1問/ })).toBeChecked();
  await builder.getByLabel('出題順').selectOption('random');
  await expect(builder.getByLabel('出題順')).toHaveValue('random');
  await builder.getByRole('button', { name: '1問の演習を開始' }).click();

  await expect(page.getByText(questionPrompt)).toBeVisible();
  await page.getByRole('radio', { name: /B\s*Zod/i }).check();
  await page.getByRole('button', { name: '回答を確定する' }).click();
  await expect(page.getByRole('status')).toContainText('正解');
  await expect(page.locator('.practice-local-state')).toContainText('累計 2回');
  await expect(page.getByRole('button', { name: '要復習 ✓' })).toHaveAttribute('aria-pressed', 'true');
});

test('shows empty learning-state presets without allowing an empty practice session', async ({ page }) => {
  await loadSample(page);
  await page.getByRole('button', { name: '演習', exact: true }).click();

  const builder = page.getByRole('region', { name: '演習セット作成' });
  await builder.getByRole('radio', { name: /お気に入り\s*0問/ }).check();
  await expect(builder.getByRole('status')).toContainText('この条件に一致する問題はありません');
  await expect(builder.getByRole('button', { name: '0問の演習を開始' })).toBeDisabled();
});
