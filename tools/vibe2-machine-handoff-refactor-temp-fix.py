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

    handoff = Path('qa/vibe2-handoff.test.mjs')
    text = handoff.read_text(encoding='utf-8')
    text = text.replace('version:4', 'version:5')
    text = text.replace('version: 4,', 'version: 5,')
    text = text.replace('snapshot.generatedFrom.queueVersion, 4', 'snapshot.generatedFrom.queueVersion, 5')
    target = "  assert.equal(order.machineHandoff.currentPersistentMax, 20);\n  assert.notEqual(order.reason?.startsWith('MACHINE_STATE_INCONSISTENT'), true);"
    diagnostic = "  assert.ok(order.machineHandoff, `missing machine handoff: ${JSON.stringify(order)}`);\n  assert.equal(order.machineHandoff.currentPersistentMax, 20);\n  assert.notEqual(order.reason?.startsWith('MACHINE_STATE_INCONSISTENT'), true);"
    if target not in text:
        raise SystemExit('E2E machine handoff diagnostic target missing')
    text = text.replace(target, diagnostic, 1)
    handoff.write_text(text, encoding='utf-8')

    planner = Path('qa/vibe2-auto-planner.test.mjs')
    text = planner.read_text(encoding='utf-8').replace('version:4', 'version:5').replace('version: 4,', 'version: 5,')
    planner.write_text(text, encoding='utf-8')


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


if __name__ == '__main__':
    import sys
    mode = sys.argv[1] if len(sys.argv) > 1 else 'before'
    if mode == 'before':
        patch_source()
    elif mode == 'after':
        fix_generated_yaml()
    else:
        raise SystemExit(f'unknown mode: {mode}')
