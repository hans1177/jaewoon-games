#!/usr/bin/env python3
"""최상위 local 한도(Luau 레지스터 200) 측정·자동 조절.

사용:
  python3 tools/luau_local_budget.py check <file.luau> [--min 10]   # 남은 여유 측정, 부족하면 실패(exit 1)
  python3 tools/luau_local_budget.py fix   <file.luau> [--target 20] # 여유가 target 이상 될 때까지 자동으로 do 블록화

여유(headroom) = 청크 맨 앞에 local 을 몇 개 더 만들 수 있는지(luau-compile 로 실측, 최대 사용 지점 기준).
자동 조절: 최상위 `local 이름 = ...` 중 그 이름이 바로 뒤 몇 줄에서만 쓰이고(이후 참조 없음),
그 사이에 다른 최상위 local 선언이 없는 구간을 `do ... end` 로 감싼다. 감쌀 때마다 컴파일을 다시 확인한다.
"""
import os
import re
import subprocess
import sys
import tempfile

LUAU_DIR = os.environ.get("LUAU_DIR", "/tmp/luau")
COMPILE = os.environ.get("LUAU_COMPILE") or os.path.join(LUAU_DIR, "luau-compile")


def compiles(text):
    with tempfile.NamedTemporaryFile("w", suffix=".luau", delete=False, encoding="utf-8") as f:
        f.write(text)
        path = f.name
    try:
        r = subprocess.run([COMPILE, path], stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True, errors="replace")
        return r.returncode == 0 and "CompileError" not in r.stderr, r.stderr
    finally:
        os.unlink(path)


def headroom(text, cap=64):
    ok, _ = compiles(text)
    if not ok:
        return -1
    lo, hi = 0, cap
    while lo < hi:  # 붙일 수 있는 최대 local 개수 (이분 탐색)
        mid = (lo + hi + 1) // 2
        # 파일 맨 앞(첫 줄 지시문 뒤)에 넣어야 청크 전체의 최대 사용 지점에 더해진다.
        first, _, rest = text.partition("\n")
        probe = first + "\n" + "\n".join(f"local __budget_probe_{i} = {{}}" for i in range(mid)) + "\n" + rest
        if compiles(probe)[0]:
            lo = mid
        else:
            hi = mid - 1
    return lo


TOP_LOCAL = re.compile(r"^local\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?::[^=]+)?=\s*(.*)$")


def candidates(lines):
    """감쌀 수 있는 (시작, 끝) 줄 구간 목록. 끝 = 이름을 마지막으로 쓰는 줄."""
    out = []
    for i, line in enumerate(lines):
        m = TOP_LOCAL.match(line)
        if not m:
            continue
        name = m.group(1)
        word = re.compile(r"(?<![\w.:])" + re.escape(name) + r"(?!\w)")
        last = i
        for j in range(i + 1, len(lines)):
            if word.search(lines[j]):
                last = j
        if last == i or last - i > 40:
            continue
        block = lines[i + 1:last + 1]
        # 구간 안에 다른 최상위 local/함수 선언, 들여쓰기 밖 return 이 있으면 제외
        if any(re.match(r"^local\s", l) or re.match(r"^return\b", l) for l in block):
            continue
        # 구간이 최상위 문장 경계에서 끝나야 한다(다음 줄이 들여쓰기된 연속이면 제외)
        if last + 1 < len(lines) and lines[last + 1][:1] in ("\t", " ") :
            continue
        out.append((i, last))
    return out


TOP_DECL = re.compile(r"^local\s+(?:function\s+)?([A-Za-z_][A-Za-z0-9_]*(?:\s*,\s*[A-Za-z_][A-Za-z0-9_]*)*)")


def group_candidates(lines, max_span=400):
    """여러 최상위 local 을 함께 감싸는 구간: 구간 안에서 선언된 모든 이름이 구간 밖에서 안 쓰일 때."""
    decl = {}
    for i, line in enumerate(lines):
        m = TOP_DECL.match(line)
        if m:
            decl[i] = [n.strip() for n in m.group(1).split(",")]
    uses = {}
    def last_use(name, after):
        key = (name, after)
        if key not in uses:
            word = re.compile(r"(?<![\w.:])" + re.escape(name) + r"(?!\w)")
            last = after
            for j in range(after + 1, len(lines)):
                if word.search(lines[j]):
                    last = j
            uses[key] = last
        return uses[key]
    out = []
    for start in sorted(decl):
        end = start
        changed = True
        while changed and end - start <= max_span:
            changed = False
            for i in [k for k in decl if start <= k <= end]:
                for name in decl[i]:
                    lu = last_use(name, i)
                    if lu > end:
                        end, changed = lu, True
        if end - start > max_span or end == start:
            continue
        if any(re.match(r"^return\b", l) for l in lines[start:end + 1]):
            continue
        if end + 1 < len(lines) and lines[end + 1][:1] in ("\t", " "):
            continue
        n = sum(len(decl[k]) for k in decl if start <= k <= end)
        if n >= 2:
            out.append((start, end))
    return out


def fix(path, target):
    text = open(path, encoding="utf-8").read()
    room = headroom(text)
    wrapped = 0
    while room < target:
        lines = text.split("\n")
        done = False
        for start, end in candidates(lines) + group_candidates(lines):
            new = lines[:start] + ["do -- [최상위 local 한도 자동 조절] 이 구간 밖에서 쓰지 않는 변수"] + \
                ["\t" + l if l else l for l in lines[start:end + 1]] + ["end"] + lines[end + 1:]
            trial = "\n".join(new)
            if compiles(trial)[0]:
                text = trial
                wrapped += 1
                done = True
                break
        if not done:
            break
        room = headroom(text)
    open(path, "w", encoding="utf-8").write(text)
    print(f"wrapped={wrapped} headroom={room}")
    return room >= target


def main():
    if len(sys.argv) < 3 or sys.argv[1] not in ("check", "fix"):
        print(__doc__)
        sys.exit(2)
    mode, path = sys.argv[1], sys.argv[2]
    if mode == "check":
        need = int(sys.argv[sys.argv.index("--min") + 1]) if "--min" in sys.argv else 10
        room = headroom(open(path, encoding="utf-8").read())
        print(f"LOCAL_BUDGET {os.path.basename(path)} headroom={room} min={need}")
        if room < need:
            print("최상위 local 여유 부족: `python3 tools/luau_local_budget.py fix <파일>` 로 자동 조절하거나 "
                  "새 변수는 do 블록/H 테이블 안에 두세요.")
            sys.exit(1)
    else:
        target = int(sys.argv[sys.argv.index("--target") + 1]) if "--target" in sys.argv else 20
        sys.exit(0 if fix(path, target) else 1)


if __name__ == "__main__":
    main()
