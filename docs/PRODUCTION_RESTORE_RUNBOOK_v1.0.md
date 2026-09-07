# Study App Production Restore Runbook v1.0

## Purpose

Restore the confirmed v0.16.0 production content state to a browser after data loss, browser replacement, Base re-import, or intentional reset.

Official problem data is stored outside GitHub. This runbook records only restore metadata and file integrity information.

## Required files and order

1. `common_726_canonical_materials114_v1.4.1_PRODUCTION.json`
2. `common_cloze_supplemental_1917_20260903_v1.0.json`
3. `specialty_past_126_supplemental_20260907_v1.0.1_CONTROLCHAR_FIXED.json`
4. `specialty_predicted_116_wrong_reason_specific_FINAL_20260905_v1.4.json`
5. `specialty_predicted_case_269_UI_TEXT_FINAL_20260905_v1.1.json`

File 1 is a Canonical Master JSON Export. The app runs Canonical QA and Delivery QA before storing the converted content. Files 2–5 are Delivery Schema 0.5 supplemental datasets using `supplemental-replace`.

## Integrity hashes

| Order | File | SHA-256 |
| ---: | --- | --- |
| 1 | `common_726_canonical_materials114_v1.4.1_PRODUCTION.json` | `32dc8f70154ea2fde84739e64497e2f088a2f2d2de7fd5253a64a04ddb47af6d` |
| 2 | `common_cloze_supplemental_1917_20260903_v1.0.json` | `2ede2a1d9f0949a538cd1f9d7528e90de3d9b7a8b221d86b1db716b61c091a07` |
| 3 | `specialty_past_126_supplemental_20260907_v1.0.1_CONTROLCHAR_FIXED.json` | `a11330f1601cf6b5d936faa84092767d055df5f5515481ff4c33e98ee6d7516b` |
| 4 | `specialty_predicted_116_wrong_reason_specific_FINAL_20260905_v1.4.json` | `e69f9f1459508bdea9062bf8c08ccc2bbe750bd9fa2304331cfd5f85e923ba17` |
| 5 | `specialty_predicted_case_269_UI_TEXT_FINAL_20260905_v1.1.json` | `d31b6efa525ca755b8e498150c77345059802a8e43b93f3e5e09f5373720e319` |

## Restore procedure

1. Open the deployed Study App.
2. Open **データ管理**.
3. Import file 1 and wait for all validation to pass.
4. Import files 2, 3, 4, and 5 in order.
5. Reload the browser page.
6. Confirm the production counts below.
7. Open **演習** and confirm both Common and Specialty category counts.

## Expected state after full restore

- Formal Base: 726
- Supplemental total: 2,428
- Common: 2,643
  - JNA e-learning: 536
  - Cloze: 1,917
  - Predicted: 190
- Specialty: 511
  - Past: 126
  - Predicted: 116
  - Predicted case: 269
- Total questions: 3,154
- Materials: 114

## Replacement behavior

Re-importing a supplemental file with the same `supplementalKey` replaces only that category and does not duplicate it. Importing the Base again replaces the Base content state and removes currently stored supplemental content, so files 2–5 must then be re-imported.

Stable question IDs are retained across the production datasets, and learning / exam history is stored independently from content. A content restore is therefore designed to preserve existing history when the same stable IDs are used.

## Specialty-past hotfix

The production specialty-past file is the 2026-09-07 control-character-fixed version. The hotfix normalized PDF-derived U+000C form-feed characters to line breaks only. It did not change stable question IDs, prompts, choices, correct-answer indexes, or per-choice explanations.

## Post-restore acceptance check

A restore is accepted only when all of the following are true:

- Home: 3,154 total questions
- Home: 726 Formal Base
- Home: 2,428 supplemental questions
- Home: 114 materials
- Common area: 2,643 questions
- Specialty area: 511 questions
- All six category counts match the baseline
- Page reload preserves the counts
- A sample practice session opens and records a result

Do not upload the production JSON files to this public repository.
