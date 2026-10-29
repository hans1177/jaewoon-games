// 파일명: qa/vibe2-complex-work-planner.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {gunzipSync} from 'node:zlib';
import {spawnSync} from 'node:child_process';
import {compileComplexOwnerIntent} from '../tools/vibe2-complex-intent.mjs';
import {planComplexGameWork,createComplexGameCandidate} from '../tools/vibe2-complex-work-planner.mjs';
import {buildGameSourceIndex,sourceDigest} from '../tools/vibe2-game-source-index.mjs';
import {createVibe59CodeCandidate,createVibe59CodeCandidates} from '../tools/vibe2-v59-autonomy.mjs';
import {applyExactEdits} from '../tools/autonomous-safe-edit.mjs';
import {runCodegenCounterexampleRepair} from '../tools/vibe2-codegen-counterexample-repair.mjs';
import {applyVibe2CandidateToSource} from '../tools/vibe2-source-worker.mjs';
const revision='a'.repeat(40);
function fixture(t,target='web'){
 const repo=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-complex-'));t.after(()=>fs.rmSync(repo,{recursive:true,force:true}));
 const root=path.join(repo,target==='web'?'web-games/rpg':'roblox-games/rpg');fs.mkdirSync(root,{recursive:true});
 fs.writeFileSync(path.join(repo,'game-catalog.json'),JSON.stringify({games:[{id:'rpg',webPath:'web-games/rpg',robloxProjectPath:'roblox-games/rpg'}]}));
 return {repo,root};
}
test('canonical Vibe2 source worker physically applies an existing production SVG asset edit on an isolated game branch',t=>{
 const repo=fs.mkdtempSync(path.join(os.tmpdir(),'vibe59-asset-source-'));t.after(()=>fs.rmSync(repo,{recursive:true,force:true}));
 const relative='assets/survival-atlas.svg',project='web-games/survival2';
 const originalFile=path.resolve(project,relative),original=fs.readFileSync(originalFile,'utf8');
 const sourceRoot=path.join(repo,project),target=path.join(sourceRoot,relative);
 fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,original);
 const git=(...args)=>{const r=spawnSync('git',args,{cwd:repo,encoding:'utf8',timeout:15000});
  assert.equal(r.status,0,r.stderr||r.error?.message);};
 git('init','-q');git('config','user.email','vibe2-tests@example.invalid');
 git('config','user.name','Vibe2 Test');git('add','--',project);
 git('commit','-qm','original existing production SVG asset');
 git('switch','-q','-c','vibe2/candidate/existing-svg-asset');
 const old=original.match(/<g id="wolf"[^>]*>[\s\S]*?<\/g>/)?.[0];
 assert.ok(old&&old.includes('fill="#6d7773"'));
 const edit={path:relative,find:old,replace:old.replace('fill="#6d7773"','fill="#81938b"')};
 const candidate={edits:[edit],newFiles:[],replaceFiles:[]};
 const candidateRoot=path.join(repo,'.vibe2/candidates/existing-svg-asset');
 assert.throws(()=>applyVibe2CandidateToSource({cwd:repo,sourceRoot,candidateRoot,candidate:{
  ...candidate,edits:[edit,{path:relative,find:'nonexistent-svg-anchor',replace:'invalid'}]}}),
  /edit find 불일치/);
 assert.equal(fs.readFileSync(target,'utf8'),original,'atomic validation preserves original art on failure');
 const applied=applyVibe2CandidateToSource({cwd:repo,sourceRoot,candidateRoot,candidate});
 assert.equal(applied.branch,'vibe2/candidate/existing-svg-asset');
 assert.deepEqual(applied.changedFiles,[relative]);
 assert.equal(fs.readFileSync(target,'utf8'),original.replace(old,edit.replace));
 assert.equal(fs.readFileSync(originalFile,'utf8'),original,'canonical live game source is not touched by isolated regression');
 const diff=spawnSync('git',['diff','--name-only'],{cwd:repo,encoding:'utf8',timeout:15000});
 assert.equal(diff.status,0);assert.equal(diff.stdout.trim(),project+'/'+relative);
});
test('natural owner request compiles two real source edits atomically through the existing V59 entry',t=>{
 const {repo,root}=fixture(t),source='const state={dead:false,hp:10};\nfunction hit(a){\n a.hp -= 1;\n}\nfunction reward(a){\n hit(a);\n a.hp += 1;\n}';
 fs.writeFileSync(path.join(root,'game.js'),source);
 const order={gameId:'rpg',ownerApproved:true,baseRevisionSha:revision,
  goal:'함수 hit에서 a.dead이면 중단해; 함수 reward에서 a.dead이면 중단해'};
 const candidate=createVibe59CodeCandidates({order,sourceRoot:root,responsibleFiles:['game.js'],target:'web',repositoryRoot:repo});
 assert.equal(candidate.vibe59CodeKind,'COMPLEX_OWNER_INTENT');assert.equal(candidate.edits.length,2);
 assert.equal(candidate.complexPlan.atomCount,2);
 assert.equal(candidate.vibe59DesignSteps[1].dependsOn[0],candidate.vibe59DesignSteps[0].id);
 const docs=new Map([['game.js',source]]);applyExactEdits(root,candidate.edits,{documents:docs});
 const game=vm.runInNewContext(docs.get('game.js')+';({hit,reward})');
 const dead={dead:true,hp:0};game.hit(dead);game.reward(dead);assert.equal(dead.hp,0);
 const alive={dead:false,hp:10};game.hit(alive);assert.equal(alive.hp,9);game.reward(alive);assert.equal(alive.hp,9);
 assert.equal(fs.readFileSync(path.join(root,'game.js'),'utf8'),source);
 assert.equal(candidate.runtimeVerified,false);
});
test('stale source, overlapping owner spans, cycle and ungrounded fields block unchanged originals',t=>{
 const {root}=fixture(t),source='const state={dead:false};\nfunction hit(a){\n a.hp-=1;\n}';
 const file=path.join(root,'game.js');fs.writeFileSync(file,source);
 const order={ownerApproved:true,baseRevisionSha:revision,goal:'함수 hit에서 a.dead이면 중단해'};
 const options={order,sourceRoot:root,responsibleFiles:['game.js'],target:'web',baseRevisionSha:revision};
 const plan=planComplexGameWork(options);assert.equal(plan.status,'BOUND');
 fs.appendFileSync(file,'\n// new revision');assert.throws(()=>createComplexGameCandidate({plan,sourceRoot:root}),/STALE_SOURCE/);
 assert.equal(planComplexGameWork({...options,sourceIndex:plan.index}).status,'BLOCKED');
 fs.writeFileSync(file,source);
 const overlap=planComplexGameWork({...options,order:{...order,goal:order.goal+'; 함수 hit에서 a.hp < 0이면 a.hp를 0로 설정해'}});
 assert.throws(()=>createComplexGameCandidate({plan:overlap,sourceRoot:root}),/OVERLAPPING/);
 const cycle=planComplexGameWork({...options,order:{...order,vibe59ComplexDependencies:{hit:['hit']}}});
 assert.equal(cycle.unresolved[0].code,'DEPENDENCY_CYCLE');
 assert.equal(planComplexGameWork({...options,order:{...order,goal:'함수 hit에서 a.unknown이면 중단해'}}).status,'BLOCKED');
 assert.equal(fs.readFileSync(file,'utf8'),source);
});
test('Roblox source candidates retain server ownership and distinct multi-file source evidence',t=>{
 const {repo,root}=fixture(t,'roblox');fs.mkdirSync(path.join(root,'server'));
 const files=['server/Hit.server.luau','server/Award.server.luau'];
 const sources=['local defaults = { dead = false }\nlocal function hit(a)\n a.hp -= 1\nend\n',
  'local defaults = { dead = false }\nlocal function award(a)\n a.hp += 1\nend\n'];
 files.forEach((f,i)=>fs.writeFileSync(path.join(root,f),sources[i]));
 const candidate=createVibe59CodeCandidates({sourceRoot:root,responsibleFiles:files,target:'roblox',repositoryRoot:repo,
  order:{gameId:'rpg',ownerApproved:true,baseRevisionSha:revision,goal:'함수 hit에서 a.dead이면 중단해; 함수 award에서 a.dead이면 중단해'}});
 assert.equal(candidate.edits.length,2);assert.ok(candidate.edits.every(e=>e.replace.includes('then return end')));
 assert.equal(candidate.complexPlan.atoms[0].beforeSha256,sourceDigest(sources[0]));
 assert.equal(candidate.sourceWrite,false);assert.equal(candidate.runtimeVerified,false);
});
test('counterexample repair rejects duplicate patches, stale evidence and unbounded retries',()=>{
 const original=sourceDigest('original'),mk=n=>({edits:[{path:'game.js',find:'old',replace:String(n)}]});
 const result=runCodegenCounterexampleRepair({sourceDigest:original,generate:({attempt})=>mk(attempt),
  evaluate:c=>c.edits[0].replace==='1'?{pass:true}:{pass:false,reproduced:true,failureSignature:'miss',responsibleSymbols:['hit']}});
 assert.equal(result.status,'CANDIDATE_VALIDATED');assert.equal(result.attempts.length,2);
 const duplicate=runCodegenCounterexampleRepair({sourceDigest:original,generate:()=>mk(0),
  evaluate:()=>({pass:false,reproduced:true,failureSignature:'miss',responsibleSymbols:['hit']})});
 assert.equal(duplicate.reason,'REPEATED_PATCH_FINGERPRINT');assert.equal(duplicate.attempts.length,1);
 const stale=runCodegenCounterexampleRepair({sourceDigest:original,generate:()=>mk(0),evaluate:()=>({pass:true}),failures:[{sourceDigest:'b'.repeat(64),reproduced:true,responsibleSymbols:['hit'],failureSignature:'miss'}]});
 assert.equal(stale.reason,'UNVERIFIED_COUNTEREXAMPLE');
});

// [회귀] 중복 후보로 예산을 낭비하지 않고 뒤따르는 새로운 패치만 평가한다.
test('counterexample repair skips duplicate fingerprints but tries a later grounded alternative',()=>{
 const sha=sourceDigest('original'),mk=n=>({edits:[{path:'game.js',find:'old',replace:String(n)}]});
 const evaluated=[];
 const result=runCodegenCounterexampleRepair({sourceDigest:sha,maxAttempts:3,approvedBudget:3,
  generate:({attempt,counterexamples})=>{
   if(attempt===2)assert.equal(counterexamples.length,1,'reproduced failure is retained');
   return mk(attempt===2?2:0);
  },
  evaluate:c=>{
   evaluated.push(c.edits[0].replace);
   return c.edits[0].replace==='2'?{pass:true,actualGamePlaytest:false}:
    {pass:false,reproduced:true,failureSignature:'hit-regression',responsibleSymbols:['hit']};
  }});
 assert.deepEqual(evaluated,['0','2']);
 assert.equal(result.status,'CANDIDATE_VALIDATED');
 assert.equal(result.attempts.length,2);
 assert.equal(result.counterexamples.length,1);
 assert.equal(result.sourceWrite,false);assert.equal(result.runtimeVerified,false);
});

test('counterexample repair skips known failed patch evidence and rejects malformed budgets',()=>{
 const sha=sourceDigest('original'),mk=n=>({edits:[{path:'game.js',find:'old',replace:String(n)}]});
 const fingerprint=sourceDigest(JSON.stringify(mk(0).edits)),evaluated=[];
 const options={sourceDigest:sha,maxAttempts:3,approvedBudget:3,
  failures:[{sourceDigest:sha,reproduced:true,failureSignature:'known-defect',
   responsibleSymbols:['hit'],patchFingerprint:fingerprint}],
  generate:({attempt})=>mk(attempt===0?0:3),
  evaluate:c=>{evaluated.push(c.edits[0].replace);return {pass:true,actualGamePlaytest:false}}
 };
 const result=runCodegenCounterexampleRepair(options);
 assert.equal(result.status,'CANDIDATE_VALIDATED');
 assert.deepEqual(evaluated,['3']);
 assert.equal(result.attempts.length,1);
 for(const budget of [Number.NaN,Infinity,1.5,0,-1,'3']){
  assert.throws(()=>runCodegenCounterexampleRepair({...options,maxAttempts:budget}),/VIBE2_REPAIR_CONTRACT/);
 }
});

test('real line-defense source prevents dead attacks and duplicate death rewards while normal combat stays identical',()=>{
 const root='web-games/line-defense';
 const index=buildGameSourceIndex({sourceRoot:root,responsibleFiles:['index.html']});
 const actual=index.files[0].source;
 const names=['team','hit','clamp','attackPower','killReward','onEnemyKilled'];
 const definitions=names.map(name=>{const s=index.symbols.find(s=>s.name===name);return actual.slice(s.start,s.end)}).join('\n');
 const run=source=>{
  const context=vm.createContext({innerWidth:420,Math});
  vm.runInContext('let save={killRewardLv:0};let s={time:10,stage:1,money:0,maxMoney:800,strikes:[],shake:0,ally:{hp:1200},enemy:{hp:1500}};'+source+';globalThis.api={team,hit,s};',context);
  return context.api;
 };
 const make=(extra={})=>({x:100,team:'enemy',dead:false,hp:100,cd:0,flash:0,atk:10,rate:1,range:50,speed:0,size:20,...extra});
 const baseline=run(definitions.replace('  if ((a.dead || t.dead)) return;','').replace('  if (f.dead) return;',''));
 const before=make({x:98,team:'ally'});baseline.team([make({dead:true,hp:0})],[before],'enemy',.016);
 assert.equal(before.hp,90,'original game reproduces dead attacker damaging a living unit');
 const game=run(definitions),ally=make({x:98,team:'ally'});
 game.team([make({dead:true,hp:0})],[ally],'enemy',.016);assert.equal(ally.hp,100);
 const attacker=make({team:'ally'}),target=make({hp:10,reward:5});
 game.hit(attacker,target,[target]);assert.equal(target.hp,0);assert.equal(target.dead,true);assert.equal(game.s.money,5);
 attacker.cd=0;game.hit(attacker,target,[target]);assert.equal(target.hp,0);assert.equal(game.s.money,5);
 const live=make({team:'ally'}),liveTarget=make();game.hit(live,liveTarget,[liveTarget]);assert.equal(liveTarget.hp,90);
 const miss=make({x:200,team:'ally',range:1});game.team([miss],[],'ally',.016);assert.equal(game.s.enemy.hp,1500);
 assert.match(actual,/KEY='jaewoon-line-defense-v1',TEST_KEY='jaewoon-line-defense-test-v1'/);
});

test('event-state-UI and bounded existing writes synthesize executable source without new save keys',t=>{
 const {repo,root}=fixture(t);
 const source='const state={ready:true,active:false,hp:10};\nfunction give(){state.hp=state.hp+1;}\nfunction render(){state.active=true;}\nfunction collect(){\n give();\n}\nfunction update(){\n state.hp = nextHp;\n}';
 fs.writeFileSync(path.join(root,'game.js'),source);
 const order={gameId:'rpg',ownerApproved:true,baseRevisionSha:revision,
  goal:'함수 collect에서 give 호출 뒤 render를 호출해; 함수 update에서 state.hp를 0에서 100까지 제한해'};
 const c=createVibe59CodeCandidates({order,sourceRoot:root,responsibleFiles:['game.js'],target:'web',repositoryRoot:repo});
 const docs=new Map([['game.js',source]]);applyExactEdits(root,c.edits,{documents:docs});
 const ctx={nextHp:120};vm.runInNewContext(docs.get('game.js')+';collect();update();globalThis.result=state;',ctx);
 assert.equal(ctx.result.active,true);assert.equal(ctx.result.hp,100);
 assert.equal(c.edits.length,2);assert.equal(c.runtimeVerified,false);
});

test('ten supported source fixtures produce actual candidates and deterministic behavior; thirteen steps defer the next wave',t=>{
 const {repo,root}=fixture(t);let baselineAttempts=0,attempts=0,verified=0;
 for(let fixtureId=0;fixtureId<10;fixtureId++){
  const source='const data={dead:false,hp:10};\nfunction hit(a){\n a.hp -= '+(fixtureId+1)+';\n}\nfunction award(a){\n a.hp += 1;\n}';
  fs.writeFileSync(path.join(root,'game.js'),source);
  const options={sourceRoot:root,responsibleFiles:['game.js'],target:'web',repositoryRoot:repo,
   order:{gameId:'rpg',ownerApproved:true,baseRevisionSha:revision,goal:'함수 hit에서 a.dead이면 중단해; 함수 award에서 a.dead이면 중단해'}};
  if(createVibe59CodeCandidate(options))baselineAttempts++;
  const c=createVibe59CodeCandidates(options);
  if(c.edits.length)attempts++;
  const docs=new Map([['game.js',source]]);applyExactEdits(root,c.edits,{documents:docs});
  const game=vm.runInNewContext(docs.get('game.js')+';({hit,award})'),a={dead:true,hp:0};game.hit(a);game.award(a);
  assert.equal(a.hp,0);verified++;
 }
 assert.equal(baselineAttempts,0);assert.equal(attempts,10);assert.equal(verified,10);
 const source='const data={dead:false};\n'+Array.from({length:13},(_,i)=>'function f'+i+'(a){a.hp -= 1;}').join('\n');
 fs.writeFileSync(path.join(root,'game.js'),source);
 const order={ownerApproved:true,goal:Array.from({length:13},(_,i)=>'함수 f'+i+'에서 a.dead이면 중단해').join('; ')};
 const plan=planComplexGameWork({order,sourceRoot:root,responsibleFiles:['game.js'],baseRevisionSha:revision});
 const c=createComplexGameCandidate({plan,sourceRoot:root});assert.equal(c.edits.length,12);
 assert.equal(c.complexPlan.deferredWaves.length,1);assert.equal(c.complexPlan.deferredWaves[0].dependsOnPreviousWave,true);
});

test('historical five zero-attempt inputs replay exact owner goals without fabricating broad coding success',()=>{
 const cases=JSON.parse(gunzipSync(fs.readFileSync('qa/vibe59-history.json.gz')));
 assert.equal(cases.length,5);let zeroAttemptBaseline=0,blocked=0;
 for(const row of cases){
  assert.equal(sourceDigest(row.goal),row.goalSha256);assert.equal(row.baselineRunId,40830930094);
  zeroAttemptBaseline+=row.baselineAttempts===0?1:0;
  const intent=compileComplexOwnerIntent({order:{selectedTask:row},target:row.target,baseRevisionSha:row.sourceRevision});
  assert.ok(intent.unresolved.length,row.id);blocked++;
  if(!row.ownerDirective)assert.equal(intent.ownerDirectiveReference.verifiedFromOwnerOrder,false);
 }
 assert.equal(zeroAttemptBaseline,5);assert.equal(blocked,5);
});

test('server-local state guards follow original nil validation and cannot run before state initialization',t=>{
 const {root}=fixture(t,'roblox');fs.mkdirSync(path.join(root,'server'));
 const source='local defaults = { dead = false }\nlocal function hit(player)\n local state = profiles[player]\n if not state then return end\n state.hp -= 1\nend\n';
 fs.writeFileSync(path.join(root,'server/Game.server.luau'),source);
 const options={order:{ownerApproved:true,goal:'함수 hit에서 state.dead이면 중단해'},sourceRoot:root,responsibleFiles:['server/Game.server.luau'],target:'roblox',baseRevisionSha:revision};
 const plan=planComplexGameWork(options);assert.equal(plan.status,'BOUND');
 const c=createComplexGameCandidate({plan,sourceRoot:root,target:'roblox'});
 assert.match(c.edits[0].replace,/if not state then return end\n\n  if state\.dead then return end/);
 fs.writeFileSync(path.join(root,'server/Game.server.luau'),source.replace(' if not state then return end\n',''));
 assert.equal(planComplexGameWork(options).status,'BLOCKED');
});

test('server-local native Luau executes emitted multi-file changes with live and dead actors',{skip:!process.env.VIBE2_LUAU_BINARY},t=>{
 const {root}=fixture(t,'roblox');fs.mkdirSync(path.join(root,'server'));
 const files=['server/Hit.server.luau','server/Award.server.luau'];
 const source=['local defaults = {dead=false}\nlocal function hit(a)\n a.hp -= 1\nend\n',
  'local defaults = {dead=false}\nlocal function award(a)\n a.hp += 1\nend\n'];
 files.forEach((f,i)=>fs.writeFileSync(path.join(root,f),source[i]));
 const plan=planComplexGameWork({sourceRoot:root,responsibleFiles:files,target:'roblox',baseRevisionSha:revision,
  order:{ownerApproved:true,goal:'함수 hit에서 a.dead이면 중단해; 함수 award에서 a.dead이면 중단해'}});
 const candidate=createComplexGameCandidate({plan,sourceRoot:root,target:'roblox'}),docs=new Map(files.map((f,i)=>[f,source[i]]));
 applyExactEdits(root,candidate.edits,{documents:docs});
 const code=[...docs.values()].join('\n')+'\nlocal a={dead=true,hp=0}\nhit(a)\naward(a)\nassert(a.hp==0)\na.dead=false\na.hp=10\nhit(a)\nassert(a.hp==9)\naward(a)\nassert(a.hp==10)\nprint("NATIVE_LUAU_COMPLEX=PASS; ROBLOX_PLAYTEST=UNVERIFIED")';
 const file=path.join(root,'probe.luau');fs.writeFileSync(file,code);
 const result=spawnSync(process.env.VIBE2_LUAU_BINARY,[file],{encoding:'utf8',timeout:10000});
 assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/NATIVE_LUAU_COMPLEX=PASS/);
 assert.equal(candidate.runtimeVerified,false);
});

test('ordinary owner combat language discovers actual damage, caller and iteration owners without supplied function names',t=>{
 const {repo,root}=fixture(t);
 const current=fs.readFileSync('web-games/line-defense/index.html','utf8');
 const baseline=current.replace('\n  if ((a.dead || t.dead)) return;','').replace('\n  if (f.dead) return;','');
 fs.writeFileSync(path.join(root,'index.html'),baseline);
 const order={gameId:'rpg',ownerApproved:true,baseRevisionSha:revision,
  goal:'죽은 유닛은 공격하지 않게 해; 죽은 대상은 다시 공격하지 않게 해'};
 const c=createVibe59CodeCandidates({order,sourceRoot:root,responsibleFiles:['index.html'],target:'web',repositoryRoot:repo});
 assert.equal(c.edits.length,2);assert.equal(c.complexPlan.requirementCount,2);
 const docs=new Map([['index.html',baseline]]);applyExactEdits(root,c.edits,{documents:docs});
 assert.equal(docs.get('index.html'),current,'the engine reproduces the exact real game repair from source evidence');
 assert.equal(c.complexPlan.atoms.flatMap(a=>a.requirementIds).length,3);
 assert.ok(c.complexPlan.atoms.some(a=>a.derivation==='CALL_ARGUMENT_TO_EXISTING_ITERATION_PARAMETER'));
});

// 회귀: 기존 호출 뒤 연결에서도 실제 인자와 Luau 선언 순서를 증명한다.
test('existing-call forwards exact owner parameters and executes WEB state plus display',t=>{
 const {repo,root}=fixture(t);
 const source='const state={hp:0,shown:0};\nfunction give(){state.hp+=1;}\nfunction render(actor){state.shown=state.hp+actor.offset;}\nfunction collect(actor){\n give();\n}\n';
 fs.writeFileSync(path.join(root,'game.js'),source);
 const options={sourceRoot:root,responsibleFiles:['game.js'],target:'web',repositoryRoot:repo,
  order:{gameId:'rpg',ownerApproved:true,baseRevisionSha:revision,goal:'함수 collect에서 give 호출 뒤 render를 호출해'}};
 const candidate=createVibe59CodeCandidates(options);
 assert.match(candidate.edits[0].replace,/render\(actor\);/);
 const docs=new Map([['game.js',source]]);applyExactEdits(root,candidate.edits,{documents:docs});
 const result=vm.runInNewContext(docs.get('game.js')+'collect({offset:4});collect({offset:7});state;');
 assert.equal(result.hp,2);assert.equal(result.shown,9);
 assert.equal(candidate.runtimeVerified,false);
 assert.equal(fs.readFileSync(path.join(root,'game.js'),'utf8'),source);
});

test('existing-call blocks guessed, default, rest and shadowed argument bindings',t=>{
 const {root}=fixture(t);
 const source='function give(){}\nfunction render(actor){}\nfunction collect(actor){\n give();\n}\n';
 const options={sourceRoot:root,responsibleFiles:['game.js'],baseRevisionSha:revision,
  order:{ownerApproved:true,goal:'함수 collect에서 give 호출 뒤 render를 호출해'}};
 for(const changed of [source.replace('render(actor)','render(other)'),
  source.replace('render(actor)','render(actor=1)'),source.replace('render(actor)','render(...actor)'),
  source.replace('give();','let actor={};\n give();'),
  source.replace('collect(actor)','collect(render)')]){
  fs.writeFileSync(path.join(root,'game.js'),changed);
  const plan=planComplexGameWork(options);
  assert.equal(plan.status,'BLOCKED');assert.equal(plan.unresolved[0].code,'CALL_PARAMETER_BINDING_UNPROVEN');
  assert.equal(fs.readFileSync(path.join(root,'game.js'),'utf8'),changed);
 }
});

// 회귀: 순서가 다른 시그니처도 같은 이름의 기존 매개변수만 사용한다.
test('existing-call forwards reordered verified WEB arguments and preserves original source',t=>{
 const {repo,root}=fixture(t);
 const source='const state={hp:0,shown:0};\nfunction give(){state.hp+=1;}\nfunction render(offset,actor){state.shown=state.hp+offset+actor.bias;}\nfunction collect(actor,offset){\n give();\n}\n';
 fs.writeFileSync(path.join(root,'game.js'),source);
 const options={sourceRoot:root,responsibleFiles:['game.js'],target:'web',repositoryRoot:repo,
  order:{gameId:'rpg',ownerApproved:true,baseRevisionSha:revision,goal:'함수 collect에서 give 호출 뒤 render를 호출해'}};
 const candidate=createVibe59CodeCandidates(options);
 assert.match(candidate.edits[0].replace,/render\(offset, actor\);/);
 const docs=new Map([['game.js',source]]);applyExactEdits(root,candidate.edits,{documents:docs});
 const state=vm.runInNewContext(docs.get('game.js')+'collect({bias:2},3);collect({bias:4},5);state;');
 assert.equal(state.hp,2);assert.equal(state.shown,11);
 assert.equal(fs.readFileSync(path.join(root,'game.js'),'utf8'),source);
 const subset=source.replace('render(offset,actor){state.shown=state.hp+offset+actor.bias;}',
  'render(offset){state.shown=state.hp+offset;}');
 fs.writeFileSync(path.join(root,'game.js'),subset);
 const subsetCandidate=createVibe59CodeCandidates(options);
 assert.match(subsetCandidate.edits[0].replace,/render\(offset\);/);
 const subsetDocs=new Map([['game.js',subset]]);
 applyExactEdits(root,subsetCandidate.edits,{documents:subsetDocs});
 const subsetState=vm.runInNewContext(subsetDocs.get('game.js')+'collect({bias:9},5);state;');
 assert.equal(subsetState.hp,1);assert.equal(subsetState.shown,6);
 assert.equal(fs.readFileSync(path.join(root,'game.js'),'utf8'),subset);
 fs.writeFileSync(path.join(root,'game.js'),source.replace('render(offset,actor)','render(offset,missing)'));
 const blocked=planComplexGameWork({...options,baseRevisionSha:revision});
 assert.equal(blocked.status,'BLOCKED');assert.equal(blocked.unresolved[0].code,'CALL_PARAMETER_BINDING_UNPROVEN');
});

test('server-local Luau forwards reordered typed parameter names without inventing values',t=>{
 const {root}=fixture(t,'roblox');fs.mkdirSync(path.join(root,'server'));
 const file='server/Game.server.luau';
 const source='local score = 0\nlocal function give()\n score += 1\nend\n'+
  'local function render(offset: number, actor: any)\n actor.shown = score + offset\nend\n'+
  'local function collect(actor: any, offset: number)\n give()\nend\n';
 fs.writeFileSync(path.join(root,file),source);
 const options={sourceRoot:root,responsibleFiles:[file],target:'roblox',baseRevisionSha:revision,
  order:{ownerApproved:true,goal:'함수 collect에서 give 호출 뒤 render를 호출해'}};
 const plan=planComplexGameWork(options);assert.equal(plan.status,'BOUND');
 const candidate=createComplexGameCandidate({plan,sourceRoot:root,target:'roblox'});
 assert.match(candidate.edits[0].replace,/render\(offset, actor\)/);
 const docs=new Map([[file,source]]);applyExactEdits(root,candidate.edits,{documents:docs});
 if(process.env.VIBE2_LUAU_BINARY){
  const probe=path.join(root,'probe.luau');
  fs.writeFileSync(probe,docs.get(file)+'\nlocal actor={shown=0}\ncollect(actor,3)\nassert(actor.shown==4)\ncollect(actor,5)\nassert(actor.shown==7)\nprint("REORDERED_LUAU=PASS")');
  const result=spawnSync(process.env.VIBE2_LUAU_BINARY,[probe],{encoding:'utf8',timeout:10000});
  assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/REORDERED_LUAU=PASS/);
 }
 assert.equal(fs.readFileSync(path.join(root,file),'utf8'),source);
});

// [회귀] 실제 기존 인자를 전달하는 호출 뒤에도 소스 근거를 보존하면서 기존 UI 함수를 연결한다.
test('WEB existing-call anchors existing argument-bearing calls and preserves displayed state',t=>{
 const {repo,root}=fixture(t);
 const source='const state={hp:0,shown:0};\nfunction give(actor){state.hp+=actor.gain;}\nfunction render(actor){state.shown=state.hp+actor.offset;}\nfunction collect(actor){\n give(actor);\n}\n';
 fs.writeFileSync(path.join(root,'game.js'),source);
 const options={sourceRoot:root,responsibleFiles:['game.js'],target:'web',repositoryRoot:repo,
  order:{gameId:'rpg',ownerApproved:true,baseRevisionSha:revision,goal:'함수 collect에서 give 호출 뒤 render를 호출해'}};
 const candidate=createVibe59CodeCandidates(options);
 assert.match(candidate.edits[0].replace,/give\(actor\);\s+render\(actor\);/);
 const docs=new Map([['game.js',source]]);applyExactEdits(root,candidate.edits,{documents:docs});
 const state=vm.runInNewContext(docs.get('game.js')+'collect({gain:2,offset:3});collect({gain:4,offset:5});state;');
 assert.equal(state.hp,6);assert.equal(state.shown,11);
 assert.equal(candidate.runtimeVerified,false);
 assert.equal(fs.readFileSync(path.join(root,'game.js'),'utf8'),source);
});
test('WEB existing-call anchors original property arguments without inventing values',t=>{
 const {repo,root}=fixture(t);
 const source='const state={hp:0,shown:0};\nfunction give(value){state.hp+=value;}\nfunction render(actor){state.shown=state.hp+actor.bias;}\nfunction collect(actor){\n give(actor.gain);\n}\n';
 fs.writeFileSync(path.join(root,'game.js'),source);
 const options={sourceRoot:root,responsibleFiles:['game.js'],target:'web',repositoryRoot:repo,
  order:{gameId:'rpg',ownerApproved:true,baseRevisionSha:revision,goal:'함수 collect에서 give 호출 뒤 render를 호출해'}};
 const candidate=createVibe59CodeCandidates(options),docs=new Map([['game.js',source]]);
 applyExactEdits(root,candidate.edits,{documents:docs});
 assert.match(candidate.edits[0].replace,/give\(actor\.gain\);\s+render\(actor\);/);
 const state=vm.runInNewContext(docs.get('game.js')+'collect({gain:3,bias:7});state;');
 assert.equal(state.hp,3);assert.equal(state.shown,10);
 assert.equal(fs.readFileSync(path.join(root,'game.js'),'utf8'),source);
});
test('complex existing calls, duplicate anchors and string literals remain fail-closed',t=>{
 const {root}=fixture(t);
 const original='function give(v){}\nfunction render(actor){}\nfunction collect(actor){\n give(actor);\n}\n';
 const options={sourceRoot:root,responsibleFiles:['game.js'],target:'web',baseRevisionSha:revision,
  order:{ownerApproved:true,goal:'함수 collect에서 give 호출 뒤 render를 호출해'}};
 for(const modified of [
  original.replace('give(actor);','give(calculate(actor));'),
  original.replace('give(actor);','give("actor");'),
  original.replace('give(actor);','give(actor);\n give(actor);')
 ]){
  fs.writeFileSync(path.join(root,'game.js'),modified);
  const plan=planComplexGameWork(options);
  if(plan.status==='BOUND')assert.throws(()=>createComplexGameCandidate({plan,sourceRoot:root}),/CALL_ANCHOR/);
  else assert.ok(plan.unresolved.some(row=>/CALL_ANCHOR|CALL_OWNERSHIP/.test(row.code)));
  assert.equal(fs.readFileSync(path.join(root,'game.js'),'utf8'),modified);
 }
});
test('server-local native Luau connects verified parameterized call without changing source',t=>{
 const {root}=fixture(t,'roblox');fs.mkdirSync(path.join(root,'server'));
 const file='server/Game.server.luau';
 const source='local score=0\nlocal function give(actor: any)\n score += actor.gain\nend\n'+
  'local function render(actor: any)\n actor.shown=score\nend\n'+
  'local function collect(actor: any)\n give(actor)\nend\n';
 fs.writeFileSync(path.join(root,file),source);
 const options={sourceRoot:root,responsibleFiles:[file],target:'roblox',baseRevisionSha:revision,
  order:{ownerApproved:true,goal:'함수 collect에서 give 호출 뒤 render를 호출해'}};
 const plan=planComplexGameWork(options);assert.equal(plan.status,'BOUND');
 const candidate=createComplexGameCandidate({plan,sourceRoot:root,target:'roblox'});
 assert.match(candidate.edits[0].replace,/give\(actor\)\s+render\(actor\)/);
 const docs=new Map([[file,source]]);applyExactEdits(root,candidate.edits,{documents:docs});
 if(process.env.VIBE2_LUAU_BINARY){
  const probe=path.join(root,'probe.luau');
  fs.writeFileSync(probe,docs.get(file)+'\nlocal actor={gain=2,shown=0}\ncollect(actor)\nassert(actor.shown==2)\ncollect(actor)\nassert(actor.shown==4)');
  const result=spawnSync(process.env.VIBE2_LUAU_BINARY,[probe],{encoding:'utf8',timeout:10000});
  assert.equal(result.status,0,result.stderr);
 }
 assert.equal(fs.readFileSync(path.join(root,file),'utf8'),source);
});

test('server-local native Luau existing-call preserves typed arguments and blocks later local declarations',t=>{
 const {root}=fixture(t,'roblox');fs.mkdirSync(path.join(root,'server'));
 const file='server/Game.server.luau';
 const give='local score = 0\nlocal function give()\n score += 1\nend\n';
 const render='local function render(actor: any)\n actor.shown = score\nend\n';
 const collect='local function collect(actor: any)\n give()\nend\n';
 const options={sourceRoot:root,responsibleFiles:[file],target:'roblox',baseRevisionSha:revision,
  order:{ownerApproved:true,goal:'함수 collect에서 give 호출 뒤 render를 호출해'}};
 fs.writeFileSync(path.join(root,file),give+render+collect);
 const plan=planComplexGameWork(options);assert.equal(plan.status,'BOUND');
 const candidate=createComplexGameCandidate({plan,sourceRoot:root,target:'roblox'});
 assert.match(candidate.edits[0].replace,/give\(\)\s+render\(actor\)/);
 const docs=new Map([[file,give+render+collect]]);applyExactEdits(root,candidate.edits,{documents:docs});
 if(process.env.VIBE2_LUAU_BINARY){
  const probe=path.join(root,'probe.luau');
  fs.writeFileSync(probe,docs.get(file)+'\nlocal actor={shown=0}\ncollect(actor)\nassert(actor.shown==1)\ncollect(actor)\nassert(actor.shown==2)\nprint("EXISTING_CALL_LUAU=PASS")');
  const result=spawnSync(process.env.VIBE2_LUAU_BINARY,[probe],{encoding:'utf8',timeout:10000});
  assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/EXISTING_CALL_LUAU=PASS/);
 }
 fs.writeFileSync(path.join(root,file),give+collect+render);
 const blocked=planComplexGameWork(options);
 assert.equal(blocked.status,'BLOCKED');assert.equal(blocked.unresolved[0].code,'CALL_PARAMETER_BINDING_UNPROVEN');
});

test('WEB owner event changes state, refreshes existing UI and saves exactly once per event in one edit',t=>{
 const {repo,root}=fixture(t);
 const source='const state={hp:0};\nconst ui={textContent:""};\nconst storage={writes:0,data:null};\n'+
  'function mutate(actor){state.hp+=actor.gain;}\n'+
  'function render(actor){ui.textContent=String(state.hp+actor.bias);}\n'+
  'function save(){storage.writes++;storage.data=JSON.stringify(state);}\n'+
  'function collect(actor){\n mutate(actor);\n}\n';
 fs.writeFileSync(path.join(root,'game.js'),source);
 const options={sourceRoot:root,responsibleFiles:['game.js'],target:'web',repositoryRoot:repo,
  order:{gameId:'rpg',ownerApproved:true,baseRevisionSha:revision,
   goal:'함수 collect에서 mutate 호출 뒤 render 호출하고 save를 호출해'}};
 const candidate=createVibe59CodeCandidates(options);
 assert.equal(candidate.vibe59CodeKind,'COMPLEX_OWNER_INTENT');
 assert.equal(candidate.edits.length,1);
 assert.equal(candidate.complexPlan.atomCount,1);
 assert.equal(candidate.complexPlan.atoms[0].inputSymbols.length,3);
 assert.deepEqual(candidate.complexPlan.atoms[0].effects,['CALL_EXISTING_FUNCTION:render','CALL_EXISTING_FUNCTION:save']);
 assert.match(candidate.edits[0].replace,/mutate\(actor\);\s+render\(actor\);\s+save\(\);/);
 const docs=new Map([['game.js',source]]);applyExactEdits(root,candidate.edits,{documents:docs});
 const result=vm.runInNewContext(docs.get('game.js')+
  'collect({gain:3,bias:2});collect({gain:4,bias:1});({hp:state.hp,label:ui.textContent,writes:storage.writes,data:storage.data});');
 assert.equal(result.hp,7);
 assert.equal(result.label,'8');
 assert.equal(result.writes,2);
 assert.equal(JSON.parse(result.data).hp,7);
 assert.equal(fs.readFileSync(path.join(root,'game.js'),'utf8'),source);
 assert.equal(candidate.runtimeVerified,false);
});

test('WEB chain blocks duplicate save, missing UI, mismatched arguments and stale source without writing',t=>{
 const {root}=fixture(t);
 const good='const state={hp:0};\nfunction mutate(actor){state.hp+=actor.gain;}\n'+
  'function render(actor){state.shown=state.hp;}\nfunction save(){state.saved=state.hp;}\n'+
  'function collect(actor){mutate(actor);}\n';
 const options={sourceRoot:root,responsibleFiles:['game.js'],target:'web',baseRevisionSha:revision,
  order:{ownerApproved:true,goal:'함수 collect에서 mutate 호출 뒤 render 호출하고 save를 호출해'}};
 for(const changed of [
  good.replace('function save(){state.saved=state.hp;}\n',''),
  good.replace('function render(actor)','function render(unknown)'),
  good.replace('mutate(actor);}','mutate(actor);save();}'),
  good.replace('function save(){','function save(actor=1){')
 ]){
  fs.writeFileSync(path.join(root,'game.js'),changed);
  const plan=planComplexGameWork(options);
  assert.equal(plan.status,'BLOCKED');
  assert.ok(plan.unresolved.some(row=>/CALL_(OWNERSHIP|PARAMETER_BINDING)/.test(row.code)));
  assert.equal(fs.readFileSync(path.join(root,'game.js'),'utf8'),changed);
 }
 fs.writeFileSync(path.join(root,'game.js'),good);
 const plan=planComplexGameWork(options);assert.equal(plan.status,'BOUND');
 fs.writeFileSync(path.join(root,'game.js'),good+'// main moved\n');
 assert.throws(()=>createComplexGameCandidate({plan,sourceRoot:root}),/STALE_SOURCE/);
});

test('Roblox server Luau chain preserves owned state, display, save and source without new RemoteEvents',t=>{
 const {root}=fixture(t,'roblox');fs.mkdirSync(path.join(root,'server'));
 const file='server/Game.server.luau';
 const source='local state={hp=0,shown=0,saved=0,writes=0}\n'+
  'local function mutate(actor: any)\n state.hp += actor.gain\nend\n'+
  'local function render(actor: any)\n state.shown = state.hp + actor.bias\nend\n'+
  'local function save()\n state.saved = state.hp\n state.writes += 1\nend\n'+
  'local function collect(actor: any)\n mutate(actor)\nend\n';
 fs.writeFileSync(path.join(root,file),source);
 const options={sourceRoot:root,responsibleFiles:[file],target:'roblox',baseRevisionSha:revision,
  order:{ownerApproved:true,goal:'함수 collect에서 mutate 호출 뒤 render 호출하고 save를 호출해'}};
 const plan=planComplexGameWork(options);assert.equal(plan.status,'BOUND');
 const candidate=createComplexGameCandidate({plan,sourceRoot:root,target:'roblox'});
 assert.equal(candidate.edits.length,1);
 assert.match(candidate.edits[0].replace,/mutate\(actor\)\s+render\(actor\)\s+save\(\)/);
 const docs=new Map([[file,source]]);applyExactEdits(root,candidate.edits,{documents:docs});
 if(process.env.VIBE2_LUAU_BINARY){
  const probe=path.join(root,'probe.luau');fs.writeFileSync(probe,docs.get(file)+
   '\ncollect({gain=3,bias=2})\nassert(state.hp==3 and state.shown==5 and state.saved==3 and state.writes==1)\n'+
   'collect({gain=4,bias=1})\nassert(state.hp==7 and state.shown==8 and state.saved==7 and state.writes==2)\n'+
   'print("SERVER_CHAIN_LUAU=PASS; ROBLOX_PLAYTEST=UNVERIFIED")');
  const run=spawnSync(process.env.VIBE2_LUAU_BINARY,[probe],{encoding:'utf8',timeout:10000});
  assert.equal(run.status,0,run.stderr);assert.match(run.stdout,/SERVER_CHAIN_LUAU=PASS/);
 }
 assert.equal(fs.readFileSync(path.join(root,file),'utf8'),source);
 fs.writeFileSync(path.join(root,file),source.replace('local function save()\n','local function save(missing: any)\n'));
 assert.equal(planComplexGameWork(options).status,'BLOCKED');
});

test('name-free WEB request locates state writer, UI reader and original save without changing save key',t=>{
 const {repo,root}=fixture(t);
 const source='const state={hp:0};\nconst hud={textContent:""};\nconst data={writes:[],values:{}};\n'+
  'const localStorage={setItem(key,value){data.writes.push(key);data.values[key]=value;}};\n'+
  'function change(actor){state.hp+=actor.gain;}\n'+
  'function paint(actor){hud.textContent=String(state.hp+actor.bias);}\n'+
  'function persist(){localStorage.setItem("keep-save-key",JSON.stringify(state));}\n'+
  'function onClick(actor){\n change(actor);\n}\n';
 fs.writeFileSync(path.join(root,'game.js'),source);
 const options={sourceRoot:root,responsibleFiles:['game.js'],target:'web',repositoryRoot:repo,
  order:{gameId:'rpg',ownerApproved:true,baseRevisionSha:revision,goal:'상태 변경 후 화면 갱신하고 저장해'}};
 const sourcePlan=planComplexGameWork({...options,baseRevisionSha:revision});
 assert.equal(sourcePlan.status,'BOUND',JSON.stringify(sourcePlan.unresolved));
 const candidate=createVibe59CodeCandidates(options);
 assert.equal(candidate.edits.length,1);
 assert.match(candidate.edits[0].replace,/change\(actor\);\s+paint\(actor\);\s+persist\(\);/);
 assert.equal(candidate.complexPlan.atoms[0].derivation,'ORIGINAL_STATE_WRITE_UI_READ_STATIC_SAVE_CALL');
 assert.equal(candidate.complexPlan.atoms[0].inputSymbols.length,3);
 const docs=new Map([['game.js',source]]);
 applyExactEdits(root,candidate.edits,{documents:docs});
 const result=vm.runInNewContext(docs.get('game.js')+
  'onClick({gain:2,bias:3});onClick({gain:4,bias:2});({hp:state.hp,text:hud.textContent,writes:data.writes,saved:JSON.parse(data.values["keep-save-key"])});');
 assert.equal(result.hp,6);
 assert.equal(result.text,'8');
 assert.deepEqual([...result.writes],['keep-save-key','keep-save-key']);
 assert.equal(result.saved.hp,6);
 assert.equal(fs.readFileSync(path.join(root,'game.js'),'utf8'),source);
});

test('name-free WEB discovery blocks ambiguous event owners, dynamic save keys and duplicate view functions',t=>{
 const {root}=fixture(t),base='const state={hp:0};\nconst hud={textContent:""};\n'+
  'function change(actor){state.hp+=actor.gain;}\n'+
  'function paint(){hud.textContent=String(state.hp);}\n'+
  'function persist(){localStorage.setItem("keep-key",JSON.stringify(state));}\n'+
  'function click(actor){change(actor);}\n';
 const options={sourceRoot:root,responsibleFiles:['game.js'],target:'web',baseRevisionSha:revision,
  order:{ownerApproved:true,goal:'상태가 바뀌면 화면을 갱신하고 저장해'}};
 for(const text of [
  base+'function second(actor){change(actor);}\n',
  base.replace('function persist()', 'function persist2()').replace('"keep-key"','unknownKey'),
  base+'function extra(){hud.textContent=String(state.hp);}\n',
  base.replace('function click(actor){change(actor);}','function click(actor){change(actor);paint();}')
 ]){
  fs.writeFileSync(path.join(root,'game.js'),text);
  const plan=planComplexGameWork(options);
  assert.equal(plan.status,'BLOCKED');
  assert.ok(plan.unresolved.some(row=>row.code==='SEMANTIC_STATE_UI_SAVE_OWNER_UNPROVEN'),JSON.stringify(plan.unresolved));
  assert.equal(fs.readFileSync(path.join(root,'game.js'),'utf8'),text);
 }
});

test('Roblox name-free instruction edits multiple server damage files atomically and ignores client code',t=>{
 const {root}=fixture(t,'roblox');fs.mkdirSync(path.join(root,'server'));fs.mkdirSync(path.join(root,'client'));
 const files=['server/Hit.server.luau','server/Combat.server.luau','client/Display.client.luau'];
 const sources=[
  'local defaults={dead=false}\nlocal function damage(victim: any)\n victim.hp -= 4\nend\n',
  'local defaults={dead=false}\nlocal function strike(victim: any)\n victim.hp -= 2\nend\n',
  'local defaults={dead=false}\nlocal function damage(victim: any)\n victim.hp -= 99\nend\n'
 ];
 files.forEach((file,i)=>fs.writeFileSync(path.join(root,file),sources[i]));
 const options={sourceRoot:root,responsibleFiles:files,target:'roblox',baseRevisionSha:revision,
  order:{ownerApproved:true,goal:'서버의 모든 전투 함수에서 죽은 대상 공격 금지'}};
 const plan=planComplexGameWork(options);
 assert.equal(plan.status,'BOUND',JSON.stringify(plan.unresolved));
 assert.equal(plan.nodes.length,2);
 const candidate=createComplexGameCandidate({plan,sourceRoot:root,target:'roblox'});
 assert.equal(candidate.edits.length,2);
 assert.deepEqual(candidate.edits.map(row=>row.path).sort(),files.slice(0,2).sort());
 assert.equal(candidate.complexPlan.atoms.every(atom=>atom.derivation==='ORIGINAL_SERVER_HP_WRITE_MULTI_FILE'),true);
 const docs=new Map(files.map((file,i)=>[file,sources[i]]));
 applyExactEdits(root,candidate.edits,{documents:docs});
 for(const file of files.slice(0,2))assert.match(docs.get(file),/if victim\.dead then return end/);
 assert.equal(docs.get(files[2]),sources[2]);
 for(let i=0;i<files.length;i++)assert.equal(fs.readFileSync(path.join(root,files[i]),'utf8'),sources[i]);
 if(process.env.VIBE2_LUAU_BINARY){
  for(let i=0;i<2;i++){
   const probe=path.join(root,'probe'+i+'.luau');
   fs.writeFileSync(probe,docs.get(files[i])+'\nlocal victim={dead=true,hp=10}\n'+
    (i===0?'damage(victim)':'strike(victim)')+'\nassert(victim.hp==10)\n'+
    'victim.dead=false\n'+(i===0?'damage(victim)':'strike(victim)')+
    '\nassert(victim.hp=='+(i===0?'6':'8')+')\n');
   const run=spawnSync(process.env.VIBE2_LUAU_BINARY,[probe],{encoding:'utf8',timeout:10000});
   assert.equal(run.status,0,run.stderr);
  }
 }
 fs.writeFileSync(path.join(root,files[1]),sources[1]+'-- stale source\n');
 assert.throws(()=>createComplexGameCandidate({plan,sourceRoot:root,target:'roblox'}),/STALE_SOURCE/);
});

test('Roblox multi-file guard blocks absent death state, client-only targets and more than twelve writes',t=>{
 const {root}=fixture(t,'roblox');fs.mkdirSync(path.join(root,'server'));fs.mkdirSync(path.join(root,'client'));
 const names=['server/A.server.luau','server/B.server.luau'];
 const files=[...names,'client/C.client.luau'];
 const source='local defaults={dead=false}\nlocal function hit(target: any)\n target.hp -= 1\nend\n';
 files.forEach(file=>fs.writeFileSync(path.join(root,file),source));
 const order={ownerApproved:true,goal:'모든 서버 공격 함수에서 죽은 대상을 공격하지 않게 해'};
 const options={sourceRoot:root,responsibleFiles:files,target:'roblox',baseRevisionSha:revision,order};
 assert.equal(planComplexGameWork(options).status,'BOUND');
 fs.writeFileSync(path.join(root,names[1]),source.replace('dead=false','alive=true'));
 const missing=planComplexGameWork(options);
 assert.equal(missing.status,'BLOCKED');
 assert.ok(missing.unresolved.some(row=>row.code==='SEMANTIC_DEATH_FIELD_UNPROVEN'));
 const onlyClient=planComplexGameWork({...options,responsibleFiles:[files[2]]});
 assert.equal(onlyClient.status,'BLOCKED');
 for(let i=0;i<13;i++){
  const name='server/D'+i+'.server.luau';files.push(name);
  fs.writeFileSync(path.join(root,name),source);
 }
 fs.writeFileSync(path.join(root,names[1]),source);
 const over=planComplexGameWork({...options,responsibleFiles:files});
 assert.equal(over.status,'BLOCKED');
 assert.ok(over.unresolved.some(row=>row.code==='SEMANTIC_MULTIFILE_OWNER_UNPROVEN'));
});


test('name-free WEB semantic intent follows an actual non-state object through display and persistent storage',t=>{
 const {repo,root}=fixture(t);
 const source='const inventory={coins:0};\nconst label={textContent:""};\n'+
  'const localStorage={saved:{},writes:0,setItem(key,value){this.saved[key]=value;this.writes++;}};\n'+
  'function collect(item){inventory.coins+=item.count;}\n'+
  'function redraw(item){label.textContent=String(inventory.coins+item.bonus);}\n'+
  'function persist(){localStorage.setItem("inventory-v1",JSON.stringify(inventory));}\n'+
  'function onReward(item){\n collect(item);\n}\n';
 fs.writeFileSync(path.join(root,'game.js'),source);
 const options={sourceRoot:root,responsibleFiles:['game.js'],target:'web',repositoryRoot:repo,
  order:{gameId:'rpg',ownerApproved:true,baseRevisionSha:revision,goal:'상태 변경 후 화면 갱신하고 저장해'}};
 const plan=planComplexGameWork({...options,baseRevisionSha:revision});
 assert.equal(plan.status,'BOUND',JSON.stringify(plan.unresolved));
 const candidate=createVibe59CodeCandidates(options);
 assert.equal(candidate.edits.length,1);
 assert.match(candidate.edits[0].replace,/collect\(item\);\s+redraw\(item\);\s+persist\(\);/);
 const docs=new Map([['game.js',source]]);
 applyExactEdits(root,candidate.edits,{documents:docs});
 const result=vm.runInNewContext(docs.get('game.js')+
  'onReward({count:2,bonus:3});onReward({count:4,bonus:1});'+
  '({coins:inventory.coins,text:label.textContent,writes:localStorage.writes,saved:JSON.parse(localStorage.saved["inventory-v1"])});');
 assert.equal(result.coins,6);
 assert.equal(result.text,'7');
 assert.equal(result.writes,2);
 assert.equal(result.saved.coins,6);
 assert.equal(fs.readFileSync(path.join(root,'game.js'),'utf8'),source);
});

test('name-free WEB object discovery refuses shadowed, unrelated and competing original state owners',t=>{
 const {root}=fixture(t);
 const first='const inventory={coins:0};\nconst label={textContent:""};\n'+
  'function collect(item){inventory.coins+=item.count;}\n'+
  'function redraw(){label.textContent=String(inventory.coins);}\n'+
  'function persist(){localStorage.setItem("slot-v1",JSON.stringify(inventory));}\n'+
  'function onReward(item){collect(item);}\n';
 const options={sourceRoot:root,responsibleFiles:['game.js'],target:'web',baseRevisionSha:revision,
  order:{ownerApproved:true,goal:'상태 변경 후 화면 갱신하고 저장해'}};
 const second=first.replaceAll('inventory','wallet').replaceAll('coins','gold')
  .replaceAll('label','badge').replaceAll('collect','earn')
  .replaceAll('redraw','paint').replaceAll('persist','save')
  .replaceAll('onReward','onPurchase').replace('slot-v1','wallet-v1');
 for(const content of [
  first.replace('String(inventory.coins)','String(other.coins)'),
  first.replace('function redraw(){','function redraw(){const inventory={coins:300};'),
  first.replace('const inventory={coins:0};','function make(){const inventory={coins:0};}'),
  first+'\n'+second
 ]){
  fs.writeFileSync(path.join(root,'game.js'),content);
  const plan=planComplexGameWork(options);
  assert.equal(plan.status,'BLOCKED',JSON.stringify(plan.unresolved));
  assert.ok(plan.unresolved.some(row=>row.code==='SEMANTIC_STATE_UI_SAVE_OWNER_UNPROVEN'));
  assert.equal(fs.readFileSync(path.join(root,'game.js'),'utf8'),content);
 }
});


test('Roblox original server HP event binds one client receiver to its existing UI renderer',t=>{
 const {root}=fixture(t,'roblox');fs.mkdirSync(path.join(root,'server'));fs.mkdirSync(path.join(root,'client'));
 const files=['server/Combat.server.luau','client/Hud.client.luau'];
 const server='local ReplicatedStorage = game:GetService("ReplicatedStorage")\n'+
  'local HealthChanged = ReplicatedStorage:WaitForChild("HEALTH_CHANGED")\n'+
  'local function damage(player: any, state: any, amount: number)\n'+
  ' state.hp -= amount\n HealthChanged:FireClient(player, state.hp)\nend\n';
 const client='local ReplicatedStorage = game:GetService("ReplicatedStorage")\n'+
  'local HealthChanged = ReplicatedStorage:WaitForChild("HEALTH_CHANGED")\n'+
  'local label={Text=""}\nlocal lastHp=0\n'+
  'local function remember(hp: number)\n lastHp = hp\nend\n'+
  'local function draw(hp: number)\n label.Text = tostring(hp)\nend\n'+
  'local function receive(hp: number)\n remember(hp)\nend\n'+
  'HealthChanged.OnClientEvent:Connect(receive)\n';
 const sources=[server,client];files.forEach((file,i)=>fs.writeFileSync(path.join(root,file),sources[i]));
 const options={sourceRoot:root,responsibleFiles:files,target:'roblox',baseRevisionSha:revision,
  order:{ownerApproved:true,goal:'로블록스 서버 체력 이벤트를 기존 클라이언트 화면에 연결해'}};
 const plan=planComplexGameWork(options);
 assert.equal(plan.status,'BOUND',JSON.stringify(plan.unresolved));
 assert.equal(plan.index.files[0].remotes[0].eventName,'HEALTH_CHANGED');
 assert.equal(plan.nodes[0].boundSymbols.length,3);
 const candidate=createComplexGameCandidate({plan,sourceRoot:root,target:'roblox'});
 assert.equal(candidate.edits.length,1);
 assert.equal(candidate.edits[0].path,files[1]);
 assert.match(candidate.edits[0].replace,/remember\(hp\)\s+draw\(hp\)/);
 assert.equal(candidate.complexPlan.atoms[0].derivation,'EXISTING_REMOTE_SERVER_TO_CLIENT_UI');
 const docs=new Map(files.map((file,i)=>[file,sources[i]]));
 applyExactEdits(root,candidate.edits,{documents:docs});
 assert.equal(docs.get(files[0]),server);
 assert.equal((docs.get(files[1]).match(/draw\(hp\)/g)||[]).length,1);
 for(let i=0;i<2;i++)assert.equal(fs.readFileSync(path.join(root,files[i]),'utf8'),sources[i]);
 if(process.env.VIBE2_LUAU_BINARY){
  const probe=path.join(root,'remote-ui.luau');
  fs.writeFileSync(probe,'local connection=nil\nlocal event={OnClientEvent={Connect=function(self,fn) connection=fn end}}\n'+
   'local game={GetService=function(self,name) return {WaitForChild=function(self,key) return event end} end}\n'+
   docs.get(files[1])+
   '\nconnection(17)\nassert(lastHp==17 and label.Text=="17")\nconnection(5)\nassert(lastHp==5 and label.Text=="5")\n');
  const run=spawnSync(process.env.VIBE2_LUAU_BINARY,[probe],{encoding:'utf8',timeout:10000});
  assert.equal(run.status,0,run.stderr);
 }
 fs.writeFileSync(path.join(root,files[0]),server+'-- a different deployed source\n');
 assert.throws(()=>createComplexGameCandidate({plan,sourceRoot:root,target:'roblox'}),/STALE_SOURCE/);
});

test('Roblox remote HUD source binding blocks wrong event, absent server evidence and duplicate UI call',t=>{
 const {root}=fixture(t,'roblox');fs.mkdirSync(path.join(root,'server'));fs.mkdirSync(path.join(root,'client'));
 const files=['server/Damage.server.luau','client/HUD.client.luau'];
 const server='local ReplicatedStorage = game:GetService("ReplicatedStorage")\n'+
  'local hpRemote = ReplicatedStorage:WaitForChild("HP_EVENT")\n'+
  'local function damage(player: any, state: any, amount: number)\n'+
  ' state.hp -= amount\n hpRemote:FireClient(player, state.hp)\nend\n';
 const client='local ReplicatedStorage = game:GetService("ReplicatedStorage")\n'+
  'local hpRemote = ReplicatedStorage:WaitForChild("HP_EVENT")\n'+
  'local label={Text=""}\nlocal lastHp=0\n'+
  'local function remember(hp: number)\n lastHp = hp\nend\n'+
  'local function draw(hp: number)\n label.Text = tostring(hp)\nend\n'+
  'local function receive(hp: number)\n remember(hp)\nend\n'+
  'hpRemote.OnClientEvent:Connect(receive)\n';
 const options={sourceRoot:root,responsibleFiles:files,target:'roblox',baseRevisionSha:revision,
  order:{ownerApproved:true,goal:'기존 서버 체력 변경을 클라이언트 화면에 반영해'}};
 for(const changed of [
  [server,client.replace('WaitForChild("HP_EVENT")','WaitForChild("OTHER_EVENT")')],
  [server.replace('hpRemote:FireClient(player, state.hp)','local unused = state.hp'),client],
  [server.replace('state.hp -= amount\n hpRemote:FireClient(player, state.hp)','hpRemote:FireClient(player, state.hp)\n state.hp -= amount'),client],
  [server,client.replace(' remember(hp)\nend\nhpRemote.OnClientEvent',' remember(hp)\n draw(hp)\nend\nhpRemote.OnClientEvent')],
  [server,client.replace('hpRemote.OnClientEvent:Connect(receive)','hpRemote.OnClientEvent:Connect(function(hp) remember(hp) end)')]
 ]){
  files.forEach((file,i)=>fs.writeFileSync(path.join(root,file),changed[i]));
  const plan=planComplexGameWork(options);
  assert.equal(plan.status,'BLOCKED',JSON.stringify(plan.unresolved));
  assert.ok(plan.unresolved.some(row=>row.code==='REMOTE_UI_ORIGINAL_EVENT_BINDING_UNPROVEN'));
  for(let i=0;i<2;i++)assert.equal(fs.readFileSync(path.join(root,files[i]),'utf8'),changed[i]);
 }
});
