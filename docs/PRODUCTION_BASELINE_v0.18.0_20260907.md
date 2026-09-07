# Study App Production Baseline — v0.18.0 / 2026-09-07

## Status

**PRODUCTION BASELINE CONFIRMED**

This document fixes the learner-facing production reference after the v0.17.0 public-dataset release, the public-user Data Management guard, the v0.18.0 learner UX update, full release-candidate QA, main CI, and GitHub Pages deployment.

## Runtime baseline

- App version: `0.18.0`
- Runtime code commit: `1e3b0e847ba1e9e51dac9f6ec132518f2101893a`
- Release branch: `release/v0.18.0-production-20260907`
- Public URL: `https://ken303867-png.github.io/study-app/`
- Delivery Schema: `0.5`
- Formal Data Spec: `1.2`
- Explanation Template: `1.0`
- Storage: browser-local IndexedDB / Dexie
- Public dataset release: `2026-09-07.1`
- Learning-history synchronization: not enabled; learning state remains local to the browser profile

## Public distribution baseline

App v0.18.0 continues the v0.17.0 public distribution architecture defined in `PUBLIC_DATASET_POLICY.md`.

The complete production dataset is intentionally distributed from GitHub Pages through the integrity-checked public dataset pack. On first public access, the browser downloads, validates, imports, and verifies the dataset before opening the learner UI. Subsequent launches reuse the verified IndexedDB copy unless the public release changes or local content fails validation.

Learning history, exam sessions, favorites, review flags, and answer history remain local-only and are not included in the public dataset mechanism.

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

Six-category expected counts are `536 / 1,917 / 190 / 126 / 116 / 269`.

## v0.18.0 learner UX baseline

The production learner UI must preserve the following behavior:

- First-run preparation is shown as four stages: check → download → save → verify.
- Public learners see that all `3,154` questions are available and that learning history is stored on the current device.
- Technical schema/dataset administration details and Data Management are hidden from ordinary public examinees.
- Admin tools remain available in the explicit admin/development path.
- New practice/exam sets default to `20` questions rather than all questions.
- Exiting an active practice session requires confirmation.
- Interrupting an active exam requires confirmation and states that an interrupted exam is not graded or saved.

## Release QA

Release-candidate CI Run #253: **PASS**

- Public dataset verification: PASS
- TypeScript typecheck: PASS
- ESLint: PASS
- Unit tests: PASS
- Production build: PASS
- Full Playwright E2E: PASS
- Real 3,154-question first-run public bootstrap and learner flow: PASS
- Default 20-question practice behavior: PASS
- Practice-exit confirmation: PASS
- Exam-interrupt confirmation: PASS
- Admin/import regression coverage: PASS

Post-merge main CI Run #254: **PASS**

GitHub Pages Run #56: **PASS**

Pages Run #56 deployed build version `1e3b0e847ba1e9e51dac9f6ec132518f2101893a` to `https://ken303867-png.github.io/study-app/`.

## Data-change statement

The v0.18.0 release changes learner-facing application behavior only. It does **not** change:

- production question count or category counts
- production materials count
- question IDs
- prompts, choices, correct answers, or explanations
- Delivery Schema 0.5
- Formal Data Spec 1.2
- public dataset release `2026-09-07.1`
- IndexedDB learning-history schema

## Recovery and rollback

Code-level rollback/reference:

- `release/v0.18.0-production-20260907` → `1e3b0e847ba1e9e51dac9f6ec132518f2101893a`
- previous guarded public baseline: `release/v0.17.0-public-guard-20260907`
- pre-public-distribution baseline: `PRODUCTION_BASELINE_v0.16.0_20260907.md`

Dataset recovery and browser-local learning state are separate from code rollback. The historical restore procedure remains documented in `PRODUCTION_RESTORE_RUNBOOK_v1.0.md`; public distribution/update behavior is governed by `PUBLIC_DATASET_POLICY.md`.

## Baseline decision

App v0.18.0 at commit `1e3b0e847ba1e9e51dac9f6ec132518f2101893a`, together with public dataset release `2026-09-07.1`, is accepted as the current 2026-09-07 production learning baseline.
