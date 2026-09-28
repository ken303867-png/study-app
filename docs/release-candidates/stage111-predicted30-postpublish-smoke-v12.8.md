# Study App「予想問題30」第111工程｜公開後 Smoke Test v12.8

## Automated live-smoke

GitHub Pages workflow の `live-smoke` 成功を必須とする。

既存 `tests/live/public-deployment.spec.ts` の確認:
- Study App v0.21.0が正常起動
- 4061問 / materials 114
- 共通3550 / 専門511
- Eラーニング536 / 穴抜き2014 / 予想190 / 最終対策300 / 予想問題30 510
- `PRED-TEAM-011` が検索可能
- 解説5セクション表示
- 内部キー非露出

## Additional smoke

1. 公開manifest: `releaseVersion=2026-09-28.1`
2. 新10チャンクがHTTP成功し、manifest hashと一致
3. 4061 / 114 / 4061 / predicted30 510を再確認
4. 17科目から最低1問ずつ回答→採点→4肢解説を確認
5. **リリース前から履歴を持つ実ブラウザ/端末**で、既回答predicted30を最低3問用意し、同期後も attempts / correctCount / incorrectCount / lastResult と復習参照が維持されることを確認
6. reloadおよび可能ならoffline起動を確認

## Immediate rollback

Pages/live-smoke失敗、件数不一致、chunk/hash mismatch、表示不能、採点回帰、学習履歴参照切れ、公開データ準備エラーのいずれかで `2026-09-26.2` / v1.7へrollback。
