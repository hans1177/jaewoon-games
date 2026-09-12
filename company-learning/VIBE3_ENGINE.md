# Vibe3 Engine + Pump Mode

Status: OWNER-DIRECT V3 IMPLEMENTATION — PUMP MODE LOCKED
Recorded: 2026-09-12

`COMPANY_FLOW.md` is the sole policy source of truth. This file documents V3 implementation behavior only and must not create independent company, platform, portfolio-size, release-order, department, or learning policy.

Vibe3 is an intelligence-layer upgrade inside the existing Vibe2/company development and learning pipelines. It is not a parallel pipeline. It reuses the existing checkpoint, source-apply, runtime observation, department evidence, QA, regression, distillation, self-hosted training, holdout, canary and rollback gates.

## V3 Pump execution chain

`USER_DIRECTION → COMPANY_ROUTING → VERIFIED_RAG → FAILURE_WARNING_MEMORY → TASK_PLAYBOOK → SOURCE_DEPENDENCY_GRAPH → RESPONSIBLE_SOURCE_RANKING → 3–5 INDEPENDENT CANDIDATES → OPTIONAL FREE TEACHER CANDIDATES → ISOLATED EXECUTION → DETERMINISTIC TOURNAMENT → MAX-3 REPAIR LOOP → WINNER SOURCE APPLY → RUNTIME → GROUNDED_DEPARTMENT_EVIDENCE → QA → REGRESSION → EXACT_REVISION → TRAJECTORY PERSIST → MEMORY REFRESH → CANONICAL_DISTILLATION`

Rules:
- independent candidate count: minimum 3, maximum 5, default 5;
- default/max bounded repair attempts: 3;
- no candidate may overwrite authoritative source before winner selection;
- every winner must prove responsible source, checkpoint/rollback, syntax/tests, runtime, regression, protected-state preservation and exact revision;
- failed candidates remain failure-warning/comparison memory and never become positive targets by themselves;
- hidden chain-of-thought is never required or persisted; only observable actions, patches, failures and verification evidence are stored.

## Grounded seven-department learning

The company review surface is seven departments: `planning`, `graphics`, `development`, `qa`, `balance`, `music`, and `intro`. Department AI does not create facts. `tools/vibe3-department-evidence-extract.mjs` first extracts evidence that is bound to source files, build/runtime fields, screenshots/frame metrics, audio-runtime observations, intro-runtime observations, or existing verification artifacts. Department models then judge only that grounded evidence.

The evidence cycle is:

`SOURCE/RUNTIME/ARTIFACT → DETERMINISTIC EVIDENCE EXTRACTION → DEPARTMENT-SPECIFIC GATE → DEPARTMENT JUDGMENT → DIRECTOR AGGREGATION → VERIFIED POSITIVE OR WARNING MEMORY → EXISTING CANONICAL DISTILLATION`

Department focus:
- planning: core fun, core loop, progression/quest connection, identity impact;
- graphics: readability, UI composition, silhouette/frame/screenshot evidence, motion/VFX, asset/platform fit;
- development: responsible code, dependencies, buildability, save/data compatibility and regression risk;
- QA: real runtime/play sequence, reproducible errors, restart/reentry and regression;
- balance: health/damage/reward/economy/progression deltas and observed difficulty impact;
- music: first-user-gesture audio unlock, runtime playback state, mute/volume, mix/feedback readability, license/network dependency;
- intro: first-entry state, identity communication, skip/continue behavior, first meaningful input readiness and handoff to the core loop.

Music and intro cannot PASS from prose or code praise alone. Each requires actual runtime-domain evidence. Missing evidence forces revise/hold rather than fabrication. A PASS may enter positive memory only when its department evidence gate passes; REVISE/DROP/failure evidence is warning/avoidance memory only. All seven departments use the same V3 memory and canonical distillation path; there is no department-specific cron, shadow dataset, or second trainer.

The role list is read from the canonical/mirrored company configuration instead of being duplicated as a fixed five-role constant. This removes the previous five-department expansion bottleneck and lets workflows, review tools, and Director aggregation use one synchronized role set.

## Pump Mode and 24-hour refresh

Pump Mode does not require model-weight training in order to operate. It improves each development attempt by retrieving verified prior evidence, injecting task-specific playbooks, generating multiple independent candidates, executing them in isolation, repairing failures up to three times, and persisting verified trajectories.

The existing `Vibe2 Distillation Sample Ingest` hourly schedule is the sole 24-hour refresh route. Every hour it refreshes canonical samples/status/request and the V3 verified-memory index, task playbooks and benchmark queue. No second cron or shadow learning loop is permitted.

Files:
- `company-learning/vibe3-memory-index.json` — verified positive memory plus separated failure warnings;
- `company-learning/vibe3-task-playbooks.json` — canonical task playbooks;
- `company-learning/vibe3-benchmark-queue.json` — deterministic practice cases;
- `tools/vibe3-pump-index.mjs` — canonical refresh tool invoked by the existing hourly ingest workflow;
- `tools/vibe3-department-evidence-extract.mjs` — grounded seven-department evidence extractor;
- `tools/vibe3-roblox-platform.mjs` — Roblox source/runtime/publishing adapter inside V3 Pump;
- `company-learning/platform-release-roadmap.json` — execution contract mirror only; policy authority remains `COMPANY_FLOW.md`.

A benchmark case is **not** a training sample. It can enter the canonical learning chain only after execution through the existing Vibe development path and independently verified runtime/QA/regression/exact-revision evidence.

## Automatic external web-game distillation

The existing hourly canonical ingest may automatically collect code changes from an explicit allowlist of permissively licensed public web games. This is an input source to the same canonical distillation chain, not a new learning pipeline or second cron.

Implementation files:
- `company-learning/external-web-sources.json` — explicit source allowlist, license metadata and browser interaction probes;
- `tools/vibe3-external-web-distill.mjs` — license/revision/code-diff/browser-runtime verifier and sample builder;
- `qa/vibe3-external-web-distill.test.mjs` — policy/manifest contract test.

Admission rules:
- only explicitly allowlisted sources with an approved permissive license are examined;
- the declared license file and license text must match before a source or commit can be accepted;
- every training sample is bound to the exact upstream source commit and retains repository/license provenance;
- upstream Node, npm, package, shell or project scripts are never executed by the collector;
- the web game is served as static content and exercised in a headless browser with service workers blocked and all non-local browser network requests aborted;
- an actual browser runtime PASS plus a meaningful input/state-change probe is required;
- only code diffs enter the training output; raw assets, binaries and arbitrary downloaded files do not become model-training targets;
- a failed source, syntax check, browser runtime or interaction probe cannot create a positive sample;
- accepted external web samples enter the existing `company-learning/training-samples` root and pass the unchanged status/diversity/readiness gates;
- external web evidence remains portable context only across platforms and cannot certify Roblox, Unity or Fortnite/UEFN runtime/publishing PASS;
- readiness thresholds are not lowered to accelerate training.

## Verified RAG, web portability and failure memory

Positive retrieval memory accepts only active, revision-bound evidence that passes task-specific canonical QA rules. Platform PASS evidence remains platform-local. Verified web-game results may add portable V3 memory for touch input, mobile UI, save/load and resume behavior, performance, responsive layout, regression avoidance, browser behavior and core-loop implementation. Roblox may retrieve those patterns as context, but web evidence never counts as Roblox runtime/publishing/training-lane evidence.

Failures and failed department gates are stored separately as warning memory. They can influence avoidance guidance and repair selection but cannot become positive training targets merely by being present in memory.

## Free teacher candidates

Free teacher candidates may contribute at most two candidate solutions to the 3–5 candidate tournament. They are non-authoritative, cannot declare completion, cannot mutate protected gameplay authority, and must pass the same deterministic runtime/QA/regression gates as primary candidates. Paid fallback is forbidden.

## Source-code intelligence and trajectory learning

V3 builds a source graph from files, symbols, imports/calls, tests and asset references, then ranks likely responsible source before editing. A failure feeds the next bounded repair attempt through an explicit taxonomy. Exhausted attempts stop rather than bypassing QA.

Verified V3 trajectories live under `company-learning/vibe3-trajectories/`. `tools/vibe3-trajectory-ingest.mjs` accepts only a verified winner bound to runtime PASS, QA PASS, regression PASS, protected-state preservation and exact source revision. `runtimePass` and `runtimePassed` are equivalent verified runtime boolean aliases. The existing distillation-status, deterministic training-request, self-hosted training, fixed holdout A/B, canary and rollback stages remain authoritative.

## Self-hosted training backends

There is one canonical training stage with two execution backends, not two learning pipelines.
- primary backend: `SERVER_SELF_HOSTED`;
- preserved backend: `LOCAL_SELF_HOSTED`;
- existing local training remains available for later/manual bidirectional use;
- automatic fallback from server to local is disabled;
- both backends consume the same canonical request, dataset gates and `tools/vibe2-train.py` trainer contract;
- concurrent training of the same canonical request on both backends is forbidden;
- server execution requires an explicitly registered/capability-verified self-hosted runner;
- GitHub-hosted model training and paid model-training API remain forbidden.

## Platform implementation bindings

Roblox, Unity, and Fortnite/UEFN may all be developed whenever a project targets them. Default priority does not create a platform-entry lock. Existing Unity/Android knowledge remains preserved. Success evidence is platform-local; portable verified lessons may be shared only as context. Every qualifying result joins the same canonical Vibe2/Vibe3 distillation chain.

Roblox remains an adapter inside the existing V3 Pump chain. Its source root is `roblox-games/`, live publish remains guarded, credentials remain environment-only, and portable web lessons cannot count as Roblox PASS evidence. No Roblox-specific distillation cron, shadow dataset, duplicate trigger or trainer exists.

## Existing-asset self transformation

V3 may transform existing visual assets only when derivative rights are verified. The original is immutable; independent variants are stored separately with parent/source/license/transform provenance. Eligible variants compete on style consistency, silhouette readability, visual quality, animation readiness and mobile performance. Grounded screenshot/frame evidence is the input to graphics judgment rather than invented visual scores.

## Weight training

Actual LoRA/QLoRA model-weight training is self-hosted only. The server self-hosted backend is primary and the existing local self-hosted backend is preserved. The verified baseline remains `Qwen/Qwen3-1.7B`; larger coder-model selection remains capability-gated with baseline fallback and no forced download. Lack of a suitable self-hosted machine disables weight training only; it does not disable Pump Mode. Fresh adapters remain `TRAINED_UNVERIFIED` until fixed holdout A/B and canary pass.

## Hard prohibitions

- no parallel/shadow development, department-learning, or model-training pipeline;
- no direct stage bypass or source overwrite before winner selection;
- no model-invented department evidence;
- no music/intro PASS without runtime-domain evidence;
- no threshold lowering, duplicated or fabricated samples;
- no benchmark counted as training before verification;
- no failed candidate or failed department gate promoted as a positive target;
- no unlicensed/unverified external web source promoted as positive training evidence;
- no execution of upstream external project Node/npm/shell scripts during external-web collection;
- no raw external assets or binaries used as code-training targets;
- no cross-platform PASS evidence transfer;
- no proprietary source/assets/internal algorithm extraction from external commercial games;
- no paid API or GitHub-hosted model training;
- no automatic adapter promotion.
