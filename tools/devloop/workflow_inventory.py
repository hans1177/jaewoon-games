#!/usr/bin/env python3
"""워크플로 목록 점검(읽기 전용, 아무것도 지우거나 끄지 않는다).
각 워크플로의 트리거·줄 수·인라인 JS 줄 수·다른 파일에서의 참조·마지막 수정일을 모아
docs/devloop/WORKFLOW_INVENTORY.json 에 쓰고, '휴면 후보'(수동 실행 전용 + 참조 없음 + 오래 수정 안 됨)를 표시만 한다.
사용: workflow_inventory.py [--days 14]"""
import re, glob, os, json, subprocess, sys, time
days = int(sys.argv[sys.argv.index("--days") + 1]) if "--days" in sys.argv else 14
files = sorted(glob.glob(".github/workflows/*.yml"))
texts = {f: open(f, encoding="utf-8", errors="ignore").read() for f in files}
TRIG = ("schedule", "workflow_dispatch", "workflow_run", "push", "pull_request", "repository_dispatch", "issues", "issue_comment")
def last_commit(f):
    r = subprocess.run(["git", "log", "-1", "--format=%ct", "--", f], capture_output=True, text=True).stdout.strip()
    return int(r) if r else 0
rows = []
now = time.time()
for f in files:
    t = texts[f]
    base = os.path.basename(f)
    trig = [k for k in TRIG if re.search(r"^\s*" + k + r"\s*:", t, re.M)]
    name = (re.search(r"^name:\s*(.+)$", t, re.M) or [None, base])[1].strip().strip("\"'")
    inline = 0
    inside = False
    for line in t.splitlines():
        if re.search(r"(github-script|node\s+-e|node\s+--input-type|python3?\s+-c|<<\s*['\"]?\w+)", line):
            inside = True
        if inside: inline += 1
        if inside and re.match(r"^\s{0,6}-\s+(name|uses|run):", line) and inline > 1:
            inside = False
    refs = sorted({os.path.basename(g) for g, tx in texts.items() if g != f and (base in tx or base[:-4] in tx or name in tx)})
    ts = last_commit(f)
    age = (now - ts) / 86400 if ts else 9999
    dormant = trig in (["workflow_dispatch"], []) and not refs and age > days
    rows.append({"file": base, "name": name, "triggers": trig, "lines": len(t.splitlines()), "inlineLines": inline,
                 "referencedBy": refs, "ageDays": round(age, 1), "dormantCandidate": dormant})
out = {"generatedAt": int(now), "total": len(rows), "dormantCandidates": [r["file"] for r in rows if r["dormantCandidate"]],
       "heavyInline": [r["file"] for r in sorted(rows, key=lambda r: -r["inlineLines"])[:15] if r["inlineLines"] > 80], "workflows": rows}
os.makedirs("docs/devloop", exist_ok=True)
json.dump(out, open("docs/devloop/WORKFLOW_INVENTORY.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"워크플로 {len(rows)}개 / 휴면 후보 {len(out['dormantCandidates'])}개 / 인라인 JS 많은 파일 {len(out['heavyInline'])}개")
for r in out["heavyInline"][:8]: print("  인라인", next(x for x in rows if x["file"] == r)["inlineLines"], "줄:", r)
