// 파일명: qa/vibe2-code-pattern-ingest.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveVerifiedCodePatterns,ingestVerifiedCodePatterns} from '../tools/vibe2-code-pattern-ingest.mjs';
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

test('verified source-changing algorithm experiment is retained without raw code or forged QA',()=>{
 const base={taskType:'coding',gameId:'demo',sourceRevision:'a'.repeat(40),
  independentQa:'PASS',browserQa:'PASS',instruction:'알고리즘 합성 기존 함수 직접 수정',
  verification:{fullRegression:'PASS',runtime:'PASS',security:'PASS',codeLaboratory:{
   strategy:'balanced',sourceChanged:true,modelUsed:false}}};
 const accepted=deriveVerifiedCodePatterns(base,'company-learning/training-samples/lab.json')
  .find(x=>x.system==='ALGORITHM_SYNTHESIS');
 assert.equal(accepted.verifiedAlgorithmStrategy.strategy,'balanced');
 assert.equal(accepted.verifiedAlgorithmStrategy.sourceRevision,base.sourceRevision);
 assert.equal(accepted.rawCodeStored,false);
 const insecure=deriveVerifiedCodePatterns({...base,verification:{...base.verification,security:'FAIL'}},'lab.json');
 assert.ok(insecure.every(x=>!x.verifiedAlgorithmStrategy));
 const noSource=deriveVerifiedCodePatterns({...base,verification:{...base.verification,
  codeLaboratory:{...base.verification.codeLaboratory,sourceChanged:false}}},'lab.json');
 assert.ok(noSource.every(x=>!x.verifiedAlgorithmStrategy));
 const noRuntime=deriveVerifiedCodePatterns({...base,verification:{...base.verification,runtime:'FAIL'}},'lab.json');
 assert.deepEqual(noRuntime,[]);
});

test('canonical training sample stores only source-matched security-verified algorithm experiments',()=>{
 const revision='e'.repeat(40);
 const evidence={goal:'알고리즘 합성 구현',gameId:'lab',sourcePath:'web-games/lab',
  changedFiles:['web-games/lab/logic.js'],role:'development',
  codeLaboratory:{strategy:'balanced',sourceChanged:true,modelUsed:false,sourceRevision:revision},
  securityScan:{sourceRevision:revision,conclusion:'PASS'},
  verificationTrace:{state:'PASS',sourceRevision:revision,commitSha:revision,
   pullRequest:11054,ci:'PASS',independentQa:'PASS',runtime:'PASS'}};
 const make=(e)=>buildVerifiedTrainingSample({evidence:e,patch:'-return 0;\n+return Math.max(x,y);',
  sourceRevision:revision,independentQa:'PASS',browserQa:'PASS',taskType:'coding'});
 const valid=make(evidence);
 assert.equal(valid.verification.security,'PASS');
 assert.equal(valid.verification.codeLaboratory.strategy,'balanced');
 const derived=deriveVerifiedCodePatterns(valid,'company-learning/training-samples/lab.json')
  .find(row=>row.system==='ALGORITHM_SYNTHESIS');
 assert.equal(derived?.verifiedAlgorithmStrategy?.strategy,'balanced');
 assert.equal(make({...evidence,securityScan:{...evidence.securityScan,sourceRevision:'b'.repeat(40)}})
  .verification.codeLaboratory,undefined);
 assert.equal(make({...evidence,codeLaboratory:{...evidence.codeLaboratory,sourceChanged:false}})
  .verification.codeLaboratory,undefined);
 assert.equal(make({...evidence,changedFiles:['web-games/other/logic.js']})
  .verification.codeLaboratory,undefined);
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


test('model-free Web coder wires declared controls to same-game external JS without modifying scripts or guessing actions',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-external-game-action-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const scriptPath=path.join(root,'scripts','game.js');
  fs.mkdirSync(path.dirname(scriptPath),{recursive:true});
  const code='let hp=4;function attack(){hp-=1;}';
  fs.writeFileSync(scriptPath,code,'utf8');
  const html='<button id="fight" data-gameplay-action="attack">Fight</button>\n<script src="./scripts/game.js"></script>';
  const file=path.join(root,'index.html');
  fs.writeFileSync(file,html,'utf8');
  const args={order:{target:'web',goal:'모바일 공격 버튼 입력 연결'},
    sourceRoot:root,responsibleFiles:['index.html'],patternLibrary:{patterns:[]}};
  const generated=deterministicWebInputCandidate(args);
  assert.equal(generated?.deterministicWebInput,true);
  assert.equal(generated.externalGameScriptReadOnly,true);
  assert.deepEqual(generated.edits.map(x=>x.path),['index.html']);
  assert.deepEqual(generated.newFiles,[]);
  assert.deepEqual(generated.replaceFiles,[]);
  assert.ok(generated.edits[0].replace.startsWith('<script src="./scripts/game.js"></script>'));
  const updated=html.replace(generated.edits[0].find,generated.edits[0].replace);
  assert.match(updated,/document\.getElementById\("fight"\)\.addEventListener\("click", attack\)/);
  const inline=updated.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(inline);
  const handlers=new Map();
  const context={document:{getElementById:id=>({addEventListener:(event,fn)=>handlers.set(id+':'+event,fn)})}};
  runInNewContext(code+'\n'+inline,context);
  assert.equal(runInNewContext('hp',context),4);
  handlers.get('fight:click')();
  assert.equal(runInNewContext('hp',context),3);
  assert.equal(fs.readFileSync(scriptPath,'utf8'),code,'external game implementation remains read-only');
  assert.equal(fs.readFileSync(file,'utf8'),html,'candidate generation never writes game source');
  const blockedHtml=[
    '<button id="fight" data-gameplay-action="attack">Fight</button><script src="https://cdn.example/game.js"></script>',
    '<button id="fight" data-gameplay-action="attack">Fight</button><script src="../other-game.js"></script>',
    '<button id="fight" data-gameplay-action="attack">Fight</button><script src="/scripts/game.js"></script>',
    '<button id="fight" data-gameplay-action="attack">Fight</button><script type="module" src="./scripts/game.js"></script>',
    '<button id="fight" data-gameplay-action="attack">Fight</button><script async src="./scripts/game.js"></script>',
    '<button id="fight" data-gameplay-action="attack">Fight</button><script src="./scripts/game.js">attack()</script>',
    '<script src="./scripts/game.js"></script><button id="fight" data-gameplay-action="attack">Fight</button>',
    '<button id="fight" data-gameplay-action="attack">Fight</button><script src="./scripts/game.js"></script><script>attack()</script>',
    '<button id="fight" data-gameplay-action="save">Save</button><script src="./scripts/game.js"></script>',
    '<button id="fight" data-gameplay-action="castSpell">Cast</button><script src="./scripts/game.js"></script>'
  ];
  for(const bad of blockedHtml){
    fs.writeFileSync(file,bad,'utf8');
    assert.equal(deterministicWebInputCandidate(args),null,'reject unsupported or ambiguous source-linked game input');
  }
  fs.writeFileSync(file,html,'utf8');
  for(const badScript of [
    'let hp=4;function unrelated(){hp--;}', // missing action
    'let hp=4;function attack(){hp--;}document.addEventListener("click",attack);',
    'let hp=4;function attack(){hp--;}eval("attack()");',
    'import "./other.js";function attack(){return 1;}'
  ]){
    fs.writeFileSync(scriptPath,badScript,'utf8');
    assert.equal(deterministicWebInputCandidate(args),null,'reject unverified, delegated or dynamic external game script');
  }
  fs.writeFileSync(scriptPath,code,'utf8');
  fs.unlinkSync(scriptPath);
  const outside=path.join(root,'outside-game.js');
  fs.writeFileSync(outside,code,'utf8');
  fs.symlinkSync(outside,scriptPath);
  assert.equal(deterministicWebInputCandidate(args),null,'reject symlinked external game source');
});

test('source-bound ESM input repair imports only exact same-game exported actions and replays game state',t=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-esm-game-input-'));
  t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
  const root=path.join(base,'test');
  fs.mkdirSync(path.join(root,'game'),{recursive:true});
  const htmlPath=path.join(root,'index.html'),modulePath=path.join(root,'game','actions.mjs');
  const originalModule=[
    'export function attack(){globalThis.hp-=1;}',
    'export function interact(){globalThis.wood+=1;}'
  ].join('\n');
  const originalHtml=[
    '<button id="fight" data-gameplay-action="attack">Attack</button>',
    '<button id="gather" data-gameplay-action="interact">Interact</button>',
    '<script type="module">import {attack,interact} from "./game/actions.mjs";</script>'
  ].join('\n');
  fs.writeFileSync(modulePath,originalModule);
  fs.writeFileSync(htmlPath,originalHtml);
  const task={order:{target:'web',goal:'모바일 조작 버튼 입력 연결',gameId:'test'},
    sourceRoot:root,responsibleFiles:['index.html'],patternLibrary:{patterns:[]}};
  assert.equal(deterministicWebInputCandidate({...task,
    order:{...task.order,gameId:'another-game'}}),null,
    'same script cannot be reused to repair an unrelated game');
  const first=deterministicWebInputCandidate(task);
  assert.equal(first?.deterministicWebModuleInput,true);
  assert.equal(first.modelUsed,false);
  assert.equal(first.sourceWrite,false);
  assert.equal(first.runtimeVerified,false);
  assert.equal(first.linkedModuleReadOnly,true);
  assert.deepEqual(first.edits.map(row=>row.path),['index.html']);
  assert.deepEqual(first.newFiles,[]);
  assert.deepEqual(first.replaceFiles,[]);
  const updated=originalHtml.replace(first.edits[0].find,first.edits[0].replace);
  assert.match(updated,/getElementById\("fight"\)\.addEventListener\("click", attack\)/);
  assert.match(updated,/getElementById\("gather"\)\.addEventListener\("click", interact\)/);
  const handlers=new Map(),context={
    hp:5,wood:0,
    document:{getElementById:id=>({addEventListener:(kind,fn)=>handlers.set(id+':'+kind,fn)})}
  };
  const linked=updated.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(linked);
  runInNewContext(originalModule.replaceAll('export ','')+'\n'
    +linked.replace(/import\s*\{[^}]+\}\s*from\s*["'][^"']+["']\s*;?/,'')
    ,context);
  handlers.get('fight:click')();
  handlers.get('gather:click')();
  assert.equal(context.hp,4);
  assert.equal(context.wood,1);
  assert.equal(fs.readFileSync(modulePath,'utf8'),originalModule,'original gameplay module is read-only');
  assert.equal(fs.readFileSync(htmlPath,'utf8'),originalHtml,'candidate generation does not write HTML');
  fs.writeFileSync(htmlPath,updated);
  assert.equal(deterministicWebInputCandidate(task),null,'already-bound action must not duplicate events');
  const badHtml=[
    originalHtml.replace('id="fight"','id="gather"'),
    originalHtml.replaceAll('data-gameplay-action="attack"','data-gameplay-action="save"')
      .replaceAll('data-gameplay-action="interact"','data-gameplay-action="save"'),
    originalHtml.replaceAll('data-gameplay-action="attack"','data-gameplay-action="unknownAction"')
      .replaceAll('data-gameplay-action="interact"','data-gameplay-action="unknownAction"'),
    originalHtml.replace('./game/actions.mjs','https://attacker.example/actions.mjs'),
    originalHtml.replace('./game/actions.mjs','../outside.mjs'),
    originalHtml.replace('type="module"','type="module" async'),
    originalHtml.replace('import {attack,interact}','import {attack as other,interact}'),
    originalHtml.replace('</script>','attack();</script>'),
    originalHtml+'<script>document.body.dataset.ok=1</script>',
    originalHtml.replace('type="module"','type="importmap"'),
    originalHtml.replace('<script type="module">','<script type="module" src="./game/actions.mjs">')
  ];
  for(const html of badHtml){
    fs.writeFileSync(htmlPath,html);
    const candidate=deterministicWebInputCandidate(task);
    assert.equal(candidate,null,'reject untrusted, already bound or semantically ambiguous module');
  }
  fs.writeFileSync(htmlPath,originalHtml);
  for(const badModule of [
    'export function other(){return 1;}',
    '// export function attack(){}\nexport function interact(){}',
    'export function attack(amount){}\nexport function interact(){}',
    'export function attack(){}\nexport function attack(){}\nexport function interact(){}',
    'export function attack(){localStorage.clear()}\nexport function interact(){}',
    'export function attack(){document.addEventListener("click",attack)}\nexport function interact(){}'
  ]){
    fs.writeFileSync(modulePath,badModule);
    const candidate=deterministicWebInputCandidate(task);
    // A partial match may still legitimately bind a different proven action.
    assert.ok(!candidate||!candidate.edits[0].replace.includes('getElementById("fight")'),
      'unsafe or unmatched exported attack is never bound');
  }
  fs.unlinkSync(modulePath);
  fs.writeFileSync(path.join(root,'other.mjs'),originalModule);
  fs.symlinkSync(path.join(root,'other.mjs'),modulePath);
  assert.equal(deterministicWebInputCandidate(task),null,'symlinked module must fail closed');
});


test('source-bound multi-module ESM repair binds independent same-game actions only',t=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-multi-esm-'));
  t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
  const root=path.join(base,'multi');
  fs.mkdirSync(path.join(root,'game'),{recursive:true});
  const file=path.join(root,'index.html');
  const modules={
    'attack.mjs':'export function attack(){globalThis.hp-=1;}',
    'gather.mjs':'export function gather(){globalThis.wood+=2;}',
    'rest.mjs':'export function rest(){globalThis.energy+=1;}'
  };
  const modulePaths=Object.keys(modules).map(name=>path.join(root,'game',name));
  for(const [name,content] of Object.entries(modules))
    fs.writeFileSync(path.join(root,'game',name),content);
  const original=[
    '<button id="fight" data-gameplay-action="attack">Fight</button>',
    '<button id="mining" data-gameplay-action="gather">Gather</button>',
    '<button id="recover" data-gameplay-action="rest">Rest</button>',
    '<script type="module">',
    'import {attack} from "./game/attack.mjs";',
    'import {gather} from "./game/gather.mjs";',
    'import {rest} from "./game/rest.mjs";',
    '</script>'
  ].join('\n');
  fs.writeFileSync(file,original);
  const args={order:{target:'web',goal:'모바일 버튼 입력 연결',gameId:'multi'},
    sourceRoot:root,responsibleFiles:['index.html'],patternLibrary:{patterns:[]}};
  const candidate=deterministicWebInputCandidate(args);
  assert.equal(candidate?.deterministicWebModuleInput,true);
  assert.equal(candidate.linkedModuleCount,3);
  assert.equal(candidate.sourceWrite,false);
  assert.equal(candidate.runtimeVerified,false);
  assert.equal(candidate.modelUsed,false);
  assert.equal(candidate.linkedModuleReadOnly,true);
  assert.deepEqual(candidate.edits.map(row=>row.path),['index.html']);
  assert.deepEqual(candidate.newFiles,[]);
  assert.deepEqual(candidate.replaceFiles,[]);
  const updated=original.replace(candidate.edits[0].find,candidate.edits[0].replace);
  const inline=updated.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(inline);
  const handlers=new Map(),context={
    hp:5,wood:0,energy:3,
    document:{getElementById:id=>({addEventListener:(kind,fn)=>handlers.set(id+':'+kind,fn)})}
  };
  runInNewContext(Object.values(modules).join('\n').replaceAll('export ','')+'\n'+
    inline.replace(/import\s*\{[^}]+\}\s*from\s*["'][^"']+["']\s*;?/g,''),context);
  handlers.get('fight:click')();
  handlers.get('mining:click')();
  handlers.get('recover:click')();
  assert.deepEqual([context.hp,context.wood,context.energy],[4,2,4]);
  assert.equal(fs.readFileSync(file,'utf8'),original,'candidate creation is read-only');
  for(let i=0;i<modulePaths.length;i++)
    assert.equal(fs.readFileSync(modulePaths[i],'utf8'),Object.values(modules)[i]);
  fs.writeFileSync(file,updated);
  assert.equal(deterministicWebInputCandidate(args),null,'repeat cannot append duplicate handlers');
  // A module script is deferred by HTML parsing, so controls below it exist on execution.
  const deferredHtml=[
    '<script type="module">',
    'import {attack} from "./game/attack.mjs";',
    'import {gather} from "./game/gather.mjs";',
    'import {rest} from "./game/rest.mjs";',
    '</script>',
    '<button id="fight" data-gameplay-action="attack">Fight</button>',
    '<button id="mining" data-gameplay-action="gather">Gather</button>',
    '<button id="recover" data-gameplay-action="rest">Rest</button>'
  ].join('\n');
  fs.writeFileSync(file,deferredHtml);
  const deferredCandidate=deterministicWebInputCandidate(args);
  assert.equal(deferredCandidate?.deterministicWebModuleInput,true,
    'deferred ESM must support controls following its script tag');
  const deferredLinked=deferredHtml.replace(deferredCandidate.edits[0].find,deferredCandidate.edits[0].replace);
  for(const id of ['fight','mining','recover'])
    assert.match(deferredLinked,new RegExp('getElementById\\("'+id+'"\\)\\.addEventListener\\("click"'));
  fs.writeFileSync(file,deferredLinked);
  assert.equal(deterministicWebInputCandidate(args),null,
    'deferred module button binding remains idempotent');
  const blocked=[
    original.replace('import {rest} from "./game/rest.mjs";','import {attack} from "./game/rest.mjs";'),
    original.replace('import {gather} from "./game/gather.mjs";','import {gather as other} from "./game/gather.mjs";'),
    original.replace('./game/rest.mjs','https://evil.example/rest.mjs'),
    original.replace('./game/rest.mjs','../rest.mjs'),
    original.replace('import {rest} from "./game/rest.mjs";','rest();'),
    original.replace('import {rest} from "./game/rest.mjs";','import("./game/rest.mjs");'),
    original.replace('type="module"','type="importmap"'),
    original.replace('</script>','</script><script>rest()</script>'),
    original.replace('id="fight"','id="mining"'),
    original.replace('game/rest.mjs','game/missing.mjs'),
    original.replace('import {rest} from "./game/rest.mjs";',
      'import {rest} from "./game/rest.mjs";\nimport {rest} from "./game/rest.mjs";'),
    original.replace('import {rest} from "./game/rest.mjs";',
      'import {rest} from "./game/rest.mjs";\nimport {attack} from "./game/attack.mjs";\nimport {gather} from "./game/gather.mjs";')
  ];
  for(const html of blocked){
    fs.writeFileSync(file,html);
    assert.equal(deterministicWebInputCandidate(args),null,'unsupported multi-module shape fails closed');
  }
  fs.writeFileSync(file,original);
  fs.writeFileSync(modulePaths[1],'import "./dependency.mjs";\n'+modules['gather.mjs']);
  assert.equal(deterministicWebInputCandidate(args),null,'nested imports require separate dependency proof');
  fs.writeFileSync(modulePaths[1],modules['gather.mjs']);
  fs.writeFileSync(modulePaths[1],'export function gather(){fetch("/save");}');
  assert.equal(deterministicWebInputCandidate(args),null,'network or save side effects are blocked');
  fs.writeFileSync(modulePaths[1],modules['gather.mjs']);
  fs.unlinkSync(modulePaths[2]);
  fs.symlinkSync(modulePaths[0],modulePaths[2]);
  assert.equal(deterministicWebInputCandidate(args),null,'symlinked module fails closed');
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

test('model-free Roblox save migrations preserve four surviving games without repeated overwrite',()=>{
  // [오너 삭제 보존] egg-heist는 영구 삭제됨. 남아 있는 네 게임의 기존 저장 보존 검증은 유지한다.
  for(const id of ['exorcist-office','human-go','realistic-builder','amusement-tycoon']){
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

test('real existing builder uses guarded read-safe merged save across leave and shutdown',()=>{
  const source=fs.readFileSync('roblox-games/realistic-builder/server/Game.server.luau','utf8');
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
    sourceRoot:'roblox-games/realistic-builder',responsibleFiles:['server/Game.server.luau']
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

test('no-model Vibe refines a real actor motion restart bug once, not arbitrary game rules',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-wildlife-motion-repair-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const file='client/Game.client.luau',absolute=path.join(root,file);
  fs.mkdirSync(path.dirname(absolute),{recursive:true});
  const unsafe=[
    'local function syncWildlife(model,controller)',
    ' local speed=model:GetAttribute("WildlifeDesiredSpeed")',
    ' controller:SetSpeed(speed)',
    ' controller:SetState(tostring(model:GetAttribute("WildlifeMotionState")or"LOCOMOTION"),{',
    '  side=model:GetAttribute("WildlifeHitSide"),',
    '  duration=model:GetAttribute("WildlifeAttackDuration"),',
    ' })',
    'end',
    'for _,attribute in ipairs({"WildlifeDesiredSpeed","WildlifeMotionState","WildlifeHitSide","WildlifeAttackDuration"})do',
    ' table.insert(list,model:GetAttributeChangedSignal(attribute):Connect(function()syncWildlife(model,controller)end))',
    'end'
  ].join('\n');
  fs.writeFileSync(absolute,unsafe);
  const args={order:{target:'roblox',goal:'Improve real wildlife mob NPC attack animation motion'},
    sourceRoot:root,responsibleFiles:[file]};
  const candidate=deterministicRobloxNativeRepairCandidate(args);
  assert.equal(candidate?.deterministicRobloxNativeRepair,'WILDLIFE_NATIVE_ACTION_STATE_DEBOUNCE');
  assert.equal(candidate?.deterministicSelection?.status,'SOURCE_GROUNDED_UNVALIDATED');
  assert.equal(candidate?.edits.length,1);
  assert.match(candidate.edits[0].replace,/controller\.sourceState==state/);
  assert.match(candidate.edits[0].replace,/controller\.sourceHitSide==side/);
  assert.match(candidate.edits[0].replace,/controller\.sourceAttackDuration==duration/);
  assert.equal(candidate.edits[0].replace.includes('SetAttribute("WildlifeMotionState"'),false);
  const fixed=unsafe.replace(candidate.edits[0].find,candidate.edits[0].replace);
  fs.writeFileSync(absolute,fixed);
  assert.equal(deterministicRobloxNativeRepairCandidate(args),null,'corrected motion cannot be patched repeatedly');
  assert.equal(deterministicRobloxNativeRepairCandidate({...args,order:{target:'unity',goal:'motion'}}),null,'other engines must not be changed');
});

test('model-free Vibe crafts distinct real actor motion repairs with native rig and source ownership',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-motion-rules-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const file='client/Game.client.luau',absolute=path.join(root,file);
  fs.mkdirSync(path.dirname(absolute),{recursive:true});
  const scenarios=[
    {
      code:[
        'local function verifiedLearningCreateFootIk() end',
        'verifiedLearningRunService.RenderStepped:Connect(function(dt)',
        ' local updateHz = 60',
        ' footState.control.Weight = groundGap <= 0.35 and (rootSpeed < 1 and 0.5 or 0.32) or 0.12',
        ' else',
        ' footState.control.Weight = 0',
        'end)'
      ].join('\n'),
      recipe:'ACTOR_R15_FOOT_IK_CONTINUOUS_BLEND',edits:2,
      required:['targetWeight','math.exp(-18 / updateHz)','math.exp(-22 / updateHz)']
    },
    {
      code:[
        'RunService.PreSimulation:Connect(function(dt)',
        ' local actor=workspace:FindFirstChild("NPC")',
        ' local state=actor:GetAttribute("CozyMotionState")',
        ' if item:IsA("Motor6D") then',
        ' joint.Transform=joint.Transform:Lerp(CFrame.Angles(angle,0,roll),math.clamp(step*16,0,1))',
        ' end',
        'end)'
      ].join('\n'),
      recipe:'ACTOR_NPC_MOB_FRAME_INVARIANT_JOINTS',edits:1,
      required:['1-math.exp(-16*step)']
    },
    {
      code:[
        'RunService.PreSimulation:Connect(function(dt)',
        ' record.elapsed+=dt',
        ' local phase=now*(moving and math.clamp(speed*1.35,5,13) or 2)+record.phase',
        ' local stride=moving and math.sin(phase)*.68 or math.sin(phase)*.025',
        'end)'
      ].join('\n'),
      recipe:'ACTOR_NPC_MOB_CONTINUOUS_GAIT_PHASE',edits:1,
      required:['record.gaitPhase=','local phase=record.gaitPhase']
    }
  ];
  const args={order:{target:'roblox',goal:'High quality native actor animation rig motion'},
    sourceRoot:root,responsibleFiles:[file]};
  for(const scenario of scenarios){
    fs.writeFileSync(absolute,scenario.code);
    const result=deterministicRobloxNativeRepairCandidate(args);
    assert.equal(result?.deterministicRobloxNativeRepair,scenario.recipe,scenario.recipe);
    assert.equal(result?.edits?.length,scenario.edits);
    assert.equal(result?.semanticGrounding?.runtimeVerified,false);
    assert.equal(result?.deterministicSelection?.status,'SOURCE_GROUNDED_UNVALIDATED');
    let patched=scenario.code;
    for(const edit of result.edits){
      assert.equal(patched.split(edit.find).length,2);
      patched=patched.replace(edit.find,edit.replace);
    }
    for(const expected of scenario.required)assert.ok(patched.includes(expected),expected);
    fs.writeFileSync(absolute,patched);
    assert.equal(deterministicRobloxNativeRepairCandidate(args),null,'do not re-patch same actor pose');
  }
  fs.writeFileSync(absolute,scenarios[0].code.replace('local updateHz = 60','local updateHz = 30'));
  assert.equal(deterministicRobloxNativeRepairCandidate(args),null,'fail closed without actual update cadence');
  assert.equal(deterministicRobloxNativeRepairCandidate({...args,responsibleFiles:['../outside.luau']}),null);
});

test('continuous verified pattern ingest learns, quarantines stale proof, and reactivates only verified source',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-learn-replay-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const samplesDir=path.join(root,'company-learning','training-samples');
  fs.mkdirSync(samplesDir,{recursive:true});
  const file=path.join(samplesDir,'verified.json');
  const sample={taskType:'coding',gameId:'magic',sourceRevision:'f'.repeat(40),
    independentQa:'PASS',browserQa:'PASS',
    instruction:'모바일 버튼 data-gameplay-action="castSpell" 연결',
    verification:{fullRegression:'PASS',runtime:'PASS'}};
  fs.writeFileSync(file,JSON.stringify(sample));
  const original={patterns:[]};
  const trained=ingestVerifiedCodePatterns({samplesDir,libraryInput:original});
  const learned=trained.patterns.find(row=>row.executableRecipe?.actions?.includes('castSpell'));
  assert.ok(learned);
  assert.notEqual(learned.retrievalEligible,false);
  assert.equal(trained.stats.added>0,true);
  const unchanged=ingestVerifiedCodePatterns({samplesDir,libraryInput:trained});
  assert.deepEqual(unchanged.patterns,trained.patterns);
  assert.equal(unchanged.stats.added,0);
  const source='<button id="magic" data-gameplay-action="castSpell">마법</button><script>let mana=4;function castSpell(){mana-=1;}</script>';
  fs.writeFileSync(path.join(root,'index.html'),source);
  const args={order:{target:'web',goal:'모바일 버튼 입력'},sourceRoot:root,
    responsibleFiles:['index.html']};
  assert.equal(deterministicWebInputCandidate({...args,patternLibrary:trained})?.learnedCodePatternIds?.includes(learned.id),true);
  // The production source worker gets its verified library from the state
  // checkout, not from the main worktree.
  const stateFile=path.join(root,'verified-state-patterns.json');
  fs.writeFileSync(stateFile,JSON.stringify(trained));
  const priorStore=process.env.VIBE2_VERIFIED_CODE_PATTERNS_PATH;
  try{
    process.env.VIBE2_VERIFIED_CODE_PATTERNS_PATH=stateFile;
    assert.equal(deterministicWebInputCandidate(args)?.learnedCodePatternIds?.includes(learned.id),true);
    fs.writeFileSync(stateFile,'{}');
    assert.equal(deterministicWebInputCandidate(args),null);
  }finally{
    if(priorStore===undefined)delete process.env.VIBE2_VERIFIED_CODE_PATTERNS_PATH;
    else process.env.VIBE2_VERIFIED_CODE_PATTERNS_PATH=priorStore;
  }
  fs.writeFileSync(file,JSON.stringify({...sample,verification:{...sample.verification,runtime:'FAIL'}}));
  const stale=ingestVerifiedCodePatterns({samplesDir,libraryInput:trained});
  const blocked=stale.patterns.find(row=>row.id===learned.id);
  assert.ok(blocked);
  assert.equal(blocked.verified,true);
  assert.equal(blocked.retrievalEligible,false);
  assert.equal(blocked.masteryEligible,false);
  assert.equal(blocked.quarantineReason,'SOURCE_SAMPLE_NOT_CURRENTLY_VERIFIED');
  assert.equal(deterministicWebInputCandidate({...args,patternLibrary:stale}),null);
  assert.equal(fs.readFileSync(path.join(root,'index.html'),'utf8'),source);
  fs.writeFileSync(file,JSON.stringify(sample));
  const restored=ingestVerifiedCodePatterns({samplesDir,libraryInput:stale});
  assert.notEqual(restored.patterns.find(row=>row.id===learned.id).retrievalEligible,false);
  assert.equal(restored.stats.reactivated>0,true);
  // Historical records without new runtime data are retained for audit and
  // are not misrepresented as a newly failed playtest.
  fs.writeFileSync(file,JSON.stringify({...sample,verification:{fullRegression:'PASS'}}));
  const historical=ingestVerifiedCodePatterns({samplesDir,libraryInput:restored});
  assert.notEqual(historical.patterns.find(row=>row.id===learned.id).retrievalEligible,false);
  // A source revision change invalidates the original learning even when
  // the new revision has no verified native runtime evidence.
  fs.writeFileSync(file,JSON.stringify({...sample,sourceRevision:'e'.repeat(40),
    verification:{fullRegression:'PASS'}}));
  const changedRevision=ingestVerifiedCodePatterns({samplesDir,libraryInput:historical});
  assert.equal(changedRevision.patterns.find(row=>row.id===learned.id).retrievalEligible,false);
  // Corrupted source evidence must not keep an old executable recipe active.
  fs.writeFileSync(file,'NOT_VALID_JSON');
  const malformed=ingestVerifiedCodePatterns({samplesDir,libraryInput:historical});
  assert.equal(malformed.patterns.find(row=>row.id===learned.id).retrievalEligible,false);
  fs.unlinkSync(file);
  const removed=ingestVerifiedCodePatterns({samplesDir,libraryInput:restored});
  assert.equal(removed.patterns.find(row=>row.id===learned.id).retrievalEligible,false);
  assert.equal(removed.patterns.find(row=>row.id===learned.id).verified,true);
});


// [Studio MCP] 학습 규칙은 동일 리비전의 실제 검증 증거와 원본 책임 함수가 있어야 생성된다.
test('verified Studio modal repair distills source-bound native recipe without raw patches',()=>{
 const sha='c'.repeat(40),trace={state:'PASS',sourceRevision:sha,commitSha:sha,
   pullRequest:11111,ci:'PASS',independentQa:'PASS',runtime:'PASS'};
 const base={taskType:'roblox',gameId:'fantasy-survival',sourceRevision:sha,
   independentQa:'PASS',browserQa:'NOT_APPLICABLE',
   instruction:'Studio MCP HUD overlap ActionMenuShade in RobloxCommonUI.AdaptActionMenu',
   verification:{fullRegression:'PASS',runtime:'PASS',trace}};
 const patterns=deriveVerifiedCodePatterns(base,'company-learning/training-samples/verified-studio.json');
 const match=patterns.find(row=>row.system==='STUDIO_MCP_MODAL_BACKDROP_INPUT_SEPARATION');
 assert.equal(match?.executableRecipe?.responsibleFunction,'RobloxCommonUI.AdaptActionMenu');
 assert.equal(match?.executableRecipe?.requiresTargetRuntimeQa,true);
 assert.ok(match?.implementationRecipe?.proof.includes('FULL_REGRESSION_PASS'));
 assert.equal(match?.rawCodeStored,false);
 const missingTrace=deriveVerifiedCodePatterns({...base,verification:{...base.verification,trace:null}});
 assert.ok(!missingTrace.some(row=>row.system==='STUDIO_MCP_MODAL_BACKDROP_INPUT_SEPARATION'));
 const otherFunction=deriveVerifiedCodePatterns({...base,instruction:'Studio MCP HUD overlap ActionMenuShade in OtherUI.CreatePanel'});
 assert.ok(!otherFunction.some(row=>row.system==='STUDIO_MCP_MODAL_BACKDROP_INPUT_SEPARATION'));
 const failed=deriveVerifiedCodePatterns({...base,verification:{...base.verification,runtime:'FAIL'}});
 assert.deepEqual(failed,[]);
});
