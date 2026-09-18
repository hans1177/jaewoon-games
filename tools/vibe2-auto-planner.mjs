// 파일명: tools/vibe2-auto-planner.mjs
// 역할: 최신 회사 상태·게임 카탈로그·실제 소스에서 충돌 없는 작업을 계획한다.
// 최신 소유자 지시: DEVELOPMENT_CONFIRMED Web 검증 프로토타입은 실제 웹게임 재구축을 최우선한다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createVibeContinuousQueue, DEFAULT_MAX_CONCURRENT_TASKS } from '../assets/vibe-continuous-queue.js';
import { generateVibe2Handoff } from './vibe2-handoff.mjs';
import { diagnoseGame, microTaskFromIssue } from './autonomous-diagnostics.mjs';
import { buildWorkPackage, computeWorkloadTelemetry, estimateTaskWorkUnits, resolveWorkPackagePolicy } from './vibe2-work-package.mjs';
import { runGameStudyPlannerContext } from './vibe2-game-study-planner-context.mjs';

const clean=value=>String(value??'').trim();
const posix=value=>clean(value).replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/,'');
const stableHash=value=>{let h=2166136261;for(const ch of String(value??'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return(h>>>0).toString(36);};
const RELEASE_RANK=Object.freeze({'release-confirmed':0,'development-confirmed':1,reviewing:2,other:3});
const ENGINE_RANK=Object.freeze({web:0,roblox:1,unity:2,unreal:3,godot:4});
const SEVERITY_PRIORITY=Object.freeze({critical:'critical',high:'high',medium:'normal',low:'low'});
const CANONICAL_POLICY_PATH='company-learning/platform-release-roadmap.json';

function readJson(file,fallback={}){if(!file||!fs.existsSync(file))return fallback;return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');}
function parseArgs(argv=process.argv.slice(2)){const args={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)args[body]=true;else args[body.slice(0,at)]=body.slice(at+1);}return args;}
function parallelLimit(value){return Math.max(1,Math.min(20,Math.floor(Number(value)||DEFAULT_MAX_CONCURRENT_TASKS)));}
function releaseState(value){const normalized=clean(value).toLowerCase();return Object.hasOwn(RELEASE_RANK,normalized)?normalized:'other';}
function stateFromCatalog(game={}){const cls=clean(game.productionClass).toUpperCase();if(cls==='RELEASE_CONFIRMED')return'release-confirmed';if(cls==='DEVELOPMENT_CONFIRMED')return'development-confirmed';return releaseState(game.homepageCategory);}
function engineFromProject(project={}){const projectPath=posix(project.robloxProjectPath||project.projectPath||project.source),target=clean(project.selectedPlatform||project.targetPlatform||project.target).toLowerCase();if(projectPath.startsWith('roblox-games/')||target.startsWith('roblox'))return'roblox';if(projectPath.startsWith('unity-games/')||target.startsWith('unity'))return'unity';if(projectPath.startsWith('web-games/')||target==='web')return'web';if(projectPath.startsWith('unreal-games/')||target.startsWith('unreal'))return'unreal';if(projectPath.startsWith('godot-games/')||target.startsWith('godot'))return'godot';return null;}
function webRootFromCatalog(game={}){const webPath=posix(game.webPath).replace(/^\//,'');return /^web-games\/[a-zA-Z0-9._-]+$/.test(webPath)?webPath:null;}
function robloxRootFromCatalog(game={}){const explicit=posix(game.robloxProjectPath||game.robloxPath||'');if(/^roblox-games\/[a-zA-Z0-9._-]+$/.test(explicit))return explicit;const id=clean(game.id);return id?`roblox-games/${id}`:null;}
function catalogById(catalog={}){return new Map((Array.isArray(catalog.games)?catalog.games:[]).map(game=>[clean(game.id),game]));}

export function latestDevelopmentBaselineEvidence(gameId,repoRoot=process.cwd()){const id=clean(gameId),root=path.join(repoRoot,'design',id),missing={ready:false,reason:'DEVELOPMENT_BASELINE_REQUIRED',source:null,gate:null,policySource:CANONICAL_POLICY_PATH};if(!id||!fs.existsSync(root))return missing;const policy=readJson(path.join(repoRoot,CANONICAL_POLICY_PATH),null);if(policy&&(clean(policy.authority)!=='MACHINE_EXECUTION_CONTRACT'||clean(policy.machineSourceOfTruth)!==CANONICAL_POLICY_PATH||policy.humanDocumentRequired!==false))return{...missing,reason:'CENTRAL_MACHINE_POLICY_INVALID'};let dates=[];try{dates=fs.readdirSync(root,{withFileTypes:true}).filter(e=>e.isDirectory()&&/^\d{4}-\d{2}-\d{2}$/.test(e.name)).map(e=>e.name).sort().reverse();}catch{return missing;}for(const date of dates){const file=path.join(root,date,'cycle-status.json'),status=readJson(file,null),gate=status?.baselineGate;if(!gate||gate.state!=='DEVELOPMENT_BASELINE_READY'||gate.ready!==true)continue;const e=gate.evidence||{};if(e.webGameplay?.pass!==true||e.unityProject?.present!==true||e.unityTechnical?.pass!==true)continue;return{ready:true,reason:'DEVELOPMENT_BASELINE_READY',source:posix(path.relative(repoRoot,file)),gate,policySource:CANONICAL_POLICY_PATH,historicalPolicyDocument:clean(gate.policyDocument)||null};}return missing;}

function collectProjects(status={},catalog={},repoRoot=process.cwd()){const byId=catalogById(catalog),rows=[];for(const project of Array.isArray(status.projects)?status.projects:[]){const id=clean(project.gameId),engine=engineFromProject(project),root=posix(project.robloxProjectPath||project.projectPath||project.source);if(!id||!engine||!root||clean(project.ownerDecision).toUpperCase()!=='PASS')continue;const game=byId.get(id)||{},state=stateFromCatalog(game),developmentBaseline=state==='release-confirmed'&&engine==='unity'?latestDevelopmentBaselineEvidence(id,repoRoot):null;rows.push({...project,gameId:id,engine,projectPath:root,releaseState:state,existing:true,source:'company-status',developmentBaseline});}
for(const game of Array.isArray(catalog.games)?catalog.games:[]){const id=clean(game.id),state=stateFromCatalog(game),robloxRoot=robloxRootFromCatalog(game);if(id&&robloxRoot&&['release-confirmed','development-confirmed'].includes(state)&&fs.existsSync(path.join(repoRoot,robloxRoot))&&!rows.some(r=>r.gameId===id&&r.engine==='roblox'))rows.push({gameId:id,name:clean(game.name),engine:'roblox',target:'roblox',projectPath:robloxRoot,existing:true,releaseState:state,progress:0,source:'game-catalog',developmentBaseline:null});const root=webRootFromCatalog(game),developmentWebEligible=state==='development-confirmed',publishedWebEligible=game.homepageWebPlayable===true;if(!id||!root||game.hasWebArchive!==true||(!developmentWebEligible&&!publishedWebEligible))continue;if(rows.some(r=>r.gameId===id&&r.engine==='web'))continue;const exists=fs.existsSync(path.join(repoRoot,root));rows.push({gameId:id,name:clean(game.name),engine:'web',target:'web',projectPath:root,existing:exists,releaseState:state,progress:0,source:'game-catalog',developmentBaseline:null});}return rows;}
function projectSort(a,b){const engine=(ENGINE_RANK[a.engine]??9)-(ENGINE_RANK[b.engine]??9);if(engine)return engine;const release=(RELEASE_RANK[a.releaseState]??9)-(RELEASE_RANK[b.releaseState]??9);if(release)return release;return Number(b.progress||0)-Number(a.progress||0)||a.gameId.localeCompare(b.gameId);}
function isAutonomousProductionTarget(project={}){if(project.engine==='roblox')return['release-confirmed','development-confirmed'].includes(project.releaseState);if(project.releaseState==='release-confirmed')return project.engine==='unity'&&project.developmentBaseline?.ready===true;if(project.releaseState==='development-confirmed')return project.engine==='web';return false;}
function sourceFile(root,relative){return path.join(root,...posix(relative).split('/'));}
function readText(file){try{return fs.readFileSync(file,'utf8');}catch{return'';}}
function hasTask(queue,id){return queue.tasks.some(item=>item.id===id);}
function activeTasks(queue){return queue.tasks.filter(item=>['queued','running'].includes(clean(item.status).toLowerCase()));}
function sameRootResponsibilityConflict(a={},b={}){const aRoot=posix(a.sourceRoot),bRoot=posix(b.sourceRoot);if(!aRoot||!bRoot||aRoot!==bRoot)return false;const aFiles=new Set((a.responsibleFiles||[]).map(posix).filter(Boolean)),bFiles=new Set((b.responsibleFiles||[]).map(posix).filter(Boolean));if(!aFiles.size||!bFiles.size)return true;for(const file of aFiles)if(bFiles.has(file))return true;return false;}
function plannerConflict(queue,task){return activeTasks(queue).some(item=>sameRootResponsibilityConflict(item,task));}
function task(id,project,goal,responsibleFiles,priority='normal',estimatedRisk='low',extraEvidence=[]){const baselineEvidence=project.releaseState==='release-confirmed'&&project.engine==='unity'&&project.developmentBaseline?.ready===true?[`development-baseline:${project.developmentBaseline.source}`]:[];return{id,gameId:project.gameId,target:project.engine,department:'development',type:'implementation',goal,responsibleFiles,dependencies:[],priority,releaseState:project.releaseState,status:'queued',retries:0,maxRetries:2,ownerDirective:false,requiresOwnerDecision:false,protectedChange:false,paidResourceRequired:false,sourceRoot:posix(project.projectPath),estimatedRisk,speculativeEligible:estimatedRisk==='high',evidence:[`central-policy:${CANONICAL_POLICY_PATH}`,`vibe2-auto-planner:${project.source}`,`release-state:${project.releaseState}`,`source-root:${posix(project.projectPath)}`,...baselineEvidence,...extraEvidence]};}

function transformativeTaskEligible(taskInput={}){
  const evidence=new Set((taskInput.evidence||[]).map(clean));
  if(evidence.has('full-web-game-rebuild')||evidence.has('existing-web-continuation'))return true;
  return /FULL_WEB_GAME_REBUILD|EXISTING_WEB_DEVELOPMENT_CONTINUATION|REBUILD_EXISTING_GAME|NEW_GAME_IMPLEMENTATION/i.test(clean(taskInput.goal));
}
function selectTransformativeRecipe(memory={},taskInput={}){
  const recipes=Array.isArray(memory?.recipes)?memory.recipes.filter(recipe=>Array.isArray(recipe?.sourceProjects)&&new Set(recipe.sourceProjects.map(clean).filter(Boolean)).size>=2):[];
  if(!recipes.length)return null;
  const target=clean(taskInput.gameId);
  const preferred=recipes.filter(recipe=>!recipe.sourceProjects.map(clean).includes(target));
  const pool=preferred.length?preferred:recipes;
  const seed=parseInt(stableHash([taskInput.id,target,taskInput.target].join('|')),36);
  return pool[Number.isFinite(seed)?seed%pool.length:0]||null;
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

function looksLikeValidationPrototype(text=''){return /검증 루프:|STATUS:\s*준비|FULL APPROVED WEB COMPANION|DEVELOPMENT_CONFIRMED\s*·/i.test(text)&&(/data-action=|class=["'][^"']*action|scope-action|승인 분량 전체 구현/i.test(text));}
function findWebFullGameTask(project,repoRoot,queue){if(project.engine!=='web'||project.releaseState!=='development-confirmed')return null;const relative=`${posix(project.projectPath)}/index.html`,file=sourceFile(repoRoot,relative),text=readText(file),missing=!fs.existsSync(file);if(!missing&&!looksLikeValidationPrototype(text))return null;const id=missing?`${project.gameId}-web-base-implementation-v1`:`${project.gameId}-owner-full-web-game-rebuild-v1`;if(hasTask(queue,id))return null;const goal=missing?`[WEB_BASE_IMPLEMENTATION] FULL_WEB_GAME_REBUILD SOURCE_ROOT_BOOTSTRAP_ALLOWED\n게임: ${project.name||project.gameId}\n중앙 MACHINE_EXECUTION_CONTRACT에서 DEVELOPMENT_CONFIRMED된 게임의 Web 1차 구현이다. 승인된 게임 정체성·설계·scope를 유지해 실제 플레이 가능한 모바일 Web baseline을 구현한다. 실제 입력→게임 상태 변화→핵심 루프→진행/보상→위험/실패→재시작이 연결되어야 한다. 검증 패널·가짜 진행·외부 네트워크 의존은 금지한다. 검증된 경험과 transformative recombination context는 참고하되 원본 코드·원본 에셋·식별자를 복사하지 않고 새 코드와 새 표현으로 구현한다. 회사/홈페이지 정책 파일은 수정하지 않는다.`:`[OWNER_IMMEDIATE_WEB_FIRST] FULL_WEB_GAME_REBUILD\n게임: ${project.name||project.gameId}\n현재 index.html은 검증용 프로토타입이다. 이 파일을 실제 플레이 가능한 모바일 웹게임으로 완전히 재구축한다. 장르와 현재 게임 정체성은 유지하되 검증 버튼/숫자 변화 화면을 게임으로 취급하지 않는다. 실제 직접 조작, 실제 게임 상태 변화, 반복 가능한 핵심 루프, 난이도 또는 진행 상승, 실패/성공 또는 생존/점수 목표, 재시작을 구현한다. 모바일 터치 우선, 화면 잘림 금지, 외부 네트워크/유료 API 없이 단일 기존 Web 루트에서 실행한다. 필요하면 index.html 전체 교체를 사용한다. 홈페이지나 회사 파일은 수정하지 않는다. 완료 후 실제 플레이 QA를 통과한 후보만 main에 올린다.`;const evidence=missing?['owner-directive:webgame-first','web-stage:WEB_BASE_IMPLEMENTATION','source-root-bootstrap-required','full-web-game-rebuild','prototype-completion-forbidden']:['owner-directive:webgame-first','web-stage:WEB_BASE_IMPLEMENTATION','full-web-game-rebuild','prototype-completion-forbidden'];const out=task(id,project,goal,[relative],'owner-immediate','medium',evidence);out.ownerDirective=true;out.speculativeEligible=false;return out;}
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
function findSafeTasks(project,repoRoot,queue){
  if(project.engine==='roblox')return uniqueTaskCandidates([scanExplicitMarkerTask(project,repoRoot,queue)]);
  if(project.engine==='unity')return uniqueTaskCandidates([findUnityTask(project,repoRoot,queue),scanExplicitMarkerTask(project,repoRoot,queue)]);
  if(project.engine==='web'){
    const owner=findWebFullGameTask(project,repoRoot,queue);
    if(owner)return[owner];
    return uniqueTaskCandidates([findWebDiagnosticTask(project,repoRoot,queue),scanExplicitMarkerTask(project,repoRoot,queue)]);
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

export function planVibe2AutonomousTasks({status={},catalog={},queue:queueInput={},repoRoot=process.cwd(),maxConcurrentTasks=DEFAULT_MAX_CONCURRENT_TASKS,workPackagePolicy={},recombinationMemory={}}={}){
  let queue=createVibeContinuousQueue({...(queueInput||{}),maxConcurrentTasks:parallelLimit(maxConcurrentTasks)});
  const active=activeTasks(queue);
  const ownerActive=active.filter(item=>item.ownerDirective);
  const capacity=Math.max(0,queue.maxConcurrentTasks-active.length);
  if(!capacity)return{planned:false,count:0,reason:'PARALLEL_QUEUE_AT_CAPACITY',queue,tasks:[],packages:[],workloadTelemetry:computeWorkloadTelemetry(queue,[])};
  const policy=resolveWorkPackagePolicy(workPackagePolicy,queue);
  const allProjects=collectProjects(status,catalog,repoRoot),blockedTier1=allProjects.filter(project=>project.releaseState==='release-confirmed'&&project.engine==='unity'&&project.developmentBaseline?.ready!==true),projects=allProjects.filter(isAutonomousProductionTarget).sort(projectSort);
  if(!projects.length)return{planned:false,count:0,reason:blockedTier1.length?'DEVELOPMENT_BASELINE_REQUIRED':'NO_CONFIRMED_PRODUCTION_PROJECT',queue,tasks:[],packages:[],workPackagePolicy:policy,workloadTelemetry:computeWorkloadTelemetry(queue,[]),blockedTier1GameIds:blockedTier1.map(p=>p.gameId)};
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
  if(!planned.length)return{planned:false,count:0,reason:deferredSmallPackages.length?'MINIMUM_WORKLOAD_GATE':active.length?'NO_INDEPENDENT_SAFE_AUTONOMOUS_TASK':'NO_SAFE_AUTONOMOUS_TASK',queue,tasks:[],packages:[],projectId:projects[0]?.gameId||null,blockedTier1GameIds:blockedTier1.map(p=>p.gameId),deferredSmallPackages,workPackagePolicy:policy,cycleTarget,workloadTelemetry};
  return{planned:true,count:planned.length,reason:ownerActive.length?'WORK_PACKAGES_PLANNED_AROUND_OWNER_DIRECTIVES':'WORK_PACKAGES_PLANNED',queue,tasks:planned,packages,task:planned[0],projectId:planned[0].gameId,projectReleaseState:planned[0].releaseState,projectEngine:planned[0].target,blockedTier1GameIds:blockedTier1.map(p=>p.gameId),ownerDirectiveActiveCount:ownerActive.length,projectPriorityPolicy:'OWNER_DIRECTIVES_KEEP_PRIORITY_BUT_INDEPENDENT_FREE_SLOTS_REFILL;WEB_FIRST_IMPLEMENTATION_BY_VIBE',deferredSmallPackages,workPackagePolicy:policy,cycleTarget,workloadTelemetry};
}

export function planVibe2AutonomousTask(args={}){return planVibe2AutonomousTasks(args);}
export function runVibe2AutoPlanner({
  statusFile='.vibe2/main-company-status.json', catalogFile='.vibe2/main-game-catalog.json', queueFile='', runtimeFile='vibe2-runtime.json',
  controlFile='', experienceFile='', knowledgeFile='', runtimeEvidenceRoot='', recombinationFile='', repoRoot=process.cwd(), maxConcurrentTasks=process.env.VIBE2_MAX_CONCURRENT_GAME_TASKS||DEFAULT_MAX_CONCURRENT_TASKS
}={}) {
  const runtime=readJson(runtimeFile,{});
  const resolvedQueueFile=clean(queueFile)||clean(runtime.sources?.queue)||'.vibe2/queue.json';
  const resolvedControlFile=clean(controlFile)||clean(runtime.sources?.parallelism)||clean(runtime.adaptiveBackpressure?.stateFile)||'.vibe2/parallelism-control.json';
  const resolvedExperienceFile=clean(experienceFile)||clean(runtime.sources?.experience)||'.vibe2/experience.json';
  const resolvedKnowledgeFile=clean(knowledgeFile)||clean(runtime.sources?.gameStudyKnowledge)||clean(runtime.gameStudy?.knowledgeState)||'.vibe2/game-study-knowledge.json';
  const resolvedRuntimeEvidenceRoot=clean(runtimeEvidenceRoot)||clean(runtime.gameStudy?.runtimeEvidenceRoot)||'.vibe2/runtime-evidence';
  const handoff=generateVibe2Handoff({runtimeFile,queueFile:resolvedQueueFile,controlFile:resolvedControlFile,experienceFile:resolvedExperienceFile});
  const machineHandoff={used:true,kind:handoff.kind,sourceOfTruth:handoff.sourceOfTruth,consistency:handoff.consistency,currentPersistentMax:handoff.parallelism.currentPersistentMax,lastDecision:handoff.parallelism.lastDecision};
  if(handoff.consistency?.ok!==true)return{planned:false,reason:'MACHINE_STATE_INCONSISTENT',machineHandoff,effectivePlannerMax:0,learningContext:null};
  const effectivePlannerMax=Math.min(parallelLimit(maxConcurrentTasks),parallelLimit(handoff.parallelism.currentPersistentMax));
  const recombinationMemory=readJson(recombinationFile||'',{version:1,recipes:[]});
  const result=planVibe2AutonomousTasks({status:readJson(statusFile,{}),catalog:readJson(catalogFile,{}),queue:readJson(resolvedQueueFile,{tasks:[]}),repoRoot,maxConcurrentTasks:effectivePlannerMax,workPackagePolicy:runtime.workPackages||{},recombinationMemory});
  if(result.planned)writeJson(resolvedQueueFile,result.queue);
  const learningContext=runGameStudyPlannerContext({
    queueFile:resolvedQueueFile,
    knowledgeFile:resolvedKnowledgeFile,
    experienceFile:resolvedExperienceFile,
    runtimeEvidenceRoot:resolvedRuntimeEvidenceRoot
  });
  return{...result,machineHandoff,effectivePlannerMax,learningContext:Object.freeze({
    changed:learningContext.changed===true,
    enrichedCount:Number(learningContext.enrichedCount||0),
    materialCollectedCount:Number(learningContext.materialCollectedCount||0),
    multiSourceCollectedCount:Number(learningContext.multiSourceCollectedCount||0),
    authorityExpanded:false
  })};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=parseArgs(),result=runVibe2AutoPlanner({statusFile:clean(args.status)||'.vibe2/main-company-status.json',catalogFile:clean(args.catalog)||'.vibe2/main-game-catalog.json',queueFile:clean(args.queue),runtimeFile:clean(args.runtime)||'vibe2-runtime.json',controlFile:clean(args.control),experienceFile:clean(args.experience),knowledgeFile:clean(args.knowledge),runtimeEvidenceRoot:clean(args['runtime-evidence-root']),recombinationFile:clean(args.recombination),repoRoot:clean(args.root)||process.cwd(),maxConcurrentTasks:clean(args.max)||process.env.VIBE2_MAX_CONCURRENT_GAME_TASKS||DEFAULT_MAX_CONCURRENT_TASKS});
  console.log(`VIBE2_MACHINE_HANDOFF=${result.machineHandoff?.used?'USED':'NOT_USED'}`);
  console.log(`VIBE2_MACHINE_STATE=${result.machineHandoff?.consistency?.ok?'CONSISTENT':'INCONSISTENT'}`);
  console.log(`VIBE2_PLANNER_PERSISTENT_MAX=${result.machineHandoff?.currentPersistentMax||0}`);
  console.log(`VIBE2_PLANNER_EFFECTIVE_MAX=${result.effectivePlannerMax||0}`);
  console.log(`VIBE2_AUTO_PLAN=${result.planned?'YES':'NO'}`);
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
  console.log(`VIBE2_PLANNER_LEARNING_CONTEXT=${result.learningContext?.changed?'APPLIED':'NO_CHANGE'}`);
  console.log(`VIBE2_PLANNER_GAME_STUDY_MATERIALS=${result.learningContext?.materialCollectedCount||0}`);
  console.log(`VIBE2_PLANNER_MULTI_SOURCE_MATERIALS=${result.learningContext?.multiSourceCollectedCount||0}`);
  console.log('VIBE2_PLANNER_LEARNING_AUTHORITY_EXPANDED=NO');
}
