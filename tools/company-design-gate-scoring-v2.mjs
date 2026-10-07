// 파일명: tools/company-design-gate-scoring-v2.mjs
// 역할: 설계 점수와 실제 작성 내용의 모순·누락을 같은 검증 경로에서 판정한다.
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

// 설계 내용 검증: 분할 작성 직후와 최종 점수 판정에서 동일하게 사용한다.
export function validateDesignAuthoringContent({design={},seed={},fields=Object.keys(design)}={}){
  const selected=new Set(fields);
  const reasons=[];
  const reject=(code,axis,affected,evidence,requiredAction)=>{
    if(!affected.some(field=>selected.has(field)))return;
    reasons.push({...rejectionReason({code,axis,evidence,requiredAction}),fields:affected});
  };
  const proseFields=['identity','playerFantasy','coreFun','coreLoop','signatureSystems','systemInterconnections','progressionDirection','progressionEconomyBalance','contentExpansionPlan','failureRetryRisk','platformFitPlan','platformProfiles','webCanonicalDesign','platformExpansionPolicy','visualDirection','mobileUx','uxAccessibilityPlan','artAudioDirection','marketTargetDirection','multiplayerExpansionDecision','designAlternatives','selectedDesignPlan','contentVarietyPlan','technicalAssumptions','implementationTraceability'];
  const enumKeys=new Set(['name','label','role','phase','platform','targetPlatform','designAuthority','mode','sharedLargeFrame','expansionLimit','internalReleaseTarget','fromSystem','toSystem','responsibleSystem']);
  const scan=(value,path,root)=>{
    if(Array.isArray(value)){value.forEach((item,index)=>scan(item,`${path}[${index}]`,root));return;}
    if(value&&typeof value==='object'){
      for(const [key,item] of Object.entries(value))if(!enumKeys.has(key))scan(item,`${path}.${key}`,root);
      return;
    }
    if(typeof value!=='string')return;
    const text=clean(value);
    if(/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+){2,}$/.test(text)||/^(?:TODO|TBD|PLACEHOLDER|미정|작성 예정|추후 작성)$/i.test(text)){
      reject('DESIGN_PLACEHOLDER_CONTENT','IMPLEMENTATION_FEASIBILITY_AND_TRACEABILITY',[root],{path,value:text.slice(0,160)},`${path}의 임시 표식을 실제 조건·선택·상태 변화·검증 방법으로 작성한다.`);
    }
  };
  for(const field of proseFields)if(selected.has(field))scan(design[field],field,field);
  const declared=clean(seed.MULTIPLAYER_DESIGN_MODE||seed.INITIAL_PLAY_MODE).toUpperCase();
  if(design.multiplayerMode&&['SINGLE','COOP','COMPETITIVE','HYBRID'].includes(declared)&&design.multiplayerMode!==declared){
    reject('DESIGN_MULTIPLAYER_CONTRADICTION','CATEGORY_IDENTITY',['multiplayerMode','multiplayerExpansionDecision'],{expected:declared,actual:design.multiplayerMode},'오너 입력의 플레이 모드를 보존한다. 인공지능 충원으로 혼자 플레이할 수 있어도 멀티 의도를 SINGLE로 바꾸지 않는다.');
  }
  const profiles=design.platformProfiles||{};
  for(const [platform,foreign] of [['UNITY',/(?:OPEN_CLOUD(?:_|\b)|\b(?:Rojo|ScreenGui|RemoteEvent|Roblox DataStore)\b)/i],['ROBLOX',/\b(?:APK|AAB|Unity Input System|UnityEditor)\b/i]]){
    for(const key of ['internalReleaseTarget','validationEvidence']){
      const value=clean(profiles[platform]?.[key]);
      if(foreign.test(value))reject('DESIGN_PLATFORM_NATIVE_CONTRADICTION','PLATFORM_FIT_DESIGN',['platformProfiles'],{platform,key,value},`${platform}의 배포·검증 항목을 해당 플랫폼의 실제 산출물과 실행 증거로 작성한다. 다른 플랫폼 항목을 복사하지 않는다.`);
    }
  }
  const shared=design.platformExpansionPolicy?.sharedLargeFrame;
  const expectedFrame=['CORE_IDENTITY','CORE_FUN_AND_REPRESENTATIVE_LOOP','WORLD_AND_PROGRESSION_DIRECTION','SAVE_PERSISTENCE_MEANING','MULTIPLAYER_INTENT'];
  if(shared&&expectedFrame.some(item=>!shared.includes(item)))reject('DESIGN_SHARED_FRAME_INCOMPLETE','PLATFORM_FIT_DESIGN',['platformExpansionPolicy'],{shared},'공통 정체성·핵심 루프·세계/성장·저장 의미·멀티 의도를 각각 보존한다. 같은 항목을 반복하지 않는다.');
  const alternatives=list(design.designAlternatives);
  const strategicKeys=['coreLoopShift','mapTopologyRegionRoles','enemyEcosystemCounterplay','progressionEconomy'];
  const normalize=value=>clean(value).toLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');
  for(let i=0;i<alternatives.length;i++)for(let j=i+1;j<alternatives.length;j++){
    const different=strategicKeys.filter(key=>normalize(alternatives[i][key])!==normalize(alternatives[j][key]));
    if(different.length<2)reject('DESIGN_ALTERNATIVES_DUPLICATED','IDEA_AND_DISTINCTNESS',['designAlternatives','selectedDesignPlan'],{plans:[alternatives[i].label,alternatives[j].label],differentAxes:different},'원본 규칙을 보존하면서 루프·동선·대응법·성장 중 최소 두 항목의 실제 플레이 접근이 다른 대안을 작성하고 선택 근거를 갱신한다.');
  }
  const chosen=design.selectedDesignPlan;
  if(chosen){
    if(alternatives.length&&!alternatives.some(plan=>plan.label===chosen.label))reject('DESIGN_SELECTION_UNGROUNDED','IDEA_AND_DISTINCTNESS',['selectedDesignPlan'],{label:chosen.label},'실제로 작성한 대안 중 하나를 선택하고 선택 이유를 적는다.');
    const steps=list(chosen.playthrough);
    const phases=['OPENING','DEVELOPMENT','RESOLUTION'];
    const valid=phases.every((phase,index)=>steps[index]?.phase===phase)&&steps.length===3&&steps.every(step=>objectReady(step,['entryState','playerChoice','actionAndResponse','exitState','nextDecision'],12));
    if(!valid||!textReady(chosen.durationRationale,30))reject('DESIGN_PLAYTHROUGH_MISSING','CORE_LOOP_DESIGN',['selectedDesignPlan'],{phases:steps.map(step=>step.phase)},'시작·전개·결말 각각의 진입 상태, 선택, 입력/판정/대응, 결과 상태, 다음 선택을 작성하고 한 판과 전체 세션 길이의 근거를 구분한다. 기존 시간·밸런스 수치는 임의 변경하지 않는다.');
    if(valid){
      const broken=steps.slice(1).map((step,index)=>({phase:step.phase,previous:steps[index].exitState,current:step.entryState})).filter(row=>normalize(row.previous)!==normalize(row.current));
      if(broken.length)reject('DESIGN_PLAYTHROUGH_DISCONNECTED','CORE_LOOP_DESIGN',['selectedDesignPlan'],{broken},'앞 단계 exitState를 다음 단계 entryState로 그대로 이어 같은 한 판의 상태 전이를 증명한다.');
    }
  }
  for(const [root,rows] of [['contentVarietyPlan',[...list(design.contentVarietyPlan?.regions),...list(design.contentVarietyPlan?.enemiesOrChallenges)]],['failureRetryRisk',[design.failureRetryRisk]]]){
    for(const row of rows){
      const values=Object.values(row||{}).filter(value=>typeof value==='string'&&clean(value).length>=20).map(normalize);
      if(values.some(value=>values.filter(other=>other===value).length>=3))reject('DESIGN_REPEATED_CONTENT','CONTENT_EXPANSION_PLAN',[root],{name:row?.name||root},'서로 다른 항목을 같은 설명으로 채우지 않는다. 동선·전조·대응·위험·보상·복구가 각각 어떤 규칙인지 작성한다.');
    }
  }
  return reasons;
}

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
  const platformKnown=['ROBLOX','UNITY'].includes(platform);
  const playMode=clean(design.multiplayerMode||seed.MULTIPLAYER_DESIGN_MODE).toUpperCase();
  const playModeKnown=['SINGLE','COOP','COMPETITIVE','HYBRID'].includes(playMode);
  const seedGrammar=Number(seed?.GAMEPLAY_SKETCH?.version||0)>=4&&seed?.GAMEPLAY_SKETCH?.novelGameGrammar&&typeof seed.GAMEPLAY_SKETCH.novelGameGrammar==='object'?seed.GAMEPLAY_SKETCH.novelGameGrammar:null;
  const designText=JSON.stringify(design);
  const grammarIds=distinct(list(seedGrammar?.causalDNAs).map(row=>clean(row?.id)));
  const carriedGrammarIds=grammarIds.filter(id=>id&&designText.includes(id));
  const grammarIdMinimum=seedGrammar?Math.min(2,grammarIds.length):0;
  const primaryVerb=clean(seedGrammar?.newPrimaryVerb);
  const worldRule=clean(seedGrammar?.worldRule);
  const primaryVerbCarried=!seedGrammar||!primaryVerb||designText.includes(primaryVerb);
  const worldRuleCarried=!seedGrammar||!worldRule||designText.includes(worldRule);
  const fusion=seedGrammar?.gameplaySystemFusion||{};
  const mainName=clean(fusion?.main?.name);
  const majorAxisNames=list(fusion?.majorAxes).map(row=>clean(row?.name)).filter(Boolean);
  const subElementNames=list(fusion?.subElements).map(row=>clean(row?.name)).filter(Boolean);
  const delveNames=list(seedGrammar?.delveLayer?.elements).map(row=>clean(row?.name)).filter(Boolean);
  const emergentGenreName=clean(seedGrammar?.emergentGenre?.name);
  const mainCarried=!seedGrammar||!mainName||designText.includes(mainName);
  const carriedMajorAxes=majorAxisNames.filter(name=>designText.includes(name));
  const carriedSubElements=subElementNames.filter(name=>designText.includes(name));
  const carriedDelveElements=delveNames.filter(name=>designText.includes(name));
  const emergentGenreCarried=!seedGrammar||!emergentGenreName||designText.includes(emergentGenreName);
  const systemFusionCarryOk=!seedGrammar||(mainCarried&&carriedMajorAxes.length>=Math.min(2,majorAxisNames.length)&&carriedSubElements.length>=Math.min(1,subElementNames.length)&&carriedDelveElements.length>=Math.min(1,delveNames.length)&&emergentGenreCarried);
  const grammarCarryOk=!seedGrammar||(carriedGrammarIds.length>=grammarIdMinimum&&(primaryVerbCarried||worldRuleCarried)&&systemFusionCarryOk);

  const ideaBasic=textReady(design.identity,60)&&textReady(design.playerFantasy,40)&&textReady(design.coreFun,40)&&materialContractOk;
  const ideaConnected=ideaBasic&&loops.length>=3&&signatureSystems.length>=2&&grammarCarryOk;
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
  const platformProfileFields=['inputModel','sessionModel','multiplayerRuntime','performanceBudget','uiUx','saveAndNetwork','platformContentAdaptation','internalReleaseTarget','validationEvidence'];
  const robloxProfile=design?.platformProfiles?.ROBLOX||{};
  const unityProfile=design?.platformProfiles?.UNITY||{};
  const robloxProfileReady=clean(robloxProfile.platform).toUpperCase()==='ROBLOX'&&objectReady(robloxProfile,platformProfileFields,16);
  const unityProfileReady=clean(unityProfile.platform).toUpperCase()==='UNITY'&&objectReady(unityProfile,platformProfileFields,16);
  const profilesDistinct=robloxProfileReady&&unityProfileReady&&(
    clean(robloxProfile.inputModel)!==clean(unityProfile.inputModel)||
    clean(robloxProfile.sessionModel)!==clean(unityProfile.sessionModel)||
    clean(robloxProfile.performanceBudget)!==clean(unityProfile.performanceBudget)||
    clean(robloxProfile.platformContentAdaptation)!==clean(unityProfile.platformContentAdaptation)
  );
  const platformBasic=platformKnown&&Boolean(design.platformFitPlan)&&Boolean(design.platformProfiles)&&textReady(design.mobileUx,20)&&robloxProfileReady&&unityProfileReady;
  const platformConnected=platformBasic&&profilesDistinct&&clean(design.platformFitPlan?.targetPlatform).toUpperCase()===platform&&textReady(design.platformFitPlan?.targetPlatform,3)&&objectReady(design.platformFitPlan,['inputModel','performanceBudget','sessionConstraints'],16);
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
  const rejectionReasons=validateDesignAuthoringContent({design,seed});
  const hardFailures=rejectionReasons.map(reason=>reason.code);
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
  if(seedGrammar&&!grammarCarryOk){
    hardFailures.push('NOVEL_GRAMMAR_DILUTED');
    rejectionReasons.push(rejectionReason({code:'NOVEL_GRAMMAR_DILUTED',axis:'IDEA_AND_DISTINCTNESS',evidenceLevel:evidenceLevels.IDEA_AND_DISTINCTNESS,minimumRequired:DESIGN_CRITICAL_AXIS_MINIMUM_PERCENT,evidence:{requiredCausalIds:grammarIds,carriedCausalIds:carriedGrammarIds,primaryVerbCarried,worldRuleCarried,mainName,mainCarried,majorAxisNames,carriedMajorAxes,subElementNames,carriedSubElements,delveNames,carriedDelveElements,emergentGenreName,emergentGenreCarried},requiredAction:'GAMEPLAY_SKETCH v4의 emergentGenre와 MATERIAL_CAUSAL_GRAMMAR × (MAIN × A × B × c) + @ 구조를 기존 설계 필드에 다시 연결한다. MAIN은 중심 행동, A/B는 대축, c는 서브요소, @는 파고들기 요소로 구분하고 causalDNA가 이 관계를 실제 상태 변화로 바꾸게 한다.'}));
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
    grammarCarryEvidence:seedGrammar?{formula:'MATERIAL_CAUSAL_GRAMMAR × (MAIN × A × B × c) + @',requiredCausalIds:grammarIds,carriedCausalIds:carriedGrammarIds,primaryVerbCarried,worldRuleCarried,mainName,mainCarried,majorAxisNames,carriedMajorAxes,subElementNames,carriedSubElements,delveNames,carriedDelveElements,emergentGenreName,emergentGenreCarried,categoryRole:seedGrammar?.emergentGenre?.categoryRole||null}:null,
  };
}

