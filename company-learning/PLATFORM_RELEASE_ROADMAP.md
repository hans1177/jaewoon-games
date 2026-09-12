# Platform Release Roadmap

Status: OWNER-DIRECT LOCKED
Recorded: 2026-09-12

## Priority

`ROBLOX → UNITY → FORTNITE_UEFN`

This roadmap sets platform release/experience sequencing. It remains inside the existing company/Vibe2/Vibe3 production and learning pipelines.

## Phase 1 — Roblox

Goal: fast real releases and stabilization.

- Roblox is the current primary platform for new platform-experience accumulation.
- Do not stop at prototype or Studio launch; complete actual playable release cycles.
- Build Roblox-specific playbook/runtime/QA/publishing support inside V3 Pump.
- Positive experience requires verified winner + runtime PASS + independent QA PASS + regression PASS + protected-state preservation + exact revision.
- Repeat release/fix/re-release cycles until the Roblox path is operationally stable.

## Phase 2 — Roblox + Unity

Entry condition: verified Roblox release/stabilization experience exists.

- Keep Roblox active and add Unity release work.
- Accumulate Roblox and Unity release experience concurrently where product scope makes sense.
- Existing Unity/Android source, build, runtime, QA and release knowledge is preserved and extended, not deleted or replaced.
- Shared patterns may be reused across platforms; platform-specific implementation stays in each platform playbook/adapter.
- Roblox evidence never substitutes for Unity runtime/QA evidence, and Unity evidence never substitutes for Roblox runtime/QA evidence.

## Phase 3 — Fortnite / UEFN

Entry condition: verified Roblox-first experience plus Roblox+Unity concurrent release experience has accumulated.

- Add Fortnite/UEFN as the third platform track.
- Preserve Roblox and Unity while adding Fortnite/UEFN.
- Add Fortnite/UEFN-specific playbook/runtime/publishing/QA support inside the same V3 Pump chain.

## Experience sharing

Platform-specific knowledge remains scoped:
- Roblox: Luau, Studio/runtime, server/client, DataStore, RemoteEvent security, Roblox publishing/QA.
- Unity: C#, Unity runtime/build, Android/mobile performance and release QA.
- Fortnite/UEFN: Verse/UEFN runtime, publishing and platform QA.

Portable verified experience can be shared through V3 verified memory/RAG/playbooks, including bug diagnosis, responsible-source selection, QA/regression discipline, performance patterns, release stabilization, rollback/checkpoint practice and exact-revision evidence.

## Canonical learning only

No platform-specific parallel training or distillation chain is permitted.

All qualifying verified trajectories use the existing route:

`VALIDATED_EVIDENCE → DISTILLATION_INGEST → VERIFIED_TRAINING_SAMPLE → DISTILLATION_STATUS → DETERMINISTIC_TRAINING_REQUEST → LOCAL_SELF_HOSTED_DATASET_BUILD → LOCAL_LORA_OR_QLORA_TRAINING → TRAINED_UNVERIFIED → FIXED_HOLDOUT_AB → CANARY → PROMOTE_OR_ROLLBACK`

A build, launch, process survival, input injection or publish attempt alone is not verified release experience.

## Preservation rule

The roadmap changes sequencing, not the validity of existing proven work.

- Roblox first: rapid release and stabilization.
- Unity second: preserved existing path, then concurrent Roblox+Unity release experience.
- Fortnite/UEFN third: expansion after the first two stages have accumulated verified experience.

Canonical private protocol: `hans1177/jaewoon-ai-company/company/protocols/PLATFORM_RELEASE_ROADMAP.md`.
