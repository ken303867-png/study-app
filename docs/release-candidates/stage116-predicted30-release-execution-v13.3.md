# Study App「予想問題30」第116工程｜Release Execution Runbook v13.3

Status: **EXECUTION_RUNBOOK_READY / RELEASE_HOLD**

Stage116 does not merge PR #50 and does not change main/public Pages.

## Release candidate
- PR #50
- main baseline: `09299c3999448a02ffa8d45c40cbb8036e627317`
- PR head: `1412850ad36b068489f4ff75af13d2bd9e8f92b3`
- ahead 1 / behind 0
- runtime diff: exactly 2 files
- CI #387: SUCCESS
- releaseVersion: `2026-09-28.1`
- questions/materials/sourceOccurrences: 4061 / 114 / 4061
- predicted30: 510

## Authorized execution phases
1. Confirm external medical reviewer final approval.
2. Confirm e-learning PDF provenance/authenticity.
3. Receive explicit publication authorization.
4. Re-run Stage114 one-shot pre-merge audit.
5. Mark PR #50 ready for review.
6. Reconfirm main/head/diff/CI.
7. Merge PR #50 using `expected_head_sha=1412850ad36b068489f4ff75af13d2bd9e8f92b3`.
8. Record merge commit SHA.
9. Monitor main CI.
10. Monitor GitHub Pages build → deploy → live-smoke.
11. Verify live manifest/count/hash.
12. Verify representative render across 17 subjects.
13. Verify reload/offline behavior.
14. Verify v1.7 → new-release learning-history upgrade using a persistent browser profile.
15. Declare RELEASE_COMPLETE only after all checks pass.

## Merge method
Recommended: `merge`.

Reason: PR #50 contains one tested commit and is behind=0; preserving the tested commit as a parent keeps the release boundary traceable.

## RED rollback triggers
Immediate rollback for any:
- main CI failure
- Pages build/deploy/live-smoke failure
- public dataset bootstrap error
- 4061/114/4061/510 mismatch
- gzip/dataset hash mismatch
- predicted30 render failure
- answer/grading regression
- learningHistory loss
- examSession questionId reference break

## Rollback target
- releaseVersion: `2026-09-26.2`
- manifest blob: `6ca677981591b23ebf438fb9090ddea69b8ebf2b`
- predicted30 SHA: `4f835ef9d395f6a703294cfba8c9c6fe431ccb77bccd92bd86a72a47b0f1da37`

## Safety property
The Stage116 execution scripts default to dry-run behavior and intentionally do not issue a merge API call. The actual write action remains separately gated by explicit publication authorization.

**Do not merge or publish while RELEASE_HOLD is active.**
