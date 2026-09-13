import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBootstrapHtml,buildContractSafePlayable,inferDevelopmentGenre} from '../tools/company-development-web-bootstrap.mjs';
import {evaluateGameplayEvidence} from '../tools/company-development-web-gameplay-validation.mjs';

const playable=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body data-audio-state="locked"><h1>Test</h1><p id="status">score 0</p><button id="act">Act</button><button data-audio-control="mute">mute</button><input data-audio-control="volume" type="range"><script>const AC=window.AudioContext||window.webkitAudioContext;let score=0;document.querySelector('#act').addEventListener('click',()=>{score++;document.querySelector('#status').textContent='score '+score;});</script>${'x'.repeat(1900)}</body></html>`;

test('bootstrap contract accepts interactive mobile Web with music controls',()=>{
  const result=validateBootstrapHtml(playable);
  assert.equal(result.pass,true,result.blockers.join(','));
});

test('bootstrap contract rejects external network, storage and malformed script',()=>{
  const bad=playable.replace('</script>',";localStorage.setItem('x','1');fetch('https://example.com/x');if(true){</script>");
  const result=validateBootstrapHtml(bad);
  assert.equal(result.pass,false);
  assert.ok(result.blockers.includes('PERSISTENT_STORAGE_FORBIDDEN_ON_BOOTSTRAP'));
  assert.ok(result.blockers.includes('NETWORK_API_FORBIDDEN'));
  assert.ok(result.blockers.includes('INLINE_SCRIPT_SYNTAX_INVALID'));
});

test('locked GAME_SEED genre inference remains deterministic',()=>{
  assert.equal(inferDevelopmentGenre({baseline:{gameSeedId:'SEED-STORY_COMPLETE_RPG-001'}}),'STORY_COMPLETE_RPG');
  assert.equal(inferDevelopmentGenre({baseline:{gameSeedId:'SEED-SINGLE_DEFENSE_STRATEGY-001'}}),'SINGLE_DEFENSE_STRATEGY');
});

test('deterministic recovery is diagnostic only and never full-Web completion evidence',()=>{
  const baseline={gameSeedId:'SEED-STORY_COMPLETE_RPG-001',content:{identity:'Eldoria',coreFun:'스토리 탐험',coreLoop:['탐험하고 선택하며 전투한다.']}};
  const recovered=buildContractSafePlayable({gameId:'seed-story-complete-rpg-chronicles-of-eldoria',gameName:'Chronicles of Eldoria',baseline});
  const contract=validateBootstrapHtml(recovered.html,{scopeInventory:recovered.approvedScopeInventory});
  assert.equal(contract.pass,true,contract.blockers.join(','));
  assert.equal(recovered.generationMode,'DETERMINISTIC_FULL_SCOPE_RECOVERY');
  assert.notEqual(recovered.generationMode,'MODEL_GENERATED_FULL_SCOPE');
});

test('full Web completion gate accepts only model-generated full approved scope',()=>{
  const completionEligible=mode=>mode==='MODEL_GENERATED_FULL_SCOPE';
  assert.equal(completionEligible('MODEL_GENERATED_FULL_SCOPE'),true);
  assert.equal(completionEligible('DETERMINISTIC_FULL_SCOPE_RECOVERY'),false);
  assert.equal(completionEligible(''),false);
});

test('browser evidence requires real interaction and observable state change',()=>{
  const before={text:'score 0',visibleButtons:1,canvases:[],dataState:[],scrollWidth:390,viewportWidth:390};
  const after={...before,text:'score 3'};
  const pass=evaluateGameplayEvidence({before,after,interactionCount:3,reloadVisible:true});
  assert.equal(pass.pass,true,pass.blockers.join(','));
  const fail=evaluateGameplayEvidence({before,after:before,interactionCount:0,reloadVisible:true});
  assert.equal(fail.pass,false);
  assert.ok(fail.blockers.includes('NO_GAMEPLAY_INTERACTION_DELIVERED'));
  assert.ok(fail.blockers.includes('NO_OBSERVABLE_GAME_STATE_CHANGE'));
});
