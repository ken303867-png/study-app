# Architecture v0.7

## Design goals

1. 仕様変更時に影響範囲を限定する
2. 外部問題データを信用せず実行時検証する
3. UIと保存方式を分離し、将来クラウドを追加可能にする
4. 問題データ更新時に学習履歴を独立保持できる構造を維持する
5. 自動QAをrelease gateにする

## Layers

```text
React UI
  ↓
Feature / use-case layer
  ↓
Repository interface
  ↓
Dexie adapter
  ↓
IndexedDB
```

将来的にクラウドが必要になった場合は、Repository interfaceの下にCloud adapterを追加します。UIから直接Supabase等を呼ばない方針です。

## Content validation

```text
Excel正本
  ↓
CSV / JSON変換
  ↓
Zod Schema
  ↓
ID・参照・正答整合性QA
  ↓
差分確認
  ↓
IndexedDB
```

## GitHub data boundary

GitHubへ保存可能:
- source code
- schemas
- tests
- docs
- blank templates
- non-copyright sample data

GitHubへ保存しない:
- 正式な日本看護協会問題本文
- 学研問題本文
- 過去問本文
- その他利用条件のある教材本文
- 個人用backups
