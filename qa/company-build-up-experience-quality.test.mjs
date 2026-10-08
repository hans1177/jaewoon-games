// Cross-platform holistic experience BUILD_UP contract.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runInNewContext} from 'node:vm';
import {
  EXPERIENCE_BUILD_UP_TRACKS,
  PLATFORM_EXPERIENCE_PROFILES,
  buildGameSpecificBuildUpDirective,
  directivePrompt,
  inspectGameSource,
  inspectGameSources,
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
    const gameRoot='roblox-games/test-game';
    fs.mkdirSync(path.join(dir,gameRoot),{recursive:true});
    fs.writeFileSync(path.join(dir,gameRoot,'Game.luau'),`
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
    const observed=inspectGameSource({repoRoot:dir,sourceRoot:gameRoot});
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

// 소스 범위 회귀: 아래 데이터는 검사기 입력이며 실제 플레이 증거가 아니다.
function sourceScopeFixture(t){
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'build-up-scope-'));
  const root=path.join(base,'repo');fs.mkdirSync(root);
  t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
  const write=(file,text)=>{
    const full=path.join(root,file);
    fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,text);
  };
  write('company-policy.json',JSON.stringify({combat:'attack reward enemy health hp'}));
  write('roblox-games/other/server/Game.server.luau','function foreignAttack(enemy) enemy.Health -= 1 end\n');
  write('roblox-games/cozy-island/server/Game.server.luau','function gatherResource(player) return player.wood end\n');
  write('web-games/cozy-island/index.html','<script>function updateHud(state){return state.wood}</script>');
  fs.writeFileSync(path.join(base,'outside.luau'),'function unrelatedAttack() return 1 end\n');
  return{root,base,write};
}
function assertMissingSourceScope(observed){
  assert.equal(observed.fileCount,0);assert.equal(observed.dataFileCount,0);
  assert.equal(observed.sourceBytes,0);assert.equal(observed.largestFileBytes,0);
  assert.deepEqual(observed.topFiles,[]);assert.deepEqual(observed.sourceAnchors,[]);
  assert.ok(Object.values(observed.signals).every(value=>value===0));
  assert.ok(observed.observations.includes('CURRENT_SOURCE_MISSING_OR_UNREADABLE'));
}
for(const sourceRoot of ['', ' ', '.', './', '..', '../', 'tools/..', '/'])test(`source scope rejects unscoped paths: ${JSON.stringify(sourceRoot)}`,t=>{
  const f=sourceScopeFixture(t);assertMissingSourceScope(inspectGameSource({repoRoot:f.root,sourceRoot}));
});
for(const sourceRoots of [[],[''],['.'],['missing'],['','missing']])test(`aggregate source scope does not fall back to the repository: ${JSON.stringify(sourceRoots)}`,t=>{
  const f=sourceScopeFixture(t);assertMissingSourceScope(inspectGameSources({repoRoot:f.root,sourceRoots}));
});
test('absolute repository root cannot become game source evidence',t=>{
  const f=sourceScopeFixture(t);assertMissingSourceScope(inspectGameSource({repoRoot:f.root,sourceRoot:f.root}));
});
test('unrelated game edits cannot alter the selected game fingerprint or anchors',t=>{
  const f=sourceScopeFixture(t);
  const before=inspectGameSource({repoRoot:f.root,sourceRoot:'roblox-games/cozy-island'});
  assert.equal(before.fileCount,1);assert.equal(before.sourceAnchors[0].symbol,'gatherResource');
  assert.ok(before.topFiles.every(row=>row.file.startsWith('roblox-games/cozy-island/')));
  f.write('roblox-games/other/server/Game.server.luau','function foreignAttack(enemy) enemy.Health -= 100 end\n');
  assert.equal(inspectGameSource({repoRoot:f.root,sourceRoot:'roblox-games/cozy-island'}).sourceTreeFingerprint,before.sourceTreeFingerprint);
});
test('explicit absolute game directory remains supported',t=>{
  const f=sourceScopeFixture(t);
  assert.equal(inspectGameSource({repoRoot:f.root,sourceRoot:path.join(f.root,'roblox-games/cozy-island')}).fileCount,1);
});
test('same-game native and Web source aggregation stays intact',t=>{
  const f=sourceScopeFixture(t);
  const observed=inspectGameSources({repoRoot:f.root,sourceRoots:['roblox-games/cozy-island','web-games/cozy-island']});
  assert.equal(observed.fileCount,2);assert.ok(observed.topFiles.every(row=>row.file.includes('/cozy-island/')));
});
test('root directory symlink cannot borrow a different game',t=>{
  const f=sourceScopeFixture(t);
  fs.symlinkSync(path.join(f.root,'roblox-games/other'),path.join(f.root,'alias'),'dir');
  assertMissingSourceScope(inspectGameSource({repoRoot:f.root,sourceRoot:'alias'}));
});
test('linked file cannot contribute foreign implementation anchors',t=>{
  const f=sourceScopeFixture(t);
  fs.symlinkSync(path.join(f.base,'outside.luau'),path.join(f.root,'roblox-games/cozy-island/borrowed.luau'));
  const observed=inspectGameSource({repoRoot:f.root,sourceRoot:'roblox-games/cozy-island'});
  assert.equal(observed.fileCount,1);assert.ok(!observed.sourceAnchors.some(row=>row.symbol==='unrelatedAttack'));
});
test('linked subdirectory cannot contribute another game',t=>{
  const f=sourceScopeFixture(t);
  fs.symlinkSync(path.join(f.root,'roblox-games/other'),path.join(f.root,'roblox-games/cozy-island/borrowed'),'dir');
  assert.equal(inspectGameSource({repoRoot:f.root,sourceRoot:'roblox-games/cozy-island'}).fileCount,1);
});
test('file passed as source directory stays missing rather than scanning the repository',t=>{
  const f=sourceScopeFixture(t);
  assertMissingSourceScope(inspectGameSource({repoRoot:f.root,sourceRoot:'company-policy.json'}));
});
test('directive retains the exact source scope already inspected by its caller',t=>{
  const f=sourceScopeFixture(t);
  const observed=inspectGameSources({repoRoot:f.root,sourceRoots:['roblox-games/cozy-island','web-games/cozy-island']});
  const directive=buildGameSpecificBuildUpDirective({gameId:'cozy-island',repoRoot:f.root,designRecord:design,sourceObservation:observed});
  assert.equal(directive.sourceRoot,observed.sourceRoot);
  assert.equal(directive.sourceTreeFingerprint,observed.sourceTreeFingerprint);
  assert.ok(directive.responsibleSystemsAndFiles.files.every(file=>file.includes('/cozy-island/')));
  assert.equal(directive.effectivenessMeasurement.baseline.runtimeObserved,false);
});
test('explicit directive source scope is not replaced by the aggregate observation',()=>{
  const observed=sourceObservation();
  const directive=buildGameSpecificBuildUpDirective({gameId:'test-game',sourceRoot:'roblox-games/test-game',designRecord:design,sourceObservation:{...observed,sourceRoot:'roblox-games/test-game|web-games/test-game'}});
  assert.equal(directive.sourceRoot,'roblox-games/test-game');
});
test('unscoped directive never inherits unrelated repository files as implementation',t=>{
  const f=sourceScopeFixture(t);
  const directive=buildGameSpecificBuildUpDirective({gameId:'cozy-island',repoRoot:f.root,designRecord:design});
  assert.deepEqual(directive.currentImplementationFindings.topFiles,[]);
  assert.deepEqual(directive.responsibleSystemsAndFiles.sourceAnchors,[]);
  assert.ok(directive.currentImplementationFindings.sourceObservations.includes('CURRENT_SOURCE_MISSING_OR_UNREADABLE'));
  assert.equal(directive.effectivenessMeasurement.baseline.runtimePassed,false);
});


test('all-game multiplayer requirement creates local implementation work without blocking legacy single development',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'mandatory-multiplayer-'));
  try{
    fs.mkdirSync(path.join(root,'company-learning'),{recursive:true});
    const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8')).directNativeDualPlatformDevelopment.multiplayerImplementation;
    fs.writeFileSync(path.join(root,'company-learning/platform-release-roadmap.json'),JSON.stringify({directNativeDualPlatformDevelopment:{multiplayerImplementation:policy}}));
    for(const platform of ['ROBLOX','UNITY','WEB']){
      const source=sourceObservation();source.signals.multiplayer=0;source.signals.errorRecovery=0;
      const directive=buildGameSpecificBuildUpDirective({gameId:'legacy-single',platform,repoRoot:root,designRecord:{content:{identity:'원본 퍼즐',coreLoop:['입력','판정','다음 선택'],multiplayerMode:'SINGLE'}},sourceObservation:source});
      assert.ok(directive.directiveId);
      assert.equal(directive.gameIdentityAndNonNegotiables.multiplayerMode,'SINGLE','source history is not rewritten as designer output');
      assert.equal(directive.qualityGapMap.find(row=>row.domain==='MULTIPLAYER_AND_SYNC').state,'GAP');
      assert.equal(directive.multiplayerImplementation.required,true);
      assert.equal(directive.multiplayerImplementation.developmentAdmissionGate,false);
      assert.equal(directive.multiplayerImplementation.otherGamesAndIndependentWorkContinue,true);
      assert.equal(directive.multiplayerImplementation.actualMultiplayerPlayVerified,false);
      assert.match(directivePrompt(directive),/전 게임 멀티 필수/);
    }
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

// 기존 작업 지시 캐시도 플랫폼별 독립 설계 지시를 계속 재사용하지 않는다.
test('planner refreshes legacy split-design directives without a new admission gate',()=>{
  const planner=fs.readFileSync('tools/vibe2-auto-planner.mjs','utf8');
  const source=planner.slice(planner.indexOf('  const activeDirectiveSemanticCompatible='),planner.indexOf('  const productionPolicy=',planner.indexOf('  const activeDirectiveSemanticCompatible=')));
  const compatible=(mode,required=true)=>runInNewContext(source+'\nactiveDirectiveSemanticCompatible',{
    projectRequiresMultiplayer:true,activeDirectiveMultiplayerState:'GAP',multiplayerPolicy:{required:true,version:1},singleOriginalRequired:required,
    activeDirectiveTask:{buildUpDirective:{multiplayerImplementation:{policyVersion:1},designImplementationContext:{platformExpansionPolicy:{mode}}}}
  });
  assert.equal(compatible('SHARED_LARGE_FRAME_PLATFORM_NATIVE_EXPANSION'),false);
  assert.equal(compatible('SINGLE_ORIGINAL_PLATFORM_IMPLEMENTATION'),true);
  assert.equal(compatible('SHARED_LARGE_FRAME_PLATFORM_NATIVE_EXPANSION',false),true);
});
