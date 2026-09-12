# COMPANY MULTI-PLATFORM DEVELOPMENT ARCHITECTURE

Authority: latest owner instruction + `COMPANY_FLOW.md`.
This document is an implementation architecture companion and MUST NOT override `COMPANY_FLOW.md`.

## Platform projects

The company maintains three first-class development projects:

1. `ROBLOX`
   - default `PRIMARY_PLATFORM`
   - source root: `roblox-games/<slug>`
   - language: Luau
   - runtime: Roblox Experience

2. `UNITY_ANDROID`
   - existing Unity/Android project structure MUST be preserved
   - existing Web -> Unity validation/release path MUST remain available
   - Unity is not legacy/fallback-only; it remains a first-class active development project
   - the existing implementation must be extended rather than replaced or rebuilt from scratch
   - existing build workflow, parent/child topology, triggers, artifact transfer, runtime/QA linkage, cache/dedupe logic remain immutable for this task

3. `FORTNITE_UEFN`
   - source root: `fortnite-uefn/<slug>`
   - language: Verse
   - runtime: Fortnite / UEFN

## Primary platform switching

`PRIMARY_PLATFORM` selects which first-class project is the current default development target.

Default:

`PRIMARY_PLATFORM = ROBLOX`

Allowed values:

- `ROBLOX`
- `UNITY_ANDROID`
- `FORTNITE_UEFN`

Changing `PRIMARY_PLATFORM` MUST NOT rebuild, fork, or replace the company core, Vibe learning chain, or existing build workflows. The platform project changes; the company intelligence and canonical learning system stay shared.

## Shared architecture

`OWNER / COMPANY_FLOW`
→ `company routing / portfolio / project selection`
→ `PRIMARY_PLATFORM`
→ one of `ROBLOX | UNITY_ANDROID | FORTNITE_UEFN`
→ platform-specific source/runtime/QA evidence
→ verified evidence gate
→ existing canonical Vibe learning inputs
→ existing canonical distillation
→ shared memory / verified reusable patterns

Platform-specific implementation knowledge stays scoped to its platform where necessary. General coding, bugfix, QA, performance, UX, design and production knowledge may be reused across projects only after verified evidence.

## Canonical distillation requirement

Distillation is mandatory for verified development experience from all three projects.

Rules:

- no platform-specific parallel distillation chain
- no platform-specific cron
- no new Vibe learning stage for this expansion
- no direct promotion of unverified output
- positive development evidence requires runtime/QA/regression/exact-revision evidence according to the responsible platform gate
- failed attempts remain failure-warning/avoidance evidence and MUST NOT be labeled as successful learning evidence
- verified evidence must rejoin the existing canonical learning/distillation chain only

## Roblox project boundary

Required validation includes:

- actual Experience entry
- meaningful player input
- core-loop state change
- server/client health
- RemoteEvent/RemoteFunction boundary validation where used
- DataStore persistence validation where used
- mobile touch/UI validation
- multiplayer validation where used
- performance validation
- QA and regression
- exact revision binding

## Unity project preservation and extension

The current Unity project and validated behavior are protected state.

Extension rules:

- preserve existing Unity source/project conventions unless a verified responsible-source fix requires a minimal edit
- preserve existing Android build and validation workflow
- preserve current Web -> Unity path wherever current `COMPANY_FLOW.md` requires it
- add platform-independent company routing above Unity instead of rewriting Unity internals
- extend platform capability through contracts/adapters outside locked build and learning systems
- regression-test existing Unity behavior after every shared-platform architecture change
- do not demote Unity to archive, fallback-only, or compatibility-only status

## Fortnite / UEFN project boundary

Required validation includes:

- project opens in UEFN
- playable session launches
- meaningful player input
- core-loop state change
- Verse runtime health
- multiplayer/session validation where used
- performance validation
- QA and regression
- exact revision binding

## Immutable locks

This architecture MUST NOT change:

- current implemented Vibe learning structure
- current learning chain/stages/promotion thresholds/code paths, except minimal recovery or verified-error repair under existing policy
- current build method/workflows
- parent/child build topology
- build triggers
- artifact transfer
- runtime/QA build linkage
- build cache/dedupe logic
- no-wrapper / no-shadow / no-bypass rule

## Work order for PR #346

1. Synchronize this architecture with `COMPANY_FLOW.md` and `company-work-state.json`.
2. Finish the pre-existing company modernization from `HOMEPAGE_PWA_RUNTIME_STATE_SYNC` exactly as already checkpointed.
3. Validate the existing modernization without changing learning/build locks.
4. Implement the three-project selection/routing layer.
5. Preserve and extend Unity.
6. Implement Roblox source/runtime/QA project support.
7. Implement Fortnite UEFN source/runtime/QA project support.
8. Connect verified evidence from all three projects to the existing canonical learning/distillation inputs only.
9. Run platform-specific validation and full existing regression.
10. Synchronize checkpoint + PR handoff after each material milestone.
