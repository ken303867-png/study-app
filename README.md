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

## v0.7.0 の位置づけ

v0.1〜v0.6で確定した機能仕様を、保守性の高い正式アーキテクチャへ移行する最初のVersionです。
v0.7では新機能追加よりも、型安全・保存層分離・データ検証・自動QAを優先します。

## Local development

Node.js 22.12+ を使用します。

```bash
npm install
npm run dev
```

品質確認:

```bash
npm run qa
npm run test:e2e
```

## Important data policy

正式な日本看護協会・学研・過去問等の問題本文や教材本文はGitHub repositoryへ保存しません。
`data/official/`, `data/private/`, `imports/private/`, `backups/` は `.gitignore` 対象です。

GitHub上には、アプリコード・schema・テスト・仕様書・空テンプレート・非正式サンプルのみ保存します。
