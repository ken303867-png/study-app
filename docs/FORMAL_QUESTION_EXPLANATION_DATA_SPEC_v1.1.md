# 正式問題・解答解説データ整理仕様 v1.1

策定日: 2026-09-02

## 0. Version 1.1 の位置づけ

本仕様 v1.1 は `FORMAL_QUESTION_EXPLANATION_DATA_SPEC_v1.0.md` を継承し、**SOURCE_OCCURRENCES（出題出現）を正式Master Data構造へ追加する改訂版**である。

v1.0 の規定は、本書で変更・追加した部分を除きそのまま有効とする。

今回の改訂目的は、同一資料内で設問番号が繰り返される教材、複数年度・複数講義で同一問題が再出題される資料、同一Canonical Questionが複数の原資料に出現するケースを、ID衝突や出典喪失なしに管理することである。

代表例として、日本看護協会Eラーニングでは講義単元ごとに `設問1/5` から番号が再開するため、単純な `Q1` だけではSource occurrenceを一意に識別できない。

---

## 1. 正本Excelシート構成の改訂

v1.1 では正本Excel workbookの正式シート構成を次のようにする。

1. `README`
2. `QUESTIONS`
3. `SOURCE_OCCURRENCES`
4. `CHOICES`
5. `EXPLANATIONS`
6. `CHOICE_EXPLANATIONS`
7. `SOURCES`
8. `RELATIONS`
9. `QA_LEDGER`
10. `TAXONOMY`

`SOURCE_OCCURRENCES` は、**Canonical Questionそのもの**と、**原資料上でその問題が出現した事実**を分離するための正式シートである。

将来 `MEDIA` 等の正式シートが追加されても、SOURCE_OCCURRENCESの役割は変えない。

---

## 2. SOURCE_OCCURRENCESの基本概念

### 2.1 Canonical Question と Source Occurrence を分離する

`QUESTIONS` の1行は「学習内容としての1つのCanonical Question」を表す。

`SOURCE_OCCURRENCES` の1行は「ある原資料の、ある講義セット・年度・設問番号に、その問題が出現した1回の事実」を表す。

したがって、同一問題が3回出題されている場合は次のようにする。

- `QUESTIONS`: 1行
- `SOURCE_OCCURRENCES`: 3行

同一問題が複数年度や複数講義に再出題されたという理由だけで、Canonical Questionを複製しない。

### 2.2 SOURCE_OCCURRENCESを出題頻度の正本とする

出題回数、再出題回数、年度別出現数、講義別出現数は、`SOURCE_OCCURRENCES` の行数から算出する。

`recurrence_count` 等の集計値を手入力の正本として持たない。

---

## 3. SOURCE_OCCURRENCES正式フィールド

| field | 必須 | 内容 |
|---|---|---|
| source_occurrence_id | 必須 | 出題出現を一意に表す恒久ID |
| canonical_question_id | 必須 | `QUESTIONS.canonical_question_id` 参照 |
| source_id | 必須 | `SOURCES.source_id` 参照 |
| source_set_id | 条件付き必須 | 講義・章・テストセット等を一意に識別するID |
| source_set_label | 任意 | 原資料上の講義名・単元名・セット名 |
| source_set_order | 任意 | 同一source内での講義セット表示順 |
| source_question_no | 条件付き必須 | セット内の設問番号。例: `1`, `2`, `5` |
| source_question_label | 任意 | 原資料上の表記をそのまま保持。例: `設問1/5`, `Q142` |
| source_occurrence_order | 必須 | 同一source内での出現順を表す正の整数 |
| section_type | 任意 | general / case / image / lecture-check / mock / exam 等 |
| exam_label | 任意 | A26、2026模試等の試験・回次ラベル |
| source_year | 任意 | 出題年度・教材年度 |
| source_page_start | 任意 | PDF等の開始ページ |
| source_page_end | 任意 | 複数ページにまたがる場合の終了ページ |
| source_location | 任意 | 章、画面、ページ、URL内位置等の人間可読locator |
| source_answer | 任意 | 当該出現で原資料に記載された正答 |
| source_prompt_snapshot | 任意 | 同一Canonical Questionの出現ごとの文言差を保持する必要がある場合の原文スナップショット |
| notes | 任意 | 出題出現固有の備考 |

### 条件付き必須の扱い

- 講義・章・テストセット内で設問番号が再利用される資料では、`source_set_id` と `source_question_no` を必須とする。
- セット概念がない連番資料では `source_set_id` を空欄にできるが、`source_question_no` または `source_question_label` で原資料上の位置を追跡可能にする。
- ページ番号が存在しないWeb教材等では `source_location` を使用する。

---

## 4. IDルール

### 4.1 source_occurrence_id

`source_occurrence_id` は一度付与したら再利用・変更しない。

推奨形式:

`<SOURCE>-<SUBJECT>-<SET>-Q<NN>`

例:

- `JNA-TEAM-SET01-Q01`
- `JNA-TEAM-SET02-Q01`
- `A26-SWL-CASE04-Q29`

同じ `Q01` でも `source_set_id` が異なれば別のSource occurrenceである。

### 4.2 推奨一意制約

資料構造が許す場合、次の組を一意とする。

`(source_id, source_set_id, source_question_no)`

セット概念がない資料では、次を一意識別に使用する。

`(source_id, source_occurrence_order)`

### 4.3 source_question_idとの関係

v1.0で定義した `QUESTIONS.source_question_id` は、互換性・主要lineage参照として保持する。

ただし、**Source occurrenceの一意識別・再出題回数・講義セット別設問番号の正本はSOURCE_OCCURRENCESとする。**

`QUESTIONS.source_question_id` 単独を出題出現の主キーとして使用しない。

---

## 5. 日本看護協会Eラーニングの正式運用

日本看護協会Eラーニングのように、講義単元ごとに `設問1/5` から番号が再開する資料では、必ず講義セット単位で `source_set_id` を付与する。

例:

| source_occurrence_id | source_set_id | source_question_no | source_question_label |
|---|---|---:|---|
| JNA-TEAM-SET01-Q01 | JNA-TEAM-SET01 | 1 | 設問1/3 |
| JNA-TEAM-SET01-Q02 | JNA-TEAM-SET01 | 2 | 設問2/3 |
| JNA-TEAM-SET02-Q01 | JNA-TEAM-SET02 | 1 | 設問1/3 |

この場合、`SET01-Q01` と `SET02-Q01` は別Source occurrenceであり、ID衝突させない。

講義名が判読できる場合は `source_set_label` に原資料の講義・単元名を保持する。

---

## 6. 複数Source occurrenceを1つのCanonical Questionへ統合するルール

同一または実質同一の問題が複数Source occurrenceに存在する場合、次の条件で1つのCanonical Questionへ紐付けてよい。

- 問う中心論点が同一
- 正答判定ロジックが同一
- 選択肢差が軽微で、学習内容として同一問題と判断できる
- wording差がCanonical化で吸収可能

一方、次の場合は安易に統合しない。

- 正答が異なる
- 条件・病期・検査所見・対象患者が異なる
- 同じテーマでも異なる臨床判断を要求する
- 選択肢変更によって問題の難度・論点が変わる
- 原資料間で問題成立性が異なる

この場合は別の `canonical_question_id` を使用し、`RELATIONS` で `duplicate` / `similar` / `same_topic_distinct` 等を記録する。

---

## 7. Source固有の文言・正答差を失わない

同じCanonical Questionに複数Source occurrenceが紐付く場合でも、出現ごとの情報を失わない。

- 出現ごとの正答は `SOURCE_OCCURRENCES.source_answer` に保持できる。
- 文言差を保存する必要がある場合は `source_prompt_snapshot` を保持する。
- Canonical採用文は `QUESTIONS.canonical_prompt` に保持する。
- 最終採用正答は `QUESTIONS.final_answer` に保持する。

Source occurrence間で正答が競合した場合、元資料を上書きせず `QA_LEDGER` へ差異・根拠・最終判断を記録する。

---

## 8. QA要件の追加

`source_traceability_qa=pass` の条件に、以下を追加する。

1. 採用・候補問題には少なくとも1件のSOURCE_OCCURRENCESが存在する。
2. `source_occurrence_id` が一意である。
3. `canonical_question_id` がQUESTIONSに存在する。
4. `source_id` がSOURCESに存在する。
5. セット内で設問番号が再利用される資料は `source_set_id` が欠損していない。
6. 同一 `(source_id, source_set_id, source_question_no)` の重複が、意図しない二重登録でないことを確認する。
7. 出題頻度はSOURCE_OCCURRENCESから再計算可能である。

これらを満たさない場合、`final_qa=pass` にしない。

---

## 9. Duplicate Auditとの関係

SOURCE_OCCURRENCESの複数行は、必ずしも「重複問題を削除する」という意味ではない。

- **Occurrence duplicate**: 同じCanonical Questionが別講義・別年度に再出題された事実
- **Canonical duplicate**: QUESTIONS側に実質同一問題が複数存在する状態

この2つを区別する。

再出題回数の多さは重要度評価の根拠になり得るが、SOURCE_OCCURRENCESを削除して1件にまとめない。

---

## 10. Delivery / App Schemaとの関係

SOURCE_OCCURRENCESはCanonical Master Dataに属する。

アプリに全Occurrence情報を配信する必要はないが、少なくとも次の用途を想定してSchemaを拡張可能にする。

- 出題頻度表示
- 出典別フィルタ
- 年度別フィルタ
- 日本看護協会Eラーニング講義セット別フィルタ
- 同一問題の再出題履歴表示
- 重要度計算

Delivery生成時に不要なOccurrence詳細を省略しても、Canonical MasterのSOURCE_OCCURRENCESは削除しない。

---

## 11. 移行ルール

既存Master Dataからv1.1へ移行する場合は、次の順で行う。

1. `SOURCES` を確定する。
2. 原資料内の講義・章・テストセット境界を特定する。
3. 各セットへ `source_set_id` を付与する。
4. 各問題出現へ `source_occurrence_id` を付与する。
5. `canonical_question_id` へ紐付ける。
6. 再出題・完全重複をOccurrenceとして保持する。
7. wording・正答が実質異なるものはCanonical統合せずRELATIONSへ送る。
8. `source_traceability_qa` を再実施する。

既存の `QUESTIONS.source_question_id` は削除せず、移行後もlineageとして保持する。

---

## 12. 禁止事項の追加

v1.0の禁止事項に次を追加する。

- `Q1`、`設問1` 等の番号だけをSource occurrenceの一意IDとして使用する
- 再出題を理由にSOURCE_OCCURRENCES行を削除する
- 複数Source occurrenceを統合する際に元の講義セット・年度・ページ情報を失う
- SOURCE_OCCURRENCESの件数を手入力集計値だけで置き換える
- Sourceごとの正答差を上書きして消す

---

## 13. 正式採用

本仕様v1.1を、正式問題・解答解説データ整理作業における現行の上位データ仕様とする。

v1.0は履歴として保持する。

解答解説の表示項目・表示順については `EXPLANATION_TEMPLATE_SPEC_v1.0.md` を上位仕様として併用する。
