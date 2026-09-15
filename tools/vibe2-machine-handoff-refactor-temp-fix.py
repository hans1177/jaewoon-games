from pathlib import Path

SCRIPT = Path('tools/vibe2-machine-handoff-refactor-temp.py')
WORKFLOW = Path('.github/workflows/vibe2-continuous-core.yml')


def patch_source():
    text = SCRIPT.read_text(encoding='utf-8')

    old_paths_patch = """text = replace_once(text, old_paths, new_paths, 'core qa push path')\ntext = replace_once(text, old_paths, new_paths, 'core qa pr path')"""
    new_paths_patch = """if text.count(old_paths) != 2:\n    raise SystemExit(f'core qa workflow paths: expected two matches, got {text.count(old_paths)}')\ntext = text.replace(old_paths, new_paths, 2)"""
    if old_paths_patch not in text:
        raise SystemExit('core qa duplicate path patch target missing')
    text = text.replace(old_paths_patch, new_paths_patch, 1)

    old_preflight = '''text = replace_once(text, "          node --test qa/vibe2-parallelism-telemetry.test.mjs\\n", "          node --test qa/vibe2-parallelism-telemetry.test.mjs\\n          node --test qa/vibe2-handoff.test.mjs\\n          node tools/vibe2-handoff.mjs --check --output=/tmp/vibe2-handoff-preflight.json >/tmp/vibe2-handoff-preflight.log\\n", 'continuous preflight handoff')'''
    new_preflight = '''text = replace_once(\n    text,\n    "          node --test qa/vibe2-incremental-qa.test.mjs\\n          node --test qa/vibe2-parallelism-telemetry.test.mjs\\n\\n      - name: Reserve conflict-free DAG batch\\n",\n    "          node --test qa/vibe2-incremental-qa.test.mjs\\n          node --test qa/vibe2-parallelism-telemetry.test.mjs\\n          node --test qa/vibe2-handoff.test.mjs\\n          node tools/vibe2-handoff.mjs --check --output=/tmp/vibe2-handoff-preflight.json >/tmp/vibe2-handoff-preflight.log\\n\\n      - name: Reserve conflict-free DAG batch\\n",\n    'continuous reserve preflight handoff',\n)'''
    if old_preflight not in text:
        raise SystemExit('continuous preflight source patch target missing')
    text = text.replace(old_preflight, new_preflight, 1)

    SCRIPT.write_text(text, encoding='utf-8')


def replace_once_file(path, old, new, label):
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, got {count}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')


def migrate_queue_schema_v5():
    replace_once_file('vibe2-runtime.json', '"queue": 4,', '"queue": 5,', 'runtime queue schema version')
    replace_once_file('.vibe2/queue.json', '"version": 4,', '"version": 5,', 'persisted queue schema version')

    for file_name in ['qa/vibe2-handoff.test.mjs', 'qa/vibe2-auto-planner.test.mjs']:
        file = Path(file_name)
        text = file.read_text(encoding='utf-8')
        text = text.replace('version:4', 'version:5')
        text = text.replace('version: 4,', 'version: 5,')
        text = text.replace('snapshot.generatedFrom.queueVersion, 4', 'snapshot.generatedFrom.queueVersion, 5')
        file.write_text(text, encoding='utf-8')


def patch_e2e_fixture():
    path = Path('qa/vibe2-handoff.test.mjs')
    text = path.read_text(encoding='utf-8')

    old_return = "    return { id:`e2e-${n}`, gameId, target:'web', department:'development', type:'implementation', goal:'existing web text maintenance', responsibleFiles:[`${sourceRoot}/index.html`], dependencies:[], priority:'normal', releaseState:'development-confirmed', status:'queued', retries:0, maxRetries:2, ownerDirective:false, requiresOwnerDecision:false, protectedChange:false, paidResourceRequired:false, sourceRoot, estimatedRisk:'low', speculativeEligible:false, evidence:[] };"
    new_return = "    const analysisOnly = index === 0;\n    return { id:`e2e-${n}`, gameId, target:'web', department:analysisOnly?'qa':'development', type:analysisOnly?'qa':'implementation', goal:analysisOnly?'inspect existing web source':'existing web text maintenance', responsibleFiles:analysisOnly?[]:[`${sourceRoot}/index.html`], dependencies:[], priority:'normal', releaseState:'development-confirmed', status:'queued', retries:0, maxRetries:2, ownerDirective:false, requiresOwnerDecision:false, protectedChange:false, paidResourceRequired:false, sourceRoot, estimatedRisk:'low', speculativeEligible:false, evidence:[] };"
    if old_return not in text:
        raise SystemExit('E2E generated task fixture target missing')
    text = text.replace(old_return, new_return, 1)

    old_asserts = """  assert.equal(order.machineHandoff.used, true);\n  assert.equal(order.machineHandoff.consistency.ok, true);\n  assert.equal(order.machineHandoff.currentPersistentMax, 20);\n  assert.notEqual(order.reason?.startsWith('MACHINE_STATE_INCONSISTENT'), true);"""
    new_asserts = """  assert.equal(order.run, true);\n  assert.equal(order.executionRoute, 'analysis-only');\n  assert.equal(order.machineHandoff.used, true);\n  assert.equal(order.machineHandoff.consistency.ok, true);\n  assert.equal(order.machineHandoff.currentPersistentMax, 20);\n  assert.notEqual(order.reason?.startsWith('MACHINE_STATE_INCONSISTENT'), true);"""
    if old_asserts not in text:
        raise SystemExit('E2E handoff assertion target missing')
    text = text.replace(old_asserts, new_asserts, 1)

    path.write_text(text, encoding='utf-8')


def fix_generated_yaml():
    text = WORKFLOW.read_text(encoding='utf-8')
    start_token = '- name: Upload generated machine handoff\n'
    end_token = '      - name: Aggregate Vibe2 parallelism telemetry\n'
    start = text.find(start_token)
    if start >= 0:
        end = text.find(end_token, start)
        if end < 0:
            raise SystemExit('generated workflow upload block end missing')
        block = text[start:end]
        indented = ''.join(('      ' + line if line.strip() else line) for line in block.splitlines(True))
        text = text[:start] + indented + text[end:]
        WORKFLOW.write_text(text, encoding='utf-8')

    migrate_queue_schema_v5()
    patch_e2e_fixture()


if __name__ == '__main__':
    import sys
    mode = sys.argv[1] if len(sys.argv) > 1 else 'before'
    if mode == 'before':
        patch_source()
    elif mode == 'after':
        fix_generated_yaml()
    else:
        raise SystemExit(f'unknown mode: {mode}')

# Temporary trigger marker; removed with this script after successful verification.
