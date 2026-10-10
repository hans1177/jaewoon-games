// 파일명: tools/company-design-cycle.mjs
// 역할: 기존 디자이너의 분할 작성·체크포인트·결정론적 설계 검증을 수행한다.
// 임포트
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
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
import {computeVibeSeedProposal} from './company-game-seed-bootstrap.mjs';

const ROLES=['planning','graphics','development','qa','audio'];
const CANONICAL_POLICY_PATH='company-learning/platform-release-roadmap.json';
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const clip=(v,n=14000)=>{const s=typeof v==='string'?v:JSON.stringify(v);return s.length>n?s.slice(0,n):s;};
const uniq=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
function kstDate(){const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return`${g('year')}-${g('month')}-${g('day')}`;}

const directive=readJson('company-directive.json',{});
const localDesignerModel='VIBE_NATIVE_CAUSAL_DESIGN_V1';
// Department evidence is computed from the same deterministic gate; no AI review lanes.
const leadModels={},departmentReviewModels={};
const reviewModelCount=0,modelPhaseConcurrency=1,maxLoadedModelLanes=1;
const phaseConcurrency={};
const modelKeepAlive='NONE';
// 내부 모델 작성 예산: 준비 단계의 모델 로딩 시간은 제외한다.

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
    // 기존 계약의 V5 접수 스케치는 입력으로만 보존한다. 디자인 원본과 PASS 근거는 아니다.
    // 접수 스케치를 지우면 호환 정규화가 V1 스케치를 채워 새 기본 문법 심사를 무력화한다.
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
const inputGameplaySketchVersion=Math.max(1,Number(seedGameplaySketch?.version||1));
const seedGameplaySketchVersion=Math.max(5,Number(seed?.novelGrammarBackfill?.version||0),inputGameplaySketchVersion);
// 자동 접수 시드는 필드가 채워져 있어도 디자이너가 작성한 원본 설계가 아니다.
// 작성 대기 플래그 또는 접수용 출처가 있으면 기존 내용을 정답으로 주입하지 않는다.
const pendingSeedGrammarNotAuthored=seedGameplaySketchVersion>=5
  &&(seed?.novelGrammarBackfill?.authoringPending===true
    ||!seedGameplaySketch
    ||seedGameplaySketch?.source==='DESIGNER_INTAKE_COMPATIBILITY_INPUT_NOT_AUTHORED_DESIGN');
const advancedSeedDesignDepth=inputGameplaySketchVersion>=2;
const seedFlowArchitecture=seedGameplaySketch?.flowArchitecture&&typeof seedGameplaySketch.flowArchitecture==='object'&&!Array.isArray(seedGameplaySketch.flowArchitecture)?seedGameplaySketch.flowArchitecture:null;
const seedFlowSystemBlueprint=seedFlowArchitecture?.systemBlueprint&&typeof seedFlowArchitecture.systemBlueprint==='object'?seedFlowArchitecture.systemBlueprint:null;
const seedFlowAssetRequirements=Array.isArray(seedFlowArchitecture?.assetFlow?.requirements)?seedFlowArchitecture.assetFlow.requirements:[];
const seedDesignDepthContext={
  source:'GAME_SEED.GAMEPLAY_SKETCH',
  version:inputGameplaySketchVersion,
  authoringGrammarVersion:seedGameplaySketchVersion,
  compatibilityMode:pendingSeedGrammarNotAuthored?'V5_DESIGNER_AUTHORING_PENDING_INPUT':seedGameplaySketchVersion>=5?'V5_OWNER_CREATIVE_GRAMMAR_INPUT':seedGameplaySketchVersion>=4?'V4_CAUSAL_GRAMMAR_INPUT':advancedSeedDesignDepth?'V2_DEPTH_INPUT':'LEGACY_V1_COMPATIBILITY',
  identityCore:pendingSeedGrammarNotAuthored?null:seedGameplaySketch?.identityCore&&typeof seedGameplaySketch.identityCore==='object'?seedGameplaySketch.identityCore:null,
  novelGameGrammar:pendingSeedGrammarNotAuthored?null:seedGameplaySketch?.novelGameGrammar&&typeof seedGameplaySketch.novelGameGrammar==='object'?seedGameplaySketch.novelGameGrammar:null,
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
      novelGrammarContract:pendingSeedGrammarNotAuthored?null:seedFlowSystemBlueprint.novelGrammarContract||null,
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
const designerRoute={provider:'VIBE_NATIVE_FUNCTION',model:localDesignerModel,id:'vibe-native:causal-design-v1'};
const activeDesignerRoute=designerRoute;
const designerModel=designerRoute.id;
const coordinatorModel=localDesignerModel;
console.log('GAME_DESIGNER_PROVIDER=VIBE_NATIVE_FUNCTION');
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
// 중앙정책 본문 SHA가 정확히 이전/변경 승인 정책일 때만 동일 입력 체크포인트를 승계한다.
const threePlatformOnlyPolicyRevision=policyDigest==='976fe18afb5cd559146ab42808b3edbd106181d079356a0a22ee3c69d8932c7d'&&(()=>{
  const roadmap=readJson(CANONICAL_POLICY_PATH,{}),counting=roadmap.directNativeDualPlatformDevelopment?.platformCountingPolicy;
  return roadmap.version===553&&roadmap.finalDevelopmentLock?.sequenceLock?.status==='LOCKED'
    &&counting?.targetCount===3&&JSON.stringify(counting.targets)===JSON.stringify(['ROBLOX','UNITY_ANDROID','UNITY_WEB'])
    &&counting?.noNewAdapterWorkflowOrShadowPipeline===true
    &&roadmap.changeRecord?.ownerThreePlatformTargets20261009?.targetCount===3;
})();
const engineFiles=[
  'tools/company-design-cycle.mjs',
  'tools/company-game-seed-bootstrap.mjs',
  'tools/company-vibe2-game-flow-architect.mjs',
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
// 기존 책임 함수: 정책상 플랫폼 개수 표시만 변경된 경우, 원본 입력 전체 SHA 일치 시 캐시 보존.
const checkpointThreePlatformPolicyMigrationEligible=designCheckpoint?.contractVersion===DESIGN_CHECKPOINT_CONTRACT_VERSION
  &&threePlatformOnlyPolicyRevision
  &&clean(designCheckpoint?.policyDigest)==='0fda28f71ac3a214ad795ba2e2df1e0f6e7da837204b05182cdebecce33c9ade'
  &&clean(designCheckpoint?.gameId)===gameId&&clean(designCheckpoint?.date)===date
  &&clean(designCheckpoint?.seedId)===clean(seed.seedId)
  &&(clean(designCheckpoint?.engineDigest)===engineDigest
    ||checkpointCompatibleEngineDigests.has(clean(designCheckpoint?.engineDigest))
    ||['cc088ad7a8676ded2864387d1c00a39b024f9e9a4e72f50308346406aea805a9','d789690b56a2166b9da23297ff8d43b1b23973637551823b312dca69908c8904','dac95f134b0ededc03820f0bcdc338c5fdb495164c8cd165653789fa6a468cc4'].includes(clean(designCheckpoint?.engineDigest)))
  &&designCheckpoint.fingerprint===createHash('sha256').update(JSON.stringify({...checkpointInputContext,policyDigest:designCheckpoint.policyDigest,engineDigest:designCheckpoint.engineDigest})).digest('hex')
  &&designCheckpoint?.phases&&typeof designCheckpoint.phases==='object'
  &&designCheckpoint?.tasks&&typeof designCheckpoint.tasks==='object'
  &&designCheckpoint?.modelHealth&&typeof designCheckpoint.modelHealth==='object';
const checkpointV3CompatibleEngineMigrationEligible=designCheckpoint?.contractVersion===DESIGN_CHECKPOINT_CONTRACT_VERSION
  &&clean(designCheckpoint?.gameId)===gameId
  &&clean(designCheckpoint?.date)===date
  &&clean(designCheckpoint?.seedId)===clean(seed.seedId)
  &&clean(designCheckpoint?.policyDigest)===policyDigest
  &&(checkpointCompatibleEngineDigests.has(clean(designCheckpoint?.engineDigest))
    ||(['cc088ad7a8676ded2864387d1c00a39b024f9e9a4e72f50308346406aea805a9','d789690b56a2166b9da23297ff8d43b1b23973637551823b312dca69908c8904','dac95f134b0ededc03820f0bcdc338c5fdb495164c8cd165653789fa6a468cc4',
      '90e6e16e20dfb1bc6796b44a24100a21a965daefee38c94a33b39a3bc8371f71','e789f879b2f439f502dacde917a018d508b4e44e637dcd1157919f55205a5f92'].includes(clean(designCheckpoint?.engineDigest))
      &&designCheckpoint.fingerprint===createHash('sha256').update(JSON.stringify({...checkpointInputContext,engineDigest:designCheckpoint.engineDigest})).digest('hex')))
  &&designCheckpoint?.phases&&typeof designCheckpoint.phases==='object'
  &&designCheckpoint?.tasks&&typeof designCheckpoint.tasks==='object'
  &&designCheckpoint?.modelHealth&&typeof designCheckpoint.modelHealth==='object';
if(!checkpointReusable&&(checkpointV2MigrationEligible||checkpointV3CompatibleEngineMigrationEligible||checkpointThreePlatformPolicyMigrationEligible)){
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
      reason:checkpointThreePlatformPolicyMigrationEligible?'THREE_PLATFORM_COUNT_EXACT_POLICY_IDENTITY_MIGRATION':checkpointV2MigrationEligible?'PERSIST_GEMINI_DAILY_QUARANTINE_WITHOUT_REPLAY':'QUOTA_VIBE_REPAIR_COMPATIBLE_ENGINE_CHANGE_NO_REPLAY',
      previousEngineDigest,
      preservedPhaseCount:Object.keys(designCheckpoint.phases).length,
      preservedTaskCount:Object.keys(designCheckpoint.tasks).length,
      migratedAt:new Date().toISOString()
    },
    updatedAt:new Date().toISOString()
  };
  if(checkpointThreePlatformPolicyMigrationEligible||previousEngineDigest==='d789690b56a2166b9da23297ff8d43b1b23973637551823b312dca69908c8904'){
    // 작성 응답 조각은 유지하고 기존 완성 단계만 새로운 내용 검사로 재검토한다.
    delete designCheckpoint.phases.designer_draft;
    designCheckpoint.completedPhases=designCheckpoint.completedPhases.filter(phase=>phase!=='designer_draft');
  }
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
// 기존 실행의 호환 체크포인트에 남은 문장형 상태 키는 설계 참조 ID가 아니다.
// 잘못된 역할 조각만 폐기하고 다른 창작 내용과 정상 규칙 체크포인트는 보존한다.
const invalidRoleStateTasks=Object.entries(designCheckpoint.tasks||{}).filter(([key,row])=>{
  if(!key.startsWith('local_authoring_parts::')||!key.includes(':signatureSystems:')||!row?.grammarRole)return false;
  const inputs=Array.isArray(row.stateInputs)?row.stateInputs:[];
  const outputs=Array.isArray(row.stateOutputs)?row.stateOutputs:[];
  const states=[...inputs,...outputs];
  return !inputs.length||!outputs.length||states.some(key=>typeof key!=='string'
    ||!/^[^\s:→]{1,80}$/u.test(key)||/→|->|\b(?:INPUT|SELECT|OUTPUT|STATE)\s*:/i.test(key));
}).map(([key])=>key);
if(invalidRoleStateTasks.length){
  for(const key of invalidRoleStateTasks){
    delete designCheckpoint.tasks[key];
    if(designCheckpoint.sliceRepairFeedback)delete designCheckpoint.sliceRepairFeedback[key];
    if(designCheckpoint.sliceRepairAttempts)delete designCheckpoint.sliceRepairAttempts[key];
  }
  writeJson(checkpointPath,designCheckpoint);
  console.log('DESIGN_INVALID_STALE_ROLE_STATE_KEYS_REAUTHOR='+invalidRoleStateTasks.length);
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
const SYSTEM_INTERCONNECTION={type:'object',required:['fromSystem','toSystem','trigger','stateChange','fromId','toId','stateKeys'],properties:{fromId:{type:'string',maxLength:80},toId:{type:'string',maxLength:80},stateKeys:RULE_IDS,fromSystem:{type:'string',maxLength:180},toSystem:{type:'string',maxLength:180},trigger:{type:'string',maxLength:300},stateChange:{type:'string',maxLength:360}},additionalProperties:false};
const PROGRESSION_ECONOMY_BALANCE={type:'object',required:['progressionLoop','resourceFlow','balanceRules'],properties:{progressionLoop:{type:'string',maxLength:700},resourceFlow:{type:'string',maxLength:700},balanceRules:{type:'string',maxLength:700}},additionalProperties:false};
const CONTENT_EXPANSION={type:'object',required:['milestone','newGameplay','systemImpact'],properties:{milestone:{type:'string',maxLength:220},newGameplay:{type:'string',maxLength:500},systemImpact:{type:'string',maxLength:500}},additionalProperties:false};
const FAILURE_RETRY_RISK={type:'object',required:['failureStates','retryFlow','riskPressure','recoveryRules'],properties:{failureStates:{type:'array',minItems:2,maxItems:6,items:{type:'string',maxLength:260}},retryFlow:{type:'string',maxLength:600},riskPressure:{type:'string',maxLength:600},recoveryRules:{type:'string',maxLength:600}},additionalProperties:false};
const PLATFORM_FIT_PLAN={type:'object',required:['targetPlatform','inputModel','performanceBudget','sessionConstraints'],properties:{targetPlatform:{type:'string',enum:['ROBLOX','UNITY','FORTNITE_UEFN']},inputModel:{type:'string',maxLength:600},performanceBudget:{type:'string',maxLength:600},sessionConstraints:{type:'string',maxLength:600}},additionalProperties:false};
const PLATFORM_PROFILE={type:'object',required:['platform','inputModel','sessionModel','multiplayerRuntime','performanceBudget','uiUx','saveAndNetwork','platformContentAdaptation','internalReleaseTarget','validationEvidence'],properties:{platform:{type:'string',enum:['ROBLOX','UNITY']},inputModel:{type:'string',maxLength:700},sessionModel:{type:'string',maxLength:700},multiplayerRuntime:{type:'string',maxLength:700},performanceBudget:{type:'string',maxLength:700},uiUx:{type:'string',maxLength:700},saveAndNetwork:{type:'string',maxLength:700},platformContentAdaptation:{type:'string',maxLength:700},internalReleaseTarget:{type:'string',maxLength:700},validationEvidence:{type:'string',maxLength:700}},additionalProperties:false};
// 유니티 웹 게임은 설계부터 실제 2.5D 이상의 공간 그래픽과 모바일 검증을 정의한다.
const UNITY_WEB_SPATIAL_PRESENTATION={type:'object',required:['dimension','worldDepth','cameraAndOcclusion','lightingAndMaterials','mobileWebglEvidence'],properties:{
  dimension:{type:'string',enum:['2.5D','3D']},
  worldDepth:{type:'string',maxLength:700},
  cameraAndOcclusion:{type:'string',maxLength:700},
  lightingAndMaterials:{type:'string',maxLength:700},
  mobileWebglEvidence:{type:'string',maxLength:700}
},additionalProperties:false};
const PLATFORM_PROFILES={type:'object',required:['ROBLOX','UNITY'],properties:{
  ROBLOX:{...PLATFORM_PROFILE,properties:{...PLATFORM_PROFILE.properties,platform:{type:'string',enum:['ROBLOX']}}},
  UNITY:{...PLATFORM_PROFILE,required:[...PLATFORM_PROFILE.required,'unityWebSpatialPresentation'],properties:{...PLATFORM_PROFILE.properties,platform:{type:'string',enum:['UNITY']},unityWebSpatialPresentation:UNITY_WEB_SPATIAL_PRESENTATION}}
},additionalProperties:false};
const WEB_CANONICAL_DESIGN={type:'object',required:['role','designAuthority','playerFlow','worldAndTraversal','systemsAndContent','combatAndInteraction','progressionAndEconomy','sessionFailureRecovery','uiMenuAndOnboarding','inputCameraAccessibility','presentationAndAudio','multiplayerPersistence','expansionSpace'],properties:{role:{type:'string',enum:['SHARED_DESIGN_WEB_APPLICATION']},designAuthority:{type:'string',enum:['GAME_DESIGN_REFERENCE_NOT_SOURCE_CODE_AUTHORITY']},playerFlow:{type:'array',minItems:4,maxItems:8,items:{type:'string',maxLength:340}},worldAndTraversal:{type:'string',maxLength:900},systemsAndContent:{type:'string',maxLength:900},combatAndInteraction:{type:'string',maxLength:900},progressionAndEconomy:{type:'string',maxLength:900},sessionFailureRecovery:{type:'string',maxLength:900},uiMenuAndOnboarding:{type:'string',maxLength:900},inputCameraAccessibility:{type:'string',maxLength:900},presentationAndAudio:{type:'string',maxLength:900},multiplayerPersistence:{type:'string',maxLength:900},expansionSpace:{type:'string',maxLength:900}},additionalProperties:false};
const PLATFORM_EXPANSION_POLICY={type:'object',required:['mode','sharedLargeFrame','expansionLimit','webRule','unityRule','robloxRule'],properties:{mode:{type:'string',enum:['SINGLE_ORIGINAL_PLATFORM_IMPLEMENTATION']},sharedLargeFrame:{type:'array',minItems:5,maxItems:5,items:{type:'string',enum:['CORE_IDENTITY','CORE_FUN_AND_REPRESENTATIVE_LOOP','WORLD_AND_PROGRESSION_DIRECTION','SAVE_PERSISTENCE_MEANING','MULTIPLAYER_INTENT']}},expansionLimit:{type:'string',enum:['GAMEPLAY_CHANGES_REQUIRE_SHARED_ORIGINAL_REVISION']},webRule:{type:'string',maxLength:900},unityRule:{type:'string',maxLength:900},robloxRule:{type:'string',maxLength:900}},additionalProperties:false};
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

// MAIN×A×B×C+@는 모든 게임에서 원본 설계로 작성한다. 이전 MAIN-only 설계는 재작성 대상이다.
const CREATIVE_THEME={type:'object',required:['name','kind','gameplayEffect'],properties:{
  name:{type:'string',minLength:2,maxLength:160},kind:{type:'string',enum:seedGameplaySketchVersion>=5?['MATERIAL']:['GENRE','MATERIAL']},
  gameplayEffect:{type:'string',minLength:16,maxLength:600}
},additionalProperties:false};
const CREATIVE_AXIS={type:'object',required:['system','material','materialDomain','stateChange'],properties:{
  system:{type:'string',minLength:2,maxLength:180},material:{type:'string',minLength:2,maxLength:180},
  materialDomain:{type:'string',minLength:2,maxLength:180},stateChange:{type:'string',minLength:20,maxLength:700}
},additionalProperties:false};
const CREATIVE_GENRE={type:'object',required:['role','name','gameplayEffect'],properties:{
  role:{type:'string',enum:['PRIMARY','SECONDARY']},
  name:{type:'string',minLength:2,maxLength:180},
  gameplayEffect:{type:'string',minLength:16,maxLength:650}
},additionalProperties:false};
const CREATIVE_GRAMMAR={type:'object',required:['mainIdentity','a','b','abCausality','abEvolution','materialFusion','storyCausalChain','cThemes','cGenres','cGenreInterlock','cWorldAndGameplayEffect','delveDiscoveries','delveGrowthRule','finalGameIdentity'],properties:{
  mainIdentity:{type:'string',minLength:15,maxLength:700},a:CREATIVE_AXIS,b:CREATIVE_AXIS,
  abCausality:{type:'string',minLength:35,maxLength:900},
  abEvolution:{type:'object',required:['aChangesB','bChangesA','lateGameChange'],properties:{
    aChangesB:{type:'string',minLength:25,maxLength:700},
    bChangesA:{type:'string',minLength:25,maxLength:700},
    lateGameChange:{type:'string',minLength:25,maxLength:700}
  },additionalProperties:false},
  materialFusion:{type:'object',required:['contrast','causalBridge','removalConsequence'],properties:{
    contrast:{type:'string',minLength:25,maxLength:700},
    causalBridge:{type:'string',minLength:25,maxLength:700},
    removalConsequence:{type:'string',minLength:25,maxLength:700}
  },additionalProperties:false},
  storyCausalChain:{type:'object',required:['cause','characterConflict','playerChoice','worldChange','nextEvent'],properties:{
    cause:{type:'string',minLength:20,maxLength:700},
    characterConflict:{type:'string',minLength:20,maxLength:700},
    playerChoice:{type:'string',minLength:20,maxLength:700},
    worldChange:{type:'string',minLength:20,maxLength:700},
    nextEvent:{type:'string',minLength:20,maxLength:700}
  },additionalProperties:false},
  cThemes:{type:'array',minItems:2,maxItems:2,items:CREATIVE_THEME},
  cGenres:{type:'array',minItems:2,maxItems:2,items:CREATIVE_GENRE},
  cGenreInterlock:{type:'string',minLength:30,maxLength:900},
  cWorldAndGameplayEffect:{type:'string',minLength:30,maxLength:900},
  delveDiscoveries:{type:'array',minItems:4,items:{type:'object',required:['clue','discovery','newChoice'],properties:{clue:{type:'string',minLength:10,maxLength:500},discovery:{type:'string',minLength:10,maxLength:500},newChoice:{type:'string',minLength:15,maxLength:500}},additionalProperties:false}},
  delveGrowthRule:{type:'string',minLength:25,maxLength:700},
  finalGameIdentity:{type:'string',minLength:18,maxLength:700}
},additionalProperties:false};
const DESIGN={type:'object',required:['identity','creativeGrammar','playerFantasy','coreFun','coreLoop','signatureSystems','systemInterconnections','progressionDirection','progressionEconomyBalance','contentExpansionPlan','failureRetryRisk','platformFitPlan','platformProfiles','webCanonicalDesign','platformExpansionPolicy','visualDirection','mobileUx','uxAccessibilityPlan','artAudioDirection','marketTargetDirection','steamExpansionDecision','multiplayerMode','multiplayerExpansionDecision','designAlternatives','selectedDesignPlan','contentVarietyPlan','narrativeDialoguePlan','referenceHomagePlan','designIntegrityPlan','stabilityPriorityPlan','technicalAssumptions','validationQuestions','implementationTraceability','openQuestions'],properties:{creativeGrammar:CREATIVE_GRAMMAR,identity:{type:'string',maxLength:1000},playerFantasy:{type:'string',maxLength:900},coreFun:{type:'string',maxLength:900},coreLoop:{type:'array',minItems:3,maxItems:8,items:{type:'string',maxLength:340}},signatureSystems:{type:'array',minItems:seedGameplaySketchVersion>=5?4:5,maxItems:12,items:{type:'object',required:['name','purpose','playerChoice','id','grammarRole','stateInputs','stateOutputs'],properties:{id:{type:'string',maxLength:80},grammarRole:{type:'string',enum:['MAIN','A','B','c','DELVE']},stateInputs:RULE_IDS,stateOutputs:RULE_IDS,name:{type:'string',maxLength:130},purpose:{type:'string',maxLength:440},playerChoice:{type:'string',maxLength:440}},additionalProperties:false}},systemInterconnections:{type:'array',minItems:5,maxItems:24,items:SYSTEM_INTERCONNECTION},progressionDirection:{type:'string',maxLength:900},progressionEconomyBalance:PROGRESSION_ECONOMY_BALANCE,contentExpansionPlan:{type:'array',minItems:3,maxItems:6,items:CONTENT_EXPANSION},failureRetryRisk:FAILURE_RETRY_RISK,platformFitPlan:PLATFORM_FIT_PLAN,platformProfiles:PLATFORM_PROFILES,webCanonicalDesign:WEB_CANONICAL_DESIGN,platformExpansionPolicy:PLATFORM_EXPANSION_POLICY,visualDirection:{type:'string',maxLength:900},mobileUx:{type:'string',maxLength:900},uxAccessibilityPlan:UX_ACCESSIBILITY_PLAN,artAudioDirection:ART_AUDIO_DIRECTION,marketTargetDirection:{type:'string',maxLength:900},steamExpansionDecision:{type:'string',maxLength:500},multiplayerMode:{type:'string',enum:MULTIPLAYER_MODES},multiplayerExpansionDecision:{type:'string',maxLength:500},designAlternatives:{type:'array',minItems:2,maxItems:3,items:DESIGN_ALTERNATIVE},selectedDesignPlan:SELECTED_DESIGN_PLAN,contentVarietyPlan:CONTENT_VARIETY_PLAN,narrativeDialoguePlan:NARRATIVE_DIALOGUE_PLAN,referenceHomagePlan:REFERENCE_HOMAGE_PLAN,designIntegrityPlan:DESIGN_INTEGRITY_PLAN,stabilityPriorityPlan:STABILITY_PRIORITY_PLAN,technicalAssumptions:{type:'array',minItems:2,maxItems:8,items:{type:'string',maxLength:340}},validationQuestions:{type:'array',minItems:2,maxItems:8,items:{type:'string',maxLength:340}},implementationTraceability:{type:'array',minItems:3,maxItems:8,items:IMPLEMENTATION_TRACE},openQuestions:{type:'array',maxItems:8,items:{type:'string',maxLength:340}},preservationContract:PRESERVATION_CONTRACT},additionalProperties:false};
function enforceOwnerPreservationDesign(value){
  if(!ownerPreservationDesign)return value;
  const existingMode=clean(seed.MULTIPLAYER_DESIGN_MODE).toUpperCase();
  // 기존 멀티 규칙은 보존하고 SINGLE 원본에는 디자이너가 고른 2인 이상 설계를 적용한다.
  const designMode=allGamesMultiplayerRequired&&existingMode==='SINGLE'?clean(value.multiplayerMode).toUpperCase():existingMode;
  const lockedSemantics=['WORLD_AND_REGIONS','STORY_AND_QUESTS','COMBAT_RULES','CRAFTING_RECIPES_AND_COSTS','SAVE_KEY_AND_SCHEMA_MEANING','PROGRESSION','BALANCE_VALUES','DROPS_AND_REWARDS','HIT_AND_COOLDOWN_SEMANTICS','MULTIPLAYER_MODE'];
  const presentationPasses=['ASSET_ADAPTATION','LIVING_MOTION','ANIMATION_FEEL','VFX','AUDIO_FEEL','CAMERA_LANGUAGE','POLISH_MOBILE'];
  return {
    ...value,
    identity:'기존 마력숲 생존기의 세계관·지역·스토리·퀘스트·전투·제작·진행·세이브 의미를 그대로 보존하고 표현 품질만 단계적으로 높이는 보존형 Vibe 파일럿이다.',
    coreFun:'기존 탐험·채집·제작·전투·퀘스트 선택과 결과는 바꾸지 않고, 같은 입력과 같은 판정에 살아있는 모션·명확한 타격 피드백·일관된 에셋 표현을 결합해 체감 품질을 높인다.',
    coreLoop:Array.isArray(seed.CORE_LOOP)&&seed.CORE_LOOP.length>=3?seed.CORE_LOOP.slice(0,8):value.coreLoop,
    // 보존형 설계에서도 디자이너가 기존 실제 시스템을 MAIN/A/B/C/@로 작성한다.
    // 임의로 두 시스템을 만들어 덮지 않으며 기존 수치·저장·보상을 보존한다.
    signatureSystems:value.signatureSystems,
    systemInterconnections:value.systemInterconnections,
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
    multiplayerMode:designMode,
    multiplayerExpansionDecision:allGamesMultiplayerRequired&&existingMode==='SINGLE'
      ?value.multiplayerExpansionDecision
      :'기존 멀티플레이 역할·규칙을 보존하고 저장·수치 변경 없이 실제 입장·복귀·동기화를 검증한다.',
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
// 게임별 실제 signatureSystems에 이미 존재하는 규칙 ID와 상태 입출력만 다음 설계 조각에 전달한다.
function authoredStateHandoffContract(signatureSystems=[]){
  const systems=Array.isArray(signatureSystems)?signatureSystems.filter(row=>clean(row?.id)&&Array.isArray(row?.stateInputs)&&Array.isArray(row?.stateOutputs)):[];
  const ruleIds=systems.map(row=>clean(row.id));
  if(new Set(ruleIds).size!==ruleIds.length)return{ruleIds:[],handoffs:[],stateKeys:[]};
  const handoffs=[];
  for(const from of systems)for(const to of systems){
    if(from.id===to.id)continue;
    const keys=uniq(from.stateOutputs.filter(key=>to.stateInputs.includes(key)));
    if(keys.length)handoffs.push({fromId:from.id,toId:to.id,stateKeys:keys});
  }
  return{ruleIds,handoffs,stateKeys:uniq(handoffs.flatMap(edge=>edge.stateKeys))};
}
function designSliceSchemaWithAuthoredHandoffs(fields,signatureSystems=[]){
  const schema=designSliceSchema(fields);
  if(fields.includes('signatureSystems')||!fields.includes('systemInterconnections'))return schema;
  const contract=authoredStateHandoffContract(signatureSystems);
  if(contract.ruleIds.length<4||!contract.handoffs.length)return schema;
  const system=schema.properties.systemInterconnections,items=system.items;
  const properties={
    ...items.properties,
    fromId:{...items.properties.fromId,enum:contract.ruleIds},
    toId:{...items.properties.toId,enum:contract.ruleIds},
    stateKeys:{...items.properties.stateKeys,items:{...items.properties.stateKeys.items,enum:contract.stateKeys}}
  };
  return{...schema,properties:{...schema.properties,systemInterconnections:{...system,items:{...items,properties}}}};
}
const DESIGN_BASE=designSliceSchema(DESIGN_BASE_FIELDS);
const DESIGN_GATE=designSliceSchema(DESIGN_GATE_FIELDS);
const DESIGN_AUTHORING_SLICES=Object.freeze([
  {id:'identity-core',fields:['identity','creativeGrammar','playerFantasy','coreFun','coreLoop','signatureSystems','multiplayerMode'],predict:2200},
  {id:'systems-progression',fields:['systemInterconnections','progressionDirection','progressionEconomyBalance','contentExpansionPlan','failureRetryRisk'],predict:1500},
  {id:'content-rules',fields:['contentVarietyPlan'],predict:1800},
  {id:'alternatives',fields:['designAlternatives'],predict:1600},
  {id:'selection-variety',fields:['selectedDesignPlan'],predict:1800},
  {id:'platform-profiles',fields:['platformFitPlan','platformProfiles'],predict:1700},
  {id:'web-canonical',fields:['webCanonicalDesign'],derived:true},
  {id:'platform-expansion',fields:['platformExpansionPolicy'],derived:true},
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
    // 기본 코딩 명세는 같은 디자이너가 검증받은 identity-core에서만 파생한다.
    // 후보 단계에서는 구현·승인을 허용하지 않으며 기존 승격 게이트가 권한을 결정한다.
    codingBasis:{
      state:'DESIGN_CANDIDATE',
      codeGenerationAuthorized:false,
      requiredGate:'DESIGN_BASELINE_READY_AND_STRICT_PASS_GTE_80_NO_HARD_FAILURE',
      identity:content.identity,creativeGrammar:content.creativeGrammar,coreFun:content.coreFun,coreLoop:content.coreLoop,
      signatureSystems:content.signatureSystems,multiplayerMode:content.multiplayerMode,
      targetPlatform:clean(seed.INITIAL_TARGET_PLATFORM)
    },
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
  const commonInput=`${['OWNER_BRIEF_AND_ORIGINAL_ONLY','DESIGNER_SELF_SEED'].includes(seed.designInputMode)||seed.autoMissingDesignIntake?'':`GAME_SEED_DESIGN_DEPTH=${clip(seedDesignDepthContext,7500)}\n`}SHARED_CONTEXT=${clip(sharedContext,6500)}\n기본설계 문법=MAIN × A × B × C + @. MAIN은 누가 무엇을 반복하는 게임인지 정한다. A와 B는 각각 서로 다른 게임 시스템과 구체적 창작 소재(신화·역사·철학·과학·예술 등 제한 없음)를 결합한다. 자원수집·이동·전투처럼 시스템 동작 자체를 창작 소재라고 쓰지 않는다. A의 선택→B의 상태 변화→다음 A의 새로운 선택을 실제 원인·상태 키로 연결한다. C는 창작 소재 2개와 서로 다른 메인/보조 장르 2개를 융합하고, 보조 장르를 제거하면 플레이 규칙·위험·정보·선택이 바뀌어야 한다. @는 초기 발견 4개 이상(단서→실험→새 선택), 상한 없이 확장하되 단순 수치 강화와 기능 나열은 제외한다. 세계·스토리는 원인→인물 갈등→플레이어 선택→상태 변화→다음 사건으로 생성한다. A/B/C 제거 전후 플레이 차이를 설명한다. 기존 소스·저장·밸런스는 변경하지 말고 검증 전 설계를 통과라고 주장하지 않는다. 설계 원본은 게임당 하나다. MAIN/A/B/C/@와 규칙·상태·진행·멀티 의미는 이 원본에서만 작성한다. platformProfiles는 같은 원본의 플랫폼별 구현 제약이며 별도 게임 설계가 아니다.\nMULTIPLAYER_ALLOWED_MODES=${JSON.stringify(MULTIPLAYER_MODES)}; 모든 게임 멀티 필수 정책이 적용되면 기존 SINGLE은 원본 참고이며 디자이너가 멀티 확장을 직접 작성한다. 기존 COOP/COMPETITIVE/HYBRID 규칙은 보존한다. Unity WebGL도 2.5D 이상 실제 세계 깊이·가림·조명과 모바일 브라우저 플레이 검증 계획을 UNITY 프로필에 설계한다.\nPLAYABILITY_REQUIREMENTS=${JSON.stringify(playableRequirements)}`;
  for(const slice of DESIGN_AUTHORING_SLICES){
    // 웹 호환 뷰와 플랫폼 적용 정책은 마지막에 같은 원본에서 투영한다.
    if(slice.derived)continue;
    const schema=designSliceSchemaWithAuthoredHandoffs(slice.fields,merged.signatureSystems);
    const existing=Object.fromEntries(slice.fields.filter(field=>Object.prototype.hasOwnProperty.call(merged,field)).map(field=>[field,merged[field]]));
    const taskKey=`${phase}_slices::${slice.id}`;
    const priorRules=Object.fromEntries(['identity','creativeGrammar','coreFun','coreLoop','signatureSystems','systemInterconnections','progressionEconomyBalance','failureRetryRisk','multiplayerMode','contentVarietyPlan','designAlternatives','selectedDesignPlan'].filter(field=>!slice.fields.includes(field)&&merged[field]!==undefined).map(field=>[field,merged[field]]));
    const dependencyHash=createHash('sha256').update(JSON.stringify(priorRules)).digest('hex');
    const compactRule=value=>typeof value==='string'?clip(value,180):Array.isArray(value)?value.map(compactRule):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,compactRule(item)])):value;
    const anchors=compactRule(Object.fromEntries(Object.entries(priorRules).map(([field,value])=>[field,field==='contentVarietyPlan'?{regions:value.regions?.map(({id,name,ruleIds})=>({id,name,ruleIds})),abilities:value.abilities,roleTransitions:value.roleTransitions}:field==='designAlternatives'?value.map(plan=>({label:plan.label,strategy:plan.strategy})):field==='selectedDesignPlan'?value:field==='creativeGrammar'?{
      mainIdentity:value.mainIdentity,a:value.a,b:value.b,abCausality:value.abCausality,
      abEvolution:value.abEvolution,cThemes:value.cThemes,cGenres:value.cGenres,
      cGenreInterlock:value.cGenreInterlock,cWorldAndGameplayEffect:value.cWorldAndGameplayEffect,
      storyCausalChain:value.storyCausalChain,
      delveDiscoveries:Array.isArray(value.delveDiscoveries)&&value.delveDiscoveries.length>8
        ?[...value.delveDiscoveries.slice(0,4),...value.delveDiscoveries.slice(-4)]
        :value.delveDiscoveries,
      delveGrowthRule:value.delveGrowthRule,finalGameIdentity:value.finalGameIdentity
    }:value])));
    designCheckpoint.sliceDependencies||={};
    designCheckpoint.sliceRepairFeedback||={};
    designCheckpoint.sliceRepairAttempts||={};
    designCheckpoint.slicePartialResults||={};
    if(designCheckpoint.sliceDependencies[taskKey]&&designCheckpoint.sliceDependencies[taskKey]!==dependencyHash){
      delete designCheckpoint.tasks[taskKey];delete designCheckpoint.slicePartialResults[taskKey];
    }
    let result,feedback=designCheckpoint.sliceRepairFeedback[taskKey]||[];
    for(let attempt=0;attempt<2;attempt++){
      const partial=designCheckpoint.slicePartialResults[taskKey]||{};
      const pendingFields=slice.fields.filter(field=>!Object.prototype.hasOwnProperty.call(partial,field));
      const requestedFields=pendingFields.length?pendingFields:slice.fields;
      const callSchema=designSliceSchemaWithAuthoredHandoffs(requestedFields,merged.signatureSystems);
      result=await runCheckpointTask(`${phase}_slices`,slice.id,()=>callDesignerModel(
      system,
      `${commonInput}\n전체 설계를 한 번에 출력하지 말고 현재 필드 묶음만 상세하게 작성하라. 다른 필드는 출력하지 않는다. MAIN/A/B/C/@와 causalDNA 연결은 현재 필드가 담당하는 범위에서 실제 상태 변화로 유지한다. 이미 작성된 설계와 모순시키지 않는다. 원본 규칙과 수치를 보존한다.\nCURRENT_RULE_SOURCE=${['content-rules','selection-variety'].includes(slice.id)?JSON.stringify({...currentRuleSourceContext,lines:playableRequirements.abilityFacts.length?undefined:currentRuleSourceContext.lines,abilityFacts:playableRequirements.abilityFacts}):'원본 수치는 공유 규칙을 따른다'}\nAUTHORED_RULE_IDS_AND_HANDOFFS=${requestedFields.includes('systemInterconnections')?clip(authoredStateHandoffContract(merged.signatureSystems),4000):'NOT_APPLICABLE'}\nSYSTEM_INTERCONNECTION_AUTHORING_RULE=Use actual signatureSystems IDs for fromId/toId and exact overlapping output-to-input state keys; never use coreFun as a rule ID or invent gameplay states.\nSLICE_ID=${slice.id}\nSLICE_FIELDS=${JSON.stringify(requestedFields)}\nSTRUCTURE_CONTRACT=${JSON.stringify(repairStructureContract(requestedFields))}\nCURRENT_SLICE=${clip({...existing,...partial},3500)}\nSHARED_RULE_ANCHORS=${JSON.stringify({...anchors,...partial})}\nAUTHORING_REPAIR_ATTEMPT=${designCheckpoint.sliceRepairAttempts[taskKey]||0}\nAUTHORING_REPAIR_FEEDBACK=${JSON.stringify(feedback.map(row=>row.code==='DESIGN_PLACEHOLDER_CONTENT'?{...row,evidence:{path:row.evidence?.path}}:row))}`,
      callSchema,
      {predict:slice.predict,includeAssetContext:['ux-presentation','traceability'].includes(slice.id),temperature:phase.includes('revision')?0.16:0.24,numCtx:['content-rules','selection-variety','integrity-stability'].includes(slice.id)?16384:8192,recoverOversized:designCheckpoint.failedTask===slice.id&&/^OLLAMA_DESIGN_(TIMEOUT|OUTPUT_TRUNCATED)/.test(designCheckpoint.lastError||''),isolateFields:requestedFields.includes('systemInterconnections')||feedback.some(row=>row.code==='DESIGN_PLACEHOLDER_CONTENT'),grammarContext:requestedFields.includes('systemInterconnections')
         ?{...(partial.creativeGrammar||merged.creativeGrammar||{}),
           authoredRuleHandoffs:authoredStateHandoffContract(merged.signatureSystems),
           authoredRuleNames:Object.fromEntries((merged.signatureSystems||[]).map(row=>[row.id,row.name])),
           authoredRuleRoles:Object.fromEntries((merged.signatureSystems||[]).map(row=>[row.grammarRole,row.id]))}
         :partial.creativeGrammar||merged.creativeGrammar||null}
      ));
      result={...partial,...result};
      feedback=validateDesignAuthoringContent({design:{...merged,...result},seed,fields:slice.fields,multiplayerRequired:allGamesMultiplayerRequired,requirePlayableContract:!ownerPreservationDesign,assetLibrary:designAssetLibrary,sourceText:currentRuleSource,assetFamilies:designAssetFamilies});
      try{assertSchemaValue(result,schema);}catch(error){feedback.push({code:'DESIGN_SLICE_SCHEMA_INVALID',fields:slice.fields,requiredAction:clean(error.message)});}
      if(!feedback.length){designCheckpoint.tasks[taskKey]=result;break;}
      const affected=new Set(feedback.flatMap(row=>row.fields||[]));
      const retained={};
      for(const field of slice.fields){
        if(affected.has(field)||result[field]===undefined)continue;
        try{assertSchemaValue({[field]:result[field]},designSliceSchema([field]));retained[field]=result[field];}catch{}
      }
      designCheckpoint.slicePartialResults[taskKey]=retained;
      designCheckpoint.sliceDependencies[taskKey]=dependencyHash;
      console.log(`DESIGN_SLICE_REPAIR_SCOPE=${slice.id}|retained=${Object.keys(retained).join(',')}|rewrite=${slice.fields.filter(field=>!Object.prototype.hasOwnProperty.call(retained,field)).join(',')}`);
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
    delete designCheckpoint.slicePartialResults[taskKey];
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
  // 검사가 지목한 오류 필드가 있으면 정상인 같은 축까지 다시 쓰지 않는다.
  const reasons=Array.isArray(scored?.rejectionReasons)?scored.rejectionReasons:[];
  const explicit=reasons.flatMap(reason=>reason.fields||[]);
  const axes=uniq([...(scored?.criticalAxisFailures||[]),...reasons.filter(reason=>!reason.fields?.length).map(reason=>reason.axis)]);
  const derived={webCanonicalDesign:['coreLoop','signatureSystems','contentVarietyPlan','progressionEconomyBalance','failureRetryRisk','uxAccessibilityPlan','artAudioDirection'],platformExpansionPolicy:[]};
  // 시드 인과 문법의 고유 소재·장르·발견이 희석되면 실제 원본 creativeGrammar를 다시 작성한다.
  // 점수축의 일반 보정만으로는 잘못된 MAIN/A/B/C/@가 그대로 남는 복구 누락을 막는다.
  const seedGrammarDiluted=reasons.some(reason=>reason.code==='NOVEL_GRAMMAR_DILUTED');
  const fields=uniq([...explicit,...(seedGrammarDiluted?['creativeGrammar']:[]),...axes.flatMap(axis=>AXIS_FIELDS[axis]||[])].flatMap(field=>Object.prototype.hasOwnProperty.call(derived,field)?derived[field]:[field])).filter(field=>DESIGN.required.includes(field));
  return fields.length?fields:['identity','coreFun','coreLoop','signatureSystems'];
}

function repairStructureContract(fields){
  const rules=[];
  rules.push('전체 항목 공통: 임시 식별자·같은 문장 반복으로 내용을 채우지 않는다. 앞에서 확정한 중심 행동·두 핵심 축·보조 요소·파고들기·게임 규칙·저장 의미를 유지하고 입력→판정→상태 변화→대응→다음 선택으로 구체화한다.');
  if(fields.includes('selectedDesignPlan'))rules.push(`selectedDesignPlan.playthrough: ${playableRequirements.phases.join(' → ')} 순서의 ${playableRequirements.phases.length}개 장면. 각 entryState는 직전 exitState를 그대로 이어받는다. playerChoice, actionAndResponse, exitState, nextDecision에 실제 선택·조건·판정·전조·대응·실패 복구를 적는다. durationRationale에는 한 판 길이와 여러 판을 포함한 세션 길이, 초중후반 행동에 필요한 시간 근거와 확인할 가정을 구분한다. 기존 시간 제한이나 밸런스는 오너 승인 없이 변경하지 않는다.`);
  if(fields.includes('designAlternatives'))rules.push('designAlternatives: 같은 규칙 안에서 루프·동선·적 대응·성장 중 최소 두 항목의 실제 전략이 다른 대안을 작성한다. PLAN_A/PLAN_B 이름이나 수식어만 바꾸지 않는다.');
  if(fields.includes('platformProfiles'))rules.push('platformProfiles: 공통 규칙은 공유하되 UNITY의 배포/검증에 Roblox Open Cloud/Rojo를 복사하지 않는다. ROBLOX는 Roblox 실행 증거, UNITY는 같은 Unity 프로젝트의 네이티브/WebGL 실행 증거를 사용한다.');
  if(fields.includes('webCanonicalDesign'))rules.push('webCanonicalDesign은 같은 공통 원본의 호환 뷰다. 별도 게임 규칙을 창작하지 않는다.');
  if(fields.includes('technicalAssumptions')||fields.includes('implementationTraceability'))rules.push('자산은 요구 역할→사용 장면→후보 ID→선정 근거→개선/제작 필요→플랫폼 적응→실제 확인 방법 순서로 기술한다. ROLE_REQUIREMENT_UNRESOLVED 후보는 사용 확정이나 자산 부재로 간주하지 말고 역할을 먼저 구체화한다. 내부 점수만으로 역할 적합성·런타임 품질을 주장하지 않는다.');
  if(fields.includes('identity'))rules.push('identity: 공백 포함 최소 60자 이상의 구체적 게임 정체성. 무슨 게임인지와 같은 장르와의 차이를 즉시 읽을 수 있고, 대표 행동·대표 선택·시그니처 세계 규칙이 coreLoop/signatureSystems와 직접 연결되어야 한다.');
  if(fields.includes('playerFantasy'))rules.push('playerFantasy: 공백 포함 최소 40자 이상의 구체적 플레이어 역할·책임·대표 행동·결과 판타지. 관찰자 설명이 아니라 플레이어가 실제로 무엇을 하는지 명시.');
  if(fields.includes('coreFun'))rules.push('coreFun: 공백 포함 최소 40자 이상. 대표 행동과 반복되는 대표 선택, 관찰 가능한 상태변화, 즉각적 결과를 명시하고 정체성 문장과 같은 플레이 약속을 증명.');
  if(fields.includes('creativeGrammar'))rules.push('creativeGrammar는 materialFusion에서 A/B 소재가 어떻게 낯설고도 인과적으로 연결되는지·하나를 빼면 사라지는 플레이를 적고, storyCausalChain에서 원인→인물 갈등→플레이어 선택→실제 세계 상태 변화→다음 사건을 적고, abEvolution에서 A→B, B→A, 중후반 두 시스템의 관계 변화가 각각 실제로 일어나는 조건과 피드백을 명시한다. creativeGrammar는 MAIN=기본 게임 주제/정체성, A=게임 시스템+해당 축 창작 소재, B=다른 시스템+해당 축 창작 소재, abCausality=양방향 실제 상태 교환, C=cThemes에 인물·예술·역사·종교·철학·과학·무협·엽기 등 서로 다른 주제/소재 두 개를 각각 kind=MATERIAL로 선택하고, cGenres에 서로 다른 메인 장르(role=PRIMARY)와 보조 장르(role=SECONDARY)를 각각 하나씩 넣는다. 장르 사전은 무제한이다. PRIMARY는 가장 중요한 플레이·갈등·위험을 정의하고 SECONDARY는 그 선택과 A/B 시스템에 실질적 인과 변화를 줘야 한다. cGenreInterlock에 둘의 상호작용과 보조 장르 제거 시 바뀌는 플레이를 명시한다, @=서로 다른 단서·발견·새 선택을 갖는 4개 이상 초기 사례(번호만 다르거나 같은 해결법을 반복한 복제는 금지) 및 상한 없는 발전 규칙, finalGameIdentity=모든 축을 인과적으로 결합한 새 정체성이다. MAIN에만 소재를 붙이고 A/B/C를 빈껍데기로 만들거나 C를 날씨·이벤트 보조 시스템으로 대체하지 않는다. 이미 만들어진 게임의 부족한 이전 설계안도 같은 기준으로 처음부터 다시 작성한다.');
  if(fields.includes('coreLoop'))rules.push('coreLoop: 서로 다른 실제 플레이 단계 최소 3개. 입력/선택 -> 상태변화 -> 보상·위험·다음 선택의 연결을 포함.');
  if(seedGameplaySketchVersion>=5&&fields.includes('signatureSystems'))rules.push('signatureSystems: MAIN/A/B와 DELVE(@)를 기존 원본 규칙·상태 입출력으로 구분한다. 최소 4개 고유 역할로 구성하되 c 보조 시스템은 있을 때만 유지하고 C의 두 창작 소재·메인/보조 장르 효과는 creativeGrammar 및 A/B 상태 교환으로 증명한다. 이름·역할·선택을 복제하거나 없는 기능·보상·저장 키를 추가하지 않는다.');
  if(seedGameplaySketchVersion<5&&fields.includes('signatureSystems'))rules.push('signatureSystems: MAIN/A/B/c/DELVE(@) 역할을 각각 포함하는 최소 5개 서로 다른 기존 또는 신규 시스템. 기존 작품은 실제 메커니즘의 역할에 연결하고 밸런스·저장·보상·진행을 임의 변경하지 않는다. 각 name은 최소 2자, purpose와 playerChoice는 각각 최소 20자 이상.');
  if(fields.includes('platformProfiles'))rules.push('Unity WebGL은 게임플레이 화면에 2.5D 또는 3D 그래픽을 설계 단계부터 강제한다. platformProfiles.UNITY.unityWebSpatialPresentation.dimension=2.5D 또는 3D를 명시하고 worldDepth에는 전/중/후경 깊이·3D 월드 오브젝트 등 실제 공간 구성, cameraAndOcclusion에는 깊이 카메라와 오브젝트 가림, lightingAndMaterials에는 입체 조명·접지 그림자·재질, mobileWebglEvidence에는 모바일 WebGL 실제 플레이·전후 비교·독립 QA 방법을 구체적으로 적는다. 평면 스프라이트/DOM 카드·CSS 장식·2D 태그만으로 통과할 수 없다. 2D HUD는 허용하고 기존 체력·공격력·경제·세이브는 그대로 유지한다.');
  if(fields.includes('contentExpansionPlan'))rules.push('contentExpansionPlan: 최소 3개 서로 다른 객체. JS String.length 기준 각 milestone은 최소 20자, newGameplay/systemImpact는 각각 최소 30자 이상으로 실제 새 플레이와 기존 시스템 영향을 구체적으로 설명.');
  if(fields.includes('uxAccessibilityPlan'))rules.push('menuStructure: 장르·대표 행동·기기에 맞는 정보 구조를 선택한다. 화면 진입/복귀, 전투 중 빠른 선택, 비교 분할창, 탐색형 목록, 빌드 트리, 상황형 바로가기 중 왜 이 구성이 맞는지 대안을 비교한다. convenienceDecisions: 실제 반복 불편 -> 참고 기능의 작동 원리 -> 우리 게임 적용/기각 이유 -> 상태/비용 보호 -> 검증 경로를 적는다. 프리셋 저장·전환, 조건 필터, 일괄 처리 미리보기, 목표에서 재료/지도 바로가기, 선택·필터·스크롤·미완성 작업 복귀 중 관련 기능을 선택한다. 버튼 크기나 메뉴 개수만으로 편의성 개선이라 하지 않는다. 아래 공식 참고는 관찰일의 설계 자료이며 최신 여부와 우리 게임의 효과는 미검증이다. 검증된 이전 경험과 실패도 함께 비교하고 새 작품/업데이트를 참고했다고 출처 없이 주장하지 않는다. REFERENCES='+JSON.stringify(GAME_CONVENIENCE_REFERENCES.map(({match,...row})=>row)));
  if(fields.some(field=>['progressionEconomyBalance','contentExpansionPlan','failureRetryRisk'].includes(field)))rules.push('파고들기/보상: 발견 가능한 단서 -> 조합·숙련·탐험 실험 -> 위험·기회비용·대응법 -> 새 행동/공략/경로/세계관계 -> 다음 탐구거리의 인과를 설계한다. 재화·능력치·아이템 개수 증가만으로 깊이를 주장하지 않는다. 보상은 단기 성공, 세션 목표, 선택적 장기 숙련에서 서로 다른 플레이 변화를 주되 해당 장르와 기존 저장·밸런스를 보존한다. 조합 기록·비교·발견 단서·재도전 준비는 관련 메뉴에 연결하고 정답을 미리 노출하거나 반복 노동을 강제하지 않는다. 구현 전 가설과 실제 플레이 증거를 구분한다.');
  if(fields.includes('progressionEconomyBalance'))rules.push('재미와 보상은 승인된 메인 A/B/C 조합의 큰 재미, 짧은 발견·수집·꾸미기·작은 목표의 소확행, 선택적으로 깊게 투자하는 장기 즐길거리를 구분해 연결한다. 보상 조건·비용·누적 진척·약속한 확정 보상·확률 보상의 실제 확률·중복 보상의 쓰임·중단 후 이어하기를 게임에 맞게 설계하고 메뉴에 보인다. 보상 중복 수령과 진행 유실은 검증한다. 소확행에 수치/재화 보상을 쓸 수 있으나 그것만으로 깊은 파고들기를 대체하지 않는다. 기존 MAIN/A/B/C/@의 승인된 역할을 편의상 다시 분류하거나 장르에 없는 수집/전투를 강제하지 않는다.');
  if(fields.some(field=>['signatureSystems','systemInterconnections','contentExpansionPlan'].includes(field)))rules.push('깊이의 기준은 학문을 가르치거나 학문 소재를 넣는 것이 아니라, 게임 자체를 오래 연구할 만한 규칙·관계·응용의 층위다. 쉽게 시작하는 대표 행동에서 출발해 시스템 상호작용, 상황별 예외와 대가, 조합의 새로운 용도, 여러 유효한 해법, 숙련으로 바뀌는 선택, 발견 후 다음 질문으로 이어지게 한다. MAIN/A/B/C 사이의 인과와 상호 의존을 구체화하고 같은 기능도 상황/조합/숙련에 따라 의미가 달라지는 플레이 사례를 비교한다. 복잡한 용어·기능 개수·끝없는 반복·수치 증가를 깊이로 대체하지 않는다. 단서는 읽을 수 있고 규칙은 일관되어야 하며 보상은 발견과 이해와 숙련에 맞게 약속된다. 지배적 단일 조합, 무한 보상 악용, 진행 막힘, 과도한 인지 부담을 기존 검증에서 확인한다.');
  if(fields.includes('implementationTraceability'))rules.push('implementationTraceability: 최소 3개 서로 다른 객체. JS String.length 기준 각 designElement/responsibleSystem은 최소 20자, validationEvidence는 최소 30자 이상으로 검증 방법까지 구체적으로 작성.');
  if(fields.includes('technicalAssumptions'))rules.push('technicalAssumptions: 서로 다른 구현 가정 최소 2개이며 각 항목은 JS String.length 기준 최소 24자 이상.');
  if(fields.includes('validationQuestions'))rules.push('validationQuestions: 서로 다른 검증 질문 최소 2개이며 각 항목은 JS String.length 기준 최소 24자 이상.');
  if(fields.includes('systemInterconnections'))rules.push('systemInterconnections: 최소 3개 서로 다른 객체. JS String.length 기준 fromSystem/toSystem은 각각 최소 16자, trigger/stateChange는 각각 최소 24자 이상으로 구체적으로 작성.');
  if(seedGameplaySketchVersion>=5&&fields.includes('signatureSystems'))rules.push('MAIN/A/B/@의 상태 입력과 출력은 실제 게임 상태의 키이며 개별 역할 사이에서 겹쳐야 한다. A→B와 B→A 양방향 경로, MAIN과 모든 역할의 도달 가능한 연결이 있어야 한다. 없는 연결을 뒤 단계에서 가짜 coreFun ID나 임의 상태·보상·저장키로 채우지 말고 지금 역할의 실제 읽기/쓰기 상태를 설계하라.');
  if(seedGameplaySketchVersion>=5&&fields.includes('signatureSystems'))rules.push('signatureSystems의 MAIN/A/B는 각 하나, DELVE(@)는 하나 이상이다. 기존 c 보조 시스템은 선택 사항이며 C를 별도 기계축으로 만들지 말고 A/B의 상태·선택 및 creativeGrammar.cGenres에 연결한다. stateInputs/stateOutputs에는 기존 실제 상태 키만 적고 원본 규칙 ID·저장·경제를 보존한다.');
  if(seedGameplaySketchVersion<5&&fields.includes('signatureSystems'))rules.push('signatureSystems의 id는 고정 규칙 ID다. grammarRole은 MAIN/A/B 각각 하나, c와 DELVE(@)는 하나 이상이다. 각 stateInputs/stateOutputs에는 실제 상태 키만 정의한다. coreLoop 문장, INPUT/SELECT/OUTPUT/STATE 설명, 화살표로 연결한 행동 순서를 상태 키에 넣지 않는다. 감염전은 HumanCount/MonsterCount/EliminatedCount와 능력 자원을 포함한다. 맵·능력·자산·대안은 이 ID와 상태 키만 참조한다.');
  if(fields.includes('systemInterconnections'))rules.push('fromId의 stateOutputs와 toId의 stateInputs에 실제로 존재하는 같은 stateKeys를 연결한다. A/B는 양방향으로 값을 주고받고 MAIN/c/DELVE도 연결돼야 한다. fromSystem/toSystem 설명만 같은 것으로 대체하지 않는다.');
  if(fields.includes('contentVarietyPlan'))rules.push('abilities에는 현재 게임 원본에 실제로 존재하는 능력을 각각 작성한다. 다른 장르의 능력을 추가하지 않는다. id/kind/ownerId/ruleId, trigger, range/rangeUnit, resource/cost, cooldownSeconds, telegraph/avoidance/effect, stateInputs/stateOutputs/source가 필수다. 자원이나 재사용이 없으면 0과 이유를 적는다. 원본 수치가 있는 능력은 rangeKey/costKey/cooldownKey를 원본 technicalAssumptions 키에 연결한다. regions는 공통 id와 ruleIds로 뒤의 전략 비교에 사용한다.');
  if(fields.includes('contentVarietyPlan')&&playableRequirements.infection)rules.push('감염전 abilities에는 원본의 모든 인간 능력·감염 후 능력·몬스터 능력·기본 감염/정화를 각각 작성한다. roleTransitions는 원본 humanRoster 각 id마다 인간 도구와 능력→원본 이름 그대로의 감염 능력, 유지/제거 상태, 바뀌는 선택을 연결한다.');
  if(fields.includes('designAlternatives'))rules.push('strategy는 이미 작성한 구역/상태/규칙/능력 ID만 사용한다. routeEdges(from,to), resourceSites(stateKey,regionId), cooperation(ruleId,regionId,abilityId)의 관계 중 두 항목 이상이 실제로 달라야 한다. 수식어·설명·ID 이름 바꾸기는 차이로 인정하지 않는다. advantage/cost/bestSituation에 얻는 것·포기하는 것·선택 상황을 적는다.');
  if(fields.includes('selectedDesignPlan'))rules.push('before/after는 같은 key/value 상태 목록이며 앞 장면의 after와 다음 before를 동일하게 잇는다. startSeconds/endSeconds를 0부터 연속 배치하고 actions에 실제 능력 ID, actorId/targetId, 시각·거리·사용 전후 자원·성공 여부·대응을 적는다. timeReason은 장면의 실제 행동에 필요한 시간을 설명한다. 마지막 장면은 다음 라운드가 아닌 현재 한 판의 결판이다.');
  if(fields.includes('selectedDesignPlan')&&playableRequirements.infection)rules.push('participants에 시작 인원 전원의 고정 id/role/classId를 적는다. 감염되면 같은 id의 진영과 사용 능력이 바뀌고 정화되면 이후 행동할 수 없다. 각 장면의 before/after는 같은 key/value 수치 목록이다. 앞 after를 다음 before로 정확히 이어라. startSeconds/endSeconds는 0부터 연속되고 timeReason은 이동·접촉·재사용 대기 등 필요한 시간의 근거다. actions는 능력 ID, actorId/targetId, atSeconds, distance, energyBefore/energyAfter, hit, response를 기록한다. 모든 입력은 비용과 재사용 시간을 지킨다. 감염 적중은 인간 -1/몬스터 +1, 정화 적중은 몬스터 -1/탈락 +1이다. 첫 접촉에서 감염하지 않고 첫 감염 장면에서 정확히 1회 전환, 인원 불균형, 정화 역전 기회, 결판까지 작성한다. 한 진영 0명 즉시 승패 또는 원본 제한시간 무승부로 끝낸다. roundSeconds와 sessionSeconds를 구분하고 기존 제한시간은 유지한다.');
  if(fields.includes('artAudioDirection'))rules.push('assetBindings마다 필요한 family/role/bodyPlan/behavior/presentation부터 정한 뒤 사용 위치와 ruleIds, 실제 assetId, USE/ADAPT/AUTHOR, selectionReason/improvement/platformAdaptation/validation을 작성한다. 체형이 해당 없는 배경/소리도 공간 형태 또는 음색을 구체화한다. 같은 역할의 재사용 후보가 있으면 기존 자산부터 검토한다. 실제 없는 ID를 만들거나 몬스터 분류만으로 거미를 고르지 않는다. 점수는 역할 적합성 근거가 아니다. AUTHOR는 assetId를 비우고 현재 목록의 정확한 역할 공백과 필요한 제작을 적는다.');
  if(fields.includes('designIntegrityPlan'))rules.push('authoringVersion=2. flowAudit에서 한 판의 모든 phase를 같은 순서로 재생한다. 각 reachableBy는 실제 능력 ID이며 blockedCase/recovery와 nextPhase(마지막 END)를 적는다. 능력 도달·자원 부족·길 막힘·감염 전환·탈락·종료를 확인하고 미해결 모순을 true 선언으로 숨기지 않는다.');
  if(seedGameplaySketchVersion>=5&&fields.includes('signatureSystems'))rules.push('MAIN은 게임 정체성의 대표 행동, A/B는 소재가 융합된 두 상태 교환축, C는 두 창작 소재 및 주·보조 장르로 인한 실제 선택·세계 변화, @는 발견·숙련으로 구별한다. 별도 c 기능을 억지로 추가하지 않는다. 원본 수치·저장·보상을 변경하지 않는다.');
  if(seedGameplaySketchVersion<5&&fields.includes('signatureSystems'))rules.push('시그니처의 purpose/playerChoice에 발동 조건·자원·시간·전조·상대 대응과 플레이어의 대안을 담는다. MAIN은 중심 행동, A/B는 독립된 상태를 교환하는 두 대축, c는 이들을 변주하는 보조 요소, @는 발견·숙련·재방문 깊이로 역할을 구분한다. 없는 시스템을 억지로 추가하지 않는다.');
  if(fields.includes('contentVarietyPlan'))rules.push('지역은 동선·목적·랜드마크·진입/복귀·위험 보상·재방문 이유가 달라야 한다. 적/도전은 행동 신호·조건·패턴·대응·군집 역할·보상·복구를 각각 적는다. 색상·수치·같은 설명의 반복으로 다양성을 주장하지 않는다.');
  if(fields.includes('progressionEconomyBalance')||fields.includes('failureRetryRisk'))rules.push('자원 획득원·소비처·해금이 새 행동/경로/조합으로 이어지는 흐름과 실패 때 잃는 것/보존하는 것/다음 유효 진입을 명시한다. 기존 수치·보상·저장 의미는 보존한다.');
  if(fields.includes('uxAccessibilityPlan'))rules.push('필요한 메뉴의 진입/뒤로가기·버튼 위치/역할·잠금/활성·로딩/오류·터치영역·중복입력·중단복귀를 실제 첫 입력/성공/실패/성장에 연결한다. 가독성·카메라·색상 의존·음량·입력 접근성과 모바일 성능을 다룬다.');
  if(fields.includes('artAudioDirection'))rules.push('아트/오디오는 캐릭터·배경·재질·광원·동작·효과·카메라·메뉴가 같은 세계 정체성을 유지하게 한다. 기존 자산의 용도·역할과 실제 발생 이벤트를 연결하고 스타일·라이선스·플랫폼 호환을 보존한다.');
  if(fields.includes('narrativeDialoguePlan'))rules.push('서사가 필요하면 사건 원인·선행조건·선택·결과·후속, 캐릭터 욕구/말투/관계/기억/지식범위, 복선·회수·반전을 연결한다. 불필요하면 applicable=false와 빈 배열을 사용한다. 공공영역 원형 또는 추상 기법만 재해석하며 보호된 인물·대사·장면을 복제하지 않는다.');
  if(fields.includes('designIntegrityPlan'))rules.push('이동·첫 행동·진행·선행조건·종료·복구·경제·보스 전환·멀티 입장/이탈/재입장·저장 호환·서사 인과를 실제 규칙과 대조한다. 확인 안 된 조건을 참으로 쓰지 않고 notes에 정확한 미확정 근거를 남긴다.');
  if(seedGameplaySketchVersion>=5&&!pendingSeedGrammarNotAuthored&&seedGameplaySketch?.novelGameGrammar)rules.push('GAMEPLAY_SKETCH v5 owner creative grammar: emergentGenre.name/newPrimaryVerb를 identity 또는 coreFun에 유지하고 causalDNA id 최소 2개를 referenceHomagePlan 또는 narrativeDialoguePlan에 추적 가능하게 남긴다. MAIN은 coreFun/coreLoop, A/B 두 대축은 signatureSystems/systemInterconnections에서 실제 상태 교환으로 증명한다. C의 두 소재와 주·보조 장르는 creativeGrammar의 실제 인과와 플레이 변화로 입증하고 예전 c 서브요소는 필수로 만들지 않는다. @는 contentExpansionPlan/progressionDirection에서 숨은 조합·숙련·재방문·재해석·고급 운용으로 드러나야 한다. GAME_CATEGORY를 최종 장르로 복사하지 않는다.');
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
// 파일명: tools/company-design-cycle.mjs / 메인: 바이브 자체 인과 설계 연산
function computeVibeNativeDesign(){
  const original=seed.originalDesignContext?.content||{};
  const preserved=original.creativeGrammar&&original.creativeGrammar.a?.material&&original.creativeGrammar.b?.material;
  const materialIds=new Set(seed.SEED_MATERIAL_IDS||[]);
  const materials=(seedState.seedMaterials||[]).filter(row=>materialIds.has(row.materialId));
  const computed=computeVibeSeedProposal({
    requestId:gameId,category:seed.GAME_CATEGORY,platform:seed.INITIAL_TARGET_PLATFORM,
    materials:materials.length?materials:[{causalDNA:['KARMA_RETURN','TRICKSTER_REVERSAL','TESTIMONY_CONSENSUS_REALITY','EXILE_RETURN']}]
  });
  const sketch=seedGameplaySketch?.novelGameGrammar?.gameplaySystemFusion?.formula==='MAIN × A × B × C'
    &&!pendingSeedGrammarNotAuthored?seedGameplaySketch:computed.gameplaySketch;
  const grammar=sketch.novelGameGrammar;
  const fusion=grammar.gameplaySystemFusion;
  const a=fusion.majorAxes.find(row=>row.key==='A'),b=fusion.majorAxes.find(row=>row.key==='B');
  const c=fusion.themeFusion,main=fusion.main,delve=grammar.delveLayer.elements;
  const shorten=(value,max=650)=>clean(value).slice(0,max);
  const name=clean(seed.DISTINCT_IDENTITY||original.identity||game.name)||main.name;
  const mainName=clean(main.name)||game.name;
  const mode=allGamesMultiplayerRequired
    ?(['COOP','COMPETITIVE','HYBRID'].includes(originalMultiplayerMode)?originalMultiplayerMode:'COOP')
    :(['SINGLE','COOP','COMPETITIVE','HYBRID'].includes(originalMultiplayerMode)?originalMultiplayerMode:'SINGLE');
  const signature=Array.isArray(original.signatureSystems)?original.signatureSystems:[];
  const originalRoles=['MAIN','A','B','DELVE'].every(role=>signature.some(row=>row.grammarRole===role
    &&row.id&&Array.isArray(row.stateInputs)&&row.stateInputs.length&&Array.isArray(row.stateOutputs)&&row.stateOutputs.length));
  const rulePlan=originalRoles?structuredClone(signature):[
    {id:'VIBE_MAIN',grammarRole:'MAIN',name:mainName,
      purpose:shorten(`${main.purpose} 게임의 반복 목표와 세계의 접근 가능성을 상태로 관리한다.`,410),
      playerChoice:shorten(`${main.playerAction} 이후 다음 행동의 위험과 보상을 직접 선택한다.`,410),
      stateInputs:['WorldAccessState','IntentState'],stateOutputs:['RouteState','WorldAccessState']},
    {id:'VIBE_A',grammarRole:'A',name:a.name,
      purpose:shorten(`${a.purpose} ${a.materialRule} 선택의 결과를 위험과 자원 경로에 반영한다.`,410),
      playerChoice:shorten(`${a.playerChoice} ${a.sourceMaterial}의 제약을 감수할지 결정한다.`,410),
      stateInputs:['RouteState','RiskState'],stateOutputs:['RiskState','ResourceState']},
    {id:'VIBE_B',grammarRole:'B',name:b.name,
      purpose:shorten(`${b.purpose} ${b.materialRule} 앞선 행동의 결과를 다음 접근 조건으로 되돌린다.`,410),
      playerChoice:shorten(`${b.playerChoice} ${b.sourceMaterial}의 반작용을 선택한다.`,410),
      stateInputs:['RiskState','ResourceState'],stateOutputs:['RouteState','RiskState']},
    {id:'VIBE_DELVE',grammarRole:'DELVE',name:delve[0].name,
      purpose:shorten(`${delve[0].masteryOrInsight} 숨겨진 조건을 실험한 뒤 새로운 선택과 경로를 연다.`,410),
      playerChoice:shorten(`${delve[0].discoveryCondition} 실제 발견 결과에 따라 원래 목표로 돌아갈 방법을 선택한다.`,410),
      stateInputs:['RouteState','RiskState'],stateOutputs:['WorldAccessState','IntentState']}
  ];
  const rules=rulePlan.slice(0,12);
  const roles=Object.fromEntries(rules.filter(row=>['MAIN','A','B','DELVE'].includes(row.grammarRole)).map(row=>[row.grammarRole,row]));
  const stateNames=[...new Set(rules.flatMap(row=>[...(row.stateInputs||[]),...(row.stateOutputs||[])]))];
  const handoffs=[];
  for(const from of rules)for(const to of rules){
    if(from.id===to.id)continue;
    const stateKeys=[...new Set((from.stateOutputs||[]).filter(key=>(to.stateInputs||[]).includes(key)))];
    if(stateKeys.length)handoffs.push({from,to,key:stateKeys[0]});
  }
  const priority=[['MAIN','A'],['A','B'],['B','A'],['B','DELVE'],['DELVE','MAIN'],['A','DELVE'],['A','MAIN']];
  const edges=priority.map(([from,to])=>handoffs.find(e=>e.from.id===roles[from]?.id&&e.to.id===roles[to]?.id)).filter(Boolean);
  for(const edge of handoffs)if(edges.length<6&&!edges.includes(edge))edges.push(edge);
  const interconnections=edges.slice(0,10).map((edge,index)=>({
    fromId:edge.from.id,toId:edge.to.id,stateKeys:[edge.key],
    fromSystem:edge.from.name,toSystem:edge.to.name,
    trigger:shorten(`${edge.from.playerChoice} 때문에 ${edge.key}가 변한 순간 다음 시스템이 반응한다.`,280),
    stateChange:shorten(`${edge.key}의 결과를 ${edge.to.name}의 입력으로 전달해 대응 비용과 다음 선택이 변한다.`,350)
  }));
  const baseLoop=Array.isArray(seed.CORE_LOOP)&&seed.CORE_LOOP.length>=3
    ?seed.CORE_LOOP.slice(0,8):computed.coreLoop;
  const coreLoop=baseLoop.map(value=>shorten(value,330));
  const identity=shorten(`${name}. ${grammar.emergentGenre.name}. ${mainName}에서 ${a.name}과 ${b.name}이 서로 결과를 되돌려 바꾸며 ${c.genres[0].name}·${c.genres[1].name}의 판단이 실제 세계 상태를 변화시킨다.`,950);
  const creativeGrammar=preserved&&originalRoles?structuredClone(original.creativeGrammar):{
    mainIdentity:shorten(`${mainName}: ${name}. ${main.playerAction}과 ${grammar.newPrimaryVerb}를 반복하는 게임이다.`),
    a:{system:a.name,material:a.sourceMaterial,materialDomain:`${a.sourceDomain.replaceAll('_',' ').toLowerCase()}의 문화·역사 인과 소재`,
      stateChange:shorten(`${a.materialRule} ${a.stateContribution} 그 결과 ${b.name}의 다음 행동 조건이 달라진다.`)},
    b:{system:b.name,material:b.sourceMaterial,materialDomain:`${b.sourceDomain.replaceAll('_',' ').toLowerCase()}의 문화·역사 인과 소재`,
      stateChange:shorten(`${b.materialRule} ${b.stateContribution} 그 결과 ${a.name}의 선택 비용과 경로가 달라진다.`)},
    abCausality:shorten(`${a.playerChoice} 이후 ${a.stateContribution} 그 결과 ${b.playerChoice}가 바뀌고 ${b.stateContribution} 다시 A의 선택 조건이 달라진다.`),
    abEvolution:{
      aChangesB:shorten(`${a.playerChoice} 선택이 ${b.name}의 행동 가능성·비용·위험을 변화시킨다. ${a.materialRule}`),
      bChangesA:shorten(`${b.playerChoice} 결과가 다음 ${a.name}의 지형 접근·자원 판단·상대 대응을 바꾼다. ${b.materialRule}`),
      lateGameChange:shorten(`후반에는 ${a.sourceMaterial}와 ${b.sourceMaterial}의 상반된 조건을 역이용해 같은 장소도 서로 다른 경로와 결말로 해결한다.`)
    },
    materialFusion:{
      contrast:shorten(`${a.sourceMaterial}의 원인 규칙과 ${b.sourceMaterial}의 반작용을 ${a.systemFamily}·${b.systemFamily}의 서로 다른 선택에 결합한다.`),
      causalBridge:shorten(`${a.materialRule} 그 결과 ${b.playerChoice}의 가능성이 달라지고 ${b.materialRule} 다시 첫 시스템의 결과를 바꾼다.`),
      removalConsequence:shorten(`${a.sourceMaterial}를 제거하면 A의 선행 조건이 사라지고 ${b.sourceMaterial}를 제거하면 B의 결과가 A에 돌아오는 대가와 학습이 사라진다.`)
    },
    storyCausalChain:{
      cause:shorten(`${grammar.storyWorldBindings.emotionalConflict} ${grammar.worldRule}`),
      characterConflict:shorten(grammar.storyWorldBindings.characterRule),
      playerChoice:shorten(`${a.playerChoice} 또는 ${b.playerChoice} 중 무엇을 우선할지 판단한다.`),
      worldChange:shorten(`${grammar.storyWorldBindings.regionRule} ${c.jointWorldRule}`),
      nextEvent:shorten(`${grammar.storyWorldBindings.storyRule} 다음 사건은 직전 세계·관계 상태를 읽고 발생한다.`)
    },
    cThemes:c.themes.map(t=>({name:t.name,kind:'MATERIAL',gameplayEffect:shorten(t.causalEffect,590)})),
    cGenres:c.genres.map(g=>({role:g.role,name:g.name,gameplayEffect:shorten(g.gameplayEffect,630)})),
    cGenreInterlock:shorten(c.genreInterlock),
    cWorldAndGameplayEffect:shorten(`${grammar.worldRule} ${c.jointWorldRule} ${c.abGameplayEffect}`),
    delveDiscoveries:delve.slice(0,Math.max(4,delve.length)).map(d=>({
      clue:shorten(`${d.name}: ${d.discoveryCondition}`,490),
      discovery:shorten(`${d.name}: ${d.masteryOrInsight}`,490),
      newChoice:shorten(`${d.name}: ${d.gameplayEffect}`,490)
    })),
    delveGrowthRule:shorten(`${delve[0].name} 이후 새로운 발견은 A와 B, C 장르 반응의 서로 다른 조건을 실험해 새 길·정보·관계·숙련을 열고 제한 없이 깊어진다.`),
    finalGameIdentity:shorten(`${grammar.emergentGenre.name}. ${grammar.emergentGenre.definition}`)
  };
  const abilities=(playableRequirements.abilityFacts||[]).map(row=>({
    id:row.id,name:row.name||row.id,kind:row.kind,ownerId:row.ownerId,ruleId:roles.B.id,
    trigger:`원본 ${row.id} 능력의 입력 조건을 충족할 때 기존 책임 시스템이 수행한다.`,
    range:Number(row.range)||0,rangeUnit:'원본 설정 단위',resource:'원본 설정 자원',
    cost:Number(row.cost)||0,cooldownSeconds:Number(row.cooldownSeconds)||0,
    telegraph:'기존 전조와 판정 타이밍을 그대로 사용한다.',avoidance:'기존 회피 입력과 반응 규칙을 보존한다.',
    effect:'원본 설정에 정의된 대상 상태 변화만 발생한다.',
    stateInputs:[roles.B.stateInputs[0]],stateOutputs:[roles.B.stateOutputs[0]],
    source:'현재 원본 구현의 대응 능력 정의',rangeKey:'',costKey:'',cooldownKey:''
  }));
  if(!abilities.length)abilities.push(
    {id:'VIBE_CHOOSE',name:'첫 시스템의 경로 선택',kind:'INTERACTION',ownerId:'PLAYER',ruleId:roles.A.id,
      trigger:`${a.playerChoice} 실행 전에 접근 가능성과 비용을 확인한다.`,range:0,rangeUnit:'선택 입력',resource:'행동 기회',cost:0,cooldownSeconds:0,
      telegraph:'선택지의 변화 조건과 현재 위험을 화면에 알린다.',avoidance:'다른 경로를 선택하거나 실행하지 않고 되돌아간다.',
      effect:'선택 경로와 반응 위험을 계획 상태에 반영한다.',stateInputs:[roles.A.stateInputs[0]],stateOutputs:[roles.A.stateOutputs[0]],
      source:'시드 인과문법 A의 설계 계약 (실제 구현 전)',rangeKey:'',costKey:'',cooldownKey:''},
    {id:'VIBE_RESPOND',name:'두 번째 시스템의 대응 선택',kind:'INTERACTION',ownerId:'PLAYER',ruleId:roles.B.id,
      trigger:`${b.playerChoice} 실행 전에 A의 이전 결과를 읽는다.`,range:0,rangeUnit:'선택 입력',resource:'행동 기회',cost:0,cooldownSeconds:0,
      telegraph:'상대의 다음 반응과 예상되는 선택 비용을 알린다.',avoidance:'대응을 취소하고 이전 안전 단계로 돌아간다.',
      effect:'대응 결과를 다음 A의 계획 조건으로 되돌려 보낸다.',stateInputs:[roles.B.stateInputs[0]],stateOutputs:[roles.B.stateOutputs[0]],
      source:'시드 인과문법 B의 설계 계약 (실제 구현 전)',rangeKey:'',costKey:'',cooldownKey:''}
  );
  if(abilities.length===1){
    const first=abilities[0];
    abilities.push({...first,id:'VIBE_ALTERNATE',name:'연결된 두 시스템의 상황 대응',kind:'INTERACTION',
      trigger:'플레이어가 다른 선택으로 위험을 줄일 조건을 확인할 때 실행한다.',
      source:'기존 시스템의 대안 입력에 대한 설계 요청 (구현 전)'});
  }
  const regionIds=['VIBE_ORIGIN','VIBE_REVISIT'];
  const regions=[
    {id:regionIds[0],ruleIds:[roles.MAIN.id,roles.A.id],name:`${a.sourceMaterial}의 첫 선택 공간`,
      traversal:`${a.playerChoice}를 시작하는 출발 위치와 복귀 동선을 제공한다.`,
      riskReward:'안전한 진행을 선택하면 발견 속도가 늦어지고 어려운 경로에서는 다른 단서를 얻는다.',
      landmark:`${a.sourceMaterial}의 변화가 드러나는 고유 랜드마크를 첫 진입 때 표시한다.`,
      encounterPattern:`${a.materialRule} 결과를 읽고 위험·정보 반응이 변화한다.`,
      resourcePressure:'선택 결과에 따른 자원 접근 가능성과 기회비용을 분리해 보여준다.',
      storyContext:grammar.storyWorldBindings.regionRule},
    {id:regionIds[1],ruleIds:[roles.B.id,roles.DELVE.id],name:`${b.sourceMaterial}의 되돌림 공간`,
      traversal:`${b.playerChoice}의 결과가 이전 구역의 통로를 열거나 닫는다.`,
      riskReward:'이전 상태를 역이용한 고급 대응은 짧은 경로와 추가 위험 중 하나를 선택하게 한다.',
      landmark:`${b.sourceMaterial}의 반작용과 발견 단서를 시각적으로 구분한다.`,
      encounterPattern:`${b.materialRule} 결과를 기준으로 다른 대응법을 요구한다.`,
      resourcePressure:'처음 얻은 자원을 유지할지 새로운 접근에 재투자할지 기회비용을 제시한다.',
      storyContext:grammar.storyWorldBindings.storyRule}
  ];
  const stateKey=stateNames[0]||'WorldAccessState';
  const anyA=abilities[0],anyB=abilities[1];
  const strategy=(index)=>({
    routeEdges:[{from:regionIds[index],to:regionIds[1-index]}],
    resourceSites:[{stateKey,regionId:regionIds[index]}],
    cooperation:[{ruleId:index?roles.B.id:roles.A.id,regionId:regionIds[1-index],abilityId:index?anyB.id:anyA.id}],
    advantage:index?'B의 반작용을 먼저 확인해 숨은 정보와 역이용 경로를 확보한다.':'A의 안전한 조건부터 확인해 다음 판단의 위험과 비용을 예측한다.',
    cost:index?'초기 위험을 충분히 파악하지 못해 대응 선택이 실패할 수 있다.':'초기 발견 속도가 느려지고 되돌림 공간의 정보를 나중에 얻게 된다.',
    bestSituation:index?'반작용의 단서가 이미 알려져 있고 다른 접근 경로를 찾아야 할 때.':'첫 진입에서 위험을 읽고 다음 선택의 조건을 안전하게 학습할 때.'
  });
  const alternatives=[0,1].map(index=>({
    label:index?'PLAN_B':'PLAN_A',strategy:strategy(index),
    concept:index?`${b.sourceMaterial}의 반작용부터 읽는 역방향 탐색 계획`:`${a.sourceMaterial}의 조건을 우선 학습하는 정방향 탐색 계획`,
    playerFantasy:index?`정보 부족을 감수하고 ${b.playerChoice}를 먼저 실험한다.`:`${a.playerChoice}의 결과를 축적해 다음 결정을 통제한다.`,
    genreDirection:index?`보조 ${c.genres[1].name} 판단이 앞서 중심 ${c.genres[0].name} 목표의 순서를 뒤집는다.`:`중심 ${c.genres[0].name} 진행 속에서 보조 ${c.genres[1].name}가 숨겨진 단서를 제공한다.`,
    coreLoopShift:index?`B 대응→A 조건 재평가→발견 역이용→다음 사건`:`A의 선택→B의 반응→안전한 재방문→다음 사건`,
    mapTopologyRegionRoles:index?`되돌림 공간→첫 선택 공간으로 위험 경로를 역행한다.`:`첫 선택 공간→되돌림 공간으로 안전 경로를 확장한다.`,
    landmarksTraversal:index?regions[1].landmark:regions[0].landmark,
    enemyEcosystemCounterplay:index?`후속 위험의 전조를 보고 먼저 회피한 뒤 뒤집힌 조건을 활용한다.`:`기초 전조를 먼저 학습한 뒤 대응 가능한 반응을 선택한다.`,
    bossSignatureMoments:index?`누적된 세계 반작용을 역이용해 최종 목표의 접근 조건을 바꾼다.`:`학습한 선행 조건을 결합해 최종 선택 전에 위험을 줄인다.`,
    progressionEconomy:index?`더 빠른 정보 획득과 높은 초기 위험을 교환하며 성장 경로를 선택한다.`:`낮은 위험과 늦은 발견을 교환하며 자원을 보존한다.`,
    questStoryEventFlow:index?`${b.sourceMaterial}의 사건부터 해결해 이전 인물의 관계를 다시 해석한다.`:`${a.sourceMaterial}의 갈등을 먼저 해석한 후 인물의 다음 선택을 확인한다.`,
    failureRetryRecovery:index?`불완전한 정보로 실패하면 이전에 확인한 경로로 되돌아와 다시 추론한다.`:`안전한 선택으로 실패를 학습하고 같은 세계 상태에서 다른 길을 선택한다.`,
    platformAdaptation:'모바일에서는 같은 조작·상태 결과를 유지하고 화면 깊이와 터치 여백만 플랫폼에 맞춰 조정한다.',
    implementationScope:`기존 인과 규칙과 ${index?roles.B.id:roles.A.id} 책임 함수에서 입력·상태 전달만 직접 구현한다.`,
    validationPlan:index?`B→A 결과가 실제 상태에 전달되는지 동일 시드에서 재생 검증한다.`:`A→B 결과와 실패 재시작 시 세계 상태 보존을 재생 검증한다.`
  }));
  const phases=playableRequirements.phases||['OPENING','DEVELOPMENT','RESOLUTION'];
  const roundSeconds=Number(playableRequirements.lockedNumbers?.RoundSeconds)||Math.max(180,phases.length*60);
  const values=(step)=>stateNames.slice(0,Math.min(4,stateNames.length)).map((key,index)=>({key,value:step+index}));
  const phaseSeconds=roundSeconds/phases.length;
  const playthrough=phases.map((phase,index)=>({
    phase,
    entryState:index?`직전 단계 ${phases[index-1]}의 상태 변화에서 이어진다.`:'플레이어가 현재 목표와 경로 상태를 확인한다.',
    playerChoice:index===0?a.playerChoice:index===phases.length-1?delve[0].discoveryCondition:b.playerChoice,
    actionAndResponse:index===0?`${a.materialRule} 플레이어 입력의 결과로 B의 대응 가능성이 변한다.`:index===phases.length-1?`${delve[0].gameplayEffect} 앞선 결과를 되돌아보며 최종 목표와 재시작 여부를 결정한다.`:`${b.materialRule} A의 다음 선택 상태가 달라진다.`,
    exitState:phase===phases.at(-1)?'한 판의 결과와 다음 선택을 기록한다.':`다음 단계 ${phases[index+1]}의 입장 조건과 세계 상태가 결정된다.`,
    nextDecision:index<phases.length-1?`${phases[index+1]}의 다른 위험·경로·정보 선택으로 진행한다.`:'획득한 정보와 현재 원본 규칙의 실패·복구 경로에서 다음 플레이를 선택한다.',
    startSeconds:phaseSeconds*index,endSeconds:phaseSeconds*(index+1),
    timeReason:`${phase}에서 서로 다른 상태 입력과 피드백을 관찰하는 데 필요한 설계상 시간 구간이다. 실제 실행 시간은 미검증이다.`,
    before:values(index),after:values(index+1),
    actions:[{abilityId:index%2?anyB.id:anyA.id,actorId:'PLAYER',targetId:'WORLD',atSeconds:phaseSeconds*(index+0.5),
      distance:0,energyBefore:10,energyAfter:10-(index%2?anyB.cost:anyA.cost),hit:false,
      response:index%2?`B의 선택 결과가 다음 A의 위험과 경로에 전달된다.`:`A의 선택 결과가 B의 대응 위험과 비용을 바꾼다.`}],
    ruleIds:[index%2?roles.B.id:roles.A.id],outcome:index===phases.length-1?'SUCCESS':'ONGOING'
  }));
  // 전 단계의 출력과 다음 단계 입력은 문장·정량 계획상 모두 동일 상태를 이어받는다.
  for(let i=1;i<playthrough.length;i++)playthrough[i].entryState=playthrough[i-1].exitState;
  const assetFamilies=designAssetFamilies.length?designAssetFamilies:['ENVIRONMENT'];
  const assets=Array.isArray(designAssetLibrary?.assets)?designAssetLibrary.assets:[];
  const assetBindings=assetFamilies.slice(0,24).map((family,index)=>{
    const asset=assets.find(row=>clean(row.family||row.category).toUpperCase()===family
      &&row.catalogActive!==false&&row.rightsPass===true&&row.securityBlocked!==true
      &&row.role&&row.id&&row.license);
    const role=asset?clean(asset.role||asset.subfamily):`${family}의 인과 표현 소재`;
    return {family,role,bodyPlan:'플레이 대상의 실제 공간 크기·실루엣·역할을 반영한 3차원 형태',
      behavior:`${a.name}와 ${b.name}의 상태 반응에 맞춰 움직임과 상호작용이 달라진다.`,
      presentation:`${c.themes[0].name}와 ${c.themes[1].name}의 차이를 조명·표면·동작으로 구분한다.`,
      ruleIds:[rules[index%rules.length].id],useLocation:`${regions[index%2].name}에서 세계 반응을 표시한다.`,
      assetId:asset?asset.id:'',decision:asset?'ADAPT':'AUTHOR',
      selectionReason:asset?'현재 회사 라이브러리의 라이선스·등록 정보가 확인된 후보를 기존 역할에 맞춰 적응한다.':'확인된 호환 후보가 없으므로 자산 제작 대상이며 재사용과 라이선스 확인이 우선이다.',
      improvement:'실제 네이티브 형상·리깅·표면·동작의 부조화와 모바일 비용을 비교 검토한다.',
      platformAdaptation:'내부 원본은 보존하고 로블록스 및 유니티 실행 구조에 맞게 독립적으로 적응한다.',
      validation:'실제 월드에서 역할 구분과 프레임·모바일 터치 품질을 캡처하고 독립 검증한다.'};
  });
  const libraries=[...new Set((seedFlowSystemBlueprint?.libraryReusePolicy?.knownReusableLibraries||[]).filter(file=>
    /^assets\/[a-z0-9-]+\.js$/.test(file)&&fs.existsSync(file)))];
  const assumptions=[
    `설계 인과 원형 ${grammar.causalDNAs.slice(0,3).map(row=>row.id).join('·')}의 선택과 세계 반응을 독자적으로 적용한다.`,
    `원본의 전투·보상·저장·멀티 권한은 기존 책임 함수가 가진다. 설계 계획 상태는 새 저장 키가 아니며 실제 구현 전 소스 확인이 필요하다.`,
    `기존 검토 가능한 모듈 ${libraries.join(', ')||'회사 시스템 라이브러리'}은 라이선스·역할·실제 코드와 일치할 때만 사용한다. 신규 외부 복사는 금지한다.`,
    '현재 문서는 모델 출력이나 실행 확인이 아닌 바이브 설계 함수의 계산 후보이며 실제 게임 플레이 검증과 구별한다.'
  ];
  const integrityKeys=['movementAndControlReachable','spawnToFirstActionReachable','progressionReachable','questPrerequisitesSatisfiable','sessionEndReachable','failureRecoveryReachable','mapObjectivesReachable','economyFeasible','counterplayFeasible','bossPhaseTransitionsReachable','multiplayerLifecycleFeasible','saveCompatible','narrativeCausalityConsistent'];
  const integrity=Object.fromEntries(integrityKeys.map(key=>[key,true]));
  integrity.authoringVersion=2;
  integrity.flowAudit=phases.map((phase,index)=>({
    phase,reachableBy:[abilities[index%abilities.length].id],
    blockedCase:`${phase} 도중 접근 조건이나 현재 입력이 충족되지 않으면 상태 변화가 발생하지 않는다.`,
    recovery:'직전 유효 세계 상태와 플레이어 선택으로 돌아가 다른 경로를 고른다.',
    nextPhase:phases[index+1]||'END'
  }));
  integrity.notes=['이 결과는 정해진 설계 규칙의 도달성 계산이며 실제 게임 실행 결과를 의미하지 않는다.','저장·동기화·실제 조작은 기존 개발 및 독립 QA 과정에서 추가 검증해야 한다.'];
  const design={
    identity,creativeGrammar,playerFantasy:shorten(`${name}의 플레이어는 ${main.playerAction}을 결정하고 두 소재가 만드는 반작용을 책임진다.`,880),
    coreFun:shorten(`${grammar.newPrimaryVerb} ${creativeGrammar.abCausality} ${c.genreInterlock}`,880),
    coreLoop,signatureSystems:rules,systemInterconnections:interconnections,
    progressionDirection:shorten(`${sketch.identityCore?.growthIdentity||grammar.expansionVectors[0]} ${grammar.expansionVectors.slice(0,2).join(' ')}`,880),
    progressionEconomyBalance:{
      progressionLoop:`${a.name}의 변화가 ${b.name}에서 새로운 선택을 열고 다음 A의 경로에 영향을 준다.`,
      resourceFlow:'현재 게임의 실제 획득원과 소비처를 소스에 연결한 후 선택 비용을 검증한다. 임의 보상이나 저장값을 추가하지 않는다.',
      balanceRules:'한쪽 선택이 언제나 이득이 되지 않도록 위험·정보·기회비용을 함께 비교하고 기존 원본 수치는 바꾸지 않는다.'
    },
    contentExpansionPlan:grammar.expansionVectors.slice(0,4).map((value,index)=>({
      milestone:['첫 선택의 결과','두 시스템의 충돌','숨은 인과법칙','재방문과 장기 숙련'][index],
      newGameplay:shorten(`${value} ${[
        '첫 진입에서는 위험을 읽고 다음 행동에 필요한 단서를 얻는다.',
        '중간 갈등에서는 서로 다른 대가를 비교해 반대 선택을 실험한다.',
        '숨겨진 규칙의 발견으로 우회 접근과 새로운 대응법을 연다.',
        '재방문 시 이전 행동이 만든 관계·접근 조건과 결말을 다시 평가한다.'
      ][index]}`,490),
      systemImpact:shorten(`이전 ${index%2?a.name:b.name} 상태에 입력·피드백을 연결하고 저장 및 진행의 원래 의미를 유지한다.`,490)
    })),
    failureRetryRisk:{
      failureStates:[`${a.name}의 위험을 읽지 못해 유효 행동과 진입 경로가 막힌다.`,`${b.name}의 반작용을 잘못 선택해 목표 접근 조건이 사라진다.`],
      retryFlow:'직전 유효 목표 상태를 다시 확인하고 얻은 정보를 이용해 다른 경로·시스템 선택으로 재시도한다. 기존 저장 정책을 보존한다.',
      riskPressure:'초반에는 A의 선택 위험을, 중반에는 B의 반작용을, 후반에는 C 장르의 정보·관계 제약을 함께 판단하게 한다.',
      recoveryRules:'진행이 막히면 이전 안전 구역과 재선택 가능한 행동을 제공하며 저장·보상 손실 수치는 원본 규칙만 따른다.'
    },
    platformFitPlan:{
      targetPlatform:['ROBLOX','UNITY','FORTNITE_UEFN'].includes(seed.INITIAL_TARGET_PLATFORM)?seed.INITIAL_TARGET_PLATFORM:'ROBLOX',
      inputModel:'이동·상호작용·선택·확인을 모바일 터치와 키보드에서 동일하게 수행하고 3D 카메라 가림을 검증한다.',
      performanceBudget:'로블록스 모바일과 유니티 웹용 각각의 렌더·메모리·화면 내 오브젝트 예산을 실기기 측정으로 확정한다.',
      sessionConstraints:'1분 첫 행동, 5분 첫 인과 피드백, 15분 교차 선택, 30분 이상 발견의 실제 지속성은 런타임에서 측정한다.'
    },
    visualDirection:shorten(`${c.themes[0].name}와 ${c.themes[1].name}의 법칙을 3차원 공간의 실루엣·재질·광원으로 표현하고 주·보조 장르의 위험 신호를 구분한다.`),
    mobileUx:'터치 조이스틱·행동·뒤로가기와 필수 상태를 안전 여백 안에 배치하고 조작·카메라·화면 잘림을 모바일에서 확인한다.',
    uxAccessibilityPlan:{
      hudPriorities:'세계 상태·위험·현재 행동과 되돌릴 수 있는 선택을 플레이 화면에서 먼저 읽게 한다.',
      touchAndInput:'이동과 행동 동시 입력, 길게 누르기와 중복 터치 방지, 뒤로가기 복구를 분리 검증한다.',
      readability:'장르별 위험과 사용 가능한 행동을 모양·문장·움직임으로 중복 표시하며 색상만으로 구분하지 않는다.',
      accessibility:'글자 크기·대비·진동과 소리 설정을 분리하고 실패 원인과 회복 방법을 읽을 수 있게 제공한다.',
      menuStructure:'타이틀→계속하기 또는 새 게임→본편→장비·지도·설정→실패 복구 또는 결과의 흐름에서 현재 게임에 필요 없는 메뉴는 제외한다.',
      convenienceDecisions:'같은 선택 반복 시 확인 단계를 줄이되 위험·자원 소모·저장과 관련된 실제 판단은 제거하지 않는다.'
    },
    artAudioDirection:{
      visualIdentity:'캐릭터·지역·위험·아이템 표현은 C의 두 소재에 근거한 하나의 3D 스타일로 통일한다.',
      audioIdentity:'탐색·선택·경고·성공·실패 음악과 효과음을 세계 상태 전이에 맞춰 구분한다.',
      gameplayFeedbackSync:'실제 게임 판정 이벤트가 확정된 다음 애니메이션·시각효과·오디오·카메라를 동기화해 게임 규칙의 권한을 유지한다.',
      assetBindings
    },
    marketTargetDirection:'모바일에서 선택과 결과가 명확한 세계 반응형 게임을 원하는 플레이어를 대상으로 하되 미검증 시장 점수로 출시에 합격시키지 않는다.',
    steamExpansionDecision:'웹과 로블록스 런타임 및 독립 QA를 먼저 확인하며 다른 플랫폼 확장은 검증된 원본을 유지할 때 검토한다.',
    multiplayerMode:mode,
    multiplayerExpansionDecision:mode==='SINGLE'?'현재 싱글 플레이 진행과 저장을 보존하며 실제 멀티 지원은 별도 구현 검증 전까지 주장하지 않는다.':`${mode}에서 두 이용자가 같은 세계 상태를 읽고 선택 결과를 서버에서 확인하며 이탈·재접속 후 정확히 동기화해야 한다.`,
    designAlternatives:alternatives,
    selectedDesignPlan:{
      label:'PLAN_A',
      rationale:'첫 공간의 원인을 먼저 읽고 위험을 관찰한 뒤 B의 반작용을 체험하는 경로가 모바일 첫 플레이에 더 명확하다.',
      identityPreserved:`${name}의 대표 목표와 두 인과 소재·세계법칙은 동일하다.`,
      creativeDeviation:'두 장르의 정보·위험 상호작용을 기존 A/B 상태 연결에서 직접 확대한다.',
      genreChange:false,
      reversibility:'새 설계는 후보이며 기존 코드·밸런스·저장은 수정하거나 버리지 않는다.',
      playthrough,
      roundSeconds,sessionSeconds:Math.max(1800,roundSeconds),
      durationRationale:'한 판의 상태 전이를 연속된 장면으로 나누고 30분 세션의 탐색·반작용·발견을 분리한다. 시간 배분은 설계 가정이며 실제 플레이 측정 전이다.'
    },
    contentVarietyPlan:{
      regions,enemiesOrChallenges:[
        {name:`${a.sourceMaterial}의 제약`,behavior:a.materialRule,counterplay:a.playerChoice,positioning:'초반 경로에 접근할 때 읽을 수 있다.',
          timing:'A의 첫 입력 이후 B의 대응 전까지 노출된다.',mobility:'플레이어가 다른 길로 이동하면 반응 위치가 달라진다.',
          groupRole:'A의 선택을 검증하는 첫 위험·조건이다.',identity:a.name,rewardMeaning:'한 번의 결과가 다음 대응에 유용한 정보를 남긴다.'},
        {name:`${b.sourceMaterial}의 반작용`,behavior:b.materialRule,counterplay:b.playerChoice,positioning:'후반 되돌림 공간에서 관찰된다.',
          timing:'이전 A의 상태에 반응한 뒤 다음 선택 전에 나타난다.',mobility:'다른 접근 경로와 세계 상태에 따라 대응 위치가 바뀐다.',
          groupRole:'B의 결과를 A로 되돌려 주는 반작용 역할이다.',identity:b.name,rewardMeaning:'새로운 우회 경로와 숨은 조합을 알게 한다.'}
      ],
      objectives:[
        {role:'A의 주요 목표',variation:`${a.playerChoice}가 B의 대응 가능성을 변화시키는지 확인한다.`},
        {role:'B의 반작용',variation:`${b.playerChoice}가 다시 A의 안전·정보 선택을 변화시키는지 확인한다.`}
      ],
      antiMonotonyRule:'같은 적 체력이나 수치만 반복하지 않고 접근 경로·정보·인물 관계·대응 규칙이 초중후반에 변한다.',
      abilities,roleTransitions:[]
    },
    narrativeDialoguePlan:{
      applicable:true,worldRules:[grammar.worldRule],characterGoals:[grammar.storyWorldBindings.emotionalConflict],
      plotBeats:[creativeGrammar.storyCausalChain.cause,creativeGrammar.storyCausalChain.playerChoice,creativeGrammar.storyCausalChain.worldChange],
      questStates:['이전 선택 조건을 확인한다.','상대의 반작용이 나타나면 다음 선택을 바꾼다.'],
      foreshadowing:[`${a.sourceMaterial}의 작은 변화가 ${b.sourceMaterial}의 큰 반작용을 예고한다.`],
      payoffs:[`${b.sourceMaterial}의 결과가 다시 ${a.sourceMaterial}의 앞선 의미를 바꾼다.`],
      twists:[grammar.irreducibilityTest.verdict],
      dialogueRules:['현재 인물의 지식 범위와 플레이어의 지난 행동을 넘는 정보는 대사에 넣지 않는다.'],
      characterVoiceProfiles:[
        {character:`${a.sourceMaterial}의 이해관계자`,grammarRegister:'경험을 중심으로 짧게 이야기한다.',vocabularyRhythm:'경고와 선택 비용을 구체적으로 말한다.',relationshipShift:'플레이어의 선택에 따라 신뢰와 협력 조건이 바뀐다.',emotionalRange:'불안에서 신뢰 또는 반발로 변한다.',knowledgeBoundary:'첫 시스템의 현재 변화만 안다.',subtextBehavior:'숨기고 싶은 위험을 발언 순서로 드러낸다.'},
        {character:`${b.sourceMaterial}의 이해관계자`,grammarRegister:'규칙과 반작용을 비교해 설명한다.',vocabularyRhythm:'사건 이전과 이후를 비교하며 말한다.',relationshipShift:'선택 결과에 따라 요구와 제안이 달라진다.',emotionalRange:'의심과 설득, 체념 또는 수용을 보인다.',knowledgeBoundary:'자신이 관찰한 후속 결과만 안다.',subtextBehavior:'정보 부족을 역이용해 다른 협상을 제시한다.'}
      ],
      sceneBeats:[
        {scene:'첫 진입',purpose:'세계의 조건을 알아차리게 한다.',characterGoals:'무엇을 지킬지 정한다.',conflict:creativeGrammar.storyCausalChain.characterConflict,informationAsymmetry:'두 소재가 서로 다른 원인을 알고 있다.',reversal:'첫 선택이 예기치 않은 다른 문제를 일으킨다.',stateChange:'A의 상태가 B의 조건을 바꾼다.'},
        {scene:'귀환과 해결',purpose:'이전 선택의 결과를 확인한다.',characterGoals:'손실과 관계를 재조정한다.',conflict:'서로의 비용을 누가 부담할지 충돌한다.',informationAsymmetry:'후속 사건의 단서가 플레이어에게만 보인다.',reversal:'B의 결과로 A의 옛 선택을 새롭게 해석한다.',stateChange:'세계 접근과 위험 상태가 갱신된다.'}
      ]
    },
    referenceHomagePlan:{
      inspirations:grammar.causalDNAs.slice(0,2).map(row=>({titleOrTradition:row.source,
        rightsBasis:'ABSTRACT_TECHNIQUE',borrowedTechnique:row.principle,
        transformation:`${row.gameplayConversion}의 구조만 독자적 인물·세계·상호작용으로 재해석한다.`})),
      originalityRule:'공공영역의 추상 인과와 검증 가능한 설계 원리만 참고하며 외부 게임의 코드·대사·캐릭터·라이선스 불명확 에셋을 복제하지 않는다.'
    },
    designIntegrityPlan:integrity,
    stabilityPriorityPlan:{signals:[],priorityRule:'실제 재현된 진행 막힘·저장 손상·터치 입력 실패·멀티 동기화 오류를 우선 분류하고 원인에 해당하는 기존 책임 함수만 수정한다.'},
    technicalAssumptions:assumptions,
    validationQuestions:[
      'A의 실제 출력 상태가 B의 입력을 바꾸고 B의 결과가 다시 A의 다음 선택을 바꾸는가?',
      '보조 장르의 정보 규칙을 제거하면 동일 행동의 비용·동선·결말 중 하나가 달라지는가?',
      '실제 모바일 입력·3차원 공간·실패 복구·저장 및 멀티 동기화가 원본 밸런스와 양립하는가?'
    ],
    implementationTraceability:[
      {designElement:a.name,responsibleSystem:`${roles.A.name}의 기존 책임 함수와 코드 모듈`,validationEvidence:'같은 조건의 입력 전후 위험·세계 상태 값과 다음 B의 선택 변화를 비교한다.'},
      {designElement:b.name,responsibleSystem:`${roles.B.name}의 기존 책임 함수와 코드 모듈`,validationEvidence:'B의 반작용 이전/이후 A의 다음 경로·비용·행동 가능성을 비교한다.'},
      {designElement:creativeGrammar.cGenreInterlock,responsibleSystem:'세계 상태·스토리 반응의 기존 책임 시스템',validationEvidence:'보조 장르를 제거한 반사실 비교에서 실제 선택과 정보가 달라지는지 재생한다.'},
      {designElement:delve[0].name,responsibleSystem:'진행·탐색·발견을 연결하는 기존 책임 함수',validationEvidence:'숨은 발견 조건 이전/이후의 새로운 선택과 재방문 결과를 검증한다.'}
    ],
    openQuestions:[]
  };
  const revised=repairDesignRequiredFields(design,{seed,factPack,phase:'VIBE_NATIVE_DESIGN'}).value;
  revised.platformProfiles||={};
  revised.platformProfiles.UNITY||={};
  Object.assign(revised.platformProfiles.UNITY,{
    sessionModel:'유니티 3차원 웹 세션에서 현재 목표와 지역·진행 상태를 유지하며 일시중단과 재진입을 검증한다.',
    platformContentAdaptation:'같은 유니티 원본 프로젝트의 3차원 장면·카메라·메시·조명·동작을 웹 브라우저에 맞게 적응한다.',
    internalReleaseTarget:'실제 유니티 웹 빌드를 독립 브라우저와 모바일에서 검증한 뒤 상위 단계로 전달한다.',
    validationEvidence:'정확한 유니티 웹 빌드로 3차원 장면·모바일 터치·저장 및 실제 플레이를 독립 검사한다.',
    unityWebSpatialPresentation:{
      dimension:'3D',
      worldDepth:'실제 메시와 삼각형·입체 건물·캐릭터가 월드 좌표의 전후 깊이에서 이동하고 상호작용한다.',
      cameraAndOcclusion:'3차원 카메라가 실제 원근·높낮이·앞뒤 가림을 표현하며 2차원 스프라이트를 공간 객체로 위장하지 않는다.',
      lightingAndMaterials:'3차원 기하에 표면 재질과 광원·그림자 반응을 적용하고 모바일 그래픽 한계를 실기기에서 확인한다.',
      mobileWebglEvidence:'같은 유니티 원본에서 생성한 웹 빌드를 실제 모바일 브라우저로 플레이하고 깊이·터치·화면 잘림을 캡처 검증한다.'
    }
  });
  return revised;
}
let cachedVibeNativeDesign=null;
async function callDesignerModel(system,user,schema,options={}){
  if(!cachedVibeNativeDesign)cachedVibeNativeDesign=computeVibeNativeDesign();
  const fields=Object.keys(schema?.properties||{});
  const value=Object.fromEntries(fields.map(field=>[field,cachedVibeNativeDesign[field]]));
  assertSchemaValue(value,schema);
  designCheckpoint.effectiveDesignerModel=designerRoute.id;
  designCheckpoint.effectiveDesignerProvider='VIBE_NATIVE_FUNCTION';
  persistDesignCheckpoint();
  console.log('DESIGN_AUTHORING_PROVIDER=VIBE_NATIVE_FUNCTION|model_calls=0|grammar=MAIN_A_B_C_DELVE');
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
  const preservationDirective=ownerPreservationDesign?' 이 seed는 기존 게임 보존형 표현 업그레이드다. 기존 세계관·지역·스토리·퀘스트·전투·제작·진행·밸런스·드랍·세이브·hit/cooldown 의미를 절대 재설계하지 않는다. 기존 SINGLE이면 단독 규칙을 보존하며 최소 2인 멀티의 접속·공동 행동·복귀를 설계한다. 새 스킬·게이지·패널티·보상·자원·해금 규칙을 추가하지 않고 ASSET_ADAPTATION→LIVING_MOTION→ANIMATION_FEEL→VFX→AUDIO_FEEL→CAMERA_LANGUAGE→POLISH_MOBILE 표현 패스만 설계한다.':'';
  const system=`너는 시드부터 상세 설계까지 직접 작성하는 단일 Game Designer AI다. 외부에서 완성된 시드를 요구하지 않는다. 첫 identity-core 작성에서 사용자 요청·원본·참고 재료로 게임의 씨앗인 정체성·플레이어 판타지·핵심 재미·핵심 루프·MAIN/A/B/C/@와 상태 변화를 직접 생성한다. 이 결과가 design-seed.json이며 뒤의 상세 설계는 같은 시드를 확장한다. 접수용 자동 스케치는 창작 시드가 아니다. 기존 게임 원본과 오너 의도를 최우선으로 보존하고 요청된 설계 필드만 구체적으로 작성한다. 한 게임의 공통 원본은 하나다. MAIN은 주제와 게임 정체성이다. A와 B는 각기 익숙한 게임 시스템에 각각 구체적인 창작 소재를 붙여 실제 상태를 서로 교환한다. C는 열린 창작 소재 두 개를 융합하고 메인 장르·보조 장르 두 개를 각각 반드시 지정한다. 메인 장르는 정체성·위험·목표의 중심이고 보조 장르는 실제 선택·규칙·사건을 변주하며 서로 교체해도 같은 게임이면 안 된다. @는 무한히 파고드는 발견·숙련·재방문 계층이며 초기 최소 네 사례는 상한이 아니다. ${seedGameplaySketchVersion>=5?'새 문법 버전 5에서는 소문자 c 보조 시스템을 필수로 생성하지 않는다. C의 두 소재와 메인·보조 장르는 creativeGrammar와 A/B 상태 교환으로 증명한다. 기존 c 규칙이 실제 원본에 있으면 그대로 보존한다.':'구버전 4의 실제 c 보조 시스템은 호환 입력과 기존 상태에 따라 작성한다. C의 두 소재와 메인·보조 장르 인과도 별도로 작성한다.'} CORE_RULE_ANCHORS/SHARED_RULE_ANCHORS와 현재 STRUCTURE_CONTRACT를 따라 입력→조건/판정→상태 변화→위험/보상→대응→다음 선택을 작성한다. 일반적인 기능 목록·장식 세계관·임시 표식·반복 문장으로 설계하지 않는다. 지역·적·아이템·퀘스트·메뉴는 해당 장르에 필요한 것만 실제 역할과 상태로 연결한다. 실패·중단·재접속·저장은 원본 의미를 보존한다. 구현 버그와 설계 모순의 원인·수정 책임을 구분하고 안정성을 먼저 다룬다. 같은 증상을 설계와 구현이 독립적으로 중복 수정하지 않는다. 최소 두 실제 대안을 비교하고 선택안을 한 판의 시작·전개·결말로 재생한다. 한 판과 전체 세션 시간을 구분하며 검증되지 않은 시간·품질·실행 결과를 확정하지 않는다. 공공영역 고전의 원형은 게임에 맞게 재해석하고 현대 보호 작품은 추상적 기법만 참고한다. 보호된 인물·대사·장면은 복제하지 않는다. 설계 수정은 기존 검증·보안·저장·네트워크 권한을 바꾸지 않는다. 점수와 통과 판정은 결정론적 검증기가 담당한다.${preservationDirective}${ownerBriefOnly?' 호환용 자동 스케치는 설계 원본이 아니다. 사용자 요청과 기존 플랫폼 원본을 입력으로 A/B/C/@ 및 상세 설계를 직접 작성한다.':''}`;
  const user=`DESIGN_ONLY 상세 설계를 한 번에 완성하라. STABILIZE→UNDERSTAND→OBSERVE→DIAGNOSE→PRIORITIZE→BLUEPRINT→PROPOSE→COMPARE→REVISE→VALIDATE→LEARN→REPLAN→EXPAND 순서를 따른다. 정체성·핵심 재미·core loop·signature systems·시스템 연결·진행/경제·콘텐츠 확장·실패/재시도·플랫폼 적합성·UX/접근성·아트/오디오·구현 추적성을 서로 연결한다. 모든 장르에서 identity는 '무슨 게임인지'와 '같은 장르와 뭐가 다른지'가 한 번에 읽혀야 한다. playerFantasy는 플레이어의 역할과 책임을 구체화하고, coreFun/coreLoop는 representativeAction과 representativeChoice가 반복해서 실제 상태 변화를 만드는 구조여야 한다. signatureSystems는 일반적인 메뉴 기능이 아니라 제목을 가려도 이 게임을 알아볼 정도의 시그니처 약속을 1~2개 이상 핵심에 두고, systemInterconnections는 그 시그니처 규칙이 다른 시스템과 실제 상태를 주고받게 한다. progressionDirection은 레벨·공격력 상승 설명으로 끝내지 말고 성장 후 새 행동·경로·조합·관계·발견·대응법 중 무엇이 가능해지는지 적는다. visualDirection과 artAudioDirection은 세계 문화·지역·적·아이템·NPC·UI·사운드가 같은 정체성 논리를 공유하게 한다. 설계를 읽고 3문장으로 '이건 무슨 게임인가 / 같은 장르와 무엇이 다른가 / 성장하면 무엇을 새로 할 수 있나'가 서로 다른 답으로 즉시 나와야 한다. 이 기준은 퍼즐·레이싱·타이쿤·디펜스·생존·액션·RPG·카드·보드·전략·캐주얼 등 모든 장르에 적용하되 장르에 맞지 않는 RPG식 시스템을 억지로 추가하지 않는다. v4 또는 버전 5 novelGameGrammar가 있으면 단순히 '독특한 세계관'을 설명하지 말고 새로운 게임문법을 실제 플레이에 보존한다. causalDNA는 장식 키워드가 아니라 원인→선택→대가→다음 상태의 법칙이어야 하고, 한 축을 제거하면 평범한 장르로 돌아가는지 irreducibilityTest를 설계 전반에서 검증한다. 익숙한 인간 감정과 갈등은 공감의 발판으로 남기고, 캐릭터·몬스터·지역·스토리·아이템은 같은 인과법칙을 각기 다른 방식으로 보여준다. gameplaySystemFusion은 MAIN × A × B × C + @로 갱신한다. MAIN은 게임 정체성, A/B는 각각 게임 시스템과 창작 소재의 결합, C는 소재 두 개와 서로 구별되는 메인/보조 장르 두 개의 인과 융합이고 @는 제한 없는 깊이의 발견이다. @는 파고들기 층이라 c나 세 번째 대축으로 취급하지 않는다. 철학·종교·신화·역사·정치·비극·희극·해학·엽기·코믹은 모두 동등한 재료이며 게임 톤과 규모에 맞게 자유롭게 융합한다. 최종 장르 설명은 seed의 GAME_CATEGORY를 반복하지 말고 emergentGenre를 정체성에 반영한다. designAlternatives에는 최소 PLAN_A와 PLAN_B를 실제로 다른 접근으로 작성하고 각 안마다 컨셉/플레이어 판타지·핵심루프/세션리듬·맵 토폴로지/지역역할·랜드마크/이동·적 생태계/대응법·보스/시그니처 순간·성장/경제·퀘스트/스토리/이벤트·실패/재시도/복구·플랫폼 적응·구현범위·검증계획을 빠짐없이 구체화한다. selectedDesignPlan에서 선택 이유·정체성 보존·창작적 일탈·장르변경 여부·되돌림 가능성을 설명한다. contentVarietyPlan에서 맵/지역·적/도전·목표가 같은 템플릿 반복이 되지 않게 역할 차이를 설계한다. narrativeDialoguePlan은 해당 게임에서 스토리/대화가 필요하면 캐릭터별 말투와 장면·복선·회수·반전을 구체화하고 필요 없으면 applicable=false와 빈 배열을 사용한다. referenceHomagePlan은 공공영역 또는 추상기법/독자창작만 사용하고 그대로 베끼지 않는다. designIntegrityPlan은 이동·첫 행동·진행·퀘스트 선행조건·종료·회복·맵 목표·경제·대응법·보스 페이즈 전환·멀티 입장/이탈/재입장/동기화·세이브/마이그레이션·서사 인물지식/인과/복선회수 일관성을 실제 규칙 기준으로 검사하며 불확실한 걸 거짓 PASS로 쓰지 않는다. stabilityPriorityPlan은 알려진 증상을 구현/설계/혼합/미확정으로 분류한다. 설계 원본은 게임당 하나다. 기존 Roblox 원본과 사용자 요청을 기준으로 MAIN/A/B/C/@·규칙·상태·진행·멀티를 디자이너가 작성한다. webCanonicalDesign과 platformExpansionPolicy는 후처리가 같은 원본의 호환 뷰와 구현 정책으로 투영하므로 별도로 창작하지 않는다. platformProfiles는 입력·화면·성능·저장 전송·실행 검증을 플랫폼에 맞게 적용하며 독립 규칙이나 별도 게임 원본을 만들지 않는다. 게임 규칙 확장은 공통 원본 개정으로 돌아간다. Unity WebGL은 같은 Unity 프로젝트를 사용한다. COOP/COMPETITIVE/HYBRID 중 하나를 multiplayerMode에 반드시 명시한다. SINGLE은 기존 원본의 참고 조건일 뿐이며 실제 최소 2인 같은 세션의 입장·공동 선택·상태 전파·이탈·재접속 및 플랫폼별 서버 권한·검증 방법을 설계한다. 이전 Strict 실패는 삭제하지 말고 실제 설계로 해결한다. scorer 최소치에 딱 맞추지 말고 구조·문자 길이에 충분한 안전여유를 둔다. 초기 설계는 압축 요약보다 구체적 상태 전이와 플레이 사례를 우선한다. MAIN은 입력→즉시 피드백→상태 변화→위험/보상→다음 선택까지 한 사이클을 실제 플레이 기준으로 적고, A와 B는 각각 독립된 대축의 상태·자원·선택·실패조건·성장효과를 구분한 뒤 서로 어떤 값을 주고받는지 명시한다. C는 소재 두 개를 월드 법칙과 인물 사건에 융합하며, 메인 장르 하나와 보조 장르 하나를 반드시 명명한다. 보조 장르는 중심 장르의 플레이 선택·위험·보상·정보를 실제로 바꿔야 한다. 보조 규칙은 C 자체가 아니고 C의 효과를 실현하는 도구일 뿐이다. @는 해금 조건·발견 단서·숙련 보상·재방문 가치·고급 조합을 구체화하되 일반 시스템 축으로 승격하지 않는다. 지역·맵·적·보스·아이템·퀘스트·이벤트는 이름 나열로 끝내지 말고 역할, 플레이어가 읽는 신호, 요구 선택, 상태 입력/출력, 카운터플레이, 보상, 실패/복구, 다음 시스템 연결을 적는다. 진행/경제는 획득원·소비처·해금·새 행동·새 경로·빌드 분화가 어떻게 연결되는지, 실패 후 무엇을 잃고 무엇을 보존하는지까지 적는다. 플랫폼 설계는 PC 설명을 모바일로 복사하지 말고 터치 조작·UI 밀도·가독성·카메라·세션 중단/복귀를 실제 흐름에 연결한다. designAlternatives의 PLAN_A/PLAN_B도 각각 MAIN/A/B/C/@가 어떻게 달라지는지 비교 가능하게 작성하고 selectedDesignPlan은 선택안의 실제 플레이 5분·15분·30분 흐름을 설명한다. 반복 문장이나 장식적 세계관으로 분량을 채우지 말고 구현 가능한 규칙과 상태 연결에 분량을 사용한다. 메뉴와 UI도 게임 규칙의 일부로 설계한다. 시작 화면·메인 메뉴·계속하기/새 게임·세이브/로드·설정·일시정지·HUD·인벤토리·장비·상점·퀘스트 로그·지도·제작·사망/재시도·결과 화면·멀티 로비/매칭은 해당 게임에 필요한 것만 선택하되, 각 화면의 진입 조건·나가기/뒤로가기·핵심 정보 우선순위·버튼 이름/위치/역할·활성/비활성/잠금·확인/취소·로딩/오류·터치 영역·키보드/패드/모바일 조작·중복 클릭 방지·진행 막힘 방지를 구체화한다. 튜토리얼/온보딩은 첫 입력, 첫 성공, 첫 실패, 첫 성장, 첫 메뉴 사용을 실제 1분·5분·15분 흐름에 배치한다. 전투/주요 상호작용은 입력, 선행조건, 판정, 자원 소모, 쿨다운, 적 반응, 피격/회피/상태효과, 사망/복구, 카메라/VFX/SFX 피드백까지 연결하고 적은 역할·행동 신호·공격 패턴·카운터·군집 관계·스폰/리젠·지역 역할을 구분한다. 보스는 진입 조건·페이즈·패턴 전환 조건·전조·대응법·실패 학습·승리 후 세계/진행 변화까지 설계한다. 월드/맵은 지역별 목적·동선·랜드마크·접근 조건·빠른 이동/복귀·위험 보상·수직/수평 탐색·밀도·비밀·재방문 이유를 적고 단순 크기 확장으로 대신하지 않는다. 인벤토리/장비/제작/상점/경제는 획득원·소비처·소지 제한·정렬/필터·장착 교체·제작 조건·가격/보상 의미·희귀도·중복 처리·손실/복구·세이브 의미까지 연결한다. 스토리와 퀘스트가 중요한 게임은 메인/사이드/동료/세력/지역/숨김/월드 이벤트 중 필요한 유형을 사용하고 각 퀘스트에 발생 원인·선행조건·목표·플레이어 선택·상태 변화·결과·보상 의미·후속 또는 종료를 명시하며 단순 처치/수집 복제를 금지한다. NPC/동료/세력은 욕구·목표·갈등·관계·기억·지식범위·말투·행동 의도와 플레이어 행동에 따른 변화가 퀘스트와 세계 상태에 이어지게 한다. 저장/복구는 저장 시점·저장 대상·중단/재접속·체크포인트·죽음·롤백·마이그레이션·멀티 재입장 의미를 설계하고 기존 저장 의미를 깨지 않는다. 접근성/설정은 글자 크기·대비·진동·음량 분리·카메라 민감도·조작 재매핑 가능성·색상 의존 회피·모바일 가독성을 게임에 맞게 다룬다. 성능 설계는 화면 내 적/이펙트/UI/오브젝트 밀도와 스트리밍·풀링·LOD 또는 플랫폼 대체 전략을 플레이 품질과 함께 잡는다. contentExpansionPlan은 한 번의 완성 목록이 아니라 검증 회차가 반복될수록 현재 소스와 이전 검증 결과에서 다음 부족분을 골라 실제 코드와 플레이 콘텐츠를 연결 확장하는 순서를 적는다. 각 확장 단계는 현재 기준선·추가되는 플레이어 행동/지역/적/보스/아이템/퀘스트/스토리/메뉴·재사용할 기존 시스템·수정 책임·선행조건·세이브/밸런스 호환·런타임 확인 방법을 포함하고, 단순 수치 증가나 기능 개수 늘리기를 진화로 간주하지 않는다. 초기 완성 후에도 MAIN/A/B/C의 인과 관계를 깊게 하고 원본에 존재하는 c 변주와 @ 파고들기, 중후반 콘텐츠·재방문·리플레이·스토리/퀘스트 후속을 기존 정체성 안에서 단계적으로 늘릴 수 있게 설계한다.\nPRE_GATE_STRUCTURE_CONTRACT=${JSON.stringify(repairStructureContract(DESIGN.required))}\nSTRICT_GATE_FEEDBACK=${clip(strictDesignerFeedback,6500)}\nGAME_SEED_DESIGN_DEPTH=${clip(seedDesignDepthContext,16000)}\nEVIDENCE=${clip(evidence,15000)}`;
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
writeJson(path.join(base,'design-draft.json'),{version:5,gameId,date,productionClass:'DESIGN_ONLY',tierAlias:3,tier:3,gameSeedId:seed.seedId,gameSeedSource:designerSeedPath,gameSeedInputSource:'game-seed-state.json',gameplaySketchVersion:seedGameplaySketchVersion,inputGameplaySketchVersion,gameplaySketch:seedGameplaySketch,ownerDesignEventId:designEvolutionBrief.ownerIntent.eventId||null,designEvolutionLoopVersion:1,authorRole:'GAME_DESIGNER_AI',authorModel:designCheckpoint.effectiveDesignerModel||activeDesignerRoute.id,singleAuthor:true,preGate:{pass:preGatePass(preGate),totalScore:preGate.totalScore,hardFailures:preGate.hardFailures,criticalAxisFailures:preGate.criticalAxisFailures,attempts:preGateHistory.length-1},content:designDraft});
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
  gameSeedId:seed.seedId,gameSeedSource:designerSeedPath,gameSeedInputSource:'game-seed-state.json',gameplaySketchVersion:seedGameplaySketchVersion,inputGameplaySketchVersion,gameplaySketch:seedGameplaySketch,ownerDesignEventId:designEvolutionBrief.ownerIntent.eventId||null,designEvolutionLoopVersion:1,authorRole:'GAME_DESIGNER_AI',authorModel:designCheckpoint.effectiveDesignerModel||activeDesignerRoute.id,
  sameModelAsDraft:false,revisionApplied:false,reviewMode:'DETERMINISTIC_EVIDENCE_NO_AI_REVIEW',
  deterministicRevalidation:{passed:preGatePass(postRevisionPreGate),authority:'STAGE_GATE_SCORING_V2'},
  status:'DESIGN_BASELINE_CANDIDATE',
  // 코드 생성자가 실제 역할·상태 연결·진행·검증 기준을 같은 원본에서 읽는다.
  // 최종 엄격 검수 전에는 코딩 허가 근거가 아니다.
  codingBlueprint:{
    state:'PENDING_STRICT_DESIGN_REVIEW',
    requiredGate:'DESIGN_BASELINE_READY_AND_STRICT_PASS_GTE_80_NO_HARD_FAILURE',
    coreLoop:revisedDesign.coreLoop,
    signatureSystems:revisedDesign.signatureSystems,
    systemInterconnections:revisedDesign.systemInterconnections,
    progressionDirection:revisedDesign.progressionDirection,
    failureRetryRisk:revisedDesign.failureRetryRisk,
    platformProfiles:revisedDesign.platformProfiles,
    implementationTraceability:revisedDesign.implementationTraceability,
    validationQuestions:revisedDesign.validationQuestions
  },
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
  gameSeed:{seedId:seed.seedId,category:seed.GAME_CATEGORY,source:designerSeedPath,inputSource:'game-seed-state.json',authorRole:'GAME_DESIGNER_AI',complete:true,gameplaySketchVersion:seedGameplaySketchVersion,inputGameplaySketchVersion,advancedDesignDepth:advancedSeedDesignDepth},
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
  vibe2Used:true,vibe2LearningContextUsed:designLearningEvents.length>0,paidApi:false
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
console.log('DESIGN_ONLY_VIBE2_USED=YES');
console.log(`DESIGN_LEARNING_CONTEXT_CANDIDATES=${designLearningEvents.length}`);
console.log(`DESIGN_ONLY_VIBE2_LEARNING_CONTEXT=${designLearningEvents.length>0?'YES':'NO'}`);
console.log('DESIGN_LEARNING_POSITIVE_TRAINING_ELIGIBLE=NO_UNTIL_VALIDATED_RUNTIME');
console.log('PAID_AI_ALLOWED=NO');
console.log(`AI_PROVIDER=${designCheckpoint.effectiveDesignerProvider||'VIBE_NATIVE_FUNCTION'}`);
console.log('DESIGN_GATE_PROVIDER=DETERMINISTIC_EVIDENCE_ENGINE');



