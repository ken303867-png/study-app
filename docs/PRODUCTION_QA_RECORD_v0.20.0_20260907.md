# Study App Production QA Record — v0.20.0 / 2026-09-07

## Final status

**PASS — v0.20.0 production baseline confirmed**

## Baseline under test

- App version: `0.20.0`
- Runtime code commit: `c920f9c5dc99274bd17f637cf95d6e3c372643ea`
- Release branch: `release/v0.20.0-production-20260907`
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

## v0.20.0 scope verified

The release adds weakness-priority review while preserving the production content dataset and browser-local history model.

Weakness scoring verified:

- only answered questions are eligible
- unanswered questions are excluded from weakness candidates
- `needsReview`: +35
- latest incorrect: +25
- latest uncertain: +15
- cumulative weighted non-correct rate: up to +30
- recovery factor: +10 for 0 consecutive correct, +5 for 1, +0 for 2+
- candidate threshold: 15 / 100
- recovered questions may fall below threshold without losing history

Learner flow verified:

- `弱点優先` practice preset exists
- sequential weakness sessions sort by weakness score before applying the question limit
- random order remains selectable
- dashboard shows weakness-candidate count
- dashboard shows top weakness-priority questions
- `弱点優先セットを作成` routes directly to the preconfigured set builder
- existing `要復習`, unanswered, favorites, recent incorrect, and uncertain flows remain functional
- v0.19.0 learning-state backup/restore remains compatible because no DB schema change was introduced

## Release-candidate verification

Feature QA Run #274: **PASS**

Final Release Candidate CI Run #277: **PASS**

Verified gates:

- public dataset verification
- TypeScript typecheck
- ESLint
- unit tests
- production build
- full Playwright E2E
- weakness-score unit coverage
- weakness metric → set-builder E2E
- weakness-score ordering E2E
- recent-attention regression coverage
- exam regression coverage
- final-integration regression coverage

## Post-merge verification

PR #34, `feat: add weakness-priority review for v0.20.0`, was squash merged to `main`.

Main commit: `c920f9c5dc99274bd17f637cf95d6e3c372643ea`.

Main CI Run #278: **PASS**

- quality: PASS
- public dataset verification: PASS
- typecheck: PASS
- lint: PASS
- unit tests: PASS
- production build: PASS
- Playwright E2E: PASS

GitHub Pages Run #61: **PASS**

- Pages build: PASS
- Pages deploy: PASS
- deployed code commit: `c920f9c5dc99274bd17f637cf95d6e3c372643ea`
- production URL: `https://ken303867-png.github.io/study-app/`

## Deployment-artifact verification

The exact `github-pages` artifact from Pages Run #61 was downloaded and inspected.

Artifact metadata:

- artifact id: `10010926791`
- artifact digest: `sha256:052afb528e6976d9312b836f0e7921a9a367e2a4f998df245d06ad59c86b1c1f`

Deployment payload checks:

- application asset contains `0.20.0`: PASS
- `弱点優先` UI text is present: PASS
- `弱点候補` UI text is present: PASS
- `弱点優先セットを作成` UI text is present: PASS
- public learner `3,154`-question availability text is present: PASS
- `public-data/manifest.json` is present: PASS
- manifest release `2026-09-07.1`: PASS
- manifest totals `3,154 / 114 / 3,154`: PASS
- manifest six-category counts `536 / 1,917 / 190 / 126 / 116 / 269`: PASS
- production pack is present: PASS
- production pack bytes `1,708,205`: PASS
- production pack SHA-256 `7cc5b510470e0343c92b2974c4b8856495ac1e980dadf7e9d31347ed6b7b5cfe`: PASS

## Regression statement

The v0.20.0 application release did not alter the verified production content.

No changes were made to:

- question totals or six-category totals
- materials or SourceOccurrence totals
- stable question IDs
- question prompts
- choices
- correct-answer indexes
- formal explanations
- material content
- Delivery Schema 0.5
- Formal Data Spec 1.2
- Explanation Template 1.0
- public dataset release `2026-09-07.1`

The production pack remains byte-identical to the v0.19.0 production baseline.

## Rollback reference

- current release branch: `release/v0.20.0-production-20260907`
- pinned runtime commit: `c920f9c5dc99274bd17f637cf95d6e3c372643ea`
- previous release branch: `release/v0.19.0-production-20260907`

## Release decision

The v0.20.0 application, runtime commit `c920f9c5dc99274bd17f637cf95d6e3c372643ea`, public dataset release `2026-09-07.1`, verified GitHub Pages artifact, and 3,154-question / 114-material production state are accepted as the current production baseline.
