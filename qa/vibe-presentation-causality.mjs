// 파일명: qa/vibe-presentation-causality.mjs
// 역할: Presentation Event의 결정성, 인과관계, 권한 격리, motion/VFX/audio/UI 실행 계약을 회귀 검사
import assert from 'node:assert/strict';
import {createVibePresentationEvent,compileVibePresentationEvents,routeVibePresentationEvent,createVibeAudioUIExecution,executeVibeAudioUIEvent} from '../assets/vibe-presentation-director.js';
import {createVibeMotionEffectExecution} from '../assets/vibe-motion-effects-director.js';

const base={sourceId:'player',targetId:'enemy-1',causeId:'cause_attack_1',timestamp:120,sequence:2,importance:'normal',payload:{animation:'attack',vfx:'slash',audio:'swing',camera:'shake',ui:'hit',damage:999,hp:0,reward:999}};
const first=createVibePresentationEvent('hit',base);
const second=createVibePresentationEvent('hit',base);
assert.equal(first.presentationEventId,second.presentationEventId,'same semantic presentation event must be deterministic');
assert.equal(first.causeId,'cause_attack_1','gameplay causality must survive presentation compilation');
assert.equal(first.authority,'presentation-only');
assert.equal(first.gameplayMutationAllowed,false);
assert.equal('damage' in first.payload,false,'gameplay damage must not enter presentation payload');
assert.equal('hp' in first.payload,false,'gameplay hp must not enter presentation payload');
assert.equal('reward' in first.payload,false,'gameplay reward must not enter presentation payload');
assert.deepEqual(Object.keys(first.payload).sort(),['animation','audio','camera','ui','vfx']);

const compiled=compileVibePresentationEvents([
 {event:'death',sourceId:'enemy-1',causeId:'cause_3',timestamp:300,sequence:0},
 {event:'attack',sourceId:'player',causeId:'cause_1',timestamp:100,sequence:1},
 {event:'hit',sourceId:'player',targetId:'enemy-1',causeId:'cause_2',timestamp:100,sequence:2}
]);
assert.deepEqual(compiled.map(x=>x.eventType),['attack','hit','death'],'presentation compiler must preserve deterministic temporal order');
assert.deepEqual(compiled.map(x=>x.causeId),['cause_1','cause_2','cause_3']);

const routed=[];
const route=routeVibePresentationEvent(first,{animation:e=>routed.push(['animation',e.causeId]),vfx:e=>routed.push(['vfx',e.causeId]),audio:e=>routed.push(['audio',e.causeId]),camera:e=>routed.push(['camera',e.causeId]),ui:e=>routed.push(['ui',e.causeId])});
assert.equal(route.handled,true);
assert.equal(routed.length,5,'hit must route all declared presentation channels');
assert.ok(routed.every(([,causeId])=>causeId==='cause_attack_1'));

const execution=createVibeMotionEffectExecution(first,{mobile:true,enemyCount:12});
assert.equal(execution.accepted,true);
assert.equal(execution.causeId,'cause_attack_1');
assert.equal(execution.authority,'presentation-only');
assert.equal(execution.gameplayMutationAllowed,false);
assert.ok(execution.commands.some(x=>x.channel==='animation'));
assert.ok(execution.commands.some(x=>x.channel==='vfx'));
assert.ok(execution.commands.some(x=>x.channel==='camera'));

const audioUI=createVibeAudioUIExecution(first,{muted:false,reducedMotion:true});
assert.equal(audioUI.accepted,true);
assert.equal(audioUI.causeId,'cause_attack_1');
assert.equal(audioUI.authority,'presentation-only');
assert.equal(audioUI.gameplayMutationAllowed,false);
assert.deepEqual(audioUI.commands.map(x=>x.channel),['audio','ui']);
assert.equal(audioUI.commands.find(x=>x.channel==='audio').cue,'swing');
assert.equal(audioUI.commands.find(x=>x.channel==='ui').cue,'hit');
assert.equal(audioUI.commands.find(x=>x.channel==='ui').reducedMotion,true);
const muted=createVibeAudioUIExecution(first,{muted:true});
assert.deepEqual(muted.commands.map(x=>x.channel),['ui'],'muted mode must suppress audio without suppressing UI');
const handled=[];
const audioUIResult=executeVibeAudioUIEvent(first,{audio:(command,event)=>handled.push([command.channel,event.causeId]),ui:(command,event)=>handled.push([command.channel,event.causeId])});
assert.equal(audioUIResult.handled,true);
assert.deepEqual(handled,[['audio','cause_attack_1'],['ui','cause_attack_1']]);

const rejected=createVibeMotionEffectExecution({...first,authority:'engine-resolved'});
assert.equal(rejected.accepted,false,'authoritative gameplay events must not bypass presentation compiler');
const audioUIRejected=createVibeAudioUIExecution({...first,gameplayMutationAllowed:true});
assert.equal(audioUIRejected.accepted,false,'audio/ui execution must reject gameplay mutation authority');

console.log('vibe-presentation-causality: ok');
