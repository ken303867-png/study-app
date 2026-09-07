import { Buffer } from 'node:buffer';
import { expect, test, type Page } from '@playwright/test';

function makeSupplemental({
  key,
  id,
  kind,
  topic,
  prompt,
  intent
}: {
  key: 'specialty-predicted' | 'specialty-predicted-case';
  id: string;
  kind: 'specialty-predicted' | 'specialty-predicted-case';
  topic: string;
  prompt: string;
  intent: string;
}) {
  const supplementalTag = `supplemental:${key}`;
  const sourceId = `${id}-SRC`;

  return {
    importMode: 'supplemental-replace',
    supplementalKey: key,
    datasetVersion: `qa-${key}-1.0`,
    schemaVersion: '0.5',
    questions: [
      {
        id,
        subject: '専門分野：摂食・嚥下障害看護',
        unit: kind === 'specialty-predicted-case' ? '状況設定・事例' : '専門知識',
        topic,
        sourceType: 'predicted',
        sourceLabel: `${topic} QA fixture`,
        questionFormat: 'single-choice',
        importance: 'B',
        prompt,
        explanation: {
          answer: 'A. 選択肢A',
          question_intent: intent,
          reasoning: '正答indexと選択肢Aが一致するため、Aを選択した場合に正解として判定する。',
          choice_explanations: [
            {
              target_key: '1',
              display_order: 1,
              judgement: 'correct',
              reason: `${topic}のQA fixtureでは選択肢Aを正式正答として設定している。`,
              correction_condition: 'N/A',
              mapping_provenance: 'source_structured'
            },
            {
              target_key: '2',
              display_order: 2,
              judgement: 'incorrect',
              reason: `${topic}のQA fixtureでは選択肢Bは誤答として設定している。`,
              correction_condition: '選択肢Aなら正答となる。',
              mapping_provenance: 'source_structured'
            },
            {
              target_key: '3',
              display_order: 3,
              judgement: 'incorrect',
              reason: `${topic}のQA fixtureでは選択肢Cは誤答として設定している。`,
              correction_condition: '選択肢Aなら正答となる。',
              mapping_provenance: 'source_structured'
            },
            {
              target_key: '4',
              display_order: 4,
              judgement: 'incorrect',
              reason: `${topic}のQA fixtureでは選択肢Dは誤答として設定している。`,
              correction_condition: '選択肢Aなら正答となる。',
              mapping_provenance: 'source_structured'
            }
          ],
          key_points: `${topic}でも専門科目の分類・回答・正式解説フローを維持する。`,
          references: `Study App ${topic} QA fixture`
        },
        relatedMaterialIds: [],
        tags: [supplementalTag, 'learning-area:specialty', `question-kind:${kind}`],
        revision: 1,
        choices: ['選択肢A', '選択肢B', '選択肢C', '選択肢D'],
        correctChoiceIndexes: [0]
      }
    ],
    materials: [],
    sources: [
      {
        source_id: sourceId,
        source_group: supplementalTag,
        title: `${topic} QA fixture`,
        answer_authority: 'provided'
      }
    ],
    sourceOccurrences: [
      {
        source_occurrence_id: `${sourceId}-Q01`,
        canonical_question_id: id,
        source_id: sourceId,
        source_set_id: `${sourceId}-SET01`,
        source_question_no: 1,
        source_occurrence_order: 1,
        section_type: `${key}-qa`,
        source_answer: '1',
        source_prompt_snapshot: prompt
      }
    ],
    media: []
  };
}

async function importSupplemental(page: Page, name: string, data: unknown) {
  await page.goto('/');
  await page.getByRole('button', { name: 'データ管理' }).click();
  await page.getByLabel('正式データExcelまたはJSONファイル').setInputFiles({
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(data))
  });
}

async function answerFirstQuestion(page: Page) {
  const practice = page.getByRole('region', { name: '1問ずつ演習' });
  await practice.getByRole('radio', { name: /A\s*選択肢A/ }).check();
  await practice.getByRole('button', { name: '回答を確定する' }).click();
  await expect(practice.getByRole('status')).toContainText('正解');
  await expect(practice.getByRole('status')).toContainText('正答：A. 選択肢A');
  await expect(practice.getByText('正式解答解説')).toBeVisible();
  await expect(practice.getByRole('heading', { name: '正解に至る考え方' })).toBeVisible();
  await expect(practice.getByRole('heading', { name: '各選択肢解説' })).toBeVisible();
}

test('imports a specialty predicted supplemental and practices it in the predicted category', async ({ page }) => {
  const data = makeSupplemental({
    key: 'specialty-predicted',
    id: 'TEST-SP-PRED-001',
    kind: 'specialty-predicted',
    topic: '専門予想問題',
    prompt: '専門科目の予想問題表示確認用です。正しい選択肢はどれですか。',
    intent: '専門科目の予想問題で分類・通常演習・正式解説表示が機能するか確認する。'
  });

  await importSupplemental(page, 'specialty-predicted-qa.json', data);
  await expect(page.getByRole('status')).toContainText('追加データ「specialty-predicted」');
  await expect(page.getByRole('status')).toContainText('追加1問');

  await page.getByRole('button', { name: '演習', exact: true }).click();
  const builder = page.getByRole('region', { name: '演習セット作成' });
  await expect(builder.getByRole('radio', { name: /専門科目\s*1問/ })).toBeChecked();
  await expect(builder.getByRole('checkbox', { name: /^予想問題\s*1問$/ })).toBeChecked();
  await expect(builder.getByRole('checkbox', { name: /予想事例問題\s*0問/ })).toBeChecked();
  await builder.getByRole('button', { name: '1問の演習を開始' }).click();

  const practice = page.getByRole('region', { name: '1問ずつ演習' });
  await expect(
    practice.getByText('専門科目の予想問題表示確認用です。正しい選択肢はどれですか。')
  ).toBeVisible();
  await answerFirstQuestion(page);
  await expect(
    practice.getByText('専門予想問題のQA fixtureでは選択肢Aを正式正答として設定している。')
  ).toBeVisible();
});

test('imports a specialty predicted case supplemental and practices it in the case category', async ({ page }) => {
  const data = makeSupplemental({
    key: 'specialty-predicted-case',
    id: 'TEST-SP-PRED-CASE-001',
    kind: 'specialty-predicted-case',
    topic: '専門予想事例問題',
    prompt:
      '【事例】\n専門科目の予想事例問題表示確認用の事例です。\n患者背景を踏まえて判断します。\n\n【設問】\n最も適切な選択肢はどれですか。',
    intent: '専門科目の予想事例問題で分類・段落表示・通常演習・正式解説表示が機能するか確認する。'
  });

  await importSupplemental(page, 'specialty-predicted-case-qa.json', data);
  await expect(page.getByRole('status')).toContainText('追加データ「specialty-predicted-case」');
  await expect(page.getByRole('status')).toContainText('追加1問');

  await page.getByRole('button', { name: '演習', exact: true }).click();
  const builder = page.getByRole('region', { name: '演習セット作成' });
  await expect(builder.getByRole('radio', { name: /専門科目\s*1問/ })).toBeChecked();
  await expect(builder.getByRole('checkbox', { name: /^予想問題\s*0問$/ })).toBeChecked();
  await expect(builder.getByRole('checkbox', { name: /予想事例問題\s*1問/ })).toBeChecked();
  await builder.getByRole('button', { name: '1問の演習を開始' }).click();

  const practice = page.getByRole('region', { name: '1問ずつ演習' });
  await expect(practice.getByText('専門科目の予想事例問題表示確認用の事例です。')).toBeVisible();
  await expect(practice.getByText('患者背景を踏まえて判断します。')).toBeVisible();
  await expect(practice.getByText('最も適切な選択肢はどれですか。')).toBeVisible();
  await answerFirstQuestion(page);
  await expect(
    practice.getByText('専門予想事例問題のQA fixtureでは選択肢Aを正式正答として設定している。')
  ).toBeVisible();
});
