# Stage 115 — Predicted30 Release Control Sheet v13.2

Date: 2026-09-28

## Overall status

**TECHNICAL_PREMERGE_READY / RELEASE_HOLD**

PR #50 is technically ready for the final authorized merge sequence, but release authorization gates remain open.

## Release candidate

- PR: #50
- base/main SHA: `09299c3999448a02ffa8d45c40cbb8036e627317`
- head SHA: `1412850ad36b068489f4ff75af13d2bd9e8f92b3`
- compare: ahead 1 / behind 0
- runtime changed files: 2
- CI #387: SUCCESS
- releaseVersion: `2026-09-28.1`
- questions/materials/sourceOccurrences: 4061 / 114 / 4061
- common-predicted30: 510
- dataset SHA-256: `8b3841260fb6080bcc0fe9362e97c2df5807f76371880317c4c225dab95166c8`
- gzip SHA-256: `2f909039a7c123e785d937393df675f777d4c8e91ed46e545807a277b3c8593b`

Approved runtime diff:
1. `public/public-data/common-predicted30-20260928-v12.9.pack.gz`
2. `public/public-data/manifest.json`

## Authorization gates

Do not mark PR #50 ready or merge while any of these remains open:

- external medical reviewer final approval — OPEN
- e-learning PDF provenance/authenticity confirmation — OPEN
- explicit publication authorization — OPEN

## Authorized merge sequence

After all three approvals:

1. Re-run Stage114 one-shot pre-merge audit.
2. Reconfirm main/head SHAs, behind=0, exact two-file runtime diff, CI success.
3. Mark PR #50 ready for review.
4. Merge using expected head SHA `1412850ad36b068489f4ff75af13d2bd9e8f92b3`.
5. Record merge SHA.
6. Monitor GitHub Pages build → deploy → live-smoke.
7. Run manual manifest/count/hash checks.
8. Run 17-subject representative render smoke.
9. Run reload/offline smoke.
10. Run persistent-browser v1.7 → 2026-09-28.1 learning-history upgrade smoke.
11. Only then mark RELEASE_COMPLETE.

## Rollback triggers

Immediate rollback for:
- Pages build/deploy/live-smoke failure
- public dataset bootstrap error
- 4061 / 114 / 4061 / 510 mismatch
- gzip/dataset hash mismatch
- predicted30 rendering failure
- answer/grading regression
- learning-history loss
- examSession reference break

## Rollback target

- releaseVersion: `2026-09-26.2`
- manifest blob: `6ca677981591b23ebf438fb9090ddea69b8ebf2b`
- predicted30 SHA-256: `4f835ef9d395f6a703294cfba8c9c6fe431ccb77bccd92bd86a72a47b0f1da37`
- v1.7 chunks: 10/10 present

Stage115 does not change main, Pages, or PR #50 runtime content.
