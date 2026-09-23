// 파일명: tools/vibe2-auto-planner.mjs
// 역할: 최신 회사 상태·게임 카탈로그·실제 소스에서 충돌 없는 작업을 계획한다.
// DEVELOPMENT_CONFIRMED Web은 기존 소스를 먼저 평가한 뒤 보존/부분수정/대규모개편/전체재구축 전략을 선택한다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createVibeContinuousQueue, DEFAULT_MAX_CONCURRENT_TASKS } from '../assets/vibe-continuous-queue.js';
import { generateVibe2Handoff } from './vibe2-handoff.mjs';
import { diagnoseGame, microTaskFromIssue, diagnosticResponsibleSystem } from './autonomous-diagnostics.mjs';
import { buildWorkPackage, computeWorkloadTelemetry, estimateTaskWorkUnits, resolveWorkPackagePolicy } from './vibe2-work-package.mjs';
import { buildNeuralDiagnosis } from './vibe2-neural-diagnosis.mjs';
import { classifyVibePatchSaturation } from '../assets/vibe-quality-intelligence.js';
import { createRobloxVibe3LearningContext } from './vibe3-roblox-learning-context.mjs';

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
function robloxRootFromCatalog(game={}){const explicit=posix(game.robloxProjectPath||game.robloxPath||game?.canonical?.sources?.roblox?.projectPath||'');if(/^roblox-games\/[a-zA-Z0-9._-]+$/.test(explicit))return explicit;const id=clean(game.id);return id?`roblox-games/${id}`:null;}
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
function verifiedFocusedReleaseTask(item={}){
  const evidence=new Set((Array.isArray(item.evidence)?item.evidence:[]).map(clean));
  const releaseKind=[...evidence].find(value=>value.startsWith('focus-release-kind:'))?.slice('focus-release-kind:'.length)||'';
  return item.postReleaseFocused===true
    &&clean(item.target).toLowerCase()==='roblox'
    &&clean(item.releaseState).toLowerCase()==='release-confirmed'
    &&evidence.has('post-release-focused:yes')
    &&['INTERNAL_PLATFORM_RELEASE','PUBLIC_RELEASE','LEGACY_PUBLIC_RELEASE'].includes(releaseKind);
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
    const catalogReleaseState=stateFromCatalog(game);
    const focusedReleaseAuthority=verifiedFocusedReleaseTask(item);
    const currentReleaseState=focusedReleaseAuthority?'release-confirmed':catalogReleaseState;
    const currentAuthority=focusedReleaseAuthority
      ?'VERIFIED_INTERNAL_OR_PUBLIC_RELEASE'
      :(clean(game.productionClass).toUpperCase()||currentReleaseState.toUpperCase()||'OTHER');
    const currentStatus=clean(item.status).toLowerCase();
    const currentBlocker=clean(item.blocker);
    const itemEvidence=(item.evidence||[]).map(clean);
    const centralAuthorityCancellation=currentStatus==='cancelled'
      &&/^production-authority-inactive:/.test(currentBlocker)
      &&(clean(item.lastOutcome)==='CANCELLED_BY_CENTRAL_PRODUCTION_AUTHORITY'||itemEvidence.some(value=>value.startsWith('production-authority-sync:')));
    if(['release-confirmed','development-confirmed'].includes(currentReleaseState)&&centralAuthorityCancellation){
      return{
        ...item,
        releaseState:currentReleaseState,
        status:'queued',
        blocker:null,
        reservationId:null,
        reservationRunId:null,
        reservationRunAttempt:0,
        reservedAt:null,
        lastOutcome:'RESTORED_BY_CENTRAL_PRODUCTION_AUTHORITY',
        evidence:[...new Set([
          ...(item.evidence||[]),
          `production-authority-restored:${currentAuthority}`,
          `release-state:${currentReleaseState}`,
          `restored-from:${currentBlocker}`,
          'event-driven-resume:central-production-authority-restored'
        ])]
      };
    }
    if(!['release-confirmed','development-confirmed'].includes(currentReleaseState)&&['queued','running','blocked'].includes(currentStatus)){
      return{
        ...item,
        status:'cancelled',
        blocker:`production-authority-inactive:${currentAuthority}`,
        reservationId:null,
        reservationRunId:null,
        reservationRunAttempt:0,
        reservedAt:null,
        lastOutcome:'CANCELLED_BY_CENTRAL_PRODUCTION_AUTHORITY',
        evidence:[...new Set([...(item.evidence||[]),`production-authority-sync:${currentAuthority}`])]
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
  const firstStagePolicy=centralPresentationPolicy(repoRoot)?.unityWebFirstStage||{};
  const unityWebFirstStage=clean(firstStagePolicy?.status).toUpperCase()==='OWNER_DIRECT_LOCKED'&&clean(firstStagePolicy?.scope)==='FIRST_WEB_GAME_STAGE_ONLY'&&firstStagePolicy?.appliesToAllGames===true;
  if(unityWebFirstStage){
    const root=`unity-games/${id}`;
    const existingUnity=rows.find(r=>r.gameId===id&&r.engine==='unity');
    const queuePatch={
      queueCurrentStep:clean(item?.currentStep),
      queueCanonicalState:clean(item?.canonicalState),
      queueRoutingBlockers:(Array.isArray(item?.routingBlockers)?item.routingBlockers:[]).map(clean).filter(Boolean).slice(0,4),
      queueVibeWebRequestedStage:clean(item?.vibeWebRequestedStage),
      queueVibeWebImplementationReason:clean(item?.vibeWebImplementationReason),
      queueStrictImplementationHardFailures:(Array.isArray(item?.strictImplementationHardFailures)?item.strictImplementationHardFailures:[]).map(clean).filter(Boolean).slice(0,6),
      queueWebValidationLastAttemptAt:clean(item?.webValidationLastAttemptAt),
      queueWebFinalContentDepthLastAttemptAt:clean(item?.webFinalContentDepthLastAttemptAt),
      firstStageUnityWeb:true,
      firstStageEngine:'UNITY_WEB',
      postWebSelectedPlatform:clean(item?.selectedPlatform||item?.targetPlatform),
      companyDevelopmentQueueSource:true
    };
    if(existingUnity){
      Object.assign(existingUnity,queuePatch,{projectPath:root,releaseState:'development-confirmed'});
      continue;
    }
    rows.push({
      gameId:id,
      name:clean(item?.gameName||game?.name||id),
      engine:'unity',
      target:'unity',
      projectPath:root,
      lifecycleState:gameLifecycleState(game),
      existing:fs.existsSync(path.join(repoRoot,root,'ProjectSettings','ProjectVersion.txt')),
      releaseState:'development-confirmed',
      progress:Number(item?.progress||0),
      source:'company-development-queue-unity-web-first-stage',
      developmentBaseline:null,
      developmentValidation:latestDevelopmentValidationStatus(id,repoRoot),
      ...queuePatch
    });
    continue;
  }

  const queueTarget=clean(item?.selectedPlatform||item?.targetPlatform).toUpperCase();
  const queueRobloxRoot=posix(item?.robloxProjectPath||item?.targetSourcePaths?.ROBLOX||(queueTarget==='ROBLOX'?item?.targetSourcePath:''));
  if(queueTarget==='ROBLOX'||/^roblox-games\//.test(queueRobloxRoot)){
    const root=/^roblox-games\/[a-zA-Z0-9._-]+$/.test(queueRobloxRoot)?queueRobloxRoot:'roblox-games/'+id;
    const existingRoblox=rows.find(r=>r.gameId===id&&r.engine==='roblox');
    const queuePatch={
      queueCurrentStep:clean(item?.currentStep),
      queueCanonicalState:clean(item?.canonicalState),
      queueRoutingBlockers:(Array.isArray(item?.routingBlockers)?item.routingBlockers:[]).map(clean).filter(Boolean).slice(0,8),
      queueRobloxFailureStage:clean(item?.robloxFailureStage),
      queueRobloxFailureSignature:clean(item?.robloxFailureSignature),
      queueRobloxSourceCommit:clean(item?.robloxSourceCommit),
      queueRobloxArtifactIdentity:clean(item?.robloxBuildArtifactIdentity),
      queueRobloxInternalReleaseReady:item?.robloxInternalReleaseReady===true,
      queueRobloxInternalReleaseVersion:Number(item?.robloxInternalReleaseEvidence?.versionNumber||0)||null,
      queueRobloxInternalReleaseSource:clean(item?.robloxInternalReleaseEvidence?.sourceRevision),
      queueRobloxInternalReleaseArtifact:clean(item?.robloxInternalReleaseEvidence?.artifactIdentity),
      companyDevelopmentQueueSource:true
    };
    if(existingRoblox)Object.assign(existingRoblox,queuePatch,{projectPath:root,releaseState:'development-confirmed'});
    else rows.push({gameId:id,name:clean(item?.gameName||game?.name||id),engine:'roblox',target:'roblox',projectPath:root,lifecycleState:gameLifecycleState(game),existing:fs.existsSync(path.join(repoRoot,root)),releaseState:'development-confirmed',progress:Number(item?.progress||0),source:'company-development-queue-roblox',developmentBaseline:null,...queuePatch});
    continue;
  }
  const existingWeb=rows.find(r=>r.gameId===id&&r.engine==='web');
  if(existingWeb){
    existingWeb.queueCurrentStep=clean(item?.currentStep);
    existingWeb.queueCanonicalState=clean(item?.canonicalState);
    existingWeb.queueRoutingBlockers=(Array.isArray(item?.routingBlockers)?item.routingBlockers:[]).map(clean).filter(Boolean).slice(0,4);
    existingWeb.queueVibeWebRequestedStage=clean(item?.vibeWebRequestedStage);
    existingWeb.queueVibeWebImplementationReason=clean(item?.vibeWebImplementationReason);
    existingWeb.queueStrictImplementationHardFailures=(Array.isArray(item?.strictImplementationHardFailures)?item.strictImplementationHardFailures:[]).map(clean).filter(Boolean).slice(0,6);
    existingWeb.queueWebValidationLastAttemptAt=clean(item?.webValidationLastAttemptAt);
    existingWeb.queueWebFinalContentDepthLastAttemptAt=clean(item?.webFinalContentDepthLastAttemptAt);
    existingWeb.ownerPreservationPresentationUpgrade=item?.ownerPreservationPresentationUpgrade===true;
    existingWeb.presentationFirstPass=clean(item?.presentationFirstPass);
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
    queueStrictImplementationHardFailures:(Array.isArray(item?.strictImplementationHardFailures)?item.strictImplementationHardFailures:[]).map(clean).filter(Boolean).slice(0,6),
    queueWebValidationLastAttemptAt:clean(item?.webValidationLastAttemptAt),
    queueWebFinalContentDepthLastAttemptAt:clean(item?.webFinalContentDepthLastAttemptAt),
    ownerPreservationPresentationUpgrade:item?.ownerPreservationPresentationUpgrade===true,
    presentationFirstPass:clean(item?.presentationFirstPass)
  });
}
for(const game of Array.isArray(catalog.games)?catalog.games:[]){const id=clean(game.id);if(removed.has(id)||!lifecycleAllowsDevelopment(game))continue;const state=stateFromCatalog(game),robloxRoot=robloxRootFromCatalog(game);if(id&&robloxRoot&&['release-confirmed','development-confirmed'].includes(state)&&fs.existsSync(path.join(repoRoot,robloxRoot))&&!rows.some(r=>r.gameId===id&&r.engine==='roblox'))rows.push({gameId:id,name:clean(game.name),engine:'roblox',target:'roblox',projectPath:robloxRoot,existing:true,releaseState:state,progress:0,source:'game-catalog',developmentBaseline:null});const root=webRootFromCatalog(game),developmentWebEligible=state==='development-confirmed',publishedWebEligible=game.homepageWebPlayable===true;if(!id||!root||game.hasWebArchive!==true||(!developmentWebEligible&&!publishedWebEligible))continue;if(rows.some(r=>r.gameId===id&&r.engine==='web'))continue;const exists=fs.existsSync(path.join(repoRoot,root));rows.push({gameId:id,name:clean(game.name),engine:'web',target:'web',projectPath:root,lifecycleState:gameLifecycleState(game),existing:exists,releaseState:state,progress:0,source:'game-catalog',developmentBaseline:null,developmentValidation:latestDevelopmentValidationStatus(id,repoRoot)});}return rows;}
function focusedCaretakerPolicy(repoRoot=process.cwd()){
  const policy=centralPresentationPolicy(repoRoot)?.developmentLifecycleMachine?.focusedDevelopmentCaretakers||{};
  return{
    enabled:policy.enabled===true,
    ownerIds:new Set((Array.isArray(policy.ownerFocusedGameIds)?policy.ownerFocusedGameIds:[]).map(clean).filter(Boolean)),
    includeAllReleaseConfirmed:policy.includeAllReleaseConfirmed===true
  };
}
function focusedCaretakerProject(project={},repoRoot=process.cwd()){
  const policy=focusedCaretakerPolicy(repoRoot);
  if(!policy.enabled)return false;
  return policy.ownerIds.has(clean(project.gameId))||(policy.includeAllReleaseConfirmed&&clean(project.releaseState).toLowerCase()==='release-confirmed');
}
function projectSort(a,b){
  const focus=(b.ownerFocusedCaretaker===true?1:0)-(a.ownerFocusedCaretaker===true?1:0);if(focus)return focus;
  const bottleneck=bottleneckRank(a)-bottleneckRank(b);if(bottleneck)return bottleneck;
  const engine=(ENGINE_RANK[a.engine]??9)-(ENGINE_RANK[b.engine]??9);if(engine)return engine;
  const release=(RELEASE_RANK[a.releaseState]??9)-(RELEASE_RANK[b.releaseState]??9);if(release)return release;
  return Number(b.progress||0)-Number(a.progress||0)||a.gameId.localeCompare(b.gameId);
}
function centralPresentationPolicy(repoRoot=process.cwd()){
  return readJson(path.join(repoRoot,CANONICAL_POLICY_PATH),{});
}
function assetProductionEnabled(repoRoot=process.cwd()){
  const policy=centralPresentationPolicy(repoRoot),contract=policy?.assetProductionParallelContract||{};
  return contract?.enabled===true;
}
function isAssetProductionPilot(project={},repoRoot=process.cwd()){
  const policy=centralPresentationPolicy(repoRoot),contract=policy?.assetProductionParallelContract||{},first=contract?.firstAdoption||{};
  return contract?.enabled===true&&clean(first.gameId)===clean(project.gameId)&&['unity','roblox','web'].includes(clean(project.engine).toLowerCase());
}
function isWeatherPresentationPilot(project={},repoRoot=process.cwd()){
  const policy=centralPresentationPolicy(repoRoot),contract=policy?.weatherPresentationContract||{},first=contract?.firstAdoption||{};
  return contract?.enabled===true&&clean(first.gameId)===clean(project.gameId)&&['unity','roblox','web'].includes(clean(project.engine).toLowerCase());
}
function isAutonomousProductionTarget(project={},repoRoot=process.cwd()){
  if(project.engine==='roblox')return['release-confirmed','development-confirmed'].includes(project.releaseState);
  if(project.engine==='unity'){
    if(project.releaseState==='development-confirmed'&&project.firstStageUnityWeb===true)return true;
    if(project.releaseState==='development-confirmed')return project.source==='company-status'&&assetProductionEnabled(repoRoot);
    return project.releaseState==='release-confirmed'&&project.developmentBaseline?.ready===true;
  }
  if(project.releaseState==='development-confirmed')return project.engine==='web';
  return false;
}
function sourceFile(root,relative){return path.join(root,...posix(relative).split('/'));}
function readText(file){try{return fs.readFileSync(file,'utf8');}catch{return'';}}
function hasTask(queue,id){return queue.tasks.some(item=>item.id===id);}
function taskVerified(queue,id){return queue.tasks.some(item=>item.id===id&&clean(item.status).toLowerCase()==='verified');}
function nextCausalGenerationId(queue,basePrefix){
  const prefix=`${basePrefix}-v`;
  const rows=(queue.tasks||[]).map(item=>{
    const id=clean(item.id);
    if(!id.startsWith(prefix))return null;
    const versionText=id.slice(prefix.length);
    if(!/^\d+$/.test(versionText))return null;
    return{item,version:Number(versionText)};
  }).filter(Boolean).sort((a,b)=>a.version-b.version);
  if(!rows.length)return `${basePrefix}-v1`;
  const latest=rows[rows.length-1];
  const status=clean(latest.item.status).toLowerCase();
  if(['queued','running','blocked','failed'].includes(status))return null;
  if(status==='verified')return `${basePrefix}-v${latest.version+1}`;
  return null;
}
function activeTasks(queue){return queue.tasks.filter(item=>['queued','running'].includes(clean(item.status).toLowerCase()));}
function isDevelopmentImplementation(item={}){return clean(item.department).toLowerCase()==='development'&&clean(item.type).toLowerCase()==='implementation';}
function isReleaseWait(item={}){return clean(item.status).toLowerCase()==='running'&&/candidate-awaiting-qa-and-deployment|candidate-awaiting-supervised-review|awaiting.*qa|qa.*awaiting|awaiting.*supervised-review|slot-released.*fan-in/i.test(clean(item.blocker));}
function developmentPlanningPool(queue){return activeTasks(queue).filter(item=>isDevelopmentImplementation(item)&&!isReleaseWait(item));}
function sameRootResponsibilityConflict(a={},b={}){const aRoot=posix(a.sourceRoot),bRoot=posix(b.sourceRoot);if(!aRoot||!bRoot||aRoot!==bRoot)return false;const aFiles=new Set((a.responsibleFiles||[]).map(posix).filter(Boolean)),bFiles=new Set((b.responsibleFiles||[]).map(posix).filter(Boolean));if(!aFiles.size||!bFiles.size)return true;for(const file of aFiles)if(bFiles.has(file))return true;return false;}
function plannerConflict(queue,task){return activeTasks(queue).some(item=>sameRootResponsibilityConflict(item,task));}
function supervisedWebBuildRequired(project={},goal=''){
  if(clean(project.engine).toLowerCase()!=='web')return false;
  const text=clean(goal);
  if(/\[(?:WEB_BASE_IMPLEMENTATION|EXISTING_WEB_ASSESS_AND_IMPLEMENT|EXISTING_WEB_DEVELOPMENT_CONTINUATION|WEB_STRICT_80_88_TO_89|PRESENTATION_PASS:[A-Z_]+)\]/.test(text))return true;
  return /\[WEB_REPAIR\]/.test(text)
    &&/REAL_PLAYABLE_WEB_GAME_REQUIRED|REAL_GAME_MECHANIC_COUNT_TOO_LOW|REAL_GAME_SYSTEM_COUNT_REQUIRED|WEB_TEST_HARNESS_FORBIDDEN|COMPLETE_PLAYABLE_GAMEPLAY_CYCLE_REQUIRED/.test(text);
}
function supervisedWebBuildContract(){
  return{
    version:3,
    mode:'ASSISTANT_SUPERVISED_VIBE_COAUTHORING',
    required:true,
    status:'REVIEW_REQUIRED',
    candidateGenerationAllowed:true,
    automaticPromotionAllowed:false,
    approvalField:'supervisionApproved',
    stages:[
      'SOURCE_AND_DESIGN_READ',
      'GAME_ART_DIRECTION_STYLE_LOCK',
      'GAMEPLAY_LOOP_DECOMPOSITION',
      'SAVE_INPUT_CORE_LOOP_INVARIANT_LOCK',
      'VIBE_IMPLEMENTATION_CANDIDATE',
      'PRESENTATION_IMPLEMENTATION',
      'SUPERVISOR_DIFF_AND_PLAYABILITY_REVIEW',
      'REAL_RUNTIME_VISUAL_EVIDENCE_REVIEW',
      'MOBILE_AND_RUNTIME_QA',
      'SUPERVISED_PROMOTION'
    ],
    protectedSemantics:['GAME_IDENTITY','SAVE_KEY_AND_SAVE_MEANING','CORE_LOOP','PROGRESSION','MOBILE_INPUT','EXISTING_VALID_FEATURES'],
    hardReject:['PLACEHOLDER_SOURCE','PLACEHOLDER_MONSTER_OR_CHARACTER','PRIMITIVE_ONLY_CHARACTER_OR_MONSTER','CONTEXT_MISMATCH_BACKGROUND','BACKGROUND_NOT_BOUND_TO_GAME_CONTEXT','INCOMPLETE_ACTION_MOTION_SET','MISSING_COMBAT_DEATH_MOTION','STATIC_PRESENTATION_EVIDENCE','MARKER_ONLY_PRESENTATION_PASS','COLOR_ONLY_ENEMY_VARIANT','GENERIC_CROSS_GENRE_HUD','COMMERCIAL_READINESS_INCOMPLETE','FAKE_GAMEPLAY','VALIDATION_ONLY_PATCH','UNRELATED_FULL_REWRITE','SAVE_RESET_WITHOUT_MIGRATION','BROKEN_MOBILE_INPUT'],
    completionRequirements:['GENRE_SPECIFIC_UI','GENRE_SPECIFIC_ANIMATION','STYLE_LOCK_CONSISTENCY','MOBILE_ACCESSIBILITY','AUDIO_CONTROLS','SAVE_STABILITY_WHEN_APPLICABLE','COMMERCIAL_READINESS_BEFORE_NATIVE_HANDOFF']
  };
}
function platformAdaptationInstruction(engine=''){
  if(engine==='roblox')return [
    '',
    '[PLATFORM_ADAPTATION:ROBLOX:SOCIAL_FAST_SESSION]',
    '핵심 게임 정체성·밸런스 의미·세이브 의미는 유지한다.',
    'Roblox 환경에 맞춰 빠른 진입, 모바일 우선 입력/UI, 친구 합류와 소셜/멀티 흐름, 짧고 반복 가능한 목표, 서버 권위 동기화, 저사양 기기 표현 밀도를 우선 최적화한다.',
    'Unity UI/카메라/렌더 구조를 문자 그대로 복사하지 않고 Roblox 네이티브 서비스와 표현으로 재구성한다.'
  ].join('\n');
  if(engine==='unity')return [
    '',
    '[PLATFORM_ADAPTATION:UNITY:DEEP_IMMERSIVE_SESSION]',
    '핵심 게임 정체성·밸런스 의미·세이브 의미는 유지한다.',
    'Unity 환경에 맞춰 깊은 시스템 표현, 긴 세션 지원, 세밀한 조작, 카메라/연출, 풍부한 그래픽·VFX·공간음향, 기기별 성능 스케일링을 우선 최적화한다.',
    'Roblox UI/소셜 가정을 문자 그대로 복사하지 않고 Unity 네이티브 입력·렌더·오디오 구조로 재구성한다.'
  ].join('\n');
  return'';
}
function task(id,project,goal,responsibleFiles,priority='normal',estimatedRisk='low',extraEvidence=[]){
  const baselineEvidence=project.releaseState==='release-confirmed'&&project.engine==='unity'&&project.developmentBaseline?.ready===true?[`development-baseline:${project.developmentBaseline.source}`]:[];
  const supervised=supervisedWebBuildRequired(project,goal);
  const adaptation=project.firstStageUnityWeb===true?'':platformAdaptationInstruction(project.engine);
  const adaptedGoal=adaptation?goal+adaptation:goal;
  const focused=project.ownerFocusedCaretaker===true,unlimitedRepair=focused||project.engine==='roblox';
  const plannedTask={
    id,gameId:project.gameId,target:project.engine,department:'development',type:'implementation',goal:adaptedGoal,responsibleFiles,dependencies:[],priority:focused?'critical':priority,
    releaseState:project.releaseState,status:'queued',retries:0,maxRetries:unlimitedRepair?null:2,retryPolicy:unlimitedRepair?'UNLIMITED_CAUSAL_REPAIR':undefined,ownerDirective:focused,requiresOwnerDecision:false,protectedChange:false,
    paidResourceRequired:false,sourceRoot:posix(project.projectPath),estimatedRisk,speculativeEligible:estimatedRisk==='high',
    productionMode:supervised?'SUPERVISED_VIBE_COAUTHORING':'AUTONOMOUS_VIBE',
    supervisionApproved:false,
    supervisionContract:supervised?supervisedWebBuildContract():null,
    packageLongWorkProtected:focused||undefined,packageRole:focused?'implementation-owner':undefined,
    focusedCaretaker:focused||undefined,caretakerStickyOwnership:focused||undefined,
    evidence:[`central-policy:${CANONICAL_POLICY_PATH}`,`vibe2-auto-planner:${project.source}`,`release-state:${project.releaseState}`,`source-root:${posix(project.projectPath)}`,...(focused?['focused-caretaker:yes','focused-caretaker-role:implementation-owner']:[]),...baselineEvidence,...extraEvidence,...(adaptation?[`platform-adaptation:${project.engine==='roblox'?'SOCIAL_FAST_SESSION':'DEEP_IMMERSIVE_SESSION'}`]:[]),...(supervised?['supervised-web-build:required','automatic-promotion:blocked-until-supervised-approval']:[])]
  };
  plannedTask.neuralDiagnosis=buildNeuralDiagnosis({task:plannedTask,project});
  return plannedTask;
}

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
  add(/PRESENTATION_RUNTIME_QUALITY_REQUIRED/,'승인 설계와 최신 아트북에서 게임별 아트 방향과 Style Lock을 먼저 확정한 뒤 플레이어·몬스터·배경을 컨셉과 지역 맥락에 맞게 실제 렌더링하고 idle/move/death를 포함한 연속 모션을 구현한다. 이모지·단순 도형·임시 모형 몹·무맥락 배경은 사용하지 않는다.');
  add(/ACTION_PRESENTATION_QUALITY_REQUIRED/,'액션·전투 게임은 idle/move/attack/hit/death를 실제 상태에 연결하고 공격을 anticipation/windup → active/contact → recovery/follow-through로 이어지게 하며 피격 VFX·SFX·화면/카메라 반응을 동일 impact 이벤트에 동기화한다.');
  add(/GENRE_PRESENTATION_IDENTITY_REQUIRED/,'현재 장르와 실제 규칙에서 HUD·아이콘·정보 우선순위·UI Motion Language를 다시 만들고 unrelated 장르의 공용 HUD 복사나 색만 다른 적을 제거한다.');
  add(/ENEMY_PRESENTATION_DISTINCTIVENESS_REQUIRED/,'적 종류별 실루엣·이동·공격·피격·사망·전투 역할 중 최소 하나 이상의 실제 차이를 만들고 색상만 다른 동일 모델을 별도 타입으로 인정하지 않는다.');
  add(/ACCESSIBILITY_RUNTIME_REQUIRED/,'핵심 텍스트 크기/대비/44px 터치 영역을 보장하고 색 하나만으로 상태를 구분하지 않으며 화면 흔들림·번쩍임·진동을 줄이는 접근성 제어를 실제 UI에 연결한다.');
  add(/COMMERCIAL_READINESS_REQUIRED/,'기존 POLISH_MOBILE과 runtime validation 안에서 첫 10분/장르 UI/아트/애니/피드백/오디오/성능/접근성/저장/콘텐츠 구조/수익화 UI 분리를 수리하고 별도 우회 파이프를 만들지 않는다.');
  add(/SCRIPT_SRC_FORBIDDEN/,'외부 script src 의존을 제거하고 허용된 기존 index.html 내부 런타임 코드로 유지한다.');
  add(/REAL_GAME_FOOTPRINT_TOO_SMALL|REAL_GAME_LOGIC_TOO_SMALL/,'문자 수를 채우지 말고 위 검증 실패를 해결하는 실제 gameplay 로직·상태·입력 연결을 추가한다.');
  return [...new Set(hints)].slice(0,12);
}
function inheritedDiagnosticEvidence(gameId='',relative='',queue={tasks:[]}){
  const prefix=`web-games/${clean(gameId)}/`,localFile=posix(relative).startsWith(prefix)?posix(relative).slice(prefix.length):posix(relative);
  for(const item of Array.isArray(queue?.tasks)?queue.tasks:[]){
    if(clean(item?.gameId)!==clean(gameId))continue;
    const evidence=(item?.evidence||[]).map(clean).filter(Boolean);
    const key=evidence.find(value=>value.startsWith('diagnostic-key:')&&value.endsWith(`:${localFile}`));
    if(!key)continue;
    const type=clean(key.slice('diagnostic-key:'.length,-(`:${localFile}`.length))).toUpperCase();
    const system=diagnosticResponsibleSystem(type);
    if(!system||!evidence.includes(`diagnostic:${type}`))continue;
    return[`diagnostic:${type}`,`diagnostic-key:${type}:${localFile}`,`diagnostic-responsibility-shadow:${system}`,'diagnostic-carryover:EXACT_WEB_REPAIR'];
  }
  return[];
}

function findWebAssessmentTask(project,repoRoot,queue){
  if(project.engine!=='web'||project.releaseState!=='development-confirmed')return null;
  const relative=`${posix(project.projectPath)}/index.html`,file=sourceFile(repoRoot,relative),missing=!fs.existsSync(file);
  if(missing){
    const id=nextCausalGenerationId(queue,`${project.gameId}-web-base-implementation`);if(!id)return null;
    const goal=`[WEB_BASE_IMPLEMENTATION] FULL_WEB_GAME_REBUILD SOURCE_ROOT_BOOTSTRAP_ALLOWED\n게임: ${project.name||project.gameId}\n승인 설계와 scope를 읽고 게임별 아트 방향과 Style Lock을 먼저 확정한 뒤 Vibe가 실제 플레이 가능한 모바일 Web 1차 baseline을 새로 구현한다. Web 단계에서 플레이어·몬스터·배경을 컨셉과 지역 맥락에 맞는 실제 표현으로 만들고 그래픽을 후순위로 미루지 않는다. 액션·전투가 있는 게임은 idle/move/attack/hit/death를 실제 상태에 연결하고 공격·피격·사망 모션과 VFX/SFX를 실제 판정 시점에 동기화한다. 이모지·단순 도형·임시 모형 몹·무맥락 배경은 PASS 근거로 인정하지 않으며, 장르와 실제 규칙에서 UI/애니메이션을 별도로 만들고 첫 10분·오디오·모바일 성능·접근성·저장 안정성·콘텐츠 구조까지 Commercial Readiness를 기존 검증 파이프 안에서 만족해야 한다. 이 Web 표현 기준이 런타임에서 성립한 뒤에만 Roblox/Unity/UEFN 이관 대상으로 본다. 검증된 경험과 transformative recombination context는 참고하되 원본 코드·원본 에셋·식별자를 복사하지 않는다. 회사/홈페이지 정책 파일은 수정하지 않는다.`;
    const out=task(id,project,goal,[relative],'owner-immediate','medium',['owner-directive:webgame-first','web-stage:WEB_BASE_IMPLEMENTATION','source-root-bootstrap-required','full-web-game-rebuild','existing-web-source:MISSING']);out.ownerDirective=true;out.speculativeEligible=false;return out;
  }
  const queueState=clean(project.queueCanonicalState).toUpperCase(),queueStep=clean(project.queueCurrentStep).toUpperCase();
  if(queueState==='WEB_VIBE_REPAIR_REQUIRED'||queueStep==='VIBE_WEB_REPAIR'){
    const id=nextCausalGenerationId(queue,`${project.gameId}-web-runtime-repair`);if(!id)return null;
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
    const goal=`[WEB_REPAIR] 게임: ${project.name||project.gameId}\ncompany-runtime이 WEB_VIBE_REPAIR_REQUIRED로 반환한 기존 Web 소스를 현재 승인 설계와 검증 근거에 맞춰 직접 수리한다. 기존 게임 정체성·세이브·핵심 루프를 보존하고 실패 원인 책임 영역만 수정한다. 그래픽 결함이 원인이면 승인 설계/아트북의 게임별 아트 방향과 Style Lock을 기준으로 플레이어·몬스터·배경·모션을 실제 화면에서 직접 고치며 임시 모형 몹이나 컨셉과 맞지 않는 배경을 남긴 채 PASS 처리하지 않는다. 액션·전투 게임은 idle/move/attack/hit/death와 공격·피격·사망 전환을 실제 상태에 연결한다. Web gameplay/runtime/strict/promotion 게이트는 약화하지 않으며 회사/홈페이지 정책 파일은 수정하지 않는다.${runtimeFailureContext}`;
    const diagnosticEvidence=inheritedDiagnosticEvidence(project.gameId,relative,queue);
    const out=task(id,project,goal,[relative],'owner-immediate','medium',['owner-directive:webgame-first','web-stage:WEB_REPAIR','company-runtime-state:WEB_VIBE_REPAIR_REQUIRED','recovery-exact-stage:WEB_REPAIR','preserve-existing-game',...diagnosticEvidence]);out.ownerDirective=true;out.speculativeEligible=false;return out;
  }
  const id=`${project.gameId}-existing-web-assessment-v1`;if(hasTask(queue,id))return null;
  const goal=`[EXISTING_WEB_ASSESS_AND_IMPLEMENT]\n게임: ${project.name||project.gameId}\n기존 Web 소스를 먼저 읽고 승인 설계와 비교하며 게임별 아트 방향과 Style Lock도 함께 확정한다. exploration의 EXISTING_WEB_STRATEGY가 KEEP_AND_CONTINUE면 현재 구조를 보존하며 필요한 개발만 이어가고, PARTIAL_REPAIR면 문제 책임 영역만 수정하고, MAJOR_REWORK면 쓸 수 있는 시스템·세이브·핵심 루프를 보존한 채 큰 결함을 재구성한다. FULL_REBUILD는 exploration이 실제 게임성 신호와 승인 scope 근거가 부족하다고 판정한 경우에만 허용한다. 파일 존재 여부나 프로토타입 문구 하나만으로 전체 재구축을 결정하지 않는다. KEEP 여부와 무관하게 Web에서 플레이어·몬스터·배경·모션 표현을 실제 컨셉과 대조하고, 임시 도형/모형 몹/무맥락 배경을 완성 상태로 인정하지 않는다. 액션·전투 게임은 idle/move/attack/hit/death와 공격·피격·사망 애니메이션이 실제 상태에 연결돼야 하며 이 Web 표현 기준이 런타임에서 성립한 뒤에만 Roblox/Unity/UEFN 이관 대상으로 본다. 검증된 학습은 새 코드·새 에셋 표현으로 재조합하고 기존 게임 정체성과 승인 설계를 유지한다.`;
  const out=task(id,project,goal,[relative],'owner-immediate','medium',['owner-directive:webgame-first','web-stage:WEB_BASE_IMPLEMENTATION','existing-web-assessment-required','strategy-decision:EXPLORATION','prototype-marker-alone-cannot-force-rebuild']);out.ownerDirective=true;out.speculativeEligible=false;return out;
}
function findUnityWebFirstStageTask(project,repoRoot,queue){
  if(project.firstStageUnityWeb!==true||project.releaseState!=='development-confirmed')return null;
  const root=posix(project.projectPath);
  if(root!==`unity-games/${project.gameId}`)return null;
  const coreRel=`${root}/Assets/Scripts/GameCore.cs`;
  const runtimeRel=`${root}/Assets/Scripts/RuntimeBootstrap.cs`;
  const projectVersionRel=`${root}/ProjectSettings/ProjectVersion.txt`;
  const manifestRel=`${root}/Packages/manifest.json`;
  const projectReady=fs.existsSync(sourceFile(repoRoot,projectVersionRel))
    &&fs.existsSync(sourceFile(repoRoot,manifestRel))
    &&fs.existsSync(sourceFile(repoRoot,coreRel))
    &&fs.existsSync(sourceFile(repoRoot,runtimeRel));
  const runtime=readText(sourceFile(repoRoot,runtimeRel));
  let buildWebReady=false;
  const editorRoot=sourceFile(repoRoot,`${root}/Assets/Editor`);
  if(fs.existsSync(editorRoot)){
    const stack=[editorRoot];
    while(stack.length&&!buildWebReady){
      const current=stack.pop();
      for(const entry of fs.readdirSync(current,{withFileTypes:true})){
        const full=path.join(current,entry.name);
        if(entry.isDirectory()){stack.push(full);continue;}
        if(entry.isFile()&&entry.name.endsWith('.cs')&&/\bBuildWeb\s*\(/.test(readText(full))){buildWebReady=true;break;}
      }
    }
  }
  const qaReady=/JAEWOON_UNITY_WEB_QA\s+BOOT/.test(runtime)
    &&/JAEWOON_UNITY_WEB_QA\s+STATE/.test(runtime)
    &&/JAEWOON_UNITY_WEB_QA\s+MOBILE_TARGET/.test(runtime)
    &&/JAEWOON_UNITY_WEB_QA\s+MOBILE_INPUT/.test(runtime)
    &&/JAEWOON_UNITY_WEB_QA\s+CORE_FUN/.test(runtime)
    &&/Application\.absoluteURL\.Contains\("qa=1"\)/.test(runtime);
  const repairState=clean(project.queueCanonicalState).toUpperCase()==='WEB_VIBE_REPAIR_REQUIRED'
    ||clean(project.queueCurrentStep).toUpperCase()==='VIBE_WEB_REPAIR';

  if(!projectReady){
    const id=nextCausalGenerationId(queue,`${project.gameId}-unity-web-base-implementation`);if(!id)return null;
    const goal=`[UNITY_WEB_BASE_IMPLEMENTATION] UNITY_PROJECT_SOURCE_ROOT_BOOTSTRAP_ALLOWED
게임: ${project.name||project.gameId}
1차 Web 게임 원본을 unity-games/${project.gameId}/ Unity 프로젝트로 제작한다. HTML/Canvas/PlayCanvas 신규 게임을 만들지 않는다.
승인 설계의 핵심 게임 규칙·수치·맵·전투·퀘스트·아이템·멀티 규칙·저장 의미를 보존하고 실제 Unity C# 게임으로 구현한다.
GameCore.cs에는 게임 상태/데이터/규칙 책임을 두고 RuntimeBootstrap.cs에는 실제 실행/입력/UI/씬 연결 책임을 둔다. 한 파일에 모든 책임을 몰아넣지 않는다.
Unity Input System 기반 모바일 입력을 사용하고, ?qa=1에서는 Digit1=실제 첫 플레이 진입, Space=실제 핵심 행동, KeyR=실제 안전 복귀/리셋을 기존 게임 함수에 연결한다. QA 전용 가짜 보상/승리/상태 덮어쓰기는 금지한다.
실제 화면의 모바일 핵심 액션 컨트롤 위치를 JAEWOON_UNITY_WEB_QA MOBILE_TARGET role=action x=<0..1> y=<0..1>로 내보내고, 그 실제 컨트롤이 Pointer/Touch 입력으로 작동했을 때만 MOBILE_INPUT role=action status=PASS를 남긴다. 키보드 QA 입력으로 MOBILE_INPUT을 찍으면 안 된다.
JAEWOON_UNITY_WEB_QA BOOT/STATE와 장르에 맞는 START 또는 REGION, ACTION 또는 ATTACK, PROGRESS 또는 REWARD 실제 런타임 증거를 남긴다.
장르 핵심 루프가 실제 게임 상태로 완료된 순간에만 CORE_FUN status=PASS loop=<genre-specific-loop>를 남긴다. 단순 시작/버튼 클릭/문구 표시만으로 CORE_FUN을 찍지 않는다.
실제 게임 화면은 placeholder primitive 중심으로 완료 처리하지 않고 기존 저장소 에셋과 권리 명확한 에셋을 우선 사용한다.
시스템이 생성하는 Packages/ProjectSettings/WebBuild.cs는 빌드 뼈대일 뿐 게임 구현이 아니다. 게임플레이 소스는 Vibe가 직접 구현한다.
Unity Web에서 모바일 브라우저 실행 가능한 완전한 첫 플레이 사이클을 만든 뒤에만 검증으로 넘긴다.`;
    const out=task(id,{...project,engine:'unity',target:'unity'},goal,[coreRel,runtimeRel],'owner-immediate','high',[
      'owner-directive:webgame-first',
      'web-stage:WEB_BASE_IMPLEMENTATION',
      'unity-web-first-stage',
      'source-root-bootstrap-required',
      'unity-web-source-root-bootstrap-required',
      'canonical-source:unity-games',
      'web-build-output:web-games',
      'post-web-platform-pipeline:unchanged'
    ]);
    out.ownerDirective=true;
    out.speculativeEligible=false;
    out.workUnits=6;
    return out;
  }

  if(repairState||!buildWebReady||!qaReady){
    const id=nextCausalGenerationId(queue,`${project.gameId}-unity-web-repair`);if(!id)return null;
    const reasons=[
      repairState?'company-runtime:WEB_VIBE_REPAIR_REQUIRED':'',
      !buildWebReady?'BUILD_WEB_METHOD_MISSING':'',
      !qaReady?'UNITY_WEB_QA_CONTRACT_MISSING':''
    ].filter(Boolean).join('|');
    const goal=`[UNITY_WEB_REPAIR] 게임: ${project.name||project.gameId}
기존 unity-games/${project.gameId}/ 프로젝트를 직접 읽고 1차 Unity Web 실패 원인만 수정한다. 기존 게임 규칙·수치·저장·핵심 루프를 임의로 바꾸지 않는다.
필수 수리 근거: ${reasons||'runtime-validation-repair'}.
RuntimeBootstrap의 실제 입력/게임 함수와 JAEWOON_UNITY_WEB_QA 증거를 일치시키고 Web Build가 실제 프로젝트를 빌드하도록 유지한다.
MOBILE_TARGET은 실제 화면 컨트롤 위치여야 하고 MOBILE_INPUT은 브라우저 Pointer/Touch가 그 실제 컨트롤을 작동시킨 뒤에만 기록한다. CORE_FUN은 장르 핵심 루프가 실제 상태 변화와 진행/보상까지 완료된 뒤에만 PASS로 기록한다.
QA 마커만 추가하고 화면/상태가 변하지 않는 가짜 수정은 금지한다. 회사/홈페이지 정책 파일은 수정하지 않는다.`;
    const files=[coreRel,runtimeRel].filter(relative=>fs.existsSync(sourceFile(repoRoot,relative)));
    if(!files.length)return null;
    const out=task(id,{...project,engine:'unity',target:'unity'},goal,files,'owner-immediate','medium',[
      'owner-directive:webgame-first',
      'web-stage:WEB_REPAIR',
      'unity-web-first-stage',
      'company-runtime-state:'+clean(project.queueCanonicalState||'UNKNOWN'),
      'preserve-existing-game'
    ]);
    out.ownerDirective=true;
    out.speculativeEligible=false;
    return out;
  }
  return null;
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
function presentationSourceForProject(project,repoRoot){
  const root=posix(project.projectPath),engine=clean(project.engine).toLowerCase();
  const candidates=engine==='web'
    ?[`${root}/index.html`]
    :engine==='unity'
      ?[`${root}/Assets/Scripts/PrototypeAnimatedVisuals.cs`,`${root}/Assets/Scripts/RuntimeBootstrap.cs`]
      :engine==='roblox'
        ?[`${root}/client/Game.client.luau`,`${root}/shared/GameConfig.luau`]
        :[];
  return candidates.find(relative=>fs.existsSync(sourceFile(repoRoot,relative)))||null;
}
function genreCommercialGuidance(project={}){
  const text=clean([project.genre,project.category,project.gameCategory,project.name,project.gameId].filter(Boolean).join(' ')).toLowerCase();
  const common='UI는 장르와 실제 게임 규칙에서 새로 구성하고 unrelated 장르의 동일 HUD를 복사하지 않는다. Style Lock의 UI Motion Language/아이콘/타이포와 모바일 엄지 도달성을 지킨다. 적 종류는 색만 바꿔 구분하지 않고 실루엣·이동·공격·피격·사망·전투 역할 중 하나 이상을 실제로 다르게 구현한다.';
  if(/survival|생존/.test(text))return common+' 생존 장르는 HP와 실제 설계에 존재하는 허기·체온·위험·자원·제작 정보를 우선하고 채집/제작/생물 생태/날씨 반응 모션을 연결한다.';
  if(/defense|tower|디펜스|타워/.test(text))return common+' 디펜스는 웨이브·재화·기지 HP·설치 정보를 우선하고 타워별 발사/투사체와 적 역할별 이동·피격을 구분한다.';
  if(/tycoon|simulator|simulation|경영|타이쿤|시뮬/.test(text))return common+' 타이쿤/시뮬레이션은 돈·만족도·건설·업그레이드와 손님/대기열/작업자/시설 작동을 실제 월드 애니메이션으로 보여준다.';
  if(/shooter|fps|tps|shoot|슈터|사격|총/.test(text))return common+' 슈터는 탄약·조준점·재장전·HP를 우선하고 반동·발사·재장전·피격·적 조준/엄폐/추격 반응을 분리한다.';
  if(/puzzle|퍼즐/.test(text))return common+' 퍼즐은 규칙·목표·조작 결과를 즉시 읽히게 하고 정답/오답/연쇄/완료 애니메이션을 구분한다.';
  if(/horror|공포/.test(text))return common+' 공포는 최소 UI와 위협 가독성을 유지하면서 탐색→발견→추적 상태, 조명·시야·음향 변화를 실제 상태와 동기화한다.';
  if(/racing|race|레이싱/.test(text))return common+' 레이싱은 속도·순위·랩/경로를 우선하고 가속·감속·드리프트·충돌과 속도감/카메라 반응을 연결한다.';
  if(/strategy|전략|tactic/.test(text))return common+' 전략은 선택·자원·생산·명령 정보를 우선하고 유닛 이동·공격·건설·생산을 실제 월드 상태에 연결한다.';
  if(/life|healing|cozy|생활|힐링|농사|낚시/.test(text))return common+' 생활/힐링은 활동·인벤토리·시간/날씨를 우선하고 낚시·농사·요리·채집·NPC 일상 모션을 활동별로 구분한다.';
  if(/action|rogue|combat|액션|로그|전투/.test(text))return common+' 액션/로그라이크는 HP/자원/스킬 쿨다운/런 진행을 우선하고 무기별 anticipation→active/contact→recovery와 hit/death 반응을 분리한다.';
  return common+' RPG/어드벤처 계열은 HP·마나/자원·경험치·퀵슬롯·퀘스트 등 실제 설계에 존재하는 핵심 정보를 우선하고 무기/스킬/NPC 상호작용 모션을 역할별로 구분한다.';
}
function commercialReadinessGuidance(){
  return '상업용 준비 기준: 첫 10분 안에 핵심 재미와 학습 흐름이 실제 플레이로 드러나야 하며, 버튼/보상/피격/구매/제작/레벨업/퀘스트 완료 피드백을 실제 이벤트와 연결한다. BGM/SFX/UI/환경음은 역할을 분리하고 mute/volume 및 반복음 변형을 제공한다. 모바일 핵심 조작은 44px 이상과 엄지 도달성을 지키고, 과도한 흔들림·번쩍임·진동은 조절 가능해야 하며 텍스트/상태를 색 하나만으로 구분하지 않는다. 저장이 있는 게임은 업데이트 후 기존 저장 의미를 보존하고 실패 시 전체 데이터 손실을 피한다. 초반/중반/후반 목표와 반복 플레이 이유를 만들고, 수익화가 있으면 일반 게임 UI와 구매/광고 UI를 분리하며 결제 없이는 핵심 루프가 막히지 않게 한다. 이 기준이 실패하면 기존 repair/revalidation으로 되돌린다.';
}

function presentationStagesForProject(project={}){
  const engine=clean(project.engine).toLowerCase();
  const finalMarker=engine==='web'
    ?'gameplay root 또는 body에 data-presentation-quality-version="2"와 data-commercial-readiness-version="1"을 실제 품질 계약 선언으로 기록한다.'
    :engine==='unity'
      ?'표현 책임 C# 소스에 public const int PresentationQualityVersion = 2 형태의 실제 품질 계약 마커를 기록한다.'
      :'표현 책임 Luau 소스에 local PRESENTATION_QUALITY_VERSION = 2 형태의 실제 품질 계약 마커를 기록한다.';
  const stages=[
    {key:'asset-adaptation',pass:'ASSET_ADAPTATION',goal:'[PRESENTATION_PASS:ASSET_ADAPTATION] 기존 게임 로직·저장·밸런스·진행 의미를 그대로 보존하면서 실제 플레이 화면의 그래픽을 게임 정체성에 맞게 개선한다. 컨셉에 맞는 배경·지형·환경 레이어를 실제 렌더에 연결하고, 검증된 기존 에셋을 재사용하거나 현재 엔진의 텍스트 소스에서 최종 품질의 저폴리 모델·재질·조명·UI 표현을 직접 제작한다. 단일 primitive/원/사각형/임시 placeholder만으로 된 몬스터·캐릭터는 완료로 인정하지 않고 Style Lock을 일관되게 적용한다. UI·아이콘·타이포·배경·캐릭터·몬스터·VFX가 같은 게임의 표현 언어를 사용해야 하며 서로 다른 에셋팩을 무가공으로 섞거나 색만 바꾼 동일 몬스터를 별도 타입으로 완료 처리하지 않는다. 그래픽 검토 문장만 남기지 말고 실제 렌더 소스를 변경한다.'},
    {key:'living-motion',pass:'LIVING_MOTION',goal:'[PRESENTATION_PASS:LIVING_MOTION] 캐릭터와 주요 엔티티가 정지 상태에서도 살아 움직이도록 미세 호흡/자세 변화를 넣고, Idle↔Walk↔Run 또는 현재 게임의 등가 이동 상태를 속도 기반으로 부드럽게 연결한다. 가속·감속·회전 후행·무기/장식 secondary motion을 적용하고 순간 스냅과 끊긴 상태 전환을 줄인다. 몬스터/유닛 종류별로 체형·생태·전투 역할에 맞는 이동/대기 차이를 만들고 발 미끄러짐·이동속도와 모션 불일치를 줄인다. 장식용 무한 애니메이션만 추가해서 PASS하지 말고 gameplay state가 바뀔 때 실제 모션 상태도 바뀌게 한다. 판정·이동속도·밸런스는 변경하지 않는다.'},
    {key:'animation-feel',pass:'ANIMATION_FEEL',goal:'[PRESENTATION_PASS:ANIMATION_FEEL] 주요 공격/상호작용 하나 이상을 준비→가속→impact→짧은 표현용 hit-stop→반동→복귀 흐름으로 다듬는다. 공격/피격/사망 모션은 실제 attack/hit/death gameplay event에 각각 연결하고 적 제거가 발생하면 사망 모션 근거가 런타임에서 관찰돼야 한다. 빠른 동작은 smear/trail, 무거운 동작은 overshoot/settle을 검토한다. idle/move/attack/hit/death를 실제 상태와 연결하고 게임 핵심이면 equip/interact/use-item/skill/celebrate도 전용 전환으로 구현한다. 무기·캐릭터 체형·몬스터 공격 방식이 다르면 같은 공격 애니메이션을 기계적으로 복제하지 않는다. 실제 데미지/쿨다운/판정 시점은 기존 authoritative gameplay event를 보존하고 표현만 동기화한다.'},
    {key:'vfx',pass:'VFX',goal:'[PRESENTATION_PASS:VFX] 핵심 행동의 시각 피드백을 hit flash, trail/afterimage, impact wave/particle, danger telegraph, reward emphasis 중 게임에 맞는 방식으로 강화한다. 공격 성공·피격·구매·제작·레벨업·보상·퀘스트 완료 등 실제 이벤트는 상황에 맞는 화면/UI/VFX 피드백을 가지며 같은 이펙트를 모든 상황에 무차별 재사용하지 않는다. 효과는 모바일 입력과 위험 정보를 가리지 않게 제한하고 무제한 파티클 생성이나 매 프레임 불필요한 객체 생성을 피한다.'},
    {key:'camera-language',pass:'CAMERA_LANGUAGE',goal:'[PRESENTATION_PASS:CAMERA_LANGUAGE] 일반 행동은 미세한 카메라 반응, 강한 행동은 짧고 강한 반응, 보스/중요 순간은 통제된 hero moment가 되도록 카메라 언어를 정리하고 실제 runtime state에 연결한다. 줌/흔들림/추적은 모바일 가독성과 조작을 해치지 않고 멀미를 유발할 정도로 지속되지 않게 하며 화면 흔들림/번쩍임을 줄일 수 있는 접근성 설정과 충돌하지 않아야 한다.'},
    {key:'polish-mobile',pass:'POLISH_MOBILE',goal:`[PRESENTATION_PASS:POLISH_MOBILE] 모션 시작/끝 팝, 이펙트 과밀, UI 모션 불일치, 모바일 프레임/터치 간섭을 최종 정리한다. 가능한 기기에서 60FPS를 목표로 하고 저사양에서는 표현 비용만 낮추며 게임 의미·입력·저장·밸런스는 그대로 유지한다. 첫 10분의 핵심 재미/학습 흐름, 장르별 UI, 아트 일관성, 애니메이션 연속성, 피드백, 오디오 제어/반복 변형, 모바일 성능, 접근성, 저장/업데이트 안정성, 초중후반 목표/반복 동기, 수익화 UI 분리까지 Commercial Readiness를 확인하고 실제 runtime presentation hard gate를 통과해야 한다. 앞선 ASSET_ADAPTATION→LIVING_MOTION→ANIMATION_FEEL→VFX→CAMERA_LANGUAGE 패스가 실제 구현된 상태를 보존한 뒤 ${finalMarker}`}
  ];
  const audioEngineGuidance=engine==='web'
    ?'Web은 첫 사용자 제스처 이후 오디오를 시작하고 mute/volume을 유지하며 백그라운드 복귀 중복 재생을 막는다.'
    :engine==='unity'
      ?'Unity는 기존 AudioSource/AudioMixer 또는 책임 오디오 시스템을 사용해 BGM/SFX/UI/환경 버스를 분리하고, 씬/전투/보스/보상 상태 전환을 실제 게임 이벤트에 연결한다. 중복 AudioSource 생성과 씬 재진입 중복 재생을 막는다.'
      :'Roblox는 기존 SoundService/Sound 또는 책임 오디오 시스템을 사용해 Music/SFX/UI/Ambient 역할을 분리하고, 전투/보스/보상 상태를 실제 서버·클라이언트 이벤트에 맞춰 전환한다. 중복 Sound 생성과 Respawn/재접속 중복 재생을 막는다.';
  stages.splice(4,0,{key:'audio-feel',pass:'AUDIO_FEEL',goal:`[PRESENTATION_PASS:AUDIO_FEEL] 기존 오디오 구조를 먼저 재사용해서 탐험/긴장/전투/보스/보상 중 실제 필요한 상태의 음악 전환과 핵심 효과음을 자연스럽게 연결한다. ${audioEngineGuidance} BGM·전투음·UI음·환경음의 역할을 분리하고 타격음은 기존 authoritative impact event와 맞추며 반복음은 pitch/sample/volume 미세 변형 등으로 기계적인 반복감을 줄인다. 오디오는 표현 계층이며 데미지·쿨다운·드랍·저장·진행 의미를 바꾸면 안 된다.`});
  const genreGuide=genreCommercialGuidance(project),commercialGuide=commercialReadinessGuidance();
  return stages.map(stage=>({...stage,goal:`${stage.goal}\n[GENRE_PRESENTATION_GUIDANCE] ${genreGuide}\n[COMMERCIAL_READINESS_GUIDANCE] ${commercialGuide}`}));
}
const PRESENTATION_EVOLUTION_SIGNAL_PRIORITY=Object.freeze({OWNER_CHANGE_REQUEST:0,RUNTIME_CAPTURE_COMPARISON:1,VISUAL_DEBT:2,PLATFORM_PRESENTATION_PERFORMANCE_EVIDENCE:3,INTERNAL_OR_POST_RELEASE_PLAYTEST_PRESENTATION_FEEDBACK:4});
const PRESENTATION_EVOLUTION_PASSES=Object.freeze(['ASSET_ADAPTATION','LIVING_MOTION','ANIMATION_FEEL','VFX','AUDIO_FEEL','CAMERA_LANGUAGE','POLISH_MOBILE']);
function presentationRelevantText(value=''){
  return /(?:graphics?|visual|presentation|asset|model|character|monster|enemy|boss|map|world|environment|background|terrain|material|lighting|animation|motion|move|idle|walk|run|turn|attack|hit|death|impact|vfx|effect|particle|trail|audio|music|bgm|sound|sfx|camera|frame|fps|performance|mobile|readability|placeholder|primitive|silhouette|style|cinematic|그래픽|비주얼|연출|에셋|모델|캐릭터|몬스터|몹|보스|맵|환경|배경|재질|조명|애니|움직임|모션|공격 ?모션|피격|사망|이펙트|효과|음악|브금|사운드|카메라|프레임|성능)/i.test(clean(value));
}
function graphicsEvolutionAffectedPasses(text=''){
  const value=clean(text),passes=[];
  const add=pass=>{if(PRESENTATION_EVOLUTION_PASSES.includes(pass)&&!passes.includes(pass))passes.push(pass);};
  if(/(?:asset|model|character|monster|enemy|boss|map|world|environment|background|terrain|material|lighting|placeholder|primitive|silhouette|style|landmark|에셋|모델|캐릭터|몬스터|몹|보스|맵|환경|배경|재질|조명|실루엣)/i.test(value))add('ASSET_ADAPTATION');
  if(/(?:motion|animation|move|movement|idle|walk|run|turn|smooth|blend|weight|locomotion|secondary|procedural|애니|움직임|모션|걷|달리|회전|부드럽|체중|보조모션)/i.test(value))add('LIVING_MOTION');
  if(/(?:attack|hit|death|impact|recoil|anticipat|recover|combat.?feel|attack.?motion|피격|사망|타격|공격모션|공격 모션|반동|후딜|전투연출)/i.test(value))add('ANIMATION_FEEL');
  if(/(?:vfx|effect|particle|trail|flash|telegraph|shockwave|spark|이펙트|효과|파티클|트레일|섬광)/i.test(value))add('VFX');
  if(/(?:audio|music|bgm|sound|sfx|ambient|음악|브금|사운드|효과음|환경음)/i.test(value))add('AUDIO_FEEL');
  if(/(?:camera|shake|zoom|shot|cinematic|카메라|줌|화면흔들|시네마틱)/i.test(value))add('CAMERA_LANGUAGE');
  if(/(?:mobile|frame|fps|performance|clutter|readability|accessib|touch|ui|모바일|프레임|성능|가독성|접근성|터치|화면가림)/i.test(value))add('POLISH_MOBILE');
  if(!passes.length&&presentationRelevantText(value))add('POLISH_MOBILE');
  return passes;
}
function graphicsEvolutionSignalFingerprint(signal={}){
  return stableHash([clean(signal.source),clean(signal.key),clean(signal.text).replace(/\s+/g,' ').toLowerCase()].join('|'));
}
function presentationPrefix(project={}){
  return clean(project.engine).toLowerCase()==='web'?clean(project.gameId):`${clean(project.gameId)}-${clean(project.engine).toLowerCase()}`;
}
function isPresentationTaskRecord(item={}){
  const evidence=(item.evidence||[]).map(clean);
  return evidence.some(value=>value.startsWith('presentation-pass:'))||/-presentation-[a-z-]+-v\d+$/.test(clean(item.id));
}
function collectGraphicsEvolutionSignals(project={},queue={tasks:[]}){
  const signals=[];
  const push=(source,key,text)=>{
    const value=clean(text);
    if(!value||!presentationRelevantText(value))return;
    const affectedPasses=graphicsEvolutionAffectedPasses(value);
    if(!affectedPasses.length)return;
    const signal={source,key:clean(key)||source,text:value,affectedPasses};
    signal.fingerprint=graphicsEvolutionSignalFingerprint(signal);
    signal.priority=PRESENTATION_EVOLUTION_SIGNAL_PRIORITY[source]??99;
    if(!signals.some(row=>row.fingerprint===signal.fingerprint))signals.push(signal);
  };
  const runtimeEvidence=[
    clean(project.queueVibeWebImplementationReason),
    ...(project.queueStrictImplementationHardFailures||[]),
    ...(project.queueRoutingBlockers||[]),
    ...(project.developmentValidation?.blockers||[])
  ].filter(Boolean);
  for(const value of runtimeEvidence){
    if(/(?:frame|fps|performance|mobile.*(?:visual|effect|presentation)|presentation.*performance)/i.test(value))push('PLATFORM_PRESENTATION_PERFORMANCE_EVIDENCE','runtime-performance',value);
    else if(/(?:placeholder|primitive|asset|model|background|silhouette|style|visual.?debt)/i.test(value))push('VISUAL_DEBT','runtime-visual-debt',value);
    else push('RUNTIME_CAPTURE_COMPARISON','runtime-presentation',value);
  }
  for(const item of Array.isArray(queue?.tasks)?queue.tasks:[]){
    if(clean(item.gameId)!==clean(project.gameId))continue;
    const status=clean(item.status).toLowerCase();
    if(isPresentationTaskRecord(item))continue;
    const evidence=(item.evidence||[]).map(clean).filter(Boolean);
    if(item.ownerDirective===true&&status==='verified'&&presentationRelevantText(item.goal))push('OWNER_CHANGE_REQUEST',clean(item.id),clean(item.goal));
    if(status!=='verified')continue;
    for(const marker of evidence){
      if(!presentationRelevantText(marker))continue;
      if(/owner.*(?:presentation|visual|graphics|animation|vfx|camera|audio|music)/i.test(marker))push('OWNER_CHANGE_REQUEST',clean(item.id),marker);
      else if(/(?:visual.?debt|placeholder|primitive)/i.test(marker))push('VISUAL_DEBT',clean(item.id),marker);
      else if(/(?:frame|fps|performance)/i.test(marker))push('PLATFORM_PRESENTATION_PERFORMANCE_EVIDENCE',clean(item.id),marker);
      else if(/(?:playtest|feedback)/i.test(marker))push('INTERNAL_OR_POST_RELEASE_PLAYTEST_PRESENTATION_FEEDBACK',clean(item.id),marker);
      else if(/(?:runtime|regression|failure|failed|issue|readability|clutter)/i.test(marker))push('RUNTIME_CAPTURE_COMPARISON',clean(item.id),marker);
    }
  }
  return signals.sort((a,b)=>a.priority-b.priority||a.fingerprint.localeCompare(b.fingerprint));
}
function presentationEvolutionTasksForFingerprint(queue={},fingerprint=''){
  return (Array.isArray(queue?.tasks)?queue.tasks:[]).filter(item=>(item.evidence||[]).some(value=>clean(value)===`graphics-evolution-trigger:${fingerprint}`));
}
function presentationEvolutionCycleNumber(queue={},prefix=''){
  let max=1;
  for(const item of Array.isArray(queue?.tasks)?queue.tasks:[]){
    const id=clean(item.id);
    if(!id.startsWith(`${prefix}-presentation-`))continue;
    const match=/-v(\d+)$/.exec(id);
    if(match)max=Math.max(max,Number(match[1])||1);
  }
  return max+1;
}
function nextGraphicsEvolutionTask(project,repoRoot,queue,relative,stages){
  const signals=collectGraphicsEvolutionSignals(project,queue);
  if(!signals.length)return null;
  const prefix=presentationPrefix(project);
  for(const signal of signals){
    const existing=presentationEvolutionTasksForFingerprint(queue,signal.fingerprint);
    if(existing.some(item=>['queued','running','blocked','failed'].includes(clean(item.status).toLowerCase())))return null;
    const completedPasses=new Set(existing.filter(item=>clean(item.status).toLowerCase()==='verified').flatMap(item=>(item.evidence||[]).filter(value=>clean(value).startsWith('presentation-pass:')).map(value=>clean(value).slice('presentation-pass:'.length).toUpperCase())));
    const remaining=signal.affectedPasses.filter(pass=>!completedPasses.has(pass));
    if(!remaining.length)continue;
    const cycle=existing.length
      ?Math.max(...existing.map(item=>Number(/-v(\d+)$/.exec(clean(item.id))?.[1]||0)),2)
      :presentationEvolutionCycleNumber(queue,prefix);
    const pass=remaining[0],stage=stages.find(row=>row.pass===pass);
    if(!stage)continue;
    const id=`${prefix}-presentation-${stage.key}-v${cycle}`;
    if(hasTask(queue,id)){
      if(!taskVerified(queue,id))return null;
      continue;
    }
    const signalText=clean(signal.text).slice(0,800);
    const goal=`${stage.goal}\n[GRAPHICS_EVOLUTION_CYCLE] cycle=${cycle}; trigger=${signal.source}; fingerprint=${signal.fingerprint}; affected=${signal.affectedPasses.join(',')}\n새 근거: ${signalText}\n이 근거와 직접 관련된 기존 책임 시스템만 수정한다. 같은 신호로 완료된 범위를 반복 재작업하지 않고 영향 없는 게임플레이·저장·밸런스·판정은 보존한다.`;
    const out=task(id,project,goal,[relative],signal.source==='OWNER_CHANGE_REQUEST'?'owner-immediate':'normal','medium',[
      'asset-production-parallel:v1',
      'presentation-quality-pipeline:v1',
      `presentation-pass:${stage.pass}`,
      'graphics-evolution:evidence-driven',
      `graphics-evolution-cycle:${cycle}`,
      `graphics-evolution-trigger-source:${signal.source}`,
      `graphics-evolution-trigger:${signal.fingerprint}`,
      `graphics-evolution-affected-passes:${signal.affectedPasses.join(',')}`,
      'graphics-evolution-unlimited-generations:yes',
      'graphics-evolution-pass-alone-does-not-requeue',
      'graphics-evolution-same-signal-duplicate-forbidden',
      'presentation-preserve-gameplay-semantics',
      'presentation-runtime-qa-required',
      'graphics-pass-real-asset-binding-runtime-required',
      'mobile-performance-qa-required',
      'presentation-marker-only-pass:forbidden'
    ]);
    out.workUnits=4;
    out.assetProductionLane=true;
    out.estimatedRisk='high';
    out.speculativeEligible=true;
    out.atomicNeuronMode='PER_TASK_MICRO_FANIN';
    out.atomicCompletionRequired=true;
    out.graphicsEvolutionCycle=cycle;
    out.graphicsEvolutionTrigger={source:signal.source,fingerprint:signal.fingerprint,affectedPasses:[...signal.affectedPasses]};
    out.evidence=[...new Set([...(out.evidence||[]),'atomic-neuron-stream:presentation','atomic-neuron-micro-fanin:per-task','graphics-atomic-candidate-isolation-required'])];
    return out;
  }
  return null;
}
export function findPresentationQualityTask(project,repoRoot,queue){
  const engine=clean(project.engine).toLowerCase();
  if(!['web','unity','roblox'].includes(engine))return null;
  if(!['development-confirmed','release-confirmed'].includes(clean(project.releaseState).toLowerCase()))return null;
  if(engine!=='web'&&!assetProductionEnabled(repoRoot))return null;
  const relative=presentationSourceForProject(project,repoRoot);
  if(!relative)return null;
  const stages=presentationStagesForProject(project);
  let previousId=null;
  for(const stage of stages){
    const prefix=presentationPrefix(project);
    const id=`${prefix}-presentation-${stage.key}-v1`;
    if(hasTask(queue,id)){
      if(!taskVerified(queue,id))return null;
      previousId=id;
      continue;
    }
    if(previousId&&!taskVerified(queue,previousId))return null;
    const out=task(id,project,stage.goal,[relative],project.gameId==='fantasy-survival'?'owner-immediate':'normal','medium',[
      'asset-production-parallel:v1',
      'presentation-quality-pipeline:v1',
      `presentation-pass:${stage.pass}`,
      'quality-contract:livingMotionVisualQualityContract',
      'quality-contract:assetProductionParallelContract',
      'quality-contract:genrePresentationQualityContract',
      'quality-contract:commercialReadinessGate',
      'presentation-canonical-order-preserved',
      'presentation-preserve-gameplay-semantics',
      'presentation-runtime-qa-required',
      'graphics-pass-real-asset-binding-runtime-required',
      'mobile-performance-qa-required',
      'presentation-real-runtime-graphics:v2',
      'presentation-marker-only-pass:forbidden',
      'presentation-placeholder-primitives:forbidden'
    ]);
    out.workUnits=4;
    out.assetProductionLane=true;
    out.estimatedRisk='high';
    out.speculativeEligible=true;
    out.atomicNeuronMode='PER_TASK_MICRO_FANIN';
    out.atomicCompletionRequired=true;
    out.evidence=[...new Set([
      ...(out.evidence||[]),
      'atomic-neuron-stream:presentation',
      'atomic-neuron-micro-fanin:per-task',
      'graphics-atomic-candidate-isolation-required'
    ])];
    return out;
  }
  return nextGraphicsEvolutionTask(project,repoRoot,queue,relative,stages);
}
export function findWebPresentationQualityTask(project,repoRoot,queue){
  if(clean(project?.engine).toLowerCase()!=='web')return null;
  return findPresentationQualityTask(project,repoRoot,queue);
}

function weatherPresentationSource(project,repoRoot){
  const root=posix(project.projectPath),engine=clean(project.engine).toLowerCase();
  const candidates=engine==='web'
    ?[`${root}/index.html`]
    :engine==='unity'
      ?[`${root}/Assets/Scripts/PrototypeAnimatedVisuals.cs`,`${root}/Assets/Scripts/RuntimeBootstrap.cs`]
      :engine==='roblox'
        ?[`${root}/client/Game.client.luau`,`${root}/shared/GameConfig.luau`]
        :[];
  return candidates.find(relative=>fs.existsSync(sourceFile(repoRoot,relative)))||null;
}
export function findWeatherPresentationTask(project,repoRoot,queue){
  if(!isWeatherPresentationPilot(project,repoRoot))return null;
  if(!['development-confirmed','release-confirmed'].includes(clean(project.releaseState).toLowerCase()))return null;
  const relative=weatherPresentationSource(project,repoRoot);if(!relative)return null;
  const text=readText(sourceFile(repoRoot,relative));
  if(/WEATHER_PRESENTATION_VERSION\s*=\s*1|WeatherPresentationVersion\s*=\s*1/i.test(text))return null;
  const engine=clean(project.engine).toLowerCase(),id=`${project.gameId}-${engine}-weather-presentation-v1`;
  if(hasTask(queue,id))return null;
  const native=engine==='unity'
    ?'Unity 네이티브 Particle System/Fog/Lighting/Material/Audio로 구현하고 Web 렌더 자산을 복사하지 않는다.'
    :engine==='roblox'
      ?'Roblox 네이티브 ParticleEmitter/Atmosphere/Lighting/ColorCorrection/Sound로 구현하고 Web 렌더 자산을 복사하지 않는다.'
      :'현재 Web 렌더/Canvas/CSS/WebAudio 책임 시스템을 직접 사용한다.';
  const goal=`[WEATHER_PRESENTATION] 마력숲에 CLEAR/RAIN/FOG/SNOW/STORM 날씨 표현과 화산 지역 VOLCANIC_ASH/HEAT_HAZE 대기 표현을 구현한다. ${native} 공격력·체력·이동속도·드랍률·경제·진행·저장 의미는 변경하지 않는다. 멀티에서는 authoritative weather state 하나를 모든 플레이어가 공유하고 join-in-progress도 현재 상태를 받게 한다. 저사양에서는 파티클 밀도만 낮추고 날씨 의미는 바꾸지 않는다. 실제 런타임 시각/오디오·멀티 동기화·모바일 성능 QA가 가능해야 하며 완료 소스에 WEATHER_PRESENTATION_VERSION=1 또는 엔진 언어 등가 마커를 둔다.`;
  const out=task(id,project,goal,[relative],'owner-immediate','medium',[
    'weather-presentation:v1',
    'weather-states:CLEAR,RAIN,FOG,SNOW,STORM',
    'weather-regional:VOLCANIC_ASH,HEAT_HAZE',
    'weather-presentation-only',
    'weather-multiplayer-authoritative-sync',
    'weather-mobile-adaptive-density',
    'weather-runtime-evidence-required',
    'platform-native-presentation-required',
    'web-native-direct-asset-reuse:FORBIDDEN'
  ]);
  out.workUnits=5;
  out.assetProductionLane=true;
  out.weatherPresentationLane=true;
  out.estimatedRisk='high';
  out.speculativeEligible=true;
  out.atomicNeuronMode='PER_TASK_MICRO_FANIN';
  out.atomicCompletionRequired=true;
  out.evidence=[...new Set([
    ...(out.evidence||[]),
    'atomic-neuron-stream:presentation',
    'atomic-neuron-micro-fanin:per-task',
    'graphics-atomic-candidate-isolation-required'
  ])];
  return out;
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
function findRobloxInternalPlaytestTask(project,repoRoot,queue){
  if(project.engine!=='roblox'||project.releaseState!=='development-confirmed')return null;
  const state=clean(project.queueCanonicalState).toUpperCase(),step=clean(project.queueCurrentStep).toUpperCase();
  if(state!=='INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG'&&step!=='INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG')return null;
  if(project.queueRobloxInternalReleaseReady!==true)return null;
  const root=posix(project.projectPath),sourceDir=sourceFile(repoRoot,root);if(!fs.existsSync(sourceDir))return null;
  const exactSource=clean(project.queueRobloxInternalReleaseSource||project.queueRobloxSourceCommit);
  const exactArtifact=clean(project.queueRobloxInternalReleaseArtifact||project.queueRobloxArtifactIdentity);
  const version=Number(project.queueRobloxInternalReleaseVersion||0);
  if(!exactSource||!exactArtifact||!version)return null;
  const core=['shared/GameConfig.luau','server/Game.server.luau','client/Game.client.luau'].map(rel=>root+'/'+rel).filter(rel=>fs.existsSync(sourceFile(repoRoot,rel)));
  if(!core.length)return null;
  const id=project.gameId+'-roblox-internal-playtest-debug-'+exactSource.slice(0,12);
  if(hasTask(queue,id))return null;
  const failures=[...new Set([...(project.queueRoutingBlockers||[]),project.queueRobloxFailureStage,project.queueRobloxFailureSignature].map(clean).filter(Boolean))];
  const prior=(queue.tasks||[]).filter(row=>row.gameId===project.gameId&&(row.evidence||[]).includes('internal-playtest-co-development:yes')&&['failed','blocked'].includes(clean(row.status).toLowerCase()));
  const saturation=classifyVibePatchSaturation({attempts:prior.map(row=>({status:row.status,responsibleFiles:row.responsibleFiles||[],failureSignature:clean(row.blocker)})),responsibleFiles:core,threshold:3});
  const failureContext=failures.length?failures.join(' | '):'NO_REPRODUCIBLE_RUNTIME_FAILURE_RECORDED';
  const mode=saturation.saturated?'ROOT_CAUSE_MODE':'FOCUSED_REPAIR';
  const goal='[ROBLOX_INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG] game='+String(project.name||project.gameId)+'\nexact source='+exactSource+' artifact='+exactArtifact+' version='+version+' mode='+mode+'\nUse the already-published internal build as the current Candidate. Consume reproducible internal playtest evidence and Owner feedback when present, trace the first failure to the original responsible source, and preserve working gameplay, save meaning, and core loop. Never fabricate an observed runtime PASS and never satisfy acceptance by adding marker strings. If no reproducible runtime failure is recorded, do not invent a gameplay change; only repair concrete static defects, duplicate declarations, or broken bindings that are directly evidenced by the current source. After three repeated failures on the same responsibility, stop micro-patch accumulation and repair or redesign the original responsible system under ROOT_CAUSE_MODE. failure-evidence='+failureContext;
  const out=task(id,project,goal,core,'critical','medium',[
    'roblox-stage:INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG','internal-playtest-co-development:yes','repair-mode:'+mode,
    'internal-roblox-version:'+version,'internal-release-source:'+exactSource,'internal-release-artifact:'+exactArtifact,
    'acceptance:OBSERVED_INTERNAL_PLAYTEST_EVIDENCE_REQUIRED',...failures.map(value=>'runtime-failure:'+value)
  ]);
  out.changeSetId=id;out.baseSourceRevision=exactSource;out.sourceRevision=exactSource;out.internalRobloxVersion=version;
  out.acceptanceContract={observable:['EXACT_INTERNAL_RELEASE_SOURCE_BOUND','NO_FABRICATED_RUNTIME_PASS','AFFECTED_CORE_LOOP_REVALIDATED_WHEN_CHANGED','EXISTING_VALID_FEATURES_PRESERVED'],markerOnlyPassForbidden:true,preserveExistingBehaviorRequired:true,exactRevisionRequired:true,runtimeObservationRequired:true};
  out.failureEvidence=failures;out.currentStep='INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG';out.patchSaturation=saturation;
  return out;
}
export function attachRobloxDistilledLearning(taskInput={},project={}, {playbooks={},distillation={}}={}){
  if(!taskInput||clean(project?.engine).toLowerCase()!=='roblox')return taskInput;
  const context=createRobloxVibe3LearningContext({
    gameId:clean(project.gameId),
    profile:{genre:clean(project.genre),subgenre:clean(project.subgenre),playMode:clean(project.playMode)},
    playbooks,
    distillation
  });
  if(!context.applied||(!(context.distilledPatterns||[]).length&&!(context.distilledPrinciples||[]).length))return taskInput;
  const contextText=[
    '',
    '[VERIFIED_ROBLOX_DISTILLED_CONTEXT]',
    'Use these as transferable implementation principles only; do not copy external game code, assets, identifiers, layout, or protected expression.',
    ...(context.distilledPatterns||[]).map(value=>'pattern='+value),
    ...(context.distilledPrinciples||[]).map(value=>'principle='+value),
    'Fresh task QA and current-game acceptance remain mandatory; this context cannot satisfy a runtime or visual PASS by itself.'
  ].join('\n');
  return{
    ...taskInput,
    goal:clean(taskInput.goal)+contextText,
    robloxLearningContext:context,
    evidence:[...new Set([...(taskInput.evidence||[]),...(context.distilledSourceIds||[]).map(id=>'roblox-distilled-source:'+id),'roblox-distilled-context:advisory','roblox-distilled-transfer-fresh-qa-required'])]
  };
}

function findSafeTasks(project,repoRoot,queue){
  const pilot=isAssetProductionPilot(project,repoRoot);
  if(project.engine==='roblox')return uniqueTaskCandidates([
    findRobloxInternalPlaytestTask(project,repoRoot,queue),
    findWeatherPresentationTask(project,repoRoot,queue),
    findPresentationQualityTask(project,repoRoot,queue),
    scanExplicitMarkerTask(project,repoRoot,queue)
  ]);
  if(project.engine==='unity'){
    if(project.firstStageUnityWeb===true){
      const firstStage=findUnityWebFirstStageTask(project,repoRoot,queue);
      if(firstStage)return[firstStage];
      return uniqueTaskCandidates([
        findPresentationQualityTask(project,repoRoot,queue),
        scanExplicitMarkerTask(project,repoRoot,queue)
      ]);
    }
    if(project.releaseState==='development-confirmed'&&!pilot)return uniqueTaskCandidates([
      findPresentationQualityTask(project,repoRoot,queue),
      scanExplicitMarkerTask(project,repoRoot,queue)
    ]);
    return uniqueTaskCandidates([
      findWeatherPresentationTask(project,repoRoot,queue),
      findPresentationQualityTask(project,repoRoot,queue),
      findUnityTask(project,repoRoot,queue),
      scanExplicitMarkerTask(project,repoRoot,queue)
    ]);
  }
  if(project.engine==='web'){
    if(project.ownerPreservationPresentationUpgrade===true)return uniqueTaskCandidates([findWeatherPresentationTask(project,repoRoot,queue),findPresentationQualityTask(project,repoRoot,queue),findWebDiagnosticTask(project,repoRoot,queue),scanExplicitMarkerTask(project,repoRoot,queue)]);
    const owner=findWebAssessmentTask(project,repoRoot,queue);
    if(owner)return[owner];
    return uniqueTaskCandidates([findWebStrictImprovementTask(project,repoRoot,queue),findExistingWebDevelopmentContinuationTask(project,repoRoot,queue),findWebDiagnosticTask(project,repoRoot,queue),findWeatherPresentationTask(project,repoRoot,queue),findPresentationQualityTask(project,repoRoot,queue),scanExplicitMarkerTask(project,repoRoot,queue)]);
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

export function planVibe2AutonomousTasks({status={},catalog={},developmentQueue={},queue:queueInput={},repoRoot=process.cwd(),maxConcurrentTasks=DEFAULT_MAX_CONCURRENT_TASKS,queueMaxConcurrentTasks=maxConcurrentTasks,planningBacklogTarget=maxConcurrentTasks,planningBacklogMinimum=Math.min(40,Number(planningBacklogTarget)||0),workPackagePolicy={},recombinationMemory={},historicalRegistry={},robloxDistillationLedger={},robloxPlaybooks={}}={}){
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
      const runtimeItem=exactWebRepairByGameId.get(gameId)||{};
      const ownerPreservationPresentation=runtimeItem?.ownerPreservationPresentationUpgrade===true
        &&(item?.evidence||[]).some(value=>clean(value)==='presentation-quality-pipeline:v1');
      if(ownerPreservationPresentation){
        const blocker=clean(item?.blocker);
        if(status==='cancelled'&&/^superseded-by:VIBE_WEB_(?:BASE_IMPLEMENTATION|REPAIR)$/.test(blocker)){
          return{
            ...item,
            status:'queued',
            retries:0,
            blocker:null,
            reservationId:null,
            reservationRunId:null,
            reservationRunAttempt:0,
            reservedAt:null,
            lastOutcome:'RESTORED_OWNER_PRESERVATION_PRESENTATION',
            evidence:[...new Set([...(item.evidence||[]),'owner-preservation-presentation-preempts-generic-web-repair',`restored-from:${blocker}`])]
          };
        }
        return item;
      }
      const exactTaskId=sourceMissing?`${gameId}-web-base-implementation-v1`:`${gameId}-web-runtime-repair-v1`;
      if(clean(item?.id)===exactTaskId){
        const blocker=clean(item?.blocker);
        const staleExactBaseCancellation=blocker==='superseded-by:VIBE_WEB_REPAIR'||/^production-authority-inactive:/.test(blocker);
        if(sourceMissing&&status==='cancelled'&&staleExactBaseCancellation){
          return{...item,status:'queued',retries:0,blocker:null,reservationId:null,reservationRunId:null,reservationRunAttempt:0,reservedAt:null,lastOutcome:'RESTORED_BY_EXACT_WEB_BASE_IMPLEMENTATION',evidence:[...new Set([...(item.evidence||[]),'restored-exact-stage:WEB_BASE_IMPLEMENTATION',`restored-from:${blocker}`,'company-runtime-state:WEB_VIBE_REPAIR_REQUIRED'])]};
        }
        if(!sourceMissing&&['queued','failed','blocked'].includes(status)){
          const diagnosticEvidence=inheritedDiagnosticEvidence(gameId,indexPath,queue);
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
            const supervised=(item?.supervisionContract?.required===true)
              ||clean(item?.productionMode)==='SUPERVISED_VIBE_COAUTHORING'
              ||(item?.evidence||[]).map(clean).includes('supervised-web-build:required');
            if(supervised){
              return{...item,evidence:[...new Set([...(item.evidence||[]),...diagnosticEvidence,'company-runtime-failure-evidence:refreshed','company-runtime-failure-evidence:supervised-goal-preserved','company-runtime-state:WEB_VIBE_REPAIR_REQUIRED'])]};
            }
            return{...item,goal:refreshedGoal,evidence:[...new Set([...(item.evidence||[]),...diagnosticEvidence,'company-runtime-failure-evidence:refreshed','company-runtime-state:WEB_VIBE_REPAIR_REQUIRED'])]};
          }
          if(diagnosticEvidence.length)return{...item,evidence:[...new Set([...(item.evidence||[]),...diagnosticEvidence,'company-runtime-diagnostic-bridge:refreshed'])]};
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
  const allProjects=collectProjects(status,catalog,repoRoot,developmentQueue).map(project=>({...project,ownerFocusedCaretaker:focusedCaretakerProject(project,repoRoot)})),blockedTier1=allProjects.filter(project=>project.releaseState==='release-confirmed'&&project.engine==='unity'&&project.developmentBaseline?.ready!==true),projects=allProjects.filter(project=>isAutonomousProductionTarget(project,repoRoot)).sort(projectSort);
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
    packageTasks=packageTasks.map(candidate=>attachRobloxDistilledLearning(candidate,project,{playbooks:robloxPlaybooks,distillation:robloxDistillationLedger}));
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
  if(!planned.length)return{planned:false,count:0,reason:deferredSmallPackages.length?'MINIMUM_WORKLOAD_GATE':active.length?'AWAITING_INDEPENDENT_CAUSAL_SIGNAL':'CAUSAL_REPLAN_REQUIRED',brainLive:true,causalReplanRequired:true,queue,tasks:[],packages:[],planningBacklog,projectId:projects[0]?.gameId||null,blockedTier1GameIds:blockedTier1.map(p=>p.gameId),deferredSmallPackages,workPackagePolicy:policy,cycleTarget,workloadTelemetry};
  return{planned:true,count:planned.length,reason:ownerActive.length?'WORK_PACKAGES_PLANNED_AROUND_OWNER_DIRECTIVES':'WORK_PACKAGES_PLANNED',queue,tasks:planned,packages,planningBacklog:{...planningBacklog,after:developmentPlanningPool(queue).length,remainingToTarget:Math.max(0,backlogTarget-developmentPlanningPool(queue).length)},task:planned[0],projectId:planned[0].gameId,projectReleaseState:planned[0].releaseState,projectEngine:planned[0].target,blockedTier1GameIds:blockedTier1.map(p=>p.gameId),ownerDirectiveActiveCount:ownerActive.length,projectPriorityPolicy:'OWNER_DIRECTIVES_KEEP_PRIORITY_BUT_INDEPENDENT_FREE_SLOTS_REFILL;WEB_80_88_TO_89_THEN_SINGLE_BLOCKER_THEN_REWORK_THEN_REBUILD_THEN_NEW_DEVELOPMENT',deferredSmallPackages,workPackagePolicy:policy,cycleTarget,workloadTelemetry};
}

export function planVibe2AutonomousTask(args={}){return planVibe2AutonomousTasks(args);}
export function runVibe2AutoPlanner({
  statusFile='.vibe2/main-company-status.json', catalogFile='.vibe2/main-game-catalog.json', developmentQueueFile='', queueFile='', runtimeFile='vibe2-runtime.json',
  controlFile='', experienceFile='', recombinationFile='', historicalRegistryFile='', robloxDistillationFile='', repoRoot=process.cwd(), maxConcurrentTasks=process.env.VIBE2_MAX_CONCURRENT_GAME_TASKS||DEFAULT_MAX_CONCURRENT_TASKS
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
  const resolvedRobloxDistillationFile=clean(robloxDistillationFile)||path.join(repoRoot,'company-learning','vibe3-roblox-distillation-ledger.json');
  const robloxDistillationLedger=readJson(resolvedRobloxDistillationFile,{version:1,records:[]});
  const robloxPlaybooks=readJson(path.join(repoRoot,'company-learning','vibe3-task-playbooks.json'),{});
  const queueBefore=readJson(resolvedQueueFile,{tasks:[]});
  const result=planVibe2AutonomousTasks({status:readJson(statusFile,{}),catalog:readJson(catalogFile,{}),developmentQueue:readJson(developmentQueueFile,{items:[]}),queue:queueBefore,repoRoot,maxConcurrentTasks:effectivePlannerMax,queueMaxConcurrentTasks:configuredQueueMax,planningBacklogTarget:Number(runtime.continuous?.planningBacklog?.target||60),planningBacklogMinimum:Number(runtime.continuous?.planningBacklog?.minimum||40),workPackagePolicy:runtime.workPackages||{},recombinationMemory,historicalRegistry,robloxDistillationLedger,robloxPlaybooks});
  const normalizedBefore=createVibeContinuousQueue(queueBefore);
  const queueSynchronized=JSON.stringify(normalizedBefore.tasks)!==JSON.stringify(result.queue?.tasks||[]);
  if(result.planned||queueSynchronized)writeJson(resolvedQueueFile,result.queue);
  return{...result,queueSynchronized,machineHandoff,effectivePlannerMax,recombinationContext:{file:posix(resolvedRecombinationFile),recipes:Array.isArray(recombinationMemory?.recipes)?recombinationMemory.recipes.length:0,applied:(result.tasks||[]).filter(task=>(task.evidence||[]).some(value=>clean(value).startsWith('recombination-recipe:'))).length},robloxDistillationContext:{file:posix(resolvedRobloxDistillationFile),records:Array.isArray(robloxDistillationLedger?.records)?robloxDistillationLedger.records.length:0,applied:(result.tasks||[]).filter(task=>(task.evidence||[]).includes('roblox-distilled-context:advisory')).length}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=parseArgs(),result=runVibe2AutoPlanner({statusFile:clean(args.status)||'.vibe2/main-company-status.json',catalogFile:clean(args.catalog)||'.vibe2/main-game-catalog.json',developmentQueueFile:clean(args['development-queue']),queueFile:clean(args.queue),runtimeFile:clean(args.runtime)||'vibe2-runtime.json',controlFile:clean(args.control),experienceFile:clean(args.experience),recombinationFile:clean(args.recombination),historicalRegistryFile:clean(args['historical-registry']),robloxDistillationFile:clean(args['roblox-distillation']),repoRoot:clean(args.root)||process.cwd(),maxConcurrentTasks:clean(args.max)||process.env.VIBE2_MAX_CONCURRENT_GAME_TASKS||DEFAULT_MAX_CONCURRENT_TASKS});
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
  console.log(`VIBE3_ROBLOX_DISTILLATION_RECORDS_AVAILABLE=${result.robloxDistillationContext?.records||0}`);
  console.log(`VIBE3_ROBLOX_DISTILLATION_TASKS_APPLIED=${result.robloxDistillationContext?.applied||0}`);
}
