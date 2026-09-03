# Version Policy

## Version streams

アプリ本体・データ・schemaを独立してVersion管理します。

- App Version: `0.14.0`
- Schema Version: `0.5`
- Explanation Template Version: `1.0`
- Formal Data Specification Version: `1.2`
- Dataset Version: 正式データ作成時に別途付与
- Material Version: 正式資料作成時に別途付与

Schema 0.5は、Schema 0.4の構造化解答解説・Source traceability・MEDIA構造を維持しつつ、Canonical Master DataからDeliveryを再生成するための正式変換・Import境界を追加したDelivery schemaです。
App Versionとは独立して管理します。

Formal Data Specification 1.2は1.1のSource lineage構造を維持したまま、`MATERIALS` / `MATERIAL_BLOCKS` と問題↔資料の双方向参照を追加します。Delivery Schema 0.5は既にMaterial配信構造を持つため、Formal 1.2導入だけを理由にDelivery Schemaを変更しません。

App 0.12.0はDelivery / Formal Schemaを変更せず、既存`learningHistory`から全体成績・科目別/単元別成績・復習優先順位・直近不正解/不確実を再計算する学習ダッシュボードを追加します。分析結果は派生表示であり、Formal Master / Deliveryへ書き戻さず、クラウドへ送信しません。

App 0.13.0はDelivery / Formal Schemaを変更せず、通常演習と独立した試験モードを追加します。試験中は正誤・正答・正式解説を表示せず、任意タイマー、終了時一括採点、科目別集計、誤答・未回答一覧を提供します。試験セッション要約は教材データと分離したIndexedDB `examSessions`へローカル保存します。

App 0.14.0はDelivery / Formal Schemaを変更せず、既存`vite-plugin-pwa`のgenerateSW構成を正式なオフライン層として完成させます。manifest installability、192/512 PNGアイコン、maskable指定、iOS metadata、install prompt、接続状態表示、Service Worker制御後の実オフライン再読込とIndexedDB学習継続をrelease gateで検証します。

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
- 教材データを再投入しても、学習履歴・試験履歴テーブルは独立保持する

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

- `learningHistory` / `materialHistory` / `examSessions` は教材Deliveryと独立したローカル状態とする
- 正式教材の再Import・差し替えでは学習履歴・試験履歴を削除しない
- 不正解・不確実は`needsReview=true`を自動設定する
- 正解時に`needsReview`を自動解除せず、ユーザーが復習完了を明示するまで保持する
- お気に入り・要復習・回答回数・直近結果・試験セッション要約はクラウドへ送信せずIndexedDBにのみ保存する
- 学習状態はFormal Master / Deliveryの正答・解説内容を書き換えない
- 1問演習の自動判定結果は1回答につき1回だけ`learningHistory`へ記録する
- 誤答再挑戦は新しい回答attemptとして記録し、過去のattemptを上書きしない
- 試験モードは試験終了時に回答済み問題だけを1問1attemptとして`learningHistory`へ記録し、未回答問題はattemptへ加算しない

## Learning analytics policy

- 学習ダッシュボードは`questions`と`learningHistory`から毎回再計算する派生表示とし、分析専用の正本データを新設しない
- 学習済み率は`attempts > 0`の問題数 / 全問題数とする
- 正答率は累計`correctCount` / 累計`attempts`とし、不確実回答もattempt分母に含める
- 未回答問題は誤答・弱点として扱わず、未回答として独立表示する
- 要復習件数は`needsReview=true`の全問題を数える
- 復習優先順位で用いる要復習率は、回答済み問題のうち`needsReview=true`の割合とする。未回答に手動で要復習を付けても弱点率を押し上げない
- 復習優先順位は、回答履歴がある科目/単元のみを対象に「要復習率の高い順 → 非正答率（誤答+不確実）の高い順 → 正答率の低い順 → 回答回数の多い順」で決定する
- 直近要注意問題は`lastResult=incorrect/uncertain`かつ`lastAnsweredAt`がある問題を新しい順に表示する
- 分析結果から演習セットを作成する場合も、既存Practice set policyを経由し、Formal Master / Deliveryへ分析結果を書き戻さない

## Practice evaluation policy

- 単一選択・真偽問題は正答indexと単一回答indexの完全一致で判定する
- 複数選択は回答index集合と正答index集合の完全一致で判定し、順序は問わない
- 穴埋め・短答はNFKC正規化・前後空白除去・大文字小文字正規化・連続空白圧縮後に`acceptedAnswers`と完全一致で判定する
- 正答表示・正式解説はDeliveryに保存済みの正式データを参照し、演習UI側に正答内容を複製しない
- 回答確定後のみ正答・正式解説を表示する
- セッション開始時点の出題集合を固定queueとして使用し、演習途中の履歴更新で出題集合を変化させない

## Practice set policy

- 演習セットの母集団は「全問題」または問題一覧の現在の絞り込み結果とする
- 学習状態による対象は `すべて / 要復習 / 未回答 / お気に入り / 直近不正解 / 直近不確実` の6種類とする
- `要復習` は `learningHistory.needsReview=true` の問題のみを対象とする
- `未回答` は履歴が存在しない、または `attempts=0` の問題を対象とする
- `お気に入り` は `favorite=true`、直近結果系は`lastResult`で判定する
- 対象抽出後に出題順を適用し、その後に出題数上限を適用する
- ランダム出題は元の問題配列を破壊せず、演習用queueのコピーだけをshuffleする
- 出題数は `全件 / 10 / 20 / 50問` とし、対象件数より大きい指定では対象全件を使用する
- 0件の演習セットは開始不可とし、別条件の選択を促す
- 演習セット構成はローカルUI状態であり、Formal Master / Deliveryへ保存しない

## Exam mode policy

- 試験モードはPractice setで確定した固定queueを使用し、試験途中の履歴更新で出題集合を変更しない
- 試験中は正誤・正答・正式解説・過去の学習成績・要復習状態を表示しない
- 試験中は未回答のまま前後の問題へ移動できる
- タイマーは任意とし、設定値は `なし / 30 / 60 / 90 / 120分` とする
- タイマーが0になった場合は同じ一括採点経路を`timeout`理由で実行する
- 手動終了と時間切れは同一集計ロジックを使用し、二重採点・二重保存を禁止する
- 一括採点結果は出題数・正解・不正解・未回答・全体正答率・科目別正答率・誤答/未回答一覧を含む
- 全体・科目別正答率は出題数を分母とし、未回答を0点として含める
- 回答済み問題のみ`learningHistory`へ正解/不正解を1attemptとして記録し、未回答は学習attemptへ記録しない
- 試験セッション要約は`examSessions`へ保存し、問題本文・正答・正式解説を複製保存しない
- 試験中断は採点・学習履歴記録・試験セッション保存を行わず終了する

## Offline PWA policy

- Service Workerは`vite-plugin-pwa` / Workbox `generateSW`を使用し、独自Service Workerとの二重管理を行わない
- `registerType=autoUpdate`、旧cache cleanup、navigation fallbackを維持する
- production buildのapp shell・JS/CSS・manifest・PWA iconsをprecacheし、Service Worker制御後はネットワーク切断状態でもアプリを再読込できること
- 正式問題・資料はIndexedDBに保存されたDeliveryを参照し、オフライン化のために正式教材本文をGitHub bundleへ複製しない
- オフライン中の演習・試験・お気に入り・要復習・履歴更新は既存IndexedDBへ保存し、オンライン復帰を必須条件としない
- manifestは`id` / `start_url` / `scope` / `display=standalone`を明示する
- PWAアイコンは192×192 / 512×512 PNGを持ち、512×512をmaskableとしても宣言する
- iOS向け`apple-touch-icon`とmobile-web-app metadataをHTMLへ含める
- `beforeinstallprompt`が利用可能な環境ではアプリ内インストール操作を表示し、利用できない環境では通常UIを妨げない
- `navigator.onLine`とonline/offline eventに基づき接続状態を表示する
- 接続状態UIは既存の採点・Import用`role=status`と競合させない
- オフラインQAはproduction preview上でService Workerが実際にpageをcontrolした後、ネットワークを切断し、reloadと学習状態永続化まで検証する

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
18. 単一選択・複数選択・穴埋め/短答の演習判定Vitest
19. 1問表示→回答確定→自動正誤判定→正式解説→次問→結果表示のdesktop / mobile Chromium E2E
20. 不正解時の要復習自動設定と誤答のみ再挑戦E2E
21. 演習回答が`learningHistory`へ重複記録されないこと
22. 学習状態別演習セット抽出・出題数上限・非破壊shuffleのVitest
23. 要復習専用セット作成・ランダム指定・0件セット開始防止のdesktop / mobile Chromium E2E
24. 全体・科目別・単元別の学習集計、未回答除外、復習優先順位、直近要注意順のVitest
25. 不正解回答→ダッシュボード反映→弱点科目の要復習セット作成のdesktop / mobile Chromium E2E
26. ダッシュボードの直近要注意問題から問題カードへ直接移動できること
27. 試験中に正誤・正答・正式解説・過去学習成績が表示されないこと
28. 試験終了時の一括採点、全体/科目別正答率、誤答/未回答一覧のVitest / desktop / mobile Chromium E2E
29. 試験回答済み問題だけが`learningHistory`へ1attemptとして記録され、未回答がattemptへ加算されないこと
30. `examSessions`が教材再Import後も保持されること
31. 任意タイマー表示と時間切れ共通採点経路が二重保存を起こさないこと
32. manifest `id/start_url/scope/standalone`、192/512 PNG、maskable、iOS metadataが存在すること
33. `beforeinstallprompt`を利用したインストール操作がdesktop / mobile Chromium E2Eで動作すること
34. production Service Workerがpageをcontrolした後、ネットワーク切断状態でreloadできること
35. オフラインreload後もIndexedDB教材を表示でき、オフライン回答が保存・再読込されること
36. 接続状態表示がonline/offline eventに追従し既存status roleを破壊しないこと
37. CHANGELOG更新

Prettierは開発時の整形ツールとして使用し、CI release gateへの追加は別Versionで検証後に行います。

1項目でもFAILの場合は正式Versionとして固定しません。
