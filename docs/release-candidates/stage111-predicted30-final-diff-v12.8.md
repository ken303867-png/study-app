# Study App「予想問題30」第111工程｜最終差分セット v12.8

実施日: 2026-09-28

## 判定

**FINAL_DIFF_READY / RELEASE_HOLD**

Stage109のgzip候補にpack形式上の問題を検出したため、配布形式を修正した。

## Stage109候補は公開禁止

現行 `parseDatasetPack()` / `mergePack()` は、gzip展開後を改行で分割し、各行を `role<TAB>JSON` として読む。
Stage109候補は `role<TAB>` の後に改行を含むpretty JSONを入れていたため、2行目以降が不正pack行になる。

Stage109 gzip SHA:
`277ea3f393f05fd12a03a91081b76d71e7d0ca99fafcd01bb602049d4f743378`

は **SUPERSEDED / DO NOT PUBLISH** とする。

## 修正版最終候補

- logical questions: 510
- choices: 2040
- 17科目×30問: PASS
- RC pretty JSON SHA: `1bbfa6120a20d5f24ac5872b8f1cbf058cd852d9bc6ef2d7d6aa1f8275438993`
- minified dataset bytes: 2,486,458
- manifest originalSha256: `8b3841260fb6080bcc0fe9362e97c2df5807f76371880317c4c225dab95166c8`
- gzip bytes: 386,169
- gzip SHA-256: `3674ee944a985f8d710e5657bcefaa6bfd9d4d7ffd881eb71df911e12679f85b`
- base64 length: 514,892
- chunks: 10
- parser round-trip: PASS
- reparsed logical object == RC510: PASS

## Runtime差分 whitelist

公開時のruntime変更は次の11ファイルだけ:
- `public/public-data/manifest.json`
- `public/public-data/common-predicted30-20260928-v12.8/000.b64` ... `009.b64`

既存 `common-predicted30-v1.7/` はrollback用に削除・変更しない。

## Manifest final candidate

- releaseVersion: `2026-09-28.1`
- questionsTotal: 4061
- materials: 114
- sourceOccurrences: 4061
- common-predicted30: 510

外部医療監修、eラーニングPDF来歴認証、明示的公開承認が未完了のため公開しない。
