import type { DatasetInput } from '../schemas/contentSchemas';

export const sampleDataset: DatasetInput = {
  datasetVersion: 'sample-0.9-master-import',
  schemaVersion: '0.5',
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
      prompt: '正式Deliveryデータを実行時検証するライブラリはどれですか。',
      explanation: {
        answer: 'B. Zod',
        question_intent: '外部から取り込む正式データを、TypeScript型だけでなく実行時にも検証する仕組みを理解しているかを確認する。',
        reasoning: 'TypeScriptの型はビルド後には消えるため、Canonical Masterから生成したDeliveryデータはZod Schemaで実行時検証してからIndexedDBへ保存する。',
        choice_explanations: [
          {
            target_key: 'A',
            display_order: 1,
            judgement: 'incorrect',
            reason: 'DexieはIndexedDBを扱う保存層であり、DeliveryデータのSchema検証ライブラリではない。',
            correction_condition: '「IndexedDBの保存層として使用するライブラリはどれか」という設問なら正しい。',
            corrected_statement: 'DexieはIndexedDBの保存層として使用する。',
            mapping_provenance: 'source_structured'
          },
          {
            target_key: 'B',
            display_order: 2,
            judgement: 'correct',
            reason: 'Zodは外部データを実行時に検証し、必須項目・型・参照整合性等をアプリ投入前に確認できる。',
            correction_condition: 'N/A',
            mapping_provenance: 'source_structured'
          },
          {
            target_key: 'C',
            display_order: 3,
            judgement: 'incorrect',
            reason: 'PlaywrightはブラウザE2Eテストに使用する。',
            correction_condition: '「ブラウザE2Eテストに使用するツールはどれか」という設問なら正しい。',
            corrected_statement: 'PlaywrightはブラウザE2Eテストに使用する。',
            mapping_provenance: 'source_structured'
          },
          {
            target_key: 'D',
            display_order: 4,
            judgement: 'incorrect',
            reason: 'Prettierはコード整形ツールであり、DeliveryデータのSchema検証は行わない。',
            correction_condition: '「コード整形に使用するツールはどれか」という設問なら正しい。',
            corrected_statement: 'Prettierはコード整形に使用する。',
            mapping_provenance: 'source_structured'
          }
        ],
        surrounding_knowledge: '正式データはExcel等の監査可能なMaster Dataを正本とし、Canonical Master JSON ExportとDelivery JSONは再生成可能な中間・配信データとして扱う。',
        clinical_notes: 'このサンプルはアプリ構造確認用であり、医療・看護の正式教材データではない。',
        key_points: 'Canonical Master → Delivery変換 → Zod検証 → IndexedDB保存の順で正式データを扱う。',
        mnemonic: 'Masterは正本、Deliveryは再生成可能と覚える。',
        references: 'Study App / Explanation Template v1.0 / Formal Data Spec v1.1 / Delivery Schema 0.5',
        source_explanation_raw: '画面確認用に作成した非正式サンプル解説。'
      },
      relatedMaterialIds: ['SAMPLE-M-001'],
      tags: ['sample'],
      revision: 3,
      choices: ['Dexie', 'Zod', 'Playwright', 'Prettier'],
      correctChoiceIndexes: [1]
    }
  ],
  materials: [
    {
      id: 'SAMPLE-M-001',
      subject: 'サンプル科目',
      unit: 'サンプル単元',
      title: '正式データ処理フロー',
      importance: 'S',
      body: 'Excel正本 → Canonical Master JSON Export → Delivery変換 → Zod検証 → Dexie/IndexedDB保存の順で正式データを扱います。',
      relatedQuestionIds: ['SAMPLE-Q-001'],
      tags: ['sample'],
      revision: 3
    }
  ],
  sources: [
    {
      source_id: 'SAMPLE-SOURCE-001',
      source_group: '予想問題',
      title: 'Study App 非正式サンプル',
      edition_year: '2026',
      publisher_org: 'Study App development sample',
      source_location: 'sampleDataset.ts',
      answer_authority: 'reference-only',
      notes: '正式問題本文を含まない画面・QA確認用データ。'
    }
  ],
  sourceOccurrences: [
    {
      source_occurrence_id: 'SAMPLE-SOURCE-001-SET01-Q01',
      canonical_question_id: 'SAMPLE-Q-001',
      source_id: 'SAMPLE-SOURCE-001',
      source_set_id: 'SAMPLE-SOURCE-001-SET01',
      source_set_label: 'Schema 0.5 QA sample',
      source_set_order: 1,
      source_question_no: 1,
      source_question_label: 'Q1',
      source_occurrence_order: 1,
      section_type: 'development-sample',
      source_answer: 'B',
      source_prompt_snapshot: '正式Deliveryデータを実行時検証するライブラリはどれですか。'
    }
  ],
  media: [
    {
      media_id: 'SAMPLE-MEDIA-001',
      canonical_question_id: 'SAMPLE-Q-001',
      media_type: 'diagram',
      placement_after: 'reasoning',
      display_order: 1,
      file_name_or_blob_ref: 'sample-data-flow.svg',
      alt_text: 'Excel正本からCanonical Master JSON Export、Zod検証を経てIndexedDBへ保存するデータフロー図のプレースホルダー',
      caption: 'MEDIA placement確認用の非正式プレースホルダー',
      source_id: 'SAMPLE-SOURCE-001',
      revision: 1
    }
  ]
};
