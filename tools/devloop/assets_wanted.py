#!/usr/bin/env python3
"""부족 에셋 목록 자동 생성: <게임>/assets-wanted.seed.json(사람이 적은 목표) + 코드의 미등록 참조(asset_check) + 미사용 등록 에셋 요약
→ <게임>/assets-wanted.json. 사용: assets_wanted.py <게임폴더>"""
import json, os, re, subprocess, sys
root = sys.argv[1] if len(sys.argv) > 1 else "roblox-games/mare-essentia"
here = os.path.dirname(os.path.abspath(__file__))
seed = []
sp = os.path.join(root, "assets-wanted.seed.json")
if os.path.exists(sp): seed = json.load(open(sp, encoding="utf-8"))
r = subprocess.run([sys.executable, os.path.join(here, "asset_check.py"), root], capture_output=True, text=True)
missing = sorted(set(re.findall(r"^\s+(\S+): (\w+/[\w\-\.]+)$", r.stdout, re.M)))
m = re.search(r"사용 (\d+)종 / 등록 (\d+)종 / 미사용 (\d+)종", r.stdout)
inbox = os.path.join(root, "assets", "inbox")
pending = [os.path.join(d, f) for d, _, fs in os.walk(inbox) for f in fs if not f.endswith((".md", ".license.json"))] if os.path.isdir(inbox) else []
out = {"game": os.path.basename(root), "wanted": seed,
       "codeReferencesNotRegistered": [{"file": f, "asset": a} for f, a in missing],
       "registry": {"used": int(m[1]), "registered": int(m[2]), "unused": int(m[3])} if m else None,
       "inboxWaiting": pending}
json.dump(out, open(os.path.join(root, "assets-wanted.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"부족 목표 {len(seed)}건 / 코드의 미등록 참조 {len(missing)}건 / inbox 대기 {len(pending)}건")
for w in seed: print(f"  [{w['status']}] {w['id']}: {w['purpose']}")
