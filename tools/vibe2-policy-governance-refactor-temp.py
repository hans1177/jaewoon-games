from pathlib import Path
import json

root = Path('.')
runtime_path = root / 'vibe2-runtime.json'
runtime = json.loads(runtime_path.read_text(encoding='utf-8'))

assert runtime['version'] == 7
runtime['version'] = 8
runtime['documentation']['machineStateVersions']['runtime'] = 8
work = runtime['workManagement']
work['preWorkStateRefresh'] = {
    'automatic': True,
    'mode': 'read-latest-machine-state-and-regenerate-handoff',
    'sources': [
        'vibe2-runtime.json',
        '.vibe2/queue.json',
        '.vibe2/parallelism-control.json',
        '.vibe2/experience.json'
    ],
    'requiredBeforeConsumers': ['planner', 'reserve', 'worker', 'fan-in']
}
work['policyGovernance'] = {
    'mode': 'owner-approval-required',
    'automaticCandidatePatch': True,
    'automaticApply': False,
    'implementationContractSyncRequired': True,
    'postWorkMachineStateSync': True,
    'ciDriftGate': True,
    'protectedPolicyAreas': [
        'parallelism-and-backpressure',
        'branch-and-main-promotion',
        'protected-semantics-and-save-contracts',
        'authority-and-autonomy',
        'documentation-governance'
    ]
}
runtime_path.write_text(json.dumps(runtime, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

handoff_path = root / 'tools/vibe2-handoff.mjs'
h = handoff_path.read_text(encoding='utf-8')
old = """  const continuous = runtime.continuous || {};\n  const add = (condition, code) => { if (condition) errors.push(code); };"""
new = """  const continuous = runtime.continuous || {};\n  const refresh = work.preWorkStateRefresh || {};\n  const governance = work.policyGovernance || {};\n  const add = (condition, code) => { if (condition) errors.push(code); };"""
assert old in h
h = h.replace(old, new, 1)

old = """  const consumers = Array.isArray(work.handoffConsumers) ? work.handoffConsumers : [];\n  for (const consumer of ['planner', 'reserve', 'worker', 'fan-in']) add(!consumers.includes(consumer), `HANDOFF_CONSUMER_MISSING:${consumer}`);\n\n  add(clean(state.queue) !== clean(sources.queue), 'QUEUE_SOURCE_DIVERGED');"""
new = """  const consumers = Array.isArray(work.handoffConsumers) ? work.handoffConsumers : [];\n  for (const consumer of ['planner', 'reserve', 'worker', 'fan-in']) add(!consumers.includes(consumer), `HANDOFF_CONSUMER_MISSING:${consumer}`);\n\n  add(refresh.automatic !== true, 'PREWORK_STATE_REFRESH_NOT_AUTOMATIC');\n  add(refresh.mode !== 'read-latest-machine-state-and-regenerate-handoff', 'PREWORK_STATE_REFRESH_MODE_INVALID');\n  add(!sameJson(Array.isArray(refresh.sources) ? refresh.sources : [], Array.isArray(work.handoffReadOrder) ? work.handoffReadOrder : []), 'PREWORK_STATE_REFRESH_SOURCES_DIVERGED');\n  const refreshConsumers = Array.isArray(refresh.requiredBeforeConsumers) ? refresh.requiredBeforeConsumers : [];\n  for (const consumer of ['planner', 'reserve', 'worker', 'fan-in']) add(!refreshConsumers.includes(consumer), `PREWORK_REFRESH_CONSUMER_MISSING:${consumer}`);\n\n  add(governance.mode !== 'owner-approval-required', 'POLICY_GOVERNANCE_MODE_INVALID');\n  add(governance.automaticCandidatePatch !== true, 'POLICY_CANDIDATE_PATCH_DISABLED');\n  add(governance.automaticApply !== false, 'AUTOMATIC_POLICY_APPLY_ENABLED');\n  add(governance.implementationContractSyncRequired !== true, 'IMPLEMENTATION_CONTRACT_SYNC_NOT_REQUIRED');\n  add(governance.postWorkMachineStateSync !== true, 'POSTWORK_MACHINE_STATE_SYNC_DISABLED');\n  add(governance.ciDriftGate !== true, 'POLICY_DRIFT_GATE_DISABLED');\n  const protectedAreas = Array.isArray(governance.protectedPolicyAreas) ? governance.protectedPolicyAreas : [];\n  for (const area of ['parallelism-and-backpressure', 'branch-and-main-promotion', 'protected-semantics-and-save-contracts', 'authority-and-autonomy', 'documentation-governance']) {\n    add(!protectedAreas.includes(area), `PROTECTED_POLICY_AREA_MISSING:${area}`);\n  }\n\n  add(clean(state.queue) !== clean(sources.queue), 'QUEUE_SOURCE_DIVERGED');"""
assert old in h
h = h.replace(old, new, 1)

old = """    workPolicy: {\n      largeWorkExecution: work.largeWorkExecution || 'phased-until-complete',\n      splitRule: work.splitRule || 'split-by-implementation-phase-not-artificial-file-count',\n      ownerDirectivePreemptsAutonomy: work.ownerDirectivePreemptsAutonomy !== false,\n      humanMaintainedHandoff: work.humanMaintainedHandoff === true\n    },\n    workState: {"""
new = """    workPolicy: {\n      largeWorkExecution: work.largeWorkExecution || 'phased-until-complete',\n      splitRule: work.splitRule || 'split-by-implementation-phase-not-artificial-file-count',\n      ownerDirectivePreemptsAutonomy: work.ownerDirectivePreemptsAutonomy !== false,\n      humanMaintainedHandoff: work.humanMaintainedHandoff === true\n    },\n    governance: {\n      preWorkStateRefresh: {\n        automatic: work.preWorkStateRefresh?.automatic === true,\n        mode: clean(work.preWorkStateRefresh?.mode) || null,\n        sources: Array.isArray(work.preWorkStateRefresh?.sources) ? [...work.preWorkStateRefresh.sources] : [],\n        requiredBeforeConsumers: Array.isArray(work.preWorkStateRefresh?.requiredBeforeConsumers) ? [...work.preWorkStateRefresh.requiredBeforeConsumers] : []\n      },\n      policy: {\n        mode: clean(work.policyGovernance?.mode) || null,\n        automaticCandidatePatch: work.policyGovernance?.automaticCandidatePatch === true,\n        automaticApply: work.policyGovernance?.automaticApply === true,\n        implementationContractSyncRequired: work.policyGovernance?.implementationContractSyncRequired === true,\n        postWorkMachineStateSync: work.policyGovernance?.postWorkMachineStateSync === true,\n        ciDriftGate: work.policyGovernance?.ciDriftGate === true,\n        protectedPolicyAreas: Array.isArray(work.policyGovernance?.protectedPolicyAreas) ? [...work.policyGovernance.protectedPolicyAreas] : []\n      }\n    },\n    workState: {"""
assert old in h
h = h.replace(old, new, 1)
handoff_path.write_text(h, encoding='utf-8')

qa_path = root / 'qa/vibe2-handoff.test.mjs'
q = qa_path.read_text(encoding='utf-8')
q = q.replace('    version: 7,', '    version: 8,', 1)
old = """      handoffReadOrder: ['vibe2-runtime.json', '.vibe2/queue.json']\n    },"""
new = """      handoffReadOrder: ['vibe2-runtime.json', '.vibe2/queue.json'],\n      preWorkStateRefresh: { automatic: true, mode: 'read-latest-machine-state-and-regenerate-handoff', sources: ['vibe2-runtime.json', '.vibe2/queue.json'], requiredBeforeConsumers: ['planner', 'reserve', 'worker', 'fan-in'] },\n      policyGovernance: { mode: 'owner-approval-required', automaticCandidatePatch: true, automaticApply: false, implementationContractSyncRequired: true, postWorkMachineStateSync: true, ciDriftGate: true, protectedPolicyAreas: ['parallelism-and-backpressure', 'branch-and-main-promotion', 'protected-semantics-and-save-contracts', 'authority-and-autonomy', 'documentation-governance'] }\n    },"""
assert old in q
q = q.replace(old, new, 1)
old = """  assert.equal(first.workPolicy.largeWorkExecution, 'phased-until-complete');\n  assert.equal(first.workState.taskCount, 4);"""
new = """  assert.equal(first.workPolicy.largeWorkExecution, 'phased-until-complete');\n  assert.equal(first.governance.preWorkStateRefresh.automatic, true);\n  assert.equal(first.governance.policy.mode, 'owner-approval-required');\n  assert.equal(first.governance.policy.automaticApply, false);\n  assert.equal(first.governance.policy.ciDriftGate, true);\n  assert.equal(first.workState.taskCount, 4);"""
assert old in q
q = q.replace(old, new, 1)
q = q.replace('  assert.equal(snapshot.generatedFrom.runtimeVersion, 7);', '  assert.equal(snapshot.generatedFrom.runtimeVersion, 8);', 1)
old = """  assert.equal(snapshot.workPolicy.humanMaintainedHandoff, false);\n  assert.equal(snapshot.parallelism.configuredMax, 20);"""
new = """  assert.equal(snapshot.workPolicy.humanMaintainedHandoff, false);\n  assert.equal(snapshot.governance.preWorkStateRefresh.automatic, true);\n  assert.equal(snapshot.governance.policy.mode, 'owner-approval-required');\n  assert.equal(snapshot.governance.policy.automaticCandidatePatch, true);\n  assert.equal(snapshot.governance.policy.automaticApply, false);\n  assert.equal(snapshot.governance.policy.implementationContractSyncRequired, true);\n  assert.equal(snapshot.governance.policy.postWorkMachineStateSync, true);\n  assert.equal(snapshot.governance.policy.ciDriftGate, true);\n  assert.equal(snapshot.parallelism.configuredMax, 20);"""
assert old in q
q = q.replace(old, new, 1)
insert_after = """test('consistency gate rejects an unlisted Vibe2 markdown file and divergent adaptive state', () => {"""
new_test = """test('consistency gate rejects disabled pre-work refresh or automatic protected-policy apply', () => {\n  const runtime = JSON.parse(fs.readFileSync('vibe2-runtime.json', 'utf8'));\n  runtime.workManagement.preWorkStateRefresh.automatic = false;\n  runtime.workManagement.policyGovernance.automaticApply = true;\n  const queue = { version: 5, maxConcurrentTasks: 20, tasks: [] };\n  const parallelism = { version: 2, currentMax: 20 };\n  const experience = { version: 1, records: [] };\n  const consistency = validateVibe2MachineState({ runtime, queue, parallelism, experience, repoRoot: null });\n  assert.equal(consistency.ok, false);\n  assert.equal(consistency.errors.includes('PREWORK_STATE_REFRESH_NOT_AUTOMATIC'), true);\n  assert.equal(consistency.errors.includes('AUTOMATIC_POLICY_APPLY_ENABLED'), true);\n});\n\n"""
assert insert_after in q
q = q.replace(insert_after, new_test + insert_after, 1)
qa_path.write_text(q, encoding='utf-8')

controller_path = root / 'qa/vibe2-controller-contract.test.mjs'
c = controller_path.read_text(encoding='utf-8')
c = c.replace('  assert.equal(runtime.version,7);', '  assert.equal(runtime.version,8);', 1)
old = """  assert.equal(runtime.workManagement.machineContextRequired,true);\n  assert.deepEqual(runtime.workManagement.handoffConsumers,['planner','reserve','worker','fan-in']);"""
new = """  assert.equal(runtime.workManagement.machineContextRequired,true);\n  assert.deepEqual(runtime.workManagement.handoffConsumers,['planner','reserve','worker','fan-in']);\n  assert.equal(runtime.workManagement.preWorkStateRefresh.automatic,true);\n  assert.equal(runtime.workManagement.preWorkStateRefresh.mode,'read-latest-machine-state-and-regenerate-handoff');\n  assert.deepEqual(runtime.workManagement.preWorkStateRefresh.requiredBeforeConsumers,['planner','reserve','worker','fan-in']);\n  assert.equal(runtime.workManagement.policyGovernance.mode,'owner-approval-required');\n  assert.equal(runtime.workManagement.policyGovernance.automaticCandidatePatch,true);\n  assert.equal(runtime.workManagement.policyGovernance.automaticApply,false);\n  assert.equal(runtime.workManagement.policyGovernance.implementationContractSyncRequired,true);\n  assert.equal(runtime.workManagement.policyGovernance.postWorkMachineStateSync,true);\n  assert.equal(runtime.workManagement.policyGovernance.ciDriftGate,true);"""
assert old in c
c = c.replace(old, new, 1)
controller_path.write_text(c, encoding='utf-8')

vibe_path = root / 'VIBE2.md'
v = vibe_path.read_text(encoding='utf-8')
needle = "작업량이 크면 파일 개수로 억지 분할하지 않고 **검증 가능한 구현 단계로 나눠 연속 진행**한다. 새 작업자는 위 기계 파일을 순서대로 읽고 자동 인수인계 출력을 확인한 뒤 이어서 작업한다.\n"
replacement = needle + "\n작업 시작 전 운영 상태(`queue / parallelism / experience / handoff`)는 자동으로 최신 상태를 읽고 다시 생성한다. 구현과 중앙 계약이 어긋나면 후보 패치는 만들 수 있지만 핵심 정책은 자동 적용하지 않으며 사용자 승인 후에만 변경한다. 작업 종료 시 기계 상태를 동기화하고 CI가 문서-코드 정책 드리프트를 차단한다.\n"
assert needle in v
v = v.replace(needle, replacement, 1)
vibe_path.write_text(v, encoding='utf-8')

# Guard against stale v7 contract assertions in Vibe2 machine-state code/tests.
for p in [qa_path, controller_path, handoff_path, runtime_path]:
    text = p.read_text(encoding='utf-8')
    assert 'runtimeVersion, 7' not in text
    assert 'runtime.version,7' not in text

print('VIBE2_POLICY_GOVERNANCE_REFACTOR=APPLIED')
