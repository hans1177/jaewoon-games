import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(repoRoot, relative), 'utf8');
const roadmap = JSON.parse(read('company-learning/platform-release-roadmap.json'));
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

test('central native release policy keeps runtime QA regression and public exposure fail closed', () => {
  const direct=roadmap.directNativeDualPlatformDevelopment;
  const gate=roadmap.developmentLifecycleMachine.internalPlatformReleaseAndPublicExposureGate;
  assert.equal(direct.status,'OWNER_DIRECT_LOCKED');
  assert.equal(direct.platformSpecificRuntimeEvidenceRequired,true);
  assert.equal(direct.platformSpecificIndependentQaRequired,true);
  assert.equal(direct.platformSpecificRegressionRequired,true);
  assert.equal(direct.externalRelease.requiresOwnRuntimeQaRegressionAndExplicitPublicExposureEvidence,true);
  assert.equal(gate.internalRelease.foundationValidationRequired,true);
  assert.equal(gate.internalRelease.actualRuntimeFoundationF1ThroughF4Required,true);
  assert.equal(gate.secondGate.requiredBeforeExternalPublicRelease,true);
  for(const required of ['NATIVE_RUNTIME_PASS','INDEPENDENT_QA_PASS','REGRESSION_PASS','PLATFORM_ADAPTATION_RUNTIME_EVIDENCE_PASS']){
    assert.ok(gate.secondGate.commonRequirements.includes(required),required);
  }
  assert.equal(gate.publicExposure.explicitExternalPublicationEvidenceRequiredAfterSecondGate,true);
  assert.equal(gate.publicExposure.secondGatePassAloneDoesNotClaimPublication,true);
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

test('release baseline and final artbook are reachable only after current-build evidence and final review', () => {
  const runtimeIndex = runner.indexOf("latestFile('android-runtime-validation.json')");
  const qaIndex = runner.indexOf("latestFile('independent-release-qa.json')");
  const finalReviewIndex = runner.indexOf("phase:'FINAL_RELEASE_REVIEW'");
  const releaseBaselineIndex = runner.indexOf("const releaseBaselinePath=path.join(base,'release-baseline.json')");
  const artbookEditorIndex = runner.indexOf("release-artbook-editor");
  const readyIndex = runner.indexOf("writeState('RELEASE_READY'");

  for (const [name, index] of Object.entries({runtimeIndex, qaIndex, finalReviewIndex, releaseBaselineIndex, artbookEditorIndex, readyIndex})) {
    assert.ok(index >= 0, `missing ${name}`);
  }
  assert.ok(runtimeIndex < qaIndex);
  assert.ok(qaIndex < finalReviewIndex);
  assert.ok(finalReviewIndex < releaseBaselineIndex);
  assert.ok(releaseBaselineIndex < artbookEditorIndex);
  assert.ok(artbookEditorIndex < readyIndex);

  assert.match(runner, /finalDepartmentReviewEvidenceBound:true/);
  assert.match(runner, /finalArtbookOnlyAfterReleaseReady:true/);
  assert.match(runner, /departmentPageAuthorship:false/);
  assert.match(runner, /newClaimsAdded:false/);
});
