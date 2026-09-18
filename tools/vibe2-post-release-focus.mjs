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
function selectRecipe(recombination={},gameId='',treeSha=''){const recipes=Array.isArray(recombination.recipes)?recombination.recipes.filter(r=>Array.isArray(r.sourceProjects)&&new Set(r.sourceProjects.map(clean).filter(Boolean)).size>=2):[];if(!recipes.length)return null;const preferred=recipes.filter(r=>!r.sourceProjects.map(clean).includes(clean(gameId))),pool=preferred.length?preferred:recipes,n=parseInt(treeSha.slice(0,8),16);return pool[Number.isFinite(n)?n%pool.length:0]||null;}
function activeProtectedFocus(queue={}){return (queue.tasks||[]).some(t=>t.postReleaseFocused===true&&['queued','running'].includes(clean(t.status).toLowerCase()));}
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
  const goal=['[HISTORICAL_ROBLOX_SUSTAINED_MAINTENANCE]',gameId+'의 과거 실제 Roblox publication target과 검증된 Studio 런타임 계보를 지속관리 대상으로 복귀시킨다.','이 작업은 현재 공개 릴리스라고 새로 주장하지 않는다. 과거 배포 대상과 현재 소스의 정체성/세이브 의미를 보존하면서 현재 소스의 완성도 공백 1개를 구현한다.','중앙 우선순위: '+(priorities.join(', ')||'gameplay-completeness, content-depth, roblox-native-ux, mobile-readability, performance, maintainability')+'.','현재 source 변경은 기존 Roblox runtime / independent QA / regression / release promotion 경로를 다시 통과해야 하며 자동 재배포는 금지한다.',...recipeLines].join('\n');
  const e=entry.evidence||{};
  const evidence=['post-release-focused:yes','historical-deployment-recovery:yes','historical-current-release-claim:NO','historical-publication-universe:'+clean(e.universeId),'historical-publication-place:'+clean(e.placeId),'historical-publication-observed-at:'+clean(e.observedAt),'historical-source-revision:'+clean(entry.historicalSourceRevision),'historical-artifact:'+clean(entry.artifactIdentity),'post-release-source-tree-sha256:'+treeSha,'central-policy:company-learning/platform-release-roadmap.json','maintenance-registry:company-learning/roblox-sustained-maintenance.json',...(recipe?['recombination-recipe:'+clean(recipe.id)]:[])];
  return{id,gameId,target:'roblox',department:'development',type:'implementation',goal,responsibleFiles:files,dependencies:[],priority:'critical',releaseState:'development-confirmed',status:'queued',retries:0,maxRetries:2,ownerDirective:false,requiresOwnerDecision:false,protectedChange:false,paidResourceRequired:false,sourceRoot,estimatedRisk:'medium',speculativeEligible:false,evidence,postReleaseFocused:true,historicalDeploymentRecovery:true,packageLongWorkProtected:true,packageRole:'implementation-owner',taskWorkUnits:6,packageWorkUnits:6,packageGoal:'HISTORICAL_ROBLOX_SUSTAINED_MAINTENANCE',authority:'MACHINE_EXECUTION_CONTRACT'};
}
export function buildPostReleaseFocusTask({item,repoRoot='.',roadmap={},recombination={},existingTasks=[]}={}){
  if(!releasedRobloxItem(item)||permanentlyRemoved(roadmap,item?.gameId))return null;
  const policy=roadmap?.developmentLifecycleMachine?.postReleaseFocusedDevelopment||{};if(policy.enabled!==true)return null;
  const gameId=clean(item.gameId);if(!gameId)return null;
  const sourceRoot=posix(item.robloxProjectPath||item.targetSourcePath||('roblox-games/'+gameId));if(sourceRoot!=='roblox-games/'+gameId)return null;
  const root=path.join(repoRoot,...sourceRoot.split('/'));if(!fs.existsSync(root)||!fs.statSync(root).isDirectory())return null;
  const treeSha=sourceTreeSha(root),id=safeId(gameId)+'-post-release-focus-'+treeSha.slice(0,16);if(existingTasks.some(t=>clean(t.id)===id))return null;
  const files=responsibleFiles(root,sourceRoot);if(!files.length)return null;
  const recipe=selectRecipe(recombination,gameId,treeSha),priorities=Array.isArray(policy.priorities)?policy.priorities:[];
  const recipeLines=recipe?['[VERIFIED_RECOMBINATION_CONTEXT]','recipe='+clean(recipe.id),'source_projects='+(recipe.sourceProjects||[]).map(clean).join(','),'feature_blend='+(recipe.featureBlend||[]).map(clean).slice(0,8).join(','),'transformation='+clean(recipe.transformationOperator),'Use the verified patterns as abstract implementation context only; preserve this released game identity and create a new project-specific expression.']:[];
  const goal=['[POST_RELEASE_FOCUSED_DEVELOPMENT]',gameId+'의 현재 공개 Roblox 릴리스를 기준으로 완성도/구현 깊이를 한 단계 올린다.','현재 릴리스의 핵심 정체성, 세이브 의미, 공개 동작을 보존한다.','책임 파일 안에서 실제 플레이에 영향을 주는 하나의 구체적 완성도 또는 구현 공백을 찾아 구현한다.','중앙 우선순위: '+(priorities.join(', ')||'gameplay-completeness, content-depth, roblox-native-ux, mobile-readability, performance, maintainability')+'.','숫자/라벨만 바꾸는 작업, 릴리스 근거 조작, QA 우회는 금지한다.','수정 후 기존 incremental QA / performance sanity / fan-in regression / candidate promotion 경로를 그대로 통과해야 한다.',...recipeLines].join('\n');
  const evidence=['post-release-focused:yes','published-release-version:'+Number(item.robloxReleaseEvidence.versionNumber),'published-release-source:'+clean(item.robloxReleaseEvidence.sourceRevision),'published-release-artifact:'+clean(item.robloxReleaseEvidence.artifactIdentity),'post-release-source-tree-sha256:'+treeSha,'central-policy:company-learning/platform-release-roadmap.json',...(recipe?['recombination-recipe:'+clean(recipe.id)]:[])];
  return{id,gameId,target:'roblox',department:'development',type:'implementation',goal,responsibleFiles:files,dependencies:[],priority:'critical',releaseState:'release-confirmed',status:'queued',retries:0,maxRetries:2,ownerDirective:false,requiresOwnerDecision:false,protectedChange:false,paidResourceRequired:false,sourceRoot,estimatedRisk:'medium',speculativeEligible:false,evidence,postReleaseFocused:true,packageLongWorkProtected:true,packageRole:'implementation-owner',taskWorkUnits:6,packageWorkUnits:6,packageGoal:'POST_RELEASE_FOCUSED_DEVELOPMENT',authority:'MACHINE_EXECUTION_CONTRACT'};
}
export function feedPostReleaseFocus({roadmapFile='company-learning/platform-release-roadmap.json',companyRuntimeQueueFile='',historicalRegistryFile='',queueFile='.vibe2/queue.json',recombinationFile='',repoRoot='.'}={}){
  const roadmap=readJson(roadmapFile,{}),runtimeQueue=readJson(companyRuntimeQueueFile,{items:[]}),historicalRegistry=readJson(historicalRegistryFile,{assets:[]}),queue=readJson(queueFile,{tasks:[]}),recombination=readJson(recombinationFile,{recipes:[]});
  if(activeProtectedFocus(queue))return{added:false,reason:'PROTECTED_SLOT_OCCUPIED',queue};
  const candidates=(runtimeQueue.items||[]).filter(item=>releasedRobloxItem(item)&&!permanentlyRemoved(roadmap,item.gameId)).sort((a,b)=>clean(a.gameId).localeCompare(clean(b.gameId)));
  let task=null;
  for(const item of candidates){task=buildPostReleaseFocusTask({item,repoRoot,roadmap,recombination,existingTasks:queue.tasks||[]});if(task)break;}
  if(!task){
    const historical=(historicalRegistry.assets||[]).filter(entry=>historicalMaintenanceItem(entry)&&!permanentlyRemoved(roadmap,entry.gameId)).sort((a,b)=>clean(a.gameId).localeCompare(clean(b.gameId)));
    for(const entry of historical){task=buildHistoricalPostReleaseFocusTask({entry,repoRoot,roadmap,recombination,existingTasks:queue.tasks||[]});if(task)break;}
    if(!task)return{added:false,reason:candidates.length?'NO_NEW_SOURCE_CYCLE':historical.length?'NO_NEW_HISTORICAL_SOURCE_CYCLE':'NO_RELEASED_OR_HISTORICAL_ROBLOX',queue};
    const next={...queue,tasks:[...(queue.tasks||[]),task]};writeJson(queueFile,next);return{added:true,reason:'HISTORICAL_ROBLOX_MAINTENANCE_QUEUED',task,queue:next};
  }
  const next={...queue,tasks:[...(queue.tasks||[]),task]};writeJson(queueFile,next);return{added:true,reason:'POST_RELEASE_FOCUS_QUEUED',task,queue:next};
}
function main(){const a=parseArgs(),result=feedPostReleaseFocus({roadmapFile:clean(a.roadmap)||'company-learning/platform-release-roadmap.json',companyRuntimeQueueFile:clean(a['company-runtime-queue']),historicalRegistryFile:clean(a['historical-registry']),queueFile:clean(a.queue)||'.vibe2/queue.json',recombinationFile:clean(a.recombination),repoRoot:clean(a.root)||'.'});console.log('VIBE2_POST_RELEASE_FOCUS_ADDED='+(result.added?'YES':'NO'));console.log('VIBE2_POST_RELEASE_FOCUS_REASON='+result.reason);console.log('VIBE2_POST_RELEASE_FOCUS_TASK='+(result.task?.id||'NONE'));console.log('VIBE2_POST_RELEASE_HISTORICAL='+(result.task?.historicalDeploymentRecovery===true?'YES':'NO'));}
const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);if(isMain)main();
