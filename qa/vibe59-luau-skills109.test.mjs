// Vibe5.9: executable 109 Luau recipes and independent offline regressions.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {VIBE59_LUAU_CODING_SKILLS_109,synthesizeVibe59LuauSkill,
  verifyVibe59LuauSkillScenarios} from '../tools/vibe59-luau-skills109.mjs';
import {createVibe59CodeCandidate,buildVibe59AutonomyPlan} from '../tools/vibe2-v59-autonomy.mjs';
const copy=x=>JSON.parse(JSON.stringify(x));
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
});
