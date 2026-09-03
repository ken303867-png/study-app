# Changelog

## [Unreleased]

### Added
- Delivery Schema 0.5 JSONの`importMode: supplemental-replace`による追加教材Import
- `supplementalKey`単位で既存の追加問題だけを差し替え、正式709問・114資料を維持するImport経路
- 共通穴抜き問題向け`answer-only`表示（正式解説を生成せず、解答だけを表示）
- 追加穴抜きImportの初回追加・再Import差し替え・既存正式データ保持を検証するVitest

### Changed
- 追加Importでは既存`datasetVersion` / Explanation Template Version / Formal Data Spec Versionを維持する
- 穴抜き・短答は既存`acceptedAnswers`自動判定をそのまま使用し、追加問題も既存学習履歴機構へ記録する

### Compatibility
- Delivery Schema 0.5を維持
- Formal Data Spec 1.2を維持
- Explanation Template 1.0を維持
- 正式問題・穴抜き問題本文はGitHubへ保存せず、ローカルImportデータとして扱う
- `learningHistory` / `materialHistory` / `examSessions`は追加Importでも削除しない

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
- 試験終了時は回答済み問題だけを`learningHistory`へ正解/不正解として1attemptとして記録
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
- 問題・資料一覧の大量表示時に30問/20資料ずつ段階表示するprogressive renderingを追加
- 対象問題/資料への直接移動時は該当位置まで必要件数を自動表示
- App Versionを0.12.0へ更新

### Compatibility
- Delivery Schema 0.5を維持
- Formal Data Spec 1.2を維持
- Explanation Template 1.0を維持
- 学習分析は派生表示でありFormal Master / Deliveryの本文・正答・解説を変更しない
- 分析データはクラウドへ送信せず、既存ローカル履歴から再計算する

## [0.11.0] - 2026-09-03

### Added
- 問題一覧の絞り込み結果から演習セット作成画面へ移動する導線
- `すべて / 要復習 / 未回答 / お気に入り / 直近不正解 / 直近不確実`から演習対象を選択するPractice set builder
- `登録順 / ランダム`の出題順選択
- `全件 / 10 / 20 / 50問`の出題数選択
- 演習対象0件時の開始防止と件数プレビュー
- 演習結果から「間違えた問題だけ再挑戦」「同じ条件でもう一度」のセッション再構成
- practice setの抽出・ランダム化・件数制限を検証するVitest
- Desktop / Mobile Chromiumで全問題/要復習/誤答再挑戦を確認するE2E

### Changed
- ホーム画面から固定の「全問題」演習ではなく、演習セット作成画面を経由する構成へ変更
- App Versionを0.11.0へ更新

### Compatibility
- Delivery Schema 0.5を維持
- Formal Data Spec 1.2を維持
- Explanation Template 1.0を維持
- 演習セット条件はUI状態として扱い、Formal Master / Deliveryへ保存しない
- `learningHistory`の既存回答履歴・お気に入り・要復習状態をそのまま利用する

## [0.10.0] - 2026-09-03

### Added
- 1問ずつ回答する演習モード
- 単一選択・複数選択・○×・穴埋め・短答の自動判定
- 穴埋め・短答でNFKC正規化、前後空白除去、大文字小文字正規化、連続空白圧縮を行う回答照合
- 回答確定後の正誤・正答・正式解答解説表示
- 誤答時の`needsReview=true`自動設定
- 演習中のお気に入り・要復習操作
- 演習完了時の回答数・正解数・不正解数・正答率表示
- 演習UIと自動採点ルールのVitest / desktop + mobile Chromium E2E

### Changed
- App Versionを0.10.0へ更新
- 回答結果のローカル保存は既存`learningHistory` repositoryを利用

### Compatibility
- Delivery Schema 0.5を維持
- Formal Data Spec 1.2を維持
- Explanation Template 1.0を維持
- 問題本文・正答・正式解説はDelivery参照のみとし、演習UIへ複製しない
- Cloud / In-app AIは引き続き無効

## [0.9.0] - 2026-09-03

### Added
- 正式709問・114資料を想定した大量データ向け段階描画方針
- 問題一覧の30問単位・資料一覧の20件単位での表示制御
- 直接リンク対象までの表示件数を自動拡張するprogressive rendering utility
- Desktop Chromium / Mobile Chromiumで正式規模のSynthetic datasetを読み込み、ホーム・問題一覧・資料一覧・直接リンクを検証するE2E

### Changed
- App Versionを0.9.0へ更新
- 全709問・114資料を初回描画しないことで初期表示負荷を抑制

### Compatibility
- Delivery Schema 0.5を維持
- Formal Data Spec 1.2を維持
- Explanation Template 1.0を維持
- IndexedDB / Dexieの既存保存構造を変更しない
- 正式問題・資料本文はGitHubへ保存しない

## [0.8.0] - 2026-09-03

### Added
- PWA installability / manifest / offline cacheの初期構成
- `vite-plugin-pwa`によるService Worker生成
- local-only data policyの明文化

### Changed
- App Versionを0.8.0へ更新

### Compatibility
- Delivery Schema 0.5を維持
- Formal Data Spec 1.2を維持
- Explanation Template 1.0を維持
- Cloud / login / sync / in-app AIは未実装

## [0.7.0] - 2026-09-03

### Added
- Canonical Master DataからDelivery Schema 0.5へ変換する正式converter
- Canonical Master JSON Export / Excel正本Import
- ZodによるMaster Data / Delivery Dataのruntime validation
- Source occurrence / MEDIA / Material関連のhard QA
- IndexedDB保存後read-back監査とtransaction rollback
- Legacy 709問Excel正本preflightとmigration blocker報告
- Source lineage再構成とchoice mapping provenance
- Formal Data Spec 1.2のMATERIALS / MATERIAL_BLOCKS対応

### Changed
- App Versionを0.7.0へ更新
- Schema 0.5 / Explanation Template 1.0 / Formal Data Spec 1.2へ正式移行

### Compatibility
- 正式709問・114資料のCanonical Master → Delivery変換を正式対応
- 正式問題本文・資料本文はGitHubへ保存しない

## [0.6.0] - 2026-09-03

### Added
- 正式問題データのCanonical Master/Delivery分離設計
- Explanation Template v1.0
- Source traceability / media schema
- IndexedDB content repository / learning state separation

### Changed
- App Versionを0.6.0へ更新

## [0.5.0] - 2026-09-03

### Added
- Delivery Schema 0.5の基礎構造
- 問題 / 資料 / source occurrence / media schema

## [0.4.0] - 2026-09-03

### Added
- 構造化解答解説
- Source traceability
- MEDIA placement

## [0.3.0] - 2026-09-03

### Added
- 初期Delivery Schema
- IndexedDB/Dexie persistence
- 問題・資料の基本UI
