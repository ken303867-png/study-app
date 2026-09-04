import { Buffer } from 'node:buffer';
import { expect, test } from '@playwright/test';

const specialtyPastSupplemental = {
  importMode: 'supplemental-replace',
  supplementalKey: 'specialty-past',
  datasetVersion: 'qa-specialty-past-1.0',
  schemaVersion: '0.5',
  questions: [
    {
      id: 'TEST-SP-PAST-001',
      subject: '専門分野：摂食・嚥下障害看護',
      unit: '状況設定・事例',
      topic: '専門過去問QA',
      sourceType: 'past-exam',
      sourceLabel: '専門過去問 QA fixture',
      questionFormat: 'single-choice',
      importance: 'B',
      prompt:
        '【事例】\n専門科目の過去問表示確認用の事例です。\n\n【設問】\n正しい選択肢はどれですか。',
      explanation: {
        answer: 'B. 選択肢B',
        question_intent: '専門科目の過去問で通常演習と正式解説表示が機能するか確認する。',
        reasoning: '正答indexと選択肢Bが一致するため、Bを選択した場合に正解として判定する。',
        choice_explanations: [
          {
            target_key: '1',
            display_order: 1,
            judgement: 'incorrect',
            reason: 'QA fixtureでは選択肢Aは誤答として設定している。',
            correction_condition: '選択肢Bなら正答となる。',
            mapping_provenance: 'source_structured'
          },
          {
            target_key: '2',
            display_order: 2,
            judgement: 'correct',
            reason: 'QA fixtureの正式正答は選択肢Bである。',
            correction_condition: 'N/A',
            mapping_provenance: 'source_structured'
          },
          {
            target_key: '3',
            display_order: 3,
            judgement: 'incorrect',
            reason: 'QA fixtureでは選択肢Cは誤答として設定している。',
            correction_condition: '選択肢Bなら正答となる。',
            mapping_provenance: 'source_structured'
          },
          {
            target_key: '4',
            display_order: 4,
            judgement: 'incorrect',
            reason: 'QA fixtureでは選択肢Dは誤答として設定している。',
            correction_condition: '選択肢Bなら正答となる。',
            mapping_provenance: 'source_structured'
          }
        ],
        key_points: '専門科目・過去問でも通常の選択問題と同じ回答・解説フローを使用する。',
        references: 'Study App specialty past exam QA fixture'
      },
      relatedMaterialIds: [],
      tags: [
        'supplemental:specialty-past',
        'learning-area:specialty',
        'question-kind:specialty-past'
      ],
      revision: 1,
      choices: ['選択肢A', '選択肢B', '選択肢C', '選択肢D'],
      correctChoiceIndexes: [1]
    }
  ],
  materials: [],
  sources: [
    {
      source_id: 'TEST-SP-PAST-SRC',
      source_group: 'supplemental:specialty-past',
      title: '専門過去問 QA fixture',
      answer_authority: 'provided'
    }
  ],
  sourceOccurrences: [
    {
      source_occurrence_id: 'TEST-SP-PAST-SRC-Q01',
      canonical_question_id: 'TEST-SP-PAST-001',
      source_id: 'TEST-SP-PAST-SRC',
      source_set_id: 'TEST-SP-PAST-SET01',
      source_question_no: 1,
      source_occurrence_order: 1,
      section_type: 'specialty-past-qa',
      source_answer: '2',
      source_prompt_snapshot: '正しい選択肢はどれですか。'
    }
  ],
  media: []
};

test('imports a specialty past supplemental and shows answer plus formal explanation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'データ管理' }).click();

  await page.getByLabel('正式データExcelまたはJSONファイル').setInputFiles({
    name: 'specialty-past-qa.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(specialtyPastSupplemental))
  });

  await expect(page.getByRole('status')).toContainText('追加データ「specialty-past」');
  await expect(page.getByRole('status')).toContainText('追加1問');

  await page.getByRole('button', { name: '演習', exact: true }).click();
  const builder = page.getByRole('region', { name: '演習セット作成' });
  await expect(builder.getByRole('radio', { name: /専門科目\s*1問/ })).toBeChecked();
  await expect(builder.getByRole('checkbox', { name: /過去問\s*1問/ })).toBeChecked();
  await builder.getByRole('button', { name: '1問の演習を開始' }).click();

  const practice = page.getByRole('region', { name: '1問ずつ演習' });
  await expect(practice.getByText('専門科目の過去問表示確認用の事例です。')).toBeVisible();
  await expect(practice.getByText('正しい選択肢はどれですか。')).toBeVisible();

  await practice.getByRole('radio', { name: /B\s*選択肢B/ }).check();
  await practice.getByRole('button', { name: '回答を確定する' }).click();

  const feedback = practice.getByRole('status');
  await expect(feedback).toContainText('正解');
  await expect(feedback).toContainText('正答：B. 選択肢B');
  await expect(practice.getByText('正式解答解説')).toBeVisible();
  await expect(practice.getByRole('heading', { name: '正解に至る考え方' })).toBeVisible();
  await expect(practice.getByRole('heading', { name: '各選択肢解説' })).toBeVisible();
  await expect(
    practice.getByText('QA fixtureの正式正答は選択肢Bである。')
  ).toBeVisible();
});
