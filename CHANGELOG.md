# Changelog

## [Unreleased]

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

### Changed
- 旧 `explanation: string` からExplanation Template v1.0構造へ移行
- Dexie schemaをversion 2へ拡張
- サンプルDeliveryデータをSchema 0.5へ更新
- 旧Schema検出基準をSchema 0.5へ更新
- 正式データImport UIを `.xlsx` / Canonical JSON / Delivery JSON対応へ拡張

### Compatibility
- Schema 0.3 / 0.4を0.5へ暗黙変換しない
- 旧Schema保存データはUIで再変換・再投入を案内する
- 学習履歴は教材Deliveryデータとは独立して保持する
- 正式問題本文を含むMaster / DeliveryデータはGitHubへ保存しない
- 旧v1.47系709問正本をFormal Data Spec v1.1へ暗黙変換しない
- source lineageが不足した旧正本はPreflightで停止し、推測で `source_id` / `source_answer` / `SOURCE_OCCURRENCES` を生成しない
- Lineage Reconstruction CoreはQA reportを返すだけでIndexedDBを更新せず、Formal Canonical Master全体のQA完了前にDeliveryへ昇格しない

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
- Repository分離
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
