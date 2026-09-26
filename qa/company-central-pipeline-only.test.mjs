// 파일명: qa/company-central-pipeline-only.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(repoRoot,relative),'utf8');
const exists=relative=>fs.existsSync(path.join(repoRoot,relative));

const centralWorkflows=[
  '.github/workflows/company-seed-design-runtime.yml',
  '.github/workflows/company-design-promotion-sync.yml',
  '.github/workflows/company-development-confirmed-runtime.yml',
  '.github/workflows/company-development-roblox-runtime.yml',
  '.github/workflows/company-development-unity-runtime.yml',
];

test('platform-release-roadmap is the only production machine policy with authority',()=>{
  assert.equal(exists('AUTONOMOUS_DEVELOPMENT_POLICY.md'),false);
  assert.equal(exists('AGENTS.md'),false);
  const directive=JSON.parse(read('company-directive.json'));
  const roadmap=JSON.parse(read('company-learning/platform-release-roadmap.json'));
  assert.equal(directive.policyDocument,'company-learning/platform-release-roadmap.json');
  assert.equal(directive.machineSourceOfTruth,'company-learning/platform-release-roadmap.json');
  assert.equal(roadmap.policySource,'company-learning/platform-release-roadmap.json');
  assert.equal(roadmap.authority,'MACHINE_EXECUTION_CONTRACT');
  assert.equal(roadmap.humanDocumentRequired,false);
  assert.equal(Object.hasOwn(roadmap,'legacyPolicyMirror'),false);
  assert.equal(roadmap.centralDocumentation.canonicalSet.policy,'company-learning/platform-release-roadmap.json');
});
test('legacy autonomous top-level workflow namespace is removed',()=>{
  const files=fs.readdirSync(path.join(repoRoot,'.github/workflows'));
  const legacy=files.filter(name=>/^autonomous-.*\.ya?ml$/i.test(name));
  assert.deepEqual(legacy,[]);
});

test('central production runtime gates new Roblox and Unity work on Unity Web readiness',()=>{
  for(const file of centralWorkflows)assert.equal(exists(file),true,file+' must exist');
  const roadmap=JSON.parse(read('company-learning/platform-release-roadmap.json'));
  const development=read('.github/workflows/company-development-confirmed-runtime.yml');
  const admission=read('tools/company-upper-platform-admission.mjs');
  const roblox=read('.github/workflows/company-development-roblox-runtime.yml');
  const unity=read('.github/workflows/company-development-unity-runtime.yml');
  const direct=roadmap.directNativeDualPlatformDevelopment;
  assert.equal(direct.status,'OWNER_DIRECT_LOCKED');
  assert.equal(direct.mode,'ROBLOX_UNITY_APP_BIDIRECTIONAL_AUTO_PAIR');
  assert.deepEqual(direct.supportedDevelopmentPlatforms,['ROBLOX','UNITY']);
  assert.equal(direct.webDevelopmentStageRemoved,false);
  assert.equal(direct.unityWebEnabled,true);
  assert.equal(direct.unityWebRequired,true);
  assert.equal(direct.unityWebGateRequired,true);
  assert.equal(direct.unityWebMode,'UPPER_PLATFORM_PREDEVELOPMENT_FULL_DEVELOPMENT_QA_FLOOR');
  assert.equal(direct.minimumDesignRequired,true);
  assert.equal(direct.platformSpecificRuntimeEvidenceRequired,true);
  assert.equal(direct.platformSpecificIndependentQaRequired,true);
  assert.equal(direct.platformSpecificRegressionRequired,true);
  assert.equal(direct.fortniteUefnState,'OWNER_HOLD');
  assert.match(development,/company-minimum-design-contract\.mjs/);
  assert.match(development,/company-selected-platform-router\.mjs/);
  assert.match(development,/UPPER_PLATFORM_MACHINE_CONTRACT=PASS/);
  assert.match(development,/eligible_json:/);
  assert.match(development,/unity_web_json:/);
  assert.match(development,/uses: \.\/\.github\/workflows\/company-development-roblox-runtime\.yml/);
  assert.match(development,/uses: \.\/\.github\/workflows\/company-development-unity-runtime\.yml/);
  assert.match(development,/uses: \.\/\.github\/workflows\/unity-web-first-stage-build\.yml/);
  assert.match(development,/uses: \.\/\.github\/workflows\/unity-web-floor-source-bootstrap\.yml/);
  assert.doesNotMatch(development,/gh workflow run (?:company-development|unity-web)/);
  assert.match(admission,/upper-platform-development-readiness\.json/);
  assert.match(admission,/READINESS_SOURCE_STALE/);
  assert.doesNotMatch(development,/company-development-web-bootstrap\.mjs/);
  assert.doesNotMatch(development,/company-development-web-gameplay-validation\.mjs/);
  assert.match(roblox,/company-development-roblox-bootstrap\.mjs/);
  assert.match(roblox,/ROBLOX_RUNTIME_PASS=NO/);
  assert.match(roblox,/ROBLOX_RELEASE_CLAIM=NO/);
  assert.match(unity,/DEVELOPMENT_GAME_ELIGIBILITY_CAP=NONE/);
  assert.match(unity,/selectTargetPlatformDevelopmentWindow/);
  assert.match(unity,/selectRepresentativeCanary/);
  assert.match(unity,/company-development-unity-bootstrap\.mjs/);
  assert.match(unity,/company-development-unity-evidence\.mjs/);
  assert.match(unity,/unity-cloud-android-test\.yml/);
  assert.match(unity,/unity-android-runtime-smoke\.yml/);
  assert.match(unity,/unity-android-independent-qa\.yml/);
  assert.match(unity,/unity-android-regression\.yml/);
  assert.match(unity,/BUILD_ONCE_PER_SOURCE_FINGERPRINT=ENABLED/);
  assert.match(unity,/IMMUTABLE_ARTIFACT_REUSE=ENABLED/);
  assert.match(unity,/RESUME_EXACT_FAILURE_POINT=ENABLED/);
  assert.match(unity,/QUALITY_GATE_WEAKENING=NO/);
});
test('director recovery can only restart the central DEVELOPMENT_CONFIRMED runtime',()=>{
  const director=read('.github/workflows/director-supervisor.yml');
  assert.match(director,/Company DEVELOPMENT_CONFIRMED Runtime/);
  assert.match(director,/company-development-confirmed-runtime\.yml/);
  assert.doesNotMatch(director,/Autonomous Continuous Development/);
  assert.doesNotMatch(director,/autonomous-continuous-development\.yml/);
  assert.doesNotMatch(director,/tools\/autonomous-/);
});

test('technical release implementation remains subordinate to central evidence gates',()=>{
  const roadmap=JSON.parse(read('company-learning/platform-release-roadmap.json'));
  const releaseCycle=read('tools/company-release-production-cycle.mjs');
  const direct=roadmap.directNativeDualPlatformDevelopment;
  const release=roadmap.developmentLifecycleMachine.internalPlatformReleaseAndPublicExposureGate;
  assert.equal(direct.minimumDesignRequired,true);
  assert.equal(direct.platformSpecificRuntimeEvidenceRequired,true);
  assert.equal(direct.platformSpecificIndependentQaRequired,true);
  assert.equal(direct.platformSpecificRegressionRequired,true);
  assert.equal(direct.externalRelease.requiresOwnRuntimeQaRegressionAndExplicitPublicExposureEvidence,true);
  assert.equal(release.internalRelease.foundationValidationRequired,true);
  assert.equal(release.internalRelease.actualRuntimeFoundationF1ThroughF4Required,true);
  assert.ok(releaseCycle.includes('company-learning/platform-release-roadmap.json'));
});
test('native development trigger ownership avoids duplicate central plus child push execution',()=>{
  const development=read('.github/workflows/company-development-confirmed-runtime.yml');
  const roblox=read('.github/workflows/company-development-roblox-runtime.yml');
  const unity=read('.github/workflows/company-development-unity-runtime.yml');
  const developmentPush=development.slice(development.indexOf('on:'),development.indexOf('workflow_dispatch:'));
  const robloxPush=roblox.slice(roblox.indexOf('on:'),roblox.indexOf('workflow_call:'));
  const unityPush=unity.slice(unity.indexOf('on:'),unity.indexOf('workflow_call:'));
  for(const commonPath of [
    'company-learning/platform-release-roadmap.json',
    'company-learning/company-architecture-map.json',
    'company-learning/company-log-map.json',
    'tools/company-shared-context.mjs',
    'tools/company-selected-platform-router.mjs',
    'tools/company-upper-platform-admission.mjs',
    'tools/company-minimum-design-contract.mjs',
    'company-asset-library.json',
  ]) assert.ok(developmentPush.includes(commonPath),commonPath);
  for(const childPath of [
    '.github/workflows/company-development-roblox-runtime.yml',
    '.github/workflows/company-development-roblox-runtime-continuation.yml',
    '.github/workflows/company-development-roblox-headless-fast-mvp.yml',
    '.github/workflows/company-development-unity-runtime.yml',
    'unity-games/**',
  ]) assert.ok(!developmentPush.includes(childPath),childPath);
  assert.ok(robloxPush.includes('.github/workflows/company-development-roblox-runtime.yml'));
  assert.ok(robloxPush.includes('tools/company-development-roblox-build-preflight.mjs'));
  assert.ok(unityPush.includes('unity-games/**'));
});

test('director drains superseded runner backlog before noncritical supervision',()=>{
  const director=read('.github/workflows/director-supervisor.yml');
  assert.match(director,/group: director-central-company-supervisor[\s\S]*cancel-in-progress: false/);
  assert.match(director,/runner-drain:[\s\S]*runs-on: ubuntu-24\.04-arm/);
  assert.match(director,/game-primary-gate:[\s\S]*needs: runner-drain[\s\S]*runs-on: ubuntu-slim/);
  assert.match(director,/actions\/runs\/\$\{run_id\}\/cancel/);
  assert.match(director,/CONTROL_PLANE_SUPERSEDED/);
  assert.match(director,/CENTRAL_DEVELOPMENT_PUSH_SUPERSEDED/);
  assert.match(director,/company-development-roblox-runtime\.yml/);
  assert.match(director,/company-development-roblox-release-promotion\.yml/);
  assert.match(director,/DIRECTOR_RUNNER_DRAIN_INDEPENDENT_GAME_CANCEL=FORBIDDEN/);
  assert.match(director,/JSON\.stringify\(j\)\+'\\\\n'/);
  assert.match(director,/director-run-drain\.ndjson/);
  assert.doesNotMatch(director,/DUPLICATE_TITLE:[^\n]*company-development-unity-runtime\.yml/);
});

test('runner drain uses a YAML-safe delimiter and preserves the game gate block',()=>{
  const director=read('.github/workflows/director-supervisor.yml');
  assert.match(director,/while IFS='\\|' read -r run_id reason; do/);
  assert.doesNotMatch(director,/while IFS=\$'\\t'/);
  assert.match(director,/game-primary-gate:\n\s+needs: runner-drain\n\s+if: always\(\)\n\s+runs-on: ubuntu-slim\n\s+outputs:/);
  assert.match(director,/DIRECTOR_RUNNER_DRAIN_INDEPENDENT_GAME_CANCEL=FORBIDDEN/);
});

test('runner drain bypasses the stale supervisor group and evicts stale legacy Roblox runs',()=>{
  const director=read('.github/workflows/director-supervisor.yml');
  assert.match(director,/group: director-central-company-supervisor-v3/);
  assert.match(director,/runner-drain:[\s\S]*runs-on: ubuntu-24\.04-arm/);
  assert.doesNotMatch(director,/for page in \$\(seq 1 20\); do/);
  assert.match(director,/fetch_runs 'status=in_progress&per_page=100'/);
  assert.match(director,/fetch_runs 'status=queued&per_page=100'/);
  assert.match(director,/ROBLOX_STALE_LEGACY_OR_BATCH/);
  assert.match(director,/15\*60\*1000/);
  assert.match(director,/actions\/runs\/\$\{run_id\}\/force-cancel/);
  assert.match(director,/String\(r\.display_title\|\|''\)==='Company DEVELOPMENT_CONFIRMED Roblox Runtime'/);
  assert.match(director,/String\(r\.display_title\|\|''\)==='Roblox runtime · batch'/);
  assert.match(director,/DIRECTOR_RUNNER_DRAIN_INDEPENDENT_GAME_CANCEL=FORBIDDEN/);
});
