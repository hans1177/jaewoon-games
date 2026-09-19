// 파일명: tools/vibe2-exploration-worker.mjs
// 역할: 구현 전에 소스 구조·영향 범위·관련 파일·검증 대상을 읽기 전용으로 수집해 재사용 가능한 handoff를 만든다.
// 원칙: 소스는 절대 수정하지 않고, 책임 파일 바깥은 읽기 전용 영향 분석에만 사용한다.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { assessExistingWebRepository } from './vibe2-existing-web-assessment.mjs';
import { analyzeExistingGameSource } from './company-vibe2-gameplay-intelligence.mjs';
import { buildCodingArchitecture } from './company-vibe2-coding-architecture.mjs';
import { buildExpertDevelopmentAnalysis, traceFailureResponsibility } from './company-vibe2-expert-development.mjs';

const clean=value=>String(value??'').trim();
const posix=value=>clean(value).replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/,'');
const unique=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
const IGNORED_DIRS=new Set(['.git','node_modules','Library','Temp','Logs','Binaries','Intermediate','Saved','DerivedDataCache','.cache']);
const TARGET_EXTENSIONS=Object.freeze({
  roblox:new Set(['.luau','.lua','.json']),
  web:new Set(['.html','.htm','.css','.js','.mjs','.cjs','.json','.svg']),
  unity:new Set(['.cs','.asmdef','.json','.uxml','.uss','.unity','.prefab','.asset']),
  unreal:new Set(['.h','.hpp','.cpp','.cc','.cxx','.cs','.ini','.uproject','.uplugin','.json']),
  godot:new Set(['.gd','.tscn','.tres','.godot','.cfg','.json'])
});
const BINARY_EXTENSIONS=new Set(['.rbxl','.rbxlx','.uasset','.umap','.controller','.anim','.avatar','.fbx','.blend','.png','.jpg','.jpeg','.webp','.wav','.mp3','.ogg']);
const MAX_SCAN_FILES=180;
const MAX_RELATED_FILES=12;
const MAX_READ_BYTES=320000;

function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');}
function parseArgs(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)out[body]=true;else out[body.slice(0,at)]=body.slice(at+1);}return out;}
function extensions(target){const set=TARGET_EXTENSIONS[clean(target).toLowerCase()];if(!set)throw new Error(`지원하지 않는 exploration target: ${target}`);return set;}
function sourcePrefix(target){if(target==='roblox')return'roblox-games/';if(target==='web')return'web-games/';if(target==='unity')return'unity-games/';if(target==='unreal')return'unreal-games/';if(target==='godot')return'godot-games/';return'';}
function assertRoot(root,target){const normalized=posix(root),prefix=sourcePrefix(target);if(!prefix||!normalized.startsWith(prefix)||normalized.includes('..'))throw new Error(`허용되지 않은 exploration source root: ${root}`);return normalized;}
function normalizeRelative(value,root){const normalized=posix(value);return normalized.startsWith(`${root}/`)?normalized.slice(root.length+1):normalized;}
function sourceRootBootstrapAllowed(order,target,root){
  const evidence=new Set((order?.selectedTask?.evidence||[]).map(clean));
  const responsible=unique(order?.source?.responsibleFiles||[]).map(v=>normalizeRelative(v,root));
  return target==='web'
    &&order?.workerPolicy?.sourceRootBootstrapAllowed===true
    &&evidence.has('source-root-bootstrap-required')
    &&responsible.length===1
    &&responsible[0]==='index.html';
}
function sha(text){return crypto.createHash('sha256').update(String(text)).digest('hex');}
function safeRead(file){try{const stat=fs.statSync(file);if(!stat.isFile()||stat.size>MAX_READ_BYTES)return'';return fs.readFileSync(file,'utf8');}catch{return'';}}
function listFiles(root,target,ignored=[]){const allowed=extensions(target),ignore=ignored.map(posix).filter(Boolean),rows=[];const walk=current=>{if(rows.length>=MAX_SCAN_FILES)return;for(const entry of fs.readdirSync(current,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){if(rows.length>=MAX_SCAN_FILES)return;if(entry.isDirectory()&&IGNORED_DIRS.has(entry.name))continue;const full=path.join(current,entry.name),relative=posix(path.relative(root,full));if(ignore.some(v=>relative===v||relative.startsWith(`${v}/`)))continue;if(entry.isDirectory())walk(full);else{const ext=path.extname(entry.name).toLowerCase();if(allowed.has(ext)&&!BINARY_EXTENSIONS.has(ext))rows.push({full,relative,ext});}}};walk(root);return rows;}
function goalTokens(goal=''){return unique(clean(goal).toLowerCase().split(/[^a-z0-9가-힣_]+/).filter(x=>x.length>=3)).slice(0,24);}
function protectedSignals(text=''){const checks=[['save',/save|세이브|progress|진행/i],['combat-number',/damage|attack|health|hp|reward|drop|데미지|공격|체력|보상|드랍/i],['network',/fetch\(|axios|websocket|http:/i],['storage',/localStorage|PlayerPrefs|SaveGame|DataStore/i]];return checks.filter(([,re])=>re.test(text)).map(([name])=>name);}
function scoreRelated(row,{responsible,goalTokens:tokens,responsibleNames,responsibleDirs}){let score=0;const text=safeRead(row.full);if(responsible.has(row.relative))return{...row,score:10000,text};const lower=row.relative.toLowerCase(),dir=posix(path.dirname(row.relative));if(responsibleDirs.has(dir))score+=35;for(const token of tokens)if(lower.includes(token))score+=5;for(const name of responsibleNames)if(name&&text.includes(name))score+=24;if(/(?:test|spec|qa|playmode|editmode)/i.test(row.relative))score+=8;return{...row,score,text};}
function compactFile(row){return{path:row.relative,hash:sha(row.text||safeRead(row.full)).slice(0,16),bytes:Buffer.byteLength(row.text||safeRead(row.full),'utf8')};}
function reusableArtifact(cwd,order){
  const file=clean(process.env.VIBE2_EXPLORATION_FILE);
  if(!file)return null;
  const resolved=path.isAbsolute(file)?file:path.resolve(cwd,file);
  if(!fs.existsSync(resolved))return null;
  const cached=readJson(resolved);
  if(cached?.role!=='exploration'||cached?.sourceWrite!==false||!clean(cached?.reuseKey))throw new Error('잘못된 exploration handoff artifact');
  if(clean(cached.taskId)!==clean(order.taskId))throw new Error('exploration handoff task 불일치');
  const expectedRoot=posix(order?.source?.root);
  if(posix(cached.sourceRoot)!==expectedRoot)throw new Error('exploration handoff source root 불일치');
  return{...cached,reused:true,reusedFrom:posix(path.relative(cwd,resolved))||path.basename(resolved)};
}


function taskGameplaySketch(order={},sourceAnalysis={}){
  const text=clean([order?.originalGoal,order?.goal,...(order?.selectedTask?.evidence||[])].filter(Boolean).join(' ')).toLowerCase();
  const has=re=>re.test(text);
  return{
    worldModel:{requiresPlayableSpace:Boolean(sourceAnalysis?.capabilities?.collision||sourceAnalysis?.areaIds?.length||has(/world|map|area|zone|region|route|path|placement|배치|맵|지역/))},
    actors:{playerRequired:true,enemyBehaviorRequired:has(/enemy|boss|combat|attack|ai|적|보스|전투|공격/)},
    interactionGraph:{required:Boolean(sourceAnalysis?.capabilities?.interactions||has(/interact|npc|dialog|chest|door|pickup|상호작용|npc|상자|문/))},
    combatModel:{required:has(/combat|attack|damage|weapon|skill|enemy|boss|전투|공격|데미지|무기|스킬|적|보스/),strategicOutcomeDifferenceRequired:has(/strategy|choice|build|loadout|전략|선택|빌드/)},
    economyModel:{required:Boolean(sourceAnalysis?.capabilities?.economy||has(/gold|coin|currency|shop|buy|sell|cost|reward|골드|코인|상점|구매|판매|비용|보상/))},
    progressionModel:{required:has(/progress|quest|objective|unlock|level|stage|wave|진행|퀘스트|목표|해금|레벨|스테이지|웨이브/),objectives:[]},
    placementModel:{required:has(/place|placement|tower|build|deploy|slot|grid|배치|타워|건설/)},
  };
}
function taskFailureEvidence(order={}){
  const values=[
    ...(order?.workPackage?.sharedContext?.diagnosticEvidence||[]),
    order?.selectedTask?.blocker,
    order?.selectedTask?.lastOutcome,
    ...(order?.selectedTask?.evidence||[]).filter(value=>/fail|failure|blocker|runtime|hard|invalid|missing|no.?op|edit.?match|timeout|repair|recovery|실패|누락|오류/i.test(clean(value)))
  ];
  return unique(values).slice(0,16);
}

function compilePatchRecipe({order={},failures=[],primaryTargets=[],dependentSymbols=[],ownedState=[],requiredFocusedChecks=[],preserveSemantics=[]}={}){
  const failureFingerprint=clean(order?.unifiedLearning?.failureFingerprint)||null;
  const verifiedMemory=(order?.unifiedLearning?.failureLocalMemory||[])
    .filter(row=>row?.verified===true&&row?.reusable===true)
    .slice(0,5);
  const reusePatterns=unique(verifiedMemory.flatMap(row=>row?.reusablePatterns||[])).slice(0,12);
  const avoidPatterns=unique(verifiedMemory.flatMap(row=>[...(row?.avoidPatterns||[]),row?.failureCause])).slice(0,12);
  const memoryIds=unique(verifiedMemory.map(row=>row?.id)).slice(0,8);
  const mode=memoryIds.length?'VERIFIED_FAILURE_LOCAL_RECIPE':failures.length?'DETERMINISTIC_CAUSAL_RECIPE':'REQUIREMENT_RECIPE';
  const steps=unique([
    failures.length?'CONFIRM_FAILURE_OR_REQUIREMENT_AGAINST_CURRENT_SOURCE':'CONFIRM_REQUIREMENT_AGAINST_CURRENT_SOURCE',
    primaryTargets.length?'PATCH_PRIMARY_RESPONSIBILITY_FIRST':'IDENTIFY_PRIMARY_RESPONSIBILITY_BEFORE_WRITE',
    dependentSymbols.length?'PATCH_DIRECT_DEPENDENTS_ONLY_WHEN_CAUSALLY_REQUIRED':'DO_NOT_EXPAND_TO_UNRELATED_DEPENDENCIES',
    ownedState.length?'VERIFY_OWNED_STATE_CHANGE':'VERIFY_OBSERVABLE_STATE_OR_RUNTIME_CHANGE',
    reusePatterns.length?'APPLY_VERIFIED_REUSABLE_PATTERN_WHEN_IT_FITS_CURRENT_SOURCE':'USE_CURRENT_SOURCE_CAUSAL_STRUCTURE',
    avoidPatterns.length?'AVOID_VERIFIED_FAILURE_PATTERN':'AVOID_UNRELATED_OR_SPECULATIVE_REWRITE',
    preserveSemantics.length?'VERIFY_PRESERVE_SEMANTICS':'PRESERVE_EXISTING_WORKING_BEHAVIOR',
    requiredFocusedChecks.length?'RUN_COMPILED_FOCUSED_CHECKS':'RUN_TASK_LOCAL_INCREMENTAL_QA'
  ]);
  return{
    version:1,
    mode,
    failureFingerprint,
    verifiedMemoryIds:memoryIds,
    verifiedMemoryCount:memoryIds.length,
    reusePatterns,
    avoidPatterns,
    steps,
    primaryTargets:primaryTargets.slice(0,8),
    dependentSymbolsOrSystems:dependentSymbols.slice(0,24),
    ownedState:ownedState.slice(0,24),
    focusedChecks:requiredFocusedChecks.slice(0,24),
    protectedSemantics:preserveSemantics.slice(0,32),
    verifiedMemoryOnly:true,
    scopeExpansionAllowed:false,
    qaBypassAllowed:false,
    authorityExpanded:false
  };
}

function compileEditContract({order={},sourceText='',responsibleFiles=[],protectedScopeSignals=[],testTargets=[]}={}){
  const sourceAnalysis=analyzeExistingGameSource(sourceText);
  const gameplaySketch=taskGameplaySketch(order,sourceAnalysis);
  const codingArchitecture=buildCodingArchitecture({
    gameId:clean(order?.gameId),
    genre:clean(order?.designIntelligence?.genre||order?.selectedTask?.genre),
    baseline:{},
    gameplaySketch,
    sourceAnalysis,
    explicitDevelopmentMode:sourceAnalysis.present?'PRESERVE_PATCH':'GREENFIELD'
  });
  const failures=taskFailureEvidence(order);
  const expertDevelopment=buildExpertDevelopmentAnalysis({source:sourceText,sourceAnalysis,gameplaySketch,failures});
  const graph=expertDevelopment?.responsibilityGraph||{nodes:[],edges:[]};
  const requirementText=clean(order?.originalGoal||order?.selectedTask?.goal||order?.goal);
  const requirementTrace=requirementText?traceFailureResponsibility({failure:requirementText,responsibilityGraph:graph}):null;
  const traces=[...(expertDevelopment?.causalDebug?.traces||[]),...(requirementTrace?[requirementTrace]:[])];
  const primaryTargets=unique(traces.map(row=>row?.primaryTarget)).slice(0,8);
  const primarySet=new Set(primaryTargets);
  const primaryNodes=(graph.nodes||[]).filter(node=>primarySet.has(node.name));
  const primarySystems=unique(primaryNodes.flatMap(node=>node.systems||[]));
  const directDependentSymbols=unique(primaryNodes.flatMap(node=>[...(node.calls||[]),...(node.calledBy||[])])).slice(0,16);
  const impactRows=(codingArchitecture?.impactPrediction||[]).filter(row=>primarySystems.includes(row.system));
  const dependentSystems=unique(impactRows.flatMap(row=>row.likelyAffected||[])).slice(0,12);
  const allowedSystems=unique([...primarySystems,...dependentSystems]).slice(0,16);
  const ownedState=unique(primaryNodes.flatMap(node=>node.stateWrites||[])).slice(0,24);
  const readState=unique(primaryNodes.flatMap(node=>node.stateReads||[])).slice(0,24);
  const preserveSemantics=unique([
    'EXISTING_WORKING_BEHAVIOR',
    'APPROVED_GAMEPLAY_VALUES',
    'SAVE_MEANING',
    ...(sourceAnalysis.storageKeys||[]).map(key=>'SAVE_KEY:'+key),
    ...(protectedScopeSignals||[]).map(value=>'PROTECTED_SIGNAL:'+value)
  ]);
  const hotspotEntries=Array.isArray(order?.regressionHotspotRisk?.entries)?order.regressionHotspotRisk.entries:[];
  const matchedHotspots=hotspotEntries.filter(row=>
    (clean(row?.kind).toUpperCase()==='SYMBOL'&&primaryTargets.includes(clean(row?.name)))||
    (clean(row?.kind).toUpperCase()==='SYSTEM'&&primarySystems.includes(clean(row?.name).toUpperCase()))
  ).slice(0,8);
  const hotspotChecks=matchedHotspots.flatMap(row=>[
    'HOTSPOT_RECHECK:'+clean(row?.kind).toUpperCase()+':'+clean(row?.name),
    clean(row?.kind).toUpperCase()==='SYSTEM'?'DEPENDENT_SYSTEM_REGRESSION_IF_TOUCHED':''
  ]).filter(Boolean);
  const requiredFocusedChecks=unique([
    ...impactRows.flatMap(row=>row.requiredChecks||[]),
    ...(codingArchitecture?.microRuntimeTests||[]).filter(row=>allowedSystems.includes(row.system)).map(row=>'MICRO_'+row.system),
    ...hotspotChecks,
    ...(testTargets||[]).map(value=>'TEST_TARGET:'+value)
  ]).slice(0,24);
  const strategyHint=failures.length&&primaryTargets.length?'CAUSAL_TRACE_FIRST'
    :primaryTargets.length?'RESPONSIBILITY_FIRST'
    :sourceAnalysis.present?'PRESERVE_PATCH_RESPONSIBLE_SCOPE'
    :'ARCHITECTURE_FIRST_GREENFIELD';
  const rawResponsibilityConfidence=primaryTargets.length&&graph.nodeCount>0?'HIGH':graph.nodeCount>0?'MEDIUM':'LOW';
  const calibrationRecommendation=clean(order?.responsibilityCalibration?.recommendation).toUpperCase();
  const confidence=rawResponsibilityConfidence==='HIGH'&&calibrationRecommendation==='DOWNGRADE_HIGH_TO_MEDIUM'?'MEDIUM':rawResponsibilityConfidence;
  const relevantEdges=(graph.edges||[]).filter(edge=>primarySet.has(edge.from)||primarySet.has(edge.to)||directDependentSymbols.includes(edge.from)||directDependentSymbols.includes(edge.to)).slice(0,40);
  const allowedDependentSymbolsOrSystems=unique([...directDependentSymbols,...dependentSystems]).slice(0,24);
  const patchRecipe=compilePatchRecipe({order,failures,primaryTargets,dependentSymbols:allowedDependentSymbolsOrSystems,ownedState,requiredFocusedChecks,preserveSemantics});
  return{
    version:1,
    mode:'COMPILED_EDIT_CONTRACT',
    strategyHint,
    responsibilityConfidence:confidence,
    rawResponsibilityConfidence,
    responsibilityCalibration:{
      recommendation:calibrationRecommendation||'KEEP_RAW_CONFIDENCE',
      applied:rawResponsibilityConfidence!==confidence,
      extraReadOnlyExploration:order?.responsibilityCalibration?.extraReadOnlyExploration===true,
      writableScopeExpansionAllowed:false,
      authorityExpanded:false
    },
    regressionHotspotRisk:{
      riskLevel:clean(order?.regressionHotspotRisk?.riskLevel).toUpperCase()||'LOW',
      matched:matchedHotspots,
      focusedChecksAdded:hotspotChecks,
      writableScopeExpansionAllowed:false,
      authorityExpanded:false
    },
    primaryTargets,
    allowedResponsibleFiles:responsibleFiles,
    allowedDependentSymbolsOrSystems,
    primarySystems,
    dependentSystems,
    ownedState,
    readState,
    preserveSemantics,
    failureOrRequirementCausalChain:unique(traces.flatMap(row=>row?.causalChain||[])).slice(0,32),
    requiredObservableResult:requirementText||'IMPLEMENT_WORK_ORDER_WITH_OBSERVABLE_GAMEPLAY_EFFECT',
    semanticDiffBudget:{
      allowedSystems,
      preferredPrimarySymbols:primaryTargets,
      maxSystemCount:Math.max(1,allowedSystems.length||primarySystems.length||1),
      unrelatedSystemMutationForbidden:true,
      saveKeysMustRemainCompatible:sourceAnalysis.storageKeys||[]
    },
    requiredFocusedChecks,
    patchRecipe,
    codingArchitecture:{
      developmentMode:codingArchitecture?.developmentMode||null,
      stateOwnershipSystems:(codingArchitecture?.stateOwnership||[]).map(row=>row.system),
      apiNames:(codingArchitecture?.apiContracts||[]).map(row=>row.api),
      invariantIds:(codingArchitecture?.invariants||[]).map(row=>row.id),
      impactRule:'PREDICT_AFFECTED_SYSTEMS_BEFORE_PATCH_AND_RUN_DEPENDENT_REGRESSION_IF_TOUCHED'
    },
    responsibilityGraph:{
      nodeCount:Number(graph.nodeCount||0),
      relevantNodes:(graph.nodes||[]).filter(node=>primarySet.has(node.name)||directDependentSymbols.includes(node.name)).slice(0,24).map(node=>({
        name:node.name,systems:node.systems||[],calls:node.calls||[],calledBy:node.calledBy||[],
        stateReads:node.stateReads||[],stateWrites:node.stateWrites||[],storageKeys:node.storageKeys||[],events:node.events||[]
      })),
      relevantEdges
    },
    behaviorChains:expertDevelopment?.behaviorChains?.chains||[],
    seniorReview:{
      score:expertDevelopment?.seniorCodeReview?.score??null,
      hardBlockers:expertDevelopment?.seniorCodeReview?.hardBlockers||[],
      issues:(expertDevelopment?.seniorCodeReview?.issues||[]).slice(0,12)
    },
    failureEvidence:failures,
    writableScopeExpansionAllowed:false,
    learningAuthorityExpanded:false
  };
}
function bootstrapEditContract(order={},responsibleFiles=[]){
  return{
    version:1,mode:'COMPILED_EDIT_CONTRACT',strategyHint:'ARCHITECTURE_FIRST_GREENFIELD',responsibilityConfidence:'LOW',
    primaryTargets:[],allowedResponsibleFiles:responsibleFiles,allowedDependentSymbolsOrSystems:[],primarySystems:[],dependentSystems:[],
    ownedState:[],readState:[],preserveSemantics:['APPROVED_GAMEPLAY_VALUES','SAVE_MEANING'],
    failureOrRequirementCausalChain:['SOURCE_ROOT_MISSING','APPROVED_BOOTSTRAP','IMPLEMENT_COMPLETE_PLAYABLE_BASELINE'],
    requiredObservableResult:clean(order?.originalGoal||order?.goal)||'IMPLEMENT_COMPLETE_PLAYABLE_BASELINE',
    semanticDiffBudget:{allowedSystems:[],preferredPrimarySymbols:[],maxSystemCount:0,unrelatedSystemMutationForbidden:false,saveKeysMustRemainCompatible:[]},
    requiredFocusedChecks:['MOBILE_GAMEPLAY','REAL_INPUT','STATE_CHANGE','RESTART','RUNTIME'],
    patchRecipe:{version:1,mode:'REQUIREMENT_RECIPE',failureFingerprint:null,verifiedMemoryIds:[],verifiedMemoryCount:0,reusePatterns:[],avoidPatterns:[],steps:['CONFIRM_REQUIREMENT_AGAINST_CURRENT_SOURCE','IMPLEMENT_COMPLETE_PLAYABLE_BASELINE','RUN_TASK_LOCAL_INCREMENTAL_QA'],primaryTargets:[],dependentSymbolsOrSystems:[],ownedState:[],focusedChecks:['MOBILE_GAMEPLAY','REAL_INPUT','STATE_CHANGE','RESTART','RUNTIME'],protectedSemantics:['APPROVED_GAMEPLAY_VALUES','SAVE_MEANING'],verifiedMemoryOnly:true,scopeExpansionAllowed:false,qaBypassAllowed:false,authorityExpanded:false},
    codingArchitecture:{developmentMode:'GREENFIELD',stateOwnershipSystems:[],apiNames:[],invariantIds:[],impactRule:'ARCHITECTURE_FIRST_THEN_IMPLEMENT'},
    responsibilityGraph:{nodeCount:0,relevantNodes:[],relevantEdges:[]},behaviorChains:[],seniorReview:{score:null,hardBlockers:[],issues:[]},
    failureEvidence:taskFailureEvidence(order),writableScopeExpansionAllowed:false,learningAuthorityExpanded:false
  };
}

export function exploreVibe2WorkOrder({cwd=process.cwd(),order={},outputFile=''}={}){
  if(!order||typeof order!=='object')throw new Error('exploration work order 필요');
  const cached=reusableArtifact(cwd,order);
  if(cached){if(outputFile)writeJson(path.resolve(cwd,outputFile),cached);return cached;}
  const target=clean(order.target).toLowerCase();
  const rootRelative=assertRoot(order?.source?.root,target);
  const root=path.resolve(cwd,rootRelative);
  const responsible=unique(order?.source?.responsibleFiles||[]).map(v=>normalizeRelative(v,rootRelative));
  const bootstrap=sourceRootBootstrapAllowed(order,target,rootRelative);
  const rootExists=fs.existsSync(root)&&fs.statSync(root).isDirectory();
  if(!rootExists&&!bootstrap)throw new Error(`exploration source root 없음: ${rootRelative}`);
  if(!rootExists&&bootstrap){
    const baseMainSha=clean(process.env.VIBE2_BASE_MAIN_SHA)||null;
    const diagnosticEvidence=unique(order?.workPackage?.sharedContext?.diagnosticEvidence||[]);
    const existingWebAssessment={
      strategy:'FULL_REBUILD',
      reasons:['source-root-bootstrap-required','approved-development-queue-bootstrap'],
      evidence:{approvedScopeCoveragePct:100,gameplaySignalCount:0}
    };
    const reuseKey=sha(JSON.stringify({taskId:order.taskId,baseMainSha,rootRelative,bootstrap:true})).slice(0,24);
    const handoff={
      version:1,role:'exploration',sourceWrite:false,reused:false,bootstrap:true,
      taskId:clean(order.taskId)||null,packageId:clean(order?.workPackage?.id)||null,target,sourceRoot:rootRelative,baseMainSha,
      responsibleFiles:responsible,impactFiles:responsible,contextFiles:[],relatedFiles:[],testTargets:[],
      protectedScopeSignals:[],diagnosticEvidence,existingWebAssessment,fileDigests:[],editContract:bootstrapEditContract(order,responsible),reuseKey,generatedAt:new Date().toISOString()
    };
    if(outputFile)writeJson(path.resolve(cwd,outputFile),handoff);
    return handoff;
  }
  const responsibleSet=new Set(responsible);
  const responsibleNames=new Set(responsible.map(v=>path.basename(v)).filter(Boolean));
  const responsibleDirs=new Set(responsible.map(v=>posix(path.dirname(v))).filter(Boolean));
  const rows=listFiles(root,target,order?.source?.ignoredPaths||[]);
  const scored=rows.map(row=>scoreRelated(row,{responsible:responsibleSet,goalTokens:goalTokens(order.goal),responsibleNames,responsibleDirs})).sort((a,b)=>b.score-a.score||a.relative.localeCompare(b.relative));
  const responsibilityRows=responsible.map(relative=>{const full=path.join(root,relative),text=safeRead(full);return{relative,full,text,score:10000};}).filter(row=>fs.existsSync(row.full));
  const related=scored.filter(row=>!responsibleSet.has(row.relative)&&row.score>0).slice(0,MAX_RELATED_FILES);
  const impactFiles=unique([...responsible,...related.slice(0,8).map(row=>row.relative)]);
  const contextFiles=unique([...responsible,...related.map(row=>row.relative)]).slice(0,12);
  const testTargets=unique(scored.filter(row=>/(?:test|spec|qa|playmode|editmode)/i.test(row.relative)).slice(0,8).map(row=>row.relative));
  const protectedScopeSignals=unique(responsibilityRows.flatMap(row=>protectedSignals(row.text)));
  const diagnosticEvidence=unique(order?.workPackage?.sharedContext?.diagnosticEvidence||[]);
  const fileDigests=[...responsibilityRows,...related.slice(0,6)].map(compactFile);
  const baseMainSha=clean(process.env.VIBE2_BASE_MAIN_SHA)||null;
  const existingWebAssessment=target==='web'?assessExistingWebRepository({cwd,gameId:order.gameId,sourceRoot:rootRelative,order}):null;
  const sourceText=responsibilityRows.map(row=>row.text).filter(Boolean).join('\n\n');
  const editContract=compileEditContract({order,sourceText,responsibleFiles:responsible,protectedScopeSignals,testTargets});
  const reuseKey=sha(JSON.stringify({taskId:order.taskId,baseMainSha,rootRelative,fileDigests,diagnosticEvidence,existingWebAssessment,goal:clean(order?.originalGoal||order?.goal),editContract})).slice(0,24);
  const handoff={
    version:1,
    role:'exploration',
    sourceWrite:false,
    reused:false,
    taskId:clean(order.taskId)||null,
    packageId:clean(order?.workPackage?.id)||null,
    target,
    sourceRoot:rootRelative,
    baseMainSha,
    responsibleFiles:responsible,
    impactFiles,
    contextFiles,
    relatedFiles:related.map(row=>({path:row.relative,score:row.score})),
    testTargets,
    protectedScopeSignals,
    diagnosticEvidence,
    existingWebAssessment,
    fileDigests,
    editContract,
    reuseKey,
    generatedAt:new Date().toISOString()
  };
  if(outputFile)writeJson(path.resolve(cwd,outputFile),handoff);
  return handoff;
}

export function explorationGuidance(handoff={}){
  if(!handoff?.reuseKey)return'';
  return[
    `[EXPLORATION HANDOFF ${handoff.reuseKey}${handoff.reused?' REUSED':''}]`,
    `책임 파일=${(handoff.responsibleFiles||[]).join(', ')||'NONE'}`,
    `읽기 전용 영향 파일=${(handoff.impactFiles||[]).filter(x=>!(handoff.responsibleFiles||[]).includes(x)).join(', ')||'NONE'}`,
    `검증 후보=${(handoff.testTargets||[]).join(', ')||'NONE'}`,
    `보호 신호=${(handoff.protectedScopeSignals||[]).join(', ')||'NONE'}`,
    ...(handoff.existingWebAssessment?[`[EXISTING WEB STRATEGY] ${handoff.existingWebAssessment.strategy}`,`판단 근거=${(handoff.existingWebAssessment.reasons||[]).join(', ')||'NONE'}`,`설계 scope coverage=${handoff.existingWebAssessment.evidence?.approvedScopeCoveragePct??0}% · gameplay signals=${handoff.existingWebAssessment.evidence?.gameplaySignalCount??0}`,handoff.existingWebAssessment.strategy==='KEEP_AND_CONTINUE'?'기존 구조·세이브·작동 시스템을 보존하고 필요한 개발만 이어간다.':handoff.existingWebAssessment.strategy==='PARTIAL_REPAIR'?'기존 구조를 보존하고 확인된 결함 책임 영역만 수정한다.':handoff.existingWebAssessment.strategy==='MAJOR_REWORK'?'사용 가능한 시스템과 세이브 의미는 보존하고 큰 결함 영역을 재구성한다.':'전체 재구축은 허용되지만 승인 설계·게임 정체성·보존 가능한 세이브 의미는 유지한다.']:[]),
    ...(handoff.editContract?[
      '[COMPILED EDIT CONTRACT]',
      `코딩 전략=${handoff.editContract.strategyHint||'NONE'} · 책임 확신=${handoff.editContract.responsibilityConfidence||'LOW'}`,
      `주 책임 심볼=${(handoff.editContract.primaryTargets||[]).join(', ')||'NONE'}`,
      `허용 의존 심볼/시스템=${(handoff.editContract.allowedDependentSymbolsOrSystems||[]).join(', ')||'NONE'}`,
      `소유 상태=${(handoff.editContract.ownedState||[]).join(', ')||'NONE'}`,
      `보존 계약=${(handoff.editContract.preserveSemantics||[]).join(' | ')||'NONE'}`,
      `인과 체인=${(handoff.editContract.failureOrRequirementCausalChain||[]).join(' -> ')||'NONE'}`,
      `관찰 결과=${handoff.editContract.requiredObservableResult||'NONE'}`,
      `Semantic diff 허용 시스템=${(handoff.editContract.semanticDiffBudget?.allowedSystems||[]).join(', ')||'NONE'}; unrelated mutation=${handoff.editContract.semanticDiffBudget?.unrelatedSystemMutationForbidden===true?'FORBIDDEN':'CONDITIONAL'}`,
      `필수 집중 검증=${(handoff.editContract.requiredFocusedChecks||[]).join(', ')||'NONE'}`,
      ...(handoff.editContract.patchRecipe?[
        `[PATCH RECIPE] mode=${handoff.editContract.patchRecipe.mode}; failure=${handoff.editContract.patchRecipe.failureFingerprint||'NONE'}; verifiedMemory=${handoff.editContract.patchRecipe.verifiedMemoryCount||0}`,
        `recipe steps=${(handoff.editContract.patchRecipe.steps||[]).join(' -> ')||'NONE'}`,
        `verified reuse=${(handoff.editContract.patchRecipe.reusePatterns||[]).join(' | ')||'NONE'}`,
        `verified avoid=${(handoff.editContract.patchRecipe.avoidPatterns||[]).join(' | ')||'NONE'}`,
        'Patch recipe는 검증된 기억을 우선 사용하지만 현재 소스와 맞지 않으면 적용하지 않는다. 범위 확대/QA 우회 권한은 없다.'
      ]:[]),
      `불변조건=${(handoff.editContract.codingArchitecture?.invariantIds||[]).join(', ')||'NONE'}`,
      '주 책임 심볼부터 수정하고 의존 심볼은 요구사항 충족에 꼭 필요할 때만 수정한다. 책임 파일/예약 범위 확대는 금지한다.'
    ]:[]),
    '영향 파일은 참고용이다. Allowed edit paths 밖 파일은 수정하지 않는다.'
  ].join('\n');
}

export function runVibe2ExplorationWorker({cwd=process.cwd(),workOrderFile='.vibe2/work-order.json',outputFile=''}={}){
  const order=readJson(path.resolve(cwd,workOrderFile));
  return exploreVibe2WorkOrder({cwd,order,outputFile});
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const args=parseArgs();const result=runVibe2ExplorationWorker({workOrderFile:clean(args.order)||'.vibe2/work-order.json',outputFile:clean(args.output)});console.log('VIBE2_EXPLORATION_WORKER=PASS');console.log(`VIBE2_EXPLORATION_REUSE_KEY=${result.reuseKey}`);console.log(`VIBE2_EXPLORATION_REUSED=${result.reused?'YES':'NO'}`);console.log(`VIBE2_EXPLORATION_IMPACT_FILES=${result.impactFiles.join(',')}`);console.log('VIBE2_EXPLORATION_SOURCE_WRITE=NO');}
