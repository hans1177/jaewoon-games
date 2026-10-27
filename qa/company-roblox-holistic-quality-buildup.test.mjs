import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  ROBLOX_QUALITY_FAMILIES, ROBLOX_MOTION_STATES, ROBLOX_OFFICIAL_STUDIO_FIVE_PLAYBOT_SCENARIOS,
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
  assert.equal(plan.officialStudioScenarios.length,5);
  assert.equal(plan.officialStudioScenarios.filter(row=>row.verified).length,0);
  assert.equal(plan.motion.actualActionVerified,false);
  assert.ok(plan.motion.states.some(row=>row.id==='ATTACK_ANTICIPATION'&&row.sourceMentioned===true&&row.verdict==='UNVERIFIED'));
  assert.equal(plan.evidenceScope.realTouch,false);
  assert.equal(plan.evidenceScope.realScreen,false);
  assert.ok(plan.priorityWork.some(row=>row.priority==='P0'));
  const text=robloxHolisticQualityPromptLines(plan).join('\n');
  assert.match(text,/MOTION_ACTION_BUILD_UP/);
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
  assert.match(prompt,/FIVE_OFFICIAL_STUDIO_SCENARIOS/);
  assert.match(prompt,/F0/);
}));
