# Specialty Supplemental Import Specification v1.0

## Purpose

専門科目の正式問題データを、既存の共通科目Delivery・学習履歴を壊さずに追加・差し替えするためのImport契約です。

この仕様は次の3分類を対象とします。

| 学習分野 | 問題種類 | `supplementalKey` | 必須 `sourceType` |
| --- | --- | --- | --- |
| 専門科目 | 過去問 | `specialty-past` | `past-exam` |
| 専門科目 | 予想問題 | `specialty-predicted` | `predicted` |
| 専門科目 | 予想事例問題 | `specialty-predicted-case` | `predicted` |

## Import mode

専門科目の追加データはDelivery Schema 0.5 JSONで作成し、rootに次を付与します。

```json
{
  "importMode": "supplemental-replace",
  "supplementalKey": "specialty-predicted",
  "datasetVersion": "<local dataset version>",
  "schemaVersion": "0.5"
}
```

`importMode=supplemental-replace` は、同じ `supplementalKey` の既存追加問題・sourceだけを置換します。共通科目の正式Delivery、他の追加データ、学習履歴、試験履歴は削除しません。

## Required question tags

各問題には次の3種類の識別を必須とします。

### 1. Supplemental identity

`specialty-past` の例:

```text
supplemental:specialty-past
```

### 2. Learning area

専門科目は必ず次を持ちます。

```text
learning-area:specialty
```

`learning-area:common` は同時指定できません。

### 3. Question kind

`question-kind:*` は1問につき1つだけ指定し、`supplementalKey` と完全一致させます。

```text
question-kind:specialty-past
question-kind:specialty-predicted
question-kind:specialty-predicted-case
```

複数の `question-kind:*` を同一問題に付けることは禁止します。

## Source type contract

分類tagだけでなく `sourceType` も一致必須です。

- `specialty-past` → `past-exam`
- `specialty-predicted` → `predicted`
- `specialty-predicted-case` → `predicted`

これにより、分類tagの誤設定とsource lineageの誤設定を同時に検出します。

## Source contract

追加Delivery内のすべての `sources[].source_group` は、対象 `supplementalKey` と同じsupplemental tagに統一します。

例:

```text
supplemental:specialty-predicted-case
```

`sourceOccurrences` はDelivery Schema 0.5の参照整合性を満たし、各 `canonical_question_id` / `source_id` が同じ追加Delivery内またはマージ後Deliveryで解決可能である必要があります。

## Materials

専門科目supplemental Import v1.0では `materials` は空配列とします。

```json
"materials": []
```

専門科目の独立した学習資料を追加する場合は、問題supplementalとは別にMaterial Master / Formal Data Specの拡張方針を確定してから導入します。

## Hard QA

Import前に以下をhard QAします。

1. 問題数が1問以上であること
2. `materials` が空であること
3. 全問題が `supplemental:<supplementalKey>` を持つこと
4. 全sourceの `source_group` が同じsupplemental tagであること
5. 専門科目では全問題が `learning-area:specialty` を持つこと
6. 専門科目に `learning-area:common` が混入していないこと
7. `question-kind:*` が1つだけで、`supplementalKey` と一致すること
8. `sourceType` が分類仕様と一致すること
9. Delivery Schema 0.5のZod検証を通過すること
10. IndexedDB保存後read-back監査を通過すること

1件でも失敗した場合はImportを中止し、既存IndexedDB教材データを置換しません。

## Recommended stable IDs

正式データでは再Import時に同一問題を安全に置換できるよう、IDを安定させます。

推奨例:

```text
SP-PAST-001
SP-PRED-001
SP-PRED-CASE-001-Q01
```

事例問題で1事例に複数設問を持つ場合、現行Deliveryでは各設問を独立Questionとして保持し、同一caseを示す安定したID prefixまたはtagを使用します。将来Case Masterを追加しても `question-kind:specialty-predicted-case` は維持します。

## Formal import workflow

1. 正式データをローカル環境でDelivery Schema 0.5 JSONへ整形する
2. 対象3分類ごとに別 `supplementalKey` として分離する
3. tag / `sourceType` / source lineageをQAする
4. Study Appの「データ管理」からImportする
5. Import結果の追加問数・置換問数・全体問数を確認する
6. 問題一覧で学習分野・問題種類の件数を確認する
7. 各分類から代表問題を通常演習し、正答判定・正式解答解説表示を確認する
8. 予想事例問題は事例本文の段落・設問表示も確認する
9. 再Importで同じ `supplementalKey` だけが差し替わることを確認する
10. 共通科目・他の専門分類・学習履歴が保持されていることを確認する

## Compatibility

- App: 0.16.x
- Delivery Schema: 0.5
- Formal Data Spec: 1.2を維持
- Explanation Template: 1.0を維持
- Local-first / IndexedDB方針を維持
- Cloud同期・アプリ内AIは使用しない

## Data policy

正式問題本文、正答、正式解説、正式教材本文をGitHub repositoryへ保存しません。

GitHubで管理するのは仕様、Schema、変換・Importロジック、テスト、非正式QA fixtureのみです。
