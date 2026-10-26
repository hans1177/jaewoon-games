// 파일명: qa/vibe-presentation-causality.mjs
// 역할: Presentation Event의 결정성, 인과관계, 권한 격리, motion/VFX/audio/UI 실행 계약을 회귀 검사
import assert from 'node:assert/strict';
import {createVibePresentationEvent,compileVibePresentationEvents,routeVibePresentationEvent,createVibeAudioUIExecution,executeVibeAudioUIEvent} from '../assets/vibe-presentation-director.js';
import {createVibeMotionEffectExecution,createVibeMotionProfile,planVibeMotionEffectsAutopilot,executeVibeMotionEngineEvent,createVibeCreatureRigPlayback} from '../assets/vibe-motion-effects-director.js';
import {createCommonCareerMotionLoadout,resolveCommonMotionGenre} from '../assets/vibe-motion-director.js';

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


// 그래픽·직업·스킬·이펙트는 하나의 렌더 이벤트에서만 결합하며, 게임 밸런스 권한은 없다.
const genres={
  JRPG:'JRPG',TRADITIONAL_RPG:'TRADITIONAL_RPG',ACTION:'ACTION_RPG',
  PUZZLE:'PUZZLE',ACTION_PUZZLE:'ACTION_PUZZLE',CASUAL:'CASUAL',
  ONLINE_RPG:'MMORPG',ROG:'ROGUELIKE'
};
for(const [request,expected] of Object.entries(genres)){
  assert.equal(resolveCommonMotionGenre(request),expected);
  const profile=createVibeMotionProfile('skill',{genre:request,mobile:true});
  assert.equal(profile.genre,expected);
  assert.equal(profile.gameplayAuthority,false);
  assert.ok(profile.visualLanguage.motion);
  assert.ok(profile.visualLanguage.readability);
}
assert.notEqual(createVibeMotionProfile('skill',{genre:'JRPG'}).visualLanguage.effects,
  createVibeMotionProfile('skill',{genre:'PUZZLE'}).visualLanguage.effects);

// 실제 직업 라이브러리에서 스킬의 동작·부위·VFX를 가져온다. 클립 실재/런타임 인증은 별개다.
for(const row of [
  ['SAMURAI','IAI_DRAW','CHARGE','JRPG'],
  ['MAGE','ARCANE_BOLT','PROJECTILE','TRADITIONAL_RPG'],
  ['PRIEST','GREATER_RESTORE','HEAL','JRPG'],
  ['ROGUE','ROGUE_DASH','DASH','ROG'],
  ['SUMMONER','SPIRIT_CALL','SUMMON','ONLINE_RPG'],
  ['DANCER','DANCE_CHAIN','COMBO','CASUAL']
]){
  const [careerId,skillId,kind,genre]=row;
  const source=createCommonCareerMotionLoadout({careerId,genre});
  assert.ok(source.skills.some(skill=>skill.id===skillId&&skill.kind===kind),row.join('/'));
  const event=createVibePresentationEvent('skill',{
    sourceId:'actor-1',causeId:'verified-game-skill-'+skillId,timestamp:60,
    payload:{careerId,skillId,genre,damage:888,hitbox:'forbidden',cooldown:0}
  });
  assert.equal('damage' in event.payload,false);
  assert.equal('hitbox' in event.payload,false);
  assert.equal('cooldown' in event.payload,false);
  const output=createVibeMotionEffectExecution(event,{mobile:true,enemyCount:20});
  assert.equal(output.accepted,true,skillId);
  assert.equal(output.genre,resolveCommonMotionGenre(genre));
  assert.equal(output.skillBinding.skillId,skillId);
  assert.equal(output.skillBinding.kind,kind);
  assert.equal(output.skillBinding.runtimeVerified,false);
  assert.equal(output.gameplayMutationAllowed,false);
  assert.ok(output.skillBinding.phases.includes('PREPARE'));
  assert.ok(output.skillBinding.phases.includes('RECOVERY'));
  assert.ok(output.commands.find(command=>command.channel==='vfx').effects.includes(output.skillBinding.vfxSlot));
  assert.equal(output.commands.find(command=>command.channel==='vfx').impact,null);
}
const badSkill=createVibePresentationEvent('skill',{payload:{genre:'JRPG',careerId:'SAMURAI',skillId:'NOT_A_REAL_SKILL'}});
assert.equal(createVibeMotionEffectExecution(badSkill).accepted,false);
assert.equal(createVibeMotionEffectExecution(badSkill).reason,'skill-not-in-career-motion-loadout');
const noCareer=createVibePresentationEvent('skill',{payload:{genre:'JRPG',skillId:'IAI_DRAW'}});
assert.equal(createVibeMotionEffectExecution(noCareer).accepted,false);
const prepared=planVibeMotionEffectsAutopilot({genre:'JRPG',careerId:'KENSEI',platform:'WEB'});
assert.ok(prepared.skillActions.some(skill=>skill.skillId==='IAI_DRAW'));
assert.ok(prepared.skillActions.some(skill=>skill.skillId==='KENSEI_FINAL_DRAW'));
assert.ok(prepared.skillActions.every(skill=>skill.nativeRuntimeVerified===false));
assert.equal(prepared.policy.noRuleMutation,true);

// 명중 증거가 없는 공격·스킬은 충돌 VFX가 발생하지 않는다.
const attack=createVibePresentationEvent('attack',{sourceId:'player',causeId:'swing-1'});
const attacking=createVibeMotionEffectExecution(attack);
assert.equal(attacking.commands.find(command=>command.channel==='vfx').effects.includes('contact-spark'),false);
const genericSkill=createVibePresentationEvent('skill',{sourceId:'player',causeId:'cast-1'});
assert.equal(createVibeMotionEffectExecution(genericSkill).commands.find(command=>command.channel==='vfx').effects.includes('impact-burst'),false);
assert.equal(createVibeMotionEffectExecution(first).commands.find(command=>command.channel==='vfx').impact.contact.confirmedContactRequired,true);

// 캐주얼·퍼즐은 확정된 게임 이벤트만 부드럽게 표현하며 공격 이벤트를 자체 생성하지 않는다.
const solved=createVibePresentationEvent('solve',{causeId:'authoritative-puzzle-solve',payload:{ui:'solved',hp:9000}});
assert.equal('hp' in solved.payload,false);
const solvedOutput=createVibeMotionEffectExecution(solved,{genre:'PUZZLE'});
assert.equal(solvedOutput.accepted,true);
assert.equal(solvedOutput.commands.some(command=>command.channel==='camera'),false);
assert.ok(solvedOutput.commands.some(command=>command.channel==='vfx'));
assert.equal(createVibeMotionProfile('heal',{genre:'CASUAL'}).camera.shake,'none');

// 온라인의 동일 시퀀스 이벤트 중복은 1회로 합치되 별도의 타격 시퀀스는 보존한다.
const online=compileVibePresentationEvents([
  {event:'hit',sourceId:'ally-1',targetId:'boss',causeId:'remote-attack-7',timestamp:100,sequence:2},
  {event:'hit',sourceId:'ally-1',targetId:'boss',causeId:'remote-attack-7',timestamp:100,sequence:2},
  {event:'hit',sourceId:'ally-1',targetId:'boss',causeId:'remote-attack-7',timestamp:100,sequence:3}
]);
assert.equal(online.length,2);
assert.notEqual(online[0].presentationEventId,online[1].presentationEventId);

// 액션 도중에는 기존 이동 보간 상태가 끊기지 않고, 회복 기술이 공격을 재생하지 않는다.
const bridgeCalls=[];
const bridge={
  ready:true,
  rig:{
    setMotionState:args=>bridgeCalls.push(['move',args.moving]),
    setLod:()=>{},triggerAttack:()=>bridgeCalls.push(['attack']),
    triggerHit:()=>bridgeCalls.push(['hit']),triggerContact:()=>bridgeCalls.push(['contact']),
    triggerLand:()=>bridgeCalls.push(['land'])
  },
  camera:{impulse:()=>bridgeCalls.push(['camera'])}
};
executeVibeMotionEngineEvent(attack,bridge,{speed:3});
assert.equal(bridgeCalls.some(call=>call[0]==='move'),false);
assert.equal(bridgeCalls.some(call=>call[0]==='attack'),true);
bridgeCalls.length=0;
executeVibeMotionEngineEvent(createVibePresentationEvent('skill',{
  payload:{genre:'JRPG',careerId:'PRIEST',skillId:'GREATER_RESTORE'}
}),bridge);
assert.equal(bridgeCalls.some(call=>call[0]==='attack'),false);
assert.equal(bridgeCalls.some(call=>call[0]==='camera'),false);
bridgeCalls.length=0;
executeVibeMotionEngineEvent(createVibePresentationEvent('move'),bridge,{speed:3});
assert.deepEqual(bridgeCalls,[['move',true]]);


// CC0 원본은 웹/로블록스에서 라이선스와 출처만 재사용한다.
// 실제 GLB→로블록스 Animator 변환 및 모바일 실행 검증은 무조건 별개다.
for(const platform of ['WEB','ROBLOX']){
  const loadout=createCommonCareerMotionLoadout({careerId:'SAMURAI',genre:'ACTION_RPG',platform});
  const reuse=loadout.cc0PlatformReuse;
  assert.equal(reuse.sourcePath,loadout.master.path);
  assert.equal(reuse.license,'CC0-1.0');
  assert.equal(reuse.targetPlatform,platform);
  assert.equal(reuse.cacheAssetById,true);
  assert.equal(reuse.cacheAnimationClipsBySource,true);
  assert.equal(reuse.crossPlatformNativeBinaryReuseAllowed,false);
  assert.equal(reuse.runtimeBindingVerified,false);
  assert.equal(reuse.performanceVerified,false);
  assert.equal(reuse.actualConvertedClipCountVerified,0);
  assert.equal(reuse.mobilePresentation.keepGameplayUpdateUnchanged,true);
  assert.ok(reuse.releaseRequired.includes('ACTUAL_MOBILE_FPS'));
  assert.equal(platform==='ROBLOX',reuse.platformBinding.includes('ROBLOX_STUDIO'));
}
const planned=planVibeMotionEffectsAutopilot({genre:'ACTION_RPG',careerId:'SAMURAI',platform:'WEB'});
assert.equal(planned.cc0PlatformReuse.targetPlatform,'WEB');
assert.equal(planned.runtimeVerified,false);

const strikeVariants=[
  ['KATANA','SLASH'],['SPEAR','THRUST'],['AXE','CLEAVE'],
  ['UNARMED','PUNCH'],['STAFF_OR_WAND','CAST']
];
for(const [weaponFamily,style] of strikeVariants){
  const event=createVibePresentationEvent('attack',{causeId:'game-attack-'+weaponFamily,payload:{weaponFamily,comboIndex:2,motionStyle:''}});
  const execution=createVibeMotionEffectExecution(event);
  assert.equal(execution.motionStyle,style,weaponFamily);
  assert.equal(execution.commands.find(row=>row.channel==='animation').motionStyle,style);
  assert.equal(execution.gameplayMutationAllowed,false);
}
const styleOverride=createVibePresentationEvent('attack',{
  causeId:'authoritative-martial-hit',payload:{weaponFamily:'UNARMED',motionStyle:'KICK',comboIndex:12345,damage:9999}
});
assert.equal(styleOverride.payload.motionStyle,'KICK');
assert.equal(styleOverride.payload.comboIndex,15);
assert.equal('damage' in styleOverride.payload,false);
assert.equal(createVibeMotionEffectExecution(styleOverride).motionStyle,'KICK');
const styleCalls=[];
executeVibeMotionEngineEvent(styleOverride,{
  ready:true,
  rig:{
    setMotionState:()=>{throw Error('attack must preserve movement state');},
    setLod:()=>{},triggerAttack:row=>styleCalls.push(row),
    triggerHit:()=>{},triggerContact:()=>{},triggerLand:()=>{}
  },camera:{impulse:()=>{}}
});
assert.deepEqual(styleCalls.map(x=>[x.style,x.comboIndex]),[['KICK',15]]);


// 기존 대전격투 동작팩과 종별 관절 키포즈를 소스 레벨에서 재사용하는지 검사한다.
const meleePlan=planVibeMotionEffectsAutopilot({genre:'ACTION_RPG',careerId:'SAMURAI',platform:'WEB'});
assert.ok(meleePlan.combatActions.length>6);
assert.ok(meleePlan.combatActions.some(row=>row.group==='lightCombo'));
assert.ok(meleePlan.combatActions.some(row=>row.group==='finisher'));
assert.ok(meleePlan.combatActions.every(row=>row.sourcePack==='EXISTING_DUEL_COMBAT_MOTION_LIBRARY'&&row.nativeRuntimeVerified===false));
const wildPlan=planVibeMotionEffectsAutopilot({genre:'SURVIVAL',speciesId:'WOLF',monsterTier:'ELITE',platform:'ROBLOX'});
assert.ok(wildPlan.creatureActions.length>2);
assert.ok(wildPlan.creatureActions.some(row=>row.group==='attacks'));
assert.ok(wildPlan.creatureActions.every(row=>row.bodyPlan&&row.jointTracks.length>=2&&row.actualNativeRigBindingRequired===true));
assert.ok(wildPlan.creatureActions.every(row=>row.runtimeVerified===false&&row.gameplayAuthority===false));


// 종족별 60 관절 모션·정예 보스 50패턴이 기존 이벤트 연출 큐로 실제 전달되는지 확인.
for(const [speciesId,tier] of [['WOLF','NORMAL'],['SPIDER','ELITE'],['WYVERN','BOSS'],['GHOST','BOSS']]){
  const creaturePlan=planVibeMotionEffectsAutopilot({speciesId,monsterTier:tier,genre:'ACTION_RPG',platform:'ROBLOX'});
  const motion60=creaturePlan.creatureActions.filter(row=>row.source==='DETAILED_BODY_PLAN_60');
  const tierPatterns=creaturePlan.creatureActions.filter(row=>row.source==='ELITE_BOSS_PRESENTATION_50');
  assert.equal(motion60.length,60,speciesId+':'+tier);
  assert.equal(tierPatterns.length,tier==='NORMAL'?0:50,speciesId+':'+tier);
  assert.ok(motion60.every(row=>row.jointTracks.length===3&&row.actualNativeRigBindingRequired));
  assert.ok(tierPatterns.every(row=>row.steps.length===3&&row.nativeAssetVerified===false));
  assert.equal(creaturePlan.runtimeVerified,false);
}
const wolfMotionPlan=planVibeMotionEffectsAutopilot({speciesId:'WOLF',monsterTier:'ELITE',platform:'WEB'});
const wolfMotion=wolfMotionPlan.creatureActions.find(row=>row.source==='DETAILED_BODY_PLAN_60'&&row.group==='attacks');
const wolfDeath=wolfMotionPlan.creatureActions.find(row=>row.source==='DETAILED_BODY_PLAN_60'&&row.group==='deaths');
const nativeMap=Object.fromEntries([...new Set(wolfMotionPlan.creatureActions
  .flatMap(row=>row.jointTracks.map(track=>track.part)))].map(part=>[part,{nativeBone:part}]));
const verifiedRig={bodyPlan:'QUADRUPED_CANINE',joints:nativeMap,assetAuthorization:{
  approved:true,sourceAssetId:'user-approved-cc0-wolf-mesh',
  sourceHash:'existing-project-original-hash',licenseVerified:true
}};
const output=[];
assert.equal(createVibeCreatureRigPlayback({speciesId:'WOLF'}).ready,false);
assert.equal(createVibeCreatureRigPlayback({
  speciesId:'WOLF',rig:{...verifiedRig,assetAuthorization:null},applyJointPose:()=>{}
}).reason,'approved-real-rig-provenance-or-place-access-missing');
assert.equal(createVibeCreatureRigPlayback({
  speciesId:'WOLF',rig:{...verifiedRig,bodyPlan:'HEXAPOD_INSECT'},applyJointPose:()=>{}
}).reason,'native-rig-body-plan-mismatch');
assert.equal(createVibeCreatureRigPlayback({
  speciesId:'WOLF',rig:{...verifiedRig,joints:{FORELEGS:nativeMap.FORELEGS}},applyJointPose:()=>{}
}).reason,'articulated-rig-channels-missing');
assert.equal(createVibeCreatureRigPlayback({
  speciesId:'WOLF',platform:'ROBLOX',rig:verifiedRig,applyJointPose:()=>{}
}).reason,'approved-real-rig-provenance-or-place-access-missing');
const playback=createVibeCreatureRigPlayback({
  speciesId:'WOLF',platform:'WEB',rig:verifiedRig,
  applyJointPose:(bone,angles,metadata)=>output.push({bone,angles,metadata})
});
assert.equal(playback.ready,true);
assert.equal(playback.runtimeVerified,false,'binding does not certify native playback');
assert.equal(playback.supportedMotionIds.length,60);
const swing=createVibePresentationEvent('attack',{sourceId:'wolf',causeId:'confirmed-swing'});
assert.equal(playback.play(swing,wolfDeath.id).reason,'creature-motion-event-group-mismatch');
assert.equal(playback.play({...swing,authority:'gameplay'},wolfMotion.id).accepted,false);
assert.equal(playback.play(swing,'UNDECLARED_ACTION').accepted,false);
assert.equal(playback.play(swing,wolfMotion.id,{durationSeconds:0}).accepted,false);
assert.equal(playback.play(swing,wolfMotion.id,{durationSeconds:1}).accepted,true);
assert.equal(playback.tick(-1).applied,false);
const firstPose=playback.tick(.125);
assert.equal(firstPose.applied,true);
assert.equal(firstPose.jointCount,3);
assert.equal(output.length,3);
assert.ok(output.every(row=>Number.isFinite(row.angles[0])
  &&row.metadata.authority==='presentation-only'&&row.metadata.causeId==='confirmed-swing'));
for(let i=0;i<7;i++)playback.tick(.125);
assert.equal(playback.tick(.1).reason,'no-accepted-motion');
const defeated=createVibePresentationEvent('death',{sourceId:'wolf',causeId:'confirmed-defeat'});
assert.equal(playback.play(defeated,wolfDeath.id,{durationSeconds:.4}).accepted,true);
const settled=playback.tick(.25);
assert.equal(settled.applied,true);
const finalDeath=playback.tick(.15);
assert.equal(finalDeath.holdsDeathPose,true);
assert.ok(output.slice(-3).some(row=>row.angles.some(angle=>Math.abs(angle)>.01)));
assert.equal(playback.tick(.01).holdsDeathPose,true);
playback.stop();
assert.equal(playback.tick(.1).applied,false);

console.log('vibe-presentation-causality: ok');
