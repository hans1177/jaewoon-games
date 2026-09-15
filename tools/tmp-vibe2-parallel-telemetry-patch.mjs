import fs from 'node:fs';

const replaceOnce=(text,old,next,label)=>{
  if(!text.includes(old))throw new Error(`${label}_MARKER_NOT_FOUND`);
  return text.replace(old,next);
};
const gh=s=>'$'+String.fromCharCode(123,123)+' '+s+' '+String.fromCharCode(125,125);

const queuePath='tools/vibe2-queue-control.mjs';
let queue=fs.readFileSync(queuePath,'utf8');
const oldOut="    if (clean(args.output)) writeJson(clean(args.output), { version:1, createdAt:new Date().toISOString(), matrix:reserved.matrix });";
const newOut=`    if (clean(args.output)) {
      const createdAt=new Date().toISOString();
      const requestedMaxConcurrentTasks=maxConcurrent(args.max);
      writeJson(clean(args.output), {
        version:2, createdAt, matrix:reserved.matrix,
        scheduler:{
          requestedMaxConcurrentTasks,
          effectiveMaxConcurrentTasks:reserved.selection?.effectiveMaxConcurrentTasks ?? requestedMaxConcurrentTasks,
          freeSlotsBeforeReservation:reserved.selection?.freeSlots ?? 0,
          runningBeforeReservation:reserved.selection?.running?.length ?? 0,
          blockedCount:reserved.selection?.blocked?.length ?? 0,
          conflictCount:reserved.selection?.deferredConflicts?.length ?? 0,
          workStealingUsed:reserved.selection?.workStealingUsed === true,
          shardUse:reserved.selection?.shardUse || {},
          stopReason:reserved.selection?.stopReason || null
        }
      });
    }`;
queue=replaceOnce(queue,oldOut,newOut,'QUEUE_BATCH_TELEMETRY');
fs.writeFileSync(queuePath,queue,'utf8');

const wfPath='.github/workflows/vibe2-continuous-core.yml';
let wf=fs.readFileSync(wfPath,'utf8');
const workerAt=wf.indexOf('\n  worker:\n');
const fanAt=wf.indexOf('\n  fan_in:\n');
if(workerAt<0||fanAt<0||fanAt<=workerAt)throw new Error('WORKFLOW_SECTIONS_NOT_FOUND');
let before=wf.slice(0,workerAt),worker=wf.slice(workerAt,fanAt),fan=wf.slice(fanAt);

before=replaceOnce(before,
  `      task_count: ${gh('steps.batch.outputs.task_count')}\n`,
  `      task_count: ${gh('steps.batch.outputs.task_count')}\n      reserved_at: ${gh('steps.batch.outputs.reserved_at')}\n      effective_max: ${gh('steps.batch.outputs.effective_max')}\n`,
  'RESERVE_OUTPUTS');
before=replaceOnce(before,
  "            include.push({taskId:row.taskId,shard:row.shard,variant:'primary'});",
  "            include.push({taskId:row.taskId,shard:row.shard,variant:'primary',reservedAt:batch.createdAt,requestedMax:Number(batch.scheduler?.requestedMaxConcurrentTasks||20),effectiveMax:Number(batch.scheduler?.effectiveMaxConcurrentTasks||20)});",
  'PRIMARY_MATRIX');
before=replaceOnce(before,
  "            if(Number(row.speculativeVariants||1)>1)include.push({taskId:row.taskId,shard:row.shard,variant:'speculative'});",
  "            if(Number(row.speculativeVariants||1)>1)include.push({taskId:row.taskId,shard:row.shard,variant:'speculative',reservedAt:batch.createdAt,requestedMax:Number(batch.scheduler?.requestedMaxConcurrentTasks||20),effectiveMax:Number(batch.scheduler?.effectiveMaxConcurrentTasks||20)});",
  'SPEC_MATRIX');
before=replaceOnce(before,
  "          fs.appendFileSync(out,`task_count=${(batch.matrix||[]).length}\\n`);",
  "          fs.appendFileSync(out,`task_count=${(batch.matrix||[]).length}\\n`);\n          fs.appendFileSync(out,`reserved_at=${batch.createdAt||''}\\n`);\n          fs.appendFileSync(out,`effective_max=${Number(batch.scheduler?.effectiveMaxConcurrentTasks||20)}\\n`);",
  'RESERVE_NODE_OUTPUT');
before=replaceOnce(before,
  "          node --check tools/vibe2-incremental-qa.mjs\n",
  "          node --check tools/vibe2-incremental-qa.mjs\n          node --check tools/vibe2-parallelism-telemetry.mjs\n",
  'PREFLIGHT_CHECK');
before=replaceOnce(before,
  "          node --test qa/vibe2-incremental-qa.test.mjs\n",
  "          node --test qa/vibe2-incremental-qa.test.mjs\n          node --test qa/vibe2-parallelism-telemetry.test.mjs\n",
  'PREFLIGHT_TEST');

worker=replaceOnce(worker,
  "    steps:\n      - name: Checkout Vibe2 control line\n",
  "    steps:\n      - name: Mark worker start\n        shell: bash\n        run: echo \"$(date +%s%3N)\" > /tmp/vibe2-worker-start-ms\n\n      - name: Checkout Vibe2 control line\n",
  'WORKER_START');
worker=replaceOnce(worker,
  "          fetch-depth: 1\n\n      - uses: actions/setup-node@v4\n",
  "          fetch-depth: 1\n\n      - name: Measure worker checkout\n        id: checkout_metrics\n        shell: bash\n        run: |\n          now=\"$(date +%s%3N)\"\n          start=\"$(cat /tmp/vibe2-worker-start-ms)\"\n          echo \"ms=$((now-start))\" >> \"$GITHUB_OUTPUT\"\n\n      - uses: actions/setup-node@v4\n",
  'CHECKOUT_METRICS');
worker=replaceOnce(worker,
  "            echo 'VIBE2_OLLAMA_RUNTIME_SOURCE=CACHE'\n",
  "            echo 'VIBE2_OLLAMA_RUNTIME_SOURCE=CACHE'\n            echo 'source=CACHE' >> \"$GITHUB_OUTPUT\"\n",
  'CACHE_SOURCE');
worker=replaceOnce(worker,
  "            echo 'VIBE2_OLLAMA_RUNTIME_SOURCE=FALLBACK_INSTALL'\n",
  "            echo 'VIBE2_OLLAMA_RUNTIME_SOURCE=FALLBACK_INSTALL'\n            echo 'source=FALLBACK_INSTALL' >> \"$GITHUB_OUTPUT\"\n",
  'FALLBACK_SOURCE');

const candStart=worker.indexOf('      - name: Generate isolated candidate from current main');
const qaStart=worker.indexOf('      - name: Restore incremental QA content-hash cache');
if(candStart<0||qaStart<0)throw new Error('CANDIDATE_SECTION_NOT_FOUND');
let cand=worker.slice(candStart,qaStart);
cand=replaceOnce(cand,
  "          set -euo pipefail\n          git fetch --depth=1 origin main:refs/remotes/origin/main --quiet\n",
  "          set -euo pipefail\n          candidate_started=\"$(date +%s%3N)\"\n          git fetch --depth=1 origin main:refs/remotes/origin/main --quiet\n",
  'CANDIDATE_START');
cand=replaceOnce(cand,
  "          echo \"VIBE2_BASE_MAIN_SHA=$base_sha\"\n",
  "          echo \"VIBE2_BASE_MAIN_SHA=$base_sha\"\n          candidate_finished=\"$(date +%s%3N)\"\n          echo \"duration_ms=$((candidate_finished-candidate_started))\" >> \"$GITHUB_OUTPUT\"\n",
  'CANDIDATE_DURATION');
worker=worker.slice(0,candStart)+cand+worker.slice(qaStart);

const iqaStart=worker.indexOf('      - name: Run impact-first incremental QA');
const resultStart=worker.indexOf('      - name: Build immutable worker result');
if(iqaStart<0||resultStart<0)throw new Error('IQA_SECTION_NOT_FOUND');
let iqa=worker.slice(iqaStart,resultStart);
iqa=replaceOnce(iqa,
  "          set -euo pipefail\n          mkdir -p /tmp/vibe2-qa-cache\n",
  "          set -euo pipefail\n          qa_started=\"$(date +%s%3N)\"\n          mkdir -p /tmp/vibe2-qa-cache\n",
  'IQA_START');
iqa=replaceOnce(iqa,
  "          echo \"cache=$cache\" >> \"$GITHUB_OUTPUT\"\n",
  "          echo \"cache=$cache\" >> \"$GITHUB_OUTPUT\"\n          qa_finished=\"$(date +%s%3N)\"\n          echo \"duration_ms=$((qa_finished-qa_started))\" >> \"$GITHUB_OUTPUT\"\n",
  'IQA_DURATION');
worker=worker.slice(0,iqaStart)+iqa+worker.slice(resultStart);

const safeLine=`          SAFE_TASK: ${gh('steps.order.outputs.safe_task')}\n`;
const metricsEnv=safeLine+
  `          RESERVED_AT: ${gh('matrix.reservedAt')}\n`+
  `          REQUESTED_MAX: ${gh('matrix.requestedMax')}\n`+
  `          EFFECTIVE_MAX: ${gh('matrix.effectiveMax')}\n`+
  `          WORKER_STARTED_AT_FILE: /tmp/vibe2-worker-start-ms\n`+
  `          CHECKOUT_MS: ${gh('steps.checkout_metrics.outputs.ms')}\n`+
  `          OLLAMA_CACHE_HIT: ${gh('steps.worker_ollama_cache.outputs.cache-hit')}\n`+
  `          OLLAMA_RUNTIME_SOURCE: ${gh('steps.worker_ollama_runtime.outputs.source')}\n`+
  `          CANDIDATE_MS: ${gh('steps.candidate.outputs.duration_ms')}\n`+
  `          QA_MS: ${gh('steps.incremental_qa.outputs.duration_ms')}\n`;
worker=replaceOnce(worker,safeLine,metricsEnv,'RESULT_ENV');
const oldResult="          const result={version:1,taskId:clean(process.env.TASK_ID),variant:clean(process.env.VARIANT)||'primary',outcome,blocker,evidence,durationMs:0};";
const newResult=`          const workerStartedAt=Number(fs.readFileSync(process.env.WORKER_STARTED_AT_FILE,'utf8'))||Date.now();
          const workerFinishedAt=Date.now();
          const cacheRaw=clean(process.env.OLLAMA_CACHE_HIT).toLowerCase();
          const metrics={requestedMax:Number(process.env.REQUESTED_MAX||20),effectiveMax:Number(process.env.EFFECTIVE_MAX||20),reservedAt:clean(process.env.RESERVED_AT),workerStartedAt,workerFinishedAt,checkoutMs:Number(process.env.CHECKOUT_MS||0),candidateMs:Number(process.env.CANDIDATE_MS||0),qaMs:Number(process.env.QA_MS||0),workerTotalMs:Math.max(0,workerFinishedAt-workerStartedAt),ollamaCacheHit:cacheRaw==='true'?true:cacheRaw==='false'?false:null,ollamaRuntimeSource:clean(process.env.OLLAMA_RUNTIME_SOURCE)||null};
          const result={version:2,taskId:clean(process.env.TASK_ID),variant:clean(process.env.VARIANT)||'primary',outcome,blocker,evidence,durationMs:metrics.workerTotalMs,metrics};`;
worker=replaceOnce(worker,oldResult,newResult,'RESULT_METRICS');

fan=replaceOnce(fan,
  "    steps:\n      - name: Checkout latest Vibe2 control line\n",
  "    steps:\n      - name: Mark fan-in start\n        shell: bash\n        run: echo \"$(date +%s%3N)\" > /tmp/vibe2-fan-in-start-ms\n\n      - name: Checkout latest Vibe2 control line\n",
  'FAN_START');
fan=replaceOnce(fan,
  "          fetch-depth: 0\n\n      - uses: actions/setup-node@v4\n",
  "          fetch-depth: 0\n\n      - name: Measure fan-in checkout\n        id: fan_checkout_metrics\n        shell: bash\n        run: |\n          now=\"$(date +%s%3N)\"\n          start=\"$(cat /tmp/vibe2-fan-in-start-ms)\"\n          echo \"ms=$((now-start))\" >> \"$GITHUB_OUTPUT\"\n\n      - uses: actions/setup-node@v4\n",
  'FAN_CHECKOUT');
fan=replaceOnce(fan,
  "          node --test qa/vibe2-incremental-qa.test.mjs\n",
  "          node --test qa/vibe2-incremental-qa.test.mjs\n          node --test qa/vibe2-parallelism-telemetry.test.mjs\n",
  'FAN_TEST');
const eventMarker='      - name: Event-driven refill of free slots\n';
const telemetryStep=
  `      - name: Aggregate Vibe2 parallelism telemetry\n`+
  `        if: always()\n`+
  `        continue-on-error: true\n`+
  `        env:\n`+
  `          REQUESTED_MAX: 20\n`+
  `          EFFECTIVE_MAX: ${gh('needs.reserve.outputs.effective_max')}\n`+
  `          TASK_COUNT: ${gh('needs.reserve.outputs.task_count')}\n`+
  `          FAN_CHECKOUT_MS: ${gh('steps.fan_checkout_metrics.outputs.ms')}\n`+
  `        shell: bash\n`+
  `        run: |\n`+
  `          set -euo pipefail\n`+
  `          test -f /tmp/vibe2-fan-in.json || exit 0\n`+
  `          fan_end=\"$(date +%s%3N)\"\n`+
  `          fan_start=\"$(cat /tmp/vibe2-fan-in-start-ms)\"\n`+
  `          node tools/vibe2-parallelism-telemetry.mjs --input=/tmp/vibe2-fan-in.json --requested=\"$REQUESTED_MAX\" --effective=\"\${EFFECTIVE_MAX:-20}\" --task-count=\"\${TASK_COUNT:-0}\" --output=/tmp/vibe2-parallelism-telemetry.json | tee /tmp/vibe2-parallelism-telemetry.log\n`+
  `          node - \"$FAN_CHECKOUT_MS\" \"$((fan_end-fan_start))\" <<'NODE2'\n`+
  `          const fs=require('fs');const [checkout,total]=process.argv.slice(2).map(Number);const file='/tmp/vibe2-parallelism-telemetry.json';const x=JSON.parse(fs.readFileSync(file,'utf8'));x.fanIn={checkoutMs:checkout||0,totalMs:total||0};fs.writeFileSync(file,JSON.stringify(x,null,2)+'\\n');\n`+
  `          NODE2\n\n`+
  `      - name: Upload Vibe2 parallelism telemetry\n`+
  `        if: always()\n`+
  `        uses: actions/upload-artifact@v4\n`+
  `        with:\n`+
  `          name: vibe2-parallelism-telemetry-${gh('github.run_id')}\n`+
  `          path: |\n`+
  `            /tmp/vibe2-parallelism-telemetry.json\n`+
  `            /tmp/vibe2-parallelism-telemetry.log\n`+
  `          if-no-files-found: ignore\n`+
  `          retention-days: 7\n\n`;
fan=replaceOnce(fan,eventMarker,telemetryStep+eventMarker,'TELEMETRY_STEP');
fs.writeFileSync(wfPath,before+worker+fan,'utf8');

console.log('VIBE2_PARALLEL_TELEMETRY_PATCH=PASS');
