# 正式問題・解答解説データ整理仕様 v1.0

策定日: 2026-09-02

## 1. 目的

本仕様は、学習アプリへ正式問題・解答解説データを投入する前に、正本データを一貫したルールで整理・監査するための基準を定める。

優先順位は以下とする。

1. 元資料の内容を失わない
2. 正答・解説の監査履歴を残す
3. 重複・類似問題を識別できる
4. 科目・単元・中心論点を一貫して分類する
5. アプリ実装変更から正本データを独立させる
6. 後からSchema変更・クラウド追加があっても再利用できる

正本は「人が監査・編集するデータ」であり、アプリ用JSON/IndexedDB形式を正本としない。

---

## 2. データ層の正式分離

データは次の3層に分ける。

### Layer A: Source / 原資料保持層

元資料から取得した問題文、選択肢、正答、解説、元ID、出典を可能な限りそのまま保持する。

原則として上書き修正しない。

### Layer B: Canonical / 正式採用層

監査後に正式採用する問題文、正答、標準化解答解説、分類、重要度、関連情報を保持する。

学習内容としての正本はこの層とする。

### Layer C: Delivery / アプリ配信用層

CanonicalデータからアプリSchemaに変換したJSON等。

この層はいつでも再生成可能とし、正本にはしない。

流れ:

`Source → Canonical → QA → Delivery(JSON) → Zod validation → IndexedDB`

---

## 3. 正本ファイル

正式データ整理時の正本はExcel workbookを基本とする。

推奨シート構成:

1. `README`
2. `QUESTIONS`
3. `CHOICES`
4. `EXPLANATIONS`
5. `CHOICE_EXPLANATIONS`
6. `SOURCES`
7. `RELATIONS`
8. `QA_LEDGER`
9. `TAXONOMY`

1問を複数シートに分ける理由は、4択以外の問題形式、選択肢数の変更、長文解説、複数の参考文献、関連問題を安全に扱うためである。

Excel正本からアプリ配信用データを生成し、JSON側を直接編集しない。

---

## 4. 問題ID体系

### 4.1 canonical_question_id

アプリ・正本で恒久的に使用する一意ID。

例:

- `COM-0001`
- `SWL-0001`

一度正式採用したIDは、問題文を修正しても原則変更しない。

### 4.2 source_question_id

元資料上の問題番号・元ID。

例:

- `LEARN-COM-142`
- `PRED-COM-001`
- `Q142`

### 4.3 legacy_id

過去の統合ID等を保持するための任意項目。

旧IDを削除せず、canonical_question_idへ紐付ける。

### 4.4 case_id

状況設定・症例を複数設問で共有する場合に使用する任意ID。

---

## 5. QUESTIONSシート必須項目

| field | 内容 |
|---|---|
| canonical_question_id | 恒久的な正式ID |
| source_question_id | 元資料ID |
| legacy_id | 旧統合ID等、なければ空欄 |
| case_id | 症例共通ID、なければ空欄 |
| subject | 科目 |
| unit | 単元 |
| topic | 中心論点 |
| source_group | 日本看護協会 / 学研 / 過去問 / 予想問題 等 |
| source_id | SOURCESシート参照ID |
| question_format | single-choice / multiple-choice / true-false / fill-blank / short-answer |
| importance | S+ / S / A / B |
| source_prompt | 元資料問題文 |
| canonical_prompt | 正式採用問題文 |
| source_answer | 元資料記載正答 |
| final_answer | 最終QA正答 |
| answer_discrepancy | none / reviewed-different |
| revision | 正の整数 |
| record_status | candidate / adopted / hold / excluded / retired |
| exclusion_reason | 除外理由 |
| tags | 補助タグ |
| notes | 管理上の備考 |

### 原則

- `source_prompt`は原資料保持用で、通常は変更しない。
- 表記統一・誤植修正等は`canonical_prompt`に反映する。
- `source_answer`と`final_answer`は分ける。
- 正答を変更した場合、理由をQA_LEDGERに必ず記録する。

---

## 6. CHOICESシート

1選択肢1行とする。

| field | 内容 |
|---|---|
| canonical_question_id | 問題ID |
| choice_key | A / B / C / D / E 等 |
| choice_order | 表示順 |
| source_choice_text | 元資料選択肢 |
| canonical_choice_text | 正式採用選択肢 |
| is_source_correct | 元資料上の正誤 |
| is_final_correct | 最終QA上の正誤 |

これにより4択固定にせず、複数選択・2択・将来の選択肢数変更にも対応する。

---

## 7. EXPLANATIONSシート正式構造

各問題の標準化解答解説は以下を保持する。

| field | 内容 |
|---|---|
| canonical_question_id | 問題ID |
| answer_summary | 正答を端的に示す解説 |
| question_intent | この問題で問われていること |
| reasoning | 正解に至る考え方 |
| surrounding_knowledge | 関連する周辺知識 |
| clinical_notes | 臨床現場での注意点 |
| laws_guidelines | 関連法規・ガイドライン、必要時 |
| key_points | 試験で覚える要点 |
| mnemonic | 覚え方、必要時 |
| references | 参考文献・根拠、必要時 |
| explanation_revision | 解説revision |

### 解説の正式表示順

1. 解答
2. この問題で問われていること
3. 正解に至る考え方
4. 各選択肢解説
5. 関連する周辺知識
6. 臨床現場での注意点
7. 関連法規・ガイドライン（必要時）
8. 参考文献（必要時）

`answer_summary`だけに情報を集約せず、構造化項目を保持する。

---

## 8. CHOICE_EXPLANATIONSシート

1選択肢1行で管理する。

| field | 内容 |
|---|---|
| canonical_question_id | 問題ID |
| choice_key | A / B / C / D 等 |
| final_judgement | correct / incorrect |
| reason | 正誤理由 |
| correction_condition | 誤答選択肢が正しくなる条件、該当なしは`N/A` |
| corrected_statement | 必要時、正しい文への修正 |
| differential_notes | 鑑別・混同しやすい点 |
| clinical_caution | 必要時の臨床注意点 |

「誤りです」だけの解説は禁止する。

誤答選択肢は原則として、なぜ誤りか、どの条件なら正しいか、または正しい文への修正を明示する。

---

## 9. SOURCESシート

出典情報を問題本文から分離する。

| field | 内容 |
|---|---|
| source_id | 一意ID |
| source_group | 日本看護協会 / S-QUE / 学研 / 過去問 / 予想問題 / テキスト / ガイドライン 等 |
| title | 資料名 |
| edition_year | 版・年度 |
| publisher_org | 発行元 |
| source_location | 問題番号・章・ページ等 |
| answer_authority | official / provided / audited / reference-only |
| notes | 備考 |

出典競合が起きても元資料情報を失わない。

---

## 10. 正答監査ルール

1. 元資料記載正答は`source_answer`に保存する。
2. 最終採用正答は`final_answer`に保存する。
3. 同一の場合でも両方保持可能とする。
4. 異なる場合、元資料を上書きしない。
5. QA_LEDGERに以下を記録する。
   - 変更前正答
   - 変更後正答
   - 変更理由
   - 根拠資料
   - 監査日
   - QA判定
6. 根拠が不十分な場合は`hold`とし、推測で確定しない。

---

## 11. 重複・類似問題整理ルール

完全重複だけでなく中心論点の重複も記録する。

`duplicate_class`:

- `unique`: 実質的重複なし
- `exact_duplicate`: 問題文・論点が実質同一
- `high_similarity`: 表現違いだが問う判断がほぼ同一
- `same_topic_distinct`: 同じ論点だが病期・条件・判断が異なるため残す
- `merge_candidate`: 統合候補

RELATIONSシートに以下を保持する。

| field | 内容 |
|---|---|
| question_id | 対象問題 |
| related_question_id | 関連問題 |
| relation_type | duplicate / similar / prerequisite / follow-up / same-case / related |
| duplicate_class | 上記分類 |
| canonical_keep_id | 重複時に残す問題ID |
| rationale | 判定理由 |

### 削除原則

- 同一疾患・同一テーマという理由だけで削除しない。
- 病期、重症度、病変部位、検査所見、介入判断、生活背景等が異なり、異なる臨床判断を求める問題は残す。
- 除外した問題もID・出典・除外理由を正本から完全削除せず、`excluded`として履歴を残す。

---

## 12. QA_LEDGER

QAは1つの曖昧なステータスではなく、監査項目別に管理する。

推奨項目:

- `structure_qa`: pending / pass / fail
- `answer_qa`: pending / pass / fail
- `explanation_qa`: pending / pass / fail
- `choice_explanation_qa`: pending / pass / fail
- `currentness_qa`: pending / pass / fail
- `duplicate_qa`: pending / pass / fail
- `source_traceability_qa`: pending / pass / fail
- `final_qa`: pending / pass / fail

`final_qa=pass`となる条件:

- 必須項目欠損なし
- 正答監査PASS
- 解説構造PASS
- 選択肢解説PASS
- 現行性確認PASSまたは対象外
- 重複監査PASS
- 出典追跡可能

---

## 13. TAXONOMY

科目・単元・中心論点の表記揺れを防ぐため、自由入力だけにしない。

例:

`subject → unit → topic`

の階層を正式マスターとして管理し、問題側はこのマスターから選択する。

重要度S+/S/A/BもTAXONOMY上で定義する。

重要度評価は、出題頻度だけでなく以下を総合する。

- 出題頻度
- 再出題可能性
- 基礎知識としての波及性
- 臨床的重要性
- 誤答しやすさ

---

## 14. 現行共通科目データの移行ルール

共通科目の正式データを移行する際は、現行正本を基準とし、旧正本の解説を自動混在させない。

旧ID・旧Versionはlineageとして保持してよいが、旧解説を新正本へ無条件に流用しない。

現行データに存在する以下の情報は、移行時に欠落させない。

- explanation
- choice explanations
- surrounding knowledge
- key points
- mnemonic
- source

これらを本仕様の構造化フィールドへマッピングする。

---

## 15. アプリSchemaとの関係

現在のアプリSchema 0.3は、主に以下を保持している。

- id
- subject / unit / topic
- source
- questionFormat
- importance
- prompt
- explanation
- choices / correctChoiceIndexes または acceptedAnswers
- relatedMaterialIds
- tags
- revision

正式正本はこれより情報量を多く持つ。

したがって、Schema 0.3へ正本を直接合わせて情報を削らない。

v0.8系で問題演習・詳細解説画面の要件が確定した後、Canonical → Deliveryの変換Schemaを更新する。

---

## 16. 正式データ投入までの工程

### Phase D1: Inventory

対象ファイル・問題群・Version・問題数・出典を棚卸しする。

### Phase D2: Normalize

ID、科目、単元、問題形式、出典を統一する。

### Phase D3: Answer Audit

source_answerとfinal_answerを照合する。

### Phase D4: Explanation Standardization

正式解答解説構造へ変換する。

### Phase D5: Duplicate Audit

完全重複、高類似、中心論点重複を分類する。

### Phase D6: Currentness Audit

必要な問題について現行ガイドライン・法規・定義との整合を確認する。

### Phase D7: Final QA

必須項目、ID、正答、解説、重複、出典を最終監査する。

### Phase D8: Delivery Conversion

アプリ配信用JSONへ変換する。

### Phase D9: App Import QA

Zod validation、件数一致、表示、解答判定、解説表示を確認する。

---

## 17. Version管理

Versionは分離する。

- App Version: アプリ本体
- Schema Version: アプリ配信Schema
- Master Data Version: 正本問題・解答解説
- Material Version: 学習資料

正本の修正時はMaster Data Versionを更新する。

アプリのUI修正だけではMaster Data Versionを変更しない。

---

## 18. 禁止事項

- アプリ内JSONを唯一の正本として直接編集する
- 元資料正答を上書きして履歴を消す
- 旧Versionの解説を自動的に新正本へ混在させる
- IDを再利用する
- 重複除外問題を履歴ごと削除する
- 正答根拠が不明な問題を推測でfinal_qa=passにする
- Schema都合で詳細解説を削る
- 正式問題本文・教材本文をPublic repositoryへ保存する

---

## 19. 本仕様確定後の次作業

1. 正式データ棚卸し
2. 現行正本の特定
3. 問題数・ID・出典一覧作成
4. Excel正本テンプレート作成
5. 既存データをテンプレートへ移行
6. 重複・正答・解説QA
7. v0.8のアプリSchemaと最終マッピング
8. 正式データ投入

本仕様v1.0を、正式問題・解答解説データ整理作業の上位基準とする。
