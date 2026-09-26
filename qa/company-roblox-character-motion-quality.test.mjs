// 파일명: qa/company-roblox-character-motion-quality.test.mjs
// 역할: Roblox 캐릭터 모션이 마네킹식 root 이동으로 퇴행하지 않도록 중앙 정책/아키텍처/보안/Vibe 구현 바인딩을 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const readJson=path=>JSON.parse(fs.readFileSync(path,'utf8'));
const read=path=>fs.readFileSync(path,'utf8');

test('central policy requires articulated smooth Roblox character motion',()=>{
  const policy=readJson('company-learning/platform-release-roadmap.json');
  const contract=policy.livingMotionVisualQualityContract.robloxCharacterMotionQuality;
  assert.equal(contract.status,'ACTIVE_EXECUTABLE_CONTRACT');
  assert.deepEqual(contract.appliesToActorClasses,['PLAYER','HUMANOID_NPC','CREATURE']);
  assert.equal(contract.principles.jointAndWeightShiftMotionRequiredForArticulatedActors,true);
  assert.equal(contract.principles.wholeBodyRootTransformOnlyLocomotionCannotClaimCharacterMotionPass,true);
  assert.equal(contract.rigContract.weldConstraintOnlyArticulatedActorForbiddenForVerifiedMotion,true);
  assert.equal(contract.rigContract.cframeMayMoveAuthoritativeRootButCannotBeTheOnlyVisibleMotionForArticulatedActor,true);
  assert.equal(contract.motionSourcePriority[0],'VERIFIED_SAME_GAME_SAME_ARCHETYPE_MOTION');
  assert.equal(contract.motionSourcePriority.at(-1),'NEW_NATIVE_AUTHORING_ONLY_FOR_REMAINING_GAP');
  assert.equal(contract.blendAndContinuity.animationTrackCrossFadeRequired,true);
  assert.equal(contract.blendAndContinuity.playbackSpeedMustTrackActualLocomotionSpeedWithinStyleEnvelope,true);
  assert.equal(contract.proceduralCorrection.ikControlPreferredWhenSupported,true);
  assert.equal(contract.runtimeQa.hardFailureCode,'CHARACTER_MOTION_MANNEQUIN');
  assert.equal(contract.runtimeQa.officialRobloxStudioMcpRuntimeEvidenceRequired,true);
  assert.equal(contract.runtimeQa.staticSourceMarkersAloneCannotPass,true);
});

test('architecture reuses the existing motion director and canonical Vibe pipeline',()=>{
  const architecture=readJson('company-learning/company-architecture-map.json');
  const topology=architecture.robloxNativeCodingQualityTopology.motionQualityBinding;
  assert.equal(topology.motionDirector,'assets/vibe-motion-director.js');
  assert.equal(topology.sourceWorker,'tools/vibe2-source-worker.mjs');
  assert.equal(topology.qa,'qa/company-roblox-character-motion-quality.test.mjs');
  assert.equal(topology.officialStudioMcpPlay,'tools/company-development-roblox-studio-local-play.mjs');
  assert.equal(topology.hardFailure,'ROBLOX_CHARACTER_MOTION_MANNEQUIN');
  assert.equal(topology.noNewWorker,true);
  assert.equal(topology.noNewQueue,true);
  assert.equal(topology.noShadowMotionPipeline,true);
});

test('motion evidence and security cannot downgrade mannequin failure',()=>{
  const logs=readJson('company-learning/company-log-map.json');
  const security=readJson('company-learning/security-immune-system.json');
  assert.ok(logs.robloxNativeCodingQualityEvidenceContract.requiredMarkers.includes('ROBLOX_CHARACTER_MOTION_QUALITY='));
  assert.ok(logs.robloxNativeCodingQualityEvidenceContract.failureClasses.includes('ROBLOX_CHARACTER_MOTION_MANNEQUIN'));
  assert.equal(logs.robloxNativeCodingQualityEvidenceContract.motionQualityEvidence.officialStudioMcpRuntimeCaptureRequired,true);
  assert.equal(security.advancedMotionSecurity.protections.mannequinHardFailureMayNotBeDowngradedToWarning,true);
  assert.equal(security.motionDirectorSecurity.protections.articulatedActorMayNotPassMotionQaWithOnlyRootOrPrimaryPartTransform,true);
  assert.equal(security.robloxNativeCodingQualitySecurity.rootCFrameOnlyArticulatedMotionCannotClaimMotionPass,true);
});

test('Vibe motion implementation is library-first and has a mannequin evidence audit',()=>{
  const director=read('assets/vibe-motion-director.js');
  const worker=read('tools/vibe2-source-worker.mjs');
  const qa=read('tools/vibe2-incremental-qa.mjs');
  assert.match(director,/ROBLOX_MOTION_SOURCE_PRIORITY/);
  assert.match(director,/selectRobloxCharacterMotionSource/);
  assert.match(director,/createRobloxMotionBlendProfile/);
  assert.match(director,/createRobloxCharacterMotionPlan/);
  assert.match(director,/auditRobloxCharacterMotionEvidence/);
  assert.match(director,/CHARACTER_MOTION_MANNEQUIN/);
  assert.match(worker,/MOTION SOURCE ORDER/);
  assert.match(worker,/MANNEQUIN HARD FAILURE/);
  assert.match(worker,/ROBLOX_CHARACTER_MOTION_QUALITY=/);
  assert.match(qa,/robloxCharacterMotionStaticEvidence/);
  assert.match(qa,/ROBLOX_NO_ROOT_ONLY_MANNEQUIN_MOTION/);
  assert.match(qa,/CHARACTER_MOTION_MANNEQUIN/);
});

test('company motion library remains semantic until native runtime verification',()=>{
  const library=readJson('company-asset-library.json');
  assert.equal(library.universalCoverage.productionVerifiedAssetCount,0);
  assert.equal(library.universalCoverage.preparedSemanticDoesNotCountAsVerified,true);
  assert.equal(library.rules.preparedSemanticNeverVerified,true);
  assert.ok(Array.isArray(library.baseMaterialLibrary.families.MOTION));
  assert.ok(library.baseMaterialLibrary.families.MOTION.includes('WALK'));
  assert.ok(library.baseMaterialLibrary.families.MOTION.includes('RUN'));
  assert.ok(library.baseMaterialLibrary.families.MOTION.includes('HIT_FRONT'));
  assert.ok(library.baseMaterialLibrary.families.MOTION.includes('DEATH_FRONT'));
});
