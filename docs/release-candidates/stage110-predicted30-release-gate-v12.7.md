# Study App「予想問題30」第110工程｜公開直前 Release Gate v12.7

実施日: 2026-09-28

## 結論

Stage 110 status: **INTERNAL_RELEASE_GATES_PASS / RELEASE_HOLD**

公開中 main / public-data / GitHub Pages は変更しない。

## 内部ゲート

| Gate | 内容 | 状態 |
|---|---|---|
| G01 | RC510固定: 510問 / 2040肢 | PASS |
| G02 | RC raw SHA-256 = 1bbfa6120a20d5f24ac5872b8f1cbf058cd852d9bc6ef2d7d6aa1f8275438993 | PASS |
| G03 | 17科目×30問 | PASS |
| G04 | question ID 510/510一意 | PASS |
| G05 | SourceOccurrence 510/510一意・参照整合 | PASS |
| G06 | 正答index 510/510維持 | PASS |
| G07 | 学習履歴 questionId 参照 510/510維持 | PASS |
| G08 | 本番想定 4061問 / 114資料 / 4061 occurrence | PASS |
| G09 | RC overlay再パック・round-trip一致 | PASS |
| G10 | v1.7 rollback point固定 | PASS |
| G11 | Draft CI #381 quality | PASS |
| G12 | Draft CI #381 E2E | PASS |
| G13 | main manifest unchanged | PASS |
| G14 | Stage109/110中の本番公開変更 | 0件 |

## CI #381 確定結果

quality:
- npm ci: PASS
- verify:public-data: PASS
- typecheck: PASS
- lint: PASS
- unit test: PASS
- build: PASS

e2e:
- npm ci: PASS
- verify:public-data: PASS
- Playwright Chromium install: PASS
- build: PASS
- test:e2e: PASS

## 公開を止める外部ゲート

| Gate | 条件 | 状態 |
|---|---|---|
| E01 | 外部医療監修者による最終承認 | OPEN |
| E02 | 提供eラーニングPDFの来歴・正本性確認 | OPEN |
| E03 | 公開適用の明示承認 | OPEN |
| E04 | 公開後実ブラウザ smoke test | NOT APPLICABLE BEFORE PUBLISH |

E01〜E03のいずれかがOPENなら merge / publish禁止。

## 公開時の必須手順

1. RC raw SHA-256を再計算し固定値と一致確認。
2. public-data overlayのみ候補版へ差し替える。
3. manifest releaseVersion / overlay SHA / bytes(chunks) / dataset originalSha256を同期。
4. questionsTotal=4061, materials=114, sourceOccurrences=4061を維持。
5. PR上で verify:public-data → typecheck → lint → test → build → E2E を全PASSさせる。
6. merge前にv1.7 rollback pointが参照可能であることを再確認。
7. 明示的な公開承認後のみmerge。
8. 公開後、実ブラウザで4061問・予想問題30=510問・履歴保持を確認。
9. smoke failure時はrollback runbookを即時適用。

## Stage110判定

内部的な公開準備はPASS。ただし外部ゲート未完了のため、最終release statusは **HOLD**。
