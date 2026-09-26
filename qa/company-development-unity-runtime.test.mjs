import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const generatorSource=process.env.UNITY_BOOTSTRAP_SOURCE||path.resolve('tools/company-development-unity-bootstrap.mjs');
const workflowSource=fs.readFileSync(path.resolve('.github/workflows/company-development-unity-runtime.yml'),'utf8');
const routerSource=fs.readFileSync(path.resolve('tools/company-selected-platform-router.mjs'),'utf8');
const cloudBuildSource=fs.readFileSync(path.resolve('.github/workflows/unity-cloud-android-test.yml'),'utf8');
const hybridWorkflowSource=fs.readFileSync(path.resolve('.github/workflows/unity-hybrid-android-build.yml'),'utf8');
const runtimeWorkflowSource=fs.readFileSync(path.resolve('.github/workflows/unity-android-runtime-smoke.yml'),'utf8');
const independentQaSource=fs.readFileSync(path.resolve('.github/workflows/unity-android-independent-qa.yml'),'utf8');
const regressionSource=fs.readFileSync(path.resolve('.github/workflows/unity-android-regression.yml'),'utf8');
const runtimeSmokeSource=fs.readFileSync(path.resolve('tools/unity-apk-runtime-smoke.sh'),'utf8');
const expectedUnityEditorVersion='6000.6.0f1';
const expectedUnityEditorRevision='f7f8ed4d1e24';
const cases=[
  ['seed-action-survival-rogu-echoes-of-the-lost-star','Echoes of the Lost Star','SURVIVAL'],
  ['seed-single-defense-strat-celestial-bastion','Celestial Bastion','DEFENSE'],
  ['seed-puzzle-chromatic-cascade','Chromatic Cascade','PUZZLE'],
  ['seed-casual-realm-weaver','Realm Weaver','CASUAL'],
  ['seed-idle-growth-rpg-crystal-bloom','Crystal Bloom','IDLE_RPG'],
  ['seed-story-complete-rpg-chronicles-of-eldoria','Chronicles of Eldoria','STORY_RPG'],
];
function fixtures(root, pass=true){
  const baseline=path.join(root,'baseline.json');
  const web=path.join(root,'web.json');
  fs.writeFileSync(baseline,JSON.stringify({content:{identity:'Distinct test identity',coreLoop:['act','feedback','choice','reward'],platformProfiles:{UNITY:{
    platform:'UNITY',
    inputModel:'Unity Input System touch-first controls with gamepad and keyboard fallback',
    sessionModel:'Unity Android app session lifecycle with local app state and restart behavior',
    multiplayerRuntime:'Unity native networking contract when multiplayer is required by game design',
    performanceBudget:'Android mobile frame memory thermal draw-call and battery budget',
    uiUx:'Unity UI touch-first layout with mobile safe areas and scalable controls',
    saveAndNetwork:'Unity app local persistence and validated networking boundaries when required',
    platformContentAdaptation:'Unity-native scenes prefabs materials animation camera audio and mobile UI',
    internalReleaseTarget:'Internal or closed Unity Android app test build for owner playtest',
    validationEvidence:'Exact APK install launch runtime independent QA and regression evidence'
  }}}}));
  fs.writeFileSync(web,JSON.stringify({gameId:'fixture',pass,validated:pass,state:pass?'PASS':'FAIL',realEvidenceExists:pass}));
  return {baseline,web};
}

test('creates Unity target-platform prototypes after admission without embedding WebGL into the native generator',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'jaewoon-unity-bootstrap-'));
  const {baseline}=fixtures(root,true);
  for(const [id,name,mode] of cases){
    const sandbox=path.join(root,'sandbox-'+mode);
    fs.mkdirSync(path.join(sandbox,'tools'),{recursive:true});
    fs.copyFileSync(generatorSource,path.join(sandbox,'tools/company-development-unity-bootstrap.mjs'));
    const run=spawnSync(process.execPath,['tools/company-development-unity-bootstrap.mjs',`--game-id=${id}`,`--game-name=${name}`,`--baseline=${baseline}`,`--output=unity-games/${id}`],{cwd:sandbox,encoding:'utf8'});
    assert.equal(run.status,0,run.stderr||run.stdout);
    const project=path.join(sandbox,'unity-games',id);
    const meta=JSON.parse(fs.readFileSync(path.join(project,'prototype-source.json'),'utf8'));
    const manifest=JSON.parse(fs.readFileSync(path.join(project,'Packages','manifest.json'),'utf8'));
    const projectVersion=fs.readFileSync(path.join(project,'ProjectSettings','ProjectVersion.txt'),'utf8');
    const buildScript=fs.readFileSync(path.join(project,'Assets','Editor','SeedAndroidBuild.cs'),'utf8');
    const runtimeScript=fs.readFileSync(path.join(project,'Assets','Scripts','SeedTechnicalPrototype.cs'),'utf8');
    const linkerConfig=fs.readFileSync(path.join(project,'Assets','link.xml'),'utf8');
    assert.equal(meta.version,3);
    assert.equal(meta.category,mode);
    assert.equal(meta.selectedPlatform,'UNITY');
    assert.equal(meta.nativeAppOnly,true);
    assert.equal(meta.unityWebEnabled,false);
    assert.equal(meta.platformDesignProfile.platform,'UNITY');
    assert.equal(meta.releaseAuthority,false);
    assert.equal(meta.buildUpDirectiveConsumed,false);
    assert.equal(meta.buildUpDirectiveCompletionClaim,false);
    assert.equal(meta.buildUpDirectiveId,null);
    assert.equal(meta.purpose,'TARGET_PLATFORM_TECHNICAL_VALIDATION');
    assert.equal(meta.unityEditorVersion,expectedUnityEditorVersion);
    assert.equal(meta.unityEditorRevision,expectedUnityEditorRevision);
    assert.match(meta.generatorFingerprint,/^[0-9a-f]{64}$/);
    assert.equal(meta.androidGraphicsCompatibilityProfile,'OPEN_GLES3_ES30_MINIMUM');
    assert.equal(manifest.dependencies['com.unity.modules.imgui'],'1.0.0');
    assert.match(buildScript,/SeedAndroidBuild/);
    assert.match(buildScript,/targetArchitectures = AndroidArchitecture\.ARM64;/);
    assert.doesNotMatch(buildScript,/AndroidArchitecture\.X86_64/);
    assert.match(buildScript,/SetUseDefaultGraphicsAPIs\(BuildTarget\.Android, false\)/);
    assert.match(buildScript,/SetGraphicsAPIs\(BuildTarget\.Android, new\[\] \{ GraphicsDeviceType\.OpenGLES3 \}\)/);
    assert.match(buildScript,/openGLRequireES31 = false/);
    assert.match(buildScript,/openGLRequireES31AEP = false/);
    assert.match(buildScript,/openGLRequireES32 = false/);
    assert.match(buildScript,/GetComponent<SeedTechnicalPrototype>\(\)/);
    assert.match(buildScript,/AddComponent<SeedTechnicalPrototype>\(\)/);
    assert.match(runtimeScript,/JAEWOON_TECH_BOOT/);
    assert.match(runtimeScript,/JAEWOON_TECH_ACTION/);
    assert.match(runtimeScript,/JAEWOON_TECH_SAVE/);
    assert.match(runtimeScript,/JAEWOON_TECH_METRIC/);
    assert.match(linkerConfig,/<assembly fullname="UnityEngine\.ContentLoadModule">/);
    assert.match(linkerConfig,/<type fullname="Unity\.Loading\.ContentLoadingSystem" preserve="all"\s*\/>/);
    assert.equal(projectVersion.trim(),`m_EditorVersion: ${expectedUnityEditorVersion}\nm_EditorVersionWithRevision: ${expectedUnityEditorVersion} (${expectedUnityEditorRevision})`);
  }
});

test('Unity native generator ignores legacy Web evidence and emits no WebGL path',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'jaewoon-unity-native-only-'));
  const sandbox=path.join(root,'sandbox');
  fs.mkdirSync(path.join(sandbox,'tools'),{recursive:true});
  fs.copyFileSync(generatorSource,path.join(sandbox,'tools/company-development-unity-bootstrap.mjs'));
  const {baseline}=fixtures(root,false);
  const run=spawnSync(process.execPath,['tools/company-development-unity-bootstrap.mjs','--game-id=seed-puzzle-chromatic-cascade','--game-name=Chromatic Cascade',`--baseline=${baseline}`],{cwd:sandbox,encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  const project=path.join(sandbox,'unity-games','seed-puzzle-chromatic-cascade');
  const build=fs.readFileSync(path.join(project,'Assets/Editor/SeedAndroidBuild.cs'),'utf8');
  const meta=JSON.parse(fs.readFileSync(path.join(project,'prototype-source.json'),'utf8'));
  assert.doesNotMatch(build,/BuildWeb|BuildTarget\.WebGL|WebGL/);
  assert.equal(meta.nativeAppOnly,true);
  assert.equal(meta.unityWebEnabled,false);
});

test('Unity native executor starts from minimum design without waiting for Unity Web',()=>{
  assert.doesNotMatch(workflowSource,/classifyUpperPlatformAdmission/);
  assert.doesNotMatch(workflowSource,/UNITY_NATIVE_ADMISSION_BLOCKED=/);
  assert.match(workflowSource,/UNITY_PARALLEL_ADMISSION=/);
  assert.match(workflowSource,/UNITY_WEB_PARALLEL_LANE=NATIVE_DEVELOPMENT_DOES_NOT_WAIT_FOR_WEB/);
});

test('Unity executor keeps all eligible game ids parallel while canary is observation-only',()=>{
  assert.match(workflowSource,/selectTargetPlatformDevelopmentWindow/);
  assert.match(workflowSource,/selectRepresentativeCanary/);
  assert.match(workflowSource,/const batchMax=Math\.max\(1,Math\.min\(256,/);
  assert.match(workflowSource,/rows\.slice\(0,batchMax\)/);
  assert.match(workflowSource,/Math\.min\(batchMax,selected\.length\|\|1\)/);
  assert.match(workflowSource,/DEVELOPMENT_GAME_ELIGIBILITY_CAP=NONE/);
  assert.match(workflowSource,/REPRESENTATIVE_CANARY=/);
  assert.match(workflowSource,/REPRESENTATIVE_CANARY_MODE=PARALLEL_OBSERVATION_ONLY/);
  assert.match(workflowSource,/CANARY_SERIALIZES_GAME_ID_WAVE=NO/);
  assert.doesNotMatch(workflowSource,/canary\?\[canary\]:rows\.slice\(0,batchMax\)/);
  assert.match(workflowSource,/COMMON_FAILURE_DETECTED=/);
  assert.match(workflowSource,/CHANGE_DETECTION=/);
  assert.match(workflowSource,/GENERATOR_FINGERPRINT_MISMATCH/);
  assert.match(workflowSource,/prototype-source\.json/);
  assert.match(workflowSource,/generatorFingerprint/);
  assert.match(workflowSource,/CHEAP_PRECHECK=/);
  assert.match(workflowSource,/SOURCE_FINGERPRINT=/);
  assert.match(workflowSource,/BUILD_REUSE=/);
  assert.match(workflowSource,/SINGLE_BUILD_OR_PACKAGE=REUSED/);
  assert.match(workflowSource,/IMMUTABLE_ARTIFACT_BIND=PASS/);
  assert.match(workflowSource,/TARGET_PLATFORM_RUNTIME=/);
  assert.match(workflowSource,/INDEPENDENT_QA=/);
  assert.match(workflowSource,/REGRESSION=/);
  assert.match(workflowSource,/unity-android-runtime-smoke\.yml/);
  assert.match(workflowSource,/unity-android-independent-qa\.yml/);
  assert.match(workflowSource,/unity-android-regression\.yml/);
  assert.match(workflowSource,/executionEvidence:evidence/);
  assert.match(workflowSource,/unityInternalReleaseReady:internalReady/);
  assert.match(workflowSource,/distribution:'INTERNAL_OR_CLOSED_APP_TEST_BUILD'/);
  assert.match(workflowSource,/unityPublicRelease:false/);
  assert.match(workflowSource,/currentStep:internalReady\?'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG'/);
  assert.match(workflowSource,/resumeStage:failure\|\|\(internalReady\?'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG':'IMMEDIATE_NEXT_STAGE_DISPATCH'\)/);
  assert.match(workflowSource,/BUILD_ONCE_PER_SOURCE_FINGERPRINT=ENABLED/);
  assert.match(workflowSource,/RESUME_EXACT_FAILURE_POINT=ENABLED/);
  assert.match(workflowSource,/QUALITY_GATE_WEAKENING=NO/);
});

test('successful APK build is retained even when the legacy child runtime gate fails',()=>{
  assert.match(workflowSource,/select\(\.name=="build"\)/);
  assert.match(workflowSource,/select\(\.name=="android16-install-gate"\)/);
  assert.match(workflowSource,/build_passed=/);
  assert.match(workflowSource,/LEGACY_RUNTIME_JOB_CONCLUSION=/);
  assert.match(workflowSource,/LEGACY_RUNTIME_VERIFY_CONCLUSION=/);
  assert.match(workflowSource,/gh run download "\$BUILD_RUN" -D \/tmp\/unity-build/);
  assert.doesNotMatch(workflowSource,/CLOUD_UNITY_BUILD_FAILED=/);
});

test('canonical Unity runtime QA and regression use native ARM64 Android 16 instead of x86_64 translation',()=>{
  assert.match(cloudBuildSource,/architectures': \['arm64-v8a'\]/);
  for(const source of [runtimeWorkflowSource, independentQaSource, regressionSource]){
    assert.match(source,/runs-on: ubuntu-24\.04-arm/);
    assert.match(source,/ANDROID_SERIAL: 127\.0\.0\.1:5555/);
    assert.match(source,/redroid\/redroid:16\.0\.0_64only-latest/);
    assert.match(source,/redroid_modules_sha='86f0a99f00388122aa2fdfaddf5fd507c58aac66'/);
    assert.match(source,/redroid-ashmem-617\.patch/);
    assert.match(source,/ashmem_linux\.ko/);
    assert.match(source,/--device \/dev\/ashmem:\/dev\/ashmem/);
    assert.doesNotMatch(source,/androidboot\.use_memfd=true/);
    assert.match(source,/ro\.product\.cpu\.abilist/);
    assert.match(source,/arm64-v8a/);
    assert.doesNotMatch(source,/system-images;android-36;google_apis;x86_64/);
    assert.doesNotMatch(source,/swiftshader_indirect/);
  }
  assert.match(runtimeWorkflowSource,/unity-apk-runtime-smoke\.sh/);
  assert.doesNotMatch(runtimeWorkflowSource,/binder_devices=\(\)/);
  assert.doesNotMatch(runtimeWorkflowSource,/\$\{binder_devices\[@\]\}/);
  assert.match(runtimeWorkflowSource,/UNITY_ANDROID_ASHMEM_6_17_COMPAT=READY/);
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
  assert.match(workflowSource,/development-unity-runtime\/queue/);
  assert.match(workflowSource,/CHECKPOINT_ROOT/);
  assert.match(workflowSource,/checkpoint queue directory missing after artifact extraction/);
});

test('Unity executor accepts exact game dispatch from the shared native orchestrator',()=>{
  assert.match(workflowSource,/workflow_dispatch:\s*\n\s*inputs:\s*\n\s*game_id:/);
  assert.match(workflowSource,/REQUESTED_GAME_ID: \$\{\{ inputs\.game_id \|\| '' \}\}/);
  assert.match(workflowSource,/requested_ids="\$REQUESTED_GAME_ID"/);
  assert.match(workflowSource,/UNITY_REQUESTED_GAME_ID_INVALID=/);
  assert.match(workflowSource,/requestedRows=requestedIds\.length\?rows\.filter\(row=>requestedSet\.has\(row\.gameId\)\):\[\]/);
  assert.match(workflowSource,/UNITY_REQUESTED_GAME_IDS=/);
});

test('Unity platform executor remains event-driven with no periodic schedule of its own',()=>{
  assert.doesNotMatch(workflowSource,/^\s*schedule:/m);
  assert.doesNotMatch(workflowSource,/cron:/);
  assert.match(workflowSource,/push:/);
  assert.match(workflowSource,/workflow_dispatch:/);
  assert.match(workflowSource,/company-development-unity-runtime/);
});

test('runtime smoke never sends gameplay input before the generated seed runtime is ready',()=>{
  assert.match(runtimeSmokeSource,/runtime_ready_timeout=false/);
  assert.match(runtimeSmokeSource,/gameplay_input_delivered=false/);
  assert.match(runtimeSmokeSource,/DEVELOPMENT_SEED_BOOT_TIMEOUT/);
  const readyGate=runtimeSmokeSource.indexOf('if [[ "$boot_observed" == "true" || "$seed_technical" != "true" ]]');
  const firstTap=runtimeSmokeSource.indexOf('adb shell input tap "$center_x" "$primary_y"');
  assert.ok(readyGate>=0,'runtime-ready input gate missing');
  assert.ok(firstTap>readyGate,'gameplay input must be gated behind runtime-ready evidence');
});

test('runtime smoke launches the exact APK activity and fails fast on missing or exited process',()=>{
  assert.match(runtimeSmokeSource,/launchable-activity: name=/);
  assert.match(runtimeSmokeSource,/adb shell am start -W -n "\$launch_component"/);
  assert.doesNotMatch(runtimeSmokeSource,/adb shell monkey/);
  assert.match(runtimeSmokeSource,/process_observed_after_launch=false/);
  assert.match(runtimeSmokeSource,/launch_process_missing=true/);
  assert.match(runtimeSmokeSource,/process_exited_before_runtime_ready=true/);
  assert.match(runtimeSmokeSource,/APK_LAUNCH_PROCESS_MISSING/);
  assert.match(runtimeSmokeSource,/APK_PROCESS_EXITED_BEFORE_RUNTIME_READY/);
  assert.match(runtimeSmokeSource,/JAEWOON_TECH_BOOT/);
  assert.match(runtimeSmokeSource,/JAEWOON_TECH_ACTION/);
  assert.match(runtimeSmokeSource,/JAEWOON_TECH_SAVE/);
  assert.match(runtimeSmokeSource,/JAEWOON_TECH_METRIC/);
});

test('exact artifact regression binds upstream APK SHA and source revision',()=>{
  assert.match(regressionSource,/Download exact upstream build artifact/);
  assert.match(regressionSource,/actual.*expected/s);
  assert.match(regressionSource,/SOURCE_REVISION/);
  assert.match(regressionSource,/unity-apk-runtime-smoke\.sh/);
  assert.match(regressionSource,/regressionPassed.*True/s);
  assert.match(regressionSource,/exactArtifactRegression.*True/s);
});

test('Unity validation preserves an existing current-main project and only creates a technical request',()=>{
  assert.match(workflowSource,/direct_request="\.build-requests\/unity\/\$\{GAME_ID\}\.json"/);
  assert.match(workflowSource,/UNITY_EXISTING_SOURCE_BUILD_REQUEST_MISSING/);
  assert.match(workflowSource,/buildMethod:String\(direct\.buildMethod\)\.trim\(\)/);
  assert.match(workflowSource,/applicationId=String\(direct\.applicationId\|\|''\)\.trim\(\)/);
  assert.match(workflowSource,/CHANGE_DETECTION=CURRENT_MAIN_SOURCE_REUSED/);
  const preserve=workflowSource.indexOf('direct_request=".build-requests/unity/${GAME_ID}.json"');
  const bootstrap=workflowSource.indexOf('node tools/company-development-unity-bootstrap.mjs');
  assert.ok(preserve>0&&bootstrap>preserve,'existing current-main source must be considered before bootstrap');
});


test('Unity executor admits source-bind work through the shared platform router and existing bootstrap path',()=>{
  assert.match(routerSource,/TARGET_PLATFORM_SOURCE_BIND/);
  assert.match(routerSource,/TARGET_PLATFORM_TECHNICAL_VALIDATION/);
  assert.match(workflowSource,/project="unity-games\/\$GAME_ID"/);
  assert.match(workflowSource,/node tools\/company-development-unity-bootstrap\.mjs/);
  assert.match(workflowSource,/platformDevelopmentEligible\(item,'UNITY'\)/);
});


test('Unity parent accepts only actual runtime verification and avoids duplicate fresh-build smoke dispatch',()=>{
  assert.match(workflowSource,/select\(\.name=="Install and launch exact APK on matching ARM64 runtime"\)\|\.conclusion/);
  assert.match(workflowSource,/runtime_passed=.*legacy_verify.*success/);
  assert.match(workflowSource,/LEGACY_RUNTIME_VERIFY_CONCLUSION=\$legacy_verify/);
  assert.match(workflowSource,/if: steps\.buildstate\.outputs\.build_passed == 'true' && steps\.buildstate\.outputs\.runtime_passed != 'true'/);
  assert.doesNotMatch(workflowSource,/runtime_passed != 'true' && steps\.plan\.outputs\.reuse_build == 'true'/);
  assert.match(workflowSource,/REUSE: \$\{\{ steps\.plan\.outputs\.reuse_build \}\}/);
  assert.match(workflowSource,/runs\?event=workflow_run&per_page=50/);
  assert.match(workflowSource,/UNITY_RUNTIME_SMOKE_REUSED_AUTO=/);
  assert.match(workflowSource,/UNITY_RUNTIME_SMOKE_DISPATCHED_MANUAL=/);
  const reuseAuto=workflowSource.indexOf('UNITY_RUNTIME_SMOKE_REUSED_AUTO=');
  const manualDispatch=workflowSource.indexOf('jq -n --arg ref main --arg run "$BUILD_RUN"');
  assert.ok(reuseAuto>0&&manualDispatch>reuseAuto,'fresh build must reuse the auto runtime smoke before any manual fallback dispatch');
});


test('legacy Genymotion runtime gate cannot block canonical Redroid validation when credentials are absent',()=>{
  assert.match(cloudBuildSource,/Resolve legacy Genymotion gate availability/);
  assert.match(cloudBuildSource,/LEGACY_GENYMOTION_GATE=SKIPPED_CREDENTIALS_UNAVAILABLE/);
  assert.match(cloudBuildSource,/CANONICAL_ANDROID_RUNTIME_GATE=UNITY_ANDROID_RUNTIME_SMOKE_REDROID/);
  assert.match(cloudBuildSource,/outputs:[\s\S]*verified:\s*\$\{\{ steps\.verify\.outputs\.verified \}\}/);
  assert.match(cloudBuildSource,/if:\s*steps\.legacy\.outputs\.enabled == 'true'[\s\S]*Prepare matching ARM64 Android 16 cloud runtime/);
  assert.match(cloudBuildSource,/id:\s*verify[\s\S]*verified=true/);
  assert.match(cloudBuildSource,/publish:[\s\S]*needs\.android16-install-gate\.outputs\.verified == 'true'/);
  assert.match(runtimeWorkflowSource,/workflow_run:[\s\S]*workflows: \["Unity Hybrid Android Build"\]/);
  assert.match(runtimeWorkflowSource,/runs-on: ubuntu-24\.04-arm/);
  assert.match(runtimeWorkflowSource,/redroid\/redroid:16\.0\.0_64only-latest/);
});


test('Unity cloud APK build keeps LFS but avoids full Git history',()=>{
  assert.match(cloudBuildSource,/name: Checkout[\s\S]*fetch-depth:\s*1[\s\S]*fetch-tags:\s*false[\s\S]*lfs:\s*true/);
  assert.doesNotMatch(cloudBuildSource,/fetch-depth:\s*0/);
});


test('independent Unity QA launches exact APK activity without monkey',()=>{
  assert.match(independentQaSource,/launchable-activity: name=/);
  assert.match(independentQaSource,/launch_component="\$package\/\$activity"/);
  assert.match(independentQaSource,/adb shell am start -W -n "\$launch_component"/);
  assert.doesNotMatch(independentQaSource,/adb shell monkey/);
});


test('independent Unity QA ignores unrelated Redroid system crashes and scopes fatal scan to the tested app',()=>{
  assert.match(independentQaSource,/awk -v pid="\$pid_after" '\$3==pid \{print\}'/);
  assert.match(independentQaSource,/app-logcat\.txt/);
  assert.match(independentQaSource,/grep -Eiq 'FATAL EXCEPTION\|Fatal signal' qa-artifacts\/unity-independent-qa\/app-logcat\.txt/);
  assert.match(independentQaSource,/ANR in \$\{package\}\|Process \$\{package\} .* has died/);
  assert.doesNotMatch(independentQaSource,/FATAL EXCEPTION\|ANR in \$\{package\}\|Fatal signal\|Process/);
});


test('Unity canonical runtime starts from native source and tracked build requests',()=>{
  assert.match(workflowSource,/push:[\s\S]*'\.build-requests\/unity\/\*\*'/);
  assert.match(workflowSource,/push:[\s\S]*'unity-games\/\*\*'/);
  assert.match(workflowSource,/RUNTIME_THEN_INDEPENDENT_QA_THEN_REGRESSION=ENABLED/);
});


test('Unity runtime has no retired validation-cycle dependency',()=>{
  assert.doesNotMatch(workflowSource,/company-development-validation-cycle\.mjs/);
  assert.doesNotMatch(workflowSource,/cycle-status\.json/);
  assert.doesNotMatch(workflowSource,/steps\.meeting\.outputs\.state/);
  assert.match(workflowSource,/Revalidate shared worker context before Unity checkpoint/);
  assert.match(workflowSource,/const canonical=process\.env\.MEETING_STATE\|\|'WAITING_TARGET_PLATFORM_VALIDATION'/);
});


test('independent Unity QA dispatches exact artifact regression after PASS',()=>{
  assert.match(independentQaSource,/permissions:[\s\S]*actions:\s*write/);
  assert.match(independentQaSource,/name: Dispatch exact artifact regression/);
  assert.match(independentQaSource,/gh workflow run unity-android-regression\.yml/);
  assert.match(independentQaSource,/-f run_id="\$\{\{ steps\.upstream\.outputs\.run_id \}\}"/);
  assert.match(independentQaSource,/UNITY_ANDROID_REGRESSION_DISPATCHED=/);
});


test('Unity hybrid Android builds are not globally serialized by internal policy',()=>{
  assert.doesNotMatch(hybridWorkflowSource,/^concurrency:\s*\n\s*group:\s*unity-hybrid-android-build\s*$/m);
});


test('Unity hybrid router avoids full repository history and fetches only the event before commit when needed',()=>{
  assert.match(hybridWorkflowSource,/name: Checkout[\s\S]*fetch-depth:\s*1[\s\S]*fetch-tags:\s*false/);
  assert.doesNotMatch(hybridWorkflowSource,/fetch-depth:\s*0/);
  assert.match(hybridWorkflowSource,/git fetch --no-tags --depth=1 origin "\$before"/);
});


test('distinct Unity runtime runs are not globally serialized while runtime persistence stays serialized',()=>{
  assert.doesNotMatch(workflowSource,/^concurrency:\s*\n\s*group:\s*company-development-unity-runtime\s*$/m);
  assert.match(workflowSource,/persist-runtime:[\s\S]*concurrency:[\s\S]*group: company-runtime-writer/);
});


test('Unity runtime does not reapply shared cross-platform step filtering after platform eligibility',()=>{
  assert.match(workflowSource,/return platformDevelopmentEligible\(item,'UNITY'\);/);
  assert.doesNotMatch(workflowSource,/const step=String\(item\.currentStep\|\|''\)\.toUpperCase\(\);[\s\S]*WAITING_UNITY_REVALIDATION/);
});


test('Unity direct changes and full waves never serialize behind representative canary selection',()=>{
  assert.match(workflowSource,/REQUESTED_GAME_IDS/);
  assert.match(workflowSource,/test\("\^\\\\\.build-requests\/unity\/\[\^\/\]\+\\\\\.json\$"\)/);
  assert.match(workflowSource,/test\("\^unity-games\/\[\^\/\]\+\/"\)/);
  assert.match(workflowSource,/gh api "repos\/\$GITHUB_REPOSITORY\/commits\/\$GITHUB_SHA"/);
  assert.match(workflowSource,/const requestedRows=requestedIds\.length\?rows\.filter/);
  assert.match(workflowSource,/const canary=requestedRows\.length\?null:/);
  assert.match(workflowSource,/const selected=requestedRows\.length\?requestedRows\.slice\(0,batchMax\):rows\.slice\(0,batchMax\)/);
  assert.match(workflowSource,/canary_game_id=/);
  assert.match(workflowSource,/matrix\.item\.gameId == needs\.prepare\.outputs\.canary_game_id/);
});
