// 파일명: qa/company-development-web-runtime.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBootstrapHtml,buildContractSafePlayable,inferDevelopmentGenre} from '../tools/company-development-web-bootstrap.mjs';
import {evaluateGameplayEvidence,scopeInteractionChanged} from '../tools/company-development-web-gameplay-validation.mjs';
import {deriveApprovedScopeInventory,runtimeApprovedScopeCoverage,staticApprovedScopeCoverage} from '../tools/company-approved-scope-contract.mjs';

const playable=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body data-audio-state="locked" data-approved-scope-count="1"><h1>Test</h1><p id="status">score 0</p><button id="act" data-scope-id="scope-test">Act</button><button data-audio-control="mute">Mute</button><input data-audio-control="volume" type="range"><script>let score=0,ctx=null;async function audio(){const AC=window.AudioContext||window.webkitAudioContext;ctx=ctx||new AC();if(ctx.state==='suspended')await ctx.resume();document.body.dataset.audioState='running'}document.querySelector('#act').addEventListener('click',async()=>{await audio();score++;document.querySelector('#status').textContent='score '+score;});</script>${'x'.repeat(1600)}</body></html>`;

test('bootstrap base contract accepts self-contained gameplay plus user-gesture music runtime',()=>{
  const result=validateBootstrapHtml(playable);
  assert.equal(result.pass,true,result.blockers.join(','));
});

test('bootstrap contract rejects external network and persistent storage',()=>{
  const bad=playable.replace('</script>',";localStorage.setItem('x','1');fetch('https://example.com/x');</script>");
  const result=validateBootstrapHtml(bad);
  assert.equal(result.pass,false);
  assert.ok(result.blockers.includes('PERSISTENT_STORAGE_FORBIDDEN_ON_BOOTSTRAP'));
  assert.ok(result.blockers.includes('NETWORK_API_FORBIDDEN'));
});

test('bootstrap contract rejects malformed inline JavaScript before browser runtime',()=>{
  const malformed=playable.replace('});</script>','});if(true){</script>');
  const result=validateBootstrapHtml(malformed);
  assert.equal(result.pass,false);
  assert.ok(result.blockers.includes('INLINE_SCRIPT_SYNTAX_INVALID'));
});

test('bootstrap contract requires mobile viewport and music controls',()=>{
  const noViewport=playable.replace('<meta name="viewport" content="width=device-width,initial-scale=1">','');
  assert.ok(validateBootstrapHtml(noViewport).blockers.includes('MOBILE_VIEWPORT_REQUIRED'));
  const noMute=playable.replace('data-audio-control="mute"','data-x="mute"');
  assert.ok(validateBootstrapHtml(noMute).blockers.includes('MUSIC_MUTE_CONTROL_REQUIRED'));
  const noVolume=playable.replace('data-audio-control="volume"','data-x="volume"');
  assert.ok(validateBootstrapHtml(noVolume).blockers.includes('MUSIC_VOLUME_CONTROL_REQUIRED'));
});

test('approved scope inventory captures every approved core loop and gameplay system',()=>{
  const baseline={content:{coreFun:'survive and grow',coreLoop:['explore','fight','upgrade'],systems:['crafting','quests'],marketTargetDirection:'not implementation scope'}};
  const inventory=deriveApprovedScopeInventory(baseline);
  assert.ok(inventory.some(x=>x.path==='coreFun'));
  assert.equal(inventory.filter(x=>x.path.startsWith('coreLoop[')).length,3);
  assert.ok(inventory.some(x=>x.label==='crafting'));
  assert.ok(inventory.some(x=>x.label==='quests'));
  assert.ok(!inventory.some(x=>x.label.includes('not implementation scope')));
});

test('static scope contract rejects silent omission from Web companion',()=>{
  const inventory=[{id:'scope-a'},{id:'scope-b'}];
  const incomplete='<body data-approved-scope-count="2"><button data-scope-id="scope-a">A</button></body>';
  const verdict=staticApprovedScopeCoverage(incomplete,inventory);
  assert.equal(verdict.pass,false);
  assert.ok(verdict.blockers.includes('APPROVED_SCOPE_ITEM_MISSING:scope-b'));
});

test('static scope contract rejects generic data-action proxy controls',()=>{
  const inventory=[{id:'scope-a'},{id:'scope-b'}];
  const proxy='<body data-approved-scope-count="2"><button data-scope-id="scope-a" data-action="0">A</button><button data-scope-id="scope-b" data-action="1">B</button></body>';
  const verdict=staticApprovedScopeCoverage(proxy,inventory);
  assert.equal(verdict.pass,false);
  assert.ok(verdict.blockers.includes('GENERIC_SCOPE_PROXY_FORBIDDEN:scope-a'));
  assert.ok(verdict.blockers.includes('GENERIC_SCOPE_PROXY_FORBIDDEN:scope-b'));
});

test('static scope contract requires an interactive control for every approved item',()=>{
  const inventory=[{id:'scope-a'}];
  const decorative='<body data-approved-scope-count="1"><div data-scope-id="scope-a">A</div></body>';
  const verdict=staticApprovedScopeCoverage(decorative,inventory);
  assert.equal(verdict.pass,false);
  assert.ok(verdict.blockers.includes('APPROVED_SCOPE_CONTROL_NOT_INTERACTIVE:scope-a'));
});

test('runtime scope coverage requires every visible approved item to be interacted',()=>{
  const fail=runtimeApprovedScopeCoverage({declaredCount:2,visibleScopeIds:['scope-a','scope-b'],interactedScopeIds:['scope-a']});
  assert.equal(fail.pass,false);
  assert.ok(fail.blockers.some(x=>x.startsWith('APPROVED_SCOPE_NOT_INTERACTED:')));
  const pass=runtimeApprovedScopeCoverage({declaredCount:2,visibleScopeIds:['scope-a','scope-b'],interactedScopeIds:['scope-a','scope-b']});
  assert.equal(pass.pass,true,pass.blockers.join(','));
});

test('per-scope runtime interaction only counts when observable game state changes',()=>{
  const before={text:'score 0',canvases:[],dataState:[{tag:'DIV',text:'0',attrs:[['data-score','0']]}]};
  const unchanged={text:'score 0',canvases:[],dataState:[{tag:'DIV',text:'0',attrs:[['data-score','0']]}]};
  const changed={text:'score 1',canvases:[],dataState:[{tag:'DIV',text:'1',attrs:[['data-score','1']]}]};
  assert.equal(scopeInteractionChanged(before,unchanged),false);
  assert.equal(scopeInteractionChanged(before,changed),true);
});

test('contract recovery infers the locked GAME_SEED genre instead of inventing a new class',()=>{
  const cases={ACTION_SURVIVAL_ROGUELITE:'SEED-ACTION_SURVIVAL_ROGUELITE-001',SINGLE_DEFENSE_STRATEGY:'SEED-SINGLE_DEFENSE_STRATEGY-001',PUZZLE:'SEED-PUZZLE-001',CASUAL:'SEED-CASUAL-001',IDLE_GROWTH_RPG:'SEED-IDLE_GROWTH_RPG-001',STORY_COMPLETE_RPG:'SEED-STORY_COMPLETE_RPG-001'};
  for(const [genre,gameSeedId] of Object.entries(cases))assert.equal(inferDevelopmentGenre({baseline:{gameSeedId}}),genre);
});

test('deterministic recovery remains diagnostic only and cannot satisfy full approved-scope completion',()=>{
  const cases=[['ACTION_SURVIVAL_ROGUELITE','생존 전투'],['SINGLE_DEFENSE_STRATEGY','방어 전략'],['PUZZLE','퍼즐'],['CASUAL','캐주얼'],['IDLE_GROWTH_RPG','성장 RPG'],['STORY_COMPLETE_RPG','스토리 RPG']];
  for(const [genre,label] of cases){
    const baseline={gameSeedId:`SEED-${genre}-001`,content:{identity:`${genre} Test`,coreFun:`${label} 핵심 재미`,coreLoop:[`${label} 탐색`,`${label} 실행`,`${label} 보상`],systems:['진행 시스템','보상 시스템']}};
    const inventory=deriveApprovedScopeInventory(baseline);
    const recovered=buildContractSafePlayable({gameId:`seed-${genre.toLowerCase()}`,gameName:`${genre} Test`,baseline});
    const contract=validateBootstrapHtml(recovered.html,{scopeInventory:inventory});
    assert.equal(recovered.generationMode,'DETERMINISTIC_FULL_SCOPE_RECOVERY');
    assert.equal(contract.pass,false,`${genre}: deterministic proxy must not satisfy completion`);
    assert.ok(contract.blockers.some(x=>x.startsWith('GENERIC_SCOPE_PROXY_FORBIDDEN:')));
  }
});

test('gameplay evidence requires interaction, state change, music and full approved scope runtime coverage',()=>{
  const before={text:'score 0',visibleButtons:3,canvases:[],dataState:[],audioState:'locked',muteControls:1,volumeControls:1,approvedScopeCount:2,visibleScopeIds:['scope-a','scope-b'],scrollWidth:390,viewportWidth:390};
  const after={...before,text:'score 3',audioState:'running'};
  const scopeCoverage=runtimeApprovedScopeCoverage({declaredCount:2,visibleScopeIds:['scope-a','scope-b'],interactedScopeIds:['scope-a','scope-b']});
  const pass=evaluateGameplayEvidence({before,after,interactionCount:3,reloadVisible:true,scopeCoverage});
  assert.equal(pass.pass,true,pass.blockers.join(','));
  assert.equal(pass.musicRuntime.pass,true);
  assert.equal(pass.scopeCoverage.pass,true);
  const partial=runtimeApprovedScopeCoverage({declaredCount:2,visibleScopeIds:['scope-a','scope-b'],interactedScopeIds:['scope-a']});
  const fail=evaluateGameplayEvidence({before,after,interactionCount:3,reloadVisible:true,scopeCoverage:partial});
  assert.equal(fail.pass,false);
  assert.ok(fail.blockers.some(x=>x.startsWith('SCOPE:APPROVED_SCOPE_NOT_INTERACTED:')));
});