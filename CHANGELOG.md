# Changelog

## [Unreleased]

## [0.14.0] - 2026-09-03

### Added
- production `vite-plugin-pwa` / Workbox Service Workerを正式オフライン層として固定
- manifest `id` / `start_url` / `scope` / `display=standalone` / 日本語・education metadata
- 192×192 / 512×512 PNG PWAアイコン
- 512×512 maskableアイコン指定
- iOS `apple-touch-icon` / mobile web app metadata
- `beforeinstallprompt`を利用した「アプリをインストール」操作
- オンライン / オフライン接続状態表示
- manifest・PWA icon HTTP配信E2E
- Service Worker制御後にネットワークを切断し、アプリをoffline reloadする実ブラウザE2E
- オフラインreload後のIndexedDB教材表示と、オフライン回答保存・再読込E2E

### Changed
- アプリ表示Versionを0.14.0へ更新
- PWA接続/インストール操作を既存app headerと重ならない独立ステータス列へ配置
- 接続状態UIは既存の採点・Import `role=status`と競合しないARIA構造へ変更
- 既存generateSW / autoUpdate / outdated-cache cleanup / navigation fallbackを再利用し、独自Service Workerは追加しない

### Compatibility
- Delivery Schema 0.5を維持
- Formal Data Spec 1.2を維持
- Explanation Template 1.0を維持
- 正式問題・正答・解説・資料本文をPWA bundleへ複製しない
- 正式709問・114資料本文はGitHubへ保存しない
- オフライン利用でも教材Delivery・`learningHistory`・`materialHistory`・`examSessions`はIndexedDBの既存構造を維持
- Cloud / In-app AIは引き続き無効

## [0.13.0] - 2026-09-03

### Added
- 通常演習と切り替えて使用できる「試験モード」
- 試験終了まで正誤・正答・正式解説・過去学習成績を表示しない受験UI
- 未回答のまま前後の問題へ移動できる試験ナビゲーション
- `なし / 30 / 60 / 90 / 120分`から選択できる任意タイマー
- 時間切れ時の自動一括採点
- 出題数・正解・不正解・未回答・全体正答率・所要時間の試験結果
- 科目別正答率・正解数・不正解数・未回答数の試験結果表
- 誤答・未回答問題一覧
- 教材Deliveryと独立したIndexedDB `examSessions`試験セッション保存
- 試験集計・未回答分離・タイマー表示・試験履歴保持のVitest
- 試験中の正答非表示→一括採点→学習履歴反映を確認するdesktop / mobile Chromium E2E
- 未回答問題が`learningHistory` attemptへ加算されないことを確認するdesktop / mobile Chromium E2E

### Changed
- 演習セット作成画面に通常演習 / 試験モード切替と試験タイマー設定を追加
- Dexie schemaをversion 3へ拡張し`examSessions`を追加
- 試験終了時は回答済み問題だけを`learningHistory`へ正解/不正解として記録
- App Versionを0.13.0へ更新

### Compatibility
- Delivery Schema 0.5を維持
- Formal Data Spec 1.2を維持
- Explanation Template 1.0を維持
- 試験セッションはローカル学習状態として扱い、Formal Master / Deliveryへ保存しない
- 教材再Import時も`learningHistory` / `materialHistory` / `examSessions`を保持する
- 正式問題・正答・解説・資料本文は試験機能によって変更しない
- 正式709問・114資料本文はGitHubへ保存しない

## [0.12.0] - 2026-09-03

### Added
- IndexedDB `learningHistory`から再計算する「学習ダッシュボード」
- 全体の学習済み率・総回答回数・正答率・要復習件数・誤答/不確実・未回答・お気に入り集計
- 科目別の学習済み数・回答回数・正答率・誤答/不確実・要復習一覧
- 単元別の同一指標集計
- 要復習率 → 非正答率 → 正答率の低さ → 回答回数の順で並べる復習優先科目/単元
- 未回答問題を弱点判定から除外する学習分析ルール
- 直近結果が不正解/不確実の問題を`lastAnsweredAt`順に表示する要注意一覧
- 弱点科目/単元から既存の演習セット作成画面へ直接移動する導線
- 直近要注意問題から対象問題カードへ直接移動する導線
- 学習分析集計・弱点順位・未回答除外・時系列順のVitest
- 不正解回答→ダッシュボード反映→弱点科目の要復習セット作成を確認するdesktop / mobile Chromium E2E
- ダッシュボードの直近要注意問題→問題カード直接移動E2E

### Changed
- Appナビゲーションに「分析」を追加
- ホームに学習分析への導線を追加
- App Versionを0.12.0へ更新

### Compatibility
- Delivery Schema 0.5を維持
- Formal Data Spec 1.2を維持
- Explanation Template 1.0を維持
- 分析結果は`questions`と`learningHistory`からの派生表示とし、Formal Master / Deliveryへ保存しない
- 分析結果・学習履歴をクラウドへ送信しない
- 正式問題・正答・解説・資料本文は学習分析機能によって変更しない
- 正式709問・114資料本文はGitHubへ保存しない

## [0.11.0] - 2026-09-03

### Added
- 演習開始前に対象・出題順・出題数を選べる「演習セット作成」画面
- 学習状態別の演習対象: すべて / 要復習 / 未回答 / お気に入り / 直近不正解 / 直近不確実
- 元の順番 / ランダムの出題順選択
- 全件 / 10問 / 20問 / 50問の出題数上限
- ホームから要復習問題だけを初期選択した演習セットを作る専用導線
- 問題一覧の現在の絞り込み結果を母集団にした演習セット作成
- 0件条件では演習開始を無効化するガード
- 学習状態別抽出・件数集計・非破壊shuffleを行う`practiceSets`純粋ロジック
- 演習セット抽出・ランダム化・出題数上限のVitest
- 要復習専用セット・ランダム指定・0件開始防止を確認するdesktop / mobile Chromium E2E

### Changed
- Appナビゲーションの「演習」は全問題即開始ではなく演習セット作成画面を開く
- ホーム指標に要復習件数を表示
- App Versionを0.11.0へ更新

### Compatibility
- Delivery Schema 0.5を維持
- Formal Data Spec 1.2を維持
- Explanation Template 1.0を維持
- 演習セット構成はローカルUI状態であり、Formal Master / Deliveryへ保存しない
- 正式問題・正答・解説・資料本文は演習セット機能によって変更しない
- 正式709問・114資料本文はGitHubへ保存しない

## [0.10.0] - 2026-09-03

### Added
- 現在の問題一覧または絞り込み結果を固定queueとして開始する「1問ずつ演習」モード
- 単一選択・真偽問題のradio回答UI
- 複数選択問題のcheckbox回答UI
- 穴埋め・短答問題のテキスト回答UI
- Delivery正答データを使用した自動正誤判定
- 回答確定後の正答表示と正式Explanation Template v1.0解説の自動展開
- 前の問題 / 次の問題 / 結果表示を含む連続演習ナビゲーション
- 回答数・正解数・不正解数・正答率のセッション結果表示
- セッション終了後の「間違えた問題だけ再挑戦」
- 同じ出題集合でもう一度演習する再スタート機能
- 演習結果の`learningHistory`自動記録
- 演習画面内の要復習・お気に入り操作
- 単一選択・複数選択・穴埋め/短答判定のVitest
- 正解ルートと誤答→要復習→誤答のみ再挑戦を確認するdesktop / mobile Chromium E2E

### Changed
- 問題カード・資料カード・正式解説表示を`StudyContentCards`へ分離し、問題一覧と演習モードで同じ正式解説レンダラーを使用
- Appナビゲーションに「演習」を追加
- App Versionを0.10.0へ更新
- 1問演習の回答確定は自己採点ではなくDelivery正答との自動判定として扱う

### Compatibility
- Delivery Schema 0.5を維持
- Formal Data Spec 1.2を維持
- Explanation Template 1.0を維持
- 正式問題・正答・解説・資料本文は演習結果によって変更しない
- 演習履歴は教材データとは独立したIndexedDB `learningHistory`へ保存する
- 正解時にも既存`needsReview`を自動解除しない
- 正式709問・114資料本文はGitHubへ保存しない

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
