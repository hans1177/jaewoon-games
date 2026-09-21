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

## Unified Learning Fabric

Vibe3 should not add more isolated learning silos. Existing specialized learning channels remain useful at evidence capture, but all reusable learning should normalize into one shared causal evidence shape before cross-project reuse.

The fabric connects real development experience, bug/failure memory, recovery learning, department learning, practice and benchmark learning, teacher curriculum, verified external-AI distillation, external-game black-box observation, authorized-source learning, transformative recombination, security learning, company-DNA learning and causal coding episodes.

Shared normalization should preserve: source channel, observation, current structure/context, verified facts, uncertainty, primary and alternative hypotheses, predictions, intervention or observation action, actual result, prediction error, causal verdict, contradictions, applicability conditions, side effects/regression, exact revision/evidence identity, confidence and maturity.

The fabric must distinguish three knowledge depths:

1. local fact;
2. mechanism-level rule;
3. transferable principle.

Cross-learning is allowed only after verification and applicability checks. Platform-specific PASS evidence never becomes another platform's PASS. Contradictions are preserved and must reduce confidence or deprecate stale rules rather than being silently discarded.

Retrieval priority should favor same-game verified causal knowledge, then same-system or same-engine mechanisms, then transferable cross-game principles, verified negative knowledge, teacher/practice knowledge, and finally verified external-AI advisory knowledge.

## Vibe Cognitive Core

The Cognitive Core is a functional metacognitive and observation layer. It does **not** claim sentience or subjective consciousness. Its role is to track what matters, what is known, what remains uncertain, what is surprising and why the next action is selected.

The target cognitive loop is:

`OBSERVE → ATTEND → DETECT ANOMALY/MISSING SIGNAL → SITUATION MODEL → KNOWN/UNKNOWN/CONFLICTED → PRIMARY + ALTERNATIVE HYPOTHESES → PREDICT → SAFE SIMULATION → SELECT INFORMATION-RICH ACTION → INTERVENE → MEASURE SURPRISE → UPDATE WORLD MODEL/SELF MODEL → EXTRACT INSIGHT → DISTILL/REVALIDATE`

### Global workspace

Vibe should keep a bounded active workspace rather than loading all memory equally. A typical active workspace contains only the current goal, critical observations, highest-value anomalies, leading hypotheses, key uncertainty, major risk and the most relevant verified memories. Low-value information should be summarized or evicted.

### Attention and observation

Attention should rise when there is user importance, prediction error, unexpected change, repeated failure, large blast radius, novelty, missing expected evidence, high causal uncertainty, regression risk or time-dependent risk.

Attention does not make a belief true. It only allocates more reasoning and verification resources.

### Surprise engine

Vibe should compare predeclared observable predictions with actual results. High prediction error is a signal that the current world model may be incomplete.

Unexpected success side effects count as surprise too. High surprise should trigger hidden-variable search, alternative hypotheses, telemetry-gap checks and reduced confidence in the prior model.

### Epistemic ledger

Knowledge should explicitly carry a state such as `VERIFIED_FACT`, `STRONGLY_SUPPORTED`, `WORKING_HYPOTHESIS`, `WEAK_HYPOTHESIS`, `UNKNOWN`, `CONFLICTED`, `FALSIFIED` or `STALE_REQUIRES_REVALIDATION`.

Inference must never silently become fact. Confidence must move with supporting and contradicting evidence.

### Falsification-first reasoning

When root cause is uncertain, Vibe should actively search for evidence that would disprove its current hypothesis. It should maintain competing explanations and prefer the cheapest safe experiment that separates them.

### Temporal reasoning

The system should reason across immediate behavior, the next state transition, restart/rejoin, save-load cycles, long sessions and later stages/releases. A state that passes now can still fail later.

### Missing-signal observation

Absence of expected evidence is itself useful evidence. Examples include a save-success log without load validation, an input event without state change, process launch without real gameplay entry, or a claimed success without expected telemetry.

### Concept compression

Repeated episodes should be compressed into mechanism concepts rather than stored only as case lists. Compression must preserve known exceptions and applicability conditions.

### Analogy and insight

Analogy should match causal structure rather than surface wording. When apparently different episodes share a verified mechanism, Vibe may create a higher-level candidate principle. That principle remains a hypothesis until independently revalidated in another relevant context.

### Mental simulation and sandboxing

Replay, sandbox, mock state and deterministic simulation should be used before risky production interventions when possible. Simulation improves hypothesis selection but never substitutes for required native runtime evidence.

### Self model

Vibe should maintain a bounded self-model of domain strengths, error rates, common misdiagnoses, calibration, root-cause depth, transfer success and repeated-failure rate. Weak domains may require more evidence or review, but the self-model cannot expand authority or lower gates.

### Consolidation

Idle capacity may replay prior trajectories, compare counterfactual alternatives and combine lessons across episodes. Any insight generated during this consolidation is hypothesis-only until revalidated. Production work always preempts consolidation.

### Cognitive evaluation

Learning quality should include observation miss rate, prediction error, calibration error, time to falsify wrong hypotheses, root-cause depth, hidden-variable discovery, missing-signal detection, analogy-transfer success, insight revalidation, false-insight rate and repeated-mistake rate.

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


## Unity Web 1차 게임 제작/학습 동기화

`company-learning/platform-release-roadmap.json`의 `unityWebFirstStage`가 권한 원본이다. Vibe3는 이 규칙을 구현/학습에 반영할 뿐 별도 정책을 만들지 않는다.

동기화 실행 문서는 `company-learning/UNITY_WEB_FIRST_STAGE.md`다. 이 문서는 정책 권한을 만들지 않고 Vibe/Unity/Web QA/후속 플랫폼 바인딩을 같은 의미로 유지한다.

- 변경 범위는 **1차 Web 게임 제작/검증 단계만**이다. Unity/Roblox/Fortnite UEFN의 후속 플랫폼 플로우와 증거 권한은 그대로 유지한다.
- 모든 신규 1차 Web 게임의 원본은 `unity-games/<gameId>/` Unity 프로젝트다.
- `web-games/<gameId>/`는 직접 HTML/Canvas 게임을 작성하는 원본이 아니라 Unity Web 빌드 산출물 배포 경로다.
- 기본 제작 지식은 C#, Scene, Prefab, MonoBehaviour, ScriptableObject, Animator, Material, Particle System, Unity UI, Input System, Physics/AI, Audio, Lighting, Camera, Web Build/최적화 중심으로 검색·후보생성·검증한다.
- 기존 HTML/JavaScript/Canvas/PlayCanvas 구현은 마이그레이션 동안 참고·비교·비상 폴백으로 보존할 수 있지만 Unity Web PASS 뒤에는 canonical source가 될 수 없다.
- Unity Web QA의 성공/실패은 기존 verified RAG/trajectory/distillation 체인으로 들어가며 별도 학습 파이프라인이나 cron을 만들지 않는다.
- Unity 플랫폼 대상 게임은 Unity Web PASS 후 **같은 Unity 프로젝트**에서 Android APK/AAB로 진행한다.
- Roblox/UEFN 대상 게임은 Unity Web을 1차 검증 표면으로 사용한 뒤 기존 native 구현/런타임/독립 QA/회귀 플로우를 그대로 사용한다. Unity Web PASS는 native PASS를 대체하지 않는다.
- 모바일 입력은 Unity 프로젝트 내부 Input System/On-Screen Control/Touch로 구현한다. `_worker.js` 공통 조이스틱 주입은 장기 기본 입력 경로가 아니다.
- 1차 Web 화면도 실제 에셋·전투·AI·UI·맵·장르 핵심 시스템·모바일 조작을 요구한다. primitive 중심 가짜 플레이어블은 학습 성공 근거가 아니다.
- 자동 QA 키 입력은 실제 게임 함수를 구동하는 보조 수단일 뿐 모바일 조작 성공으로 학습하지 않는다. 실제 Unity 화면 컨트롤의 `MOBILE_TARGET` 위치에 브라우저 Touch를 전달한 뒤 `MOBILE_INPUT`이 발생해야 모바일 입력 성공 증거다.
- 장르 핵심 루프가 실제 상태 진행/보상까지 완료된 시점의 `CORE_FUN status=PASS`만 Core Fun 성공 증거로 학습한다. 단순 화면 표시, 버튼 클릭, QA 전용 상태 변경은 성공 trajectory로 저장하지 않는다.
