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
function sourceCode(text){
 // Reject possible escape hatches not safely parsed by this deliberately small lexer.
 if(/\x00/.test(text))throw Error('VIBE59_QUALITY_INVALID_SOURCE');
 let result='',i=0;const blank=x=>x==='\n'||x==='\r'?x:' ';
 while(i<text.length){
  const c=text[i],next=text[i+1];
  if(c==='"'||c==="'"){
   const quote=c;result+=' ';i++;
   while(i<text.length){const x=text[i++];result+=blank(x);
    if(x==='\\'&&i<text.length){result+=blank(text[i++]);continue}
    if(x===quote)break}
  }else if(c==='-'&&next==='-'){
   const match=/^\[(=*)\[/.exec(text.slice(i+2,i+18));
   if(match){const close=']'+match[1]+']',end=text.indexOf(close,i+2+match[0].length);
    const until=end<0?text.length:end+close.length;
    while(i<until)result+=blank(text[i++]);
   }else while(i<text.length&&text[i]!=='\n')result+=blank(text[i++]);
  }else if(c==='['){
   const match=/^\[(=*)\[/.exec(text.slice(i,i+18));
   if(match){const close=']'+match[1]+']',end=text.indexOf(close,i+match[0].length);
    const until=end<0?text.length:end+close.length;
    while(i<until)result+=blank(text[i++]);
   }else{result+=c;i++}
  }else{result+=c;i++}
 }
 return result;
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
 const before=source.slice(0,source.indexOf(replaceAnchor));
 const masked=sourceCode(before);
 const fn=new RegExp('(?:^|\\n)\\s*(?:local\\s+)?function\\s+'+
   spec.functionName+'\\s*\\(\\s*'+SIGNATURES[spec.operation].replace(/, /g,'\\s*,\\s*')+'\\s*\\)');
 const matches=[...masked.matchAll(new RegExp(fn.source,'g'))];
 if(matches.length!==1)throw Error('VIBE59_QUALITY_EXACT_FUNCTION_REQUIRED');
 const body=masked.slice(matches[0].index);
 if(!/(?:^|\n)\s*local\s+state\s*=/.test(body))
  throw Error('VIBE59_QUALITY_EXISTING_STATE_REQUIRED');
 const required=REQUIRED[spec.operation].concat(
  spec.operation==='building-authorized-placement'?['state.inventory.'+spec.material,
    'state.building.lastPlaceAt','state.building.lastPlacementKey']:
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
 // Reject accidental insertion into a different function. This conservative
 // check requires the slot before the next top-level function definition.
 const between=body.slice(matches[0][0].length);
 if(/(?:^|\n)(?:local\s+)?function\s+[A-Za-z_]\w*\s*\(/.test(between))
  throw Error('VIBE59_QUALITY_AMBIGUOUS_FUNCTION');
 // Fail closed if a standalone end could have closed the owner function.
 // Put this explicit insert slot before nested Luau blocks, after existing bindings.
 if(/(?:^|\n)[ \t]*end[ \t]*(?:;)?[ \t]*(?=\n|$)/.test(between))
  throw Error('VIBE59_QUALITY_FUNCTION_SCOPE_UNPROVEN');
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
  requireBinding(['store','mergeProfile','snapshotProfile']);
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
  'local now = os.clock()',
  'if now - state.combat.lastAttackAt < '+nLiteral(s.cooldown)+' then return false end',
  'state.combat.lastAttackAt = now',
  'targetHumanoid:TakeDamage('+nLiteral(s.damage)+')','return true'].join('\n');
 case 'building-authorized-placement':return [
  ...stateGuard,'if typeof(player) ~= "Instance" or not player:IsA("Player") then return false end',
  'if type(state.inventory) ~= "table" or type(state.inventory.'+s.material+') ~= "number" then return false end',
  finiteGuard('state.inventory.'+s.material,{nonnegative:true}),
  'if type(state.building) ~= "table" or type(state.building.lastPlaceAt) ~= "number" or type(state.building.lastPlacementKey) ~= "string" then return false end',
  finiteGuard('state.building.lastPlaceAt'),
  'if type(blueprintId) ~= "string" or typeof(placementCFrame) ~= "CFrame" or type('+s.requiredBindings[0]+') ~= "table" then return false end',
  'local position = placementCFrame.Position',
  'if position.X ~= position.X or position.Y ~= position.Y or position.Z ~= position.Z or math.abs(position.X) > 1000000 or math.abs(position.Y) > 1000000 or math.abs(position.Z) > 1000000 then return false end',
  'if not '+s.requiredBindings[1]+'(player, blueprintId, placementCFrame) then return false end',
  'local template = '+s.requiredBindings[0]+'[blueprintId]',
  'if typeof(template) ~= "Instance" or not template:IsA("Model") or not template.PrimaryPart then return false end',
  'if typeof('+s.requiredBindings[2]+') ~= "Instance" then return false end',
  'if state.inventory.'+s.material+' < '+nLiteral(s.cost)+' then return false end',
  'local character = player.Character',
  'local root = character and character:FindFirstChild("HumanoidRootPart")',
  'if not root or not root:IsA("BasePart") or (root.Position - placementCFrame.Position).Magnitude > '+nLiteral(s.range)+' then return false end',
  'local now = os.clock()',
  'if now - state.building.lastPlaceAt < '+nLiteral(s.placeCooldown)+' then return false end',
  'local p = placementCFrame.Position',
  'local placementKey = blueprintId .. ":" .. tostring(math.floor(p.X * 10 + 0.5)) .. ":" .. tostring(math.floor(p.Y * 10 + 0.5)) .. ":" .. tostring(math.floor(p.Z * 10 + 0.5))',
  'if placementKey == state.building.lastPlacementKey then return false end',
  'local built = template:Clone()',
  'if not built then return false end',
  'built:PivotTo(placementCFrame)',
  'local boundsCFrame, boundsSize = built:GetBoundingBox()',
  'local overlap = OverlapParams.new()',
  'overlap.FilterType = Enum.RaycastFilterType.Exclude',
  'overlap.FilterDescendantsInstances = {character}',
  'for _, part in ipairs(workspace:GetPartBoundsInBox(boundsCFrame, boundsSize, overlap)) do',
  '  if part.CanCollide then built:Destroy(); return false end',
  'end',
  'for _, part in ipairs(built:GetDescendants()) do',
  '  if part:IsA("BasePart") then part.Anchored = true end',
  'end',
  'local success = pcall(function() built.Parent = '+s.requiredBindings[2]+' end)',
  'if not success then built:Destroy(); return false end',
  'state.inventory.'+s.material+' = state.inventory.'+s.material+' - '+nLiteral(s.cost),
  'state.building.lastPlaceAt = now',
  'state.building.lastPlacementKey = placementKey',
  'return true'].join('\n');
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
  ...stateGuard,'if typeof(player) ~= "Instance" or not player:IsA("Player") then return false end',
  'if type(state.save) ~= "table" or type(state.save.revision) ~= "number" or type(state.save.dirty) ~= "boolean" or type(state.save.saving) ~= "boolean" then return false end',
  finiteGuard('state.save.revision',{nonnegative:true}),
  'if state.save.saving then return false end',
  'if not state.save.dirty then return true end',
  'if type(player.UserId) ~= "number" or player.UserId <= 0 then return false end',
  'local revisionAtStart = state.save.revision',
  'local snapshot = '+s.requiredBindings[2]+'(state)',
  'if type(snapshot) ~= "table" or snapshot == state or type(snapshot.save) ~= "table" or snapshot.save == state.save or snapshot.save.revision ~= revisionAtStart then return false end',
  'local inspectedTables = 0',
  'local function detachedTables(original, copy, depth)',
  '  if depth > 8 then return false end',
  '  for key, value in pairs(original) do',
  '    if type(value) == "table" then',
  '      inspectedTables = inspectedTables + 1',
  '      if inspectedTables > 512 or type(copy[key]) ~= "table" or copy[key] == value then return false end',
  '      if not detachedTables(value, copy[key], depth + 1) then return false end',
  '    end',
  '  end',
  '  return true',
  'end',
  'if not detachedTables(state, snapshot, 0) then return false end',
  'state.save.saving = true',
  'local key = "player_" .. tostring(player.UserId)',
  'for attempt = 1, '+nLiteral(s.maxAttempts)+' do',
  '  local ok, result = pcall(function()',
  '    return '+s.requiredBindings[0]+':UpdateAsync(key, function(previous)',
  '      if previous ~= nil and (type(previous) ~= "table" or type(previous.save) ~= "table" or type(previous.save.revision) ~= "number") then return nil end',
  '      if previous ~= nil and previous.save.revision > revisionAtStart then return nil end',
  '      return '+s.requiredBindings[1]+'(previous, snapshot)',
  '    end)',
  '  end)',
  '  if ok and type(result) == "table" and type(result.save) == "table" and result.save.revision == revisionAtStart then',
  '    state.save.saving = false',
  '    if state.save.revision == revisionAtStart then state.save.dirty = false end',
  '    return true',
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
  'local now = os.clock()',
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
