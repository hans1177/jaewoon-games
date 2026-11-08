#!/usr/bin/env python3
"""반복되는 실수 패턴 린터 (푸시 전 검사). 사용: lint_luau.py <게임폴더> [--diff <기준ref>]
규칙
 R1 문자열 find/match/gsub 의 리터럴에 패턴 특수문자(- . % ( ) + * ? [ ] ^ $)가 있는데 '평문 찾기'(1, true)가 없음 → 하이픈이 든 이름을 못 찾는 버그
 R2 [변경분만] 기본 도형 Instance.new("Part"/"WedgePart"/"TrussPart"/"CornerWedgePart") 추가 → AGENTS.md 금지(모델 대용 도형)
 R3 [변경분만] 디버그 출력 print( 추가 / TODO·FIXME 새로 추가
 R4 같은 파일에서 'local function X' 가 두 번 정의됨(뒤가 앞을 가림)
종료 코드 1 이면 위반 있음. 예외는 줄 끝에 '-- lint:ok' 를 적는다."""
import re, sys, glob, os, subprocess
args = [a for a in sys.argv[1:] if not a.startswith("--")]
root = args[0] if args else "roblox-games/mare-scientia"
diff_ref = sys.argv[sys.argv.index("--diff") + 1] if "--diff" in sys.argv else None
if diff_ref and diff_ref in args: args.remove(diff_ref)
SPECIAL = re.compile(r"[-.%()+*?\[\]^$]")
STR_FN = re.compile(r':(find|match|gmatch|gsub)\(\s*"((?:[^"\\]|\\.)*)"([^)]*)\)|string\.(find|match|gmatch|gsub)\(\s*[^,]+,\s*"((?:[^"\\]|\\.)*)"([^)]*)\)')
bad = []
files = [f for f in glob.glob(os.path.join(root, "src/**/*.luau"), recursive=True) if "/Common/" not in f]  # Common 은 공용 엔진: 건드리지 않는다
for f in files:
    lines = open(f, encoding="utf-8").read().split("\n")
    seen = {}
    for i, line in enumerate(lines, 1):
        if "lint:ok" in line: continue
        code = line.split("--")[0] if '"--' not in line else line
        for m in STR_FN.finditer(code):
            fn = m[1] or m[4]; lit = m[2] if m[1] else m[5]; rest = m[3] if m[1] else m[6]
            if fn in ("gmatch", "gsub", "match"):  # 패턴 의도가 흔함: find 만 검사
                continue
            if SPECIAL.search(lit) and not re.search(r",\s*(\d+|nil)\s*,\s*true", rest):
                bad.append((f, i, "R1", f'find("{lit}") 에 패턴 특수문자: 평문 찾기(, 1, true) 쓰기'))
        d = re.match(r"\s*local function (\w+)\(", line)
        if d and not line.startswith("\t"):
            if d[1] in seen: bad.append((f, i, "R4", f"local function {d[1]} 이(가) {seen[d[1]]}줄에서 이미 정의됨"))
            seen[d[1]] = i
if diff_ref:
    out = subprocess.run(["git", "diff", "-U0", diff_ref, "--", root + "/src"], capture_output=True, text=True).stdout
    cur, ln = None, 0
    for line in out.split("\n"):
        if line.startswith("+++ b/"): cur = line[6:]
        elif line.startswith("@@"): ln = int(re.search(r"\+(\d+)", line)[1]) - 1
        elif line.startswith("+") and not line.startswith("+++"):
            ln += 1; t = line[1:]
            if "lint:ok" in t: continue
            if re.search(r'Instance\.new\("(Part|WedgePart|TrussPart|CornerWedgePart)"\)', t): bad.append((cur, ln, "R2", "기본 도형 추가(AGENTS.md 금지): 승인된 모델을 쓰거나 부족 에셋으로 기록"))
            if re.search(r"^\s*print\(", t): bad.append((cur, ln, "R3", "디버그 print 추가"))
            if re.search(r"\b(TODO|FIXME)\b", t): bad.append((cur, ln, "R3", "TODO/FIXME 추가"))
        elif not line.startswith("-"): pass
for f, i, r, msg in sorted(set(bad)): print(f"{r} {f}:{i}: {msg}")
print(f"린트: 위반 {len(set(bad))}건")
sys.exit(1 if bad else 0)
