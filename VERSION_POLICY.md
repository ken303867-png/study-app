# Version Policy

## Version streams

アプリ本体・データ・schemaを独立してVersion管理します。

- App Version: `0.7.1`
- Schema Version: `0.5`
- Explanation Template Version: `1.0`
- Formal Data Specification Version: `1.1`
- Dataset Version: 正式データ作成時に別途付与
- Material Version: 正式資料作成時に別途付与

Schema 0.5は、Schema 0.4の構造化解答解説・Source traceability・MEDIA構造を維持しつつ、Canonical Master DataからDeliveryを再生成するための正式変換・Import境界を追加したDelivery schemaです。
App Versionとは独立して管理します。

## Semantic versioning

- Patch: 不具合修正、開発環境固定、schema互換性を維持する変更
- Minor: 後方互換のある機能追加
- Major: 大規模な互換性変更

## Schema compatibility

- Schema 0.3: 旧 `explanation: string` と問題・資料中心のDelivery構造
- Schema 0.4: 構造化解答解説、SOURCES、SOURCE_OCCURRENCES、MEDIAを追加
- Schema 0.5: Canonical Master → Delivery変換、正式sourceType拡張、ローカルImport QAを追加
- Schema 0.3 / 0.4データを0.5として暗黙変換しない
- 旧SchemaがIndexedDBに残っている場合、UIで再Delivery変換・再投入を要求する
- 教材データを再投入しても、学習履歴テーブルは独立保持する

## Canonical Master policy

- 正式Excel Master Dataを正本とする
- Canonical Master JSON ExportはExcel各sheetを損失なく表す再生成可能な中間データとする
- Delivery JSONはCanonical Masterから再生成可能な配信データとする
- 正式問題本文を含むMaster JSON / Delivery JSONをGitHubへ保存しない
- `record_status=adopted` かつ `final_qa=pass` の問題だけをDeliveryへ出力する
- Master変換QAまたはZod validationが失敗した場合、IndexedDB contentを置換しない
- Legacy migrationではfinal workbook単独からsource lineageを推測せず、確定lineageと突合する
- source-supported inferenceを使用したchoice mappingはprovenanceとmigration reportへ必ず残す
- Legacy独自の学習欄を意味変更してFormal blockへ押し込まず、必要な監査情報をCanonical notesへ保持する

## Reproducibility policy

- Node.js Versionは `.nvmrc` で固定する
- npm Versionは `packageManager` とCIで固定する
- 直接依存は `package.json` でexact Version指定する
- 間接依存を含む依存ツリーは `package-lock.json` で固定する
- 通常の開発・CIでは `npm ci` を使用する
- 依存関係を変更したPRでは `package.json` と `package-lock.json` を同時に更新する
- `--force` / `--legacy-peer-deps` によるpeer dependency回避は正式運用では使用しない

## Release gate

正式Version候補は以下をすべてPASSすること。

1. lockfileとpackage.jsonの整合性を `npm ci` で確認
2. TypeScript typecheck
3. ESLint
4. Vitest
5. Production build
6. Playwright E2E
7. Delivery Data schema validation
8. Canonical Master conversion QA
9. Import失敗時の非破壊性QA
10. Legacy source lineage reconstruction QA（Legacy移行時）
11. Legacy explanation / choice mapping → Canonical Assembly QA（Legacy移行時）
12. final publication QA evidence確認（既存正式正本からの移行時）
13. CHANGELOG更新

Prettierは開発時の整形ツールとして使用し、CI release gateへの追加は別Versionで検証後に行います。

1項目でもFAILの場合は正式Versionとして固定しません。
