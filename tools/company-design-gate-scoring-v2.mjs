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
  const platformConnected=platformBasic&&objectReady(design.platformFitPlan,['targetPlatform','inputModel','performanceBudget','sessionConstraints'],16)&&clean(design.platformFitPlan?.targetPlatform).toUpperCase()===platform;
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
  if(!playModeKnown)hardFailures.push('MULTIPLAYER_MISSING');
  if(!categoryConnected)hardFailures.push('CATEGORY_MISMATCH');
  if(Number(evidenceLevels.IDEA_AND_DISTINCTNESS)<60||Number(evidenceLevels.CORE_LOOP_DESIGN)<60)hardFailures.push('CORE_FUN_WEAK');
  if(criticalAxisFailures.length)hardFailures.push('CRITICAL_AXIS_MINIMUM_FAIL');
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
    revalidated,
    thirtyMinuteHardGateApplied:false,
    materialContractOk,
  };
}
