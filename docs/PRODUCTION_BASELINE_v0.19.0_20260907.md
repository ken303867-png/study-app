# Study App Production Baseline — v0.19.0 / 2026-09-07

## Status

**PRODUCTION BASELINE CONFIRMED**

This document fixes the production reference after the v0.19.0 learning-state backup/restore release, full release-candidate QA, post-merge main CI, GitHub Pages deployment, and deployment-artifact verification.

## Runtime baseline

- App version: `0.19.0`
- Runtime code commit: `694286b39ac0fa60ed0188f09062ec34a66f5c9b`
- Release branch: `release/v0.19.0-production-20260907`
- Public URL: `https://ken303867-png.github.io/study-app/`
- Delivery Schema: `0.5`
- Formal Data Spec: `1.2`
- Explanation Template: `1.0`
- Storage: browser-local IndexedDB / Dexie
- Public dataset release: `2026-09-07.1`
- Public dataset pack: `study-app-public-dataset-3154-20260907-v1.0.pack.gz`
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

## v0.19.0 learning-state baseline

v0.19.0 adds learner-controlled backup and restore for browser-local learning state.

Backup payload includes only:

- question learning history
- favorites and review flags stored in learning history
- material learning history
- exam-session history
- minimal backup metadata required for validation and compatibility checks

The backup payload intentionally excludes:

- question text
- choices
- correct answers
- explanations
- material body content
- public production dataset content

Restore behavior is fixed as follows:

- the complete JSON structure is validated before any learning-state write occurs
- restore requires the current Schema 0.5 production content to be present
- learningHistory, materialHistory, and examSessions are replaced in one Dexie transaction after validation
- stale question/material IDs not present in the current dataset are skipped and reported
- invalid JSON/schema does not modify the currently stored learning state
- successful restore reloads the learner UI so restored counts and flags are reflected immediately

## Public learner UX retained from v0.18.0

The v0.19.0 production baseline retains:

- first-run preparation stages: check → download → save → verify
- URL-only automatic delivery of all 3,154 questions
- Data Management hidden from ordinary public learners
- explicit admin/development access for data-management workflows
- 20-question default practice/exam set
- confirmation before exiting active practice
- confirmation before interrupting active exam, including the no-grade/no-save warning

## Release QA

Release-candidate CI Run #267: **PASS**

Verified gates include:

- public manifest and production dataset integrity verification
- exact 3,154-question / 114-material / 3,154-SourceOccurrence state
- six-category count verification
- TypeScript typecheck
- ESLint
- unit tests
- production build
- full Playwright E2E
- real 3,154-question first-run public bootstrap
- learning-state backup export
- backup content-exclusion checks
- restore persistence after reload
- stale-ID filtering
- invalid-backup atomic rejection / preservation of current state
- public learner visibility of backup/restore controls

Post-merge main CI Run #268: **PASS**

GitHub Pages Run #58: **PASS**

Pages Run #58 deployed commit `694286b39ac0fa60ed0188f09062ec34a66f5c9b`.

## Deployment-artifact acceptance

The exact `github-pages` artifact produced by Pages Run #58 was inspected after deployment.

Confirmed in the artifact:

- App version string `0.19.0`
- learner backup/restore UI text
- restore confirmation text
- public learner message indicating all `3,154` questions are available
- `public-data/manifest.json`
- production pack size `1,708,205` bytes
- production pack SHA-256 `7cc5b510470e0343c92b2974c4b8856495ac1e980dadf7e9d31347ed6b7b5cfe`
- manifest release `2026-09-07.1`
- expected question/material/source-occurrence totals and all six category counts

Direct external HTTP probing of the GitHub Pages hostname was not available from the verification runtime because of DNS restrictions in that runtime. Production deployment acceptance therefore relies on GitHub Pages successful deployment of the verified artifact plus the real-browser E2E release gates.

## Data-change statement

v0.19.0 changes learning-state portability only. It does **not** change:

- production question count or category counts
- materials count
- question IDs
- prompts, choices, correct answers, or explanations
- Delivery Schema 0.5
- Formal Data Spec 1.2
- public dataset release `2026-09-07.1`
- public dataset pack bytes or SHA-256

## Recovery and rollback

Code-level rollback/reference:

- `release/v0.19.0-production-20260907` → `694286b39ac0fa60ed0188f09062ec34a66f5c9b`
- previous production baseline: `release/v0.18.0-production-20260907`

Dataset recovery and code rollback remain separate from learning-state backup files. Public data distribution/update behavior continues to be governed by `PUBLIC_DATASET_POLICY.md`.

## Baseline decision

App v0.19.0 at commit `694286b39ac0fa60ed0188f09062ec34a66f5c9b`, together with public dataset release `2026-09-07.1`, is accepted as the current 2026-09-07 production learning baseline.
