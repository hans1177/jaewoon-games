# Vibe3 Engine + Pump Mode

Status: OWNER-DIRECT V3 IMPLEMENTATION — PUMP MODE LOCKED
Recorded: 2026-09-19

`company-learning/platform-release-roadmap.json` is the machine policy source of truth. `COMPANY_FLOW.md` is a legacy mirror. This file documents V3 implementation behavior only and must not create independent company, platform, portfolio-size, release-order, or learning policy.

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
- `tools/vibe3-roblox-platform.mjs` — Roblox source/runtime/publishing adapter inside V3 Pump;
- `company-learning/platform-release-roadmap.json` — canonical machine policy authority.

A benchmark case is **not** a training sample. It can enter the canonical learning chain only after execution through the existing Vibe development path and independently verified runtime/QA/regression/exact-revision evidence.

## Verified RAG and failure memory

Positive retrieval memory accepts only active, revision-bound evidence that passes the task-specific canonical QA rules. Unity requires independent QA PASS + Android runtime PASS + browser N/A. Roblox requires independent QA PASS + Roblox runtime PASS + browser N/A. Fortnite/UEFN requires its own platform runtime and independent QA evidence once its adapter/playbook is active. External commercial black-box QA requires the dedicated `BLACK_BOX_EVIDENCE_PASS` marker, browser N/A and runtime PASS. Ordinary non-platform-specific samples keep browser QA PASS where applicable.

Failures are stored separately as warning memory. They can influence `avoid` guidance and repair selection but cannot be converted into positive training targets merely by being present in memory.

## Free teacher candidates

Groq and Mistral may contribute at most two free candidate solutions to the 3–5 candidate tournament. Teacher candidates are non-authoritative, cannot declare completion, cannot mutate protected gameplay authority, and must pass the exact same deterministic runtime/QA/regression gates as primary candidates. Paid fallback is forbidden. If free teachers are unavailable, V3 continues with primary candidates; it does not block or purchase capacity.

## Source-code intelligence

V3 builds a source graph from files, symbols, imports/calls, tests and asset references, then ranks likely responsible source before editing. A failure feeds the next bounded repair attempt through an explicit taxonomy: syntax, test/regression, runtime, protected-state, responsibility, performance or unknown. Exhausted attempts stop rather than bypassing QA.

## Trajectory learning

Verified V3 trajectories live under `company-learning/vibe3-trajectories/`. `tools/vibe3-trajectory-ingest.mjs` accepts only a verified winner bound to runtime PASS, QA PASS, regression PASS, protected-state preservation and exact source revision. The existing distillation-status, deterministic training-request, local self-hosted training, fixed holdout A/B, canary and rollback stages remain authoritative.

## Causal Coding Learning

V3 must treat coding itself as a continuous learning episode, not as a production step followed by a separate classification step. The canonical policy is `causalCodingLearning` in `company-learning/platform-release-roadmap.json`.

For every meaningful code change, V3 should preserve an observable causal episode:

`OBSERVATION → CURRENT STRUCTURE → HYPOTHESIS → PROPOSED MECHANISM → INTERVENTION → PREDICTED EFFECTS/NON-EFFECTS → ACTUAL EFFECTS/NON-EFFECTS → CONFIRM/REFUTE/REVISE → NEXT INTERVENTION → QA/REGRESSION → DISTILLATION`

This does not require or persist hidden chain-of-thought. It stores only observable hypotheses, code interventions, predictions, results, revision-bound evidence and verified conclusions.

### Candidate tournament as causal experimentation

When root cause is uncertain, the existing 3–5 independent candidates should be causally diverse where useful. Candidates may test different root-cause hypotheses, or different interventions for the same hypothesis. Near-duplicate candidates that do not separate hypotheses provide less diagnostic value. Obvious deterministic repairs must not fabricate artificial hypothesis diversity.

Candidate selection still uses the existing deterministic runtime, QA, regression, protected-state and exact-revision gates. Causal learning cannot weaken completion criteria.

### Prediction before intervention

A candidate should state observable predictions before execution, including both what should change and what should remain unchanged. Learning quality is then measured partly by the agreement between prediction and result.

A successful patch with no reliable attribution is a production success but incomplete causal learning. A failed prediction can still be valuable evidence when it falsifies a hypothesis or narrows the responsible mechanism.

### Active diagnosis

Before a broad repair, V3 should prefer the lowest-risk intervention that separates competing hypotheses when such an experiment is safe and cheaper than a broad patch. Production safety, owner directives, protected gameplay rules and save/progression compatibility always outrank information gain.

### Counterfactual and ablation

When safe and economical, V3 may strengthen causal evidence by replaying the failure without a proposed change, reverting a patch in isolation, or ablating parts of a successful multi-change patch. The goal is to distinguish the actual causal change from correlated or unnecessary edits.

Unsafe, destructive or authority-expanding counterfactuals are forbidden. Counterfactual experiments never replace canonical QA.

### Learning causality graph

The existing causality graph in `assets/vibe-quality-intelligence.js` should evolve from static weighted influence propagation into evidence-updated causal memory. Verified interventions may strengthen an edge; contradictory verified episodes must weaken or invalidate it.

Useful edge evidence includes cause, effect, conditions, direction, confidence, supporting episodes, contradicting episodes, exact verified revision, project scope and transferability. Correlation-only observations are not strong causal proof.

### Failure memory

Failure memory should distinguish ordinary execution failure from falsified hypotheses, partial mechanism support, confounded results, environment/infrastructure failures and responsibility misattribution. A falsified hypothesis is reusable negative knowledge, not merely a failed candidate.

Environment failures must not be learned as code causes.

### Continuous within-task learning

Learning happens after every meaningful attempt inside the same coding task. The next attempt should consume the newly observed evidence and revise the active hypothesis or intervention. Repeating the same attempt without new evidence or a changed hypothesis is discouraged.

Within-task beliefs are temporary. They enter canonical memory only after the existing runtime, QA, regression, protected-state and exact-revision gates pass.

### Distillation depth

Verified lessons should be distilled at three levels:

1. local project fact;
2. mechanism-level rule;
3. general transferable principle.

Maturity may progress through `OBSERVED → CANDIDATE → VALIDATED → DISTILLED → CORE`, while stale or contradicted rules become `DEPRECATED`.

The positive memory must preserve not only that a patch passed, but why the verified mechanism explains the result and under which conditions the lesson applies.

### Learning-ability evaluation

V3 learning quality should be evaluated separately from raw task success. Relevant metrics include prediction accuracy/calibration, verified root-cause rate, first-candidate pass rate, average attempts, repeated-failure recurrence, time to verified cause, cross-project mechanism transfer, regression after learned reuse and false causal-belief rate.

Matched before/after task classes should be used when evaluating whether learning improved. A higher success count alone does not prove better causal understanding.

## Platform implementation bindings

Platform policy is defined by `company-learning/platform-release-roadmap.json`; `COMPANY_FLOW.md` is a legacy mirror.

Implementation invariants:
- Roblox, Unity, and Fortnite/UEFN may all be developed whenever a project targets them; V3 must not create a platform-entry lock from focus order.
- Platform routing and focus follow `company-learning/platform-release-roadmap.json`; focus priority never becomes an unauthorized platform-entry gate.
- existing Unity/Android source, build, runtime, QA and release knowledge remains preserved and extendable;
- Fortnite/UEFN implementation may be added without waiting for Roblox or Unity completion;
- success evidence is platform-local: one platform's PASS cannot certify another platform;
- portable verified lessons may be shared through V3 memory/RAG/playbooks;
- platform-specific source/runtime/publishing details remain scoped to the relevant playbook/adapter;
- every qualifying result joins the same canonical Vibe2 distillation chain.

Machine execution mirror: `company-learning/platform-release-roadmap.json`.

## Roblox implementation

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

## Unity implementation preservation

Unity remains a full supported platform. Existing Unity/Android project, C#, build, runtime, mobile performance, QA, save compatibility and release knowledge must not be deleted or downgraded merely because Roblox is the primary default focus. Unity-specific verified experience remains scoped to the Unity playbook while portable verified patterns may feed shared V3 memory.

## Fortnite / UEFN implementation extension

Fortnite/UEFN is a full supported target under `COMPANY_FLOW.md`, not a locked future-only platform. Its Verse/UEFN playbook, runtime adapter, publishing evidence and platform QA contract may be implemented whenever work is routed to Fortnite/UEFN. It must join the same V3 tournament, verification, trajectory, memory and canonical distillation chain rather than creating a parallel system.

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
- no platform development lock inferred from default focus order;
- no unverified external asset derivative or original asset destruction;
- no proprietary source/assets/internal algorithm extraction from external commercial games;
- no paid API or GitHub-hosted model training;
- no automatic adapter promotion.
