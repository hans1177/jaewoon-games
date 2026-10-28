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
   ||source.split(replaceAnchor).length!==2)
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
 for(const name of REQUIRED[spec.operation]){
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
  ...stateGuard,'if type(state.combat) ~= "table" or type(state.combat.lastAttackAt) ~= "number" then return false end',
  'if not '+s.requiredBindings[0]+'(player, target) then return false end',
  'if typeof(target) ~= "Instance" or not target:IsA("Model") or not target:IsDescendantOf(workspace) then return false end',
  'local character = player.Character',
  'local attackerRoot = character and character:FindFirstChild("HumanoidRootPart")',
  'local targetRoot = target:FindFirstChild("HumanoidRootPart")',
  'local targetHumanoid = target:FindFirstChildOfClass("Humanoid")',
  'if not attackerRoot or not targetRoot or not targetHumanoid or targetHumanoid.Health <= 0 then return false end',
  'if (attackerRoot.Position - targetRoot.Position).Magnitude > '+nLiteral(s.range)+' then return false end',
  'local now = os.clock()',
  'if now - state.combat.lastAttackAt < '+nLiteral(s.cooldown)+' then return false end',
  'state.combat.lastAttackAt = now',
  'targetHumanoid:TakeDamage('+nLiteral(s.damage)+')','return true'].join('\n');
 case 'building-authorized-placement':return [
  ...stateGuard,'if type(state.inventory) ~= "table" or type(state.inventory.'+s.material+') ~= "number" then return false end',
  'if type(blueprintId) ~= "string" or typeof(placementCFrame) ~= "CFrame" then return false end',
  'if not '+s.requiredBindings[1]+'(player, blueprintId, placementCFrame) then return false end',
  'local template = '+s.requiredBindings[0]+'[blueprintId]',
  'if typeof(template) ~= "Instance" or not template:IsA("Model") or not template.PrimaryPart then return false end',
  'if state.inventory.'+s.material+' < '+nLiteral(s.cost)+' then return false end',
  'local character = player.Character',
  'local root = character and character:FindFirstChild("HumanoidRootPart")',
  'if not root or (root.Position - placementCFrame.Position).Magnitude > '+nLiteral(s.range)+' then return false end',
  'local overlap = OverlapParams.new()',
  'overlap.FilterType = Enum.RaycastFilterType.Exclude',
  'overlap.FilterDescendantsInstances = {character, '+s.requiredBindings[2]+'}',
  'for _, part in ipairs(workspace:GetPartBoundsInBox(placementCFrame, template:GetExtentsSize(), overlap)) do',
  '  if part.CanCollide then return false end',
  'end',
  'local built = template:Clone()',
  'built:PivotTo(placementCFrame)',
  'for _, part in ipairs(built:GetDescendants()) do',
  '  if part:IsA("BasePart") then part.Anchored = true; part.Transparency = math.min(part.Transparency, 0.95) end',
  'end',
  'built.Parent = '+s.requiredBindings[2],
  'state.inventory.'+s.material+' = state.inventory.'+s.material+' - '+nLiteral(s.cost),
  'return true'].join('\n');
 case 'crafting-atomic-recipe':return [
  ...stateGuard,'if type(state.inventory) ~= "table" then return false end',
  ...s.inputs.map(x=>'if type(state.inventory.'+x.field+') ~= "number" or state.inventory.'+x.field+' < '+nLiteral(x.amount)+' then return false end'),
  'if type(state.inventory.'+s.output+') ~= "number" or state.inventory.'+s.output+
    ' < 0 or state.inventory.'+s.output+' + '+nLiteral(s.outputAmount)+' > '+nLiteral(s.outputLimit)+' then return false end',
  ...s.inputs.map(x=>'state.inventory.'+x.field+' = state.inventory.'+x.field+' - '+nLiteral(x.amount)),
  'state.inventory.'+s.output+' = state.inventory.'+s.output+' + '+nLiteral(s.outputAmount),
  'return true'].join('\n');
 case 'bestiary-confirmed-death':return [
  ...stateGuard,'if type(state.bestiary) ~= "table" or type(state.bestiary.kills) ~= "table" or type(state.bestiary.discovered) ~= "table" then return false end',
  'if typeof(monster) ~= "Instance" or not monster:IsA("Model") or not monster:IsDescendantOf(workspace) then return false end',
  'local humanoid = monster:FindFirstChildOfClass("Humanoid")',
  'if not humanoid or humanoid.Health > 0 then return false end',
  'if monster:GetAttribute("SpeciesId") ~= '+JSON.stringify(s.species)+' then return false end',
  'if monster:GetAttribute("LastHitUserId") ~= player.UserId then return false end',
  'if monster:GetAttribute("DexCredited") == true then return false end',
  'if type(state.bestiary.kills.'+s.species+') ~= "number" or type(state.bestiary.discovered.'+s.species+') ~= "boolean" then return false end',
  'if state.bestiary.kills.'+s.species+' >= '+nLiteral(s.countLimit)+' then return false end',
  'monster:SetAttribute("DexCredited", true)',
  'state.bestiary.discovered.'+s.species+' = true',
  'state.bestiary.kills.'+s.species+' = math.min('+nLiteral(s.countLimit)+', state.bestiary.kills.'+s.species+' + 1)',
  'return true'].join('\n');
 case 'saving-revisioned-update':return [
  ...stateGuard,'if type(state.save) ~= "table" or type(state.save.revision) ~= "number" or type(state.save.dirty) ~= "boolean" then return false end',
  'if not state.save.dirty then return true end',
  'if not player or type(player.UserId) ~= "number" or player.UserId <= 0 then return false end',
  'local revisionAtStart = state.save.revision',
  'local key = "player_" .. tostring(player.UserId)',
  'for attempt = 1, '+nLiteral(s.maxAttempts)+' do',
  '  local ok, result = pcall(function()',
  '    return '+s.requiredBindings[0]+':UpdateAsync(key, function(previous)',
  '      return '+s.requiredBindings[1]+'(previous, state)',
  '    end)',
  '  end)',
  '  if ok and result ~= nil then',
  '    if state.save.revision == revisionAtStart then state.save.dirty = false end',
  '    return true',
  '  end',
  '  if attempt < '+nLiteral(s.maxAttempts)+' then task.wait(math.min(2 ^ attempt, 4)) end',
  'end',
  'return false'].join('\n');
 case 'ai-throttled-chase':return [
  ...stateGuard,'if type(state.ai) ~= "table" or type(state.ai.lastMoveAt) ~= "number" then return false end',
  'if typeof(npc) ~= "Instance" or not npc:IsA("Model") or not npc:IsDescendantOf(workspace) then return false end',
  'if typeof(target) ~= "Instance" or not target:IsA("Model") or not target:IsDescendantOf(workspace) then return false end',
  'local humanoid = npc:FindFirstChildOfClass("Humanoid")',
  'local root = npc:FindFirstChild("HumanoidRootPart")',
  'local targetRoot = target:FindFirstChild("HumanoidRootPart")',
  'if not humanoid or humanoid.Health <= 0 or not root or not targetRoot then return false end',
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
