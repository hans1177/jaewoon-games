// 파일명: qa/company-development-web-runtime.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {validateBootstrapHtml,buildContractSafePlayable,inferDevelopmentGenre,classifyApprovedScope} from '../tools/company-development-web-bootstrap.mjs';
import {evaluateGameplayEvidence,scopeInteractionChanged,ensure30MinuteSessionContract} from '../tools/company-development-web-gameplay-validation.mjs';
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
  const before={text:'score 0',canvases:[],dataState:[{tag:'DIV',text:'0',attrs:[['data-score','0']]}],sessionCurrentStage:0,sessionCompletedStages:0,sessionStages:[]};
  const unchanged={...before};
  const changed={...before,text:'score 1',dataState:[{tag:'DIV',text:'1',attrs:[['data-score','1']]}]};
  assert.equal(scopeInteractionChanged(before,unchanged),false);
  assert.equal(scopeInteractionChanged(before,changed),true);
});

test('compiler infers locked GAME_SEED genre including Roblox categories',()=>{
  const cases={
    ACTION_SURVIVAL_ROGUELITE:'SEED-ACTION_SURVIVAL_ROGUELITE-001',
    STORY_COMPLETE_RPG:'SEED-STORY_COMPLETE_RPG-001',
    BATTLEGROUND_FIGHTING_SHOOTER:'SEED-ROBLOX-BATTLEGROUND_FIGHTING_SHOOTER-001',
    SIMULATOR_TYCOON_INCREMENTAL:'SEED-ROBLOX-SIMULATOR_TYCOON_INCREMENTAL-001',
    SURVIVAL_HORROR_ESCAPE:'SEED-ROBLOX-SURVIVAL_HORROR_ESCAPE-001',
    OBBY_PARTY_MINIGAME:'SEED-ROBLOX-OBBY_PARTY_MINIGAME-001',
    STORY_RPG_ADVENTURE_RPG:'SEED-ROBLOX-STORY_RPG_ADVENTURE_RPG-001',
    ROLEPLAY_LIFE_AVATAR:'SEED-ROBLOX-ROLEPLAY_LIFE_AVATAR-001'
  };
  for(const [genre,gameSeedId] of Object.entries(cases))assert.equal(inferDevelopmentGenre({baseline:{gameSeedId}}),genre);
});

test('approved scope classifier maps gameplay meaning to distinct runtime modes',()=>{
  assert.equal(classifyApprovedScope({path:'combat',label:'attack opponent'},0),'COMBAT');
  assert.equal(classifyApprovedScope({path:'coreLoop[0]',label:'explore and reposition'},0),'MOVEMENT');
  assert.equal(classifyApprovedScope({path:'progression',label:'upgrade loadout'},0),'PROGRESSION');
  assert.equal(classifyApprovedScope({path:'economy',label:'collect resource'},0),'ECONOMY');
  assert.equal(classifyApprovedScope({path:'objectives',label:'complete round goal'},0),'OBJECTIVE');
  assert.equal(classifyApprovedScope({path:'mobileUx',label:'touch controls'},0),'MOBILE');
});

test('deterministic compiler implements every approved scope without generic proxy',()=>{
  const cases=[
    ['BATTLEGROUND_FIGHTING_SHOOTER','combat, opponent, skill, cooldown'],
    ['SIMULATOR_TYCOON_INCREMENTAL','collect resources and upgrade production'],
    ['SURVIVAL_HORROR_ESCAPE','survive threats and escape'],
    ['OBBY_PARTY_MINIGAME','move through checkpoints'],
    ['STORY_RPG_ADVENTURE_RPG','explore fight and progress']
  ];
  for(const [genre,coreFun] of cases){
    const baseline={gameSeedId:`SEED-ROBLOX-${genre}-001`,content:{identity:`${genre} Test`,coreFun,coreLoop:['explore or reposition','fight or execute challenge','receive reward and progress'],mobileUx:'touch controls'}};
    const inventory=deriveApprovedScopeInventory(baseline);
    const compiled=buildContractSafePlayable({gameId:`seed-${genre.toLowerCase()}`,gameName:`${genre} Test`,baseline});
    const contract=validateBootstrapHtml(compiled.html,{scopeInventory:inventory});
    assert.equal(compiled.generationMode,'DETERMINISTIC_FULL_SCOPE_IMPLEMENTATION');
    assert.equal(contract.pass,true,`${genre}: ${contract.blockers.join(',')}`);
    assert.doesNotMatch(compiled.html,/\bdata-action\s*=/i);
    for(let i=0;i<inventory.length;i++){
      assert.match(compiled.html,new RegExp(`data-scope-id=["']${inventory[i].id}["']`));
      assert.ok(compiled.html.includes(`scopeHandler${i+1}`));
      assert.ok(compiled.html.includes(`addEventListener('click',scopeHandler${i+1})`));
    }
  }
});

test('30-minute session contract injects four distinct interactive stages totaling 30 minutes',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'jaewoon-web-session-'));
  try{
    const source=path.join(root,'web-games','candidate');fs.mkdirSync(source,{recursive:true});
    fs.writeFileSync(path.join(source,'index.html'),playable,'utf8');
    const baseline=path.join(root,'design.json');
    fs.writeFileSync(baseline,JSON.stringify({content:{coreFun:'defend the bastion',coreLoop:['read the wave and place defense','earn resources and upgrade','adapt to enemy composition'],progressionDirection:'wave-by-wave mastery'}},null,2));
    const result=ensure30MinuteSessionContract({sourcePath:source,baselinePath:baseline});
    assert.equal(result.minutes,30);assert.equal(result.stages,4);
    const html=fs.readFileSync(path.join(source,'index.html'),'utf8');
    assert.match(html,/data-session-minutes="30"/);
    assert.equal((html.match(/data-session-stage="\d"/g)||[]).length,4);
    assert.match(html,/data-session-start="0" data-session-end="5"/);
    assert.match(html,/data-session-start="5" data-session-end="15"/);
    assert.match(html,/data-session-start="15" data-session-end="25"/);
    assert.match(html,/data-session-start="25" data-session-end="30"/);
    assert.match(html,/도입 · 조작과 목표 확인/);
    assert.match(html,/마무리 · 고난도 목표/);
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});

test('gameplay evidence requires interaction, state change, music, approved scope and completed 30-minute stage contract',()=>{
  const before={text:'score 0',visibleButtons:7,canvases:[],dataState:[],audioState:'locked',muteControls:1,volumeControls:1,approvedScopeCount:2,visibleScopeIds:['scope-a','scope-b'],sessionDepthMinutes:30,sessionStages:[{stage:1,start:0,end:5,complete:false,text:'intro stage'},{stage:2,start:5,end:15,complete:false,text:'core loop stage'},{stage:3,start:15,end:25,complete:false,text:'progression stage'},{stage:4,start:25,end:30,complete:false,text:'final challenge stage'}],sessionCurrentStage:0,sessionCompletedStages:0,scrollWidth:390,viewportWidth:390};
  const after={...before,text:'score 3',audioState:'running',sessionCurrentStage:4,sessionCompletedStages:4,sessionStages:before.sessionStages.map(x=>({...x,complete:true}))};
  const scopeCoverage=runtimeApprovedScopeCoverage({declaredCount:2,visibleScopeIds:['scope-a','scope-b'],interactedScopeIds:['scope-a','scope-b']});
  const sessionContract={pass:true,minutes:30,stageCount:4,completedStages:4};
  const pass=evaluateGameplayEvidence({before,after,interactionCount:7,reloadVisible:true,scopeCoverage,sessionContract});
  assert.equal(pass.pass,true,pass.blockers.join(','));
  assert.equal(pass.musicRuntime.pass,true);
  assert.equal(pass.scopeCoverage.pass,true);
  assert.equal(pass.sessionContract.pass,true);
  const partial=runtimeApprovedScopeCoverage({declaredCount:2,visibleScopeIds:['scope-a','scope-b'],interactedScopeIds:['scope-a']});
  const fail=evaluateGameplayEvidence({before,after,interactionCount:7,reloadVisible:true,scopeCoverage:partial,sessionContract});
  assert.equal(fail.pass,false);
  assert.ok(fail.blockers.some(x=>x.startsWith('SCOPE:APPROVED_SCOPE_NOT_INTERACTED:')));
  const sessionFail=evaluateGameplayEvidence({before,after,interactionCount:7,reloadVisible:true,scopeCoverage,sessionContract:{pass:false}});
  assert.equal(sessionFail.pass,false);
  assert.ok(sessionFail.blockers.includes('SESSION:MEANINGFUL_30_MIN_CONTRACT_REQUIRED'));
});

function frozenStrictFixture({cycleSeedId='SEED-ROBLOX-SIMULATOR_TYCOON_INCREMENTAL-TEST'}={}){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'jaewoon-frozen-strict-'));
  const gameId='seed-roblox-frozen-context-test';
  const seedId='SEED-ROBLOX-SIMULATOR_TYCOON_INCREMENTAL-TEST';
  const designDir=path.join(root,'design',gameId,'2026-09-14');
  const sourceDir=path.join(root,'web-games','candidate');
  fs.mkdirSync(designDir,{recursive:true});fs.mkdirSync(sourceDir,{recursive:true});
  const loops=['collect resources and increase production','spend resources to upgrade production','unlock a new tier and progress'];
  const identity='Pocket Foundry frozen implementation identity with collect resources upgrade production unlock tier progression';
  const baselinePath=path.join(designDir,'design-revised.json');
  fs.writeFileSync(baselinePath,JSON.stringify({gameId,gameSeedId:seedId,content:{identity,coreLoop:loops}},null,2));
  fs.writeFileSync(path.join(designDir,'cycle-status.json'),JSON.stringify({gameId,selectedPlatform:'ROBLOX',gameSeed:{seedId:cycleSeedId,category:'SIMULATOR_TYCOON_INCREMENTAL'}},null,2));
  fs.writeFileSync(path.join(sourceDir,'index.html'),`<main data-session-minutes="30">${identity} ${loops.join(' ')} reward growth progress</main>`);
  const evidencePath=path.join(root,'runtime.json');
  fs.writeFileSync(evidencePath,JSON.stringify({pass:true,approvedScopeFullyImplemented:true,scopeCoverage:{pass:true},mobileViewport:{touch:true},sessionDepthMinutes:30,multiplayer:{participants:0,meaningfulLoopPassed:false}},null,2));
  return {root,gameId,seedId,baselinePath,sourceDir,evidencePath,output:path.join(root,'strict.json')};
}
function runStrictFixture(fixture,mode='implementation'){
  return spawnSync(process.execPath,[path.resolve('tools/company-strict-production-review.mjs'),`--mode=${mode}`,`--game-id=${fixture.gameId}`,`--source=${fixture.sourceDir}`,`--evidence=${fixture.evidencePath}`,`--output=${fixture.output}`,`--baseline=${fixture.baselinePath}`],{cwd:fixture.root,encoding:'utf8',env:{...process.env,COMPANY_RUNTIME_BRANCH:'',COMPANY_STRICT_STATE_OUTPUT:path.join(fixture.root,'strict-state.json')}});
}

test('implementation strict review can use matching frozen design context when live seed is absent',()=>{
  const fixture=frozenStrictFixture();
  try{
    const run=runStrictFixture(fixture);
    assert.equal(run.status,0,`${run.stdout}\n${run.stderr}`);
    assert.doesNotMatch(`${run.stdout}\n${run.stderr}`,/STRICT_REVIEW_ACTIVE_SEED_REQUIRED/);
    const report=JSON.parse(fs.readFileSync(fixture.output,'utf8'));
    assert.equal(report.reviewStage,'IMPLEMENTATION_STRICT_REVIEW');
    assert.equal(report.evidence.reviewContextSource,'FROZEN_DESIGN_BASELINE');
    assert.equal(report.evidence.multiplayerDesignMode,'UNKNOWN');
    assert.ok(!report.hardFailures.includes('MULTIPLAYER_MISSING'));
  } finally {fs.rmSync(fixture.root,{recursive:true,force:true});}
});

test('frozen implementation context fails closed when cycle seed disagrees with baseline',()=>{
  const fixture=frozenStrictFixture({cycleSeedId:'SEED-MISMATCH'});
  try{
    const run=runStrictFixture(fixture);
    assert.notEqual(run.status,0);
    assert.match(`${run.stdout}\n${run.stderr}`,/STRICT_REVIEW_FROZEN_CONTEXT_SEED_MISMATCH/);
    assert.equal(fs.existsSync(fixture.output),false);
  } finally {fs.rmSync(fixture.root,{recursive:true,force:true});}
});

test('design strict review still requires a live active seed',()=>{
  const fixture=frozenStrictFixture();
  try{
    const run=runStrictFixture(fixture,'design');
    assert.notEqual(run.status,0);
    assert.match(`${run.stdout}\n${run.stderr}`,/STRICT_REVIEW_ACTIVE_SEED_REQUIRED/);
  } finally {fs.rmSync(fixture.root,{recursive:true,force:true});}
});
