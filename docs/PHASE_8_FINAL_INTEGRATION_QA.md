# Phase 8 Final Integration QA

## Purpose

Phase 8 is a release-candidate verification phase. It does not add new learning features or rewrite formal content. The goal is to verify that the completed application behaves coherently across data import, material navigation, practice, review, analytics, exam mode, persistence, PWA installation and offline use.

## Version boundary

- App: `0.14.0`
- Delivery Schema: `0.5`
- Formal Data Spec: `1.2`
- Explanation Template: `1.0`
- Cloud: disabled
- In-app AI: disabled

No version is promoted to `1.0.0` in this phase. The user-testing / feature-pruning pass remains available before the final release tag.

## GitHub data policy

Formal 709-question content and 114-material content are not committed to GitHub. CI uses only nonformal/synthetic fixtures. Formal production QA is executed locally against the retained Canonical Master and only aggregate QA evidence is recorded here.

## Formal production data QA baseline

Formal local input SHA-256:

`6ec9228f301b34caa7ccf9b471f0c322aab7ddbb2d800a0038f2e57352c1edcb`

Aggregate structural result:

| QA item | Result |
|---|---:|
| Formal Data Spec | 1.2 |
| Delivery target | 0.5 |
| Explanation Template | 1.0 |
| Subjects | 17 |
| Questions | 709 |
| Question ID duplicates | 0 |
| LEARN-COM-001〜709 continuity | PASS |
| Adopted questions | 709 / 709 |
| Final QA pass | 709 / 709 |
| Choices | 2,836 |
| Choice explanations | 2,836 |
| Questions with exactly 4 choices | 709 / 709 |
| Questions with exactly 1 final correct choice | 709 / 709 |
| Question final-answer / correct-choice mismatches | 0 |
| Explanations | 709 / 709 |
| Source occurrences | 709 / 709 |
| QA ledger rows | 709 / 709 |
| Answer discrepancy: none | 703 |
| Answer discrepancy: reviewed-different | 6 |
| Materials | 114 |
| Material blocks | 3,526 |
| Paragraph blocks | 3,256 |
| Table blocks | 270 |
| Orphan material blocks | 0 |
| Questions linked to formal materials | 519 |
| Intentionally unlinked questions | 190 |
| Link edges | 519 |
| Materials with ≥1 linked question | 114 / 114 |
| Dangling question→material refs | 0 |
| Dangling material→question refs | 0 |
| Bidirectional link mismatches | 0 |

The 190 unlinked questions remain intentionally unlinked because no formal crosswalk is available for those prediction-question references. Phase 8 must not create inferred links.

## Cross-feature browser flow

`tests/e2e/final-integration.spec.ts` verifies the following in one continuous browser session using nonformal fixture data:

1. Delivery content is loaded into IndexedDB.
2. Question → related material → related question navigation works.
3. A wrong practice answer is recorded.
4. The learning dashboard reflects attempts and review state.
5. A review-only set is created from the weak subject.
6. A correct retry is recorded as a second attempt.
7. Re-importing the content dataset preserves learning history.
8. Exam mode can use the same persisted content and keeps feedback hidden until final scoring.

Existing dedicated E2E remains responsible for:

- 709-question synthetic import/read-back scale QA.
- Formal 1.2 material XLSX round-trip and bidirectional navigation.
- Search/filter and learning-state persistence.
- Practice evaluation and wrong-answer retry.
- Dashboard priority and recent-attention navigation.
- Exam mode / optional timer / final scoring.
- Manifest/install prompt.
- Service Worker control, real offline reload and offline IndexedDB learning persistence.

## Phase 8 release gate

Phase 8 is PASS only when all of the following are true:

- `npm ci` PASS.
- TypeScript strict typecheck PASS.
- ESLint PASS.
- Vitest PASS.
- production build PASS.
- desktop Chromium E2E PASS.
- mobile Chromium E2E PASS.
- Phase 8 cross-feature E2E PASS.
- Formal aggregate QA above has zero Critical/Major structural errors.
- Formal content is absent from GitHub.
- main post-merge CI PASS.

## Release policy after Phase 8

After Phase 8 passes, the application is considered a user-testable release candidate. The user may remove or simplify unnecessary features after hands-on use. `v1.0.0` should be fixed only after that pruning/acceptance pass and a final regression QA.
