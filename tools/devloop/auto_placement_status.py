#!/usr/bin/env python3
"""자동 배치 현황판·오늘 만들 것·무료 원본 찾기 목록·안 쓰는 자산 (2026-11-28 오너 지시: 자동 채우기·배치·수정 모두 적용).

luau 없이 돈다(드롭박스 인입 단계에서 매번 실행):
  1) docs/auto_placement_needed.csv 의 등록 여부를 assets-registered.json 으로 다시 매긴다.
  2) 현황판(장면별 채움 %)·오늘 만들 것 상위 10개 → docs/assets/auto_fill_board.md
  3) 오늘 목록을 assets-wanted.auto.json 에 'auto-slot-…' 항목으로 쓴다(기존 장부 assets_wanted.py 가 seed 와 합쳐 읽음)
     → 기존 무료 원본(CC0) 자동 탐색이 같은 이름으로 찾는다. 찾으면 드롭박스·inbox 와 같은 등록 경로.
  4) 확실히 안 쓰는 등록 자산(동적 이름 규칙에도 안 걸리는 것) → docs/assets/unused_assets.md
사용: python3 tools/devloop/auto_placement_status.py
"""
import csv, datetime, glob, json, os, re

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
GAME = os.path.join(REPO, "roblox-games", "mare-essentia")
CSV = os.path.join(GAME, "docs", "auto_placement_needed.csv")
SEED = os.path.join(GAME, "assets-wanted.auto.json")  # 기존 장부(seed)는 손대지 않고 자동 항목만 따로 둔다
BOARD = os.path.join(GAME, "docs", "assets", "auto_fill_board.md")
UNUSED = os.path.join(GAME, "docs", "assets", "unused_assets.md")

MAJOR_PORTS = {"london", "lisbon", "amsterdam", "seville", "venice", "istanbul", "alexandria", "goa", "calicut",
               "malacca", "canton", "nagasaki", "havana", "cape_town", "zanzibar", "batavia", "manila", "boston"}
# 장면·슬롯별 우선순위(높을수록 먼저). 많이 보이고 한 번에 넓게 바뀌는 것부터.
def priority(row):
    scene, name = row["scene"], row["name"]
    port = name.split("_", 1)[0] if scene == "항구" else ""
    if scene == "해전":
        return 110 if name.endswith("_far") else 70
    if scene == "항구":
        major = 25 if any(name.startswith(p + "_") for p in MAJOR_PORTS) else 0
        if "_landmark_full" in name: return 80 + major
        if "_landmark_base" in name: return 55 + major
        if re.search(r"_house_[123]$", name): return 60 + major
        if name.endswith("_street_lamp"): return 50 + major
        if name.endswith(("_bld_well", "_plaza_center", "_bld_market_stalls")): return 40 + major
        if "_workshop_" in name or "_stall_" in name: return 20 + major
        return 30 + major
    if scene == "백과 실물":
        return 65
    if scene == "지상 탐험":
        return 35
    if scene == "항해":
        return 10
    return 0


def main():
    reg = json.load(open(os.path.join(GAME, "assets-registered.json"), encoding="utf-8"))["assets"]
    rows = list(csv.DictReader(open(CSV, encoding="utf-8")))
    for r in rows:
        r["status"] = "등록됨" if f'{r["group"]}/{r["name"]}' in reg else "없음"
    with open(CSV, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    scenes = ["항구", "지상 탐험", "해전", "항해", "백과 실물"]
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    md = ["# 자동 채우기 현황판", "", f"갱신: {now} · 원본: `docs/auto_placement_needed.csv` (드롭박스 인입 때마다 자동 갱신)", "",
          "| 장면 | 필요 | 등록됨 | 채움 |", "|---|---|---|---|"]
    for sc in scenes:
        sel = [r for r in rows if r["scene"] == sc and r["required"] == "필수"]
        ok = sum(1 for r in sel if r["status"] == "등록됨")
        pct = (100 * ok / len(sel)) if sel else 0
        bar = "█" * int(pct // 5) + "░" * (20 - int(pct // 5))
        md.append(f"| {sc} | {len(sel)} | {ok} | {bar} {pct:.1f}% |")
    # 장면을 섞어 고른다: 항구 4 · 해전 3 · 백과 실물 2 · 지상 탐험 1 (모자라면 다른 장면으로 채움)
    ranked = sorted([r for r in rows if r["status"] == "없음" and r["required"] == "필수"], key=lambda r: (-priority(r), r["name"]))
    quota = {"항구": 4, "해전": 3, "백과 실물": 2, "지상 탐험": 1}
    todo = []
    for r in ranked:
        if quota.get(r["scene"], 0) > 0:
            todo.append(r); quota[r["scene"]] -= 1
        if len(todo) == 10: break
    for r in ranked:
        if len(todo) == 10: break
        if r not in todo: todo.append(r)
    todo.sort(key=lambda r: -priority(r))
    md += ["", "## 오늘 만들 것 (상위 10개)", "",
           "드롭박스 `/Vibe2Transfer/inbox/<그룹>/<파일>` 로 이 이름 그대로 올리면 자동 등록·배치된다. 양식은 각 지시서(`docs/READ_FIRST.md` 3-2절).", "",
           "| 순위 | 파일 | 장면 | 어디/무엇 | 용도 |", "|---|---|---|---|---|"]
    for i, r in enumerate(todo, 1):
        md.append(f'| {i} | `{r["file"]}` | {r["scene"]} | {r["owner"]} | {r["purpose"]} |')
    os.makedirs(os.path.dirname(BOARD), exist_ok=True)
    open(BOARD, "w", encoding="utf-8").write("\n".join(md) + "\n")

    # 무료 원본 자동 탐색 장부와 맞추기(기존 형식 유지, auto-slot- 항목만 교체)
    seed = []
    for r in todo:
        seed.append({
            "id": "auto-slot-" + r["name"], "kind": r["group"], "purpose": f'{r["scene"]} 자동 배치 · {r["owner"]} · {r["purpose"]}',
            "status": "missing",
            "candidates": ["Quaternius (CC0)", "Kenney (CC0)", "Poly Pizza CC0 모델", "오너 드롭박스 업로드"],
            "inboxPath": f'assets/inbox/{r["group"]}/{r["name"]}.glb',
            "rule": "이름 그대로 등록하면 게임이 자동 배치. 다른 대상(종·건물)을 사칭하는 대체물 금지",
        })
    json.dump(seed, open(SEED, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    open(SEED, "a", encoding="utf-8").write("\n")

    # 확실히 안 쓰는 등록 자산: 코드 문자열에도, 동적 이름 규칙 그룹에도 없는 것
    src = ""
    for p in glob.glob(os.path.join(GAME, "src", "**", "*.luau"), recursive=True):
        if not p.endswith("AssetIds.luau"):
            src += open(p, encoding="utf-8").read()
    dynamic_groups = {"Animals", "CardArt", "Cargo", "Goods", "Menu", "Naval", "People", "Portraits", "Relics", "Terrain", "Town"}
    unused = sorted(k for k in reg if k.split("/", 1)[0] not in dynamic_groups and k.split("/", 1)[-1] not in src)
    open(UNUSED, "w", encoding="utf-8").write(
        "# 안 쓰는 것으로 보이는 등록 자산\n\n> 자동 생성. 코드 어디에도 이름이 없고 이름 규칙 자동 배치 그룹도 아닌 것. **지우기 전에 오너 확인.**\n\n"
        + "\n".join(f"- `{k}`" for k in unused) + f"\n\n총 {len(unused)}개\n")
    print("AUTO_FILL", {sc: sum(1 for r in rows if r["scene"] == sc and r["status"] == "등록됨") for sc in scenes}, "todo", len(todo), "unused", len(unused))


if __name__ == "__main__":
    main()
