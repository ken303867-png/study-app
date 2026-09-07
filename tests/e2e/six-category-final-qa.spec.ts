import { Buffer } from 'node:buffer';
import { expect, test, type Page } from '@playwright/test';

const choiceNames = ['選択肢A', '選択肢B', '選択肢C', '選択肢D'];

type ChoiceKind =
  | 'common-jna'
  | 'common-predicted'
  | 'specialty-past'
  | 'specialty-predicted'
  | 'specialty-predicted-case';

function makeChoiceQuestion({
  id,
  kind,
  sourceType,
  subject,
  topic,
  prompt,
  supplementalKey
}: {
  id: string;
  kind: ChoiceKind;
  sourceType: 'japan-nursing-association' | 'past-exam' | 'predicted';
  subject: string;
  topic: string;
  prompt: string;
  supplementalKey?: string;
}) {
  const learningArea = kind.startsWith('specialty-') ? 'specialty' : 'common';
  const tags = [`learning-area:${learningArea}`, `question-kind:${kind}`];
  if (supplementalKey) tags.unshift(`supplemental:${supplementalKey}`);

  return {
    id,
    subject,
    unit: kind.endsWith('-case') ? '状況設定・事例' : 'QA単元',
    topic,
    sourceType,
    sourceLabel: `${topic} synthetic QA fixture`,
    questionFormat: 'single-choice',
    importance: 'B',
    prompt,
    explanation: {
      answer: 'A. 選択肢A',
      question_intent: `${topic}の分類・演習・正式解説表示を確認するsynthetic QA。`,
      reasoning: 'synthetic QAでは正答index 0を選択肢Aへ対応させる。',
      choice_explanations: choiceNames.map((choice, index) => ({
        target_key: String(index + 1),
        display_order: index + 1,
        judgement: index === 0 ? 'correct' : 'incorrect',
        reason:
          index === 0
            ? `${topic} synthetic QAでは選択肢Aを正答として設定している。`
            : `${topic} synthetic QAでは${choice}を誤答として設定している。`,
        correction_condition: index === 0 ? '修正不要。' : '選択肢Aなら正答となる。',
        mapping_provenance: 'source_structured'
      })),
      key_points: `${topic}のUIフロー確認。`,
      references: 'Study App synthetic six-category final QA fixture'
    },
    relatedMaterialIds: [],
    tags,
    revision: 1,
    choices: choiceNames,
    correctChoiceIndexes: [0]
  };
}

function sourceFor(id: string, sourceGroup: string) {
  return {
    source_id: `${id}-SRC`,
    source_group: sourceGroup,
    title: `${id} synthetic source`,
    answer_authority: 'provided'
  };
}

function occurrenceFor(id: string) {
  return {
    source_occurrence_id: `${id}-OCC`,
    canonical_question_id: id,
    source_id: `${id}-SRC`,
    source_set_id: `${id}-SET`,
    source_question_no: 1,
    source_occurrence_order: 1,
    section_type: 'six-category-final-qa',
    source_answer: '1',
    source_prompt_snapshot: `${id} synthetic prompt snapshot`
  };
}

function makeBaseDataset() {
  const jna = makeChoiceQuestion({
    id: 'QA-COM-JNA-001',
    kind: 'common-jna',
    sourceType: 'japan-nursing-association',
    subject: '共通科目 synthetic',
    topic: '看護協会Eラーニング',
    prompt: '共通科目・看護協会Eラーニングのsynthetic表示確認問題です。'
  });
  const predicted = makeChoiceQuestion({
    id: 'QA-COM-PRED-001',
    kind: 'common-predicted',
    sourceType: 'predicted',
    subject: '共通科目 synthetic',
    topic: '共通予想問題',
    prompt: '共通科目・予想問題のsynthetic表示確認問題です。'
  });

  return {
    datasetVersion: 'qa-six-category-base-1.0',
    schemaVersion: '0.5',
    questions: [jna, predicted],
    materials: [],
    sources: [sourceFor(jna.id, 'qa-six-category-base'), sourceFor(predicted.id, 'qa-six-category-base')],
    sourceOccurrences: [occurrenceFor(jna.id), occurrenceFor(predicted.id)],
    media: []
  };
}

function makeClozeSupplemental() {
  const id = 'QA-COM-CLOZE-001';
  const supplementalKey = 'common-cloze';
  const supplementalTag = `supplemental:${supplementalKey}`;
  return {
    importMode: 'supplemental-replace',
    supplementalKey,
    datasetVersion: 'qa-common-cloze-1.0',
    schemaVersion: '0.5',
    questions: [
      {
        id,
        subject: '共通科目 synthetic',
        unit: '穴抜きQA',
        topic: '共通穴抜き問題',
        sourceType: 'other',
        sourceLabel: '共通穴抜き synthetic QA fixture',
        questionFormat: 'fill-blank',
        importance: 'B',
        prompt: '穴抜き自己採点の確認語は（　　　）です。',
        explanation: {
          answer: 'synthetic正答',
          question_intent: '共通穴抜き問題の答え表示・自己採点・履歴保存を確認する。',
          reasoning: 'synthetic QA用の固定正答を表示する。',
          choice_explanations: [],
          key_points: '共通穴抜きは通常演習で自己採点フローを使用する。',
          references: 'Study App synthetic six-category final QA fixture'
        },
        relatedMaterialIds: [],
        tags: [supplementalTag, 'learning-area:common', 'question-kind:common-cloze'],
        revision: 1,
        acceptedAnswers: ['synthetic正答']
      }
    ],
    materials: [],
    sources: [sourceFor(id, supplementalTag)],
    sourceOccurrences: [occurrenceFor(id)],
    media: []
  };
}

function makeSpecialtySupplemental(
  key: 'specialty-past' | 'specialty-predicted' | 'specialty-predicted-case'
) {
  const config = {
    'specialty-past': {
      id: 'QA-SP-PAST-001',
      kind: 'specialty-past' as const,
      sourceType: 'past-exam' as const,
      topic: '専門過去問',
      prompt: '専門科目・過去問のsynthetic表示確認問題です。'
    },
    'specialty-predicted': {
      id: 'QA-SP-PRED-001',
      kind: 'specialty-predicted' as const,
      sourceType: 'predicted' as const,
      topic: '専門予想問題',
      prompt: '専門科目・予想問題のsynthetic表示確認問題です。'
    },
    'specialty-predicted-case': {
      id: 'QA-SP-CASE-001',
      kind: 'specialty-predicted-case' as const,
      sourceType: 'predicted' as const,
      topic: '専門予想事例問題',
      prompt:
        '【事例】\n専門科目・予想事例のsynthetic事例文です。\n患者背景を2段落目で確認します。\n\n【設問】\n最も適切な選択肢はどれですか。'
    }
  }[key];
  const supplementalTag = `supplemental:${key}`;
  const question = makeChoiceQuestion({
    id: config.id,
    kind: config.kind,
    sourceType: config.sourceType,
    subject: '専門分野：摂食・嚥下障害看護 synthetic',
    topic: config.topic,
    prompt: config.prompt,
    supplementalKey: key
  });

  return {
    importMode: 'supplemental-replace',
    supplementalKey: key,
    datasetVersion: `qa-${key}-1.0`,
    schemaVersion: '0.5',
    questions: [question],
    materials: [],
    sources: [sourceFor(question.id, supplementalTag)],
    sourceOccurrences: [occurrenceFor(question.id)],
    media: []
  };
}

async function importJson(page: Page, name: string, data: unknown) {
  await page.getByRole('button', { name: 'データ管理' }).click();
  await page.getByLabel('正式データExcelまたはJSONファイル').setInputFiles({
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(data))
  });
  await expect(page.getByRole('status')).toBeVisible();
}

async function importAllSix(page: Page) {
  await page.goto('/');
  await importJson(page, 'qa-six-category-base.json', makeBaseDataset());
  await importJson(page, 'qa-common-cloze.json', makeClozeSupplemental());
  await importJson(page, 'qa-specialty-past.json', makeSpecialtySupplemental('specialty-past'));
  await importJson(
    page,
    'qa-specialty-predicted.json',
    makeSpecialtySupplemental('specialty-predicted')
  );
  await importJson(
    page,
    'qa-specialty-predicted-case.json',
    makeSpecialtySupplemental('specialty-predicted-case')
  );
}

async function openBuilder(page: Page) {
  await page.getByRole('button', { name: '演習', exact: true }).click();
  return page.getByRole('region', { name: '演習セット作成' });
}

async function selectOnly(builder: ReturnType<Page['getByRole']>, target: RegExp, others: RegExp[]) {
  for (const other of others) {
    const checkbox = builder.getByRole('checkbox', { name: other });
    if (await checkbox.isChecked()) await checkbox.uncheck();
  }
  const targetCheckbox = builder.getByRole('checkbox', { name: target });
  if (!(await targetCheckbox.isChecked())) await targetCheckbox.check();
}

async function answerChoiceAndVerify(page: Page, expectedPrompt: string) {
  const practice = page.getByRole('region', { name: '1問ずつ演習' });
  await expect(practice.getByText(expectedPrompt)).toBeVisible();
  await practice.getByRole('radio', { name: /A\s*選択肢A/ }).check();
  await practice.getByRole('button', { name: '回答を確定する' }).click();
  await expect(practice.getByRole('status')).toContainText('正解');
  await expect(practice.getByText('正式解答解説')).toBeVisible();
  await expect(practice.getByRole('heading', { name: '正解に至る考え方' })).toBeVisible();
  await expect(practice.getByRole('heading', { name: '各選択肢解説' })).toBeVisible();
  await expect(practice.locator('.practice-local-state')).toContainText('累計 1回');
}

test('shows all six categories together with one correctly classified synthetic question each', async ({
  page
}) => {
  await importAllSix(page);
  const builder = await openBuilder(page);

  await expect(builder.getByRole('radio', { name: /共通科目\s*3問/ })).toBeChecked();
  await expect(builder.getByRole('checkbox', { name: /看護協会Eラーニング\s*1問/ })).toBeChecked();
  await expect(builder.getByRole('checkbox', { name: /穴抜き問題\s*1問/ })).toBeChecked();
  await expect(builder.getByRole('checkbox', { name: /^予想問題\s*1問$/ })).toBeChecked();

  await builder.getByRole('radio', { name: /専門科目\s*3問/ }).check();
  await expect(builder.getByRole('checkbox', { name: /過去問\s*1問/ })).toBeChecked();
  await expect(builder.getByRole('checkbox', { name: /^予想問題\s*1問$/ })).toBeChecked();
  await expect(builder.getByRole('checkbox', { name: /予想事例問題\s*1問/ })).toBeChecked();
});

test('practices common JNA and common predicted categories with formal explanations', async ({ page }) => {
  await importAllSix(page);

  let builder = await openBuilder(page);
  await selectOnly(
    builder,
    /看護協会Eラーニング\s*1問/,
    [/穴抜き問題\s*1問/, /^予想問題\s*1問$/]
  );
  await builder.getByRole('button', { name: '1問の演習を開始' }).click();
  await answerChoiceAndVerify(
    page,
    '共通科目・看護協会Eラーニングのsynthetic表示確認問題です。'
  );

  await page.getByRole('button', { name: '演習を終了' }).click();
  builder = await openBuilder(page);
  await selectOnly(
    builder,
    /^予想問題\s*1問$/,
    [/看護協会Eラーニング\s*1問/, /穴抜き問題\s*1問/]
  );
  await builder.getByRole('button', { name: '1問の演習を開始' }).click();
  await answerChoiceAndVerify(page, '共通科目・予想問題のsynthetic表示確認問題です。');
});

test('uses answer reveal and self-assessment for common cloze and persists its learning history', async ({
  page
}) => {
  await importAllSix(page);
  let builder = await openBuilder(page);
  await selectOnly(
    builder,
    /穴抜き問題\s*1問/,
    [/看護協会Eラーニング\s*1問/, /^予想問題\s*1問$/]
  );
  await builder.getByRole('button', { name: '1問の演習を開始' }).click();

  const practice = page.getByRole('region', { name: '1問ずつ演習' });
  await expect(practice.getByText('穴抜き自己採点の確認語は（　　　）です。')).toBeVisible();
  await practice.getByRole('button', { name: '答えを見る' }).click();
  await expect(practice.getByRole('status')).toContainText('synthetic正答');
  await practice.getByRole('button', { name: '正解', exact: true }).click();
  await expect(practice.getByRole('status')).toContainText('正解');
  await expect(practice.locator('.practice-local-state')).toContainText('累計 1回');

  await page.reload();
  builder = await openBuilder(page);
  await selectOnly(
    builder,
    /穴抜き問題\s*1問/,
    [/看護協会Eラーニング\s*1問/, /^予想問題\s*1問$/]
  );
  await builder.getByRole('button', { name: '1問の演習を開始' }).click();
  await expect(page.locator('.practice-local-state')).toContainText('累計 1回');
});

test('practices all three specialty categories and preserves predicted-case paragraphs', async ({ page }) => {
  await importAllSix(page);
  let builder = await openBuilder(page);
  await builder.getByRole('radio', { name: /専門科目\s*3問/ }).check();
  await selectOnly(builder, /過去問\s*1問/, [/^予想問題\s*1問$/, /予想事例問題\s*1問/]);
  await builder.getByRole('button', { name: '1問の演習を開始' }).click();
  await answerChoiceAndVerify(page, '専門科目・過去問のsynthetic表示確認問題です。');

  await page.getByRole('button', { name: '演習を終了' }).click();
  builder = await openBuilder(page);
  await builder.getByRole('radio', { name: /専門科目\s*3問/ }).check();
  await selectOnly(builder, /^予想問題\s*1問$/, [/過去問\s*1問/, /予想事例問題\s*1問/]);
  await builder.getByRole('button', { name: '1問の演習を開始' }).click();
  await answerChoiceAndVerify(page, '専門科目・予想問題のsynthetic表示確認問題です。');

  await page.getByRole('button', { name: '演習を終了' }).click();
  builder = await openBuilder(page);
  await builder.getByRole('radio', { name: /専門科目\s*3問/ }).check();
  await selectOnly(builder, /予想事例問題\s*1問/, [/過去問\s*1問/, /^予想問題\s*1問$/]);
  await builder.getByRole('button', { name: '1問の演習を開始' }).click();

  const practice = page.getByRole('region', { name: '1問ずつ演習' });
  await expect(practice.getByText('専門科目・予想事例のsynthetic事例文です。')).toBeVisible();
  await expect(practice.getByText('患者背景を2段落目で確認します。')).toBeVisible();
  await expect(practice.getByText('最も適切な選択肢はどれですか。')).toBeVisible();
  await practice.getByRole('radio', { name: /A\s*選択肢A/ }).check();
  await practice.getByRole('button', { name: '回答を確定する' }).click();
  await expect(practice.getByRole('status')).toContainText('正解');
  await expect(practice.getByText('正式解答解説')).toBeVisible();
}
