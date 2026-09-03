# RC Hardening v0.15

## 目的

v0.14.0 Release Candidateを実使用する前に、正式709問・114資料で負荷が高くなりやすい一覧描画を軽量化する。

機能削除・正式データ変更・Schema変更は行わない。

## 変更

- 問題一覧は初期30問だけを描画し、30問ずつ追加表示する
- 資料一覧は初期20件だけを描画し、20件ずつ追加表示する
- 検索・絞り込み件数と演習セットの母集団は全件を維持する
- フィルタ変更時は描画件数だけ初期batchへ戻す
- 問題↔資料の直接移動では、対象が初期batch外でも対象位置を含むbatchまで自動拡張する
- MEDIAはquestion idごとに一度group化し、各QuestionCardで全MEDIAをfilterし直さない

## 非変更事項

- App表示Version: 0.14.0のまま（RC hardening）
- Delivery Schema: 0.5
- Formal Data Spec: 1.2
- Explanation Template: 1.0
- 正式709問・114資料本文はGitHubへ保存しない
- 学習履歴・試験履歴・IndexedDB schemaは変更しない
- 演習・試験・分析ロジックは変更しない

## QA

- progressive rendering純粋ロジックの境界値Vitest
- 65問非正式fixtureで初期30問表示
- 追加表示後60問
- 演習セット母集団65問維持
- 65問目へのdirect navigationで自動描画拡張
- 既存release gate全件を再実行
