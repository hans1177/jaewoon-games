// Execute emitted Luau with the official interpreter (not Roblox Studio).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {VIBE59_LUAU_CODING_SKILLS_109,synthesizeVibe59LuauSkill,verifyVibe59LuauSkillScenarios} from '../tools/vibe59-luau-skills109.mjs';
import {synthesizeVibe59QualityGameplay} from '../tools/vibe59-quality-gameplay.mjs';

const binary=process.env.VIBE59_LUAU_RUNTIME||process.argv[2];
if(!binary||!fs.existsSync(binary))throw Error('VIBE59_LUAU_RUNTIME_REQUIRED');
const copy=x=>JSON.parse(JSON.stringify(x));
function luaValue(x){
 if(x===null)return 'nil';
 if(typeof x==='string')return JSON.stringify(x);
 if(typeof x==='number'){if(!Number.isFinite(x))throw Error('VIBE59_FIXTURE_NUMERIC');return String(x)}
 if(typeof x==='boolean')return String(x);
 if(Array.isArray(x))return '{'+x.map(luaValue).join(',')+'}';
 if(x&&typeof x==='object')return '{'+Object.entries(x).map(([k,v])=>'['+luaValue(k)+']='+luaValue(v)).join(',')+'}';
 throw Error('VIBE59_FIXTURE_UNSUPPORTED');
}
function fixture(row){
 const k=row.kind,bool=['near-on','far-off','confirm-on','confirm-off','on','off','has-on'].includes(k);
 const spec={operation:row.id,collection:'data',field:bool?'flag':'value',
  conditionField:'check',toField:'other',amount:2,cap:10,threshold:5,functionName:'handler'};
 const yes={data:{value:4,flag:false,check:3,other:3},unrelated:17},no=copy(yes);
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
 const expected=copy(yes);
 if(k==='add'||k==='confirm-add')expected.data.value=6;
 if(k==='spend'||k==='damage')expected.data.value=2;
 if(k==='milestone')expected.data.value=6;
 if(k==='cooldown')expected.data.value=10;
 if(['near-on','confirm-on','on','has-on'].includes(k))expected.data.flag=true;
 if(['far-off','confirm-off','off'].includes(k))expected.data.flag=false;
 if(k==='transfer'){expected.data.value=2;expected.data.other=5}
 return {spec,scenarios:[
  {initialState:yes,expectedState:expected,expectedApplied:true},
  {initialState:no,expectedState:no,expectedApplied:false}
 ]};
}
const deepEqual=[
 'local function deepEqual(a,b)',
 ' if type(a) ~= type(b) then return false end',
 ' if type(a) ~= "table" then return a == b end',
 ' for k,v in pairs(a) do if not deepEqual(v,b[k]) then return false end end',
 ' for k in pairs(b) do if a[k] == nil then return false end end',
 ' return true',
 'end'].join('\n');
const files=[];
assert.equal(VIBE59_LUAU_CODING_SKILLS_109.length,109);
for(const row of VIBE59_LUAU_CODING_SKILLS_109){
 const {spec,scenarios}=fixture(row);
 assert.equal(verifyVibe59LuauSkillScenarios({spec,scenarios}).pass,true,row.id);
 const original='local function handler(player)\n local state = profiles[player]\n'+
  ' if state and type(state.data) == "table" and state.data.value and state.data.flag and state.data.check and state.data.other then end\n -- INSERT\nend';
 const out=synthesizeVibe59LuauSkill({spec,source:original,sourcePath:'server/Game.server.luau',
  replaceAnchor:'-- INSERT'});
 let code='local profiles = {}\n'+deepEqual+'\n'+original.replace('-- INSERT',out.source)+'\n';
 for(const [index,c] of scenarios.entries()){
  code+='local user'+index+' = {}\nprofiles[user'+index+'] = '+luaValue(c.initialState)+'\n';
  code+='assert(handler(user'+index+') == '+String(c.expectedApplied)+', "apply '+row.id+':'+index+'")\n';
  code+='assert(deepEqual(profiles[user'+index+'], '+luaValue(c.expectedState)+'), "state '+row.id+':'+index+'")\n';
 }
 // Explicitly execute each emitted recipe against absent state, corrupt container and poison value.
 code+='local missing = {}\nassert(handler(missing) == false, "nil-state '+row.id+'")\n';
 code+='local badContainer = {}\nprofiles[badContainer] = {data=false}\nassert(handler(badContainer) == false, "bad-collection '+row.id+'")\n';
 code+='local poisoned = {}\nprofiles[poisoned] = '+luaValue(scenarios[0].initialState)+'\n';
 code+='profiles[poisoned].data.'+(spec.field)+' = '+(spec.field==='flag'?'\"invalid\"':'math.huge')+'\n';
 code+='assert(handler(poisoned) == false, "poison-field '+row.id+'")\n';
 files.push({name:'skill-'+row.id,code});
}
const spec={operation:'crafting-atomic-recipe',functionName:'craft',
 inputs:[{field:'wood',amount:2},{field:'ore',amount:3}],output:'sword',outputAmount:1,outputLimit:5};
const original='local function craft(player)\n local state = profiles[player]\n'+
 ' if state.inventory.wood and state.inventory.ore and state.inventory.sword then end\n -- VIBE59_QUALITY_SLOT\nend';
const compiled=synthesizeVibe59QualityGameplay({spec,source:original,
 sourcePath:'server/Crafting.server.luau',replaceAnchor:'-- VIBE59_QUALITY_SLOT'});
const craftChecks=[
 'local user = {}',
 'profiles[user] = {inventory={wood=5,ore=4,sword=0}}',
 'assert(craft(user) == true)',
 'assert(deepEqual(profiles[user], {inventory={wood=3,ore=1,sword=1}}))',
 'profiles[user] = {inventory={wood=5,ore=1,sword=0}}',
 'assert(craft(user) == false)',
 'assert(deepEqual(profiles[user], {inventory={wood=5,ore=1,sword=0}}))',
 'profiles[user] = {inventory={wood=5,ore=5,sword=5}}',
 'assert(craft(user) == false)',
 'assert(deepEqual(profiles[user], {inventory={wood=5,ore=5,sword=5}}))'];
files.push({name:'advanced-crafting',code:'local profiles={}\n'+deepEqual+'\n'+
 original.replace('-- VIBE59_QUALITY_SLOT',compiled.source)+'\n'+craftChecks.join('\n')+'\n'});
assert.equal(files.length,110);
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'vibe59-real-luau-'));
try{
 for(const item of files){
  const filename=path.join(directory,item.name+'.luau');
  fs.writeFileSync(filename,item.code,'utf8');
  const result=spawnSync(binary,[filename],{encoding:'utf8',timeout:15000});
  assert.equal(result.error,undefined,item.name+': '+String(result.error));
  assert.equal(result.status,0,item.name+': '+result.stdout+' '+result.stderr);
 }
 console.log('VIBE59_LUAU_EXECUTION=PASS',JSON.stringify({
  executed:files.length,recipes:109,recipeBehaviorChecks:545,
  advancedCraftingCases:3,robloxStudioVerified:false
 }));
}finally{fs.rmSync(directory,{recursive:true,force:true})}
