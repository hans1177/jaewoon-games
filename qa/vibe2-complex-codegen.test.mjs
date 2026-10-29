// 파일명: qa/vibe2-complex-codegen.test.mjs
// [임포트] 실제 소스 변경과 독립 실행 오라클을 분리해 검사한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {compileVibe2ComplexIntent} from '../tools/vibe2-complex-intent.mjs';
import {indexVibe2GameSource} from '../tools/vibe2-game-source-index.mjs';
import {planVibe2ComplexWork} from '../tools/vibe2-complex-work-planner.mjs';
import {createVibe59CodeCandidates} from '../tools/vibe2-v59-autonomy.mjs';
import {applyExactEdits} from '../tools/autonomous-safe-edit.mjs';

function setup(t,target='web',html=false){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-complex-'));
  t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  const root=path.join(temp,'game');fs.mkdirSync(root);
  const relative=html?'index.html':target==='web'?'game.js':'server.luau';
  const source=target==='web'
    ?'let score=0,state=0,text="";\nfunction event(){ score += 1; }\nfunction commitState(){ state=score; }\nfunction render(){ text=String(state); }\n'
    :'local score = 0\nlocal state = 0\nlocal text = ""\nlocal function commitState()\n state = score\nend\nlocal function render()\n text = tostring(state)\nend\nlocal function event()\n score = score + 1\nend\n';
  const original=html?'<script>\n'+source+'</script>':source;
  fs.writeFileSync(path.join(root,relative),original);
  const goal='When function event runs, call commitState then render';
  const order={selectedTask:{gameId:'game',ownerDirective:true,goal}};
  const options={order,sourceRoot:root,responsibleFiles:[relative],target};
  return {root,relative,source:original,options,order};
}
const digest=x=>crypto.createHash('sha256').update(x).digest('hex');

test('natural language becomes an ordered two-step DAG tied to exact existing source definitions',t=>{
  const {options,relative,source}=setup(t);
  const intent=compileVibe2ComplexIntent(options);
  assert.equal(intent.requirements.length,2);
  assert.equal(intent.ownerDirectiveReference.originalText,options.order.selectedTask.goal);
  assert.equal(intent.ownerDirectiveReference.verifiedFromOwnerOrder,true);
  const plan=planVibe2ComplexWork(options);
  assert.equal(plan.steps[1].dependsOn[0],plan.steps[0].id);
  assert.equal(plan.steps[0].source.path,relative);
  assert.equal(plan.steps[0].source.sourceSha256,digest(source));
  assert.equal(plan.steps[0].effect.definition,'commitState');
  assert.equal(plan.steps[1].effect.definition,'render');
  assert.equal(plan.status,'SOURCE_BOUND_CANDIDATE_NOT_RUNTIME_VERIFIED');
});
test('WEB canonical V5.9 builds a real atomic edit; independent runtime proves state plus UI and no unwanted writes',t=>{
  const {root,relative,source,options}=setup(t);
  const result=createVibe59CodeCandidates(options);
  assert.equal(result.vibe59CodeKind,'SOURCE_BOUND_COMPLEX_CHAIN');
  assert.equal(result.modelUsed,false);
  assert.equal(result.runtimeVerified,false);
  assert.equal(result.sourceWrite,false);
  assert.equal(result.edits.length,1);
  assert.equal(fs.readFileSync(path.join(root,relative),'utf8'),source);
  const docs=new Map([[relative,source]]);
  applyExactEdits(root,result.edits,{documents:docs});
  const changed=docs.get(relative);
  assert.match(changed,/commitState\(\);\s*render\(\);/);
  assert.equal(fs.readFileSync(path.join(root,relative),'utf8'),source);
  const baseline=vm.createContext({});
  vm.runInContext(source+'event();',baseline);
  assert.deepEqual(Array.from(vm.runInContext('[score,state,text]',baseline)),[1,0,'']);
  const game=vm.createContext({});
  vm.runInContext(changed+'event();event();',game);
  assert.deepEqual(Array.from(vm.runInContext('[score,state,text]',game)),[2,2,'2']);
});
test('HTML actual game-style single inline script binds offsets correctly and executes',t=>{
  const {root,relative,source,options}=setup(t,'web',true);
  const result=createVibe59CodeCandidates(options);
  assert.equal(result.edits[0].path,'index.html');
  const docs=new Map([[relative,source]]);
  applyExactEdits(root,result.edits,{documents:docs});
  const patched=docs.get(relative);
  const script=patched.match(/<script>([\s\S]*?)<\/script>/)[1];
  const game=vm.createContext({});
  vm.runInContext(script+'event()',game);
  assert.deepEqual(Array.from(vm.runInContext('[score,state,text]',game)),[1,1,'1']);
});
test('ROBLOX Luau source is bound to existing local functions in declared lexical order',t=>{
  const {root,relative,source,options}=setup(t,'roblox');
  const result=createVibe59CodeCandidates(options);
  assert.equal(result.vibe59CodeKind,'SOURCE_BOUND_COMPLEX_CHAIN');
  assert.deepEqual(result.edits.map(row=>row.path),['server.luau']);
  const docs=new Map([[relative,source]]);
  applyExactEdits(root,result.edits,{documents:docs});
  assert.match(docs.get(relative),/commitState\(\)\s+render\(\)\s+end/);
  assert.equal(fs.readFileSync(path.join(root,relative),'utf8'),source);
});
test('blocked approvals, stale sha, duplicate names, malformed source and unauthorized paths never produce candidate',t=>{
  const {root,relative,options}=setup(t);
  assert.throws(()=>createVibe59CodeCandidates({...options,order:{selectedTask:{...options.order.selectedTask,ownerDirective:false}}}),/OWNER_DIRECTIVE_REQUIRED/);
  assert.throws(()=>createVibe59CodeCandidates({...options,order:{selectedTask:{...options.order.selectedTask,sourceSha256:'stale'}}}),/STALE_SOURCE/);
  assert.throws(()=>indexVibe2GameSource({...options,responsibleFiles:['../evil.js'],gameId:'game'}),/SOURCE_INDEX_PATH/);
  assert.throws(()=>createVibe59CodeCandidates({...options,order:{selectedTask:{...options.order.selectedTask,goal:'When function event runs, call unknown then render'}}}),/SOURCE_BINDING_NOT_UNIQUE/);
  fs.appendFileSync(path.join(root,relative),'\nfunction render(){}\n');
  assert.throws(()=>createVibe59CodeCandidates(options),/SOURCE_BINDING_NOT_UNIQUE/);
  assert.equal(fs.readFileSync(path.join(root,relative),'utf8').includes('commitState();'),false);
});
test('source index refuses symbolic-link escape and protects saved state mutators',t=>{
  const {root,options,relative}=setup(t);
  const destination=path.join(path.dirname(root),'outside.js');
  fs.writeFileSync(destination,'function event(){}');
  fs.symlinkSync(destination,path.join(root,'alias.js'));
  assert.throws(()=>indexVibe2GameSource({...options,gameId:'game',responsibleFiles:['alias.js']}),/SOURCE_INDEX_ESCAPE/);
  fs.appendFileSync(path.join(root,relative),'\nfunction persist(){ localStorage.setItem("save",score) }\n');
  const changed={...options,order:{selectedTask:{...options.order.selectedTask,
    goal:'When function event runs, call persist then render'}}};
  assert.throws(()=>createVibe59CodeCandidates(changed),/UNSUPPORTED_FUNCTION_CONTRACT/);
});
test('existing line-defense game source is indexed without speculative edits to live gameplay',()=>{
  const root=path.resolve('web-games/line-defense');
  const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const index=indexVibe2GameSource({sourceRoot:root,gameId:'line-defense',
    target:'web',responsibleFiles:['index.html']});
  for(const name of ['start','summon','buttons','hud']){
    const rows=index.functions.filter(item=>item.name===name);
    assert.equal(rows.length,1,name);
    assert.equal(rows[0].sourceSha256,digest(source));
    assert.equal(source.slice(rows[0].start,rows[0].start+8),'function');
  }
  assert.equal(index.sourceWrite,false);
});


test('real existing line-defense source candidate starts in a real Chromium browser without changing live game files',t=>{
  const chrome=['google-chrome','google-chrome-stable','chromium','chromium-browser']
    .some(bin=>spawnSync(bin,['--version'],{encoding:'utf8'}).status===0);
  if(!chrome){t.skip('Chrome unavailable in core runner; mandatory Playwright practice-runtime checks actual mobile game');return}
  const liveRoot=path.resolve('web-games/line-defense'),relative='index.html';
  const source=fs.readFileSync(path.join(liveRoot,relative),'utf8');
  const order={selectedTask:{ownerDirective:true,gameId:'line-defense',
    goal:'When function buttons runs, call updateMeta then hud'}};
  const candidate=createVibe59CodeCandidates({order,sourceRoot:liveRoot,
    responsibleFiles:[relative],target:'web'});
  assert.equal(candidate.vibe59CodeKind,'SOURCE_BOUND_COMPLEX_CHAIN');
  assert.equal(candidate.sourceWrite,false);
  const documents=new Map([[relative,source]]);
  applyExactEdits(liveRoot,candidate.edits,{documents});
  assert.notEqual(documents.get(relative),source);
  assert.equal(fs.readFileSync(path.join(liveRoot,relative),'utf8'),source);
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-real-game-browser-'));
  t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
  const staged=path.join(tmp,'web-games','line-defense');fs.mkdirSync(staged,{recursive:true});
  fs.writeFileSync(path.join(staged,relative),documents.get(relative));
  fs.copyFileSync(path.resolve('game-catalog.json'),path.join(tmp,'game-catalog.json'));
  const result=spawnSync(process.execPath,[path.resolve('qa/vibe2-development-web-browser-smoke.mjs')],{
    cwd:tmp,env:{...process.env,VIBE2_BROWSER_CHANGED_GAMES:'line-defense'},
    encoding:'utf8',timeout:110000,maxBuffer:8*1024*1024
  });
  if(result.error)throw result.error;
  assert.equal(result.status,0,(result.stdout||'').slice(-1800)+'\n'+(result.stderr||'').slice(-1800));
  assert.match(result.stdout,/DEVELOPMENT_WEB_BROWSER_SMOKE=PASS/);
  assert.match(result.stdout,/DEVELOPMENT_WEB_BROWSER_GAME=line-defense/);
  assert.equal(fs.readFileSync(path.join(liveRoot,relative),'utf8'),source);
});



test('Sprint2 multi-file ROBLOX server functions produce two source-grounded atomic edits and independent DAGs',t=>{
  const root=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-multi-luau-')),'game');
  t.after(()=>fs.rmSync(path.dirname(root),{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'server'),{recursive:true});
  const combat='server/Combat.server.luau',inventory='server/Inventory.server.luau';
  const sourceA='local hits = 0\nlocal shown = 0\n'+
    'local function confirmHit()\n hits = hits + 1\nend\n'+
    'local function updateHitState()\n shown = hits\nend\n'+
    'local function onAttack()\n hits = hits + 1\nend\n';
  const sourceB='local items = 0\nlocal visible = 0\n'+
    'local function addItem()\n items = items + 1\nend\n'+
    'local function showItems()\n visible = items\nend\n'+
    'local function onCollect()\n items = items + 1\nend\n';
  fs.writeFileSync(path.join(root,combat),sourceA);
  fs.writeFileSync(path.join(root,inventory),sourceB);
  const goal='When function onAttack runs, call confirmHit then updateHitState; '+
    'When function onCollect runs, call addItem then showItems';
  const options={order:{selectedTask:{gameId:'game',ownerDirective:true,goal,
    sourceSha256ByPath:{[combat]:digest(sourceA),[inventory]:digest(sourceB)}}},
    sourceRoot:root,responsibleFiles:[combat,inventory],target:'roblox'};
  const intent=compileVibe2ComplexIntent(options);
  assert.equal(intent.requirements.length,4);
  assert.equal(new Set(intent.requirements.map(row=>row.group)).size,2);
  const planned=planVibe2ComplexWork(options);
  assert.equal(planned.steps.length,4);
  assert.deepEqual(planned.steps.map(row=>row.dependsOn.length),[0,1,0,1]);
  const candidate=createVibe59CodeCandidates(options);
  assert.equal(candidate.vibe59CodeKind,'SOURCE_BOUND_MULTI_FILE_CHAIN');
  assert.deepEqual(candidate.edits.map(row=>row.path),[combat,inventory]);
  assert.equal(candidate.sourceSha256ByPath[combat],digest(sourceA));
  assert.equal(candidate.sourceSha256ByPath[inventory],digest(sourceB));
  assert.equal(candidate.vibe59TestPlan.staticEvidenceOnly,true);
  assert.equal(candidate.modelUsed,false);
  assert.equal(candidate.runtimeVerified,false);
  const docs=new Map([[combat,sourceA],[inventory,sourceB]]);
  applyExactEdits(root,candidate.edits,{documents:docs});
  assert.match(docs.get(combat),/confirmHit\(\)\s+updateHitState\(\)\s+end/);
  assert.match(docs.get(inventory),/addItem\(\)\s+showItems\(\)\s+end/);
  assert.equal(fs.readFileSync(path.join(root,combat),'utf8'),sourceA);
  assert.equal(fs.readFileSync(path.join(root,inventory),'utf8'),sourceB);
  const luauCompile=process.env.VIBE2_LUAU_COMPILER;
  if(luauCompile&&fs.existsSync(luauCompile)){
    for(const [relative,source] of docs){
      const candidateFile=path.join(root,relative+'.compiled-test');
      fs.writeFileSync(candidateFile,source);
      const result=spawnSync(luauCompile,[candidateFile],{encoding:'utf8',timeout:12000});
      assert.equal(result.status,0,String(result.stderr||'').slice(-800));
    }
  }
});

test('Sprint2 ROBLOX source cannot link client state, duplicate symbols, foreign/expired owner scope or unverified RemoteEvent',t=>{
  const root=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-multi-guards-')),'game');
  t.after(()=>fs.rmSync(path.dirname(root),{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'server'),{recursive:true});
  fs.mkdirSync(path.join(root,'client'),{recursive:true});
  const a='server/Combat.server.luau',b='server/Other.server.luau';
  const sourceA='local function confirmHit()\n x = 1\nend\n'+
    'local function updateHitState()\n y = 1\nend\n'+
    'local function onAttack()\n x = 2\nend\n';
  const sourceB='local function addItem()\n a = 1\nend\n'+
    'local function showItems()\n b = 1\nend\n'+
    'local function onCollect()\n a = 2\nend\n';
  fs.writeFileSync(path.join(root,a),sourceA);fs.writeFileSync(path.join(root,b),sourceB);
  const goal='When function onAttack runs, call confirmHit then updateHitState; '+
    'When function onCollect runs, call addItem then showItems';
  const input={order:{selectedTask:{gameId:'game',ownerDirective:true,goal}},
    sourceRoot:root,responsibleFiles:[a,b],target:'roblox'};
  const candidate=createVibe59CodeCandidates(input);
  assert.equal(candidate.edits.length,2);
  const original=new Map([[a,sourceA],[b,sourceB]]);
  const modified=new Map(original);
  modified.set(b,'local function different()\nend\n');
  assert.throws(()=>applyExactEdits(root,candidate.edits,{documents:modified}),/edit find/);
  assert.equal(modified.get(a),sourceA,'failed second step must not write first step');
  assert.equal(modified.get(b),'local function different()\nend\n');

  assert.throws(()=>createVibe59CodeCandidates({...input,order:{selectedTask:{
    gameId:'game',ownerDirective:false,goal}}}),/OWNER_DIRECTIVE_REQUIRED/);
  assert.throws(()=>createVibe59CodeCandidates({...input,order:{selectedTask:{
    gameId:'game',ownerDirective:true,goal,sourceSha256ByPath:{[b]:'stale'}}}}),/STALE_SOURCE/);
  fs.copyFileSync(path.join(root,b),path.join(root,'client/Other.client.luau'));
  assert.throws(()=>createVibe59CodeCandidates({...input,responsibleFiles:[a,'client/Other.client.luau']}),/UNSUPPORTED_FUNCTION_CONTRACT/);
  fs.writeFileSync(path.join(root,b),sourceB+'\nlocal function updateHitState()\n b = 3\nend\n');
  assert.throws(()=>createVibe59CodeCandidates(input),/SOURCE_BINDING_NOT_UNIQUE/);
  fs.writeFileSync(path.join(root,b),sourceB.replace(' a = 2',' remote:FireServer("DROP")'));
  assert.throws(()=>createVibe59CodeCandidates(input),/UNSUPPORTED_FUNCTION_CONTRACT/);
  assert.equal(fs.readFileSync(path.join(root,a),'utf8'),sourceA);
});

test('Sprint2 WEB multi-file existing source applies two independent event-state-view chains without touching original files',t=>{
  const root=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-multi-web-')),'game');
  t.after(()=>fs.rmSync(path.dirname(root),{recursive:true,force:true}));
  fs.mkdirSync(root);
  const a='combat.js',b='ui.js';
  const left='let hp=0,shown=0;\nfunction hit(){hp+=1;}\nfunction paint(){shown=hp;}\nfunction attack(){hp+=1;}\n';
  const right='let gold=0,display=0;\nfunction awardCoin(){gold+=1;}\nfunction refreshCoin(){display=gold;}\nfunction pickup(){gold+=1;}\n';
  fs.writeFileSync(path.join(root,a),left);fs.writeFileSync(path.join(root,b),right);
  const order={selectedTask:{gameId:'game',ownerDirective:true,goal:
    'When function attack runs, call hit then paint; When function pickup runs, call awardCoin then refreshCoin'}};
  const result=createVibe59CodeCandidates({order,sourceRoot:root,responsibleFiles:[a,b],target:'web'});
  assert.equal(result.edits.length,2);
  const docs=new Map([[a,left],[b,right]]);
  applyExactEdits(root,result.edits,{documents:docs});
  const contextLeft=vm.createContext({});
  vm.runInContext(docs.get(a)+'attack();attack();',contextLeft);
  assert.deepEqual(Array.from(vm.runInContext('[hp,shown]',contextLeft)),[4,4]);
  const contextRight=vm.createContext({});
  vm.runInContext(docs.get(b)+'pickup();pickup();',contextRight);
  assert.deepEqual(Array.from(vm.runInContext('[gold,display]',contextRight)),[4,4]);
  assert.equal(fs.readFileSync(path.join(root,a),'utf8'),left);
  assert.equal(fs.readFileSync(path.join(root,b),'utf8'),right);
});

test('Sprint2 actual Roblox game server+client originals retain exact SHA and ownership boundary',()=>{
  const root=path.resolve('roblox-games/line-defense');
  const rels=['server/Game.server.luau','client/Game.client.luau'];
  const original=rels.map(rel=>fs.readFileSync(path.join(root,rel),'utf8'));
  const index=indexVibe2GameSource({sourceRoot:root,gameId:'line-defense',
    target:'roblox',responsibleFiles:rels});
  assert.deepEqual(index.files.map(row=>row.path),rels);
  assert.deepEqual(index.files.map(row=>row.sourceSha256),original.map(digest));
  assert.equal(index.target,'roblox');
  assert.ok(index.functions.every(row=>rels.includes(row.path)));
  assert.equal(index.sourceWrite,false);
  assert.equal(index.runtimeVerified,false);
});
