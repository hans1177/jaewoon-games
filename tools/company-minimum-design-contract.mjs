// 파일명: tools/company-minimum-design-contract.mjs
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const list=v=>Array.isArray(v)?v:[];
const MULTIPLAYER_MODES=new Set(['SINGLE','COOP','COMPETITIVE','HYBRID']);
export const MINIMUM_COMMON_FIELDS=Object.freeze([
  'identity','coreFun','coreLoop','signatureSystems','progressionDirection',
  'failureRetryRisk','multiplayerMode','technicalAssumptions'
]);
export const MINIMUM_PLATFORM_PROFILE_FIELDS=Object.freeze([
  'platform','inputModel','sessionModel','multiplayerRuntime','performanceBudget',
  'uiUx','saveAndNetwork','platformContentAdaptation','internalReleaseTarget','validationEvidence'
]);

function textReady(v,min=8){return clean(v).length>=min;}
function multiplayerModeReady(content={}){
  const declared=clean(content.multiplayerMode).toUpperCase();
  if(MULTIPLAYER_MODES.has(declared))return true;
  const canonicalProfileMode=clean(content.robloxBuildProfile?.playMode).toUpperCase();
  return MULTIPLAYER_MODES.has(canonicalProfileMode);
}
function commonReady(content={}){
  return textReady(content.identity,24)
    &&textReady(content.coreFun,20)
    &&list(content.coreLoop).filter(v=>textReady(v,6)).length>=3
    &&list(content.signatureSystems).filter(v=>v&&textReady(v.name,2)&&textReady(v.purpose,8)).length>=2
    &&textReady(content.progressionDirection,16)
    &&content.failureRetryRisk&&list(content.failureRetryRisk.failureStates).length>=2
    &&multiplayerModeReady(content)
    &&list(content.technicalAssumptions).filter(v=>textReady(v,8)).length>=2;
}
function platformProfileReady(profile={},platform=''){
  return clean(profile.platform).toUpperCase()===platform
    &&MINIMUM_PLATFORM_PROFILE_FIELDS.filter(k=>k!=='platform').every(k=>textReady(profile[k],8));
}
export function evaluateMinimumDesignContract(record={}){
  const content=record?.content&&typeof record.content==='object'?record.content:record;
  const profiles=content?.platformProfiles&&typeof content.platformProfiles==='object'?content.platformProfiles:{};
  const common=commonReady(content||{});
  const roblox=platformProfileReady(profiles.ROBLOX||{},'ROBLOX');
  const unity=platformProfileReady(profiles.UNITY||{},'UNITY');
  const distinct=roblox&&unity&&JSON.stringify(profiles.ROBLOX)!==JSON.stringify(profiles.UNITY);
  const blockers=[];
  if(!common)blockers.push('MINIMUM_COMMON_CORE_INCOMPLETE');
  if(!roblox)blockers.push('ROBLOX_PLATFORM_PROFILE_INCOMPLETE');
  if(!unity)blockers.push('UNITY_PLATFORM_PROFILE_INCOMPLETE');
  if(roblox&&unity&&!distinct)blockers.push('PLATFORM_PROFILES_MUST_DIFFER');
  // 개발 착수 조건은 보존하고, 출시 전 확정할 다섯 설계 축을 별도로 전달한다.
  const releaseChecklist={
    identity:textReady(content.identity,24),
    coreLoop:list(content.coreLoop).filter(v=>textReady(v,6)).length>=3,
    sessionRules:list(content.failureRetryRisk?.failureStates).length>=2&&textReady(content.failureRetryRisk?.retryFlow||content.failureRetryRisk?.retryDirection,8),
    signatureSystems:list(content.signatureSystems).filter(v=>textReady(v?.name,2)&&textReady(v?.purpose,8)).length>=2,
    presentation:textReady(content.visualDirection,16)&&Boolean(content.artAudioDirection)&&Boolean(content.mobileUx)
  };
  return Object.freeze({
    version:1,
    pass:common&&roblox&&unity&&distinct,
    commonCoreReady:common,
    platformProfiles:{ROBLOX:roblox,UNITY:unity,distinct},
    releaseChecklist:Object.freeze(releaseChecklist),
    blockers:Object.freeze(blockers)
  });
}
// 메인: 바이브 개발 착수용 최소 설계. GAME_SEED의 검증 가능한 원본 의도만 사용하고 정밀 설계 PASS를 주장하지 않는다.
export function materializeVibeMinimumDesign({root='.',seed={},catalogGame={},date='',ownerResetAt=0}={}){
  const gameId=clean(seed?.gameId);
  if(!/^[a-z0-9][a-z0-9-]*$/.test(gameId)||clean(seed?.status).toUpperCase()!=='ACTIVE'){
    return {created:false,reason:'ACTIVE_GAME_SEED_REQUIRED'};
  }
  const existing=latestMinimumDesign(root,gameId);
  // 메인: 소유자 초기화보다 오래된 설계는 새 기본 설계 생성의 근거가 아니다.
  // 이미 작성한 같은 날짜의 설계나 유효한 최신 설계는 덮어쓰지 않는다.
  const resetAt=Number(ownerResetAt)||0;
  const resetDate=resetAt?new Date(resetAt).toISOString().slice(0,10):'';
  if(existing&&(!resetDate||String(existing.date)>resetDate))
    return{created:false,reason:'EXISTING_MINIMUM_DESIGN_PRESERVED',file:existing.file};
  const identity=clean(seed?.DISTINCT_IDENTITY||seed?.GAMEPLAY_SKETCH?.identityCore?.oneLineFantasy);
  const loop=list(seed?.CORE_LOOP).map(clean).filter(Boolean);
  const fun=list(seed?.CORE_FUN_TO_LEARN).map(clean).filter(Boolean);
  const mode=clean(seed?.MULTIPLAYER_DESIGN_MODE).toUpperCase();
  const sketch=seed?.GAMEPLAY_SKETCH||{};
  const sourceSystems=list(sketch?.flowArchitecture?.systemBlueprint?.requiredSystems)
    .filter(row=>textReady(row?.id,3)&&textReady(row?.purpose,16));
  if(!textReady(identity,24)||loop.length<3||fun.length<1||sourceSystems.length<2||!MULTIPLAYER_MODES.has(mode)){
    return {created:false,reason:'SOURCE_GROUNDED_MINIMUM_DESIGN_INPUT_INCOMPLETE'};
  }
  const kst=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'})
    .format(new Date());
  const designDate=clean(date)||kst;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(designDate))return{created:false,reason:'INVALID_DESIGN_DATE'};
  const file=path.join(root,'design',gameId,designDate,'design-revised.json');
  if(fs.existsSync(file))return{created:false,reason:'EXISTING_DESIGN_CANDIDATE_PRESERVED'};
  const savePolicy=clean(seed?.SAVE_POLICY)||'EXISTING_GAME_SAVE_SEMANTICS_PRESERVED';
  const sessionMinutes=Number(seed?.TARGET_SESSION_MINUTES);
  const sessionLabel=Number.isFinite(sessionMinutes)&&sessionMinutes>0
    ?'원본 목표 세션 '+sessionMinutes+'분을 참고하며 게임별 실제 종료 규칙은 원본에 따른다.'
    :'세션 길이와 종료는 해당 게임의 원본 구현·명시적 규칙에 따른다.';
  const systems=sourceSystems.slice(0,4).map(row=>({
    id:clean(row.id),
    name:clean(row.id).replaceAll('_',' '),
    purpose:clean(row.purpose),
    playerChoice:loop[1],
    source:'GAME_SEED.GAMEPLAY_SKETCH.flowArchitecture.systemBlueprint.requiredSystems'
  }));
  const single=mode==='SINGLE';
  const content={
    identity,
    coreFun:fun.join(' / ')+' — '+loop[1],
    coreLoop:loop,
    signatureSystems:systems,
    progressionDirection:list(sketch.progressionLayers).map(clean).filter(Boolean).join(' ')||loop.at(-1),
    failureRetryRisk:{
      failureStates:['핵심 목표 실패 또는 방어·생존·해결 미달: '+loop.at(-1),'위험·자원 압박으로 계획 변경이나 회복이 필요한 상태: '+loop[1]],
      retryFlow:'실패 사유를 표시하고 원본 게임의 복귀·재시도 규칙에 따라 동일 진행을 회복한다.',
      riskPressure:clean(sketch?.flowArchitecture?.failureModel?.contract)||'위험과 자원 압박은 실제 선택과 결과에 연결한다.',
      recoveryRules:'기존 진행도와 저장 키·경제·전투 규칙을 유지하고, 복구 가능한 상태에서 이어서 진행한다.'
    },
    multiplayerMode:mode,
    technicalAssumptions:[
      '기존 게임 코드와 소유자 GAME_SEED가 권위다. 공격력·체력·웨이브·드랍·보상 수치를 임의로 만들어 변경하지 않는다.',
      '기존 저장 키와 진행·퀘스트·장비 의미를 보존한다. 구조 변경이 필요할 때만 검증된 마이그레이션을 적용한다.',
      '최소 설계는 코딩 입력일 뿐 정밀 설계·실기기 실행·멀티·독립 QA 및 출시 PASS 증거가 아니다.'
    ],
    playerInput:'실제 입력은 '+loop[0]+' 및 '+loop[1]+'을 실행할 수 있어야 하며 모바일 터치 UI를 제공한다.',
    winLoseOrSessionEnd:'성공·실패·다음 선택은 '+loop.at(-1)+'의 결과에 연결한다. '+sessionLabel,
    coreNumbersAndBalance:{
      authority:'EXISTING_GAME_SOURCE_AND_OWNER_GAME_SEED',
      catalogScope:clean(catalogGame?.description)||'원본 게임 정의를 따른다.',
      existingBalanceRules:list(sketch.balanceRules).map(clean).filter(Boolean),
      inventedNumericValues:false
    },
    saveMeaning:savePolicy,
    coreContentScope:sourceSystems.map(row=>clean(row.id)),
    platformProfiles:{
      ROBLOX:{
        platform:'ROBLOX',
        inputModel:'Roblox 터치 버튼과 조이스틱, 키보드·게임패드를 원본 행동에 연결한다.',
        sessionModel:'Roblox 진입·복귀와 '+sessionLabel,
        multiplayerRuntime:single?'원본 싱글 규칙을 보존하고 멀티 기능을 임의로 추가하지 않는다.':'Roblox 서버 권한과 원본 '+mode+' 인원·동기화 규칙을 유지한다.',
        performanceBudget:'모바일 Roblox에서 로딩·드로우콜·이펙트와 입력 반응을 제한하여 점검한다.',
        uiUx:'Roblox 모바일 터치 안전영역과 읽을 수 있는 HUD, 버튼·메뉴를 제공한다.',
        saveAndNetwork:'서버 검증 원격 입력과 DataStore 저장으로 '+savePolicy+' 정책을 보존한다.',
        platformContentAdaptation:'같은 핵심 루프를 Roblox 원본 네이티브 월드와 UI로 구현한다.',
        internalReleaseTarget:'Roblox 비공개 플레이 가능 빌드와 실제 기능 확인을 목표로 한다.',
        validationEvidence:'실제 Roblox 실행, 입력·저장·원본 규칙·독립 QA·회귀 증거가 별도로 필요하다.'
      },
      UNITY:{
        platform:'UNITY',
        inputModel:'Unity Input System 터치·드래그·가상 조이스틱과 원본 행동을 연결한다.',
        sessionModel:'동일 원본 Unity 프로젝트의 WebGL 실제 브라우저 세션 진입·재시도·저장 복구를 검증한다.',
        multiplayerRuntime:single?'원본 싱글 진행을 유지하고 불필요한 네트워크 플레이를 강제하지 않는다.':'원본 '+mode+' 규칙을 Unity 쪽 권한 검증·동기화와 동일하게 적용한다.',
        performanceBudget:'Unity WebGL에 실제 3D 메시 월드·캐릭터·깊이·카메라·가림을 유지하고 모바일 브라우저 프레임·메모리를 검증한다.',
        uiUx:'화면 크기와 터치 안전영역에 적응하는 Unity 모바일 HUD를 제공한다.',
        saveAndNetwork:'버전 있는 저장 구조를 사용하고 '+savePolicy+' 의미를 유지한다.',
        platformContentAdaptation:'기존 공통 규칙을 Unity 네이티브 3D 씬·메시·프리팹으로 구현하고 같은 프로젝트에서 WebGL 빌드를 생성한다. 2D·2.5D 월드는 최종 금지다.',
        internalReleaseTarget:'Unity WebGL 3D 비공개 브라우저 검증만 진행하며 Unity Android는 오너 홀드를 유지한다.',
        validationEvidence:'실제 Unity WebGL 3D 메시·카메라·터치·저장·브라우저 플레이와 독립 QA·회귀 증거가 별도로 필요하다.'
      }
    }
  };
  const gate=evaluateMinimumDesignContract({content});
  if(!gate.pass)return{created:false,reason:'MINIMUM_DESIGN_CONTRACT_REJECTED',blockers:gate.blockers};
  const stamp=new Date().toISOString();
  const record={
    version:5,gameId,date:designDate,gameSeedId:clean(seed.seedId),
    productionClass:'DESIGN_ONLY',
    authorRole:'VIBE2_MINIMUM_DESIGN_PREPARATION',
    status:'MINIMUM_DEVELOPMENT_DESIGN_CANDIDATE',
    sourceAuthority:'OWNER_GAME_SEED_AND_EXISTING_GAME_IMPLEMENTATION',
    minimumDesignReady:true,strictDesignReviewed:false,strictDesignPass:false,
    independentQaPass:false,runtimePass:false,releasePass:false,
    designEvolutionNext:'GAME_DESIGNER_AI_STRICT_REVIEW_PARALLEL',
    content,createdAt:stamp,updatedAt:stamp
  };
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,JSON.stringify(record,null,2)+'\n','utf8');
  return {created:true,reason:'SOURCE_GROUNDED_MINIMUM_DESIGN_READY',
    file:path.relative(root,file).replaceAll('\\','/'),gate};
}

export function latestMinimumDesign(root='.',gameId=''){
  const gameRoot=path.join(root,'design',gameId);
  if(!fs.existsSync(gameRoot))return null;
  const dates=fs.readdirSync(gameRoot,{withFileTypes:true})
    .filter(e=>e.isDirectory()&&/^\d{4}-\d{2}-\d{2}$/.test(e.name))
    .map(e=>e.name).sort().reverse();
  for(const date of dates){
    const file=path.join(gameRoot,date,'design-revised.json');
    if(!fs.existsSync(file))continue;
    const record=JSON.parse(fs.readFileSync(file,'utf8'));
    const gate=evaluateMinimumDesignContract(record);
    if(gate.pass)return{date,file:path.relative(root,file).replaceAll('\\','/'),record,gate};
  }
  return null;
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const gameId=clean(process.argv.find(v=>v.startsWith('--game='))?.split('=')[1]||process.env.GAME_ID);
  if(!gameId)throw new Error('GAME_ID_REQUIRED');
  const latest=latestMinimumDesign('.',gameId);
  console.log(`MINIMUM_DESIGN_CONTRACT=${latest?'PASS':'PENDING'}`);
  if(latest){
    console.log(`MINIMUM_DESIGN_SOURCE=${latest.file}`);
    console.log(`MINIMUM_DESIGN_DATE=${latest.date}`);
  }
}
