#!/usr/bin/env python3
"""mare-essentia 자동 배치 필요 자산 목록 생성기 (2026-11-28 오너 지시: 지시서대로 받으면 항구·지상·해상·항해에 모두 자동 배치).

게임 코드가 '이 이름으로 등록된 모델이 있으면 그 자리에 바로 놓는' 규칙(슬롯)을 한 곳에 모아,
항구 181곳·탐험지 592곳·해역 27곳·백과 실물 카드마다 만들어야 할 **정확한 파일 이름**과 등록 여부를 적는다.
출력: roblox-games/mare-essentia/docs/AUTO_PLACEMENT.md, docs/auto_placement_needed.csv
사용: python3 tools/gen_auto_placement.py   (luau 실행 파일이 PATH 또는 /tmp/luau 에 있어야 한다)
"""
import csv, json, os, re, shutil, subprocess, tempfile

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
GAME = os.path.join(REPO, "roblox-games", "mare-essentia")
SHARED = os.path.join(GAME, "src", "ReplicatedStorage", "Shared")

DUMP = r'''
local P = require("./Shared/Ports")
local S = require("./Shared/Sites")
local SA = require("./Shared/SeaAreas")
local KC = require("./Shared/KnowledgeCards")
local DF = require("./Shared/DiscoveryForms")
local ids = {}
for id in P.Ports do table.insert(ids, id) end
table.sort(ids)
for _, id in ids do
	local p = P.Ports[id]
	print("PORT\t" .. id .. "\t" .. tostring(p.name) .. "\t" .. table.concat(p.produces or {}, ",") .. "\t" .. tostring(SA.seaOf(id) or ""))
end
for _, s in S.Sites do print("SITE\t" .. s.id .. "\t" .. s.name .. "\t" .. s.portId) end
local seas = {}
for sea in SA.PORTS do table.insert(seas, sea) end
table.sort(seas)
for _, sea in seas do print("SEA\t" .. sea) end
local cards = {}
for _, c in KC.Cards do table.insert(cards, c) end
table.sort(cards, function(a, b) return a.id < b.id end)
for _, c in cards do
	local f = DF.form(c)
	if f then print("CARD\t" .. c.id .. "\t" .. c.name .. "\t" .. f.archetype .. "\t" .. f.kind .. "\t" .. tostring(f.missing)) end
end
'''

KIND_GROUP = {"animal": "Animals", "plant": "Terrain", "mineral": "Terrain", "relic": "Relics", "site": "Town"}
PORT_SLOTS = [
    ("landmark_base", "대표 경관(2~3단계)"), ("landmark_full", "대표 경관 완성형(4단계 이상)"),
    ("house_1", "서민 주택"), ("house_2", "장인 주택"), ("house_3", "부유층 저택"),
    ("street_lamp", "가로등"), ("bld_well", "우물"), ("bld_market_stalls", "시장 가판대 묶음"),
    ("bld_mill", "방앗간"), ("plaza_center", "중앙 광장 장식"),
]


def luau():
    for p in (shutil.which("luau"), "/tmp/luau/luau", "/tmp/luaubin/luau"):
        if p and os.path.exists(p):
            return p
    raise SystemExit("luau 실행 파일이 없습니다")


def dump():
    t = tempfile.mkdtemp()
    os.makedirs(os.path.join(t, "Shared"))
    for f in os.listdir(SHARED):
        if f.endswith(".luau"):
            src = open(os.path.join(SHARED, f), encoding="utf-8").read()
            src = re.sub(r"require\(script\.Parent\.([A-Za-z0-9]+)\)", r'require("./\1")', src)
            open(os.path.join(t, "Shared", f), "w", encoding="utf-8").write(src)
    open(os.path.join(t, "d.luau"), "w").write(DUMP)
    out = subprocess.run([luau(), "d.luau"], cwd=t, capture_output=True, text=True)
    if out.returncode != 0:
        raise SystemExit(out.stderr[-500:])
    return [l.split("\t") for l in out.stdout.splitlines() if "\t" in l]


def main():
    reg = json.load(open(os.path.join(GAME, "assets-registered.json"), encoding="utf-8"))["assets"]
    rows = []  # (scene, owner, group, name, purpose, required)

    def add(scene, owner, group, name, purpose, required=True):
        rows.append({"scene": scene, "owner": owner, "group": group, "name": name, "file": f"{group}/{name}.glb",
                     "purpose": purpose, "required": "필수" if required else "선택",
                     "status": "등록됨" if f"{group}/{name}" in reg else "없음"})

    data = dump()
    for r in data:
        if r[0] == "PORT":
            _, pid, pname, produces, sea = r
            for slot, purpose in PORT_SLOTS:
                add("항구", f"{pid} {pname}", "Town", f"{pid}_{slot}", purpose)
            for good in [g for g in produces.split(",") if g]:
                add("항구", f"{pid} {pname}", "Town", f"{pid}_workshop_{good}", f"특산 공방({good}, 3단계 이상)")
                add("항구", f"{pid} {pname}", "Town", f"{pid}_stall_{good}", f"특산 가판대({good}, 2단계 이상)")
        elif r[0] == "SITE":
            _, sid, sname, pid = r
            add("지상 탐험", f"{sid} {sname} ({pid})", "Terrain", f"field_{sid}", "탐험지 원경 대표 지형")
        elif r[0] == "SEA":
            sea = r[1]
            for band, purpose in (("near", "가까운 해안"), ("mid", "중간 섬·곶"), ("far", "먼 해안선")):
                add("해전", sea, "Naval", f"sea_{sea}_{band}", f"해전 배경 {purpose}")
                add("항해", sea, "Naval", f"voyage_{sea}_{band}", f"항해 배경 {purpose} (없으면 해전 배경 재사용)", False)
        elif r[0] == "CARD" and r[5] == "true":
            _, cid, cname, arche, kind, _m = r
            add("백과 실물", f"{cid} {cname}", KIND_GROUP.get(kind, "Terrain"), cid, f"탐험 발견물 전용 실물({arche})")

    csv_path = os.path.join(GAME, "docs", "auto_placement_needed.csv")
    with open(csv_path, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["scene", "owner", "group", "name", "file", "purpose", "required", "status"])
        w.writeheader()
        w.writerows(rows)

    def count(scene, req=None):
        sel = [x for x in rows if x["scene"] == scene and (req is None or x["required"] == req)]
        return len(sel), sum(1 for x in sel if x["status"] == "등록됨")

    md = ["# 자동 배치 지시서 — 이름만 맞추면 게임에 바로 들어간다 (필독)", "",
          "> 자동 생성: `python3 tools/gen_auto_placement.py`. 전체 목록은 `docs/auto_placement_needed.csv`(파일 이름·용도·등록 여부).",
          "> ChatGPT·바이브 도구는 여기 적힌 **정확한 파일 이름**으로 모델을 만들어 드롭박스 `/Vibe2Transfer/inbox/<그룹>/<이름>.glb` 에 올린다.",
          "> 자동 검사 통과 → 등록 → 게임이 그 이름을 찾아 **항구·지상 탐험·해전·항해(수동 항해 포함)** 해당 자리에 자동 배치한다(`docs/ASSET_MANAGEMENT.md` 2-1절).", "",
          "## 1. 현황", "", "| 장면 | 필요 | 등록됨 | 남음 |", "|---|---|---|---|"]
    for scene in ("항구", "지상 탐험", "해전", "항해", "백과 실물"):
        n, ok = count(scene)
        md.append(f"| {scene} | {n} | {ok} | {n-ok} |")
    md += ["", "## 2. 이름 규칙(슬롯)", "",
           "| 장면 | 그룹(드롭박스 폴더) | 파일 이름 | 놓이는 곳 |", "|---|---|---|---|",
           "| 항구 | Town | `<항구id>_landmark_base` / `_landmark_full` | 항구 대표 경관(2~3단계 / 4단계 이상) |",
           "| 항구 | Town | `<항구id>_house_1` · `_house_2` · `_house_3` | 서민·장인·부유층 주택 |",
           "| 항구 | Town | `<항구id>_street_lamp` · `_bld_well` · `_bld_market_stalls` · `_bld_mill` · `_plaza_center` | 가로등·우물·시장·방앗간·광장 |",
           "| 항구 | Town | `<항구id>_workshop_<특산품>` · `_stall_<특산품>` | 특산 공방(3단계+)·가판대(2단계+) |",
           "| 지상 탐험 | Terrain | `field_<탐험지id>` | 탐험지 원경 대표 지형 |",
           "| 해전 | Naval | `sea_<해역>_near` · `_mid` · `_far` | 해전 배경 3층 |",
           "| 항해(수동 포함) | Naval | `voyage_<해역>_near` · `_mid` · `_far` | 항해 중 양옆 해안(없으면 sea_ 재사용) |",
           "| 백과 실물 | Animals·Terrain·Relics·Town | `<카드id>` (예: `zoo_tiger`) | 지상 탐험 발견물 실물 |",
           "| 메뉴 원화 | CardArt | `menu_<메뉴>_<번호>.jpg` | 메뉴창 원화 배너 |", "",
           "- 항구 id·특산품·탐험지 id·해역은 CSV 에 모두 있다. 해역 id 는 `Shared/SeaAreas.luau`.",
           "- 크기·모양·문화권 양식은 기존 지시서를 따른다: 항구 `docs/ports/<항구>.md`, 배경 `docs/battle_backdrops/`, 배 `docs/ships/`, 백과 실물 `docs/discoveries/`.",
           "- 모델은 GLB, 텍스처 풀컬러(256색 금지), 기본 도형(Part) 조립 금지(루트 AGENTS.md).", "",
           "## 3. 먼저 만들 것(추천 순서)", "",
           "1. 해역 27곳 `sea_<해역>_far` — 해전·항해 둘 다 바로 좋아진다.",
           "2. 주요 항구 대표 경관 `<항구>_landmark_full` (런던·리스본·암스테르담·이스탄불·광저우 등).",
           "3. 동물 `docs/discoveries/MISSING.md` 순서대로 `<카드id>.glb`.",
           "4. 항구 주택 3종·가로등 — 항구 분위기가 가장 크게 바뀐다.",
           "5. 탐험지 `field_<id>` — 자주 가는 근교 탐험지부터.", ""]
    open(os.path.join(GAME, "docs", "AUTO_PLACEMENT.md"), "w", encoding="utf-8").write("\n".join(md) + "\n")
    print("AUTO_PLACEMENT", {s: count(s) for s in ("항구", "지상 탐험", "해전", "항해", "백과 실물")})


if __name__ == "__main__":
    main()
