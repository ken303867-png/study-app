# 正式問題・解答解説データ整理仕様 v1.2

策定日: 2026-09-03

## 0. Version 1.2 の位置づけ

v1.2 は v1.1 の SOURCE_OCCURRENCES を維持したまま、学習資料を正式Master Dataへ統合する改訂版である。

追加する正式シートは次の2つである。

- `MATERIALS`
- `MATERIAL_BLOCKS`

v1.1正本は引き続きImport可能とし、MATERIALS / MATERIAL_BLOCKSが存在しない場合は空配列として扱う。

Delivery Schemaは0.5を維持する。Canonical Master側で段落・表の順序付き構造を保持し、Delivery 0.5の`materials[].body`はMATERIAL_BLOCKSから決定的に再生成する。

---

## 1. 正本Excel / Canonical JSONシート構成

1. README
2. QUESTIONS
3. SOURCE_OCCURRENCES
4. CHOICES
5. EXPLANATIONS
6. CHOICE_EXPLANATIONS
7. SOURCES
8. RELATIONS
9. QA_LEDGER
10. TAXONOMY
11. MEDIA
12. MATERIALS
13. MATERIAL_BLOCKS

MATERIALS / MATERIAL_BLOCKSはFormal 1.2で追加されたCanonical層であり、教材本文をDelivery用の単一文字列へ不可逆に潰さないために分離する。

---

## 2. MATERIALS

1行を1つの学習単元として扱う。

| field | 必須 | 内容 |
|---|---|---|
| material_id | 必須 | 学習単元の恒久ID |
| subject | 必須 | 科目 |
| unit | 必須 | 単元表示名 |
| title | 必須 | 資料タイトル |
| importance | 必須 | S+ / S / A / B |
| revision | 必須 | 正の整数 |
| source_file_name | 任意 | 構造化元の正式ファイル名 |
| source_file_sha256 | 任意 | 構造化元ファイルのSHA-256 |
| source_heading | 任意 | 原稿上の単元見出し |
| source_related_problem_raw | 任意 | 原稿上の関連問題表記を原文保持 |
| related_question_ids | 必須扱い | Canonical Question ID配列 |
| tags | 任意 | 検索・分類用タグ |

`related_question_ids`は根拠のあるCanonical Question IDのみを登録し、別ID体系から推測変換しない。

---

## 3. MATERIAL_BLOCKS

1行を、あるMaterial内の1つの順序付きコンテンツblockとして扱う。

| field | 必須 | 内容 |
|---|---|---|
| block_id | 必須 | block恒久ID |
| material_id | 必須 | MATERIALS.material_id参照 |
| section_key | 必須 | セクション識別子 |
| section_order | 必須 | Material内セクション順 |
| section_heading | 必須 | 原稿見出し |
| block_order | 必須 | セクション内block順 |
| block_type | 必須 | paragraph / table |
| text | 条件付き必須 | paragraph本文 |
| table_rows | 条件付き必須 | tableの2次元文字列配列 |

### 3.1 paragraph

- `text` 必須
- `table_rows` 禁止

### 3.2 table

- `table_rows` 必須
- `text` 禁止
- 空セルは文字列として保持できる

### 3.3 順序保持

- 同一section_keyではsection_orderを一致させる。
- 同一Materialで同じsection_orderを別section_keyへ再利用しない。
- block_orderは各section内で1から連続させる。

---

## 4. 問題 ↔ 学習資料の双方向リンク

QUESTIONSには従来の`related_material_ids`を使用する。
MATERIALSには`related_question_ids`を使用する。

Formal 1.2では両者を完全一致させる。

例:

- QUESTIONS.Q001.related_material_ids = [M001]
- MATERIALS.M001.related_question_ids = [Q001]

片方向だけの登録はDelivery変換を中止するhard errorとする。

次もhard errorとする。

- 存在しないmaterial_id参照
- 存在しないquestion_id参照
- excluded / retired等、Delivery対象外問題へのMaterial参照
- 同一配列内ID重複

---

## 5. Delivery Schema 0.5への変換

Formal 1.2追加だけではDelivery Schemaを変更しない。

MATERIALS → Delivery material:

- material_id → id
- subject → subject
- unit → unit
- title → title
- importance → importance
- revision → revision
- related_question_ids → relatedQuestionIds
- tags → tags

MATERIAL_BLOCKSはsection_order / block_order順に並べ、Delivery `body`を再生成する。

- セクション見出しを1回出力
- paragraphはtextをそのまま出力
- tableは行順を保持し、セルを ` | ` で連結する

CanonicalのMATERIAL_BLOCKSが正本であり、Delivery bodyは再生成可能な派生物とする。

---

## 6. Phase3 得点特化要点まとめ集114単元の移行ルール

正式構造化元はPhase0で確定した17科目Word正本を基盤とするPhase3 Canonical JSONとする。

移行時:

- `unitId` → material_id
- 17科目 / 114単元の順序とタイトルを保持
- `sections[].blocks[]` をMATERIAL_BLOCKSへ展開
- paragraph/tableを型変換せず保持
- `relatedOfficialProblemIds`だけを正式問題リンクとして採用
- Phase3の`relatedQuestionIds`、`relatedMockQuestionIds`、`relatedPredictionQuestionIds`は、現行709問Canonical IDとの正式crosswalkが存在しない限り自動採用しない

推測によるID置換は禁止する。

---

## 7. QA要件

Formal 1.2 Material統合のrelease gate:

1. material_id一意
2. block_id一意
3. MATERIAL_BLOCKSのmaterial_idが全件解決
4. paragraph/table型条件PASS
5. section_order / block_order整合
6. MATERIALS.related_question_idsがadopted QUESTIONSへ全件解決
7. QUESTIONS.related_material_idsがMATERIALSへ全件解決
8. 双方向リンク完全一致
9. Canonical→Delivery→Zod PASS
10. IndexedDB保存後read-backでmaterialsを含め全件一致

Formalデータ本文はGitHubへ保存せず、CIは非正式synthetic fixtureで同じ変換・保存経路を検証する。
