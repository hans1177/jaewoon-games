// 파일명: qa/company-development-web-runtime.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBootstrapHtml,buildContractSafePlayable,inferDevelopmentGenre} from '../tools/company-development-web-bootstrap.mjs';
import {evaluateGameplayEvidence} from '../tools/company-development-web-gameplay-validation.mjs';

const playable=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body data-audio-state="locked" data-intro-state="visible" data-intro-handoff="pending"><section id="intro" data-intro-screen="visible"><button data-intro-control="continue">Start</button><button data-intro-control="skip">Skip</button></section><h1>Test</h1><p id="status">score 0</p><button id="act">Act</button><button data-audio-control="mute">Mute</button><input data-audio-control="volume" type="range"><script>let score=0,ctx=null;function dismissIntro(mode){document.querySelector('#intro').hidden=true;document.body.dataset.introState=mode;document.body.dataset.introHandoff='ready'}document.querySelectorAll('[data-intro-control]').forEach(button=>button.addEventListener('click',()=>dismissIntro(button.dataset.introControl==='skip'?'skipped':'continued')));async function audio(){const AC=window.AudioContext||window.webkitAudioContext;ctx=ctx||new AC();if(ctx.state==='suspended')await ctx.resume();document.body.dataset.audioState='running'}document.querySelector('#act').addEventListener('click',async()=>{if(document.body.dataset.introState==='visible')return;await audio();document.body.dataset.introHandoff='gameplay-input';score++;document.querySelector('#status').textContent='score '+score;});</script>${'x'.repeat(1600)}</body></html>`;

test('bootstrap contract accepts self-contained gameplay plus user-gesture music and intro runtime',()=>{
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

test('bootstrap contract requires mobile viewport, music controls and intro handoff controls',()=>{
  const noViewport=playable.replace('<meta name="viewport" content="width=device-width,initial-scale=1">','');
  assert.ok(validateBootstrapHtml(noViewport).blockers.includes('MOBILE_VIEWPORT_REQUIRED'));
  const noMute=playable.replace('data-audio-control="mute"','data-x="mute"');
  assert.ok(validateBootstrapHtml(noMute).blockers.includes('MUSIC_MUTE_CONTROL_REQUIRED'));
  const noVolume=playable.replace('data-audio-control="volume"','data-x="volume"');
  assert.ok(validateBootstrapHtml(noVolume).blockers.includes('MUSIC_VOLUME_CONTROL_REQUIRED'));
  const noIntro=playable.replace('data-intro-state="visible"','data-x-intro-state="visible"');
  assert.ok(validateBootstrapHtml(noIntro).blockers.includes('INTRO_FIRST_ENTRY_STATE_REQUIRED'));
  const noIntroControl=playable.replaceAll('data-intro-control','data-x-intro-control');
  assert.ok(validateBootstrapHtml(noIntroControl).blockers.includes('INTRO_SKIP_OR_CONTINUE_CONTROL_REQUIRED'));
});

test('contract recovery infers the locked GAME_SEED genre instead of inventing a new class',()=>{
  const cases={ACTION_SURVIVAL_ROGUELITE:'SEED-ACTION_SURVIVAL_ROGUELITE-001',SINGLE_DEFENSE_STRATEGY:'SEED-SINGLE_DEFENSE_STRATEGY-001',PUZZLE:'SEED-PUZZLE-001',CASUAL:'SEED-CASUAL-001',IDLE_GROWTH_RPG:'SEED-IDLE_GROWTH_RPG-001',STORY_COMPLETE_RPG:'SEED-STORY_COMPLETE_RPG-001'};
  for(const [genre,gameSeedId] of Object.entries(cases))assert.equal(inferDevelopmentGenre({baseline:{gameSeedId}}),genre);
});

test('deterministic recovery creates strict gameplay music and intro slices for all six seed categories',()=>{
  const cases=[['ACTION_SURVIVAL_ROGUELITE','생존 전투'],['SINGLE_DEFENSE_STRATEGY','방어 전략'],['PUZZLE','퍼즐'],['CASUAL','캐주얼'],['IDLE_GROWTH_RPG','성장 RPG'],['STORY_COMPLETE_RPG','스토리 RPG']];
  const htmls=[];
  for(const [genre,label] of cases){
    const baseline={gameSeedId:`SEED-${genre}-001`,content:{identity:`${genre} Test`,coreFun:`${label} 핵심 재미`,coreLoop:[`${label} 핵심 루프를 실제 입력으로 검증한다.`]}};
    const recovered=buildContractSafePlayable({gameId:`seed-${genre.toLowerCase()}`,gameName:`${genre} Test`,baseline});
    const contract=validateBootstrapHtml(recovered.html);
    assert.equal(recovered.generationMode,'DETERMINISTIC_CONTRACT_RECOVERY');
    assert.equal(contract.pass,true,`${genre}: ${contract.blockers.join(',')}`);
    assert.match(recovered.html,new RegExp(label));
    assert.match(recovered.html,/data-state="ready"/);
    assert.match(recovered.html,/data-audio-state="locked"/);
    assert.match(recovered.html,/AudioContext/);
    assert.match(recovered.html,/data-audio-control="mute"/);
    assert.match(recovered.html,/data-audio-control="volume"/);
    assert.match(recovered.html,/data-intro-state="visible"/);
    assert.match(recovered.html,/data-intro-handoff="pending"/);
    assert.match(recovered.html,/data-intro-control="continue"/);
    assert.match(recovered.html,/data-intro-control="skip"/);
    assert.doesNotMatch(recovered.html,/\b(?:localStorage|sessionStorage)\b/);
    assert.doesNotMatch(recovered.html,/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/);
    htmls.push(recovered.html);
  }
  assert.equal(new Set(htmls).size,6,'each genre recovery must remain mechanically distinct');
});

test('gameplay evidence requires real interaction, intro handoff and music runtime transition',()=>{
  const before={text:'intro score 0',visibleButtons:5,canvases:[],dataState:[],audioState:'locked',muteControls:1,volumeControls:1,introVisible:true,introState:'visible',introHandoff:'pending',introControls:2,scrollWidth:390,viewportWidth:390};
  const afterIntro={...before,text:'score 0',introVisible:false,introState:'continued',introHandoff:'ready',introControls:0};
  const after={...afterIntro,text:'score 3',audioState:'running',introHandoff:'gameplay-input'};
  const pass=evaluateGameplayEvidence({before,afterIntro,after,introInteractionCount:1,interactionCount:3,reloadVisible:true});
  assert.equal(pass.pass,true,pass.blockers.join(','));
  assert.equal(pass.musicRuntime.pass,true);
  assert.equal(pass.introRuntime.pass,true);
  const musicFail=evaluateGameplayEvidence({before,afterIntro,after:{...after,audioState:'locked'},introInteractionCount:1,interactionCount:3,reloadVisible:true});
  assert.equal(musicFail.pass,false);
  assert.ok(musicFail.blockers.includes('MUSIC_USER_GESTURE_RUNTIME_REQUIRED'));
  const introFail=evaluateGameplayEvidence({before,afterIntro,after:{...after,introHandoff:'ready'},introInteractionCount:1,interactionCount:3,reloadVisible:true});
  assert.equal(introFail.pass,false);
  assert.ok(introFail.blockers.includes('INTRO_FIRST_MEANINGFUL_INPUT_HANDOFF_REQUIRED'));
});
