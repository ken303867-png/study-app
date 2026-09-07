# Study App Production QA Record — v0.18.0 / 2026-09-07

## Final status

**PASS — v0.18.0 production baseline confirmed**

## Baseline under test

- App version: `0.18.0`
- Runtime code commit: `1e3b0e847ba1e9e51dac9f6ec132518f2101893a`
- Release branch: `release/v0.18.0-production-20260907`
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

## Release-candidate verification

CI Run #253 completed successfully before merge.

Verified gates:

- public manifest and production dataset integrity verification
- exact production counts and six-category counts
- TypeScript typecheck
- ESLint
- unit tests
- production build
- full Playwright E2E
- real 3,154-question public bootstrap
- public learner UI behavior
- 20-question default practice/exam set
- active-practice exit confirmation
- active-exam interruption confirmation
- admin-mode and import regression paths

## Post-merge verification

PR #31, `feat: improve public learner UX for v0.18.0`, was squash merged to `main`.

Main commit: `1e3b0e847ba1e9e51dac9f6ec132518f2101893a`.

Main CI Run #254: **PASS**

- quality: PASS
- public dataset verification: PASS
- typecheck: PASS
- lint: PASS
- unit tests: PASS
- production build: PASS
- Playwright E2E: PASS

GitHub Pages Run #56: **PASS**

- Pages build: PASS
- Pages deploy: PASS
- deployed build version: `1e3b0e847ba1e9e51dac9f6ec132518f2101893a`
- production URL: `https://ken303867-png.github.io/study-app/`

## v0.18.0 UX acceptance checks

### Initial public access

The learner-facing preparation screen uses four semantic stages instead of a synthetic percentage:

1. public release check
2. dataset download
3. validation and local save
4. saved-data final verification

The application proceeds to the learner UI only after the public dataset validation/import path completes successfully.

### Public learner boundary

Ordinary public examinees do not see Data Management or technical administration metadata. The learner view communicates that all 3,154 questions are available and that learning history is stored on the current device.

Explicit admin/development access remains available for data-management and QA workflows.

### Practice and exam safety

New sessions default to 20 questions. The user can still intentionally select another supported limit.

Active practice sessions require confirmation before exit. Active exams require confirmation before interruption, with an explicit warning that interruption does not grade or save the exam session.

## Regression statement

The v0.18.0 application release did not alter the verified production content. No changes were made to stable question IDs, question text, choices, correct-answer indexes, formal explanations, material content, Schema 0.5, or the browser-local learning-history schema.

The public dataset remains release `2026-09-07.1` and retains the previously verified specialty-past control-character normalization and six-category classification.

## Release decision

The v0.18.0 learner-facing application, main commit `1e3b0e847ba1e9e51dac9f6ec132518f2101893a`, public dataset release `2026-09-07.1`, and the 3,154-question / 114-material production state are accepted as the current production baseline.

Future changes must retain automated public-dataset verification, stable IDs, explicit update behavior, local learning-state separation, and a code-level rollback reference.
