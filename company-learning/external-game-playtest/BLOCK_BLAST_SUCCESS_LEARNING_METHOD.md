# Block Blast Success-Learning Method

Status: OFFICIAL VERIFIED BLACK-BOX LEARNING METHOD

Authority: `COMPANY_FLOW.md` plus `company-learning/canonical-learning-pipeline.json`.

## Verified source

The successful source is Block Blast Run 30 only for the captured black-box validation window.

- game: `block-blast`
- package: `com.block.juggle`
- workflow run: `34653320467`
- run number: `30`
- artifact: `10284397608`
- artifact digest: `sha256:8c165e437321a156c8c37ad75180874b13b561dc82167b4af08e22c60cddd4b1`
- runtime: native ARM64 GitHub-hosted runner + Android 14 Redroid direct execution

## What made the evidence a positive learning sample

The sample is positive only because the correlated evidence binds these stages together:

1. app launch succeeds;
2. actual gameplay/tutorial board is visibly reached;
3. a drag input is exercised against the visible game;
4. the visible board state changes after that input;
5. the target package remains alive and foreground;
6. no captured FATAL EXCEPTION, native crash, or ANR marker appears in the validation window.

Install success, splash visibility, process creation, consent-screen progress, or input injection alone are not gameplay success.

## Canonical learning conversion

`block-blast-runtime-distillation.json`
→ `vibe2-distillation-ingest.mjs`
→ `training-samples/external-black-box-block-blast-run-30.json`
→ `distillation-status.json`
→ `distillation-training-request.json`
→ local self-hosted dataset/training only when global verified-sample thresholds are satisfied
→ `TRAINED_UNVERIFIED`
→ fixed holdout A/B
→ canary
→ promote or rollback.

The Run 30 sample is already accepted by the QA distillation task. This is a successful learning-sample promotion, not a claim that a new model adapter has already been trained. Model training remains gated by the global sample-count and project-diversity thresholds.

## Hard boundaries

Only directly captured black-box behavior may be distilled. Do not extract or reproduce proprietary source code, assets, audio, internal algorithms, hidden scoring/economy rules, names, UI artwork, or trade dress. Browser QA is `NOT_APPLICABLE` for this external Android black-box source and must never be fabricated as `PASS`.

Do not lower training thresholds, duplicate the same evidence as fake independent samples, or create a parallel/shadow learning pipeline to force training readiness.
