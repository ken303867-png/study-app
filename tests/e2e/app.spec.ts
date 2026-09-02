import { Buffer } from 'node:buffer';
import { expect, test } from '@playwright/test';
import fixture from '../fixtures/canonical-master-sample.json';
import { canonicalMasterExportSchema } from '../../src/schemas/masterDataSchemas';
import {
  buildCanonicalMasterXlsx,
  buildWorkbookXlsx
} from '../helpers/buildCanonicalMasterXlsx';

test('loads schema 0.5 sample and renders formal explanation order', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '学習アプリ v0.7.1' })).toBeVisible();
  await page.getByRole('button', { name: 'データ管理' }).click();
  await page.getByRole('button', { name: 'サンプルを読み込む' }).click();
  await expect(page.getByRole('status')).toContainText('Schema 0.5対応');
  await page.getByRole('button', { name: '問題' }).click();
  await expect(page.getByText('正式Deliveryデータを実行時検証するライブラリはどれですか。')).toBeVisible();

  await page.getByText('解答解説を表示').click();
  const explanation = page.locator('.explanation-stack');
  await expect(explanation.getByRole('heading', { name: '解答' })).toBeVisible();
  await expect(explanation.getByRole('heading', { name: 'この問題で問われていること' })).toBeVisible();
  await expect(explanation.getByRole('heading', { name: '正解に至る考え方' })).toBeVisible();
  await expect(explanation.getByRole('heading', { name: '各選択肢解説' })).toBeVisible();
  await expect(explanation.getByRole('heading', { name: '試験で覚える要点' })).toBeVisible();
  await expect(explanation.getByRole('heading', { name: '参考文献・根拠' })).toBeVisible();
  await expect(explanation.getByText('MEDIA placement確認用の非正式プレースホルダー')).toBeVisible();
});

test('imports canonical master JSON, converts it, and stores delivery data', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'データ管理' }).click();

  await page
    .getByLabel('正式データExcelまたはJSONファイル')
    .setInputFiles('tests/fixtures/canonical-master-sample.json');

  await expect(page.getByRole('status')).toContainText('JSON → Canonical Masterを読み込みました');
  await expect(page.getByRole('status')).toContainText('1問 / 1出題出現 / Schema 0.5');

  await page.getByRole('button', { name: '問題' }).click();
  await expect(
    page.getByText('Canonical MasterからDeliveryへ変換する工程はどれですか。')
  ).toBeVisible();
  await expect(page.getByText('非正式S-QUE形式QA fixture')).toBeVisible();
  await expect(page.getByText('除外問題です。')).toHaveCount(0);
});

test('imports a deflated canonical master xlsx end-to-end in Chromium', async ({ page }) => {
  const master = canonicalMasterExportSchema.parse(fixture);
  const xlsx = await buildCanonicalMasterXlsx(master);

  await page.goto('/');
  await page.getByRole('button', { name: 'データ管理' }).click();
  await page.getByLabel('正式データExcelまたはJSONファイル').setInputFiles({
    name: 'pilot-master.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(xlsx)
  });

  await expect(page.getByRole('status')).toContainText('Excel正本 → Canonical Masterを読み込みました');
  await expect(page.getByRole('status')).toContainText('1問 / 1出題出現 / Schema 0.5');

  await page.getByRole('button', { name: '問題' }).click();
  await expect(
    page.getByText('Canonical MasterからDeliveryへ変換する工程はどれですか。')
  ).toBeVisible();
  await expect(page.getByText('非正式S-QUE形式QA fixture')).toBeVisible();
  await expect(page.getByText('除外問題です。')).toHaveCount(0);
});

test('legacy 709 xlsx preflight blocks lossy conversion and keeps prior data', async ({ page }) => {
  const legacyXlsx = await buildWorkbookXlsx([
    {
      name: '統合709_学習マスター',
      rows: [
        ['学習ID', '問題文', '選択肢A', '選択肢B', '選択肢C', '選択肢D', '正答'],
        ['LEGACY-001', '非正式旧正本QA問題', 'A', 'B', 'C', 'D', 'B']
      ]
    }
  ]);

  await page.goto('/');
  await page.getByRole('button', { name: 'データ管理' }).click();
  await page.getByRole('button', { name: 'サンプルを読み込む' }).click();
  await expect(page.getByRole('status')).toContainText('Schema 0.5対応');

  await page.getByLabel('正式データExcelまたはJSONファイル').setInputFiles({
    name: 'legacy-v1.47.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(legacyXlsx)
  });

  const alert = page.getByRole('alert');
  await expect(alert).toContainText('旧v1.47系709問Excel正本');
  await expect(alert).toContainText('SOURCE_OCCURRENCES');
  await expect(alert).toContainText('source_answer');

  await page.getByRole('button', { name: '問題' }).click();
  await expect(page.getByText('正式Deliveryデータを実行時検証するライブラリはどれですか。')).toBeVisible();
  await expect(page.getByText('非正式旧正本QA問題')).toHaveCount(0);
});
