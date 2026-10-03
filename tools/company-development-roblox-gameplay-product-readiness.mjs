import crypto from 'node:crypto';
import {robloxBuildProfileFromBaseline as canonicalRobloxBuildProfileFromBaseline,requiresPersistentSave as canonicalRequiresPersistentSave} from './company-development-roblox-bootstrap.mjs';

const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const upper=value=>clean(value).toUpperCase();
const count=(text,re)=>(String(text||'').match(re)||[]).length;
const has=(text,re)=>re.test(String(text||''));
const uniq=rows=>[...new Set(rows.filter(Boolean))];
const baselineContent=baseline=>baseline?.content&&typeof baseline.content==='object'?baseline.content:(baseline&&typeof baseline==='object'?baseline:{});
function collectDesignTextValues(value,out=[]){
  if(typeof value==='string'){const text=clean(value);if(text)out.push(text);return out;}
  if(Array.isArray(value)){for(const row of value)collectDesignTextValues(row,out);return out;}
  if(value&&typeof value==='object'){for(const row of Object.values(value))collectDesignTextValues(row,out);}
  return out;
}
const designText=baseline=>collectDesignTextValues(baselineContent(baseline),[]).join(' ').toLowerCase();
const gameplayContractText=baseline=>{
  const content=baselineContent(baseline);
  return collectDesignTextValues({
    identity:content.identity,
    playerFantasy:content.playerFantasy,
    coreFun:content.coreFun,
    coreLoop:content.coreLoop,
    signatureSystems:content.signatureSystems,
    systemInterconnections:content.systemInterconnections,
    progressionDirection:content.progressionDirection,
    progressionEconomyBalance:content.progressionEconomyBalance,
    failureRetryRisk:content.failureRetryRisk
  },[]).join(' ').toLowerCase();
};
const stripFoundation=server=>String(server||'').split('-- native-foundation-sentinel-v1')[0];

function field(config,name){
  const m=String(config||'').match(new RegExp('\\b'+name+'\\s*=\\s*["\\\']([^"\\\']+)["\\\']','i'));
  return clean(m?.[1]);
}

function designMode(baseline={}){
  const content=baselineContent(baseline);
  return upper(content.multiplayerMode||content?.robloxBuildProfile?.playMode||'SINGLE');
}

function inferDesignGenre(baseline={}){
  const content=baselineContent(baseline);
  const explicit=clean(content?.robloxBuildProfile?.genre);
  if(explicit)return explicit;
  try{
    const canonical=canonicalRobloxBuildProfileFromBaseline(baseline);
    if(clean(canonical?.genre))return clean(canonical.genre);
  }catch{};
  const identityText=[
    content.identity,content.playerFantasy,content.coreFun,...(Array.isArray(content.coreLoop)?content.coreLoop:[]),
    ...(Array.isArray(content.signatureSystems)?content.signatureSystems:[]).flatMap(row=>[row?.name,row?.purpose,row?.playerChoice])
  ].map(clean).join(' ').toLowerCase();
  if(/surviv|생존|horror|공포/.test(identityText))return'Survival';
  if(/\brpg\b|role.?play|던전.*(?:성장|레벨)|역할 수행/.test(identityText))return'RPG';
  if(/tycoon|simulat|경영|시뮬/.test(identityText))return'Simulation';
  if(/puzzle|퍼즐/.test(identityText))return'Puzzle';
  if(/tower.?defen|defen|strategy|디펜스|전략/.test(identityText))return'Strategy';
  if(/action|combat|fight|액션|전투/.test(identityText))return'Action';
  return null;
}

function inferDesignPlayMode(baseline={}){
  const content=baselineContent(baseline);
  const explicit=upper(content?.robloxBuildProfile?.playMode);
  if(['SINGLE','COOP','COMPETITIVE','HYBRID'].includes(explicit))return explicit;
  try{
    const canonical=canonicalRobloxBuildProfileFromBaseline(baseline);
    const canonicalMode=upper(canonical?.playMode);
    if(['SINGLE','COOP','COMPETITIVE','HYBRID'].includes(canonicalMode))return canonicalMode;
  }catch{};
  const direct=upper(content.multiplayerMode);
  if(['SINGLE','COOP','COMPETITIVE','HYBRID'].includes(direct))return direct;
  const text=designText(baseline);
  if(/4v4|\bpvp\b|competitive|versus|대전|감염 추격/.test(text))return'COMPETITIVE';
  if(/co-?op|coop|협동/.test(text))return'COOP';
  if(/hybrid|혼합/.test(text))return'HYBRID';
  return multiplayerRequiredByDesignText(text)?'COMPETITIVE':'SINGLE';
}

function multiplayerRequiredByDesignText(text=''){
  return /(?:4v4|[2-9]\s*(?:player|players|인)|vs\s*[2-9]|multiplayer|co-?op|pvp|협동|대전|멀티|감염 추격)/i.test(String(text));
}

function multiplayerRequiredByDesign(baseline={}){
  return inferDesignPlayMode(baseline)!=='SINGLE';
}

export function robloxDesignProfileFromBaseline(baseline={}){
  const content=baselineContent(baseline);
  const genre=inferDesignGenre(baseline)||'Adventure';
  const subgenre=clean(content?.robloxBuildProfile?.subgenre)||null;
  const playMode=inferDesignPlayMode(baseline);
  const multiplayerRequired=playMode!=='SINGLE';
  return Object.freeze({
    version:Number(content?.robloxBuildProfile?.version||1),
    targetPlatform:'ROBLOX',
    taxonomy:clean(content?.robloxBuildProfile?.taxonomy)||'DESIGN_GROUNDED_PRODUCT_PROFILE',
    declaredGameCategory:clean(baseline?.gameCategory)||null,
    genre,
    subgenre,
    playMode,
    multiplayerRequired,
    coopImplementationRequired:playMode==='COOP'||playMode==='HYBRID',
    competitiveImplementationRequired:playMode==='COMPETITIVE'||playMode==='HYBRID',
    networkingRequired:multiplayerRequired,
    multiplayerQaRequired:multiplayerRequired,
    minimumParticipantsForRequiredQa:multiplayerRequired?2:1,
    displayLabelKo:[genre,subgenre,playMode].filter(Boolean).join(' · ')
  });
}

export function robloxLearningProfileFromSource({gameId='',config='',fallback={}}={}){
  const genre=field(config,'Genre')||clean(fallback.genre)||'Adventure';
  const subgenre=field(config,'Subgenre')||clean(fallback.subgenre)||'';
  const playMode=upper(field(config,'PlayMode')||fallback.playMode||'SINGLE')||'SINGLE';
  return Object.freeze({
    platform:'ROBLOX',
    gameId:clean(gameId),
    genre,
    subgenre,
    playMode,
    multiplayerRequired:playMode!=='SINGLE'
  });
}

function sourceContext({config='',server='',client='',project=''}={}){
  const gameplayServer=stripFoundation(server);
  const gameplayCombined=gameplayServer+'\n'+String(client||'');
  const all=String(config||'')+'\n'+String(server||'')+'\n'+String(client||'')+'\n'+String(project||'');
  const namedGameplayFunctions=[...gameplayServer.matchAll(/(?:local\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)]
    .map(match=>match[1])
    .filter(name=>!/^scopeHandler\d+$/i.test(name))
    .filter(name=>! /^(?:readNumber|setNumber|initializePlayer|root|hum|part|attach|label|save|load)$/i.test(name));
  return Object.freeze({config:String(config||''),server:String(server||''),client:String(client||''),project:String(project||''),gameplayServer,gameplayCombined,all,namedGameplayFunctions});
}

const CAPABILITY_RULES=Object.freeze([
  {id:'CORE_GAMEPLAY_STATE',design:/./,always:true},
  {id:'SESSION_FLOW',design:/(?:loop|round|session|day|night|wave|stage|floor|match|라운드|세션|하루|낮|밤|웨이브|스테이지|층|경기)/i},
  {id:'WORLD',design:/(?:world|map|region|zone|dungeon|village|island|forest|jungle|school|hospital|theme park|terrain|월드|맵|지역|구역|던전|마을|섬|숲|학교|병원|놀이공원|지형)/i},
  {id:'CONTENT_ENTITY',design:/(?:enemy|monster|boss|npc|customer|resource|item|creature|(?<![가-힣])적(?:의|을|를|이|가|에게|과|와|들|으로|한테)?(?![가-힣])|몬스터|보스|주민|손님|자원|아이템|생물)/i},
  {id:'COMBAT',design:/(?:combat|attack|damage|hit|weapon|skill|enemy|monster|boss|전투|공격|피해|타격|무기|스킬|(?<![가-힣])적(?:의|을|를|이|가|에게|과|와|들|으로|한테)?(?![가-힣])|몬스터|보스)/i},
  {id:'ENEMY_AI',design:/(?:enemy|monster|boss|chase|aggro|\bai\b|(?<![가-힣])적(?:의|을|를|이|가|에게|과|와|들|으로|한테)?(?![가-힣])|몬스터|보스|추격|어그로)/i},
  {id:'GATHERING',design:/(?:gather|harvest|collect resource|resource gathering|mine|chop|채집|(?:자원|재료|아이템|전리품|나무|돌|광석|식량)\s*(?:을|를)?\s*수집|채광|벌목)/i},
  {id:'CRAFTING',design:/(?:craft|recipe|workbench|제작법|제작대|(?:아이템|도구|무기|방어구|장비|포션|재료)\s*(?:을|를)?\s*제작)/i},
  {id:'DAY_NIGHT',design:/(?:\bday\b|\bnight\b|낮(?:\s*시간|에|에는|동안|과|밤)|밤(?:이|에|에는|동안|과|마다)|주야)/i},
  {id:'WAVE',design:/(?:wave|horde|파상|웨이브|몰려오는)/i},
  {id:'INVENTORY',design:/(?:inventory|item ownership|loot|인벤|인벤토리|전리품|아이템 보유)/i},
  {id:'EQUIPMENT',design:/(?:equipment|equip|weapon|armor|loadout|장비|장착|무기|방어구)/i},
  {id:'PROGRESSION',design:/(?:progression|level|xp|experience|unlock|upgrade|growth|성장|레벨|경험치|해금|강화)/i},
  {id:'QUEST',design:/(?:quest|mission|objective chain|퀘스트|미션)/i},
  {id:'BOSS',design:/(?:boss|보스)/i},
  {id:'TYCOON',design:/(?:tycoon|customer|ride|facility|satisfaction|경영|손님|놀이기구|시설|만족도)/i},
  {id:'DEFENSE',design:/(?:tower defense|defense|tower|base health|디펜스|방어탑|타워|기지 체력)/i},
  {id:'DUNGEON',design:/(?:dungeon|던전)/i},
  {id:'INFECTION',design:/(?:infection|infect|purif|감염|정화)/i},
  {id:'SAVE',design:/(?:save|persistent|persistence|rejoin|저장|영구|재접속)/i},
  {id:'MULTIPLAYER',design:/(?:multiplayer|co-?op|pvp|4v4|vs|멀티|협동|대전|감염 추격)/i},
  {id:'MOBILE_UI',design:/./,always:true}
]);

function implementedCapability(id,ctx){
  const s=ctx.gameplayServer,c=ctx.client,a=ctx.all,both=ctx.gameplayCombined;
  if(id==='CORE_GAMEPLAY_STATE'){
    const meaningful=ctx.namedGameplayFunctions.filter(name=>/(attack|combat|damage|hit|move|build|place|spawn|gather|harvest|mine|chop|craft|quest|round|wave|day|night|interact|dash|ability|infect|purify|customer|ride|dungeon|boss|tower|resource|upgrade|equip|inventory|session|match|stage)/i.test(name));
    return meaningful.length>=2||/(StateMachine|CurrentPhase|RoundState|DayPhase|GameState)/.test(both);
  }
  if(id==='SESSION_FLOW'){
    const namedStart=/(?:function\s+\w*(?:start|begin|round|session|day|night|wave|stage|match)|RoundState|DayPhase|CurrentWave|CurrentStage)/i.test(s);
    const namedEnd=/(?:function\s+\w*(?:end|finish|next|restart|reset)|endRound|NextDay|RoundEnded|MATCH_END)/i.test(s);
    if(namedStart&&namedEnd)return true;
    const starts=new Set([...s.matchAll(/SetAttribute\(["']([A-Za-z][A-Za-z0-9_]*Active)["']\s*,\s*true\)/g)].map(match=>match[1]));
    const ends=new Set([...s.matchAll(/SetAttribute\(["']([A-Za-z][A-Za-z0-9_]*Active)["']\s*,\s*false\)/g)].map(match=>match[1]));
    return [...starts].some(name=>ends.has(name));
  }
  if(id==='WORLD')return /Instance\.new\(["'](?:Part|MeshPart|Model|Folder|SpawnLocation)["']\)|Terrain(?::|\.)|buildWorld|makeArena|createWorld|buildMap|workspace\s*:\s*FindFirstChild/i.test(s);
  if(id==='CONTENT_ENTITY')return /(?:spawn|create|build)(?:Enemy|Monster|Boss|Npc|NPC|Customer|Resource|Mob|Creature)|Instance\.new\(["']Model["']\)|HumanoidDescription|CreateHumanoidModel/i.test(s);
  if(id==='COMBAT')return /TakeDamage\s*\(|function\s+\w*(?:attack|damage|hit|combat|skill|ability|purify|infect)|Hitbox|Raycast.*damage|Damage\s*=/i.test(both);
  if(id==='ENEMY_AI')return /PathfindingService|MoveTo\s*\(|Target|Aggro|Chase|Heartbeat:Connect|Stepped:Connect|function\s+\w*(?:ai|target|chase|aggro|enemy)/i.test(s);
  if(id==='GATHERING')return /function\s+\w*(?:gather|harvest|mine|chop|collect)|ResourceNode|GatherPrompt|HarvestPrompt|WoodNode|OreNode/i.test(both);
  if(id==='CRAFTING')return /function\s+\w*craft|Recipes?\s*=|Crafting|Workbench|CraftPrompt|CRAFT_/i.test(both);
  if(id==='DAY_NIGHT')return /ClockTime|TimeOfDay|DayPhase|CurrentDay|function\s+\w*(?:day|night)|DAY_PHASE|NIGHT_PHASE/i.test(both);
  if(id==='WAVE')return /function\s+\w*(?:spawnEnemy|spawnWave|startWave|nextWave)|WaveState|CurrentWave|EnemySpawn|WAVE_/i.test(s);
  if(id==='INVENTORY')return /Inventory|BackpackState|ItemStacks?|function\s+\w*(?:addItem|removeItem|inventory)|INVENTORY_/i.test(both);
  if(id==='EQUIPMENT')return /Equipped|Equipment|Loadout|WeaponTier|ArmorTier|RelicTier|EquippedRelic|function\s+\w*equip|EQUIP_|UNEQUIP_/i.test(both);
  if(id==='PROGRESSION')return /(?:XP|Experience|Level|Unlock|Progression|RecipeUnlock|SkillTree)/.test(both)&&/(?:function\s+\w*(?:level|unlock|award|progress|upgrade)|SetAttribute\(["'](?:XP|Experience|Level|Unlock))/i.test(s);
  if(id==='QUEST')return /Quest|Mission|ObjectiveState|function\s+\w*(?:quest|mission)|QUEST_/i.test(both);
  if(id==='BOSS')return /Boss|function\s+\w*(?:spawnBoss|boss)|BOSS_/i.test(s);
  if(id==='TYCOON')return /Customer|Satisfaction|Ride|Facility|function\s+\w*(?:customer|ride|facility|build|place)|EntranceFee/i.test(both);
  if(id==='DEFENSE')return /Tower|BaseHealth|EnemyPath|function\s+\w*(?:placeTower|spawnWave|spawnEnemy)|TOWER_|DEFENSE_/i.test(both);
  if(id==='DUNGEON')return /Dungeon|DungeonRoom|RoomIndex|function\s+\w*(?:dungeon|room)|DUNGEON_/i.test(both);
  if(id==='INFECTION')return /function\s+infect|function\s+purify|INFECT_ATTACK|setRole\s*\([^,]+,\s*["']MONSTER["']/i.test(s);
  if(id==='SAVE')return /DataStoreService/.test(s)&&/GetAsync\s*\(/.test(s)&&/(?:SetAsync|UpdateAsync)\s*\(/.test(s);
  if(id==='MULTIPLAYER')return /Players:GetPlayers\s*\(\)/.test(s)&&/FireAllClients\s*\(/.test(s)&&/OnClientEvent:Connect/.test(c);
  if(id==='MOBILE_UI')return /ScreenGui|TextButton|ImageButton/.test(c)&&/UserInputService|ContextActionService/.test(c)&&/(?:TouchEnabled|Activated:Connect|BindAction)/.test(c);
  return false;
}

function capabilityIdsForText(text=''){
  return CAPABILITY_RULES.filter(rule=>!rule.always&&rule.design.test(String(text))).map(rule=>rule.id);
}

function statusFromRatio(ratio,{polished=false,applicable=true}={}){
  if(!applicable)return 'N/A';
  if(ratio<=0)return 'MISSING';
  if(ratio<1)return 'ROUGH';
  return polished?'POLISHED':'PLAYABLE';
}

function graphicsSignals(ctx){
  const all=ctx.gameplayCombined;
  return {
    mesh:/(?:MeshPart|SpecialMesh|AssetId|TextureID|SurfaceAppearance)/.test(all),
    material:/Enum\.Material\.|MaterialVariant|SurfaceAppearance/.test(all),
    lighting:/(?:Lighting\.|PointLight|SpotLight|SurfaceLight|Atmosphere|ColorCorrectionEffect|BloomEffect)/.test(all),
    vfx:/(?:ParticleEmitter|Trail|Beam|TweenService)/.test(all),
    motion:/(?:Animator|AnimationTrack|Motor6D|Bone|TweenService|RenderStepped|Heartbeat)/.test(all),
    audio:/(?:SoundService|Instance\.new\(["']Sound["']\)|SoundId)/.test(all)
  };
}

function studioReadinessSignals({required,implemented,ctx,placeholderDebt}){
  const req=id=>required.includes(id);
  const signal=(re,text=ctx.gameplayCombined)=>re.test(text);
  const aiSignals=[
    signal(/PathfindingService|CreatePath|ComputeAsync/i,ctx.gameplayServer),
    signal(/Target|selectTarget|nearest|FindFirstChild.*HumanoidRootPart/i,ctx.gameplayServer),
    signal(/MoveTo\s*\(|Chase|Aggro/i,ctx.gameplayServer),
    signal(/Telegraph|Windup|Anticipation|AttackState|ATTACK_/i,ctx.gameplayCombined),
    signal(/Disengage|Leash|Aggro.*(?:drop|reset)|ReturnToSpawn|Recovery/i,ctx.gameplayServer),
    signal(/Raycast|LineOfSight|Magnitude|Distance/i,ctx.gameplayServer)
  ];
  const combatSignals=[
    signal(/TakeDamage\s*\(|Damage\s*=|damagePlayer|applyDamage/i,ctx.gameplayServer),
    signal(/Anticipation|Windup|attack.*start|ATTACK_ANTICIPATION/i,ctx.gameplayCombined),
    signal(/Impact|HitFlash|ParticleEmitter|Trail|VFX|hitReaction/i,ctx.gameplayCombined),
    signal(/Recovery|Recoil|HitStop|Cooldown|attack.*end/i,ctx.gameplayCombined),
    signal(/HIT_REACTION|TakeDamage|Humanoid\.HealthChanged|hit.*animation/i,ctx.gameplayCombined)
  ];
  const worldSignals=[
    signal(/SpawnLocation|SpawnPoint|spawn position/i,ctx.gameplayServer),
    signal(/Landmark|Region|Zone|Biome|District|Room|Dungeon|Village/i,ctx.gameplayServer),
    signal(/Hazard|Danger|SafeZone|RiskZone|EnemySpawn/i,ctx.gameplayServer),
    signal(/Objective|Quest|Mission|Interact|ProximityPrompt/i,ctx.gameplayCombined),
    signal(/Terrain|MeshPart|Model|buildWorld|createWorld|buildMap/i,ctx.gameplayServer)
  ];
  const firstTenSignals=[
    implemented.MOBILE_UI===true,
    implemented.CORE_GAMEPLAY_STATE===true,
    signal(/Reward|Coins|XP|Experience|Level|Score|toast|feedback|Result/i,ctx.gameplayCombined),
    signal(/Objective|NextGoal|Quest|Mission|CurrentWave|DayPhase|RoundState|Stage/i,ctx.gameplayCombined),
    signal(/Tutorial|Onboarding|Hint|Help|Guide|첫|안내/i,ctx.gameplayCombined)
  ];
  const midLateSignals=[
    implemented.PROGRESSION===true,
    signal(/Unlock|Tier|Recipe|SkillTree|Upgrade|NewRegion|NextRegion|Boss|Elite/i,ctx.gameplayCombined),
    signal(/CurrentDay|CurrentWave|Stage|Floor|Difficulty|Biome|Region/i,ctx.gameplayCombined),
    signal(/Random|Rng|Variant|Modifier|Event|Choice|Build/i,ctx.gameplayCombined)
  ];
  const systemConnections=[];
  if(req('GATHERING')&&req('CRAFTING'))systemConnections.push({id:'RESOURCE_TO_CRAFT',pass:implemented.GATHERING===true&&implemented.CRAFTING===true});
  if(req('CRAFTING')&&req('EQUIPMENT'))systemConnections.push({id:'CRAFT_TO_EQUIPMENT',pass:implemented.CRAFTING===true&&implemented.EQUIPMENT===true});
  if(req('EQUIPMENT')&&req('COMBAT'))systemConnections.push({id:'EQUIPMENT_TO_COMBAT',pass:implemented.EQUIPMENT===true&&implemented.COMBAT===true});
  if(req('QUEST')&&req('PROGRESSION'))systemConnections.push({id:'QUEST_TO_PROGRESSION',pass:implemented.QUEST===true&&implemented.PROGRESSION===true});
  if(req('WORLD')&&req('CONTENT_ENTITY'))systemConnections.push({id:'WORLD_TO_CONTENT',pass:implemented.WORLD===true&&implemented.CONTENT_ENTITY===true});

  const aiQualityPass=!req('ENEMY_AI')||aiSignals.filter(Boolean).length>=4;
  const combatFeelPass=!req('COMBAT')||(combatSignals[0]===true&&combatSignals.filter(Boolean).length>=3);
  const worldTopologyPass=!req('WORLD')||worldSignals.filter(Boolean).length>=3;
  const firstTenMinutesPass=firstTenSignals.filter(Boolean).length>=4;
  const midLateDepthPass=!req('PROGRESSION')||midLateSignals.filter(Boolean).length>=3;
  const systemConnectionPass=systemConnections.every(row=>row.pass);
  const placeholderPass=placeholderDebt.likelyPrimitiveHeavy!==true;
  const criticalGaps=[];
  if(!aiQualityPass)criticalGaps.push('AI_STATE_DEPTH');
  if(!combatFeelPass)criticalGaps.push('COMBAT_FEEL_CHAIN');
  if(!worldTopologyPass)criticalGaps.push('WORLD_TOPOLOGY_AND_LANDMARKS');
  if(!firstTenMinutesPass)criticalGaps.push('FIRST_10_MINUTES_FLOW');
  if(!midLateDepthPass)criticalGaps.push('MID_LATE_GAME_DEPTH');
  if(!systemConnectionPass)criticalGaps.push('SYSTEM_CONNECTION_CHAIN');
  if(!placeholderPass)criticalGaps.push('PRIMARY_PLACEHOLDER_DEBT');
  return Object.freeze({
    ai:Object.freeze({applicable:req('ENEMY_AI'),signalCount:aiSignals.filter(Boolean).length,pass:aiQualityPass}),
    combatFeel:Object.freeze({applicable:req('COMBAT'),signalCount:combatSignals.filter(Boolean).length,pass:combatFeelPass}),
    worldTopology:Object.freeze({applicable:req('WORLD'),signalCount:worldSignals.filter(Boolean).length,pass:worldTopologyPass}),
    firstTenMinutes:Object.freeze({signalCount:firstTenSignals.filter(Boolean).length,pass:firstTenMinutesPass}),
    midLateGame:Object.freeze({applicable:req('PROGRESSION'),signalCount:midLateSignals.filter(Boolean).length,pass:midLateDepthPass}),
    systemConnections:Object.freeze({rows:Object.freeze(systemConnections),pass:systemConnectionPass}),
    placeholder:Object.freeze({pass:placeholderPass,...placeholderDebt}),
    criticalGaps:Object.freeze(criticalGaps),
    f9SourceQualityReady:criticalGaps.length===0
  });
}

function qualitySheet({required,implemented,ctx,runtimeEvidence=null}){
  const req=id=>required.includes(id);
  const ok=id=>implemented[id]===true;
  const ratio=ids=>{
    const relevant=ids.filter(req);
    if(!relevant.length)return null;
    return relevant.filter(ok).length/relevant.length;
  };
  const g=graphicsSignals(ctx);
  const coreIds=['CORE_GAMEPLAY_STATE','SESSION_FLOW','COMBAT','GATHERING','CRAFTING','WAVE','INFECTION','TYCOON','DEFENSE','DUNGEON'];
  const contentIds=['CONTENT_ENTITY','GATHERING','CRAFTING','WAVE','QUEST','BOSS','TYCOON','DEFENSE','DUNGEON'];
  const runtimePass=runtimeEvidence?.simulationRunning===true&&runtimeEvidence?.serverBootObserved===true;
  return Object.freeze({
    Core:statusFromRatio(ratio(coreIds)??(ok('CORE_GAMEPLAY_STATE')?1:0)),
    Content:statusFromRatio(ratio(contentIds)??1,{applicable:contentIds.some(req)}),
    World:statusFromRatio(req('WORLD')?(ok('WORLD')?1:0):1,{applicable:req('WORLD'),polished:g.mesh&&g.material&&g.lighting}),
    Combat:statusFromRatio(req('COMBAT')?(ok('COMBAT')?1:0):1,{applicable:req('COMBAT')}),
    AI:statusFromRatio(req('ENEMY_AI')?(ok('ENEMY_AI')?1:0):1,{applicable:req('ENEMY_AI')}),
    Progression:statusFromRatio(req('PROGRESSION')?(ok('PROGRESSION')?1:0):1,{applicable:req('PROGRESSION')}),
    UI:statusFromRatio(ok('MOBILE_UI')?1:0,{polished:/UIListLayout|UICorner|UIStroke|UIScale/.test(ctx.client)}),
    Graphics:statusFromRatio([g.mesh,g.material,g.lighting,g.vfx].filter(Boolean).length/4,{polished:g.mesh&&g.material&&g.lighting&&g.vfx}),
    Motion:statusFromRatio(g.motion?1:0,{polished:g.motion&&/(Animator|Motor6D|Bone)/.test(ctx.gameplayCombined)}),
    Audio:statusFromRatio(g.audio?1:0,{polished:g.audio&&/SoundGroup|RollOff|PlaybackSpeed/.test(ctx.gameplayCombined)}),
    Mobile:statusFromRatio(ok('MOBILE_UI')?1:0,{polished:/SafeArea|GuiInset|TouchEnabled/.test(ctx.client)}),
    Performance:statusFromRatio(/StreamingEnabled|pool|Pool|budget|LOD|MaxParts|Heartbeat/.test(ctx.gameplayCombined)?1:0),
    Runtime:runtimeEvidence?statusFromRatio(runtimePass?1:0):'N/A'
  });
}

export function evaluateRobloxGameplayProductReadiness({gameId='',baseline={},config='',server='',client='',project='',runtimeEvidence=null}={}){
  const content=baselineContent(baseline);
  const text=gameplayContractText(baseline);
  const ctx=sourceContext({config,server,client,project});
  const required=[];
  for(const rule of CAPABILITY_RULES){
    if(rule.always||rule.design.test(text))required.push(rule.id);
  }
  if(multiplayerRequiredByDesign(baseline)&&!required.includes('MULTIPLAYER'))required.push('MULTIPLAYER');
  if(canonicalRequiresPersistentSave(baseline)&&!required.includes('SAVE'))required.push('SAVE');
  if(Array.isArray(content.coreLoop)&&content.coreLoop.length>=2&&!required.includes('SESSION_FLOW'))required.push('SESSION_FLOW');
  if((content.progressionDirection||'').trim()&&!required.includes('PROGRESSION'))required.push('PROGRESSION');

  const implemented={};
  for(const id of required)implemented[id]=implementedCapability(id,ctx);

  const coreLoop=(Array.isArray(content.coreLoop)?content.coreLoop:[]).map((step,index)=>{
    const ids=capabilityIdsForText(step);
    const effective=ids.length?ids:['CORE_GAMEPLAY_STATE'];
    return Object.freeze({index,step:clean(step),capabilities:Object.freeze(effective),pass:effective.every(id=>implemented[id]===true)});
  });
  const signatureSystems=(Array.isArray(content.signatureSystems)?content.signatureSystems:[]).map((row,index)=>{
    const description=[row?.name,row?.purpose,row?.playerChoice].map(clean).join(' ');
    const ids=capabilityIdsForText(description);
    const effective=ids.length?ids:['CORE_GAMEPLAY_STATE'];
    return Object.freeze({index,name:clean(row?.name)||'signature-'+(index+1),capabilities:Object.freeze(effective),pass:effective.every(id=>implemented[id]===true)});
  });

  const scopeHandlerCount=count(ctx.gameplayServer,/local\s+function\s+scopeHandler\d+/g);
  const meaningfulFunctionCount=ctx.namedGameplayFunctions.filter(name=>/(attack|combat|damage|hit|move|build|place|spawn|gather|harvest|mine|chop|craft|quest|round|wave|day|night|interact|dash|ability|infect|purify|customer|ride|dungeon|boss|tower|resource|upgrade|equip|inventory|session|match|stage)/i.test(name)).length;
  const genericSkeleton=scopeHandlerCount>=3&&meaningfulFunctionCount<2;
  const blockers=[];
  const expectedGenre=inferDesignGenre(baseline);
  const actualGenre=field(config,'Genre');
  const expectedPlayMode=inferDesignPlayMode(baseline);
  const actualPlayMode=upper(field(config,'PlayMode'));
  if(expectedGenre&&!actualGenre)blockers.push('DESIGN_GENRE_MISSING:'+expectedGenre);
  else if(expectedGenre&&upper(expectedGenre)!==upper(actualGenre))blockers.push('DESIGN_GENRE_MISMATCH:'+expectedGenre+':'+actualGenre);
  if(expectedPlayMode&&!actualPlayMode)blockers.push('DESIGN_PLAY_MODE_MISSING:'+expectedPlayMode);
  else if(expectedPlayMode!==actualPlayMode)blockers.push('DESIGN_PLAY_MODE_MISMATCH:'+expectedPlayMode+':'+actualPlayMode);
  for(const id of required)if(implemented[id]!==true)blockers.push('MISSING_GAMEPLAY_CAPABILITY:'+id);
  for(const row of coreLoop)if(!row.pass)blockers.push('CORE_LOOP_STEP_UNIMPLEMENTED:'+row.index);
  for(const row of signatureSystems)if(!row.pass)blockers.push('SIGNATURE_SYSTEM_UNIMPLEMENTED:'+row.index);
  if(genericSkeleton)blockers.push('GENERIC_SCOPE_HANDLER_SKELETON');

  const primitiveConstructionCount=count(ctx.gameplayServer,/Instance\.new\(["']Part["']\)/g);
  const meshConstructionCount=count(ctx.gameplayCombined,/(?:Instance\.new\(["']MeshPart["']\)|SpecialMesh|SurfaceAppearance)/g);
  const placeholderDebt=Object.freeze({
    primitiveConstructionCount,
    meshConstructionCount,
    likelyPrimitiveHeavy:primitiveConstructionCount>=6&&meshConstructionCount===0,
    genericScopeHandlerCount:scopeHandlerCount,
    meaningfulGameplayFunctionCount:meaningfulFunctionCount
  });
  const sheet=qualitySheet({required,implemented,ctx,runtimeEvidence});
  const studioReadiness=studioReadinessSignals({required,implemented,ctx,placeholderDebt});
  const pass=blockers.length===0&&sheet.Core!=='MISSING'&&sheet.Core!=='ROUGH'&&sheet.Mobile!=='MISSING';

  const runtimeRequirements=Object.freeze({
    worldRequired:required.includes('WORLD'),
    minimumBasePartCount:required.includes('WORLD')?5:1,
    spawnRequired:required.includes('WORLD'),
    landmarkRequired:required.some(id=>['WORLD','DUNGEON','TYCOON','DEFENSE'].includes(id)),
    objectiveRequired:required.some(id=>['QUEST','DEFENSE','TYCOON','DUNGEON'].includes(id)),
    serverBootRequired:true,
    simulationRequired:true,
    actualPlayRequired:true
  });

  return Object.freeze({
    version:1,
    gameId:clean(gameId),
    pass,
    blockers:Object.freeze(uniq(blockers)),
    requiredCapabilities:Object.freeze(required),
    implementedCapabilities:Object.freeze({...implemented}),
    coreLoopTrace:Object.freeze(coreLoop),
    signatureSystemTrace:Object.freeze(signatureSystems),
    placeholderDebt,
    studioQualitySheet:sheet,
    studioReadiness,
    runtimeRequirements,
    designFingerprint:crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex'),
    antiSkeletonPassed:!genericSkeleton,
    designGenre:expectedGenre,
    sourceGenre:actualGenre||null,
    designPlayMode:expectedPlayMode,
    sourcePlayMode:actualPlayMode||null
  });
}

export function evaluateRobloxF9ProductReadiness({f0Evidence={},runtimeEvidence={},postRuntimeQaEvidence={},studioPlayEvidence={}}={}){
  const product=f0Evidence?.gameplayProductReadiness||{};
  const req=product?.runtimeRequirements||{};
  const world=runtimeEvidence?.openCloudWorldEvidence||{};
  const actualStudio=studioPlayEvidence?.actualPlay===true&&studioPlayEvidence?.runtimeVerified===true;
  const actualRuntime=runtimeEvidence?.actualRuntimeEvidence===true||postRuntimeQaEvidence?.actualRuntimeEvidence===true||actualStudio;
  const exactPublishedRuntime=runtimeEvidence?.exactGame===true&&runtimeEvidence?.exactPlace===true&&runtimeEvidence?.exactVersion===true;
  const exactEngine=(runtimeEvidence?.engineExecuted===true&&runtimeEvidence?.exactEngineVersion===true)
    ||(exactPublishedRuntime&&actualRuntime);
  const serverBoot=runtimeEvidence?.serverBootObserved===true||runtimeEvidence?.f1ServerBootPassed===true;
  const simulation=runtimeEvidence?.simulationRunning===true||(
    actualRuntime
    &&runtimeEvidence?.f1ServerBootPassed===true
    &&runtimeEvidence?.f2WorldFoundationPassed===true
    &&runtimeEvidence?.f3CharacterFoundationPassed===true
    &&runtimeEvidence?.f4PhysicsAndMovementPassed===true
  );
  const mobileRuntime=runtimeEvidence?.f5InputCameraUiPassed===true||postRuntimeQaEvidence?.mobileControlUiPassed===true;
  const coreLoopRuntime=runtimeEvidence?.f8GameplaySystemsPassed===true||postRuntimeQaEvidence?.coreLoopRuntimePassed===true;
  const baseParts=!req.worldRequired||Number(world.basePartCount||0)>=Number(req.minimumBasePartCount||5);
  const spawn=!req.spawnRequired||Number(world.spawnCount||0)>=1;
  const landmark=!req.landmarkRequired||Number(world.landmarkCount||0)>=1;
  const objective=!req.objectiveRequired||Number(world.objectiveCount||0)>=1;
  const blockers=[];
  if(product.pass!==true)blockers.push('F0_GAMEPLAY_PRODUCT_READINESS_MISSING');
  if(!product?.studioReadiness)blockers.push('F9_STUDIO_SOURCE_QUALITY_MISSING');
  else if(product.studioReadiness.f9SourceQualityReady!==true){
    for(const gap of product.studioReadiness.criticalGaps||[])blockers.push('F9_STUDIO_SOURCE_QUALITY_GAP:'+gap);
  }
  if(!exactEngine)blockers.push('F9_EXACT_ENGINE_EXECUTION_MISSING');
  if(req.serverBootRequired!==false&&!serverBoot)blockers.push('F9_SERVER_BOOT_MISSING');
  if(req.simulationRequired!==false&&!simulation)blockers.push('F9_SIMULATION_MISSING');
  if(req.actualPlayRequired!==false&&!actualRuntime)blockers.push('F9_ACTUAL_PLAY_EVIDENCE_MISSING');
  if(!mobileRuntime)blockers.push('F9_MOBILE_INPUT_UI_RUNTIME_MISSING');
  if(!coreLoopRuntime)blockers.push('F9_CORE_LOOP_RUNTIME_MISSING');
  if(!baseParts)blockers.push('F9_WORLD_BASEPART_MINIMUM_MISSING');
  if(!spawn)blockers.push('F9_WORLD_SPAWN_MISSING');
  if(!landmark)blockers.push('F9_WORLD_LANDMARK_MISSING');
  if(!objective)blockers.push('F9_WORLD_OBJECTIVE_MISSING');
  return Object.freeze({
    version:1,
    pass:blockers.length===0,
    blockers:Object.freeze(blockers),
    exactEngine,
    serverBoot,
    simulation,
    actualRuntime,
    mobileRuntime,
    coreLoopRuntime,
    verticalSlicePassed:blockers.length===0,
    world:Object.freeze({
      observed:world.observed===true,
      basePartCount:Number(world.basePartCount||0),
      spawnCount:Number(world.spawnCount||0),
      landmarkCount:Number(world.landmarkCount||0),
      objectiveCount:Number(world.objectiveCount||0)
    }),
    sourceQualitySheet:product?.studioQualitySheet||null,
    studioReadiness:product?.studioReadiness||null
  });
}
