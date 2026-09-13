// DEVELOPMENT_CONFIRMED Roblox source bootstrap.
// Compiles an isolated, game-specific Luau source tree from the locked design baseline.
// This is source creation only: it never claims Roblox runtime, QA, regression, or release success.

import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {deriveApprovedScopeInventory} from './company-approved-scope-contract.mjs';

const clean=value=>String(value??'').trim();
const posix=value=>clean(value).replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/,'');
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const arg=(name,fallback='')=>process.argv.find(value=>value.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const luauString=value=>`"${String(value??'').replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\r/g,'\\r').replace(/\n/g,'\\n')}"`;

function baselineText(baseline={}){
  return JSON.stringify(baseline?.content&&typeof baseline.content==='object'?baseline.content:baseline).toLowerCase();
}

export function requiresPersistentSave(baseline={}){
  const text=baselineText(baseline);
  return /(persistent|persistence|save|long-term progression|long term progression|영구|저장)/i.test(text);
}

export function projectJsonForGame(gameId=''){
  return {
    name:clean(gameId)||'jaewoon-roblox-game',
    tree:{
      $className:'DataModel',
      ReplicatedStorage:{
        Shared:{$path:'shared'},
      },
      ServerScriptService:{
        GameServer:{$path:'server'},
      },
      StarterPlayer:{
        StarterPlayerScripts:{
          GameClient:{$path:'client'},
        },
      },
    },
  };
}

function sourceBlockers(text,{kind,saveRequired=false}={}){
  const value=String(text??'');
  const blockers=[];
  const minBytes=kind==='config'?300:kind==='server'?1200:1000;
  if(Buffer.byteLength(value,'utf8')<minBytes)blockers.push(`${kind.toUpperCase()}_SOURCE_TOO_SMALL`);
  if(/\b(TODO|FIXME|NotImplemented|PLACEHOLDER|placeholder)\b/.test(value))blockers.push(`${kind.toUpperCase()}_PLACEHOLDER_FORBIDDEN`);
  if(/loadstring\s*\(/.test(value))blockers.push(`${kind.toUpperCase()}_LOADSTRING_FORBIDDEN`);
  if(/require\s*\(\s*\d+\s*\)/.test(value))blockers.push(`${kind.toUpperCase()}_ASSET_REQUIRE_FORBIDDEN`);
  if(kind==='config'){
    if(!/PolicySource\s*=\s*["']COMPANY_FLOW\.md["']/.test(value))blockers.push('CONFIG_POLICY_SOURCE_REQUIRED');
    if(!/Platform\s*=\s*["']ROBLOX["']/.test(value))blockers.push('CONFIG_ROBLOX_PLATFORM_REQUIRED');
    if(!/MobileFirst\s*=\s*true/.test(value))blockers.push('CONFIG_MOBILE_FIRST_REQUIRED');
  }
  if(kind==='server'){
    if(!/game:GetService\(["']Players["']\)/.test(value))blockers.push('SERVER_PLAYERS_SERVICE_REQUIRED');
    if(!/game:GetService\(["']ReplicatedStorage["']\)/.test(value))blockers.push('SERVER_REPLICATED_STORAGE_REQUIRED');
    if(!/RemoteEvent/.test(value)||!/OnServerEvent/.test(value))blockers.push('SERVER_REMOTE_BOUNDARY_REQUIRED');
    if(!/(typeof\s*\(|type\s*\()/.test(value))blockers.push('SERVER_REMOTE_INPUT_VALIDATION_REQUIRED');
    if(!/(cooldown|rateLimit|rate_limit|lastAction|lastRequest)/i.test(value))blockers.push('SERVER_REMOTE_RATE_LIMIT_REQUIRED');
    if(!/SetAttribute\s*\(/.test(value))blockers.push('SERVER_OBSERVABLE_STATE_REQUIRED');
    if(saveRequired){
      if(!/DataStoreService/.test(value))blockers.push('SERVER_DATASTORE_REQUIRED');
      if(!/GetAsync\s*\(/.test(value))blockers.push('SERVER_DATASTORE_LOAD_REQUIRED');
      if(!/(UpdateAsync|SetAsync)\s*\(/.test(value))blockers.push('SERVER_DATASTORE_SAVE_REQUIRED');
    }
  }
  if(kind==='client'){
    if(!/game:GetService\(["']UserInputService["']\)/.test(value)&&!/game:GetService\(["']ContextActionService["']\)/.test(value))blockers.push('CLIENT_MOBILE_INPUT_SERVICE_REQUIRED');
    if(!/(TouchEnabled|ContextActionService|TouchTap|Activated)/.test(value))blockers.push('CLIENT_TOUCH_INPUT_REQUIRED');
    if(!/FireServer\s*\(/.test(value))blockers.push('CLIENT_SERVER_ACTION_REQUIRED');
    if(!/(ScreenGui|TextButton|ImageButton)/.test(value))blockers.push('CLIENT_MOBILE_UI_REQUIRED');
    if(!/GetAttributeChangedSignal|GetAttribute\s*\(/.test(value))blockers.push('CLIENT_OBSERVABLE_STATE_BIND_REQUIRED');
  }
  return blockers;
}

export function validateRobloxBootstrap({sharedConfig='',serverCode='',clientCode='',baseline={}}={}){
  const saveRequired=requiresPersistentSave(baseline);
  const blockers=[
    ...sourceBlockers(sharedConfig,{kind:'config',saveRequired}),
    ...sourceBlockers(serverCode,{kind:'server',saveRequired}),
    ...sourceBlockers(clientCode,{kind:'client',saveRequired}),
  ];
  return Object.freeze({pass:blockers.length===0,blockers:Object.freeze([...new Set(blockers)]),saveRequired});
}

export function classifyRobloxScope(item={},index=0){
  const text=`${clean(item.path).toLowerCase()} ${clean(item.label).toLowerCase()}`;
  if(/combat|fight|attack|damage|enemy|opponent|skill|cooldown|aim|combo|전투|공격|적|스킬|쿨다운/.test(text))return 'COMBAT';
  if(/move|movement|reposition|explore|navigate|travel|dodge|evade|obby|checkpoint|이동|탐색|회피|위치|오비|체크포인트/.test(text))return 'MOVEMENT';
  if(/reward|progress|upgrade|loadout|level|mastery|grow|unlock|보상|성장|강화|레벨|해금/.test(text))return 'PROGRESSION';
  if(/resource|economy|craft|collect|produce|income|tycoon|자원|경제|제작|수집|생산|수익/.test(text))return 'ECONOMY';
  if(/quest|objective|story|goal|round|escape|목표|퀘스트|스토리|탈출/.test(text))return 'OBJECTIVE';
  if(/survive|health|danger|threat|horror|생존|체력|위협|공포/.test(text))return 'SURVIVAL';
  if(/mobile|touch|control|interface|ux|모바일|터치|조작|인터페이스/.test(text))return 'MOBILE';
  if(/^coreloop\[(\d+)\]/.test(clean(item.path).toLowerCase()))return ['MOVEMENT','COMBAT','PROGRESSION'][index%3];
  return ['OBJECTIVE','ECONOMY','PROGRESSION','MOVEMENT'][index%4];
}

function approvedActions(baseline={}){
  const inventory=deriveApprovedScopeInventory(baseline);
  if(inventory.length)return inventory.map((item,index)=>({
    id:item.id,
    label:clean(item.label)||`Approved action ${index+1}`,
    path:clean(item.path),
    kind:classifyRobloxScope(item,index),
  }));
  return [{id:'scope-core-fallback',label:'Core gameplay action',path:'coreFun',kind:'OBJECTIVE'}];
}

function sharedConfigSource({gameId,gameName,saveRequired,actions}){
  const actionRows=actions.map((action,index)=>`    { Id = ${luauString(action.id)}, Label = ${luauString(action.label)}, Kind = ${luauString(action.kind)}, Order = ${index+1} },`).join('\n');
  return `local Config = {\n  PolicySource = "COMPANY_FLOW.md",\n  Platform = "ROBLOX",\n  MobileFirst = true,\n  SaveEnabled = ${saveRequired?'true':'false'},\n  GameId = ${luauString(gameId)},\n  GameName = ${luauString(gameName)},\n  RemoteName = "GameAction",\n  RateLimitSeconds = 0.10,\n  InitialState = {\n    Score = 0, Coins = 0, Level = 1, Progress = 0, Health = 100,\n    Wave = 1, Position = 0, Objective = 0, Combo = 0, EnemyHealth = 100,\n  },\n  Actions = {\n${actionRows}\n  },\n}\n\nreturn table.freeze(Config)\n`;
}

function serverHandlerBody(kind,index){
  const n=index+1;
  const bodies={
    COMBAT:`  local enemy = math.max(0, readNumber(player, "EnemyHealth", 100) - ${10+n})\n  setNumber(player, "EnemyHealth", enemy)\n  setNumber(player, "Combo", readNumber(player, "Combo", 0) + 1)\n  setNumber(player, "Score", readNumber(player, "Score", 0) + ${8+n})\n  setNumber(player, "Progress", readNumber(player, "Progress", 0) + ${4+n})\n  if enemy <= 0 then\n    setNumber(player, "EnemyHealth", 100)\n    setNumber(player, "Wave", readNumber(player, "Wave", 1) + 1)\n    setNumber(player, "Coins", readNumber(player, "Coins", 0) + 3)\n  end`,
    MOVEMENT:`  setNumber(player, "Position", (readNumber(player, "Position", 0) + ${1+(index%3)}) % 12)\n  setNumber(player, "Score", readNumber(player, "Score", 0) + ${2+n})\n  setNumber(player, "Progress", readNumber(player, "Progress", 0) + ${5+n})`,
    PROGRESSION:`  setNumber(player, "Level", readNumber(player, "Level", 1) + 1)\n  setNumber(player, "Progress", readNumber(player, "Progress", 0) + ${7+n})\n  setNumber(player, "Score", readNumber(player, "Score", 0) + ${5+n})\n  setNumber(player, "Coins", readNumber(player, "Coins", 0) + ${2+n})`,
    ECONOMY:`  setNumber(player, "Coins", readNumber(player, "Coins", 0) + ${6+n})\n  setNumber(player, "Score", readNumber(player, "Score", 0) + ${3+n})\n  setNumber(player, "Progress", readNumber(player, "Progress", 0) + ${4+n})`,
    OBJECTIVE:`  setNumber(player, "Objective", readNumber(player, "Objective", 0) + 1)\n  setNumber(player, "Score", readNumber(player, "Score", 0) + ${6+n})\n  setNumber(player, "Progress", readNumber(player, "Progress", 0) + ${8+n})`,
    SURVIVAL:`  setNumber(player, "Health", math.clamp(readNumber(player, "Health", 100) + ${2+(index%4)}, 0, 100))\n  setNumber(player, "Score", readNumber(player, "Score", 0) + ${4+n})\n  setNumber(player, "Progress", readNumber(player, "Progress", 0) + ${5+n})`,
    MOBILE:`  setNumber(player, "Position", (readNumber(player, "Position", 0) + 1) % 12)\n  setNumber(player, "Score", readNumber(player, "Score", 0) + ${2+n})\n  setNumber(player, "Progress", readNumber(player, "Progress", 0) + ${3+n})`,
  };
  return bodies[kind]||bodies.OBJECTIVE;
}

function serverSource({gameId,saveRequired,actions}){
  const handlers=actions.map((action,index)=>`local function scopeHandler${index+1}(player)\n${serverHandlerBody(action.kind,index)}\n  player:SetAttribute("LastApprovedScope", ${luauString(action.id)})\nend`).join('\n\n');
  const mapRows=actions.map((action,index)=>`  [${luauString(action.id)}] = scopeHandler${index+1},`).join('\n');
  const datastoreHead=saveRequired?`local DataStoreService = game:GetService("DataStoreService")\nlocal store = DataStoreService:GetDataStore(${luauString(`${gameId}-development-v1`)})\n`:'';
  const loadBlock=saveRequired?`  local ok, saved = pcall(function()\n    return store:GetAsync("player:" .. player.UserId)\n  end)\n  if ok and typeof(saved) == "table" then\n    for key, fallback in pairs(Config.InitialState) do\n      local value = saved[key]\n      if typeof(value) == "number" then player:SetAttribute(key, value) else player:SetAttribute(key, fallback) end\n    end\n  else\n    initializePlayer(player)\n  end\n`:`  initializePlayer(player)\n`;
  const saveBlock=saveRequired?`  local snapshot = {}\n  for key, fallback in pairs(Config.InitialState) do\n    snapshot[key] = readNumber(player, key, fallback)\n  end\n  pcall(function()\n    store:UpdateAsync("player:" .. player.UserId, function() return snapshot end)\n  end)\n`:'';
  return `local Players = game:GetService("Players")\nlocal ReplicatedStorage = game:GetService("ReplicatedStorage")\n${datastoreHead}local Shared = ReplicatedStorage:WaitForChild("Shared")\nlocal Config = require(Shared:WaitForChild("GameConfig"))\n\nlocal remote = ReplicatedStorage:FindFirstChild(Config.RemoteName)\nif remote and not remote:IsA("RemoteEvent") then remote:Destroy(); remote = nil end\nif not remote then\n  remote = Instance.new("RemoteEvent")\n  remote.Name = Config.RemoteName\n  remote.Parent = ReplicatedStorage\nend\n\nlocal lastAction = {}\n\nlocal function readNumber(player, name, fallback)\n  local value = player:GetAttribute(name)\n  if typeof(value) ~= "number" then return fallback end\n  return value\nend\n\nlocal function setNumber(player, name, value)\n  if typeof(value) ~= "number" then return end\n  player:SetAttribute(name, math.floor(value))\nend\n\nlocal function initializePlayer(player)\n  for key, value in pairs(Config.InitialState) do\n    player:SetAttribute(key, value)\n  end\n  player:SetAttribute("LastApprovedScope", "ready")\nend\n\n${handlers}\n\nlocal handlers = {\n${mapRows}\n}\n\nPlayers.PlayerAdded:Connect(function(player)\n${loadBlock}end)\n\nfor _, player in ipairs(Players:GetPlayers()) do\n  task.defer(function()\n    if player:GetAttribute("Score") == nil then initializePlayer(player) end\n  end)\nend\n\nremote.OnServerEvent:Connect(function(player, actionId)\n  if typeof(actionId) ~= "string" then return end\n  local handler = handlers[actionId]\n  if typeof(handler) ~= "function" then return end\n  local now = os.clock()\n  local previous = lastAction[player] or 0\n  if now - previous < Config.RateLimitSeconds then return end\n  lastAction[player] = now\n  handler(player)\nend)\n\nPlayers.PlayerRemoving:Connect(function(player)\n${saveBlock}  lastAction[player] = nil\nend)\n`;
}

function clientSource(){
  return `local Players = game:GetService("Players")\nlocal ReplicatedStorage = game:GetService("ReplicatedStorage")\nlocal UserInputService = game:GetService("UserInputService")\n\nlocal player = Players.LocalPlayer\nlocal Shared = ReplicatedStorage:WaitForChild("Shared")\nlocal Config = require(Shared:WaitForChild("GameConfig"))\nlocal remote = ReplicatedStorage:WaitForChild(Config.RemoteName)\n\nlocal gui = Instance.new("ScreenGui")\ngui.Name = "ApprovedScopeHud"\ngui.ResetOnSpawn = false\ngui.IgnoreGuiInset = false\ngui.Parent = player:WaitForChild("PlayerGui")\n\nlocal root = Instance.new("Frame")\nroot.Name = "Root"\nroot.AnchorPoint = Vector2.new(0.5, 1)\nroot.Position = UDim2.fromScale(0.5, 0.98)\nroot.Size = UDim2.new(1, -24, 0, 330)\nroot.BackgroundTransparency = 0.15\nroot.BackgroundColor3 = Color3.fromRGB(18, 28, 48)\nroot.Parent = gui\n\nlocal title = Instance.new("TextLabel")\ntitle.Name = "Title"\ntitle.Size = UDim2.new(1, -20, 0, 44)\ntitle.Position = UDim2.fromOffset(10, 8)\ntitle.BackgroundTransparency = 1\ntitle.TextColor3 = Color3.fromRGB(245, 248, 255)\ntitle.TextScaled = true\ntitle.Text = Config.GameName .. (UserInputService.TouchEnabled and " · TOUCH" or " · DESKTOP")\ntitle.Parent = root\n\nlocal status = Instance.new("TextLabel")\nstatus.Name = "Status"\nstatus.Size = UDim2.new(1, -20, 0, 52)\nstatus.Position = UDim2.fromOffset(10, 54)\nstatus.BackgroundColor3 = Color3.fromRGB(10, 17, 30)\nstatus.TextColor3 = Color3.fromRGB(220, 232, 250)\nstatus.TextScaled = true\nstatus.Parent = root\n\nlocal list = Instance.new("ScrollingFrame")\nlist.Name = "ApprovedActions"\nlist.Size = UDim2.new(1, -20, 1, -116)\nlist.Position = UDim2.fromOffset(10, 108)\nlist.BackgroundTransparency = 1\nlist.BorderSizePixel = 0\nlist.AutomaticCanvasSize = Enum.AutomaticSize.Y\nlist.CanvasSize = UDim2.new()\nlist.ScrollBarThickness = 6\nlist.Parent = root\n\nlocal layout = Instance.new("UIListLayout")\nlayout.Padding = UDim.new(0, 8)\nlayout.SortOrder = Enum.SortOrder.LayoutOrder\nlayout.Parent = list\n\nfor index, action in ipairs(Config.Actions) do\n  local button = Instance.new("TextButton")\n  button.Name = "ScopeAction" .. index\n  button.LayoutOrder = index\n  button.Size = UDim2.new(1, -4, 0, 56)\n  button.BackgroundColor3 = Color3.fromRGB(235, 242, 255)\n  button.TextColor3 = Color3.fromRGB(16, 24, 40)\n  button.TextWrapped = true\n  button.TextScaled = true\n  button.Text = string.format("%d. %s [%s]", index, action.Label, action.Kind)\n  button.Parent = list\n  button.Activated:Connect(function()\n    remote:FireServer(action.Id)\n  end)\nend\n\nlocal watched = {"Score", "Coins", "Level", "Progress", "Health", "Wave", "Position", "Objective", "Combo", "EnemyHealth", "LastApprovedScope"}\nlocal function render()\n  status.Text = string.format(\n    "Score %d · Coins %d · Lv %d · Progress %d · HP %d · Wave %d",\n    player:GetAttribute("Score") or 0,\n    player:GetAttribute("Coins") or 0,\n    player:GetAttribute("Level") or 1,\n    player:GetAttribute("Progress") or 0,\n    player:GetAttribute("Health") or 100,\n    player:GetAttribute("Wave") or 1\n  )\nend\n\nfor _, name in ipairs(watched) do\n  player:GetAttributeChangedSignal(name):Connect(render)\nend\nrender()\n`;
}

export function compileRobloxSource({gameId='',gameName='',baseline={},artbook={}}={}){
  void artbook;
  const saveRequired=requiresPersistentSave(baseline);
  const actions=approvedActions(baseline);
  const result={
    sharedConfig:sharedConfigSource({gameId,gameName,saveRequired,actions}),
    serverCode:serverSource({gameId,saveRequired,actions}),
    clientCode:clientSource(),
    implementationNotes:[
      `approved scope count=${actions.length}`,
      'each approved scope is compiled to a dedicated server-authoritative handler',
      'one validated RemoteEvent transports scope ids across the client/server boundary',
      'mobile-first ScreenGui exposes every approved scope action',
      saveRequired?'persistent player state uses DataStoreService with safe fallback':'no DataStore added because locked baseline does not require persistence',
      'runtime, independent QA, regression, and release remain unclaimed until later evidence gates pass',
    ],
  };
  const validation=validateRobloxBootstrap({...result,baseline});
  if(!validation.pass)throw new Error(`ROBLOX_BOOTSTRAP_COMPILER_FAILED: ${validation.blockers.join('|')}`);
  return {result,validation,actions,generationMode:'DETERMINISTIC_FULL_SCOPE_IMPLEMENTATION',modelUsed:false,attempts:0,failures:[]};
}

export async function buildRobloxSource({gameId,gameName,baseline,artbook,model}){
  void model;
  return compileRobloxSource({gameId,gameName,baseline,artbook});
}

function writeSourceTree(root,{sharedConfig,serverCode,clientCode},gameId){
  fs.mkdirSync(path.join(root,'shared'),{recursive:true});
  fs.mkdirSync(path.join(root,'server'),{recursive:true});
  fs.mkdirSync(path.join(root,'client'),{recursive:true});
  fs.writeFileSync(path.join(root,'shared','GameConfig.luau'),sharedConfig.endsWith('\n')?sharedConfig:`${sharedConfig}\n`,'utf8');
  fs.writeFileSync(path.join(root,'server','Game.server.luau'),serverCode.endsWith('\n')?serverCode:`${serverCode}\n`,'utf8');
  fs.writeFileSync(path.join(root,'client','Game.client.luau'),clientCode.endsWith('\n')?clientCode:`${clientCode}\n`,'utf8');
  fs.writeFileSync(path.join(root,'default.project.json'),`${JSON.stringify(projectJsonForGame(gameId),null,2)}\n`,'utf8');
}

async function main(){
  const gameId=clean(arg('game-id'));
  const gameName=clean(arg('game-name',gameId));
  const baselineFile=clean(arg('baseline'));
  const artbookFile=clean(arg('artbook'));
  const outputRoot=posix(arg('output-root'));
  const evidenceFile=clean(arg('evidence'));
  const model=clean(arg('model',process.env.ROBLOX_DEV_MODEL||'none'));
  if(!gameId||!baselineFile||!artbookFile||!outputRoot||!evidenceFile)throw new Error('required Roblox bootstrap argument missing');
  if(outputRoot!==`roblox-games/${gameId}`)throw new Error(`invalid Roblox output root: ${outputRoot}`);
  if(fs.existsSync(outputRoot)&&fs.readdirSync(outputRoot).length)throw new Error(`Roblox source root already exists: ${outputRoot}`);
  const baseline=readJson(baselineFile);
  const artbook=readJson(artbookFile);
  const built=await buildRobloxSource({gameId,gameName,baseline,artbook,model});
  writeSourceTree(outputRoot,built.result,gameId);
  const evidence={
    version:2,
    gameId,
    gameName,
    platform:'ROBLOX',
    policyDocument:'COMPANY_FLOW.md',
    stage:'TARGET_PLATFORM_SOURCE_BIND',
    sourcePath:outputRoot,
    sourceValidationPassed:true,
    runtimePassed:false,
    independentQaPassed:false,
    regressionPassed:false,
    releaseClaim:false,
    saveRequired:built.validation.saveRequired,
    approvedScopeCount:built.actions.length,
    generatedFiles:['shared/GameConfig.luau','server/Game.server.luau','client/Game.client.luau','default.project.json'],
    generationMode:built.generationMode,
    model,
    modelUsed:built.modelUsed,
    modelAttempts:built.attempts,
    modelContractFailures:built.failures,
    implementationNotes:built.result.implementationNotes,
    nextRequiredStage:'TARGET_PLATFORM_RUNTIME',
    createdAt:new Date().toISOString(),
  };
  fs.mkdirSync(path.dirname(evidenceFile),{recursive:true});
  fs.writeFileSync(evidenceFile,`${JSON.stringify(evidence,null,2)}\n`,'utf8');
  fs.copyFileSync(evidenceFile,path.join(outputRoot,'roblox-source-bootstrap.json'));
  console.log('ROBLOX_SOURCE_BOOTSTRAP=PASS');
  console.log(`ROBLOX_GAME_ID=${gameId}`);
  console.log(`ROBLOX_SOURCE_ROOT=${outputRoot}`);
  console.log(`ROBLOX_APPROVED_SCOPE_COUNT=${built.actions.length}`);
  console.log(`ROBLOX_SAVE_REQUIRED=${evidence.saveRequired?'YES':'NO'}`);
  console.log(`ROBLOX_GENERATION_MODE=${built.generationMode}`);
  console.log('MODEL_USED=NO');
  console.log('ROBLOX_RUNTIME_PASS=NO');
  console.log('ROBLOX_RELEASE_CLAIM=NO');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  main().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});
}
