import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import http from 'node:http';
import {loadSeedState,activeSeedForGame} from './game-seed-state.mjs';
import {repairDesignRequiredFields} from './company-design-prepromotion-repair.mjs';
import {scoreDesignGateV2,DESIGN_GATE_PASS_MINIMUM} from './company-design-gate-scoring-v2.mjs';
import {classifyRobloxGenre} from './roblox-genre-profile.mjs';

const ROLES=['planning','graphics','development','qa','balance'];
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const clip=(v,n=14000)=>{const s=typeof v==='string'?v:JSON.stringify(v);return s.length>n?s.slice(0,n):s;};
const uniq=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
function kstDate(){const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return`${g('year')}-${g('month')}-${g('day')}`;}
function hash(value){let h=2166136261;for(const ch of String(value)){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return h>>>0;}

const directive=readJson('company-directive.json',{});
const ai=directive.ai||{};
const geminiApiKey=clean(process.env.GEMINI_API_KEY);
const localDesignerModel=clean(process.env.COMPANY_VIBE_LOCAL_MODEL||'qwen3:1.7b');
const localDesignerFallbackReady=clean(process.env.COMPANY_LOCAL_DESIGN_FALLBACK_READY).toLowerCase()==='true';
const authorizedLeadModelPool=uniq(ai.modelPool||[]);
const policyLeadModelList=ROLES.map(role=>clean(ai.departmentLeadModels?.[role]));
const departmentLeadModelsMustBeDistinct=ai.departmentLeadModelsMustBeDistinct!==false;
if(policyLeadModelList.some(model=>!model))throw new Error('GEMINI_POLICY_LEAD_MODELS_MISSING');
if(departmentLeadModelsMustBeDistinct&&new Set(policyLeadModelList).size!==ROLES.length)throw new Error('GEMINI_POLICY_LEAD_MODELS_INVALID');
if(policyLeadModelList.some(model=>!authorizedLeadModelPool.includes(model)))throw new Error('GEMINI_POLICY_LEAD_MODEL_OUTSIDE_POOL');
const configuredLeadModels=clean(process.env.COMPANY_GEMINI_LEAD_MODELS||'').split(',').map(clean).filter(Boolean);
const geminiLeadModelList=configuredLeadModels.length?configuredLeadModels:policyLeadModelList;
if(geminiLeadModelList.some(model=>!authorizedLeadModelPool.includes(model)))throw new Error('GEMINI_UNAUTHORIZED_LEAD_MODEL');
const authorizedDesignerModels=uniq([
  clean(ai.gameDesigner?.geminiModel),
  ...(ai.gameDesigner?.geminiFallbackModels||[])
]);
const geminiDesignerModel=clean(process.env.COMPANY_GEMINI_DESIGNER_MODEL||ai.gameDesigner?.geminiModel||'gemini-3.8-flash');
if(!authorizedDesignerModels.includes(geminiDesignerModel))throw new Error('GEMINI_UNAUTHORIZED_DESIGNER_MODEL');
const configuredDesignerFallbacks=uniq(clean(process.env.COMPANY_GEMINI_FALLBACK_MODELS||'').split(','));
const geminiFallbackModelList=configuredDesignerFallbacks.length?configuredDesignerFallbacks:authorizedDesignerModels;
if(geminiFallbackModelList.some(model=>!authorizedDesignerModels.includes(model)))throw new Error('GEMINI_UNAUTHORIZED_DESIGNER_FALLBACK_MODEL');
const geminiLeadFallbackLaneSpec=clean(process.env.COMPANY_GEMINI_LEAD_FALLBACK_LANES||'');
const geminiUnavailableModels=new Map();
function isDailyGeminiQuotaError(error){
  return /GenerateRequestsPerDayPerProjectPerModel-FreeTier|requests per day|daily quota/i.test(clean(error?.message||error));
}
function persistentGeminiUnavailableStatus(error){
  const message=clean(error?.message||error);
  if(isDailyGeminiQuotaError(message))return 429;
  if(/no longer available to new users|NOT_FOUND|\b404\b/i.test(message))return 404;
  if(/PERMISSION_DENIED|\b403\b/i.test(message))return 403;
  return 0;
}
function geminiProviderRetryWindowMs(error){
  const message=clean(error?.message||error);
  if(!isDailyGeminiQuotaError(message))return 0;
  const seconds=Number(message.match(/Please retry in\s+(\d+(?:\.\d+)?)s/i)?.[1]||message.match(/retryDelay[^0-9]*(\d+(?:\.\d+)?)s/i)?.[1]);
  return Number.isFinite(seconds)&&seconds>0?Math.ceil(seconds*1000):60*60*1000;
}
function geminiQuotaRetryWindowActive(row){
  const updated=Date.parse(clean(row?.updatedAt));
  if(!Number.isFinite(updated))return true;
  return Date.now()<updated+geminiProviderRetryWindowMs(row?.lastError);
}
function kstDateForTimestamp(value){
  const time=Date.parse(clean(value));if(!Number.isFinite(time))return '';
  const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(time));
  const g=t=>p.find(x=>x.type===t)?.value||'';
  return `${g('year')}-${g('month')}-${g('day')}`;
}
function geminiCandidatesFor(primary){
  const ordered=uniq([primary,...geminiFallbackModelList]);
  const available=ordered.filter(model=>!geminiUnavailableModels.has(model));
  if(available.length)return available;
  throw new Error(`GEMINI_NO_AVAILABLE_MODELS ${[...geminiUnavailableModels.entries()].map(([model,status])=>`${model}:${status}`).join(',')}`);
}
function quarantineGeminiModel(model,status){
  if(![403,404,429].includes(Number(status)))return;
  geminiUnavailableModels.set(model,Number(status));
  console.log(`GEMINI_MODEL_QUARANTINED=${model}|status=${status}`);
}
function geminiThinkingConfigFor(model){
  return {thinkingLevel:'low'};
}
if(geminiLeadModelList.length<ROLES.length)throw new Error(`GEMINI_LEAD_MODEL_GATE: ${geminiLeadModelList.length}/${ROLES.length}`);
const leadModels=Object.fromEntries(ROLES.map((role,index)=>[role,geminiLeadModelList[index]]));
const distinctLeadModels=uniq(Object.values(leadModels));
if(departmentLeadModelsMustBeDistinct&&distinctLeadModels.length<ROLES.length)throw new Error(`GEMINI_DISTINCT_LEAD_GATE: ${distinctLeadModels.length}/${ROLES.length}`);
const primaryLeadModelSet=new Set(distinctLeadModels);
const configuredLeadFallbackModels=Object.fromEntries(ROLES.map(role=>[role,[]]));
for(const entry of geminiLeadFallbackLaneSpec.split(';').map(clean).filter(Boolean)){
  const at=entry.indexOf(':');
  if(at<1)continue;
  const role=clean(entry.slice(0,at));
  if(!ROLES.includes(role))continue;
  configuredLeadFallbackModels[role]=uniq(entry.slice(at+1).split('|')).filter(model=>authorizedLeadModelPool.includes(model)&&!primaryLeadModelSet.has(model));
}
const leadCandidateModels=Object.fromEntries(ROLES.map(role=>[role,uniq([leadModels[role],...configuredLeadFallbackModels[role]])]));
const leadCandidateOwner=new Map();
for(const role of ROLES)for(const model of leadCandidateModels[role]){const owner=leadCandidateOwner.get(model);if(departmentLeadModelsMustBeDistinct&&owner&&owner!==role)throw new Error(`GEMINI_LEAD_FAILOVER_COLLISION: ${model}:${owner}:${role}`);if(!owner)leadCandidateOwner.set(model,role);}
console.log(`GEMINI_DISTINCT_LEAD_FAILOVER_LANES=${ROLES.map(role=>`${role}:${leadCandidateModels[role].join('>')}`).join(',')}`);
const departmentReviewModels=Object.fromEntries(ROLES.map(role=>[role,[leadModels[role]]]));
const independentReviewTasks={};
const independentReviewOrder=[];
const reviewModelCount=1;
const modelPhaseConcurrency=Math.min(5,Math.max(1,Number(process.env.COMPANY_MODEL_PHASE_CONCURRENCY||5)));
const phaseConcurrency={five_lead_reviews:Math.min(5,modelPhaseConcurrency)};
const maxLoadedModelLanes=5;
const modelKeepAlive='GEMINI_API';
const modelCallTimeoutMs=Math.min(120000,Math.max(30000,Number(process.env.COMPANY_MODEL_CALL_TIMEOUT_MS||90000)));

const gameId=clean(process.env.ARTBOOK_GAME_ID||process.env.GAME_ID||process.argv.find(x=>x.startsWith('--game='))?.split('=')[1]);
const date=clean(process.env.ARTBOOK_DATE||process.env.DESIGN_DATE||kstDate());
if(!gameId)throw new Error('ARTBOOK_GAME_ID or GAME_ID is required');
const seedState=loadSeedState();
const seed=activeSeedForGame(seedState,gameId);
if(!seed)throw new Error(`GAME_SEED_REQUIRED: ${gameId}`);
const ownerPreservationDesign=seed.REUSE_EXISTING_GAMEPLAY_IMPLEMENTATION===true
  &&clean(seed.OWNER_REBUILD_MODE).toUpperCase()==='PRESERVATION_PRESENTATION_UPGRADE';
const catalog=readJson('game-catalog.json',{games:[]});
const catalogGame=(catalog.games||[]).find(x=>x.id===gameId)||null;
if(catalogGame&&clean(catalogGame.productionClass)&&clean(catalogGame.productionClass)!=='DESIGN_ONLY')throw new Error(`DESIGN_ONLY_CLASS_REQUIRED: ${catalogGame.productionClass}`);
const game={id:gameId,name:clean(catalogGame?.name||seed.gameName||gameId),description:clean(catalogGame?.description||seed.DISTINCT_IDENTITY),genre:clean(catalogGame?.genre||seed.GAME_CATEGORY),productionClass:'DESIGN_ONLY',productionTier:3,productionTarget:'DESIGN_BASELINE',webPath:catalogGame?.webPath||null,unityProjectPath:catalogGame?.unityProjectPath||null};
const designerRoute={provider:'GEMINI',model:geminiDesignerModel,id:`gemini:${geminiDesignerModel}`};
const designerFailoverRoutes=[designerRoute];
let activeDesignerRoute=designerRoute;
const designerModel=designerRoute.id;
const coordinatorModel=geminiDesignerModel;
console.log('GEMINI_THINKING_LEVEL=LOW');
console.log(`GAME_DESIGNER_PROVIDER=GEMINI`);
console.log(`GAME_DESIGNER_MODEL=${designerModel}`);
console.log(`GEMINI_LEAD_MODELS=${Object.entries(leadModels).map(([role,model])=>`${role}:${model}`).join(',')}`);
const base=path.join('design',gameId,date);fs.mkdirSync(base,{recursive:true});
const submissionBase=path.join('artbook-submissions',gameId,date);
const factPack=readJson(path.join(submissionBase,'fact-pack.json'),{});
const designLearningEvents=(Array.isArray(seedState?.seedMaterialLearning?.events)?seedState.seedMaterialLearning.events:[])
  .filter(event=>clean(event?.gameId)===gameId&&clean(event?.reviewStage)==='DESIGN_STRICT_REVIEW')
  .slice(-8);
const designLearningContext={
  role:'UNVALIDATED_DESIGN_FEEDBACK_ONLY',
  successTrainingEligible:false,
  validatedRuntimeRequiredForPositiveTraining:true,
  recent:designLearningEvents.map(event=>({
    verdict:clean(event?.verdict),
    totalScore:Number.isFinite(Number(event?.totalScore))?Number(event.totalScore):null,
    previousScore:Number.isFinite(Number(event?.previousScore))?Number(event.previousScore):null,
    scoreDelta:Number.isFinite(Number(event?.scoreDelta))?Number(event.scoreDelta):null,
    hardFailures:Array.isArray(event?.hardFailures)?event.hardFailures:[],
    resolvedHardFailures:Array.isArray(event?.resolvedHardFailures)?event.resolvedHardFailures:[],
    addedHardFailures:Array.isArray(event?.addedHardFailures)?event.addedHardFailures:[],
    rejectionReasons:Array.isArray(event?.rejectionReasons)?event.rejectionReasons:[],
    improvementTargets:Array.isArray(event?.improvementTargets)?event.improvementTargets:[],
    recordedAt:clean(event?.recordedAt)
  }))
};
const latestDesignFeedbackEvent=designLearningEvents.at(-1)||null;
const strictDesignerFeedback={
  source:'PRIOR_STRICT_DESIGN_REVIEW',
  bypassAllowed:false,
  verdict:clean(latestDesignFeedbackEvent?.verdict)||null,
  totalScore:Number.isFinite(Number(latestDesignFeedbackEvent?.totalScore))?Number(latestDesignFeedbackEvent.totalScore):null,
  hardFailures:Array.isArray(latestDesignFeedbackEvent?.hardFailures)?latestDesignFeedbackEvent.hardFailures.map(clean).filter(Boolean):[],
  rejectionReasons:Array.isArray(latestDesignFeedbackEvent?.rejectionReasons)?latestDesignFeedbackEvent.rejectionReasons:[],
  improvementTargets:Array.isArray(latestDesignFeedbackEvent?.improvementTargets)?latestDesignFeedbackEvent.improvementTargets:[],
  recordedAt:clean(latestDesignFeedbackEvent?.recordedAt)||null
};
const unityWebValidationSurfaceContract={role:'UNITY_WEB_VALIDATION_SURFACE_ONLY',separateGameTarget:false,canonicalSource:'SAME_UNITY_PROJECT',outputRoot:'web-games/<gameId>/',nativeGateAuthority:false,designRequirements:['UNITY_PROFILE_MUST_REMAIN_WEBGL_COMPATIBLE_WHEN_BUILDABLE','TOUCH_INPUT_AND_MOBILE_UI_MUST_WORK_IN_BROWSER_VALIDATION','BROWSER_PERFORMANCE_BUDGET_MUST_NOT_REQUIRE_SEPARATE_GAMEPLAY_RULES','WEB_VALIDATION_MAY_NOT_CHANGE_CORE_GAME_RULES_OR_BALANCE']};
const evidence={game,gameSeed:seed,factPack,designLearningContext,unityWebValidationSurfaceContract,centralPolicy:'COMPANY_FLOW.md'};
const DESIGN_CHECKPOINT_CONTRACT_VERSION=3;
const checkpointPath=path.join(base,'design-checkpoint.json');
const progressPath=path.join(base,'design-progress.json');
const policyDigest=createHash('sha256').update(fs.readFileSync('COMPANY_FLOW.md','utf8')).digest('hex');
const engineFiles=[
  'tools/company-design-cycle.mjs',
  'tools/company-design-gate-scoring-v2.mjs',
  'tools/company-strict-production-review.mjs',
  'tools/company-design-prepromotion-repair.mjs',
  'tools/company-baseline-gate.mjs'
];
const engineDigest=createHash('sha256').update(engineFiles.map(file=>`${file}\n${fs.readFileSync(file,'utf8')}`).join('\n---\n')).digest('hex');
const checkpointFingerprint=createHash('sha256').update(JSON.stringify({
  contractVersion:DESIGN_CHECKPOINT_CONTRACT_VERSION,
  gameId,date,seed,evidence,strictDesignerFeedback,designerModel,coordinatorModel,
  reviewModelCount,leadModels,departmentReviewModels,policyDigest,engineDigest,
  discardPolicy:directive.discardPolicy?.DESIGN_ONLY||null
})).digest('hex');
let designCheckpoint=readJson(checkpointPath,null);
const priorCheckpointStatus=clean(designCheckpoint?.status).toUpperCase();
const checkpointReusable=designCheckpoint?.contractVersion===DESIGN_CHECKPOINT_CONTRACT_VERSION&&designCheckpoint?.fingerprint===checkpointFingerprint;
const checkpointV2MigrationEligible=designCheckpoint?.contractVersion===2
  &&clean(designCheckpoint?.gameId)===gameId
  &&clean(designCheckpoint?.date)===date
  &&clean(designCheckpoint?.seedId)===clean(seed.seedId)
  &&clean(designCheckpoint?.policyDigest)===policyDigest
  &&designCheckpoint?.phases&&typeof designCheckpoint.phases==='object'
  &&designCheckpoint?.tasks&&typeof designCheckpoint.tasks==='object'
  &&designCheckpoint?.modelHealth&&typeof designCheckpoint.modelHealth==='object';
const checkpointCompatibleEngineDigests=new Set([
  '4e114701cd81e031c4a089be79544cfb23c4275c8d0f5b5f49d92926084a48ec',
  '24c3c41118092b683ffd377cd948df67544a935d6871fa290e985263cf5f3c03',
  '2ee13c831a912a1446b625b0b30f5e2fd64a6acf6fa19754420ecde80b0abc5f',
  '84ba02b00c0f6c91c9731f1ecabc12b55accadd2f2673cabdf5badc742e64dbf',
  '9aae351acc02880ef280b371a21ead70b013c820010af4eeb88e23fe059d71b3'
]);
const checkpointV3CompatibleEngineMigrationEligible=designCheckpoint?.contractVersion===DESIGN_CHECKPOINT_CONTRACT_VERSION
  &&clean(designCheckpoint?.gameId)===gameId
  &&clean(designCheckpoint?.date)===date
  &&clean(designCheckpoint?.seedId)===clean(seed.seedId)
  &&clean(designCheckpoint?.policyDigest)===policyDigest
  &&checkpointCompatibleEngineDigests.has(clean(designCheckpoint?.engineDigest))
  &&designCheckpoint?.phases&&typeof designCheckpoint.phases==='object'
  &&designCheckpoint?.tasks&&typeof designCheckpoint.tasks==='object'
  &&designCheckpoint?.modelHealth&&typeof designCheckpoint.modelHealth==='object';
if(!checkpointReusable&&(checkpointV2MigrationEligible||checkpointV3CompatibleEngineMigrationEligible)){
  const previousContractVersion=Number(designCheckpoint.contractVersion||0);
  const previousEngineDigest=clean(designCheckpoint.engineDigest);
  designCheckpoint={
    ...designCheckpoint,
    contractVersion:DESIGN_CHECKPOINT_CONTRACT_VERSION,
    fingerprint:checkpointFingerprint,
    policyDigest,
    engineDigest,
    status:'IN_PROGRESS',
    phases:designCheckpoint.phases,
    tasks:designCheckpoint.tasks,
    modelHealth:designCheckpoint.modelHealth,
    slowPhases:designCheckpoint.slowPhases&&typeof designCheckpoint.slowPhases==='object'?designCheckpoint.slowPhases:{},
    completedPhases:Array.isArray(designCheckpoint.completedPhases)?designCheckpoint.completedPhases:[],
    checkpointMigration:{
      fromContractVersion:previousContractVersion,
      toContractVersion:DESIGN_CHECKPOINT_CONTRACT_VERSION,
      reason:checkpointV2MigrationEligible?'PERSIST_GEMINI_DAILY_QUARANTINE_WITHOUT_REPLAY':'QUOTA_VIBE_REPAIR_COMPATIBLE_ENGINE_CHANGE_NO_REPLAY',
      previousEngineDigest,
      preservedPhaseCount:Object.keys(designCheckpoint.phases).length,
      preservedTaskCount:Object.keys(designCheckpoint.tasks).length,
      migratedAt:new Date().toISOString()
    },
    updatedAt:new Date().toISOString()
  };
  writeJson(checkpointPath,designCheckpoint);
  console.log(`DESIGN_CHECKPOINT_MIGRATED=${previousContractVersion===2?'V2_TO_V3':'V3_COMPATIBLE_ENGINE'}|phases=${designCheckpoint.completedPhases.length}|tasks=${Object.keys(designCheckpoint.tasks).length}|replay=NO`);
}else if(!checkpointReusable){
  designCheckpoint={contractVersion:DESIGN_CHECKPOINT_CONTRACT_VERSION,gameId,date,seedId:seed.seedId,fingerprint:checkpointFingerprint,policyDigest,engineDigest,status:'IN_PROGRESS',completedPhases:[],phases:{},tasks:{},modelHealth:{},slowPhases:{},currentPhase:'BOOTSTRAP',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  writeJson(checkpointPath,designCheckpoint);
  console.log('DESIGN_CHECKPOINT_RESET=YES');
}else{
  designCheckpoint.phases=designCheckpoint.phases&&typeof designCheckpoint.phases==='object'?designCheckpoint.phases:{};
  designCheckpoint.tasks=designCheckpoint.tasks&&typeof designCheckpoint.tasks==='object'?designCheckpoint.tasks:{};
  designCheckpoint.modelHealth=designCheckpoint.modelHealth&&typeof designCheckpoint.modelHealth==='object'?designCheckpoint.modelHealth:{};
  designCheckpoint.slowPhases=designCheckpoint.slowPhases&&typeof designCheckpoint.slowPhases==='object'?designCheckpoint.slowPhases:{};
  designCheckpoint.completedPhases=Array.isArray(designCheckpoint.completedPhases)?designCheckpoint.completedPhases:[];
  designCheckpoint.engineDigest=engineDigest;
  designCheckpoint.status='IN_PROGRESS';
  designCheckpoint.updatedAt=new Date().toISOString();
  writeJson(checkpointPath,designCheckpoint);
  console.log(`DESIGN_CHECKPOINT_RESUME=YES|phases=${designCheckpoint.completedPhases.length}|tasks=${Object.keys(designCheckpoint.tasks).length}`);
}
if(priorCheckpointStatus==='PRE_GATE_BLOCKED'&&Object.prototype.hasOwnProperty.call(designCheckpoint.phases||{},'designer_draft')){
  const retryPhases=[
    'designer_pre_gate_repair_1',
    'deterministic_pre_gate_after_repair_1',
    'designer_pre_gate_repair_2',
    'deterministic_pre_gate_after_repair_2'
  ];
  let invalidated=0;
  for(const phase of retryPhases){
    if(Object.prototype.hasOwnProperty.call(designCheckpoint.phases,phase)){
      delete designCheckpoint.phases[phase];
      invalidated+=1;
    }
  }
  designCheckpoint.completedPhases=(designCheckpoint.completedPhases||[]).filter(phase=>!retryPhases.includes(phase));
  designCheckpoint.preGateRepairGeneration=Math.max(0,Number(designCheckpoint.preGateRepairGeneration||0))+1;
  designCheckpoint.failedPhase=null;
  designCheckpoint.failedTask=null;
  designCheckpoint.lastError=null;
  designCheckpoint.currentPhase='PRE_GATE_REPAIR';
  designCheckpoint.status='IN_PROGRESS';
  designCheckpoint.updatedAt=new Date().toISOString();
  writeJson(checkpointPath,designCheckpoint);
  console.log(`DESIGN_PRE_GATE_REPAIR_RETRY_GENERATION=${designCheckpoint.preGateRepairGeneration}|invalidated=${invalidated}|fullCycleRestart=NO`);
}
for(const [rawModel,row] of Object.entries(designCheckpoint.modelHealth||{})){
  const status=persistentGeminiUnavailableStatus(row?.lastError);
  if(!status)continue;
  if(status===429&&!geminiQuotaRetryWindowActive(row)){
    const model=clean(rawModel).replace(/^gemini:/,'');
    if(model)console.log(`GEMINI_MODEL_QUARANTINE_EXPIRED=${model}|status=429|scope=PROVIDER_RETRY_WINDOW`);
    continue;
  }
  const model=clean(rawModel).replace(/^gemini:/,'');
  if(!model)continue;
  geminiUnavailableModels.set(model,status);
  console.log(`GEMINI_MODEL_QUARANTINE_RESTORED=${model}|status=${status}|scope=CHECKPOINT|${date}`);
}
const PROGRESS_STAGE_ORDER=['BOOTSTRAP','DESIGNER_DRAFT','PRE_GATE','PRE_GATE_REPAIR','DEPARTMENT_REVIEWS','DESIGNER_REVISION','COMPLETE'];
function writeProgress(stage=designCheckpoint.currentPhase||'BOOTSTRAP',extra={}){
  const index=Math.max(0,PROGRESS_STAGE_ORDER.indexOf(stage));
  const percent=stage==='COMPLETE'?100:Math.round(index/(PROGRESS_STAGE_ORDER.length-1)*100);
  writeJson(progressPath,{
    version:2,gameId,date,engineDigest,status:designCheckpoint.status,currentStage:stage,percent,
    completedPhases:[...designCheckpoint.completedPhases],
    completedPhaseCount:designCheckpoint.completedPhases.length,
    cachedTaskCount:Object.keys(designCheckpoint.tasks).length,
    lastSuccessfulModelCallAt:designCheckpoint.lastSuccessfulModelCallAt||null,
    failedPhase:designCheckpoint.failedPhase||null,
    failedTask:designCheckpoint.failedTask||null,
    lastError:designCheckpoint.lastError||null,
    modelHealth:designCheckpoint.modelHealth||{},
    slowPhases:designCheckpoint.slowPhases||{},
    updatedAt:new Date().toISOString(),
    ...extra
  });
}
function persistDesignCheckpoint(){
  designCheckpoint.updatedAt=new Date().toISOString();
  writeJson(checkpointPath,designCheckpoint);
  writeProgress();
}
writeProgress('BOOTSTRAP',{checkpointReusable});

const MEMBER_TEXT={type:'string',maxLength:130};
const MEMBER_REVIEW={type:'object',required:['keep','fix','add','risks','evidence','questions'],properties:{keep:{type:'array',maxItems:1,items:MEMBER_TEXT},fix:{type:'array',maxItems:1,items:MEMBER_TEXT},add:{type:'array',maxItems:1,items:MEMBER_TEXT},risks:{type:'array',maxItems:1,items:MEMBER_TEXT},evidence:{type:'array',maxItems:1,items:MEMBER_TEXT},questions:{type:'array',maxItems:1,items:MEMBER_TEXT}},additionalProperties:false};
const SHORT_TEXT={type:'string',maxLength:260};
const MULTIPLAYER_MODES=['SINGLE','COOP','COMPETITIVE','HYBRID'];
const REVIEW={type:'object',required:['keep','fix','add','risks','evidence','questions'],properties:{keep:{type:'array',maxItems:2,items:SHORT_TEXT},fix:{type:'array',maxItems:2,items:SHORT_TEXT},add:{type:'array',maxItems:2,items:SHORT_TEXT},risks:{type:'array',maxItems:2,items:SHORT_TEXT},evidence:{type:'array',maxItems:2,items:SHORT_TEXT},questions:{type:'array',maxItems:2,items:SHORT_TEXT}},additionalProperties:false};
const SYSTEM_INTERCONNECTION={type:'object',required:['fromSystem','toSystem','trigger','stateChange'],properties:{fromSystem:{type:'string',maxLength:180},toSystem:{type:'string',maxLength:180},trigger:{type:'string',maxLength:300},stateChange:{type:'string',maxLength:360}},additionalProperties:false};
const PROGRESSION_ECONOMY_BALANCE={type:'object',required:['progressionLoop','resourceFlow','balanceRules'],properties:{progressionLoop:{type:'string',maxLength:700},resourceFlow:{type:'string',maxLength:700},balanceRules:{type:'string',maxLength:700}},additionalProperties:false};
const CONTENT_EXPANSION={type:'object',required:['milestone','newGameplay','systemImpact'],properties:{milestone:{type:'string',maxLength:220},newGameplay:{type:'string',maxLength:500},systemImpact:{type:'string',maxLength:500}},additionalProperties:false};
const FAILURE_RETRY_RISK={type:'object',required:['failureStates','retryFlow','riskPressure','recoveryRules'],properties:{failureStates:{type:'array',minItems:2,maxItems:6,items:{type:'string',maxLength:260}},retryFlow:{type:'string',maxLength:600},riskPressure:{type:'string',maxLength:600},recoveryRules:{type:'string',maxLength:600}},additionalProperties:false};
const PLATFORM_FIT_PLAN={type:'object',required:['targetPlatform','inputModel','performanceBudget','sessionConstraints'],properties:{targetPlatform:{type:'string',enum:['ROBLOX','UNITY','FORTNITE_UEFN']},inputModel:{type:'string',maxLength:600},performanceBudget:{type:'string',maxLength:600},sessionConstraints:{type:'string',maxLength:600}},additionalProperties:false};
const PLATFORM_PROFILE={type:'object',required:['platform','inputModel','sessionModel','multiplayerRuntime','performanceBudget','uiUx','saveAndNetwork','platformContentAdaptation','internalReleaseTarget','validationEvidence'],properties:{platform:{type:'string',enum:['ROBLOX','UNITY']},inputModel:{type:'string',maxLength:700},sessionModel:{type:'string',maxLength:700},multiplayerRuntime:{type:'string',maxLength:700},performanceBudget:{type:'string',maxLength:700},uiUx:{type:'string',maxLength:700},saveAndNetwork:{type:'string',maxLength:700},platformContentAdaptation:{type:'string',maxLength:700},internalReleaseTarget:{type:'string',maxLength:700},validationEvidence:{type:'string',maxLength:700}},additionalProperties:false};
const PLATFORM_PROFILES={type:'object',required:['ROBLOX','UNITY'],properties:{ROBLOX:{...PLATFORM_PROFILE,properties:{...PLATFORM_PROFILE.properties,platform:{type:'string',enum:['ROBLOX']}}},UNITY:{...PLATFORM_PROFILE,properties:{...PLATFORM_PROFILE.properties,platform:{type:'string',enum:['UNITY']}}}},additionalProperties:false};
const UX_ACCESSIBILITY_PLAN={type:'object',required:['hudPriorities','touchAndInput','readability','accessibility'],properties:{hudPriorities:{type:'string',maxLength:500},touchAndInput:{type:'string',maxLength:500},readability:{type:'string',maxLength:500},accessibility:{type:'string',maxLength:500}},additionalProperties:false};
const ART_AUDIO_DIRECTION={type:'object',required:['visualIdentity','audioIdentity','gameplayFeedbackSync'],properties:{visualIdentity:{type:'string',maxLength:600},audioIdentity:{type:'string',maxLength:600},gameplayFeedbackSync:{type:'string',maxLength:600}},additionalProperties:false};
const IMPLEMENTATION_TRACE={type:'object',required:['designElement','responsibleSystem','validationEvidence'],properties:{designElement:{type:'string',maxLength:240},responsibleSystem:{type:'string',maxLength:240},validationEvidence:{type:'string',maxLength:420}},additionalProperties:false};
const PRESERVATION_CONTRACT={type:'object',required:['mode','sourceOfTruth','lockedSemantics','presentationPasses','gameplayRule','targetSessionMinutes'],properties:{mode:{type:'string',enum:['PRESERVATION_PRESENTATION_UPGRADE']},sourceOfTruth:{type:'string',enum:['EXISTING_IMPLEMENTATION_AND_OWNER_SEED']},lockedSemantics:{type:'array',minItems:8,maxItems:12,items:{type:'string',enum:['WORLD_AND_REGIONS','STORY_AND_QUESTS','COMBAT_RULES','CRAFTING_RECIPES_AND_COSTS','SAVE_KEY_AND_SCHEMA_MEANING','PROGRESSION','BALANCE_VALUES','DROPS_AND_REWARDS','HIT_AND_COOLDOWN_SEMANTICS','MULTIPLAYER_MODE']}},presentationPasses:{type:'array',minItems:7,maxItems:7,items:{type:'string',enum:['ASSET_ADAPTATION','LIVING_MOTION','ANIMATION_FEEL','VFX','AUDIO_FEEL','CAMERA_LANGUAGE','POLISH_MOBILE']}},gameplayRule:{type:'string',enum:['NO_GAMEPLAY_MECHANIC_ADDITION_REMOVAL_OR_REBALANCE']},targetSessionMinutes:{type:'number'}},additionalProperties:false};
const DESIGN={type:'object',required:['identity','playerFantasy','coreFun','coreLoop','signatureSystems','systemInterconnections','progressionDirection','progressionEconomyBalance','contentExpansionPlan','failureRetryRisk','platformFitPlan','platformProfiles','visualDirection','mobileUx','uxAccessibilityPlan','artAudioDirection','marketTargetDirection','steamExpansionDecision','multiplayerMode','multiplayerExpansionDecision','technicalAssumptions','validationQuestions','implementationTraceability','openQuestions'],properties:{identity:{type:'string',maxLength:1000},playerFantasy:{type:'string',maxLength:900},coreFun:{type:'string',maxLength:900},coreLoop:{type:'array',minItems:3,maxItems:8,items:{type:'string',maxLength:340}},signatureSystems:{type:'array',minItems:2,maxItems:6,items:{type:'object',required:['name','purpose','playerChoice'],properties:{name:{type:'string',maxLength:130},purpose:{type:'string',maxLength:440},playerChoice:{type:'string',maxLength:440}},additionalProperties:false}},systemInterconnections:{type:'array',minItems:3,maxItems:8,items:SYSTEM_INTERCONNECTION},progressionDirection:{type:'string',maxLength:900},progressionEconomyBalance:PROGRESSION_ECONOMY_BALANCE,contentExpansionPlan:{type:'array',minItems:3,maxItems:6,items:CONTENT_EXPANSION},failureRetryRisk:FAILURE_RETRY_RISK,platformFitPlan:PLATFORM_FIT_PLAN,platformProfiles:PLATFORM_PROFILES,visualDirection:{type:'string',maxLength:900},mobileUx:{type:'string',maxLength:900},uxAccessibilityPlan:UX_ACCESSIBILITY_PLAN,artAudioDirection:ART_AUDIO_DIRECTION,marketTargetDirection:{type:'string',maxLength:900},steamExpansionDecision:{type:'string',maxLength:500},multiplayerMode:{type:'string',enum:MULTIPLAYER_MODES},multiplayerExpansionDecision:{type:'string',maxLength:500},technicalAssumptions:{type:'array',minItems:2,maxItems:8,items:{type:'string',maxLength:340}},validationQuestions:{type:'array',minItems:2,maxItems:8,items:{type:'string',maxLength:340}},implementationTraceability:{type:'array',minItems:3,maxItems:8,items:IMPLEMENTATION_TRACE},openQuestions:{type:'array',maxItems:8,items:{type:'string',maxLength:340}},preservationContract:PRESERVATION_CONTRACT},additionalProperties:false};
function enforceOwnerPreservationDesign(value){
  if(!ownerPreservationDesign)return value;
  const existingMode=clean(seed.MULTIPLAYER_DESIGN_MODE).toUpperCase();
  const lockedSemantics=['WORLD_AND_REGIONS','STORY_AND_QUESTS','COMBAT_RULES','CRAFTING_RECIPES_AND_COSTS','SAVE_KEY_AND_SCHEMA_MEANING','PROGRESSION','BALANCE_VALUES','DROPS_AND_REWARDS','HIT_AND_COOLDOWN_SEMANTICS','MULTIPLAYER_MODE'];
  const presentationPasses=['ASSET_ADAPTATION','LIVING_MOTION','ANIMATION_FEEL','VFX','AUDIO_FEEL','CAMERA_LANGUAGE','POLISH_MOBILE'];
  return {
    ...value,
    identity:'기존 마력숲 생존기의 세계관·지역·스토리·퀘스트·전투·제작·진행·세이브 의미를 그대로 보존하고 표현 품질만 단계적으로 높이는 보존형 Vibe 파일럿이다.',
    coreFun:'기존 탐험·채집·제작·전투·퀘스트 선택과 결과는 바꾸지 않고, 같은 입력과 같은 판정에 살아있는 모션·명확한 타격 피드백·일관된 에셋 표현을 결합해 체감 품질을 높인다.',
    coreLoop:Array.isArray(seed.CORE_LOOP)&&seed.CORE_LOOP.length>=3?seed.CORE_LOOP.slice(0,8):value.coreLoop,
    signatureSystems:[
      {name:'기존 게임플레이 의미 보존',purpose:'현재 구현의 월드·퀘스트·전투·제작·진행·보상·세이브 규칙을 구현 기준으로 잠그고 표현 변경이 게임 결과를 바꾸지 않게 한다.',playerChoice:'플레이어의 선택·자원 소비·전투 판정·퀘스트 결과는 기존 구현과 동일하게 유지된다.'},
      {name:'표현 품질 순차 개선',purpose:'기존 책임 렌더·모션·전투 이벤트·오디오·카메라 흐름 안에서 에셋 적응부터 모바일 폴리시까지 순차 적용한다.',playerChoice:'새 능력이나 수치 선택을 추가하지 않고 기존 행동의 시각·청각 피드백만 더 명확하고 자연스럽게 만든다.'}
    ],
    systemInterconnections:[
      {fromSystem:'기존 월드/캐릭터 렌더',toSystem:'ASSET_ADAPTATION',trigger:'기존 오브젝트와 캐릭터를 그리는 동일 렌더 경로',stateChange:'게임 상태는 유지하고 색·재질·실루엣·레이어 표현만 마력숲 스타일 락에 맞춘다.'},
      {fromSystem:'기존 이동/공격 상태',toSystem:'LIVING_MOTION_AND_ANIMATION_FEEL',trigger:'기존 이동 속도와 authoritative 공격 이벤트',stateChange:'판정·쿨다운·데미지는 유지하고 호흡·가감속·회전·공격 anticipation/impact/recovery 표현만 동기화한다.'},
      {fromSystem:'기존 전투/퀘스트 이벤트',toSystem:'VFX_AUDIO_CAMERA_POLISH',trigger:'기존 적중·피격·보상·스토리 이벤트',stateChange:'같은 이벤트 순간에 VFX·사운드·카메라 피드백을 연결하되 저장·진행·보상 의미는 변경하지 않는다.'}
    ],
    progressionDirection:'기존 마력숲의 퀘스트 체인, 연구소, 수정 지역, 화산, 세계수, 보스와 장기 진행 순서를 그대로 유지한다. 이번 파일럿에서 새 성장 규칙·새 경제·새 해금 조건을 만들지 않는다.',
    progressionEconomyBalance:{
      progressionLoop:'기존 구현의 탐험·채집·제작·전투·퀘스트 진행 루프를 그대로 사용하며 표현 패스는 진행 속도와 해금 조건에 관여하지 않는다.',
      resourceFlow:'기존 재료 획득량·제작 비용·보상·드랍·소비 규칙을 그대로 유지하고 표현 개선은 자원 수치에 영향을 주지 않는다.',
      balanceRules:'체력·공격력·쿨다운·드랍률·제작 비용·보상·적 수치 등 기존 밸런스 값을 변경하지 않는다.'
    },
    contentExpansionPlan:[
      {milestone:'ASSET_ADAPTATION',newGameplay:'새 게임플레이를 추가하지 않는다. 기존 캐릭터·몬스터·자원·구조물·지역 표현을 기존 렌더 책임 함수 안에서 마력숲 스타일에 맞게 적응한다.',systemImpact:'원본 에셋과 게임 상태를 보존하고 렌더 표현만 바꾼다. 세이브·충돌·상호작용·수치 변경은 금지한다.'},
      {milestone:'LIVING_MOTION_AND_ANIMATION_FEEL',newGameplay:'새 행동을 추가하지 않는다. 기존 idle·이동·회전·공격·피격 상태에 호흡·블렌딩·anticipation·impact·recovery를 연결한다.',systemImpact:'기존 입력·이동 속도·데미지·쿨다운·적중 이벤트를 권위로 사용하고 애니메이션은 표현 계층으로만 동작한다.'},
      {milestone:'VFX_AUDIO_CAMERA_POLISH_MOBILE',newGameplay:'새 규칙을 추가하지 않는다. 기존 적중·위험·보상·스토리 이벤트에 VFX·오디오·카메라·UI 폴리시를 동기화한다.',systemImpact:'모바일 가독성·터치·프레임 안정성을 우선하고 게임플레이·저장·진행 의미는 그대로 유지한다.'}
    ],
    failureRetryRisk:{
      failureStates:['기존 구현에 이미 정의된 전투·생존 실패 상태만 유지한다.','기존 퀘스트 또는 진행에서 이미 정의된 실패·재시도 상태만 유지한다.'],
      retryFlow:'기존 사망·회복·재시도·귀환 흐름과 저장 결과를 그대로 유지하며 새 자원 손실이나 패널티를 추가하지 않는다.',
      riskPressure:'기존 지역·적·생존 규칙이 만드는 위험만 사용하고 표현 패스가 난이도나 위험 수치를 변경하지 않는다.',
      recoveryRules:'기존 회복·부활·재개·세이브 로드 규칙을 그대로 사용하고 새 회복 규칙을 만들지 않는다.'
    },
    platformFitPlan:{
      targetPlatform:clean(seed.INITIAL_TARGET_PLATFORM).toUpperCase(),
      inputModel:'기존 키보드 및 모바일 터치/조이스틱 입력 체계를 유지하고 표현 효과가 입력 영역이나 반응성을 가리지 않게 한다.',
      performanceBudget:'가능한 경우 60fps를 목표로 하되 파티클·트레일·보조 모션은 단계적으로 축소 가능하게 하고 게임플레이 판정은 품질 스케일과 무관하게 유지한다.',
      sessionConstraints:`기존 세션과 진행 의미를 보존하며 설계 검증 기준 TARGET_SESSION_MINUTES=${Number(seed.TARGET_SESSION_MINUTES||30)}을 유지한다. 표현 개선 때문에 세션 길이·진행 속도를 바꾸지 않는다.`
    },
    visualDirection:'기존 마력숲의 숲·수정·화산·세계수·연구소 정체성을 유지하면서 팔레트·광원·윤곽·재질 반응·VFX 밀도를 하나의 스타일 락으로 통일한다.',
    artAudioDirection:{
      visualIdentity:'기존 월드와 오브젝트를 재사용·변형하여 마력숲 고유 지역 구분을 더 명확히 하며 새 게임 규칙을 시각 요소로 위장해 추가하지 않는다.',
      audioIdentity:'기존 음악/사운드 책임 시스템을 재사용하고 탐험·전투·보스·스토리 상태 전환을 부드럽게 연결한다.',
      gameplayFeedbackSync:'기존 authoritative 적중·피격·상호작용 이벤트 한 지점에 애니메이션·VFX·오디오·카메라를 동기화하고 데미지 판정 시점은 바꾸지 않는다.'
    },
    multiplayerMode:existingMode,
    multiplayerExpansionDecision:'기존 seed에 확정된 멀티플레이 모드를 그대로 유지하며 이번 표현 파일럿에서 네트워크 규칙·플레이 모드를 추가·삭제·변경하지 않는다.',
    technicalAssumptions:[
      `기존 Web 구현 경로 ${clean(seed.EXISTING_WEB_SOURCE_PATH)||'web-games/fantasy-survival'}를 canonical 구현으로 사용하고 기존 책임 함수를 직접 수정한다.`,
      `기존 SAVE_POLICY=${clean(seed.SAVE_POLICY)||'PRESERVE_EXISTING_SAVE'}를 지키며 저장 키·필드 의미·퀘스트 상태를 변경하지 않는다.`,
      '그래픽·모션·VFX·오디오·카메라는 게임 로직과 분리된 표현 계층으로 연결하고 wrapper/shadow 파이프라인을 만들지 않는다.'
    ],
    validationQuestions:[
      '표현 전후에 동일 입력으로 체력·데미지·쿨다운·드랍·제작 비용·퀘스트·지역 진행·세이브 결과가 동일한가?',
      '모바일 터치 중 효과가 입력과 위험 신호를 가리지 않고 프레임 타이밍이 안정적인가?',
      '기존 저장 데이터를 불러온 뒤 연구소·퀘스트·장비·지역 진행이 그대로 이어지는가?'
    ],
    implementationTraceability:[
      {designElement:'ASSET_ADAPTATION',responsibleSystem:'기존 캐릭터·몬스터·월드 렌더 함수',validationEvidence:'동일 게임 상태에서 표현만 변경되고 충돌·상호작용·자원·세이브 값이 동일함을 비교한다.'},
      {designElement:'LIVING_MOTION_AND_ANIMATION_FEEL',responsibleSystem:'기존 이동·공격·피격 상태와 렌더 업데이트',validationEvidence:'idle/walk/run/turn/attack 전환 연속성과 기존 적중 이벤트·데미지·쿨다운 불변을 함께 검증한다.'},
      {designElement:'VFX_AUDIO_CAMERA_POLISH_MOBILE',responsibleSystem:'기존 전투·퀘스트 이벤트와 오디오/카메라 책임 경로',validationEvidence:'적중 순간 동기화, 모바일 가독성, 프레임 안정성, 중복 재생 없음과 게임 상태 불변을 검증한다.'}
    ],
    openQuestions:['표현 비용을 가장 많이 유발하는 기존 오브젝트 구간은 어디이며 품질 스케일에서 무엇을 먼저 줄일 것인가?'],
    preservationContract:{
      mode:'PRESERVATION_PRESENTATION_UPGRADE',
      sourceOfTruth:'EXISTING_IMPLEMENTATION_AND_OWNER_SEED',
      lockedSemantics,
      presentationPasses,
      gameplayRule:'NO_GAMEPLAY_MECHANIC_ADDITION_REMOVAL_OR_REBALANCE',
      targetSessionMinutes:Number(seed.TARGET_SESSION_MINUTES||30)
    }
  };
}
const DESIGN_GATE_FIELDS=['systemInterconnections','progressionEconomyBalance','contentExpansionPlan','failureRetryRisk','platformFitPlan','platformProfiles','uxAccessibilityPlan','artAudioDirection','implementationTraceability'];
const DESIGN_BASE_FIELDS=DESIGN.required.filter(key=>!DESIGN_GATE_FIELDS.includes(key));
const designSliceSchema=fields=>({type:'object',required:[...fields],properties:Object.fromEntries(fields.map(key=>[key,DESIGN.properties[key]])),additionalProperties:false});
const DESIGN_BASE=designSliceSchema(DESIGN_BASE_FIELDS);
const DESIGN_GATE=designSliceSchema(DESIGN_GATE_FIELDS);
function mergeDesignerDesign(basePart,gatePart,phase){
  const grounded=repairDesignRequiredFields({...basePart,...gatePart},{seed,factPack,phase});
  const merged=enforceOwnerPreservationDesign(grounded.value);
  assertSchemaValue(merged,DESIGN);
  if(grounded.repairs?.length)console.log(`DESIGN_MERGE_GROUNDED_REPAIRS=${phase}|${grounded.repairs.map(item=>item.field).join(',')}`);
  console.log(`DESIGN_SPLIT_SCHEMA_MERGED=${phase}|base=${DESIGN_BASE_FIELDS.length}|gate=${DESIGN_GATE_FIELDS.length}`);
  return merged;
}
const AXIS_FIELDS=Object.freeze({
  IDEA_AND_DISTINCTNESS:['identity','playerFantasy','coreFun','coreLoop','signatureSystems'],
  CATEGORY_IDENTITY:['identity','coreLoop','multiplayerMode','multiplayerExpansionDecision'],
  CORE_LOOP_DESIGN:['coreFun','coreLoop','signatureSystems'],
  SYSTEM_INTERCONNECTION_DESIGN:['systemInterconnections'],
  PROGRESSION_ECONOMY_BALANCE_DESIGN:['progressionDirection','progressionEconomyBalance'],
  CONTENT_EXPANSION_PLAN:['contentExpansionPlan'],
  FAILURE_RETRY_RISK_DESIGN:['failureRetryRisk'],
  PLATFORM_FIT_DESIGN:['platformFitPlan','platformProfiles','mobileUx'],
  UX_AND_ACCESSIBILITY_PLAN:['mobileUx','uxAccessibilityPlan'],
  ART_AUDIO_DIRECTION:['visualDirection','artAudioDirection'],
  IMPLEMENTATION_FEASIBILITY_AND_TRACEABILITY:['technicalAssumptions','validationQuestions','implementationTraceability']
});
const AXIS_ROLES=Object.freeze({
  IDEA_AND_DISTINCTNESS:['planning'],
  CATEGORY_IDENTITY:['planning','qa'],
  CORE_LOOP_DESIGN:['planning','balance'],
  SYSTEM_INTERCONNECTION_DESIGN:['development','qa'],
  PROGRESSION_ECONOMY_BALANCE_DESIGN:['planning','balance'],
  CONTENT_EXPANSION_PLAN:['planning','balance'],
  FAILURE_RETRY_RISK_DESIGN:['qa','balance'],
  PLATFORM_FIT_DESIGN:['development','qa'],
  UX_AND_ACCESSIBILITY_PLAN:['graphics','qa'],
  ART_AUDIO_DIRECTION:['graphics'],
  IMPLEMENTATION_FEASIBILITY_AND_TRACEABILITY:['development','qa']
});
function genreProfileForDesign(design){
  return classifyRobloxGenre({
    category:seed.GAME_CATEGORY,
    identity:clean(design?.identity||seed.DISTINCT_IDENTITY),
    coreLoop:Array.isArray(design?.coreLoop)?design.coreLoop:(Array.isArray(seed.CORE_LOOP)?seed.CORE_LOOP:[]),
    designText:JSON.stringify(design||{}),
    multiplayerMode:clean(design?.multiplayerMode||seed.MULTIPLAYER_DESIGN_MODE)
  });
}
function deterministicPreGate(design){
  return scoreDesignGateV2({
    seed,
    designRecord:{sameModelAsDraft:false,content:design},
    cycleStatus:{status:'IN_PROGRESS'},
    robloxGenreProfile:genreProfileForDesign(design)
  });
}
function preGatePass(scored){
  return Number(scored?.totalScore||0)>=DESIGN_GATE_PASS_MINIMUM&&Array.isArray(scored?.hardFailures)&&scored.hardFailures.length===0;
}
function repairPacket(scored){
  const reasons=Array.isArray(scored?.rejectionReasons)?scored.rejectionReasons:[];
  return {
    source:'DETERMINISTIC_PRE_GATE_V2',
    bypassAllowed:false,
    totalScore:Number(scored?.totalScore||0),
    passMinimum:DESIGN_GATE_PASS_MINIMUM,
    hardFailures:Array.isArray(scored?.hardFailures)?scored.hardFailures:[],
    failedAxes:Array.isArray(scored?.criticalAxisFailures)?scored.criticalAxisFailures:[],
    reasons:reasons.map(reason=>({
      code:reason.code,axis:reason.axis,evidenceLevel:reason.evidenceLevel,
      minimumRequired:reason.minimumRequired,evidence:reason.evidence,
      requiredAction:reason.requiredAction,bypassAllowed:false
    }))
  };
}
function repairFields(scored){
  const axes=uniq([
    ...(Array.isArray(scored?.criticalAxisFailures)?scored.criticalAxisFailures:[]),
    ...(Array.isArray(scored?.rejectionReasons)?scored.rejectionReasons.map(reason=>reason?.axis):[])
  ]);
  const fields=uniq(axes.flatMap(axis=>AXIS_FIELDS[axis]||[])).filter(field=>DESIGN.required.includes(field));
  return fields.length?fields:['identity','coreFun','coreLoop','signatureSystems'];
}
function repairStructureContract(fields){
  const rules=[];
  if(fields.includes('identity'))rules.push('identity: 공백 포함 최소 60자 이상의 구체적 게임 정체성. coreLoop와 signatureSystems가 왜 이 게임만의 선택/상태변화를 만드는지 직접 설명.');
  if(fields.includes('playerFantasy'))rules.push('playerFantasy: 공백 포함 최소 40자 이상의 구체적 플레이어 역할·행동·결과 판타지.');
  if(fields.includes('coreFun'))rules.push('coreFun: 공백 포함 최소 40자 이상. 반복되는 실제 선택, 관찰 가능한 상태변화, 즉각적 결과를 명시.');
  if(fields.includes('coreLoop'))rules.push('coreLoop: 서로 다른 실제 플레이 단계 최소 3개. 입력/선택 -> 상태변화 -> 보상·위험·다음 선택의 연결을 포함.');
  if(fields.includes('signatureSystems'))rules.push('signatureSystems: 최소 2개 서로 다른 시스템. 각 name은 최소 2자, purpose와 playerChoice는 각각 최소 20자 이상의 구체적 내용.');
  if(fields.includes('contentExpansionPlan'))rules.push('contentExpansionPlan: 최소 3개 서로 다른 객체. JS String.length 기준 각 milestone은 최소 20자, newGameplay/systemImpact는 각각 최소 30자 이상으로 실제 새 플레이와 기존 시스템 영향을 구체적으로 설명.');
  if(fields.includes('implementationTraceability'))rules.push('implementationTraceability: 최소 3개 서로 다른 객체. JS String.length 기준 각 designElement/responsibleSystem은 최소 20자, validationEvidence는 최소 30자 이상으로 검증 방법까지 구체적으로 작성.');
  if(fields.includes('technicalAssumptions'))rules.push('technicalAssumptions: 서로 다른 구현 가정 최소 2개이며 각 항목은 JS String.length 기준 최소 24자 이상.');
  if(fields.includes('validationQuestions'))rules.push('validationQuestions: 서로 다른 검증 질문 최소 2개이며 각 항목은 JS String.length 기준 최소 24자 이상.');
  if(fields.includes('systemInterconnections'))rules.push('systemInterconnections: 최소 3개 서로 다른 객체. JS String.length 기준 fromSystem/toSystem은 각각 최소 16자, trigger/stateChange는 각각 최소 24자 이상으로 구체적으로 작성.');
  return rules;
}
function impactedRolesFromScores(...scores){
  const axes=uniq(scores.flatMap(scored=>[
    ...(Array.isArray(scored?.criticalAxisFailures)?scored.criticalAxisFailures:[]),
    ...(Array.isArray(scored?.rejectionReasons)?scored.rejectionReasons.map(reason=>reason?.axis):[])
  ]));
  return uniq(axes.flatMap(axis=>AXIS_ROLES[axis]||[]));
}
function mergeTargetedPatch(current,patch,phase){
  const grounded=repairDesignRequiredFields({...current,...patch},{seed,factPack,phase});
  assertSchemaValue(grounded.value,DESIGN);
  return grounded.value;
}
const reviewsSchemaFor=roles=>({type:'object',required:roles,properties:Object.fromEntries(roles.map(role=>[role,MEMBER_REVIEW])),additionalProperties:false});
const REBUTTAL={type:'object',required:['accept','challenge','revision','reason'],properties:{accept:{type:'array',maxItems:3,items:SHORT_TEXT},challenge:{type:'array',maxItems:3,items:SHORT_TEXT},revision:{type:'array',maxItems:3,items:SHORT_TEXT},reason:{type:'string',maxLength:550}},additionalProperties:false};
const MEETING={type:'object',required:['summary','decisions'],properties:{summary:{type:'string',maxLength:800},decisions:{type:'array',maxItems:12,items:{type:'object',required:['topic','status','reason','departments'],properties:{topic:{type:'string',maxLength:190},status:{type:'string',enum:['CONSENSUS','CONFLICT','HOLD']},reason:{type:'string',maxLength:550},departments:{type:'array',maxItems:5,items:{type:'string',maxLength:40}}},additionalProperties:false}}},additionalProperties:false};
const FATAL_CRITERIA=directive.discardPolicy?.DESIGN_ONLY?.fatalCriteria||[];
const FATAL_REVIEW={type:'object',required:['recommendedState','fatalCriteria','evidence','reason'],properties:{recommendedState:{type:'string',enum:['ACTIVE','REDESIGN','DISCARD']},fatalCriteria:{type:'array',maxItems:4,items:{type:'string',enum:FATAL_CRITERIA}},evidence:{type:'array',maxItems:4,items:SHORT_TEXT},reason:{type:'string',maxLength:700}},additionalProperties:false};
const phaseMs={};
const modelCallStats=[];
const phaseBudgetMs={
  designer_draft:180000,
  designer_draft_base:180000,
  designer_draft_gate:180000,
  deterministic_pre_gate:30000,
  designer_pre_gate_repair_1:180000,
  designer_pre_gate_repair_2:180000,
  independent_department_reviews:240000,
  designer_revision:180000,
  designer_revision_base:180000,
  designer_revision_gate:180000,
  five_lead_reviews:180000
};
function stageForPhase(name){
  if(name.startsWith('designer_draft'))return'DESIGNER_DRAFT';
  if(name==='deterministic_pre_gate')return'PRE_GATE';
  if(name.startsWith('designer_pre_gate_repair'))return'PRE_GATE_REPAIR';
  if(name==='independent_department_reviews')return'DEPARTMENT_REVIEWS';
  if(name.startsWith('designer_revision'))return'DESIGNER_REVISION';
  if(name==='five_lead_reviews')return'DEPARTMENT_REVIEWS';
  return designCheckpoint.currentPhase||'BOOTSTRAP';
}
function modelHealthEntry(model){
  const current=designCheckpoint.modelHealth?.[model]||{};
  return {
    calls:Number(current.calls||0),successes:Number(current.successes||0),failures:Number(current.failures||0),
    timeouts:Number(current.timeouts||0),jsonFailures:Number(current.jsonFailures||0),
    totalMs:Number(current.totalMs||0),lastMs:Number(current.lastMs||0),lastError:current.lastError||null,
    updatedAt:current.updatedAt||null
  };
}
function recordModelHealth(model,{success,elapsedMs,error=null}){
  const row=modelHealthEntry(model);
  row.calls+=1;row.totalMs+=Math.max(0,Number(elapsedMs||0));row.lastMs=Math.max(0,Number(elapsedMs||0));
  if(success)row.successes+=1;
  else{
    row.failures+=1;
    const message=clean(error?.message||error);
    row.lastError=message||null;
    if(/timeout|timed out|aborted/i.test(message))row.timeouts+=1;
    if(/json|schema|empty model response/i.test(message))row.jsonFailures+=1;
  }
  row.updatedAt=new Date().toISOString();
  designCheckpoint.modelHealth[model]=row;
}
function modelHealthPenalty(model){
  const row=modelHealthEntry(model);
  if(!row.calls)return 0;
  const avg=row.totalMs/Math.max(1,row.calls);
  return avg+(row.failures*45000)+(row.timeouts*60000)+(row.jsonFailures*25000);
}
async function runPhase(name,work){
  if(Object.prototype.hasOwnProperty.call(designCheckpoint.phases,name)){
    phaseMs[name]=0;
    designCheckpoint.currentPhase=stageForPhase(name);
    persistDesignCheckpoint();
    console.log(`DESIGN_CHECKPOINT_HIT=${name}`);
    return designCheckpoint.phases[name];
  }
  const started=Date.now();
  designCheckpoint.currentPhase=stageForPhase(name);
  persistDesignCheckpoint();
  try{
    const result=await work();
    phaseMs[name]=Date.now()-started;
    const budget=Number(phaseBudgetMs[name]||0);
    if(budget>0&&phaseMs[name]>budget){
      designCheckpoint.slowPhases[name]={elapsedMs:phaseMs[name],budgetMs:budget,recordedAt:new Date().toISOString()};
      console.log(`DESIGN_PHASE_BUDGET_EXCEEDED=${name}|${phaseMs[name]}/${budget}`);
    }
    designCheckpoint.phases[name]=result;
    if(!designCheckpoint.completedPhases.includes(name))designCheckpoint.completedPhases.push(name);
    designCheckpoint.failedPhase=null;designCheckpoint.failedTask=null;designCheckpoint.lastError=null;
    persistDesignCheckpoint();
    console.log(`DESIGN_PHASE_MS=${name}|${phaseMs[name]}`);
    console.log(`DESIGN_CHECKPOINT_SAVED=${name}`);
    return result;
  }catch(error){
    phaseMs[name]=Date.now()-started;
    designCheckpoint.failedPhase=name;
    designCheckpoint.lastError=clean(error?.message||error);
    persistDesignCheckpoint();
    console.log(`DESIGN_CHECKPOINT_FAILED_AT=${name}`);
    throw error;
  }
}
async function runCheckpointTask(phase,key,work){
  const taskKey=`${phase}::${key}`;
  if(Object.prototype.hasOwnProperty.call(designCheckpoint.tasks,taskKey)){
    console.log(`DESIGN_TASK_CHECKPOINT_HIT=${taskKey}`);
    return designCheckpoint.tasks[taskKey];
  }
  try{
    const result=await work();
    designCheckpoint.tasks[taskKey]=result;
    designCheckpoint.failedPhase=null;designCheckpoint.failedTask=null;designCheckpoint.lastError=null;
    persistDesignCheckpoint();
    console.log(`DESIGN_TASK_CHECKPOINT_SAVED=${taskKey}`);
    return result;
  }catch(error){
    designCheckpoint.failedPhase=phase;designCheckpoint.failedTask=key;designCheckpoint.lastError=clean(error?.message||error);
    persistDesignCheckpoint();
    console.log(`DESIGN_TASK_CHECKPOINT_FAILED=${taskKey}`);
    throw error;
  }
}
function isParallelPressure(error){
  return /(?:timeout|timed out|aborted|out of memory|memory|503|busy|loading model|runner process|connection reset|socket hang up|fetch failed|resource temporarily unavailable)/i.test(clean(error?.message||error));
}
async function parallelObject(keys,worker,concurrency=modelPhaseConcurrency){
  const entries=new Array(keys.length);
  let nextIndex=0;
  const workerCount=Math.min(Math.max(1,concurrency),keys.length);
  await Promise.all(Array.from({length:workerCount},async()=>{
    while(true){
      const index=nextIndex++;
      if(index>=keys.length)break;
      const key=keys[index];
      entries[index]=[key,await worker(key)];
    }
  }));
  return Object.fromEntries(entries);
}
async function parallelObjectByLane(keys,laneForKey,worker,concurrency=modelPhaseConcurrency,{maxLanes=maxLoadedModelLanes,perLane=2}={}){
  const entries=new Array(keys.length);
  const pending=keys.map((key,index)=>({key,index,lane:clean(laneForKey(key))||key}));
  const active=new Map();
  const laneCounts=new Map();
  let token=0;
  while(pending.length||active.size){
    while(active.size<Math.max(1,concurrency)){
      const activeLanes=[...laneCounts.entries()].filter(([,count])=>count>0).map(([lane])=>lane);
      const pendingIndex=pending.findIndex(item=>{
        const laneCount=laneCounts.get(item.lane)||0;
        if(laneCount>0)return laneCount<perLane;
        return activeLanes.length<Math.max(1,maxLanes);
      });
      if(pendingIndex<0)break;
      const [item]=pending.splice(pendingIndex,1);
      const taskToken=++token;
      laneCounts.set(item.lane,(laneCounts.get(item.lane)||0)+1);
      const promise=(async()=>({taskToken,item,value:await worker(item.key)}))();
      active.set(taskToken,promise);
    }
    if(!active.size)throw new Error('MODEL_LANE_SCHEDULER_STALLED');
    const {taskToken,item,value}=await Promise.race(active.values());
    active.delete(taskToken);
    laneCounts.set(item.lane,Math.max(0,(laneCounts.get(item.lane)||1)-1));
    entries[item.index]=[item.key,value];
  }
  return Object.fromEntries(entries);
}
async function adaptiveParallel(label,initialConcurrency,work){
  let concurrency=Math.max(1,initialConcurrency);
  while(true){
    try{
      console.log(`MODEL_PHASE_CONCURRENCY_START=${label}|${concurrency}`);
      return await work(concurrency);
    }catch(error){
      if(concurrency<=1||!isParallelPressure(error))throw error;
      const next=Math.max(1,concurrency-1);
      console.log(`MODEL_PHASE_CONCURRENCY_FALLBACK=${label}|${concurrency}->${next}|reason=${clean(error?.message||error)}`);
      concurrency=next;
    }
  }
}
function departmentDesignContext(role,design){
  const fields={
    planning:['identity','playerFantasy','coreFun','coreLoop','signatureSystems','progressionDirection','contentExpansionPlan','failureRetryRisk','marketTargetDirection','multiplayerMode','multiplayerExpansionDecision','openQuestions'],
    graphics:['identity','playerFantasy','coreFun','signatureSystems','visualDirection','mobileUx','uxAccessibilityPlan','artAudioDirection','platformFitPlan'],
    development:['coreLoop','signatureSystems','systemInterconnections','platformFitPlan','technicalAssumptions','implementationTraceability','failureRetryRisk','multiplayerMode'],
    qa:['coreLoop','systemInterconnections','failureRetryRisk','platformFitPlan','uxAccessibilityPlan','validationQuestions','implementationTraceability','multiplayerMode'],
    balance:['coreLoop','signatureSystems','progressionDirection','progressionEconomyBalance','contentExpansionPlan','failureRetryRisk','multiplayerMode']
  }[role]||Object.keys(design||{});
  return Object.fromEntries(fields.filter(key=>Object.prototype.hasOwnProperty.call(design||{},key)).map(key=>[key,design[key]]));
}
function parseJsonObject(text){
  const raw=String(text??'').trim();
  if(!raw)throw new Error('empty model response');
  const unfenced=raw.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
  try{return JSON.parse(unfenced);}catch{}
  const first=unfenced.indexOf('{');const last=unfenced.lastIndexOf('}');
  if(first>=0&&last>first)return JSON.parse(unfenced.slice(first,last+1));
  throw new Error('model response is not a JSON object');
}
function assertSchemaValue(value,schema,label='root'){
  if(!schema||typeof schema!=='object')return;
  if(schema.enum&&!schema.enum.includes(value))throw new Error(`schema enum mismatch: ${label}`);
  if(schema.type==='object'){
    if(!value||Array.isArray(value)||typeof value!=='object')throw new Error(`schema object mismatch: ${label}`);
    for(const key of schema.required||[])if(!(key in value))throw new Error(`schema required missing: ${label}.${key}`);
    if(schema.additionalProperties===false)for(const key of Object.keys(value))if(!Object.prototype.hasOwnProperty.call(schema.properties||{},key))throw new Error(`schema additional property: ${label}.${key}`);
    for(const [key,child] of Object.entries(schema.properties||{}))if(key in value)assertSchemaValue(value[key],child,`${label}.${key}`);
    return;
  }
  if(schema.type==='array'){
    if(!Array.isArray(value))throw new Error(`schema array mismatch: ${label}`);
    if(Number.isFinite(schema.minItems)&&value.length<schema.minItems)throw new Error(`schema minItems mismatch: ${label}`);
    if(Number.isFinite(schema.maxItems)&&value.length>schema.maxItems)throw new Error(`schema maxItems mismatch: ${label}`);
    for(let i=0;i<value.length;i++)assertSchemaValue(value[i],schema.items,`${label}[${i}]`);
    return;
  }
  if(schema.type==='string'){
    if(typeof value!=='string')throw new Error(`schema string mismatch: ${label}`);
    if(Number.isFinite(schema.maxLength)&&value.length>schema.maxLength)throw new Error(`schema maxLength mismatch: ${label}`);
  }
}
function normalizeSchemaValue(value,schema,label='root',repairs=[]){
  if(!schema||typeof schema!=='object')return value;
  if(schema.type==='object'){
    if(!value||Array.isArray(value)||typeof value!=='object')return value;
    const required=schema.required||[];
    if(required.length===1&&!Object.prototype.hasOwnProperty.call(value,required[0])){
      const child=schema.properties?.[required[0]];
      const childKeys=new Set(Object.keys(child?.properties||{}));
      const valueKeys=Object.keys(value);
      if(child?.type==='object'&&valueKeys.length>0&&valueKeys.every(key=>childKeys.has(key))){
        repairs.push(`wrap-required-object:${label}.${required[0]}`);
        value={[required[0]]:value};
      }
    }
    const normalized={};
    for(const [key,child] of Object.entries(schema.properties||{})){
      if(Object.prototype.hasOwnProperty.call(value,key))normalized[key]=normalizeSchemaValue(value[key],child,`${label}.${key}`,repairs);
      else if((schema.required||[]).includes(key)&&child?.type==='array'&&(!Number.isFinite(child.minItems)||child.minItems===0)){
        normalized[key]=[];
        repairs.push(`fill-empty-array:${label}.${key}`);
      }
    }
    if(schema.additionalProperties!==false)for(const [key,childValue] of Object.entries(value))if(!Object.prototype.hasOwnProperty.call(normalized,key))normalized[key]=childValue;
    else for(const key of Object.keys(value))if(!Object.prototype.hasOwnProperty.call(schema.properties||{},key))repairs.push(`drop-extra:${label}.${key}`);
    return normalized;
  }
  if(schema.type==='array'){
    if(!Array.isArray(value))return value;
    let normalized=value.map((item,index)=>normalizeSchemaValue(item,schema.items,`${label}[${index}]`,repairs));
    if(Number.isFinite(schema.maxItems)&&normalized.length>schema.maxItems){repairs.push(`trim-array:${label}:${normalized.length}->${schema.maxItems}`);normalized=normalized.slice(0,schema.maxItems);}
    return normalized;
  }
  if(schema.type==='string'&&typeof value==='string'&&Number.isFinite(schema.maxLength)&&value.length>schema.maxLength){repairs.push(`trim-string:${label}:${value.length}->${schema.maxLength}`);return value.slice(0,schema.maxLength);}
  return value;
}

function geminiMinuteRetryDelayMs(error,candidateModel){
  const message=clean(error?.message||error);
  if(Number(error?.geminiStatus||0)!==429)return 0;
  const explicit=message.match(/retryDelay[^0-9]*(\d+(?:\.\d+)?)s/i)?.[1]||message.match(/Please retry in\s+(\d+(?:\.\d+)?)s/i)?.[1];
  if(!explicit)return 0;
  const seconds=Math.min(70,Math.max(5,Math.ceil(Number(explicit))));
  const stagger=(hash(`${gameId}:${candidateModel}`)%5)*1000;
  return seconds*1000+stagger;
}

async function callModel(model,system,user,schema,{predict=1100,temperature=0.25,repairRequired=null,numCtx=8192,timeoutMs=null,maxAttempts=3,candidateModels=null}={}){
  const callStarted=Date.now();
  const requestedModel=model;
  const candidates=Array.isArray(candidateModels)&&candidateModels.length?uniq(candidateModels).filter(candidate=>!geminiUnavailableModels.has(candidate)):geminiCandidatesFor(requestedModel);
  if(!candidates.length)throw new Error(`GEMINI_NO_AVAILABLE_CANDIDATES ${requestedModel}`);
  const effectiveTimeoutMs=Math.min(120000,Math.max(30000,Number(timeoutMs||modelCallTimeoutMs)));
  const attemptLimit=Math.min(3,Math.max(1,Number(maxAttempts||3)));
  let lastError=null;
  for(const candidateModel of candidates){
    let minuteRateRetries=0;
    for(let attempt=1;attempt<=attemptLimit;attempt++){
      try{
        const prompt=user+(attempt>1&&lastError?`\nPREVIOUS_VALIDATION_ERROR=${clean(lastError?.message)}\n오류를 수정하고 JSON 객체만 반환한다.`:'')+'\n출력은 스키마에 맞는 JSON 객체만 반환한다.';
        const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(candidateModel)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,{
          method:'POST',
          headers:{'content-type':'application/json'},
          body:JSON.stringify({
            systemInstruction:{parts:[{text:system}]},
            contents:[{role:'user',parts:[{text:prompt}]}],
            generationConfig:{
              temperature:attempt===1?temperature:0,
              maxOutputTokens:Math.min(8192,Math.max(schema===DESIGN?4096:(schema===DESIGN_BASE||schema===DESIGN_GATE?2200:768),Number(predict||1100))),
              responseMimeType:'application/json',
              responseJsonSchema:schema,
              thinkingConfig:geminiThinkingConfigFor(candidateModel)
            }
          }),
          signal:AbortSignal.timeout(effectiveTimeoutMs)
        });
        if(!response.ok){
          const bodyText=clip(await response.text(),1600);
          const error=new Error(`gemini ${response.status}: ${bodyText}`);
          error.geminiStatus=response.status;
          throw error;
        }
        const body=await response.json();
        const candidate=Array.isArray(body.candidates)?body.candidates[0]:null;
        const finishReason=clean(candidate?.finishReason);
        const raw=clean((body.candidates||[]).flatMap(item=>item?.content?.parts||[]).map(part=>part?.text||'').join(''));
        if(!raw)throw new Error(`GEMINI_EMPTY_RESPONSE finishReason=${finishReason||'UNKNOWN'}`);
        if(finishReason==='MAX_TOKENS')throw new Error(`GEMINI_OUTPUT_TRUNCATED model=${candidateModel} chars=${raw.length}`);
        const parsed=parseJsonObject(raw);
        const repairs=[];
        let normalized=normalizeSchemaValue(parsed,schema,'root',repairs);
        if(typeof repairRequired==='function'){
          const grounded=repairRequired(normalized);
          if(grounded?.value)normalized=grounded.value;
          if(Array.isArray(grounded?.repairs)&&grounded.repairs.length)for(const item of grounded.repairs)repairs.push(`grounded-required:${item.field}:${item.source}`);
        }
        assertSchemaValue(normalized,schema);
        const elapsedMs=Date.now()-callStarted;
        recordModelHealth(`gemini:${candidateModel}`,{success:true,elapsedMs});
        designCheckpoint.lastSuccessfulModelCallAt=new Date().toISOString();
        designCheckpoint.geminiModelResolution=designCheckpoint.geminiModelResolution&&typeof designCheckpoint.geminiModelResolution==='object'?designCheckpoint.geminiModelResolution:{};
        designCheckpoint.geminiModelResolution[requestedModel]=candidateModel;
        modelCallStats.push({model:`gemini:${candidateModel}`,requestedModel:`gemini:${requestedModel}`,provider:'GEMINI',attempt,elapsedMs,predict,mode:'gemini-json-schema',timeoutMs:effectiveTimeoutMs,schemaRepairs:repairs.length});
        persistDesignCheckpoint();
        if(candidateModel!==requestedModel)console.log(`GEMINI_MODEL_FAILOVER_RESOLVED=${requestedModel}->${candidateModel}`);
        console.log(`GEMINI_CALL_MS=${candidateModel}|${elapsedMs}|attempt=${attempt}|timeout=${effectiveTimeoutMs}`);
        return normalized;
      }catch(error){
        lastError=error;
        recordModelHealth(`gemini:${candidateModel}`,{success:false,elapsedMs:Date.now()-callStarted,error});
        persistDesignCheckpoint();
        const status=Number(error?.geminiStatus||0);
        if(status===429&&isDailyGeminiQuotaError(error)){
          quarantineGeminiModel(candidateModel,status);
          const nextCandidate=candidates.slice(candidates.indexOf(candidateModel)+1).find(model=>!geminiUnavailableModels.has(model))||null;
          console.log(`GEMINI_DAILY_QUOTA_EXHAUSTED=${candidateModel}|retry=NO|next=${nextCandidate||'NONE'}`);
          console.log(`GEMINI_MODEL_FAILOVER=${requestedModel}|${candidateModel}->${nextCandidate||'NONE'}|status=${status}`);
          break;
        }
        const minuteRetryMs=geminiMinuteRetryDelayMs(error,candidateModel);
        if(status===429&&minuteRetryMs>0&&minuteRateRetries<2){
          minuteRateRetries+=1;
          console.log(`GEMINI_RATE_LIMIT_WAIT=${candidateModel}|${minuteRetryMs}|retry=${minuteRateRetries}`);
          await new Promise(r=>setTimeout(r,minuteRetryMs));
          attempt-=1;
          continue;
        }
        if(status===429||status===404||status===403){
          quarantineGeminiModel(candidateModel,status);
          const nextCandidate=candidates.slice(candidates.indexOf(candidateModel)+1).find(model=>!geminiUnavailableModels.has(model))||null;
          console.log(`GEMINI_MODEL_FAILOVER=${requestedModel}|${candidateModel}->${nextCandidate||'NONE'}|status=${status}`);
          break;
        }
        if(attempt<attemptLimit){
          await new Promise(r=>setTimeout(r,600*attempt));
          continue;
        }
        break;
      }
    }
  }
  throw new Error(`GEMINI_CALL_FAILED ${requestedModel}: ${clean(lastError?.message)}`);
}

async function callExternalDesignerModel(route,system,user,schema,options={}){
  if(route.provider!=='GEMINI')throw new Error(`GEMINI_PROVIDER_ROUTE_INVALID ${route.provider}`);
  if(!geminiApiKey)throw new Error('GEMINI_API_KEY_UNAVAILABLE');
  return callModel(route.model,system,user,schema,options);
}
async function requestLocalDesignerRaw(prompt,{predict=1600,temperature=0.1,numCtx=8192,timeoutMs=120000}={}){
  const body=JSON.stringify({
    model:localDesignerModel,
    prompt,
    stream:false,
    think:false,
    format:'json',
    options:{
      num_predict:Math.min(8192,Math.max(512,Number(predict||1600))),
      temperature:Number.isFinite(Number(temperature))?Number(temperature):0.1,
      num_ctx:Math.min(16384,Math.max(4096,Number(numCtx||8192)))
    }
  });
  return await new Promise((resolve,reject)=>{
    let settled=false;
    const finish=(error,value='')=>{
      if(settled)return;
      settled=true;
      clearTimeout(timer);
      if(req&&!req.destroyed)req.destroy();
      if(error)reject(error);else resolve(value);
    };
    const timer=setTimeout(()=>finish(new Error(`OLLAMA_DESIGN_TIMEOUT ${timeoutMs}ms`)),Math.max(30000,Number(timeoutMs)||120000));
    const req=http.request({hostname:'127.0.0.1',port:11434,path:'/api/generate',method:'POST',headers:{'content-type':'application/json','content-length':Buffer.byteLength(body)}},res=>{
      let data='';
      res.setEncoding('utf8');
      res.on('data',chunk=>data+=chunk);
      res.on('end',()=>{
        try{
          if((res.statusCode||0)<200||(res.statusCode||0)>=300)throw new Error(`OLLAMA_DESIGN_HTTP_${res.statusCode} ${clip(data,800)}`);
          const row=JSON.parse(data);
          if(row?.error)throw new Error(`OLLAMA_DESIGN_ERROR ${clean(row.error)}`);
          const raw=clean(row?.response);
          if(!raw)throw new Error('OLLAMA_DESIGN_EMPTY_RESPONSE');
          finish(null,raw);
        }catch(error){finish(error);}
      });
      res.on('error',finish);
    });
    req.on('error',finish);
    req.end(body);
  });
}
async function callLocalDesignerModel(system,user,schema,{predict=1600,temperature=0.1,repairRequired=null,numCtx=8192,timeoutMs=120000}={}){
  if(!localDesignerFallbackReady)throw new Error('VIBE_LOCAL_DESIGN_FALLBACK_NOT_READY');
  const started=Date.now();
  const prompt=`${system}\n\n${user}\n\nLOCAL_AUTHORING_RULES=JSON_OBJECT_ONLY;DO_NOT_DECIDE_GATE_PASS_FAIL;PRESERVE_OWNER_INTENT;REPAIR_ONLY_REQUESTED_SCOPE`;
  try{
    const raw=await requestLocalDesignerRaw(prompt,{predict,temperature,numCtx,timeoutMs});
    const parsed=parseJsonObject(raw);
    const repairs=[];
    let normalized=normalizeSchemaValue(parsed,schema,'root',repairs);
    if(typeof repairRequired==='function'){
      const grounded=repairRequired(normalized);
      if(grounded?.value)normalized=grounded.value;
      if(Array.isArray(grounded?.repairs)&&grounded.repairs.length)for(const item of grounded.repairs)repairs.push(`grounded-required:${item.field}:${item.source}`);
    }
    assertSchemaValue(normalized,schema);
    const elapsedMs=Date.now()-started;
    recordModelHealth(`ollama:${localDesignerModel}`,{success:true,elapsedMs});
    modelCallStats.push({model:`ollama:${localDesignerModel}`,requestedModel:designerRoute.id,provider:'VIBE_LOCAL_OLLAMA',attempt:1,elapsedMs,predict,mode:'ollama-json',timeoutMs,schemaRepairs:repairs.length});
    designCheckpoint.lastSuccessfulModelCallAt=new Date().toISOString();
    console.log(`DESIGN_AUTHORING_FAILOVER=VIBE_LOCAL_OLLAMA|${localDesignerModel}|ms=${elapsedMs}`);
    return normalized;
  }catch(error){
    recordModelHealth(`ollama:${localDesignerModel}`,{success:false,elapsedMs:Date.now()-started,error});
    persistDesignCheckpoint();
    throw error;
  }
}
async function callDesignerModel(system,user,schema,options={}){
  let geminiError=null;
  if(geminiApiKey){
    try{
      const value=await callExternalDesignerModel(designerRoute,system,user,schema,options);
      designCheckpoint.effectiveDesignerModel=designerRoute.id;
      designCheckpoint.effectiveDesignerProvider='GEMINI';
      persistDesignCheckpoint();
      return value;
    }catch(error){
      geminiError=error;
      console.log(`DESIGN_AUTHORING_GEMINI_UNAVAILABLE=${clip(clean(error?.message||error),500)}`);
    }
  }else{
    geminiError=new Error('GEMINI_API_KEY_UNAVAILABLE');
    console.log('DESIGN_AUTHORING_GEMINI_UNAVAILABLE=NO_API_KEY');
  }
  try{
    const value=await callLocalDesignerModel(system,user,schema,options);
    designCheckpoint.effectiveDesignerModel=`ollama:${localDesignerModel}`;
    designCheckpoint.effectiveDesignerProvider='VIBE_LOCAL_OLLAMA';
    persistDesignCheckpoint();
    return value;
  }catch(localError){
    throw new Error(`DESIGN_AUTHORING_PROVIDERS_FAILED gemini=${clip(clean(geminiError?.message||geminiError),350)} local=${clip(clean(localError?.message||localError),350)}`);
  }
}

async function generateDesignerDraft(){
  const preservationDirective=ownerPreservationDesign?' 이 seed는 기존 게임 보존형 표현 업그레이드다. 기존 세계관·지역·스토리·퀘스트·전투·제작·진행·밸런스·드랍·세이브·hit/cooldown 의미를 절대 재설계하지 않는다. 새 스킬·게이지·패널티·보상·자원·해금 규칙을 추가하지 않고 ASSET_ADAPTATION→LIVING_MOTION→ANIMATION_FEEL→VFX→AUDIO_FEEL→CAMERA_LANGUAGE→POLISH_MOBILE 표현 패스만 설계한다.':'';
  const system=`너는 단일 Game Designer AI다. GAME_SEED를 설계 원점으로 사용한다. 유명 성공작의 구조는 오마주/재해석할 수 있지만 보호되는 표현과 소스코드는 복제하지 않는다. 점수나 관문을 조작하지 말고 실제 설계를 완성한다.${preservationDirective}`;
  const user=`DESIGN_ONLY 상세 설계를 한 번에 완성하라. 정체성·핵심 재미·core loop·signature systems·시스템 연결·진행/경제·콘텐츠 확장·실패/재시도·플랫폼 적합성·UX/접근성·아트/오디오·구현 추적성을 서로 연결한다. UNITY platformProfiles는 네이티브와 별개 게임을 설계하지 말고 같은 canonical Unity 프로젝트가 Unity Web/WebGL 검증 표면에서도 동작하도록 터치 입력·모바일 UI·브라우저 성능·WebGL 호환성을 포함한다. Unity Web은 릴리스 플랫폼이나 별도 게임 규칙이 아니며 핵심 규칙·밸런스를 바꾸지 않는다. SINGLE/COOP/COMPETITIVE/HYBRID 중 하나를 multiplayerMode에 반드시 명시한다. 이전 Strict 실패는 삭제하지 말고 실제 설계로 해결한다. scorer 최소치에 딱 맞추지 말고 구조·문자 길이에 충분한 안전여유를 둔다.\nPRE_GATE_STRUCTURE_CONTRACT=${JSON.stringify(repairStructureContract(DESIGN.required))}\nSTRICT_GATE_FEEDBACK=${clip(strictDesignerFeedback,4500)}\nEVIDENCE=${clip(evidence,10500)}`;
  try{
    const full=await callDesignerModel(system,user,DESIGN,{predict:4096,temperature:0.28,numCtx:8192,timeoutMs:90000,maxAttempts:2,repairRequired:value=>repairDesignRequiredFields(value,{seed,factPack,phase:'DRAFT'})});
    console.log('DESIGNER_DRAFT_GENERATION=ONE_CALL');
    return enforceOwnerPreservationDesign(full);
  }catch(error){
    console.log(`DESIGNER_DRAFT_ONE_CALL_FALLBACK=SPLIT|reason=${clean(error?.message||error)}`);
    const basePart=await callDesignerModel(system,`기본 설계 필드만 작성하라.\nSTRICT_GATE_FEEDBACK=${clip(strictDesignerFeedback,4500)}\nEVIDENCE=${clip(evidence,8500)}`,DESIGN_BASE,{predict:1000,temperature:0.3,numCtx:8192,timeoutMs:90000,maxAttempts:2});
    const gatePart=await callDesignerModel('너는 같은 Game Designer AI다. 기본 설계를 하드관문이 검증 가능한 상세 설계로 확장한다.',`관문 상세 필드만 작성하라.\nGAME_SEED=${clip(seed,4500)}\nBASE_DESIGN=${clip(basePart,8000)}`,DESIGN_GATE,{predict:1000,temperature:0.2,numCtx:8192,timeoutMs:90000,maxAttempts:2});
    return enforceOwnerPreservationDesign(mergeDesignerDesign(basePart,gatePart,'DRAFT'));
  }
}
function scoreCurrentDesign(label,design){
  const started=Date.now();
  const scored=deterministicPreGate(design);
  phaseMs[label]=Date.now()-started;
  designCheckpoint.phases[label]=scored;
  if(!designCheckpoint.completedPhases.includes(label))designCheckpoint.completedPhases.push(label);
  designCheckpoint.failedPhase=null;
  designCheckpoint.failedTask=null;
  designCheckpoint.lastError=null;
  persistDesignCheckpoint();
  console.log(`DESIGN_DETERMINISTIC_PRE_GATE=${label}|${scored.totalScore}|hard=${(scored.hardFailures||[]).join(',')||'NONE'}`);
  return scored;
}

let designDraft=enforceOwnerPreservationDesign(await runPhase('designer_draft',generateDesignerDraft));
// Deterministic scoring is intentionally never served from checkpoint cache.
// The current design object is cheap to rescore and may have changed after targeted repair.
let preGate=scoreCurrentDesign('deterministic_pre_gate',designDraft);
const preGateHistory=[preGate];
writeJson(path.join(base,'design-pre-gate.json'),{version:3,gameId,date,attempt:0,pass:preGatePass(preGate),repairPacket:repairPacket(preGate),score:preGate});
for(let repairAttempt=1;repairAttempt<=2&&!preGatePass(preGate);repairAttempt++){
  const fields=repairFields(preGate);
  const schema=designSliceSchema(fields);
  const packet=repairPacket(preGate);
  const patch=await runPhase(`designer_pre_gate_repair_${repairAttempt}`,()=>callDesignerModel(
    '너는 최초 설계를 작성한 동일 Game Designer AI다. 실패한 deterministic 설계축만 실제 설계 변경으로 수리한다. 통과를 가장하거나 실패코드를 삭제하지 않는다.',
    `현재 실패축만 수정하라. 지정 필드 외 내용은 반환하지 않는다. 각 필드는 REPAIR_PACKET의 requiredAction을 실제 구현 가능한 구체적 설계로 만족시켜야 한다. 아래 STRUCTURE_CONTRACT는 scorer가 직접 검사하는 최소 구조이며 축소하거나 형식적으로 채우면 안 된다.\nREPAIR_FIELDS=${JSON.stringify(fields)}\nSTRUCTURE_CONTRACT=${JSON.stringify(repairStructureContract(fields))}\nREPAIR_PACKET=${clip(packet,6500)}\nGAME_SEED=${clip(seed,4500)}\nCURRENT_DESIGN=${clip(Object.fromEntries(fields.map(field=>[field,designDraft[field]])),8000)}`,
    schema,
    {predict:Math.min(1500,550+fields.length*140),temperature:0.1,numCtx:6144,timeoutMs:120000,maxAttempts:2}
  ));
  designDraft=enforceOwnerPreservationDesign(mergeTargetedPatch(designDraft,patch,`PRE_GATE_REPAIR_${repairAttempt}`));
  designCheckpoint.phases.designer_draft=designDraft;
  preGate=scoreCurrentDesign(`deterministic_pre_gate_after_repair_${repairAttempt}`,designDraft);
  preGateHistory.push(preGate);
  writeJson(path.join(base,'design-pre-gate.json'),{version:3,gameId,date,attempt:repairAttempt,pass:preGatePass(preGate),repairPacket:repairPacket(preGate),score:preGate,history:preGateHistory.map(row=>({totalScore:row.totalScore,hardFailures:row.hardFailures,criticalAxisFailures:row.criticalAxisFailures}))});
  persistDesignCheckpoint();
}
writeJson(path.join(base,'design-draft.json'),{version:5,gameId,date,productionClass:'DESIGN_ONLY',tierAlias:3,tier:3,gameSeedId:seed.seedId,gameSeedSource:'game-seed-state.json',authorRole:'GAME_DESIGNER_AI',authorModel:activeDesignerRoute.id,singleAuthor:true,preGate:{pass:preGatePass(preGate),totalScore:preGate.totalScore,hardFailures:preGate.hardFailures,criticalAxisFailures:preGate.criticalAxisFailures,attempts:preGateHistory.length-1},content:designDraft});
if(!preGatePass(preGate)){
  designCheckpoint.status='PRE_GATE_BLOCKED';
  designCheckpoint.lastError=`DESIGN_PRE_GATE_BLOCKED score=${preGate.totalScore} hard=${(preGate.hardFailures||[]).join(',')||'NONE'}`;
  console.log('DESIGN_PRE_GATE_REPAIR_CHECKPOINTS_PRESERVED=YES');
  persistDesignCheckpoint();
  writeProgress('PRE_GATE_REPAIR',{blocked:true,preGateScore:preGate.totalScore,hardFailures:preGate.hardFailures,repairPacket:repairPacket(preGate)});
  throw new Error(designCheckpoint.lastError);
}
writeProgress('DEPARTMENT_REVIEWS',{preGateScore:preGate.totalScore,preGatePass:true});
console.log(`DESIGN_PRE_GATE=PASS|${preGate.totalScore}`);


function deterministicDepartmentReview(role,scored){
  const roleAxes=Object.entries(AXIS_ROLES).filter(([,roles])=>roles.includes(role)).map(([axis])=>axis);
  const failures=(scored.rejectionReasons||[]).filter(reason=>roleAxes.includes(reason?.axis));
  const weakest=[...roleAxes].sort((a,b)=>Number(scored.evidenceLevels?.[a]||0)-Number(scored.evidenceLevels?.[b]||0))[0]||'NONE';
  const strongest=[...roleAxes].sort((a,b)=>Number(scored.evidenceLevels?.[b]||0)-Number(scored.evidenceLevels?.[a]||0))[0]||'NONE';
  const firstFailure=failures[0];
  const short=value=>clip(clean(value),125);
  return {
    keep:[short(`${strongest} evidence=${Number(scored.evidenceLevels?.[strongest]||0)} deterministic`)],
    fix:firstFailure?[short(firstFailure.requiredAction||`${firstFailure.axis} deterministic evidence 보강`)]:[],
    add:[],
    risks:firstFailure?[short(`${firstFailure.code}:${firstFailure.axis}`)]:[],
    evidence:[short(roleAxes.map(axis=>`${axis}=${Number(scored.evidenceLevels?.[axis]||0)}`).join(','))],
    questions:[]
  };
}
console.log('DESIGN_ONLY_REVIEW_MODE=DETERMINISTIC_DEPARTMENT_EVIDENCE');
console.log('DESIGN_ONLY_AI_REVIEW_REQUIRED=NO');
console.log('DESIGN_ONLY_MEETING=DISABLED');
console.log('DESIGN_ONLY_REBUTTAL=DISABLED');

const leadReviews=await runPhase('deterministic_department_evidence',async()=>Object.fromEntries(
  ROLES.map(role=>[role,deterministicDepartmentReview(role,preGate)])
));
const resolvedLeadModels=Object.fromEntries(ROLES.map(role=>[role,'DETERMINISTIC_EVIDENCE_ENGINE']));
const distinctResolvedLeadModels=['DETERMINISTIC_EVIDENCE_ENGINE'];

for(const role of ROLES){
  const review=leadReviews[role];
  writeJson(path.join(base,'departments',role,'lead-review.json'),{
    version:6,gameId,date,productionClass:'DESIGN_ONLY',department:role,
    leadModel:null,actualLeadModel:'DETERMINISTIC_EVIDENCE_ENGINE',reviewMode:'DETERMINISTIC_EVIDENCE',aiReviewUsed:false,review
  });
  writeJson(path.join(base,'departments',role,'representative.json'),{
    version:6,gameId,date,productionClass:'DESIGN_ONLY',department:role,
    representativeModel:'DETERMINISTIC_EVIDENCE_ENGINE',leadModel:null,actualLeadModel:'DETERMINISTIC_EVIDENCE_ENGINE',assistantModels:[],
    representativeAuthoredByLead:false,syntheticCompatibilityRecord:true,aiReviewUsed:false,representative:review
  });
}
writeJson(path.join(base,'department-lead-reviews.json'),{
  version:6,gameId,date,productionClass:'DESIGN_ONLY',
  reviewMode:'DETERMINISTIC_DEPARTMENT_EVIDENCE',
  aiReviewRequired:false,aiReviewUsed:false,
  meetingRequired:false,rebuttalRounds:0,reviews:leadReviews
});

writeProgress('DETERMINISTIC_REVALIDATION',{departmentEvidenceComplete:ROLES.length,aiReviewUsed:false});
const revisedDesign=designDraft;
const postRevisionPreGate=deterministicPreGate(revisedDesign);
writeJson(path.join(base,'design-revised.json'),{
  version:6,gameId,date,productionClass:'DESIGN_ONLY',tierAlias:3,tier:3,
  gameSeedId:seed.seedId,authorRole:'GAME_DESIGNER_AI',authorModel:activeDesignerRoute.id,
  sameModelAsDraft:false,revisionApplied:false,reviewMode:'DETERMINISTIC_EVIDENCE_NO_AI_REVIEW',
  deterministicRevalidation:{passed:preGatePass(postRevisionPreGate),authority:'STAGE_GATE_SCORING_V2'},
  status:'DESIGN_BASELINE_CANDIDATE',
  postRevisionPreGate:{
    totalScore:postRevisionPreGate.totalScore,
    hardFailures:postRevisionPreGate.hardFailures,
    criticalAxisFailures:postRevisionPreGate.criticalAxisFailures
  },
  content:revisedDesign
});

const disposition=preGatePass(postRevisionPreGate)?'ACTIVE':'REDESIGN';
const dispositionEvidence={
  version:2,gameId,date,state:disposition,
  sameDesignerRevisionAttempted:false,
  fiveDepartmentLeadReviewCompleted:false,
  deterministicDepartmentEvidenceCompleted:ROLES.every(role=>Boolean(leadReviews[role])),
  repeatedFiveDepartmentReview:false,
  meetingRequired:false,rebuttalRounds:0,
  automaticDiscardAllowed:false,
  discardVotes:0,commonFatalCriteria:[],unanimousFatalDiscard:false,
  strictGateStillAuthoritative:true,
  marketMetricAloneUsedForDiscard:false
};
writeJson(path.join(base,'design-disposition.json'),dispositionEvidence);

const modelAudit=Object.fromEntries(ROLES.map(role=>[role,{
  leadModel:null,
  actualLeadModel:'DETERMINISTIC_EVIDENCE_ENGINE',
  assistantModels:[],
  models:[],
  count:0,required:0,pass:true,
  reviewMode:'DETERMINISTIC_EVIDENCE'
}]));
const runtimeMetrics={
  phaseMs,phaseBudgetMs,
  totalModelCalls:modelCallStats.length,
  totalModelCallMs:modelCallStats.reduce((sum,item)=>sum+item.elapsedMs,0),
  modelPhaseConcurrency,phaseConcurrency,maxLoadedModelLanes,modelKeepAlive,
  modelHealth:designCheckpoint.modelHealth,
  preGate:{
    attempts:preGateHistory.length-1,
    totalScore:preGate.totalScore,
    hardFailures:preGate.hardFailures,
    postRevisionScore:postRevisionPreGate.totalScore,
    postRevisionHardFailures:postRevisionPreGate.hardFailures
  },
  checkpoint:{
    contractVersion:DESIGN_CHECKPOINT_CONTRACT_VERSION,engineDigest,
    reused:checkpointReusable,completedPhases:designCheckpoint.completedPhases.length,
    cachedTasks:Object.keys(designCheckpoint.tasks).length
  },
  simplifiedLeadOnlyReview:false,
  deterministicDepartmentEvidence:true,
  aiMeetingCalls:0,
  rebuttalCalls:0,
  representativeSynthesisCalls:0,
  leadReviewCalls:0,
  departmentScopedContext:true
};
writeJson(path.join(base,'cycle-status.json'),{
  version:6,date,gameId,gameName:game.name,productionClass:'DESIGN_ONLY',tierAlias:3,tier:3,
  status:'COMPLETE',policyDocument:'COMPANY_FLOW.md',flow:'GAME_SEED_TO_DESIGN_BASELINE_CANDIDATE',
  gameSeed:{seedId:seed.seedId,category:seed.GAME_CATEGORY,source:'game-seed-state.json',complete:true},
  designer:{role:'GAME_DESIGNER_AI',model:designCheckpoint.effectiveDesignerModel||activeDesignerRoute.id,singleAuthor:true,sameModelRevised:false},
  departments:{
    count:ROLES.length,roles:ROLES,leadModels,resolvedLeadModels,
    distinctLeadModels:distinctResolvedLeadModels,
    distinctLeadModelCount:distinctResolvedLeadModels.length,
    leadModelsDistinct:false,
    reviewModelCount:0,modelAudit,rebuttalRounds:0,repeatedFatalReview:false,
    aiReviewRequired:false,aiReviewUsed:false,
    reviewMode:'DETERMINISTIC_DEPARTMENT_EVIDENCE'
  },
  meeting:{required:false,crossDepartmentMeeting:false,rebuttalRounds:0},
  disposition:dispositionEvidence,runtimeMetrics,
  designLearning:{
    candidateCount:designLearningEvents.length,usedAsDesignContext:designLearningEvents.length>0,
    positiveTrainingEligible:false,validatedRuntimeRequiredForPositiveTraining:true,
    strictGateFeedbackSource:strictDesignerFeedback.source,
    strictGateHardFailures:strictDesignerFeedback.hardFailures,strictGateBypassAllowed:false
  },
  artbook:{created:false,reason:'DESIGN_BASELINE_GATE_MUST_RUN_FIRST'},
  vibe2Used:false,vibe2LearningContextUsed:designLearningEvents.length>0,paidApi:false
});
designCheckpoint.status='COMPLETE';
designCheckpoint.currentPhase='COMPLETE';
designCheckpoint.completedAt=new Date().toISOString();
designCheckpoint.failedPhase=null;designCheckpoint.failedTask=null;designCheckpoint.lastError=null;
persistDesignCheckpoint();
writeProgress('COMPLETE',{preGateScore:preGate.totalScore,postRevisionPreGateScore:postRevisionPreGate.totalScore});
console.log('DESIGN_CHECKPOINT_STATUS=COMPLETE');
console.log('COMPANY_DESIGN_CYCLE=COMPLETE');
console.log(`GAME_ID=${gameId}`);
console.log(`GAME_SEED_ID=${seed.seedId}`);
console.log('PRODUCTION_CLASS=DESIGN_ONLY');
console.log('DISTINCT_DEPARTMENT_LEADS=0');
console.log(`DESIGN_DISPOSITION=${disposition}`);
console.log('DESIGN_ONLY_REVIEW_MODE=DETERMINISTIC_EVIDENCE_NO_AI_REVIEW');
console.log('AI_MEETING_CALLS=0');
console.log('AI_REBUTTAL_CALLS=0');
console.log('LEAD_REVIEW_CALLS=0');
console.log(`TOTAL_MODEL_CALLS=${runtimeMetrics.totalModelCalls}`);
console.log(`MODEL_PHASE_CONCURRENCY=${runtimeMetrics.modelPhaseConcurrency}`);
console.log(`MAX_ACTIVE_MODEL_LANES=${maxLoadedModelLanes}`);
console.log(`DESIGN_CHECKPOINT_PHASES=${designCheckpoint.completedPhases.length}`);
console.log(`DESIGN_CHECKPOINT_TASKS=${Object.keys(designCheckpoint.tasks).length}`);
console.log('DESIGN_ONLY_ARTBOOK_CREATED=NO');
console.log('DESIGN_ONLY_VIBE2_USED=NO');
console.log(`DESIGN_LEARNING_CONTEXT_CANDIDATES=${designLearningEvents.length}`);
console.log(`DESIGN_ONLY_VIBE2_LEARNING_CONTEXT=${designLearningEvents.length>0?'YES':'NO'}`);
console.log('DESIGN_LEARNING_POSITIVE_TRAINING_ELIGIBLE=NO_UNTIL_VALIDATED_RUNTIME');
console.log('PAID_AI_ALLOWED=NO');
console.log(`AI_PROVIDER=${designCheckpoint.effectiveDesignerProvider||'GEMINI_PRIMARY_VIBE_LOCAL_FALLBACK'}`);
console.log('DESIGN_GATE_PROVIDER=DETERMINISTIC_EVIDENCE_ENGINE');
