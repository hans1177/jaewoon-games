const clean=value=>String(value??'').trim();
const clamp=(value,min=0,max=100)=>Math.max(min,Math.min(max,Number(value)||0));
const freeze=value=>Object.freeze(value);
const uniq=list=>[...new Set((list||[]).filter(Boolean))];
const has=(text,words)=>{const value=clean(text).toLowerCase();return words.some(word=>value.includes(String(word).toLowerCase()));};

export const COMPANY_FAILURE_TAXONOMY=freeze([
  'SOURCE_WRONG','LOGIC_BUG','RUNTIME','PERFORMANCE','MOBILE_UX','SAVE_COMPAT','ASSET','BUILD','QA_FALSE_POSITIVE','REGRESSION','BALANCE','UNKNOWN'
]);

export const COMPANY_GOLDEN_COMPONENTS=freeze({
  MOBILE_INPUT:freeze({keywords:['touch','터치','조작','input','joystick'],owner:'development',checks:['MOBILE_TOUCH_UI','INPUT_FEEL']}),
  SAVE_LOAD:freeze({keywords:['save','load','세이브','저장','불러오기'],owner:'development',checks:['SAVE_LOAD_UPDATE_COMPATIBILITY']}),
  AUDIO_ROUTER:freeze({keywords:['bgm','sfx','audio','음악','효과음','타격음'],owner:'development',checks:['AUDIO_MANIFEST','ASSET_RIGHTS']}),
  OBJECT_POOLING:freeze({keywords:['pool','스폰','spawn','object count','오브젝트'],owner:'development',checks:['PERFORMANCE','OBJECT_COUNT']}),
  HEALTH_DAMAGE:freeze({keywords:['damage','hp','체력','데미지','전투'],owner:'development',checks:['BALANCE','COMBAT_RUNTIME']}),
  INVENTORY:freeze({keywords:['inventory','인벤토리','아이템','장비'],owner:'development',checks:['STATE_PERSISTENCE','MOBILE_UI']}),
  SCENE_LOADING:freeze({keywords:['scene','씬','loading','로딩','맵 전환'],owner:'development',checks:['LOADING','PAUSE_RESUME']}),
  PAUSE_RESUME:freeze({keywords:['pause','resume','일시정지','백그라운드'],owner:'qa',checks:['APP_PAUSE_RESUME']}),
  ANDROID_LIFECYCLE:freeze({keywords:['android','안드로이드','activity','resume','앱'],owner:'qa',checks:['APP_PAUSE_RESUME','CRASH_ANR_RISK']})
});

export const COMPANY_DEVICE_MATRIX=freeze([
  freeze({id:'LOW',purpose:'LOW_END_ANDROID',requiredSignals:freeze(['FPS','MEMORY','LOADING','TOUCH','PAUSE_RESUME'])}),
  freeze({id:'MID',purpose:'MID_RANGE_ANDROID',requiredSignals:freeze(['FPS','MEMORY','LOADING','TOUCH','PAUSE_RESUME'])}),
  freeze({id:'REFERENCE',purpose:'REFERENCE_ANDROID',requiredSignals:freeze(['FPS','MEMORY','LOADING','TOUCH','PAUSE_RESUME'])})
]);

export const PLAYABILITY_AXES=freeze(['CORE_FUN','INPUT_FEEL','CLARITY','DIFFICULTY','PROGRESSION','PERFORMANCE','CRASH_FREE','SESSION_COMPLETION']);
export const STYLE_DNA_FIELDS=freeze(['COLOR','SILHOUETTE','PROPORTION','UI_DENSITY','VFX','MATERIAL','LIGHTING']);

export function classifyFailure({message='',area='',evidence=''}={}){
  const text=[message,area,evidence].map(clean).join(' ').toLowerCase();
  if(has(text,['wrong source','wrong file','source wrong','responsible file','잘못된 파일','소스 잘못']))return'SOURCE_WRONG';
  if(has(text,['regression','회귀']))return'REGRESSION';
  if(has(text,['false positive','qa pass인데','qa_false','오탐']))return'QA_FALSE_POSITIVE';
  if(has(text,['save','load','세이브','저장','호환']))return'SAVE_COMPAT';
  if(has(text,['fps','frame','memory','heat','slow','성능','프레임','메모리','발열']))return'PERFORMANCE';
  if(has(text,['touch','button','ui','ux','터치','버튼','가독성','모바일']))return'MOBILE_UX';
  if(has(text,['asset','sprite','texture','audio','image','에셋','이미지','음원']))return'ASSET';
  if(has(text,['build','gradle','apk','aab','compile','빌드','컴파일']))return'BUILD';
  if(has(text,['balance','damage','hp','economy','difficulty','밸런스','데미지','난이도']))return'BALANCE';
  if(has(text,['crash','anr','exception','runtime','launch','실행','런타임','충돌']))return'RUNTIME';
  if(has(text,['logic','state','condition','branch','로직','조건','상태']))return'LOGIC_BUG';
  return'UNKNOWN';
}

export function classifyMissionType(request=''){
  const text=clean(request).toLowerCase();
  if(has(text,['crash','anr','실행 안','런타임','exception']))return'BUGFIX_RUNTIME';
  if(has(text,['fps','성능','프레임','memory','메모리','heat','발열']))return'PERFORMANCE';
  if(has(text,['ui','ux','버튼','터치','가독성','모바일']))return'MOBILE_UX';
  if(has(text,['save','load','저장','세이브','호환']))return'SAVE_COMPAT';
  if(has(text,['balance','밸런스','난이도','데미지','경제']))return'BALANCE';
  if(has(text,['story','스토리','dialogue','대사','intro','인트로','bgm','sfx','음악','효과음']))return'CREATIVE_INTEGRATION';
  if(has(text,['asset','sprite','art','graphics','그래픽','에셋','vfx']))return'GRAPHICS';
  if(has(text,['bug','fix','오류','버그','수정']))return'BUGFIX';
  return'GAMEPLAY_CODING';
}

export function affectedDepartments(missionType){
  const map={
    BUGFIX_RUNTIME:['development','qa'],
    PERFORMANCE:['development','qa','graphics'],
    MOBILE_UX:['development','qa','graphics'],
    SAVE_COMPAT:['development','qa'],
    BALANCE:['planning','balance','development','qa'],
    CREATIVE_INTEGRATION:['planning','graphics','development','qa'],
    GRAPHICS:['graphics','development','qa'],
    BUGFIX:['development','qa'],
    GAMEPLAY_CODING:['development','balance','qa']
  };
  return freeze(map[missionType]||['development','qa']);
}

export function scoreMissionPriority({userImpact=50,reproducibility=50,releaseRisk=50,crossProjectReuse=50,vibeLearningValue=50}={}){
  const inputs={userImpact:clamp(userImpact),reproducibility:clamp(reproducibility),releaseRisk:clamp(releaseRisk),crossProjectReuse:clamp(crossProjectReuse),vibeLearningValue:clamp(vibeLearningValue)};
  const score=Math.round(inputs.userImpact*.30+inputs.reproducibility*.20+inputs.releaseRisk*.25+inputs.crossProjectReuse*.15+inputs.vibeLearningValue*.10);
  const band=score>=80?'P0':score>=65?'P1':score>=45?'P2':'P3';
  return freeze({score,band,inputs,rule:'USER_AND_RELEASE_VALUE_DOMINATE_LEARNING_VALUE'});
}

export function classifyOperationalReview({material=false,productionClass='',touchesSave=false,touchesCoreLoop=false,touchesPlatform=false,releaseBlocking=false}={}){
  const full=Boolean(material||touchesSave||touchesCoreLoop||touchesPlatform||releaseBlocking||clean(productionClass)==='RELEASE_CONFIRMED');
  return full?'FULL':productionClass==='DEVELOPMENT_CONFIRMED'?'STANDARD':'FAST';
}

export function createImplementationScout({request='',target='ANDROID_MOBILE',knownRisks=[]}={}){
  const missionType=classifyMissionType(request);
  const inferred=[];
  if(missionType==='PERFORMANCE')inferred.push('DEVICE_COST','OBJECT_COUNT_OR_RENDER_COST');
  if(missionType==='SAVE_COMPAT')inferred.push('SAVE_SCHEMA_COMPATIBILITY');
  if(missionType==='MOBILE_UX')inferred.push('TOUCH_TARGET_AND_ASPECT_RATIO');
  if(missionType==='CREATIVE_INTEGRATION')inferred.push('ASSET_RIGHTS','MANIFEST_RUNTIME_INTEGRATION');
  return freeze({type:'V3_IMPLEMENTATION_SCOUT',authoritative:false,target:clean(target),missionType,risks:freeze(uniq([...knownRisks,...inferred])),outputs:freeze(['IMPLEMENTATION_DIFFICULTY','PRODUCIBILITY','MOBILE_RISK','TECH_DEBT','REQUIRED_SYSTEMS_AND_ASSETS'])});
}

export function selectGoldenComponents(request=''){
  const selected=[];
  for(const [id,meta] of Object.entries(COMPANY_GOLDEN_COMPONENTS))if(has(request,meta.keywords))selected.push(freeze({id,...meta}));
  return freeze(selected);
}

export function createDeviceMatrix({availableProfiles=[]}={}){
  const available=new Set((availableProfiles||[]).map(x=>clean(x).toUpperCase()));
  return freeze(COMPANY_DEVICE_MATRIX.map(profile=>freeze({...profile,available:available.size?available.has(profile.id):null})));
}

export function createPlayabilityScorecard(scores={}){
  const normalized={};
  for(const axis of PLAYABILITY_AXES)normalized[axis]=clamp(scores[axis]??scores[axis.toLowerCase()]??0);
  const values=Object.values(normalized);
  const average=values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):0;
  const blocking=Object.entries(normalized).filter(([,score])=>score<40).map(([axis])=>axis);
  return freeze({scores:freeze(normalized),average,blocking:freeze(blocking),advisoryOnly:true,automaticReleaseApproval:false});
}

export function assessEvidenceFreshness({evidenceSha='',currentSha='',dependencyAffected=true,exactRevisionRequired=false}={}){
  const same=Boolean(evidenceSha&&currentSha&&clean(evidenceSha)===clean(currentSha));
  if(same)return freeze({state:'CURRENT',reusable:true,reason:'SAME_REVISION'});
  if(exactRevisionRequired)return freeze({state:'STALE',reusable:false,reason:'EXACT_REVISION_REQUIRED'});
  if(dependencyAffected)return freeze({state:'STALE',reusable:false,reason:'DEPENDENCY_AFFECTED'});
  return freeze({state:'UNAFFECTED_SUBSYSTEM_EVIDENCE',reusable:true,reason:'DEPENDENCY_PROOF_REQUIRED',cannotStandInForCurrentBuild:true});
}

export function scoreExperienceQuality({realProblem=false,crossProjectReuse=false,completeVerification=false,clearCause=false,focusedDiff=false}={}){
  const signals={realProblem:Boolean(realProblem),crossProjectReuse:Boolean(crossProjectReuse),completeVerification:Boolean(completeVerification),clearCause:Boolean(clearCause),focusedDiff:Boolean(focusedDiff)};
  const weights={realProblem:25,crossProjectReuse:15,completeVerification:30,clearCause:20,focusedDiff:10};
  const score=Object.entries(signals).reduce((sum,[key,value])=>sum+(value?weights[key]:0),0);
  return freeze({score,signals:freeze(signals),learningHandoff:'EXISTING_VERIFIED_INPUTS_ONLY',createsLearningStage:false});
}

export function classifyPatternScope(projectIds=[]){
  const ids=uniq(projectIds.map(clean));
  return freeze({scope:ids.length>=2?'COMPANY_PATTERN':'PROJECT_PATTERN',distinctProjects:ids.length,requiresTwoProjectsForCompanyPattern:true});
}

export function createStyleDna(input={}){
  const dna={};
  for(const field of STYLE_DNA_FIELDS)dna[field]=input[field]??input[field.toLowerCase()]??null;
  return freeze({version:1,fields:freeze(dna),machineReadable:true,assetIdentityOnly:true});
}

export function resolveStopLoss({failedRepairAttempts=0,structuralBlocker=false}={}){
  const n=Math.max(0,Number(failedRepairAttempts)||0);
  const level=structuralBlocker&&n>=3?'HOLD':n>=3?'DESIGN_REDUCE':n>=2?'ARCHITECTURE_REVIEW':'LOCAL_FIX';
  return freeze({level,failedRepairAttempts:n,structuralBlocker:Boolean(structuralBlocker),fabricatedPassForbidden:true});
}

export function recurringFailureGuard(failures=[]){
  const groups=new Map();
  for(const failure of failures||[]){
    const category=clean(failure.category||classifyFailure(failure));
    const key=`${clean(failure.gameId)||'ANY'}:${category}:${clean(failure.signature)||clean(failure.message).slice(0,80)}`;
    const row=groups.get(key)||{key,category,count:0,gameIds:new Set(),examples:[]};
    row.count+=1;if(failure.gameId)row.gameIds.add(clean(failure.gameId));if(row.examples.length<3)row.examples.push(clean(failure.message||failure.signature));groups.set(key,row);
  }
  const candidates=[...groups.values()].filter(row=>row.count>=2).map(row=>freeze({key:row.key,category:row.category,count:row.count,projectScope:classifyPatternScope([...row.gameIds]).scope,action:'PROMOTE_TO_EXISTING_QA_OR_REGRESSION_COVERAGE',newPipeline:false}));
  return freeze(candidates);
}

export function selectCrossProjectRotation(games=[],lastGameId=''){
  const eligible=(games||[]).filter(game=>game&&game.portfolioManaged!==false&&!['LEGACY_ARCHIVE','INCUBATION_HOLD'].includes(clean(game.portfolioRole)));
  const sorted=[...eligible].sort((a,b)=>{
    const aLast=clean(a.id)===clean(lastGameId)?1:0,bLast=clean(b.id)===clean(lastGameId)?1:0;if(aLast!==bLast)return aLast-bLast;
    return String(a.lastMissionAt||'').localeCompare(String(b.lastMissionAt||''));
  });
  const chosen=sorted[0]||null;
  return freeze({gameId:chosen?.id||null,reason:chosen?'MANAGED_CROSS_PROJECT_ROTATION':'NO_ELIGIBLE_MANAGED_GAME',fabricateWorkForbidden:true});
}

export function normalizePostReleaseSignal({gameId='',type='',count=1,severity='medium',window='',privacy='aggregate'}={}){
  const known=['CRASH','ANR','SAVE_FAILURE','DEVICE_COMPATIBILITY','UX_FRICTION','BALANCE_OUTLIER','PERFORMANCE_REGRESSION','UPDATE_REGRESSION'];
  const normalized=clean(type).toUpperCase();
  if(!known.includes(normalized))throw new Error(`unsupported post-release signal: ${type}`);
  if(clean(privacy).toLowerCase()!=='aggregate')throw new Error('post-release signal must be privacy-minimized aggregate');
  return freeze({gameId:clean(gameId),type:normalized,count:Math.max(0,Number(count)||0),severity:clean(severity).toUpperCase(),window:clean(window),privacy:'AGGREGATE',missionCandidate:true});
}

export function createCreativeProductionPlan({request='',externalProviders=[]}={}){
  const text=clean(request);
  const tasks=[];
  if(has(text,['story','스토리']))tasks.push('STORY_DRAFT');
  if(has(text,['dialogue','대사']))tasks.push('DIALOGUE');
  if(has(text,['intro','인트로','cutscene','컷신']))tasks.push('INTRO_CUTSCENE_STORYBOARD');
  if(has(text,['bgm','음악','music']))tasks.push('BGM_CUE_SHEET');
  if(has(text,['sfx','효과음','타격음','sound']))tasks.push('SFX_LIST');
  if(has(text,['art direction','연출','아트 방향']))tasks.push('ART_DIRECTION_BRIEF');
  if(has(text,['localization','번역','현지화']))tasks.push('LOCALIZATION_DRAFT');
  const providers=(externalProviders||[]).filter(p=>p&&p.free===true&&p.enabled!==false).map(p=>freeze({id:clean(p.id||p.name),free:true,authority:'NON_AUTHORITATIVE_CANDIDATE'}));
  const requested=uniq(tasks);
  return freeze({
    vibeBaseline:freeze({required:true,canCompleteWithoutExternal:true,tasks:freeze(requested)}),
    external:freeze({optional:true,paidFallbackForbidden:true,providers:freeze(providers),candidateTasks:freeze(requested)}),
    integration:'DATA_MANIFEST_PLUS_SHARED_RUNTIME',
    deliveredAssetRightsEvidenceRequired:true,
    missingAudioBinaryState:'ASSET_PENDING',
    fakeAssetCompletionForbidden:true
  });
}

export function createOperationalEvidenceHarvest({missionId='',gameId='',sourceSha='',candidateCount=0,winner='',runtimePass=false,qaPass=false,regressionPass=false,protectedStatePass=false,exactRevision=false,failures=[],repairs=[]}={}){
  const verified=Boolean(runtimePass&&qaPass&&regressionPass&&protectedStatePass&&exactRevision&&winner);
  return freeze({
    type:'OPERATIONAL_EVIDENCE_HARVEST',
    missionId:clean(missionId),gameId:clean(gameId),sourceSha:clean(sourceSha),candidateCount:Math.max(0,Number(candidateCount)||0),winner:clean(winner)||null,
    failures:freeze([...(failures||[])]),repairs:freeze([...(repairs||[])]),
    verification:freeze({runtimePass:Boolean(runtimePass),qaPass:Boolean(qaPass),regressionPass:Boolean(regressionPass),protectedStatePass:Boolean(protectedStatePass),exactRevision:Boolean(exactRevision)}),
    verified,
    learningHandoff:verified?'EXISTING_VERIFIED_INPUTS_ONLY':'NONE',
    createsLearningStage:false,
    hiddenReasoningStored:false
  });
}

export function createRealDevelopmentMission({request='',gameId='',productionClass='',priority={},knownBroken=false,material=false,touchesSave=false,touchesCoreLoop=false,touchesPlatform=false,releaseBlocking=false}={}){
  const missionType=classifyMissionType(request);
  const departments=affectedDepartments(missionType);
  const priorityResult=scoreMissionPriority(priority);
  const reviewClass=classifyOperationalReview({material,productionClass,touchesSave,touchesCoreLoop,touchesPlatform,releaseBlocking});
  const failureCategory=knownBroken?classifyFailure({message:request}):null;
  const golden=selectGoldenComponents(request);
  return freeze({
    type:'REAL_DEVELOPMENT_MISSION',
    id:`mission:${clean(gameId)||'company'}:${missionType}:${priorityResult.band}`,
    gameId:clean(gameId)||null,
    request:clean(request),
    missionType,
    affectedDepartments:departments,
    priority:priorityResult,
    operationalReviewClass:reviewClass,
    failureCategory,
    goldenComponents:golden,
    existingResponsibleStageRequired:true,
    parallelPipelineForbidden:true,
    buildSystemChange:false,
    vibeLearningChange:false
  });
}

export function createCompanyOperationsPlan({request='',gameId='',productionClass='',target='ANDROID_MOBILE',knownBroken=false,priority={},material=false,touchesSave=false,touchesCoreLoop=false,touchesPlatform=false,releaseBlocking=false,externalProviders=[],availableDeviceProfiles=[]}={}){
  const mission=createRealDevelopmentMission({request,gameId,productionClass,priority,knownBroken,material,touchesSave,touchesCoreLoop,touchesPlatform,releaseBlocking});
  const scout=createImplementationScout({request,target});
  const creative=createCreativeProductionPlan({request,externalProviders});
  const devices=createDeviceMatrix({availableProfiles:availableDeviceProfiles});
  const qaChecks=uniq([
    ...mission.goldenComponents.flatMap(component=>component.checks||[]),
    ...(mission.operationalReviewClass==='FULL'?['FULL_EXISTING_POLICY_VALIDATION']:['AFFECTED_DEPARTMENT_VALIDATION']),
    'NO_BUILD_SYSTEM_CHANGE','NO_VIBE_LEARNING_CHAIN_CHANGE','EXACT_REVISION_EVIDENCE_WHERE_REQUIRED'
  ]);
  return freeze({version:1,mission,scout,creativeProduction:creative,deviceMatrix:devices,qaChecks:freeze(qaChecks),experienceHarvestMode:'OPERATIONAL_EVIDENCE_OUTSIDE_LOCKED_LEARNING_CHAIN'});
}
