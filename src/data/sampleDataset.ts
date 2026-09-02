import type { DatasetInput } from '../schemas/contentSchemas';

export const sampleDataset: DatasetInput = {
  datasetVersion: 'sample-0.7.0',
  schemaVersion: '0.3',
  questions: [
    {
      id: 'SAMPLE-Q-001',
      subject: 'サンプル科目',
      unit: 'サンプル単元',
      topic: 'データ検証',
      sourceType: 'predicted',
      sourceLabel: '画面確認用サンプル',
      questionFormat: 'single-choice',
      importance: 'S',
      prompt: 'v0.7で正式採用したデータ検証ライブラリはどれですか。',
      explanation: 'Zodで外部データを実行時検証します。',
      relatedMaterialIds: ['SAMPLE-M-001'],
      tags: ['sample'],
      revision: 1,
      choices: ['Dexie', 'Zod', 'Playwright', 'Prettier'],
      correctChoiceIndexes: [1]
    }
  ],
  materials: [
    {
      id: 'SAMPLE-M-001',
      subject: 'サンプル科目',
      unit: 'サンプル単元',
      title: 'v0.7 開発基盤',
      importance: 'S',
      body: 'React + TypeScript + PWAを中心に、Dexie・Zod・Vitest・Playwrightで保守性とQAを強化します。',
      relatedQuestionIds: ['SAMPLE-Q-001'],
      tags: ['sample'],
      revision: 1
    }
  ]
};
