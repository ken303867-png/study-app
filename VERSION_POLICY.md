# Version Policy

## Version streams

アプリ本体・データ・schemaを独立してVersion管理します。

- App Version: `0.7.1`
- Schema Version: `0.3`
- Dataset Version: 正式データ作成時に別途付与
- Material Version: 正式資料作成時に別途付与

## Semantic versioning

- Patch: 不具合修正、開発環境固定、schema互換性を維持する変更
- Minor: 後方互換のある機能追加
- Major: 大規模な互換性変更

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
7. Data schema validation
8. CHANGELOG更新

Prettierは開発時の整形ツールとして使用し、CI release gateへの追加は別Versionで検証後に行います。

1項目でもFAILの場合は正式Versionとして固定しません。
