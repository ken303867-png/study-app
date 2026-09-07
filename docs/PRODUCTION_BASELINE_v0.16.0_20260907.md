# Study App Production Baseline — v0.16.0 / 2026-09-07

## Status

**PRODUCTION BASELINE CONFIRMED**

This document fixes the production reference state after formal data import, specialty control-character hotfix, real-data spot QA, six-category E2E QA, main CI, and GitHub Pages deployment.

Formal problem text, answers, explanations, and teaching materials are intentionally not stored in this public repository.

## Runtime baseline

- App version: `0.16.0`
- Runtime code commit: `1e3cff17d276934bb8d7c047041e9d789bf35d19`
- Delivery Schema: `0.5`
- Formal Data Spec: `1.2`
- Explanation Template: `1.0`
- Storage: browser-local IndexedDB / Dexie
- Cloud sync: not enabled in the initial release

## Expected production state

| Category | Count |
| --- | ---: |
| Formal Base | 726 |
| Common — JNA e-learning | 536 |
| Common — Cloze | 1,917 |
| Common — Predicted | 190 |
| Common total | 2,643 |
| Specialty — Past | 126 |
| Specialty — Predicted | 116 |
| Specialty — Predicted case | 269 |
| Specialty total | 511 |
| **All questions** | **3,154** |
| Materials | 114 |

The Home screen should report `3,154` questions, `726` Formal Base questions, `2,428` supplemental questions, and `114` materials.

## Production classification keys

- `common-jna`
- `common-cloze`
- `common-predicted`
- `specialty-past`
- `specialty-predicted`
- `specialty-predicted-case`

## Final production QA

- Production count verification: PASS
- Six-category classification: PASS
- Schema / import validation: PASS
- Specialty hard import QA: PASS
- Same-key replacement / no duplication: PASS
- Learning-history retention after content re-import: PASS
- Formal explanation rendering: PASS
- Common cloze self-assessment: PASS
- Specialty predicted-case paragraph preservation: PASS
- 30-question real-data spot audit: PASS
- Specialty-past U+000C control-character hotfix: PASS
- Main CI: PASS
- GitHub Pages deployment: PASS

## Data policy

The official production datasets remain outside GitHub. Only source code, schemas, tests, specifications, synthetic QA fixtures, file names, hashes, and restore metadata may be committed here.

See `PRODUCTION_RESTORE_RUNBOOK_v1.0.md` for recovery procedure and `PRODUCTION_QA_RECORD_20260907.md` for the fixed QA record.
