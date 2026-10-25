// 파일명: qa/vibe2-code-pattern-ingest.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveVerifiedCodePatterns} from '../tools/vibe2-code-pattern-ingest.mjs';
import {buildVerifiedTrainingSample} from '../tools/vibe2-training-sample.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runInNewContext} from 'node:vm';
import {deterministicWebInputCandidate,deterministicRobloxNativeRepairCandidate} from '../tools/vibe2-source-worker.mjs';

test('verified sample yields abstract code patterns without raw patch',()=>{
  const rows=deriveVerifiedCodePatterns({
    taskType:'coding',gameId:'g1',sourceRevision:'a'.repeat(40),independentQa:'PASS',browserQa:'PASS',
    instruction:'Repair mobile input and save restore state regression',
    input:'{"sourcePath":"web-games/g1"}',
    output:'summary\n검증된 패치:\n+ localStorage.setItem("x","y")',
    verification:{fullRegression:'PASS',runtime:'PASS',proposedTests:['touch input','save restore']}
  },'sample.json');
  assert.ok(rows.length>=2);
  assert.ok(rows.every(x=>x.verified===true&&x.rawCodeStored===false));
  assert.ok(rows.every(x=>!String(x.pattern).includes('localStorage.setItem')));
});

test('unverified sample is rejected',()=>{
  assert.deepEqual(deriveVerifiedCodePatterns({taskType:'coding',sourceRevision:'a'.repeat(40),independentQa:'FAIL'}),[]);
});


test('verified Web and Roblox aesthetic repairs distill concrete source-bound patterns',()=>{
  for(const [input,engine] of [
    ['web-games/a: damage popup, tooltip placement, animated icon, nine slice','web'],
    ['roblox-games/a: 데미지 숫자와 아이콘 애니, 보스 체력바 시각 개선','roblox']
  ]){
    const rows=deriveVerifiedCodePatterns({
      taskType:'coding',sourceRevision:'b'.repeat(40),gameId:'a',
      independentQa:'PASS',browserQa:engine==='web'?'PASS':'NOT_APPLICABLE',
      instruction:input,verification:{fullRegression:'PASS',runtime:'PASS',proposedTests:['same scene runtime visual checks']}
    },'qa-record.json');
    assert.ok(rows.some(row=>row.implementationRecipe));
    assert.ok(rows.every(row=>row.verified===true&&row.rawCodeStored===false));
    assert.ok(rows.filter(row=>row.implementationRecipe).every(row=>row.implementationRecipe.proof.length));
    assert.ok(rows.some(row=>row.system==='DAMAGE_POPUP_POOL'));
  }
});

test('Roblox-native visual patterns require verified runtime in canonical training evidence',()=>{
  const base={
    taskType:'roblox',gameId:'rpg1',sourceRevision:'c'.repeat(40),
    independentQa:'PASS',browserQa:'NOT_APPLICABLE',
    instruction:'Roblox 보스 체력바와 데미지 숫자 표시',
    verification:{fullRegression:'PASS'}
  };
  assert.deepEqual(deriveVerifiedCodePatterns(base,'roblox.json'),[]);
  const verified=deriveVerifiedCodePatterns({...base,verification:{...base.verification,runtime:'PASS'}},'roblox.json');
  assert.ok(verified.some(x=>x.system==='BOSS_PHASE_PRESENTATION'));
  assert.ok(verified.some(x=>x.system==='DAMAGE_POPUP_POOL'));
  assert.ok(verified.every(x=>x.engine==='roblox'&&x.rawCodeStored===false));
});


test('verified gameplay action, motion contact and scene causality yield source-bound checks, not gameplay authority',()=>{
  const rows=deriveVerifiedCodePatterns({
    taskType:'coding',gameId:'forest',sourceRevision:'d'.repeat(40),
    independentQa:'PASS',browserQa:'PASS',
    instruction:'터치 공격 판정과 발 접지 문워크 수정, 장면 인과와 카메라 연출 판정 연결',
    verification:{fullRegression:'PASS',runtime:'PASS',replayEvidence:[
      ...['combat-input-to-resolution','direction-and-contact','scene-threat-escape'].map(scenarioId=>({
        scenarioId,horizon:scenarioId==='scene-threat-escape'?'NEXT_STAGE':'NEXT_STATE_TRANSITION',
        sourceRevision:'d'.repeat(40),actualPlatformRuntime:true,independentQaPass:true,
        expectedObservationMet:true,gameplaySemanticsPreserved:true
      }))
    ]}
  },'verified-web-causal.json');
  for(const system of ['INPUT_ACTION_CAUSAL_CHAIN','MOTION_CONTACT_SYNC','SCENE_CAUSALITY_CHAIN']){
    const recipe=rows.find(row=>row.system===system)?.implementationRecipe;
    assert.ok(recipe,system);
    assert.ok(recipe.source&&recipe.proof.length>=4,system);
    assert.ok(rows.find(row=>row.system===system)?.observedReplay?.actualPlatformRuntime,system);
  }
  assert.ok(rows.every(row=>row.engine==='web'&&row.rawCodeStored===false));
});

test('Unity and Roblox patterns cannot use browser or independent QA as native runtime proof',()=>{
  for(const engine of ['unity','roblox']){
    const sample={
      taskType:engine,gameId:'hero',sourceRevision:'e'.repeat(40),independentQa:'PASS',
      browserQa:'PASS',instruction:'문워크 발 접지 수정',verification:{fullRegression:'PASS'}
    };
    assert.deepEqual(deriveVerifiedCodePatterns(sample,'unverified-native.json'),[]);
    const patterns=deriveVerifiedCodePatterns({...sample,verification:{...sample.verification,runtime:'PASS',replayEvidence:[{
      scenarioId:'direction-and-contact',horizon:'NEXT_STATE_TRANSITION',sourceRevision:'e'.repeat(40),
      actualPlatformRuntime:true,independentQaPass:true,expectedObservationMet:true,gameplaySemanticsPreserved:true
    }]}},'verified-native.json');
    assert.ok(patterns.some(row=>row.system==='MOTION_CONTACT_SYNC'),engine);
    assert.ok(patterns.every(row=>row.engine===engine),engine);
  }
  const inferred={taskType:'coding',sourcePaths:['roblox-games/hero/client/Game.client.luau'],
    gameId:'hero',sourceRevision:'f'.repeat(40),independentQa:'PASS',browserQa:'PASS',
    instruction:'터치 공격 판정',verification:{fullRegression:'PASS'}};
  assert.deepEqual(deriveVerifiedCodePatterns(inferred,'no-roblox-runtime.json'),[]);
  const native=deriveVerifiedCodePatterns({...inferred,runtime:'PASS',verification:{fullRegression:'PASS',replayEvidence:[{
    scenarioId:'combat-input-to-resolution',horizon:'NEXT_STATE_TRANSITION',sourceRevision:'f'.repeat(40),
    actualPlatformRuntime:true,independentQaPass:true,expectedObservationMet:true,gameplaySemanticsPreserved:true
  }]}},'roblox-native.json');
  assert.ok(native.some(row=>row.system==='INPUT_ACTION_CAUSAL_CHAIN'));
  assert.ok(native.every(row=>row.engine==='roblox'));
});


test('runtime, browser regression, stale trace and gameplay replay cannot be fabricated from labels',()=>{
  const revision='9'.repeat(40);
  const base={taskType:'coding',gameId:'forest',sourceRevision:revision,
    independentQa:'PASS',browserQa:'PASS',instruction:'터치 공격 판정 문워크 장면 인과',
    verification:{fullRegression:'PASS',runtime:'PASS'}};
  assert.deepEqual(deriveVerifiedCodePatterns({...base,verification:{...base.verification,runtime:'FAIL'}}),[]);
  assert.deepEqual(deriveVerifiedCodePatterns({...base,browserQa:'NOT_APPLICABLE'}),[]);
  assert.deepEqual(deriveVerifiedCodePatterns({...base,verification:{...base.verification,fullRegression:'FAIL'}}),[]);
  assert.deepEqual(deriveVerifiedCodePatterns({...base,verification:{...base.verification,trace:{state:'PASS',ci:'PASS',independentQa:'PASS',runtime:'PASS',sourceRevision:revision,stale:true}}}),[]);
  const noReplay=deriveVerifiedCodePatterns(base);
  assert.ok(!noReplay.some(row=>['INPUT_ACTION_CAUSAL_CHAIN','MOTION_CONTACT_SYNC','SCENE_CAUSALITY_CHAIN'].includes(row.system)));
  const wrongRevision=deriveVerifiedCodePatterns({...base,verification:{...base.verification,replayEvidence:[{
    scenarioId:'combat-input-to-resolution',horizon:'NEXT_STATE_TRANSITION',sourceRevision:'different',
    actualPlatformRuntime:true,independentQaPass:true,expectedObservationMet:true,gameplaySemanticsPreserved:true
  }]}});
  assert.ok(!wrongRevision.some(row=>row.system==='INPUT_ACTION_CAUSAL_CHAIN'));
});


test('canonical runtime replay is retained from training sample to reusable pattern only for exact revision',()=>{
  const sourceRevision='8'.repeat(40);
  const sample=buildVerifiedTrainingSample({
    evidence:{gameId:'forest',candidateId:'forest-verified',sourcePath:'web-games/forest',
      role:'development',goal:'터치 공격 판정 실제 상태 반응',summary:'real input action repair',
      verificationTrace:{state:'PASS',sourceRevision,commitSha:sourceRevision,pullRequest:5,
        ci:'PASS',independentQa:'PASS',runtime:'PASS',stale:false,flaky:false},
      replayEvidence:[{scenarioId:'combat-input-to-resolution',horizon:'NEXT_STATE_TRANSITION',sourceRevision,
        actualPlatformRuntime:true,independentQaPass:true,expectedObservationMet:true,gameplaySemanticsPreserved:true}]},
    patch:'diff --git a/web-games/forest/index.html b/web-games/forest/index.html\\n-old\\n+new',
    sourceRevision,taskType:'coding',independentQa:'PASS',browserQa:'PASS'
  });
  const causal=deriveVerifiedCodePatterns(sample,'verified-training.json')
    .find(row=>row.system==='INPUT_ACTION_CAUSAL_CHAIN');
  assert.equal(causal?.observedReplay?.sourceRevision,sourceRevision);
  assert.equal(causal?.observedReplay?.actualPlatformRuntime,true);
  assert.equal(causal?.rawCodeStored,false);
  const unverified=deriveVerifiedCodePatterns({...sample,verification:{...sample.verification,replayEvidence:[]}},'no-actual-replay.json');
  assert.ok(!unverified.some(row=>row.system==='INPUT_ACTION_CAUSAL_CHAIN'));
});

test('verified learned action expands model-free source generation with exact source and independent recheck',t=>{
  const revision='b'.repeat(40);
  const sample={
    taskType:'coding',gameId:'spell-game',sourceRevision:revision,
    independentQa:'PASS',browserQa:'PASS',
    instruction:'모바일 버튼 입력 data-gameplay-action="castSpell" 연결',
    input:'web-games/spell-game',
    verification:{fullRegression:'PASS',runtime:'PASS'}
  };
  const rows=deriveVerifiedCodePatterns(sample,'company-learning/training-samples/spell-game.json');
  const pattern=rows.find(row=>row.system==='INPUT_EVENT_BINDING');
  assert.deepEqual(pattern?.executableRecipe?.actions,['castSpell']);
  assert.equal(pattern.executableRecipe.requiresTargetRuntimeQa,true);
  assert.equal(pattern.rawCodeStored,false);
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-learned-action-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const source='<button id="magic" data-gameplay-action="castSpell">마법</button><script>let mana=4;function castSpell(){mana-=1;}</script>';
  fs.writeFileSync(path.join(root,'index.html'),source,'utf8');
  const order={target:'web',goal:'모바일 버튼 입력을 기존 마법 함수에 연결'};
  const args={order,sourceRoot:root,responsibleFiles:['index.html']};
  assert.equal(deterministicWebInputCandidate({...args,patternLibrary:{patterns:[]}}),null);
  const learned=deterministicWebInputCandidate({...args,patternLibrary:{patterns:[pattern]}});
  assert.equal(learned?.deterministicWebInput,true);
  assert.deepEqual(learned.learnedCodePatternIds,[pattern.id]);
  const expectedScript=source.match(/<script>[\s\S]*?<\/script>/)[0];
  assert.equal(learned.edits[0].find,expectedScript);
  const updatedSource=source.replace(learned.edits[0].find,learned.edits[0].replace);
  assert.ok(updatedSource.startsWith('<button id="magic" data-gameplay-action="castSpell">마법</button>'));
  assert.notEqual(updatedSource,source);
  const handlers=new Map();
  const script=updatedSource.match(/<script>([\s\S]*?)<\/script>/)[1];
  const sandbox={document:{getElementById:id=>({addEventListener:(type,fn)=>handlers.set(id+':'+type,fn)})}};
  runInNewContext(script,sandbox);
  assert.equal(runInNewContext('mana',sandbox),4);
  handlers.get('magic:click')();
  assert.equal(runInNewContext('mana',sandbox),3);
  assert.equal(fs.readFileSync(path.join(root,'index.html'),'utf8'),source);
  for(const unsafe of [
    {...pattern,verified:false},
    {...pattern,sourceRevision:'NOT_A_COMMIT'},
    {...pattern,engine:'roblox'},
    {...pattern,evidencePath:'unverified.json'},
    {...pattern,executableRecipe:{...pattern.executableRecipe,actions:['deleteSave']}}
  ])assert.equal(deterministicWebInputCandidate({...args,patternLibrary:{patterns:[unsafe]}}),null);
});

test('unverified or dangerous learned actions cannot become executable recipes',()=>{
  const base={
    taskType:'coding',gameId:'example',sourceRevision:'c'.repeat(40),
    independentQa:'PASS',browserQa:'PASS',input:'web-games/example',
    verification:{fullRegression:'PASS',runtime:'PASS'}
  };
  assert.deepEqual(deriveVerifiedCodePatterns({...base,instruction:'모바일 버튼 data-gameplay-action="castSpell"',verification:{...base.verification,runtime:'FAIL'}},'company-learning/training-samples/a.json'),[]);
  const protectedRows=deriveVerifiedCodePatterns({...base,instruction:'모바일 버튼 data-gameplay-action="deleteSave"'},'company-learning/training-samples/b.json');
  assert.ok(protectedRows.every(row=>!row.executableRecipe));
  const arbitrary=deriveVerifiedCodePatterns({...base,instruction:'모바일 버튼 data-gameplay-action="castSpell();evil()"'} ,'company-learning/training-samples/c.json');
  assert.ok(arbitrary.every(row=>!row.executableRecipe));
});


test('model-free action authoring handles many distinct controls with one indexed ID pass and no source mutation',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-control-index-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const controls=Array.from({length:32},(_,i)=>
    '<button id="attack-'+i+'" data-gameplay-action="attack">공격</button>').join('');
  const script='<script>let hp=100;function attack(){hp-=1;}</script>';
  const original=controls+script;
  fs.writeFileSync(path.join(root,'index.html'),original,'utf8');
  const args={order:{target:'web',goal:'모바일 공격 버튼 입력 연결'},
    sourceRoot:root,responsibleFiles:['index.html']};
  const candidate=deterministicWebInputCandidate(args);
  assert.equal(candidate?.deterministicWebInput,true);
  assert.equal(candidate?.edits.length,1);
  const updated=original.replace(candidate.edits[0].find,candidate.edits[0].replace);
  const bound=[...updated.matchAll(/addEventListener\("click", attack\);/g)];
  assert.equal(bound.length,32);
  assert.equal(updated.slice(0,controls.length),controls);
  const handlers=new Map();
  const runtime={document:{getElementById:id=>({addEventListener:(type,fn)=>handlers.set(id+':'+type,fn)})}};
  runInNewContext(updated.match(/<script>([\s\S]*?)<\/script>/)[1],runtime);
  assert.equal(handlers.size,32);
  handlers.get('attack-31:click')();
  assert.equal(runInNewContext('hp',runtime),99);
  assert.equal(fs.readFileSync(path.join(root,'index.html'),'utf8'),original);
  // Duplicate IDs must not be bound even when another button has a unique ID.
  const duplicate=original.replace('id="attack-0"','id="attack-1"');
  fs.writeFileSync(path.join(root,'index.html'),duplicate,'utf8');
  const safe=deterministicWebInputCandidate(args);
  assert.ok(safe);
  assert.ok(!safe.edits[0].replace.includes('getElementById("attack-1")'));
  assert.ok(safe.edits[0].replace.includes('getElementById("attack-2")'));
  // DOM id의 하이픈은 허용하지만 JS 코드/속성 삽입을 만들 수 있는 값은 여전히 거부한다.
  const unsafe='<button id="attack;malicious" data-gameplay-action="attack">attack</button><script>function attack(){return 1;}</script>';
  fs.writeFileSync(path.join(root,'index.html'),unsafe,'utf8');
  assert.equal(deterministicWebInputCandidate(args),null);
});


test('model-free Roblox coder supports a separate native shutdown hook without touching the world renderer',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-no-model-separated-shutdown-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'server'),{recursive:true});
  const relative='server/Game.server.luau';
  const original=[
    'local Players = game:GetService("Players")',
    'local store',
    'Players.PlayerAdded:Connect(function(player)',
    '  local ok, saved = pcall(function()',
    '    return store:GetAsync("player:" .. player.UserId)',
    '  end)',
    '  if ok and typeof(saved) == "table" then',
    '    initializePlayer(player)',
    '  else',
    '    initializePlayer(player)',
    '  end',
    'end)',
    'Players.PlayerRemoving:Connect(function(player)',
    '  local snapshot = {}',
    '  for key, fallback in pairs(Config.InitialState) do snapshot[key] = readNumber(player, key, fallback) end',
    '  pcall(function()',
    '    store:UpdateAsync("player:" .. player.UserId, function() return snapshot end)',
    '  end)',
    '  lastAction[player] = nil',
    'end)',
    '-- Existing authored game-world geometry and logic must be untouched.',
    'local worldIdentity = "AMUSEMENT_WORLD"',
    'game:BindToClose(function() end)'
  ].join('\n');
  fs.writeFileSync(path.join(root,relative),original);
  const args={order:{target:'roblox',goal:'save stability and server shutdown'},sourceRoot:root,responsibleFiles:[relative]};
  const candidate=deterministicRobloxNativeRepairCandidate(args);
  assert.equal(candidate?.deterministicRobloxNativeRepair,'GUARDED_MERGED_SAVE_WITH_SEPARATE_SHUTDOWN');
  assert.equal(candidate.edits.length,4);
  let modified=original;
  for(const edit of candidate.edits){
    assert.equal(modified.split(edit.find).length,2,'every responsible source anchor must be unique');
    modified=modified.replace(edit.find,edit.replace);
  }
  assert.match(modified,/verifiedSaveLoad\[player\] = ok and \(saved == nil or typeof\(saved\) == "table"\)/);
  assert.match(modified,/if current ~= nil and typeof\(current\) ~= "table" then return nil end/);
  assert.match(modified,/for key, value in pairs\(snapshot\) do merged\[key\] = value end/);
  assert.match(modified,/game:BindToClose\(function\(\)[\s\S]*savePlayer\(player\)/);
  assert.match(modified,/local worldIdentity = "AMUSEMENT_WORLD"/);
  assert.equal((modified.match(/store:UpdateAsync\(/g)||[]).length,1);
  assert.equal((modified.match(/store:GetAsync\(/g)||[]).length,1);
  assert.equal(fs.readFileSync(path.join(root,relative),'utf8'),original,'candidate generation must never write original');
  fs.writeFileSync(path.join(root,relative),modified);
  assert.equal(deterministicRobloxNativeRepairCandidate(args),null,'already migrated source stays unchanged');
  fs.writeFileSync(path.join(root,relative),original.replace('return store:GetAsync','return unverifiedStore:GetAsync'));
  assert.equal(deterministicRobloxNativeRepairCandidate(args),null,'unverified read source cannot be patched as if verified');
});

test('model-free Roblox save migrations preserve existing five games without repeated overwrite',()=>{
  for(const id of ['egg-heist','exorcist-office','human-go','realistic-builder','amusement-tycoon']){
    const relative='roblox-games/'+id+'/server/Game.server.luau';
    const source=fs.readFileSync(relative,'utf8');
    assert.match(source,/local verifiedSaveLoad = \{\}/,id);
    assert.match(source,/verifiedSaveLoad\[player\] = ok and \(saved == nil or typeof\(saved\) == "table"\)/,id);
    assert.match(source,/if verifiedSaveLoad\[player\] ~= true then return end/,id);
    assert.match(source,/store:UpdateAsync\("player:" \.\. player.UserId, function\(current\)/,id);
    assert.match(source,/if current ~= nil and typeof\(current\) ~= "table" then return nil end/,id);
    assert.match(source,/for key, value in pairs\(snapshot\) do merged\[key\] = value end/,id);
    assert.match(source,/Players\.PlayerRemoving:Connect\(function\(player\)[\s\S]*verifiedSaveLoad\[player\] = nil/,id);
    assert.match(source,/game:BindToClose\(function\(\)[\s\S]*savePlayer\(player\)/,id);
    assert.equal((source.match(/store:UpdateAsync\("player:"/g)||[]).length,1,id);
    assert.match(source,/local handler = handlers\[actionId\]/,id);
    assert.equal(deterministicRobloxNativeRepairCandidate({
      order:{target:'roblox',goal:'save shutdown stability'},
      sourceRoot:'roblox-games/'+id,responsibleFiles:['server/Game.server.luau']
    }),null,'source is already migrated: '+id);
  }
});

test('Roblox model-free coding reuses exact existing save logic for shutdown with no save-schema changes',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-model-free-save-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'server'),{recursive:true});
  const relative='server/Game.server.luau';
  const original=[
    'local Players = game:GetService("Players")',
    'Players.PlayerRemoving:Connect(function(player)',
    '  local snapshot = {}',
    '  for key, fallback in pairs(Config.InitialState) do snapshot[key] = readNumber(player, key, fallback) end',
    '  pcall(function()',
    '    store:UpdateAsync("player:" .. player.UserId, function() return snapshot end)',
    '  end)',
    '  lastAction[player] = nil',
    'end)',
    'game:BindToClose(function() end)'
  ].join('\n');
  fs.writeFileSync(path.join(root,relative),original);
  const order={target:'roblox',goal:'repair persistent saving on shutdown'};
  const candidate=deterministicRobloxNativeRepairCandidate({order,sourceRoot:root,responsibleFiles:[relative]});
  assert.equal(candidate?.deterministicRobloxNativeRepair,'PERSIST_EXISTING_SAVE_ON_SHUTDOWN');
  const next=original.replace(candidate.edits[0].find,candidate.edits[0].replace);
  assert.equal((next.match(/store:UpdateAsync/g)||[]).length,1,'existing datastore write remains single responsibility');
  assert.match(next,/Players\.PlayerRemoving:Connect\(savePlayer\)/);
  assert.match(next,/game:BindToClose\(function\(\)[\s\S]*savePlayer\(player\)/);
  assert.match(next,/Config\.InitialState/);
  assert.equal(deterministicRobloxNativeRepairCandidate({order:{target:'roblox',goal:'change combat damage'},sourceRoot:root,responsibleFiles:[relative]}),null);
  fs.writeFileSync(path.join(root,relative),next);
  assert.equal(deterministicRobloxNativeRepairCandidate({order,sourceRoot:root,responsibleFiles:[relative]}),null,'no repeated wrapper or duplicate saves');
});

test('Roblox model-free native GUI coding is bounded to a real client GuiButton and existing action',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-model-free-input-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'client'),{recursive:true});
  const file='client/Game.client.luau';
  const original=[
    'local attack = Instance.new("TextButton")',
    'attack.MouseButton1Click:Connect(function()',
    '  remote:FireServer("ATTACK")',
    'end)',
    'local auto = Instance.new("Frame")',
    'auto.MouseButton1Click:Connect(function() end)'
  ].join('\n');
  fs.writeFileSync(path.join(root,file),original);
  const order={target:'roblox',goal:'mobile native input touch control usability'};
  const result=deterministicRobloxNativeRepairCandidate({order,sourceRoot:root,responsibleFiles:[file]});
  assert.equal(result?.deterministicRobloxNativeRepair,'GUI_BUTTON_NATIVE_ACTIVATED');
  const next=original.replace(result.edits[0].find,result.edits[0].replace);
  assert.match(next,/attack\.Activated:Connect\(function\(\)[\s\S]*remote:FireServer\("ATTACK"\)/);
  assert.match(next,/auto\.MouseButton1Click:Connect/,'unrelated nonbutton is unchanged');
  assert.equal(result.edits[0].path,file);
  assert.equal(deterministicRobloxNativeRepairCandidate({order:{target:'unity',goal:'mobile input'},sourceRoot:root,responsibleFiles:[file]}),null);
  assert.equal(deterministicRobloxNativeRepairCandidate({order,sourceRoot:root,responsibleFiles:['../other.luau']}),null);
  fs.writeFileSync(path.join(root,file),next);
  assert.equal(deterministicRobloxNativeRepairCandidate({order,sourceRoot:root,responsibleFiles:[file]}),null,'no duplicate bindings or infinite styling cycles');
});


test('Roblox no-model coding guards real DataStore read before writing and preserves unrelated keys',t=>{
  // Stable template fixture: future game-specific fixes must not invalidate model-free recipe QA.
  const source=[
    "local Players = game:GetService(\"Players\")",
    "local store = nil",
    "local Config = {}",
    "Players.PlayerAdded:Connect(function(player)",
    "  local ok, saved = pcall(function()",
    "    return store:GetAsync(\"player:\" .. player.UserId)",
    "  end)",
    "  if ok and typeof(saved) == \"table\" then",
    "    initializePlayer(player)",
    "  else",
    "    initializePlayer(player)",
    "  end",
    "end)",
    "Players.PlayerRemoving:Connect(function(player)",
    "  local snapshot = {}",
    "  for key, fallback in pairs(Config.InitialState) do snapshot[key] = readNumber(player, key, fallback) end",
    "  pcall(function()",
    "    store:UpdateAsync(\"player:\" .. player.UserId, function() return snapshot end)",
    "  end)",
    "  lastAction[player] = nil",
    "end)",
    "game:BindToClose(function() end)"
  ].join('\n');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-model-free-safe-datastore-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'server'),{recursive:true});
  const relative='server/Game.server.luau';
  fs.writeFileSync(path.join(root,relative),source);
  const args={order:{target:'roblox',goal:'save stability shutdown repair'},sourceRoot:root,responsibleFiles:[relative]};
  const candidate=deterministicRobloxNativeRepairCandidate(args);
  assert.equal(candidate?.deterministicRobloxNativeRepair,'GUARDED_MERGED_SAVE_WITH_SHUTDOWN');
  assert.equal(candidate?.edits.length,3);
  let next=source;
  for(const edit of candidate.edits){
    assert.equal(next.split(edit.find).length,2,'only one real responsible-source anchor may be edited');
    next=next.replace(edit.find,edit.replace);
  }
  assert.match(next,/local verifiedSaveLoad = \{\}/);
  assert.match(next,/verifiedSaveLoad\[player\] = ok and \(saved == nil or typeof\(saved\) == "table"\)/);
  assert.match(next,/if verifiedSaveLoad\[player\] ~= true then return end/);
  assert.match(next,/if current ~= nil and typeof\(current\) ~= "table" then return nil end/);
  assert.match(next,/local merged = typeof\(current\) == "table" and table\.clone\(current\) or \{\}/);
  assert.match(next,/for key, value in pairs\(snapshot\) do merged\[key\] = value end/);
  assert.match(next,/game:BindToClose\(function\(\)[\s\S]*savePlayer\(player\)/);
  assert.equal((next.match(/store:UpdateAsync\(/g)||[]).length,(source.match(/store:UpdateAsync\(/g)||[]).length);
  assert.equal((next.match(/return store:GetAsync\(/g)||[]).length,(source.match(/return store:GetAsync\(/g)||[]).length);
  assert.equal((next.match(/store:UpdateAsync\("player:"/g)||[]).length,1);
  assert.equal(fs.readFileSync(path.join(root,relative),'utf8'),source,'candidate generation never writes game source');
  fs.writeFileSync(path.join(root,relative),next);
  assert.equal(deterministicRobloxNativeRepairCandidate(args),null,'safe migration never repeats');
  fs.writeFileSync(path.join(root,relative),source.replace('return store:GetAsync("player:" .. player.UserId)','return brokenStore:GetAsync("player:" .. player.UserId)'));
  assert.equal(deterministicRobloxNativeRepairCandidate(args),null,'unverified DataStore read must not fall through to unsafe shutdown save');
});

test('real survival2 uses guarded read-safe merged save across leave and shutdown',()=>{
  const source=fs.readFileSync('roblox-games/survival2/server/Game.server.luau','utf8');
  assert.match(source,/local verifiedSaveLoad = \{\}/);
  assert.match(source,/verifiedSaveLoad\[player\] = ok and \(saved == nil or typeof\(saved\) == "table"\)/);
  assert.match(source,/if verifiedSaveLoad\[player\] ~= true then return end/);
  assert.match(source,/store:UpdateAsync\("player:" \.\. player.UserId, function\(current\)/);
  assert.match(source,/if current ~= nil and typeof\(current\) ~= "table" then return nil end/);
  assert.match(source,/local merged = typeof\(current\) == "table" and table\.clone\(current\) or \{\}/);
  assert.match(source,/Players\.PlayerRemoving:Connect\(function\(player\)[\s\S]*savePlayer\(player\)/);
  assert.match(source,/game:BindToClose\(function\(\)[\s\S]*savePlayer\(player\)/);
  assert.doesNotMatch(source,/game:BindToClose\(function\(\) end\)/);
  assert.equal(deterministicRobloxNativeRepairCandidate({
    order:{target:'roblox',goal:'save stability shutdown'},
    sourceRoot:'roblox-games/survival2',responsibleFiles:['server/Game.server.luau']
  }),null,'existing corrected game cannot receive a duplicate patch');
});

test('real gem survivor also preserves verified-read DataStore semantics without extra save keys',()=>{
  const source=fs.readFileSync('roblox-games/gem-survivor/server/Game.server.luau','utf8');
  assert.match(source,/local verifiedSaveLoad = \{\}/);
  assert.match(source,/verifiedSaveLoad\[player\] = ok and \(saved == nil or typeof\(saved\) == "table"\)/);
  assert.match(source,/if verifiedSaveLoad\[player\] ~= true then return end/);
  assert.match(source,/store:UpdateAsync\("player:" \.\. player.UserId, function\(current\)/);
  assert.match(source,/if current ~= nil and typeof\(current\) ~= "table" then return nil end/);
  assert.match(source,/for key, value in pairs\(snapshot\) do merged\[key\] = value end/);
  assert.match(source,/Players\.PlayerRemoving:Connect\(function\(player\)[\s\S]*verifiedSaveLoad\[player\] = nil/);
  assert.match(source,/game:BindToClose\(function\(\)[\s\S]*savePlayer\(player\)/);
  assert.doesNotMatch(source,/game:BindToClose\(function\(\) end\)/);
  assert.equal(deterministicRobloxNativeRepairCandidate({
    order:{target:'roblox',goal:'save stability shutdown'},
    sourceRoot:'roblox-games/gem-survivor',responsibleFiles:['server/Game.server.luau']
  }),null);
});

test('Roblox no-model repair extracts the existing survival world save without bypassing read verification',t=>{
  const live=fs.readFileSync('roblox-games/survival/server/Game.server.luau','utf8');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-no-model-world-save-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'server'),{recursive:true});
  const file='server/Game.server.luau';
  fs.writeFileSync(path.join(root,file),live);
  const args={order:{target:'roblox',goal:'save stability shutdown repair'},sourceRoot:root,responsibleFiles:[file]};
  const proposal=deterministicRobloxNativeRepairCandidate(args);
  assert.equal(proposal?.deterministicRobloxNativeRepair,'GUARDED_WORLD_SAVE_ON_SHUTDOWN');
  assert.equal(proposal?.edits.length,2);
  assert.equal(proposal?.edits.every(edit=>edit.path===file),true);
  let next=live;
  for(const edit of proposal.edits){
    assert.equal(next.split(edit.find).length,2,'each source anchor must be unique');
    next=next.replace(edit.find,edit.replace);
  }
  assert.equal((next.match(/store:UpdateAsync\("player:"/g)||[]).length,
    (live.match(/store:UpdateAsync\("player:"/g)||[]).length,'original write routine is not duplicated');
  assert.match(next,/if verifiedSaveRead\[player\] == true then/);
  assert.match(next,/merged\.WorldObjects\s*=\s*objects/);
  assert.match(next,/Players\.PlayerRemoving:Connect\(savePlayer\)/);
  assert.match(next,/game:BindToClose\(function\(\)[\s\S]*savePlayer\(player\)/);
  fs.writeFileSync(path.join(root,file),next);
  assert.equal(deterministicRobloxNativeRepairCandidate(args),null,'idempotent after repair');
  fs.writeFileSync(path.join(root,file),live.replace('if verifiedSaveRead[player] == true then','if true then'));
  assert.equal(deterministicRobloxNativeRepairCandidate(args),null,'unverified save read must remain blocked');
});


test('real party RPG keeps exact save keys and shares one save routine across leave and shutdown',()=>{
  const source=fs.readFileSync('roblox-games/party-rpg/server/Game.server.luau','utf8');
  assert.match(source,/local function savePlayer\(player\)/);
  assert.match(source,/for key, fallback in pairs\(Config\.InitialState\) do snapshot\[key\] = readNumber\(player, key, fallback\) end/);
  assert.equal((source.match(/store:UpdateAsync\("player:"/g)||[]).length,1);
  assert.match(source,/Players\.PlayerRemoving:Connect\(savePlayer\)/);
  assert.match(source,/game:BindToClose\(function\(\)\s*for _, player in ipairs\(Players:GetPlayers\(\)\) do\s*savePlayer\(player\)/);
  assert.doesNotMatch(source,/game:BindToClose\(function\(\) end\)/);
  assert.equal(deterministicRobloxNativeRepairCandidate({
    order:{target:'roblox',goal:'save shutdown stability'},
    sourceRoot:'roblox-games/party-rpg',responsibleFiles:['server/Game.server.luau']
  }),null,'already repaired game must not be edited a second time');
});

test('party RPG save cannot overwrite existing DataStore progress when its initial read failed',()=>{
  const source=fs.readFileSync('roblox-games/party-rpg/server/Game.server.luau','utf8');
  assert.match(source,/local verifiedSaveRead = \{\}/);
  assert.match(source,/verifiedSaveRead\[player\] = ok and store ~= nil/);
  assert.match(source,/local function savePlayer\(player\)\s*--[^\n]*\n\s*if verifiedSaveRead\[player\] ~= true then/);
  assert.match(source,/if verifiedSaveRead\[player\] ~= true then\s*lastAction\[player\] = nil\s*return\s*end\s*local snapshot = \{\}/);
  assert.match(source,/store:UpdateAsync\("player:" \.\. player.UserId/);
  assert.match(source,/verifiedSaveRead\[player\] = nil\s*end\s*Players.PlayerRemoving:Connect\(savePlayer\)/);
  assert.match(source,/game:BindToClose\(function\(\)[\s\S]*savePlayer\(player\)/);
});
