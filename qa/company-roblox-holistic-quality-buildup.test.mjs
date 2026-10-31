import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  ROBLOX_QUALITY_FAMILIES, ROBLOX_MOTION_STATES, ROBLOX_OFFICIAL_STUDIO_FIVE_PLAYBOT_SCENARIOS,
  ROBLOX_DETAILED_QUALITY_CHECKS,
  buildRobloxHolisticQualityPlan,robloxHolisticQualityPromptLines
} from '../tools/company-roblox-holistic-quality-buildup.mjs';
import {buildGameSpecificBuildUpDirective,directivePrompt} from '../tools/company-build-up-directive.mjs';

function fixture(run){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-whole-quality-'));
  const game='forest-survival',base=path.join(dir,'roblox-games',game);
  fs.mkdirSync(path.join(base,'client'),{recursive:true});
  fs.mkdirSync(path.join(base,'server'),{recursive:true});
  fs.mkdirSync(path.join(base,'models'),{recursive:true});
  fs.mkdirSync(path.join(dir,'assets','roblox','common-icons-v1'),{recursive:true});
  try{return run({dir,game,base});}finally{fs.rmSync(dir,{recursive:true,force:true});}
}

test('all asset/system/source responsibilities and motion-action phases are present',()=>{
  const ids=ROBLOX_QUALITY_FAMILIES.map(row=>row.id);
  assert.equal(new Set(ids).size,ids.length);
  assert.ok(ids.length>=30);
  for(const id of ['ANIMATION_MOTION','ACTION_IMPACT','ACTION_TRAVERSAL','CHARACTERS_RIGS','MONSTERS_NPCS',
    'LIGHTING_SKY','MATERIALS_TEXTURES','AUDIO_BGM','AUDIO_SFX','UI_HUD_MENUS','VFX_PARTICLES','SAVE_RECOVERY',
    'SERVER_AUTHORITY','MOBILE_TOUCH','PROMOTIONAL_MEDIA']){
    assert.ok(ids.includes(id),id);
  }
  for(const state of ['IDLE','WALK','RUN','TURN','ATTACK_ANTICIPATION','ATTACK_IMPACT','ATTACK_RECOVERY',
    'HIT_REACTION','DEATH','RESPAWN'])assert.ok(ROBLOX_MOTION_STATES.includes(state),state);
  assert.deepEqual(ROBLOX_OFFICIAL_STUDIO_FIVE_PLAYBOT_SCENARIOS.map(row=>row.id),
    ['BASIC','COMBAT','CONTENT','MOBILE','STABILITY']);
  assert.ok(ROBLOX_OFFICIAL_STUDIO_FIVE_PLAYBOT_SCENARIOS.every(row=>row.status==='PLANNED_UNEXECUTED'&&row.realDeviceTouchVerified===false));
});

test('125 explicit acceptance checks include at least 60 different motion, action and rig checks',()=>{
  assert.equal(ROBLOX_DETAILED_QUALITY_CHECKS.length,125);
  const rows=ROBLOX_DETAILED_QUALITY_CHECKS;
  assert.equal(new Set(rows.map(row=>row.id)).size,rows.length);
  assert.equal(rows.filter(row=>/^(RIG_|MOTION_|ACTION_)/.test(row.id)).length,78);
  assert.ok(rows.every(row=>row.acceptance.startsWith('Verify ')));
  assert.ok(rows.every(row=>row.sourceSignals.length>0&&row.feedback.includes('rerun')));
  assert.ok(rows.every(row=>ROBLOX_QUALITY_FAMILIES.some(family=>family.id===row.family)));
  const required=['RIG_SKIN_WEIGHTS','MOTION_FOOT_PLANT','MOTION_ATTACK_ANTICIPATION','MOTION_ATTACK_IMPACT',
    'MOTION_ATTACK_RECOVERY','MOTION_HIT_REACTION','MOTION_DEATH','MOTION_RESPAWN','ACTION_HIT_RANGE',
    'ACTION_DODGE_INVULN','ACTION_ATTACK_VFX_SYNC','UI_REAL_DEVICE_TOUCH','MODEL_TOPOLOGY_VALID','SAVE_REJOIN_ROUNDTRIP'];
  required.forEach(id=>assert.ok(rows.some(row=>row.id===id),id));
  assert.equal(rows.find(row=>row.id==='UI_REAL_DEVICE_TOUCH').verificationMethod,'DEVICE_ACTUAL');
  assert.equal(rows.find(row=>row.id==='WORLD_SPAWN_SUPPORT').verificationMethod,'SERVER_CLOUD_EXACT');
  assert.equal(rows.find(row=>row.id==='MOTION_FOOT_PLANT').verificationMethod,'STUDIO_ACTUAL');
});

test('exact bytes detect malformed assets and missing shared references with no invented quality credit',()=>fixture(({dir,game,base})=>{
  fs.writeFileSync(path.join(base,'client','UI.client.luau'),
    'local UserInputService = game:GetService("UserInputService")\n'
    +'local ok = "assets/roblox/common-icons-v1/icon.png"\n'
    +'local missing = "assets/roblox/common-icons-v1/missing.png"\n'
    +'local action = "attack anticipation hitbox recovery"');
  fs.writeFileSync(path.join(base,'server','Combat.server.luau'),'local damage = 5');
  fs.writeFileSync(path.join(base,'models','broken.glb'),Buffer.from('not a glTF model'));
  fs.writeFileSync(path.join(dir,'assets','roblox','common-icons-v1','icon.png'),Buffer.from('89504e470d0a1a0a0000000d494844520000000100000001','hex'));
  const plan=buildRobloxHolisticQualityPlan({repoRoot:dir,gameId:game,sourceRevision:'a'.repeat(40)});
  assert.equal(plan.sourceOnly,true);
  assert.equal(plan.qualityComplete,false);
  assert.equal(plan.scan.complete,true);
  assert.equal(plan.scan.assetCount,1);
  assert.ok(plan.issues.some(row=>row.id==='ASSET_SIGNATURE_INVALID'&&row.path.endsWith('broken.glb')));
  assert.ok(plan.issues.some(row=>row.id==='SOURCE_ASSET_REFERENCE_MISSING'&&row.path.endsWith('missing.png')));
  assert.ok(plan.assetReferences.some(row=>row.path.endsWith('icon.png')&&row.exists===true&&row.licenseVerified===false));
  assert.equal(plan.detailedCheckCounts.total,125);
  assert.equal(plan.detailedCheckCounts.motionActionRig,78);
  assert.equal(plan.detailedCheckCounts.unexecuted,125);
  assert.ok(plan.detailedChecks.every(row=>row.verified===false&&row.executionStatus==='NOT_EXECUTED'));
  assert.equal(plan.officialStudioScenarios.length,5);
  assert.equal(plan.officialStudioScenarios.filter(row=>row.verified).length,0);
  assert.equal(plan.motion.actualActionVerified,false);
  assert.ok(plan.motion.states.some(row=>row.id==='ATTACK_ANTICIPATION'&&row.sourceMentioned===true&&row.verdict==='UNVERIFIED'));
  assert.equal(plan.evidenceScope.realTouch,false);
  assert.equal(plan.evidenceScope.realScreen,false);
  assert.ok(plan.priorityWork.some(row=>row.priority==='P0'));
  const text=robloxHolisticQualityPromptLines(plan).join('\n');
  assert.match(text,/MOTION_ACTION_BUILD_UP/);
  assert.match(text,/DETAILED_GAME_SOURCE_TARGETS:/);
  assert.match(text,/repair only observed failure or approved gap/);
  assert.match(text,/anticipation-impact-recovery/);
  assert.match(text,/PENDING, NEVER PASS/);
}));

test('missing source and bad scope fail closed and do not infer functional completeness',()=>fixture(({dir,game})=>{
  assert.throws(()=>buildRobloxHolisticQualityPlan({repoRoot:dir,gameId:game,sourceRoot:'../elsewhere'}),/WRONG_SOURCE_ROOT/);
  assert.throws(()=>buildRobloxHolisticQualityPlan({repoRoot:dir,gameId:'../escape'}),/INVALID_GAME_ID/);
  fs.rmSync(path.join(dir,'roblox-games',game),{recursive:true,force:true});
  const plan=buildRobloxHolisticQualityPlan({repoRoot:dir,gameId:game});
  assert.equal(plan.scan.complete,false);
  assert.equal(plan.sourceOnly,true);
  assert.ok(plan.families.every(row=>row.verified===false));
  assert.equal(plan.officialStudioScenarios.every(row=>row.verified===false),true);
}));

test('shared asset library is audited across all records without confusing CC0 labels for verified rights',()=>fixture(({dir,game,base})=>{
  fs.mkdirSync(path.join(dir,'assets','shared'),{recursive:true});
  fs.writeFileSync(path.join(dir,'assets','shared','good.ogg'),Buffer.from('OggS-audio'));
  fs.writeFileSync(path.join(dir,'company-asset-library.json'),JSON.stringify({assets:[
    {id:'music-good',path:'assets/shared/good.ogg',license:'CC0',sourceHash:'a'.repeat(64),targetGame:game},
    {id:'bad-rights',path:'assets/shared/missing.glb',license:'UNKNOWN',sourceHash:'',targetGame:game},
    {id:'other-library-asset',path:'assets/shared/elsewhere.png',license:'CC0-1.0',sourceHash:'b'.repeat(64),targetGame:'another-game'}
  ]}));
  fs.writeFileSync(path.join(base,'server','Game.server.luau'),'print("boot")');
  const plan=buildRobloxHolisticQualityPlan({repoRoot:dir,gameId:game});
  assert.equal(plan.sharedLibrary.status,'METADATA_LOADED_NOT_RUNTIME_VERIFIED');
  assert.equal(plan.sharedLibrary.coverage.total,3);
  assert.equal(plan.sharedLibrary.coverage.gameRelevant,2);
  assert.equal(plan.sharedLibrary.coverage.localFilesMissing,2);
  assert.equal(plan.sharedLibrary.coverage.recordedCc0,2);
  assert.equal(plan.sharedLibrary.licenseEvidenceVerified,false);
  assert.equal(plan.sharedLibrary.assetRuntimeVerified,false);
  assert.ok(plan.sharedLibrary.examples.every(row=>row.actualQualityVerified===false));
  assert.match(robloxHolisticQualityPromptLines(plan).join('\n'),/SHARED_LIBRARY_QA/);
}));

test('Studio evidence cannot self-certify all five scenarios or physical touch',()=>fixture(({dir,game,base})=>{
  fs.writeFileSync(path.join(base,'server','Game.server.luau'),'print("boot")');
  const studioEvidence={
    authority:'roblox-official-studio-mcp-runtime',actualPlay:true,runtimeVerified:true,gameId:game,
    sourceRevision:'a'.repeat(40),artifactIdentity:'sha256:'+'b'.repeat(64),
    capabilities:{officialStudioMcp:true,playMode:true,screenCapture:true}
  };
  const plan=buildRobloxHolisticQualityPlan({repoRoot:dir,gameId:game,
    sourceRevision:'a'.repeat(40),runtimeEvidence:{studioPlayEvidence:studioEvidence}});
  assert.ok(plan.officialStudioScenarios.every(x=>x.verified===false));
  assert.ok(plan.officialStudioScenarios.every(x=>x.evidenceState.includes('SCENARIO_PASS_NOT_ASSUMED')));
  assert.ok(plan.officialStudioScenarios.every(x=>x.realDeviceTouchVerified===false));
  assert.ok(plan.motion.states.every(x=>!x.actualAnimatorVerified));
  assert.equal(plan.detailedCheckCounts.actualPlayVerified,0);
  assert.ok(plan.detailedChecks.every(row=>row.observedPass===false&&row.evidenceReference===null));
  assert.equal(plan.detailedChecks.find(row=>row.id==='UI_REAL_DEVICE_TOUCH').realDeviceTouchRequired,true);
}));

test('cross-platform source observations from another game cannot redirect the Roblox quality scan',()=>fixture(({dir,game,base})=>{
  fs.writeFileSync(path.join(base,'client','Animal.client.luau'),'local animation = "walk attack"');
  const d=buildGameSpecificBuildUpDirective({
    gameId:game,platform:'ROBLOX',repoRoot:dir,
    sourceRoot:'roblox-games/not-this-game',
    sourceObservation:{sourceRoot:'roblox-games/not-this-game',sourceTreeFingerprint:'fixture',
      topFiles:[],observations:[],signals:{animation:1}},
    designRecord:{content:{identity:'기존 야생동물',coreFun:'기존 행동 유지',coreLoop:['이동','공격']}}
  });
  assert.equal(d.robloxHolisticQualityPlan.sourceRoot,'roblox-games/'+game);
  assert.equal(d.robloxHolisticQualityPlan.sourceOnly,true);
  assert.equal(d.robloxHolisticQualityPlan.qualityComplete,false);
  assert.ok(d.robloxHolisticQualityPlan.scan.sourceCount>=1);
  assert.equal(d.robloxHolisticQualityPlan.detailedCheckCounts.actualPlayVerified,0);
}));

test('existing Roblox BUILD_UP feeds source-only whole asset and action plan to worker prompt',()=>fixture(({dir,game,base})=>{
  fs.writeFileSync(path.join(base,'client','Motion.client.luau'),'local animation="idle walk run attack"');
  const directive=buildGameSpecificBuildUpDirective({
    gameId:game,platform:'ROBLOX',repoRoot:dir,sourceRoot:'roblox-games/'+game,
    designRecord:{content:{identity:'숲 생존',coreFun:'사냥과 생존',coreLoop:['이동','채집','사냥'],
      signatureSystems:[{name:'기존 전투'}]}}
  });
  assert.equal(directive.robloxHolisticQualityPlan.gameId,game);
  assert.ok(directive.robloxHolisticQualityPlan.families.length>=30);
  assert.equal(directive.robloxHolisticQualityPlan.motion.actualMotionVerified,false);
  const prompt=directivePrompt(directive);
  assert.match(prompt,/ROBLOX_HOLISTIC_QUALITY_BUILD_UP/);
  assert.match(prompt,/MOTION_ACTION_BUILD_UP/);
  assert.match(prompt,/DETAILED_QUALITY_CHECKS: total=125 motionActionRig=78 executed=0/);
  assert.match(prompt,/FIVE_OFFICIAL_STUDIO_SCENARIOS/);
  assert.match(prompt,/F0/);
}));


test('implemented gameplay visuals: linked rig attacks, actor animation phases and server-event-only RPG combos',()=>{
  const read=file=>fs.readFileSync(file,'utf8');
  const animal=read('roblox-games/cozy-island/shared/WildlifeAnimator.luau');
  const wildlifeServer=read('roblox-games/cozy-island/shared/SurvivalWildlife.luau');
  const cozyClient=read('roblox-games/cozy-island/client/Game.client.luau');
  const battle=read('roblox-games/cozy-island/server/BattleVisual.luau');
  const rpg=read('roblox-games/fantasy-survival/client/Game.client.luau');
  assert.match(animal,/actingSpeed \*= 0\.14/);
  assert.match(animal,/lastServerState/);
  assert.match(animal,/WildlifeRenderedMotionState/);
  assert.doesNotMatch(animal,/self\.model:SetAttribute\("WildlifeMotionState", nextState\)/);
  assert.match(wildlifeServer,/WildlifeMotionSerial/);
  assert.match(wildlifeServer,/model:SetAttribute\("WildlifeMotionState", nextState\)/);
  assert.match(cozyClient,/local anticipate=state=="ATTACK"/);
  assert.match(cozyClient,/local strike=state=="ATTACK"/);
  assert.match(cozyClient,/local recoil=state=="HIT"/);
  assert.match(cozyClient,/local collapse=state=="DEATH"/);
  assert.match(cozyClient,/WildlifeMotionSerial/);
  assert.match(cozyClient,/record\.gaitPhase\+=record\.smoothSpeed/);
  assert.match(battle,/Instance\.new\("Motor6D"\)/);
  assert.match(battle,/function marchAndStrike/);
  assert.match(battle,/CozyBattleVisualOnly/);
  assert.match(battle,/OwnsDamageAuthority",false/);
  assert.match(battle,/BattleVisual\.finish\(player,won\)/);
  assert.match(rpg,/local martialSkillTracks=\{/);
  assert.match(rpg,/playNativeCombatMotion=function\(approvedScope,approvedEvent,serverApproved\)/);
  assert.match(rpg,/GetAttributeChangedSignal\("ApprovedCombatMotion"\)/);
  assert.match(rpg,/combatMotionSource\.CreateCombatCombo/);
  assert.doesNotMatch(rpg,/remote:FireServer\("CivNativeCombatMotion"/);
});
