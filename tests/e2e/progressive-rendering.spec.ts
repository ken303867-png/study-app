import { Buffer } from 'node:buffer';
import { expect, test } from '@playwright/test';
import { sampleDataset } from '../../src/data/sampleDataset';
import type { DatasetInput } from '../../src/schemas/contentSchemas';

const LARGE_QUESTION_COUNT = 65;

function buildLargeDataset(): DatasetInput {
  const baseQuestion = sampleDataset.questions[0];
  const baseMaterial = sampleDataset.materials[0];
  const baseOccurrence = sampleDataset.sourceOccurrences[0];
  if (!baseQuestion || !baseMaterial || !baseOccurrence) {
    throw new Error('sample fixture is incomplete');
  }

  const ids = Array.from({ length: LARGE_QUESTION_COUNT }, (_, index) =>
    `PERF-E2E-Q-${String(index + 1).padStart(3, '0')}`
  );

  return {
    datasetVersion: 'progressive-rendering-e2e',
    schemaVersion: '0.5',
    questions: ids.map((id, index) => ({
      ...baseQuestion,
      id,
      prompt: `Progressive E2E ${String(index + 1).padStart(3, '0')}`,
      relatedMaterialIds: [baseMaterial.id]
    })),
    materials: [
      {
        ...baseMaterial,
        relatedQuestionIds: ids
      }
    ],
    sources: sampleDataset.sources,
    sourceOccurrences: ids.map((id, index) => ({
      ...baseOccurrence,
      source_occurrence_id: `PERF-E2E-OCC-${String(index + 1).padStart(3, '0')}`,
      canonical_question_id: id,
      source_question_no: index + 1,
      source_occurrence_order: index + 1
    })),
    media: []
  };
}

test('progressively renders a large question list and preserves direct navigation', async ({ page }) => {
  const dataset = buildLargeDataset();

  await page.goto('/');
  await page.getByRole('button', { name: 'データ管理' }).click();
  await page.getByLabel('正式データExcelまたはJSONファイル').setInputFiles({
    name: 'progressive-rendering-e2e.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(dataset), 'utf8')
  });
  await expect(page.getByRole('status')).toContainText('65問 / 65出題出現 / Schema 0.5');

  await page.getByRole('button', { name: '問題', exact: true }).click();
  await expect(page.locator('.question-card')).toHaveCount(30);
  await expect(page.getByText('30 / 65問を表示中')).toBeVisible();
  await expect(page.getByRole('button', { name: '65問からセットを作成' })).toBeEnabled();

  await page.getByRole('button', { name: 'さらに30問表示' }).click();
  await expect(page.locator('.question-card')).toHaveCount(60);
  await expect(page.getByText('60 / 65問を表示中')).toBeVisible();

  await page.getByRole('button', { name: '資料', exact: true }).click();
  await page.getByRole('button', { name: '関連問題を開く: PERF-E2E-Q-065' }).click();
  await expect(page.locator('#question-PERF-E2E-Q-065')).toBeVisible();
  await expect(page.locator('#question-PERF-E2E-Q-065')).toHaveClass(/targeted/);
  await expect(page.locator('.question-card')).toHaveCount(65);
});
