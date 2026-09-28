# Study App「予想問題30」第117工程｜Release Authorization Packet v13.4

実施日: 2026-09-28

## Status

**TECHNICAL_READY / AUTHORIZATION_PENDING / RELEASE_HOLD**

### Release candidate

- PR: #50
- main: `09299c3999448a02ffa8d45c40cbb8036e627317`
- head: `1412850ad36b068489f4ff75af13d2bd9e8f92b3`
- ahead / behind: 1 / 0
- runtime changed files: 2
- CI #387: SUCCESS
- releaseVersion: `2026-09-28.1`
- 4061 questions / 114 materials / 4061 sourceOccurrences
- common-predicted30: 510
- gzip SHA-256: `2f909039a7c123e785d937393df675f777d4c8e91ed46e545807a277b3c8593b`
- dataset SHA-256: `8b3841260fb6080bcc0fe9362e97c2df5807f76371880317c4c225dab95166c8`

### Authorization gates

- A01 external medical review: OPEN
- A02 e-learning PDF provenance/authenticity: OPEN
- A03 explicit publication authorization: OPEN

All three must be PASS with evidence before PR #50 is marked Ready for Review or merged.

### Rollback

- releaseVersion: `2026-09-26.2`
- manifest blob: `6ca677981591b23ebf438fb9090ddea69b8ebf2b`
- predicted30 SHA-256: `4f835ef9d395f6a703294cfba8c9c6fe431ccb77bccd92bd86a72a47b0f1da37`
- v1.7 rollback chunks: 10/10 present

### Stage117 decision

**NO-GO / RELEASE_HOLD**

No main or Pages write action is performed in Stage117.
