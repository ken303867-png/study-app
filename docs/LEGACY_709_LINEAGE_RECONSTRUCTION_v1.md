# Legacy 709 Source Lineage Reconstruction v1

策定日: 2026-09-03

## 目的

旧 `統合709_学習マスター` を Formal Data Specification v1.1 へ移行する際、最終問題だけから `source_id` / `SOURCE_OCCURRENCES` / `source_answer` を推測生成しない。

本工程では、次の3層を明示的に突合して source lineage を再構築する。

1. 最終709問正本 (`統合709_学習マスター`)
2. source baseline (`統合720_IDマスター`)
3. 原資料 locator index (原問題・原解答のページと再照合情報)

正式問題本文・教材本文・正式locator indexはGitHubへ保存しない。GitHubには変換コード、仕様、非正式fixtureのみを置く。

## 復元原則

### source snapshot と canonical snapshot を分離する

- source question ID: 旧 `元ID`
- canonical question ID: 最終 `学習ID`
- legacy integrated ID: `統合ID`
- source prompt: source baselineの原問題文
- canonical prompt: 最終709問正本の問題文
- source choice: source baselineの原選択肢
- canonical choice: 最終709問正本の選択肢
- source answer: 原資料に明示された正答
- final answer: 最終709問正本の採用正答

問題文・選択肢・正答が監査で変更されても、source側を上書きしない。

### source answer の根拠優先順位

既存520由来問題は次の順で確定する。

1. source baselineに保持された原解説冒頭の明示正答 (`Nが正解`)
2. 原解説欠落時のみ、locator indexの原資料再照合 `source_answer`
3. final answerをsource answerへ複製しない

予想問題は外部原問題ではないため、source baselineの監査済 `正答_A-E` をsource answerとする。

この優先順位により、旧構造化正答列のマッピング誤りをsource truthとして再利用しない。

## locator index v1.0

原資料locatorはアプリコードとは別のローカルJSONとして管理する。

```json
{
  "version": "1.0",
  "entries": [
    {
      "source_question_id": "EXAMPLE-001",
      "source_question_no": 1,
      "question_page": 1,
      "answer_page": 2,
      "source_answer": "D",
      "source_location": "任意の補足locator",
      "verification_note": "任意の再照合メモ"
    }
  ]
}
```

正式データそのものはこの例へ含めない。

## Source occurrence

既存520由来資料は原問題PDFが1〜520の全体通し番号であることを直接確認済みである。そのため講義ごとに番号が再開する資料とは異なり、source setを推測追加しない。

source occurrenceは原則として次の情報から作る。

- `source_occurrence_id`: source root ID + source question number
- `canonical_question_id`: 最終学習ID
- `source_id`: source document/corpus ID
- `source_question_no`: 原資料の通し設問番号
- `source_occurrence_order`: 原資料の通し設問番号
- `source_location`: 問題PDF/解答PDFのページ、または再照合locator
- `source_answer`: 原資料正答
- `source_prompt_snapshot`: source baselineの原問題文

旧 `元ID` は `QUESTIONS.source_question_id` として保持し、Formal `SOURCES.source_id` と混同しない。

## 2026-09-03 Pilot inventory

正式内容をGitHubへ保存せず、Library上の正本・baseline・原資料PDFをローカル照合した結果は次の通り。

| 項目 | 結果 |
|---|---:|
| source baseline | 720 |
| 最終正本 | 709 |
| ID突合 | 709 / 709 |
| 既存520由来 | 519 |
| 予想200由来 | 190 |
| 既存問題 locator 完備 | 519 / 519 |
| 原解説の明示正答から復元 | 518 |
| 別資料再照合override | 1 |
| 予想問題の監査済正答 | 190 |
| source answer と final answer の差分 | 6 |
| source prompt と canonical prompt の差分 | 94 |
| source choices と canonical choices の差分 | 69 |
| baselineから最終正本で除外 | 11 |
| lineage監査エラー | 0 |

除外source question ID:

- `COM520-364`
- `PRED-COM-034`
- `PRED-COM-101`
- `PRED-COM-129`
- `PRED-COM-134`
- `PRED-COM-141`
- `PRED-COM-161`
- `PRED-COM-171`
- `PRED-COM-172`
- `PRED-COM-188`
- `PRED-COM-200`

source answer と final answer が異なる6問は、source側を改変せず `answerDiscrepancy=reviewed-different` として次工程へ渡す。

## Promotion gate

lineage layerをFormal Canonical Masterへ昇格できるのは、次をすべて満たす場合のみとする。

1. final全問題がbaselineの `元ID` と1対1で突合する
2. `学習ID` / `統合ID` / `元ID` に意図しない重複がない
3. 各source groupにFormal `SOURCES` definitionがある
4. 既存原資料問題は必要locatorが揃う
5. source answerを無推測で確定できる
6. source occurrence IDが一意である
7. source snapshotとcanonical snapshotを別フィールドで保持する
8. source answerとfinal answerの差分を保持する

1件でも満たさない場合、`source_traceability_qa=pass` にしない。

## 今回実装する境界

`legacy709LineageReconstruction.ts` は上記lineage snapshotとQA reportを生成する。

この段階ではIndexedDBへ書き込まない。次工程でExplanation Template v1.0の解説ブロック移行と結合し、Canonical Master Export全体がZod QAを通過した後にのみDelivery Schema 0.5へ変換する。
