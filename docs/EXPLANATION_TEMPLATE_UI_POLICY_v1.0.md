# 解答解説テンプレート → アプリ正式表示仕様 方針 v1.0

策定日: 2026-09-02
更新日: 2026-09-02

## 1. 正式方針

「解答解説テンプレート」Version 1.0を正式確定した。

最終仕様は `docs/EXPLANATION_TEMPLATE_SPEC_v1.0.md` を正とする。

設計の優先順位は次の通りとする。

`Explanation Template v1.0 → Excel正本 → Canonical Data → TypeScript型 → Zod Schema → IndexedDB/Dexie → 解答解説UI`

アプリ側の都合でテンプレート項目を削除・統合・名称変更・意味変更しない。

---

## 2. 正式表示順

1. 解答
2. この問題で問われていること
3. 正解に至る考え方
4. 各選択肢解説
5. 関連する周辺知識
6. 臨床現場での注意点
7. 関連法規・ガイドライン
8. 試験で覚える要点
9. 覚え方
10. 参考文献・根拠

必須/任意、選択肢解説の下位項目、MEDIA仕様は `EXPLANATION_TEMPLATE_SPEC_v1.0.md` に従う。

---

## 3. 図・画像・表

図・画像・表は本文文字列へ直接埋め込まず、MEDIAとして独立管理する。

`placement_after`により各表示ブロックの直後へ挿入できるようにし、画像はIndexedDB/DexieへBlobとして保存可能な構造とする。

---

## 4. 空欄項目

任意項目が空欄の場合、アプリ画面では空の見出しを表示しない。

必須項目は正式データ投入前のQAで欠損を許可しない。

---

## 5. 専門分野データの同期

摂食・嚥下障害看護の最終QA合格126問・選択肢/命題504行について、Explanation Template Version 1.0への同期を完了した。

- 問題同期: 126/126 PASS
- 選択肢・命題: 504行
- reason欠損: 0
- correction_conditionまたはN/A欠損: 0
- source_not_explicit: 0

---

## 6. QA要件

正式データ投入前に、Excel正本、変換、Zod validation、IndexedDB保存・復元、解答解説画面表示、任意空欄、選択肢対応、MEDIA placement、バックアップ復元を検証する。

1項目でも欠落する場合、正式問題データの一括投入へ進まない。

---

## 7. Version管理

- Explanation Template Version: `1.0`
- Master Data Version: 別管理
- App Schema Version: 別管理
- App Version: 別管理

テンプレート項目の追加・削除・意味変更・表示順変更時はテンプレートVersionを更新し、必要に応じてSchema migrationを行う。

---

## 8. 次工程

1. TypeScript型を更新
2. Zod Schemaを更新
3. Dexie/IndexedDB保存Schemaを更新
4. 解答解説UIをVersion 1.0の表示順で実装
5. 保存・復元・表示E2E QA
6. 正式Master DataのDelivery変換へ進む

本方針と `EXPLANATION_TEMPLATE_SPEC_v1.0.md` を、解答解説画面設計における上位決定事項とする。
