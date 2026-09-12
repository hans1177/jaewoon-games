import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const generatorSource=process.env.UNITY_BOOTSTRAP_SOURCE||path.resolve('tools/company-development-unity-bootstrap.mjs');
const workflowSource=fs.readFileSync(path.resolve('.github/workflows/company-development-unity-runtime.yml'),'utf8');
const cloudBuildSource=fs.readFileSync(path.resolve('.github/workflows/unity-cloud-android-test.yml'),'utf8');
const runtimeWorkflowSource=fs.readFileSync(path.resolve('.github/workflows/unity-android-runtime-smoke.yml'),'utf8');
const independentQaSource=fs.readFileSync(path.resolve('.github/workflows/unity-android-independent-qa.yml'),'utf8');
const regressionSource=fs.readFileSync(path.resolve('.github/workflows/unity-android-regression.yml'),'utf8');
const runtimeSmokeSource=fs.readFileSync(path.resolve('tools/unity-apk-runtime-smoke.sh'),'utf8');
const expectedUnityEditorVersion='6000.6.0f1';

function runNode(args,{cwd=process.cwd(),env={}}={}){
  return spawnSync(process.execPath,args,{cwd,encoding:'utf8',env:{...process.env,...env}});
}

test('Unity bootstrap emits a complete Android project and canonical DEVELOPMENT_CONFIRMED technical seed',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'jaewoon-unity-bootstrap-'));
  const out=path.join(temp,'unity-games','seed-test');
  const baseline=path.join(temp,'baseline.md');
  fs.writeFileSync(baseline,'# baseline\n','utf8');
  const result=runNode([generatorSource,'--game-id=seed-test','--game-name=Seed Test',`--baseline=${baseline}`,`--output=${out}`]);
  assert.equal(result.status,0,`${result.stdout}\n${result.stderr}`);
  assert.equal(fs.existsSync(path.join(out,'ProjectSettings','ProjectVersion.txt')),true);
  assert.equal(fs.existsSync(path.join(out,'Packages','manifest.json')),true);
  assert.equal(fs.existsSync(path.join(out,'Assets','Editor','SeedAndroidBuild.cs')),true);
  assert.equal(fs.existsSync(path.join(out,'Assets','Scripts','SeedRuntime.cs')),true);
  assert.equal(fs.existsSync(path.join(out,'Assets','Scenes','Main.unity')),true);
  assert.match(fs.readFileSync(path.join(out,'ProjectSettings','ProjectVersion.txt'),'utf8'),new RegExp(`m_EditorVersion: ${expectedUnityEditorVersion.replaceAll('.','\\.')}`));
  const runtime=fs.readFileSync(path.join(out,'Assets','Scripts','SeedRuntime.cs'),'utf8');
  assert.match(runtime,/JAEWOON_TECH_BOOT/);
  assert.match(runtime,/JAEWOON_TECH_ACTION/);
  assert.match(runtime,/JAEWOON_TECH_SAVE/);
  assert.match(runtime,/JAEWOON_TECH_METRIC/);
  const build=fs.readFileSync(path.join(out,'Assets','Editor','SeedAndroidBuild.cs'),'utf8');
  assert.match(build,/AndroidArchitecture\.ARM64/);
  assert.match(build,/BuildPipeline\.BuildPlayer/);
});

test('Unity staged executor preserves selected-platform routing, immutable build identity, runtime, independent QA and regression stages',()=>{
  assert.match(workflowSource,/Company DEVELOPMENT_CONFIRMED Unity Runtime/);
  assert.match(workflowSource,/resolveSelectedPlatform/);
  assert.match(workflowSource,/selectRepresentativeCanary/);
  assert.match(workflowSource,/selectedPlatform:'UNITY'/);
  assert.match(workflowSource,/unity-cloud-android-test\.yml/);
  assert.match(workflowSource,/unity-android-runtime-smoke\.yml/);
  assert.match(workflowSource,/unity-android-independent-qa\.yml/);
  assert.match(workflowSource,/unity-android-regression\.yml/);
  assert.match(workflowSource,/sourceFingerprint/);
  assert.match(workflowSource,/apkSha256/);
  assert.match(workflowSource,/buildSourceCommit/);
  assert.match(workflowSource,/runtimePassed/);
  assert.match(workflowSource,/independentQaPassed/);
  assert.match(workflowSource,/regressionPassed/);
  assert.match(workflowSource,/failureStage/);
  assert.match(workflowSource,/failureSignature/);
});

test('Unity staged executor supports checkpoint resume without bypassing the canonical stage order',()=>{
  assert.match(workflowSource,/resumeStage/);
  assert.match(workflowSource,/reuse_build/);
  assert.match(workflowSource,/previous_runtime/);
  assert.match(workflowSource,/previous_qa/);
  assert.match(workflowSource,/previous_regression/);
  assert.match(workflowSource,/BUILD_ONCE_PER_SOURCE_FINGERPRINT=ENABLED/);
  assert.match(workflowSource,/RESUME_EXACT_FAILURE_POINT=ENABLED/);
  assert.match(workflowSource,/QUALITY_GATE_WEAKENING=NO/);
});

test('successful APK build is retained even when the legacy child runtime gate fails',()=>{
  assert.match(workflowSource,/select\(\.name=="build"\)/);
  assert.match(workflowSource,/select\(\.name=="android16-install-gate"\)/);
  assert.match(workflowSource,/build_passed=/);
  assert.match(workflowSource,/LEGACY_RUNTIME_GATE_CONCLUSION=/);
  assert.match(workflowSource,/gh run download "\$BUILD_RUN" -D \/tmp\/unity-build/);
  assert.doesNotMatch(workflowSource,/CLOUD_UNITY_BUILD_FAILED=/);
});

test('canonical Unity runtime QA and regression use native ARM64 Android 16 instead of x86_64 translation',()=>{
  assert.match(cloudBuildSource,/architectures': \['arm64-v8a'\]/);
  for(const source of [runtimeWorkflowSource, independentQaSource, regressionSource]){
    assert.match(source,/runs-on: ubuntu-24\.04-arm/);
    assert.match(source,/redroid\/redroid:16\.0\.0_64only-latest/);
    assert.match(source,/ro\.product\.cpu\.abilist/);
    assert.match(source,/arm64-v8a/);
    assert.doesNotMatch(source,/system-images;android-36;google_apis;x86_64/);
    assert.doesNotMatch(source,/swiftshader_indirect/);
  }
  assert.match(runtimeWorkflowSource,/unity-apk-runtime-smoke\.sh/);
  assert.match(regressionSource,/unity-apk-runtime-smoke\.sh/);
  assert.match(runtimeSmokeSource,/ANDROID_RUNTIME_ABI_MISMATCH/);
  assert.match(runtimeSmokeSource,/runtimeAbiCompatible/);
});

test('Unity executor fetches only required refs and migrates one historical source instead of all development refs',()=>{
  assert.doesNotMatch(workflowSource,/fetch-depth:\s*0/);
  assert.doesNotMatch(workflowSource,/refs\/heads\/development\/\*/);
  assert.match(workflowSource,/fetch-depth:\s*1/);
  assert.match(workflowSource,/fetch-tags:\s*false/);
  assert.match(workflowSource,/git\/matching-refs\/heads\/\$prefix/);
  assert.match(workflowSource,/UNITY_SOURCE_MIGRATION_BRANCH=/);
  assert.match(workflowSource,/unity-reuse/);
  assert.match(workflowSource,/unity-history/);
  assert.match(workflowSource,/CHANGE_DETECTION=UNCHANGED_SOURCE_REUSED/);
});

test('checkpoint persistence accepts the actual upload-artifact extraction root',()=>{
  assert.match(workflowSource,/runtime-persist\/queue/);
  assert.match(workflowSource,/qa-persist\/queue/);
  assert.match(workflowSource,/regression-persist\/queue/);
  assert.match(workflowSource,/CHECKPOINT_PERSIST=PASS/);
});

test('Unity queue and publication evidence remain source-bound rather than branch-head-bound',()=>{
  assert.match(workflowSource,/unitySourceCommit/);
  assert.match(workflowSource,/source_revision/);
  assert.match(workflowSource,/sourceRevision:/);
  assert.match(workflowSource,/exactSourceRevision/);
  assert.match(workflowSource,/executionEvidence:evidence/);
  assert.match(workflowSource,/resumeStage:failure\|\|'IMMEDIATE_NEXT_STAGE_DISPATCH'/);
});
