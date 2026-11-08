#!/usr/bin/env python3
"""코드베이스 지도 자동 생성: 파일별 줄 수·최상위 함수 목록·require 의존성을 docs/CODE_MAP.md 에 쓴다.
큰 파일을 통째로 읽지 않고 '이 기능은 어디 있나'를 찾기 위한 색인. 사용: code_map.py <게임폴더>"""
import re, glob, os, sys
root = sys.argv[1] if len(sys.argv) > 1 else "roblox-games/mare-essentia"
rows = []
for f in sorted(glob.glob(os.path.join(root, "src/**/*.luau"), recursive=True)):
    if "/Common/" in f: continue
    t = open(f, encoding="utf-8").read()
    lines = t.split("\n")
    funcs = [(i + 1, m[1]) for i, l in enumerate(lines) for m in [re.match(r"^(?:local )?function ([\w\.:]+)\(", l)] if m]
    deps = sorted(set(re.findall(r'require\((?:script\.Parent\.|script\.Parent:WaitForChild\(")(\w+)', t)))
    rows.append((os.path.relpath(f, os.path.join(root, "src")), len(lines), funcs, deps))
out = [f"# 코드 지도 ({os.path.basename(root)})", "", "> `tools/devloop/code_map.py` 가 자동 생성. 직접 고치지 말 것. 파일이 크면 아래 함수 줄 번호로 바로 이동한다.", "",
       "| 파일 | 줄 | 의존 |", "|---|---|---|"]
for rel, n, funcs, deps in rows:
    out.append(f"| `{rel}` | {n} | {', '.join(deps) or '-'} |")
out.append("")
for rel, n, funcs, deps in sorted(rows, key=lambda r: -r[1])[:12]:
    out += [f"## {rel} ({n}줄) — 최상위 함수 {len(funcs)}개", ""]
    out.append(", ".join(f"`{name}`:{ln}" for ln, name in funcs[:120]) or "(없음)")
    out.append("")
os.makedirs(os.path.join(root, "docs"), exist_ok=True)
open(os.path.join(root, "docs", "CODE_MAP.md"), "w", encoding="utf-8").write("\n".join(out))
print(f"코드 지도: 파일 {len(rows)}개, 큰 파일 12개 함수 색인 → docs/CODE_MAP.md")
