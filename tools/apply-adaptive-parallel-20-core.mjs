import fs from 'node:fs';

function read(file){return fs.readFileSync(file,'utf8');}
function write(file,text){fs.writeFileSync(file,text,'utf8');}
function replaceOnce(text,from,to,label){
  if(text.includes(to)) return text;
  if(!text.includes(from)) throw new Error(`${label}_ANCHOR_MISSING`);
  return text.replace(from,to);
}

// 1) Reusable workflow: real worker fan-out 20.
{
  const file='.github/workflows/vibe2-continuous-core.yml';
  let text=read(file);
  text=replaceOnce(text,"  VIBE2_MAX_CONCURRENT_GAME_TASKS: '4'","  VIBE2_MAX_CONCURRENT_GAME_TASKS: '20'",'CORE_ENV_MAX');
  text=replaceOnce(text,'      max-parallel: 4','      max-parallel: 20','CORE_WORKER_MAX_PARALLEL');
  if(!text.includes('node --test qa/vibe2-parallelism-20-contract.test.mjs')){
    text=replaceOnce(text,
      '          node --test qa/vibe2-queue-control.test.mjs\n          node --test qa/vibe2-incremental-qa.test.mjs',
      '          node --test qa/vibe2-queue-control.test.mjs\n          node --test qa/vibe2-auto-planner.test.mjs\n          node --test qa/vibe2-parallelism-20-contract.test.mjs\n          node --test qa/vibe2-incremental-qa.test.mjs',
      'CORE_PREFLIGHT_TESTS');
  }
  write(file,text);
}

// 2) Queue: hard cap/default 20, adaptive 20->16->12->8->4, safe same-root file parallelism.
{
  const file='assets/vibe-continuous-queue.js';
  let text=read(file);
  text=replaceOnce(text,'export const DEFAULT_MAX_CONCURRENT_TASKS = 4;','export const DEFAULT_MAX_CONCURRENT_TASKS = 20;','QUEUE_DEFAULT_MAX');
  text=replaceOnce(text,
    'const BASE_SHARD_SLOTS = freeze({ unity: 1, web: 1, verification: 1, support: 1 });',
    'const BASE_SHARD_SLOTS = freeze({ unity: 3, web: 7, verification: 5, support: 5 });',
    'QUEUE_BASE_SHARDS');
  text=replaceOnce(text,
    'const configuredMax = Array.isArray(seed) ? DEFAULT_MAX_CONCURRENT_TASKS : clampInt(seed?.maxConcurrentTasks || DEFAULT_MAX_CONCURRENT_TASKS, 1, 8);',
    'const configuredMax = Array.isArray(seed) ? DEFAULT_MAX_CONCURRENT_TASKS : clampInt(seed?.maxConcurrentTasks || DEFAULT_MAX_CONCURRENT_TASKS, 1, 20);',
    'QUEUE_CONFIGURED_MAX');

  const oldLock=/function lockConflict\(a, b\) \{[\s\S]*?\n\}\nfunction isReleaseUnity/;
  const newLock=`function lockConflict(a, b) {\n  const aRoot = posix(a.sourceRoot), bRoot = posix(b.sourceRoot);\n  const aFiles = fileLocks(a), bFiles = fileLocks(b);\n  if (aRoot && bRoot && aRoot === bRoot) {\n    // Same game/source root may parallelize only when both tasks declare concrete, disjoint responsibility files.\n    if (!aFiles.size || !bFiles.size) return 'source-root-conflict';\n    for (const file of aFiles) if (bFiles.has(file)) return 'responsible-file-conflict';\n    return null;\n  }\n  for (const file of aFiles) if (bFiles.has(file)) return 'responsible-file-conflict';\n  return null;\n}\nfunction isReleaseUnity`;
  if(!oldLock.test(text)) throw new Error('QUEUE_LOCK_CONFLICT_BLOCK_MISSING');
  text=text.replace(oldLock,newLock);

  const oldDynamic=/function dynamicConcurrency\(queue, requested = queue\.maxConcurrentTasks\) \{[\s\S]*?\n\}\n\nexport function selectVibeQueueBatch/;
  const newDynamic=`function dynamicConcurrency(queue, requested = queue.maxConcurrentTasks) {\n  const hardMax = clampInt(requested || queue.maxConcurrentTasks, 1, 20);\n  const running = queue.tasks.filter((task) => task.status === 'running');\n  const awaitingQa = running.filter((task) => /awaiting.*qa|qa.*awaiting/i.test(clean(task.blocker))).length;\n  const recentFailures = queue.tasks.filter((task) => task.lastOutcome === 'FAIL' && task.retries > 0).length;\n  let limit = hardMax;\n  const applyPressure = (count) => {\n    if (count >= 8) limit = Math.min(limit, 4);\n    else if (count >= 6) limit = Math.min(limit, 8);\n    else if (count >= 4) limit = Math.min(limit, 12);\n    else if (count >= 2) limit = Math.min(limit, 16);\n  };\n  applyPressure(awaitingQa);\n  applyPressure(recentFailures);\n  return Math.max(1, limit);\n}\n\nexport function selectVibeQueueBatch`;
  if(!oldDynamic.test(text)) throw new Error('QUEUE_DYNAMIC_CONCURRENCY_BLOCK_MISSING');
  text=text.replace(oldDynamic,newDynamic);
  write(file,text);
}

// 3) Planner: clamp 20 and allow multiple non-conflicting tasks from one source root.
{
  const file='tools/vibe2-auto-planner.mjs';
  let text=read(file);
  text=replaceOnce(text,
    'function parallelLimit(value){return Math.max(1,Math.min(8,Math.floor(Number(value)||DEFAULT_MAX_CONCURRENT_TASKS)));}',
    'function parallelLimit(value){return Math.max(1,Math.min(20,Math.floor(Number(value)||DEFAULT_MAX_CONCURRENT_TASKS)));}',
    'PLANNER_PARALLEL_LIMIT');

  const marker="function activeSourceRoots(queue){return new Set(activeTasks(queue).map(item=>posix(item.sourceRoot)).filter(Boolean));}";
  const helper=`${marker}\nfunction sameRootResponsibilityConflict(a={},b={}){const aRoot=posix(a.sourceRoot),bRoot=posix(b.sourceRoot);if(!aRoot||!bRoot||aRoot!==bRoot)return false;const aFiles=new Set((a.responsibleFiles||[]).map(posix).filter(Boolean)),bFiles=new Set((b.responsibleFiles||[]).map(posix).filter(Boolean));if(!aFiles.size||!bFiles.size)return true;for(const file of aFiles)if(bFiles.has(file))return true;return false;}\nfunction plannerConflict(queue,task){return activeTasks(queue).some(item=>sameRootResponsibilityConflict(item,task));}`;
  if(!text.includes('function sameRootResponsibilityConflict')){
    if(!text.includes(marker)) throw new Error('PLANNER_HELPER_ANCHOR_MISSING');
    text=text.replace(marker,helper);
  }

  const fn=/export function planVibe2AutonomousTasks\(\{status=\{\},catalog=\{\},queue:queueInput=\{\},repoRoot=process\.cwd\(\),maxConcurrentTasks=DEFAULT_MAX_CONCURRENT_TASKS\}=\{\}\)\{[\s\S]*?\}\nexport function planVibe2AutonomousTask/;
  const replacement=`export function planVibe2AutonomousTasks({status={},catalog={},queue:queueInput={},repoRoot=process.cwd(),maxConcurrentTasks=DEFAULT_MAX_CONCURRENT_TASKS}={}){\n  let queue=createVibeContinuousQueue({...(queueInput||{}),maxConcurrentTasks:parallelLimit(maxConcurrentTasks)});\n  const active=activeTasks(queue);\n  if(active.some(item=>item.ownerDirective))return{planned:false,count:0,reason:'OWNER_DIRECTIVE_ACTIVE',queue,tasks:[]};\n  const capacity=Math.max(0,queue.maxConcurrentTasks-active.length);\n  if(!capacity)return{planned:false,count:0,reason:'PARALLEL_QUEUE_AT_CAPACITY',queue,tasks:[]};\n  const allProjects=collectProjects(status,catalog,repoRoot),blockedTier1=allProjects.filter(project=>project.releaseState==='release-confirmed'&&project.engine==='unity'&&project.developmentBaseline?.ready!==true),projects=allProjects.filter(isAutonomousProductionTarget).sort(projectSort);\n  if(!projects.length)return{planned:false,count:0,reason:blockedTier1.length?'DEVELOPMENT_BASELINE_REQUIRED':'NO_CONFIRMED_PRODUCTION_PROJECT',queue,tasks:[],blockedTier1GameIds:blockedTier1.map(p=>p.gameId)};\n  let unityReleaseFocusTaken=releaseUnityFocusBusy(queue);\n  const planned=[];\n  for(const project of projects){\n    if(planned.length>=capacity)break;\n    if(project.engine==='unity'&&project.releaseState==='release-confirmed'&&unityReleaseFocusTaken)continue;\n    let localAttempts=0;\n    while(planned.length<capacity&&localAttempts<20){\n      localAttempts+=1;\n      const next=findSafeTask(project,repoRoot,queue);\n      if(!next)break;\n      if(plannerConflict(queue,next))break;\n      queue=createVibeContinuousQueue({tasks:[...queue.tasks,next],maxConcurrentTasks:queue.maxConcurrentTasks});\n      planned.push(next);\n      if(project.engine==='unity'&&project.releaseState==='release-confirmed'){unityReleaseFocusTaken=true;break;}\n    }\n  }\n  if(!planned.length)return{planned:false,count:0,reason:active.length?'NO_INDEPENDENT_SAFE_AUTONOMOUS_TASK':'NO_SAFE_AUTONOMOUS_TASK',queue,tasks:[],projectId:projects[0]?.gameId||null,blockedTier1GameIds:blockedTier1.map(p=>p.gameId)};\n  return{planned:true,count:planned.length,reason:'SAFE_PARALLEL_TASKS_PLANNED',queue,tasks:planned,task:planned[0],projectId:planned[0].gameId,projectReleaseState:planned[0].releaseState,projectEngine:planned[0].target,blockedTier1GameIds:blockedTier1.map(p=>p.gameId),projectPriorityPolicy:'OWNER_WEBGAME_FIRST_THEN_CONFIRMED_WEB_THEN_ROBLOX_THEN_RELEASE_UNITY'};\n}\nexport function planVibe2AutonomousTask`;
  if(!fn.test(text)) throw new Error('PLANNER_MAIN_FUNCTION_BLOCK_MISSING');
  text=text.replace(fn,replacement);
  write(file,text);
}

// 4) Queue tests: new same-root rule, adaptive ladder, real 20-slot fan-out.
{
  const file='qa/vibe2-queue-control.test.mjs';
  let text=read(file);
  text=text.replace(/test\('same source root remains exclusive even when files differ',[\s\S]*?\n\}\);\n/,
`test('same source root may fan out when responsibility files are concrete and disjoint', () => {\n  let queue=createVibeContinuousQueue({maxConcurrentTasks:20,tasks:[]});\n  queue=add(queue,'a','same','web',{responsibleFiles:['a.js']});\n  queue=add(queue,'b','same','web',{responsibleFiles:['b.js']});\n  const reserved=reserveVibeTaskBatch(queue,{maxConcurrentTasks:20});\n  assert.equal(reserved.tasks.length,2);\n});\n\ntest('same source root remains exclusive when responsibility files overlap or are unspecified', () => {\n  let queue=createVibeContinuousQueue({maxConcurrentTasks:20,tasks:[]});\n  queue=add(queue,'a','same','web',{responsibleFiles:['shared.js']});\n  queue=add(queue,'b','same','web',{responsibleFiles:['shared.js']});\n  queue=add(queue,'c','same','web');\n  const reserved=reserveVibeTaskBatch(queue,{maxConcurrentTasks:20});\n  assert.equal(reserved.tasks.length,1);\n  assert.ok(reserved.selection.deferredConflicts.some(row=>row.reason==='responsible-file-conflict'||row.reason==='source-root-conflict'));\n});\n`);
  text=text.replace(/test\('dynamic backpressure reduces concurrency when QA backlog grows',[\s\S]*?\n\}\);\n/,
`test('adaptive backpressure steps 20 down through 16 12 8 4 as pressure rises', () => {\n  const expected=new Map([[0,20],[2,16],[4,12],[6,8],[8,4]]);\n  for(const [count,limit] of expected){\n    const tasks=Array.from({length:count},(_,i)=>({id:\`run-\${i}\`,gameId:\`g-\${i}\`,target:'web',sourceRoot:\`web-games/g-\${i}\`,goal:'run',status:'running',blocker:'candidate-awaiting-qa-and-deployment'}));\n    const queue=createVibeContinuousQueue({maxConcurrentTasks:20,tasks});\n    const batch=selectVibeQueueBatch(queue,{maxConcurrentTasks:20});\n    assert.equal(batch.effectiveMaxConcurrentTasks,limit);\n  }\n});\n`);
  if(!text.includes("twenty independent tasks can fill all 20 slots")){
    text += `\ntest('twenty independent tasks can fill all 20 slots', () => {\n  let queue=createVibeContinuousQueue({maxConcurrentTasks:20,tasks:[]});\n  for(let i=0;i<20;i++) queue=add(queue,\`t-\${i}\`,\`g-\${i}\`,'web',{responsibleFiles:[\`f-\${i}.js\`]});\n  const reserved=reserveVibeTaskBatch(queue,{maxConcurrentTasks:20});\n  assert.equal(reserved.tasks.length,20);\n  assert.equal(reserved.selection.effectiveMaxConcurrentTasks,20);\n});\n`;
  }
  write(file,text);
}

// 5) Cross-file contract test on core branch.
{
  const file='qa/vibe2-parallelism-20-contract.test.mjs';
  const text=`import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport { createVibeContinuousQueue, selectVibeQueueBatch, DEFAULT_MAX_CONCURRENT_TASKS } from '../assets/vibe-continuous-queue.js';\n\nconst read=p=>fs.readFileSync(p,'utf8');\n\ntest('core parallelism contract is uniformly 20',()=>{\n  const workflow=read('.github/workflows/vibe2-continuous-core.yml');\n  const planner=read('tools/vibe2-auto-planner.mjs');\n  assert.equal(DEFAULT_MAX_CONCURRENT_TASKS,20);\n  assert.match(workflow,/VIBE2_MAX_CONCURRENT_GAME_TASKS: '20'/);\n  assert.match(workflow,/max-parallel: 20/);\n  assert.match(planner,/Math\\.min\\(20,/);\n  const q=createVibeContinuousQueue({maxConcurrentTasks:999,tasks:[]});\n  assert.equal(q.maxConcurrentTasks,20);\n});\n\ntest('20 slot queue uses adaptive backpressure instead of fixed throttling',()=>{\n  const base=createVibeContinuousQueue({maxConcurrentTasks:20,tasks:[]});\n  assert.equal(selectVibeQueueBatch(base,{maxConcurrentTasks:20}).effectiveMaxConcurrentTasks,20);\n  const pressured=createVibeContinuousQueue({maxConcurrentTasks:20,tasks:Array.from({length:8},(_,i)=>({id:\`q\${i}\`,gameId:\`q\${i}\`,target:'web',sourceRoot:\`web-games/q\${i}\`,goal:'q',status:'running',blocker:'candidate-awaiting-qa-and-deployment'}))});\n  assert.equal(selectVibeQueueBatch(pressured,{maxConcurrentTasks:20}).effectiveMaxConcurrentTasks,4);\n});\n`;
  write(file,text);
}

console.log('ADAPTIVE_PARALLEL_20_CORE_APPLIED=YES');
