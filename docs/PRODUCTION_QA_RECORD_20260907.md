# Study App Production QA Record — 2026-09-07

## Final status

**PASS — production baseline confirmed**

## Baseline

- App version: `0.16.0`
- Runtime code commit: `1e3cff17d276934bb8d7c047041e9d789bf35d19`
- Delivery Schema: `0.5`
- Formal Data Spec: `1.2`
- Explanation Template: `1.0`
- Questions: `3,154`
- Materials: `114`

## Production data state

- Formal Base: 726
- Common total: 2,643
  - JNA e-learning: 536
  - Cloze: 1,917
  - Predicted: 190
- Specialty total: 511
  - Past: 126
  - Predicted: 116
  - Predicted case: 269

## QA evidence fixed by this record

### Import and schema

- Base / supplemental production imports completed successfully.
- Specialty supplemental hard QA returned no schema or classification errors.
- Cross-category question IDs, source IDs, and source-occurrence IDs had no collisions in the verified production set.
- Same-key supplemental re-import replaced the target category without duplication.

### Runtime classification and practice

Synthetic E2E coverage confirms all six production categories:

- `common-jna`
- `common-cloze`
- `common-predicted`
- `specialty-past`
- `specialty-predicted`
- `specialty-predicted-case`

The E2E suite verifies normal choice practice, correct-answer judgement, formal explanation rendering, common-cloze answer reveal and self-assessment, learning-history persistence, and specialty predicted-case paragraph rendering.

### Real-data spot audit

A distributed real-data spot audit sampled five questions from each of the six production categories, for 30 total questions. Structural checks passed for classification, choices, correct-answer indexes, formal explanation required fields, per-choice explanation counts, cloze accepted answers, and case paragraph preservation.

### Control-character hotfix

A real-data scan found PDF-derived U+000C form-feed control characters in 18 specialty-past questions. The production hotfix normalized those characters to line breaks only.

The hotfix did not modify:

- stable question IDs
- prompts
- choices
- correct-answer indexes
- classification tags
- per-choice explanations

After the hotfix, U+000C, U+FFFD replacement characters, NUL characters, and other unexpected control characters were zero in the verified production datasets.

### Browser production verification

User-side production screenshots confirmed:

- 3,154 total questions
- 726 Formal Base
- 2,428 supplemental questions
- 114 materials
- Common 2,643
- Specialty 511
- Specialty Past 126
- Specialty Predicted 116
- Specialty Predicted Case 269

The specialty-past hotfix import reported `追加126問 / 置換126問 / 現在3154問 / Schema 0.5`, confirming replacement without count inflation.

Learning-history counts remained present after the hotfix re-import, consistent with the independent history-storage design.

### CI and deployment

The six-category final E2E change was merged through PR #27. Main CI passed typecheck, lint, unit tests, production build, and Playwright E2E. GitHub Pages deployment also passed.

## Release decision

The v0.16.0 application and the 3,154-question / 114-material production content state are accepted as the 2026-09-07 production baseline.

Future changes must preserve this baseline through stable IDs, explicit migration/import behavior, automated QA, and the restore procedure in `PRODUCTION_RESTORE_RUNBOOK_v1.0.md`.

Official problem text and formal teaching content remain outside GitHub.
