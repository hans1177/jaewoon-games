// Company operational intelligence around the existing canonical pipeline.
// This module MUST NOT change the Vibe learning chain or build topology.

const clamp=(value,min=0,max=100)=>Math.min(max,Math.max(min,Number(value)||0));
const text=value=>String(value??'').trim();
const upper=value=>text(value).toUpperCase();
const freeze=value=>Object.freeze(value);

export const COMPANY_FAILURE_TYPES=freeze([
  'SOURCE_WRONG','LOGIC_BUG','RUNTIME','PERFORMANCE','MOBILE_UX','SAVE_COMPAT',
  'ASSET','BUILD','QA_FALSE_POSITIVE','REGRESSION','BALANCE','UNKNOWN'
]);

export const COMPANY_DEPARTMENTS=freeze(['planning','graphics','development','qa','balance']);
export const COMPANY_PLATFORMS=freeze(['ROBLOX','UNITY_ANDROID','FORTNITE_UEFN']);
export const COMPANY_PRIMARY_PLATFORM='ROBLOX';

export const COMPANY_DEVICE_MATRIX=freeze([
  freeze({id:'LOW',purpose:'LOW_END_ANDROID'}),
  freeze({id:'MID',purpose:'MID_RANGE_ANDROID'}),
  freeze({id:'REFERENCE',purpose:'REFERENCE_ANDROID'})
]);

export const COMPANY_GOLDEN_COMPONENTS=freeze([
  'MOBILE_INPUT','SAVE_LOAD','AUDIO_ROUTER','OBJECT_POOLING','HEALTH_DAMAGE',
  'INVENTORY','SCENE_LOADING','PAUSE_RESUME','ANDROID_LIFECYCLE'
]);

export const COMPANY_STYLE_DNA_FIELDS=freeze([
  'COLOR','SILHOUETTE','PROPORTION','UI_DENSITY','VFX','MATERIAL','LIGHTING'
]);

export const COMPANY_POST_RELEASE_SIGNALS=freeze([
  'CRASH','ANR','SAVE_FAILURE','DEVICE_COMPATIBILITY','UX_FRICTION','BALANCE_OUTLIER',
  'PERFORMANCE_REGRESSION','UPDATE_REGRESSION'
]);

export const COMPANY_OPERATION_LOCKS=freeze({
  vibeLearningStructureImmutable:true,
  vibeLearningCodePathImmutable:true,
  buildSystemImmutable:true,
  newParallelPipelineForbidden:true,
  evidenceFeedsExistingInputsOnly:true
});

const PRIORITY_WEIGHTS=freeze({
  userImpact:0.30,
  reproducibility:0.20,
  releaseRisk:0.25,
  crossProjectReuse:0.15,
  vibeLearningValue:0.10
});

const DEPARTMENT_WEIGHTS=freeze({
  planning:0.20,
  graphics:0.20,
  development:0.20,
  qa:0.20,
  balance:0.20
});

export function scoreCompanyMission(input={}){
  const parts={
    userImpact:clamp(input.userImpact),
    reproducibility:clamp(input.reproducibility),
    releaseRisk:clamp(input.releaseRisk),
    crossProjectReuse:clamp(input.crossProjectReuse),
    vibeLearningValue:clamp(input.vibeLearningValue)
  };
  const score=Math.round(Object.entries(PRIORITY_WEIGHTS).reduce((sum,[key,w])=>sum+parts[key]*w,0));
  const critical=parts.releaseRisk>=85||parts.userImpact>=90;
  const tier=critical?'P0':score>=75?'P1':score>=50?'P2':score>=25?'P3':'P4';
  return freeze({score,tier,critical,parts:freeze(parts),weights:PRIORITY_WEIGHTS,authority:'operational-priority-only'});
}

export function scoreDepartmentPortfolio(input={}){
  const source=input.departments||input.scores||input;
  const scores={};
  const missing=[];
  for(const department of COMPANY_DEPARTMENTS){
    const raw=source?.[department];
    if(raw===undefined||raw===null||raw==='')missing.push(department);
    const value=typeof raw==='object'&&raw!==null?raw.score:raw;
    scores[department]=clamp(value);
  }
  const complete=missing.length===0;
  const score=Math.round(COMPANY_DEPARTMENTS.reduce((sum,key)=>sum+scores[key]*DEPARTMENT_WEIGHTS[key],0));
  const decision=!complete?'INSUFFICIENT_SCORES':score>=80?'EXPAND':score>=60?'MAINTAIN':score>=40?'REVISE_OR_HOLD':'REDUCE_REVIEW';
  return freeze({
    score,
    decision,
    complete,
    missing:freeze(missing),
    departments:freeze(scores),
    weights:DEPARTMENT_WEIGHTS,
    numericGameCountLimit:null,
    numericWipLimit:null,
    automaticProjectDiscard:false,
    automaticProjectDelete:false,
    authority:'department-score-guidance-only'
  });
}

export function evaluatePortfolioProjects(projects=[]){
  const evaluated=(projects||[]).map((project,index)=>{
    const result=scoreDepartmentPortfolio(project?.departmentScores||project?.scores||{});
    return freeze({
      id:text(project?.id||project?.gameId)||`project-${index+1}`,
      score:result.score,
      decision:result.decision,
      complete:result.complete,
      departmentScores:result.departments,
      automaticDiscard:false,
      automaticDelete:false
    });
  });
  evaluated.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
  return freeze({
    projects:freeze(evaluated),
    hardMinGames:null,
    hardMaxGames:null,
    hardMinDevelopmentWip:null,
    hardMaxDevelopmentWip:null,
    fixedSlots:false,
    oneForOneReplacement:false,
    decisionBasis:'FIVE_DEPARTMENT_SCORE_PLUS_CANONICAL_EVIDENCE',
    countChangeIsAdvisoryNotCapped:true
  });
}

export function resolveCompanyPlatform(input={}){
  const requested=upper(input.platform||input.primaryPlatform||input.targetPlatform||COMPANY_PRIMARY_PLATFORM);
  const platform=COMPANY_PLATFORMS.includes(requested)?requested:COMPANY_PRIMARY_PLATFORM;
  const priorityRank=COMPANY_PLATFORMS.indexOf(platform)+1;
  return freeze({
    platform,
    requested:requested||COMPANY_PRIMARY_PLATFORM,
    primary:platform===COMPANY_PRIMARY_PLATFORM,
    defaultPrimary:COMPANY_PRIMARY_PLATFORM,
    priorityRank,
    developmentAllowed:true,
    entryGate:false,
    priorPlatformCompletionRequired:false,
    switchingRebuildsCompanyCore:false,
    preserveExistingUnity:platform==='UNITY_ANDROID',
    policy:'PRIMARY_IS_DEFAULT_FOCUS_NOT_PLATFORM_LOCK'
  });
}

export function classifyCompanyFailure(input={}){
  const blob=[input.message,input.area,input.stage,input.code,input.details].map(v=>text(v).toLowerCase()).join(' ');
  const rules=[
    ['SOURCE_WRONG',/(wrong source|responsible source|잘못된 소스|엉뚱한 파일|wrong file)/],
    ['QA_FALSE_POSITIVE',/(false positive|qa.*pass.*but|가짜 pass|오탐|잘못된 pass)/],
    ['SAVE_COMPAT',/(save|load|serialization|migration|세이브|저장|불러오기)/],
    ['PERFORMANCE',/(fps|frame|memory|heat|lag|stutter|성능|프레임|메모리|발열)/],
    ['MOBILE_UX',/(touch|mobile ui|safe area|aspect|button size|터치|모바일|버튼.*작)/],
    ['ASSET',/(asset|sprite|texture|audio|animation|font|에셋|스프라이트|텍스처|오디오|애니메이션)/],
    ['BUILD',/(build|gradle|apk|aab|compile|빌드|컴파일)/],
    ['RUNTIME',/(runtime|crash|anr|exception|launch|런타임|크래시|실행)/],
    ['REGRESSION',/(regression|again|reintroduced|재발|회귀)/],
    ['BALANCE',/(balance|difficulty|economy|damage|hp|밸런스|난이도|경제)/],
    ['LOGIC_BUG',/(logic|state|branch|condition|bug|로직|상태|조건|버그)/]
  ];
  const match=rules.find(([,re])=>re.test(blob));
  const type=match?.[0]||'UNKNOWN';
  return freeze({type,known:COMPANY_FAILURE_TYPES.includes(type),raw:text(input.message||input.details),authority:'failure-taxonomy-only'});
}

export function evaluateRecurringFailure(records=[],signature='',minimumOccurrences=2){
  const key=text(signature);
  const matches=(records||[]).filter(row=>{
    if(row?.verified===false)return false;
    return text(row?.signature||row?.failureSignature||row?.id)===key;
  });
  const threshold=Math.max(2,Number(minimumOccurrences)||2);
  return freeze({
    signature:key,
    verifiedOccurrences:matches.length,
    threshold,
    recurring:matches.length>=threshold,
    action:matches.length>=threshold?'PROMOTE_TO_EXISTING_QA_OR_REGRESSION_GUARD':'KEEP_AS_OBSERVED_FAILURE',
    newPipeline:false
  });
}

export function createGoldenComponentRecord(input={}){
  const id=upper(input.id);
  if(!COMPANY_GOLDEN_COMPONENTS.includes(id))throw new Error(`unsupported golden component: ${id||'EMPTY'}`);
  const projects=[...new Set((input.projects||[]).map(text).filter(Boolean))];
  const verified=Boolean(input.runtimePassed&&input.qaPassed&&input.regressionPassed);
  return freeze({
    id,
    source:text(input.source),
    projects:freeze(projects),
    projectCount:projects.length,
    verified,
    reusable:verified,
    patternScope:verified&&projects.length>=2?'COMPANY_PATTERN':'PROJECT_PATTERN',
    exactRevision:text(input.exactRevision)||null
  });
}

export function createPlayabilityScorecard(metrics={}){
  const keys=['CORE_FUN','INPUT_FEEL','CLARITY','DIFFICULTY','PROGRESSION','PERFORMANCE','CRASH_FREE','SESSION_COMPLETION'];
  const values=Object.fromEntries(keys.map(key=>[key,clamp(metrics[key]??metrics[key.toLowerCase()]??0)]));
  const score=Math.round(keys.reduce((sum,key)=>sum+values[key],0)/keys.length);
  const blockers=keys.filter(key=>values[key]<50);
  return freeze({score,values:freeze(values),blockers:freeze(blockers),decision:score>=80&&!blockers.length?'STRONG':score>=65?'USABLE_WITH_FIXES':'NEEDS_WORK',autoReject:false});
}

export function evaluateEvidenceFreshness(input={}){
  const exactRevision=Boolean(input.exactRevision);
  const sameRevision=text(input.evidenceSha)&&text(input.currentSha)&&text(input.evidenceSha)===text(input.currentSha);
  const dependencyProof=Boolean(input.dependencyProof);
  const affected=Boolean(input.affectedByChange);
  if(exactRevision)return freeze({fresh:sameRevision,reusable:sameRevision,reason:sameRevision?'EXACT_REVISION_MATCH':'EXACT_REVISION_STALE_AFTER_SOURCE_CHANGE'});
  if(sameRevision)return freeze({fresh:true,reusable:true,reason:'SAME_REVISION'});
  if(dependencyProof&&!affected)return freeze({fresh:true,reusable:true,reason:'UNAFFECTED_SUBSYSTEM_WITH_DEPENDENCY_PROOF'});
  return freeze({fresh:false,reusable:false,reason:'STALE_OR_UNPROVEN'});
}

export function scoreExperienceQuality(input={}){
  const signals={
    realProblem:Boolean(input.realUserOrRuntimeProblem),
    crossProjectReuse:Boolean(input.crossProjectReuse),
    completeVerification:Boolean(input.completeVerification),
    clearCause:Boolean(input.clearCause),
    focusedDiff:Boolean(input.focusedDiff)
  };
  const score=Object.values(signals).filter(Boolean).length*20;
  return freeze({score,signals:freeze(signals),priority:score>=80?'HIGH':score>=60?'MEDIUM':'LOW',learningIntegration:'EXISTING_INPUTS_ONLY'});
}

export function classifyGeneralization(projectIds=[]){
  const projects=[...new Set((projectIds||[]).map(text).filter(Boolean))];
  return freeze({projects:freeze(projects),distinctProjects:projects.length,pattern:projects.length>=2?'COMPANY_PATTERN':'PROJECT_PATTERN'});
}

export function normalizeStyleDna(input={}){
  const dna={};
  for(const key of COMPANY_STYLE_DNA_FIELDS)dna[key]=input[key]??input[key.toLowerCase()]??null;
  return freeze(dna);
}

export function resolveStopLoss(attempts=0,{fatal=false}={}){
  const n=Math.max(0,Math.floor(Number(attempts)||0));
  const level=fatal||n>=3?'HOLD':n===2?'DESIGN_REDUCE':n===1?'ARCHITECTURE_REVIEW':'LOCAL_FIX';
  return freeze({attempts:n,level,fabricatedPassForbidden:true});
}

export function convertPostReleaseSignalToMission(input={}){
  const signal=upper(input.signal);
  if(!COMPANY_POST_RELEASE_SIGNALS.includes(signal))return freeze({eligible:false,reason:'UNSUPPORTED_SIGNAL'});
  if(input.privacyMinimized===false)return freeze({eligible:false,reason:'PRIVACY_MINIMIZATION_REQUIRED'});
  const category={
    CRASH:'RUNTIME',ANR:'RUNTIME',SAVE_FAILURE:'SAVE_COMPAT',DEVICE_COMPATIBILITY:'RUNTIME',
    UX_FRICTION:'MOBILE_UX',BALANCE_OUTLIER:'BALANCE',PERFORMANCE_REGRESSION:'PERFORMANCE',UPDATE_REGRESSION:'REGRESSION'
  }[signal]||'UNKNOWN';
  return freeze({eligible:true,signal,category,missionCandidate:true,source:'POST_RELEASE_AGGREGATE',privacyMinimized:true});
}

export function createCreativeProductionManifest(input={}){
  const scenes=(input.scenes||[]).map((scene,index)=>freeze({
    id:text(scene.id)||`scene-${index+1}`,
    purpose:text(scene.purpose)||'STORY',
    dialogue:freeze(Array.isArray(scene.dialogue)?scene.dialogue.map(text):[]),
    bgmCue:text(scene.bgmCue)||null,
    sfx:freeze(Array.isArray(scene.sfx)?scene.sfx.map(text):[]),
    transition:text(scene.transition)||null
  }));
  const assetState=input.audioAssetAvailable===true?'READY':'ASSET_PENDING';
  return freeze({
    version:1,
    gameId:text(input.gameId),
    intro:input.intro||null,
    scenes:freeze(scenes),
    localizationDraft:input.localizationDraft||null,
    audio:freeze({assetState,rightsEvidenceRequired:true,fakeCompletionForbidden:true}),
    integration:'DATA_MANIFEST_PLUS_SHARED_RUNTIME',
    authoritative:false
  });
}

export function createFreeExternalCreativeCandidatePlan(input={}){
  const providers=(input.providers||[]).filter(p=>p&&p.freeOnly===true&&p.available!==false&&p.paid!==true).map(p=>freeze({
    id:text(p.id),model:text(p.model),freeOnly:true,authoritative:false
  }));
  const max=Math.max(0,Math.min(2,Number(input.maxCandidates??2)||0));
  return freeze({
    internalVibeBaselineRequired:true,
    externalRequired:false,
    candidates:freeze(providers.slice(0,max)),
    paidFallback:false,
    absenceBehavior:'CONTINUE_WITH_INTERNAL_VIBE',
    finalAuthority:'INTERNAL_VIBE_AND_EXISTING_QA'
  });
}

export function createOperationalMission(input={}){
  const priority=scoreCompanyMission(input.priority||input);
  const failure=classifyCompanyFailure(input.failure||input);
  const departments=[...new Set((input.departments||[]).map(text).filter(Boolean))];
  const platform=resolveCompanyPlatform(input.platform||input.targetPlatform?{platform:input.platform||input.targetPlatform}:{});
  return freeze({
    version:2,
    id:text(input.id),
    gameId:text(input.gameId),
    title:text(input.title||input.request),
    priority,
    failure,
    platform,
    departments:freeze(departments),
    responsibleStage:text(input.responsibleStage)||null,
    mustUseExistingResponsibleStage:true,
    noParallelPipeline:true,
    locks:COMPANY_OPERATION_LOCKS
  });
}

if(typeof window!=='undefined')Object.assign(window,{
  scoreJaewoonCompanyMission:scoreCompanyMission,
  scoreJaewoonDepartmentPortfolio:scoreDepartmentPortfolio,
  evaluateJaewoonPortfolioProjects:evaluatePortfolioProjects,
  resolveJaewoonCompanyPlatform:resolveCompanyPlatform,
  classifyJaewoonCompanyFailure:classifyCompanyFailure,
  createJaewoonOperationalMission:createOperationalMission,
  createJaewoonCreativeProductionManifest:createCreativeProductionManifest
});
