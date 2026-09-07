# Study App Production QA Record — v0.19.0 / 2026-09-07

## Final status

**PASS — v0.19.0 production baseline confirmed**

## Baseline under test

- App version: `0.19.0`
- Runtime code commit: `694286b39ac0fa60ed0188f09062ec34a66f5c9b`
- Release branch: `release/v0.19.0-production-20260907`
- Delivery Schema: `0.5`
- Formal Data Spec: `1.2`
- Explanation Template: `1.0`
- Public dataset release: `2026-09-07.1`
- Questions: `3,154`
- Materials: `114`
- SourceOccurrences: `3,154`

## Fixed production counts

- Common total: 2,643
  - JNA e-learning: 536
  - Cloze: 1,917
  - Predicted: 190
- Specialty total: 511
  - Past / mock source set: 126
  - Predicted: 116
  - Predicted case: 269

Expected six-category vector: `536 / 1,917 / 190 / 126 / 116 / 269`.

## v0.19.0 scope verified

The release adds browser-local learning-state portability without modifying the production content dataset.

Backup scope verified:

- learningHistory
- materialHistory
- examSessions
- favorite/review flags contained in learningHistory
- minimal metadata only

Content explicitly excluded from backups:

- question prompts
- choices
- correct answers
- explanations
- material body content
- production public dataset content

Restore safety verified:

- strict JSON/schema validation before writes
- current production content presence required
- stale question/material IDs are skipped and counted
- the three learning-state tables are replaced atomically after validation
- invalid backup data does not alter the existing learning state
- successful restore persists after application reload

## Release-candidate verification

CI Run #267 completed successfully before merge.

Verified gates:

- public dataset verification
- TypeScript typecheck
- ESLint
- unit tests
- production build
- full Playwright E2E
- real 3,154-question public bootstrap
- backup download flow
- backup payload content exclusion
- learning-state clear → restore → reload persistence
- stale-ID filtering
- invalid-file preservation of existing history
- public learner access to backup/restore controls
- v0.18.0 learner UX regression paths
- admin/import regression paths

## Post-merge verification

PR #33, `feat: add learning-state backup and restore for v0.19.0`, was squash merged to `main`.

Main commit: `694286b39ac0fa60ed0188f09062ec34a66f5c9b`.

Main CI Run #268: **PASS**

- quality: PASS
- public dataset verification: PASS
- typecheck: PASS
- lint: PASS
- unit tests: PASS
- production build: PASS
- Playwright E2E: PASS

GitHub Pages Run #58: **PASS**

- Pages build: PASS
- Pages deploy: PASS
- deployed code commit: `694286b39ac0fa60ed0188f09062ec34a66f5c9b`
- production URL: `https://ken303867-png.github.io/study-app/`

## Deployment-artifact verification

The exact `github-pages` artifact from Pages Run #58 was downloaded and inspected.

Artifact metadata:

- artifact id: `10009207353`
- artifact digest: `sha256:bd9a21aa746fcf9efccaadfc9255b051fb0f06d9e6be54923ebdd9d84c7e4b71`

Deployment payload checks:

- application asset contains `0.19.0`: PASS
- learner backup/restore UI text is present: PASS
- restore confirmation text is present: PASS
- public learner `3,154`-question availability message is present: PASS
- `public-data/manifest.json` is present: PASS
- production pack is present: PASS
- production pack bytes: `1,708,205`: PASS
- production pack SHA-256: `7cc5b510470e0343c92b2974c4b8856495ac1e980dadf7e9d31347ed6b7b5cfe`: PASS
- manifest release: `2026-09-07.1`: PASS
- manifest totals `3,154 / 114 / 3,154`: PASS
- manifest six-category counts `536 / 1,917 / 190 / 126 / 116 / 269`: PASS

The verification runtime could not resolve the external `ken303867-png.github.io` hostname, so independent external HTTP probing was not available from that runtime. This limitation does not affect the GitHub Pages deployment result or the verified deployment artifact. Browser interaction behavior is covered by the full Playwright E2E release gates, including the real 3,154-question bootstrap.

## Regression statement

The v0.19.0 application release did not alter the verified production content. No changes were made to stable question IDs, question text, choices, correct-answer indexes, formal explanations, material content, Schema 0.5, Formal Data Spec 1.2, or public dataset release `2026-09-07.1`.

The public dataset pack remains byte-identical to the v0.18.0 production baseline.

## Release decision

The v0.19.0 application, main commit `694286b39ac0fa60ed0188f09062ec34a66f5c9b`, public dataset release `2026-09-07.1`, verified GitHub Pages artifact, and 3,154-question / 114-material production state are accepted as the current production baseline.
