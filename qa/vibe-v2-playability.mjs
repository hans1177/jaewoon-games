import assert from 'node:assert/strict';
import {createVibePlayabilityEvidence,requireVibePlayability} from '../assets/vibe-v2-playability.js';

// Regression: page shell/buttons exist, but world/player never render.
const shellOnly=createVibePlayabilityEvidence({gameStarted:true,worldRendered:false,playerRendered:false,playerControllable:false,gameplayFrameAdvanced:false,visibleGameplayObjects:0,shellOnly:true});
const broken=requireVibePlayability(shellOnly);
assert.equal(shellOnly.playable,false);
assert.equal(broken.repairRequired,true);
assert.ok(shellOnly.failures.includes('worldRendered'));
assert.ok(shellOnly.failures.includes('playerRendered'));
assert.ok(shellOnly.failures.includes('shellNotAlone'));

// A loaded menu alone must never be accepted as successful gameplay.
const missing=requireVibePlayability(null);
assert.equal(missing.playable,false);
assert.equal(missing.repairRequired,true);

// Positive contract: started world, visible/controllable player and advancing gameplay.
const playable=createVibePlayabilityEvidence({gameStarted:true,worldRendered:true,playerRendered:true,playerControllable:true,gameplayFrameAdvanced:true,enemyExpected:true,enemyRendered:true,visibleGameplayObjects:3,shellOnly:false});
const ok=requireVibePlayability(playable);
assert.equal(playable.playable,true);
assert.equal(ok.repairRequired,false);
// 미래 상태 재현을 요구하면 누락·가짜 증거는 기존 통과 결과를 대신할 수 없다.
const missingReplay=createVibePlayabilityEvidence({
  gameStarted:true,worldRendered:true,playerRendered:true,playerControllable:true,
  gameplayFrameAdvanced:true,visibleGameplayObjects:3,replayRequired:true,replayEvidence:[]
});
assert.equal(missingReplay.playable,false);
assert.ok(missingReplay.failures.includes('temporalReplayVerified'));
const inventedReplay=createVibePlayabilityEvidence({
  gameStarted:true,worldRendered:true,playerRendered:true,playerControllable:true,
  gameplayFrameAdvanced:true,visibleGameplayObjects:3,replayRequired:true,
  replayEvidence:[{horizon:'SAVE_LOAD_CYCLE',scenarioId:'restart',sourceRevision:'abc',
    actualPlatformRuntime:false,independentQaPass:true,expectedObservationMet:true,gameplaySemanticsPreserved:true}]
});
assert.equal(inventedReplay.playable,false);
const verifiedReplay=createVibePlayabilityEvidence({
  gameStarted:true,worldRendered:true,playerRendered:true,playerControllable:true,
  gameplayFrameAdvanced:true,visibleGameplayObjects:3,replayRequired:true,
  replayEvidence:[{horizon:'SAVE_LOAD_CYCLE',scenarioId:'restart',sourceRevision:'abc',
    actualPlatformRuntime:true,independentQaPass:true,expectedObservationMet:true,gameplaySemanticsPreserved:true}]
});
assert.equal(requireVibePlayability(verifiedReplay).playable,true);
console.log('vibe-v2-playability: shell-only game cannot pass');
