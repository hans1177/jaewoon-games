const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const list=value=>Array.isArray(value)?value:[];
const distinct=values=>[...new Set(values.map(clean).filter(Boolean))];

export const DESIGN_GATE_WEIGHTS=Object.freeze({
  IDEA_AND_DISTINCTNESS:12,
  CATEGORY_IDENTITY:10,
  CORE_LOOP_DESIGN:14,
  SYSTEM_INTERCONNECTION_DESIGN:12,
  PROGRESSION_ECONOMY_BALANCE_DESIGN:10,
  CONTENT_EXPANSION_PLAN:10,
  FAILURE_RETRY_RISK_DESIGN:8,
  PLATFORM_FIT_DESIGN:8,
  UX_AND_ACCESSIBILITY_PLAN:6,
  ART_AUDIO_DIRECTION:5,
  IMPLEMENTATION_FEASIBILITY_AND_TRACEABILITY:5,
});
export const DESIGN_DIRECT_SCORE_LEVELS=Object.freeze([0,20,40,60,80,100]);
export const DESIGN_GATE_PASS_MINIMUM=80;
export const DESIGN_CRITICAL_AXIS_MINIMUM_PERCENT=75;

const weighted=(level,weight)=>Math.round((Number(level)*Number(weight)/100)*100)/100;
const textReady=(value,min=24)=>clean(value).length>=min;
const textListReady=(value,minItems=3,minLength=24)=>distinct(list(value).filter(item=>textReady(item,minLength))).length>=minItems;
const objectReady=(value,keys,minLength=20)=>Boolean(value&&typeof value==='object'&&!Array.isArray(value)&&keys.every(key=>textReady(value[key],minLength)));
const objectListReady=(value,keys,minItems=3,minLength=12)=>{
  const rows=list(value).filter(row=>row&&typeof row==='object'&&!Array.isArray(row)&&keys.every(key=>textReady(row[key],minLength)));
  const signatures=distinct(rows.map(row=>keys.map(key=>clean(row[key])).join('|')));
  return rows.length>=minItems&&signatures.length>=minItems;
};
const revisionProven=(designRecord,cycleStatus)=>Boolean(
  designRecord?.sameModelAsDraft===true&&
  String(cycleStatus?.status||'').toUpperCase()==='COMPLETE'&&
  Number(designRecord?.unresolvedConflictCount||0)===0&&
  Number(designRecord?.heldCount||0)===0
);
const AXIS_REPAIR_ACTION=Object.freeze({
  IDEA_AND_DISTINCTNESS:'정체성·플레이어 판타지·coreFun을 구체화하고 coreLoop와 최소 2개 signature system에 직접 연결한다.',
  CATEGORY_IDENTITY:'선언 장르와 실제 core loop/play mode가 같은 플레이 정체성을 가리키도록 설계를 정렬한다.',
  CORE_LOOP_DESIGN:'3단계 이상 core loop를 실제 선택·상태변화로 구체화하고 signature system과 상호작용을 연결한다.',
  SYSTEM_INTERCONNECTION_DESIGN:'최소 3개 시스템 연결에 fromSystem/toSystem/trigger/stateChange를 명시한다.',
  PROGRESSION_ECONOMY_BALANCE_DESIGN:'진행·자원 흐름·밸런스 규칙을 하나의 반복 가능한 경제/성장 구조로 연결한다.',
  CONTENT_EXPANSION_PLAN:'최소 3개 확장 마일스톤에 새 gameplay와 기존 시스템 영향까지 명시한다.',
  FAILURE_RETRY_RISK_DESIGN:'실패상태·재시도 흐름·위험 압력·회복 규칙을 구체적으로 설계한다.',
  PLATFORM_FIT_DESIGN:'선택 플랫폼 입력·성능예산·세션 제약·모바일 UX를 실제 구현 조건으로 명시한다.',
  UX_AND_ACCESSIBILITY_PLAN:'HUD 우선순위·터치/입력·가독성·접근성 계획을 구체적으로 설계한다.',
  ART_AUDIO_DIRECTION:'시각 정체성·오디오 정체성·게임플레이 피드백 동기화를 연결한다.',
  IMPLEMENTATION_FEASIBILITY_AND_TRACEABILITY:'설계요소→책임시스템→검증증거 추적성을 최소 3개 이상 명시한다.'
});
const rejectionReason=({code,axis=null,evidenceLevel=null,minimumRequired=null,evidence={},requiredAction})=>({
  code,
  kind:'HARD_GATE',
  axis,
  evidenceLevel,
  minimumRequired,
  evidence,
  requiredAction,
  bypassAllowed:false,
  source:'STAGE_GATE_SCORING_V2'
});
const level=(basic,connected,proven=false)=>{
  if(!basic)return 0;
  if(!connected)return 60;
  return proven?100:80;
};

export function scoreDesignGateV2({seed={},designRecord={},cycleStatus={},robloxGenreProfile={}}={}){
  const design=designRecord?.content&&typeof designRecord.content==='object'?designRecord.content:{};
  const loops=distinct(list(design.coreLoop).map(clean));
  const signatureSystems=list(design.signatureSystems).filter(row=>row&&typeof row==='object');
  const materials=distinct(list(seed.SEED_MATERIAL_IDS));
  const generation=clean(seed.generation).toUpperCase();
  const materialComposed=generation.includes('MATERIAL')||generation.includes('COMPOSED');
  const materialContractOk=!materialComposed||(materials.length>=2&&materials.length<=4);
  const revalidated=revisionProven(designRecord,cycleStatus);
  const platform=clean(seed.INITIAL_TARGET_PLATFORM).toUpperCase();
  const platformKnown=['ROBLOX','UNITY','FORTNITE_UEFN'].includes(platform);
  const playMode=clean(design.multiplayerMode||seed.MULTIPLAYER_DESIGN_MODE).toUpperCase();
  const playModeKnown=['SINGLE','COOP','COMPETITIVE','HYBRID'].includes(playMode);

  const ideaBasic=textReady(design.identity,60)&&textReady(design.playerFantasy,40)&&textReady(design.coreFun,40)&&materialContractOk;
  const ideaConnected=ideaBasic&&loops.length>=3&&signatureSystems.length>=2;
  const categoryBasic=textReady(seed.GAME_CATEGORY,3)&&clean(robloxGenreProfile?.genre).length>0;
  const categoryConnected=categoryBasic&&clean(robloxGenreProfile?.genre)!=='Utility & other'&&playModeKnown;
  const coreBasic=loops.length>=3;
  const coreConnected=coreBasic&&signatureSystems.length>=2&&signatureSystems.every(row=>textReady(row?.name,2)&&textReady(row?.purpose,20)&&textReady(row?.playerChoice,20));
  const systemsBasic=list(design.systemInterconnections).length>0;
  const systemsConnected=objectListReady(design.systemInterconnections,['fromSystem','toSystem','trigger','stateChange'],3,8);
  const progressionBasic=Boolean(design.progressionEconomyBalance)&&textReady(design.progressionDirection,24);
  const progressionConnected=progressionBasic&&objectReady(design.progressionEconomyBalance,['progressionLoop','resourceFlow','balanceRules'],20);
  const expansionBasic=list(design.contentExpansionPlan).length>0;
  const expansionConnected=objectListReady(design.contentExpansionPlan,['milestone','newGameplay','systemImpact'],3,12);
  const failureBasic=Boolean(design.failureRetryRisk);
  const failureConnected=failureBasic&&Array.isArray(design.failureRetryRisk?.failureStates)&&distinct(design.failureRetryRisk.failureStates).length>=2&&textReady(design.failureRetryRisk?.retryFlow,20)&&textReady(design.failureRetryRisk?.riskPressure,20)&&textReady(design.failureRetryRisk?.recoveryRules,20);
  const platformBasic=platformKnown&&Boolean(design.platformFitPlan)&&textReady(design.mobileUx,20);
  const platformConnected=platformBasic&&clean(design.platformFitPlan?.targetPlatform).toUpperCase()===platform&&textReady(design.platformFitPlan?.targetPlatform,3)&&objectReady(design.platformFitPlan,['inputModel','performanceBudget','sessionConstraints'],16);
  const uxBasic=Boolean(design.uxAccessibilityPlan)&&textReady(design.mobileUx,20);
  const uxConnected=uxBasic&&objectReady(design.uxAccessibilityPlan,['hudPriorities','touchAndInput','readability','accessibility'],16);
  const artBasic=Boolean(design.artAudioDirection)&&textReady(design.visualDirection,20);
  const artConnected=artBasic&&objectReady(design.artAudioDirection,['visualIdentity','audioIdentity','gameplayFeedbackSync'],16);
  const traceBasic=list(design.implementationTraceability).length>0;
  const traceConnected=objectListReady(design.implementationTraceability,['designElement','responsibleSystem','validationEvidence'],3,10)&&distinct(list(design.technicalAssumptions)).length>=2&&distinct(list(design.validationQuestions)).length>=2;

  const evidenceLevels={
    IDEA_AND_DISTINCTNESS:level(ideaBasic,ideaConnected,revalidated&&textReady(design.identity,100)),
    CATEGORY_IDENTITY:level(categoryBasic,categoryConnected,revalidated),
    CORE_LOOP_DESIGN:level(coreBasic,coreConnected,revalidated&&loops.length>=4),
    SYSTEM_INTERCONNECTION_DESIGN:level(systemsBasic,systemsConnected,revalidated&&list(design.systemInterconnections).length>=4),
    PROGRESSION_ECONOMY_BALANCE_DESIGN:level(progressionBasic,progressionConnected,revalidated),
    CONTENT_EXPANSION_PLAN:level(expansionBasic,expansionConnected,revalidated&&list(design.contentExpansionPlan).length>=4),
    FAILURE_RETRY_RISK_DESIGN:level(failureBasic,failureConnected,revalidated),
    PLATFORM_FIT_DESIGN:level(platformBasic,platformConnected,revalidated),
    UX_AND_ACCESSIBILITY_PLAN:level(uxBasic,uxConnected,revalidated),
    ART_AUDIO_DIRECTION:level(artBasic,artConnected,revalidated),
    IMPLEMENTATION_FEASIBILITY_AND_TRACEABILITY:level(traceBasic,traceConnected,revalidated&&list(design.implementationTraceability).length>=4),
  };
  const scores=Object.fromEntries(Object.entries(DESIGN_GATE_WEIGHTS).map(([axis,weight])=>[axis,weighted(evidenceLevels[axis],weight)]));
  const totalScore=Math.round(Object.values(scores).reduce((sum,value)=>sum+Number(value||0),0)*100)/100;
  const criticalAxisFailures=Object.keys(DESIGN_GATE_WEIGHTS).filter(axis=>Number(evidenceLevels[axis]||0)<DESIGN_CRITICAL_AXIS_MINIMUM_PERCENT);
  const hardFailures=[];
  const rejectionReasons=[];
  const ownerPreservationSeed=seed?.REUSE_EXISTING_GAMEPLAY_IMPLEMENTATION===true&&clean(seed?.OWNER_REBUILD_MODE).toUpperCase()==='PRESERVATION_PRESENTATION_UPGRADE';
  if(ownerPreservationSeed){
    const preservation=design?.preservationContract;
    const requiredLocked=['WORLD_AND_REGIONS','STORY_AND_QUESTS','COMBAT_RULES','CRAFTING_RECIPES_AND_COSTS','SAVE_KEY_AND_SCHEMA_MEANING','PROGRESSION','BALANCE_VALUES','DROPS_AND_REWARDS','HIT_AND_COOLDOWN_SEMANTICS','MULTIPLAYER_MODE'];
    const requiredPasses=['ASSET_ADAPTATION','LIVING_MOTION','ANIMATION_FEEL','VFX','AUDIO_FEEL','CAMERA_LANGUAGE','POLISH_MOBILE'];
    const locked=new Set(list(preservation?.lockedSemantics));
    const passes=new Set(list(preservation?.presentationPasses));
    const preservationReady=preservation?.mode==='PRESERVATION_PRESENTATION_UPGRADE'
      &&preservation?.sourceOfTruth==='EXISTING_IMPLEMENTATION_AND_OWNER_SEED'
      &&preservation?.gameplayRule==='NO_GAMEPLAY_MECHANIC_ADDITION_REMOVAL_OR_REBALANCE'
      &&Number(preservation?.targetSessionMinutes)===Number(seed?.TARGET_SESSION_MINUTES||30)
      &&requiredLocked.every(value=>locked.has(value))
      &&requiredPasses.length===passes.size&&requiredPasses.every(value=>passes.has(value))
      &&playMode===clean(seed?.MULTIPLAYER_DESIGN_MODE).toUpperCase();
    if(!preservationReady){
      hardFailures.push('OWNER_PRESERVATION_CONTRACT_MISSING');
      rejectionReasons.push(rejectionReason({code:'OWNER_PRESERVATION_CONTRACT_MISSING',axis:'IMPLEMENTATION_FEASIBILITY_AND_TRACEABILITY',evidenceLevel:0,minimumRequired:100,evidence:{ownerRebuildMode:clean(seed?.OWNER_REBUILD_MODE),reuseExistingGameplay:seed?.REUSE_EXISTING_GAMEPLAY_IMPLEMENTATION===true},requiredAction:'기존 게임의 월드·스토리·퀘스트·전투·제작·진행·밸런스·세이브 의미를 잠그고 표현 패스만 허용하는 preservationContract를 설계에 명시한다.'}));
    }
  }
  if(!playModeKnown){
    hardFailures.push('MULTIPLAYER_MISSING');
    rejectionReasons.push(rejectionReason({code:'MULTIPLAYER_MISSING',axis:'CATEGORY_IDENTITY',evidenceLevel:evidenceLevels.CATEGORY_IDENTITY,minimumRequired:DESIGN_CRITICAL_AXIS_MINIMUM_PERCENT,evidence:{multiplayerMode:playMode||'MISSING'},requiredAction:'multiplayerMode을 SINGLE/COOP/COMPETITIVE/HYBRID 중 하나로 명시하고 실제 core loop와 일치시킨다.'}));
  }
  if(!categoryConnected){
    hardFailures.push('CATEGORY_MISMATCH');
    rejectionReasons.push(rejectionReason({code:'CATEGORY_MISMATCH',axis:'CATEGORY_IDENTITY',evidenceLevel:evidenceLevels.CATEGORY_IDENTITY,minimumRequired:DESIGN_CRITICAL_AXIS_MINIMUM_PERCENT,evidence:{category:clean(seed.GAME_CATEGORY),genre:clean(robloxGenreProfile?.genre),playMode:playMode||'MISSING'},requiredAction:AXIS_REPAIR_ACTION.CATEGORY_IDENTITY}));
  }
  if(Number(evidenceLevels.IDEA_AND_DISTINCTNESS)<60||Number(evidenceLevels.CORE_LOOP_DESIGN)<60){
    hardFailures.push('CORE_FUN_WEAK');
    rejectionReasons.push(rejectionReason({code:'CORE_FUN_WEAK',axis:'CORE_LOOP_DESIGN',evidenceLevel:Math.min(Number(evidenceLevels.IDEA_AND_DISTINCTNESS||0),Number(evidenceLevels.CORE_LOOP_DESIGN||0)),minimumRequired:60,evidence:{ideaAndDistinctness:evidenceLevels.IDEA_AND_DISTINCTNESS,coreLoopDesign:evidenceLevels.CORE_LOOP_DESIGN,coreLoopCount:loops.length,signatureSystemCount:signatureSystems.length},requiredAction:'핵심 재미를 정체성·core loop·signature system의 실제 선택과 상태변화로 강화한다.'}));
  }
  if(criticalAxisFailures.length){
    hardFailures.push('CRITICAL_AXIS_MINIMUM_FAIL');
    for(const axis of criticalAxisFailures)rejectionReasons.push(rejectionReason({code:'CRITICAL_AXIS_MINIMUM_FAIL',axis,evidenceLevel:Number(evidenceLevels[axis]||0),minimumRequired:DESIGN_CRITICAL_AXIS_MINIMUM_PERCENT,evidence:{axisScore:Number(scores[axis]||0),axisWeight:Number(DESIGN_GATE_WEIGHTS[axis]||0)},requiredAction:AXIS_REPAIR_ACTION[axis]||'해당 설계 축의 근거를 75% 이상 직접 증명하도록 보강한다.'}));
  }
  return {
    scoreSystem:'STAGE_GATE_SCORING_V2',
    version:2,
    passMinimum:DESIGN_GATE_PASS_MINIMUM,
    criticalAxisMinimumPercent:DESIGN_CRITICAL_AXIS_MINIMUM_PERCENT,
    directScoreLevels:[...DESIGN_DIRECT_SCORE_LEVELS],
    weights:{...DESIGN_GATE_WEIGHTS},
    evidenceLevels,
    scores,
    totalScore,
    criticalAxisFailures,
    hardFailures:[...new Set(hardFailures)],
    rejectionReasons,
    revalidated,
    thirtyMinuteHardGateApplied:false,
    materialContractOk,
  };
}
