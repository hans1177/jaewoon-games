import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const clean=v=>String(v??'').trim();
const upper=v=>clean(v).toUpperCase();
const posix=v=>clean(v).replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/,'');
const readJson=(file,fallback={})=>file&&fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):fallback;
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');};
const safeId=v=>clean(v).replace(/[^A-Za-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90)||'game';
function permanentRemovalIds(roadmap={}){return new Set((Array.isArray(roadmap?.permanentProjectRemoval?.ids)?roadmap.permanentProjectRemoval.ids:[]).map(clean).filter(Boolean));}
function permanentlyRemoved(roadmap={},gameId=''){return permanentRemovalIds(roadmap).has(clean(gameId));}

function parseArgs(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');out[at<0?body:body.slice(0,at)]=at<0?true:body.slice(at+1);}return out;}
function listSourceFiles(root){const rows=[];const walk=current=>{for(const entry of fs.readdirSync(current,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){if(['.git','node_modules','dist','build','.rbxcloud'].includes(entry.name))continue;const full=path.join(current,entry.name);if(entry.isDirectory()){walk(full);continue;}if(!/\.(?:luau|lua|json)$/i.test(entry.name))continue;rows.push({full,relative:posix(path.relative(root,full))});}};if(fs.existsSync(root))walk(root);return rows;}
function sourceTreeSha(root){const h=crypto.createHash('sha256');for(const row of listSourceFiles(root)){h.update(row.relative);h.update('\0');h.update(fs.readFileSync(row.full));h.update('\0');}return h.digest('hex');}
function responsibleFiles(root,sourceRoot){const files=listSourceFiles(root).map(row=>row.relative);const preferred=['server/Game.server.luau','client/Game.client.luau','shared/GameConfig.luau','server/Main.server.luau','client/Main.client.luau','shared/Config.luau'];const selected=[];for(const name of preferred)if(files.includes(name)&&selected.length<3)selected.push(posix(sourceRoot+'/'+name));for(const name of files)if(selected.length<3&&!selected.includes(posix(sourceRoot+'/'+name)))selected.push(posix(sourceRoot+'/'+name));return selected;}
function releasedRobloxItem(item={}){const evidence=item.robloxReleaseEvidence||{},sourceRevision=clean(item.robloxSourceCommit),artifactIdentity=clean(item.robloxBuildArtifactIdentity);return upper(item.selectedPlatform||item.targetPlatform)==='ROBLOX'&&item.robloxReleaseClaim===true&&evidence.published===true&&clean(evidence.sourceRevision)===sourceRevision&&clean(evidence.artifactIdentity)===artifactIdentity&&Number(evidence.versionNumber||0)>0&&item.robloxFinalReviewPassed===true&&item.robloxRegressionPassed===true&&item.robloxExactRevisionPassed===true&&/^sha256:[a-f0-9]{64}$/i.test(artifactIdentity)&&/^[a-f0-9]{40}$/i.test(sourceRevision);}
function exposureGame(exposure={},gameId=''){return (exposure.games||[]).find(x=>clean(x.gameId)===clean(gameId))||{};}
function robloxExposure(exposure={},gameId=''){return (exposureGame(exposure,gameId).platforms||[]).find(x=>upper(x?.platform)==='ROBLOX')||{};}
function publicReleaseState(exposure={},gameId=''){return upper(exposureGame(exposure,gameId)?.externalPublicReleaseState);}
function internalReleaseObserved(item={},exposure={}){
  const platform=robloxExposure(exposure,item.gameId);
  return upper(item.selectedPlatform||item.targetPlatform)==='ROBLOX'&&(platform.internalReleaseReady===true||['INTERNAL_PLATFORM_RELEASE','PRIVATE_OR_RESTRICTED_TEST_EXPERIENCE'].includes(upper(platform.internalReleaseState)));
}
function legacyPublicReleaseBeforeGate(item={},roadmap={}){
  if(!releasedRobloxItem(item))return false;
  if(item.preexistingPublicReleaseBeforeExposureGate===true)return true;
  const activation=Date.parse(clean(roadmap?.developmentLifecycleMachine?.internalPlatformReleaseAndPublicExposureGate?.activatedAt)||'2026-09-21T00:00:00Z');
  const e=item.robloxReleaseEvidence||{};
  const publishedAt=Date.parse(clean(e.publishedAt||e.releasedAt||e.observedAt||item.robloxReleasedAt||item.releaseConfirmedAt));
  return Number.isFinite(activation)&&Number.isFinite(publishedAt)&&publishedAt<activation;
}
function focusReleaseKind(item={},exposure={},roadmap={}){
  if(publicReleaseState(exposure,item.gameId)==='PUBLIC_RELEASE'&&releasedRobloxItem(item))return'PUBLIC_RELEASE';
  if(internalReleaseObserved(item,exposure))return'INTERNAL_PLATFORM_RELEASE';
  if(legacyPublicReleaseBeforeGate(item,roadmap))return'LEGACY_PUBLIC_RELEASE';
  return'';
}
function postReleaseEligible(item={},exposure={},roadmap={}){return Boolean(focusReleaseKind(item,exposure,roadmap));}
function selectRecipe(recombination={},gameId='',treeSha=''){const recipes=Array.isArray(recombination.recipes)?recombination.recipes.filter(r=>Array.isArray(r.sourceProjects)&&new Set(r.sourceProjects.map(clean).filter(Boolean)).size>=2):[];if(!recipes.length)return null;const preferred=recipes.filter(r=>!r.sourceProjects.map(clean).includes(clean(gameId))),pool=preferred.length?preferred:recipes,n=parseInt(treeSha.slice(0,8),16);return pool[Number.isFinite(n)?n%pool.length:0]||null;}
function activeFocusGameIds(queue={}){return new Set((queue.tasks||[]).filter(t=>t.postReleaseFocused===true&&['queued','running'].includes(clean(t.status).toLowerCase())).map(t=>clean(t.gameId)).filter(Boolean));}
function historicalMaintenanceItem(entry={}){const e=entry.evidence||{};return entry.maintenanceEligible===true&&entry.currentReleaseClaim===false&&clean(entry.gameId)&&posix(entry.sourceRoot)==='roblox-games/'+clean(entry.gameId)&&e.actualStudioRuntime===true&&e.postRuntimeIndependentQa===true&&e.regression===true&&e.publicationTargetObserved===true&&clean(e.universeId)&&clean(e.placeId);}
export function buildHistoricalPostReleaseFocusTask({entry,repoRoot='.',roadmap={},recombination={},existingTasks=[]}={}){
  if(!historicalMaintenanceItem(entry)||permanentlyRemoved(roadmap,entry?.gameId))return null;
  const policy=roadmap?.developmentLifecycleMachine?.postReleaseFocusedDevelopment||{};if(policy.enabled!==true)return null;
  const gameId=clean(entry.gameId),sourceRoot=posix(entry.sourceRoot),root=path.join(repoRoot,...sourceRoot.split('/'));
  if(!fs.existsSync(root)||!fs.statSync(root).isDirectory())return null;
  const treeSha=sourceTreeSha(root),id=safeId(gameId)+'-historical-maintenance-'+treeSha.slice(0,16);if(existingTasks.some(t=>clean(t.id)===id))return null;
  const files=responsibleFiles(root,sourceRoot);if(!files.length)return null;
  const recipe=selectRecipe(recombination,gameId,treeSha),priorities=Array.isArray(policy.priorities)?policy.priorities:[];
  const recipeLines=recipe?['[VERIFIED_RECOMBINATION_CONTEXT]','recipe='+clean(recipe.id),'source_projects='+(recipe.sourceProjects||[]).map(clean).join(','),'feature_blend='+(recipe.featureBlend||[]).map(clean).slice(0,8).join(','),'transformation='+clean(recipe.transformationOperator),'Use verified patterns only as abstract implementation context; preserve this Roblox game identity and create a project-specific expression.']:[];
  const goal=['[HISTORICAL_ROBLOX_SUSTAINED_MAINTENANCE]',gameId+'의 과거 실제 Roblox publication target과 검증된 Studio 런타임 계보를 지속관리 대상으로 복귀시킨다.','리뷰와 피드백은 구현 명령이 아니다. Vibe가 근거를 보고 ACCEPT / PARTIAL_ACCEPT / DEFER / REJECT를 결정하고 채택 범위만 구현한다.','재현 가능한 버그·오류·진행막힘·저장/불러오기·조작 불능은 HOTFIX 최고 우선순위로 다루며 진행 중인 대규모 업데이트 준비 때문에 지연시키지 않는다.','채택한 작업은 Vibe가 HOTFIX / MINOR / MAJOR로 분류한다. HOTFIX/MINOR는 필요한 관련 QA와 정확 아티팩트 게이트만 통과하면 빠르게 재배포하고, MAJOR는 공개 버전을 유지한 채 후보를 미리 준비해 반복 플레이테스트·오류 디버깅·저장 호환성·독립 QA·전체 회귀·성능·최종 리뷰를 충분히 통과한 뒤 재배포한다.','현재 공개 릴리스라고 새로 주장하지 않는다. 과거 배포 대상과 현재 소스의 정체성/세이브 의미를 보존한다.','중앙 우선순위: '+(priorities.join(', ')||'release-blocking-bugs, progress-blockers, gameplay-completeness, content-depth, small-safe-quality-improvements, roblox-native-ux, mobile-readability, performance, maintainability')+'.','보안담당(VIBE_SECURITY_STEWARD)은 Roblox 본사 안티치트를 복제하지 않고 서버 권한, Remote 입력 검증/레이트리밋, 저장·경제·보상·데미지·쿨다운 권한, 멀티 동기화 악용, 백도어/외부 모듈 위험을 기존 보안체계로 검토한다. 일반 게임평 피드백과 달리 확정된 보안 취약점은 출시 차단 HOTFIX로 우선 처리한다.','현재 source 변경은 기존 Roblox runtime / independent QA / regression / release promotion 경로를 다시 통과해야 하며 검증 전 공개 버전 교체는 금지한다.',...recipeLines].join('\n');
  const e=entry.evidence||{};
  const evidence=['post-release-focused:yes','historical-deployment-recovery:yes','historical-current-release-claim:NO','historical-publication-universe:'+clean(e.universeId),'historical-publication-place:'+clean(e.placeId),'historical-publication-observed-at:'+clean(e.observedAt),'historical-source-revision:'+clean(entry.historicalSourceRevision),'historical-artifact:'+clean(entry.artifactIdentity),'post-release-source-tree-sha256:'+treeSha,'central-policy:company-learning/platform-release-roadmap.json','maintenance-registry:company-learning/roblox-sustained-maintenance.json',...(recipe?['recombination-recipe:'+clean(recipe.id)]:[])];
  return{id,gameId,target:'roblox',department:'development',type:'implementation',goal,responsibleFiles:files,dependencies:[],priority:'critical',releaseState:'development-confirmed',status:'queued',retries:0,retryPolicy:'UNLIMITED_CAUSAL_REPAIR',maxRetries:null,ownerDirective:false,requiresOwnerDecision:false,protectedChange:false,paidResourceRequired:false,sourceRoot,estimatedRisk:'medium',speculativeEligible:false,evidence,postReleaseFocused:true,historicalDeploymentRecovery:true,feedbackAdvisoryOnly:true,feedbackDecisionAuthority:'VIBE',feedbackDecisionRequired:true,allowedFeedbackDecisions:['ACCEPT','PARTIAL_ACCEPT','DEFER','REJECT'],updateScaleDecisionAuthority:'VIBE',updateScale:'UNCLASSIFIED',allowedUpdateScales:['HOTFIX','MINOR','MAJOR'],bugEmergencyLane:true,hotfixPreemptsOtherUpdateWork:true,majorUpdatePrepareAhead:true,fastRedeployEligibleScales:['HOTFIX','MINOR'],unverifiedPublicReplacementForbidden:true,verifiedResultLearningRequired:true,securityStewardRequired:true,securityPolicy:'company-learning/security-immune-system.json',securityReviewScopes:['SERVER_AUTHORITY','REMOTE_INPUT_VALIDATION','RATE_LIMIT','SAVE_INTEGRITY','ECONOMY_REWARD_INTEGRITY','DAMAGE_COOLDOWN_AUTHORITY','MULTIPLAYER_SYNC_ABUSE','BACKDOOR_UNTRUSTED_MODULE'],securityConfirmedBugRoute:'HOTFIX',securityHotfixPreemptsOtherUpdateWork:true,securityRescanBeforeRedeploy:true,platformAntiCheatDuplicated:false,packageLongWorkProtected:true,packageRole:'implementation-owner',taskWorkUnits:6,packageWorkUnits:6,packageGoal:'HISTORICAL_ROBLOX_SUSTAINED_MAINTENANCE',authority:'MACHINE_EXECUTION_CONTRACT'};
}
export function buildPostReleaseFocusTask({item,repoRoot='.',roadmap={},recombination={},existingTasks=[],exposure={}}={}){
  const releaseKind=focusReleaseKind(item,exposure,roadmap);
  if(!releaseKind||permanentlyRemoved(roadmap,item?.gameId))return null;
  const policy=roadmap?.developmentLifecycleMachine?.postReleaseFocusedDevelopment||{};if(policy.enabled!==true)return null;
  const gameId=clean(item.gameId);if(!gameId)return null;
  const sourceRoot=posix(item.robloxProjectPath||item.targetSourcePath||('roblox-games/'+gameId));if(sourceRoot!=='roblox-games/'+gameId)return null;
  const root=path.join(repoRoot,...sourceRoot.split('/'));if(!fs.existsSync(root)||!fs.statSync(root).isDirectory())return null;
  const treeSha=sourceTreeSha(root),id=safeId(gameId)+'-post-release-focus-'+treeSha.slice(0,16);if(existingTasks.some(t=>clean(t.id)===id))return null;
  const files=responsibleFiles(root,sourceRoot);if(!files.length)return null;
  const recipe=selectRecipe(recombination,gameId,treeSha),priorities=Array.isArray(policy.priorities)?policy.priorities:[];
  const recipeLines=recipe?['[VERIFIED_RECOMBINATION_CONTEXT]','recipe='+clean(recipe.id),'source_projects='+(recipe.sourceProjects||[]).map(clean).join(','),'feature_blend='+(recipe.featureBlend||[]).map(clean).slice(0,8).join(','),'transformation='+clean(recipe.transformationOperator),'Use the verified patterns as abstract implementation context only; preserve this released game identity and create a new project-specific expression.']:[];
  const releaseLabel=releaseKind==='INTERNAL_PLATFORM_RELEASE'?'내부':'공개';
  const goal=['[POST_RELEASE_FOCUSED_DEVELOPMENT]',gameId+'의 현재 '+releaseLabel+' Roblox 릴리스를 기준으로 실제 플레이테스트를 수행하고 버그·오류·진행막힘·완성도·UX·그래픽·오디오·밸런스·성능을 함께 리뷰한다.','리뷰와 피드백은 구현 강제가 아니다. Vibe가 증거를 보고 ACCEPT / PARTIAL_ACCEPT / DEFER / REJECT를 직접 결정하며 채택하지 않은 피드백은 구현하지 않는다.','크래시, 시작 실패, 진행 막힘, 저장/불러오기 문제, 조작 불능, 멀티 동기화 깨짐, 재현 가능한 게임플레이 오류는 HOTFIX 최고 우선순위로 처리하고 진행 중인 MAJOR 준비 때문에 늦추지 않는다.','채택한 작업은 Vibe가 HOTFIX / MINOR / MAJOR로 분류한다. HOTFIX는 재현→책임 지점 수정→incremental QA→플랫폼 smoke→focused regression→정확 아티팩트 게이트 후 즉시 재배포를 우선한다. MINOR는 작은 기능강화/저위험 품질개선으로 관련 검증 후 빠르게 재배포한다.','MAJOR는 현재 릴리스의 플레이 가능 상태를 유지한 채 업데이트 후보를 미리 준비하고 반복 플레이테스트, 자잘한 오류 디버깅, 저장 호환성, 독립 QA, 전체 회귀, 성능, 최종 게임 리뷰를 충분히 통과한 뒤 재배포한다.','현재 릴리스의 핵심 정체성, 세이브 의미, 동작을 보존한다.','중앙 우선순위: '+(priorities.join(', ')||'release-blocking-bugs, progress-blockers, gameplay-completeness, content-depth, small-safe-quality-improvements, roblox-native-ux, mobile-readability, performance, maintainability')+'.','숫자/라벨만 바꾸는 작업, 릴리스 근거 조작, QA 우회, 검증 전 공개 버전 교체는 금지한다.','보안담당(VIBE_SECURITY_STEWARD)은 Roblox 본사 안티치트를 복제하지 않고 서버 권한, Remote 입력 검증/레이트리밋, 저장·경제·보상·데미지·쿨다운 권한, 멀티 동기화 악용, 백도어/외부 모듈 위험을 기존 보안체계로 검토한다. 일반 게임평 피드백은 Vibe가 수용 여부를 결정하지만 확정된 보안 취약점은 보안 게이트로 HOTFIX 우선 처리한다.','검증된 결과는 Vibe 학습 입력으로 다시 흡수하고 다음 포커스 사이클에서 재평가한다.',...recipeLines].join('\n');
  const releaseEvidence=item.robloxReleaseEvidence||item.robloxInternalReleaseEvidence||{},platformEvidence=robloxExposure(exposure,gameId);
  const evidence=['post-release-focused:yes','focus-release-kind:'+releaseKind,releaseKind==='INTERNAL_PLATFORM_RELEASE'?'internal-release-focused:yes':'public-release-focused:yes','published-release-version:'+Number(releaseEvidence.versionNumber||item.robloxReleaseVersionNumber||0),'published-release-source:'+clean(releaseEvidence.sourceRevision||item.robloxSourceCommit),'published-release-artifact:'+clean(releaseEvidence.artifactIdentity||item.robloxBuildArtifactIdentity),'release-place-id:'+clean(platformEvidence.placeId||releaseEvidence.placeId),'post-release-source-tree-sha256:'+treeSha,'central-policy:company-learning/platform-release-roadmap.json',...(recipe?['recombination-recipe:'+clean(recipe.id)]:[])];
  return{id,gameId,target:'roblox',department:'development',type:'implementation',goal,responsibleFiles:files,dependencies:[],priority:'critical',releaseState:'release-confirmed',status:'queued',retries:0,retryPolicy:'UNLIMITED_CAUSAL_REPAIR',maxRetries:null,ownerDirective:false,requiresOwnerDecision:false,protectedChange:false,paidResourceRequired:false,sourceRoot,estimatedRisk:'medium',speculativeEligible:false,evidence,postReleaseFocused:true,feedbackAdvisoryOnly:true,feedbackDecisionAuthority:'VIBE',feedbackDecisionRequired:true,allowedFeedbackDecisions:['ACCEPT','PARTIAL_ACCEPT','DEFER','REJECT'],updateScaleDecisionAuthority:'VIBE',updateScale:'UNCLASSIFIED',allowedUpdateScales:['HOTFIX','MINOR','MAJOR'],bugEmergencyLane:true,hotfixPreemptsOtherUpdateWork:true,majorUpdatePrepareAhead:true,fastRedeployEligibleScales:['HOTFIX','MINOR'],unverifiedPublicReplacementForbidden:true,verifiedResultLearningRequired:true,securityStewardRequired:true,securityPolicy:'company-learning/security-immune-system.json',securityReviewScopes:['SERVER_AUTHORITY','REMOTE_INPUT_VALIDATION','RATE_LIMIT','SAVE_INTEGRITY','ECONOMY_REWARD_INTEGRITY','DAMAGE_COOLDOWN_AUTHORITY','MULTIPLAYER_SYNC_ABUSE','BACKDOOR_UNTRUSTED_MODULE'],securityConfirmedBugRoute:'HOTFIX',securityHotfixPreemptsOtherUpdateWork:true,securityRescanBeforeRedeploy:true,platformAntiCheatDuplicated:false,packageLongWorkProtected:true,packageRole:'implementation-owner',taskWorkUnits:6,packageWorkUnits:6,packageGoal:'POST_RELEASE_FOCUSED_DEVELOPMENT',authority:'MACHINE_EXECUTION_CONTRACT'};
}
export function feedPostReleaseFocus({roadmapFile='company-learning/platform-release-roadmap.json',companyRuntimeQueueFile='',historicalRegistryFile='',queueFile='.vibe2/queue.json',recombinationFile='',exposureFile='',repoRoot='.'}={}){
  const roadmap=readJson(roadmapFile,{}),runtimeQueue=readJson(companyRuntimeQueueFile,{items:[]}),historicalRegistry=readJson(historicalRegistryFile,{assets:[]}),queue=readJson(queueFile,{tasks:[]}),recombination=readJson(recombinationFile,{recipes:[]}),exposure=readJson(exposureFile,{games:[]});
  const activeGames=activeFocusGameIds(queue);
  const candidates=(runtimeQueue.items||[]).filter(item=>postReleaseEligible(item,exposure,roadmap)&&!permanentlyRemoved(roadmap,item.gameId)).sort((a,b)=>clean(a.gameId).localeCompare(clean(b.gameId)));
  let task=null,sawActiveCaretaker=false;
  for(const item of candidates){
    if(activeGames.has(clean(item.gameId))){sawActiveCaretaker=true;continue;}
    task=buildPostReleaseFocusTask({item,repoRoot,roadmap,recombination,existingTasks:queue.tasks||[],exposure});
    if(task)break;
  }
  if(!task){
    const historical=(historicalRegistry.assets||[]).filter(entry=>historicalMaintenanceItem(entry)&&!permanentlyRemoved(roadmap,entry.gameId)).sort((a,b)=>clean(a.gameId).localeCompare(clean(b.gameId)));
    for(const entry of historical){
      if(activeGames.has(clean(entry.gameId))){sawActiveCaretaker=true;continue;}
      task=buildHistoricalPostReleaseFocusTask({entry,repoRoot,roadmap,recombination,existingTasks:queue.tasks||[]});
      if(task)break;
    }
    if(!task)return{added:false,reason:sawActiveCaretaker?'CARETAKER_ALREADY_ACTIVE_FOR_GAME':candidates.length?'NO_NEW_SOURCE_CYCLE':historical.length?'NO_NEW_HISTORICAL_SOURCE_CYCLE':'NO_RELEASED_OR_HISTORICAL_ROBLOX',queue};
    const next={...queue,tasks:[...(queue.tasks||[]),task]};writeJson(queueFile,next);return{added:true,reason:'HISTORICAL_ROBLOX_MAINTENANCE_QUEUED',task,queue:next};
  }
  const next={...queue,tasks:[...(queue.tasks||[]),task]};writeJson(queueFile,next);return{added:true,reason:'POST_RELEASE_FOCUS_QUEUED',task,queue:next};
}
function main(){const a=parseArgs(),result=feedPostReleaseFocus({roadmapFile:clean(a.roadmap)||'company-learning/platform-release-roadmap.json',companyRuntimeQueueFile:clean(a['company-runtime-queue']),historicalRegistryFile:clean(a['historical-registry']),queueFile:clean(a.queue)||'.vibe2/queue.json',recombinationFile:clean(a.recombination),exposureFile:clean(a.exposure),repoRoot:clean(a.root)||'.'});console.log('VIBE2_POST_RELEASE_FOCUS_ADDED='+(result.added?'YES':'NO'));console.log('VIBE2_POST_RELEASE_FOCUS_REASON='+result.reason);console.log('VIBE2_POST_RELEASE_FOCUS_TASK='+(result.task?.id||'NONE'));console.log('VIBE2_POST_RELEASE_HISTORICAL='+(result.task?.historicalDeploymentRecovery===true?'YES':'NO'));}
const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);if(isMain)main();
