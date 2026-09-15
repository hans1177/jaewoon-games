from pathlib import Path
import json

ROOT = Path('.')

runtime_path = ROOT / 'vibe2-runtime.json'
runtime = json.loads(runtime_path.read_text())
runtime['version'] = 8
runtime.setdefault('documentation', {}).setdefault('machineStateVersions', {})['runtime'] = 8
runtime.setdefault('continuous', {})['refill'] = {
    'mode': 'direct-continuous-dispatch-after-fan-in',
    'targetBranch': 'vibe2-unreal-core',
    'requiresEligibleWork': True,
    'plannerOnRefill': False,
    'maxConcurrentGameTasks': 20
}
qa = runtime.setdefault('qaOptimization', {})
qa['runtimePreflightMode'] = 'syntax-and-machine-state-only'
qa['unitTestsAtReserve'] = False
qa['candidateQaMode'] = 'impact-first-incremental'
qa['fanInRegressionMode'] = 'single-node-test-process'
qa['fanInTestConcurrency'] = 4
qa['fullCoreRegressionOnceAtFanIn'] = True
runtime_path.write_text(json.dumps(runtime, ensure_ascii=False, indent=2) + '\n')

wf_path = ROOT / '.github/workflows/vibe2-continuous-core.yml'
wf = wf_path.read_text()
old_preflight = '''          node --test qa/vibe2-queue-control.test.mjs\n          node --test qa/vibe2-auto-planner.test.mjs\n          node --test qa/vibe2-parallelism-20-contract.test.mjs\n          node --test qa/vibe2-incremental-qa.test.mjs\n          node --test qa/vibe2-parallelism-telemetry.test.mjs\n          node --test qa/vibe2-handoff.test.mjs\n          node tools/vibe2-handoff.mjs --check --output=/tmp/vibe2-handoff-preflight.json >/tmp/vibe2-handoff-preflight.log\n'''
new_preflight = '''          # Unit/regression tests run in PR CI and once at fan-in; reserve only checks executable syntax + live machine state.\n          node tools/vibe2-handoff.mjs --check --output=/tmp/vibe2-handoff-preflight.json >/tmp/vibe2-handoff-preflight.log\n          echo 'VIBE2_RESERVE_PREFLIGHT=LEAN'\n'''
assert old_preflight in wf, 'reserve preflight block changed unexpectedly'
wf = wf.replace(old_preflight, new_preflight, 1)

old_regression = '''          node --test qa/vibe2-auto-planner.test.mjs\n          node --test qa/vibe2-core-engine-motion.test.mjs\n          node --test qa/vibe2-source-worker.test.mjs\n          node --test qa/vibe2-queue-control.test.mjs\n          node --test qa/vibe2-incremental-qa.test.mjs\n          node --test qa/vibe2-parallelism-telemetry.test.mjs\n          node --test qa/vibe2-controller-contract.test.mjs\n          node --test qa/vibe2-candidate-reconcile.test.mjs\n          node --test qa/vibe2-experience-control.test.mjs\n          node --test qa/vibe2-handoff.test.mjs\n'''
new_regression = '''          node --test --test-concurrency=4 \\\n            qa/vibe2-auto-planner.test.mjs \\\n            qa/vibe2-core-engine-motion.test.mjs \\\n            qa/vibe2-source-worker.test.mjs \\\n            qa/vibe2-queue-control.test.mjs \\\n            qa/vibe2-incremental-qa.test.mjs \\\n            qa/vibe2-parallelism-telemetry.test.mjs \\\n            qa/vibe2-controller-contract.test.mjs \\\n            qa/vibe2-candidate-reconcile.test.mjs \\\n            qa/vibe2-experience-control.test.mjs \\\n            qa/vibe2-handoff.test.mjs\n'''
assert old_regression in wf, 'fan-in regression block changed unexpectedly'
wf = wf.replace(old_regression, new_regression, 1)

old_refill_detect = '''          free="$(sed -n 's/^VIBE2_QUEUE_FREE_SLOTS=//p' /tmp/vibe2-summary.log | tail -n1)"\n          if [ "${free:-0}" -gt 0 ]; then echo 'refill=1' >> "$GITHUB_OUTPUT"; else echo 'refill=0' >> "$GITHUB_OUTPUT"; fi\n'''
new_refill_detect = '''          continue_required="$(sed -n 's/^VIBE2_QUEUE_CONTINUE=//p' /tmp/vibe2-summary.log | tail -n1)"\n          if [ "${continue_required:-NO}" = 'YES' ]; then echo 'refill=1' >> "$GITHUB_OUTPUT"; else echo 'refill=0' >> "$GITHUB_OUTPUT"; fi\n'''
assert old_refill_detect in wf, 'refill eligibility block changed unexpectedly'
wf = wf.replace(old_refill_detect, new_refill_detect, 1)

old_refill = '''      - name: Event-driven refill of free slots\n        if: steps.persist.outputs.refill == '1'\n        env:\n          GH_TOKEN: ${{ github.token }}\n        shell: bash\n        run: |\n          set -euo pipefail\n          gh workflow run vibe2-24h-runner.yml --repo "$GITHUB_REPOSITORY" --ref main\n          echo 'VIBE2_EVENT_DRIVEN_REFILL=YES'\n'''
new_refill = '''      - name: Event-driven direct refill of eligible free slots\n        if: steps.persist.outputs.refill == '1'\n        env:\n          GH_TOKEN: ${{ github.token }}\n        shell: bash\n        run: |\n          set -euo pipefail\n          gh workflow run vibe2-continuous-core.yml --repo "$GITHUB_REPOSITORY" --ref vibe2-unreal-core\n          echo 'VIBE2_EVENT_DRIVEN_REFILL=DIRECT_CONTINUOUS'\n'''
assert old_refill in wf, 'refill dispatch block changed unexpectedly'
wf = wf.replace(old_refill, new_refill, 1)
wf_path.write_text(wf)

controller_path = ROOT / 'qa/vibe2-controller-contract.test.mjs'
controller = controller_path.read_text()
controller = controller.replace("assert.equal(runtime.version,7);", "assert.equal(runtime.version,8);")
old_event = '''test('event-driven refill removes hourly-only idle gaps',()=>{\n  assert(workflow.includes('Event-driven refill of free slots'));\n  assert(workflow.includes('gh workflow run vibe2-24h-runner.yml'));\n  assert(safetyNetWorkflow.includes('node tools/vibe2-handoff.mjs --check'));\n  assert(safetyNetWorkflow.includes('node tools/vibe2-auto-planner.mjs'));\n  assert(safetyNetWorkflow.includes('uses: ./.github/workflows/vibe2-continuous-core.yml'));\n  assert.equal(runtime.continuous.wakeMode,'event-driven-plus-hourly-safety-net');\n});\n'''
new_event = '''test('event-driven refill immediately starts the next eligible continuous batch',()=>{\n  assert(workflow.includes('Event-driven direct refill of eligible free slots'));\n  assert(workflow.includes("VIBE2_QUEUE_CONTINUE=//p"));\n  assert(workflow.includes('gh workflow run vibe2-continuous-core.yml --repo "$GITHUB_REPOSITORY" --ref vibe2-unreal-core'));\n  assert(!workflow.includes('gh workflow run vibe2-24h-runner.yml --repo "$GITHUB_REPOSITORY" --ref main'));\n  assert(safetyNetWorkflow.includes('node tools/vibe2-handoff.mjs --check'));\n  assert(safetyNetWorkflow.includes('node tools/vibe2-auto-planner.mjs'));\n  assert(safetyNetWorkflow.includes('uses: ./.github/workflows/vibe2-continuous-core.yml'));\n  assert.equal(runtime.continuous.wakeMode,'event-driven-plus-hourly-safety-net');\n  assert.equal(runtime.continuous.refill.mode,'direct-continuous-dispatch-after-fan-in');\n  assert.equal(runtime.continuous.refill.targetBranch,'vibe2-unreal-core');\n  assert.equal(runtime.continuous.refill.requiresEligibleWork,true);\n  assert.equal(runtime.continuous.refill.plannerOnRefill,false);\n});\n\ntest('reserve preflight stays lean while fan-in owns the single full regression',()=>{\n  const reservePart=workflow.split('  model_cache:')[0];\n  assert(reservePart.includes("VIBE2_RESERVE_PREFLIGHT=LEAN"));\n  assert(!reservePart.includes('node --test qa/vibe2-queue-control.test.mjs'));\n  assert(workflow.includes('node --test --test-concurrency=4'));\n  assert.equal(runtime.qaOptimization.runtimePreflightMode,'syntax-and-machine-state-only');\n  assert.equal(runtime.qaOptimization.unitTestsAtReserve,false);\n  assert.equal(runtime.qaOptimization.candidateQaMode,'impact-first-incremental');\n  assert.equal(runtime.qaOptimization.fanInRegressionMode,'single-node-test-process');\n  assert.equal(runtime.qaOptimization.fanInTestConcurrency,4);\n});\n'''
assert old_event in controller, 'controller event test changed unexpectedly'
controller = controller.replace(old_event, new_event, 1)
controller_path.write_text(controller)

handoff_path = ROOT / 'qa/vibe2-handoff.test.mjs'
handoff = handoff_path.read_text()
handoff = handoff.replace('version: 7,', 'version: 8,')
handoff = handoff.replace('snapshot.generatedFrom.runtimeVersion, 7', 'snapshot.generatedFrom.runtimeVersion, 8')
handoff_path.write_text(handoff)

# Workflow cannot be pushed by GITHUB_TOKEN when changed; save verified snapshot for connector finalization.
snap = ROOT / '.vibe2/workflow-snapshots/vibe2-continuous-core.yml'
snap.parent.mkdir(parents=True, exist_ok=True)
snap.write_text(wf)
