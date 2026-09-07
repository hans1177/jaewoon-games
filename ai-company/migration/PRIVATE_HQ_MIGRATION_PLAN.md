# Private AI Company HQ Migration Plan

Status: PREPARED / WAITING_FOR_PRIVATE_REPOSITORY

## Target architecture
- `hans1177/jaewoon-games` (PUBLIC): public game/site source and publishable assets only.
- dedicated PRIVATE repository: AI company HQ, operational state, workforce/performance, audit, internal knowledge, orchestration and Unity Builder control.

## Move to PRIVATE HQ
When the dedicated private repository exists, migrate:
- constitution/
- protocols/
- command/
- state/
- knowledge/
- workforce/
- schemas/
- infrastructure/ builder control and internal runtime specifications

## Keep public
Do not migrate public game/site code merely because the HQ is separated. Existing game files remain untouched unless a project task explicitly changes them.

## Security boundary
Never place runner registration tokens, provider API keys, deployment secrets or other credentials in either repository contents. Use supported secret/environment stores. A self-hosted runner must not be attached to the current public repository under this v1 plan.

## Cutover gate
Private HQ cutover requires all of:
1. dedicated private repository exists and is accessible;
2. migrated files are verified;
3. canonical-state location is recorded;
4. builder control points only to private HQ;
5. no secrets were copied into source;
6. rollback/reference to the pre-cutover branch remains available.

After successful cutover, the public `ai-company` copy becomes non-canonical/bootstrap documentation or is removed only by a separately reviewed change. Do not silently maintain two canonical company states.
