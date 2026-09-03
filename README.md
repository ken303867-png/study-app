# Study App

資格試験学習用のオフラインファーストPWAです。

## 正式開発方針

- App: React + TypeScript + Vite + PWA
- Local storage: IndexedDB / Dexie
- Runtime validation: Zod
- Unit test: Vitest
- E2E test: Playwright
- Version control: Public GitHub repository（正式問題・教材本文は保存しない）
- Distribution: GitHub Pages
- Cloud: initial releaseでは使用しない
- In-app AI: initial releaseでは使用しない

## v0.15.0

v0.15.0は、実端末のGitHub Pages環境で正式Base 726問・共通穴抜き1,917問・全2,643問・資料114件をImportし、再読み込み後もIndexedDBへ永続保持されることを確認した正式Versionです。

- Formal Base: 726 questions
- Common cloze supplemental: 1,917 questions
- Total: 2,643 questions
- Materials: 114
- Delivery Schema: 0.5
- Formal Data Spec: 1.2
- Production Dataset: `common-726-delivery-0.5-materials114-v1.4.1`

正式問題・教材データはGitHub repositoryには保存せず、GitHub Pages上のアプリへローカルImportして使用します。

## v0.7系の位置づけ

v0.1〜v0.6で確定した機能仕様を、保守性の高い正式アーキテクチャへ移行するVersionです。
v0.7.0でReact + TypeScript基盤へ移行し、v0.7.1で実行環境と依存関係の再現性を固定します。

## Formal data specification

正式問題・解答解説をアプリへ投入する前の整理・監査基準は、以下を上位仕様とします。

- `docs/FORMAL_QUESTION_EXPLANATION_DATA_SPEC_v1.1.md`
- `docs/EXPLANATION_TEMPLATE_SPEC_v1.0.md`

v1.1では、同一資料内で設問番号が再利用される教材や、複数講義・複数年度での再出題を安全に追跡するため、`SOURCE_OCCURRENCES` を正式Master Data構造として追加しています。

正本はExcel等の監査可能なMaster Dataとし、アプリ用JSON/IndexedDBデータは正本から再生成するDeliveryデータとして扱います。

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
