// 파일명: tools/company-design-cycle.mjs
// 역할: 기존 디자이너의 분할 작성·체크포인트·결정론적 설계 검증을 수행한다.
// 임포트
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import http from 'node:http';
import {loadSeedState,saveSeedState,activeSeedForGame} from './game-seed-state.mjs';
import {ownerDesignResetSeedForGame} from './owner-design-reset.mjs';
import {makeAutoMissingDesignSeed,latestUsableDesign} from './company-all-games-design-reset.mjs';
import {validateGameSeed} from './company-game-seed-contract.mjs';
import {repairDesignRequiredFields} from './company-design-prepromotion-repair.mjs';
import {scoreDesignGateV2,validateDesignAuthoringContent,designPlayabilityRequirements,DESIGN_GATE_PASS_MINIMUM} from './company-design-gate-scoring-v2.mjs';
import {classifyRobloxGenre} from './roblox-genre-profile.mjs';
import {buildVibeDesignIntelligence,buildDesignEvolutionBrief} from './vibe2-design-intelligence.mjs';
import {buildAllGameDynamicLibraryBindingPlan,buildAssetSupplyDecisionSummary} from './vibe2-asset-production-plan.mjs';
import {GAME_CONVENIENCE_REFERENCES} from './company-roblox-production-plan.mjs';

const ROLES=['planning','graphics','development','qa','audio'];
const CANONICAL_POLICY_PATH='company-learning/platform-release-roadmap.json';
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const clip=(v,n=14000)=>{const s=typeof v==='string'?v:JSON.stringify(v);return s.length>n?s.slice(0,n):s;};
const uniq=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
function kstDate(){const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return`${g('year')}-${g('month')}-${g('day')}`;}

const directive=readJson('company-directive.json',{});
const localDesignerModel=clean(process.env.COMPANY_VIBE_LOCAL_MODEL||'qwen3:1.7b');
const localDesignerFallbackReady=clean(process.env.COMPANY_LOCAL_DESIGN_FALLBACK_READY).toLowerCase()==='true';
// Department evidence is computed from the same deterministic gate; no AI review lanes.
const leadModels={},departmentReviewModels={};
const reviewModelCount=0,modelPhaseConcurrency=1,maxLoadedModelLanes=1;
const phaseConcurrency={};
const modelKeepAlive='PROVIDER_SPECIFIC';
// 내부 모델 작성 예산: 준비 단계의 모델 로딩 시간은 제외한다.
const localDesignerCallTimeoutMs=Math.min(300000,Math.max(30000,Number(process.env.COMPANY_LOCAL_DESIGN_CALL_TIMEOUT_MS)||300000));

// 접수 기록은 실행 메타데이터다. 창작 시드는 아래 identity-core에서 같은 디자이너가 작성한다.
function resolveDesignerSeedInput({state,gameId,catalog,brief='',root='.'}){
  if(!/^[a-z0-9][a-z0-9-]*$/.test(gameId))throw new Error('DESIGN_GAME_ID_INVALID');
  if((catalog?.permanentRemovalPolicy?.ids||[]).includes(gameId))throw new Error(`DESIGN_GAME_REMOVED: ${gameId}`);
  const existing=activeSeedForGame(state,gameId);
  if(existing){
    const restoredId=!clean(existing.seedId);
    if(restoredId)existing.seedId=`DESIGNER-${gameId.toUpperCase()}`;
    return{seed:existing,created:restoredId};
  }
  const ownerInput=ownerDesignResetSeedForGame(gameId,path.join(root,'owner-design-reset-queue.json'));
  const catalogEntry=(catalog?.games||[]).find(row=>row.id===gameId);
  if(!ownerInput&&!catalogEntry&&!clean(brief))throw new Error(`DESIGN_BRIEF_OR_ORIGINAL_REQUIRED: ${gameId}`);
  if(!ownerInput&&catalogEntry&&!['ACTIVE','REBUILD'].includes(clean(catalogEntry.lifecycleState||catalogEntry.canonical?.lifecycle?.state||'ACTIVE').toUpperCase()))throw new Error(`DESIGN_GAME_INACTIVE: ${gameId}`);
  const input=ownerInput||makeAutoMissingDesignSeed(catalogEntry||{id:gameId,name:gameId,description:brief});
  if(!ownerInput){
    const baseline=latestUsableDesign(root,gameId);
    const original=baseline?.record?.content||baseline?.record||{};
    const platform=input.INITIAL_TARGET_PLATFORM;
    input.designInputMode='DESIGNER_SELF_SEED';
    input.OWNER_LATEST_DESIGN_REQUEST=clean(brief)||clean(catalogEntry?.description)||`기존 ${input.gameName} 원본에서 시드와 상세 설계를 디자이너가 직접 작성한다.`;
    if(baseline){
      input.DESIGN_BASELINE_SOURCE=path.relative(root,baseline.file).replaceAll('\\','/');
      input.originalDesignContext={source:input.DESIGN_BASELINE_SOURCE,version:baseline.record.version||null,content:original,platformProfile:original.platformProfiles?.[platform]||{}};
      input.REUSE_PRIOR_DESIGN_BASELINE=true;
      input.REUSE_EXISTING_GAMEPLAY_IMPLEMENTATION=true;
      if(original.identity)input.DISTINCT_IDENTITY=original.identity;
      if(original.coreFun)input.CORE_FUN_TO_LEARN=[original.coreFun];
      if(original.coreLoop?.length)input.CORE_LOOP=original.coreLoop;
      const mode=clean(original.multiplayerMode||original.robloxBuildProfile?.playMode).toUpperCase();
      if(['SINGLE','COOP','COMPETITIVE','HYBRID'].includes(mode))input.MULTIPLAYER_DESIGN_MODE=mode;
    }
    // 기존 접수 계약은 유지하되 자동 조합 문법을 디자이너의 창작 결과로 넘기지 않는다.
    delete input.GAMEPLAY_SKETCH;
    const inputCheck=validateGameSeed(input);
    if(!inputCheck.pass)input.inputRepairNotes=inputCheck.errors;
    input.GAMEPLAY_SKETCH.source='DESIGNER_INTAKE_COMPATIBILITY_INPUT_NOT_AUTHORED_DESIGN';
  }
  input.seedAuthoring={writer:'GAME_DESIGNER_AI',stage:'identity-core',externalSeedRequired:false};
  state.seeds||=[];
  state.seeds.push(input);
  return{seed:input,created:true};
}

const gameId=clean(process.env.ARTBOOK_GAME_ID||process.env.GAME_ID||process.argv.find(x=>x.startsWith('--game='))?.split('=')[1]);
const date=clean(process.env.ARTBOOK_DATE||process.env.DESIGN_DATE||kstDate());
if(!gameId)throw new Error('ARTBOOK_GAME_ID or GAME_ID is required');
const seedState=loadSeedState();
const catalog=readJson('game-catalog.json',{games:[]});
const seedInput=resolveDesignerSeedInput({state:seedState,gameId,catalog,brief:process.env.COMPANY_DESIGN_BRIEF||''});
const seed=seedInput.seed;
if(seedInput.created){saveSeedState(seedState);console.log(`DESIGNER_SEED_INPUT_CREATED=${gameId}`);}
const seedGameplaySketch=seed.GAMEPLAY_SKETCH&&typeof seed.GAMEPLAY_SKETCH==='object'&&!Array.isArray(seed.GAMEPLAY_SKETCH)?seed.GAMEPLAY_SKETCH:null;
const seedGameplaySketchVersion=Math.max(1,Number(seedGameplaySketch?.version||1));
const advancedSeedDesignDepth=seedGameplaySketchVersion>=2;
const seedFlowArchitecture=seedGameplaySketch?.flowArchitecture&&typeof seedGameplaySketch.flowArchitecture==='object'&&!Array.isArray(seedGameplaySketch.flowArchitecture)?seedGameplaySketch.flowArchitecture:null;
const seedFlowSystemBlueprint=seedFlowArchitecture?.systemBlueprint&&typeof seedFlowArchitecture.systemBlueprint==='object'?seedFlowArchitecture.systemBlueprint:null;
const seedFlowAssetRequirements=Array.isArray(seedFlowArchitecture?.assetFlow?.requirements)?seedFlowArchitecture.assetFlow.requirements:[];
const seedDesignDepthContext={
  source:'GAME_SEED.GAMEPLAY_SKETCH',
  version:seedGameplaySketchVersion,
  compatibilityMode:seedGameplaySketchVersion>=4?'V4_CAUSAL_GRAMMAR_INPUT':advancedSeedDesignDepth?'V2_DEPTH_INPUT':'LEGACY_V1_COMPATIBILITY',
  identityCore:seedGameplaySketch?.identityCore&&typeof seedGameplaySketch.identityCore==='object'?seedGameplaySketch.identityCore:null,
  novelGameGrammar:seedGameplaySketch?.novelGameGrammar&&typeof seedGameplaySketch.novelGameGrammar==='object'?seedGameplaySketch.novelGameGrammar:null,
  playerPromise:clean(seedGameplaySketch?.playerPromise),
  funDrivers:Array.isArray(seedGameplaySketch?.funDrivers)?seedGameplaySketch.funDrivers:[],
  balanceRules:Array.isArray(seedGameplaySketch?.balanceRules)?seedGameplaySketch.balanceRules:[],
  pacingPlan:seedGameplaySketch?.pacingPlan&&typeof seedGameplaySketch.pacingPlan==='object'?seedGameplaySketch.pacingPlan:null,
  progressionLayers:Array.isArray(seedGameplaySketch?.progressionLayers)?seedGameplaySketch.progressionLayers:[],
  expansionPlan:Array.isArray(seedGameplaySketch?.expansionPlan)?seedGameplaySketch.expansionPlan:[],
  completionCriteria:Array.isArray(seedGameplaySketch?.completionCriteria)?seedGameplaySketch.completionCriteria:[],
  codingGrowthHooks:Array.isArray(seedGameplaySketch?.codingGrowthHooks)?seedGameplaySketch.codingGrowthHooks:[],
  flowArchitecture:seedFlowArchitecture?{
    version:Number(seedFlowArchitecture.version||1),
    source:clean(seedFlowArchitecture.source),
    flowDNA:Array.isArray(seedFlowArchitecture.flowDNA)?seedFlowArchitecture.flowDNA:[],
    phaseArc:Array.isArray(seedFlowArchitecture.phaseArc)?seedFlowArchitecture.phaseArc:[],
    transitionEvents:Array.isArray(seedFlowArchitecture.transitionEvents)?seedFlowArchitecture.transitionEvents:[],
    parallelGoals:seedFlowArchitecture.parallelGoals||null,
    branching:seedFlowArchitecture.branching||null,
    returnStructure:seedFlowArchitecture.returnStructure||null,
    failureModel:seedFlowArchitecture.failureModel||null,
    victoryModel:seedFlowArchitecture.victoryModel||null,
    worldReactivity:seedFlowArchitecture.worldReactivity||null,
    riskCurve:seedFlowArchitecture.riskCurve||null,
    playstyleRoutes:seedFlowArchitecture.playstyleRoutes||null,
    regionalRuleVariation:seedFlowArchitecture.regionalRuleVariation||null,
    sessionStructure:seedFlowArchitecture.sessionStructure||null,
    tensionRhythm:seedFlowArchitecture.tensionRhythm||null,
    informationProgression:seedFlowArchitecture.informationProgression||null,
    revisitValue:seedFlowArchitecture.revisitValue||null,
    endingModel:seedFlowArchitecture.endingModel||null,
    qualityGrowthContract:seedFlowArchitecture.qualityGrowthContract||null,
    systemBlueprint:seedFlowSystemBlueprint?{
      profile:clean(seedFlowSystemBlueprint.profile),
      target:clean(seedFlowSystemBlueprint.target),
      requiredSystems:(seedFlowSystemBlueprint.requiredSystems||[]).map(row=>clean(row?.id)).filter(Boolean),
      expansionSystems:(seedFlowSystemBlueprint.expansionSystems||[]).map(row=>clean(row?.id)).filter(Boolean),
      phasePlan:seedFlowSystemBlueprint.phasePlan||{},
      interconnectionChains:Array.isArray(seedFlowSystemBlueprint.interconnectionChains)?seedFlowSystemBlueprint.interconnectionChains:[],
      novelGrammarContract:seedFlowSystemBlueprint.novelGrammarContract||null,
      libraryReusePolicy:seedFlowSystemBlueprint.libraryReusePolicy||null,
      expansionPolicy:seedFlowSystemBlueprint.expansionPolicy||null
    }:null,
    assetFlow:seedFlowArchitecture.assetFlow?{
      version:Number(seedFlowArchitecture.assetFlow.version||1),
      mode:clean(seedFlowArchitecture.assetFlow.mode),
      requirements:seedFlowAssetRequirements.map(row=>({
        family:clean(row?.family),subfamily:clean(row?.subfamily),required:row?.required!==false,priority:clean(row?.priority),
        flowRoles:Array.isArray(row?.flowRoles)?row.flowRoles:[],systemRoles:Array.isArray(row?.systemRoles)?row.systemRoles:[],phases:Array.isArray(row?.phases)?row.phases:[],
        resolution:clean(row?.resolution),allowedReuseModes:Array.isArray(row?.allowedReuseModes)?row.allowedReuseModes:[],
        assetIdPinned:row?.assetIdPinned===true,gameplayAuthority:row?.gameplayAuthority===true,balanceAuthority:row?.balanceAuthority===true,
        saveAuthority:row?.saveAuthority===true,networkingAuthority:row?.networkingAuthority===true
      }))
    }:null
  }:null
};
// 원본 구현 수치는 현재 설정 파일에서 읽는다. 디자이너의 밸런스 변경 권한은 늘리지 않는다.
const currentRuleSourcePath=clean(seed.originalDesignContext?.content?.implementationSync?.codePaths?.config);
const currentRuleSourceAllowed=currentRuleSourcePath.startsWith(`roblox-games/${gameId}/`)&&!currentRuleSourcePath.split('/').includes('..');
const currentRuleSource=currentRuleSourceAllowed&&fs.existsSync(currentRuleSourcePath)?fs.readFileSync(currentRuleSourcePath,'utf8'):'';
const playableRequirements=designPlayabilityRequirements(seed,currentRuleSource);
const currentRuleSourceContext={path:currentRuleSourcePath,sha256:currentRuleSource?createHash('sha256').update(currentRuleSource).digest('hex'):null,
  lines:currentRuleSource.split('\n').flatMap((line,index)=>/TargetPopulation=|SurvivorDashCooldown=|\b(?:Max|RegenPerSecond|PurifyCost|DashCost|InfectAttackCost|InfectAttackCooldown|AbilityCost|InfectRange)\s*=|\{Id=|^\s*[A-Z][A-Z_]+\s*=\{/.test(line)?[`${index+1}: ${line.trim()}`]:[])
};
const ownerPreservationDesign=seed.REUSE_EXISTING_GAMEPLAY_IMPLEMENTATION===true
  &&clean(seed.OWNER_REBUILD_MODE).toUpperCase()==='PRESERVATION_PRESENTATION_UPGRADE';
const catalogGame=(catalog.games||[]).find(x=>x.id===gameId)||null;
const game={id:gameId,name:clean(catalogGame?.name||seed.gameName||gameId),description:clean(catalogGame?.description||seed.DISTINCT_IDENTITY),genre:clean(catalogGame?.genre||seed.GAME_CATEGORY),productionClass:'DESIGN_ONLY',productionTier:3,productionTarget:'DESIGN_BASELINE',webPath:catalogGame?.webPath||null,unityProjectPath:catalogGame?.unityProjectPath||null};
const designerRoute={provider:'VIBE_LOCAL_OLLAMA',model:localDesignerModel,id:`ollama:${localDesignerModel}`};
const activeDesignerRoute=designerRoute;
const designerModel=designerRoute.id;
const coordinatorModel=localDesignerModel;
console.log('GAME_DESIGNER_PROVIDER=VIBE_LOCAL_OLLAMA');
console.log('DESIGN_EXTERNAL_AI_ALLOWED=NO');
console.log(`GAME_DESIGNER_MODEL=${designerModel}`);
console.log('DESIGN_AI_REVIEW_LANES=NONE');
const base=path.join('design',gameId,date);fs.mkdirSync(base,{recursive:true});
const designerSeedPath=path.join(base,'design-seed.json');
const submissionBase=path.join('artbook-submissions',gameId,date);
const factPack=readJson(path.join(submissionBase,'fact-pack.json'),{});
// 컨셉 단계에서 현재 보유 자산을 읽는다. 후보 요약은 설계 근거이며 최종 선택/품질 통과가 아니다.
const designAssetLibraryPath='company-asset-library.json';
const designAssetLibrary=readJson(designAssetLibraryPath,null);
const designAssetLibraryContext={
  source:designAssetLibraryPath,
  status:Array.isArray(designAssetLibrary?.assets)?'AVAILABLE':'UNAVAILABLE',
  version:designAssetLibrary?.version??null,
  sha256:fs.existsSync(designAssetLibraryPath)?createHash('sha256').update(fs.readFileSync(designAssetLibraryPath)).digest('hex'):null,
  inventoryCount:Array.isArray(designAssetLibrary?.assets)?designAssetLibrary.assets.length:0,
  candidateSummaryOnly:true,
  auditScoreIsNotRuntimeQuality:true,
  productionVerificationGranted:false,
  platforms:Object.fromEntries(['WEB','UNITY','ROBLOX'].map(target=>{
    const binding=buildAllGameDynamicLibraryBindingPlan({companyRegistry:designAssetLibrary||{},gameId,target});
    const eligibleIds=new Set(binding.evaluatedAssets.filter(row=>row.eligibleForRoleEvaluation).map(row=>row.assetId));
    const assets=(Array.isArray(designAssetLibrary?.assets)?designAssetLibrary.assets:[]).filter(row=>eligibleIds.has(row.id)&&row.catalogActive!==false&&row.rightsPass!==false&&!/STALE|RETIRED|REJECTED/.test((clean(row.catalogState)+' '+clean(row.status)).toUpperCase()));
    const summary=buildAssetSupplyDecisionSummary({
      gameId,target,registry:{assets},requirements:seedFlowAssetRequirements,
      request:[seed.DISTINCT_IDENTITY,seed.CORE_FUN_TO_LEARN,...(Array.isArray(seed.CORE_LOOP)?seed.CORE_LOOP:[])].map(clean).join(' ')
    });
    const byId=new Map(assets.map(row=>[row.id,row]));
    return [target,{
      evaluatedAssetCount:binding.evaluatedAssetCount,
      eligibleAssetCount:assets.length,
      requiredFamilies:summary.requiredFamilies,
      availableRoles:Object.fromEntries(summary.requiredFamilies.map(family=>[family,uniq(assets.filter(asset=>clean(asset.family||asset.category).toUpperCase()===family).map(asset=>asset.role||asset.subfamily)).sort()])),
      candidates:(Array.isArray(designAssetLibrary?.assets)?summary.nextActions:[]).map(action=>{
        const asset=byId.get(action.assetId);
        return {...action,...(asset?{
          role:clean(asset.role||asset.subfamily)||null,
          sourcePath:clean(asset.path||asset.sourceFiles?.[0])||null,
          platform:clean(asset.platform)||null,
          license:clean(asset.license)||null,
          referenceOnly:asset.referenceVisualAudit?.referenceUseOnly===true||asset.platform==='SHARED_REFERENCE',
          auditScore:Number.isFinite(asset.internalAuditScore)?asset.internalAuditScore:null,
          auditState:clean(asset.internalAuditState)||'UNKNOWN',
          qualityGap:clean(asset.internalAuditNextAction)||null,
          runtimeState:clean(asset.runtimeVerificationState)||'UNVERIFIED',
          productionVerified:asset.productionVerified===true
        }:{})};
      })
    }];
  }))
};
// 세 플랫폼의 동일 자산 사실은 한 번만 전달하고 적용 방식만 각각 유지한다.
designAssetLibraryContext.assetFacts=Object.fromEntries(Object.values(designAssetLibraryContext.platforms).flatMap(platform=>platform.candidates.filter(row=>row.assetId).map(({assetId,action,reason,applicationMode,family,...facts})=>[assetId,{family,...facts}])));
for(const platform of Object.values(designAssetLibraryContext.platforms)){
  platform.candidates=platform.candidates.map(({family,action,assetId,applicationMode,reason,roleEvidence})=>({family,action,assetId,applicationMode,reason,roleEvidence}));
}
const designAssetFamilies=uniq(Object.values(designAssetLibraryContext.platforms).flatMap(platform=>platform.requiredFamilies||[]));
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
const designEvolutionBrief=buildDesignEvolutionBrief({
  game,seed,factPack,priorFeedback:strictDesignerFeedback,
  ownerSignal:{
    literal:clean(seed.OWNER_LATEST_DESIGN_REQUEST||seed.OWNER_DESIGN_INTENT||''),
    eventId:clean(seed.ownerRequestInstanceId||seed.ownerDirectiveRevision||seed.ownerResetRevision||'')
  }
});
const unityWebValidationSurfaceContract={role:'UNITY_WEB_VALIDATION_SURFACE_ONLY',separateGameTarget:false,canonicalSource:'SAME_UNITY_PROJECT',outputRoot:'web-games/<gameId>/',nativeGateAuthority:false,designRequirements:['UNITY_PROFILE_MUST_REMAIN_WEBGL_COMPATIBLE_WHEN_BUILDABLE','TOUCH_INPUT_AND_MOBILE_UI_MUST_WORK_IN_BROWSER_VALIDATION','BROWSER_PERFORMANCE_BUDGET_MUST_NOT_REQUIRE_SEPARATE_GAMEPLAY_RULES','WEB_VALIDATION_MAY_NOT_CHANGE_CORE_GAME_RULES_OR_BALANCE']};
const evidence={game,currentRuleSourceContext,gameSeed:seed,seedDesignDepth:seedDesignDepthContext,factPack,designAssetLibraryContext,designLearningContext,designEvolutionBrief,unityWebValidationSurfaceContract,centralPolicy:CANONICAL_POLICY_PATH};
const DESIGN_CHECKPOINT_CONTRACT_VERSION=4;
const checkpointPath=path.join(base,'design-checkpoint.json');
const progressPath=path.join(base,'design-progress.json');
const policyDigest=createHash('sha256').update(fs.readFileSync(CANONICAL_POLICY_PATH,'utf8')).digest('hex');
const engineFiles=[
  'tools/company-design-cycle.mjs',
  'tools/vibe2-design-intelligence.mjs',
  'tools/company-design-gate-scoring-v2.mjs',
  'tools/company-strict-production-review.mjs',
  'tools/company-design-prepromotion-repair.mjs',
  'tools/company-baseline-gate.mjs'
];
const engineDigest=createHash('sha256').update(engineFiles.map(file=>`${file}\n${fs.readFileSync(file,'utf8')}`).join('\n---\n')).digest('hex');
const checkpointInputContext={
  contractVersion:DESIGN_CHECKPOINT_CONTRACT_VERSION,
  gameId,date,seed,evidence,strictDesignerFeedback,designerModel,coordinatorModel,
  reviewModelCount,leadModels,departmentReviewModels,policyDigest,engineDigest,
  discardPolicy:directive.discardPolicy?.DESIGN_ONLY||null
};
const checkpointFingerprint=createHash('sha256').update(JSON.stringify(checkpointInputContext)).digest('hex');
const previousDesignerSeed=readJson(designerSeedPath,null);
if(previousDesignerSeed&&(previousDesignerSeed.fingerprint!==checkpointFingerprint||previousDesignerSeed.engineDigest!==engineDigest))fs.rmSync(designerSeedPath,{force:true});
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
  '9aae351acc02880ef280b371a21ead70b013c820010af4eeb88e23fe059d71b3',
  '81b77ec5e350f8737109235df27ddb3a375a99cf53bfce58e356fcdea285920b',
  '4392f6c8aaf3b4a62d3195d1aa9afdb76cd0ba1f633317503035d6af19a057b9'
]);
const checkpointV3CompatibleEngineMigrationEligible=designCheckpoint?.contractVersion===DESIGN_CHECKPOINT_CONTRACT_VERSION
  &&clean(designCheckpoint?.gameId)===gameId
  &&clean(designCheckpoint?.date)===date
  &&clean(designCheckpoint?.seedId)===clean(seed.seedId)
  &&clean(designCheckpoint?.policyDigest)===policyDigest
  &&(checkpointCompatibleEngineDigests.has(clean(designCheckpoint?.engineDigest))
    ||(clean(designCheckpoint?.engineDigest)==='cc088ad7a8676ded2864387d1c00a39b024f9e9a4e72f50308346406aea805a9'
      &&designCheckpoint.fingerprint===createHash('sha256').update(JSON.stringify({...checkpointInputContext,engineDigest:designCheckpoint.engineDigest})).digest('hex')))
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
    designerSeed:designCheckpoint.designerSeed||null,
    modelHealth:designCheckpoint.modelHealth||{},
    slowPhases:designCheckpoint.slowPhases||{},
    updatedAt:new Date().toISOString(),
    ...extra
  });
}
function persistDesignCheckpoint(){
  designCheckpoint.assetLibraryContext=designAssetLibraryContext;
  designCheckpoint.updatedAt=new Date().toISOString();
  writeJson(checkpointPath,designCheckpoint);
  writeProgress();
}
writeProgress('BOOTSTRAP',{checkpointReusable});

const MEMBER_TEXT={type:'string',maxLength:130};
const MEMBER_REVIEW={type:'object',required:['keep','fix','add','risks','evidence','questions'],properties:{keep:{type:'array',maxItems:1,items:MEMBER_TEXT},fix:{type:'array',maxItems:1,items:MEMBER_TEXT},add:{type:'array',maxItems:1,items:MEMBER_TEXT},risks:{type:'array',maxItems:1,items:MEMBER_TEXT},evidence:{type:'array',maxItems:1,items:MEMBER_TEXT},questions:{type:'array',maxItems:1,items:MEMBER_TEXT}},additionalProperties:false};
const SHORT_TEXT={type:'string',maxLength:260};
const allGamesMultiplayerRequired=readJson(CANONICAL_POLICY_PATH,{})?.directNativeDualPlatformDevelopment?.multiplayerImplementation?.required===true;
const originalMultiplayerMode=clean(seed.MULTIPLAYER_DESIGN_MODE||seed.INITIAL_PLAY_MODE).toUpperCase();
const MULTIPLAYER_MODES=['COOP','COMPETITIVE','HYBRID'].includes(originalMultiplayerMode)?[originalMultiplayerMode]
  :allGamesMultiplayerRequired?['COOP','COMPETITIVE','HYBRID']:['SINGLE','COOP','COMPETITIVE','HYBRID'];
// 플레이 근거 스키마: 기존 설계 필드 안에서 규칙·능력·상태·자산을 연결한다.
const RULE_IDS={type:'array',minItems:1,maxItems:12,items:{type:'string',maxLength:80}};
const STATE_VALUES={type:'array',minItems:1,maxItems:16,items:{type:'object',required:['key','value'],properties:{key:{type:'string',maxLength:80},value:{type:'number'}},additionalProperties:false}};
const ABILITY_CONTRACT={type:'object',required:['id','name','kind','ownerId','ruleId','trigger','range','rangeUnit','resource','cost','cooldownSeconds','telegraph','avoidance','effect','stateInputs','stateOutputs','source','rangeKey','costKey','cooldownKey'],properties:{
  id:{type:'string',maxLength:80},name:{type:'string',maxLength:100},kind:{type:'string',enum:['INFECTION','PURIFICATION','HUMAN','INFECTED','MONSTER','MOVEMENT','INTERACTION']},ownerId:{type:'string',maxLength:80},ruleId:{type:'string',maxLength:80},
  trigger:{type:'string',maxLength:400},range:{type:'number',minimum:0},rangeUnit:{type:'string',maxLength:40},resource:{type:'string',maxLength:80},cost:{type:'number',minimum:0},cooldownSeconds:{type:'number',minimum:0},
  telegraph:{type:'string',maxLength:400},avoidance:{type:'string',maxLength:400},effect:{type:'string',maxLength:400},stateInputs:RULE_IDS,stateOutputs:RULE_IDS,source:{type:'string',maxLength:400},rangeKey:{type:'string',maxLength:80},costKey:{type:'string',maxLength:80},cooldownKey:{type:'string',maxLength:80}
},additionalProperties:false};
const ROLE_TRANSITION={type:'object',required:['humanId','humanTool','humanAbilityId','infectedAbilityId','retainedState','removedState','changedChoice'],properties:{humanId:{type:'string',maxLength:80},humanTool:{type:'string',maxLength:120},humanAbilityId:{type:'string',maxLength:80},infectedAbilityId:{type:'string',maxLength:80},retainedState:{type:'string',maxLength:320},removedState:{type:'string',maxLength:320},changedChoice:{type:'string',maxLength:420}},additionalProperties:false};
const STRATEGY_CONTRACT={type:'object',required:['routeEdges','resourceSites','cooperation','advantage','cost','bestSituation'],properties:{
  routeEdges:{type:'array',minItems:1,maxItems:12,items:{type:'object',required:['from','to'],properties:{from:{type:'string',maxLength:80},to:{type:'string',maxLength:80}},additionalProperties:false}},
  resourceSites:{type:'array',minItems:1,maxItems:12,items:{type:'object',required:['stateKey','regionId'],properties:{stateKey:{type:'string',maxLength:80},regionId:{type:'string',maxLength:80}},additionalProperties:false}},
  cooperation:{type:'array',minItems:1,maxItems:12,items:{type:'object',required:['ruleId','regionId','abilityId'],properties:{ruleId:{type:'string',maxLength:80},regionId:{type:'string',maxLength:80},abilityId:{type:'string',maxLength:80}},additionalProperties:false}},
  advantage:{type:'string',maxLength:400},cost:{type:'string',maxLength:400},bestSituation:{type:'string',maxLength:400}
},additionalProperties:false};
const PLAY_ACTION={type:'object',required:['abilityId','actorId','targetId','atSeconds','distance','energyBefore','energyAfter','hit','response'],properties:{abilityId:{type:'string',maxLength:80},actorId:{type:'string',maxLength:80},targetId:{type:'string',maxLength:80},atSeconds:{type:'number',minimum:0},distance:{type:'number',minimum:0},energyBefore:{type:'number',minimum:0},energyAfter:{type:'number',minimum:0},hit:{type:'boolean'},response:{type:'string',maxLength:400}},additionalProperties:false};
const ASSET_BINDING={type:'object',required:['family','role','bodyPlan','behavior','presentation','ruleIds','useLocation','assetId','decision','selectionReason','improvement','platformAdaptation','validation'],properties:{family:{type:'string',maxLength:80},role:{type:'string',maxLength:100},bodyPlan:{type:'string',maxLength:260},behavior:{type:'string',maxLength:300},presentation:{type:'string',maxLength:300},ruleIds:RULE_IDS,useLocation:{type:'string',maxLength:300},assetId:{type:'string',maxLength:160},decision:{type:'string',enum:['USE','ADAPT','AUTHOR','UNRESOLVED']},selectionReason:{type:'string',maxLength:400},improvement:{type:'string',maxLength:400},platformAdaptation:{type:'string',maxLength:400},validation:{type:'string',maxLength:400}},additionalProperties:false};
const REVIEW={type:'object',required:['keep','fix','add','risks','evidence','questions'],properties:{keep:{type:'array',maxItems:2,items:SHORT_TEXT},fix:{type:'array',maxItems:2,items:SHORT_TEXT},add:{type:'array',maxItems:2,items:SHORT_TEXT},risks:{type:'array',maxItems:2,items:SHORT_TEXT},evidence:{type:'array',maxItems:2,items:SHORT_TEXT},questions:{type:'array',maxItems:2,items:SHORT_TEXT}},additionalProperties:false};
const SYSTEM_INTERCONNECTION={type:'object',required:['fromSystem','toSystem','trigger','stateChange',...(!ownerPreservationDesign?['fromId','toId','stateKeys']:[])],properties:{fromId:{type:'string',maxLength:80},toId:{type:'string',maxLength:80},stateKeys:RULE_IDS,fromSystem:{type:'string',maxLength:180},toSystem:{type:'string',maxLength:180},trigger:{type:'string',maxLength:300},stateChange:{type:'string',maxLength:360}},additionalProperties:false};
const PROGRESSION_ECONOMY_BALANCE={type:'object',required:['progressionLoop','resourceFlow','balanceRules'],properties:{progressionLoop:{type:'string',maxLength:700},resourceFlow:{type:'string',maxLength:700},balanceRules:{type:'string',maxLength:700}},additionalProperties:false};
const CONTENT_EXPANSION={type:'object',required:['milestone','newGameplay','systemImpact'],properties:{milestone:{type:'string',maxLength:220},newGameplay:{type:'string',maxLength:500},systemImpact:{type:'string',maxLength:500}},additionalProperties:false};
const FAILURE_RETRY_RISK={type:'object',required:['failureStates','retryFlow','riskPressure','recoveryRules'],properties:{failureStates:{type:'array',minItems:2,maxItems:6,items:{type:'string',maxLength:260}},retryFlow:{type:'string',maxLength:600},riskPressure:{type:'string',maxLength:600},recoveryRules:{type:'string',maxLength:600}},additionalProperties:false};
const PLATFORM_FIT_PLAN={type:'object',required:['targetPlatform','inputModel','performanceBudget','sessionConstraints'],properties:{targetPlatform:{type:'string',enum:['ROBLOX','UNITY','FORTNITE_UEFN']},inputModel:{type:'string',maxLength:600},performanceBudget:{type:'string',maxLength:600},sessionConstraints:{type:'string',maxLength:600}},additionalProperties:false};
const PLATFORM_PROFILE={type:'object',required:['platform','inputModel','sessionModel','multiplayerRuntime','performanceBudget','uiUx','saveAndNetwork','platformContentAdaptation','internalReleaseTarget','validationEvidence'],properties:{platform:{type:'string',enum:['ROBLOX','UNITY']},inputModel:{type:'string',maxLength:700},sessionModel:{type:'string',maxLength:700},multiplayerRuntime:{type:'string',maxLength:700},performanceBudget:{type:'string',maxLength:700},uiUx:{type:'string',maxLength:700},saveAndNetwork:{type:'string',maxLength:700},platformContentAdaptation:{type:'string',maxLength:700},internalReleaseTarget:{type:'string',maxLength:700},validationEvidence:{type:'string',maxLength:700}},additionalProperties:false};
const PLATFORM_PROFILES={type:'object',required:['ROBLOX','UNITY'],properties:{ROBLOX:{...PLATFORM_PROFILE,properties:{...PLATFORM_PROFILE.properties,platform:{type:'string',enum:['ROBLOX']}}},UNITY:{...PLATFORM_PROFILE,properties:{...PLATFORM_PROFILE.properties,platform:{type:'string',enum:['UNITY']}}}},additionalProperties:false};
const WEB_CANONICAL_DESIGN={type:'object',required:['role','designAuthority','playerFlow','worldAndTraversal','systemsAndContent','combatAndInteraction','progressionAndEconomy','sessionFailureRecovery','uiMenuAndOnboarding','inputCameraAccessibility','presentationAndAudio','multiplayerPersistence','expansionSpace'],properties:{role:{type:'string',enum:['WEB_DETAILED_GAME_ORIGINAL']},designAuthority:{type:'string',enum:['GAME_DESIGN_REFERENCE_NOT_SOURCE_CODE_AUTHORITY']},playerFlow:{type:'array',minItems:4,maxItems:8,items:{type:'string',maxLength:340}},worldAndTraversal:{type:'string',maxLength:900},systemsAndContent:{type:'string',maxLength:900},combatAndInteraction:{type:'string',maxLength:900},progressionAndEconomy:{type:'string',maxLength:900},sessionFailureRecovery:{type:'string',maxLength:900},uiMenuAndOnboarding:{type:'string',maxLength:900},inputCameraAccessibility:{type:'string',maxLength:900},presentationAndAudio:{type:'string',maxLength:900},multiplayerPersistence:{type:'string',maxLength:900},expansionSpace:{type:'string',maxLength:900}},additionalProperties:false};
const PLATFORM_EXPANSION_POLICY={type:'object',required:['mode','sharedLargeFrame','expansionLimit','webRule','unityRule','robloxRule'],properties:{mode:{type:'string',enum:['SHARED_LARGE_FRAME_PLATFORM_NATIVE_EXPANSION']},sharedLargeFrame:{type:'array',minItems:5,maxItems:5,items:{type:'string',enum:['CORE_IDENTITY','CORE_FUN_AND_REPRESENTATIVE_LOOP','WORLD_AND_PROGRESSION_DIRECTION','SAVE_PERSISTENCE_MEANING','MULTIPLAYER_INTENT']}},expansionLimit:{type:'string',enum:['NO_ARTIFICIAL_PARITY_LIMIT_WITHIN_SHARED_LARGE_FRAME']},webRule:{type:'string',maxLength:900},unityRule:{type:'string',maxLength:900},robloxRule:{type:'string',maxLength:900}},additionalProperties:false};
const UX_ACCESSIBILITY_PLAN={type:'object',required:['hudPriorities','touchAndInput','readability','accessibility','menuStructure','convenienceDecisions'],properties:{hudPriorities:{type:'string',maxLength:500},touchAndInput:{type:'string',maxLength:500},readability:{type:'string',maxLength:500},accessibility:{type:'string',maxLength:500},menuStructure:{type:'string',maxLength:800},convenienceDecisions:{type:'string',maxLength:800}},additionalProperties:false};
const ART_AUDIO_DIRECTION={type:'object',required:['visualIdentity','audioIdentity','gameplayFeedbackSync',...(!ownerPreservationDesign?['assetBindings']:[])],properties:{assetBindings:{type:'array',minItems:Math.max(1,designAssetFamilies.length),maxItems:24,items:ASSET_BINDING},visualIdentity:{type:'string',maxLength:600},audioIdentity:{type:'string',maxLength:600},gameplayFeedbackSync:{type:'string',maxLength:600}},additionalProperties:false};
const IMPLEMENTATION_TRACE={type:'object',required:['designElement','responsibleSystem','validationEvidence'],properties:{designElement:{type:'string',maxLength:240},responsibleSystem:{type:'string',maxLength:240},validationEvidence:{type:'string',maxLength:420}},additionalProperties:false};
const PRESERVATION_CONTRACT={type:'object',required:['mode','sourceOfTruth','lockedSemantics','presentationPasses','gameplayRule','targetSessionMinutes'],properties:{mode:{type:'string',enum:['PRESERVATION_PRESENTATION_UPGRADE']},sourceOfTruth:{type:'string',enum:['EXISTING_IMPLEMENTATION_AND_OWNER_SEED']},lockedSemantics:{type:'array',minItems:8,maxItems:12,items:{type:'string',enum:['WORLD_AND_REGIONS','STORY_AND_QUESTS','COMBAT_RULES','CRAFTING_RECIPES_AND_COSTS','SAVE_KEY_AND_SCHEMA_MEANING','PROGRESSION','BALANCE_VALUES','DROPS_AND_REWARDS','HIT_AND_COOLDOWN_SEMANTICS','MULTIPLAYER_MODE']}},presentationPasses:{type:'array',minItems:7,maxItems:7,items:{type:'string',enum:['ASSET_ADAPTATION','LIVING_MOTION','ANIMATION_FEEL','VFX','AUDIO_FEEL','CAMERA_LANGUAGE','POLISH_MOBILE']}},gameplayRule:{type:'string',enum:['NO_GAMEPLAY_MECHANIC_ADDITION_REMOVAL_OR_REBALANCE']},targetSessionMinutes:{type:'number'}},additionalProperties:false};
const DESIGN_ALTERNATIVE={type:'object',required:['label','concept','playerFantasy','genreDirection','coreLoopShift','mapTopologyRegionRoles','landmarksTraversal','enemyEcosystemCounterplay','bossSignatureMoments','progressionEconomy','questStoryEventFlow','failureRetryRecovery','platformAdaptation','implementationScope','validationPlan',...(!ownerPreservationDesign?['strategy']:[])],properties:{strategy:STRATEGY_CONTRACT,label:{type:'string',enum:['PLAN_A','PLAN_B','PLAN_C']},concept:{type:'string',maxLength:900},playerFantasy:{type:'string',maxLength:700},genreDirection:{type:'string',maxLength:420},coreLoopShift:{type:'string',maxLength:700},mapTopologyRegionRoles:{type:'string',maxLength:800},landmarksTraversal:{type:'string',maxLength:700},enemyEcosystemCounterplay:{type:'string',maxLength:800},bossSignatureMoments:{type:'string',maxLength:700},progressionEconomy:{type:'string',maxLength:800},questStoryEventFlow:{type:'string',maxLength:800},failureRetryRecovery:{type:'string',maxLength:700},platformAdaptation:{type:'string',maxLength:800},implementationScope:{type:'string',maxLength:800},validationPlan:{type:'string',maxLength:800}},additionalProperties:false};
const SELECTED_DESIGN_PLAN={type:'object',required:['label','rationale','identityPreserved','creativeDeviation','genreChange','reversibility','playthrough','durationRationale',...(!ownerPreservationDesign?['roundSeconds','sessionSeconds',...(playableRequirements.infection?['participants']:[])]:[])],properties:{participants:{type:'array',minItems:playableRequirements.lockedNumbers.TargetPopulation||1,maxItems:32,items:{type:'object',required:['id','role','classId'],properties:{id:{type:'string',maxLength:80},role:{type:'string',enum:['HUMAN','MONSTER']},classId:{type:'string',maxLength:80}},additionalProperties:false}},roundSeconds:{type:'number',minimum:1},sessionSeconds:{type:'number',minimum:1},label:{type:'string',enum:['PLAN_A','PLAN_B','PLAN_C']},rationale:{type:'string',maxLength:900},identityPreserved:{type:'string',maxLength:600},creativeDeviation:{type:'string',maxLength:600},genreChange:{type:'boolean'},reversibility:{type:'string',maxLength:600},playthrough:{type:'array',minItems:playableRequirements.phases.length,maxItems:playableRequirements.phases.length,items:{type:'object',required:['phase','entryState','playerChoice','actionAndResponse','exitState','nextDecision',...(!ownerPreservationDesign?['startSeconds','endSeconds','timeReason','before','after','actions','ruleIds','outcome']:[])],properties:{startSeconds:{type:'number',minimum:0},endSeconds:{type:'number',minimum:0},timeReason:{type:'string',maxLength:360},before:STATE_VALUES,after:STATE_VALUES,actions:{type:'array',maxItems:16,items:PLAY_ACTION},ruleIds:RULE_IDS,outcome:{type:'string',enum:['ONGOING','HUMAN_WIN','MONSTER_WIN','DRAW','SUCCESS','FAILURE']},phase:{type:'string',enum:playableRequirements.phases},entryState:{type:'string',maxLength:300},playerChoice:{type:'string',maxLength:360},actionAndResponse:{type:'string',maxLength:700},exitState:{type:'string',maxLength:300},nextDecision:{type:'string',maxLength:360}},additionalProperties:false}},durationRationale:{type:'string',maxLength:900}},additionalProperties:false};
const VARIETY_REGION={type:'object',required:['name','traversal','riskReward','landmark','encounterPattern','resourcePressure','storyContext',...(!ownerPreservationDesign?['id','ruleIds']:[])],properties:{id:{type:'string',maxLength:80},ruleIds:RULE_IDS,name:{type:'string',maxLength:180},traversal:{type:'string',maxLength:420},riskReward:{type:'string',maxLength:420},landmark:{type:'string',maxLength:420},encounterPattern:{type:'string',maxLength:420},resourcePressure:{type:'string',maxLength:420},storyContext:{type:'string',maxLength:420}},additionalProperties:false};
const VARIETY_ENEMY={type:'object',required:['name','behavior','counterplay','positioning','timing','mobility','groupRole','identity','rewardMeaning'],properties:{name:{type:'string',maxLength:180},behavior:{type:'string',maxLength:420},counterplay:{type:'string',maxLength:420},positioning:{type:'string',maxLength:420},timing:{type:'string',maxLength:420},mobility:{type:'string',maxLength:420},groupRole:{type:'string',maxLength:420},identity:{type:'string',maxLength:420},rewardMeaning:{type:'string',maxLength:420}},additionalProperties:false};
const CONTENT_VARIETY_PLAN={type:'object',required:['regions','enemiesOrChallenges','objectives','antiMonotonyRule',...(!ownerPreservationDesign?['abilities','roleTransitions']:[])],properties:{abilities:{type:'array',minItems:Math.max(2,playableRequirements.humanRoster.length*2+playableRequirements.monsterRoster.length+(playableRequirements.infection?2:0)),maxItems:64,items:ABILITY_CONTRACT},roleTransitions:{type:'array',minItems:playableRequirements.humanRoster.length,maxItems:32,items:ROLE_TRANSITION},regions:{type:'array',minItems:ownerPreservationDesign?0:2,maxItems:12,items:VARIETY_REGION},enemiesOrChallenges:{type:'array',maxItems:8,items:VARIETY_ENEMY},objectives:{type:'array',maxItems:8,items:{type:'object',required:['role','variation'],properties:{role:{type:'string',maxLength:180},variation:{type:'string',maxLength:420}},additionalProperties:false}},antiMonotonyRule:{type:'string',maxLength:800}},additionalProperties:false};
const CHARACTER_VOICE_PROFILE={type:'object',required:['character','grammarRegister','vocabularyRhythm','relationshipShift','emotionalRange','knowledgeBoundary','subtextBehavior'],properties:{character:{type:'string',maxLength:180},grammarRegister:{type:'string',maxLength:420},vocabularyRhythm:{type:'string',maxLength:420},relationshipShift:{type:'string',maxLength:420},emotionalRange:{type:'string',maxLength:420},knowledgeBoundary:{type:'string',maxLength:420},subtextBehavior:{type:'string',maxLength:420}},additionalProperties:false};
const SCENE_BEAT={type:'object',required:['scene','purpose','characterGoals','conflict','informationAsymmetry','reversal','stateChange'],properties:{scene:{type:'string',maxLength:240},purpose:{type:'string',maxLength:420},characterGoals:{type:'string',maxLength:420},conflict:{type:'string',maxLength:420},informationAsymmetry:{type:'string',maxLength:420},reversal:{type:'string',maxLength:420},stateChange:{type:'string',maxLength:420}},additionalProperties:false};
const NARRATIVE_DIALOGUE_PLAN={type:'object',required:['applicable','worldRules','characterGoals','plotBeats','questStates','foreshadowing','payoffs','twists','dialogueRules','characterVoiceProfiles','sceneBeats'],properties:{applicable:{type:'boolean'},worldRules:{type:'array',maxItems:8,items:{type:'string',maxLength:420}},characterGoals:{type:'array',maxItems:8,items:{type:'string',maxLength:420}},plotBeats:{type:'array',maxItems:8,items:{type:'string',maxLength:420}},questStates:{type:'array',maxItems:8,items:{type:'string',maxLength:420}},foreshadowing:{type:'array',maxItems:8,items:{type:'string',maxLength:420}},payoffs:{type:'array',maxItems:8,items:{type:'string',maxLength:420}},twists:{type:'array',maxItems:4,items:{type:'string',maxLength:500}},dialogueRules:{type:'array',maxItems:8,items:{type:'string',maxLength:420}},characterVoiceProfiles:{type:'array',maxItems:8,items:CHARACTER_VOICE_PROFILE},sceneBeats:{type:'array',maxItems:8,items:SCENE_BEAT}},additionalProperties:false};
const REFERENCE_HOMAGE_PLAN={type:'object',required:['inspirations','originalityRule'],properties:{inspirations:{type:'array',maxItems:5,items:{type:'object',required:['titleOrTradition','rightsBasis','borrowedTechnique','transformation'],properties:{titleOrTradition:{type:'string',maxLength:220},rightsBasis:{type:'string',enum:['PUBLIC_DOMAIN','ABSTRACT_TECHNIQUE','ORIGINAL']},borrowedTechnique:{type:'string',maxLength:500},transformation:{type:'string',maxLength:600}},additionalProperties:false}},originalityRule:{type:'string',maxLength:800}},additionalProperties:false};
const DESIGN_INTEGRITY_PLAN={type:'object',required:['movementAndControlReachable','spawnToFirstActionReachable','progressionReachable','questPrerequisitesSatisfiable','sessionEndReachable','failureRecoveryReachable','mapObjectivesReachable','economyFeasible','counterplayFeasible','bossPhaseTransitionsReachable','multiplayerLifecycleFeasible','saveCompatible','narrativeCausalityConsistent','notes',...(!ownerPreservationDesign?['authoringVersion','flowAudit']:[])],properties:{authoringVersion:{type:'number',enum:[2]},flowAudit:{type:'array',minItems:playableRequirements.phases.length,maxItems:playableRequirements.phases.length,items:{type:'object',required:['phase','reachableBy','blockedCase','recovery','nextPhase'],properties:{phase:{type:'string',enum:playableRequirements.phases},reachableBy:RULE_IDS,blockedCase:{type:'string',maxLength:360},recovery:{type:'string',maxLength:360},nextPhase:{type:'string',maxLength:80}},additionalProperties:false}},movementAndControlReachable:{type:'boolean'},spawnToFirstActionReachable:{type:'boolean'},progressionReachable:{type:'boolean'},questPrerequisitesSatisfiable:{type:'boolean'},sessionEndReachable:{type:'boolean'},failureRecoveryReachable:{type:'boolean'},mapObjectivesReachable:{type:'boolean'},economyFeasible:{type:'boolean'},counterplayFeasible:{type:'boolean'},bossPhaseTransitionsReachable:{type:'boolean'},multiplayerLifecycleFeasible:{type:'boolean'},saveCompatible:{type:'boolean'},narrativeCausalityConsistent:{type:'boolean'},notes:{type:'array',minItems:2,maxItems:12,items:{type:'string',maxLength:420}}},additionalProperties:false};
const STABILITY_PRIORITY_PLAN={type:'object',required:['signals','priorityRule'],properties:{signals:{type:'array',maxItems:10,items:{type:'object',required:['symptom','severity','causeClass','evidence'],properties:{symptom:{type:'string',maxLength:420},severity:{type:'string',enum:['CRITICAL','HIGH','MEDIUM','LOW']},causeClass:{type:'string',enum:['IMPLEMENTATION_RUNTIME_DEFECT','DESIGN_DEFECT','MIXED_DEFECT','UNRESOLVED_CAUSE']},evidence:{type:'string',maxLength:500}},additionalProperties:false}},priorityRule:{type:'string',maxLength:700}},additionalProperties:false};

const DESIGN={type:'object',required:['identity','playerFantasy','coreFun','coreLoop','signatureSystems','systemInterconnections','progressionDirection','progressionEconomyBalance','contentExpansionPlan','failureRetryRisk','platformFitPlan','platformProfiles','webCanonicalDesign','platformExpansionPolicy','visualDirection','mobileUx','uxAccessibilityPlan','artAudioDirection','marketTargetDirection','steamExpansionDecision','multiplayerMode','multiplayerExpansionDecision','designAlternatives','selectedDesignPlan','contentVarietyPlan','narrativeDialoguePlan','referenceHomagePlan','designIntegrityPlan','stabilityPriorityPlan','technicalAssumptions','validationQuestions','implementationTraceability','openQuestions'],properties:{identity:{type:'string',maxLength:1000},playerFantasy:{type:'string',maxLength:900},coreFun:{type:'string',maxLength:900},coreLoop:{type:'array',minItems:3,maxItems:8,items:{type:'string',maxLength:340}},signatureSystems:{type:'array',minItems:ownerPreservationDesign?2:5,maxItems:12,items:{type:'object',required:['name','purpose','playerChoice',...(!ownerPreservationDesign?['id','grammarRole','stateInputs','stateOutputs']:[])],properties:{id:{type:'string',maxLength:80},grammarRole:{type:'string',enum:['MAIN','A','B','c','DELVE']},stateInputs:RULE_IDS,stateOutputs:RULE_IDS,name:{type:'string',maxLength:130},purpose:{type:'string',maxLength:440},playerChoice:{type:'string',maxLength:440}},additionalProperties:false}},systemInterconnections:{type:'array',minItems:ownerPreservationDesign?3:5,maxItems:24,items:SYSTEM_INTERCONNECTION},progressionDirection:{type:'string',maxLength:900},progressionEconomyBalance:PROGRESSION_ECONOMY_BALANCE,contentExpansionPlan:{type:'array',minItems:3,maxItems:6,items:CONTENT_EXPANSION},failureRetryRisk:FAILURE_RETRY_RISK,platformFitPlan:PLATFORM_FIT_PLAN,platformProfiles:PLATFORM_PROFILES,webCanonicalDesign:WEB_CANONICAL_DESIGN,platformExpansionPolicy:PLATFORM_EXPANSION_POLICY,visualDirection:{type:'string',maxLength:900},mobileUx:{type:'string',maxLength:900},uxAccessibilityPlan:UX_ACCESSIBILITY_PLAN,artAudioDirection:ART_AUDIO_DIRECTION,marketTargetDirection:{type:'string',maxLength:900},steamExpansionDecision:{type:'string',maxLength:500},multiplayerMode:{type:'string',enum:MULTIPLAYER_MODES},multiplayerExpansionDecision:{type:'string',maxLength:500},designAlternatives:{type:'array',minItems:2,maxItems:3,items:DESIGN_ALTERNATIVE},selectedDesignPlan:SELECTED_DESIGN_PLAN,contentVarietyPlan:CONTENT_VARIETY_PLAN,narrativeDialoguePlan:NARRATIVE_DIALOGUE_PLAN,referenceHomagePlan:REFERENCE_HOMAGE_PLAN,designIntegrityPlan:DESIGN_INTEGRITY_PLAN,stabilityPriorityPlan:STABILITY_PRIORITY_PLAN,technicalAssumptions:{type:'array',minItems:2,maxItems:8,items:{type:'string',maxLength:340}},validationQuestions:{type:'array',minItems:2,maxItems:8,items:{type:'string',maxLength:340}},implementationTraceability:{type:'array',minItems:3,maxItems:8,items:IMPLEMENTATION_TRACE},openQuestions:{type:'array',maxItems:8,items:{type:'string',maxLength:340}},preservationContract:PRESERVATION_CONTRACT},additionalProperties:false};
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
const DESIGN_GATE_FIELDS=['systemInterconnections','progressionEconomyBalance','contentExpansionPlan','failureRetryRisk','platformFitPlan','platformProfiles','webCanonicalDesign','platformExpansionPolicy','uxAccessibilityPlan','artAudioDirection','designAlternatives','selectedDesignPlan','contentVarietyPlan','narrativeDialoguePlan','referenceHomagePlan','designIntegrityPlan','stabilityPriorityPlan','implementationTraceability'];
const DESIGN_BASE_FIELDS=DESIGN.required.filter(key=>!DESIGN_GATE_FIELDS.includes(key));
const designSliceSchema=fields=>({type:'object',required:[...fields],properties:Object.fromEntries(fields.map(key=>[key,DESIGN.properties[key]])),additionalProperties:false});
const DESIGN_BASE=designSliceSchema(DESIGN_BASE_FIELDS);
const DESIGN_GATE=designSliceSchema(DESIGN_GATE_FIELDS);
const DESIGN_AUTHORING_SLICES=Object.freeze([
  {id:'identity-core',fields:['identity','playerFantasy','coreFun','coreLoop','signatureSystems','multiplayerMode'],predict:1200},
  {id:'systems-progression',fields:['systemInterconnections','progressionDirection','progressionEconomyBalance','contentExpansionPlan','failureRetryRisk'],predict:1500},
  {id:'content-rules',fields:['contentVarietyPlan'],predict:1800},
  {id:'alternatives',fields:['designAlternatives'],predict:1600},
  {id:'selection-variety',fields:['selectedDesignPlan'],predict:1800},
  {id:'platform-profiles',fields:['platformFitPlan','platformProfiles'],predict:1400},
  {id:'web-canonical',fields:['webCanonicalDesign'],predict:1500},
  {id:'platform-expansion',fields:['platformExpansionPolicy'],predict:900},
  {id:'ux-presentation',fields:['visualDirection','mobileUx','uxAccessibilityPlan','artAudioDirection'],predict:1200},
  {id:'market-multiplayer',fields:['marketTargetDirection','steamExpansionDecision','multiplayerExpansionDecision'],predict:900},
  {id:'narrative-homage',fields:['narrativeDialoguePlan','referenceHomagePlan'],predict:1300},
  {id:'integrity-stability',fields:['designIntegrityPlan','stabilityPriorityPlan'],predict:1300},
  {id:'traceability',fields:['technicalAssumptions','validationQuestions','implementationTraceability','openQuestions'],predict:1100}
]);
const DESIGN_AUTHORING_SLICE_FIELDS=DESIGN_AUTHORING_SLICES.flatMap(row=>row.fields);
if(DESIGN_AUTHORING_SLICE_FIELDS.length!==DESIGN.required.length||new Set(DESIGN_AUTHORING_SLICE_FIELDS).size!==DESIGN.required.length||DESIGN.required.some(field=>!DESIGN_AUTHORING_SLICE_FIELDS.includes(field))){
  throw new Error('DESIGN_AUTHORING_SLICE_CONTRACT_MISMATCH');
}
function persistDesignerSeed(design,phase){
  const fields=DESIGN_AUTHORING_SLICES.find(row=>row.id==='identity-core').fields;
  const content=Object.fromEntries(fields.map(field=>[field,design[field]]));
  assertSchemaValue(content,designSliceSchema(fields));
  const failures=validateDesignAuthoringContent({design,seed,fields,multiplayerRequired:allGamesMultiplayerRequired,requirePlayableContract:!ownerPreservationDesign,sourceText:currentRuleSource});
  if(failures.length)throw new Error(`DESIGNER_SEED_REPAIR_REQUIRED: ${failures.map(row=>row.code).join(',')}`);
  const authorModel=designCheckpoint.effectiveDesignerModel||activeDesignerRoute.id;
  const contentDigest=createHash('sha256').update(JSON.stringify(content)).digest('hex');
  writeJson(designerSeedPath,{
    version:1,gameId,date,seedId:seed.seedId,
    authorRole:'GAME_DESIGNER_AI',authorModel,singleAuthor:true,
    sourceStage:'identity-core',phase,status:'AUTHORED_CANDIDATE',
    inputSource:'OWNER_BRIEF_OR_ORIGINAL_OR_REFERENCE_MATERIALS',
    originalSource:seed.DESIGN_BASELINE_SOURCE||null,
    fingerprint:checkpointFingerprint,engineDigest,contentDigest,
    externalSeedRequired:false,designPass:false,runtimePass:false,
    content,updatedAt:new Date().toISOString()
  });
  designCheckpoint.designerSeed={file:designerSeedPath,contentDigest,authorModel,status:'AUTHORED_CANDIDATE'};
  console.log(`DESIGNER_SEED_AUTHORED=${gameId}|${phase}|${contentDigest}`);
}
async function authorDesignInCheckpointedSlices({phase,system,sharedContext,currentDesign={}}){
  const merged={...currentDesign};
  // 고정 입력을 앞에 유지해 다음 요청에서도 같은 접두부를 재사용한다.
  // 오너 원본 모드의 호환용 자동 스케치는 설계 원본 입력이 아니다.
  const commonInput=`${['OWNER_BRIEF_AND_ORIGINAL_ONLY','DESIGNER_SELF_SEED'].includes(seed.designInputMode)||seed.autoMissingDesignIntake?'':`GAME_SEED_DESIGN_DEPTH=${clip(seedDesignDepthContext,7500)}\n`}SHARED_CONTEXT=${clip(sharedContext,6500)}\nMULTIPLAYER_ALLOWED_MODES=${JSON.stringify(MULTIPLAYER_MODES)}; 모든 게임 멀티 필수 정책이 적용되면 기존 SINGLE은 원본 참고이며 디자이너가 멀티 확장을 직접 작성한다. 기존 COOP/COMPETITIVE/HYBRID 규칙은 보존한다.\nPLAYABILITY_REQUIREMENTS=${JSON.stringify(playableRequirements)}`;
  for(const slice of DESIGN_AUTHORING_SLICES){
    const schema=designSliceSchema(slice.fields);
    const existing=Object.fromEntries(slice.fields.filter(field=>Object.prototype.hasOwnProperty.call(merged,field)).map(field=>[field,merged[field]]));
    const taskKey=`${phase}_slices::${slice.id}`;
    const priorRules=Object.fromEntries(['identity','coreFun','coreLoop','signatureSystems','systemInterconnections','progressionEconomyBalance','failureRetryRisk','multiplayerMode','contentVarietyPlan','designAlternatives','selectedDesignPlan'].filter(field=>!slice.fields.includes(field)&&merged[field]!==undefined).map(field=>[field,merged[field]]));
    const dependencyHash=createHash('sha256').update(JSON.stringify(priorRules)).digest('hex');
    const compactRule=value=>typeof value==='string'?clip(value,180):Array.isArray(value)?value.map(compactRule):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,compactRule(item)])):value;
    const anchors=compactRule(Object.fromEntries(Object.entries(priorRules).map(([field,value])=>[field,field==='contentVarietyPlan'?{regions:value.regions?.map(({id,name,ruleIds})=>({id,name,ruleIds})),abilities:value.abilities,roleTransitions:value.roleTransitions}:field==='designAlternatives'?value.map(plan=>({label:plan.label,strategy:plan.strategy})):field==='selectedDesignPlan'?value:value])));
    designCheckpoint.sliceDependencies||={};
    designCheckpoint.sliceRepairFeedback||={};
    designCheckpoint.sliceRepairAttempts||={};
    if(designCheckpoint.sliceDependencies[taskKey]&&designCheckpoint.sliceDependencies[taskKey]!==dependencyHash)delete designCheckpoint.tasks[taskKey];
    let result,feedback=designCheckpoint.sliceRepairFeedback[taskKey]||[];
    for(let attempt=0;attempt<2;attempt++){
      result=await runCheckpointTask(`${phase}_slices`,slice.id,()=>callDesignerModel(
      system,
      `${commonInput}\n전체 설계를 한 번에 출력하지 말고 현재 필드 묶음만 상세하게 작성하라. 다른 필드는 출력하지 않는다. MAIN/A/B/c/@와 causalDNA 연결은 현재 필드가 담당하는 범위에서 실제 상태 변화로 유지한다. 이미 작성된 설계와 모순시키지 않는다. 원본 규칙과 수치를 보존한다.\nCURRENT_RULE_SOURCE=${['content-rules','selection-variety'].includes(slice.id)?JSON.stringify({...currentRuleSourceContext,lines:playableRequirements.abilityFacts.length?undefined:currentRuleSourceContext.lines,abilityFacts:playableRequirements.abilityFacts}):'원본 수치는 공유 규칙을 따른다'}\nSLICE_ID=${slice.id}\nSLICE_FIELDS=${JSON.stringify(slice.fields)}\nSTRUCTURE_CONTRACT=${JSON.stringify(repairStructureContract(slice.fields))}\nCURRENT_SLICE=${clip(existing,3500)}\nSHARED_RULE_ANCHORS=${JSON.stringify(anchors)}\nAUTHORING_REPAIR_ATTEMPT=${designCheckpoint.sliceRepairAttempts[taskKey]||0}\nAUTHORING_REPAIR_FEEDBACK=${JSON.stringify(feedback.map(row=>row.code==='DESIGN_PLACEHOLDER_CONTENT'?{...row,evidence:{path:row.evidence?.path}}:row))}`,
      schema,
      {predict:slice.predict,temperature:phase.includes('revision')?0.16:0.24,numCtx:['content-rules','selection-variety','integrity-stability'].includes(slice.id)?16384:8192,recoverOversized:designCheckpoint.failedTask===slice.id&&/^OLLAMA_DESIGN_(TIMEOUT|OUTPUT_TRUNCATED)/.test(designCheckpoint.lastError||''),isolateFields:feedback.some(row=>['DESIGN_PLACEHOLDER_CONTENT','DESIGN_MULTIPLAYER_CONTRADICTION','DESIGN_RULE_ROLE_MISSING','DESIGN_RULE_STATE_MISSING','DESIGN_SLICE_SCHEMA_INVALID'].includes(row.code))}
      ));
      feedback=validateDesignAuthoringContent({design:{...merged,...result},seed,fields:slice.fields,multiplayerRequired:allGamesMultiplayerRequired,requirePlayableContract:!ownerPreservationDesign,assetLibrary:designAssetLibrary,sourceText:currentRuleSource,assetFamilies:designAssetFamilies});
      try{assertSchemaValue(result,schema);}catch(error){feedback.push({code:'DESIGN_SLICE_SCHEMA_INVALID',fields:slice.fields,requiredAction:clean(error.message)});}
      if(!feedback.length)break;
      delete designCheckpoint.tasks[taskKey];
      designCheckpoint.sliceRepairFeedback[taskKey]=feedback;
      // 같은 오류가 반복돼도 실패한 하위 조각 캐시를 다시 쓰지 않는다.
      designCheckpoint.sliceRepairAttempts[taskKey]=(designCheckpoint.sliceRepairAttempts[taskKey]||0)+1;
      designCheckpoint.failedPhase=`${phase}_slices`;designCheckpoint.failedTask=slice.id;
      designCheckpoint.lastError=`DESIGN_CONTENT_REPAIR_REQUIRED ${feedback.map(row=>row.code).join(',')}`;
      persistDesignCheckpoint();
      console.log(`DESIGN_SLICE_CONTENT_REPAIR=${slice.id}|${feedback.map(row=>row.code).join(',')}`);
    }
    if(feedback.length)throw new Error(designCheckpoint.lastError);
    delete designCheckpoint.sliceRepairFeedback[taskKey];
    designCheckpoint.sliceDependencies[taskKey]=dependencyHash;
    Object.assign(merged,result);
    if(slice.id==='identity-core')persistDesignerSeed(merged,phase);
    persistDesignCheckpoint();
    console.log(`DESIGN_SLICE_CONTENT_VALID=${slice.id}`);
  }
  const grounded=repairDesignRequiredFields(merged,{seed,factPack,phase:phase.toUpperCase()});
  const complete=enforceOwnerPreservationDesign(grounded.value);
  assertSchemaValue(complete,DESIGN);
  const finalFeedback=validateDesignAuthoringContent({design:complete,seed,multiplayerRequired:allGamesMultiplayerRequired,requirePlayableContract:!ownerPreservationDesign,assetLibrary:designAssetLibrary,sourceText:currentRuleSource,assetFamilies:designAssetFamilies});
  if(finalFeedback.length){
    for(const slice of DESIGN_AUTHORING_SLICES){
      const feedback=finalFeedback.filter(row=>row.fields.some(field=>slice.fields.includes(field)));
      if(!feedback.length)continue;
      const taskKey=`${phase}_slices::${slice.id}`;
      delete designCheckpoint.tasks[taskKey];
      designCheckpoint.sliceRepairFeedback[taskKey]=feedback;
      designCheckpoint.sliceRepairAttempts[taskKey]=(designCheckpoint.sliceRepairAttempts[taskKey]||0)+1;
      designCheckpoint.failedPhase=`${phase}_slices`;designCheckpoint.failedTask=slice.id;
    }
    designCheckpoint.lastError=`DESIGN_FULL_FLOW_REPAIR_REQUIRED ${finalFeedback.map(row=>row.code).join(',')}`;
    persistDesignCheckpoint();
    throw new Error(designCheckpoint.lastError);
  }
  console.log('DESIGN_FULL_FLOW_CONTENT_VALID=YES');
  console.log(`DESIGN_CHECKPOINTED_SLICES_COMPLETE=${phase}|count=${DESIGN_AUTHORING_SLICES.length}`);
  return complete;
}
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
  CORE_LOOP_DESIGN:['planning','qa'],
  SYSTEM_INTERCONNECTION_DESIGN:['development','qa'],
  PROGRESSION_ECONOMY_BALANCE_DESIGN:['planning','qa'],
  CONTENT_EXPANSION_PLAN:['planning','qa'],
  FAILURE_RETRY_RISK_DESIGN:['planning','qa'],
  PLATFORM_FIT_DESIGN:['development','qa'],
  UX_AND_ACCESSIBILITY_PLAN:['graphics','qa'],
  ART_AUDIO_DIRECTION:['graphics','audio'],
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
    multiplayerRequired:allGamesMultiplayerRequired,requirePlayableContract:!ownerPreservationDesign,
    assetLibrary:designAssetLibrary,
    assetFamilies:designAssetFamilies,
    sourceText:currentRuleSource,
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
      requiredAction:reason.requiredAction,fields:reason.fields||[],bypassAllowed:false
    }))
  };
}
function repairFields(scored){
  const axes=uniq([
    ...(Array.isArray(scored?.criticalAxisFailures)?scored.criticalAxisFailures:[]),
    ...(Array.isArray(scored?.rejectionReasons)?scored.rejectionReasons.map(reason=>reason?.axis):[])
  ]);
  const fields=uniq([...(scored?.rejectionReasons||[]).flatMap(reason=>reason.fields||[]),...axes.flatMap(axis=>AXIS_FIELDS[axis]||[])]).filter(field=>DESIGN.required.includes(field));
  return fields.length?fields:['identity','coreFun','coreLoop','signatureSystems'];
}
function repairStructureContract(fields){
  const rules=[];
  rules.push('전체 항목 공통: 임시 식별자·같은 문장 반복으로 내용을 채우지 않는다. 앞에서 확정한 중심 행동·두 핵심 축·보조 요소·파고들기·게임 규칙·저장 의미를 유지하고 입력→판정→상태 변화→대응→다음 선택으로 구체화한다.');
  if(fields.includes('selectedDesignPlan'))rules.push(`selectedDesignPlan.playthrough: ${playableRequirements.phases.join(' → ')} 순서의 ${playableRequirements.phases.length}개 장면. 각 entryState는 직전 exitState를 그대로 이어받는다. playerChoice, actionAndResponse, exitState, nextDecision에 실제 선택·조건·판정·전조·대응·실패 복구를 적는다. durationRationale에는 한 판 길이와 여러 판을 포함한 세션 길이, 초중후반 행동에 필요한 시간 근거와 확인할 가정을 구분한다. 기존 시간 제한이나 밸런스는 오너 승인 없이 변경하지 않는다.`);
  if(fields.includes('designAlternatives'))rules.push('designAlternatives: 같은 규칙 안에서 루프·동선·적 대응·성장 중 최소 두 항목의 실제 전략이 다른 대안을 작성한다. PLAN_A/PLAN_B 이름이나 수식어만 바꾸지 않는다.');
  if(fields.includes('platformProfiles'))rules.push('platformProfiles: 공통 규칙은 공유하되 UNITY의 배포/검증에 Roblox Open Cloud/Rojo를 복사하지 않는다. ROBLOX는 Roblox 실행 증거, UNITY는 같은 Unity 프로젝트의 네이티브/WebGL 실행 증거를 사용한다.');
  if(fields.includes('webCanonicalDesign'))rules.push('webCanonicalDesign: 모든 설명을 구체적인 장면·행동·상태 전이로 작성한다. 공격/상호작용의 선행조건·범위·자원·재사용 시간·전조·대응과 실패 복구를 원본 근거에 연결한다. WEB_... 같은 임시 표식을 쓰지 않는다.');
  if(fields.includes('technicalAssumptions')||fields.includes('implementationTraceability'))rules.push('자산은 요구 역할→사용 장면→후보 ID→선정 근거→개선/제작 필요→플랫폼 적응→실제 확인 방법 순서로 기술한다. ROLE_REQUIREMENT_UNRESOLVED 후보는 사용 확정이나 자산 부재로 간주하지 말고 역할을 먼저 구체화한다. 내부 점수만으로 역할 적합성·런타임 품질을 주장하지 않는다.');
  if(fields.includes('identity'))rules.push('identity: 공백 포함 최소 60자 이상의 구체적 게임 정체성. 무슨 게임인지와 같은 장르와의 차이를 즉시 읽을 수 있고, 대표 행동·대표 선택·시그니처 세계 규칙이 coreLoop/signatureSystems와 직접 연결되어야 한다.');
  if(fields.includes('playerFantasy'))rules.push('playerFantasy: 공백 포함 최소 40자 이상의 구체적 플레이어 역할·책임·대표 행동·결과 판타지. 관찰자 설명이 아니라 플레이어가 실제로 무엇을 하는지 명시.');
  if(fields.includes('coreFun'))rules.push('coreFun: 공백 포함 최소 40자 이상. 대표 행동과 반복되는 대표 선택, 관찰 가능한 상태변화, 즉각적 결과를 명시하고 정체성 문장과 같은 플레이 약속을 증명.');
  if(fields.includes('coreLoop'))rules.push('coreLoop: 서로 다른 실제 플레이 단계 최소 3개. 입력/선택 -> 상태변화 -> 보상·위험·다음 선택의 연결을 포함.');
  if(fields.includes('signatureSystems'))rules.push('signatureSystems: MAIN/A/B/c/DELVE(@) 역할을 각각 포함하는 최소 5개 서로 다른 시스템. 각 name은 최소 2자, purpose와 playerChoice는 각각 최소 20자 이상의 구체적 내용.');
  if(fields.includes('contentExpansionPlan'))rules.push('contentExpansionPlan: 최소 3개 서로 다른 객체. JS String.length 기준 각 milestone은 최소 20자, newGameplay/systemImpact는 각각 최소 30자 이상으로 실제 새 플레이와 기존 시스템 영향을 구체적으로 설명.');
  if(fields.includes('uxAccessibilityPlan'))rules.push('menuStructure: 장르·대표 행동·기기에 맞는 정보 구조를 선택한다. 화면 진입/복귀, 전투 중 빠른 선택, 비교 분할창, 탐색형 목록, 빌드 트리, 상황형 바로가기 중 왜 이 구성이 맞는지 대안을 비교한다. convenienceDecisions: 실제 반복 불편 -> 참고 기능의 작동 원리 -> 우리 게임 적용/기각 이유 -> 상태/비용 보호 -> 검증 경로를 적는다. 프리셋 저장·전환, 조건 필터, 일괄 처리 미리보기, 목표에서 재료/지도 바로가기, 선택·필터·스크롤·미완성 작업 복귀 중 관련 기능을 선택한다. 버튼 크기나 메뉴 개수만으로 편의성 개선이라 하지 않는다. 아래 공식 참고는 관찰일의 설계 자료이며 최신 여부와 우리 게임의 효과는 미검증이다. 검증된 이전 경험과 실패도 함께 비교하고 새 작품/업데이트를 참고했다고 출처 없이 주장하지 않는다. REFERENCES='+JSON.stringify(GAME_CONVENIENCE_REFERENCES.map(({match,...row})=>row)));
  if(fields.some(field=>['progressionEconomyBalance','contentExpansionPlan','failureRetryRisk'].includes(field)))rules.push('파고들기/보상: 발견 가능한 단서 -> 조합·숙련·탐험 실험 -> 위험·기회비용·대응법 -> 새 행동/공략/경로/세계관계 -> 다음 탐구거리의 인과를 설계한다. 재화·능력치·아이템 개수 증가만으로 깊이를 주장하지 않는다. 보상은 단기 성공, 세션 목표, 선택적 장기 숙련에서 서로 다른 플레이 변화를 주되 해당 장르와 기존 저장·밸런스를 보존한다. 조합 기록·비교·발견 단서·재도전 준비는 관련 메뉴에 연결하고 정답을 미리 노출하거나 반복 노동을 강제하지 않는다. 구현 전 가설과 실제 플레이 증거를 구분한다.');
  if(fields.includes('progressionEconomyBalance'))rules.push('재미와 보상은 승인된 메인 A/B/C 조합의 큰 재미, 짧은 발견·수집·꾸미기·작은 목표의 소확행, 선택적으로 깊게 투자하는 장기 즐길거리를 구분해 연결한다. 보상 조건·비용·누적 진척·약속한 확정 보상·확률 보상의 실제 확률·중복 보상의 쓰임·중단 후 이어하기를 게임에 맞게 설계하고 메뉴에 보인다. 보상 중복 수령과 진행 유실은 검증한다. 소확행에 수치/재화 보상을 쓸 수 있으나 그것만으로 깊은 파고들기를 대체하지 않는다. 기존 MAIN/A/B/c/@의 승인된 역할을 편의상 다시 분류하거나 장르에 없는 수집/전투를 강제하지 않는다.');
  if(fields.some(field=>['signatureSystems','systemInterconnections','contentExpansionPlan'].includes(field)))rules.push('깊이의 기준은 학문을 가르치거나 학문 소재를 넣는 것이 아니라, 게임 자체를 오래 연구할 만한 규칙·관계·응용의 층위다. 쉽게 시작하는 대표 행동에서 출발해 시스템 상호작용, 상황별 예외와 대가, 조합의 새로운 용도, 여러 유효한 해법, 숙련으로 바뀌는 선택, 발견 후 다음 질문으로 이어지게 한다. MAIN/A/B/C 사이의 인과와 상호 의존을 구체화하고 같은 기능도 상황/조합/숙련에 따라 의미가 달라지는 플레이 사례를 비교한다. 복잡한 용어·기능 개수·끝없는 반복·수치 증가를 깊이로 대체하지 않는다. 단서는 읽을 수 있고 규칙은 일관되어야 하며 보상은 발견과 이해와 숙련에 맞게 약속된다. 지배적 단일 조합, 무한 보상 악용, 진행 막힘, 과도한 인지 부담을 기존 검증에서 확인한다.');
  if(fields.includes('implementationTraceability'))rules.push('implementationTraceability: 최소 3개 서로 다른 객체. JS String.length 기준 각 designElement/responsibleSystem은 최소 20자, validationEvidence는 최소 30자 이상으로 검증 방법까지 구체적으로 작성.');
  if(fields.includes('technicalAssumptions'))rules.push('technicalAssumptions: 서로 다른 구현 가정 최소 2개이며 각 항목은 JS String.length 기준 최소 24자 이상.');
  if(fields.includes('validationQuestions'))rules.push('validationQuestions: 서로 다른 검증 질문 최소 2개이며 각 항목은 JS String.length 기준 최소 24자 이상.');
  if(fields.includes('systemInterconnections'))rules.push('systemInterconnections: 최소 3개 서로 다른 객체. JS String.length 기준 fromSystem/toSystem은 각각 최소 16자, trigger/stateChange는 각각 최소 24자 이상으로 구체적으로 작성.');
  if(fields.includes('signatureSystems'))rules.push('signatureSystems의 id는 고정 규칙 ID다. grammarRole은 MAIN/A/B 각각 하나, c와 DELVE(@)는 하나 이상이다. 각 stateInputs/stateOutputs에 실제 상태 키를 정의한다. 감염전은 HumanCount/MonsterCount/EliminatedCount와 능력 자원을 포함한다. 맵·능력·자산·대안은 이 ID와 상태 키만 참조한다.');
  if(fields.includes('systemInterconnections'))rules.push('fromId의 stateOutputs와 toId의 stateInputs에 실제로 존재하는 같은 stateKeys를 연결한다. A/B는 양방향으로 값을 주고받고 MAIN/c/DELVE도 연결돼야 한다. fromSystem/toSystem 설명만 같은 것으로 대체하지 않는다.');
  if(fields.includes('contentVarietyPlan'))rules.push('abilities에는 현재 게임 원본에 실제로 존재하는 능력을 각각 작성한다. 다른 장르의 능력을 추가하지 않는다. id/kind/ownerId/ruleId, trigger, range/rangeUnit, resource/cost, cooldownSeconds, telegraph/avoidance/effect, stateInputs/stateOutputs/source가 필수다. 자원이나 재사용이 없으면 0과 이유를 적는다. 원본 수치가 있는 능력은 rangeKey/costKey/cooldownKey를 원본 technicalAssumptions 키에 연결한다. regions는 공통 id와 ruleIds로 뒤의 전략 비교에 사용한다.');
  if(fields.includes('contentVarietyPlan')&&playableRequirements.infection)rules.push('감염전 abilities에는 원본의 모든 인간 능력·감염 후 능력·몬스터 능력·기본 감염/정화를 각각 작성한다. roleTransitions는 원본 humanRoster 각 id마다 인간 도구와 능력→원본 이름 그대로의 감염 능력, 유지/제거 상태, 바뀌는 선택을 연결한다.');
  if(fields.includes('designAlternatives'))rules.push('strategy는 이미 작성한 구역/상태/규칙/능력 ID만 사용한다. routeEdges(from,to), resourceSites(stateKey,regionId), cooperation(ruleId,regionId,abilityId)의 관계 중 두 항목 이상이 실제로 달라야 한다. 수식어·설명·ID 이름 바꾸기는 차이로 인정하지 않는다. advantage/cost/bestSituation에 얻는 것·포기하는 것·선택 상황을 적는다.');
  if(fields.includes('selectedDesignPlan'))rules.push('before/after는 같은 key/value 상태 목록이며 앞 장면의 after와 다음 before를 동일하게 잇는다. startSeconds/endSeconds를 0부터 연속 배치하고 actions에 실제 능력 ID, actorId/targetId, 시각·거리·사용 전후 자원·성공 여부·대응을 적는다. timeReason은 장면의 실제 행동에 필요한 시간을 설명한다. 마지막 장면은 다음 라운드가 아닌 현재 한 판의 결판이다.');
  if(fields.includes('selectedDesignPlan')&&playableRequirements.infection)rules.push('participants에 시작 인원 전원의 고정 id/role/classId를 적는다. 감염되면 같은 id의 진영과 사용 능력이 바뀌고 정화되면 이후 행동할 수 없다. 각 장면의 before/after는 같은 key/value 수치 목록이다. 앞 after를 다음 before로 정확히 이어라. startSeconds/endSeconds는 0부터 연속되고 timeReason은 이동·접촉·재사용 대기 등 필요한 시간의 근거다. actions는 능력 ID, actorId/targetId, atSeconds, distance, energyBefore/energyAfter, hit, response를 기록한다. 모든 입력은 비용과 재사용 시간을 지킨다. 감염 적중은 인간 -1/몬스터 +1, 정화 적중은 몬스터 -1/탈락 +1이다. 첫 접촉에서 감염하지 않고 첫 감염 장면에서 정확히 1회 전환, 인원 불균형, 정화 역전 기회, 결판까지 작성한다. 한 진영 0명 즉시 승패 또는 원본 제한시간 무승부로 끝낸다. roundSeconds와 sessionSeconds를 구분하고 기존 제한시간은 유지한다.');
  if(fields.includes('artAudioDirection'))rules.push('assetBindings마다 필요한 family/role/bodyPlan/behavior/presentation부터 정한 뒤 사용 위치와 ruleIds, 실제 assetId, USE/ADAPT/AUTHOR, selectionReason/improvement/platformAdaptation/validation을 작성한다. 체형이 해당 없는 배경/소리도 공간 형태 또는 음색을 구체화한다. 같은 역할의 재사용 후보가 있으면 기존 자산부터 검토한다. 실제 없는 ID를 만들거나 몬스터 분류만으로 거미를 고르지 않는다. 점수는 역할 적합성 근거가 아니다. AUTHOR는 assetId를 비우고 현재 목록의 정확한 역할 공백과 필요한 제작을 적는다.');
  if(fields.includes('designIntegrityPlan'))rules.push('authoringVersion=2. flowAudit에서 한 판의 모든 phase를 같은 순서로 재생한다. 각 reachableBy는 실제 능력 ID이며 blockedCase/recovery와 nextPhase(마지막 END)를 적는다. 능력 도달·자원 부족·길 막힘·감염 전환·탈락·종료를 확인하고 미해결 모순을 true 선언으로 숨기지 않는다.');
  if(fields.includes('signatureSystems'))rules.push('시그니처의 purpose/playerChoice에 발동 조건·자원·시간·전조·상대 대응과 플레이어의 대안을 담는다. MAIN은 중심 행동, A/B는 독립된 상태를 교환하는 두 대축, c는 이들을 변주하는 보조 요소, @는 발견·숙련·재방문 깊이로 역할을 구분한다. 없는 시스템을 억지로 추가하지 않는다.');
  if(fields.includes('contentVarietyPlan'))rules.push('지역은 동선·목적·랜드마크·진입/복귀·위험 보상·재방문 이유가 달라야 한다. 적/도전은 행동 신호·조건·패턴·대응·군집 역할·보상·복구를 각각 적는다. 색상·수치·같은 설명의 반복으로 다양성을 주장하지 않는다.');
  if(fields.includes('progressionEconomyBalance')||fields.includes('failureRetryRisk'))rules.push('자원 획득원·소비처·해금이 새 행동/경로/조합으로 이어지는 흐름과 실패 때 잃는 것/보존하는 것/다음 유효 진입을 명시한다. 기존 수치·보상·저장 의미는 보존한다.');
  if(fields.includes('uxAccessibilityPlan'))rules.push('필요한 메뉴의 진입/뒤로가기·버튼 위치/역할·잠금/활성·로딩/오류·터치영역·중복입력·중단복귀를 실제 첫 입력/성공/실패/성장에 연결한다. 가독성·카메라·색상 의존·음량·입력 접근성과 모바일 성능을 다룬다.');
  if(fields.includes('artAudioDirection'))rules.push('아트/오디오는 캐릭터·배경·재질·광원·동작·효과·카메라·메뉴가 같은 세계 정체성을 유지하게 한다. 기존 자산의 용도·역할과 실제 발생 이벤트를 연결하고 스타일·라이선스·플랫폼 호환을 보존한다.');
  if(fields.includes('narrativeDialoguePlan'))rules.push('서사가 필요하면 사건 원인·선행조건·선택·결과·후속, 캐릭터 욕구/말투/관계/기억/지식범위, 복선·회수·반전을 연결한다. 불필요하면 applicable=false와 빈 배열을 사용한다. 공공영역 원형 또는 추상 기법만 재해석하며 보호된 인물·대사·장면을 복제하지 않는다.');
  if(fields.includes('designIntegrityPlan'))rules.push('이동·첫 행동·진행·선행조건·종료·복구·경제·보스 전환·멀티 입장/이탈/재입장·저장 호환·서사 인과를 실제 규칙과 대조한다. 확인 안 된 조건을 참으로 쓰지 않고 notes에 정확한 미확정 근거를 남긴다.');
  if(seedGameplaySketchVersion>=4&&seedGameplaySketch?.novelGameGrammar)rules.push('GAMEPLAY_SKETCH v4 emergent grammar: emergentGenre.name/newPrimaryVerb를 identity 또는 coreFun에 유지하고 causalDNA id 최소 2개를 referenceHomagePlan 또는 narrativeDialoguePlan에 추적 가능하게 남긴다. MAIN은 coreFun/coreLoop, A/B 두 대축은 signatureSystems/systemInterconnections에서 실제 상태 교환으로 증명한다. c는 독립 대축이 아닌 서브요소로 MAIN/A/B를 변주하고, @는 contentExpansionPlan/progressionDirection에서 숨은 조합·숙련·재방문·재해석·고급 운용으로 드러나야 한다. GAME_CATEGORY를 최종 장르로 복사하지 않는다.');
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
    planning:['identity','playerFantasy','coreFun','coreLoop','signatureSystems','progressionDirection','contentExpansionPlan','failureRetryRisk','webCanonicalDesign','platformExpansionPolicy','marketTargetDirection','multiplayerMode','multiplayerExpansionDecision','openQuestions'],
    graphics:['identity','playerFantasy','coreFun','signatureSystems','visualDirection','mobileUx','uxAccessibilityPlan','artAudioDirection','platformFitPlan','webCanonicalDesign','platformExpansionPolicy'],
    development:['coreLoop','signatureSystems','systemInterconnections','platformFitPlan','webCanonicalDesign','platformExpansionPolicy','technicalAssumptions','implementationTraceability','failureRetryRisk','multiplayerMode'],
    qa:['coreLoop','systemInterconnections','progressionEconomyBalance','failureRetryRisk','platformFitPlan','webCanonicalDesign','platformExpansionPolicy','uxAccessibilityPlan','validationQuestions','implementationTraceability','multiplayerMode'],
    audio:['identity','playerFantasy','coreFun','signatureSystems','artAudioDirection','failureRetryRisk','platformFitPlan','webCanonicalDesign','platformExpansionPolicy']
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
  if(schema.type==='number'){
    if(typeof value!=='number'||!Number.isFinite(value))throw new Error(`schema number mismatch: ${label}`);
    if(Number.isFinite(schema.minimum)&&value<schema.minimum)throw new Error(`schema minimum mismatch: ${label}`);
    if(Number.isFinite(schema.maximum)&&value>schema.maximum)throw new Error(`schema maximum mismatch: ${label}`);
  }
  if(schema.type==='boolean'&&typeof value!=='boolean')throw new Error(`schema boolean mismatch: ${label}`);
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

// 내부 디자이너 요청·실행 시간 로그
async function requestLocalDesignerRaw(prompt,{predict=1600,temperature=0.1,numCtx=8192,timeoutMs=localDesignerCallTimeoutMs,schema=null}={}){
  const body=JSON.stringify({
    model:localDesignerModel,
    prompt,
    stream:false,
    think:false,
    keep_alive:'10m',
    format:schema||'json',
    options:{
      num_predict:Math.min(8192,Math.max(512,Number(predict||1600))),
      temperature:Number.isFinite(Number(temperature))?Number(temperature):0.1,
      num_ctx:Math.min(24576,Math.max(4096,Number(numCtx||8192)))
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
    const timer=setTimeout(()=>finish(new Error(`OLLAMA_DESIGN_TIMEOUT ${timeoutMs}ms`)),Math.max(30000,Number(timeoutMs)||localDesignerCallTimeoutMs));
    const req=http.request({hostname:'127.0.0.1',port:11434,path:'/api/generate',method:'POST',headers:{'content-type':'application/json','content-length':Buffer.byteLength(body)}},res=>{
      let data='';
      res.setEncoding('utf8');
      res.on('data',chunk=>data+=chunk);
      res.on('end',()=>{
        try{
          if((res.statusCode||0)<200||(res.statusCode||0)>=300)throw new Error(`OLLAMA_DESIGN_HTTP_${res.statusCode} ${clip(data,800)}`);
          const row=JSON.parse(data);
          if(row?.error)throw new Error(`OLLAMA_DESIGN_ERROR ${clean(row.error)}`);
          if(row?.done!==true)throw new Error('OLLAMA_DESIGN_INCOMPLETE_RESPONSE');
          const raw=clean(row?.response);
          if(!raw)throw new Error('OLLAMA_DESIGN_EMPTY_RESPONSE');
          console.log(`DESIGN_LOCAL_TIMING=loadMs:${Math.round(Number(row.load_duration||0)/1e6)}|promptTokens:${Number(row.prompt_eval_count||0)}|promptMs:${Math.round(Number(row.prompt_eval_duration||0)/1e6)}|generatedTokens:${Number(row.eval_count||0)}|generationMs:${Math.round(Number(row.eval_duration||0)/1e6)}`);
          if(row.done_reason==='length')throw new Error('OLLAMA_DESIGN_OUTPUT_TRUNCATED');
          finish(null,raw);
        }catch(error){finish(error);}
      });
      res.on('error',finish);
    });
    req.on('error',finish);
    req.end(body);
  });
}
async function callLocalDesignerModel(system,user,schema,{predict=1600,temperature=0.1,repairRequired=null,numCtx=8192,recoverOversized=false,isolateFields=false}={}){
  if(!localDesignerFallbackReady)throw new Error('VIBE_LOCAL_DESIGN_FALLBACK_NOT_READY');
  const timeoutMs=localDesignerCallTimeoutMs;
  const started=Date.now();
  const prompt=`${system}\n\nDESIGN_ASSET_LIBRARY=${JSON.stringify(designAssetLibraryContext)}\n자산 목록은 사실 근거다. 게임당 설계 원본은 하나이며 플랫폼별 적용만 구분한다. 후보의 역할 적합성을 컨셉과 대조하고 기존 technicalAssumptions/implementationTraceability/artAudioDirection/platformProfiles에 재사용 ID, 개선·추가 제작 필요, 플랫폼 적응을 명시하라. 점수는 내부 평가이며 런타임 품질 통과가 아니다. USE_AS_IS도 실제 게임 검증을 뜻하지 않는다. NATIVE_REAUTHOR_BASE는 네이티브 재제작이며 바이너리 직접 재사용이 아니다. referenceOnly는 참고용이다. UNAVAILABLE은 미확인이며 자산이 없다는 뜻이 아니다. 후보 요약 밖의 호환 자산도 자격을 유지한다. 자산 사정으로 원본 게임 규칙을 바꾸지 마라.\n\n${user}\n\nLOCAL_AUTHORING_RULES=JSON_OBJECT_ONLY;DO_NOT_DECIDE_GATE_PASS_FAIL;PRESERVE_OWNER_INTENT;REPAIR_ONLY_REQUESTED_SCOPE`;
  console.log(`DESIGN_LOCAL_AUTHORING_BUDGET_MS=${timeoutMs}|predict=${predict}|context=${numCtx}|promptChars=${prompt.length}`);
  const identity=createHash('sha256').update(JSON.stringify({system,user,schema,librarySha256:designAssetLibraryContext.sha256||null,...(isolateFields?{isolateFields:true}:{})})).digest('hex');
  const fields=schema?.type==='object'?Object.keys(schema.properties||{}):[];
  const field=fields.length===1?fields[0]:null;
  const child=field?schema.properties[field]:null;
  const objectChild=child?.type==='object'&&Object.keys(child.properties||{}).length>0;
  const arrayChild=child?.type==='array'&&child.items?.type==='object'&&Number(child.minItems)>0;
  const canSplit=fields.length>1||objectChild||arrayChild;
  let directCall=true;
  try{
    let raw;
    let splitRequired=canSplit&&(isolateFields||recoverOversized||designCheckpoint.localAuthoringSplits?.[identity]===true||fields.length>6||objectChild||arrayChild);
    if(!splitRequired){
      try{
        raw=await requestLocalDesignerRaw(prompt+(isolateFields?'\n현재 한 필드의 실제 조건·행동·상태 변화·대응을 원본 규칙에 근거한 구체적인 문장으로 작성한다. 필드 이름이나 임시 식별자를 내용 대신 복사하지 않는다.': ''),{predict,temperature,numCtx,timeoutMs,schema});
      }catch(error){
        if(!/^OLLAMA_DESIGN_(?:OUTPUT_TRUNCATED|TIMEOUT(?: |$))/.test(error?.message||'')||!canSplit)throw error;
        recordModelHealth(`ollama:${localDesignerModel}`,{success:false,elapsedMs:Date.now()-started,error});
        designCheckpoint.localAuthoringSplits={...designCheckpoint.localAuthoringSplits,[identity]:true};
        persistDesignCheckpoint();
        splitRequired=true;
      }
    }
    if(splitRequired){
      directCall=false;
      // 큰 객체·대안 배열과 반복된 빈 내용을 기존 체크포인트의 작은 조각으로 복구한다.
      console.log(`DESIGN_LOCAL_SPLIT=${arrayChild?'ARRAY_ITEMS':objectChild?'NESTED_OBJECT':'FIELDS'}|fields=${fields.length}`);
      let merged={};
      if(objectChild){
        merged[field]=await runCheckpointTask('local_authoring_parts',`${identity}:${field}`,()=>callLocalDesignerModel(
          system,`${user}\nLOCAL_OUTPUT_PATH=${field}\n이번 응답은 이 경로의 객체 내용만 출력한다. 부모 키를 다시 감싸지 않는다.`,child,{predict,temperature,numCtx,isolateFields}
        ));
      }else if(arrayChild){
        const rows=[];
        for(let index=0;index<child.minItems;index++){
          const orderedKey=field==='designAlternatives'?'label':field==='playthrough'?'phase':null;
          let itemSchema=orderedKey&&child.items.properties?.[orderedKey]?.enum?.[index]
            ?{...child.items,properties:{...child.items.properties,[orderedKey]:{...child.items.properties[orderedKey],enum:[child.items.properties[orderedKey].enum[index]]}}}
            :child.items;
          // 원본 능력의 ID·수치는 생성 대상이 아니다. 현재 소스 사실을 스키마에 고정한다.
          const fact=field==='abilities'&&typeof playableRequirements!=='undefined'?playableRequirements.abilityFacts[index]:null;
          const grammarRole=field==='signatureSystems'?['MAIN','A','B','c','DELVE'][index]:null;
          const human=field==='roleTransitions'&&typeof playableRequirements!=='undefined'?playableRequirements.humanRoster[index]:null;
          const fixed=fact||grammarRole?{...(fact||{}),...(grammarRole?{grammarRole}:{})}:human?{humanId:human.id,humanTool:human.tool}:{};
          for(const [key,value] of Object.entries(fixed))if(value!==undefined&&itemSchema.properties?.[key])itemSchema={...itemSchema,properties:{...itemSchema.properties,[key]:{...itemSchema.properties[key],enum:[value]}}};
          const value=await runCheckpointTask('local_authoring_parts',`${identity}:${field}:${index}`,()=>callLocalDesignerModel(
            system,`${user}\nLOCAL_OUTPUT_PATH=${field}[${index}]\nPREVIOUS_ARRAY_ITEMS=${JSON.stringify(rows)}\n이번 응답은 이 배열 항목의 객체 하나만 출력한다. 이전 항목과 역할·접근을 구분하고 필수 설계 깊이를 유지한다.`,itemSchema,{predict,temperature,numCtx,isolateFields}
          ));
          rows.push(value);
        }
        merged[field]=rows;
      }else{
        const midpoint=Math.ceil(fields.length/2);
        for(const part of (isolateFields?fields.map(field=>[field]):[fields.slice(0,midpoint),fields.slice(midpoint)])){
          const partSchema={...schema,required:(schema.required||[]).filter(field=>part.includes(field)),properties:Object.fromEntries(part.map(field=>[field,schema.properties[field]]))};
          const value=await runCheckpointTask('local_authoring_parts',`${identity}:${part.join(',')}`,()=>callLocalDesignerModel(
            system,`${user}\nCURRENT_OBJECT_FIELDS=${JSON.stringify(merged)}\nLOCAL_REQUIRED_FIELDS=${JSON.stringify(part)}\n이전 지시의 출력 범위 대신 LOCAL_REQUIRED_FIELDS만 출력한다. 먼저 작성된 필드와 일관성을 지키고 필수 구조와 설계 깊이는 유지한다.`,
            partSchema,{predict:Math.max(512,Math.ceil(predict*part.length/fields.length)),temperature,numCtx,isolateFields}
          ));
          Object.assign(merged,value);
        }
      }
      assertSchemaValue(merged,schema);
      raw=JSON.stringify(merged);
    }
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
    if(directCall){
      recordModelHealth(`ollama:${localDesignerModel}`,{success:true,elapsedMs});
      modelCallStats.push({model:`ollama:${localDesignerModel}`,requestedModel:designerRoute.id,provider:'VIBE_LOCAL_OLLAMA',attempt:1,elapsedMs,predict,mode:'ollama-json-schema',timeoutMs,schemaRepairs:repairs.length});
    }
    designCheckpoint.lastSuccessfulModelCallAt=new Date().toISOString();
    console.log(`DESIGN_AUTHORING_PROVIDER=VIBE_LOCAL_OLLAMA|${localDesignerModel}|ms=${elapsedMs}`);
    return normalized;
  }catch(error){
    if(directCall)recordModelHealth(`ollama:${localDesignerModel}`,{success:false,elapsedMs:Date.now()-started,error});
    persistDesignCheckpoint();
    throw error;
  }
}
async function callDesignerModel(system,user,schema,options={}){
  const value=await callLocalDesignerModel(system,user,schema,options);
  designCheckpoint.effectiveDesignerModel=designerRoute.id;
  designCheckpoint.effectiveDesignerProvider='VIBE_LOCAL_OLLAMA';
  persistDesignCheckpoint();
  return value;
}

async function generateDesignerDraft(){
  const ownerBriefOnly=['OWNER_BRIEF_AND_ORIGINAL_ONLY','DESIGNER_SELF_SEED'].includes(seed.designInputMode)||seed.autoMissingDesignIntake===true;
  const original=seed.originalDesignContext?.content||{};
  const originalBrief=ownerBriefOnly?{
    instruction:seed.OWNER_LATEST_DESIGN_REQUEST,
    source:seed.DESIGN_BASELINE_SOURCE,
    originalPlatform:seed.INITIAL_TARGET_PLATFORM,
    identity:original.identity,coreFun:original.coreFun,coreLoop:original.coreLoop,
    signatureSystems:original.signatureSystems,progressionDirection:original.progressionDirection,
    technicalAssumptions:original.technicalAssumptions,
    implementationSync:original.implementationSync,
    playabilityRequirements:playableRequirements,
    platformProfile:seed.originalDesignContext?.platformProfile,
    humanRoster:original.humanRoster,monsterRoster:original.monsterRoster,
    graphicsConcept:original.graphicsConcept,mvpScope:original.mvpScope,
    visualDirection:original.visualDirection
  }:null;
  const preservationDirective=ownerPreservationDesign?' 이 seed는 기존 게임 보존형 표현 업그레이드다. 기존 세계관·지역·스토리·퀘스트·전투·제작·진행·밸런스·드랍·세이브·hit/cooldown 의미를 절대 재설계하지 않는다. 새 스킬·게이지·패널티·보상·자원·해금 규칙을 추가하지 않고 ASSET_ADAPTATION→LIVING_MOTION→ANIMATION_FEEL→VFX→AUDIO_FEEL→CAMERA_LANGUAGE→POLISH_MOBILE 표현 패스만 설계한다.':'';
  const system=`너는 시드부터 상세 설계까지 직접 작성하는 단일 Game Designer AI다. 외부에서 완성된 시드를 요구하지 않는다. 첫 identity-core 작성에서 사용자 요청·원본·참고 재료로 게임의 씨앗인 정체성·플레이어 판타지·핵심 재미·핵심 루프·MAIN/A/B/c/@와 상태 변화를 직접 생성한다. 이 결과가 design-seed.json이며 뒤의 상세 설계는 같은 시드를 확장한다. 접수용 자동 스케치는 창작 시드가 아니다. 기존 게임 원본과 오너 의도를 최우선으로 보존하고 요청된 설계 필드만 구체적으로 작성한다. 한 게임의 공통 원본은 하나이며 플랫폼별로 입력·성능·연출·배포/검증만 네이티브에 맞게 적용한다. 중심 행동 MAIN, 두 대축 A/B의 상태 교환, 보조 요소 c, 발견·숙련·재방문 @를 구분한다. CORE_RULE_ANCHORS/SHARED_RULE_ANCHORS와 현재 STRUCTURE_CONTRACT를 따라 입력→조건/판정→상태 변화→위험/보상→대응→다음 선택을 작성한다. 일반적인 기능 목록·장식 세계관·임시 표식·반복 문장으로 설계하지 않는다. 지역·적·아이템·퀘스트·메뉴는 해당 장르에 필요한 것만 실제 역할과 상태로 연결한다. 실패·중단·재접속·저장은 원본 의미를 보존한다. 구현 버그와 설계 모순의 원인·수정 책임을 구분하고 안정성을 먼저 다룬다. 같은 증상을 설계와 구현이 독립적으로 중복 수정하지 않는다. 최소 두 실제 대안을 비교하고 선택안을 한 판의 시작·전개·결말로 재생한다. 한 판과 전체 세션 시간을 구분하며 검증되지 않은 시간·품질·실행 결과를 확정하지 않는다. 공공영역 고전의 원형은 게임에 맞게 재해석하고 현대 보호 작품은 추상적 기법만 참고한다. 보호된 인물·대사·장면은 복제하지 않는다. 설계 수정은 기존 검증·보안·저장·네트워크 권한을 바꾸지 않는다. 점수와 통과 판정은 결정론적 검증기가 담당한다.${preservationDirective}${ownerBriefOnly?' 호환용 자동 스케치는 설계 원본이 아니다. 사용자 요청과 기존 플랫폼 원본을 입력으로 A/B/c/@ 및 상세 설계를 직접 작성한다.':''}`;
  const user=`DESIGN_ONLY 상세 설계를 한 번에 완성하라. STABILIZE→UNDERSTAND→OBSERVE→DIAGNOSE→PRIORITIZE→BLUEPRINT→PROPOSE→COMPARE→REVISE→VALIDATE→LEARN→REPLAN→EXPAND 순서를 따른다. 정체성·핵심 재미·core loop·signature systems·시스템 연결·진행/경제·콘텐츠 확장·실패/재시도·플랫폼 적합성·UX/접근성·아트/오디오·구현 추적성을 서로 연결한다. 모든 장르에서 identity는 '무슨 게임인지'와 '같은 장르와 뭐가 다른지'가 한 번에 읽혀야 한다. playerFantasy는 플레이어의 역할과 책임을 구체화하고, coreFun/coreLoop는 representativeAction과 representativeChoice가 반복해서 실제 상태 변화를 만드는 구조여야 한다. signatureSystems는 일반적인 메뉴 기능이 아니라 제목을 가려도 이 게임을 알아볼 정도의 시그니처 약속을 1~2개 이상 핵심에 두고, systemInterconnections는 그 시그니처 규칙이 다른 시스템과 실제 상태를 주고받게 한다. progressionDirection은 레벨·공격력 상승 설명으로 끝내지 말고 성장 후 새 행동·경로·조합·관계·발견·대응법 중 무엇이 가능해지는지 적는다. visualDirection과 artAudioDirection은 세계 문화·지역·적·아이템·NPC·UI·사운드가 같은 정체성 논리를 공유하게 한다. 설계를 읽고 3문장으로 '이건 무슨 게임인가 / 같은 장르와 무엇이 다른가 / 성장하면 무엇을 새로 할 수 있나'가 서로 다른 답으로 즉시 나와야 한다. 이 기준은 퍼즐·레이싱·타이쿤·디펜스·생존·액션·RPG·카드·보드·전략·캐주얼 등 모든 장르에 적용하되 장르에 맞지 않는 RPG식 시스템을 억지로 추가하지 않는다. v4 novelGameGrammar가 있으면 단순히 '독특한 세계관'을 설명하지 말고 새로운 게임문법을 실제 플레이에 보존한다. causalDNA는 장식 키워드가 아니라 원인→선택→대가→다음 상태의 법칙이어야 하고, 한 축을 제거하면 평범한 장르로 돌아가는지 irreducibilityTest를 설계 전반에서 검증한다. 익숙한 인간 감정과 갈등은 공감의 발판으로 남기고, 캐릭터·몬스터·지역·스토리·아이템은 같은 인과법칙을 각기 다른 방식으로 보여준다. gameplaySystemFusion은 MAIN × A × B × c를 보존한다. A/B만 대축이고 c는 서브요소 묶음이다. @는 파고들기 층이라 c나 세 번째 대축으로 취급하지 않는다. 철학·종교·신화·역사·정치·비극·희극·해학·엽기·코믹은 모두 동등한 재료이며 게임 톤과 규모에 맞게 자유롭게 융합한다. 최종 장르 설명은 seed의 GAME_CATEGORY를 반복하지 말고 emergentGenre를 정체성에 반영한다. designAlternatives에는 최소 PLAN_A와 PLAN_B를 실제로 다른 접근으로 작성하고 각 안마다 컨셉/플레이어 판타지·핵심루프/세션리듬·맵 토폴로지/지역역할·랜드마크/이동·적 생태계/대응법·보스/시그니처 순간·성장/경제·퀘스트/스토리/이벤트·실패/재시도/복구·플랫폼 적응·구현범위·검증계획을 빠짐없이 구체화한다. selectedDesignPlan에서 선택 이유·정체성 보존·창작적 일탈·장르변경 여부·되돌림 가능성을 설명한다. contentVarietyPlan에서 맵/지역·적/도전·목표가 같은 템플릿 반복이 되지 않게 역할 차이를 설계한다. narrativeDialoguePlan은 해당 게임에서 스토리/대화가 필요하면 캐릭터별 말투와 장면·복선·회수·반전을 구체화하고 필요 없으면 applicable=false와 빈 배열을 사용한다. referenceHomagePlan은 공공영역 또는 추상기법/독자창작만 사용하고 그대로 베끼지 않는다. designIntegrityPlan은 이동·첫 행동·진행·퀘스트 선행조건·종료·회복·맵 목표·경제·대응법·보스 페이즈 전환·멀티 입장/이탈/재입장/동기화·세이브/마이그레이션·서사 인물지식/인과/복선회수 일관성을 실제 규칙 기준으로 검사하며 불확실한 걸 거짓 PASS로 쓰지 않는다. stabilityPriorityPlan은 알려진 증상을 구현/설계/혼합/미확정으로 분류한다. webCanonicalDesign은 기존 Roblox 상세 설계 수준으로 WEB 자체를 상세하게 설계하는 게임 원본이다. 단, 소스코드 authority가 아니라 게임 설계 reference이며 Unity WebGL의 canonical source는 기존 중앙정책대로 같은 Unity 프로젝트를 유지한다. WEB 원본에는 실제 1분·5분·15분 플레이를 상상할 수 있게 플레이 흐름·월드/이동·시스템/콘텐츠·전투/상호작용·진행/경제·실패/복구·UI/메뉴/온보딩·입력/카메라/접근성·연출/오디오·멀티/저장·향후 확장을 구체적인 상태 전이와 플레이 사례로 적는다. platformExpansionPolicy는 플랫폼 간 세부 parity를 요구하지 않는다. 공통으로 유지할 것은 CORE_IDENTITY, CORE_FUN_AND_REPRESENTATIVE_LOOP, WORLD_AND_PROGRESSION_DIRECTION, SAVE_PERSISTENCE_MEANING, MULTIPLAYER_INTENT의 큰틀뿐이며, 그 안에서 WEB·Unity·Roblox 각각 플랫폼 네이티브 시스템·콘텐츠·지역·세션·UX·연출을 자유롭게 응용·확장할 수 있다. 기존 platformProfiles.ROBLOX와 robloxBuildProfile은 이 WEB/Unity 요구 때문에 다시 쓰거나 축소하지 않는다. UNITY platformProfiles는 네이티브와 별개 게임을 설계하지 말고 같은 canonical Unity 프로젝트가 Unity Web/WebGL 검증 표면에서도 동작하도록 터치 입력·모바일 UI·브라우저 성능·WebGL 호환성을 포함한다. Unity Web은 릴리스 플랫폼이나 별도 게임 규칙이 아니며 핵심 규칙·밸런스를 바꾸지 않는다. SINGLE/COOP/COMPETITIVE/HYBRID 중 하나를 multiplayerMode에 반드시 명시한다. 이전 Strict 실패는 삭제하지 말고 실제 설계로 해결한다. scorer 최소치에 딱 맞추지 말고 구조·문자 길이에 충분한 안전여유를 둔다. 초기 설계는 압축 요약보다 구체적 상태 전이와 플레이 사례를 우선한다. MAIN은 입력→즉시 피드백→상태 변화→위험/보상→다음 선택까지 한 사이클을 실제 플레이 기준으로 적고, A와 B는 각각 독립된 대축의 상태·자원·선택·실패조건·성장효과를 구분한 뒤 서로 어떤 값을 주고받는지 명시한다. c는 최소 3개 이상의 서브요소가 MAIN/A/B 결과를 어떻게 변주하는지 원인→선택→대가 단위로 적고 대축처럼 독립 진행시키지 않는다. @는 해금 조건·발견 단서·숙련 보상·재방문 가치·고급 조합을 구체화하되 일반 시스템 축으로 승격하지 않는다. 지역·맵·적·보스·아이템·퀘스트·이벤트는 이름 나열로 끝내지 말고 역할, 플레이어가 읽는 신호, 요구 선택, 상태 입력/출력, 카운터플레이, 보상, 실패/복구, 다음 시스템 연결을 적는다. 진행/경제는 획득원·소비처·해금·새 행동·새 경로·빌드 분화가 어떻게 연결되는지, 실패 후 무엇을 잃고 무엇을 보존하는지까지 적는다. 플랫폼 설계는 PC 설명을 모바일로 복사하지 말고 터치 조작·UI 밀도·가독성·카메라·세션 중단/복귀를 실제 흐름에 연결한다. designAlternatives의 PLAN_A/PLAN_B도 각각 MAIN/A/B/c/@가 어떻게 달라지는지 비교 가능하게 작성하고 selectedDesignPlan은 선택안의 실제 플레이 5분·15분·30분 흐름을 설명한다. 반복 문장이나 장식적 세계관으로 분량을 채우지 말고 구현 가능한 규칙과 상태 연결에 분량을 사용한다. 메뉴와 UI도 게임 규칙의 일부로 설계한다. 시작 화면·메인 메뉴·계속하기/새 게임·세이브/로드·설정·일시정지·HUD·인벤토리·장비·상점·퀘스트 로그·지도·제작·사망/재시도·결과 화면·멀티 로비/매칭은 해당 게임에 필요한 것만 선택하되, 각 화면의 진입 조건·나가기/뒤로가기·핵심 정보 우선순위·버튼 이름/위치/역할·활성/비활성/잠금·확인/취소·로딩/오류·터치 영역·키보드/패드/모바일 조작·중복 클릭 방지·진행 막힘 방지를 구체화한다. 튜토리얼/온보딩은 첫 입력, 첫 성공, 첫 실패, 첫 성장, 첫 메뉴 사용을 실제 1분·5분·15분 흐름에 배치한다. 전투/주요 상호작용은 입력, 선행조건, 판정, 자원 소모, 쿨다운, 적 반응, 피격/회피/상태효과, 사망/복구, 카메라/VFX/SFX 피드백까지 연결하고 적은 역할·행동 신호·공격 패턴·카운터·군집 관계·스폰/리젠·지역 역할을 구분한다. 보스는 진입 조건·페이즈·패턴 전환 조건·전조·대응법·실패 학습·승리 후 세계/진행 변화까지 설계한다. 월드/맵은 지역별 목적·동선·랜드마크·접근 조건·빠른 이동/복귀·위험 보상·수직/수평 탐색·밀도·비밀·재방문 이유를 적고 단순 크기 확장으로 대신하지 않는다. 인벤토리/장비/제작/상점/경제는 획득원·소비처·소지 제한·정렬/필터·장착 교체·제작 조건·가격/보상 의미·희귀도·중복 처리·손실/복구·세이브 의미까지 연결한다. 스토리와 퀘스트가 중요한 게임은 메인/사이드/동료/세력/지역/숨김/월드 이벤트 중 필요한 유형을 사용하고 각 퀘스트에 발생 원인·선행조건·목표·플레이어 선택·상태 변화·결과·보상 의미·후속 또는 종료를 명시하며 단순 처치/수집 복제를 금지한다. NPC/동료/세력은 욕구·목표·갈등·관계·기억·지식범위·말투·행동 의도와 플레이어 행동에 따른 변화가 퀘스트와 세계 상태에 이어지게 한다. 저장/복구는 저장 시점·저장 대상·중단/재접속·체크포인트·죽음·롤백·마이그레이션·멀티 재입장 의미를 설계하고 기존 저장 의미를 깨지 않는다. 접근성/설정은 글자 크기·대비·진동·음량 분리·카메라 민감도·조작 재매핑 가능성·색상 의존 회피·모바일 가독성을 게임에 맞게 다룬다. 성능 설계는 화면 내 적/이펙트/UI/오브젝트 밀도와 스트리밍·풀링·LOD 또는 플랫폼 대체 전략을 플레이 품질과 함께 잡는다. contentExpansionPlan은 한 번의 완성 목록이 아니라 검증 회차가 반복될수록 현재 소스와 이전 검증 결과에서 다음 부족분을 골라 실제 코드와 플레이 콘텐츠를 연결 확장하는 순서를 적는다. 각 확장 단계는 현재 기준선·추가되는 플레이어 행동/지역/적/보스/아이템/퀘스트/스토리/메뉴·재사용할 기존 시스템·수정 책임·선행조건·세이브/밸런스 호환·런타임 확인 방법을 포함하고, 단순 수치 증가나 기능 개수 늘리기를 진화로 간주하지 않는다. 초기 완성 후에도 MAIN/A/B 관계를 깊게 하고 새 c 변주와 @ 파고들기, 중후반 콘텐츠·재방문·리플레이·스토리/퀘스트 후속을 기존 정체성 안에서 단계적으로 늘릴 수 있게 설계한다.\nPRE_GATE_STRUCTURE_CONTRACT=${JSON.stringify(repairStructureContract(DESIGN.required))}\nSTRICT_GATE_FEEDBACK=${clip(strictDesignerFeedback,6500)}\nGAME_SEED_DESIGN_DEPTH=${clip(seedDesignDepthContext,16000)}\nEVIDENCE=${clip(evidence,15000)}`;
  return await authorDesignInCheckpointedSlices({
    phase:'designer_draft',
    system,
    sharedContext:`${ownerBriefOnly?'OWNER_ORIGINAL_DESIGN_INPUT='+clip(originalBrief,9000)+'\n':''}STRICT_GATE_FEEDBACK=${clip(strictDesignerFeedback,6500)}\nDESIGN_EVOLUTION_BRIEF=${clip(designEvolutionBrief,6500)}\nEVIDENCE=${clip(evidence,6500)}\nFULL_DESIGN_DIRECTION=${clip(user,7000)}`
  });
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
persistDesignerSeed(designDraft,'designer_draft');
persistDesignCheckpoint();
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
    `현재 실패축만 수정하라. 지정 필드 외 내용은 반환하지 않는다. 각 필드는 REPAIR_PACKET의 requiredAction을 실제 구현 가능한 구체적 설계로 만족시켜야 한다. 아래 STRUCTURE_CONTRACT는 scorer가 직접 검사하는 최소 구조이며 축소하거나 형식적으로 채우면 안 된다.\nREPAIR_FIELDS=${JSON.stringify(fields)}\nSTRUCTURE_CONTRACT=${JSON.stringify(repairStructureContract(fields))}\nREPAIR_PACKET=${clip(packet,6500)}\nGAME_SEED_DESIGN_DEPTH=${clip(seedDesignDepthContext,9000)}\nGAME_SEED=${clip(seed,4500)}\nCURRENT_DESIGN=${clip(Object.fromEntries(fields.map(field=>[field,designDraft[field]])),8000)}`,
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
const designSemanticText=JSON.stringify({
  identity:designDraft.identity,playerFantasy:designDraft.playerFantasy,coreFun:designDraft.coreFun,
  coreLoop:designDraft.coreLoop,signatureSystems:designDraft.signatureSystems,contentExpansionPlan:designDraft.contentExpansionPlan
}).toLowerCase();
const mapVarietyRequired=/(explor|map|world|region|travel|travers|dungeon|forest|island|village|탐험|맵|월드|지역|이동|던전|숲|섬|마을)/i.test(designSemanticText);
const enemyVarietyRequired=/(combat|enemy|monster|boss|fight|wave|defense|전투|적|몬스터|보스|웨이브|디펜스)/i.test(designSemanticText);
const objectiveVarietyRequired=/(quest|objective|mission|progress|unlock|퀘스트|목표|미션|진행|해금)/i.test(designSemanticText);
const narrativeSemanticRequired=/(story|narrative|quest|dialogue|character|npc|world.?building|스토리|서사|퀘스트|대화|대사|캐릭터|npc|세계관|복선|반전)/i.test(designSemanticText);
const dialogueSemanticRequired=/(dialogue|character|npc|conversation|대화|대사|캐릭터|npc)/i.test(designSemanticText);
const intelligenceTask={
  id:`design-cycle:${gameId}:${date}`,
  gameId,type:'design',goal:clean(designDraft.identity),designChange:true,materialDesignChange:true,
  designRationale:clean(designDraft.selectedDesignPlan?.rationale),
  designAlternatives:Array.isArray(designDraft.designAlternatives)?designDraft.designAlternatives:[],
  selectedDesignPlan:clean(designDraft.selectedDesignPlan?.label),
  selectedDesignRationale:clean(designDraft.selectedDesignPlan?.rationale),
  designBlueprint:{
    alternatives:Array.isArray(designDraft.designAlternatives)?designDraft.designAlternatives:[],
    selectedPlan:clean(designDraft.selectedDesignPlan?.label),
    selectedRationale:clean(designDraft.selectedDesignPlan?.rationale),
    identityAnchors:designEvolutionBrief.identityAnchors
  },
  stabilitySignals:Array.isArray(designDraft.stabilityPriorityPlan?.signals)?designDraft.stabilityPriorityPlan.signals:[],
  contentDiversity:{
    regions:Array.isArray(designDraft.contentVarietyPlan?.regions)?designDraft.contentVarietyPlan.regions:[],
    enemies:Array.isArray(designDraft.contentVarietyPlan?.enemiesOrChallenges)?designDraft.contentVarietyPlan.enemiesOrChallenges:[],
    objectives:Array.isArray(designDraft.contentVarietyPlan?.objectives)?designDraft.contentVarietyPlan.objectives:[]
  },
  mapVarietyRequired,enemyVarietyRequired,objectiveVarietyRequired,
  referenceHomage:designDraft.referenceHomagePlan||{},
  designIntegrity:designDraft.designIntegrityPlan||{},
  narrative:(designDraft.narrativeDialoguePlan?.applicable===true||narrativeSemanticRequired)?designDraft.narrativeDialoguePlan:undefined,
  narrativeRequired:designDraft.narrativeDialoguePlan?.applicable===true||narrativeSemanticRequired,
  dialogueRequired:dialogueSemanticRequired,
  acceptanceCriteria:Array.isArray(designDraft.validationQuestions)?designDraft.validationQuestions:[],
  responsibleFiles:Array.isArray(designDraft.implementationTraceability)?designDraft.implementationTraceability.map(row=>clean(row?.responsibleSystem)).filter(Boolean):[],
  authorityExpanded:false
};
const designIntelligence=buildVibeDesignIntelligence({task:intelligenceTask,plan:{target:clean(seed.INITIAL_TARGET_PLATFORM)},experience:{records:designLearningContext.recent}});
writeJson(path.join(base,'design-intelligence.json'),{version:2,gameId,date,source:'tools/vibe2-design-intelligence.mjs',brief:designEvolutionBrief,assetLibraryContext:designAssetLibraryContext,report:designIntelligence});
if(!designIntelligence.implementationGate.allowed){
  designCheckpoint.status='DESIGN_INTELLIGENCE_BLOCKED';
  designCheckpoint.lastError=`DESIGN_INTELLIGENCE_BLOCKED ${designIntelligence.implementationGate.blockers.join(',')}`;
  persistDesignCheckpoint();
  throw new Error(designCheckpoint.lastError);
}
persistDesignerSeed(designDraft,'designer_draft');
writeJson(path.join(base,'design-draft.json'),{version:5,gameId,date,productionClass:'DESIGN_ONLY',tierAlias:3,tier:3,gameSeedId:seed.seedId,gameSeedSource:designerSeedPath,gameSeedInputSource:'game-seed-state.json',gameplaySketchVersion:seedGameplaySketchVersion,gameplaySketch:seedGameplaySketch,ownerDesignEventId:designEvolutionBrief.ownerIntent.eventId||null,designEvolutionLoopVersion:1,authorRole:'GAME_DESIGNER_AI',authorModel:designCheckpoint.effectiveDesignerModel||activeDesignerRoute.id,singleAuthor:true,preGate:{pass:preGatePass(preGate),totalScore:preGate.totalScore,hardFailures:preGate.hardFailures,criticalAxisFailures:preGate.criticalAxisFailures,attempts:preGateHistory.length-1},content:designDraft});
// 초안 점수는 수정 근거다. 작성 완료 후보를 막는 별도 사전 통과 게이트는 없다.
writeProgress('DEPARTMENT_REVIEWS',{preGateScore:preGate.totalScore,preGatePass:preGatePass(preGate),preGateAdmissionRequired:false});
console.log(`DESIGN_PRE_GATE=REMOVED|score=${preGate.totalScore}|finalReview=REQUIRED`);


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
persistDesignerSeed(revisedDesign,'designer_revision');
persistDesignCheckpoint();
const postRevisionPreGate=deterministicPreGate(revisedDesign);
writeJson(path.join(base,'design-revised.json'),{
  version:6,gameId,date,productionClass:'DESIGN_ONLY',tierAlias:3,tier:3,
  gameSeedId:seed.seedId,gameSeedSource:designerSeedPath,gameSeedInputSource:'game-seed-state.json',gameplaySketchVersion:seedGameplaySketchVersion,gameplaySketch:seedGameplaySketch,ownerDesignEventId:designEvolutionBrief.ownerIntent.eventId||null,designEvolutionLoopVersion:1,authorRole:'GAME_DESIGNER_AI',authorModel:designCheckpoint.effectiveDesignerModel||activeDesignerRoute.id,
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
  gameSeed:{seedId:seed.seedId,category:seed.GAME_CATEGORY,source:designerSeedPath,inputSource:'game-seed-state.json',authorRole:'GAME_DESIGNER_AI',complete:true,gameplaySketchVersion:seedGameplaySketchVersion,advancedDesignDepth:advancedSeedDesignDepth},
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
console.log(`AI_PROVIDER=${designCheckpoint.effectiveDesignerProvider||'VIBE_LOCAL_OLLAMA'}`);
console.log('DESIGN_GATE_PROVIDER=DETERMINISTIC_EVIDENCE_ENGINE');



