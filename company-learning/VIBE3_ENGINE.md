# Vibe3 Engine

Status: OWNER-DIRECT V3 IMPLEMENTATION
Recorded: 2026-09-12

Vibe3 is an intelligence-layer upgrade inside the existing Vibe2/company development and learning pipelines. It is not a parallel pipeline and must reuse the existing checkpoint, source-apply, runtime observation, QA, regression, distillation, local-training, holdout, canary and rollback gates.

## V3 execution chain

`USER_DIRECTION → COMPANY_ROUTING → SOURCE_DEPENDENCY_GRAPH → RESPONSIBLE_SOURCE_RANKING → VERIFIED_PATTERN_RECALL → 3+ INDEPENDENT CANDIDATES → ISOLATED CANDIDATE EXECUTION → DETERMINISTIC TOURNAMENT → BOUNDED REPAIR LOOP → WINNER SOURCE APPLY → RUNTIME → QA → REGRESSION → EXACT REVISION → TRAJECTORY PERSIST → CANONICAL DISTILLATION`

Rules:
- default independent candidate count: 3;
- default repair attempts: 3;
- no candidate may overwrite the authoritative source before winner selection;
- every winner must prove responsible source, checkpoint/rollback, syntax/tests, runtime, regression, protected-state preservation and exact revision;
- winner selection is deterministic and evidence-first; visual or model preference cannot override failed evidence;
- failed candidates are retained as observable failure/comparison context, never as positive answer targets;
- no hidden chain-of-thought is required or persisted; only actions, patches, observable failures and verification evidence are stored.

## Source-code intelligence

V3 builds a source graph from files, symbols, imports/calls, tests and asset references, then ranks the likely responsible source before editing. Keyword routing remains a fallback, not the primary responsibility signal.

A failure feeds the next bounded repair attempt through an explicit taxonomy: syntax, test/regression, runtime, protected-state, responsibility, performance or unknown. Exhausted attempts stop rather than silently bypassing QA.

## Trajectory learning

Verified V3 trajectories live under `company-learning/vibe3-trajectories/` when persisted by a completed development task. `tools/vibe3-trajectory-ingest.mjs` accepts only a verified winner bound to runtime PASS, QA PASS, regression PASS, protected-state preservation and exact source revision. It projects the winner plus failed-candidate evidence into the existing `company-learning/training-samples` store. The existing distillation-status, deterministic training-request, local self-hosted training, fixed holdout A/B, canary and rollback stages remain authoritative.

## Existing-asset self transformation

V3 may transform existing visual assets when derivative rights are verified. Project/company-original assets are treated as owned originals; external assets still require a compatible content license or explicit derivative permission.

The original asset is immutable. V3 produces independent variants in a separate `derived/` path and records parent asset, original source/license, transform history, attribution and share-alike requirements. Default variant count is 3. Candidate transforms may include crop, scale, rotation, recolor, contrast, lighting, material, silhouette redesign, part separation/recomposition, layering, tile repeat, shadow, outline, animation rig preparation, VFX derivative and mobile simplification.

A transformed asset is selectable only after reference integrity and mobile performance pass. Eligible variants compete on style consistency, silhouette readability, visual quality, animation readiness and performance. Copyright/permission failure blocks transformation rather than being worked around.

## Model capability upgrade

The existing local self-hosted training route remains mandatory. V3 adds capability-gated model selection through `tools/vibe3-model-selection.mjs`.

The verified baseline remains `Qwen/Qwen3-1.7B`. A larger code-specialized candidate is never force-downloaded. It can be selected only for code-heavy tasks when local CUDA, QLoRA, conservative VRAM/disk policy, explicit enablement, a local compatibility marker, and cached/pre-approved model availability all pass. Otherwise training falls back to the baseline. New adapters remain `TRAINED_UNVERIFIED` until fixed holdout A/B and canary pass.

## External black-box QA trainer consistency

The canonical trainer now accepts the same bounded external-black-box QA evidence already accepted by the ingestion layer only when all of these are true: task type is QA, source kind is `external-black-box`, independent QA marker is `BLACK_BOX_EVIDENCE_PASS`, browser QA is `NOT_APPLICABLE`, runtime is PASS, black-box evidence is PASS, and proprietary extraction is explicitly false. This closes the former ingest/trainer contract mismatch without weakening normal browser QA requirements.

## Hard prohibitions

- no parallel/shadow development or learning pipeline;
- no direct stage bypass;
- no source overwrite before winner selection;
- no threshold lowering or fabricated samples;
- no failed candidate promoted as a positive target;
- no unverified external asset derivative;
- no original asset destruction;
- no proprietary source/assets/internal algorithm extraction from external commercial games;
- no paid API or GitHub-hosted model training;
- no automatic adapter promotion.
