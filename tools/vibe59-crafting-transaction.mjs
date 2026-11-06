import {inspectVibe59LuauInsertionScope} from './vibe59-luau-scope.mjs';
// Owner-authorized Luau crafting from existing server catalog and inventory.
// The generated code has no yields: all checks precede the state commit.
const IDENT=/^[A-Za-z_][A-Za-z0-9_]*$/;
const FORBIDDEN=new Set(['__proto__','prototype','constructor','state','player','game','script',
 'workspace','recipeId','batch','requestId','function','local','return','end','nil','true','false']);
function identifier(value,label){
 if(typeof value!=='string'||!IDENT.test(value)||FORBIDDEN.has(value))
   throw Error('VIBE59_CRAFT_INVALID_BINDING:'+label);
 return value;
}
function finite(value,label,min,max){
 if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)
   throw Error('VIBE59_CRAFT_INVALID_NUMBER:'+label);
 return value;
}
function config(spec){
 if(!spec||typeof spec!=='object'||spec.operation!=='crafting-verified-transaction')
   throw Error('VIBE59_CRAFT_UNKNOWN_OPERATION');
 const functionName=identifier(spec.functionName,'functionName');
 const recipes=identifier(spec.recipes,'recipes');
 const maxBatch=finite(spec.maxBatch,'maxBatch',1,100);
 if(!Number.isInteger(maxBatch))throw Error('VIBE59_CRAFT_INTEGER_BATCH');
 const cooldown=finite(spec.cooldown,'cooldown',0.05,60);
 return {functionName,recipes,maxBatch,cooldown};
}
function scope(source,sourcePath,anchor,c){
 if(typeof sourcePath!=='string'||!/\.(?:lua|luau)$/i.test(sourcePath)
   ||!(/(?:^|\/)(?:server|ServerScriptService|ServerStorage)\//i.test(sourcePath)
      ||/\.server\.(?:lua|luau)$/i.test(sourcePath)))
   throw Error('VIBE59_CRAFT_SERVER_ONLY');
 if(anchor!=='-- VIBE59_QUALITY_SLOT'||typeof source!=='string'
   ||source.split(anchor).length!==2)throw Error('VIBE59_CRAFT_EXACT_SLOT');
 const grounding=inspectVibe59LuauInsertionScope({source,anchor,
   functionName:c.functionName,signature:'player, recipeId, batch, requestId'});
 for(const field of ['state.inventory','state.crafting.lastAt','state.crafting.lastRequestId',
  'state.crafting.busy','state.save.saving','state.save.dirty']){
   if(!new RegExp('\\b'+field.replace(/\./g,'\\.')+'\\b').test(grounding.ownerBody))
    throw Error('VIBE59_CRAFT_EXISTING_FIELD:'+field);
 }
 if(!/(?:^|\n)\s*local\s+state\s*=/.test(grounding.ownerBody))
  throw Error('VIBE59_CRAFT_EXISTING_STATE');
 if(!new RegExp('(?:^|\\n)\\s*(?:local\\s+)?'+c.recipes+'\\s*=').test(grounding.masked))
   throw Error('VIBE59_CRAFT_EXISTING_RECIPE_CATALOG');
}
function code(c){
 return [
 '-- Server-only inventory transaction; recipe data is read from the existing server catalog.',
 'if typeof(player) ~= "Instance" or not player:IsA("Player") then return false end',
 'if type(state) ~= "table" or type(state.inventory) ~= "table" or type(state.crafting) ~= "table" or type(state.save) ~= "table" then return false end',
 'if type(state.crafting.lastAt) ~= "number" or type(state.crafting.lastRequestId) ~= "string" or type(state.crafting.busy) ~= "boolean" then return false end',
 'if type(state.save.saving) ~= "boolean" or type(state.save.dirty) ~= "boolean" then return false end',
 'if state.save.saving or state.crafting.busy then return false end',
 'if type(recipeId) ~= "string" or #recipeId < 1 or #recipeId > 64 or not string.match(recipeId, "^[%w_%-]+$") then return false end',
 'if type(requestId) ~= "string" or #requestId < 1 or #requestId > 96 or not string.match(requestId, "^[%w_%-]+$") then return false end',
 'if requestId == state.crafting.lastRequestId then return false end',
 'if type(batch) ~= "number" or batch ~= batch or batch % 1 ~= 0 or batch < 1 or batch > '+c.maxBatch+' then return false end',
 'if state.crafting.lastAt ~= state.crafting.lastAt or math.abs(state.crafting.lastAt) == math.huge then return false end',
 'local now = workspace:GetServerTimeNow()',
 'if now - state.crafting.lastAt < '+c.cooldown+' then return false end',
 'if type('+c.recipes+') ~= "table" or getmetatable('+c.recipes+') ~= nil then return false end',
 'local recipe = '+c.recipes+'[recipeId]',
 'if type(recipe) ~= "table" or getmetatable(recipe) ~= nil or type(recipe.inputs) ~= "table" or type(recipe.outputs) ~= "table" or type(recipe.caps) ~= "table" then return false end',
 'if getmetatable(recipe.inputs) ~= nil or getmetatable(recipe.outputs) ~= nil or getmetatable(recipe.caps) ~= nil or getmetatable(state.inventory) ~= nil then return false end',
 'state.crafting.busy = true',
 'local ok, accepted = pcall(function()',
 '  local nextValues = {}',
 '  local inputs, outputs = 0, 0',
 '  for item, amount in pairs(recipe.inputs) do',
 '    inputs = inputs + 1',
 '    if inputs > 16 or type(item) ~= "string" or #item < 1 or #item > 64 or not string.match(item, "^[%w_]+$") then return false end',
 '    if type(amount) ~= "number" or amount ~= amount or amount % 1 ~= 0 or amount < 1 or amount > 1000000 then return false end',
 '    if recipe.outputs[item] ~= nil then return false end',
 '    local owned = state.inventory[item]',
 '    local cost = amount * batch',
 '    if cost > 100000000 or type(owned) ~= "number" or owned ~= owned or owned % 1 ~= 0 or owned < cost or owned > 1000000000 then return false end',
 '    nextValues[item] = owned - cost',
 '  end',
 '  if inputs == 0 then return false end',
 '  for item, amount in pairs(recipe.outputs) do',
 '    outputs = outputs + 1',
 '    if outputs > 16 or type(item) ~= "string" or #item < 1 or #item > 64 or not string.match(item, "^[%w_]+$") then return false end',
 '    if type(amount) ~= "number" or amount ~= amount or amount % 1 ~= 0 or amount < 1 or amount > 1000000 then return false end',
 '    local cap, owned = recipe.caps[item], state.inventory[item]',
 '    local total = amount * batch',
 '    if type(cap) ~= "number" or cap ~= cap or cap % 1 ~= 0 or cap < 1 or cap > 1000000000 then return false end',
 '    if type(owned) ~= "number" or owned ~= owned or owned % 1 ~= 0 or owned < 0 or owned > cap or total > cap - owned then return false end',
 '    nextValues[item] = owned + total',
 '  end',
 '  if outputs == 0 then return false end',
 '  for item, nextValue in pairs(nextValues) do state.inventory[item] = nextValue end',
 '  state.crafting.lastAt = now',
 '  state.crafting.lastRequestId = requestId',
 '  state.save.dirty = true',
 '  return true',
 'end)',
 'state.crafting.busy = false',
 'return ok and accepted == true'
 ].join('\n');
}
export function synthesizeVibe59CraftingTransaction({spec={},source='',sourcePath='',replaceAnchor=''}={}){
 const c=config(spec);scope(source,sourcePath,replaceAnchor,c);
 return Object.freeze({source:code(c),operation:'crafting-verified-transaction',
  safety:{serverOnly:true,existingRecipeCatalog:true,existingSaveDirty:true,
   preventsDuplicateRequest:true,prevalidatesAllItems:true,nonYieldingTransaction:true,
   noNewSaveKeys:true,studioVerified:false},modelUsed:false,sourceWrite:false,runtimeVerified:false});
}
function clone(x){
 if(!x||typeof x!=='object'||Array.isArray(x))throw Error('VIBE59_CRAFT_SCENARIO_SHAPE');
 const s=JSON.stringify(x);if(!s||s.length>14000)throw Error('VIBE59_CRAFT_SCENARIO_SIZE');
 return JSON.parse(s);
}
function validInteger(x,min,max){return typeof x==='number'&&Number.isInteger(x)&&x>=min&&x<=max}
function simulate(c,row){
 const state=clone(row.initialState),recipe=row.recipe,request=row.request;
 const crafting=state.crafting,save=state.save,inventory=state.inventory;
 if(!crafting||!save||!inventory||!recipe||!request)throw Error('VIBE59_CRAFT_SCENARIO_MISSING');
 const original=JSON.stringify(state);
 const reject=()=>({applied:false,state});
 if(crafting.busy!==false||save.saving!==false||!validInteger(request.batch,1,c.maxBatch)
  ||typeof request.recipeId!=='string'||!/^[\w-]{1,64}$/.test(request.recipeId)
  ||typeof request.requestId!=='string'||!/^[\w-]{1,96}$/.test(request.requestId)
  ||request.requestId===crafting.lastRequestId
  ||typeof crafting.lastAt!=='number'||!Number.isFinite(crafting.lastAt)
  ||!Number.isFinite(request.now)||request.now-crafting.lastAt<c.cooldown)return reject();
 const input=recipe.inputs,output=recipe.outputs,caps=recipe.caps;
 if(!input||!output||!caps||Array.isArray(input)||Array.isArray(output)
  ||Object.keys(input).length<1||Object.keys(input).length>16
  ||Object.keys(output).length<1||Object.keys(output).length>16)return reject();
 const next={};
 for(const [name,amount] of Object.entries(input)){
  const have=inventory[name],cost=amount*request.batch;
  if(!/^[A-Za-z0-9_]{1,64}$/.test(name)||!validInteger(amount,1,1000000)
   ||output[name]!==undefined||!validInteger(have,cost,1000000000)||cost>100000000)return reject();
  next[name]=have-cost;
 }
 for(const [name,amount] of Object.entries(output)){
  const have=inventory[name],cap=caps[name],total=amount*request.batch;
  if(!/^[A-Za-z0-9_]{1,64}$/.test(name)||!validInteger(amount,1,1000000)
   ||!validInteger(cap,1,1000000000)||!validInteger(have,0,cap)
   ||total>cap-have)return reject();
  next[name]=have+total;
 }
 Object.assign(inventory,next);
 crafting.lastRequestId=request.requestId;
 crafting.lastAt=request.now;
 save.dirty=true;
 if(original===JSON.stringify(state))throw Error('VIBE59_CRAFT_SCENARIO_NO_CHANGE');
 return {applied:true,state};
}
function normalize(x){
 if(Array.isArray(x))return x.map(normalize);
 if(x&&typeof x==='object')return Object.fromEntries(Object.keys(x).sort().map(k=>[k,normalize(x[k])]));
 return x;
}
export function verifyVibe59CraftingScenarios({spec={},scenarios=[]}={}){
 const c=config(spec);
 if(!Array.isArray(scenarios)||scenarios.length<2||scenarios.length>20)
  throw Error('VIBE59_CRAFT_SCENARIOS_REQUIRED');
 let positive=0,negative=0;
 const cases=scenarios.map((row,i)=>{
  if(typeof row?.expectedApplied!=='boolean')throw Error('VIBE59_CRAFT_EXPECTED:'+i);
  const outcome=simulate(c,row);
  const expected=clone(row.expectedState);
  if(row.expectedApplied)positive++;else negative++;
  return {name:String(row.name??i).slice(0,60),
    applied:outcome.applied,pass:outcome.applied===row.expectedApplied&&
    JSON.stringify(normalize(outcome.state))===JSON.stringify(normalize(expected))};
 });
 if(!positive||!negative)throw Error('VIBE59_CRAFT_BOTH_OUTCOMES_REQUIRED');
 return Object.freeze({pass:cases.every(x=>x.pass),cases,sourceWrite:false,
  runtimeVerified:false,authority:'bounded-offline-crafting-oracle'});
}
