# Legacy 709 → Canonical Master Assembly v1

策定日: 2026-09-03

## 1. 目的

本工程は、旧 `v1.47 FINAL 709問` の学習正本と、前工程で確定した Source Lineage Reconstruction を結合し、Explanation Template v1.0 / Formal Data Specification v1.1 に準拠する Canonical Master Data を再構成するための移行仕様である。

最終目的は次の再生成可能な経路を成立させることである。

`Legacy final workbook + source baseline + source locator → lineage → Canonical Master v1.1 → Delivery Schema 0.5`

正式問題本文を含む生成物はGitHubへ保存しない。GitHubへ保存するものは変換コード、仕様、非正式fixture、QAコードのみとする。

## 2. 入力

### 2.1 Final workbook

旧v1.47系 `統合709_学習マスター` をCanonical採用文・最終正答・正式解答解説の入力として使用する。

主要入力列:

- 学習ID
- 統合ID
- 元ID
- 区分
- 17科目
- 大分野
- 中心論点
- 優先度
- 段階
- 設問形式
- 問題文
- 選択肢A〜D
- 正答
- 全体解説
- 選択肢別解説
- 周辺知識
- この問題で問われていること
- 正解に至る考え方
- 比較して覚える
- 試験で間違いやすいポイント
- 誤答肢の正しくなる条件
- 覚えるべきポイント
- 一言で覚える
- 根拠資料
- 元資料解説_原文保持
- 現行性/品質注意
- 標準化状態
- 標準化QA

### 2.2 Source Lineage Reconstruction

前工程で確定したlineageを必須入力とする。

Canonical Assemblyはfinal workbookだけから次を推測しない。

- source_id
- source question number
- source prompt
- source choice text
- source answer
- source occurrence locator
- source answer provenance

`sourceTraceabilityReady !== true` の場合、Canonical Masterへ昇格しない。

### 2.3 Final publication QA

`709最終出版QA_v1.47` の最終出版QA合格根拠をgateとする。

最低限、次を確認できなければassemblyを停止する。

- 総合判定
- 最終出版QA合格
- 完全重複監査
- 現行性監査

## 3. Canonical Masterへの対応

### QUESTIONS

- `canonical_question_id` ← 学習ID
- `source_question_id` ← lineageの元ID
- `legacy_id` ← 統合ID
- `subject / unit / topic` ← lineage
- `source_prompt` ← lineage source snapshot
- `canonical_prompt` ← final v1.47
- `source_answer` ← lineage
- `final_answer` ← final v1.47 / lineage一致を必須
- `answer_discrepancy` ← lineage
- `question_format` ← single-choice
- `record_status` ← adopted
- `revision` ← 1
- `related_material_ids` ← 空配列

旧正本固有の次の情報は削除せず `QUESTIONS.notes` に保持する。

- 段階
- 設問形式
- 比較して覚える
- 試験で間違いやすいポイント
- 現行性/品質注意
- 標準化状態
- 標準化QA

### SOURCE_OCCURRENCES

前工程で確定したsource occurrenceをそのまま使用する。

- source occurrence ID
- source ID
- source question number
- source location
- source answer
- source prompt snapshot
- answer provenance
- question / answer page情報

### CHOICES

各A〜Dについて source snapshot と canonical snapshot を分離して保持する。

- `source_choice_text`
- `canonical_choice_text`
- `is_source_correct`
- `is_final_correct`

### EXPLANATIONS

旧正本の正式解答解説を次へ対応する。

- `answer_summary` ← 全体解説
- `question_intent` ← この問題で問われていること
- `reasoning` ← 正解に至る考え方
- `surrounding_knowledge` ← 周辺知識
- `key_points` ← 覚えるべきポイント
- `mnemonic` ← 一言で覚える
- `references` ← 根拠資料
- `source_explanation_raw` ← 元資料解説_原文保持

`比較して覚える` と `試験で間違いやすいポイント` は意味を変えて別ブロックへ押し込まず、migration metadataとして保持する。

## 4. CHOICE_EXPLANATIONS再構成

旧正本の `選択肢別解説` と `誤答肢の正しくなる条件` は記述形式が一様ではないため、次のmapping modeで復元する。

### 4.1 explicit-choice

例: `A：...`、`B「...」は...`

選択肢が明示されている場合はその選択肢へ直接対応する。

provenance: `source_explicit_option_explanation`

### 4.2 group-expanded

例: `A〜C：...`、`A・C：...`

正順で有効な範囲・列挙を各choiceへ展開する。

provenance: `source_raw_parsed`

### 4.3 subitem-composed

旧問題がa〜e等の小項目を持ち、A〜Dがその組み合わせを表す場合、小項目解説を組み合わせ肢へ再構成する。

例:

- a：正しい
- b：誤り
- A = aとb

→ Aのreasonへa/bの根拠を結合する。

provenance: `source_supported_inference`

### 4.4 complement-repair

旧正本に `B〜A`、`D〜C` 等の逆順範囲表記が存在し、同じセル内にfinal answerの明示的な個別解説がある場合のみ、未割当肢をfinal answerの補集合として復元できる。

この処理は原文修正ではない。

- 原文は保持する
- 推論結果をchoice mappingへ使用する
- provenanceは `source_supported_inference`
- 対象question IDをmigration reportへ記録する

### 4.5 all-items-inference

旧正本が「a〜dはいずれも正しいためD『すべて』が正答」等のsummary形式である場合、Dへsummaryを対応し、他の部分組み合わせ肢へは「全項目を含まないため正答肢ではない」という関係を復元する。

provenance: `source_supported_inference`

### 4.6 statement-correct-no-change

「誤っているものを選べ」等の否定設問で、誤答肢側の記述そのものは正しい場合、correction conditionを次の意味で明示する。

`記述自体は正しいため内容修正は不要。設問条件上、正答肢ではない。`

provenance: `source_supported_inference`

### 4.7 common-source-condition

旧正本の修正条件が選択肢別keyを持たない場合、推測で新しい医学的条件を生成しない。

原文を次の形で各未割当誤答肢へ保持する。

`旧正本の共通修正条件：<原文>`

provenance: `source_raw_parsed`

対象question IDをmigration reportへ記録する。

## 5. 正答肢のcorrection condition

正答肢はFormal Schema上 `correction_condition` が必須のため、次を明示する。

`正答肢のため修正不要。`

これは旧医学内容の補作ではなく、Schema上の判定状態を明示するmetadataである。

## 6. QA Gate

Canonical MasterをPASSにする条件:

1. Source Lineage ReconstructionがPASS
2. final workbookとlineageのquestion count一致
3. 学習ID / 統合ID / 元ID / subject / unit / topic / canonical promptが一致
4. final answerがlineage final answerと一致
5. A〜Dすべてにreasonが存在
6. 全誤答肢にcorrection conditionが存在
7. QUESTIONS / EXPLANATIONS / QA_LEDGERが各question 1行
8. CHOICES / CHOICE_EXPLANATIONSが各question 4行
9. SOURCE_OCCURRENCESが各question 1件以上
10. final publication QA evidence確認
11. `canonicalMasterExportSchema` PASS
12. `convertMasterToDelivery()` PASS

いずれかに失敗した場合、Formal Canonical Masterとして確定しない。

## 7. QA_LEDGER

assembly成功時のみ、対象questionを次の状態へ昇格できる。

- structure_qa = pass
- answer_qa = pass
- explanation_qa = pass
- choice_explanation_qa = pass
- currentness_qa = pass
- duplicate_qa = pass
- source_traceability_qa = pass
- final_qa = pass

mapping inferenceを使用した場合も隠さずQA notesへ記録する。

## 8. Formal content policy

次はGitHubへ保存しない。

- v1.47正式問題本文
- 正式選択肢
- 正式解答解説
- 原問題PDF / 原解答PDF
- formal locator sidecar
- 生成した正式Canonical Master JSON / Excel
- Delivery JSON

GitHubへ保存可能:

- adapter / converter code
- schema
- QA code
- synthetic fixture
- migration specification
- formal datasetの件数・QA集計値のみ

## 9. Version policy

本工程はLegacy migration / Canonical assembly機能追加であり、現段階ではDelivery structureを変更しない。

- App Version: 0.7.1 維持
- Delivery Schema: 0.5 維持
- Explanation Template: 1.0
- Formal Data Spec: 1.1

UIへ正式migration workflowを公開する段階でApp minor versionを再評価する。
