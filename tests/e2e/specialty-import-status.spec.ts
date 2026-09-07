import { Buffer } from 'node:buffer';
import { expect, test, type Page } from '@playwright/test';

type SpecialtyKey = 'specialty-past' | 'specialty-predicted' | 'specialty-predicted-case';

const TARGETS: Record<SpecialtyKey, number> = {
  'specialty-past': 126,
  'specialty-predicted': 116,
  'specialty-predicted-case': 269
};

function makeSupplemental(key: SpecialtyKey) {
  const count = TARGETS[key];
  const supplementalTag = `supplemental:${key}`;
  const sourceId = `QA-${key}-SRC`;
  const sourceType = key === 'specialty-past' ? 'past-exam' : 'predicted';

  return {
    importMode: 'supplemental-replace',
    supplementalKey: key,
    datasetVersion: `qa-${key}-${count}`,
    schemaVersion: '0.5',
    questions: Array.from({ length: count }, (_, index) => {
      const no = String(index + 1).padStart(3, '0');
      const id = `QA-${key}-${no}`;
      return {
        id,
        subject: '専門分野：摂食・嚥下障害看護',
        unit: key === 'specialty-predicted-case' ? '状況設定・事例' : '専門知識',
        topic: `${key} status QA`,
        sourceType,
        sourceLabel: `${key} status QA fixture`,
        questionFormat: 'single-choice',
        importance: 'B',
        prompt: `${key} 保存件数表示QA ${no}`,
        explanation: {
          answer: 'A. 選択肢A',
          question_intent: '専門科目の保存件数表示を検証する。',
          reasoning: 'QA fixtureでは選択肢Aを正答として設定している。',
          choice_explanations: [
            {
              target_key: 'A',
              display_order: 1,
              judgement: 'correct',
              reason: 'QA fixtureの正答である。',
              correction_condition: 'N/A',
              mapping_provenance: 'source_structured'
            },
            {
              target_key: 'B',
              display_order: 2,
              judgement: 'incorrect',
              reason: 'QA fixtureの誤答である。',
              correction_condition: '選択肢Aなら正答となる。',
              mapping_provenance: 'source_structured'
            },
            {
              target_key: 'C',
              display_order: 3,
              judgement: 'incorrect',
              reason: 'QA fixtureの誤答である。',
              correction_condition: '選択肢Aなら正答となる。',
              mapping_provenance: 'source_structured'
            },
            {
              target_key: 'D',
              display_order: 4,
              judgement: 'incorrect',
              reason: 'QA fixtureの誤答である。',
              correction_condition: '選択肢Aなら正答となる。',
              mapping_provenance: 'source_structured'
            }
          ],
          key_points: '専門科目の保存件数を分類tagから集計する。',
          references: 'Study App specialty import status QA fixture'
        },
        relatedMaterialIds: [],
        tags: [supplementalTag, 'learning-area:specialty', `question-kind:${key}`],
        revision: 1,
        choices: ['選択肢A', '選択肢B', '選択肢C', '選択肢D'],
        correctChoiceIndexes: [0]
      };
    }),
    materials: [],
    sources: [
      {
        source_id: sourceId,
        source_group: supplementalTag,
        title: `${key} status QA fixture`,
        answer_authority: 'provided'
      }
    ],
    sourceOccurrences: Array.from({ length: count }, (_, index) => {
      const no = String(index + 1).padStart(3, '0');
      const id = `QA-${key}-${no}`;
      return {
        source_occurrence_id: `${sourceId}-${no}`,
        canonical_question_id: id,
        source_id: sourceId,
        source_set_id: `${sourceId}-SET01`,
        source_question_no: index + 1,
        source_occurrence_order: index + 1,
        section_type: 'specialty-import-status-qa',
        source_answer: 'A',
        source_prompt_snapshot: `${key} 保存件数表示QA ${no}`
      };
    }),
    media: []
  };
}

async function importSupplemental(page: Page, key: SpecialtyKey) {
  const data = makeSupplemental(key);
  await page.getByLabel('正式データExcelまたはJSONファイル').setInputFiles({
    name: `${key}-status-qa.json`,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(data))
  });
  await expect(page.getByRole('status')).toContainText(`追加データ「${key}」`);
  await expect(page.getByRole('status')).toContainText(`追加${TARGETS[key]}問`);
}

test('shows the production specialty counts and OK status after all three supplemental imports', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'データ管理' }).click();

  await importSupplemental(page, 'specialty-past');
  await importSupplemental(page, 'specialty-predicted');
  await importSupplemental(page, 'specialty-predicted-case');

  const pastMetric = page.getByText('専門過去問', { exact: true }).locator('..');
  const predictedMetric = page.getByText('専門予想問題', { exact: true }).locator('..');
  const predictedCaseMetric = page.getByText('専門予想事例', { exact: true }).locator('..');

  await expect(pastMetric.getByText('126', { exact: true })).toBeVisible();
  await expect(predictedMetric.getByText('116', { exact: true })).toBeVisible();
  await expect(predictedCaseMetric.getByText('269', { exact: true })).toBeVisible();
  await expect(page.getByText(/専門過去問: OK/)).toBeVisible();
  await expect(page.getByText(/専門予想問題: OK/)).toBeVisible();
  await expect(page.getByText(/専門予想事例: OK/)).toBeVisible();

  const totalMetric = page.getByText('全問題', { exact: true }).locator('..');
  await expect(totalMetric.getByText('511', { exact: true })).toBeVisible();
  await expect(page.getByText(/正式Base.*共通穴抜き/)).toBeVisible();
});
