# Version Policy

## Version streams

アプリ本体・データ・schemaを独立してVersion管理します。

- App Version: `0.7.0`
- Schema Version: `0.3`
- Dataset Version: 正式データ作成時に別途付与
- Material Version: 正式資料作成時に別途付与

## Semantic versioning

- Patch: 不具合修正。schema互換性を維持する変更
- Minor: 後方互換のある機能追加
- Major: 大規模な互換性変更

## Release gate

正式Version候補は以下をすべてPASSすること。

1. TypeScript typecheck
2. ESLint
3. Vitest
4. Production build
5. Playwright E2E
6. Data schema validation
7. CHANGELOG更新

Prettierは開発時の整形ツールとして使用し、CI release gateへの追加はlockfile固定後に行います。

1項目でもFAILの場合は正式Versionとして固定しません。
