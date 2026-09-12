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
  '.github/workflows/company-development-unity-runtime.yml',
];

test('COMPANY_FLOW is the only production policy document with authority',()=>{
  assert.equal(exists('AUTONOMOUS_DEVELOPMENT_POLICY.md'),false);
  assert.match(read('AGENTS.md'),/제작 정책 원본은 \*\*`COMPANY_FLOW\.md` 하나\*\*/);
  const directive=JSON.parse(read('company-directive.json'));
  assert.equal(directive.policyDocument,'COMPANY_FLOW.md');
});

test('legacy autonomous top-level workflow namespace is removed',()=>{
  const files=fs.readdirSync(path.join(repoRoot,'.github/workflows'));
  const legacy=files.filter(name=>/^autonomous-.*\.ya?ml$/i.test(name));
  assert.deepEqual(legacy,[]);
});

test('central production runtime keeps one Web-first selected-platform chain and existing platform executors',()=>{
  for(const file of centralWorkflows)assert.equal(exists(file),true,`${file} must exist`);
  const directive=JSON.parse(read('company-directive.json'));
  const promotion=read('.github/workflows/company-design-promotion-sync.yml');
  const development=read('.github/workflows/company-development-confirmed-runtime.yml');
  const unity=read('.github/workflows/company-development-unity-runtime.yml');
  assert.equal(directive.classes.DEVELOPMENT_CONFIRMED.webBeforeTargetPlatformByDefault,true);
  assert.equal(directive.classes.DEVELOPMENT_CONFIRMED.targetPlatformMayRunImmediately,false);
  assert.equal(directive.classes.DEVELOPMENT_CONFIRMED.webPurpose,'REQUIRED_FIRST_PLAYABLE_GAMEPLAY_AND_MUSIC_VALIDATION');
  assert.equal(directive.classes.DEVELOPMENT_CONFIRMED.webGameplayValidationRequired,true);
  assert.equal(directive.classes.DEVELOPMENT_CONFIRMED.musicValidationRequired,true);
  assert.equal(directive.classes.RELEASE_CONFIRMED.target,'PROJECT_SELECTED_PLATFORM');
  assert.match(promotion,/DESIGN_BASELINE_READY/);
  assert.match(promotion,/company-development-confirmed-runtime\.yml/);
  assert.match(development,/company-development-web-bootstrap\.mjs/);
  assert.match(development,/company-development-web-gameplay-validation\.mjs/);
  assert.match(development,/WEB_GAMEPLAY_MUSIC_GATE=REQUIRED/);
  assert.match(development,/webValidationPassedAt/);
  assert.match(development,/musicValidationPassed===true/);
  assert.match(development,/company-selected-platform-router\.mjs/);
  assert.match(development,/DEVELOPMENT_PIPELINE=ONE_CANONICAL_PIPELINE/);
  assert.match(development,/CRON_ROLE=WATCHDOG_AND_RECOVERY_ONLY/);
  assert.match(development,/company-development-unity-runtime\.yml/);
  assert.match(development,/vibe2-24h-runner\.yml/);
  assert.doesNotMatch(development,/WEB_GAMEPLAY_TESTBED=OPTIONAL/);
  assert.doesNotMatch(development,/NEXT_GATE=UNITY_ANDROID_TECHNICAL_VALIDATION/);
  assert.match(unity,/fromJSON\(needs\.prepare\.outputs\.parallel\)/);
  assert.match(unity,/company-development-unity-bootstrap\.mjs/);
  assert.match(unity,/company-development-unity-evidence\.mjs/);
  assert.match(unity,/unity-cloud-android-test\.yml/);
  assert.doesNotMatch(unity,/unity-local-pc-android\.yml/);
  assert.doesNotMatch(unity,/unity-hybrid-android-build\.yml/);
  assert.match(unity,/unity-android-runtime-smoke\.yml/);
  assert.match(unity,/unity-android-independent-qa\.yml/);
  assert.match(unity,/unity-android-regression\.yml/);
  assert.match(unity,/BUILD_ONCE_PER_SOURCE_FINGERPRINT=ENABLED/);
  assert.match(unity,/IMMUTABLE_ARTIFACT_REUSE=ENABLED/);
  assert.match(unity,/RESUME_EXACT_FAILURE_POINT=ENABLED/);
  assert.match(unity,/QUALITY_GATE_WEAKENING=NO/);
  assert.doesNotMatch(unity,/HOMEPAGE_TEST_APK_PUBLISH=YES/);
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
  const flow=read('COMPANY_FLOW.md');
  const releaseCycle=read('tools/company-release-production-cycle.mjs');
  assert.match(flow,/developmentBaselineRequired:\s*true/);
  assert.match(flow,/sourceTreeBindingRequired:\s*true/);
  assert.match(flow,/independentQaSeparatedFromVibe2SelfCheck:\s*true/);
  assert.match(releaseCycle,/COMPANY_FLOW\.md/);
});
