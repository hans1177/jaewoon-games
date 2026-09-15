from pathlib import Path

SCRIPT = Path('tools/vibe2-machine-handoff-refactor-temp.py')
WORKFLOW = Path('.github/workflows/vibe2-continuous-core.yml')


def patch_source():
    text = SCRIPT.read_text(encoding='utf-8')
    old = """text = replace_once(text, old_paths, new_paths, 'core qa push path')\ntext = replace_once(text, old_paths, new_paths, 'core qa pr path')"""
    new = """if text.count(old_paths) != 2:\n    raise SystemExit(f'core qa workflow paths: expected two matches, got {text.count(old_paths)}')\ntext = text.replace(old_paths, new_paths, 2)"""
    if old not in text:
        raise SystemExit('temporary refactor source patch target missing')
    SCRIPT.write_text(text.replace(old, new, 1), encoding='utf-8')


def fix_generated_yaml():
    text = WORKFLOW.read_text(encoding='utf-8')
    start_token = '- name: Upload generated machine handoff\n'
    end_token = '      - name: Aggregate Vibe2 parallelism telemetry\n'
    start = text.find(start_token)
    if start < 0:
        return
    end = text.find(end_token, start)
    if end < 0:
        raise SystemExit('generated workflow upload block end missing')
    block = text[start:end]
    indented = ''.join(('      ' + line if line.strip() else line) for line in block.splitlines(True))
    WORKFLOW.write_text(text[:start] + indented + text[end:], encoding='utf-8')


if __name__ == '__main__':
    import sys
    mode = sys.argv[1] if len(sys.argv) > 1 else 'before'
    if mode == 'before':
        patch_source()
    elif mode == 'after':
        fix_generated_yaml()
    else:
        raise SystemExit(f'unknown mode: {mode}')
