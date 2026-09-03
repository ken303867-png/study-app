# Question Category Specification v1.0

## Purpose

演習・問題一覧で使用する「学習分野」と「問題の種類」を統一し、共通科目と専門科目を同一PWAで安全に扱うための分類仕様です。

## Six categories

| 学習分野 | 問題の種類 | Internal key |
| --- | --- | --- |
| 共通科目 | 看護協会Eラーニング | `common-jna` |
| 共通科目 | 穴抜き問題 | `common-cloze` |
| 共通科目 | 予想問題 | `common-predicted` |
| 専門科目 | 過去問 | `specialty-past` |
| 専門科目 | 予想問題 | `specialty-predicted` |
| 専門科目 | 予想事例問題 | `specialty-predicted-case` |

## Canonical tags for future imports

将来追加する専門科目データでは、問題ごとに次の明示タグを付与することを推奨します。

- `learning-area:common`
- `learning-area:specialty`
- `question-kind:common-jna`
- `question-kind:common-cloze`
- `question-kind:common-predicted`
- `question-kind:specialty-past`
- `question-kind:specialty-predicted`
- `question-kind:specialty-predicted-case`

`question-kind:*` が存在する場合は、その値を最優先の分類根拠とします。

## Existing-data compatibility

現在の共通科目データは再Importを不要とするため、次のfallback分類を行います。

1. `supplemental:common-cloze` tag → `common-cloze`
2. `sourceType=japan-nursing-association` → `common-jna`
3. `sourceType=predicted` かつ専門明示なし → `common-predicted`
4. `sourceType=past-exam` → `specialty-past`
5. `sourceType=predicted` かつ専門科目明示 → `specialty-predicted`
6. `sourceType=predicted` かつ事例問題明示 → `specialty-predicted-case`

## UI behavior

### 演習セット作成

1. 学習分野を `共通科目 / 専門科目` から選択する。
2. 選択した学習分野に属する問題種類をチェックボックスで1つ以上選択する。
3. 複数種類を同時選択可能とする。
4. その後、通常演習/試験、学習状態、出題順、出題数、試験タイマーを指定する。
5. 各分類の現在の問題数を画面に表示する。

### 問題一覧

問題一覧の検索・絞り込みにも同じ `学習分野 / 問題の種類` を使用する。

## Predicted case questions

`specialty-predicted-case` は通常の専門予想問題と区別する。将来、1事例に複数設問を紐づけるCase Master構造を追加する場合も、この分類keyを維持する。

## Data policy

正式問題本文・教材本文はGitHub repositoryへ保存しない。分類仕様・Schema・テスト・非正式fixtureのみGitHubで管理する。
