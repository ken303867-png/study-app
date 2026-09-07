# Study App Production Baseline — v0.20.0 / 2026-09-07

## Status

**PRODUCTION BASELINE CONFIRMED**

This document fixes the production reference after the v0.20.0 weakness-priority review release, release-candidate QA, squash merge, post-merge main CI, GitHub Pages deployment, and deployment-artifact verification.

## Runtime baseline

- App version: `0.20.0`
- Runtime code commit: `c920f9c5dc99274bd17f637cf95d6e3c372643ea`
- Release branch: `release/v0.20.0-production-20260907`
- Public URL: `https://ken303867-png.github.io/study-app/`
- Delivery Schema: `0.5`
- Formal Data Spec: `1.2`
- Explanation Template: `1.0`
- Storage: browser-local IndexedDB / Dexie
- Public dataset release: `2026-09-07.1`
- Public dataset pack: `study-app-public-dataset-3154-20260907-v1.0.pack.gz`
- Public dataset pack bytes: `1,708,205`
- Public dataset pack SHA-256: `7cc5b510470e0343c92b2974c4b8856495ac1e980dadf7e9d31347ed6b7b5cfe`

## Expected production state

| Category | Count |
| --- | ---: |
| Formal Base | 726 |
| Common — JNA e-learning | 536 |
| Common — Cloze | 1,917 |
| Common — Predicted | 190 |
| Common total | 2,643 |
| Specialty — Past / mock source set | 126 |
| Specialty — Predicted | 116 |
| Specialty — Predicted case | 269 |
| Specialty total | 511 |
| **All questions** | **3,154** |
| Materials | 114 |
| SourceOccurrences | 3,154 |

Expected six-category vector: `536 / 1,917 / 190 / 126 / 116 / 269`.

## v0.20.0 weakness-priority baseline

v0.20.0 adds a learner-facing weakness-priority review mode calculated from the existing browser-local learning history. No new IndexedDB fields or content schema changes are introduced.

Only answered questions are eligible for weakness scoring. Unanswered questions are not treated as weaknesses.

The score is recalculated from current learning history using the following fixed components:

- `needsReview`: +35
- latest incorrect result: +25
- latest uncertain result: +15
- cumulative weighted non-correct rate: up to +30
- recovery factor: +10 at 0 consecutive correct, +5 at 1 consecutive correct, 0 at 2 or more consecutive correct
- weakness-candidate threshold: 15 / 100

The production behavior is fixed as follows:

- `弱点優先` is available as a practice preset
- sequential weakness sessions sort by weakness score before the question limit is applied
- random order remains available
- Learning Dashboard shows the weakness-candidate count and top weakness-priority questions
- `弱点優先セットを作成` opens a preconfigured weakness-priority practice set
- existing `要復習`, unanswered, favorite, recent incorrect, and uncertain flows remain available
- recovered questions can fall below the weakness threshold without deleting their learning history
- existing v0.19.0 learning-state backup/restore remains compatible because the DB schema is unchanged

## Public learner UX retained

The v0.20.0 production baseline retains:

- URL-only automatic delivery of all 3,154 production questions
- first-run public dataset preparation and IndexedDB storage
- PWA/offline behavior after preparation
- browser-local learning history
- public learner backup/restore controls introduced in v0.19.0
- exam mode and existing review/practice filters
- Data Management hidden from ordinary public learners, with explicit admin/development access retained

## Release QA

Feature QA Run #274: **PASS**

Final v0.20.0 Release Candidate CI Run #277: **PASS**

Verified release-candidate gates include:

- public manifest and production dataset integrity verification
- TypeScript typecheck
- ESLint
- unit tests
- production build
- full Playwright E2E
- weakness metric → weakness-priority set builder
- weakness-score ordering
- recent-attention regression paths
- exam regression paths
- final-integration regression paths

PR #34, `feat: add weakness-priority review for v0.20.0`, was squash merged to `main`.

Post-merge main CI Run #278: **PASS**

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

## Deployment-artifact acceptance

The exact `github-pages` artifact produced by Pages Run #61 was downloaded and inspected after deployment.

Artifact metadata:

- artifact id: `10010926791`
- artifact digest: `sha256:052afb528e6976d9312b836f0e7921a9a367e2a4f998df245d06ad59c86b1c1f`

Confirmed in the deployed artifact:

- App version string `0.20.0`
- `弱点優先`
- `弱点候補`
- `弱点優先セットを作成`
- public learner `3,154`-question availability text
- `public-data/manifest.json`
- manifest release `2026-09-07.1`
- manifest totals `3,154 / 114 / 3,154`
- six-category counts `536 / 1,917 / 190 / 126 / 116 / 269`
- production pack size `1,708,205` bytes
- production pack SHA-256 `7cc5b510470e0343c92b2974c4b8856495ac1e980dadf7e9d31347ed6b7b5cfe`

The deployment artifact confirms that the public Pages build contains the intended v0.20.0 learner UI while retaining the byte-identical verified public dataset pack.

## Data-change statement

v0.20.0 changes learning prioritization only. It does **not** change:

- production question count or category counts
- materials count
- SourceOccurrence count
- stable question IDs
- prompts, choices, correct answers, or explanations
- Delivery Schema 0.5
- Formal Data Spec 1.2
- Explanation Template 1.0
- public dataset release `2026-09-07.1`
- public dataset pack bytes or SHA-256

## Recovery and rollback

Code-level rollback/reference:

- `release/v0.20.0-production-20260907` → `c920f9c5dc99274bd17f637cf95d6e3c372643ea`
- previous production baseline: `release/v0.19.0-production-20260907`

Dataset recovery and code rollback remain separate from learning-state backup files. Public data distribution/update behavior continues to be governed by `PUBLIC_DATASET_POLICY.md`.

## Baseline decision

App v0.20.0 at runtime commit `c920f9c5dc99274bd17f637cf95d6e3c372643ea`, together with public dataset release `2026-09-07.1`, is accepted as the current 2026-09-07 production learning baseline.
