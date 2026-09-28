# Study App「予想問題30」Stage 114 pre-merge automation v13.1

Date: 2026-09-28

## Status

**PREMERGE_AUTOMATION_READY / RELEASE_HOLD**

This document records the Stage 114 pre-merge automation contract. It does not modify PR #50 runtime files, main, public-data, or GitHub Pages.

## Frozen release candidate

- Runtime PR: #50
- base: `09299c3999448a02ffa8d45c40cbb8036e627317`
- head: `1412850ad36b068489f4ff75af13d2bd9e8f92b3`
- compare: ahead 1 / behind 0
- changed files: exactly 2
  - `public/public-data/common-predicted30-20260928-v12.9.pack.gz`
  - `public/public-data/manifest.json`
- CI: #387 / run id `36394866057` / SUCCESS
- releaseVersion: `2026-09-28.1`
- questions/materials/sourceOccurrences: 4061 / 114 / 4061
- common-predicted30: 510
- gzip SHA-256: `2f909039a7c123e785d937393df675f777d4c8e91ed46e545807a277b3c8593b`
- dataset original SHA-256: `8b3841260fb6080bcc0fe9362e97c2df5807f76371880317c4c225dab95166c8`

## One-shot audit contract

The Stage 114 audit must ABORT if any of these changes:

1. main HEAD moves from the frozen SHA.
2. PR #50 head changes.
3. PR #50 becomes behind main.
4. runtime diff contains anything other than the approved two files.
5. CI #387 is not SUCCESS for the frozen PR head.
6. manifest counts, releaseVersion, gzip SHA, or dataset SHA differ.
7. any v1.7 rollback chunk is unavailable.
8. any external release gate remains OPEN.

The local Stage 114 package contains both PowerShell and Bash implementations of this audit.

## GitHub branch protection finding

At Stage 113/114:
- main branch protected: false
- required status check enforcement: off
- repository rulesets: 0

Therefore CI success is an operational gate and must be manually confirmed immediately before merge.

## Rollback manifest

Rollback target remains:
- releaseVersion: `2026-09-26.2`
- main manifest blob: `6ca677981591b23ebf438fb9090ddea69b8ebf2b`
- predicted30 SHA-256: `4f835ef9d395f6a703294cfba8c9c6fe431ccb77bccd92bd86a72a47b0f1da37`
- v1.7 chunks: 10/10 present

Rollback can be performed by restoring the v1.7 manifest reference; the newly published gzip does not have to be deleted immediately because it becomes unreferenced.

## Release HOLD

Do not merge/publish while any of the following is incomplete:
- external medical reviewer final approval
- provided e-learning PDF provenance/authenticity authentication
- explicit publication authorization

After an authorized release, GitHub Pages build/deploy/live-smoke and persistent-browser learning-history upgrade smoke remain mandatory.
