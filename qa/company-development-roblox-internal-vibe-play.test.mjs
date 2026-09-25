import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const workflow=fs.readFileSync('.github/workflows/company-development-roblox-internal-vibe-play.yml','utf8');
const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
const architecture=JSON.parse(fs.readFileSync('company-learning/company-architecture-map.json','utf8'));

test('actual Vibe internal play uses Roblox Player and never Studio automation',()=>{
  assert.match(workflow,/RobloxPlayerBeta\.exe/);
  assert.match(workflow,/roblox:\/\/placeId=/);
  assert.match(workflow,/ROBLOX_ACTUAL_VIBE_PLAY_SURFACE=ROBLOX_PLAYER/);
  assert.match(workflow,/ROBLOX_STUDIO_AUTOMATION=FORBIDDEN/);
  assert.doesNotMatch(workflow,/ExecutePlayModeAsync|ExecuteMultiplayerTestAsync|--task\s+RunScript|vibe2-roblox-skyline-runtime-smoke/);
});

test('actual play requires real input and changing runtime frames',()=>{
  for(const token of ['MOVE_FORWARD','MOVE_LEFT','MOVE_RIGHT','JUMP','keybd_event','distinctFrameCount','playerAliveAfterActions']){
    assert.ok(workflow.includes(token),token);
  }
  assert.match(workflow,/\$passed=\$alive -and \$distinct -ge 2 -and \$frames\.Count -ge 5/);
  assert.match(workflow,/actualPlay=\$true/);
  assert.match(workflow,/inputBased=\$true/);
});

test('actual play is exact candidate bound and cannot unlock public release by itself',()=>{
  for(const token of ['sourceRevision','artifactIdentity','universeId','placeId','versionNumber','ROBLOX_VIBE_PLAY_EXACT_CANDIDATE_MISMATCH','ROBLOX_VIBE_PLAY_SHARED_TARGET_NOT_CURRENT']){
    assert.ok(workflow.includes(token),token);
  }
  assert.match(workflow,/scenarioCoveragePass=\$false/);
  assert.match(workflow,/item\.robloxPublicReleaseReady=false/);
  assert.match(workflow,/item\.robloxPublicRelease=false/);
  assert.match(workflow,/item\.robloxReleaseClaim=false/);
});

test('shared test target only plays the currently live highest version',()=>{
  assert.match(workflow,/maxByTarget/);
  assert.match(workflow,/robloxSharedTargetCurrent===true/);
  assert.match(workflow,/Number\(c\.versionNumber\)===Number\(maxByTarget\.get\(key\)\|\|0\)/);
  assert.match(workflow,/maxSameTarget/);
});

test('central policy and architecture bind the actual Player executor',()=>{
  const loop=roadmap.developmentLifecycleMachine?.internalPlatformReleaseAndPublicExposureGate?.internalBuildupLoop||{};
  assert.equal(loop.actualVibePlayExecutor,'.github/workflows/company-development-roblox-internal-vibe-play.yml');
  assert.equal(loop.actualVibePlaySurface,'ROBLOX_PLAYER');
  assert.equal(loop.robloxStudioAutomationForActualVibePlay,false);
  assert.equal(loop.evidenceRequirements?.realInput,true);
  assert.equal(loop.evidenceRequirements?.runtimeFrameChange,true);
  assert.equal(loop.evidenceRequirements?.exactCandidateBinding,true);
  const arch=architecture.releaseExposureLifecycle?.robloxPerpetualInternalBuildup||{};
  assert.equal(arch.actualPlayExecutor,'.github/workflows/company-development-roblox-internal-vibe-play.yml');
  assert.equal(arch.actualPlaySurface,'ROBLOX_PLAYER');
});
