import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { expect, test } from '@playwright/test';

function sha256(data: string | Buffer) {
  return createHash('sha256').update(data).digest('hex');
}

function makeDataset() {
  return {
    datasetVersion: 'qa-public-auto-sync-1.0',
    schemaVersion: '0.5',
    questions: [
      {
        id: 'QA-PUBLIC-JNA-001',
        subject: '共通科目 synthetic',
        unit: '公開同期QA',
        topic: '初回自動取得',
        sourceType: 'japan-nursing-association',
        sourceLabel: 'Public auto sync synthetic fixture',
        questionFormat: 'single-choice',
        importance: 'B',
        prompt: 'URLを開いたときに問題データを自動取得できるか確認するsynthetic問題です。',
        explanation: {
          answer: 'A. 選択肢A',
          question_intent: '公開Datasetの自動同期フローを確認する。',
          reasoning: 'synthetic fixtureでは選択肢Aを正答とする。',
          choice_explanations: [
            {
              target_key: '1',
              display_order: 1,
              judgement: 'correct',
              reason: 'synthetic fixtureの正答である。',
              correction_condition: '修正不要。',
              mapping_provenance: 'source_structured'
            },
            {
              target_key: '2',
              display_order: 2,
              judgement: 'incorrect',
              reason: 'synthetic fixtureでは誤答である。',
              correction_condition: '選択肢Aなら正答となる。',
              mapping_provenance: 'source_structured'
            },
            {
              target_key: '3',
              display_order: 3,
              judgement: 'incorrect',
              reason: 'synthetic fixtureでは誤答である。',
              correction_condition: '選択肢Aなら正答となる。',
              mapping_provenance: 'source_structured'
            },
            {
              target_key: '4',
              display_order: 4,
              judgement: 'incorrect',
              reason: 'synthetic fixtureでは誤答である。',
              correction_condition: '選択肢Aなら正答となる。',
              mapping_provenance: 'source_structured'
            }
          ],
          key_points: '初回アクセスで自動同期する。',
          references: 'Study App synthetic public auto sync fixture'
        },
        relatedMaterialIds: [],
        tags: ['learning-area:common', 'question-kind:common-jna'],
        revision: 1,
        choices: ['選択肢A', '選択肢B', '選択肢C', '選択肢D'],
        correctChoiceIndexes: [0]
      }
    ],
    materials: [],
    sources: [
      {
        source_id: 'QA-PUBLIC-SRC',
        source_group: 'qa-public-auto-sync',
        title: 'Public auto sync synthetic source',
        answer_authority: 'provided'
      }
    ],
    sourceOccurrences: [
      {
        source_occurrence_id: 'QA-PUBLIC-OCC-001',
        canonical_question_id: 'QA-PUBLIC-JNA-001',
        source_id: 'QA-PUBLIC-SRC',
        source_set_id: 'QA-PUBLIC-SET',
        source_occurrence_order: 1,
        source_question_no: 1,
        source_answer: '1',
        source_prompt_snapshot: '公開同期QA synthetic prompt'
      }
    ],
    media: []
  };
}

test('downloads the public dataset once and reuses IndexedDB after reload', async ({ page }) => {
  const datasetText = JSON.stringify(makeDataset());
  const packText = `common-base\t${datasetText}\n`;
  const compressed = gzipSync(Buffer.from(packText, 'utf8'), { level: 9 });
  const manifest = {
    schemaVersion: 1,
    releaseVersion: 'qa-public-release-1',
    appMinVersion: '0.17.0',
    expected: {
      questionsTotal: 1,
      materials: 0,
      sourceOccurrences: 1,
      kinds: {
        'common-jna': 1,
        'common-cloze': 0,
        'common-predicted': 0,
        'specialty-past': 0,
        'specialty-predicted': 0,
        'specialty-predicted-case': 0
      }
    },
    bundle: {
      path: 'qa-public.pack.gz',
      compression: 'gzip',
      sha256: sha256(compressed)
    },
    datasets: [
      {
        order: 1,
        role: 'common-base',
        originalSha256: sha256(datasetText),
        questionCount: 1
      }
    ]
  };

  let bundleRequests = 0;
  await page.route('**/public-data/manifest.json', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(manifest)
    });
  });
  await page.route('**/public-data/qa-public.pack.gz', async (route) => {
    bundleRequests += 1;
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.fulfill({ status: 200, contentType: 'application/gzip', body: compressed });
  });

  await page.goto('/?publicSync=1');
  await expect(page.getByRole('heading', { name: '問題データを準備しています' })).toBeVisible();
  await expect(page.getByText('ステップ 2 / 4')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText('問題データを取得')).toBeVisible();

  await expect(page.getByRole('heading', { name: '学習アプリ v0.17.0' })).toBeVisible();
  await expect(page.getByText('QA-PUBLIC-JNA-001')).toHaveCount(0);
  await page.getByRole('button', { name: '問題', exact: true }).click();
  await expect(page.getByText('URLを開いたときに問題データを自動取得できるか確認するsynthetic問題です。')).toBeVisible();
  expect(bundleRequests).toBe(1);

  await page.reload();
  await expect(page.getByRole('heading', { name: '学習アプリ v0.17.0' })).toBeVisible();
  expect(bundleRequests).toBe(1);
});
