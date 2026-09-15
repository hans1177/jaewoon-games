import fs from 'node:fs';

const replaceOnce=(text,from,to,label)=>{
  if(!text.includes(from)) throw new Error(`${label}_MARKER_NOT_FOUND`);
  return text.replace(from,to);
};

// Queue wiring: persistent adaptive cap is read at reserve time and updated exactly once at fan-in.
const queuePath='tools/vibe2-queue-control.mjs';
let queue=fs.readFileSync(queuePath,'utf8');
queue=replaceOnce(queue,
"} from '../assets/vibe-continuous-queue.js';\n",
"} from '../assets/vibe-continuous-queue.js';\nimport { computeParallelismTelemetry } from './vibe2-parallelism-telemetry.mjs';\nimport { adaptiveRequestedMax, createParallelismControl, decideAdaptiveBackpressure } from './vibe2-adaptive-backpressure.mjs';\n",
'QUEUE_IMPORTS');
queue=replaceOnce(queue,
"function queueFileFrom(args) { return clean(args.queue) || '.vibe2/queue.json'; }\n",
"function queueFileFrom(args) { return clean(args.queue) || '.vibe2/queue.json'; }\nfunction controlFileFrom(args) { return clean(args.control) || '.vibe2/parallelism-control.json'; }\nfunction readParallelismControl(args) { return createParallelismControl(readJson(controlFileFrom(args), {})); }\n",
'QUEUE_CONTROL_HELPERS');
queue=replaceOnce(queue,
"    const reserved = reserveNextVibeTask(queue, { maxConcurrentTasks: optionalMaxConcurrent(args.max) });\n",
"    const configuredMaxConcurrentTasks=optionalMaxConcurrent(args.max) ?? queue.maxConcurrentTasks;\n    const adaptiveControl=readParallelismControl(args);\n    const adaptiveMaxConcurrentTasks=adaptiveRequestedMax(adaptiveControl, configuredMaxConcurrentTasks);\n    const reserved = reserveNextVibeTask(queue, { maxConcurrentTasks: adaptiveMaxConcurrentTasks });\n",
'QUEUE_RESERVE_ADAPTIVE');
queue=replaceOnce(queue,
"    result = { command, ...reserved, summary: summarizeVibeContinuousQueue(reserved.queue) };\n  } else if (command === 'reserve-batch') {\n    const reserved = reserveVibeTaskBatch(queue, { maxConcurrentTasks: optionalMaxConcurrent(args.max) });\n",
"    result = { command, configuredMaxConcurrentTasks, adaptiveMaxConcurrentTasks, adaptiveControl, ...reserved, summary: summarizeVibeContinuousQueue(reserved.queue) };\n  } else if (command === 'reserve-batch') {\n    const configuredMaxConcurrentTasks=optionalMaxConcurrent(args.max) ?? queue.maxConcurrentTasks;\n    const adaptiveControl=readParallelismControl(args);\n    const adaptiveMaxConcurrentTasks=adaptiveRequestedMax(adaptiveControl, configuredMaxConcurrentTasks);\n    const reserved = reserveVibeTaskBatch(queue, { maxConcurrentTasks: adaptiveMaxConcurrentTasks });\n",
'QUEUE_BATCH_ADAPTIVE');
queue=replaceOnce(queue,
"      const requestedMaxConcurrentTasks=reserved.selection?.requestedMaxConcurrentTasks ?? optionalMaxConcurrent(args.max) ?? queue.maxConcurrentTasks;\n      const persistentMaxConcurrentTasks=reserved.selection?.persistentMaxConcurrentTasks ?? queue.maxConcurrentTasks;\n",
"      const requestedMaxConcurrentTasks=reserved.selection?.requestedMaxConcurrentTasks ?? adaptiveMaxConcurrentTasks;\n      const persistentMaxConcurrentTasks=reserved.selection?.persistentMaxConcurrentTasks ?? queue.maxConcurrentTasks;\n",
'QUEUE_BATCH_REQUESTED');
queue=replaceOnce(queue,
"          persistentMaxConcurrentTasks,\n          requestedMaxConcurrentTasks,\n",
"          persistentMaxConcurrentTasks,\n          configuredMaxConcurrentTasks,\n          adaptiveMaxConcurrentTasks,\n          requestedMaxConcurrentTasks,\n",
'QUEUE_BATCH_METADATA');
queue=replaceOnce(queue,
"    result = { command, ...reserved, summary: summarizeVibeContinuousQueue(reserved.queue) };\n  } else if (command === 'await') {\n",
"    result = { command, configuredMaxConcurrentTasks, adaptiveMaxConcurrentTasks, adaptiveControl, ...reserved, summary: summarizeVibeContinuousQueue(reserved.queue) };\n  } else if (command === 'await') {\n",
'QUEUE_BATCH_RESULT');
queue=replaceOnce(queue,
`  } else if (command === 'fan-in') {
    const input = clean(args.input);
    if (!input) throw new Error('--input result json required');
    const payload = readJson(input, []);
    const rows = Array.isArray(payload) ? payload : Array.isArray(payload.results) ? payload.results : [];
    const merged = applyVibeFanInResults(queue, rows);
    queue = merged.queue;
    writeJson(file, queue);
    result = { command, updated: merged.applied.length > 0, ...merged };
`,
`  } else if (command === 'fan-in') {
    const input = clean(args.input);
    if (!input) throw new Error('--input result json required');
    const payload = readJson(input, []);
    const rows = Array.isArray(payload) ? payload : Array.isArray(payload.results) ? payload.results : [];
    const currentControl=readParallelismControl(args);
    const firstMetrics=rows.find((row)=>row?.metrics)?.metrics || {};
    const taskCount=new Set(rows.map((row)=>clean(row?.taskId)).filter(Boolean)).size;
    const telemetry=computeParallelismTelemetry({
      results:rows,
      requestedMax:firstMetrics.requestedMax || currentControl.currentMax,
      effectiveMax:firstMetrics.effectiveMax || currentControl.currentMax,
      taskCount
    });
    const nextControl=decideAdaptiveBackpressure(currentControl, telemetry);
    const merged = applyVibeFanInResults(queue, rows);
    queue = merged.queue;
    writeJson(file, queue);
    writeJson(controlFileFrom(args), nextControl);
    result = { command, updated: merged.applied.length > 0, telemetry, adaptiveControl:nextControl, previousAdaptiveControl:currentControl, ...merged };
`,
'QUEUE_FAN_IN_ADAPTIVE');
queue=replaceOnce(queue,
"  console.log(`VIBE2_QUEUE_CONTINUE=${result.summary?.continueRequired ? 'YES' : 'NO'}`);\n",
"  console.log(`VIBE2_QUEUE_CONTINUE=${result.summary?.continueRequired ? 'YES' : 'NO'}`);\n  if (result.adaptiveControl) {\n    console.log(`VIBE2_ADAPTIVE_MAX=${result.adaptiveControl.currentMax}`);\n    console.log(`VIBE2_ADAPTIVE_DECISION=${result.adaptiveControl.lastDecision}`);\n    console.log(`VIBE2_ADAPTIVE_REASON=${result.adaptiveControl.lastReason}`);\n  }\n",
'QUEUE_CLI_ADAPTIVE');
fs.writeFileSync(queuePath,queue,'utf8');

// Controller tests live in the already-mandatory telemetry suite.
const telemetryTestPath='qa/vibe2-parallelism-telemetry.test.mjs';
let tests=fs.readFileSync(telemetryTestPath,'utf8');
tests=replaceOnce(tests,
"import { computeParallelismTelemetry } from '../tools/vibe2-parallelism-telemetry.mjs';\n",
"import { computeParallelismTelemetry } from '../tools/vibe2-parallelism-telemetry.mjs';\nimport { adaptiveRequestedMax, createParallelismControl, decideAdaptiveBackpressure } from '../tools/vibe2-adaptive-backpressure.mjs';\nimport { runQueueCommand } from '../tools/vibe2-queue-control.mjs';\nimport fs from 'node:fs';\nimport os from 'node:os';\nimport path from 'node:path';\n",
'TEST_IMPORTS');
tests += `

test('adaptive controller steps down exactly once under saturated runner pressure',()=>{
  const telemetry=computeParallelismTelemetry({results:Array.from({length:20},(_,i)=>row(i,{start:1000+i*5000,end:4000+i*5000})),requestedMax:20,effectiveMax:20,taskCount:20});
  const next=decideAdaptiveBackpressure(createParallelismControl({currentMax:20}),telemetry,{now:'2026-09-15T10:00:00.000Z'});
  assert.equal(next.currentMax,16);
  assert.equal(next.lastDecision,'DOWN');
  assert.match(next.lastReason,/RUNNER_CAPACITY/);
});

test('run-local queue backpressure prevents a second persistent downshift',()=>{
  const telemetry=computeParallelismTelemetry({results:Array.from({length:16},(_,i)=>row(i,{start:1000+i*5000,end:4000+i*5000})),requestedMax:16,effectiveMax:16,taskCount:16});
  const next=decideAdaptiveBackpressure(createParallelismControl({currentMax:20}),telemetry,{now:'2026-09-15T10:01:00.000Z'});
  assert.equal(next.currentMax,20);
  assert.equal(next.lastDecision,'HOLD');
  assert.equal(next.lastReason,'RUN_LOCAL_BACKPRESSURE_ACTIVE');
});

test('low workload never teaches the controller to reduce capacity',()=>{
  const telemetry=computeParallelismTelemetry({results:Array.from({length:5},(_,i)=>row(i,{start:1000+i*5000,end:4000+i*5000})),requestedMax:20,effectiveMax:20,taskCount:5});
  const next=decideAdaptiveBackpressure(createParallelismControl({currentMax:20}),telemetry,{now:'2026-09-15T10:02:00.000Z'});
  assert.equal(next.currentMax,20);
  assert.equal(next.lastReason,'LOW_LOAD');
});

test('two healthy saturated runs restore one adaptive step',()=>{
  const healthy=computeParallelismTelemetry({results:Array.from({length:12},(_,i)=>row(i,{start:1000+i*5,end:5000+i*5})),requestedMax:12,effectiveMax:12,taskCount:12});
  const first=decideAdaptiveBackpressure(createParallelismControl({currentMax:12}),healthy,{now:'2026-09-15T10:03:00.000Z'});
  assert.equal(first.currentMax,12);
  assert.equal(first.healthyStreak,1);
  const second=decideAdaptiveBackpressure(first,healthy,{now:'2026-09-15T10:04:00.000Z'});
  assert.equal(second.currentMax,16);
  assert.equal(second.lastDecision,'UP');
});

test('queue command reads adaptive cap and fan-in persists exactly one next-run step',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-adaptive-'));
  const queueFile=path.join(dir,'queue.json');
  const controlFile=path.join(dir,'control.json');
  const batchFile=path.join(dir,'batch.json');
  const fanFile=path.join(dir,'fan.json');
  const tasks=Array.from({length:20},(_,i)=>({id:\`q-\${i}\`,gameId:\`g-\${i}\`,target:'web',sourceRoot:\`web-games/g-\${i}\`,goal:'work',status:'queued',responsibleFiles:[\`f-\${i}.js\`]}));
  fs.writeFileSync(queueFile,JSON.stringify({maxConcurrentTasks:20,tasks},null,2));
  fs.writeFileSync(controlFile,JSON.stringify({currentMax:12},null,2));
  const reserved=runQueueCommand({command:'reserve-batch',queue:queueFile,control:controlFile,max:'20',output:batchFile});
  assert.equal(reserved.tasks.length,12);
  assert.equal(reserved.adaptiveMaxConcurrentTasks,12);
  const batch=JSON.parse(fs.readFileSync(batchFile,'utf8'));
  assert.equal(batch.scheduler.configuredMaxConcurrentTasks,20);
  assert.equal(batch.scheduler.adaptiveMaxConcurrentTasks,12);
  const results=reserved.tasks.map((task,i)=>({taskId:task.id,variant:'primary',outcome:'FAIL',blocker:'source-candidate-generation-failed',metrics:{requestedMax:12,effectiveMax:12,reservedAt:1000,workerStartedAt:1000+i*5000,workerFinishedAt:4000+i*5000,checkoutMs:100,candidateMs:1000,qaMs:200,workerTotalMs:3000,ollamaCacheHit:true}}));
  fs.writeFileSync(fanFile,JSON.stringify({results},null,2));
  const merged=runQueueCommand({command:'fan-in',queue:queueFile,control:controlFile,input:fanFile});
  assert.equal(merged.previousAdaptiveControl.currentMax,12);
  assert.equal(merged.adaptiveControl.currentMax,8);
  assert.equal(JSON.parse(fs.readFileSync(controlFile,'utf8')).currentMax,8);
  assert.equal(adaptiveRequestedMax(merged.adaptiveControl,20),8);
});
`;
fs.writeFileSync(telemetryTestPath,tests,'utf8');

// Workflow persists the adaptive state beside the queue and validates the controller in preflight/full fan-in regression.
const workflowPath='.github/workflows/vibe2-continuous-core.yml';
let workflow=fs.readFileSync(workflowPath,'utf8');
workflow=workflow.replaceAll(
"          node --check tools/vibe2-parallelism-telemetry.mjs\n",
"          node --check tools/vibe2-parallelism-telemetry.mjs\n          node --check tools/vibe2-adaptive-backpressure.mjs\n");
workflow=replaceOnce(workflow,
"          node --test qa/vibe2-experience-control.test.mjs\n\n          if git diff --quiet -- .vibe2/queue.json; then\n            echo 'VIBE2_FAN_IN_QUEUE_WRITE=NO'\n          else\n            git add .vibe2/queue.json\n",
"          node --test qa/vibe2-experience-control.test.mjs\n\n          if git diff --quiet -- .vibe2/queue.json .vibe2/parallelism-control.json; then\n            echo 'VIBE2_FAN_IN_QUEUE_WRITE=NO'\n          else\n            git add .vibe2/queue.json .vibe2/parallelism-control.json\n",
'WORKFLOW_PERSIST_CONTROL');
fs.writeFileSync(workflowPath,workflow,'utf8');

console.log('VIBE2_ADAPTIVE_V2_PATCH=PASS');
