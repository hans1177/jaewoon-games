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
  'CORE_FUN','COMBAT_OR_PRIMARY_INTERACTION','PLAYER_ACTIONS','ENEMY_AI','BOSS_AND_SIGNATURE_MOMENTS',
  'PROGRESSION','GOALS','REWARDS','UNLOCKS','QUESTS','CONTENT_VARIETY','WORLD_MAP_TOPOLOGY','REGIONS',
  'LANDMARKS','TRAVERSAL','ECONOMY','INVENTORY','CRAFTING','SAVE_AND_RECOVERY','MULTIPLAYER_AND_SYNC',
  'INPUT','MOBILE_UX','ACCESSIBILITY','TUTORIAL_ONBOARDING','DIFFICULTY_PACING','GAME_FEEL',
  'SPAWN_ENCOUNTER_DIRECTOR','FAILURE_RESPAWN_CHECKPOINTS','NPC_SOCIAL_BEHAVIOR','NARRATIVE_STORY',
  'AUDIO_MUSIC_SFX','REPLAYABILITY_VARIATION','CHARACTER_VISUALS','ENEMY_VISUALS','WEAPONS_AND_EQUIPMENT',
  'BUILDINGS_AND_PROPS','ENVIRONMENT','TERRAIN','MATERIALS','PALETTE','LIGHTING','ANIMATION',
  'SECONDARY_MOTION','VFX','CAMERA','UI_HUD','AUDIO_VISUAL_TIMING','ENVIRONMENTAL_MOTION',
  'PERFORMANCE','RUNTIME_STABILITY','ERROR_RECOVERY'
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

function sourceAnchorsFromRows(rows=[],topFiles=[]){
  const priority=new Map((topFiles||[]).map((row,index)=>[clean(row?.file),index]));
  const ordered=[...rows].sort((a,b)=>(priority.get(a.file)??999)-(priority.get(b.file)??999)||a.file.localeCompare(b.file));
  const out=[],seen=new Set();
  const push=(row,lineIndex,kind,symbol,line)=>{
    const file=clean(row?.file),name=clean(symbol);
    if(!file||!name)return;
    const key=file+'|'+kind+'|'+name;
    if(seen.has(key))return;
    seen.add(key);
    out.push(Object.freeze({file,kind,symbol:name,line:lineIndex+1,snippet:clean(line).slice(0,180)}));
  };
  for(const row of ordered){
    if(!row?.text)continue;
    const lines=String(row.text).split(/\r?\n/);
    for(let i=0;i<lines.length&&out.length<32;i+=1){
      const line=lines[i];
      let m=null;
      if((m=/\bclass\s+([A-Za-z_][A-Za-z0-9_]*)/.exec(line)))push(row,i,'CLASS',m[1],line);
      if((m=/\b(?:local\s+)?function\s+([A-Za-z_][A-Za-z0-9_.:]*)\s*\(/.exec(line)))push(row,i,'FUNCTION',m[1],line);
      if((m=/\b(?:public|private|protected|internal|static|async|virtual|override|sealed|partial|new|\s)+\s*[A-Za-z_][A-Za-z0-9_<>,.?\[\]]*\s+([A-Za-z_][A-Za-z0-9_]*)\s*\([^;]*\)\s*(?:\{|=>)/.exec(line)))push(row,i,/^On[A-Z]|^Handle[A-Z]/.test(m[1])?'EVENT_HANDLER':'FUNCTION',m[1],line);
      if((m=/\b(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/.exec(line)))push(row,i,'FUNCTION',m[1],line);
      if((m=/\b([A-Za-z_][A-Za-z0-9_]*)\s*[:=]\s*function\s*\(/.exec(line)))push(row,i,'FUNCTION',m[1],line);
    }
    if(out.length>=32)break;
  }
  return Object.freeze(out.slice(0,24));
}

export function inspectGameSource({repoRoot=process.cwd(),sourceRoot=''}={}){
  const absolute=path.resolve(repoRoot,sourceRoot);
  const files=walkSource(absolute);
  const rows=files.map(file=>{
    let buffer=Buffer.alloc(0);try{buffer=fs.readFileSync(file);}catch{}
    const extension=path.extname(file).toLowerCase();
    const text=TEXT_SOURCE_EXTENSIONS.has(extension)?buffer.toString('utf8'):'';
    return{file:posix(path.relative(repoRoot,file)),text,buffer};
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
  const sourceAnchors=sourceAnchorsFromRows(rows,topFiles);
  return Object.freeze({
    sourceRoot:posix(sourceRoot),
    sourceTreeFingerprint:files.length?fingerprint.digest('hex'):sha('missing:'+sourceRoot),
    fileCount:files.length,
    topFiles,
    sourceAnchors,
    signals,
    observations:uniq([
      files.length===0?'CURRENT_SOURCE_MISSING_OR_UNREADABLE':'CURRENT_SOURCE_FILES='+files.length,
      signals.primitive>8?'PLACEHOLDER_OR_PRIMITIVE_USAGE_HIGH':null,
      signals.animation<2?'MOTION_IMPLEMENTATION_SPARSE':null,
      signals.vfx<2?'VFX_IMPLEMENTATION_SPARSE':null,
      signals.camera<1?'CAMERA_LANGUAGE_SPARSE':null,
      signals.progression<4?'PROGRESSION_IMPLEMENTATION_SPARSE':null,
      signals.ai<2?'AI_BEHAVIOR_DEPTH_SPARSE':null,
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
  const sourceAnchors=parts.flatMap(part=>part.sourceAnchors||[]).filter((row,index,array)=>array.findIndex(other=>other.file===row.file&&other.kind===row.kind&&other.symbol===row.symbol)===index).slice(0,32);
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
  if(/visual|graphic|render|animation|vfx|camera|lighting|material|silhouette|environment|placeholder/.test(text))return'PRESENTATION';
  if(/progress|reward|unlock|quest|goal|economy|content/.test(text))return'PROGRESSION';
  if(/mobile|touch|input|ui|hud|readability|navigation|accessib/.test(text))return'USABILITY';
  if(/combat|core.?fun|interaction|enemy|boss|gameplay|feel|decision/.test(text))return'CORE_FUN';
  const s=source?.signals||{};
  if(Number(s.primitive||0)>8||Number(s.animation||0)<2||Number(s.vfx||0)<2)return'PRESENTATION';
  if(Number(s.progression||0)<4)return'PROGRESSION';
  if(Number(s.ai||0)<2||Number(s.combat||0)<5)return'CORE_FUN';
  return'USABILITY';
}

function nextFocus({preferred='CORE_FUN',previous={}}={}){
  const order=['CORE_FUN','PROGRESSION','PRESENTATION','USABILITY','STABILITY'];
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
  if(domain==='MULTIPLAYER_AND_SYNC'&&!/multi|coop|co-op|pvp|player/.test(clean(design.multiplayerMode).toLowerCase())&&!/multiplayer|coop|pvp/.test(relevantByText))return no('approved design does not currently require multiplayer');
  if(domain==='CRAFTING'&&!/craft|제작|recipe/.test(relevantByText)&&Number(s.progression||0)>0)return no('no crafting signal in approved design');
  if(domain==='QUESTS'&&!/quest|퀘스트|story|npc/.test(relevantByText))return no('no quest/story objective signal in approved design');
  if(domain==='NPC_SOCIAL_BEHAVIOR'&&!/npc|villager|resident|social|주민|상인|대화/.test(relevantByText))return no('no NPC or social behavior signal in approved design');
  if(domain==='NARRATIVE_STORY'&&!/story|narrative|lore|quest|스토리|세계관|대사/.test(relevantByText))return no('no narrative or story signal in approved design');
  if(domain==='REPLAYABILITY_VARIATION'&&!/rogue|wave|random|procedural|replay|런|웨이브|랜덤/.test(relevantByText))return no('no explicit replay variation signal in approved design');
  const weak=
    (['ANIMATION','SECONDARY_MOTION'].includes(domain)&&Number(s.animation||0)<2)||
    (domain==='VFX'&&Number(s.vfx||0)<2)||
    (domain==='CAMERA'&&Number(s.camera||0)<1)||
    (domain==='PROGRESSION'&&Number(s.progression||0)<4)||
    (domain==='ENEMY_AI'&&Number(s.ai||0)<2)||
    (domain==='ERROR_RECOVERY'&&Number(s.errorRecovery||0)<2)||
    (['CHARACTER_VISUALS','ENEMY_VISUALS','ENVIRONMENT','TERRAIN','MATERIALS'].includes(domain)&&Number(s.primitive||0)>8);
  return{domain,state:weak?'GAP':'EVALUATED',reason:weak?'current source signals indicate shallow or placeholder-heavy implementation':'considered against current design and source'};
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
    CORE_FUN:new Set(['CORE_FUN','COMBAT_OR_PRIMARY_INTERACTION','PLAYER_ACTIONS','ENEMY_AI','BOSS_AND_SIGNATURE_MOMENTS','CONTENT_VARIETY']),
    PROGRESSION:new Set(['PROGRESSION','GOALS','REWARDS','UNLOCKS','QUESTS','ECONOMY','INVENTORY','CRAFTING']),
    PRESENTATION:new Set(['CHARACTER_VISUALS','ENEMY_VISUALS','WEAPONS_AND_EQUIPMENT','BUILDINGS_AND_PROPS','ENVIRONMENT','TERRAIN','MATERIALS','PALETTE','LIGHTING','ANIMATION','SECONDARY_MOTION','VFX','CAMERA','UI_HUD','AUDIO_VISUAL_TIMING','ENVIRONMENTAL_MOTION','LANDMARKS']),
    USABILITY:new Set(['INPUT','MOBILE_UX','ACCESSIBILITY','TUTORIAL_ONBOARDING','TRAVERSAL','UI_HUD','GOALS','GAME_FEEL']),
    STABILITY:new Set(['SAVE_AND_RECOVERY','MULTIPLAYER_AND_SYNC','FAILURE_RESPAWN_CHECKPOINTS','PERFORMANCE','RUNTIME_STABILITY','ERROR_RECOVERY'])
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
  const domainPriority=(d.allDomainImplementationDirectives||[]).filter(row=>['FIX_NOW','BUILD_UP_NOW'].includes(row.priority)).slice(0,14).map(row=>`- ${row.domain}[${row.priority}]: ${row.directive}`).join('\n');
  return[
    '[GAME_SPECIFIC_BUILD_UP_DIRECTIVE]',
    `id=${d.directiveId}; generation=${d.generation}; depth=${d.developmentDepth}; stage=${d.escalationStage}; focus=${d.primaryFocus}`,
    `GAME_IDENTITY: ${d.gameIdentityAndNonNegotiables.identity}`,
    `PRIMARY_GOAL: ${d.thisLoopPrimaryGoal}`,
    `WHY_NOW: ${d.primaryGoalReason}`,
    `GAMEPLAY: ${d.gameplayImplementationDirectives.join(' | ')}`,
    `PROGRESSION_WORLD: ${d.progressionContentWorldDirectives.join(' | ')}`,
    'PRIORITY_DOMAIN_DIRECTIVES:',
    domainPriority,
    'VISUAL:',
    visual,
    `UX_INPUT: ${d.uxInputDirectives.join(' | ')}`,
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
  const depthInfo=escalationDepthInfo({previousDirective,previousOutcome:previousDirectiveOutcome,currentSourceTreeFingerprint:source.sourceTreeFingerprint});
  const priorFocus=clean(previousDirective?.primaryFocus).toUpperCase();
  const focus=previousDirective&&!depthInfo.advanceAllowed&&priorFocus?priorFocus:nextFocus({preferred,previous:previousDirective||{}});
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
  const fingerprint=sha(JSON.stringify({id,generation,focus,goal,source:source.sourceTreeFingerprint,design}));
  const states=BUILD_UP_DOMAINS.map(domain=>domainState(domain,{design,source}));
  const gaps=states.filter(x=>x.state==='GAP');
  const allDomainImplementationDirectives=buildAllDomainDirectives({states,design,focus,depthInfo});
  const topFiles=uniq([...(responsibleFiles||[]),...(source?.topFiles||[]).map(x=>x.file)]).slice(0,16);
  const systemNames=design.signatureSystems.map(x=>x.name).filter(Boolean);
  const gameplay=[
    `${anchor}를 설명/마커가 아니라 실제 authoritative game state와 플레이어 입력에 연결하고 성공·실패·재시도 경로를 완성한다.`,
    `${secondary}가 다음 선택을 바꾸도록 상태 변화와 피드백을 연결한다.`,
    systemNames.length?`고유 시스템 ${systemNames.join(', ')} 중 이번 목표와 직접 연결된 시스템을 기존 책임 코드에서 심화한다.`:'현재 핵심 루프의 가장 얕은 책임 시스템을 기존 코드에서 직접 심화한다.',
    focus==='CORE_FUN'?'주요 적/대상/상호작용이 행동·타이밍·카운터플레이 중 최소 두 축에서 구별되게 한다.':'핵심 게임플레이 의미는 보존하면서 이번 품질축에 필요한 연결만 수정한다.'
  ];
  const progression=[
    `${design.progressionDirection||'승인된 진행 방향'}을 현재 루프의 실제 목표·보상·해금·콘텐츠 연결로 구현/심화한다.`,
    '새 콘텐츠는 기존 핵심 루프와 연결되어야 하며 단순 수량 복제나 색/수치만 다른 변형으로 채우지 않는다.',
    '맵/지역이 있는 게임은 동선·위험/보상·랜드마크·조우/자원 역할이 서로 구별되도록 유지하거나 강화한다.'
  ];
  const ux=[
    '핵심 행동, 위험, 현재 목표, 다음 선택을 모바일 화면에서 우선순위가 명확하게 보이게 한다.',
    '터치 입력은 실제 게임 상태 변화에 연결하고 키보드/검증용 우회 입력이 모바일 PASS를 대신하지 못하게 한다.',
    '실패/재시도/복귀 시 플레이어가 무엇이 유지되고 무엇이 초기화되는지 즉시 알 수 있게 한다.'
  ];
  const acceptance=[
    'CURRENT_GAME_SOURCE_CHANGED_IN_RESPONSIBLE_SYSTEM',
    'WORKFLOW_QA_HOMEPAGE_ONLY_CHANGE_DOES_NOT_COUNT',
    'GAMEPLAY_CLAIM_REQUIRES_OBSERVABLE_GAME_STATE_DELTA',
    'VISUAL_CLAIM_REQUIRES_ACTUAL_RENDERED_DELTA',
    'BEFORE_AFTER_OR_VERIFIED_BASELINE_COMPARISON',
    'NO_PROTECTED_SAVE_BALANCE_ECONOMY_NETWORK_SEMANTIC_REGRESSION',
    'FOUNDATION_ONLY_REPAIR_COUNTS_ONLY_WHEN_FOUNDATION_IS_THIS_DIRECTIVE_PRIMARY_VERIFIED_GAP'
  ];
  const nextCandidates=uniq([
    focus==='CORE_FUN'?'CONNECT_CORE_FUN_TO_PROGRESSION_AND_CONTENT_VARIETY':'DEEPEN_CORE_FUN_DECISION_DENSITY',
    focus==='PRESENTATION'?'CONNECT_VISUAL_LANGUAGE_TO_GAMEPLAY_TELEGRAPH_AND_WORLD_IDENTITY':'RAISE_VISUAL_ACTING_MOTION_AND_ENVIRONMENT_COHERENCE',
    'CLOSE_NEXT_HIGHEST_VALUE_GAP_FROM_RUNTIME_OR_PLAYTEST',
    'OPTIMIZE_MOBILE_FRAME_INPUT_RENDER_OR_STATE_BOTTLENECK_WHEN_VERIFIED'
  ]);
  return Object.freeze({
    version:1,
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
    currentImplementationFindings:{sourceObservations:source.observations,signals:source.signals,topFiles:source.topFiles},
    previousVersionDelta:previousDirective?{previousGoal:previousDirective.thisLoopPrimaryGoal||null,previousFocus:previousDirective.primaryFocus||null,previousGeneration:previousDirective.generation||null,previousSourceTreeFingerprint:previousDirective.sourceTreeFingerprint||null,currentSourceTreeFingerprint:source.sourceTreeFingerprint,sourceChanged:depthInfo.sourceChangedSincePrevious,verifiedEvolution:depthInfo.verifiedEvolution}:{state:'NO_PREVIOUS_DIRECTIVE'},
    playtestRuntimeFindings:runtimeEvidence&&Object.keys(runtimeEvidence).length?runtimeEvidence:{state:'UNKNOWN_NOT_INVENTED'},
    qualityGapMap:states,
    allDomainImplementationDirectives,
    detectedGaps:gaps,
    primaryFocus:focus,
    thisLoopPrimaryGoal:goal,
    primaryGoalReason:depthInfo.escalationMode==='VERIFIED_STATUS_WITHOUT_GAME_SOURCE_DELTA_RETRY'?`직전 루프가 verified 상태를 기록했지만 실제 게임 source tree가 바뀌지 않았다. ${focus} 목표를 완료로 계산하지 않고 "${anchor}" 책임 소스에서 실제 플레이 가치 변화가 생기는 구현으로 다시 지시한다.`:`현재 검증 신호와 소스에서 ${focus}를 우선한다. 게임 고유 앵커는 "${anchor}"이며 실제 source delta까지 검증된 루프만 다음 깊이로 상승한다.`,
    gameplayImplementationDirectives:gameplay,
    progressionContentWorldDirectives:progression,
    visualBuildUpDirective:buildVisualDirective({gameId:id,design,source,focus}),
    uxInputDirectives:ux,
    platformAdaptationDirectives:platformDirectives({identity,goal}),
    preserveConstraints:[
      '기존 세이브 키와 의미를 명시적 마이그레이션 없이 변경하지 않는다.',
      '승인 없는 밸런스/경제/보상/드랍/쿨다운/히트 의미 변경 금지.',
      '멀티플레이 권한과 authoritative state를 프레젠테이션 이유로 클라이언트로 이동하지 않는다.',
      'wrapper/shadow/temporary override 대신 기존 책임 시스템을 직접 수정한다.'
    ],
    responsibleSystemsAndFiles:{files:topFiles,selectionRule:'DIRECT_GAME_RESPONSIBILITY_AND_DESIGN_INTENT_FIRST'},
    acceptanceEvidence:acceptance,
    nextEscalationCandidates:nextCandidates,
    loopEscalation:{automatic:true,nextGeneration:generation+1,currentDevelopmentDepth:depthInfo.developmentDepth,nextDevelopmentDepth:depthInfo.advanceAllowed?depthInfo.developmentDepth+1:depthInfo.developmentDepth,escalationStage:depthInfo.escalationStage,escalationMode:depthInfo.escalationMode,sourceChangedSincePrevious:depthInfo.sourceChangedSincePrevious,verifiedEvolution:depthInfo.verifiedEvolution,reuseSameGoalWithoutNewEvidence:false,completedGoalBecomesBaseline:depthInfo.verifiedEvolution},
    coverage:{allDomainsConsidered:true,domainCount:BUILD_UP_DOMAINS.length,visualDomainCount:VISUAL_DOMAINS.length,notApplicable:states.filter(x=>x.state==='NOT_APPLICABLE').map(x=>x.domain)},
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
