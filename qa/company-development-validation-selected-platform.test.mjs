// 파일명: qa/company-development-validation-selected-platform.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('tools/company-development-validation-cycle.mjs','utf8');
const contract=fs.readFileSync('tools/company-web-validation-evidence-contract.mjs','utf8');
const strictReview=fs.readFileSync('tools/company-strict-production-review.mjs','utf8');

test('DEVELOPMENT_CONFIRMED consumes canonical schema15 Web evidence and independent 90-point promotion revalidation',()=>{
  assert.match(source,/web-gameplay-validation\.json/);
  assert.match(source,/company-web-validation-evidence-contract\.mjs/);
  assert.match(source,/evaluateWebValidationEvidence/);
  assert.match(source,/minimumScore:WEB_HOMEPAGE_MINIMUM,requireFinalContentDepth:false/);
  assert.match(source,/minimumScore:WEB_HOMEPAGE_MINIMUM,requireFinalContentDepth:true/);
  assert.match(source,/minimumScore:WEB_PLATFORM_PROMOTION_MINIMUM,requireFinalContentDepth:true,requirePromotionRevalidation:true/);
  assert.match(source,/finalContentDepthPass:top30\.finalContentDepthPass/);
  assert.doesNotMatch(source,/\[\[0,5\],\[5,15\],\[15,25\],\[25,30\]\]/);
  assert.doesNotMatch(source,/GAMEPLAY_MILESTONE_DEPTH/);
  assert.match(contract,/WEB_VALIDATION_SCHEMA_VERSION=15/);
  assert.match(contract,/WEB_HOMEPAGE_MINIMUM=80/);
  assert.match(contract,/WEB_PLATFORM_PROMOTION_MINIMUM=90/);
  assert.match(contract,/REAL_ELAPSED_GAMEPLAY/);
  assert.match(contract,/meaningfulGameplayMilliseconds/);
  assert.match(source,/WEB_GAMEPLAY_REPAIR_REQUIRED/);
  assert.match(source,/WEB_CONTENT_EXPANSION_REPAIR_REQUIRED/);
  assert.match(source,/WEB_STRICT_REPAIR_REQUIRED/);
  assert.match(source,/insufficientContentReturnsToDevelopment:true/);
  assert.match(source,/finalDepthConsumesPostDevelopmentSource:true/);
  assert.doesNotMatch(source,/WAITING_WEB_FINAL_CONTENT_DEPTH/);
  assert.match(source,/webValidationRequired:true/);
  assert.match(source,/musicValidationRequired:true/);
  assert.match(source,/webValidationOptional:false/);
  assert.match(source,/realPlayableWebGameRequired:true/);
});

test('ordinary gate failure is active unlimited repair, not a waiting terminal state',()=>{
  assert.match(source,/TARGET_PLATFORM_REPAIR_REQUIRED/);
  assert.match(source,/DEVELOPMENT_REVALIDATION_REPAIR_REQUIRED/);
  assert.match(source,/gateFailureMeansImmediateRepair:true/);
  assert.match(source,/repairUntilPass:true/);
  assert.match(source,/repairAttemptLimit:null/);
  assert.match(source,/repairEscalationDoesNotStopLoop:true/);
  assert.match(source,/FIX_FAILED_AXIS_AND_REVALIDATE/);
  assert.match(source,/REIMPLEMENT_FAILED_SUBSYSTEM/);
  assert.match(source,/REVIEW_CORE_LOOP_AND_SYSTEM_CONNECTIONS/);
  assert.match(source,/REBUILD_FROM_APPROVED_DESIGN_AND_CONTINUE_REPAIR/);
  assert.match(source,/DEVELOPMENT_REPAIR_LIMIT=UNLIMITED/);
});

test('composite genre is OR while multiplayer remains an independent hard gate',()=>{
  assert.match(contract,/const passingDeclared=declaredProfiles\.filter/);
  assert.match(contract,/pass=passingDeclared\.length>0&&detectedCompatible/);
  assert.match(contract,/ANY_ONE_DECLARED_GENRE_MAY_PASS/);
  assert.match(strictReview,/const multiRequired=multiKnown&&multiMode!=='SINGLE'/);
  assert.match(strictReview,/Number\(runtime\?\.multiplayer\?\.participants\)>=2&&runtime\?\.multiplayer\?\.meaningfulLoopPassed===true/);
  assert.match(strictReview,/if\(!multiplayerOk\)hard\.push\('MULTIPLAYER_MISSING'\)/);
});

test('Web score and target-platform implementation score are stored separately',()=>{
  assert.match(source,/webStrictScore/);
  assert.match(source,/platformImplementationScore/);
  assert.match(source,/webAndPlatformScoresSeparated:true/);
  assert.match(source,/learningLane:selectedPlatform/);
  assert.match(source,/webLearningLane:'WEB_PORTABLE'/);
  assert.match(source,/development-learning-feedback\.json/);
  assert.match(source,/platformScoreDelta/);
});

test('selected platform 80-89 is revised on the same platform and 90+ remains the pass line',()=>{
  assert.match(source,/PLATFORM_DEVELOPMENT_PASS_MINIMUM=90/);
  assert.match(source,/platform-implementation-score-80-89/);
  assert.match(source,/canonicalTargetRevalidationState/);
  assert.match(source,/같은 플랫폼에서 90점 이상이 될 때까지 재평가한다/);
  assert.match(source,/platform-implementation-score-below-80/);
  assert.match(source,/책임 단계에서 수정하고 구조 문제면 재설계/);
});

test('selected-platform evidence still requires real PASS and targeted revalidation',()=>{
  assert.match(source,/resolveSelectedPlatform/);
  assert.match(source,/adapterForPlatform/);
  assert.match(source,/platformAdapter\.evidenceFile/);
  assert.match(source,/platformAdapter\.projectField/);
  assert.match(source,/targetPlatform\.state==='MISSING'/);
  assert.match(source,/targetPlatform\.state==='FAIL'/);
  assert.match(source,/revalidation-required:/);
  assert.match(source,/DEVELOPMENT_ARTBOOK_PROVENANCE_GATE/);
  assert.match(source,/DEVELOPMENT_BASELINE_GATE=READY/);
  assert.doesNotMatch(source,/writeState\('WAITING_UNITY_VALIDATION'/);
  assert.doesNotMatch(source,/writeState\('WAITING_UNITY_REVALIDATION'/);
});