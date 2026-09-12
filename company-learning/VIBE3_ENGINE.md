# Vibe3 Engine + Pump Mode

Status: OWNER-DIRECT V3 IMPLEMENTATION — PUMP MODE LOCKED
Recorded: 2026-09-12

Vibe3 is an intelligence-layer upgrade inside the existing Vibe2/company development and learning pipelines. It is not a parallel pipeline. It reuses the existing checkpoint, source-apply, runtime observation, QA, regression, distillation, local-training, holdout, canary and rollback gates.

## V3 Pump execution chain

`USER_DIRECTION → COMPANY_ROUTING → VERIFIED_RAG → FAILURE_WARNING_MEMORY → TASK_PLAYBOOK → SOURCE_DEPENDENCY_GRAPH → RESPONSIBLE_SOURCE_RANKING → 3–5 INDEPENDENT CANDIDATES → OPTIONAL FREE TEACHER CANDIDATES → ISOLATED EXECUTION → DETERMINISTIC TOURNAMENT → MAX-3 REPAIR LOOP → WINNER SOURCE APPLY → RUNTIME → QA → REGRESSION → EXACT REVISION → TRAJECTORY PERSIST → MEMORY REFRESH → CANONICAL DISTILLATION`

Rules:
- independent candidate count: minimum 3, maximum 5, default 5;
- default/max bounded repair attempts: 3;
- no candidate may overwrite authoritative source before winner selection;
- every winner must prove responsible source, checkpoint/rollback, syntax/tests, runtime, regression, protected-state preservation and exact revision;
- failed candidates remain failure-warning/comparison memory and never become positive targets by themselves;
- hidden chain-of-thought is never required or persisted; only observable actions, patches, failures and verification evidence are stored.

## Pump Mode without local weight training

Pump Mode does not require local model-weight training. It improves each development attempt by retrieving verified prior evidence, injecting task-specific playbooks, generating multiple independent candidates, executing them in isolation, repairing failures up to three times, and persisting verified trajectories.

The existing `Vibe2 Distillation Sample Ingest` hourly schedule is the sole 24-hour refresh route. Every hour it refreshes canonical samples/status/request and the V3 verified-memory index, task playbooks and benchmark queue. No second cron or shadow learning loop is permitted.

Files:
- `company-learning/vibe3-memory-index.json` — verified positive memory plus separated failure warnings;
- `company-learning/vibe3-task-playbooks.json` — coding/bugfix/qa/unity/roblox/graphics/planning/general playbooks;
- `company-learning/vibe3-benchmark-queue.json` — deterministic practice cases;
- `tools/vibe3-pump-index.mjs` — canonical refresh tool invoked by the existing hourly ingest workflow;
- `tools/vibe3-roblox-platform.mjs` — Roblox Phase 1 source/runtime/publishing adapter inside V3 Pump.

A benchmark case is **not** a training sample. It can enter the canonical learning chain only after execution through the existing Vibe development path and independently verified runtime/QA/regression/exact-revision evidence.

## Verified RAG and failure memory

Positive retrieval memory accepts only active, revision-bound evidence that passes the task-specific canonical QA rules. Unity requires independent QA PASS + Android runtime PASS + browser N/A. Roblox requires independent QA PASS + Roblox runtime PASS + browser N/A. External commercial black-box QA requires the dedicated `BLACK_BOX_EVIDENCE_PASS` marker, browser N/A and runtime PASS. Ordinary non-Unity/non-Roblox samples keep browser QA PASS.

Failures are stored separately as warning memory. They can influence `avoid` guidance and repair selection but cannot be converted into positive training targets merely by being present in memory.

## Free teacher candidates

Groq and Mistral may contribute at most two free candidate solutions to the 3–5 candidate tournament. Teacher candidates are non-authoritative, cannot declare completion, cannot mutate protected gameplay authority, and must pass the exact same deterministic runtime/QA/regression gates as primary candidates. Paid fallback is forbidden. If free teachers are unavailable, V3 continues with primary candidates; it does not block or purchase capacity.

## Source-code intelligence

V3 builds a source graph from files, symbols, imports/calls, tests and asset references, then ranks likely responsible source before editing. A failure feeds the next bounded repair attempt through an explicit taxonomy: syntax, test/regression, runtime, protected-state, responsibility, performance or unknown. Exhausted attempts stop rather than bypassing QA.

## Trajectory learning

Verified V3 trajectories live under `company-learning/vibe3-trajectories/`. `tools/vibe3-trajectory-ingest.mjs` accepts only a verified winner bound to runtime PASS, QA PASS, regression PASS, protected-state preservation and exact source revision. The existing distillation-status, deterministic training-request, local self-hosted training, fixed holdout A/B, canary and rollback stages remain authoritative.

## Platform release roadmap

Platform release/experience sequencing is locked to:

`ROBLOX → UNITY → FORTNITE_UEFN`

- Phase 1: Roblox is the current primary platform for rapid real releases, fix/re-release cycles and stabilization experience.
- Phase 1 implementation is connected now: `roblox` task playbook, `roblox-games/` source scope, canonical trajectory/sample gates, guarded Open Cloud publish adapter, regression tests and V3 contract CI.
- Roblox live publish is not considered verified release experience by itself. It remains explicitly opt-in and requires exact-revision-bound runtime PASS, independent QA PASS, regression PASS and protected-state preservation before publish eligibility.
- Phase 2: after verified Roblox release/stabilization experience, keep Roblox active and add Unity so Roblox + Unity release experience accumulates concurrently where product scope makes sense.
- Existing Unity/Android source, build, runtime, QA and release knowledge is preserved and extended. Roblox-first does not delete, replace or downgrade the Unity path.
- Phase 3: add Fortnite/UEFN only after verified Roblox-first and Roblox+Unity experience has accumulated; preserve both earlier platform tracks.
- Portable verified lessons can be shared through V3 memory/RAG/playbooks, while platform-specific implementation remains scoped to its own playbook/runtime adapter/QA contract.
- Success evidence is not transferable between platforms: each platform requires its own runtime and independent QA evidence.

Human-readable roadmap: `company-learning/PLATFORM_RELEASE_ROADMAP.md`.
Machine-readable roadmap: `company-learning/platform-release-roadmap.json`.

## Roblox Phase 1 implementation

Roblox support is an adapter inside the existing V3 Pump chain, not a new pipeline.

- source root: `roblox-games/`;
- task type: `roblox`;
- playbook refresh: existing `tools/vibe3-pump-index.mjs`;
- verified trajectory promotion: existing `tools/vibe3-trajectory-ingest.mjs`;
- canonical sample gate: existing `tools/vibe2-training-sample.mjs`;
- guarded publish adapter: `tools/vibe3-roblox-platform.mjs`;
- contract test: `qa/vibe3-roblox-platform.test.mjs`;
- CI: existing `.github/workflows/vibe3-engine-contract.yml`;
- publish default: dry-run;
- live publish requires explicit `--execute` plus `ROBLOX_OPEN_CLOUD_API_KEY`, `ROBLOX_UNIVERSE_ID`, `ROBLOX_PLACE_ID`;
- credentials remain environment-only, are not serialized into plans/results, and are redacted from publish-error output;
- place publishing files must be `.rbxl` or `.rbxlx` under `roblox-games/`;
- cookie authentication is disabled by contract.

No Roblox-specific distillation cron, shadow dataset, duplicate trigger or trainer exists or is authorized.

## Owner-directed platform extensions

Owner-directed platform extensions, including Roblox/Luau and Fortnite/UEFN, are adapters inside the existing company/V3 execution path. They do not replace or reorder `COMPANY_FLOW.md` production gates and do not create a parallel learning pipeline. The platform roadmap changes which platform is operationally first while preserving the existing Unity/Android path for its roadmap phase.

A platform extension may add platform-specific task-playbook guidance, source/runtime handling and a dedicated QA evidence contract. Verified results can enter canonical distillation only after the same positive-trajectory gates pass: verified winner, runtime PASS, independent QA PASS, regression PASS, protected-state preservation and exact source revision. Studio launch, successful build, process survival or injected input alone is not sufficient evidence.

Roblox/Luau or Fortnite/UEFN failed candidates remain failure-warning/comparison memory. Verified platform-extension results use the existing canonical Vibe2 route only: `VALIDATED_EVIDENCE → DISTILLATION_INGEST → VERIFIED_TRAINING_SAMPLE → DISTILLATION_STATUS → DETERMINISTIC_TRAINING_REQUEST → LOCAL_SELF_HOSTED_DATASET_BUILD → LOCAL_LORA_OR_QLORA_TRAINING → TRAINED_UNVERIFIED → FIXED_HOLDOUT_AB → CANARY → PROMOTE_OR_ROLLBACK`.

No platform-specific distillation cron, shadow dataset, duplicate trigger or separate trainer is permitted.

## Existing-asset self transformation

V3 may transform existing visual assets when derivative rights are verified. Project/company-original assets are treated as owned originals; external assets require a compatible content license or explicit derivative permission.

The original asset is immutable. V3 produces independent variants in a separate `derived/` path and records parent asset, source/license, transform history, attribution and share-alike requirements. Default visual variant count is 3. Candidate transforms may include crop, scale, rotation, recolor, contrast, lighting, material, silhouette redesign, part separation/recomposition, layering, tile repeat, shadow, outline, animation rig preparation, VFX derivative and mobile simplification.

Eligible variants compete on style consistency, silhouette readability, visual quality, animation readiness and mobile performance. Copyright/permission failure blocks transformation rather than being worked around.

## Weight training later

Actual LoRA/QLoRA model-weight training remains `LOCAL_SELF_HOSTED_ONLY`. The verified baseline remains `Qwen/Qwen3-1.7B`; larger coder-model selection remains capability-gated with baseline fallback and no forced download. Lack of a suitable local machine disables weight training only; it does **not** disable Pump Mode.

When local capability becomes available, the accumulated verified trajectories/samples continue through the existing thresholds and canonical chain. Fresh adapters remain `TRAINED_UNVERIFIED` until fixed holdout A/B and canary pass.

## Hard prohibitions

- no parallel/shadow development or learning pipeline;
- no direct stage bypass;
- no source overwrite before winner selection;
- no threshold lowering, duplicated or fabricated samples;
- no benchmark counted as training before verification;
- no failed candidate promoted as a positive target;
- no unverified external asset derivative or original asset destruction;
- no proprietary source/assets/internal algorithm extraction from external commercial games;
- no paid API or GitHub-hosted model training;
- no automatic adapter promotion.
