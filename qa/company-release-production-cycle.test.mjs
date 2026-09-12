import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(repoRoot, relative), 'utf8');
const flow = read('COMPANY_FLOW.md');
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

function centralReleaseFlow(text) {
  const start = text.indexOf('\n  RELEASE_CONFIRMED:\n    executionMode: GATED_DIRECT_RELEASE_PRODUCTION');
  assert.ok(start >= 0, 'COMPANY_FLOW: selected-platform RELEASE_CONFIRMED flow missing');
  const end = text.indexOf('\npromotion:', start);
  assert.ok(end > start, 'COMPANY_FLOW: RELEASE_CONFIRMED flow boundary missing');
  return text.slice(start, end);
}

test('central RELEASE_CONFIRMED policy keeps the selected-platform gated direct release order', () => {
  const releaseFlow = centralReleaseFlow(flow);
  assertOrdered(releaseFlow, [
    'RELEASE_CONFIRMED:',
    'executionMode: GATED_DIRECT_RELEASE_PRODUCTION',
    'target: PROJECT_SELECTED_PLATFORM',
    '- LOAD_DEVELOPMENT_BASELINE',
    '- LOAD_CANONICAL_WEB_GAME',
    '- CORE_DESIGN_LOCK',
    '- VIBE2_PRIMARY_DEVELOPMENT',
    '- BIND_CURRENT_TARGET_PLATFORM_SOURCE_TREE',
    '- TARGET_PLATFORM_BUILD_OR_PACKAGE',
    '- SEVEN_DISTINCT_LEAD_BUILD_PREFLIGHT',
    '- TARGET_PLATFORM_RUNTIME_VALIDATION',
    '- INDEPENDENT_QA_AND_REGRESSION',
    '- SEVEN_DISTINCT_LEAD_FINAL_RELEASE_REVIEW',
    '- VIBE2_FIX_AND_REBUILD_LOOP_IF_REQUIRED',
    '- RELEASE_GATE',
    '- RELEASE_BASELINE',
    '- ARTBOOK_EDITOR_FINAL_REVISION',
  ], 'COMPANY_FLOW RELEASE_CONFIRMED');

  for (const token of [
    'targetPlatformProjectRequired: true',
    'sourceTreeBindingRequired: true',
    'currentBuildEvidenceBindingRequired: true',
    'buildPreflightIsNotFinalApproval: true',
    'finalReviewMustReadSameCurrentBuildRuntimeQaEvidence: true',
    'independentQaSeparatedFromVibe2SelfCheck: true',
    'sourceChangeInvalidatesOldBuildValidation: true',
    'musicAndIntroReviewNonBlockingForRelease: true',
    'aiMayInventBuildPass: false',
    'aiMayInventDeviceValidationPass: false',
    'aiMayInventIndependentQaPass: false',
  ]) assert.ok(releaseFlow.includes(token), `central release contract missing: ${token}`);
});

test('release runner executes seven reviews and counts blockers only from five core departments', () => {
  assert.match(runner, /COMPANY_DEPARTMENT_ROLES/);
  assert.match(runner, /COMPANY_BLOCKING_DEPARTMENT_ROLES/);
  assert.match(runner, /COMPANY_ADVISORY_DEPARTMENT_ROLES/);
  assert.match(runner, /const ROLES=\[\.\.\.COMPANY_DEPARTMENT_ROLES\]/);
  assert.match(runner, /const BLOCKING_ROLES=\[\.\.\.COMPANY_BLOCKING_DEPARTMENT_ROLES\]/);
  assert.match(runner, /const ADVISORY_ROLES=\[\.\.\.COMPANY_ADVISORY_DEPARTMENT_ROLES\]/);
  assert.match(runner, /if\(blockingForProgression\)releaseBlockerCount\+=representative\.blockers\.length/);
  assert.match(runner, /advisoryDepartmentFailureBlocksRelease:false/);
  assert.doesNotMatch(runner, /const ROLES=\['planning','graphics','development','qa','balance'\]/);
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

test('release baseline and final artbook are reachable only after current-build evidence and blocking review', () => {
  const runtimeIndex = runner.indexOf("latestFile('android-runtime-validation.json')");
  const qaIndex = runner.indexOf("latestFile('independent-release-qa.json')");
  const finalReviewIndex = runner.indexOf("phase:'FINAL_RELEASE_REVIEW'");
  const releaseBaselineIndex = runner.indexOf("const releaseBaselinePath=path.join(base,'release-baseline.json')");
  const artbookEditorIndex = runner.indexOf("release-artbook-editor");
  const readyIndex = runner.indexOf("writeState('RELEASE_READY'");
  for (const [name, index] of Object.entries({runtimeIndex, qaIndex, finalReviewIndex, releaseBaselineIndex, artbookEditorIndex, readyIndex})) assert.ok(index >= 0, `missing ${name}`);
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
