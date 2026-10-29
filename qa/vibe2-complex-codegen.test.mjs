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
import {createVibe59CodeCandidates,applyVibe59ApprovedGameSourceChange,inspectVibe59ExistingGameAssets,applyVibe59ApprovedGameAssetChanges} from '../tools/vibe2-v59-autonomy.mjs';
import {applyExactEdits} from '../tools/autonomous-safe-edit.mjs';
import {execFileSync} from 'node:child_process';
import {runVibe2SourceWorker,applyVibe2CandidateToSource} from '../tools/vibe2-source-worker.mjs';
import {compileVibeCentralWorkContract,loadCentralPolicySnapshot} from '../tools/vibe2-central-work-contract.mjs';

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

// 원본 게임 파일과 기존 소스 작업자의 단일 적용 경로를 사용한다.
test('canonical Vibe2 no-model worker edits actual game source on an isolated candidate branch',async t=>{
  const cwd=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-real-source-write-'));
  t.after(()=>fs.rmSync(cwd,{recursive:true,force:true}));
  const relative='web-games/line-defense/index.html';
  const original=fs.readFileSync(path.resolve(relative),'utf8');
  const destination=path.join(cwd,relative);
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  fs.writeFileSync(destination,original);
  for(const policy of [
    'company-learning/platform-release-roadmap.json',
    'company-learning/company-log-map.json',
    'company-learning/company-architecture-map.json',
    'company-learning/security-immune-system.json'
  ]){
    const dest=path.join(cwd,policy);
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    fs.copyFileSync(path.resolve(policy),dest);
  }
  const taskId='vibe59-real-line-defense-source-write';
  const snapshot=loadCentralPolicySnapshot({repoRoot:process.cwd(),required:true});
  assert.equal(snapshot.valid,true);
  const responsibleFiles=[relative];
  const contract=compileVibeCentralWorkContract({snapshot,
    task:{id:taskId,gameId:'line-defense',target:'web'},plan:{target:'web'},responsibleFiles});
  const goal='When function buttons runs, call updateMeta then hud';
  const workOrder={run:true,workMode:'source-change-candidate',taskId,
    gameId:'line-defense',target:'web',goal,department:'development',
    source:{root:'web-games/line-defense',responsibleFiles},
    workerPolicy:{directMainWrite:false},compiledWorkContract:contract,
    selectedTask:{id:taskId,gameId:'line-defense',target:'web',ownerDirective:true,goal}};
  fs.mkdirSync(path.join(cwd,'.vibe2'),{recursive:true});
  fs.writeFileSync(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder));
  const git=(...args)=>execFileSync('git',args,{cwd,encoding:'utf8',timeout:15000});
  git('init','-q');git('config','user.email','vibe2-tests@example.invalid');
  git('config','user.name','Vibe2 Test');
  git('add','--',relative);git('commit','-qm','original game source');
  git('switch','-q','-c','vibe2/candidate/'+taskId);
  // 정식 정책 계약에 검증된 자산 전수 평가가 없으면 작업자는 쓰기를 거부한다.
  await assert.rejects(runVibe2SourceWorker({cwd,applySource:true}),
    /ALL_GAME_DYNAMIC_ASSET_BINDING_CONTRACT/);
  assert.equal(fs.readFileSync(destination,'utf8'),original);
  const sourceRoot=path.dirname(destination),candidateRoot=path.join(cwd,'.vibe2/candidates',taskId);
  const candidate=createVibe59CodeCandidates({order:workOrder,sourceRoot,
    responsibleFiles:['index.html'],target:'web',repositoryRoot:cwd});
  assert.equal(candidate.modelUsed,false);
  assert.equal(candidate.edits.length,1);
  assert.throws(()=>applyVibe2CandidateToSource({cwd,sourceRoot,candidateRoot,candidate:{
    ...candidate,edits:[...candidate.edits,{path:'index.html',
      find:'this source anchor does not exist',replace:'never write'}]
  }}),/edit find 불일치/);
  assert.equal(fs.readFileSync(destination,'utf8'),original,'second invalid edit must preserve real game source');
  const applied=applyVibe2CandidateToSource({cwd,sourceRoot,candidateRoot,candidate});
  assert.equal(applied.branch,'vibe2/candidate/'+taskId);
  assert.deepEqual(applied.changedFiles,['index.html']);
  const after=fs.readFileSync(destination,'utf8');
  assert.notEqual(after,original,'canonical source-application responsibility must edit game file');
  assert.match(after,/updateMeta\(\);\s*hud\(\);\s*\}/);
  assert.equal(fs.readFileSync(path.resolve(relative),'utf8'),original,'production repository source remains unchanged by regression');
});

test('real existing survival2 SVG accepts Korean and English owner recolor and commits exact game art on candidate branch',t=>{
 const repo=fs.mkdtempSync(path.join(os.tmpdir(),'vibe59-live-svg-'));
 t.after(()=>fs.rmSync(repo,{recursive:true,force:true}));
 const gameId='survival2',relative='assets/survival-atlas.svg';
 const production=path.resolve('web-games',gameId,relative),original=fs.readFileSync(production,'utf8');
 const root=path.join(repo,'web-games',gameId),target=path.join(root,relative);
 fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,original);
 fs.writeFileSync(path.join(repo,'game-catalog.json'),JSON.stringify({
  games:[{id:gameId,webPath:'web-games/survival2',lifecycleState:'ACTIVE'}],ownerStoppedGameIds:[]}));
 const git=(...args)=>{const result=spawnSync('git',args,{cwd:repo,encoding:'utf8',timeout:15000});
  assert.equal(result.status,0,result.stderr||result.error?.message);return result.stdout;};
 git('init','-q');git('config','user.email','vibe59-tests@example.invalid');
 git('config','user.name','Vibe59 Test');git('add','--','web-games/survival2');
 git('commit','-qm','existing production game SVG');
 git('switch','-q','-c','vibe2/candidate/svg-owner-recolor');
 const options={sourceRoot:root,repositoryRoot:repo,responsibleFiles:[relative],target:'web'};
 const ko='기존 assets/survival-atlas.svg의 wolf 색상 #6d7773을 #81938b으로 바꿔';
 const english='Recolor wolf in assets/survival-atlas.svg from #6d7773 to #81938b';
 const order=goal=>({ownerApproved:true,selectedTask:{ownerDirective:true,gameId,goal}});
 const candidate=createVibe59CodeCandidates({...options,order:order(ko)});
 const translated=createVibe59CodeCandidates({...options,order:order(english)});
 assert.equal(candidate.vibe59CodeKind,'SOURCE_BOUND_VISUAL_ASSET_EDIT');
 assert.equal(candidate.vibe59TestPlan.pass,true);
 assert.equal(candidate.vibe59TestPlan.cases.length,1);
 assert.equal(candidate.modelUsed,false);assert.equal(candidate.runtimeVerified,false);
 assert.deepEqual(candidate.edits,translated.edits);
 assert.equal(fs.readFileSync(target,'utf8'),original,'generation must not write original source');
 const candidateRoot=path.join(repo,'.vibe2','candidates','svg-owner-recolor');
 const applied=applyVibe2CandidateToSource({cwd:repo,sourceRoot:root,candidateRoot,candidate});
 assert.deepEqual(applied.changedFiles,[relative]);
 const after=fs.readFileSync(target,'utf8');
 assert.equal(after,original.replace('fill="#6d7773"','fill="#81938b"'));
 assert.match(after,/<g id="boar"[^>]*><ellipse[^>]*fill="#6a4935"/);
 assert.equal(fs.readFileSync(production,'utf8'),original);
 assert.equal(git('diff','--name-only').trim(),'web-games/survival2/'+relative);
 assert.throws(()=>createVibe59CodeCandidates({...options,order:order('기존 assets/survival-atlas.svg의 ghost 색상 #6d7773을 #81938b으로 바꿔')}),/GROUP_NOT_UNIQUE/);
 let invalid=null,notApproved=null;
 try{invalid=createVibe59CodeCandidates({...options,order:order('기존 assets/survival-atlas.svg의 wolf 색상 #6d7773을 #nope으로 바꿔')});}
 catch(error){assert.match(String(error),/VIBE2_COMPLEX|SOURCE_BINDING|VIBE59_/);}
 assert.notEqual(invalid?.vibe59CodeKind,'SOURCE_BOUND_VISUAL_ASSET_EDIT');
 try{notApproved=createVibe59CodeCandidates({...options,order:{selectedTask:{ownerDirective:false,gameId,goal:ko}}});}
 catch(error){assert.match(String(error),/VIBE2_COMPLEX|SOURCE_BINDING|VIBE59_/);}
 assert.notEqual(notApproved?.vibe59CodeKind,'SOURCE_BOUND_VISUAL_ASSET_EDIT');
});
test('Vibe visual source editor applies two independent changes in the SAME existing SVG atomically',t=>{
 const repo=fs.mkdtempSync(path.join(os.tmpdir(),'vibe59-multi-actor-'));
 t.after(()=>fs.rmSync(repo,{recursive:true,force:true}));
 const gameId='survival2',relative='assets/survival-atlas.svg',root=path.join(repo,'web-games',gameId);
 fs.mkdirSync(path.join(root,'assets'),{recursive:true});
 const original=fs.readFileSync(path.resolve('web-games',gameId,relative),'utf8');
 fs.writeFileSync(path.join(root,relative),original);
 fs.writeFileSync(path.join(repo,'game-catalog.json'),JSON.stringify({
  games:[{id:gameId,webPath:'web-games/survival2'}]}));
 const sourceSha256=digest(original),wolf=original.match(/<g id="wolf"[^>]*>[\s\S]*?<\/g>/)?.[0],
  boar=original.match(/<g id="boar"[^>]*>[\s\S]*?<\/g>/)?.[0];
 assert.ok(wolf&&boar);
 const order={ownerApproved:true,selectedTask:{ownerDirective:true,gameId,vibe59VisualAssetEdits:[
  {path:relative,expectedSha256:sourceSha256,find:wolf,replace:wolf.replace('fill="#6d7773"','fill="#81938b"')},
  {path:relative,expectedSha256:sourceSha256,find:boar,replace:boar.replace('fill="#6a4935"','fill="#826b4e"')}
 ]}};
 const opts={order,sourceRoot:root,repositoryRoot:repo,responsibleFiles:[relative],target:'web'};
 const candidate=createVibe59CodeCandidates(opts);
 assert.equal(candidate.edits.length,2);
 assert.equal(candidate.vibe59TestPlan.cases.length,2);
 const docs=new Map([[relative,original]]);
 applyExactEdits(root,candidate.edits,{documents:docs});
 assert.match(docs.get(relative),/fill="#81938b"/);
 assert.match(docs.get(relative),/fill="#826b4e"/);
 assert.equal(fs.readFileSync(path.join(root,relative),'utf8'),original);
});
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
// 회귀: 흔한 한국어 동사 연결과 영어 쉼표 나열도 기존 소스 함수만 연결한다.
test('natural ordered call verbs synthesize executable state and UI updates without source writes',t=>{
  const {root,relative,source,options}=setup(t);
  for(const goal of [
    '함수 event 실행 후 commitState 호출하고 render 호출해',
    '함수 event 실행 후 commitState 호출한 다음 render 호출해',
    '함수 event 실행 후 commitState 호출 후 render 호출해',
    'When function event runs, call commitState, then render',
    'When function event runs, call commitState, render'
  ]){
    const order={selectedTask:{...options.order.selectedTask,goal}};
    const candidate=createVibe59CodeCandidates({...options,order});
    assert.equal(candidate.edits.length,1,goal);
    const docs=new Map([[relative,source]]);
    applyExactEdits(root,candidate.edits,{documents:docs});
    assert.match(docs.get(relative),/commitState\(\);\s*render\(\);/,goal);
    const game=vm.createContext({});
    vm.runInContext(docs.get(relative)+'event();event();',game);
    assert.deepEqual(Array.from(vm.runInContext('[score,state,text]',game)),[2,2,'2'],goal);
    assert.equal(fs.readFileSync(path.join(root,relative),'utf8'),source);
    assert.equal(candidate.runtimeVerified,false);
  }
  assert.throws(()=>createVibe59CodeCandidates({...options,order:{selectedTask:{
    ...options.order.selectedTask,goal:'함수 event 실행 후 commitState 호출하고 unknown 호출해'
  }}}),/SOURCE_BINDING_NOT_UNIQUE/);
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
  // 기존 Playwright 실행기가 있는 practice-runtime에서는 실제 후보 브라우저 검사를 생략하지 않는다.
  const browserBinary=String(process.env.VIBE2_CHROME_BINARY||'').trim();
  const binaries=browserBinary?[browserBinary]:['google-chrome','google-chrome-stable','chromium','chromium-browser'];
  const chrome=binaries.some(bin=>spawnSync(bin,['--version'],{encoding:'utf8'}).status===0);
  if(!chrome){
    assert.equal(Boolean(process.env.VIBE2_PLAYWRIGHT_MODULE),false,'VIBE2_REAL_GAME_BROWSER_REQUIRED');
    t.skip('Chrome unavailable in core runner; practice-runtime must run this game browser proof');
    return;
  }
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
  assert.match(result.stdout,/LINE_DEFENSE_COMPLEX_COMBAT=/,'candidate must execute combat and save browser scenarios');
  assert.equal(fs.readFileSync(path.join(liveRoot,relative),'utf8'),source);
  console.log('VIBE2_COMPLEX_REAL_GAME_CANDIDATE_BROWSER=PASS sourceWrite=false gameId=line-defense');
});



test('approved Vibe5.9 edits the actual game source file, not just a staged map',t=>{
  const repo=fs.mkdtempSync(path.join(os.tmpdir(),'vibe59-live-source-'));
  t.after(()=>fs.rmSync(repo,{recursive:true,force:true}));
  const root=path.join(repo,'web-games','sample-game');fs.mkdirSync(root,{recursive:true});
  const file='index.html';
  const source='<script>\nlet score=0,state=0,text="";\nfunction event(){ score += 1; }\nfunction commitState(){ state=score; }\nfunction render(){ text=String(state); }\n</script>';
  fs.writeFileSync(path.join(root,file),source);
  const order={ownerApproved:true,selectedTask:{ownerDirective:true,gameId:'sample-game',
    goal:'When function event runs, call commitState then render'}};
  assert.throws(()=>applyVibe59ApprovedGameSourceChange({order,sourceRoot:root,
    responsibleFiles:[file],target:'web',repositoryRoot:repo}),/NOT_APPROVED/);
  assert.equal(fs.readFileSync(path.join(root,file),'utf8'),source);
  const result=applyVibe59ApprovedGameSourceChange({order,sourceRoot:root,
    responsibleFiles:[file],target:'web',repositoryRoot:repo,approvedSourceWrite:true});
  assert.equal(result.sourceWrite,true);assert.equal(result.runtimeVerified,false);
  assert.equal(result.releaseVerified,false);
  assert.deepEqual(result.changedFiles,[file]);
  const changed=fs.readFileSync(path.join(root,file),'utf8');
  assert.notEqual(changed,source);assert.match(changed,/commitState\(\);\s*render\(\);/);
  const ctx=vm.createContext({});vm.runInContext(changed.replaceAll('<script>','').replaceAll('</script>','')+'\nevent();event();',ctx);
  assert.deepEqual(Array.from(vm.runInContext('[score,state,text]',ctx)),[2,2,'2']);
  fs.writeFileSync(path.join(root,file),source);
  assert.throws(()=>applyVibe59ApprovedGameSourceChange({order:{...order,selectedTask:{
    ...order.selectedTask,goal:'When function event runs, call commitState then nonexistent'}},
    sourceRoot:root,responsibleFiles:[file],target:'web',repositoryRoot:repo,
    approvedSourceWrite:true}));
  assert.equal(fs.readFileSync(path.join(root,file),'utf8'),source);
});

test('existing survival2 production SVG receives owner Korean/English recolor through canonical source worker on a candidate branch',t=>{
  const repo=fs.mkdtempSync(path.join(os.tmpdir(),'vibe59-existing-asset-real-'));
  t.after(()=>fs.rmSync(repo,{recursive:true,force:true}));
  const game='survival2',relative='assets/survival-atlas.svg',sourceFile=path.resolve('web-games',game,relative);
  const original=fs.readFileSync(sourceFile,'utf8'),root=path.join(repo,'web-games',game);
  const target=path.join(root,relative);
  fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,original);
  fs.writeFileSync(path.join(repo,'game-catalog.json'),JSON.stringify({
    games:[{id:game,webPath:'web-games/'+game,lifecycleState:'ACTIVE'}],ownerStoppedGameIds:[]
  }));
  const goal='기존 assets/survival-atlas.svg의 wolf 색상 #6d7773을 #81938b으로 바꿔';
  const order={ownerApproved:true,selectedTask:{ownerDirective:true,gameId:game,goal}};
  const options={order,sourceRoot:root,repositoryRoot:repo,responsibleFiles:[relative],target:'web'};
  const generated=createVibe59CodeCandidates(options);
  assert.equal(generated.vibe59CodeKind,'SOURCE_BOUND_VISUAL_ASSET_EDIT');
  assert.equal(generated.vibe59TestPlan.pass,true);
  assert.equal(generated.vibe59TestPlan.cases.length,1);
  assert.equal(generated.modelUsed,false);
  assert.equal(generated.runtimeVerified,false);
  assert.equal(fs.readFileSync(target,'utf8'),original);
  assert.equal(generated.edits.length,1);
  assert.match(generated.edits[0].find,/<g id="wolf"/);
  assert.match(generated.edits[0].replace,/fill="#81938b"/);
  const english=createVibe59CodeCandidates({...options,order:{...order,selectedTask:{
    ...order.selectedTask,goal:'Recolor wolf in assets/survival-atlas.svg from #6d7773 to #81938b'}}});
  assert.deepEqual(english.edits,generated.edits);
  const git=(...args)=>{
    const result=spawnSync('git',args,{cwd:repo,encoding:'utf8',timeout:15000});
    assert.equal(result.status,0,result.stderr||result.error?.message);
    return result.stdout;
  };
  git('init','-q');git('config','user.name','Vibe2 Test');git('config','user.email','vibe2-test@example.invalid');
  git('add','--','web-games/'+game+'/'+relative);git('commit','-qm','original game art');
  git('switch','-q','-c','vibe2/candidate/owner-art-change');
  const staged=path.join(repo,'.vibe2','candidates','owner-art-change');
  const applied=applyVibe2CandidateToSource({cwd:repo,sourceRoot:root,candidateRoot:staged,
    candidate:generated,target:'web'});
  assert.equal(applied.branch,'vibe2/candidate/owner-art-change');
  assert.deepEqual(applied.changedFiles,[relative]);
  const changed=fs.readFileSync(target,'utf8');
  assert.equal(changed,original.replace('fill="#6d7773"','fill="#81938b"'));
  assert.equal(git('diff','--name-only').trim(),'web-games/'+game+'/'+relative);
  assert.equal(fs.readFileSync(sourceFile,'utf8'),original,'production source must not change in test');
  // The same no-model worker must refuse editing a different game, missing group or invalid color.
  assert.throws(()=>createVibe59CodeCandidates({...options,order:{ownerApproved:false,
    selectedTask:order.selectedTask}}),/VIBE59_GAME_ASSET_WRITE_NOT_APPROVED/);
  assert.throws(()=>createVibe59CodeCandidates({...options,order:{...order,selectedTask:{
    ...order.selectedTask,goal:'Recolor ghost in assets/survival-atlas.svg from #6d7773 to #81938b'}}}),
    /VIBE59_GAME_ASSET_GROUP_NOT_UNIQUE/);
  assert.throws(()=>createVibe59CodeCandidates({...options,order:{...order,selectedTask:{
    ...order.selectedTask,goal:'Recolor wolf in assets/other.svg from #6d7773 to #81938b'}}}),
    /VIBE59_GAME_ASSET_RESPONSIBLE_FILE_REQUIRED/);
  assert.throws(()=>createVibe59CodeCandidates({...options,order:{...order,selectedTask:{
    ...order.selectedTask,goal:'Recolor wolf in assets/survival-atlas.svg from #6d7773 to #abcd'}}}),
    /VIBE59_GAME_ASSET_COLOR_INVALID/);
});
test('Vibe5.9 existing source-worker synthesizes authorized in-game visual asset edits without direct writes',t=>{
  const repo=fs.mkdtempSync(path.join(os.tmpdir(),'vibe59-art-candidate-'));
  t.after(()=>fs.rmSync(repo,{recursive:true,force:true}));
  const root=path.join(repo,'web-games','sample-game');
  fs.mkdirSync(path.join(root,'assets'),{recursive:true});
  fs.writeFileSync(path.join(repo,'game-catalog.json'),JSON.stringify({
    games:[{id:'sample-game',webPath:'web-games/sample-game',lifecycleState:'ACTIVE'}]
  }));
  const file='assets/atlas.svg',source='<svg xmlns="http://www.w3.org/2000/svg"><path fill="#111"/></svg>';
  fs.writeFileSync(path.join(root,file),source);
  const order={ownerApproved:true,selectedTask:{ownerDirective:true,gameId:'sample-game',
    vibe59VisualAssetEdits:[{path:file,expectedSha256:digest(source),
      find:'fill="#111"',replace:'fill="#246"'}]}};
  const options={order,sourceRoot:root,repositoryRoot:repo,responsibleFiles:[file],target:'web'};
  const candidate=createVibe59CodeCandidates(options);
  assert.equal(candidate.vibe59CodeKind,'SOURCE_BOUND_VISUAL_ASSET_EDIT');
  assert.equal(candidate.modelUsed,false);assert.equal(candidate.sourceWrite,false);
  assert.equal(fs.readFileSync(path.join(root,file),'utf8'),source);
  const docs=new Map([[file,source]]);
  applyExactEdits(root,candidate.edits,{documents:docs});
  assert.match(docs.get(file),/fill="#246"/);
  assert.equal(fs.readFileSync(path.join(root,file),'utf8'),source);
  assert.throws(()=>createVibe59CodeCandidates({...options,order:{...order,
    selectedTask:{...order.selectedTask,vibe59VisualAssetEdits:[{
      path:file,expectedSha256:'0'.repeat(64),find:'fill="#111"',replace:'fill="#246"'}]}}}),/STALE_SOURCE/);
  assert.throws(()=>createVibe59CodeCandidates({...options,order:{...order,
    ownerApproved:false}}),/NOT_APPROVED/);
});

test('approved Vibe5.9 modifies existing visual SVG and replaces a game asset using verified CC0 originals',t=>{
  const repo=fs.mkdtempSync(path.join(os.tmpdir(),'vibe59-assets-'));
  t.after(()=>fs.rmSync(repo,{recursive:true,force:true}));
  const root=path.join(repo,'web-games','sample-game');
  fs.mkdirSync(path.join(root,'assets'),{recursive:true});
  fs.mkdirSync(path.join(repo,'assets','shared','ui'),{recursive:true});
  fs.writeFileSync(path.join(repo,'game-catalog.json'),JSON.stringify({games:[{id:'sample-game',webPath:'web-games/sample-game',lifecycleState:'ACTIVE'}],ownerStoppedGameIds:[]}));
  const atlas='assets/atlas.svg',icon='assets/crest.png';
  const beforeSvg='<svg xmlns="http://www.w3.org/2000/svg"><rect fill="#111"/></svg>';
  const oldIcon=Buffer.from('old image source'),newIcon=Buffer.from('approved licensed source');
  fs.writeFileSync(path.join(root,atlas),beforeSvg);
  fs.writeFileSync(path.join(root,icon),oldIcon);
  fs.writeFileSync(path.join(root,'index.html'),'<img src="assets/crest.png">');
  const approvedSource='assets/shared/ui/crest.png';
  fs.writeFileSync(path.join(repo,approvedSource),newIcon);
  fs.writeFileSync(path.join(repo,'assets','asset-license-ledger.json'),JSON.stringify({
    entries:[{id:'verified-existing-crest',source:'Approved CC0 graphic',
      sourceUrl:'https://example.org/approved-cc0',license:'CC0',commercialUse:true,
      modificationUse:true,verifiedAt:'2026-10-29',targetGame:'sample-game',
      evidence:{licenseUrl:'https://example.org/license',
        files:[{path:approvedSource,sha256:digest(newIcon)}]}}]
  }));
  const order={ownerApproved:true,selectedTask:{ownerDirective:true,gameId:'sample-game',
    approvedAssetMappings:[{path:icon,sourcePath:approvedSource,ledgerId:'verified-existing-crest',
      assetRole:'ui',ownerApproved:true}]}};
  const options={order,sourceRoot:root,repositoryRoot:repo,target:'web'};
  const edit={path:atlas,expectedSha256:digest(beforeSvg),find:'fill="#111"',replace:'fill="#456"'};
  const replace={path:icon,expectedSha256:digest(oldIcon),sourcePath:approvedSource,
    sourceSha256:digest(newIcon),ledgerId:'verified-existing-crest',
    assetRole:'ui',mappingApproved:true};
  const inspection=inspectVibe59ExistingGameAssets({
    ...options,order:{selectedTask:{gameId:'sample-game'}}
  });
  assert.equal(inspection.sourceWrite,false);
  assert.ok(inspection.assets.some(x=>x.path===atlas&&x.sha256===digest(beforeSvg)));
  assert.throws(()=>applyVibe59ApprovedGameAssetChanges({...options,
    visualEdits:[edit],binaryReplacements:[replace]}),/NOT_APPROVED/);
  assert.throws(()=>applyVibe59ApprovedGameAssetChanges({...options,
    approvedAssetWrite:true,visualEdits:[edit],
    binaryReplacements:[{...replace,sourceSha256:'0'.repeat(64)}]}),/STALE_SOURCE/);
  assert.throws(()=>applyVibe59ApprovedGameAssetChanges({...options,
    approvedAssetWrite:true,visualEdits:[edit],
    binaryReplacements:[{...replace,mappingApproved:false}]}),/NOT_APPROVED/);
  assert.equal(fs.readFileSync(path.join(root,atlas),'utf8'),beforeSvg);
  assert.deepEqual(fs.readFileSync(path.join(root,icon)),oldIcon);
  const result=applyVibe59ApprovedGameAssetChanges({...options,
    approvedAssetWrite:true,visualEdits:[edit],binaryReplacements:[replace]});
  assert.equal(result.assetWrite,true);
  assert.equal(result.runtimeVerified,false);assert.equal(result.releaseVerified,false);
  assert.deepEqual(result.changedAssets,[atlas,icon]);
  assert.match(fs.readFileSync(path.join(root,atlas),'utf8'),/fill="#456"/);
  assert.deepEqual(fs.readFileSync(path.join(root,icon)),newIcon);
  assert.equal(fs.readFileSync(path.join(root,'index.html'),'utf8'),'<img src="assets/crest.png">');
});
test('Vibe5.9 asset editing refuses unlicensed binaries and unsafe SVG scripts without touching originals',t=>{
  const repo=fs.mkdtempSync(path.join(os.tmpdir(),'vibe59-asset-deny-'));
  t.after(()=>fs.rmSync(repo,{recursive:true,force:true}));
  const root=path.join(repo,'web-games','sample-game');fs.mkdirSync(path.join(root,'assets'),{recursive:true});
  fs.mkdirSync(path.join(repo,'assets','shared'),{recursive:true});
  fs.writeFileSync(path.join(repo,'game-catalog.json'),JSON.stringify({games:[{id:'sample-game',webPath:'web-games/sample-game',lifecycleState:'ACTIVE'}]}));
  const file='assets/atlas.svg',original='<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
  fs.writeFileSync(path.join(root,file),original);
  fs.writeFileSync(path.join(root,'assets','image.png'),'old');
  fs.writeFileSync(path.join(repo,'assets','shared','image.png'),'new');
  fs.writeFileSync(path.join(repo,'assets','asset-license-ledger.json'),JSON.stringify({
    entries:[{id:'not-cc0',source:'unknown',sourceUrl:'https://example.org',
      license:'UNKNOWN',commercialUse:true,modificationUse:true,verifiedAt:'2026-10-29',
      targetGame:'sample-game',evidence:{licenseUrl:'https://example.org/license',
        files:[{path:'assets/shared/image.png',sha256:digest('new')}]}}]
  }));
  const options={order:{ownerApproved:true,selectedTask:{ownerDirective:true,gameId:'sample-game',
    approvedAssetMappings:[{path:'assets/image.png',sourcePath:'assets/shared/image.png',
      ledgerId:'not-cc0',assetRole:'ui',ownerApproved:true}]}},
    sourceRoot:root,repositoryRoot:repo,target:'web',approvedAssetWrite:true};
  assert.throws(()=>applyVibe59ApprovedGameAssetChanges({...options,
    visualEdits:[{path:file,expectedSha256:digest(original),find:'<rect/>',
      replace:'<script>alert(1)</script>'}]}),/UNSAFE_SVG/);
  assert.equal(fs.readFileSync(path.join(root,file),'utf8'),original);
  assert.throws(()=>applyVibe59ApprovedGameAssetChanges({...options,
    binaryReplacements:[{path:'assets/image.png',expectedSha256:digest('old'),
      sourcePath:'assets/shared/image.png',sourceSha256:digest('new'),
      ledgerId:'not-cc0',assetRole:'ui',mappingApproved:true}]}),/LICENSE_NOT_VERIFIED/);
  assert.equal(fs.readFileSync(path.join(root,'assets','image.png'),'utf8'),'old');
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


test('Sprint3 nested Luau if/for with verified player argument produces executable server state and display calls',t=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-sprint3-luau-'));
  t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  const root=path.join(temp,'game');fs.mkdirSync(path.join(root,'server'),{recursive:true});
  const relative='server/Combat.server.luau';
  const source=[
    'local score = 0','local shown = 0',
    'local function commitState(player: any)',
    '  score += player.amount','end',
    'local function render(player: any)',
    '  shown = score','end',
    'local function event(player: any)',
    '  for i = 1, 2 do',
    '    if i > 0 then score += 1 end',
    '  end','end',''
  ].join('\n');
  fs.writeFileSync(path.join(root,relative),source);
  const options={order:{selectedTask:{gameId:'game',ownerDirective:true,
    goal:'When function event runs, call commitState then render',
    sourceSha256:digest(source)}},sourceRoot:root,responsibleFiles:[relative],target:'roblox'};
  const index=indexVibe2GameSource({sourceRoot:root,gameId:'game',target:'roblox',responsibleFiles:[relative]});
  const handler=index.functions.find(row=>row.name==='event');
  assert.equal(handler?.parserConfidence,'BOUNDED_NESTED_LUAU');
  assert.equal(handler?.params,'player: any');
  const planned=planVibe2ComplexWork(options);
  assert.deepEqual(planned.steps.map(row=>row.forwardedArguments),[['player'],['player']]);
  const candidate=createVibe59CodeCandidates(options);
  assert.deepEqual(candidate.edits.map(row=>row.path),[relative]);
  assert.equal(candidate.runtimeVerified,false);
  const docs=new Map([[relative,source]]);
  applyExactEdits(root,candidate.edits,{documents:docs});
  const changed=docs.get(relative);
  assert.match(changed,/commitState\(player\)\s+render\(player\)\s+end/);
  assert.match(changed,/for i = 1, 2 do[\s\S]*if i > 0 then score \+= 1 end[\s\S]*commitState\(player\)/);
  assert.equal(fs.readFileSync(path.join(root,relative),'utf8'),source);
  const runnable=changed+'\nevent({amount=3})\nassert(score==5 and shown==5)\nprint("VIBE2_NESTED_PARAM_RUNTIME=PASS")\n';
  const targetFile=path.join(temp,'candidate.luau');fs.writeFileSync(targetFile,runnable);
  const compiler=process.env.VIBE2_LUAU_COMPILER;
  if(compiler&&fs.existsSync(compiler)){
    const result=spawnSync(compiler,[targetFile],{encoding:'utf8',timeout:12000});
    assert.equal(result.status,0,'Luau compiler: '+String(result.stderr).slice(-900));
  }
  const runner=process.env.VIBE2_LUAU_BINARY;
  if(runner&&fs.existsSync(runner)){
    const result=spawnSync(runner,[targetFile],{encoding:'utf8',timeout:12000});
    assert.equal(result.status,0,'Luau runtime: '+String(result.stderr).slice(-900));
    assert.match(result.stdout,/VIBE2_NESTED_PARAM_RUNTIME=PASS/);
  }
});

test('Sprint3 WEB forward only explicit original identifiers and reject mismatched or shadowed params',t=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-sprint3-web-'));
  t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  const root=path.join(temp,'game');fs.mkdirSync(root);
  const relative='game.js';
  const source='let score=0, shown=0;\n'+
    'function commitState(actor){ score += actor.amount; }\n'+
    'function render(actor){ shown=score; }\n'+
    'function event(actor, inventory){ score += 1; }\n';
  fs.writeFileSync(path.join(root,relative),source);
  const order={selectedTask:{gameId:'game',ownerDirective:true,
    goal:'When function event runs, call commitState then render'}};
  const options={order,sourceRoot:root,responsibleFiles:[relative],target:'web'};
  const candidate=createVibe59CodeCandidates(options);
  assert.deepEqual(candidate.edits.map(row=>row.path),[relative]);
  const docs=new Map([[relative,source]]);
  applyExactEdits(root,candidate.edits,{documents:docs});
  const game=vm.createContext({});
  vm.runInContext(docs.get(relative)+'event({amount:4},{});',game);
  assert.deepEqual(Array.from(vm.runInContext('[score,shown]',game)),[5,5]);
  assert.equal(fs.readFileSync(path.join(root,relative),'utf8'),source);

  const mismatch=source.replace('function render(actor)','function render(other)');
  fs.writeFileSync(path.join(root,relative),mismatch);
  assert.throws(()=>createVibe59CodeCandidates(options),/PARAMETER_BINDING_UNPROVEN/);
  const shadow=source.replace('score += 1;','let actor = {amount:100}; score += 1;');
  fs.writeFileSync(path.join(root,relative),shadow);
  assert.throws(()=>createVibe59CodeCandidates(options),/PARAMETER_BINDING_UNPROVEN/);
  const dynamic=source.replace('function render(actor)','function render(...args)');
  fs.writeFileSync(path.join(root,relative),dynamic);
  assert.throws(()=>createVibe59CodeCandidates(options),/PARAMETER_CONTRACT/);
});

test('Sprint3 fail-closed on Luau early return and nested closure instead of placing unreachable or ambiguous calls',t=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-sprint3-deny-'));
  t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  const root=path.join(temp,'game');fs.mkdirSync(path.join(root,'server'),{recursive:true});
  const relative='server/Game.server.luau',head='local function a(player)\nend\nlocal function b(player)\nend\n';
  const order={selectedTask:{gameId:'game',ownerDirective:true,goal:'When function c runs, call a then b'}};
  const options={order,sourceRoot:root,responsibleFiles:[relative],target:'roblox'};
  fs.writeFileSync(path.join(root,relative),head+'local function c(player)\n if not player then return end\nend\n');
  assert.throws(()=>createVibe59CodeCandidates(options),/UNSUPPORTED_FUNCTION_CONTRACT/);
  fs.writeFileSync(path.join(root,relative),head+'local function c(player)\n local function hidden() end\nend\n');
  assert.throws(()=>createVibe59CodeCandidates(options),/SOURCE_BINDING_NOT_UNIQUE/);
  fs.writeFileSync(path.join(root,relative),head+'local function c(player)\n remote.OnServerEvent:Connect(handle)\nend\n');
  assert.throws(()=>createVibe59CodeCandidates(options),/UNSUPPORTED_FUNCTION_CONTRACT/);
  fs.writeFileSync(path.join(root,relative),head+'local function c(player)\n local player = nil\nend\n');
  assert.throws(()=>createVibe59CodeCandidates(options),/PARAMETER_BINDING_UNPROVEN/);
});

test('Sprint3 real line-defense Roblox nested server handler produces source-bound candidate and keeps original untouched',t=>{
  const root=path.resolve('roblox-games/line-defense');
  const relative='server/Game.server.luau';
  const original=fs.readFileSync(path.join(root,relative),'utf8');
  const options={order:{selectedTask:{
    gameId:'line-defense',ownerDirective:true,
    sourceSha256:digest(original),
    goal:'When function attackEnemy runs, call startQuest then updateInventorySummary'
  }},sourceRoot:root,responsibleFiles:[relative],target:'roblox'};
  const index=indexVibe2GameSource({sourceRoot:root,gameId:'line-defense',target:'roblox',responsibleFiles:[relative]});
  const handler=index.functions.find(row=>row.name==='attackEnemy');
  assert.ok(handler,'actual nested server handler must be grounded');
  assert.equal(handler.parserConfidence,'BOUNDED_NESTED_LUAU');
  const candidate=createVibe59CodeCandidates(options);
  assert.equal(candidate.vibe59CodeKind,'SOURCE_BOUND_COMPLEX_CHAIN');
  assert.equal(candidate.sourceSha256,digest(original));
  const replay=new Map([[relative,original]]);
  applyExactEdits(root,candidate.edits,{documents:replay});
  assert.match(replay.get(relative),/startQuest\(player\)\s+updateInventorySummary\(player\)\s+end/);
  assert.equal(fs.readFileSync(path.join(root,relative),'utf8'),original);
  const compiler=process.env.VIBE2_LUAU_COMPILER;
  if(compiler&&fs.existsSync(compiler)){
    const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-sprint3-real-'));
    t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
    const candidateFile=path.join(temp,'Game.server.luau');
    fs.writeFileSync(candidateFile,replay.get(relative));
    const result=spawnSync(compiler,[candidateFile],{encoding:'utf8',timeout:12000});
    assert.equal(result.status,0,'actual-source compilation: '+String(result.stderr).slice(-900));
  }
});


test('Sprint4 bounded Korean/English owner instructions compile exact 3–4 effect sequential DAGs',t=>{
  const {options}=setup(t);
  options.order.selectedTask.goal='When function event runs, call commitState then render then updateHud';
  const three=compileVibe2ComplexIntent(options);
  assert.deepEqual(three.requirements.map(r=>r.effect),['commitState','render','updateHud']);
  assert.deepEqual(three.requirements[1].dependsOn,[three.requirements[0].id]);
  assert.deepEqual(three.requirements[2].dependsOn,[three.requirements[1].id]);

  options.order.selectedTask.goal='함수 event 실행 후 commitState 다음 render 다음 updateHud 그리고 recordHit 호출';
  const four=compileVibe2ComplexIntent(options);
  assert.deepEqual(four.requirements.map(r=>r.effect),
    ['commitState','render','updateHud','recordHit']);
  assert.deepEqual(four.requirements[3].dependsOn,[four.requirements[2].id]);
  options.order.selectedTask.goal='When function event runs, call commitState then render then updateHud then recordHit then extraHit';
  assert.equal(compileVibe2ComplexIntent(options),null,'five effects must fail closed');
  options.order.selectedTask.goal='When function event runs, call commitState then render(); delete everything';
  assert.equal(compileVibe2ComplexIntent(options),null,'unsupported second clause must fail closed');
  options.order.selectedTask.goal='When function event runs, call commitState then render';
  options.order.selectedTask.ownerDirective=false;
  assert.throws(()=>compileVibe2ComplexIntent(options),/OWNER_DIRECTIVE_REQUIRED/);
});

test('Sprint4 WEB combat-to-bestiary-to-HUD chain forwards exact non-prefix arguments and runs in order',t=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-sprint4-web-'));
  t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  const root=path.join(temp,'game');fs.mkdirSync(root);
  const relative='combat.js';
  const original=[
    'let kills=0, shown="", order=[];',
    'function applyDamage(enemy, amount) { enemy.hp -= amount; order.push("damage"); }',
    'function registerBestiary(enemy) { if(enemy.hp<=0) kills++; order.push("bestiary"); }',
    'function render(player) { shown=player.id+":"+kills; order.push("render"); }',
    'function onHit(player, enemy, amount) { player.hits++; order.push("hit"); }',''
  ].join('\n');
  fs.writeFileSync(path.join(root,relative),original);
  const options={order:{selectedTask:{gameId:'game',ownerDirective:true,
    goal:'When function onHit runs, call applyDamage then registerBestiary then render',
    sourceSha256:digest(original)}},sourceRoot:root,responsibleFiles:[relative],target:'web'};
  const plan=planVibe2ComplexWork(options);
  assert.deepEqual(plan.steps.map(s=>s.forwardedArguments),
    [['enemy','amount'],['enemy'],['player']]);
  assert.ok(plan.steps.every(s=>s.parameterEvidence==='EXACT_ORIGINAL_FORMAL_NAME_SUBSET'));
  const candidate=createVibe59CodeCandidates(options);
  const documents=new Map([[relative,original]]);
  applyExactEdits(root,candidate.edits,{documents});
  const changed=documents.get(relative);
  assert.match(changed,/applyDamage\(enemy, amount\);\s+registerBestiary\(enemy\);\s+render\(player\);/);
  const game=vm.createContext({});
  vm.runInContext(changed+'const player={id:7,hits:0},enemy={hp:3};onHit(player,enemy,4);',game);
  assert.deepEqual(Array.from(vm.runInContext('[enemy.hp,kills,shown,player.hits,...order]',game)),
    [-1,1,'7:1',1,'hit','damage','bestiary','render']);
  assert.equal(fs.readFileSync(path.join(root,relative),'utf8'),original);
  fs.writeFileSync(path.join(root,relative),
    original.replace('function registerBestiary(enemy)','function registerBestiary(monster)'));
  assert.throws(()=>createVibe59CodeCandidates(options),/PARAMETER_BINDING_UNPROVEN/);
  fs.writeFileSync(path.join(root,relative),
    original.replace('player.hits++;','let enemy={hp:100};player.hits++;'));
  assert.throws(()=>createVibe59CodeCandidates(options),/PARAMETER_BINDING_UNPROVEN/);
});

test('Sprint4 Luau server combat -> bestiary -> HUD -> journal code compiles, retains original, and optionally runs',t=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-sprint4-luau-'));
  t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  const root=path.join(temp,'game');fs.mkdirSync(path.join(root,'server'),{recursive:true});
  const relative='server/Game.server.luau';
  const original=[
    'local hits = 0','local kills = 0','local shown = 0','local journal = ""',
    'local function applyDamage(enemy: any, amount: number)',
    '  enemy.hp -= amount','end',
    'local function registerBestiary(enemy: any)',
    '  if enemy.hp <= 0 then kills += 1 end','end',
    'local function render(player: any)',
    '  shown = player.id','end',
    'local function traceCombat(player: any, enemy: any)',
    '  journal = tostring(player.id) .. ":" .. tostring(enemy.hp)','end',
    'local function onHit(player: any, enemy: any, amount: number)',
    '  for index = 1, 2 do hits += 1 end','end',''
  ].join('\n');
  fs.writeFileSync(path.join(root,relative),original);
  const options={order:{selectedTask:{gameId:'game',ownerDirective:true,
    sourceSha256:digest(original),
    goal:'When function onHit runs, call applyDamage then registerBestiary then render then traceCombat'
  }},sourceRoot:root,responsibleFiles:[relative],target:'roblox'};
  const plan=planVibe2ComplexWork(options);
  assert.deepEqual(plan.steps.map(s=>s.forwardedArguments),
    [['enemy','amount'],['enemy'],['player'],['player','enemy']]);
  const candidate=createVibe59CodeCandidates(options);
  assert.equal(candidate.modelUsed,false);
  assert.equal(candidate.runtimeVerified,false);
  const docs=new Map([[relative,original]]);
  applyExactEdits(root,candidate.edits,{documents:docs});
  const changed=docs.get(relative);
  assert.match(changed,/applyDamage\(enemy, amount\)\s+registerBestiary\(enemy\)\s+render\(player\)\s+traceCombat\(player, enemy\)\s+end/);
  const runnable=changed+
    '\nlocal player = {id=7}\nlocal enemy = {hp=3}\nonHit(player,enemy,4)\n'+
    'assert(hits==2 and kills==1 and shown==7 and journal=="7:-1")\n'+
    'print("VIBE2_SPRINT4_COMBAT_BESTIARY_HUD=PASS")\n';
  const generated=path.join(temp,'candidate.luau');fs.writeFileSync(generated,runnable);
  const compiler=process.env.VIBE2_LUAU_COMPILER;
  if(compiler&&fs.existsSync(compiler)){
    const result=spawnSync(compiler,[generated],{encoding:'utf8',timeout:12000});
    assert.equal(result.status,0,'Luau compiler: '+String(result.stderr).slice(-800));
  }
  const runner=process.env.VIBE2_LUAU_BINARY;
  if(runner&&fs.existsSync(runner)){
    const result=spawnSync(runner,[generated],{encoding:'utf8',timeout:12000});
    assert.equal(result.status,0,'Luau runtime: '+String(result.stderr).slice(-800));
    assert.match(result.stdout,/VIBE2_SPRINT4_COMBAT_BESTIARY_HUD=PASS/);
  }
  assert.equal(fs.readFileSync(path.join(root,relative),'utf8'),original);
});

test('Sprint4 real Roblox line-defense synthesizes read-only three-stage server candidate with exact SHA',t=>{
  const root=path.resolve('roblox-games/line-defense');
  const relative='server/Game.server.luau';
  const original=fs.readFileSync(path.join(root,relative),'utf8');
  // A synthetic candidate fixture, NOT an owner command to publish behavior into the game.
  const options={order:{selectedTask:{gameId:'line-defense',ownerDirective:true,
    sourceSha256:digest(original),
    goal:'When function attackEnemy runs, call updateInventorySummary then startQuest then placeTower'
  }},sourceRoot:root,responsibleFiles:[relative],target:'roblox'};
  const candidate=createVibe59CodeCandidates(options);
  assert.equal(candidate.sourceSha256,digest(original));
  assert.equal(candidate.sourceWrite,false);
  assert.equal(candidate.runtimeVerified,false);
  const replay=new Map([[relative,original]]);
  applyExactEdits(root,candidate.edits,{documents:replay});
  assert.match(replay.get(relative),/updateInventorySummary\(player\)\s+startQuest\(player\)\s+placeTower\(player\)\s+end/);
  assert.equal(fs.readFileSync(path.join(root,relative),'utf8'),original);
  const compiler=process.env.VIBE2_LUAU_COMPILER;
  if(compiler&&fs.existsSync(compiler)){
    const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-sprint4-real-'));
    t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
    const source=path.join(temp,'Game.server.luau');
    fs.writeFileSync(source,replay.get(relative));
    const result=spawnSync(compiler,[source],{encoding:'utf8',timeout:12000});
    assert.equal(result.status,0,'Luau source compile: '+String(result.stderr).slice(-800));
  }
});
