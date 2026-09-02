# 解答解説テンプレート 正式仕様 v1.0

確定日: 2026-09-02

## 1. 位置づけ

本仕様を、学習アプリの解答解説データ・Excel正本・Canonical Data・TypeScript型・Zod Schema・Dexie保存Schema・解答解説UIにおける上位仕様とする。

設計優先順位:

`Explanation Template v1.0 → Excel正本 → Canonical Data → TypeScript型 → Zod Schema → IndexedDB/Dexie → 解答解説UI`

アプリ側の都合で本テンプレート項目を削除・統合・意味変更しない。

---

## 2. 問題単位の正式表示順

| 順序 | field_id | 表示名 | 必須/任意 | 表示ルール |
|---:|---|---|---|---|
| 1 | `answer` | 解答 | 必須 | 常に表示 |
| 2 | `question_intent` | この問題で問われていること | 必須 | 常に表示 |
| 3 | `reasoning` | 正解に至る考え方 | 必須 | 常に表示 |
| 4 | `choice_explanations` | 各選択肢解説 | 必須 | 元問題の表示順を維持して常に表示 |
| 5 | `surrounding_knowledge` | 関連する周辺知識 | 任意 | 値がある場合のみ表示 |
| 6 | `clinical_notes` | 臨床現場での注意点 | 任意 | 値がある場合のみ表示 |
| 7 | `laws_guidelines` | 関連法規・ガイドライン | 任意 | 値がある場合のみ表示 |
| 8 | `key_points` | 試験で覚える要点 | 必須 | 常に表示 |
| 9 | `mnemonic` | 覚え方 | 任意 | 値がある場合のみ表示 |
| 10 | `references` | 参考文献・根拠 | 必須 | 常に表示 |

任意項目が空欄の場合、空の見出しを表示しない。

---

## 3. 各選択肢・命題の正式項目順

| 順序 | field_id | 表示名 | 必須/任意 | ルール |
|---:|---|---|---|---|
| 1 | `judgement` | 正誤判定 | 必須 | 内部値は `correct` / `incorrect`。UIでは選択肢なら「正答/誤答」、命題なら「正しい/誤り」と表示 |
| 2 | `reason` | 正誤理由 | 必須 | 全選択肢・命題で保持 |
| 3 | `correction_condition` | 誤答選択肢が正しくなる条件 | 必須 | 該当なし、または元資料に条件の明示がない場合も `N/A` を明示 |
| 4 | `corrected_statement` | 正しい文への修正 | 任意 | 元資料で正文化可能な場合のみ保持 |
| 5 | `differential_notes` | 鑑別・混同しやすい点 | 任意 | 値がある場合のみ表示 |
| 6 | `clinical_caution` | 臨床上の注意点 | 任意 | 値がある場合のみ表示 |

組み合わせ問題では、1〜4の回答候補だけではなく、a〜d等の各命題単位で正誤・理由を保持する。

---

## 4. 図・画像・表

図・画像・表は解説本文へ直接埋め込まず、`MEDIA`として独立管理する。

必須メタデータ:

- `media_id`
- `canonical_question_id`
- `media_type`: `image` / `diagram` / `table`
- `placement_after`
- `display_order`
- `file_name_or_blob_ref`
- `alt_text`
- `revision`

任意メタデータ:

- `target_key`: 特定の選択肢・命題に属する場合
- `caption`
- `source_id`
- `source_page`

`placement_after`は次のいずれかとする。

- `answer`
- `question_intent`
- `reasoning`
- `choice_explanations`
- `surrounding_knowledge`
- `clinical_notes`
- `laws_guidelines`
- `key_points`
- `mnemonic`
- `references`

画像はIndexedDB/DexieへBlobとして保存できる構造とし、オフライン表示に対応する。

---

## 5. 正本と監査情報

表示用の構造化フィールドとは別に、元資料由来の解説を`source_explanation_raw`として監査用に保持する。

選択肢解説には、元資料との関係を追跡するため`mapping_provenance`を保持する。

既存の専門分野126問では、元資料で個別理由が明示されていない行を推測で補わず、以下の区分を用いて標準化済みである。

- `source_explicit_option_explanation`
- `source_answer_rationale`
- `source_answer_by_elimination`
- `source_supported_inference`
- 既存の`source_structured`
- 既存の`source_raw_parsed`

---

## 6. QA要件

正式データとして採用する問題は、少なくとも以下を満たす。

### 問題単位

- `answer` 非空
- `question_intent` 非空
- `reasoning` 非空
- `choice_explanations` が元問題と対応し、表示順が一致
- `key_points` 非空
- `references` 非空

### 選択肢・命題単位

- `judgement` 非空
- `reason` 非空
- `correction_condition` 非空。該当なしの場合もN/Aを明示
- 選択肢/命題の対応先がずれていない

### UI/保存

- Excel正本から変換時に欠落しない
- Zod validationを通過する
- IndexedDB/Dexieへ保存・復元できる
- バックアップ・復元後も欠落しない
- 任意空欄ブロックを表示しない
- MEDIA placementが正しい

---

## 7. Version管理

- Explanation Template Version: `1.0`
- Master Data Version: 別管理
- App Schema Version: 別管理
- App Version: 別管理

テンプレート項目の追加・削除・意味変更・表示順変更を行う場合、Explanation Template Versionを更新し、必要なSchema migrationを定義する。

---

## 8. 専門分野126問の同期結果

対象: 摂食・嚥下障害看護の最終QA合格126問。

- 問題同期: 126 / 126 PASS
- 選択肢・命題: 504行
- `reason`欠損: 0
- `correction_condition`またはN/A欠損: 0
- `source_not_explicit`: 0

この126問・504行は、本テンプレートVersion 1.0の最終項目・表示順へ同期済みとする。

---

## 9. 次工程

1. TypeScript domain型へ本仕様を反映
2. Zod Schemaを更新
3. Dexie/IndexedDB保存Schemaを更新
4. 解答解説UIを本表示順で実装
5. 任意項目・MEDIA placementの表示ロジックを実装
6. サンプル問題で保存・復元・表示E2E QA
7. 正式Master DataのDelivery変換へ進む

本仕様をExplanation Template Version 1.0として正式採用する。
