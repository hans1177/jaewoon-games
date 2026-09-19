// 파일명: tools/vibe2-auto-planner.mjs
// 역할: 최신 회사 상태·게임 카탈로그·실제 소스에서 충돌 없는 작업을 계획한다.
// DEVELOPMENT_CONFIRMED Web은 기존 소스를 먼저 평가한 뒤 보존/부분수정/대규모개편/전체재구축 전략을 선택한다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createVibeContinuousQueue, DEFAULT_MAX_CONCURRENT_TASKS } from '../assets/vibe-continuous-queue.js';
import { generateVibe2Handoff } from './vibe2-handoff.mjs';
import { diagnoseGame, microTaskFromIssue } from './autonomous-diagnostics.mjs';
import { buildWorkPackage, computeWorkloadTelemetry, estimateTaskWorkUnits, resolveWorkPackagePolicy } from './vibe2-work-package.mjs';

const clean=value=>String(value??'').trim();
const posix=value=>clean(value).replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/,'');
const stableHash=value=>{let h=2166136261;for(const ch of String(value??'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return(h>>>0).toString(36);};
const RELEASE_RANK=Object.freeze({'release-confirmed':0,'development-confirmed':1,reviewing:2,other:3});
const ENGINE_RANK=Object.freeze({web:0,roblox:1,unity:1,unreal:3,godot:4});
const SEVERITY_PRIORITY=Object.freeze({critical:'critical',high:'high',medium:'normal',low:'low'});

function readJson(file,fallback={}){if(!file||!fs.existsSync(file))return fallback;return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');}
function parseArgs(argv=process.argv.slice(2)){const args={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)args[body]=true;else args[body.slice(0,at)]=body.slice(at+1);}return args;}
function parallelLimit(value){
  const raw=Number(value);
  if(!Number.isFinite(raw)||raw<=0)return DEFAULT_MAX_CONCURRENT_TASKS;
  return Math.max(1,Math.floor(raw));
}
function releaseState(value){const normalized=clean(value).toLowerCase();return Object.hasOwn(RELEASE_RANK,normalized)?normalized:'other';}
function stateFromCatalog(game={}){const cls=clean(game.productionClass).toUpperCase();if(cls==='RELEASE_CONFIRMED')return'release-confirmed';if(cls==='DEVELOPMENT_CONFIRMED')return'development-confirmed';return releaseState(game.homepageCategory);}
function engineFromProject(project={}){const projectPath=posix(project.robloxProjectPath||project.projectPath||project.source),target=clean(project.selectedPlatform||project.targetPlatform||project.target).toLowerCase();if(projectPath.startsWith('roblox-games/')||target.startsWith('roblox'))return'roblox';if(projectPath.startsWith('unity-games/')||target.startsWith('unity'))return'unity';if(projectPath.startsWith('web-games/')||target==='web')return'web';if(projectPath.startsWith('unreal-games/')||target.startsWith('unreal'))return'unreal';if(projectPath.startsWith('godot-games/')||target.startsWith('godot'))return'godot';return null;}
function webRootFromCatalog(game={}){const webPath=posix(game.webPath).replace(/^\//,'');return /^web-games\/[a-zA-Z0-9._-]+$/.test(webPath)?webPath:null;}
function robloxRootFromCatalog(game={}){const explicit=posix(game.robloxProjectPath||game.robloxPath||'');if(/^roblox-games\/[a-zA-Z0-9._-]+$/.test(explicit))return explicit;const id=clean(game.id);return id?`roblox-games/${id}`:null;}
function catalogById(catalog={}){return new Map((Array.isArray(catalog.games)?catalog.games:[]).map(game=>[clean(game.id),game]));}
function permanentRemovalIds(catalog={}){return new Set((Array.isArray(catalog?.permanentRemovalPolicy?.ids)?catalog.permanentRemovalPolicy.ids:[]).map(clean).filter(Boolean));}
const CANONICAL_POLICY_PATH='company-learning/platform-release-roadmap.json';
const GAME_LIFECYCLE_STATES=new Set(['ACTIVE','PAUSED','REBUILD','RETIRED','REMOVED']);
export function gameLifecycleState(game={}){const raw=clean(game.lifecycleState||game.lifecycle?.state||'ACTIVE').toUpperCase();return GAME_LIFECYCLE_STATES.has(raw)?raw:'ACTIVE';}
function lifecycleAllowsDevelopment(game={}){return ['ACTIVE','REBUILD'].includes(gameLifecycleState(game));}
function isProductionImplementationTask(item={}){return clean(item.department).toLowerCase()==='development'&&clean(item.type).toLowerCase()==='implementation';}
const HISTORICAL_MAINTENANCE_REGISTRY_PATH='company-learning/roblox-sustained-maintenance.json';
function historicalMaintenanceById(registry={}){
  return new Map((Array.isArray(registry.assets)?registry.assets:[])
    .filter(entry=>entry?.maintenanceEligible===true&&entry?.currentReleaseClaim===false&&clean(entry?.recoveryState)==='HISTORICAL_PUBLICATION_TARGET_VERIFIED')
    .map(entry=>[clean(entry.gameId),entry])
    .filter(([gameId])=>Boolean(gameId)));
}
function registeredHistoricalMaintenanceTask(item={},registryById=new Map()){
  const entry=registryById.get(clean(item.gameId));if(!entry)return false;
  const evidence=new Set((Array.isArray(item.evidence)?item.evidence:[]).map(clean));
  return item.postReleaseFocused===true
    &&item.packageLongWorkProtected===true
    &&clean(item.packageRole)==='implementation-owner'
    &&clean(item.target).toLowerCase()==='roblox'
    &&clean(item.releaseState).toLowerCase()==='development-confirmed'
    &&posix(item.sourceRoot)===posix(entry.sourceRoot)
    &&evidence.has('historical-deployment-recovery:yes')
    &&evidence.has('historical-current-release-claim:NO')
    &&evidence.has('maintenance-registry:'+HISTORICAL_MAINTENANCE_REGISTRY_PATH);
}
function synchronizeQueueLifecycle(queueInput={},catalog={},historicalRegistry={}){
  const byId=catalogById(catalog),historicalById=historicalMaintenanceById(historicalRegistry),removed=permanentRemovalIds(catalog);
  const tasks=(Array.isArray(queueInput?.tasks)?queueInput.tasks:[]).map(item=>{
    if(!isProductionImplementationTask(item))return item;
    const gameId=clean(item.gameId);
    if(removed.has(gameId)){
      return{...item,status:'cancelled',blocker:'lifecycle-inactive:REMOVED_PERMANENTLY',reservationId:null,reservationRunId:null,reservationRunAttempt:0,reservedAt:null,lastOutcome:'CANCELLED_BY_OWNER_PERMANENT_REMOVAL',postReleaseFocused:false,historicalDeploymentRecovery:false,evidence:[...new Set([...(item.evidence||[]),'lifecycle-sync:REMOVED_PERMANENTLY','owner-permanent-removal:yes'])]};
    }
    const game=byId.get(gameId);
    if(!game&&registeredHistoricalMaintenanceTask(item,historicalById)){
      const recovered={...item,historicalDeploymentRecovery:true};
      if(clean(item.status).toLowerCase()==='cancelled'&&clean(item.blocker)==='lifecycle-inactive:MISSING_FROM_CATALOG'){
        return{...recovered,status:'queued',blocker:null,reservationId:null,reservationRunId:null,reservationRunAttempt:0,reservedAt:null,lastOutcome:null,evidence:[...new Set([...(item.evidence||[]),'lifecycle-sync:HISTORICAL_REGISTRY_ACTIVE','self-recovery:HISTORICAL_DEPLOYMENT_FLAG_RESTORED'])]};
      }
      return recovered;
    }
    if(!game||!lifecycleAllowsDevelopment(game)){
      const state=game?gameLifecycleState(game):'MISSING_FROM_CATALOG';
      if(item.status==='queued')return{...item,status:'cancelled',blocker:`lifecycle-inactive:${state}`,evidence:[...new Set([...(item.evidence||[]),`lifecycle-sync:${state}`])]};
      if(item.status==='running')return{...item,blocker:`lifecycle-stop-requested:${state}`,evidence:[...new Set([...(item.evidence||[]),`lifecycle-stop-requested:${state}`])]};
      return item;
    }
    const currentReleaseState=stateFromCatalog(game);
    if(!['release-confirmed','development-confirmed'].includes(currentReleaseState)&&['queued','running','blocked'].includes(clean(item.status).toLowerCase())){
      const authority=clean(game.productionClass).toUpperCase()||currentReleaseState.toUpperCase()||'OTHER';
      return{
        ...item,
        status:'cancelled',
        blocker:`production-authority-inactive:${authority}`,
        reservationId:null,
        reservationRunId:null,
        reservationRunAttempt:0,
        reservedAt:null,
        lastOutcome:'CANCELLED_BY_CENTRAL_PRODUCTION_AUTHORITY',
        evidence:[...new Set([...(item.evidence||[]),`production-authority-sync:${authority}`])]
      };
    }
    return item;
  });
  return{...(queueInput||{}),tasks};
}

export function latestDevelopmentBaselineEvidence(gameId,repoRoot=process.cwd()){const id=clean(gameId),root=path.join(repoRoot,'design',id),missing={ready:false,reason:'DEVELOPMENT_BASELINE_REQUIRED',source:null,gate:null,policySource:CANONICAL_POLICY_PATH};if(!id||!fs.existsSync(root))return missing;const policy=readJson(path.join(repoRoot,CANONICAL_POLICY_PATH),null);if(policy&&(clean(policy.authority)!=='MACHINE_EXECUTION_CONTRACT'||clean(policy.machineSourceOfTruth)!==CANONICAL_POLICY_PATH||policy.humanDocumentRequired!==false))return{...missing,reason:'CENTRAL_MACHINE_POLICY_INVALID'};let dates=[];try{dates=fs.readdirSync(root,{withFileTypes:true}).filter(e=>e.isDirectory()&&/^\d{4}-\d{2}-\d{2}$/.test(e.name)).map(e=>e.name).sort().reverse();}catch{return missing;}for(const date of dates){const file=path.join(root,date,'cycle-status.json'),status=readJson(file,null),gate=status?.baselineGate;if(!gate||gate.state!=='DEVELOPMENT_BASELINE_READY'||gate.ready!==true)continue;const e=gate.evidence||{};if(e.webGameplay?.pass!==true||e.unityProject?.present!==true||e.unityTechnical?.pass!==true)continue;return{ready:true,reason:'DEVELOPMENT_BASELINE_READY',source:posix(path.relative(repoRoot,file)),gate,policySource:CANONICAL_POLICY_PATH,historicalPolicyDocument:clean(gate.policyDocument)||null};}return missing;}
function latestDevelopmentValidationStatus(gameId,repoRoot=process.cwd()){const id=clean(gameId),root=path.join(repoRoot,'design',id),missing={state:'MISSING',score:null,blockers:[],path:null,evidence:null};if(!id||!fs.existsSync(root))return missing;let dates=[];try{dates=fs.readdirSync(root,{withFileTypes:true}).filter(e=>e.isDirectory()&&/^\d{4}-\d{2}-\d{2}$/.test(e.name)).map(e=>e.name).sort().reverse();}catch{return missing;}for(const date of dates){for(const name of ['development-validation-status.json','cycle-status.json']){const file=path.join(root,date,name);if(!fs.existsSync(file))continue;const data=readJson(file,null);if(!data||clean(data.gameId)!==id)continue;const score=Number(data.webStrictScore??data?.evidence?.web?.webStrictScore);return{state:clean(data.state).toUpperCase()||'MISSING',score:Number.isFinite(score)?score:null,blockers:Array.isArray(data.blockers)?data.blockers.map(clean).filter(Boolean):[],path:posix(path.relative(repoRoot,file)),evidence:data?.evidence||null,nextAction:clean(data.nextAction)};}}return missing;}
function bottleneckRank(project={}){const v=project.developmentValidation||{},score=Number(v.score),state=clean(v.state).toUpperCase(),blockers=Array.isArray(v.blockers)?v.blockers:[];if(project.engine==='web'&&score>=80&&score<=88)return 0;if(blockers.length===1)return 1;if(project.engine==='web'&&project.releaseState==='development-confirmed'&&state==='MISSING')return 2;if(/REVALIDATION|RETURN_TO_WEB_DEVELOPMENT/.test(state))return 3;if(clean(project.lifecycleState).toUpperCase()==='REBUILD')return 4;return 5;}

function collectProjects(status={},catalog={},repoRoot=process.cwd(),developmentQueue={}){const byId=catalogById(catalog),removed=permanentRemovalIds(catalog),rows=[];for(const project of Array.isArray(status.projects)?status.projects:[]){const id=clean(project.gameId),engine=engineFromProject(project),root=posix(project.robloxProjectPath||project.projectPath||project.source);if(!id||removed.has(id)||!engine||!root||clean(project.ownerDecision).toUpperCase()!=='PASS')continue;const game=byId.get(id);if(!game||!lifecycleAllowsDevelopment(game))continue;const state=stateFromCatalog(game),developmentBaseline=state==='release-confirmed'&&engine==='unity'?latestDevelopmentBaselineEvidence(id,repoRoot):null,developmentValidation=latestDevelopmentValidationStatus(id,repoRoot);rows.push({...project,gameId:id,engine,projectPath:root,lifecycleState:gameLifecycleState(game),releaseState:state,existing:true,source:'company-status',developmentBaseline,developmentValidation});}
for(const item of Array.isArray(developmentQueue?.items)?developmentQueue.items:[]){
  const id=clean(item?.gameId),game=byId.get(id);
  if(!id||removed.has(id)||!game||!lifecycleAllowsDevelopment(game))continue;
  if(clean(item?.status).toUpperCase()!=='ACTIVE'||stateFromCatalog(game)!=='development-confirmed')continue;
  const existingWeb=rows.find(r=>r.gameId===id&&r.engine==='web');
  if(existingWeb){
    existingWeb.queueCurrentStep=clean(item?.currentStep);
    existingWeb.queueCanonicalState=clean(item?.canonicalState);
    existingWeb.queueRoutingBlockers=(Array.isArray(item?.routingBlockers)?item.routingBlockers:[]).map(clean).filter(Boolean).slice(0,4);
    existingWeb.queueVibeWebRequestedStage=clean(item?.vibeWebRequestedStage);
    existingWeb.queueVibeWebImplementationReason=clean(item?.vibeWebImplementationReason);
    existingWeb.queueStrictImplementationHardFailures=(Array.isArray(item?.strictImplementationHardFailures)?item.strictImplementationHardFailures:[]).map(clean).filter(Boolean).slice(0,4);
    existingWeb.queueWebValidationLastAttemptAt=clean(item?.webValidationLastAttemptAt||item?.webFinalContentDepthLastAttemptAt);
    existingWeb.saveNormalizationRequired=item?.saveNormalizationRequired===true;
    existingWeb.companyDevelopmentQueueSource=true;
    continue;
  }
  const root=posix(item?.webSourcePath||item?.sourcePath||`web-games/${id}`);
  if(!/^web-games\/[a-zA-Z0-9._-]+$/.test(root))continue;
  rows.push({
    gameId:id,
    name:clean(item?.gameName||game?.name||id),
    engine:'web',
    target:'web',
    projectPath:root,
    lifecycleState:gameLifecycleState(game),
    existing:fs.existsSync(path.join(repoRoot,root,'index.html')),
    releaseState:'development-confirmed',
    progress:Number(item?.progress||0),
    source:'company-development-queue',
    developmentBaseline:null,
    developmentValidation:latestDevelopmentValidationStatus(id,repoRoot),
    queueCurrentStep:clean(item?.currentStep),
    queueCanonicalState:clean(item?.canonicalState),
    queueRoutingBlockers:(Array.isArray(item?.routingBlockers)?item.routingBlockers:[]).map(clean).filter(Boolean).slice(0,4),
    queueVibeWebRequestedStage:clean(item?.vibeWebRequestedStage),
    queueVibeWebImplementationReason:clean(item?.vibeWebImplementationReason),
    queueStrictImplementationHardFailures:(Array.isArray(item?.strictImplementationHardFailures)?item.strictImplementationHardFailures:[]).map(clean).filter(Boolean).slice(0,4),
    queueWebValidationLastAttemptAt:clean(item?.webValidationLastAttemptAt||item?.webFinalContentDepthLastAttemptAt),
    saveNormalizationRequired:item?.saveNormalizationRequired===true,
    ownerPreservationPresentationUpgrade:item?.ownerPreservationPresentationUpgrade===true,
    presentationFirstPass:clean(item?.presentationFirstPass)
  });
}
for(const game of Array.isArray(catalog.games)?catalog.games:[]){const id=clean(game.id);if(removed.has(id)||!lifecycleAllowsDevelopment(game))continue;const state=stateFromCatalog(game),robloxRoot=robloxRootFromCatalog(game);if(id&&robloxRoot&&['release-confirmed','development-confirmed'].includes(state)&&fs.existsSync(path.join(repoRoot,robloxRoot))&&!rows.some(r=>r.gameId===id&&r.engine==='roblox'))rows.push({gameId:id,name:clean(game.name),engine:'roblox',target:'roblox',projectPath:robloxRoot,existing:true,releaseState:state,progress:0,source:'game-catalog',developmentBaseline:null});const root=webRootFromCatalog(game),developmentWebEligible=state==='development-confirmed',publishedWebEligible=game.homepageWebPlayable===true;if(!id||!root||game.hasWebArchive!==true||(!developmentWebEligible&&!publishedWebEligible))continue;if(rows.some(r=>r.gameId===id&&r.engine==='web'))continue;const exists=fs.existsSync(path.join(repoRoot,root));rows.push({gameId:id,name:clean(game.name),engine:'web',target:'web',projectPath:root,lifecycleState:gameLifecycleState(game),existing:exists,releaseState:state,progress:0,source:'game-catalog',developmentBaseline:null,developmentValidation:latestDevelopmentValidationStatus(id,repoRoot)});}return rows;}
function projectSort(a,b){const bottleneck=bottleneckRank(a)-bottleneckRank(b);if(bottleneck)return bottleneck;const engine=(ENGINE_RANK[a.engine]??9)-(ENGINE_RANK[b.engine]??9);if(engine)return engine;const release=(RELEASE_RANK[a.releaseState]??9)-(RELEASE_RANK[b.releaseState]??9);if(release)return release;return Number(b.progress||0)-Number(a.progress||0)||a.gameId.localeCompare(b.gameId);}
function isAutonomousProductionTarget(project={}){if(project.engine==='roblox')return['release-confirmed','development-confirmed'].includes(project.releaseState);if(project.releaseState==='release-confirmed')return project.engine==='unity'&&project.developmentBaseline?.ready===true;if(project.releaseState==='development-confirmed')return project.engine==='web';return false;}
function sourceFile(root,relative){return path.join(root,...posix(relative).split('/'));}
function readText(file){try{return fs.readFileSync(file,'utf8');}catch{return'';}}
function hasTask(queue,id){return queue.tasks.some(item=>item.id===id);}
function taskDone(queue,id){return queue.tasks.some(item=>item.id===id&&clean(item.status).toLowerCase()==='done');}
function activeTasks(queue){return queue.tasks.filter(item=>['queued','running'].includes(clean(item.status).toLowerCase()));}
function isDevelopmentImplementation(item={}){return clean(item.department).toLowerCase()==='development'&&clean(item.type).toLowerCase()==='implementation';}
function isReleaseWait(item={}){return clean(item.status).toLowerCase()==='running'&&/candidate-awaiting-qa-and-deployment|awaiting.*qa|qa.*awaiting|slot-released.*fan-in/i.test(clean(item.blocker));}
function developmentPlanningPool(queue){return activeTasks(queue).filter(item=>isDevelopmentImplementation(item)&&!isReleaseWait(item));}
function sameRootResponsibilityConflict(a={},b={}){const aRoot=posix(a.sourceRoot),bRoot=posix(b.sourceRoot);if(!aRoot||!bRoot||aRoot!==bRoot)return false;const aFiles=new Set((a.responsibleFiles||[]).map(posix).filter(Boolean)),bFiles=new Set((b.responsibleFiles||[]).map(posix).filter(Boolean));if(!aFiles.size||!bFiles.size)return true;for(const file of aFiles)if(bFiles.has(file))return true;return false;}
function plannerConflict(queue,task){return activeTasks(queue).some(item=>sameRootResponsibilityConflict(item,task));}
function task(id,project,goal,responsibleFiles,priority='normal',estimatedRisk='low',extraEvidence=[]){const baselineEvidence=project.releaseState==='release-confirmed'&&project.engine==='unity'&&project.developmentBaseline?.ready===true?[`development-baseline:${project.developmentBaseline.source}`]:[];return{id,gameId:project.gameId,target:project.engine,department:'development',type:'implementation',goal,responsibleFiles,dependencies:[],priority,releaseState:project.releaseState,status:'queued',retries:0,maxRetries:2,ownerDirective:false,requiresOwnerDecision:false,protectedChange:false,paidResourceRequired:false,sourceRoot:posix(project.projectPath),estimatedRisk,speculativeEligible:estimatedRisk==='high',evidence:[`central-policy:${CANONICAL_POLICY_PATH}`,`vibe2-auto-planner:${project.source}`,`release-state:${project.releaseState}`,`source-root:${posix(project.projectPath)}`,...baselineEvidence,...extraEvidence]};}

function transformativeTaskEligible(taskInput={}){
  const evidence=new Set((taskInput.evidence||[]).map(clean));
  if(evidence.has('full-web-game-rebuild')||evidence.has('existing-web-continuation')||evidence.has('existing-web-assessment-required'))return true;
  return /FULL_WEB_GAME_REBUILD|EXISTING_WEB_DEVELOPMENT_CONTINUATION|REBUILD_EXISTING_GAME|NEW_GAME_IMPLEMENTATION/i.test(clean(taskInput.goal));
}
function selectTransformativeRecipe(memory={},taskInput={}){
  const target=clean(taskInput.gameId);
  const recipes=Array.isArray(memory?.recipes)?memory.recipes.filter(recipe=>{
    const projects=[...new Set((recipe?.sourceProjects||[]).map(clean).filter(Boolean))];
    return recipe?.authority==='transformative-recombination-context-only'
      &&projects.length>=2
      &&!projects.includes(target)
      &&recipe?.assetStrategy?.newAssetRequired===true
      &&recipe?.assetStrategy?.outputMustBeNewExpression===true
      &&recipe?.codeStrategy?.newImplementationRequired===true
      &&recipe?.codeStrategy?.verbatimSourceReuseAllowed===false;
  }):[];
  if(!recipes.length)return null;
  const seed=parseInt(stableHash([taskInput.id,target,taskInput.target].join('|')),36);
  return recipes[Number.isFinite(seed)?seed%recipes.length:0]||null;
}
function applyTransformativeRecombination(taskInput={},memory={}){
  if(!transformativeTaskEligible(taskInput))return taskInput;
  const recipe=selectTransformativeRecipe(memory,taskInput);
  if(!recipe)return taskInput;
  const features=(recipe.featureBlend||[]).map(clean).filter(Boolean).slice(0,8);
  const sources=(recipe.sourceProjects||[]).map(clean).filter(Boolean).slice(0,4);
  const operator=clean(recipe.transformationOperator)||'reinterpret-and-recombine';
  const context=[
    '',
    '[TRANSFORMATIVE_RECOMBINATION_CONTEXT]',
    `recipe=${clean(recipe.id)||'unknown'}`,
    `source_projects=${sources.join(',')}`,
    `feature_blend=${features.join(',')}`,
    `transformation=${operator}`,
    'Use these as abstract design/implementation references only.',
    'Create a new project-specific mechanic/constraint and new code/asset expression.',
    'Do not emit raw source files, raw asset bytes, logos, source-specific identifiers, or verbatim implementation.',
    'Preserve the current game identity, approved design, gameplay authority, save meaning, and all existing QA/runtime/regression gates.'
  ].join('\n');
  return{
    ...taskInput,
    goal:`${taskInput.goal}${context}`,
    evidence:[...new Set([...(taskInput.evidence||[]),`recombination-recipe:${clean(recipe.id)||'unknown'}`,`recombination-sources:${sources.join('+')}`,`recombination-transform:${operator}`,'recombination-copy-mode:NO','recombination-original-modifier-required:YES'])]
  };
}

function compactRuntimeFailureEvidence({requestedStage='',implementationReason='',routingBlockers=[],strictHardFailures=[],developmentBlockers=[],lastValidationAt=''}={}){
  const reason=clean(implementationReason);
  const sameReasonBlocker=value=>{
    const raw=clean(value),payload=raw.replace(/^vibe-web-implementation-required:[^:]+:/i,'');
    if(!raw||!reason)return false;
    return payload===reason||reason.startsWith(payload)||payload.startsWith(reason);
  };
  return[
    clean(requestedStage)?`requested-stage=${clean(requestedStage)}`:'',
    reason?`implementation-reason=${reason}`:'',
    ...(Array.isArray(routingBlockers)?routingBlockers:[]).map(clean).filter(Boolean).filter(value=>!sameReasonBlocker(value)).slice(0,4).map(value=>`routing-blocker=${value.slice(0,900)}`),
    ...(Array.isArray(strictHardFailures)?strictHardFailures:[]).map(clean).filter(Boolean).slice(0,4).map(value=>`strict-hard-failure=${value.slice(0,500)}`),
    ...(Array.isArray(developmentBlockers)?developmentBlockers:[]).map(clean).filter(Boolean).slice(0,4).map(value=>`development-validation-blocker=${value.slice(0,500)}`),
    clean(lastValidationAt)?`last-validation-at=${clean(lastValidationAt)}`:''
  ].filter(Boolean);
}
function webRepairImplementationHints(evidence=[]){
  const text=(evidence||[]).map(clean).filter(Boolean).join('|').toUpperCase();
  const hints=[];
  const add=(pattern,hint)=>{if(pattern.test(text))hints.push(hint);};
  add(/APPROVED_SCOPE_TOWER_POSITION_INPUT_REQUIRED/,'실제 플레이어의 pointer/touch 좌표를 받아 배치·타워 위치를 결정하고 고정 좌표나 테스트 전용 배치를 사용하지 않는다.');
  add(/MOBILE_TOUCH_ACTION_NOT_CONNECTED/,'모바일 touch/pointer 입력을 실제 게임 액션 함수와 상태 변화에 직접 연결한다.');
  add(/APPROVED_SCOPE_REAL_SPATIAL_STATE_REQUIRED/,'카운터나 가짜 상태 대신 실제 엔티티 x/y 위치와 공간 상태를 런타임 게임 루프에 연결한다.');
  add(/APPROVED_SCOPE_REAL_ENTITY_INTERACTION_REQUIRED/,'실제 런타임 엔티티가 이동·타게팅·충돌·공격 등 승인된 상호작용을 수행하게 연결한다.');
  add(/REAL_GAME_MECHANIC_COUNT_TOO_LOW/,'누락된 승인 gameplay mechanic을 실제 입력과 상태 변화가 있는 기능으로 구현하고 라벨·테스트 버튼으로 대체하지 않는다.');
  add(/REAL_GAME_SYSTEM_COUNT_REQUIRED/,'누락된 런타임 시스템을 실제 핵심 루프에 연결하고 단순 표시용 객체로 추가하지 않는다.');
  add(/COMPLETE_PLAYABLE_GAMEPLAY_CYCLE_REQUIRED/,'플레이어 입력 → 게임 상태 진행 → 결과·보상 또는 실패 → 재시작·다음 진행으로 이어지는 완전한 플레이 사이클을 만든다.');
  add(/RUN_RESULT_STATE_REQUIRED/,'런타임에 명시적인 playing/win/loss 결과 상태를 두고 실제 조건에서 전환되게 한다.');
  add(/WIN_CONDITION_REQUIRED/,'실제 플레이로 도달 가능한 승리 조건과 승리 상태 전환을 구현한다.');
  add(/LOSS_CONDITION_REQUIRED/,'실제 플레이에서 발생 가능한 패배 조건과 패배 상태 전환을 구현한다.');
  add(/INITIAL_30_MINUTE_PROXY_FORBIDDEN/,'시간 프록시나 검증용 우회 상태 대신 실제 gameplay 진행 상태로 초기 플레이 구간을 구성한다.');
  add(/WEB_TEST_HARNESS_FORBIDDEN|TEST_HARNESS_SCOPE_CONTROL_ID_FORBIDDEN/,'테스트 하네스·검증 전용 버튼·scope 제어 ID를 gameplay UI로 쓰지 말고 실제 플레이 입력 UI로 교체한다.');
  add(/MUSIC_MUTE_CONTROL_REQUIRED/,'실제 오디오 재생 상태에 연결된 mute 토글을 제공한다.');
  add(/MUSIC_VOLUME_CONTROL_REQUIRED/,'실제 오디오 볼륨에 연결된 사용자 volume control을 제공한다.');
  add(/SCRIPT_SRC_FORBIDDEN/,'외부 script src 의존을 제거하고 허용된 기존 index.html 내부 런타임 코드로 유지한다.');
  add(/REAL_GAME_FOOTPRINT_TOO_SMALL|REAL_GAME_LOGIC_TOO_SMALL/,'문자 수를 채우지 말고 위 검증 실패를 해결하는 실제 gameplay 로직·상태·입력 연결을 추가한다.');
  return [...new Set(hints)].slice(0,8);
}
function findWebAssessmentTask(project,repoRoot,queue){
  if(project.engine!=='web'||project.releaseState!=='development-confirmed')return null;
  const relative=`${posix(project.projectPath)}/index.html`,file=sourceFile(repoRoot,relative),missing=!fs.existsSync(file);
  if(missing){
    const id=`${project.gameId}-web-base-implementation-v1`;if(hasTask(queue,id))return null;
    const goal=`[WEB_BASE_IMPLEMENTATION] FULL_WEB_GAME_REBUILD SOURCE_ROOT_BOOTSTRAP_ALLOWED\n게임: ${project.name||project.gameId}\n승인 설계와 scope를 기준으로 Vibe가 실제 플레이 가능한 모바일 Web 1차 baseline을 새로 구현한다. 검증된 경험과 transformative recombination context는 참고하되 원본 코드·원본 에셋·식별자를 복사하지 않는다. 회사/홈페이지 정책 파일은 수정하지 않는다.`;
    const out=task(id,project,goal,[relative],'owner-immediate','medium',['owner-directive:webgame-first','web-stage:WEB_BASE_IMPLEMENTATION','source-root-bootstrap-required','full-web-game-rebuild','existing-web-source:MISSING']);out.ownerDirective=true;out.speculativeEligible=false;return out;
  }
  const queueState=clean(project.queueCanonicalState).toUpperCase(),queueStep=clean(project.queueCurrentStep).toUpperCase();
  if(queueState==='WEB_VIBE_REPAIR_REQUIRED'||queueStep==='VIBE_WEB_REPAIR'){
    const id=`${project.gameId}-web-runtime-repair-v1`;if(hasTask(queue,id))return null;
    const runtimeFailureEvidence=compactRuntimeFailureEvidence({
      requestedStage:project.queueVibeWebRequestedStage,
      implementationReason:project.queueVibeWebImplementationReason,
      routingBlockers:project.queueRoutingBlockers,
      strictHardFailures:project.queueStrictImplementationHardFailures,
      developmentBlockers:project.developmentValidation?.blockers,
      lastValidationAt:project.queueWebValidationLastAttemptAt
    });
    const runtimeRepairHints=webRepairImplementationHints(runtimeFailureEvidence);
    const runtimeHintContext=runtimeRepairHints.length?`\n[WEB_REPAIR_IMPLEMENTATION_HINTS]\n- ${runtimeRepairHints.join('\n- ')}`:'';
    const runtimeFailureContext=runtimeFailureEvidence.length
      ?`\n[COMPANY_RUNTIME_FAILURE_EVIDENCE]\n${runtimeFailureEvidence.join('\n')}${runtimeHintContext}\n위 실패 증거와 현재 index.html을 직접 대조해서 실제 누락/오동작 책임 영역을 최소 범위로 수정한다. no-op 수정은 금지한다.`
      :'\n[COMPANY_RUNTIME_FAILURE_EVIDENCE]\n구체 실패 증거가 아직 비어 있으면 현재 Web validation 계약과 index.html을 대조해 실제 검증 실패를 만드는 가장 작은 누락 기능을 찾아 최소 1개 이상 실질 수정한다. no-op 수정은 금지한다.';
    const goal=`[WEB_REPAIR] 게임: ${project.name||project.gameId}\ncompany-runtime이 WEB_VIBE_REPAIR_REQUIRED로 반환한 기존 Web 소스를 현재 승인 설계와 검증 근거에 맞춰 직접 수리한다. 기존 게임 정체성·세이브·핵심 루프를 보존하고 실패 원인 책임 영역만 수정한다. Web gameplay/runtime/strict/promotion 게이트는 약화하지 않으며 회사/홈페이지 정책 파일은 수정하지 않는다.${runtimeFailureContext}`;
    const out=task(id,project,goal,[relative],'owner-immediate','medium',['owner-directive:webgame-first','web-stage:WEB_REPAIR','company-runtime-state:WEB_VIBE_REPAIR_REQUIRED','recovery-exact-stage:WEB_REPAIR','preserve-existing-game']);out.ownerDirective=true;out.speculativeEligible=false;return out;
  }
  const id=`${project.gameId}-existing-web-assessment-v1`;if(hasTask(queue,id))return null;
  const goal=`[EXISTING_WEB_ASSESS_AND_IMPLEMENT]\n게임: ${project.name||project.gameId}\n기존 Web 소스를 먼저 읽고 승인 설계와 비교한다. exploration의 EXISTING_WEB_STRATEGY가 KEEP_AND_CONTINUE면 현재 구조를 보존하며 필요한 개발만 이어가고, PARTIAL_REPAIR면 문제 책임 영역만 수정하고, MAJOR_REWORK면 쓸 수 있는 시스템·세이브·핵심 루프를 보존한 채 큰 결함을 재구성한다. FULL_REBUILD는 exploration이 실제 게임성 신호와 승인 scope 근거가 부족하다고 판정한 경우에만 허용한다. 파일 존재 여부나 프로토타입 문구 하나만으로 전체 재구축을 결정하지 않는다. 검증된 학습은 새 코드·새 에셋 표현으로 재조합하고 기존 게임 정체성과 승인 설계를 유지한다.`;
  const out=task(id,project,goal,[relative],'owner-immediate','medium',['owner-directive:webgame-first','web-stage:WEB_BASE_IMPLEMENTATION','existing-web-assessment-required','strategy-decision:EXPLORATION','prototype-marker-alone-cannot-force-rebuild']);out.ownerDirective=true;out.speculativeEligible=false;return out;
}
function findUnityTask(project,repoRoot,queue){const projectPath=posix(project.projectPath),runtimeRel=`${projectPath}/Assets/Scripts/RuntimeBootstrap.cs`,coreRel=`${projectPath}/Assets/Scripts/GameCore.cs`,motionRel=`${projectPath}/Assets/Scripts/PrototypeAnimatedVisuals.cs`,runtime=readText(sourceFile(repoRoot,runtimeRel)),core=readText(sourceFile(repoRoot,coreRel)),motion=readText(sourceFile(repoRoot,motionRel));if(runtime&&core&&core.includes('["field-4"]')&&!runtime.includes('FIELD 4')&&!hasTask(queue,`${project.gameId}-region-controls-4-7`))return task(`${project.gameId}-region-controls-4-7`,project,'GameCatalog에 이미 존재하는 field-4, field-5, field-6, jungle 지역을 RuntimeBootstrap 이동 UI에 연결한다. 기존 RegionDefinition.recommendedLevelMin을 사용하고 전투 수치·보상·세이브·지역 데이터는 변경하지 않는다.',[runtimeRel],'high');if(core&&core.includes('public List<string> ownedWeapons')&&!core.includes('Player.ownedWeapons ??=')&&!hasTask(queue,`${project.gameId}-save-null-guards`))return task(`${project.gameId}-save-null-guards`,project,'GameCore.Load 직후 오래되거나 불완전한 JSON 세이브에서 ownedWeapons, ownedArmors, completedHiddenQuests가 null이면 빈 목록으로 복구한다. SaveKey, 데이터 버전, 수치와 소유 의미는 변경하지 않는다.',[coreRel]);if(motion&&motion.includes('public void PlayTravelToBattle()')&&!/PlayTravelToBattle\(\)[\s\S]{0,500}StopCoroutine\(_combatRoutine\)/.test(motion)&&!hasTask(queue,`${project.gameId}-motion-routine-safety`))return task(`${project.gameId}-motion-routine-safety`,project,'PrototypeAnimatedVisuals에서 전투 코루틴 중 새 이동 모션을 시작할 때 이전 combat routine을 안전하게 중지해 애니메이션 상태 덮어쓰기를 막는다. 전투 판정 타이밍·데미지·보상·에셋은 변경하지 않는다.',[motionRel]);return null;}
function diagnosticKey(issue,micro){return`${clean(issue?.type)||'UNKNOWN'}:${posix(micro?.file)||'unknown'}`;}
function diagnosticSeen(queue,key){return queue.tasks.some(item=>(item.evidence||[]).some(e=>clean(e)===`diagnostic-key:${key}`));}
function diagnosticTaskId(project,rows){const token=rows.map(({issue,micro})=>`${clean(issue?.type)}-${posix(micro?.file)}`).join('-').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(-72)||'issues';return`${project.gameId}-diagnostic-bundle-${token}`;}
function findWebDiagnosticTask(project,repoRoot,queue){
  if(project.engine!=='web'||project.releaseState!=='development-confirmed')return null;
  const root=sourceFile(repoRoot,project.projectPath);if(!fs.existsSync(root))return null;
  let report;try{report=diagnoseGame(root,{maxIssues:20});}catch{return null;}
  const rows=[];
  for(const issue of report.issues||[]){
    const micro=microTaskFromIssue(issue);if(!micro?.file||!micro?.goal)continue;
    const key=diagnosticKey(issue,micro);if(diagnosticSeen(queue,key))continue;
    rows.push({issue,micro,key});if(rows.length>=4)break;
  }
  if(!rows.length)return null;
  const id=diagnosticTaskId(project,rows);if(hasTask(queue,id))return null;
  const files=[...new Set(rows.map(({micro})=>`${posix(project.projectPath)}/${posix(micro.file)}`))];
  const priorities=rows.map(({issue})=>SEVERITY_PRIORITY[clean(issue.severity).toLowerCase()]||'normal');
  const priority=priorities.includes('critical')?'critical':priorities.includes('high')?'high':priorities.includes('normal')?'normal':'low';
  const estimatedRisk=rows.some(({micro})=>micro.repairMode!=='RULE_PATCH')?'medium':'low';
  const goals=rows.map(({micro},i)=>`${i+1}. ${micro.goal}`);
  const evidence=rows.flatMap(({issue,micro,key})=>[`diagnostic:${clean(issue.type)||'UNKNOWN'}`,`diagnostic-key:${key}`,`diagnostic-severity:${clean(issue.severity)||'unknown'}`,`repair-mode:${clean(micro.repairMode)||'MODEL'}`]);
  const out=task(id,project,`[DIAGNOSTIC_BUNDLE] 같은 기능 경계의 관련 문제를 한 번에 해결한다.\n${goals.join('\n')}\n각 수정 후 해당 파일의 접근성/모바일 입력/기본 성능·문법 안정성도 함께 확인한다.`,files,priority,estimatedRisk,evidence);
  out.workUnits=Math.max(3,Math.min(6,rows.length+1));
  return out;
}
export function findWebPresentationQualityTask(project,repoRoot,queue){
  if(project.engine!=='web'||project.releaseState!=='development-confirmed')return null;
  const relative=`${posix(project.projectPath)}/index.html`,file=sourceFile(repoRoot,relative);
  if(!fs.existsSync(file))return null;
  const stages=[
    {key:'asset-adaptation',pass:'ASSET_ADAPTATION',goal:'[PRESENTATION_PASS:ASSET_ADAPTATION] 기존 게임 로직·저장·밸런스·진행 의미를 그대로 보존하면서 현재 그래픽 표현을 게임 정체성에 맞게 정리한다. 기존 에셋/도형/텍스처/색/재질 표현을 우선 재사용하고 Style Lock을 일관되게 적용한다. 원본 의미를 덮어쓰는 임시 wrapper나 중복 렌더 파이프라인을 만들지 않는다.'},
    {key:'living-motion',pass:'LIVING_MOTION',goal:'[PRESENTATION_PASS:LIVING_MOTION] 캐릭터와 주요 엔티티가 정지 상태에서도 살아 움직이도록 미세 호흡/자세 변화를 넣고, Idle↔Walk↔Run 또는 현재 게임의 등가 이동 상태를 속도 기반으로 부드럽게 연결한다. 가속·감속·회전 후행·무기/장식 secondary motion을 적용하고 순간 스냅과 끊긴 상태 전환을 줄인다. 판정·이동속도·밸런스는 변경하지 않는다.'},
    {key:'animation-feel',pass:'ANIMATION_FEEL',goal:'[PRESENTATION_PASS:ANIMATION_FEEL] 주요 공격/상호작용 하나 이상을 준비→가속→impact→짧은 표현용 hit-stop→반동→복귀 흐름으로 다듬는다. 빠른 동작은 smear/trail, 무거운 동작은 overshoot/settle을 검토한다. 실제 데미지/쿨다운/판정 시점은 기존 authoritative gameplay event를 보존하고 표현만 동기화한다.'},
    {key:'vfx',pass:'VFX',goal:'[PRESENTATION_PASS:VFX] 핵심 행동의 시각 피드백을 hit flash, trail/afterimage, impact wave/particle, danger telegraph, reward emphasis 중 게임에 맞는 방식으로 강화한다. 효과는 모바일 입력과 위험 정보를 가리지 않게 제한하고 무제한 파티클 생성이나 매 프레임 불필요한 객체 생성을 피한다.'},
    {key:'audio-feel',pass:'AUDIO_FEEL',goal:'[PRESENTATION_PASS:AUDIO_FEEL] 기존 오디오 구조를 먼저 재사용해서 탐험/긴장/전투/보스/보상 중 실제 필요한 상태의 음악 전환과 핵심 효과음을 자연스럽게 연결한다. Web은 첫 사용자 제스처 이후 오디오를 시작하고 mute/volume을 유지하며 백그라운드 복귀 중복 재생을 막는다. 타격음은 기존 impact event와 맞추고 반복음은 기계적인 반복감을 줄인다.'},
    {key:'camera-language',pass:'CAMERA_LANGUAGE',goal:'[PRESENTATION_PASS:CAMERA_LANGUAGE] 일반 행동은 미세한 카메라 반응, 강한 행동은 짧고 강한 반응, 보스/중요 순간은 통제된 hero moment가 되도록 카메라 언어를 정리한다. 줌/흔들림/추적은 모바일 가독성과 조작을 해치지 않고 멀미를 유발할 정도로 지속되지 않게 한다.'},
    {key:'polish-mobile',pass:'POLISH_MOBILE',goal:'[PRESENTATION_PASS:POLISH_MOBILE] 모션 시작/끝 팝, 이펙트 과밀, 오디오 끊김, UI 모션 불일치, 모바일 프레임/터치 간섭을 최종 정리한다. 가능한 기기에서 60FPS를 목표로 하고 저사양에서는 표현 비용만 낮추며 게임 의미·입력·저장·밸런스는 그대로 유지한다. 앞선 ASSET_ADAPTATION→LIVING_MOTION→ANIMATION_FEEL→VFX→AUDIO_FEEL→CAMERA_LANGUAGE 패스가 실제 구현된 상태를 보존한 뒤 gameplay root 또는 body에 data-presentation-quality-version="1"을 실제 품질 계약 선언으로 기록한다.'}
  ];
  let previousId=null;
  for(const stage of stages){
    const id=`${project.gameId}-presentation-${stage.key}-v1`;
    if(hasTask(queue,id)){
      if(!taskDone(queue,id))return null;
      previousId=id;
      continue;
    }
    if(previousId&&!taskDone(queue,previousId))return null;
    const out=task(id,project,stage.goal,[relative],'normal','medium',[
      'presentation-quality-pipeline:v1',
      `presentation-pass:${stage.pass}`,
      'quality-contract:livingMotionVisualQualityContract',
      'quality-contract:audioMusicQualityContract',
      'presentation-preserve-gameplay-semantics',
      'presentation-runtime-qa-required',
      'mobile-performance-qa-required'
    ]);
    out.workUnits=4;
    return out;
  }
  return null;
}
function scanExplicitMarkerTask(project,repoRoot,queue){
  const root=sourceFile(repoRoot,project.projectPath);if(!fs.existsSync(root))return null;
  const extensions=project.engine==='roblox'?new Set(['.luau','.lua','.json']):project.engine==='web'?new Set(['.html','.css','.js','.mjs','.json']):project.engine==='unity'?new Set(['.cs']):project.engine==='unreal'?new Set(['.cpp','.h','.hpp','.ini']):new Set(['.gd']);
  const stack=[root],rows=[];
  while(stack.length&&rows.length<3){
    const current=stack.pop();
    for(const entry of fs.readdirSync(current,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
      if(['node_modules','dist','build','.rbxcloud','Library','Temp','Logs','Binaries','Intermediate','Saved','DerivedDataCache','.git'].includes(entry.name))continue;
      const full=path.join(current,entry.name);
      if(entry.isDirectory()){stack.push(full);continue;}
      if(!extensions.has(path.extname(entry.name).toLowerCase()))continue;
      const text=readText(full);if(!/(TODO|FIXME|NotImplementedException)/.test(text))continue;
      const relative=posix(path.relative(repoRoot,full));
      if(queue.tasks.some(item=>(item.evidence||[]).includes(`maintenance-file:${relative}`)))continue;
      rows.push(relative);if(rows.length>=3)break;
    }
  }
  if(!rows.length)return null;
  const token=rows.map(x=>x.replace(/[^a-zA-Z0-9]+/g,'-')).join('-').slice(-64),id=`${project.gameId}-maintenance-bundle-${token}`;
  if(hasTask(queue,id))return null;
  const out=task(id,project,`[MAINTENANCE_BUNDLE] ${rows.join(', ')}에 이미 표시된 TODO/FIXME/NotImplementedException을 같은 기능 경계 안에서 가능한 만큼 함께 해결한다. 단순 한 줄 제거로 끝내지 말고 관련 안전성·오류 처리·기본 QA까지 책임 파일 범위에서 마무리한다. 핵심 규칙·밸런스·세이브 의미·유료 의존성은 바꾸지 않는다.`,rows,'low','medium',rows.map(x=>`maintenance-file:${x}`));
  out.workUnits=Math.max(3,rows.length+1);
  return out;
}
function expandTaskToMinimumWorkload(taskInput,project,policy){
  if(!taskInput)return null;
  const min=Math.max(2,Number(policy?.minWorkUnitsPerPackage||3));
  const current=estimateTaskWorkUnits(taskInput);
  if(taskInput.ownerDirective===true||current>=min)return taskInput;
  const scopes=project?.engine==='web'
    ? ['bug-hardening','ux-mobile-readability','qa-regression','performance-sanity']
    : ['bug-hardening','qa-regression','contract-safety'];
  const scopeText=project?.engine==='web'
    ? '1. 직접 관련 오류 처리/예외 경로 보강\n2. 모바일 입력·가독성·접근성 회귀 점검 및 발견 문제 수정\n3. 변경 영향 incremental QA 통과\n4. 같은 책임 범위의 기본 성능 퇴행 점검 및 발견 문제 수정'
    : '1. 직접 관련 오류 처리·불변조건 보강\n2. 변경 영향 incremental QA 통과\n3. 기존 계약·세이브·게임 규칙 회귀 점검 및 발견 문제 수정';
  const evidence=[...(taskInput.evidence||[]),'work-package-auto-expanded',...scopes.map(scope=>`work-package-scope:${scope}`)];
  return{
    ...taskInput,
    goal:`${taskInput.goal}\n\n[WORK PACKAGE AUTO-EXPANSION]\n${scopeText}`,
    evidence:[...new Set(evidence)]
  };
}
function uniqueTaskCandidates(rows=[]){const seen=new Set();return rows.filter(task=>{if(!task||seen.has(task.id))return false;seen.add(task.id);return true;});}
function findWebStrictImprovementTask(project,repoRoot,queue){if(project.engine!=='web'||project.releaseState!=='development-confirmed')return null;const v=project.developmentValidation||{},score=Number(v.score);if(!Number.isFinite(score)||score<80||score>88)return null;const relative=`${posix(project.projectPath)}/index.html`,file=sourceFile(repoRoot,relative);if(!fs.existsSync(file))return null;const id=`${project.gameId}-web-strict-improvement-to-89`;if(hasTask(queue,id))return null;const blockerText=(v.blockers||[]).join(' | ')||'latest validation weak axes';const goal=`[WEB_STRICT_80_88_TO_89] 현재 Web Strict 점수 ${score}점이다. 기존 실제 게임과 승인 설계는 보존하고 최신 development validation의 약한 축/차단 근거를 직접 수정해 89점 목표까지 품질을 올린다. 검증 근거: ${v.path||"unknown"}. blockers=${blockerText}. 숫자·라벨·검증 버튼만 바꾸는 점수 조작은 금지한다. 실제 플레이 변화, 시스템 연결, 장르 품질, Web 플랫폼 품질 중 근거가 약한 책임 영역을 구현하고 모바일/저장/회귀 QA를 다시 통과시킨다. 90점 승격 게이트나 독립 재검증 규칙은 변경하지 않는다.`;return task(id,project,goal,[relative],'high','medium',[`web-strict-score:${score}`,`development-validation:${v.path||"missing"}`,...(v.blockers||[]).map(x=>`validation-blocker:${x}`)]);}
function findExistingWebDevelopmentContinuationTask(project,repoRoot,queue){
  if(project.engine!=='web'||project.releaseState!=='development-confirmed')return null;
  const validation=project.developmentValidation||{};
  const score=Number(validation.score);
  if(clean(validation.state).toUpperCase()!=='MISSING'||Number.isFinite(score))return null;
  const relative=`${posix(project.projectPath)}/index.html`,file=sourceFile(repoRoot,relative);
  if(!fs.existsSync(file))return null;
  const id=`${project.gameId}-existing-web-development-continuation-v1`;
  if(hasTask(queue,id))return null;
  const goal=`[EXISTING_WEB_DEVELOPMENT_CONTINUATION] ${project.name||project.gameId}는 ACTIVE DEVELOPMENT_CONFIRMED 기존 실제 Web 게임이지만 최신 development validation이 아직 없다. 기존 게임/세이브/핵심 루프를 재생성하거나 초기화하지 말고 현재 소스를 기준으로 개발을 계속한다. 실제 플레이에서 체감되는 하나의 일관된 기능 패키지를 구현하거나 현재 끊긴 시스템 연결을 완성하고, 모바일 입력·상태 일치·저장 호환·실패/재시도·회귀 안정성을 함께 확인한다. 검증용 숫자/라벨/버튼만 추가하는 작업은 금지한다. 변경 후 다음 Web 실제 플레이 검증이 가능한 상태로 만든다. 회사/홈페이지 정책 파일은 수정하지 않는다.`;
  return task(id,project,goal,[relative],'high','medium',['existing-web-continuation','development-validation:missing','preserve-existing-game']);
}
function findSafeTasks(project,repoRoot,queue){
  if(project.engine==='roblox')return uniqueTaskCandidates([scanExplicitMarkerTask(project,repoRoot,queue)]);
  if(project.engine==='unity')return uniqueTaskCandidates([findUnityTask(project,repoRoot,queue),scanExplicitMarkerTask(project,repoRoot,queue)]);
  if(project.engine==='web'){
    const owner=findWebAssessmentTask(project,repoRoot,queue);
    if(owner)return[owner];
    if(project.ownerPreservationPresentationUpgrade===true)return uniqueTaskCandidates([findWebPresentationQualityTask(project,repoRoot,queue),findWebDiagnosticTask(project,repoRoot,queue),scanExplicitMarkerTask(project,repoRoot,queue)]);
    return uniqueTaskCandidates([findWebStrictImprovementTask(project,repoRoot,queue),findExistingWebDevelopmentContinuationTask(project,repoRoot,queue),findWebDiagnosticTask(project,repoRoot,queue),findWebPresentationQualityTask(project,repoRoot,queue),scanExplicitMarkerTask(project,repoRoot,queue)]);
  }
  return[];
}
function selectPackageCandidates(candidates,queue,remaining,policy){
  const selected=[];
  const limit=Math.max(1,Math.min(Number(policy?.maxTasksPerPackage||5),remaining));
  for(const candidate of candidates){
    if(!candidate||plannerConflict(queue,candidate))continue;
    if(selected.some(other=>sameRootResponsibilityConflict(other,candidate)))continue;
    selected.push(candidate);
    if(selected.length>=limit)break;
  }
  return selected;
}
function releaseUnityFocusBusy(queue){return activeTasks(queue).some(item=>item.target==='unity'&&item.releaseState==='release-confirmed');}

export function planVibe2AutonomousTasks({status={},catalog={},developmentQueue={},queue:queueInput={},repoRoot=process.cwd(),maxConcurrentTasks=DEFAULT_MAX_CONCURRENT_TASKS,queueMaxConcurrentTasks=maxConcurrentTasks,planningBacklogTarget=maxConcurrentTasks,planningBacklogMinimum=Math.min(40,Number(planningBacklogTarget)||0),workPackagePolicy={},recombinationMemory={},historicalRegistry={}}={}){
  const executionWaveMax=parallelLimit(maxConcurrentTasks);
  const persistentQueueMax=parallelLimit(queueMaxConcurrentTasks);
  const backlogTarget=Math.max(1,Math.min(persistentQueueMax,Number(planningBacklogTarget)||executionWaveMax));
  const backlogMinimum=Math.max(0,Math.min(backlogTarget,Number(planningBacklogMinimum)||0));
  let queue=createVibeContinuousQueue({...synchronizeQueueLifecycle(queueInput||{},catalog,historicalRegistry),maxConcurrentTasks:persistentQueueMax});
  const catalogGames=catalogById(catalog);
  const exactWebRepairItems=(Array.isArray(developmentQueue?.items)?developmentQueue.items:[])
    .filter(item=>{
      const gameId=clean(item?.gameId),game=catalogGames.get(gameId);
      const exactState=clean(item?.canonicalState).toUpperCase()==='WEB_VIBE_REPAIR_REQUIRED'||clean(item?.currentStep).toUpperCase()==='VIBE_WEB_REPAIR';
      return Boolean(gameId&&game&&exactState&&clean(item?.status).toUpperCase()==='ACTIVE'&&stateFromCatalog(game)==='development-confirmed'&&lifecycleAllowsDevelopment(game));
    });
  const exactWebRepairByGameId=new Map(exactWebRepairItems.map(item=>[clean(item?.gameId),item]));
  const exactWebRepairGameIds=new Set(exactWebRepairByGameId.keys());
  if(exactWebRepairGameIds.size){
    const tasks=queue.tasks.map(item=>{
      const gameId=clean(item?.gameId);
      if(!exactWebRepairGameIds.has(gameId))return item;
      const status=clean(item?.status).toLowerCase();
      const indexPath=`web-games/${gameId}/index.html`;
      const sourceMissing=!fs.existsSync(sourceFile(repoRoot,indexPath));
      const exactTaskId=sourceMissing?`${gameId}-web-base-implementation-v1`:`${gameId}-web-runtime-repair-v1`;
      if(clean(item?.id)===exactTaskId){
        const blocker=clean(item?.blocker);
        const staleExactBaseCancellation=blocker==='superseded-by:VIBE_WEB_REPAIR'||/^production-authority-inactive:/.test(blocker);
        if(sourceMissing&&status==='cancelled'&&staleExactBaseCancellation){
          return{...item,status:'queued',retries:0,blocker:null,reservationId:null,reservationRunId:null,reservationRunAttempt:0,reservedAt:null,lastOutcome:'RESTORED_BY_EXACT_WEB_BASE_IMPLEMENTATION',evidence:[...new Set([...(item.evidence||[]),'restored-exact-stage:WEB_BASE_IMPLEMENTATION',`restored-from:${blocker}`,'company-runtime-state:WEB_VIBE_REPAIR_REQUIRED'])]};
        }
        if(!sourceMissing&&['queued','failed','blocked'].includes(status)){
          const runtimeItem=exactWebRepairByGameId.get(gameId)||{};
          const game=catalogGames.get(gameId)||{};
          const runtimeFailureEvidence=compactRuntimeFailureEvidence({
            requestedStage:runtimeItem?.vibeWebRequestedStage,
            implementationReason:runtimeItem?.vibeWebImplementationReason,
            routingBlockers:runtimeItem?.routingBlockers,
            strictHardFailures:runtimeItem?.strictImplementationHardFailures,
            lastValidationAt:runtimeItem?.webValidationLastAttemptAt||runtimeItem?.webFinalContentDepthLastAttemptAt
          });
          const runtimeRepairHints=webRepairImplementationHints(runtimeFailureEvidence);
          const runtimeHintContext=runtimeRepairHints.length?`\n[WEB_REPAIR_IMPLEMENTATION_HINTS]\n- ${runtimeRepairHints.join('\n- ')}`:'';
          const runtimeFailureContext=runtimeFailureEvidence.length
            ?`\n[COMPANY_RUNTIME_FAILURE_EVIDENCE]\n${runtimeFailureEvidence.join('\n')}${runtimeHintContext}\n위 실패 증거와 현재 index.html을 직접 대조해서 실제 누락/오동작 책임 영역을 최소 범위로 수정한다. no-op 수정은 금지한다.`
            :'\n[COMPANY_RUNTIME_FAILURE_EVIDENCE]\n구체 실패 증거가 아직 비어 있으면 현재 Web validation 계약과 index.html을 대조해 실제 검증 실패를 만드는 가장 작은 누락 기능을 찾아 최소 1개 이상 실질 수정한다. no-op 수정은 금지한다.';
          const refreshedGoal=`[WEB_REPAIR] 게임: ${clean(runtimeItem?.gameName||game?.name||gameId)}\ncompany-runtime이 WEB_VIBE_REPAIR_REQUIRED로 반환한 기존 Web 소스를 현재 승인 설계와 검증 근거에 맞춰 직접 수리한다. 기존 게임 정체성·세이브·핵심 루프를 보존하고 실패 원인 책임 영역만 수정한다. Web gameplay/runtime/strict/promotion 게이트는 약화하지 않으며 회사/홈페이지 정책 파일은 수정하지 않는다.${runtimeFailureContext}`;
          if(clean(item.goal)!==clean(refreshedGoal)){
            return{...item,goal:refreshedGoal,evidence:[...new Set([...(item.evidence||[]),'company-runtime-failure-evidence:refreshed','company-runtime-state:WEB_VIBE_REPAIR_REQUIRED'])]};
          }
        }
        return item;
      }
      const implementation=clean(item?.target).toLowerCase()==='web'&&clean(item?.department).toLowerCase()==='development'&&clean(item?.type).toLowerCase()==='implementation';
      const overlapsIndex=posix(item?.sourceRoot)===`web-games/${gameId}`&&(item?.responsibleFiles||[]).map(posix).includes(indexPath);
      if(!implementation||!overlapsIndex||!['queued','failed','blocked'].includes(status))return item;
      const exactStage=sourceMissing?'VIBE_WEB_BASE_IMPLEMENTATION':'VIBE_WEB_REPAIR';
      const exactOutcome=sourceMissing?'SUPERSEDED_BY_EXACT_WEB_BASE_IMPLEMENTATION':'SUPERSEDED_BY_EXACT_WEB_REPAIR';
      return{...item,status:'cancelled',blocker:`superseded-by:${exactStage}`,reservationId:null,reservationRunId:null,reservationRunAttempt:0,reservedAt:null,lastOutcome:exactOutcome,evidence:[...new Set([...(item.evidence||[]),`superseded-by:${exactStage}`,'company-runtime-state:WEB_VIBE_REPAIR_REQUIRED'])]};
    });
    queue=createVibeContinuousQueue({tasks,maxConcurrentTasks:queue.maxConcurrentTasks});
  }
  const active=activeTasks(queue);
  const ownerActive=active.filter(item=>item.ownerDirective);
  const developmentPool=developmentPlanningPool(queue);
  const capacity=Math.max(0,backlogTarget-developmentPool.length);
  const planningBacklog={
    target:backlogTarget,
    minimum:backlogMinimum,
    current:developmentPool.length,
    queued:developmentPool.filter(item=>clean(item.status).toLowerCase()==='queued').length,
    running:developmentPool.filter(item=>clean(item.status).toLowerCase()==='running').length,
    releaseWaitExcluded:active.filter(item=>isDevelopmentImplementation(item)&&isReleaseWait(item)).length,
    capacity,
    executionWaveMax,
    persistentQueueMax
  };
  if(!capacity)return{planned:false,count:0,reason:'DEVELOPMENT_BACKLOG_TARGET_REACHED',queue,tasks:[],packages:[],planningBacklog,workloadTelemetry:computeWorkloadTelemetry(queue,[])};
  const policy=resolveWorkPackagePolicy(workPackagePolicy,queue);
  const allProjects=collectProjects(status,catalog,repoRoot,developmentQueue),blockedTier1=allProjects.filter(project=>project.releaseState==='release-confirmed'&&project.engine==='unity'&&project.developmentBaseline?.ready!==true),projects=allProjects.filter(isAutonomousProductionTarget).sort(projectSort);
  if(!projects.length)return{planned:false,count:0,reason:blockedTier1.length?'DEVELOPMENT_BASELINE_REQUIRED':'NO_CONFIRMED_PRODUCTION_PROJECT',queue,tasks:[],packages:[],planningBacklog,workPackagePolicy:policy,workloadTelemetry:computeWorkloadTelemetry(queue,[]),blockedTier1GameIds:blockedTier1.map(p=>p.gameId)};
  let unityReleaseFocusTaken=releaseUnityFocusBusy(queue);
  const planned=[],packages=[],deferredSmallPackages=[];
  let sequence=0;
  for(const project of projects){
    if(planned.length>=capacity||packages.length>=policy.maxPackagesPerCycle)break;
    if(project.engine==='unity'&&project.releaseState==='release-confirmed'&&unityReleaseFocusTaken)continue;
    const remaining=Math.max(1,capacity-planned.length);
    let packageTasks=selectPackageCandidates(findSafeTasks(project,repoRoot,queue),queue,remaining,policy);
    if(!packageTasks.length)continue;
    packageTasks=packageTasks.map(candidate=>applyTransformativeRecombination(candidate,recombinationMemory));
    sequence+=1;
    let pkg=buildWorkPackage({tasks:packageTasks,project,sequence,policy});
    if(!pkg.accepted){
      packageTasks=[expandTaskToMinimumWorkload(packageTasks[0],project,policy),...packageTasks.slice(1)];
      pkg=buildWorkPackage({tasks:packageTasks,project,sequence,policy});
    }
    if(!pkg.accepted){
      deferredSmallPackages.push({gameId:project.gameId,taskIds:packageTasks.map(task=>task.id),workUnits:pkg.packageWorkUnits,reason:pkg.rejectionReason});
      continue;
    }
    const acceptedTasks=pkg.tasks;
    queue=createVibeContinuousQueue({tasks:[...queue.tasks,...acceptedTasks],maxConcurrentTasks:queue.maxConcurrentTasks});
    planned.push(...acceptedTasks);
    packages.push({...pkg,tasks:acceptedTasks});
    if(project.engine==='unity'&&project.releaseState==='release-confirmed')unityReleaseFocusTaken=true;
  }
  const workloadTelemetry=computeWorkloadTelemetry(queue,packages);
  const quantityTargetMet=workloadTelemetry.plannedFeaturePackageCount>=policy.targetFeaturePackagesPerCycle||workloadTelemetry.plannedRelatedImprovementCount>=policy.minRelatedImprovementsPerPackage;
  const cycleTarget={
    targetWorkUnits:policy.targetWorkUnitsPerCycle,
    targetFeaturePackages:policy.targetFeaturePackagesPerCycle,
    minRelatedImprovements:policy.minRelatedImprovementsPerPackage,
    plannedWorkUnits:workloadTelemetry.plannedWorkUnits,
    plannedPackages:packages.length,
    plannedFeaturePackages:workloadTelemetry.plannedFeaturePackageCount,
    plannedRelatedImprovements:workloadTelemetry.plannedRelatedImprovementCount,
    workUnitsTargetMet:workloadTelemetry.plannedWorkUnits>=policy.targetWorkUnitsPerCycle,
    quantityTargetMet,
    met:quantityTargetMet
  };
  if(!planned.length)return{planned:false,count:0,reason:deferredSmallPackages.length?'MINIMUM_WORKLOAD_GATE':active.length?'NO_INDEPENDENT_SAFE_AUTONOMOUS_TASK':'NO_SAFE_AUTONOMOUS_TASK',queue,tasks:[],packages:[],planningBacklog,projectId:projects[0]?.gameId||null,blockedTier1GameIds:blockedTier1.map(p=>p.gameId),deferredSmallPackages,workPackagePolicy:policy,cycleTarget,workloadTelemetry};
  return{planned:true,count:planned.length,reason:ownerActive.length?'WORK_PACKAGES_PLANNED_AROUND_OWNER_DIRECTIVES':'WORK_PACKAGES_PLANNED',queue,tasks:planned,packages,planningBacklog:{...planningBacklog,after:developmentPlanningPool(queue).length,remainingToTarget:Math.max(0,backlogTarget-developmentPlanningPool(queue).length)},task:planned[0],projectId:planned[0].gameId,projectReleaseState:planned[0].releaseState,projectEngine:planned[0].target,blockedTier1GameIds:blockedTier1.map(p=>p.gameId),ownerDirectiveActiveCount:ownerActive.length,projectPriorityPolicy:'OWNER_DIRECTIVES_KEEP_PRIORITY_BUT_INDEPENDENT_FREE_SLOTS_REFILL;WEB_80_88_TO_89_THEN_SINGLE_BLOCKER_THEN_REWORK_THEN_REBUILD_THEN_NEW_DEVELOPMENT',deferredSmallPackages,workPackagePolicy:policy,cycleTarget,workloadTelemetry};
}

export function planVibe2AutonomousTask(args={}){return planVibe2AutonomousTasks(args);}
export function runVibe2AutoPlanner({
  statusFile='.vibe2/main-company-status.json', catalogFile='.vibe2/main-game-catalog.json', developmentQueueFile='', queueFile='', runtimeFile='vibe2-runtime.json',
  controlFile='', experienceFile='', recombinationFile='', historicalRegistryFile='', repoRoot=process.cwd(), maxConcurrentTasks=process.env.VIBE2_MAX_CONCURRENT_GAME_TASKS||DEFAULT_MAX_CONCURRENT_TASKS
}={}) {
  const runtime=readJson(runtimeFile,{});
  const resolvedQueueFile=clean(queueFile)||clean(runtime.sources?.queue)||'.vibe2/queue.json';
  const resolvedControlFile=clean(controlFile)||clean(runtime.sources?.parallelism)||clean(runtime.adaptiveBackpressure?.stateFile)||'.vibe2/parallelism-control.json';
  const resolvedExperienceFile=clean(experienceFile)||clean(runtime.sources?.experience)||'.vibe2/experience.json';
  const handoff=generateVibe2Handoff({runtimeFile,queueFile:resolvedQueueFile,controlFile:resolvedControlFile,experienceFile:resolvedExperienceFile});
  const machineHandoff={used:true,kind:handoff.kind,sourceOfTruth:handoff.sourceOfTruth,consistency:handoff.consistency,currentPersistentMax:handoff.parallelism.currentPersistentMax,lastDecision:handoff.parallelism.lastDecision};
  if(handoff.consistency?.ok!==true)return{planned:false,reason:'MACHINE_STATE_INCONSISTENT',machineHandoff,effectivePlannerMax:0};
  const configuredQueueMax=parallelLimit(runtime.continuous?.maxConcurrentGameTasks||runtime.continuous?.externalMatrixBatchMax||maxConcurrentTasks||DEFAULT_MAX_CONCURRENT_TASKS);
  const effectivePlannerMax=Math.min(parallelLimit(maxConcurrentTasks),parallelLimit(handoff.parallelism.currentPersistentMax));
  const resolvedRecombinationFile=clean(recombinationFile)||path.join(repoRoot,'company-learning','vibe3-recombination-memory.json');
  const recombinationMemory=readJson(resolvedRecombinationFile,{version:1,recipes:[]});
  const resolvedHistoricalRegistryFile=clean(historicalRegistryFile)||path.join(repoRoot,HISTORICAL_MAINTENANCE_REGISTRY_PATH);
  const historicalRegistry=readJson(resolvedHistoricalRegistryFile,{version:1,assets:[]});
  const queueBefore=readJson(resolvedQueueFile,{tasks:[]});
  const result=planVibe2AutonomousTasks({status:readJson(statusFile,{}),catalog:readJson(catalogFile,{}),developmentQueue:readJson(developmentQueueFile,{items:[]}),queue:queueBefore,repoRoot,maxConcurrentTasks:effectivePlannerMax,queueMaxConcurrentTasks:configuredQueueMax,planningBacklogTarget:Number(runtime.continuous?.planningBacklog?.target||60),planningBacklogMinimum:Number(runtime.continuous?.planningBacklog?.minimum||40),workPackagePolicy:runtime.workPackages||{},recombinationMemory,historicalRegistry});
  const normalizedBefore=createVibeContinuousQueue(queueBefore);
  const queueSynchronized=JSON.stringify(normalizedBefore.tasks)!==JSON.stringify(result.queue?.tasks||[]);
  if(result.planned||queueSynchronized)writeJson(resolvedQueueFile,result.queue);
  return{...result,queueSynchronized,machineHandoff,effectivePlannerMax,recombinationContext:{file:posix(resolvedRecombinationFile),recipes:Array.isArray(recombinationMemory?.recipes)?recombinationMemory.recipes.length:0,applied:(result.tasks||[]).filter(task=>(task.evidence||[]).some(value=>clean(value).startsWith('recombination-recipe:'))).length}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=parseArgs(),result=runVibe2AutoPlanner({statusFile:clean(args.status)||'.vibe2/main-company-status.json',catalogFile:clean(args.catalog)||'.vibe2/main-game-catalog.json',developmentQueueFile:clean(args['development-queue']),queueFile:clean(args.queue),runtimeFile:clean(args.runtime)||'vibe2-runtime.json',controlFile:clean(args.control),experienceFile:clean(args.experience),recombinationFile:clean(args.recombination),historicalRegistryFile:clean(args['historical-registry']),repoRoot:clean(args.root)||process.cwd(),maxConcurrentTasks:clean(args.max)||process.env.VIBE2_MAX_CONCURRENT_GAME_TASKS||DEFAULT_MAX_CONCURRENT_TASKS});
  console.log(`VIBE2_MACHINE_HANDOFF=${result.machineHandoff?.used?'USED':'NOT_USED'}`);
  console.log(`VIBE2_MACHINE_STATE=${result.machineHandoff?.consistency?.ok?'CONSISTENT':'INCONSISTENT'}`);
  console.log(`VIBE2_PLANNER_PERSISTENT_MAX=${result.machineHandoff?.currentPersistentMax||0}`);
  console.log(`VIBE2_PLANNER_EFFECTIVE_MAX=${result.effectivePlannerMax||0}`);
  console.log(`VIBE2_PLANNING_BACKLOG_TARGET=${result.planningBacklog?.target||0}`);
  console.log(`VIBE2_PLANNING_BACKLOG_CURRENT=${result.planningBacklog?.current||0}`);
  console.log(`VIBE2_PLANNING_BACKLOG_AFTER=${result.planningBacklog?.after??result.planningBacklog?.current??0}`);
  console.log(`VIBE2_PLANNING_BACKLOG_RELEASE_WAIT_EXCLUDED=${result.planningBacklog?.releaseWaitExcluded||0}`);
  console.log(`VIBE2_AUTO_PLAN=${result.planned?'YES':'NO'}`);
  console.log(`VIBE2_DEVELOPMENT_QUEUE_SOURCE=${clean(args['development-queue'])||'NONE'}`);
  console.log(`VIBE2_AUTO_PLAN_QUEUE_SYNC=${result.queueSynchronized?'YES':'NO'}`);
  console.log(`VIBE2_AUTO_PLAN_REASON=${result.reason}`);
  console.log(`VIBE2_AUTO_PLAN_COUNT=${result.count||0}`);
  console.log(`VIBE2_AUTO_PLAN_PROJECT=${result.projectId||'NONE'}`);
  console.log(`VIBE2_AUTO_PLAN_RELEASE_STATE=${result.projectReleaseState||'NONE'}`);
  console.log(`VIBE2_AUTO_PLAN_ENGINE=${result.projectEngine||'NONE'}`);
  console.log(`VIBE2_AUTO_PLAN_PRIORITY=${result.projectPriorityPolicy||'NONE'}`);
  console.log(`VIBE2_AUTO_PLAN_TASK=${result.task?.id||'NONE'}`);
  console.log(`VIBE2_AUTO_PLAN_TASKS=${(result.tasks||[]).map(t=>t.id).join(',')||'NONE'}`);
  console.log(`VIBE2_RECOMBINATION_APPLIED=${(result.tasks||[]).filter(t=>(t.evidence||[]).some(e=>String(e).startsWith('recombination-recipe:'))).length}`);
  console.log(`VIBE2_AUTO_PLAN_BLOCKED_TIER1=${(result.blockedTier1GameIds||[]).join(',')||'NONE'}`);
  console.log(`VIBE2_WORK_PACKAGE_COUNT=${result.packages?.length||0}`);
  console.log(`VIBE2_WORK_PACKAGE_UNITS=${result.workloadTelemetry?.plannedWorkUnits||0}`);
  console.log(`VIBE2_WORK_PACKAGE_FEATURES=${result.workloadTelemetry?.plannedFeaturePackageCount||0}`);
  console.log(`VIBE2_WORK_PACKAGE_IMPROVEMENTS=${result.workloadTelemetry?.plannedRelatedImprovementCount||0}`);
  console.log(`VIBE2_WORK_PACKAGE_CYCLE_TARGET=${result.cycleTarget?.met?'MET':'NOT_MET'}`);
  console.log(`VIBE2_WORK_PACKAGE_MICRO_RATE=${result.workloadTelemetry?.historicalMicroTaskRatePct||0}`);
  console.log(`VIBE2_WORK_PACKAGE_REWORK_RATE=${result.workloadTelemetry?.historicalReworkRatePct||0}`);
  console.log(`VIBE2_WORK_PACKAGE_QA_DUPLICATE_RATE=${result.workloadTelemetry?.historicalQaDuplicateRatePct||0}`);
  console.log(`VIBE2_WORK_PACKAGE_LOW_EFFICIENCY_STREAK=${result.workloadTelemetry?.lowEfficiencyStreak||0}`);
  console.log(`VIBE3_RECOMBINATION_RECIPES_AVAILABLE=${result.recombinationContext?.recipes||0}`);
  console.log(`VIBE3_RECOMBINATION_TASKS_APPLIED=${result.recombinationContext?.applied||0}`);
}
