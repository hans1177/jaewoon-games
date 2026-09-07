# Private HQ Bootstrap Checklist

## Repository
- Visibility: PRIVATE
- Purpose: AI company operational headquarters
- Default branch: main
- No public-fork execution path to self-hosted builder

## Initial verification
- import v1 governance/protocol/schema/state package
- validate JSON state and schemas
- confirm CEO/AI CEO authority policy
- confirm E-STOP state
- confirm no active project was invented during migration
- confirm workforce registry contains only actually connected/declared workers

## Builder activation
Builder remains DISCONNECTED until:
- private HQ is canonical;
- runner machine and Unity installation are known;
- runner labels and allowed job types are configured;
- credentials use secret storage;
- build output and test artifact policy is configured;
- recovery/cleanup behavior is tested.

## First safe test
Use a non-destructive diagnostic job before any Unity build. Then run a minimal isolated Unity validation/build job. Production deployment remains a separate CEO-controlled gate.
