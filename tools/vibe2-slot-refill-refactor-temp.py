from pathlib import Path
import json

ROOT = Path('.')

# 1) Queue semantics: worker-finished/fan-in-pending releases execution capacity
# without counting as QA backpressure, while all running-task source/file locks remain held.
asset_path = ROOT / 'assets/vibe-continuous-queue.js'
asset = asset_path.read_text(encoding='utf-8')
old = """function isAwaitingQaTask(task) {\n  return task?.status === 'running' && /awaiting.*qa|qa.*awaiting/i.test(clean(task?.blocker));\n}\nfunction dynamicConcurrency(queue, requested = null) {\n"""
new = """function isAwaitingQaTask(task) {\n  return task?.status === 'running' && /awaiting.*qa|qa.*awaiting/i.test(clean(task?.blocker));\n}\nfunction isReleasedWorkerSlotTask(task) {\n  return task?.status === 'running' && /slot-released.*fan-in/i.test(clean(task?.blocker));\n}\nfunction releasesWorkerCapacity(task) {\n  return isAwaitingQaTask(task) || isReleasedWorkerSlotTask(task);\n}\nfunction dynamicConcurrency(queue, requested = null) {\n"""
assert old in asset, 'awaiting QA helper changed unexpectedly'
asset = asset.replace(old, new, 1)
asset = asset.replace(
    "const capacityRunning = running.filter((task) => !isAwaitingQaTask(task));",
    "const capacityRunning = running.filter((task) => !releasesWorkerCapacity(task));",
    1,
)
old = """    capacityRunning: freeze(capacityRunning),\n    awaitingQa: freeze(running.filter(isAwaitingQaTask)),\n    hasEligibleWork: selected.length > 0,\n"""
new = """    capacityRunning: freeze(capacityRunning),\n    awaitingQa: freeze(running.filter(isAwaitingQaTask)),\n    releasedWorkerSlots: freeze(running.filter(isReleasedWorkerSlotTask)),\n    hasEligibleWork: selected.length > 0,\n"""
assert old in asset, 'queue batch result block changed unexpectedly'
asset = asset.replace(old, new, 1)
old = """    capacityRunningTaskIds: freezeList(next.capacityRunning.map((task) => task.id)),\n    awaitingQaTaskIds: freezeList(next.awaitingQa.map((task) => task.id)),\n    nextReleaseState: next.selected[0]?.releaseState || null,\n"""
new = """    capacityRunningTaskIds: freezeList(next.capacityRunning.map((task) => task.id)),\n    awaitingQaTaskIds: freezeList(next.awaitingQa.map((task) => task.id)),\n    releasedWorkerSlotTaskIds: freezeList(next.releasedWorkerSlots.map((task) => task.id)),\n    nextReleaseState: next.selected[0]?.releaseState || null,\n"""
assert old in asset, 'queue summary block changed unexpectedly'
asset = asset.replace(old, new, 1)
asset_path.write_text(asset, encoding='utf-8')

# 2) Queue control: idempotent slot-release command for callback runs.
queue_path = ROOT / 'tools/vibe2-queue-control.mjs'
queue = queue_path.read_text(encoding='utf-8')
marker = """export function settleVibeTask(queueInput, { taskId = '', outcome = 'PASS', evidence = [], blocker = '', retryable = true } = {}) {\n  return finishVibeQueueTask(queueInput, { taskId, outcome, evidence, blocker, retryable });\n}\n"""
insert = """export function releaseVibeTaskExecutionSlot(queueInput, { taskId = '', evidence = [], blocker = 'slot-released-awaiting-fan-in' } = {}) {\n  const queue = createVibeContinuousQueue(queueInput);\n  const id = clean(taskId);\n  const task = queue.tasks.find((item) => item.id === id);\n  if (!task) throw new Error(`task not found: ${id}`);\n  if (task.status !== 'running') return { released:false, updated:false, reason:`TASK_${clean(task.status).toUpperCase()}_NOOP`, queue };\n  const currentBlocker = clean(task.blocker);\n  if (/awaiting.*qa|qa.*awaiting/i.test(currentBlocker) || /slot-released.*fan-in/i.test(currentBlocker)) {\n    return { released:false, updated:false, reason:'ALREADY_RELEASED', queue };\n  }\n  const nextQueue = markVibeTaskAwaiting(queue, { taskId:id, evidence, blocker:clean(blocker) || 'slot-released-awaiting-fan-in' });\n  return { released:true, updated:true, reason:'RELEASED', queue:nextQueue };\n}\n\nexport function settleVibeTask(queueInput, { taskId = '', outcome = 'PASS', evidence = [], blocker = '', retryable = true } = {}) {\n  return finishVibeQueueTask(queueInput, { taskId, outcome, evidence, blocker, retryable });\n}\n"""
assert marker in queue, 'settle marker changed unexpectedly'
queue = queue.replace(marker, insert, 1)
old = """  } else if (command === 'await') {\n    queue = markVibeTaskAwaiting(queue, { taskId: clean(args.id), evidence: list(args.evidence), blocker: clean(args.blocker) });\n    writeJson(file, queue);\n    result = { command, updated: true, taskId: clean(args.id), queue, summary: summarizeVibeContinuousQueue(queue) };\n  } else if (command === 'fan-in') {\n"""
new = """  } else if (command === 'release-slot') {\n    const released = releaseVibeTaskExecutionSlot(queue, { taskId: clean(args.id), evidence: list(args.evidence), blocker: clean(args.blocker) });\n    queue = released.queue;\n    if (released.updated) writeJson(file, queue);\n    result = { command, taskId: clean(args.id), ...released, summary: summarizeVibeContinuousQueue(queue) };\n  } else if (command === 'await') {\n    queue = markVibeTaskAwaiting(queue, { taskId: clean(args.id), evidence: list(args.evidence), blocker: clean(args.blocker) });\n    writeJson(file, queue);\n    result = { command, updated: true, taskId: clean(args.id), queue, summary: summarizeVibeContinuousQueue(queue) };\n  } else if (command === 'fan-in') {\n"""
assert old in queue, 'queue command await block changed unexpectedly'
queue = queue.replace(old, new, 1)
old = """  console.log(`VIBE2_QUEUE_CONTINUE=${result.summary?.continueRequired ? 'YES' : 'NO'}`);\n  if (result.adaptiveControl) {\n"""
new = """  console.log(`VIBE2_QUEUE_CONTINUE=${result.summary?.continueRequired ? 'YES' : 'NO'}`);\n  console.log(`VIBE2_QUEUE_RELEASED_WORKER_SLOTS=${(result.summary?.releasedWorkerSlotTaskIds || []).length}`);\n  if (result.command === 'release-slot') console.log(`VIBE2_SLOT_RELEASED=${result.released ? 'YES' : 'NO'}`);\n  if (result.adaptiveControl) {\n"""
assert old in queue, 'queue CLI output block changed unexpectedly'
queue = queue.replace(old, new, 1)
queue_path.write_text(queue, encoding='utf-8')

# 3) Runtime machine contract.
runtime_path = ROOT / 'vibe2-runtime.json'
runtime = json.loads(runtime_path.read_text(encoding='utf-8'))
continuous = runtime.setdefault('continuous', {})
continuous['refillMode'] = 'per-worker-push-callback-with-fan-in-fallback'
continuous['refillRef'] = 'vibe2-unreal-core'
continuous['refillRequiresEligibleWork'] = True
continuous['refillPlannerOnDispatch'] = False
continuous['slotRefillTrigger'] = 'push-callback-branch'
continuous['slotRefillBranchPrefix'] = 'vibe2/refill/'
continuous['slotRefillSingleVariantOnly'] = True
continuous['slotRefillWorkerDirectControlWrite'] = False
continuous['slotRefillSourceLocksHeldUntilFanIn'] = True
runtime_path.write_text(json.dumps(runtime, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

# 4) Controller workflow: callback branches trigger the same continuous core without relying
# on workflow_dispatch registration on main. Reserve serializes slot-release + reservation in one control write.
wf_path = ROOT / '.github/workflows/vibe2-continuous-core.yml'
wf = wf_path.read_text(encoding='utf-8')
old = """on:\n  workflow_call:\n  workflow_dispatch:\n"""
new = """on:\n  workflow_call:\n  workflow_dispatch:\n  push:\n    branches:\n      - 'vibe2/refill/**'\n"""
assert old in wf, 'workflow trigger block changed unexpectedly'
wf = wf.replace(old, new, 1)
old = """          git fetch origin vibe2-unreal-core --quiet\n          git reset --hard origin/vibe2-unreal-core\n          node tools/vibe2-handoff.mjs --check --output=/tmp/vibe2-handoff-before-reserve.json >/tmp/vibe2-handoff-before-reserve.log\n\n          node tools/vibe2-queue-control.mjs reserve-batch \\\n"""
new = """          git fetch origin vibe2-unreal-core --quiet\n          git reset --hard origin/vibe2-unreal-core\n\n          callback_ref=\"${GITHUB_REF_NAME:-}\"\n          callback_kind='none'\n          if [ \"${GITHUB_EVENT_NAME:-}\" = 'push' ] && [[ \"$callback_ref\" == vibe2/refill/task/*/* ]]; then\n            encoded=\"${callback_ref##*/}\"\n            task_id=\"$(node - \"$encoded\" <<'NODECB'\n          const encoded=process.argv[2]||'';\n          process.stdout.write(Buffer.from(encoded,'base64url').toString('utf8'));\n          NODECB\n          )\"\n            test -n \"$task_id\"\n            node tools/vibe2-queue-control.mjs release-slot \\\n              --id=\"$task_id\" \\\n              --blocker=slot-released-awaiting-fan-in \\\n              --evidence=\"slot-callback:${GITHUB_RUN_ID}:${GITHUB_RUN_ATTEMPT}\" | tee /tmp/vibe2-slot-release.log\n            callback_kind='task'\n            echo \"VIBE2_SLOT_CALLBACK_TASK=$task_id\"\n          elif [ \"${GITHUB_EVENT_NAME:-}\" = 'push' ] && [[ \"$callback_ref\" == vibe2/refill/fanin/* ]]; then\n            callback_kind='fanin'\n            echo 'VIBE2_SLOT_CALLBACK_FANIN=YES'\n          fi\n\n          node tools/vibe2-handoff.mjs --check --output=/tmp/vibe2-handoff-before-reserve.json >/tmp/vibe2-handoff-before-reserve.log\n\n          node tools/vibe2-queue-control.mjs reserve-batch \\\n"""
assert old in wf, 'reserve prelude changed unexpectedly'
wf = wf.replace(old, new, 1)
old = """          node <<'NODE'\n          const fs=require('fs');\n          const out=process.env.GITHUB_OUTPUT;\n          const batch=JSON.parse(fs.readFileSync('/tmp/vibe2-batch.json','utf8'));\n          const include=[];\n          for(const row of batch.matrix||[]){\n            include.push({taskId:row.taskId,shard:row.shard,variant:'primary',reservedAt:batch.createdAt,requestedMax:Number(batch.scheduler?.requestedMaxConcurrentTasks||20),effectiveMax:Number(batch.scheduler?.effectiveMaxConcurrentTasks||20)});\n            if(Number(row.speculativeVariants||1)>1)include.push({taskId:row.taskId,shard:row.shard,variant:'speculative',reservedAt:batch.createdAt,requestedMax:Number(batch.scheduler?.requestedMaxConcurrentTasks||20),effectiveMax:Number(batch.scheduler?.effectiveMaxConcurrentTasks||20)});\n          }\n"""
new = """          if [ \"$callback_kind\" != 'none' ]; then\n            git push origin --delete \"$callback_ref\" >/dev/null 2>&1 || true\n            echo \"VIBE2_SLOT_CALLBACK_CLEANUP=$callback_ref\"\n          fi\n\n          node <<'NODE'\n          const fs=require('fs');\n          const out=process.env.GITHUB_OUTPUT;\n          const batch=JSON.parse(fs.readFileSync('/tmp/vibe2-batch.json','utf8'));\n          const include=[];\n          for(const row of batch.matrix||[]){\n            const earlyRefill=Number(row.speculativeVariants||1)===1;\n            include.push({taskId:row.taskId,shard:row.shard,variant:'primary',earlyRefill,reservedAt:batch.createdAt,requestedMax:Number(batch.scheduler?.requestedMaxConcurrentTasks||20),effectiveMax:Number(batch.scheduler?.effectiveMaxConcurrentTasks||20)});\n            if(Number(row.speculativeVariants||1)>1)include.push({taskId:row.taskId,shard:row.shard,variant:'speculative',earlyRefill:false,reservedAt:batch.createdAt,requestedMax:Number(batch.scheduler?.requestedMaxConcurrentTasks||20),effectiveMax:Number(batch.scheduler?.effectiveMaxConcurrentTasks||20)});\n          }\n"""
assert old in wf, 'matrix builder changed unexpectedly'
wf = wf.replace(old, new, 1)
old = """      - name: Upload worker result for fan-in\n        if: always() && steps.result.outputs.file != ''\n        uses: actions/upload-artifact@v4\n        with:\n          name: vibe2-result-${{ steps.order.outputs.safe_task }}-${{ matrix.variant }}\n          path: ${{ steps.result.outputs.file }}\n          if-no-files-found: error\n          retention-days: 1\n\n  fan_in:\n"""
new = """      - name: Upload worker result for fan-in\n        if: always() && steps.result.outputs.file != ''\n        uses: actions/upload-artifact@v4\n        with:\n          name: vibe2-result-${{ steps.order.outputs.safe_task }}-${{ matrix.variant }}\n          path: ${{ steps.result.outputs.file }}\n          if-no-files-found: error\n          retention-days: 1\n\n      - name: Signal immediate slot refill after single-variant worker completion\n        if: always() && matrix.earlyRefill == true && steps.result.outputs.file != ''\n        env:\n          TASK_ID: ${{ matrix.taskId }}\n        shell: bash\n        run: |\n          set -euo pipefail\n          encoded=\"$(node -e \"process.stdout.write(Buffer.from(process.env.TASK_ID||'').toString('base64url'))\")\"\n          test -n \"$encoded\"\n          callback=\"vibe2/refill/task/${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}/${encoded}\"\n          git push origin \"HEAD:refs/heads/${callback}\"\n          echo \"VIBE2_EARLY_SLOT_REFILL_SIGNAL=$callback\"\n\n  fan_in:\n"""
assert old in wf, 'worker result upload block changed unexpectedly'
wf = wf.replace(old, new, 1)
old = """      - name: Event-driven direct refill of eligible free slots\n        if: steps.persist.outputs.refill == '1'\n        env:\n          GH_TOKEN: ${{ github.token }}\n        shell: bash\n        run: |\n          set -euo pipefail\n          gh workflow run vibe2-continuous-core.yml --repo \"$GITHUB_REPOSITORY\" --ref vibe2-unreal-core\n          echo 'VIBE2_EVENT_DRIVEN_REFILL=DIRECT_CONTINUOUS'\n"""
new = """      - name: Event-driven fan-in refill fallback\n        if: steps.persist.outputs.refill == '1'\n        shell: bash\n        run: |\n          set -euo pipefail\n          git fetch origin vibe2-unreal-core:refs/remotes/origin/vibe2-unreal-core --depth=1 --quiet\n          callback=\"vibe2/refill/fanin/${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}\"\n          git push origin \"refs/remotes/origin/vibe2-unreal-core:refs/heads/${callback}\"\n          echo \"VIBE2_EVENT_DRIVEN_REFILL=FANIN_PUSH_CALLBACK:$callback\"\n"""
assert old in wf, 'fan-in refill block changed unexpectedly'
wf = wf.replace(old, new, 1)
wf_path.write_text(wf, encoding='utf-8')

# 5) Queue tests.
qtest_path = ROOT / 'qa/vibe2-queue-control.test.mjs'
qtest = qtest_path.read_text(encoding='utf-8')
qtest = qtest.replace(
    "  markVibeTaskAwaiting,\n  settleVibeTask,",
    "  markVibeTaskAwaiting,\n  releaseVibeTaskExecutionSlot,\n  settleVibeTask,",
    1,
)
marker = """test('adaptive backpressure steps 20 down through 16 12 8 4 as pressure rises', () => {\n"""
insert = """test('completed single worker releases capacity before fan-in without dropping source locks or adding QA pressure', () => {\n  let queue=createVibeContinuousQueue({maxConcurrentTasks:2,tasks:[]});\n  queue=add(queue,'first','game-a','web',{responsibleFiles:['first.js']});\n  queue=add(queue,'same-root','game-a','web',{responsibleFiles:['second.js']});\n  queue=add(queue,'other-running','game-b','web',{responsibleFiles:['b.js']});\n  queue=add(queue,'refill','game-c','web',{responsibleFiles:['c.js']});\n  const reserved=reserveVibeTaskBatch(queue,{maxConcurrentTasks:2});\n  assert.deepEqual(new Set(reserved.tasks.map(t=>t.id)),new Set(['first','other-running']));\n  const released=releaseVibeTaskExecutionSlot(reserved.queue,{taskId:'first',evidence:['worker-finished']});\n  assert.equal(released.released,true);\n  const batch=selectVibeQueueBatch(released.queue,{maxConcurrentTasks:2});\n  assert.equal(batch.capacityRunning.length,1);\n  assert.equal(batch.releasedWorkerSlots.length,1);\n  assert.equal(batch.backpressure.awaitingQaCount,0);\n  assert.equal(batch.selected.some(t=>t.id==='same-root'),false);\n  assert.equal(batch.selected.some(t=>t.id==='refill'),true);\n  const second=releaseVibeTaskExecutionSlot(released.queue,{taskId:'first'});\n  assert.equal(second.released,false);\n  assert.equal(second.reason,'ALREADY_RELEASED');\n});\n\ntest('stale slot-release callback never overwrites a real awaiting-QA blocker', () => {\n  let queue=add(createVibeContinuousQueue(),'task','task','web');\n  queue=reserveNextVibeTask(queue).queue;\n  queue=markVibeTaskAwaiting(queue,{taskId:'task',blocker:'candidate-awaiting-qa-and-deployment'});\n  const released=releaseVibeTaskExecutionSlot(queue,{taskId:'task'});\n  assert.equal(released.released,false);\n  assert.equal(released.reason,'ALREADY_RELEASED');\n  assert.equal(released.queue.tasks[0].blocker,'candidate-awaiting-qa-and-deployment');\n});\n\ntest('adaptive backpressure steps 20 down through 16 12 8 4 as pressure rises', () => {\n"""
assert marker in qtest, 'queue test insertion marker changed unexpectedly'
qtest = qtest.replace(marker, insert, 1)
qtest_path.write_text(qtest, encoding='utf-8')

# 6) Controller contract tests.
ctest_path = ROOT / 'qa/vibe2-controller-contract.test.mjs'
ctest = ctest_path.read_text(encoding='utf-8')
old = """test('event-driven refill directly starts the next eligible control-branch batch',()=>{\n  assert(workflow.includes('Event-driven direct refill of eligible free slots'));\n  assert(workflow.includes(\"VIBE2_QUEUE_CONTINUE=//p\"));\n  assert(workflow.includes('gh workflow run vibe2-continuous-core.yml --repo \"$GITHUB_REPOSITORY\" --ref vibe2-unreal-core'));\n  assert(!workflow.includes('gh workflow run vibe2-24h-runner.yml --repo \"$GITHUB_REPOSITORY\" --ref main'));\n  assert.equal(runtime.continuous.refillRef,'vibe2-unreal-core');\n  assert.equal(runtime.continuous.refillMode,'direct-continuous-dispatch-after-fan-in');\n  assert.equal(runtime.continuous.refillRequiresEligibleWork,true);\n  assert.equal(runtime.continuous.refillPlannerOnDispatch,false);\n  assert(safetyNetWorkflow.includes('node tools/vibe2-handoff.mjs --check'));\n  assert(safetyNetWorkflow.includes('node tools/vibe2-auto-planner.mjs'));\n  assert(safetyNetWorkflow.includes('uses: ./.github/workflows/vibe2-continuous-core.yml'));\n  assert.equal(runtime.continuous.wakeMode,'event-driven-plus-hourly-safety-net');\n});\n"""
new = """test('worker completion uses push callbacks to refill slots before batch fan-in',()=>{\n  assert(workflow.includes("- 'vibe2/refill/**'"));\n  assert(workflow.includes('release-slot'));\n  assert(workflow.includes('slot-released-awaiting-fan-in'));\n  assert(workflow.includes('Signal immediate slot refill after single-variant worker completion'));\n  assert(workflow.includes('vibe2/refill/task/${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}/${encoded}'));\n  assert(workflow.includes('earlyRefill'));\n  assert.equal(runtime.continuous.refillRef,'vibe2-unreal-core');\n  assert.equal(runtime.continuous.refillMode,'per-worker-push-callback-with-fan-in-fallback');\n  assert.equal(runtime.continuous.slotRefillTrigger,'push-callback-branch');\n  assert.equal(runtime.continuous.slotRefillSingleVariantOnly,true);\n  assert.equal(runtime.continuous.slotRefillWorkerDirectControlWrite,false);\n  assert.equal(runtime.continuous.slotRefillSourceLocksHeldUntilFanIn,true);\n});\n\ntest('fan-in keeps a push-callback fallback and does not depend on default-branch workflow dispatch',()=>{\n  assert(workflow.includes('Event-driven fan-in refill fallback'));\n  assert(workflow.includes('vibe2/refill/fanin/${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}'));\n  assert(!workflow.includes('gh workflow run vibe2-continuous-core.yml'));\n  assert(!workflow.includes('gh workflow run vibe2-24h-runner.yml --repo \"$GITHUB_REPOSITORY\" --ref main'));\n  assert(safetyNetWorkflow.includes('node tools/vibe2-handoff.mjs --check'));\n  assert(safetyNetWorkflow.includes('node tools/vibe2-auto-planner.mjs'));\n  assert(safetyNetWorkflow.includes('uses: ./.github/workflows/vibe2-continuous-core.yml'));\n  assert.equal(runtime.continuous.wakeMode,'event-driven-plus-hourly-safety-net');\n});\n\ntest('worker never writes queue or parallelism state directly during early refill signaling',()=>{\n  const start=workflow.indexOf('  worker:');\n  const end=workflow.indexOf('  fan_in:');\n  assert(start>=0 && end>start);\n  const workerPart=workflow.slice(start,end);\n  assert(!workerPart.includes('vibe2-queue-control.mjs release-slot'));\n  assert(!workerPart.includes('git push origin HEAD:vibe2-unreal-core'));\n  assert(workerPart.includes('git push origin \"HEAD:refs/heads/${callback}\"'));\n});\n"""
assert old in ctest, 'controller event refill test changed unexpectedly'
ctest = ctest.replace(old, new, 1)
ctest_path.write_text(ctest, encoding='utf-8')

# Save the verified workflow blob for connector finalization because Actions tokens cannot push workflow edits.
snapshot = ROOT / '.vibe2/workflow-snapshots/vibe2-continuous-core.yml'
snapshot.parent.mkdir(parents=True, exist_ok=True)
snapshot.write_text(wf, encoding='utf-8')
