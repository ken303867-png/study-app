# Data Schema 0.4

策定日: 2026-09-03

## 位置づけ

Schema 0.4は、以下の上位仕様をアプリDelivery層へ接続するためのSchemaです。

1. `EXPLANATION_TEMPLATE_SPEC_v1.0.md`
2. `FORMAL_QUESTION_EXPLANATION_DATA_SPEC_v1.1.md`
3. TypeScript domain types
4. Zod runtime validation
5. Dexie / IndexedDB
6. React explanation UI

正式なExcel Master Dataそのものを置き換えるものではありません。

## Dataset envelope

```text
datasetVersion
schemaVersion = 0.4
questions[]
materials[]
sources[]
sourceOccurrences[]
media[]
```

MEDIA Blob本体はJSON envelopeへ埋め込まず、IndexedDB `mediaBlobs` へ `media_id` をキーに分離保存します。

## Question explanation

`questions[].explanation` は文字列ではなく、Explanation Template v1.0の正式構造です。

必須:
- `answer`
- `question_intent`
- `reasoning`
- `choice_explanations`
- `key_points`
- `references`

任意:
- `surrounding_knowledge`
- `clinical_notes`
- `laws_guidelines`
- `mnemonic`
- `source_explanation_raw`

任意項目が空の場合はプロパティ自体を省略し、UIでも見出しを表示しません。

## Choice explanation

各選択肢は次を保持します。

必須:
- `target_key`
- `display_order`
- `judgement`
- `reason`
- `correction_condition`
- `mapping_provenance`

任意:
- `corrected_statement`
- `differential_notes`
- `clinical_caution`

`correction_condition` は該当なしの場合も `N/A` 等の明示値を必須とします。

## SOURCES / SOURCE_OCCURRENCES

`SOURCES` と `SOURCE_OCCURRENCES` を分離し、同一Canonical Questionの複数出現を問題複製なしで保持します。

Schema QAでは少なくとも以下を検証します。

- `source_id` 一意
- `source_occurrence_id` 一意
- Source occurrence → Question参照
- Source occurrence → Source参照
- 各Questionに1件以上のSource occurrence
- 原資料位置追跡情報の存在
- 同一Source occurrence自然キー重複の拒否

## MEDIA

MEDIA metadata必須:
- `media_id`
- `canonical_question_id`
- `media_type`
- `placement_after`
- `display_order`
- `file_name_or_blob_ref`
- `alt_text`
- `revision`

任意:
- `target_key`
- `caption`
- `source_id`
- `source_page`

空の任意Explanationブロックを `placement_after` に指定するMEDIAはSchema errorとします。

## IndexedDB / Dexie

Dexie schema version 2で以下を保持します。

- `questions`
- `materials`
- `sources`
- `sourceOccurrences`
- `media`
- `mediaBlobs`
- `learningHistory`
- `materialHistory`
- `meta`

教材Deliveryデータと学習履歴は別テーブルです。

## Compatibility

Schema 0.3の `explanation: string` はSchema 0.4として受理しません。

既存IndexedDBにSchema 0.3データが残っている場合、アプリは旧データを正式解答解説として表示せず、Schema 0.4 Deliveryデータの再生成・再投入を案内します。

学習履歴は教材データとは独立保持します。

## Release gate

- TypeScript typecheck
- ESLint
- Vitest
- Production build
- Playwright E2E
- Zod Schema QA

すべてPASS後にSchema 0.4を正式採用します。
