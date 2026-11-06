#!/usr/bin/env python3
"""소스가 쓰는 에셋이 모두 등록돼 있는지 검사한다 (없는 에셋은 게임에서 조용히 사라진다).
사용: asset_check.py <게임폴더> [등록파일(기본 assets-registered.json)]  /  실패 시 종료 코드 1"""
import json, re, sys, glob, os
root = sys.argv[1] if len(sys.argv) > 1 else "."
reg_path = os.path.join(root, sys.argv[2] if len(sys.argv) > 2 else "assets-registered.json")
reg = json.load(open(reg_path))["assets"]
kinds = sorted({k.split("/")[0] for k in reg})
p1 = re.compile(r'importedModel\([^,\n]+,\s*"(\w+)",\s*"([\w\-\.]+)"')
p2 = re.compile(r'\{\s*"(%s)",\s*"([\w\-\.]+)"' % "|".join(kinds))
used, missing = set(), []
for f in glob.glob(os.path.join(root, "src/**/*.luau"), recursive=True):
    text = open(f, encoding="utf-8").read()
    for k, n in p1.findall(text) + p2.findall(text):
        used.add(f"{k}/{n}")
        if f"{k}/{n}" not in reg:
            missing.append((os.path.basename(f), f"{k}/{n}"))
unused = sorted(set(reg) - used)
print(f"사용 {len(used)}종 / 등록 {len(reg)}종 / 미사용 {len(unused)}종")
if missing:
    print("미등록 에셋 참조:")
    for f, a in sorted(set(missing)):
        print(f"  {f}: {a}")
    sys.exit(1)
print("OK: 모든 참조가 등록돼 있음")
