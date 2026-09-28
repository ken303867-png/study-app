# Study App 予想問題30｜第109工程 Draft scaffold

実施日: 2026-09-28

## Status

- Stage 109: PASS_WITH_RELEASE_HOLD
- main: unchanged
- Pages deployment: not executed
- public manifest: unchanged

## RC510 candidate

- questions: 510
- choices: 2040
- raw JSON bytes: 2,953,928
- raw JSON SHA-256: `1bbfa6120a20d5f24ac5872b8f1cbf058cd852d9bc6ef2d7d6aa1f8275438993`
- repack: gzip + base64, 10 chunks
- gzip bytes: 399,143
- gzip SHA-256: `277ea3f393f05fd12a03a91081b76d71e7d0ca99fafcd01bb602049d4f743378`
- base64 length: 532,192

## Manifest candidate

- candidate releaseVersion: `2026-09-28.1-rc`
- questionsTotal: 4061
- materials: 114
- sourceOccurrences: 4061
- common-predicted30: 510
- common-predicted30 dataset original SHA-256: `1bbfa6120a20d5f24ac5872b8f1cbf058cd852d9bc6ef2d7d6aa1f8275438993`

## Rollback point

- current public releaseVersion: `2026-09-26.2`
- baseline main commit: `09299c3999448a02ffa8d45c40cbb8036e627317`
- current manifest blob: `6ca677981591b23ebf438fb9090ddea69b8ebf2b`
- current predicted30 SHA-256: `4f835ef9d395f6a703294cfba8c9c6fe431ccb77bccd92bd86a72a47b0f1da37`
- current v1.7 chunk files remain untouched.

## CI QA required before merge consideration

1. `npm ci`
2. `npm run verify:public-data`
3. `npm run typecheck`
4. `npm run lint`
5. `npm run test`
6. `npm run build`

## Release gates still OPEN

- external medical reviewer approval
- provided e-learning PDF provenance authentication
- explicit publication authorization
- post-publication browser smoke test

This branch is a Draft scaffold only. Do not merge or publish in Stage 109.
