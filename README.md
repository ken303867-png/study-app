# Study App

資格試験学習用のオフラインファーストPWAです。

## 正式開発方針

- App: React + TypeScript + Vite + PWA
- Local storage: IndexedDB / Dexie
- Runtime validation: Zod
- Unit test: Vitest
- E2E test: Playwright
- Version control: Private GitHub repository
- Cloud: initial releaseでは使用しない
- In-app AI: initial releaseでは使用しない

## v0.7系の位置づけ

v0.1〜v0.6で確定した機能仕様を、保守性の高い正式アーキテクチャへ移行するVersionです。
v0.7.0でReact + TypeScript基盤へ移行し、v0.7.1で実行環境と依存関係の再現性を固定します。

## Reproducible development environment

正式開発環境は以下で固定します。

- Node.js: `.nvmrc` に記載されたVersion
- npm: `package.json` の `packageManager` に記載されたVersion
- Dependencies: `package.json` でexact固定
- Transitive dependencies: `package-lock.json` で固定
- CI installation: `npm ci`

ローカル開発ではNode/npm Versionを一致させた後、lockfileから依存関係を復元します。

```bash
nvm use
npm install --global npm@11.19.1
npm ci
npm run dev
```

品質確認:

```bash
npm run qa
npm run test:e2e
```

依存パッケージを意図的に変更する場合のみ `package.json` を更新して `npm install` を実行し、更新された `package-lock.json` を同じPRに含めます。

## Important data policy

正式な日本看護協会・学研・過去問等の問題本文や教材本文はGitHub repositoryへ保存しません。
`data/official/`, `data/private/`, `imports/private/`, `backups/` は `.gitignore` 対象です。

GitHub上には、アプリコード・schema・テスト・仕様書・空テンプレート・非正式サンプルのみ保存します。
