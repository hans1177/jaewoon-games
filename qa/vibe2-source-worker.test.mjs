// 파일명: qa/vibe2-source-worker.test.mjs
// 역할: Vibe2 텍스트 source worker의 격리, 책임 파일 경계, 웹 유지보수, 바이너리 차단과 안전 편집 일치를 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runVibe2SourceWorker, buildSpecializedVerificationRequest, buildGenerationRetryPrompt, shouldRetryGenerationError, generationFailureClass, modelResponseComplete, evaluateSemanticDiffBudget, recoverPartialJsonEdit, recoverFocusedReplaceOnly, generationAttemptBudget, exactRetryAnchorSuggestions, focusedReplaceOnlySpec, buildFocusedReplaceOnlyPrompt, normalizeFocusedReplaceOnly, fullWebProgressCreditEligible, diagnosticFocusedReplaceOnlySpec, buildDiagnosticFocusedReplaceOnlyPrompt, evaluateDiagnosticPostcondition, deterministicDiagnosticCandidate, evaluatePresentationCandidateDelta, evaluateStudioQualityCandidateDelta, buildRobloxNativeSourceInspection, inspectRobloxNativeCandidateQuality } from '../tools/vibe2-source-worker.mjs';
import { applyExactEdits } from '../tools/autonomous-safe-edit.mjs';
import { classifyVibePatchSaturation } from '../assets/vibe-quality-intelligence.js';

function tempRoot() { return fs.mkdtempSync(path.join(os.tmpdir(), 'vibe2-source-worker-')); }
function write(file, content) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content, 'utf8'); }
function order({ target = 'unity', root = 'unity-games/demo', responsibleFiles = [], taskId = 'task-1' } = {}) {
  return {
    run: true,
    workMode: 'source-change-candidate',
    taskId,
    gameId: 'demo',
    target,
    goal: '기존 책임 파일을 직접 수정해 동작을 보강',
    department: 'development',
    source: { root, responsibleFiles },
    qa: ['syntax', 'regression'],
    workerPolicy: { directMainWrite: false }
  };
}

function robloxFullGraphicsMotionPatch(accent='70,95,130') {
  return [
    'local RunService = game:GetService("RunService")',
    'local character = Instance.new("Model")',
    'character.Name = "PlayerCharacterVisual"',
    'local enemyBody = Instance.new("MeshPart")',
    'enemyBody.Name = "EnemyBody"',
    'enemyBody.Material = Enum.Material.SmoothPlastic',
    'enemyBody.Color = Color3.fromRGB(' + accent + ')',
    'enemyBody.Parent = character',
    'local weapon = Instance.new("MeshPart")',
    'weapon.Name = "SwordEquipment"',
    'weapon.Material = Enum.Material.Metal',
    'weapon.Parent = character',
    'local terrainRock = Instance.new("MeshPart")',
    'terrainRock.Name = "TerrainRockEnvironment"',
    'terrainRock.Material = Enum.Material.Slate',
    'terrainRock.Color = Color3.fromRGB(58,70,82)',
    'terrainRock.Parent = workspace',
    'local hud = Instance.new("ScreenGui")',
    'hud.Name = "PresentationHud"',
    'local impactVfx = Instance.new("ParticleEmitter")',
    'impactVfx.Name = "ImpactVfx"',
    'impactVfx.Parent = terrainRock',
    'RunService.RenderStepped:Connect(function(dt)',
    '  enemyBody.CFrame = enemyBody.CFrame * CFrame.Angles(0, dt * 0.4, 0)',
    '  weapon.Orientation = weapon.Orientation + Vector3.new(0, dt * 8, 0)',
    'end)',
    'panel.BackgroundColor3 = Color3.fromRGB(' + accent + ')'
  ].join('\n');
}

test('Roblox source worker inspects native responsibilities before generation',()=>{
  const inspection=buildRobloxNativeSourceInspection({
    order:{target:'roblox'},
    responsibleFiles:['server/Combat.server.luau','client/Input.client.luau'],
    context:{files:[
      {path:'server/Combat.server.luau',editable:true,content:'Remote.OnServerEvent:Connect(function(player, payload)\n local store = DataStoreService:GetDataStore("save")\nend)'},
      {path:'client/Input.client.luau',editable:true,content:'UserInputService.TouchStarted:Connect(function() Remote:FireServer({action="attack"}) end)'}
    ]}
  });
  assert.equal(inspection.required,true);
  assert.ok(inspection.systems.includes('REMOTE_EVENTS_AND_FUNCTIONS'));
  assert.ok(inspection.systems.includes('DATASTORE_SAVE_LOAD'));
  assert.ok(inspection.systems.includes('TOUCH_INPUT'));
  assert.ok(inspection.responsibilities.some(row=>row.role==='SERVER_AUTHORITY'));
  assert.ok(inspection.responsibilities.some(row=>row.role==='CLIENT_INPUT_OR_PRESENTATION'));
});

test('Roblox source inspection detects articulated rig and character motion ownership',()=>{
  const inspection=buildRobloxNativeSourceInspection({
    order:{target:'roblox'},
    responsibleFiles:['server/Npc.server.luau'],
    context:{files:[{
      path:'server/Npc.server.luau',editable:true,
      content:[
        'local npc = Instance.new("Model")',
        'local humanoid = Instance.new("Humanoid")',
        'local animator = Instance.new("Animator")',
        'animator.Parent = humanoid',
        'local torso = Instance.new("Part")',
        'local arm = Instance.new("Part")',
        'local shoulder = Instance.new("Motor6D")',
        'shoulder.Part0 = torso',
        'shoulder.Part1 = arm',
        'npc:PivotTo(CFrame.new(0,4,0))'
      ].join("\n")
    }]}
  });
  assert.ok(inspection.systems.includes('RIG_AND_ANIMATION'));
  assert.ok(inspection.systems.includes('CHARACTER_MOTION'));
  assert.equal(inspection.motionQuality.rigSignals,true);
  assert.equal(inspection.motionQuality.animatorSignals,true);
  assert.equal(inspection.motionQuality.rootTransformMotionSignals,true);
  assert.equal(inspection.motionQuality.libraryFirstRequired,true);
  assert.equal(inspection.motionQuality.hardFailure,'ROBLOX_CHARACTER_MOTION_MANNEQUIN');
  assert.ok(inspection.responsibilities[0].signals.includes('RIG_ANIMATION'));
  assert.ok(inspection.responsibilities[0].signals.includes('CHARACTER_MOTION'));
});

test('Roblox candidate quality reports welded root-only mannequin motion risks',()=>{
  const result=inspectRobloxNativeCandidateQuality({candidate:{edits:[{
    path:'server/Game.server.luau',
    replace:[
      'local function humanoidFigure()',
      ' local npc = Instance.new("Model")',
      ' local torso = Instance.new("Part")',
      ' torso.Name = "Torso"',
      ' local arm = Instance.new("Part")',
      ' arm.Name = "RightArm"',
      ' local leg = Instance.new("Part")',
      ' leg.Name = "RightLeg"',
      ' local weld = Instance.new("WeldConstraint")',
      ' weld.Part0 = torso',
      ' weld.Part1 = arm',
      ' npc:PivotTo(CFrame.new(0,4,0))',
      'end'
    ].join("\n")
  }]}});
  assert.ok(result.motionQualityFindings.some(row=>row.class==='ROOT_ONLY_ARTICULATED_MOTION_RISK'));
  assert.ok(result.motionQualityFindings.some(row=>row.class==='WELD_CONSTRAINT_ONLY_CHARACTER_RISK'));
  assert.equal(result.motionQualityHardFailure,'ROBLOX_CHARACTER_MOTION_MANNEQUIN');
  assert.equal(result.automaticGameWideBlock,false);
});

test('Roblox candidate quality reports unsafe native patterns without creating a game-wide blocker',()=>{
  const result=inspectRobloxNativeCandidateQuality({candidate:{edits:[
    {path:'client/Game.client.luau',replace:'local store = DataStoreService:GetDataStore("save")\ncoins.Value = 100'},
    {path:'server/Remote.server.luau',replace:'Remote.OnServerEvent:Connect(function(player, amount) reward(player, amount) end)'}
  ]}});
  assert.equal(result.automaticGameWideBlock,false);
  assert.ok(result.findings.some(row=>row.class==='CLIENT_DATASTORE_AUTHORITY'));
  assert.ok(result.findings.some(row=>row.class==='REMOTE_INPUT_VALIDATION_WEAK'));
  assert.ok(result.securityRelevantFindings.length>=2);
});

test('presentation candidate delta rejects marker-only edits and accepts actual visual source changes',()=>{
  const contract={required:true,pass:'ASSET_ADAPTATION'};
  const markerOnly=evaluatePresentationCandidateDelta({
    contract,
    candidate:{edits:[{path:'client/Game.client.luau',find:'part.Color = Color3.fromRGB(20,20,20)',replace:'part.Color = Color3.fromRGB(20,20,20)\nlocal PRESENTATION_QUALITY_VERSION = 2'}]}
  });
  assert.equal(markerOnly.required,true);
  assert.equal(markerOnly.pass,false);
  assert.equal(markerOnly.reason,'NO_RELEVANT_PRESENTATION_DELTA_IN_PATCH');

  const visible=evaluatePresentationCandidateDelta({
    contract,
    candidate:{edits:[{path:'client/Game.client.luau',find:'part.Color = Color3.fromRGB(20,20,20)',replace:'part.Color = Color3.fromRGB(70,95,130)'}]}
  });
  assert.equal(visible.pass,true);
  assert.equal(visible.presentationPass,'ASSET_ADAPTATION');
  assert.deepEqual(visible.files,['client/Game.client.luau']);
  assert.equal(visible.changedVisualUnits,1);
});


test('presentation delta failure is retryable source generation work',()=>{
  const error=new Error('PRESENTATION_PATCH_DELTA_REQUIRED:ASSET_ADAPTATION');
  assert.equal(generationFailureClass(error),'PRESENTATION_PATCH_DELTA');
  assert.equal(shouldRetryGenerationError(error),true);
});


test('Roblox full graphics first attempt uses the compact connected package prompt',()=>{
  const largeBody=Array.from({length:900},(_,i)=>`local visualLine${i} = Color3.fromRGB(20,30,40)`).join('\n');
  const prompt=[
    '[PRESENTATION_PASS:ASSET_ADAPTATION]',
    'Engine: roblox',
    'Goal: improve full Roblox graphics and native motion without changing gameplay',
    'Allowed edit paths: client/Game.client.luau',
    '=== FILE client/Game.client.luau [EDITABLE] ===',
    'local character = workspace:FindFirstChild("Character")',
    'local weapon = workspace:FindFirstChild("Sword")',
    'local terrainRock = workspace:FindFirstChild("TerrainRock")',
    largeBody
  ].join('\n');
  const initial=buildGenerationRetryPrompt(prompt,{
    allowFullRewrite:false,
    responsibleFiles:['client/Game.client.luau'],
    attempt:1,
    robloxGraphicsInitial:true,
    robloxFullGraphicsPackageActive:true
  });
  assert.match(initial,/INITIAL ROBLOX FULL GRAPHICS PACKAGE/i);
  assert.match(initial,/ROBLOX FULL GRAPHICS RECOVERY PACKAGE/i);
  assert.match(initial,/connected edits\[\] package/i);
  assert.match(initial,/additional visual domains.*no upper limit/i);
  assert.ok(Buffer.byteLength(initial,'utf8')<Buffer.byteLength(prompt,'utf8'));
  assert.doesNotMatch(initial,/exactly one edit/i);
});

test('Roblox full graphics first source-worker attempt completes as a full package without early-stop mode',async()=>{
  const cwd=tempRoot();
  const root='roblox-games/demo';
  const relative='client/Game.client.luau';
  const source=[
    'local score = 0',
    'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    'return score'
  ].join('\n')+'\n';
  const workOrder=order({target:'roblox',root,responsibleFiles:[`${root}/${relative}`],taskId:'roblox-full-graphics-initial-package'});
  workOrder.goal='[PRESENTATION_PASS:ASSET_ADAPTATION] improve full Roblox graphics and native motion without changing gameplay';
  workOrder.presentationQuality={required:true,pass:'ASSET_ADAPTATION',authorityExpanded:false};
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));

  const strong=path.join(cwd,'initial-package.json');
  write(strong,JSON.stringify({edits:[{
    path:relative,
    find:'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    replace:robloxFullGraphicsMotionPatch('104,134,170')
  }]}));

  const result=await runVibe2SourceWorker({cwd,responseFiles:[strong]});
  assert.equal(result.generation.attempts,1);
  assert.equal(result.generation.recoveryUsed,false);
  assert.equal(result.generation.robloxFullGraphicsInitialPackage,true);
  assert.equal(result.generation.focusedFirstEditEarlyStop,false);
  assert.equal(result.generation.completionMode,'JSON_EDIT');
  assert.equal(result.presentationCandidateDelta.pass,true);
  const candidate=fs.readFileSync(path.join(cwd,'.vibe2/candidates',workOrder.taskId,'files',relative),'utf8');
  assert.match(candidate,/EnemyBody/);
  assert.match(candidate,/SwordEquipment/);
  assert.match(candidate,/TerrainRockEnvironment/);
  assert.match(candidate,/RenderStepped/);
  assert.match(candidate,/weapon\.Orientation\s*=/);
});

test('Roblox full graphics keeps package mode after repeated no-op failures',async()=>{
  const cwd=tempRoot();
  const root='roblox-games/demo';
  const relative='client/Game.client.luau';
  const source=[
    'local score = 0',
    'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    'return score'
  ].join('\n')+'\n';
  const workOrder=order({target:'roblox',root,responsibleFiles:[`${root}/${relative}`],taskId:'roblox-full-graphics-package-state'});
  workOrder.goal='[PRESENTATION_PASS:ASSET_ADAPTATION] improve full Roblox graphics and native motion without changing gameplay';
  workOrder.presentationQuality={required:true,pass:'ASSET_ADAPTATION',authorityExpanded:false};
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));

  const weak1=path.join(cwd,'noop-1.json');
  const weak2=path.join(cwd,'noop-2.json');
  const strong=path.join(cwd,'strong-package.json');
  const noOp={edits:[{
    path:relative,
    find:'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    replace:'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)'
  }]};
  write(weak1,JSON.stringify(noOp));
  write(weak2,JSON.stringify(noOp));
  write(strong,JSON.stringify({edits:[{
    path:relative,
    find:'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    replace:robloxFullGraphicsMotionPatch('112,142,178')
  }]}));

  const result=await runVibe2SourceWorker({cwd,responseFiles:[weak1,weak2,strong]});
  assert.equal(result.generation.attempts,3);
  assert.equal(result.generation.recoveryUsed,true);
  assert.equal(result.generation.focusedReplaceOnly,false);
  assert.equal(result.generation.completionMode,'JSON_EDIT');
  assert.equal(result.generation.robloxFullGraphicsInitialPackage,true);
  const candidate=fs.readFileSync(path.join(cwd,'.vibe2/candidates',workOrder.taskId,'files',relative),'utf8');
  assert.match(candidate,/SwordEquipment/);
  assert.match(candidate,/TerrainRockEnvironment/);
  assert.match(candidate,/RenderStepped/);
});

test('Roblox full graphics domain recovery keeps a connected multi-edit package instead of collapsing to one edit',()=>{
  const prompt=[
    '[PRESENTATION_PASS:ASSET_ADAPTATION]',
    'Engine: roblox',
    'Goal: improve full Roblox graphics and native motion without changing gameplay',
    'Allowed edit paths: client/Game.client.luau, shared/VisualStyle.luau',
    '=== FILE client/Game.client.luau [EDITABLE] ===',
    'local character = workspace:FindFirstChild("Character")',
    'local weapon = workspace:FindFirstChild("Sword")',
    'local terrainRock = workspace:FindFirstChild("TerrainRock")',
    'camera.FieldOfView = 70',
    '=== FILE shared/VisualStyle.luau [EDITABLE] ===',
    'local accent = Color3.fromRGB(20,30,40)',
    'local material = Enum.Material.SmoothPlastic'
  ].join('\n');
  const retry=buildGenerationRetryPrompt(prompt,{
    allowFullRewrite:false,
    error:new Error('ROBLOX_ASSET_ADAPTATION_DOMAINS_REQUIRED:MISSING_WEAPON_EQUIPMENT,ENVIRONMENT_TERRAIN'),
    responsibleFiles:['client/Game.client.luau','shared/VisualStyle.luau'],
    attempt:3
  });
  assert.match(retry,/ROBLOX FULL GRAPHICS RECOVERY PACKAGE/i);
  assert.match(retry,/connected edits\[\] package/i);
  assert.match(retry,/distinct exact anchors/i);
  assert.match(retry,/additional visual domains.*no upper limit/i);
  assert.doesNotMatch(retry,/exactly one edit/i);
});

test('Roblox full graphics edit-match recovery keeps the connected package contract',()=>{
  const prompt=[
    '[PRESENTATION_PASS:ASSET_ADAPTATION]',
    'Engine: roblox',
    'Goal: improve full Roblox graphics and native motion without changing gameplay',
    'Allowed edit paths: client/Game.client.luau',
    '=== FILE client/Game.client.luau [EDITABLE] ===',
    'local character = workspace:FindFirstChild("Character")',
    'local weapon = workspace:FindFirstChild("Sword")',
    'local terrainRock = workspace:FindFirstChild("TerrainRock")',
    'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)'
  ].join('\n');
  const retry=buildGenerationRetryPrompt(prompt,{
    allowFullRewrite:false,
    error:new Error('edit find 불일치: client/Game.client.luau'),
    responsibleFiles:['client/Game.client.luau'],
    attempt:2
  });
  assert.match(retry,/ROBLOX FULL GRAPHICS RECOVERY PACKAGE/i);
  assert.match(retry,/connected edits\[\] package/i);
  assert.match(retry,/distinct exact anchors/i);
  assert.doesNotMatch(retry,/exactly one edit/i);
});

test('Roblox full graphics domain recovery carries partial progress and prioritizes missing domains',()=>{
  const prompt=[
    '[PRESENTATION_PASS:ASSET_ADAPTATION]',
    'Engine: roblox',
    'Goal: improve full Roblox graphics and native motion without changing gameplay',
    'Allowed edit paths: client/Game.client.luau',
    '=== FILE client/Game.client.luau [EDITABLE] ===',
    'local character = workspace:FindFirstChild("Character")',
    'local weapon = workspace:FindFirstChild("Sword")',
    'local terrainRock = workspace:FindFirstChild("TerrainRock")',
    'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)'
  ].join('\n');
  const previous=JSON.stringify({edits:[{
    path:'client/Game.client.luau',
    find:'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    replace:'local enemyBody = Instance.new("MeshPart")\\nlocal terrainRock = Instance.new("MeshPart")\\npanel.BackgroundColor3 = Color3.fromRGB(70,95,130)\\nRunService.RenderStepped:Connect(function(dt) enemyBody.CFrame = enemyBody.CFrame * CFrame.Angles(0,dt,0) end)'
  }]});
  const retry=buildGenerationRetryPrompt(prompt,{
    allowFullRewrite:false,
    error:new Error('ROBLOX_ASSET_ADAPTATION_DOMAINS_REQUIRED:MISSING_WEAPON_EQUIPMENT'),
    responsibleFiles:['client/Game.client.luau'],
    attempt:4,
    previousOutput:previous
  });
  assert.match(retry,/MISSING CORE VISUAL DOMAINS TO ADD FIRST: WEAPON_EQUIPMENT/i);
  assert.match(retry,/PREVIOUS VALID PARTIAL ROBLOX GRAPHICS CANDIDATE/i);
  assert.match(retry,/BEGIN_PREVIOUS_ROBLOX_GRAPHICS_CANDIDATE/i);
  assert.match(retry,/enemyBody = Instance\.new/i);
  assert.match(retry,/return a complete candidate against the ORIGINAL/i);
});

test('Roblox full graphics source worker switches to package recovery after a core-domain failure',async()=>{
  const cwd=tempRoot();
  const root='roblox-games/demo';
  const relative='client/Game.client.luau';
  const source=[
    'local score = 0',
    'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    'return score'
  ].join('\n')+'\n';
  const workOrder=order({target:'roblox',root,responsibleFiles:[`${root}/${relative}`],taskId:'roblox-full-graphics-package-recovery'});
  workOrder.goal='[PRESENTATION_PASS:ASSET_ADAPTATION] improve full Roblox graphics and native motion without changing gameplay';
  workOrder.presentationQuality={required:true,pass:'ASSET_ADAPTATION',authorityExpanded:false};
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));

  const weak=path.join(cwd,'weak-visible.json');
  const strong=path.join(cwd,'strong-package.json');
  write(weak,JSON.stringify({edits:[{
    path:relative,
    find:'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    replace:'panel.BackgroundColor3 = Color3.fromRGB(70,95,130)'
  }]}));
  write(strong,JSON.stringify({edits:[{
    path:relative,
    find:'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    replace:robloxFullGraphicsMotionPatch('74,102,138')
  }]}));

  const result=await runVibe2SourceWorker({cwd,responseFiles:[weak,strong]});
  assert.equal(result.generation.attempts,2);
  assert.equal(result.generation.recoveryUsed,true);
  assert.equal(result.generation.focusedReplaceOnly,false);
  assert.equal(result.generation.completionMode,'JSON_EDIT');
  const candidate=fs.readFileSync(path.join(cwd,'.vibe2/candidates',workOrder.taskId,'files',relative),'utf8');
  assert.match(candidate,/EnemyBody/);
  assert.match(candidate,/SwordEquipment/);
  assert.match(candidate,/TerrainRockEnvironment/);
  assert.match(candidate,/RenderStepped/);
  assert.match(candidate,/enemyBody\.CFrame\s*=/);
});

test('Roblox full graphics source worker stays in package mode after edit-match failure',async()=>{
  const cwd=tempRoot();
  const root='roblox-games/demo';
  const relative='client/Game.client.luau';
  const source=[
    'local score = 0',
    'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    'return score'
  ].join('\n')+'\n';
  const workOrder=order({target:'roblox',root,responsibleFiles:[`${root}/${relative}`],taskId:'roblox-full-graphics-edit-match-package'});
  workOrder.goal='[PRESENTATION_PASS:ASSET_ADAPTATION] improve full Roblox graphics and native motion without changing gameplay';
  workOrder.presentationQuality={required:true,pass:'ASSET_ADAPTATION',authorityExpanded:false};
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));

  const bad=path.join(cwd,'bad-find.json');
  const strong=path.join(cwd,'strong-package.json');
  write(bad,JSON.stringify({edits:[{
    path:relative,
    find:'panel.BackgroundColor3 = Color3.fromRGB(1,2,3)',
    replace:'panel.BackgroundColor3 = Color3.fromRGB(70,95,130)'
  }]}));
  write(strong,JSON.stringify({edits:[{
    path:relative,
    find:'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    replace:robloxFullGraphicsMotionPatch('96,126,162')
  }]}));

  const result=await runVibe2SourceWorker({cwd,responseFiles:[bad,strong]});
  assert.equal(result.generation.attempts,2);
  assert.equal(result.generation.recoveryUsed,true);
  assert.equal(result.generation.focusedReplaceOnly,false);
  assert.equal(result.generation.completionMode,'JSON_EDIT');
  const candidate=fs.readFileSync(path.join(cwd,'.vibe2/candidates',workOrder.taskId,'files',relative),'utf8');
  assert.match(candidate,/96,126,162/);
  assert.match(candidate,/SwordEquipment/);
  assert.match(candidate,/RenderStepped/);
});

test('Roblox full graphics recovery uses the configured fourth attempt after repeated visual-domain failures',async()=>{
  const cwd=tempRoot();
  const root='roblox-games/demo';
  const relative='client/Game.client.luau';
  const source=[
    'local score = 0',
    'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    'return score'
  ].join('\n')+'\n';
  const workOrder=order({target:'roblox',root,responsibleFiles:[`${root}/${relative}`],taskId:'roblox-full-graphics-fourth-attempt'});
  workOrder.goal='[PRESENTATION_PASS:ASSET_ADAPTATION] improve full Roblox graphics and native motion without changing gameplay';
  workOrder.presentationQuality={required:true,pass:'ASSET_ADAPTATION',authorityExpanded:false};
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));

  const weakFiles=[1,2,3].map(n=>path.join(cwd,`weak-${n}.json`));
  for(const file of weakFiles){
    write(file,JSON.stringify({edits:[{
      path:relative,
      find:'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
      replace:'panel.BackgroundColor3 = Color3.fromRGB(70,95,130)'
    }]}));
  }
  const strong=path.join(cwd,'strong-fourth.json');
  write(strong,JSON.stringify({edits:[{
    path:relative,
    find:'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    replace:robloxFullGraphicsMotionPatch('88,118,154')
  }]}));

  const result=await runVibe2SourceWorker({cwd,responseFiles:[...weakFiles,strong]});
  assert.equal(result.generation.attempts,4);
  assert.equal(result.generation.recoveryUsed,true);
  assert.equal(result.generation.focusedReplaceOnly,false);
  assert.equal(result.generation.completionMode,'JSON_EDIT');
  const candidate=fs.readFileSync(path.join(cwd,'.vibe2/candidates',workOrder.taskId,'files',relative),'utf8');
  assert.match(candidate,/88,118,154/);
  assert.match(candidate,/RenderStepped/);
  assert.match(candidate,/weapon\.Orientation\s*=/);
});

test('Roblox presentation recovery reaches a real visual source delta on the package retry',async()=>{
  const cwd=tempRoot();
  const root='roblox-games/demo';
  const relative='client/Game.client.luau';
  const source=[
    'local score = 0',
    'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    'return score'
  ].join('\n')+'\n';
  const workOrder=order({
    target:'roblox',
    root,
    responsibleFiles:[`${root}/${relative}`],
    taskId:'roblox-presentation-delta-recovery'
  });
  workOrder.goal='[PRESENTATION_PASS:ASSET_ADAPTATION] improve real visible Roblox presentation without changing gameplay';
  workOrder.presentationQuality={required:true,pass:'ASSET_ADAPTATION',authorityExpanded:false};
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));

  const bad1=path.join(cwd,'presentation-bad-1.json');
  const good=path.join(cwd,'presentation-good-package.json');
  write(bad1,JSON.stringify({edits:[{path:relative,find:'local score = 0',replace:'local score = 1'}]}));
  write(good,JSON.stringify({edits:[{path:relative,find:'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',replace:robloxFullGraphicsMotionPatch('70,95,130')}]}));

  const result=await runVibe2SourceWorker({cwd,responseFiles:[bad1,good]});
  assert.equal(result.generation.attempts,2);
  assert.equal(result.generation.recoveryUsed,true);
  assert.equal(result.generation.focusedReplaceOnly,false);
  assert.equal(result.presentationCandidateDelta.pass,true);
  assert.equal(result.presentationCandidateDelta.presentationPass,'ASSET_ADAPTATION');
  assert.deepEqual(result.changedFiles,[relative]);
  const candidate=fs.readFileSync(path.join(cwd,'.vibe2/candidates',workOrder.taskId,'files',relative),'utf8');
  assert.match(candidate,/Color3\.fromRGB\(70,95,130\)/);
  assert.match(candidate,/RenderStepped/);
  assert.match(candidate,/enemyBody\.CFrame\s*=/);
  assert.match(candidate,/local score = 0/);
});

test('presentation delta uses the configured fourth recovery attempt instead of stopping after attempt three',async()=>{
  const cwd=tempRoot();
  const root='roblox-games/demo';
  const relative='client/Game.client.luau';
  const source=[
    'local score = 0',
    'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    'return score'
  ].join('\n')+'\n';
  const workOrder=order({target:'roblox',root,responsibleFiles:[`${root}/${relative}`],taskId:'roblox-presentation-fourth-retry'});
  workOrder.goal='[PRESENTATION_PASS:ASSET_ADAPTATION] improve real visible Roblox presentation without changing gameplay';
  workOrder.presentationQuality={required:true,pass:'ASSET_ADAPTATION',authorityExpanded:false};
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));

  const r1=path.join(cwd,'presentation-r1.json');
  const r2=path.join(cwd,'presentation-r2.json');
  const r3=path.join(cwd,'presentation-r3.json');
  const r4=path.join(cwd,'presentation-r4.json');
  write(r1,JSON.stringify({edits:[{path:relative,find:'local score = 0',replace:'local score = 1'}]}));
  write(r2,JSON.stringify({edits:[{path:relative,find:'local score = 0',replace:'local score = 2'}]}));
  write(r3,JSON.stringify({edits:[{path:relative,find:'local score = 0',replace:'local score = 3'}]}));
  write(r4,JSON.stringify({edits:[{path:relative,find:'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',replace:robloxFullGraphicsMotionPatch('70,95,130')}]}));

  const result=await runVibe2SourceWorker({cwd,responseFiles:[r1,r2,r3,r4]});
  assert.equal(result.generation.attempts,4);
  assert.equal(result.generation.recoveryUsed,true);
  assert.equal(result.generation.focusedReplaceOnly,false);
  assert.equal(result.presentationCandidateDelta.pass,true);
  assert.deepEqual(result.changedFiles,[relative]);
});

test('repeated Roblox presentation delta stays in package mode instead of rotating to focused retry',async()=>{
  const cwd=tempRoot();
  const root='roblox-games/demo';
  const relative='client/Game.client.luau';
  const source=[
    'local score = 0',
    'camera.FieldOfView = 70',
    'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    'return score'
  ].join('\n')+'\n';
  const workOrder=order({target:'roblox',root,responsibleFiles:[`${root}/${relative}`],taskId:'roblox-presentation-anchor-rotation'});
  workOrder.goal='[PRESENTATION_PASS:ASSET_ADAPTATION] improve real visible Roblox presentation without changing gameplay';
  workOrder.presentationQuality={required:true,pass:'ASSET_ADAPTATION',authorityExpanded:false};
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));

  const r1=path.join(cwd,'presentation-rotate-r1.json');
  const r2=path.join(cwd,'presentation-rotate-r2.json');
  const r3=path.join(cwd,'presentation-rotate-r3.json');
  write(r1,JSON.stringify({edits:[{path:relative,find:'local score = 0',replace:'local score = 1'}]}));
  write(r2,JSON.stringify({edits:[{path:relative,find:'local score = 0',replace:'local presentationMarker = 2'}]}));
  write(r3,JSON.stringify({edits:[{path:relative,find:'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',replace:robloxFullGraphicsMotionPatch('70,95,130')}]}));

  const result=await runVibe2SourceWorker({cwd,responseFiles:[r1,r2,r3]});
  assert.equal(result.generation.attempts,3);
  assert.equal(result.generation.focusedReplaceOnly,false);
  assert.equal(result.generation.focusedReplaceAnchorRotations,0);
  assert.equal(result.presentationCandidateDelta.pass,true);
  const candidate=fs.readFileSync(path.join(cwd,'.vibe2/candidates',workOrder.taskId,'files',relative),'utf8');
  assert.match(candidate,/70,95,130/);
});

test('Roblox presentation package recovery keeps the fourth slot after malformed output',async()=>{
  const cwd=tempRoot();
  const root='roblox-games/demo';
  const relative='client/Game.client.luau';
  const source=[
    'local score = 0',
    'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    'return score'
  ].join('\n')+'\n';
  const workOrder=order({target:'roblox',root,responsibleFiles:[`${root}/${relative}`],taskId:'roblox-presentation-malformed-fourth-retry'});
  workOrder.goal='[PRESENTATION_PASS:ASSET_ADAPTATION] improve real visible Roblox presentation without changing gameplay';
  workOrder.presentationQuality={required:true,pass:'ASSET_ADAPTATION',authorityExpanded:false};
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));

  const r1=path.join(cwd,'presentation-malformed-r1.json');
  const r2=path.join(cwd,'presentation-malformed-r2.json');
  const r3=path.join(cwd,'presentation-malformed-r3.json');
  const r4=path.join(cwd,'presentation-malformed-r4.json');
  write(r1,JSON.stringify({edits:[{path:relative,find:'local score = 0',replace:'local score = 1'}]}));
  write(r2,JSON.stringify({replace:'local score = 2'}));
  write(r3,'{"replace":');
  write(r4,JSON.stringify({edits:[{path:relative,find:'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',replace:robloxFullGraphicsMotionPatch('82,110,148')}]}));

  const result=await runVibe2SourceWorker({cwd,responseFiles:[r1,r2,r3,r4]});
  assert.equal(result.generation.attempts,4);
  assert.equal(result.generation.focusedReplaceOnly,false);
  assert.equal(result.presentationCandidateDelta.pass,true);
  const candidate=fs.readFileSync(path.join(cwd,'.vibe2/candidates',workOrder.taskId,'files',relative),'utf8');
  assert.match(candidate,/82,110,148/);
  assert.match(candidate,/weapon\.Orientation\s*=/);
});

test('presentation focused recovery prioritizes visual anchors and forbids marker-only repair',()=>{
  const prompt=[
    '[PRESENTATION_PASS:ASSET_ADAPTATION]',
    'Engine: roblox',
    'Goal: improve visible Roblox presentation',
    'Allowed edit paths: client/Game.client.luau',
    '=== FILE client/Game.client.luau [EDITABLE] ===',
    'local score = 0',
    'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    'return score'
  ].join('\n');
  const anchors=exactRetryAnchorSuggestions(prompt,{max:2,responsibleFiles:['client/Game.client.luau']});
  assert.equal(anchors[0],'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)');
  const focused=buildFocusedReplaceOnlyPrompt(prompt,{
    error:new Error('PRESENTATION_PATCH_DELTA_REQUIRED:ASSET_ADAPTATION'),
    responsibleFiles:['client/Game.client.luau']
  });
  assert.ok(focused);
  assert.equal(focused.spec.find,'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)');
  assert.match(focused.prompt,/real visible render\/material\/color\/lighting\/motion\/camera\/VFX\/UI source behavior/i);
  assert.match(focused.prompt,/marker-only constants, comments, metadata, or gameplay-only changes are invalid/i);
});

test('Roblox presentation recovery prioritizes a client visual owner across multiple writable files',()=>{
  const prompt=[
    '[PRESENTATION_PASS:ASSET_ADAPTATION]',
    'Engine: roblox',
    'Goal: improve visible Roblox presentation without gameplay changes',
    'Allowed edit paths: server/Game.server.luau, client/Game.client.luau, shared/VisualStyle.luau',
    '=== FILE server/Game.server.luau [EDITABLE] ===',
    'local reward = 30',
    '=== FILE client/Game.client.luau [EDITABLE] ===',
    'camera.FieldOfView = 70',
    '=== FILE shared/VisualStyle.luau [EDITABLE] ===',
    'local accent = Color3.fromRGB(20,30,40)'
  ].join('\n');
  const focused=buildFocusedReplaceOnlyPrompt(prompt,{
    error:new Error('PRESENTATION_PATCH_DELTA_REQUIRED:ASSET_ADAPTATION'),
    responsibleFiles:['server/Game.server.luau','client/Game.client.luau','shared/VisualStyle.luau']
  });
  assert.ok(focused);
  assert.equal(focused.spec.path,'client/Game.client.luau');
  assert.equal(focused.spec.find,'camera.FieldOfView = 70');
  assert.match(focused.prompt,/ROBLOX PRESENTATION DELTA RECOVERY/i);

  const retry=buildGenerationRetryPrompt(prompt,{
    allowFullRewrite:false,
    error:new Error('PRESENTATION_PATCH_DELTA_REQUIRED:ASSET_ADAPTATION'),
    responsibleFiles:['server/Game.server.luau','client/Game.client.luau','shared/VisualStyle.luau'],
    attempt:2
  });
  assert.match(retry,/ROBLOX PRESENTATION PATCH DELTA RECOVERY/i);
  assert.match(retry,/client\/visual\/render\/UI\/camera\/VFX owner path/i);
  assert.match(retry,/observable native visual delta/i);
});

test('Roblox presentation recovery ranks a real visual anchor above a nonvisual primary target after timeout',()=>{
  const cwd=tempRoot();
  const sourceRoot=path.join(cwd,'roblox-games/demo');
  const relative='client/Game.client.luau';
  const source=[
    'local score = 0',
    'function updateScore() {',
    '  return score + 1',
    '}',
    'camera.FieldOfView = 70',
    'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)'
  ].join('\n')+'\n';
  write(path.join(sourceRoot,relative),source);
  const prompt=[
    '[PRESENTATION_PASS:ASSET_ADAPTATION]',
    'Engine: roblox',
    'Goal: improve visible Roblox presentation without changing gameplay',
    'Allowed edit paths: client/Game.client.luau',
    '=== FILE client/Game.client.luau [EDITABLE] ===',
    source.trimEnd()
  ].join('\n');
  const anchors=exactRetryAnchorSuggestions(prompt,{
    max:3,sourceRoot,responsibleFiles:[relative],preferredTargets:['updateScore']
  });
  assert.ok(anchors.length>=2);
  assert.equal(anchors[0],'camera.FieldOfView = 70');
  assert.notEqual(anchors[0],'function updateScore() {');

  const focused=buildFocusedReplaceOnlyPrompt(prompt,{
    error:new Error('Ollama 응답 시간 초과: 240000ms'),
    responsibleFiles:[relative],sourceRoot,preferredTargets:['updateScore']
  });
  assert.ok(focused);
  assert.equal(focused.spec.path,relative);
  assert.equal(focused.spec.find,'camera.FieldOfView = 70');
  assert.match(focused.prompt,/PRESENTATION TASK HARD RULE/i);
  assert.match(focused.prompt,/ROBLOX VISUAL ANCHOR RULE/i);
  assert.match(focused.prompt,/even when the previous failure was timeout/i);
});

test('studio build-up rejects micro patches and requires the configured connected source delta count',()=>{
  const contract={
    phase:'BUILD_UP',
    focusPillar:'STABILITY',
    realSourceDeltaRequired:true,
    requiredConnectedImprovements:{min:3,max:6}
  };
  const micro=evaluateStudioQualityCandidateDelta({
    contract,
    candidate:{edits:[{path:'Game.client.luau',find:'local a=1',replace:'local a=2'}]}
  });
  assert.equal(micro.required,true);
  assert.equal(micro.pass,false);
  assert.equal(micro.sourceDeltaUnits,1);
  assert.equal(micro.requiredSourceDeltaUnits,3);
  assert.equal(micro.reason,'INSUFFICIENT_CONNECTED_SOURCE_DELTAS');

  const packageDelta=evaluateStudioQualityCandidateDelta({
    contract,
    candidate:{edits:[
      {path:'Game.client.luau',find:'local a=1',replace:'local a=2'},
      {path:'Game.client.luau',find:'local b=1',replace:'local b=2'},
      {path:'Game.server.luau',find:'local c=1',replace:'local c=2'}
    ]}
  });
  assert.equal(packageDelta.pass,true);
  assert.equal(packageDelta.sourceDeltaUnits,3);
  assert.deepEqual(packageDelta.files,['Game.client.luau','Game.server.luau']);
});

test('studio presentation build-up requires at least two real visual source deltas',()=>{
  const contract={
    phase:'BUILD_UP',
    focusPillar:'PRESENTATION',
    realSourceDeltaRequired:true,
    requiredConnectedImprovements:{min:3,max:6}
  };
  const weak=evaluateStudioQualityCandidateDelta({
    contract,
    candidate:{edits:[
      {path:'Game.client.luau',find:'part.Color = Color3.fromRGB(20,20,20)',replace:'part.Color = Color3.fromRGB(70,95,130)'},
      {path:'Game.client.luau',find:'local a=1',replace:'local a=2'},
      {path:'Game.server.luau',find:'local b=1',replace:'local b=2'}
    ]}
  });
  assert.equal(weak.pass,false);
  assert.equal(weak.sourceDeltaUnits,3);
  assert.equal(weak.visualUnits,1);
  assert.equal(weak.requiredVisualUnits,2);
  assert.equal(weak.reason,'INSUFFICIENT_PRESENTATION_DELTAS');

  const strong=evaluateStudioQualityCandidateDelta({
    contract,
    candidate:{edits:[
      {path:'Game.client.luau',find:'part.Color = Color3.fromRGB(20,20,20)',replace:'part.Color = Color3.fromRGB(70,95,130)'},
      {path:'Game.client.luau',find:'camera.FieldOfView = 70',replace:'camera.FieldOfView = 76'},
      {path:'Game.server.luau',find:'local b=1',replace:'local b=2'}
    ]}
  });
  assert.equal(strong.pass,true);
  assert.equal(strong.visualUnits,2);
});

test('studio quality delta failure is retryable source generation work',()=>{
  const error=new Error('STUDIO_QUALITY_DELTA_REQUIRED:BUILD_UP:1/3:VISUAL:0/0:INSUFFICIENT_CONNECTED_SOURCE_DELTAS');
  assert.equal(generationFailureClass(error),'STUDIO_QUALITY_DELTA');
  assert.equal(shouldRetryGenerationError(error),true);
});

test('studio quality delta retry stays compact while requiring the full connected package breadth',()=>{
  const prompt=[
    '[STUDIO_QUALITY_EVOLUTION] cycle=1; phase=BUILD_UP; focus=PRESENTATION',
    'Engine: roblox',
    'Goal: improve the current presentation package without changing gameplay semantics',
    'Allowed edit paths: client/Game.client.luau, shared/VisualStyle.luau',
    '=== FILE client/Game.client.luau [EDITABLE] ===',
    'local camera = workspace.CurrentCamera',
    'local impact = 1',
    'local motion = 1',
    '=== FILE shared/VisualStyle.luau [EDITABLE] ===',
    'local palette = Color3.fromRGB(20,20,20)',
    'local outline = 1',
    'local lighting = 1',
    '=== FILE server/Unrelated.server.luau [READ-ONLY] ===',
    'UNRELATED_READ_ONLY_CONTEXT_SHOULD_BE_DROPPED'
  ].join('\n');
  const retry=buildGenerationRetryPrompt(prompt,{
    allowFullRewrite:false,
    error:new Error('STUDIO_QUALITY_DELTA_REQUIRED:BUILD_UP:1/3:VISUAL:1/2:INSUFFICIENT_CONNECTED_SOURCE_DELTAS'),
    responsibleFiles:['client/Game.client.luau','shared/VisualStyle.luau'],
    attempt:3
  });
  assert.match(retry,/STUDIO_QUALITY_EVOLUTION BUILD_UP: return 3-6 connected edits/i);
  assert.match(retry,/at least 3 actual source deltas/i);
  assert.match(retry,/at least 2 edits must change real visual/i);
  assert.doesNotMatch(retry,/exactly one edit/i);
  assert.doesNotMatch(retry,/UNRELATED_READ_ONLY_CONTEXT_SHOULD_BE_DROPPED/);
});

test('studio build-up starts with the same compact package contract instead of a timeout-prone full prompt',()=>{
  const huge='x'.repeat(9000);
  const prompt=[
    '[STUDIO_QUALITY_EVOLUTION] cycle=1; phase=BUILD_UP; focus=PRESENTATION',
    'Engine: roblox',
    'Goal: improve presentation with connected real source changes',
    'Allowed edit paths: client/Game.client.luau, shared/VisualStyle.luau',
    '=== FILE client/Game.client.luau [EDITABLE] ===',
    huge,
    'local camera = workspace.CurrentCamera',
    '=== FILE shared/VisualStyle.luau [EDITABLE] ===',
    huge,
    'local palette = Color3.fromRGB(20,20,20)',
    '=== FILE server/ReadOnly.server.luau [READ-ONLY] ===',
    'INITIAL_STUDIO_READ_ONLY_CONTEXT_MUST_DROP'
  ].join('\n');
  const initial=buildGenerationRetryPrompt(prompt,{
    allowFullRewrite:false,
    responsibleFiles:['client/Game.client.luau','shared/VisualStyle.luau'],
    attempt:1,
    studioInitial:true
  });
  assert.match(initial,/STUDIO QUALITY BUILD-UP: generate the connected implementation package directly/i);
  assert.match(initial,/return 3-6 connected edits/i);
  assert.match(initial,/at least 3 actual source deltas/i);
  assert.match(initial,/at least 2 edits must change real visual/i);
  assert.doesNotMatch(initial,/previous 1-edit micro patch/i);
  assert.doesNotMatch(initial,/INITIAL_STUDIO_READ_ONLY_CONTEXT_MUST_DROP/);
  assert.ok(Buffer.byteLength(initial,'utf8')<Buffer.byteLength(prompt,'utf8'),'initial studio prompt must be compacted before first model call');
});


test('studio edit-match at the base budget gets one exact-anchor recovery attempt without widening scope',async()=>{
  const cwd=tempRoot();
  const root='roblox-games/demo';
  const relative='client/Game.client.luau';
  const source=[
    'local alpha = 1',
    'local beta = 1',
    'local gamma = 1',
    'return { alpha = alpha, beta = beta, gamma = gamma }'
  ].join('\n')+'\n';
  const workOrder=order({
    target:'roblox',
    root,
    responsibleFiles:[`${root}/${relative}`],
    taskId:'studio-edit-match-credit'
  });
  workOrder.selectedTask={
    id:workOrder.taskId,
    gameId:'demo',
    target:'roblox',
    evidence:['studio-quality-loop:v1'],
    studioQualityEvolution:{
      phase:'BUILD_UP',
      focusPillar:'STABILITY',
      realSourceDeltaRequired:true,
      requiredConnectedImprovements:{min:3,max:6}
    }
  };
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));

  const responseFiles=[];
  for(let i=1;i<=3;i+=1){
    const file=path.join(cwd,`bad-studio-${i}.json`);
    write(file,JSON.stringify({edits:[
      {path:relative,find:'local alpha = 9',replace:'local alpha = 2'},
      {path:relative,find:'local beta = 9',replace:'local beta = 2'},
      {path:relative,find:'local gamma = 9',replace:'local gamma = 2'}
    ]}));
    responseFiles.push(file);
  }
  const good=path.join(cwd,'good-studio.json');
  write(good,JSON.stringify({edits:[
    {path:relative,find:'local alpha = 1',replace:'local alpha = 2'},
    {path:relative,find:'local beta = 1',replace:'local beta = 2'},
    {path:relative,find:'local gamma = 1',replace:'local gamma = 2'}
  ]}));
  responseFiles.push(good);

  const result=await runVibe2SourceWorker({cwd,responseFiles});
  assert.equal(result.generation.attempts,4);
  assert.equal(result.generation.baseAttemptBudget,3);
  assert.equal(result.generation.effectiveAttemptBudget,4);
  assert.deepEqual(result.changedFiles,[relative]);
  const candidate=fs.readFileSync(path.join(cwd,'.vibe2/candidates',workOrder.taskId,'files',relative),'utf8');
  assert.match(candidate,/local alpha = 2/);
  assert.match(candidate,/local beta = 2/);
  assert.match(candidate,/local gamma = 2/);
});

test('repeated identical failure signature escalates to root cause mode instead of counting unrelated failures',()=>{
  const result=classifyVibePatchSaturation({
    responsibleFiles:['web-games/demo/index.html'],
    threshold:3,
    attempts:[
      {status:'FAIL',failureSignature:'same-sync',responsibleFiles:['web-games/demo/index.html']},
      {status:'FAIL',failureSignature:'other-ui',responsibleFiles:['web-games/demo/index.html']},
      {status:'REPAIR_REQUIRED',failureSignature:'same-sync',responsibleFiles:['web-games/demo/index.html']},
      {status:'FAILED',failureSignature:'same-sync',responsibleFiles:['web-games/demo/index.html']}
    ]
  });
  assert.equal(result.saturated,true);
  assert.equal(result.mode,'ROOT_CAUSE_MODE');
  assert.equal(result.repeatedFailureSignature,'same-sync');
  assert.equal(result.repeatCount,3);
  assert.equal(result.sameApproachWithoutNewCausalEvidenceForbidden,true);
  assert.ok(result.actions.includes('COMPARE_LAST_KNOWN_GOOD_FIRST_BROKEN_CURRENT'));
});

test('different failure signatures do not falsely trigger root cause saturation',()=>{
  const result=classifyVibePatchSaturation({
    responsibleFiles:['web-games/demo/index.html'],
    threshold:3,
    attempts:[
      {status:'FAIL',failureSignature:'a',responsibleFiles:['web-games/demo/index.html']},
      {status:'FAIL',failureSignature:'b',responsibleFiles:['web-games/demo/index.html']},
      {status:'FAIL',failureSignature:'c',responsibleFiles:['web-games/demo/index.html']}
    ]
  });
  assert.equal(result.saturated,false);
  assert.equal(result.mode,'FOCUSED_REPAIR');
  assert.equal(result.repeatCount,1);
});

test('JSON source generation uses bounded context and structured output mode',()=>{
  const source=fs.readFileSync('tools/vibe2-source-worker.mjs','utf8');
  assert.match(source,/const MAX_CONTEXT_BYTES=96000;/);
  assert.match(source,/const JSON_CONTEXT_WINDOW=16384;/);
  assert.match(source,/\^JSON_\/\.test\(completionMode\)\?\{format:'json'\}/);
  assert.match(source,/const FOCUSED_WEB_REPAIR_CONTEXT_BYTES=28000;/);
  assert.match(source,/const FULL_WEB_CONTEXT_WINDOW=32768;/);
});

test('deterministic diagnostic repair handles interval cleanup without model generation',()=>{
  const cwd=tempRoot();
  const sourceRoot=path.join(cwd,'web-games/demo');
  const source=['<!doctype html><html><body><script>','const AUDIO={timer:null};',"function start(){ if(AUDIO.timer)return; AUDIO.timer=setInterval(()=>tick(),285); }",'function tick(){}','</script></body></html>'].join('\n');
  write(path.join(sourceRoot,'rpg.html'),source);
  const exploration={editContract:{causalReplay:{required:true,executable:true,mode:'DIAGNOSTIC_RESCAN',diagnosticType:'INTERVAL_CLEANUP_RISK',diagnosticFile:'rpg.html',diagnosticLine:3,diagnosticNeedle:'setInterval(',diagnosticMicroTask:'clear interval lifecycle'}}};
  const candidate=deterministicDiagnosticCandidate({exploration,sourceRoot,responsibleFiles:['rpg.html']});
  assert.ok(candidate);
  assert.match(candidate.edits[0].replace,/pagehide/);
  assert.match(candidate.edits[0].replace,/clearInterval\(AUDIO\.timer\)/);
  assert.equal(evaluateDiagnosticPostcondition({candidate,exploration}).pass,true);
});

test('deterministic diagnostic repair makes DOM event binding null-safe',()=>{
  const cwd=tempRoot();
  const sourceRoot=path.join(cwd,'web-games/demo');
  const unsafe="document.getElementById('play').addEventListener('click',startGame);";
  write(path.join(sourceRoot,'index.html'),'<button id="play">Play</button><script>'+unsafe+'function startGame(){}</script>');
  const exploration={editContract:{causalReplay:{required:true,executable:true,mode:'DIAGNOSTIC_RESCAN',diagnosticType:'DOM_NULL_EVENT_BIND',diagnosticFile:'index.html',diagnosticLine:1,diagnosticNeedle:unsafe}}};
  const candidate=deterministicDiagnosticCandidate({exploration,sourceRoot,responsibleFiles:['index.html']});
  assert.ok(candidate);
  assert.match(candidate.edits[0].replace,/\?\.addEventListener/);
  assert.equal(evaluateDiagnosticPostcondition({candidate,exploration}).pass,true);
});

test('deterministic diagnostic repair adds touch-action to the actual interactive rule',()=>{
  const cwd=tempRoot();
  const sourceRoot=path.join(cwd,'web-games/demo');
  const source='<!doctype html><html><head><style>.scope-action,button{min-height:54px;border:0}</style></head><body><button class="scope-action">Play</button></body></html>';
  write(path.join(sourceRoot,'index.html'),source);
  const exploration={editContract:{causalReplay:{required:true,executable:true,mode:'DIAGNOSTIC_RESCAN',diagnosticType:'TOUCH_ACTION_UNSPECIFIED',diagnosticFile:'index.html',diagnosticLine:1,diagnosticNeedle:'touch-action'}}};
  const candidate=deterministicDiagnosticCandidate({exploration,sourceRoot,responsibleFiles:['index.html']});
  assert.ok(candidate);
  assert.match(candidate.edits[0].replace,/touch-action:manipulation/);
  assert.equal(evaluateDiagnosticPostcondition({candidate,exploration}).pass,true);
});

test('source worker wires deterministic diagnostic before model recovery',()=>{
  const source=fs.readFileSync('tools/vibe2-source-worker.mjs','utf8');
  const deterministicAt=source.indexOf('const deterministicDiagnostic=!allowFullRewrite?deterministicDiagnosticCandidate');
  const modelAt=source.indexOf('if(!generated)generated=await generateCandidateWithRecovery');
  assert.ok(deterministicAt>0&&modelAt>deterministicAt);
  assert.match(source,/VIBE2_DETERMINISTIC_DIAGNOSTIC_REPAIR=PASS/);
});
test('reproduced interval diagnostic is anchored before incremental QA',()=>{
  const cwd=tempRoot();
  const sourceRoot=path.join(cwd,'web-games/demo');
  const source=['<!doctype html><html><body><script>','const AUDIO={timer:null};','function start(){ AUDIO.timer=setInterval(()=>tick(),285); }','function tick(){}','</script></body></html>'].join('\n');
  write(path.join(sourceRoot,'rpg.html'),source);
  const exploration={editContract:{causalReplay:{
    required:true,executable:true,mode:'DIAGNOSTIC_RESCAN',diagnosticType:'INTERVAL_CLEANUP_RISK',diagnosticFile:'rpg.html',
    diagnosticLine:3,diagnosticNeedle:'setInterval(',diagnosticMicroTask:'반복 타이머의 실제 clearInterval 해제 경로를 추가한다.'
  }}};
  const spec=diagnosticFocusedReplaceOnlySpec({exploration,sourceRoot,responsibleFiles:['rpg.html']});
  assert.ok(spec);
  assert.equal(spec.path,'rpg.html');
  assert.match(spec.find,/setInterval/);
  const focused=buildDiagnosticFocusedReplaceOnlyPrompt('Goal: [DIAGNOSTIC_BUNDLE] interval cleanup',{exploration,sourceRoot,responsibleFiles:['rpg.html']});
  assert.ok(focused);
  assert.match(focused.prompt,/clearInterval/);
  assert.doesNotMatch(focused.prompt,/COMPLETE_REPLACEMENT_SOURCE_SNIPPET/);
  assert.match(focused.prompt,/exactly one key named "replace"/);
  assert.equal(evaluateDiagnosticPostcondition({candidate:{edits:[{path:'rpg.html',find:spec.find,replace:'function start(){ AUDIO.timer=setInterval(()=>tick(),285); }'}]},exploration}).pass,false);
  const repaired='function stop(){ if(AUDIO.timer){ clearInterval(AUDIO.timer); AUDIO.timer=null; } }\nfunction start(){ stop(); AUDIO.timer=setInterval(()=>tick(),285); }';
  assert.equal(evaluateDiagnosticPostcondition({candidate:{edits:[{path:'rpg.html',find:spec.find,replace:repaired}]},exploration}).pass,true);
});

test('reproduced touch-action diagnostic is anchored to interactive CSS before incremental QA',()=>{
  const cwd=tempRoot();
  const sourceRoot=path.join(cwd,'web-games/demo');
  const source='<!doctype html><html><head><style>.game{min-height:100vh}.scope-action,button{min-height:54px;border:0}</style></head><body><button class="scope-action">Play</button></body></html>';
  write(path.join(sourceRoot,'index.html'),source);
  const exploration={editContract:{causalReplay:{
    required:true,executable:true,mode:'DIAGNOSTIC_RESCAN',diagnosticType:'TOUCH_ACTION_UNSPECIFIED',diagnosticFile:'index.html',
    diagnosticLine:1,diagnosticNeedle:'touch-action',diagnosticMicroTask:'실제 조작 영역에 모바일 스크롤 충돌을 막는 touch-action 정책을 추가한다.'
  }}};
  const spec=diagnosticFocusedReplaceOnlySpec({exploration,sourceRoot,responsibleFiles:['index.html']});
  assert.ok(spec);
  assert.equal(spec.path,'index.html');
  assert.match(spec.find,/scope-action|button/);
  const focused=buildDiagnosticFocusedReplaceOnlyPrompt('Goal: [WEB_REPAIR] mobile input',{exploration,sourceRoot,responsibleFiles:['index.html']});
  assert.ok(focused);
  assert.match(focused.prompt,/touch-action:/);
  assert.equal(evaluateDiagnosticPostcondition({candidate:{edits:[{path:'index.html',find:spec.find,replace:'.scope-action,button{min-height:54px;border:0}'}]},exploration}).pass,false);
  assert.equal(evaluateDiagnosticPostcondition({candidate:{edits:[{path:'index.html',find:spec.find,replace:'.scope-action,button{min-height:54px;border:0;touch-action:manipulation}'}]},exploration}).pass,true);
});

test('reproduced DOM null event bind must repair the exact unsafe chain before incremental QA',()=>{
  const cwd=tempRoot();
  const sourceRoot=path.join(cwd,'web-games/demo');
  const unsafe="document.getElementById('play').addEventListener('click',startGame);";
  write(path.join(sourceRoot,'index.html'),'<button id="play">Play</button><script>'+unsafe+'function startGame(){}</script>');
  const exploration={editContract:{causalReplay:{
    required:true,executable:true,mode:'DIAGNOSTIC_RESCAN',diagnosticType:'DOM_NULL_EVENT_BIND',diagnosticFile:'index.html',
    diagnosticLine:1,diagnosticNeedle:unsafe,diagnosticMicroTask:'DOM 이벤트 연결 1곳에 존재 확인을 추가한다.'
  }}};
  const spec=diagnosticFocusedReplaceOnlySpec({exploration,sourceRoot,responsibleFiles:['index.html']});
  assert.ok(spec);
  assert.match(spec.find,/getElementById/);
  const focused=buildDiagnosticFocusedReplaceOnlyPrompt('Goal: [WEB_REPAIR] repair event binding',{exploration,sourceRoot,responsibleFiles:['index.html']});
  assert.match(focused.prompt,/null-safe guard|optional chaining/);
  const unrelated={edits:[{path:'index.html',find:'<button id="play">Play</button>',replace:'<button id="play">Start</button>'}]};
  assert.equal(evaluateDiagnosticPostcondition({candidate:unrelated,exploration}).pass,false);
  const stillUnsafe={edits:[{path:'index.html',find:spec.find,replace:"document.getElementById('play').addEventListener('click',startGame);"}]};
  assert.equal(evaluateDiagnosticPostcondition({candidate:stillUnsafe,exploration}).pass,false);
  const repaired={edits:[{path:'index.html',find:spec.find,replace:"document.getElementById('play')?.addEventListener('click',startGame);"}]};
  const result=evaluateDiagnosticPostcondition({candidate:repaired,exploration});
  assert.equal(result.pass,true);
  assert.equal(result.reason,null);
});

test('missing diagnostic postcondition is a retryable generation failure',()=>{
  const error=new Error('DIAGNOSTIC_POSTCONDITION_MISSING:INTERVAL_CLEANUP_RISK:rpg.html:CLEAR_INTERVAL_LIFECYCLE_MISSING');
  assert.equal(generationFailureClass(error),'DIAGNOSTIC_POSTCONDITION');
  assert.equal(shouldRetryGenerationError(error),true);
  const source=fs.readFileSync('tools/vibe2-source-worker.mjs','utf8');
  assert.match(source,/const diagnosticFocusedReplaceOnly=!allowFullRewrite/);
  assert.match(source,/diagnosticFocusedReplaceOnly\|\|\(focusedFinal/);
});

test('speculative interval diagnostic uses deterministic repair before model retry', async()=>{
  const cwd=tempRoot();
  const bad1=path.join(cwd,'diagnostic-bad-1.json');
  const bad2=path.join(cwd,'diagnostic-bad-2.json');
  const good=path.join(cwd,'diagnostic-good.json');
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/rpg.html'],taskId:'diagnostic-credit'});
  workOrder.goal='[DIAGNOSTIC_BUNDLE] repair interval cleanup';
  workOrder.candidateStrategyRole={variant:'speculative-1',strategy:'DIAGNOSTIC_CAUSAL_REPAIR'};
  workOrder.selectedTask={
    id:'diagnostic-credit',gameId:'demo',target:'web',department:'development',type:'implementation',
    blocker:'runtime-failure',lastOutcome:'FAIL',
    evidence:['diagnostic:INTERVAL_CLEANUP_RISK','diagnostic-key:INTERVAL_CLEANUP_RISK:rpg.html']
  };
  write(path.join(cwd,'web-games/demo/rpg.html'),['<!doctype html><html><body><script>','const AUDIO={timer:null};','function start(){ AUDIO.timer=setInterval(()=>tick(),285); }','function tick(){}','</script></body></html>'].join('\\n'));
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(bad1,JSON.stringify({replace:'function start(){ AUDIO.timer=setInterval(()=>tick(),300); }'}));
  write(bad2,JSON.stringify({replace:'function start(){ AUDIO.timer=setInterval(()=>tick(),320); }'}));
  write(good,JSON.stringify({replace:'function stop(){ if(AUDIO.timer){ clearInterval(AUDIO.timer); AUDIO.timer=null; } }\\nfunction start(){ stop(); AUDIO.timer=setInterval(()=>tick(),285); }'}));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[bad1,bad2,good]});
  assert.equal(result.generation.attempts,1);
  assert.equal(result.generation.attemptBudget,2);
  assert.equal(result.generation.deterministicDiagnosticRepair,true);
  assert.equal(result.generation.deterministicDiagnosticType,'INTERVAL_CLEANUP_RISK');
  assert.equal(result.codingMethod.semanticDiffEnforcement.diagnosticPostcondition.pass,true);
  assert.match(fs.readFileSync(path.join(cwd,'.vibe2/candidates/diagnostic-credit/files/rpg.html'),'utf8'),/clearInterval/);
});

test('speculative DOM null diagnostic uses deterministic repair before model retry', async()=>{
  const cwd=tempRoot();
  const bad1=path.join(cwd,'dom-null-bad-1.json');
  const bad2=path.join(cwd,'dom-null-bad-2.json');
  const good=path.join(cwd,'dom-null-good.json');
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'dom-null-diagnostic-credit'});
  workOrder.goal='[DIAGNOSTIC_BUNDLE] repair DOM null event bind';
  workOrder.candidateStrategyRole={variant:'speculative-1',strategy:'DIAGNOSTIC_CAUSAL_REPAIR'};
  workOrder.selectedTask={
    id:'dom-null-diagnostic-credit',gameId:'demo',target:'web',department:'development',type:'implementation',
    blocker:'runtime-failure',lastOutcome:'FAIL',
    evidence:['diagnostic:DOM_NULL_EVENT_BIND','diagnostic-key:DOM_NULL_EVENT_BIND:index.html']
  };
  const unsafe="document.getElementById('play').addEventListener('click',startGame);";
  write(path.join(cwd,'web-games/demo/index.html'),'<button id="play">Play</button><script>'+unsafe+'function startGame(){}</script>');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(bad1,JSON.stringify({replace:unsafe}));
  write(bad2,JSON.stringify({replace:"document.getElementById('play').addEventListener('click',()=>startGame());"}));
  write(good,JSON.stringify({replace:"document.getElementById('play')?.addEventListener('click',startGame);"}));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[bad1,bad2,good]});
  assert.equal(result.generation.attempts,1);
  assert.equal(result.generation.attemptBudget,2);
  assert.equal(result.generation.deterministicDiagnosticRepair,true);
  assert.equal(result.generation.deterministicDiagnosticType,'DOM_NULL_EVENT_BIND');
  assert.equal(result.codingMethod.semanticDiffEnforcement.diagnosticPostcondition.pass,true);
  assert.match(fs.readFileSync(path.join(cwd,'.vibe2/candidates/dom-null-diagnostic-credit/files/index.html'),'utf8'),/\?\.addEventListener/);
});

test('speculative candidates use a shorter retry budget without lowering primary gates',()=>{
  assert.equal(generationAttemptBudget({allowFullRewrite:false,variant:'primary'}),4);
  assert.equal(generationAttemptBudget({allowFullRewrite:true,variant:'primary'}),4);
  assert.equal(generationAttemptBudget({allowFullRewrite:false,variant:'speculative-1'}),2);
  assert.equal(generationAttemptBudget({allowFullRewrite:true,variant:'speculative-1'}),3);
  assert.equal(generationAttemptBudget({allowFullRewrite:true,variant:'speculative-4'}),3);
});

test('studio quality retries keep package breadth instead of collapsing to one micro edit',()=>{
  const prompt=[
    'You are the Vibe2 game source worker. Return JSON only.',
    'Goal: [STUDIO_QUALITY_EVOLUTION] cycle=2; phase=BUILD_UP; focus=PRESENTATION',
    'Allowed edit paths: Game.cs, Visual.cs',
    '=== FILE Game.cs [EDITABLE] ===',
    'void Tick() {}',
    '=== FILE Visual.cs [EDITABLE] ===',
    'void Render() {}'
  ].join('\n');
  const retry=buildGenerationRetryPrompt(prompt,{error:new Error('malformed candidate'),responsibleFiles:['Game.cs','Visual.cs'],attempt:4});
  assert.doesNotMatch(retry,/FINAL FOCUSED RETRY/);
  assert.doesNotMatch(retry,/exactly one edit/i);
});


test('Unity text source produces isolated candidate without touching source', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.json');
  write(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'class Player { int Speed() { return 1 + 1; } }\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({ responsibleFiles: ['unity-games/demo/Assets/Player.cs'] }), null, 2));
  write(responseFile, JSON.stringify({ edits: [{ path: 'Assets/Player.cs', find: 'return 1 + 1;', replace: 'return 2;' }], newFiles: [] }));
  const result = await runVibe2SourceWorker({ cwd, responseFile });
  assert.equal(result.mode, 'candidate-snapshot-only');
  assert.equal(result.candidateManifestPath, '.vibe2/candidates/task-1/manifest.json');
  assert.deepEqual(result.changedFiles, ['Assets/Player.cs']);
  assert.equal(result.exploration.sourceWrite,false);
  assert.ok(result.exploration.reuseKey.length>=16);
  assert.equal(result.roleResults.exploration,'PASS');
  assert.equal(result.codingMethod.version,2);
  assert.equal(result.codingMethod.generationAttempts,1);
  assert.equal(result.codingMethod.generationAttemptBudget,4);
  assert.equal(result.codingMethod.speculativeAttemptBudgetApplied,false);
  assert.equal(result.codingMethod.candidateProducedFirstAttempt,true);
  assert.equal(result.codingMethod.writableScopeExpansionAllowed,false);
  assert.equal(result.codingMethod.learningAuthorityExpanded,false);
  assert.equal(result.developmentAuthority.owner,'VIBE2_VIBE3');
  assert.equal(result.developmentAuthority.provider,'LOCAL_OLLAMA');
  assert.equal(result.developmentAuthority.codexGameSourceWrite,'FORBIDDEN');
  assert.equal(result.developmentAuthority.paidOpenAiApiAllowed,false);
  assert.match(fs.readFileSync(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'utf8'), /1 \+ 1/);
  assert.match(fs.readFileSync(path.join(cwd, '.vibe2/candidates/task-1/files/Assets/Player.cs'), 'utf8'), /return 2/);
});


test('missing edit path is recovered from the unique responsible source match without another model call', async () => {
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'missing-path.json');
  const root='roblox-games/demo';
  const client='client/Game.client.luau';
  const config='shared/GameConfig.luau';
  const workOrder=order({
    target:'roblox',
    root,
    responsibleFiles:[`${root}/${client}`,`${root}/${config}`],
    taskId:'missing-edit-path-recovery'
  });
  write(path.join(cwd,root,client),'local visualState = 1\nreturn visualState\n');
  write(path.join(cwd,root,config),'local configState = 1\nreturn configState\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(responseFile,JSON.stringify({
    edits:[{path:'',find:'local visualState = 1',replace:'local visualState = 2'}],
    newFiles:[]
  }));
  const result=await runVibe2SourceWorker({cwd,responseFile});
  assert.equal(result.generation.attempts,1);
  assert.equal(result.generation.missingPathRecoveries,1);
  assert.equal(result.codingMethod.missingPathRecoveries,1);
  assert.deepEqual(result.changedFiles,[client]);
  assert.match(fs.readFileSync(path.join(cwd,'.vibe2/candidates',workOrder.taskId,'files',client),'utf8'),/visualState = 2/);
  assert.match(fs.readFileSync(path.join(cwd,root,client),'utf8'),/visualState = 1/);
});

test('system architecture worker filters control metadata from source context without widening writes', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.json');
  const responsibleFile = 'tools/demo-system.mjs';
  const selectedTask = {
    id: 'SYS-ARCH-context-boundary-v1',
    gameId: '__vibe_system__',
    target: 'system',
    department: 'system-architecture',
    type: 'implementation',
    executionLane: 'RECOVERY_FAST',
    sourceRoot: '.',
    responsibleFiles: [responsibleFile],
    priority: 'high',
    releaseState: 'other',
    status: 'running',
    retryPolicy: 'UNLIMITED_CAUSAL_REPAIR',
    maxRetries: null,
    systemSteward: true,
    goal: 'repair repeated system work-order context path failure',
    evidence: [
      'vibe-self-architecture-evolution',
      'architecture-authority-expansion:NO',
      'architecture-gate-weakening:NO',
      'architecture-system-construction-allowed',
      'architecture-neural-expansion-phase:LAST_STAGE_ONLY',
      'architecture-neural-expansion-mode:EVIDENCE_GATED_SELF_EXPANSION',
      'architecture-neural-expansion-readiness:PENDING',
      'architecture-neural-expansion-allowed:NO'
    ],
    completionCriteria: [
      'STRUCTURAL_CAUSE_VERIFIED',
      'RELATED_REGRESSION_PASS',
      'SECURITY_PASS',
      'BEFORE_AFTER_METRIC_IMPROVED',
      'AUTHORITY_UNCHANGED',
      'GATES_UNCHANGED',
      'NEURAL_EXECUTION_AUTHORITY_UNCHANGED'
    ]
  };
  const workOrder = {
    ...order({ target: 'system', root: '.', responsibleFiles: [responsibleFile], taskId: selectedTask.id }),
    gameId: '__vibe_system__',
    department: 'system-architecture',
    goal: '[VIBE_SELF_ARCHITECTURE_EVOLUTION] inspect work-order context and repair structural routing',
    selectedTask,
    workerPolicy: {
      directMainWrite: false,
      systemArchitectureEvolution: true,
      authorityExpansionAllowed: false,
      gateWeakeningAllowed: false,
      neuralExpansionPhase: 'LAST_STAGE_ONLY',
      neuralExpansionAllowed: false,
      neuralExecutionAuthorityExpansionAllowed: false
    }
  };
  write(path.join(cwd, responsibleFile), 'export const systemValue = 1;\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(responseFile, JSON.stringify({
    edits: [{ path: responsibleFile, find: 'systemValue = 1', replace: 'systemValue = 2' }],
    newFiles: []
  }));
  const result = await runVibe2SourceWorker({ cwd, responseFile });
  assert.deepEqual(result.changedFiles, [responsibleFile]);
  assert.equal(result.developmentAuthority.authorityExpanded, false);
  assert.equal(result.developmentAuthority.gateWeakening, false);
  assert.equal(result.developmentAuthority.neuralExpansionAllowed, false);
  assert.match(fs.readFileSync(path.join(cwd, responsibleFile), 'utf8'), /systemValue = 1/);
  assert.match(fs.readFileSync(path.join(cwd, '.vibe2/candidates/SYS-ARCH-context-boundary-v1/files', responsibleFile), 'utf8'), /systemValue = 2/);
});

test('system architecture completes the missing causal test with pair-focused recovery', async () => {
  const cwd=tempRoot();
  const sourceOnly=path.join(cwd,'source-only.json');
  const testCompletion=path.join(cwd,'test-completion.json');
  const sourceFile='tools/demo-system.mjs';
  const testFile='qa/demo-system.test.mjs';
  const selectedTask={
    id:'SYS-ARCH-causal-pair-v1',gameId:'__vibe_system__',target:'system',department:'system-architecture',type:'implementation',
    executionLane:'RECOVERY_FAST',sourceRoot:'.',responsibleFiles:[sourceFile,testFile],priority:'high',releaseState:'other',status:'running',
    retryPolicy:'UNLIMITED_CAUSAL_REPAIR',maxRetries:null,systemSteward:true,goal:'repair structural bottleneck with direct causal proof',
    evidence:['vibe-self-architecture-evolution','architecture-authority-expansion:NO','architecture-gate-weakening:NO','architecture-system-construction-allowed','architecture-neural-expansion-phase:LAST_STAGE_ONLY','architecture-neural-expansion-mode:EVIDENCE_GATED_SELF_EXPANSION','architecture-neural-expansion-readiness:PENDING','architecture-neural-expansion-allowed:NO'],
    completionCriteria:['STRUCTURAL_CAUSE_VERIFIED','RELATED_REGRESSION_PASS','SECURITY_PASS','BEFORE_AFTER_METRIC_IMPROVED','AUTHORITY_UNCHANGED','GATES_UNCHANGED','NEURAL_EXECUTION_AUTHORITY_UNCHANGED']
  };
  const workOrder={
    ...order({target:'system',root:'.',responsibleFiles:[sourceFile,testFile],taskId:selectedTask.id}),
    gameId:'__vibe_system__',department:'system-architecture',goal:'[VIBE_SELF_ARCHITECTURE_EVOLUTION] repair with same-failure regression proof',
    selectedTask,candidateStrategyRole:{variant:'speculative-1',strategy:'CAUSAL_PAIR_REPAIR'},
    workerPolicy:{directMainWrite:false,systemArchitectureEvolution:true,authorityExpansionAllowed:false,gateWeakeningAllowed:false,neuralExpansionPhase:'LAST_STAGE_ONLY',neuralExpansionAllowed:false,neuralExecutionAuthorityExpansionAllowed:false}
  };
  write(path.join(cwd,sourceFile),'export const systemValue = 1;\n');
  write(path.join(cwd,testFile),"import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport {systemValue} from '../tools/demo-system.mjs';\ntest('system value',()=>assert.equal(systemValue,1));\n");
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(sourceOnly,JSON.stringify({edits:[{path:sourceFile,find:'systemValue = 1',replace:'systemValue = 2'}]}));
  write(testCompletion,JSON.stringify({replace:"test('system value',()=>assert.equal(systemValue,2));"}));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[sourceOnly,testCompletion]});
  assert.equal(result.generation.attempts,2);
  assert.equal(result.generation.baseAttemptBudget,2);
  assert.equal(result.generation.effectiveAttemptBudget,2);
  assert.equal(result.generation.systemAtomicPairCompletion,true);
  assert.deepEqual(result.changedFiles.sort(),[sourceFile,testFile].sort());
  assert.match(fs.readFileSync(path.join(cwd,'.vibe2/candidates',selectedTask.id,'files',sourceFile),'utf8'),/systemValue = 2/);
  assert.match(fs.readFileSync(path.join(cwd,'.vibe2/candidates',selectedTask.id,'files',testFile),'utf8'),/systemValue,2/);
});

test('system architecture still gets one bounded retry when pair-focused completion is unavailable after edit mismatch', async () => {
  const cwd=tempRoot();
  const bad1=path.join(cwd,'bad1.json');
  const bad2=path.join(cwd,'bad2.json');
  const paired=path.join(cwd,'paired.json');
  const sourceFile='tools/demo-system.mjs';
  const testFile='qa/demo-system.test.mjs';
  const selectedTask={
    id:'SYS-ARCH-edit-match-credit-v1',gameId:'__vibe_system__',target:'system',department:'system-architecture',type:'implementation',
    executionLane:'RECOVERY_FAST',sourceRoot:'.',responsibleFiles:[sourceFile,testFile],priority:'high',releaseState:'other',status:'running',
    retryPolicy:'UNLIMITED_CAUSAL_REPAIR',maxRetries:null,systemSteward:true,goal:'repair structural bottleneck with direct causal proof',
    evidence:['vibe-self-architecture-evolution','architecture-authority-expansion:NO','architecture-gate-weakening:NO','architecture-system-construction-allowed','architecture-neural-expansion-phase:LAST_STAGE_ONLY','architecture-neural-expansion-mode:EVIDENCE_GATED_SELF_EXPANSION','architecture-neural-expansion-readiness:PENDING','architecture-neural-expansion-allowed:NO'],
    completionCriteria:['STRUCTURAL_CAUSE_VERIFIED','RELATED_REGRESSION_PASS','SECURITY_PASS','BEFORE_AFTER_METRIC_IMPROVED','AUTHORITY_UNCHANGED','GATES_UNCHANGED','NEURAL_EXECUTION_AUTHORITY_UNCHANGED']
  };
  const workOrder={
    ...order({target:'system',root:'.',responsibleFiles:[sourceFile,testFile],taskId:selectedTask.id}),
    gameId:'__vibe_system__',department:'system-architecture',goal:'[VIBE_SELF_ARCHITECTURE_EVOLUTION] repair edit-match failure with same-failure regression proof',
    selectedTask,candidateStrategyRole:{variant:'speculative-1',strategy:'CAUSAL_PAIR_REPAIR'},
    workerPolicy:{directMainWrite:false,systemArchitectureEvolution:true,authorityExpansionAllowed:false,gateWeakeningAllowed:false,neuralExpansionPhase:'LAST_STAGE_ONLY',neuralExpansionAllowed:false,neuralExecutionAuthorityExpansionAllowed:false}
  };
  write(path.join(cwd,sourceFile),'export const systemValue = 1;\n');
  write(path.join(cwd,testFile),"import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport {systemValue} from '../tools/demo-system.mjs';\ntest('system value',()=>assert.equal(systemValue,1));\n");
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  const badCandidate={edits:[{path:sourceFile,find:'systemValue = 9',replace:'systemValue = 2'},{path:testFile,find:'assert.equal(systemValue,9)',replace:'assert.equal(systemValue,2)'}]};
  write(bad1,JSON.stringify(badCandidate));
  write(bad2,JSON.stringify(badCandidate));
  write(paired,JSON.stringify({edits:[{path:sourceFile,find:'systemValue = 1',replace:'systemValue = 2'},{path:testFile,find:'assert.equal(systemValue,1)',replace:'assert.equal(systemValue,2)'}]}));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[bad1,bad2,paired]});
  assert.equal(result.generation.attempts,3);
  assert.equal(result.generation.baseAttemptBudget,2);
  assert.equal(result.generation.effectiveAttemptBudget,3);
  assert.deepEqual(result.changedFiles.sort(),[sourceFile,testFile].sort());
});



test('Roblox Studio backfill rejects config-only candidate and retries until visual owner is actually bound', async()=>{
  const cwd=tempRoot();
  const bad=path.join(cwd,'roblox-studio-config-only.json');
  const good=path.join(cwd,'roblox-studio-visual-owner.json');
  const workOrder=order({
    target:'roblox',
    root:'roblox-games/demo',
    responsibleFiles:['roblox-games/demo/shared/GameConfig.luau','roblox-games/demo/client/Game.client.luau'],
    taskId:'demo-roblox-studio-asset-backfill-v1'
  });
  workOrder.selectedTask={
    id:workOrder.taskId,
    gameId:'demo',
    target:'roblox',
    studioAssetBackfill:true,
    responsibleFiles:workOrder.source.responsibleFiles
  };
  workOrder.goal='[ROBLOX_STUDIO_ASSET_BACKFILL] apply selected materials to the real visual owner';
  write(path.join(cwd,'roblox-games/demo/shared/GameConfig.luau'),'return { GameId = "demo" }\n');
  const clientSource=[
    'local Players = game:GetService("Players")',
    'local player = Players.LocalPlayer',
    'local gui = Instance.new("ScreenGui")',
    'local root = Instance.new("Frame")',
    'root.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    'root.Parent = gui'
  ].join('\n')+'\n';
  write(path.join(cwd,'roblox-games/demo/client/Game.client.luau'),clientSource);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(bad,JSON.stringify({
    edits:[{path:'shared/GameConfig.luau',find:'return { GameId = "demo" }',replace:'return { GameId = "demo", StudioAssets = true }'}]
  }));
  const bound=[
    'local Players = game:GetService("Players")',
    'local player = Players.LocalPlayer',
    'local STUDIO_ASSET_BINDING_VERSION = 1',
    'local STUDIO_ASSET_SELECTION = {"FRAME_PANEL","BUTTON_PRIMARY","BAR_HEALTH"}',
    'local gui = Instance.new("ScreenGui")',
    'local root = Instance.new("Frame")',
    'root.BackgroundColor3 = Color3.fromRGB(22,34,58)',
    'root:SetAttribute("StudioAssetBindingVersion", STUDIO_ASSET_BINDING_VERSION)',
    'root:SetAttribute("StudioAssetAtoms", table.concat(STUDIO_ASSET_SELECTION, ","))',
    'root.Parent = gui'
  ].join('\n');
  write(good,JSON.stringify({
    edits:[{path:'client/Game.client.luau',find:clientSource.trimEnd(),replace:bound}]
  }));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[bad,good]});
  assert.equal(result.generation.attempts,2);
  assert.equal(result.generation.recoveryUsed,true);
  assert.deepEqual(result.changedFiles,['client/Game.client.luau']);
  const candidate=fs.readFileSync(path.join(cwd,'.vibe2/candidates',workOrder.taskId,'files/client/Game.client.luau'),'utf8');
  assert.match(candidate,/STUDIO_ASSET_BINDING_VERSION\s*=\s*1/);
  assert.match(candidate,/STUDIO_ASSET_SELECTION\s*=\s*\{/);
  assert.match(candidate,/StudioAssetAtoms/);
});

test('unappliable edit is retried inside generation before candidate write', async () => {
  const cwd = tempRoot();
  const bad = path.join(cwd, 'bad-edit.json');
  const good = path.join(cwd, 'good-edit.json');
  write(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'class Player { int Speed() { return 1; } }\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({ responsibleFiles: ['unity-games/demo/Assets/Player.cs'], taskId: 'edit-preflight-retry' }), null, 2));
  write(bad, JSON.stringify({ edits: [{ path: 'Assets/Player.cs', find: 'return 9;', replace: 'return 2;' }], newFiles: [] }));
  write(good, JSON.stringify({ replace: 'class Player { int Speed() { return 2; } }' }));
  const result = await runVibe2SourceWorker({ cwd, responseFiles: [bad, good] });
  assert.equal(result.generation.attempts, 2);
  assert.equal(result.generation.recoveryUsed, true);
  assert.deepEqual(result.changedFiles, ['Assets/Player.cs']);
  assert.match(fs.readFileSync(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'utf8'), /return 1/);
  assert.match(fs.readFileSync(path.join(cwd, '.vibe2/candidates/edit-preflight-retry/files/Assets/Player.cs'), 'utf8'), /return 2/);
});

test('speculative focused repair gets one bounded retry after focused no-op at the base budget edge', async () => {
  const cwd=tempRoot();
  const badEdit=path.join(cwd,'spec-bad-edit.json');
  const focusedNoOp=path.join(cwd,'spec-focused-noop.json');
  const focused=path.join(cwd,'spec-focused.json');
  const workOrder=order({responsibleFiles:['unity-games/demo/Assets/Player.cs'],taskId:'spec-focused-credit'});
  workOrder.candidateStrategyRole={variant:'speculative-1',strategy:'BOUNDED_REPAIR'};
  write(path.join(cwd,'unity-games/demo/Assets/Player.cs'),'class Player { int Speed() { return 1; } }\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(badEdit,JSON.stringify({edits:[{path:'Assets/Player.cs',find:'return 9;',replace:'return 2;'}],newFiles:[]}));
  write(focusedNoOp,JSON.stringify({replace:'class Player { int Speed() { return 1; } }'}));
  write(focused,JSON.stringify({replace:'class Player { int Speed() { return 2; } }'}));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[badEdit,focusedNoOp,focused]});
  assert.equal(result.generation.attempts,3);
  assert.equal(result.generation.baseAttemptBudget,2);
  assert.equal(result.generation.effectiveAttemptBudget,3);
  assert.equal(result.generation.focusedReplaceOnly,true);
  assert.deepEqual(result.changedFiles,['Assets/Player.cs']);
  assert.match(fs.readFileSync(path.join(cwd,'.vibe2/candidates/spec-focused-credit/files/Assets/Player.cs'),'utf8'),/return 2/);
});

test('focused replace recovery budget is not smaller than final retry budget',()=>{
  const source=fs.readFileSync('tools/vibe2-source-worker.mjs','utf8');
  const finalPredict=Number(source.match(/const JSON_FINAL_RETRY_MAX_PREDICT=(\d+);/)?.[1]||0);
  const focusedPredict=Number(source.match(/const JSON_FOCUSED_REPLACE_MAX_PREDICT=(\d+);/)?.[1]||0);
  const finalTimeout=Number(source.match(/const JSON_FINAL_RETRY_TIMEOUT_MS=(\d+);/)?.[1]||0);
  const focusedTimeout=Number(source.match(/const JSON_FOCUSED_REPLACE_TIMEOUT_MS=(\d+);/)?.[1]||0);
  assert.ok(finalPredict>0&&focusedPredict>=finalPredict);
  assert.ok(finalTimeout>0&&focusedTimeout>=finalTimeout);
});

test('focused Web repair malformed output fast-escalates to focused replace on the next attempt', async () => {
  const cwd = tempRoot();
  const malformed = path.join(cwd, 'malformed.txt');
  const focused = path.join(cwd, 'focused.json');
  const workOrder = order({
    target: 'web',
    root: 'web-games/demo',
    responsibleFiles: ['web-games/demo/index.html'],
    taskId: 'malformed-fast-escalation'
  });
  workOrder.goal = '[WEB_REPAIR] 기존 플레이 버튼 동작을 직접 보강';
  write(path.join(cwd, 'web-games/demo/index.html'), '<!doctype html><html><body>\n<button id="play">Play</button>\n<script>let started=false;</script>\n</body></html>\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(malformed, 'not-json');
  write(focused, JSON.stringify({ replace: '<button id="play">Continue</button>' }));
  const result = await runVibe2SourceWorker({ cwd, responseFiles: [malformed, focused] });
  assert.equal(result.generation.attempts, 2);
  assert.equal(result.generation.recoveryUsed, true);
  assert.equal(result.generation.focusedWebRepair, true);
  assert.equal(result.generation.focusedReplaceOnly, true);
  assert.equal(result.generation.malformedFastEscalation, true);
  assert.equal(result.codingMethod.malformedFastEscalation, true);
  assert.deepEqual(result.changedFiles, ['index.html']);
  assert.match(fs.readFileSync(path.join(cwd, '.vibe2/candidates/malformed-fast-escalation/files/index.html'), 'utf8'), /Continue/);
});

test('exact edit dry run validates sequential applicability without mutating source', () => {
  const cwd = tempRoot();
  const source = path.join(cwd, 'Player.cs');
  write(source, 'class Player {\n  int Speed() {\n    return 1;\n  }\n}\n');
  const changed = applyExactEdits(cwd, [
    { path: 'Player.cs', find: 'int Speed() {\n  return 1;\n}', replace: 'int Speed() {\n    return 2;\n}' },
    { path: 'Player.cs', find: 'return 2;', replace: 'return 3;' }
  ], { dryRun: true });
  assert.deepEqual(changed, ['Player.cs']);
  assert.match(fs.readFileSync(source, 'utf8'), /return 1;/);
  assert.doesNotMatch(fs.readFileSync(source, 'utf8'), /return 3;/);
});

test('exact edit preserves the original EOF shape instead of introducing a git diff blank-line failure',()=>{
  const cwd=tempRoot();
  const withEol=path.join(cwd,'GameConfig.luau');
  write(withEol,'return {\n  Value = 1\n}\n');
  applyExactEdits(cwd,[{
    path:'GameConfig.luau',
    find:'return {\n  Value = 1\n}\n',
    replace:'return {\n  Value = 2\n}\n\n'
  }]);
  assert.equal(fs.readFileSync(withEol,'utf8'),'return {\n  Value = 2\n}\n');

  const withoutEol=path.join(cwd,'NoEol.luau');
  write(withoutEol,'return { Value = 1 }');
  applyExactEdits(cwd,[{
    path:'NoEol.luau',
    find:'return { Value = 1 }',
    replace:'return { Value = 2 }\n'
  }]);
  assert.equal(fs.readFileSync(withoutEol,'utf8'),'return { Value = 2 }');
});

test('candidate manifest persists design intelligence requirements and starts evidence unverified', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.json');
  const workOrder = order({ responsibleFiles: ['unity-games/demo/Assets/Player.cs'], taskId: 'design-contract' });
  workOrder.unifiedLearning = {
    failureFingerprint:'unity|EDIT_MATCH|DEBUGGING',
    failureLocalMemory:[{id:'verified-edit-match',verified:true,reusable:true,failureCause:'edit match not found',reusablePatterns:['trace exact responsible symbol before edit'],avoidPatterns:['do not widen writable scope']}]
  };
  workOrder.designIntelligence = {
    version: 1,
    required: true,
    pipeline: ['DESIGNER', 'CONSTRAINT_ENGINE', 'IMPLEMENTATION', 'AUTO_PLAYER', 'TELEMETRY', 'DESIGN_REVIEW', 'EXPERIENCE_MEMORY'],
    implementationGate: { allowed: true, blockers: [] },
    authorityExpanded: false
  };
  write(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'class Player { int Speed() { return 1; } }\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(responseFile, JSON.stringify({ edits: [{ path: 'Assets/Player.cs', find: 'return 1;', replace: 'return 2;' }], newFiles: [] }));
  const result = await runVibe2SourceWorker({ cwd, responseFile });
  const persisted = JSON.parse(fs.readFileSync(path.join(cwd, '.vibe2/candidates/design-contract/manifest.json'), 'utf8'));
  assert.equal(result.version, 6);
  assert.equal(result.designIntelligence.required, true);
  assert.equal(result.designIntelligence.implementationGate.allowed, true);
  assert.equal(result.designIntelligence.authorityExpanded, false);
  assert.equal(result.designIntelligence.evidenceRequirements.autoPlayer, 'verified-runtime-play-evidence-required');
  assert.deepEqual(result.designIntelligence.pipeline, workOrder.designIntelligence.pipeline);
  assert.equal(persisted.exploration.sourceWrite,false);
  assert.equal(persisted.codingMethod.version,2);
  assert.equal(persisted.codingMethod.strategy,result.exploration.editContract.strategyHint);
  assert.equal(persisted.codingMethod.semanticDiffBudget.unrelatedSystemMutationForbidden,true);
  assert.equal(persisted.codingMethod.failureFingerprint,'unity|EDIT_MATCH|DEBUGGING');
  assert.equal(persisted.codingMethod.patchRecipeMode,'VERIFIED_FAILURE_LOCAL_RECIPE');
  assert.equal(persisted.codingMethod.verifiedFailureLocalMemoryCount,1);
  assert.deepEqual(persisted.codingMethod.verifiedFailureLocalMemoryIds,['verified-edit-match']);
  assert.equal(persisted.roleResults.implementation,'PASS');
  for (const key of ['autoPlayer', 'telemetry', 'designReview', 'qa']) {
    assert.equal(result.designEvidence[key].verified, false);
    assert.equal(result.designEvidence[key].status, 'WAITING_EVIDENCE');
    assert.equal(persisted.designEvidence[key].verified, false);
  }
});

test('Codex game source write override is rejected before generation', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.json');
  const previous = process.env.VIBE2_CODEX_GAME_SOURCE_WRITE;
  write(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'class Player { int Speed() { return 1; } }\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({ responsibleFiles: ['unity-games/demo/Assets/Player.cs'], taskId: 'codex-authority-reject' }), null, 2));
  write(responseFile, JSON.stringify({ edits: [{ path: 'Assets/Player.cs', find: 'return 1;', replace: 'return 2;' }], newFiles: [] }));
  process.env.VIBE2_CODEX_GAME_SOURCE_WRITE = 'ALLOWED';
  try {
    await assert.rejects(runVibe2SourceWorker({ cwd, responseFile }), /CODEX_GAME_SOURCE_WRITE_FORBIDDEN/);
  } finally {
    if (previous === undefined) delete process.env.VIBE2_CODEX_GAME_SOURCE_WRITE;
    else process.env.VIBE2_CODEX_GAME_SOURCE_WRITE = previous;
  }
});

test('single responsible file safely remaps model placeholder path', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.json');
  write(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'class Player { int Speed() { return 1; } }\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({ responsibleFiles: ['unity-games/demo/Assets/Player.cs'] }), null, 2));
  write(responseFile, JSON.stringify({ edits: [{ path: 'relative/to/source/root', find: 'return 1;', replace: 'return 2;' }], newFiles: [] }));
  const result = await runVibe2SourceWorker({ cwd, responseFile });
  assert.deepEqual(result.changedFiles, ['Assets/Player.cs']);
});

test('responsible file boundary rejects unrelated model path', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.json');
  write(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'class Player {}\n');
  write(path.join(cwd, 'unity-games/demo/Assets/Enemy.cs'), 'class Enemy {}\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({ responsibleFiles: ['unity-games/demo/Assets/Player.cs'] }), null, 2));
  write(responseFile, JSON.stringify({ edits: [{ path: 'Assets/Enemy.cs', find: 'class Enemy {}', replace: 'class Enemy { int x; }' }], newFiles: [] }));
  await assert.rejects(runVibe2SourceWorker({ cwd, responseFile }), /책임 파일 범위 밖 수정 금지/);
});

test('approved missing Web root produces isolated index.html bootstrap candidate without touching source', async () => {
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'bootstrap.html');
  const workOrder=order({target:'web',root:'web-games/missing-web',responsibleFiles:['web-games/missing-web/index.html'],taskId:'missing-web-bootstrap'});
  workOrder.gameId='missing-web';
  workOrder.goal='FULL_WEB_GAME_REBUILD SOURCE_ROOT_BOOTSTRAP_ALLOWED';
  workOrder.selectedTask={evidence:['source-root-bootstrap-required','existing-web-source:MISSING']};
  workOrder.workerPolicy={directMainWrite:false,sourceRootBootstrapAllowed:true,fullFileRewriteAllowed:true};
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  const body='let frame=0;'+ 'frame+=1;'.repeat(1500);
  const replacement=`<!doctype html><html><body><canvas id="game"></canvas><script>${body}</script></body></html>`;
  write(responseFile,replacement);
  const result=await runVibe2SourceWorker({cwd,responseFile});
  assert.equal(result.sourceRootBootstrap,true);
  assert.equal(result.fullFileRewriteAllowed,true);
  assert.deepEqual(result.changedFiles,['index.html']);
  assert.equal(fs.existsSync(path.join(cwd,'web-games/missing-web')),false);
  assert.equal(fs.readFileSync(path.join(cwd,'.vibe2/candidates/missing-web-bootstrap/files/index.html'),'utf8').trim(),replacement);
});

test('missing Web root without bootstrap authority remains rejected', async () => {
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'unused.html');
  const workOrder=order({target:'web',root:'web-games/missing-web',responsibleFiles:['web-games/missing-web/index.html'],taskId:'missing-web-denied'});
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(responseFile,'<!doctype html><html><body>unused</body></html>');
  await assert.rejects(runVibe2SourceWorker({cwd,responseFile}),/source root 없음/);
});

test('existing web game text maintenance is allowed', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.json');
  write(path.join(cwd, 'web-games/demo/index.html'), '<button>old</button>\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({
    target: 'web', root: 'web-games/demo', responsibleFiles: ['web-games/demo/index.html'], taskId: 'web-maintenance'
  }), null, 2));
  write(responseFile, JSON.stringify({ edits: [{ path: 'index.html', find: '>old<', replace: '>new<' }], newFiles: [] }));
  const result = await runVibe2SourceWorker({ cwd, responseFile });
  assert.equal(result.target, 'web');
  assert.deepEqual(result.changedFiles, ['index.html']);
});

test('existing Web assessment overrides stale full-rebuild flags when KEEP_AND_CONTINUE is selected', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.json');
  const workOrder = order({ target: 'web', root: 'web-games/demo', responsibleFiles: ['web-games/demo/index.html'], taskId: 'web-keep-existing' });
  workOrder.goal = 'FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed = true;
  workOrder.evidence = ['web-strict-score:84'];
  const source = `<!doctype html><html><body><button id="play">Play</button><script>
  let hp=10,wave=2,gold=30,playerX=1,playerY=1,enemy={hp:3};
  addEventListener('touchstart',()=>{enemy.hp-=1}); function update(){requestAnimationFrame(update)}update();
  function restart(){wave=1} const victory='victory',defeat='defeat'; localStorage.setItem('save','1'); new AudioContext();
  </script></body></html>`;
  write(path.join(cwd, 'web-games/demo/index.html'), source);
  write(path.join(cwd, 'design/demo/2026-09-18/design-revised.json'), JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd, 'design/demo/2026-09-18/cycle-status.json'), JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(responseFile, JSON.stringify({edits:[{path:'index.html',find:'<button id="play">Play</button>',replace:'<button id="play">Continue</button>'}],newFiles:[],replaceFiles:[]}));
  const result = await runVibe2SourceWorker({ cwd, responseFile });
  assert.notEqual(result.exploration.existingWebAssessment.strategy,'FULL_REBUILD');
  assert.equal(result.fullFileRewriteAllowed,false);
  assert.deepEqual(result.changedFiles,['index.html']);
});

test('exploration FULL_REBUILD strategy can authorize full web rewrite without planner pre-deciding rebuild', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.txt');
  const replacement = `<!doctype html><html><body><canvas id="game"></canvas><script>${'let frame=0;frame+=1;'.repeat(650)}</script></body></html>`;
  const workOrder = order({ target: 'web', root: 'web-games/demo', responsibleFiles: ['web-games/demo/index.html'], taskId: 'web-assessed-rebuild' });
  workOrder.goal = 'EXISTING_WEB_ASSESS_AND_IMPLEMENT';
  write(path.join(cwd, 'web-games/demo/index.html'), '<!doctype html><html><body><h1>검증 패널</h1><button data-session-stage="1">다음</button></body></html>\n');
  write(path.join(cwd, 'design/demo/2026-09-18/design-revised.json'), JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd, 'design/demo/2026-09-18/cycle-status.json'), JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(responseFile, ['VIBE2_FULL_FILE','PATH:index.html','SUMMARY:assessment rebuild','EXPECTED_EFFECT:playable game','TEST:gameplay','---VIBE2_FILE_CONTENT---',replacement,'---VIBE2_FILE_END---'].join('\n'));
  const result = await runVibe2SourceWorker({ cwd, responseFile });
  assert.equal(result.fullFileRewriteAllowed, true);
  assert.equal(result.exploration.existingWebAssessment.strategy,'FULL_REBUILD');
});

test('full web rebuild recovers complete direct HTML when the model omits the envelope', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.html');
  const replacement = `<!doctype html><html><body><canvas id="game"></canvas><script>${'let frame=0;frame+=1;'.repeat(650)}</script></body></html>`;
  const workOrder = order({ target: 'web', root: 'web-games/demo', responsibleFiles: ['web-games/demo/index.html'], taskId: 'web-direct-html-recovery' });
  workOrder.goal = 'FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed = true;
  write(path.join(cwd, 'web-games/demo/index.html'), '<!doctype html><html><body>prototype</body></html>\n');
  write(path.join(cwd, 'design/demo/2026-09-18/design-revised.json'), JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd, 'design/demo/2026-09-18/cycle-status.json'), JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(responseFile, replacement);
  const result = await runVibe2SourceWorker({ cwd, responseFile });
  assert.equal(result.fullFileRewriteAllowed, true);
  assert.deepEqual(result.changedFiles, ['index.html']);
  assert.equal(fs.readFileSync(path.join(cwd, '.vibe2/candidates/web-direct-html-recovery/files/index.html'), 'utf8').trim(), replacement);
});

test('full web rebuild accepts fenced complete HTML but rejects prose or truncation', async () => {
  const cwd = tempRoot();
  const good = path.join(cwd, 'good.html');
  const bad = path.join(cwd, 'bad.html');
  const truncated = path.join(cwd, 'truncated.html');
  const replacement = `<!doctype html><html><body><canvas id="game"></canvas><script>${'let frame=0;frame+=1;'.repeat(650)}</script></body></html>`;
  const workOrder = order({ target: 'web', root: 'web-games/demo', responsibleFiles: ['web-games/demo/index.html'], taskId: 'web-fenced-html-recovery' });
  workOrder.goal = 'FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed = true;
  write(path.join(cwd, 'web-games/demo/index.html'), '<!doctype html><html><body>prototype</body></html>\n');
  write(path.join(cwd, 'design/demo/2026-09-18/design-revised.json'), JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd, 'design/demo/2026-09-18/cycle-status.json'), JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(good, `\`\`\`html\n${replacement}\n\`\`\``);
  const result = await runVibe2SourceWorker({ cwd, responseFile: good });
  assert.deepEqual(result.changedFiles, ['index.html']);
  workOrder.taskId = 'web-direct-html-prose-reject';
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(bad, `Here is the game:\n${replacement}`);
  await assert.rejects(runVibe2SourceWorker({ cwd, responseFile: bad }), /JSON 시작을 찾지 못함/);
  workOrder.taskId = 'web-direct-html-truncated-reject';
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(truncated, '<!doctype html><html><body><canvas id="game"></canvas>');
  await assert.rejects(runVibe2SourceWorker({ cwd, responseFile: truncated }), /JSON 시작을 찾지 못함/);
});

test('full web rebuild accepts raw full-file envelope without JSON escaping', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.txt');
  const source = '<!doctype html><html><body>old prototype</body></html>\n';
  const replacement = `<!doctype html><html><body><canvas id="game"></canvas><script>${'let frame=0;frame+=1;'.repeat(650)}</script></body></html>`;
  const workOrder = order({ target: 'web', root: 'web-games/demo', responsibleFiles: ['web-games/demo/index.html'], taskId: 'web-full-rebuild' });
  workOrder.goal = 'FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed = true;
  write(path.join(cwd, 'web-games/demo/index.html'), source);
  write(path.join(cwd, 'design/demo/2026-09-18/design-revised.json'), JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd, 'design/demo/2026-09-18/cycle-status.json'), JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(responseFile, [
    'VIBE2_FULL_FILE',
    'PATH:index.html',
    'SUMMARY:실제 플레이 가능한 웹게임 전체 교체',
    'EXPECTED_EFFECT:직접 입력과 런타임 게임 루프 제공',
    'TEST:mobile gameplay',
    'TEST:restart',
    '---VIBE2_FILE_CONTENT---',
    replacement,
    '---VIBE2_FILE_END---'
  ].join('\n'));
  const result = await runVibe2SourceWorker({ cwd, responseFile });
  assert.equal(result.fullFileRewriteAllowed, true);
  assert.deepEqual(result.changedFiles, ['index.html']);
  assert.equal(fs.readFileSync(path.join(cwd, '.vibe2/candidates/web-full-rebuild/files/index.html'), 'utf8').trim(), replacement);
});

test('full web rebuild rejects truncated raw full-file envelope', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.txt');
  const workOrder = order({ target: 'web', root: 'web-games/demo', responsibleFiles: ['web-games/demo/index.html'], taskId: 'web-full-truncated' });
  workOrder.goal = 'FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed = true;
  write(path.join(cwd, 'web-games/demo/index.html'), '<!doctype html><html><body>prototype</body></html>\n');
  write(path.join(cwd, 'design/demo/2026-09-18/design-revised.json'), JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd, 'design/demo/2026-09-18/cycle-status.json'), JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(responseFile, 'VIBE2_FULL_FILE\nPATH:index.html\n---VIBE2_FILE_CONTENT---\n<!doctype html><html><body>잘린 출력');
  await assert.rejects(runVibe2SourceWorker({ cwd, responseFile }), /잘렸거나 종료 마커가 없음/);
});

test('malformed JSON candidate gets one bounded strict-JSON recovery retry', async () => {
  const cwd = tempRoot();
  const bad = path.join(cwd, 'bad.json');
  const good = path.join(cwd, 'good.json');
  write(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'class Player { int Speed() { return 1; } }\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({ responsibleFiles: ['unity-games/demo/Assets/Player.cs'], taskId: 'json-retry' }), null, 2));
  write(bad, "{edits:[{path:'Assets/Player.cs'}]}");
  write(good, JSON.stringify({ edits: [{ path: 'Assets/Player.cs', find: 'return 1;', replace: 'return 2;' }], newFiles: [] }));
  const result = await runVibe2SourceWorker({ cwd, responseFiles: [bad, good] });
  assert.equal(result.generation.attempts, 2);
  assert.equal(result.generation.recoveryUsed, true);
  assert.equal(result.generation.mode, 'JSON_EDIT');
  assert.deepEqual(result.changedFiles, ['Assets/Player.cs']);
});

test('single-file Web diagnostic uses the same compact generation profile', async () => {
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'diagnostic.json');
  const source=['<!doctype html><html><body>','<button id="play">Play</button>','<script>let timer=setInterval(()=>{},1000);</script>','</body></html>'].join('\n');
  write(path.join(cwd,'web-games/demo/rpg.html'),source);
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/rpg.html'],taskId:'web-diagnostic-compact'});
  workOrder.goal='[DIAGNOSTIC_BUNDLE] rpg.html 반복 타이머 생명주기와 중복 실행을 점검하고 필요한 해제 경로를 추가한다.';
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(responseFile,JSON.stringify({
    summary:'cleanup interval lifecycle',
    expectedEffect:'no duplicate timer',
    edits:[{path:'rpg.html',find:'<script>let timer=setInterval(()=>{},1000);</script>',replace:'<script>let timer=setInterval(()=>{},1000);addEventListener("pagehide",()=>clearInterval(timer),{once:true});</script>'}],
    newFiles:[],replaceFiles:[],tests:['interval cleanup']
  }));
  const result=await runVibe2SourceWorker({cwd,responseFile});
  assert.equal(result.generation.focusedWebRepair,true);
  assert.equal(result.generation.maxPredict,1024);
  assert.equal(result.generation.contextWindow,12288);
  assert.ok(result.generation.contextFiles<=2);
  assert.ok(result.generation.contextBytes<=28000);
  assert.deepEqual(result.changedFiles,['rpg.html']);
});

test('exact Web repair uses compact generation budget without weakening edit boundaries', async () => {
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'model-focused-repair.json');
  const index=['<!doctype html><html><body>','<button id="play">Play</button>',`<script>${'const tick=1;'.repeat(1800)}</script>`,'</body></html>'].join('\n');
  write(path.join(cwd,'web-games/demo/index.html'),index);
  write(path.join(cwd,'web-games/demo/runtime-helper.js'),'export const runtimeHint=true;\n'+('const helper=1;\n'.repeat(700)));
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'focused-web-repair'});
  workOrder.goal='[WEB_REPAIR] company-runtime failure evidence requires one exact index.html repair';
  workOrder.selectedTask={evidence:['web-stage:WEB_REPAIR','company-runtime-state:WEB_VIBE_REPAIR_REQUIRED']};
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(responseFile,JSON.stringify({
    summary:'repair existing mobile action',
    expectedEffect:'visible implementation change',
    edits:[{path:'index.html',find:'>Play<',replace:'>Continue<'}],
    newFiles:[],replaceFiles:[],tests:['button label']
  }));
  const result=await runVibe2SourceWorker({cwd,responseFile});
  assert.equal(result.generation.focusedWebRepair,true);
  assert.equal(result.generation.maxPredict,1024);
  assert.equal(result.generation.contextWindow,12288);
  assert.ok(result.generation.contextFiles<=2);
  assert.ok(result.generation.contextBytes<=28000);
  assert.deepEqual(result.changedFiles,['index.html']);
});
test('focused Web repair composes exact primary-symbol windows instead of broad file excerpts',async()=>{
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'focused-symbol.json');
  const filler='const backgroundDecoration=1;\n'.repeat(3500);
  const source='<!doctype html><html><body><script>\n'+filler+
    'let pointerState=null,placedEntities=[];\n'+
    'function placeTower(slot){placedEntities.push(slot);return true;}\n'+
    'function handlePointer(event){pointerState={x:event.clientX,y:event.clientY};return placeTower(pointerState);}\n'+
    'addEventListener("pointerdown",handlePointer);\n'+filler+'</script></body></html>\n';
  write(path.join(cwd,'web-games/demo/index.html'),source);
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'focused-symbol-context'});
  workOrder.originalGoal='모바일 pointer 입력을 placement state에 연결한다';
  workOrder.goal='[WEB_REPAIR] runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING 수정';
  workOrder.selectedTask={evidence:['web-stage:WEB_REPAIR','runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING'],lastOutcome:'FAIL'};
  workOrder.workPackage={id:'focused-symbol-wp',sharedContext:{diagnosticEvidence:['runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING']}};
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  const find='function handlePointer(event){pointerState={x:event.clientX,y:event.clientY};return placeTower(pointerState);}';
  write(responseFile,JSON.stringify({edits:[{path:'index.html',find,replace:'function handlePointer(event){pointerState={x:Math.round(event.clientX),y:Math.round(event.clientY)};return placeTower(pointerState);}'}],newFiles:[],replaceFiles:[]}));
  const result=await runVibe2SourceWorker({cwd,responseFile});
  assert.equal(result.generation.contextMode,'PRIMARY_SYMBOL_WINDOWS');
  assert.equal(result.generation.exactSourceWindows,true);
  assert.equal(result.generation.fullFileContextFallback,false);
  assert.ok(result.generation.focusedSymbolCount>=1);
  assert.ok(result.generation.contextBytes<=28000);
  assert.equal(result.codingMethod.contextMode,'PRIMARY_SYMBOL_WINDOWS');
  assert.deepEqual(result.changedFiles,['index.html']);
});

test('verified context preference can choose bounded Web repair context without changing write scope',async()=>{
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'preferred-bounded-context.json');
  const filler='const backgroundDecoration=1;\n'.repeat(3500);
  const source='<!doctype html><html><body><script>\n'+filler+
    'let pointerState=null,placedEntities=[];\n'+
    'function placeTower(slot){placedEntities.push(slot);return true;}\n'+
    'function handlePointer(event){pointerState={x:event.clientX,y:event.clientY};return placeTower(pointerState);}\n'+
    'addEventListener("pointerdown",handlePointer);\n'+filler+'</script></body></html>\n';
  write(path.join(cwd,'web-games/demo/index.html'),source);
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'preferred-bounded-context'});
  workOrder.originalGoal='모바일 pointer 입력을 placement state에 연결한다';
  workOrder.goal='[WEB_REPAIR] runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING 수정';
  workOrder.selectedTask={evidence:['web-stage:WEB_REPAIR','runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING'],lastOutcome:'FAIL'};
  workOrder.workPackage={id:'preferred-bounded-wp',sharedContext:{diagnosticEvidence:['runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING']}};
  workOrder.codingStrategyPreference={strategy:'RESPONSIBILITY_FIRST',preferredContextMode:'BOUNDED_FILE_EXCERPT_FALLBACK',preferredContextModeSamples:3};
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  const find='function handlePointer(event){pointerState={x:event.clientX,y:event.clientY};return placeTower(pointerState);}';
  write(responseFile,JSON.stringify({edits:[{path:'index.html',find,replace:'function handlePointer(event){pointerState={x:Math.round(event.clientX),y:Math.round(event.clientY)};return placeTower(pointerState);}'}],newFiles:[],replaceFiles:[]}));
  const result=await runVibe2SourceWorker({cwd,responseFile});
  assert.equal(result.generation.contextMode,'BOUNDED_FILE_EXCERPT_FALLBACK');
  assert.equal(result.generation.contextPreferenceRequested,'BOUNDED_FILE_EXCERPT_FALLBACK');
  assert.equal(result.generation.contextPreferenceApplied,true);
  assert.equal(result.generation.exactSourceWindows,false);
  assert.equal(result.generation.fullFileContextFallback,true);
  assert.equal(result.codingMethod.contextPreferenceApplied,true);
  assert.deepEqual(result.changedFiles,['index.html']);
});

test('focused symbol context matches JavaScript identifiers containing regex metacharacters',async()=>{
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'focused-dollar-symbol.json');
  const filler='const decoration=1;\n'.repeat(2800);
  const source='<!doctype html><html><body><script>\n'+filler+
    'let pointerState=null,placedEntities=[];\n'+
    'function place$Tower(slot){placedEntities.push(slot);return true;}\n'+
    'function handle$Pointer(event){pointerState={x:event.clientX,y:event.clientY};return place$Tower(pointerState);}\n'+
    'addEventListener("pointerdown",handle$Pointer);\n'+filler+'</script></body></html>\n';
  write(path.join(cwd,'web-games/demo/index.html'),source);
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'focused-dollar-symbol'});
  workOrder.originalGoal='모바일 pointer 입력을 placement state에 연결한다';
  workOrder.goal='[WEB_REPAIR] runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING 수정';
  workOrder.selectedTask={evidence:['web-stage:WEB_REPAIR','runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING'],lastOutcome:'FAIL'};
  workOrder.workPackage={id:'focused-dollar-wp',sharedContext:{diagnosticEvidence:['runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING']}};
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  const find='function handle$Pointer(event){pointerState={x:event.clientX,y:event.clientY};return place$Tower(pointerState);}';
  write(responseFile,JSON.stringify({edits:[{path:'index.html',find,replace:'function handle$Pointer(event){pointerState={x:Math.round(event.clientX),y:Math.round(event.clientY)};return place$Tower(pointerState);}'}],newFiles:[],replaceFiles:[]}));
  const result=await runVibe2SourceWorker({cwd,responseFile});
  assert.equal(result.generation.contextMode,'PRIMARY_SYMBOL_WINDOWS');
  assert.equal(result.generation.exactSourceWindows,true);
  assert.ok(result.generation.focusedSymbolCount>=1);
  assert.ok(result.generation.contextBytes<=28000);
  assert.deepEqual(result.changedFiles,['index.html']);
});

test('zero-change candidate gets one bounded recovery retry that produces a real responsible-file edit', async () => {
  const cwd = tempRoot();
  const empty = path.join(cwd, 'empty.json');
  const good = path.join(cwd, 'good.json');
  write(path.join(cwd, 'web-games/demo/index.html'), '<button id="play">Play</button>\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({
    target: 'web',
    root: 'web-games/demo',
    responsibleFiles: ['web-games/demo/index.html'],
    taskId: 'zero-change-retry'
  }), null, 2));
  write(empty, JSON.stringify({ summary:'looked okay', expectedEffect:'none', edits:[], newFiles:[], replaceFiles:[], tests:[] }));
  write(good, JSON.stringify({
    summary:'make the existing control actionable',
    expectedEffect:'visible implementation progress',
    edits:[{ path:'index.html', find:'>Play<', replace:'>Continue<' }],
    newFiles:[],
    replaceFiles:[],
    tests:['button label']
  }));
  const result = await runVibe2SourceWorker({ cwd, responseFiles:[empty,good] });
  assert.equal(result.generation.attempts,2);
  assert.equal(result.generation.recoveryUsed,true);
  assert.equal(result.generation.mode,'JSON_EDIT');
  assert.deepEqual(result.changedFiles,['index.html']);
});

test('zero-change recovery prompt requires a concrete bounded edit', () => {
  const prompt = buildGenerationRetryPrompt('Allowed edit paths: index.html\n=== FILE index.html ===\n<button>Play</button>', {
    allowFullRewrite:false,
    error:new Error('후보가 실제 source 변경을 생성하지 않음')
  });
  assert.match(prompt,/zero actual source changes/);
  assert.match(prompt,/MUST produce at least one edits\[\] entry/);
  assert.match(prompt,/ONLY writable path is "index\.html"/);
  assert.match(prompt,/EXACT FIND ANCHOR OPTION/);
  assert.match(prompt,/do not bypass responsible-file boundaries/);
  assert.equal(shouldRetryGenerationError(new Error('후보가 실제 source 변경을 생성하지 않음')),true);
});

test('second no-op receives one short focused third retry', async () => {
  const cwd=tempRoot();
  const noop1=path.join(cwd,'noop1.json');
  const noop2=path.join(cwd,'noop2.json');
  const good=path.join(cwd,'good3.json');
  write(path.join(cwd,'web-games/demo/index.html'),'<button id="play">Play</button>\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'focused-third-retry'}),null,2));
  const noop=JSON.stringify({edits:[{path:'index.html',find:'>Play<',replace:'>Play<'}],newFiles:[],replaceFiles:[]});
  write(noop1,noop);
  write(noop2,noop);
  write(good,JSON.stringify({replace:'<button id="play">Continue</button>'}));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[noop1,noop2,good]});
  assert.equal(result.generation.attempts,3);
  assert.equal(result.generation.recoveryUsed,true);
  assert.equal(result.generation.focusedFinalRetry,true);
  assert.equal(result.generation.focusedReplaceOnly,true);
  assert.equal(result.generation.timeoutMs,150000);
  assert.equal(result.generation.maxPredict,768);
  assert.equal(result.generation.temperature,0.26);
  assert.deepEqual(result.changedFiles,['index.html']);
});

test('semantic diff violation retries inside the same worker and succeeds with a narrowed responsible patch',async()=>{
  const cwd=tempRoot();
  const bad=path.join(cwd,'semantic-bad.json');
  const good=path.join(cwd,'semantic-good.json');
  const source='<!doctype html><html><body><script>\n'+
    'let pointerState=null, placedEntities=[], gold=100;\n'+
    'function placeTower(slot){ placedEntities.push(slot); return true; }\n'+
    'function handlePointer(event){ pointerState={x:event.clientX,y:event.clientY}; return placeTower(pointerState); }\n'+
    'addEventListener("pointerdown",handlePointer);\n'+
    '</script></body></html>\n';
  write(path.join(cwd,'web-games/demo/index.html'),source);
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'semantic-retry'});
  workOrder.originalGoal='모바일 pointer 입력을 placement state에 연결한다';
  workOrder.goal='runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING 수정';
  workOrder.selectedTask={evidence:['runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING'],lastOutcome:'FAIL'};
  workOrder.workPackage={id:'semantic-wp',sharedContext:{diagnosticEvidence:['runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING']}};
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  const find='function handlePointer(event){ pointerState={x:event.clientX,y:event.clientY}; return placeTower(pointerState); }';
  write(bad,JSON.stringify({edits:[{path:'index.html',find,replace:'function handlePointer(event){ pointerState={x:event.clientX,y:event.clientY}; gold+=999; return placeTower(pointerState); }'}],newFiles:[],replaceFiles:[]}));
  write(good,JSON.stringify({edits:[{path:'index.html',find,replace:'function handlePointer(event){ pointerState={x:Math.round(event.clientX),y:Math.round(event.clientY)}; return placeTower(pointerState); }'}],newFiles:[],replaceFiles:[]}));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[bad,good]});
  assert.equal(result.generation.attempts,2);
  assert.equal(result.generation.recoveryUsed,true);
  assert.equal(result.codingMethod.semanticDiffEnforcement.mode,'HARD_ENFORCE');
  assert.equal(result.codingMethod.semanticDiffEnforcement.pass,true);
  assert.equal(result.codingMethod.candidateProducedFirstAttempt,false);
  assert.deepEqual(result.changedFiles,['index.html']);
});
test('semantic diff hard gate allows primary responsibility edits inside the compiled system budget',()=>{
  const result=evaluateSemanticDiffBudget({
    candidate:{edits:[{path:'index.html',find:'function handlePointer(e){ pointerState=e; return placeTower(pointerState); }',replace:'function handlePointer(e){ pointerState=normalizePointer(e); return placeTower(pointerState); }'}],newFiles:[],replaceFiles:[]},
    editContract:{
      responsibilityConfidence:'HIGH',primaryTargets:['handlePointer'],allowedDependentSymbolsOrSystems:['placeTower'],ownedState:['pointerState'],
      codingArchitecture:{developmentMode:'PRESERVE_PATCH'},
      semanticDiffBudget:{allowedSystems:['INPUT','PLACEMENT'],unrelatedSystemMutationForbidden:true,saveKeysMustRemainCompatible:[]}
    }
  });
  assert.equal(result.mode,'HARD_ENFORCE');
  assert.equal(result.pass,true);
  assert.ok(result.touchedSystems.includes('INPUT'));
});

test('semantic diff hard gate rejects explicit unrelated system mutation even when edit touches the primary symbol',()=>{
  const result=evaluateSemanticDiffBudget({
    candidate:{edits:[{path:'index.html',find:'function handlePointer(e){ pointerState=e; return placeTower(pointerState); }',replace:'function handlePointer(e){ pointerState=e; gold+=999; return placeTower(pointerState); }'}],newFiles:[],replaceFiles:[]},
    editContract:{
      responsibilityConfidence:'HIGH',primaryTargets:['handlePointer'],allowedDependentSymbolsOrSystems:['placeTower'],ownedState:['pointerState'],
      codingArchitecture:{developmentMode:'PRESERVE_PATCH'},
      semanticDiffBudget:{allowedSystems:['INPUT','PLACEMENT'],unrelatedSystemMutationForbidden:true,saveKeysMustRemainCompatible:[]}
    }
  });
  assert.equal(result.pass,false);
  assert.ok(result.unexpectedSystems.includes('ECONOMY'));
  assert.match(result.violations.join('|'),/UNRELATED_SYSTEM:ECONOMY/);
});

test('semantic diff hard gate protects existing save keys from silent removal',()=>{
  const result=evaluateSemanticDiffBudget({
    candidate:{edits:[{path:'index.html',find:'function saveGame(){ localStorage.setItem("demo-save", JSON.stringify(state)); }',replace:'function saveGame(){ localStorage.setItem("new-save", JSON.stringify(state)); }'}],newFiles:[],replaceFiles:[]},
    editContract:{
      responsibilityConfidence:'HIGH',primaryTargets:['saveGame'],allowedDependentSymbolsOrSystems:[],ownedState:['serializedProgress'],
      codingArchitecture:{developmentMode:'PRESERVE_PATCH'},
      semanticDiffBudget:{allowedSystems:['SAVE'],unrelatedSystemMutationForbidden:true,saveKeysMustRemainCompatible:['demo-save']}
    }
  });
  assert.equal(result.pass,false);
  assert.match(result.violations.join('|'),/SAVE_KEY_COMPATIBILITY/);
});

test('semantic diff invariant blocks variable-backed save key mutation outside explicit migration',()=>{
  const cwd=tempRoot();
  const sourceRoot=path.join(cwd,'web-games/demo');
  write(path.join(sourceRoot,'index.html'),"const C={id:'demo'}; const key='jg-final:'+C.id; const load=()=>localStorage.getItem(key); const save=()=>localStorage.setItem(key,'{}'); function actDefense(){return 1;}\n");
  const result=evaluateSemanticDiffBudget({
    candidate:{edits:[{path:'index.html',find:"const key='jg-final:'+C.id;",replace:"const key='jg-final:'+C.id+1;"}],newFiles:[],replaceFiles:[]},
    editContract:{
      responsibilityConfidence:'LOW',primaryTargets:['actDefense'],allowedDependentSymbolsOrSystems:[],ownedState:[],
      codingArchitecture:{developmentMode:'PRESERVE_PATCH'},
      semanticDiffBudget:{allowedSystems:['INPUT','PLACEMENT'],unrelatedSystemMutationForbidden:true,saveKeysMustRemainCompatible:[]}
    },
    sourceRoot
  });
  assert.equal(result.mode,'INVARIANT_ENFORCE');
  assert.equal(result.pass,false);
  assert.equal(result.saveContractInvariantEnforced,true);
  assert.match(result.violations.join('|'),/SAVE_CONTRACT_MUTATION:index\.html:binding:key/);
});

test('semantic diff invariant allows unrelated source repair when save binding is unchanged',()=>{
  const cwd=tempRoot();
  const sourceRoot=path.join(cwd,'web-games/demo');
  write(path.join(sourceRoot,'index.html'),"const C={id:'demo'}; const key='jg-final:'+C.id; const load=()=>localStorage.getItem(key); const save=()=>localStorage.setItem(key,'{}'); function actDefense(){return 1;}\n");
  const result=evaluateSemanticDiffBudget({
    candidate:{edits:[{path:'index.html',find:'function actDefense(){return 1;}',replace:'function actDefense(){return 2;}'}],newFiles:[],replaceFiles:[]},
    editContract:{
      responsibilityConfidence:'LOW',primaryTargets:['actDefense'],allowedDependentSymbolsOrSystems:[],ownedState:[],
      codingArchitecture:{developmentMode:'PRESERVE_PATCH'},
      semanticDiffBudget:{allowedSystems:['PLACEMENT'],unrelatedSystemMutationForbidden:true,saveKeysMustRemainCompatible:[]}
    },
    sourceRoot
  });
  assert.equal(result.mode,'OBSERVE_ONLY');
  assert.equal(result.pass,true);
  assert.deepEqual(result.saveContractMutations,[]);
});

test('candidate release gate mirrors variable-backed save contract invariant',()=>{
  const workflow=fs.readFileSync('.github/workflows/vibe2-candidate-release.yml','utf8');
  assert.match(workflow,/const storageContract=raw=>/);
  assert.match(workflow,/beforeStorage\.variableBindings/);
  assert.match(workflow,/VIBE2_WEB_SAVE_CONTRACT_MUTATION/);
  assert.doesNotMatch(workflow,/const historicalSaveKey=/);
});

test('ambiguous or low confidence semantic classification is observe-only instead of false rejecting',()=>{
  const result=evaluateSemanticDiffBudget({
    candidate:{edits:[{path:'index.html',find:'const value=1;',replace:'const value=2; gold+=1;'}],newFiles:[],replaceFiles:[]},
    editContract:{responsibilityConfidence:'LOW',primaryTargets:[],codingArchitecture:{developmentMode:'PRESERVE_PATCH'},semanticDiffBudget:{allowedSystems:['INPUT'],unrelatedSystemMutationForbidden:true}}
  });
  assert.equal(result.mode,'OBSERVE_ONLY');
  assert.equal(result.pass,true);
  assert.equal(result.ambiguousClassificationObserved,true);
});
test('generation failure classification keeps causal retry reasons distinct',()=>{
  assert.equal(generationFailureClass(new Error('변경 없는 edit: index.html')),'NO_OP');
  assert.equal(generationFailureClass(new Error('Ollama 응답 시간 초과: 240000ms')),'TIMEOUT');
  assert.equal(generationFailureClass(new Error('SEMANTIC_DIFF_BUDGET_VIOLATION:UNRELATED_SYSTEM:ECONOMY')),'SEMANTIC_DIFF_BUDGET');
  assert.equal(shouldRetryGenerationError(new Error('SEMANTIC_DIFF_BUDGET_VIOLATION:UNRELATED_SYSTEM:ECONOMY')),true);
  assert.equal(generationFailureClass(new Error('책임 파일 범위 밖 수정 금지: config.js')),'INVALID_PATH');
  assert.equal(generationFailureClass(new Error('잘못된 상대 경로:')),'INVALID_PATH');
  assert.equal(shouldRetryGenerationError(new Error('잘못된 상대 경로:')),true);
  assert.equal(generationFailureClass(new Error('전체 교체 파일 크기 오류: index.html')),'FULL_REWRITE_SIZE');
  assert.equal(generationFailureClass(new Error('모델 JSON 파싱 실패')),'MALFORMED_OUTPUT');
  assert.equal(generationFailureClass(new Error('같은 파일에 edit/new/replace 중복 작업 금지')),'MALFORMED_OUTPUT');
  assert.equal(shouldRetryGenerationError(new Error('같은 파일에 edit/new/replace 중복 작업 금지')),true);
  assert.equal(generationFailureClass(new Error('focused replace placeholder 금지: index.html')),'MALFORMED_OUTPUT');
  assert.equal(shouldRetryGenerationError(new Error('focused replace placeholder 금지: index.html')),true);
  assert.equal(generationFailureClass(new Error('focused replace 비어 있음')),'MALFORMED_OUTPUT');
});
test('truncated FULL_REBUILD gets one compact raw-envelope recovery retry', async () => {
  const cwd = tempRoot();
  const bad = path.join(cwd, 'bad.txt');
  const good = path.join(cwd, 'good.txt');
  const replacement = `<!doctype html><html><body><canvas id="game"></canvas><script>${'let frame=0;frame+=1;'.repeat(650)}</script></body></html>`;
  const workOrder = order({ target: 'web', root: 'web-games/demo', responsibleFiles: ['web-games/demo/index.html'], taskId: 'full-retry' });
  workOrder.goal = 'FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed = true;
  write(path.join(cwd, 'web-games/demo/index.html'), '<!doctype html><html><body>prototype</body></html>\n');
  write(path.join(cwd, 'design/demo/2026-09-18/design-revised.json'), JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd, 'design/demo/2026-09-18/cycle-status.json'), JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(bad, 'VIBE2_FULL_FILE\nPATH:index.html\n---VIBE2_FILE_CONTENT---\n<!doctype html><html><body>truncated');
  write(good, ['VIBE2_FULL_FILE','PATH:index.html','SUMMARY:compact retry','EXPECTED_EFFECT:playable','TEST:runtime','---VIBE2_FILE_CONTENT---',replacement,'---VIBE2_FILE_END---'].join('\n'));
  const result = await runVibe2SourceWorker({ cwd, responseFiles: [bad, good] });
  assert.equal(result.generation.attempts, 2);
  assert.equal(result.generation.recoveryUsed, true);
  assert.equal(result.generation.mode, 'FULL_WEB');
  assert.deepEqual(result.changedFiles, ['index.html']);
});

test('undersized full web error reports validator-scale generation minimum without lowering parser safety gate', async () => {
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'undersized-single.txt');
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'full-size-telemetry'});
  workOrder.goal='FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed=true;
  write(path.join(cwd,'web-games/demo/index.html'),'<!doctype html><html><body>prototype</body></html>\n');
  write(path.join(cwd,'design/demo/2026-09-18/design-revised.json'),JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd,'design/demo/2026-09-18/cycle-status.json'),JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(responseFile,'VIBE2_FULL_FILE\nPATH:index.html\nSUMMARY:small\n---VIBE2_FILE_CONTENT---\n<!doctype html><html><body>tiny</body></html>\n---VIBE2_FILE_END---');
  await assert.rejects(
    runVibe2SourceWorker({cwd,responseFile}),
    /전체 교체 파일 크기 오류: index\.html:bytes=\d+:min=12000:max=260000/
  );
});

test('full web without a recovered seed gets one bounded retry after repeated malformed output', async()=>{
  const cwd=tempRoot();
  const bad1=path.join(cwd,'bad-full-1.txt');
  const bad2=path.join(cwd,'bad-full-2.txt');
  const good=path.join(cwd,'good-full-3.txt');
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'full-web-malformed-third-retry'});
  workOrder.goal='FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed=true;
  write(path.join(cwd,'web-games/demo/index.html'),'<!doctype html><html><body>prototype</body></html>\n');
  write(path.join(cwd,'design/demo/2026-09-18/design-revised.json'),JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd,'design/demo/2026-09-18/cycle-status.json'),JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(bad1,['VIBE2_FULL_FILE','PATH:index.html','---VIBE2_FILE_CONTENT---','<!doctype html><html><body><script>'+ 'let a=1;'.repeat(900)].join('\n'));
  write(bad2,['VIBE2_FULL_FILE','PATH:index.html','---VIBE2_FILE_CONTENT---','<!doctype html><html><body><script>'+ 'let b=2;'.repeat(120)].join('\n'));
  const finalBody=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><canvas id="game"></canvas><script>let state={score:0,hp:100,result:"playing"};${'function step(){state.score+=1;if(state.score>400)state.result="win";if(state.hp<=0)state.result="loss";}'.repeat(220)}addEventListener("pointerdown",step);localStorage.setItem("vibe2-bounded-fallback",JSON.stringify(state));</script></body></html>`;
  write(good,['VIBE2_FULL_FILE','PATH:index.html','SUMMARY:recovered','---VIBE2_FILE_CONTENT---',finalBody,'---VIBE2_FILE_END---'].join('\n'));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[bad1,bad2,good]});
  assert.equal(result.generation.attempts,3);
  assert.ok(result.codingMethod.fullWebFallbackBestPartialBytes>Buffer.byteLength(fs.readFileSync(bad2,'utf8'),'utf8')/2);
  assert.deepEqual(result.changedFiles,['index.html']);
});

test('undersized full web output keeps a bounded full-file fallback while expansion mode is active', async () => {
  const cwd=tempRoot();
  const small1=path.join(cwd,'small1.txt');
  const small2=path.join(cwd,'small2.txt');
  const good=path.join(cwd,'good3.txt');
  const replacement=`<!doctype html><html><body><button id="start">Start</button><canvas id="game"></canvas><script>${'let frame=0;frame+=1;'.repeat(650)}</script></body></html>`;
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'full-size-third-retry'});
  workOrder.goal='FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed=true;
  write(path.join(cwd,'web-games/demo/index.html'),'<!doctype html><html><body>prototype</body></html>\n');
  write(path.join(cwd,'design/demo/2026-09-18/design-revised.json'),JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd,'design/demo/2026-09-18/cycle-status.json'),JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  const small='VIBE2_FULL_FILE\nPATH:index.html\nSUMMARY:small\n---VIBE2_FILE_CONTENT---\n<!doctype html><html><body>tiny</body></html>\n---VIBE2_FILE_END---';
  write(small1,small);
  write(small2,small);
  write(good,['VIBE2_FULL_FILE','PATH:index.html','SUMMARY:final','EXPECTED_EFFECT:playable','TEST:mobile','---VIBE2_FILE_CONTENT---',replacement,'---VIBE2_FILE_END---'].join('\n'));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[small1,small2,good]});
  assert.equal(result.generation.attempts,3);
  assert.equal(result.generation.focusedFinalRetry,false);
  assert.equal(result.generation.fullWebExpansionStages,0);
  assert.equal(result.generation.timeoutMs,240000);
  assert.equal(result.generation.maxPredict,4096);
  assert.deepEqual(result.changedFiles,['index.html']);
});

test('undersized full web seed accumulates additive model expansions until validator scale', async () => {
  const cwd=tempRoot();
  const seedFile=path.join(cwd,'seed.txt');
  const expansion1=path.join(cwd,'expansion1.txt');
  const expansion2=path.join(cwd,'expansion2.txt');
  const seedBody=Array.from({length:70},(_,i)=>`function seedMechanic${i}(s){s.score=(s.score||0)+${i%7};return s}`).join('');
  const seed=`<!doctype html><html><body><main id="game"><button id="start">Start</button><canvas></canvas></main><script>let state={score:0,hp:10,wave:1};${seedBody}</script></body></html>`;
  const fragment1=`<section class="combat-system" data-gameplay-system="combat"></section><script>(()=>{const api={};${Array.from({length:90},(_,i)=>`api.m${i}=s=>{s.hp=Math.max(0,(s.hp||10)-1);s.score=(s.score||0)+1;return s};`).join('')}window.addEventListener('pointerdown',e=>{state.x=e.clientX;state.y=e.clientY;state.score+=1});})();</script>`;
  const fragment2=`<section class="progress-system" data-gameplay-system="progression"></section><script>(()=>{${Array.from({length:90},(_,i)=>`function progress${i}(s){s.wave=(s.wave||1)+1;s.gold=(s.gold||0)+${i%5};return s}`).join('')}function finish(){if(state.score>50)document.body.dataset.runResult='victory';if(state.hp<=0)document.body.dataset.runResult='defeat';localStorage.setItem('vibe2-expansion-test',JSON.stringify(state))}window.addEventListener('touchstart',finish,{passive:true});})();</script>`;
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'full-web-expansion-accumulate'});
  workOrder.goal='FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed=true;
  write(path.join(cwd,'web-games/demo/index.html'),'<!doctype html><html><body>prototype</body></html>\n');
  write(path.join(cwd,'design/demo/2026-09-18/design-revised.json'),JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd,'design/demo/2026-09-18/cycle-status.json'),JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(seedFile,['VIBE2_FULL_FILE','PATH:index.html','SUMMARY:seed','---VIBE2_FILE_CONTENT---',seed,'---VIBE2_FILE_END---'].join('\n'));
  write(expansion1,fragment1);
  write(expansion2,['VIBE2_WEB_EXPANSION','---VIBE2_EXPANSION_CONTENT---',fragment2,'---VIBE2_EXPANSION_END---'].join('\n'));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[seedFile,expansion1,expansion2]});
  assert.equal(result.generation.attempts,3);
  assert.equal(result.generation.fullWebExpansionStages,2);
  assert.equal(result.generation.mode,'FULL_WEB');
  assert.equal(result.generation.fullWebInitialSeedStrategy,true);
  assert.deepEqual(result.generation.fullWebInitialSeedTargetBytes,[4200,6500]);
  assert.equal(result.codingMethod.fullWebInitialSeedStrategy,true);
  assert.deepEqual(result.codingMethod.fullWebInitialSeedTargetBytes,[4200,6500]);
  assert.equal(result.generation.temperature,0.22);
  assert.equal(result.generation.repeatedIntermediateOutputs,0);
  assert.deepEqual(result.generation.expansionStageTargets,['REAL_INPUT','UPDATE_OR_STATE_TRANSITION_LOOP']);
  assert.deepEqual(result.codingMethod.expansionStageTargets,['REAL_INPUT','UPDATE_OR_STATE_TRANSITION_LOOP']);
  assert.equal(result.generation.intermediateGrowthBytes.length,2);
  assert.ok(result.generation.intermediateGrowthBytes.every(value=>value>=1200));
  const output=fs.readFileSync(path.join(cwd,'.vibe2/candidates/full-web-expansion-accumulate/files/index.html'),'utf8');
  assert.ok(Buffer.byteLength(output,'utf8')>=12000);
  assert.match(output,/data-gameplay-system="combat"/);
  assert.match(output,/data-gameplay-system="progression"/);
  assert.doesNotMatch(output,/VIBE2_WEB_EXPANSION/);
  assert.deepEqual(result.changedFiles,['index.html']);
});

test('tiny copied expansion skeleton is rejected before a real additive fragment is accepted', async () => {
  const cwd=tempRoot();
  const seedFile=path.join(cwd,'seed-tiny-expansion.txt');
  const tinyFile=path.join(cwd,'tiny-expansion.txt');
  const realFile=path.join(cwd,'real-expansion.txt');
  const seedBody=Array.from({length:110},(_,i)=>`function seed${i}(s){s.score=(s.score||0)+${i%5};s.hp=Math.max(0,(s.hp||20)-0);return s}`).join('');
  const seed=`<!doctype html><html><body><button id="start">Start</button><canvas id="game"></canvas><script>let state={score:0,hp:20,wave:1};${seedBody}</script></body></html>`;
  const tiny='<section class="game-specific-system">...</section><script>(()=>{ /* real additive gameplay implementation */ })();</script>';
  const real=`<section data-gameplay-system="input-progress"></section><script>(()=>{const extra={};${Array.from({length:45},(_,i)=>`extra.m${i}=()=>{state.score+=${(i%4)+1};state.wave+=1;return state.score};`).join('')}window.addEventListener('pointerdown',()=>extra.m1());window.addEventListener('touchstart',()=>extra.m2(),{passive:true});localStorage.setItem('vibe2-tiny-expansion-test',JSON.stringify(state));})();</script>`;
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'tiny-expansion-reject'});
  workOrder.goal='FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed=true;
  write(path.join(cwd,'web-games/demo/index.html'),'<!doctype html><html><body>prototype</body></html>\n');
  write(path.join(cwd,'design/demo/2026-09-18/design-revised.json'),JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd,'design/demo/2026-09-18/cycle-status.json'),JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(seedFile,['VIBE2_FULL_FILE','PATH:index.html','SUMMARY:seed','---VIBE2_FILE_CONTENT---',seed,'---VIBE2_FILE_END---'].join('\n'));
  write(tinyFile,['VIBE2_WEB_EXPANSION','---VIBE2_EXPANSION_CONTENT---',tiny,'---VIBE2_EXPANSION_END---'].join('\n'));
  write(realFile,['VIBE2_WEB_EXPANSION','---VIBE2_EXPANSION_CONTENT---',real,'---VIBE2_EXPANSION_END---'].join('\n'));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[seedFile,tinyFile,realFile]});
  assert.equal(result.generation.attempts,3);
  assert.equal(result.generation.fullWebExpansionStages,1);
  assert.equal(result.generation.repeatedIntermediateOutputs,1);
  assert.ok(result.generation.intermediateGrowthBytes[0]>=1200);
  const output=fs.readFileSync(path.join(cwd,'.vibe2/candidates/tiny-expansion-reject/files/index.html'),'utf8');
  assert.doesNotMatch(output,/game-specific-system/);
  assert.match(output,/data-gameplay-system="input-progress"/);
});

test('full web expansion whole-document response can become a larger seed before final acceptance', async()=>{
  const cwd=tempRoot();
  const seedFile=path.join(cwd,'seed-whole-expansion.txt');
  const wholeDocFile=path.join(cwd,'whole-doc-expansion.txt');
  const fragmentFile=path.join(cwd,'fragment-after-whole-doc.txt');
  const seedBody=Array.from({length:45},(_,i)=>`function seedBase${i}(s){s.score=(s.score||0)+${i%3};return s}`).join('');
  const seed=`<!doctype html><html><body><button id="start">Start</button><script>let state={score:0,hp:20,wave:1};${seedBody}</script></body></html>`;
  const largerBody=Array.from({length:105},(_,i)=>`function recoveredSystem${i}(s){s.score=(s.score||0)+1;s.wave=(s.wave||1)+${i%2};return s}`).join('');
  const larger=`<!doctype html><html><body><button id="start">Start</button><canvas></canvas><script>let state={score:0,hp:20,wave:1};${largerBody}addEventListener('pointerdown',()=>recoveredSystem1(state));</script></body></html>`;
  const fragment=`<section data-gameplay-system="progression"></section><script>(()=>{${Array.from({length:95},(_,i)=>`function extraProgress${i}(s){s.score+=1;s.wave+=1;s.gold=(s.gold||0)+${i%4};return s}`).join('')}function finish(){if(state.score>80)document.body.dataset.result='win';if(state.hp<=0)document.body.dataset.result='loss';localStorage.setItem('vibe2-whole-doc-recovery',JSON.stringify(state))}addEventListener('touchstart',finish,{passive:true});})();</script>`;
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'full-web-whole-expansion-seed'});
  workOrder.goal='FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed=true;
  write(path.join(cwd,'web-games/demo/index.html'),'<!doctype html><html><body>prototype</body></html>\n');
  write(path.join(cwd,'design/demo/2026-09-18/design-revised.json'),JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd,'design/demo/2026-09-18/cycle-status.json'),JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(seedFile,['VIBE2_FULL_FILE','PATH:index.html','SUMMARY:seed','---VIBE2_FILE_CONTENT---',seed,'---VIBE2_FILE_END---'].join('\n'));
  write(wholeDocFile,['VIBE2_WEB_EXPANSION','---VIBE2_EXPANSION_CONTENT---',larger,'---VIBE2_EXPANSION_END---'].join('\n'));
  write(fragmentFile,['VIBE2_WEB_EXPANSION','---VIBE2_EXPANSION_CONTENT---',fragment,'---VIBE2_EXPANSION_END---'].join('\n'));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[seedFile,wholeDocFile,fragmentFile]});
  assert.equal(result.generation.attempts,3);
  assert.equal(result.generation.fullWebExpansionDocumentSeedRecoveries,1);
  assert.equal(result.codingMethod.fullWebExpansionDocumentSeedRecoveries,1);
  assert.deepEqual(result.changedFiles,['index.html']);
  const output=fs.readFileSync(path.join(cwd,'.vibe2/candidates/full-web-whole-expansion-seed/files/index.html'),'utf8');
  assert.ok(Buffer.byteLength(output,'utf8')>=12000);
  assert.match(output,/recoveredSystem104/);
  assert.match(output,/extraProgress94/);
});

test('full web expansion that redefines html body is classified and retried from the accumulated seed', async()=>{
  const cwd=tempRoot();
  const seedFile=path.join(cwd,'seed-invalid-expansion.txt');
  const invalidFile=path.join(cwd,'invalid-expansion.txt');
  const realFile=path.join(cwd,'real-expansion.txt');
  const finalFile=path.join(cwd,'final-invalid-expansion.txt');
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'full-web-invalid-expansion-retry'});
  workOrder.goal='FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed=true;
  write(path.join(cwd,'web-games/demo/index.html'),'<!doctype html><html><body>prototype</body></html>\n');
  write(path.join(cwd,'design/demo/2026-09-18/design-revised.json'),JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd,'design/demo/2026-09-18/cycle-status.json'),JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  const seed='<!doctype html><html><body><button id="play">Play</button><script>let state={score:0,hp:20,wave:1};</script></body></html>';
  const invalid='<html><body><section>wrong whole document shape</section></body></html>';
  const real=`<section data-gameplay-system="progression"></section><script>(()=>{${Array.from({length:55},(_,i)=>`function p${i}(){state.score+=${(i%5)+1};state.wave+=state.score%2;return state.score}`).join('')}window.addEventListener('pointerdown',()=>p1());})();</script>`;
  const finalBody=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}canvas{touch-action:none;width:100%}</style></head><body><button id="play">Play</button><canvas id="game"></canvas><script>let state={score:0,hp:100,wave:1,gold:0,result:"playing"};${'function step(){state.score+=1;state.gold+=1;if(state.score>400)state.result="win";if(state.hp<=0)state.result="loss";}'.repeat(230)}function reset(){state={score:0,hp:100,wave:1,gold:0,result:"playing"}}addEventListener("pointerdown",step);addEventListener("touchstart",step,{passive:true});localStorage.setItem("vibe2-invalid-expansion",JSON.stringify(state));</script></body></html>`;
  write(seedFile,['VIBE2_FULL_FILE','PATH:index.html','---VIBE2_FILE_CONTENT---',seed,'---VIBE2_FILE_END---'].join('\n'));
  write(invalidFile,['VIBE2_WEB_EXPANSION','---VIBE2_EXPANSION_CONTENT---',invalid,'---VIBE2_EXPANSION_END---'].join('\n'));
  write(realFile,['VIBE2_WEB_EXPANSION','---VIBE2_EXPANSION_CONTENT---',real,'---VIBE2_EXPANSION_END---'].join('\n'));
  write(finalFile,['VIBE2_FULL_FILE','PATH:index.html','---VIBE2_FILE_CONTENT---',finalBody,'---VIBE2_FILE_END---'].join('\n'));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[seedFile,invalidFile,realFile,finalFile]});
  assert.equal(result.generation.attempts,4);
  assert.equal(result.generation.fullWebExpansionStages,1);
  assert.deepEqual(result.changedFiles,['index.html']);
  assert.equal(generationFailureClass(new Error('Web expansion은 html/body 전체 구조를 재정의할 수 없음')),'MALFORMED_OUTPUT');
  assert.equal(shouldRetryGenerationError(new Error('Web expansion은 html/body 전체 구조를 재정의할 수 없음')),true);
});

test('full web initial generation asks for a complete bounded seed before staged expansion',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(workerSource,/FULL_WEB_INITIAL_SEED_TARGET_MIN_BYTES=4200/);
  assert.match(workerSource,/FULL_WEB_INITIAL_SEED_TARGET_MAX_BYTES=6500/);
  assert.match(workerSource,/const FULL_WEB_TIMEOUT_MS=360000/);
  assert.match(workerSource,/const FULL_WEB_EXPANSION_TIMEOUT_MS=240000/);
  assert.match(workerSource,/const FULL_WEB_FINAL_RETRY_TIMEOUT_MS=300000/);
  assert.match(workerSource,/const FULL_WEB_MAX_PREDICT=4096/);
  assert.match(workerSource,/INITIAL SEED STRATEGY: on this first response, prioritize a COMPLETE CLOSED playable seed/);
  assert.match(workerSource,/final acceptance still requires at least \$\{fullWebTarget\.minBytes\} bytes/);
});

test('full web expansion context keeps only execution-critical prefix fields',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(workerSource,/const line=\(label\)=>promptText\.split\('\\n'\)\.find\(row=>row\.startsWith\(label\)\)\|\|''/);
  assert.match(workerSource,/line\('Engine:'\)/);
  assert.match(workerSource,/line\('Goal:'\)/);
  assert.match(workerSource,/line\('Allowed edit paths:'\)/);
  assert.match(workerSource,/line\('Full Web generation target after automatic expansion:'\)\|\|line\('Full Web generation target:'\)/);
  assert.doesNotMatch(workerSource,/const prefix=String\(basePrompt\?\?''\)\.split\('\\n=== FILE '\)\[0\]\.trimEnd\(\)/);
});

test('full web expansion prompt does not contain copyable placeholder implementation and counts only remaining expansion attempts',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(workerSource,/<section class="game-specific-system">\.\.\.<\/section>/);
  assert.doesNotMatch(workerSource,/\/\* real additive gameplay implementation \*\//);
  assert.match(workerSource,/const remainingStages=Math\.max\(1,maxAttempts-attempt\);/);
  assert.match(workerSource,/growth<800/);
});

test('final full web attempt keeps additive expansion until the accumulated candidate reaches validator scale', async () => {
  const cwd=tempRoot();
  const seedFile=path.join(cwd,'seed-final.txt');
  const expansion1=path.join(cwd,'expansion-final-1.txt');
  const expansion2=path.join(cwd,'expansion-final-2.txt');
  const finalFile=path.join(cwd,'final-expansion.txt');
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'full-web-final-synthesis'});
  workOrder.goal='FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed=true;
  write(path.join(cwd,'web-games/demo/index.html'),'<!doctype html><html><body>prototype</body></html>\n');
  write(path.join(cwd,'design/demo/2026-09-18/design-revised.json'),JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd,'design/demo/2026-09-18/cycle-status.json'),JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  const seed='<!doctype html><html><body><main id="game"><button id="start">Start</button><canvas></canvas></main><script>let state={score:0,hp:10,wave:1};function tick(){state.score+=1}</script></body></html>';
  const fragment1=`<section data-gameplay-system="combat"></section><script>(()=>{${Array.from({length:35},(_,i)=>`function combat${i}(s){s.score+=${(i%3)+1};s.hp=Math.max(0,s.hp-1);return s}`).join('')}window.addEventListener("pointerdown",()=>{combat1(state)});})();</script>`;
  const fragment2=`<section data-gameplay-system="progression"></section><script>(()=>{${Array.from({length:35},(_,i)=>`function progress${i}(s){s.wave+=1;s.gold=(s.gold||0)+${i%5};return s}`).join('')}window.addEventListener("touchstart",()=>{progress1(state);localStorage.setItem("vibe2-final-test",JSON.stringify(state))},{passive:true});})();</script>`;
  const finalFragment=`<section data-gameplay-system="result-save-mobile"></section><script>(()=>{${Array.from({length:120},(_,i)=>`function finalStage${i}(s){s.score+=${(i%7)+1};s.gold=(s.gold||0)+1;if(s.score>500)s.result="win";if(s.hp<=0)s.result="loss";return s}`).join('')}function resetFinal(){state.score=0;state.hp=100;state.wave=1;state.gold=0;state.result="playing";localStorage.setItem("vibe2-final-test",JSON.stringify(state))}window.addEventListener("keydown",e=>{if(e.key==="r")resetFinal()});})();</script>`;
  write(seedFile,['VIBE2_FULL_FILE','PATH:index.html','SUMMARY:seed','---VIBE2_FILE_CONTENT---',seed,'---VIBE2_FILE_END---'].join('\n'));
  write(expansion1,['VIBE2_WEB_EXPANSION','---VIBE2_EXPANSION_CONTENT---',fragment1,'---VIBE2_EXPANSION_END---'].join('\n'));
  write(expansion2,['VIBE2_WEB_EXPANSION','---VIBE2_EXPANSION_CONTENT---',fragment2,'---VIBE2_EXPANSION_END---'].join('\n'));
  write(finalFile,['VIBE2_WEB_EXPANSION','---VIBE2_EXPANSION_CONTENT---',finalFragment,'---VIBE2_EXPANSION_END---'].join('\n'));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[seedFile,expansion1,expansion2,finalFile]});
  assert.equal(result.generation.attempts,4);
  assert.equal(result.generation.fullWebExpansionStages,3);
  assert.equal(result.generation.fullWebFinalAdditiveExpansion,true);
  assert.equal(result.codingMethod.fullWebFinalAdditiveExpansion,true);
  assert.equal(result.generation.completionMode,'FULL_WEB_EXPANSION');
  assert.equal(result.generation.maxPredict,4096);
  assert.equal(result.generation.timeoutMs,240000);
  assert.deepEqual(result.changedFiles,['index.html']);
  const output=fs.readFileSync(path.join(cwd,'.vibe2/candidates/full-web-final-synthesis/files/index.html'),'utf8');
  assert.ok(Buffer.byteLength(output,'utf8')>=12000);
});

test('timeout partial JSON recovers only a complete edit object',()=>{
  const complete='{"summary":"repair","edits":[{"path":"index.html","find":">Play<","replace":">Continue<"}],"tests":["unfinished"';
  const recovered=recoverPartialJsonEdit(complete);
  assert.deepEqual(recovered.edits,[{path:'index.html',find:'>Play<',replace:'>Continue<'}]);
  assert.deepEqual(recovered.newFiles,[]);
  assert.deepEqual(recovered.replaceFiles,[]);

  const truncated='{"edits":[{"path":"index.html","find":">Play<","replace":">Cont';
  assert.equal(recoverPartialJsonEdit(truncated),null);

  const noEdits='{"summary":"still thinking","tests":[';
  assert.equal(recoverPartialJsonEdit(noEdits),null);
});

test('timeout partial recovery stays behind existing exact-match and semantic validation',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(workerSource,/recoverPartialJsonEdit\(partialRecoveryOutput,\{reason:partialRecoveryClass==='MALFORMED_OUTPUT'\?'malformed':'timeout'\}\)/);
  assert.match(workerSource,/applyExactEdits\(sourceRoot,candidate\.edits,\{dryRun:true\}\)/);
  assert.match(workerSource,/candidateValidator==='function'\?candidateValidator\(candidate\):null/);
  assert.match(workerSource,/VIBE2_TIMEOUT_PARTIAL_EDIT_REJECTED/);
});

test('timeout partial recovery is persisted in coding method and immutable worker evidence',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  const workflowSource=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');
  assert.match(workerSource,/partialTimeoutRecovery:generation\.partialTimeoutRecovery===true/);
  assert.match(workflowSource,/baseCodingMethod\?\.partialTimeoutRecovery===true\?'coding-timeout-partial-recovery:YES'/);
});

test('focused retry derives exact unique find anchors from writable source',()=>{
  const base=[
    'You are the Vibe2 game source worker. Return JSON only.',
    'Engine: web',
    'Goal: repair play interaction',
    'Allowed edit paths: index.html',
    '',
    '=== FILE index.html [EDITABLE] ===',
    '<main id="game">',
    '  <button id="play">Play</button>',
    '  <canvas id="stage"></canvas>',
    '</main>',
    '<script>',
    'const playButton=document.getElementById("play");',
    'playButton.addEventListener("click",()=>startGame());',
    'function startGame(){ state.running=true; }',
    '</script>'
  ].join('\n');
  const anchors=exactRetryAnchorSuggestions(base,{max:3});
  assert.ok(anchors.length>=1);
  assert.ok(anchors.every(value=>base.includes(value)));
  assert.equal(new Set(anchors).size,anchors.length);
  const retry=buildGenerationRetryPrompt(base,{
    allowFullRewrite:false,
    error:new Error('edit find 불일치: index.html'),
    responsibleFiles:['index.html'],
    attempt:2
  });
  assert.match(retry,/EXACT FIND ANCHOR OPTIONS/);
  assert.match(retry,/ANCHOR_1:/);
  assert.match(retry,/Use exactly one EXACT FIND ANCHOR OPTION/i);
});

test('first edit-match failure fast-escalates attempt two to exact replace-only recovery',async()=>{
  const cwd=tempRoot();
  const bad=path.join(cwd,'edit-match-bad.json');
  const good=path.join(cwd,'edit-match-focused.json');
  write(path.join(cwd,'web-games/demo/index.html'),'<button id="play">Play</button>\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(order({
    target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'edit-match-fast-escalation'
  }),null,2));
  write(bad,JSON.stringify({edits:[{path:'index.html',find:'<button id="missing">Play</button>',replace:'<button id="missing">Continue</button>'}],newFiles:[],replaceFiles:[]}));
  write(good,JSON.stringify({replace:'<button id="play">Continue</button>'}));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[bad,good]});
  assert.equal(result.generation.attempts,2);
  assert.equal(result.generation.recoveryUsed,true);
  assert.equal(result.generation.focusedFinalRetry,true);
  assert.equal(result.generation.focusedReplaceOnly,true);
  assert.equal(result.generation.completionMode,'JSON_REPLACE_ONLY');
  assert.equal(result.generation.maxPredict,768);
  assert.equal(result.generation.timeoutMs,150000);
  assert.deepEqual(result.changedFiles,['index.html']);
});

test('full web progressive credit requires sustained real growth and keeps 12KB gate',()=>{
  assert.equal(fullWebProgressCreditEligible({accumulatedBytes:5915,minBytes:12000,growthBytes:[1736,1736,1736],repeatedOutputs:0,currentMax:4,attempt:4,fakeResponseCount:0}),true);
  assert.equal(fullWebProgressCreditEligible({accumulatedBytes:12000,minBytes:12000,growthBytes:[1736,1736],repeatedOutputs:0,currentMax:4,attempt:4,fakeResponseCount:0}),false);
  assert.equal(fullWebProgressCreditEligible({accumulatedBytes:5915,minBytes:12000,growthBytes:[900,1736],repeatedOutputs:0,currentMax:4,attempt:4,fakeResponseCount:0}),false);
  assert.equal(fullWebProgressCreditEligible({accumulatedBytes:5915,minBytes:12000,growthBytes:[1736,1736],repeatedOutputs:1,currentMax:4,attempt:4,fakeResponseCount:0}),false);
  assert.equal(fullWebProgressCreditEligible({accumulatedBytes:5915,minBytes:12000,growthBytes:[1736,1736],repeatedOutputs:0,currentMax:8,attempt:8,fakeResponseCount:0}),false);
});
test('focused replace-only pins exact path and anchor while model emits only replacement',()=>{
  const base=[
    'Goal: repair play interaction',
    'Allowed edit paths: index.html',
    '',
    '=== FILE index.html [EDITABLE] ===',
    'const playButton=document.getElementById("play");',
    'playButton.addEventListener("click",()=>startGame());',
    'function startGame(){ state.running=true; }'
  ].join('\n');
  const spec=focusedReplaceOnlySpec(base,{responsibleFiles:['index.html']});
  const alternate=focusedReplaceOnlySpec(base,{responsibleFiles:['index.html'],anchorIndex:1});
  assert.ok(spec);
  assert.ok(alternate);
  assert.equal(spec.path,'index.html');
  assert.equal(alternate.path,'index.html');
  assert.ok(base.includes(spec.find));
  assert.ok(base.includes(alternate.find));
  assert.notEqual(alternate.find,spec.find);
  const focused=buildFocusedReplaceOnlyPrompt(base,{error:new Error('timeout'),responsibleFiles:['index.html']});
  assert.ok(focused);
  assert.match(focused.prompt,/Do NOT return path or find/);
  assert.match(focused.prompt,/Return exactly one JSON object with exactly one key named "replace"/);
  const normalized=normalizeFocusedReplaceOnly(JSON.stringify({replace:'const playButton=document.getElementById("play") ?? document.body;'}),focused.spec);
  assert.equal(normalized.edits.length,1);
  assert.equal(normalized.edits[0].path,'index.html');
  assert.equal(normalized.edits[0].find,focused.spec.find);
  assert.notEqual(normalized.edits[0].replace,focused.spec.find);
});

test('focused replace-only prioritizes primary target symbols in compressed Web source',()=>{
  const cwd=tempRoot();
  const sourceRoot=path.join(cwd,'web-games/demo');
  const source='<!doctype html><script>const CONFIG={mode:"defense"}; function helper(){return 1} function actDefense(i){if(i===0){state.towers++;}else{state.power++;}} const footer=1;</script>';
  write(path.join(sourceRoot,'index.html'),source);
  const prompt=['Goal: repair tower placement input','Allowed edit paths: index.html','','=== FILE index.html [EDITABLE] ===',source].join('\n');
  const spec=focusedReplaceOnlySpec(prompt,{responsibleFiles:['index.html'],sourceRoot,preferredTargets:['actDefense']});
  assert.ok(spec);
  assert.equal(spec.path,'index.html');
  assert.match(spec.find,/^function actDefense\(i\)\{$/);
  const focused=buildFocusedReplaceOnlyPrompt(prompt,{responsibleFiles:['index.html'],sourceRoot,preferredTargets:['actDefense']});
  assert.equal(focused.spec.find,spec.find);
  assert.match(focused.prompt,/tower placement input/);
});

test('focused replace-only selects a concrete anchor across multiple responsible files',()=>{
  const cwd=tempRoot();
  const sourceRoot=path.join(cwd,'system-root');
  write(path.join(sourceRoot,'tools/system.mjs'),[
    'export function inspectSignal(signal){',
    '  return signal === "repeat" ? "repair" : "healthy";',
    '}'
  ].join('\n'));
  write(path.join(sourceRoot,'qa/system.test.mjs'),[
    'const expectedState = "repair";',
    'assert.equal(inspectSignal("repeat"), expectedState);'
  ].join('\n'));
  const prompt=[
    'Goal: repair repeated system routing without changing authority',
    'Allowed edit paths: tools/system.mjs, qa/system.test.mjs',
    '',
    '=== FILE tools/system.mjs [EDITABLE] ===',
    'export function inspectSignal(signal){',
    '  return signal === "repeat" ? "repair" : "healthy";',
    '}',
    '',
    '=== FILE qa/system.test.mjs [EDITABLE] ===',
    'const expectedState = "repair";',
    'assert.equal(inspectSignal("repeat"), expectedState);'
  ].join('\n');
  const focused=buildFocusedReplaceOnlyPrompt(prompt,{
    error:new Error('Ollama 응답 시간 초과: 240000ms'),
    responsibleFiles:['tools/system.mjs','qa/system.test.mjs'],
    sourceRoot
  });
  assert.ok(focused);
  assert.ok(['tools/system.mjs','qa/system.test.mjs'].includes(focused.spec.path));
  assert.ok(fs.readFileSync(path.join(sourceRoot,focused.spec.path),'utf8').includes(focused.spec.find));
  assert.match(focused.prompt,/Do NOT return path or find/);
  assert.doesNotMatch(focused.prompt,/EXACT_ALLOWED_PATH|EXACT_UNIQUE_SOURCE_TEXT|MINIMAL_REAL_REPLACEMENT/);
});

test('minified focused repair can pin a worker-owned GAME_CONFIG anchor',()=>{
  const cwd=tempRoot();
  const sourceRoot=path.join(cwd,'web-games/demo');
  const source='<!doctype html><html><body><script>window.GAME_CONFIG={id:"demo",mode:"repair",hp:100,gameplayMechanics:["pointer-input","restart"]}</script><script src="/web-games/_shared/vibe2-final.js"></script></body></html>';
  write(path.join(sourceRoot,'index.html'),source);
  const prompt=['Allowed edit paths: index.html','','=== FILE index.html [EDITABLE] ===',source].join('\n');
  const anchors=exactRetryAnchorSuggestions(prompt,{max:3,sourceRoot,responsibleFiles:['index.html']});
  assert.ok(anchors.some(value=>value.includes('window.GAME_CONFIG')));
  assert.ok(anchors.every(value=>source.includes(value)));
});

test('focused Web repair keeps target selection on the first attempt before causal replace-only recovery',async()=>{
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'focused-first.json');
  const workOrder=order({
    target:'web',
    root:'web-games/demo',
    responsibleFiles:['web-games/demo/index.html'],
    taskId:'focused-first-attempt'
  });
  workOrder.goal='[WEB_REPAIR] repair the existing play control without changing gameplay balance';
  write(path.join(cwd,'web-games/demo/index.html'),'<button id="play">Play</button>\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(responseFile,JSON.stringify({edits:[{path:'index.html',find:'>Play<',replace:'>Continue<'}],newFiles:[],replaceFiles:[]}));
  const result=await runVibe2SourceWorker({cwd,responseFile});
  assert.equal(result.generation.attempts,1);
  assert.equal(result.generation.focusedReplaceOnly,false);
  assert.equal(result.generation.focusedFirstAttemptFastPath,false);
  assert.equal(result.generation.completionMode,'JSON_EDIT_PARTIAL');
  assert.equal(result.generation.focusedFirstEditEarlyStop,true);
  assert.equal(result.generation.partialTimeoutRecovery,false);
  assert.equal(result.generation.maxPredict,1024);
  assert.equal(result.codingMethod.focusedFirstAttemptFastPath,false);
  assert.equal(result.codingMethod.focusedFirstEditEarlyStop,true);
  assert.match(fs.readFileSync(path.join(cwd,'.vibe2/candidates/focused-first-attempt/files/index.html'),'utf8'),/Continue/);
});

test('focused replace string recovery is exported to immutable worker telemetry',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  const workflowSource=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');
  assert.match(workerSource,/focusedReplaceStringRecovery:generation\.focusedReplaceStringRecovery===true/);
  assert.match(workflowSource,/coding-focused-replace-string-recovery:YES/);
});

test('focused first-attempt fast path is exported to immutable worker telemetry',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  const workflowSource=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');
  assert.match(workerSource,/focusedFirstAttemptFastPath:generation\.focusedFirstAttemptFastPath===true/);
  assert.match(workflowSource,/coding-focused-replace-only:YES/);
  assert.match(workflowSource,/coding-focused-first-attempt-fast-path:YES/);
});

test('focused Web repair accepts the first complete edit boundary without marking a timeout recovery',async()=>{
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'focused-first-edit.json');
  const workOrder=order({
    target:'web',
    root:'web-games/demo',
    responsibleFiles:['web-games/demo/index.html'],
    taskId:'focused-first-edit-boundary'
  });
  workOrder.goal='[WEB_REPAIR] repair the existing play control without changing gameplay balance';
  write(path.join(cwd,'web-games/demo/index.html'),'<button id="play">Play</button>\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(responseFile,'{"edits":[{"path":"index.html","find":">Play<","replace":">Continue<"}]');
  const result=await runVibe2SourceWorker({cwd,responseFile});
  assert.equal(result.generation.attempts,1);
  assert.equal(result.generation.completionMode,'JSON_EDIT_PARTIAL');
  assert.equal(result.generation.focusedFirstEditEarlyStop,true);
  assert.equal(result.generation.partialTimeoutRecovery,false);
  assert.equal(result.codingMethod.focusedFirstEditEarlyStop,true);
  assert.match(fs.readFileSync(path.join(cwd,'.vibe2/candidates/focused-first-edit-boundary/files/index.html'),'utf8'),/Continue/);
});

test('focused first-edit stream contract is persisted to immutable worker telemetry',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  const workflowSource=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');
  assert.match(workerSource,/focusedFirstEditEarlyStop:generation\.focusedFirstEditEarlyStop===true/);
  assert.match(workflowSource,/coding-focused-first-edit-early-stop:YES/);
});

test('focused no-op retry keeps speculative base budget but grants only targeted credit in worker loop',()=>{
  assert.equal(generationAttemptBudget({allowFullRewrite:false,variant:'speculative-1'}),2);
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(workerSource,/VIBE2_FOCUSED_REPLACE_NOOP_CREDIT/);
  assert.match(workerSource,/focusedReplaceAnchorCursor\+=1/);
  assert.match(workerSource,/focusedReplaceNoOpCreditUsed=true/);
});
test('focused replace recovery salvages a complete replace string from an unfinished outer JSON object',()=>{
  const spec={path:'index.html',find:'<button id="play">Play</button>'};
  const raw='{"replace":"<button id=\\\"play\\\">Continue</button>"\n';
  const recovered=recoverFocusedReplaceOnly(raw,spec);
  assert.ok(recovered);
  assert.equal(recovered.edits[0].path,'index.html');
  assert.equal(recovered.edits[0].find,spec.find);
  assert.equal(recovered.edits[0].replace,'<button id="play">Continue</button>');
  assert.equal(recoverFocusedReplaceOnly('{"replace":"<button id=\\\"play\\\">Cont',spec),null);
  assert.equal(recoverFocusedReplaceOnly('{"replace":"COMPLETE_REPLACEMENT_SOURCE_SNIPPET"',spec),null);
  assert.equal(recoverFocusedReplaceOnly(JSON.stringify({replace:spec.find}).slice(0,-1),spec),null);
});

test('focused Web repair recovers malformed focused replacement when the replace string is complete',async()=>{
  const cwd=tempRoot();
  const malformed=path.join(cwd,'malformed-first.txt');
  const focusedMalformed=path.join(cwd,'focused-malformed.txt');
  const workOrder=order({
    target:'web',
    root:'web-games/demo',
    responsibleFiles:['web-games/demo/index.html'],
    taskId:'focused-string-recovery'
  });
  workOrder.goal='[WEB_REPAIR] 기존 플레이 버튼 동작을 직접 보강';
  write(path.join(cwd,'web-games/demo/index.html'),'<!doctype html><html><body>\n<button id="play">Play</button>\n</body></html>\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(malformed,'not-json');
  write(focusedMalformed,'{"replace":"<button id=\\\"play\\\">Continue</button>"\n');
  const result=await runVibe2SourceWorker({cwd,responseFiles:[malformed,focusedMalformed]});
  assert.equal(result.generation.attempts,2);
  assert.equal(result.generation.recoveryUsed,true);
  assert.equal(result.generation.focusedReplaceOnly,true);
  assert.equal(result.generation.focusedReplaceStringRecovery,true);
  assert.equal(result.codingMethod.focusedReplaceStringRecovery,true);
  assert.deepEqual(result.changedFiles,['index.html']);
  assert.match(fs.readFileSync(path.join(cwd,'.vibe2/candidates/focused-string-recovery/files/index.html'),'utf8'),/Continue/);
});

test('focused replace-only rejects unchanged replacement and supports early completion',()=>{
  const spec={path:'index.html',find:'const state={running:false};'};
  assert.throws(()=>normalizeFocusedReplaceOnly(JSON.stringify({replace:spec.find}),spec),/변경 없는 edit/);
  assert.throws(()=>normalizeFocusedReplaceOnly(JSON.stringify({replace:'COMPLETE_REPLACEMENT_SOURCE_SNIPPET'}),spec),/placeholder 금지/);
  const focused=buildFocusedReplaceOnlyPrompt([
    'Goal: repair play state',
    'Allowed edit paths: index.html',
    '=== FILE index.html [EDITABLE] ===',
    spec.find
  ].join('\n'),{responsibleFiles:['index.html']});
  assert.ok(focused);
  assert.doesNotMatch(focused.prompt,/COMPLETE_REPLACEMENT_SOURCE_SNIPPET/);
  assert.match(focused.prompt,/exactly one key named "replace"/);
  assert.equal(modelResponseComplete(JSON.stringify({replace:'const state={running:true};'}),'JSON_REPLACE_ONLY'),true);
  assert.equal(modelResponseComplete('{"replace":','JSON_REPLACE_ONLY'),false);
});
test('exact retry anchors verify uniqueness against the full responsible source',()=>{
  const cwd=tempRoot();
  const sourceRoot=path.join(cwd,'web-games/demo');
  write(path.join(sourceRoot,'index.html'),[
    '<main>',
    'const duplicateAnchor=()=>state.ready;',
    '<section>middle</section>',
    'const duplicateAnchor=()=>state.ready;',
    'const trulyUniqueAnchor=()=>state.running;',
    '</main>'
  ].join('\n'));
  const prompt=[
    'Allowed edit paths: index.html',
    '',
    '=== FILE index.html [EDITABLE] ===',
    'const duplicateAnchor=()=>state.ready;',
    'const trulyUniqueAnchor=()=>state.running;'
  ].join('\n');
  const anchors=exactRetryAnchorSuggestions(prompt,{max:3,sourceRoot,responsibleFiles:['index.html']});
  assert.equal(anchors.includes('const duplicateAnchor=()=>state.ready;'),false);
  assert.equal(anchors.includes('const trulyUniqueAnchor=()=>state.running;'),true);
  const retry=buildGenerationRetryPrompt(prompt,{
    allowFullRewrite:false,
    error:new Error('edit find 불일치: index.html'),
    responsibleFiles:['index.html'],
    attempt:2,
    sourceRoot
  });
  assert.doesNotMatch(retry,/ANCHOR_\d+:.*duplicateAnchor/);
  assert.match(retry,/trulyUniqueAnchor/);
});

test('exact retry anchors exclude repeated and structural-only lines',()=>{
  const base=[
    'Allowed edit paths: index.html',
    '',
    '=== FILE index.html [EDITABLE] ===',
    '<div>',
    'same();',
    'same();',
    '</div>',
    'const uniqueHandler=()=>{ state.ready=true; };'
  ].join('\n');
  const anchors=exactRetryAnchorSuggestions(base,{max:3});
  assert.equal(anchors.includes('same();'),false);
  assert.equal(anchors.includes('const uniqueHandler=()=>{ state.ready=true; };'),true);
});

test('focused retry prompt never references focusedFinal before it is initialized',()=>{
  const base=[
    'You are the Vibe2 game source worker. Return JSON only.',
    'Engine: web',
    'Goal: repair runtime interaction',
    'Allowed edit paths: index.html',
    '',
    '=== FILE index.html [EDITABLE] ===',
    '<button id="play">Play</button>'
  ].join('\n');
  assert.doesNotThrow(()=>buildGenerationRetryPrompt(base,{
    allowFullRewrite:false,
    error:new Error('Ollama 응답 시간 초과: 240000ms'),
    responsibleFiles:['index.html'],
    attempt:2
  }));
  const retry=buildGenerationRetryPrompt(base,{
    allowFullRewrite:false,
    error:new Error('Ollama 응답 시간 초과: 240000ms'),
    responsibleFiles:['index.html'],
    attempt:2
  });
  assert.match(retry,/only top-level key is "edits"/);
  assert.doesNotMatch(retry,/EXACT_ALLOWED_PATH|EXACT_UNIQUE_SOURCE_TEXT|MINIMAL_REAL_REPLACEMENT/);
});

test('first timeout escalates attempt two directly to compact focused retry',()=>{
  const base=[
    'Allowed edit paths: index.html',
    '',
    '=== FILE index.html [EDITABLE] ===',
    '<button id="play">Play</button>',
    '',
    '=== FILE config.js [READ-ONLY IMPACT CONTEXT] ===',
    'window.CONFIG={x:1};'
  ].join('\n');
  const retry=buildGenerationRetryPrompt(base,{allowFullRewrite:false,error:new Error('Ollama 응답 시간 초과: 240000ms'),responsibleFiles:['index.html'],attempt:2});
  assert.match(retry,/exceeded the time budget/);
  assert.match(retry,/FINAL FOCUSED RETRY/);
  assert.doesNotMatch(retry,/config\.js/);
  assert.match(retry,/Recovery context intentionally contains only writable FILE blocks/);
  assert.match(retry,/Start immediately with the JSON object/);
  assert.doesNotMatch(retry,/EXACT_ALLOWED_PATH|EXACT_UNIQUE_SOURCE_TEXT|MINIMAL_REAL_REPLACEMENT/);
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(workerSource,/timeoutFastEscalation=!allowFullRewrite&&attempt>=2&&priorFailureClass==='TIMEOUT'/);
  assert.match(workerSource,/focusedFinal\?JSON_FINAL_RETRY_MAX_PREDICT/);
  assert.match(workerSource,/focusedFinal\?JSON_FINAL_RETRY_TIMEOUT_MS/);
});

test('focused minimal JSON retry is persisted to immutable worker evidence',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  const workflowSource=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');
  assert.match(workerSource,/focusedMinimalJsonContract:generation\.focusedFinalRetry===true&&!allowFullRewrite/);
  assert.match(workflowSource,/coding-focused-minimal-json:YES/);
  assert.match(workflowSource,/coding-focused-final-retry:YES/);
});

test('timeout retry drops oversized guidance prefix and keeps only execution-critical context',()=>{
  const base=[
    'You are the Vibe2 game source worker. Return JSON only.',
    'Engine: web',
    'Goal: repair the play button',
    'VERIFIED_MEMORY_BLOB:'+ 'x'.repeat(20000),
    'Allowed edit paths: index.html',
    '',
    '=== FILE index.html [EDITABLE] ===',
    '<button id="play">Play</button>',
    '',
    '=== FILE config.js [READ-ONLY IMPACT CONTEXT] ===',
    'window.CONFIG={x:1};'
  ].join('\n');
  const retry=buildGenerationRetryPrompt(base,{allowFullRewrite:false,error:new Error('Ollama 응답 시간 초과: 240000ms'),responsibleFiles:['index.html'],attempt:2});
  assert.match(retry,/Engine: web/);
  assert.match(retry,/Goal: repair the play button/);
  assert.match(retry,/Allowed edit paths: index\.html/);
  assert.match(retry,/=== FILE index\.html \[EDITABLE\] ===/);
  assert.doesNotMatch(retry,/VERIFIED_MEMORY_BLOB/);
  assert.doesNotMatch(retry,/config\.js/);
  assert.ok(Buffer.byteLength(retry,'utf8')<9000);
});

test('timeout final retry prompt strips read-only context and asks for one compact real edit',()=>{
  const base=[
    'Allowed edit paths: index.html',
    '',
    '=== FILE index.html [EDITABLE] ===',
    '<button id="play">Play</button>',
    '',
    '=== FILE config.js [READ-ONLY IMPACT CONTEXT] ===',
    'window.CONFIG={x:1};'
  ].join('\n');
  const retry=buildGenerationRetryPrompt(base,{allowFullRewrite:false,error:new Error('Ollama 응답 시간 초과: 240000ms'),responsibleFiles:['index.html'],attempt:3});
  assert.match(retry,/exceeded the time budget/);
  assert.match(retry,/FINAL FOCUSED RETRY/);
  assert.doesNotMatch(retry,/config\.js/);
  assert.match(retry,/output one JSON object with only the "edits" key/);
  assert.doesNotMatch(retry,/EXACT_ALLOWED_PATH|EXACT_UNIQUE_SOURCE_TEXT|MINIMAL_REAL_REPLACEMENT/);
});

test('generation recovery remains bounded and keeps strict output contracts', () => {
  assert.equal(shouldRetryGenerationError(new Error('Ollama 응답 시간 초과: 540000ms')), true);
  assert.equal(shouldRetryGenerationError(new Error('모델 JSON 파싱 실패')), true);
  assert.equal(shouldRetryGenerationError(new Error('unsupported target')), false);
  const full = buildGenerationRetryPrompt('base', { allowFullRewrite:true, error:new Error('전체 교체 파일 크기 오류: index.html') });
  assert.match(full, /MUST begin with VIBE2_FULL_FILE/);
  assert.match(full, /MUST end with ---VIBE2_FILE_END---/);
  assert.match(full, /12000-24000 UTF-8 bytes/);
  assert.match(full, /hard safety range remains 1800-260000 UTF-8 bytes/);
  assert.match(full, /MUST reach at least 12000 bytes/);
  assert.match(full, /substantial executable JavaScript/);
  const raised = buildGenerationRetryPrompt('Full Web generation target: 18000-36000 UTF-8 bytes.', { allowFullRewrite:true, error:new Error('전체 교체 파일 크기 오류: index.html') });
  assert.match(raised, /MUST reach at least 18000 bytes/);
  assert.match(raised, /at or below 36000 bytes/);
  const json = buildGenerationRetryPrompt('base', { allowFullRewrite:false, error:new Error('JSON') });
  assert.match(json, /strict JSON object only/);
  assert.match(json, /No markdown/);
});

test('full web bounded fallback keeps largest partial telemetry in the coding method',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(workerSource,/bestFullWebFallbackRaw/);
  assert.match(workerSource,/fullWebFallbackBestPartialBytes:Number\(generation\.fullWebFallbackBestPartialBytes\|\|0\)/);
  assert.match(workerSource,/\['FULL_REWRITE_SIZE','TIMEOUT','MALFORMED_OUTPUT'\]\.includes\(generationFailureClass\(error\)\)/);
});

test('full web retry compacts oversized guidance and reuses the largest prior partial',()=>{
  const previous=[
    'VIBE2_FULL_FILE',
    'PATH:index.html',
    '---VIBE2_FILE_CONTENT---',
    '<!doctype html><html><body><script>'+ 'let score=0;'.repeat(650)
  ].join('\n');
  const base=[
    'You are the Vibe2 game source worker. Return exactly one raw VIBE2_FULL_FILE envelope. Do not return JSON.',
    'Engine: web',
    'Goal: FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축',
    'VERIFIED_MEMORY_BLOB:'+ 'x'.repeat(24000),
    'Allowed edit paths: index.html',
    'Full Web generation target: 12000-24000 UTF-8 bytes.',
    '',
    '=== FILE index.html [EDITABLE] ===',
    '<!doctype html><html><body>prototype</body></html>',
    '',
    '=== FILE config.js [READ-ONLY IMPACT CONTEXT] ===',
    'window.CONFIG={large:true};'
  ].join('\n');
  const retry=buildGenerationRetryPrompt(base,{allowFullRewrite:true,error:new Error('Ollama 응답 시간 초과: 360000ms'),responsibleFiles:['index.html'],attempt:2,previousOutput:previous});
  assert.match(retry,/Engine: web/);
  assert.match(retry,/Goal: FULL_WEB_GAME_REBUILD/);
  assert.match(retry,/Full Web generation target: 12000-24000 UTF-8 bytes/);
  assert.match(retry,/BEGIN_PREVIOUS_FULL_WEB_CANDIDATE/);
  assert.doesNotMatch(retry,/VERIFIED_MEMORY_BLOB/);
  assert.doesNotMatch(retry,/config\.js/);
  assert.ok(Buffer.byteLength(retry,'utf8')<20000);
});

test('full web expansion whole-document recovery is observable in coding telemetry',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(workerSource,/VIBE2_FULL_WEB_EXPANSION_DOCUMENT_SEED_RECOVERED/);
  assert.match(workerSource,/fullWebExpansionDocumentSeedRecoveries:Number\(generation\.fullWebExpansionDocumentSeedRecoveries\|\|0\)/);
});

test('full web retry prompt compaction is observable in source telemetry',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  const workflowSource=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');
  assert.match(workerSource,/VIBE2_FULL_WEB_RETRY_PROMPT_BYTES/);
  assert.match(workerSource,/fullWebRetryPromptCompacted:generation\.fullWebRetryPromptCompacted===true/);
  assert.match(workflowSource,/coding-full-web-retry-prompt-compacted:YES/);
});

test('full web recovery carries the previous undersized candidate forward for expansion', () => {
  const previous = [
    'VIBE2_FULL_FILE',
    'PATH:index.html',
    '---VIBE2_FILE_CONTENT---',
    '<!doctype html><html><body><canvas id="game"></canvas><script>let hp=10;</script></body></html>',
    '---VIBE2_FILE_END---'
  ].join('\n');
  const retry = buildGenerationRetryPrompt(
    'Full Web generation target: 12000-24000 UTF-8 bytes.',
    {
      allowFullRewrite:true,
      error:new Error('전체 교체 파일 크기 오류: index.html:bytes=1262:min=12000:max=260000'),
      previousOutput:previous,
      attempt:2
    }
  );
  assert.match(retry,/previous full-Web candidate was \d+ UTF-8 bytes/i);
  assert.match(retry,/Expand this actual implementation instead of restarting as a smaller shell/);
  assert.match(retry,/---BEGIN_PREVIOUS_FULL_WEB_CANDIDATE---/);
  assert.match(retry,/<canvas id="game">/);
  assert.match(retry,/---END_PREVIOUS_FULL_WEB_CANDIDATE---/);
});

test('malformed JSON with one complete exact edit recovers without widening scope', async()=>{
  const cwd=tempRoot();
  const malformed=path.join(cwd,'malformed-partial.json');
  write(path.join(cwd,'web-games/demo/index.html'),'<button id="play">Play</button>\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(order({
    target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'malformed-partial-recovery'
  }),null,2));
  write(malformed,'{"summary":"repair","edits":[{"path":"index.html","find":">Play<","replace":">Continue<"}],"tests":["unfinished"');
  const result=await runVibe2SourceWorker({cwd,responseFile:malformed});
  assert.equal(result.generation.attempts,1);
  assert.equal(result.generation.recoveryUsed,true);
  assert.equal(result.codingMethod.partialMalformedRecovery,true);
  assert.equal(result.codingMethod.partialTimeoutRecovery,false);
  assert.deepEqual(result.changedFiles,['index.html']);
  const output=fs.readFileSync(path.join(cwd,'.vibe2/candidates/malformed-partial-recovery/files/index.html'),'utf8');
  assert.match(output,/>Continue</);
});

test('malformed partial recovery evidence is exported to immutable worker telemetry',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  const workflowSource=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');
  assert.match(workerSource,/partialMalformedRecovery:generation\.partialMalformedRecovery===true/);
  assert.match(workflowSource,/coding-malformed-partial-recovery:YES/);
});

test('timeout partial edit recovery accepts only one fully closed edit object',()=>{
  const complete='{"summary":"partial","edits":[{"path":"index.html","find":"const state={hp:10};","replace":"const state={hp:10,ready:true};"},{"path":"index.html","find":"unfinished"';
  const recovered=recoverPartialJsonEdit(complete);
  assert.ok(recovered);
  assert.equal(recovered.edits.length,1);
  assert.equal(recovered.edits[0].path,'index.html');
  assert.equal(recovered.edits[0].find,'const state={hp:10};');
  assert.equal(recovered.edits[0].replace,'const state={hp:10,ready:true};');
  assert.deepEqual(recovered.newFiles,[]);
  assert.deepEqual(recovered.replaceFiles,[]);
});

test('timeout partial edit recovery handles braces and escapes inside JSON strings and rejects incomplete objects',()=>{
  const escaped='{"edits":[{"path":"index.html","find":"if (state.hp) { log(\\"x\\"); }","replace":"if (state.hp) { log(\\"{ok}\\"); state.ready=true; }"}],"newFiles":[';
  const recovered=recoverPartialJsonEdit(escaped);
  assert.ok(recovered);
  assert.equal(recovered.edits[0].replace,'if (state.hp) { log("{ok}"); state.ready=true; }');
  assert.equal(recoverPartialJsonEdit('{"edits":[{"path":"index.html","find":"a","replace":"b"'),null);
  assert.equal(recoverPartialJsonEdit('{"summary":"no edits yet"'),null);
});

test('focused timeout streaming can stop after one complete edit object',()=>{
  const partial='{"edits":[{"path":"index.html","find":">Play<","replace":">Continue<"}],"tests":["still generating"';
  assert.equal(modelResponseComplete(partial,'JSON_EDIT'),false);
  assert.equal(modelResponseComplete(partial,'JSON_EDIT_PARTIAL'),true);
  assert.equal(modelResponseComplete('{"edits":[{"path":"index.html","find":">Play<","replace":">Cont','JSON_EDIT_PARTIAL'),false);
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  const workflowSource=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');
  assert.match(workerSource,/timeoutFastEscalation\|\|focusedFirstEditEarlyStop/);
  assert.match(workerSource,/focusedFirstEditEarlyStop:Boolean\(streamedPartialEdit\)&&focusedFirstEditEarlyStop/);
  assert.match(workerSource,/streamedPartialEditRecovery:Boolean\(streamedPartialEdit\)/);
  assert.match(workflowSource,/coding-streamed-partial-edit-recovery:YES/);
});

test('final additive full web expansion is persisted to immutable worker evidence',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  const workflowSource=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');
  assert.match(workerSource,/fullWebFinalAdditiveExpansion:generation\.fullWebFinalAdditiveExpansion===true/);
  assert.match(workflowSource,/coding-full-web-final-additive-expansion:YES/);
});

test('closed full web envelope early stop is persisted to coding telemetry',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  const workflowSource=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');
  assert.match(workerSource,/fullWebClosedHtmlEarlyStop:generation\.fullWebClosedHtmlEarlyStop===true/);
  assert.match(workflowSource,/coding-full-web-closed-html-early-stop:YES/);
});

test('model response completion stops only at a complete candidate boundary', () => {
  assert.equal(modelResponseComplete('{"edits":[{"path":"index.html","find":"a","replace":"b"}],"newFiles":[]}', 'JSON_EDIT'), true);
  assert.equal(modelResponseComplete('{"edits":[{"path":"index.html"', 'JSON_EDIT'), false);
  assert.equal(modelResponseComplete('VIBE2_FULL_FILE\nPATH:index.html\n---VIBE2_FILE_CONTENT---\n<!doctype html><html><body>x</body></html>', 'FULL_WEB'), true);
  assert.equal(modelResponseComplete('VIBE2_FULL_FILE\nPATH:index.html\n---VIBE2_FILE_CONTENT---\n<!doctype html><html><body>x', 'FULL_WEB'), false);
  assert.equal(modelResponseComplete('VIBE2_FULL_FILE\nPATH:index.html\n---VIBE2_FILE_CONTENT---\n<!doctype html><html><body>x</body></html>\n---VIBE2_FILE_END---', 'FULL_WEB'), true);
  assert.equal(modelResponseComplete('<!doctype html><html><body>x</body></html>', 'FULL_WEB'), true);
  assert.equal(modelResponseComplete('VIBE2_WEB_EXPANSION\n---VIBE2_EXPANSION_CONTENT---\n<script>(()=>{})();</script>', 'FULL_WEB_EXPANSION'), false);
  assert.equal(modelResponseComplete('VIBE2_WEB_EXPANSION\n---VIBE2_EXPANSION_CONTENT---\n<script>(()=>{})();</script>\n---VIBE2_EXPANSION_END---', 'FULL_WEB_EXPANSION'), true);
});

test('second malformed JSON receives the bounded focused third retry', async () => {
  const cwd=tempRoot();
  const bad1=path.join(cwd,'bad1.json');
  const bad2=path.join(cwd,'bad2.json');
  const good=path.join(cwd,'good3.json');
  write(path.join(cwd,'web-games/demo/index.html'),'<button id="play">Play</button>\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'malformed-third-retry'}),null,2));
  write(bad1,'{"edits":[');
  write(bad2,'{"edits":[{"path":"index.html"');
  write(good,JSON.stringify({replace:'<button id="play">Continue</button>'}));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[bad1,bad2,good]});
  assert.equal(result.generation.attempts,3);
  assert.equal(result.generation.focusedFinalRetry,true);
  assert.equal(result.generation.focusedReplaceOnly,true);
  assert.equal(result.generation.temperature,0.26);
  assert.equal(result.generation.completionMode,'JSON_REPLACE_ONLY');
  assert.deepEqual(result.changedFiles,['index.html']);
});

test('Ollama transport uses streaming instead of one giant non-streaming response', () => {
  const workerSource = fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs', import.meta.url), 'utf8');
  assert.match(workerSource, /stream:true/);
  assert.doesNotMatch(workerSource, /stream:false/);
  assert.match(workerSource, /node:http/);
  assert.match(workerSource, /vibe2PartialOutput=output/);
  assert.match(workerSource, /error\?\.vibe2PartialOutput/);
  assert.match(workerSource, /\['FULL_REWRITE_SIZE','TIMEOUT','MALFORMED_OUTPUT'\]/);
});

test('Unreal C++ text source is allowed', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.json');
  write(path.join(cwd, 'unreal-games/demo/Source/Demo/Hero.cpp'), 'void Hero::Tick() { Value = Value + 0; }\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({ target: 'unreal', root: 'unreal-games/demo', responsibleFiles: ['unreal-games/demo/Source/Demo/Hero.cpp'], taskId: 'ue-cpp' }), null, 2));
  write(responseFile, JSON.stringify({ edits: [{ path: 'Source/Demo/Hero.cpp', find: 'Value = Value + 0;', replace: 'Value = Value;' }], newFiles: [] }));
  const result = await runVibe2SourceWorker({ cwd, responseFile });
  assert.equal(result.target, 'unreal');
});

test('Unreal uasset is rejected before model execution', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.json');
  write(path.join(cwd, 'unreal-games/demo/Content/Hero.uasset'), 'not-real-binary');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({ target: 'unreal', root: 'unreal-games/demo', responsibleFiles: ['unreal-games/demo/Content/Hero.uasset'], taskId: 'ue-binary' }), null, 2));
  write(responseFile, '{}');
  await assert.rejects(runVibe2SourceWorker({ cwd, responseFile }), /엔진 에디터 필요 바이너리 파일/);
});

test('source apply refuses non-candidate branch', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.json');
  write(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'class Player { int Speed() { return 1; } }\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({ responsibleFiles: ['unity-games/demo/Assets/Player.cs'] }), null, 2));
  write(responseFile, JSON.stringify({ edits: [{ path: 'Assets/Player.cs', find: 'return 1;', replace: 'return 2;' }], newFiles: [] }));
  await assert.rejects(runVibe2SourceWorker({ cwd, responseFile, applySource: true }), /vibe2\/candidate\/\* 브랜치에서만 허용/);
});

test('exact edit accepts only unique indentation and line-ending drift', () => {
  const cwd = tempRoot();
  const source = path.join(cwd, 'Player.cs');
  write(source, 'class Player {\r\n  int Speed() {\r\n    return 1;\r\n  }\r\n}\r\n');
  const changed = applyExactEdits(cwd, [{
    path: 'Player.cs',
    find: 'int Speed() {\n  return 1;\n}',
    replace: 'int Speed() {\n    return 2;\n}'
  }]);
  assert.deepEqual(changed, ['Player.cs']);
  assert.match(fs.readFileSync(source, 'utf8'), /return 2;/);
});

test('exact edit still rejects materially different source text', () => {
  const cwd = tempRoot();
  const source = path.join(cwd, 'Player.cs');
  write(source, 'class Player {\n  int Speed() {\n    return 1;\n  }\n}\n');
  assert.throws(() => applyExactEdits(cwd, [{
    path: 'Player.cs',
    find: 'int Speed() {\n  return 9;\n}',
    replace: 'int Speed() {\n    return 2;\n}'
  }]), /edit find 불일치/);
});


test('edit-match recovery immediately narrows to one exact writable snippet', () => {
  const base=[
    'Allowed edit paths: index.html',
    '',
    '=== FILE index.html [EDITABLE] ===',
    '<button id="play">Play</button>',
    '<div id="status">Ready</div>',
    '',
    '=== FILE config.js [READ-ONLY IMPACT CONTEXT] ===',
    'window.CONFIG={x:1};'
  ].join('\n');
  const retry=buildGenerationRetryPrompt(base,{
    allowFullRewrite:false,
    error:new Error('edit find 불일치: index.html'),
    responsibleFiles:['index.html'],
    attempt:2
  });
  assert.match(retry,/previous edits\[\]\.find text did not match the writable source/);
  assert.match(retry,/ONLY writable path is "index\.html"/);
  assert.match(retry,/EXACT FIND ANCHOR OPTIONS/);
  assert.match(retry,/Do not paraphrase, normalize, reconstruct, or guess source text/);
  assert.doesNotMatch(retry,/config\.js/);
  assert.match(retry,/do not bypass responsible-file boundaries/);
});

test('invalid edit path recovery requires an exact allowed path', () => {
  const error=new Error('텍스트 worker 허용 확장자 아님: exact allowed path');
  assert.equal(shouldRetryGenerationError(error),true);
  const prompt=buildGenerationRetryPrompt('Allowed edit paths: web-games/demo/index.html\n=== FILE web-games/demo/index.html ===\n<button>Play</button>',{error});
  assert.match(prompt,/invalid edit path/);
  assert.match(prompt,/copied exactly from Allowed edit paths/);
  assert.match(prompt,/Never output placeholders/);
});


test('token-repeat abort is retryable infrastructure output failure', () => {
  assert.equal(shouldRetryGenerationError(new Error('Ollama 오류: prediction aborted, token repeat limit reached')),true);
});


test('retry prompt keeps only editable context and pins the single responsible path', () => {
  const base=[
    'Allowed edit paths: index.html',
    '',
    '=== FILE index.html [EDITABLE] ===',
    '<main id="game">old</main>',
    '',
    '=== FILE scripts/config.js [READ-ONLY IMPACT CONTEXT] ===',
    'window.GAME_CONFIG={speed:1};'
  ].join('\n');
  const retry=buildGenerationRetryPrompt(base,{
    error:new Error('책임 파일 범위 밖 수정 금지: scripts/window.GAME_CONFIG.js'),
    responsibleFiles:['index.html']
  });
  assert.match(retry,/The ONLY writable path is "index\.html"/);
  assert.match(retry,/=== FILE index\.html \[EDITABLE\] ===/);
  assert.doesNotMatch(retry,/scripts\/config\.js/);
  assert.doesNotMatch(retry,/window\.GAME_CONFIG/);
});

test('single responsible file remaps literal allowed-path placeholder without widening scope', async () => {
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'model-placeholder.json');
  write(path.join(cwd,'web-games/demo/index.html'),'<!doctype html><html><body><main>old</main></body></html>\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(order({
    target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'literal-placeholder'
  }),null,2));
  write(responseFile,JSON.stringify({edits:[{path:'exact allowed path',find:'<main>old</main>',replace:'<main>new</main>'}],newFiles:[]}));
  const result=await runVibe2SourceWorker({cwd,responseFile});
  assert.deepEqual(result.changedFiles,['index.html']);
});


test('no-op edit gets one focused causal retry', () => {
  const error=new Error('변경 없는 edit: index.html');
  assert.equal(shouldRetryGenerationError(error),true);
  const base=[
    'Allowed edit paths: index.html',
    '',
    '=== FILE index.html [EDITABLE] ===',
    '<button id="play">Play</button>',
    '',
    '=== FILE scripts/config.js [READ-ONLY IMPACT CONTEXT] ===',
    'window.GAME_CONFIG={speed:1};'
  ].join('\n');
  const retry=buildGenerationRetryPrompt(base,{error,responsibleFiles:['index.html']});
  assert.match(retry,/previous edit copied the same text/);
  assert.match(retry,/The ONLY writable path is "index\.html"/);
  assert.match(retry,/replace is materially different from find/);
  assert.match(retry,/=== FILE index\.html \[EDITABLE\] ===/);
  assert.doesNotMatch(retry,/scripts\/config\.js/);
});


test('candidate manifest carries presentation quality contract without expanding authority', async()=>{
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'presentation.json');
  const workOrder=order({responsibleFiles:['unity-games/demo/Assets/Player.cs'],taskId:'presentation-contract'});
  workOrder.presentationQuality={
    required:true,
    version:1,
    pass:'LIVING_MOTION',
    preserve:['GAMEPLAY_BALANCE','SAVE_MEANING','HIT_SEMANTICS'],
    staticChecks:['idle-alive-motion','turn-smoothing'],
    runtimeChecks:['idle-walk-run-or-equivalent-runtime-continuity'],
    authorityExpanded:false
  };
  write(path.join(cwd,'unity-games/demo/Assets/Player.cs'),'class Player { float motionSmoothing = 0.1f; }\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(responseFile,JSON.stringify({edits:[{path:'Assets/Player.cs',find:'float motionSmoothing = 0.1f;',replace:'float motionSmoothing = 0.2f;'}],newFiles:[]}));
  const result=await runVibe2SourceWorker({cwd,responseFile});
  const persisted=JSON.parse(fs.readFileSync(path.join(cwd,'.vibe2/candidates/presentation-contract/manifest.json'),'utf8'));
  assert.equal(result.presentationQuality.required,true);
  assert.equal(result.presentationQuality.pass,'LIVING_MOTION');
  assert.equal(result.presentationQuality.authorityExpanded,false);
  assert.deepEqual(persisted.presentationQuality.preserve,workOrder.presentationQuality.preserve);
});


test('specialized verification requests are created only for game targets',()=>{
  const system=buildSpecializedVerificationRequest({
    target:'system',
    goal:'narrative world generation route graph story transition',
    responsibleFiles:['tools/vibe2-learning-motor.mjs']
  });
  assert.equal(system.required,false);
  assert.equal(system.gameTargetEligible,false);
  assert.equal(system.blockedReason,'NON_GAME_TARGET');
  assert.deepEqual([...system.requestedMarkers],[]);

  const web=buildSpecializedVerificationRequest({
    target:'web',
    goal:'narrative world generation route graph story transition',
    responsibleFiles:['web-games/demo/game.js']
  });
  assert.equal(web.required,true);
  assert.equal(web.gameTargetEligible,true);
  assert.ok(web.requestedMarkers.includes('VERIFIED_WORLD_ROUTE_NAVIGATION_PASS'));
  assert.ok(web.requestedMarkers.includes('VERIFIED_NARRATIVE_GAMEPLAY_CAUSALITY_PASS'));
});


test('game-specific BUILD_UP directive survives compact generation retries',()=>{
  const directiveBlock=[
    '[GAME SPECIFIC BUILD UP DIRECTIVE BEGIN]',
    'directiveId=bug-defense-build-up-g3-demo generation=3 primaryFocus=PRESENTATION',
    'gameIdentity=곤충 생태 상성과 서식지 배치가 핵심인 정원 방어',
    'primaryGoal=벌 돌진, 거미 속박, 사마귀 베기의 실루엣과 공격 리듬을 실제 플레이에서 구분한다.',
    'visual=CHARACTER=실루엣 강화 | ENEMY_CREATURE=종별 공격 전조 분리 | ANIMATION=anticipation impact recovery 연결',
    'platform=Roblox 네이티브 Luau와 3D presentation으로 동일 목표를 구현한다.',
    'acceptance=ACTUAL_RENDERED_CHANGE_REQUIRED | GAMEPLAY_STATE_DELTA_REQUIRED',
    '[GAME SPECIFIC BUILD UP DIRECTIVE END]'
  ].join('\n');
  const largeBody=Array.from({length:500},(_,i)=>`local line${i} = ${i}`).join('\n');
  const prompt=[
    'You are the Vibe2 game source worker. Return JSON only.',
    'Engine: roblox',
    'Goal: [STUDIO_QUALITY_EVOLUTION] build the current game-specific package',
    directiveBlock,
    'Allowed edit paths: client/Game.client.luau',
    '=== FILE client/Game.client.luau [EDITABLE] ===',
    largeBody
  ].join('\n');
  const retry=buildGenerationRetryPrompt(prompt,{
    allowFullRewrite:false,
    responsibleFiles:['client/Game.client.luau'],
    attempt:2,
    error:new Error('MODEL_TIMEOUT'),
    sourceRoot:''
  });
  assert.match(retry,/bug-defense-build-up-g3-demo/);
  assert.match(retry,/벌 돌진, 거미 속박, 사마귀 베기/);
  assert.match(retry,/ACTUAL_RENDERED_CHANGE_REQUIRED/);
});


test('game-specific BUILD_UP worker guidance carries source current-to-intended behavior and player effect',()=>{
  const source=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(source,/sourceAnchors=.*CURRENT=/);
  assert.match(source,/INTENDED=/);
  assert.match(source,/ACCEPT=/);
  assert.match(source,/expectedPlayerEffect=/);
  assert.match(source,/previousEffectiveness=/);
  assert.match(source,/nextVibeAction=/);
});
