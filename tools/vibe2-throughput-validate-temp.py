from pathlib import Path
import json

ROOT = Path('.')

# Central runtime contract sync.
runtime_path = ROOT / 'vibe2-runtime.json'
runtime = json.loads(runtime_path.read_text())
runtime['version'] = 8
runtime.setdefault('documentation', {}).setdefault('machineStateVersions', {})['runtime'] = 8
continuous = runtime.setdefault('continuous', {})
continuous.pop('refillMode', None)
continuous.pop('refillRef', None)
continuous['refill'] = {
    'mode': 'direct-continuous-dispatch-after-fan-in',
    'targetBranch': 'vibe2-unreal-core',
    'requiresEligibleWork': True,
    'plannerOnRefill': False,
    'maxConcurrentGameTasks': 20
}
qa = runtime.setdefault('qaOptimization', {})
qa['reservePreflight'] = 'syntax-and-machine-state-only'
qa['duplicateFullRegressionBeforeReserve'] = False
qa['perWorkerQa'] = 'impact-first-incremental'
qa['fanInQa'] = 'single-node-test-process'
qa['fanInTestConcurrency'] = 4
qa['fullCoreRegressionOnceAtFanIn'] = True
runtime_path.write_text(json.dumps(runtime, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

# Apply workflow changes in the validation workspace only. The verified blob is saved as a snapshot
# because GitHub Actions cannot push workflow-file changes with the default token.
wf_path = ROOT / '.github/workflows/vibe2-continuous-core.yml'
wf = wf_path.read_text(encoding='utf-8')
old_regression = '''          node --test qa/vibe2-auto-planner.test.mjs\n          node --test qa/vibe2-core-engine-motion.test.mjs\n          node --test qa/vibe2-source-worker.test.mjs\n          node --test qa/vibe2-queue-control.test.mjs\n          node --test qa/vibe2-incremental-qa.test.mjs\n          node --test qa/vibe2-parallelism-telemetry.test.mjs\n          node --test qa/vibe2-controller-contract.test.mjs\n          node --test qa/vibe2-candidate-reconcile.test.mjs\n          node --test qa/vibe2-experience-control.test.mjs\n          node --test qa/vibe2-handoff.test.mjs\n'''
new_regression = '''          node --test --test-concurrency=4 \\\n            qa/vibe2-auto-planner.test.mjs \\\n            qa/vibe2-core-engine-motion.test.mjs \\\n            qa/vibe2-source-worker.test.mjs \\\n            qa/vibe2-queue-control.test.mjs \\\n            qa/vibe2-incremental-qa.test.mjs \\\n            qa/vibe2-parallelism-telemetry.test.mjs \\\n            qa/vibe2-controller-contract.test.mjs \\\n            qa/vibe2-candidate-reconcile.test.mjs \\\n            qa/vibe2-experience-control.test.mjs \\\n            qa/vibe2-handoff.test.mjs\n'''
assert old_regression in wf, 'fan-in regression block changed unexpectedly'
wf = wf.replace(old_regression, new_regression, 1)
old_detect = '''          free="$(sed -n 's/^VIBE2_QUEUE_FREE_SLOTS=//p' /tmp/vibe2-summary.log | tail -n1)"\n          if [ "${free:-0}" -gt 0 ]; then echo 'refill=1' >> "$GITHUB_OUTPUT"; else echo 'refill=0' >> "$GITHUB_OUTPUT"; fi\n'''
new_detect = '''          continue_required="$(sed -n 's/^VIBE2_QUEUE_CONTINUE=//p' /tmp/vibe2-summary.log | tail -n1)"\n          if [ "${continue_required:-NO}" = 'YES' ]; then echo 'refill=1' >> "$GITHUB_OUTPUT"; else echo 'refill=0' >> "$GITHUB_OUTPUT"; fi\n'''
assert old_detect in wf, 'refill eligibility block changed unexpectedly'
wf = wf.replace(old_detect, new_detect, 1)
old_dispatch = '''      - name: Event-driven refill of free slots\n        if: steps.persist.outputs.refill == '1'\n        env:\n          GH_TOKEN: ${{ github.token }}\n        shell: bash\n        run: |\n          set -euo pipefail\n          gh workflow run vibe2-24h-runner.yml --repo "$GITHUB_REPOSITORY" --ref vibe2-unreal-core\n          echo 'VIBE2_EVENT_DRIVEN_REFILL=YES'\n'''
new_dispatch = '''      - name: Event-driven direct refill of eligible free slots\n        if: steps.persist.outputs.refill == '1'\n        env:\n          GH_TOKEN: ${{ github.token }}\n        shell: bash\n        run: |\n          set -euo pipefail\n          gh workflow run vibe2-continuous-core.yml --repo "$GITHUB_REPOSITORY" --ref vibe2-unreal-core\n          echo 'VIBE2_EVENT_DRIVEN_REFILL=DIRECT_CONTINUOUS'\n'''
assert old_dispatch in wf, 'refill dispatch block changed unexpectedly'
wf = wf.replace(old_dispatch, new_dispatch, 1)
wf_path.write_text(wf, encoding='utf-8')

# Contract tests.
controller_path = ROOT / 'qa/vibe2-controller-contract.test.mjs'
controller = controller_path.read_text(encoding='utf-8')
controller = controller.replace("assert.equal(runtime.version,7);", "assert.equal(runtime.version,8);")
controller = controller.replace("  assert(workflow.includes('node --test qa/vibe2-controller-contract.test.mjs'));", "  assert(workflow.includes('node --test --test-concurrency=4'));\n  assert(workflow.includes('qa/vibe2-controller-contract.test.mjs'));\n  assert.equal(runtime.qaOptimization.fanInQa,'single-node-test-process');\n  assert.equal(runtime.qaOptimization.fanInTestConcurrency,4);")
old_event = '''test('event-driven refill targets the Vibe2 control branch and not main',()=>{\n  assert(workflow.includes('Event-driven refill of free slots'));\n  assert(workflow.includes('gh workflow run vibe2-24h-runner.yml'));\n  assert(workflow.includes('--ref vibe2-unreal-core'));\n  assert(!workflow.includes('gh workflow run vibe2-24h-runner.yml --repo "$GITHUB_REPOSITORY" --ref main'));\n  assert.equal(runtime.continuous.refillRef,'vibe2-unreal-core');\n  assert.equal(runtime.continuous.refillMode,'fan-in-event-driven-control-branch');\n  assert(safetyNetWorkflow.includes('node tools/vibe2-handoff.mjs --check'));\n  assert(safetyNetWorkflow.includes('node tools/vibe2-auto-planner.mjs'));\n  assert(safetyNetWorkflow.includes('uses: ./.github/workflows/vibe2-continuous-core.yml'));\n  assert.equal(runtime.continuous.wakeMode,'event-driven-plus-hourly-safety-net');\n});\n'''
new_event = '''test('event-driven refill dispatches the next eligible batch directly on the Vibe2 control branch',()=>{\n  assert(workflow.includes('Event-driven direct refill of eligible free slots'));\n  assert(workflow.includes('VIBE2_QUEUE_CONTINUE=//p'));\n  assert(workflow.includes('gh workflow run vibe2-continuous-core.yml --repo "$GITHUB_REPOSITORY" --ref vibe2-unreal-core'));\n  assert(!workflow.includes('gh workflow run vibe2-24h-runner.yml --repo "$GITHUB_REPOSITORY" --ref main'));\n  assert.equal(runtime.continuous.refill.mode,'direct-continuous-dispatch-after-fan-in');\n  assert.equal(runtime.continuous.refill.targetBranch,'vibe2-unreal-core');\n  assert.equal(runtime.continuous.refill.requiresEligibleWork,true);\n  assert.equal(runtime.continuous.refill.plannerOnRefill,false);\n  assert.equal(runtime.continuous.refill.maxConcurrentGameTasks,20);\n  assert(safetyNetWorkflow.includes('node tools/vibe2-handoff.mjs --check'));\n  assert(safetyNetWorkflow.includes('node tools/vibe2-auto-planner.mjs'));\n  assert(safetyNetWorkflow.includes('uses: ./.github/workflows/vibe2-continuous-core.yml'));\n  assert.equal(runtime.continuous.wakeMode,'event-driven-plus-hourly-safety-net');\n});\n'''
assert old_event in controller, 'controller refill test changed unexpectedly'
controller = controller.replace(old_event, new_event, 1)
controller_path.write_text(controller, encoding='utf-8')

handoff_path = ROOT / 'qa/vibe2-handoff.test.mjs'
handoff = handoff_path.read_text(encoding='utf-8')
handoff = handoff.replace('version: 7,', 'version: 8,')
handoff = handoff.replace('snapshot.generatedFrom.runtimeVersion, 7', 'snapshot.generatedFrom.runtimeVersion, 8')
handoff_path.write_text(handoff, encoding='utf-8')

snapshot = ROOT / '.vibe2/workflow-snapshots/vibe2-continuous-core.yml'
snapshot.parent.mkdir(parents=True, exist_ok=True)
snapshot.write_text(wf, encoding='utf-8')
