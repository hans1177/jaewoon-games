import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(repoRoot, relative), 'utf8');
const runner = read('tools/company-release-production-cycle.mjs');

function assertOrdered(text, tokens, label) {
  let cursor = -1;
  for (const token of tokens) {
    const next = text.indexOf(token, cursor + 1);
    assert.ok(next >= 0, `${label}: missing ${token}`);
    assert.ok(next > cursor, `${label}: out of order ${token}`);
    cursor = next;
  }
}

test('native release evidence and public exposure remain fail closed in actual provider', () => {
  for (const required of [
    'FINAL_RISK_WATCH_REQUIRES_CURRENT_BUILD_RUNTIME_PASS',
    'FINAL_RISK_WATCH_REQUIRES_CURRENT_BUILD_INDEPENDENT_QA_PASS',
    'currentBuildEvidenceBindingRequired:true',
    'FINAL_DEPARTMENT_REVIEW_BUILD_RUNTIME_QA_BINDING=PASS',
    'RELEASE_BLOCKED',
    'RELEASE_READY'
  ]) assert.ok(runner.includes(required),`release evidence guard missing: ${required}`);
});

test('current Unity provider binds implementation/build evidence to current Unity source', () => {
  assert.match(runner, /productionClass!==PRODUCTION_CLASSES\.RELEASE_CONFIRMED/);
  assert.doesNotMatch(runner, /productionTier\s*===?\s*1/);
  assert.doesNotMatch(runner, /Number\([^\n]*productionTier[^\n]*\)\s*===?\s*1/);

  for (const token of [
    'currentUnitySourceTreeSha()',
    "git',['rev-parse',`HEAD:${unityProjectPath}`]",
    'buildTree!==currentSourceTreeSha',
    'buildTree!==implementationTree',
    'currentSourceTreeBindingRequired:true',
    'currentBuildEvidenceBindingRequired:true',
    'sourceChangeInvalidatesOldBuildValidation:true',
  ]) assert.ok(runner.includes(token), `source/build binding missing: ${token}`);
});

test('build preflight cannot replace same-build runtime, independent QA, or final department review', () => {
  assertOrdered(runner, [
    "phase:'BUILD_PREFLIGHT'",
    "latestFile('android-runtime-validation.json')",
    "latestFile('independent-release-qa.json')",
    "phase:'FINAL_RELEASE_REVIEW'",
  ], 'release evidence sequence');

  assert.match(runner, /FINAL_RISK_WATCH_REQUIRES_CURRENT_BUILD_RUNTIME_PASS/);
  assert.match(runner, /FINAL_RISK_WATCH_REQUIRES_CURRENT_BUILD_INDEPENDENT_QA_PASS/);
  assert.match(runner, /runtime\?\.state!==['"]PASS['"]\|\|runtime\?\.bound!==true/);
  assert.match(runner, /qa\?\.state!==['"]PASS['"]\|\|qa\?\.bound!==true/);
  assert.match(runner, /const bound=Boolean\(identity&&ref&&ref===identity\)/);
  assert.match(runner, /finalDepartmentRiskWatchUsesBuildRuntimeQaEvidence:true/);
});

test('release baseline is gated by same-build runtime, independent QA and final review before READY', () => {
  const runtimeIndex = runner.indexOf("latestFile('android-runtime-validation.json')");
  const qaIndex = runner.indexOf("latestFile('independent-release-qa.json')");
  const finalReviewIndex = runner.indexOf("phase:'FINAL_RELEASE_REVIEW'");
  const releaseBaselineIndex = runner.indexOf("const releaseBaselinePath=path.join(base,'release-baseline.json')");
  const readyIndex = runner.indexOf("writeState('RELEASE_READY'");

  for (const [name,index] of Object.entries({runtimeIndex,qaIndex,finalReviewIndex,releaseBaselineIndex,readyIndex}))
    assert.ok(index>=0,`missing ${name}`);
  assert.ok(runtimeIndex<qaIndex);
  assert.ok(qaIndex<finalReviewIndex);
  assert.ok(finalReviewIndex<releaseBaselineIndex);
  assert.ok(releaseBaselineIndex<readyIndex);
  assert.match(runner,/finalDepartmentReviewEvidenceBound:true/);
  assert.match(runner,/androidRuntimeValidation:runtime.path,independentQa:qa.path/);
  assert.match(runner,/departmentRiskWatch:finalRiskWatch.path/);
  // The release cycle produces evidence and READY only. It must never create a final artbook early.
  assert.doesNotMatch(runner,/release-artbook-editor|company-design-artbook\\.mjs/);
  const pipeline=read('tools/artbook-production-pipeline.mjs');
  assertOrdered(pipeline,[
    "await run('tools/company-release-production-cycle.mjs')",
    "await run('tools/company-release-stale-artifact-guard.mjs')",
    'RELEASE_FINAL_ARTBOOK_ONLY_AFTER_READY=YES'
  ],'release pipeline ordering');
  assert.match(pipeline,/RELEASE_STALE_FINAL_ARTIFACT_GUARD=ENABLED/);
});

test('release producer fails closed on central roadmap, held Unity Android and independent runtime evidence',()=>{
  assert.match(runner,/CANONICAL_RELEASE_POLICY='company-learning\\/platform-release-roadmap\\.json'/);
  assert.match(runner,/RELEASE_CANONICAL_POLICY_PATH_REQUIRED/);
  assert.match(runner,/RELEASE_CANONICAL_EVIDENCE_GATE_INVALID/);
  assert.match(runner,/RELEASE_UNITY_ANDROID_OWNER_HOLD/);
  for(const key of ['platformSpecificRuntimeEvidenceRequired','platformSpecificIndependentQaRequired',
    'platformSpecificRegressionRequired','actualRuntimeFoundationF1ThroughF4Required',
    'requiresOwnRuntimeQaRegressionAndExplicitPublicExposureEvidence'])
    assert.ok(runner.includes(key),key);
  assert.ok(runner.indexOf('RELEASE_UNITY_ANDROID_OWNER_HOLD')<runner.indexOf("const catalog=readJson('game-catalog.json'"));
});
