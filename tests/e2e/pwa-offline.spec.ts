import { expect, test, type Page } from '@playwright/test';

const questionPrompt = '正式Deliveryデータを実行時検証するライブラリはどれですか。';

async function waitForServiceWorkerControl(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
}

async function loadSample(page: Page) {
  await page.getByRole('button', { name: 'データ管理' }).click();
  await page.getByRole('button', { name: 'サンプルを読み込む' }).click();
  await expect(page.getByRole('status')).toContainText('Schema 0.5対応');
}

test('serves a complete installable manifest and final PWA icons', async ({ request }) => {
  const manifestResponse = await request.get('/manifest.webmanifest');
  expect(manifestResponse.ok()).toBe(true);
  const manifest = (await manifestResponse.json()) as {
    id?: string;
    start_url?: string;
    scope?: string;
    display?: string;
    icons?: Array<{ src: string; sizes?: string; purpose?: string }>;
  };

  expect(manifest).toMatchObject({
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone'
  });
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ src: '/icons/icon-192.png', sizes: '192x192' }),
      expect.objectContaining({ src: '/icons/icon-512.png', sizes: '512x512', purpose: 'any' }),
      expect.objectContaining({ src: '/icons/icon-512.png', sizes: '512x512', purpose: 'maskable' })
    ])
  );

  const [icon192, icon512] = await Promise.all([
    request.get('/icons/icon-192.png'),
    request.get('/icons/icon-512.png')
  ]);
  expect(icon192.ok()).toBe(true);
  expect(icon192.headers()['content-type']).toContain('image/png');
  expect(icon512.ok()).toBe(true);
  expect(icon512.headers()['content-type']).toContain('image/png');
});

test('surfaces beforeinstallprompt as an install action', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('接続状態: オンライン')).toBeVisible();
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.defineProperty(event, 'prompt', {
      value: () => {
        (window as unknown as { __installPromptCalled?: boolean }).__installPromptCalled = true;
        return Promise.resolve();
      }
    });
    Object.defineProperty(event, 'userChoice', {
      value: Promise.resolve({ outcome: 'accepted', platform: 'web' })
    });
    window.dispatchEvent(event);
  });

  const installButton = page.getByRole('button', { name: 'アプリをインストール' });
  await expect(installButton).toBeVisible();
  await installButton.click();
  await expect(page.getByText('インストール済み', { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { __installPromptCalled?: boolean }).__installPromptCalled
    )
  ).toBe(true);
});

test('reloads offline from the service worker and keeps IndexedDB study progress', async ({ page, context }) => {
  await waitForServiceWorkerControl(page);
  await loadSample(page);

  await context.setOffline(true);
  await expect(page.getByLabel('接続状態: オフライン')).toBeVisible();
  await page.reload();

  await expect(page.getByRole('button', { name: 'ホーム' })).toBeVisible();
  await expect(page.getByText('sample-0.9-master-import')).toBeVisible();
  await expect(page.getByLabel('接続状態: オフライン')).toBeVisible();

  await page.getByRole('button', { name: '問題', exact: true }).click();
  await expect(page.getByText(questionPrompt)).toBeVisible();
  await page.getByRole('button', { name: '1問からセットを作成' }).click();
  await page.getByRole('button', { name: '1問の演習を開始' }).click();
  await page.getByRole('radio', { name: /B\s*Zod/i }).check();
  await page.getByRole('button', { name: '回答を確定する' }).click();
  await expect(page.getByRole('status')).toContainText('正解');

  await page.reload();
  await page.getByRole('button', { name: '問題', exact: true }).click();
  await page.getByLabel('学習状態').selectOption('correct');
  await expect(page.getByText(questionPrompt)).toBeVisible();

  await context.setOffline(false);
});
