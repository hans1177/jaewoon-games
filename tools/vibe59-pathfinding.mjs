import {inspectVibe59LuauInsertionScope} from './vibe59-luau-scope.mjs';
// Obstacle-aware Roblox enemy movement, explicit owner-scoped source edits only.
// Computes one safe waypoint per bounded tick. No external AI, game file write or Studio attestation.
const IDENT=/^[A-Za-z_][A-Za-z0-9_]*$/;
const BANNED=new Set(['__proto__','prototype','constructor','game','script','workspace',
  'state','npc','target','local','function','end','true','false','nil','then','if','return']);
function identifier(x,label){
 if(typeof x!=='string'||!IDENT.test(x)||BANNED.has(x))
  throw Error('VIBE59_PATH_INVALID_BINDING:'+label);
 return x;
}
function bounded(x,label,min,max){
 if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)
  throw Error('VIBE59_PATH_INVALID_NUMBER:'+label);
 return x;
}
function normalize(spec){
 if(!spec||typeof spec!=='object'||spec.operation!=='ai-pathfinding-chase')
  throw Error('VIBE59_PATH_UNSUPPORTED_OPERATION');
 const functionName=identifier(spec.functionName,'functionName');
 const service=identifier(spec.pathfindingService,'pathfindingService');
 const range=bounded(spec.range,'range',1,2000);
 const interval=bounded(spec.interval,'interval',0.15,30);
 const agentRadius=bounded(spec.agentRadius,'agentRadius',0.5,25);
 const agentHeight=bounded(spec.agentHeight,'agentHeight',1,50);
 const maxWaypoints=bounded(spec.maxWaypoints,'maxWaypoints',2,64);
 if(!Number.isInteger(maxWaypoints))throw Error('VIBE59_PATH_INTEGER_WAYPOINTS');
 return {functionName,service,range,interval,agentRadius,agentHeight,maxWaypoints};
}
function grounded({source,sourcePath,replaceAnchor},spec){
 if(typeof sourcePath!=='string'||!/\.(?:lua|luau)$/i.test(sourcePath)
  ||!(/(?:^|\/)(?:server|ServerScriptService|ServerStorage)\//i.test(sourcePath)
   ||/\.server\.(?:lua|luau)$/i.test(sourcePath)))
  throw Error('VIBE59_PATH_SERVER_ONLY');
 if(typeof source!=='string'||!source.includes('\n')
  ||replaceAnchor!=='-- VIBE59_QUALITY_SLOT'
  ||source.split(replaceAnchor).length!==2)
  throw Error('VIBE59_PATH_EXACT_SLOT');
 const inspected=inspectVibe59LuauInsertionScope({source,anchor:replaceAnchor,
  functionName:spec.functionName,signature:'npc, target'});
 const body=inspected.ownerBody;
 for(const term of ['state.ai.lastMoveAt','state.ai.planning']){
  if(!new RegExp('\\b'+term.replace(/\./g,'\\.')+'\\b').test(body))
   throw Error('VIBE59_PATH_EXISTING_FIELD:'+term);
 }
 if(!/(?:^|\n)\s*local\s+state\s*=/.test(body))
  throw Error('VIBE59_PATH_EXISTING_STATE');
 if(!new RegExp('(?:^|\\n)\\s*(?:local\\s+)?'+spec.service+'\\s*=').test(inspected.masked))
  throw Error('VIBE59_PATH_SERVICE_MISSING');
 return inspected;
}
function code(s){
 return [
 '-- Vibe5.9 owner-approved obstacle-aware AI pathfinding',
 'if type(state) ~= "table" or type(state.ai) ~= "table" then return false end',
 'if type(state.ai.lastMoveAt) ~= "number" or type(state.ai.planning) ~= "boolean" then return false end',
 'if state.ai.lastMoveAt ~= state.ai.lastMoveAt or math.abs(state.ai.lastMoveAt) == math.huge or state.ai.planning then return false end',
 'if typeof(npc) ~= "Instance" or not npc:IsA("Model") or not npc:IsDescendantOf(workspace) then return false end',
 'if typeof(target) ~= "Instance" or not target:IsA("Model") or not target:IsDescendantOf(workspace) or target == npc then return false end',
 'if typeof('+s.service+') ~= "Instance" or not '+s.service+':IsA("PathfindingService") then return false end',
 'local humanoid = npc:FindFirstChildOfClass("Humanoid")',
 'local targetHumanoid = target:FindFirstChildOfClass("Humanoid")',
 'local root = npc:FindFirstChild("HumanoidRootPart")',
 'local targetRoot = target:FindFirstChild("HumanoidRootPart")',
 'if not humanoid or humanoid.Health <= 0 or not targetHumanoid or targetHumanoid.Health <= 0 then return false end',
 'if not root or not root:IsA("BasePart") or not targetRoot or not targetRoot:IsA("BasePart") then return false end',
 'if (targetRoot.Position - root.Position).Magnitude > '+s.range+' then return false end',
 'local now = workspace:GetServerTimeNow()',
 'if now - state.ai.lastMoveAt < '+s.interval+' then return false end',
 '-- Charge the planning cooldown before ComputeAsync yields; failed paths cannot spam ComputeAsync.',
 'state.ai.lastMoveAt = now',
 'state.ai.planning = true',
 'local ok, waypoint = pcall(function()',
 '  local planned = '+s.service+':CreatePath({AgentRadius = '+s.agentRadius+', AgentHeight = '+s.agentHeight+', AgentCanJump = true})',
 '  planned:ComputeAsync(root.Position, targetRoot.Position)',
 '  if planned.Status ~= Enum.PathStatus.Success then return nil end',
 '  local waypoints = planned:GetWaypoints()',
 '  if #waypoints < 2 or #waypoints > '+s.maxWaypoints+' then return nil end',
 '  return waypoints[2]',
 'end)',
 'state.ai.planning = false',
 'if not ok or not waypoint then return false end',
 '-- ComputeAsync yields. Recheck target health and distance before issuing a movement order.',
 'if not npc:IsDescendantOf(workspace) or not target:IsDescendantOf(workspace) then return false end',
 'if humanoid.Health <= 0 or targetHumanoid.Health <= 0 then return false end',
 'if (targetRoot.Position - root.Position).Magnitude > '+s.range+' then return false end',
 'if waypoint.Action == Enum.PathWaypointAction.Jump then humanoid.Jump = true end',
 'humanoid:MoveTo(waypoint.Position)',
 'return true'
 ].join('\n');
}
export function synthesizeVibe59Pathfinding({spec={},source='',sourcePath='',replaceAnchor=''}={}){
 const s=normalize(spec);grounded({source,sourcePath,replaceAnchor},s);
 return Object.freeze({source:code(s),operation:'ai-pathfinding-chase',
  safety:{serverOnly:true,ownerApprovedSourceRequired:true,existingService:true,
   locksCompute:true,cooldownOnFailure:true,noSaveSchemaChanges:true},
  sourceWrite:false,modelUsed:false,runtimeVerified:false});
}
export function verifyVibe59PathfindingScenarios({spec={},scenarios=[]}={}){
 const s=normalize(spec);
 if(!Array.isArray(scenarios)||scenarios.length<2||scenarios.length>16)
  throw Error('VIBE59_PATH_SCENARIOS_REQUIRED');
 let accept=0,deny=0;
 const cases=scenarios.map((row,i)=>{
  if(!row||typeof row.expectedApplied!=='boolean'||typeof row.expectedLastMoveAt!=='number')
   throw Error('VIBE59_PATH_EXPECTATIONS:'+i);
  const facts=row.facts||{};
  for(const n of ['now','lastMoveAt','distance']){
   if(typeof facts[n]!=='number'||!Number.isFinite(facts[n]))throw Error('VIBE59_PATH_FACT_NUMBER:'+n);
  }
  const eligible=facts.npcValid===true&&facts.targetValid===true
   &&facts.npcAlive===true&&facts.targetAlive===true&&facts.planning!==true
   &&facts.distance<=s.range&&facts.now-facts.lastMoveAt>=s.interval;
  const planned=eligible&&facts.computeOk===true&&Number.isInteger(facts.waypointCount)
   &&facts.waypointCount>=2&&facts.waypointCount<=s.maxWaypoints
   &&facts.targetStillValid===true;
  const lastMoveAt=eligible?facts.now:facts.lastMoveAt;
  row.expectedApplied?accept++:deny++;
  return {name:String(row.name??i).slice(0,50),
   pass:planned===row.expectedApplied&&lastMoveAt===row.expectedLastMoveAt,
   applied:planned,lastMoveAt};
 });
 if(!accept||!deny)throw Error('VIBE59_PATH_POSITIVE_NEGATIVE_REQUIRED');
 return Object.freeze({pass:cases.every(x=>x.pass),cases,modelUsed:false,
   runtimeVerified:false,sourceWrite:false,authority:'offline-path-decision-oracle'});
}
