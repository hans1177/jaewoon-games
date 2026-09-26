// Game-specific BUILD_UP directive generator.
// Produces one common game goal per loop, then platform-native execution guidance for Unity Web, Roblox, and Unity app.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const uniq=v=>[...new Set((Array.isArray(v)?v:[]).map(clean).filter(Boolean))];
const sha=v=>crypto.createHash('sha256').update(String(v??'')).digest('hex');
const posix=v=>clean(v).replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/,'');
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));}catch{return fallback;}};

export const BUILD_UP_DOMAINS=Object.freeze([
  'CORE_FUN','COMBAT_OR_PRIMARY_INTERACTION','PLAYER_ACTIONS','PLAYER_AGENCY','ANTI_GRIND','ENEMY_AI','BOSS_AND_SIGNATURE_MOMENTS',
  'PROGRESSION','GOALS','REWARDS','UNLOCKS','QUESTS','CONTENT_VARIETY','CONTENT_DENSITY','CONTENT_DISCOVERY','MID_LATE_GAME_DEPTH',
  'WORLD_MAP_TOPOLOGY','MAP_EXPANSION','REGIONS','WORLD_DENSITY','WORLD_NAVIGATION','LANDMARKS','TRAVERSAL','INTERACTION_DISCOVERABILITY',
  'ECONOMY','INVENTORY','INVENTORY_USABILITY','EQUIPMENT_LOADOUT','CRAFTING','SYSTEM_CONNECTION',
  'SESSION_FLOW','FIRST_10_MINUTES','FAILURE_RESPAWN_CHECKPOINTS','SAVE_AND_RECOVERY','SAVE_COMPLETENESS','RECONNECT_RECOVERY','MULTIPLAYER_AND_SYNC',
  'INPUT','MOBILE_UX','ACCESSIBILITY','SETTINGS_ACCESSIBILITY','MENU_FLOW','CONVENIENCE','UI_DESIGN_SYSTEM','UI_INFORMATION_PRIORITY','FEEDBACK_CLARITY',
  'TUTORIAL_ONBOARDING','DIFFICULTY_PACING','GAME_FEEL','SPAWN_ENCOUNTER_DIRECTOR','NPC_SOCIAL_BEHAVIOR','NARRATIVE_STORY',
  'AUDIO_MUSIC_SFX','REPLAYABILITY_VARIATION','CHARACTER_VISUALS','ENEMY_VISUALS','WEAPONS_AND_EQUIPMENT',
  'BUILDINGS_AND_PROPS','ENVIRONMENT','TERRAIN','MATERIALS','PALETTE','LIGHTING','ANIMATION',
  'SECONDARY_MOTION','VFX','CAMERA','UI_HUD','AUDIO_VISUAL_TIMING','ENVIRONMENTAL_MOTION',
  'PERFORMANCE','PERFORMANCE_BUDGET','RUNTIME_STABILITY','ERROR_RECOVERY'
]);

export const HOLISTIC_CORE_DOMAINS=Object.freeze([
  'CORE_FUN','PLAYER_ACTIONS','PLAYER_AGENCY','PROGRESSION','CONTENT_VARIETY','CONTENT_DENSITY',
  'WORLD_MAP_TOPOLOGY','MAP_EXPANSION','REGIONS','WORLD_DENSITY','WORLD_NAVIGATION','INTERACTION_DISCOVERABILITY',
  'INVENTORY','INVENTORY_USABILITY','EQUIPMENT_LOADOUT','SYSTEM_CONNECTION',
  'SESSION_FLOW','FIRST_10_MINUTES','MID_LATE_GAME_DEPTH','SAVE_COMPLETENESS',
  'INPUT','MOBILE_UX','SETTINGS_ACCESSIBILITY','MENU_FLOW','CONVENIENCE','UI_DESIGN_SYSTEM','UI_INFORMATION_PRIORITY','FEEDBACK_CLARITY',
  'ANTI_GRIND','CONTENT_DISCOVERY','PERFORMANCE_BUDGET','RUNTIME_STABILITY'
]);

export const VISUAL_DOMAINS=Object.freeze([
  'CHARACTER','ENEMY_CREATURE','WEAPON_EQUIPMENT','BUILDING_PROP','ENVIRONMENT_TERRAIN',
  'MATERIAL_SURFACE','PALETTE','LIGHTING','ANIMATION','SECONDARY_MOTION','VFX','CAMERA',
  'UI_HUD','AUDIO_VISUAL_SYNC','ENVIRONMENTAL_MOTION','SCENE_DENSITY','LANDMARK_READABILITY'
]);

const TEXT_SOURCE_EXTENSIONS=new Set([
  '.js','.mjs','.ts','.tsx','.html','.htm','.css','.cs','.lua','.luau','.json','.uxml','.uss',
  '.unity','.prefab','.mat','.anim','.controller','.asset','.shader','.compute','.svg','.gltf','.obj','.rbxmx','.rbxlx'
]);
const BINARY_GAME_ASSET_EXTENSIONS=new Set(['.png','.jpg','.jpeg','.webp','.gif','.ogg','.mp3','.wav','.fbx','.glb']);
const GAME_SOURCE_EXTENSIONS=new Set([...TEXT_SOURCE_EXTENSIONS,...BINARY_GAME_ASSET_EXTENSIONS]);
const NON_EVOLUTION_BASENAMES=new Set([
  'roblox-source-bootstrap.json','prototype-source.json','unity-web-floor-source.json',
  'upper-platform-development-readiness.json','web-development-validation.json',
  'web-final-content-depth.json','web-runtime-evidence.json','web-actual-play.json',
  'web-independent-qa.json','web-regression.json'
]);

function evolutionFileEligible(file){
  const base=path.basename(file).toLowerCase();
  if(NON_EVOLUTION_BASENAMES.has(base))return false;
  return GAME_SOURCE_EXTENSIONS.has(path.extname(base).toLowerCase());
}

function walkSource(root){
  if(!root||!fs.existsSync(root))return[];
  const rows=[],stack=[root];
  while(stack.length){
    const current=stack.pop();
    let entries=[];try{entries=fs.readdirSync(current,{withFileTypes:true});}catch{continue;}
    for(const entry of entries.sort((a,b)=>a.name.localeCompare(b.name))){
      if(['node_modules','Library','Temp','Logs','build','dist','.git','Binaries','Intermediate','Saved','Packages','ProjectSettings'].includes(entry.name))continue;
      const full=path.join(current,entry.name);
      if(entry.isDirectory()){stack.push(full);continue;}
      if(!evolutionFileEligible(full))continue;
      rows.push(full);
    }
  }
  return rows.slice(0,300);
}

function tokenCount(text,re){return (String(text).match(re)||[]).length;}

const CONTROL_FLOW_SYMBOLS=new Set(['if','for','while','switch','catch','with']);
function sourceAnchorCandidates(text='',file=''){
  const anchors=[],lines=String(text).split('\n');
  const patterns=[
    ['CLASS',/^\s*(?:export\s+)?(?:(?:public|private|protected|internal|abstract|sealed|static|partial)\s+)*class\s+([A-Za-z_$][\w$]*)/],
    ['FUNCTION',/^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$.:]*)\s*\(/],
    ['FUNCTION',/^\s*(?:local\s+)?function\s+([A-Za-z_$][\w$.:]*)\s*\(/],
    ['FUNCTION',/^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/],
    ['METHOD',/^\s*(?:(?:public|private|protected|internal|static|async|virtual|override|sealed|partial)\s+)+(?:[A-Za-z_$][\w$<>,.?\[\]]*\s+)+([A-Za-z_$][\w$]*)\s*\(/],
    ['METHOD',/^\s*([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/]
  ];
  for(let index=0;index<lines.length;index++){
    const line=lines[index],trimmed=line.trim();
    if(!trimmed||trimmed.startsWith('//')||trimmed.startsWith('#'))continue;
    let matched=false;
    for(const [kind,re] of patterns){
      const match=line.match(re);
      if(!match)continue;
      const symbol=clean(match[1]);
      if(!symbol||CONTROL_FLOW_SYMBOLS.has(symbol.toLowerCase()))continue;
      const nearby=lines.slice(Math.max(0,index-2),Math.min(lines.length,index+4)).join(' ');
      const score=20
        +tokenCount(nearby,/attack|damage|combat|enemy|boss|player|input|progress|reward|unlock|quest|save|spawn|camera|animation|vfx|ui|touch|state|phase|mode/gi)*8
        +(kind==='CLASS'?8:kind==='FUNCTION'?6:4);
      anchors.push({file,line:index+1,kind,symbol,context:clean(trimmed).slice(0,180),score});
      matched=true;break;
    }
    if(matched)continue;
    const state=line.match(/\b(?:state|phase|mode|status)\s*(?:=|:)\s*["']([A-Za-z0-9_-]{3,})["']/i);
    if(state)anchors.push({file,line:index+1,kind:'STATE',symbol:'STATE:'+clean(state[1]),context:clean(trimmed).slice(0,180),score:18});
  }
  return anchors.sort((a,b)=>b.score-a.score||a.file.localeCompare(b.file)||a.line-b.line).slice(0,24);
}

function selectPrimarySourceAnchors(source={},responsibleFiles=[],limit=6){
  const preferred=new Set((responsibleFiles||[]).map(posix).filter(Boolean));
  const anchors=[...(source?.sourceAnchors||[])];
  anchors.sort((a,b)=>(preferred.has(posix(b.file))?1:0)-(preferred.has(posix(a.file))?1:0)
    ||Number(b.score||0)-Number(a.score||0)
    ||String(a.file).localeCompare(String(b.file))
    ||Number(a.line||0)-Number(b.line||0));
  return anchors.slice(0,Math.max(1,Number(limit)||6));
}

function classifyPreviousEffectiveness({previousDirective=null,previousOutcome='',depthInfo={},runtimeEvidence={}}={}){
  if(!previousDirective)return Object.freeze({classification:'NO_PREVIOUS_GENERATION',reason:'initial build-up generation',runtimeObserved:false});
  const outcome=clean(previousOutcome).toLowerCase();
  const failed=['failed','error','rejected','repair_required'].includes(outcome);
  const verified=['verified','done','completed','pass','passed'].includes(outcome);
  const runtimeObserved=runtimeEvidence?.runtimeObserved===true;
  const runtimePassed=runtimeEvidence?.runtimePassed===true;
  const failure=clean(runtimeEvidence?.failureSignature)||clean(runtimeEvidence?.failureStage);
  const observedRuntimeFailure=runtimeObserved&&!runtimePassed&&Boolean(failure);
  if(failed||observedRuntimeFailure)return Object.freeze({classification:'REGRESSION',reason:failure||('previous generation outcome='+outcome),runtimeObserved});
  if(verified&&!depthInfo?.sourceChangedSincePrevious)return Object.freeze({classification:'NO_MEANINGFUL_EFFECT',reason:'verified status without real game source delta',runtimeObserved});
  if(verified&&depthInfo?.sourceChangedSincePrevious&&runtimeObserved&&runtimePassed)return Object.freeze({classification:'EFFECT_CONFIRMED',reason:'verified generation changed game source and current runtime observation passed',runtimeObserved});
  if(verified&&depthInfo?.sourceChangedSincePrevious&&runtimeObserved)return Object.freeze({classification:'PARTIAL_EFFECT',reason:'game source changed but runtime evidence is not a full pass',runtimeObserved});
  if(verified&&depthInfo?.sourceChangedSincePrevious)return Object.freeze({classification:'PARTIAL_EFFECT',reason:'all required generation work verified with source delta; runtime effect remains unobserved',runtimeObserved:false});
  return Object.freeze({classification:'UNKNOWN_RUNTIME_EFFECT',reason:'previous generation lacks sufficient verified effect evidence',runtimeObserved});
}

function depthStage(depth=1){
  const value=Math.max(1,Number(depth)||1);
  return value===1?'FOUNDATION_COMPLETENESS'
    :value===2?'ROLE_DIFFERENTIATION'
    :value===3?'SYSTEM_CONNECTION'
    :value===4?'DECISION_DENSITY'
    :value===5?'SIGNATURE_DEPTH'
    :`SIGNATURE_MASTERY_${value}`;
}

function expectedPlayerEffect({focus='CORE_FUN',identity='',anchor='',secondary=''}={}){
  const byFocus={
    CORE_FUN:identity+'에서 '+anchor+'의 선택 결과가 더 분명해지고 같은 입력 반복보다 상황 판단이 유리해진다.',
    PROGRESSION:identity+'에서 '+(secondary||anchor)+'의 목표·보상·해금이 다음 플레이 선택을 실제로 넓힌다.',
    PRESENTATION:identity+'에서 '+anchor+'의 위험·행동·정체성이 모션·VFX·카메라·UI를 통해 더 빠르게 읽힌다.',
    USABILITY:identity+'에서 핵심 행동과 다음 목표를 모바일에서 더 적은 오입력과 탐색 비용으로 수행한다.',
    STABILITY:identity+'에서 동일 입력과 상태가 반복 가능한 결과를 만들고 진행 차단·복구 실패가 사라진다.'
  };
  return byFocus[focus]||byFocus.CORE_FUN;
}

function decideNextVibeAction({previousEffectiveness={},previousOutcome='',focus='CORE_FUN'}={}){
  const classification=clean(previousEffectiveness?.classification).toUpperCase();
  const failed=['failed','error','rejected','repair_required'].includes(clean(previousOutcome).toLowerCase());
  if(failed||classification==='REGRESSION')return Object.freeze({action:'CAUSAL_REPAIR',reason:'verified failure/regression evidence has higher player value than unrelated build-up'});
  if(classification==='NO_MEANINGFUL_EFFECT')return Object.freeze({action:'CONTINUE_BUILD_UP_CURRENT_SYSTEM',reason:'previous verified status did not create a meaningful source/player-value delta; change strategy at the same depth'});
  if(classification==='UNKNOWN_RUNTIME_EFFECT')return Object.freeze({action:'REQUEST_REQUIRED_RUNTIME_OBSERVATION',reason:'effect cannot be promoted until relevant runtime or deterministic gameplay evidence is observed'});
  if(classification==='EFFECT_CONFIRMED')return Object.freeze({action:'MOVE_TO_NEXT_HIGHER_VALUE_GAP',reason:'previous generation effect is confirmed; advance to the next highest-value deferred gap'});
  if(classification==='PARTIAL_EFFECT')return Object.freeze({action:'CONTINUE_BUILD_UP_CURRENT_SYSTEM',reason:'source/QA progress exists but the player-value effect is not fully confirmed'});
  return Object.freeze({action:'CONTINUE_BUILD_UP_CURRENT_SYSTEM',reason:'initial '+focus+' build-up has no previous generation effect to compare'});
}

export function inspectGameSource({repoRoot=process.cwd(),sourceRoot=''}={}){
  const absolute=path.resolve(repoRoot,sourceRoot);
  const files=walkSource(absolute);
  const rows=files.map(file=>{
    let buffer=Buffer.alloc(0);try{buffer=fs.readFileSync(file);}catch{}
    const extension=path.extname(file).toLowerCase();
    const text=TEXT_SOURCE_EXTENSIONS.has(extension)?buffer.toString('utf8'):'';
    const relative=posix(path.relative(repoRoot,file));
    return{file:relative,text,buffer,sourceAnchors:TEXT_SOURCE_EXTENSIONS.has(extension)?sourceAnchorCandidates(text,relative):[]};
  });
  const joined=rows.map(row=>row.text).join('\n');
  const fingerprint=crypto.createHash('sha256');
  for(const row of rows){fingerprint.update(row.file);fingerprint.update('\0');fingerprint.update(row.buffer);fingerprint.update('\0');}
  const signals={
    combat:tokenCount(joined,/attack|damage|combat|hitbox|weapon|enemy|health|hp\b/gi),
    progression:tokenCount(joined,/progress|level|xp|reward|unlock|quest|wave|economy|gold|inventory|craft/gi),
    ai:tokenCount(joined,/state.?machine|aggro|target|pathfind|navmesh|steer|behavior|enemy.?ai/gi),
    save:tokenCount(joined,/datastore|playerprefs|save|load|serialize|persist/gi),
    multiplayer:tokenCount(joined,/remoteevent|serverrpc|clientrpc|network|multiplayer|playeradded|netcode/gi),
    animation:tokenCount(joined,/animator|animation|tween|heartbeat|renderstepped|lerp|slerp|coroutine|transform\.rotate/gi),
    vfx:tokenCount(joined,/particle|trail|vfx|effect|flash|shake|afterimage/gi),
    camera:tokenCount(joined,/camera|fieldofview|fov|cinemachine/gi),
    ui:tokenCount(joined,/screenui|screengui|canvas|button|hud|label|uitoolkit|ongui/gi),
    uiFlow:tokenCount(joined,/menu|panel|modal|popup|tab|scroll|backbutton|closebutton|navigation|screen.?stack|page.?stack/gi),
    input:tokenCount(joined,/userinputservice|contextactionservice|touch|mousebutton|keycode|inputaction|onclick|activated/gi),
    map:tokenCount(joined,/world|map|region|biome|zone|terrain|dungeon|village|town|island|forest|jungle|snow|desert|lake|room|floor|portal/gi),
    landmark:tokenCount(joined,/landmark|checkpoint|spawnpoint|waypoint|signpost|tower|temple|castle|school|shop|hospital|station/gi),
    interaction:tokenCount(joined,/interact|proximityprompt|clickdetector|pickup|collect|open|useitem|activate|trigger|prompt/gi),
    inventory:tokenCount(joined,/inventory|itemslot|slot|stack|hotbar|backpack|itemdata|itemid/gi),
    equipment:tokenCount(joined,/equip|unequip|equipment|weapon.?slot|armor|loadout|equipped/gi),
    settings:tokenCount(joined,/settings|volume|musicvolume|sfxvolume|camera.?shake|sensitivity|accessibility|ui.?scale|graphics.?quality/gi),
    feedback:tokenCount(joined,/toast|notification|feedback|tooltip|floating.?text|damage.?number|message|success|failed|complete|reward.?popup/gi),
    session:tokenCount(joined,/restart|result|gameover|victory|defeat|respawn|checkpoint|return.?menu|start.?game|end.?game|session/gi),
    content:tokenCount(joined,/enemy|monster|boss|item|weapon|quest|region|biome|event|building|npc|recipe|skill|ability/gi),
    choice:tokenCount(joined,/choice|select|option|branch|build|loadout|strategy|upgrade.?choice|choose/gi),
    connection:tokenCount(joined,/inventory.*equip|equip.*inventory|reward.*unlock|unlock.*region|quest.*reward|drop.*craft|craft.*equip|map.*quest|region.*resource|resource.*craft/gi),
    performance:tokenCount(joined,/pool|objectpool|debounce|throttle|debri|destroy\s*\(|disconnect\s*\(|cleanup|dispose|lod|cull|streaming|budget|fps|memory|gc\b/gi),
    lighting:tokenCount(joined,/lighting|light\b|colorcorrection|postprocess|ambient|shadow/gi),
    primitive:tokenCount(joined,/createprimitive|primitivetype|instance\.new\(["']Part["']|shape\s*=|capsule|sphere|cube/gi),
    todo:tokenCount(joined,/TODO|FIXME|NotImplementedException/g),
    errorRecovery:tokenCount(joined,/try\s*\{|catch\s*\(|pcall|xpcall|fallback|retry|recover/gi)
  };
  const topFiles=rows.map(row=>({
    file:row.file,
    score:
      tokenCount(row.text,/attack|damage|combat|enemy|player|progress|quest|save|ui|camera|animation|particle/gi)
  })).sort((a,b)=>b.score-a.score||a.file.localeCompare(b.file)).slice(0,12);
  const sourceAnchors=rows.flatMap(row=>row.sourceAnchors||[]).sort((a,b)=>Number(b.score||0)-Number(a.score||0)||a.file.localeCompare(b.file)||Number(a.line||0)-Number(b.line||0)).slice(0,48);
  return Object.freeze({
    sourceRoot:posix(sourceRoot),
    sourceTreeFingerprint:files.length?fingerprint.digest('hex'):sha('missing:'+sourceRoot),
    fileCount:files.length,
    topFiles,
    sourceAnchors:Object.freeze(sourceAnchors),
    signals,
    observations:uniq([
      files.length===0?'CURRENT_SOURCE_MISSING_OR_UNREADABLE':'CURRENT_SOURCE_FILES='+files.length,
      signals.primitive>8?'PLACEHOLDER_OR_PRIMITIVE_USAGE_HIGH':null,
      signals.animation<2?'MOTION_IMPLEMENTATION_SPARSE':null,
      signals.vfx<2?'VFX_IMPLEMENTATION_SPARSE':null,
      signals.camera<1?'CAMERA_LANGUAGE_SPARSE':null,
      signals.progression<4?'PROGRESSION_IMPLEMENTATION_SPARSE':null,
      signals.ai<2?'AI_BEHAVIOR_DEPTH_SPARSE':null,
      signals.map<3?'WORLD_MAP_IMPLEMENTATION_SPARSE':null,
      signals.inventory>0&&signals.equipment<2?'INVENTORY_EQUIPMENT_FLOW_SPARSE':null,
      signals.ui>0&&signals.uiFlow<2?'UI_MENU_FLOW_SPARSE':null,
      signals.interaction<2?'INTERACTION_DISCOVERABILITY_SPARSE':null,
      signals.session<2?'SESSION_FLOW_SPARSE':null,
      signals.settings<1?'SETTINGS_ACCESSIBILITY_SPARSE':null,
      signals.performance<2?'PERFORMANCE_BUDGET_SPARSE':null,
      signals.todo>0?'EXPLICIT_TODO_OR_NOT_IMPLEMENTED_PRESENT':null
    ])
  });
}

export function inspectGameSources({repoRoot=process.cwd(),sourceRoots=[]}={}){
  const roots=uniq(sourceRoots).filter(root=>root&&fs.existsSync(path.resolve(repoRoot,root)));
  if(!roots.length)return inspectGameSource({repoRoot,sourceRoot:clean(sourceRoots?.[0])});
  const parts=roots.map(sourceRoot=>inspectGameSource({repoRoot,sourceRoot}));
  const signals={};
  for(const part of parts)for(const [key,value] of Object.entries(part.signals||{}))signals[key]=(signals[key]||0)+Number(value||0);
  const combinedFingerprint=sha(parts.map(part=>part.sourceTreeFingerprint).sort().join('|'));
  const topFiles=parts.flatMap(part=>part.topFiles||[]).sort((a,b)=>Number(b.score||0)-Number(a.score||0)||a.file.localeCompare(b.file)).slice(0,20);
  const sourceAnchors=parts.flatMap(part=>part.sourceAnchors||[]).sort((a,b)=>Number(b.score||0)-Number(a.score||0)||a.file.localeCompare(b.file)||Number(a.line||0)-Number(b.line||0)).slice(0,64);
  return Object.freeze({
    sourceRoot:roots.join('|'),
    sourceRoots:Object.freeze(roots),
    sourceTreeFingerprint:combinedFingerprint,
    fileCount:parts.reduce((n,part)=>n+Number(part.fileCount||0),0),
    topFiles:Object.freeze(topFiles),
    sourceAnchors:Object.freeze(sourceAnchors),
    signals:Object.freeze(signals),
    observations:Object.freeze(uniq(parts.flatMap(part=>part.observations||[]))),
    platformSourceFingerprints:Object.freeze(Object.fromEntries(parts.map(part=>[part.sourceRoot,part.sourceTreeFingerprint])))
  });
}


export function extractDesignContext(record={}){
  const d=record?.content&&typeof record.content==='object'?record.content:record;
  const systems=(Array.isArray(d?.signatureSystems)?d.signatureSystems:[]).map(system=>({
    name:clean(system?.name),
    purpose:clean(system?.purpose),
    playerChoice:clean(system?.playerChoice)
  })).filter(x=>x.name||x.purpose||x.playerChoice).slice(0,12);
  return Object.freeze({
    identity:clean(d?.identity),
    coreFun:clean(d?.coreFun),
    coreLoop:uniq(d?.coreLoop).slice(0,10),
    signatureSystems:systems,
    progressionDirection:clean(d?.progressionDirection),
    multiplayerMode:clean(d?.multiplayerMode),
    platformProfiles:d?.platformProfiles&&typeof d.platformProfiles==='object'?d.platformProfiles:{}
  });
}

function qualitySignalText(values=[]){return uniq(values).join(' | ').toLowerCase();}
function focusFromSignals({signals=[],source={}}={}){
  const text=qualitySignalText(signals);
  if(/crash|runtime|error|softlock|save|desync|broken|exception/.test(text))return'STABILITY';
  if(/combat|core.?fun|interaction|enemy|boss|gameplay|feel|decision/.test(text))return'CORE_FUN';
  if(/progress|reward|unlock|quest|goal|economy|content/.test(text))return'PROGRESSION';
  if(/mobile|touch|input|ui|hud|readability|navigation|accessib/.test(text))return'USABILITY';
  if(/visual|graphic|render|animation|vfx|camera|lighting|material|silhouette|environment|placeholder/.test(text))return'PRESENTATION';
  const s=source?.signals||{};
  if(Number(s.ai||0)<2||Number(s.combat||0)<5)return'CORE_FUN';
  if(Number(s.progression||0)<4)return'PROGRESSION';
  if(Number(s.primitive||0)>8||Number(s.animation||0)<2||Number(s.vfx||0)<2)return'PRESENTATION';
  return'USABILITY';
}

function nextFocus({preferred='CORE_FUN',previous={}}={}){
  const order=['CORE_FUN','PROGRESSION','USABILITY','PRESENTATION','STABILITY'];
  const prior=clean(previous?.primaryFocus).toUpperCase();
  if(!prior||prior!==preferred)return preferred;
  const index=order.indexOf(prior);
  return order[(index+1+Math.max(0,Number(previous?.generation||0)))%order.length];
}

function primaryDesignAnchor(design={}){
  const system=design.signatureSystems?.[0];
  return clean(system?.name)||clean(system?.purpose)||clean(design.coreFun)||clean(design.identity)||'현재 게임의 핵심 플레이';
}
function secondaryDesignAnchor(design={}){
  const system=design.signatureSystems?.[1];
  return clean(system?.name)||clean(system?.playerChoice)||clean(design.progressionDirection)||design.coreLoop?.[0]||'핵심 루프';
}

function domainState(domain,{design={},source={}}={}){
  const s=source?.signals||{};
  const relevantByText=qualitySignalText([
    design.identity,design.coreFun,design.progressionDirection,...(design.coreLoop||[]),
    ...(design.signatureSystems||[]).flatMap(x=>[x.name,x.purpose,x.playerChoice])
  ]);
  const no=(reason)=>({domain,state:'NOT_APPLICABLE',reason});
  const gap=(reason)=>({domain,state:'GAP',reason});
  const pass=(reason='current source and approved design provide sufficient implementation signal')=>({domain,state:'PASS',reason});
  const hasWorld=/world|map|region|biome|zone|terrain|dungeon|village|town|island|forest|jungle|snow|desert|lake|room|floor|portal|지역|맵|마을|던전|섬|숲/.test(relevantByText)||Number(s.map||0)>0;
  const hasInventory=/inventory|item|equipment|equip|weapon|armor|loot|craft|인벤|아이템|장비|무기|방어구|전리품|제작/.test(relevantByText)||Number(s.inventory||0)>0||Number(s.equipment||0)>0;
  const hasEquipment=/equipment|equip|weapon|armor|loadout|장비|무기|방어구|장착/.test(relevantByText)||Number(s.equipment||0)>0;
  const hasProgression=Boolean(clean(design.progressionDirection))||Number(s.progression||0)>0;
  const hasMultiplayer=/multi|coop|co-op|pvp|player/.test(clean(design.multiplayerMode).toLowerCase())||/multiplayer|coop|pvp/.test(relevantByText)||Number(s.multiplayer||0)>0;
  const hasSave=Number(s.save||0)>0||/save|persist|저장/.test(relevantByText);

  if(domain==='MULTIPLAYER_AND_SYNC'&&!hasMultiplayer)return no('approved design and current source do not require multiplayer');
  if(domain==='CRAFTING'&&!/craft|제작|recipe/.test(relevantByText)&&Number(s.progression||0)>0)return no('no crafting signal in approved design');
  if(domain==='QUESTS'&&!/quest|퀘스트|story|npc/.test(relevantByText))return no('no quest/story objective signal in approved design');
  if(domain==='NPC_SOCIAL_BEHAVIOR'&&!/npc|villager|resident|social|주민|상인|대화/.test(relevantByText))return no('no NPC or social behavior signal in approved design');
  if(domain==='NARRATIVE_STORY'&&!/story|narrative|lore|quest|스토리|세계관|대사/.test(relevantByText))return no('no narrative or story signal in approved design');
  if(domain==='REPLAYABILITY_VARIATION'&&!/rogue|wave|random|procedural|replay|런|웨이브|랜덤/.test(relevantByText))return no('no explicit replay variation signal in approved design');
  if(['MAP_EXPANSION','WORLD_DENSITY','WORLD_NAVIGATION','CONTENT_DISCOVERY'].includes(domain)&&!hasWorld)return no('approved design and current source do not expose a world/map surface requiring expansion');
  if(['INVENTORY_USABILITY'].includes(domain)&&!hasInventory)return no('game has no current inventory/item ownership system');
  if(domain==='EQUIPMENT_LOADOUT'&&!hasEquipment)return no('game has no current equipment/loadout system');
  if(domain==='RECONNECT_RECOVERY'&&!hasMultiplayer&&!hasSave)return no('game has no multiplayer or persistent reconnect state');
  if(domain==='SAVE_COMPLETENESS'&&!hasSave)return no('game has no persistent save system yet');
  if(domain==='MID_LATE_GAME_DEPTH'&&!hasProgression)return no('approved design has no multi-stage progression direction');

  const weakByDomain={
    ANIMATION:Number(s.animation||0)<2,
    SECONDARY_MOTION:Number(s.animation||0)<2,
    VFX:Number(s.vfx||0)<2,
    CAMERA:Number(s.camera||0)<1,
    PROGRESSION:Number(s.progression||0)<4,
    ENEMY_AI:Number(s.ai||0)<2,
    ERROR_RECOVERY:Number(s.errorRecovery||0)<2,
    WORLD_MAP_TOPOLOGY:hasWorld&&Number(s.map||0)<5,
    MAP_EXPANSION:hasWorld&&(Number(s.map||0)<8||Number(s.landmark||0)<2),
    REGIONS:hasWorld&&Number(s.map||0)<6,
    WORLD_DENSITY:hasWorld&&(Number(s.content||0)<8||Number(s.landmark||0)<2),
    WORLD_NAVIGATION:hasWorld&&(Number(s.landmark||0)<2||Number(s.uiFlow||0)<1),
    LANDMARKS:hasWorld&&Number(s.landmark||0)<2,
    TRAVERSAL:hasWorld&&Number(s.input||0)<2,
    INTERACTION_DISCOVERABILITY:Number(s.interaction||0)<3,
    INVENTORY:hasInventory&&Number(s.inventory||0)<3,
    INVENTORY_USABILITY:hasInventory&&(Number(s.inventory||0)<5||Number(s.uiFlow||0)<2),
    EQUIPMENT_LOADOUT:hasEquipment&&Number(s.equipment||0)<4,
    SYSTEM_CONNECTION:(hasInventory||hasWorld||hasProgression)&&Number(s.connection||0)<2,
    SESSION_FLOW:Number(s.session||0)<4,
    FIRST_10_MINUTES:Number(s.session||0)<3||Number(s.progression||0)<3||Number(s.interaction||0)<2,
    MID_LATE_GAME_DEPTH:hasProgression&&(Number(s.progression||0)<8||Number(s.content||0)<10),
    SAVE_AND_RECOVERY:hasSave&&Number(s.save||0)<3,
    SAVE_COMPLETENESS:hasSave&&(Number(s.save||0)<5||(hasInventory&&Number(s.inventory||0)<3)),
    RECONNECT_RECOVERY:(hasMultiplayer||hasSave)&&Number(s.errorRecovery||0)<2,
    INPUT:Number(s.input||0)<3,
    MOBILE_UX:Number(s.input||0)<3||Number(s.ui||0)<3,
    SETTINGS_ACCESSIBILITY:Number(s.settings||0)<2,
    MENU_FLOW:Number(s.ui||0)>0&&Number(s.uiFlow||0)<3,
    CONVENIENCE:(Number(s.ui||0)+Number(s.interaction||0)+Number(s.progression||0))>0&&Number(s.uiFlow||0)<3,
    UI_DESIGN_SYSTEM:Number(s.ui||0)<4,
    UI_INFORMATION_PRIORITY:Number(s.ui||0)<4||Number(s.feedback||0)<2,
    FEEDBACK_CLARITY:Number(s.feedback||0)<3,
    PLAYER_AGENCY:(Number(s.combat||0)+Number(s.progression||0))>3&&Number(s.choice||0)<2,
    ANTI_GRIND:hasProgression&&Number(s.content||0)<8,
    CONTENT_DENSITY:Number(s.content||0)<8,
    CONTENT_DISCOVERY:(hasWorld||hasProgression)&&Number(s.interaction||0)<3,
    PERFORMANCE:Number(s.performance||0)<2,
    PERFORMANCE_BUDGET:Number(s.performance||0)<3,
    RUNTIME_STABILITY:Number(s.errorRecovery||0)<2,
    SETTINGS_ACCESSIBILITY:Number(s.settings||0)<2
  };
  if(['CHARACTER_VISUALS','ENEMY_VISUALS','ENVIRONMENT','TERRAIN','MATERIALS'].includes(domain)&&Number(s.primitive||0)>8)return gap('placeholder or primitive-heavy implementation remains');
  if(weakByDomain[domain]===true)return gap('current source signals indicate shallow, missing, disconnected, or placeholder-heavy implementation');
  return pass();
}

function escalationDepthInfo({previousDirective=null,previousOutcome='',currentSourceTreeFingerprint=''}={}){
  const priorDepth=Math.max(0,Number(previousDirective?.developmentDepth||0));
  const outcome=clean(previousOutcome).toLowerCase();
  const verified=['verified','done','completed','pass','passed'].includes(outcome);
  const failed=['failed','error','rejected','repair_required'].includes(outcome);
  const previousTree=clean(previousDirective?.sourceTreeFingerprint);
  const currentTree=clean(currentSourceTreeFingerprint);
  const sourceChangedSincePrevious=Boolean(previousDirective&&previousTree&&currentTree&&previousTree!==currentTree);
  const verifiedEvolution=verified&&sourceChangedSincePrevious;
  const depth=Math.max(1,priorDepth+(verifiedEvolution?1:priorDepth?0:1));
  const stage=depth===1?'FOUNDATION_COMPLETENESS'
    :depth===2?'ROLE_DIFFERENTIATION'
    :depth===3?'SYSTEM_CONNECTION'
    :depth===4?'DECISION_DENSITY'
    :depth===5?'SIGNATURE_DEPTH'
    :`SIGNATURE_MASTERY_${depth}`;
  return Object.freeze({
    developmentDepth:depth,
    escalationStage:stage,
    escalationMode:failed?'DEEPER_CAUSAL_REPAIR'
      :verified&&!sourceChangedSincePrevious?'VERIFIED_STATUS_WITHOUT_GAME_SOURCE_DELTA_RETRY'
      :verifiedEvolution?'ESCALATE_AFTER_VERIFIED_GAME_SOURCE_DELTA'
      :previousDirective?'CONTINUE_UNVERIFIED_DEPTH'
      :'INITIAL_GAME_SPECIFIC_BUILD_UP',
    previousOutcome:outcome||null,
    sourceChangedSincePrevious,
    verifiedEvolution,
    advanceAllowed:verifiedEvolution
  });
}

function buildAllDomainDirectives({states=[],design={},focus='CORE_FUN',depthInfo={}}={}){
  const identity=design.identity||'현재 게임';
  const anchor=primaryDesignAnchor(design);
  const secondary=secondaryDesignAnchor(design);
  const progression=design.progressionDirection||'승인된 진행 방향';
  const depth=Number(depthInfo.developmentDepth||1);
  const focusDomains={
    CORE_FUN:new Set(['CORE_FUN','COMBAT_OR_PRIMARY_INTERACTION','PLAYER_ACTIONS','PLAYER_AGENCY','ANTI_GRIND','ENEMY_AI','BOSS_AND_SIGNATURE_MOMENTS','CONTENT_VARIETY','CONTENT_DENSITY','SESSION_FLOW','FIRST_10_MINUTES']),
    PROGRESSION:new Set(['PROGRESSION','GOALS','REWARDS','UNLOCKS','QUESTS','ECONOMY','INVENTORY','INVENTORY_USABILITY','EQUIPMENT_LOADOUT','CRAFTING','SYSTEM_CONNECTION','MID_LATE_GAME_DEPTH','CONTENT_DISCOVERY','MAP_EXPANSION','REGIONS']),
    PRESENTATION:new Set(['CHARACTER_VISUALS','ENEMY_VISUALS','WEAPONS_AND_EQUIPMENT','BUILDINGS_AND_PROPS','ENVIRONMENT','TERRAIN','MATERIALS','PALETTE','LIGHTING','ANIMATION','SECONDARY_MOTION','VFX','CAMERA','UI_HUD','UI_DESIGN_SYSTEM','AUDIO_VISUAL_TIMING','ENVIRONMENTAL_MOTION','LANDMARKS','WORLD_DENSITY']),
    USABILITY:new Set(['INPUT','MOBILE_UX','ACCESSIBILITY','SETTINGS_ACCESSIBILITY','MENU_FLOW','CONVENIENCE','UI_INFORMATION_PRIORITY','FEEDBACK_CLARITY','INTERACTION_DISCOVERABILITY','WORLD_NAVIGATION','TUTORIAL_ONBOARDING','TRAVERSAL','UI_HUD','GOALS','GAME_FEEL']),
    STABILITY:new Set(['SAVE_AND_RECOVERY','SAVE_COMPLETENESS','RECONNECT_RECOVERY','MULTIPLAYER_AND_SYNC','FAILURE_RESPAWN_CHECKPOINTS','PERFORMANCE','PERFORMANCE_BUDGET','RUNTIME_STABILITY','ERROR_RECOVERY'])
  };
  const instructions={
    CORE_FUN:`${anchor}가 단순 반복 입력이 아니라 상황을 읽고 선택을 바꾸는 핵심 재미가 되게 한다. 같은 선택의 반복 이득을 줄이고 성공/실패 이유가 즉시 보이게 한다.`,
    COMBAT_OR_PRIMARY_INTERACTION:`${anchor}의 입력→전조/준비→판정→결과→회복 흐름을 실제 상태 머신에 연결하고 타이밍·거리·위험/보상 중 게임에 맞는 최소 두 축에서 선택 차이를 만든다.`,
    PLAYER_ACTIONS:`플레이어의 주요 행동마다 사용 조건, 취소/실패 조건, 상태 변화, 쿨다운 또는 후딜, 화면/음향 피드백을 일관되게 연결하고 무의미한 중복 행동은 정리한다.`,
    ENEMY_AI:`적 역할이 이동·타깃 선택·공격 전조·공격 패턴·후퇴/회복 또는 특수상태에서 구별되게 하고 ${anchor}에 대한 카운터플레이가 실제 플레이에서 가능하게 한다.`,
    BOSS_AND_SIGNATURE_MOMENTS:`${identity}의 보스/시그니처 순간은 일반 적의 체력만 키운 형태를 금지하고 단계 변화, 공간 압박, 전조, 대응 선택, 보상 연출을 핵심 시스템 ${secondary}와 연결한다.`,
    PROGRESSION:`${progression}을 짧은 목표→보상→해금→새 선택→다음 난도로 연결하고 성장 수치만 오르는 대신 플레이 방식이 실제로 넓어지게 한다.`,
    GOALS:`현재 목표·다음 목표·실패 조건을 플레이 중 확인 가능하게 하고, 목표가 ${anchor}와 직접 연결되어 플레이어가 왜 행동하는지 분명하게 한다.`,
    REWARDS:`보상은 행동 난도·위험·시간·희소성과 연결하고, 획득 순간의 상태 변화와 피드백을 명확히 하며 다음 선택에 실제 영향을 주게 한다.`,
    UNLOCKS:`해금은 새 시스템/지역/행동/조합 중 의미 있는 선택을 열어야 하며 단순 아이콘 공개나 숫자 증가만으로 해금 완료를 주장하지 않는다.`,
    QUESTS:`퀘스트가 적용되는 게임이면 목표·진행 추적·완료 판정·보상·세계/캐릭터 반응까지 연결하고, 핵심 루프와 무관한 심부름 반복을 줄인다.`,
    CONTENT_VARIETY:`콘텐츠 변형은 이름/색/수치 복제 대신 행동 규칙·공간·자원·적 조합·진행 조건 중 최소 한 축을 바꾸어 새로운 판단을 만들게 한다.`,
    WORLD_MAP_TOPOLOGY:`월드 구조는 시작점·안전/위험 구역·주요 동선·우회 경로·보상 지점·잠금/해금 연결을 읽을 수 있게 하고 막다른 빈 공간을 줄인다.`,
    REGIONS:`지역마다 지형, 적/상호작용, 자원, 위험, 조명/색, 이동 방식 중 여러 축이 달라 실제 플레이 역할이 구별되게 한다.`,
    LANDMARKS:`주요 랜드마크는 거리에서도 실루엣과 기능이 구별되고 탐색·방향 판단·목표 기억에 쓰이도록 배치하며 단순 장식물로 끝내지 않는다.`,
    TRAVERSAL:`이동은 속도만이 아니라 지형·장애물·경로 선택·위험 회피와 연결하고 모바일 입력에서 의도한 방향/행동이 안정적으로 유지되게 한다.`,
    ECONOMY:`재화의 획득원·사용처·가격 단계·손실/회수 규칙을 ${progression}과 연결하고 무한 축적 또는 의미 없는 구매가 생기지 않게 한다. 승인 없는 기존 수치 변경은 금지한다.`,
    INVENTORY:`인벤토리는 획득·정렬/표시·장착/사용·교체·버리기/보존 상태를 명확히 하고 실제 캐릭터/전투/진행 상태와 동기화한다.`,
    CRAFTING:`제작이 적용되는 게임이면 재료 발견→레시피 이해→제작 조건→대기/완료→인벤토리 반영→실제 사용까지 끊김 없이 연결하고 중복 레시피를 줄인다.`,
    SAVE_AND_RECOVERY:`세이브는 기존 키/의미를 보존하면서 진행·장비·해금 등 승인된 상태가 재접속 후 정확히 복구되고 중간 실패 시 안전한 fallback을 갖게 한다.`,
    MULTIPLAYER_AND_SYNC:`멀티가 적용되는 게임이면 authoritative state, 참가/이탈, 핵심 행동 동기화, 재접속/late join, 승패/보상 일관성을 실제 2인 이상 흐름에 맞춘다.`,
    INPUT:`핵심 행동마다 터치 우선 입력과 키보드/패드 대체 입력을 동일 게임 상태에 연결하고 중복 입력·길게 누름·드래그·취소 경계를 명확히 한다.`,
    MOBILE_UX:`작은 화면에서 핵심 HUD·조작·위험 경고·선택지가 손가락과 겹치지 않게 하고 safe area, 스크롤, 팝업 닫기, 가로/세로 대응을 실제 플레이 기준으로 정리한다.`,
    ACCESSIBILITY:`색만으로 상태를 구분하지 않고 형태/아이콘/텍스트/모션을 함께 쓰며, 중요한 피드백은 크기·대비·지속시간을 확보해 정보 누락을 줄인다.`,
    TUTORIAL_ONBOARDING:`첫 플레이에서 ${anchor}의 핵심 입력→결과→다음 목표를 실제 행동으로 학습시키고, 설명문만 읽는 튜토리얼보다 단계적 실습·즉시 피드백·도움말 회수를 연결한다.`,
    DIFFICULTY_PACING:`초반 진입, 중반 선택 압박, 후반 숙련 요구가 갑자기 튀지 않게 적/자원/목표/보상의 복잡도를 단계적으로 올리고 실패 원인이 학습 가능한 형태로 보이게 한다.`,
    GAME_FEEL:`핵심 입력의 반응 지연, anticipation, impact, hit-stop/반동/화면 반응, recovery를 장르와 ${anchor}에 맞춰 조정해 버튼 입력과 결과 사이의 손맛을 강화한다.`,
    SPAWN_ENCOUNTER_DIRECTOR:`적·자원·이벤트·조우의 생성 위치/빈도/조합/안전거리/재생성 규칙을 지역 역할과 난이도에 맞추고 불공정한 즉시 피격·과밀·공백을 줄인다.`,
    FAILURE_RESPAWN_CHECKPOINTS:`사망/실패/런 종료 시 손실·보존·체크포인트·리스폰 위치·재시작 시간을 명확히 하고 실패 후 다시 핵심 재미로 돌아가는 시간을 최소화한다.`,
    NPC_SOCIAL_BEHAVIOR:`NPC가 적용되는 게임이면 idle 순환뿐 아니라 이동 목적, 상호작용 반응, 시간/지역/퀘스트 상태에 따른 행동 변화가 세계 역할과 연결되게 한다.`,
    NARRATIVE_STORY:`스토리가 적용되는 게임이면 세계 설정·NPC 대사·환경 단서·퀘스트 결과가 서로 모순되지 않고 플레이 행동으로 드러나며 긴 설명이 핵심 루프를 끊지 않게 한다.`,
    AUDIO_MUSIC_SFX:`배경음악은 지역/상태/전투 강도 전환과 연결하고, 핵심 행동·위험 전조·피격·보상·UI SFX를 서로 구별해 화면을 보지 않아도 중요한 사건을 인지할 수 있게 한다.`,
    REPLAYABILITY_VARIATION:`반복 플레이가 적용되는 게임이면 조우 조합·지역 경로·보상 선택·빌드/전략·이벤트 중 게임에 맞는 변주를 제공해 같은 정답만 반복되지 않게 한다.`,
    PLAYER_AGENCY:`핵심 루프에서 최소 두 개 이상의 의미 있는 선택축을 유지하고 하나의 정답 버튼 반복보다 상황·자원·위험에 따라 선택이 달라지게 한다.`,
    ANTI_GRIND:`같은 행동을 반복해서 숫자만 채우는 구간을 줄이고 반복이 필요하면 새로운 위험·조합·선택·단축 해금 중 하나가 주기적으로 생기게 한다.`,
    CONTENT_DENSITY:`플레이 시간과 이동 거리에 비해 실제 상호작용·조우·보상·발견이 비는 구간을 줄이고 새 콘텐츠가 서로 다른 플레이 결정을 만들게 한다.`,
    CONTENT_DISCOVERY:`새 지역·아이템·시스템·퀘스트가 해금됐을 때 플레이어가 존재와 접근 방법을 자연스럽게 발견하도록 세계 신호·UI·목표·상호작용을 연결한다.`,
    MID_LATE_GAME_DEPTH:`중후반은 초반 수치 상승 반복이 아니라 새 지역·적 역할·장비 조합·시스템 연결·전략 전환 중 여러 축에서 플레이 깊이가 실제로 확장되게 한다.`,
    MAP_EXPANSION:`맵 확장은 면적만 늘리지 말고 새 지역 역할, 연결 경로, 잠금/해금, 랜드마크, 자원·적·이벤트 차이와 기존 지역으로 돌아올 이유를 함께 설계한다.`,
    WORLD_DENSITY:`넓은 공간이 비지 않게 탐색 거리마다 기능성 소품·상호작용·조우·자원·환경 이야기 중 게임에 맞는 요소를 배치하고 반복 복제 밀도를 줄인다.`,
    WORLD_NAVIGATION:`지도/미니맵/방향 표식/랜드마크/목표 추적 중 게임에 맞는 수단으로 현재 위치·목적지·잠금 경로를 읽게 하며 모바일에서도 길을 잃는 비용을 줄인다.`,
    INTERACTION_DISCOVERABILITY:`줍기·열기·대화·제작·장착·구매·사용 가능한 대상은 접근 전후에 형태/프롬프트/상태 피드백으로 구별되고 상호작용 실패 이유도 즉시 보이게 한다.`,
    INVENTORY_USABILITY:`인벤토리의 획득·스택·정렬·선택·사용·장착·교체·버리기/보존·가득 참 처리를 모바일 터치에서 끊김 없이 연결하고 현재 장착 상태를 명확히 표시한다.`,
    EQUIPMENT_LOADOUT:`장비/무기 슬롯, 교체, 비교, 장착 표시, 캐릭터 외형/스탯/행동 반영이 같은 authoritative 장착 상태를 사용하도록 연결한다.`,
    SYSTEM_CONNECTION:`드랍→인벤토리→제작/장착→전투/탐색→보상/해금처럼 현재 게임의 주요 시스템들이 실제 상태를 주고받게 하고 서로 고립된 메뉴 기능을 줄인다.`,
    SESSION_FLOW:`접속→첫 행동→핵심 재미→보상→업그레이드/선택→새 목표→실패/성공→저장/종료가 막힘 없이 한 세션으로 이어지고 할 일이 사라지는 공백을 줄인다.`,
    FIRST_10_MINUTES:`첫 10분 안에 이동/기본 입력, 핵심 상호작용, 첫 성공 피드백, 첫 보상 또는 성장, 다음 목표를 실제 플레이로 경험하게 하고 설명문만으로 대체하지 않는다.`,
    SAVE_COMPLETENESS:`현재 게임에서 저장돼야 하는 진행·인벤토리·장비·해금·퀘스트·발견 지역·설정 상태를 기존 save 의미를 깨지 않고 재접속 후 일관되게 복구한다.`,
    RECONNECT_RECOVERY:`재접속/late join/일시 네트워크 실패 시 권위 상태를 다시 동기화하고 중복 보상·장비 유실·퀘스트 되감기 없이 안전한 복구 경로를 제공한다.`,
    SETTINGS_ACCESSIBILITY:`음량·카메라/흔들림·감도·UI 크기/가독성 등 현재 게임에 필요한 설정을 접근 가능한 메뉴에 두고 설정 변경이 즉시 반영·저장되게 한다.`,
    MENU_FLOW:`인벤토리·장비·제작·상점·퀘스트·설정 등 존재하는 메뉴 사이 전환, 뒤로가기, 닫기, 팝업 중첩, 스크롤, 선택 유지가 모바일에서 예측 가능하게 동작하게 한다.`,
    CONVENIENCE:`반복 조작을 줄일 수 있는 빠른 사용/장착, 제작 가능 표시, 부족 재료 표시, 목표 추적, 비교 정보 등 현재 게임에 맞는 편의 기능을 추가하되 플레이 선택 자체를 자동화하지 않는다.`,
    UI_DESIGN_SYSTEM:`HUD와 메뉴가 공통 타이포·패널·아이콘·간격·상태 색/형태 규칙을 공유하고 게임 세계의 아트 언어와 연결되며 기능마다 제각각인 임시 UI를 줄인다.`,
    UI_INFORMATION_PRIORITY:`현재 목표, 생존/위험, 핵심 자원, 장비/쿨다운, 다음 행동 순으로 실제 플레이 중요도에 맞게 정보 위계를 정하고 작은 화면에서 비핵심 정보가 핵심 HUD를 밀어내지 않게 한다.`,
    FEEDBACK_CLARITY:`획득·구매·제작·장착·레벨업·퀘스트·실패·사용 불가 등 중요한 상태 변화에 즉시 읽히는 UI/음향/시각 피드백과 실패 이유를 연결한다.`,
    PERFORMANCE_BUDGET:`맵·에셋·NPC·VFX를 늘릴 때 객체 수명, 동시 NPC/파티클, 업데이트 빈도, 스트리밍/LOD, 메모리·모바일 프레임 예산을 함께 정의하고 초과 시 표현 비용부터 줄인다.`,
    CHARACTER_VISUALS:`${identity} 플레이어/NPC의 역할·등급·장비가 실루엣, 비율, 자세, 재질에서 구별되고 핵심 행동 모션과 연결되게 한다.`,
    ENEMY_VISUALS:`적 종류와 위험도가 색상만이 아니라 실루엣·크기·이동 리듬·공격 전조·피격/사망 반응으로 구별되게 한다.`,
    WEAPONS_AND_EQUIPMENT:`무기/장비 외형이 실제 기능·사거리·무게감·공격 궤적·장착 상태와 맞고 플레이어 손/몸에 자연스럽게 연결되게 한다.`,
    BUILDINGS_AND_PROPS:`건물·상호작용 오브젝트·장식물은 기능과 상태가 형태/배치/재질로 구별되고 플레이 동선과 충돌하지 않게 한다.`,
    ENVIRONMENT:`전경/중경/배경, 식생/소품, 위험/안전 신호, 환경 스토리텔링을 ${identity} 아트 방향 안에서 통일하고 빈 장식면을 줄인다.`,
    TERRAIN:`지형 높낮이·경계·통로·전투/상호작용 공간이 플레이 기능과 맞고 반복 평면/단일 primitive 위주 구성을 실제 지형 형태로 교체한다.`,
    MATERIALS:`재질은 이름 등록이 아니라 거칠기·광택·마모·투명/발광·빛 반응이 표면 역할과 맞게 실제 렌더에 적용되도록 한다.`,
    PALETTE:`팔레트는 지역/진영/위험/보상/상호작용 상태를 구분하면서 전체 게임 정체성을 유지하고 단순 색상 교체만으로 개선 완료를 주장하지 않는다.`,
    LIGHTING:`조명은 시간/분위기뿐 아니라 플레이 동선, 적 전조, 상호작용 대상, 랜드마크 가독성을 지원하고 캐릭터 실루엣을 배경에서 분리한다.`,
    ANIMATION:`주요 캐릭터/적 행동을 idle→locomotion→anticipation→impact→recovery→hit/death 상태와 실제 게임 이벤트에 연결하고 정지 모델 판정을 금지한다.`,
    SECONDARY_MOTION:`장비·의상·머리·꼬리·식생·기계 등 적합한 요소에 지연/관성/반동을 추가해 무게감과 생동감을 주되 판정/권한은 바꾸지 않는다.`,
    VFX:`일반 타격, 강공격, 위험 전조, 상태이상, 보상, 보스/시그니처 이벤트의 VFX 형태·강도·지속시간을 분리하고 실제 상태 변화 시점에 동기화한다.`,
    CAMERA:`기본 시야·FOV·추적을 모바일 가독성에 맞추고 강한 타격/대시/보스/탐색 포인트에 짧고 단계적인 카메라 반응을 적용해 멀미와 과도한 흔들림을 피한다.`,
    UI_HUD:`HUD는 현재 목표·체력/위험·핵심 자원·쿨다운/상태·다음 선택의 우선순위를 명확히 하고 게임 아트 언어와 일치하는 패널/아이콘/상태 피드백을 사용한다.`,
    AUDIO_VISUAL_TIMING:`핵심 action의 animation impact, damage/state change, VFX, camera, audio가 같은 사건 타임라인에 맞게 발생하도록 오프셋을 정리한다.`,
    ENVIRONMENTAL_MOTION:`세계에 맞는 바람/식생/물/빛/먼지/기계 등 미세 환경 움직임을 추가해 정적인 무대를 피하되 플레이 정보와 성능을 방해하지 않는다.`,
    PERFORMANCE:`실제 병목 근거를 기준으로 update/tick 빈도, 객체/파티클 수명, draw/instance 수, GC/할당, 네트워크 빈도, 모바일 열/메모리 비용을 줄인다.`,
    RUNTIME_STABILITY:`핵심 루프를 반복 실행해도 상태 누수·중복 이벤트·고착·크래시 없이 시작→플레이→실패/성공→재시작/복귀가 유지되게 한다.`,
    ERROR_RECOVERY:`재현된 오류는 숨기지 말고 책임 시스템에서 원인을 제거하고 실패 시 안전한 복구/재시도/사용자 피드백 경로를 제공한다.`
  };
  return states.map(state=>{
    const notApplicable=state.state==='NOT_APPLICABLE';
    const focusMatch=focusDomains[focus]?.has(state.domain)===true;
    const priority=notApplicable?'NOT_APPLICABLE':state.state==='GAP'?'FIX_NOW':focusMatch?'BUILD_UP_NOW':'MONITOR_OR_CONNECT';
    const directive=notApplicable
      ?`현재 승인 설계상 ${state.reason}. 새 설계 근거가 생기기 전에는 억지로 기능을 추가하지 않는다.`
      :instructions[state.domain]||`${identity}의 ${state.domain} 영역을 ${anchor}와 연결해 실제 플레이 변화가 생기도록 심화한다.`;
    return Object.freeze({
      domain:state.domain,
      state:state.state,
      priority,
      developmentDepth:depth,
      directive,
      implementationContract:'WHAT→TRIGGER/CONDITION→STATE_CHANGE→PLAYER_FEEDBACK→SYSTEM_CONNECTION→OBSERVABLE_ACCEPTANCE',
      acceptance:notApplicable?'DESIGN_EVIDENCE_REQUIRED_BEFORE_ACTIVATION':'REAL_GAME_SOURCE_AND_RUNTIME_OR_PLAY_EVIDENCE_REQUIRED'
    });
  });
}

function buildVisualDirective({gameId,design,source,focus}){
  const identity=design.identity||gameId;
  const anchor=primaryDesignAnchor(design);
  const second=secondaryDesignAnchor(design);
  const placeholderHeavy=Number(source?.signals?.primitive||0)>8;
  return{
    artDirection:{
      identity,
      visualPurpose:`${identity}의 플레이 판단과 ${anchor}가 화면만 보고도 구별되도록 시각 언어를 통일한다.`,
      distinctnessRule:`${second}와 연결되지 않는 장식 추가보다 실루엣·동작·환경 맥락으로 게임 고유성을 강화한다.`,
      placeholderDebt:placeholderHeavy?'HIGH':'EVALUATE_AND_REPLACE_WHEN_VISIBLE'
    },
    domains:{
      CHARACTER:`${identity} 플레이어의 역할이 실루엣·장비·자세에서 읽히게 만들고 idle/이동/핵심행동 사이 포즈 차이를 명확히 한다.`,
      ENEMY_CREATURE:`${anchor}의 상대 역할마다 색만 바꾸지 말고 크기·실루엣·이동 리듬·공격 전조·피격/사망 반응을 다르게 만든다.`,
      WEAPON_EQUIPMENT:`장비가 실제 기능과 연결되어 손에 쥔 형태, 공격 궤적, impact/recovery, 장착 피드백이 서로 일치하게 만든다.`,
      BUILDING_PROP:`상호작용 가능한 구조물과 장식물을 형태·배치·상태 변화로 구분하고 플레이 동선을 가리는 무의미한 소품 반복을 피한다.`,
      ENVIRONMENT_TERRAIN:`${identity}의 세계 역할을 지역별 지형·랜드마크·전경/중경/후경·높낮이·환경 움직임으로 구분한다.`,
      MATERIAL_SURFACE:`나무/돌/금속 등 이름 등록만 하지 말고 실제 표면 반응·거칠기·광택·마모·발광을 장면 조명과 맞춘다.`,
      PALETTE:`위험·안전·보상·상호작용 상태가 게임 팔레트 안에서 즉시 읽히게 하고 단순 색 교체를 정체성 개선으로 계산하지 않는다.`,
      LIGHTING:`핵심 동선·위험·랜드마크를 조명으로 유도하고 캐릭터와 적 실루엣이 배경에 묻히지 않게 한다.`,
      ANIMATION:`주요 액션을 ANTICIPATION→ACCELERATION→IMPACT→RECOVERY로 구성하고 idle/walk/run/attack/hit/death 전환을 실제 상태에 연결한다.`,
      SECONDARY_MOTION:`무기·장비·머리·의상·식생 등 해당 오브젝트에 지연/흔들림을 추가하되 판정과 충돌 권한은 바꾸지 않는다.`,
      VFX:`일반 타격·강한 타격·위험 예고·상태이상·보상 VFX의 형태와 타이밍을 분리하고 실제 impact 이벤트에 동기화한다.`,
      CAMERA:`기본 시야와 모바일 가독성을 보존하면서 핵심행동·강공격·보스/시그니처 순간에 강도가 다른 짧은 카메라 반응을 준다.`,
      UI_HUD:`${identity}의 핵심 목표·자원·위험·다음 선택이 한눈에 보이게 하고 게임 세계관과 맞는 패널/아이콘/피드백 언어를 사용한다.`,
      AUDIO_VISUAL_SYNC:`damage/VFX/animation/camera/audio가 같은 impact 순간을 공유하게 하며 소리만 먼저/늦게 나오는 불일치를 제거한다.`,
      ENVIRONMENTAL_MOTION:`정적인 배경을 피하고 식생·빛·파티클·기계/건축 요소 중 세계에 맞는 미세 움직임을 지속시킨다.`,
      SCENE_DENSITY:`빈 공간과 반복 오브젝트 밀도를 실제 플레이 동선 기준으로 조정하고 중요 영역에는 의미 있는 시각 정보가 있게 한다.`,
      LANDMARK_READABILITY:`플레이어가 지도 없이도 방향과 지역 역할을 기억할 수 있는 실루엣이 다른 랜드마크를 유지·강화한다.`
    },
    requiredActorStates:['IDLE','LOCOMOTION','ATTACK_ANTICIPATION','IMPACT','RECOVERY','HIT_REACTION','DEATH'],
    completionRules:[
      'ACTUAL_RENDERED_CHANGE_REQUIRED',
      'MARKER_CONFIG_ATOM_ONLY_FORBIDDEN',
      'COLOR_ONLY_NOT_FULL_IDENTITY_UPGRADE',
      'PRIMARY_PLACEHOLDER_PRIMITIVE_CANNOT_CLOSE_VISUAL_BUILD_UP',
      'BEFORE_AFTER_COMPARISON_REQUIRED'
    ],
    focus
  };
}

function platformDirectives({identity,goal}){
  return{
    UNITY_WEB:`${identity}: 동일 공통 목표 "${goal}"를 canonical unity-games 소스에 구현하고 WebGL/브라우저 터치/카메라/렌더 비용을 맞춘다. 별도 Web 게임 코드베이스를 만들지 않는다.`,
    ROBLOX:`${identity}: 동일 공통 목표 "${goal}"를 Roblox 네이티브 Luau/server-client/Remote/touch/3D presentation 구조로 번역한다. Unity/Web 구현을 그대로 복사하지 않는다.`,
    UNITY_APP:`${identity}: 동일 공통 목표 "${goal}"를 Unity 앱 네이티브 입력/렌더링/모바일 성능/빌드 구조로 구현한다. Unity Web과 게임 의미는 같되 플랫폼 표현은 네이티브로 최적화한다.`
  };
}

export function directivePrompt(d={}){
  if(!d?.directiveId)return'';
  const visual=Object.entries(d.visualBuildUpDirective?.domains||{}).map(([k,v])=>`- ${k}: ${v}`).join('\n');
  const domainPriority=(d.allDomainImplementationDirectives||[]).filter(row=>['FIX_NOW','BUILD_UP_NOW'].includes(row.priority)).slice(0,28).map(row=>`- ${row.domain}[${row.priority}]: ${row.directive}`).join('\n');
  const holistic=(d.allDomainImplementationDirectives||[]).filter(row=>HOLISTIC_CORE_DOMAINS.includes(row.domain)).map(row=>`- ${row.domain}=${row.state}/${row.priority}`).join('\n');
  const anchors=(d.responsibleSystemsAndFiles?.sourceAnchors||[]).slice(0,8).map(row=>`- ${row.file}:${row.line||'?'} ${row.kind||'SYMBOL'} ${row.symbol||'UNKNOWN'} | CURRENT=${row.currentBehavior||row.context||'UNKNOWN'} | INTENDED=${row.intendedBehavior||'FOLLOW_PRIMARY_GOAL'} | ACCEPT=${row.observableAcceptance||'REAL_SOURCE_AND_EFFECT_DELTA'}`).join('\n');
  return[
    '[GAME_SPECIFIC_BUILD_UP_DIRECTIVE]',
    `id=${d.directiveId}; generation=${d.generation}; depth=${d.developmentDepth}; stage=${d.escalationStage}; focus=${d.primaryFocus}`,
    `GAME_IDENTITY: ${d.gameIdentityAndNonNegotiables.identity}`,
    `PRIMARY_GOAL: ${d.thisLoopPrimaryGoal}`,
    `WHY_NOW: ${d.primaryGoalReason}`,
    'SOURCE_ANCHORS:',
    anchors||'- exact symbol unavailable; use exact responsible file plus observed runtime/state anchor',
    `EXPECTED_PLAYER_EFFECT: ${d.effectivenessMeasurement?.expectedPlayerEffect||'UNKNOWN'}`,
    `PREVIOUS_EFFECT: ${d.effectivenessMeasurement?.previousGeneration?.classification||'NO_PREVIOUS_GENERATION'} - ${d.effectivenessMeasurement?.previousGeneration?.reason||''}`,
    `NEXT_VIBE_ACTION: ${d.nextActionDecision?.action||'CONTINUE_BUILD_UP_CURRENT_SYSTEM'} - ${d.nextActionDecision?.reason||''}`,
    `GAMEPLAY: ${d.gameplayImplementationDirectives.join(' | ')}`,
    `PROGRESSION_WORLD: ${d.progressionContentWorldDirectives.join(' | ')}`,
    'HOLISTIC_CORE_DOMAIN_STATUS:',
    holistic,
    'PRIORITY_DOMAIN_DIRECTIVES:',
    domainPriority,
    'VISUAL:',
    visual,
    `UX_INPUT: ${d.uxInputDirectives.join(' | ')}`,
    d.robloxNativeExecution?`ROBLOX_NATIVE_RESPONSIBLE_FILES: ${(d.robloxNativeExecution.responsibleFiles||[]).join(' | ')||'CURRENT_ALLOWED_ROBLOX_FILES'}`:'',
    d.robloxNativeExecution?`ROBLOX_NATIVE_SERVER_CLIENT: ${(d.robloxNativeExecution.serverClientResponsibility||[]).map(row=>row.file+':'+row.symbol+':'+row.role).join(' | ')}`:'',
    d.robloxNativeExecution?`ROBLOX_NATIVE_FUNCTIONAL_ACCEPTANCE: ${d.robloxNativeExecution.observableAcceptanceScenario}`:'',
    d.robloxNativeExecution?`ROBLOX_NATIVE_SOURCE_INSPECTION: ${(d.robloxNativeExecution.sourceInspectionChecklist||[]).join(',')}`:'',
    d.robloxNativeExecution?`ROBLOX_NATIVE_CODE_QUALITY: ${(d.robloxNativeExecution.codeQualityChecks||[]).join(',')}`:'',
    `PRESERVE: ${d.preserveConstraints.join(' | ')}`,
    `ACCEPTANCE: ${d.acceptanceEvidence.join(' | ')}`,
    `NEXT_ESCALATION: ${d.nextEscalationCandidates.join(' | ')}`
  ].join('\n');
}

export function buildGameSpecificBuildUpDirective({
  gameId='',gameName='',platform='COMMON',designRecord={},sourceObservation=null,repoRoot=process.cwd(),sourceRoot='',
  previousDirective=null,previousDirectiveOutcome='',runtimeEvidence={},qualitySignals=[],responsibleFiles=[]
}={}){
  const id=clean(gameId);if(!id)throw new Error('BUILD_UP_GAME_ID_REQUIRED');
  const design=extractDesignContext(designRecord||{});
  const source=sourceObservation||inspectGameSource({repoRoot,sourceRoot});
  const signals=uniq([
    ...qualitySignals,
    ...(source?.observations||[]),
    ...(Array.isArray(runtimeEvidence?.blockers)?runtimeEvidence.blockers:[]),
    clean(runtimeEvidence?.failureSignature),
    clean(runtimeEvidence?.playtestFinding),
    clean(runtimeEvidence?.qualityGap)
  ]);
  const preferred=focusFromSignals({signals,source});
  const generation=Math.max(1,Number(previousDirective?.generation||0)+1);
  const rawDepthInfo=escalationDepthInfo({previousDirective,previousOutcome:previousDirectiveOutcome,currentSourceTreeFingerprint:source.sourceTreeFingerprint});
  const previousEffectiveness=classifyPreviousEffectiveness({previousDirective,previousOutcome:previousDirectiveOutcome,depthInfo:rawDepthInfo,runtimeEvidence});
  const effectAdvanceAllowed=clean(previousEffectiveness?.classification).toUpperCase()==='EFFECT_CONFIRMED';
  const retainedDepth=previousDirective?Math.max(1,Number(previousDirective?.developmentDepth||1)):Math.max(1,Number(rawDepthInfo.developmentDepth||1));
  const depthInfo=Object.freeze({
    ...rawDepthInfo,
    developmentDepth:rawDepthInfo.advanceAllowed&&effectAdvanceAllowed?rawDepthInfo.developmentDepth:retainedDepth,
    escalationStage:depthStage(rawDepthInfo.advanceAllowed&&effectAdvanceAllowed?rawDepthInfo.developmentDepth:retainedDepth),
    escalationMode:rawDepthInfo.advanceAllowed&&!effectAdvanceAllowed?'VERIFIED_SOURCE_DELTA_AWAITING_EFFECT':rawDepthInfo.escalationMode,
    verifiedEvolution:rawDepthInfo.verifiedEvolution&&effectAdvanceAllowed,
    advanceAllowed:rawDepthInfo.advanceAllowed&&effectAdvanceAllowed,
    sourceDeltaVerifiedButEffectPending:rawDepthInfo.advanceAllowed&&!effectAdvanceAllowed
  });
  const priorFocus=clean(previousDirective?.primaryFocus).toUpperCase();
  const previousEffectClass=clean(previousEffectiveness?.classification).toUpperCase();
  const keepPriorFocus=Boolean(previousDirective&&priorFocus&&['NO_MEANINGFUL_EFFECT','PARTIAL_EFFECT','REGRESSION','UNKNOWN_RUNTIME_EFFECT'].includes(previousEffectClass));
  const focus=keepPriorFocus?priorFocus:previousDirective&&!depthInfo.advanceAllowed&&priorFocus?priorFocus:nextFocus({preferred,previous:previousDirective||{}});
  const anchor=primaryDesignAnchor(design),secondary=secondaryDesignAnchor(design);
  const identity=design.identity||clean(gameName)||id;
  const goalByFocus={
    CORE_FUN:`${identity}의 ${anchor}를 입력→판단→상태 변화→피드백→다음 선택까지 실제 플레이에서 더 깊고 명확하게 만든다.`,
    PROGRESSION:`${identity}의 ${design.progressionDirection||secondary}가 짧은 목표·보상·해금·다음 선택으로 실제 플레이에 연결되도록 깊이를 높인다.`,
    PRESENTATION:`${identity}의 ${anchor}와 ${secondary}가 캐릭터·적·환경·모션·VFX·카메라·UI 전체에서 한눈에 구별되도록 비주얼 정체성을 높인다.`,
    USABILITY:`${identity}의 핵심 행동과 다음 목표를 모바일에서도 즉시 이해하고 실수 없이 조작할 수 있도록 입력·HUD·피드백 흐름을 다듬는다.`,
    STABILITY:`${identity}의 현재 실패 근거를 원인 시스템에서 제거하고 핵심 루프·저장·복구가 같은 상태에서 반복 가능하게 만든다.`
  };
  const goal=goalByFocus[focus]||goalByFocus.CORE_FUN;
  const previousFingerprint=clean(previousDirective?.directiveFingerprint);
  const fingerprint=sha(JSON.stringify({id,generation,focus,goal,source:source.sourceTreeFingerprint,design,previousDirectiveOutcome:clean(previousDirectiveOutcome),previousEffectiveness,qualitySignals:signals,runtimeEvidence}));
  const states=BUILD_UP_DOMAINS.map(domain=>domainState(domain,{design,source}));
  const gaps=states.filter(x=>x.state==='GAP');
  const allDomainImplementationDirectives=buildAllDomainDirectives({states,design,focus,depthInfo});
  const topFiles=uniq([...(responsibleFiles||[]),...(source?.topFiles||[]).map(x=>x.file)]).slice(0,16);
  const primarySourceAnchors=selectPrimarySourceAnchors(source,responsibleFiles,8);
  const exactAnchorLabel=primarySourceAnchors.length?primarySourceAnchors.map(row=>row.file+'::'+row.symbol).join(', '):(topFiles[0]||'CURRENT_GAME_SOURCE');
  const expectedEffect=expectedPlayerEffect({focus,identity,anchor,secondary});
  const sourceResponsibilities=primarySourceAnchors.map(row=>Object.freeze({
    ...row,
    currentBehavior:clean(row.context)||`현재 ${row.kind||'SYMBOL'} ${row.symbol||'UNKNOWN'} 구현을 소스에서 관찰함`,
    intendedBehavior:`${focus} primary goal "${goal}"에 맞춰 ${row.symbol||'이 책임 영역'}의 입력/조건→상태 변화→피드백 연결을 직접 심화하고, 플레이어 관찰 결과가 "${expectedEffect}"가 되게 한다.`,
    whyThisAnchor:`${row.file}::${row.symbol||'UNKNOWN'}이 현재 소스에서 primary goal과 직접 연결된 책임 앵커로 선택됨`,
    observableAcceptance:`${row.file}에 실제 source delta가 있고 관련 QA/runtime에서 ${focus} 상태 변화와 expected player effect가 관찰되어야 함`
  }));
  const robloxNativeExecution=Object.freeze({
    version:1,
    required:true,
    responsibleFiles:topFiles.filter(file=>/roblox-games\/|\.lua[u]?$/i.test(file)),
    sourceSymbolsOrStateAnchors:sourceResponsibilities.map(row=>Object.freeze({
      file:row.file,
      line:row.line||null,
      kind:row.kind||'SYMBOL',
      symbol:row.symbol||'UNKNOWN',
      currentBehavior:row.currentBehavior,
      intendedBehavior:row.intendedBehavior,
      observableAcceptance:row.observableAcceptance
    })),
    serverClientResponsibility:sourceResponsibilities.map(row=>Object.freeze({
      file:row.file,
      symbol:row.symbol||'UNKNOWN',
      role:/(?:^|\/)server\/|\.server\.lua[u]?$/i.test(row.file)?'SERVER_AUTHORITY'
        :/(?:^|\/)client\/|\.client\.lua[u]?$/i.test(row.file)?'CLIENT_INPUT_OR_PRESENTATION'
        :'SHARED_MODULE_OR_STATE',
      authorityRule:'damage/reward/currency/inventory/progression/save authoritative mutation remains server-owned when applicable'
    })),
    expectedPlayerEffect:expectedEffect,
    observableAcceptanceScenario:'input/touch -> local handler -> RemoteEvent/RemoteFunction when required -> server validation -> authoritative state change -> client feedback',
    sourceInspectionChecklist:[
      'SERVER_AUTHORITY','CLIENT_PRESENTATION','REMOTE_EVENTS_AND_FUNCTIONS','TOUCH_INPUT','CHARACTER_RESPAWN',
      'DATASTORE_SAVE_LOAD','UI_STATE','CORE_STATE_MACHINE','MULTIPLAYER_SYNC'
    ],
    codeQualityChecks:[
      'NO_UNBOUNDED_WHILE_LOOP','NO_LEAKED_CONNECTIONS','NO_DUPLICATE_REMOTE_PATH',
      'NO_CLIENT_AUTHORITATIVE_GAMEPLAY_MUTATION','BOUNDED_DATASTORE_RETRY','REMOTE_INPUT_VALIDATION',
      'NO_STALE_CHARACTER_REFERENCE_AFTER_RESPAWN'
    ],
    implementationRule:'read existing Roblox responsibilities first; modify the existing responsible function/module directly; do not translate Unity/Web code literally',
    actualPlayRule:'after the changed behavior becomes executable and the existing runtime-foundation gate passes, replay the exact changed scenario through official Studio MCP and feed the observed result back into causal repair'
  });
  const nextActionDecision=decideNextVibeAction({previousEffectiveness,previousOutcome:previousDirectiveOutcome,focus});
  const systemNames=design.signatureSystems.map(x=>x.name).filter(Boolean);
  const gameplay=[
    `우선 책임 소스 앵커 ${exactAnchorLabel}에서 현재 행동→상태 변화→피드백 연결을 직접 수정하고 wrapper나 우회 경로를 추가하지 않는다.`,
    `${anchor}를 설명/마커가 아니라 실제 authoritative game state와 플레이어 입력에 연결하고 성공·실패·재시도 경로를 완성한다.`,
    `${secondary}가 다음 선택을 바꾸도록 상태 변화와 피드백을 연결한다.`,
    systemNames.length?`고유 시스템 ${systemNames.join(', ')} 중 이번 목표와 직접 연결된 시스템을 기존 책임 코드에서 심화한다.`:'현재 핵심 루프의 가장 얕은 책임 시스템을 기존 코드에서 직접 심화한다.',
    focus==='CORE_FUN'?'주요 적/대상/상호작용이 행동·타이밍·카운터플레이 중 최소 두 축에서 구별되게 한다.':'핵심 게임플레이 의미는 보존하면서 이번 품질축에 필요한 연결만 수정한다.'
  ];
  const progression=[
    `${design.progressionDirection||'승인된 진행 방향'}을 현재 루프의 실제 목표·보상·해금·콘텐츠 연결로 구현/심화한다.`,
    '새 콘텐츠는 기존 핵심 루프와 연결되어야 하며 단순 수량 복제나 색/수치만 다른 변형으로 채우지 않는다.',
    '맵/지역이 있는 게임은 면적만 늘리지 말고 새 지역 역할·연결 경로·잠금/해금·랜드마크·조우/자원 역할·발견 피드백이 구별되도록 확장한다.',
    '인벤토리/장비/제작/상점/퀘스트가 존재하면 서로 같은 authoritative 상태를 사용해 실제 플레이와 연결하고 고립된 메뉴 기능으로 남기지 않는다.',
    '초반 10분과 중후반을 각각 점검해 초반 학습·첫 보상과 중후반 전략/콘텐츠 확장이 모두 실제 소스와 플레이 흐름에 존재하게 한다.'
  ];
  const ux=[
    '핵심 행동, 위험, 현재 목표, 다음 선택을 모바일 화면에서 우선순위가 명확하게 보이게 한다.',
    '터치 입력은 실제 게임 상태 변화에 연결하고 키보드/검증용 우회 입력이 모바일 PASS를 대신하지 못하게 한다.',
    '실패/재시도/복귀 시 플레이어가 무엇이 유지되고 무엇이 초기화되는지 즉시 알 수 있게 한다.',
    'HUD·메뉴·인벤토리·장비·설정은 같은 UI 디자인 언어와 정보 우선순위를 사용하고 뒤로가기/닫기/스크롤/팝업 중첩을 모바일에서 검증한다.',
    '반복 조작은 편의 기능으로 줄이되 핵심 플레이 선택과 위험/보상 판단을 자동화하지 않는다.'
  ];
  const acceptance=[
    'CURRENT_GAME_SOURCE_CHANGED_IN_RESPONSIBLE_SYSTEM',
    'WORKFLOW_QA_HOMEPAGE_ONLY_CHANGE_DOES_NOT_COUNT',
    'GAMEPLAY_CLAIM_REQUIRES_OBSERVABLE_GAME_STATE_DELTA',
    'VISUAL_CLAIM_REQUIRES_ACTUAL_RENDERED_DELTA',
    'BEFORE_AFTER_OR_VERIFIED_BASELINE_COMPARISON',
    'NO_PROTECTED_SAVE_BALANCE_ECONOMY_NETWORK_SEMANTIC_REGRESSION',
    'FOUNDATION_ONLY_REPAIR_COUNTS_ONLY_WHEN_FOUNDATION_IS_THIS_DIRECTIVE_PRIMARY_VERIFIED_GAP',
    'HOLISTIC_CORE_DOMAINS_CLASSIFIED_PASS_GAP_OR_NOT_APPLICABLE',
    'EXISTING_APPLICABLE_GAP_CANNOT_BE_SILENTLY_SKIPPED',
    'FIRST_10_MINUTES_AND_SESSION_FLOW_REVIEWED',
    'MAP_INVENTORY_UI_CONVENIENCE_AND_SYSTEM_CONNECTION_REVIEWED_WHEN_APPLICABLE'
  ];
  const nextCandidates=uniq([
    focus==='CORE_FUN'?'CONNECT_CORE_FUN_TO_PROGRESSION_AND_CONTENT_VARIETY':'DEEPEN_CORE_FUN_DECISION_DENSITY',
    focus==='PRESENTATION'?'CONNECT_VISUAL_LANGUAGE_TO_GAMEPLAY_TELEGRAPH_AND_WORLD_IDENTITY':'RAISE_VISUAL_ACTING_MOTION_AND_ENVIRONMENT_COHERENCE',
    'CLOSE_NEXT_HIGHEST_VALUE_GAP_FROM_RUNTIME_OR_PLAYTEST',
    'OPTIMIZE_MOBILE_FRAME_INPUT_RENDER_OR_STATE_BOTTLENECK_WHEN_VERIFIED'
  ]);
  return Object.freeze({
    version:2,
    directiveId:`${id}-build-up-g${generation}-${fingerprint.slice(0,12)}`,
    directiveFingerprint:fingerprint,
    previousDirectiveFingerprint:previousFingerprint||null,
    forbiddenRepeatFingerprint:previousFingerprint||null,
    gameId:id,
    gameName:clean(gameName)||id,
    generation,
    developmentDepth:depthInfo.developmentDepth,
    escalationStage:depthInfo.escalationStage,
    escalationMode:depthInfo.escalationMode,
    previousDirectiveOutcome:depthInfo.previousOutcome,
    platform:clean(platform).toUpperCase()||'COMMON',
    sourceRoot:posix(sourceRoot),
    sourceTreeFingerprint:source.sourceTreeFingerprint,
    designFingerprint:sha(JSON.stringify(design)),
    gameIdentityAndNonNegotiables:{
      identity,
      coreFun:design.coreFun,
      coreLoop:design.coreLoop,
      signatureSystems:design.signatureSystems,
      progressionDirection:design.progressionDirection,
      multiplayerMode:design.multiplayerMode,
      preserve:['CORE_IDENTITY','APPROVED_RULE_SEMANTICS','BALANCE_VALUES_UNLESS_AUTHORIZED','ECONOMY_MEANING_UNLESS_AUTHORIZED','SAVE_MEANING','NETWORK_AUTHORITY']
    },
    currentImplementationFindings:{sourceObservations:source.observations,signals:source.signals,topFiles:source.topFiles,sourceAnchors:source.sourceAnchors||[]},
    previousVersionDelta:previousDirective?{previousGoal:previousDirective.thisLoopPrimaryGoal||null,previousFocus:previousDirective.primaryFocus||null,previousGeneration:previousDirective.generation||null,previousSourceTreeFingerprint:previousDirective.sourceTreeFingerprint||null,currentSourceTreeFingerprint:source.sourceTreeFingerprint,sourceChanged:depthInfo.sourceChangedSincePrevious,verifiedEvolution:depthInfo.verifiedEvolution}:{state:'NO_PREVIOUS_DIRECTIVE'},
    playtestRuntimeFindings:runtimeEvidence&&Object.keys(runtimeEvidence).length?runtimeEvidence:{state:'UNKNOWN_NOT_INVENTED'},
    qualityGapMap:states,
    allDomainImplementationDirectives,
    detectedGaps:gaps,
    primaryFocus:focus,
    thisLoopPrimaryGoal:goal,
    primaryGoalReason:depthInfo.escalationMode==='VERIFIED_STATUS_WITHOUT_GAME_SOURCE_DELTA_RETRY'?`직전 루프가 verified 상태를 기록했지만 실제 게임 source tree가 바뀌지 않았다. ${focus} 목표를 완료로 계산하지 않고 "${anchor}" 책임 소스 ${exactAnchorLabel}에서 실제 플레이 가치 변화가 생기는 구현으로 다시 지시한다.`:`현재 검증 신호와 소스에서 ${focus}를 우선한다. 게임 고유 앵커는 "${anchor}", 현재 책임 소스는 ${exactAnchorLabel}이며 실제 source delta와 효과 증거가 다음 결정을 좌우한다.`,
    gameplayImplementationDirectives:gameplay,
    progressionContentWorldDirectives:progression,
    visualBuildUpDirective:buildVisualDirective({gameId:id,design,source,focus}),
    uxInputDirectives:ux,
    platformAdaptationDirectives:platformDirectives({identity,goal}),
    robloxNativeExecution,
    preserveConstraints:[
      '기존 세이브 키와 의미를 명시적 마이그레이션 없이 변경하지 않는다.',
      '승인 없는 밸런스/경제/보상/드랍/쿨다운/히트 의미 변경 금지.',
      '멀티플레이 권한과 authoritative state를 프레젠테이션 이유로 클라이언트로 이동하지 않는다.',
      'wrapper/shadow/temporary override 대신 기존 책임 시스템을 직접 수정한다.'
    ],
    responsibleSystemsAndFiles:{files:topFiles,sourceAnchors:sourceResponsibilities,selectionRule:'DIRECT_GAME_RESPONSIBILITY_AND_DESIGN_INTENT_FIRST',exactSourceAnchorRequired:true,currentAndIntendedBehaviorRequiredPerPrimaryAnchor:true},
    effectivenessMeasurement:{expectedPlayerEffect:expectedEffect,previousGeneration:previousEffectiveness,baseline:{sourceTreeFingerprint:source.sourceTreeFingerprint,runtimeObserved:runtimeEvidence?.runtimeObserved===true,runtimePassed:runtimeEvidence?.runtimePassed===true,failureStage:clean(runtimeEvidence?.failureStage)||null,failureSignature:clean(runtimeEvidence?.failureSignature)||null},requiredPostChangeEvidence:['CHANGED_GAME_FILES','POST_CHANGE_SOURCE_TREE_FINGERPRINT','RELEVANT_QA_OR_RUNTIME_RESULT','OBSERVED_PLAYER_VALUE_EFFECT'],sourceDeltaAloneDoesNotProvePlayerValueImprovement:true},
    nextActionDecision,
    acceptanceEvidence:acceptance,
    nextEscalationCandidates:nextCandidates,
    loopEscalation:{automatic:true,nextGeneration:generation+1,currentDevelopmentDepth:depthInfo.developmentDepth,nextDevelopmentDepth:depthInfo.advanceAllowed?depthInfo.developmentDepth+1:depthInfo.developmentDepth,escalationStage:depthInfo.escalationStage,escalationMode:depthInfo.escalationMode,sourceChangedSincePrevious:depthInfo.sourceChangedSincePrevious,verifiedEvolution:depthInfo.verifiedEvolution,reuseSameGoalWithoutNewEvidence:false,completedGoalBecomesBaseline:depthInfo.verifiedEvolution},
    coverage:{
      allDomainsConsidered:true,
      domainCount:BUILD_UP_DOMAINS.length,
      visualDomainCount:VISUAL_DOMAINS.length,
      allowedStates:['PASS','GAP','NOT_APPLICABLE'],
      holisticCoreDomains:HOLISTIC_CORE_DOMAINS,
      holisticGaps:states.filter(x=>HOLISTIC_CORE_DOMAINS.includes(x.domain)&&x.state==='GAP').map(x=>x.domain),
      notApplicable:states.filter(x=>x.state==='NOT_APPLICABLE').map(x=>x.domain),
      silentApplicableGapOmissionForbidden:true
    },
    generatedAt:new Date().toISOString()
  });
}

function parseArgs(argv=process.argv.slice(2)){
  const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const at=raw.indexOf('=');if(at<0)out[raw.slice(2)]=true;else out[raw.slice(2,at)]=raw.slice(at+1);}return out;
}
function cli(){
  const args=parseArgs();
  const gameId=clean(args['game-id']);
  const designFile=clean(args.design);
  const sourceRoot=clean(args['source-root']);
  if(!gameId||!designFile)throw new Error('required: --game-id --design');
  const repoRoot=path.resolve(clean(args.root)||process.cwd());
  const designRecord=readJson(path.resolve(repoRoot,designFile),{});
  const previousFile=clean(args.previous);
  const runtimeFile=clean(args['runtime-evidence']);
  const previousDirective=previousFile?readJson(path.resolve(repoRoot,previousFile),null):null;
  const runtimeEvidence=runtimeFile?readJson(path.resolve(repoRoot,runtimeFile),{}):{};
  const directive=buildGameSpecificBuildUpDirective({
    gameId,gameName:clean(args['game-name']),platform:clean(args.platform)||'COMMON',
    designRecord,repoRoot,sourceRoot,previousDirective,runtimeEvidence
  });
  const outputRoot=path.resolve(repoRoot,clean(args['output-root'])||'company-build-up');
  const gameRoot=path.join(outputRoot,gameId),history=path.join(gameRoot,'history');
  fs.mkdirSync(history,{recursive:true});
  fs.writeFileSync(path.join(gameRoot,'current.json'),JSON.stringify(directive,null,2)+'\n');
  fs.writeFileSync(path.join(history,`${String(directive.generation).padStart(4,'0')}-${directive.directiveId}.json`),JSON.stringify(directive,null,2)+'\n');
  console.log('BUILD_UP_DIRECTIVE_ID='+directive.directiveId);
  console.log('BUILD_UP_GENERATION='+directive.generation);
  console.log('BUILD_UP_FOCUS='+directive.primaryFocus);
  console.log('BUILD_UP_SOURCE_TREE='+directive.sourceTreeFingerprint);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)cli();
