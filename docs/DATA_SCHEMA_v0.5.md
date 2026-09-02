# Data Schema 0.5

策定日: 2026-09-03

## 位置づけ

Schema 0.5はSchema 0.4のDelivery構造を維持し、Canonical Master Dataから安全に再生成・Importできる境界を追加する。

上位仕様:

1. `EXPLANATION_TEMPLATE_SPEC_v1.0.md`
2. `FORMAL_QUESTION_EXPLANATION_DATA_SPEC_v1.1.md`
3. `MASTER_DELIVERY_CONVERSION_v1.md`

## Dataset envelope

```text
datasetVersion
schemaVersion = 0.5
questions[]
materials[]
sources[]
sourceOccurrences[]
media[]
```

MEDIA Blob本体は `mediaBlobs` へ分離保存する。

## Schema 0.4からの変更

### 1. sourceType拡張

正式Masterのsource_groupを配信時に不適切な別カテゴリへ潰さないため、次を許可する。

- japan-nursing-association
- s-que
- gakken
- past-exam
- predicted
- textbook
- guideline
- other

SOURCESの `source_group` 原文は別途保持する。

### 2. Canonical Master変換境界

Canonical Master JSON ExportをZodで構造検証し、Conversion QA後にSchema 0.5へ変換する。

Delivery対象:

- record_status = adopted
- final_qa = pass

候補・保留・除外・retired問題はDeliveryへ出力しない。

### 3. Import gate

Import時は次の順序を固定する。

`JSON parse → Master/Delivery識別 → Master conversion QA → Delivery Zod validation → IndexedDB replace`

途中で失敗した場合は `replaceDataset` を呼ばず、現在保存されているcontentを維持する。

## Master変換時の主要QA

- canonical_question_id一意
- source_id一意
- source_occurrence_id一意
- adopted問題にQA_LEDGERが1行
- final_qa=pass
- TAXONOMY完全一致
- primary source存在
- Source occurrence 1件以上
- Explanation 1行
- choice_key一意
- choice_order連続
- CHOICESとCHOICE_EXPLANATIONS件数一致
- choice_key / display_order一致
- is_final_correct と final_judgement一致
- related_material_idsの未接続データを黙って削除しない

## Explanation Template

Schema 0.4と同じExplanation Template v1.0を使用する。

必須:

- answer
- question_intent
- reasoning
- choice_explanations
- key_points
- references

任意:

- surrounding_knowledge
- clinical_notes
- laws_guidelines
- mnemonic
- source_explanation_raw

## Compatibility

Schema 0.3 / 0.4を0.5として暗黙変換しない。

旧SchemaのIndexedDB contentを検出した場合、Schema 0.5 Deliveryの再生成・再投入を要求する。

学習履歴は教材contentとは別テーブルのため、content再投入時にも独立保持する。

## 正本保護

- Excel Master Dataが正本
- Canonical Master JSON Exportは中間データ
- Delivery JSONは配信データ
- 正式問題本文を含むMaster/Delivery JSONはGitHubへ保存しない
- GitHubでは空テンプレートと非正式QA fixtureのみ管理する

## 次のSchema候補

114単元資料Masterと問題Masterの正式双方向リンク、資料Delivery統合が必要になった場合は、互換性を監査してSchema 0.6以降として定義する。
