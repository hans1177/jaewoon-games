// 파일명: qa/company-development-web-runtime.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBootstrapHtml,buildContractSafePlayable,inferDevelopmentGenre,hasCinematicIntent} from '../tools/company-development-web-bootstrap.mjs';
import {evaluateGameplayEvidence} from '../tools/company-development-web-gameplay-validation.mjs';

const cinematicPlayable=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body data-audio-state="locked" data-cinematic-applicable="true" data-intro-state="visible" data-intro-handoff="pending"><section id="intro" data-intro-screen="visible"><button data-intro-control="continue">Start</button><button data-intro-control="skip">Skip</button></section><h1>Test</h1><p id="status">score 0</p><button id="act">Act</button><button data-audio-control="mute">Mute</button><input data-audio-control="volume" type="range"><script>let score=0,ctx=null;function dismissIntro(mode){document.querySelector('#intro').hidden=true;document.body.dataset.introState=mode;document.body.dataset.introHandoff='ready'}document.querySelectorAll('[data-intro-control]').forEach(button=>button.addEventListener('click',()=>dismissIntro(button.dataset.introControl==='skip'?'skipped':'continued')));async function audio(){const AC=window.AudioContext||window.webkitAudioContext;ctx=ctx||new AC();if(ctx.state==='suspended')await ctx.resume();document.body.dataset.audioState='running'}document.querySelector('#act').addEventListener('click',async()=>{if(document.body.dataset.introState==='visible')return;await audio();document.body.dataset.introHandoff='gameplay-input';score++;document.querySelector('#status').textContent='score '+score;});</script>${'x'.repeat(1600)}</body></html>`;
const directPlayable=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body data-audio-state="locked" data-cinematic-applicable="false" data-intro-state="not-applicable" data-intro-handoff="ready"><h1>Test</h1><p id="status">score 0</p><button id="act">Act</button><button data-audio-control="mute">Mute</button><input data-audio-control="volume" type="range"><script>let score=0,ctx=null;async function audio(){const AC=window.AudioContext||window.webkitAudioContext;ctx=ctx||new AC();if(ctx.state==='suspended')await ctx.resume();document.body.dataset.audioState='running'}document.querySelector('#act').addEventListener('click',async()=>{await audio();document.body.dataset.introHandoff='gameplay-input';score++;document.querySelector('#status').textContent='score '+score;});</script>${'x'.repeat(1600)}</body></html>`;

test('bootstrap contract accepts both cinematic and direct-to-gameplay presentation modes',()=>{
  for(const html of [cinematicPlayable,directPlayable]){
    const result=validateBootstrapHtml(html);
    assert.equal(result.pass,true,result.blockers.join(','));
  }
});

test('bootstrap contract rejects external network and persistent storage',()=>{
  const bad=directPlayable.replace('</script>',";localStorage.setItem('x','1');fetch('https://example.com/x');</script>");
  const result=validateBootstrapHtml(bad);
  assert.equal(result.pass,false);
  assert.ok(result.blockers.includes('PERSISTENT_STORAGE_FORBIDDEN_ON_BOOTSTRAP'));
  assert.ok(result.blockers.includes('NETWORK_API_FORBIDDEN'));
});

test('bootstrap contract rejects malformed inline JavaScript before browser runtime',()=>{
  const malformed=directPlayable.replace('});</script>','});if(true){</script>');
  const result=validateBootstrapHtml(malformed);
  assert.equal(result.pass,false);
  assert.ok(result.blockers.includes('INLINE_SCRIPT_SYNTAX_INVALID'));
});

test('bootstrap contract requires mobile viewport, music controls and cinematic applicability state',()=>{
  const noViewport=directPlayable.replace('<meta name="viewport" content="width=device-width,initial-scale=1">','');
  assert.ok(validateBootstrapHtml(noViewport).blockers.includes('MOBILE_VIEWPORT_REQUIRED'));
  const noMute=directPlayable.replace('data-audio-control="mute"','data-x="mute"');
  assert.ok(validateBootstrapHtml(noMute).blockers.includes('MUSIC_MUTE_CONTROL_REQUIRED'));
  const noVolume=directPlayable.replace('data-audio-control="volume"','data-x="volume"');
  assert.ok(validateBootstrapHtml(noVolume).blockers.includes('MUSIC_VOLUME_CONTROL_REQUIRED'));
  const noApplicability=directPlayable.replace('data-cinematic-applicable="false"','data-x-cinematic-applicable="false"');
  assert.ok(validateBootstrapHtml(noApplicability).blockers.includes('CINEMATIC_APPLICABILITY_STATE_REQUIRED'));
});

test('cinematic controls are required only when cinematic content is applicable',()=>{
  const noControl=cinematicPlayable.replaceAll('data-intro-control','data-x-intro-control');
  assert.ok(validateBootstrapHtml(noControl).blockers.includes('CINEMATIC_SKIP_OR_CONTINUE_CONTROL_REQUIRED'));
  const direct=validateBootstrapHtml(directPlayable);
  assert.equal(direct.pass,true,direct.blockers.join(','));
  assert.equal(direct.cinematicApplicable,false);
});

test('contract recovery infers the locked GAME_SEED genre instead of inventing a new class',()=>{
  const cases={ACTION_SURVIVAL_ROGUELITE:'SEED-ACTION_SURVIVAL_ROGUELITE-001',SINGLE_DEFENSE_STRATEGY:'SEED-SINGLE_DEFENSE_STRATEGY-001',PUZZLE:'SEED-PUZZLE-001',CASUAL:'SEED-CASUAL-001',IDLE_GROWTH_RPG:'SEED-IDLE_GROWTH_RPG-001',STORY_COMPLETE_RPG:'SEED-STORY_COMPLETE_RPG-001'};
  for(const [genre,gameSeedId] of Object.entries(cases))assert.equal(inferDevelopmentGenre({baseline:{gameSeedId}}),genre);
});

test('cinematic intent is derived from design evidence instead of being forced on every game',()=>{
  assert.equal(hasCinematicIntent({content:{identity:'Direct Action',coreLoop:['play']}}),false);
  assert.equal(hasCinematicIntent({content:{identity:'Story',openingDirection:'컷신으로 시작'}}),true);
});

test('deterministic recovery does not invent cinematic content for designs without it',()=>{
  const cases=[['ACTION_SURVIVAL_ROGUELITE','생존 전투'],['SINGLE_DEFENSE_STRATEGY','방어 전략'],['PUZZLE','퍼즐'],['CASUAL','캐주얼'],['IDLE_GROWTH_RPG','성장 RPG'],['STORY_COMPLETE_RPG','스토리 RPG']];
  const htmls=[];
  for(const [genre,label] of cases){
    const baseline={gameSeedId:`SEED-${genre}-001`,content:{identity:`${genre} Test`,coreFun:`${label} 핵심 재미`,coreLoop:[`${label} 핵심 루프를 실제 입력으로 검증한다.`]}};
    const recovered=buildContractSafePlayable({gameId:`seed-${genre.toLowerCase()}`,gameName:`${genre} Test`,baseline});
    const contract=validateBootstrapHtml(recovered.html);
    assert.equal(recovered.generationMode,'DETERMINISTIC_CONTRACT_RECOVERY');
    assert.equal(recovered.cinematicApplicable,false);
    assert.equal(contract.pass,true,`${genre}: ${contract.blockers.join(',')}`);
    assert.match(recovered.html,new RegExp(label));
    assert.match(recovered.html,/data-state="ready"/);
    assert.match(recovered.html,/data-audio-state="locked"/);
    assert.match(recovered.html,/data-cinematic-applicable="false"/);
    assert.doesNotMatch(recovered.html,/data-intro-screen="visible"/);
    assert.doesNotMatch(recovered.html,/\b(?:localStorage|sessionStorage)\b/);
    assert.doesNotMatch(recovered.html,/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/);
    htmls.push(recovered.html);
  }
  assert.equal(new Set(htmls).size,6,'each genre recovery must remain mechanically distinct');
});

test('deterministic recovery preserves cinematic intent when the baseline contains it',()=>{
  const baseline={gameSeedId:'SEED-STORY_COMPLETE_RPG-001',content:{identity:'Story Test',coreFun:'story',coreLoop:['explore'],openingDirection:'첫 장면은 컷신으로 시작'}};
  const recovered=buildContractSafePlayable({gameId:'story-test',gameName:'Story Test',baseline});
  assert.equal(recovered.cinematicApplicable,true);
  assert.match(recovered.html,/data-cinematic-applicable="true"/);
  assert.match(recovered.html,/data-intro-screen="visible"/);
  assert.match(recovered.html,/data-intro-control="skip"/);
  const contract=validateBootstrapHtml(recovered.html);
  assert.equal(contract.pass,true,contract.blockers.join(','));
});

test('gameplay evidence passes direct gameplay without forcing intro or cutscene',()=>{
  const before={text:'score 0',visibleButtons:3,canvases:[],dataState:[],audioState:'locked',muteControls:1,volumeControls:1,cinematicApplicable:false,cinematicFlag:'false',introVisible:false,introState:'not-applicable',introHandoff:'ready',introControls:0,scrollWidth:390,viewportWidth:390};
  const after={...before,text:'score 3',audioState:'running',introHandoff:'gameplay-input'};
  const pass=evaluateGameplayEvidence({before,afterIntro:before,after,interactionCount:3,reloadVisible:true});
  assert.equal(pass.pass,true,pass.blockers.join(','));
  assert.equal(pass.musicRuntime.pass,true);
  assert.equal(pass.cinematicRuntime.pass,true);
  assert.equal(pass.cinematicRuntime.notApplicable,true);
});

test('gameplay evidence validates cinematic handoff when cinematic content exists',()=>{
  const before={text:'opening score 0',visibleButtons:5,canvases:[],dataState:[],audioState:'locked',muteControls:1,volumeControls:1,cinematicApplicable:true,cinematicFlag:'true',introVisible:true,introState:'visible',introHandoff:'pending',introControls:2,scrollWidth:390,viewportWidth:390};
  const afterIntro={...before,text:'score 0',introVisible:false,introState:'continued',introHandoff:'ready',introControls:0};
  const after={...afterIntro,text:'score 3',audioState:'running',introHandoff:'gameplay-input'};
  const pass=evaluateGameplayEvidence({before,afterIntro,after,introInteractionCount:1,interactionCount:3,reloadVisible:true});
  assert.equal(pass.pass,true,pass.blockers.join(','));
  assert.equal(pass.cinematicRuntime.pass,true);
  const cinematicFail=evaluateGameplayEvidence({before,afterIntro,after:{...after,introHandoff:'ready'},introInteractionCount:1,interactionCount:3,reloadVisible:true});
  assert.equal(cinematicFail.pass,false);
  assert.ok(cinematicFail.blockers.includes('CINEMATIC_FIRST_MEANINGFUL_INPUT_HANDOFF_REQUIRED'));
});
