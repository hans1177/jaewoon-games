import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const roadmap = JSON.parse(read('company-learning/platform-release-roadmap.json'));
const source = read('tools/vibe2-source-worker.mjs');
const workflow = read('.github/workflows/vibe2-continuous-core.yml');
const design = read('.github/workflows/artbook-free-department-bots.yml');

test('October 14 owner production directive excludes all external and local AI model calls', () => {
  const owner = roadmap.ownerModelFreeProduction20261014;
  assert.equal(owner.authority, 'OWNER_DIRECTIVE_2026-10-14');
  assert.equal(owner.productionModelCallsAllowed, false);
  assert.equal(owner.externalAiProductionAllowed, false);
  assert.equal(owner.localOllamaProductionAllowed, false);
  assert.equal(owner.modelRequiredTaskWithoutDeterministicCandidate, 'BLOCKED_NOT_VERIFIED');
  assert.equal(owner.releaseQaSecurityAndRuntimeGatesUnchanged, true);
  assert.equal(roadmap.externalAiVibeFullProcessCollaboration.execution.externalAiMayReceiveDevelopmentTasks, false);
  assert.equal(roadmap.externalAiVibeFullProcessCollaboration.execution.externalAiMayEditGameSourceOnIsolatedCandidateBranch, false);
  assert.equal(roadmap.developmentLifecycleMachine.developmentToolAuthority.gameSourceGenerationProvider, 'DETERMINISTIC_ONLY');
  assert.equal(roadmap.developmentLifecycleMachine.developmentToolAuthority.enforcement.requiredEnvironment.VIBE2_GAME_SOURCE_PROVIDER, 'DETERMINISTIC_ONLY');
  assert.equal(roadmap.finalDevelopmentLock.sequenceLock.status, 'LOCKED');
});

test('canonical production run never installs or invokes an AI coding model', () => {
  assert.match(workflow, /VIBE2_PRODUCTION_MODEL_CALLS_ENABLED: 'false'/);
  assert.match(workflow, /VIBE2_GAME_SOURCE_PROVIDER: DETERMINISTIC_ONLY/);
  assert.match(workflow, /VIBE2_LOCAL_MODEL: 'NONE'/);
  assert.match(workflow, /if: false # Production models disabled/);
  assert.match(workflow, /reason='OWNER_MODEL_FREE_PRODUCTION'/);
  assert.match(workflow, /if: false # model-based practice disabled/);
  assert.match(workflow, /test "\$VIBE2_GAME_SOURCE_PROVIDER" = "DETERMINISTIC_ONLY"/);
  const guard = source.indexOf("PRODUCTION_AI_MODELS_DISABLED:DETERMINISTIC_CANDIDATE_REQUIRED");
  const call = source.indexOf('generated=await generateCandidateWithRecovery');
  assert.ok(guard >= 0 && call > guard, 'model-free fail-closed guard must precede model generation');
  assert.match(source, /modelFree\?'NONE':DEFAULT_MODEL/);
});

test('design pipeline does not install Ollama, pull language models, or inject external model credentials', () => {
  assert.doesNotMatch(design, /ollama\.com\/install\.sh|ollama pull /);
  assert.doesNotMatch(design, /GEMINI_API_KEY:\s*\$\{\{\s*secrets\.GEMINI_API_KEY/);
  assert.match(design, /DESIGN_AI_MODEL_CALLS=DISABLED/);
});
