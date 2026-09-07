# Public Dataset Policy

## App v0.17.0 public distribution

App v0.17.0 changes the production delivery policy so that the complete Study App production dataset is intentionally distributed to users who open the public GitHub Pages URL.

The public release currently contains:

- Common subjects: 2,643 questions
  - Japan Nursing Association e-learning: 536
  - Cloze: 1,917
  - Predicted: 190
- Specialty subjects: 511 questions
  - Past/mock source set: 126
  - Predicted: 116
  - Predicted case questions: 269
- Total: 3,154 questions
- Materials: 114
- Delivery Schema: 0.5

## Distribution boundary

The public dataset pack stored under `public/public-data/` is an intentional public distribution artifact. It is downloaded automatically by the browser on first access and imported into IndexedDB after integrity and schema checks.

This v0.17.0 policy supersedes earlier repository documentation that stated formal question/material content must never be stored in GitHub. That restriction applied to the previous local-import-only architecture through v0.16.0.

The following remain local-only and are not published or synchronized by the public dataset mechanism:

- `learningHistory`
- `materialHistory`
- `examSessions`
- favorites
- review flags
- answer history

## Release gate

A public dataset release must pass all of the following before merge to `main`:

1. Manifest validation.
2. Production gzip pack SHA-256 validation.
3. Per-dataset expanded JSON SHA-256 validation.
4. Exact count validation: 3,154 questions / 114 materials / 3,154 SourceOccurrences.
5. Six-category count validation: 536 / 1,917 / 190 / 126 / 116 / 269.
6. Cross-dataset question-ID and SourceOccurrence-ID collision validation.
7. Forbidden text-control scan for U+FFFD, NUL, and U+000C.
8. Existing Schema/Import QA.
9. Typecheck, lint, unit tests, production build, and Playwright E2E.
10. First-run URL auto-download and reload/no-redownload E2E.

## Update behavior

- `public-data/manifest.json` identifies the public release version and bundle SHA-256.
- The browser stores the successfully imported release version in IndexedDB metadata.
- The full production bundle is downloaded only when the stored release is missing, stale, or the stored content fails final count/category verification.
- A failed or interrupted update does not write the new public release version.
- When manifest refresh is unavailable but valid Schema 0.5 content is already stored, the app may continue with the locally stored dataset and display a warning.

## Recovery baseline

The v0.16.0 production baseline remains the pre-public-distribution rollback point. The public release must not delete or rewrite learning-history tables when replacing content data.
