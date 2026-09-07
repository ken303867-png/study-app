# Study App v0.17.0 Release

## Purpose

v0.17.0 changes Study App from a local-import-only application to a public URL distribution model for the production question dataset.

A new user can open the GitHub Pages URL and use the complete production dataset without manually importing JSON files.

## Production dataset

- Total questions: 3,154
- Materials: 114
- SourceOccurrences: 3,154
- Common subjects: 2,643
  - Japan Nursing Association e-learning: 536
  - Cloze: 1,917
  - Predicted: 190
- Specialty subjects: 511
  - Past/mock source set: 126
  - Predicted: 116
  - Predicted cases: 269

## First-run flow

1. Fetch `public-data/manifest.json` with cache bypass.
2. Fetch the single gzip production bundle.
3. Verify bundle SHA-256.
4. Decompress the bundle in the browser.
5. Verify expanded SHA-256 for all five datasets.
6. Import Base followed by four supplemental datasets.
7. Verify Schema 0.5, total counts, materials, SourceOccurrences, and all six category counts.
8. Store the public release version in IndexedDB metadata.
9. Render the normal Study App UI.

## Subsequent launches

If the stored public release version and stored dataset still match the manifest, the production bundle is not downloaded again.

If the manifest cannot be reached, offline fallback is permitted only when the complete production state is already present: 3,154 questions / 114 materials / 3,154 SourceOccurrences with the exact six-category counts.

## Learning state

The public dataset is shared, but learning state remains local to each browser/device:

- learning history
- favorites
- review flags
- material history
- exam sessions

No login or cloud synchronization is introduced in v0.17.0.

## Release gates

- Production bundle SHA-256
- Expanded per-dataset SHA-256
- exact production counts
- cross-dataset question-ID uniqueness
- cross-dataset SourceOccurrence-ID uniqueness
- U+FFFD / NUL / U+000C scan
- Schema/Import QA
- TypeScript typecheck
- ESLint
- Vitest
- production build
- synthetic first-run/reload Playwright E2E
- real 3,154-question production bootstrap Playwright E2E
- Pages pre-deploy production bundle verification

## Rollback

The preserved v0.16.0 production baseline remains the rollback point if the public distribution release must be reverted.
