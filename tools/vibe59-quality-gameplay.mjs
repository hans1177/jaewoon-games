import {inspectVibe59LuauInsertionScope} from './vibe59-luau-scope.mjs';
// Vibe5.9 high-quality Roblox Luau gameplay synthesis.
// Six distinct server-controlled mechanics; owner parameters, existing bindings and
// source anchors required. This is source synthesis, not Studio runtime certification.
export const VIBE59_QUALITY_GAMEPLAY_ACTIONS=Object.freeze([
  {id:'combat-authoritative-melee',system:'combat',api:'Humanoid:TakeDamage',check:'server actor, cooldown, range, authorization'},
  {id:'building-authorized-placement',system:'building',api:'Model:PivotTo',check:'catalog, ownership, distance, collision, resources'},
  {id:'crafting-atomic-recipe',system:'crafting',api:'inventory state',check:'all input and output constraints before commit'},
  {id:'bestiary-confirmed-death',system:'bestiary',api:'Humanoid.Health/GetAttribute',check:'server-confirmed death, killer, species and deduplication'},
  {id:'saving-revisioned-update',system:'saving',api:'DataStore:UpdateAsync',check:'UserId key, revision, bounded retries, merge callback'},
  {id:'ai-throttled-chase',system:'ai',api:'Humanoid:MoveTo',check:'server target validation, range and move rate'}
].map(x=>Object.freeze(x)));
const IDENT=/^[A-Za-z_][A-Za-z0-9_]*$/;
const BLOCK=new Set(['__proto__','constructor','prototype','game','workspace','script','state',
 'player','target','monster','npc','blueprintId','placementCFrame','function','local','end',
 'if','then','return','true','false','nil','and','or','not']);
function id(x,label){
 if(typeof x!=='string'||!IDENT.test(x)||BLOCK.has(x))throw Error('VIBE59_QUALITY_BAD_BINDING:'+label);
 return x;
}
function positive(x,label,{min=0.0001,max=1e6}={}){
 if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)
  throw Error('VIBE59_QUALITY_BAD_NUMBER:'+label);
 return x;
}
function nLiteral(x){return String(x)}
function finiteGuard(expr,{nonnegative=false}={}){
 return 'if '+expr+' ~= '+expr+' or '+expr+' == math.huge or '+expr+' == -math.huge'+
   (nonnegative?' or '+expr+' < 0':'')+' then return false end';
}
const SIGNATURES={
 'combat-authoritative-melee':'player, target',
 'building-authorized-placement':'player, blueprintId, placementCFrame',
 'crafting-atomic-recipe':'player',
 'bestiary-confirmed-death':'player, monster',
 'saving-revisioned-update':'player',
 'ai-throttled-chase':'npc, target'};
const REQUIRED={
 'combat-authoritative-melee':['state','state.combat.lastAttackAt'],
 'building-authorized-placement':['state','state.inventory'],
 'crafting-atomic-recipe':['state','state.inventory'],
 'bestiary-confirmed-death':['state','state.bestiary.kills','state.bestiary.discovered'],
 'saving-revisioned-update':['state','state.save.revision','state.save.dirty'],
 'ai-throttled-chase':['state','state.ai.lastMoveAt']};
function grounded(spec,{source,sourcePath,replaceAnchor}){
 if(typeof sourcePath!=='string'||!/\.(?:lua|luau)$/i.test(sourcePath)||
   !(/(?:^|\/)(?:server|ServerScriptService|ServerStorage)\//i.test(sourcePath)
     ||/\.server\.(?:lua|luau)$/i.test(sourcePath)))
  throw Error('VIBE59_QUALITY_SERVER_ONLY');
 if(typeof source!=='string'||source.length>260000||typeof replaceAnchor!=='string'
   ||replaceAnchor!=='-- VIBE59_QUALITY_SLOT'
   ||source.split(replaceAnchor).length!==2
   ||!/(?:^|\n)[ \t]*-- VIBE59_QUALITY_SLOT[ \t]*(?:\r?\n|$)/.test(source))
  throw Error('VIBE59_QUALITY_EXACT_SLOT_REQUIRED');
 const {ownerBody:body,masked}=inspectVibe59LuauInsertionScope({
   source,anchor:replaceAnchor,functionName:spec.functionName,signature:SIGNATURES[spec.operation]});
 if(!/(?:^|\n)\s*local\s+state\s*=/.test(body))
  throw Error('VIBE59_QUALITY_EXISTING_STATE_REQUIRED');
 const required=REQUIRED[spec.operation].concat(
  spec.operation==='building-authorized-placement'?['state.inventory.'+spec.material,
    'state.building.lastPlaceAt','state.building.lastPlacementKey','state.building.placing']:
  spec.operation==='crafting-atomic-recipe'?spec.inputs.map(x=>'state.inventory.'+x.field)
    .concat('state.inventory.'+spec.output):
  spec.operation==='bestiary-confirmed-death'?
    ['state.bestiary.kills.'+spec.species,'state.bestiary.discovered.'+spec.species]:
  spec.operation==='saving-revisioned-update'?['state.save.saving']:[]);
 for(const name of required){
  if(name==='state')continue;
  const pat=new RegExp('\\b'+name.replace(/\./g,'\\.')+'\\b');
  if(!pat.test(body))throw Error('VIBE59_QUALITY_EXISTING_FIELD:'+name);
 }
 for(const binding of spec.requiredBindings||[]){
  const re=new RegExp('(?:^|\\n)\\s*(?:local\\s+)?(?:function\\s+'+binding+'\\s*\\(|'+binding+'\\s*=)');
  if(!re.test(masked))throw Error('VIBE59_QUALITY_EXISTING_DEPENDENCY:'+binding);
 }

}
function validate(spec){
 if(!spec||typeof spec!=='object'||Array.isArray(spec))throw Error('VIBE59_QUALITY_SPEC');
 const op=VIBE59_QUALITY_GAMEPLAY_ACTIONS.find(x=>x.id===spec.operation);
 if(!op)throw Error('VIBE59_QUALITY_UNKNOWN_OPERATION');
 const functionName=id(spec.functionName,'function');
 const values={...spec,functionName,operation:op.id};
 const requireBinding=names=>{
  values.requiredBindings=names.map(name=>{
   if(typeof spec.bindings?.[name]!=='string')throw Error('VIBE59_QUALITY_BINDING_REQUIRED:'+name);
   return id(spec.bindings[name],name);
  });
  if(new Set(values.requiredBindings).size!==names.length)
   throw Error('VIBE59_QUALITY_BINDING_ALIAS');
 };
 switch(op.id){
 case 'combat-authoritative-melee':
  requireBinding(['authorizeAttack']);
  values.damage=positive(spec.damage,'damage');
  values.range=positive(spec.range,'range');
  values.cooldown=positive(spec.cooldown,'cooldown');
  break;
 case 'building-authorized-placement':
  requireBinding(['blueprints','authorizePlace','buildingsFolder']);
  values.cost=positive(spec.cost,'cost',{min:1,max:100000});
  values.placeCooldown=positive(spec.placeCooldown,'placeCooldown',{min:0.05,max:120});
  values.range=positive(spec.range,'range');
  values.material=id(spec.material,'material');
  break;
 case 'crafting-atomic-recipe':
  values.inputs=spec.inputs;
  if(!Array.isArray(values.inputs)||values.inputs.length<1||values.inputs.length>6)
   throw Error('VIBE59_QUALITY_RECIPE_INPUTS');
  values.inputs=values.inputs.map(x=>({field:id(x?.field,'inputField'),
   amount:positive(x?.amount,'inputAmount',{min:1,max:1e6})}));
  values.output=id(spec.output,'output');
  values.outputAmount=positive(spec.outputAmount,'outputAmount',{min:1,max:1e6});
  values.outputLimit=positive(spec.outputLimit,'outputLimit',{min:1,max:1e6});
  if(new Set(values.inputs.map(x=>x.field)).size!==values.inputs.length
    ||values.inputs.some(x=>x.field===values.output))
   throw Error('VIBE59_QUALITY_RECIPE_FIELD_ALIAS');
  break;
 case 'bestiary-confirmed-death':
  requireBinding(['monstersFolder']);
  values.species=id(spec.species,'species');
  values.countLimit=positive(spec.countLimit,'countLimit',{min:1,max:1e9});
  break;
 case 'saving-revisioned-update':
  requireBinding(['store','mergeProfile']);
  values.maxAttempts=positive(spec.maxAttempts,'maxAttempts',{min:1,max:3});
  if(!Number.isInteger(values.maxAttempts))throw Error('VIBE59_QUALITY_INTEGER_RETRIES');
  break;
 case 'ai-throttled-chase':
  values.range=positive(spec.range,'range');
  values.interval=positive(spec.interval,'interval');
  break;
 default:throw Error('VIBE59_QUALITY_UNKNOWN_OPERATION');
 }
 return values;
}
function qualitySource(s){
 const stateGuard=[
   'if type(state) ~= "table" then return false end'];
 switch(s.operation){
 case 'combat-authoritative-melee':return [
  ...stateGuard,'if typeof(player) ~= "Instance" or not player:IsA("Player") then return false end',
  'if type(state.combat) ~= "table" or type(state.combat.lastAttackAt) ~= "number" then return false end',
  finiteGuard('state.combat.lastAttackAt'),
  'if typeof(target) ~= "Instance" or not target:IsA("Model") or not target:IsDescendantOf(workspace) then return false end',
  'if not '+s.requiredBindings[0]+'(player, target) then return false end',
  'local character = player.Character',
  'local attackerRoot = character and character:FindFirstChild("HumanoidRootPart")',
  'local attackerHumanoid = character and character:FindFirstChildOfClass("Humanoid")',
  'local targetRoot = target:FindFirstChild("HumanoidRootPart")',
  'local targetHumanoid = target:FindFirstChildOfClass("Humanoid")',
  'if not attackerHumanoid or attackerHumanoid.Health <= 0 or not attackerRoot or not attackerRoot:IsA("BasePart") or not targetRoot or not targetRoot:IsA("BasePart") or not targetHumanoid or targetHumanoid.Health <= 0 then return false end',
  'if character == target or attackerHumanoid == targetHumanoid then return false end',
  'local delta = targetRoot.Position - attackerRoot.Position',
  'if delta.Magnitude > '+nLiteral(s.range)+' then return false end',
  'local rayParams = RaycastParams.new()',
  'rayParams.FilterType = Enum.RaycastFilterType.Exclude',
  'rayParams.FilterDescendantsInstances = {character}',
  'local rayHit = workspace:Raycast(attackerRoot.Position, delta, rayParams)',
  'if rayHit and not rayHit.Instance:IsDescendantOf(target) then return false end',
  'local now = workspace:GetServerTimeNow()',
  'if now - state.combat.lastAttackAt < '+nLiteral(s.cooldown)+' then return false end',
  'state.combat.lastAttackAt = now',
  'targetHumanoid:TakeDamage('+nLiteral(s.damage)+')','return true'].join('\n');
 case 'building-authorized-placement':return [
  ...stateGuard,
  'if typeof(player) ~= "Instance" or not player:IsA("Player") then return false end',
  'if type(state.inventory) ~= "table" or type(state.inventory.'+s.material+') ~= "number" then return false end',
  finiteGuard('state.inventory.'+s.material,{nonnegative:true}),
  'if type(state.building) ~= "table" or type(state.building.lastPlaceAt) ~= "number" or type(state.building.lastPlacementKey) ~= "string" or type(state.building.placing) ~= "boolean" then return false end',
  finiteGuard('state.building.lastPlaceAt'),
  'if state.building.placing then return false end',
  'state.building.placing = true',
  'local ok, placed = pcall(function()',
  '  if type(blueprintId) ~= "string" or #blueprintId > 100 or typeof(placementCFrame) ~= "CFrame" or type('+s.requiredBindings[0]+') ~= "table" then return false end',
  '  local position = placementCFrame.Position',
  '  if position.X ~= position.X or position.Y ~= position.Y or position.Z ~= position.Z or math.abs(position.X) > 1000000 or math.abs(position.Y) > 1000000 or math.abs(position.Z) > 1000000 then return false end',
  '  if not '+s.requiredBindings[1]+'(player, blueprintId, placementCFrame) then return false end',
  '  local template = '+s.requiredBindings[0]+'[blueprintId]',
  '  if typeof(template) ~= "Instance" or not template:IsA("Model") or not template.PrimaryPart then return false end',
  '  if typeof('+s.requiredBindings[2]+') ~= "Instance" then return false end',
  '  if state.inventory.'+s.material+' < '+nLiteral(s.cost)+' then return false end',
  '  local character = player.Character',
  '  local root = character and character:FindFirstChild("HumanoidRootPart")',
  '  if not root or not root:IsA("BasePart") or (root.Position - position).Magnitude > '+nLiteral(s.range)+' then return false end',
  '  local now = workspace:GetServerTimeNow()',
  '  if now - state.building.lastPlaceAt < '+nLiteral(s.placeCooldown)+' then return false end',
  '  local placementKey = blueprintId .. ":" .. tostring(math.floor(position.X * 10 + 0.5)) .. ":" .. tostring(math.floor(position.Y * 10 + 0.5)) .. ":" .. tostring(math.floor(position.Z * 10 + 0.5))',
  '  if placementKey == state.building.lastPlacementKey then return false end',
  '  local existingCount = 0',
  '  for _, existing in ipairs('+s.requiredBindings[2]+':GetChildren()) do',
  '    existingCount = existingCount + 1',
  '    if existingCount > 512 then return false end',
  '    if existing:GetAttribute("PlacementKey") == placementKey then return false end',
  '  end',
  '  local built = template:Clone()',
  '  if not built then return false end',
  '  built:PivotTo(placementCFrame)',
  '  local boundsCFrame, boundsSize = built:GetBoundingBox()',
  '  local overlap = OverlapParams.new()',
  '  overlap.FilterType = Enum.RaycastFilterType.Exclude',
  '  overlap.FilterDescendantsInstances = {character}',
  '  for _, part in ipairs(workspace:GetPartBoundsInBox(boundsCFrame, boundsSize, overlap)) do',
  '    if part.CanCollide then built:Destroy(); return false end',
  '  end',
  '  for _, part in ipairs(built:GetDescendants()) do',
  '    if part:IsA("BasePart") then part.Anchored = true end',
  '  end',
  '  built:SetAttribute("PlacementKey", placementKey)',
  '  local parented = pcall(function() built.Parent = '+s.requiredBindings[2]+' end)',
  '  if not parented then built:Destroy(); return false end',
  '  state.inventory.'+s.material+' = state.inventory.'+s.material+' - '+nLiteral(s.cost),
  '  state.building.lastPlaceAt = now',
  '  state.building.lastPlacementKey = placementKey',
  '  return true',
  'end)',
  'state.building.placing = false',
  'return ok and placed == true'].join('\n');
 case 'crafting-atomic-recipe':return [
  ...stateGuard,'if type(state.inventory) ~= "table" then return false end',
  ...s.inputs.map(x=>'if type(state.inventory.'+x.field+') ~= "number" then return false end'),
  ...s.inputs.map(x=>finiteGuard('state.inventory.'+x.field,{nonnegative:true})),
  ...s.inputs.map(x=>'if state.inventory.'+x.field+' < '+nLiteral(x.amount)+' then return false end'),
  'if type(state.inventory.'+s.output+') ~= "number" then return false end',
  finiteGuard('state.inventory.'+s.output,{nonnegative:true}),
  'if state.inventory.'+s.output+' + '+nLiteral(s.outputAmount)+' > '+nLiteral(s.outputLimit)+' then return false end',
  ...s.inputs.map(x=>'state.inventory.'+x.field+' = state.inventory.'+x.field+' - '+nLiteral(x.amount)),
  'state.inventory.'+s.output+' = state.inventory.'+s.output+' + '+nLiteral(s.outputAmount),
  'return true'].join('\n');
 case 'bestiary-confirmed-death':return [
  ...stateGuard,'if typeof(player) ~= "Instance" or not player:IsA("Player") then return false end',
  'if type(state.bestiary) ~= "table" or type(state.bestiary.kills) ~= "table" or type(state.bestiary.discovered) ~= "table" then return false end',
  'if typeof('+s.requiredBindings[0]+') ~= "Instance" or not '+s.requiredBindings[0]+':IsDescendantOf(workspace) then return false end',
  'if typeof(monster) ~= "Instance" or not monster:IsA("Model") or not monster:IsDescendantOf('+s.requiredBindings[0]+') then return false end',
  'local humanoid = monster:FindFirstChildOfClass("Humanoid")',
  'if not humanoid or humanoid.Health > 0 then return false end',
  'if monster:GetAttribute("SpeciesId") ~= '+JSON.stringify(s.species)+' then return false end',
  'if monster:GetAttribute("LastHitUserId") ~= player.UserId then return false end',
  'if monster:GetAttribute("DexCredited") == true then return false end',
  'if type(state.bestiary.kills.'+s.species+') ~= "number" or type(state.bestiary.discovered.'+s.species+') ~= "boolean" then return false end',
  finiteGuard('state.bestiary.kills.'+s.species,{nonnegative:true}),
  'if state.bestiary.kills.'+s.species+' >= '+nLiteral(s.countLimit)+' then return false end',
  'monster:SetAttribute("DexCredited", true)',
  'state.bestiary.discovered.'+s.species+' = true',
  'state.bestiary.kills.'+s.species+' = math.min('+nLiteral(s.countLimit)+', state.bestiary.kills.'+s.species+' + 1)',
  'return true'].join('\n');
 case 'saving-revisioned-update':return [
  ...stateGuard,
  'if typeof(player) ~= "Instance" or not player:IsA("Player") then return false end',
  'if type(state.save) ~= "table" or type(state.save.revision) ~= "number" or type(state.save.dirty) ~= "boolean" or type(state.save.saving) ~= "boolean" then return false end',
  finiteGuard('state.save.revision',{nonnegative:true}),
  'if state.save.saving then return false end',
  'if not state.save.dirty then return true end',
  'if type(player.UserId) ~= "number" or player.UserId <= 0 then return false end',
  'local revisionAtStart = state.save.revision',
  'if revisionAtStart % 1 ~= 0 or revisionAtStart >= 9007199254740991 then return false end',
  'local visited, copiedTables, copiedEntries, copiedBytes = {}, 0, 0, 0',
  'local function snapshotCopy(value, depth)',
  '  if depth > 8 then return nil end',
  '  local kind = type(value)',
  '  if kind == "table" then',
  '    if visited[value] then return nil end',
  '    copiedTables = copiedTables + 1',
  '    if copiedTables > 512 then return nil end',
  '    visited[value] = true',
  '    local output = {}',
  '    for key, child in pairs(value) do',
  '      copiedEntries = copiedEntries + 1',
  '      if copiedEntries > 4096 then return nil end',
  '      local keyKind = type(key)',
  '      if keyKind ~= "string" and keyKind ~= "number" then return nil end',
  '      if keyKind == "number" and (key ~= key or key == math.huge or key == -math.huge) then return nil end',
  '      if keyKind == "string" and #key > 256 then return nil end',
  '      copiedBytes = copiedBytes + (keyKind == "string" and #key or 16)',
  '      if copiedBytes > 180000 then return nil end',
  '      local cloned = snapshotCopy(child, depth + 1)',
  '      if cloned == nil then return nil end',
  '      output[key] = cloned',
  '    end',
  '    visited[value] = nil',
  '    return output',
  '  end',
  '  if kind == "number" then',
  '    if value ~= value or value == math.huge or value == -math.huge then return nil end',
  '    copiedBytes = copiedBytes + 16',
  '  elseif kind == "string" then',
  '    copiedBytes = copiedBytes + #value',
  '  elseif kind == "boolean" then',
  '    copiedBytes = copiedBytes + 1',
  '  else',
  '    return nil',
  '  end',
  '  if copiedBytes > 180000 then return nil end',
  '  return value',
  'end',
  'local snapshot = snapshotCopy(state, 0)',
  'if type(snapshot) ~= "table" or type(snapshot.save) ~= "table" or snapshot.save.revision ~= revisionAtStart then return false end',
  'state.save.saving = true',
  'local key = "player_" .. tostring(player.UserId)',
  'for attempt = 1, '+nLiteral(s.maxAttempts)+' do',
  '  local ok, result = pcall(function()',
  '    return '+s.requiredBindings[0]+':UpdateAsync(key, function(previous)',
  '      if previous == nil then',
  '        if revisionAtStart ~= 0 then return nil end',
  '      else',
  '        if type(previous) ~= "table" or type(previous.save) ~= "table" or previous.save.revision ~= revisionAtStart then return nil end',
  '      end',
  '      local merged = '+s.requiredBindings[1]+'(previous, snapshot)',
  '      if type(merged) ~= "table" or type(merged.save) ~= "table" or merged.save.revision ~= revisionAtStart + 1 then return nil end',
  '      return merged',
  '    end)',
  '  end)',
  '  if ok and type(result) == "table" and type(result.save) == "table" and result.save.revision == revisionAtStart + 1 then',
  '    state.save.saving = false',
  '    if state.save.revision == revisionAtStart then',
  '      state.save.revision = revisionAtStart + 1',
  '      state.save.dirty = false',
  '      return true',
  '    end',
  '    state.save.dirty = true',
  '    return false',
  '  end',
  '  if attempt < '+nLiteral(s.maxAttempts)+' then task.wait(math.min(2 ^ attempt, 4)) end',
  'end',
  'state.save.saving = false',
  'return false'].join('\n');
 case 'ai-throttled-chase':return [
  ...stateGuard,'if type(state.ai) ~= "table" or type(state.ai.lastMoveAt) ~= "number" then return false end',
  finiteGuard('state.ai.lastMoveAt'),
  'if typeof(npc) ~= "Instance" or not npc:IsA("Model") or not npc:IsDescendantOf(workspace) then return false end',
  'if typeof(target) ~= "Instance" or not target:IsA("Model") or not target:IsDescendantOf(workspace) or target == npc then return false end',
  'local humanoid = npc:FindFirstChildOfClass("Humanoid")',
  'local root = npc:FindFirstChild("HumanoidRootPart")',
  'local targetRoot = target:FindFirstChild("HumanoidRootPart")',
  'local targetHumanoid = target:FindFirstChildOfClass("Humanoid")',
  'if not humanoid or humanoid.Health <= 0 or not targetHumanoid or targetHumanoid.Health <= 0 or not root or not root:IsA("BasePart") or not targetRoot or not targetRoot:IsA("BasePart") then return false end',
  'if (targetRoot.Position - root.Position).Magnitude > '+nLiteral(s.range)+' then return false end',
  'local now = workspace:GetServerTimeNow()',
  'if now - state.ai.lastMoveAt < '+nLiteral(s.interval)+' then return false end',
  'state.ai.lastMoveAt = now',
  'humanoid:MoveTo(targetRoot.Position)',
  'return true'].join('\n');
 default:throw Error('VIBE59_QUALITY_UNKNOWN_OPERATION');
 }
}
export function synthesizeVibe59QualityGameplay({spec={},source='',sourcePath='',replaceAnchor=''}={}){
 const normalized=validate(spec);
 grounded(normalized,{source,sourcePath,replaceAnchor});
 return Object.freeze({source:qualitySource(normalized),operation:normalized.operation,
  safety:{existingFunction:true,sourceSlot:true,serverOnly:true,existingBindings:true,
    userProvidedBalance:true,saveSchemaUnchanged:true,studioRuntimeVerified:false},
  generatedMechanic:true,modelUsed:false,sourceWrite:false,runtimeVerified:false,
  authority:'source-grounded-advanced-gameplay-candidate'});
}


// An independent bounded state/decision oracle for approved gameplay acceptance tests.
// Facts are supplied by the owner; this does not execute Roblox Instances or DataStore.
function scenarioFacts(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('VIBE59_QUALITY_SCENARIO_FACTS');
 const json=JSON.stringify(input);
 if(!json||json.length>10000)throw Error('VIBE59_QUALITY_SCENARIO_SIZE');
 return JSON.parse(json);
}
function expectedNumber(value,name){
 if(typeof value!=='number'||!Number.isFinite(value))throw Error('VIBE59_QUALITY_SCENARIO_NUMBER:'+name);
 return value;
}
function qualityDecision(spec,facts){
 const op=spec.operation;
 if(op==='combat-authoritative-melee'){
  const last=expectedNumber(facts.lastAttackAt,'lastAttackAt'),
   now=expectedNumber(facts.now,'now'),distance=expectedNumber(facts.distance,'distance');
  const allowed=facts.authorized===true&&facts.playerValid===true&&facts.targetValid===true
   &&facts.targetAlive===true&&facts.attackerAlive!==false
   &&facts.lineOfSight!==false&&facts.selfTarget!==true
   &&distance<=spec.range&&now-last>=spec.cooldown;
  return {applied:allowed,effects:{damageDealt:allowed?spec.damage:0,
    lastAttackAt:allowed?now:last}};
 }
 if(op==='building-authorized-placement'){
  const material=expectedNumber(facts.materialCount,'materialCount');
  const allowed=facts.playerValid===true&&facts.authorized===true&&facts.blueprintValid===true
   &&facts.folderValid===true&&facts.withinRange===true&&facts.collisionFree===true
   &&material>=spec.cost
   &&expectedNumber(facts.now,'now')-expectedNumber(facts.lastPlaceAt,'lastPlaceAt')>=spec.placeCooldown
   &&facts.duplicatePlacement!==true;
  return {applied:allowed,effects:{materialCount:allowed?material-spec.cost:material,
    modelPlaced:allowed,lastPlaceAt:allowed?facts.now:facts.lastPlaceAt,
    placementRegistered:allowed}};
 }
 if(op==='crafting-atomic-recipe'){
  const inventory=scenarioFacts(facts.inventory);
  let allowed=true;
  for(const input of spec.inputs){
   if(expectedNumber(inventory[input.field],input.field)<input.amount)allowed=false;
  }
  const current=expectedNumber(inventory[spec.output],spec.output);
  if(current<0||current+spec.outputAmount>spec.outputLimit)allowed=false;
  if(allowed){
   for(const input of spec.inputs)inventory[input.field]-=input.amount;
   inventory[spec.output]+=spec.outputAmount;
  }
  return {applied:allowed,effects:{inventory}};
 }
 if(op==='bestiary-confirmed-death'){
  const count=expectedNumber(facts.killCount,'killCount');
  const allowed=facts.monsterValid===true&&facts.authorizedMonsterFolder!==false
   &&facts.dead===true&&facts.speciesMatches===true
   &&facts.killerMatches===true&&facts.alreadyCredited!==true&&count<spec.countLimit
   &&typeof facts.discovered==='boolean';
  return {applied:allowed,effects:{killCount:allowed?count+1:count,
    discovered:allowed?true:facts.discovered,credited:allowed?true:facts.alreadyCredited===true}};
 }
 if(op==='saving-revisioned-update'){
  if(typeof facts.dirty!=='boolean'||typeof facts.saving!=='boolean'
    ||!Array.isArray(facts.attemptResults)||facts.attemptResults.length>3
    ||facts.attemptResults.some(x=>typeof x!=='boolean'))
    throw Error('VIBE59_QUALITY_SAVE_SCENARIO');
  const started=expectedNumber(facts.revisionAtStart,'revisionAtStart');
  const current=expectedNumber(facts.revisionAfter,'revisionAfter');
  let applied=false,attempts=0;
  if(facts.playerValid===true&&!facts.saving){
   if(!facts.dirty)applied=true;
   else if(facts.snapshotValid===true)for(let i=0;i<spec.maxAttempts;i++){
    attempts++;
    if(facts.attemptResults[i]===true&&facts.staleWrite!==true){
      applied=true;break
    }
   }
  }
  return {applied,effects:{attempts,saving:false,
    dirty:facts.dirty===true&&!(applied&&started===current)}};
 }
 if(op==='ai-throttled-chase'){
  const now=expectedNumber(facts.now,'now'),
   last=expectedNumber(facts.lastMoveAt,'lastMoveAt'),
   distance=expectedNumber(facts.distance,'distance');
  const allowed=facts.npcValid===true&&facts.targetValid===true&&facts.npcAlive===true
   &&distance<=spec.range&&now-last>=spec.interval;
  return {applied:allowed,effects:{lastMoveAt:allowed?now:last,moveIssued:allowed}};
 }
 throw Error('VIBE59_QUALITY_UNKNOWN_OPERATION');
}
function normalizedScenarioValue(value){
 if(Array.isArray(value))return value.map(normalizedScenarioValue);
 if(value&&typeof value==='object')return Object.fromEntries(
   Object.keys(value).sort().map(key=>[key,normalizedScenarioValue(value[key])]));
 return value;
}
export function verifyVibe59QualityScenarios({spec={},scenarios=[]}={}){
 const normalized=validate(spec);
 if(!Array.isArray(scenarios)||scenarios.length<2||scenarios.length>16)
  throw Error('VIBE59_QUALITY_SCENARIOS_REQUIRED');
 let positive=0,negative=0;
 const results=scenarios.map((row,i)=>{
  if(typeof row?.expectedApplied!=='boolean'||!row.expectedEffects)
   throw Error('VIBE59_QUALITY_SCENARIO_EXPECTATION:'+i);
  const observed=qualityDecision(normalized,scenarioFacts(row.facts));
  const expected=scenarioFacts(row.expectedEffects);
  if(row.expectedApplied)positive++;else negative++;
  return {name:String(row.name??i).slice(0,60),
   pass:observed.applied===row.expectedApplied
      &&JSON.stringify(normalizedScenarioValue(observed.effects))
        ===JSON.stringify(normalizedScenarioValue(expected)),
   applied:observed.applied,effects:observed.effects};
 });
 if(!positive||!negative)throw Error('VIBE59_QUALITY_BOUNDARY_SCENARIOS');
 return Object.freeze({pass:results.every(x=>x.pass),cases:results,sourceWrite:false,
  modelUsed:false,runtimeVerified:false,authority:'offline-gameplay-decision-oracle'});
}
