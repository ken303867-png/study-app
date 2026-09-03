# Version Policy

## Version streams

アプリ本体・データ・schemaを独立してVersion管理します。

- App Version: `0.9.0`
- Schema Version: `0.5`
- Explanation Template Version: `1.0`
- Formal Data Specification Version: `1.2`
- Dataset Version: 正式データ作成時に別途付与
- Material Version: 正式資料作成時に別途付与

Schema 0.5は、Schema 0.4の構造化解答解説・Source traceability・MEDIA構造を維持しつつ、Canonical Master DataからDeliveryを再生成するための正式変換・Import境界を追加したDelivery schemaです。
App Versionとは独立して管理します。

Formal Data Specification 1.2は1.1のSource lineage構造を維持したまま、`MATERIALS` / `MATERIAL_BLOCKS` と問題↔資料の双方向参照を追加します。Delivery Schema 0.5は既にMaterial配信構造を持つため、Formal 1.2導入だけを理由にDelivery Schemaを変更しません。

App 0.9.0はDelivery / Formal Schemaを変更せず、ローカル検索・絞り込みと`learningHistory`による学習状態管理を追加します。学習履歴は教材データとは独立し、教材再Import時に削除しません。

## Semantic versioning

- Patch: 不具合修正、開発環境固定、schema互換性を維持する変更
- Minor: 後方互換のある機能追加
- Major: 大規模な互換性変更

## Schema compatibility

- Schema 0.3: 旧 `explanation: string` と問題・資料中心のDelivery構造
- Schema 0.4: 構造化解答解説、SOURCES、SOURCE_OCCURRENCES、MEDIAを追加
- Schema 0.5: Canonical Master → Delivery変換、正式sourceType拡張、ローカルImport QAを追加
- Formal 1.1 Canonical MasterはMaterialなしの従来構造として引き続きImport可能
- Formal 1.2 Canonical MasterはMaterial blockを保持し、Delivery 0.5へ互換Material本文を生成する
- Schema 0.3 / 0.4データを0.5として暗黙変換しない
- 旧SchemaがIndexedDBに残っている場合、UIで再Delivery変換・再投入を要求する
- 教材データを再投入しても、学習履歴テーブルは独立保持する

## Canonical Master policy

- 正式Excel Master Dataを正本とする
- Canonical Master JSON ExportはExcel各sheetを損失なく表す再生成可能な中間データとする
- Delivery JSONはCanonical Masterから再生成可能な配信データとする
- 正式問題本文・正式資料本文を含むMaster JSON / Delivery JSONをGitHubへ保存しない
- `record_status=adopted` かつ `final_qa=pass` の問題だけをDeliveryへ出力する
- `QUESTIONS.related_material_ids` と `MATERIALS.related_question_ids` は完全一致をhard QAする
- Formal 1.2のparagraph / table構造はCanonical `MATERIAL_BLOCKS`で保持し、Delivery本文は決定的に再生成する
- Master変換QAまたはZod validationが失敗した場合、IndexedDB contentを置換しない
- IndexedDB更新は同一transaction内のread-back監査までPASSして初めて成功とし、不一致時はtransactionをabortする
- Legacy migrationではfinal workbook単独からsource lineageを推測せず、確定lineageと突合する
- source-supported inferenceを使用したchoice mappingはprovenanceとmigration reportへ必ず残す
- Legacy独自の学習欄を意味変更してFormal blockへ押し込まず、必要な監査情報をCanonical notesへ保持する

## Learning state policy

- `learningHistory` / `materialHistory` は教材Deliveryと独立したローカル状態とする
- 正式教材の再Import・差し替えでは学習履歴を削除しない
- 不正解・不確実は`needsReview=true`を自動設定する
- 正解時に`needsReview`を自動解除せず、ユーザーが復習完了を明示するまで保持する
- お気に入り・要復習・回答回数・直近結果はクラウドへ送信せずIndexedDBにのみ保存する
- 学習状態はFormal Master / Deliveryの正答・解説内容を書き換えない

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
13. IndexedDB保存後read-back監査（問題・正答・解説・Source occurrence・Material・version metadata）
14. 正式規模と同件数のsynthetic Import負荷QA（正式データをGitHubへ置かない）
15. 問題↔資料の双方向リンクQAとChromium往復ナビゲーションE2E
16. 学習履歴が教材再Import後も保持されること
17. 検索・絞り込みと学習状態のdesktop / mobile Chromium E2E
18. CHANGELOG更新

Prettierは開発時の整形ツールとして使用し、CI release gateへの追加は別Versionで検証後に行います。

1項目でもFAILの場合は正式Versionとして固定しません。