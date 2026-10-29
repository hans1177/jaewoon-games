// Vibe5.9: executable 109 Luau recipes and independent offline regressions.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {applyExactEdits} from '../tools/autonomous-safe-edit.mjs';
import {VIBE59_LUAU_CODING_SKILLS_109,synthesizeVibe59LuauSkill,
  verifyVibe59LuauSkillScenarios} from '../tools/vibe59-luau-skills109.mjs';
import {createVibe59CodeCandidate,createVibe59CodeCandidates,buildVibe59AutonomyPlan} from '../tools/vibe2-v59-autonomy.mjs';
const copy=x=>JSON.parse(JSON.stringify(x));

test('owner plain-English WEB stat clamp synthesizes a real unique inline game edit without model or source write',t=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'vibe59-intent-web-'));
 t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
 const root=path.join(tmp,'my-game');fs.mkdirSync(root);
 const html='<!doctype html><script>\nlet speed = baseSpeed;\n</script><button id="start">Start</button>\n';
 fs.writeFileSync(path.join(root,'index.html'),html);
 const order={selectedTask:{ownerDirective:true,gameId:'my-game',goal:'Clamp speed between 0 and 25'}};
 const run=()=>createVibe59CodeCandidates({order,sourceRoot:root,responsibleFiles:['index.html'],target:'web'});
 const candidate=run();
 assert.equal(candidate.vibe59CodeKind,'WEB_SOURCE_BOUND_STAT');
 assert.equal(candidate.vibe59TestPlan.pass,true);
 assert.equal(candidate.vibe59TestPlan.cases.length,5);
 assert.deepEqual(candidate.edits.map(x=>x.path),['index.html']);
 assert.match(candidate.edits[0].replace,/let speed = Math\.min\(25, Math\.max\(0, baseSpeed\)\);/);
 assert.equal(candidate.modelUsed,false);
 assert.equal(candidate.runtimeVerified,false);
 assert.equal(candidate.ruleDigest.length,64);
 assert.equal(fs.readFileSync(path.join(root,'index.html'),'utf8'),html);
 const patched=new Map();
 applyExactEdits(root,candidate.edits,{documents:patched});
 assert.match(patched.get('index.html'),/Math\.min\(25, Math\.max\(0, baseSpeed\)\)/);
 assert.equal(fs.readFileSync(path.join(root,'index.html'),'utf8'),html);
});
test('Korean owner Luau intent creates bounded source patch only for approved original variable',t=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'vibe59-intent-luau-'));
 t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
 const root=path.join(tmp,'rpg');fs.mkdirSync(path.join(root,'server'),{recursive:true});
 const relative='server/Game.server.luau',source='local speed = targetSpeed\nprint(speed)\n';
 fs.writeFileSync(path.join(root,relative),source);
 const order={selectedTask:{ownerDirective:true,gameId:'rpg',goal:'변수 speed를 0에서 25까지 제한해'}};
 const result=createVibe59CodeCandidates({order,sourceRoot:root,responsibleFiles:[relative],target:'roblox'});
 assert.equal(result.vibe59CodeKind,'ROBLOX_SOURCE_BOUND_STAT');
 assert.match(result.edits[0].replace,/local speed = math\.clamp\(targetSpeed, 0, 25\)/);
 assert.equal(result.vibe59TestPlan.cases.length,5);
 assert.equal(result.sourceWrite,false);
 assert.equal(fs.readFileSync(path.join(root,relative),'utf8'),source);
});
test('offline owner intent synthesis rejects scope escape, ambiguous edits and invalid or vague requests',t=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'vibe59-intent-guard-'));
 t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
 const root=path.join(tmp,'rpg'),elsewhere=path.join(tmp,'elsewhere');
 fs.mkdirSync(path.join(root,'server'),{recursive:true});fs.mkdirSync(elsewhere);
 const relative='server/Game.server.luau',file=path.join(root,relative);
 fs.writeFileSync(file,'local speed = baseSpeed\n');
 const base={selectedTask:{ownerDirective:true,gameId:'rpg',goal:'Clamp speed between 0 and 25'}};
 const run=(order=base,files=[relative],dir=root)=>createVibe59CodeCandidates({
   order,sourceRoot:dir,responsibleFiles:files,target:'roblox'});
 assert.ok(run());
 assert.equal(run({selectedTask:{...base.selectedTask,ownerDirective:false}}),null);
 assert.equal(run({selectedTask:{...base.selectedTask,gameId:'different'}}),null);
 assert.equal(run({selectedTask:{...base.selectedTask,goal:'Improve the entire RPG game'}}),null);
 assert.equal(run({selectedTask:{...base.selectedTask,goal:'Clamp speed between 50 and 25'}}),null);
 assert.equal(run({selectedTask:{...base.selectedTask,goal:'Clamp speed between 0 and Infinity'}}),null);
 assert.equal(run(base,['../elsewhere/foreign.luau']),null);
 fs.writeFileSync(file,'local speed = baseSpeed\nspeed = bonusSpeed\n');
 assert.equal(run(),null,'two existing assignments must not be arbitrarily selected');
 fs.writeFileSync(file,'local speed = computeSpeed()\n');
 assert.equal(run(),null,'function calls and side-effecting expressions are not inferred');
 fs.writeFileSync(path.join(elsewhere,'outside.luau'),'local speed = baseSpeed\n');
 fs.symlinkSync(path.join(elsewhere,'outside.luau'),path.join(root,'server','link.luau'));
 assert.equal(run(base,['server/link.luau']),null,'linked external file cannot cross a game root');
});

const source='local function handler(player)\n local state = profiles[player]\n'+
 ' if state.data.value and state.data.flag and state.data.check and state.data.other then end\n'+
 ' -- INSERT\nend';
function fixture(row){
 const k=row.kind,bool=['near-on','far-off','confirm-on','confirm-off','on','off','has-on'].includes(k);
 const spec={operation:row.id,collection:'data',field:bool?'flag':'value',
  conditionField:'check',toField:'other',amount:2,cap:10,threshold:5,functionName:'handler'};
 const yes={data:{value:4,flag:false,check:3,other:3},unrelated:19},no=copy(yes);
 if(k==='milestone'){spec.amount=6;no.data.value=8}
 if(k==='cooldown'){yes.data.check=8;no.data.check=3}
 if(k==='near-on')no.data.check=8;
 if(k==='far-off'){yes.data.flag=true;yes.data.check=8;no.data.flag=true;no.data.check=3}
 if(k==='confirm-on'||k==='confirm-add'){yes.data.check=true;no.data.check=false}
 if(k==='confirm-off'){yes.data.check=true;yes.data.flag=true;no.data.check=false;no.data.flag=true}
 if(k==='has-on')no.data.check=0;
 if(k==='on')no.data.flag=true;
 if(k==='off')yes.data.flag=true;
 if(k==='add')no.data.value=10;
 if(['spend','damage','transfer'].includes(k))no.data.value=0;
 const after=copy(yes),d=after.data;
 if(k==='add'||k==='confirm-add')d.value=6;
 if(k==='spend'||k==='damage')d.value=2;
 if(k==='milestone')d.value=6;
 if(k==='cooldown')d.value=10;
 if(['near-on','confirm-on','on','has-on'].includes(k))d.flag=true;
 if(['far-off','confirm-off','off'].includes(k))d.flag=false;
 if(k==='transfer'){d.value=2;d.other=5}
 return {spec,scenarios:[
  {initialState:yes,expectedState:after,expectedApplied:true},
  {initialState:no,expectedState:no,expectedApplied:false}
 ]};
}
test('109 unique Luau coding recipes generate real code with 218 passing scenarios',()=>{
 assert.equal(VIBE59_LUAU_CODING_SKILLS_109.length,109);
 assert.equal(new Set(VIBE59_LUAU_CODING_SKILLS_109.map(x=>x.id)).size,109);
 assert.deepEqual(Object.fromEntries(
  ['ai','combat','building','inventory','bestiary','saving','world',
   'crafting','quests','economy','ui'].map(x=>[
    x,VIBE59_LUAU_CODING_SKILLS_109.filter(y=>y.system===x).length])),
  {ai:12,combat:12,building:10,inventory:10,bestiary:8,saving:10,
   world:10,crafting:10,quests:10,economy:9,ui:8});
 for(const row of VIBE59_LUAU_CODING_SKILLS_109){
  const {spec,scenarios}=fixture(row);
  const proof=verifyVibe59LuauSkillScenarios({spec,scenarios});
  assert.equal(proof.pass,true,row.id);
  assert.deepEqual(proof.cases.map(x=>x.applied),[true,false],row.id);
  const code=synthesizeVibe59LuauSkill({spec,source,replaceAnchor:'-- INSERT',
   sourcePath:'server/Game.server.luau'});
  assert.equal(code.operation,row.id);
  assert.match(code.source,/if not \(.+\) then return false end/);
  assert.match(code.source,/state\.data\./);
  assert.equal(code.sourceWrite,false);
  assert.equal(code.runtimeVerified,false);
  assert.equal(code.modelUsed,false);
  assert.equal(code.safety.noNewSaveKeys,true);
 }
});
test('invalid source, field, operation and forged code snippet rejected',()=>{
 const spec=fixture(VIBE59_LUAU_CODING_SKILLS_109[0]).spec;
 const call=x=>synthesizeVibe59LuauSkill({spec,source,replaceAnchor:'-- INSERT',
  sourcePath:'server/Game.server.luau',...x});
 assert.throws(()=>call({sourcePath:'client/UI.client.luau'}),/SERVER_ONLY/);
 assert.throws(()=>call({spec:{...spec,operation:'invalid'}}),/UNKNOWN_OPERATION/);
 assert.throws(()=>call({spec:{...spec,field:'missing'}}),/EXISTING_FIELD/);
 assert.throws(()=>call({spec:{...spec,field:'__proto__'}}),/BAD_IDENTIFIER/);
 assert.throws(()=>call({source:source+' -- INSERT'}),/UNIQUE_ANCHOR/);
 const spoof="local function handler(player)\n local state = profiles[player]\n"+
  " -- state.data.value\n local fake = 'state.data.value'\n -- INSERT\nend";
 assert.throws(()=>call({source:spoof}),/EXISTING_FIELD/);
});
test('offline oracle rejects invalid expected state and missing negative scenario',()=>{
 const {spec,scenarios}=fixture(VIBE59_LUAU_CODING_SKILLS_109[2]);
 const counterexample=verifyVibe59LuauSkillScenarios({spec,scenarios:[
  scenarios[0],{...scenarios[1],expectedState:scenarios[0].expectedState}]});
 assert.equal(counterexample.pass,false);
 assert.throws(()=>verifyVibe59LuauSkillScenarios({spec,scenarios:[scenarios[0]]}),
  /SCENARIOS_REQUIRED/);
 assert.throws(()=>verifyVibe59LuauSkillScenarios({spec,scenarios:[
  scenarios[0],scenarios[0]]}),/BOTH_BOUNDARIES_REQUIRED/);
 assert.throws(()=>verifyVibe59LuauSkillScenarios({spec:{...spec,amount:Infinity},
  scenarios}),/BAD_NUMBER/);
});
test('canonical Vibe5.9 worker receives a scoped Luau edit candidate; no disk write',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe59-skills109-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'server'));
 const rel='server/Game.server.luau',file=path.join(root,rel);
 fs.writeFileSync(file,source);
 const {spec,scenarios}=fixture(VIBE59_LUAU_CODING_SKILLS_109.find(x=>x.id==='inventory-pickup'));
 const request={ownerApproved:true,path:rel,find:'-- INSERT',robloxSkill109:spec,scenarios};
 const run=req=>createVibe59CodeCandidate({order:{vibe59CodeRequest:req},
  sourceRoot:root,responsibleFiles:[rel],target:'roblox'});
 const result=run(request);
 assert.equal(result.vibe59CodeKind,'ROBLOX_SKILL_109');
 assert.equal(result.vibe59Skill,'inventory-pickup');
 assert.equal(result.vibe59TestPlan.pass,true);
 assert.equal(result.vibe59TestPlan.cases.length,2);
 assert.equal(result.ruleDigest.length,64);
 assert.equal(result.edits.length,1);
 assert.match(result.edits[0].replace,/math\.min\(10/);
 assert.equal(fs.readFileSync(file,'utf8'),source);
 assert.throws(()=>run({...request,ownerApproved:false}),/OWNER_EXPLICIT_CODING_SPEC_REQUIRED/);
 assert.throws(()=>run({...request,path:'../Game.server.luau'}),/UNAPPROVED_SOURCE/);
 assert.throws(()=>run({...request,sourceSha256:'0'.repeat(64)}),/STALE_SOURCE/);
 assert.throws(()=>run({...request,robloxDomainAction:{}}),/OWNER_EXPLICIT_CODING_SPEC_REQUIRED/);
});
test('autonomy planning lists 109 recipes as not runtime verified',()=>{
 const plan=buildVibe59AutonomyPlan({target:'roblox',order:{goal:'monster combat'}});
 assert.equal(plan.skillCatalog.total,109);
 assert.equal(plan.skillCatalog.systems.length,11);
 assert.equal(plan.skillCatalog.runtimeVerified,false);
 assert.equal(plan.sourceWrite,false);
 assert.equal(plan.synthesisCandidateAvailable,false);
});


test('Vibe5.9 complex offline design compiles dependency-ordered gameplay code across files',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe59-complex-design-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'server'));
 const files=['server/Inventory.server.luau','server/Bestiary.server.luau'];
 for(const file of files)fs.writeFileSync(path.join(root,file),source);
 const inventory=fixture(VIBE59_LUAU_CODING_SKILLS_109.find(row=>row.id==='inventory-pickup'));
 const bestiary=fixture(VIBE59_LUAU_CODING_SKILLS_109.find(row=>row.id==='bestiary-sighting'));
 const pick={id:'pickup',ownerApproved:true,path:files[0],find:'-- INSERT',
  robloxSkill109:inventory.spec,scenarios:inventory.scenarios};
 const record={id:'record',dependsOn:['pickup'],ownerApproved:true,path:files[1],
  find:'-- INSERT',robloxSkill109:bestiary.spec,scenarios:bestiary.scenarios};
 const options={sourceRoot:root,responsibleFiles:files,target:'roblox'};
 const order={vibe59CodeRequests:[record,pick]};
 assert.equal(buildVibe59AutonomyPlan({order,target:'roblox'}).synthesisCandidateAvailable,true);
 assert.equal(buildVibe59AutonomyPlan({order:{selectedTask:order},target:'roblox'}).synthesisCandidateAvailable,true);
 const result=createVibe59CodeCandidates({...options,order});
 assert.equal(result.vibe59CodeKind,'COMPOSED_OFFLINE_SOURCE');
 assert.deepEqual(result.vibe59DesignSteps.map(row=>row.id),['pickup','record']);
 assert.equal(result.vibe59TestPlan.pass,true);
 assert.equal(result.vibe59TestPlan.cases.length,4);
 assert.deepEqual(result.edits.map(row=>row.path),files);
 assert.equal(result.modelUsed,false);
 assert.equal(result.sourceWrite,false);
 assert.equal(result.runtimeVerified,false);
 for(const file of files)assert.equal(fs.readFileSync(path.join(root,file),'utf8'),source);
 for(const step of result.edits){
  assert.equal(step.find,'-- INSERT');
  assert.match(step.replace,/if not \(.+\) then return false end/);
 }
 assert.throws(()=>createVibe59CodeCandidates({...options,order:{vibe59CodeRequests:[
  {...record,dependsOn:['pickup']},{...pick,dependsOn:['record']} ]}}),
  /DEPENDENCY_CYCLE/);
 assert.throws(()=>createVibe59CodeCandidates({...options,order:{vibe59CodeRequests:[
  {...pick,dependsOn:['not-there']},record]}}),/UNKNOWN_DEPENDENCY/);
 assert.throws(()=>createVibe59CodeCandidates({...options,order:{vibe59CodeRequests:[
  pick,{...record,path:files[0]}]}}),/OVERLAPPING_EDITS/);
 assert.throws(()=>createVibe59CodeCandidates({...options,order:{vibe59CodeRequests:[
  pick,{...record,ownerApproved:false}]}}),/OWNER_APPROVAL_REQUIRED/);
 assert.throws(()=>createVibe59CodeCandidates({...options,order:{vibe59CodeRequests:[
  {...pick,sourceSha256:'0'.repeat(64)},record]}}),/STALE_SOURCE/);
});

test('Vibe5.9 twelve-step offline complex design keeps all changes source-grounded and requires scenario proofs',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe59-twelve-step-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'server'));
 const files=Array.from({length:8},(_,index)=>'server/Game'+index+'.server.luau');
 const {spec,scenarios}=fixture(VIBE59_LUAU_CODING_SKILLS_109.find(row=>row.id==='inventory-pickup'));
 for(const file of files)fs.writeFileSync(path.join(root,file),source);
 const steps=files.map((file,index)=>({id:'step-'+index,
  ...(index?{dependsOn:['step-'+(index-1)]}:{}),
  ownerApproved:true,path:file,find:'-- INSERT',robloxSkill109:spec,scenarios}));
 const options={target:'roblox',sourceRoot:root,responsibleFiles:files};
 const result=createVibe59CodeCandidates({...options,order:{vibe59CodeRequests:[...steps].reverse()}});
 assert.equal(result.vibe59DesignSteps.length,8);
 assert.deepEqual(result.vibe59DesignSteps.map(step=>step.id),steps.map(step=>step.id));
 assert.equal(result.vibe59TestPlan.cases.length,16);
 assert.equal(result.edits.length,8);
 assert.equal(result.modelUsed,false);
 assert.equal(result.sourceWrite,false);
 assert.equal(result.runtimeVerified,false);
 for(const file of files)assert.equal(fs.readFileSync(path.join(root,file),'utf8'),source);
 assert.throws(()=>createVibe59CodeCandidates({...options,order:{vibe59CodeRequests:steps.map((step,index)=>
  index===1?{...step,scenarios:scenarios.slice(0,1)}:step)}}),
  /VIBE59_SKILL_POSITIVE_NEGATIVE_SCENARIOS_REQUIRED|VIBE59_COMPLEX_DESIGN_UNVERIFIED_STEP/);
 assert.throws(()=>createVibe59CodeCandidates({...options,order:{vibe59CodeRequests:
  Array.from({length:13},(_,index)=>({...steps[0],id:'overflow-'+index}))}}),
  /VIBE59_COMPLEX_DESIGN_STEPS_REQUIRED/);
});

test('Vibe5.9 dependent edits use in-memory sources and replay atomically without original writes',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe59-staged-dependency-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'server'));
 const file='server/State.server.luau',before='local health=5\n-- SLOT\n';
 fs.writeFileSync(path.join(root,file),before);
 const ref=name=>({kind:'ref',name});
 const num=value=>({kind:'number',value});
 const makeRule=(op,threshold,thenValue,otherwiseValue)=>({
  when:{kind:'compare',op,left:ref('health'),right:num(threshold)},
  then:[{action:'assign',output:'health',value:num(thenValue)}],
  otherwise:[{action:'assign',output:'health',value:num(otherwiseValue)}]
 });
 const first={id:'first',ownerApproved:true,path:file,find:'-- SLOT',
  rule:makeRule('gt',0,1,0),scenarios:[
   {initialState:{health:5},expectedState:{health:1}},
   {initialState:{health:0},expectedState:{health:0}}]};
 const second={id:'second',dependsOn:['first'],ownerApproved:true,path:file,find:'health = 1',
  rule:makeRule('gte',0,2,3),scenarios:[
   {initialState:{health:1},expectedState:{health:2}},
   {initialState:{health:-1},expectedState:{health:3}}]};
 const options={target:'roblox',sourceRoot:root,responsibleFiles:[file]};
 const result=createVibe59CodeCandidates({...options,order:{vibe59CodeRequests:[second,first]}});
 assert.equal(result.edits.length,2);
 assert.deepEqual(result.vibe59DesignSteps.map(row=>row.id),['first','second']);
 assert.equal(result.vibe59TestPlan.cases.length,4);
 assert.equal(result.vibe59TestPlan.pass,true);
 assert.equal(result.runtimeVerified,false);
 assert.equal(result.sourceWrite,false);
 assert.equal(fs.readFileSync(path.join(root,file),'utf8'),before);
 const replay=new Map([[file,before]]);
 applyExactEdits(root,result.edits,{documents:replay});
 assert.match(replay.get(file),/health = 2/);
 assert.doesNotMatch(replay.get(file),/-- SLOT/);
 assert.equal(fs.readFileSync(path.join(root,file),'utf8'),before);
 assert.throws(()=>createVibe59CodeCandidates({...options,order:{vibe59CodeRequests:[
  first,{...second,dependsOn:[]}
 ]}}),/VIBE59_COMPLEX_DESIGN_ANCHOR_DRIFT/);
});
