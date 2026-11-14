#!/usr/bin/env python3
"""시대 점검: 1517년에는 아직 없는 항구를 코드·데이터가 어디서 참조하는지 찾는다.
사용: era_audit.py [--year 1517] [--src src]
퀘스트 목적지, 사람 출신지, 역사 사건, 시작 항구처럼 '그 시대에 닫힌 항구로 막힐 수 있는' 곳을 목록으로 뽑는다.
"""
import argparse, os, re, sys, json

ap = argparse.ArgumentParser()
ap.add_argument("--year", type=int, default=1517)
ap.add_argument("--src", default="src")
a = ap.parse_args()

shared = os.path.join(a.src, "ReplicatedStorage", "Shared")
eras = open(os.path.join(shared, "PortEras.luau"), encoding="utf-8").read()
since = {k: int(v) for k, v in re.findall(r"\b([a-z_]+) = (\d{4})", eras[eras.index("Since"):eras.index("function PortEras.startPortFor") if "function PortEras.startPortFor" in eras else len(eras)])}
late = {k: v for k, v in since.items() if v > a.year}
ports_src = open(os.path.join(shared, "Ports.luau"), encoding="utf-8").read()
port_ids = set(re.findall(r'id = "([a-z_]+)", name = "[^"]+", country', ports_src))
late = {k: v for k, v in late.items() if k in port_ids}

SKIP = {"Ports.luau", "PortEras.luau", "SeaRoutes3.luau", "SeaRoutes.luau", "SeaRoutes2.luau", "PortScene.luau", "PortBuildings.luau", "AssetIds.luau", "PortCultures.luau", "PortOrder.luau", "Harbor.luau"}
hits = {}
for root, _, names in os.walk(a.src):
    for n in names:
        if not n.endswith(".luau") or n in SKIP:
            continue
        p = os.path.join(root, n)
        for i, line in enumerate(open(p, encoding="utf-8"), 1):
            for pid, yr in late.items():
                if re.search(r'["\']%s["\']' % pid, line):
                    hits.setdefault(os.path.relpath(p, a.src), []).append((i, pid, yr, line.strip()[:110]))

print(f"{a.year}년에 닫힌 항구 {len(late)}곳. 참조 위치:")
total = 0
for f, rows in sorted(hits.items()):
    print(f"\n[{f}] {len(rows)}건")
    for i, pid, yr, txt in rows[:8]:
        print(f"  {i}: {pid}({yr}) — {txt}")
    total += len(rows)
print(f"\n합계 {total}건, 파일 {len(hits)}개")
json.dump({f: [{"line": i, "port": p, "opens": y} for i, p, y, _ in r] for f, r in hits.items()}, open("era_audit.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
