# Canonical Master → Delivery変換仕様 v1

策定日: 2026-09-03

## 1. 目的

正式Excel Master Dataを正本として維持したまま、アプリへ安全に投入できるDelivery Schema 0.5を再生成する。

正本の優先順位は変えない。

`Excel Master → Canonical Master JSON Export → Conversion QA → Delivery Schema 0.5 → Zod validation → IndexedDB`

Canonical Master JSON ExportとDelivery JSONは再生成可能な派生データであり、正本ではない。

## 2. 現工程の範囲

本Versionでは、Excel workbookの各正式シートを損失なく表現するCanonical Master JSON Exportを入力とする。

外部Excel解析ライブラリは追加しない。これにより、現在固定しているnpm依存関係を変更せず、Master→Delivery変換ロジックとApp Import QAを先に安定化する。

Excel `.xlsx` を直接読み取るadapterは次工程として分離する。直接adapterを追加しても、本書のCanonical Master JSON Export構造と変換QAは変更しない。

## 3. Canonical Master JSON Export

必須Version:

- `masterDataVersion`
- `explanationTemplateVersion = 1.0`
- `formalDataSpecVersion = 1.1`
- `deliveryDatasetVersion`

正式sheet表現:

- `QUESTIONS`
- `SOURCE_OCCURRENCES`
- `CHOICES`
- `EXPLANATIONS`
- `CHOICE_EXPLANATIONS`
- `SOURCES`
- `QA_LEDGER`
- `TAXONOMY`
- `MEDIA`

空テンプレートは `data-templates/canonical-master-json-template.json` を使用する。

正式問題本文を入力したJSONはGit管理しない。

## 4. Delivery対象条件

Deliveryへ出力する問題は以下をすべて満たすこと。

1. `QUESTIONS.record_status = adopted`
2. 対応する `QA_LEDGER` が1行だけ存在する
3. `QA_LEDGER.final_qa = pass`
4. subject / unit / topic が `TAXONOMY` に完全一致する
5. `SOURCES` のprimary sourceを参照できる
6. `SOURCE_OCCURRENCES` が1件以上存在する
7. `EXPLANATIONS` が1行存在する
8. 選択式問題はCHOICESとCHOICE_EXPLANATIONSの対応が完全である
9. 最終正答と選択肢解説のjudgementが一致する
10. Delivery Schema 0.5のZod validationを通過する

`candidate / hold / excluded / retired` はDelivery問題へ出力しない。

## 5. QA gate

`final_qa=pass` の行では以下も満たす。

- structure_qa = pass
- answer_qa = pass
- explanation_qa = pass
- choice_explanation_qa = pass
- duplicate_qa = pass
- source_traceability_qa = pass
- currentness_qa = pass または not-applicable

不一致時はImportを中止し、既存IndexedDB contentを置換しない。

## 6. 出典型マッピング

Delivery Schema 0.5では正式Masterのsource_groupを失わないため、次のsourceTypeを使用できる。

- `japan-nursing-association`
- `s-que`
- `gakken`
- `past-exam`
- `predicted`
- `textbook`
- `guideline`
- `other`

`source_group`原文はSOURCESに保持する。sourceTypeはアプリのフィルタ・表示用途に使う派生分類である。

## 7. 選択肢変換

CHOICESは `choice_order` 順に並べ、`is_final_correct=true` のindexを `correctChoiceIndexes` へ変換する。

CHOICE_EXPLANATIONSは以下をDeliveryへ保持する。

- target_key
- display_order
- judgement
- reason
- correction_condition
- corrected_statement（任意）
- differential_notes（任意）
- clinical_caution（任意）
- mapping_provenance

CHOICESとCHOICE_EXPLANATIONSでchoice_key・表示順・最終正誤が一致しない場合は変換を中止する。

## 8. 穴抜き・一問一答

`fill-blank / short-answer` ではCHOICESとCHOICE_EXPLANATIONSを持たない。

Canonical Master JSON Exportに `accepted_answers` がある場合はそれを使用し、ない場合は `final_answer` を1件のaccepted answerとして使用する。

## 9. MEDIA

MEDIA metadataはDeliveryへ変換するが、Blob本体はJSONへ埋め込まない。

Blobは別経路で `media_id` をキーにIndexedDB `mediaBlobs` へ保存する。

## 10. 学習資料との境界

現工程は正式問題・解答解説MasterのD8/D9を対象とする。

`related_material_ids` が非空の場合は、資料Master変換が未接続であるため変換を中止する。問題データだけを投入するために関連資料IDを黙って削除しない。

114単元資料の正式Delivery変換・問題との双方向リンクは別工程で接続する。

## 11. Import UI

データ管理画面では次をローカルで受け付ける。

- Canonical Master JSON Export
- Delivery Schema 0.5 JSON

Canonical Masterの場合は変換QAとZod validationを実行してから保存する。

Delivery JSONの場合もZod validationを通過した場合のみ保存する。

正式データはネットワーク送信せず、ブラウザ内で処理する。

## 12. 次工程

1. Schema 0.5 / converter / Import UIのCI合格
2. Excel正本の各シートからCanonical Master JSON Exportを作るadapter設計
3. 正式Master Dataの少量pilot変換
4. 件数・ID・正答・解説・Occurrenceの差分監査
5. 全問題のD8変換
6. App Import QA
7. 114単元資料Deliveryとの統合
