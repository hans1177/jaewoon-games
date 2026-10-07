// 파일명: tools/company-roblox-production-plan.mjs
// 역할: 기존 로블 제작 계획을 웹·유니티의 같은 BUILD_UP 경로에서도 직접 사용한다.
// 원칙: 제작 계획은 실제 구현·런타임 통과 증거가 아니며 기존 책임 소스만 연결한다.
// 임포트
import crypto from 'node:crypto';

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

// 메인: 같은 장르 계획을 플랫폼별 실제 책임 파일에 연결한다.
export function buildRobloxProductionPlan({gameId='',platform='',design={},source={},sourceRoot='',responsibleFiles=[],previousPlan=null,focus='',repair=false,safeDesignlessMode=false,policy={}}={}){
  const requested=clean(platform).toUpperCase();
  const executionSurface=requested==='WEB'?'UNITY_WEB':requested;
  const target=['WEB','UNITY_WEB','UNITY_APP'].includes(requested)?'UNITY':requested;
  if(!list(policy.platforms||['ROBLOX']).includes(target)&&!(target==='UNITY'&&list(policy.platforms||[]).includes('WEB')))return null;
  if(policy.status!=='ACTIVE_EXECUTABLE_CONTRACT')return null;
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
    version:2,executionBoundary:'EXISTING_BUILD_UP_ONLY',platform:target,executionSurface,mode,gameId:id,genreProfile,
    conceptIdentity:identity,coreAction:selected?.action||coreLoop[0]||'승인된 핵심 행동',
    ownerFeatureChanges,ownerChangeFingerprint,
    systemConnection:sourceOnly?'현재 실패 원인 → 기존 행동 복구':presentationOnly?'기존 행동 → 상태별 표현/입력 피드백':selected?.connection||coreLoop.join(' → '),
    approvedCoreLoop:coreLoop,signatureSystems:systems,progressionDirection:clean(design.progressionDirection),
    ideas,selectedIdea:chosen,ideaHistory:unique([...(available.length||repair?used:[]),chosen.id]),
    implementationPackages:packages,sourceTreeFingerprint:clean(source.sourceTreeFingerprint),
    qualityContract:{
      reference:'SAME_CONNECTED_PLAY_AND_PRESENTATION_STANDARD_AS_ROBLOX',
      implementation:target==='UNITY'?'EXISTING_CSHARP_SCENE_PREFAB_AND_ASSET_BINDINGS':target==='WEB'?'EXISTING_BROWSER_GAME_SOURCE_AND_RESOURCE_BINDINGS':'EXISTING_LUAU_SERVER_CLIENT_AND_ASSET_BINDINGS',
      required:['CONNECTED_PLAYER_ACTION_STATE_FEEDBACK_AND_NEXT_GOAL','COMPATIBLE_INTERNAL_ASSETS_ACTUALLY_BOUND','MOTION_AUDIO_VFX_LINKED_TO_EXISTING_GAME_STATE_WHEN_APPLICABLE','MOBILE_TOUCH_AND_SCREEN_READABILITY','EXACT_CHANGED_BUILD_RUNTIME_AND_SAVE_REGRESSION'],
      runtimeSurface:target==='UNITY'?(executionSurface==='UNITY_WEB'?'UNITY_WEBGL_ACTUAL_BROWSER_PLAY':'UNITY_NATIVE_AND_ANDROID_WHEN_TARGETED'):'ROBLOX_OPEN_CLOUD_EXACT_CANDIDATE',
      canonicalGameplaySource:target==='UNITY'?'UNITY_CSHARP_SCENE_PREFAB_AND_ASSET_BINDINGS':'ROBLOX_LUAU_SERVER_CLIENT_AND_ASSET_BINDINGS',
      browserGameplaySourceAllowed:false,
      markerOnlyCompletionAllowed:false,runtimeVerified:false
    },
    handoffRule:'Use the observed files and symbols within the existing allowed write scope. Reuse existing event/data contracts; missing context is not permission to invent an API or edit another file.',
    contentRule:sourceOnly?'REPAIR_EXISTING_BEHAVIOR_ONLY':presentationOnly?'PRESENT_EXISTING_BEHAVIOR_ONLY':'CONNECT_ONE_PLAYABLE_CONTENT_PACKAGE_TO_EXISTING_CORE_LOOP',
    preservation:['APPROVED_CONCEPT','APPROVED_GENRE','STYLE_LOCK','SAVE_IDENTITY','BALANCE_AND_ECONOMY_MEANING','SERVER_AUTHORITY'],
    newWorkflow:false,newQaStage:false,implementationStatus:'PLANNED_NOT_IMPLEMENTED'
  };
}

// 작업 지시: 정상 생성과 재시도 모두 같은 계획·소스 권한을 유지한다.
export function robloxProductionPromptLines(plan,{prefix='',responsibleFiles=[]}={}){
  if(!plan)return[];
  prefix=prefix||((plan.platform||'ROBLOX')+'_PRODUCTION_');
  const packages=list(plan.implementationPackages).map(row=>({...row,files:row.files.filter(file=>!responsibleFiles.length||responsibleFiles.some(owned=>{
    const path=clean(owned).replaceAll('\\','/').replace(/^\.\//,'');
    return path&&!path.split('/').includes('..')&&(file===path||file.endsWith('/'+path));
  }))})).filter(row=>row.files.length);
  return [
    prefix+'CONCEPT='+JSON.stringify({genre:plan.genreProfile,identity:plan.conceptIdentity,mode:plan.mode,coreAction:plan.coreAction}),
    prefix+'IDEA='+JSON.stringify(plan.selectedIdea),
    prefix+'CONNECTION='+JSON.stringify({flow:plan.systemConnection,coreLoop:plan.approvedCoreLoop,systems:plan.signatureSystems,nextGoal:plan.progressionDirection}),
    prefix+'FILES='+JSON.stringify(packages),
    ...(plan.qualityContract?[prefix+'QUALITY='+JSON.stringify(plan.qualityContract)]:[]),
    ...list(plan.ownerFeatureChanges).map(change=>prefix+'OWNER='+JSON.stringify(change)+'; latest owner intent wins; REMOVE must not be restored by autonomous expansion; ADD/UPDATE must be preserved within this request scope.'),
    prefix+'SCOPE='+plan.contentRule+'; '+plan.handoffRule+' Preserve approved concept, style, balance, save and server authority. Independent files can proceed in parallel inside the existing worker; this is no new stage.'
  ];
}
