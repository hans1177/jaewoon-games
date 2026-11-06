// Verify generated server crafting inside the official open-source Luau interpreter.
// This tests deterministic server stubs, not Roblox Studio or DataStore.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {synthesizeVibe59CraftingTransaction} from '../tools/vibe59-crafting-transaction.mjs';
const bin=process.env.VIBE59_LUAU_RUNTIME||process.argv[2];
if(!bin||!fs.existsSync(bin))throw Error('VIBE59_LUAU_RUNTIME_REQUIRED');
const spec={operation:'crafting-verified-transaction',functionName:'craft',recipes:'recipes',maxBatch:4,cooldown:1};
const source='local recipes = {ingot = {inputs = {wood=2,ore=1},outputs={ingot=1},caps={ingot=5}}}\n'+
 'local function craft(player, recipeId, batch, requestId)\n local state = profiles[player]\n'+
 ' if state.inventory.wood and state.crafting.lastAt and state.crafting.lastRequestId'+
 ' and state.crafting.busy and state.save.saving and state.save.dirty then end\n'+
 ' -- VIBE59_QUALITY_SLOT\nend';
const x=synthesizeVibe59CraftingTransaction({spec,source,sourcePath:'server/Craft.server.luau',
 replaceAnchor:'-- VIBE59_QUALITY_SLOT'});
const checks=[
 'local now = 100',
 'local workspace={GetServerTimeNow = function() return now end}',
 'local typeof=function(value) if type(value)=="table" and value.__player then return "Instance" end return type(value) end',
 'local profiles={}',
 source.replace('-- VIBE59_QUALITY_SLOT',x.source),
 'local actor={__player=true,IsA=function(_,kind) return kind=="Player" end}',
 'profiles[actor]={inventory={wood=10,ore=4,ingot=0},crafting={lastAt=0,lastRequestId="",busy=false},save={saving=false,dirty=false}}',
 'local p=profiles[actor]',
 'assert(craft(actor,"ingot",2,"req-1")==true)',
 'assert(p.inventory.wood==6 and p.inventory.ore==2 and p.inventory.ingot==2)',
 'assert(p.crafting.lastRequestId=="req-1" and p.crafting.busy==false and p.save.dirty==true)',
 'assert(craft(actor,"ingot",2,"req-1")==false)', // idempotency
 'assert(p.inventory.wood==6 and p.inventory.ingot==2)',
 'now=102',
 'assert(craft(actor,"ingot",2,"req-2")==true)',
 'assert(p.inventory.wood==2 and p.inventory.ore==0 and p.inventory.ingot==4)',
 'now=104',
 'assert(craft(actor,"ingot",1,"req-3")==false)', // material shortage
 'assert(p.inventory.wood==2 and p.inventory.ingot==4)',
 'p.inventory.ore=3',
 'p.inventory.wood=9',
 'assert(craft(actor,"ingot",2,"req-4")==false)', // storage cap
 'assert(p.inventory.wood==9 and p.inventory.ore==3 and p.inventory.ingot==4)',
 'p.save.saving=true',
 'assert(craft(actor,"ingot",1,"req-5")==false)',
 'assert(p.inventory.wood==9)',
 'p.save.saving=false',
 'p.crafting.busy=true',
 'assert(craft(actor,"ingot",1,"req-6")==false)',
 'p.crafting.busy=false',
 'assert(craft(actor,"unknown",1,"req-7")==false)',
 'assert(craft(actor,"ingot",5,"req-8")==false)',
 'assert(craft(actor,"ingot",1,"../../hack")==false)',
 'assert(p.crafting.busy==false and p.inventory.wood==9)',
 'print("CRAFT_REAL_LUAU_PASS")'
].join('\n')+'\n';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vibe59-real-craft-'));
try{
 const file=path.join(dir,'craft.server.luau');
 fs.writeFileSync(file,checks,'utf8');
 const result=spawnSync(bin,[file],{encoding:'utf8',timeout:15000});
 assert.equal(result.error,undefined,String(result.error));
 assert.equal(result.status,0,'Craft Luau failed: '+result.stdout+' '+result.stderr);
 assert.ok(result.stdout.includes('CRAFT_REAL_LUAU_PASS'));
 console.log('VIBE59_CRAFTING_LUAU_EXECUTION=PASS',JSON.stringify({
  batch:true,replayBlocked:true,storageCap:true,insufficientMaterials:true,
  savingLock:true,craftingLock:true,clientSpoofBlocked:true,studioVerified:false
 }));
}finally{fs.rmSync(dir,{recursive:true,force:true})}
