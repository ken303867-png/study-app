# Changelog

## [Unreleased]

## [0.9.0] - 2026-09-03

### Added
- 問題のキーワード・問題ID検索
- 科目・単元・重要度・正式/既存問題/予想問題による問題絞り込み
- 未回答・直近正解・直近不正解・直近不確実・要復習・お気に入り・学習済みの状態絞り込み
- 資料のキーワード・資料ID・科目・重要度・関連問題数による絞り込み
- IndexedDB `learningHistory` を利用した自己採点履歴
- 正解 / 不正解 / 不確実の回数と直近結果
- 要復習・お気に入りのローカルトグル
- 不正解・不確実時の要復習自動設定
- 学習履歴リセット時にお気に入り・要復習を保持する動作
- 教材再Import後も学習履歴が残るVitest QA
- 検索・学習状態永続化のdesktop / mobile Chromium E2E

### Changed
- 問題↔資料の直接移動時に対象を隠す検索条件を自動解除
- ホームに学習済み問題数を表示
- 学習状態はFormal Master / Deliveryとは独立したローカル状態として管理

### Compatibility
- Delivery Schema 0.5を維持
- Formal Data Spec 1.2を維持
- Explanation Template 1.0を維持
- 正式問題・資料本文はGitHubへ保存しない
- 教材差し替え時に`learningHistory` / `materialHistory`を削除しない

## [0.8.0] - 2026-09-03

### Added
- Delivery Data Schema 0.5
- Explanation Template v1.0に準拠した構造化解答解説TypeScript型
- 各選択肢解説の `judgement` / `reason` / `correction_condition` / 任意補助項目
- Formal Data Specification v1.1の `SOURCES` / `SOURCE_OCCURRENCES` Delivery構造
- MEDIA metadataとIndexedDB Blob分離保存
- 正式解答解説の10ブロック表示順UI
- 任意解説ブロックの空見出し抑止
- MEDIA `placement_after` 表示ロジック
- Canonical Master JSON Export Schema
- Canonical Master → Delivery変換QA
- `record_status=adopted` + `final_qa=pass` のDelivery gate
- TAXONOMY / Source occurrence / choice explanation整合性監査
- S-QUE / textbook / guideline / other を含む正式sourceType
- Canonical Master JSON / Delivery JSONのローカルImport UI
- Import失敗時に既存IndexedDB contentを置換しない非破壊性QA
- Canonical Master ImportのVitest / Playwright E2Eテスト
- 空Canonical Master JSON Exportテンプレート
- 新規npm依存なしのCanonical Master `.xlsx` 直接Adapter
- `RELATIONS` のCanonical Master保持Schema
- 旧v1.47系 `統合709_学習マスター` のLegacy Migration Preflight
- Excel正本→Canonical→Delivery→IndexedDBのChromium E2E QA
- 旧709 Preflight停止時のIndexedDB非破壊性QA
- 旧709正本＋source baseline＋locator indexからsource/canonical snapshotを分離するLineage Reconstruction Core
- 原解説明示正答・再照合override・予想問題監査済正答を区別するsource-answer provenance
- source prompt / source choices / source answerをfinal canonical revisionで上書きしないlineage QA report
- Legacy 709 Source Lineage Reconstruction v1仕様書と非正式Vitest fixture
- Legacy v1.47解答解説＋確定lineageからFormal Data Spec v1.1 Canonical Masterを組み立てるAssembly Core
- direct / group / subitem / complement-repair / all-items形式を扱うchoice explanation migration QA
- Legacy 709 Canonical Assembly v1仕様書とCanonical→Delivery 0.5まで検証する非正式Vitest fixture
- IndexedDB書込後に問題・正答・解説・Source occurrence・metadataを同一transaction内で再照合するread-back監査
- read-back不一致時にtransactionをabortして直前datasetを維持するImport rollback gate
- 709問synthetic Canonical Master `.xlsx` をproduction Import経路へ通すChromium負荷・全件保存E2E
- Formal Data Specification v1.2の `MATERIALS` / `MATERIAL_BLOCKS` Canonical構造
- paragraph / tableを順序付きblockとして保持するMaterial Master Schema
- QUESTIONS.related_material_ids ↔ MATERIALS.related_question_idsの双方向完全一致QA
- Phase3 114単元Canonical JSONからFormal 1.2 Material Masterを生成するMigration Adapter
- Canonical Material blocksからDelivery 0.5 `materials[].body`を決定的再生成する変換ロジック
- Canonical 1.2のformalDataSpecVersionをIndexedDB保存後read-back監査まで伝播するmetadata経路
- 問題カードから関連学習資料へ直接移動する双方向Material navigation
- 資料カードから関連問題へ戻るdirect navigationと遷移先フォーカス表示
- 関連問題から開いた資料本文の自動展開
- Delivery Material本文のsection / paragraph / table再構成UI
- Material navigationのVitest / Chromium往復E2E

### Changed
- 旧 `explanation: string` からExplanation Template v1.0構造へ移行
- Dexie schemaをversion 2へ拡張
- サンプルDeliveryデータをSchema 0.5へ更新
- 旧Schema検出基準をSchema 0.5へ更新
- 正式データImport UIを `.xlsx` / Canonical JSON / Delivery JSON対応へ拡張
- `replaceDataset` は保存完了だけでなくread-back監査PASSを返して初めてImport成功とする
- Canonical Master Excel Adapterを `MATERIALS` / `MATERIAL_BLOCKS` / nested `table_rows` 対応へ拡張
- Formal Data Spec 1.1 Import互換性を維持したまま1.2を追加
- 114単元を一括展開せず、資料ごとの折りたたみ表示を標準UIとする

### Compatibility
- Schema 0.3 / 0.4を0.5へ暗黙変換しない
- 旧Schema保存データはUIで再変換・再投入を案内する
- 学習履歴は教材Deliveryデータとは独立して保持する
- 正式問題本文・正式資料本文を含むMaster / DeliveryデータはGitHubへ保存しない
- 旧v1.47系709問正本をFormal Data Spec v1.1へ暗黙変換しない
- source lineageが不足した旧正本はPreflightで停止し、推測で `source_id` / `source_answer` / `SOURCE_OCCURRENCES` を生成しない
- Lineage Reconstruction CoreはQA reportを返すだけでIndexedDBを更新せず、Formal Canonical Master全体のQA完了前にDeliveryへ昇格しない
- Canonical Assemblyはsource-supported inferenceと共通修正条件fallbackをmigration reportへ残し、旧解説原文を上書きしない
- Canonical Assemblyはfinal publication QA・lineage QA・choice mapping QAがすべてPASSするまで正式Masterとして確定しない
- IndexedDB read-back監査がFAILした場合は同一transactionをabortし、部分更新状態を残さない
- Phase3の模試・予想問題用別ID体系は現行709問Canonical IDへ推測変換せず、正式crosswalkがあるリンクだけを採用する
- Formal Data Spec 1.1はMATERIALSなしの既存正本として引き続き読み込み可能

## [0.7.1] - 2026-09-02

### Changed
- Node.js runtimeを `.nvmrc` で固定
- npmを11.19.1へ固定
- 直接依存パッケージをexact Version指定へ変更
- Vite 8 / plugin-react 6 / vite-plugin-pwa 1.3の互換構成へ整理
- typescript-eslintをESLint 10互換構成へ更新
- `package-lock.json` を正式導入
- GitHub Actionsの依存復元を `npm ci` へ変更
- npm cacheをlockfileベースで有効化

### Policy
- `--force` / `--legacy-peer-deps` は正式依存解決に使用しない
- package.json変更時はpackage-lock.jsonを同じPRで更新する
- Cloud / In-app AIは引き続き無効

## [0.7.0] - 2026-09-02

### Added
- React + TypeScript + Vite正式アーキテクチャ
- PWA設定
- Dexie / IndexedDB保存層
- Zod Schema 0.3
- 問題・資料IDの重複および双方向参照切れ検証
- TypeScript strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes
- ESLint / Prettier
- Vitest単体テスト
- Playwright E2Eテスト
- GitHub Actions CI
- 正式問題データをGitHubから除外するデータポリシー

### Policy
- Cloud disabled for initial release
- In-app AI disabled for initial release
- Private GitHub repository becomes source of truth from v0.7 onward