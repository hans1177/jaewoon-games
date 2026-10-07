import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadSeedState,activeSeedForGame} from './game-seed-state.mjs';
import {classifyRobloxGenre} from './roblox-genre-profile.mjs';

const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const clip=(value,max)=>clean(value).slice(0,max);
const MODES=new Set(['SINGLE','COOP','COMPETITIVE','HYBRID']);
const MULTIPLAYER_MODE_CONTRACT_DATE='2026-09-15';

function cloneObject(value){
  if(!value||Array.isArray(value)||typeof value!=='object')return {};
  return JSON.parse(JSON.stringify(value));
}
function firstText(...values){for(const value of values){const text=clean(value);if(text)return text;}return '';}
function factText(factPack,...keys){
  for(const key of keys){
    const direct=factPack?.[key];if(clean(direct))return clean(direct);
    const game=factPack?.game?.[key];if(clean(game))return clean(game);
    const design=factPack?.design?.[key];if(clean(design))return clean(design);
  }
  return '';
}
function seedLoop(seed){
  if(Array.isArray(seed?.CORE_LOOP))return seed.CORE_LOOP.map(clean).filter(Boolean).slice(0,8);
  const raw=clean(seed?.CORE_LOOP);if(!raw)return [];
  const split=raw.split(/(?:->|→|>|\||;|\n)/).map(clean).filter(Boolean);
  return split.length>=3?split.slice(0,8):[];
}
function seedMode(seed){
  const explicit=clean(seed?.MULTIPLAYER_DESIGN_MODE).toUpperCase();if(MODES.has(explicit))return explicit;
  const initial=clean(seed?.INITIAL_PLAY_MODE).toUpperCase();if(MODES.has(initial))return initial;
  return '';
}
function legacyDesignDate(date){
  const value=clean(date);
  return /^\d{4}-\d{2}-\d{2}$/.test(value)&&value<MULTIPLAYER_MODE_CONTRACT_DATE;
}
function designSignalText(value){
  const out=cloneObject(value);
  const signature=Array.isArray(out.signatureSystems)?out.signatureSystems.flatMap(row=>[row?.name,row?.purpose,row?.playerChoice]):[];
  return [out.identity,out.playerFantasy,out.coreFun,...(Array.isArray(out.coreLoop)?out.coreLoop:[]),...signature].map(clean).filter(Boolean).join(' ').toLowerCase();
}
function matchedSignals(text,patterns){
  return patterns.filter(([pattern])=>pattern.test(text)).map(([,name])=>name);
}
export function inferLegacyMultiplayerMode(value,{date=''}={}){
  const explicit=clean(value?.multiplayerMode).toUpperCase();
  if(MODES.has(explicit))return {mode:explicit,source:'EXPLICIT_DESIGN_MODE',signals:[]};
  if(!legacyDesignDate(date))return {mode:'',source:'',signals:[]};
  const text=designSignalText(value);
  const multiplayerContext=/\b(multiplayer|party|players?|peers?|opponents?|co-?op|cooperative|team)\b/i.test(text);
  if(!multiplayerContext)return {mode:'',source:'',signals:[]};
  const competitive=matchedSignals(text,[
    [/\brace\b/i,'race'],[/\bposition\b/i,'position'],[/\brank(?:ing)?\b/i,'rank'],[/\bleaderboard\b/i,'leaderboard'],
    [/\bversus\b|\bvs\.?\b/i,'versus'],[/\bwinner\b/i,'winner'],[/\bpvp\b/i,'pvp'],
  ]);
  const cooperative=matchedSignals(text,[
    [/\bco-?op\b|\bcooperative\b/i,'cooperative'],[/\bshared objective\b/i,'shared-objective'],
    [/\bwork together\b/i,'work-together'],[/\bteam objective\b/i,'team-objective'],[/\bteam up\b/i,'team-up'],
  ]);
  if(competitive.length>=2&&cooperative.length===0)return {mode:'COMPETITIVE',source:'LEGACY_DESIGN.COMPETITIVE_LOOP_SIGNALS',signals:competitive};
  if(cooperative.length>=2&&competitive.length===0)return {mode:'COOP',source:'LEGACY_DESIGN.COOPERATIVE_LOOP_SIGNALS',signals:cooperative};
  if(competitive.length>=2&&cooperative.length>=2)return {mode:'HYBRID',source:'LEGACY_DESIGN.HYBRID_LOOP_SIGNALS',signals:[...competitive,...cooperative]};
  return {mode:'',source:'',signals:[...competitive,...cooperative]};
}
function setMissing(out,key,value,max,repairs,source){
  if(clean(out?.[key])||value===undefined||value===null)return;
  const text=clip(value,max);if(!text)return;
  out[key]=text;repairs.push({field:key,source});
}
function setMissingArray(out,key,value,repairs,source,{min=0,max=8}={}){
  if(Array.isArray(out?.[key]))return;
  const items=Array.isArray(value)?value.map(clean).filter(Boolean).slice(0,max):[];
  if(items.length<min)return;
  out[key]=items;repairs.push({field:key,source});
}
function normalizeTraceabilityReferences(out,repairs){
  if(!Array.isArray(out?.implementationTraceability))return;
  let changed=false;
  const rows=out.implementationTraceability.map(row=>{
    if(!row||Array.isArray(row)||typeof row!=='object')return row;
    const responsibleSystem=clean(row.responsibleSystem);
    if(!responsibleSystem||responsibleSystem.length>=10)return row;
    changed=true;
    return {...row,responsibleSystem:`책임 시스템: ${responsibleSystem}`};
  });
  if(!changed)return;
  out.implementationTraceability=rows;
  repairs.push({field:'implementationTraceability',source:'EXISTING_DESIGN.RESPONSIBLE_SYSTEM_REFERENCE_NORMALIZATION'});
}
function robloxBuildProfile(out,seed,mode){
  if(!MODES.has(mode))return null;
  const classified=classifyRobloxGenre({
    category:clean(seed?.GAME_CATEGORY),
    identity:firstText(out?.identity,seed?.DISTINCT_IDENTITY),
    coreLoop:Array.isArray(out?.coreLoop)?out.coreLoop:seedLoop(seed),
    designText:JSON.stringify(out||{}),
    multiplayerMode:mode
  });
  const multiplayerRequired=mode!=='SINGLE';
  return {
    version:1,
    targetPlatform:'ROBLOX',
    taxonomy:classified.taxonomy,
    declaredGameCategory:clean(seed?.GAME_CATEGORY),
    genre:classified.genre,
    genreLabelKo:classified.genreLabelKo,
    subgenre:classified.subgenre,
    subgenreLabelKo:classified.subgenreLabelKo,
    playMode:mode,
    playModeLabelKo:classified.playModeLabelKo,
    multiplayerRequired,
    coopImplementationRequired:mode==='COOP'||mode==='HYBRID',
    competitiveImplementationRequired:mode==='COMPETITIVE'||mode==='HYBRID',
    networkingRequired:multiplayerRequired,
    multiplayerQaRequired:multiplayerRequired,
    minimumParticipantsForRequiredQa:multiplayerRequired?2:1,
    displayLabelKo:classified.displayLabelKo
  };
}
function dualPlatformProfiles(out,seed,mode){
  const session=firstText(seed?.TARGET_SESSION_DIRECTION,seed?.TARGET_SESSION_MINUTES&&`${seed.TARGET_SESSION_MINUTES} minute target session`,'repeatable sessions');
  const audience=firstText(seed?.TARGET_AUDIENCE,'general players');
  const commonCore=firstText(out?.coreFun,out?.identity,'approved core gameplay');
  const multiplayer=mode==='SINGLE'?'single-player authoritative local/session state':`${mode} multiplayer with authoritative server or validated network state`;
  return {
    ROBLOX:{
      platform:'ROBLOX',
      inputModel:'Roblox keyboard/gamepad plus touch-safe mobile controls using Roblox input and UI conventions.',
      sessionModel:`Roblox social session model: ${session}; fast join/rejoin and avatar-safe spawn flow for ${audience}.`,
      multiplayerRuntime:mode==='SINGLE'?'Roblox server still validates gameplay remotes; no false multiplayer claim.':`Roblox server-authoritative ${mode} replication with join/leave sync and RemoteEvent validation.`,
      performanceBudget:'Roblox mobile-first budget with bounded parts, draw calls, effects, replication traffic, memory and streaming distance.',
      uiUx:'Roblox ScreenGui/CoreGui-safe layout with mobile safe zones, readable touch actions, social/player-list compatibility.',
      saveAndNetwork:'Roblox DataStore-backed versioned save meaning plus server-validated remotes and rate limits when persistence/networking is required.',
      platformContentAdaptation:`Preserve ${commonCore}; adapt pacing, avatar scale, social discovery and short-session Roblox conventions without changing core rules.`,
      internalReleaseTarget:'Private or restricted Roblox experience that the owner/testers can launch in the Roblox app before public release.',
      validationEvidence:'Roblox publish identity + exact source revision + real runtime + independent QA + regression + private-play evidence.'
    },
    UNITY:{
      platform:'UNITY',
      inputModel:'Unity Input System with touch-first controls, safe-area UI, gamepad/keyboard fallback and app lifecycle-safe input recovery.',
      sessionModel:`Unity Android app session model: ${session}; suspend/resume, background/foreground recovery and offline/online transitions for ${audience}.`,
      multiplayerRuntime:mode==='SINGLE'?'Unity local authoritative gameplay state with no false networking claim.':`Unity app ${mode} networking using validated transport/session ownership, reconnect and join/leave synchronization.`,
      performanceBudget:'Android mobile budget covering memory, GPU, thermal load, battery, loading, texture/compression, pooling and GC pressure.',
      uiUx:'Responsive Unity UI with device safe areas, touch targets, orientation/readability rules and native-app pause/resume behavior.',
      saveAndNetwork:'Versioned local save plus validated backend/cloud synchronization only when required by the approved multiplayer/persistence design.',
      platformContentAdaptation:`Preserve ${commonCore}; adapt scenes, prefabs, camera, mobile pacing and app lifecycle without copying Roblox-only assumptions.`,
      internalReleaseTarget:'Internal or closed Android test build installable by the owner/testers before public store release.',
      validationEvidence:'Exact APK/AAB/source revision + install/launch + real runtime + independent QA + regression + internal-test evidence.'
    }
  };
}

const SHARED_PLATFORM_LARGE_FRAME=Object.freeze([
  'CORE_IDENTITY',
  'CORE_FUN_AND_REPRESENTATIVE_LOOP',
  'WORLD_AND_PROGRESSION_DIRECTION',
  'SAVE_PERSISTENCE_MEANING',
  'MULTIPLAYER_INTENT'
]);

function joined(values,fallback){
  const text=(Array.isArray(values)?values:[]).map(clean).filter(Boolean).join(' | ');
  return text||fallback;
}
function webCanonicalFallback(out,seed,mode){
  const loops=Array.isArray(out?.coreLoop)?out.coreLoop.map(clean).filter(Boolean).slice(0,8):[];
  const flow=[...loops];
  const fallbacks=[
    firstText(out?.coreFun,out?.identity,'핵심 행동을 시작하고 즉시 피드백을 받는다.'),
    firstText(out?.progressionDirection,'현재 결과를 다음 선택과 성장 상태로 연결한다.'),
    firstText(out?.failureRetryRisk?.retryFlow,'실패 또는 세션 종료 뒤 다음 유효 플레이 상태로 복귀한다.'),
    '세션 결과를 확인하고 다음 플레이 목표 또는 재진입 선택으로 이어간다.'
  ];
  for(const item of fallbacks)if(flow.length<4&&clean(item)&&!flow.includes(clean(item)))flow.push(clean(item));
  while(flow.length<4)flow.push('현재 플레이 상태를 읽고 다음 유효 행동과 결과 상태로 이어간다.');
  const systems=(Array.isArray(out?.signatureSystems)?out.signatureSystems:[]).map(row=>joined([row?.name,row?.purpose,row?.playerChoice],'')).filter(Boolean);
  const connections=(Array.isArray(out?.systemInterconnections)?out.systemInterconnections:[]).map(row=>joined([row?.fromSystem,row?.trigger,row?.toSystem,row?.stateChange],'')).filter(Boolean);
  const regions=(Array.isArray(out?.contentVarietyPlan?.regions)?out.contentVarietyPlan.regions:[]).map(row=>joined([row?.name,row?.traversal,row?.riskReward,row?.landmark,row?.encounterPattern,row?.resourcePressure],'')).filter(Boolean);
  const enemies=(Array.isArray(out?.contentVarietyPlan?.enemiesOrChallenges)?out.contentVarietyPlan.enemiesOrChallenges:[]).map(row=>joined([row?.name,row?.behavior,row?.counterplay,row?.groupRole,row?.rewardMeaning],'')).filter(Boolean);
  const expansion=(Array.isArray(out?.contentExpansionPlan)?out.contentExpansionPlan:[]).map(row=>joined([row?.milestone,row?.newGameplay,row?.systemImpact],'')).filter(Boolean);
  const economy=out?.progressionEconomyBalance&&typeof out.progressionEconomyBalance==='object'?out.progressionEconomyBalance:{};
  const failure=out?.failureRetryRisk&&typeof out.failureRetryRisk==='object'?out.failureRetryRisk:{};
  const ux=out?.uxAccessibilityPlan&&typeof out.uxAccessibilityPlan==='object'?out.uxAccessibilityPlan:{};
  const art=out?.artAudioDirection&&typeof out.artAudioDirection==='object'?out.artAudioDirection:{};
  const identity=firstText(out?.identity,seed?.DISTINCT_IDENTITY,'현재 게임 정체성');
  return{
    role:'WEB_DETAILED_GAME_ORIGINAL',
    designAuthority:'GAME_DESIGN_REFERENCE_NOT_SOURCE_CODE_AUTHORITY',
    playerFlow:flow.slice(0,8).map(value=>clip(value,340)),
    worldAndTraversal:clip(identity+'의 WEB 원본 월드는 '+joined(regions,'현재 설계의 지역 역할·랜드마크·접근 조건·위험보상·재방문 흐름')+'을 실제 플레이 동선으로 연결한다. 지역은 단순 배경이 아니라 이동 선택과 다음 목표를 바꾸는 플레이 공간으로 설계한다.',900),
    systemsAndContent:clip('핵심 시스템은 '+joined(systems,firstText(out?.coreFun,identity))+'. 시스템 연결은 '+joined(connections,'입력→상태 변화→피드백→보상/위험→다음 선택')+'으로 구성하고 지역·적·아이템·퀘스트·이벤트가 서로 원인과 결과를 주고받게 한다.',900),
    combatAndInteraction:clip('WEB 원본의 전투/상호작용은 '+firstText(out?.coreFun,'핵심 상호작용')+'을 중심으로 입력 조건, 판정, 자원/쿨다운, 적 또는 환경 반응, 카운터플레이, 성공/실패 결과와 피드백을 한 흐름으로 연결한다. 적/도전 역할은 '+joined(enemies,'게임에 맞는 서로 다른 역할과 대응법')+'로 구성한다.',900),
    progressionAndEconomy:clip(firstText(out?.progressionDirection,'성장은 다음 행동과 경로를 연다.')+' 진행 루프='+firstText(economy.progressionLoop,'플레이 결과가 다음 선택과 해금으로 이어진다.')+'; 자원 흐름='+firstText(economy.resourceFlow,'획득원과 소비처가 다음 선택에 의미를 만든다.')+'; 밸런스='+firstText(economy.balanceRules,'성장이 핵심 위험과 선택을 무효화하지 않게 한다.'),900),
    sessionFailureRecovery:clip('실패 상태='+joined(failure.failureStates,'게임별 실패 상태')+'; 재시도='+firstText(failure.retryFlow,'실패 후 다음 유효 플레이 상태로 복귀')+'; 위험='+firstText(failure.riskPressure,'선택에 따라 위험과 보상이 변함')+'; 복구='+firstText(failure.recoveryRules,'진행 의미를 보존하는 복구 흐름'),900),
    uiMenuAndOnboarding:clip(firstText(out?.mobileUx,'WEB에서 핵심 행동과 다음 목표를 즉시 읽을 수 있게 한다.')+' HUD='+firstText(ux.hudPriorities,'현재 상태와 목표 우선')+'; 조작='+firstText(ux.touchAndInput,'터치와 포인터 입력 분리')+'; 가독성='+firstText(ux.readability,'작은 화면에서도 상태를 구분')+'; 시작·계속·일시정지·설정·인벤토리·상점·퀘스트·사망/재시도 등 필요한 화면의 진입/복귀/잠금/오류 흐름을 연결한다.',900),
    inputCameraAccessibility:clip('입력='+firstText(out?.platformFitPlan?.inputModel,'터치/포인터/키보드 입력을 핵심 상태와 직접 연결')+'; 카메라는 핵심 행동·위험 신호·목표 공간을 가리지 않게 장르에 맞춰 추적/전환한다. 접근성='+firstText(ux.accessibility,'색상 외 중복 신호와 설정 분리')+'; 세션='+firstText(out?.platformFitPlan?.sessionConstraints,'중단과 복귀가 진행을 막지 않게 한다.'),900),
    presentationAndAudio:clip('시각='+firstText(out?.visualDirection,art.visualIdentity,'게임 정체성을 월드·캐릭터·UI에 일관되게 반영')+'; 오디오='+firstText(art.audioIdentity,'상태 전환과 위험/보상 신호를 구분')+'; 피드백='+firstText(art.gameplayFeedbackSync,'애니메이션·VFX·UI·사운드를 같은 게임 상태 변화에 동기화')+'. WEB은 검증용 축약본이 아니라 이 원형을 실제 플레이 가능한 표현으로 구체화한다.',900),
    multiplayerPersistence:clip('멀티 의도='+(mode||clean(out?.multiplayerMode)||'SINGLE')+'; '+firstText(out?.multiplayerExpansionDecision,'승인된 멀티 의도를 유지한다.')+' 저장/복구 의미는 유지하되 WEB 저장 기술과 재접속/중단 처리 방식은 WEB 특성에 맞게 설계한다.',900),
    expansionSpace:clip('WEB 자체 확장은 공통 큰틀 안에서 시스템·콘텐츠·지역·퀘스트·세션·UX·연출을 자유롭게 깊게 할 수 있다. 현재 확장 방향='+joined(expansion,'현재 핵심 루프를 더 깊게 연결하고 새로운 역할·상황·재방문 가치를 추가')+'. 다른 플랫폼과 세부 기능 수나 구조를 맞추기 위한 parity 제한은 두지 않는다.',900)
  };
}
function normalizeWebCanonicalAndExpansionPolicy(out,seed,mode,repairs){
  const fallback=webCanonicalFallback(out,seed,mode);
  const current=out?.webCanonicalDesign&&typeof out.webCanonicalDesign==='object'&&!Array.isArray(out.webCanonicalDesign)?out.webCanonicalDesign:{};
  const currentFlow=Array.isArray(current.playerFlow)?current.playerFlow.map(clean).filter(Boolean).slice(0,8):[];
  const next={
    role:'WEB_DETAILED_GAME_ORIGINAL',
    designAuthority:'GAME_DESIGN_REFERENCE_NOT_SOURCE_CODE_AUTHORITY',
    playerFlow:(currentFlow.length>=4?currentFlow:fallback.playerFlow).map(value=>clip(value,340)).slice(0,8),
    worldAndTraversal:clip(firstText(current.worldAndTraversal,fallback.worldAndTraversal),900),
    systemsAndContent:clip(firstText(current.systemsAndContent,fallback.systemsAndContent),900),
    combatAndInteraction:clip(firstText(current.combatAndInteraction,fallback.combatAndInteraction),900),
    progressionAndEconomy:clip(firstText(current.progressionAndEconomy,fallback.progressionAndEconomy),900),
    sessionFailureRecovery:clip(firstText(current.sessionFailureRecovery,fallback.sessionFailureRecovery),900),
    uiMenuAndOnboarding:clip(firstText(current.uiMenuAndOnboarding,fallback.uiMenuAndOnboarding),900),
    inputCameraAccessibility:clip(firstText(current.inputCameraAccessibility,fallback.inputCameraAccessibility),900),
    presentationAndAudio:clip(firstText(current.presentationAndAudio,fallback.presentationAndAudio),900),
    multiplayerPersistence:clip(firstText(current.multiplayerPersistence,fallback.multiplayerPersistence),900),
    expansionSpace:clip(firstText(current.expansionSpace,fallback.expansionSpace),900)
  };
  if(JSON.stringify(current)!==JSON.stringify(next)){
    out.webCanonicalDesign=next;
    repairs.push({field:'webCanonicalDesign',source:'DETAILED_WEB_GAME_ORIGINAL_FROM_APPROVED_DESIGN'});
  }
  const policy={
    mode:'SHARED_LARGE_FRAME_PLATFORM_NATIVE_EXPANSION',
    sharedLargeFrame:[...SHARED_PLATFORM_LARGE_FRAME],
    expansionLimit:'NO_ARTIFICIAL_PARITY_LIMIT_WITHIN_SHARED_LARGE_FRAME',
    webRule:'WEB은 상세 게임 원본을 자체 플레이 경험으로 계속 확장할 수 있다. 다른 플랫폼과 세부 기능·콘텐츠 수·UI 구조를 맞출 필요가 없고 명시된 owner/preservation lock만 따른다. Unity WebGL 소스 권한은 기존 중앙정책대로 동일 Unity 프로젝트에 남는다.',
    unityRule:'Unity는 WEB 상세 원본을 설계 출발점으로 해석하되 공통 큰틀만 유지한다. Unity 네이티브 조작·물리·카메라·공간·시스템·콘텐츠·세션·UX·연출 확장에는 인위적 parity 제한을 두지 않고 명시된 owner/preservation lock만 따른다.',
    robloxRule:'기존 Roblox 상세 설계와 platformProfiles.ROBLOX/robloxBuildProfile은 그대로 독립 기준으로 유지하고 WEB·Unity 세부 설계에 종속시키지 않는다. 공통 큰틀 안의 Roblox 네이티브 응용·확장에는 인위적 parity 제한을 두지 않는다.'
  };
  const currentPolicy=out?.platformExpansionPolicy&&typeof out.platformExpansionPolicy==='object'&&!Array.isArray(out.platformExpansionPolicy)?out.platformExpansionPolicy:{};
  if(JSON.stringify(currentPolicy)!==JSON.stringify(policy)){
    out.platformExpansionPolicy=policy;
    repairs.push({field:'platformExpansionPolicy',source:'SHARED_LARGE_FRAME_PLATFORM_NATIVE_EXPANSION_POLICY'});
  }
}

export function validateRobloxBuildProfile(profile,mode){
  const blockers=[];
  const expectedMode=clean(mode).toUpperCase();
  if(!profile||Array.isArray(profile)||typeof profile!=='object')return {valid:false,blockers:['object']};
  if(profile.targetPlatform!=='ROBLOX')blockers.push('targetPlatform');
  if(!MODES.has(expectedMode)||clean(profile.playMode).toUpperCase()!==expectedMode)blockers.push('playMode');
  if(!clean(profile.genre)||clean(profile.genre)==='Utility & other')blockers.push('genre');
  const multi=expectedMode!=='SINGLE';
  if(profile.multiplayerRequired!==multi)blockers.push('multiplayerRequired');
  if(profile.networkingRequired!==multi)blockers.push('networkingRequired');
  if(profile.multiplayerQaRequired!==multi)blockers.push('multiplayerQaRequired');
  if(profile.coopImplementationRequired!==(expectedMode==='COOP'||expectedMode==='HYBRID'))blockers.push('coopImplementationRequired');
  if(profile.competitiveImplementationRequired!==(expectedMode==='COMPETITIVE'||expectedMode==='HYBRID'))blockers.push('competitiveImplementationRequired');
  if(Number(profile.minimumParticipantsForRequiredQa)!==(multi?2:1))blockers.push('minimumParticipantsForRequiredQa');
  return {valid:blockers.length===0,blockers};
}

export function repairDesignRequiredFields(value,{seed={},factPack={},phase='UNKNOWN',designDate='',allowLegacyMultiplayerInference=false}={}){
  const out=cloneObject(value);const repairs=[];
  const loop=seedLoop(seed);const explicitDesignMode=clean(out.multiplayerMode).toUpperCase();let mode=MODES.has(explicitDesignMode)?explicitDesignMode:seedMode(seed);
  const identity=firstText(seed?.DISTINCT_IDENTITY,factText(factPack,'distinctIdentity','description'));
  const coreFun=firstText(seed?.CORE_FUN_TO_LEARN,loop.join(' → '),identity);
  const targetAudience=firstText(seed?.TARGET_AUDIENCE,factText(factPack,'targetAudience'));
  const targetPlatform=firstText(seed?.INITIAL_TARGET_PLATFORM,factText(factPack,'targetPlatform'));
  const market=firstText(seed?.MARKET_EVIDENCE_SUMMARY,factText(factPack,'marketEvidenceSummary'));
  const session=firstText(seed?.TARGET_SESSION_DIRECTION,factText(factPack,'targetSessionDirection'));
  const expansion=firstText(seed?.CROSS_PLATFORM_EXPANSION_VALUE,factText(factPack,'crossPlatformExpansionValue'));

  setMissing(out,'identity',identity,1000,repairs,'GAME_SEED.DISTINCT_IDENTITY');
  setMissing(out,'playerFantasy',firstText(seed?.CORE_FUN_TO_LEARN,identity),900,repairs,'GAME_SEED.CORE_FUN_TO_LEARN_OR_IDENTITY');
  setMissing(out,'coreFun',coreFun,900,repairs,'GAME_SEED.CORE_FUN_TO_LEARN_OR_CORE_LOOP');
  if((!Array.isArray(out.coreLoop)||out.coreLoop.length<3)&&loop.length>=3){out.coreLoop=loop;repairs.push({field:'coreLoop',source:'GAME_SEED.CORE_LOOP'});}
  setMissingArray(out,'signatureSystems',[],repairs,'STRUCTURAL_EMPTY_ALLOWED',{min:0,max:6});
  setMissing(out,'progressionDirection',session,900,repairs,'GAME_SEED.TARGET_SESSION_DIRECTION');
  setMissing(out,'visualDirection',firstText(factText(factPack,'visualDirection','artDirection'),identity&&`GAME_SEED 정체성 '${identity}'을 유지하는 시각 방향`),900,repairs,'FACT_PACK_OR_GAME_SEED_IDENTITY');
  setMissing(out,'mobileUx',targetPlatform&&`선택 플랫폼 ${targetPlatform}에서 핵심 조작과 정보 우선순위를 유지한다${targetAudience?`; 대상 ${targetAudience}`:''}`,900,repairs,'GAME_SEED.INITIAL_TARGET_PLATFORM_AND_TARGET_AUDIENCE');
  setMissing(out,'marketTargetDirection',firstText([market,targetAudience].filter(Boolean).join(' / '),targetAudience),900,repairs,'GAME_SEED.MARKET_EVIDENCE_SUMMARY_AND_TARGET_AUDIENCE');
  setMissing(out,'steamExpansionDecision',firstText(expansion,targetPlatform&&`선택 플랫폼 ${targetPlatform} 검증을 우선하고 추가 PC 확장은 검증 후 결정한다`),500,repairs,'GAME_SEED.CROSS_PLATFORM_EXPANSION_VALUE_OR_TARGET_PLATFORM');
  if(!MODES.has(clean(out.multiplayerMode).toUpperCase())&&mode){out.multiplayerMode=mode;repairs.push({field:'multiplayerMode',source:'GAME_SEED.MULTIPLAYER_DESIGN_MODE_OR_INITIAL_PLAY_MODE'});}
  if(!MODES.has(clean(out.multiplayerMode).toUpperCase())&&allowLegacyMultiplayerInference){
    const inferred=inferLegacyMultiplayerMode(out,{date:designDate});
    if(inferred.mode){mode=inferred.mode;out.multiplayerMode=mode;repairs.push({field:'multiplayerMode',source:inferred.source,signals:inferred.signals});}
  }
  if(MODES.has(clean(out.multiplayerMode).toUpperCase()))mode=clean(out.multiplayerMode).toUpperCase();
  setMissing(out,'multiplayerExpansionDecision',mode&&firstText(expansion,`${mode} 코어루프를 보존하며 확장은 별도 검증 후 결정한다`),500,repairs,'GAME_SEED_OR_LEGACY_MULTIPLAYER_MODE_AND_CROSS_PLATFORM_VALUE');
  const requireRobloxBuildProfile=['PRE_REVIEW','REVIEW_FEEDBACK'].includes(clean(phase).toUpperCase());
  if(requireRobloxBuildProfile&&MODES.has(mode)){
    const profile=robloxBuildProfile(out,seed,mode);
    if(JSON.stringify(out.robloxBuildProfile||null)!==JSON.stringify(profile)){out.robloxBuildProfile=profile;repairs.push({field:'robloxBuildProfile',source:'GAME_SEED+REVISED_DESIGN+ROBLOX_GENRE_TAXONOMY'});}
  }
  if(MODES.has(mode)){
    const profiles=dualPlatformProfiles(out,seed,mode);
    const current=out.platformProfiles&&typeof out.platformProfiles==='object'&&!Array.isArray(out.platformProfiles)?out.platformProfiles:{};
    const next={
      ROBLOX:{...profiles.ROBLOX,...(current.ROBLOX&&typeof current.ROBLOX==='object'?current.ROBLOX:{}),platform:'ROBLOX'},
      UNITY:{...profiles.UNITY,...(current.UNITY&&typeof current.UNITY==='object'?current.UNITY:{}),platform:'UNITY'}
    };
    if(JSON.stringify(current)!==JSON.stringify(next)){out.platformProfiles=next;repairs.push({field:'platformProfiles',source:'DUAL_NATIVE_PLATFORM_ENVIRONMENT_DEFAULTS+DESIGN'});}
  }
  normalizeWebCanonicalAndExpansionPolicy(out,seed,mode,repairs);
  setMissingArray(out,'technicalAssumptions',[],repairs,'STRUCTURAL_EMPTY_ALLOWED',{min:0,max:8});
  setMissingArray(out,'validationQuestions',[],repairs,'STRUCTURAL_EMPTY_ALLOWED',{min:0,max:8});
  setMissingArray(out,'openQuestions',[],repairs,'STRUCTURAL_EMPTY_ALLOWED',{min:0,max:8});
  normalizeTraceabilityReferences(out,repairs);

  const required=['identity','playerFantasy','coreFun','coreLoop','signatureSystems','progressionDirection','visualDirection','mobileUx','marketTargetDirection','steamExpansionDecision','multiplayerMode','multiplayerExpansionDecision','technicalAssumptions','validationQuestions','openQuestions'];
  const unresolved=required.filter(key=>{
    if(key==='coreLoop')return !Array.isArray(out[key])||out[key].length<3;
    if(['signatureSystems','technicalAssumptions','validationQuestions','openQuestions'].includes(key))return !Array.isArray(out[key]);
    if(key==='multiplayerMode')return !MODES.has(clean(out[key]).toUpperCase());
    return !clean(out[key]);
  });
  const robloxProfileValidation=requireRobloxBuildProfile
    ?validateRobloxBuildProfile(out.robloxBuildProfile,clean(out.multiplayerMode).toUpperCase())
    :{valid:true,blockers:[]};
  if(!robloxProfileValidation.valid)for(const blocker of robloxProfileValidation.blockers)unresolved.push(`robloxBuildProfile.${blocker}`);
  return {value:out,repairs,unresolved,phase,robloxBuildProfileBlockers:robloxProfileValidation.blockers};
}

export function repairPersistedDesignForPromotion({root='.',designRoot='design',gameId,date,phase='PRE_REVIEW'}={}){
  const resolvedDesignRoot=path.isAbsolute(designRoot)?designRoot:path.join(root,designRoot);
  const base=path.join(resolvedDesignRoot,gameId,date);const revisedPath=path.join(base,'design-revised.json');
  const revised=readJson(revisedPath,null);if(!revised?.content)return {changed:false,repairs:[],unresolved:['design-revised.json'],reason:'DESIGN_REVISED_MISSING',robloxBuildProfile:null};
  const state=loadSeedState(path.join(root,'game-seed-state.json'));const seed=activeSeedForGame(state,gameId);
  const legacyEligible=legacyDesignDate(date)&&!MODES.has(clean(revised.content.multiplayerMode).toUpperCase());
  if(!seed&&!legacyEligible)return {changed:false,repairs:[],unresolved:['active-game-seed'],reason:'ACTIVE_SEED_MISSING',robloxBuildProfile:revised.content.robloxBuildProfile||null};
  const factPack=readJson(path.join(root,'artbook-submissions',gameId,date,'fact-pack.json'),{});
  const strictPath=path.join(base,'strict-design-review.json');const strictBefore=readJson(strictPath,null);
  if(phase==='REVIEW_FEEDBACK'&&strictBefore?.verdict==='PASS'&&Number(strictBefore?.totalScore)>=80&&Array.isArray(strictBefore?.hardFailures)&&strictBefore.hardFailures.length===0)return {changed:false,repairs:[],unresolved:[],reason:'STRICT_ALREADY_PASS',robloxBuildProfile:revised.content.robloxBuildProfile||null};
  const repaired=repairDesignRequiredFields(revised.content,{seed:seed||{},factPack,phase,designDate:date,allowLegacyMultiplayerInference:legacyEligible});
  const changed=repaired.repairs.length>0;
  if(changed){revised.content=repaired.value;revised.prePromotionRepair={phase,repairs:repaired.repairs,groundedOnly:true,legacyMultiplayerNormalization:repaired.repairs.some(row=>String(row.source||'').startsWith('LEGACY_DESIGN.')),strictScoreOrVerdictModified:false,repairedAt:new Date().toISOString()};writeJson(revisedPath,revised);}
  const strictAfter=readJson(strictPath,null);
  if(JSON.stringify(strictBefore)!==JSON.stringify(strictAfter))throw new Error('STRICT_REVIEW_MUTATION_FORBIDDEN');
  return {changed,repairs:repaired.repairs,unresolved:repaired.unresolved,reason:changed?'GROUNDED_DESIGN_FIELDS_REPAIRED':'NO_SAFE_REPAIR_REQUIRED',robloxBuildProfile:repaired.value.robloxBuildProfile||null,robloxBuildProfileBlockers:repaired.robloxBuildProfileBlockers||[]};
}

function arg(name){const hit=process.argv.find(value=>value.startsWith(`--${name}=`));return hit?clean(hit.slice(name.length+3)):'';}
function kstDate(){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=type=>parts.find(x=>x.type===type)?.value||'';return `${get('year')}-${get('month')}-${get('day')}`;}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const gameId=arg('game-id')||clean(process.env.GAME_ID||process.env.ARTBOOK_GAME_ID);const date=arg('date')||clean(process.env.DESIGN_DATE||process.env.ARTBOOK_DATE)||kstDate();const phase=(arg('phase')||'PRE_REVIEW').toUpperCase();
  if(!gameId)throw new Error('PREPROMOTION_REPAIR_GAME_ID_REQUIRED');
  const result=repairPersistedDesignForPromotion({gameId,date,phase});
  const build=result.robloxBuildProfile||{};
  console.log(`PREPROMOTION_REPAIR_CHANGED=${result.changed?'YES':'NO'}`);
  console.log(`PREPROMOTION_REPAIR_REASON=${result.reason}`);
  console.log(`PREPROMOTION_REPAIR_FIELDS=${result.repairs.map(x=>x.field).join(',')}`);
  console.log(`PREPROMOTION_REPAIR_UNRESOLVED=${result.unresolved.join(',')}`);
  console.log(`PREPROMOTION_REPAIR_PROFILE_BLOCKERS=${(result.robloxBuildProfileBlockers||[]).join(',')||'NONE'}`);
  console.log(`ROBLOX_BUILD_GENRE=${clean(build.genre)||'MISSING'}`);
  console.log(`ROBLOX_BUILD_SUBGENRE=${clean(build.subgenre)||'NONE'}`);
  console.log(`ROBLOX_BUILD_PLAY_MODE=${clean(build.playMode)||'MISSING'}`);
  console.log(`ROBLOX_BUILD_MULTIPLAYER_REQUIRED=${build.multiplayerRequired===true?'YES':'NO'}`);
  console.log(`ROBLOX_BUILD_COOP_REQUIRED=${build.coopImplementationRequired===true?'YES':'NO'}`);
  console.log(`ROBLOX_BUILD_COMPETITIVE_REQUIRED=${build.competitiveImplementationRequired===true?'YES':'NO'}`);
  console.log(`ROBLOX_BUILD_MIN_QA_PARTICIPANTS=${Number(build.minimumParticipantsForRequiredQa||0)}`);
  console.log('PREPROMOTION_REPAIR_GROUNDED_ONLY=YES');
  console.log('PREPROMOTION_REPAIR_STRICT_SCORE_SYNTHESIZED=NO');
  console.log('PREPROMOTION_REPAIR_STRICT_VERDICT_SYNTHESIZED=NO');
  console.log('DESIGN_ONLY_ARTBOOK_BEFORE_PROMOTION=NO');
}
