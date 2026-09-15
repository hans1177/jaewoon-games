import json
import pathlib
import re
import textwrap

root = pathlib.Path('.')


def read(path):
    return (root / path).read_text(encoding='utf-8')


def write(path, text):
    (root / path).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, got {count}')
    return text.replace(old, new, 1)


# Central machine contract v7.
runtime_path = root / 'vibe2-runtime.json'
runtime = json.loads(runtime_path.read_text(encoding='utf-8'))
runtime['version'] = 7
docs = runtime.setdefault('documentation', {})
docs['machineStateVersions'] = {
    'runtime': 7,
    'queue': 4,
    'parallelism': 2,
    'experience': 1,
    'handoff': 2,
}
docs['disallowUnlistedVibe2Markdown'] = True
docs['generatedHandoffArtifact'] = 'vibe2-machine-handoff'
work = runtime.setdefault('workManagement', {})
work['machineContextRequired'] = True
work['handoffConsumers'] = ['planner', 'reserve', 'worker', 'fan-in']
continuous = runtime.setdefault('continuous', {})
continuous['entryWorkflow'] = '.github/workflows/vibe2-24h-runner.yml'
continuous['workerWorkflow'] = '.github/workflows/vibe2-continuous-core.yml'
runtime.setdefault('sources', {})['parallelism'] = '.vibe2/parallelism-control.json'
runtime_path.write_text(json.dumps(runtime, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

# Handoff becomes the consistency gate and reusable machine context.
p = 'tools/vibe2-handoff.mjs'
text = read(p)
validation = textwrap.dedent(r'''
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const resolveFrom = (root, file) => path.isAbsolute(clean(file)) ? clean(file) : path.join(root, clean(file));

export function validateVibe2MachineState({ runtime = {}, queue = {}, parallelism = {}, experience = {}, repoRoot = process.cwd() } = {}) {
  const errors = [];
  const docs = runtime.documentation || {};
  const expected = docs.machineStateVersions || {};
  const state = docs.runtimeState || {};
  const work = runtime.workManagement || {};
  const adaptive = runtime.adaptiveBackpressure || {};
  const sources = runtime.sources || {};
  const continuous = runtime.continuous || {};
  const add = (condition, code) => { if (condition) errors.push(code); };

  add(Number(expected.runtime || 0) > 0 && Number(runtime.version || 0) !== Number(expected.runtime), 'RUNTIME_VERSION_MISMATCH');
  add(Number(expected.queue || 0) > 0 && Number(queue.version || 0) !== Number(expected.queue), 'QUEUE_VERSION_MISMATCH');
  add(Number(expected.parallelism || 0) > 0 && Number(parallelism.version || 0) !== Number(expected.parallelism), 'PARALLELISM_VERSION_MISMATCH');
  add(Number(expected.experience || 0) > 0 && Number(experience.version || 0) !== Number(expected.experience), 'EXPERIENCE_VERSION_MISMATCH');
  add(Number(expected.handoff || 0) > 0 && Number(expected.handoff) !== 2, 'HANDOFF_VERSION_MISMATCH');

  const humanDocs = Array.isArray(docs.humanDocuments) ? docs.humanDocuments.map(clean).filter(Boolean) : [];
  add(Number(docs.humanDocumentLimit || 0) !== 1, 'HUMAN_DOCUMENT_LIMIT_NOT_ONE');
  add(humanDocs.length !== 1 || humanDocs[0] !== 'VIBE2.md', 'HUMAN_DOCUMENT_SET_INVALID');
  add(docs.manualHandoffDocumentsAllowed !== false, 'MANUAL_HANDOFF_DOCUMENT_ALLOWED');
  add(work.humanMaintainedHandoff !== false, 'HUMAN_HANDOFF_ENABLED');
  add(work.handoffMode !== 'generated-from-machine-state', 'HANDOFF_MODE_NOT_GENERATED');
  add(work.machineContextRequired !== true, 'MACHINE_CONTEXT_NOT_REQUIRED');
  const consumers = Array.isArray(work.handoffConsumers) ? work.handoffConsumers : [];
  for (const consumer of ['planner', 'reserve', 'worker', 'fan-in']) add(!consumers.includes(consumer), `HANDOFF_CONSUMER_MISSING:${consumer}`);

  add(clean(state.queue) !== clean(sources.queue), 'QUEUE_SOURCE_DIVERGED');
  add(clean(state.parallelism) !== clean(sources.parallelism || adaptive.stateFile), 'PARALLELISM_SOURCE_DIVERGED');
  add(clean(state.experience) !== clean(sources.experience), 'EXPERIENCE_SOURCE_DIVERGED');
  add(clean(adaptive.stateFile) !== clean(state.parallelism), 'ADAPTIVE_STATE_FILE_DIVERGED');

  const steps = Array.isArray(adaptive.steps) ? adaptive.steps.map(Number) : [];
  const telemetrySteps = Array.isArray(runtime.parallelismTelemetry?.backpressureSteps) ? runtime.parallelismTelemetry.backpressureSteps.map(Number) : [];
  add(!sameJson(steps, telemetrySteps), 'ADAPTIVE_STEPS_DIVERGED');
  const configuredMax = Number(continuous.maxConcurrentGameTasks || 0);
  add(Number(queue.maxConcurrentTasks || configuredMax) !== configuredMax, 'QUEUE_MAX_DIVERGED');
  add(!steps.includes(Number(parallelism.currentMax || configuredMax)), 'PERSISTENT_MAX_OUTSIDE_STEPS');
  add(Number(parallelism.currentMax || configuredMax) > configuredMax, 'PERSISTENT_MAX_ABOVE_CONFIGURED');

  if (repoRoot && fs.existsSync(repoRoot)) {
    for (const file of humanDocs) add(!fs.existsSync(path.join(repoRoot, file)), `HUMAN_DOCUMENT_MISSING:${file}`);
    for (const file of docs.legacyHumanDocumentsRemoved || []) add(fs.existsSync(path.join(repoRoot, file)), `LEGACY_HUMAN_DOCUMENT_PRESENT:${file}`);
    if (docs.disallowUnlistedVibe2Markdown === true) {
      const actual = fs.readdirSync(repoRoot, { withFileTypes: true })
        .filter((entry) => entry.isFile() && /^VIBE2.*\.md$/i.test(entry.name))
        .map((entry) => entry.name).sort();
      const allowed = [...humanDocs].sort();
      add(!sameJson(actual, allowed), `UNLISTED_VIBE2_MARKDOWN:${actual.filter((file) => !allowed.includes(file)).join(',') || 'SET_MISMATCH'}`);
    }
    const generatedTool = clean(docs.generatedHandoffTool);
    add(!generatedTool || !fs.existsSync(path.join(repoRoot, generatedTool)), 'HANDOFF_TOOL_MISSING');
    for (const [name, file] of [['ENTRY', continuous.entryWorkflow], ['WORKER', continuous.workerWorkflow]]) {
      const normalized = clean(file);
      add(!normalized || !fs.existsSync(path.join(repoRoot, normalized)), `${name}_WORKFLOW_MISSING`);
    }
  }

  return { ok: errors.length === 0, errors: [...new Set(errors)] };
}

''')
text = replace_once(text, 'export function buildVibe2Handoff({\n', validation + 'export function buildVibe2Handoff({\n', 'insert validation')
text = replace_once(text, '  experience = {}\n} = {}) {', '  experience = {},\n  consistency = { ok: true, errors: [] }\n} = {}) {', 'build consistency arg')
text = replace_once(
    text,
    "    version: 1,\n    kind: 'vibe2-machine-handoff',",
    "    version: 2,\n    kind: 'vibe2-machine-handoff',\n    consistency: { ok: consistency?.ok !== false, errors: Array.isArray(consistency?.errors) ? [...consistency.errors] : [] },",
    'handoff version',
)
start = text.index('export function generateVibe2Handoff({')
end = text.index('export function writeVibe2Handoff(', start)
generate_block = textwrap.dedent(r'''export function generateVibe2Handoff({
  runtimeFile = 'vibe2-runtime.json',
  queueFile = '',
  controlFile = '',
  experienceFile = ''
} = {}) {
  const runtimePath = path.resolve(runtimeFile);
  const repoRoot = path.dirname(runtimePath);
  const runtime = readJson(runtimePath);
  const state = runtime.documentation?.runtimeState || {};
  const queuePath = resolveFrom(repoRoot, clean(queueFile) || state.queue || runtime.sources?.queue || '.vibe2/queue.json');
  const controlPath = resolveFrom(repoRoot, clean(controlFile) || state.parallelism || runtime.sources?.parallelism || runtime.adaptiveBackpressure?.stateFile || '.vibe2/parallelism-control.json');
  const experiencePath = resolveFrom(repoRoot, clean(experienceFile) || state.experience || runtime.sources?.experience || '.vibe2/experience.json');
  const queue = readJson(queuePath, { version: 0, tasks: [] });
  const parallelism = readJson(controlPath, { version: 0 });
  const experience = readJson(experiencePath, { version: 0, records: [] });
  const consistency = validateVibe2MachineState({ runtime, queue, parallelism, experience, repoRoot });
  return buildVibe2Handoff({ runtime, queue, parallelism, experience, consistency });
}

''')
text = text[:start] + generate_block + text[end:]
cli_start = text.index("if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {")
cli = textwrap.dedent(r'''if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs();
  const snapshot = generateVibe2Handoff({
    runtimeFile: clean(args.runtime) || 'vibe2-runtime.json',
    queueFile: clean(args.queue),
    controlFile: clean(args.control),
    experienceFile: clean(args.experience)
  });
  if (clean(args.output)) writeVibe2Handoff(args.output, snapshot);
  console.log(JSON.stringify(snapshot, null, 2));
  if (args.check === true) {
    if (snapshot.consistency?.ok === true) console.error('VIBE2_MACHINE_STATE=CONSISTENT');
    else {
      console.error(`VIBE2_MACHINE_STATE=INCONSISTENT:${(snapshot.consistency?.errors || []).join('|') || 'UNKNOWN'}`);
      process.exitCode = 1;
    }
  }
}
''')
text = text[:cli_start] + cli
write(p, text)

# Planner consumes generated handoff and adaptive persistent cap.
p = 'tools/vibe2-auto-planner.mjs'
text = read(p)
text = replace_once(
    text,
    "import { createVibeContinuousQueue, DEFAULT_MAX_CONCURRENT_TASKS } from '../assets/vibe-continuous-queue.js';\n",
    "import { createVibeContinuousQueue, DEFAULT_MAX_CONCURRENT_TASKS } from '../assets/vibe-continuous-queue.js';\nimport { generateVibe2Handoff } from './vibe2-handoff.mjs';\n",
    'planner import',
)
planner_start = text.index('export function runVibe2AutoPlanner(')
planner_tail = textwrap.dedent(r'''export function runVibe2AutoPlanner({
  statusFile='.vibe2/main-company-status.json', catalogFile='.vibe2/main-game-catalog.json', queueFile='', runtimeFile='vibe2-runtime.json',
  controlFile='', experienceFile='', repoRoot=process.cwd(), maxConcurrentTasks=process.env.VIBE2_MAX_CONCURRENT_GAME_TASKS||DEFAULT_MAX_CONCURRENT_TASKS
}={}) {
  const runtime=readJson(runtimeFile,{});
  const resolvedQueueFile=clean(queueFile)||clean(runtime.sources?.queue)||'.vibe2/queue.json';
  const resolvedControlFile=clean(controlFile)||clean(runtime.sources?.parallelism)||clean(runtime.adaptiveBackpressure?.stateFile)||'.vibe2/parallelism-control.json';
  const resolvedExperienceFile=clean(experienceFile)||clean(runtime.sources?.experience)||'.vibe2/experience.json';
  const handoff=generateVibe2Handoff({runtimeFile,queueFile:resolvedQueueFile,controlFile:resolvedControlFile,experienceFile:resolvedExperienceFile});
  const machineHandoff={used:true,kind:handoff.kind,sourceOfTruth:handoff.sourceOfTruth,consistency:handoff.consistency,currentPersistentMax:handoff.parallelism.currentPersistentMax,lastDecision:handoff.parallelism.lastDecision};
  if(handoff.consistency?.ok!==true)return{planned:false,reason:'MACHINE_STATE_INCONSISTENT',machineHandoff,effectivePlannerMax:0};
  const effectivePlannerMax=Math.min(parallelLimit(maxConcurrentTasks),parallelLimit(handoff.parallelism.currentPersistentMax));
  const result=planVibe2AutonomousTasks({status:readJson(statusFile,{}),catalog:readJson(catalogFile,{}),queue:readJson(resolvedQueueFile,{tasks:[]}),repoRoot,maxConcurrentTasks:effectivePlannerMax});
  if(result.planned)writeJson(resolvedQueueFile,result.queue);
  return{...result,machineHandoff,effectivePlannerMax};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=parseArgs(),result=runVibe2AutoPlanner({statusFile:clean(args.status)||'.vibe2/main-company-status.json',catalogFile:clean(args.catalog)||'.vibe2/main-game-catalog.json',queueFile:clean(args.queue),runtimeFile:clean(args.runtime)||'vibe2-runtime.json',controlFile:clean(args.control),experienceFile:clean(args.experience),repoRoot:clean(args.root)||process.cwd(),maxConcurrentTasks:clean(args.max)||process.env.VIBE2_MAX_CONCURRENT_GAME_TASKS||DEFAULT_MAX_CONCURRENT_TASKS});
  console.log(`VIBE2_MACHINE_HANDOFF=${result.machineHandoff?.used?'USED':'NOT_USED'}`);
  console.log(`VIBE2_MACHINE_STATE=${result.machineHandoff?.consistency?.ok?'CONSISTENT':'INCONSISTENT'}`);
  console.log(`VIBE2_PLANNER_PERSISTENT_MAX=${result.machineHandoff?.currentPersistentMax||0}`);
  console.log(`VIBE2_PLANNER_EFFECTIVE_MAX=${result.effectivePlannerMax||0}`);
  console.log(`VIBE2_AUTO_PLAN=${result.planned?'YES':'NO'}`);console.log(`VIBE2_AUTO_PLAN_REASON=${result.reason}`);console.log(`VIBE2_AUTO_PLAN_COUNT=${result.count||0}`);console.log(`VIBE2_AUTO_PLAN_PROJECT=${result.projectId||'NONE'}`);console.log(`VIBE2_AUTO_PLAN_RELEASE_STATE=${result.projectReleaseState||'NONE'}`);console.log(`VIBE2_AUTO_PLAN_ENGINE=${result.projectEngine||'NONE'}`);console.log(`VIBE2_AUTO_PLAN_PRIORITY=${result.projectPriorityPolicy||'NONE'}`);console.log(`VIBE2_AUTO_PLAN_TASK=${result.task?.id||'NONE'}`);console.log(`VIBE2_AUTO_PLAN_TASKS=${(result.tasks||[]).map(t=>t.id).join(',')||'NONE'}`);console.log(`VIBE2_AUTO_PLAN_BLOCKED_TIER1=${(result.blockedTier1GameIds||[]).join(',')||'NONE'}`);
}
''')
text = text[:planner_start] + planner_tail
write(p, text)

# Every worker work order consumes the same machine handoff.
p = 'tools/vibe2-continuous-runner.mjs'
text = read(p)
text = replace_once(
    text,
    "import { createVibeExperienceMemory } from '../assets/vibe-experience-memory.js';\n",
    "import { createVibeExperienceMemory } from '../assets/vibe-experience-memory.js';\nimport { generateVibe2Handoff } from './vibe2-handoff.mjs';\n",
    'runner import',
)
text = replace_once(
    text,
    "export function buildVibeContinuousWorkOrder({ runtime = {}, queue = {}, experience = {}, taskId = '' } = {}) {",
    "export function buildVibeContinuousWorkOrder({ runtime = {}, queue = {}, experience = {}, handoff = null, taskId = '' } = {}) {",
    'runner build arg',
)
text = replace_once(
    text,
    "    version:4, generatedAt:new Date().toISOString(), run:false, reason:null, mode:'vibe2-parallel-work-order',\n    scheduler:",
    "    version:5, generatedAt:new Date().toISOString(), run:false, reason:null, mode:'vibe2-parallel-work-order',\n    machineHandoff:freeze({ used:Boolean(handoff?.kind), kind:handoff?.kind || null, sourceOfTruth:handoff?.sourceOfTruth || null, consistency:handoff?.consistency || {ok:true,errors:[]}, currentPersistentMax:Number(handoff?.parallelism?.currentPersistentMax || runtime?.continuous?.maxConcurrentGameTasks || 20), lastDecision:handoff?.parallelism?.lastDecision || null, ownerDirectiveOpenCount:Number(handoff?.workState?.ownerDirectiveOpenCount || 0) }),\n    scheduler:",
    'runner base handoff',
)
text = replace_once(
    text,
    "  if (runtime?.continuous?.enabled === false) return freeze({ ...base, reason:'CONTINUOUS_DISABLED' });",
    "  if (handoff?.kind && handoff.consistency?.ok !== true) return freeze({ ...base, reason:`MACHINE_STATE_INCONSISTENT:${(handoff.consistency?.errors || []).join('|') || 'UNKNOWN'}` });\n  if (runtime?.continuous?.enabled === false) return freeze({ ...base, reason:'CONTINUOUS_DISABLED' });",
    'runner consistency gate',
)
run_start = text.index('export function runVibeContinuousRunner(')
cli_start = text.index("if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {", run_start)
new_run = textwrap.dedent(r'''export function runVibeContinuousRunner({ runtimeFile='vibe2-runtime.json', queueFile='', controlFile='', experienceFile='', outputFile='', taskId='' } = {}) {
  const runtime = readJson(runtimeFile, {});
  const resolvedQueueFile = clean(queueFile) || clean(runtime?.sources?.queue) || '.vibe2/queue.json';
  const resolvedControlFile = clean(controlFile) || clean(runtime?.sources?.parallelism) || clean(runtime?.adaptiveBackpressure?.stateFile) || '.vibe2/parallelism-control.json';
  const resolvedExperienceFile = clean(experienceFile) || clean(runtime?.sources?.experience) || '.vibe2/experience.json';
  const resolvedOutputFile = clean(outputFile) || clean(runtime?.sources?.workOrder) || '.vibe2/work-order.json';
  const handoff = generateVibe2Handoff({ runtimeFile, queueFile:resolvedQueueFile, controlFile:resolvedControlFile, experienceFile:resolvedExperienceFile });
  const order = buildVibeContinuousWorkOrder({ runtime, queue:readJson(resolvedQueueFile, { tasks:[] }), experience:readJson(resolvedExperienceFile, { records:[] }), handoff, taskId });
  writeJson(resolvedOutputFile, order);
  return order;
}

''')
text = text[:run_start] + new_run + text[cli_start:]
text = replace_once(
    text,
    "    runtimeFile:clean(args.runtime)||'vibe2-runtime.json', queueFile:clean(args.queue)||'.vibe2/queue.json', experienceFile:clean(args.experience)||'.vibe2/experience.json', outputFile:clean(args.output), taskId:clean(args['task-id'])",
    "    runtimeFile:clean(args.runtime)||'vibe2-runtime.json', queueFile:clean(args.queue), controlFile:clean(args.control), experienceFile:clean(args.experience), outputFile:clean(args.output), taskId:clean(args['task-id'])",
    'runner cli args',
)
text = replace_once(
    text,
    "  console.log(`VIBE2_CONTINUOUS_REASON=${order.reason}`);",
    "  console.log(`VIBE2_CONTINUOUS_REASON=${order.reason}`);\n  console.log(`VIBE2_MACHINE_HANDOFF=${order.machineHandoff?.used?'USED':'NOT_USED'}`);\n  console.log(`VIBE2_MACHINE_STATE=${order.machineHandoff?.consistency?.ok?'CONSISTENT':'INCONSISTENT'}`);\n  console.log(`VIBE2_MACHINE_PERSISTENT_MAX=${order.machineHandoff?.currentPersistentMax||0}`);",
    'runner cli markers',
)
write(p, text)

# Permanent hourly safety-net / owner-event entrypoint.
safety_net = textwrap.dedent(r'''name: Vibe2 24h Runner

on:
  workflow_dispatch:
  schedule:
    - cron: '17 * * * *'

permissions:
  contents: write
  actions: write

jobs:
  plan:
    runs-on: ubuntu-latest
    timeout-minutes: 7
    concurrency:
      group: vibe2-control-state-vibe2-unreal-core
      cancel-in-progress: false
    steps:
      - name: Checkout Vibe2 control line
        uses: actions/checkout@v4
        with:
          ref: vibe2-unreal-core
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Read current machine state and latest main planning inputs
        shell: bash
        run: |
          set -euo pipefail
          node tools/vibe2-handoff.mjs --check --output=/tmp/vibe2-handoff-before-plan.json >/tmp/vibe2-handoff-before-plan.log
          git fetch --depth=1 origin main:refs/remotes/origin/main --quiet
          git show origin/main:company-status.json > /tmp/vibe2-main-company-status.json
          git show origin/main:game-catalog.json > /tmp/vibe2-main-game-catalog.json

      - name: Plan from generated handoff and persist queue only when changed
        shell: bash
        run: |
          set -euo pipefail
          git config user.name 'jaewoon-vibe2-planner'
          git config user.email 'vibe2-planner@users.noreply.github.com'
          node tools/vibe2-auto-planner.mjs \
            --runtime=vibe2-runtime.json \
            --status=/tmp/vibe2-main-company-status.json \
            --catalog=/tmp/vibe2-main-game-catalog.json \
            --queue=.vibe2/queue.json \
            --control=.vibe2/parallelism-control.json \
            --experience=.vibe2/experience.json \
            --max=20 | tee /tmp/vibe2-plan.log
          node tools/vibe2-handoff.mjs --check --output=/tmp/vibe2-handoff-after-plan.json >/tmp/vibe2-handoff-after-plan.log
          if git diff --quiet -- .vibe2/queue.json; then
            echo 'VIBE2_PLAN_QUEUE_WRITE=NO'
          else
            git add .vibe2/queue.json
            git commit -m "vibe2: plan next machine-state work [skip ci]"
            pushed=0
            for attempt in 1 2 3; do
              if git pull --rebase origin vibe2-unreal-core && git push origin HEAD:vibe2-unreal-core; then pushed=1; break; fi
              git rebase --abort 2>/dev/null || true
              git fetch origin vibe2-unreal-core --quiet
              sleep $((attempt * 2))
            done
            test "$pushed" = 1
            echo 'VIBE2_PLAN_QUEUE_WRITE=YES'
          fi

      - name: Upload generated machine handoff
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: vibe2-machine-handoff-plan-${{ github.run_id }}
          path: |
            /tmp/vibe2-handoff-before-plan.json
            /tmp/vibe2-handoff-after-plan.json
            /tmp/vibe2-plan.log
          if-no-files-found: error
          retention-days: 7

  continuous:
    needs: plan
    uses: ./.github/workflows/vibe2-continuous-core.yml
    permissions:
      contents: write
      actions: write
''')
write('.github/workflows/vibe2-24h-runner.yml', safety_net)

# Continuous workflow validates handoff at reserve and fan-in and publishes derived handoff.
p = '.github/workflows/vibe2-continuous-core.yml'
text = read(p)
text = replace_once(text, "          node --check tools/vibe2-adaptive-backpressure.mjs\n", "          node --check tools/vibe2-adaptive-backpressure.mjs\n          node --check tools/vibe2-handoff.mjs\n", 'continuous handoff syntax')
text = replace_once(text, "          node --test qa/vibe2-parallelism-telemetry.test.mjs\n", "          node --test qa/vibe2-parallelism-telemetry.test.mjs\n          node --test qa/vibe2-handoff.test.mjs\n          node tools/vibe2-handoff.mjs --check --output=/tmp/vibe2-handoff-preflight.json >/tmp/vibe2-handoff-preflight.log\n", 'continuous preflight handoff')
text = replace_once(text, "          git reset --hard origin/vibe2-unreal-core\n\n          node tools/vibe2-queue-control.mjs reserve-batch", "          git reset --hard origin/vibe2-unreal-core\n          node tools/vibe2-handoff.mjs --check --output=/tmp/vibe2-handoff-before-reserve.json >/tmp/vibe2-handoff-before-reserve.log\n\n          node tools/vibe2-queue-control.mjs reserve-batch", 'continuous reserve before')
text = replace_once(text, "            --output=/tmp/vibe2-batch.json | tee /tmp/vibe2-reserve.log\n\n          if git diff --quiet", "            --output=/tmp/vibe2-batch.json | tee /tmp/vibe2-reserve.log\n          node tools/vibe2-handoff.mjs --check --output=/tmp/vibe2-handoff-after-reserve.json >/tmp/vibe2-handoff-after-reserve.log\n\n          if git diff --quiet", 'continuous reserve after')
text = replace_once(text, "          node --test qa/vibe2-experience-control.test.mjs\n\n          if git diff --quiet", "          node --test qa/vibe2-experience-control.test.mjs\n          node --test qa/vibe2-handoff.test.mjs\n\n          if git diff --quiet", 'continuous fanin regression')
text = replace_once(text, "          node tools/vibe2-queue-control.mjs summary | tee /tmp/vibe2-summary.log\n", "          node tools/vibe2-handoff.mjs --check --output=/tmp/vibe2-handoff-after-fanin.json >/tmp/vibe2-handoff-after-fanin.log\n          node tools/vibe2-queue-control.mjs summary | tee /tmp/vibe2-summary.log\n", 'continuous fanin handoff')
marker = "      - name: Aggregate Vibe2 parallelism telemetry\n"
upload = textwrap.dedent(r'''      - name: Upload generated machine handoff
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: vibe2-machine-handoff-${{ github.run_id }}
          path: |
            /tmp/vibe2-handoff-after-fanin.json
            /tmp/vibe2-handoff-after-fanin.log
          if-no-files-found: ignore
          retention-days: 7

''')
text = replace_once(text, marker, upload + marker, 'continuous upload handoff')
write(p, text)

# Core QA watches the safety-net and treats handoff consistency as a hard gate.
p = '.github/workflows/vibe2-core-qa.yml'
text = read(p)
old_paths = "      - '.github/workflows/vibe2-continuous-core.yml'\n      - '.github/workflows/vibe2-core-qa.yml'"
new_paths = "      - '.github/workflows/vibe2-continuous-core.yml'\n      - '.github/workflows/vibe2-24h-runner.yml'\n      - '.github/workflows/vibe2-core-qa.yml'"
text = replace_once(text, old_paths, new_paths, 'core qa push path')
text = replace_once(text, old_paths, new_paths, 'core qa pr path')
text = replace_once(text, "          node tools/vibe2-handoff.mjs --output=/tmp/vibe2-handoff.json >/tmp/vibe2-handoff.log", "          node tools/vibe2-handoff.mjs --check --output=/tmp/vibe2-handoff.json >/tmp/vibe2-handoff.log", 'core qa handoff check')
write(p, text)

# Controller contract includes the real safety-net entrypoint.
p = 'qa/vibe2-controller-contract.test.mjs'
text = read(p)
text = replace_once(text, "const workflow=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');\n", "const workflow=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');\nconst safetyNetWorkflow=fs.readFileSync(new URL('../.github/workflows/vibe2-24h-runner.yml',import.meta.url),'utf8');\n", 'controller safety net read')
text = replace_once(text, '  assert.equal(runtime.version,6);', '  assert.equal(runtime.version,7);', 'controller runtime v7')
text = replace_once(text, "  assert.equal(runtime.assetDecision.learningMayOverrideFixedRules,false);", "  assert.equal(runtime.assetDecision.learningMayOverrideFixedRules,false);\n  assert.equal(runtime.workManagement.machineContextRequired,true);\n  assert.deepEqual(runtime.workManagement.handoffConsumers,['planner','reserve','worker','fan-in']);\n  assert.equal(runtime.continuous.entryWorkflow,'.github/workflows/vibe2-24h-runner.yml');", 'controller machine policy')
text = replace_once(text, "  assert(workflow.includes('gh workflow run vibe2-24h-runner.yml'));\n  assert.equal(runtime.continuous.wakeMode,'event-driven-plus-hourly-safety-net');", "  assert(workflow.includes('gh workflow run vibe2-24h-runner.yml'));\n  assert(safetyNetWorkflow.includes('node tools/vibe2-handoff.mjs --check'));\n  assert(safetyNetWorkflow.includes('node tools/vibe2-auto-planner.mjs'));\n  assert(safetyNetWorkflow.includes('uses: ./.github/workflows/vibe2-continuous-core.yml'));\n  assert.equal(runtime.continuous.wakeMode,'event-driven-plus-hourly-safety-net');", 'controller event entry')
write(p, text)

# Extend existing handoff QA instead of creating another test file.
p = 'qa/vibe2-handoff.test.mjs'
text = read(p)
text = replace_once(text, "import fs from 'node:fs';\n", "import fs from 'node:fs';\nimport os from 'node:os';\nimport path from 'node:path';\n", 'handoff test node imports')
text = replace_once(text, "import { buildVibe2Handoff, generateVibe2Handoff } from '../tools/vibe2-handoff.mjs';\n", "import { buildVibe2Handoff, generateVibe2Handoff, validateVibe2MachineState } from '../tools/vibe2-handoff.mjs';\nimport { runVibe2AutoPlanner } from '../tools/vibe2-auto-planner.mjs';\nimport { runVibeContinuousRunner } from '../tools/vibe2-continuous-runner.mjs';\nimport { runQueueCommand } from '../tools/vibe2-queue-control.mjs';\n", 'handoff test imports')
text = text.replace('    version: 6,', '    version: 7,', 1)
text = text.replace("  assert.equal(snapshot.generatedFrom.runtimeVersion, 6);", "  assert.equal(snapshot.generatedFrom.runtimeVersion, 7);")
extra = textwrap.dedent(r'''

test('repository machine state is internally consistent and no extra Vibe2 human docs exist', () => {
  const snapshot = generateVibe2Handoff();
  assert.equal(snapshot.version, 2);
  assert.equal(snapshot.consistency.ok, true, snapshot.consistency.errors.join(','));
  assert.deepEqual(snapshot.consistency.errors, []);
  const actual = fs.readdirSync('.').filter((file) => /^VIBE2.*\.md$/i.test(file)).sort();
  assert.deepEqual(actual, ['VIBE2.md']);
});

test('consistency gate rejects an unlisted Vibe2 markdown file and divergent adaptive state', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe2-consistency-'));
  fs.writeFileSync(path.join(tempRoot, 'VIBE2.md'), '# Vibe2\n');
  fs.writeFileSync(path.join(tempRoot, 'VIBE2_STALE.md'), '# stale\n');
  fs.mkdirSync(path.join(tempRoot, 'tools'), { recursive: true });
  fs.mkdirSync(path.join(tempRoot, '.github/workflows'), { recursive: true });
  fs.writeFileSync(path.join(tempRoot, 'tools/vibe2-handoff.mjs'), '');
  fs.writeFileSync(path.join(tempRoot, '.github/workflows/vibe2-24h-runner.yml'), '');
  fs.writeFileSync(path.join(tempRoot, '.github/workflows/vibe2-continuous-core.yml'), '');
  const runtime = JSON.parse(fs.readFileSync('vibe2-runtime.json', 'utf8'));
  const queue = { version: 4, maxConcurrentTasks: 20, tasks: [] };
  const parallelism = { version: 2, currentMax: 10 };
  const experience = { version: 1, records: [] };
  const consistency = validateVibe2MachineState({ runtime, queue, parallelism, experience, repoRoot: tempRoot });
  assert.equal(consistency.ok, false);
  assert.equal(consistency.errors.some((x) => x.startsWith('UNLISTED_VIBE2_MARKDOWN:')), true);
  assert.equal(consistency.errors.includes('PERSISTENT_MAX_OUTSIDE_STEPS'), true);
});

test('planner and worker work-order consume generated machine handoff instead of manual context', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe2-consumers-'));
  const queueFile = path.join(tempRoot, 'queue.json');
  const controlFile = path.join(tempRoot, 'parallelism.json');
  const experienceFile = path.join(tempRoot, 'experience.json');
  const statusFile = path.join(tempRoot, 'status.json');
  const catalogFile = path.join(tempRoot, 'catalog.json');
  fs.writeFileSync(queueFile, JSON.stringify({ version:4, maxConcurrentTasks:20, tasks:[] }));
  fs.writeFileSync(controlFile, JSON.stringify({ version:2, currentMax:8, healthyStreak:0, pressureStreak:0 }));
  fs.writeFileSync(experienceFile, JSON.stringify({ version:1, records:[] }));
  fs.writeFileSync(statusFile, JSON.stringify({ projects:[] }));
  fs.writeFileSync(catalogFile, JSON.stringify({ games:[] }));
  const planned = runVibe2AutoPlanner({ runtimeFile:'vibe2-runtime.json', queueFile, controlFile, experienceFile, statusFile, catalogFile, repoRoot:tempRoot, maxConcurrentTasks:20 });
  assert.equal(planned.machineHandoff.used, true);
  assert.equal(planned.machineHandoff.consistency.ok, true);
  assert.equal(planned.effectivePlannerMax, 8);

  const outputFile = path.join(tempRoot, 'work-order.json');
  const order = runVibeContinuousRunner({ runtimeFile:'vibe2-runtime.json', queueFile, controlFile, experienceFile, outputFile });
  assert.equal(order.machineHandoff.used, true);
  assert.equal(order.machineHandoff.consistency.ok, true);
  assert.equal(order.machineHandoff.currentPersistentMax, 8);
});

test('machine-state E2E reserves work, builds worker order, fans in pressure, and hands off next work', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe2-handoff-e2e-'));
  const queueFile = path.join(tempRoot, 'queue.json');
  const controlFile = path.join(tempRoot, 'parallelism.json');
  const experienceFile = path.join(tempRoot, 'experience.json');
  const batchFile = path.join(tempRoot, 'batch.json');
  const resultFile = path.join(tempRoot, 'results.json');
  const orderFile = path.join(tempRoot, 'work-order.json');
  const tasks = Array.from({ length: 21 }, (_, index) => {
    const n = String(index + 1).padStart(2, '0');
    const gameId = index === 0 ? 'daechung-rpg' : `e2e-${n}`;
    const sourceRoot = index === 0 ? 'web-games/daechung-rpg' : `web-games/e2e-${n}`;
    return { id:`e2e-${n}`, gameId, target:'web', department:'development', type:'implementation', goal:'existing web text maintenance', responsibleFiles:[`${sourceRoot}/index.html`], dependencies:[], priority:'normal', releaseState:'development-confirmed', status:'queued', retries:0, maxRetries:2, ownerDirective:false, requiresOwnerDecision:false, protectedChange:false, paidResourceRequired:false, sourceRoot, estimatedRisk:'low', speculativeEligible:false, evidence:[] };
  });
  fs.writeFileSync(queueFile, JSON.stringify({ version:4, mode:'hierarchical-dag-sharded-work-stealing-queue', maxConcurrentTasks:20, tasks }, null, 2));
  fs.writeFileSync(controlFile, JSON.stringify({ version:2, currentMax:20, healthyStreak:0, pressureStreak:0, lastDecision:'INIT', lastReason:'DEFAULT_20', lastRunId:null, lastUpdatedAt:null, lastTelemetry:null }, null, 2));
  fs.writeFileSync(experienceFile, JSON.stringify({ version:1, records:[] }, null, 2));

  const before = generateVibe2Handoff({ runtimeFile:'vibe2-runtime.json', queueFile, controlFile, experienceFile });
  assert.equal(before.consistency.ok, true);
  assert.equal(before.workState.queuedCount, 21);

  const reserved = runQueueCommand({ command:'reserve-batch', queue:queueFile, control:controlFile, max:'20', output:batchFile });
  assert.equal(reserved.tasks.length, 20);
  const order = runVibeContinuousRunner({ runtimeFile:'vibe2-runtime.json', queueFile, controlFile, experienceFile, outputFile:orderFile, taskId:'e2e-01' });
  assert.equal(order.machineHandoff.used, true);
  assert.equal(order.machineHandoff.consistency.ok, true);
  assert.equal(order.machineHandoff.currentPersistentMax, 20);
  assert.notEqual(order.reason?.startsWith('MACHINE_STATE_INCONSISTENT'), true);

  const now = Date.now();
  const rows = reserved.tasks.map((task, index) => ({
    version:2, taskId:task.id, variant:'primary', outcome:'BLOCKED', blocker:'e2e-pressure', evidence:['actions-run:e2e-machine-handoff'], durationMs:30000,
    metrics:{ requestedMax:20, effectiveMax:20, reservedAt:new Date(now-50000).toISOString(), workerStartedAt:now-30000, workerFinishedAt:now-1000-index, checkoutMs:20000, candidateMs:0, qaMs:0, workerTotalMs:29000, ollamaCacheHit:true, ollamaRuntimeSource:'CACHE' }
  }));
  fs.writeFileSync(resultFile, JSON.stringify({ version:1, results:rows }, null, 2));
  const fanIn = runQueueCommand({ command:'fan-in', queue:queueFile, control:controlFile, input:resultFile });
  assert.equal(fanIn.adaptiveControl.currentMax, 16);
  assert.equal(fanIn.adaptiveControl.lastDecision, 'DOWN');

  const after = generateVibe2Handoff({ runtimeFile:'vibe2-runtime.json', queueFile, controlFile, experienceFile });
  assert.equal(after.consistency.ok, true);
  assert.equal(after.parallelism.currentPersistentMax, 16);
  assert.equal(after.workState.queuedCount, 1);
  assert.equal(after.workState.queuedPreview[0].id, 'e2e-21');
});
''')
text += extra
write(p, text)
