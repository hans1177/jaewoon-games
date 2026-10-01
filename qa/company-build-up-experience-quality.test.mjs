// Cross-platform holistic experience BUILD_UP contract.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  EXPERIENCE_BUILD_UP_TRACKS,
  PLATFORM_EXPERIENCE_PROFILES,
  buildGameSpecificBuildUpDirective,
  directivePrompt,
  inspectGameSource,
} from '../tools/company-build-up-directive.mjs';

const sourceObservation=(overrides={})=>({
  sourceRoot:'roblox-games/test-game',
  sourceTreeFingerprint:'sha256:test-source',
  fileCount:4,
  sourceBytes:1024,
  largestFileBytes:512,
  topFiles:[{file:'client/Game.client.luau',score:10}],
  sourceAnchors:[{file:'client/Game.client.luau',line:10,kind:'FUNCTION',symbol:'render',context:'render player feedback',score:10}],
  observations:[],
  signals:{
    combat:6,progression:6,ai:3,save:3,multiplayer:2,
    animation:1,motionStates:2,gameFeel:1,vfx:1,camera:0,
    audio:1,audioDynamics:0,
    ui:6,uiFlow:1,entryFlow:1,loadingFlow:1,input:5,map:5,landmark:2,interaction:4,
    inventory:6,equipment:3,settings:2,feedback:3,session:4,content:12,choice:3,connection:3,
    performance:3,lighting:1,primitive:0,todo:0,errorRecovery:3,
    ...overrides,
  },
});

const design={
  content:{
    identity:'테스트 생존 게임',
    coreFun:'탐험과 전투',
    coreLoop:['탐험','전투','보상','장비 교체'],
    progressionDirection:'새 지역과 장비 조합',
    signatureSystems:[
      {name:'위험 탐험',purpose:'지역 위험을 읽고 이동',playerChoice:'진입 또는 우회'},
      {name:'장비 조합',purpose:'획득 장비를 비교하고 교체',playerChoice:'장착 선택'},
    ],
    multiplayerMode:'OPTIONAL_COOP',
  }
};

test('common experience buildup covers all requested player-facing systems',()=>{
  assert.deepEqual(EXPERIENCE_BUILD_UP_TRACKS,[
    'MOTION_AND_ACTING',
    'COMBAT_AND_PRIMARY_ACTION_FEEL',
    'UI_HUD_AND_MENU',
    'INVENTORY_AND_EQUIPMENT',
    'AUDIO_MUSIC_AND_FEEDBACK',
    'VFX_CAMERA_AND_IMPACT_SYNC',
    'WORLD_VISUAL_COHESION',
    'MOBILE_TOUCH_AND_ACCESSIBILITY',
    'PERFORMANCE_AND_RUNTIME_STABILITY',
  ]);
  assert.equal(PLATFORM_EXPERIENCE_PROFILES.COMMON.presenceOnlyPassForbidden,true);
  assert.equal(PLATFORM_EXPERIENCE_PROFILES.COMMON.weakestTrackBatchSize,3);
  assert.equal(PLATFORM_EXPERIENCE_PROFILES.ROBLOX.attention,'EXTRA');
  assert.equal(PLATFORM_EXPERIENCE_PROFILES.UNITY.attention,'HIGH');
  assert.equal(PLATFORM_EXPERIENCE_PROFILES.WEB.attention,'STANDARD');
});

test('Roblox BUILD_UP gives motion UI inventory audio VFX camera extra native attention',()=>{
  const directive=buildGameSpecificBuildUpDirective({
    gameId:'test-game',
    gameName:'테스트 생존 게임',
    platform:'ROBLOX',
    designRecord:design,
    sourceObservation:sourceObservation(),
    qualitySignals:['motion weak','audio weak','inventory ui weak'],
  });
  const experience=directive.experienceBuildUpContract;
  assert.equal(experience.platform,'ROBLOX');
  assert.equal(experience.attention,'EXTRA');
  assert.equal(experience.robloxExtra.priority,'EXTRA_ATTENTION');
  assert.equal(experience.robloxExtra.motion.articulatedActorsRequireJointMotion,true);
  assert.equal(experience.robloxExtra.motion.rootOnlyLocomotionCannotPass,true);
  assert.ok(experience.robloxExtra.motion.requiredStateIntent.includes('ATTACK_ANTICIPATION'));
  assert.ok(experience.robloxExtra.motion.requiredStateIntent.includes('HIT_REACTION'));
  assert.equal(experience.robloxExtra.uiAndInventory.minimumTouchTargetPxEquivalent,44);
  assert.deepEqual(experience.robloxExtra.uiAndInventory.inventoryFlowWhenApplicable,[
    'ACQUIRE','COMPARE','SELECT','EQUIP','UNEQUIP_OR_REPLACE','CURRENT_EQUIPPED_INDICATOR','WORLD_OR_CHARACTER_FEEDBACK'
  ]);
  assert.equal(experience.robloxExtra.audio.ownerDisabledCategoriesPreserved,true);
  assert.equal(experience.robloxExtra.audio.spatialWorldAudioUsesRolloffWhenApplicable,true);
  assert.equal(experience.robloxExtra.audio.bgmRegionStateCombatTransitionsRequiredWhenMultipleContextsExist,true);
  assert.equal(experience.robloxExtra.runtimeEvidence.officialStudioMcpRequired,true);
  assert.equal(experience.robloxExtra.runtimeEvidence.sourceMarkersAloneCannotPass,true);
  assert.ok(experience.weakestTracks.includes('MOTION_AND_ACTING'));
  assert.ok(experience.weakestTracks.includes('AUDIO_MUSIC_AND_FEEDBACK'));
  assert.ok(experience.weakestTracks.includes('COMBAT_AND_PRIMARY_ACTION_FEEL'));
  assert.deepEqual(experience.priorityOrder.slice(0,3),[
    'MOTION_AND_ACTING','AUDIO_MUSIC_AND_FEEDBACK','COMBAT_AND_PRIMARY_ACTION_FEEL'
  ]);
  const audioRow=directive.allDomainImplementationDirectives.find(row=>row.domain==='AUDIO_MUSIC_SFX');
  const inventoryRow=directive.allDomainImplementationDirectives.find(row=>row.domain==='INVENTORY_USABILITY');
  assert.ok(['FIX_NOW','BUILD_UP_NOW'].includes(audioRow.priority));
  assert.ok(['FIX_NOW','BUILD_UP_NOW'].includes(inventoryRow.priority));
  const prompt=directivePrompt(directive);
  assert.match(prompt,/EXPERIENCE_BUILD_UP:/);
  assert.match(prompt,/OFFICIAL_ROBLOX_STUDIO_MCP|officialStudioMcpRequired/i);
  assert.match(prompt,/SoundService/i);
  assert.match(prompt,/44px/i);
});

test('Web and Unity keep one common buildup loop but use native evidence profiles',()=>{
  const web=buildGameSpecificBuildUpDirective({
    gameId:'test-game',platform:'WEB',designRecord:design,sourceObservation:sourceObservation({audio:4,audioDynamics:3,animation:4,motionStates:8,gameFeel:4,vfx:3,camera:2})
  }).experienceBuildUpContract;
  const unity=buildGameSpecificBuildUpDirective({
    gameId:'test-game',platform:'UNITY',designRecord:design,sourceObservation:sourceObservation({audio:4,audioDynamics:3,animation:4,motionStates:8,gameFeel:4,vfx:3,camera:2})
  }).experienceBuildUpContract;
  assert.equal(web.platform,'WEB');
  assert.equal(web.webExtra.runtimeEvidence,'REAL_BROWSER_TOUCH_AND_RENDER_DELTA');
  assert.equal(unity.platform,'UNITY');
  assert.equal(unity.unityExtra.runtimeEvidence,'UNITY_EDITOR_PLUS_ANDROID_WHEN_MOBILE_TARGET');
  assert.equal(web.loop.join('|'),unity.loop.join('|'));
  assert.equal(web.ownerLocks.intentionallyDisabledAudioCategoriesPreserved,true);
  assert.equal(unity.ownerLocks.intentionallyDisabledAudioCategoriesPreserved,true);
});

test('source inspection detects perceptual motion and audio depth instead of only presence markers',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'build-up-experience-'));
  try{
    fs.writeFileSync(path.join(dir,'Game.luau'),`
local SoundService=game:GetService("SoundService")
local group=Instance.new("SoundGroup")
group.Parent=SoundService
local music=Instance.new("Sound")
music.RollOffMinDistance=8
music.RollOffMaxDistance=70
local function crossfadeBgm() end
local Animator=Instance.new("Animator")
local AnimationTrack={}
local state="IDLE"
local walk="WALK";local run="RUN";local jump="JUMP";local land="LAND"
local attack="ATTACK";local impact="IMPACT";local recovery="RECOVERY";local death="DEATH"
local hitStop=true;local recoil=true;local cameraKick=true
local inventory={};local equippedWeapon=nil
`);
    const observed=inspectGameSource({repoRoot:dir,sourceRoot:'.'});
    assert.ok(observed.signals.audio>=2);
    assert.ok(observed.signals.audioDynamics>=2);
    assert.ok(observed.signals.motionStates>=5);
    assert.ok(observed.signals.gameFeel>=3);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('designless safe presentation may polish existing inventory and audio without inventing gameplay semantics',()=>{
  const directive=buildGameSpecificBuildUpDirective({
    gameId:'safe-game',
    platform:'ROBLOX',
    designRecord:{content:{identity:'기존 게임'}},
    sourceObservation:sourceObservation(),
    requestedFocus:'PRESENTATION',
    safeDesignlessMode:true,
  });
  for(const domain of ['INVENTORY_USABILITY','EQUIPMENT_LOADOUT','AUDIO_MUSIC_SFX','GAME_FEEL']){
    const row=directive.allDomainImplementationDirectives.find(item=>item.domain===domain);
    assert.notEqual(row.priority,'NOT_APPLICABLE',domain);
  }
  assert.ok(directive.acceptanceEvidence.includes('OWNER_DISABLED_AUDIO_CATEGORIES_PRESERVED'));
});
