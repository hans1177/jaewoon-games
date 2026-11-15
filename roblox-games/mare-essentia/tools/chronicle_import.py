#!/usr/bin/env python3
"""assets/data/chronicle/*.csv -> src/ReplicatedStorage/Shared/WorldChronicleBulk.luau (검증 포함)."""
import csv, glob, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICES = {"europe", "islam", "china", "japan", "india", "americas", "sea"}
KINDS = {"sci", "nature", "war", "politics", "trade", "faith"}
ports = set(re.findall(r'^\t(\w+) = \{', open(f"{ROOT}/src/ReplicatedStorage/Shared/Ports.luau", encoding="utf-8").read(), re.M))
ports |= set(re.findall(r'id = "(\w+)"', open(f"{ROOT}/src/ReplicatedStorage/Shared/Ports.luau", encoding="utf-8").read()))

def q(s):
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'

rows, errors, seen = [], [], set()
for path in sorted(glob.glob(f"{ROOT}/assets/data/chronicle/*.csv")):
    with open(path, encoding="utf-8", newline="") as f:
        for n, r in enumerate(csv.DictReader(f), start=2):
            where = f"{os.path.basename(path)}:{n}"
            rid = (r.get("id") or "").strip()
            if not re.fullmatch(r"[a-z0-9_]{3,40}", rid) or rid in seen:
                errors.append(f"{where} id 형식/중복: {rid}")
                continue
            seen.add(rid)
            plist = [p for p in (r.get("ports") or "").split(";") if p]
            bad = [p for p in plist if p not in ports]
            if not plist or bad:
                errors.append(f"{where} 항구 오류: {bad or '없음'}")
            if r.get("voice") not in VOICES:
                errors.append(f"{where} voice 오류: {r.get('voice')}")
            if r.get("kind") not in KINDS:
                errors.append(f"{where} kind 오류: {r.get('kind')}")
            try:
                year, month = int(r["year"]), int(r.get("month") or 1)
                assert 1400 <= year <= 1950 and 1 <= month <= 12
            except Exception:
                errors.append(f"{where} 연도/월 오류")
                continue
            if not (r.get("fact") or "").strip() or not (r.get("title") or "").strip():
                errors.append(f"{where} 제목/사실 비어 있음")
            rows.append((rid, year, month, plist, r))

if errors:
    print("\n".join(errors))
    sys.exit(1)

out = ["--!nonstrict", "-- 자동 생성: tools/chronicle_import.py (assets/data/chronicle/*.csv). 직접 고치지 말 것.", "return {"]
for rid, year, month, plist, r in rows:
    parts = [f"id = {q(rid)}", f"year = {year}", f"month = {month}", "ports = { " + ", ".join(q(p) for p in plist) + " }",
             f"voice = {q(r['voice'])}", f"kind = {q(r['kind'])}", f"title = {q(r['title'].strip())}",
             f"scholar = {q((r.get('scholar') or '학자').strip())}", f"fact = {q(r['fact'].strip())}"]
    if (r.get("lore") or "").strip():
        parts += [f"lore = {q(r['lore'].strip())}", f"loreTag = {q((r.get('loreTag') or '소문').strip())}"]
    out.append("\t{ " + ", ".join(parts) + " },")
out.append("}")
open(f"{ROOT}/src/ReplicatedStorage/Shared/WorldChronicleBulk.luau", "w", encoding="utf-8").write("\n".join(out) + "\n")
print(f"{len(rows)}건 변환 완료")
