// 파일명: tools/company-roblox-production-plan.mjs
// 역할: 기존 로블 제작 계획을 웹·유니티의 같은 BUILD_UP 경로에서도 직접 사용한다.
// 원칙: 제작 계획은 실제 구현·런타임 통과 증거가 아니며 기존 책임 소스만 연결한다.
// 임포트
import crypto from 'node:crypto';
import {createVibeProceduralWorldLayout} from '../assets/vibe-environment-director.js';

const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const list=value=>Array.isArray(value)?value:[];
const unique=values=>[...new Set(values.map(clean).filter(Boolean))];
const hash=value=>crypto.createHash('sha256').update(String(value)).digest('hex');
function latestOwnerChanges(rows){
  const latest=new Map();
  for(const row of list(rows)){
    const featureId=clean(row?.featureId),requestId=clean(row?.requestId),action=clean(row?.action).toUpperCase(),requirement=clean(row?.requirement);
    if(!featureId||!requestId||!requirement||!['ADD','REMOVE','UPDATE'].includes(action))continue;
    latest.set(featureId,{featureId,requestId,action,requirement});
  }
  return [...latest.values()].sort((a,b)=>a.featureId.localeCompare(b.featureId));
}
const profile=(id,pattern,action,connection,ideas)=>({id,pattern,action,connection,ideas});

export const ROBLOX_PRODUCTION_PROFILES=Object.freeze([
  profile('TYCOON',/tycoon|타이쿤|경영|simulator|시뮬레이터/i,'건설·운영 선택','시설 역할 → 생산/방문 흐름 → 재투자',[
    ['SUPPLY_ROUTE','시설 사이 공급 경로와 병목을 선택하게 한다.','경로와 시설 역할을 함께 연결'],
    ['VISITOR_NEEDS','방문객의 서로 다른 목적을 시설 배치에 연결한다.','방문 행동과 운영 선택을 함께 연결'],
    ['SPACE_TRADEOFF','한정된 공간에서 서로 다른 시설 조합을 선택하게 한다.','공간 비용과 생산 조합을 함께 연결']]),
  profile('DEFENSE',/defen[cs]e|디펜스|방어/i,'배치·대응 선택','적 역할/진입로 → 방어 조합 → 다음 웨이브 준비',[
    ['ROUTE_CONTROL','진입로와 방어 역할 조합으로 대응 선택을 만든다.','경로와 공격 역할을 함께 연결'],
    ['ENEMY_SYNERGY','지원·견제·돌파 역할의 적 조합을 만든다.','적 행동과 우선순위 판단을 함께 연결'],
    ['RECOVERY_WINDOW','웨이브 사이 복구와 재배치 선택을 만든다.','실패 결과와 다음 배치를 함께 연결']]),
  profile('SURVIVAL',/survival|생존/i,'탐색·수급·위험 대응','환경 압박 → 자원 선택 → 거점/생존 수단',[
    ['RESOURCE_EXPEDITION','자원 수급 경로마다 다른 위험과 귀환 선택을 만든다.','자원 목적과 경로 위험을 함께 연결'],
    ['SHELTER_SYSTEM','거점의 위치와 기능을 환경 압박에 연결한다.','환경 변화와 거점 역할을 함께 연결'],
    ['ECOLOGY_RESPONSE','생태계의 행동 변화가 채집과 이동 결정을 바꾸게 한다.','생물 행동과 플레이 시간/장소를 함께 연결']]),
  profile('PUZZLE',/puzzle|퍼즐/i,'규칙을 읽고 수를 선택','규칙 상호작용 → 판 상태 변화 → 해결/재도전',[
    ['RULE_COMBINATION','기존 규칙 두 개가 상호작용하는 판을 만든다.','규칙 조합과 해결 순서를 함께 연결'],
    ['INFORMATION_CHOICE','플레이로 드러나는 정보가 다음 선택을 바꾸게 한다.','정보 획득과 판 상태를 함께 연결'],
    ['SPATIAL_CONSTRAINT','공간 제약이 같은 행동의 다른 쓰임을 만들게 한다.','배치 제약과 행동 결과를 함께 연결']]),
  profile('OBBY',/obby|platformer|parkour|오비|파쿠르|플랫포머/i,'이동·타이밍 선택','장애물 규칙 → 이동 조합 → 체크포인트/다음 구간',[
    ['TRAVERSAL_COMBINATION','기존 이동 동작을 서로 다른 장애물 조합에 연결한다.','이동 순서와 공간 형태를 함께 연결'],
    ['ROUTE_RISK','안전한 경로와 숙련 경로에 서로 다른 선택 이유를 만든다.','경로 위험과 구간 진행을 함께 연결'],
    ['MOVING_RHYTHM','움직이는 발판의 리듬이 기다림과 이동 판단을 만들게 한다.','시간 조건과 공간 이동을 함께 연결']]),
  profile('RACING',/racing|race|레이싱|경주/i,'조향·속도·경로 선택','코스 지형 → 주행 판단 → 구간/랩 결과',[
    ['CORNER_SEQUENCE','서로 다른 코너가 다음 구간 진입 속도에 영향을 주게 한다.','코스 형태와 주행 선택을 함께 연결'],
    ['OVERTAKE_ROUTE','추월 경로마다 다른 진입 조건과 위험을 만든다.','공간 경로와 상대 위치를 함께 연결'],
    ['SURFACE_ADAPTATION','승인된 주행 규칙 안에서 노면별 공략 구간을 만든다.','노면 맥락과 주행 타이밍을 함께 연결']]),
  profile('HORROR',/horror|공포|탈출/i,'관찰·은신·탈출 선택','단서/위협 → 위험 판단 → 탈출 경로/상태 변화',[
    ['THREAT_READABILITY','소리·환경 단서가 위협 회피 행동에 연결되게 한다.','위협 행동과 정보 단서를 함께 연결'],
    ['ESCAPE_DEPENDENCY','탈출 목표의 선행 행동이 위험한 탐색을 유도하게 한다.','목표 의존성과 위험 경로를 함께 연결'],
    ['SAFE_ROUTE_CHANGE','사건 이후 안전 경로가 바뀌어 새 판단을 만들게 한다.','월드 사건과 귀환 동선을 함께 연결']]),
  profile('ROLEPLAY',/roleplay|role.play|롤플레(?!잉)|역할극|생활/i,'역할·관계·활동 선택','역할 활동 → 관계/장소 변화 → 다음 생활 목표',[
    ['ROLE_INTERDEPENDENCE','역할마다 다른 활동이 같은 장소에서 연결되게 한다.','역할 목적과 상호작용 결과를 함께 연결'],
    ['PLACE_STORY','장소의 사건과 NPC 관계가 다음 활동을 열게 한다.','장소 맥락과 관계 변화를 함께 연결'],
    ['DAILY_ACTIVITY','활동의 결과가 다음 활동에 쓸 수 있는 상태로 남게 한다.','활동 선택과 지속 상태를 함께 연결']]),
  profile('SANDBOX',/sandbox|샌드박스|건축|창작/i,'조합·제작·실험 선택','재료/도구 → 제작물 기능 → 새로운 활용',[
    ['FUNCTIONAL_BUILD','제작물의 서로 다른 부품이 실제 기능을 만들게 한다.','부품 역할과 제작 결과를 함께 연결'],
    ['WORLD_USE','제작물을 기존 월드 문제 해결에 사용할 수 있게 한다.','월드 조건과 도구 쓰임을 함께 연결'],
    ['RECOMBINATION','기존 재료를 다른 기능 조합으로 재사용하게 한다.','조합 구조와 플레이 목적을 함께 연결']]),
  profile('SHOOTER',/shooter|fps|슈터|슈팅/i,'조준·위치·사격 선택','위치/표적 역할 → 대응 → 전장 목표',[
    ['COVER_CHOICE','엄폐 위치와 사선이 서로 다른 전술 선택을 만들게 한다.','전장 공간과 표적 행동을 함께 연결'],
    ['TARGET_PRIORITY','표적 역할 조합에 따라 대응 순서를 달리하게 한다.','적 역할과 전장 목표를 함께 연결'],
    ['OBJECTIVE_MOVEMENT','목표의 변화가 같은 자리 반복 사격에서 벗어나게 한다.','목표 상태와 이동 경로를 함께 연결']]),
  profile('STRATEGY',/strategy|전략|전술|카드|card/i,'자원·배치·순서 선택','정보/자원 제약 → 전술 선택 → 전황 변화',[
    ['POSITIONAL_CHOICE','위치와 역할 조합이 서로 다른 대응을 만들게 한다.','공간 가치와 유닛/카드 역할을 함께 연결'],
    ['RESOURCE_TIMING','자원 사용 시점이 다음 선택지를 달리하게 한다.','자원 용도와 행동 순서를 함께 연결'],
    ['COUNTERPLAY','상대 행동을 읽고 대응하는 서로 다른 수단을 만든다.','관찰 정보와 전략 대응을 함께 연결']]),
  profile('ADVENTURE',/adventure|story|어드벤처|모험|스토리/i,'탐색·사건·선택','월드 단서 → 행동 결과 → 사건/지역 전개',[
    ['CAUSAL_QUEST','NPC 목적과 지역 사건을 실제 행동 결과로 연결한다.','사건 원인과 후속 상태를 함께 연결'],
    ['DISCOVERY_ROUTE','탐색 경로가 서로 다른 정보와 해결 수단을 제공하게 한다.','공간 탐색과 사건 해결을 함께 연결'],
    ['WORLD_CONSEQUENCE','완료한 사건이 장소와 다음 목표에 남게 한다.','선택 결과와 월드 상태를 함께 연결']]),
  profile('RPG',/rpg|롤플레잉|성장형/i,'전투·성장·역할 선택','상대/지역 역할 → 장비/능력 선택 → 성장/해금',[
    ['BUILD_SYNERGY','승인된 능력과 장비의 다른 조합 목적을 만든다.','전투 역할과 성장 선택을 함께 연결'],
    ['ENCOUNTER_ROLE','지역 맥락에 맞는 적 행동과 대응 조합을 만든다.','적 역할과 지역 이유를 함께 연결'],
    ['PROGRESSION_ROUTE','성장 결과가 다음 지역이나 플레이 선택을 열게 한다.','보상 목적과 후속 목표를 함께 연결']])
]);

function sourceRole(file,platform){
  if(platform==='UNITY')return /\.(?:unity|prefab|mat|anim|controller|uxml|uss|shader)$/i.test(file)
    ||/(?:UI|View|Visual|Camera|Audio|Motion|Animator|Presentation)(?:Controller|Manager)?\.cs$/i.test(file)
    ?'CLIENT_PRESENTATION':/(?:Config|Definition|Data|Settings)\w*\.cs$|\.asset$/i.test(file)?'SHARED_DEFINITION':'GAMEPLAY_STATE';
  if(platform==='WEB')return /\.(?:css|svg)$/i.test(file)?'CLIENT_PRESENTATION':/\.json$/i.test(file)?'SHARED_DEFINITION':'GAMEPLAY_AND_PRESENTATION';
  return /(?:^|\/)server\/|\.server\.luau?$/i.test(file)?'SERVER_AUTHORITY'
    :/(?:^|\/)client\/|\.client\.luau?$/i.test(file)?'CLIENT_PRESENTATION':'SHARED_DEFINITION';
}

// 공간 도안: 설계와 현재 소스에서 큰 밑그림을 고정한 뒤 작업자가 실제 치수와 연결을 작성한다.
export function buildSpatialBlueprintContract({design={},source={},files=[],mode='',platform='',enabled=false}={}){
  if(!enabled||mode==='EXISTING_SOURCE_REPAIR')return null;
  const layout=design.spatialLayout&&typeof design.spatialLayout==='object'?design.spatialLayout:{};
  const spatialText=JSON.stringify([layout,design.identity,design.coreLoop,design.signatureSystems,design.visualDirection,design.contentVarietyPlan]);
  const spatial=/world|map|terrain|region|room|building|spawn|route|level|village|dungeon|세계|맵|지형|지역|방|건물|배치|동선|경로|마을|던전|서식|사냥|출입/i.test(spatialText);
  if(!spatial&&!Object.keys(layout).length)return null;
  const declared=clean(layout.dimension||design.spatialDimension||layout.proceduralWorld?.dimension).toUpperCase();
  const dimension=['2D','3D'].includes(declared)?declared:'SOURCE_BOUND_REQUIRED';
  const scope=mode==='EXISTING_PLAY_PRESENTATION'?'PRESERVE_LAYOUT_PRESENTATION_ONLY':'DESIGN_BOUND_SPATIAL_IMPLEMENTATION';
  // 설계가 명시적으로 승인한 새 공간만 생성하며, 원본 월드나 충돌·저장은 수정하지 않는다.
  const worldRequest=layout.proceduralWorld&&typeof layout.proceduralWorld==='object'?layout.proceduralWorld:null;
  const worldProposal=mode==='CONNECTED_CONTENT_IMPLEMENTATION'&&worldRequest?.approvedDesign===true&&dimension!=='SOURCE_BOUND_REQUIRED'
    ?createVibeProceduralWorldLayout({...worldRequest,dimension,mobile:worldRequest.mobile!==false}):null;
  const proceduralWorldStudy=worldProposal?{
    status:worldProposal.status,issues:worldProposal.issues||[],runtimeVerified:false,sourceMutationPerformed:false,
    seed:worldProposal.seed||worldRequest.seed||null,dimension,coordinateSystem:worldProposal.coordinateSystem||null,
    regionBiome:worldProposal.regionalBiome||null,climate:worldProposal.climate||null,
    grid:worldProposal.size||null,drainage:worldProposal.drainage||null,riverType:worldProposal.riverType||null,
    riverSample:(worldProposal.river||[]).slice(0,24),riverLength:worldProposal.river?.length||0,
    routes:(worldProposal.roads||[]).map(row=>({id:row.id,from:row.from,to:row.to,totalCells:row.cells.length,cellSample:row.cells.slice(0,64)})),
    buildings:(worldProposal.buildings||[]).slice(0,12).map(row=>({id:row.id,zone:row.zone,position:row.position,footprint:row.footprint,modules:row.modules,doorFacing:row.doorFacing,roadAccess:row.roadAccess,gridSnap:row.gridSnap,sourceBindingRequired:true})),
    totalBuildings:worldProposal.buildings?.length||0,vegetationTypes:(worldProposal.instancingPlan||[]).filter(row=>String(row.module).startsWith('NATURE:')).map(row=>({module:row.module,count:row.count})),
    landmark:worldProposal.landmark||null,sightline:worldProposal.sightline||null,
    budget:worldProposal.mobileBudget||null,fullTerrainOrNativeMeshDelivered:false
  }:null;
  return {
    version:1,required:mode==='CONNECTED_CONTENT_IMPLEMENTATION',dimension,platform,scope,
    designFingerprint:hash(JSON.stringify({identity:design.identity,genre:design.genre,layout,visual:design.visualDirection,art:design.artAudioDirection,systems:design.systemInterconnections})),
    macroSketch:{identity:clean(design.identity),genre:clean(design.genre),style:clean(design.visualDirection),artDirection:design.artAudioDirection||{},
      authoredLayout:layout,coreRoute:list(design.coreLoop),systemConnections:list(design.systemInterconnections),
      actorRoles:list(design.signatureSystems),menuAndConvenience:design.uxAccessibilityPlan||{},mobileUx:clean(design.mobileUx),
      sourceAnchors:list(source.sourceAnchors).filter(row=>files.includes(row.file)).map(row=>({file:row.file,symbol:row.symbol,kind:row.kind})),
      designTraceability:list(design.implementationTraceability),...(proceduralWorldStudy?{proceduralWorldStudy}:{})},
    sourceFiles:files,
    authoringOrder:['MACRO_REGIONS','TRAVERSAL_AND_OBJECTIVES','OBJECT_VOLUMES_AND_SUPPORT','INTERACTION_AND_STATE_CONNECTIONS','NATIVE_SOURCE'],
    preserve:['EXISTING_OBJECT_IDS','EXISTING_TRANSFORMS_UNLESS_DESIGN_REQUIRES_CHANGE','SPAWN_COUNTS','BALANCE','SAVE','SERVER_AUTHORITY'],
    runtimeChecks:['EXACT_BUILD_SCENE_BINDINGS','ACTUAL_GROUND_AND_COLLIDERS','PLAYER_ROUTE_REPLAY','INTERACTION_STATE_CHANGE','CAMERA_OCCLUSION_AND_SIGHTLINES','MOBILE_VIEW_AND_PERFORMANCE','MENU_OPEN_BACK_CLOSE_STATE_PRESERVATION','TOUCH_SCROLL_AND_DISABLED_ACTION_GUARDS'],
    runtimeVerified:false
  };
}

// 소스 작업자의 같은 응답에 도안을 먼저 작성한다. 별도 파일·실행기·검수 단계는 만들지 않는다.
export const SPATIAL_BLUEPRINT_SCHEMA=Object.freeze({
  version:1,designFingerprint:'exact contract fingerprint',dimension:'2D or 3D',view:'TOP_DOWN or SIDE_VIEW or ISOMETRIC or PERSPECTIVE',
  units:'existing source world units',upAxis:'Y or Z for 3D; Y for side view; NONE for top down',upDirection:'1 or -1; screen-down Y uses -1',
  player:{radius:'positive number',height:'positive number',maxStep:'nonnegative number',maxSlopeDegrees:'0..89'},
  worldBounds:{min:['number per dimension'],max:['number per dimension']},
  regions:[{id:'stable design region id',bounds:{min:[],max:[]},purpose:'design reason'}],
  objects:[{id:'existing or design-bound id',role:'GROUND, WALL, PROP, SPAWN, GOAL, NPC, ENEMY, DOOR, LANDMARK',regionId:'region id',bounds:{min:[],max:[]},solid:false,walkable:false,supportId:'ground object id when gravity applies',reason:'placement reason',binding:{path:'owned source path',symbol:'actual symbol',sourceEvidence:'exact executable source excerpt'}}],
  connections:[{id:'stable id',from:'object id',to:'object id',kind:'WALK, RAMP, STAIRS, JUMP, TELEPORT, INTERACT, TRIGGER, SPAWN, PATROL, PARENT, SIGHTLINE',path:[['feet position per dimension']],reason:'causal connection',binding:{path:'owned source path',symbol:'actual symbol',sourceEvidence:'exact executable source excerpt'}}],
  entryId:'spawn object id',objectiveIds:['required reachable object ids']
});

// 공식 기능 설명은 설계 참고이며 우리 게임에서 검증된 학습 경험으로 취급하지 않는다.
export const GAME_CONVENIENCE_REFERENCES=Object.freeze([
  {id:'BUILD_PRESETS',match:/equip|artifact|loadout|build|장비|성유물|세팅|빌드/i,game:'Genshin Impact',sourceUrl:'https://genshin.hoyoverse.com/en/news/detail/156641',observedAt:'2026-10-07',principle:'Save and switch a player-selected equipment setup.',adaptation:'Compare changes before applying; preserve unavailable-item, combat and save restrictions.'},
  {id:'CONDITIONAL_LOOT_FILTER',match:/loot|inventory|item|drop|전리품|인벤토리|아이템|드롭/i,game:'Diablo IV',sourceUrl:'https://news.blizzard.com/en-us/article/24267729/prepare-for-the-reckoning-lord-of-hatred-draws-near',observedAt:'2026-10-07',principle:'Reusable conditions reduce irrelevant loot information; filters can be shared.',adaptation:'Expose filter state and reset; filtering must not delete rewards or silently auto-sell.'},
  {id:'QUEST_CONTEXT_SHORTCUT',match:/quest|schedule|time.?of.?day|퀘스트|의뢰|시간대/i,game:'Genshin Impact',sourceUrl:'https://genshin.hoyoverse.com/en/news/detail/157683',observedAt:'2026-10-07',principle:'A quest can offer the relevant time adjustment directly.',adaptation:'Deep-link to the existing permitted action and return to the same quest/filter/scroll position; never bypass quest prerequisites.'},
  {id:'TRAVEL_FAVORITES',match:/travel|teleport|explor|region|이동|탐험|지역|순간이동/i,game:"No Man's Sky",sourceUrl:'https://www.nomanssky.com/worlds-part-ii-update/',observedAt:'2026-10-07',principle:'Favorite destinations reduce repeated searching in travel menus.',adaptation:'Pin frequent destinations while preserving unlock, cost and travel restrictions.'},
  {id:'RECIPE_BATCH_WORKFLOW',match:/craft|recipe|cook|제작|레시피|요리/i,game:"No Man's Sky",sourceUrl:'https://www.nomanssky.com/worlds-part-ii-update/',observedAt:'2026-10-07',principle:'Recipe catalogue improvements and bulk food donation reduce repeated management.',adaptation:'Show required/missing ingredients and aggregate cost; exclude locked items and revalidate the whole batch before committing.'},
  {id:'PARAMETRIC_BUILD_PREVIEW',match:/factory|construct|blueprint|building|공장|건설|건축|설계도/i,game:'Factorio 2.0',sourceUrl:'https://www.factorio.com/blog/post/fff-392',observedAt:'2026-10-07',principle:'Reusable construction plans accept parameters and derive dependent choices with a preview.',adaptation:'Preview placement, support, collision and cost; preserve simulation authority and explain unresolved dependencies.'}
]);

// 메뉴 도안: 장르별 실제 행동을 화면·버튼·복귀 관계로 연결한다. 게임 상태 변경은 기존 책임 코드가 소유한다.
export function buildInterfaceBlueprintContract({design={},files=[],mode='',focus='',enabled=false}={}){
  if(!enabled||mode==='EXISTING_SOURCE_REPAIR')return null;
  const requirements={identity:design.identity,genre:design.genre,coreLoop:design.coreLoop,systems:design.systemInterconnections,ux:design.uxAccessibilityPlan||{},mobileUx:design.mobileUx};
  const systemText=JSON.stringify([design.coreLoop,design.signatureSystems,design.systemInterconnections,design.uxAccessibilityPlan]);
  const referencePatterns=GAME_CONVENIENCE_REFERENCES.filter(row=>row.match.test(systemText)).map(({match,...row})=>({...row,authority:'DESIGN_REFERENCE_ONLY',runtimeVerified:false}));
  return{version:1,required:clean(focus).toUpperCase()==='USABILITY',designFingerprint:hash(JSON.stringify(requirements)),requirements,referencePatterns,sourceFiles:files,
    selectionRule:'Choose one observed player friction owned by these files. Explain applicability from existing systems, compare alternatives and record rejected patterns; do not add every reference feature.',
    scope:'TASK_LOCAL_SCREENS_AND_EXISTING_ENTRY_RETURN_BOUNDARIES',
    schema:{version:1,designFingerprint:'exact contract fingerprint',viewport:{width:390,height:844,safeTop:0,safeBottom:0},entryId:'first screen',
      screens:[{id:'existing screen id',role:'MAIN_MENU or GAMEPLAY or INVENTORY or SHOP or QUEST or SETTINGS',modal:false,scrollable:false,contentHeight:844,
        controls:[{id:'existing control id',action:'existing gameplay action',feedback:'observable feedback',enabledWhen:'existing state guard',rect:{x:0,y:0,width:44,height:44},binding:{path:'source file',symbol:'event handler',sourceEvidence:'exact event/handler source'}}]}],
      transitions:[{from:'screen id',controlId:'control id',to:'screen id',kind:'OPEN or BACK or CLOSE or ACTION',preservesState:true}],
      playerTasks:[{id:'frequent player intent',friction:'observed repeated work or information gap',patternId:'reference id or ORIGINAL',adaptation:'why this game needs it',from:'screen id',to:'completion screen',controlId:'completion action',maxNavigationSteps:2,retainedContext:['selection','filter','scroll','draft'],failureRecovery:'existing safe recovery',runtimeCheck:'exact-build input sequence and observable result; compare before/after without invented measurements'}]},
    learningRule:'Reference descriptions and static plans are hypotheses. Reuse through existing verified experience only after exact-build gameplay evidence; retain failures and reject regressions. Recheck dated references before calling them current.',
    preserve:['SAVE','PROGRESSION','COMBAT_RETURN_RESTRICTIONS','DISABLED_ACTION_GUARDS','EXISTING_MENU_IDENTITIES'],runtimeVerified:false};
}

export function validateInterfaceBlueprint({contract=null,blueprint=null,sourceFiles={}}={}){
  if(!contract||(!contract.required&&!blueprint))return{required:false,pass:true,status:'NOT_REQUIRED',runtimeVerified:false};
  const issues=[],add=(code,id='')=>issues.push(code+(id?':'+id:''));
  if(!blueprint||typeof blueprint!=='object'||Array.isArray(blueprint))return{required:true,pass:false,issues:['INTERFACE_BLUEPRINT_MISSING'],runtimeVerified:false};
  const b=blueprint,v=b.viewport||{},screens=list(b.screens),transitions=list(b.transitions),map=new Map(),graph=new Map();
  if(b.version!==1||b.designFingerprint!==contract.designFingerprint)add('INTERFACE_IDENTITY_MISMATCH');
  if(!['width','height','safeTop','safeBottom'].every(k=>typeof v[k]==='number'&&Number.isFinite(v[k]))||v.width<=0||v.height<=0||v.safeTop<0||v.safeBottom<0||v.safeTop+v.safeBottom>=v.height)add('VIEWPORT_INVALID');
  const files=sourceFiles instanceof Map?sourceFiles:new Map(Object.entries(sourceFiles));
  for(const screen of screens){
    if(!screen||!clean(screen.id)||map.has(screen.id)){add('SCREEN_ID_INVALID');continue;}map.set(screen.id,screen);
    if(!clean(screen.role)||typeof screen.modal!=='boolean'||typeof screen.scrollable!=='boolean')add('SCREEN_ROLE_INVALID',screen.id);
    if(screen.scrollable&&(typeof screen.contentHeight!=='number'||!Number.isFinite(screen.contentHeight)||screen.contentHeight<v.height))add('SCROLL_EXTENT_INVALID',screen.id);
    const controls=new Set();
    for(const control of list(screen.controls)){
      if(!control||!clean(control.id)||controls.has(control.id)){add('CONTROL_ID_INVALID',screen.id);continue;}controls.add(control.id);
      const r=control.rect||{},binding=control.binding||{},file=spatialPath(binding.path),code=spatialSourceText(binding.sourceEvidence).trim();
      if(!clean(control.action)||!clean(control.feedback)||!clean(control.enabledWhen))add('CONTROL_BEHAVIOR_MISSING',control.id);
      if(!['x','y','width','height'].every(k=>typeof r[k]==='number'&&Number.isFinite(r[k]))||r.width<44||r.height<44||r.x<0||r.x+r.width>v.width||r.y<v.safeTop||r.y+r.height>(screen.scrollable?screen.contentHeight:v.height-v.safeBottom))add('TOUCH_TARGET_OR_SAFE_AREA_INVALID',control.id);
      if(!file||file.split('/').includes('..')||!list(contract.sourceFiles).some(own=>own===file||own.endsWith('/'+file))||!files.has(file)||code.length<8||!clean(binding.symbol)||!code.includes(binding.symbol)||!/[(=]/.test(code)||/^["'`]/.test(code)||!spatialSourceText(files.get(file)).includes(code))add('CONTROL_SOURCE_UNPROVEN',control.id);
    }
    const rows=list(screen.controls).filter(c=>c&&c.rect&&['x','y','width','height'].every(k=>Number.isFinite(c.rect[k])));
    for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){const a=rows[i].rect,z=rows[j].rect;if(a.x<z.x+z.width&&a.x+a.width>z.x&&a.y<z.y+z.height&&a.y+a.height>z.y)add('TOUCH_TARGET_OVERLAP',screen.id+':'+rows[i].id+':'+rows[j].id);}
  }
  for(const t of transitions){
    if(!t||!map.has(t.from)||!map.has(t.to)||!list(map.get(t.from).controls).some(c=>c?.id===t.controlId)||!['OPEN','BACK','CLOSE','ACTION'].includes(t.kind)){add('MENU_CONNECTION_INVALID');continue;}
    if(t.preservesState!==true)add('MENU_STATE_PRESERVATION_MISSING',t.from);
    graph.set(t.from,[...(graph.get(t.from)||[]),t.to]);
  }
  if(!map.has(b.entryId))add('MENU_ENTRY_MISSING');
  const reached=new Set([b.entryId]),queue=[b.entryId];for(let i=0;i<queue.length;i++)for(const next of graph.get(queue[i])||[])if(!reached.has(next)){reached.add(next);queue.push(next);}
  for(const screen of map.values()){
    if(!reached.has(screen.id))add('SCREEN_UNREACHABLE',screen.id);
    if(screen.modal&&!transitions.some(t=>t?.from===screen.id&&t.to!==screen.id&&['BACK','CLOSE'].includes(t.kind)))add('MODAL_EXIT_MISSING',screen.id);
  }
  if(!screens.some(s=>s?.role==='GAMEPLAY'))add('GAMEPLAY_SCREEN_MISSING');
  const taskRoutes=[],taskIds=new Set();
  if(!list(b.playerTasks).length)add('PLAYER_FRICTION_ANALYSIS_MISSING');
  for(const task of list(b.playerTasks)){
    if(!task||!clean(task.id)||taskIds.has(task.id)){add('PLAYER_TASK_ID_INVALID');continue;}taskIds.add(task.id);
    if(!['friction','adaptation','failureRecovery','runtimeCheck'].every(k=>clean(task[k]))||!list(task.retainedContext).length)add('PLAYER_TASK_REASONING_MISSING',task.id);
    if(task.patternId!=='ORIGINAL'&&!list(contract.referencePatterns).some(row=>row.id===task.patternId))add('REFERENCE_PATTERN_NOT_APPLICABLE',task.id);
    if(!map.has(task.from)||!map.has(task.to)||!list(map.get(task.to)?.controls).some(c=>c?.id===task.controlId)){add('PLAYER_TASK_ENDPOINT_INVALID',task.id);continue;}
    const distances=new Map([[task.from,0]]),pending=[task.from];
    for(let i=0;i<pending.length;i++)for(const next of graph.get(pending[i])||[])if(!distances.has(next)){distances.set(next,distances.get(pending[i])+1);pending.push(next);}
    const steps=distances.get(task.to);
    if(!Number.isInteger(task.maxNavigationSteps)||task.maxNavigationSteps<0||steps===undefined||steps>task.maxNavigationSteps)add('PLAYER_TASK_ROUTE_BUDGET_EXCEEDED',task.id);
    taskRoutes.push({id:task.id,patternId:task.patternId,navigationSteps:steps??null,measuredRuntimeInputs:null});
  }
  return{required:true,pass:!issues.length,status:issues.length?'REPAIR_REQUIRED':'STATIC_INTERFACE_PLAN_VALIDATED',issues:unique(issues),taskRoutes,blueprintHash:hash(JSON.stringify(b)),runtimeVerified:false};
}

// 유틸: 공간 계산은 축을 명시하고 평면/입체를 섞지 않는다. 점 샘플 대신 선분 전체를 검사한다.
const spatialPath=value=>String(value??'').replaceAll('\\','/').replace(/^\.\//,'');
const vector=(value,n)=>Array.isArray(value)&&value.length===n&&value.every(x=>typeof x==='number'&&Number.isFinite(x));
const box=(value,n)=>value&&vector(value.min,n)&&vector(value.max,n)&&value.min.every((v,i)=>v<=value.max[i]);
const inside=(a,b)=>a.min.every((v,i)=>v>=b.min[i]-1e-6&&a.max[i]<=b.max[i]+1e-6);
const center=b=>b.min.map((v,i)=>(v+b.max[i])/2);
const intersects=(a,b)=>a.min.every((v,i)=>v<b.max[i]-1e-6&&a.max[i]>b.min[i]+1e-6);
function segmentBox(a,b,bounds,axes){
  let lo=0,hi=1;
  for(const i of axes){
    const delta=b[i]-a[i];
    if(Math.abs(delta)<1e-9){if(a[i]<bounds.min[i]||a[i]>bounds.max[i])return null;continue;}
    const x=(bounds.min[i]-a[i])/delta,y=(bounds.max[i]-a[i])/delta;
    lo=Math.max(lo,Math.min(x,y));hi=Math.min(hi,Math.max(x,y));if(lo>hi)return null;
  }
  return[lo,hi];
}
function spatialSourceText(text){
  return String(text??'').replace(/--\[\[[\s\S]*?\]\]/g,'').replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*(?:--|\/\/|#|<!--).*$/gm,'');
}

// 메인 검증: 모델의 통과 주장 대신 치수·지지면·동선·오브젝트 참조와 실제 소스 바인딩을 검사한다.
export function validateSpatialBlueprint({contract=null,blueprint=null,sourceFiles={},changedFiles=[]}={}){
  if(!contract||(!contract.required&&!blueprint))return{required:false,pass:true,status:'NOT_REQUIRED',runtimeVerified:false};
  const issues=[],add=(code,id='')=>issues.push(code+(id?':'+id:''));
  if(!blueprint||typeof blueprint!=='object'||Array.isArray(blueprint))return{required:true,pass:false,issues:['SPATIAL_BLUEPRINT_MISSING'],runtimeVerified:false};
  const n=blueprint.dimension==='2D'?2:blueprint.dimension==='3D'?3:0;
  let b=blueprint;
  if(!n||b.version!==1)add('DIMENSION_OR_VERSION_INVALID');
  if(contract.dimension!=='SOURCE_BOUND_REQUIRED'&&b.dimension!==contract.dimension)add('DESIGN_DIMENSION_MISMATCH');
  if(b.designFingerprint!==contract.designFingerprint)add('DESIGN_FINGERPRINT_MISMATCH');
  if(!clean(b.units))add('WORLD_UNITS_MISSING');
  const views=n===3?['ISOMETRIC','PERSPECTIVE']:['TOP_DOWN','SIDE_VIEW','ISOMETRIC'];
  if(!views.includes(b.view))add('VIEW_DIMENSION_MISMATCH');
  const up=n===3?({Y:1,Z:2}[b.upAxis]):b.view==='SIDE_VIEW'&&b.upAxis==='Y'?1:-1;
  if(n===3&&up===undefined||n===2&&b.view==='SIDE_VIEW'&&up<0||n===2&&b.view!=='SIDE_VIEW'&&b.upAxis!=='NONE')add('UP_AXIS_INVALID');
  const gravity=Number.isInteger(up)&&up>=0,axes=Array.from({length:n},(_,i)=>i),ground=axes.filter(i=>!gravity||i!==up);
  if(b.upDirection!==undefined&&![1,-1].includes(b.upDirection))add('UP_DIRECTION_INVALID');
  if(gravity&&b.upDirection===-1){
    const flipBounds=value=>{if(!box(value,n))return value;const min=[...value.min],max=[...value.max];min[up]=-value.max[up];max[up]=-value.min[up];return{min,max};};
    b={...b,worldBounds:flipBounds(b.worldBounds),regions:list(b.regions).map(row=>row?{...row,bounds:flipBounds(row.bounds)}:row),objects:list(b.objects).map(row=>row?{...row,bounds:flipBounds(row.bounds)}:row),connections:list(b.connections).map(row=>row?{...row,path:list(row.path).map(point=>vector(point,n)?point.map((v,i)=>i===up?-v:v):point)}:row)};
  }
  const p=b.player||{};
  if(!['radius','height','maxStep','maxSlopeDegrees'].every(k=>typeof p[k]==='number'&&Number.isFinite(p[k]))||p.radius<=0||p.height<=0||p.maxStep<0||p.maxSlopeDegrees<0||p.maxSlopeDegrees>=90)add('PLAYER_DIMENSIONS_INVALID');
  if(!box(b.worldBounds,n))add('WORLD_BOUNDS_INVALID');
  const regions=list(b.regions),objects=list(b.objects),links=list(b.connections),regionMap=new Map(),objectMap=new Map(),ids=new Set();
  for(const r of regions){
    if(!clean(r?.id)||regionMap.has(r.id))add('REGION_ID_INVALID',r?.id);
    else regionMap.set(r.id,r);
    if(!box(r?.bounds,n)||!box(b.worldBounds,n)||!inside(r.bounds,b.worldBounds)||!clean(r.purpose))add('REGION_BOUNDS_OR_PURPOSE_INVALID',r?.id);
  }
  if(!regions.length||!objects.length)add('MACRO_SKETCH_EMPTY');
  for(const o of objects){
    if(!clean(o?.id)||objectMap.has(o.id))add('OBJECT_ID_INVALID',o?.id);else objectMap.set(o.id,o);
    const r=regionMap.get(o?.regionId);
    if(!box(o?.bounds,n)||!r||!box(r.bounds,n)||!inside(o.bounds,r.bounds))add('OBJECT_OUTSIDE_REGION',o?.id);
    if(!clean(o?.role)||!clean(o?.reason))add('OBJECT_DESIGN_REASON_MISSING',o?.id);
    if(typeof o?.solid!=='boolean'||typeof o?.walkable!=='boolean')add('COLLISION_ROLE_MISSING',o?.id);
  }
  const files=sourceFiles instanceof Map?sourceFiles:new Map(Object.entries(sourceFiles));
  const allowed=list(contract.sourceFiles).map(spatialPath),changed=new Set(changedFiles.map(spatialPath));let changedBinding=false;
  for(const row of [...objects,...links]){
    const binding=row?.binding||{},file=spatialPath(binding.path),evidence=spatialSourceText(binding.sourceEvidence).trim(),symbol=clean(binding.symbol);
    const scoped=allowed.some(own=>own===file||own.endsWith('/'+file));
    const text=spatialSourceText(files.get(file));
    if(!file||file.split('/').includes('..')||!scoped||!files.has(file))add('SOURCE_SCOPE_INVALID',row?.id);
    if(!symbol||evidence.length<8||/^["'`]/.test(evidence)||!/[=(]/.test(evidence)||!evidence.includes(symbol)||!text.includes(evidence))add('SOURCE_BINDING_UNPROVEN',row?.id);
    if(changed.has(file))changedBinding=true;
  }
  if(!changedBinding)add('SPATIAL_SOURCE_CHANGE_MISSING');
  const validObjects=objects.filter(o=>box(o?.bounds,n));
  if(n&&box(b.worldBounds,n)&&!issues.includes('PLAYER_DIMENSIONS_INVALID')){
    for(const o of validObjects){
      const actor=/^(SPAWN|NPC|ENEMY|GOAL)$/i.test(o.role);
      if(!actor)continue;
      const body={min:[...o.bounds.min],max:[...o.bounds.max]};
      for(const i of ground){const c=(body.min[i]+body.max[i])/2;body.min[i]=Math.min(body.min[i],c-p.radius);body.max[i]=Math.max(body.max[i],c+p.radius);}
      if(gravity)body.max[up]=Math.max(body.max[up],body.min[up]+p.height);
      if(!inside(body,b.worldBounds))add('PLAYER_VOLUME_OUTSIDE_WORLD',o.id);
      if(gravity){
        const support=objectMap.get(o.supportId);
        if(!support||!box(support.bounds,n)||support.walkable!==true||ground.some(i=>body.min[i]<support.bounds.min[i]-1e-6||body.max[i]>support.bounds.max[i]+1e-6)||Math.abs(body.min[up]-support.bounds.max[up])>1e-4)add('GROUND_SUPPORT_MISSING',o.id);
      }
      for(const solid of validObjects)if(solid.id!==o.id&&solid.solid===true&&intersects(body,solid.bounds))add('BODY_OR_HEADROOM_BLOCKED',o.id+'->'+solid.id);
    }
  }
  const traversable=new Set(['WALK','RAMP','STAIRS','JUMP','TELEPORT','PATROL']),kinds=new Set([...traversable,'INTERACT','TRIGGER','SPAWN','PARENT','SIGHTLINE']),graph=new Map();
  for(const link of links){
    if(!clean(link?.id)||ids.has(link.id))add('CONNECTION_ID_INVALID',link?.id);ids.add(link?.id);
    const from=objectMap.get(link?.from),to=objectMap.get(link?.to);
    if(!from||!to||!kinds.has(link?.kind)||!clean(link?.reason)){add('DANGLING_CONNECTION',link?.id);continue;}
    if(!traversable.has(link.kind))continue;
    const route=list(link.path);
    if(route.length<2||route.some(point=>!vector(point,n))){add('ROUTE_GEOMETRY_MISSING',link.id);continue;}
    const foot=o=>{const point=center(o.bounds);if(gravity)point[up]=o.bounds.min[up];return point;};
    if(!box(from.bounds,n)||!box(to.bounds,n))continue;
    for(const [point,o] of [[route[0],from],[route.at(-1),to]])if(point.some((v,i)=>Math.abs(v-foot(o)[i])>1e-4))add('ROUTE_ENDPOINT_MISMATCH',link.id);
    graph.set(link.from,[...(graph.get(link.from)||[]),link.to]);
    if(link.oneWay!==true)graph.set(link.to,[...(graph.get(link.to)||[]),link.from]);
    if(['JUMP','TELEPORT'].includes(link.kind))continue; // 실제 이동·착지·권한은 기존 엔진 런타임에서 검증한다.
    for(let j=1;j<route.length;j++){
      const a=route[j-1],z=route[j];
      for(const point of [a,z]){const body={min:point.map((v,i)=>v-(gravity&&i===up?0:p.radius)),max:point.map((v,i)=>v+(gravity&&i===up?p.height:p.radius))};if(box(b.worldBounds,n)&&!inside(body,b.worldBounds))add('ROUTE_OUTSIDE_WORLD',link.id);}
      if(gravity){
        const rise=Math.abs(z[up]-a[up]),run=Math.hypot(...ground.map(i=>z[i]-a[i]));
        if(link.kind==='RAMP'?Math.atan2(rise,run)*180/Math.PI>p.maxSlopeDegrees:rise>p.maxStep+1e-6)add('ROUTE_STEP_OR_SLOPE_EXCEEDED',link.id);
        const intervals=[];
        for(const floor of validObjects.filter(o=>o.walkable)){
          const inset={min:floor.bounds.min.map((v,i)=>v+(i===up?0:p.radius)),max:floor.bounds.max.map((v,i)=>v-(i===up?0:p.radius))};
          if(ground.some(i=>inset.min[i]>inset.max[i]))continue;
          const range=segmentBox(a,z,inset,ground);if(!range)continue;
          if(range.every(t=>Math.abs(a[up]+(z[up]-a[up])*t-floor.bounds.max[up])<=p.maxStep+1e-4))intervals.push(range);
        }
        let reach=0;for(const [lo,hi] of intervals.sort((x,y)=>x[0]-y[0])){if(lo>reach+1e-6)break;reach=Math.max(reach,hi);}
        if(reach<1-1e-6)add('UNSUPPORTED_ROUTE_GAP',link.id);
      }
      for(const obstacle of validObjects.filter(o=>o.solid)){
        const expanded={min:obstacle.bounds.min.map((v,i)=>v-(gravity&&i===up?p.height:p.radius)+1e-6),max:obstacle.bounds.max.map((v,i)=>v+(gravity&&i===up?0:p.radius)-1e-6)};
        if(segmentBox(a,z,expanded,axes))add('ROUTE_CLEARANCE_BLOCKED',link.id+'->'+obstacle.id);
      }
    }
  }
  if(!objectMap.has(b.entryId)||!/^(SPAWN)$/i.test(objectMap.get(b.entryId)?.role))add('SPAWN_ENTRY_MISSING');
  if(!list(b.objectiveIds).length)add('OBJECTIVES_MISSING');
  const reached=new Set([b.entryId]),queue=[b.entryId];for(let i=0;i<queue.length;i++)for(const next of graph.get(queue[i])||[])if(!reached.has(next)){reached.add(next);queue.push(next);}
  for(const id of list(b.objectiveIds))if(!objectMap.has(id)||!reached.has(id))add('OBJECTIVE_UNREACHABLE',id);
  return{required:true,pass:issues.length===0,status:issues.length?'REPAIR_REQUIRED':'STATIC_GEOMETRY_AND_SOURCE_BOUND',issues:unique(issues),dimension:b.dimension,designFingerprint:contract.designFingerprint,objectCount:objects.length,connectionCount:links.length,blueprintHash:hash(JSON.stringify(blueprint)),runtimeVerified:false,runtimeChecks:contract.runtimeChecks};
}

// 메인: 같은 장르 계획을 플랫폼별 실제 책임 파일에 연결한다.
export function buildRobloxProductionPlan({gameId='',platform='',design={},source={},sourceRoot='',responsibleFiles=[],previousPlan=null,focus='',repair=false,safeDesignlessMode=false,policy={}}={}){
  const requested=clean(platform).toUpperCase();
  const target=['UNITY_WEB','UNITY_APP'].includes(requested)?'UNITY':requested;
  if(!list(policy.platforms||['ROBLOX']).includes(target)||policy.status!=='ACTIVE_EXECUTABLE_CONTRACT')return null;
  const id=clean(gameId),root=(target==='ROBLOX'?'roblox-games/':target==='UNITY'?'unity-games/':'web-games/')+id+'/';
  if(!/^[a-z0-9][a-z0-9-]*$/i.test(id))return null;
  const observedRoot=clean(sourceRoot||source.sourceRoot).replaceAll('\\','/').replace(/\/$/,'');
  const roots=[root,...(target==='WEB'&&observedRoot===id?[id+'/']:[])];
  const extensions=target==='ROBLOX'?/\.luau?$/i:target==='UNITY'?/\.(?:cs|unity|prefab|mat|anim|controller|asset|uxml|uss|shader)$/i:/\.(?:html?|css|[cm]?js|tsx?|jsx|json|svg)$/i;
  const files=unique([...responsibleFiles,...list(source.topFiles).map(row=>row.file)])
    .filter(file=>roots.some(prefix=>file.startsWith(prefix))&&extensions.test(file)&&!file.split('/').includes('..'));
  if(!files.length)return null;
  const roles=files.map(file=>({file,role:sourceRole(file,target)}));
  const explicit=clean([design.genre,design.subgenre].filter(Boolean).join(' '));
  const identity=clean(design.identity)||id;
  const selected=ROBLOX_PRODUCTION_PROFILES.find(row=>row.pattern.test(explicit))
    ||(!explicit?ROBLOX_PRODUCTION_PROFILES.find(row=>row.pattern.test(identity)):null);
  const presentationOnly=['PRESENTATION','USABILITY'].includes(clean(focus).toUpperCase());
  const sourceOnly=safeDesignlessMode||clean(focus).toUpperCase()==='STABILITY';
  const mode=sourceOnly?'EXISTING_SOURCE_REPAIR':presentationOnly?'EXISTING_PLAY_PRESENTATION':'CONNECTED_CONTENT_IMPLEMENTATION';
  const coreLoop=unique(list(design.coreLoop));
  const systems=list(design.signatureSystems).map(row=>clean(row.name)).filter(Boolean);
  const genreProfile=selected?.id||'DESIGN_DEFINED';
  const ownerFeatureChanges=latestOwnerChanges(design.ownerFeatureChanges);
  const ownerChangeFingerprint=hash(JSON.stringify(ownerFeatureChanges));
  const currentPrevious=previousPlan?.ownerChangeFingerprint===ownerChangeFingerprint
    &&(previousPlan.platform||'ROBLOX')===target&&previousPlan.gameId===id?previousPlan:null;
  const ideaRows=sourceOnly?[['SOURCE_REPAIR','현재 책임 소스에서 관찰된 실패 원인을 직접 수정한다.','새 규칙이나 콘텐츠를 추가하지 않는다.']]
    :presentationOnly?[['PLAY_READABILITY','현재 핵심 행동과 결과가 월드·모션·터치 UI에서 명확하게 읽히도록 연결한다.','판정·보상·저장 규칙은 유지하고 표현만 개선한다.']]
    :selected?.ideas||[['APPROVED_CORE_LOOP','승인된 핵심 루프에서 끊긴 행동·결과·다음 목표를 연결한다.','장르를 추측해 전투·수집·경제를 추가하지 않는다.']];
  const ideas=ideaRows.map(([key,implementation,distinction])=>({id:genreProfile+':'+key,implementation,distinction}));
  const prior=ideas.find(row=>row.id===currentPrevious?.selectedIdea?.id);
  const used=unique(list(currentPrevious?.ideaHistory)).filter(key=>ideas.some(row=>row.id===key));
  const available=ideas.filter(row=>!used.includes(row.id));
  const pool=available.length?available:ideas.filter(row=>row.id!==prior?.id);
  const options=pool.length?pool:ideas;
  const index=parseInt(hash(id+'|'+identity+'|'+explicit).slice(0,8),16)%options.length;
  const chosen=repair&&prior?prior:options[index];
  const allowedRoles=target==='ROBLOX'
    ?(presentationOnly?['CLIENT_PRESENTATION','SHARED_DEFINITION']:['SERVER_AUTHORITY','CLIENT_PRESENTATION','SHARED_DEFINITION'])
    :target==='UNITY'?['GAMEPLAY_STATE','CLIENT_PRESENTATION','SHARED_DEFINITION']:['GAMEPLAY_AND_PRESENTATION','CLIENT_PRESENTATION','SHARED_DEFINITION'];
  const packages=allowedRoles.map(role=>({role,files:roles.filter(row=>row.role===role).map(row=>row.file),
    implementation:presentationOnly?'이 파일의 기존 입력·렌더·모션·UI 책임 블록만 개선하고 게임 상태·보상·저장 의미는 유지한다.':role==='SERVER_AUTHORITY'||role==='GAMEPLAY_STATE'||role==='GAMEPLAY_AND_PRESENTATION'?chosen.implementation+' 기존 행동·상태·보상·후속 목표 처리에 연결한다.':role==='CLIENT_PRESENTATION'?'기존 입력·월드·HUD에서 같은 행동의 조건과 결과를 표현한다.':'기존 콘텐츠 정의와 안정된 ID를 재사용해 행동·조건·결과를 연결한다.'}))
    .filter(row=>row.files.length);
  return {
    version:3,executionBoundary:'EXISTING_BUILD_UP_ONLY',platform:target,executionSurface:requested,mode,gameId:id,genreProfile,
    conceptIdentity:identity,coreAction:selected?.action||coreLoop[0]||'승인된 핵심 행동',
    ownerFeatureChanges,ownerChangeFingerprint,
    systemConnection:sourceOnly?'현재 실패 원인 → 기존 행동 복구':presentationOnly?'기존 행동 → 상태별 표현/입력 피드백':selected?.connection||coreLoop.join(' → '),
    approvedCoreLoop:coreLoop,signatureSystems:systems,progressionDirection:clean(design.progressionDirection),
    depthAndReward:sourceOnly||presentationOnly?null:{progression:design.progressionEconomyBalance||{},expansion:list(design.contentExpansionPlan),riskAndRecovery:design.failureRetryRisk||{},
      rewardLayers:{core:'Preserve the approved MAIN and A/B/C combination and its meaningful choices.',smallJoys:'Short discoveries, collection, decoration or small goals should leave visible progress where genre-appropriate.',deepPlay:'Optional combination research, mastery, secrets and long-term challenges lead to meaningful unlocks or completion.'},
      rewardContract:['VISIBLE_ELIGIBILITY_AND_COST','SAVED_CUMULATIVE_PROGRESS','EXPLICIT_GUARANTEED_MILESTONE_WHEN_COMMITTED','HONEST_RANDOM_REWARD_ODDS_WHEN_APPLICABLE','DUPLICATE_REWARD_PURPOSE','INTERRUPTION_AND_RESUME','NO_DUPLICATE_CLAIM_OR_PROGRESS_LOSS'],
      systemicDepth:{entry:'Easy-to-understand core action with readable clues.',layers:['SYSTEM_INTERDEPENDENCE','CONTEXTUAL_TRADEOFFS','COMBINATORIAL_NEW_USES','MULTIPLE_VIABLE_SOLUTIONS','MASTERY_CHANGES_CHOICES','DISCOVERY_OPENS_NEXT_QUESTION'],
        interpretation:'Depth comparable to studying a rich discipline means the game itself is worth investigating; it does not require teaching academic subjects or inserting science themes.',
        validation:'Compare concrete situations before and after understanding a relation. Check dominant strategies, exploit loops, softlocks and cognitive load; feature count and grinding are not depth.'},
      rule:'For this task connect a discoverable clue -> meaningful experiment or mastery choice -> cost/counterplay -> new action, route, combination or world relationship -> next question. Rewards must change play, not only numbers or item counts. Explain rejected alternatives, preserve existing balance/save/genre, and expose discovered knowledge or comparisons through relevant menus without spoiling undiscovered answers.',
      validation:'Name the prior play limitation, the new player choice and exact runtime evidence. Do not claim deeper play from added text, rewards or menu count alone.'},
    ideas,selectedIdea:chosen,ideaHistory:unique([...(available.length||repair?used:[]),chosen.id]),
    implementationPackages:packages,sourceTreeFingerprint:clean(source.sourceTreeFingerprint),
    spatialBlueprintContract:buildSpatialBlueprintContract({design,source,files,mode,platform:target,enabled:policy.spatialBlueprint?.enabled===true}),
    interfaceBlueprintContract:buildInterfaceBlueprintContract({design,files,mode,focus,enabled:policy.spatialBlueprint?.enabled===true}),
    qualityContract:{
      reference:'SAME_CONNECTED_PLAY_AND_PRESENTATION_STANDARD_AS_ROBLOX',
      implementation:target==='UNITY'?'EXISTING_CSHARP_SCENE_PREFAB_AND_ASSET_BINDINGS':target==='WEB'?'EXISTING_BROWSER_GAME_SOURCE_AND_RESOURCE_BINDINGS':'EXISTING_LUAU_SERVER_CLIENT_AND_ASSET_BINDINGS',
      required:['CONNECTED_PLAYER_ACTION_STATE_FEEDBACK_AND_NEXT_GOAL','COMPATIBLE_INTERNAL_ASSETS_ACTUALLY_BOUND','MOTION_AUDIO_VFX_LINKED_TO_EXISTING_GAME_STATE_WHEN_APPLICABLE','MOBILE_TOUCH_AND_SCREEN_READABILITY','EXACT_CHANGED_BUILD_RUNTIME_AND_SAVE_REGRESSION'],
      runtimeSurface:target==='UNITY'?(requested==='UNITY_WEB'?'UNITY_WEBGL_ACTUAL_BROWSER_PLAY':'UNITY_NATIVE_AND_ANDROID_WHEN_TARGETED'):target==='WEB'?'ACTUAL_BROWSER_PLAY':'ROBLOX_OPEN_CLOUD_EXACT_CANDIDATE',
      markerOnlyCompletionAllowed:false,runtimeVerified:false
    },
    handoffRule:'Use the observed files and symbols within the existing allowed write scope. Reuse existing event/data contracts; missing context is not permission to invent an API or edit another file.',
    contentRule:sourceOnly?'REPAIR_EXISTING_BEHAVIOR_ONLY':presentationOnly?'PRESENT_EXISTING_BEHAVIOR_ONLY':'CONNECT_ONE_PLAYABLE_CONTENT_PACKAGE_TO_EXISTING_CORE_LOOP',
    preservation:['APPROVED_CONCEPT','APPROVED_GENRE','STYLE_LOCK','SAVE_IDENTITY','BALANCE_AND_ECONOMY_MEANING','SERVER_AUTHORITY'],
    newWorkflow:false,newQaStage:false,implementationStatus:'PLANNED_NOT_IMPLEMENTED'
  };
}

// 작업 지시: 정상 생성과 재시도 모두 같은 계획·소스 권한을 유지한다.
export function productionBlueprintContractsForFiles(plan,{responsibleFiles=[]}={}){
  const owns=file=>!responsibleFiles.length||responsibleFiles.some(relative=>file===spatialPath(relative)||file.endsWith('/'+spatialPath(relative)));
  const packages=list(plan?.implementationPackages).map(row=>({...row,files:list(row.files).filter(owns)})).filter(row=>row.files.length);
  const files=packages.flatMap(row=>row.files);
  const anchors=list(plan?.spatialBlueprintContract?.macroSketch?.sourceAnchors).filter(row=>owns(row.file||''));
  const spatialOwner=files.some(file=>/(?:world|environment|terrain|level|map|spawn|scene|game|index|bootstrap|init)[^/]*\.(?:[cm]?js|tsx?|jsx|html?|luau?|cs|unity|prefab)$/i.test(file.split('/').at(-1)))||anchors.some(row=>/world|region|terrain|spawn|layout|route|map|scene|환경|배치|지형/i.test(row.symbol||''));
  const interfaceOwner=packages.some(row=>['CLIENT_PRESENTATION','GAMEPLAY_AND_PRESENTATION'].includes(row.role))||files.some(file=>/ui|hud|menu|interface/i.test(file.split('/').at(-1)));
  const scoped=(contract,owner)=>contract?{
    ...contract,sourceFiles:files,required:contract.required===true&&owner&&files.length>0,
    ...(!owner&&contract.macroSketch?.proceduralWorldStudy?{macroSketch:{...contract.macroSketch,proceduralWorldStudy:undefined}}:{})
  }:null;
  return{spatial:scoped(plan?.spatialBlueprintContract,spatialOwner),interface:scoped(plan?.interfaceBlueprintContract,interfaceOwner)};
}
export function robloxProductionPromptLines(plan,{prefix='',responsibleFiles=[]}={}){
  if(!plan)return[];
  prefix=prefix||((plan.platform||'ROBLOX')+'_PRODUCTION_');
  const packages=list(plan.implementationPackages).map(row=>({...row,files:row.files.filter(file=>!responsibleFiles.length||responsibleFiles.some(owned=>{
    const path=clean(owned).replaceAll('\\','/').replace(/^\.\//,'');
    return path&&!path.split('/').includes('..')&&(file===path||file.endsWith('/'+path));
  }))})).filter(row=>row.files.length);
  const blueprints=productionBlueprintContractsForFiles(plan,{responsibleFiles});
  return [
    prefix+'CONCEPT='+JSON.stringify({genre:plan.genreProfile,identity:plan.conceptIdentity,mode:plan.mode,coreAction:plan.coreAction}),
    prefix+'IDEA='+JSON.stringify(plan.selectedIdea),
    prefix+'CONNECTION='+JSON.stringify({flow:plan.systemConnection,coreLoop:plan.approvedCoreLoop,systems:plan.signatureSystems,nextGoal:plan.progressionDirection}),
    prefix+'FILES='+JSON.stringify(packages),
    ...(plan.depthAndReward?[prefix+'DEPTH='+JSON.stringify(plan.depthAndReward)]:[]),
    ...(plan.interfaceBlueprintContract?[
      prefix+'INTERFACE='+JSON.stringify(blueprints.interface),
      prefix+'INTERFACE_RULE=For menu/usability work author interfaceBlueprint before edits. Cover only this task and its existing entry/return screens. Analyze repeated player work, select applicable reference principles or an original solution, and connect playerTasks to actual handlers and screen transitions. Consider reusable setups, conditional filters, contextual deep links, batch preview/commit, remembered work context and device-appropriate quick access. Preserve state guards, costs and rollback. Include feedback, back/close, touch and scroll. Static route length is not measured user effort or runtime PASS.'
    ]:[]),
    ...(plan.spatialBlueprintContract?[
      prefix+'SPATIAL='+JSON.stringify(blueprints.spatial),
      prefix+'SPATIAL_SCHEMA='+JSON.stringify(SPATIAL_BLUEPRINT_SCHEMA),
      prefix+'SPATIAL_RULE=When required=true, first author spatialBlueprint in the same candidate JSON, then implement it in existing source. Otherwise include a report only for relevant spatial changes. Scope the sketch to the owned task region and its existing entry/objective boundaries, not the entire game or sibling files. Use source dimensions, axis direction, units, player size and stable IDs. Draw regions before object bounds and typed connections. Preserve locations unless authorized. In 3D account for support, headroom, elevation, stairs, slopes, camera sightlines and swept clearance; in 2D distinguish top-down from side-view and layers. Bind each row to executable source. AABB checks are conservative and cannot prove curved terrain, ramps, jumps, engine physics or runtime PASS. For an explicitly approved new environment, derive seeded gradient-noise elevation and drainage by climate and biome; connect walkable road and optional routes before placing any building. Zone footprints by local function (housing, services and workshops), snap modular foundations/walls/openings/roofs to the existing grid, face door openings toward a traversable road, and preserve any reserved player/objective/interaction cells. Use local material and climate for architecture, keep a clear landmark sightline from a decision point, and budget cell/prop density, LOD and reusable mesh instances for mobile. These are authoring constraints, not proof of native instancing or runtime visibility; bind placements to real existing source and reject blocked routes instead of claiming PASS. An approved macroSketch.proceduralWorldStudy provides only bounded route and lot samples, not a full terrain mesh or a verified game implementation. If status is not STATIC_LAYOUT_PROPOSED, repair route or placement feasibility before using its layout; do not substitute the study for actual source implementation. Existing map repairs and presentation-only tasks must preserve established layout and gameplay state.'
    ]:[]),
    ...(plan.qualityContract?[prefix+'QUALITY='+JSON.stringify(plan.qualityContract)]:[]),
    ...list(plan.ownerFeatureChanges).map(change=>prefix+'OWNER='+JSON.stringify(change)+'; latest owner intent wins; REMOVE must not be restored by autonomous expansion; ADD/UPDATE must be preserved within this request scope.'),
    prefix+'SCOPE='+plan.contentRule+'; '+plan.handoffRule+' Preserve approved concept, style, balance, save and server authority. Independent files can proceed in parallel inside the existing worker; this is no new stage.'
  ];
}

