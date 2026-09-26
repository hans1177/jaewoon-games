import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { runIncrementalQa, incrementalQaFailureSignature } from '../tools/vibe2-incremental-qa.mjs';

function repo(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-iqa-'));
  execFileSync('git',['init','-q'],{cwd:root});
  execFileSync('git',['config','user.email','qa@example.com'],{cwd:root});
  execFileSync('git',['config','user.name','qa'],{cwd:root});
  fs.writeFileSync(path.join(root,'a.js'),'export const x = 1;\n','utf8');
  fs.writeFileSync(path.join(root,'b.json'),'{"ok":true}\n','utf8');
  execFileSync('git',['add','.'],{cwd:root});
  execFileSync('git',['commit','-qm','base'],{cwd:root});
  return root;
}

test('incremental QA validates only changed scope and caches PASS by content hash',()=>{
  const root=repo();
  const cache=path.join(root,'.cache','qa.json');
  fs.writeFileSync(path.join(root,'a.js'),'export const x = 2;\n','utf8');
  const first=runIncrementalQa({root,files:['a.js'],cacheFile:cache,namespace:'web:demo'});
  assert.equal(first.outcome,'PASS');
  assert.equal(first.cached,false);
  const second=runIncrementalQa({root,files:['a.js'],cacheFile:cache,namespace:'web:demo'});
  assert.equal(second.outcome,'PASS');
  assert.equal(second.cached,true);
  assert.equal(second.contentHash,first.contentHash);
  assert.equal(second.fullRegressionStillRequired,true);
});

test('content change invalidates cache key',()=>{
  const root=repo();
  const cache=path.join(root,'.cache','qa.json');
  let one=runIncrementalQa({root,files:['a.js'],cacheFile:cache,namespace:'web:demo'});
  fs.writeFileSync(path.join(root,'a.js'),'export const x = 3;\n','utf8');
  let two=runIncrementalQa({root,files:['a.js'],cacheFile:cache,namespace:'web:demo'});
  assert.notEqual(two.contentHash,one.contentHash);
  assert.equal(two.cached,false);
});

test('HTML inline JavaScript syntax fails closed before presentation or fan-in',()=>{
  const root=repo();
  const file=path.join(root,'index.html');
  fs.writeFileSync(file,'<!doctype html><html><body><script>function loadGame(){return 1}</script><script type="application/json">{"safe":true}</script></body></html>\n','utf8');
  const pass=runIncrementalQa({root,files:['index.html'],namespace:'web:fantasy-survival'});
  assert.equal(pass.outcome,'PASS');
  assert.ok(pass.checks[0].checks.includes('inline-script-syntax'));
  fs.writeFileSync(file,'<!doctype html><html><body><script>p.loot=o.loot&&typeof o.loot==="object"?{...o.loot}:{};for(const k of NEW_LOOT_KEYS)p.loot[k]=Math.max(0,Number(p.l /no_think)\ntry{const s=JSON.parse("{}");}catch(e){}</script></body></html>\n','utf8');
  assert.throws(
    ()=>runIncrementalQa({root,files:['index.html'],namespace:'web:fantasy-survival'}),
    /SyntaxError in index\.html#script-1/
  );
});

test('old v8 cached PASS cannot bypass the inline script syntax gate',()=>{
  const root=repo();
  const cache=path.join(root,'.cache','qa.json');
  const namespace='web:fantasy-survival';
  const relative='index.html';
  const broken='<!doctype html><html><body><script>function loadGame(){ const x=Number(value /no_think) try{return x}catch(e){return 0} }</script></body></html>\n';
  fs.writeFileSync(path.join(root,relative),broken,'utf8');
  const hash=crypto.createHash('sha256');
  for(const part of ['vibe2-incremental-qa-v8',namespace,'null','null','null','null',relative,Buffer.from(broken)])hash.update(part);
  const oldHash=hash.digest('hex');
  fs.mkdirSync(path.dirname(cache),{recursive:true});
  fs.writeFileSync(cache,JSON.stringify({version:6,entries:{[oldHash]:{outcome:'PASS',checks:[]}}}), 'utf8');
  assert.throws(
    ()=>runIncrementalQa({root,files:[relative],cacheFile:cache,namespace}),
    /SyntaxError in index\.html#script-1/
  );
});

test('manifest changed files resolve inside sourceRoot and causal replay stays plan-only without verified prepatch reproduction',()=>{
  const root=repo();
  const sourceRoot=path.join(root,'web-games/demo');
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.js'),'export const placed = 1;\n','utf8');
  fs.mkdirSync(path.join(sourceRoot,'qa'),{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'qa/placement.test.mjs'),'throw new Error("must not run without verified prepatch reproduction");\n','utf8');
  const manifest=path.join(root,'manifest.json');
  fs.writeFileSync(manifest,JSON.stringify({
    sourceRoot:'web-games/demo',changedFiles:['index.js'],
    exploration:{editContract:{causalReplay:{version:1,required:true,prePatchReproduced:false,nodeTestTargets:['qa/placement.test.mjs'],executable:false,mode:'PLAN_ONLY',status:'NO_VERIFIED_PREPATCH_REPRODUCTION'}}}
  },null,2));
  const result=runIncrementalQa({root,manifest,namespace:'web:demo'});
  assert.deepEqual(result.changedFiles,['web-games/demo/index.js']);
  assert.equal(result.causalReplay.status,'PLAN_ONLY');
  assert.equal(result.causalReplay.executed,false);
  assert.equal(result.fullRegressionStillRequired,true);
});

test('causal replay executes supported node tests only after verified prepatch reproduction',()=>{
  const root=repo();
  const sourceRoot=path.join(root,'web-games/demo');
  fs.mkdirSync(path.join(sourceRoot,'qa'),{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.js'),'export const placed = 2;\n','utf8');
  fs.writeFileSync(path.join(sourceRoot,'qa/placement.test.mjs'),[
    "import test from 'node:test';",
    "import assert from 'node:assert/strict';",
    "test('same placement scenario clears after patch',()=>assert.equal(2,2));"
  ].join('\n')+'\n','utf8');
  const manifest=path.join(root,'manifest.json');
  fs.writeFileSync(manifest,JSON.stringify({
    sourceRoot:'web-games/demo',changedFiles:['index.js'],
    exploration:{editContract:{causalReplay:{version:1,required:true,prePatchReproduced:true,nodeTestTargets:['qa/placement.test.mjs'],executable:true,mode:'NODE_TEST_TARGETS',status:'READY_FOR_POSTPATCH_REPLAY',identicalOrEquivalentInputStateRequired:true}}}
  },null,2));
  const result=runIncrementalQa({root,manifest,namespace:'web:demo'});
  assert.equal(result.causalReplay.status,'EXECUTED_PASS');
  assert.equal(result.causalReplay.executed,true);
  assert.equal(result.causalReplay.targets[0].target,'web-games/demo/qa/placement.test.mjs');
  assert.equal(result.causalReplay.canonicalQaStillRequired,true);
});

test('game repair QA accepts autonomous two-client harness evidence without owner participation',()=>{
  const root=repo();
  const sourceRoot=path.join(root,'web-games/demo');
  fs.mkdirSync(path.join(sourceRoot,'qa'),{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.js'),'export const repaired = true;\n','utf8');
  for(const file of ['scenario.test.mjs','invariant.test.mjs','multiplayer.test.mjs']){
    fs.writeFileSync(path.join(sourceRoot,'qa',file),[
      "import test from 'node:test';",
      "import assert from 'node:assert/strict';",
      `test('${file}',()=>assert.equal(true,true));`
    ].join('\n')+'\n','utf8');
  }
  const manifest=path.join(root,'manifest.json');
  fs.writeFileSync(manifest,JSON.stringify({
    sourceRoot:'web-games/demo',changedFiles:['index.js'],
    exploration:{editContract:{
      causalReplay:{version:2,required:true,prePatchReproduced:true,nodeTestTargets:['qa/scenario.test.mjs'],executable:true,mode:'NODE_TEST_TARGETS',status:'READY_FOR_POSTPATCH_REPLAY'},
      gameRepair:{
        version:1,required:true,failureStage:'WEB_RUNTIME',failureSignature:'multiplayer-sync-bug',
        prePatchReproduced:true,responsibleSystem:'NETWORK_SYNC',responsibleFiles:['index.js'],
        revisions:{lastKnownGoodRevision:'good',firstBrokenRevision:'broken',currentRevision:'current'},
        originalScenarioReplay:{required:true},
        invariants:{required:true,testTargets:['qa/invariant.test.mjs']},
        saveMigration:{required:false,testTargets:[]},
        multiplayerLifecycle:{
          required:true,minimumPlayers:2,userAssistanceRequired:false,testTargets:['qa/multiplayer.test.mjs'],
          automation:{
            required:true,minimumSyntheticOrRealClients:2,
            machineDrivenScenarios:['TWO_CLIENT_JOIN_AND_READY','ONE_CLIENT_REJOIN','LATE_JOIN_STATE_RECONCILIATION','AUTHORITATIVE_DAMAGE_REWARD_SAVE_AND_PROGRESS_SYNC'],
            actualPlatformRuntimeEvidenceRequiredBeforePlatformSpecificMultiplayerPass:true
          }
        },
        repeatCount:3,repairMode:'ROOT_CAUSE_MODE'
      }
    }}
  },null,2));
  const result=runIncrementalQa({root,manifest,namespace:'web:autonomous-multiplayer'});
  assert.equal(result.gameRepairQa.originalScenarioReplay,'PASS');
  assert.equal(result.gameRepairQa.invariants,'PASS');
  assert.equal(result.gameRepairQa.multiplayerLifecycle,'PASS_AUTOMATED_HARNESS');
  assert.equal(result.gameRepairQa.multiplayerAutomation.userAssistanceRequired,false);
  assert.equal(result.gameRepairQa.multiplayerAutomation.minimumSyntheticOrRealClients,2);
  assert.equal(result.gameRepairQa.repairMode,'ROOT_CAUSE_MODE');
  assert.equal(result.gameRepairQa.readyForFanIn,true);
});

test('multiplayer repair stays unverified when autonomous harness evidence is missing',()=>{
  const root=repo();
  const sourceRoot=path.join(root,'web-games/demo');
  fs.mkdirSync(path.join(sourceRoot,'qa'),{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.js'),'export const repaired = true;\n','utf8');
  for(const file of ['scenario.test.mjs','invariant.test.mjs']){
    fs.writeFileSync(path.join(sourceRoot,'qa',file),[
      "import test from 'node:test';",
      "import assert from 'node:assert/strict';",
      `test('${file}',()=>assert.equal(true,true));`
    ].join('\n')+'\n','utf8');
  }
  const manifest=path.join(root,'manifest.json');
  fs.writeFileSync(manifest,JSON.stringify({
    sourceRoot:'web-games/demo',changedFiles:['index.js'],
    exploration:{editContract:{
      causalReplay:{version:2,required:true,prePatchReproduced:true,nodeTestTargets:['qa/scenario.test.mjs'],executable:true,mode:'NODE_TEST_TARGETS'},
      gameRepair:{
        version:1,required:true,
        originalScenarioReplay:{required:true},
        invariants:{required:true,testTargets:['qa/invariant.test.mjs']},
        saveMigration:{required:false,testTargets:[]},
        multiplayerLifecycle:{
          required:true,minimumPlayers:2,userAssistanceRequired:false,testTargets:[],
          automation:{required:true,minimumSyntheticOrRealClients:2,machineDrivenScenarios:['TWO_CLIENT_JOIN_AND_READY']}
        }
      }
    }}
  },null,2));
  const result=runIncrementalQa({root,manifest,namespace:'web:multiplayer-missing-harness'});
  assert.equal(result.gameRepairQa.multiplayerLifecycle,'PENDING_AUTONOMOUS_HARNESS_EVIDENCE');
  assert.equal(result.gameRepairQa.multiplayerAutomation.userAssistanceRequired,false);
  assert.equal(result.gameRepairQa.readyForFanIn,false);
  assert.equal(result.outcome,'PASS');
});

test('declared executable causal replay fails closed when the replay target is missing',()=>{
  const root=repo();
  const sourceRoot=path.join(root,'web-games/demo');
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.js'),'export const placed = 2;\n','utf8');
  const manifest=path.join(root,'manifest.json');
  fs.writeFileSync(manifest,JSON.stringify({
    sourceRoot:'web-games/demo',changedFiles:['index.js'],
    exploration:{editContract:{causalReplay:{version:1,required:true,prePatchReproduced:true,nodeTestTargets:['qa/missing.test.mjs'],executable:true,mode:'NODE_TEST_TARGETS'}}}
  },null,2));
  assert.throws(()=>runIncrementalQa({root,manifest,namespace:'web:demo'}),/CAUSAL_REPLAY_TARGET_MISSING/);
});
test('architecture drift observes large responsibility growth without hard rejecting the candidate',()=>{
  const root=repo();
  const sourceRoot=path.join(root,'web-games/drift-demo');
  fs.mkdirSync(sourceRoot,{recursive:true});
  const huge='score+=1;'.repeat(1100);
  fs.writeFileSync(path.join(sourceRoot,'index.html'),'<!doctype html><html><body><script>let score=0; function updateWorld(){ '+huge+' } requestAnimationFrame(updateWorld);</script></body></html>\n','utf8');
  const manifest=path.join(root,'manifest.json');
  fs.writeFileSync(manifest,JSON.stringify({
    sourceRoot:'web-games/drift-demo',changedFiles:['index.html'],
    exploration:{responsibleFiles:['index.html'],editContract:{architectureSnapshot:{
      version:1,nodeCount:1,edgeCount:0,maxFunctionBodyBytes:100,maxCallsPerFunction:0,maxCalledByPerFunction:0,maxStateWritesPerFunction:1,maxSystemsPerFunction:1,multiWriterStateCount:0,stateWriterLinkCount:1,multiOwnerStorageKeyCount:0,storageOwnerLinkCount:0,timerFunctionCount:0,eventBindingCount:0,largeFunctionCount:0,broadSystemFunctionCount:0
    },causalReplay:{required:false,executable:false,mode:'PLAN_ONLY'}}}
  },null,2));
  const result=runIncrementalQa({root,manifest,namespace:'web:drift-demo'});
  assert.equal(result.outcome,'PASS');
  assert.equal(result.architectureDrift.status,'ANALYZED');
  assert.ok(result.architectureDrift.signals.includes('GOD_FUNCTION_GROWTH'));
  assert.equal(result.architectureDrift.riskLevel,'MEDIUM');
  assert.equal(result.architectureDrift.focusedReviewRequired,true);
  assert.equal(result.architectureDrift.hardReject,false);
  assert.equal(result.fullRegressionStillRequired,true);
});

test('architecture drift remains low for a bounded responsibility-preserving patch and is cached with QA evidence',()=>{
  const root=repo();
  const sourceRoot=path.join(root,'web-games/stable-demo');
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.html'),'<!doctype html><html><body><script>let score=0; function updateScore(){ score+=1; }</script></body></html>\n','utf8');
  const manifest=path.join(root,'manifest.json');
  const cache=path.join(root,'.cache','stable.json');
  fs.writeFileSync(manifest,JSON.stringify({
    sourceRoot:'web-games/stable-demo',changedFiles:['index.html'],
    exploration:{responsibleFiles:['index.html'],editContract:{architectureSnapshot:{
      version:1,nodeCount:1,edgeCount:0,maxFunctionBodyBytes:80,maxCallsPerFunction:0,maxCalledByPerFunction:0,maxStateWritesPerFunction:1,maxSystemsPerFunction:1,multiWriterStateCount:0,stateWriterLinkCount:1,multiOwnerStorageKeyCount:0,storageOwnerLinkCount:0,timerFunctionCount:0,eventBindingCount:0,largeFunctionCount:0,broadSystemFunctionCount:0
    },causalReplay:{required:false,executable:false,mode:'PLAN_ONLY'}}}
  },null,2));
  const first=runIncrementalQa({root,manifest,namespace:'web:stable-demo',cacheFile:cache});
  const second=runIncrementalQa({root,manifest,namespace:'web:stable-demo',cacheFile:cache});
  assert.equal(first.architectureDrift.riskLevel,'LOW');
  assert.equal(first.architectureDrift.hardReject,false);
  assert.equal(second.cached,true);
  assert.equal(second.architectureDrift.riskLevel,'LOW');
});
test('invalid JS fails fast before full regression',()=>{
  const root=repo();
  fs.writeFileSync(path.join(root,'a.js'),'export const = ;\n','utf8');
  assert.throws(()=>runIncrementalQa({root,files:['a.js'],namespace:'web:demo'}));
});

test('conflict markers fail fast',()=>{
  const root=repo();
  fs.writeFileSync(path.join(root,'a.js'),'<<<<<<< ours\nconst a=1;\n=======\nconst a=2;\n>>>>>>> theirs\n','utf8');
  assert.throws(()=>runIncrementalQa({root,files:['a.js'],namespace:'web:demo'}),/conflict marker/);
});


test('Roblox asset adaptation accepts articulated Animator motion with blend and speed sync',()=> {
  const root=repo();
  const sourceRoot=path.join(root,'roblox-games/demo');
  fs.mkdirSync(path.join(sourceRoot,'client'),{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'client/Visual.client.luau'),[
    'local RunService = game:GetService("RunService")',
    'local Lighting = game:GetService("Lighting")',
    'local character = Instance.new("Model")',
    'character.Name = "EnemyCharacter"',
    'local humanoid = Instance.new("Humanoid")',
    'humanoid.Parent = character',
    'local animator = Instance.new("Animator")',
    'animator.Parent = humanoid',
    'local rootPart = Instance.new("Part")',
    'rootPart.Name = "HumanoidRootPart"',
    'rootPart.Parent = character',
    'local torso = Instance.new("MeshPart")',
    'torso.Name = "UpperTorso"',
    'torso.Material = Enum.Material.SmoothPlastic',
    'torso.Color = Color3.fromRGB(80,110,145)',
    'torso.Parent = character',
    'local arm = Instance.new("MeshPart")',
    'arm.Name = "RightUpperArm"',
    'arm.Parent = character',
    'local leg = Instance.new("MeshPart")',
    'leg.Name = "RightUpperLeg"',
    'leg.Parent = character',
    'local shoulder = Instance.new("Motor6D")',
    'shoulder.Name = "RightShoulder"',
    'shoulder.Part0 = torso',
    'shoulder.Part1 = arm',
    'shoulder.Parent = torso',
    'local hip = Instance.new("Motor6D")',
    'hip.Name = "RightHip"',
    'hip.Part0 = torso',
    'hip.Part1 = leg',
    'hip.Parent = torso',
    'local animation = Instance.new("Animation")',
    'animation.AnimationId = "rbxassetid://1"',
    'local animationTrack = animator:LoadAnimation(animation)',
    'animationTrack:Play(0.15)',
    'animationTrack:AdjustWeight(1, 0.15)',
    'animationTrack:AdjustSpeed(math.max(0.5, humanoid.WalkSpeed / 16))',
    'local weaponEquipment = Instance.new("MeshPart")',
    'weaponEquipment.Name = "SwordEquipment"',
    'weaponEquipment.Material = Enum.Material.Metal',
    'weaponEquipment.Parent = character',
    'local terrainEnvironment = Instance.new("MeshPart")',
    'terrainEnvironment.Name = "TerrainRockEnvironment"',
    'terrainEnvironment.Material = Enum.Material.Slate',
    'terrainEnvironment.Color = Color3.fromRGB(54,68,82)',
    'terrainEnvironment.Parent = workspace',
    'local hud = Instance.new("ScreenGui")',
    'hud.Name = "ExtraUiDomain"',
    'local impactVfx = Instance.new("ParticleEmitter")',
    'impactVfx.Name = "ImpactVfx"',
    'impactVfx.Parent = terrainEnvironment',
    'Lighting.Brightness = 2',
    'RunService.RenderStepped:Connect(function(dt)',
    '  rootPart.CFrame = rootPart.CFrame * CFrame.new(0, 0, -dt)',
    '  shoulder.Transform = CFrame.Angles(math.sin(os.clock()*8)*0.15, 0, 0)',
    '  hip.Transform = CFrame.Angles(-math.sin(os.clock()*8)*0.12, 0, 0)',
    '  weaponEquipment.Orientation = weaponEquipment.Orientation + Vector3.new(0, dt * 8, 0)',
    'end)'
  ].join('\n')+'\n','utf8');
  const manifest=path.join(root,'manifest.json');
  fs.writeFileSync(manifest,JSON.stringify({
    sourceRoot:'roblox-games/demo',
    target:'roblox',
    changedFiles:['client/Visual.client.luau'],
    presentationQuality:{required:true,pass:'ASSET_ADAPTATION',runtimeChecks:['golden-scene-runtime'],authorityExpanded:false}
  },null,2));
  const result=runIncrementalQa({root,manifest,namespace:'roblox:articulated-motion'});
  assert.equal(result.presentationQa.status,'STATIC_PASS');
  assert.equal(result.presentationQa.pass,'ASSET_ADAPTATION');
  for(const check of [
    'ROBLOX_CHARACTER_ARTICULATION','ROBLOX_CHARACTER_ANIMATOR','ROBLOX_CHARACTER_JOINT_MOTION',
    'ROBLOX_CHARACTER_BLEND','ROBLOX_CHARACTER_SPEED_SYNC','ROBLOX_NO_WELD_ONLY_ARTICULATED_BODY',
    'ROBLOX_NO_ROOT_ONLY_MANNEQUIN_MOTION'
  ])assert.equal(result.presentationQa.checks.find(row=>row.name===check)?.pass,true,check);
  assert.equal(result.presentationQa.runtimeStillRequired,true);
});

test('Roblox asset adaptation hard fails a welded root-only humanoid mannequin',()=> {
  const root=repo();
  const sourceRoot=path.join(root,'roblox-games/demo');
  fs.mkdirSync(path.join(sourceRoot,'server'),{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'server/Game.server.luau'),[
    'local RunService = game:GetService("RunService")',
    'local function humanoidFigure()',
    '  local character = Instance.new("Model")',
    '  character.Name = "EnemyNPCCharacter"',
    '  local rootPart = Instance.new("Part")',
    '  rootPart.Name = "HumanoidRootPart"',
    '  rootPart.Parent = character',
    '  local torso = Instance.new("Part")',
    '  torso.Name = "Torso"',
    '  torso.Material = Enum.Material.SmoothPlastic',
    '  torso.Color = Color3.fromRGB(90,110,130)',
    '  torso.Parent = character',
    '  local arm = Instance.new("Part")',
    '  arm.Name = "RightArm"',
    '  arm.Parent = character',
    '  local leg = Instance.new("Part")',
    '  leg.Name = "RightLeg"',
    '  leg.Parent = character',
    '  local armWeld = Instance.new("WeldConstraint")',
    '  armWeld.Part0 = torso',
    '  armWeld.Part1 = arm',
    '  armWeld.Parent = arm',
    '  local legWeld = Instance.new("WeldConstraint")',
    '  legWeld.Part0 = torso',
    '  legWeld.Part1 = leg',
    '  legWeld.Parent = leg',
    '  local weaponEquipment = Instance.new("MeshPart")',
    '  weaponEquipment.Name = "SwordEquipment"',
    '  weaponEquipment.Material = Enum.Material.Metal',
    '  weaponEquipment.Parent = character',
    '  local terrainEnvironment = Instance.new("MeshPart")',
    '  terrainEnvironment.Name = "DungeonTerrainEnvironment"',
    '  terrainEnvironment.Material = Enum.Material.Slate',
    '  terrainEnvironment.Parent = workspace',
    '  RunService.Heartbeat:Connect(function(dt)',
    '    rootPart.CFrame = rootPart.CFrame * CFrame.new(0,0,-dt)',
    '  end)',
    '  return character',
    'end',
    'humanoidFigure()'
  ].join('\n')+'\n','utf8');
  const manifest=path.join(root,'manifest.json');
  fs.writeFileSync(manifest,JSON.stringify({
    sourceRoot:'roblox-games/demo',target:'roblox',changedFiles:['server/Game.server.luau'],
    presentationQuality:{required:true,pass:'ASSET_ADAPTATION',authorityExpanded:false}
  },null,2));
  assert.throws(
    ()=>runIncrementalQa({root,manifest,namespace:'roblox:mannequin-root-only'}),
    /CHARACTER_MOTION_MANNEQUIN/
  );
});

test('Roblox asset adaptation fails when a required core visual domain is missing regardless of extra domains',()=> {
  const root=repo();
  const sourceRoot=path.join(root,'roblox-games/demo');
  fs.mkdirSync(path.join(sourceRoot,'client'),{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'client/Visual.client.luau'),[
    'local RunService = game:GetService("RunService")',
    'local character = Instance.new("Model")',
    'local enemyBody = Instance.new("MeshPart")',
    'enemyBody.Name = "EnemyCreatureBody"',
    'enemyBody.Material = Enum.Material.SmoothPlastic',
    'enemyBody.Color = Color3.fromRGB(80,110,145)',
    'enemyBody.Parent = character',
    'local terrainEnvironment = Instance.new("MeshPart")',
    'terrainEnvironment.Name = "TerrainRockEnvironment"',
    'terrainEnvironment.Material = Enum.Material.Slate',
    'terrainEnvironment.Parent = workspace',
    'local hud = Instance.new("ScreenGui")',
    'local impactVfx = Instance.new("ParticleEmitter")',
    'impactVfx.Parent = terrainEnvironment',
    'RunService.RenderStepped:Connect(function(dt)',
    '  enemyBody.CFrame = enemyBody.CFrame * CFrame.Angles(0, dt * 0.4, 0)',
    'end)'
  ].join('\n')+'\n','utf8');
  const manifest=path.join(root,'manifest.json');
  fs.writeFileSync(manifest,JSON.stringify({
    sourceRoot:'roblox-games/demo',target:'roblox',changedFiles:['client/Visual.client.luau'],
    presentationQuality:{required:true,pass:'ASSET_ADAPTATION',authorityExpanded:false}
  },null,2));
  assert.throws(
    ()=>runIncrementalQa({root,manifest,namespace:'roblox:missing-core-domain'}),
    /ROBLOX_VISUAL_DOMAIN_WEAPON_EQUIPMENT/
  );
});

test('Roblox asset adaptation requires an actual transform mutation, not only a motion driver token',()=> {
  const root=repo();
  const sourceRoot=path.join(root,'roblox-games/demo');
  fs.mkdirSync(path.join(sourceRoot,'client'),{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'client/Visual.client.luau'),[
    'local RunService = game:GetService("RunService")',
    'local character = Instance.new("Model")',
    'local enemyBody = Instance.new("MeshPart")',
    'enemyBody.Name = "EnemyBody"',
    'local weaponEquipment = Instance.new("MeshPart")',
    'weaponEquipment.Name = "SwordEquipment"',
    'local terrainEnvironment = Instance.new("MeshPart")',
    'terrainEnvironment.Name = "TerrainEnvironment"',
    'enemyBody.Material = Enum.Material.SmoothPlastic',
    'enemyBody.Color = Color3.fromRGB(80,110,145)',
    'RunService.RenderStepped:Connect(function()',
    '  enemyBody.Color = Color3.fromRGB(82,112,148)',
    'end)'
  ].join('\n')+'\n','utf8');
  const manifest=path.join(root,'manifest.json');
  fs.writeFileSync(manifest,JSON.stringify({
    sourceRoot:'roblox-games/demo',target:'roblox',changedFiles:['client/Visual.client.luau'],
    presentationQuality:{required:true,pass:'ASSET_ADAPTATION',authorityExpanded:false}
  },null,2));
  assert.throws(
    ()=>runIncrementalQa({root,manifest,namespace:'roblox:driver-without-transform'}),
    /ROBLOX_NATIVE_TRANSFORM_MUTATION/
  );
});

test('Roblox asset adaptation rejects a single primitive even when names mimic every required core domain',()=> {
  const root=repo();
  const sourceRoot=path.join(root,'roblox-games/demo');
  fs.mkdirSync(path.join(sourceRoot,'client'),{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'client/Visual.client.luau'),[
    'local RunService = game:GetService("RunService")',
    'local characterEnemy = Instance.new("Part")',
    'characterEnemy.Name = "CharacterEnemy"',
    'local weaponEquipment = characterEnemy',
    'local terrainEnvironment = characterEnemy',
    'characterEnemy.Material = Enum.Material.Metal',
    'characterEnemy.Color = Color3.fromRGB(80,110,145)',
    'RunService.RenderStepped:Connect(function(dt)',
    '  characterEnemy.CFrame = characterEnemy.CFrame * CFrame.Angles(0, dt, 0)',
    'end)'
  ].join('\n')+'\n','utf8');
  const manifest=path.join(root,'manifest.json');
  fs.writeFileSync(manifest,JSON.stringify({
    sourceRoot:'roblox-games/demo',target:'roblox',changedFiles:['client/Visual.client.luau'],
    presentationQuality:{required:true,pass:'ASSET_ADAPTATION',authorityExpanded:false}
  },null,2));
  assert.throws(
    ()=>runIncrementalQa({root,manifest,namespace:'roblox:single-primitive'}),
    /NO_SINGLE_PRIMITIVE_PLACEHOLDER/
  );
});

test('presentation living motion static QA requires continuous smooth motion signals',()=>{
  const root=repo();
  const sourceRoot=path.join(root,'web-games/presentation-motion');
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.html'),[
    '<!doctype html><html><body><canvas id="game"></canvas><script>',
    'let speed=0,rotation=0,idle=0;',
    'function update(){ speed += (1-speed)*0.08; rotation += (0-rotation)*0.1; idle=Math.sin(performance.now()*0.002); requestAnimationFrame(update); }',
    'requestAnimationFrame(update);',
    '</script></body></html>'
  ].join('\n'),'utf8');
  const manifest=path.join(root,'manifest.json');
  fs.writeFileSync(manifest,JSON.stringify({
    sourceRoot:'web-games/presentation-motion',
    changedFiles:['index.html'],
    presentationQuality:{
      required:true,pass:'LIVING_MOTION',
      runtimeChecks:['idle-walk-run-or-equivalent-runtime-continuity'],
      authorityExpanded:false
    }
  },null,2));
  const result=runIncrementalQa({root,manifest,namespace:'web:presentation-motion'});
  assert.equal(result.presentationQa.status,'STATIC_PASS');
  assert.equal(result.presentationQa.pass,'LIVING_MOTION');
  assert.equal(result.presentationQa.runtimeStillRequired,true);
  assert.equal(result.presentationQa.gameplaySemanticsPreservationRequired,true);
});

test('presentation audio static QA fails closed when controls and unlock path are missing',()=>{
  const root=repo();
  const sourceRoot=path.join(root,'web-games/presentation-audio');
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.html'),'<!doctype html><html><body><script>const music="silent";</script></body></html>\n','utf8');
  const manifest=path.join(root,'manifest.json');
  fs.writeFileSync(manifest,JSON.stringify({
    sourceRoot:'web-games/presentation-audio',
    changedFiles:['index.html'],
    presentationQuality:{required:true,pass:'AUDIO_FEEL',runtimeChecks:['audio-unlock-runtime'],authorityExpanded:false}
  },null,2));
  assert.throws(()=>runIncrementalQa({root,manifest,namespace:'web:presentation-audio'}),/PRESENTATION_STATIC_QA_FAILED:AUDIO_FEEL/);
});


test('incremental QA failure signatures are stable without claiming root cause',()=>{
  assert.equal(incrementalQaFailureSignature(new Error('SyntaxError in index.js: bad token')),'SYNTAX_ERROR');
  assert.equal(incrementalQaFailureSignature(new Error('merge conflict marker: index.html')),'MERGE_CONFLICT_MARKER');
  assert.equal(incrementalQaFailureSignature(new Error('changed file missing: index.html')),'CHANGED_FILE_MISSING');
  assert.match(incrementalQaFailureSignature(new Error('PRESENTATION_STATIC_QA_FAILED:LIVING_MOTION:IDLE_REQUIRED')),/^PRESENTATION_STATIC_QA_FAILED/);
});


test('diagnostic causal replay passes only when the exact prepatch issue disappears and carries conservative responsibility evidence',()=>{
  const root=repo();
  const sourceRoot=path.join(root,'web-games/diagnostic-demo');
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.js'),'let timer=setInterval(()=>{},1000); clearInterval(timer);\n','utf8');
  const manifest=path.join(root,'manifest.json');
  fs.writeFileSync(manifest,JSON.stringify({
    sourceRoot:'web-games/diagnostic-demo',
    changedFiles:['index.js'],
    exploration:{editContract:{causalReplay:{
      version:2,required:true,prePatchReproduced:true,executable:true,mode:'DIAGNOSTIC_RESCAN',
      status:'READY_FOR_POSTPATCH_DIAGNOSTIC_RESCAN',
      diagnosticType:'INTERVAL_CLEANUP_RISK',diagnosticFile:'index.js',
      verifiedResponsibleSystem:'GAME_RUNTIME',identicalOrEquivalentInputStateRequired:true
    }}}
  },null,2));
  const result=runIncrementalQa({root,manifest,namespace:'web:diagnostic-demo'});
  assert.equal(result.causalReplay.status,'EXECUTED_PASS');
  assert.equal(result.causalReplay.executed,true);
  assert.equal(result.causalReplay.prePatchReproduced,true);
  assert.equal(result.causalReplay.verificationMode,'DIAGNOSTIC_EXACT_TYPE_FILE_RESCAN');
  assert.equal(result.causalReplay.verifiedResponsibleSystem,'GAME_RUNTIME');
  assert.equal(result.causalReplay.targets[0].target,'diagnostic:INTERVAL_CLEANUP_RISK:index.js');
  assert.equal(result.causalReplay.canonicalQaStillRequired,true);
});

test('diagnostic causal replay fails closed when the exact issue remains after patch',()=>{
  const root=repo();
  const sourceRoot=path.join(root,'web-games/diagnostic-still-broken');
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.js'),'setInterval(()=>{},1000);\n','utf8');
  const manifest=path.join(root,'manifest.json');
  fs.writeFileSync(manifest,JSON.stringify({
    sourceRoot:'web-games/diagnostic-still-broken',
    changedFiles:['index.js'],
    exploration:{editContract:{causalReplay:{
      version:2,required:true,prePatchReproduced:true,executable:true,mode:'DIAGNOSTIC_RESCAN',
      status:'READY_FOR_POSTPATCH_DIAGNOSTIC_RESCAN',
      diagnosticType:'INTERVAL_CLEANUP_RISK',diagnosticFile:'index.js',
      verifiedResponsibleSystem:'GAME_RUNTIME'
    }}}
  },null,2));
  let replayError=null;
  try{runIncrementalQa({root,manifest,namespace:'web:diagnostic-still-broken'});}catch(error){replayError=error;}
  assert.ok(replayError);
  assert.match(replayError.message,/CAUSAL_REPLAY_DIAGNOSTIC_STILL_PRESENT:INTERVAL_CLEANUP_RISK:index\.js/);
  assert.equal(replayError.causalReplay.status,'EXECUTED_FAIL');
  assert.equal(replayError.causalReplay.executed,true);
  assert.equal(replayError.causalReplay.prePatchReproduced,true);
  assert.equal(replayError.causalReplay.verifiedResponsibleSystem,null);
  assert.equal(replayError.causalReplay.targets[0].outcome,'STILL_PRESENT_AFTER_PATCH');
  assert.equal(replayError.causalReplay.canonicalQaStillRequired,true);
  assert.match(
    incrementalQaFailureSignature(new Error('CAUSAL_REPLAY_DIAGNOSTIC_STILL_PRESENT:INTERVAL_CLEANUP_RISK:index.js')),
    /^CAUSAL_REPLAY_DIAGNOSTIC_STILL_PRESENT/
  );
});

test('continuous worker persists responsible-system evidence only from a verified causal replay pass',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');
  assert.ok(workflow.includes('VIBE2_CAUSAL_REPLAY_VERIFIED_RESPONSIBLE_SYSTEM='));
  assert.ok(workflow.includes('causal_replay_verified_responsible_system='));
  assert.ok(workflow.includes('IQA_CAUSAL_REPLAY_VERIFIED_RESPONSIBLE_SYSTEM'));
  assert.ok(workflow.includes('independent-qa-verified-responsible-system:'));
  assert.ok(workflow.includes("clean(process.env.IQA_CAUSAL_REPLAY_STATUS)==='EXECUTED_PASS'"));
  assert.ok(workflow.includes("clean(process.env.IQA_CAUSAL_REPLAY_EXECUTED).toUpperCase()==='YES'"));
  assert.ok(workflow.includes("clean(process.env.IQA_CAUSAL_REPLAY_PREPATCH_REPRODUCED).toUpperCase()==='YES'"));
});


test('specialized focused QA verifies structural evidence but never emits final learning markers',()=>{
  const root=repo();
  const sourceRoot=path.join(root,'web-games/story-specialized');
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'game.js'),[
    "const story={stage:'OPENING',state:{}};",
    "function advanceStory(event){ if(event.cause&&event.prerequisite){ story.stage='EARLY'; story.state.lastEvent=event.id; } }",
    "const questGraph={quests:[{id:'q1',objective:'find',prerequisite:'story:EARLY',complete:false,consequence:'unlock'}]};",
    "function completeQuest(q){ q.complete=true; return q.consequence; }"
  ].join('\n')+'\n','utf8');
  const manifest=path.join(root,'manifest.json');
  fs.writeFileSync(manifest,JSON.stringify({
    sourceRoot:'web-games/story-specialized',
    target:'web',
    changedFiles:['game.js'],
    specializedVerificationRequest:{
      version:1,required:true,target:'web',nativeRuntimeRequired:false,focusedQaRequired:true,
      markerOnlyPassForbidden:true,requestAuthority:'VERIFICATION_REQUEST_ONLY_NOT_PASS',
      requestedMarkers:['VERIFIED_NARRATIVE_GAMEPLAY_CAUSALITY_PASS','VERIFIED_QUEST_GRAPH_PASS']
    }
  },null,2));
  const result=runIncrementalQa({root,manifest,namespace:'web:story-specialized'});
  assert.equal(result.outcome,'PASS');
  assert.equal(result.specializedVerificationQa.status,'FOCUSED_STATIC_PASS');
  assert.equal(result.specializedVerificationQa.results.VERIFIED_NARRATIVE_GAMEPLAY_CAUSALITY_PASS.pass,true);
  assert.equal(result.specializedVerificationQa.results.VERIFIED_QUEST_GRAPH_PASS.pass,true);
  assert.deepEqual(result.specializedVerificationQa.finalVerifiedMarkers,[]);
  assert.equal(result.specializedVerificationQa.finalMarkerAuthority,'FAN_IN_ONLY');
  assert.equal(result.specializedVerificationQa.fullRegressionStillRequired,true);
});

test('missing specialized structural evidence blocks learning promotion without failing game incremental QA',()=>{
  const root=repo();
  const sourceRoot=path.join(root,'web-games/missing-world-evidence');
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'game.js'),'export const score = 1;\n','utf8');
  const manifest=path.join(root,'manifest.json');
  fs.writeFileSync(manifest,JSON.stringify({
    sourceRoot:'web-games/missing-world-evidence',
    target:'web',
    changedFiles:['game.js'],
    specializedVerificationRequest:{
      version:1,required:true,target:'web',nativeRuntimeRequired:false,focusedQaRequired:true,
      requestedMarkers:['VERIFIED_WORLD_ROUTE_NAVIGATION_PASS']
    }
  },null,2));
  const result=runIncrementalQa({root,manifest,namespace:'web:missing-world-evidence'});
  assert.equal(result.outcome,'PASS');
  assert.equal(result.specializedVerificationQa.status,'FOCUSED_STATIC_NOT_VERIFIED');
  assert.deepEqual(result.specializedVerificationQa.failedMarkers,['VERIFIED_WORLD_ROUTE_NAVIGATION_PASS']);
  assert.equal(result.specializedVerificationQa.learningPromotionBlocked,true);
  assert.equal(result.specializedVerificationQa.gameReleaseBlockedBySpecializedQa,false);
  assert.deepEqual(result.specializedVerificationQa.finalVerifiedMarkers,[]);
});
