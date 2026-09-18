import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
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
const pool=uniq(clean(process.env.COMPANY_MODEL_POOL).split(',').filter(Boolean).length?clean(process.env.COMPANY_MODEL_POOL).split(','):(ai.modelPool||[]));
const reviewModelCount=Math.max(Number(ai.minDistinctModelsPerDepartment||3),Number(ai.departmentReviewModelCount||3));
const leadModels=Object.fromEntries(ROLES.map(role=>[role,clean(ai.departmentLeadModels?.[role])]));
const distinctLeadModels=uniq(ROLES.map(role=>leadModels[role]));
if(pool.length<reviewModelCount)throw new Error(`MULTIMODEL_GATE: ${pool.length}/${reviewModelCount}`);
if(distinctLeadModels.length<ROLES.length)throw new Error(`DEPARTMENT_LEAD_GATE: ${distinctLeadModels.length}/${ROLES.length}`);
for(const role of ROLES)if(!leadModels[role]||!pool.includes(leadModels[role]))throw new Error(`DEPARTMENT_LEAD_GATE: invalid ${role} lead`);
function modelParameterBillions(model){const m=clean(model).match(/:(\d+(?:\.\d+)?)b(?:\b|$)/i);return m?Number(m[1]):Number.POSITIVE_INFINITY;}
const fastAssistantPool=[...pool].sort((a,b)=>modelParameterBillions(a)-modelParameterBillions(b)||a.localeCompare(b));
function reviewModelsFor(role){
  const lead=leadModels[role];
  const models=[lead];
  for(const candidate of fastAssistantPool){
    if(models.length>=reviewModelCount)break;
    if(candidate&&candidate!==lead&&!models.includes(candidate))models.push(candidate);
  }
  if(models.length<reviewModelCount)throw new Error(`${role} review model gate failed`);
  return models;
}
const departmentReviewModels=Object.fromEntries(ROLES.map(role=>[role,reviewModelsFor(role)]));
const independentReviewTasks=Object.fromEntries(ROLES.flatMap(role=>departmentReviewModels[role].map(model=>{const key=`${role}::${model}`;return[key,{role,model}];})));
const independentReviewOrder=Object.keys(independentReviewTasks).sort((a,b)=>independentReviewTasks[a].model.localeCompare(independentReviewTasks[b].model)||independentReviewTasks[a].role.localeCompare(independentReviewTasks[b].role));
const modelPhaseConcurrency=Math.min(4,Math.max(1,Number(process.env.COMPANY_MODEL_PHASE_CONCURRENCY||4)));
const phaseConcurrency={
  five_lead_reviews:Math.min(5,modelPhaseConcurrency)
};
const maxLoadedModelLanes=Math.min(2,Math.max(1,Number(process.env.COMPANY_MAX_ACTIVE_MODEL_LANES||2)));
const modelKeepAlive=clean(process.env.COMPANY_MODEL_KEEP_ALIVE||'5m');
const modelCallTimeoutMs=Math.min(180000,Math.max(90000,Number(process.env.COMPANY_MODEL_CALL_TIMEOUT_MS||150000)));

const gameId=clean(process.env.ARTBOOK_GAME_ID||process.env.GAME_ID||process.argv.find(x=>x.startsWith('--game='))?.split('=')[1]);
const date=clean(process.env.ARTBOOK_DATE||process.env.DESIGN_DATE||kstDate());
if(!gameId)throw new Error('ARTBOOK_GAME_ID or GAME_ID is required');
const seedState=loadSeedState();
const seed=activeSeedForGame(seedState,gameId);
if(!seed)throw new Error(`GAME_SEED_REQUIRED: ${gameId}`);
const catalog=readJson('game-catalog.json',{games:[]});
const catalogGame=(catalog.games||[]).find(x=>x.id===gameId)||null;
if(catalogGame&&clean(catalogGame.productionClass)&&clean(catalogGame.productionClass)!=='DESIGN_ONLY')throw new Error(`DESIGN_ONLY_CLASS_REQUIRED: ${catalogGame.productionClass}`);
const game={id:gameId,name:clean(catalogGame?.name||seed.gameName||gameId),description:clean(catalogGame?.description||seed.DISTINCT_IDENTITY),genre:clean(catalogGame?.genre||seed.GAME_CATEGORY),productionClass:'DESIGN_ONLY',productionTier:3,productionTarget:'DESIGN_BASELINE',webPath:catalogGame?.webPath||null,unityProjectPath:catalogGame?.unityProjectPath||null};
const designerPool=pool.filter(model=>!model.startsWith('deepseek-r1'));
if(!designerPool.length)throw new Error('GAME_DESIGNER_MODEL_POOL_EMPTY');
const designerModel=designerPool[hash(`${gameId}:designer`)%designerPool.length];
const coordinatorModel=pool[hash(`${gameId}:coordinator`)%pool.length];
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
const evidence={game,gameSeed:seed,factPack,designLearningContext,centralPolicy:'COMPANY_FLOW.md'};
const DESIGN_CHECKPOINT_CONTRACT_VERSION=2;
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
const checkpointReusable=designCheckpoint?.contractVersion===DESIGN_CHECKPOINT_CONTRACT_VERSION&&designCheckpoint?.fingerprint===checkpointFingerprint;
if(!checkpointReusable){
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
const UX_ACCESSIBILITY_PLAN={type:'object',required:['hudPriorities','touchAndInput','readability','accessibility'],properties:{hudPriorities:{type:'string',maxLength:500},touchAndInput:{type:'string',maxLength:500},readability:{type:'string',maxLength:500},accessibility:{type:'string',maxLength:500}},additionalProperties:false};
const ART_AUDIO_DIRECTION={type:'object',required:['visualIdentity','audioIdentity','gameplayFeedbackSync'],properties:{visualIdentity:{type:'string',maxLength:600},audioIdentity:{type:'string',maxLength:600},gameplayFeedbackSync:{type:'string',maxLength:600}},additionalProperties:false};
const IMPLEMENTATION_TRACE={type:'object',required:['designElement','responsibleSystem','validationEvidence'],properties:{designElement:{type:'string',maxLength:240},responsibleSystem:{type:'string',maxLength:240},validationEvidence:{type:'string',maxLength:420}},additionalProperties:false};
const DESIGN={type:'object',required:['identity','playerFantasy','coreFun','coreLoop','signatureSystems','systemInterconnections','progressionDirection','progressionEconomyBalance','contentExpansionPlan','failureRetryRisk','platformFitPlan','visualDirection','mobileUx','uxAccessibilityPlan','artAudioDirection','marketTargetDirection','steamExpansionDecision','multiplayerMode','multiplayerExpansionDecision','technicalAssumptions','validationQuestions','implementationTraceability','openQuestions'],properties:{identity:{type:'string',maxLength:1000},playerFantasy:{type:'string',maxLength:900},coreFun:{type:'string',maxLength:900},coreLoop:{type:'array',minItems:3,maxItems:8,items:{type:'string',maxLength:340}},signatureSystems:{type:'array',minItems:2,maxItems:6,items:{type:'object',required:['name','purpose','playerChoice'],properties:{name:{type:'string',maxLength:130},purpose:{type:'string',maxLength:440},playerChoice:{type:'string',maxLength:440}},additionalProperties:false}},systemInterconnections:{type:'array',minItems:3,maxItems:8,items:SYSTEM_INTERCONNECTION},progressionDirection:{type:'string',maxLength:900},progressionEconomyBalance:PROGRESSION_ECONOMY_BALANCE,contentExpansionPlan:{type:'array',minItems:3,maxItems:6,items:CONTENT_EXPANSION},failureRetryRisk:FAILURE_RETRY_RISK,platformFitPlan:PLATFORM_FIT_PLAN,visualDirection:{type:'string',maxLength:900},mobileUx:{type:'string',maxLength:900},uxAccessibilityPlan:UX_ACCESSIBILITY_PLAN,artAudioDirection:ART_AUDIO_DIRECTION,marketTargetDirection:{type:'string',maxLength:900},steamExpansionDecision:{type:'string',maxLength:500},multiplayerMode:{type:'string',enum:MULTIPLAYER_MODES},multiplayerExpansionDecision:{type:'string',maxLength:500},technicalAssumptions:{type:'array',minItems:2,maxItems:8,items:{type:'string',maxLength:340}},validationQuestions:{type:'array',minItems:2,maxItems:8,items:{type:'string',maxLength:340}},implementationTraceability:{type:'array',minItems:3,maxItems:8,items:IMPLEMENTATION_TRACE},openQuestions:{type:'array',maxItems:8,items:{type:'string',maxLength:340}}},additionalProperties:false};
const DESIGN_GATE_FIELDS=['systemInterconnections','progressionEconomyBalance','contentExpansionPlan','failureRetryRisk','platformFitPlan','uxAccessibilityPlan','artAudioDirection','implementationTraceability'];
const DESIGN_BASE_FIELDS=DESIGN.required.filter(key=>!DESIGN_GATE_FIELDS.includes(key));
const designSliceSchema=fields=>({type:'object',required:[...fields],properties:Object.fromEntries(fields.map(key=>[key,DESIGN.properties[key]])),additionalProperties:false});
const DESIGN_BASE=designSliceSchema(DESIGN_BASE_FIELDS);
const DESIGN_GATE=designSliceSchema(DESIGN_GATE_FIELDS);
function mergeDesignerDesign(basePart,gatePart,phase){
  const grounded=repairDesignRequiredFields({...basePart,...gatePart},{seed,factPack,phase});
  const merged=grounded.value;
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
  PLATFORM_FIT_DESIGN:['platformFitPlan','mobileUx'],
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

async function callModel(model,system,user,schema,{predict=1100,temperature=0.25,repairRequired=null,numCtx=8192,timeoutMs=null,maxAttempts=3}={}){
  const callStarted=Date.now();
  const deepSeek=model.startsWith('deepseek-r1');
  const effectiveCtx=Math.min(8192,Math.max(3072,Number(numCtx||8192)));
  const effectiveTimeoutMs=Math.min(180000,Math.max(60000,Number(timeoutMs||modelCallTimeoutMs)));
  let lastError=null;
  const attemptLimit=Math.min(3,Math.max(1,Number(maxAttempts||3)));
  for(let attempt=1;attempt<=attemptLimit;attempt++){
    const mode=deepSeek?'json':(attempt===1?'schema':'json');
    try{
      const schemaPrompt=(deepSeek||attempt>1)?`\nJSON_SCHEMA=${JSON.stringify(schema)}\n사고 과정이나 설명 없이 위 스키마를 만족하는 JSON 객체만 반환한다.`:'';
      const correction=attempt>1&&lastError?`\nPREVIOUS_VALIDATION_ERROR=${clean(lastError?.message)}\n이 오류를 정확히 수정하고 누락된 필수 구조를 모두 포함하라.`:'';
      const payload={model,stream:false,think:false,keep_alive:modelKeepAlive,messages:[{role:'system',content:system},{role:'user',content:user+'\n출력은 스키마에 맞는 JSON 객체만 반환한다.'+schemaPrompt+correction}],options:{temperature:attempt===1?temperature:0,num_ctx:effectiveCtx,num_predict:deepSeek?4096:Math.min(4096,predict*attempt)}};
      if(!deepSeek&&attempt===1)payload.format=schema;
      else if(mode==='json')payload.format='json';
      const response=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(effectiveTimeoutMs)});
      if(!response.ok)throw new Error(`ollama ${response.status}: ${await response.text()}`);
      const body=await response.json();const text=String(body?.message?.content??'').trim();
      if(!text){if(clean(body?.message?.thinking))console.log(`MODEL_EMPTY_CONTENT_WITH_THINKING=${model}|attempt=${attempt}|mode=${mode}`);throw new Error(`empty model response (${mode})`);}
      const parsed=parseJsonObject(text);const repairs=[];let normalized=normalizeSchemaValue(parsed,schema,'root',repairs);
      if(typeof repairRequired==='function'){
        const grounded=repairRequired(normalized);
        if(grounded?.value)normalized=grounded.value;
        if(Array.isArray(grounded?.repairs)&&grounded.repairs.length){
          for(const item of grounded.repairs)repairs.push(`grounded-required:${item.field}:${item.source}`);
          console.log(`MODEL_REQUIRED_FIELD_REPAIRED=${model}|attempt=${attempt}|${grounded.repairs.map(item=>`${item.field}<-${item.source}`).join(',')}`);
        }
      }
      if(repairs.length)console.log(`MODEL_SCHEMA_NORMALIZED=${model}|attempt=${attempt}|${repairs.join(',')}`);
      assertSchemaValue(normalized,schema);
      const elapsedMs=Date.now()-callStarted;
      recordModelHealth(model,{success:true,elapsedMs});
      designCheckpoint.lastSuccessfulModelCallAt=new Date().toISOString();
      modelCallStats.push({model,attempt,elapsedMs,predict,mode,numCtx:effectiveCtx,timeoutMs:effectiveTimeoutMs,schemaRepairs:repairs.length});
      persistDesignCheckpoint();
      console.log(`MODEL_CALL_MS=${model}|${elapsedMs}|attempt=${attempt}|predict=${predict}|ctx=${effectiveCtx}|timeout=${effectiveTimeoutMs}|mode=${mode}`);
      return normalized;
    }catch(error){
      lastError=error;
      recordModelHealth(model,{success:false,elapsedMs:Date.now()-callStarted,error});
      persistDesignCheckpoint();
      if(attempt<attemptLimit){
        const nextMode='json';
        console.log(`MODEL_CALL_FALLBACK=${model}|attempt=${attempt}|next=${nextMode}|reason=${clean(error?.message)}`);
        await new Promise(r=>setTimeout(r,800*attempt));
      }
    }
  }
  throw new Error(`MODEL_CALL_FAILED ${model}: ${clean(lastError?.message)}`);
}

async function generateDesignerDraft(){
  const system='너는 단일 Game Designer AI다. GAME_SEED를 설계 원점으로 사용한다. 유명 성공작의 구조는 오마주/재해석할 수 있지만 보호되는 표현과 소스코드는 복제하지 않는다. 점수나 관문을 조작하지 말고 실제 설계를 완성한다.';
  const user=`DESIGN_ONLY 상세 설계를 한 번에 완성하라. 정체성·핵심 재미·core loop·signature systems·시스템 연결·진행/경제·콘텐츠 확장·실패/재시도·플랫폼 적합성·UX/접근성·아트/오디오·구현 추적성을 서로 연결한다. SINGLE/COOP/COMPETITIVE/HYBRID 중 하나를 multiplayerMode에 반드시 명시한다. 이전 Strict 실패는 삭제하지 말고 실제 설계로 해결한다.\nSTRICT_GATE_FEEDBACK=${clip(strictDesignerFeedback,4500)}\nEVIDENCE=${clip(evidence,10500)}`;
  try{
    const full=await callModel(designerModel,system,user,DESIGN,{predict:2200,temperature:0.28,numCtx:8192,timeoutMs:90000,maxAttempts:1,repairRequired:value=>repairDesignRequiredFields(value,{seed,factPack,phase:'DRAFT'})});
    console.log('DESIGNER_DRAFT_GENERATION=ONE_CALL');
    return full;
  }catch(error){
    console.log(`DESIGNER_DRAFT_ONE_CALL_FALLBACK=SPLIT|reason=${clean(error?.message||error)}`);
    const basePart=await callModel(designerModel,system,`기본 설계 필드만 작성하라.\nSTRICT_GATE_FEEDBACK=${clip(strictDesignerFeedback,4500)}\nEVIDENCE=${clip(evidence,8500)}`,DESIGN_BASE,{predict:1000,temperature:0.3,numCtx:8192,timeoutMs:90000,maxAttempts:2});
    const gatePart=await callModel(designerModel,'너는 같은 Game Designer AI다. 기본 설계를 하드관문이 검증 가능한 상세 설계로 확장한다.',`관문 상세 필드만 작성하라.\nGAME_SEED=${clip(seed,4500)}\nBASE_DESIGN=${clip(basePart,8000)}`,DESIGN_GATE,{predict:1000,temperature:0.2,numCtx:8192,timeoutMs:90000,maxAttempts:2});
    return mergeDesignerDesign(basePart,gatePart,'DRAFT');
  }
}
let designDraft=await runPhase('designer_draft',generateDesignerDraft);
let preGate=await runPhase('deterministic_pre_gate',async()=>deterministicPreGate(designDraft));
const preGateHistory=[preGate];
writeJson(path.join(base,'design-pre-gate.json'),{version:2,gameId,date,attempt:0,pass:preGatePass(preGate),repairPacket:repairPacket(preGate),score:preGate});
for(let repairAttempt=1;repairAttempt<=2&&!preGatePass(preGate);repairAttempt++){
  const fields=repairFields(preGate);
  const schema=designSliceSchema(fields);
  const packet=repairPacket(preGate);
  const patch=await runPhase(`designer_pre_gate_repair_${repairAttempt}`,()=>callModel(
    designerModel,
    '너는 최초 설계를 작성한 동일 Game Designer AI다. 실패한 deterministic 설계축만 실제 설계 변경으로 수리한다. 통과를 가장하거나 실패코드를 삭제하지 않는다.',
    `현재 실패축만 수정하라. 지정 필드 외 내용은 반환하지 않는다.\nREPAIR_FIELDS=${JSON.stringify(fields)}\nREPAIR_PACKET=${clip(packet,6500)}\nGAME_SEED=${clip(seed,4500)}\nCURRENT_DESIGN=${clip(Object.fromEntries(fields.map(field=>[field,designDraft[field]])),8000)}`,
    schema,
    {predict:Math.min(1400,500+fields.length*130),temperature:0.12,numCtx:6144,timeoutMs:120000}
  ));
  designDraft=mergeTargetedPatch(designDraft,patch,`PRE_GATE_REPAIR_${repairAttempt}`);
  preGate=await runPhase(`deterministic_pre_gate_after_repair_${repairAttempt}`,async()=>deterministicPreGate(designDraft));
  preGateHistory.push(preGate);
  designCheckpoint.phases.designer_draft=designDraft;
  writeJson(path.join(base,'design-pre-gate.json'),{version:2,gameId,date,attempt:repairAttempt,pass:preGatePass(preGate),repairPacket:repairPacket(preGate),score:preGate,history:preGateHistory.map(row=>({totalScore:row.totalScore,hardFailures:row.hardFailures,criticalAxisFailures:row.criticalAxisFailures}))});
  persistDesignCheckpoint();
}
writeJson(path.join(base,'design-draft.json'),{version:5,gameId,date,productionClass:'DESIGN_ONLY',tierAlias:3,tier:3,gameSeedId:seed.seedId,gameSeedSource:'game-seed-state.json',authorRole:'GAME_DESIGNER_AI',authorModel:designerModel,singleAuthor:true,preGate:{pass:preGatePass(preGate),totalScore:preGate.totalScore,hardFailures:preGate.hardFailures,criticalAxisFailures:preGate.criticalAxisFailures,attempts:preGateHistory.length-1},content:designDraft});
if(!preGatePass(preGate)){
  designCheckpoint.status='PRE_GATE_BLOCKED';
  designCheckpoint.lastError=`DESIGN_PRE_GATE_BLOCKED score=${preGate.totalScore} hard=${(preGate.hardFailures||[]).join(',')||'NONE'}`;
  for(const key of Object.keys(designCheckpoint.phases))if(key.startsWith('designer_pre_gate_repair_')||key.startsWith('deterministic_pre_gate_after_repair_'))delete designCheckpoint.phases[key];
  persistDesignCheckpoint();
  writeProgress('PRE_GATE_REPAIR',{blocked:true,preGateScore:preGate.totalScore,hardFailures:preGate.hardFailures,repairPacket:repairPacket(preGate)});
  throw new Error(designCheckpoint.lastError);
}
writeProgress('DEPARTMENT_REVIEWS',{preGateScore:preGate.totalScore,preGatePass:true});
console.log(`DESIGN_PRE_GATE=PASS|${preGate.totalScore}`);


const leadReviewOrder=[...ROLES].sort((a,b)=>modelHealthPenalty(leadModels[a])-modelHealthPenalty(leadModels[b])||a.localeCompare(b));
console.log(`DESIGN_ONLY_REVIEW_MODE=FIVE_LEAD_DIRECT`);
console.log(`DESIGN_ONLY_MEETING=DISABLED`);
console.log(`DESIGN_ONLY_REBUTTAL=DISABLED`);
console.log(`LEAD_REVIEW_ORDER=${leadReviewOrder.map(role=>leadModels[role]).join(',')}`);

const leadReviews=await runPhase('five_lead_reviews',()=>adaptiveParallel(
  'five_lead_reviews',
  phaseConcurrency.five_lead_reviews,
  concurrency=>parallelObjectByLane(
    leadReviewOrder,
    role=>leadModels[role],
    async role=>runCheckpointTask('five_lead_reviews',role,async()=>{
      const model=leadModels[role];
      const result=await callModel(
        model,
        `너는 ${role} 부서 Lead AI다. DESIGN_ONLY 설계를 자기 전문영역에서 직접 검토한다. 회의·반박·다른 부서 대리 판단은 하지 않는다.`,
        `가장 중요한 KEEP/FIX/ADD/RISK/EVIDENCE만 짧고 구체적으로 작성하라. 수정 가능한 문제는 실제 수정 지시로 표현하고 점수나 관문을 조작하지 마라.\nASSIGNED_DEPARTMENT=${role}\nGAME_SEED=${clip(seed,3000)}\nDESIGN=${clip(departmentDesignContext(role,designDraft),6500)}`,
        reviewsSchemaFor([role]),
        {predict:420,numCtx:5120,timeoutMs:90000}
      );
      return result[role];
    }),
    concurrency,
    {maxLanes:maxLoadedModelLanes,perLane:1}
  )
));

for(const role of ROLES){
  const lead=leadModels[role];
  const review=leadReviews[role];
  writeJson(path.join(base,'departments',role,'lead-review.json'),{
    version:5,gameId,date,productionClass:'DESIGN_ONLY',department:role,
    leadModel:lead,reviewMode:'DIRECT_LEAD_ONLY',review
  });
  writeJson(path.join(base,'departments',role,'representative.json'),{
    version:5,gameId,date,productionClass:'DESIGN_ONLY',department:role,
    representativeModel:lead,leadModel:lead,assistantModels:[],
    representativeAuthoredByLead:true,syntheticCompatibilityRecord:true,representative:review
  });
}
writeJson(path.join(base,'department-lead-reviews.json'),{
  version:5,gameId,date,productionClass:'DESIGN_ONLY',
  reviewMode:'FIVE_DISTINCT_LEAD_PARALLEL_REVIEW',
  meetingRequired:false,rebuttalRounds:0,leadModels,reviews:leadReviews
});

async function generateDesignerRevision(){
  const system='너는 초안을 작성한 동일 Game Designer AI다. 5개 부서 Lead의 직접 검토를 받아 실제 설계를 한 번 수정한다. 회의 합의 절차는 없으며 서로 충돌하는 조언은 GAME_SEED와 strict 기준을 기준으로 판단한다.';
  const user=`수정된 전체 상세 설계를 한 번에 반환하라. 이전 하드관문 실패를 삭제·재명명·무시하지 말고 실제 설계 변경으로 해결한다.\nGAME_SEED=${clip(seed,4500)}\nSTRICT_GATE_FEEDBACK=${clip(strictDesignerFeedback,4000)}\nCURRENT_DESIGN=${clip(designDraft,11000)}\nFIVE_LEAD_REVIEWS=${clip(leadReviews,9000)}`;
  try{
    const full=await callModel(designerModel,system,user,DESIGN,{predict:2200,temperature:0.14,numCtx:8192,timeoutMs:90000,maxAttempts:1,repairRequired:value=>repairDesignRequiredFields(value,{seed,factPack,phase:'REVISION'})});
    console.log('DESIGNER_REVISION_GENERATION=ONE_CALL');
    return full;
  }catch(error){
    console.log(`DESIGNER_REVISION_ONE_CALL_FALLBACK=SPLIT|reason=${clean(error?.message||error)}`);
    const baseSeed=Object.fromEntries(DESIGN_BASE_FIELDS.map(field=>[field,designDraft[field]]));
    const gateSeed=Object.fromEntries(DESIGN_GATE_FIELDS.map(field=>[field,designDraft[field]]));
    const basePart=await callModel(
      designerModel,
      system,
      `기본 설계 필드만 수정하라.\nBASE_DRAFT=${clip(baseSeed,8200)}\nFIVE_LEAD_REVIEWS=${clip(leadReviews,7000)}`,
      DESIGN_BASE,
      {predict:1000,temperature:0.16,numCtx:7168,timeoutMs:90000,maxAttempts:2}
    );
    const gatePart=await callModel(
      designerModel,
      '너는 같은 Game Designer AI다. 수정된 기본 설계에 맞춰 하드관문 상세 필드만 수정한다.',
      `REVISED_BASE=${clip(basePart,8200)}\nPREVIOUS_GATE_DETAIL=${clip(gateSeed,7000)}\nFIVE_LEAD_REVIEWS=${clip(leadReviews,6000)}`,
      DESIGN_GATE,
      {predict:1000,temperature:0.1,numCtx:7168,timeoutMs:90000,maxAttempts:2}
    );
    return mergeDesignerDesign(basePart,gatePart,'REVISION');
  }
}

writeProgress('DESIGNER_REVISION',{leadReviewsComplete:5});
const revisedDesign=await runPhase('designer_revision',generateDesignerRevision);
const postRevisionPreGate=deterministicPreGate(revisedDesign);
writeJson(path.join(base,'design-revised.json'),{
  version:6,gameId,date,productionClass:'DESIGN_ONLY',tierAlias:3,tier:3,
  gameSeedId:seed.seedId,authorRole:'GAME_DESIGNER_AI',authorModel:designerModel,
  sameModelAsDraft:true,reviewMode:'FIVE_LEAD_DIRECT_NO_MEETING',
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
  sameDesignerRevisionAttempted:true,
  fiveDepartmentLeadReviewCompleted:ROLES.every(role=>Boolean(leadReviews[role])),
  repeatedFiveDepartmentReview:false,
  meetingRequired:false,rebuttalRounds:0,
  automaticDiscardAllowed:false,
  discardVotes:0,commonFatalCriteria:[],unanimousFatalDiscard:false,
  strictGateStillAuthoritative:true,
  marketMetricAloneUsedForDiscard:false
};
writeJson(path.join(base,'design-disposition.json'),dispositionEvidence);

const modelAudit=Object.fromEntries(ROLES.map(role=>[role,{
  leadModel:leadModels[role],
  assistantModels:[],
  models:[leadModels[role]],
  count:1,required:1,pass:Boolean(leadModels[role]),
  reviewMode:'DIRECT_LEAD_ONLY'
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
  simplifiedLeadOnlyReview:true,
  aiMeetingCalls:0,
  rebuttalCalls:0,
  representativeSynthesisCalls:0,
  leadReviewCalls:ROLES.length,
  departmentScopedContext:true
};
writeJson(path.join(base,'cycle-status.json'),{
  version:6,date,gameId,gameName:game.name,productionClass:'DESIGN_ONLY',tierAlias:3,tier:3,
  status:'COMPLETE',policyDocument:'COMPANY_FLOW.md',flow:'GAME_SEED_TO_DESIGN_BASELINE_CANDIDATE',
  gameSeed:{seedId:seed.seedId,category:seed.GAME_CATEGORY,source:'game-seed-state.json',complete:true},
  designer:{role:'GAME_DESIGNER_AI',model:designerModel,singleAuthor:true,sameModelRevised:true},
  departments:{
    count:ROLES.length,roles:ROLES,leadModels,distinctLeadModels,
    distinctLeadModelCount:distinctLeadModels.length,leadModelsDistinct:distinctLeadModels.length===ROLES.length,
    reviewModelCount:1,modelAudit,rebuttalRounds:0,repeatedFatalReview:false,
    reviewMode:'FIVE_DISTINCT_LEAD_PARALLEL_REVIEW'
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
console.log(`DISTINCT_DEPARTMENT_LEADS=${distinctLeadModels.length}`);
console.log(`DESIGN_DISPOSITION=${disposition}`);
console.log('DESIGN_ONLY_REVIEW_MODE=FIVE_LEAD_DIRECT_NO_MEETING');
console.log('AI_MEETING_CALLS=0');
console.log('AI_REBUTTAL_CALLS=0');
console.log(`LEAD_REVIEW_CALLS=${ROLES.length}`);
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
console.log('PAID_API=NO');
