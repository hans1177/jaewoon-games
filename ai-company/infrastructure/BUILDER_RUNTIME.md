# Unity Builder Runtime v1

## Status
SPEC_ONLY — no self-hosted runner is connected yet.

## Builder identity
Initial logical builder: `UNITY-BUILDER-01`.
Recommended labels when eventually connected: `self-hosted`, OS label, `jaewoon-unity`, `webgl` and/or `android` according to installed Unity modules.

## Job lifecycle
QUEUED → CLAIMED → PRECHECK → BUILDING → TESTING → ARTIFACT_READY → COMPLETE
Failure states: BLOCKED / FAILED / CANCELLED / QUARANTINED.

Every job records project/task, requested target, source ref/commit, Unity version, builder identity, timestamps, result, artifact reference, logs and verification result.

## Precheck
Before a build the runtime must verify:
- E-STOP/deployment stop is not active for the requested scope;
- source ref is explicitly allowed;
- required Unity version/modules exist;
- workspace has no unsafe leftover state;
- job request is valid and belongs to an approved task;
- protected/release actions have the required authority.

## Heartbeat
A connected builder should periodically publish: builder id, ONLINE/BUSY/DEGRADED/OFFLINE state, current job id if any, installed Unity/tool versions, supported targets, free disk, last successful build and heartbeat timestamp.

Heartbeat is operational health data, not proof that a build succeeded.

## Isolation/recovery
Build outputs must be separated by job/project. Failed builds must not replace VERIFIED artifacts. On builder crash, preserve job/log state when possible and return the task to resumable BLOCKED/FAILED handling rather than claiming completion.

## Security gate
Do not connect a privileged self-hosted runner to the current public game repository. Builder activation is BLOCKED until a private/restricted execution boundary is established and reviewed. No runner registration token, Unity license secret, deployment secret or other credential belongs in repository files.
