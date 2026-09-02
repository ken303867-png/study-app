# Excel正本 → Canonical Master Adapter v1

策定日: 2026-09-03

## 1. 目的

正式Excel正本をアプリへ直接保存せず、次の順序で安全に処理する。

`Excel正本 (.xlsx) → Canonical Master Schema QA → Delivery Schema 0.5変換QA → Zod → IndexedDB`

Excel正本を正本とし、Canonical JSON / Delivery JSON / IndexedDBは再生成可能な派生層とする。

## 2. 依存・実行方針

- 外部CDNを使用しない。
- 新規npm依存を追加しない。
- `.xlsx` のZIP/Deflate展開はWeb標準 `DecompressionStream` を使用する。
- XMLは `DOMParser` で解析する。
- オフライン・ローカル処理を維持する。

## 3. Formal Data Spec v1.1 Excelの必須シート

1. `README`
2. `QUESTIONS`
3. `SOURCE_OCCURRENCES`
4. `CHOICES`
5. `EXPLANATIONS`
6. `CHOICE_EXPLANATIONS`
7. `SOURCES`
8. `QA_LEDGER`
9. `TAXONOMY`

任意:

- `RELATIONS`
- `MEDIA`

`RELATIONS` はDeliveryで現在未使用でもCanonical層から削除しない。

## 4. README機械可読Version

READMEにはA列=key、B列=valueで最低限次を保持する。

| key | value例 |
|---|---|
| masterDataVersion | `common-master-1.0` |
| explanationTemplateVersion | `1.0` |
| formalDataSpecVersion | `1.1` |
| deliveryDatasetVersion | `common-delivery-1.0` |

## 5. データシート規則

- 最初の非空行をfield headerとする。
- headerはCanonical Master field名を使用する。
- 1行目より前に説明行を置かないことを推奨する。
- `tags` / `accepted_answers` / `related_material_ids` はJSON配列または `|` 区切りを使用できる。
- booleanは `TRUE/FALSE` または `1/0` を使用できる。
- 正の整数fieldは整数で保持する。
- 数式セルは禁止する。正式値へ確定してから入力する。
- 空セルは任意fieldの未設定として扱う。

## 6. Import原子性

以下のいずれかで失敗した場合、現在のIndexedDB教材データを置換しない。

1. XLSX構造解析
2. Canonical Master Zod Schema
3. Master → Delivery変換QA
4. Delivery Schema 0.5 Zod validation
5. IndexedDB transaction

## 7. 旧v1.47系709問正本

現行の709問正本は `統合709_学習マスター` を中心とした旧単一シート構造であり、Formal Data Spec v1.1の正規化シート構造とは異なる。

この旧正本をFormal v1.1として暗黙変換しない。Adapterは旧構造を検出した場合、Legacy Migration Preflightへ送る。

理由:

- `SOURCES` が正規化されていない。
- `SOURCE_OCCURRENCES` が正規化されていない。
- 元資料正答と最終採用正答を常に別fieldとして復元できない。
- 旧独自解説fieldを削除・統合すると情報損失が起きる。

## 8. QA

Release gateでは少なくとも次を確認する。

- deflate圧縮された非正式XLSX fixtureの読み込み
- Canonical Master Schema通過
- Delivery変換
- IndexedDB保存
- Chromium E2E表示
- 旧709形式のPreflight停止
- Preflight失敗時のIndexedDB非破壊性

正式問題本文・教材本文はGitHub fixtureへ保存しない。
