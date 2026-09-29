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
console.log('vibe-v2-playability: shell-only game cannot pass');
