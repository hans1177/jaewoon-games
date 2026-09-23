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

test('creates direct Unity target-platform prototypes without requiring Web first',()=>{
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

test('Unity executor uses unbounded eligibility with capacity batching, canary and exact-stage resume sequence',()=>{
  assert.match(workflowSource,/selectTargetPlatformDevelopmentWindow/);
  assert.match(workflowSource,/selectRepresentativeCanary/);
  assert.match(workflowSource,/const batchMax=Math\.max\(1,Math\.min\(256,/);
  assert.match(workflowSource,/rows\.slice\(0,batchMax\)/);
  assert.match(workflowSource,/Math\.min\(batchMax,selected\.length\|\|1\)/);
  assert.match(workflowSource,/DEVELOPMENT_GAME_ELIGIBILITY_CAP=NONE/);
  assert.match(workflowSource,/REPRESENTATIVE_CANARY=/);
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
  assert.match(workflowSource,/LEGACY_RUNTIME_GATE_CONCLUSION=/);
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

test('Unity executor admits source-bind work so missing owner-focused native roots can use the existing bootstrap path',()=>{
  assert.match(workflowSource,/step==='TARGET_PLATFORM_SOURCE_BIND'\|\|step==='TARGET_PLATFORM_TECHNICAL_VALIDATION'/);
  assert.match(workflowSource,/project="unity-games\/\$GAME_ID"/);
  assert.match(workflowSource,/node tools\/company-development-unity-bootstrap\.mjs/);
  assert.match(workflowSource,/platformDevelopmentEligible\(item,'UNITY'\)/);
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
